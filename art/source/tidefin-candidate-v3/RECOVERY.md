# Tidefin V3 source recovery

Captured September 11, 2026. **This is an unfinished candidate, not a shipping asset.** The current game still uses its existing Tidefin. V3's stronger Attack/Hurt awaits independent action review, continuous playback and native species cadence calibration. See `candidate/README.md` for the frozen handoff; statements there about no source commit describe the original study checkpoint, before this recovery backup.

- Open `candidate/tidefin-motion-editable.blend` to inspect the retained editable model, palette, rig and actions. The exported candidate is `candidate/tidefin-motion.glb`.
- Candidate GLB SHA256: `5f22dfe31acc9c2b16924d0e662d357c92e17af3518a0c2413ba26440e12eb5f`.
- `backup-manifest.json` records each original path, tracked backup path, byte count and SHA256, including the related Asset Forge skill snapshot. Paths are relative to the repository unless explicitly absolute.
- `inputs/neutral-v5` and `inputs/rig-v2` retain the preceding editable model/rig and checks. `inputs/animation-v2-review` retains the prior GLB for preservation comparison and its CC0 donor license. The donor-walk/run folders retain sampled motion inputs. Candidate render views and numerical receipts are frozen evidence, not new approval.

For a deliberate rebuild, use the tracked `tools/art/build-tidefin.py` and `tools/art/rig-tidefin.py` from their repository locations. Their root/path assumptions refer to the original `.dream-loop` hierarchy. Restore only needed inputs using the manifest's `backup` → `source` mappings into this checkout, verifying hashes first and never overwriting a different existing study. Do not restore an old absolute user-profile path on a new machine. Frozen `builder.py` copies document the exact source version; running them inside this archive without adapting/restoring their paths will not reconstruct the original layout.

Keep generated outputs in a fresh study directory and coordinate bounded Blender resources. Retain original geometry/UV/weight and motion preservation checks. The next action is review of existing evidence after Chris's playtest, not a new inference/render batch merely to resume.
