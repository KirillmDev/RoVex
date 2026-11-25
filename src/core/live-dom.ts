const callbacks = new Set<() => void>();
let observer: MutationObserver | undefined;
let frame = 0;
const ownerIds = new WeakMap<AbortSignal, Set<string>>();

function notify(update: () => void) {
  try {
    update();
  } catch (error) {
    if (import.meta.env.ROVEX_DEV_DIAGNOSTICS) console.warn('RoVex DOM callback failed', error);
  }
}

export function watchDom(signal: AbortSignal, update: () => void): () => void {
  if (signal.aborted) return () => undefined;
  callbacks.add(update);
  if (!observer) {
    observer = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        for (const callback of callbacks) notify(callback);
      });
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'href',
        'hidden',
        'aria-hidden',
        'data-universe-id',
        'data-testid',
        'data-userid',
        'data-user-id',
        'aria-selected',
        'role',
        'data-is-for-sale',
        'class',
      ],
    });
  }
  const unsubscribe = () => {
    signal.removeEventListener('abort', unsubscribe);
    callbacks.delete(update);
    if (callbacks.size) return;
    observer?.disconnect();
    observer = undefined;
    cancelAnimationFrame(frame);
    frame = 0;
  };
  signal.addEventListener('abort', unsubscribe, { once: true });
  notify(update);
  return unsubscribe;
}

export function ownedElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  owner: string,
  signal: AbortSignal,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.dataset.creatorToolkitOwner = owner;
  let owned = ownerIds.get(signal);
  if (!owned) {
    const ids = new Set<string>();
    ownerIds.set(signal, ids);
    signal.addEventListener(
      'abort',
      () => {
        for (const node of document.querySelectorAll<HTMLElement>('[data-creator-toolkit-owner]')) {
          if (ids.has(node.dataset.creatorToolkitOwner ?? '')) node.remove();
        }
      },
      { once: true },
    );
    owned = ids;
  }
  owned.add(owner);
  return element;
}

export function exactTime(value: unknown): HTMLTimeElement | null {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(value)) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const time = document.createElement('time');
  time.dateTime = date.toISOString();
  time.textContent = new Intl.DateTimeFormat(navigator.languages, {
    dateStyle: 'medium',
    timeStyle: 'long',
  }).format(date);
  return time;
}
