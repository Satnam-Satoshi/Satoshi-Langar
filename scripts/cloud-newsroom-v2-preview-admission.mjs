import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const EXCLUDED = new Set(['vercel.json','scripts/cloud-newsroom-v2-preview-admission.mjs','scripts/test-cloud-newsroom-v2-preview-admission.mjs']);
export function admitV2Preview(env, git, now = Date.now()) {
 try {
  if(env.VERCEL_ENV!=='preview'||env.VERCEL_TARGET_ENV!=='preview')return false;
  if(env.VERCEL_GIT_REPO_OWNER!=='Satnam-Satoshi'||env.VERCEL_GIT_REPO_SLUG!=='Satoshi-Langar'||env.VERCEL_GIT_COMMIT_REF!=='agent/cloud-newsroom-v2-20261116')return false;
  if(!Number.isFinite(now)||now<Date.parse('2026-11-16T00:00:00Z')||now>=Date.parse('2026-11-17T00:00:00Z'))return false;
  const head=git('HEAD');if(!/^[a-f0-9]{40}$/.test(head)||env.VERCEL_GIT_COMMIT_SHA!==head)return false;
  const parents=git('commit').split('\n\n')[0].split('\n').filter(x=>x.startsWith('parent '));
  if(parents.length!==1||parents[0]!=='parent 4325ebeb628733968556aeefd5f9807a79b14ba6')return false;
  const stable=git('tree').split('\n').filter(Boolean).filter(x=>!EXCLUDED.has(x.split('\t')[1])).join('\n')+'\n';
  return createHash('sha256').update(stable).digest('hex')==='a3bf73abc561c8986bb77667ec1323ab515dfab75ebeac8b7c33e460779dd05d';
 }catch{return false;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const allow=admitV2Preview(process.env,ref=>execFileSync('git',ref==='commit'?['cat-file','-p','HEAD']:ref==='tree'?['ls-tree','-r','HEAD']:['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim());
 console.log(allow?'ALLOW_V2_PINNED_PREVIEW':'SKIP_V2_PREVIEW');
}
