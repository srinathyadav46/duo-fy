import React, { useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";

function timeShort(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

export default function ChatPanel({
  messages = [],
  typingUsers = [],
  onSend,
  onTyping,

  // NEW
  onDeleteMessage,
  onClearChat,

  currentUserId,
  roomOwnerId,
}) {
  const [text, setText] = useState("");

  const scrollRef = useRef(null);

  const typingTimer = useRef();

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages.length, typingUsers.length]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const t = text.trim();

    if (!t) return;

    onSend?.(t);

    setText("");

    onTyping?.(false);
  };

  const handleChange = (e) => {
    setText(e.target.value);

    onTyping?.(true);

    clearTimeout(typingTimer.current);

    typingTimer.current = setTimeout(
      () => onTyping?.(false),
      1500
    );
  };

  const canManageChat = currentUserId === roomOwnerId;

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl flex flex-col overflow-hidden flex-1 min-h-[280px]"
      data-testid="chat-panel"
    >
      {/* HEADER */}
      <div className="px-5 pt-4 pb-3 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="font-display text-lg tracking-tight">
          Chat
        </h3>

        {/* CLEAR CHAT BUTTON */}
        {canManageChat && messages.length > 0 && (
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Clear all chat messages?"
                )
              ) {
                onClearChat?.();
              }
            }}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Chat
          </button>
        )}
      </div>

      {/* MESSAGES */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        data-testid="chat-messages"
      >
        {messages.length === 0 && (
          <p className="text-center text-xs text-zinc-500 py-8">
            Say hi to start the conversation.
          </p>
        )}

        {messages.map((m) => {
          const mine = m.user_id === currentUserId;

          const canDelete =
            mine || currentUserId === roomOwnerId;

          return (
            <div
              key={m.id}
              className={`flex flex-col ${
                mine ? "items-end" : "items-start"
              }`}
              data-testid={`chat-msg-${m.id}`}
            >
              <div className="group relative max-w-[80%]">

                {/* DELETE BUTTON */}
                {!m.is_deleted && canDelete && (
                  <button
                    onClick={() =>
                      onDeleteMessage?.(m.id)
                    }
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-white/10 rounded-full p-1 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                )}

                <div
                  className={`px-3 py-2 rounded-2xl text-sm ${
                    mine
                      ? "bg-rose-600 text-white rounded-br-md"
                      : "bg-white/[0.05] text-zinc-100 rounded-bl-md"
                  } ${
                    m.is_deleted
                      ? "italic opacity-60"
                      : ""
                  }`}
                >
                  {!mine && (
                    <p className="text-[10px] text-rose-300 mb-0.5">
                      {m.user_name}
                    </p>
                  )}

                  <p className="break-words">
                    {m.text}
                  </p>
                </div>
              </div>

              <span className="text-[10px] text-zinc-600 mt-0.5 px-1 font-mono-soft">
                {timeShort(m.created_at)}
              </span>
            </div>
          );
        })}

        {/* TYPING */}
        {typingUsers.length > 0 && (
          <div
            className="flex items-center gap-2 text-xs text-zinc-500"
            data-testid="typing-indicator"
          >
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce"
                  style={{
                    animationDelay: `${i * 0.15}s`
                  }}
                />
              ))}
            </span>

            {typingUsers
              .map((u) => u.name)
              .join(", ")}{" "}
            typing…
          </div>
        )}
      </div>

      {/* INPUT */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-white/[0.06] p-3 flex items-center gap-2"
      >
        <input
          value={text}
          onChange={handleChange}
          placeholder="Send a message…"
          className="flex-1 bg-zinc-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder:text-zinc-500 outline-none focus:border-rose-500/50"
          data-testid="chat-input"
        />

        <button
          type="submit"
          disabled={!text.trim()}
          className="w-10 h-10 grid place-items-center rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          data-testid="chat-send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
