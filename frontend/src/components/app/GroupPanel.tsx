import type { GroupView } from '../../api/types';
import { Avatar, Card } from '../ui';

export function GroupPanel({
  group,
  viewerId,
  canAcknowledge,
}: {
  group: GroupView;
  viewerId: string;
  canAcknowledge: boolean;
}) {
  const isLeader = group.leaderId === viewerId;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-micro">Your group</p>
          <h2 className="mt-1 font-display text-base font-semibold text-ink">{group.name}</h2>
        </div>
        <span className="rounded-full border border-accent/30 bg-accent-tint px-2.5 py-1 text-[0.72rem] font-semibold text-accent">
          {group.members.length} members
        </span>
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {group.members.map((member) => (
          <li key={member.id} className="flex items-center gap-3">
            <Avatar name={member.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.85rem] font-semibold text-ink">
                {member.name}
                {member.id === viewerId ? <span className="ml-1.5 text-ink-faint">(you)</span> : null}
              </p>
              <p className="truncate text-[0.74rem] text-ink-faint">{member.email}</p>
            </div>
            {member.isLeader ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-tint px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-accent">
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
                  <path d="M2.5 5.5 5 9l3-5 3 5 2.5-3.5v6A1.5 1.5 0 0 1 12 13H4a1.5 1.5 0 0 1-1.5-1.5v-6Z" />
                </svg>
                Leader
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-field bg-paper px-3 py-2.5 text-[0.78rem] leading-relaxed text-ink-soft">
        {isLeader
          ? 'You are the group leader, so you confirm the acknowledgement for the whole team. It shows as acknowledged for every member.'
          : canAcknowledge
            ? 'Any member can hand the work in. The leader confirms the acknowledgement for the team.'
            : group.leaderName + ' confirms the acknowledgement for the group.'}
      </p>
    </Card>
  );
}
