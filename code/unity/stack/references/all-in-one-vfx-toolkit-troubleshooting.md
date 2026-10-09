# All In One VFX Toolkit — Troubleshooting (symptom → cause → fix)

> **Base path:** `<AllIn1Root>` is the asset folder — the one that contains `AllIn1VfxAssemebly.asmdef` (find it with `Glob **/AllIn1VfxAssemebly.asmdef`; never hard-code its location).
> See also: [all-in-one-vfx-toolkit-shaders-and-variants.md](all-in-one-vfx-toolkit-shaders-and-variants.md) (why), [all-in-one-vfx-toolkit-pipeline-setup.md](all-in-one-vfx-toolkit-pipeline-setup.md) (setup)

Find the symptom, apply the fix. "[inf]" marks a cause inferred from code and not yet reproduced in the editor.
Sources: vendor FAQ and docs plus the v2.32 shader/editor/script code.

---

## Looks wrong in the editor or in a prefab

| Symptom | Cause | Fix |
|---|---|---|
| Prefab renders wrong or pink; the material is gone | The material lived in the scene; the prefab lost its reference | Select the object → *Save Material to Folder* → then make the prefab. Set the *Material Save Path* to a project folder first. |
| Toggling an effect does nothing (no visual change) | The material's shader ignores that keyword (`AllIn1Vfx` ignores fog, soft particles, intersection glow, screen distortion, screen-UV) | Move the material to the shader that implements it — in URP `AllIn1VfxSRPBatch`; see the support table in the shaders reference. |
| "Shader AllIn1VfxURP not found. Import the appropriate Pipeline package" when toggling an effect | The inspector swaps non-SRP-batch materials to `AllIn1VfxURP`, which ships only inside `ImportUrpPackage.unitypackage` | Import the pipeline package, or put the material on `AllIn1VfxSRPBatch` first (the swap keeps it). |
| Adding `AddAllIn1Vfx` replaced my material | The component auto-creates a toolkit material when the current shader name lacks "Vfx" | Add the component only to objects meant for toolkit materials; undo, or re-assign the old material. |
| Materials look frozen in the Scene view | *Always Refresh* is off | Enable it in the Scene view effects dropdown (editor only; the Game view animates). |
| Colours/glow differ from the demo or store images | Demo is tuned in Gamma with Bloom and HDR | Retune; do not change the project colour space for it. |
| Glow does not glow | No HDR target or no Bloom | HDR on the pipeline asset/camera and Bloom in a Volume; or accept brightness only. |
| Shield/area edge glow or soft intersection missing | `DEPTHGLOW`/`SOFTPART` need the URP **Depth Texture**; the toolkit never enables it; toolkit quads are not in the depth texture | Enable the toggle on the active quality level's asset, or replace with `RIM`/shaped alpha. |
| Screen distortion shows nothing | URP **Opaque Texture** off; `AllIn1VfxGrabPass` used under URP (GrabPass is not executed); the object is itself transparent so it is not in the opaque texture | Opaque Texture on, `AllIn1VfxSRPBatch`, Transparent preset — or drop the effect on mobile. |
| Soft particles/intersection glow/distortion fail only in the 2D Renderer | The URP 2D Renderer does not support them | Run *Disable Depth and Scene Color effects* on the materials. |
| Glitchy artefacts on mesh effects in URP on some Unity versions | The depth is not ready when transparent materials render | Pipeline asset *Depth Texture Mode* = `After Opaques` (vendor FAQ). |
| Scrolling texture smears or shows a seam | Texture wrap mode is Clamp | Set `Wrap Mode = Repeat` on the texture. |
| A seam or blurry line in a polar-coordinate effect | `atan2` seam and discontinuous derivatives | Use a texture without detail at the seam; avoid `POLARUV` + `PIXELATE`. |
| Pixelate looks broken with distortion | Vendor warning: they do not combine well | Drop one of them. |
| Soft Add looks wrong where layers overlap | A blend limitation | Use Additive and lower the alpha, or Blend Add/Premultiply. |
| Additive effect is blown out on a bright background | Additive adds to the frame | Blend Add/Premultiply, or darken the environment behind. |
| Black square around a texture | Black background by design, not made transparent | *Premultiply Color*, grayscale-as-alpha, or Additive. |

## Looks wrong only in a device build

| Symptom | Cause | Fix |
|---|---|---|
| Material pink or the effect missing in a build, fine in the editor | A keyword combination set at runtime (`EnableKeyword`) has no compiled variant, or a needed shader/variant was stripped | Do not toggle keywords at runtime; drive amounts. Keep a built material with the same keyword set. Use *Strict Shader Variant Matching* in a development build to list missing keywords. |
| Effects from Addressables/AssetBundles are plain or pink | Variants are stripped per build unless a material in that build uses them | Build the bundle containing the materials/shaders together, or keep the material in the bundle that is built with the same shader variants. |
| Time-based effects stutter or stop after a few minutes on a phone | `half` precision for time maths on mobile GPUs | Replace `half` with `float` in the shader file(s) and `.cginc`/`.hlsl` includes (vendor FAQ); reapply after updating the package. |
| Pink after switching pipeline or Unity version | Generated Lit shader or pipeline mismatch | Let scripts recompile, then *Refresh Lit Shader* and *Auto Setup Pipeline shader variant*. |
| Effect reads different on Vulkan vs GLES or on another device | Precision of `half` world positions and screen-space maths [inf] | Keep far-from-origin screen-UV/distance-fade effects near the origin or use `float` shaders. |

## Time, pause and animation

| Symptom | Cause | Fix |
|---|---|---|
| Material stops animating when the game is paused | Shader uses scaled `_Time` | Tick *Use Custom Time* on the material **and** keep an active `SetAllIn1VfxCustomGlobalTime` in the scene. |
| Custom time enabled, still frozen | No active component; or on `AllIn1VfxSRPBatch`/`DOTS` the global is shadowed by a per-material property [inf] | Add the component; test with `timeScale = 0`; else write `globalCustomTime` per material (see the scripting reference). |
| Fake light does nothing | No `AllIn1VfxFakeLightDirSetter`; or the SRP-batch per-material property shadows the global [inf] | Add the component; else `Material.SetVector("_All1VfxLightDir", …)`. |
| UI Image material cannot be animated, or animating one Image changes all | UI Images share one material instance | Give each Graphic its own material instance (and destroy it), animate from code/tween. |
| Every copy of a looping effect moves in sync | Same material, same time | Random seed: Custom Data row 1 for particles; per-instance `_TimingSeed` for meshes. |
| Animator curve on a material property does nothing | UI material, or the material is shared | Renderer materials only; for UI use code. |

## Particles and Custom Data

| Symptom | Cause | Fix |
|---|---|---|
| Dissolve/fade does not follow Custom Data | *Fade Amount Driven By Vertex Stream* off (alpha drives it), or Custom Data Auto Setup not run | Tick the toggle and run *Custom Data Auto Setup*. |
| Stream toggles are missing in the material | The material is not on a Particle System | Assign it to a particle renderer; they show only there. |
| Texture offset / shape weights have no effect | The stream rows are missing or the effect is off | Enable the effect first, then auto-setup; check each row exists. |
| Per-shape offset cannot differ | Custom Data carries one offset pair for all shapes | Use the per-shape multipliers `_OffsetSh1…3`. |
| Editor freezes opening the Particle System Helper | Preset sections scan the whole project | Keep the preset foldouts closed; avoid the preset buttons in huge projects. |
| Applied helper preset made particles invisible | Helper presets store a transparent-black start colour [inf] | Set the start colour after applying. |
| Dissolved particles still cost fill | The shader still shades alpha-0 pixels | Add `ALPHACUTOFF` or shrink the quad. |

## Setup and compile

| Symptom | Cause | Fix |
|---|---|---|
| Namespace error from `UnityEngine.InputSystem` after import | Demo scripts use the old input API / Input System missing | *Active Input Handling* = `Both`, or install the Input System package, or delete the Demo. |
| The toolkit asmdef cannot be referenced | Referenced by the file name | Reference by GUID or by the internal name `AllIn1VfxAssmebly`. |
| Toolkit window cannot find folders after moving the asset | Editor lookup uses the folder name `AllIn1VfxToolkit` | Keep the folder name; reopen the window and fix *Save Paths*. |
| Lit shader differs/modified in version control | It is regenerated per editor session from `LitShaders/*.txt` | Treat as generated; do not hand-edit; decide once whether to commit it. |
| Editor log "Build asset version error … allin1vfxlit.shader" | The importer rewrote the file during import | Harmless; noisy. |
| "Running out of keywords" with other big shader assets | Global keyword budget (256) | The toolkit already uses local keywords (3 global); reduce the other assets' global keywords. |
| Compile errors in `Editor/` files of a player assembly | Editor files compile in the player assembly | They are wrapped in `#if UNITY_EDITOR`; do not remove the guards. |
| Gradient texture bloats a material | Embedded sub-asset left behind | *Assets → AllIn1Vfx Gradients → Remove All Gradient Textures* (removes all sub-assets, then recreate what you need). |
