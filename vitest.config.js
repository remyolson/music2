import { defineConfig } from 'vite';
import path from 'path';

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
  },
  resolve: {
    alias: {
      'tone': path.resolve(__dirname, 'test/mocks/tone.js')
    }
  }
});