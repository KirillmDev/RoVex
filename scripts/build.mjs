import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';

const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const stages = ['popup', 'background', 'bridge', 'content'];
const dev = process.argv.includes('--dev');
const env = { ...process.env, ROVEX_BUILD_DEV: dev ? '1' : '0' };
for (const stage of stages) {
  const result = spawnSync(process.execPath, [vite, 'build', '--mode', stage], {
    env,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (process.argv.includes('--watch')) {
  const watchers = stages.map((stage) =>
    spawn(process.execPath, [vite, 'build', '--mode', stage, '--watch'], {
      env: { ...env, ROVEX_BUILD_WATCH: '1' },
      stdio: 'inherit',
    }),
  );
  const stop = () => watchers.forEach((child) => child.kill());
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  for (const child of watchers)
    child.once('exit', (status) => {
      if (status) {
        process.exitCode = status;
        stop();
      }
    });
}
