"""SpotLocal backend utilities: filename sanitization + Spotify URL parsing."""
from __future__ import annotations

import re
from pathlib import Path


def sanitize_filename(name: str) -> str:
    """Strip characters that are illegal in filenames on any platform."""
    if not name:
        return "unknown"
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", name)
    name = name.strip().strip(".")
    return name[:200] if name else "unknown"


def parse_spotify_url(url: str) -> tuple[str, str]:
    """Return (type, id) where type is one of {'track','album','playlist'}.

    Handles:
      - https://open.spotify.com/track/abc?si=...
      - https://open.spotify.com/intl-fr/track/abc
      - spotify:track:abc
    Raises ValueError if the URL is not a supported Spotify link.
    """
    if not url or not isinstance(url, str):
        raise ValueError("Empty URL")

    url = url.strip()

    # spotify:track:ID form
    m = re.match(r"^spotify:(track|album|playlist):([A-Za-z0-9]+)", url)
    if m:
        return m.group(1), m.group(2)

    # open.spotify.com/<optional locale>/<type>/<id>
    m = re.search(
        r"open\.spotify\.com/(?:intl-[a-z]{2}/)?(track|album|playlist)/([A-Za-z0-9]+)",
        url,
    )
    if m:
        return m.group(1), m.group(2)

    raise ValueError(f"Not a valid Spotify URL: {url}")


def is_valid_spotify_url(url: str) -> bool:
    try:
        parse_spotify_url(url)
        return True
    except ValueError:
        return False


def ensure_dir(p: str | Path) -> Path:
    path = Path(p)
    path.mkdir(parents=True, exist_ok=True)
    return path


def human_size(num_bytes: int) -> str:
    """Convert bytes to human-readable string."""
    size = float(num_bytes)
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size < 1024.0:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} PB"


def scan_audio_files(music_dir: str | Path, since_mtime: float | None = None) -> list[Path]:
    """Return all audio files under music_dir.

    If since_mtime is provided, only return files modified after that timestamp.
    """
    music_path = Path(music_dir)
    if not music_path.exists():
        return []
    extensions = {".mp3", ".m4a", ".opus", ".flac", ".wav", ".webm"}
    results: list[Path] = []
    for entry in music_path.rglob("*"):
        try:
            if entry.is_file() and entry.suffix.lower() in extensions:
                if since_mtime is None or entry.stat().st_mtime > since_mtime:
                    results.append(entry)
        except OSError:
            continue
    return results
