import type { FeatureDefinition } from '../../registry';
import { experiencePath, robloxApi } from '../../api/roblox-data';
import {
  publicServerPage,
  type PublicServer,
  type ServerDirectory,
} from '../../api/server-directory';
import { ownedElement, watchDom } from '../../core/live-dom';
import { liveStatus } from '../../components/dom';
import styles from './experience-store.css?inline';
import tokens from '../../styles/tokens.css?inline';

const directory: ServerDirectory = async (place, options) =>
  publicServerPage(await robloxApi('public-servers', place, options));
const panels =
  '#game-instances.tab-pane, .tab-pane.game-instances, [data-testid="servers-tab-panel"]';
export const serverBrowser: FeatureDefinition = {
  id: 'public-server-browser',
  category: 'experiences',
  title: 'Public server directory',
  description: 'Browse and filter public server snapshots by occupancy, and copy instance IDs.',
  availability: 'Visible Servers panels on supported Roblox experience pages.',
  supportedSites: ['roblox'],
  routes: [{ hostnames: ['www.roblox.com'], path: experiencePath }],
  defaultEnabled: false,
  settings: [],
  activate({ route, signal }) {
    const place = experiencePath.exec(route.pathname)?.[1];
    if (!place) return;
    let active: { panel: Element; host: HTMLElement; controller: AbortController } | undefined;
    const clean = () => {
      active?.controller.abort();
      active?.host.remove();
      active = undefined;
    };
    signal.addEventListener('abort', clean, { once: true });
    watchDom(signal, () => {
      const panel = [...document.querySelectorAll(panels)].find(
        (node) =>
          !node.closest('[hidden], [aria-hidden="true"]') && node.getClientRects().length > 0,
      );
      if (active && active.panel === panel && active.host.isConnected) return;
      clean();
      if (!panel) return;
      const host = ownedElement('section', 'public-server-browser', signal);
      const controller = new AbortController();
      active = { panel, host, controller };
      const root = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent =
        tokens +
        styles +
        `
        label, button { font: inherit; }
        button { border-radius: 8px; border: 1px solid var(--rovex-control-border); color: inherit; background: var(--color-surface-100, Canvas); padding: 6px 10px; cursor: pointer; }
        code { overflow-wrap:anywhere; font-size:12px; }
        :focus-visible { outline: 2px solid var(--color-system-emphasis, Highlight); }
      `;
      const title = document.createElement('h3');
      title.textContent = 'Public servers in RoVex';
      const status = liveStatus();
      status.textContent = 'Load a snapshot of public servers.';
      const list = document.createElement('ul');
      const filterLabel = document.createElement('label');
      const filter = document.createElement('input');
      filter.type = 'checkbox';
      filterLabel.append(filter, ' Hide full servers');
      const load = document.createElement('button');
      load.textContent = 'Load public servers';
      load.type = 'button';
      const rows = new Map<string, PublicServer>();
      const cursors = new Set<string>();
      let cursor: string | undefined;
      let finished = false;
      const render = () => {
        const shown = [...rows.values()].filter(
          (server) => !filter.checked || server.playing < server.maxPlayers,
        );
        list.replaceChildren(
          ...shown.map((server) => {
            const row = document.createElement('li');
            const count = document.createElement('strong');
            count.textContent = `${server.playing} / ${server.maxPlayers} players${server.playing >= server.maxPlayers ? ' · Full' : ''}`;
            const id = document.createElement('code');
            id.textContent = server.id;
            const copy = document.createElement('button');
            copy.type = 'button';
            copy.textContent = 'Copy server ID';
            copy.addEventListener('click', () => {
              void navigator.clipboard.writeText(server.id).then(
                () => {
                  copy.textContent = 'Copied';
                },
                () => {
                  copy.textContent = 'Copy failed';
                },
              );
            });
            row.append(count, id, copy);
            return row;
          }),
        );
        status.textContent = rows.size
          ? `Showing ${shown.length} of ${rows.size} loaded servers. Counts reflect the snapshot.`
          : finished
            ? 'No public servers were returned.'
            : 'Load a snapshot of public servers.';
      };
      filter.addEventListener('change', render);
      load.addEventListener('click', async () => {
        if (load.disabled || finished) return;
        load.disabled = true;
        status.textContent = 'Loading public servers…';
        try {
          const page = await directory(place, { cursor, signal: controller.signal });
          if (controller.signal.aborted) return;
          for (const server of page.data) rows.set(server.id, server);
          cursor = page.nextPageCursor ?? undefined;
          finished = !cursor || cursors.has(cursor) || cursors.size >= 19;
          if (cursor) cursors.add(cursor);
          load.textContent = finished ? 'No more pages in this snapshot' : 'Load more';
          render();
        } catch {
          if (!controller.signal.aborted) {
            status.textContent = 'Public servers are currently unavailable.';
            load.textContent = 'Retry';
          }
        } finally {
          load.disabled = finished;
        }
      });
      root.append(style, title, status, filterLabel, load, list);
      panel.append(host);
    });
  },
};
