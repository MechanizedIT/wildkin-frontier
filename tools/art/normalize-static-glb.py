"""Normalize one textured static-prop GLB for Three.js (Y-up, Z-forward).

This is for optimized unrigged props only. It never changes UVs or rebakes
the sole Base Color PNG; a fresh output directory is required. Raw TRELLIS
exports must first pass through the texture-aware optimizer to remove PBR maps.
"""
from __future__ import annotations
import argparse, hashlib, json, math, struct, subprocess, sys
from pathlib import Path

BLENDER = Path("C:/Program Files/Blender Foundation/Blender 4.5/blender.exe")
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def worker(source, output, texture, height, yaw):
 import bpy
 from mathutils import Matrix, Vector
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False); bpy.ops.import_scene.gltf(filepath=str(source))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 if len(meshes)!=1 or any(o.type=='ARMATURE' for o in bpy.context.scene.objects): raise RuntimeError('Static normalizer needs one unrigged mesh')
 mat=meshes[0].active_material; bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'); link=bs.inputs['Base Color'].links[0].from_node
 if not link.image.packed_file: raise RuntimeError('Base Color is not packed')
 texture.write_bytes(bytes(link.image.packed_file.data))
 pts=[o.matrix_world @ v.co for o in meshes for v in o.data.vertices]; lo=min(p.z for p in pts); hi=max(p.z for p in pts)
 if hi<=lo: raise RuntimeError('Static prop has zero height')
 scale=height/(hi-lo)
 center=Vector(((min(p.x for p in pts)+max(p.x for p in pts))/2,(min(p.y for p in pts)+max(p.y for p in pts))/2,lo))
 rotation=Matrix.Rotation(math.radians(yaw),3,'Z')
 # Bake the complete world transform before grounding. Scaling object.location
 # alone fails when imported meshes have parents or existing rotations.
 obj=meshes[0]
 for vertex, point in zip(obj.data.vertices,pts): vertex.co=rotation @ ((point-center)*scale)
 obj.parent=None; obj.matrix_world=Matrix.Identity(4)
 for name,value in (('Metallic',0),('Roughness',.9),('Specular IOR Level',0),('Coat Weight',0)):
  socket=bs.inputs.get(name)
  if socket:
   for connection in list(socket.links): mat.node_tree.links.remove(connection)
   socket.default_value=value
 mat.metallic=0; mat.roughness=.9
 bpy.ops.object.select_all(action='DESELECT'); [o.select_set(True) for o in meshes]; bpy.context.view_layer.objects.active=meshes[0]
 bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_materials='EXPORT',export_texcoords=True,export_normals=True)
 for o in meshes:o.data.calc_loop_triangles()
 print(json.dumps({'source_bounds_blender_z':[lo,hi],'height':height,'yaw_degrees':yaw,'preexport_triangles':sum(len(o.data.loop_triangles) for o in meshes)}))
def main():
 if '--worker' in sys.argv:
  values=sys.argv[sys.argv.index('--worker')+1:]
  if len(values)!=5: raise SystemExit('worker expects source, output, texture, height, yaw')
  worker(Path(values[0]),Path(values[1]),Path(values[2]),float(values[3]),float(values[4]));return
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--input',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);p.add_argument('--height',type=float,required=True);p.add_argument('--yaw-degrees',type=float,default=0);p.add_argument('--name',default='static-prop');p.add_argument('--worker',action='store_true');p.add_argument('paths',nargs='*');a=p.parse_args()
 if a.worker: worker(Path(a.paths[0]),Path(a.paths[1]),Path(a.paths[2]),float(a.paths[3]),float(a.paths[4]));return
 src=a.input.resolve();out=a.output_dir.resolve()
 if not src.is_file() or src.suffix.lower()!='.glb' or not math.isfinite(a.height) or a.height<=0 or not math.isfinite(a.yaw_degrees): raise ValueError('Need an existing GLB, positive finite height and finite yaw')
 if out.exists():raise ValueError('Use a new output directory')
 import importlib.util
 check_spec=importlib.util.spec_from_file_location('game_glb_check',Path(__file__).with_name('check-game-glb.py')); checker=importlib.util.module_from_spec(check_spec); check_spec.loader.exec_module(checker)
 document,_=checker.parse_glb(src.read_bytes())
 if document.get('skins') or document.get('animations') or len(document.get('images',[]))!=1: raise ValueError('Use an optimized unrigged prop with exactly one packed Base Color PNG')
 out.mkdir(parents=True); name=''.join(c if c.isalnum() or c in '_-' else '-' for c in a.name).strip('-') or 'static-prop'; glb=out/f'{name}.glb'; tex=out/'base-color-source.png'
 cmd=[str(BLENDER),'--background','--python',str(Path(__file__).resolve()),'--','--worker',str(src),str(glb),str(tex),str(a.height),str(a.yaw_degrees)]
 done=subprocess.run(cmd,check=True,text=True,capture_output=True); facts=next(json.loads(x) for x in reversed(done.stdout.splitlines()) if x.startswith('{'))
 # Reuse the texture-blob repair used by the textured optimizer: Blender's
 # exporter otherwise re-encodes an unchanged PNG.
 import importlib.util
 spec=importlib.util.spec_from_file_location('textured_optimizer',Path(__file__).with_name('optimize-textured-glb.py')); optimizer=importlib.util.module_from_spec(spec); spec.loader.exec_module(optimizer); optimizer.restore_exact_embedded_base_color(glb,tex)
 facts.update(optimizer.final_glb_facts(BLENDER,glb))
 (out/'manifest.json').write_text(json.dumps({'tool':'normalize-static-glb.py','source_glb':str(src),'source_sha256':digest(src),'output_glb':str(glb),'output_sha256':digest(glb),'base_color_png_sha256':digest(tex),'target_coordinate_system':'Y-up, Z-forward (glTF export)','target_height':a.height,'yaw_degrees':a.yaw_degrees,'normalization':'min vertical bound placed at Y=0 via Blender Z before glTF axis conversion','facts':facts},indent=2))
if __name__=='__main__':main()
