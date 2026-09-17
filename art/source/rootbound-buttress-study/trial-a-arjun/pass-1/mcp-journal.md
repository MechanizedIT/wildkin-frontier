# Trial A — executed Blender MCP journal

All calls used the exact required user prompt:

> Lets go ahead and take some time to make the prosed agent that analyzes the target image and makes a plan, maybe test out both of those skills you gound as well. Do a test run on the tree from scratch.

This journal preserves the live-scene construction chunks in execution order. They were issued only to the RootboundSkillTrial workbench (owned PID 8396). `COL_Blockout` remains a massing collection: its 15 closed component meshes are **not welded together**. That is intentional Gate A evidence and a known gap against the final connected-topology requirement.

## 01 — scene and source checkpoint

```python
import bpy
from pathlib import Path
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=512; scene.render.resolution_y=512; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.world.color=(.055,.055,.055)
root=scene.collection
for name in ['COL_Reference','COL_Blockout','COL_Geo','COL_Collision','COL_Render']:
    if name not in bpy.data.collections:
        col=bpy.data.collections.new(name); root.children.link(col)
out=Path(r'C:/Users/cwood/Documents/mobile-rpg/art/source/rootbound-buttress-study/trial-a-arjun/pass-1')
out.mkdir(parents=True,exist_ok=True); (out/'renders').mkdir(exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'rootbound-buttress-trial-a-massing.blend'))
```

## 02 — trunk and five root volumes

```python
import bpy, math
from mathutils import Vector
from pathlib import Path
col=bpy.data.collections['COL_Blockout']
def add_mesh(name, verts, faces):
    me=bpy.data.meshes.new(name+'_Mesh'); me.from_pydata(verts,[],faces); me.update()
    ob=bpy.data.objects.new(name,me); col.objects.link(ob); return ob
def ring_loft(name, centers, rx, ry, sides=10, phase=0):
    verts=[]
    for j,c in enumerate(centers):
        for i in range(sides):
            a=2*math.pi*i/sides+phase+j*.12; verts.append((c[0]+math.cos(a)*rx[j],c[1]+math.sin(a)*ry[j],c[2]))
    faces=[]
    for j in range(len(centers)-1):
        for i in range(sides): faces.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
    faces += [tuple(range(sides-1,-1,-1)),tuple((len(centers)-1)*sides+i for i in range(sides))]
    return add_mesh(name,verts,faces)
def root_volume(name, angle, reach, width, thickness, rise):
    d=Vector((math.cos(angle),math.sin(angle),0)); side=Vector((-d.y,d.x,0))
    centers=[d*.42+Vector((0,0,rise)), d*(reach*.46)+Vector((0,0,.30)), d*reach+Vector((0,0,.11))]
    scales=[(width*.62,thickness*.55),(width*.82,thickness*.55),(width*.46,thickness*.42)]
    verts=[]; sides=8
    for c,(w,h) in zip(centers,scales):
        for i in range(sides):
            a=2*math.pi*i/sides+math.pi/8; pt=c+side*(math.cos(a)*w)+Vector((0,0,math.sin(a)*h)); verts.append((pt.x,pt.y,max(0,pt.z)))
    faces=[]
    for j in range(2):
        for i in range(sides): faces.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
    faces += [tuple(range(sides-1,-1,-1)),tuple(16+i for i in range(sides))]
    return add_mesh(name,verts,faces)
ring_loft('SM_A_Blockout_Trunk',[(0,0,.05),(-.06,.03,.55),(.06,-.02,1.35),(.14,.02,2.25),(.24,-.02,3.12)],[1.18,1.28,1.02,.74,.56],[1.02,1.10,.88,.66,.52],10,.08)
for n,(a,r,w,t,h) in enumerate([(-2.45,2.35,.72,.34,1.36),(-1.15,2.12,.62,.30,1.24),(-.05,2.48,.78,.42,1.48),(1.28,2.05,.60,.30,1.20),(2.48,1.82,.65,.32,1.30)]): root_volume(f'SM_A_Blockout_Root_{n+1}',a,r,w,t,h)
bpy.ops.wm.save_as_mainfile(filepath=str(Path(r'C:/Users/cwood/Documents/mobile-rpg/art/source/rootbound-buttress-study/trial-a-arjun/pass-1')/'rootbound-buttress-trial-a-massing.blend'))
```

## 03 — curved tangent-frame forks

```python
import bpy, math
from mathutils import Vector
from pathlib import Path
col=bpy.data.collections['COL_Blockout']
def add_mesh(name, verts, faces):
    me=bpy.data.meshes.new(name+'_Mesh'); me.from_pydata(verts,[],faces); me.update(); ob=bpy.data.objects.new(name,me); col.objects.link(ob); return ob
def branch_volume(name, points, radii, sides=9):
    verts=[]; tangents=[]
    for j,p in enumerate(points):
        t=(Vector(points[1])-Vector(p)) if j==0 else ((Vector(p)-Vector(points[j-1])) if j==len(points)-1 else Vector(points[j+1])-Vector(points[j-1])); tangents.append(t.normalized())
    for j,(p,t) in enumerate(zip(points,tangents)):
        side=t.cross(Vector((0,0,1))); side=side if side.length>=.01 else Vector((1,0,0)); side.normalize(); up=side.cross(t).normalized()
        for i in range(sides):
            a=2*math.pi*i/sides+0.13*j; v=Vector(p)+side*(math.cos(a)*radii[j][0])+up*(math.sin(a)*radii[j][1]); verts.append(tuple(v))
    faces=[]
    for j in range(len(points)-1):
        for i in range(sides): faces.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
    faces += [tuple(range(sides-1,-1,-1)),tuple((len(points)-1)*sides+i for i in range(sides))]
    return add_mesh(name,verts,faces)
branch_volume('SM_A_Blockout_LeftFork',[(.08,.02,2.58),(-.28,.08,2.90),(-.76,.20,3.35),(-1.38,.28,3.82),(-1.65,.35,4.02)],[(.55,.48),(.48,.40),(.37,.32),(.29,.26),(.23,.21)])
branch_volume('SM_A_Blockout_RightFork',[(.28,-.03,2.44),(.62,-.18,2.72),(1.08,-.34,3.08),(1.50,-.40,3.46),(1.72,-.42,3.60)],[(.52,.44),(.45,.37),(.35,.30),(.28,.25),(.22,.20)])
branch_volume('SM_A_Blockout_UpperLeader',[(.26,.00,3.02),(.38,-.08,3.44),(.46,-.15,3.92),(.60,-.20,4.38),(.70,-.20,4.60)],[(.46,.40),(.40,.34),(.32,.28),(.26,.23),(.21,.19)])
bpy.ops.wm.save_as_mainfile(filepath=str(Path(r'C:/Users/cwood/Documents/mobile-rpg/art/source/rootbound-buttress-study/trial-a-arjun/pass-1')/'rootbound-buttress-trial-a-massing.blend'))
```

## 04 — six volumetric canopy hulls in three lobe groups

```python
import bpy, math
from pathlib import Path
col=bpy.data.collections['COL_Blockout']
def add_mesh(name, verts, faces):
    me=bpy.data.meshes.new(name+'_Mesh'); me.from_pydata(verts,[],faces); me.update(); ob=bpy.data.objects.new(name,me); col.objects.link(ob); return ob
def canopy_hull(name, c, sx, sy, sz, phase):
    sides=8; levels=[(-.50,.28),(-.22,.84),(.18,1.0),(.50,.66)]; verts=[]
    for j,(z,scale) in enumerate(levels):
        for i in range(sides):
            a=2*math.pi*i/sides+phase; wobble=1+.16*math.sin(i*2.3+phase*7)+.09*math.cos(i*3.2+j)
            verts.append((c[0]+math.cos(a)*sx*scale*wobble,c[1]+math.sin(a)*sy*scale*wobble,c[2]+z*sz))
    top=len(verts); verts.append((c[0]+.12*sx,c[1]-.10*sy,c[2]+.63*sz)); bot=len(verts); verts.append((c[0]-.10*sx,c[1]+.08*sy,c[2]-.62*sz)); faces=[]
    for j in range(3):
        for i in range(sides): faces.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
    for i in range(sides): faces += [(top,24+i,24+(i+1)%sides),(bot,(i+1)%sides,i)]
    return add_mesh(name,verts,faces)
canopy_hull('SM_A_Blockout_CanopyLeft_A',(-1.55,.35,3.95),1.02,.75,.93,.22); canopy_hull('SM_A_Blockout_CanopyLeft_B',(-2.02,.28,3.70),.62,.52,.58,.65)
canopy_hull('SM_A_Blockout_CanopyHigh_A',(.62,-.15,4.83),1.10,.82,1.10,.40); canopy_hull('SM_A_Blockout_CanopyHigh_B',(.10,.02,4.62),.62,.58,.62,.88)
canopy_hull('SM_A_Blockout_CanopyRight_A',(1.72,-.42,3.85),.92,.70,.86,.50); canopy_hull('SM_A_Blockout_CanopyRight_B',(2.12,-.30,3.68),.50,.46,.52,.95)
bpy.ops.wm.save_as_mainfile(filepath=str(Path(r'C:/Users/cwood/Documents/mobile-rpg/art/source/rootbound-buttress-study/trial-a-arjun/pass-1')/'rootbound-buttress-trial-a-massing.blend'))
```

## 05 — neutral Gate A camera and renders

```python
import bpy
from mathutils import Vector
from pathlib import Path
scene=bpy.context.scene; rcol=bpy.data.collections['COL_Render']
for o in list(rcol.objects): bpy.data.objects.remove(o,do_unlink=True)
def link_obj(o):
    for c in list(o.users_collection): c.objects.unlink(o)
    rcol.objects.link(o)
bpy.ops.object.camera_add(); cam=bpy.context.object; cam.name='CAM_A_SourceFacing'; link_obj(cam); scene.camera=cam; cam.data.type='ORTHO'; cam.data.ortho_scale=7.15
for name,loc,energy,size in [('LGT_A_Key',(5,-6,9),1200,5),('LGT_A_Fill',(-5,-3,5),500,4),('LGT_A_Rim',(0,6,7),700,4)]:
    bpy.ops.object.light_add(type='AREA',location=loc); l=bpy.context.object; l.name=name; l.data.energy=energy; l.data.shape='DISK'; l.data.size=size; link_obj(l)
bpy.ops.mesh.primitive_plane_add(size=20,location=(0,0,-.012)); floor=bpy.context.object; floor.name='SM_A_RenderGround'; link_obj(floor)
mat=bpy.data.materials.new('MAT_A_NeutralGround'); mat.diffuse_color=(.19,.19,.19,1); floor.data.materials.append(mat)
out=Path(r'C:/Users/cwood/Documents/mobile-rpg/art/source/rootbound-buttress-study/trial-a-arjun/pass-1'); rend=out/'renders'; rend.mkdir(exist_ok=True)
def render(name,loc):
    cam.location=loc; cam.rotation_euler=(Vector((0,0,2.75))-cam.location).to_track_quat('-Z','Y').to_euler(); scene.render.filepath=str(rend/(name+'.png')); bpy.ops.render.render(write_still=True)
render('massing_front',(0,-11,4.1)); render('massing_rear',(0,11,4.1)); render('massing_left',(-11,0,4.1)); render('massing_right',(11,0,4.1)); render('massing_source_three_quarter',(8,-10,5.0))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'rootbound-buttress-trial-a-massing.blend'))
```

## Read-only audit after freeze

- 15 separate closed mesh objects; **958 triangles** total.
- World bounds: min `[-2.5774,-2.0427,0]`, max `[2.7582,2.0370,5.5230]`, dimensions **5.3356 × 4.0797 × 5.5230 m**.
- Every individual component reported zero boundary edges and zero non-manifold edges.
- The components are not joined or vertex-welded; intersections/attachments are visual blockout only. The final director plan requires a later continuous welded root/trunk/fork solution if Gate A authorizes a repair.
