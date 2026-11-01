const check=(value,code)=>{if(!value)throw Error(code);};
export function publicationExclusions(config){
 check(config?.schemaVersion===1&&config.policy==='prepared-records-never-publicly-released'&&Array.isArray(config.editions)&&config.editions.length<=100,'invalid_publication_exclusions');
 const ids=new Set();
 for(const record of config.editions){check(/^\d{4}-\d{2}-\d{2}-r[1-9]\d?$/.test(record?.id??'')&&record.date===record.id.slice(0,10)&&new Date(record.date+'T00:00:00Z').toISOString().slice(0,10)===record.date&&/^[a-f0-9]{64}$/.test(record.editionSha256??'')&&typeof record.reason==='string'&&record.reason.length>0&&!ids.has(record.id),'invalid_publication_exclusions');ids.add(record.id);}
 return ids;
}
/** A prepared record is not evidence that an issue reached the public site.
 * Explicit exclusions are implementation-reviewed source, never daily data.
 * @template {{id:string}} T
 * @param {T[]} records
 * @param {any} config
 * @returns {T[]}
 */
export function publicEditions(records,config){
 check(Array.isArray(records),'invalid_public_editions');const excluded=publicationExclusions(config);
 return records.filter(record=>!excluded.has(record.id));
}
export function excludedPublicationPath(relative,config,eligibleRecords=[]){
 const excluded=publicationExclusions(config),match=/^(?:conversations\/editions\/([^/]+)(?:\/|$)|data\/ltc-editions\/([^/]+)\.json$|magazine\/daily\/([^/]+)(?:\/|$))/.exec(relative);
 if(!match)return false;const id=match[1]??match[2]??match[3];
 return excluded.has(id)||(/^\d{4}-\d{2}-\d{2}$/.test(id)&&config.editions.some(record=>record.date===id)&&!eligibleRecords.some(record=>record.date===id));
}
