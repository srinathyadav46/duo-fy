/**
 * Frontend YouTube service.
 *
 *  - searchYouTube(q): fetches /api/youtube/search results from the backend
 *  - loadYouTubeIframeAPI(): lazy-loads the YouTube IFrame Player API once
 *    and resolves with the global YT namespace.
 *
 * The actual Player instances are created by the YouTubePlayer component, so
 * this service only handles transport + script loading.
 */
import { api } from "./api";

const YT_SCRIPT_ID = "youtube-iframe-api-script";
let ytLoadingPromise = null;

export async function searchYouTube(query) {
  if (!query || !query.trim()) return [];
  try {
    const { data } = await api.get("/youtube/search", { params: { q: query } });
    return data.results || [];
  } catch (e) {
    return [];
  }
}

export async function isYouTubeConfigured() {
  try {
    const { data } = await api.get("/youtube/configured");
    return !!data.configured;
  } catch (_) {
    return false;
  }
}

export function loadYouTubeIframeAPI() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytLoadingPromise) return ytLoadingPromise;
  ytLoadingPromise = new Promise((resolve, reject) => {
    if (document.getElementById(YT_SCRIPT_ID)) {
      const wait = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(wait);
          resolve(window.YT);
        }
      }, 80);
      return;
    }
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try { prevReady && prevReady(); } catch (_) {}
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.id = YT_SCRIPT_ID;
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load YouTube IFrame API"));
    document.body.appendChild(script);
  });
  return ytLoadingPromise;
}
