"""Pydantic models for Duo-fy."""
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---- Users ----
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=60)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    avatar: Optional[str] = None
    created_at: str


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


# ---- Rooms ----
class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: Optional[str] = ""

    # NEW SECURITY FEATURES
    is_private: bool = False
    password: Optional[str] = None


class RoomJoin(BaseModel):
    code: str = Field(min_length=4, max_length=12)

    # NEW PASSWORD SUPPORT
    password: Optional[str] = None


class RoomPublic(BaseModel):
    id: str
    code: str
    name: str
    description: str

    host_id: str
    host_name: str

    created_at: str
    member_count: int = 0

    # NEW SECURITY / PRIVACY FIELDS
    owner_id: Optional[str] = None
    is_private: bool = False


# ---- Songs / Queue ----
class Song(BaseModel):
    track_id: str          # unique track id (e.g. itunes trackId or spotify uri)
    title: str
    artist: str
    album: Optional[str] = ""
    artwork: Optional[str] = ""
    preview_url: str       # 30 sec preview audio url
    duration_ms: int = 30000
    source: str = "itunes"  # itunes | spotify


class QueueItem(Song):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    added_by: str = ""     # user id
    added_by_name: str = ""
    added_at: str = Field(default_factory=now_iso)


# ---- Chat ----
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    room_id: str

    user_id: str
    user_name: str

    text: str

    created_at: str = Field(default_factory=now_iso)

    # NEW MESSAGE SECURITY
    is_deleted: bool = False


# ---- Playback ----
class PlaybackState(BaseModel):
    room_id: str
    current_song: Optional[Song] = None
    is_playing: bool = False
    position_ms: int = 0
    updated_at: str = Field(default_factory=now_iso)
    server_time: float = 0.0   # epoch float for client sync


# ---- Favorites / Recently played ----
class FavoriteAdd(BaseModel):
    song: Song
