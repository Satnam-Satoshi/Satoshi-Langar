/** Explicit composition only: direct Drive adapters, never ambient credentials. */
import {createDriveArchive} from './drive-archive.mjs';
import {createDriveUpload} from './drive-upload.mjs';
export function createDriveArchiveRuntime({fetch,resolveSecret,secretReference,folderId,ownerPermissionId,journal,loadApproval,clock,networkEnabled=false,mutationsEnabled=false,timeoutMs=30000}={}){
 const common={fetch,resolveSecret,secretReference,folderId,ownerPermissionId,networkEnabled,timeoutMs};
 // Validate read boundary at construction even while effects are disabled.
 createDriveArchive({...common,existingFiles:[],mutationsEnabled:false});
 const uploader=createDriveUpload({...common,journal,loadApproval,clock,mutationsEnabled,
  preflight:()=>createDriveArchive({...common,existingFiles:[],mutationsEnabled:false}).preflight(),
  verifyReadback:identity=>{
   if(identity?.folderId!==folderId||identity.ownerPermissionId!==ownerPermissionId)throw Error('uploaded_identity_outside_boundary');
   const {fileId,version,name,mimeType,bytes,sha256}=identity;
   return createDriveArchive({...common,mutationsEnabled:false,existingFiles:[{fileId,version,name,mimeType,bytes,sha256}]}).verifyExisting(fileId);
  }
 });
 // No public verify-arbitrary-ID/URL method: file IDs originate in durable upload response state.
 return Object.freeze({advance:input=>uploader.advance(input)});
}
