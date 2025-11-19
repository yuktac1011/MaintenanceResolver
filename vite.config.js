import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  base: '/',
  plugins: [react()],
  server: {
    proxy: {
      // This rule forwards API calls to your backend
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
      // ** ADD THIS NEW RULE **
      // This rule forwards image requests to your backend
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});