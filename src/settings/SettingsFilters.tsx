import { useCallback, useId, useRef, useState } from 'react';
import { contributors, type ContributorId } from '../registry/contributors';
import { Identity } from './Contributors';
import { contributions, featureStatuses, type Profile, type Status } from './contributor-data';
import { Popover } from '../components/Popover';

export function SettingsFilters({
  statuses,
  setStatuses,
  contributor,
  setContributor,
  profiles,
}: {
  statuses: Status[];
  setStatuses: (value: Status[]) => void;
  contributor: ContributorId | '';
  setContributor: (id: ContributorId | '') => void;
  profiles: Record<string, Profile>;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const close = useCallback(() => setOpen(false), []);
  const count = statuses.length + Number(Boolean(contributor));
  const visibleContributors = contributors.filter(
    (member) =>
      member.id === contributor ||
      [member.username, profiles[member.id]?.name].some((name) =>
        name?.toLowerCase().includes(search.trim().toLowerCase()),
      ),
  );
  return (
    <>
      <button
        className="ct-filter-trigger"
        type="button"
        ref={trigger}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-haspopup="dialog"
        aria-label={count ? `Filters (${count} active)` : 'Filters'}
        title="Filters"
        data-active={count > 0 || undefined}
        onClick={() => setOpen(!open)}
      >
        <svg
          viewBox="0 0 20 20"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M3 5h14M5.5 10h9M8 15h4" />
        </svg>
      </button>
      {open && (
        <Popover id={id} anchor={trigger} close={close}>
          <fieldset>
            <legend>Feature status</legend>
            {featureStatuses.map((status) => (
              <label className="ct-filter-option" key={status}>
                <input
                  type="checkbox"
                  checked={statuses.includes(status)}
                  onChange={(event) =>
                    setStatuses(
                      event.target.checked
                        ? [...statuses, status]
                        : statuses.filter((value) => value !== status),
                    )
                  }
                />{' '}
                {status[0].toUpperCase() + status.slice(1)}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Contributor</legend>
            <label className="ct-filter-search">
              <input
                type="search"
                aria-label="Search contributors"
                placeholder="Search contributors"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="ct-filter-option">
              <input
                type="radio"
                name="contributor"
                checked={!contributor}
                onChange={() => setContributor('')}
              />{' '}
              All contributors
            </label>
            {visibleContributors.map((member) => (
              <label className="ct-filter-option ct-filter-contributor" key={member.id}>
                <input
                  type="radio"
                  name="contributor"
                  checked={contributor === member.id}
                  onChange={() => setContributor(member.id)}
                />
                <Identity member={member} profile={profiles[member.id]} />
                <span>{contributions(member.id).length}</span>
              </label>
            ))}
          </fieldset>
          {!visibleContributors.length && <p>No contributors found.</p>}
          <button
            type="button"
            className="ct-secondary ct-filter-clear"
            disabled={!count && !search}
            onClick={() => {
              setStatuses([]);
              setContributor('');
              setSearch('');
            }}
          >
            Clear filters
          </button>
        </Popover>
      )}
    </>
  );
}
