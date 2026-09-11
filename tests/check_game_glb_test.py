import json, struct, subprocess, sys, tempfile, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECKER = ROOT / "tools" / "art" / "check-game-glb.py"

def pad(data): return data + b" " * ((4 - len(data) % 4) % 4)

def make_glb(path, *, external=False, bad_weights=False, bad_joint=False, bad_skin_root=False, no_animations=False, time_offset=0):
    positions = struct.pack("<9f", 0, 0, 0, 1, 0, 0, 0, 1, 0)
    joints = bytes([0, 0, 0, 0] * 3)
    weights = bytes([255 if not bad_weights else 200, 0, 0, 0] * 3)
    png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + struct.pack(">II", 1, 1) + b"\x08\x06\x00\x00\x00"
    if bad_joint: joints = bytes([1, 0, 0, 0] * 3)
    times = struct.pack("<2f", time_offset, 1 + time_offset)
    translations = struct.pack("<6f", 0, 0, 0, 0, 0.1, 0)
    inverse_binds = struct.pack("<16f", *([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]))
    chunks = [positions, joints, weights, times, translations, inverse_binds, png]
    offset = 0; views = []
    for chunk in chunks:
        views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(chunk)})
        offset += len(chunk)
    binary = b"".join(chunks)
    doc = {"asset": {"version": "2.0"}, "buffers": [{"byteLength": len(binary)}], "bufferViews": views, "accessors": [{"bufferView": 0, "componentType": 5126, "count": 3, "type": "VEC3"}, {"bufferView": 1, "componentType": 5121, "count": 3, "type": "VEC4"}, {"bufferView": 2, "componentType": 5121, "normalized": True, "count": 3, "type": "VEC4"}, {"bufferView": 3, "componentType": 5126, "count": 2, "type": "SCALAR"}, {"bufferView": 4, "componentType": 5126, "count": 2, "type": "VEC3"}, {"bufferView": 5, "componentType": 5126, "count": 1, "type": "MAT4"}], "images": [{"bufferView": 6, "mimeType": "image/png"}], "textures": [{"source": 0}], "materials": [{"pbrMetallicRoughness": {"baseColorTexture": {"index": 0}}}], "meshes": [{"primitives": [{"attributes": {"POSITION": 0, "JOINTS_0": 1, "WEIGHTS_0": 2}, "material": 0}]}], "nodes": [{"mesh": 0, "skin": 0}, {"name": "root"}], "skins": [{"joints": [1], "skeleton": 9 if bad_skin_root else 1, "inverseBindMatrices": 5}], "animations": [{"name": "Idle", "samplers": [{"input": 3, "output": 4}], "channels": [{"sampler": 0, "target": {"node": 1, "path": "translation"}}]}]}
    if external: doc["buffers"][0]["uri"] = "https://example.invalid/model.bin"
    if no_animations: doc.pop("animations")
    encoded = pad(json.dumps(doc, separators=(",", ":")).encode())
    payload = struct.pack("<I4s", len(encoded), b"JSON") + encoded + struct.pack("<I4s", len(binary), b"BIN\x00") + binary
    path.write_bytes(struct.pack("<4sII", b"glTF", 2, 12 + len(payload)) + payload)

class GameGlbCheckerTests(unittest.TestCase):
    def run_check(self, fixture, *extra):
        report = fixture.with_suffix(".report.json")
        done = subprocess.run([sys.executable, str(CHECKER), "--input", str(fixture), "--profile", "creature", "--output", str(report), "--required-clips", "Idle", *extra], capture_output=True, text=True)
        return done.returncode, json.loads(report.read_text())

    def test_valid_embedded_skinned_glb_reports_facts(self):
        with tempfile.TemporaryDirectory() as temp:
            fixture = Path(temp) / "valid.glb"; make_glb(fixture)
            code, report = self.run_check(fixture)
            self.assertEqual(code, 0); self.assertTrue(report["ok"])
            self.assertEqual(report["counts"]["triangles"], 1); self.assertEqual(report["counts"]["bones"], 1)
            self.assertEqual(report["textures"][0]["width"], 1); self.assertEqual(len(report["sourceSHA256"]), 64)

    def test_rejects_external_buffer_invalid_weights_and_missing_clip(self):
        with tempfile.TemporaryDirectory() as temp:
            external = Path(temp) / "external.glb"; make_glb(external, external=True)
            code, report = self.run_check(external); self.assertEqual(code, 1); self.assertIn("no buffer URI", " ".join(report["failures"]))
            bad_weights = Path(temp) / "weights.glb"; make_glb(bad_weights, bad_weights=True)
            code, report = self.run_check(bad_weights); self.assertEqual(code, 1); self.assertIn("normalized", " ".join(report["failures"]))
            valid = Path(temp) / "missing.glb"; make_glb(valid)
            code, report = self.run_check(valid, "Walk"); self.assertEqual(code, 1); self.assertIn("required clip missing: Walk", report["failures"])

    def test_rejects_skin_contract_even_without_animations(self):
        with tempfile.TemporaryDirectory() as temp:
            bad_joint = Path(temp) / "joint.glb"; make_glb(bad_joint, bad_joint=True, no_animations=True)
            report_path = bad_joint.with_suffix(".report.json")
            done = subprocess.run([sys.executable, str(CHECKER), "--input", str(bad_joint), "--profile", "creature", "--output", str(report_path)], capture_output=True, text=True)
            report = json.loads(report_path.read_text()); self.assertEqual(done.returncode, 1); self.assertIn("joint index is outside skin", report["failures"])
            bad_root = Path(temp) / "root.glb"; make_glb(bad_root, bad_skin_root=True, no_animations=True)
            report_path = bad_root.with_suffix(".report.json")
            done = subprocess.run([sys.executable, str(CHECKER), "--input", str(bad_root), "--profile", "creature", "--output", str(report_path)], capture_output=True, text=True)
            report = json.loads(report_path.read_text()); self.assertEqual(done.returncode, 1); self.assertIn("skin skeleton root is invalid", report["failures"])

    def test_rejects_animation_lead_in_and_reports_real_duration(self):
        with tempfile.TemporaryDirectory() as temp:
            fixture = Path(temp) / "delayed.glb"; make_glb(fixture, time_offset=1/24)
            code, report = self.run_check(fixture)
            self.assertEqual(code, 1); self.assertIn("loop lead-in", " ".join(report["failures"]))
            make_glb(fixture)
            code, report = self.run_check(fixture)
            self.assertEqual(code, 0); self.assertEqual(report["animations"][0]["durationSeconds"], 1)

if __name__ == "__main__": unittest.main()
