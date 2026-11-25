import { beforeEach, vi } from 'vitest';

type Listener = (...args: any[]) => void;

const store: Record<string, unknown> = {};
const storageListeners = new Set<Listener>();

function emitStorage(changes: Record<string, chrome.storage.StorageChange>) {
  for (const listener of storageListeners) listener(changes, 'local');
}

const chromeMock = {
  storage: {
    local: {
      get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
        if (keys == null) return { ...store };
        if (typeof keys === 'string') return { [keys]: store[keys] };
        if (Array.isArray(keys))
          return Object.fromEntries(
            keys.filter((key) => key in store).map((key) => [key, store[key]]),
          );
        return Object.fromEntries(
          Object.entries(keys).map(([key, fallback]) => [
            key,
            key in store ? store[key] : fallback,
          ]),
        );
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        const changes: Record<string, chrome.storage.StorageChange> = {};
        for (const [key, value] of Object.entries(items)) {
          changes[key] = { oldValue: store[key], newValue: value };
          store[key] = value;
        }
        emitStorage(changes);
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        const list = Array.isArray(keys) ? keys : [keys];
        const changes: Record<string, chrome.storage.StorageChange> = {};
        for (const key of list) {
          changes[key] = { oldValue: store[key], newValue: undefined };
          delete store[key];
        }
        emitStorage(changes);
      }),
      clear: vi.fn(async () => {
        const keys = Object.keys(store);
        for (const key of keys) delete store[key];
      }),
    },
    onChanged: {
      addListener: vi.fn((listener: Listener) => storageListeners.add(listener)),
      removeListener: vi.fn((listener: Listener) => storageListeners.delete(listener)),
      hasListener: vi.fn((listener: Listener) => storageListeners.has(listener)),
    },
  },
  runtime: {
    lastError: undefined,
    getManifest: () => ({ version: '0.1.0' }),
    sendMessage: vi.fn(),
    onInstalled: { addListener: vi.fn() },
    onStartup: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
  },
  tabs: { query: vi.fn(async () => []), create: vi.fn(), update: vi.fn() },
  windows: { update: vi.fn() },
};

Object.assign(globalThis, { chrome: chromeMock });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  storageListeners.clear();
  document.body.replaceChildren();
  history.replaceState(null, '', '/dashboard');
  vi.clearAllMocks();
});

export { store as mockStorage };
