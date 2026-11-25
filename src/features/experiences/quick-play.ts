import type { FeatureDefinition } from '../../registry/types';
import { experiencePath } from '../../api/roblox-data';
import { ownedElement, watchDom } from '../../core/live-dom';
import { message } from '../../localization/messages';
import styles from './quick-play.css?inline';

const links =
  'a.game-card-link[href], a.sdui-game-tile-wrapper[href], a.sdui-game-tile-primary[href], [data-testid="wide-game-tile"] a[href*="/games/"]';
const tiles =
  '[data-testid="wide-game-tile"], .game-card-container, .game-card, .sdui-game-tile-wrapper, [data-testid^="sdui-carousel-item"]';
const native =
  '.sdui-play-button, [data-testid="quick-play-button"], [class*="rovalra-quick-play"], [class*="rovalra-quickplay"]';
const marker = 'data-rovex-quick-play';

export const quickPlay: FeatureDefinition = {
  id: 'quick-play',
  category: 'experiences',
  title: 'Quick Play on cards',
  description: 'Open a public experience in the Roblox app directly from its card.',
  availability: 'Standard and wide experience cards. Requires the Roblox app.',
  supportedSites: ['roblox'],
  routes: [{ hostnames: ['www.roblox.com'] }],
  defaultEnabled: false,
  settings: [],
  activate({ signal }) {
    const attached = new Map<Element, HTMLAnchorElement>();
    const style = ownedElement('style', 'quick-play-style', signal);
    style.textContent = styles;
    document.head.append(style);
    const remove = (tile: Element, play: HTMLAnchorElement) => {
      play.remove();
      tile.removeAttribute(marker);
      attached.delete(tile);
    };
    watchDom(signal, () => {
      const found = new Set<Element>();
      for (const link of document.querySelectorAll<HTMLAnchorElement>(links)) {
        const url = new URL(link.href);
        const place =
          url.origin === 'https://www.roblox.com'
            ? experiencePath.exec(url.pathname)?.[1]
            : undefined;
        if (!place || link.closest('[data-testid="event-experience-link"]')) continue;
        const tile = link.closest(tiles);
        const container = tile?.closest('a') ? tile.closest('a')?.parentElement : tile;
        if (
          !container ||
          container.matches('a') ||
          found.has(container) ||
          container.querySelector(native) ||
          container.querySelectorAll(links).length > 2
        )
          continue;
        found.add(container);
        let button = attached.get(container);
        if (!button?.isConnected) {
          button = ownedElement('a', 'quick-play', signal);
          button.textContent = `▶ ${message('quick_play', 'Play')}`;
          container.setAttribute(
            marker,
            getComputedStyle(container).position === 'static' ? 'static' : 'positioned',
          );
          container.append(button);
          attached.set(container, button);
        }
        const href = `roblox://experiences/start?placeId=${place}`;
        if (button.getAttribute('href') !== href) button.href = href;
        const title = link.getAttribute('aria-label') || link.textContent?.trim() || 'experience';
        const label = message('quick_play_title', 'Play $1', title);
        if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
      }
      for (const [tile, play] of attached) if (!found.has(tile)) remove(tile, play);
    });
    signal.addEventListener(
      'abort',
      () => {
        for (const [tile, button] of attached) remove(tile, button);
      },
      { once: true },
    );
  },
};
