"""Music search routes.

Primary source: iTunes Search API (free, no auth required, returns 30s previews).
Optional: Spotify Web API via Client Credentials Flow if SPOTIFY_CLIENT_ID and
SPOTIFY_CLIENT_SECRET are configured.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from auth import get_current_user
import httpx
import os
import time
import base64

router = APIRouter(prefix="/music", tags=["music"])

ITUNES_BASE = "https://itunes.apple.com/search"

_spotify_cache = {"token": None, "expires_at": 0}


async def _spotify_token() -> str | None:
    cid = os.environ.get("SPOTIFY_CLIENT_ID", "")
    cs = os.environ.get("SPOTIFY_CLIENT_SECRET", "")
    if not cid or not cs:
        return None
    if _spotify_cache["token"] and _spotify_cache["expires_at"] > time.time() + 30:
        return _spotify_cache["token"]
    auth = base64.b64encode(f"{cid}:{cs}".encode()).decode()
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(
            "https://accounts.spotify.com/api/token",
            data={"grant_type": "client_credentials"},
            headers={"Authorization": f"Basic {auth}"},
        )
        if r.status_code != 200:
            return None
        data = r.json()
        _spotify_cache["token"] = data["access_token"]
        _spotify_cache["expires_at"] = time.time() + data.get("expires_in", 3600)
        return _spotify_cache["token"]


def _itunes_to_song(item: dict) -> dict:
    return {
        "track_id": f"itunes:{item.get('trackId')}",
        "title": item.get("trackName", "Unknown"),
        "artist": item.get("artistName", "Unknown"),
        "album": item.get("collectionName", ""),
        "artwork": (item.get("artworkUrl100") or "").replace("100x100bb", "512x512bb"),
        "preview_url": item.get("previewUrl", ""),
        "duration_ms": int(item.get("trackTimeMillis", 30000)),
        "source": "itunes",
    }


@router.get("/search")
async def search_songs(q: str = Query(..., min_length=1), user: dict = Depends(get_current_user)):
    if not q.strip():
        return {"results": []}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(
                ITUNES_BASE,
                params={"term": q, "media": "music", "entity": "song", "limit": 25},
                headers={"User-Agent": "Duofy/1.0"},
            )
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Search failed: {e}")
    songs = [_itunes_to_song(it) for it in data.get("results", []) if it.get("previewUrl")]
    return {"results": songs}


@router.get("/spotify/search")
async def spotify_search(q: str = Query(..., min_length=1), user: dict = Depends(get_current_user)):
    """Optional Spotify search — returns 30s previews when available."""
    token = await _spotify_token()
    if not token:
        raise HTTPException(status_code=400, detail="Spotify not configured")
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            "https://api.spotify.com/v1/search",
            params={"q": q, "type": "track", "limit": 10},
            headers={"Authorization": f"Bearer {token}"},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Spotify error")
        data = r.json()
    out = []
    for t in data.get("tracks", {}).get("items", []):
        artwork = ""
        imgs = (t.get("album") or {}).get("images") or []
        if imgs:
            artwork = imgs[0].get("url", "")
        out.append({
            "track_id": f"spotify:track:{t['id']}",
            "title": t.get("name", "Unknown"),
            "artist": ", ".join(a["name"] for a in t.get("artists", [])),
            "album": (t.get("album") or {}).get("name", ""),
            "artwork": artwork,
            "preview_url": t.get("preview_url") or "",
            "duration_ms": t.get("duration_ms", 30000),
            "source": "spotify",
            "uri": f"spotify:track:{t['id']}",
        })
    return {"results": out}
