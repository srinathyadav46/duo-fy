"""YouTube Music search via YouTube Data API v3.

Returns a unified Song shape ({track_id, title, artist, album, artwork,
preview_url, duration_ms, source, uri, video_id}) so it plugs straight into the
existing queue, playback-sync, and chat systems with zero changes elsewhere.
"""

from fastapi import APIRouter, HTTPException, Query
import httpx
import os
import re

router = APIRouter(prefix="/youtube", tags=["youtube"])

YT_BASE = "https://www.googleapis.com/youtube/v3"


def _is_configured() -> bool:
    return bool(os.environ.get("YOUTUBE_API_KEY", "").strip())


def _parse_iso8601_duration(d: str) -> int:
    """Convert ISO 8601 duration (PT#H#M#S) → milliseconds."""
    if not d:
        return 0

    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", d)

    if not m:
        return 0

    h, mi, s = (int(g) if g else 0 for g in m.groups())

    return ((h * 3600) + (mi * 60) + s) * 1000


def _best_thumb(snippet: dict) -> str:
    thumbs = (snippet or {}).get("thumbnails", {}) or {}

    for key in ("maxres", "high", "medium", "standard", "default"):
        t = thumbs.get(key)

        if t and t.get("url"):
            return t["url"]

    return ""


@router.get("/configured")
async def configured():
    return {"configured": _is_configured()}


# PUBLIC SEARCH ROUTE (NO AUTH REQUIRED)
@router.get("/search")
async def search(q: str = Query(..., min_length=1)):
    if not _is_configured():
        raise HTTPException(
            status_code=400,
            detail="YouTube is not configured"
        )

    key = os.environ["YOUTUBE_API_KEY"].strip()

    async with httpx.AsyncClient(timeout=10) as client:

        # 1) Search YouTube music videos
        try:
            sr = await client.get(
                f"{YT_BASE}/search",
                params={
                    "key": key,
                    "q": q,
                    "part": "snippet",
                    "type": "video",
                    "videoCategoryId": "10",
                    "videoEmbeddable": "true",
                    "maxResults": 15,
                    "safeSearch": "moderate",
                },
            )

        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"YouTube search failed: {e}"
            )

        if sr.status_code != 200:
            try:
                msg = sr.json().get("error", {}).get(
                    "message",
                    "YouTube error"
                )
            except Exception:
                msg = "YouTube error"

            raise HTTPException(
                status_code=502,
                detail=f"YouTube: {msg}"
            )

        items = sr.json().get("items", [])

        ids = [
            it["id"]["videoId"]
            for it in items
            if it.get("id", {}).get("videoId")
        ]

        if not ids:
            return {"results": []}

        # 2) Fetch durations/details
        try:
            dr = await client.get(
                f"{YT_BASE}/videos",
                params={
                    "key": key,
                    "id": ",".join(ids),
                    "part": "contentDetails,snippet,status",
                },
            )

            dr.raise_for_status()

        except Exception:
            dr = None

        detail_map = {}

        if dr is not None and dr.status_code == 200:
            for v in dr.json().get("items", []):
                vid = v.get("id")

                if vid:
                    detail_map[vid] = v

    songs = []

    for it in items:
        vid = it.get("id", {}).get("videoId")

        if not vid:
            continue

        snippet = it.get("snippet", {})
        detail = detail_map.get(vid, {})

        # Skip non-embeddable videos
        status = detail.get("status") or {}

        if status and status.get("embeddable") is False:
            continue

        duration_ms = _parse_iso8601_duration(
            (detail.get("contentDetails") or {}).get(
                "duration",
                ""
            )
        )

        songs.append({
            "track_id": f"youtube:{vid}",
            "title": snippet.get("title", "Unknown"),
            "artist": snippet.get("channelTitle", "YouTube"),
            "album": "",
            "artwork": _best_thumb(snippet),
            "preview_url": "",
            "duration_ms": duration_ms or 0,
            "source": "youtube",
            "uri": f"https://www.youtube.com/watch?v={vid}",
            "video_id": vid,
        })

    return {"results": songs}