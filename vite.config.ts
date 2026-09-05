import { fileURLToPath, URL } from 'node:url';

import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { visualizer } from 'rollup-plugin-visualizer';

const isWatch = process.argv.includes('--watch');

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
    mode === 'analyze' && (visualizer({ filename: 'dist/stats.html', gzipSize: true }) as PluginOption),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/ui', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: !isWatch,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 10_000,
    target: 'es2022',
  },
}));
