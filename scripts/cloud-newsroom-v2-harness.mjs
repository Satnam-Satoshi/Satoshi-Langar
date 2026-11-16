/** Pure dependency-injected SIMULATION ONLY. No production publisher or provider fencing.
 * The adapter must implement an atomic compare-and-swap, not read-then-write emulation.
 * A lease check cannot fence a real provider mutation: the gap is intentional and explicit.
 */
export const SIMULATION_STATUS = 'simulation-no-production';
const PREFIX = 'cloud-newsroom-v2-simulation/';
const SHA = /^[a-f0-9]{64}$/;
const copy = value => structuredClone(value);
const fail = code => { throw new Error(code); };
const equalDomains = (a, b) => {
  if (!a || !b || Array.isArray(a) || Array.isArray(b)) return false;
  const keys = Object.keys(a).sort();
  return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
};
export function createSimulationHarness({ mode, namespace, adapter, provider, clock, leaseMs = 30000 }) {
  if (mode !== 'simulation') fail('simulation-mode-required');
  if (typeof namespace !== 'string' || !namespace.startsWith(PREFIX) || !/^[a-zA-Z0-9_-]+$/.test(namespace.slice(PREFIX.length))) fail('fresh-simulation-namespace-required');
  if (adapter?.mode !== 'simulation' || provider?.mode !== 'simulation') fail('simulation-dependencies-required');
  for (const name of ['read', 'conditionalWrite']) if (typeof adapter[name] !== 'function') fail('invalid-adapter');
  for (const name of ['readState', 'stage', 'readDeployment', 'promote']) if (typeof provider[name] !== 'function') fail('invalid-provider');
  if (typeof clock !== 'function' || !Number.isSafeInteger(leaseMs) || leaseMs <= 0) fail('invalid-clock-or-lease');
  const now = () => { const n = clock(); if (!Number.isSafeInteger(n) || n < 0) fail('invalid-clock'); return n; };
  const read = async () => {
    const snapshot = await adapter.read(namespace);
    if (!snapshot || !Object.hasOwn(snapshot, 'version')) fail('invalid-ledger-snapshot');
    const value = snapshot.value;
    if (value !== null && value !== undefined && (value.schema !== 'cloud-newsroom-v2-simulation-v1' || value.status !== SIMULATION_STATUS || value.namespace !== namespace || !Number.isSafeInteger(value.fence) || value.fence < 0 || !value.records)) fail('foreign-ledger-rejected');
    if (value?.lease && (typeof value.lease.owner !== 'string' || !Number.isSafeInteger(value.lease.expiresAt) || value.lease.expiresAt < 0 || value.lease.fence !== value.fence)) fail('invalid-lease-record');
    return { version: snapshot.version, value: value == null ? null : copy(value) };
  };
  const assertLease = (value, lease) => {
    if (!value?.lease || !lease || value.lease.owner !== lease.owner || value.fence !== lease.fence || value.lease.fence !== lease.fence) fail('stale-owner');
    if (value.lease.expiresAt <= now()) fail('expired-lease');
  };
  const change = async (lease, update) => {
    const snapshot = await read(); assertLease(snapshot.value, lease);
    update(snapshot.value);
    if (await adapter.conditionalWrite(namespace, snapshot.version, snapshot.value) !== true) fail('cas-conflict');
    return copy(snapshot.value);
  };
  const acquire = async owner => {
    if (typeof owner !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(owner)) fail('invalid-owner');
    const snapshot = await read(), time = now();
    if (snapshot.value?.lease?.expiresAt > time) fail('lease-held');
    const value = snapshot.value ?? { schema: 'cloud-newsroom-v2-simulation-v1', status: SIMULATION_STATUS, namespace, fence: 0, lease: null, records: {} };
    if (value.fence >= Number.MAX_SAFE_INTEGER || !Number.isSafeInteger(time + leaseMs)) fail('counter-overflow');
    value.fence += 1;
    value.lease = { owner, fence: value.fence, expiresAt: time + leaseMs };
    if (await adapter.conditionalWrite(namespace, snapshot.version, value) !== true) fail('lease-contended');
    return Object.freeze(copy(value.lease));
  };
  const artifactCheck = artifact => {
    if (!artifact || !/^\d{4}-\d{2}-\d{2}$/.test(artifact.date) || !SHA.test(artifact.sha256)) fail('invalid-artifact');
  };
  const baselineCheck = expected => {
    if (!expected || typeof expected.currentDeploymentId !== 'string' || !expected.currentDeploymentId || !expected.domains || !Object.keys(expected.domains).length || Object.values(expected.domains).some(value => value !== expected.currentDeploymentId)) fail('invalid-baseline');
  };
  const matches = (state, expected) => state?.currentDeploymentId === expected.currentDeploymentId && equalDomains(state.domains, expected.domains);
  const result = (outcome, record) => ({ status: SIMULATION_STATUS, outcome, date: record.date, phase: record.phase, deploymentId: record.deploymentId ?? null, providerFencing: false });
  const recordFor = async (lease, artifact) => {
    artifactCheck(artifact);
    const snapshot = await read(); assertLease(snapshot.value, lease);
    const record = snapshot.value.records[artifact.date];
    if (record && record.sha256 !== artifact.sha256) fail('same-date-artifact-conflict');
    return record;
  };
  const reconcile = async (lease, artifact) => {
    const record = await recordFor(lease, artifact);
    if (!record) fail('missing-record');
    if (record.phase === 'published') return result('duplicate-no-op', record);
    if (record.phase !== 'promotion-intent') return result('manual-reconciliation-required', record);
    // A read-only provider check is the only retry allowed after promotion intent.
    const state = await provider.readState();
    const target = { currentDeploymentId: record.deploymentId, domains: Object.fromEntries(Object.keys(record.expected.domains).map(domain => [domain, record.deploymentId])) };
    if (matches(state, target)) {
      const verified = await provider.readDeployment(record.deploymentId);
      if (verified?.id !== record.deploymentId || verified?.ready !== true || verified?.artifactSha256 !== record.sha256) fail('reconciled-artifact-mismatch');
      const value = await change(lease, value => {
        if (value.records[artifact.date]?.phase !== 'promotion-intent') fail('phase-conflict');
        value.records[artifact.date].phase = 'published';
      });
      return result('published-readback-verified', value.records[artifact.date]);
    }
    if (matches(state, record.expected)) return result('promotion-uncertain-no-retry', record);
    fail('provider-drift-during-reconciliation');
  };
  const publish = async (lease, artifact, expected) => {
    artifactCheck(artifact); baselineCheck(expected);
    const existing = await recordFor(lease, artifact);
    if (existing) return existing.phase === 'promotion-intent' ? reconcile(lease, artifact) : result(existing.phase === 'published' ? 'duplicate-no-op' : 'manual-reconciliation-required', existing);
    const before = await provider.readState();
    if (!matches(before, expected)) fail('unexpected-current-deployment-or-domain-drift');
    await change(lease, value => {
      if (value.records[artifact.date]) fail('duplicate-reservation');
      value.records[artifact.date] = { date: artifact.date, sha256: artifact.sha256, phase: 'staging-intent', fence: lease.fence, expected: copy(expected) };
    });
    // Stage uncertainty is also never automatically retried.
    let staged;
    try { staged = await provider.stage(copy(artifact)); } catch { return result('stage-uncertain-no-retry', { ...artifact, phase: 'staging-intent' }); }
    if (!staged?.id || typeof staged.id !== 'string') fail('invalid-staged-deployment');
    const candidate = await provider.readDeployment(staged.id);
    if (candidate?.id !== staged.id || candidate?.ready !== true || candidate?.artifactSha256 !== artifact.sha256) fail('staged-artifact-mismatch');
    const current = await provider.readState();
    if (!matches(current, expected)) fail('unexpected-current-deployment-or-domain-drift');
    await change(lease, value => {
      if (value.records[artifact.date]?.phase !== 'staging-intent') fail('phase-conflict');
      value.records[artifact.date].phase = 'promotion-intent';
      value.records[artifact.date].deploymentId = staged.id;
    });
    // Durable intent means any interruption from this point requires readback, never retry.
    const fenceCheck = await read(); assertLease(fenceCheck.value, lease);
    try { await provider.promote(staged.id); } catch { /* Deliberately uncertain; read back. */ }
    return reconcile(lease, artifact);
  };
  return Object.freeze({ status: SIMULATION_STATUS, providerFencing: false, acquire, publish, reconcile });
}
