// Reviewed exact data shapes shared by the implementation guard and mutation gate.
// Classification is not publication approval: sources and immutable-history checks
// must also pass. No directory-wide exclusion or unknown JSON file is permitted.
const pointers = new Set([
  'content/ltc/index.json', 'public/data/ltc-snapshot.json',
  'content/ltc-community/latest.json', 'content/ltc-newsroom/latest.json',
  'content/ltc-newsroom-selections/latest.json',
  'content/research/litecoin-distribution-latest.json',
]);
function calendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}
export function routineDataRecord(file) {
  if (typeof file !== 'string') return null;
  if (pointers.has(file)) return { kind: 'pointer' };
  let match = /^(?:content\/ltc\/(\d{4}-\d{2}-\d{2})-r[1-9]\d?|content\/daily-features\/(\d{4}-\d{2}-\d{2})|content\/ltc-newsroom-selections\/(?:source-desk-)?(\d{4}-\d{2}-\d{2})-r1)\.json$/.exec(file);
  if (match) { const date = match[1] || match[2] || match[3]; return calendarDate(date) ? { kind: 'dated', date } : null; }
  match = /^(?:content\/research|public\/data)\/litecoin-distribution-(\d{4})(\d{2})(\d{2})\.json$/.exec(file);
  if (match) { const date = `${match[1]}-${match[2]}-${match[3]}`; return calendarDate(date) ? { kind: 'dated', date } : null; }
  match = /^(?:content\/ltc-community\/archive\/|content\/ltc-newsroom\/newsroom-)(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z\.json$/.exec(file);
  if (match && calendarDate(`${match[1]}-${match[2]}-${match[3]}`) && +match[4] < 24 && +match[5] < 60 && +match[6] < 60) return { kind: 'archive' };
  return null;
}
export const isRoutineData = file => routineDataRecord(file) !== null;
export function assertRoutineChanges(changes, editionId) {
  if (!/^\d{4}-\d{2}-\d{2}-r1$/.test(editionId) || !calendarDate(editionId.slice(0, 10))) throw new Error('routine_revision_required');
  for (const change of changes) {
    const record = routineDataRecord(change.file);
    if (!record || !['A', 'M', '??'].includes(change.status)) throw new Error('release_changes_outside_allowlist');
    if (record.kind !== 'pointer' && change.status === 'M') throw new Error('immutable_edition_changed');
    if (record.kind === 'dated' && record.date !== editionId.slice(0, 10)) throw new Error('release_changes_outside_allowlist');
    if (change.file.startsWith('content/ltc/') && record.kind === 'dated' && change.file !== `content/ltc/${editionId}.json`) throw new Error('release_changes_outside_allowlist');
  }
}
