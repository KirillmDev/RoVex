import { useRef, useState } from 'react';
import { contributors, type ContributorId } from '../registry/contributors';
import { Identity } from './Contributors';
import { contributions, featureStatuses, type Profile, type Status } from './contributor-data';

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
  const popover = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  return (
    <>
      <button
        className="ct-secondary"
        type="button"
        ref={trigger}
        aria-expanded={open}
        aria-controls="ct-filters"
        onClick={() => {
          if (popover.current?.matches(':popover-open')) popover.current.hidePopover();
          else {
            popover.current?.showPopover();
            popover.current?.querySelector('input')?.focus();
          }
        }}
      >
        Filters
        {statuses.length + Number(Boolean(contributor))
          ? ` (${statuses.length + Number(Boolean(contributor))})`
          : ''}
      </button>
      <div
        className="ct-filter-popover"
        id="ct-filters"
        ref={popover}
        popover="auto"
        onToggle={(event) => setOpen(event.currentTarget.matches(':popover-open'))}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            popover.current?.hidePopover();
            trigger.current?.focus();
          }
        }}
      >
        <fieldset>
          <legend>Feature status</legend>
          {featureStatuses.map((status) => (
            <label key={status}>
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
              {status}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Contributor</legend>
          <label>
            Search contributors{' '}
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            <input
              type="radio"
              name="contributor"
              checked={!contributor}
              onChange={() => setContributor('')}
            />{' '}
            All contributors
          </label>
          {contributors
            .filter((member) =>
              [member.username, profiles[member.id]?.name].some((name) =>
                name?.toLowerCase().includes(search.trim().toLowerCase()),
              ),
            )
            .map((member) => (
              <label className="ct-filter-contributor" key={member.id}>
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
        <button
          type="button"
          className="ct-secondary"
          onClick={() => {
            setStatuses([]);
            setContributor('');
            setSearch('');
          }}
        >
          Clear filters
        </button>
      </div>
    </>
  );
}
