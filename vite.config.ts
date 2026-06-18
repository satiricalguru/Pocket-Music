import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
          external: [
              'better-sqlite3',
              'discord.js',
              '@discordjs/voice',
              '@discordjs/opus',
              '@discordjs/ws',
              '@discordjs/rest',
              '@discordjs/collection',
              '@discordjs/builders',
              '@discordjs/formatters',
              '@discordjs/util',
              'libsodium-wrappers',
              'zlib-sync',
              'erlpack',
              'bufferutil',
              'utf-8-validate',
              'sodium',
              'tweetnacl',
            ],
            },
          },
        },
        // Don't auto-start Electron here; the dev:electron script handles it
        // via concurrently to avoid double-launch race conditions.
        onstart() {
          // no-op
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
      renderer: {},
    }),
  ],
  optimizeDeps: {
    exclude: [
      'discord.js',
      '@discordjs/voice',
      '@discordjs/ws',
      '@discordjs/opus',
    ],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
