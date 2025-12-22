
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Define process.env polyfill for browser environment to prevent crash on process.env.API_KEY
if (typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: {
      API_KEY: '' // Will be injected or read from environment
    }
  };
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
