import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
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
