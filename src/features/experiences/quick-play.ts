import type { FeatureDefinition } from '../../registry/types';
import { experiencePath } from '../../api/roblox-data';
import { ownedElement, watchDom } from '../../core/live-dom';
import { message } from '../../localization/messages';
import styles from './quick-play.css?inline';
import { openLaunchDialog } from './launch-dialog';
import { experienceCardLinks as links, experienceCardWrapper } from './cards';
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
  settings: [
    { key: 'show-servers', kind: 'boolean', label: 'Show Servers shortcut', default: true },
  ],
  activate({ signal, record }) {
    const attached = new Map<
      Element,
      { area: HTMLElement; button: HTMLAnchorElement; servers: HTMLAnchorElement }
    >();
    const style = ownedElement('style', 'quick-play-style', signal);
    style.textContent = styles;
    document.head.append(style);
    const remove = (tile: Element, area: HTMLElement) => {
      area.remove();
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
        if (!place) continue;
        const container = experienceCardWrapper(link);
        if (!container || found.has(container) || container.querySelector(native)) continue;
        found.add(container);
        let row = attached.get(container);
        if (!row?.area.isConnected) {
          const area = document.createElement('div');
          area.dataset.rovexQuickActions = '';
          const button = ownedElement('a', 'quick-play', signal);
          const playIcon = document.createElement('span');
          playIcon.className = 'rovex-play-icon';
          playIcon.setAttribute('aria-hidden', 'true');
          button.append(playIcon, message('quick_play', 'Play'));
          const servers = document.createElement('a');
          servers.textContent = 'Servers';
          servers.hidden = record.options['show-servers'] !== true;
          button.addEventListener(
            'click',
            (event) => {
              if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
              const place = button.dataset.place;
              const cardLink = container.querySelector<HTMLAnchorElement>(links);
              if (!place || !cardLink) return;
              event.preventDefault();
              const name =
                cardLink.getAttribute('aria-label') ||
                cardLink.textContent?.trim() ||
                'Roblox experience';
              openLaunchDialog(place, name, cardLink.querySelector('img')?.currentSrc, signal);
            },
            { signal },
          );
          area.append(button, servers);
          container.setAttribute(marker, '');
          if (link.parentElement === container) link.after(area);
          else container.append(area);
          row = { area, button, servers };
          attached.set(container, row);
        }
        const { button, servers } = row;
        button.dataset.place = place;
        const href = `roblox://experiences/start?placeId=${place}`;
        if (button.getAttribute('href') !== href) button.href = href;
        const serversHref = `/games/${place}#!/game-instances`;
        if (servers.getAttribute('href') !== serversHref) servers.href = serversHref;
        const title = link.getAttribute('aria-label') || link.textContent?.trim() || 'experience';
        const label = message('quick_play_title', 'Play $1', title);
        if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
      }
      for (const [tile, { area }] of attached) if (!found.has(tile)) remove(tile, area);
    });
    signal.addEventListener(
      'abort',
      () => {
        for (const [tile, { area }] of attached) remove(tile, area);
      },
      { once: true },
    );
  },
};
