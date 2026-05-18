import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Check,
  Heart,
  Share2
} from "lucide-react";

import { toast } from "sonner";

import Sidebar from "../components/Sidebar";
import MobileNav from "../components/MobileNav";
import MusicPlayer from "../components/MusicPlayer";
import QueuePanel from "../components/QueuePanel";
import ChatPanel from "../components/ChatPanel";
import UsersList from "../components/UsersList";
import SearchBar from "../components/SearchBar";

import { api } from "../services/api";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { useSpotifyPlayer } from "../hooks/useSpotifyPlayer";

export default function Room() {
  const { roomId } = useParams();

  const navigate = useNavigate();

  const { user } = useAuth();

  const { socket, connected } = useSocket();

  const spotify = useSpotifyPlayer();

  const [room, setRoom] = useState(null);

  const [loading, setLoading] = useState(true);

  const [playback, setPlayback] = useState({
    current_song: null,
    is_playing: false,
    position_ms: 0
  });

  const [queue, setQueue] = useState([]);

  const [messages, setMessages] = useState([]);

  const [members, setMembers] = useState([]);

  const [typingUsers, setTypingUsers] = useState([]);

  const [copied, setCopied] = useState(false);

  const [favSong, setFavSong] = useState(null);

  const joinedRef = useRef(false);

  useEffect(() => {
    let on = true;

    (async () => {
      try {
        const { data } = await api.get(`/rooms/${roomId}`);

        if (!on) return;

        setRoom(data.room);

        setQueue(data.queue || []);

        setMessages(data.messages || []);

        setPlayback(data.playback || {});
      } catch (e) {
        toast.error("Could not load room");

        navigate("/dashboard");
      } finally {
        if (on) setLoading(false);
      }
    })();

    return () => {
      on = false;
    };
  }, [roomId, navigate]);

  useEffect(() => {
    if (!socket || !connected || !roomId) return;

    if (joinedRef.current) return;

    joinedRef.current = true;

    socket.emit(
      "join_room",
      { room_id: roomId },
      (ack) => {
        if (ack?.error) {
          toast.error(ack.error);

          navigate("/dashboard");
        }
      }
    );

    return () => {
      try {
        socket.emit("leave_room", {});
      } catch (_) {}

      joinedRef.current = false;
    };
  }, [socket, connected, roomId, navigate]);

  useEffect(() => {
    if (!socket) return;

    const onState = (s) => {
      if (s.playback) setPlayback(s.playback);

      if (Array.isArray(s.queue)) setQueue(s.queue);

      if (Array.isArray(s.messages)) setMessages(s.messages);

      if (Array.isArray(s.members)) setMembers(s.members);
    };

    const onPlayback = (p) =>
      setPlayback((cur) => ({
        ...cur,
        ...p
      }));

    const onQueue = (updatedQueue) => {
      if (Array.isArray(updatedQueue)) {
        setQueue(updatedQueue);
      }
    };

    const onMessage = (m) =>
      setMessages((ms) => [...ms, m]);

    const onMessageDeleted = ({ message_id }) => {
      setMessages((msgs) =>
        msgs.map((m) =>
          m.id === message_id
            ? {
                ...m,
                text: "Message deleted",
                is_deleted: true,
              }
            : m
        )
      );
    };

    const onChatCleared = () => {
      setMessages([]);

      toast.success("Chat cleared");
    };

    const onRoomDeleted = () => {
      toast.error("Room deleted");

      navigate("/dashboard");
    };

    const onUserJoined = (e) => {
      setMembers(e.members || []);

      if (e.user_id !== user?.id) {
        toast(`${e.user_name} joined`);
      }
    };

    const onUserLeft = (e) => {
      setMembers(e.members || []);

      if (e.user_id !== user?.id) {
        toast(`${e.user_name} left`);
      }
    };

    const onTyping = (e) =>
      setTypingUsers(e.typing_users || []);

    socket.on("room-state", onState);

    socket.on("playback-updated", onPlayback);

    socket.on("queue-updated", onQueue);

    socket.on("new-message", onMessage);

    socket.on("message-deleted", onMessageDeleted);

    socket.on("chat-cleared", onChatCleared);

    socket.on("room-deleted", onRoomDeleted);

    socket.on("user-joined", onUserJoined);

    socket.on("user-left", onUserLeft);

    socket.on("typing-updated", onTyping);

    return () => {
      socket.off("room-state", onState);

      socket.off("playback-updated", onPlayback);

      socket.off("queue-updated", onQueue);

      socket.off("new-message", onMessage);

      socket.off(
        "message-deleted",
        onMessageDeleted
      );

      socket.off(
        "chat-cleared",
        onChatCleared
      );

      socket.off(
        "room-deleted",
        onRoomDeleted
      );

      socket.off("user-joined", onUserJoined);

      socket.off("user-left", onUserLeft);

      socket.off("typing-updated", onTyping);
    };
  }, [socket, user?.id, navigate]);

  const isHost = useMemo(
    () =>
      room &&
      user &&
      room.host_id === user.id,
    [room, user]
  );

  const syncing = !connected;

  const playFromQueue = useCallback(
    (item) => {
      socket?.emit("play_song", {
        song: item,
        position_ms: 0
      });
    },
    [socket]
  );

  const onPlayPause = useCallback(
    (newPlaying, positionMs) => {
      if (newPlaying) {
        if (
          !playback.current_song &&
          queue[0]
        ) {
          socket?.emit("play_song", {
            song: queue[0],
            position_ms: 0
          });
        } else {
          socket?.emit("resume_song", {
            position_ms: positionMs
          });
        }
      } else {
        socket?.emit("pause_song", {
          position_ms: positionMs
        });
      }
    },
    [socket, playback.current_song, queue]
  );

  const onSeek = useCallback(
    (ms) =>
      socket?.emit("seek_song", {
        position_ms: ms
      }),
    [socket]
  );

  const onNext = useCallback(() => {
    const idx = queue.findIndex(
      (q) =>
        q.track_id ===
        playback.current_song?.track_id
    );

    const nxt = queue[idx + 1];

    if (nxt) {
      socket?.emit("play_song", {
        song: nxt,
        position_ms: 0
      });
    }
  }, [queue, playback.current_song, socket]);

  const onPrev = useCallback(() => {
    const idx = queue.findIndex(
      (q) =>
        q.track_id ===
        playback.current_song?.track_id
    );

    const prev = queue[idx - 1];

    if (prev) {
      socket?.emit("play_song", {
        song: prev,
        position_ms: 0
      });
    }
  }, [queue, playback.current_song, socket]);

  const addToQueue = useCallback(
    (song) => {
      socket?.emit("add_to_queue", { song });

      toast.success(
        `${song.title} added to queue`
      );
    },
    [socket]
  );

  const removeFromQueue = useCallback(
    (id) => {
      socket?.emit("remove_from_queue", {
        item_id: id
      });
    },
    [socket]
  );

  const sendMessage = useCallback(
    (text) =>
      socket?.emit("send_message", { text }),
    [socket]
  );

  const sendTyping = useCallback(
    (isTyping) =>
      socket?.emit("typing", {
        typing: isTyping
      }),
    [socket]
  );

  const deleteMessage = useCallback(
    (messageId) => {
      socket?.emit("delete_message", {
        message_id: messageId,
      });
    },
    [socket]
  );

  const clearChat = useCallback(() => {
    socket?.emit("clear_chat", {});
  }, [socket]);

  const deleteRoom = useCallback(() => {
    if (
      window.confirm(
        "Delete this room permanently?"
      )
    ) {
      socket?.emit("delete_room", {});
    }
  }, [socket]);

  const copyCode = async () => {
    if (!room?.code) return;

    try {
      await navigator.clipboard.writeText(
        room.code
      );

      setCopied(true);

      toast.success("Room code copied");

      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy");
    }
  };

  const shareRoom = async () => {
    if (!room) return;

    const url = `${window.location.origin}/join/${room.code}`;

    const data = {
      title: `Duo-fy · ${room.name}`,
      text: `Join my Duo-fy room "${room.name}". Code: ${room.code}`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);

        return;
      }

      await navigator.clipboard.writeText(url);

      toast.success("Invite link copied");
    } catch (_) {}
  };

  const toggleFavorite = async () => {
    const s = playback.current_song;

    if (!s) return;

    try {
      if (favSong === s.track_id) {
        await api.delete(
          `/users/favorites/${encodeURIComponent(
            s.track_id
          )}`
        );

        setFavSong(null);

        toast("Removed from favorites");
      } else {
        await api.post(`/users/favorites`, {
          song: s
        });

        setFavSong(s.track_id);

        toast.success("Saved to favorites");
      }
    } catch {
      toast.error("Could not update favorites");
    }
  };

  if (loading || !room) {
    return (
      <div className="min-h-screen flex bg-[#050505] text-white">
        <Sidebar />

        <div
          className="flex-1 grid place-items-center"
          data-testid="room-loading"
        >
          <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-rose-500 animate-spin" />
        </div>
      </div>
    );
  }

  const mobileRight = (
    <div className="flex items-center gap-2">
      <button
        onClick={shareRoom}
        className="w-9 h-9 grid place-items-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
        data-testid="mobile-share"
      >
        <Share2 className="w-4 h-4" />
      </button>

      <button
        onClick={copyCode}
        className="px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono-soft tracking-[0.3em]"
        data-testid="mobile-copy-code"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          room.code
        )}
      </button>
    </div>
  );

  return (
    <div
      className="min-h-screen flex bg-[#050505] text-white"
      data-testid="room-page"
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav
          title={room.name}
          subtitle={`Room · Hosted by ${room.host_name}`}
          right={mobileRight}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1400px]">
          <motion.header
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden lg:flex flex-wrap items-center gap-4 mb-6"
          >
            <Link
              to="/dashboard"
              className="w-9 h-9 grid place-items-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              data-testid="back-to-dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.3em] text-rose-400">
                Room · Hosted by {room.host_name}{" "}
                {isHost && "· You"}
              </p>

              <h1 className="font-display text-3xl lg:text-4xl tracking-tighter truncate">
                {room.name}
              </h1>

              {room.description && (
                <p className="text-sm text-zinc-500 truncate">
                  {room.description}
                </p>
              )}
            </div>

            <button
              onClick={shareRoom}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-colors"
              data-testid="share-room"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>

            <button
              onClick={copyCode}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-mono-soft tracking-[0.4em]"
              data-testid="copy-room-code"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}

              {room.code}
            </button>

            <button
              onClick={toggleFavorite}
              disabled={!playback.current_song}
              className={`w-9 h-9 grid place-items-center rounded-full border border-white/10 transition-colors ${
                favSong ===
                playback.current_song?.track_id
                  ? "bg-rose-600 text-white border-transparent"
                  : "bg-white/5 hover:bg-white/10"
              }`}
              data-testid="favorite-current"
            >
              <Heart
                className={`w-4 h-4 ${
                  favSong ===
                  playback.current_song?.track_id
                    ? "fill-current"
                    : ""
                }`}
              />
            </button>

            {room?.host_id === user?.id && (
              <button
                onClick={deleteRoom}
                className="px-4 py-2 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-sm transition-colors"
              >
                Delete Room
              </button>
            )}
          </motion.header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <SearchBar onAdd={addToQueue} />

              <MusicPlayer
                playback={playback}
                onPlayPause={onPlayPause}
                onSeek={onSeek}
                onNext={onNext}
                onPrev={onPrev}
                syncing={syncing}
                spotify={spotify}
              />

              <UsersList
                members={
                  members.length
                    ? members
                    : [
                        {
                          id: user?.id,
                          name: user?.name
                        }
                      ]
                }
                hostId={room.host_id}
              />
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6">
              <QueuePanel
                queue={queue}
                current={playback.current_song}
                onPlay={playFromQueue}
                onRemove={removeFromQueue}
              />

              <ChatPanel
                messages={messages}
                typingUsers={typingUsers}
                onSend={sendMessage}
                onTyping={sendTyping}
                onDeleteMessage={deleteMessage}
                onClearChat={clearChat}
                currentUserId={user?.id}
                roomOwnerId={room?.host_id}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
