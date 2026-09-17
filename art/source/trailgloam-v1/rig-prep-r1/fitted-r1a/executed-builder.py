"""Root-owned fitted probe: preserved surface, explicit weights, fixed-length IK.
CPU Blender authoring/export only. No inference, remesh or runtime integration.
"""
import bpy, sys, json, math, hashlib, struct
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path.cwd()
BASE=ROOT/'art/source/trailgloam-v1/rig-prep-r1'
D=json.loads((BASE/'landmarks.json').read_text())
SRC=ROOT/D['source']['path']
OUT=BASE/'fitted-r1a'
assert hashlib.sha256(SRC.read_bytes()).hexdigest()==D['source']['sha256']
assert not OUT.exists(), 'Preserve completed or partial attempts'
OUT.mkdir()
S=D['scale']['uniform']; SHIFT=D['scale']['ground_shift_z']
def metric(p): return Vector((p[0]*S,p[1]*S,p[2]*S+SHIFT))
def clamp(x,a=0,b=1): return max(a,min(b,x))
def segment(p,a,b):
    v=b-a; t=clamp((p-a).dot(v)/v.length_squared)
    return (p-a-v*t).length, t
def digest_values(rows): return hashlib.sha256(json.dumps(rows,separators=(',',':')).encode()).hexdigest()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SRC))
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
assert list(mesh.matrix_world)==list(Matrix.Identity(4)), 'Unexpected source transform'
raw=[v.co.copy() for v in mesh.data.vertices]
uv_before=digest_values([list(x.uv) for x in mesh.data.uv_layers.active.data])
indices_before=digest_values([list(p.vertices) for p in mesh.data.polygons])
for v,p in zip(mesh.data.vertices,raw): v.co=metric(p)
metric_before=digest_values([list(v.co) for v in mesh.data.vertices])
mesh.name='TrailgloamSkin'
chains={}
for leg in D['legs']:
    chains[leg['id']]={
        'points':[metric(leg['attachment_root_provisional']),metric(leg['knee']),metric(leg['ankle']),metric([*leg['sole']['target_xy'],leg['sole']['z']])],
        'raw':[Vector(leg['attachment_root_provisional']),Vector(leg['knee']),Vector(leg['ankle']),Vector([*leg['sole']['target_xy'],leg['sole']['z']])],
        'bones':[leg['id']+'_'+tag for tag in ('upper','lower','foot')],
    }
bpy.ops.object.armature_add(enter_editmode=True)
rig=bpy.context.object;rig.name='TrailgloamRig';eb=rig.data.edit_bones
eb.remove(eb[0])
def bone(name,a,b,parent=None):
    q=eb.new(name);q.head=a;q.tail=b
    if parent:q.parent=eb[parent]
    return q
bone('root',(0,0,0),(0,0,.15))
bp=metric(D['body']['pivot']);bone('body',bp,bp+Vector((0,0,.15)),'root')
hp=metric(D['body']['head']['pivot']);bone('head',hp,hp+Vector((0,-.1,0)),'body')
for c in chains.values():
    parent='body'
    for name,a,b in zip(c['bones'],c['points'],c['points'][1:]):
        bone(name,a,b,parent);parent=name
for f in D['fronds']:bone('frond_'+f['id'],metric(f['root']),metric(f['tip']),'body')
bpy.ops.object.mode_set(mode='OBJECT')
mesh.parent=rig
mod=mesh.modifiers.new('Fitted skin','ARMATURE');mod.object=rig
groups={b.name:mesh.vertex_groups.new(name=b.name) for b in rig.data.bones if b.name!='root'}
coverage={n:0 for n in groups};sole_ids={n:[] for n in chains};stored_weights=[]
for i,p in enumerate(raw):
    weights={'body':1.0}
    candidates=[]
    for name,c in chains.items():
        a,k,h,sole=c['raw']
        ds=[segment(p,a,k)[0],segment(p,k,h)[0],segment(p,h,sole)[0]]
        candidates.append((min(ds),name,ds))
    dist,name,ds=min(candidates)
    c=chains[name];a,k,h,sole=c['raw'];upper,lower,foot=c['bones']
    # Distal volumes belong to one nearest anatomical chain. Never accumulate
    # separate weights in eight overlapping assignment loops.
    if dist<.12 and p.z<.055:
        ankle_mix=clamp((h.z+.037-p.z)/.06)
        knee_dist=(p-k).length
        shaft=upper if ds[0]<ds[1] else lower
        weights={shaft:1.0}
        if knee_dist<.052:
            t=clamp((p-a).dot((h-a).normalized())/(h-a).length)
            weights={upper:1-t,lower:t}
        if ankle_mix>0:
            weights={n:w*(1-ankle_mix) for n,w in weights.items()}
            weights[foot]=ankle_mix
        # Rigid hoof core, smooth ankle transition.
        if p.z<h.z-.008 and math.hypot(p.x-h.x,p.y-h.y)<.125:weights={foot:1.0}
        blend=clamp(1-(p-a).length/.11)
        weights={n:w*(1-blend) for n,w in weights.items()};weights['body']=blend
    if p.y<-.295 and abs(p.x)<.145 and p.z>-.12:
        t=clamp((-.295-p.y)/.05);weights={'head':t,'body':1-t}
    for f in D['fronds']:
        aF,bF=Vector(f['root']),Vector(f['tip'])
        if p.z>.13 and segment(p,aF,bF)[0]<.09 and p.x*aF.x>0:
            t=clamp((p.z-.13)/.025);weights={'frond_'+f['id']:t,'body':1-t}
    weights={n:w for n,w in weights.items() if w>1e-6};total=sum(weights.values())
    weights={n:w/total for n,w in weights.items()}
    assert 1<=len(weights)<=4 and abs(sum(weights.values())-1)<1e-6
    for n,w in weights.items():groups[n].add([i],w,'REPLACE');coverage[n]+=1
    stored_weights.append(weights)
    if weights.get(foot,0)>.999 and p.z<sole.z+.003:sole_ids[name].append(i)
assert all(coverage[n]>0 for n in groups),coverage
assert all(len(v)>0 for v in sole_ids.values()),{n:len(v) for n,v in sole_ids.items()}
for v in mesh.data.vertices:
    assert len(v.groups)<=4 and abs(sum(g.weight for g in v.groups)-1)<1e-5
rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
def reset():
    for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4);pb.rotation_mode='QUATERNION'
    bpy.context.view_layer.update()
def setbone(name,head,tail):
    b=rig.data.bones[name]
    q=(b.tail_local-b.head_local).rotation_difference(tail-head)
    m=q.to_matrix().to_4x4()@rest[name].to_quaternion().to_matrix().to_4x4();m.translation=head
    rig.pose.bones[name].matrix=m;bpy.context.view_layer.update()
def solve(name,offset,lift,drop):
    c=chains[name];a,k,h,sole=c['points'];start=a+Vector((0,0,drop))
    target=h+Vector((0,offset,lift-sole.z))
    l1=(k-a).length;l2=(h-k).length;line=target-start;distance=line.length
    d=clamp(distance,abs(l1-l2)+1e-6,l1+l2-1e-6);direction=line.normalized()
    pole=k-a-(h-a).normalized()*(k-a).dot((h-a).normalized())
    pole=(pole-direction*pole.dot(direction)).normalized()
    along=(l1*l1-l2*l2+d*d)/(2*d)
    mid=start+direction*along+pole*math.sqrt(max(0,l1*l1-along*along))
    actual=start+direction*d
    for bn,p0,p1 in zip(c['bones'],[start,mid,actual],[mid,actual,actual+sole-h]):setbone(bn,p0,p1)
    return {'reachClamp':abs(distance-d),'targetSoleZ':lift,'actualSoleZ':(actual+sole-h).z}

scene=bpy.context.scene;scene.render.fps=30
actions={};pose_receipts={};A=set(D['gait']['stance_group_a'])
for clip,frames in [('Neutral',1),('Loaded',1),('WalkDiagnostic',33)]:
    action=bpy.data.actions.new(clip);action.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=action;actions[clip]=action
    records=[]
    for frame in range(frames+1):
        reset();phase=frame/frames;drop=0 if clip=='Neutral' else -.08
        rig.pose.bones['body'].matrix=Matrix.Translation((0,0,drop))@rest['body'];bpy.context.view_layer.update()
        record={'phase':phase,'feet':{}}
        if clip!='Neutral':
            for name in chains:
                q=(phase+(0 if name in A else .5))%1
                offset=0;lift=0;stance=True
                if clip=='WalkDiagnostic':
                    if q<.6:offset=-.07+.14*q/.6
                    else:
                        t=(q-.6)/.4;offset=.07-.14*(t*t*(3-2*t));lift=.055*math.sin(math.pi*t);stance=False
                record['feet'][name]={'stance':stance,**solve(name,offset,lift,drop)}
        for pb in rig.pose.bones:
            for prop in ('location','rotation_quaternion','scale'):pb.keyframe_insert(prop,frame=frame,group=pb.name)
        records.append(record)
    for curve in action.fcurves:
        for point in curve.keyframe_points:point.interpolation='LINEAR'
    pose_receipts[clip]=records
assert max(r['reachClamp'] for rows in pose_receipts.values() for row in rows for r in row['feet'].values())<1e-5,'All foot targets must be reachable without clamping'
assert uv_before==digest_values([list(x.uv) for x in mesh.data.uv_layers.active.data])
assert indices_before==digest_values([list(p.vertices) for p in mesh.data.polygons])
assert metric_before==digest_values([list(v.co) for v in mesh.data.vertices])
rig.animation_data.action=actions['Neutral'];scene.frame_set(0);scene.frame_start=0;scene.frame_end=33
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'trailgloam-fitted.blend'))
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
GLB=OUT/'trailgloam-fitted.glb'
bpy.ops.export_scene.gltf(filepath=str(GLB),use_selection=True,export_format='GLB',export_yup=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_step=1,export_anim_slide_to_zero=True)
blob=GLB.read_bytes();length=struct.unpack_from('<I',blob,12)[0];gltf=json.loads(blob[20:20+length])
clips={a['name']:{'start':min(gltf['accessors'][s['input']]['min'][0] for s in a['samplers']),'end':max(gltf['accessors'][s['input']]['max'][0] for s in a['samplers'])} for a in gltf.get('animations',[])}
assert set(clips)==set(actions),clips
assert all(abs(v['start'])<1e-6 for v in clips.values())
assert abs(clips['WalkDiagnostic']['end']-1.1)<1e-5
expected_bones=len(rig.data.bones);expected_vertices=len(mesh.data.vertices)
report={'sourceSHA256':D['source']['sha256'],'builderSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'glbSHA256':hashlib.sha256(blob).hexdigest(),'uniformScale':S,'groundShift':SHIFT,'vertices':expected_vertices,'triangles':len(mesh.data.polygons),'bones':expected_bones,'coverage':coverage,'soleVertexCounts':{n:len(v) for n,v in sole_ids.items()},'sourceUVPreserved':True,'sourceTopologyPreserved':True,'onlyUniformGeometryTransform':True,'maxInfluences':max(len(w) for w in stored_weights),'clips':clips,'authoredWalkSpeed':.14/(.6*1.1),'diagnosticOnly':True,'poses':pose_receipts}
report['bodyDropM']=.08
(OUT/'build-receipt.json').write_text(json.dumps(report,indent=2))
# Fresh importer and actual evaluated surface, not live pre-export object refs.
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(GLB))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
assert len(rig.data.bones)==expected_bones
assert len(mesh.data.vertices)==expected_vertices
for track in rig.animation_data.nla_tracks:track.mute=True
acts={a.name:a for a in bpy.data.actions};assert set(actions)<=set(acts),list(acts)
roundtrip=[]
for clip in clips:
    rig.animation_data.action=acts[clip]
    if acts[clip].slots:rig.animation_data.action_slot=acts[clip].slots[0]
    first,last=acts[clip].frame_range
    for phase in ([0] if clip!='WalkDiagnostic' else [i/8 for i in range(9)]):
        f=first+(last-first)*phase;scene=bpy.context.scene;scene.frame_set(int(f),subframe=f-int(f));bpy.context.view_layer.update()
        ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());points=[ev.matrix_world@v.co for v in ev.data.vertices]
        assert all(math.isfinite(c) for p in points for c in p)
        mn=[min(p[i] for p in points) for i in range(3)];mx=[max(p[i] for p in points) for i in range(3)]
        assert max(mx[i]-mn[i] for i in range(3))<2.8,(clip,phase,mn,mx)
        feet={}
        for name in chains:
            group=mesh.vertex_groups.get(name+'_foot');ids=[v.index for v in mesh.data.vertices if any(g.group==group.index and g.weight>.99 for g in v.groups)]
            pts=[points[i] for i in ids];feet[name]={'minZ':min(p.z for p in pts),'center':list(sum(pts,Vector())/len(pts))}
        roundtrip.append({'clip':clip,'phase':phase,'bounds':[mn,mx],'feet':feet})
walk=[r for r in roundtrip if r['clip']=='WalkDiagnostic']
assert all(max(r['feet'][n]['center'][1] for r in walk)-min(r['feet'][n]['center'][1] for r in walk)>.06 for n in chains),'Legs must actually move'
report['roundtrip']={'boneCount':len(rig.data.bones),'vertexCount':len(mesh.data.vertices),'actions':list(acts),'samples':roundtrip}
(OUT/'build-receipt.json').write_text(json.dumps(report,indent=2))
print('FITTED_DIAGNOSTIC_COMPLETE',report['glbSHA256'])
