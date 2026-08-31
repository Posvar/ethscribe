import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
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
  };
});
