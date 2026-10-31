import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { withGoogleCloudAuthorization } from './cloud-ltc-google-auth.mjs';
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
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2); check(args.length === 2 && args[0] === '--receipt' && args[1], 'invalid_probe_arguments');
    const receipt = await probePrivateGoogleFolder({});
    await writeFile(path.resolve(args[1]), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify(receipt));
    if (!receipt.folderPrivateVerified) process.exitCode = 1;
  } catch (error) { console.error(['exact_private_folder_required', 'google_refresh_credentials_required', 'google_refresh_failed', 'google_refresh_scope_mismatch'].includes(error.message) ? error.message : 'google_folder_probe_unavailable'); process.exitCode = 1; }
}
