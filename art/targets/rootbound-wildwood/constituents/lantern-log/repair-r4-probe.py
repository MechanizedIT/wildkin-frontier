"""Limited pre-build R4 outer-body probe; not a closed model or rendering proof."""
import json, math
from pathlib import Path
HERE=Path(__file__).resolve().parent
p=json.loads((HERE/'manual-fallback-parameters.json').read_text(encoding='utf8'))
angles=sorted(set(range(0,360,30))|{165,175,185,215,225,235,290,300,310,335,345,355})
factors=[1.06,1,1.12,.96,.84]; shifts=[-.005,0,-.025,.010,.005]
weights=[0,.65,1,.6,0]; valleys={175:.025,225:.030,300:.025,345:.018}
near=[-.045,.025,-.075,-.140,-.055,.012,-.105,-.020,-.145,-.030,-.095,.020]
far=[.030,-.025,.050,.080,-.035,.025,-.040,.015,-.030,.010,.045,-.020]
rise=[0,0,.035,.110,.020,0,0,0,0,0,0,0]
def interp(values,a):
    lo=int(a//30); t=(a%30)/30
    return values[lo]*(1-t)+values[(lo+1)%12]*t
rings=[]
for j,(x,cy,cz,ry,rz) in enumerate(p['log']['sections']):
    ring=[]
    for a in angles:
        y=interp([ry*math.cos(math.radians(k)) for k in range(0,360,30)],a)
        z=interp([rz*math.sin(math.radians(k)) for k in range(0,360,30)],a)
        w=max(0,-math.sin(math.radians(a))); scale=1+w*(factors[j]-1)
        y=y*scale+w*shifts[j]; z*=scale
        depth=valleys.get(a,0)*weights[j]; norm=math.hypot(y,z)
        if depth:y*=1-depth/norm; z*=1-depth/norm
        vx=x+(interp(near,a) if j==0 else interp(far,a) if j==4 else 0)
        vz=cz+z+(interp(rise,a) if j==4 else 0)
        ring.append((vx,cy+y,max(.075,vz)-.075))
    rings.append(ring)
triangles=[]
for r,s in zip(rings,rings[1:]):
    for i in range(len(angles)):
        k=(i+1)%len(angles)
        triangles.extend([(r[i],s[i],r[k]),(r[k],s[i],s[k])])
def hit_z(x,y,t):
    a,b,c=t; den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
    if abs(den)<1e-12:return None
    u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den
    v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den
    w=1-u-v
    return u*a[2]+v*b[2]+w*c[2] if min(u,v,w)>=-1e-9 else None
contacts=[]
for m in p['mushrooms']:
    x,y,z=m['stem'][0]; hits=[h for t in triangles if (h:=hit_z(x,y,t)) is not None]
    assert hits,m['id']
    top=max(hits); embed=top-(z-.075)
    assert embed>=.008,(m['id'],embed)
    contacts.append({'id':m['id'],'body_surface_z':top,'base_embed_m':embed})
points=[v for ring in rings for v in ring]
bounds=[[min(v[i] for v in points),max(v[i] for v in points)] for i in range(3)]
report={'status':'PASS limited outer-body base-center contacts','angular_samples':angles,
        'outer_side_triangles':len(triangles),'outer_body_bounds':bounds,'contacts':contacts,
        'limits':['This triangulates outer side walls only, not closed ends or moss.',
                  'Blender final triangulation, normals, closure, full bounds and real attachment tests remain required.',
                  'No rendered likeness, all-angle contact, collision or runtime admission.']}
(HERE/'repair-r4-probe.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(report))
