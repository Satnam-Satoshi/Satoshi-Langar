import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import {prepareEdition,editionDate,digest,validatePolicy} from './prepare-ltc-edition.mjs';
import {refreshIntelligenceForPublication,validateIntelligence} from './lib/ltc-intelligence.mjs';
import {validatePolicySnapshot} from './lib/ltc-policy.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const storedRegistry=JSON.parse(readFileSync(path.join(root,'config/ltc-sources.json'),'utf8'));
const storedPolicy=JSON.parse(readFileSync(path.join(root,'config/ltc-publication.json'),'utf8'));
export function prepareNewsroom({snapshot,registry,policy,intelligence,policyRecords,now=new Date().toISOString()}){
 validatePolicy(policy);
 const base=prepareEdition(snapshot,registry,policy,{now});
 const record={schemaVersion:1,id:`newsroom-${now.replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z')}`,date:editionDate(now),preparedAt:now,classification:'Dated newsroom update',byline:'AI Satoshi Ma · Automated source desk',sources:base.sources,briefs:base.briefs,intelligence:refreshIntelligenceForPublication(intelligence,{now,editionDate:editionDate(now)}),policyRecords,coverageGaps:base.coverageGaps};
 validatePolicySnapshot(policyRecords,{now});
 const complete={...record,baseSnapshot:snapshot};
 return {...complete,sha256:digest(complete)};
}
export function validateNewsroom(record){
 const {sha256,...body}=record;
 if(record.schemaVersion!==1||record.classification!=='Dated newsroom update'||record.date!==editionDate(record.preparedAt)||sha256!==digest(body))throw Error('Invalid newsroom record or digest');
 if(record.id!==`newsroom-${record.preparedAt.replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z')}`)throw Error('Invalid newsroom identity');
 const base=prepareEdition(record.baseSnapshot,storedRegistry,storedPolicy,{now:record.preparedAt});
 if(digest(base.sources)!==digest(record.sources)||digest(base.briefs)!==digest(record.briefs)||digest(base.coverageGaps)!==digest(record.coverageGaps))throw Error('Newsroom base observations do not match validated snapshot');
 validateIntelligence(record.intelligence,{now:record.preparedAt,editionDate:record.date});
 validatePolicySnapshot(record.policyRecords,{now:record.preparedAt});
 if(record.intelligence.evaluatedAt!==record.preparedAt)throw Error('Newsroom market freshness not re-evaluated');
 return record;
}
async function main(){const args=process.argv.slice(2),files={};let apply=false;for(let i=0;i<args.length;i++){if(args[i]==='--apply'){apply=true;continue}if(!['--snapshot','--intelligence','--policy','--output'].includes(args[i])||!args[i+1])throw Error('Invalid arguments');files[args[i].slice(2)]=args[++i]}
 const json=async f=>JSON.parse(await readFile(f,'utf8'));
 if(!files.snapshot||!files.intelligence||!files.policy)throw Error('All three evidence inputs required');
 const record=prepareNewsroom({snapshot:await json(files.snapshot),intelligence:await json(files.intelligence),policyRecords:await json(files.policy),registry:await json(path.join(root,'config/ltc-sources.json')),policy:await json(path.join(root,'config/ltc-publication.json'))});
 validateNewsroom(record);const serialized=JSON.stringify(record,null,2)+'\n';
 if(files.output)await writeFile(files.output,serialized,{flag:'wx',mode:0o600});
 if(apply){const dir=path.join(root,'content/ltc-newsroom');await mkdir(dir,{recursive:true});await writeFile(path.join(dir,record.id+'.json'),serialized,{flag:'wx'});await writeFile(path.join(dir,'latest.json'),serialized)}
 console.log(JSON.stringify({id:record.id,preparedAt:record.preparedAt,applied:apply,deployed:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(`Newsroom withheld: ${e.message}`);process.exitCode=1});
