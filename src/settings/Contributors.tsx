import { useEffect, useRef, useState } from 'react';
import { contributions, featureStatus, type Profile } from './contributor-data';
import { verificationIcon } from '../components/dom';
import { categories, websiteFeatureRegistry } from '../registry';
import { contributors, type Contributor, type ContributorId } from '../registry/contributors';

export function Identity({ member, profile }: { member: Contributor; profile?: Profile }) {
  return (
    <>
      <span className="ct-team-avatar" aria-hidden="true">
        {profile?.image && (
          <img
            src={profile.image}
            alt=""
            width={48}
            height={48}
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
        {member.username[0]}
      </span>
      <strong>
        {profile?.name || member.username}
        {profile?.verified && (
          <span
            ref={(node) => {
              if (node && !node.firstChild)
                node.append(verificationIcon('Roblox verified account'));
            }}
          />
        )}
      </strong>
    </>
  );
}

export function ContributorSettings({
  profiles,
  state,
  showCredits,
  developerMode,
  onPreferences,
  onOpen,
}: {
  profiles: Record<string, Profile>;
  state: string;
  showCredits: boolean;
  developerMode: boolean;
  onPreferences: (patch: { showCredits?: boolean; developerMode?: boolean }) => void;
  onOpen: (id: ContributorId) => void;
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('most');
  const members = contributors
    .filter((member) =>
      [member.username, profiles[member.id]?.name].some((name) =>
        name?.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    )
    .sort(
      (a, b) =>
        (sort === 'most' ? -1 : 1) * (contributions(a.id).length - contributions(b.id).length),
    );
  const total = websiteFeatureRegistry.reduce(
    (sum, feature) => sum + (feature.contributorIds?.length ?? 0),
    0,
  );
  return (
    <section className="ct-contributor-panel">
      <p>{total} registered feature contributions</p>
      <div className="ct-contributor-tools">
        <label>
          Find contributors{' '}
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label>
          Sort{' '}
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="most">Most</option>
            <option value="least">Least</option>
          </select>
        </label>
      </div>
      <label>
        <input
          type="checkbox"
          checked={showCredits}
          onChange={(event) => onPreferences({ showCredits: event.target.checked })}
        />{' '}
        Show feature contributors
      </label>
      <label>
        <input
          type="checkbox"
          checked={developerMode}
          onChange={(event) => onPreferences({ developerMode: event.target.checked })}
        />{' '}
        Developer Mode
      </label>
      <div role="status">
        {state === 'loading'
          ? 'Loading public profiles…'
          : state === 'partial'
            ? 'Some public profile details are unavailable.'
            : ''}
      </div>
      <ul className="ct-team-list">
        {members.map((member) => (
          <li key={member.id} className="ct-contributor-row">
            <button className="ct-team-row" type="button" onClick={() => onOpen(member.id)}>
              <Identity member={member} profile={profiles[member.id]} />
              <span>{contributions(member.id).length}</span>
            </button>
            <a
              href={`https://www.roblox.com/users/${member.id}/profile`}
              aria-label={`Roblox profile of ${member.username}`}
            >
              Profile
            </a>
          </li>
        ))}
      </ul>
      {!members.length && <p>No contributors match your search.</p>}
    </section>
  );
}

export function ContributionsDialog({
  member,
  profile,
  developerMode,
  onClose,
  onNavigate,
}: {
  member: Contributor;
  profile?: Profile;
  developerMode: boolean;
  onClose: () => void;
  onNavigate: (id?: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    const opener = (element.getRootNode() as ShadowRoot).activeElement;
    element.showModal();
    return () => {
      if (element.open) element.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  const features = contributions(member.id);
  return (
    <dialog
      ref={dialog}
      className="ct-contributions-dialog"
      aria-labelledby="ct-contributions-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="ct-contributor-tools">
        <h3 id="ct-contributions-title">
          <Identity member={member} profile={profile} />
        </h3>
        <button className="ct-secondary" onClick={onClose}>
          Close
        </button>
      </div>
      <p>{features.length} contributions</p>
      <button className="ct-secondary" onClick={() => onNavigate()}>
        View all in settings
      </button>
      <ul>
        {features.map((feature) => (
          <li key={feature.id}>
            <button type="button" className="ct-credit" onClick={() => onNavigate(feature.id)}>
              {feature.title}
            </button>
            <span>
              {categories.find(({ id }) => id === feature.category)?.title} ·{' '}
              {featureStatus(feature)}
            </span>
            {developerMode && <code>{feature.id}</code>}
          </li>
        ))}
      </ul>
      {!features.length && <p>No feature-level credits have been recorded for this profile.</p>}
    </dialog>
  );
}
