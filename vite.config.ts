import { resolve } from 'node:path';
import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

const entries = {
  background: resolve(import.meta.dirname, 'src/background/index.ts'),
  bridge: resolve(import.meta.dirname, 'src/content/navigation/bridge-main.ts'),
  content: resolve(import.meta.dirname, 'src/content/index.tsx'),
};

export default defineConfig(({ mode }): UserConfig => {
  if (mode === 'popup') {
    return {
      plugins: [react()],
      publicDir: 'public',
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: { input: resolve(import.meta.dirname, 'popup.html') },
      },
    };
  }

  const name = mode === 'bridge' ? 'navigation-bridge' : mode;
  return {
    plugins: mode === 'content' ? [react()] : [],
    publicDir: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      copyPublicDir: false,
      sourcemap: true,
      rollupOptions: {
        input: entries[mode as keyof typeof entries],
        output: {
          format: mode === 'background' ? 'es' : 'iife',
          inlineDynamicImports: true,
          entryFileNames: `assets/${name}.js`,
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
