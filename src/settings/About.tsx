import { useEffect, useState } from 'react';
import { robloxApi, robloxId } from '../api/roblox-data';
import { verificationIcon } from '../components/dom';
import { message } from '../localization/messages';

const repository = 'https://github.com/KirillmDev/RoVex';
const team = [
  { id: '10436912462', username: 'VexorCreator', owner: true },
  { id: '4828786884', username: 'Othrylz', owner: false },
  { id: '11153363529', username: 'DevNamedKirill', owner: false },
];
type Profile = { name?: string; verified?: boolean; image?: string };

function TeamRow({ member, profile }: { member: (typeof team)[number]; profile?: Profile }) {
  return (
    <li>
      <a className="ct-team-row" href={`https://www.roblox.com/users/${member.id}/profile`}>
        <span className="ct-team-avatar" aria-hidden="true">
          {profile?.image ? (
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
          ) : null}
          {member.username.slice(0, 1)}
        </span>
        <span className="ct-team-identity">
          <strong>
            {profile?.name ?? member.username}
            {profile?.verified && (
              <span
                ref={(element) => {
                  if (element && !element.firstChild) {
                    element.append(
                      verificationIcon(message('verified_account', 'Roblox verified account')),
                    );
                  }
                }}
              />
            )}
          </strong>
          <span>
            {member.owner
              ? message('about_owner', 'Owner & Founder')
              : message('about_developer', 'Developer')}
          </span>
        </span>
        <span aria-hidden="true">›</span>
      </a>
    </li>
  );
}

export function About() {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const update = (id: string, value: Profile) => {
      if (!signal.aborted)
        setProfiles((current) => ({ ...current, [id]: { ...current[id], ...value } }));
    };
    for (const { id } of team) {
      void robloxApi('user', id, { signal })
        .then((profile) => {
          if (robloxId(profile?.id) !== id) return;
          update(id, {
            name: typeof profile.name === 'string' ? profile.name.trim() || undefined : undefined,
            verified: profile.hasVerifiedBadge === true,
          });
        })
        .catch(() => undefined);
    }
    void robloxApi('headshots', team.map(({ id }) => id).join(','), { signal })
      .then((result) => {
        if (!Array.isArray(result?.data)) return;
        for (const thumbnail of result.data) {
          const id = robloxId(thumbnail?.targetId);
          if (
            id &&
            team.some((member) => member.id === id) &&
            thumbnail.state === 'Completed' &&
            typeof thumbnail.imageUrl === 'string' &&
            /^https:\/\/[\w-]+\.rbxcdn\.com\//i.test(thumbnail.imageUrl)
          )
            update(id, { image: thumbnail.imageUrl });
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const version = globalThis.chrome?.runtime?.getManifest?.().version;
  return (
    <div className="ct-about">
      <section className="ct-about-intro">
        <span className="ct-about-icon" aria-hidden="true">
          <img
            src={chrome.runtime?.getURL?.('icons/rovex-128.png')}
            alt=""
            width={56}
            height={56}
          />
        </span>
        <div>
          <strong>RoVex</strong>
          {version && (
            <span className="ct-about-version">
              {message('about_version', 'Version $1', version)}
            </span>
          )}
          <p>
            {message('about_description', 'Useful tools and customization for the Roblox website.')}
          </p>
        </div>
      </section>
      <section aria-labelledby="ct-team-title">
        <h3 id="ct-team-title">{message('about_team', 'Development team')}</h3>
        <ul className="ct-team-list">
          {team.map((member) => (
            <TeamRow key={member.id} member={member} profile={profiles[member.id]} />
          ))}
        </ul>
      </section>
      <nav className="ct-about-links" aria-label={message('about_links', 'Project links')}>
        <a className="ct-secondary" href={repository}>
          {message('about_github', 'GitHub repository')}
        </a>
        <a className="ct-secondary" href={`${repository}/releases`}>
          {message('about_releases', 'Releases')}
        </a>
        <a className="ct-secondary" href={`${repository}/blob/main/CHANGELOG.md`}>
          {message('about_changelog', 'Changelog')}
        </a>
        <a className="ct-secondary" href={`${repository}/issues/new`}>
          {message('about_issue', 'Report an issue')}
        </a>
      </nav>
    </div>
  );
}
