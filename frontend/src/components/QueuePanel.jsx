import React from "react";
import { X, Disc3 } from "lucide-react";

export default function QueuePanel({ queue = [], current, onPlay, onRemove }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl flex flex-col overflow-hidden" data-testid="queue-panel">
      <div className="px-5 pt-4 pb-3 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="font-display text-lg tracking-tight">Up Next</h3>
        <span className="text-xs text-zinc-500 font-mono-soft">{queue.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[40vh] lg:max-h-none">
        {queue.length === 0 && (
          <div className="p-6 text-center text-sm text-zinc-500" data-testid="queue-empty">
            <Disc3 className="w-7 h-7 mx-auto mb-3 text-zinc-600" />
            Queue is empty.<br />Search a song above to start.
          </div>
        )}
        {queue.map((item) => {
          const active = current?.track_id === item.track_id;
          return (
            <div
              key={item.id}
              className={`relative px-4 py-3 flex items-center gap-3 hover:bg-white/[0.03] cursor-pointer ${active ? "tracing-beam bg-rose-950/20" : ""}`}
              onClick={() => onPlay?.(item)}
              data-testid={`queue-item-${item.id}`}
            >
              {item.artwork ? (
                <img src={item.artwork} alt="" className="w-10 h-10 rounded-md object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-gradient-to-br from-rose-700 to-zinc-900" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${active ? "text-rose-300" : ""}`}>{item.title}</p>
                <p className="text-xs text-zinc-500 truncate">{item.artist} · added by {item.added_by_name}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove?.(item.id); }}
                className="text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`queue-remove-${item.id}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
