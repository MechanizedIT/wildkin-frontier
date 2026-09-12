"""Package a captured visual atlas as a phone-readable, bookmarked PDF.

Run from the repository root after capture-visual-atlas.mjs. No game changes.
"""
import argparse
import hashlib
import json
import io
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image

p = argparse.ArgumentParser()
p.add_argument('--manifest', default='.dream-loop/visual-atlas/2026-09-12/manifest.json')
p.add_argument('--output', default='output/pdf/Wildkin-Frontier-Maps-and-Models-2026-09-12.pdf')
a = p.parse_args()
m = json.loads(Path(a.manifest).read_text(encoding='utf-8'))
assert not m['errors'], m['errors']
out = Path(a.output)
out.parent.mkdir(parents=True, exist_ok=True)
font = Path('C:/Windows/Fonts/segoeui.ttf')
bold = Path('C:/Windows/Fonts/segoeuib.ttf')
pdfmetrics.registerFont(TTFont('Review', str(font)))
pdfmetrics.registerFont(TTFont('ReviewBold', str(bold)))
W,H = A4
ink,muted,paper,accent = map(HexColor, ['#173b35','#5a6f67','#f6f5ef','#dd9d42'])
c=canvas.Canvas(str(out), pagesize=A4, pageCompression=1)
c.setTitle('Wildkin Frontier — Maps and Models — September 12, 2026')
c.setAuthor('Wildkin Frontier development')
style=ParagraphStyle('body',fontName='Review',fontSize=10.5,leading=15,textColor=ink)
page=0
image_cache={}
def text(s,x,y,width=W-56,size=10.5):
    st=ParagraphStyle('p',parent=style,fontSize=size,leading=size*1.4)
    obj=Paragraph(escape(s),st);_,h=obj.wrap(width,H);obj.drawOn(c,x,y-h);return y-h
def start(title,kicker='VISUAL REVIEW',bookmark=None):
    global page
    page+=1;c.setFillColor(paper);c.rect(0,0,W,H,stroke=0,fill=1)
    c.setFillColor(accent);c.rect(28,H-39,29,4,stroke=0,fill=1)
    c.setFillColor(muted);c.setFont('ReviewBold',9);c.drawString(67,H-40,kicker)
    c.setFillColor(ink);c.setFont('ReviewBold',24);c.drawString(28,H-78,title)
    c.setFont('Review',8.5);c.setFillColor(muted)
    c.drawString(28,22,'Wildkin Frontier  ·  September 12, 2026  ·  Current local snapshot')
    c.drawRightString(W-28,22,str(page))
    if bookmark:c.bookmarkPage(bookmark);c.addOutlineEntry(title,bookmark,level=0)
def img(path,x,y,w,h):
    # The separate PNG download retains full lossless source pixels. Embed
    # high-quality JPEG previews so this book opens quickly on a phone.
    key=str(path)
    if key not in image_cache:
        image=Image.open(path).convert('RGB')
        image.thumbnail((1600,1600),Image.Resampling.LANCZOS)
        encoded=io.BytesIO();image.save(encoded,format='JPEG',quality=91,optimize=True)
        encoded.seek(0);image_cache[key]=ImageReader(encoded)
    c.drawImage(image_cache[key],x,y,width=w,height=h,preserveAspectRatio=True,anchor='c')

start('Maps & models',bookmark='overview')
text('Camp and five regions, followed by the generated model collection. Tap a PDF bookmark or zoom into any page.',28,H-97)
overview=[x for x in m['maps'] if x['id']!='camp-expanded']
tile=(W-68)/2
for i,r in enumerate(overview):
    x=28+(i%2)*(tile+12);y=H-136-(i//2)*203
    img(r['path'],x,y-173,tile,173)
    c.setFillColor(ink);c.setFont('ReviewBold',11);c.drawString(x,y-190,'Camp' if r['id']=='camp' else r['name'])
    c.linkRect('',f"map-{r['id']}",(x,y-193,x+tile,y),relative=0,thickness=0)
text('Maps show authored layouts without distance fog or gameplay shadows. Markers are planned spawn/interaction anchors, not live creature positions. Candidate models are labelled.',28,92,size=9.5)
c.showPage()
for r in m['maps']:
    name=('Camp · expanded yard' if r['id']=='camp-expanded' else 'Camp · starter defenses' if r['id']=='camp' else r['name'])
    start(name,'AREA MAP  ·  NORTH UP',f"map-{r['id']}")
    img(r['planningPath'],28,H-652,W-56,W-56)
    y=text(r['snapshot'].replace('Authored','Initial authored'),28,171)
    b=r['authoredBounds'];width=b['maxX']-b['minX'];depth=b['maxZ']-b['minZ']
    y=text(f"Authored area: {width:g} × {depth:g} game metres. North is world −Z; east is +X. Images include a small border for context.",28,y-9)
    text('Clean, full-resolution PNGs and coordinate metadata are included in the companion download. These are planning views, not proof that every visible ledge is traversable.',28,y-9,size=9.5)
    c.showPage()
for start_index in range(0,len(m['models']),4):
    start('Generated models',f'COLLECTION  ·  {start_index+1}–{min(start_index+4,len(m["models"]))}',f'models-{start_index}')
    for j,r in enumerate(m['models'][start_index:start_index+4]):
        x=28+(j%2)*(tile+12);y=H-108-(j//2)*315
        img(r['path'],x,y-tile,tile,tile)
        c.setFillColor(ink);c.setFont('ReviewBold',11)
        label=r['name'].replace(' — pending candidate','')
        c.drawString(x,y-tile-19,label)
        pending='PENDING' in r['status']
        text('Candidate — not in the game yet' if pending else 'Current game model / assembled family',x,y-tile-28,width=tile,size=9)
    text('Neutral renders show the actual exported models. These static views do not demonstrate animation quality. Rootfall and Tidefin remain separate candidates in this snapshot.',28,70,size=9.3)
    c.showPage()
c.save()
receipt={'pdf':str(out),'pages':page,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'sourceWorldSHA256':m['sourceWorldSHA256'],'maps':len(m['maps']),'modelViews':len(m['models'])}
out.with_suffix('.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt))
