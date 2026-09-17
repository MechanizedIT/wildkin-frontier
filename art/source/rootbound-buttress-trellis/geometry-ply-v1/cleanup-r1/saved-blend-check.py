import bpy,json,hashlib
from collections import Counter
from array import array
from pathlib import Path
root=Path('C:/Users/cwood/Documents/mobile-rpg')
folder=root/'art/source/rootbound-buttress-trellis/geometry-ply-v1/cleanup-r1'
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert len(meshes)==1, 'Expected derivative only'
o=meshes[0];m=o.data;m.calc_loop_triangles()
assert len(m.loop_triangles)==154468
parent=array('i',range(len(m.vertices)))
def find(x):
 while parent[x]!=x:
  parent[x]=parent[parent[x]];x=parent[x]
 return x
for e in m.edges:
 a,b=map(find,e.vertices);parent[b]=a
components=len(set(find(i) for i in range(len(m.vertices))))
ply=root/'art/source/rootbound-buttress-trellis/geometry-ply-v1/raw-geometry.ply'
h=hashlib.sha256(ply.read_bytes()).hexdigest()
assert h=='3005ad1a1f3039a946db633b323ace8bc73856e91f38bfef4fc1faaf59ce223c'
component_vertices=Counter(find(i) for i in range(len(m.vertices)))
component_faces=Counter(find(p.vertices[0]) for p in m.polygons)
component_summary=[{'vertices':v,'faces':component_faces[k]} for k,v in component_vertices.items()]
component_summary.sort(key=lambda x:x['faces'],reverse=True)
r={'check':'reopened saved Blender file; read-only','mesh_objects':len(meshes),'mesh_name':o.name,'vertices':len(m.vertices),'triangles':len(m.loop_triangles),'connected_vertex_components':components,'components':component_summary,'status':'HOLD: derivative connectivity changed' if components!=1 else 'PASS: derivative connectivity retained','raw_master_sha256_unchanged':h,'blend_sha256':hashlib.sha256((folder/'cleanup-r1.blend').read_bytes()).hexdigest(),'blend_bytes':(folder/'cleanup-r1.blend').stat().st_size,'not_checked':['manifold/winding certification','surface self-intersections','runtime collision or rendering']}
(folder/'saved-blend-check.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps(r))
