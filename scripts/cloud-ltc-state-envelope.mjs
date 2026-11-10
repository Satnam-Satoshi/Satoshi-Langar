import { createHash, randomUUID } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

const PLAIN_STATE_BYTES = 256 * 1024;
export const MAX_LOGICAL_STATE_BYTES = 1_500_000;
export const MAX_STORED_STATE_CHARACTERS = 900_000;
export const MAX_DOCS_STATE_CHARACTERS = 1_000_000;
export const MAX_DOCS_RESPONSE_BYTES = 1_100_000;

const check = (condition, code) => { if (!condition) throw new Error(code); };
const plain = value => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const nonce = value => typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function logicalBytes(value) {
  check(plain(value), 'invalid_state_envelope');
  const bytes = Buffer.from(JSON.stringify(value), 'utf8');
  check(bytes.length <= MAX_LOGICAL_STATE_BYTES, 'state_capacity_exceeded');
  return bytes;
}

function fitsStoredDocument(text) {
  // Leave room for the Docs structure outside the escaped paragraph string.
  const paragraph = JSON.stringify({ text: text + '\n' });
  return text.length <= MAX_STORED_STATE_CHARACTERS &&
    paragraph.length + 10_000 <= MAX_DOCS_STATE_CHARACTERS &&
    Buffer.byteLength(paragraph) + 10_000 <= MAX_DOCS_RESPONSE_BYTES;
}

// Bound each member independently so future mutable fields cannot change
// the compression of immutable audit history. The same bound is enforced
// by the encoder and used by the release preflight.
function memberBound(bytes) {
  return bytes + 32 + 8 * Math.ceil(bytes / 1024);
}

function gzipMember(text) {
  const input = Buffer.from(text);
  let compressed = gzipSync(input);
  const max = memberBound(input.length);
  if (compressed.length > max) compressed = gzipSync(input, { level: 0 });
  check(compressed.length <= max, 'state_capacity_exceeded');
  return compressed;
}

const operationMaps = new Set(['intents', 'receipts']);
function archivedRow(field, row, fence) {
  const intent = field === 'receipts' ? row?.receipt : row;
  return Number.isSafeInteger(fence) && Number.isSafeInteger(intent?.fence) &&
    intent.fence < fence && ['confirmed', 'not-applied'].includes(intent.status);
}

function stateMembers(key, value) {
  const members = [{ text: '{' }];
  for (const [field, entry] of Object.entries(value)) {
    if (members.length > 1) members.push({ text: ',' });
    const label = JSON.stringify(field) + ':';
    if (key !== 'website' || !operationMaps.has(field) || !plain(entry)) {
      members.push({ text: label + JSON.stringify(entry), field });
      continue;
    }

    members.push({ text: label + '{' });
    // A prior-fence terminal row is immutable. Encode it independently so
    // appending, confirming or pruning other rows cannot change its size.
    // Consecutive mutable rows share a member, including internal delimiters.
    let changing = [];
    const flush = () => {
      if (!changing.length) return;
      members.push({ text: changing.join(','), field });
      changing = [];
    };
    let first = true;
    for (const [id, row] of Object.entries(entry)) {
      const text = JSON.stringify(id) + ':' + JSON.stringify(row);
      if (archivedRow(field, row, value.fence)) {
        flush();
        if (!first) members.push({ text: ',' });
        members.push({ text, archivedIn: field });
      } else {
        if (!changing.length && !first) members.push({ text: ',' });
        changing.push(text);
      }
      first = false;
    }
    flush();
    members.push({ text: '}' });
  }
  members.push({ text: '}' });
  return members;
}

function gzipState(key, value) {
  return Buffer.concat(stateMembers(key, value).map(({ text }) => gzipMember(text)));
}

function compressedEnvelope(key, writeNonce, valueBytes, valueSha256, valueGzipBase64) {
  return JSON.stringify({ schemaVersion: 2, key, writeNonce, encoding: 'gzip+base64',
    valueBytes, valueSha256, valueGzipBase64 });
}

const sampleNonce = '00000000-0000-4000-8000-000000000000';

export class StateGrowthCapacityError extends Error {
  constructor(capacity) {
    super('state_capacity_exceeded');
    this.capacity = Object.freeze({ ...capacity });
  }
}

// Charge each mutable member at its full raw size. A map can have one
// mutable run before and after each immutable row. Reserve those boundaries
// even if inserted keys sort before old rows. New fields also need separators.
export function assertStateEnvelopeGrowthCapacity(key, value, mutableKeys, growthBytes) {
  check(plain(value) && Number.isSafeInteger(growthBytes) && growthBytes >= 0, 'state_capacity_exceeded');
  const canonical = JSON.stringify(value);
  const logical = Buffer.byteLength(canonical);
  const parsed = JSON.parse(canonical);
  const mutable = new Set(mutableKeys);
  let stableCompressed = 0;
  let currentCompressed = 0;
  let mutableBytes = growthBytes;
  let mutableMembers = 0;
  let archivedRows = 0;
  for (const { field, text, archivedIn } of stateMembers(key, parsed)) {
    const compressed = gzipMember(text).length;
    currentCompressed += compressed;
    if (mutable.has(archivedIn)) archivedRows++;
    if (mutable.has(field)) {
      mutableBytes += Buffer.byteLength(text);
      mutableMembers++;
    } else stableCompressed += compressed;
  }
  // The sum of independent member bounds is at most the bound on total
  // bytes plus 40 bytes per member. Conservatively allow absent fields/runs.
  const newMembers = mutable.size + archivedRows + operationMaps.size;
  const futureCompressed = memberBound(mutableBytes) + 40 * (mutableMembers + newMembers);
  const newDelimiters = gzipMember(',').length * newMembers;
  const stored = (compressed, logicalBytes) =>
    compressedEnvelope(key, sampleNonce, logicalBytes, '0'.repeat(64), '').length + 4 * Math.ceil(compressed / 3);
  const legacy = JSON.stringify({ schemaVersion: 1, key, value, writeNonce: sampleNonce });
  const capacity = {
    logicalBytes: logical,
    projectedLogicalBytes: logical + growthBytes,
    storedCharacters: logical <= PLAIN_STATE_BYTES && fitsStoredDocument(legacy) ? legacy.length : stored(currentCompressed, logical),
    projectedStoredCharacters: stored(stableCompressed + futureCompressed + newDelimiters, MAX_LOGICAL_STATE_BYTES),
  };
  if (capacity.projectedLogicalBytes > MAX_LOGICAL_STATE_BYTES || capacity.projectedStoredCharacters > MAX_STORED_STATE_CHARACTERS) {
    throw new StateGrowthCapacityError(capacity);
  }
  return capacity;
}

export function encodeStateEnvelope(key, value, writeNonce = randomUUID()) {
  check(nonce(writeNonce), 'invalid_state_envelope');
  const bytes = logicalBytes(value);
  const legacy = JSON.stringify({ schemaVersion: 1, key, value, writeNonce });
  if (bytes.length <= PLAIN_STATE_BYTES && fitsStoredDocument(legacy)) return legacy;

  const compressed = compressedEnvelope(
    key, writeNonce, bytes.length, sha256(bytes),
    gzipState(key, JSON.parse(bytes.toString('utf8'))).toString('base64'),
  );
  check(fitsStoredDocument(compressed), 'state_capacity_exceeded');
  return compressed;
}

export function decodeStateEnvelope(raw, key) {
  check(typeof raw === 'string' && raw.length <= MAX_STORED_STATE_CHARACTERS, 'invalid_state_envelope');
  let envelope;
  try { envelope = JSON.parse(raw); } catch { throw new Error('invalid_state_envelope'); }
  check(plain(envelope) && envelope.key === key && JSON.stringify(envelope) === raw, 'invalid_state_envelope');
  const keys = Object.keys(envelope).sort().join(',');
  if (envelope.schemaVersion === 1) {
    check(keys === 'key,schemaVersion,value' ||
      (keys === 'key,schemaVersion,value,writeNonce' && nonce(envelope.writeNonce)), 'invalid_state_envelope');
    logicalBytes(envelope.value);
    return envelope.value;
  }
  check(envelope.schemaVersion === 2 &&
    keys === 'encoding,key,schemaVersion,valueBytes,valueGzipBase64,valueSha256,writeNonce' &&
    nonce(envelope.writeNonce) && envelope.encoding === 'gzip+base64' &&
    Number.isSafeInteger(envelope.valueBytes) && envelope.valueBytes > 0 &&
    envelope.valueBytes <= MAX_LOGICAL_STATE_BYTES &&
    typeof envelope.valueSha256 === 'string' && /^[a-f0-9]{64}$/.test(envelope.valueSha256) &&
    typeof envelope.valueGzipBase64 === 'string', 'invalid_state_envelope');
  const compressed = Buffer.from(envelope.valueGzipBase64, 'base64');
  check(compressed.toString('base64') === envelope.valueGzipBase64, 'invalid_state_envelope');
  let bytes;
  try { bytes = gunzipSync(compressed, { maxOutputLength: envelope.valueBytes }); }
  catch { throw new Error('invalid_state_envelope'); }
  check(bytes.length === envelope.valueBytes && sha256(bytes) === envelope.valueSha256, 'invalid_state_envelope');
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch { throw new Error('invalid_state_envelope'); }
  check(logicalBytes(value).equals(bytes), 'invalid_state_envelope');
  return value;
}
