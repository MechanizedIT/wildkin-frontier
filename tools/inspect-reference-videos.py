"""Local-only reference review. Extract contact sheets without uploading recordings."""
from pathlib import Path
import sys, subprocess, re, json
sys.path.insert(0, str(Path('dist/qa/media-deps').resolve()))
import imageio_ffmpeg
from PIL import Image, ImageDraw

out = Path('dist/qa/references'); out.mkdir(parents=True, exist_ok=True)
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
files = list(Path(r'C:\Users\cwood\Documents\Quickshare').glob('Screen_Recording_20260909_*_*.mp4'))
manifest = []
for file in files:
    probe = subprocess.run([ffmpeg, '-hide_banner', '-i', str(file)], capture_output=True, text=True).stderr
    match = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', probe)
    if not match: continue
    h,m,s = map(float, match.groups()); duration = h*3600+m*60+s
    folder = out / file.stem; folder.mkdir(exist_ok=True)
    times = [round(i*duration/20, 2) for i in range(20)]
    sheet = Image.new('RGB', (5*240,4*554), '#192130'); draw = ImageDraw.Draw(sheet)
    for i,t in enumerate(times):
        frame = folder / f'{t:07.2f}.jpg'
        subprocess.run([ffmpeg,'-loglevel','error','-ss',str(t),'-i',str(file),'-frames:v','1','-vf','scale=480:-1','-q:v','2','-y',str(frame)],check=True)
        im = Image.open(frame); im.thumbnail((236,524))
        x=(i%5)*240; y=(i//5)*554
        sheet.paste(im,(x+(240-im.width)//2,y+24)); draw.text((x+8,y+5),f'{int(t)//60}:{int(t)%60:02d}',fill='white')
    sheet.save(folder/'contact.jpg',quality=90)
    manifest.append({'file':str(file),'duration':duration,'times':times,'contact':str((folder/'contact.jpg').resolve())})
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))
