import { defineConfig } from 'vite';

export default defineConfig({
  base: '/p2p-gyro-game/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
  },
  server: {
    port: 3000,
    open: true,
  },
});

