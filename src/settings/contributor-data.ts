import { useEffect, useState } from 'react';
import { robloxApi, robloxId } from '../api/roblox-data';
import { websiteFeatureRegistry, type FeatureDefinition } from '../registry';
import { contributors, type ContributorId } from '../registry/contributors';
export type Profile = { name?: string; verified?: boolean; image?: string };
export const featureStatuses = ['stable', 'beta', 'experimental', 'deprecated', 'locked'] as const;
export type Status = (typeof featureStatuses)[number];
export const featureStatus = (feature: FeatureDefinition): Status =>
  feature.status === 'disabled' ? 'locked' : (feature.status ?? 'stable');
export const contributions = (id: ContributorId) =>
  websiteFeatureRegistry.filter((feature) => feature.contributorIds?.includes(id));

export function useContributorProfiles() {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [state, setState] = useState<'loading' | 'ready' | 'partial'>('loading');
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const update = (id: string, value: Profile) => {
      if (!signal.aborted)
        setProfiles((previous) => ({ ...previous, [id]: { ...previous[id], ...value } }));
    };
    const requests = contributors.map(async ({ id }) => {
      const profile = await robloxApi('user', id, { signal });
      if (robloxId(profile?.id) !== id) throw new Error('Profile unavailable');
      update(id, {
        name: [profile.displayName, profile.name].find(
          (name) => typeof name === 'string' && name.trim(),
        ),
        verified: profile.hasVerifiedBadge === true,
      });
    });
    const headshots = robloxApi('headshots', contributors.map(({ id }) => id).join(','), {
      signal,
    }).then((result) => {
      if (!Array.isArray(result?.data)) throw new Error('Headshots unavailable');
      for (const thumbnail of result.data) {
        const id = robloxId(thumbnail?.targetId);
        if (
          id &&
          contributors.some((member) => member.id === id) &&
          thumbnail.state === 'Completed' &&
          typeof thumbnail.imageUrl === 'string' &&
          /^https:\/\/[\w-]+\.rbxcdn\.com\//i.test(thumbnail.imageUrl)
        )
          update(id, { image: thumbnail.imageUrl });
      }
    });
    void Promise.allSettled([...requests, headshots]).then((results) => {
      if (!signal.aborted)
        setState(results.some(({ status }) => status === 'rejected') ? 'partial' : 'ready');
    });
    return () => controller.abort();
  }, []);
  return { profiles, state };
}
