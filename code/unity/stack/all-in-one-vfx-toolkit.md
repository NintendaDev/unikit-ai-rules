---
version: 1.0.0
---

# All In One VFX Toolkit (AllIn1VfxToolkit)

> **Scope**: Seaside Studios "All In One VFX Toolkit" (also written "All In 1 VFX Toolkit" or "AllIn1 VFX Toolkit"; v2.32, namespace `AllIn1VfxToolkit`) — a stackable-effects unlit uber-shader plus editor tooling for particles, trails, sprites, meshes and UI under Built-in, URP and HDRP: choosing the shader file per pipeline, picking and budgeting effects, what is safe and what is forbidden on mobile, render-state and blend setup, Particle System Custom Data, runtime property control and pooling, texture and import rules, variant and keyword limits, and a case library of combat and environment effects.
> **Load when**: authoring or reviewing VFX materials or particle effects that use the All In 1 VFX Toolkit (AllIn1Vfx, AllIn1VfxSRPBatch, AddAllIn1Vfx), deciding whether an effect or setting is affordable on a phone, optimizing overdraw, draw calls, shader variants or build size of these effects, setting up the URP asset for soft particles, glow or screen distortion, scripting dissolves, fades, pause-proof time or per-instance variation on these materials, pooling toolkit effects, building projectiles, impacts, explosions, slashes, shields, auras, trails or portals from the toolkit, debugging materials that are pink, frozen, invisible in a device build, not batching, or missing effects that worked in the editor.
> **References**: `.unikit/memory/code/stack/references/all-in-one-vfx-toolkit-mobile-optimization.md` (full mobile verdicts, budgets, replacements, tiers, verification), `.unikit/memory/code/stack/references/all-in-one-vfx-toolkit-effects-quickref.md` (one line per effect: what it is, what for, mobile verdict, requirements), `.unikit/memory/code/stack/references/all-in-one-vfx-toolkit-effects-full.md` (per-effect blocks: keyword, properties, cost, notes — grep by effect ID), `.unikit/memory/code/stack/references/all-in-one-vfx-toolkit-pipeline-setup.md` (install, asmdef, Built-in/URP/HDRP/ECS setup, upgrade checklist), `.unikit/memory/code/stack/references/all-in-one-vfx-toolkit-shaders-and-variants.md` (shader files, feature support per shader, keywords, variants, SRP Batcher, known defects), `.unikit/memory/code/stack/references/all-in-one-vfx-toolkit-material-configuration.md` (blend presets, advanced options, render state, sorting), `.unikit/memory/code/stack/references/all-in-one-vfx-toolkit-authoring-workflow.md` (component, window, saving materials and prefabs), `.unikit/memory/code/stack/references/all-in-one-vfx-toolkit-particles.md` (Particle System Helper, Custom Data, seed, presets, cleanup), `.unikit/memory/code/stack/references/all-in-one-vfx-toolkit-runtime-scripting.md` (properties, materials vs MPB, time, UI, shipped scripts, examples), `.unikit/memory/code/stack/references/all-in-one-vfx-toolkit-textures.md` (premade textures, import settings, distortion maps, baking), `.unikit/memory/code/stack/references/all-in-one-vfx-toolkit-troubleshooting.md` (symptom → cause → fix), `.unikit/memory/code/stack/references/all-in-one-vfx-toolkit-cases-combat.md` (projectile, muzzle, impact, explosion, slash, beam, lightning, spell, splash), `.unikit/memory/code/stack/references/all-in-one-vfx-toolkit-cases-environment.md` (telegraph, shield, aura, trail, fire, orb, electricity, portal, tornado, distortion, toon, dissolve)

---

## Core Concepts

- One uber-shader, ~67 combinable effects. The material inspector has three blocks — **Configuration** (blend preset +
  advanced options), **Shapes** (up to three textures combined first) and **Effects** (colour, alpha, UV/vertex effects applied
  to the combined result). Each effect is a shader keyword; code for disabled effects is not compiled, so a disabled effect
  costs nothing and an enabled one is code in the shipping variant.
- Default render state of every main shader: queue Transparent (3000), `SrcAlpha/OneMinusSrcAlpha`, ZWrite Off, **Cull Off**
  (back faces drawn). Everything is blended: effect cost is **pixels covered × layers × shader cost**.
- The shader files differ in what they implement: `AllIn1Vfx` (base, ignores fog / soft particles / depth glow / screen
  distortion / screen-UV), `AllIn1VfxBuiltIn`, `AllIn1VfxGrabPass` (Built-in only), `AllIn1VfxSRPBatch` (URP/HDRP, **the only
  SRP Batcher-compatible one**), `AllIn1VfxDOTS`, `AllIn1VfxLit` (generated, heavy). Toggling an effect the shader ignores does
  nothing, silently. Table: `all-in-one-vfx-toolkit-shaders-and-variants.md`.
- Everything the asset adds in the editor (`AddAllIn1Vfx`, the Particle System Helper, the toolkit window, texture creators) is
  **authoring tooling**; none of it belongs in gameplay code. Only a few small scripts are real runtime components
  (`SetAllIn1VfxCustomGlobalTime`, `AllIn1VfxFakeLightDirSetter`, the seed/scroll/auto-destroy helpers).
- Materials created by the component live in the scene until **Save Material to Folder**; a prefab made before that renders wrong.
- Animation of effects is shader-side (`_ShapeXSpeed`, `_Time`) and free; CPU-side animation means material writes.
- Unity 2019.4 and up including Unity 6; works in Built-in, URP (2D Renderer with limits) and HDRP; **not** usable in VFX Graph.
- When vendor docs and the installed version disagree, trust the installed shader code (examples: keywords are already local in
  v2.32; the URP shader lives in a `.unitypackage`; shaders are in `Shaders/`, not `Shaders/Resources/`).

## Locating the asset and referencing it

The asset folder (`<AllIn1Root>` in every reference) can sit anywhere in a project. **Never hard-code its path** in rules,
scripts or asmdefs: find it by globbing `**/AllIn1VfxAssemebly.asmdef` (the folder keeps the name `AllIn1VfxToolkit`; its editor
code looks it up by that name). Read property names from the `Properties` block of `<AllIn1Root>/Shaders/AllIn1Vfx.shader`.

The asmdef file is `AllIn1VfxAssemebly.asmdef` but its internal name is `AllIn1VfxAssmebly`; reference it by GUID (from its
`.meta`) and make sure the Input System package is installed (the asmdef references it):

```json
{
  "name": "Game.Vfx",
  "references": [ "GUID:<guid of AllIn1VfxAssemebly.asmdef>" ]
}
```

## Mobile Chapter — What Works on Phones and What Does Not

The vendor documents almost no costs ("made with efficiency in mind, even in low end devices"). The verdicts here come from
reading the v2.32 shader code, the demo data and Unity's own documentation — **not device measurements**. Treat them as
starting points; profile on the weakest target. Evidence labels and the full tables: `all-in-one-vfx-toolkit-mobile-optimization.md`.

**Pipeline gate — decide first.** URP *Depth Texture* and *Opaque Texture* are pipeline-wide full-screen copies that break
tile-based GPU efficiency. The toolkit never enables them. Soft particles (`SOFTPART`), intersection glow (`DEPTHGLOW`) and
screen distortion (`SCREENDISTORTION`) need them. On a mobile quality level keep both off and build effects **without** those
three effects.

**OK on mobile (default set).** Shape 1–2, `GLOW` (brightness; Bloom is optional polish), `COLORGRADING`, `HSV`, `POSTERIZE`,
`RIM`, `LIGHTANDSHADOW` (fake light), `ALPHAFADE`, `ALPHACUTOFF`, `ALPHASMOOTHSTEP`, `CAMDISTFADE`, `MASK`, `TEXTURESCROLL`,
`DOODLE`, `PIXELATE`, `SHAKEUV`, stream-driven fade/offset/weights, `FOG`; `AllIn1VfxSRPBatch` with the SRP Batcher; a cached owned
material instance; short non-looping bursts of tens of particles; ASTC-compressed small textures shared across materials.

**Use sparingly — count them per material.** Shape 3, `SHAPE_N_DISTORT`, `DISTORT`, `COLORRAMP`, `FADE` (noise fetch), `POLARUV`,
`TWISTUV`, `WAVEUV`, `ROUNDWAVEUV`, `TRAILWIDTH`, `VERTOFFSET` (vertex fetch), `BACKFACETINT`, `SHAPE1MASK`, `GLOWTEX`; additive
layer stacks; large camera-facing quads; `Cull Off` on closed meshes; looping systems; persistent realtime lights on effects.
Budget: ≤ 3–5 enabled effects per material, one heavy distortion-type effect, 2–4 materials per effect, tens of particles.

**Do not do on mobile.**
- `SCREENDISTORTION`, `SOFTPART`, `DEPTHGLOW` (pipeline copies), the Lit shader `AllIn1VfxLit`, `AllIn1VfxGrabPass` (Built-in only,
  a grab per object), `FADEBURN` on many objects.
- `Material.EnableKeyword/DisableKeyword` to switch effects (variants are stripped → pink/invisible in a device build).
- A `MaterialPropertyBlock` or `All1VfxRandomTimeSeed` on many toolkit renderers (leaves the SRP Batcher), `AllIn1VfxScrollShader*`
  scripts (clone a material, write every frame), a new material per UI element without cleanup.
- Shipping the Demo folder, leaving `AddAllIn1Vfx` / particle-helper components on prefabs, `SHAPEDEBUG` on, a `Normal` vertex
  stream nobody reads, `maxNumParticles` 1000, textures at 2048 without platform compression.
- Turning on Bloom, HDR, or the two copy textures just to make one glow or one distortion look right.

**Mobile gate for every new effect (5 steps).** (1) Look up each wanted effect's verdict in the quick reference. (2) Check the
pipeline asset of the *mobile* quality level for the toggles the effect needs. (3) Put the material on `AllIn1VfxSRPBatch`, one
material asset per look. (4) Check the budget table (materials, shapes, distortion count, particles, screen coverage). (5) Verify
on the weakest device: Frame Debugger ("SRP Batch", no copy passes), GPU profiler, Memory Profiler. When something expensive is
wanted, use a replacement from the mobile reference (for example bake a static look with *Render Material To Image*, `RIM` instead
of `DEPTHGLOW`, a ring mesh instead of screen distortion) or give the effect a quality tier.

## Task Router

Open only the row's file. For any effect-authoring task read the **Mobile Chapter** above first.

| Task | Open first | Then, only if needed |
|---|---|---|
| Is effect X OK on mobile? What do I use instead? Audit or speed up effects, overdraw, draw calls, memory | `all-in-one-vfx-toolkit-mobile-optimization.md` | `all-in-one-vfx-toolkit-effects-quickref.md` |
| Which effect gives me look X? What does effect X need? | `all-in-one-vfx-toolkit-effects-quickref.md` | `all-in-one-vfx-toolkit-effects-full.md` for chosen IDs only |
| Build a typical effect (projectile, muzzle flash, impact, explosion, slash, beam, lightning, spell, splash) | `all-in-one-vfx-toolkit-cases-combat.md` (CMB-xx) | `all-in-one-vfx-toolkit-particles.md`, `…-runtime-scripting.md` |
| Build a persistent or status effect (telegraph, shield, aura, trail, fire, orb, electricity, portal, tornado, toon look, dissolve) | `all-in-one-vfx-toolkit-cases-environment.md` (ENV-xx) | `all-in-one-vfx-toolkit-material-configuration.md` |
| New project install, pipeline switch, Unity upgrade, URP asset toggles, asmdef reference, trimming the Demo | `all-in-one-vfx-toolkit-pipeline-setup.md` | `all-in-one-vfx-toolkit-shaders-and-variants.md` |
| Which shader file, what a keyword does in which shader, variants, build size, pink in a build, SRP Batcher | `all-in-one-vfx-toolkit-shaders-and-variants.md` | `all-in-one-vfx-toolkit-troubleshooting.md` |
| Blend preset, ZWrite, cull, queue, sorting, GPU instancing, shapes workflow | `all-in-one-vfx-toolkit-material-configuration.md` | — |
| Create a material, save it, make a prefab, use the toolkit window, remove authoring components | `all-in-one-vfx-toolkit-authoring-workflow.md` | `all-in-one-vfx-toolkit-textures.md` |
| Particle systems: helper, Custom Data rows, vertex streams, random seed, atlases, presets, stop action, pooling | `all-in-one-vfx-toolkit-particles.md` | `all-in-one-vfx-toolkit-effects-full.md` (`## Vertex-stream rows`) |
| Change a property from C#, fade/dissolve over time, pause-proof time, UI materials, per-instance values, pooled reset | `all-in-one-vfx-toolkit-runtime-scripting.md` | `all-in-one-vfx-toolkit-effects-full.md` (off values) |
| Texture import, premade textures, distortion/normal maps, gradients, atlases, baking | `all-in-one-vfx-toolkit-textures.md` | `all-in-one-vfx-toolkit-mobile-optimization.md` |
| Looks wrong, frozen, pink, invisible in a build, editor oddities | `all-in-one-vfx-toolkit-troubleshooting.md` | `all-in-one-vfx-toolkit-shaders-and-variants.md` |

## Case Lookup Workflow

1. Find the task in the **Task Router**, then the closest case in the **Case Index**. Open that one file and read only the case
   block — each states goal, anatomy, settings, mobile profile (cheap variant) and pitfalls.
2. No case matches → pick the nearest by technique (for example "boss attack telegraph" → ENV-01) and adapt it; do not open the
   other case file "just in case".
3. Choosing effects → scan `all-in-one-vfx-toolkit-effects-quickref.md`. Need a keyword, property name, cost or requirement of the
   ones you picked → `Grep "^### <ID> " -A 10` in `all-in-one-vfx-toolkit-effects-full.md`; do not read it whole. **Never guess a
   property name** — a misspelled `SetFloat` fails silently; the full block (or the `Properties` block of `AllIn1Vfx.shader`) is
   the source.
4. Any change to the URP asset, quality levels, shader variants or the toolkit folder is project-wide: read
   `all-in-one-vfx-toolkit-pipeline-setup.md` or `…-shaders-and-variants.md` first.
5. Demo-derived values are starting points. Strip the demo's dead items (stale keywords, `SHAPEDEBUG`, prewarm, lights, demo
   spinners) and read costs at your gameplay scale.

## Case Index

| ID | Case | File |
|---|---|---|
| CMB-01 | Projectile with trail (core, halo, trails, sparks) | `all-in-one-vfx-toolkit-cases-combat.md` |
| CMB-02 | Muzzle flash from a cone/wave mesh particle | `all-in-one-vfx-toolkit-cases-combat.md` |
| CMB-03 | Impact / hit burst anatomy and its cheap version | `all-in-one-vfx-toolkit-cases-combat.md` |
| CMB-04 | Colour-coded area impacts built from shared materials | `all-in-one-vfx-toolkit-cases-combat.md` |
| CMB-05 | Explosion: layers, stagger, trimmed to five draws | `all-in-one-vfx-toolkit-cases-combat.md` |
| CMB-06 | Slash arc with stream-driven wipe | `all-in-one-vfx-toolkit-cases-combat.md` |
| CMB-07 | Charged beam (heaviest; trimmed version) | `all-in-one-vfx-toolkit-cases-combat.md` |
| CMB-08 | Lightning strike with sub-emitters and ground cracks | `all-in-one-vfx-toolkit-cases-combat.md` |
| CMB-09 | Spell cast and release choreographed by delays | `all-in-one-vfx-toolkit-cases-combat.md` |
| CMB-10 | Water splash (lightest ground effect) | `all-in-one-vfx-toolkit-cases-combat.md` |
| CMB-11 | Effect lifecycle: container particle system, cleanup, fade light, shake, spawn scaling | `all-in-one-vfx-toolkit-cases-combat.md` |
| CMB-12 | Sparks and embers recipe with numbers | `all-in-one-vfx-toolkit-cases-combat.md` |
| ENV-01 | Ground telegraph / area marker (two-disc minimum) | `all-in-one-vfx-toolkit-cases-environment.md` |
| ENV-02 | Shield / bubble dome with dissolve cycle | `all-in-one-vfx-toolkit-cases-environment.md` |
| ENV-03 | Aura: rim prop, ground base, light pillars | `all-in-one-vfx-toolkit-cases-environment.md` |
| ENV-04 | Trail with `TRAILWIDTH` | `all-in-one-vfx-toolkit-cases-environment.md` |
| ENV-05 | Fire and smoke billboard stack, recolour by tint | `all-in-one-vfx-toolkit-cases-environment.md` |
| ENV-06 | Persistent glow orb from single-instance billboards | `all-in-one-vfx-toolkit-cases-environment.md` |
| ENV-07 | Electricity arcs and plasma | `all-in-one-vfx-toolkit-cases-environment.md` |
| ENV-08 | Portal quad (twist, wave, polar, ramp) | `all-in-one-vfx-toolkit-cases-environment.md` |
| ENV-09 | Tornado / column mesh shells | `all-in-one-vfx-toolkit-cases-environment.md` |
| ENV-10 | Screen-distortion orb or heat haze (AVOID; substitutes) | `all-in-one-vfx-toolkit-cases-environment.md` |
| ENV-11 | Toon character with fake light | `all-in-one-vfx-toolkit-cases-environment.md` |
| ENV-12 | Dissolve in/out by Animator or code | `all-in-one-vfx-toolkit-cases-environment.md` |
| ENV-13 | Pixel / toon look from smooth textures | `all-in-one-vfx-toolkit-cases-environment.md` |

## Drive Effects by Amount (the one code habit that matters)

Enable the effect once in the material asset, then change its **amount** at runtime with a cached id; keep the material owned
and destroy it with its owner. Longer examples (dissolve, pooled reset, UI material, custom time): `all-in-one-vfx-toolkit-runtime-scripting.md`.

```csharp
using UnityEngine;

public sealed class EffectAmount : MonoBehaviour
{
    private static readonly int GlowId = Shader.PropertyToID("_GlowGlobal"); // GLOW_ON enabled in the material asset
    [SerializeField] private Renderer _renderer;
    private Material _material;                                            // owned instance, created once

    private void Awake() => _material = _renderer.material;
    public void SetGlow(float amount) => _material.SetFloat(GlowId, amount); // amount, not EnableKeyword
    private void OnDestroy() => Destroy(_material);
}
```

## Anti-patterns

- **Turning on URP Depth Texture / Opaque Texture to make one effect work.** It charges every frame of every camera; on a mobile
  level build the effect without `SOFTPART`/`DEPTHGLOW`/`SCREENDISTORTION`.
- **Trusting a keyword toggle.** The base `AllIn1Vfx` shader ignores fog, soft particles, depth glow, screen distortion and
  screen-UV keywords; verify the shader implements what you enabled.
- **`EnableKeyword`/`DisableKeyword` at runtime.** A keyword set no built material uses has no compiled variant: pink or missing in
  a device build, fine in the editor. Drive amounts; keep a built material for any combination you must switch to.
- **Prefab before *Save Material to Folder*.** The prefab references a scene-bound material and renders wrong.
- **Writing to `sharedMaterial` or animating a shared UI material.** It edits the asset and every user; give each animated Graphic
  or renderer an owned instance and destroy it.
- **`MaterialPropertyBlock` / `All1VfxRandomTimeSeed` / `AllIn1VfxScrollShader*` on many renderers.** Leaves the SRP Batcher or
  clones and rewrites materials every frame. Use shader scroll, Custom Data seed on particles, or one owned value.
- **Assuming `AllIn1VfxURP` exists.** It ships inside the `.unitypackage`; without it the inspector's auto-swap reports a missing
  shader. Put effect materials on `AllIn1VfxSRPBatch`.
- **Using the Lit shader or the GrabPass shader for effects.** Lit re-runs the whole surface function in 4–7 passes; GrabPass is
  Built-in only and grabs per object.
- **Calling authoring components at runtime** (`AllIn1VfxComponent` API, helper, noise creator), or leaving them on shipping prefabs.
- **`Use Custom Time` without an active `SetAllIn1VfxCustomGlobalTime`** (global stays 0, effects freeze) — and not testing it on
  `AllIn1VfxSRPBatch`, where the global may be shadowed by a per-material property.
- **Scrolling or distorted textures with Wrap Mode Clamp.** Use Repeat.
- **Starting a dissolving particle below alpha 1 without the vertex stream.** Vertex alpha drives the dissolve amount.
- **Shipping the Demo folder, 2048 textures without ASTC, `maxNumParticles` 1000 and looping bursts.**
- **Hard-coding the asset path or referencing the asmdef by file name.** Find it by globbing; reference by GUID.
- **Applying "half → float" or other shader edits once and forgetting them.** Package updates overwrite shipped shaders.
- **Treating demo prefabs as budgets.** The demo spawns at ×0.6–×5 scale with realtime lights, shadows on meshes and no pooling.

## Source Map

| Source | Used for |
|---|---|
| Installed asset package — `Shaders/**` (main shaders, `ShaderLibrary` includes, `LitShaders`, `Extras`, `EditorShaders`) | shader inventory, passes, keyword lists and counts, per-shader feature support, render-state defaults, precision, SRP Batcher compatibility, cost estimates, known defects |
| Installed asset package — `Scripts/*.cs`, `AllIn1VfxAssemebly.asmdef` | runtime components and their per-frame and allocation behaviour, assembly name and references, editor-only code boundaries |
| Installed asset package — `Editor/**`, `ParticlePresets/`, `MaterialSaves/` | menus, shader auto-swap logic, Lit regeneration, keyword reset behaviour, gradient drawer, helper presets and their values |
| Installed asset package — `Demo & Assets/Demo/{Prefabs,Materials,EffectsScriptableObjects,Animation,Scripts}` (57 effect prefabs parsed) | the CMB and ENV case library, keyword and feature frequency, particle and texture numbers, demo overheads |
| Installed asset package — `Demo & Assets/Textures Demo/VfxTexturesDocumentation.pdf`, `Documentation.pdf`, `README.txt` | texture categories and sizes, black-background rule; the manual PDF is only a link to the online docs |
| https://seasidestudios.gitbook.io/seaside-studios/vfx-toolkit/ (overview, first-steps-must-read, asset-component-features, shader-structure-and-usage, advanced-configuration-and-key-rendering-concepts, particle-system-helper-component, asset-window, textures-setup, screen-distortion-and-creating-distortion-maps, how-to-animate-materials, custom-scaled-time, scripting, visual-effect-graph-vfx-graph, how-to-enable-disable-effects-at-runtime, render-material-to-image, premade-textures-meshes-and-materials, lit-shader, faq-frequently-asked-questions) | the 18 pages supplied by the user: workflow, structure, options, particle helper, window, textures, distortion, animation, scaled time, scripting, VFX Graph limit, runtime enabling policy, baking, premade assets, Lit shader, FAQ |
| https://seasidestudios.gitbook.io/seaside-studios/vfx-toolkit/ (setup-and-render-pipelines, considerations, running-out-of-shader-keywords, ecs-and-srp-batcher, effects-and-properties-breakdown, custom-vertex-streams-and-custom-data-auto-setup, random-seed, saving-prefabs, helper-scripts-and-other-utilities, custom-gradient-property-drawer) | ten further pages of the same manual found through its index and added because they carry pipeline setup, the performance design notes, keyword and SRP Batcher facts, the effect catalog, Custom Data rows and prefab saving |
| https://seasidestudios.gitbook.io/seaside-studios/llms.txt | the page index of the manual |
| Context7 `/websites/seasidestudios_gitbook_io_seaside-studios_vfx-toolkit` | cross-check of the FAQ `half`→`float` fix, GPU instancing note, scripting and keyword snippets |
| Context7 `/websites/unity3d_manual` | URP Opaque/Depth Texture cost on mobile, `shader_feature` vs `multi_compile` and variant stripping, MaterialPropertyBlock vs SRP Batcher |
