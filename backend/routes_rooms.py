"""Room routes."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
import secrets
import string
import bcrypt

from models import RoomCreate, RoomJoin, RoomPublic
from auth import get_current_user

router = APIRouter(prefix="/rooms", tags=["rooms"])


def get_db():
    from server import db
    return db


def _gen_code(n: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(n))


def _public(doc: dict, member_count: int = 0) -> RoomPublic:
    return RoomPublic(
        id=doc["id"],
        code=doc["code"],
        name=doc["name"],
        description=doc.get("description", ""),
        host_id=doc["host_id"],
        host_name=doc["host_name"],
        created_at=doc["created_at"],
        member_count=member_count,

        # NEW
        owner_id=doc.get("owner_id"),
        is_private=doc.get("is_private", False),
    )


@router.post("", response_model=RoomPublic)
async def create_room(payload: RoomCreate, user: dict = Depends(get_current_user)):
    db = get_db()

    user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0})

    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate unique room code
    for _ in range(8):
        code = _gen_code()

        if not await db.rooms.find_one({"code": code}, {"_id": 0}):
            break

    # PASSWORD HASHING
    hashed_password = None

    if payload.password:
        hashed_password = bcrypt.hashpw(
            payload.password.encode(),
            bcrypt.gensalt()
        ).decode()

    doc = {
        "id": str(uuid.uuid4()),
        "code": code,

        "name": payload.name.strip(),
        "description": payload.description or "",

        "host_id": user_doc["id"],
        "host_name": user_doc["name"],

        # NEW OWNER FIELD
        "owner_id": user_doc["id"],

        # NEW PRIVACY FIELDS
        "is_private": payload.is_private,
        "room_password": hashed_password,

        "created_at": datetime.now(timezone.utc).isoformat(),

        "queue": [],
        "messages": [],

        "playback": {
            "current_song": None,
            "is_playing": False,
            "position_ms": 0,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    }

    await db.rooms.insert_one(doc)

    return _public(doc, member_count=0)


@router.get("/mine")
async def list_my_rooms(user: dict = Depends(get_current_user)):
    db = get_db()

    cursor = db.rooms.find(
        {"host_id": user["id"]},
        {"_id": 0, "queue": 0, "messages": 0}
    ).sort("created_at", -1)

    rooms = await cursor.to_list(length=100)

    from server import room_presence

    return [
        _public(
            r,
            member_count=len(room_presence.get(r["id"], set()))
        )
        for r in rooms
    ]


@router.get("/public")
async def list_public_rooms():
    """
    Return only PUBLIC rooms.
    Private rooms stay hidden.
    """

    db = get_db()

    cursor = db.rooms.find(
        {
            "is_private": False
        },
        {
            "_id": 0,
            "queue": 0,
            "messages": 0
        }
    ).sort("created_at", -1).limit(20)

    rooms = await cursor.to_list(length=20)

    from server import room_presence

    return [
        _public(
            r,
            member_count=len(room_presence.get(r["id"], set()))
        )
        for r in rooms
    ]


@router.post("/join", response_model=RoomPublic)
async def join_room_by_code(
    payload: RoomJoin,
    user: dict = Depends(get_current_user)
):
    db = get_db()

    code = payload.code.strip().upper()

    doc = await db.rooms.find_one(
        {"code": code},
        {"_id": 0, "queue": 0, "messages": 0}
    )

    if not doc:
        raise HTTPException(status_code=404, detail="Room not found")

    # PASSWORD VALIDATION
    if doc.get("is_private"):

        stored_password = doc.get("room_password")

        if not stored_password:
            raise HTTPException(
                status_code=403,
                detail="Private room password missing"
            )

        if not payload.password:
            raise HTTPException(
                status_code=403,
                detail="Password required"
            )

        valid = bcrypt.checkpw(
            payload.password.encode(),
            stored_password.encode()
        )

        if not valid:
            raise HTTPException(
                status_code=403,
                detail="Invalid room password"
            )

    from server import room_presence

    return _public(
        doc,
        member_count=len(room_presence.get(doc["id"], set()))
    )


@router.delete("/{room_id}")
async def delete_room(
    room_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Delete room securely.
    Only room owner can delete.
    """

    db = get_db()

    room = await db.rooms.find_one({"id": room_id})

    if not room:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    # OWNER CHECK
    if room.get("owner_id") != user["id"]:
        raise HTTPException(
            status_code=403,
            detail="Only room owner can delete room"
        )

    await db.rooms.delete_one({"id": room_id})

    return {
        "success": True,
        "message": "Room deleted successfully"
    }


@router.get("/{room_id}")
async def get_room(room_id: str, user: dict = Depends(get_current_user)):
    db = get_db()

    doc = await db.rooms.find_one({"id": room_id}, {"_id": 0})

    if not doc:
        raise HTTPException(status_code=404, detail="Room not found")

    from server import room_presence

    members = list(room_presence.get(room_id, set()))

    # Trim chat history to last 100 messages
    messages = doc.get("messages", [])[-100:]

    return {
        "room": _public(
            doc,
            member_count=len(members)
        ).model_dump(),

        "queue": doc.get("queue", []),

        "messages": messages,

        "playback": doc.get("playback", {}),

        "members": members,
    }
