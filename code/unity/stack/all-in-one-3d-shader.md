---
version: 1.0.0
---

# All In One 3D Shader (AllIn13DShader)

> **Scope**: Seaside Studios "All In One 3D Shader" (also written "All In 1 3D Shader" or "AllIn1 3D Shader"; v2.74, namespace `AllIn13DShader`) — one stackable-effects uber-shader for 3D meshes under URP: choosing a lighting model and effects per material class, what is safe and what is forbidden on mobile, variant and build-size control (Active Effects List, URP feature defines, Bake Shader Keywords), SRP Batcher and shadow rules, runtime property control, URP renderer setup, and a case library of mobile material profiles, gameplay effects and environment looks.
> **Load when**: authoring or reviewing materials that use the All In One 3D Shader (AllIn13DShader), deciding whether an effect is affordable on mobile, optimizing draw calls, shader variants or build size of these materials, setting up URP renderers for outlines, depth-based effects, emission glow or decals, scripting hit flashes, fades, outlines or time control on these materials, enabling or disabling effects at runtime, debugging materials that are pink, black, missing effects in a device build, or not batching.
> **References**: `.unikit/memory/code/stack/references/all-in-one-3d-shader-effects-quickref.md` (one line per effect: what it is, what for, mobile verdict, requirements), `.unikit/memory/code/stack/references/all-in-one-3d-shader-effects-full.md` (per-effect detail blocks: keyword, cost, properties, notes — grep by effect ID), `.unikit/memory/code/stack/references/all-in-one-3d-shader-mobile-optimization.md` (budgets, lighting, shadows, transparency, depth, batching, verification), `.unikit/memory/code/stack/references/all-in-one-3d-shader-variants-and-baking.md` (keyword model, Active Effects List, baking, build checks), `.unikit/memory/code/stack/references/all-in-one-3d-shader-urp-setup.md` (renderer features, defines file, Bloom, errors), `.unikit/memory/code/stack/references/all-in-one-3d-shader-runtime-scripting.md` (properties, materials vs MPB, time, animation, global components), `.unikit/memory/code/stack/references/all-in-one-3d-shader-cases-mobile-profiles.md` (ready material profiles), `.unikit/memory/code/stack/references/all-in-one-3d-shader-cases-gameplay-fx.md` (flash, dissolve, shield, ghost, outline), `.unikit/memory/code/stack/references/all-in-one-3d-shader-cases-environment.md` (wind, toon world, colored shadows, fast lighting)

---

## Core Concepts

- One shader, ~50 effects. Each effect is a `shader_feature_local` keyword that the material inspector sets when you
  tick the effect; code for disabled effects is not compiled, so a disabled effect costs nothing. Effects stack in a
  fixed order inside the shader (vertex → UV → base color → "before lighting" color → lighting → emission → alpha →
  "after lighting" color → fog).
- Four generic shaders: `AllIn13DShader/AllIn13DShader`, `…_NoShadowCaster`, `…Outline`, `…Outline_NoShadowCaster`.
  The inspector swaps between them automatically: any outline type other than `None` selects an `…Outline…` shader;
  `Cast Shadows` **and** `Receive Shadows` both off selects a `…_NoShadowCaster…` shader. Script-side shader changes
  bypass this logic.
- URP passes: main forward pass, `ShadowCaster`, `DepthOnly` (writes R), `DepthNormals`, `Meta`, plus `OutlinePass`
  (`LightMode = OutlinePass`, `Cull Front`) in the outline shaders. A second SubShader serves the Built-in pipeline.
  Vertex effects (wind, shake, distortion…) run again in `ShadowCaster`, `DepthOnly` and `DepthNormals`.
- **Render Preset** (Advanced Configuration): Opaque (queue 2000, `One/Zero`, ZWrite on, turns **Alpha Cutoff on**),
  Transparent (3000, `SrcAlpha/OneMinusSrcAlpha`, ZWrite off), Additive (3000, `One/One`, ZWrite off).
- Toggle properties and keywords are separate: ticking the effect in the inspector sets both the float and the keyword;
  `Material.SetFloat("_Hit", 1)` sets only the float. Drive effects by **amount** properties at runtime, never by keywords.
- Materials created through the `AddAllIn13DShader` component live in the scene until saved; press **Save Material to
  Folder** before turning the object into a prefab. The component is editor tooling — remove it after setup.
- Menus: `Tools/AllIn1/3DShaderWindow` (tabs: Save Paths, Texture Editor, Texture Creator, Override Materials,
  Effects Profile = Active Effects List, URP Settings, Other), `Assets/Create/AllIn13DShader/Materials/*`,
  `Assets/AllIn1/Convert … materials to AllIn13DShader`.
- Code lives in namespace `AllIn13DShader` (assembly `AllIn13DShaderAssemebly` — the vendor's spelling; an asmdef that
  uses it must reference that exact name); runtime helpers are the components
  `WindController`, `FastLightConfigurator`, `ShadowsConfigurator`, `DepthColoringCamera`,
  `ShaderGlobalTimeController`, `AllIn13DShaderRandomTimeSeed`.

## Mobile Quick Rules

Do (details and numbers: `all-in-one-3d-shader-mobile-optimization.md`):

- Pick the cheapest lighting that reads well: `FastLighting` for small or numerous objects, `None` + Custom Ambient
  (1,1,1) for unlit, `Classic`/`HalfLambert`/`FakeGI`/`Toon` for one main light. `PBR`, `ToonRamp`, anisotropic
  specular and Reflections are hero-asset features.
- Stay opaque. Use `Alpha Cutoff` with `Fade`/`Dither` instead of blended transparency, and switch `Alpha Cutoff` **off**
  on fully solid meshes (the shipped presets enable it).
- Turn **both** `Cast Shadows` and `Receive Shadows` off unless the object needs them; also set the renderer's
  shadow casting to Off for non-casters (a "non-casting" material still draws its shadow pass and discards).
- Trim variants at the source: untick unused effects in the Active Effects List, untick unused URP features (Shadow Mask,
  Forward+, SSAO, Adaptive Probe Volumes, lightmaps, additional lights, GPU instancing) in URP Settings, then
  `Bake Shader Keywords` for shipping materials and let identical materials share one baked shader.
- Enable effects in the material asset and drive their amount properties (`_HitBlend`, `_FadeAmount`, `_InflateBlend`…).
- Keep SRP Batcher effective: same shader or baked shader across many materials, cached `Shader.PropertyToID` ids,
  per-object material instances created once and destroyed with their owner.
- Test on the weakest target device with the Frame Debugger (SRP Batch) and a GPU profiler before widening any effect's use.

Never on mobile (or only on a handful of hero objects):

- `Triplanar Mapping`, `Stochastic Sampling`, `Texture Blending`, `Recalculate Normals`, `Wave UV`, `Anisotropic`
  specular, permanent `Glitch`/`Hologram`.
- Depth-texture effects (`Intersection Glow`, `Intersection Fade`, `Screen Space UV`, `Depth Coloring`, `Dither`) while
  the URP asset's Depth Texture is off — they need it, and enabling it costs every frame for the whole camera.
- `Material.EnableKeyword`/`DisableKeyword` for effects, a `MaterialPropertyBlock` on these renderers, or
  `AllIn13DShaderRandomTimeSeed` on batched objects (it uses an MPB).
- Outlines on many objects (each outlined renderer adds a draw), unbounded additional per-pixel lights, full-resolution
  Bloom just to make `Emission` glow.

## Task Router

Open only the row's file; the case library is split by domain on purpose.

| Task | Open first | Then, only if needed |
|---|---|---|
| Build a cheap material for an enemy, prop, pickup or unlit mesh | `all-in-one-3d-shader-cases-mobile-profiles.md` (MOB-xx) | `all-in-one-3d-shader-effects-quickref.md`, then the effect's block in `…-effects-full.md` |
| Which effect gives me look X? Is effect X OK on mobile? What does it need? | `all-in-one-3d-shader-effects-quickref.md` (one line per effect) | `all-in-one-3d-shader-effects-full.md` for chosen IDs only; `all-in-one-3d-shader-mobile-optimization.md` for the rule behind a verdict |
| Audit or speed up existing materials, cut draw calls, memory or GPU time | `all-in-one-3d-shader-mobile-optimization.md` | `all-in-one-3d-shader-variants-and-baking.md` |
| Build size, compile time, "effect missing in device build", pink material, Addressables | `all-in-one-3d-shader-variants-and-baking.md` | `all-in-one-3d-shader-urp-setup.md` (feature defines) |
| Outline invisible, black or pink meshes, Bloom/emission, decals, new renderer or quality level | `all-in-one-3d-shader-urp-setup.md` | — |
| Change a property from code, flash, fade over time, pause-proof or random-offset animation, outline toggle | `all-in-one-3d-shader-runtime-scripting.md` | `all-in-one-3d-shader-cases-gameplay-fx.md` (FX-xx) |
| Gameplay look (hit, death dissolve, shield, ghost, freeze, selection) | `all-in-one-3d-shader-cases-gameplay-fx.md` | `all-in-one-3d-shader-runtime-scripting.md` |
| World look (foliage wind, toon terrain, colored shadows, fast lighting, lightmapped scenery) | `all-in-one-3d-shader-cases-environment.md` | `all-in-one-3d-shader-urp-setup.md` |

## Case Lookup Workflow

1. Find the task in the **Task Router**, then the closest case in the **Case Index**. Open that one file and read only
   the case block — each block states goal, settings, code if any, mobile verdict and pitfalls.
2. No case matches → pick the nearest by technique (e.g. "boss telegraph glow" → FX-03 rim shield) and adapt it; do
   not open other case files "just in case".
3. Choosing effects → scan `all-in-one-3d-shader-effects-quickref.md` (one line per effect, with ID). Need a keyword,
   property name, cost or requirement of the effects you picked → `Grep "^### <ID> " -A 9` in
   `all-in-one-3d-shader-effects-full.md`; do not read that file whole. **Never guess a property name** — a misspelled
   `SetFloat` fails silently; the full block (or the `Properties` block of `AllIn13DShader.shader`) is the source.
4. Any change that touches variants, URP asset or renderer settings is a project-wide change: read
   `all-in-one-3d-shader-variants-and-baking.md` or `all-in-one-3d-shader-urp-setup.md` first, and commit the generated files it names.

## Case Index

| ID | Case | File |
|---|---|---|
| MOB-01 | Cheapest lit opaque mesh (enemy, prop) with vertex colors and a flash slot | `all-in-one-3d-shader-cases-mobile-profiles.md` |
| MOB-02 | Unlit flat or emissive mesh (pickup, marker, UI-in-world) | `all-in-one-3d-shader-cases-mobile-profiles.md` |
| MOB-03 | Toon-styled character: toon light, rim, optional outline | `all-in-one-3d-shader-cases-mobile-profiles.md` |
| MOB-04 | Dissolving or fading mesh without blended transparency | `all-in-one-3d-shader-cases-mobile-profiles.md` |
| MOB-05 | Additive glow mesh (aura, energy field) with bounded overdraw | `all-in-one-3d-shader-cases-mobile-profiles.md` |
| MOB-06 | Stylized environment surface (ground, walls) | `all-in-one-3d-shader-cases-mobile-profiles.md` |
| MOB-07 | Quality tiers: swapping prepared material sets instead of flipping keywords | `all-in-one-3d-shader-cases-mobile-profiles.md` |
| FX-01 | Hit flash driven by `_HitBlend` | `all-in-one-3d-shader-cases-gameplay-fx.md` |
| FX-02 | Death dissolve with burn edge | `all-in-one-3d-shader-cases-gameplay-fx.md` |
| FX-03 | Shield / force field from rim light (no depth texture) | `all-in-one-3d-shader-cases-gameplay-fx.md` |
| FX-04 | Ghost or cloak: dither and camera-distance fade | `all-in-one-3d-shader-cases-gameplay-fx.md` |
| FX-05 | Power-up pulse: vertex inflate plus emission | `all-in-one-3d-shader-cases-gameplay-fx.md` |
| FX-06 | Status looks: freeze, stone, poison via matcap, hue, greyscale | `all-in-one-3d-shader-cases-gameplay-fx.md` |
| FX-07 | Selection or boss outline toggled without keywords | `all-in-one-3d-shader-cases-gameplay-fx.md` |
| FX-08 | Teleport glitch and hologram flicker (short-lived) | `all-in-one-3d-shader-cases-gameplay-fx.md` |
| ENV-01 | Foliage wind with vertical mask | `all-in-one-3d-shader-cases-environment.md` |
| ENV-02 | Stylized toon world: toon light, stylized received shadows, colored shadows | `all-in-one-3d-shader-cases-environment.md` |
| ENV-03 | Height gradient and fog tint for terrain and buildings | `all-in-one-3d-shader-cases-environment.md` |
| ENV-04 | Fast Lighting scene setup | `all-in-one-3d-shader-cases-environment.md` |
| ENV-05 | Lightmapped static scenery | `all-in-one-3d-shader-cases-environment.md` |
| ENV-06 | Depth Coloring stylized fog (desktop-first; mobile conditions) | `all-in-one-3d-shader-cases-environment.md` |
| ENV-07 | Large tiling surfaces: triplanar and stochastic sampling (desktop) and the baked alternative | `all-in-one-3d-shader-cases-environment.md` |

## Anti-patterns

- **`EnableKeyword`/`DisableKeyword` to switch effects at runtime.** A keyword combination that no material in the build
  uses has no compiled variant; the material turns invisible or pink in a device build. The editor hides this.
- **Ticking effects "to try them" and leaving them on.** Every ticked effect is code in the shipping variant. Use
  `Deactivate All Effects` or untick before baking.
- **Assuming a material with `Cast Shadows` off is free in shadow maps.** In the generic shader the `ShadowCaster` pass
  still runs vertex effects and discards in the fragment stage; remove the pass (both shadow toggles off) or turn the
  renderer's shadow casting off.
- **`MaterialPropertyBlock` or `AllIn13DShaderRandomTimeSeed` on many batched renderers.** An MPB makes the renderer
  incompatible with the SRP Batcher; set per-object values on an owned material instance instead.
- **`Use Custom Time` without a `ShaderGlobalTimeController` in the scene.** The global time vector stays zero and
  every time-driven effect freezes.
- **Using `renderer.sharedMaterial` to flash one object.** It edits the shared asset and every user of it (and persists
  in the editor). Use an owned instance or drive a per-object value another way.
- **Prefab built before `Save Material to Folder`.** The prefab references a scene-bound material and renders wrong.
- **Relying on the demo or preset values.** Shipped presets enable Alpha Cutoff, Cast Shadows, Fog and classic specular
  (Basic, Toon, PBR presets); audit every preset-derived material.
- **Trusting `Depth Coloring`/`Dither`/`Screen Space UV` as depth-free.** They set the same scene-depth define as the
  intersection effects; verify the Depth Texture requirement on the target quality level.
- **Configuring URP once and assuming all renderers follow.** The auto-configure step edits only the first renderer of
  the active pipeline asset; every other quality level's renderer needs the same features added by hand.

## Source Map

| Source | Used for |
|---|---|
| `Assets/Third-Party Assets/VFX/AllIn13DShader/Shaders/Generic Shaders/*.shader` | properties, keywords, passes, render state, stencil, outline pass tags |
| `Assets/Third-Party Assets/VFX/AllIn13DShader/Shaders/ShaderLibrary/*.hlsl` | effect order and cost (samples, depth, loops), time handling, per-light work, shadow-caster behavior, URP feature pragmas |
| `Assets/Third-Party Assets/VFX/AllIn13DShader/Scripts/*.cs` | runtime components and the globals they set |
| `Assets/Third-Party Assets/VFX/AllIn13DShader/Editor/**` (URPConfigurator, MaterialUtils, ShaderVariantCreator, EffectsProfile, URP Settings, window, presets) | shader auto-swap, baking passes and paths, URP auto-configuration scope, menus, preset values |
| https://seasidestudios.gitbook.io/seaside-studios/3d-shader/ (effects-list, advanced-configuration-and-key-rendering-concepts, scripting, batch-override-materials, how-to-animate-effects, random-seed, scaled-time, outlines, wind-effect-and-wind-controller, performance-considerations, faq-frequently-asked-questions) | effect catalog, advanced configuration options, scripting basics, runtime time and seed behavior, outline modes, wind controller, performance claims, FAQ |
| https://seasidestudios.gitbook.io/seaside-studios/3d-shader/ (urp-and-post-processing-setup, urp-shader-feature-configuration, full-control-over-shader-keywords, how-to-enable-disable-effects-at-runtime, fast-lighting, receive-shadows-and-stylized-shadows, light-models, decals, shadow-color, depth-coloring-stylized-fog, saving-prefabs, convert-materials-to-3d-shader, asset-component-features, asset-window, extend-or-change-the-asset-shader) | URP setup, defines configuration, baking, runtime enabling policy, Fast Lighting, shadow limits, preset and prefab workflow |
| YouTube "How to Animate Effects" (aNastuqGBik) transcript supplied by the user | animation-clip workflow, shared-material limitation of UI images |
| Unity manual via Context7 `/websites/unity3d_manual` | SRP Batcher and MaterialPropertyBlock, `shader_feature` vs `multi_compile`, `SetShaderPassEnabled` by LightMode, URP performance guidance |
