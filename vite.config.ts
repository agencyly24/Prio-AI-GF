
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" error
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Check for either API_KEY or GOOGLE_API_KEY
  const apiKey = env.API_KEY || env.GOOGLE_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY || '';

  return {
    plugins: [react()],
    define: {
      // This ensures process.env.API_KEY is replaced with the actual string during build
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
    server: {
      port: 3000
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', '@google/genai'],
          },
        },
      },
    }
  };
});
