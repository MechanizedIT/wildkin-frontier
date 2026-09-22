// Phase 0 local wrapper around block-mesh 0.2.0. The exported ABI is manual
// on purpose: it keeps the candidate's browser runtime to one small WASM file.
const wasmUrl = new URL('./block-mesh-wasm.wasm', import.meta.url);

function typedCopy(memory, pointer, length, Type) {
  return new Type(memory.buffer, pointer, length).slice();
}

export async function createBlockMeshCandidate() {
  const response = await fetch(wasmUrl);
  if (!response.ok) throw new Error(`block-mesh WASM fetch failed: ${response.status}`);
  const { instance } = await WebAssembly.instantiate(await response.arrayBuffer());
  const wasm = instance.exports;
  if (!wasm.memory || !wasm.alloc_input || !wasm.mesh_padded) throw new Error('block-mesh WASM ABI exports are incomplete');
  return {
    name: 'block-mesh@0.2.0/local-wasm',
    mesh({ size, voxels }) {
      const side = size + 2;
      if ((size !== 16 && size !== 32) || !(voxels instanceof Uint8Array) || voxels.length !== side ** 3) throw new Error('block-mesh expects padded 16^3 or 32^3 Uint8Array');
      const pointer = wasm.alloc_input(voxels.length);
      new Uint8Array(wasm.memory.buffer, pointer, voxels.length).set(voxels);
      wasm.mesh_padded(size, pointer);
      wasm.free_input(pointer, voxels.length);
      return {
        positions: typedCopy(wasm.memory, wasm.positions_ptr(), wasm.positions_len(), Float32Array),
        normals: typedCopy(wasm.memory, wasm.normals_ptr(), wasm.normals_len(), Float32Array),
        colors: typedCopy(wasm.memory, wasm.colors_ptr(), wasm.colors_len(), Float32Array),
        indices: typedCopy(wasm.memory, wasm.indices_ptr(), wasm.indices_len(), Uint32Array),
        timings: { wasmBytes: 27052 },
      };
    },
  };
}
