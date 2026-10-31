import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { withGoogleCloudAuthorization } from './cloud-ltc-google-auth.mjs';
import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
import { DurableCloudState } from './cloud-ltc-state.mjs';
import { CloudSocialLedger } from './cloud-ltc-social.mjs';
import { assertVercelProjectPolicy } from './cloud-ltc-release-providers.mjs';
import { TARGET } from './cloud-ltc-release.mjs';
const check = (value, code) => { if (!value) throw Error(code); };
export async function probePrivateGoogleFolder({ env = process.env, fetchImpl = fetch }) {
  const folderId = env.LTC_STATE_FOLDER_ID;
  check(/^[A-Za-z0-9_-]{8,160}$/.test(folderId ?? ''), 'exact_private_folder_required');
  return withGoogleCloudAuthorization({ env, fetchImpl }, async access => {
    let response;
    try { response = await fetchImpl(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,mimeType,trashed,ownedByMe,shared,driveId,capabilities(canEdit),permissions(id,type,role)`, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { Authorization: `Bearer ${access.LTC_GOOGLE_ACCESS_TOKEN}`, Accept: 'application/json' } }); } catch { throw Error('google_folder_probe_unavailable'); }
    const base = { schemaVersion: 1, mode: 'read-only-google-folder-probe', cloudPublishingActive: false, writesPerformed: false, folderPrivateVerified: false, httpStatus: response.status };
    check(!response.redirected && response.body, 'google_folder_probe_unavailable');
    const reader = response.body.getReader(); let length = 0; const chunks = [];
    try { while (true) { const part = await reader.read(); if (part.done) break; length += part.value.byteLength; check(length <= 65536, 'google_folder_probe_unavailable'); chunks.push(part.value); } } finally { await reader.cancel().catch(() => {}); }
    let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Error('google_folder_probe_unavailable'); }
    if (response.status !== 200) { const reasons = [...(body.error?.errors ?? []).map(error => error.reason), ...(body.error?.details ?? []).map(error => error.reason)]; const disabled = reasons.some(reason => ['accessNotConfigured', 'SERVICE_DISABLED'].includes(reason)); return { ...base, reason: disabled ? 'provider-api-disabled' : response.status === 403 ? 'provider-access-denied' : 'provider-read-unavailable' }; }
    const verified = body.id === folderId && body.mimeType === 'application/vnd.google-apps.folder' && body.trashed === false && body.ownedByMe === true && body.shared === false && !body.driveId && body.capabilities?.canEdit === true && Array.isArray(body.permissions) && body.permissions.length === 1 && body.permissions[0].type === 'user' && body.permissions[0].role === 'owner';
    return { ...base, folderPrivateVerified: verified, reason: verified ? null : 'private-ownership-unproven' };
  });
}
const plain = value => value && Object.getPrototypeOf(value) === Object.prototype;
export function configuredLedgerTargets(env) {
  const folderId = env.LTC_STATE_FOLDER_ID, website = env.LTC_STATE_DOCUMENT_ID, social = env.LTC_SOCIAL_STATE_DOCUMENT_ID;
  check([folderId, website, social].every(id => /^[A-Za-z0-9_-]{8,160}$/.test(id ?? '')) && new Set([folderId, website, social]).size === 3, 'exact_private_ledgers_required');
  return ['website', 'social'].map(ledgerKey => ({ schemaVersion: 1, provider: 'google-docs', publicationEnabled: false, folderId, documentId: ledgerKey === 'website' ? website : social, ledgerKey }));
}
export async function probePausedLedgers({ env = process.env, fetchImpl = fetch }) {
  const configs = configuredLedgerTargets(env); const ledgers = {};
  for (const config of configs) {
    const result = { privateResourcesVerified: false, initialized: false, schemaVerified: false, pausedReadVerified: false, leaseAbsentVerified: false, unresolvedEffectsAbsentVerified: false, restoreHoldAbsentVerified: false, readOnlyReady: false };
    try {
      const runtime = await createGoogleStateRuntime({ config, env, fetchImpl });
      result.privateResourcesVerified = true;
      const snapshot = await runtime.stateAdapter.read(config.ledgerKey);
      result.initialized = snapshot.value !== null;
      check(result.initialized, 'ledger_not_initialized');
      // Validate this exact raw revision locally. No second snapshot can turn an
      // initially blank/malformed state into a successful schema result.
      const readOnly = { read: async () => structuredClone(snapshot), conditionalWrite: async () => { throw Error('read_only_probe'); } };
      let state;
      if (config.ledgerKey === 'website') state = await new DurableCloudState(readOnly, 'website').inspect();
      else {
        state = await new CloudSocialLedger(readOnly).inspect();
        check(Number.isSafeInteger(state.fence) && state.fence >= 0 && Object.hasOwn(state, 'lease') && Object.hasOwn(state, 'migration') && (state.migration === null || plain(state.migration)) && (state.lease === null || (plain(state.lease) && typeof state.lease.runId === 'string' && Number.isSafeInteger(state.lease.fence) && Number.isFinite(state.lease.expiresAt))), 'invalid_social_ledger');
        const statuses = new Set(['published', 'scheduled', 'sent', 'draft', 'reserved', 'error', 'failed', 'scheduled-verified', 'needs_approval', 'sending', 'create-uncertain', 'schedule-uncertain']);
        check(Object.values(state.records).every(record => plain(record) && statuses.has(record.status)), 'invalid_social_ledger');
      }
      result.schemaVerified = true;
      result.pausedReadVerified = state.paused === true;
      result.leaseAbsentVerified = state.lease === null;
      result.unresolvedEffectsAbsentVerified = config.ledgerKey === 'website' ? Object.values(state.intents).every(intent => ['confirmed', 'not-applied'].includes(intent.status)) : !Object.values(state.records).some(record => ['create-uncertain', 'schedule-uncertain', 'sending'].includes(record.status));
      result.restoreHoldAbsentVerified = config.ledgerKey === 'website' ? state.restoreHold === false : true;
      result.readOnlyReady = Object.entries(result).filter(([key]) => key !== 'readOnlyReady').every(([, value]) => value === true);
    } catch { /* Unknown privacy/schema/authorization stays false; never repair it. */ }
    ledgers[config.ledgerKey] = result;
  }
  return { schemaVersion: 1, mode: 'read-only-configured-ledger-probe', cloudPublishingActive: false, writesPerformed: false, ledgers, allLedgersVerified: Object.values(ledgers).every(result => result.readOnlyReady) };
}
async function boundedJSON(response, limit) {
  check(response.body && response.headers.get('content-type')?.includes('application/json'), 'metadata_response_unavailable');
  const reader = response.body.getReader(); let length = 0; const chunks = [];
  try { while (true) { const part = await reader.read(); if (part.done) break; length += part.value.byteLength; check(length <= limit, 'metadata_response_unavailable'); chunks.push(part.value); } } finally { await reader.cancel().catch(() => {}); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function probeVercelProject({ env = process.env, fetchImpl = fetch }) {
  const token = env.VERCEL_TOKEN;
  check(typeof token === 'string' && token.length >= 16 && token.length <= 8192 && !/[\s\x00-\x1f\x7f]/.test(token), 'vercel_project_credential_required');
  const result = { schemaVersion: 1, mode: 'read-only-vercel-project-probe', cloudPublishingActive: false, writesPerformed: false, projectIdentityVerified: false, accountIdentityVerified: false, nativeDeployControlVerified: false, projectMetadataVerified: false };
  try {
    const response = await fetchImpl(`https://api.vercel.com/v9/projects/${TARGET.project}?teamId=${TARGET.team}`, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    check(response.status === 200 && !response.redirected, 'metadata_response_unavailable');
    const project = await boundedJSON(response, 2_000_000);
    result.projectIdentityVerified = project.id === TARGET.project;
    result.accountIdentityVerified = project.accountId === TARGET.team;
    assertVercelProjectPolicy(project, TARGET);
    result.nativeDeployControlVerified = true;
    result.projectMetadataVerified = result.projectIdentityVerified && result.accountIdentityVerified && result.nativeDeployControlVerified;
  } catch { /* No raw provider diagnostics, environment fields or identities escape. */ }
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2); let mode = 'folder';
    if (['--ledgers', '--vercel'].includes(args[0])) mode = args.shift().slice(2);
    check(args.length === 2 && args[0] === '--receipt' && args[1], 'invalid_probe_arguments');
    const receipt = mode === 'ledgers' ? await probePausedLedgers({}) : mode === 'vercel' ? await probeVercelProject({}) : await probePrivateGoogleFolder({});
    await writeFile(path.resolve(args[1]), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify(receipt));
    if (!(mode === 'ledgers' ? receipt.allLedgersVerified : mode === 'vercel' ? receipt.projectMetadataVerified : receipt.folderPrivateVerified)) process.exitCode = 1;
  } catch (error) { console.error(['exact_private_ledgers_required', 'vercel_project_credential_required', 'exact_private_folder_required', 'google_refresh_credentials_required', 'google_refresh_failed', 'google_refresh_scope_mismatch'].includes(error.message) ? error.message : 'google_folder_probe_unavailable'); process.exitCode = 1; }
}
