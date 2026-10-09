# All In One VFX Toolkit — Install and render pipeline setup

> **Base path:** `<AllIn1Root>` is the asset folder — the one that contains `AllIn1VfxAssemebly.asmdef` (find it with `Glob **/AllIn1VfxAssemebly.asmdef`; never hard-code its location). The asset's own editor code finds it with `AssetDatabase.FindAssets("t:folder AllIn1VfxToolkit")`, so the folder may be moved but must keep the name `AllIn1VfxToolkit`.
> See also: [all-in-one-vfx-toolkit-shaders-and-variants.md](all-in-one-vfx-toolkit-shaders-and-variants.md) (which shader file does what), [all-in-one-vfx-toolkit-mobile-optimization.md](all-in-one-vfx-toolkit-mobile-optimization.md)

Sources: vendor docs "Setup and Render Pipelines", "First Steps", FAQ, plus the installed v2.32 code. Pipeline
names below are Built-in (BiRP), URP, HDRP.

---

## What the package is

- Asset Store "All In 1 VFX Toolkit" (v2.32 checked), compatible with Unity 2019.4 and up including Unity 6; works in
  BiRP, URP (incl. the 2D Renderer with limits) and HDRP. One uber-shader per pipeline with ~67 combinable effects, custom
  material inspectors, particle helpers, texture tools, ~700 premade textures, meshes and ~250 demo materials.
- Two docs sections to read first (per the vendor): *First Steps* and *Shader Structure and Usage*; everything else on demand.
  The shipped `Documentation.pdf` is only a link to the online manual.
- Code namespace `AllIn1VfxToolkit` (one exception: `AllIn1VfxToolkit.Scripts.AllIn1GraphicMaterialDuplicate`).

## Assembly facts (for asmdefs and builds)

- The file is `AllIn1VfxAssemebly.asmdef` ("Assemebly") but its internal name is `AllIn1VfxAssmebly` ("Assmebly").
  Reference it from another asmdef by **GUID** (`GUID:<guid from its .meta>`) or by the internal name — never by the file
  name — and never rename the file: the asset's import post-processor matches the file name to regenerate the Lit shader.
- It references `Unity.InputSystem` (a leftover): the **Input System package must be installed** or the assembly does not
  compile, even though the runtime scripts do not use input.
- The asmdef sits at the asset root, so `Scripts/`, `Editor/` and `Shaders/` are one assembly with no platform filter.
  Editor code is wrapped in `#if UNITY_EDITOR`; a few small unguarded files (`Constants`, `AllIn1ShaderPropertyType`,
  `RenderPipelineChecker`, `AllIn1VfxNoiseCreator`, the runtime-visible parts of the two authoring components) compile into
  players as inert dead code.
- Demo code has its own asmdefs (`AllIn1VfxDemoScriptAssemblies`, `AllIn1VfxTexDemoAssembly`), also auto-referenced and
  compiled into players. `Demo & Assets` is the bulk of the package (hundreds of MB: textures, meshes, 250+ materials, two
  demo scenes, prefabs). Minimal install: skip or delete it, then open the toolkit window and set valid **Save Paths**.
  Nothing in the shipped runtime depends on it. Premade textures/meshes/materials you still want must be copied out first.
- Demo scripts using the old input API fail with an Input System namespace error: set
  *Project Settings → Player → Other Settings → Active Input Handling* to `Both`, or delete the demo.

## Built-in render pipeline

Works out of the box. Optional, only to match the store look: Post Processing package, HDR on in Graphics Settings and on
the camera, `Post Process Layer` + a global `Volume` using the shipped `AllIn1VfxPp Profile`. Shaders: `AllIn1Vfx`,
`AllIn1VfxBuiltIn`, `AllIn1VfxGrabPass` (see the shaders reference for what each implements). Screen distortion uses a
`GrabPass` and is the costliest effect in this pipeline.

## URP

Steps 1–4 are essential, 5–7 optional (vendor):
1. URP installed with a pipeline asset assigned in Graphics Settings (and in every Quality level that should render VFX).
2. On the pipeline asset enable **Depth Texture** (needed by soft particles and intersection glow) and **Opaque Texture**
   (needed by screen distortion) — **only if you use those effects**; each is a full-screen copy (see the mobile reference).
3. Import `ImportUrpPackage.unitypackage` from the asset root (`Import2DRenderer.unitypackage` for the 2D Renderer). It adds the
   `AllIn1VfxURP` shader the inspector swaps to, the URP demo scene and re-pointed demo materials. Alternatively assign
   `AllIn1VfxSRPBatch` by hand (it is already in `Shaders/` and is the SRP Batcher-compatible choice).
4. The vendor says to delete `AllIn1VfxBuiltIn` and `AllIn1VfxGrabPass` to avoid errors; verify against the installed files
   (in v2.32 `AllIn1VfxSRPBatch` ships beside them).
5. Optional: Player Settings → Color Space = Gamma to match the demo look (the vendor tunes the demo in Gamma; in Linear the same values look different, especially blended and HDR-glow colours — retune rather than switching a project's colour space for VFX).
6. 2D Renderer only: run *Disable Depth and Scene Color effects* in the Asset Window — the 2D Renderer does not support soft
   particles, intersection glow or screen distortion.
7. On newer URP versions retune the Bloom values on the camera's Volume if the demo looks different.
- Glitchy artefacts on some mesh effects on certain Unity versions (vendor FAQ): the depth must be available when
  transparent materials render — set the pipeline asset's *Depth Texture Mode* to `After Opaques`.
- Per-quality-level reality: soft particles / intersection glow / screen distortion need the toggles on **the pipeline asset
  of the quality level that is active on the device**. A material that works on the desktop level silently loses those
  effects on a mobile level whose asset has the toggles off. Fix the material (remove the effects) rather than enabling
  the toggles globally.
- Custom renderer features, Render Graph and Forward+/Deferred are not touched by the toolkit: the unlit shaders render in
  the standard transparent pass (`SRPDefaultUnlit`, no `LightMode`).

## HDRP

Feature parity with the other pipelines. Install HDRP, import `ImportHdrpPackage.unitypackage` (the vendor names a pre-2020
and a 2020+ variant), delete the Built-in shaders, and for the demo set the *Default Volume Profile Asset* to
`AllIn1PostProcessingHDRP`. The store look is not reproducible without editing materials; author HDRP effects inside HDRP.
`Use Unity Fog` has no effect in HDRP (fog is post-processing).

## ECS (Entities Graphics)

Needs URP plus the Entities Graphics package. Configure the material in the inspector as usual, then assign it to the
entity's rendering component (no conversion step). The DOTS-capable shader is `AllIn1VfxDOTS`; the SRP-batch HLSL includes
are pre-included — do not edit them. Not relevant to GameObject VFX.

## Visual Effect Graph

Not supported: VFX Graph does not accept custom shaders (only Shader Graph), so toolkit shaders cannot be used there.
Use the Particle System (Shuriken) with the Particle System Helper instead.

## Unity upgrade or pipeline switch checklist

1. Let scripts recompile (the importer regenerates the Lit shader because the stored pipeline/version differ) or press
   *Refresh Lit Shader* in the toolkit window.
2. Import the matching pipeline package from the asset root if you need `AllIn1VfxURP`/`AllIn1VfxHDRP`.
3. Run *Auto Setup Pipeline shader variant* on the folders that hold your effect materials.
4. Re-check the pipeline asset toggles (Depth/Opaque Texture) for every quality level, then the Frame Debugger for "SRP Batch".
5. Re-apply any manual shader edit (for example `half` → `float`); package updates overwrite it.
