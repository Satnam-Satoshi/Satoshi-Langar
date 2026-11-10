import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import {
  decodeStateEnvelope, encodeStateEnvelope,
  MAX_LOGICAL_STATE_BYTES, MAX_STORED_STATE_CHARACTERS,
} from './cloud-ltc-state-envelope.mjs';

const key = 'website';
const writeNonce = '11111111-1111-4111-8111-111111111111';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function compressedEnvelope(bytes) {
  return {
    schemaVersion: 2, key, writeNonce, encoding: 'gzip+base64',
    valueBytes: bytes.length, valueSha256: digest(bytes),
    valueGzipBase64: gzipSync(bytes).toString('base64'),
  };
}

test('large logical ledger round-trips with original bytes, history and nonce', () => {
  const state = { schemaVersion: 1, audit: 'old-receipt;'.repeat(100_000), incident: { outcome: 'UNKNOWN' }, label: '🔒' };
  const raw = encodeStateEnvelope(key, state, writeNonce);
  const envelope = JSON.parse(raw);
  assert.equal(envelope.schemaVersion, 2);
  assert.equal(envelope.writeNonce, writeNonce);
  assert.ok(raw.length < MAX_STORED_STATE_CHARACTERS);
  assert.equal(JSON.stringify(decodeStateEnvelope(raw, key)), JSON.stringify(state));
  assert.equal(envelope.valueSha256, digest(Buffer.from(JSON.stringify(state))));
});

test('reads canonical legacy ledgers and emits nonce-enabled plaintext for small states', () => {
  const value = { fence: 2 };
  const legacy = JSON.stringify({ schemaVersion: 1, key, value });
  assert.deepEqual(decodeStateEnvelope(legacy, key), value);
  const raw = encodeStateEnvelope(key, value, writeNonce);
  assert.deepEqual(JSON.parse(raw), { schemaVersion: 1, key, value, writeNonce });
  assert.deepEqual(decodeStateEnvelope(raw, key), value);
});

test('rejects invalid envelopes, noncanonical base64 and JSON, wrong hashes and malformed UTF-8', () => {
  const correct = compressedEnvelope(Buffer.from('{"fence":2}'));
  for (const patch of [
    { schemaVersion: 3 }, { key: 'social' }, { writeNonce: 'invalid' },
    { encoding: 'zlib' }, { valueSha256: '0'.repeat(64) }, { valueBytes: correct.valueBytes + 1 },
    { valueGzipBase64: correct.valueGzipBase64 + '\n' }, { extra: true },
  ]) assert.throws(() => decodeStateEnvelope(JSON.stringify({ ...correct, ...patch }), key), /invalid_state_envelope/);
  for (const bytes of [Buffer.from('{ "fence": 2 }'), Buffer.from('{"fence":1,"fence":2}'), Buffer.from([123, 34, 97, 34, 58, 34, 255, 34, 125])]) {
    assert.throws(() => decodeStateEnvelope(JSON.stringify(compressedEnvelope(bytes)), key), /invalid_state_envelope/);
  }
  assert.throws(() => decodeStateEnvelope(' ' + JSON.stringify(correct), key), /invalid_state_envelope/);
});

test('bounds inflate at declared bytes and enforces independent logical and physical limits', () => {
  const bomb = compressedEnvelope(Buffer.from('x'.repeat(MAX_LOGICAL_STATE_BYTES + 1)));
  assert.throws(() => decodeStateEnvelope(JSON.stringify(bomb), key), /invalid_state_envelope/);
  bomb.valueBytes = 16;
  assert.throws(() => decodeStateEnvelope(JSON.stringify(bomb), key), /invalid_state_envelope/);
  assert.throws(() => encodeStateEnvelope(key, { text: 'x'.repeat(MAX_LOGICAL_STATE_BYTES) }), /state_capacity_exceeded/);
  assert.throws(() => encodeStateEnvelope(key, { text: randomBytes(800_000).toString('base64') }), /state_capacity_exceeded/);
  assert.throws(() => decodeStateEnvelope('x'.repeat(MAX_STORED_STATE_CHARACTERS + 1), key), /invalid_state_envelope/);
});
