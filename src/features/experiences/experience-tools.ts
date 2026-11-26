import type { FeatureDefinition } from '../../registry/types';
import { experiencePath, robloxApi, robloxId, universeForPlace } from '../../api/roblox-data';
import { exactTime, ownedElement, watchDom } from '../../core/live-dom';

const hostnames = ['www.roblox.com'];
const base = { supportedSites: ['roblox'] as const, defaultEnabled: false, settings: [] };
type Stats = { id: number; playing?: number; created?: string; updated?: string };
const dateLabels: Record<string, readonly [string, string]> = {
  en: ['Created', 'Updated'],
  es: ['Creado', 'Actualizado'],
  fr: ['Créé', 'Mis à jour'],
  de: ['Erstellt', 'Aktualisiert'],
  pt: ['Criado', 'Atualizado'],
  it: ['Creato', 'Aggiornato'],
  pl: ['Utworzono', 'Zaktualizowano'],
  ru: ['Создано', 'Обновлено'],
  uk: ['Створено', 'Оновлено'],
  ja: ['作成日', '更新日'],
  ko: ['생성일', '업데이트'],
  zh: ['创建时间', '更新时间'],
};

function statDateKey(stat: Element): 'created' | 'updated' | undefined {
  const testId = stat.getAttribute('data-testid');
  if (testId?.endsWith('-created')) return 'created';
  if (testId?.endsWith('-updated')) return 'updated';
  const text = stat.querySelector('.text-label')?.textContent?.trim().toLowerCase();
  for (const [created, updated] of Object.values(dateLabels)) {
    if (text === created.toLowerCase()) return 'created';
    if (text === updated.toLowerCase()) return 'updated';
  }
  return undefined;
}

function linkedPlace(link: HTMLAnchorElement): string | undefined {
  const url = new URL(link.href, location.href);
  return url.origin === 'https://www.roblox.com'
    ? experiencePath.exec(url.pathname)?.[1]
    : undefined;
}

export const widePlayerCounts: FeatureDefinition = {
  ...base,
  id: 'wide-player-counts',
  category: 'experiences',
  title: 'Player counts on wide tiles',
  description: 'Show the latest available concurrent player count beside the rating.',
  availability: 'Wide experience cards with a rating footer.',
  routes: [{ hostnames }],
  activate({ signal }) {
    const seen = new WeakMap<Element, { href: string; rating: Element }>();
    let queued = new Set<Element>();
    let busy = false;
    const load = async () => {
      if (busy || signal.aborted) return;
      busy = true;
      try {
        while (queued.size && !signal.aborted) {
          const batch = [...queued].slice(0, 8);
          batch.forEach((tile) => queued.delete(tile));
          const resolved = await Promise.all(
            batch.map(async (tile) => {
              const link = tile.querySelector<HTMLAnchorElement>('a[href*="/games/"]');
              const place = link && linkedPlace(link);
              if (!place) return null;
              try {
                const id =
                  robloxId(
                    tile.getAttribute('data-universe-id') ?? link.getAttribute('data-universe-id'),
                  ) ?? (await universeForPlace(place, signal));
                return { tile, id, link, place };
              } catch {
                return null;
              }
            }),
          );
          const rows = resolved.filter((row) => row !== null);
          const ids = [...new Set(rows.map(({ id }) => id))].sort().join(',');
          if (!ids || signal.aborted) continue;
          const result = await robloxApi('games', ids, { signal }).catch(() => null);
          for (const { tile, id, link, place } of rows) {
            if (
              signal.aborted ||
              !tile.isConnected ||
              !tile.contains(link) ||
              linkedPlace(link) !== place ||
              tile.querySelector(
                '[data-testid="game-tile-stats-player-count"], [data-creator-toolkit-owner="wide-player-counts"]',
              )
            )
              continue;
            const count = result?.data?.find((game) => String(game.id) === id)?.playing;
            const rating = tile.querySelector('[data-testid="game-tile-stats-rating"]');
            if (!rating || !Number.isSafeInteger(count) || count! < 0) continue;
            const text = ownedElement('span', 'wide-player-counts', signal);
            text.className = 'text-caption-medium';
            text.style.marginInlineStart = '6px';
            text.textContent = `· ${count!.toLocaleString()} playing`;
            rating.after(text);
          }
        }
      } finally {
        busy = false;
      }
    };
    const intersection = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            intersection.unobserve(entry.target);
            queued.add(entry.target);
          }
        void load();
      },
      { rootMargin: '120px' },
    );
    signal.addEventListener(
      'abort',
      () => {
        intersection.disconnect();
        queued = new Set();
      },
      { once: true },
    );
    watchDom(signal, () => {
      for (const tile of document.querySelectorAll('[data-testid="wide-game-tile"]')) {
        const rating = tile.querySelector('[data-testid="game-tile-stats-rating"]');
        const native = tile.querySelector('[data-testid="game-tile-stats-player-count"]');
        const injected = tile.querySelector('[data-creator-toolkit-owner="wide-player-counts"]');
        if (native || !rating) {
          injected?.remove();
          seen.delete(tile);
          continue;
        }
        const href = tile.querySelector('a[href*="/games/"]')?.getAttribute('href');
        const previous = seen.get(tile);
        if (!href || (previous?.href === href && previous.rating === rating)) continue;
        seen.set(tile, { href, rating });
        injected?.remove();
        intersection.observe(tile);
      }
    });
  },
};

export const detailedDates: FeatureDefinition = {
  ...base,
  id: 'detailed-experience-dates',
  category: 'experiences',
  title: 'Detailed created and updated dates',
  description: 'Show precise experience timestamps in your browser’s locale.',
  availability: 'Experience pages with creation and update stats.',
  routes: [{ hostnames, path: experiencePath }],
  activate({ route, signal }) {
    const place = experiencePath.exec(route.pathname)?.[1];
    if (!place) return;
    let data: Stats | undefined;
    let started = false;
    const update = () => {
      const stats = document.querySelector('.game-stat-container');
      if (!stats) return;
      if (!started) {
        started = true;
        void universeForPlace(place, signal)
          .then((id) => robloxApi('games', id, { signal }))
          .then((result) => {
            data = result?.data?.[0];
            if (!signal.aborted) update();
          })
          .catch(() => undefined);
      }
      if (!data) return;
      const present = new Set<string>();
      for (const stat of stats.querySelectorAll('.game-stat')) {
        const key = statDateKey(stat);
        if (!key) continue;
        present.add(key);
        const value = stat.querySelector('.text-lead');
        if (
          !value ||
          value.querySelector('time, .rovalra-interactive-timestamp') ||
          value.childElementCount
        )
          continue;
        const time = exactTime(data[key]);
        if (!time) continue;
        const original = [...value.childNodes];
        value.replaceChildren(time);
        signal.addEventListener(
          'abort',
          () => {
            if (time.parentNode === value && value.childNodes.length === 1)
              value.replaceChildren(...original);
          },
          { once: true },
        );
      }
      const language = document.documentElement.lang.toLowerCase().split('-')[0];
      const labels = dateLabels[language] ?? dateLabels.en;
      for (const [index, key] of (['created', 'updated'] as const).entries()) {
        if (present.has(key)) continue;
        const time = exactTime(data[key]);
        if (!time) continue;
        const stat = ownedElement('li', 'detailed-experience-dates', signal);
        stat.className = 'game-stat';
        stat.dataset.testid = `rovex-game-stat-${key}`;
        const label = document.createElement('p');
        label.className = 'text-label font-caption-header';
        label.textContent = labels[index];
        const value = document.createElement('p');
        value.className = 'text-lead font-caption-body';
        value.append(time);
        stat.append(label, value);
        stats.append(stat);
      }
    };
    watchDom(signal, update);
  },
};
