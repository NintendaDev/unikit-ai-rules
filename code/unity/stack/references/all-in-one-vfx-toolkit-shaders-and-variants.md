# All In One VFX Toolkit — Shaders, keywords and variants

> **Base path:** `<AllIn1Root>` is the asset folder — the one that contains `AllIn1VfxAssemebly.asmdef` (find it with `Glob **/AllIn1VfxAssemebly.asmdef`; never hard-code its location). Shader files are in `<AllIn1Root>/Shaders/`, their includes in `Shaders/ShaderLibrary/`.
> See also: [all-in-one-vfx-toolkit-pipeline-setup.md](all-in-one-vfx-toolkit-pipeline-setup.md) (what to install per pipeline), [all-in-one-vfx-toolkit-effects-full.md](all-in-one-vfx-toolkit-effects-full.md) (per-effect keywords), [all-in-one-vfx-toolkit-mobile-optimization.md](all-in-one-vfx-toolkit-mobile-optimization.md)

Facts below are read from the shader and editor code of v2.32. "[inf]" marks an inference not verified in the editor.

---

## Which shader file for which pipeline

| Shader (`Shader "…"`) | Pipeline | Facts that matter |
|---|---|---|
| `AllIn1Vfx/AllIn1Vfx` | Any (CG, no pipeline tag) | The "core" shader. Plain uniforms, **not SRP Batcher compatible**; GPU instancing with an instanced `_TimingSeed` only. Declares but **ignores** fog, soft particles, intersection glow, screen distortion and screen-UV keywords. Unlit; in URP it draws as `SRPDefaultUnlit`. |
| `AllIn1Vfx/AllIn1VfxBuiltIn` | Built-in (CG; also runs in URP as unlit CG [inf]) | Core + fog, soft particles, intersection glow, screen-UV. No screen distortion. Not SRP Batcher compatible. |
| `AllIn1Vfx/AllIn1VfxGrabPass` | Built-in **only** | BuiltIn + screen distortion through an **unnamed `GrabPass`**, which runs once per object using the shader even with distortion off. SRP pipelines do not execute GrabPass [inf]. |
| `AllIn1Vfx/AllIn1VfxSRPBatch` | URP (≥12) and HDRP (≥12.1) | HLSL, **the only main shader that is SRP Batcher compatible** (all properties in `UnityPerMaterial`). Implements fog, soft particles, intersection glow, screen distortion (URP Opaque Texture / HDRP colour pyramid), screen-UV. Unlit. The URP/HDRP SubShader is chosen by Unity from the installed package. |
| `AllIn1Vfx/AllIn1VfxDOTS` | URP / HDRP with Entities Graphics | The SRP-batch shader plus `DOTS_INSTANCING_ON` and `#pragma target 4.5`. Irrelevant unless you use ECS rendering. |
| `AllIn1Vfx/AllIn1VfxLit` | per generated file | **Generated** file (see below); reacts to 3D lights. Heavy. |
| `AllIn1Vfx/AllIn1VfxURP`, `AllIn1Vfx/AllIn1VfxHDRP` | URP / HDRP | **Not in `Shaders/`** — they ship inside `ImportUrpPackage.unitypackage`, `Import2DRenderer.unitypackage` and `ImportHdrpPackage.unitypackage` at the asset root. The inspector's automatic shader swap targets them; without the package imported, toggling an effect on a material that is not already on `AllIn1VfxSRPBatch` shows "Shader AllIn1VfxURP not found. Import the appropriate Pipeline package". The URP shader is plain HLSL properties, so it is **not** SRP Batcher compatible. |
| `AllIn1Vfx/Others/ZWrite`, `…/ZWriteGpuInstancing` | Fixed-function / CG | Depth-only helpers (`ColorMask Off`, `ZWrite On`, `Offset 0,1`), apparently a second material that writes depth for a mesh so overlapping transparent shells sort (purpose inferred; the code does not state it). Their `"RenderQueue"` tag is wrong (should be `Queue`), so it is ignored; the non-instancing one likely draws nothing in SRP [inf]. |
| `AllIn1Vfx/Noises/*` (`EditorShaders/`) | CG, editor | Bake noise textures in the Asset Window. Not referenced by any material, so not in a build. |

**Decision for a URP mobile project.** Use `AllIn1VfxSRPBatch` for every effect material (set it by hand, or import the
URP package and run the Asset Window's *Auto Setup Pipeline shader variant*, then verify with the Frame Debugger that draws
are labelled "SRP Batch"). The CG shaders (`AllIn1Vfx`, `AllIn1VfxBuiltIn`) work under URP but are never SRP-batched.
`AllIn1VfxGrabPass` is Built-in only. The vendor's setup text says to delete the Built-in and Grab-pass shaders in URP/HDRP
to avoid errors; in v2.32 the folder also holds `AllIn1VfxSRPBatch`, so check which files the installed version ships.

## How the shader is chosen (and what goes wrong)

- **Non-Lit shaders are not swapped automatically at build time.** The material editor swaps them when you toggle an effect:
  on Built-in, `SCREENDISTORTION_ON` → `AllIn1VfxGrabPass`; `FOG_ON`, screen-UV, `SOFTPART_ON` or `DEPTHGLOW_ON` →
  `AllIn1VfxBuiltIn`; otherwise `AllIn1Vfx`. On URP/HDRP a material already on `AllIn1VfxSRPBatch` stays; any other becomes
  `AllIn1VfxURP`/`AllIn1VfxHDRP`. The Asset Window's *Auto Setup Pipeline shader variant* applies the same logic to a folder.
  It reads the pipeline from `GraphicsSettings.defaultRenderPipeline` (the **default** pipeline asset, not the per-quality one).
- **The Lit shader is generated.** `AllIn1VfxShaderImporter` (`[InitializeOnLoad]`) copies one of
  `Shaders/LitShaders/AllIn1VfxLit_BetterShader_<Standard|URP2019…2023|HDRP2019…2023>.txt` over `Shaders/AllIn1VfxLit.shader`
  (Unity 6 uses the `2023` files) once per editor session and whenever the pipeline package or Unity major changes. It detects
  "is the URP/HDRP package **installed**", not "is it the active pipeline" — with URP installed but Built-in active, Lit becomes
  URP while the auto-setup picks Built-in shaders. Never hand-edit the generated file; the Asset Window's *Refresh Lit Shader*
  regenerates it. Treat it as generated output in version control (a 600 KB, 16k-line file whose timestamp changes each
  session). The Unity 2020 paths in the importer have a doubled `BetterShader_` and fail on 2020.x only.
- **Pipeline detection differs between the two tools** (package presence vs default asset): a project that has both packages
  or switches pipelines gets inconsistent results — run both *Refresh Lit Shader* and *Auto Setup* after any switch.

## Feature support per shader

| Feature (keyword) | `AllIn1Vfx` | `BuiltIn` | `GrabPass` | `SRPBatch` / `DOTS` / `URP` | `Lit` |
|---|---|---|---|---|---|
| Shapes, colour, alpha, UV effects | yes | yes | yes | yes | yes |
| `FOG_ON` | ignored | yes | yes | yes | ignored |
| `SOFTPART_ON` | ignored | yes (depth) | yes (depth) | yes (depth) | ignored |
| `DEPTHGLOW_ON` | ignored | yes (depth) | yes (depth) | yes (depth) | yes |
| `SCREENDISTORTION_ON` | ignored | ignored | yes (GrabPass) | yes (opaque / colour pyramid) | ignored |
| `SHAPE_N_SCREENUV_ON` | ignored | yes | yes | yes | yes |
| `LIGHTANDSHADOW_ON` | yes | yes | yes | yes | commented out (real lights) |
| `TIMEISCUSTOM_ON` (global time) | yes | yes | yes | property shadows the global [inf] | zero [inf] |

## Passes, depth and the depth texture

- Every non-Lit shader has **one** pass: no ShadowCaster, no DepthOnly, no Meta. Consequence: toolkit materials cast no
  shadows and, even with `ZWrite` on, never enter `_CameraDepthTexture` (the URP depth pre-pass draws only `DepthOnly`
  passes). Soft particles and intersection glow therefore fade against **other** (opaque) geometry, never against another
  VFX quad.
- The toolkit never enables the URP *Depth Texture* or *Opaque Texture* — the project's pipeline asset must (for every
  quality level that renders the effect). Without them `SOFTPART`/`DEPTHGLOW` and `SCREENDISTORTION` silently do nothing
  or sample an empty texture. The Asset Window's *Disable Depth and Scene Color effects* turns the three keywords off in a
  folder of materials (it loads only files directly in the folder, not recursively).
- `AllIn1VfxLit` (URP 2023 file) has seven passes (Forward, GBuffer, ShadowCaster, DepthOnly, Meta, DepthNormals,
  MotionVectors) and **re-runs the entire procedural surface function in every depth/shadow pass** because alpha clip needs
  it; alpha clip is always on (`clip(alpha - _AlphaCutoffValue - 0.01)`). Its forward pass hard-codes `Blend One Zero`, so
  blend presets other than opaque have no effect, and `_ZWrite` is forced to 1 only while its inspector is drawn.
  Metallic/smoothness cannot be authored.

## Keyword model, budget and stripping

- Each main shader declares **64 `shader_feature_local`** keywords (exactly the per-shader local cap) and **3 global
  `shader_feature`** keywords (`ALPHAFADETRANSPARENCYTOO_ON`, `ALPHAFADEINPUTSTREAM_ON`, `CAMDISTFADE_ON`). Net new global
  keywords for the project: about 3–4. The vendor page "Running out of Shader Keywords" describes switching to local
  keywords by hand; in v2.32 that is already done, and the local cap is full — adding a keyword requires removing one.
- `shader_feature*` means **variants no built material uses are stripped from the player build**. Consequences:
  (1) `Material.EnableKeyword` at runtime for a combination no built material has produces the plain variant or a pink
  material in a device build (Unity attempts to find a similar variant); (2) materials loaded from Addressables/AssetBundles
  built separately need the same keyword sets present in the player build or in their own bundle build; (3) nothing in the
  toolkit's runtime scripts enables keywords.
- To find missing variants in a development build: Graphics Settings → *Strict Shader Variant Matching* (Unity 2022.3+) shows
  the missing keywords as console warnings and a pink material; the build's `Editor.log` lists per shader
  `Full variant space / After settings filtering / After built-in stripping / After scriptable stripping`.
- `AllIn1VfxSRPBatch`/`DOTS`/URP compile `multi_compile_fog` and `multi_compile_instancing` unconditionally: every feature
  combination is multiplied by the fog modes and instancing. `AllIn1VfxBuiltIn`/`GrabPass` wrap `multi_compile_fog` in
  `#if FOG_ON` (whether Unity's pragma pre-scan honours that is unverified).
- `AllIn1VfxLit` (URP) adds ~35 global `multi_compile` tokens (URP lighting set); the raw cross product is on the order of
  10⁸ before URP's stripper. It relies on URP's own build stripping; watch build time and size.
- Stale keywords: the editor's *Deactivate All Effects* / *New Clean Material* use truncated or wrong keyword names for
  several entries (`SHAPE2SHAPECOLOR_`, `ALPHAFADEUSESHAPE1_`, `ALPHAFADEUSEREDCHAN`, `ALPHAFADETRANSPAREN`,
  `ALPHAFADEINPUTSTREA`) and does not clear `TIMEISCUSTOM_ON`, `ADDITIVECONFIG_ON`, `PREMULTIPLYALPHA_ON`,
  `PREMULTIPLYCOLOR_ON`, `SPLITRGBA_ON`, `SHAPEADD_ON`, `NORMALMAP_ON`. A "cleaned" material can keep keywords that enlarge
  the variant set — audit `m_ShaderKeywords` in the `.mat` YAML before shipping.

## Precision

- CG shaders use `half` for material properties, colours and most interpolators; `time`, seed and shape UVs are `float`.
  `worldPos`/`projPos`/`screenCoord` are `half4`: fp16 positions lose accuracy beyond roughly 1000–2000 world units, which
  affects `CAMDISTFADE` and `SHAPE_N_SCREENUV` far from the origin.
- `AllIn1VfxSRPBatch`/`DOTS`: every material property is `float`, locals mostly `half`.
- Vendor FAQ: time-based effects can stutter or stop after a few minutes on mobile GPUs because of `half` precision;
  the fix is replacing `half` with `float` in the shader files (and `.cginc` includes) at minimal cost. The edit modifies
  shipped source — reapply after a package update.

## SRP Batcher, instancing and batching

| Shader | SRP Batcher | GPU instancing | Note |
|---|---|---|---|
| `AllIn1VfxSRPBatch` | yes | `multi_compile_instancing` (ignored by the SRP Batcher path) | The only toolkit shader the SRP Batcher accepts. `_TimingSeed` is a material property here. |
| `AllIn1Vfx`, `BuiltIn`, `GrabPass`, `URP` | no | yes (only `_TimingSeed` instanced in the CG shaders) | Identical meshes + same material batch via instancing; the `Enable GPU Instancing` field is the material checkbox. |
| `AllIn1VfxLit` | unverified | per generated file | Properties sit under keyword-dependent `#if`s, so the layout may differ per variant — check the inspector's SRP Batcher line. |

A renderer with a `MaterialPropertyBlock` leaves the SRP Batcher (Unity documents this). Two materials only batch together
when they use the same shader **variant**: differing keyword sets break a batch group.

## Known code defects (v2.32) worth knowing

1. `AllIn1VfxSRPBatch`/`DOTS` fragment code: the shape-3 weight block copies `shape3ColorWeight` twice and never updates the
   alpha weight — `SPLITRGBA` and the stream weight offset behave wrongly for shape 3 (CG shaders are correct).
2. `globalCustomTime` and `_All1VfxLightDir` are both `[HideInInspector]` material properties and `UnityPerMaterial` members
   in the SRP-batch/DOTS shaders; `Shader.SetGlobalVector` from `SetAllIn1VfxCustomGlobalTime` /
   `AllIn1VfxFakeLightDirSetter` most likely does not reach them [inf]. In the CG shaders they are true globals.
3. `AllIn1Vfx.shader` contains dead code behind an undefined `ATLAS_ON`; harmless.
4. Vertex-colour alpha drives dissolve when `FADE`/`ALPHAFADE` is on (it is not multiplied into the output).
5. Polar and pixelate UV changes make derivatives jump; seams or blurry block edges can appear.
6. Features silently need extra vertex data: `RIM`, `BACKFACETINT`, `LIGHTANDSHADOW`, `VERTOFFSET` need normals;
   `OFFSETSTREAM`/`SHAPEWEIGHTS` need the `TEXCOORD1` stream; the timing seed expects `TEXCOORD0.z`. Missing streams read 0.
7. The Lit and several CG shaders are edited through custom inspectors that address properties by **index**: a shader
   using `AllIn1VfxCustomMaterialEditor` must keep the exact property order.
