import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initializeNativeAuth } from './lib/auth';
import './styles.css';

void initializeNativeAuth().catch(error => {
  window.dispatchEvent(new CustomEvent('yoresuelvo-auth-error', {
    detail: error instanceof Error ? error.message : 'No se pudo preparar el acceso de Android.',
  }));
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js'); });
}
