// Shared source for the two reviewed homepage feature links. No live-data claim.
export default function LitecoinMetaFeature() {
  return <aside id="litecoin-meta-feature" aria-labelledby="litecoin-meta-feature-title" style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:24,margin:'28px 0',padding:'clamp(22px,4vw,40px)',border:'1px solid #d7d3cc',borderLeft:'6px solid #ff681f',background:'#fff9f2',color:'#101113'}}>
    <div style={{flex:'1 1 400px',minWidth:0}}>
      <p style={{margin:'0 0 12px',font:'700 11px/1.5 Arial,sans-serif',letterSpacing:'.12em',textTransform:'uppercase'}}>LTC Magazine / Special edition</p>
      <h2 id="litecoin-meta-feature-title" style={{margin:'0 0 14px',font:'800 clamp(28px,3vw,40px)/1.1 Arial,sans-serif',letterSpacing:'-.04em'}}>Litecoin Meta.<br/><em style={{fontFamily:'Georgia,serif',fontWeight:400}}>Beyond the headline.</em></h2>
      <p style={{maxWidth:680,margin:0,font:'18px/1.6 Georgia,serif'}}>Fourteen source-linked chapters on builders, native infrastructure and testnet experiments. Follow the evidence and its limits.</p>
    </div>
    <div style={{flex:'0 1 260px',minWidth:0}}>
      <a href="/conversations/specials/litecoin-meta/" style={{display:'inline-block',maxWidth:'100%',padding:'13px 18px',border:'1px solid #101113',background:'#101113',color:'#fff',font:'700 14px/1.5 Arial,sans-serif',textDecoration:'underline',textUnderlineOffset:4}}>Read Litecoin Meta →</a>
      <p style={{margin:'14px 0 0',font:'12px/1.6 Arial,sans-serif',color:'#555'}}>Research cutoff: November 18, 2026.<br/>Dated evidence, not a live feed.</p>
    </div>
  </aside>;
}
