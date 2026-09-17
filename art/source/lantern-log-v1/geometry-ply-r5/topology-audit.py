import argparse, hashlib, json, os, re, sys, time
import numpy as np

def sha256(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''): h.update(block)
    return h.hexdigest()

def header_info(path):
    with open(path,'rb') as f:
        raw=b''
        while b'end_header\n' not in raw:
            chunk=f.read(4096)
            if not chunk: raise ValueError('missing end_header')
            raw+=chunk
            if len(raw)>65536: raise ValueError('oversize header')
    header=raw[:raw.index(b'end_header\n')+len(b'end_header\n')].decode('ascii')
    if 'format binary_little_endian 1.0' not in header: raise ValueError('requires binary_little_endian 1.0')
    vm=re.search(r'element vertex (\d+)',header); fm=re.search(r'element face (\d+)',header)
    if not vm or not fm or 'property float x' not in header or 'property list uchar uint vertex_indices' not in header: raise ValueError('unexpected PLY schema')
    return len(header.encode('ascii')),int(vm.group(1)),int(fm.group(1)),header

def main():
    p=argparse.ArgumentParser(); p.add_argument('ply'); p.add_argument('--out',required=True); args=p.parse_args()
    started=time.time(); path=os.path.abspath(args.ply); hb,nv,nf,header=header_info(path)
    expected=hb+nv*12+nf*13; actual=os.path.getsize(path)
    if actual!=expected: raise ValueError(f'byte count {actual} != expected {expected}')
    positions=np.memmap(path,dtype='<f4',mode='r',offset=hb,shape=(nv,3))
    face_dtype=np.dtype([('count','u1'),('index','<u4',(3,))],align=False)
    records=np.memmap(path,dtype=face_dtype,mode='r',offset=hb+nv*12,shape=(nf,))
    if not np.all(records['count']==3): raise ValueError('non-triangle face record')
    faces=records['index']
    if int(faces.max())>=nv: raise ValueError('out-of-range index')
    repeated=(faces[:,0]==faces[:,1]) | (faces[:,1]==faces[:,2]) | (faces[:,2]==faces[:,0])
    repeated_count=int(repeated.sum())
    # Exact area-degenerate test in finite chunks. Float64 avoids underflow from source f32 positions.
    zero_area=0; nonfinite_positions=int((~np.isfinite(positions)).sum())
    for begin in range(0,nf,200000):
        tri=faces[begin:begin+200000]
        a=positions[tri[:,0]].astype(np.float64); b=positions[tri[:,1]].astype(np.float64); c=positions[tri[:,2]].astype(np.float64)
        cross=np.cross(b-a,c-a); sq=np.einsum('ij,ij->i',cross,cross)
        zero_area+=int((sq==0).sum())
    # Undirected edge incidence; a packed uint64 avoids an object/structured sort.
    edges=np.empty((nf*3,),dtype=np.uint64)
    for k,(i,j) in enumerate(((0,1),(1,2),(2,0))):
        lo=np.minimum(faces[:,i],faces[:,j]).astype(np.uint64); hi=np.maximum(faces[:,i],faces[:,j]).astype(np.uint64)
        edges[k*nf:(k+1)*nf]=(lo<<np.uint64(32))|hi
    unique_edges, incidence=np.unique(edges,return_counts=True)
    del edges
    hist={str(int(k)):int(v) for k,v in zip(*np.unique(incidence,return_counts=True))}
    boundary=int((incidence==1).sum()); nonmanifold=int((incidence>2).sum())
    # Graph only follows face edges. scipy is optional only because it is already installed locally.
    comp_result={'method':'pending topology-components.cpp and topology-component-summary.py'}
    result={'schema':'lantern-r5-topology-audit-v1','source':{'path':'raw-geometry.ply','sha256':sha256(path),'bytes':actual,'header_bytes':hb,'format':'binary_little_endian_1.0','position_dtype':'float32','vertex_count':nv,'face_count':nf},'method':{'no_geometry_mutation':True,'no_self_intersection_test':True,'position_access':'read-only numpy.memmap','edge_test':'undirected packed uint64 edge incidence','area_test':'float64 cross product in 200000-face chunks','normal_winding_test':'not tested'},'findings':{'nonfinite_position_scalars':nonfinite_positions,'repeated_index_faces':repeated_count,'zero_area_faces':zero_area,'unused_vertices':int(nv-np.unique(faces).size),'unique_undirected_edges':int(unique_edges.size),'boundary_edges':boundary,'nonmanifold_edges':nonmanifold,'edge_incidence_histogram':hist,'components':comp_result},'execution':{'python':sys.version.split()[0],'numpy':np.__version__,'elapsed_seconds':round(time.time()-started,3)}}
    with open(args.out,'w',encoding='utf-8',newline='\n') as f: json.dump(result,f,indent=2); f.write('\n')
if __name__=='__main__': main()

