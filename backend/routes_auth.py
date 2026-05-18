"""Auth routes: register, login, me, logout — with brute-force protection."""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
import uuid

from models import UserCreate, UserLogin, AuthResponse, UserPublic
from auth import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _public_user(doc: dict) -> UserPublic:
    return UserPublic(
        id=doc["id"],
        email=doc["email"],
        name=doc["name"],
        avatar=doc.get("avatar"),
        created_at=doc["created_at"],
    )


def get_db():
    from server import db
    return db


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _check_lockout(db, identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if not rec:
        return
    if rec.get("count", 0) >= MAX_ATTEMPTS:
        try:
            locked_until = datetime.fromisoformat(rec["locked_until"])
        except Exception:
            return
        if locked_until > datetime.now(timezone.utc):
            seconds = int((locked_until - datetime.now(timezone.utc)).total_seconds())
            raise HTTPException(
                status_code=429,
                detail=f"Too many failed attempts. Try again in {max(seconds, 1)}s.",
            )
        # Reset expired lockout
        await db.login_attempts.delete_one({"identifier": identifier})


async def _record_failed(db, identifier: str):
    locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {
            "$inc": {"count": 1},
            "$set": {"locked_until": locked_until.isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )


async def _clear_attempts(db, identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


@router.post("/register", response_model=AuthResponse)
async def register(payload: UserCreate):
    db = get_db()
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "avatar": None,
        "favorites": [],
        "recently_played": [],
        "spotify": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_doc["id"], user_doc["email"])
    return AuthResponse(token=token, user=_public_user(user_doc))


@router.post("/login", response_model=AuthResponse)
async def login(payload: UserLogin, request: Request):
    db = get_db()
    email = payload.email.lower().strip()
    identifier = f"{_client_ip(request)}:{email}"

    await _check_lockout(db, identifier)

    doc = await db.users.find_one({"email": email}, {"_id": 0})
    if not doc or not verify_password(payload.password, doc["password_hash"]):
        await _record_failed(db, identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await _clear_attempts(db, identifier)
    token = create_token(doc["id"], doc["email"])
    return AuthResponse(token=token, user=_public_user(doc))


@router.get("/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return _public_user(doc)


@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    return {"ok": True}
