import { publicationExclusions } from './ltc-public-editions.mjs';
const SOURCE_DESK='/conversations/#source-desk';
// Match literal local/canonical targets only. URL normalization must not make
// another site's similar path, a nested route or a query substring match.
function excludedTarget(href,config){
 if(typeof href!=='string')return false;
 const match=/^(?:https:\/\/(?:ltcmagazine\.org|satnamsatoshi\.com))?(\/conversations\/editions\/[^?#]+)(?:[?#].*)?$/.exec(href);
 if(!match)return false;
 const path=match[1],excluded=publicationExclusions(config);
 return [...excluded].some(id=>[ `/conversations/editions/${id}`, `/conversations/editions/${id}/`, `/conversations/editions/${id}/index.html` ].includes(path));
}
/** Display-only routing; never changes source records or source/check dates.
 * @param {{readMore:string,url?:string}} story
 * @param {any} config
 * @returns {{href:string,label:string|null,destination:'unchanged'|'primary-source'|'source-desk'}}
 */
export function sourceDeskReadMore(story,config){
 if(!excludedTarget(story.readMore,config))return {href:story.readMore,label:null,destination:'unchanged'};
 try{const source=new URL(story.url??'');if(source.protocol==='https:'&&!source.username&&!source.password&&!excludedTarget(story.url,config))return {href:story.url,label:'Open primary source',destination:'primary-source'};}catch{}
 return {href:SOURCE_DESK,label:'Open source desk',destination:'source-desk'};
}
