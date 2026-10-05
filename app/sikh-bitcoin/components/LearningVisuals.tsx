import type { CourseId, Lesson } from '../../data/courses';
import s from '../learning.module.css';
export const chapters: Record<CourseId, {title:string; note:string}[]> = {
  foundations:[{title:'Find your bearings',note:'Money, keys and the journey of a payment.'},{title:'Build good habits',note:'Fees, backups, privacy and the questions worth asking.'},{title:'Use what you know',note:'Creative work, community, networks and your first capstone.'}],
  'deep-dive':[{title:'Look under the hood',note:'Transactions, commitments and the chain of work.'},{title:'Follow the rules',note:'Incentives, policy, wallet standards and signing.'},{title:'Verify the system',note:'Recovery, nodes, Lightning and a payment traced end to end.'}],
  sovereignty:[{title:'Design for real life',note:'Threats, independent control and recovery.'},{title:'Map the dependencies',note:'Operations, wrapped assets, lending and price risk.'},{title:'Make a defensible decision',note:'Debt, exits, bridges, incident response and a final design.'}],
};
export const courseStyle: Record<CourseId,{verb:string;short:string;lab:string}> = {
 foundations:{verb:'Start here',short:'Make Bitcoin make sense.',lab:'sats'},
 'deep-dive':{verb:'Go deeper',short:'Follow the evidence.',lab:'transaction'},
 sovereignty:{verb:'Take control',short:'Design your independence.',lab:'multisig'},
};
export function CourseVisual({id}:{id:CourseId}) { return <div className={s.courseVisual} data-course={id} aria-hidden="true">{id==='foundations'?<div className={s.coin}>₿</div>:id==='deep-dive'?<div className={s.blocks}><span>INPUT</span><span>VERIFY</span><span>OUTPUT</span></div>:<div className={s.keys}><span>A</span><b>2/3</b><span>B</span></div>}</div>; }
const diagrams: Record<string,{title:string;items:[string,string][];caption:string}> = {
 'bitcoin-without-jargon':{title:'One bitcoin. A hundred million small units.',items:[['1 BTC','100,000,000 sats'],['0.001 BTC','100,000 sats'],['0.00001 BTC','1,000 sats']],caption:'These are equal-unit conversions, not prices or a request to buy.'},
 'keys-and-custody':{title:'Three things. Three different jobs.',items:[['Address','Receiving information. Sharing can affect privacy.'],['Key','Authorizes spending. Keep it secret.'],['Backup','Supports recovery. Protect it separately.']],caption:'An address is not a recovery method. Never put real secrets into a lesson or chat.'},
 'utxos-and-change':{title:'Every sat has a place in the calculation.',items:[['12,000','Input value in fictional sats'],['10,000','Recipient output'],['1,500 + 500','Change output + illustrative fee']],caption:'Input value = recipient value + change + fee. Real transaction construction has additional rules.'},
 'multisig-and-independence':{title:'Two signatures. Independent failure paths.',items:[['A + B','Can meet a 2-of-3 threshold'],['A + C','Can meet the same threshold'],['B + C','Can meet the same threshold']],caption:'Assumes valid signatures from distinct keys under the actual policy. A signing threshold is not proof of human authorization or recovery readiness.'},
 'native-and-wrapped-bitcoin':{title:'Similar exposure. Different dependencies.',items:[['Native','Bitcoin outputs and spending conditions'],['Wrapped','A representation on another chain'],['Redeem','A separate promise, process and dependency']],caption:'Holding a wrapped token is not the same as controlling native Bitcoin outputs.'},
 'bitcoin-and-litecoin':{title:'Related ideas. Separate networks.',items:[['Bitcoin','Its own ledger, rules and asset'],['Litecoin','Its own ledger, rules and asset'],['Verify','Check the network as well as the recipient']],caption:'A shared wallet interface does not make the two assets interchangeable.'},
 'proof-of-work-and-energy':{title:'Work proposes. Rules still decide.',items:[['Signers','Authorize transaction spending'],['Miners','Compete to produce valid blocks'],['Nodes','Check blocks against their rules']],caption:'More proof of work cannot make an invalid block acceptable to a validating node.'},
 'donations-and-accountability':{title:'A payment is one piece of the story.',items:[['Purpose','Agree how support may be used'],['Payment','Reconcile the financial record'],['Service','Review evidence of what happened']],caption:'A transaction alone does not prove that a meal was served or a promise was kept.'},
};
export function LessonVisual({lesson}:{lesson:Lesson}) {
 const d=diagrams[lesson.slug];
 return <figure className={s.visual}><span>{d?'The idea, at a glance':'Your learning map'}</span><h2>{d?.title||'Three questions to carry into this lesson.'}</h2><div className={s.diagram}>{d?d.items.map(([a,b])=><div key={a}><b>{a}</b><small>{b}</small></div>):lesson.outcomes.slice(0,3).map((outcome,i)=><div key={outcome}><b>0{i+1}</b><small>{outcome}</small></div>)}</div><figcaption>{d?.caption||'Use these goals to guide your reading. Try the paper exercise, then explain the result in your own words.'}</figcaption></figure>;
}
export function LearningSubnav(){return <nav className={s.subnav} aria-label="Learning navigation"><a href="/sikh-bitcoin/" className={s.eyebrow}>Sikh Bitcoin / The open school</a><div><a href="/sikh-bitcoin/#choose-course">Courses</a><a href="/sikh-bitcoin/lab/">Practice lab</a><a href="/miikey/">MiiKey resources ↗</a></div></nav>}
