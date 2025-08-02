import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    // Load environment variables based on mode
    const env = loadEnv(mode, process.cwd(), '');
    
    return {
      base: mode === 'production' ? './' : '/',
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      define: {
        // Ensure environment variables are available at build time
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || 'http://localhost:3002/api'),
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
