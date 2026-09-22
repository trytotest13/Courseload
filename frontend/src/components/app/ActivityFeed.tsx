import type { ActivityEntry } from '../../api/types';
import { formatRelative } from '../../lib/format';
import { Card, EmptyState } from '../ui';

const actionTone: Record<string, string> = {
  created: 'bg-line text-ink-soft',
  updated: 'bg-line text-ink-soft',
  submitted: 'bg-status-submitted-tint text-status-submitted',
  acknowledged: 'bg-status-acknowledged-tint text-status-acknowledged',
  graded: 'bg-primary-tint text-primary',
};

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card className="p-5">
      <p className="label-micro">Activity</p>

      {entries.length === 0 ? (
        <EmptyState
          className="mt-3 border-0 bg-transparent px-0 py-4"
          title="Nothing has happened yet"
          description="Submissions, acknowledgements and grades show up here as they happen."
        />
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {entries.map((entry, index) => (
            <li key={entry.id} className="flex gap-3">
              <span
                className={
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ' +
                  (actionTone[entry.action] ?? 'bg-line text-ink-soft')
                }
                aria-hidden="true"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              </span>
              <div className="min-w-0" style={{ animationDelay: index * 40 + 'ms' }}>
                <p className="text-[0.84rem] leading-snug text-ink">
                  <span className="font-semibold">{entry.actorName ?? 'Someone'}</span> {entry.summary}
                </p>
                <p className="mt-0.5 text-[0.74rem] text-ink-faint">{formatRelative(entry.createdAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
