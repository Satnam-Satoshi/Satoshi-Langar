import { createHash, randomUUID } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

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

export function encodeStateEnvelope(key, value, writeNonce = randomUUID()) {
  check(nonce(writeNonce), 'invalid_state_envelope');
  const bytes = logicalBytes(value);
  const legacy = JSON.stringify({ schemaVersion: 1, key, value, writeNonce });
  if (fitsStoredDocument(legacy)) return legacy;

  const compressed = JSON.stringify({
    schemaVersion: 2, key, writeNonce, encoding: 'gzip+base64',
    valueBytes: bytes.length, valueSha256: sha256(bytes),
    valueGzipBase64: gzipSync(bytes).toString('base64'),
  });
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
