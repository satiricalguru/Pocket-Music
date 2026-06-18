import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FfmpegMissingModalProps {
  message?: string;
  onClose?: () => void;
}

export const FfmpegMissingModal: React.FC<FfmpegMissingModalProps> = ({
  message,
  onClose,
}) => {
  const platform = window.spotlocal.getPlatform();
  const installCmd = platform === 'win32'
    ? 'winget install ffmpeg'
    : 'brew install ffmpeg';
  const installAlt = platform === 'win32'
    ? 'https://ffmpeg.org/download.html'
    : 'https://ffmpeg.org/download.html';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" />
      <div className="relative bg-elevated rounded-lg shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
            <AlertCircle size={24} className="text-yellow-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-1">ffmpeg is not installed</h2>
            <p className="text-sm text-text2">
              Pocket Music uses ffmpeg to encode downloaded audio. Without it, downloads will fail.
            </p>
          </div>
        </div>

        <div className="bg-black/40 rounded p-3 mb-4 font-mono text-sm text-green">
          <span className="text-text3">$</span> {installCmd}
        </div>

        <a
          href={installAlt}
          onClick={(e) => {
            e.preventDefault();
            void window.spotlocal.openExternal(installAlt);
          }}
          className="text-sm text-green hover:underline block mb-4"
        >
          Or download manually from ffmpeg.org →
        </a>

        {message && <p className="text-xs text-text3 mb-4">{message}</p>}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold hover:scale-105 transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
