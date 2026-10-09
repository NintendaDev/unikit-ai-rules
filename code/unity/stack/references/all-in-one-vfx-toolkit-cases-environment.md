# All In One VFX Toolkit — Cases: environment, persistent and status effects

> **Base path:** `<AllIn1Root>` is the asset folder — the one that contains `AllIn1VfxAssemebly.asmdef` (find it with `Glob **/AllIn1VfxAssemebly.asmdef`; never hard-code its location). Every case below is distilled from a premade prefab in `<AllIn1Root>/Demo & Assets/Demo/Prefabs/` (named in "Based on"); copy its materials out before reusing.
> See also: [all-in-one-vfx-toolkit-effects-quickref.md](all-in-one-vfx-toolkit-effects-quickref.md) (effects), [all-in-one-vfx-toolkit-mobile-optimization.md](all-in-one-vfx-toolkit-mobile-optimization.md) (budgets), [all-in-one-vfx-toolkit-cases-combat.md](all-in-one-vfx-toolkit-cases-combat.md) (projectiles, impacts, slashes)

Each block states the goal, the structure, the settings that define the look, the mobile profile and the pitfalls. Values are
the demo's starting points, **not** rules: retune for your art. "fetch" = fragment texture samples per pixel of that
material (upper bound). Cost words are readings of authored data (v2.32 demo), **not profiles**.

**Read first (applies to every case).** The demo materials use the Built-in shader family (`AllIn1Vfx`, `AllIn1VfxBuiltIn`,
`AllIn1VfxGrabPass`). In a URP project assign `AllIn1VfxSRPBatch` (see the shaders reference) — otherwise `SOFTPART`,
`DEPTHGLOW` and `SCREENDISTORTION` that the demo enables are no-ops or unavailable. Strip the demo's dead items before
reuse: `CAMDISTFADE_ON` left at far/near values 1900/2000 (never fades), `DEPTHGLOW_ON` with `_DepthGlow = 0`, stale
keywords (`BLUR_ON`, `BLURISHD_ON`, `ALPHACONTRAST_ON`, `BILBOARDY_ON`, `CUSTOMBLENDING_ON`, `ETC1_EXTERNAL_ALPHA`),
`prewarm` on one-shot effects, demo-only spinners (`AllIn1AutoRotate`, `AllIn1VfxBounceAnimation`, `AllIn1LookAt`).

**Case → mobile summary**

| ID | Case | Mobile |
|---|---|---|
| ENV-01 | Ground telegraph / area marker | OK (two-disc version) |
| ENV-02 | Shield / bubble dome with dissolve cycle | OK (rim version), LIMIT (distorted) |
| ENV-03 | Aura (rim prop, ground base, light pillars) | LIMIT |
| ENV-04 | Trail (Trail Renderer + `TRAILWIDTH`) | LIMIT |
| ENV-05 | Fire and smoke billboard stack | LIMIT |
| ENV-06 | Persistent glow orb from single-instance billboards | OK |
| ENV-07 | Electricity arcs with stream-driven offset | OK |
| ENV-08 | Portal quad (twist, wave, polar, ramp) | LIMIT |
| ENV-09 | Tornado / column mesh shells | LIMIT |
| ENV-10 | Screen-distortion orb or heat haze | AVOID |
| ENV-11 | Toon character with fake light | OK |
| ENV-12 | Dissolve in/out by Animator or code | OK |
| ENV-13 | Pixel / toon look from smooth textures | OK |

---

### ENV-01 — Ground telegraph / area marker
- **Goal:** a ground circle or ring marking an area (enemy attack zone, buff area, spawn point), optionally with a fence.
- **Structure:** two flat mesh discs/rings at nearly the same position (second +0.126 Y), optionally a vertical "fence" mesh.
  The Red/Green/Blue/Purple variants are the same rig recoloured.
- **Settings:** blend `Blend Add / Premultiply` (`ADDITIVECONFIG_ON PREMULTIPLYCOLOR_ON`), `Cull Off`, `ZWrite Off`.
  Disc A: `COLORRAMP_ON COLORRAMPGRAD_ON HSV_ON SHAPE2_ON SHAPE2CONTRAST_ON` (+ `SHAPE1DISTORT_ON SHAPE1CONTRAST_ON`);
  `_MainTex` a 256–512 tileable noise (tile ~2×1), `_Shape2Tex` a vertical gradient, `_ShapeYSpeed` -0.8 so the noise flows,
  `_ShapeContrast` 0.24, `_HsvBright` 1.5–2, `_ColorRampLuminosity` -0.28; ramp dark red → red → light (swap the ramp and
  `_HsvShift` to recolour the whole rig). Disc B: other noise, `_ShapeXSpeed` 0.5, `_Alpha` ~0.76.
- **Fence (optional):** `DISTORT_ON SHAPE3_ON SHAPE3DISTORT_ON`, 6 fetches — the costly layer.
- **Mobile:** Red/Green Area are the cheapest ground effects in the demo (3 draws, 200–320 tris, 3–6 fetches, no particles,
  no depth/grab, no scripts). Minimal marker: **only the two discs** merged into one `BA` material (shape 1 noise + shape 2
  gradient + ramp = ~3 fetches). Drop the fence, replace any 2048 distortion texture with ≤ 512 (Red Area's 2048 noise alone
  makes it 23 MB uncompressed), merge coincident discs.
- **Pitfalls:** two coincident additive discs double the fill for little gain; a missing `_DistortTex` reference (two demo
  materials) samples nothing; fence is a camera-independent mesh so check it from the gameplay angle.
- **Based on:** Red Area, Green Area, Purple Area, Blue Area.

### ENV-02 — Shield / bubble dome with dissolve cycle
- **Goal:** a shell around a unit that fades in/out and shimmers.
- **Structure (cheapest, Fire Shield):** a ring/base mesh + a semisphere shell; one Animator (4 s loop) animating
  `material._AlphaFadeAmount` (0 → 1 → 0) on both renderers; shell rotated slowly.
- **Settings:** shell `RIM_ON SHAPE1DISTORT_ON SHAPE2DISTORT_ON SHAPE1CONTRAST_ON COLORRAMPGRAD_ON HSV_ON ALPHACUTOFF_ON
  ALPHAFADE_ON ALPHASMOOTHSTEP_ON GLOW_ON`, blend Blend Add/Premultiply, `Cull Off`; `_AlphaCutoffValue` ~0.43–0.58,
  `_AlphaStepMin/Max` 0.14/0.31, `_RimColor` red, `_RimPower` 2.5, `_RimIntensity` 1.5; fetch 3–4.
- **Variants:** Sand Shield — built-in sphere, `Cull Back`, ZWrite 1, `RIM_ON SOFTPART_ON`, plus a `SandWaves` particle layer
  with `POLARUV_ON DISTORT_ON MASK_ON FADE_ON`. SciFi Shield — honeycomb dome with `DEPTHGLOW_ON` and a script hue-spin.
  Water Shield — a 11-unit warped quad (4 stacked UV warps) + a 7-fetch sphere with `SOFTPART`, `VERTOFFSET`, 3 shapes: the
  heaviest.
- **Mobile:** use the Fire-Shield rig: `RIM` + dissolve through `ALPHAFADE` + cutoff, 2 draws, ≤ 4 fetches, no depth. Set
  `Cull Back` on domes (halves the fill; Sand Shield already does), drop `SHAPE_N_DISTORT` on the dome (−2 fetches each),
  replace `SOFTPART`/`DEPTHGLOW` with plain `RIM_ON`, remove `VERTOFFSET`, burst 1 instead of 3 stacked 100-second particles,
  and replace the script hue-spin (`AllIn1VfxScrollShaderProperty` on `_HsvShift`) with a baked ramp or a one-shot clip.
- **Pitfalls:** Animator curves on `material._Prop` work for Renderer-based materials (not for UI Images — see the scripting
  reference); how Unity applies them (property block or material write) was not verified, so profile before relying on SRP
  batching with many animated copies. The root-and-child double Animator on Fire Shield is redundant; domes with `Cull Off`
  and large scale are the usual overdraw spike.
- **Based on:** Fire Shield (cheapest), Sand Shield, SciFi Shield, SciFi Shield 2, Water Shield (heaviest).

### ENV-03 — Aura: rim prop, ground base, light pillars
- **Goal:** a hovering prop with a coloured aura on the ground and rising light.
- **Structure:** a rim-lit built-in capsule/sphere (queue 2999, `Cull Back`, `ZWrite On`, only `RIM_ON`, no textures — 1 fetch);
  a ground base quad (`POLARUV_ON MASK_ON POSTERIZE_ON HSV_ON SHAPE2_ON COLORRAMPGRAD_ON`, 4 fetches); 2–3 vertical shell
  meshes sharing one material; a tall `VBillboard` pillar system (rate 7, lifetime 2–3, size 3.3×10, alpha ~0.41, ~21 alive);
  stretched-billboard sparks (shared `OrbSparkGlow`, rate 50).
- **Settings:** blend Blend Add/Premultiply for base/shells; pillars `ALPHAFADE_ON ALPHAFADETRANSPARENCYTOO_ON GLOW_ON SHAPE2_ON
  SHAPE3_ON`, `_Alpha` 0.41, `_AlphaFadePow` 2, `_GlowGlobal` 2.1.
- **Mobile:** fill-limited by the big camera-facing pillars and the 8.7-unit base. Halve pillar rate (7 → 3) and lifetime,
  cut size Y 10 → ~6, drop `SHAPE3` on the pillar material (−1 fetch), drop `POSTERIZE`, remove the sparks layer on the low
  tier; a baked disc (one fetch) replaces `MASK + POLARUV` on the base.
- **Based on:** Evil Aura, Holy Aura.

### ENV-04 — Trail (Trail Renderer + TRAILWIDTH)
- **Goal:** a glowing ribbon behind a moving object (fire, ghost, magic).
- **Structure:** a `TrailRenderer` (time 0.65–1.25 s, width multiplier 3.5–11, texture mode Stretch, alignment TransformZ),
  optionally a smoke trail on a second renderer, plus a sparks/leaf particle system.
- **Settings:** `TRAILWIDTH_ON` with the `_TrailWidthGradient` (material saved as an asset) and `_TrailWidthPower` ~0.8;
  main strip texture 1024 scrolled along U (`_ShapeXSpeed` -3.5); `SHAPE1MASK_ON` keeps the strip intact; extra shapes for
  flicker; blend Additive or Blend Add; `GLOW_ON`, `_GlowGlobal` ~1.2 (Pink Trail uses 30 — a hot spot, avoid).
- **Mobile:** cost = trail vertex density × width × fetches; Fire/Ghost trail materials have 6–7 fetches and the demo sets
  `minVertexDistance` 0.001. Use `minVertexDistance` ≥ 0.05–0.1, `m_Time` ≤ 0.4, one trail renderer instead of two,
  drop `SHAPE3`/`SHAPE1MASK` (−2 fetches), use 128×512 / 256×1024 strips instead of 1024.
- **Pitfalls:** the Trail Renderer width curve must be constant when `TRAILWIDTH` shapes thickness; gradient requires the
  material to be an asset; a trail-only particle system (renderer mode `None` + Trails module) is an alternative.
- **Based on:** Fire Trail, Ghost Trail, Pink Trail.

### ENV-05 — Fire and smoke billboard stack
- **Goal:** campfire, torch, burning object, smoke column.
- **Structure:** 5–7 small particle systems ordered by `Sorting Fudge` (not sorting layers): `Fire` flipbook, `StylizedSparks`,
  `Smoke`, one persistent `BackgroundFire` billboard, `Glow`, `FireSparks`; an optional `DistortionSmoke` layer.
- **Settings:** `Fire`: 2×2 flipbook ember texture (256), `FADE_ON COLORGRADING_ON ALPHAFADETRANSPARENCYTOO_ON
  ADDITIVECONFIG_ON`, blend `One/OneMinusSrcAlpha`, fetch 2. **Recolouring is a tint change only:** red fire becomes blue by
  setting `_ColorGradingDark/_Middle/_Light` on the same texture. Pixel Fire adds `PIXELATE_ON` (size 10–40) and `POSTERIZE_ON`.
- **Mobile:** layers are cheap (≤ 4 fetches, ≤ 256 textures, 47–75 particles alive) **except** `DistortionSmoke` (a GrabPass
  layer, ~30 alive quads — remove it), `GlowFire*` materials with `DEPTHGLOW`/`SOFTPART` at zero intensity (switch off), and
  `Thick Smoke` (125 alive × 7 fetches, soft particles, `OldestInFront` CPU sort — the worst single material in the demo).
  Cheaper: keep `Fire`, `Glow`, `Sparks`; drop `BackgroundFire`, `StylizedSparks`, `Smoke`; for smoke cut `SHAPE2/3` and their
  distortions (7 → 2–3 fetches), `SOFTPART` off, rate 25 → 10, sort mode None, lifetime 5 → 3; `prewarm` off for on-demand spawns.
- **Based on:** Blue Fire, Pixel Fire, Real Fire, Thick Smoke.

### ENV-06 — Persistent glow orb from single-instance billboards
- **Goal:** a magic orb, power source or marker with layered glow, small waves and lightning.
- **Structure (Dark Magic Orb):** a control particle system (renderer disabled) + core glow, background glow, dark backdrop
  disc (so additive glow reads on bright ground), two cutout wave meshes, light rays, lightning.
- **Settings:** single-instance billboards: `Burst t0 n1`, duration = lifetime = 1, looping, `maxNumParticles = 2`, mild
  size/colour wobble, large `m_MaxParticleSize` (5–15; the default 0.5 clamps big sprites) = a persistent glow with a particle
  system's sorting and no script. Wave shells: opaque cutout (`ALPHACUTOFF_ON BACKFACETINT_ON RIM_ON`, no blending).
  Core: `ALPHACUTOFF_ON COLORRAMP SHAKEUV_ON`, `_ShakeUvSpeed` 8.1.
- **Mobile:** the cheapest "rich" effect in the demo: ~10 alive particles, textures ≤ 256, no depth/grab. Merge background glow
  + dark backdrop, drop `LightRays`, lightning rate 10 → 5.
- **Based on:** Dark Magic Orb.

### ENV-07 — Electricity arcs with stream-driven offset
- **Goal:** crackling arcs, plasma, energy ball.
- **Structure:** mesh-particle arcs (`Arc1`, 34 vertices) + glow billboards + stretched sparks + a `Lightning` layer; Plasma
  Ball adds an opaque near-black rim sphere and `Ray` curve meshes with `DOODLE_ON`.
- **Settings:** arcs: `OFFSETSTREAM_ON DOODLE_ON WAVEUV_ON MASK_ON SHAPE2_ON COLORGRADING_ON GLOW_ON`, `_HandDrawnAmount` 13,
  `_HandDrawnSpeed` 15 (stepped jitter), `_WaveStrength` 6; Custom2 stream drives texture offset per particle, colour over
  life flickers with hard alpha steps. Lightning: `FADE_ON ALPHAFADEINPUTSTREAM_ON ALPHAFADEUSESHAPE1_ON` with Custom1.y as the
  fade curve.
- **Mobile:** ~30 alive, textures ≤ 256, no depth/grab. Drop the glow billboard and centre glow, keep arcs + sparks; disable
  `OFFSETSTREAM`/Custom2 if you do not animate the offset. For Plasma Ball remove the redundant second depth-only material
  slot and lower the `Ray` rate 60 → 20.
- **Based on:** Electricity, Plasma Ball.

### ENV-08 — Portal quad
- **Goal:** a vertical portal or swirling vortex.
- **Structure:** one vertical quad (~3.7 × 5.1 units) + a small spark system emitted from a disc.
- **Settings:** `TWISTUV_ON WAVEUV_ON ROUNDWAVEUV_ON MASK_ON GLOW_ON COLORRAMPGRAD_ON SHAPE2_ON SHAPE2DISTORT_ON`, blend
  `SrcAlpha/OneMinusSrcAlpha`; `_TwistUvAmount` 0.73, `_WaveAmount/_WaveSpeed/_WaveStrength` 18/5.8/19.9, `_RoundWaveStrength`
  0.33; the same 1024 glow texture serves as main and mask. Pixel version: `PIXELATE_ON` size 40, `SHAPEADD_ON`, ramp.
- **Mobile:** 4–5 fetches, but the two 1024 textures dominate memory. Use 256-pixel soft radial masks, drop the second shape
  and its distortion, keep `TWISTUV` (ALU only), spark rate 50 → 20, spark texture 1024 → 128.
- **Based on:** Blue Pixel Portal, Green Portal.

### ENV-09 — Tornado / column mesh shells
- **Goal:** a vortex, pillar of air or fire.
- **Structure:** a ground base quad (10–17 units, polar-UV ramp) + two nested shells of one mesh at different scales (core with
  `ZWrite On`, `Cull Back`; exterior with alpha cutoff) rotating on Z, vertical-gradient mask (`Gradient12 64×512`), a few
  leaf/spark particles (Magic Spiral: ~150 alive leaves).
- **Settings:** `VERTOFFSET_ON` (amount 0.25–0.5) on the shells, `POSTERIZE_ON`, `MASK_ON`, `COLORRAMPGRAD_ON`/`COLORGRADING_ON`,
  `_ShapeYSpeed` -1.
- **Mobile:** mesh-heavy but cheap per pixel (8–10 fetches over 3 draws, 1.9–3.8k tris). Blue Tornado is the cheapest (all
  textures ≤ 512). Shrink the base quad to the real footprint, drop `VERTOFFSET` on the exterior (vertex texture fetch), use
  one shell on the low tier, leaf rate 30 → 10 and drop the Noise module.
- **Based on:** Blue Tornado, Fire Tornado, Air Column, Magic Spiral.

### ENV-10 — Screen-distortion orb or heat haze
- **Goal:** refraction/heat haze around a sphere or behind smoke.
- **Structure:** a sphere with `SCREENDISTORTION_ON DISTORTUSECOL_ON RIM_ON VERTOFFSET_ON` and a normal map ring
  (`_DistortionPower` 0.5, `_DistortionBlend` 0.65), queue 3001 (grabs everything drawn before it); or camera-facing smoke
  quads with a smoke normal map (`_DistortionPower` 3), queue 2999 (grabs only the opaque background so fire sprites are not warped).
- **Mobile:** **AVOID.** The demo implementation is the Built-in `GrabPass` shader (a screen copy per object); in URP it needs
  the Opaque Texture on the pipeline asset. Replace with a rim + vertex-wobble sphere (`RIM_ON`, `VERTOFFSET_ON`, no grab), a
  short expanding ring mesh, or camera shake. If kept: one instance on screen, small, behind a quality-tier switch, only on a
  quality level whose pipeline asset has Opaque Texture on.
- **Based on:** Blue Area + Distort Sphere (DistortionSphere), Blue Fire / Real Fire (DistortionSmoke).

### ENV-11 — Toon character with fake light
- **Goal:** a stylised character or mesh with a cartoon light/shadow band, no real light.
- **Settings:** `LIGHTANDSHADOW_ON` alone: `_LightAmount`, `_ShadowAmount` 0.42, `_ShadowStepMin/Max` 0.2/0.6, no textures; needs
  one `AllIn1VfxFakeLightDirSetter` in the scene (otherwise the light direction is zero). 1 fetch. Screen-space variant:
  `SHAPE_N_SCREENUV_ON` on all three shapes sampling one 256 galaxy texture at different tilings so the body acts as a window
  onto a fixed screen pattern (6 fetches, opaque).
- **Mobile:** the fake light is OK (one of the cheapest materials in the demo). The screen-space variant: keep 1–2 layers.
  Smoke puffs with `SOFTPART` should lose the keyword.
- **Pitfalls:** on `AllIn1VfxSRPBatch` the global light direction may not reach the material (see shaders reference).
- **Based on:** Toon Character, Screenspace Galaxy Character.

### ENV-12 — Dissolve in/out by Animator or code
- **Goal:** fade an effect or shell in and out cleanly without blended soup.
- **Settings:** enable `ALPHAFADE_ON` (or `FADE_ON`) and animate `_AlphaFadeAmount` (-0.1 hidden … 1 fully faded), `_Alpha` or
  `_FadeAmount`. Demo: Animator clips with one looping state and no parameters, keyed on `material._Prop` of Renderer
  components (class MeshRenderer and ParticleSystemRenderer). In code: see the dissolve example in the scripting reference.
- **Mobile:** animate **amounts**, never keywords; add `ALPHACUTOFF_ON` so the invisible part stops being shaded; stop writing
  when finished.

### ENV-13 — Pixel / toon look from smooth textures
- **Settings:** `PIXELATE_ON` (`_PixelateSize` 4–40) and/or `POSTERIZE_ON` (`_PosterizeNumColors` 2–16) on smooth textures
  instead of authoring low-res art (Pixel Fire, Blue Pixel Portal, tornado shells).
- **Mobile:** ALU only. Do not combine with distortion effects (vendor warning).
- **Based on:** Pixel Fire, Blue Pixel Portal, Blue Tornado.

---

## Reusable patterns across cases

- **Shell + core + wave layering** (areas, auras, tornadoes): 2–3 meshes at slightly different scale/offset, each its own
  material with the **same ramp** but a different noise texture and scroll direction; overlap produces depth without particles.
- **Shared base materials:** one material per distinct look (the demo shares `OrbSparkGlow` across four prefabs); same material
  = same batch key and one asset to tune.
- **Per-particle desync:** Custom Vertex Streams `Position, Normal, Color, UV, Custom1X` with Custom1.x = random 0–100 (the
  layout the particle helper generates; only 17 of 59 demo systems use any custom stream — add them only where needed; two
  demo systems drop `Normal`).
- **Layer order:** use the particle `Sorting Fudge` and the material render queue (2999 for props that must precede 3000
  particles, 3001 for a grab sphere) to order layers inside one prefab.
- **Single-instance glows:** burst of 1, `maxNumParticles = 2`, large max particle size.
- **Cheap prop body:** `RIM_ON` alone on a built-in sphere/capsule, `Cull Back`, ZWrite On, queue 2999.
- **Recolour a whole rig:** swap the ramp and `_HsvShift`/`_HsvBright`, or the three `COLORGRADING` tints; keep the textures.
- **Demo spawn scale:** the demo spawns effects with `scaleMultiplier` 0.6–4; the draw cost of a prefab scales with that, so
  read costs at your gameplay scale.
