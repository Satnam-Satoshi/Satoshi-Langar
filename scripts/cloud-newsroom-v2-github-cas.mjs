// New-namespace storage adapter. This provides optimistic storage CAS, NOT a
// fence over Vercel mutations. Authentication is supplied by the future owner-
// approved transport. No token creation, ambient credential lookup or retry.
export function createGitHubV2Cas({request,repository,branch,file='state/cloud-newsroom-v2.json'}){
 if(typeof request!=='function'||repository!=='Satnam-Satoshi/Satoshi-Langar'||!/^agent\/cloud-newsroom-v2-[a-z0-9-]+$/.test(branch)||!['state/cloud-newsroom-v2.json','state/cloud-newsroom-v2-synthetic.json'].includes(file))throw Error('v2_cas_scope');
 const endpoint=`/repos/${repository}/contents/${file}`;
 const validate=d=>{if(d?.schemaVersion!==1||!['cloud-newsroom-v2','cloud-newsroom-v2-synthetic-proof'].includes(d.generation))throw Error('v2_cas_wrong_generation');return d;};
 return Object.freeze({
  namespace:`${repository}:${branch}:${file}`,
  async read(){const r=await request('GET',endpoint+'?ref='+encodeURIComponent(branch));if(r.status===404)return{version:null,document:null};if(r.status!==200||r.body?.encoding!=='base64'||!/^[a-f0-9]{40}$/.test(r.body.sha??''))throw Error('v2_cas_read_failed');return{version:r.body.sha,document:validate(JSON.parse(Buffer.from(r.body.content,'base64').toString('utf8')))};},
  async conditionalWrite(expectedVersion,document){validate(document);if(expectedVersion!==null&&!/^[a-f0-9]{40}$/.test(expectedVersion??''))throw Error('v2_cas_bad_version');const body={branch,message:'Cloud newsroom v2 isolated state transition',content:Buffer.from(JSON.stringify(document)+'\n').toString('base64'),...(expectedVersion?{sha:expectedVersion}:{})};const r=await request('PUT',endpoint,body);if([409,412].includes(r.status)){const e=new Error('v2_cas_conflict');e.code='CAS_CONFLICT';throw e;}if(![200,201].includes(r.status)||!/^[a-f0-9]{40}$/.test(r.body?.content?.sha??''))throw Error('v2_cas_write_uncertain');return{version:r.body.content.sha,commit:r.body.commit?.sha??null};}
 });
}
