import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const isGitHubActions = Boolean(process.env.GITHUB_ACTIONS);
const base = isGitHubActions && repository ? `/${repository}/` : '/';

export default defineConfig({
  base,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
