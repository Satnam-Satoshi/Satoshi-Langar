import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { validateCommunitySnapshot } from './ltc-community.mjs';

export const communityRecordId = snapshot => snapshot.collectedAt.replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
export function readCommunityArchive(directory) {
  return readdirSync(directory).filter(name => /^\d{8}T\d{6}Z\.json$/.test(name)).map(name => {
    const bytes = readFileSync(path.join(directory, name));
    if (bytes.length > 100000) throw new Error('Community archive record too large');
    const snapshot = JSON.parse(bytes);
    validateCommunitySnapshot(snapshot, { now: snapshot.collectedAt });
    if (name !== `${communityRecordId(snapshot)}.json`) throw new Error('Community archive identity mismatch');
    return { id: communityRecordId(snapshot), snapshot, sha256: createHash('sha256').update(bytes).digest('hex') };
  }).sort((a, b) => b.snapshot.collectedAt.localeCompare(a.snapshot.collectedAt));
}
