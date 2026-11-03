import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publicationDate, assertDailyPublicationAvailable, DailyPublicationComplete } from './cloud-ltc-daily-admission.mjs';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
import { dailyPublicationFixture } from './lib/test-daily-publication-fixture.mjs';

test('publication days use New York midnight across UTC and both DST transitions', () => {
  for (const [iso, expected] of [
    ['2026-11-03T04:59:59Z','2026-11-02'],['2026-11-03T05:00:00Z','2026-11-03'],
    ['2026-07-03T03:59:59Z','2026-07-02'],['2026-07-03T04:00:00Z','2026-07-03'],
    ['2026-03-08T06:59:59Z','2026-03-08'],['2026-03-08T07:00:00Z','2026-03-08'],
    ['2026-11-01T05:59:59Z','2026-11-01'],['2026-11-01T06:00:00Z','2026-11-01'],
  ]) assert.equal(publicationDate(Date.parse(iso)), expected);
});

test('compacted verified checkpoint blocks the same day and admits the next day', () => {
  const document = dailyPublicationFixture();
  assert.throws(() => assertDailyPublicationAvailable(document,'2026-11-03'), DailyPublicationComplete);
  assert.doesNotThrow(() => assertDailyPublicationAvailable(document,'2026-11-04'));
  assert.throws(() => assertDailyPublicationAvailable(document,'2026-11-02'), /publication_clock_before_checkpoint/);
});

test('a late verified older issue also consumes its actual publication day', () => {
  assert.throws(() => assertDailyPublicationAvailable(dailyPublicationFixture({editionId:'2026-11-02-r1'}),'2026-11-03'), DailyPublicationComplete);
});

test('malformed or incomplete publication evidence never reports success or silently admits', () => {
  for (const mutate of [
    d => d.latestRelease.editionId = '2026-02-30-r1',
    d => d.latestRelease.verifiedAt = 'invalid',
    d => d.latestRelease.summary.sha256 = 'f'.repeat(64),
    d => delete d.receipts['summary-fixture'],
    d => d.intents['summary-fixture'].status = 'uncertain',
    d => d.intents['summary-fixture'].proof.proof.downloadVerified = false,
    d => d.archiveHead.summaryFileId = 'another_file',
    d => delete d.archiveHead,
  ]) {
    const document = dailyPublicationFixture(); mutate(document);
    assert.throws(() => assertDailyPublicationAvailable(document,'2026-11-04'), /daily_checkpoint_invalid/);
  }
});

test('midnight fences admitted effects and renewals; unresolved work remains held', async () => {
  let now = Date.parse('2026-11-04T04:59:59Z');
  const adapter = new MemoryStateAdapter(), state = new DurableCloudState(adapter,'website',{clock:()=>now});
  await state.setPaused(false);
  const lease = await state.acquire('gha-200-1',3_600_000,undefined,publicationDate(now));
  await state.intend(lease,'effect','a'.repeat(64));
  now += 1000;
  await assert.rejects(state.assertMayMutate(lease,'effect'), /publication_date_changed/);
  await assert.rejects(state.renew(lease), /publication_date_changed/);
  await assert.rejects(state.acquire('gha-201-1'), /lease_held/);
  assert.equal((await state.inspect()).intents.effect.status, 'pending');
});

test('the scheduled entrypoint uses one concurrency group with pre-deadline Eastern attempts', () => {
  const workflow = readFileSync(new URL('../ops/ltc-daily-workflow.yml',import.meta.url),'utf8');
  assert.match(workflow,/cron: '17 5,6,7 \* \* \*'\s+timezone: America\/New_York/);
  assert.equal((workflow.match(/cron:/g)||[]).length,1);
  assert.match(workflow,/group: ltc-production-publication\s+cancel-in-progress: false/);
  assert.match(workflow,/timeout-minutes: 60/);
});
