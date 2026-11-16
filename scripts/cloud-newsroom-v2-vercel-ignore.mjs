/** Proposed composition, NOT installed as vercel.json ignoreCommand.
 * Vercel exit0 skips; exit1 permits. Every error denies. Historical guards remain
 * unchanged; cooperative grant admits preview only, never production authority.
 */
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {previewExitCode} from './pdf-preview-ignore.mjs';
import {admitV2Preview} from './cloud-newsroom-v2-preview-admission.mjs';
import {evaluateCooperativePreview} from './cloud-newsroom-v2-cooperative-preview.mjs';
export async function cloudV2IgnoreExitCode({env,git,now,fetcher}){
 try{
  if(env.VERCEL_ENV!=='preview'||env.VERCEL_TARGET_ENV!=='preview')return 0;
  if(previewExitCode(env,git,now)===1||admitV2Preview(env,git,now))return 1;
  return await evaluateCooperativePreview({env,git,now,fetcher})?1:0;
 }catch{return 0;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const git=ref=>execFileSync('git',ref==='commit'?['cat-file','-p','HEAD']:ref==='tree'?['ls-tree','-r','HEAD']:['rev-parse',ref],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
 process.exitCode=await cloudV2IgnoreExitCode({env:process.env,git,now:Date.now()});
}
