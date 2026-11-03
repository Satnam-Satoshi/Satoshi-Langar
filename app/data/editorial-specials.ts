import charlie from '../../content/specials/charlie-lee-r1.json';
import iykyk from '../../content/specials/iykyk-r1.json';

export type EditorialSpecial = {
 id:string;slug:string;title:string;subject:string;dek:string;preparedAt:string;researchThrough:string;byline:string;classification:string;
 intro:string[];sections:{id:string;title:string;kicker:string;paragraphs:string[];takeaway:string;sourceIds:string[]}[];
 timeline:{date:string;label:string;sourceIds:string[]}[];quotes:{text:string;attribution:string;sourceId:string}[];
 sources:{id:string;title:string;publisher:string;url:string;publishedAt:string|null;checkedAt:string;note:string}[];limits:string[];
};
export const editorialSpecials = [charlie,iykyk] as EditorialSpecial[];
export const specialHref=(slug:string)=>`/conversations/specials/${slug}/`;
export const specialArtwork=(slug:string)=>`/magazine/specials-october/${slug==='charlie-lee'?'charlie-quiet-fork':'iykyk-open-archive'}.png`;
