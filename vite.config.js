import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3002,
    open: false
  },
  build: {
    outDir: 'dist-pages',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Keep filenames simple for GitHub Pages
        entryFileNames: 'main.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  base: './' // Use relative paths for GitHub Pages
});
