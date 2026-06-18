import type { SpotLocalApi } from '../../electron/preload';

/**
 * The renderer accesses native capabilities exclusively through the
 * contextBridge-exposed `window.spotlocal` API. This global typing keeps
 * every IPC call site type-safe.
 */
declare global {
  interface Window {
    spotlocal: SpotLocalApi;
    spotlocalAudio?: HTMLAudioElement;
  }
}

export {};
