// Explicit editorial snapshot date keeps exports deterministic. An update must
// recheck the primary sources and advance checkedOn before rebuilding.
const isDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function validateEvents(directory) {
  const require = (condition, message) => { if (!condition) throw Error(`Invalid events directory: ${message}`); };
  require(directory.schemaVersion === 1 && isDate(directory.checkedOn), 'schema or check date');
  require(Array.isArray(directory.events), 'events must be an array');
  const ids = new Set();
  for (const event of directory.events) {
    require(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event.id) && !ids.has(event.id), 'duplicate or invalid id'); ids.add(event.id);
    require(isDate(event.startDate) && (event.endDate === null || (isDate(event.endDate) && event.endDate >= event.startDate)), 'event dates');
    require(isDate(event.checkedOn) && event.checkedOn <= directory.checkedOn, 'source check date');
    require(event.startTime === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(event.startTime), 'start time');
    require(event.startTime === null || event.timeZone === 'UTC', 'timed events currently require a UTC source time');
    require(['Online', 'In person'].includes(event.format), 'event format');
    require([event.title,event.location,event.organizer,event.summary,event.planningNote].every(value => typeof value === 'string' && value.trim()), 'required text');
    new Intl.DateTimeFormat('en', { timeZone: event.timeZone });
    require(event.sources.length > 0 && event.sources.some(source => source.url === event.organizerUrl), 'organizer provenance');
    for (const source of event.sources) {
      const url = new URL(source.url);
      require(url.protocol === 'https:' && !url.username && !url.password && source.label && source.publisher && source.supports, 'source provenance');
    }
  }
  return directory;
}

export function eventStatus(event, checkedOn) {
  if (checkedOn < event.startDate) return 'Upcoming';
  if (checkedOn > (event.endDate ?? event.startDate)) return 'Past';
  // Without a published end time, do not infer that a call is live or finished.
  return 'Scheduled today';
}

export function groupEvents(events, checkedOn) {
  const ordered = [...events].sort((a, b) => a.startDate.localeCompare(b.startDate) || (a.startTime ?? '').localeCompare(b.startTime ?? ''));
  return {
    upcoming: ordered.filter(event => eventStatus(event, checkedOn) !== 'Past'),
    past: ordered.filter(event => eventStatus(event, checkedOn) === 'Past').reverse(),
  };
}

export function eventDateLabel(event) {
  const date = new Date(`${event.startDate}T12:00:00Z`);
  const start = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
  if (!event.endDate || event.endDate === event.startDate) return start;
  if (event.startDate.slice(0, 7) === event.endDate.slice(0, 7)) return start.replace(/^\d+/, `${date.getUTCDate()}–${Number(event.endDate.slice(-2))}`);
  const end = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${event.endDate}T12:00:00Z`));
  return `${start} – ${end}`;
}
