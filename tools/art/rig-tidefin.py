"""Bounded Tidefin anatomical rig/pose gate; no runtime gait library."""
import bpy, math, json, hashlib, argparse, sys, time
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree

def animate_tidefin(OUT,ROOT,action_review=False):
 import shutil
 source=ROOT/'.dream-loop/overnight-tidefin-rig/v2';expected='6463770dbe289bf48ab2610dd0ada9b7f00858f4c7fd7366b344f344f83e7669'
 assert hashlib.sha256((source/'tidefin-rig.glb').read_bytes()).hexdigest()==expected
 assert not(OUT/'tidefin-motion.glb').exists(),'Preserve prior animation study'
 bpy.ops.wm.open_mainfile(filepath=str(source/'rig-editable.blend'))
 rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];body=next(o for o in objects if o.name.startswith('Connected torso'));rig.animation_data_clear()
 for action in list(bpy.data.actions):bpy.data.actions.remove(action)
 def fingerprint(weighted=True):
  rows=[]
  for ob in objects:
   uv=ob.data.uv_layers.active.data
   for poly in ob.data.polygons:
    for li in poly.loop_indices:
     v=ob.data.vertices[ob.data.loops[li].vertex_index];ws=sorted((ob.vertex_groups[g.group].name,round(g.weight,7))for g in v.groups)if weighted else []
     rows.append((tuple(round(float(x),7)for x in (*v.co,*uv[li].uv)),ws))
  return hashlib.sha256(json.dumps(sorted(rows)).encode()).hexdigest()
 admitted_weights=fingerprint();geometry_before=fingerprint(False);closure=[]
 for cheek in [ob for ob in objects if 'cheek'in ob.name.lower()]:
  nn=len(cheek.data.vertices)//2
  for i in range(nn):
   root=cheek.data.vertices[i];outer=cheek.data.vertices[nn+i];before_weights={cheek.vertex_groups[g.group].name:g.weight for g in outer.groups};root_weights={cheek.vertex_groups[g.group].name:g.weight for g in root.groups}
   for group in cheek.vertex_groups:group.remove([outer.index])
   for name,w in root_weights.items():cheek.vertex_groups[name].add([outer.index],w,'REPLACE')
   closure.append({'object':cheek.name,'outerVertex':outer.index,'pairedRootVertex':i,'before':before_weights,'after':root_weights})
 (OUT/'cheek-weight-closure.json').write_text(json.dumps(closure,indent=2))
 assert fingerprint(False)==geometry_before
 before=fingerprint();rest={b.name:b.matrix_local.copy()for b in rig.data.bones};land=json.loads((ROOT/'.dream-loop/overnight-tidefin-model/model-v5/final/anatomy.json').read_text())['landmarksGameMeters']
 def B(p):return Vector((p[0],-p[2],p[1]))
 def G(p):return[p.x,p.z,-p.y]
 prefixes=['RightHind','RightFore','LeftHind','LeftFore'];chains={n:[n+'Upper',n+'Lower',n+'Paw']for n in prefixes};soleids={};solepoints={}
 for prefix in prefixes:
  center=B(land[prefix+'Paw']);ids=[v.index for v in body.data.vertices if abs(v.co.x-center.x)<.28 and abs(v.co.y-center.y)<.31 and abs(v.co.z)<.001];soleids[prefix]=ids;solepoints[prefix]=[body.data.vertices[i].co.copy()for i in ids]
 donorroot=ROOT/'.dream-loop/overnight-mossling-anatomy-repair/v1';donors={n:json.loads((donorroot/f).read_text())for n,f in [('Walk','walk-donor/donor-walk-samples.json'),('Run','full-donor/donor-gallop-samples.json')]};donornames=['IKBackLeg.R','IKFrontLeg.R','IKBackLeg.L','IKFrontLeg.L']
 phases={}
 for clip,d in donors.items():
  td=[d['paws'][n]['touchdownPhases'][0]for n in donornames];origin=td[0]if clip=='Walk'else td[2];phases[clip]=[(t-origin)%1 for t in td]
 configs={'Idle':{'seconds':3,'speed':0},'Walk':{'seconds':.75,'speed':.9,'duty':.56,'lift':.075},'Run':{'seconds':.50,'speed':3,'duty':.25,'lift':.12},'Attack':{'seconds':.75,'speed':0},'Hurt':{'seconds':.50,'speed':0}}
 report={'sourceRigSHA256':expected,'admittedSurfaceUVWeights':admitted_weights,'geometryUVBefore':geometry_before,'cheekClosure':'Only50 outer cheek vertices now share paired embedded-root weights; body/eyes/crest/sole weights unchanged','surfaceUVWeightsBefore':before,'method':'Fixed-length fitted Tidefin IK; retained CC0 Wolf touchdown order informs Walk/Run rhythm; authored constant-speed stance and Hermite recovery, not donor bone-Euler copying','donors':{n:{'source':d['source'],'sha256':d['sha256'],'action':d['action']}for n,d in donors.items()},'fps':60,'clips':{},'runtimeEdits':False,'motionReview':'PENDING independent cycle gate'}
 def reset():
  for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
  bpy.context.view_layer.update()
 def hinge(name,axis,angle):
  pb=rig.pose.bones[name];parent=pb.parent;inherited=parent.matrix@rest[parent.name].inverted()if parent else Matrix.Identity(4);m=pb.matrix.copy();head=m.translation.copy();m=Quaternion(axis,math.radians(angle)).to_matrix().to_4x4()@m;m.translation=head;pb.matrix=m;bpy.context.view_layer.update()
 def setbone(name,head,tail):
  b=rig.data.bones[name];q=(b.tail_local-b.head_local).rotation_difference(tail-head);m=q.to_matrix().to_4x4()@rest[name].to_quaternion().to_matrix().to_4x4();m.translation=head;rig.pose.bones[name].matrix=m;bpy.context.view_layer.update()
 def solve(prefix,offset,lift,roll):
  names=chains[prefix];orig=[rig.data.bones[n].head_local.copy()for n in names]+[rig.data.bones[names[-1]].tail_local.copy()];parent=rig.pose.bones[names[0]].parent;delta=parent.matrix@rest[parent.name].inverted();start=delta@orig[0];sole=B(land[prefix+'Paw']);rotation=Quaternion((1,0,0),math.radians(roll));minz=min((rotation@(p-sole)).z for p in solepoints[prefix]);target=sole+Vector((0,-offset,lift-minz))+rotation@(orig[2]-sole)
  la=(orig[1]-orig[0]).length;lb=(orig[2]-orig[1]).length;line=target-start;dist=line.length;d=max(abs(la-lb)+1e-6,min(la+lb-1e-6,dist));direction=line.normalized();rl=(orig[2]-orig[0]).normalized();pole=orig[1]-orig[0]-rl*(orig[1]-orig[0]).dot(rl);pole=delta.to_quaternion()@pole.normalized();pole=(pole-direction*pole.dot(direction)).normalized();along=(la*la-lb*lb+d*d)/(2*d);mid=start+direction*along+pole*math.sqrt(max(0,la*la-along*along))
  error=abs(d-dist);assert error<1e-5,('REACH FAILURE',prefix,offset,lift,error)
  setbone(names[0],start,mid);setbone(names[1],mid,target);setbone(names[2],target,target+rotation@(orig[3]-orig[2]));return {'targetAnkleGame':G(target),'soleLift':lift,'rollDegrees':roll,'reachClamp':error}
 def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
 def pulse(p,a,b,c,d):return smooth((p-a)/(b-a))*(1-smooth((p-c)/(d-c)))
 scene=bpy.context.scene;scene.render.fps=60;actions={}
 for clip,cfg in configs.items():
  action=bpy.data.actions.new(clip);action.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=action;actions[clip]=action;frames=round(cfg['seconds']*60);samples=[];first=None
  for frame in range(frames+1):
   phase=frame/frames;p=phase%1 if clip in ('Idle','Walk','Run')else phase;reset();drop=0;forward=0;yaw=0;pitch=0;offsets={}
   if clip in ('Walk','Run'):
    drop=-.026+.002*math.cos(4*math.pi*p);pitch=(.45 if clip=='Walk'else .75)*math.sin(4*math.pi*p);yaw=.7*math.sin(2*math.pi*p)
    for i,prefix in enumerate(prefixes):
     q=(p-phases[clip][i])%1;duty=cfg['duty'];stroke=cfg['speed']*cfg['seconds']*duty
     if q<duty:offset=stroke/2-cfg['speed']*cfg['seconds']*q;lift=0;roll=0;stance=True
     else:
      r=(q-duty)/(1-duty);m=-.06 if clip=='Walk'else-.10;offset=(2*r**3-3*r*r+1)*(-stroke/2)+(r**3-2*r*r+r)*m+(-2*r**3+3*r*r)*(stroke/2)+(r**3-r*r)*m;lift=cfg['lift']*math.sin(math.pi*r)**1.35;roll=(8 if clip=='Walk'else 12)*math.sin(math.pi*r);stance=False
     offsets[prefix]=(offset,lift,roll,stance,q)
   elif clip=='Idle':drop=-.0025*(1-math.cos(2*math.pi*p));yaw=12*math.sin(2*math.pi*p);pitch=.35*math.sin(2*math.pi*p)
   elif clip=='Attack':
    prep=pulse(p,0,.20,.26,.40);strike=pulse(p,.30,.43,.53,.84);drop=-.014*prep-.008*strike;forward=-.012*prep+.050*strike;pitch=-4.5*strike+1.2*prep
   else:
    recoil=pulse(p,0,.15,.30,1);drop=-.01*recoil;forward=-.025*recoil;pitch=3.5*recoil;yaw=-4*recoil
   rig.pose.bones['Root'].matrix=Matrix.Translation(Vector((0,-forward,drop)))@rest['Root'];bpy.context.view_layer.update()
   hinge('Pelvis',(1,0,0),pitch*.25)
   if clip=='Attack':
    # Blender +X tips a -Y-facing muzzle down: lift to prepare, tip into release.
    hinge('Chest',(1,0,0),-3.5*prep+4*strike);hinge('Head',(1,0,0),-12*prep+12*strike)
   elif clip=='Hurt':
    # A raised, slightly lateral recoil contrasts with the attack's forward/down release.
    hinge('Chest',(1,0,0),-5*recoil);hinge('Head',(1,0,0),-9*recoil);hinge('Head',(0,1,0),4*recoil);yaw=-9*recoil
   else:
    hinge('Chest',(1,0,0),pitch*.25);hinge('Head',(1,0,0),pitch*(-.35 if clip in ('Walk','Run')else .65))
   hinge('Head',(0,0,1),yaw)
   # Head yaw is composed with its fitted inherited pose; tail response stays small.
   for name,amp in [('TailBase',3),('TailMid',4),('TailPaddle',2)]:hinge(name,(0,0,1),amp*math.sin(2*math.pi*p+(0 if name=='TailBase'else-.4)))
   sample={'phase':phase,'rootGame':[0,drop,forward],'paws':{}}
   for prefix in prefixes:
    offset,lift,roll,stance,q=offsets.get(prefix,(0,0,0,True,0));sample['paws'][prefix]={'stance':stance,'q':q,**solve(prefix,offset,lift,roll)}
   if frame==0:first={pb.name:pb.matrix_basis.copy()for pb in rig.pose.bones}
   if frame==frames and clip in ('Idle','Walk','Run'):
    for pb in rig.pose.bones:pb.matrix_basis=first[pb.name]
   for pb in rig.pose.bones:
    for prop in ('location','rotation_quaternion','scale'):pb.keyframe_insert(prop,frame=frame,group=pb.name)
   samples.append(sample)
  for curve in action.fcurves:
   for key in curve.keyframe_points:key.interpolation='LINEAR'
  report['clips'][clip]={**cfg,'frames':frames,'loop':clip in ('Idle','Walk','Run'),'touchdownPhases':dict(zip(prefixes,phases[clip]))if clip in phases else{},'samples':samples}
 report['surfaceUVWeightsAfter']=fingerprint();assert report['surfaceUVWeightsAfter']==before
 rig.animation_data.action=actions['Idle'];scene.frame_start=0;scene.frame_end=180;scene.frame_set(0)
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'tidefin-motion-editable.blend'))
 # Export one material/skin batch while retaining the named editable source above.
 bpy.ops.object.select_all(action='DESELECT')
 for ob in objects:ob.select_set(True)
 bpy.context.view_layer.objects.active=body;bpy.ops.object.join();body=bpy.context.object;body.name='TidefinSkin';objects=[body];assert fingerprint()==before
 rig.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/'tidefin-motion.glb'),use_selection=True,export_format='GLB',export_yup=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_step=1,export_anim_slide_to_zero=True,export_def_bones=True)
 report['outputSHA256']=hashlib.sha256((OUT/'tidefin-motion.glb').read_bytes()).hexdigest();(OUT/'motion-provenance.json').write_text(json.dumps(report,indent=2))
 # Exact exported skin sampling and modest whole-cycle picture set.
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(OUT/'tidefin-motion.glb'));rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');body=next(o for o in bpy.context.scene.objects if o.type=='MESH');rig.animation_data_create()
 for track in rig.animation_data.nla_tracks:track.mute=True
 exported={n:next(a for a in bpy.data.actions if a.name==n)for n in configs}
 def select(clip,p):
  action=exported[clip];rig.animation_data.action=action
  if action.slots:rig.animation_data.action_slot=action.slots[0]
  start,end=action.frame_range;frame=start+(end-start)*p;bpy.context.scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update()
 select('Idle',0);ids={}
 for prefix in prefixes:
  c=B(land[prefix+'Paw']);ids[prefix]=[v.index for v in body.data.vertices if abs(v.co.x-c.x)<.28 and abs(v.co.y-c.y)<.31 and abs(v.co.z)<.001]
 check={'sha256':report['outputSHA256'],'method':'Fresh GLB evaluated sole vertices, two translated cycles, actual interpolation samples','clips':{}}
 for clip in ['Walk','Run']:
  cfg=configs[clip];samples=[];segments={n:[]for n in prefixes};active={n:[]for n in prefixes}
  for i in range(241):
   elapsed=i/120;phase=elapsed%1;select(clip,phase);ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());m=ev.to_mesh();entry={'cyclePhase':elapsed,'paws':{}}
   for prefix in prefixes:
    pts=[ev.matrix_world@m.vertices[j].co for j in ids[prefix]];mean=sum(pts,Vector())/len(pts);q=(phase-phases[clip][prefixes.index(prefix)])%1;stance=q<cfg['duty'];worldz=-mean.y+cfg['speed']*cfg['seconds']*elapsed;entry['paws'][prefix]={'stance':stance,'minY':min(pt.z for pt in pts),'maxY':max(pt.z for pt in pts),'translatedZ':worldz,'worldX':mean.x}
    if stance:active[prefix].append((worldz,min(pt.z for pt in pts),max(pt.z for pt in pts)))
    elif active[prefix]:segments[prefix].append(active[prefix]);active[prefix]=[]
   ev.to_mesh_clear();samples.append(entry)
  for prefix in prefixes:
   if active[prefix]:segments[prefix].append(active[prefix])
  check['clips'][clip]={'settings':{k:cfg[k]for k in ('seconds','speed','duty')},'maximumStanceDrift':max(max(v[0]for v in seg)-min(v[0]for v in seg)for ss in segments.values()for seg in ss),'maximumPlantedAbsY':max(max(abs(v[1]),abs(v[2]))for ss in segments.values()for seg in ss for v in seg),'minimumSoleY':min(p['minY']for sample in samples for p in sample['paws'].values()),'samples':samples}
 (OUT/'actual-export-contact.json').write_text(json.dumps(check,indent=2))
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=4;scene.render.resolution_x=384;scene.render.resolution_y=384;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard'
 world=bpy.data.worlds.new('Neutral studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.66,.67,1);world.node_tree.nodes['Background'].inputs[1].default_value=.75;scene.world=world
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));floor=bpy.context.object;fm=bpy.data.materials.new('Floor');fm.diffuse_color=(.58,.59,.60,1);floor.data.materials.append(fm)
 def look(ob,target):ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
 for pos,power,size in[((-3,-4,6),700,5),((4,0,4),350,4)]:
  bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=power;light.data.size=size;look(light,(0,0,.7))
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=3.65;views={'side':(7,0,2),'front3q':(4,-6,2.65),'opposite':(-7,0,2),'front':(0,-7,2.2)}
 shots=([(clip,view,p)for clip,view,ps in [('Attack','front3q',[0,.20,.43,.70]),('Attack','side',[.20,.43]),('Hurt','front3q',[.15,.40,.80]),('Hurt','opposite',[.15])]for p in ps]if action_review else [('Idle','front',.25),('Idle','front',.75)]+[(clip,'side',i/8)for clip in ['Walk','Run']for i in range(9)]+[(clip,view,p)for clip,view,ps in [('Walk','front3q',[.125,.625]),('Run','opposite',[.125,.625]),('Attack','front3q',[.25,.50,.70]),('Hurt','front3q',[.25,.50])]for p in ps])
 rendered=[]
 for clip,view,phase in shots:
  select(clip,phase);cam.location=views[view];look(cam,(0,0,.72));large=action_review or clip=='Idle';scene.render.resolution_x=scene.render.resolution_y=512 if large else 384;scene.cycles.samples=20 if large else 12;name=f'{clip}-{view}-{phase:.3f}.png';scene.render.filepath=str(OUT/name);bpy.ops.render.render(write_still=True);rendered.append({'clip':clip,'view':view,'phase':phase,'file':name,'resolution':scene.render.resolution_x,'samples':scene.cycles.samples})
 (OUT/'render-evidence.json').write_text(json.dumps({'sha256':report['outputSHA256'],'views':rendered,'threads':4,'cycleResolution':384,'cycleSamples':12,'headCheckResolution':512,'headCheckSamples':20},indent=2));print('TIDEFIN_ANIMATION_COMPLETE',report['outputSHA256'])

p=argparse.ArgumentParser();p.add_argument('--output-dir',required=True);p.add_argument('--weights-only',action='store_true');p.add_argument('--animate',action='store_true');p.add_argument('--action-review',action='store_true')
args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);OUT=Path(args.output_dir).resolve();OUT.mkdir(parents=True,exist_ok=True)
ROOT=Path(__file__).resolve().parents[2]
if args.animate:animate_tidefin(OUT,ROOT,args.action_review);sys.exit(0)
SOURCE=ROOT/'.dream-loop/overnight-tidefin-model/model-v5/final'
EXPECTED='51e456355acb7155cfbe1e8bee210a4acccafd4ca295741bccb0c650c429d66d'
assert hashlib.sha256((SOURCE/'tidefin.glb').read_bytes()).hexdigest()==EXPECTED
assert not(OUT/'rig-editable.blend').exists(),'Preserve previous rig study'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'tidefin-editable.blend'))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];body=next(o for o in objects if o.name.startswith('Connected torso'))
landmarks=json.loads((SOURCE/'anatomy.json').read_text())['landmarksGameMeters']
def B(p):return Vector((p[0],-p[2],p[1]))
def G(p):return [p.x,p.z,-p.y]
def corner_hash(ob):
 rows=[];uv=ob.data.uv_layers.active.data
 for poly in ob.data.polygons:
  for li in poly.loop_indices:
   pt=ob.data.vertices[ob.data.loops[li].vertex_index].co
   rows.append(tuple(round(float(n),7)for n in (*pt,*uv[li].uv)))
 return hashlib.sha256(json.dumps(rows).encode()).hexdigest()
before={o.name:corner_hash(o)for o in objects}
report={'approvedSourceSHA256':EXPECTED,'method':'Fitted anatomical deform bones, native body heat with local cheek-support correction; rigid eyes, compatible cheek roots, transferred crest and locally supported soles','status':'UNADMITTED diagnostic pose gate only','geometryBefore':before}

# Every local bone Y axis follows its actual fitted joint segment. Roll aligned
# from lateral +X to keep mirrored sagittal bend planes coherent.
spec=[]
def bone(name,head,tail,parent=None,deform=True):spec.append((name,B(head),B(tail),parent,deform))
bone('Root',(0,0,0),(0,.15,0),None,False)
bone('Pelvis',landmarks['pelvis'],(0,.85,-.25),'Root')
bone('Spine',(0,.85,-.25),landmarks['chest'],'Pelvis')
bone('Chest',landmarks['chest'],landmarks['neck'],'Spine')
bone('Head',landmarks['neck'],(0,1.015,1.125),'Chest')
bone('TailBase',landmarks['tailBase'],(0,.845,-1.075),'Pelvis')
bone('TailMid',(0,.845,-1.075),(0,1.035,-1.345),'TailBase')
bone('TailPaddle',(0,1.035,-1.345),(0,1.12,-1.545),'TailMid')
chains={}
for side in ['Left','Right']:
 for family in ['Fore','Hind']:
  prefix=side+family;parent='Chest'if family=='Fore'else'Pelvis'
  a=landmarks[prefix+('Shoulder'if family=='Fore'else'Hip')];b=landmarks[prefix+('Elbow'if family=='Fore'else'Stifle')];c=landmarks[prefix+('Wrist'if family=='Fore'else'Hock')]
  sole=landmarks[prefix+'Paw'];tip=[sole[0],.045,sole[2]+.10]
  names=[prefix+'Upper',prefix+'Lower',prefix+'Paw'];bone(names[0],a,b,parent);bone(names[1],b,c,names[0]);bone(names[2],c,tip,names[1]);chains[prefix]=names
arm=bpy.data.armatures.new('Tidefin fitted deform skeleton');rig=bpy.data.objects.new('TidefinRig',arm);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for name,head,tail,parent,deform in spec:
 eb=arm.edit_bones.new(name);eb.head=head;eb.tail=tail;eb.use_deform=deform
 if parent:eb.parent=arm.edit_bones[parent]
 direction=(tail-head).normalized();lateral=Vector((1,0,0));local_z=lateral.cross(direction).normalized();eb.align_roll(local_z)
bpy.ops.object.mode_set(mode='OBJECT')
for pb in rig.pose.bones:pb.rotation_mode='QUATERNION'
report['bones']=[{'name':b.name,'headGame':G(b.head_local),'tailGame':G(b.tail_local),'localAxesBlender':[list(b.matrix_local.to_3x3().col[i])for i in range(3)],'parent':b.parent.name if b.parent else None,'deform':b.use_deform}for b in arm.bones]
report['soleCenters']=json.loads((SOURCE/'anatomy.json').read_text())['soleCenters']
def save_report():(OUT/'report.json').write_text(json.dumps(report,indent=2))

bpy.ops.object.select_all(action='DESELECT');body.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
start=time.time()
try:report['heatOperator']=list(bpy.ops.object.parent_set(type='ARMATURE_AUTO'))
except Exception as exc:report['heatError']=repr(exc)
report['heatSeconds']=time.time()-start
unweighted=[v.index for v in body.data.vertices if not any(g.weight>1e-8 for g in v.groups)]
report['heatUnweighted']=len(unweighted);report['bodyVertices']=len(body.data.vertices)
if unweighted or 'heatError'in report:
 report['status']='HEAT FAILED; no silent fallback or pose bake';save_report();bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'heat-failed.blend'));raise RuntimeError(report['status'])

def normalized(ob):
 for v in ob.data.vertices:
  ws=sorted([(g.group,g.weight)for g in v.groups if g.weight>1e-7],key=lambda x:-x[1])[:4];total=sum(w for _,w in ws);assert total>0
  for g in ob.vertex_groups:g.remove([v.index])
  for index,w in ws:ob.vertex_groups[index].add([v.index],w/total,'REPLACE')
def attach(ob):
 ob.parent=rig;mod=ob.modifiers.new('Portable linear skin','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=False
def fixed(ob,name):
 ob.vertex_groups.clear();ob.vertex_groups.new(name=name).add(list(range(len(ob.data.vertices))),1,'REPLACE');attach(ob)
normalized(body)
# An explicit local support repair, driven by actual cheek root surfaces rather
# than a body-wide height mask. Native heat assigned this head/neck attachment
# to the upper foreleg. Preserve heat everywhere beyond the14cm local feather.
cheeks=[o for o in objects if 'cheek'in o.name.lower()]
root_trees=[]
for cheek in cheeks:
 nn=len(cheek.data.vertices)//2
 root_faces=[list(p.vertices)for p in cheek.data.polygons if all(i<nn for i in p.vertices)]
 root_trees.append(BVHTree.FromPolygons([v.co.copy()for v in cheek.data.vertices],root_faces))
repairs=[]
for v in body.data.vertices:
 distance=min(tree.find_nearest(v.co)[3]for tree in root_trees)
 if distance>=.14:continue
 t=max(0,min(1,(.14-distance)/.075));t=t*t*(3-2*t)
 old={body.vertex_groups[g.group].name:g.weight for g in v.groups}
 ws={n:w*(1-t)for n,w in old.items()};ws['Head']=ws.get('Head',0)+.90*t;ws['Chest']=ws.get('Chest',0)+.10*t
 for group in body.vertex_groups:group.remove([v.index])
 for name,w in ws.items():
  if w>1e-8:body.vertex_groups[name].add([v.index],w,'REPLACE')
 repairs.append({'vertex':v.index,'pointGame':G(v.co),'rootSurfaceDistance':distance,'blend':t,'before':old,'afterUnnormalized':ws})
normalized(body)
report['localCheekSupportRepair']={'method':'Actual embedded root triangle nearest distance; full correction inside65mm, smooth feather to140mm;90%Head/10%Chest target; unmodified heat elsewhere','changedBodyVertices':len(repairs),'recordsFile':'cheek-support-weights.json'}
(OUT/'cheek-support-weights.json').write_text(json.dumps(repairs,indent=2))
# Eyes remain rigid Head-owned. Crest inherits body skin. Cheek embedded roots
# use the repaired supporting skin; outer cap feathers mostly toward Head.
for ob in objects:
 if ob==body:continue
 if 'crest'in ob.name.lower() or 'cheek'in ob.name.lower():
  for group in body.vertex_groups:ob.vertex_groups.new(name=group.name)
  mod=ob.modifiers.new('Body skin onto crest','DATA_TRANSFER');mod.object=body;mod.use_vert_data=True;mod.data_types_verts={'VGROUP_WEIGHTS'};mod.vert_mapping='POLYINTERP_NEAREST'
  bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=mod.name);normalized(ob)
  if 'cheek'in ob.name.lower():
   nn=len(ob.data.vertices)//2
   for v in ob.data.vertices:
    if v.index<nn:continue
    ws={ob.vertex_groups[g.group].name:g.weight*.25 for g in v.groups};ws['Head']=ws.get('Head',0)+.75
    for group in ob.vertex_groups:group.remove([v.index])
    for name,w in ws.items():
     if w>1e-8:ob.vertex_groups[name].add([v.index],w,'REPLACE')
   normalized(ob)
  attach(ob)
 else:fixed(ob,'Head')
# Explicit local paw regions only: bottom13cm belongs to its paw; short ankle
# feather above. No whole-body height/foliage mask or independent torso squeeze.
support={}
for prefix,names in chains.items():
 sole=B(landmarks[prefix+'Paw']);selected=[]
 for v in body.data.vertices:
  q=v.co
  if abs(q.x-sole.x)<.28 and abs(q.y-sole.y)<.31 and q.z<.19:
   t=max(0,min(1,(.19-q.z)/.06));t=t*t*(3-2*t)
   if t<=0:continue
   ws={body.vertex_groups[g.group].name:g.weight*(1-t)for g in v.groups};ws[names[-1]]=ws.get(names[-1],0)+t
   for group in body.vertex_groups:group.remove([v.index])
   for name,w in ws.items():
    if w>1e-8:body.vertex_groups[name].add([v.index],w,'REPLACE')
   if q.z<.001:selected.append(v.index)
 support[prefix]=selected
normalized(body);report['soleVertexCounts']={k:len(v)for k,v in support.items()}
report['geometryAfter']={o.name:corner_hash(o)for o in objects};report['geometryUVUnchanged']=report['geometryAfter']==before;assert report['geometryUVUnchanged']
report['weights']={'maxInfluences':max(len(v.groups)for o in objects for v in o.data.vertices),'unweighted':sum(not len(v.groups)for o in objects for v in o.data.vertices)}
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'rig-editable.blend'));save_report()
if args.weights_only:sys.exit(0)

def reset():
 for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
 bpy.context.view_layer.update()
def setbone(name,head,tail):
 b=rig.data.bones[name];delta=(b.tail_local-b.head_local).rotation_difference(tail-head);m=delta.to_matrix().to_4x4()@b.matrix_local.to_quaternion().to_matrix().to_4x4();m.translation=head;rig.pose.bones[name].matrix=m;bpy.context.view_layer.update()
def hinge(name,axis,angle):
 pb=rig.pose.bones[name];b=rig.data.bones[name];parent=pb.parent;inherited=parent.matrix@parent.bone.matrix_local.inverted()if parent else Matrix.Identity(4);m=inherited@b.matrix_local;head=m.translation.copy();m=Quaternion(axis,math.radians(angle)).to_matrix().to_4x4()@m;m.translation=head;pb.matrix=m;bpy.context.view_layer.update()
settings={
 'Neutral':{'drop':0,'stroke':0},
 'LoadedDiagonal':{'drop':-.025,'stroke':.20},
 'OppositeStance':{'drop':-.025,'stroke':-.20},
 'ToeOff':{'drop':-.025,'stroke':.18,'lift':.055},
 'HeadTail':{'drop':0,'stroke':0,'head':12,'tail':10},
}
pose_data={};frames={}
for frame,(name,cfg)in enumerate(settings.items(),1):
 reset();rig.pose.bones['Root'].matrix=Matrix.Translation(Vector((0,0,cfg['drop'])))@arm.bones['Root'].matrix_local;bpy.context.view_layer.update();clamp=0
 if name=='HeadTail':hinge('Head',(0,0,1),cfg['head']);hinge('TailBase',(0,0,1),-cfg['tail']);hinge('TailMid',(0,0,1),-cfg['tail']*.6)
 for prefix,names in chains.items():
  original=[arm.bones[n].head_local.copy()for n in names]+[arm.bones[names[-1]].tail_local.copy()]
  parent=rig.pose.bones[names[0]].parent;delta=parent.matrix@parent.bone.matrix_local.inverted();start=delta@original[0]
  sign=1 if prefix in ('LeftFore','RightHind')else-1;target=original[2]+Vector((0,-cfg['stroke']*sign,cfg.get('lift',0)if sign==1 else 0))
  line=target-start;dist=line.length;direction=line.normalized();la=(original[1]-original[0]).length;lb=(original[2]-original[1]).length
  d=max(abs(la-lb)+1e-6,min(la+lb-1e-6,dist));clamp=max(clamp,abs(d-dist));restline=(original[2]-original[0]).normalized();pole=original[1]-original[0]-restline*(original[1]-original[0]).dot(restline);pole=delta.to_quaternion()@pole.normalized();pole=(pole-direction*pole.dot(direction)).normalized();along=(la*la-lb*lb+d*d)/(2*d);middle=start+direction*along+pole*math.sqrt(max(0,la*la-along*along))
  setbone(names[0],start,middle);setbone(names[1],middle,target);setbone(names[2],target,target+original[3]-original[2])
 assert clamp<1e-5,('Requested pose exceeds fitted fixed-length chain',name,clamp)
 bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());posed=ev.to_mesh();contacts={}
 for prefix,ids in support.items():
  pts=[posed.vertices[i].co for i in ids];contacts[prefix]={'minY':min(p.z for p in pts),'maxY':max(p.z for p in pts),'centerGame':G(sum(pts,Vector())/len(pts))}
 ev.to_mesh_clear();pose_data[name]={'frame':frame,'settings':cfg,'actualRootGame':G(rig.pose.bones['Root'].head),'targetClampMeters':clamp,'soleSurface':contacts,'boneTransforms':{pb.name:{'location':list(pb.location),'quaternion':list(pb.rotation_quaternion),'headGame':G(pb.head),'tailGame':G(pb.tail)}for pb in rig.pose.bones}};frames[name]=frame
 if not rig.animation_data:rig.animation_data_create();rig.animation_data.action=bpy.data.actions.new('DiagnosticPoses')
 for pb in rig.pose.bones:
  pb.keyframe_insert('location',frame=frame,group=pb.name);pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name);pb.keyframe_insert('scale',frame=frame,group=pb.name)
action=rig.animation_data.action
for curve in action.fcurves:
 for key in curve.keyframe_points:key.interpolation='CONSTANT'
scene=bpy.context.scene;scene.render.fps=1;scene.frame_start=1;scene.frame_end=5;scene.frame_set(1)
report['poses']=pose_data;report['status']='Five diagnostic poses; independent deformation gate PENDING, no locomotion library'
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for ob in objects:ob.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'diagnostic-editable.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'tidefin-rig.glb'),use_selection=True,export_format='GLB',export_yup=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_step=1,export_anim_slide_to_zero=True,export_def_bones=True)
report['outputSHA256']=hashlib.sha256((OUT/'tidefin-rig.glb').read_bytes()).hexdigest();save_report()
# Fresh GLB import: sample exported action poses, no source constraints or hidden controls.
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(OUT/'tidefin-rig.glb'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');rig.animation_data_create()
for track in rig.animation_data.nla_tracks:track.mute=True
action=next(a for a in bpy.data.actions if a.name=='DiagnosticPoses');rig.animation_data.action=action
if action.slots:rig.animation_data.action_slot=action.slots[0]
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=20;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=4;scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard'
world=bpy.data.worlds.new('Neutral studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.66,.67,1);world.node_tree.nodes['Background'].inputs[1].default_value=.75;scene.world=world
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));floor=bpy.context.object;fm=bpy.data.materials.new('Floor');fm.diffuse_color=(.58,.59,.60,1);floor.data.materials.append(fm)
def look(ob,target):ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
for pos,power,size in[((-3,-4,6),700,5),((4,0,4),350,4)]:
 bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=power;light.data.size=size;look(light,(0,0,.7))
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=3.65
views={'side':(7,0,2),'front3q':(4,-6,2.65),'opposite':(-7,0,2),'front':(0,-7,2.2)}
start,end=action.frame_range;rendered=[]
for index,name in enumerate(settings):
 frame=start+(end-start)*index/4;scene.frame_set(int(frame),subframe=frame-int(frame))
 for view in (['side','front3q']if name!='HeadTail'else['front','opposite']):
  cam.location=views[view];look(cam,(0,0,.72));scene.render.filepath=str(OUT/(name+'-'+view+'.png'));bpy.ops.render.render(write_still=True);rendered.append({'pose':name,'frame':frame,'view':view,'file':name+'-'+view+'.png'})
(OUT/'render-evidence.json').write_text(json.dumps({'sha256':report['outputSHA256'],'engine':'Cycles CPU','threads':4,'samples':20,'resolution':[512,512],'views':rendered},indent=2))
print('RIG_STUDY_COMPLETE',report['outputSHA256'])
