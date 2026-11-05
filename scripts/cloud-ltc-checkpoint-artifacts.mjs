import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';import path from'node:path';import{builtManifest,builtOutputManifest}from'./cloud-ltc-release.mjs';import{isRoutineData}from'./lib/ltc-routine-data.mjs';import{downloadEvidence,restoreArtifactEvidence}from'./cloud-ltc-evidence.mjs';
const check=(v,c)=>{if(!v)throw Error(c);},sha=b=>createHash('sha256').update(b).digest('hex'),hash=v=>sha(JSON.stringify(v));
export async function verifyCheckpointArtifactBytes({destination,review}){
  const source=await builtManifest(path.join(destination,'source')),manifest=await builtManifest(path.join(destination,'static')),output=await builtOutputManifest(path.join(destination,'build-output'));
  check(hash(source)===review.sourceManifestSha256&&hash(manifest)===review.artifactManifestSha256&&hash(output)===review.buildOutputSha256&&hash(await builtManifest(path.join(destination,'build-output/static')))===review.artifactManifestSha256,'checkpoint_recovery_restored_artifact_changed');
  // Compute the historical guard over explicit restored source files; execute
  // none of that code and never create a Git checkout inside the artifact.
  const guard=createHash('sha256');for(const file of source.map(record=>record.file).sort()){if(isRoutineData(file))continue;guard.update(file+'\0');guard.update(await readFile(path.join(destination,'source',file)));guard.update('\0');}
  check(guard.digest('hex')===review.artifactImplementationSha256,'checkpoint_recovery_historical_guard_changed');
  const json=async file=>JSON.parse(await readFile(path.join(destination,'evidence',file),'utf8'));
  const savedManifest=await json('artifact-manifest.json'),previous=await json('rollback-manifest.json'),plan=await json('source-operation-plan.json');
  check(hash(savedManifest)===review.artifactManifestSha256&&previous.deployment===review.previousDeployment&&hash(previous.manifest)===review.previousPublicManifestSha256&&plan.source===review.origin.sourceBefore&&plan.commit===review.artifactSource&&plan.editionId===review.editionId,'checkpoint_recovery_restored_context_changed');
  const publicationProvenance={editionSha256:sha(await readFile(path.join(destination,`source/content/ltc/${review.editionId}.json`))),sourceDeskSha256:sha(await readFile(path.join(destination,'source/content/ltc-newsroom-selections/latest.json'))),dailyGraphicSha256:sha(await readFile(path.join(destination,`source/public/magazine/daily/${review.editionId}/social.png`)))};
  check(hash(publicationProvenance)===hash(review.publicationProvenance)&&manifest.some(record=>record.file===`magazine/daily/${review.editionId}/social.png`&&record.sha256===publicationProvenance.dailyGraphicSha256),'checkpoint_recovery_provenance_changed');
  return{manifest,previousManifest:previous.manifest,publicationProvenance};
}

export async function restoreCheckpointArtifacts({pinned,review,evidenceConfig,directory,token,fetchImpl=fetch,save=async()=>{}}){
  const bundles=[];for(const intent of pinned.evidence){const p=intent.payload,result=await downloadEvidence({...p,length:p.bytes,operationId:intent.operationId,payloadSha256:intent.payloadSha256},{config:{...evidenceConfig,fileId:p.fileId},getAccessToken:token,fetcher:fetchImpl});check(result?.bundle,'checkpoint_recovery_download_unknown');bundles.push(result.bundle);await save({restoredBundleCount:bundles.length});}
  const destination=path.join(directory,'restored-artifact');const restored=await restoreArtifactEvidence(bundles,{directory:destination,expectedManifestSha256:review.artifactPackageManifestSha256});
  check(['source','static','build-output','evidence'].every(scope=>restored.scopes[scope]>0),'checkpoint_recovery_full_restore_required');
  const verified=await verifyCheckpointArtifactBytes({destination,review});return{...verified,destination,restored};
}
