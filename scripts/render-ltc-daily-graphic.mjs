import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
const check=(ok,code)=>{if(!ok)throw Error(code);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const clean=(value,max)=>{check(typeof value==='string'&&value.trim().length>0,'invalid_graphic_text');const text=value.replace(/[\u0000-\u001f\u007f\uD800-\uDFFF]/gu,'').replace(/\s+/g,' ').trim();return text.length>max?text.slice(0,max-1).trimEnd()+'…':text;};
const xml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
function wrap(value,width,maxLines){const lines=[];let line='';for(let word of value.split(' ')){if(word.length>width)word=word.slice(0,width-1)+'…';if(line&&line.length+word.length+1>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);if(lines.length>maxLines){lines.length=maxLines;lines[maxLines-1]=lines[maxLines-1].slice(0,width-1).replace(/[.,;:!? ]+$/,'')+'…';}return lines;}
function textLines(text,x,y,{size=34,color='#eaf3da',width=26,lines=3,leading=size*1.15,weight=400}={}){return wrap(text,width,lines).map((line,i)=>`<text x="${x}" y="${y+i*leading}" fill="${color}" font-size="${size}" font-weight="${weight}">${xml(line)}</text>`).join('');}
export function dailyGraphicPlan(edition){
 check(edition&&edition.status==='published'&&/^\d{4}-\d{2}-\d{2}-r[1-9]\d*$/.test(edition.id)&&edition.id===`${edition.date}-r${edition.revision}`&&Number.isSafeInteger(edition.revision),'invalid_graphic_edition');
 check(new Date(`${edition.date}T00:00:00Z`).toISOString().slice(0,10)===edition.date&&typeof edition.publishedAt==='string'&&Number.isFinite(Date.parse(edition.publishedAt)),'invalid_graphic_date');
 const features=edition.features;check(features&&Array.isArray(features.stories)&&features.stories.length>0&&Array.isArray(features.sources)&&/^\d{4}-\d{2}-\d{2}$/.test(features.issueDate)&&features.issueDate<=edition.date,'missing_graphic_features');
 const stories=features.stories.slice(0,3).map(story=>{
  check(story&&Array.isArray(story.sourceIds)&&story.sourceIds.length>0,'missing_graphic_sources');
  const sources=story.sourceIds.map(id=>{const source=features.sources.find(s=>s.id===id);check(source&&typeof source.url==='string'&&/^https:\/\//.test(source.url),'missing_graphic_source');return source;});
  return {id:clean(story.id,100),title:clean(story.title,160),desk:clean(story.desk,50),classification:clean(story.classification,80),sourceDates:[...new Set(sources.map(source=>source.publishedAt??'Publication date not supplied'))].map(date=>clean(date,60)),sourceURLs:sources.map(s=>s.url)};
 });
 const headline=clean(features.title,150),sourceDates=[...new Set(stories.flatMap(story=>story.sourceDates))];
 return {schemaVersion:1,width:1200,height:630,editionId:edition.id,date:edition.date,featureDate:features.issueDate,headline,stories,sourceDates,publishedAt:edition.publishedAt,attribution:'AI-prepared · LTC Media · Read the dated sourcebook',readURL:`https://ltcmagazine.org/conversations/editions/${edition.id}/`,design:'content-led-news-map-v1'};
}
export function dailyGraphicSVG(plan){
 const cards=plan.stories.map((story,i)=>{
  const y=112+i*139,accent=['#d6f277','#d4c5ff','#efbc69'][i];
  return `<g><rect x="640" y="${y}" width="514" height="125" rx="16" fill="${accent}"/><circle cx="665" cy="${y+21}" r="5" fill="#193c34"/><text x="680" y="${y+26}" font-size="10" font-weight="700" fill="#193c34">${xml((story.desk+' · '+story.classification).toUpperCase().slice(0,68))}</text>${textLines(story.title,660,y+57,{size:23,color:'#193c34',width:38,lines:2,leading:27,weight:700})}<text x="660" y="${y+111}" font-size="11" fill="#284a40">SOURCE: ${xml(story.sourceDates.join(' / ').slice(0,72))}</text></g>`;
 }).join('');
 const seed=parseInt(hash(JSON.stringify(plan)).slice(0,8),16),angles=plan.stories.map((story,i)=>{const x=90+i*145,y=459+((seed>>(i*3))&15);return `<circle cx="${x}" cy="${y}" r="${23+i*5}" stroke="${['#d6f277','#d4c5ff','#efbc69'][i]}" stroke-width="3" fill="none"/><text x="${x}" y="${y+5}" text-anchor="middle" font-size="13" fill="#eaf3da">0${i+1}</text>`;}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title description"><title id="title">${xml(plan.headline)} · ${xml(plan.date)}</title><desc id="description">An original daily editorial map of ${xml(plan.stories.map(s=>s.title).join('; '))}. Source publication dates are printed on each story. No market forecast.</desc><rect width="1200" height="630" fill="#183932"/><g font-family="Liberation Sans,Arial,sans-serif"><path d="M32 84H1168M32 549H1168" stroke="#6b8876" stroke-width="1"/><text x="46" y="51" fill="#d6f277" font-size="22" font-weight="700" letter-spacing="3">LTC MAGAZINE</text><text x="1154" y="51" text-anchor="end" fill="#eaf3da" font-size="17">${xml(plan.date)} · ${xml(plan.editionId.split('-').at(-1).toUpperCase())}</text><text x="46" y="131" fill="#b8cbb4" font-size="14" letter-spacing="3">THE DAILY NEWS MAP</text>${textLines(plan.headline,46,196,{size:47,width:22,lines:4,leading:54})}<path d="M87 458C155 408 235 509 390 460" stroke="#6b8876" fill="none" stroke-width="2"/>${angles}<text x="46" y="524" font-size="12" fill="#b8cbb4">${xml(plan.featureDate===plan.date?'ORIGINAL SOURCE DATES STAY VISIBLE.':`FEATURE READING DATED ${plan.featureDate} · CARRIED FORWARD.`)}</text>${cards}<text x="46" y="580" font-size="15" fill="#eaf3da">${xml(plan.attribution)}</text><text x="46" y="607" font-size="13" fill="#b8cbb4">ltcmagazine.org/conversations/editions/${xml(plan.editionId)}/</text><text x="1154" y="605" text-anchor="end" font-size="35" fill="#d6f277">Ł</text></g></svg>`;
}
export async function renderDailyGraphic(edition,{dependencyRoot=process.cwd(),distribution}={}){
 check(distribution===undefined,'distribution_chart_not_implemented');
 const plan=dailyGraphicPlan(edition),svg=dailyGraphicSVG(plan);
 // sharp is Next's existing image dependency, not an extra service or package.
 const appRequire=createRequire(path.resolve(dependencyRoot,'package.json'));
 const nextRequire=createRequire(appRequire.resolve('next/package.json'));
 const sharp=nextRequire('sharp');
 // Explicit repository fonts avoid depending on Lambda/system font discovery.
 const fontRoot=path.resolve(dependencyRoot,'public/magazine/proof-of-birthday/fonts');
 const [regular,bold]=await Promise.all(['LiberationSans-Regular.ttf','LiberationSans-Bold.ttf'].map(name=>readFile(path.join(fontRoot,name))));
 const {createElement}=appRequire('react'),{ImageResponse}=appRequire('next/og');
 const shapes=svg.replace(/<text\b[^>]*>[\s\S]*?<\/text>/g,'');
 const layers=[createElement('img',{key:'shapes',src:`data:image/svg+xml;base64,${Buffer.from(shapes).toString('base64')}`,width:1200,height:630,style:{position:'absolute',left:0,top:0}})];
 const decode=value=>value.replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&amp;','&');
 for(const match of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)){
  const attributes=Object.fromEntries([...match[1].matchAll(/([a-z-]+)="([^"]*)"/g)].map(pair=>[pair[1],pair[2]]));
  const size=Number(attributes['font-size']),x=Number(attributes.x),y=Number(attributes.y);check([size,x,y].every(Number.isFinite),'graphic_text_layout_invalid');
  const anchor=attributes['text-anchor'];
  layers.push(createElement('div',{key:`text-${layers.length}`,style:{display:'flex',position:'absolute',...(anchor==='end'?{right:1200-x}:{left:x}),top:y-size*.86,fontFamily:'LTC Liberation',fontSize:size,fontWeight:attributes['font-weight']==='700'?700:400,color:attributes.fill,whiteSpace:'nowrap',...(anchor==='middle'?{transform:'translateX(-50%)'}:{})}},decode(match[2])));
 }
 const rendered=new ImageResponse(createElement('div',{style:{display:'flex',position:'relative',width:1200,height:630}},...layers),{width:1200,height:630,fonts:[{name:'LTC Liberation',data:regular,weight:400,style:'normal'},{name:'LTC Liberation',data:bold,weight:700,style:'normal'}]});
 const png=Buffer.from(await rendered.arrayBuffer());
 const metadata=await sharp(png).metadata();check(metadata.format==='png'&&metadata.width===1200&&metadata.height===630,'graphic_render_dimensions_invalid');
 const base=`public/magazine/daily/${edition.id}`;
 return {png,svg,metadata:{...plan,pngSha256:hash(png),svgSha256:hash(svg),pngBytes:png.length,renderer:'Next ImageResponse · original SVG · explicit Liberation Sans glyphs'},paths:{png:`${base}/social.png`,svg:`${base}/social.svg`,manifest:`${base}/graphic.json`}};
}
/** New dated directories only; never overwrite immutable historical art. */
export async function saveDailyGraphic(result,{root=process.cwd()}={}){
 check(result&&Buffer.isBuffer(result.png)&&result.metadata?.editionId&&result.paths?.png===`public/magazine/daily/${result.metadata.editionId}/social.png`&&/^\d{4}-\d{2}-\d{2}-r[1-9]\d*$/.test(result.metadata.editionId),'invalid_graphic_result');
 check(hash(result.png)===result.metadata.pngSha256&&hash(result.svg)===result.metadata.svgSha256,'graphic_digest_mismatch');
 const directory=path.resolve(root,'public/magazine/daily',result.metadata.editionId);await mkdir(path.dirname(directory),{recursive:true});
 try{await mkdir(directory);}catch(error){if(error.code!=='EEXIST')throw error;const png=await readFile(path.join(directory,'social.png')),svg=await readFile(path.join(directory,'social.svg'),'utf8'),manifest=await readFile(path.join(directory,'graphic.json'),'utf8');check(hash(png)===result.metadata.pngSha256&&hash(svg)===result.metadata.svgSha256&&manifest===JSON.stringify(result.metadata,null,2)+'\n','immutable_daily_graphic_exists');return {saved:false,alreadyRecorded:true,paths:result.paths};}
 try{await writeFile(path.join(directory,'social.svg'),result.svg,{flag:'wx'});await writeFile(path.join(directory,'social.png'),result.png,{flag:'wx'});await writeFile(path.join(directory,'graphic.json'),JSON.stringify(result.metadata,null,2)+'\n',{flag:'wx'});}catch(error){throw Error('daily_graphic_incomplete');}
 return {saved:true,paths:result.paths};
}
