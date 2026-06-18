import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { useDownloadStore } from '../../store/useDownloadStore';
import { DownloadItem } from './DownloadItem';

export const DownloadPanel: React.FC = () => {
  const jobs = useDownloadStore((s) => s.jobs);
  const togglePanel = useDownloadStore((s) => s.togglePanel);
  const clearCompleted = useDownloadStore((s) => s.clearCompleted);

  const activeCount = jobs.filter(
    (j) => j.status === 'downloading' || j.status === 'fetching'
  ).length;

  return (
    <div
      className="absolute right-6 top-[calc(var(--topbar-h)+8px)] z-40 w-[200px] bg-elevated border border-border rounded-lg shadow-2xl flex flex-col"
      style={{ maxHeight: 400 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">Downloads</span>
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-green text-white text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearCompleted}
            className="p-1 rounded text-text3 hover:text-text1 hover:bg-surface-h transition-colors"
            title="Clear completed"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={togglePanel}
            className="p-1 rounded text-text3 hover:text-text1 hover:bg-surface-h transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Job list */}
      <div className="overflow-y-auto flex-1">
        {jobs.length === 0 ? (
          <div className="px-4 py-8 text-center text-text3 text-xs">
            No downloads yet. Paste a Spotify link to get started.
          </div>
        ) : (
          jobs.map((job) => <DownloadItem key={job.id} job={job} />)
        )}
      </div>
    </div>
  );
};
