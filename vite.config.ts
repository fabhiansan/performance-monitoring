import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    return {
      base: mode === 'production' ? './' : '/',
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1000, // Increase limit to 1000kb to reduce warnings
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html')
          },
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              charts: ['recharts'],
              utils: ['html2canvas', 'jspdf']
            }
          }
        }
      }
    };
});
