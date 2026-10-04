import styles from './ltc-story-art.module.css';
const art = {
 network: {src:'litecoin-open-network.jpg', alt:'Layered cobalt bridges connect an open ledger across a paper landscape.', caption:'Open networks, shared possibility.'},
 privacy: {src:'mweb-private-public.jpg', alt:'Translucent paper encloses an inner network while connections remain visible outside.', caption:'Privacy is a design question. So is its boundary.'},
 builders: {src:'open-builders-workshop.jpg', alt:'A modular architectural workshop with open blueprints and unfinished bridges.', caption:'An open workshop. A system still being built.'},
 community: {src:'open-table-editorial.jpg', alt:'An open book becomes a communal table beneath ink arches and a paper sun.', caption:'Knowledge becomes useful when it is shared.'},
};
export type StoryArtKind = keyof typeof art;
export function storyArtForDesk(id:string): StoryArtKind { return id==='mweb'?'privacy':['builders','morpho','circle-arc','wrapped-assets','bitcoin-core','lightning','stellar'].includes(id)?'builders':['community-newsroom','partner-studio','21-standard'].includes(id)?'community':'network'; }
export default function LtcStoryArt({kind='network',priority=false,caption=true}:{kind?:StoryArtKind;priority?:boolean;caption?:boolean}) { const item=art[kind];return <figure className={styles.figure} data-art-kind={kind}><img src={`/magazine/${item.src}`} width="1536" height="1024" alt={item.alt} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':undefined}/>{caption&&<figcaption><span>{item.caption}</span><small>Original AI-generated conceptual illustration · not a photograph or data chart</small></figcaption>}</figure>; }
