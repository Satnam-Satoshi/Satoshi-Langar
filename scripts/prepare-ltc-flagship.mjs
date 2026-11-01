import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { prepareEdition, publishEdition, editionDate, digest } from './prepare-ltc-edition.mjs';
import { refreshIntelligenceForPublication } from './lib/ltc-intelligence.mjs';
import { validatePolicySnapshot } from './lib/ltc-policy.mjs';
import { validateFeatures, validateFlagshipRecord } from './lib/ltc-flagship-record.mjs';
export { validateFeatures } from './lib/ltc-flagship-record.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const assert=(ok,code)=>{if(!ok)throw new Error(code)};
export function prepareFlagship({snapshot,registry,policy,coverage,intelligence,policyRecords,features,now=new Date().toISOString()}){
 const date=editionDate(now);
 assert(date>='2026-10-05','flagship_not_yet_active');
 intelligence=refreshIntelligenceForPublication(intelligence,{now,editionDate:date});
 validatePolicySnapshot(policyRecords,{now});
 validateFeatures(features,date,{now});
 const result=prepareEdition(snapshot,registry,policy,{now,coverage});
 const edition={...result,intelligence,policyRecords,features,flagship:{schemaVersion:1,series:'Proof of Work',intelligenceSha256:digest(intelligence),policySha256:digest(policyRecords),featuresSha256:digest(features)},coverageGaps:[...result.coverageGaps.filter(g=>!g.startsWith('No independently measured network telemetry')), ...intelligence.gaps,
  'Network observations, when accepted, are derived from cited explorer block metadata, not from a node operated by LTC Media. Morpho rates are variable, timestamped snapshots of four exact markets.',
  'Agency-feed titles are dated official records, not independent adjudications or political analysis. Longer educational features retain their original research date.',
  'No ETF/ETP flow series, company mNAV, Litecoin treasury total, composite global price, personal position assessment or community event report is produced by this issue.']};
 validateFlagshipRecord(edition);
 return edition;
}
async function main(){
 const args=process.argv.slice(2),files={};let publish=false;
 for(let i=0;i<args.length;i++){if(args[i]==='--publish'){publish=true;continue}assert(['--snapshot','--intelligence','--policy','--output'].includes(args[i])&&args[i+1]&&!args[i+1].startsWith('--'),'invalid_arguments');files[args[i].slice(2)]=args[++i]}
 assert(files.snapshot&&files.intelligence&&files.policy,'all_observation_files_required');
 const json=async p=>JSON.parse(await readFile(p,'utf8'));
 const now=new Date().toISOString(),date=editionDate(now);
 const featureFiles=(await readdir(path.join(root,'content/daily-features'))).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)&&f.slice(0,10)<=date).sort();
 assert(featureFiles.length,'missing_feature_collection');
 const [snapshot,registry,policy,catalog,mapping,intelligence,policyRecords,features]=await Promise.all([json(path.resolve(files.snapshot)),json(path.join(root,'config/ltc-sources.json')),json(path.join(root,'config/ltc-publication.json')),json(path.join(root,'content/ltc-desks.json')),json(path.join(root,'config/ltc-coverage.json')),json(path.resolve(files.intelligence)),json(path.resolve(files.policy)),json(path.join(root,'content/daily-features',featureFiles.at(-1)))]);
 const edition=prepareFlagship({snapshot,registry,policy,coverage:{catalog,mapping},intelligence,policyRecords,features,now});
 if(files.output){const dest=path.resolve(files.output);await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,JSON.stringify({...edition,status:'candidate',publishedAt:null},null,2)+'\n')}
 if(publish){const result=await publishEdition(edition,{directory:path.join(root,'content/ltc'),policy});console.log(JSON.stringify({status:result.status,id:result.id,deployed:false}))}
 else if(!files.output)console.log(JSON.stringify({...edition,status:'candidate',publishedAt:null},null,2));
 else console.log(JSON.stringify({status:'candidate',id:edition.id,deployed:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error(`Flagship edition withheld: ${error.message}`);process.exitCode=1});
