import {createHash} from 'node:crypto';
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const utc = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,19) === value.slice(0,19) ? Date.parse(value) : NaN;
const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,160}$/.test(value);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
/** Pure monitor over independently authenticated durable observations.
 * Does not send alerts, infer publication from provider ACK, or repair/retry jobs.
 * Scheduler expectedRun identity/time must be from pinned deployment configuration,
 * never generated editorial content. Observations are not authenticated here. */
export function evaluateRunHealth({now, expectedRun, observation} = {}) {
  const at = utc(now), scheduled = utc(expectedRun?.scheduledAt), deadline = utc(expectedRun?.deadlineAt);
  if (!Number.isFinite(at) || !id(expectedRun?.id) || !Number.isFinite(scheduled) || !Number.isFinite(deadline) || deadline <= scheduled || deadline - scheduled > 2*3600000) return {status:'invalid-monitor-input',publishAllowed:false,actions:[]};
  const result = (status, reason, alert = false) => ({status,reason,runId:expectedRun.id,publishAllowed:false,actions:[],alert:alert?{id:sha([expectedRun.id,status,reason]),severity:status==='failed'?'error':'warning',reason,deliveryVerified:false}:null});
  if (!observation || utc(observation.observedAt)>at || !Number.isFinite(utc(observation.observedAt)) || at-utc(observation.observedAt)>60000 || observation.authenticated!==true) return result('unknown','fresh-authenticated-state-observation-required',at>=deadline);
  if (observation.run===null) return at<scheduled?result('pending','not-due'):at<deadline?result('pending','within-start-window'):result('missed','scheduled-run-absent',true);
  const run = observation.run;
  if (!run || run.id!==expectedRun.id || run.scheduledAt!==expectedRun.scheduledAt || !['running','held','failed','published-verified'].includes(run.status) || !Number.isSafeInteger(run.attempt)||run.attempt<1 || !Number.isFinite(utc(run.startedAt)) || utc(run.startedAt)<scheduled || utc(run.startedAt)>utc(observation.observedAt)) return result('unknown','bound-run-record-required',at>=deadline);
  if (run.status==='held'||run.status==='failed') return result(run.status,run.status==='held'?'run-holds-for-review':'run-failed',true);
  if (run.status==='published-verified') {
    const receipt=run.publication;
    if (!receipt || !digest(receipt.receiptSha256) || !digest(receipt.artifactSha256) || !Number.isFinite(utc(receipt.checkedAt)) || utc(receipt.checkedAt)<utc(run.startedAt)||utc(receipt.checkedAt)>utc(observation.observedAt) || !Array.isArray(receipt.domains) || receipt.domains.length!==2 || new Set(receipt.domains).size!==2 || !receipt.domains.includes('ltcmagazine.org') || !receipt.domains.includes('satnamsatoshi.com') || receipt.bothDomainsVerified!==true) return result('unknown','verified-both-domain-receipt-required',true);
    // Historical verified completion remains completion; it is not current source freshness.
    return {...result('completed','durable-publication-receipt-observed'),sourceFreshness:'not-assessed',currentPublicAvailability:'not-assessed'};
  }
  if (!Number.isFinite(utc(run.heartbeatAt)) || utc(run.heartbeatAt)<utc(run.startedAt)||utc(run.heartbeatAt)>utc(observation.observedAt)) return result('unknown','valid-heartbeat-required',true);
  if (at-utc(run.heartbeatAt)>300000) return result('stalled','heartbeat-over-five-minutes',true);
  if (at>=deadline) return result('late','run-deadline-exceeded',true);
  return result('running','fresh-heartbeat');
}
