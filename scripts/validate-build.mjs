import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import process from 'node:process';
import { log } from 'node:console';

const tag = process.argv[2];
const versionPattern = /^(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})$/;
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const metadata = json('package.json');
const lock = json('package-lock.json');
const source = json('public/manifest.json');
const manifest = json('dist/manifest.json');
const version = metadata.version;
const assert = (valid, message) => {
  if (!valid) throw new Error(message);
};
assert(
  typeof version === 'string' &&
    versionPattern.test(version) &&
    version !== '0.0.0' &&
    version.split('.').every((part) => Number(part) <= 65535),
  'Invalid release version',
);
assert(
  [source.version, manifest.version, lock.version, lock.packages?.['']?.version].every(
    (value) => value === version,
  ),
  'Package, lockfile and manifest versions must agree',
);
assert(!tag || tag === `v${version}`, 'Tag must match the package version');
assert(
  JSON.stringify(manifest) === JSON.stringify(source),
  'Built manifest must match the source manifest',
);
assert(
  manifest.manifest_version === 3 && manifest.name === 'RoVex',
  'Invalid Manifest V3 identity',
);
assert(
  manifest.content_scripts?.length &&
    manifest.content_scripts.every(
      (entry) => entry.matches?.length === 1 && entry.matches[0] === 'https://www.roblox.com/*',
    ),
  'Unexpected content script scope',
);

const root = resolve('dist');
const output = readdirSync(root, { recursive: true }).map((name) => name.replaceAll('\\', '/'));
assert(
  !output.some((name) =>
    /(?:\.map$|(?:^|\/)(?:node_modules|tests|local-reference|Roblox2016|RobloxRigs)(?:\/|$))/.test(
      name,
    ),
  ),
  'Production build contains development files',
);
const check = (file) => {
  assert(
    typeof file === 'string' && /^[\w./-]+$/.test(file) && !file.split('/').includes('..'),
    `Invalid build path: ${file}`,
  );
  const path = resolve(root, file);
  assert(
    path.startsWith(root + sep) && statSync(path).isFile() && statSync(path).size > 0,
    `Missing build file: ${file}`,
  );
  return path;
};
const popup = check(manifest.action?.default_popup);
const locale = json(check(`_locales/${manifest.default_locale}/messages.json`));
assert(
  manifest.default_locale === 'en' && locale.extension_description?.message,
  'Missing manifest locale',
);
check(manifest.background?.service_worker);
for (const entry of manifest.content_scripts) {
  for (const file of [...(entry.js ?? []), ...(entry.css ?? [])]) check(file);
}
const popupAssets = [...readFileSync(popup, 'utf8').matchAll(/(?:src|href)="(\/?assets\/[^"]+)"/g)];
assert(
  popupAssets.some(([, file]) => file.endsWith('.js')),
  'Missing popup JavaScript reference',
);
for (const [, file] of popupAssets) check(file.replace(/^\//, ''));

const changelog = readFileSync('CHANGELOG.md', 'utf8');
const versionHeading = `## [${version}] - `;
const section = changelog
  .split(/^## (?=\[)/m)
  .find((part) => `## ${part}`.startsWith(versionHeading));
assert(
  section && /^\[\d+\.\d+\.\d+\] - \d{4}-\d{2}-\d{2}\r?\n/.test(section),
  'Missing dated changelog section',
);
if (process.argv.includes('--notes')) {
  const notes = section.slice(section.indexOf('\n') + 1).trim();
  assert(notes.length > 0, 'Release notes are empty');
  log(notes);
} else {
  log(`Validated RoVex ${version} and ${popupAssets.length} popup assets.`);
}
