import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    // Exclude E2E tests from Vitest (they use Playwright)
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e-*.test.ts'
    ],
    include: [
      '**/*.test.ts',
      '!**/e2e-*.test.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.ts',
        'test/**',
        'e2e-*.test.ts'
      ]
    }
  }
});
