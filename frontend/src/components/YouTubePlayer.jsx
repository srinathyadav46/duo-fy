import React, { useEffect, useRef, useState } from "react";
import { loadYouTubeIframeAPI } from "../services/youtubeService";

/**
 * YouTubePlayer
 *
 * Renders an embedded YouTube IFrame player and keeps it synced to the
 * room's playback state (received via Socket.IO and forwarded by parent).
 * Re-uses the existing `playback` shape:
 *    { current_song:{video_id,...}, is_playing, position_ms, server_time }
 *
 * It is purely a slave to props — control commands (play/pause/seek) are
 * still emitted by the parent through the existing socket events
 * (`play_song`, `pause_song`, `seek_song`).
 */
export default function YouTubePlayer({ playback, className = "" }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);

  const song = playback?.current_song;
  const videoId = song?.video_id || (song?.uri || "").split("v=")[1] || "";
  const isPlaying = !!playback?.is_playing;

  // Initial mount: build a single Player instance bound to a unique div.
  useEffect(() => {
    let cancelled = false;
    let elementId = `yt-player-${Math.random().toString(36).slice(2, 8)}`;
    const div = document.createElement("div");
    div.id = elementId;
    div.style.width = "100%";
    div.style.height = "100%";
    if (containerRef.current) containerRef.current.appendChild(div);

    (async () => {
      try {
        const YT = await loadYouTubeIframeAPI();
        if (cancelled) return;
        playerRef.current = new YT.Player(elementId, {
          width: "100%",
          height: "100%",
          videoId: videoId || undefined,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
          },
          events: {
            onReady: () => setReady(true),
            onError: (e) => {
              // 100=removed, 101/150=not embeddable, 5=html5 issue
              // eslint-disable-next-line no-console
              console.warn("YouTube player error", e?.data);
            },
          },
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("YouTube IFrame API failed to load", e);
      }
    })();

    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch (_) {}
      playerRef.current = null;
      setReady(false);
    };
    // Player instance is created once; videoId changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load new video when current song changes
  useEffect(() => {
    if (!ready || !playerRef.current || !videoId) return;
    try {
      const cur = playerRef.current.getVideoData?.()?.video_id;
      if (cur !== videoId) {
        playerRef.current.cueVideoById({ videoId });
      }
    } catch (_) {}
  }, [videoId, ready]);

  // Sync play/pause + seek with server-authoritative state
  useEffect(() => {
    if (!ready || !playerRef.current || !videoId) return;
    const driftMs = playback?.server_time
      ? Math.max(0, (Date.now() / 1000 - playback.server_time)) * 1000
      : 0;
    const targetSec = ((playback?.position_ms || 0) + (isPlaying ? driftMs : 0)) / 1000;

    let cur = 0;
    try { cur = playerRef.current.getCurrentTime?.() || 0; } catch (_) {}
    if (Math.abs(cur - targetSec) > 0.7) {
      try { playerRef.current.seekTo(targetSec, true); } catch (_) {}
    }
    try {
      if (isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    } catch (_) {}
  }, [ready, videoId, isPlaying, playback?.position_ms, playback?.server_time]);

  return (
    <div className={`relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black ${className}`} data-testid="youtube-player">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur text-[10px] uppercase tracking-[0.25em] text-rose-300 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> YouTube
      </div>
    </div>
  );
}
