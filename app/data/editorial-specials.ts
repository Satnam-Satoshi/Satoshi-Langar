import moon from '../../content/specials/litecoin-to-the-moon-r1.json';
import litvmFamily from '../../content/specials/litvm-family-r1.json';
import jack from '../../content/specials/jack-mallers-r1.json';
import birthdayInterview from '../../content/specials/charlie-84million-r1.json';
import charlie from '../../content/specials/charlie-lee-r1.json';
import iykyk from '../../content/specials/iykyk-r1.json';
import people from '../../content/specials/proof-of-people-r1.json';

export type EditorialSpecial = {
 id:string;slug:string;title:string;subject:string;dek:string;preparedAt:string;researchThrough:string;byline:string;classification:string;
 intro:string[];sections:{id:string;title:string;kicker:string;paragraphs:string[];takeaway:string;sourceIds:string[]}[];
 timeline:{date:string;label:string;sourceIds:string[]}[];quotes:{text:string;attribution:string;sourceId:string}[];
 sources:{id:string;title:string;publisher:string;url:string;publishedAt:string|null;checkedAt:string;note:string}[];limits:string[];
 interview?:{url:string;publisher:string;duration:string;reviewMethod:string;chapters:{time:string;seconds:number;label:string}[]};
};
export const editorialSpecials = [moon,litvmFamily,birthdayInterview,jack,people,charlie,iykyk] as EditorialSpecial[];
export const specialHref=(slug:string)=>`/conversations/specials/${slug}/`;
export const specialArtwork=(slug:string)=>slug==='litecoin-to-the-moon'?'/magazine/litecoin-to-the-moon/cover.svg':slug==='litvm-family'?'/magazine/litvm-family/campaign.png':slug==='charlie-84million'?'/magazine/charlie-84million/cover.png':slug==='jack-mallers'?'/magazine/jack-mallers/cover.png':slug==='proof-of-people'?'/magazine/proof-of-people/cover.png':`/magazine/specials-october/${slug==='charlie-lee'?'charlie-quiet-fork':'iykyk-open-archive'}.png`;

export const specialShareArtwork=(slug:string)=>slug==='litecoin-to-the-moon'?'/magazine/litecoin-to-the-moon/campaign.png':specialArtwork(slug);
