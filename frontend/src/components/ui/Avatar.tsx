import { cx } from '../../lib/cx';
import { initials } from '../../lib/format';

type AvatarSize = 'sm' | 'md' | 'lg';

const sizes: Record<AvatarSize, string> = {
  sm: 'h-7 w-7 text-[0.68rem]',
  md: 'h-9 w-9 text-[0.78rem]',
  lg: 'h-11 w-11 text-sm',
};

export function Avatar({
  name,
  size = 'md',
  className,
  title,
}: {
  name: string;
  size?: AvatarSize;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title ?? name}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary-tint font-semibold uppercase text-primary',
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarGroup({
  people,
  max = 4,
  size = 'sm',
}: {
  people: Array<{ id: string; name: string }>;
  max?: number;
  size?: AvatarSize;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;

  return (
    <div className="flex items-center">
      {shown.map((person) => (
        <Avatar
          key={person.id}
          name={person.name}
          size={size}
          className="-ml-2 border-2 border-surface first:ml-0"
        />
      ))}
      {rest > 0 ? (
        <span
          className={cx(
            '-ml-2 inline-flex items-center justify-center rounded-full border-2 border-surface bg-paper font-semibold text-ink-soft',
            sizes[size],
          )}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
