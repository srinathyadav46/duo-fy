"""Spotify OAuth + Web Playback SDK token management.

Flow:
1. GET  /api/spotify/auth-url    (auth) → returns Spotify OAuth URL with state
2. GET  /api/spotify/callback?code=&state=  → exchanges code, stores tokens, redirects to FRONTEND_URL/profile?spotify=connected
3. GET  /api/spotify/status      (auth) → { connected: bool, access_token: str | None, expires_at, product }
4. POST /api/spotify/disconnect  (auth)
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from fastapi.responses import RedirectResponse
import os
import httpx
import base64
import time
from urllib.parse import urlencode

from auth import get_current_user, decode_token, create_token

router = APIRouter(prefix="/spotify", tags=["spotify"])

SCOPES = "user-read-private user-read-email streaming user-modify-playback-state user-read-playback-state"


def _is_configured() -> bool:
    return bool(os.environ.get("SPOTIFY_CLIENT_ID") and os.environ.get("SPOTIFY_CLIENT_SECRET")
                and os.environ.get("SPOTIFY_REDIRECT_URI"))


def get_db():
    from server import db
    return db


@router.get("/configured")
async def configured():
    return {"configured": _is_configured()}


@router.get("/auth-url")
async def auth_url(user: dict = Depends(get_current_user)):
    if not _is_configured():
        raise HTTPException(status_code=400, detail="Spotify is not configured on this server")
    # Use a JWT as the OAuth state to bind the user to the callback
    state = create_token(user["id"], user.get("email", ""))
    params = {
        "client_id": os.environ["SPOTIFY_CLIENT_ID"],
        "response_type": "code",
        "redirect_uri": os.environ["SPOTIFY_REDIRECT_URI"],
        "scope": SCOPES,
        "state": state,
        "show_dialog": "true",
    }
    return {"url": f"https://accounts.spotify.com/authorize?{urlencode(params)}"}


@router.get("/callback")
async def callback(code: str = Query(...), state: str = Query(...), error: str | None = Query(default=None)):
    frontend = os.environ.get("FRONTEND_URL", "")
    if not frontend:
        # Fallback to relative redirect if no frontend URL configured
        frontend = ""

    if error or not _is_configured():
        return RedirectResponse(f"{frontend}/profile?spotify=error")

    try:
        payload = decode_token(state)
        user_id = payload["sub"]
    except Exception:
        return RedirectResponse(f"{frontend}/profile?spotify=invalid_state")

    auth = base64.b64encode(
        f"{os.environ['SPOTIFY_CLIENT_ID']}:{os.environ['SPOTIFY_CLIENT_SECRET']}".encode()
    ).decode()
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            "https://accounts.spotify.com/api/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": os.environ["SPOTIFY_REDIRECT_URI"],
            },
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        if r.status_code != 200:
            return RedirectResponse(f"{frontend}/profile?spotify=token_error")
        tok = r.json()

        # Fetch profile so we can show product type (free/premium)
        profile = {}
        try:
            pr = await client.get(
                "https://api.spotify.com/v1/me",
                headers={"Authorization": f"Bearer {tok['access_token']}"},
            )
            if pr.status_code == 200:
                profile = pr.json()
        except Exception:
            profile = {}

    db = get_db()
    spotify_data = {
        "access_token": tok["access_token"],
        "refresh_token": tok.get("refresh_token"),
        "expires_at": int(time.time()) + int(tok.get("expires_in", 3600)),
        "scope": tok.get("scope", ""),
        "product": profile.get("product", "unknown"),
        "display_name": profile.get("display_name"),
        "spotify_id": profile.get("id"),
    }
    await db.users.update_one({"id": user_id}, {"$set": {"spotify": spotify_data}})

    return RedirectResponse(f"{frontend}/profile?spotify=connected")


async def _refresh_if_needed(db, user_id: str, sp: dict) -> dict:
    if not sp or not sp.get("refresh_token"):
        return sp
    if sp.get("expires_at", 0) > time.time() + 60:
        return sp
    auth = base64.b64encode(
        f"{os.environ['SPOTIFY_CLIENT_ID']}:{os.environ['SPOTIFY_CLIENT_SECRET']}".encode()
    ).decode()
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            "https://accounts.spotify.com/api/token",
            data={"grant_type": "refresh_token", "refresh_token": sp["refresh_token"]},
            headers={"Authorization": f"Basic {auth}",
                     "Content-Type": "application/x-www-form-urlencoded"},
        )
        if r.status_code != 200:
            return sp
        tok = r.json()
    sp["access_token"] = tok["access_token"]
    sp["expires_at"] = int(time.time()) + int(tok.get("expires_in", 3600))
    if tok.get("refresh_token"):
        sp["refresh_token"] = tok["refresh_token"]
    await db.users.update_one({"id": user_id}, {"$set": {"spotify": sp}})
    return sp


@router.get("/status")
async def status(user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "spotify": 1})
    sp = (doc or {}).get("spotify")
    if not sp:
        return {"connected": False, "configured": _is_configured()}
    sp = await _refresh_if_needed(db, user["id"], sp)
    return {
        "connected": True,
        "configured": _is_configured(),
        "access_token": sp.get("access_token"),
        "expires_at": sp.get("expires_at"),
        "product": sp.get("product"),
        "display_name": sp.get("display_name"),
    }


@router.post("/disconnect")
async def disconnect(user: dict = Depends(get_current_user)):
    db = get_db()
    await db.users.update_one({"id": user["id"]}, {"$set": {"spotify": None}})
    return {"ok": True}
