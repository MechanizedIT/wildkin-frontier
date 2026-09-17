import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const input = process.argv[2] ?? 'assets/models/lantern-log-manual-r4-v1/model.glb';
const output = process.argv[3] ?? 'art/source/lantern-log-v1/manual-r4/admission-r1/runtime-color-audit.json';
const bytes = await readFile(input);
if (bytes.readUInt32LE(0) !== 0x46546c67) throw new Error('Expected GLB magic');
let offset = 12;
let json;
while (offset < bytes.length) {
  const length = bytes.readUInt32LE(offset); const type = bytes.readUInt32LE(offset + 4); offset += 8;
  if (type === 0x4e4f534a) json = JSON.parse(bytes.subarray(offset, offset + length).toString('utf8').trim());
  offset += length;
}
if (!json) throw new Error('GLB has no JSON chunk');
const primitives = (json.meshes ?? []).flatMap((mesh, meshIndex) => mesh.primitives.map((primitive, primitiveIndex) => ({ meshIndex, mesh: mesh.name ?? `mesh-${meshIndex}`, primitiveIndex, attributes: primitive.attributes ?? {}, material: primitive.material })));
const missingColor = primitives.filter(({ attributes }) => attributes.COLOR_0 === undefined);
const missingPosition = primitives.filter(({ attributes }) => attributes.POSITION === undefined);
const audit = {
  schema: 'lantern-r4-runtime-color-audit/v1',
  input,
  sha256: createHash('sha256').update(bytes).digest('hex').toUpperCase(),
  bytes: bytes.length,
  materialCount: json.materials?.length ?? 0,
  meshCount: json.meshes?.length ?? 0,
  primitiveCount: primitives.length,
  colorAttribute: 'COLOR_0',
  primitivesWithColor: primitives.length - missingColor.length,
  missingColorPrimitives: missingColor.map(({ meshIndex, mesh, primitiveIndex }) => ({ meshIndex, mesh, primitiveIndex })),
  missingPositionPrimitives: missingPosition.map(({ meshIndex, mesh, primitiveIndex }) => ({ meshIndex, mesh, primitiveIndex })),
  sourceMaterialIndices: [...new Set(primitives.map(({ material }) => material))],
  result: missingColor.length === 0 && missingPosition.length === 0 && (json.materials?.length ?? 0) === 1 ? 'PASS' : 'HOLD'
};
await writeFile(output, `${JSON.stringify(audit, null, 2)}\n`);
if (audit.result !== 'PASS') throw new Error(`Runtime color export audit failed: ${JSON.stringify(audit)}`);
console.log(JSON.stringify(audit, null, 2));