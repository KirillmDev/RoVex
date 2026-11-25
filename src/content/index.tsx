import { LifecycleManager } from '../navigation/lifecycle-manager';
import { initializeStorage } from '../storage/chrome-storage';
import { RobloxSettingsIntegration } from '../sites/roblox/settings-integration';
import { robloxId } from '../shared/roblox-data';

let started = false;

async function bootstrap() {
  if (started || window.top !== window.self) return;
  started = true;
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (sender.id !== chrome.runtime.id || message?.type !== 'rovex.copy-link-id') return;
    const id = robloxId(message.id);
    const notify = (text: string) => {
      document.querySelector('[data-rovex-copy-status]')?.remove();
      const status = document.createElement('div');
      status.dataset.rovexCopyStatus = '';
      status.setAttribute('role', 'status');
      status.style.cssText =
        'position:fixed;inset:auto 16px 24px auto;z-index:10000;padding:10px 14px;border-radius:8px;background:var(--color-surface-300,Canvas);color:var(--color-content-emphasis,CanvasText);border:1px solid var(--color-stroke-default,GrayText);';
      status.textContent = text;
      document.body.append(status);
      window.setTimeout(() => status.remove(), 3000);
    };
    if (!id) {
      notify('Universe ID unavailable.');
      return;
    }
    void navigator.clipboard.writeText(id).then(
      () => notify('Roblox ID copied.'),
      () => notify('Could not copy Roblox ID.'),
    );
  });
  await initializeStorage();
  if (location.hostname === 'www.roblox.com') new RobloxSettingsIntegration().start();
  const lifecycle = new LifecycleManager();
  await lifecycle.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void bootstrap(), { once: true });
} else {
  void bootstrap();
}
