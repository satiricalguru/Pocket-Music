"""SpotLocal FastAPI backend.

Serves:
  - GET  /api/status                  health check
  - GET  /api/preview?url=...         oEmbed preview of a Spotify URL
  - POST /api/download/start           kick off a spotdl job, returns job_id
  - GET  /api/download/progress/{id}   SSE stream of job events
  - POST /api/download/cancel/{id}     cancel a running job
  - POST /api/scan                     rescan music_dir and return all tracks
  - GET  /api/settings                 (passthrough) current audio quality
  - POST /api/settings                 set audio quality for future downloads
  - /files/*                           static audio file serving (HTTP range support)
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

# Ensure backend dir is on sys.path so sibling modules import cleanly
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI, HTTPException, Query, Request  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from fastapi.responses import JSONResponse  # type: ignore
from fastapi.staticfiles import StaticFiles  # type: ignore
from pydantic import BaseModel  # type: ignore
from sse_starlette.sse import EventSourceResponse  # type: ignore

from downloader import DownloadManager  # type: ignore
from metadata import fetch_oembed_preview  # type: ignore
from utils import ensure_dir, parse_spotify_url, scan_audio_files, is_valid_spotify_url  # type: ignore
from metadata import read_tags  # type: ignore

VERSION = "1.0.0"
PORT = int(os.environ.get("SPOTLOCAL_PORT", "7842"))

MUSIC_DIR = Path(os.environ.get("SPOTLOCAL_MUSIC_DIR", str(Path.home() / "SpotLocal" / "music")))
ensure_dir(MUSIC_DIR)

AUDIO_QUALITY = os.environ.get("SPOTLOCAL_QUALITY", "320k")

app = FastAPI(title="SpotLocal Backend", version=VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "app://.",
        "app://-",
        "file://.",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"(app|file|https?)://.*",
)

manager = DownloadManager(MUSIC_DIR, audio_quality=AUDIO_QUALITY)


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------
class StartDownloadRequest(BaseModel):
    url: str


class SettingsRequest(BaseModel):
    audio_quality: str | None = None
    music_dir: str | None = None


# ---------------------------------------------------------------------------
# Status & health
# ---------------------------------------------------------------------------
@app.get("/api/status")
async def status() -> dict[str, Any]:
    return {"status": "ok", "version": VERSION, "music_dir": str(MUSIC_DIR)}


# ---------------------------------------------------------------------------
# Preview (oEmbed, no auth)
# ---------------------------------------------------------------------------
@app.get("/api/preview")
async def preview(url: str = Query(..., description="Spotify or YouTube URL")) -> dict[str, Any]:
    url_stripped = url.strip()
    is_spotify = is_valid_spotify_url(url_stripped)
    is_youtube = "youtube.com" in url_stripped or "youtu.be" in url_stripped

    if not is_spotify and not is_youtube:
        raise HTTPException(status_code=400, detail="Not a valid Spotify or YouTube URL")

    try:
        kind = "track"
        if is_spotify:
            kind, _ = parse_spotify_url(url_stripped)
        data = fetch_oembed_preview(url_stripped)
        data["embed_type"] = kind
        return data
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Preview failed: {exc}")


# ---------------------------------------------------------------------------
# Downloads
# ---------------------------------------------------------------------------
@app.post("/api/download/start")
async def start_download(body: StartDownloadRequest) -> dict[str, Any]:
    url_stripped = body.url.strip()
    is_spotify = is_valid_spotify_url(url_stripped)
    is_youtube = "youtube.com" in url_stripped or "youtu.be" in url_stripped

    if not is_spotify and not is_youtube:
        raise HTTPException(status_code=400, detail="Not a valid Spotify or YouTube URL")

    kind = "track"
    if is_spotify:
        kind, _ = parse_spotify_url(url_stripped)

    job_id = await manager.start(url_stripped)
    return {"job_id": job_id, "type": kind}


@app.get("/api/download/progress/{job_id}")
async def download_progress(job_id: str, request: Request) -> EventSourceResponse:
    async def event_gen() -> Any:
        async for event in manager.stream(job_id):
            if await request.is_disconnected():
                break
            yield {"event": "message", "data": json.dumps(event)}

    return EventSourceResponse(event_gen())


@app.post("/api/download/cancel/{job_id}")
async def cancel_download(job_id: str) -> dict[str, Any]:
    ok = manager.cancel(job_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"cancelled": True, "job_id": job_id}


# ---------------------------------------------------------------------------
# Scan / library rebuild
# ---------------------------------------------------------------------------
@app.get("/api/scan")
async def scan_library() -> dict[str, Any]:
    tracks: list[dict[str, Any]] = []
    for audio_path in scan_audio_files(MUSIC_DIR):
        try:
            meta = read_tags(str(audio_path))
            meta["file_path"] = str(audio_path.relative_to(MUSIC_DIR))
            meta["absolute_path"] = str(audio_path)
            meta["size_bytes"] = audio_path.stat().st_size
            tracks.append(meta)
        except Exception:  # noqa: BLE001
            continue
    return {"music_dir": str(MUSIC_DIR), "count": len(tracks), "tracks": tracks}


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------
@app.get("/api/settings")
async def get_settings() -> dict[str, Any]:
    return {"audio_quality": manager.audio_quality, "music_dir": str(MUSIC_DIR)}


@app.post("/api/settings")
async def save_settings(body: SettingsRequest) -> dict[str, Any]:
    if body.audio_quality:
        manager.set_quality(body.audio_quality)
    return {"audio_quality": manager.audio_quality, "music_dir": str(MUSIC_DIR)}


# ---------------------------------------------------------------------------
# Static audio files (with HTTP range support for seeking)
# ---------------------------------------------------------------------------
app.mount(
    "/files",
    StaticFiles(directory=str(MUSIC_DIR), check_dir=False),
    name="files",
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    import traceback

    print(f"[spotlocal:err] {request.method} {request.url.path}: {exc}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    return JSONResponse(status_code=500, content={"detail": str(exc)})


def main() -> None:
    import uvicorn  # type: ignore

    print(f"[spotlocal] MUSIC_DIR = {MUSIC_DIR}", file=sys.stderr)
    print(f"[spotlocal] Starting on http://localhost:{PORT}", file=sys.stderr)
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="warning")


if __name__ == "__main__":
    main()
