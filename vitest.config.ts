import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Test files pattern
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'app'],

    // Environment
    environment: 'node',

    // Coverage settings
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'app/',
        'src/**/*.{test,spec}.{js,ts}',
        'src/cli.ts', // CLI entry point
      ],
    },

    // Global test timeout
    testTimeout: 10000,

    // Reporters
    reporters: ['verbose'],
  },
})