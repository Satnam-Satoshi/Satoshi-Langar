import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validatePolicy } from './prepare-ltc-edition.mjs';
import { validateEcosystemReport } from './lib/ltc-ecosystem-news.mjs';
export async function archiveEcosystemReport(report,{directory='content/ltc-ecosystem',selectionOutput=null,policy,now=new Date().toISOString()}={}){
  validatePolicy(policy??JSON.parse(await readFile(new URL('../config/ltc-publication.json',import.meta.url),'utf8')));
  validateEcosystemReport(report,{now});
  await mkdir(directory,{recursive:true});const file=path.join(directory,report.date+'.json');
  let selected,status;
  try{selected=JSON.parse(await readFile(file,'utf8'));validateEcosystemReport(selected,{now});if(selected.date!==report.date)throw Error('ecosystem_archive_identity_mismatch');status='unchanged';}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!selected){await writeFile(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});selected=report;status='archived';}
  // Exact same-day archive readback owns downstream feature/source-desk inputs,
  // even when a newer collection ran during recovery from an interrupted attempt.
  if(selectionOutput)await writeFile(selectionOutput,JSON.stringify(selected,null,2)+'\n',{flag:'wx',mode:0o600});
  return{status,date:report.date,report:selected};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{
  const args=process.argv.slice(2);if(![2,4].includes(args.length)||args[0]!=='--snapshot'||args.length===4&&(args[2]!=='--selected-output'||!args[3]))throw Error('invalid_arguments');
  const result=await archiveEcosystemReport(JSON.parse(await readFile(args[1],'utf8')),{selectionOutput:args[3]??null});
  console.log(JSON.stringify({status:result.status,date:result.date}));
}catch{console.error('Ecosystem archive withheld');process.exitCode=1;}}
