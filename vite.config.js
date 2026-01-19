import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 3002,
    open: false
  },
  build: {
    outDir: 'dist-pages',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        explorer: resolve(__dirname, 'explorer.html'),
        designer: resolve(__dirname, 'designer.html'),
        wizard: resolve(__dirname, 'wizard.html')
      },
      output: {
        // Keep filenames simple for GitHub Pages
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-chunk.js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  base: './' // Use relative paths for GitHub Pages
});
