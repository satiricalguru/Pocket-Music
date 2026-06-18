"""ID3 tag reading and Spotify oEmbed preview fetching."""
from __future__ import annotations

import base64
from typing import Any

import httpx
from mutagen import File as MutagenFile  # type: ignore
from mutagen.id3 import ID3  # type: ignore

from utils import sanitize_filename


def _first(tags: Any, *keys: str, default: str = "") -> str:
    """Return the first non-empty value from a mutagen tag list for any key."""
    for key in keys:
        val = tags.get(key) if tags else None
        if val is None:
            continue
        if hasattr(val, "text") and val.text:
            return str(val.text[0])
        if isinstance(val, list) and val:
            return str(val[0])
        return str(val)
    return default


def _extract_cover_b64(tags: ID3 | Any) -> str | None:
    """Return a base64 data URL for embedded cover art, if present."""
    try:
        if not tags:
            return None
        # ID3 APIC frame
        for frame in getattr(tags, "values", lambda: [])() if callable(getattr(tags, "values", None)) else tags.values():
            from mutagen.id3 import APIC  # type: ignore

            if isinstance(frame, APIC):
                mime = frame.mime or "image/jpeg"
                b64 = base64.b64encode(frame.data).decode("ascii")
                return f"data:{mime};base64,{b64}"
    except Exception:
        pass
    return None


def read_tags(file_path: str) -> dict[str, Any]:
    """Read metadata from an audio file. Returns a dict of tag fields.

    Works across MP3 (ID3), M4A, FLAC, and others via mutagen's auto-detection.
    """
    audio = MutagenFile(file_path, easy=False)
    if audio is None:
        return _empty_tags(file_path)

    tags = getattr(audio, "tags", None)
    duration = 0
    try:
        duration = int(audio.info.length) if audio.info else 0
    except Exception:
        duration = 0

    # Easy path: ID3-tagged MP3
    title = _first(tags, "TIT2", "title", "TITLE")
    artist = _first(tags, "TPE1", "artist", "ARTIST", "albumartist")
    album = _first(tags, "TALB", "album", "ALBUM")
    album_artist = _first(tags, "TPE2", "albumartist", "ALBUMARTIST", "album_artist") or artist
    genre = _first(tags, "TCON", "genre", "GENRE")
    year = _first(tags, "TDRC", "TYER", "date", "YEAR", "year")
    track_number_raw = _first(tags, "TRCK", "tracknumber", "TRACKNUMBER")
    track_number = 0
    if track_number_raw:
        try:
            track_number = int(str(track_number_raw).split("/")[0])
        except ValueError:
            track_number = 0

    cover = _extract_cover_b64(tags if isinstance(tags, ID3) else None)
    # Fallback for non-ID3 formats with pictures
    if cover is None and audio is not None:
        cover = _extract_picture_generic(audio)

    spotify_id = _first(tags, "WOAF", "comment:SPOTIFY_ID") if tags else ""
    if not spotify_id:
        # Try to extract from comment/UNSYNCEDLYRICS conventions spotdl uses
        spotify_id = _find_spotify_id_in_tags(tags)

    return {
        "title": title or _default_title_from_path(file_path),
        "artist": artist or "Unknown Artist",
        "album": album or "Unknown Album",
        "album_artist": album_artist or artist or "Unknown Artist",
        "year": str(year)[:10] if year else "",
        "genre": genre,
        "track_number": track_number,
        "duration": duration,
        "cover_art_url": cover,
        "spotify_id": spotify_id,
    }


def _extract_picture_generic(audio: Any) -> str | None:
    """Extract cover art for FLAC/M4A/OGG via mutagen.pictures."""
    import base64

    try:
        pics = []
        if hasattr(audio, "pictures"):
            pics = list(audio.pictures)
        else:
            tags = audio.tags
            for key in ("covr", "APIC:Cover", "metadata_block_picture"):
                if tags and key in tags:
                    val = tags[key]
                    if isinstance(val, list):
                        pics.extend(val)
                    else:
                        pics.append(val)
        for pic in pics:
            mime = getattr(pic, "mime", None) or "image/jpeg"
            data = getattr(pic, "data", None)
            if data:
                b64 = base64.b64encode(bytes(data)).decode("ascii")
                return f"data:{mime};base64,{b64}"
    except Exception:
        pass
    return None


def _find_spotify_id_in_tags(tags: Any) -> str:
    """spotdl sometimes records the Spotify URL in COMM or WOAF frames."""
    if not tags:
        return ""
    import re

    pattern = re.compile(r"open\.spotify\.com/(?:track|album|playlist)/([A-Za-z0-9]+)")
    for frame in tags.values() if hasattr(tags, "values") else []:
        try:
            text = ""
            if hasattr(frame, "url"):
                text = str(frame.url)
            elif hasattr(frame, "text"):
                text = " ".join(str(t) for t in frame.text)
            elif isinstance(frame, list):
                text = " ".join(str(t) for t in frame)
            else:
                text = str(frame)
            m = pattern.search(text)
            if m:
                return m.group(1)
        except Exception:
            continue
    return ""


def _empty_tags(file_path: str) -> dict[str, Any]:
    return {
        "title": _default_title_from_path(file_path),
        "artist": "Unknown Artist",
        "album": "Unknown Album",
        "album_artist": "Unknown Artist",
        "year": "",
        "genre": "",
        "track_number": 0,
        "duration": 0,
        "cover_art_url": None,
        "spotify_id": "",
    }


def _default_title_from_path(file_path: str) -> str:
    from pathlib import Path

    return sanitize_filename(Path(file_path).stem)


def fetch_oembed_preview(spotify_url: str) -> dict[str, Any]:
    """Fetch a no-auth preview of a Spotify or YouTube URL via the oEmbed endpoint.

    Returns title, thumbnail_url, artist info instantly.
    Raises httpx.HTTPError on failure.
    """
    import re

    if "youtube.com" in spotify_url or "youtu.be" in spotify_url:
        is_playlist = "list=" in spotify_url or "/playlist" in spotify_url
        try:
            r = httpx.get(
                "https://www.youtube.com/oembed",
                params={"url": spotify_url},
                timeout=8.0,
                follow_redirects=True,
            )
            r.raise_for_status()
            data = r.json()
            return {
                "title": data.get("title", "YouTube Playlist" if is_playlist else "YouTube Video"),
                "thumbnail_url": data.get("thumbnail_url", ""),
                "artist": data.get("author_name", "YouTube"),
                "embed_type": "playlist" if is_playlist else "track",
            }
        except Exception:
            return {
                "title": "YouTube Playlist" if is_playlist else "YouTube Song",
                "thumbnail_url": "",
                "artist": "YouTube",
                "embed_type": "playlist" if is_playlist else "track",
            }

    r = httpx.get(
        "https://open.spotify.com/oembed",
        params={"url": spotify_url},
        timeout=8.0,
        follow_redirects=True,
    )
    r.raise_for_status()
    data = r.json()

    # oembed title is sometimes "Song Title by Artist" (older tracks)
    title = data.get("title", "")
    artist = ""
    if " by " in title:
        parts = title.rsplit(" by ", 1)
        title = parts[0].strip()
        artist = parts[1].strip()

    # If we still have no artist, scrape the Spotify embed page
    # The embedded react bundle includes track data with artist names
    if not artist:
        try:
            kind = _infer_embed_type(spotify_url)
            if kind == "track":
                _, track_id = spotify_url.rstrip("/").rsplit("/", 1)
                # Strip query params
                track_id = track_id.split("?")[0]
                embed_r = httpx.get(
                    f"https://open.spotify.com/embed/track/{track_id}",
                    params={"utm_source": "oembed"},
                    timeout=8.0,
                    follow_redirects=True,
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                if embed_r.status_code == 200:
                    # Extract artist names from the JS hydration data
                    names = re.findall(
                        r'"artists":\[.*?\]',
                        embed_r.text,
                        re.DOTALL,
                    )
                    if names:
                        artist_names = re.findall(r'"name":"(.*?)"', names[0])
                        artist = ", ".join(artist_names[:3])  # max 3 artists
        except Exception:
            pass  # artist remains "" — not critical

    return {
        "title": title,
        "thumbnail_url": data.get("thumbnail_url", ""),
        "artist": artist,
        "embed_type": _infer_embed_type(spotify_url),
    }



def _infer_embed_type(spotify_url: str) -> str:
    from utils import parse_spotify_url

    try:
        kind, _ = parse_spotify_url(spotify_url)
        return kind
    except ValueError:
        return "track"
