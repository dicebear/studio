import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2017',
    minify: true,
    lib: {
      entry: 'src/code/index.ts',
      formats: ['iife'],
      name: 'figmaPlugin',
      fileName: () => 'code.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});
