import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 为浏览器环境定义 process.env polyfill，防止在访问 process.env.API_KEY 时应用崩溃
if (typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: {
      API_KEY: '' // 运行时将由环境注入或为空
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