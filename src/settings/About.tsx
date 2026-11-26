import { contributors, type Contributor } from '../registry/contributors';
import { message } from '../localization/messages';
import { Identity } from './Contributors';
import type { Profile } from './contributor-data';
const repository = 'https://github.com/KirillmDev/RoVex';
function TeamRow({ member, profile }: { member: Contributor; profile?: Profile }) {
  return (
    <li>
      <a className="ct-team-row" href={`https://www.roblox.com/users/${member.id}/profile`}>
        <Identity member={member} profile={profile} />
        <span className="ct-team-identity">
          <span>
            {member.owner
              ? message('about_owner', 'Owner & Founder')
              : message('about_developer', 'Developer')}
          </span>
        </span>
      </a>
    </li>
  );
}

export function About({ profiles }: { profiles: Record<string, Profile> }) {
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
          {contributors.map((member) => (
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
