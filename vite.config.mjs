import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const localMarketplace = {
  name: 'local-marketplace-read',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname !== '/api/market/browse') return next();
      const { handler } = require('./netlify/functions/market-browse.js');
      const response = await handler({ httpMethod: req.method, queryStringParameters: Object.fromEntries(url.searchParams) });
      res.writeHead(response.statusCode, response.headers);
      res.end(response.body);
    });
  },
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), localMarketplace],
    resolve: {
      alias: {
        '@react-native-async-storage/async-storage': fileURLToPath(new URL('./src/asyncStorageShim.js', import.meta.url)),
      },
    },
    define: {
      'process.env.REACT_APP_WALLETCONNECT_PROJECT_ID': JSON.stringify(env.REACT_APP_WALLETCONNECT_PROJECT_ID || ''),
      'process.env.REACT_APP_ETHEREUM_RPC_URL': JSON.stringify(env.REACT_APP_ETHEREUM_RPC_URL || ''),
    },
    build: {
      outDir: 'build',
      emptyOutDir: true,
    },
    server: {
      port: 3000,
      host: '127.0.0.1',
      proxy: {
        '/api': {
          target: 'https://ethscri.be',
          changeOrigin: true,
          // Local review uses public data, never production mutations.
          bypass(req, res) {
            const path = req.url.split('?')[0];
            if (['GET', 'HEAD'].includes(req.method) || (req.method === 'POST' && path === '/api/targets/check')) return;
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Local review is read-only. Publishing is disabled; byte checks remain available.' }));
            return false;
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/**/*.test.{js,jsx}'],
      setupFiles: './src/setupTests.js',
      testTimeout: 15000,
    },
  };
});
