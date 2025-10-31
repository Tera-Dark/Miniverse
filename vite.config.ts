import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(() => {
  const repository = process.env.GITHUB_REPOSITORY;
  const base = repository ? `/${repository.split('/')[1]}/` : '/';

  return {
    base,
    build: {
      outDir: 'dist',
    },
  };
});
