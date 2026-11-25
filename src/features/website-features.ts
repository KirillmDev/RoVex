import { createIdCopyFeature, pathSegmentId } from './shared/id-copy-feature';

export const websiteFeatures = [
  createIdCopyFeature({
    id: 'copy-bundle-id',
    category: 'marketplace',
    title: 'Copy Bundle ID',
    description: 'Copy the bundle ID for use in Roblox tools.',
    availability: 'Appears on Marketplace bundle pages.',
    idLabel: 'Bundle ID',
    supportedSites: ['roblox'],
    routes: [
      {
        hostnames: ['www.roblox.com'],
        path: /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?bundles\/\d+(?:\/|$)/i,
      },
    ],
    extract: ({ pathname }) => pathSegmentId(pathname, 'bundles'),
  }),
];
