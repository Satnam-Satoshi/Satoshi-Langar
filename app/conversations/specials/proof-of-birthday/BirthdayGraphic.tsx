import type { BirthdayPage } from '../../../data/proof-of-birthday';
const wrap = (text: string, max = 24) => {
  const lines: string[] = []; let line = '';
  for (const word of text.split(' ')) { if ((line + ' ' + word).trim().length > max && line) { lines.push(line); line = word; } else line = (line + ' ' + word).trim(); }
  if (line) lines.push(line); return lines;
};
function Label({ text, x, y, max = 24, size = 15, fill = '#192d40', anchor = 'middle' }: { text: string; x: number; y: number; max?: number; size?: number; fill?: string; anchor?: 'middle' | 'start' }) {
  return <text x={x} y={y} fontFamily="Birthday Sans, Arial, sans-serif" fontSize={size} fill={fill} textAnchor={anchor}>{wrap(text, max).map((line, i) => <tspan x={x} dy={i ? size * 1.25 : 0} key={i}>{line}</tspan>)}</text>;
}
export default function BirthdayGraphic({ page: p }: { page: BirthdayPage }) {
  const labels = p.diagram?.labels ?? ['READ', 'QUESTION', 'CONTRIBUTE'];
  const rawKind = p.diagram?.kind ?? 'network';
  const kind = ({'policy-authority':'layers','policy-news-lanes':'matrix','pool-support-matrix':'matrix','payout-paths':'layers','miner-ledger':'layers','ladder':'layers'} as Record<string,string>)[rawKind] ?? rawKind;
  const ink = '#172a3b', blue = p.accent, pale = '#e2e7e9';
  const count = labels.length;
  const isRoute = ['route','flow','journey','wrapped','dates','halving'].includes(kind);
  return <svg viewBox="0 0 720 245" role="img" aria-label={`${labels.join(' · ')}. ${p.diagram?.caption ?? 'Original editorial diagram.'}`}>
    <title>{p.diagram?.caption ?? p.takehome}</title>
    <rect width="720" height="245" fill="#e9e9e3"/>
    <pattern id={`dots-${p.page}`} width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".65" fill="#a2aeb7"/></pattern>
    <rect width="720" height="245" fill={`url(#dots-${p.page})`}/>
    {kind==='auxpow-flow' ? <>
      <path d="M120 66H600M360 94V142H185V155M360 142H535V155" stroke={blue} strokeWidth="2" fill="none"/>
      {labels.map((label,i)=>{const x=i<3?120+i*240:i===3?185:535,y=i<3?56:188,w=i<3?210:316;return <g key={label}><rect x={x-w/2} y={y-33} width={w} height="74" fill={i===2?blue:ink}/><Label text={label} x={x} y={y-10} size={14} max={i<3?22:33} fill="#fff"/></g>;})}
    </> : kind==='bookshelf' ? <>
      <rect x="90" y="18" width="238" height="210" fill={ink}/><rect x="102" y="18" width="3" height="210" fill="#b8d0e2"/>
      <Label text="THE OTHER BITCOIN" x={210} y={82} max={12} size={29} fill="#fff"/><Label text="Master / Publisher record" x={210} y={193} max={27} size={11} fill="#c6d5e1"/>
      <rect x="392" y="18" width="238" height="210" fill={blue}/><rect x="404" y="18" width="3" height="210" fill="#b8d0e2"/>
      <Label text="13 REASONS" x={512} y={80} max={12} size={29} fill="#fff"/><Label text="Forthcoming listing / Details to verify" x={512} y={169} max={22} size={12} fill="#fff"/>
    </> : count>4 ? <>
      {labels.map((label,i)=>{const x=25+(i%3)*235,y=22+Math.floor(i/3)*111;return <g key={label}><rect x={x} y={y} width="210" height="89" fill={i%2?blue:ink}/><Label text={label} x={x+105} y={y+35} max={22} size={14} fill="#fff"/></g>;})}
    </> : isRoute ? <>
      <path d="M45 92 H675" stroke={blue} strokeWidth="2" fill="none"/>
      {labels.map((label, i) => { const x = 62 + i * (596 / Math.max(1,count-1)); return <g key={label}>
        <circle cx={x} cy="92" r={kind==='halving' ? [44,34,25,18][i%4] : 24} fill={i % 2 ? blue : ink}/>
        <text x={x} y="97" textAnchor="middle" fontFamily="Birthday Sans, Arial" fontSize="12" fill="#fff">{String(i+1).padStart(2,'0')}</text>
        <Label text={label} x={Math.max(80,Math.min(640,x))} y={152} max={count>2?17:22} size={17}/>
      </g>;})}
    </> : kind==='parallel' ? <>
      <circle cx="200" cy="115" r="87" fill={ink}/><circle cx="520" cy="115" r="87" fill={blue}/>
      <path d="M290 115H430" stroke={blue} strokeWidth="2" strokeDasharray="4 5"/>
      <Label text={labels[0]} x={200} y={111} max={17} size={20} fill="#fff"/><Label text={labels[1]} x={520} y={111} max={17} size={20} fill="#fff"/>
      <Label text={labels[2]??'Distinct rules'} x={200} y={224} max={29} size={13}/><Label text={labels[3]??'Shared questions'} x={520} y={224} max={29} size={13}/>
    </> : ['number','record','passport'].includes(kind) ? <>
      <rect x="25" y="25" width="320" height="195" fill={ink}/>
      <Label text={labels[0]} x={185} y={125} max={17} size={labels[0].length>14?29:44} fill="#fff"/>
      {labels.slice(1).map((label,i)=><g key={label}><path d={`M380 ${50+i*(160/Math.max(1,count-1))} H680`} stroke={blue} strokeWidth="1"/><Label text={label} x={390} y={78+i*(160/Math.max(1,count-1))} max={30} size={22} anchor="start"/></g>)}
    </> : ['stack','layers','claims','calculator'].includes(kind) ? <>
      {labels.map((label,i)=>{const h=Math.min(57,192/count),y=22+i*(198/count);return <g key={label}><path d={`M${35+i*17} ${y}h${650-i*34}v${h}H${35+i*17}Z`} fill={i%2?blue:ink}/><Label text={label} x={360} y={y+h/2-((label.length>52)?5:-5)} max={62} size={label.length>45?14:18} fill="#fff"/></g>;})}
    </> : kind==='matrix' ? <>
      {labels.map((label,i)=><g key={label}><rect x={25+(i%2)*345} y={20+Math.floor(i/2)*107} width="325" height="94" fill={i%2?blue:ink}/><text x={45+(i%2)*345} y={48+Math.floor(i/2)*107} fontSize="12" fill="#b8d4e8">0{i+1}</text><Label text={label} x={187+(i%2)*345} y={76+Math.floor(i/2)*107} max={28} size={18} fill="#fff"/></g>)}
    </> : <>
      <circle cx="360" cy="121" r="78" fill={pale} stroke={blue} strokeWidth="1"/><circle cx="360" cy="121" r="55" fill={ink}/>
      <text x="360" y="135" fontFamily="Birthday Serif, Georgia" fontSize="45" fill="#fff" textAnchor="middle">{String(p.page).padStart(2,'0')}</text>
      {labels.map((label,i)=>{const x=i%2?570:150,y=count<=2?121:60+Math.floor(i/2)*122;return <g key={label}><path d={`M${x<360?230:490} ${y}L${x<360?288:432} 121`} fill="none" stroke={blue}/><rect x={x-116} y={y-28} width="232" height="65" fill={i%2?blue:ink}/><Label text={label} x={x} y={y-1} max={25} size={14} fill="#fff"/></g>;})}
    </>}
  </svg>;
}
