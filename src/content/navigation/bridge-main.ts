(() => {
  const marker = '__creatorToolkitNavigationBridgeInstalled__';
  const bridgeWindow = window as typeof window & Record<string, unknown>;
  if (bridgeWindow[marker]) return;
  bridgeWindow[marker] = true;
  const notify = () => window.dispatchEvent(new CustomEvent('creator-toolkit:navigation'));
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = history[method];
    history[method] = function (this: History, ...args: Parameters<History[typeof method]>) {
      const result = original.apply(this, args);
      notify();
      return result;
    } as History[typeof method];
  }
})();
