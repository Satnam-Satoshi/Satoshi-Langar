// SDK adapter only. No SDK construction, credentials, bootstrap, or network on import.
// Official contract: https://googleapis.dev/nodejs/firestore/latest/Transaction.html
const PATH = 'newsroomControl/standalone-v1';
const MAX_BYTES = 512 * 1024;
const error = code => Object.assign(new Error(code), {code});
function encode(state) {
  if (!state || state.schemaVersion !== 1 || state.generation !== 'standalone-v1' || state.initialized !== true || !Number.isSafeInteger(state.revision) || state.revision < 1) throw error('invalid-state');
  const seen = new Set(); let nodes = 0;
  function walk(value, depth = 0) {
    if (++nodes > 50000 || depth > 12) throw error('state-bound');
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (!value || typeof value !== 'object' || seen.has(value)) throw error('non-json-state');
    seen.add(value);
    let result;
    if (Array.isArray(value)) result = value.map(v => walk(v, depth + 1));
    else {
      if (Object.getPrototypeOf(value) !== Object.prototype) throw error('non-json-state');
      result = Object.create(null);
      for (const key of Object.keys(value).sort()) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) throw error('unsafe-state-key');
        result[key] = walk(value[key], depth + 1);
      }
    }
    seen.delete(value); return result;
  }
  const json = JSON.stringify(walk(state));
  if (Buffer.byteLength(json) > MAX_BYTES) throw error('state-byte-bound');
  return json;
}
function decode(snapshot) {
  if (!snapshot || snapshot.exists !== true) throw error('existing-state-required');
  const row = snapshot.data();
  if (!row || Object.keys(row).sort().join('|') !== 'generation|payloadJson|revision|schemaVersion' || row.schemaVersion !== 1 || row.generation !== 'standalone-v1' || typeof row.payloadJson !== 'string' || Buffer.byteLength(row.payloadJson) > MAX_BYTES) throw error('invalid-state-envelope');
  let state; try { state = JSON.parse(row.payloadJson); } catch { throw error('invalid-state-json'); }
  if (encode(state) !== row.payloadJson || row.revision !== state.revision) throw error('state-envelope-mismatch');
  return state;
}
export function createFirestoreState({Firestore, expectedProjectId, expectedDatabaseId, mutationEnabled = false} = {}) {
  if (typeof expectedProjectId !== 'string' || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(expectedProjectId) || typeof Firestore !== 'function' || typeof expectedDatabaseId !== 'string' || !(expectedDatabaseId === '(default)' || /^[a-z][a-z0-9-]{2,61}[a-z0-9]$/.test(expectedDatabaseId)) || process.env.FIRESTORE_EMULATOR_HOST) throw error('bound-firestore-required');
  // Caller supplies the reviewed official SDK constructor. Explicit identifiers, 
  // no custom endpoint/keyfile/options; runtime service identity authorization is external.
  const firestore = new Firestore({projectId:expectedProjectId,databaseId:expectedDatabaseId,ignoreUndefinedProperties:false});
  if (firestore.databaseId !== expectedDatabaseId || typeof firestore.doc !== 'function' || typeof firestore.runTransaction !== 'function') throw error('bound-firestore-required');
  const ref = firestore.doc(PATH);
  if (ref?.path !== PATH || typeof ref.get !== 'function') throw error('exact-document-required');
  return Object.freeze({
    async read() { return decode(await ref.get()); },
    async cas({expectedRevision, next} = {}) {
      if (mutationEnabled !== true) throw error('state-mutations-disabled');
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1 || expectedRevision >= Number.MAX_SAFE_INTEGER || next?.revision !== expectedRevision + 1) throw error('invalid-cas-revision');
      const payloadJson = encode(next); // Freeze actual input before awaited/retried transaction.
      // Callback may run repeatedly. It contains ONLY document read + conditional write.
      // No provider effects, secret access, evidence upload, logging, or external callbacks.
      return firestore.runTransaction(async tx => {
        const current = decode(await tx.get(ref));
        if (current.revision !== expectedRevision) return false;
        tx.update(ref, {schemaVersion:1,generation:'standalone-v1',revision:expectedRevision + 1,payloadJson});
        return true;
      }); // Unknown commit outcomes propagate. Caller must read/reconcile, never blindly retry.
    }
  });
}
export const FIRESTORE_STATE_DOCUMENT = PATH;
