"""Build repository-owned Living Frontier research PDFs from portable assets."""
from pathlib import Path
from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from PIL import Image, ImageDraw
import json, re, html, hashlib, io

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs' / 'research' / 'living-frontier'
ACTUAL = OUT / 'images' / 'actual'
CONCEPT = OUT / 'images' / 'concept'
REVIEW = OUT / 'review'
W, H = 432, 720
INK, MINT, SKY, PAPER, MUTED, GOLD = '#102d3b', '#49d5b3', '#78cfc1', '#f4f1e6', '#b9d4cf', '#ffc75e'

font_dir = Path('C:/Windows/Fonts')
pdfmetrics.registerFont(TTFont('Report', str(font_dir / 'segoeui.ttf')))
pdfmetrics.registerFont(TTFont('ReportBold', str(font_dir / 'segoeuib.ttf')))

def draw_contained(c, path, x, y, w, h):
    im = Image.open(path).convert('RGB')
    scale = min(w/im.width, h/im.height)
    iw, ih = im.width*scale, im.height*scale
    im.thumbnail((max(1,int(iw*2.5)),max(1,int(ih*2.5))),Image.Resampling.LANCZOS)
    encoded=io.BytesIO();im.save(encoded,format='JPEG',quality=90,optimize=True);encoded.seek(0)
    c.drawImage(ImageReader(encoded), x + (w-iw)/2, y + (h-ih)/2, iw, ih)

def paragraph(c, text, x, y, w, size=15, color=INK, leading=None):
    style = ParagraphStyle('p', fontName='Report', fontSize=size, leading=leading or size*1.32, textColor=HexColor(color), alignment=TA_LEFT)
    p = Paragraph(text, style); _, ph = p.wrap(w, 1000); p.drawOn(c, x, y-ph); return ph

def header(c, number, title, eyebrow, proposed=False):
    c.setFillColor(HexColor(INK)); c.rect(0, H-108, W, 108, fill=1, stroke=0)
    c.setFillColor(HexColor(GOLD if proposed else MINT)); c.setFont('ReportBold', 9); c.drawString(24,H-25,eyebrow)
    paragraph(c,title,24,H-40,W-48,23,'#ffffff',26)
    c.setFillColor(HexColor(INK)); c.setFont('Report',8); c.drawString(24,17,'WILDKIN FRONTIER  /  SEPTEMBER 12, 2026');c.drawRightString(W-24,17,f'{number:02d}')

def page(c, number, title, eyebrow, image, body, caption, proposed=False, two=False):
    c.setFillColor(HexColor(PAPER)); c.rect(0,0,W,H,fill=1,stroke=0); header(c,number,title,eyebrow,proposed)
    x, iw, ih, iy = 24, W-48, 395, 201
    if two:
        a,b=image
        aspects=[Image.open(p).width/Image.open(p).height for p in [a,b]]
        if min(aspects)>1.2:
            draw_contained(c,a,x,iy+ih/2+6,iw,ih/2-6);draw_contained(c,b,x,iy,iw,ih/2-6)
        else:
            draw_contained(c,a,x,iy,(iw-12)/2,ih); draw_contained(c,b,x+(iw+12)/2,iy,(iw-12)/2,ih)
    else: draw_contained(c,image,x,iy,iw,ih)
    used=paragraph(c,body,x,187,iw,12.5,INK,17)
    if used>113: raise ValueError(f'Body overflows page {number}: {used}')
    paragraph(c,caption,x,60,iw,8,'#466575',10)
    c.setStrokeColor(HexColor(SKY)); c.line(x,70,W-x,70); c.showPage()

def flow_page(c,number,title,kicker,steps,footer):
    c.setFillColor(HexColor(PAPER));c.rect(0,0,W,H,fill=1,stroke=0);header(c,number,title,kicker,True)
    y=H-132
    for n,(label,detail,status) in enumerate(steps):
        c.setFillColor(HexColor('#deeee7' if status=='NOW' else '#f2e5c9'));c.roundRect(24,y-74,W-48,74,10,fill=1,stroke=0)
        c.setFillColor(HexColor(INK));c.setFont('ReportBold',10);c.drawString(37,y-18,f'{n+1:02d}  {status}')
        paragraph(c,label,102,y-7,W-140,14,INK,17)
        paragraph(c,detail,37,y-36,W-74,10.5,INK,14)
        if n<len(steps)-1:
            c.setStrokeColor(HexColor('#538b84'));c.setLineWidth(2);c.line(W/2,y-78,W/2,y-89)
            c.line(W/2,y-89,W/2-4,y-84);c.line(W/2,y-89,W/2+4,y-84)
        y-=94
    paragraph(c,footer,24,97,W-48,11,INK,15);c.showPage()

def area_page(c,number):
    c.setFillColor(HexColor(PAPER));c.rect(0,0,W,H,fill=1,stroke=0);header(c,number,'A horizon that keeps growing','EXPLORATION SCALE / DESIGN',True)
    origin=(63,278);gw=318;gh=270
    c.setStrokeColor(HexColor('#8aaba6'));c.setLineWidth(1);c.line(*origin,origin[0]+gw,origin[1]);c.line(*origin,origin[0],origin[1]+gh)
    c.setStrokeColor(HexColor('#248d79'));c.setLineWidth(3);path=c.beginPath()
    for j in range(61):
        r=j/20;x=origin[0]+r/3*gw;y=origin[1]+r*r/9*gh
        if j==0:path.moveTo(x,y)
        else:path.lineTo(x,y)
    c.drawPath(path)
    for r in [1,2,3]:
        x=origin[0]+r/3*gw;y=origin[1]+r*r/9*gh
        c.setFillColor(HexColor(INK));c.circle(x,y,4,fill=1,stroke=0);c.setFont('ReportBold',12);c.drawRightString(min(W-30,x+22),y+13,f'{r*r}x area')
        c.setFont('Report',10);c.drawCentredString(x,origin[1]-18,f'{r}x radius')
    paragraph(c,'Twice as far from Camp exposes four times the surrounding area. Three times as far exposes nine times as much.',24,227,W-48,14,INK,19)
    paragraph(c,'This is geometry, not a forecast of playtime. In a roughly two-dimensional world, area grows with radius squared. New terrain must still offer useful discoveries; distance alone cannot prevent repetition.',24,143,W-48,11,INK,15)
    paragraph(c,'Graph: A / A₀ = (r / r₀)². Normalized circular area; no game-distance promise.',24,47,W-48,8,INK,11);c.showPage()

def fieldbook():
    global W,H
    old=(W,H); W,H=(432,720)
    c=canvas.Canvas(str(OUT/'Living-Frontier-Visual-Fieldbook.pdf'),pagesize=(W,H)); c.setTitle('Wildkin Frontier Living Frontier Visual Fieldbook')
    pages=[
      ('Living Frontier','OWNER VISION',(CONCEPT/'portrait-hud-target.png',ACTUAL/'final-360.png'),'Left: visual target for the mobile field surface. Right: current playable portrait HUD. Mobile/casual first means useful outings, readable danger, individual Wildkin, and a family worth returning to.','LEFT IS A VISUAL TARGET. RIGHT IS CURRENT PLAYABLE EVIDENCE.'),
      ('A pocket field loop','CURRENT PLAYABLE EVIDENCE',(ACTUAL/'final-360.png',ACTUAL/'portrait-atlas-r3.png'),'Five persistent quick slots, a fixed left joystick, nearby actions, and a personal atlas support a short useful outing. Landscape remains supported.','Actual portrait HUD and atlas captures.',True),
      ('The atlas remembers','CURRENT PLAYABLE EVIDENCE',(ACTUAL/'portrait-atlas-r3.png',ACTUAL/'inspector.png'),'The atlas records personal exploration. The inspector measures current terrain fields for development; it is not a player-facing climate or biome system.','Actual atlas and diagnostic captures.',True),
      ('Bring home an individual','CURRENT PLAYABLE EVIDENCE',(ACTUAL/'roster-two.png',ACTUAL/'homecoming.png'),'Captured Wildkin keep individual identity through field capture, reload, physical Camp banking, roster selection, and death handling.','Actual individual roster and homecoming evidence.',True),
      ('Encounters change an outing','CURRENT PLAYABLE EVIDENCE',(ACTUAL/'tidefin-snare.png',ACTUAL/'emberhorn-guide-fixed.png'),'Tidefin and Emberhorn reuse adds optional encounter texture. Tidefin snare/release and banking are proved; full native Emberhorn dodge/tether capture remains open.','Actual encounter evidence.',True),
      ('One expressed visual trait','CURRENT PLAYABLE EVIDENCE',(ACTUAL/'bodytone-baseline.png',ACTUAL/'r2-camp.png'),'Mossling body tone is visibly expressed across wild, follower, and young paths. Separate eyes, size, markings, and modular parts are not shipped.','Actual before/after body-tone evidence.',True),
      ('Slow terrain asks for care','CURRENT PLAYABLE EVIDENCE',ACTUAL/'r1-approach-verified.png','A bounded climb foundation and fall risk give the first terrain a readable physical edge. Swimming and broad natural climbing remain future work; the new plateau uses walkable ascent and descent.','Actual climb approach evidence.'),
      ('A physical nursery','CURRENT PLAYABLE EVIDENCE',(ACTUAL/'r3-portrait.png',ACTUAL/'sprout-native.png'),'One nursery and one garden make care visible. Young and crops advance only during active play, commit on the existing cadence, and do not punish absence.','Actual nursery and garden captures.',True),
      ('Pairing becomes lineage','CURRENT PLAYABLE EVIDENCE',(ACTUAL/'lineage.png',ACTUAL/'package-portrait.png'),'Natural pairing creates one fixed young. Earned research can guide a parent body tone. Other reproduction modes and genetics controls remain proposals.','Actual lineage and guided-choice evidence.',True),
      ('Regional grammar, not palette soup','PROPOSED CONCEPT',CONCEPT/'transitions.png','Regions should differ through silhouette, drainage, traversal, life above and below, materials, and discovery situations. Color alone is not ecology.','PROPOSED CONCEPT ART - not a game screenshot.'),
      ('A personal map of a larger world','PROPOSED CONCEPT',CONCEPT/'atlas.png','A seeded edition can support personal surveying, later community reports, and rare clue-led secrets without promising a predictable global path grid.','PROPOSED CONCEPT ART - later sharing is unshipped.'),
      ('Families need compatible parts','PROPOSED CONCEPT',CONCEPT/'traits.png','Modular Wildkin need compatible rigs, sockets, materials, collision, saves, and readable silhouettes. More part count is not proof of better variety.','PROPOSED CONCEPT ART - modular parts are unshipped.'),
      ('Research stays in the world','PROPOSED CONCEPT',CONCEPT/'research.png','Observe, compare, understand, then guide one clear eligible trait. Field research should clarify choices without becoming a genetics spreadsheet.','PROPOSED CONCEPT ART - future research layer.'),
      ('Camp makes care tangible','PROPOSED CONCEPT',CONCEPT/'sanctuary.png','Habitat, food, gardens, building, and later power can give every collected individual a place in Camp. Current Camp care is intentionally much smaller.','PROPOSED CONCEPT ART - future Camp expansion.'),
      ('Breeding for resemblance','PROPOSED CONCEPT',CONCEPT/'breeding.png','Pairing, unfertilized eggs, buds and spores suggest different fictional life cycles. Symbiosis can influence readiness. Each needs its own authored rules; mortality and elder choices remain open.','PROPOSED CONCEPT ART - not a selected mortality model.'),
      ('Archive, then begin again','PROPOSED CONCEPT',CONCEPT/'dna.png','A future DNA archive/cloning path consumes resources, power, time, and capacity. It creates a new individual with provenance, not a restored lived bond.','PROPOSED CONCEPT ART - later science-fiction system.'),
      ('Habitats are puzzles','PROPOSED CONCEPT',CONCEPT/'habitat.png','Food, shelter, microclimate, and field clues can connect a regional outing to Camp. Persistent clearing and machine/crop components are later bounded systems.','PROPOSED CONCEPT ART - future habitat work.'),
      ('Field notes make sightings matter','PROPOSED CONCEPT',CONCEPT/'journal.png','Rare secrets should be explainable: clue, route, reason, interaction, and reward. Community maps and trusted trade follow only after their own contracts exist.','PROPOSED CONCEPT ART - future discovery/community layer.'),
    ]
    for n,p in enumerate(pages,1): page(c,n,*p[:5], proposed=p[1]=='PROPOSED CONCEPT', two=isinstance(p[2],tuple))
    page(c,19,'A first dramatic plateau','CURRENT PROTOTYPE',ACTUAL/'skybreak-r3-overview.png','Skybreak rises 27.69 m from its approach to the crown. Four detailed chunks share exact rendered and physical ground. R3 is selected after three passes; its 4.9/10 art score remains below target.','ACTUAL diagnostic overview: fixed camera, fog disabled. Sparse ecology remains work.')
    page(c,20,'A route with consequences','CURRENT PLAYABLE EVIDENCE',(ACTUAL/'skybreak-final-crown-portrait.png',ACTUAL/'skybreak-final-cliff-portrait.png'),'The actual controller reached the crown and returned at full health. A separate crown-side departure fell 30.7 m and cost four health. The left view is on top; the right is after landing below.','Actual portrait captures. Disclosed route/start fixtures; this is not a fresh earned journey.',two=True)
    page(c,21,'Extreme land has contracts','PROPOSED CONCEPT',CONCEPT/'transitions.png','Narrow caps, river basins, mountains, deserts, clearable underbrush, overhang meshes, and cave instances need shared surface/collision rules. A heightfield cannot describe an overhang by itself.','PROPOSED CONCEPT ART - representation direction.',proposed=True)
    page(c,22,'What stays deliberately open','RESEARCH LEDGER',ACTUAL/'gameplay-r3.png','Physical-phone comfort, water/swimming, cave lifecycle, full modular anatomy, elder/mortality choices, and trusted online trade remain open. Current growth is active-play only and does not choose all future life-cycle rules.','Actual field capture; open questions are explicit.')
    page(c,23,'Evidence and future direction','READING GUIDE',(ACTUAL/'final-small.png',CONCEPT/'dna.png'),'Mint headers mark current playable evidence. Proposed concept art is always labeled. Skybreak is a selected terrain prototype; its art target and regional ecology remain incomplete. This report does not claim unshipped traits, climates, trading, or an alternate campaign/save.','Actual HUD beside clearly labeled proposed art.',proposed=True,two=True)
    page(c,24,'Next proof, then expansion','CLOSING',ACTUAL/'inspector.png','The terrain foundation now passes 1,160 tests and packaged checks. Next: give cap and lowland habitats different life and one meaningful discovery. Physical-phone performance and the art target still need work.','Current diagnostic image; new regional geography is being implemented.')
    flow_page(c,25,'From one seed to a place','WORLD GENERATION / NOW + PROPOSED',[
      ('Saved world identity','One fixed edition drives separated terrain and content random streams.','NOW'),
      ('Large regional grammar','Choose a landform family, broad climate and connected drainage.','LATER'),
      ('Shared supported surfaces','Terrain, physics, map and placements agree on the same ground.','NOW'),
      ('Life and discoveries','Reserve homes, resources and meaningful sites by surface and region.','LATER'),
      ('Stream nearby detail','Create and retire a bounded neighborhood around the player.','NOW')],
      'Heightfields cover ordinary ground. Overhang meshes and persistent cave instances will be separate surface owners.')
    flow_page(c,26,'A family grows through play','CREATURE LIFE / NOW + PROPOSED',[
      ('Observe in the field','Earn a clue by studying a living wild Mossling.','NOW'),
      ('Make a home','Settle, feed and grow berries at the physical Camp nursery.','NOW'),
      ('Choose one influence','Natural pairing or an earned parent body-tone guarantee.','NOW'),
      ('Welcome an individual','Commit the young once; active play advances its growth and lineage.','NOW'),
      ('Expand the family language','Habitat needs, markings, compatible shapes and other reproduction.','LATER')],
      'Saved identity belongs to the individual. Rendering, research and growth use that identity rather than creating a second creature inventory.')
    area_page(c,27)
    flow_page(c,28,'Build a community of explorers','COMMUNITY / PROPOSED',[
      ('A personal field record','The current atlas remembers where each player has explored.','NOW'),
      ('Share an expedition story','Screenshots, field sketches and seed/edition coordinates.','LATER'),
      ('Collective surveys','Regional mapping challenges and verified discoveries.','LATER'),
      ('Exchange a lineage','DNA samples or creatures with clear parents, traits and provenance.','LATER'),
      ('Trust the exchange','Online ownership, capacity and atomic trade need an authority.','LATER')],
      'No online economy ships today. Community goals should reward observation and cooperation without demanding daily care or endless stat grinding.')
    c.save(); W,H=old

def inline(text):
    value=html.escape(text)
    value=re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", value)
    value=re.sub(r"`([^`]+)`", r'<font color="#286a72">\1</font>', value)
    value=re.sub(r"https?://[^\s<]+", lambda m:'<link href="'+m[0]+'" color="#176b7c">'+m[0]+'</link>', value)
    return value

def appendix():
    source=(OUT/'Living-Frontier-Research-Appendix.md').read_text(encoding='utf-8')
    doc=SimpleDocTemplate(str(OUT/'Living-Frontier-Research-Appendix.pdf'),pagesize=(W,H),leftMargin=27,rightMargin=27,topMargin=44,bottomMargin=40,title='Wildkin Frontier: detailed research and implementation ledger',author='Wildkin Frontier research')
    body=ParagraphStyle('body',fontName='Report',fontSize=11,leading=15,spaceAfter=9,textColor=HexColor(INK),splitLongWords=True)
    heading=ParagraphStyle('heading',parent=body,fontName='ReportBold',fontSize=17,leading=21,spaceBefore=15,spaceAfter=10,keepWithNext=True)
    title=ParagraphStyle('title',parent=heading,fontSize=25,leading=29,spaceAfter=15)
    small=ParagraphStyle('small',parent=body,fontSize=10,leading=14)
    story=[];lines=source.splitlines();i=0
    while i<len(lines):
        line=lines[i].strip()
        if not line:i+=1;continue
        if line.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                cells=[v.strip() for v in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[: -]+',v) for v in cells):rows.append(cells)
                i+=1
            # Phone-sized stacked rows preserve every cell without tiny table text.
            labels=rows[0]
            for row in rows[1:]:
                contents=[Paragraph(inline(row[0]),heading)]
                for label,value in zip(labels[1:],row[1:]):contents.append(Paragraph('<b>'+inline(label)+':</b> '+inline(value),body))
                story.append(KeepTogether(contents))
            continue
        if line.startswith('# '):story.append(Paragraph(inline(line[2:]),title))
        elif line.startswith('## '):story.append(Paragraph(inline(line[3:]),heading))
        elif line.startswith('### '):story.append(Paragraph(inline(line[4:]),heading))
        elif line.startswith('- '):story.append(Paragraph('&#8226; '+inline(line[2:]),body))
        else:
            paragraph_lines=[line]
            while i+1<len(lines) and lines[i+1].strip() and not re.match(r'^(#|\||- |\d+\. )',lines[i+1].strip()):
                i+=1;paragraph_lines.append(lines[i].strip())
            story.append(Paragraph(inline(' '.join(paragraph_lines)),small if re.match(r'\d+\. ',line) else body))
        i+=1
    def furniture(c,d):
        c.setFillColor(HexColor(INK));c.setFont('ReportBold',8);c.drawString(27,H-25,'LIVING FRONTIER  /  DETAILED RESEARCH')
        c.setStrokeColor(HexColor(SKY));c.line(27,H-31,W-27,H-31)
        c.setFont('Report',8);c.drawString(27,21,'Source-linked ideas + current evidence  |  September 12, 2026');c.drawRightString(W-27,21,str(d.page))
    doc.build(story,onFirstPage=furniture,onLaterPages=furniture)

def render_contacts():
    from pypdf import PdfReader
    import pypdfium2 as pdfium
    REVIEW.mkdir(exist_ok=True)
    manifest={}
    for pdf,stem in [('Living-Frontier-Visual-Fieldbook.pdf','fieldbook'),('Living-Frontier-Research-Appendix.pdf','appendix')]:
        path=OUT/pdf;reader=PdfReader(str(path));document=pdfium.PdfDocument(str(path))
        manifest[pdf]={'pages':len(reader.pages),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'dimensions':[float(reader.pages[0].mediabox.width),float(reader.pages[0].mediabox.height)],'text_chars':[len(p.extract_text() or '') for p in reader.pages]}
        thumbnails=[]
        for n,page in enumerate(document):
            im=page.render(scale=1.25).to_pil().convert('RGB')
            # Full renders are working evidence; contact sheets are retained in repo.
            folder=ROOT/'.dream-loop'/'research-refresh'/stem;folder.mkdir(parents=True,exist_ok=True)
            im.save(folder/f'page-{n+1:02d}.png')
            im.thumbnail((216,360));thumb=Image.new('RGB',(228,390),'white');thumb.paste(im,((228-im.width)//2,8));ImageDraw.Draw(thumb).text((10,372),f'{n+1:02d}',fill='black');thumbnails.append(thumb)
        for start in range(0,len(thumbnails),8):
            block=thumbnails[start:start+8];sheet=Image.new('RGB',(228*4,390*2),'#dfe7e5')
            for j,thumb in enumerate(block):sheet.paste(thumb,((j%4)*228,(j//4)*390))
            sheet.save(REVIEW/f'{stem}-contact-{start//8+1}.png')
        document.close()
    (REVIEW/'qa.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')

if __name__=='__main__':
    fieldbook();appendix();render_contacts()
