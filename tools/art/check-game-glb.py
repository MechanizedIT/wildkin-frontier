#!/usr/bin/env python3
"""Read-only structural admission check for Wildkin Frontier GLB assets."""
import argparse, hashlib, json, math, struct, sys
from pathlib import Path

LIMITS = {
    "creature": {"max_triangles": 20000, "max_vertices": 60000, "max_materials": 2, "max_bones": 48, "max_texture": 1024},
    "player": {"max_triangles": 20000, "max_vertices": 60000, "max_materials": 2, "max_bones": 48, "max_texture": 1024},
    "prop": {"max_triangles": 5000, "max_vertices": 15000, "max_materials": 2, "max_bones": 0, "max_texture": 1024},
}
BLOCKED_EXTENSIONS = {"KHR_draco_mesh_compression", "EXT_meshopt_compression", "KHR_texture_basisu", "EXT_texture_webp", "EXT_texture_avif"}
COMPONENTS = {5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2), 5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}
TYPE_WIDTH = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}

class CheckError(Exception): pass
def sha(data): return hashlib.sha256(data).hexdigest()

def parse_glb(data):
    if len(data) < 20: raise CheckError("GLB is too short")
    magic, version, total = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or total != len(data): raise CheckError("invalid GLB header")
    pos, doc, binary = 12, None, None
    while pos + 8 <= len(data):
        size, kind = struct.unpack_from("<I4s", data, pos); pos += 8
        if pos + size > len(data): raise CheckError("GLB chunk exceeds file")
        chunk = data[pos:pos + size]; pos += size
        if kind == b"JSON": doc = json.loads(chunk.decode("utf-8"))
        elif kind == b"BIN\x00": binary = chunk
    if not isinstance(doc, dict) or binary is None: raise CheckError("GLB requires JSON and embedded BIN chunks")
    return doc, binary

def image_dimensions(data, mime):
    if mime == "image/png" and data[:8] == b"\x89PNG\r\n\x1a\n" and len(data) >= 24: return struct.unpack(">II", data[16:24])
    if mime == "image/jpeg" and data[:2] == b"\xff\xd8":
        pos = 2
        while pos + 9 <= len(data):
            if data[pos] != 0xff: pos += 1; continue
            marker = data[pos + 1]; pos += 2
            if marker in (0xd8, 0xd9): continue
            if pos + 2 > len(data): break
            size = struct.unpack(">H", data[pos:pos + 2])[0]
            if size < 2 or pos + size > len(data): break
            if marker in range(0xc0, 0xc4) or marker in range(0xc5, 0xc8) or marker in range(0xc9, 0xcc) or marker in range(0xcd, 0xd0):
                height, width = struct.unpack(">HH", data[pos + 3:pos + 7]); return width, height
            pos += size
    raise CheckError("image is not a supported PNG/JPEG with readable dimensions")

def view_blob(doc, binary, index):
    views = doc.get("bufferViews", [])
    if not isinstance(index, int) or index < 0 or index >= len(views): raise CheckError("bufferView index is invalid")
    view = views[index]
    if view.get("buffer", 0) != 0 or not isinstance(view.get("byteLength"), int): raise CheckError("bufferView must use embedded buffer 0")
    start, length = view.get("byteOffset", 0), view["byteLength"]
    if start < 0 or length < 0 or start + length > len(binary): raise CheckError("bufferView exceeds embedded BIN")
    return view, binary[start:start + length]

def accessor_values(doc, binary, index, normalized=False):
    accessors = doc.get("accessors", [])
    if not isinstance(index, int) or index < 0 or index >= len(accessors): raise CheckError("accessor index is invalid")
    acc = accessors[index]
    if acc.get("sparse") is not None: raise CheckError("sparse accessors are unsupported")
    if acc.get("bufferView") is None: raise CheckError("unbuffered accessors are unsupported")
    view, _ = view_blob(doc, binary, acc["bufferView"])
    component, width, count = acc.get("componentType"), TYPE_WIDTH.get(acc.get("type")), acc.get("count")
    if component not in COMPONENTS or not width or not isinstance(count, int) or count < 1: raise CheckError("accessor format is invalid")
    fmt, size = COMPONENTS[component]; item = size * width; stride = view.get("byteStride", item)
    if not isinstance(stride, int) or stride < item: raise CheckError("accessor byteStride is too small")
    start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    if start < 0 or start + (count - 1) * stride + item > len(binary): raise CheckError("accessor exceeds embedded BIN")
    rows = []
    for row in range(count):
        values = list(struct.unpack_from("<" + fmt * width, binary, start + row * stride))
        if normalized and component != 5126:
            if component in (5120, 5122):
                maximum = 127 if component == 5120 else 32767; values = [max(-1, value / maximum) for value in values]
            else:
                maximum = {5121: 255, 5123: 65535, 5125: 4294967295}[component]; values = [value / maximum for value in values]
        rows.append(values)
    return acc, rows

def check(path, profile, overrides, required_clips):
    data = Path(path).read_bytes(); doc, binary = parse_glb(data)
    limits = dict(LIMITS[profile]); limits.update({key: value for key, value in overrides.items() if value is not None})
    failures = []
    def require(condition, message):
        if not condition: failures.append(message)
    def values(index, normalized=False):
        try: return accessor_values(doc, binary, index, normalized)
        except CheckError as error: failures.append(str(error)); return None, None

    used = set(doc.get("extensionsUsed", [])) | set(doc.get("extensionsRequired", [])); blocked = sorted(used & BLOCKED_EXTENSIONS)
    require(not blocked, "unsupported decoder extension(s): " + ", ".join(blocked))
    buffers = doc.get("buffers", []); require(len(buffers) == 1 and "uri" not in buffers[0], "GLB must use exactly one embedded buffer and no buffer URI")
    for index in range(len(doc.get("bufferViews", []))):
        try: view_blob(doc, binary, index)
        except CheckError as error: failures.append(str(error))

    nodes, meshes, skins = doc.get("nodes", []), doc.get("meshes", []), doc.get("skins", [])
    parents = [None] * len(nodes)
    for node_i, node in enumerate(nodes):
        children = node.get("children", []); require(isinstance(children, list), "node children must be an array")
        for child in children if isinstance(children, list) else []:
            require(isinstance(child, int) and 0 <= child < len(nodes), "node child index is invalid")
            if isinstance(child, int) and 0 <= child < len(nodes):
                require(parents[child] is None, "node hierarchy has multiple parents"); parents[child] = node_i
        if "mesh" in node: require(isinstance(node["mesh"], int) and 0 <= node["mesh"] < len(meshes), "node mesh index is invalid")
        if "skin" in node: require(isinstance(node["skin"], int) and 0 <= node["skin"] < len(skins), "node skin index is invalid")
    for node_i in range(len(nodes)):
        seen, cursor = set(), node_i
        while cursor is not None:
            require(cursor not in seen, "node hierarchy contains a cycle")
            if cursor in seen: break
            seen.add(cursor); cursor = parents[cursor]

    triangles = vertices = 0; material_ids = set(); primitive_info = {}; materials = doc.get("materials", [])
    for mesh_i, mesh in enumerate(meshes):
        for primitive_i, primitive in enumerate(mesh.get("primitives", [])):
            require(primitive.get("mode", 4) == 4, "mesh primitive must use TRIANGLES mode")
            attrs = primitive.get("attributes", {}); pos_i = attrs.get("POSITION") if isinstance(attrs, dict) else None
            if pos_i is None: failures.append("mesh primitive lacks POSITION"); continue
            pos_acc, positions = values(pos_i)
            if not positions: continue
            require(pos_acc.get("componentType") == 5126 and pos_acc.get("type") == "VEC3", "POSITION must be float VEC3")
            require(all(math.isfinite(value) for row in positions for value in row), "POSITION contains non-finite values")
            vertices += len(positions); element_count = len(positions)
            if "indices" in primitive:
                index_acc, indices = values(primitive["indices"])
                if indices:
                    require(index_acc.get("type") == "SCALAR" and index_acc.get("componentType") in (5121, 5123, 5125), "indices must be unsigned SCALAR")
                    require(all(0 <= row[0] < len(positions) for row in indices), "mesh index is outside POSITION"); element_count = len(indices)
            require(element_count % 3 == 0, "triangle index/vertex count must be divisible by 3"); triangles += element_count // 3
            primitive_info[(mesh_i, primitive_i)] = (attrs, len(positions))
            if "material" in primitive:
                material_i = primitive["material"]; require(isinstance(material_i, int) and 0 <= material_i < len(materials), "primitive material index is invalid")
                if isinstance(material_i, int) and 0 <= material_i < len(materials): material_ids.add(material_i)
    require(triangles <= limits["max_triangles"], f"triangles {triangles} exceed {limits['max_triangles']}")
    require(vertices <= limits["max_vertices"], f"vertices {vertices} exceed {limits['max_vertices']}")
    require(len(material_ids) <= limits["max_materials"], f"materials {len(material_ids)} exceed {limits['max_materials']}")

    texture_roles, texture_ids, textures, images = [], set(), doc.get("textures", []), doc.get("images", [])
    for material_i in material_ids:
        material = materials[material_i]; pbr = material.get("pbrMetallicRoughness", {})
        for forbidden in ("normalTexture", "occlusionTexture", "emissiveTexture"): require(forbidden not in material, f"material {material_i} uses unsupported {forbidden}")
        require("metallicRoughnessTexture" not in pbr, f"material {material_i} uses unsupported metallicRoughnessTexture")
        base = pbr.get("baseColorTexture")
        if base is not None:
            texture_i = base.get("index") if isinstance(base, dict) else None
            require(isinstance(texture_i, int) and 0 <= texture_i < len(textures), "baseColorTexture index is invalid")
            if isinstance(texture_i, int) and 0 <= texture_i < len(textures): texture_ids.add(texture_i); texture_roles.append({"texture": texture_i, "role": "baseColor"})
    require(len(texture_ids) <= 1, "game material pipeline permits at most one base-color texture")
    require(len(textures) == len(texture_ids), "every texture must be the referenced base-color texture")
    require(len(images) == len(texture_ids), "every embedded image must be the one referenced base-color texture")
    texture_reports = []
    for texture_i in texture_ids:
        source_i = textures[texture_i].get("source"); require(isinstance(source_i, int) and 0 <= source_i < len(images), "texture image source is invalid")
        if not isinstance(source_i, int) or not 0 <= source_i < len(images): continue
        image = images[source_i]; require("uri" not in image and "bufferView" in image, "images must be embedded bufferViews, never URI/data URLs")
        try:
            _, blob = view_blob(doc, binary, image["bufferView"]); width, height = image_dimensions(blob, image.get("mimeType"))
            require(max(width, height) <= limits["max_texture"], f"texture {width}x{height} exceeds {limits['max_texture']}")
            texture_reports.append({"mimeType": image.get("mimeType"), "width": width, "height": height, "sha256": sha(blob), "roles": [role["role"] for role in texture_roles if role["texture"] == texture_i]})
        except CheckError as error: failures.append(str(error))

    bones = max((len(skin.get("joints", [])) for skin in skins), default=0); require(bones <= limits["max_bones"], f"bones {bones} exceed {limits['max_bones']}")
    skin_meshes = {}
    for node in nodes:
        if "skin" in node and "mesh" in node and isinstance(node.get("skin"), int) and isinstance(node.get("mesh"), int): skin_meshes.setdefault(node["skin"], set()).add(node["mesh"])
    for skin_i, skin in enumerate(skins):
        joints = skin.get("joints", []); require(isinstance(joints, list) and joints, "skin requires joints"); require(len(set(joints)) == len(joints), "skin joints must be unique")
        require(all(isinstance(joint, int) and 0 <= joint < len(nodes) for joint in joints), "skin joint node is invalid")
        root = skin.get("skeleton")
        if root is None:
            roots = [joint for joint in joints if parents[joint] not in joints]; require(len(roots) == 1, "skin without skeleton requires one joint root"); root = roots[0] if len(roots) == 1 else None
        else: require(isinstance(root, int) and 0 <= root < len(nodes), "skin skeleton root is invalid")
        if isinstance(root, int) and 0 <= root < len(nodes):
            for joint in joints:
                cursor, reachable = joint, False
                while cursor is not None:
                    if cursor == root: reachable = True; break
                    cursor = parents[cursor]
                require(reachable, "skin joint is outside skeleton root hierarchy")
        require("inverseBindMatrices" in skin, "skin requires inverseBindMatrices")
        ibm_acc, ibm = values(skin.get("inverseBindMatrices"))
        if ibm_acc:
            require(ibm_acc.get("componentType") == 5126 and ibm_acc.get("type") == "MAT4" and len(ibm) == len(joints), "inverseBindMatrices must be float MAT4 per joint")
            require(all(math.isfinite(value) for row in ibm for value in row), "inverseBindMatrices contain non-finite values")
        require(skin_i in skin_meshes, "skin is not attached to a mesh node")
        for mesh_i in skin_meshes.get(skin_i, []):
            for primitive_i, _ in enumerate(meshes[mesh_i].get("primitives", [])):
                info = primitive_info.get((mesh_i, primitive_i))
                if not info: continue
                attrs, count = info; joints_i, weights_i = attrs.get("JOINTS_0"), attrs.get("WEIGHTS_0")
                require(joints_i is not None and weights_i is not None, "skinned mesh requires JOINTS_0 and WEIGHTS_0")
                if joints_i is None or weights_i is None: continue
                joint_acc, joint_values = values(joints_i); weight_acc, weight_values = values(weights_i, normalized=True)
                if not joint_values or not weight_values: continue
                require(joint_acc.get("type") == "VEC4" and joint_acc.get("componentType") in (5121, 5123), "JOINTS_0 must be unsigned VEC4")
                require(weight_acc.get("type") == "VEC4" and weight_acc.get("componentType") in (5121, 5123, 5126), "WEIGHTS_0 must be VEC4")
                require(len(joint_values) == count and len(weight_values) == count, "skin attributes must match POSITION count")
                for js, ws in zip(joint_values, weight_values):
                    require(all(0 <= joint < len(joints) for joint in js), "joint index is outside skin")
                    require(all(math.isfinite(weight) and weight >= 0 for weight in ws), "skin weights must be finite and nonnegative")
                    require(abs(sum(ws) - 1) <= 0.02, "skin weights must be normalized with at most four active influences")

    animations = doc.get("animations", []); names = {animation.get("name"): animation for animation in animations if isinstance(animation.get("name"), str)}
    for name in required_clips:
        animation = names.get(name); require(animation is not None, f"required clip missing: {name}")
        if animation: require(bool(animation.get("channels")) and bool(animation.get("samplers")), f"required clip has no tracks: {name}")
    animation_reports = []
    for animation in animations:
        clip_start, clip_end = math.inf, -math.inf
        samplers, channels = animation.get("samplers", []), animation.get("channels", []); require(isinstance(samplers, list) and isinstance(channels, list) and samplers and channels, "animation requires samplers and channels")
        for channel in channels if isinstance(channels, list) else []:
            sampler_i, target = channel.get("sampler"), channel.get("target", {})
            require(isinstance(sampler_i, int) and 0 <= sampler_i < len(samplers), "animation sampler index is invalid")
            path_name, node_i = target.get("path"), target.get("node") if isinstance(target, dict) else (None, None)
            require(path_name in ("translation", "rotation", "scale"), "animation target path is unsupported"); require(isinstance(node_i, int) and 0 <= node_i < len(nodes), "animation target node is invalid")
            if not isinstance(sampler_i, int) or not 0 <= sampler_i < len(samplers): continue
            sampler = samplers[sampler_i]; require(sampler.get("interpolation", "LINEAR") in ("LINEAR", "STEP"), "animation interpolation is unsupported")
            input_acc, times = values(sampler.get("input")); output_acc, output = values(sampler.get("output"))
            if not times or not output: continue
            clip_start = min(clip_start, times[0][0]); clip_end = max(clip_end, times[-1][0])
            require(input_acc.get("componentType") == 5126 and input_acc.get("type") == "SCALAR", "animation times must be float SCALAR")
            require(all(math.isfinite(row[0]) for row in times) and all(times[index][0] < times[index + 1][0] for index in range(len(times) - 1)), "animation times must be finite and increasing")
            expected = "VEC4" if path_name == "rotation" else "VEC3"; require(output_acc.get("componentType") == 5126 and output_acc.get("type") == expected, "animation output accessor has invalid type")
            require(len(output) == len(times), "animation output count must match input times")
            require(all(math.isfinite(value) for row in output for value in row), "animation output contains non-finite values")
        require(math.isfinite(clip_start) and abs(clip_start) <= 1e-6, "animation must start at zero without an unintended loop lead-in: " + str(animation.get("name")))
        if math.isfinite(clip_start) and math.isfinite(clip_end):
            animation_reports.append({"name": animation.get("name"), "startSeconds": clip_start, "durationSeconds": clip_end})
    return {"ok": not failures, "input": str(path), "profile": profile, "limits": limits, "sourceSHA256": sha(data), "textureSHA256": [texture["sha256"] for texture in texture_reports], "counts": {"triangles": triangles, "vertices": vertices, "materials": len(material_ids), "bones": bones, "animations": len(animations)}, "animations": animation_reports, "textures": texture_reports, "textureRoles": texture_roles, "failures": failures, "note": "Structural asset checks only; visual acceptance and measured phone FPS remain separate."}

def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--input", required=True); parser.add_argument("--profile", required=True, choices=LIMITS); parser.add_argument("--output", required=True); parser.add_argument("--required-clips", nargs="*", default=[])
    for name in ("triangles", "vertices", "materials", "bones", "texture"): parser.add_argument("--max-" + name, type=int)
    args = parser.parse_args(); overrides = {"max_" + key: getattr(args, "max_" + key) for key in ("triangles", "vertices", "materials", "bones", "texture")}
    try: report = check(args.input, args.profile, overrides, args.required_clips)
    except Exception as error: report = {"ok": False, "input": args.input, "profile": args.profile, "failures": [str(error)], "note": "Structural asset checks only; visual acceptance and measured phone FPS remain separate."}
    Path(args.output).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8"); return 0 if report["ok"] else 1
if __name__ == "__main__": sys.exit(main())
