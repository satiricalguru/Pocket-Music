import React from 'react';
import { Download, Trash2, CheckCircle2, AlertCircle, Loader2, X, ListMusic } from 'lucide-react';
import { useDownloadStore } from '../../store/useDownloadStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { AddUrlBar } from '../downloader/AddUrlBar';

export const DownloadsView: React.FC = () => {
  const jobs = useDownloadStore((s) => s.jobs);
  const clearCompleted = useDownloadStore((s) => s.clearCompleted);
  const cancelJob = useDownloadStore((s) => s.cancelJob);
  const dismissJob = useDownloadStore((s) => s.dismissJob);
  const setActiveView = useLibraryStore((s) => s.setActiveView);

  const activeJobs = jobs.filter(
    (j) => j.status === 'downloading' || j.status === 'fetching'
  );

  return (
    <div className="fade-in px-6 py-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-green text-white">
            <Download size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Downloads</h1>
            <p className="text-sm text-text3 mt-0.5">
              {activeJobs.length > 0
                ? `Downloading ${activeJobs.length} item${activeJobs.length > 1 ? 's' : ''}…`
                : 'All downloads finished'}
            </p>
          </div>
        </div>

        {jobs.some((j) => j.status === 'done' || j.status === 'failed' || j.status === 'cancelled') && (
          <button
            onClick={clearCompleted}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-text2 hover:text-text1 hover:border-text1 hover:bg-surface-h text-sm font-semibold transition-all"
            title="Clear completed downloads"
          >
            <Trash2 size={16} />
            <span>Clear Completed</span>
          </button>
        )}
      </div>

      {/* Input bar */}
      <div className="bg-surface rounded-xl p-6 border border-border shadow-md">
        <h2 className="text-lg font-bold mb-3">Download New Tracks</h2>
        <AddUrlBar expanded />
      </div>

      {/* Downloads List */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold px-2">Download Queue</h2>
        {jobs.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-xl border border-dashed border-border text-text3 text-sm">
            No active downloads. Paste a Spotify track, album, or playlist link to start downloading.
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border overflow-hidden divide-y divide-border">
            {jobs.map((job) => {
              const isActive = job.status === 'downloading' || job.status === 'fetching';
              return (
                <div key={job.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors group">
                  {/* Image/Thumbnail */}
                  <div className="w-16 h-16 rounded overflow-hidden bg-black/40 flex items-center justify-center shrink-0 border border-border">
                    {job.preview?.thumbnail_url ? (
                      <img
                        src={job.preview.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <Loader2 size={24} className="text-text3 animate-spin" />
                    )}
                  </div>

                  {/* Metadata & Progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-text1 truncate flex-1">
                        {job.preview?.title ?? job.url}
                      </span>
                      {job.status === 'done' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5 text-green text-sm font-semibold">
                            <CheckCircle2 size={16} />
                            <span>Finished</span>
                          </div>
                          {job.createdPlaylistId && (
                            <button
                              onClick={() => setActiveView(`playlist-${job.createdPlaylistId}`)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green/20 text-green text-xs font-semibold hover:bg-green/30 transition-colors"
                              title="Open this playlist in your library"
                            >
                              <ListMusic size={12} />
                              Go to Playlist
                            </button>
                          )}
                        </div>
                      )}
                      {job.status === 'failed' && (
                        <div className="flex items-center gap-1.5 text-red-500 text-sm font-semibold shrink-0">
                          <AlertCircle size={16} />
                          <span>Failed</span>
                        </div>
                      )}
                      {isActive && (
                        <button
                          onClick={() => void cancelJob(job.id)}
                          className="p-1 rounded-full text-text3 hover:text-text1 hover:bg-surface-h transition-colors shrink-0"
                          title="Cancel Download"
                        >
                          <X size={18} />
                        </button>
                      )}
                      {(job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') && (
                        <button
                          onClick={() => dismissJob(job.id)}
                          className="p-1 rounded-full text-text3 hover:text-text1 hover:bg-surface-h opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="Clear from list"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>

                    {job.preview?.artist && (
                      <div className="text-sm text-text2 truncate mt-0.5">{job.preview.artist}</div>
                    )}

                    {/* Progress Bar */}
                    {isActive && (
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full overflow-hidden bg-black/40 relative">
                          {job.percent > 0 ? (
                            <div
                              className="h-full rounded-full bg-green transition-all duration-300"
                              style={{ width: `${job.percent}%` }}
                            />
                          ) : (
                            /* Indeterminate shimmer while waiting for first progress event */
                            <div className="absolute inset-0 bg-green/30 rounded-full overflow-hidden">
                              <div className="h-full w-1/3 bg-green rounded-full animate-indeterminate" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-text2 font-bold tabular-nums min-w-[36px] text-right">
                          {job.percent}%
                        </span>
                      </div>
                    )}

                    {isActive && (
                      <div className="mt-1 text-xs text-text3">
                        {job.status === 'fetching'
                          ? 'Fetching track details…'
                          : job.totalTracks > 0
                            ? `Downloading tracks (${job.completedTracks} of ${job.totalTracks}) · ${job.percent}%`
                            : job.percent > 0
                              ? `${job.percent}%`
                              : 'Processing download…'}
                      </div>
                    )}

                    {job.status === 'failed' && job.errorMessage && (
                      <div className="mt-1 text-xs text-red-500 font-medium">{job.errorMessage}</div>
                    )}
                    {job.status === 'cancelled' && (
                      <div className="mt-1 text-xs text-text3 font-medium">Cancelled</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
