import record from '../../content/specials/litecoin-at-15-r1.json';
export type AnniversarySource={id:string;number:number;title:string;url:string;publisher:string;publishedDate:string|null;checkedDate:string};
export type AnniversaryPage={page:number;section:string;kicker:string;title:string;dek:string;paragraphs:string[];bullets:string[];sources:string[];layout:string;sourcebook?:boolean;classification:string;quote?:{text:string;person:string;date:string;sourceId:string};art?:{src:string;alt:string;caption:string};diagram?:{src:string;kind:string;labels:string[];caption:string}};
export const anniversary=record as unknown as typeof record & {pages:AnniversaryPage[];sources:AnniversarySource[]};
export const anniversaryBase='/conversations/specials/litecoin-at-15/';
export const anniversaryPageHref=(page:number)=>`${anniversaryBase}${page}/`;
export const anniversarySources=new Map<string,AnniversarySource>(anniversary.sources.map(source=>[source.id,source]));
