
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Declare process for TypeScript to avoid Vercel build errors
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
      Generative_Language_API_Key: string;
      Generative_Language_API: string;
    }
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
