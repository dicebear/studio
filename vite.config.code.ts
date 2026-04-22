import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2017',
    minify: 'esbuild',
    lib: {
      entry: 'src/code/index.ts',
      formats: ['iife'],
      name: 'figmaPlugin',
      fileName: () => 'code.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        extend: true,
      },
    },
  },
});
