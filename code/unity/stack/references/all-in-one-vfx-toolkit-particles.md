# All In One VFX Toolkit — Particle Systems, Custom Data and presets

> **Base path:** `<AllIn1Root>` is the asset folder — the one that contains `AllIn1VfxAssemebly.asmdef` (find it with `Glob **/AllIn1VfxAssemebly.asmdef`; never hard-code its location). Presets live in `<AllIn1Root>/ParticlePresets/`.
> See also: [all-in-one-vfx-toolkit-effects-full.md](all-in-one-vfx-toolkit-effects-full.md) (`## Vertex-stream rows`), [all-in-one-vfx-toolkit-mobile-optimization.md](all-in-one-vfx-toolkit-mobile-optimization.md) (particle budgets)

The toolkit targets Unity's Particle System (Shuriken) renderers. Unity's VFX Graph cannot use the toolkit shaders.

---

## Particle System Helper (`AllIn1ParticleHelperComponent`)

Editor-time component: *Add Component → AllIn1VfxToolkit → AddAllIn1VfxParticleHelper*, or the *Add Particle System Helper*
button on the main component. Requires a Particle System on the object. All logic is `#if UNITY_EDITOR`; only its serialized
fields ship, as dead data on the prefab — remove the component when the effect is finished.

| Section | Use |
|---|---|
| Hierarchy Helpers | Copy the Particle System as a child or sibling object (numbered), to build multi-layer effects fast. |
| Palette Color Change | Recolour **all** colours and gradients of the system from one `New Color` (hue + saturation shift). |
| Custom Data Auto Setup | Enable the Custom Data module and the vertex streams the material needs (details below). |
| General / Emission / Shape Options | Lifetime, speed, size, start colour; one burst or a constant rate; Cone / Sphere / Circle / None. Values are fetched when the component is added — press *Fetch* to re-read. |
| Over Lifetime Options | Quick ascendant/descendant colour-alpha or size curves; prototype, then refine the curve by hand. |
| Particle Helper Presets | Save/load the helper's own data (`AllIn1ParticleHelperSO`, *Assets → Create → AllIn1Vfx → ParticleHelperTemplate*). |
| Particle System Presets | Save/load a full copy of the Particle System component (Unity `Preset`), including options the helper does not expose. |
| Auto Apply On Change | On by default: every inspector change calls `ApplyCurrentSettings()` (stop, clear, rewrite modules, play). Switch it off and press *Apply* to batch edits. |

Pitfalls:
- The preset sections scan the **whole project** for presets (`t:Preset` filtered to ParticleSystem presets) and re-scan every
  few seconds while the list is empty — in a large project the editor can freeze for seconds. Leave the preset foldouts closed.
- Helper presets store `startColor` as a single colour with `{0,0,0,0}` (the field was never set), so applying one probably
  sets Start Color to transparent black [inf — verify]. Set the colour afterwards; the full-system `.preset` files carry white.
- Palette recolouring touches start colour, colour over lifetime and colour by speed only.

## Custom Data and vertex streams

Three effects read per-particle data: **fade amount** (`FADE`/`ALPHAFADE`), **texture offset** (`OFFSETSTREAM`) and **shape
weights** (`SHAPEWEIGHTS`), plus the **random timing seed**. Procedure:

1. Put the material on the Particle System renderer and enable the effects that use the streams (the toggles
   *Fade Amount Driven By Vertex Stream*, *Texture Offset (Custom Stream)*, *Shape Weights (Custom Stream)* appear only on
   materials used by a Particle System).
2. Select the system with the helper and press **Custom Data Auto Setup**. It reads the **shared material's** keywords, enables
   the Custom Data module and sets the renderer's active vertex streams to
   `Position, Normal, Color, UV, Custom1X|Custom1XY[, Custom2XY|Custom2XYZ]`.
3. Shape the generated Custom Data curves. A missing row means the effect that uses it is off on the material.

| Row | Meaning |
|---|---|
| Custom1 X | Random timing seed (`_TimingSeed`, range 0–100) |
| Custom1 Y | Fade amount, shared by both fade effects (use one) |
| Custom2 X / Y | Texture offset X / Y (one pair for all shapes; per-shape strength via `_OffsetSh1…3`) |
| Custom2 Z | Shape weight offset (only with 2+ shapes; strength via `_Sh1BlendOffset…`) |

Rules:
- With `Fade Amount Driven By Vertex Stream` **off**, the particle's alpha drives the fade; with it **on**, the Custom Data curve does.
- `Texture Offset Custom Stream` is the way to scroll a texture along a particle's life in a controlled way (sword slashes, beams).
- The `Normal` stream is always added, even for unlit use: extra vertex bytes per particle vertex. Remove it by hand when no
  effect needs normals (`RIM`, `BACKFACETINT`, `LIGHTANDSHADOW`, `VERTOFFSET`), and keep the streams you do not use off.
- Re-run the auto setup after changing which stream effects are enabled; stale streams still cost vertex data.
- For `FADE`/`ALPHAFADE` without the stream, do not start particles below alpha 1: vertex alpha drives the dissolve amount.

## Random seed

`_TimingSeed` offsets every scroll, rotation and distortion so copies of one material do not move in sync.
- Particles: Custom Data row Custom1 X (auto setup sets it).
- Meshes: the `All1VfxRandomTimeSeed` script (note the spelling `All1Vfx…`) sets `_TimingSeed` once in `Start` through a
  `MaterialPropertyBlock` — which takes that renderer out of the SRP Batcher. See the scripting reference for alternatives.

## Texture atlases and sprite sheets

Pack variants of one shape into an atlas with the toolkit window's *Texture Atlas / Spritesheet Packer* (capacity = columns ×
rows; extras beyond capacity are dropped), then use the Particle System's *Texture Sheet Animation* module with random cell
selection so each burst looks different — one material, one texture, many looks. Disable the module's animation when the atlas
is only a variant pool.

## Presets shipped in `ParticlePresets/`

| Preset | What it configures | Mobile notes |
|---|---|---|
| `ConeBurstHelperPreset` / `ConeBurstPsPreset` | Burst of 15–20 particles, lifetime 0.4–1, speed 3–8, size 0.4, Cone (angle 25, radius 0.3), alpha and size shrinking over life; the full preset also enables Noise | Noise is per-particle CPU work for a handful of short particles; looping is on (a 1 s loop re-fires the burst) |
| `ExplosionBurstHelperPreset` / `ExplosionPsPreset` | Sphere burst, speed 6–12 (full preset), size 0.2–0.4, Noise and Limit Velocity enabled | Same; set `Stop Action`, looping and `maxNumParticles` yourself |
| `SingleCenterHelperPreset` / `SingleCenterPsPreset` | One particle at the origin, lifetime 1, size 1, no shape/size module | The right base for a single decal/flash quad |
All full-system presets share: `maxNumParticles` 1000 (Unity's default — lower it for mobile), duration 1 s, looping on, play on
awake, gravity 0, culling Automatic, stop action None, random start rotation, white start colour, one burst and colour over
lifetime. They touch only the `ParticleSystem` component, never the renderer or material.

## Lifetime and cleanup

- Prefer `Stop Action = Destroy` on the Particle System over `AllIn1VfxAutoDestroy` — the vendor calls it cleaner and more
  performant. With pooling use `Disable` (or no auto-destroy) and re-play the pooled instance instead of instantiating.
- `AllIn1VfxAutoDestroy` (a timer) fits meshes; it destroys the GameObject N seconds after creation.
- Looping effects that are off screen: culling `Automatic` pauses looping systems; non-looping systems keep simulating, so
  keep bursts short.
- A system's renderer sorting: the particle renderer's *Sorting Fudge*/*Render Queue* of the material decide overdraw order;
  keep layered effects (core, glow, sparks) on separate materials with deliberate queues.

## Trails and meshes

- `Trail Renderer`/`Line Renderer` use the same material; for `TRAILWIDTH` keep the renderer's width curve constant and let the
  gradient shape thickness. Scroll the trail texture with `TEXTURESCROLL` or `_ShapeXSpeed`.
- Mesh particles and meshes get `RIM`, `BACKFACETINT`, `LIGHTANDSHADOW`, `VERTOFFSET` (normals required). Quads do not.
- Distortion, twist and polar effects on a large screen-facing quad are the usual way a simple particle becomes expensive —
  keep the quad small or use fewer, smaller particles.
