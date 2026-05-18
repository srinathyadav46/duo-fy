"""JWT + bcrypt authentication helpers."""
import os
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import Header, HTTPException, status
from typing import Optional

JWT_ALGORITHM = "HS256"


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    days = int(os.environ.get("JWT_EXPIRES_DAYS", "14"))
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=days),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])


async def get_current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    """FastAPI dependency that returns the current user payload from JWT."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"id": payload["sub"], "email": payload.get("email", "")}


def user_from_token(token: str) -> Optional[dict]:
    """Used by socket.io auth — returns None if invalid."""
    try:
        payload = decode_token(token)
        return {"id": payload["sub"], "email": payload.get("email", "")}
    except Exception:
        return None
