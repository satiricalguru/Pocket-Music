import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { DownloadPreview, DownloadEvent } from '../types';
import { useLibraryStore } from './useLibraryStore';

export type JobStatus = 'queued' | 'fetching' | 'downloading' | 'done' | 'failed' | 'cancelled';

export interface DownloadJob {
  id: string;
  url: string;
  type: 'track' | 'album' | 'playlist';
  status: JobStatus;
  preview: DownloadPreview | null;
  percent: number;
  totalTracks: number;
  completedTracks: number;
  failedTracks: string[];
  startedAt: number;
  errorMessage?: string;
  createdPlaylistId?: string;
}

interface DownloadState {
  jobs: DownloadJob[];
  isPanelOpen: boolean;

  addUrl: (url: string) => Promise<void>;
  cancelJob: (id: string) => Promise<void>;
  dismissJob: (id: string) => void;
  clearCompleted: () => void;
  togglePanel: () => void;
  handleEvent: (event: DownloadEvent, jobId: string) => void;
  _refreshLibrary: () => Promise<void>;
  _refreshLibraryAndNavigate: (playlistId?: string) => Promise<void>;
}

let eventListenerAttached = false;

export const useDownloadStore = create<DownloadState>()(
  immer((set, get) => ({
    jobs: [],
    isPanelOpen: false,

    addUrl: async (url) => {
      const jobId = `pending-${Date.now()}`;
      const isTrack = !url.includes('/playlist/') && !url.includes('/album/') && !url.includes('spotify:playlist:') && !url.includes('spotify:album:');

      // Add placeholder job immediately
      set((s) => {
        s.jobs.unshift({
          id: jobId,
          url,
          type: isTrack ? 'track' : 'playlist',
          status: 'fetching',
          preview: null,
          percent: 0,
          totalTracks: isTrack ? 1 : 0,
          completedTracks: 0,
          failedTracks: [],
          startedAt: Date.now(),
        });
      });

      try {
        // Fetch preview
        let preview: DownloadPreview | null = null;
        try {
          preview = (await window.spotlocal.previewUrl(url)) as DownloadPreview;
        } catch (err) {
          console.warn('[download] preview failed:', err);
        }

        set((s) => {
          const job = s.jobs.find((j) => j.id === jobId);
          if (job) {
            job.preview = preview;
          }
        });

        // Start download via backend — pass playlist name so Electron can name the auto-created playlist
        const playlistName = !isTrack ? (preview?.title ?? '') : undefined;
        const startResult = (await window.spotlocal.startDownload(url, playlistName)) as {
          job_id: string;
          type: string;
          playlist_id?: string;
        };

        set((s) => {
          const job = s.jobs.find((j) => j.id === jobId);
          if (job) {
            job.id = startResult.job_id;
            job.type = startResult.type as DownloadJob['type'];
            job.status = 'downloading';
            if (startResult.playlist_id) {
              job.createdPlaylistId = startResult.playlist_id;
            }
          }
        });

        if (startResult.playlist_id) {
          void get()._refreshLibrary();
        }

        // Attach global SSE listener once
        if (!eventListenerAttached) {
          eventListenerAttached = true;
          window.spotlocal.onDownloadEvent((data: unknown) => {
            const evt = data as DownloadEvent & { jobId?: string };
            const targetJobId = evt.jobId;
            if (targetJobId) {
              get().handleEvent(evt, targetJobId);
            } else {
              // Fallback to the first active job
              const jobs = get().jobs;
              const activeJob = jobs.find(
                (j) =>
                  j.status === 'downloading' || j.status === 'fetching'
              );
              if (activeJob) {
                get().handleEvent(evt, activeJob.id);
              }
            }
          });
        }

        // Start observing the SSE events AFTER the store has updated the job ID!
        await window.spotlocal.observeDownload(startResult.job_id);
      } catch (err) {
        set((s) => {
          const job = s.jobs.find((j) => j.id === jobId);
          if (job) {
            job.status = 'failed';
            job.errorMessage = err instanceof Error ? err.message : String(err);
          }
        });
      }
    },

    cancelJob: async (id) => {
      try {
        await window.spotlocal.cancelDownload(id);
      } catch {
        // best effort
      }
      set((s) => {
        const job = s.jobs.find((j) => j.id === id);
        if (job) {
          job.status = 'cancelled';
        }
      });
    },

    dismissJob: (id) =>
      set((s) => {
        s.jobs = s.jobs.filter((j) => j.id !== id);
      }),

    clearCompleted: () =>
      set((s) => {
        s.jobs = s.jobs.filter(
          (j) => j.status !== 'done' && j.status !== 'failed' && j.status !== 'cancelled'
        );
      }),

    togglePanel: () =>
      set((s) => {
        s.isPanelOpen = !s.isPanelOpen;
      }),

    handleEvent: (event, jobId) =>
      set((s) => {
        const job = s.jobs.find((j) => j.id === jobId);
        if (!job) return;

        switch (event.type) {
          case 'progress':
            job.totalTracks = event.total_tracks;
            job.completedTracks = event.completed_tracks;
            job.percent = event.percent;
            job.status = 'downloading';
            break;
          case 'track_done':
            job.completedTracks = event.completed_tracks;
            job.totalTracks = event.total_tracks;
            // Ensure progress bar fills as each track completes
            if (job.totalTracks > 0) {
              job.percent = Math.round((event.completed_tracks / event.total_tracks) * 100);
            }
            if (event.playlist_id) {
              job.createdPlaylistId = event.playlist_id;
            }
            // Trigger library refresh live so tracks populate the UI as they complete
            void useDownloadStore.getState()._refreshLibrary();
            break;
          case 'track_failed':
            job.failedTracks.push(event.message);
            break;
          case 'status':
            if (event.status === 'done') {
              job.status = 'done';
              job.percent = 100;
              // Trigger library refresh
              void useDownloadStore.getState()._refreshLibrary();
            }
            break;
          case 'error':
            job.status = 'failed';
            job.errorMessage = event.message;
            break;
          case 'done':
            job.status = 'done';
            job.percent = 100;
            job.completedTracks = event.completed_tracks ?? job.completedTracks;
            job.totalTracks = event.total_tracks ?? job.totalTracks;
            if (event.playlist_id) {
              job.createdPlaylistId = event.playlist_id;
            }
            void useDownloadStore.getState()._refreshLibraryAndNavigate(event.playlist_id);
            break;
        }
      }),

    // Internal method to refresh library after downloads complete
    _refreshLibrary: async () => {
      try {
        void useLibraryStore.getState().loadLibrary();
      } catch {
        // best-effort refresh
      }
    },

    // Refresh library + optionally navigate to a newly created playlist
    _refreshLibraryAndNavigate: async (playlistId?: string) => {
      try {
        await useLibraryStore.getState().loadLibrary();
        if (playlistId) {
          // Small delay to ensure sidebar re-renders with the new playlist
          setTimeout(() => {
            useLibraryStore.getState().setActiveView(`playlist-${playlistId}`);
          }, 300);
        }
      } catch {
        // best-effort
      }
    },
  }))
);
