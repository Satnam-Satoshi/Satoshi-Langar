"""Local draft artifacts only. No network, secrets, model or publication."""
import argparse, datetime, hashlib, html, io, json, os, pathlib, re, sys
import PIL, reportlab
from urllib.parse import urlsplit
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether, Flowable

FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
ORANGE='#ff641a'; INK='#171717'; PAPER='#faf7f0'
NOTICE='DRAFT - NOT FOR PUBLICATION'

def text(value, limit=4000):
    if not isinstance(value,str) or not value or len(value)>limit or any(ord(c)<32 and c not in '\n\t' for c in value): raise ValueError('bounded plain text required')
    return value

def parse_json(raw):
    if len(raw)>256*1024: raise ValueError('input byte bound')
    def pairs(items):
        out={}
        for k,v in items:
            if k in out: raise ValueError('duplicate JSON key')
            out[k]=v
        return out
    return json.loads(raw.decode('utf-8'),object_pairs_hook=pairs,parse_constant=lambda _: (_ for _ in ()).throw(ValueError('nonfinite JSON')))

def validate(data):
    if not isinstance(data,dict) or set(data)!={'schemaVersion','issueId','issueDate','title','draft','sourceUrls'} or data['schemaVersion']!=1: raise ValueError('render envelope')
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}',data['issueId']): raise ValueError('issue identity')
    if datetime.date.fromisoformat(data['issueDate']).isoformat()!=data['issueDate']: raise ValueError('issue date')
    text(data['title'],140)
    draft=data['draft']
    if not isinstance(draft,dict) or draft.get('publishable') is not False or draft.get('effects')!=[] or not isinstance(draft.get('stories'),list) or not 1<=len(draft['stories'])<=20: raise ValueError('draft-only input')
    urls=data['sourceUrls']
    if not isinstance(urls,dict) or len(urls)>100: raise ValueError('source map bound')
    for key,url in urls.items():
        text(key,128);text(url,2048);u=urlsplit(url)
        if u.scheme!='https' or not u.hostname or u.username or u.password or u.port or u.fragment or any(c in url for c in '<>"\\\r\n'): raise ValueError('inert HTTPS source required')
    ids=set(); count=0
    for story in draft['stories']:
        if not isinstance(story,dict) or story.get('publishable') is not False or story.get('claimApproved') is not False: raise ValueError('unapproved story required')
        sid=text(story.get('id'),128)
        if sid in ids: raise ValueError('duplicate story')
        ids.add(sid);text(story.get('title'),200)
        if not isinstance(story.get('facts'),list) or not isinstance(story.get('gaps'),list) or len(story['gaps'])>50: raise ValueError('story structure')
        for gap in story['gaps']: text(gap.get('reason'),200)
        count+=len(story['facts'])
        if count>100: raise ValueError('fact bound')
        for fact in story['facts']:
            text(fact.get('statement'));text(fact.get('id'),128)
            if fact.get('sourceId') not in urls: raise ValueError('source reference missing')
            for field in ['asOf','retrievedAt']: text(fact.get(field),40)
            if fact.get('eventAt') is not None: text(fact['eventAt'],40)
            if not isinstance(fact.get('limitations'),list) or len(fact['limitations'])>20: raise ValueError('limitations bound')
            for limitation in fact['limitations']: text(limitation,1000)
            if not re.fullmatch(r'[a-f0-9]{64}',fact.get('evidenceSha256','')): raise ValueError('evidence digest')
    return data

def wrap(draw,value,font,width):
    words=value.split();lines=[];line=''
    for word in words:
        candidate=(line+' '+word).strip()
        if draw.textbbox((0,0),candidate,font=font)[2]>width:
            if not line: raise ValueError('unbreakable image headline')
            lines.append(line);line=word
        else: line=candidate
    if line: lines.append(line)
    return lines

def graphic(title,issue_date,width,height):
    im=Image.new('RGB',(width,height),PAPER);d=ImageDraw.Draw(im)
    d.rectangle((0,0,width,22),fill=ORANGE)
    label=ImageFont.truetype(BOLD,round(width*.023));small=ImageFont.truetype(FONT,round(width*.022))
    margin=round(width*.06)
    d.text((margin,50),'LTC / CLOUD NEWSROOM',font=label,fill=INK)
    d.text((margin,95),issue_date+'  |  SOURCE-LED DRAFT',font=small,fill=INK)
    headline=None
    for size in range(round(width*.078),24,-2):
        font=ImageFont.truetype(BOLD,size)
        try:lines=wrap(d,title,font,width-2*margin)
        except ValueError:continue
        if len(lines)*(size*1.3)<height*.42: headline=(font,lines,size);break
    if not headline: raise ValueError('headline layout bound')
    font,lines,size=headline;y=height*.23
    for line in lines:d.text((margin,y),line,font=font,fill=INK);y+=size*1.3
    # Original native geometric illustration, not a market chart or data claim.
    cx=width*.76;cy=height*.77;r=min(width,height)*.14
    for scale in (1,.72,.44):d.ellipse((cx-r*scale,cy-r*scale,cx+r*scale,cy+r*scale),outline=ORANGE,width=max(4,round(width*.006)))
    d.line((margin,height*.72,width*.5,height*.72),fill=ORANGE,width=8)
    d.text((margin,height*.78),'EVIDENCE > CLAIMS',font=label,fill=INK)
    d.text((margin,height-65),NOTICE,font=label,fill=INK)
    out=io.BytesIO();im.save(out,format='PNG');return out.getvalue()

class EvidenceDiagram(Flowable):
    def __init__(self):
        super().__init__(); self.width=480; self.height=180
    def draw(self):
        c=self.canv;c.setStrokeColor(colors.HexColor(ORANGE));c.setLineWidth(3)
        for left,right in [(70,240),(240,410)]:c.line(left,105,right,105)
        for x,label in [(70,'SOURCE'),(240,'REVIEW'),(410,'DRAFT')]:
            c.setFillColor(colors.HexColor(PAPER));c.circle(x,105,38,fill=1,stroke=1)
            c.setFillColor(colors.HexColor(ORANGE));c.circle(x,105,10,fill=1,stroke=0)
            c.setFillColor(colors.HexColor(INK));c.setFont('DraftBold',10);c.drawCentredString(x,42,label)
        c.setFont('DraftSans',8);c.drawCentredString(240,10,'Editorial process illustration. Not a market chart or completed approval.')

def render(data):
    if len(json.dumps(data,ensure_ascii=False,allow_nan=False).encode())>256*1024: raise ValueError('input byte bound')
    validate(data)
    pdfmetrics.registerFont(TTFont('DraftSans',FONT));pdfmetrics.registerFont(TTFont('DraftBold',BOLD))
    supported=pdfmetrics.getFont('DraftSans').face.charWidths
    def glyphs(value):
        if isinstance(value,str) and any(ord(c) not in supported and c not in '\n\t' for c in value): raise ValueError('unsupported font character')
        elif isinstance(value,list):
            for item in value:glyphs(item)
        elif isinstance(value,dict):
            for item in value.values():glyphs(item)
    glyphs(data)
    body=ParagraphStyle('body',fontName='DraftSans',fontSize=10.5,leading=16,textColor=colors.HexColor(INK),spaceAfter=10)
    h1=ParagraphStyle('h1',parent=body,fontName='DraftBold',fontSize=28,leading=34,spaceAfter=18)
    h2=ParagraphStyle('h2',parent=body,fontName='DraftBold',fontSize=19,leading=25,spaceAfter=14)
    tiny=ParagraphStyle('tiny',parent=body,fontSize=8,leading=12,textColor=colors.HexColor('#555555'))
    p=lambda value,style=body:Paragraph(html.escape(value).replace('\n','<br/>'),style)
    flow=[p('LTC / CLOUD NEWSROOM',tiny),Spacer(1,25),p(data['title'],h1),p(data['issueDate']),p(NOTICE,h2),p('Prepared from source-bound structured records. Editorial review and public verification remain outstanding. Dates below retain their original meaning.'),Spacer(1,25),EvidenceDiagram()]
    html_parts=['<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+html.escape(data['title'])+'</title></head><body><h1>'+html.escape(data['title'])+'</h1><p>'+NOTICE+'</p><p>'+html.escape(data['issueDate'])+'</p>']
    for index,story in enumerate(data['draft']['stories']):
        flow.extend([PageBreak(),p(f'{index+1:02d} / '+story['title'],h2),p('Unapproved editorial draft. Not verified publication.',tiny)])
        html_parts.append('<h2>'+html.escape(story['title'])+'</h2><p>Unapproved editorial draft.</p>')
        for fact in story['facts']:
            source=data['sourceUrls'][fact['sourceId']]
            dates=f"Event: {fact['eventAt'] or 'unknown'} | As of: {fact['asOf']} | Retrieved: {fact['retrievedAt']}"
            flow.extend([p(fact['statement']),p(dates,tiny)])
            html_parts.extend(['<p>'+html.escape(fact['statement'])+'</p>','<p>'+html.escape(dates)+'</p>'])
            for limitation in fact['limitations']:
                flow.append(p('Limitation: '+limitation,tiny));html_parts.append('<p>'+html.escape('Limitation: '+limitation)+'</p>')
            flow.extend([p('Source: '+source,tiny),p('Evidence SHA-256: '+fact['evidenceSha256'],tiny),Spacer(1,12)])
            html_parts.append('<p><a href="'+html.escape(source,quote=True)+'">'+html.escape(source)+'</a></p>')
        for gap in story['gaps']:
            flow.append(p('Coverage gap: '+gap['reason'],tiny));html_parts.append('<p>'+html.escape('Coverage gap: '+gap['reason'])+'</p>')
        if not story['facts']:flow.append(p('No source-bound facts are available for this section.'))
    html_parts.append('</body></html>')
    def frame(canvas,doc):
        canvas.setFillColor(colors.HexColor(ORANGE));canvas.rect(0,826,595,16,fill=1,stroke=0)
        canvas.setFont('DraftSans',8);canvas.setFillColor(colors.HexColor(INK));canvas.drawString(48,25,NOTICE);canvas.drawRightString(547,25,str(doc.page))
    out=io.BytesIO();doc=SimpleDocTemplate(out,pagesize=(595,842),leftMargin=48,rightMargin=48,topMargin=48,bottomMargin=52,title=data['title'],author='LTC draft renderer',invariant=1)
    doc.build(flow,onFirstPage=frame,onLaterPages=frame)
    artifacts={'edition.pdf':out.getvalue(),'reader.html':''.join(html_parts).encode(),'cover.png':graphic(data['title'],data['issueDate'],1080,1350),'promo.png':graphic(data['title'],data['issueDate'],1200,630)}
    manifest={'schemaVersion':1,'issueId':data['issueId'],'mode':'draft-only','publishable':False,'publicationExecuted':False,'runtime':{'python':sys.version.split()[0],'reportlab':reportlab.Version,'pillow':PIL.__version__,'fontSha256':hashlib.sha256(pathlib.Path(FONT).read_bytes()).hexdigest(),'rendererSha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()},'artifacts':{name:{'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()} for name,content in artifacts.items()}}
    return artifacts,manifest

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--input',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
    data=parse_json(pathlib.Path(args.input).read_bytes());artifacts,manifest=render(data)
    destination=pathlib.Path(args.output);destination.mkdir(mode=0o700,parents=False,exist_ok=False)
    for name,content in {**artifacts,'render-manifest.json':(json.dumps(manifest,sort_keys=True,indent=2)+'\n').encode()}.items():
        with open(destination/name,'xb') as stream:stream.write(content);stream.flush();os.fsync(stream.fileno())
    print(json.dumps({'status':'draft-artifacts-rendered','publishable':False,'artifactCount':4}))
if __name__=='__main__':main()
