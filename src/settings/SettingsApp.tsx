import { useEffect, useMemo, useRef, useState } from 'react';
import {
  categories,
  websiteFeatureRegistry as featureRegistry,
  type FeatureDefinition,
  type FeatureRecord,
} from '../registry';
import {
  getRuntimeSettings,
  resetFeatureSettings,
  setFeature,
  setGlobal,
} from '../storage/chrome-storage';
import {
  applyImport,
  downloadSettingsExport,
  previewImport,
  resetAllSettings,
  type ImportPreview,
} from '../storage/import-export';
import {
  GLOBAL_KEY,
  SETTINGS_PRESENTATION_KEY as preferencesKey,
  featureKey,
} from '../storage/schema';
import { featureMessage, message } from '../localization/messages';
import { SettingField } from '../components/SettingField';
import { About } from './About';
import { contributors, type ContributorId } from '../registry/contributors';
import { ContributorSettings, ContributionsDialog } from './Contributors';
import { ContributorBadge } from './ContributorBadge';
import { featureStatus, useContributorProfiles, type Status } from './contributor-data';
import { SettingsFilters } from './SettingsFilters';

type Records = Record<string, FeatureRecord>;

function matchesSearch(feature: FeatureDefinition, query: string, developerMode: boolean) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    feature.title,
    feature.description,
    featureMessage(feature.id, 'title', feature.title),
    featureMessage(feature.id, 'description', feature.description),
    categories.find(({ id }) => id === feature.category)?.title ?? '',
    developerMode ? feature.id : '',
    ...feature.settings.flatMap((setting) => [
      setting.label,
      featureMessage(feature.id, `setting_${setting.key}_label`, setting.label),
      setting.description ?? '',
      ...(setting.keywords ?? []),
    ]),
  ].some((value) => value.toLowerCase().includes(normalized));
}

function closeSettings() {
  const url = new URL(location.href);
  url.searchParams.delete('creatorToolkit');
  history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new CustomEvent('creator-toolkit:navigation'));
}

const availableCategories = [
  ...categories.filter((category) =>
    featureRegistry.some((feature) => feature.category === category.id),
  ),
  { id: 'about', title: message('about_heading', 'About RoVex'), description: '', site: 'roblox' },
  { id: 'contributors', title: 'Contributors', description: '', site: 'roblox' },
];

export function SettingsApp() {
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [records, setRecords] = useState<Records>({});
  const [selectedCategory, setSelectedCategory] = useState(availableCategories[0].id);
  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [contributor, setContributor] = useState<ContributorId | ''>('');
  const [dialog, setDialog] = useState<ContributorId>();
  const [target, setTarget] = useState<string>();
  const [preferences, setPreferences] = useState({ showCredits: true, developerMode: false });
  const { profiles, state: profilesState } = useContributorProfiles();
  const filtering = Boolean(query.trim() || statuses.length || contributor);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const { enabled, records } = await getRuntimeSettings(featureRegistry);
    setGlobalEnabled(enabled);
    setRecords(Object.fromEntries(records));
  };

  useEffect(() => {
    queueMicrotask(() => void refresh());
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes[GLOBAL_KEY] || featureRegistry.some(({ id }) => changes[featureKey(id)]))
        void refresh();
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => {
      chrome.storage.onChanged.removeListener(onStorage);
    };
  }, []);

  useEffect(() => {
    const apply = (value: unknown) => {
      const stored = value as Partial<typeof preferences> | undefined;
      setPreferences({
        showCredits: stored?.showCredits !== false,
        developerMode: stored?.developerMode === true,
      });
    };
    void chrome.storage.local.get(preferencesKey).then((result) => apply(result[preferencesKey]));
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes[preferencesKey]) apply(changes[preferencesKey].newValue);
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => chrome.storage.onChanged.removeListener(onStorage);
  }, []);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!target) return;
    const card = content.current?.querySelector<HTMLElement>(`#feature-${target}`);
    if (card) {
      card.scrollIntoView?.({ block: 'nearest' });
      card.focus();
    }
  }, [target, selectedCategory, records]);

  const visibleFeatures = useMemo(
    () =>
      featureRegistry.filter(
        (feature) =>
          matchesSearch(feature, query, preferences.developerMode) &&
          (!statuses.length || statuses.includes(featureStatus(feature))) &&
          (!contributor || feature.contributorIds?.includes(contributor)) &&
          (filtering || feature.category === selectedCategory),
      ),
    [query, selectedCategory, preferences.developerMode, statuses, contributor, filtering],
  );
  const selected =
    availableCategories.find(({ id }) => id === selectedCategory) ?? availableCategories[0];

  const updateFeature = async (feature: FeatureDefinition, next: FeatureRecord) => {
    setRecords((current) => ({ ...current, [feature.id]: next }));
    await setFeature(feature, next);
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    setImportBusy(true);
    try {
      if (file.size > 1024 * 1024) {
        setPreview({ valid: false, errors: ['The import file exceeds 1 MB.'], changes: [] });
      } else {
        setPreview(await previewImport(JSON.parse(await file.text())));
      }
    } catch {
      setPreview({ valid: false, errors: ['The selected file is not valid JSON.'], changes: [] });
    } finally {
      setImportBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handleCategoryKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? availableCategories.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + availableCategories.length) %
            availableCategories.length;
    const buttons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('.ct-category');
    buttons?.[next]?.focus();
    setQuery('');
    setStatuses([]);
    setContributor('');
    setTarget(undefined);
    setSelectedCategory(availableCategories[next].id);
  };

  return (
    <section className="ct-shell" aria-labelledby="ct-title">
      <header className="ct-header">
        <div className="ct-brand">
          <h1 id="ct-title">{message('settings_heading', 'RoVex Settings')}</h1>
          <p>Customize RoVex enhancements for the Roblox website.</p>
        </div>
        <label className="ct-master">
          <span>Enable RoVex</span>
          <input
            className="ct-switch"
            type="checkbox"
            checked={globalEnabled}
            onChange={async (event) => {
              const enabled = event.target.checked;
              setGlobalEnabled(enabled);
              await setGlobal({ enabled });
            }}
          />
        </label>
        <button className="ct-close" type="button" onClick={closeSettings}>
          Back to Roblox settings
        </button>
      </header>
      {!globalEnabled && (
        <p className="ct-disabled-note">
          Features are paused. Settings remain available so you can turn RoVex back on.
        </p>
      )}
      <div className="ct-body">
        <aside className="ct-sidebar" aria-label="Settings categories">
          <div className="ct-search-row">
            <input
              className="ct-search"
              type="search"
              placeholder="Search settings"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search RoVex settings"
            />
            <SettingsFilters
              statuses={statuses}
              setStatuses={setStatuses}
              contributor={contributor}
              setContributor={setContributor}
              profiles={profiles}
            />
          </div>
          <nav className="ct-categories" aria-label="Feature categories">
            {(['roblox'] as const).map((site) => (
              <div className="ct-site-group" key={site}>
                <p className="ct-site-label">Roblox website</p>
                {availableCategories
                  .filter((category) => category.site === site)
                  .map((category) => {
                    const index = availableCategories.indexOf(category);
                    return (
                      <button
                        key={category.id}
                        className="ct-category"
                        type="button"
                        aria-current={
                          !filtering && category.id === selectedCategory ? 'page' : undefined
                        }
                        onClick={() => {
                          setQuery('');
                          setStatuses([]);
                          setContributor('');
                          setTarget(undefined);
                          setSelectedCategory(category.id);
                        }}
                        onKeyDown={(event) => handleCategoryKey(event, index)}
                      >
                        {category.title}
                      </button>
                    );
                  })}
              </div>
            ))}
          </nav>
          <div className="ct-tools">
            <button
              className="ct-secondary"
              type="button"
              onClick={() => void downloadSettingsExport()}
            >
              Export
            </button>
            <button
              className="ct-secondary"
              type="button"
              disabled={importBusy}
              onClick={() => fileInput.current?.click()}
            >
              Import
            </button>
            <input
              ref={fileInput}
              hidden
              type="file"
              accept="application/json,.json"
              onChange={(event) => void handleImport(event.target.files?.[0])}
            />
            <button
              className="ct-danger"
              type="button"
              onClick={() => {
                if (confirm('Reset all RoVex settings and saved feature data?'))
                  void resetAllSettings().then(refresh);
              }}
            >
              Reset all
            </button>
          </div>
        </aside>
        <div className="ct-content" ref={content}>
          <div className="ct-content-header">
            <h2>{filtering ? 'Search results' : selected.title}</h2>
            {(query || selected.description) && (
              <p>{query ? `Settings matching “${query}”` : selected.description}</p>
            )}
          </div>
          {!filtering && selectedCategory === 'about' && <About profiles={profiles} />}
          {!filtering && selectedCategory === 'contributors' && (
            <ContributorSettings
              profiles={profiles}
              state={profilesState}
              {...preferences}
              onOpen={setDialog}
              onPreferences={(patch) => {
                const next = { ...preferences, ...patch };
                setPreferences(next);
                void chrome.storage.local.set({ [preferencesKey]: next });
              }}
            />
          )}
          {!filtering && selectedCategory === 'website-customization' && (
            <div className="ct-native-preferences">
              <div>
                <h3>Roblox browser preferences</h3>
                <p>Set Roblox’s built-in theme to Light, Dark, or System.</p>
              </div>
              <a
                className="ct-secondary"
                href="https://www.roblox.com/my/account#!/browser-preferences"
              >
                Open browser preferences
              </a>
            </div>
          )}
          <div className="ct-card-list">
            {visibleFeatures.map((feature) => {
              const record = records[feature.id];
              if (!record) return null;
              return (
                <article
                  className="ct-card"
                  key={feature.id}
                  id={`feature-${feature.id}`}
                  tabIndex={-1}
                >
                  <div className="ct-card-head">
                    <div>
                      <h3>
                        {featureMessage(feature.id, 'title', feature.title)}
                        {featureStatus(feature) !== 'stable' && (
                          <span className="ct-status">{featureStatus(feature)}</span>
                        )}
                      </h3>
                      <p>{featureMessage(feature.id, 'description', feature.description)}</p>
                      {feature.statusReason && <p>{feature.statusReason}</p>}
                      {feature.dependencies?.length ? (
                        <p>
                          Requires{' '}
                          {feature.dependencies
                            .map(
                              (id) => featureRegistry.find((entry) => entry.id === id)?.title ?? id,
                            )
                            .join(', ')}
                        </p>
                      ) : null}
                      {preferences.showCredits && (
                        <div className="ct-credits-inline">
                          {contributors
                            .filter((member) => feature.contributorIds?.includes(member.id))
                            .map((member) => (
                              <ContributorBadge
                                key={member.id}
                                member={member}
                                profile={profiles[member.id]}
                                onOpen={() => setDialog(member.id)}
                              />
                            ))}
                        </div>
                      )}
                      {feature.status === 'disabled' && feature.disabledReason && (
                        <p className="ct-disabled-reason">{feature.disabledReason}</p>
                      )}
                    </div>
                    <input
                      className="ct-switch"
                      type="checkbox"
                      aria-label={message(
                        'enable_feature',
                        'Enable $1',
                        featureMessage(feature.id, 'title', feature.title),
                      )}
                      checked={record.enabled}
                      disabled={featureStatus(feature) === 'locked'}
                      onChange={(event) =>
                        void updateFeature(feature, { ...record, enabled: event.target.checked })
                      }
                    />
                  </div>
                  {record.enabled && feature.settings.length > 0 && (
                    <div className="ct-options">
                      {feature.settings.map((setting) => {
                        const id = `ct-${feature.id}-${setting.key}`;
                        const value = record.options[setting.key];
                        const commit = (nextValue: unknown) =>
                          void updateFeature(feature, {
                            ...record,
                            options: { ...record.options, [setting.key]: nextValue },
                          });
                        return (
                          <SettingField
                            key={setting.key}
                            featureId={feature.id}
                            id={id}
                            setting={setting}
                            value={value}
                            commit={commit}
                          />
                        );
                      })}
                    </div>
                  )}
                  {(record.enabled !== feature.defaultEnabled ||
                    feature.settings.some(
                      (setting) => record.options[setting.key] !== setting.default,
                    )) && (
                    <button
                      className="ct-secondary ct-reset-feature"
                      type="button"
                      onClick={() =>
                        void resetFeatureSettings(feature).then((next) =>
                          setRecords((current) => ({ ...current, [feature.id]: next })),
                        )
                      }
                    >
                      {message('reset_feature', 'Reset feature settings')}
                    </button>
                  )}
                </article>
              );
            })}
            {!visibleFeatures.length &&
              (filtering || !['about', 'contributors'].includes(selectedCategory)) && (
                <div className="ct-empty">No settings match this search.</div>
              )}
          </div>
        </div>
      </div>
      {dialog && (
        <ContributionsDialog
          member={contributors.find(({ id }) => id === dialog)!}
          profile={profiles[dialog]}
          developerMode={preferences.developerMode}
          onClose={() => setDialog(undefined)}
          onNavigate={(id) => {
            setDialog(undefined);
            setQuery('');
            setStatuses([]);
            setContributor(id ? '' : dialog);
            setTarget(id);
            const feature = featureRegistry.find((entry) => entry.id === id);
            if (feature) setSelectedCategory(feature.category);
          }}
        />
      )}
      {preview && (
        <section className="ct-import-panel" role="region" aria-labelledby="ct-import-title">
          <div className="ct-import-copy">
            <h2 id="ct-import-title">Import preview</h2>
            {preview.valid ? (
              <>
                <p>The following settings will change:</p>
                <ul>
                  {preview.changes.length ? (
                    preview.changes.map((change) => <li key={change}>{change}</li>)
                  ) : (
                    <li>No differences found.</li>
                  )}
                </ul>
              </>
            ) : (
              <>
                <p className="ct-error">This file cannot be imported:</p>
                <ul className="ct-error">
                  {preview.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="ct-modal-actions">
            <button className="ct-secondary" type="button" onClick={() => setPreview(null)}>
              Cancel
            </button>
            {preview.valid && (
              <button
                className="ct-primary"
                type="button"
                onClick={() =>
                  void applyImport(preview).then(() => {
                    setPreview(null);
                    return refresh();
                  })
                }
              >
                Confirm import
              </button>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
