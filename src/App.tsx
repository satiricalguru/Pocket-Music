import React, { useEffect, useState, useRef } from 'react';
import { useLibraryStore } from './store/useLibraryStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useAudio } from './hooks/useAudio';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingScreen } from './components/ui/LoadingScreen';

const App: React.FC = () => {
  const [appState, setAppState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [hasFfmpeg, setHasFfmpeg] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadLibrary = useLibraryStore((s) => s.loadLibrary);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useAudio();
  useKeyboardShortcuts(searchInputRef);

  useEffect(() => {
    // Listen for app lifecycle events from main process
    const unsubReady = window.spotlocal.onAppReady((data: unknown) => {
      const d = data as { hasFfmpeg?: boolean };
      if (d && typeof d === 'object' && 'hasFfmpeg' in d) {
        setHasFfmpeg(d.hasFfmpeg ?? true);
      }
      setAppState('ready');
    });
    const unsubLoading = window.spotlocal.onAppLoading((_data: unknown) => {
      // Stay in loading state
    });
    const unsubError = window.spotlocal.onAppError((data: unknown) => {
      const d = data as { message?: string };
      setErrorMsg(d?.message ?? 'Unknown error');
      setAppState('error');
    });

    return () => {
      unsubReady();
      unsubLoading();
      unsubError();
    };
  }, []);

  useEffect(() => {
    if (appState !== 'ready') return;
    void loadLibrary();
    void loadSettings();
  }, [appState, loadLibrary, loadSettings]);

  if (appState === 'loading') {
    return <LoadingScreen message="Starting Pocket Music…" />;
  }

  if (appState === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="text-center max-w-md px-8">
          <div className="text-red-500 text-5xl mb-4">⚠</div>
          <h1 className="text-xl font-bold mb-2">Failed to Start</h1>
          <p className="text-text2 text-sm mb-6">{errorMsg}</p>
          <button
            className="px-6 py-2 bg-green text-white font-semibold rounded-full hover:bg-green-h transition-colors"
            onClick={() => window.spotlocal.openExternal('https://github.com')}
          >
            Get Help
          </button>
        </div>
      </div>
    );
  }

  return <AppLayout searchInputRef={searchInputRef} hasFfmpeg={hasFfmpeg} />;
};

export default App;
