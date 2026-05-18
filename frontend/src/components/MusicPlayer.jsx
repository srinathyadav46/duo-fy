import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from "lucide-react";
import Visualizer from "./Visualizer";
import YouTubePlayer from "./YouTubePlayer";

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}

/**
 * Synchronized music player.
 *  - Plays via Spotify Web Playback SDK when current_song.source === 'spotify'
 *    AND the spotify controller is ready.
 *  - Otherwise plays the 30s preview through an HTML <audio> element.
 *  - Emits play/pause/seek/skip via callbacks (which broadcast over Socket.IO).
 */
export default function MusicPlayer({
  playback,        // { current_song, is_playing, position_ms, server_time }
  onPlayPause,     // (newIsPlaying, positionMs) => void
  onSeek,          // (positionMs) => void
  onNext,
  onPrev,
  syncing,
  spotify,         // { ready, deviceId, playUri, pause, resume, seek, setVolume, product }
}) {
  const audioRef = useRef(null);
  const [vol, setVol] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [localPos, setLocalPos] = useState(0);
  const [duration, setDuration] = useState(30000);

  const song = playback?.current_song;
  const isPlaying = !!playback?.is_playing;
  const isYouTube = !!(song && song.source === "youtube");
  const useSpotify = !!(song && song.source === "spotify" && spotify?.ready && spotify?.product === "premium");

  // Apply external playback state
  useEffect(() => {
    if (useSpotify || isYouTube) return;  // handled by other paths
    const audio = audioRef.current;
    if (!audio || !song) return;
    if (audio.src !== song.preview_url) audio.src = song.preview_url || "";

    // Compensate for network/server time drift
    const driftMs = playback?.server_time
      ? Math.max(0, (Date.now() / 1000 - playback.server_time)) * 1000
      : 0;
    const target = (playback?.position_ms || 0) + (isPlaying ? driftMs : 0);

    if (Math.abs(audio.currentTime * 1000 - target) > 600) {
      audio.currentTime = target / 1000;
    }
    if (isPlaying && audio.src) audio.play().catch(() => {});
    else audio.pause();
  }, [playback, song, isPlaying, useSpotify, isYouTube]);

  // Spotify SDK playback control
  useEffect(() => {
    if (!useSpotify) return;
    // Pause local audio in case it was active
    if (audioRef.current) audioRef.current.pause();

    if (isPlaying) {
      const driftMs = playback?.server_time
        ? Math.max(0, (Date.now() / 1000 - playback.server_time)) * 1000
        : 0;
      spotify.playUri(song.uri || song.track_id, (playback?.position_ms || 0) + driftMs);
    } else {
      spotify.pause();
    }
  }, [useSpotify, isPlaying, song, playback?.position_ms, playback?.server_time, spotify]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : vol;
    if (useSpotify && spotify?.setVolume) spotify.setVolume(muted ? 0 : vol);
  }, [vol, muted, useSpotify, spotify]);

  // Track playback time. For Spotify/YouTube, we estimate from server_time + elapsed.
  useEffect(() => {
    if (useSpotify || isYouTube) {
      setDuration(song?.duration_ms || 30000);
      const start = Date.now();
      const baseMs = playback?.position_ms || 0;
      const baseServer = playback?.server_time ? playback.server_time * 1000 : start;
      let interval;
      if (isPlaying) {
        interval = setInterval(() => {
          setLocalPos(baseMs + (Date.now() - baseServer));
        }, 200);
      } else {
        setLocalPos(baseMs);
      }
      return () => clearInterval(interval);
    }
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setLocalPos(audio.currentTime * 1000);
      setDuration(((audio.duration || 30) * 1000) || 30000);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onTime);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onTime);
    };
  }, [song, useSpotify, isYouTube, isPlaying, playback?.position_ms, playback?.server_time]);

  const handlePlayPause = () => {
    if (!song) return;
    const newPlaying = !isPlaying;
    let pos;
    if (useSpotify || isYouTube) pos = localPos;
    else pos = (audioRef.current?.currentTime ?? 0) * 1000;
    onPlayPause?.(newPlaying, pos);
  };

  const handleSeek = (e) => {
    if (!song) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const ms = Math.max(0, Math.min(duration, ratio * duration));
    onSeek?.(ms);
    if (!useSpotify && !isYouTube && audioRef.current) audioRef.current.currentTime = ms / 1000;
    if (useSpotify && spotify?.seek) spotify.seek(ms);
    // YouTubePlayer auto-syncs to playback.position_ms after server emits seek_song
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1b0a10] via-[#0c0506] to-[#0a0a0a] p-6 md:p-8 grain" data-testid="music-player">
      {/* Sync status pill */}
      <div className="flex items-center gap-2 mb-6">
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full rounded-full ${syncing ? "bg-amber-400 animate-ping" : "bg-emerald-400"} opacity-60`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${syncing ? "bg-amber-400" : "bg-emerald-400"}`} />
        </span>
        <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500" data-testid="sync-status">
          {syncing ? "Syncing…" : "In sync"}
        </span>
        {useSpotify && (
          <span className="ml-auto text-[10px] uppercase tracking-[0.25em] text-emerald-400 flex items-center gap-1.5" data-testid="spotify-active">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Spotify
          </span>
        )}
        {isYouTube && (
          <span className="ml-auto text-[10px] uppercase tracking-[0.25em] text-red-400 flex items-center gap-1.5" data-testid="youtube-active">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> YouTube
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-stretch">
        {isYouTube ? (
          <div className="md:w-[55%] shrink-0">
            <YouTubePlayer playback={playback} />
          </div>
        ) : (
          <div className="relative shrink-0 self-center">
            <div className="absolute inset-0 rounded-full bg-rose-600/30 blur-3xl" />
            <div className={`relative w-44 h-44 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-black shadow-[0_25px_60px_-15px_rgba(225,29,72,0.55)] ${isPlaying ? "spin-slow" : ""}`}>
              {song?.artwork ? (
                <img src={song.artwork} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-rose-700 to-zinc-900" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-black border-2 border-white/40" />
              </div>
            </div>
            {isPlaying && <div className="absolute inset-0 rounded-full pulse-ring pointer-events-none" />}
          </div>
        )}

        <div className="flex-1 flex flex-col">
          <p className="text-[10px] uppercase tracking-[0.3em] text-rose-400 mb-2">Now Playing</p>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl tracking-tighter text-balance leading-tight" data-testid="player-title">
            {song?.title || "Nothing playing"}
          </h2>
          <p className="text-zinc-400 mt-1 text-sm md:text-base" data-testid="player-artist">
            {song?.artist || "Add a song to begin"}
          </p>

          <div className="mt-auto pt-6">
            <Visualizer playing={isPlaying && !!song} className="mb-4" />

            <div
              className="group cursor-pointer h-1.5 rounded-full bg-white/[0.06] relative"
              onClick={handleSeek}
              data-testid="player-progress"
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 transition-[width]"
                style={{ width: `${Math.min(100, (localPos / duration) * 100 || 0)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono-soft text-zinc-500 mt-1.5">
              <span data-testid="player-time-current">{fmt(localPos)}</span>
              <span>{fmt(duration)}</span>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button onClick={onPrev} className="w-10 h-10 grid place-items-center rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors" data-testid="player-prev">
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={handlePlayPause}
                disabled={!song}
                className="w-14 h-14 grid place-items-center rounded-full bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-rose-900/50 transition-all hover:scale-105 active:scale-95"
                data-testid="player-play-pause"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
              <button onClick={onNext} className="w-10 h-10 grid place-items-center rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors" data-testid="player-next">
                <SkipForward className="w-5 h-5" />
              </button>

              <div className="ml-auto flex items-center gap-2 max-w-[140px] flex-1">
                <button onClick={() => setMuted((m) => !m)} className="text-zinc-400 hover:text-white" data-testid="player-mute">
                  {muted || vol === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range" min={0} max={1} step={0.01}
                  value={muted ? 0 : vol}
                  onChange={(e) => { setVol(Number(e.target.value)); setMuted(false); }}
                  className="flex-1 h-1 accent-rose-500"
                  data-testid="player-volume"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {!useSpotify && !isYouTube && <audio ref={audioRef} preload="auto" />}
    </div>
  );
}
