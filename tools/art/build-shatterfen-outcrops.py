"""Two bounded, closed slate bank outcrops. Blender 4.5, CPU four threads.
Explicit broad-face topology; no remesh, displacement, subdivision or generation.
Blender X right/-Y front/Z up; glTF Y up/+Z front. Dimensions are full extents.
"""
import argparse, hashlib, json, math, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Vector

p=argparse.ArgumentParser();p.add_argument('--output-dir',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output_dir).resolve()
if out.exists(): raise RuntimeError('Preserve revisions: output directory already exists')
out.mkdir(parents=True);bpy.ops.wm.read_factory_settings(use_empty=True)
COLORS=[(66,82,88),(73,90,97),(81,98,105),(90,106,111),
 (99,113,116),(70,84,91),(83,96,101),(107,119,122),
 (80,96,63),(91,104,68),(99,110,71),(78,93,63),
 (84,98,102),(76,89,96),(92,104,110),(100,112,115)]
im=bpy.data.images.new('SlatePalette256',width=256,height=256,alpha=False)
pixels=[]
for y in range(256):
 for x in range(256): pixels.extend([v/255 for v in COLORS[(y//64)*4+x//64]]+[1])
im.pixels.foreach_set(pixels);im.filepath_raw=str(out/'palette.png');im.file_format='PNG';im.save();im.pack()
mat=bpy.data.materials.new('Matte slate and restrained moss');mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=1
bs.inputs['Metallic'].default_value=0;bs.inputs['Specular IOR Level'].default_value=0
t=mat.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;t.interpolation='Closest'
mat.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color'])

def make_rock(name,w,d,h,variant):
 # Explicit anatomical-style landmarks for geological mass, not outline rings:
 # buried polygon, projecting low knee, broad oblique side breaks and offset crown.
 # A single convex shell has no hidden saddle chord or overlapping fake ledges.
 points=([
  (-.40,-.50,0),(.32,-.50,0),(.50,-.29,0),(.50,.22,0),(.28,.50,0),(-.32,.50,0),(-.50,.29,0),(-.50,-.30,0),
  (-.43,-.35,.34),(.35,-.39,.27),(.45,-.13,.39),(.42,.27,.50),(-.43,.30,.50),
  (-.29,-.23,.76),(.22,-.27,.47),(.32,.07,.65),(.12,.31,.84),
  (-.27,.30,1),(-.37,.14,.89),(-.12,.11,.94),(.02,-.08,.72)] if variant==0 else [
  (-.33,-.50,0),(.32,-.50,0),(.50,-.23,0),(.50,.19,0),(.30,.50,0),(-.29,.50,0),(-.50,.20,0),(-.50,-.23,0),
  (-.37,-.33,.40),(.37,-.33,.48),(.44,.12,.50),(-.42,.13,.44),(-.23,.42,.39),
  (-.27,-.14,.77),(.22,-.23,.80),(.29,.10,.93),(.12,.23,1),(-.17,.24,.86),
  (-.34,.03,.68),(.02,-.13,.86)])
 verts=[(x*w,y*d,z*h) for x,y,z in points]
 me=bpy.data.meshes.new(name)
 ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);me.materials.append(mat)
 bm=bmesh.new()
 for v in verts:bm.verts.new(v)
 result=bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False)
 unused=[v for v in bm.verts if not v.link_faces]
 if unused:bmesh.ops.delete(bm,geom=unused,context='VERTS')
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 bmesh.ops.triangulate(bm,faces=list(bm.faces),quad_method='BEAUTY',ngon_method='BEAUTY')
 bm.verts.index_update()
 hull_points=[[round(v.co.x,6),round(v.co.z,6),round(-v.co.y,6)] for v in bm.verts]
 hull_faces=[[v.index for v in f.verts] for f in bm.faces]
 layer=bm.faces.layers.int.new('tone')
 for f in bm.faces:
  # Color follows broad exposure, never random alternating triangle stripes.
  f[layer]=4 if f.normal.z>.78 else 3 if f.normal.z>.40 else 2 if f.normal.x>.15 else 1
 # Bounded LINEAR tessellation of the existing triangles for palette patches.
 # No smoothing or subdivision modifier: the 36-face physical hull is unchanged.
 # This avoids an annulus triangulation's coplanar self-overlap entirely.
 hull_area=sum(f.calc_area() for f in bm.faces)
 patch_center=Vector((-.30*w,.23*d,.78*h))
 bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=2,use_grid_fill=True)
 bmesh.ops.triangulate(bm,faces=list(bm.faces),quad_method='BEAUTY',ngon_method='BEAUTY')
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 for f in bm.faces:
  q=f.calc_center_median()
  f[layer]=4 if f.normal.z>.78 else 3 if f.normal.z>.40 else 2 if f.normal.x>.15 else 1
  # One subdued growth patch crosses a real upper shoulder edge.
  # No scattered triangles or contrasty moss stickers on the broad front face.
  if f.normal.z>.12 and q.z>h*.52 and ((q.x-patch_center.x)/(w*.23))**2+((q.y-patch_center.y)/(d*.21))**2<1:
   f[layer]=8 if f.normal.z<.6 else 9
 visual_area=sum(f.calc_area() for f in bm.faces)
 if abs(visual_area-hull_area)>.0001:raise RuntimeError('Palette tessellation changed hull surface area')
 bad=sum(not e.is_manifold for e in bm.edges)
 if bad:raise RuntimeError(f'{name}: {bad} non-manifold edges')
 tone_values=[f[layer] for f in bm.faces];volume=bm.calc_volume(signed=True)
 bm.to_mesh(me);bm.free();uv=me.uv_layers.new(name='Palette')
 for poly,tone in zip(me.polygons,tone_values):
  poly.use_smooth=False
  for k in poly.loop_indices:uv.data[k].uv=((tone%4+.5)/4,(tone//4+.5)/4)
 ob['purpose']='Non-harvestable steep bank outcrop';ob['collisionRequirement']='Use the emitted single exact convex hull; V1 box fit explicitly rejected'
 return ob,{'dimensionsGLTF':[w,h,d],'closedVolumeM3':volume,'nonManifoldEdges':bad,'hullAreaM2':hull_area,'visualAreaM2':visual_area,
 'triangles':sum(len(f.vertices)-2 for f in me.polygons),'vertices':len(me.vertices),
 'recommendedBox':{'size':{'x':w,'y':h,'z':d},'offset':{'x':0,'y':h/2,'z':0}},
 'collisionHullPointsGLTF':hull_points,'collisionHullFaces':hull_faces,'collisionHullPointCount':len(hull_points),
 'boxStatus':'Bounds only, not an acceptable shape collider for this stronger V2 silhouette',
 'baseY':0,'burial':'Integrator samples minimum terrain across footprint and buries the complete base slightly below it.'}

specs=[('fen-bank-outcrop-left-v1',3.3,2.8,.85),('fen-bank-outcrop-right-v1',2.6,2.5,1.6)]
records=[]
for n,(name,w,d,h) in enumerate(specs):
 ob,rec=make_rock(name,w,d,h,n);records.append((ob,rec))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'outcrops-editable.blend'))
for (name,*_), (ob,rec) in zip(specs,records):
 bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
 path=out/f'{name}.glb'
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_extras=True)
 rec.update({'name':name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'materialCount':1,'textureSize':256,'meshes':1})
 collider={'shape':'convexHull','vertices':[n for v in rec['collisionHullPointsGLTF'] for n in v],
           'indices':[i for f in rec['collisionHullFaces'] for i in f],'offset':{'x':0,'y':0,'z':0}}
 (out/f'{name}-collider.json').write_text(json.dumps(collider,indent=2))
manifest={'referenceSHA256':'2743ce18201b2c9b3129947211ac4758b6fe5c90f4861db7a676ce660303b882',
 'review':'PENDING independent exact-export model review and native collision/composition',
 'productionInterpretation':'Two component meshes (lowledge and highshoulder), each closed convex, form two unequal overlapping TWO-PROP assemblies. Each prop uses its exact local convex hull. One subdued edge-following moss patch per component. Parent-approved assembly admission unit; standalone V4 was HOLD6.5. No resource/terrain/runtime changes.',
 'totalTriangles':sum(r['triangles'] for _,r in records),'assets':[r for _,r in records],
 'assemblies':{
 'left':[{'asset':specs[0][0],'position':[.35,0,.60],'scale':1},{'asset':specs[1][0],'position':[-.65,0,-.50],'scale':1}],
 'right':[{'asset':specs[1][0],'position':[.35,0,-.10],'scale':1.25},{'asset':specs[0][0],'position':[-1,0,.55],'scale':.72}]}}
manifest['fourPlacedPropsTriangles']=manifest['totalTriangles']*2
if manifest['fourPlacedPropsTriangles']>1500:raise RuntimeError('Budget exceeded')
(out/'manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest),flush=True)

def review_scene():
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=20
 scene.render.threads_mode='FIXED';scene.render.threads=4;scene.render.resolution_x=scene.render.resolution_y=512;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('Review environment');scene.world.color=(.38,.40,.42)
 scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
 floor=bpy.data.materials.new('Review ground');floor.diffuse_color=(.24,.31,.27,1)
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));bpy.context.object.data.materials.append(floor)
 for pos,power,size in [((3,-4,7),650,6),((-4,2,5),270,5)]:
  bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=size
  o.rotation_euler=(Vector((0,0,.5))-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=6.1
 return scene,cam
for name,parts in manifest['assemblies'].items():
 bpy.ops.wm.read_factory_settings(use_empty=True)
 for part in parts:
  previous=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(out/(part['asset']+'.glb')))
  for ob in [o for o in bpy.data.objects if o not in previous and o.parent is None]:
   x,y,z=part['position'];ob.location=(x,-z,y);ob.scale=(part['scale'],)*3
 scene,cam=review_scene()
 for label,pos in [('front',(0,-8,4)),('three-quarter',(6,-8,5)),('rear',(-6,8,5))]:
  cam.location=pos;cam.rotation_euler=(Vector((0,0,.7))-cam.location).to_track_quat('-Z','Y').to_euler()
  scene.render.filepath=str(out/f'{name}-{label}.png');bpy.ops.render.render(write_still=True)
 # Actual current Explorer scaled from measured imported bound to 1.6m.
 previous=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(Path.cwd()/'assets/models/explorer-v2/model.glb'))
 imported=[o for o in bpy.data.objects if o not in previous]
 for ob in imported:
  if ob.animation_data:ob.animation_data_clear()
 bpy.context.view_layer.update()
 deps=bpy.context.evaluated_depsgraph_get();points=[]
 for ob in imported:
  if ob.type!='MESH' or not any(mod.type=='ARMATURE' for mod in ob.modifiers):continue
  evaluated=ob.evaluated_get(deps);mesh=evaluated.to_mesh()
  points.extend([evaluated.matrix_world@v.co for v in mesh.vertices]);evaluated.to_mesh_clear()
 z0=min(v.z for v in points);z1=max(v.z for v in points);scale=1.6/(z1-z0)
 holder=bpy.data.objects.new('Actual Explorer 1.6m scale',None);bpy.context.collection.objects.link(holder)
 for ob in imported:
  if ob.parent is None:ob.parent=holder
 holder.scale=(scale,)*3;holder.location=(-2.7,-1.9,-z0*scale)
 bpy.context.view_layer.update()
 print(json.dumps({'scaleStudy':name,'evaluatedSourceZ':[z0,z1],'scale':scale,'intendedExplorerHeight':1.6}),flush=True)
 cam.data.ortho_scale=7.2;cam.location=(6,-10,5.1);cam.rotation_euler=(Vector((-.45,0,.75))-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(out/f'{name}-explorer-scale.png');bpy.ops.render.render(write_still=True)
print('Outcrop exact-GLB CPU renders finished',flush=True)
