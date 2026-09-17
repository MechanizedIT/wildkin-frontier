"""Experimental full-body Quaternius Wolf motion transfer to the liked Mossling.

Runs in Blender; writes only a fresh --output-dir. Authored evaluated donor
poses supply body mechanics and paw paths. No oscillator generates the gait.
Target two-segment IK adapts those paths to the short Mossling limbs. This is
an anatomy-specific experiment and requires independent exported visual review.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import shutil
import sys
from pathlib import Path
import bpy
from mathutils import Matrix, Quaternion, Vector

FPS = 60
PAWS = ('front_paw.L', 'front_paw.R', 'rear_paw.L', 'rear_paw.R')
BODY = {'pelvis': 'Back', 'spine': 'Torso', 'chest': 'Torso3',
        'neck': 'Neck2', 'head': 'Head', 'tail_01': 'Tail1',
        'tail_02': 'Tail3', 'tail_03': 'Tail5'}
CONFIG = {'Walk': {'donor': 'Walk', 'frames': 48, 'stride_scale': .25,
                   'vertical_scale': .30, 'body_scale': .35, 'crouch': .065},
          'Run': {'donor': 'Gallop', 'frames': 28, 'stride_scale': .22,
                  'vertical_scale': .29, 'body_scale': .34, 'crouch': .075}}

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def reset(rig):
    rig.animation_data.action = None
    for b in rig.pose.bones:
        b.matrix_basis = Matrix.Identity(4)
        b.rotation_mode = 'QUATERNION'
    bpy.context.view_layer.update()

def donor_name(paw):
    return ('IKFrontLeg' if paw.startswith('front') else 'IKBackLeg') + paw[-2:]

def sample_donor(path):
    bpy.ops.wm.open_mainfile(filepath=str(path))
    rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    for t in list(rig.animation_data.nla_tracks):
        rig.animation_data.nla_tracks.remove(t)
    names = set(BODY.values()) | {donor_name(p) for p in PAWS}
    rest = {n: rig.data.bones[n].matrix_local.copy() for n in names}
    result = {}
    for name, cfg in CONFIG.items():
        action = bpy.data.actions[cfg['donor']]
        rig.animation_data.action = action
        start, end = action.frame_range
        samples = []
        for f in range(cfg['frames'] + 1):
            t = start + (end-start)*f/cfg['frames']
            bpy.context.scene.frame_set(int(t), subframe=t-int(t))
            samples.append({n: rig.pose.bones[n].matrix.copy() for n in names})
        result[name] = samples
    return rest, result

def components(mesh):
    parents = list(range(len(mesh.data.vertices)))
    def find(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]
            i = parents[i]
        return i
    def union(a,b):
        parents[find(a)] = find(b)
    positions = {}
    for v in mesh.data.vertices:
        key = tuple(round(c / 1e-5) for c in v.co)
        if key in positions:
            union(v.index, positions[key])
        positions[key] = v.index
    for e in mesh.data.edges:
        union(*e.vertices)
    groups = {}
    for v in mesh.data.vertices:
        groups.setdefault(find(v.index), []).append(v)
    return list(groups.values())

def rigid(mesh, ids, name):
    for g in mesh.vertex_groups:
        g.remove(ids)
    mesh.vertex_groups[name].add(ids, 1, 'REPLACE')

def fit_rig(rig, meshes):
    reset(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    eb = rig.data.edit_bones
    pelvis = eb.new('pelvis'); pelvis.head = (0,.3886,.5591); pelvis.tail=(0,.1,.59); pelvis.parent=eb['root']
    chest = eb.new('chest'); chest.head=(0,-.2159,.58785); chest.tail=(0,-.35,.70); chest.parent=eb['spine']
    eb['spine'].parent=pelvis
    for n in ('tail_01','rear_upper.L','rear_upper.R'):
        eb[n].parent=pelvis
    for n in ('neck','front_upper.L','front_upper.R'):
        eb[n].parent=chest
    bpy.ops.object.mode_set(mode='OBJECT')
    report=[]
    for mesh in meshes:
        for n in ('pelvis','chest'):
            mesh.vertex_groups.new(name=n)
        for v in mesh.data.vertices:
            pos=mesh.matrix_world@v.co
            old=[(mesh.vertex_groups[g.group].name,g.weight) for g in v.groups]
            weights={}
            for n,w in old:
                if n=='root': n='pelvis'
                if n=='spine':
                    # Distribute the old single-body owner across real hip/chest supports.
                    blend=max(0,min(1,(pos.y+.20)/.53))
                    weights['pelvis']=weights.get('pelvis',0)+w*blend
                    weights['chest']=weights.get('chest',0)+w*(1-blend)
                else: weights[n]=weights.get(n,0)+w
            chosen=sorted(weights.items(),key=lambda x:-x[1])[:4]
            for g in mesh.vertex_groups: g.remove([v.index])
            total=sum(w for _,w in chosen)
            for n,w in chosen: mesh.vertex_groups[n].add([v.index],w/total,'REPLACE')
        for vs in components(mesh):
            if len(vs)>1500: continue
            center=sum((mesh.matrix_world@v.co for v in vs),Vector())/len(vs)
            if center.z<.50: continue
            if center.y<-.25 and center.z>.75: owner='head'
            elif -.10<center.y<.50: owner='pelvis'
            else: continue
            rigid(mesh,[v.index for v in vs],owner)
            report.append({'vertices':len(vs),'center':list(center),'owner':owner})
        # The central flower is connected to the main generated surface. Protect
        # its complete crown region, not just disconnected leaf components.
        ids=[v.index for v in mesh.data.vertices if -.03<(mesh.matrix_world@v.co).y<.47 and (mesh.matrix_world@v.co).z>.565]
        rigid(mesh,ids,'pelvis')
        report.append({'region':'back mantle and connected flower crown','vertices':len(ids),'owner':'pelvis'})
        for paw in PAWS:
            group=mesh.vertex_groups[paw]
            vertices=[v for v in mesh.data.vertices if any(g.group==group.index and g.weight>.5 for g in v.groups)]
            bottom=min((mesh.matrix_world@v.co).z for v in vertices)
            rigid(mesh,[v.index for v in vertices if (mesh.matrix_world@v.co).z<bottom+.075],paw)
    return report

def segment(bone, head, tail):
    rest=bone.bone
    q=(rest.tail_local-rest.head_local).rotation_difference(tail-head)
    m=q.to_matrix().to_4x4()@rest.matrix_local.to_quaternion().to_matrix().to_4x4()
    m.translation=head
    bone.matrix=m
    bpy.context.view_layer.update()

def limb(rig,paw,target,rest):
    upper=rig.pose.bones[paw.replace('paw','upper')]
    lower=rig.pose.bones[paw.replace('paw','lower')]
    origin=upper.head.copy(); d=target-origin; distance=d.length
    a,b=upper.bone.length,lower.bone.length
    # Reach correction is reported rather than silently stretching deform bones.
    excess=max(0,distance-(a+b-.002))
    distance=min(a+b-.002,max(abs(a-b)+.002,distance)); d.normalize()
    target=origin+d*distance
    pole=Vector((0,1 if paw.startswith('front') else -1,0));pole-=d*pole.dot(d);pole.normalize()
    along=(a*a-b*b+distance*distance)/(2*distance)
    joint=origin+d*along+pole*math.sqrt(max(0,a*a-along*along))
    segment(upper,origin,joint);segment(lower,joint,target)
    m=rest[paw].copy();m.translation=target;rig.pose.bones[paw].matrix=m
    bpy.context.view_layer.update()
    return excess

def key_all(rig,frame):
    for bone in rig.pose.bones:
        bone.keyframe_insert('location',frame=frame,group=bone.name)
        bone.keyframe_insert('rotation_quaternion',frame=frame,group=bone.name)
        bone.keyframe_insert('scale',frame=frame,group=bone.name)

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--input',type=Path,required=True);ap.add_argument('--donor',type=Path,required=True)
    ap.add_argument('--output-dir',type=Path,required=True)
    args=ap.parse_args(sys.argv[sys.argv.index('--')+1:])
    args.input=args.input.resolve();args.donor=args.donor.resolve();out=args.output_dir.resolve();out.mkdir(parents=True,exist_ok=False)
    donor_rest,donor_samples=sample_donor(args.donor)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(args.input))
    rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
    for t in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(t)
    preserved={}
    for name in ('Idle','Attack','Hurt'):
        action=bpy.data.actions.get(name)
        if not action:continue
        rig.animation_data.action=action
        start,end=action.frame_range;frames=round((end-start)/24*FPS)
        preserved[name]=[]
        for f in range(frames+1):
            t=start+(end-start)*f/frames;bpy.context.scene.frame_set(int(t),subframe=t-int(t))
            preserved[name].append({b.name:b.matrix.copy() for b in rig.pose.bones})
    reset(rig)
    for a in list(bpy.data.actions):bpy.data.actions.remove(a)
    attachments=fit_rig(rig,meshes)
    rest={b.name:b.bone.matrix_local.copy() for b in rig.pose.bones}
    bpy.context.scene.render.fps=FPS
    report={'input_sha256':sha(args.input),'donor_sha256':sha(args.donor),'method':'evaluated authored Wolf body and IK paw motion, anatomy-scaled onto a fitted pelvis/chest target rig','settings':CONFIG,'attachments':attachments,'clips':{}}
    for name,samples in preserved.items():
        reset(rig);action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action
        for f,pose in enumerate(samples):
            for b in sorted(rig.pose.bones,key=lambda b:len(b.parent_recursive)):
                if b.name in pose:b.matrix=pose[b.name]
                elif b.name=='pelvis':b.matrix=pose['root']@rest['root'].inverted()@rest['pelvis']
                elif b.name=='chest':b.matrix=pose['spine']@rest['spine'].inverted()@rest['chest']
                bpy.context.view_layer.update()
            key_all(rig,f)
    for name,cfg in CONFIG.items():
        reset(rig);action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action
        measures=[]
        for f,sample in enumerate(donor_samples[name]):
            for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
            for target,source in BODY.items():
                ds=donor_rest[source];pose=sample[source]
                delta=pose.to_quaternion()@ds.to_quaternion().inverted()
                # Preserve the tall leaf-tail silhouette while carrying authored lag.
                if target.startswith('tail'):delta=Quaternion().slerp(delta,.4)
                m=delta.to_matrix().to_4x4()@rest[target].to_quaternion().to_matrix().to_4x4()
                if target=='pelvis':
                    shift=(pose.translation-ds.translation)*cfg['body_scale']
                    shift.x*=.5
                    m.translation=rest[target].translation+shift+Vector((0,0,-cfg['crouch']))
                else:
                    # Transfer authored global rotation but keep each attachment
                    # on the fitted target chain. Independent absolute donor
                    # translations would stretch the short neck between poses.
                    parent={'spine':'pelvis','chest':'pelvis','neck':'chest','head':'neck',
                            'tail_01':'pelvis','tail_02':'tail_01','tail_03':'tail_02'}[target]
                    parent_deform=rig.pose.bones[parent].matrix@rest[parent].inverted()
                    m.translation=parent_deform@rest[target].translation
                rig.pose.bones[target].matrix=m;bpy.context.view_layer.update()
            entry={'frame':f,'paws':{},'max_reach_correction':0}
            for paw in PAWS:
                source=donor_name(paw);ds=donor_rest[source];pose=sample[source]
                shift=pose.translation-ds.translation
                target=rest[paw].translation+Vector((shift.x*.16,shift.y*cfg['stride_scale'],max(0,shift.z)*cfg['vertical_scale']))
                correction=limb(rig,paw,target,rest)
                entry['max_reach_correction']=max(entry['max_reach_correction'],correction)
                entry['paws'][paw]=list(rig.pose.bones[paw].head)
            measures.append(entry);key_all(rig,f)
        report['clips'][name]={'seconds':cfg['frames']/FPS,'max_reach_correction':max(m['max_reach_correction'] for m in measures),'samples':measures}
    for a in bpy.data.actions:
        for curve in a.fcurves:
            for k in curve.keyframe_points:k.interpolation='LINEAR'
    reset(rig);bpy.context.scene.frame_set(0)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'mossling-retarget.blend'))
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
    for mesh in meshes:mesh.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(out/'model.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_materials='EXPORT',export_force_sampling=True)
    report['output_sha256']=sha(out/'model.glb');report['script_sha256']=sha(__file__)
    license_path=args.donor.parent.parent/'License.txt'
    if license_path.exists():shutil.copyfile(license_path,out/'donor-License.txt');report['license_sha256']=sha(license_path)
    (out/'motion-provenance.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({k:{a:b for a,b in v.items() if a!='samples'} for k,v in report['clips'].items()}))

if __name__=='__main__':main()
