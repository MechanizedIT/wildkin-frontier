"""CPU-only literal-solid feasibility proof for the Trailgloam R5 method probe."""
import argparse
import hashlib
import json
import math
from pathlib import Path

EPS = 1e-7

def add(a, b): return [a[i] + b[i] for i in range(3)]
def sub(a, b): return [a[i] - b[i] for i in range(3)]
def mul(a, s): return [a[i] * s for i in range(3)]
def dot(a, b): return sum(a[i] * b[i] for i in range(3))
def cross(a, b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
def length(a): return math.sqrt(dot(a, a))
def unit(a):
    n = length(a)
    if n <= EPS: raise ValueError("zero direction")
    return mul(a, 1 / n)

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def mean(vertices): return [sum(v[i] for v in vertices)/len(vertices) for i in range(3)]

def orient(vertices, faces, center=None):
    center = center or mean(vertices); out = []
    for face in faces:
        a,b,c = [vertices[i] for i in face]
        normal = cross(sub(b,a), sub(c,a))
        centroid = mul(add(add(a,b),c), 1/3)
        out.append(face if dot(normal, sub(centroid, center)) > 0 else [face[0], face[2], face[1]])
    return out

def ring_loft(rings, sides, name):
    vertices=[]
    for z, rx, ry in rings:
        for i in range(sides):
            angle=2*math.pi*i/sides
            vertices.append([rx*math.cos(angle), ry*math.sin(angle), z])
    faces=[]
    for j in range(len(rings)-1):
        for i in range(sides):
            a=j*sides+i; b=j*sides+(i+1)%sides; c=(j+1)*sides+(i+1)%sides; d=(j+1)*sides+i
            faces += [[a,b,c],[a,c,d]]
    faces += [[0,i,(i+1)%sides] for i in range(1,sides-1)]
    top=(len(rings)-1)*sides
    faces += [[top,top+(i+1)%sides,top+i] for i in range(1,sides-1)]
    return {"name":name,"vertices":vertices,"faces":orient(vertices,faces)}

def convex_ring_host(rings, sides, name):
    """Use the supplied ring vertices as a finite convex-hull point set.

    The individual non-planar ring quads are not assumed to be hull facets.
    This avoids a diagonal across a warped quad falsely making the host concave.
    """
    source=[]
    for z,rx,ry in rings:
        for i in range(sides):
            angle=2*math.pi*i/sides; source.append([rx*math.cos(angle),ry*math.sin(angle),z])
    center=mean(source); face_set=set(); faces=[]
    for i in range(len(source)-2):
        for j in range(i+1,len(source)-1):
            for k in range(j+1,len(source)):
                normal=cross(sub(source[j],source[i]),sub(source[k],source[i])); n=length(normal)
                if n <= EPS or abs(normal[2])/n > .999999: continue
                values=[dot(normal,sub(point,source[i])) for point in source]
                if max(values) > EPS and min(values) < -EPS: continue
                face=(i,j,k) if dot(normal,sub(mean([source[i],source[j],source[k]]),center)) > 0 else (i,k,j)
                face_set.add(face)
    # Horizontal support planes are explicit polygon caps, not every coplanar triple.
    for z,reverse in ((min(p[2] for p in source),False),(max(p[2] for p in source),True)):
        ids=[i for i,p in enumerate(source) if abs(p[2]-z) <= EPS]
        for i in range(1,len(ids)-1): face_set.add((ids[0],ids[i+1],ids[i]) if reverse else (ids[0],ids[i],ids[i+1]))
    used=sorted({index for face in face_set for index in face}); remap={old:new for new,old in enumerate(used)}
    vertices=[source[i] for i in used]; faces=[list(map(remap.get,face)) for face in sorted(face_set)]
    return {"name":name,"vertices":vertices,"faces":orient(vertices,faces)}

def frame(axis):
    axis=unit(axis); helper=[0,0,1] if abs(axis[2]) < .9 else [0,1,0]
    u=unit(cross(axis,helper)); v=unit(cross(axis,u)); return axis,u,v

def prism(start, end, r0, r1, sides, name):
    axis,u,v=frame(sub(end,start)); vertices=[]
    for point,radius in ((start,r0),(end,r1)):
        for i in range(sides):
            angle=2*math.pi*i/sides
            vertices.append(add(point,add(mul(u,math.cos(angle)*radius),mul(v,math.sin(angle)*radius))))
    faces=[]
    for i in range(sides):
        a=i;b=(i+1)%sides;c=sides+(i+1)%sides;d=sides+i;faces += [[a,b,c],[a,c,d]]
    faces += [[0,i,(i+1)%sides] for i in range(1,sides-1)]
    faces += [[sides,sides+(i+1)%sides,sides+i] for i in range(1,sides-1)]
    return {"name":name,"vertices":vertices,"faces":orient(vertices,faces),"rings":{"start":vertices[:sides],"end":vertices[sides:]},"axis":axis}

def wedge(cfg, name):
    xs=[cfg['x_min'],cfg['x_max']]; ys=[cfg['y_min'],cfg['y_max']]
    bottom=[[x,y,cfg['sole_z']] for x in xs for y in ys]
    top=[]
    for x in xs:
        z=cfg['rear_top_z'] if x==xs[0] else cfg['front_top_z']
        for y in ys: top.append([x,y,z])
    vertices=bottom+top
    faces=[[0,1,3],[0,3,2],[4,7,5],[4,6,7],[0,4,5],[0,5,1],[1,5,7],[1,7,3],[3,7,6],[3,6,2],[2,6,4],[2,4,0]]
    return {"name":name,"vertices":vertices,"faces":orient(vertices,faces)}

def diamond_loft(centers, widths, thicknesses, name):
    vertices=[]
    for index,point in enumerate(centers):
        before=centers[max(0,index-1)]; after=centers[min(len(centers)-1,index+1)]
        tangent=unit(sub(after,before)); _, lateral, depth=frame(tangent)
        vertices += [add(point,mul(lateral,widths[index]/2)), add(point,mul(depth,thicknesses[index]/2)), add(point,mul(lateral,-widths[index]/2)), add(point,mul(depth,-thicknesses[index]/2))]
    faces=[]; sides=4
    for j in range(len(centers)-1):
        for i in range(sides):
            a=j*sides+i;b=j*sides+(i+1)%sides;c=(j+1)*sides+(i+1)%sides;d=(j+1)*sides+i;faces += [[a,b,c],[a,c,d]]
    faces += [[0,1,2],[0,2,3]]; top=(len(centers)-1)*4; faces += [[top,top+2,top+1],[top,top+3,top+2]]
    return {"name":name,"vertices":vertices,"faces":orient(vertices,faces),"root_ring":vertices[:4]}

def audit(mesh):
    vertices,faces=mesh['vertices'],mesh['faces']; edges={}; min_dot=float('inf'); degenerate=0
    center=mean(vertices)
    for a,b,c in faces:
        normal=cross(sub(vertices[b],vertices[a]),sub(vertices[c],vertices[a])); area2=length(normal)
        if area2 <= EPS: degenerate += 1
        centroid=mul(add(add(vertices[a],vertices[b]),vertices[c]),1/3)
        min_dot=min(min_dot,dot(normal,sub(centroid,center)))
        for x,y in ((a,b),(b,c),(c,a)):
            key=tuple(sorted((x,y)));edges[key]=edges.get(key,0)+1
    mins=[min(v[i] for v in vertices) for i in range(3)]; maxs=[max(v[i] for v in vertices) for i in range(3)]
    return {"vertices":len(vertices),"triangles":len(faces),"boundary_edges":sum(n==1 for n in edges.values()),"nonmanifold_edges":sum(n>2 for n in edges.values()),"degenerate_faces":degenerate,"outward_centroid_dot_min":min_dot,"finite":all(math.isfinite(value) for vertex in vertices for value in vertex),"bounds":{"min":mins,"max":maxs,"extent":sub(maxs,mins)}}

def halfspaces(mesh):
    planes=[]
    for face in mesh['faces']:
        a,b,c=[mesh['vertices'][i] for i in face]; planes.append((a,unit(cross(sub(b,a),sub(c,a)))))
    return planes

def contains(mesh, points):
    planes=halfspaces(mesh); worst=max((dot(normal,sub(point,a)) for point in points for a,normal in planes),default=0)
    return {"contained":worst <= EPS,"max_outward_plane_distance":worst,"point_count":len(points)}

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--params',type=Path,default=Path(__file__).with_name('parameters.json')); parser.add_argument('--out-dir',type=Path,default=Path(__file__).parent); args=parser.parse_args()
    params=json.loads(args.params.read_text(encoding='utf8')); host=convex_ring_host(params['host']['rings_z_rx_ry'],params['host']['sides'],'host_saucer')
    anchors=params['chain']['anchors']; radii=params['chain']['link_radii']; parts=[host]; links=[]
    for i in range(3):
        link=prism(anchors[i],anchors[i+1],radii[i][0],radii[i][1],params['chain']['link_sides'],f'link_{i}')
        links.append(link); parts.append(link)
    hoof=wedge(params['chain']['hoof'],'hoof'); parts.append(hoof)
    tangents=[unit(sub(anchors[i+1],anchors[i])) for i in range(3)]; cuffs=[]
    for i,point in enumerate((anchors[1],anchors[2],anchors[3])):
        direction=unit(add(tangents[i-1],tangents[i])) if i < 2 else tangents[-1]
        if i == 2: point=add(point,[0,0,params['chain'].get('final_cuff_center_lift_z',0)])
        half=params['chain']['cuff_length']/2
        cuff=prism(sub(point,mul(direction,half)),add(point,mul(direction,half)),params['chain']['cuff_radius'],params['chain']['cuff_radius'],params['chain']['cuff_sides'],f'cuff_{i}')
        cuffs.append(cuff);parts.append(cuff)
    fr=params['frond']; collar=prism(fr['collar_base'],fr['collar_tip'],fr['collar_radius'],fr['collar_radius'],fr['collar_sides'],'frond_collar'); blade=diamond_loft(fr['blade_centers'],fr['blade_full_widths'],fr['blade_full_thicknesses'],'frond_blade');parts += [collar,blade]
    audits={part['name']:audit(part) for part in parts}
    host_planes=halfspaces(host); host_convex=max(dot(n,sub(vertex,a)) for a,n in host_planes for vertex in host['vertices']) <= EPS
    contacts={
        'coxa_rootcap_inside_actual_convex_host':contains(host,links[0]['rings']['start']),
        'collar_base_inside_actual_convex_host':contains(host,collar['rings']['start']),
        'cuff_0_contains_link_endrings':contains(cuffs[0],links[0]['rings']['end']+links[1]['rings']['start']),
        'cuff_1_contains_link_endrings':contains(cuffs[1],links[1]['rings']['end']+links[2]['rings']['start']),
        'cuff_2_contains_final_link_endring':contains(cuffs[2],links[2]['rings']['end']),
        'blade_root_inside_collar':contains(collar,blade['root_ring']),
        'cuff_2_lower_cap_center_inside_hoof':contains(hoof,[mean(cuffs[2]['rings']['end'])])
    }
    all_vertices=[v for part in parts for v in part['vertices']]; bounds={"min":[min(v[i] for v in all_vertices) for i in range(3)],"max":[max(v[i] for v in all_vertices) for i in range(3)]}; bounds['extent']=sub(bounds['max'],bounds['min'])
    proof={"schema":"trailgloam-method-probe-r5-cpu-proof-v1","parameters_sha256":sha(args.params),"source":{"reference":params['reference'],"axis":params['axis']},"scope":"one +X representative chain and one frond only; not a model candidate","host_global_convexity_from_generated_face_halfspaces":host_convex,"parts":audits,"contacts":contacts,"hoof_min_z":min(v[2] for v in hoof['vertices']),"complete_bounds":bounds,"all_parts_closed":all(row['boundary_edges']==0 and row['nonmanifold_edges']==0 and row['degenerate_faces']==0 and row['finite'] and row['outward_centroid_dot_min']>0 for row in audits.values()),"all_measured_contacts_pass":all(row['contained'] for row in contacts.values()),"limits":params['limits']}
    arrays={"schema":"trailgloam-method-probe-r5-literal-mesh-arrays-v1","parameters_sha256":proof['parameters_sha256'],"parts":[{"name":part['name'],"vertices":part['vertices'],"faces":part['faces']} for part in parts]}
    args.out_dir.mkdir(parents=True,exist_ok=True); (args.out_dir/'literal-mesh-arrays.json').write_text(json.dumps(arrays,indent=2)+"\n",encoding='utf8'); (args.out_dir/'cpu-proof.json').write_text(json.dumps(proof,indent=2)+"\n",encoding='utf8')
    if not host_convex or not proof['all_parts_closed'] or not proof['all_measured_contacts_pass'] or proof['hoof_min_z'] != 0: raise SystemExit('HOLD: generated geometry contract failed; receipts retained')
    print('CPU PROOF PASS: literal solids satisfy the bounded construction contract')
if __name__=='__main__': main()
