import { Tooltip } from '../components/Tooltip';
import type { Contributor } from '../registry/contributors';
import { Identity } from './Contributors';
import type { Profile } from './contributor-data';

export function ContributorBadge({
  member,
  profile,
  onOpen,
}: {
  member: Contributor;
  profile?: Profile;
  onOpen: () => void;
}) {
  return (
    <Tooltip
      className="ct-credit ct-contributor-badge"
      onClick={onOpen}
      text={`${profile?.name || member.username} contributed to the development of this feature.`}
    >
      <Identity member={member} profile={profile} />
    </Tooltip>
  );
}
