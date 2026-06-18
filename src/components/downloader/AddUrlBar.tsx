import React, { useState, useCallback, useRef } from 'react';
import { Link as LinkIcon, Check, AlertCircle } from 'lucide-react';
import { useDownloadStore } from '../../store/useDownloadStore';

const SPOTIFY_URL_RE =
  /^https?:\/\/(open\.spotify\.com|spotify\.link)\/(intl-[a-z]{2}\/)?(track|album|playlist)\/[A-Za-z0-9]+/i;

interface AddUrlBarProps {
  /** Render as a large onboarding card instead of a compact banner. */
  expanded?: boolean;
}

export const AddUrlBar: React.FC<AddUrlBarProps> = ({ expanded = false }) => {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'valid' | 'invalid' | 'success'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const addUrl = useDownloadStore((s) => s.addUrl);
  const togglePanel = useDownloadStore((s) => s.togglePanel);

  const validate = useCallback((value: string) => {
    if (!value.trim()) return 'idle' as const;
    return SPOTIFY_URL_RE.test(value.trim()) ? ('valid' as const) : ('invalid' as const);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    setStatus(validate(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'valid') return;
    await addUrl(url.trim());
    setStatus('success');
    setUrl('');
    togglePanel();
    setTimeout(() => setStatus('idle'), 2000);
  };

  // Detect Spotify URL in clipboard on focus
  const handleFocus = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && SPOTIFY_URL_RE.test(text.trim()) && !url) {
        setUrl(text.trim());
        setStatus('valid');
        inputRef.current?.classList.add('animate-pulse');
        setTimeout(() => inputRef.current?.classList.remove('animate-pulse'), 800);
      }
    } catch {
      // Clipboard read may be blocked — that's fine
    }
  };

  const borderClass =
    status === 'valid'
      ? 'border-green'
      : status === 'invalid'
        ? 'border-red-500'
        : status === 'success'
          ? 'border-green'
          : 'border-transparent';

  if (expanded) {
    return (
      <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-full bg-input border-2 transition-colors ${borderClass}`}
        >
          <LinkIcon size={18} className="text-text3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={handleChange}
            onFocus={handleFocus}
            placeholder="Paste a Spotify track, album, or playlist link"
            className="flex-1 bg-transparent text-sm text-text1 placeholder:text-text3 outline-none min-w-0"
          />
          {status === 'valid' && <Check size={18} className="text-green shrink-0" />}
          {status === 'invalid' && <AlertCircle size={18} className="text-red-500 shrink-0" />}
          <button
            type="submit"
            disabled={status !== 'valid'}
            className="px-5 py-1.5 rounded-full bg-green text-white text-sm font-bold hover:bg-green-h disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            Add
          </button>
        </div>
        {status === 'invalid' && (
          <p className="text-xs text-red-500 mt-2 text-center">
            Only Spotify links are supported (track, album, or playlist URLs).
          </p>
        )}
        {status === 'success' && (
          <p className="text-xs text-green mt-2 text-center">
            Added to downloads. Music will appear in your library shortly.
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="px-6 py-2">
      <form onSubmit={handleSubmit}>
        <div
          className={`flex items-center gap-3 px-4 py-2 rounded-full bg-input border-2 transition-colors ${borderClass}`}
          style={{ maxWidth: 640 }}
        >
          <LinkIcon size={16} className="text-text3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={handleChange}
            onFocus={handleFocus}
            placeholder="Paste a Spotify link to download…"
            className="flex-1 bg-transparent text-sm text-text1 placeholder:text-text3 outline-none min-w-0"
          />
          {status === 'valid' && <Check size={16} className="text-green shrink-0" />}
          {status === 'invalid' && <AlertCircle size={16} className="text-red-500 shrink-0" />}
          <button
            type="submit"
            disabled={status !== 'valid'}
            className="px-4 py-1 rounded-full bg-green text-white text-xs font-bold hover:bg-green-h disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            Add
          </button>
        </div>
      </form>
      {status === 'invalid' && (
        <p className="text-xs text-red-500 mt-1 ml-4">Only Spotify links are supported.</p>
      )}
    </div>
  );
};
