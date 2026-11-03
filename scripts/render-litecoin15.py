"""Render the archived special edition. Requires reportlab; no network or live data.

The SVG schematics use a deliberately small vector vocabulary that is also drawn
directly into the PDF. Web and print therefore share the same labels and geometry.
Set LTC_FONT_DIR when Liberation fonts are installed outside the bundled runtime.
"""
from pathlib import Path
import argparse,json,os,math,textwrap,xml.etree.ElementTree as ET
from html import escape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor,Color
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',default=str(ROOT/'public/magazine/litecoin-15/Litecoin-at-15-84-page-advance-edition.pdf'))
parser.add_argument('--report',default=None)
args=parser.parse_args()
issue=json.loads((ROOT/'content/specials/litecoin-at-15-r1.json').read_text())
default=str(Path.home())+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype'
fontdir=Path(os.environ.get('LTC_FONT_DIR',default))
for short,file in [('Serif','LiberationSerif-Regular'),('SerifBold','LiberationSerif-Bold'),('SerifItalic','LiberationSerif-Italic'),('Sans','LiberationSans-Regular'),('SansBold','LiberationSans-Bold')]:pdfmetrics.registerFont(TTFont(short,str(fontdir/(file+'.ttf'))))
pdfmetrics.registerFontFamily('Serif',normal='Serif',bold='SerifBold',italic='SerifItalic',boldItalic='SerifBold')
pdfmetrics.registerFontFamily('Sans',normal='Sans',bold='SansBold',italic='Sans',boldItalic='SansBold')
INK='#14273b';BLUE='#174b8d';PAPER='#f5f1e8';SILVER='#d7dce1';MUTED='#476178'
SW,SH=1000,400
def svg(spec,page):
    root=ET.Element('svg',xmlns='http://www.w3.org/2000/svg',viewBox='0 0 1000 400',role='img')
    ET.SubElement(root,'title').text=spec['caption']
    def el(tag,**attrs):return ET.SubElement(root,tag,{k.replace('_','-'):str(v) for k,v in attrs.items()})
    def rect(x,y,w,h,fill,stroke='none',sw=1):el('rect',x=x,y=y,width=w,height=h,fill=fill,stroke=stroke,stroke_width=sw)
    def line(x1,y1,x2,y2,color=BLUE,width=2):el('line',x1=x1,y1=y1,x2=x2,y2=y2,stroke=color,stroke_width=width)
    def circle(x,y,r,fill,stroke='none',sw=1):el('circle',cx=x,cy=y,r=r,fill=fill,stroke=stroke,stroke_width=sw)
    def txt(t,x,y,size=20,color=INK,anchor='start',weight='normal',maxchars=30):
        lines=textwrap.wrap(t,maxchars,break_long_words=False,break_on_hyphens=False) or ['']
        for i,s in enumerate(lines):el('text',x=x,y=y+i*(size*1.22),fill=color,font_size=size,font_family='Arial, Helvetica, sans-serif',text_anchor=anchor,font_weight=weight).text=s
    rect(0,0,SW,SH,'#e6ebec')
    rect(0,0,SW,5,BLUE)
    txt(f'LTC / FIELD NOTES {page:02}',28,32,12,BLUE,maxchars=90)
    labels=spec['labels'];kind=spec['kind']
    if kind in ['route','flow','journey','wrapped']:
        count=len(labels);w=(916-(count-1)*22)/count
        for i,label in enumerate(labels):
            x=42+i*(w+22);rect(x,130,w,142,INK if i%2==0 else BLUE)
            txt(f'{i+1:02}',x+15,158,12,'#b6cee3');txt(label,x+w/2,203,18,PAPER,'middle','bold',maxchars=18)
            if i<count-1:line(x+w+4,201,x+w+18,201);line(x+w+12,195,x+w+18,201);line(x+w+12,207,x+w+18,201)
        txt('A MAP OF RELATIONSHIPS / NOT A LIVE DATA FEED',42,350,12,MUTED,maxchars=80)
    elif kind in ['stack','layers','claims']:
        n=len(labels);height=min(67,270/n)
        for i,label in enumerate(labels):
            x=100+i*32;y=60+i*(height+10);w=760-i*64
            rect(x,y,w,height,BLUE if i%2 else INK);txt(f'{i+1:02}',x+18,y+height/2+5,13,'#b6cee3');txt(label,x+w/2,y+height/2+6,21,PAPER,'middle','bold',maxchars=38)
    elif kind=='parallel':
        for i in [0,1]:
            x=42+i*477;rect(x,65,439,263,INK if i==0 else BLUE)
            circle(x+60,125,28,'none','#b4cadd',2);line(x+31,125,x+89,125,'#b4cadd')
            txt(labels[i],x+24,220,28,PAPER,weight='bold',maxchars=25)
            txt(labels[i+2],x+24,270,17,'#d4e0e9',maxchars=36)
        line(500,64,500,329,'#98acbd',1)
    elif kind=='dates':
        line(76,126,917,126,BLUE,3)
        for i,label in enumerate(labels):
            x=76+i*420;circle(x,126,13,INK)
            parts=label.split(' / ',1);txt(parts[0],x,192,28,INK,'middle' if i==1 else 'end' if i==2 else 'start','bold',maxchars=22)
            if len(parts)>1:txt(parts[1],x,242,20,BLUE,'middle' if i==1 else 'end' if i==2 else 'start',maxchars=24)
        txt('READ THE EFFECTIVE DATE BEFORE THE HEADLINE',76,350,13,MUTED,maxchars=90)
    elif kind in ['network','cycle','matrix']:
        center=(500,201);coords=[(220,111),(780,111),(780,292),(220,292)]
        for i,(x,y) in enumerate(coords):line(500,201,x,y,'#8aa5ba',2)
        circle(500,201,53,INK);txt('LTC',500,210,27,PAPER,'middle','bold')
        for i,label in enumerate(labels):
            x,y=coords[i];rect(x-156,y-41,312,82,BLUE if i%2 else INK);txt(label,x,y+5,20,PAPER,'middle','bold',maxchars=23)
        if kind=='matrix':line(30,360,970,360,BLUE);txt('QUALITATIVE / NOT SCALED OR SCORED',500,382,12,MUTED,'middle',maxchars=80)
    elif kind=='halving':
        vals=[50,25,12.5,6.25]
        for i,value in enumerate(vals):
            x=110+i*218;h=225*(value/50);rect(x,305-h,124,h,INK if i%2==0 else BLUE)
            txt(labels[i],x+62,285-h,31,INK,'middle','bold');txt(f'ERA {i+1}',x+62,345,13,BLUE,'middle')
        line(73,306,944,306,MUTED)
    elif kind in ['passport','record','number']:
        rect(28,57,944,296,INK)
        if kind=='number' and len(labels[0])>8:size=65
        else:size=88 if len(labels[0])<12 else 58
        txt(labels[0],60,188,size,PAPER,weight='bold',maxchars=40)
        line(60,226,940,226,'#6e89a2',1)
        for i,label in enumerate(labels[1:]):txt(label,60+i*445,295,25,'#b5cde2',weight='bold',maxchars=30)
    elif kind=='calculator':
        for i,label in enumerate(labels):
            rect(50,65+i*88,900,68,INK if i==2 else '#cbd8e3')
            txt(label,80,107+i*88,23,PAPER if i==2 else INK,weight='bold',maxchars=80)
    else:raise ValueError(kind)
    return ET.tostring(root,encoding='unicode')

for p in issue['pages']:
    if 'diagram' in p:
        path=ROOT/'public'/p['diagram']['src'].lstrip('/');path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(svg(p['diagram'],p['page'])+'\n')

PW,PH=648,864;M=42;CW=PW-2*M
out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
c=canvas.Canvas(str(out),pagesize=(PW,PH),pageCompression=1,invariant=1)
c.setTitle('Litecoin at 15 - 84-page advance anniversary edition')
c.setAuthor('LTC Media / Satnam Satoshi / AI Satoshi Ma, AI editorial lead')
c.setSubject('Research through October 4, 2026. Planned cover October 15; network anniversary October 13. Independent human review pending.')
c.setCreator('LTC Media archived print edition renderer')
sourcebyid={s['id']:s for s in issue['sources']};checks=[]
def color(v):return HexColor(v)
def box(x,y,w,h,fill):c.setFillColor(color(fill));c.rect(x,y,w,h,fill=1,stroke=0)
def text(t,x,y,size=10,font='Sans',fill=INK):c.setFillColor(color(fill));c.setFont(font,size);c.drawString(x,y,t)
def para(t,x,top,w,size=11,leading=None,font='Serif',fill=INK):
    ps=ParagraphStyle('p',fontName=font,fontSize=size,leading=leading or size*1.4,textColor=color(fill),spaceAfter=0,allowWidows=0,allowOrphans=0)
    p=Paragraph(t,ps);_,h=p.wrap(w,2000);p.drawOn(c,x,top-h);return h
def txtheight(t,w,size,font='Serif',leading=None):
    p=Paragraph(t,ParagraphStyle('m',fontName=font,fontSize=size,leading=leading or size*1.4));return p.wrap(w,2000)[1]
def imagefill(path,x,y,w,h):
    img=ImageReader(str(path));iw,ih=img.getSize();scale=max(w/iw,h/ih);nw,nh=iw*scale,ih*scale
    c.saveState();clip=c.beginPath();clip.rect(x,y,w,h);c.clipPath(clip,stroke=0,fill=0);c.drawImage(img,x+(w-nw)/2,y+(h-nh)/2,nw,nh,mask='auto');c.restoreState()
def vector(path,x,y,w,h):
    tree=ET.parse(path);c.saveState();c.translate(x,y+h);c.scale(w/SW,h/SH)
    for el in tree.getroot():
        tag=el.tag.rsplit('}',1)[-1];a=el.attrib
        if tag=='title':continue
        fill=a.get('fill','none');stroke=a.get('stroke','none');c.setLineWidth(float(a.get('stroke-width',1)))
        if fill!='none':c.setFillColor(color(fill))
        if stroke!='none':c.setStrokeColor(color(stroke))
        if tag=='rect':c.rect(float(a['x']),-float(a['y'])-float(a['height']),float(a['width']),float(a['height']),fill=int(fill!='none'),stroke=int(stroke!='none'))
        elif tag=='line':c.line(float(a['x1']),-float(a['y1']),float(a['x2']),-float(a['y2']))
        elif tag=='circle':c.circle(float(a['cx']),-float(a['cy']),float(a['r']),fill=int(fill!='none'),stroke=int(stroke!='none'))
        elif tag=='text':
            c.setFont('SansBold' if a.get('font-weight')=='bold' else 'Sans',float(a['font-size']));anchor=a.get('text-anchor','start');fn=c.drawCentredString if anchor=='middle' else c.drawRightString if anchor=='end' else c.drawString;fn(float(a['x']),-float(a['y']),el.text or '')
        else:raise ValueError(tag)
    c.restoreState()
def footer(n,dark=False):
    f=PAPER if dark else INK;c.setStrokeColor(color(f));c.setLineWidth(.5);c.line(M,50,PW-M,50)
    text('ADVANCE EDITION / RESEARCH OCT 4, 2026',M,34,7,'Sans',f);text('LTC MEDIA / SATNAM SATOSHI',266,34,7,'Sans',f);text(f'{n:02}',PW-M-28,29,24,'Serif',f)
    c.linkURL('https://https-github-com-satnam-satoshi-sat.vercel.app/conversations/specials/litecoin-at-15/',(M,25,PW-M,48),relative=0,thickness=0)
def body(columns,top,size=12.8,fill=INK):
    gap=25;w=(CW-gap)/2;heights=[]
    for i,col in enumerate(columns):
        y=top
        for t in col:y-=para(escape(t),M+i*(w+gap),y,w,size,leading=size*1.42,fill=fill)+10
        heights.append(y)
    return min(heights)
def splitparas(paras):
    # Paragraph-boundary balancing preserves reading order and avoids broken lines.
    if len(paras)==1:
        sentences=re_split_sentences(paras[0]);mid=max(1,len(sentences)//2);return [[' '.join(sentences[:mid])],[' '.join(sentences[mid:])]]
    sums=[sum(len(t) for t in paras[:i]) for i in range(1,len(paras))];total=sum(len(t) for t in paras);i=min(range(1,len(paras)),key=lambda i:abs(sums[i-1]-total/2));return [paras[:i],paras[i:]]
def re_split_sentences(t):
    import re
    return re.split(r'(?<=[.!?])\s+',t)

for p in issue['pages']:
    n=p['page'];c.bookmarkPage(f'page{n}');c.addOutlineEntry(f'{n:02} / {p["title"]}',f'page{n}',0,False)
    dark=n==84 or p['layout']=='quote';bg=INK if dark else PAPER;fg=PAPER if dark else INK;box(0,0,PW,PH,bg)
    if n==1:
        imagefill(ROOT/'public'/p['art']['src'].lstrip('/'),0,0,PW,PH)
        text('LTC MEDIA / A SATNAM SATOSHI PUBLICATION',M,818,9,'SansBold',PAPER)
        text('Litecoin',M,729,88,'SerifBold',PAPER);text('at 15.',M,649,88,'SerifBold',PAPER)
        para('An open network.<br/>A shared future.',M,617,400,25,28,'SerifItalic',PAPER)
        box(M,82,CW,81,INK);text('84 PAGES / THE ANNIVERSARY ISSUE',M+14,143,12,'SansBold',PAPER)
        text('Advance edition / Planned cover October 15, 2026',M+14,121,9,'Sans',PAPER)
        text('Research through October 4, 2026 / AI editorial preview',M+14,102,9,'Sans',PAPER)
        text('CHARLIE LEE / THE FOUNDATION / THE BUILDERS',M,42,9,'SansBold',PAPER)
        checks.append({'page':n,'layout':'cover','bottom':42});c.showPage();continue
    text('LTC / LITECOIN AT 15',M,831,7.6,'SansBold',fg)
    c.setFillColor(color(fg));c.setFont('Sans',7.6);c.drawRightString(PW-M,831,p['section'].upper())
    c.setStrokeColor(color(fg));c.setLineWidth(.5);c.line(M,819,PW-M,819)
    text(p['kicker'].upper(),M,791,8,'SansBold','#b9cfe2' if dark else BLUE)
    title=escape(p['title']);size=46 if len(title)<52 else 39
    if p.get('sourcebook'):size=42
    th=para(title,M,773,CW,size,size*1.06,'Serif',fg);y=773-th-15
    dh=para(escape(p['dek']),M,y,CW,14,18,'Serif',fg);y-=dh+22
    if p.get('sourcebook'):
        y-=para(escape(p['paragraphs'][0]),M,y,CW,9,12,'Sans',MUTED)+20
        refs=[sourcebyid[i] for i in p['sources']];mid=math.ceil(len(refs)/2);bottoms=[]
        for col,chunk in enumerate([refs[:mid],refs[mid:]]):
            xx=M+col*(CW/2+10);ww=CW/2-14;yy=y
            for s in chunk:
                c.setStrokeColor(color('#adbac4'));c.line(xx,yy,xx+ww,yy);yy-=7
                h=para(f'<b>{s["number"]:02}</b> / <link href="{escape(s["url"],quote=True)}" color="{BLUE}">{escape(s["title"])}</link>',xx,yy,ww,8.4,10.5,'Sans');yy-=h+3
                yy-=para(escape(('Source record date: '+str(s['publishedDate'])) if s['publishedDate'] else 'Source publication date not supplied'),xx,yy,ww,7,9,'Sans',MUTED)+7
            bottoms.append(yy)
        bottom=min(bottoms)
    else:
        if p.get('quote'):
            q=p['quote'];qt=escape('“'+q['text']+'”');qh=txtheight(qt,CW-42,38,'SerifItalic',43)+70
            box(M-8,y-qh,CW+16,qh,INK);para(qt,M+14,y-18,CW-28,38,43,'SerifItalic',PAPER)
            text(q['person']+' / '+q['date'],M+14,y-qh+19,8,'SansBold',PAPER)
            c.linkURL(sourcebyid[q['sourceId']]['url'],(M,y-qh,M+CW,y),relative=0,thickness=0);y-=qh+24
        if p.get('art'):
            ah=252 if n in [29,38,57,84] else 208
            imagefill(ROOT/'public'/p['art']['src'].lstrip('/'),M,y-ah,CW,ah)
            y-=ah+10;y-=para(escape(p['art']['caption']),M,y,CW,7,9,'Sans','#b9cfe2' if dark else MUTED)+17
        if p.get('diagram'):
            ah=185 if len(p.get('bullets',[]))>2 else CW*.4;vector(ROOT/'public'/p['diagram']['src'].lstrip('/'),M,y-ah,CW,ah);y-=ah+10
            y-=para(escape(p['diagram']['caption']),M,y,CW,8,10,'Sans',MUTED)+18
        if n==3:
            y-=para(escape(p['paragraphs'][0]),M,y,CW,12,17,'Serif')+22
            for chapter in issue['chapters']:
                c.setStrokeColor(color('#9caebd'));c.line(M,y,PW-M,y);y-=16
                text(f'{chapter["start"]:02}-{chapter["end"]:02}',M,y-7,13,'SansBold',BLUE)
                h=para(escape(chapter['title']),M+72,y+7,CW-72,18,22,'Serif');c.linkRect('',f'page{chapter["start"]}',(M,y-30,PW-M,y+10),relative=0,thickness=0);y-=max(45,h+20)
            bottom=y
        elif n==2:
            y-=10
            for t in p['paragraphs']:y-=para(escape(t),M,y,CW-50,16,23,'Serif')+17
            text('AI SATOSHI MA',M,y-12,10,'SansBold',BLUE);text('AI editorial lead / LTC Media',M,y-30,10,'Sans',MUTED)
            bottom=y-36
        elif n==81:
            y-=para(escape(p['paragraphs'][0]),M,y,CW,11,15,'Serif')+12
            bottom=body(splitparas(p.get('bullets',[])),y,10.2);pbullets=[]
        elif n==84:
            for t in p['paragraphs']:y-=para(escape(t),M,y,CW,16,22,'Serif',PAPER)+15
            bottom=y
        else:
            cols=splitparas(p['paragraphs']);size=12.8
            # Measure before drawing; stop rather than silently losing copy.
            def bh(size):return max(sum(txtheight(escape(t),(CW-25)/2,size,leading=size*1.42)+10 for t in col) for col in cols)
            reserve=math.ceil(len(p.get('bullets',[]))/2)*35+25 if p.get('bullets') else 30
            while y-bh(size)<93+reserve and size>10.1:size-=.25
            bottom=body(cols,y,size,fg)
            if p.get('bullets'):
                bottom-=5;gap=14;w=(CW-gap)/2
                for i,b in enumerate(p['bullets'][:6]):
                    col=i%2;row=i//2;xx=M+col*(w+gap);top=bottom-row*35
                    c.setStrokeColor(color('#8aa1b5'));c.line(xx,top,xx+w,top)
                    h=para(escape(b),xx,top-7,w,8.1,10.2,'Sans',MUTED)
                    if h>29:raise ValueError(f'Bullet too tall {n}: {b}')
                bottom-=math.ceil(len(p['bullets'][:6])/2)*35
        if p['sources']:
            refs=' / '.join(f'[{sourcebyid[s]["number"]}]' for s in p['sources'])
            sh=para('SOURCE RECORDS '+refs+'  /  See pages 77-80. Links in the web reader.',M,78,CW,7,9,'Sans','#b9cfe2' if dark else MUTED)
    if bottom<93:raise ValueError(f'Page {n} content reaches {bottom:.1f}; must clear source/footer area')
    footer(n,dark);checks.append({'page':n,'layout':p['layout'],'bottom':round(bottom,2)});c.showPage()
c.save()
if args.report:Path(args.report).write_text(json.dumps({'pages':len(checks),'checks':checks,'pdf':str(out)},indent=2)+'\n')
print(f'Rendered {len(checks)} pages to {out} ({out.stat().st_size:,} bytes)')
