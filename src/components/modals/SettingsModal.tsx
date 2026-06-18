import React, { useEffect, useState } from 'react';
import { X, Folder, RefreshCw } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import type { AudioQuality } from '../../types';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const settings = useSettingsStore((s) => s.settings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);
  const syncToSpotify = useSettingsStore((s) => s.syncToSpotify);
  const tracks = useLibraryStore((s) => s.tracks);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const totalSize = tracks.reduce((sum, t) => sum + (t.size_bytes ?? 0), 0);
  const sizeLabel = formatBytes(totalSize);

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = (await window.spotlocal.syncAllNow()) as { synced: number };
      setSyncResult(result.synced);
    } catch (err) {
      console.error('sync failed', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-elevated rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-text3 hover:text-text1 hover:bg-surface-h transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-8">
          {/* Storage */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-text3 mb-3">Storage</h3>
            <div className="bg-surface rounded p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Folder size={20} className="text-text3" />
                <div>
                  <div className="text-sm text-text1">{settings.musicDir || '—'}</div>
                  <div className="text-xs text-text3">
                    {tracks.length} tracks · {sizeLabel}
                  </div>
                </div>
              </div>
              <button
                onClick={() => void window.spotlocal.openFolder(settings.musicDir)}
                className="px-3 py-1.5 rounded-full text-xs font-bold border border-text4 text-text2 hover:border-text2 hover:text-text1 transition-colors"
              >
                Open folder
              </button>
            </div>
          </section>

          {/* Audio quality */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-text3 mb-3">Audio quality</h3>
            <div className="space-y-2">
              {(['128k', '256k', '320k'] as AudioQuality[]).map((q) => (
                <label
                  key={q}
                  className="flex items-center gap-3 p-2 rounded hover:bg-surface/60 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="quality"
                    checked={settings.audioQuality === q}
                    onChange={() => void saveSettings({ audioQuality: q })}
                    className="accent-[var(--color-green)]"
                  />
                  <span className="text-sm text-text1">
                    {q === '320k'
                      ? 'High (320 kbps MP3)'
                      : q === '256k'
                        ? 'Medium (256 kbps MP3)'
                        : 'Standard (128 kbps MP3)'}
                  </span>
                </label>
              ))}
              <p className="text-xs text-text3 mt-1">
                Applies to new downloads only.
              </p>
            </div>
          </section>

          {/* Spotify integration */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-text3 mb-3">
              Spotify integration
            </h3>
            <label className="flex items-center justify-between p-3 rounded hover:bg-surface/60 cursor-pointer transition-colors">
              <div>
                <div className="text-sm text-text1">Sync downloads to Spotify Local Files</div>
                <div className="text-xs text-text3">
                  Copy downloaded songs into Spotify's local files folder so they appear in the Spotify app.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.syncToSpotify}
                onChange={(e) => void syncToSpotify(e.target.checked)}
                className="w-5 h-5 accent-[var(--color-green)]"
              />
            </label>

            {settings.syncToSpotify && (
              <div className="mt-3 ml-3">
                <div className="bg-surface rounded p-3 mb-2">
                  <div className="text-xs text-text3 mb-1">Local files folder</div>
                  <div className="text-sm text-text1 font-mono break-all">
                    {settings.spotifyLocalFilesPath}
                  </div>
                </div>
                <p className="text-xs text-yellow-500/80 mb-3">
                  ⚠ Requires restarting the Spotify app to see new songs.
                </p>
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-green text-white text-sm font-bold hover:bg-green-h disabled:opacity-50 transition-colors"
                >
                  {syncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  {syncing ? 'Syncing…' : 'Sync now'}
                </button>
                {syncResult !== null && (
                  <p className="text-xs text-green mt-2">
                    Synced {syncResult} tracks to Spotify.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* System */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-text3 mb-3">System</h3>
            <label className="flex items-center justify-between p-3 rounded hover:bg-surface/60 cursor-pointer transition-colors">
              <span className="text-sm text-text1">Close to tray</span>
              <input
                type="checkbox"
                checked={settings.closeToTray}
                onChange={(e) => void saveSettings({ closeToTray: e.target.checked })}
                className="w-5 h-5 accent-[var(--color-green)]"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded hover:bg-surface/60 cursor-pointer transition-colors">
              <span className="text-sm text-text1">Hardware acceleration</span>
              <input
                type="checkbox"
                checked={settings.hwAcceleration}
                onChange={(e) => void saveSettings({ hwAcceleration: e.target.checked })}
                className="w-5 h-5 accent-[var(--color-green)]"
              />
            </label>
          </section>
        </div>
      </div>
    </div>
  );
};

function formatBytes(bytes: number): string {
  if (!bytes) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let val = bytes;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val.toFixed(1)} ${units[idx]}`;
}
