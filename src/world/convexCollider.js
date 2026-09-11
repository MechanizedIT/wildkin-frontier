// Small offline-authored convex prop surfaces. Detailed render meshes are never
// converted into collision at runtime; these same faces also draw Author proxies.
export function getCollisionBounds(collision) {
  if (!collision) return null;
  if (collision.shape !== 'convexHull') return {size: collision.size, offset: collision.offset};
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < collision.vertices.length; i++) {
    const axis = i % 3, value = collision.vertices[i];
    min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
  }
  return {size: {w: max[0]-min[0], h: max[1]-min[1], d: max[2]-min[2]},
    offset: {x: (min[0]+max[0])/2 + collision.offset.x,
      y: (min[1]+max[1])/2 + collision.offset.y, z: (min[2]+max[2])/2 + collision.offset.z}};
}

export function validateConvexCollider(collision, label = 'Convex collider') {
  const fail = reason => { throw new Error(`${label}: ${reason}`); };
  const {vertices, indices} = collision;
  if (!Array.isArray(vertices) || vertices.length < 12 || vertices.length > 192 || vertices.length % 3 ||
      vertices.some(v => !Number.isFinite(v) || Math.abs(v) > 100)) fail('requires 4–64 finite local points within 100 m');
  const count = vertices.length/3;
  if (!Array.isArray(indices) || indices.length < 12 || indices.length > 372 || indices.length % 3 ||
      indices.some(i => !Number.isInteger(i) || i < 0 || i >= count)) fail('invalid triangle indices');
  const point = i => vertices.slice(i*3, i*3+3);
  const sub = (a,b) => a.map((v,i) => v-b[i]);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const dot = (a,b) => a.reduce((n,v,i) => n+v*b[i],0);
  const edges = new Map(), used = new Set(); let volume = 0;
  for (let i=0;i<count;i++) for(let j=0;j<i;j++)
    if (Math.hypot(...sub(point(i),point(j))) < 1e-7) fail('duplicate points');
  for (let i=0;i<indices.length;i+=3) {
    const ids=indices.slice(i,i+3), [a,b,c]=ids.map(point), normal=cross(sub(b,a),sub(c,a));
    const length=Math.hypot(...normal);
    if (length<1e-8) fail('degenerate triangle');
    for(let j=0;j<count;j++) if(dot(normal,sub(point(j),a))/length>1e-5) fail('faces must form an outward convex surface');
    volume += dot(a,cross(b,c))/6;
    for(let j=0;j<3;j++) {
      const from=ids[j], to=ids[(j+1)%3], key=`${Math.min(from,to)}:${Math.max(from,to)}`;
      const edge=edges.get(key) ?? {count:0,balance:0};edge.count++;edge.balance+=from<to?1:-1;edges.set(key,edge);used.add(from);
    }
  }
  if (used.size!==count || [...edges.values()].some(e=>e.count!==2 || e.balance!==0)) fail('surface must be closed and use every point');
  if (!(volume>1e-7)) fail('surface must enclose positive volume');
  return collision;
}
