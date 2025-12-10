import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Replace 'repo-name' with your actual GitHub repository name
  // Example: If your repo is https://github.com/john/christmas-tree
  // Set this to: '/christmas-tree/'
  base: '/luoluo/', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});