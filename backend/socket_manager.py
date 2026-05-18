""""Socket.IO server for real-time room sync, chat & playback."""
import socketio
import time
from datetime import datetime, timezone
import uuid

from auth import user_from_token

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
    ping_timeout=30,
    ping_interval=20,
)

# In-memory presence
sid_index: dict[str, dict] = {}
room_presence: dict[str, set] = {}
room_users: dict[str, dict] = {}
room_typing: dict[str, set] = {}


def now_iso() -> str:
    """Returns the current UTC time in ISO format."""
    return datetime.now(timezone.utc).isoformat()


async def _members_payload(room_id: str) -> list:
    """Generates the current members list for a room."""
    users = room_users.get(room_id, {})
    return [{"id": uid, "name": uname} for uid, uname in users.items()]


def get_db():
    from server import db
    return db


@sio.event
async def connect(sid, environ, auth):
    """Handles new client connections and authenticates users."""
    token = (auth or {}).get("token") if isinstance(auth, dict) else None

    if not token:
        await sio.disconnect(sid)
        return False

    user = user_from_token(token)

    if not user:
        await sio.disconnect(sid)
        return False

    db = get_db()

    doc = await db.users.find_one(
        {"id": user["id"]},
        {"_id": 0, "name": 1, "id": 1}
    )

    if not doc:
        await sio.disconnect(sid)
        return False

    sid_index[sid] = {
        "user_id": doc["id"],
        "user_name": doc["name"],
        "room_id": None
    }

    return True


@sio.event
async def disconnect(sid):
    """Handles client disconnections."""
    info = sid_index.pop(sid, None)

    if not info:
        return

    room_id = info.get("room_id")

    if room_id:
        await _leave(
            sid,
            room_id,
            info["user_id"],
            info["user_name"],
            notify=True
        )


async def _leave(sid, room_id: str, user_id: str, user_name: str, notify: bool):
    """Internal function to handle a user leaving a room."""
    presence = room_presence.get(room_id)

    if presence and user_id in presence:
        presence.discard(user_id)

    users = room_users.get(room_id)

    if users and user_id in users:
        users.pop(user_id, None)

    typing = room_typing.get(room_id)

    if typing:
        typing.discard(user_id)

    try:
        await sio.leave_room(sid, room_id)
    except Exception:
        pass

    if notify:
        await sio.emit(
            "user-left",
            {
                "user_id": user_id,
                "user_name": user_name,
                "members": await _members_payload(room_id)
            },
            room=room_id
        )

        # Broadcast typing status update when a user leaves
        typing_users = [
            {"id": uid, "name": room_users.get(room_id, {}).get(uid, "Unknown")}
            for uid in room_typing.get(room_id, set())
        ]
        await sio.emit("typing-updated", {"typing_users": typing_users}, room=room_id)


@sio.event
async def join_room(sid, data):
    """Handles user joining a specific room."""
    info = sid_index.get(sid)

    if not info:
        return {"error": "Not authenticated"}

    room_id = (data or {}).get("room_id")

    if not room_id:
        return {"error": "room_id required"}

    db = get_db()

    doc = await db.rooms.find_one({"id": room_id}, {"_id": 0})

    if not doc:
        return {"error": "Room not found"}

    if info.get("room_id") and info["room_id"] != room_id:
        await _leave(
            sid,
            info["room_id"],
            info["user_id"],
            info["user_name"],
            notify=True
        )

    info["room_id"] = room_id

    room_presence.setdefault(room_id, set()).add(info["user_id"])

    room_users.setdefault(room_id, {})[
        info["user_id"]
    ] = info["user_name"]

    await sio.enter_room(sid, room_id)

    members = await _members_payload(room_id)

    await sio.emit(
        "user-joined",
        {
            "user_id": info["user_id"],
            "user_name": info["user_name"],
            "members": members
        },
        room=room_id
    )

    await sio.emit(
        "room-state",
        {
            "playback": doc.get("playback", {}),
            "queue": doc.get("queue", []),
            "messages": doc.get("messages", [])[-100:],
            "members": members,
        },
        to=sid
    )

    return {"ok": True}


@sio.event
async def leave_room(sid, data):
    """Handles explicit requests to leave a room."""
    info = sid_index.get(sid)

    if not info or not info.get("room_id"):
        return

    await _leave(
        sid,
        info["room_id"],
        info["user_id"],
        info["user_name"],
        notify=True
    )
    
    info["room_id"] = None


# ---------------- QUEUE ----------------
@sio.event
async def add_to_queue(sid, data):
    """Adds a song to the room queue and automatically plays if it's the first song."""
    info = sid_index.get(sid)

    if not info or not info.get("room_id"):
        return

    room_id = info["room_id"]
    song = (data or {}).get("song")

    if not song:
        return

    queue_item = {
        **song,
        "id": str(uuid.uuid4()),
        "added_by": info["user_id"],
        "added_by_name": info["user_name"],
        "added_at": now_iso(),
    }

    db = get_db()

    # Add song to database queue
    await db.rooms.update_one(
        {"id": room_id},
        {"$push": {"queue": queue_item}}
    )

    # Fetch updated room and emit FULL queue array
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    queue = room.get("queue", [])

    await sio.emit(
        "queue-updated",
        queue,
        room=room_id
    )

    # Auto-play if it's the first song
    playback = room.get("playback", {})

    if not playback.get("current_song"):
        payload = {
            "current_song": queue_item,
            "is_playing": True,
            "position_ms": 0,
            "updated_at": now_iso(),
            "server_time": time.time(),
        }

        await db.rooms.update_one(
            {"id": room_id},
            {"$set": {"playback": payload}}
        )

        await sio.emit(
            "playback-updated",
            payload,
            room=room_id
        )


@sio.event
async def remove_from_queue(sid, data):
    """Removes a song from the room queue and updates clients."""
    info = sid_index.get(sid)

    if not info or not info.get("room_id"):
        return

    room_id = info["room_id"]
    item_id = (data or {}).get("item_id")

    db = get_db()

    # Remove song from database queue
    await db.rooms.update_one(
        {"id": room_id},
        {"$pull": {"queue": {"id": item_id}}}
    )

    # Fetch updated room and emit FULL queue array
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    
    await sio.emit(
        "queue-updated",
        room.get("queue", []),
        room=room_id
    )


# ---------------- PLAYBACK ----------------
async def _update_playback(room_id: str, patch: dict):
    """Helper method to update database playback state."""
    db = get_db()
    patch["updated_at"] = now_iso()

    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {f"playback.{k}": v for k, v in patch.items()}}
    )


@sio.event
async def play_song(sid, data):
    """Sets a specific song to play currently."""
    info = sid_index.get(sid)

    if not info or not info.get("room_id"):
        return

    room_id = info["room_id"]
    song = (data or {}).get("song")

    if not song:
        return

    position_ms = int((data or {}).get("position_ms", 0))

    payload = {
        "current_song": song,
        "is_playing": True,
        "position_ms": position_ms,
    }

    await _update_playback(room_id, payload)

    await sio.emit(
        "playback-updated",
        {
            **payload,
            "server_time": time.time(),
            "by": info["user_name"]
        },
        room=room_id
    )


@sio.event
async def pause_song(sid, data):
    """Pauses the current song playback."""
    info = sid_index.get(sid)

    if not info or not info.get("room_id"):
        return

    room_id = info["room_id"]
    position_ms = int((data or {}).get("position_ms", 0))

    payload = {
        "is_playing": False,
        "position_ms": position_ms
    }

    await _update_playback(room_id, payload)

    await sio.emit(
        "playback-updated",
        {
            **payload,
            "server_time": time.time(),
            "by": info["user_name"]
        },
        room=room_id
    )


@sio.event
async def resume_song(sid, data):
    """Resumes the current song playback."""
    info = sid_index.get(sid)

    if not info or not info.get("room_id"):
        return

    room_id = info["room_id"]
    position_ms = int((data or {}).get("position_ms", 0))

    payload = {
        "is_playing": True,
        "position_ms": position_ms
    }

    await _update_playback(room_id, payload)

    await sio.emit(
        "playback-updated",
        {
            **payload,
            "server_time": time.time(),
            "by": info["user_name"]
        },
        room=room_id
    )


@sio.event
async def seek_song(sid, data):
    """Seeks the current song playback to a new position."""
    info = sid_index.get(sid)

    if not info or not info.get("room_id"):
        return

    room_id = info["room_id"]
    position_ms = int((data or {}).get("position_ms", 0))

    payload = {
        "position_ms": position_ms
    }

    await _update_playback(room_id, payload)

    await sio.emit(
        "playback-updated",
        {
            **payload,
            "server_time": time.time(),
            "by": info["user_name"]
        },
        room=room_id
    )


# ---------------- CHAT & MODERATION ----------------
@sio.event
async def send_message(sid, data):
    """Handles sending a new chat message to the room."""
    info = sid_index.get(sid)

    if not info or not info.get("room_id"):
        return

    room_id = info["room_id"]
    text = ((data or {}).get("text") or "").strip()

    if not text or len(text) > 1000:
        return

    msg = {
        "id": str(uuid.uuid4()),
        "room_id": room_id,
        "user_id": info["user_id"],
        "user_name": info["user_name"],
        "text": text,
        "created_at": now_iso(),
        "is_deleted": False,
    }

    db = get_db()

    await db.rooms.update_one(
        {"id": room_id},
        {"$push": {"messages": {"$each": [msg], "$slice": -500}}},
    )

    await sio.emit("new-message", msg, room=room_id)


@sio.event
async def delete_message(sid, data):
    """Handles deleting a chat message. Respects room ownership."""
    info = sid_index.get(sid)

    if not info or not info.get("room_id"):
        return

    room_id = info["room_id"]
    message_id = (data or {}).get("message_id")

    if not message_id:
        return

    db = get_db()
    room = await db.rooms.find_one({"id": room_id}, {"host_id": 1})

    if not room:
        return

    # Check ownership
    if room.get("host_id") != info["user_id"]:
        return

    await db.rooms.update_one(
        {"id": room_id, "messages.id": message_id},
        {"$set": {"messages.$.text": "Message deleted", "messages.$.is_deleted": True}}
    )

    await sio.emit("message-deleted", {"message_id": message_id}, room=room_id)


@sio.event
async def clear_chat(sid, data):
    """Handles clearing the entire chat. Respects room ownership."""
    info = sid_index.get(sid)

    if not info or not info.get("room_id"):
        return

    room_id = info["room_id"]
    
    db = get_db()
    room = await db.rooms.find_one({"id": room_id}, {"host_id": 1})

    if not room:
        return

    # Check ownership
    if room.get("host_id") != info["user_id"]:
        return

    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {"messages": []}}
    )

    await sio.emit("chat-cleared", {}, room=room_id)


@sio.event
async def typing(sid, data):
    """Handles typing indicators in the chat."""
    info = sid_index.get(sid)

    if not info or not info.get("room_id"):
        return

    room_id = info["room_id"]
    is_typing = (data or {}).get("typing", False)
    
    typing_set = room_typing.setdefault(room_id, set())

    if is_typing:
        typing_set.add(info["user_id"])
    else:
        typing_set.discard(info["user_id"])

    # Prepare user objects to match frontend expectations
    typing_users = [
        {"id": uid, "name": room_users.get(room_id, {}).get(uid, "Unknown")}
        for uid in typing_set
    ]

    await sio.emit(
        "typing-updated",
        {"typing_users": typing_users},
        room=room_id,
        skip_sid=sid
    )


# ---------------- DELETE ROOM ----------------
@sio.event
async def delete_room(sid, data):
    """Handles permanent room deletion by the host."""
    info = sid_index.get(sid)

    if not info or not info.get("room_id"):
        return

    room_id = info["room_id"]
    db = get_db()

    room = await db.rooms.find_one({"id": room_id})

    if not room:
        return

    # Check ownership using host_id exclusively
    if room.get("host_id") != info["user_id"]:
        return

    await sio.emit(
        "room-deleted",
        {"room_id": room_id},
        room=room_id
    )

    await db.rooms.delete_one({"id": room_id})

    # Cleanup memory
    room_presence.pop(room_id, None)
    room_users.pop(room_id, None)
    room_typing.pop(room_id, None)
