export type EditionStamp = { id: string; date: string; revision: number };
export type PublicationDay<T extends EditionStamp> = { date: string; latest: T; revisions: T[] };

// Publication dates, rather than preparation timestamps, own the archive order.
// A correction to an older issue must never displace a newer publication day.
export function publicationDays<T extends EditionStamp>(records: readonly T[]): PublicationDay<T>[] {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date) || b.revision - a.revision);
  const days = new Map<string, PublicationDay<T>>();
  for (const record of sorted) {
    const day = days.get(record.date);
    if (day) day.revisions.push(record);
    else days.set(record.date, { date: record.date, latest: record, revisions: [record] });
  }
  return [...days.values()];
}

export function publicationMonths<T extends EditionStamp>(days: readonly PublicationDay<T>[]) {
  const months = new Map<string, PublicationDay<T>[]>();
  for (const day of days) {
    const month = day.date.slice(0, 7);
    const entries = months.get(month) ?? [];
    entries.push(day);
    months.set(month, entries);
  }
  return [...months].sort(([a], [b]) => b.localeCompare(a)).map(([month, entries]) => ({ month, days: entries }));
}

export function calendarWeeks(month: string): (string | null)[][] {
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) throw new Error('Expected a YYYY-MM publication month.');
  const first = new Date(`${month}-01T12:00:00Z`);
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let day = 1; day <= last.getUTCDate(); day++) cells.push(`${month}-${String(day).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}

export function formatPublicationMonth(month: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`));
}

// RSS announces publication events, including corrections to an earlier day.
export function publicationUpdates<T extends EditionStamp & { publishedAt: string }>(records: readonly T[]): T[] {
  return [...records].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || b.date.localeCompare(a.date) || b.revision - a.revision);
}
