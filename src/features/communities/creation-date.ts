import type { FeatureDefinition } from '../../registry/types';
import { communityPath, robloxApi } from '../../api/roblox-data';
import { exactTime, ownedElement, watchDom } from '../../core/live-dom';
export const communityCreationDate: FeatureDefinition = {
  supportedSites: ['roblox'],
  defaultEnabled: false,
  settings: [],
  id: 'community-creation-date',
  category: 'communities',
  title: 'Community creation date',
  description: 'Show the exact creation date when Roblox makes it publicly available.',
  availability: 'Community headers with a date returned by Roblox.',
  routes: [{ hostnames: ['www.roblox.com'], path: communityPath }],
  activate({ route, signal }) {
    const id = communityPath.exec(route.pathname)?.[1];
    if (!id) return;
    let started = false;
    let date: string | undefined;
    const update = () => {
      const header = document.querySelector(
        '.profile-header-details-owner-name, .group-header, [data-testid="community-header"]',
      );
      if (
        !header ||
        document.querySelector(
          '.rovalra-group-created-date, .roseal-group-stats .group-created-date, [data-creator-toolkit-owner="community-creation-date"]',
        )
      )
        return;
      if (!started) {
        started = true;
        void robloxApi('community', id, { signal })
          .then((data) => {
            date = data?.data?.find((row) => String(row.id) === id)?.created;
            if (!signal.aborted) update();
          })
          .catch(() => undefined);
      }
      const time = exactTime(date);
      if (!time) return;
      const row = ownedElement('div', 'community-creation-date', signal);
      row.className = 'text-caption-medium';
      row.append('Created ', time);
      if (header.matches('.profile-header-details-owner-name')) header.after(row);
      else header.append(row);
    };
    watchDom(signal, update);
  },
};
