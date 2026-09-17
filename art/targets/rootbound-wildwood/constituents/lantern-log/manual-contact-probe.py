"""CPU-only log/stem construction feasibility, not an asset build or render."""
import hashlib,json,math
from pathlib import Path
P=Path(__file__).with_name('manual-fallback-parameters.json')
d=json.loads(P.read_text(encoding='utf8'))
rings=[]
for x,y,z,ry,rz in d['log']['sections']:
    rings.append([(x,y+ry*math.cos(i*math.tau/12),max(d['log']['grounding']['source_z_floor_m'],z+rz*math.sin(i*math.tau/12))) for i in range(12)])
triangles=[]
for j in range(len(rings)-1):
    for i in range(12):
        a,b,c,e=rings[j][i],rings[j][(i+1)%12],rings[j+1][i],rings[j+1][(i+1)%12]
        triangles.extend([(a,c,b),(b,c,e)])
def hit_z(x,y,tri):
    a,b,c=tri
    den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
    if abs(den)<1e-12:return None
    u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den
    v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den
    w=1-u-v
    return u*a[2]+v*b[2]+w*c[2] if min(u,v,w)>=-1e-9 else None
rows=[]
for m in d['mushrooms']:
    x,y,z=m['stem'][0]
    hits=[h for t in triangles if (h:=hit_z(x,y,t)) is not None]
    surface=max(hits) if hits else None
    cap_bottom=m['capCenter'][2]-.42*m['capHeight']
    embed=surface-z if surface is not None else None
    cap_embed=m['stem'][-1][2]-cap_bottom
    rows.append({'id':m['id'],'log_surface_at_stem_center_m':surface,'stem_base_z_m':z,
                 'base_center_inside_log_m':embed,'stem_top_above_cap_center_bottom_m':cap_embed})
assert len(rows)==6 and all(r['base_center_inside_log_m']>=.008 for r in rows)
assert all(r['stem_top_above_cap_center_bottom_m']>=.012 for r in rows)
def measures(points):
    vectors=[[b[i]-a[i] for i in range(3)] for a,b in zip(points,points[1:])]
    lengths=[math.sqrt(sum(q*q for q in v)) for v in vectors]
    angles=[math.degrees(math.acos(max(-1,min(1,sum(a*b for a,b in zip(vectors[i],vectors[i+1]))/(lengths[i]*lengths[i+1]))))) for i in range(len(vectors)-1)]
    return {'segment_lengths_m':lengths,'direction_change_degrees':angles}
report={'parameters_sha256':hashlib.sha256(P.read_bytes()).hexdigest(),'log_side_triangles':len(triangles),
        'source_ground_plane_m':d['log']['grounding']['source_z_floor_m'],
        'ground_plane_triangle_count':sum(all(abs(v[2]-d['log']['grounding']['source_z_floor_m'])<1e-9 for v in t) for t in triangles),
        'centerline_measures':{'log':measures([s[:3] for s in d['log']['sections']]),**{m['id']:measures(m['stem']) for m in d['mushrooms']}},
        'contacts':rows,'status':'PASS for literal log-side center penetrations and cap-axis overlap only',
        'limits':['Probe triangulates log sides only; it is not a full asset or closed-mesh audit.',
                  'Cap-axis overlap does not prove complete rim coverage; actual Blender views must inspect it.',
                  'No hidden cap visibility, underside closure, global intersections or runtime fit is claimed.']}
Path(__file__).with_name('manual-contact-probe.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(report))
