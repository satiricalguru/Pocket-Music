import React, { useEffect } from 'react';
import {
  Mic,
  MicOff,
  Music,
  Radio,
  HelpCircle,
  Volume2,
  Info,
} from 'lucide-react';
import { useSoundboardStore } from '../../store/useSoundboardStore';

export const SoundboardPanel: React.FC = () => {
  const {
    isEnabled,
    inputDeviceId,
    outputDeviceId,
    inputVolume,
    musicVolume,
    isMonitoring,
    mics,
    sinks,
    setEnabled,
    setInputDeviceId,
    setOutputDeviceId,
    setInputVolume,
    setMusicVolume,
    setIsMonitoring,
    refreshDevices,
  } = useSoundboardStore();

  // Enumerate devices on mount and check permissions
  useEffect(() => {
    void refreshDevices();

    // Set up a listener for device changes (e.g. plugging in a mic or virtual cable)
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
    };
  }, [refreshDevices]);

  const handleToggleSoundboard = async () => {
    // Request mic access dynamically if enabling
    if (!isEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop()); // close temp stream
      } catch (err) {
        console.warn('[soundboard] Mic permission denied or failed:', err);
        alert('Microphone access is required to use the Soundboard feature. Please allow microphone access.');
        return;
      }
    }
    void setEnabled(!isEnabled);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-[1000px] mx-auto space-y-8 select-none">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-green flex items-center justify-center shadow-lg shadow-green/20">
          <Radio size={24} className="text-white animate-pulse" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-text1">Soundboard</h1>
          <p className="text-sm text-text3 mt-1">
            Mix your voice and music together and stream it directly to your friends in-game.
          </p>
        </div>
      </div>

      {/* Main Control Card */}
      <div
        className={`p-6 rounded-2xl border transition-all duration-300 ${
          isEnabled
            ? 'bg-gradient-to-br from-green/10 to-surface border-green/30 shadow-lg shadow-green/5'
            : 'bg-surface border-border'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-text1">Soundboard Router</h2>
            <p className="text-sm text-text3">
              {isEnabled
                ? 'Routing active. Mixed audio is streaming to the output device.'
                : 'Routing disabled. Music plays normally on your local system.'}
            </p>
          </div>
          <button
            onClick={handleToggleSoundboard}
            className={`px-6 py-3 rounded-full font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95 ${
              isEnabled
                ? 'bg-green text-white hover:bg-green-h shadow-lg shadow-green/20'
                : 'bg-white text-black hover:bg-neutral-200'
            }`}
          >
            {isEnabled ? 'Turn Off' : 'Enable Soundboard'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Device Selectors */}
        <div className="bg-surface p-6 rounded-2xl border border-border space-y-6">
          <h3 className="text-base font-bold text-text1 flex items-center gap-2">
            <Info size={18} className="text-green" /> Audio Devices
          </h3>

          {/* Microphone Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-text3 uppercase tracking-wider block">
              1. Microphone Input Device
            </label>
            <select
              value={inputDeviceId}
              onChange={(e) => void setInputDeviceId(e.target.value)}
              disabled={!isEnabled}
              className="w-full h-11 px-3 bg-[#181818] border border-border rounded-lg text-sm text-text1 focus:border-white focus:outline-none disabled:opacity-50 transition-colors cursor-pointer"
            >
              <option value="">Default Microphone</option>
              {mics.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Microphone (${mic.deviceId.slice(0, 5)}...)`}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-text3">
              This captures your voice. Labels appear once microphone access is approved.
            </p>
          </div>

          {/* Soundboard Output */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-text3 uppercase tracking-wider block">
              2. Soundboard Output Device
            </label>
            <select
              value={outputDeviceId}
              onChange={(e) => void setOutputDeviceId(e.target.value)}
              disabled={!isEnabled}
              className="w-full h-11 px-3 bg-[#181818] border border-border rounded-lg text-sm text-text1 focus:border-white focus:outline-none disabled:opacity-50 transition-colors cursor-pointer"
            >
              <option value="">Default Output (Speakers)</option>
              {sinks.map((sink) => (
                <option key={sink.deviceId} value={sink.deviceId}>
                  {sink.label || `Output Device (${sink.deviceId.slice(0, 5)}...)`}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-text3">
              Route this to a virtual audio cable (e.g. <strong>CABLE Input</strong>).
            </p>
          </div>
        </div>

        {/* Mixer & Settings */}
        <div className="bg-surface p-6 rounded-2xl border border-border space-y-6">
          <h3 className="text-base font-bold text-text1 flex items-center gap-2">
            <Volume2 size={18} className="text-green" /> Mixer Console
          </h3>

          {/* Voice Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-medium text-text2">
              <span className="flex items-center gap-2">
                {inputVolume === 0 ? <MicOff size={16} /> : <Mic size={16} />}
                Voice Capture Volume
              </span>
              <span className="text-xs text-text3">{Math.round(inputVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={inputVolume}
              onChange={(e) => setInputVolume(parseFloat(e.target.value))}
              disabled={!isEnabled}
              className="w-full accent-green bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
            />
          </div>

          {/* Music Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-medium text-text2">
              <span className="flex items-center gap-2">
                <Music size={16} />
                Music Mix Volume
              </span>
              <span className="text-xs text-text3">{Math.round(musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={musicVolume}
              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
              disabled={!isEnabled}
              className="w-full accent-green bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
            />
          </div>

          {/* Monitor music local checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer group text-sm text-text2 hover:text-text1 transition-colors">
              <input
                type="checkbox"
                checked={isMonitoring}
                onChange={(e) => void setIsMonitoring(e.target.checked)}
                disabled={!isEnabled}
                className="w-4 h-4 rounded border-border bg-[#181818] text-green focus:ring-green cursor-pointer disabled:opacity-30"
              />
              <div className="space-y-0.5">
                <span className="font-semibold block">Monitor Music (Hear it locally)</span>
                <span className="text-xs text-text3 block font-normal">
                  Allows you to hear the player's music locally while it streams.
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Guide Panel */}
      <div className="bg-elevated p-6 rounded-2xl border border-border space-y-4">
        <h3 className="text-base font-bold text-text1 flex items-center gap-2">
          <HelpCircle size={18} className="text-green" /> Gaming & Discord Setup Guide
        </h3>
        <p className="text-sm text-text2 leading-relaxed">
          To stream music to **Valorant, CS:GO, Discord, or TeamSpeak** so your friends can hear both you and the song, follow these steps:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="space-y-2 bg-[#121212] p-4 rounded-xl border border-border/50">
            <div className="w-7 h-7 rounded-full bg-green/10 text-green font-bold text-xs flex items-center justify-center">
              1
            </div>
            <h4 className="font-bold text-sm text-text1">Install Virtual Cable</h4>
            <p className="text-xs text-text3 leading-relaxed">
              Install a virtual audio driver like **VB-Cable** (Free on vb-audio.com). This creates virtual playback and capture devices in Windows.
            </p>
          </div>

          <div className="space-y-2 bg-[#121212] p-4 rounded-xl border border-border/50">
            <div className="w-7 h-7 rounded-full bg-green/10 text-green font-bold text-xs flex items-center justify-center">
              2
            </div>
            <h4 className="font-bold text-sm text-text1">Configure Pocket Music</h4>
            <p className="text-xs text-text3 leading-relaxed">
              Enable the Soundboard above. Set **Microphone Input** to your physical microphone and **Soundboard Output** to **CABLE Input (VB-Audio Virtual Cable)**.
            </p>
          </div>

          <div className="space-y-2 bg-[#121212] p-4 rounded-xl border border-border/50">
            <div className="w-7 h-7 rounded-full bg-green/10 text-green font-bold text-xs flex items-center justify-center">
              3
            </div>
            <h4 className="font-bold text-sm text-text1">Set Input in Game</h4>
            <p className="text-xs text-text3 leading-relaxed">
              Open Valorant or Discord settings. Set your **Voice Input Device (Microphone)** to **CABLE Output (VB-Audio Virtual Cable)**.
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-green/5 border border-green/20 rounded-lg flex items-start gap-2.5 text-xs text-text2">
          <Info size={16} className="text-green shrink-0 mt-0.5" />
          <span>
            <strong>Pro-Tip:</strong> Because you turned on **Monitor Music**, you will hear the music perfectly on your headphones, while your friends in-game will hear both your microphone voice and the music mixed together under the virtual cable.
          </span>
        </div>
      </div>
    </div>
  );
};
