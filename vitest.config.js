import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/worklets/**',
        '**/*.config.js',
      ]
    },
    setupFiles: ['./test/setup.js']
  }
});