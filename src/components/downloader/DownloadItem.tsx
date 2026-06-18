import React from 'react';
import { CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { useDownloadStore, type DownloadJob } from '../../store/useDownloadStore';

interface DownloadItemProps {
  job: DownloadJob;
}

export const DownloadItem: React.FC<DownloadItemProps> = ({ job }) => {
  const cancelJob = useDownloadStore((s) => s.cancelJob);
  const dismissJob = useDownloadStore((s) => s.dismissJob);

  const isActive = job.status === 'downloading' || job.status === 'fetching';

  return (
    <div className="px-4 py-3 border-b border-border/50 hover:bg-surface/40 transition-colors group">
      <div className="flex items-start gap-2">
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded shrink-0 overflow-hidden bg-surface flex items-center justify-center">
          {job.preview?.thumbnail_url ? (
            <img
              src={job.preview.thumbnail_url}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <Loader2 size={16} className="text-text3 animate-spin" />
          )}
        </div>

        {/* Info + progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text1 truncate flex-1">
              {job.preview?.title ?? job.url}
            </span>
            {/* Status icon */}
            {job.status === 'done' && <CheckCircle2 size={14} className="text-green shrink-0" />}
            {job.status === 'failed' && <AlertCircle size={14} className="text-red-500 shrink-0" />}
            {isActive && (
              <button
                onClick={() => void cancelJob(job.id)}
                className="text-text3 hover:text-text1 shrink-0"
                title="Cancel"
              >
                <X size={14} />
              </button>
            )}
            {(job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') && (
              <button
                onClick={() => dismissJob(job.id)}
                className="text-text3 hover:text-text1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {job.preview?.artist && (
            <div className="text-[10px] text-text3 truncate">{job.preview.artist}</div>
          )}

          {/* Progress bar */}
          {isActive && (
            <>
              <div className="mt-1.5 h-1 rounded-full overflow-hidden bg-surface relative">
                {job.percent > 0 ? (
                  <div
                    className="h-full rounded-full bg-green transition-all duration-500 ease-out"
                    style={{ width: `${job.percent}%` }}
                  />
                ) : (
                  /* Indeterminate shimmer while waiting for first progress event */
                  <div className="absolute inset-0 bg-green/30 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-green rounded-full animate-indeterminate" />
                  </div>
                )}
              </div>
              <div className="mt-1 text-[10px] text-text3 tabular-nums">
                {job.status === 'fetching'
                  ? 'Fetching metadata…'
                  : job.totalTracks > 0
                    ? `${job.completedTracks} / ${job.totalTracks} tracks · ${job.percent}%`
                    : job.percent > 0
                      ? `${job.percent}%`
                      : 'Starting download…'}
              </div>
            </>
          )}

          {job.status === 'failed' && job.errorMessage && (
            <div className="mt-1 text-[10px] text-red-500 truncate">{job.errorMessage}</div>
          )}
          {job.status === 'cancelled' && (
            <div className="mt-1 text-[10px] text-text3">Cancelled</div>
          )}
        </div>
      </div>
    </div>
  );
};
