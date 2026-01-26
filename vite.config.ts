
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env variables from the current environment (including Vercel dashboard)
  // Vite usually only loads VITE_ variables, so we explicitly load everything
  // Added cast to any for process to fix 'Property cwd does not exist on type Process' error
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Look for the specific API Key name provided by the user
  const apiKey = 
    env.Generative_Language_API_Key || 
    process.env.Generative_Language_API_Key ||
    env.Generative_Language_API ||
    process.env.Generative_Language_API ||
    env.API_KEY ||
    process.env.API_KEY ||
    '';

  return {
    plugins: [react()],
    define: {
      // This forces the value into the build. Even if Vercel has issues, 
      // the value present during 'npm run build' will be hardcoded into the app.
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
