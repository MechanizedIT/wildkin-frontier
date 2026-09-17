"""Contingent Blender 4.5 builder; do not execute before root grants the counted run.
Run: blender --background --python build-manual-r3.py -- --out <directory>
"""
import argparse, ctypes, hashlib, json, math, os, sys, threading, time
from pathlib import Path
import bpy, bmesh
from mathutils import Vector
from mathutils.geometry import intersect_ray_tri

START_FREE_GIB = 8.0
RESERVE_GIB = 6.0

HERE = Path(__file__).resolve().parent
EXPECTED_HASH = '7d04105d455170836a2d3056f654f03a4603b58af6ad818114852e452c06e7e3'

def load_params():
    raw = (HERE / 'parameters.json').read_bytes()
    if hashlib.sha256(raw).hexdigest() != EXPECTED_HASH:
        raise RuntimeError('parameters.json hash differs from independent-review input')
    return json.loads(raw)

def mesh_object(name, verts, faces, material_names, material_indices=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    bm = bmesh.new(); bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh); bm.free(); mesh.update()
    obj = bpy.data.objects.new(name, mesh); bpy.context.collection.objects.link(obj)
    for mat in material_names: obj.data.materials.append(mat)
    if material_indices:
        for poly, idx in zip(mesh.polygons, material_indices): poly.material_index = idx
    return obj

def make_material(name, hex_color):
    h = hex_color.lstrip('#'); rgb = tuple(int(h[i:i+2], 16) / 255 for i in (0,2,4))
    mat = bpy.data.materials.new(name); mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1); bsdf.inputs['Roughness'].default_value = 1.0; bsdf.inputs['Metallic'].default_value = 0.0
    return mat

def section_at(sections, x):
    for a, b in zip(sections, sections[1:]):
        if a[0] <= x <= b[0]:
            t = (x-a[0])/(b[0]-a[0]); return [a[i]*(1-t)+b[i]*t for i in range(1,5)]
    s = sections[0] if x < sections[0][0] else sections[-1]; return s[1:]

def shell_point(sections, x, theta, offset=0):
    cy, cz, ry, rz = section_at(sections, x)
    # positive offset is outward from elliptical shell
    return (x, cy+(ry+offset)*math.cos(theta), cz+(rz+offset)*math.sin(theta))

def bridge(faces, a, b, n):
    for i in range(n): faces.append((a[i], a[(i+1)%n], b[(i+1)%n], b[i]))

FAR_RIM_X_OFFSETS=(.006,-.009,.014,-.004,.011,-.012,.003,-.016,.008,-.006,.013,-.002)

def radial_solid(name, sections, n, mats, near_end):
    verts=[]; faces=[]; indices=[]; rings=[]
    for section_index,sec in enumerate(sections):
        ring=[]
        for i in range(n):
            theta=2*math.pi*i/n; x=sec[0]+(FAR_RIM_X_OFFSETS[i] if section_index==len(sections)-1 else 0.0); ring.append(len(verts)); verts.append((x, sec[1]+sec[3]*math.cos(theta), sec[2]+sec[4]*math.sin(theta)))
        rings.append(ring)
    # Four longitudinal section bands use the three approved wood colors around the shell; last ring has fixed ≤.02m end-grain offsets.
    for band,(a,b) in enumerate(zip(rings,rings[1:])):
        for i in range(n):
            faces.append((a[i],a[(i+1)%n],b[(i+1)%n],b[i])); indices.append((band+i)%3)
    far=rings[-1]; cx,cy,cz,_,_=sections[-1]; center=len(verts); verts.append((cx+.006,cy,cz))
    for i in range(n): faces.append((far[i],far[(i+1)%n],center)); indices.append(3)
    near=rings[0]; outer=sections[0]; ratio=float(near_end['innerRadiusRatio']); inner=[]
    for i in range(n):
        theta=2*math.pi*i/n; inner.append(len(verts)); verts.append((outer[0],outer[1]+outer[3]*ratio*math.cos(theta),outer[2]+outer[4]*ratio*math.sin(theta)))
    for i in range(n): faces.append((near[i],near[(i+1)%n],inner[(i+1)%n],inner[i])); indices.append(3)
    recess=[]
    for i in range(n):
        theta=2*math.pi*i/n; recess.append(len(verts)); verts.append((float(near_end['recessEndX']),outer[1]+outer[3]*ratio*math.cos(theta),outer[2]+outer[4]*ratio*math.sin(theta)))
    for i in range(n): faces.append((inner[i],inner[(i+1)%n],recess[(i+1)%n],recess[i])); indices.append(4)
    dark_center=len(verts); verts.append((float(near_end['recessEndX']),outer[1],outer[2]))
    for i in range(n): faces.append((recess[(i+1)%n],recess[i],dark_center)); indices.append(4)
    return mesh_object(name,verts,faces,mats,indices)

def strip_solid(name, sections, x0, x1, theta, halfwidth, inner, outer, mats, mat_index):
    # Each of five source sections contributes a closed four-vertex ridge ring, so strips follow the curved log.
    xs=[x0]+[sec[0] for sec in sections[1:-1] if x0 < sec[0] < x1]+[x1]
    verts=[]; rings=[]; faces=[]
    for x in xs:
        ring=[]
        for depth,angle in ((-inner,theta-halfwidth),(-inner,theta+halfwidth),(outer,theta+halfwidth),(outer,theta-halfwidth)):
            ring.append(len(verts)); verts.append(shell_point(sections,x,angle,depth))
        rings.append(ring)
    for a,b in zip(rings,rings[1:]): bridge(faces,a,b,4)
    faces += [tuple(reversed(rings[0])),tuple(rings[-1])]
    return mesh_object(name,verts,faces,mats,[mat_index]*len(faces))
def moss_solid(name, sections, c, mats):
    x0=c['x']-c['xHalfWidth']; x1=c['x']+c['xHalfWidth']; t=math.radians(c['bearingDeg']); w=c['angleHalfWidth']
    # Hexagonal irregular perimeter: six ordered points, copied embedded/proud and bridged.
    perimeter=[(x0,t-w*.55),(c['x'],t-w),(x1,t-w*.45),(x1,t+w*.55),(c['x'],t+w),(x0,t+w*.4)]
    verts=[shell_point(sections,x,a,-.006) for x,a in perimeter]+[shell_point(sections,x,a,.018) for x,a in perimeter]
    faces=[tuple(range(5,-1,-1)),tuple(range(6,12))]
    for i in range(6): faces.append((i,(i+1)%6,(i+1)%6+6,i+6))
    return mesh_object(name, verts, faces, mats, [0]*len(faces))

def frame_for(points, index):
    p=Vector(points[index]); prev=Vector(points[max(0,index-1)]); nxt=Vector(points[min(len(points)-1,index+1)])
    tangent=(nxt-prev).normalized(); reference=Vector((0,0,1))
    if abs(tangent.dot(reference))>.9: reference=Vector((0,1,0))
    u=tangent.cross(reference).normalized(); v=tangent.cross(u).normalized(); return u,v

def stem_solid(name, points, radii, mats):
    n=8; verts=[]; rings=[]; faces=[]
    for j,p in enumerate(points):
        u,v=frame_for(points,j); ring=[]
        for i in range(n):
            q=Vector(p)+radii[j]*(u*math.cos(2*math.pi*i/n)+v*math.sin(2*math.pi*i/n)); ring.append(len(verts)); verts.append(tuple(q))
        rings.append(ring)
    for a,b in zip(rings,rings[1:]): bridge(faces,a,b,n)
    for ring, point, flip in ((rings[0],points[0],True),(rings[-1],points[-1],False)):
        c=len(verts); verts.append(tuple(point))
        for i in range(n): faces.append((ring[(i+1)%n],ring[i],c) if flip else (ring[i],ring[(i+1)%n],c))
    return mesh_object(name, verts, faces, mats, [0]*len(faces))

def cap_solid(name, cap, rings, mats):
    n=12; verts=[]; layers=[]; faces=[]; indices=[]
    for ring in rings:
        r,z=ring['r'],ring['z']; base=Vector(cap['capCenter']); base.z+=cap['capHeight']*z
        if r==0: layers.append([len(verts)]); verts.append(tuple(base)); continue
        layer=[]
        for i in range(n):
            a=2*math.pi*i/n; perturb=1+(.05 if i%3==0 else -.025 if i%3==1 else 0)
            layer.append(len(verts)); verts.append((base.x+cap['capRadius']*r*perturb*math.cos(a),base.y+.9*cap['capRadius']*r*perturb*math.sin(a),base.z))
        layers.append(layer)
    for transition,(lower,upper) in enumerate(zip(layers,layers[1:])):
        # top/shoulder use cap colors; rim-to-bottom is fully underside material.
        material=0 if transition in (0,2) else 1 if transition == 1 else 2
        if len(lower)==1:
            for i in range(n): faces.append((lower[0],upper[i],upper[(i+1)%n])); indices.append(material)
        elif len(upper)==1:
            for i in range(n): faces.append((lower[i],upper[0],lower[(i+1)%n])); indices.append(material)
        else:
            for i in range(n): faces.append((lower[i],lower[(i+1)%n],upper[(i+1)%n],upper[i])); indices.append(material)
    return mesh_object(name,verts,faces,mats,indices)
def available_gib():
    class Status(ctypes.Structure):
        _fields_=[('length',ctypes.c_ulong),('load',ctypes.c_ulong)]+[(k,ctypes.c_ulonglong) for k in ('total','available','page_total','page_available','virtual_total','virtual_available','extended')]
    status=Status(); status.length=ctypes.sizeof(status)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)): raise OSError('cannot read host RAM')
    return status.available / 2**30

def write_terminal(out, status, detail):
    Path(out).mkdir(parents=True,exist_ok=True)
    (Path(out)/'terminal-receipt.json').write_text(json.dumps({'status':status,'detail':detail,'timestamp_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())},indent=2)+'\n')

def start_watchdog(stop, out):
    def check():
        while not stop.wait(.5):
            if available_gib() < RESERVE_GIB:
                write_terminal(out,'HOLD_RESERVE_BREACH',{'available_gib':available_gib(),'reserve_gib':RESERVE_GIB})
                os._exit(77)
    thread=threading.Thread(target=check,daemon=True); thread.start()

def convex_hull_area_xy(points):
    pts=sorted(set((round(v.x,10),round(v.y,10)) for v in points))
    if len(pts)<3: return 0.0
    def cross(o,a,b): return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
    lower=[]
    for point in pts:
        while len(lower)>=2 and cross(lower[-2],lower[-1],point)<=0: lower.pop()
        lower.append(point)
    upper=[]
    for point in reversed(pts):
        while len(upper)>=2 and cross(upper[-2],upper[-1],point)<=0: upper.pop()
        upper.append(point)
    hull=lower[:-1]+upper[:-1]
    return abs(sum(hull[i][0]*hull[(i+1)%len(hull)][1]-hull[(i+1)%len(hull)][0]*hull[i][1] for i in range(len(hull)))/2)

def audit(obj):
    mesh=obj.data; mesh.calc_loop_triangles(); bm=bmesh.new(); bm.from_mesh(mesh)
    counts={}
    for edge in bm.edges:
        uses=len(edge.link_faces); counts[uses]=counts.get(uses,0)+1
    bm.free(); directed={}; volume=0.0; min_area=float('inf'); nonfinite=0
    for tri in mesh.loop_triangles:
        ids=list(tri.vertices); a,b,c=(Vector(mesh.vertices[i].co) for i in ids)
        if not all(math.isfinite(q) for v in (a,b,c) for q in v): nonfinite+=1
        area=(b-a).cross(c-a).length*.5; min_area=min(min_area,area)
        volume+=a.dot(b.cross(c))/6
        for u,v in ((ids[0],ids[1]),(ids[1],ids[2]),(ids[2],ids[0])): directed[(u,v)]=directed.get((u,v),0)+1
    directed_fail=sum(count for (u,v),count in directed.items() if directed.get((v,u),0)!=count)
    if nonfinite or min_area<=1e-10: raise RuntimeError(f'{obj.name}: nonfinite={nonfinite}, min_triangle_area={min_area}')
    if counts.get(1,0) or any(k!=2 for k in counts): raise RuntimeError(f'{obj.name}: non-closed edge use {counts}')
    if directed_fail: raise RuntimeError(f'{obj.name}: directed edge consistency failures={directed_fail}')
    if volume<=1e-9: raise RuntimeError(f'{obj.name}: non-positive signed volume {volume}')
    pts=[v.co for v in mesh.vertices]
    return {'vertices':len(mesh.vertices),'triangles':len(mesh.loop_triangles),'signed_volume':volume,'bounds':[[min(v[i] for v in pts),max(v[i] for v in pts)] for i in range(3)],'edge_use_counts':counts,'finite':True,'min_triangle_area':min_area,'directed_edge_failures':directed_fail,'footprint_area_xy':convex_hull_area_xy(pts)}

def recalc_normals(obj):
    bm=bmesh.new(); bm.from_mesh(obj.data); bmesh.ops.recalc_face_normals(bm,faces=bm.faces); bm.to_mesh(obj.data); bm.free(); obj.data.update()

def log_ground_plane_audit(log_obj, epsilon=1e-6):
    mesh=log_obj.data; mesh.calc_loop_triangles(); selected=[]
    for tri in mesh.loop_triangles:
        pts=[Vector(mesh.vertices[i].co) for i in tri.vertices]
        if all(abs(point.z) <= epsilon for point in pts):
            area=(pts[1]-pts[0]).cross(pts[2]-pts[0]).length*.5
            if area > 1e-10: selected.append((pts,area))
    if not selected: raise RuntimeError('log has no positive-area ground-plane triangles')
    points=[point for tri,_ in selected for point in tri]
    return {'triangle_count':len(selected),'area_m2':sum(area for _,area in selected),'bounds_xy':[[min(point.x for point in points),max(point.x for point in points)],[min(point.y for point in points),max(point.y for point in points)]]}

def vertical_log_surface(log_obj, x, y):
    mesh=log_obj.data; mesh.calc_loop_triangles(); origin=Vector((x,y,3.0)); direction=Vector((0,0,-1)); hits=[]
    for tri in mesh.loop_triangles:
        a,b,c=(Vector(mesh.vertices[i].co) for i in tri.vertices); hit=intersect_ray_tri(a,b,c,direction,origin,True)
        if hit is not None: hits.append(hit.z)
    if not hits: raise RuntimeError(f'no vertical log support at stem base ({x},{y})')
    return max(hits)

def cap_underside_axis_hit(cap_obj, stem_top):
    mesh=cap_obj.data; mesh.calc_loop_triangles(); direction=Vector((0,0,-1)); hits=[]
    for tri in mesh.loop_triangles:
        if mesh.polygons[tri.polygon_index].material_index != 2: continue
        a,b,c=(Vector(mesh.vertices[i].co) for i in tri.vertices); hit=intersect_ray_tri(a,b,c,direction,stem_top,True)
        if hit is not None and hit.z <= stem_top.z+1e-8: hits.append(hit.z)
    if not hits: raise RuntimeError(f'{cap_obj.name}: no local vertical underside hit at stem top center')
    return max(hits)

def contact_audit(log_obj, mushrooms, objects_by_name, translate_z):
    contacts=[]
    for mushroom in mushrooms:
        base=Vector(mushroom['stem'][0]); base.z+=translate_z; surface=vertical_log_surface(log_obj,base.x,base.y)
        stem=objects_by_name[f"stem_{mushroom['id']}"]; cap=objects_by_name[f"cap_{mushroom['id']}"]
        top_center=Vector(mushroom['stem'][-1]); top_center.z+=translate_z
        underside=cap_underside_axis_hit(cap,top_center); log_embed=surface-base.z; cap_embed=top_center.z-underside
        if log_embed < .008 or cap_embed < .012: raise RuntimeError(f"{mushroom['id']}: insufficient actual contact log={log_embed}, cap={cap_embed}")
        contacts.append({'id':mushroom['id'],'log_surface_z':surface,'stem_base_z':base.z,'log_embed_m':log_embed,'stem_top_center_z':top_center.z,'cap_underside_axis_hit_z':underside,'cap_axis_embed_m':cap_embed})
    return contacts

def render_views(out, bounds):
    scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.image_settings.file_format='PNG'; scene.world.color=(.82,.82,.82)
    center=Vector(tuple((axis[0]+axis[1])*.5 for axis in bounds)); directions={'front-near-end':Vector((-1.5,-1,.8)),'opposite-end':Vector((1.5,-1,.75)),'near-side':Vector((0,-1.4,.75)),'far-side':Vector((0,1.4,.75)),'top':Vector((0,0,2.0)),'underside':Vector((0,0,-1.0)),'principal-threequarter':Vector((-1.3,-1,.9))}
    camera=bpy.data.cameras.new('review_camera'); camera.type='ORTHO'; cam=bpy.data.objects.new('review_camera',camera); bpy.context.collection.objects.link(cam); scene.camera=cam
    light_data=bpy.data.lights.new('neutral_key','AREA'); light_data.energy=800; light_data.shape='DISK'; light_data.size=4
    light=bpy.data.objects.new('neutral_key',light_data); bpy.context.collection.objects.link(light); light.location=center+Vector((-2,-3,4))
    corners=[Vector((x,y,z)) for x in bounds[0] for y in bounds[1] for z in bounds[2]]; render_root=Path(out)/'renders'; render_root.mkdir(parents=True,exist_ok=True); framing={}
    for name,direction in directions.items():
        cam.location=center+direction.normalized()*3.0; cam.rotation_euler=((center-cam.location).to_track_quat('-Z','Y')).to_euler(); bpy.context.view_layer.update()
        local=[cam.matrix_world.inverted() @ point for point in corners]; width=max(point.x for point in local)-min(point.x for point in local); height=max(point.y for point in local)-min(point.y for point in local)
        camera.ortho_scale=max(width,height)/.88; margin_x=(camera.ortho_scale-width)/(2*camera.ortho_scale); margin_y=(camera.ortho_scale-height)/(2*camera.ortho_scale)
        if min(margin_x,margin_y) < .05: raise RuntimeError(f'{name}: insufficient orthographic image margin')
        framing[name]={'ortho_scale':camera.ortho_scale,'projected_width':width,'projected_height':height,'margin_x':margin_x,'margin_y':margin_y}
        for size in (512,96,48):
            scene.render.resolution_x=size; scene.render.resolution_y=size; scene.render.resolution_percentage=100; scene.render.filepath=str(render_root/f'{name}-{size}.png'); bpy.ops.render.render(write_still=True)
    (Path(out)/'render-framing.json').write_text(json.dumps(framing,indent=2)+'\n')

def main(out):
    free=available_gib()
    if free < START_FREE_GIB:
        write_terminal(out,'HOLD_INSUFFICIENT_START_RAM',{'available_gib':free,'required_gib':START_FREE_GIB}); raise RuntimeError('insufficient start RAM')
    stop=threading.Event(); start_watchdog(stop,out)
    try:
        p=load_params(); bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
        mats={}
        for name,color in [('wood0',p['materials']['wood'][0]),('wood1',p['materials']['wood'][1]),('wood2',p['materials']['wood'][2]),('endgrain',p['materials']['endgrain']),('recess',p['materials']['recess']),('moss0',p['materials']['moss'][0]),('stem0',p['materials']['stem'][0]),('cap0',p['materials']['cap'][0]),('cap1',p['materials']['cap'][1]),('underside',p['materials']['underside'])]: mats[name]=make_material(name,color)
        grounding=p['log'].get('grounding')
        if not grounding or 'source_z_floor_m' not in grounding or 'whole_asset_translation_z_m' not in grounding: raise RuntimeError('requires reviewed log grounding fields')
        clip_z=float(grounding['source_z_floor_m']); translate_z=float(grounding['whole_asset_translation_z_m'])
        if abs(clip_z+translate_z)>1e-9: raise RuntimeError('grounding translation must exactly cancel source clip height')
        sections=p['log']['sections']; objects=[radial_solid('lantern_log',sections,12,[mats['wood0'],mats['wood1'],mats['wood2'],mats['endgrain'],mats['recess']],p['log']['nearEnd'])]
        for vertex in objects[0].data.vertices: vertex.co.z=max(vertex.co.z,clip_z)
        bark_mats=[mats['wood0'],mats['wood1'],mats['wood2']]
        for i,bearing in enumerate(p['log']['bark']['bearingsDeg']): objects.append(strip_solid(f'bark_{i}',sections,-.74,.73,math.radians(bearing),.1,.008,.018,[bark_mats[i%3]],0))
        for i,c in enumerate(p['log']['moss']['clusters']): objects.append(moss_solid(f'moss_{i}',sections,c,[mats['moss0']]))
        for mushroom in p['mushrooms']:
            objects.append(stem_solid(f"stem_{mushroom['id']}",mushroom['stem'],mushroom['radii'],[mats['stem0']]))
            objects.append(cap_solid(f"cap_{mushroom['id']}",mushroom,p['mushroomMethod']['capRings'],[mats['cap0'],mats['cap1'],mats['underside']]))
        for obj in objects:
            for vertex in obj.data.vertices: vertex.co.z+=translate_z
            obj.data.update(); recalc_normals(obj)
        objects_by_name={o.name:o for o in objects}
        contacts=contact_audit(objects_by_name['lantern_log'],p['mushrooms'],objects_by_name,translate_z)
        ground_plane=log_ground_plane_audit(objects_by_name['lantern_log'])
        receipt={'status':'BUILT_PENDING_VISUAL_REVIEW','parameters_sha256':EXPECTED_HASH,'grounding':{'source_z_floor_m':clip_z,'whole_asset_translation_z_m':translate_z},'ground_plane_log':ground_plane,'components':{o.name:audit(o) for o in objects},'contacts':contacts,'counts':{'log':1,'bark':6,'moss':3,'stems':6,'caps':6}}
        allpts=[v.co for o in objects for v in o.data.vertices]; receipt['complete_bounds']=[[min(v[i] for v in allpts),max(v[i] for v in allpts)] for i in range(3)]; receipt['complete_footprint_area_xy']=convex_hull_area_xy(allpts)
        if receipt['complete_footprint_area_xy']<=1e-9: raise RuntimeError('complete asset has no positive XY footprint')
        Path(out).mkdir(parents=True,exist_ok=True); (Path(out)/'candidate-audit.json').write_text(json.dumps(receipt,indent=2)+'\n')
        bpy.ops.wm.save_as_mainfile(filepath=str(Path(out)/'lantern-log-manual-r3.blend'))
        render_views(out,receipt['complete_bounds']); write_terminal(out,'BUILT_PENDING_VISUAL_REVIEW',{'components':len(objects),'complete_footprint_area_xy':receipt['complete_footprint_area_xy']})
    except (RuntimeError,ValueError,OSError) as exc:
        write_terminal(out,'HOLD_BUILD_AUDIT_OR_RENDER_FAILURE',{'error':str(exc)}); raise
    finally:
        stop.set()
if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--out',default=str(HERE/'candidate-r3'))
    argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:]
    args=parser.parse_args(argv); main(args.out)










