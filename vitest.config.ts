import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

const alias = {
  '@': fileURLToPath(new URL('./src/ui', import.meta.url)),
  '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'code',
          environment: 'node',
          include: ['src/code/**/*.test.ts', 'src/shared/**/*.test.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'ui',
          environment: 'jsdom',
          setupFiles: ['src/ui/test/setup.ts'],
          include: ['src/ui/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
