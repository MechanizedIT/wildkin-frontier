# Mossling neutral reference candidate

Status: **candidate only — pending independent visual review**. This directory is not an admitted game asset and must not be sent to TRELLIS until the reviewer accepts the anatomy target.

Selected input: `mossling-neutral-v3.png` (SHA-256 `8922D5012BEA0D339F8413BF1F31975632372BC380CF8CDB2772EF92A631435D`).

The selected frame shows the approved cream fox-like Mossling in a single relaxed quadruped stand: four visible, grounded paws; a horizontal torso; a leafy rear tail; and a strict left-facing side profile. The muzzle, chest, level spine, hips, paws and tail base point along one left-to-right axis. V1 and V2 are retained only as rejected generation records: V1 made the creature upright/bipedal; V2 had a viewer-facing head despite a broadside body.

## Generation receipt

- Tool: built-in OpenAI image generation tool.
- Image-model backend: **undisclosed**.
- Intended downstream use: one local image-to-3D input, only after an independent visual judge checks the actual PNG.
- Reference used: `art/source/mossling-v1/reference.png`.
- Background: opaque white with a faint contact shadow; no alpha cleanup is needed.

## Exact selected prompt

```text
Use case: stylized-concept
Asset type: one clean reference image for local image-to-3D reconstruction of a riggable quadruped game creature.
Input image: preserve the provided Mossling's identity only: cream fox-like animal body, leaf mantle, green leafy ears and tail, white flowers, matte low-poly faceting.
Generate a STRICT LEFT SIDE ORTHOGRAPHIC PROFILE of this exact animal. Its nose points to IMAGE LEFT. The centerline through nose, muzzle, neck, chest, level horizontal spine, hips, all paws and tail base runs left-to-right across the image in one untwisted direction. This is an anatomical alignment diagram expressed as polished game concept art, not a posed character portrait.
The head absolutely must NOT turn toward the viewer. Only ONE near-side eye may be visible; the far eye must be completely hidden by the bridge of the muzzle/head. Show the side plane of the muzzle, not a symmetrical front face. Both ears may have visible outer side surfaces but do not expose a frontal face.
The creature is a compact four-legged fox/cat-like quadruped, never humanoid or upright. All four legs are planted in a neutral standing rest pose: near foreleg and near hind leg clearly visible, far foreleg and far hind leg subtly visible only through small physical depth separation behind the near legs. Paws point to the LEFT with the body—no outturned paws. The leafy tail emerges from the rear at IMAGE RIGHT and curves upward, remaining connected to the hips.
Single complete animal, fully inside frame, centered, pure opaque white studio backdrop, only a faint soft contact shadow. No alpha background.
Style: same warm polished stylized low-poly creature reference, modest clean facets, cream body/muzzle, layered moss-green leaves and small white flowers, restrained matte shading, no reflections.
Hard exclusions: no three-quarter view, no front view, no face looking at camera, no head twist, no broadside torso with viewer-facing face, no action or gait, no contrapposto, no duplicate limbs, no extra paws, no biped body, no human arms, no props, no multiple views/turnaround, no text, no logo, no watermark.
```

## Author self-review

- Reject V1: upright/biped form, violating the quadruped target.
- Reject V2: although quadrupedal, the head looks toward the viewer while the torso runs broadside, recreating the runtime axis defect.
- V3 makes the enforced axis visible: strict profile, one visible eye, nose/paws to image left, and no head twist.
- An independent reviewer must inspect V3 before any 3D generation begins.
