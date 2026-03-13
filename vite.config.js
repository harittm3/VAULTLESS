import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  server: {
    open: true,
    // Allow HTTPS tunnel hostnames (e.g. *.loca.lt) during mobile testing.
    allowedHosts: true,
  },
});
