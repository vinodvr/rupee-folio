import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.vitest.js'],
    environment: 'jsdom'
  }
});
