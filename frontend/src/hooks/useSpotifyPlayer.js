import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../services/api";

const SDK_SCRIPT_ID = "spotify-web-playback-sdk";

let sdkLoadingPromise = null;
function loadSDK() {
  if (window.Spotify) return Promise.resolve(window.Spotify);
  if (sdkLoadingPromise) return sdkLoadingPromise;
  sdkLoadingPromise = new Promise((resolve, reject) => {
    if (document.getElementById(SDK_SCRIPT_ID)) {
      const wait = setInterval(() => {
        if (window.Spotify) { clearInterval(wait); resolve(window.Spotify); }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.id = SDK_SCRIPT_ID;
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Spotify SDK"));
    window.onSpotifyWebPlaybackSDKReady = () => resolve(window.Spotify);
    document.body.appendChild(script);
  });
  return sdkLoadingPromise;
}

/**
 * Hook that connects to the Spotify Web Playback SDK when the user has linked
 * their Spotify Premium account. Returns control methods for full-track playback.
 *
 * Falls back to `connected: false` when:
 *  - server has no Spotify keys configured
 *  - user hasn't linked Spotify yet
 *  - user is not Premium (SDK will refuse to connect)
 */
export function useSpotifyPlayer() {
  const [status, setStatus] = useState({ connected: false, configured: false, product: null, display_name: null });
  const [ready, setReady] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [error, setError] = useState(null);
  const playerRef = useRef(null);
  const tokenRef = useRef(null);

  const refreshStatus = useCallback(async () => {
    try {
      const { data } = await api.get("/spotify/status");
      setStatus(data);
      tokenRef.current = data.access_token || null;
      return data;
    } catch (e) {
      setStatus({ connected: false, configured: false });
      return null;
    }
  }, []);

  // Load status on mount
  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  // Connect SDK when token is available and user is Premium
  useEffect(() => {
    if (!status.connected || !tokenRef.current) return;
    if (status.product && status.product !== "premium") {
      setError("Spotify Premium required for full-track playback. Free preview will be used.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const Spotify = await loadSDK();
        if (cancelled) return;
        const player = new Spotify.Player({
          name: "Duo-fy",
          getOAuthToken: async (cb) => {
            // Always pull fresh token (server refreshes if expired)
            const fresh = await refreshStatus();
            cb(fresh?.access_token || tokenRef.current);
          },
          volume: 0.8,
        });
        player.addListener("ready", ({ device_id }) => { setDeviceId(device_id); setReady(true); });
        player.addListener("not_ready", () => setReady(false));
        player.addListener("initialization_error", ({ message }) => setError(message));
        player.addListener("authentication_error", ({ message }) => setError(message));
        player.addListener("account_error", ({ message }) => setError(message));
        const ok = await player.connect();
        if (!ok) setError("Could not connect Spotify player");
        playerRef.current = player;
      } catch (e) {
        setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
      try { playerRef.current?.disconnect(); } catch (_) {}
      playerRef.current = null;
      setReady(false);
    };
  }, [status.connected, status.product, refreshStatus]);

  // Control helpers (call Spotify Web API directly with our access token + device id)
  const _api = useCallback(async (path, method = "PUT", body) => {
    if (!tokenRef.current || !deviceId) return;
    await fetch(`https://api.spotify.com/v1${path}${path.includes("?") ? "&" : "?"}device_id=${deviceId}`, {
      method,
      headers: {
        "Authorization": `Bearer ${tokenRef.current}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => {});
  }, [deviceId]);

  const playUri = useCallback(async (uri, positionMs = 0) => {
    await _api("/me/player/play", "PUT", { uris: [uri], position_ms: positionMs });
  }, [_api]);
  const pause = useCallback(async () => { await _api("/me/player/pause", "PUT"); }, [_api]);
  const resume = useCallback(async () => { await _api("/me/player/play", "PUT"); }, [_api]);
  const seek = useCallback(async (ms) => { await _api(`/me/player/seek?position_ms=${Math.floor(ms)}`, "PUT"); }, [_api]);
  const setVolume = useCallback(async (v) => {
    if (!playerRef.current) return;
    try { await playerRef.current.setVolume(Math.max(0, Math.min(1, v))); } catch (_) {}
  }, []);

  const startConnect = useCallback(async () => {
    const { data } = await api.get("/spotify/auth-url");
    window.location.href = data.url;
  }, []);

  const disconnect = useCallback(async () => {
    await api.post("/spotify/disconnect");
    try { playerRef.current?.disconnect(); } catch (_) {}
    setReady(false); setDeviceId(null); tokenRef.current = null;
    await refreshStatus();
  }, [refreshStatus]);

  return {
    ...status, ready, deviceId, error,
    playUri, pause, resume, seek, setVolume,
    startConnect, disconnect, refreshStatus,
  };
}
