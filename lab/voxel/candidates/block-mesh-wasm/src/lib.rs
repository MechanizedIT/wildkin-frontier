use block_mesh::ndshape::{ConstShape, ConstShape3u32};
use block_mesh::{greedy_quads, GreedyQuadsBuffer, MergeVoxel, Voxel, VoxelVisibility, RIGHT_HANDED_Y_UP_CONFIG};

#[derive(Clone, Copy, Eq, PartialEq)]
struct Material(u8);
impl Voxel for Material {
    fn get_visibility(&self) -> VoxelVisibility { if self.0 == 0 { VoxelVisibility::Empty } else { VoxelVisibility::Opaque } }
}
impl MergeVoxel for Material { type MergeValue = u8; fn merge_value(&self) -> u8 { self.0 } }

static mut POSITIONS: Vec<f32> = Vec::new();
static mut NORMALS: Vec<f32> = Vec::new();
static mut COLORS: Vec<f32> = Vec::new();
static mut INDICES: Vec<u32> = Vec::new();

const COLORS_BY_ID: [[f32; 3]; 4] = [[0.0, 0.0, 0.0], [0.48, 0.59, 0.64], [0.73, 0.47, 0.29], [0.55, 0.34, 0.15]];

#[no_mangle]
pub extern "C" fn alloc_input(len: usize) -> *mut u8 {
    let mut bytes = Vec::<u8>::with_capacity(len);
    let ptr = bytes.as_mut_ptr();
    std::mem::forget(bytes);
    ptr
}
#[no_mangle]
pub unsafe extern "C" fn free_input(ptr: *mut u8, len: usize) { drop(Vec::from_raw_parts(ptr, 0, len)); }

fn append_quad(quad: &block_mesh::UnorientedQuad, face: &block_mesh::OrientedBlockFace, material: u8) {
    unsafe {
        let start = (POSITIONS.len() / 3) as u32;
        let color = COLORS_BY_ID.get(material as usize).copied().unwrap_or(COLORS_BY_ID[0]);
        for position in face.quad_mesh_positions(quad, 1.0) {
            // block-mesh works in padded coordinates; the lab promises
            // chunk-local coordinates for the unpadded [0,size) interior.
            POSITIONS.extend_from_slice(&[position[0] - 1.0, position[1] - 1.0, position[2] - 1.0]);
            let normal = face.signed_normal();
            NORMALS.extend_from_slice(&[normal.x as f32, normal.y as f32, normal.z as f32]);
            COLORS.extend_from_slice(&color);
        }
        INDICES.extend_from_slice(&face.quad_mesh_indices(start));
    }
}

fn mesh_shape<S: ConstShape<3, Coord = u32>>(input: &[u8], size: u32) {
    let side = size + 2;
    // ConstShape is a zero-sized compile-time marker at both concrete call
    // sites below; block-mesh accepts its value only as a shape witness.
    let shape: S = unsafe { std::mem::zeroed() };
    let mut voxels = vec![Material(0); S::SIZE as usize];
    // Lab padded bytes are x-fast, y next, z last. block-mesh owns its own
    // shape indexing, so map coordinates rather than assume a stride.
    for z in 0..side { for y in 0..side { for x in 0..side {
        let source = (x + y * side + z * side * side) as usize;
        let destination = S::linearize([x, y, z]) as usize;
        voxels[destination] = Material(input[source]);
    }}}
    let mut buffer = GreedyQuadsBuffer::new(voxels.len());
    // `block-mesh` treats its supplied bounds as inclusive and contracts the
    // 3×3×3 working interior by one. Pass the full padded range so that
    // lab-local voxels 0..size-1 (padded 1..size) are all meshed.
    greedy_quads(&voxels, &shape, [0; 3], [size + 1; 3], &RIGHT_HANDED_Y_UP_CONFIG.faces, &mut buffer);
    unsafe { POSITIONS.clear(); NORMALS.clear(); COLORS.clear(); INDICES.clear(); }
    for (face_index, group) in buffer.quads.groups.iter().enumerate() {
        let face = &RIGHT_HANDED_Y_UP_CONFIG.faces[face_index];
        for quad in group {
            // A greedy quad contains one merge value; sample its minimum
            // interior voxel to preserve the lab's 1/2/3 material color.
            let at = quad.minimum;
            let material = voxels[S::linearize(at) as usize].0;
            append_quad(quad, face, material);
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn mesh_padded(size: u32, ptr: *const u8) {
    let side = size + 2;
    let input = std::slice::from_raw_parts(ptr, (side * side * side) as usize);
    match size {
        16 => mesh_shape::<ConstShape3u32<18, 18, 18>>(input, size),
        32 => mesh_shape::<ConstShape3u32<34, 34, 34>>(input, size),
        _ => { POSITIONS.clear(); NORMALS.clear(); COLORS.clear(); INDICES.clear(); }
    }
}
macro_rules! output { ($name:ident, $v:ident, $t:ty) => {
    #[no_mangle] pub unsafe extern "C" fn $name() -> *const $t { $v.as_ptr() }
}; }
macro_rules! length { ($name:ident, $v:ident) => {
    #[no_mangle] pub unsafe extern "C" fn $name() -> usize { $v.len() }
}; }
output!(positions_ptr, POSITIONS, f32); length!(positions_len, POSITIONS);
output!(normals_ptr, NORMALS, f32); length!(normals_len, NORMALS);
output!(colors_ptr, COLORS, f32); length!(colors_len, COLORS);
output!(indices_ptr, INDICES, u32); length!(indices_len, INDICES);
