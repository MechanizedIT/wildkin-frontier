"""Parity-only Blender renderer for the reviewed Trailgloam R5 CPU probe.

It imports the checked-in literal arrays; it never constructs, repairs, welds,
recalculates, or exports geometry.  Run only after source review and a released
shared heavy-job slot:
blender --background --factory-startup --python-exit-code 1 --python render_probe.py -- --execute --source-dir <absolute> --output-dir <fresh absolute>
"""
import argparse, ctypes, hashlib, json, math, os, struct, sys, threading, time
from pathlib import Path
import bpy
from mathutils import Vector

MIN_FREE_GIB=8.0; RESERVE_GIB=6.0; SIZES=(512,96,48)
LITERAL_ARRAYS_SHA256='4ec79f19e7561464db39283ceaafe2d793db324646d13ef444adebc69e897e33'
CPU_PROOF_SHA256='dc66272ad1b4b1c6072bcc4524e2b63a19d79751e1da2573a4deb86bafdd2ef0'
VIEWS=(('side',Vector((0,-1,.18))),('three-quarter',Vector((.85,-.85,.45))),('underside',Vector((0,0,-1))))
PALETTE={'host_saucer':(.10,.24,.27,1),'link_0':(.08,.31,.32,1),'link_1':(.08,.31,.32,1),'link_2':(.08,.31,.32,1),'hoof':(.06,.07,.08,1),'cuff_0':(.12,.12,.13,1),'cuff_1':(.12,.12,.13,1),'cuff_2':(.12,.12,.13,1),'frond_collar':(.10,.11,.12,1),'frond_blade':(.82,.38,.05,1)}

def free_gib():
    class S(ctypes.Structure): _fields_=[('length',ctypes.c_ulong),('load',ctypes.c_ulong)]+[(n,ctypes.c_ulonglong) for n in ('total','available','page_total','page_available','virtual_total','virtual_available','extended')]
    s=S();s.length=ctypes.sizeof(s)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(s)): raise RuntimeError('RAM measurement unavailable')
    return s.available/2**30
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1048576),b''): h.update(b)
    return h.hexdigest()
def sub(a,b): return [a[i]-b[i] for i in range(3)]
def dot(a,b): return sum(a[i]*b[i] for i in range(3))
def cross(a,b): return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def mag(a): return math.sqrt(dot(a,a))
def norm(a):
    n=mag(a)
    if n<=1e-12: raise RuntimeError('degenerate triangle normal')
    return [v/n for v in a]
def contains(part,points):
    vertices,faces=part['vertices'],part['faces']; worst=-float('inf')
    for ia,ib,ic in faces:
        a,b,c=vertices[ia],vertices[ib],vertices[ic]; normal=norm(cross(sub(b,a),sub(c,a)))
        for point in points: worst=max(worst,dot(normal,sub(point,a)))
    return worst<=1e-7,worst
def audit_part(part,expected):
    vertices,faces=part['vertices'],part['faces']; edges={}
    if len(vertices)!=expected['vertices'] or len(faces)!=expected['triangles']: raise RuntimeError(f"{part['name']} literal count differs from CPU receipt")
    for face in faces:
        if len(face)!=3 or min(face)<0 or max(face)>=len(vertices): raise RuntimeError(f"{part['name']} invalid triangle")
        a,b,c=[vertices[i] for i in face]
        if not all(math.isfinite(v) for point in (a,b,c) for v in point) or mag(cross(sub(b,a),sub(c,a)))<=1e-7: raise RuntimeError(f"{part['name']} nonfinite/degenerate face")
        for x,y in ((face[0],face[1]),(face[1],face[2]),(face[2],face[0])): edges[tuple(sorted((x,y)))]=edges.get(tuple(sorted((x,y))),0)+1
    actual={'boundary_edges':sum(v==1 for v in edges.values()),'nonmanifold_edges':sum(v>2 for v in edges.values())}
    if actual['boundary_edges']!=expected['boundary_edges'] or actual['nonmanifold_edges']!=expected['nonmanifold_edges']: raise RuntimeError(f"{part['name']} topology parity failed")
    bounds={'min':[min(v[i] for v in vertices) for i in range(3)],'max':[max(v[i] for v in vertices) for i in range(3)]}
    bounds['extent']=[bounds['max'][i]-bounds['min'][i] for i in range(3)]
    for key in ('min','max','extent'):
        if len(expected['bounds'][key]) != 3 or any(abs(bounds[key][i]-expected['bounds'][key][i])>1e-9 for i in range(3)):
            raise RuntimeError(f"{part['name']} literal bounds differ from frozen CPU proof")
    actual['bounds']=bounds
    return actual
def mesh_object(part):
    mesh=bpy.data.meshes.new(part['name']+'_literal');mesh.from_pydata(part['vertices'],[],part['faces']);mesh.update(calc_edges=False)
    if len(mesh.vertices)!=len(part['vertices']) or len(mesh.polygons)!=len(part['faces']) or any(len(p.vertices)!=3 for p in mesh.polygons): raise RuntimeError(part['name']+' Blender polygon parity failed')
    # Blender stores positions as float32.  Compare the actual mesh readback to
    # the literal input after the same IEEE-754 float32 rounding, before render.
    rounded=lambda value:struct.unpack('<f',struct.pack('<f',value))[0]
    for vertex_index,(literal,vertex) in enumerate(zip(part['vertices'],mesh.vertices)):
        actual=tuple(vertex.co)
        expected=tuple(rounded(value) for value in literal)
        if any(struct.pack('<f',actual[axis])!=struct.pack('<f',expected[axis]) for axis in range(3)):
            raise RuntimeError(f"{part['name']} Blender XYZ readback differs at vertex {vertex_index}")
    loops=[v for face in part['faces'] for v in face]; imported=[loop.vertex_index for loop in mesh.loops]
    if loops!=imported: raise RuntimeError(part['name']+' Blender loop-triangle order differs from literal arrays')
    mesh.calc_loop_triangles()
    if len(mesh.loop_triangles)!=len(part['faces']): raise RuntimeError(part['name']+' loop triangle count differs')
    obj=bpy.data.objects.new(part['name'],mesh);bpy.context.collection.objects.link(obj)
    material=bpy.data.materials.new(part['name']+'_display');material.diffuse_color=PALETTE[part['name']];obj.data.materials.append(material)
    return obj,{'vertices':len(mesh.vertices),'triangles':len(mesh.loop_triangles),'xyz_float32_readback':True,'index_loop_order':True}
def args():
    values=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    p=argparse.ArgumentParser();p.add_argument('--execute',action='store_true');p.add_argument('--source-dir',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);return p.parse_args(values)
def main():
    a=args()
    if not a.execute: raise RuntimeError('Refusing render without explicit --execute')
    source=a.source_dir.resolve();out=a.output_dir.resolve()
    if not a.source_dir.is_absolute() or not a.output_dir.is_absolute() or not source.is_dir() or out.exists(): raise RuntimeError('source-dir must exist absolute and output-dir must be fresh absolute')
    if free_gib()<MIN_FREE_GIB: raise RuntimeError('requires 8GiB free before Blender import')
    paths={n:source/n for n in ('parameters.json','literal-mesh-arrays.json','cpu-proof.json')}
    if not all(p.is_file() for p in paths.values()): raise RuntimeError('missing frozen CPU inputs')
    if sha(paths['literal-mesh-arrays.json']) != LITERAL_ARRAYS_SHA256: raise RuntimeError('literal arrays SHA differs from independently reviewed input')
    if sha(paths['cpu-proof.json']) != CPU_PROOF_SHA256: raise RuntimeError('CPU proof SHA differs from independently reviewed input')
    params=json.loads(paths['parameters.json'].read_text(encoding='utf8'));arrays=json.loads(paths['literal-mesh-arrays.json'].read_text(encoding='utf8'));proof=json.loads(paths['cpu-proof.json'].read_text(encoding='utf8'))
    if proof.get('parameters_sha256')!=sha(paths['parameters.json']) or arrays.get('parameters_sha256')!=proof.get('parameters_sha256'): raise RuntimeError('frozen parameter hash mismatch')
    by={p['name']:p for p in arrays['parts']}
    if set(by)!=set(proof['parts']) or len(by)!=10: raise RuntimeError('literal part inventory differs from CPU proof')
    parity={name:audit_part(by[name],proof['parts'][name]) for name in sorted(by)}
    contacts={
      'coxa_rootcap_inside_actual_convex_host':('host_saucer',by['link_0']['vertices'][:6]),
      'collar_base_inside_actual_convex_host':('host_saucer',by['frond_collar']['vertices'][:6]),
      'cuff_0_contains_link_endrings':('cuff_0',by['link_0']['vertices'][6:]+by['link_1']['vertices'][:6]),
      'cuff_1_contains_link_endrings':('cuff_1',by['link_1']['vertices'][6:]+by['link_2']['vertices'][:6]),
      'cuff_2_contains_final_link_endring':('cuff_2',by['link_2']['vertices'][6:]),
      'blade_root_inside_collar':('frond_collar',by['frond_blade']['vertices'][:4]),
      'cuff_2_complete_lower_cap_ring_inside_hoof':('hoof',by['cuff_2']['vertices'][6:])}
    parity_contacts={}
    for key,(host,points) in contacts.items():
        ok,worst=contains(by[host],points);expected=proof['contacts'][key]
        if ok!=expected['contained'] or abs(worst-expected['max_outward_plane_distance'])>1e-6: raise RuntimeError(key+' CPU contact parity failed')
        parity_contacts[key]={'contained':ok,'max_outward_plane_distance':worst,'points':len(points)}
    out.mkdir(parents=True);stop=threading.Event();samples=[]
    def watchdog():
        while not stop.is_set():
            available=free_gib();samples.append(available)
            if available<RESERVE_GIB:
                (out/'reserve-breach.json').write_text(json.dumps({'free_gib':available,'reserve_gib':RESERVE_GIB,'pid':os.getpid()},indent=2)+'\n',encoding='utf8');os._exit(77)
            stop.wait(.5)
    threading.Thread(target=watchdog,daemon=True).start();started=time.monotonic()
    try:
        bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
        objects=[];blender_parity={}
        for name in sorted(by):
            obj,blender_parity[name]=mesh_object(by[name]);objects.append(obj)
        mins=[min(v[i] for part in by.values() for v in part['vertices']) for i in range(3)];maxs=[max(v[i] for part in by.values() for v in part['vertices']) for i in range(3)];target=Vector([(mins[i]+maxs[i])/2 for i in range(3)]);largest=max(maxs[i]-mins[i] for i in range(3))
        bpy.context.scene.render.engine='BLENDER_WORKBENCH';bpy.context.scene.display.shading.light='STUDIO';bpy.context.scene.display.shading.color_type='MATERIAL';bpy.context.scene.display.shading.show_shadows=True
        cam_data=bpy.data.cameras.new('ProbeCamera');camera=bpy.data.objects.new('ProbeCamera',cam_data);bpy.context.collection.objects.link(camera);bpy.context.scene.camera=camera
        rendered=[];radius=largest*2.8
        for size in SIZES:
            bpy.context.scene.render.resolution_x=size;bpy.context.scene.render.resolution_y=size;bpy.context.scene.render.resolution_percentage=100
            for label,direction in VIEWS:
                camera.location=target+direction.normalized()*radius;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();dest=out/f'{label}-{size}.png';bpy.context.scene.render.filepath=str(dest);bpy.ops.render.render(write_still=True)
                if not dest.is_file() or dest.stat().st_size==0: raise RuntimeError('missing render '+str(dest))
                rendered.append(dest.name)
        bpy.ops.wm.save_as_mainfile(filepath=str((out/'method-probe-r5.blend').resolve()))
        receipt={'status':'literal-array Trailgloam R5 probe render; not a model candidate','source_hashes':{name:sha(path) for name,path in paths.items()},'parameters_schema':params.get('schema'),'topology_parity':parity,'cpu_array_contact_parity':parity_contacts,'blender_mesh_parity':blender_parity,'contact_evidence_scope':'CPU-array contacts; Blender proves XYZ float32 and index/loop-triangle parity only, not contact remeasurement','renders':rendered,'render_sizes':list(SIZES),'render_views':[v[0] for v in VIEWS],'bounds':{'min':mins,'max':maxs},'min_sampled_free_gib':min(samples) if samples else free_gib(),'elapsed_seconds':time.monotonic()-started}
        (out/'render-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf8');print(json.dumps(receipt),flush=True)
    finally: stop.set()
if __name__=='__main__': main()
