import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const firebaseKeys = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'] as const;

function firebaseWorkerConfig(values: Record<string, string>): Plugin {
  const config = Object.fromEntries(firebaseKeys.map(key => [key, values[`VITE_FIREBASE_${key.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase()}`] ?? '']));
  const content = `self.__YORESUELVO_FIREBASE__=${JSON.stringify(config)};`;
  return {
    name: 'yoresuelvo-firebase-worker-config',
    configureServer(server) {
      server.middlewares.use('/firebase-config.js', (_request, response) => {
        response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(content);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'firebase-config.js', source: content });
    },
  };
}

export default defineConfig(({ mode }) => {
  const values = loadEnv(mode, new URL('.', import.meta.url).pathname, 'VITE_');
  return { plugins: [react(), firebaseWorkerConfig(values)] };
});
