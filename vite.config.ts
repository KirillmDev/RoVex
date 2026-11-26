import { resolve } from 'node:path';
import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

const entries = {
  background: resolve(import.meta.dirname, 'src/background/index.ts'),
  bridge: resolve(import.meta.dirname, 'src/content/navigation/bridge-main.ts'),
  content: resolve(import.meta.dirname, 'src/content/index.tsx'),
};

export default defineConfig(({ mode }): UserConfig => {
  const development = process.env.ROVEX_BUILD_DEV === '1';
  const outDir = development ? 'dist-dev' : 'dist';
  const output = {
    outDir,
    sourcemap: development,
    minify: development ? (false as const) : ('esbuild' as const),
  };
  const define = { 'import.meta.env.ROVEX_DEV_DIAGNOSTICS': JSON.stringify(development) };
  if (mode === 'popup') {
    return {
      plugins: [react()],
      define,
      publicDir: 'public',
      build: {
        ...output,
        emptyOutDir: process.env.ROVEX_BUILD_WATCH !== '1',
        rollupOptions: { input: resolve(import.meta.dirname, 'popup.html') },
      },
    };
  }

  const name = mode === 'bridge' ? 'navigation-bridge' : mode;
  return {
    plugins: mode === 'content' ? [react()] : [],
    define,
    publicDir: false,
    build: {
      ...output,
      emptyOutDir: false,
      copyPublicDir: false,
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
