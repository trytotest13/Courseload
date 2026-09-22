const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

const dayFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatToday(date = new Date()): string {
  return dayFormatter.format(date) + ', ' + dateFormatter.format(date);
}

export function formatRelative(iso: string, now = Date.now()): string {
  const target = new Date(iso).getTime();
  const diffMinutes = Math.round((target - now) / 60000);
  const past = diffMinutes < 0;
  const minutes = Math.abs(diffMinutes);

  const say = (value: number, unit: string) =>
    past ? value + ' ' + unit + ' ago' : 'in ' + value + ' ' + unit;

  if (minutes < 1) return 'just now';
  if (minutes < 60) return say(minutes, minutes === 1 ? 'minute' : 'minutes');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return say(hours, hours === 1 ? 'hour' : 'hours');
  const days = Math.round(hours / 24);
  if (days < 30) return say(days, days === 1 ? 'day' : 'days');
  const months = Math.round(days / 30);
  return say(months, months === 1 ? 'month' : 'months');
}

export function deadlineLabel(dueAt: string, now = Date.now()): string {
  const due = new Date(dueAt).getTime();
  const diff = due - now;
  if (diff < 0) return 'Past due ' + formatRelative(dueAt, now).replace(' ago', '');
  const hours = diff / 3_600_000;
  if (hours < 24) {
    const rounded = Math.max(Math.round(hours), 1);
    return rounded + (rounded === 1 ? ' hour left' : ' hours left');
  }
  const days = Math.round(hours / 24);
  return days + (days === 1 ? ' day left' : ' days left');
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function pluralise(count: number, singular: string, plural?: string): string {
  return count + ' ' + (count === 1 ? singular : plural ?? singular + 's');
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.round((part / total) * 100), 100);
}
