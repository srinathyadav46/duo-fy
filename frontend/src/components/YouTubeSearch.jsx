import React, { useEffect, useRef, useState } from "react";
import { Search, Plus, Loader2, Youtube } from "lucide-react";
import { searchYouTube } from "../services/youtubeService";

/**
 * Standalone YouTube search component (per spec).
 *
 * Useful when you want a YouTube-only search surface (e.g. a sidebar widget).
 * The unified `SearchBar` component also offers a YouTube toggle for the
 * main in-room search bar — both call the same `searchYouTube` service.
 */
export default function YouTubeSearch({ onAdd }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef();

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const items = await searchYouTube(q);
      setResults(items);
      setLoading(false);
    }, 320);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4" data-testid="youtube-search">
      <div className="flex items-center gap-2 mb-3">
        <Youtube className="w-4 h-4 text-rose-400" />
        <h3 className="font-display text-base tracking-tight">Search YouTube</h3>
      </div>
      <div className="flex items-center gap-2 bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 focus-within:border-rose-500/50 transition-all">
        <Search className="w-4 h-4 text-zinc-500 shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search videos…"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-zinc-500"
          data-testid="youtube-search-input"
        />
        {loading && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
      </div>

      {results.length > 0 && (
        <div className="mt-3 max-h-[280px] overflow-y-auto space-y-1" data-testid="youtube-search-results">
          {results.map((s) => (
            <button
              key={s.track_id}
              onClick={() => onAdd?.(s)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
              data-testid={`youtube-result-${s.video_id}`}
            >
              {s.artwork ? (
                <img src={s.artwork} alt="" className="w-12 h-9 rounded object-cover shrink-0" />
              ) : (
                <div className="w-12 h-9 rounded bg-gradient-to-br from-rose-700 to-zinc-900 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{s.title}</p>
                <p className="text-xs text-zinc-500 truncate">{s.artist}</p>
              </div>
              <Plus className="w-4 h-4 text-zinc-500" />
            </button>
          ))}
        </div>
      )}
      {q.trim() && !loading && results.length === 0 && (
        <p className="mt-3 text-xs text-zinc-500 text-center py-4" data-testid="youtube-search-empty">
          No YouTube results.
        </p>
      )}
    </div>
  );
}
