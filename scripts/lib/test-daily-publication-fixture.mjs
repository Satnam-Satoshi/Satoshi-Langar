import { createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function dailyPublicationFixture({editionId = '2026-11-03-r1', verifiedAt = '2026-11-03T12:00:00.000Z'} = {}) {
  const payload = {kind:'drive-evidence',role:'release-summary',fileId:'fixture_summary',folderId:'fixture_folder',sha256:'a'.repeat(64),bytes:123,archivedStateSha256:'b'.repeat(64)};
  const operationId = 'summary-fixture', payloadSha256 = hash(payload);
  const proof = {operationId,payloadSha256,status:'applied',proof:{fileId:payload.fileId,folderId:payload.folderId,sha256:payload.sha256,length:payload.bytes,ownerOnly:true,downloadVerified:true}};
  const intent = {operationId,runId:'gha-100-1',fence:7,payload,payloadSha256,status:'confirmed',proof,evidenceSha256:hash(proof)};
  return {
    schemaVersion:1,paused:false,restoreHold:false,fence:7,lease:null,
    intents:{[operationId]:intent},receipts:{[operationId]:{receipt:structuredClone(intent),sha256:hash(intent)}},
    latestRelease:{editionId,verifiedAt,source:'c'.repeat(40),deployment:'dpl_Fixture',artifactManifestSha256:'d'.repeat(64),summary:{operationId,payloadSha256,fileId:payload.fileId,folderId:payload.folderId,sha256:payload.sha256,length:payload.bytes,archivedStateSha256:payload.archivedStateSha256}},
    archiveHead:{schemaVersion:1,summaryOperationId:operationId,summaryFileId:payload.fileId,summaryFolderId:payload.folderId,summarySha256:payload.sha256,backupSha256:payload.archivedStateSha256,archiveProofSha256:intent.evidenceSha256,previousArchiveSha256:null,archivedIntentCount:5,archivedReceiptCount:5},
  };
}
