"""User favorites & recently played."""
from fastapi import APIRouter, HTTPException, Depends
from models import FavoriteAdd
from auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


def get_db():
    from server import db
    return db


@router.get("/favorites")
async def get_favorites(user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "favorites": 1})
    return {"favorites": (doc or {}).get("favorites", [])}


@router.post("/favorites")
async def add_favorite(payload: FavoriteAdd, user: dict = Depends(get_current_user)):
    db = get_db()
    song = payload.song.model_dump()
    # Avoid duplicates
    await db.users.update_one(
        {"id": user["id"]},
        {"$pull": {"favorites": {"track_id": song["track_id"]}}},
    )
    await db.users.update_one(
        {"id": user["id"]},
        {"$push": {"favorites": {"$each": [song], "$position": 0, "$slice": 50}}},
    )
    return {"ok": True}


@router.delete("/favorites/{track_id}")
async def remove_favorite(track_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.users.update_one(
        {"id": user["id"]},
        {"$pull": {"favorites": {"track_id": track_id}}},
    )
    return {"ok": True}


@router.get("/recently-played")
async def get_recent(user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "recently_played": 1})
    return {"recently_played": (doc or {}).get("recently_played", [])}
