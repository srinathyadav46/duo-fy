import React from "react";

export default function UsersList({ members = [], hostId }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4" data-testid="users-list">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base tracking-tight">Listening together</h3>
        <span className="text-xs text-zinc-500 font-mono-soft">{members.length}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const initials = (m.name || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
          const isHost = m.id === hostId;
          return (
            <div
              key={m.id}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white/[0.05] border border-white/10"
              data-testid={`user-${m.id}`}
              title={isHost ? `${m.name} · Host` : m.name}
            >
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-600 to-rose-800 grid place-items-center text-[10px] font-medium">
                  {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0a0a0a]" />
              </div>
              <span className="text-xs">{m.name}{isHost ? " ★" : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
