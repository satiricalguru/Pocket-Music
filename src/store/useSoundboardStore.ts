import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Private module-level Web Audio API state to avoid React/Zustand serialization issues
let audioCtx: AudioContext | null = null;
let musicSourceNode: MediaElementAudioSourceNode | null = null;
let micSourceNode: MediaStreamAudioSourceNode | null = null;
let micStream: MediaStream | null = null;

let monitorGainNode: GainNode | null = null;
let mixMusicGainNode: GainNode | null = null;
let micGainNode: GainNode | null = null;

let mixDestinationNode: MediaStreamAudioDestinationNode | null = null;
let soundboardAudioElement: HTMLAudioElement | null = null;

export interface SoundboardState {
  isEnabled: boolean;
  inputDeviceId: string;
  outputDeviceId: string;
  inputVolume: number;
  musicVolume: number;
  isMonitoring: boolean;

  mics: MediaDeviceInfo[];
  sinks: MediaDeviceInfo[];

  setEnabled: (val: boolean) => Promise<void>;
  setInputDeviceId: (id: string) => Promise<void>;
  setOutputDeviceId: (id: string) => Promise<void>;
  setInputVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setIsMonitoring: (m: boolean) => Promise<void>;
  refreshDevices: () => Promise<void>;
  updateRouting: () => Promise<void>;
}

export const useSoundboardStore = create<SoundboardState>()(
  persist(
    immer((set, get) => ({
      isEnabled: false,
      inputDeviceId: '',
      outputDeviceId: '',
      inputVolume: 0.8,
      musicVolume: 0.5,
      isMonitoring: true,

      mics: [],
      sinks: [],

      setEnabled: async (val) => {
        set((s) => {
          s.isEnabled = val;
        });
        await get().updateRouting();
      },

      setInputDeviceId: async (id) => {
        set((s) => {
          s.inputDeviceId = id;
        });
        await get().updateRouting();
      },

      setOutputDeviceId: async (id) => {
        set((s) => {
          s.outputDeviceId = id;
        });
        await get().updateRouting();
      },

      setInputVolume: (v) => {
        const val = Math.min(1, Math.max(0, v));
        set((s) => {
          s.inputVolume = val;
        });
        if (micGainNode) {
          micGainNode.gain.value = val;
        }
      },

      setMusicVolume: (v) => {
        const val = Math.min(1, Math.max(0, v));
        set((s) => {
          s.musicVolume = val;
        });
        if (mixMusicGainNode) {
          mixMusicGainNode.gain.value = val;
        }
      },

      setIsMonitoring: async (m) => {
        set((s) => {
          s.isMonitoring = m;
        });
        await get().updateRouting();
      },

      refreshDevices: async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          set((s) => {
            s.mics = devices.filter((d) => d.kind === 'audioinput');
            s.sinks = devices.filter((d) => d.kind === 'audiooutput');
          });
        } catch (err) {
          console.error('[soundboard] Failed to enumerate devices:', err);
        }
      },

      updateRouting: async () => {
        const { isEnabled, inputDeviceId, outputDeviceId, inputVolume, musicVolume, isMonitoring } = get();
        const audioEl = window.spotlocalAudio;
        if (!audioEl) {
          console.warn('[soundboard] spotlocalAudio not loaded yet');
          return;
        }

        try {
          // Initialize AudioContext on-demand
          if (!audioCtx) {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          }

          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }

          // Wrap HTMLAudioElement output once
          if (!musicSourceNode) {
            musicSourceNode = audioCtx.createMediaElementSource(audioEl);
          }

          // Create gain and destination nodes if they don't exist
          if (!monitorGainNode) {
            monitorGainNode = audioCtx.createGain();
          }
          if (!mixMusicGainNode) {
            mixMusicGainNode = audioCtx.createGain();
          }
          if (!micGainNode) {
            micGainNode = audioCtx.createGain();
          }
          if (!mixDestinationNode) {
            mixDestinationNode = audioCtx.createMediaStreamDestination();
          }

          // Disconnect all to cleanly rebuild routing graph
          musicSourceNode.disconnect();
          monitorGainNode.disconnect();
          mixMusicGainNode.disconnect();
          micGainNode.disconnect();
          if (micSourceNode) {
            micSourceNode.disconnect();
          }

          if (isEnabled) {
            // 1. Microphone capture setup
            let needsNewMic = !micStream || !micSourceNode;
            if (micStream) {
              const activeTrack = micStream.getAudioTracks()[0];
              if (!activeTrack) {
                needsNewMic = true;
              } else {
                const activeDeviceId = activeTrack.getSettings().deviceId;
                if (inputDeviceId && activeDeviceId !== inputDeviceId) {
                  needsNewMic = true;
                }
              }
            }

            if (needsNewMic) {
              if (micStream) {
                micStream.getTracks().forEach((t) => t.stop());
              }
              try {
                micStream = await navigator.mediaDevices.getUserMedia({
                  audio: inputDeviceId ? { deviceId: { exact: inputDeviceId } } : true,
                });
                micSourceNode = audioCtx.createMediaStreamSource(micStream);
                // Refresh list since labels will now be visible
                await get().refreshDevices();
              } catch (err) {
                console.error('[soundboard] Failed to acquire microphone stream:', err);
                micStream = null;
                micSourceNode = null;
              }
            }

            // 2. Connect Microphone to Soundboard Mix
            if (micSourceNode && micGainNode) {
              micGainNode.gain.value = inputVolume;
              micSourceNode.connect(micGainNode);
              micGainNode.connect(mixDestinationNode);
            }

            // 3. Connect Music to Soundboard Mix & local Monitor
            mixMusicGainNode.gain.value = musicVolume;
            musicSourceNode.connect(mixMusicGainNode);
            mixMusicGainNode.connect(mixDestinationNode);

            if (isMonitoring) {
              monitorGainNode.gain.value = 1.0;
              musicSourceNode.connect(monitorGainNode);
              monitorGainNode.connect(audioCtx.destination);
            }

            // 4. Setup mixed output destination playback (hidden element in DOM for Chromium)
            if (soundboardAudioElement) {
              const currentSrcObj = soundboardAudioElement.srcObject;
              if (currentSrcObj !== mixDestinationNode.stream) {
                soundboardAudioElement.pause();
                soundboardAudioElement.srcObject = mixDestinationNode.stream;
                await soundboardAudioElement.play().catch(() => {});
              }
            } else {
              soundboardAudioElement = new Audio();
              soundboardAudioElement.style.display = 'none';
              document.body.appendChild(soundboardAudioElement);
              soundboardAudioElement.srcObject = mixDestinationNode.stream;
              await soundboardAudioElement.play().catch(() => {});
            }

            // Redirect soundboard output to specific virtual cable device
            if (typeof soundboardAudioElement.setSinkId === 'function') {
              try {
                if (soundboardAudioElement.sinkId !== outputDeviceId) {
                  await soundboardAudioElement.setSinkId(outputDeviceId);
                  console.log('[soundboard] Soundboard output routed to sink:', outputDeviceId);
                }
              } catch (err) {
                console.error('[soundboard] Failed to direct output to sink device:', err);
              }
            }
          } else {
            // Disabled: Clean up microphone capture
            if (micStream) {
              micStream.getTracks().forEach((t) => t.stop());
              micStream = null;
            }
            micSourceNode = null;

            // Stop output redirection and remove from DOM
            if (soundboardAudioElement) {
              soundboardAudioElement.pause();
              soundboardAudioElement.srcObject = null;
              try {
                document.body.removeChild(soundboardAudioElement);
              } catch (e) {
                /* ignore */
              }
              soundboardAudioElement = null;
            }

            // Route music directly to standard local monitoring speakers
            monitorGainNode.gain.value = 1.0;
            musicSourceNode.connect(monitorGainNode);
            monitorGainNode.connect(audioCtx.destination);
          }
        } catch (err) {
          console.error('[soundboard] updateRouting error:', err);
        }
      },
    })),
    {
      name: 'spotlocal-soundboard',
      partialize: (s) => ({
        isEnabled: s.isEnabled,
        inputDeviceId: s.inputDeviceId,
        outputDeviceId: s.outputDeviceId,
        inputVolume: s.inputVolume,
        musicVolume: s.musicVolume,
        isMonitoring: s.isMonitoring,
      }),
    }
  )
);
