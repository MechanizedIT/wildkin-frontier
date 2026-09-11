"""Bounded Mossling anatomical rest/weight study, never a full gait bake.

Source surface is the already verified neutral welded mesh. No coordinates, UVs,
texture bytes, topology, shipping assets or previous studies are overwritten.
"""
import argparse
import hashlib
import json
import math
import struct
import sys
import heapq
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT=Path('C:/Users/cwood/Documents/mobile-rpg')
SOURCE=ROOT/'.dream-loop/overnight-mossling-pose-diagnosis/native-diagnosis-base.blend'
MESH_NAME='mossling-neutral-textured-20000'
RIG_NAME='MosslingDirectRig'
EXPECTED_CORNER_HASH='3f23b3e7d7f8dcd19f5e3945c32db49d75850ff1f41cd37c68f18b0331c98f83'

def corners(mesh):
    rows=[]
    for p in mesh.polygons:
        row=[]
        for i in p.loop_indices:
            v=mesh.vertices[mesh.loops[i].vertex_index]
            row.append(struct.pack('<5f',*v.co,*mesh.uv_layers.active.data[i].uv))
        rows.append(b''.join(sorted(row)))
    return hashlib.sha256(b''.join(sorted(rows))).hexdigest()

def clear_and_load():
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    mesh=bpy.data.objects[MESH_NAME]
    rig=bpy.data.objects[RIG_NAME]
    if rig.animation_data:
        rig.animation_data_clear()
    for b in rig.pose.bones:
        b.matrix_basis=Matrix.Identity(4)
    rig.data.pose_position='REST'
    for ob in list(bpy.context.scene.objects):
        if ob not in (mesh,rig):
            bpy.data.objects.remove(ob,do_unlink=True)
    assert corners(mesh.data)==EXPECTED_CORNER_HASH
    bpy.context.view_layer.update()
    return mesh,rig

def studio():
    scene=bpy.context.scene
    scene.render.engine='BLENDER_WORKBENCH'
    scene.render.threads_mode='FIXED';scene.render.threads=4
    scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.display.shading.light='STUDIO'
    scene.display.shading.color_type='TEXTURE'
    scene.display.shading.show_shadows=True
    scene.display.shading.show_cavity=False
    scene.display.shading.show_specular_highlight=False
    scene.display.shading.background_type='WORLD'
    if scene.world is None:scene.world=bpy.data.worlds.new('Anatomy study world')
    scene.world.color=(.12,.15,.17)
    scene.view_settings.view_transform='Standard'
    cam=bpy.data.objects.new('Anatomy study camera',bpy.data.cameras.new('Anatomy study camera'))
    scene.collection.objects.link(cam);scene.camera=cam
    cam.data.type='ORTHO';cam.data.ortho_scale=2.05
    return cam

def view(cam,name):
    target=Vector((0,0,.65))
    offset={'side':Vector((4,0,0)),'other-side':Vector((-4,0,0)),
            'front':Vector((0,-4,0)),'rear':Vector((0,4,0)),
            'top':Vector((0,0,4)),'three-quarter':Vector((3,-4,1.1))}[name]
    cam.location=target+offset
    cam.rotation_euler=(-offset).to_track_quat('-Z','Y').to_euler()

def render(out,cam,label,views):
    for name in views:
        view(cam,name)
        bpy.context.scene.render.filepath=str(out/f'{label}-{name}.png')
        bpy.ops.render.render(write_still=True)

def surface_data(mesh):
    points=[list(v.co) for v in mesh.data.vertices]
    neighbors=[set() for _ in points]
    for e in mesh.data.edges:
        a,b=e.vertices;neighbors[a].add(b);neighbors[b].add(a)
    unseen=set(range(len(points)));components=[]
    while unseen:
        seed=unseen.pop();todo=[seed];found=[seed]
        while todo:
            for v in neighbors[todo.pop()]:
                if v in unseen:unseen.remove(v);todo.append(v);found.append(v)
        components.append(found)
    components.sort(key=len,reverse=True)
    texture=next(n.image for m in mesh.data.materials for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image)
    pixels=list(texture.pixels);width,height=texture.size
    rgb=[None]*len(points)
    for loop in mesh.data.loops:
        if rgb[loop.vertex_index] is not None:continue
        uv=mesh.data.uv_layers.active.data[loop.index].uv
        x=min(width-1,max(0,round(uv.x*(width-1))))
        y=min(height-1,max(0,round(uv.y*(height-1))))
        offset=(y*width+x)*4
        rgb[loop.vertex_index]=pixels[offset:offset+3]
    return points,neighbors,components,rgb

def inspect(out):
    mesh,rig=clear_and_load();cam=studio()
    points,neighbors,components,rgb=surface_data(mesh)
    facts={'source':str(SOURCE),'sourceSHA256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
           'cornerGeometryUVHash':corners(mesh.data),'vertexCount':len(points),'triangles':len(mesh.data.polygons),
           'meshMatrix':list(sum((list(row) for row in mesh.matrix_world),[])),
           'boneLandmarks':{b.name:{'head':list(b.head_local),'tail':list(b.tail_local)} for b in rig.data.bones},
           'components':[{'index':i,'vertices':len(ids),'center':[sum(points[v][axis] for v in ids)/len(ids) for axis in range(3)],
                          'bounds':[[min(points[v][axis] for v in ids) for axis in range(3)],[max(points[v][axis] for v in ids) for axis in range(3)]]} for i,ids in enumerate(components)]}
    (out/'source-inventory.json').write_text(json.dumps(facts,indent=2))
    (out/'surface-data.json').write_text(json.dumps({'points':points,'colors':rgb,'components':components,'neighbors':[list(n) for n in neighbors]}))
    render(out,cam,'neutral',['side','other-side','front','rear','top','three-quarter'])
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'neutral-source.blend'))
    print(json.dumps({k:v for k,v in facts.items() if k!='components'},indent=2))

def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)))
    return t*t*(3-2*t)

def make_rig(mesh,old_rig):
    # The liked surface is fixed. Fit anatomy in its actual meter coordinates.
    for mod in list(mesh.modifiers):mesh.modifiers.remove(mod)
    world=mesh.matrix_world.copy();mesh.parent=None;mesh.matrix_world=world
    bpy.data.objects.remove(old_rig,do_unlink=True)
    # Old source Actions refer to the rejected skeleton. They remain preserved
    # in SOURCE, but must not be automatically matched onto this new rig.
    for action in list(bpy.data.actions):bpy.data.actions.remove(action)
    for group in list(mesh.vertex_groups):mesh.vertex_groups.remove(group)
    rig=bpy.data.objects.new('MosslingAnatomyStudyRig',bpy.data.armatures.new('Mossling fitted anatomy'))
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    specs=[
        ('root',None,(0,0,0),(0,0,.10)),
        ('pelvis','root',(0,.33,.445),(0,.10,.49)),
        ('spine','pelvis',(0,.10,.49),(0,-.15,.51)),
        ('chest','spine',(0,-.15,.51),(0,-.29,.62)),
        ('neck','chest',(0,-.29,.62),(0,-.435,.72)),
        ('head','neck',(0,-.435,.72),(0,-.66,.77)),
        ('flower_back','pelvis',(0,.235,.603),(0,.235,.68)),
        ('tail_01','pelvis',(0,.47,.535),(0,.585,.69)),
        ('tail_02','tail_01',(0,.585,.69),(0,.635,.88)),
        ('tail_03','tail_02',(0,.635,.88),(0,.66,1.11)),
    ]
    for side,sign in [('L',1),('R',-1)]:
        front=[(sign*.190,-.295,.485),(sign*.195,-.235,.285),(sign*.200,-.312,.090),(sign*.200,-.385,.035)]
        rear=[(sign*.205,.340,.465),(sign*.208,.200,.285),(sign*.216,.348,.160),(sign*.217,.319,.065),(sign*.217,.242,.036)]
        if side=='R':
            # Liked source is staggered, not a mirrored bind stance. These
            # centers come from the opposite-side lower-leg surface sections.
            front=[(-.165,-.295,.480),(-.155,-.235,.275),(-.177,-.323,.090),(-.180,-.395,.035)]
            rear=[(-.180,.320,.455),(-.166,.150,.280),(-.172,.210,.150),(-.180,.200,.065),(-.180,.110,.030)]
        for family,points,names,parent in [('front',front,['upper','lower','paw'],'chest'),('rear',rear,['thigh','shin','metatarsal','paw'],'pelvis')]:
            for i,name in enumerate(names):
                full=f'{family}_{name}.{side}'
                specs.append((full,parent,points[i],points[i+1]));parent=full
    for name,parent,head,tail in specs:
        bone=rig.data.edit_bones.new(name);bone.head=head;bone.tail=tail
        if parent:bone.parent=rig.data.edit_bones[parent]
        bone.use_deform=name!='root'
        # Derive the side's limb plane, rather than changing mirrored Euler signs.
        if name.startswith(('front_','rear_')):bone.align_roll(Vector((1,0,0)))
    bpy.ops.object.mode_set(mode='OBJECT')
    rig.show_in_front=True
    for bone in rig.pose.bones:bone.rotation_mode='QUATERNION'
    for bone in rig.data.bones:mesh.vertex_groups.new(name=bone.name)
    mod=mesh.modifiers.new('Anatomical linear skin','ARMATURE');mod.object=rig
    mod.use_deform_preserve_volume=False
    mesh.parent=rig
    return rig

def connected_subset(selected,neighbors):
    selected=set(selected);result=[]
    while selected:
        seed=selected.pop();found=[seed];todo=[seed]
        while todo:
            for v in neighbors[todo.pop()]:
                if v in selected:selected.remove(v);found.append(v);todo.append(v)
        result.append(found)
    return result

def flower_selection(points,neighbors,components,colors):
    # Petal-colored connected islands, not every vertex above a height plane.
    # Main cream torso and face islands are explicitly excluded by anatomical
    # center/extent and inspected in the saved selection overlay.
    pale={i for i,c in enumerate(colors) if c and c[0]>.25 and c[1]>.22 and c[2]>.15 and c[0]>c[1]*.94 and c[2]>c[1]*.48}
    petal_islands=connected_subset(pale,neighbors)
    core=set();islands=[]
    for ids in petal_islands:
        center=Vector(tuple(sum(points[v][a] for v in ids)/len(ids) for a in range(3)))
        height=max(points[v][2] for v in ids)-min(points[v][2] for v in ids)
        if .015<center.y<.41 and .535<center.z<.69 and height<.16 and len(ids)<220:
            core.update(ids);islands.append(ids)
    # Include the yellow flower centers and petal edges within a short surface
    # walk. Green mantle vertices are kept out of the rigid selection.
    todo=[(v,0) for v in core];seen=set(core)
    while todo:
        v,depth=todo.pop()
        if depth>=3:continue
        for n in neighbors[v]:
            if n in seen:continue
            c=colors[n]
            if c and c[0]>.28 and c[0]>c[1]*.91 and c[2]>c[1]*.16:
                seen.add(n);core.add(n);todo.append((n,depth+1))
    # Geodesic feather at each actual attachment: no straight spatial cutoff.
    distance=[float('inf')]*len(points);queue=[]
    for v in core:distance[v]=0;heapq.heappush(queue,(0,v))
    while queue:
        d,v=heapq.heappop(queue)
        if d!=distance[v] or d>=.085:continue
        for n in neighbors[v]:
            next_d=d+(Vector(points[v])-Vector(points[n])).length
            if next_d<distance[n] and next_d<.085:
                distance[n]=next_d;heapq.heappush(queue,(next_d,n))
    return core,distance,[{'count':len(ids),'center':[sum(points[v][a] for v in ids)/len(ids) for a in range(3)]} for ids in islands]

def pair_by_height(z,levels):
    if z>=levels[0][0]:return {levels[0][1]:1.0}
    if z<=levels[-1][0]:return {levels[-1][1]:1.0}
    for (za,na),(zb,nb) in zip(levels,levels[1:]):
        if zb<=z<=za:
            t=smooth(zb,za,z);return {na:t,nb:1-t}

def base_weights(point,limb_scale=1):
    x,y,z=point
    pelvis=smooth(.02,.38,y)
    # Head/crown and neck blending never admits foreleg ownership to the face.
    head=max(smooth(.43,.72,z)*smooth(-.12,-.36,y),smooth(.73,.94,z)*smooth(.03,-.10,y))
    if head>0:
        base={'chest':1-head*2,'neck':head*2} if head<.5 else {'neck':2-head*2,'head':head*2-1}
    else:base={'chest':1-pelvis,'pelvis':pelvis}
    tail=smooth(.40,.64,y)*smooth(.42,.62,z)
    if tail>0:
        tail_pair=pair_by_height(z,[(1.02,'tail_03'),(.80,'tail_02'),(.57,'tail_01')])
        base={n:w*(1-tail) for n,w in base.items()}
        for n,w in tail_pair.items():base[n]=base.get(n,0)+w*tail
    # An explicit central belly corridor owns no limb weights. The side and
    # shoulder/hip influence falls off smoothly through the actual attachment.
    family='front' if y<0 else 'rear'
    family_gate=1-smooth(-.14,-.02,y) if family=='front' else smooth(.04,.14,y)
    family_gate=1-(1-family_gate)*smooth(.11,.28,z)
    upper=smooth(.15,.34,z)
    lateral=smooth(.020+.055*upper,.070+.105*upper,abs(x))
    limb=(1-smooth(.36,.555,z))*lateral*family_gate
    # Tail/foliage and face are excluded without a hard crown-height override.
    limb*=(1-tail)*limb_scale
    side='L' if x>=0 else 'R'
    if limb>0:
        levels=([( .405,'upper'),(.21,'lower'),(.100,'paw')] if family=='front'
                else [(.425,'thigh'),(.245,'shin'),(.145,'metatarsal'),(.090,'paw')])
        pairs=pair_by_height(z,[(height,f'{family}_{name}.{side}') for height,name in levels])
        base={n:w*(1-limb) for n,w in base.items()}
        for n,w in pairs.items():base[n]=base.get(n,0)+w*limb
    return {n:w for n,w in base.items() if w>1e-7}

def weight_mesh(mesh,rig,out):
    points,neighbors,components,colors=surface_data(mesh)
    core,distance,islands=flower_selection(points,neighbors,components,colors)
    green={i for i,c in enumerate(colors) if c and c[1]>c[0]*1.07 and c[1]>c[2]*1.7 and c[1]>.08}
    mantle=max(connected_subset(green,neighbors),key=len)
    mantle_distance=[float('inf')]*len(points);queue=[]
    for v in mantle:mantle_distance[v]=0;heapq.heappush(queue,(0,v))
    while queue:
        d,v=heapq.heappop(queue)
        if d!=mantle_distance[v] or d>=.055:continue
        for n in neighbors[v]:
            nd=d+(Vector(points[v])-Vector(points[n])).length
            if nd<mantle_distance[n] and nd<.055:
                mantle_distance[n]=nd;heapq.heappush(queue,(nd,n))
    all_weights=[]
    for i,point in enumerate(points):
        # The connected green mantle is anatomically independent of the
        # separate ankle cuffs. Keep it out of limb weights, feathering only
        # through neighboring surface distance into its attachment boundary.
        limb_scale=smooth(0,.055,mantle_distance[i]) if math.isfinite(mantle_distance[i]) else 1
        w=base_weights(point,limb_scale)
        influence=1-smooth(.006,.085,distance[i]) if math.isfinite(distance[i]) else 0
        if influence:
            w={n:value*(1-influence) for n,value in w.items()}
            w['flower_back']=influence
        w={n:value for n,value in w.items() if value>1e-6}
        # Explicit anatomical supports are at most four; never silently prune
        # to four unrelated dominant weights after an unrestricted heat solve.
        if len(w)>4:raise ValueError(f'Anatomical support exceeds four at vertex {i}: {w}')
        total=sum(w.values());w={n:value/total for n,value in w.items()}
        all_weights.append(w)
        for name,value in w.items():mesh.vertex_groups[name].add([i],value,'REPLACE')
    attr=mesh.data.color_attributes.new(name='Actual flower ownership selection',type='FLOAT_COLOR',domain='POINT')
    mesh.data.color_attributes.active_color=attr
    for i in range(len(points)):
        factor=all_weights[i].get('flower_back',0)
        attr.data[i].color=(1,.035,.015,1) if i in core else ((1,.55,.06,1) if factor else (.12,.21,.25,1))
    cam=studio();bpy.context.scene.display.shading.color_type='VERTEX'
    render(out,cam,'flower-selection',['side','top','three-quarter'])
    bpy.context.scene.display.shading.color_type='TEXTURE'
    mesh.data.color_attributes.remove(attr)
    data={'rigidFlowerVertices':len(core),'featheredAttachmentVertices':sum(0<w.get('flower_back',0)<1 for w in all_weights),
          'semanticMantleVertices':len(mantle),'mantleLegExclusion':'Connected green surface island plus 5.5cm geodesic feather; separate ankle cuffs excluded',
          'flowerIslands':islands,'maxInfluences':max(map(len,all_weights)),
          'unweighted':sum(not w for w in all_weights),'normalizationMaxError':max(abs(sum(w.values())-1) for w in all_weights),
          'faceLimbLeaks':sum(any(n.startswith(('front_','rear_')) for n in w) for p,w in zip(points,all_weights) if p[1]<-.40 and p[2]>.60)}
    (out/'semantic-weights.json').write_text(json.dumps(data,indent=2))
    (out/'weights-per-vertex.json').write_text(json.dumps(all_weights))
    return data

def two_link(a,target,knee_rest,a_rest,target_rest,length_a,length_b,pole_rotation):
    line=target-a;distance=line.length
    rest_line=(target_rest-a_rest).normalized()
    pole=knee_rest-a_rest-rest_line*(knee_rest-a_rest).dot(rest_line)
    pole=pole_rotation@pole.normalized()
    direction=line.normalized()
    pole=(pole-direction*pole.dot(direction)).normalized()
    d=max(abs(length_a-length_b)+1e-6,min(length_a+length_b-1e-6,distance))
    along=(length_a**2-length_b**2+d*d)/(2*d)
    height=math.sqrt(max(0,length_a**2-along**2))
    return a+direction*along+pole*height,abs(d-distance)

def set_bone(rig,name,head,tail):
    bone=rig.data.bones[name]
    delta=(bone.tail_local-bone.head_local).rotation_difference(tail-head)
    matrix=delta.to_matrix().to_4x4()@bone.matrix_local.to_quaternion().to_matrix().to_4x4()
    matrix.translation=head
    rig.pose.bones[name].matrix=matrix
    bpy.context.view_layer.update()

def pose(rig,name,moderate=False):
    rig.animation_data_clear();rig.data.pose_position='POSE'
    for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()
    if name=='neutral':return {'targetClampMeters':0,'restSolveErrorMeters':rest_solve_error(rig)}
    settings={'loaded':{'drop':-.035,'body':-4,'chest':2,'neck':-2,'head':1.5,'rear_y':.055,'front_y':-.045,'lift':0},
              'gathered':{'drop':-.070,'body':4,'chest':-3,'neck':2,'head':3,'rear_y':-.080,'front_y':.055,'lift':.012}}[name]
    if moderate and name=='gathered':
        settings.update(drop=-.035,body=0,chest=-1,front_y=.030,rear_y=-.040,lift=.006)
    rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
    for bone_name,angle in [('pelvis',settings['body']),('spine',0),('chest',settings['chest']),('neck',settings['neck']),('head',settings['head']),('flower_back',0),('tail_01',-settings['body']*.4),('tail_02',0),('tail_03',0)]:
        b=rig.pose.bones[bone_name]
        parent=b.parent
        inherited=parent.matrix@rest[parent.name].inverted() if parent else Matrix.Identity(4)
        head=inherited@rig.data.bones[bone_name].head_local
        delta=inherited.to_quaternion()@Quaternion((1,0,0),math.radians(angle))
        matrix=delta.to_matrix().to_4x4()@rest[bone_name].to_quaternion().to_matrix().to_4x4()
        matrix.translation=head
        if bone_name=='pelvis':matrix.translation.z+=settings['drop']
        b.matrix=matrix;bpy.context.view_layer.update()
    clamp=0
    for side in ['L','R']:
        for family,parent_name in [('front','chest'),('rear','pelvis')]:
            names=([f'front_{n}.{side}' for n in ['upper','lower','paw']] if family=='front' else [f'rear_{n}.{side}' for n in ['thigh','shin','metatarsal','paw']])
            original=[rig.data.bones[n].head_local.copy() for n in names]+[rig.data.bones[names[-1]].tail_local.copy()]
            parent_delta=rig.pose.bones[parent_name].matrix@rest[parent_name].inverted()
            start=parent_delta@original[0]
            lift=settings['lift'] if family=='rear' else (.004 if moderate and name=='gathered' else settings['lift']*.4)
            ankle=original[-2]+Vector((0,settings[f'{family}_y'],lift))
            target=(ankle if family=='front' else ankle+Quaternion((1,0,0),math.radians(5 if name=='loaded' else -5))@(original[2]-original[3]))
            middle,error=two_link(start,target,original[1],original[0],original[2],(original[1]-original[0]).length,(original[2]-original[1]).length,parent_delta.to_quaternion())
            clamp=max(clamp,error)
            posed=([start,middle,ankle] if family=='front' else [start,middle,target,ankle])
            posed.append(ankle+(original[-1]-original[-2]))
            for index,bone_name in enumerate(names):set_bone(rig,bone_name,posed[index],posed[index+1])
    return {'targetClampMeters':clamp,'settings':settings}

def rest_solve_error(rig):
    error=0
    for family,names in [('front',['upper','lower','paw']),('rear',['thigh','shin','metatarsal'])]:
        for side in ['L','R']:
            points=[rig.data.bones[f'{family}_{n}.{side}'].head_local.copy() for n in names]
            result,clamp=two_link(points[0],points[2],points[1],points[0],points[2],(points[1]-points[0]).length,(points[2]-points[1]).length,Quaternion())
            error=max(error,(result-points[1]).length,clamp)
    return error

def strains(mesh):
    evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());deformed=evaluated.to_mesh()
    ratios=[]
    for edge in mesh.data.edges:
        a,b=edge.vertices;old=(mesh.data.vertices[a].co-mesh.data.vertices[b].co).length
        if old>.004:ratios.append(((deformed.vertices[a].co-deformed.vertices[b].co).length/old,a,b))
    evaluated.to_mesh_clear();ratios.sort(reverse=True)
    return {'maxEdgeRatio':ratios[0][0],'over3x':sum(r[0]>3 for r in ratios),'over5x':sum(r[0]>5 for r in ratios),'worstTen':ratios[:10]}

def landmark_views(rig,out,cam):
    # Orthographic overlays keep actual Y/Z or X/Z landmark projection, moving
    # debug rods only toward the camera so the skin cannot hide the fitted chain.
    for direction in ['side','front']:
        markers=[]
        for family,names,color in [('front',['upper','lower','paw'],(.08,.72,1,1)),('rear',['thigh','shin','metatarsal','paw'],(1,.30,.035,1))]:
            mat=bpy.data.materials.new(f'{family} landmark overlay');mat.diffuse_color=color
            for side in (['L'] if direction=='side' else ['L','R']):
                bones=[rig.data.bones[f'{family}_{n}.{side}'] for n in names]
                points=[b.head_local.copy() for b in bones]+[bones[-1].tail_local.copy()]
                for point in points:
                    if direction=='side':point.x=.46
                    else:point.y=-.92
                for a,b in zip(points,points[1:]):
                    bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.0045,depth=(b-a).length,location=(a+b)/2)
                    ob=bpy.context.object;ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();ob.data.materials.append(mat);markers.append(ob)
                for point in points:
                    bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=.010,location=point)
                    ob=bpy.context.object;ob.data.materials.append(mat);markers.append(ob)
        render(out,cam,'fitted-landmarks',[direction])
        for ob in markers:bpy.data.objects.remove(ob,do_unlink=True)

def repair(out):
    mesh,old_rig=clear_and_load();rig=make_rig(mesh,old_rig)
    report={'source':str(SOURCE),'sourceSHA256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
            'cornerGeometryUVHash':corners(mesh.data),'status':'Three-pose anatomical deformation candidate; independent review required; NO GAIT ADMISSION'}
    report['weights']=weight_mesh(mesh,rig,out)
    cam=bpy.context.scene.camera
    landmark_views(rig,out,cam)
    poses={};report['poses']={}
    for name in ['neutral','loaded','gathered']:
        report['poses'][name]=pose(rig,name)
        report['poses'][name]['strain']=strains(mesh)
        poses[name]={b.name:b.matrix_basis.copy() for b in rig.pose.bones}
        render(out,cam,f'source-{name}',['side','front','three-quarter'])
    report['restLandmarks']={b.name:{'head':list(b.head_local),'tail':list(b.tail_local)} for b in rig.data.bones}
    assert corners(mesh.data)==EXPECTED_CORNER_HASH
    action=bpy.data.actions.new('AnatomyPoses');rig.animation_data_create();rig.animation_data.action=action
    for frame,name in enumerate(['neutral','loaded','gathered'],1):
        for bone in rig.pose.bones:
            bone.matrix_basis=poses[name][bone.name]
            bone.keyframe_insert('location',frame=frame,group=bone.name)
            bone.keyframe_insert('rotation_quaternion',frame=frame,group=bone.name)
            bone.keyframe_insert('scale',frame=frame,group=bone.name)
    for curve in action.fcurves:
        for key in curve.keyframe_points:key.interpolation='CONSTANT'
    scene=bpy.context.scene;scene.render.fps=1;scene.frame_start=1;scene.frame_end=3;scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'mossling-anatomy-three-poses.blend'))
    bpy.ops.export_scene.gltf(filepath=str(out/'mossling-anatomy.glb'),use_selection=True,export_format='GLB',export_yup=True,
        export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_step=1,export_anim_slide_to_zero=True,export_def_bones=True)
    report['outputSHA256']=hashlib.sha256((out/'mossling-anatomy.glb').read_bytes()).hexdigest()
    report['boneCount']=len(rig.data.bones)
    report['geometryUnchanged']=corners(mesh.data)==EXPECTED_CORNER_HASH
    (out/'anatomy-report.json').write_text(json.dumps(report,indent=2))
    # Re-import the exported diagnostic, then judge the actual GLB poses.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(out/'mossling-anatomy.glb'))
    imported_rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
    if imported_rig.animation_data:
        for track in imported_rig.animation_data.nla_tracks:track.mute=True
    clip=next(a for a in bpy.data.actions if a.name=='AnatomyPoses')
    imported_rig.animation_data_create();imported_rig.animation_data.action=clip
    if clip.slots:imported_rig.animation_data.action_slot=clip.slots[0]
    cam=studio()
    start,end=clip.frame_range
    for index,name in enumerate(['neutral','loaded','gathered']):
        frame=start+(end-start)*index/2
        bpy.context.scene.frame_set(int(frame),subframe=frame-int(frame))
        render(out,cam,f'glb-{name}',['side','front','three-quarter'])
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'exported-pose-review.blend'))
    print(json.dumps({k:v for k,v in report.items() if k not in ('restLandmarks','weights')},indent=2))

def native_heat_weights(mesh,rig,out):
    flowers={v.index:next((g.weight for g in v.groups if mesh.vertex_groups[g.group].name=='flower_back'),0) for v in mesh.data.vertices}
    rig.animation_data_clear()
    for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
    rig.data.pose_position='REST'
    for mod in list(mesh.modifiers):
        if mod.type=='ARMATURE':mesh.modifiers.remove(mod)
    for group in list(mesh.vertex_groups):mesh.vertex_groups.remove(group)
    bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
    report={'method':'Blender ARMATURE_AUTO bone heat on unchanged welded neutral, fitted anatomical rig',
            'excludedNondeformBones':[b.name for b in rig.data.bones if not b.use_deform]}
    try:
        result=bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        report['operatorResult']=list(result)
    except RuntimeError as error:
        report['failed']=True;report['error']=str(error)
        (out/'heat-weight-report.json').write_text(json.dumps(report,indent=2));return report
    native_counts=[len(v.groups) for v in mesh.data.vertices]
    report['nativeUnweighted']=sum(n==0 for n in native_counts);report['nativeMaxInfluences']=max(native_counts)
    if report['nativeUnweighted']:
        report['failed']=True;report['error']='Native heat left unweighted vertices; no silent fallback or manual body masks applied.'
        (out/'heat-weight-report.json').write_text(json.dumps(report,indent=2));return report
    # Preserve only the previously reviewed actual flower selection. Body and
    # mantle receive the native heat result; no old spatial envelopes return.
    for vertex in mesh.data.vertices:
        flower=flowers[vertex.index]
        weights={mesh.vertex_groups[g.group].name:g.weight for g in vertex.groups if mesh.vertex_groups[g.group].name!='flower_back'}
        total=sum(weights.values());weights={n:w/total*(1-flower) for n,w in weights.items()} if total else {}
        if flower:weights['flower_back']=flower
        kept=sorted(weights.items(),key=lambda item:item[1],reverse=True)[:4];total=sum(w for _,w in kept)
        for group in mesh.vertex_groups:group.remove([vertex.index])
        for name,value in kept:mesh.vertex_groups[name].add([vertex.index],value/total,'REPLACE')
    report['failed']=False;report['finalMaxInfluences']=max(len(v.groups) for v in mesh.data.vertices)
    report['flowerCoreVertices']=sum(w>.99999 for w in flowers.values())
    report['limitMethod']='Normalize native heat weights plus preserved semantic flower; retain largest four influences for glTF. No body height mask.'
    (out/'heat-weight-report.json').write_text(json.dumps(report,indent=2))
    return report

def proxy_heat_weights(mesh,rig,out,head_fit=False):
    from mathutils.bvhtree import BVHTree
    import bmesh
    report={'method':'One coarse anatomical voxel proxy, native bone heat, Blender nearest-face interpolated vertex-group transfer',
            'voxelSizeMeters':.045,'maxCells':250000,'maxProxyVertices':30000,'failed':False,
            'primaryDocs':['https://docs.blender.org/manual/en/4.5/modeling/modifiers/modify/data_transfer.html',
                           'https://docs.blender.org/api/3.2/bpy.types.DataTransferModifier.html']}
    def write(): (out/'proxy-weight-report.json').write_text(json.dumps(report,indent=2))
    flowers={v.index:next((g.weight for g in v.groups if mesh.vertex_groups[g.group].name=='flower_back'),0) for v in mesh.data.vertices}
    rig.animation_data_clear()
    for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
    rig.data.pose_position='REST'
    pieces=[]
    def ellipsoid(name,center,scale,direction=None):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=center)
        part=bpy.context.object;part.name=name;part.scale=scale
        if direction is not None:part.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
        bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);pieces.append(part)
    ellipsoid('Torso proxy',(0,.03,.455),(.225,.415,.185))
    ellipsoid('Chest proxy',(0,-.235,.505),(.200,.200,.215))
    ellipsoid('Pelvis proxy',(0,.31,.445),(.225,.205,.185))
    if head_fit:
        ellipsoid('Upper neck cheek nape proxy',(0,-.405,.700),(.285,.20,.195))
        ellipsoid('Head proxy',(0,-.535,.755),(.265,.215,.190))
        report['headFitRevision']={'upperNeckCenter':[0,-.405,.700],'upperNeckRadii':[.285,.20,.195],
                                   'headCenter':[0,-.535,.755],'headRadii':[.265,.215,.190],
                                   'scope':'Only head/upper-neck capsules changed; limb/body/tail capsules and voxel size retained'}
    else:
        ellipsoid('Neck proxy',(0,-.345,.64),(.145,.17,.17))
        ellipsoid('Head proxy',(0,-.535,.755),(.177,.195,.155))
    ellipsoid('Muzzle proxy',(0,-.68,.70),(.105,.12,.075))
    for bone in rig.data.bones:
        if not bone.name.startswith(('front_','rear_','tail_')):continue
        if bone.name.startswith('front_'):radius=.105 if 'upper' in bone.name else (.067 if 'lower' in bone.name else .075)
        elif bone.name.startswith('rear_'):radius=.120 if 'thigh' in bone.name else (.080 if 'shin' in bone.name else (.06 if 'metatarsal' in bone.name else .077))
        else:radius=.093
        a=bone.head_local;b=bone.tail_local
        ellipsoid(bone.name+' capsule',(a+b)/2,(radius,radius,(b-a).length/2+radius),b-a)
    bpy.ops.object.select_all(action='DESELECT')
    for part in pieces:part.select_set(True)
    bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();proxy=bpy.context.object;proxy.name='CoarseAnatomicalWeightProxy'
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    points=[v.co for v in proxy.data.vertices];lo=Vector([min(v[a] for v in points) for a in range(3)]);hi=Vector([max(v[a] for v in points) for a in range(3)])
    cells=[math.ceil((hi[a]-lo[a])/.045)+6 for a in range(3)]
    report['boundsMeters']=[list(lo),list(hi)];report['paddedVoxelDimensions']=cells;report['paddedVoxelCellCount']=math.prod(cells);write()
    if math.prod(cells)>250000:
        report.update(failed=True,error='Precomputed voxel volume exceeds guard');write();return report
    modifier=proxy.modifiers.new('Single 4.5cm voxel union','REMESH');modifier.mode='VOXEL';modifier.voxel_size=.045
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    report['proxyVertices']=len(proxy.data.vertices);report['proxyPolygons']=len(proxy.data.polygons);write()
    if len(proxy.data.vertices)>30000:
        report.update(failed=True,error='Coarse proxy exceeds vertex guard; no resolution escalation');write();return report
    bm=bmesh.new();bm.from_mesh(proxy.data);report['proxyNonManifoldEdges']=sum(not e.is_manifold for e in bm.edges);bm.free()
    if report['proxyNonManifoldEdges']:
        report.update(failed=True,error='Proxy is not closed manifold; heat not attempted');write();return report
    bvh=BVHTree.FromPolygons([v.co for v in proxy.data.vertices],[list(p.vertices) for p in proxy.data.polygons])
    distances=sorted(bvh.find_nearest(v.co)[3] for v in mesh.data.vertices)
    report['renderToProxyDistanceMeters']={'median':distances[len(distances)//2],'p95':distances[int(len(distances)*.95)],'max':distances[-1]}
    # Retain diagnostic proxy shape before binding; all joints remain measured
    # rest joints and the original surface is never remeshed.
    mesh.hide_render=True;bpy.context.scene.display.shading.color_type='MATERIAL'
    render(out,bpy.context.scene.camera,'proxy-neutral',['side','three-quarter'])
    mesh.hide_render=False;bpy.context.scene.display.shading.color_type='TEXTURE'
    flower_bone=rig.data.bones['flower_back'];flower_bone.use_deform=False
    bpy.ops.object.select_all(action='DESELECT');proxy.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
    try:report['heatOperatorResult']=list(bpy.ops.object.parent_set(type='ARMATURE_AUTO'))
    except RuntimeError as error:report.update(failed=True,error=str(error))
    finally:flower_bone.use_deform=True
    report['proxyUnweighted']=sum(not v.groups for v in proxy.data.vertices)
    if report['failed'] or report['proxyUnweighted']:
        report.update(failed=True,error=report.get('error','Native heat left incomplete proxy weights'));write();return report
    for mod in list(mesh.modifiers):
        if mod.type=='ARMATURE':mesh.modifiers.remove(mod)
    for group in list(mesh.vertex_groups):mesh.vertex_groups.remove(group)
    for group in proxy.vertex_groups:mesh.vertex_groups.new(name=group.name)
    if 'flower_back' not in mesh.vertex_groups:mesh.vertex_groups.new(name='flower_back')
    bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);bpy.context.view_layer.objects.active=mesh
    transfer=mesh.modifiers.new('Native nearest-face interpolated weights','DATA_TRANSFER');transfer.object=proxy
    transfer.use_vert_data=True;transfer.data_types_verts={'VGROUP_WEIGHTS'};transfer.vert_mapping='POLYINTERP_NEAREST'
    transfer.layers_vgroup_select_src='ALL';transfer.layers_vgroup_select_dst='NAME';transfer.mix_mode='REPLACE';transfer.mix_factor=1
    bpy.ops.object.modifier_apply(modifier=transfer.name)
    report['transferredUnweighted']=sum(not v.groups for v in mesh.data.vertices)
    if report['transferredUnweighted']:
        report.update(failed=True,error='Native transfer left original vertices unweighted');write();return report
    for vertex in mesh.data.vertices:
        flower=flowers[vertex.index]
        weights={mesh.vertex_groups[g.group].name:g.weight for g in vertex.groups if mesh.vertex_groups[g.group].name!='flower_back' and g.weight>0}
        total=sum(weights.values());weights={n:w/total*(1-flower) for n,w in weights.items()}
        if flower:weights['flower_back']=flower
        kept=sorted(weights.items(),key=lambda item:item[1],reverse=True)[:4];total=sum(w for _,w in kept)
        for group in mesh.vertex_groups:group.remove([vertex.index])
        for name,value in kept:mesh.vertex_groups[name].add([vertex.index],value/total,'REPLACE')
    mod=mesh.modifiers.new('Transferred linear skin','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=False
    report['maxFinalInfluences']=max(len(v.groups) for v in mesh.data.vertices)
    report['flowerCoreVertices']=sum(w>.99999 for w in flowers.values())
    report['normalizationMaxError']=max(abs(sum(g.weight for g in v.groups)-1) for v in mesh.data.vertices)
    proxy.hide_render=True;proxy.hide_set(True)
    write();return report

def constrain_head(mesh,rig,out):
    points,neighbors,components,colors=surface_data(mesh)
    core={i for i,(x,y,z) in enumerate(points) if abs(x)<.34 and -.81<y and ((y<-.38 and .59<z<1.23) or (y<-.24 and .88<z<1.23))}
    distance=[float('inf')]*len(points);queue=[]
    for i in core:distance[i]=0;heapq.heappush(queue,(0,i))
    while queue:
        d,i=heapq.heappop(queue)
        if d!=distance[i] or d>=.075:continue
        for n in neighbors[i]:
            nd=d+(Vector(points[i])-Vector(points[n])).length
            if nd<distance[n] and nd<.075:distance[n]=nd;heapq.heappush(queue,(nd,n))
    original=[];final=[]
    for vertex in mesh.data.vertices:
        weights={mesh.vertex_groups[g.group].name:g.weight for g in vertex.groups};original.append(weights.copy())
        factor=1-smooth(0,.075,distance[vertex.index]) if math.isfinite(distance[vertex.index]) else 0
        if factor:
            total=weights.get('head',0)+weights.get('neck',0)
            target={n:weights.get(n,0)/total for n in ['head','neck']} if total>1e-6 else {'neck':1}
            weights={n:w*(1-factor) for n,w in weights.items()}
            for n,w in target.items():weights[n]=weights.get(n,0)+w*factor
            kept=sorted([(n,w) for n,w in weights.items() if w>1e-7],key=lambda item:item[1],reverse=True)[:4];total=sum(w for _,w in kept)
            weights={n:w/total for n,w in kept}
            for group in mesh.vertex_groups:group.remove([vertex.index])
            for name,value in weights.items():mesh.vertex_groups[name].add([vertex.index],value,'REPLACE')
        final.append(weights)
    attr=mesh.data.color_attributes.new(name='Localized head ownership core and nape feather',type='FLOAT_COLOR',domain='POINT');mesh.data.color_attributes.active_color=attr
    for i in range(len(points)):attr.data[i].color=(1,.025,.015,1) if i in core else ((1,.55,.03,1) if math.isfinite(distance[i]) else (.13,.24,.28,1))
    for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update();bpy.context.scene.display.shading.color_type='VERTEX'
    render(out,bpy.context.scene.camera,'head-region-mask',['side','other-side','three-quarter'])
    bpy.context.scene.display.shading.color_type='TEXTURE';mesh.data.color_attributes.remove(attr)
    report={'failed':False,'method':'Head/neck-only semantic anatomical core with geodesic nape feather, after fitted proxy heat transfer',
            'exactCorePredicate':'abs(x)<.34 and -.81<y and ((y<-.38 and .59<z<1.23) or (y<-.24 and .88<z<1.23)) in Blender meters',
            'feather':'Smoothstep from full restriction at core to zero over .075m shortest surface-edge distance; disconnected components do not borrow distance',
            'target':'Renormalize existing head/neck ratio; remove other bones only at core, interpolate in feather. Else retain proxy weights unchanged.',
            'coreVertices':len(core),'featherVertices':sum(0<d<.075 for d in distance),'outsideChanged':sum(a!=b for a,b,d in zip(original,final,distance) if not math.isfinite(d)),
            'coreLimbLeaks':sum(any(n.startswith(('front_','rear_')) and w>1e-7 for n,w in final[i].items()) for i in core),
            'localizedWeights':{i:final[i] for i in [89,90,8311,8319]}}
    (out/'head-constraint-report.json').write_text(json.dumps(report,indent=2));return report

def moderate_pose(out,heat=False):
    folder='coarse-proxy-head-fit' if heat=='head-constraint' else 'anatomical-fit'
    source=ROOT/'.dream-loop/overnight-mossling-anatomy-repair/v1'/folder/'mossling-anatomy-three-poses.blend'
    bpy.ops.wm.open_mainfile(filepath=str(source))
    rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');mesh=bpy.data.objects[MESH_NAME]
    def weight_hash():
        return hashlib.sha256(json.dumps([[(mesh.vertex_groups[g.group].name,g.weight) for g in v.groups] for v in mesh.data.vertices]).encode()).hexdigest()
    original_weights=weight_hash();original_corners=corners(mesh.data)
    original_rest={b.name:[list(row) for row in b.matrix_local] for b in rig.data.bones}
    rig.animation_data_clear()
    for action in list(bpy.data.actions):bpy.data.actions.remove(action)
    report={'source':str(source),'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'status':'Moderate ordinary locomotion pose study, root review required; no gait or run/crouch admission','poses':{}}
    if heat:
        report['heat']=(constrain_head(mesh,rig,out) if heat=='head-constraint' else (proxy_heat_weights(mesh,rig,out,head_fit=heat=='proxy-head') if heat in ('proxy','proxy-head') else native_heat_weights(mesh,rig,out)))
        if report['heat']['failed']:
            print('Native heat failed; see heat-weight-report.json. No export or fallback.');return
    poses={}
    for name in ['neutral','loaded','gathered']:
        data=pose(rig,name,moderate=True)
        data['evaluated']={b.name:{'headDeltaMeters':list(b.head-rig.data.bones[b.name].head_local),
            'rotationDeltaDegrees':math.degrees((b.matrix@rig.data.bones[b.name].matrix_local.inverted()).to_quaternion().angle),
            'scale':list(b.scale)} for b in rig.pose.bones}
        data['strain']=strains(mesh);report['poses'][name]=data
        poses[name]={b.name:b.matrix_basis.copy() for b in rig.pose.bones}
    action=bpy.data.actions.new('AnatomyPoses');rig.animation_data_create();rig.animation_data.action=action
    for frame,name in enumerate(['neutral','loaded','gathered'],1):
        for bone in rig.pose.bones:
            bone.matrix_basis=poses[name][bone.name]
            for property in ['location','rotation_quaternion','scale']:bone.keyframe_insert(property,frame=frame,group=bone.name)
    for curve in action.fcurves:
        for key in curve.keyframe_points:key.interpolation='CONSTANT'
    scene=bpy.context.scene;scene.render.fps=1;scene.frame_start=1;scene.frame_end=3;scene.frame_set(1)
    report['weightsSHA256']=weight_hash();report['weightsUnchanged']=original_weights==weight_hash()
    report['cornerGeometryUVHash']=corners(mesh.data);report['geometryUVUnchanged']=original_corners==corners(mesh.data)
    report['restRigUnchanged']=original_rest=={b.name:[list(row) for row in b.matrix_local] for b in rig.data.bones}
    assert (heat or report['weightsUnchanged']) and report['geometryUVUnchanged'] and report['restRigUnchanged']
    bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'mossling-anatomy-three-poses.blend'))
    bpy.ops.export_scene.gltf(filepath=str(out/'mossling-anatomy.glb'),use_selection=True,export_format='GLB',export_yup=True,
        export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_step=1,export_anim_slide_to_zero=True,export_def_bones=True)
    report['outputSHA256']=hashlib.sha256((out/'mossling-anatomy.glb').read_bytes()).hexdigest()
    (out/'moderate-pose-report.json').write_text(json.dumps(report,indent=2))
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(out/'mossling-anatomy.glb'))
    imported_rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
    for track in imported_rig.animation_data.nla_tracks:track.mute=True
    clip=next(a for a in bpy.data.actions if a.name=='AnatomyPoses');imported_rig.animation_data.action=clip
    if clip.slots:imported_rig.animation_data.action_slot=clip.slots[0]
    cam=studio();start,end=clip.frame_range
    for index,name in enumerate(['neutral','loaded','gathered']):
        frame=start+(end-start)*index/2;bpy.context.scene.frame_set(int(frame),subframe=frame-int(frame))
        render(out,cam,f'glb-{name}',['side','front','three-quarter'])
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'exported-pose-review.blend'))
    print('Moderate pose candidate rendered; rig and geometry unchanged. SHA256 '+report['outputSHA256'])

def proxy_review(out,head_fit=False):
    folder='coarse-proxy-head-owned' if head_fit=='owned' else ('coarse-proxy-head-fit' if head_fit else 'coarse-proxy-transfer')
    source=ROOT/'.dream-loop/overnight-mossling-anatomy-repair/v1'/folder
    bpy.ops.wm.open_mainfile(filepath=str(source/'mossling-anatomy-three-poses.blend'))
    mesh=bpy.data.objects[MESH_NAME]
    weights={i:{'position':list(mesh.data.vertices[i].co),'weights':{mesh.vertex_groups[g.group].name:g.weight for g in mesh.data.vertices[i].groups}} for i in [89,90,8311,8319]}
    (out/'localized-neck-weights.json').write_text(json.dumps(weights,indent=2))
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(source/'mossling-anatomy.glb'))
    rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
    for track in rig.animation_data.nla_tracks:track.mute=True
    clip=next(a for a in bpy.data.actions if a.name=='AnatomyPoses');rig.animation_data.action=clip
    if clip.slots:rig.animation_data.action_slot=clip.slots[0]
    cam=studio();bpy.context.scene.frame_set(int(clip.frame_range[1]))
    render(out,cam,'glb-gathered',['other-side','rear'])

def walk_donor(out,action_name='Walk'):
    source=ROOT/'.dream-loop/workflow-proof/quadruped-references/quaternius-ultimate-animated-animals-2026-09-11/Blends/Wolf.blend'
    bpy.ops.wm.open_mainfile(filepath=str(source))
    rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');rig.animation_data_clear()
    for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
    action=bpy.data.actions[action_name];rig.animation_data_create();rig.animation_data.action=action
    if action.slots:rig.animation_data.action_slot=action.slots[0]
    start,end=action.frame_range
    names=['IKBackLeg.R','IKFrontLeg.R','IKBackLeg.L','IKFrontLeg.L','Back','Torso3','Neck2','Head','Tail1']
    samples=[]
    for i in range(121):
        frame=start+(end-start)*i/120;bpy.context.scene.frame_set(int(frame),subframe=frame-int(frame))
        samples.append({'phase':i/120,'bones':{n:{'head':list(rig.pose.bones[n].head),
            'rotationDelta':[*(rig.pose.bones[n].matrix.to_quaternion()@rig.data.bones[n].matrix_local.to_quaternion().inverted())]} for n in names}})
    paws={}
    for name in names[:4]:
        values=[s['bones'][name]['head'] for s in samples];zlo=min(v[2] for v in values);zhi=max(v[2] for v in values);threshold=zlo+(zhi-zlo)*.12
        contacts=[v[2]<=threshold for v in values[:-1]]
        touchdowns=[i/120 for i in range(120) if contacts[i] and not contacts[(i-1)%120]]
        paws[name]={'zMin':zlo,'zMax':zhi,'yMin':min(v[1] for v in values),'yMax':max(v[1] for v in values),'threshold':threshold,'lowPhaseFraction':sum(contacts)/120,'touchdownPhases':touchdowns}
    report={'source':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'action':action_name,'sourceFrameRange':[start,end],'sourceFPS':bpy.context.scene.render.fps,'paws':paws,'samples':samples}
    (out/f'donor-{action_name.lower()}-samples.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({k:v for k,v in report.items() if k!='samples'},indent=2))

def author_walk(out,complete=False):
    source=ROOT/'.dream-loop/overnight-mossling-anatomy-repair/v1'/('walk-candidate/mossling-walk.blend' if complete else 'coarse-proxy-head-owned/mossling-anatomy-three-poses.blend')
    donor=json.loads((ROOT/'.dream-loop/overnight-mossling-anatomy-repair/v1'/('full-donor/donor-gallop-samples.json' if complete else 'walk-donor/donor-walk-samples.json')).read_text())
    bpy.ops.wm.open_mainfile(filepath=str(source));rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');mesh=bpy.data.objects[MESH_NAME]
    rig.animation_data_clear()
    for action in list(bpy.data.actions):
        if complete and action.name=='Walk':action.use_fake_user=True
        else:bpy.data.actions.remove(action)
    rig.data.pose_position='POSE';rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
    bones=['rear_paw.R','front_paw.R','rear_paw.L','front_paw.L'];donor_names=['IKBackLeg.R','IKFrontLeg.R','IKBackLeg.L','IKFrontLeg.L']
    td=[donor['paws'][n]['touchdownPhases'][0] for n in donor_names];origin=td[2] if complete else td[0];phases=[(t-origin)%1 for t in td]
    speed=1.9 if complete else .65;seconds=.50 if complete else .75;duty=.29 if complete else .60;stroke=speed*seconds*duty;frames=20 if complete else 30
    clip_name='Run' if complete else 'Walk';duties=[.28,.30,.28,.30] if complete else [duty]*4
    def sample(name,phase):
        pos=(phase%1)*120;i=int(pos);t=pos-i
        a=donor['samples'][i]['bones'][name];b=donor['samples'][i+1]['bones'][name]
        return {'head':Vector(a['head']).lerp(Vector(b['head']),t),'rotation':Quaternion(a['rotationDelta']).slerp(Quaternion(b['rotationDelta']),t)}
    body_names={'pelvis':'Back','chest':'Torso3','neck':'Neck2','head':'Head','tail_01':'Tail1'}
    xranges={n:(min(Quaternion(s['bones'][n]['rotationDelta']).to_euler('XYZ').x for s in donor['samples']),max(Quaternion(s['bones'][n]['rotationDelta']).to_euler('XYZ').x for s in donor['samples'])) for n in body_names.values()}
    zrange=[min(s['bones']['Back']['head'][2] for s in donor['samples']),max(s['bones']['Back']['head'][2] for s in donor['samples'])]
    def normalized_angle(name,phase,amplitude):
        value=sample(name,phase)['rotation'].to_euler('XYZ').x;lo,hi=xranges[name]
        return ((value-(lo+hi)/2)/max((hi-lo)/2,1e-6))*math.radians(amplitude)
    action=bpy.data.actions.new(clip_name);rig.animation_data_create();rig.animation_data.action=action
    report={'input_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'source':str(source),'donor_sha256':donor['sha256'],
            'method':'Authored Wolf four-beat contact rhythm and recovery curve, constant world-speed stance, fitted three-segment hind IK',
            'clips':{clip_name:{'settings':{'seconds':seconds,'speed':speed,'duty':duty,'dutyPerPaw':duties,'phase':phases,'stanceStrokeMeters':stroke,'stanceStrokePerPaw':[speed*seconds*d for d in duties],'frames':frames,'fps':40},'samples':[]}},
            'geometryUVHash':corners(mesh.data),'weightsSHA256':hashlib.sha256(json.dumps([[(mesh.vertex_groups[g.group].name,g.weight) for g in v.groups] for v in mesh.data.vertices]).encode()).hexdigest()}
    first=None
    for frame in range(frames+1):
        phase=frame/frames;donor_phase=(phase+origin)%1
        for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
        bpy.context.view_layer.update()
        back_z=sample('Back',donor_phase)['head'].z
        bob=(back_z-zrange[0])/max(zrange[1]-zrange[0],1e-6)
        drop=(-.022+.010*bob) if complete else (-.020+.008*bob)
        angles={'pelvis':normalized_angle('Back',donor_phase,1),'spine':0,'chest':normalized_angle('Torso3',donor_phase,.3),
                'neck':normalized_angle('Neck2',donor_phase,1),'head':normalized_angle('Head',donor_phase,1.5),'flower_back':0,
                'tail_01':normalized_angle('Tail1',donor_phase,1.2),'tail_02':0,'tail_03':0}
        for name,angle in angles.items():
            bone=rig.pose.bones[name];parent=bone.parent
            inherited=parent.matrix@rest[parent.name].inverted() if parent else Matrix.Identity(4)
            delta=inherited.to_quaternion()@Quaternion((1,0,0),angle)
            matrix=delta.to_matrix().to_4x4()@rest[name].to_quaternion().to_matrix().to_4x4();matrix.translation=inherited@rig.data.bones[name].head_local
            if name=='pelvis':matrix.translation.z+=drop
            bone.matrix=matrix;bpy.context.view_layer.update()
        entry={'phase':phase,'bodyDrop':drop,'paws':{},'maxReachClamp':0,'maxAngleDegrees':0}
        for index,paw in enumerate(bones):
            family='front' if paw.startswith('front') else 'rear';side=paw[-1];q=(phase-phases[index])%1
            duty=duties[index];stroke=speed*seconds*duty
            name=donor_names[index];cfg=donor['paws'][name];touch=td[index]
            if q<duty:offset=-stroke/2+speed*seconds*q;lift=0;recovery=0
            else:
                recovery=(q-duty)/(1-duty)
                native_start=touch+cfg['lowPhaseFraction'];native_end=touch+1
                p=sample(name,native_start+(native_end-native_start)*recovery)['head']
                a=sample(name,native_start)['head'];b=sample(name,native_end)['head']
                progress=max(0,min(1,(p.y-a.y)/(b.y-a.y)))
                offset=stroke/2-stroke*progress
                lift=max(0,(p.z-cfg['threshold'])/(cfg['zMax']-cfg['threshold']))*((.065 if family=='front' else .080) if complete else (.045 if family=='front' else .055))
            names=[f'{family}_{n}.{side}' for n in (['upper','lower','paw'] if family=='front' else ['thigh','shin','metatarsal','paw'])]
            points=[rig.data.bones[n].head_local.copy() for n in names]+[rig.data.bones[names[-1]].tail_local.copy()]
            parent='chest' if family=='front' else 'pelvis';parent_delta=rig.pose.bones[parent].matrix@rest[parent].inverted();start=parent_delta@points[0]
            ankle=points[-2]+Vector((0,offset,lift))
            metatarsal_pitch=math.radians(-6*math.sin(math.pi*recovery)) if q>=duty else 0
            target=ankle if family=='front' else ankle+Quaternion((1,0,0),metatarsal_pitch)@(points[2]-points[3])
            middle,clamp=two_link(start,target,points[1],points[0],points[2],(points[1]-points[0]).length,(points[2]-points[1]).length,parent_delta.to_quaternion())
            posed=([start,middle,ankle] if family=='front' else [start,middle,target,ankle]);posed.append(ankle+points[-1]-points[-2])
            for i,name in enumerate(names):set_bone(rig,name,posed[i],posed[i+1])
            entry['paws'][paw]={'q':q,'stance':q<duty,'target':list(ankle),'reachClamp':clamp}
            entry['maxReachClamp']=max(entry['maxReachClamp'],clamp)
        for bone in rig.pose.bones:
            angle=math.degrees((bone.matrix@rest[bone.name].inverted()).to_quaternion().angle);entry['maxAngleDegrees']=max(entry['maxAngleDegrees'],angle)
        if frame==0:first={b.name:b.matrix_basis.copy() for b in rig.pose.bones}
        if frame==frames:
            for bone in rig.pose.bones:bone.matrix_basis=first[bone.name]
        for bone in rig.pose.bones:
            for property in ['location','rotation_quaternion','scale']:bone.keyframe_insert(property,frame=frame,group=bone.name)
        entry['shoulderDropMeters']=max(rig.data.bones[n].head_local.z-rig.pose.bones[n].head.z for n in ['front_upper.L','front_upper.R'])
        report['clips'][clip_name]['samples'].append(entry)
    report['clips'][clip_name]['maxReachClamp']=max(e['maxReachClamp'] for e in report['clips'][clip_name]['samples'])
    report['clips'][clip_name]['maxShoulderDropMeters']=max(e['shoulderDropMeters'] for e in report['clips'][clip_name]['samples'])
    for curve in action.fcurves:
        for key in curve.keyframe_points:key.interpolation='LINEAR'
    assert corners(mesh.data)==EXPECTED_CORNER_HASH
    scene=bpy.context.scene;scene.render.fps=40;scene.frame_start=0;scene.frame_end=frames;scene.frame_set(0)
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True)
    if complete:
        prior=json.loads((ROOT/'.dream-loop/overnight-mossling-anatomy-repair/v1/walk-candidate/motion-provenance.json').read_text());report['clips']['Walk']=prior['clips']['Walk']
        report['preservedWalkGLBSHA256']=prior['output_sha256'];author_misc(rig,mesh,rest,report)
    basename='mossling-complete' if complete else 'mossling-walk'
    bpy.ops.wm.save_as_mainfile(filepath=str(out/(basename+'.blend')))
    if report['clips'][clip_name]['maxReachClamp']>.008 or (complete and report['clips'][clip_name]['maxShoulderDropMeters']>.035):
        report['reachFailure']=True;(out/'motion-provenance.json').write_text(json.dumps(report,indent=2));print('Requested stride exceeds fitted chain reach; see report. No export.');return
    bpy.ops.export_scene.gltf(filepath=str(out/(basename+'.glb')),use_selection=True,export_format='GLB',export_yup=True,
        export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_step=1,export_anim_slide_to_zero=True,export_def_bones=True)
    report['output_sha256']=hashlib.sha256((out/(basename+'.glb')).read_bytes()).hexdigest()
    (out/'motion-provenance.json').write_text(json.dumps(report,indent=2));print(json.dumps({'sha256':report['output_sha256'],'maxReachClamp':report['clips'][clip_name]['maxReachClamp']}))

def author_misc(rig,mesh,rest,report):
    folder=ROOT/'.dream-loop/overnight-mossling-anatomy-repair/v1/full-donor'
    sources={name:json.loads((folder/file).read_text()) for name,file in [('Idle','donor-idle-samples.json'),('Attack','donor-attack-samples.json'),('Hurt','donor-idle_hitreact_left-samples.json')]}
    def sample(data,name,phase):
        pos=max(0,min(120,phase*120));i=min(119,int(pos));t=pos-i;a=data['samples'][i]['bones'][name];b=data['samples'][i+1]['bones'][name]
        return Vector(a['head']).lerp(Vector(b['head']),t),Quaternion(a['rotationDelta']).slerp(Quaternion(b['rotationDelta']),t)
    def normalized(data,name,phase,axis=0):
        values=[Quaternion(s['bones'][name]['rotationDelta']).to_euler('XYZ')[axis] for s in data['samples']]
        lo,hi=min(values),max(values)
        if hi-lo<1e-5:return 0
        return (sample(data,name,phase)[1].to_euler('XYZ')[axis]-(lo+hi)/2)/((hi-lo)/2)
    for name,total in [('Idle',96),('Attack',28),('Hurt',18)]:
        data=sources[name];action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action
        proof={'seconds':total/40,'looping':name=='Idle','donorAction':data['action'],'samples':[]};report['clips'][name]=proof
        first=None
        for frame in range(total+1):
            phase=frame/total
            for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
            bpy.context.view_layer.update()
            shift=Vector((0,0,0));angles={n:0 for n in ['pelvis','spine','chest','neck','head','flower_back','tail_01','tail_02','tail_03']};yaw=0;offsets={}
            if name=='Idle':
                shift.z=-.003+.0025*normalized(data,'Back',phase)
                angles.update(pelvis=.15*normalized(data,'Back',phase),chest=.2*normalized(data,'Torso3',phase),neck=.4*normalized(data,'Neck2',phase),head=.9*normalized(data,'Head',phase),tail_01=.8*normalized(data,'Tail1',phase))
                yaw=1.6*normalized(data,'Head',phase,2)
            elif name=='Attack':
                source_phase=(phase/.55*.33) if phase<=.55 else ((1-phase)/.45*.33)
                source=sample(data,'IKFrontLeg.L',source_phase)[0];origin=Vector(data['samples'][0]['bones']['IKFrontLeg.L']['head'])
                reach=max(0,min(1,(origin.y-source.y)/.5337));arc=max(0,min(1,(source.z-origin.z)/.269))
                preload=smooth(0,.14,phase)*(1-smooth(.18,.27,phase));flight=smooth(.21,.35,phase)*(1-smooth(.46,.61,phase))
                shift.y=.012*preload-.065*reach;shift.z=-.022*preload+.038*flight
                angles.update(pelvis=-.7*preload+.5*flight,chest=-1.0*reach,neck=-2.0*reach,head=-5.0*reach,tail_01=2.0*reach)
                for side in ['L','R']:
                    offsets[f'front_paw.{side}']=Vector((0,-.100*reach,.040*arc+.033*flight))
                    offsets[f'rear_paw.{side}']=Vector((0,-.030*flight,.027*flight))
            else:
                q=sample(data,'Head',phase)[1];values=[Quaternion(s['bones']['Head']['rotationDelta']).angle for s in data['samples']]
                recoil=q.angle/max(max(values),1e-6);recoil*=smooth(0,.06,phase)*(1-smooth(.70,1,phase))
                shift.y=.037*recoil;shift.z=-.008*recoil
                angles.update(pelvis=-1.0*recoil,chest=-.5*recoil,neck=1.5*recoil,head=4.5*recoil,tail_01=-1.7*recoil);yaw=-3.5*recoil
            if name!='Idle' and frame in (0,total):shift=Vector((0,0,0));angles={n:0 for n in angles};yaw=0;offsets={}
            for bone_name,angle in angles.items():
                bone=rig.pose.bones[bone_name];parent=bone.parent;inherited=parent.matrix@rest[parent.name].inverted() if parent else Matrix.Identity(4)
                rotation=Quaternion((1,0,0),math.radians(angle))
                if bone_name=='head':rotation=rotation@Quaternion((0,0,1),math.radians(yaw))
                matrix=(inherited.to_quaternion()@rotation).to_matrix().to_4x4()@rest[bone_name].to_quaternion().to_matrix().to_4x4();matrix.translation=inherited@rig.data.bones[bone_name].head_local
                if bone_name=='pelvis':matrix.translation+=shift
                bone.matrix=matrix;bpy.context.view_layer.update()
            entry={'phase':phase,'bodyShift':list(shift),'maxReachClamp':0,'paws':{}}
            for family,parent in [('front','chest'),('rear','pelvis')]:
                for side in ['L','R']:
                    paw=f'{family}_paw.{side}';names=[f'{family}_{n}.{side}' for n in (['upper','lower','paw'] if family=='front' else ['thigh','shin','metatarsal','paw'])]
                    points=[rig.data.bones[n].head_local.copy() for n in names]+[rig.data.bones[names[-1]].tail_local.copy()]
                    parent_delta=rig.pose.bones[parent].matrix@rest[parent].inverted();start=parent_delta@points[0];ankle=points[-2]+offsets.get(paw,Vector((0,0,0)))
                    target=ankle if family=='front' else ankle+points[2]-points[3]
                    middle,clamp=two_link(start,target,points[1],points[0],points[2],(points[1]-points[0]).length,(points[2]-points[1]).length,parent_delta.to_quaternion())
                    posed=([start,middle,ankle] if family=='front' else [start,middle,target,ankle]);posed.append(ankle+points[-1]-points[-2])
                    for i,bone_name in enumerate(names):set_bone(rig,bone_name,posed[i],posed[i+1])
                    entry['maxReachClamp']=max(entry['maxReachClamp'],clamp);entry['paws'][paw]={'target':list(ankle),'stance':offsets.get(paw,Vector()).z<.002}
            entry['shoulderDropMeters']=max(rig.data.bones[n].head_local.z-rig.pose.bones[n].head.z for n in ['front_upper.L','front_upper.R'])
            if frame==0:first={b.name:b.matrix_basis.copy() for b in rig.pose.bones}
            if frame==total:
                for bone in rig.pose.bones:bone.matrix_basis=first[bone.name]
            for bone in rig.pose.bones:
                for property in ['location','rotation_quaternion','scale']:bone.keyframe_insert(property,frame=frame,group=bone.name)
            proof['samples'].append(entry)
        proof['maxReachClamp']=max(s['maxReachClamp'] for s in proof['samples']);proof['maxShoulderDropMeters']=max(s['shoulderDropMeters'] for s in proof['samples'])
        if proof['maxReachClamp']>.008:raise ValueError(f'{name} exceeds fitted limb reach: {proof["maxReachClamp"]}')
        for curve in action.fcurves:
            for key in curve.keyframe_points:key.interpolation='LINEAR'
    rig.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_start=0;bpy.context.scene.frame_end=96;bpy.context.scene.frame_set(0)

def diagnose(out):
    source=ROOT/'.dream-loop/overnight-mossling-anatomy-repair/v1/anatomical-fit/mossling-anatomy-three-poses.blend'
    bpy.ops.wm.open_mainfile(filepath=str(source))
    rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');mesh=bpy.data.objects[MESH_NAME]
    palette={'pelvis':(.04,.62,.70,1),'spine':(.10,.70,.36,1),'chest':(.10,.70,.36,1),
             'neck':(.32,.42,.38,1),'head':(.38,.42,.40,1),'flower_back':(.92,.92,.92,1),
             'tail_01':(.30,.34,.30,1),'tail_02':(.30,.34,.30,1),'tail_03':(.30,.34,.30,1)}
    for side in ['L','R']:
        for name,color in [('front_upper',(1,.02,.02,1)),('front_lower',(1,.36,.02,1)),('front_paw',(1,.88,.02,1)),
                           ('rear_thigh',(.75,.06,.85,1)),('rear_shin',(.05,.26,1,1)),('rear_metatarsal',(.18,.07,.48,1)),('rear_paw',(.65,.42,.98,1))]:
            palette[f'{name}.{side}']=color
    attr=mesh.data.color_attributes.new(name='Anatomical influence diagnosis',type='FLOAT_COLOR',domain='POINT')
    mesh.data.color_attributes.active_color=attr
    for vertex in mesh.data.vertices:
        color=[0.,0.,0.,1.]
        for group in vertex.groups:
            c=palette.get(mesh.vertex_groups[group.group].name,(.2,.2,.2,1))
            for axis in range(3):color[axis]+=c[axis]*group.weight
        attr.data[vertex.index].color=color
    camera=bpy.context.scene.camera
    report={'source':str(source),'glbSHA256':'812bc2968a610897b5879c8e4afcfae5d647ac319302c287a4429aa7ea748509','palette':palette,'poses':{}}
    for name in ['neutral','loaded','gathered']:
        settings=pose(rig,name);bones={}
        for bone in rig.pose.bones:
            rest=rig.data.bones[bone.name]
            delta=bone.matrix@rest.matrix_local.inverted()
            bones[bone.name]={'head':list(bone.head),'tail':list(bone.tail),
                             'headDeltaMeters':list(bone.head-rest.head_local),
                             'globalRotationDeltaDegrees':math.degrees(delta.to_quaternion().angle),
                             'basisLocation':list(bone.location),'basisQuaternion':list(bone.rotation_quaternion),
                             'basisScale':list(bone.scale),'poseMatrix':[list(row) for row in bone.matrix]}
        spans={}
        for a,b in [('chest','pelvis'),('front_upper.L','rear_thigh.L'),('front_upper.R','rear_thigh.R')]:
            spans[f'{a}_to_{b}']={'restMeters':(rig.data.bones[a].head_local-rig.data.bones[b].head_local).length,
                                  'posedMeters':(rig.pose.bones[a].head-rig.pose.bones[b].head).length}
        report['poses'][name]={'settings':settings,'boneTransforms':bones,'attachmentDistances':spans}
        bpy.context.scene.display.shading.color_type='VERTEX'
        render(out,camera,f'influence-{name}',['side','three-quarter'])
    (out/'pose-transform-diagnosis.json').write_text(json.dumps(report,indent=2))
    print('Diagnostic influence renders and exact pose transforms complete; no source/GLB changes.')

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--stage',choices=['inspect','repair','diagnose','moderate','heat','proxy','proxy-review','proxy-head','proxy-head-review','head-constraint','head-owned-review','walk-donor','walk','full-donor','full'],default='inspect')
    parser.add_argument('--output-dir',required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    out=Path(args.output_dir).resolve()
    if out.exists():raise ValueError('Use a fresh study output directory')
    out.mkdir(parents=True)
    {'inspect':inspect,'repair':repair,'diagnose':diagnose,'moderate':moderate_pose,'heat':lambda target:moderate_pose(target,heat=True),'proxy':lambda target:moderate_pose(target,heat='proxy'),'proxy-review':proxy_review,'proxy-head':lambda target:moderate_pose(target,heat='proxy-head'),'proxy-head-review':lambda target:proxy_review(target,head_fit=True),'head-constraint':lambda target:moderate_pose(target,heat='head-constraint'),'head-owned-review':lambda target:proxy_review(target,head_fit='owned'),'walk-donor':walk_donor,'walk':author_walk,'full-donor':lambda target:[walk_donor(target,name) for name in ['Gallop','Idle','Attack','Idle_HitReact_Left']],'full':lambda target:author_walk(target,complete=True)}[args.stage](out)
