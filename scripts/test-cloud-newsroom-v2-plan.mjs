import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planCloudNewsroomV2, GENERATION } from './cloud-newsroom-v2-plan.mjs';
const COMMIT = 'a'.repeat(40), BASE = 'fd45e107ac37e537195b7311baeba8cd40b2f035';
const ARTIFACT = 'b'.repeat(64), IMPLEMENTATION = 'c'.repeat(64);
function fixture() {
  const bound = { verified: true, checkedAt: '2026-11-16T18:59:30Z', sourceCommit: COMMIT, artifactSha256: ARTIFACT, implementationSha256: IMPLEMENTATION };
  return {
    schemaVersion: 1, generation: GENERATION, now: '2026-11-16T19:00:00Z', editionDate: '2026-11-16',
    sourceCommit: COMMIT, implementationSha256: IMPLEMENTATION, artifactSha256: ARTIFACT,
    baseProduction: { deploymentId: 'dpl_verified_baseline', sourceCommit: BASE }, existingDailyIssue: null,
    requiredCoverage: ['btc'], observations: [{ id: 'btc', url: 'https://api.exchange.coinbase.com/products/BTC-USD/ticker', primary: true,
      status: 'verified', claimVerified: true, value: 123, classification: 'current', checkedAt: '2026-11-16T18:59:00Z',
      sourceAsOf: '2026-11-16T18:58:59Z', publishedAt: null, maxCheckAgeSeconds: 180, maxSourceAgeSeconds: 300 }],
    gates: {
      durableSource: { ...bound, reviewed: true, durable: true, immutable: true },
      oldWriters: { ...bound, disabled: true, activeRuns: 0, completeInventory: true },
      cloudLease: { ...bound, isolated: true, casAcquired: true, generation: GENERATION, ownerId: 'worker-1', fencingToken: 'fence-42', acquiredAt: '2026-11-16T18:59:00Z', expiresAt: '2026-11-16T19:10:00Z' },
      productionComparison: { ...bound, exactCandidate: true, expectedDeploymentId: 'dpl_verified_baseline', actualDeploymentId: 'dpl_verified_baseline', expectedDeployedSource: BASE, actualDeployedSource: BASE, candidateSourceCommit: COMMIT, candidateArtifactSha256: ARTIFACT },
      historyIsolation: { ...bound, oldLedgerMutation: false, historicalDocumentsMutation: false, newGenerationOnly: true },
      researchCredentials: { ...bound, productionCredentialsAvailable: false, credentialBoundaryEnforced: true },
    },
  };
}
const blocked = input => { const p = planCloudNewsroomV2(input); assert.equal(p.status, 'blocked'); assert.deepEqual(p.effects, []); assert.deepEqual(p.outputs, []); return p; };
test('valid attestations produce a proposal, never effect instructions or publication authority', () => {
  const input = fixture(), saved = structuredClone(input), p = planCloudNewsroomV2(input);
  assert.equal(p.status, 'draft-ready'); assert.equal(p.outputs.length, 2); assert.deepEqual(p.effects, []);
  assert.equal(p.idempotencyKey, `${GENERATION}:2026-11-16:${ARTIFACT}`);
  assert.equal(p.outputs[1].historicalDocuments, 'untouched'); assert.equal(p.outputs[1].oldLedgers, 'untouched');
  assert.ok(p.outputs[1].targets.includes('desk-current-issue')); assert.deepEqual(input, saved);
  assert.deepEqual(planCloudNewsroomV2(input), p, 'injected clock makes the planner deterministic');
});
test('malformed inputs fail closed without exceptions', () => {
  for (const input of [null, undefined, [], 0, 'plan', {}, { generation: GENERATION }]) blocked(input);
});
test('only a new generation and exact New York current edition date are accepted', () => {
  for (const patch of [{ generation: 'legacy' }, { schemaVersion: 2 }, { now: 'tomorrow' }, { editionDate: '2026-11-17' }, { editionDate: '2026-02-30' }]) blocked({ ...fixture(), ...patch });
  const x = fixture(); x.now = '2026-11-17T01:00:00Z'; // still November16 in New York
  const p = blocked(x); assert.ok(!p.reasons.includes('edition_date_not_current_new_york_day'));
  x.editionDate = '2026-11-17'; assert.ok(blocked(x).reasons.includes('edition_date_not_current_new_york_day'));
});
test('coverage gap, stale check, stale source, unknown date and unverified claims withhold values', () => {
  for (const patch of [{ checkedAt: '2026-11-15T19:00:00Z' }, { sourceAsOf: '2026-11-15T19:00:00Z' }, { sourceAsOf: null }, { claimVerified: false }, { status: 'unavailable' }, { value: null }, { value: NaN }, { value: {} }, { value: '' }]) {
    const x = fixture(); Object.assign(x.observations[0], patch); const p = blocked(x);
    assert.equal(p.withheldCoverage[0].value, null); assert.ok(!JSON.stringify(p).includes(':123'));
  }
  const x = fixture(); x.requiredCoverage.push('ltc'); const p = blocked(x); assert.ok(p.reasons.includes('coverage_gap:ltc'));
});
test('future checks, source dates and publication dates are rejected', () => {
  for (const field of ['checkedAt', 'sourceAsOf', 'publishedAt']) { const x = fixture(); x.observations[0][field] = '2026-11-17T00:00:00Z'; blocked(x); }
  const x = fixture(); x.observations[0].sourceAsOf = '2026-11-16T18:59:30Z'; blocked(x); // later than research check
});
test('historical observations require explicit noncurrent label and never acquire a fresh source date', () => {
  const x = fixture(); Object.assign(x.observations[0], { classification: 'historical', sourceAsOf: '2026-09-30T23:59:00Z', publishedAt: '2026-11-10T10:00:00Z', label: 'Dated historical observation; not current', maxSourceAgeSeconds: null });
  assert.equal(planCloudNewsroomV2(x).status, 'draft-ready');
  x.observations[0].label = 'Latest holdings'; blocked(x);
});
test('only exact primary HTTPS hosts without credentials or deceptive subdomains are accepted', () => {
  for (const url of ['http://litecoin.com/news', 'https://litecoin.com.evil.test/', 'https://evil.test/?source=litecoin.com', 'https://user:secret@litecoin.com/', 'https://litecoin.com:8443/', 'javascript:alert(1)']) {
    const x = fixture(); x.observations[0].url = url; blocked(x);
  }
  const x = fixture(); x.observations[0].primary = false; blocked(x);
});
test('all external gates are mandatory, typed, recent and bound to exact source/digests', () => {
  for (const name of Object.keys(fixture().gates)) {
    for (const value of [undefined, true, {}, { ...fixture().gates[name], verified: 'true' }, { ...fixture().gates[name], checkedAt: '2026-11-16T18:00:00Z' }, { ...fixture().gates[name], sourceCommit: 'd'.repeat(40) }, { ...fixture().gates[name], artifactSha256: 'd'.repeat(64) }]) {
      const x = fixture(); x.gates[name] = value; assert.ok(blocked(x).reasons.includes(`gate_failed:${name}`));
    }
  }
});
test('lease isolation, CAS, fencing, expiry and old writer absence fail closed', () => {
  for (const patch of [{ casAcquired: false }, { isolated: false }, { fencingToken: '' }, { expiresAt: '2026-11-16T19:00:00Z' }, { acquiredAt: '2026-11-17T19:00:00Z' }, { generation: 'legacy' }]) {
    const x = fixture(); Object.assign(x.gates.cloudLease, patch); blocked(x);
  }
  for (const patch of [{ activeRuns: 1 }, { disabled: false }, { completeInventory: false }]) { const x = fixture(); Object.assign(x.gates.oldWriters, patch); blocked(x); }
});
test('deployed source drift, deployment drift and mismatched candidate reject the plan', () => {
  for (const patch of [{ actualDeployedSource: 'e'.repeat(40) }, { actualDeploymentId: 'dpl_other' }, { candidateSourceCommit: BASE }, { candidateArtifactSha256: 'e'.repeat(64) }, { exactCandidate: false }]) {
    const x = fixture(); Object.assign(x.gates.productionComparison, patch); blocked(x);
  }
});
test('production credentials or old-ledger/historical mutation invalidate isolation', () => {
  const x = fixture(); x.gates.researchCredentials.productionCredentialsAvailable = true; blocked(x);
  for (const key of ['oldLedgerMutation', 'historicalDocumentsMutation']) { const y = fixture(); y.gates.historyIsolation[key] = true; blocked(y); }
});
test('same canonical artifact is duplicate no-op for draft or published issue', () => {
  for (const status of ['draft', 'published']) {
    const x = fixture(); x.existingDailyIssue = { editionDate: x.editionDate, artifactSha256: ARTIFACT, status };
    const p = blocked(x); assert.equal(p.disposition, 'duplicate-no-op'); assert.equal(p.outputs.length, 0);
  }
});
test('different published same-date artifact needs exact correction approval and retains original', () => {
  const x = fixture(); x.existingDailyIssue = { editionDate: x.editionDate, artifactSha256: 'e'.repeat(64), status: 'published' };
  assert.ok(blocked(x).reasons.includes('gate_failed:correction'));
  x.gates.correction = { ...x.gates.durableSource, approved: true, approvalId: 'owner-approval-1', editionDate: x.editionDate, replacesArtifactSha256: 'e'.repeat(64), newArtifactSha256: ARTIFACT, preservePublishedOriginal: true };
  const p = planCloudNewsroomV2(x); assert.equal(p.status, 'draft-ready'); assert.equal(p.outputs[0].kind, 'new-correction-revision'); assert.equal(p.outputs[0].preservePriorArtifacts, true);
  x.gates.correction.newArtifactSha256 = 'f'.repeat(64); blocked(x);
});
test('malformed coverage and unlimited freshness cannot open admission', () => {
  for (const patch of [{ requiredCoverage: [] }, { requiredCoverage: ['btc', 'btc'] }, { observations: [null] }, { observations: [] }, { existingDailyIssue: undefined }, { artifactSha256: 'bad' }, { sourceCommit: [COMMIT] }, { implementationSha256: [IMPLEMENTATION] }, { now: '2026-02-30T19:00:00Z' }]) blocked({ ...fixture(), ...patch });
  const x = fixture(); x.observations.push(structuredClone(x.observations[0])); blocked(x);
  for (const key of ['maxCheckAgeSeconds', 'maxSourceAgeSeconds']) { const y = fixture(); y.observations[0][key] = Infinity; blocked(y); }
});
test('planner source contains no imports, networking, ambient clocks or effect APIs', () => {
  const source = readFileSync(new URL('./cloud-newsroom-v2-plan.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bimport\s|\bfetch\s*\(|Date\.now\s*\(|writeFile|execSync|spawn\s*\(|process\./);
});
