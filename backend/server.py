"""Duo-fy backend — FastAPI + Socket.IO + MongoDB."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import socketio
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("duofy")

# ---- MongoDB ----
mongo_url = os.environ["MONGO_URL"]
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ["DB_NAME"]]


# ---- FastAPI ----
fastapi_app = FastAPI(title="Duo-fy API")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"name": "Duo-fy API", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"status": "healthy"}


# Include feature routers
from routes_auth import router as auth_router
from routes_rooms import router as rooms_router
from routes_music import router as music_router
from routes_users import router as users_router
from routes_spotify import router as spotify_router
from routes_youtube import router as youtube_router

api_router.include_router(auth_router)
api_router.include_router(rooms_router)
api_router.include_router(music_router)
api_router.include_router(users_router)
api_router.include_router(spotify_router)
api_router.include_router(youtube_router)

fastapi_app.include_router(api_router)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@fastapi_app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.rooms.create_index("id", unique=True)
        await db.rooms.create_index("code", unique=True)
        await db.login_attempts.create_index("identifier", unique=True)
        logger.info("MongoDB indexes ensured.")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")


@fastapi_app.on_event("shutdown")
async def on_shutdown():
    mongo_client.close()


# ---- Socket.IO ----
from socket_manager import sio, room_presence  # noqa: E402

# Wrap FastAPI in a Socket.IO ASGI app, mounted at /socket.io/ (default)
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="/api/socket.io")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)