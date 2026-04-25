from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.routers.devices import router as devices_router
from app.services.db import check_db_connection

app = FastAPI(title="MW Dashboard API", version="0.1.0")

raw_origins = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173,https://www.charliecoultas.com")
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devices_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/db-check")
def db_check() -> dict[str, str | bool]:
    ok, message = check_db_connection()
    return {
        "ok": ok,
        "status": "ok" if ok else "error",
        "message": message,
    }
