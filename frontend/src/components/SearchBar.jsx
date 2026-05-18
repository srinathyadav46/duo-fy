import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, Loader2, Music, Youtube } from "lucide-react";
import { api } from "../services/api";
import { searchYouTube, isYouTubeConfigured } from "../services/youtubeService";

/**
 * Debounced song search.
 * Source toggle (iTunes / Spotify / YouTube) appears based on what's configured
 * on the server. Each source returns the same Song shape so the queue,
 * playback sync, and player handle them transparently.
 */
export default function SearchBar({ onAdd }) {
  const [q, setQ] = useState("");
  const [source, setSource] = useState("itunes");  // itunes | spotify | youtube
  const [spotifyAvailable, setSpotifyAvailable] = useState(false);
  const [youtubeAvailable, setYoutubeAvailable] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef();

  // Detect which sources are configured
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/spotify/configured");
        setSpotifyAvailable(!!data.configured);
      } catch (_) {}

      // Force YouTube enabled
      setYoutubeAvailable(true);
    })();
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);

      try {
        if (source === "youtube") {
          const items = await searchYouTube(q);
          setResults(items);
          setOpen(true);
        } else {
          const path =
            source === "spotify"
              ? "/music/spotify/search"
              : "/music/search";

          const { data } = await api.get(path, {
            params: { q },
          });

          setResults(data.results || []);
          setOpen(true);
        }
      } catch (_) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => clearTimeout(debounceRef.current);
  }, [q, source]);

  const placeholder =
    source === "youtube"
      ? "Search YouTube videos…"
      : source === "spotify"
      ? "Search on Spotify (Premium for full track)…"
      : "Search any song, artist, album…";

  return (
    <div className="relative" data-testid="search-bar">
      <div className="flex items-center gap-2 bg-zinc-900/60 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-rose-500/50 focus-within:ring-1 focus-within:ring-rose-500/40 transition-all">
        <Search className="w-4 h-4 text-zinc-500 shrink-0" />

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-zinc-500"
          data-testid="search-input"
        />

        {loading && (
          <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
        )}

        <div
          className="flex items-center gap-0.5 rounded-full bg-white/[0.04] p-0.5 border border-white/[0.06]"
          role="group"
          aria-label="Search source"
        >
          <button
            type="button"
            onClick={() => setSource("itunes")}
            className={`text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full transition-colors ${
              source === "itunes"
                ? "bg-rose-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
            data-testid="search-source-itunes"
            title="iTunes — 30-sec previews (works for everyone)"
          >
            iTunes
          </button>

          {spotifyAvailable && (
            <button
              type="button"
              onClick={() => setSource("spotify")}
              className={`text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${
                source === "spotify"
                  ? "bg-emerald-500 text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
              data-testid="search-source-spotify"
              title="Spotify — full tracks for Premium listeners"
            >
              <Music className="w-3 h-3" />
              Spotify
            </button>
          )}

          <button
            type="button"
            onClick={() => setSource("youtube")}
            className={`text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${
              source === "youtube"
                ? "bg-red-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
            data-testid="search-source-youtube"
            title="YouTube Music — full videos for everyone"
          >
            <Youtube className="w-3 h-3" />
            YouTube
          </button>
        </div>
      </div>

      {open && results.length > 0 && (
        <div
          className="absolute z-30 mt-2 left-0 right-0 max-h-[420px] overflow-y-auto rounded-2xl bg-[#0c0c0c]/95 backdrop-blur-2xl border border-white/10 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]"
          data-testid="search-results"
        >
          {results.map((s) => (
            <button
              key={s.track_id}
              onClick={() => {
                onAdd?.(s);
                setOpen(false);
                setQ("");
              }}
              className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.04] transition-colors text-left"
              data-testid={`search-result-${s.track_id}`}
            >
              {s.artwork ? (
                <img
                  src={s.artwork}
                  alt=""
                  className="w-11 h-11 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-md bg-gradient-to-br from-rose-700 to-zinc-900 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{s.title}</p>
                <p className="text-xs text-zinc-500 truncate">
                  {s.artist}
                </p>
              </div>

              {s.source === "spotify" && !s.preview_url && (
                <span className="text-[9px] uppercase tracking-[0.2em] text-emerald-400 mr-1">
                  Premium
                </span>
              )}

              {s.source === "youtube" && (
                <span className="text-[9px] uppercase tracking-[0.2em] text-red-400 mr-1">
                  Video
                </span>
              )}

              <Plus className="w-4 h-4 text-zinc-500 group-hover:text-rose-400" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}