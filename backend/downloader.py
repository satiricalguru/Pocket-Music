"""Download manager using Spotify embed scraping + yt-dlp with SSE progress streaming.

For Spotify URLs: scrapes the embed page to extract track metadata, then downloads
each track from YouTube via yt-dlp and writes ID3 tags from Spotify metadata.
For YouTube URLs: downloads directly via yt-dlp.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import signal
import sys
import time
import uuid
from pathlib import Path
from typing import Any, AsyncGenerator

from metadata import read_tags, fetch_oembed_preview
from utils import parse_spotify_url, scan_audio_files


class DownloadJob:
    """A single download job with its own event queue and subprocess."""

    def __init__(self, job_id: str, url: str, kind: str):
        self.id = job_id
        self.url = url
        self.kind = kind  # track | album | playlist
        self.queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self.proc: asyncio.subprocess.Process | None = None
        self.started_at_mtime: float = 0.0
        self.cancelled = False
        self.total_tracks = 1 if kind == "track" else 0
        self.completed_tracks = 0
        self.failed_tracks: list[str] = []
        self.scanned_paths: set[str] = set()

    def request_cancel(self) -> None:
        self.cancelled = True
        proc = self.proc
        if proc and proc.returncode is None:
            try:
                if sys.platform == "win32":
                    proc.send_signal(signal.CTRL_BREAK_EVENT)  # type: ignore[attr-defined]
                else:
                    proc.send_signal(signal.SIGTERM)
            except ProcessLookupError:
                pass
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass


class DownloadManager:
    """Tracks all active and completed download jobs."""

    def __init__(self, music_dir: Path, audio_quality: str = "320k"):
        self.music_dir = music_dir
        self.audio_quality = audio_quality
        self._jobs: dict[str, DownloadJob] = {}

    def set_quality(self, quality: str) -> None:
        self.audio_quality = quality

    def get_job(self, job_id: str) -> DownloadJob | None:
        return self._jobs.get(job_id)

    async def start(self, spotify_url: str) -> str:
        """Kick off a yt-dlp download job. Returns job_id immediately."""
        url_stripped = spotify_url.strip()
        is_youtube = "youtube.com" in url_stripped or "youtu.be" in url_stripped
        is_youtube_playlist = is_youtube and ("list=" in url_stripped or "/playlist" in url_stripped)

        try:
            kind, _ = parse_spotify_url(url_stripped)
        except ValueError:
            kind = "playlist" if is_youtube_playlist else "track"

        job_id = str(uuid.uuid4())
        job = DownloadJob(job_id, spotify_url, kind)
        self._jobs[job_id] = job
        asyncio.create_task(self._run(job))
        return job_id

    def cancel(self, job_id: str) -> bool:
        job = self._jobs.get(job_id)
        if not job:
            return False
        job.request_cancel()
        return True

    async def _run(self, job: DownloadJob) -> None:
        try:
            await self._run_inner(job)
        except FileNotFoundError:
            await job.queue.put({
                "type": "error",
                "message": (
                    "yt-dlp is not installed in the current Python environment. "
                    "Install it with: pip install yt-dlp"
                ),
            })
        except Exception as exc:  # noqa: BLE001
            await job.queue.put({"type": "error", "message": f"Download failed: {exc}"})

    # -----------------------------------------------------------------------
    # Main download orchestration
    # -----------------------------------------------------------------------

    async def _run_inner(self, job: DownloadJob) -> None:
        from utils import is_valid_spotify_url
        is_spotify = is_valid_spotify_url(job.url)
        is_youtube = "youtube.com" in job.url or "youtu.be" in job.url

        if is_youtube:
            await job.queue.put({"type": "status", "status": "downloading"})
            tracks = await self._ytdlp_fallback(job)
            if len(tracks) == 0:
                await job.queue.put({"type": "error", "message": "Failed to download YouTube video/song."})
                return
            await job.queue.put({"type": "status", "status": "done"})
            await job.queue.put(
                {
                    "type": "done",
                    "tracks": tracks,
                    "total_tracks": 1,
                    "completed_tracks": len(tracks),
                }
            )
            return

        if not is_spotify:
            await job.queue.put({"type": "error", "message": "Unsupported URL. Provide a Spotify or YouTube link."})
            return

        await job.queue.put({"type": "status", "status": "downloading"})

        if job.kind in ("playlist", "album"):
            await job.queue.put({"type": "log", "message": f"Fetching tracks from Spotify {job.kind} embed..."})
            try:
                tracks_data = extract_tracks_from_spotify_playlist_or_album(job.url)
                job.total_tracks = len(tracks_data)
                await job.queue.put({
                    "type": "log",
                    "message": f"Found {len(tracks_data)} tracks in {job.kind}.",
                })
            except Exception as e:
                await job.queue.put({"type": "error", "message": f"Failed to retrieve tracks from Spotify {job.kind}: {e}"})
                return

            if not tracks_data:
                await job.queue.put({"type": "error", "message": f"No tracks found in the Spotify {job.kind}."})
                return

            tracks = await self._download_batch(job, tracks_data)
        else:
            job.total_tracks = 1
            await job.queue.put({"type": "log", "message": "Downloading track..."})
            tracks = await self._ytdlp_fallback(job)

        if len(tracks) == 0:
            error_msg = "No tracks were successfully downloaded."
            if job.failed_tracks:
                error_msg = job.failed_tracks[0]
            await job.queue.put({"type": "error", "message": error_msg})
            return

        await job.queue.put({"type": "status", "status": "done"})
        await job.queue.put(
            {
                "type": "done",
                "tracks": tracks,
                "total_tracks": job.total_tracks,
                "completed_tracks": len(tracks),
            }
        )

    # -----------------------------------------------------------------------
    # Playlist / album batch download
    # -----------------------------------------------------------------------

    async def _download_batch(
        self, job: DownloadJob, tracks_data: list[dict[str, str]]
    ) -> list[dict[str, Any]]:
        """Download multiple tracks extracted from a Spotify playlist or album.

        Each entry in *tracks_data* has ``query`` (``"Artist - Title"``) and
        ``spotify_url`` (for fetching cover art via oEmbed).
        """
        all_tracks: list[dict[str, Any]] = []

        for i, track_info in enumerate(tracks_data):
            if job.cancelled:
                break

            query = track_info.get("query", "")
            spotify_url = track_info.get("spotify_url", "")
            title, artist = _parse_query(query)

            await job.queue.put(
                {
                    "type": "progress",
                    "total_tracks": job.total_tracks,
                    "completed_tracks": i,
                    "percent": _percent(i, job.total_tracks),
                    "log": f"Downloading {i + 1}/{job.total_tracks}: {artist} - {title}",
                }
            )

            # Fetch thumbnail from oEmbed (best-effort)
            thumbnail_url = ""
            if spotify_url:
                try:
                    oembed = fetch_oembed_preview(spotify_url)
                    thumbnail_url = oembed.get("thumbnail_url", "")
                except Exception:
                    pass

            track_id = ""
            if "track/" in spotify_url:
                track_id = spotify_url.rsplit("/", 1)[-1]

            tracks = await self._ytdlp_download_track(
                job,
                title=title,
                artist=artist,
                thumbnail_url=thumbnail_url,
                track_id=track_id,
            )

            if tracks:
                all_tracks.extend(tracks)
                job.completed_tracks = len(all_tracks)
                await job.queue.put(
                    {
                        "type": "track_done",
                        "title": title,
                        "completed_tracks": len(all_tracks),
                        "total_tracks": job.total_tracks,
                        "percent": _percent(len(all_tracks), job.total_tracks),
                        "new_tracks": tracks,
                    }
                )
            else:
                job.failed_tracks.append(query)
                await job.queue.put(
                    {"type": "track_failed", "message": f"Failed to download: {query}"}
                )

        return all_tracks

    # -----------------------------------------------------------------------
    # yt-dlp single-track download (core logic)
    # -----------------------------------------------------------------------

    async def _ytdlp_download_track(
        self,
        job: DownloadJob,
        title: str,
        artist: str,
        thumbnail_url: str = "",
        track_id: str = "",
        album_name: str | None = None,
        search_term: str | None = None,
    ) -> list[dict[str, Any]]:
        """Download a single track via yt-dlp and write ID3 tags.

        If *search_term* is given it is used as-is (e.g. a YouTube URL).
        Otherwise ``ytsearch1:<title> <artist>`` is used.
        """
        if not title and not search_term:
            return []

        ytdlp_bin = _find_ytdlp_binary()
        if not ytdlp_bin:
            await job.queue.put({"type": "log", "message": "yt-dlp not found. Install with: pip install yt-dlp"})
            return []

        first_artist = artist.split(",")[0].strip() if artist else "Unknown Artist"
        safe_artist = _safe_name(first_artist)
        safe_title = _safe_name(title or "Unknown")

        # --- Resolve album name ---
        if not album_name:
            album_name = self._resolve_album_name(title, first_artist)

        safe_album = _safe_name(album_name)

        out_dir = self.music_dir / safe_artist / safe_album
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{safe_title}.%(ext)s"

        # --- Build search term ---
        if not search_term:
            q = f"{title} {artist}".strip() if artist else title
            search_term = f"ytsearch1:{q}"

        # --- Build command ---
        bitrate_kbps = self.audio_quality.replace("k", "")

        cmd = [
            ytdlp_bin,
            "--no-playlist",
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", f"{bitrate_kbps}K",
            "--output", str(out_path),
            "--no-progress",
            "--quiet",
            "--print", "after_move:filepath",
            search_term,
        ]

        env = {**os.environ, "PYTHONUNBUFFERED": "1"}

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )
            job.proc = proc

            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(), timeout=180
            )
            rc = proc.returncode
        except asyncio.TimeoutError:
            await job.queue.put({"type": "log", "message": f"yt-dlp timed out for '{title}'"})
            return []
        except Exception as exc:
            await job.queue.put({"type": "log", "message": f"yt-dlp error for '{title}': {exc}"})
            return []

        if rc != 0:
            err = stderr_bytes.decode("utf-8", errors="replace").strip()
            await job.queue.put({
                "type": "log",
                "message": f"yt-dlp failed for '{title}' (exit {rc}): {err[:200]}",
            })
            return []

        # --- Locate downloaded file ---
        downloaded_path_str = stdout_bytes.decode("utf-8", errors="replace").strip()
        final_lines = [l.strip() for l in downloaded_path_str.splitlines() if l.strip()]
        downloaded_files: list[Path] = []

        for line in final_lines:
            candidate = Path(line)
            if candidate.exists() and candidate.is_file():
                downloaded_files.append(candidate)

        if not downloaded_files:
            fallback_start = time.time()
            for p in sorted(out_dir.rglob("*.mp3"), key=lambda x: x.stat().st_mtime, reverse=True):
                if p.stat().st_mtime >= fallback_start - 5:
                    downloaded_files.append(p)
                    break

        if not downloaded_files:
            await job.queue.put({
                "type": "log",
                "message": f"yt-dlp: could not locate downloaded file for '{title}'",
            })
            return []

        # --- Tag and read metadata ---
        results: list[dict[str, Any]] = []
        for f in downloaded_files:
            try:
                await self._tag_fallback_file(f, title, artist, album_name, thumbnail_url, track_id)

                track_meta = read_tags(str(f))
                track_meta["file_path"] = str(f.relative_to(self.music_dir))
                track_meta["absolute_path"] = str(f)
                track_meta["size_bytes"] = f.stat().st_size
                results.append(track_meta)
            except Exception as exc:
                print(f"[spotlocal] Failed to tag/read track {f}: {exc}", file=sys.stderr)

        return results

    # -----------------------------------------------------------------------
    # yt-dlp fallback for YouTube URLs / single Spotify tracks
    # -----------------------------------------------------------------------

    async def _ytdlp_fallback(self, job: DownloadJob) -> list[dict[str, Any]]:
        """Download a single track via yt-dlp.

        For YouTube URLs the URL is passed directly to yt-dlp.
        For Spotify URLs the oEmbed metadata is fetched first.
        """
        is_yt_direct = "youtube.com" in job.url or "youtu.be" in job.url

        if is_yt_direct:
            # YouTube URL — pass directly
            return await self._ytdlp_download_track(
                job,
                title="YouTube Video",
                artist="",
                search_term=job.url,
            )

        # Spotify URL — fetch oEmbed metadata, then search YouTube
        try:
            meta = fetch_oembed_preview(job.url)
        except Exception:
            meta = {}

        title = meta.get("title", "")
        artist = meta.get("artist", "")
        thumbnail = meta.get("thumbnail_url", "")

        try:
            _, track_id = parse_spotify_url(job.url)
        except ValueError:
            track_id = ""

        if not title:
            return []

        await job.queue.put({
            "type": "log",
            "message": f"Searching YouTube for '{title} {artist}'" if artist else f"Searching YouTube for '{title}'",
        })

        return await self._ytdlp_download_track(
            job,
            title=title,
            artist=artist,
            thumbnail_url=thumbnail,
            track_id=track_id,
        )

    # -----------------------------------------------------------------------
    # Album name resolution
    # -----------------------------------------------------------------------

    def _resolve_album_name(self, title: str, artist: str) -> str:
        """Try to resolve the album name via iTunes or existing folders."""
        search_q = f"{title} {artist}".strip()
        try:
            import httpx
            r = httpx.get(
                "https://itunes.apple.com/search",
                params={"term": search_q, "limit": 1, "entity": "song"},
                timeout=5.0,
            )
            if r.status_code == 200:
                results = r.json().get("results", [])
                if results:
                    name = results[0].get("collectionName")
                    if name:
                        return name
        except Exception as exc:
            print(f"[spotlocal] iTunes metadata lookup failed: {exc}", file=sys.stderr)

        # Fall back to existing folder on disk
        safe_artist = _safe_name(artist)
        artist_dir = self.music_dir / safe_artist
        if artist_dir.exists() and artist_dir.is_dir():
            subdirs = [
                d.name
                for d in artist_dir.iterdir()
                if d.is_dir() and d.name != "Unknown Album"
            ]
            if len(subdirs) == 1:
                return subdirs[0]
        return "Unknown Album"

    # -----------------------------------------------------------------------
    # ID3 tagging
    # -----------------------------------------------------------------------

    async def _tag_fallback_file(
        self,
        file_path: Path,
        title: str,
        artist: str,
        album: str | None,
        thumbnail_url: str,
        spotify_id: str,
    ) -> None:
        """Write ID3 tags (title, artist, album, cover art) to a file downloaded via yt-dlp."""
        try:
            from mutagen.id3 import ID3, TIT2, TPE1, TALB, APIC, COMM  # type: ignore
            import httpx

            try:
                tags = ID3(str(file_path))
            except Exception:
                tags = ID3()

            tags["TIT2"] = TIT2(encoding=3, text=title)
            if artist:
                tags["TPE1"] = TPE1(encoding=3, text=artist)
            if album:
                tags["TALB"] = TALB(encoding=3, text=album)
            elif title:
                tags["TALB"] = TALB(encoding=3, text=title)
            if spotify_id:
                tags["COMM:SPOTIFY_ID:eng"] = COMM(
                    encoding=3, lang="eng", desc="SPOTIFY_ID", text=spotify_id
                )

            if thumbnail_url:
                try:
                    r = httpx.get(thumbnail_url, timeout=8.0, follow_redirects=True)
                    if r.status_code == 200:
                        mime = r.headers.get("content-type", "image/jpeg").split(";")[0]
                        tags["APIC:"] = APIC(
                            encoding=3,
                            mime=mime,
                            type=3,
                            desc="Cover",
                            data=r.content,
                        )
                except Exception:
                    pass

            tags.save(str(file_path), v2_version=3)
        except Exception as exc:
            print(f"[spotlocal] Tagging failed for {file_path}: {exc}", file=sys.stderr)

    # -----------------------------------------------------------------------
    # SSE stream
    # -----------------------------------------------------------------------

    async def stream(self, job_id: str) -> AsyncGenerator[dict[str, Any], None]:
        """Yield SSE-style events for the given job_id until terminal event."""
        job = self._jobs.get(job_id)
        if not job:
            yield {"type": "error", "message": "Job not found"}
            return
        while True:
            event = await job.queue.get()
            yield event
            if event.get("type") in ("done", "error"):
                break


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _percent(completed: int, total: int) -> int:
    if total <= 0:
        return 0
    return min(100, int((completed / total) * 100))


def _find_ytdlp_binary() -> str | None:
    """Find the yt-dlp binary, checking common locations.

    GUI apps (Electron) may not inherit the user's shell PATH, so we also
    check the Python scripts directory and common install locations.
    """
    found = shutil.which("yt-dlp")
    if found:
        return found

    python_dir = Path(sys.executable).parent
    candidate = python_dir / "yt-dlp"
    if candidate.is_file():
        return str(candidate)

    if sys.platform == "darwin":
        for ver in ("3.14", "3.13", "3.12", "3.11"):
            p = Path(f"/Library/Frameworks/Python.framework/Versions/{ver}/bin/yt-dlp")
            if p.is_file():
                return str(p)

    if sys.platform == "win32":
        for ver in ("3.14", "3.13", "3.12", "3.11"):
            p = Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Python" / f"Python{ver.replace('.', '')}" / "Scripts" / "yt-dlp.exe"
            if p.is_file():
                return str(p)

    return None


def _safe_name(name: str) -> str:
    """Sanitize a string for use as a filesystem path component."""
    import unicodedata
    name = unicodedata.normalize("NFKD", name)
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", name)
    name = re.sub(r"\s+", " ", name).strip(". ")
    return name or "Unknown"


def _parse_query(query: str) -> tuple[str, str]:
    """Parse an ``"Artist - Title"`` query into (title, artist)."""
    parts = re.split(r'\s*[-–]\s*', query, maxsplit=1)
    if len(parts) == 2:
        return parts[1].strip(), parts[0].strip()
    return query.strip(), ""


def parse_title_artist_from_filename(filename: str) -> tuple[str, str]:
    """Parse title and artist from filename: "Artist - Title.mp3"."""
    name = Path(filename).stem
    parts = re.split(r'\s*[-–]\s*', name, maxsplit=1)
    if len(parts) == 2:
        return parts[1].strip(), parts[0].strip()
    return name.strip(), "Unknown Artist"


def extract_tracks_from_spotify_playlist_or_album(url: str) -> list[dict[str, str]]:
    """Scrape track metadata from the Spotify playlist or album embed page.

    Returns a list of dicts with keys ``query`` (``"Artist - Title"``) and
    ``spotify_url`` (full ``open.spotify.com/track/...`` URL for oEmbed lookups).
    """
    import httpx

    m = re.search(r"(playlist|album)/([A-Za-z0-9]+)", url)
    if not m:
        m = re.search(r"spotify:(playlist|album):([A-Za-z0-9]+)", url)
    if not m:
        raise ValueError(f"Could not parse Spotify playlist/album ID from URL: {url}")

    kind = m.group(1)
    entity_id = m.group(2)
    embed_url = f"https://open.spotify.com/embed/{kind}/{entity_id}"

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }
    r = httpx.get(embed_url, headers=headers, timeout=15.0)
    r.raise_for_status()

    next_data_match = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
        r.text,
        re.DOTALL,
    )
    if not next_data_match:
        raise ValueError("Could not find __NEXT_DATA__ JSON in Spotify embed page HTML")

    data = json.loads(next_data_match.group(1))
    props = data.get("props", {})
    page_props = props.get("pageProps", {})
    state = page_props.get("state", {})
    state_data = state.get("data", {})
    entity = state_data.get("entity", {})

    track_list = entity.get("trackList", [])
    if not track_list:
        if page_props.get("status") == 404:
            raise ValueError(f"Spotify returned 404: {page_props.get('title', 'Page not found')}")
        raise ValueError("No tracks found in the Spotify embed trackList")

    tracks: list[dict[str, str]] = []
    for track in track_list:
        title = track.get("title", "")
        artist = track.get("subtitle", "")
        uri = track.get("uri", "")

        query = f"{artist} - {title}" if title and artist else title

        # Build a Spotify URL from the URI so oEmbed can fetch thumbnails
        spotify_url = ""
        if uri.startswith("spotify:track:"):
            track_id = uri.split(":")[-1]
            spotify_url = f"https://open.spotify.com/track/{track_id}"

        tracks.append({"query": query, "spotify_url": spotify_url})

    return tracks
