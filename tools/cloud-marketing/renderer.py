#!/usr/bin/env python3
"""Private source-attested editorial renderer. Never publishes or fetches credentials."""
import shutil
import argparse, datetime as dt, hashlib, html, json, re, subprocess, textwrap
from pathlib import Path
from urllib.parse import urlparse
STAGES={'testnet','live','planned','in_build','unverified'}
THEMES={'orange':('#ed4a17','#f4eddf','#131a20'),'blue':('#2463ba','#f1f5fa','#102035')}
def require(ok,msg):
    if not ok: raise ValueError(msg)
def date(value):
    require(isinstance(value,str) and bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}',value)),'ISO date required')
    return dt.date.fromisoformat(value)
def url(value):
    require(isinstance(value,str),'URL must be string')
    u=urlparse(value)
    require(u.scheme=='https' and bool(u.hostname) and not u.username and not u.password,'HTTPS URL required')
    return u
def validate(m, *, today=None):
    today=today or dt.date.today()
    require(isinstance(m,dict),'object required')
    for k in ['story_key','title','subtitle','claim','stage','checked_date','edition_date','sources','tags','theme','verification','alt']:
        require(k in m,'missing '+k)
    require(bool(re.fullmatch(r'[a-z0-9-]{3,90}',m['story_key'])),'bad story key')
    for k,n in [('title',48),('subtitle',68),('claim',145),('alt',900)]:
        require(isinstance(m[k],str) and 0<len(m[k].strip())<=n,'bad length '+k)
        require(not any(ord(c)<32 for c in m[k]),'control character '+k)
    require(m['stage'] in STAGES,'unsupported stage')
    require(m['theme'] in THEMES,'unsupported theme')
    checked=date(m['checked_date']); edition=date(m['edition_date'])
    require(checked<=today,'future verification')
    require((today-checked).days<=1,'verification older than one day')
    require(abs((edition-checked).days)<=1,'stale verification')
    require(m['verification'].get('human_or_agent_reviewed') is True,'missing verification')
    require(m['verification'].get('claim_supported') is True,'unsupported claim')
    require(isinstance(m['sources'],list) and len(m['sources'])>0,'missing sources')
    for s in m['sources']:
        url(s['url']);require(s.get('primary') is True,'primary source required')
        require(s.get('supports_claim') is True,'source must support claim')
        require(date(s['checked_date'])==checked,'source verification date mismatch')
    require(isinstance(m['tags'],list) and len(m['tags'])<=3,'too many tags')
    for t in m['tags']:
        require(t['platform'] in ['X','Instagram'],'unsupported platform')
        require(bool(re.fullmatch(r'@[A-Za-z0-9_.]{1,30}',t['handle'])),'bad handle')
        url(t['official_source_url']); dest=url(t['linked_target'])
        allowed={'X':{'x.com','twitter.com','www.x.com','www.twitter.com'},'Instagram':{'instagram.com','www.instagram.com'}}
        require(dest.hostname in allowed[t['platform']],'platform mismatch')
        require(dest.path.strip('/').lower()==t['handle'][1:].lower(),'handle target mismatch')
        require(t.get('outbound_link_verified') is True,'missing tag verification')
        require(date(t['checked_date'])==checked,'tag date mismatch')
    wrap_measured(m['title'],64,True,2)
    wrap_measured(m['subtitle'],31,True,2)
    wrap_measured(m['claim'],25,False,3)
    b=m['binding']; require(b['kind']=='legacy_public_readback','unsupported binding kind')
    require(bool(re.fullmatch(r'[A-Za-z0-9._-]{1,50}',b['edition_revision'])),'bad revision')
    url(b['canonical_story_url']); require(bool(re.fullmatch(r'[0-9a-f]{64}',b['pdf_sha256'])),'bad PDF hash')
    require(bool(re.fullmatch(r'[0-9a-f]{40}',b['source_revision'])),'bad source revision')
    require(bool(b['deployment_id']),'missing deployment')
    for k in ['event_date','publication_date']:
        require(k in m,'missing '+k)
        if m[k] is not None:date(m[k])
    return m
def render(m,out,evidence_path, *, today=None):
    validate(m,today=today); validate_evidence(m,evidence_path); require(shutil.which('inkscape') is not None,'Inkscape unavailable'); out=Path(out);out.mkdir(parents=True,exist_ok=True)
    lock=out/(m['story_key']+'.reservation')
    for suffix in ['.svg','.png','.manifest.json']:
        require(not (out/(m['story_key']+suffix)).exists(),'immutable output collision')
    with lock.open('x') as f:f.write('Reserved; never overwrite. Use new output directory for a new render.')
    a,b,c=THEMES[m['theme']]
    def text(s,x,y,size=26,bold=False,color=c):
        return f'<text x="{x}" y="{y}" font-family="DejaVu Sans" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}">{html.escape(s)}</text>'
    parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="{b}"/>',
      text('LTC MAGAZINE',60,108,66,True),text('ECOSYSTEM FIELD NOTES / '+m['edition_date'],60,151,20),
      f'<path d="M60 185H1020" stroke="{a}" stroke-width="8"/>']
    for i,line in enumerate(wrap_measured(m['title'],64,True,2)): parts.append(text(line,60,280+i*78,64,True))
    parts+=[f'<rect x="60" y="455" width="960" height="70" fill="{a}"/>',text('STAGE: '+m['stage'].replace('_',' ').upper(),85,502,32,True,'#fff')]
    for i,line in enumerate(wrap_measured(m['subtitle'],31,True,2)): parts.append(text(line,60,590+i*40,31,True))
    for i,line in enumerate(wrap_measured(m['claim'],25,False,3)): parts.append(text(line,60,710+i*35,25))
    parts.append(f'<rect x="60" y="840" width="960" height="265" fill="{c}"/>')
    for i,label in enumerate(['READ','CHECK','VERIFY']):
        x=110+i*310
        if i<2:parts.append(f'<path d="M{x+200} 950H{x+310}" stroke="{b}" stroke-width="3"/>')
        parts+=[f'<rect x="{x}" y="885" width="200" height="130" rx="8" fill="{a}"/>',text(label,x+29,960,29,True,'#fff')]
    parts+=[text('CONCEPTUAL EDITORIAL WORKFLOW / NOT MEASURED DATA',90,1060,17,False,b),
      text('Sources checked: '+m['checked_date'],60,1160,24,True),
      text('SATNAM SATOSHI / ltcmagazine.org',60,1210,25,True),
      text('AI-assisted editorial / Original vector artwork',60,1250,20),
      text('Read the ecosystem special. Verify before you act.',60,1300,20)]
    parts.append('</svg>')
    svg=out/(m['story_key']+'.svg');png=svg.with_suffix('.png')
    svg.write_text(''.join(parts))
    subprocess.run(['inkscape',str(svg),'--export-filename='+str(png)],check=True,capture_output=True,timeout=60)
    from PIL import Image
    with Image.open(png) as im: require(im.size==(1080,1350),'bad PNG size')
    record={**m,'artifact':{'svg':str(svg),'png':str(png),'bytes':png.stat().st_size,'sha256':hashlib.sha256(png.read_bytes()).hexdigest(),'dimensions':[1080,1350]},'renderer_version':'1.1.0','input_sha256':hashlib.sha256(json.dumps(m,sort_keys=True,separators=(',',':')).encode()).hexdigest(),'svg_sha256':hashlib.sha256(svg.read_bytes()).hexdigest(),'publishAllowed':False,'visual_qa':'pending'}
    (out/(m['story_key']+'.manifest.json')).write_text(json.dumps(record,indent=2))
    return record

def wrap_measured(value,size,bold,limit,width=940):
    from PIL import ImageFont
    font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if bold else '')+'.ttf'
    font=ImageFont.truetype(font_path,size)
    lines=[];line=''
    for word in value.split():
        require(font.getlength(word)<=width,'overwide token')
        trial=(line+' '+word).strip()
        if font.getlength(trial)>width:
            lines.append(line);line=word
        else:line=trial
    if line:lines.append(line)
    require(len(lines)<=limit,'measured line budget')
    return lines

def validate_evidence(m,evidence_path):
    path=Path(evidence_path)
    require(path.is_file(),'missing evidence file')
    require(hashlib.sha256(path.read_bytes()).hexdigest()==m.get('evidence_sha256'),'evidence hash mismatch')
    e=json.loads(path.read_text())
    require(bool(e.get('provenance')),'missing researcher provenance')
    require(e['checked_date']==m['checked_date'],'evidence date mismatch')
    require(e['binding']==m['binding'],'edition binding mismatch')
    receipts={}
    for s in e['sources']:
        url(s['url'])
        require(s['representation'] in ['web_tool_extraction','raw_origin_bytes'],'unknown representation')
        rel=Path(s['file']);require(not rel.is_absolute() and '..' not in rel.parts,'unsafe evidence path')
        f=path.parent/rel
        require(not f.is_symlink() and f.resolve().is_relative_to(path.parent.resolve()),'unsafe evidence path')
        require(hashlib.sha256(f.read_bytes()).hexdigest()==s['sha256'],'retrieval hash mismatch')
        require(s['checked_date']==m['checked_date'],'retrieval date mismatch')
        receipts[s['url']]=s
    claim=e['claims'][m['story_key']]
    require(claim['claim']==m['claim'] and claim['stage']==m['stage'],'claim not bound to evidence')
    require(claim['source_urls']==[s['url'] for s in m['sources']],'claim source mismatch')
    require(all(s['url'] in receipts for s in m['sources']),'missing source retrieval')
    for t in m['tags']:
        wanted={k:t[k] for k in ['platform','handle','official_source_url','linked_target']}
        require(wanted in e['tags'] and t['official_source_url'] in receipts,'missing outbound evidence')
    return e

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('metadata');p.add_argument('--evidence',required=True);p.add_argument('--output-dir',default='rendered');p.add_argument('--validate-only',action='store_true');a=p.parse_args()
    m=json.loads(Path(a.metadata).read_text())
    if a.validate_only:
        validate(m);validate_evidence(m,a.evidence);print('{"valid":true,"publishAllowed":false}')
    else:print(json.dumps(render(m,a.output_dir,a.evidence),indent=2))
