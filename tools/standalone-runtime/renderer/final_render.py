"""Separately typed local FINAL CANDIDATE renderer. Signature verification belongs to caller.
This executable has no reviewer authority, signing, network, or publication capability.
"""
import argparse, hashlib, html, importlib.util, io, json, os, pathlib, sys
spec=importlib.util.spec_from_file_location('draft_primitives',pathlib.Path(__file__).with_name('render.py'))
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
from PIL import Image,ImageDraw,ImageFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak
NOTICE='FINAL EDITION CANDIDATE - NOT PUBLISHED'
def graphic(title,date,width,height):
    im=Image.new('RGB',(width,height),r.PAPER);d=ImageDraw.Draw(im);d.rectangle((0,0,width,24),fill=r.ORANGE)
    small=ImageFont.truetype(r.FONT,round(width*.022));bold=ImageFont.truetype(r.BOLD,round(width*.028))
    d.text((65,70),'LTC / SOURCE-LED EDITION',font=bold,fill=r.INK);d.text((65,125),date,font=small,fill=r.INK)
    for size in range(round(width*.074),25,-2):
        font=ImageFont.truetype(r.BOLD,size)
        try:lines=r.wrap(d,title,font,width-130)
        except ValueError:continue
        if len(lines)*size*1.3<height*.4:break
    else:raise ValueError('headline bound')
    y=height*.23
    for line in lines:d.text((65,y),line,font=font,fill=r.INK);y+=size*1.3
    for scale in [1,.7,.4]:
        radius=min(width,height)*.14*scale;cx=width*.76;cy=height*.77;d.ellipse((cx-radius,cy-radius,cx+radius,cy+radius),outline=r.ORANGE,width=7)
    d.text((65,height-65),'FINAL CANDIDATE / NOT PUBLISHED',font=small,fill=r.INK)
    b=io.BytesIO();im.save(b,format='PNG');return b.getvalue()
def render(envelope):
    if set(envelope)!={'schemaVersion','mode','editorial','decisionSha256'} or envelope['schemaVersion']!=1 or envelope['mode']!='final-candidate' or not r.re.fullmatch('[a-f0-9]{64}',envelope['decisionSha256']):raise ValueError('typed final handoff')
    data=dict(envelope['editorial']);dek=data.pop('dek');r.text(dek or ' ',300);r.validate(data)
    pdfmetrics.registerFont(TTFont('FinalSans',r.FONT));pdfmetrics.registerFont(TTFont('FinalBold',r.BOLD))
    supported=pdfmetrics.getFont('FinalSans').face.charWidths
    def glyphs(value):
        if isinstance(value,str) and any(ord(c) not in supported and c not in '\n\t' for c in value):raise ValueError('unsupported font character')
        elif isinstance(value,list):
            for item in value:glyphs(item)
        elif isinstance(value,dict):
            for item in value.values():glyphs(item)
    glyphs(envelope)
    body=ParagraphStyle('body',fontName='FinalSans',fontSize=10.5,leading=16,spaceAfter=10,textColor=colors.HexColor(r.INK));small=ParagraphStyle('small',parent=body,fontSize=8,leading=12);title=ParagraphStyle('title',parent=body,fontName='FinalBold',fontSize=28,leading=34);heading=ParagraphStyle('heading',parent=body,fontName='FinalBold',fontSize=18,leading=24)
    def p(x,style=body):return Paragraph(html.escape(x).replace('\n','<br/>'),style)
    flow=[p('LTC / SOURCE-LED EDITION',small),Spacer(1,30),p(data['title'],title),p(dek),p(data['issueDate']),p(NOTICE,heading),p('A separately reviewed final-render candidate. No publication or delivery is implied. Source dates, limitations and coverage gaps retain their original meaning.')]
    parts=['<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+html.escape(data['title'])+'</title></head><body><h1>'+html.escape(data['title'])+'</h1><p>'+html.escape(dek)+'</p><p>'+NOTICE+'</p><p>'+html.escape(data['issueDate'])+'</p>']
    for story in data['draft']['stories']:
        flow.extend([PageBreak(),p(story['title'],heading)]);parts.append('<h2>'+html.escape(story['title'])+'</h2>')
        for fact in story['facts']:
            dates=f"Event: {fact['eventAt'] or 'unknown'} | As of: {fact['asOf']} | Retrieved: {fact['retrievedAt']}"
            source=data['sourceUrls'][fact['sourceId']]
            for line in [fact['statement'],dates,*['Limitation: '+v for v in fact['limitations']],'Evidence SHA-256: '+fact['evidenceSha256']]:
                flow.append(p(line));parts.append('<p>'+html.escape(line)+'</p>')
            flow.append(p('Source: '+source,small));parts.append('<p><a href="'+html.escape(source,quote=True)+'">'+html.escape(source)+'</a></p>')
        for gap in story['gaps']:
            line='Coverage gap: '+gap['reason'];flow.append(p(line,small));parts.append('<p>'+html.escape(line)+'</p>')
    parts.append('</body></html>')
    def frame(canvas,doc):
        canvas.setFillColor(colors.HexColor(r.ORANGE));canvas.rect(0,826,595,16,fill=1,stroke=0);canvas.setFont('FinalSans',8);canvas.setFillColor(colors.HexColor(r.INK));canvas.drawString(48,25,NOTICE);canvas.drawRightString(547,25,str(doc.page))
    b=io.BytesIO();doc=SimpleDocTemplate(b,pagesize=(595,842),leftMargin=48,rightMargin=48,topMargin=48,bottomMargin=52,title=data['title'],author='LTC final candidate renderer',invariant=1);doc.build(flow,onFirstPage=frame,onLaterPages=frame)
    artifacts={'edition.pdf':b.getvalue(),'reader.html':''.join(parts).encode(),'cover.png':graphic(data['title'],data['issueDate'],1080,1350),'promo.png':graphic(data['title'],data['issueDate'],1200,630)}
    manifest={'schemaVersion':1,'mode':'final-candidate','issueId':data['issueId'],'decisionSha256':envelope['decisionSha256'],'publicationAllowed':False,'pages':doc.page,'runtime':{'python':sys.version.split()[0],'reportlab':r.reportlab.Version,'pillow':r.PIL.__version__,'fontSha256':hashlib.sha256(pathlib.Path(r.FONT).read_bytes()).hexdigest(),'rendererSha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),'validationHelperSha256':hashlib.sha256(pathlib.Path(r.__file__).read_bytes()).hexdigest()},'artifacts':{n:{'bytes':len(v),'sha256':hashlib.sha256(v).hexdigest()} for n,v in artifacts.items()}}
    return artifacts,manifest
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--input',required=True);parser.add_argument('--output',required=True);a=parser.parse_args()
    with open(a.input,'rb') as f:raw=f.read(256*1024+1)
    artifacts,manifest=render(r.parse_json(raw));dest=pathlib.Path(a.output);dest.mkdir(mode=0o700,exist_ok=False)
    for name,content in {**artifacts,'render-manifest.json':(json.dumps(manifest,sort_keys=True,indent=2)+'\n').encode()}.items():
        with open(dest/name,'xb') as f:f.write(content);f.flush();os.fsync(f.fileno())
    print(json.dumps({'status':'final-candidate-rendered','publicationAllowed':False}))
if __name__=='__main__':main()
