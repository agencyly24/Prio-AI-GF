
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Support the specific name provided by the user: 'Generative_Language_API_Key'
  // We prioritize this exact name to ensure Vercel integration works perfectly.
  const apiKey = 
    env.Generative_Language_API_Key || 
    env.Generative_Language_API || 
    process.env.Generative_Language_API_Key || 
    process.env.Generative_Language_API || 
    env.API_KEY || 
    process.env.API_KEY || 
    '';

  return {
    plugins: [react()],
    define: {
      // This maps the found API key to process.env.API_KEY inside the app code
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
