import { websitePreference } from '../website-preferences';

const category = 'website-customization';
const content = ':is(main, #content, .container-main)';
const paletteTarget = ':root, body, .light-theme, .dark-theme';
const palettes = {
  daylight: {
    page: '#f1f3f5',
    panel: '#ffffff',
    raised: '#e5e9ef',
    text: '#161b22',
    muted: '#485360',
    scheme: 'light',
  },
  midnight: {
    page: '#141923',
    panel: '#1c2431',
    raised: '#273346',
    text: '#f3f6fc',
    muted: '#bdc9db',
    scheme: 'dark',
  },
  graphite: {
    page: '#171717',
    panel: '#222222',
    raised: '#303030',
    text: '#f5f5f5',
    muted: '#cccccc',
    scheme: 'dark',
  },
} as const;

export const appearanceFeatures = [
  websitePreference({
    id: 'site-palette',
    category,
    title: 'Color palette',
    description: 'Restyle supported Roblox surfaces and text in this browser.',
    availability: 'Roblox pages that use Foundation theme tokens.',
    settings: [
      {
        key: 'palette',
        kind: 'select',
        label: 'Palette',
        default: 'midnight',
        options: [
          { value: 'daylight', label: 'Daylight' },
          { value: 'midnight', label: 'Midnight' },
          { value: 'graphite', label: 'Graphite' },
        ],
      },
    ],
    css({ palette }) {
      const colors = palettes[palette as keyof typeof palettes];
      return `
        ${paletteTarget} {
          color-scheme: ${colors.scheme} !important;
          --color-surface-0: ${colors.page} !important;
          --color-surface-100: ${colors.panel} !important;
          --color-surface-200: ${colors.raised} !important;
          --color-surface-300: ${colors.raised} !important;
          --color-content-emphasis: ${colors.text} !important;
          --color-content-default: ${colors.text} !important;
          --color-content-muted: ${colors.muted} !important;
          --color-common-navigation-bar: ${colors.panel} !important;
        }
        body { background-color: ${colors.page} !important; color: ${colors.text}; }
      `;
    },
  }),
  websitePreference({
    id: 'site-accent',
    category,
    title: 'Custom accent colors',
    description: 'Choose colors for primary actions and their labels.',
    availability: 'Roblox controls that use Foundation theme tokens.',
    settings: [
      { key: 'accent', kind: 'color', label: 'Button background', default: '#335fff' },
      { key: 'foreground', kind: 'color', label: 'Button text', default: '#ffffff' },
    ],
    css: ({ accent, foreground }) => `
      ${paletteTarget} {
        --color-action-emphasis-background: ${accent} !important;
        --color-action-emphasis-foreground: ${foreground} !important;
        --color-action-emphasis-background-hover: color-mix(in srgb, ${accent} 85%, ${foreground}) !important;
      }
    `,
  }),
  websitePreference({
    id: 'site-text-scale',
    category,
    title: 'Reading text size',
    description: 'Resize paragraphs and list text in the main content area.',
    availability: 'Roblox main content.',
    settings: [
      {
        key: 'size',
        kind: 'number',
        presentation: 'slider',
        label: 'Text size (px)',
        default: 16,
        min: 12,
        max: 24,
        step: 1,
      },
    ],
    css: ({ size }) => `${content} :where(p, li) { font-size: ${size}px !important; }`,
  }),
  websitePreference({
    id: 'reading-line-spacing',
    category,
    title: 'Reading line spacing',
    description: 'Adjust the space between lines in paragraphs.',
    availability: 'Roblox main content.',
    settings: [
      {
        key: 'spacing',
        kind: 'number',
        presentation: 'slider',
        label: 'Line height',
        default: 1.6,
        min: 1.2,
        max: 2,
        step: 0.1,
      },
    ],
    css: ({ spacing }) => `${content} p { line-height: ${spacing} !important; }`,
  }),
  websitePreference({
    id: 'content-width',
    category,
    title: 'Main content width',
    description: 'Set a maximum reading width on wide screens.',
    availability: 'Desktop Roblox content using the standard page container.',
    settings: [
      {
        key: 'width',
        kind: 'number',
        presentation: 'slider',
        label: 'Maximum width (px)',
        default: 1280,
        min: 960,
        max: 1920,
        step: 40,
      },
    ],
    css: ({ width }) => `
      @media (min-width: 1200px) {
        .container-main .content { max-width: ${width}px !important; margin-inline: auto; }
      }
    `,
  }),
  websitePreference({
    id: 'thumbnail-corners',
    category,
    title: 'Thumbnail corners',
    description: 'Choose square or rounded corners for experience and item thumbnails.',
    availability: 'Standard Roblox experience and item cards.',
    settings: [
      {
        key: 'radius',
        kind: 'number',
        presentation: 'slider',
        label: 'Corner radius (px)',
        default: 12,
        min: 0,
        max: 24,
        step: 1,
      },
    ],
    css: ({ radius }) => `
      ${content} :is(.game-card-thumb-container, .item-card-thumb-container) { border-radius: ${radius}px !important; overflow: hidden; }
    `,
  }),
  websitePreference({
    id: 'underline-reading-links',
    category,
    title: 'Underline links in text',
    description: 'Make links in paragraphs easier to distinguish from surrounding text.',
    availability: 'Roblox main content paragraphs.',
    css: `${content} p a[href] { text-decoration: underline !important; text-underline-offset: 0.15em; }`,
  }),
  websitePreference({
    id: 'reduce-content-motion',
    category,
    title: 'Reduce page motion',
    description: 'Shorten CSS animations and transitions in the main content area.',
    availability: 'Roblox main content CSS effects.',
    css: `
      ${content} *, ${content} *::before, ${content} *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `,
  }),
];
