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

function fields(value) {
  return Object.entries(value).map(([key, field]) => [key, JSON.stringify(key) + ':' + JSON.stringify(field)]);
}

function gzipState(value) {
  const parts = ['{'];
  for (const [, text] of fields(value)) {
    if (parts.length > 1) parts.push(',');
    parts.push(text);
  }
  parts.push('}');
  return Buffer.concat(parts.map(gzipMember));
}

function compressedEnvelope(key, writeNonce, valueBytes, valueSha256, valueGzipBase64) {
  return JSON.stringify({ schemaVersion: 2, key, writeNonce, encoding: 'gzip+base64',
    valueBytes, valueSha256, valueGzipBase64 });
}

// charge mutable fields at their full uncompressed size, with room for the
// planned growth and the maximum number of new fields named by the caller.
export function assertStateEnvelopeGrowthCapacity(key, value, mutableKeys, growthBytes) {
  check(Number.isSafeInteger(growthBytes) && growthBytes >= 0, 'state_capacity_exceeded');
  const bytes = logicalBytes(value);
  check(bytes.length + growthBytes <= MAX_LOGICAL_STATE_BYTES, 'state_capacity_exceeded');
  const knownFields = fields(JSON.parse(bytes.toString('utf8')));
  const mutable = new Set(mutableKeys);
  let stableCompressed = 0;
  let stableCount = 0;
  let mutableBytes = growthBytes;
  for (const [field, text] of knownFields) {
    if (mutable.has(field)) mutableBytes += Buffer.byteLength(text);
    else {
      stableCompressed += gzipMember(text).length;
      stableCount++;
    }
  }
  // Sum of ceilings is at most ceil(total/1024) + member count.
  const futureCompressed = memberBound(mutableBytes) + 40 * mutable.size;
  const structuralBytes = gzipMember('{').length + gzipMember('}').length +
    gzipMember(',').length * Math.max(0, stableCount + mutable.size - 1);
  const payloadChars = 4 * Math.ceil((stableCompressed + futureCompressed + structuralBytes) / 3);
  const metadataChars = compressedEnvelope(key, '00000000-0000-4000-8000-000000000000',
    MAX_LOGICAL_STATE_BYTES, '0'.repeat(64), '').length;
  check(metadataChars + payloadChars <= MAX_STORED_STATE_CHARACTERS, 'state_capacity_exceeded');
}

export function encodeStateEnvelope(key, value, writeNonce = randomUUID()) {
  check(nonce(writeNonce), 'invalid_state_envelope');
  const bytes = logicalBytes(value);
  const legacy = JSON.stringify({ schemaVersion: 1, key, value, writeNonce });
  if (bytes.length <= PLAIN_STATE_BYTES && fitsStoredDocument(legacy)) return legacy;

  const compressed = compressedEnvelope(
    key, writeNonce, bytes.length, sha256(bytes),
    gzipState(JSON.parse(bytes.toString('utf8'))).toString('base64'),
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
