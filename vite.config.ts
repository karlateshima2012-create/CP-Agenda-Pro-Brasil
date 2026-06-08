import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // ✅ subdomain deployment

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    // ✅ QUALITY FIX: Auto-strip console.log & debugger in production builds
    // Using esbuild (bundled with Vite) — no extra dependency needed
    minify: 'esbuild',
    target: 'es2015',
  },

  esbuild: {
    drop: ['console', 'debugger'],
  },
});
