# Local work preserved outside the U4E commit

The working tree contained unrelated local/generated work in addition to the U4E changes. These paths were compared before staging and were deliberately left untouched and unstaged:

The repository starting commit for this task was `f1b16f11dd15f1b7b502bfcc3385c581718b1f1c` on `main`. The remote was aligned before implementation. No unrelated changes were staged.

- Modified: `native/evidence/unity/u3-mesher-resolution/burst-readiness-editor.json`
- Modified: `native/unity/WildkinUnity/Assets/Settings/HDRPDefaultResources/HDRenderPipelineAsset.asset`
- Modified: `native/unity/WildkinUnity/Assets/Settings/HDRPDefaultResources/HDRenderPipelineGlobalSettings.asset`
- Untracked: `Builds/`
- Untracked: `authoring/`
- Untracked: `docs/evidence/voxel-phase05/portable/`

The U4E commit stages only its own runtime code, scene, tests, prompt, evidence and relevant checkpoint documentation. No browser evidence or HDRP settings/assets are included.
