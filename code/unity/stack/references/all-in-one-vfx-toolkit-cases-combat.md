# All In One VFX Toolkit — Cases: combat effects

> **Base path:** `<AllIn1Root>` is the asset folder — the one that contains `AllIn1VfxAssemebly.asmdef` (find it with `Glob **/AllIn1VfxAssemebly.asmdef`; never hard-code its location). Every case below is distilled from a premade prefab in `<AllIn1Root>/Demo & Assets/Demo/Prefabs/` (named in "Based on"); copy its materials out before reusing.
> See also: [all-in-one-vfx-toolkit-effects-quickref.md](all-in-one-vfx-toolkit-effects-quickref.md) (effects), [all-in-one-vfx-toolkit-mobile-optimization.md](all-in-one-vfx-toolkit-mobile-optimization.md) (budgets), [all-in-one-vfx-toolkit-cases-environment.md](all-in-one-vfx-toolkit-cases-environment.md) (shields, auras, trails, fire)

Each block states the goal, the anatomy, the settings that define the look, the mobile profile and the pitfalls. Values are the
demo's starting points, **not** rules. "fetch" = fragment texture samples per pixel of the material (upper bound). Particle
counts are upper-bound arithmetic from authored bursts and rates. Everything is a reading of authored data (v2.32 demo),
**not a profile**.

**Read first (applies to every case).**
- The demo materials use the Built-in shader family. `SOFTPART` is implemented only in `AllIn1VfxBuiltIn`/`GrabPass`
  (and `AllIn1VfxSRPBatch` in URP); the base `AllIn1Vfx` shader ignores it. In a URP project assign `AllIn1VfxSRPBatch`, and
  expect `SOFTPART` / `SCREENDISTORTION` to need the pipeline's Depth / Opaque Texture, which a mobile level should not enable —
  so the **cheap variant of every case below removes both**.
- Demo overheads to strip before reuse: a persistent realtime point light in 3 of 4 projectiles and every muzzle/impact
  (range 5–15, intensity 1–5), `SHAPEDEBUG` left on, `ETC1_EXTERNAL_ALPHA` (not a declared keyword), `AllIn1VfxComponent` left
  on prefabs, cast/receive shadows on Mesh/Trail renderers (20 of 21 meshes, 4 of 8 trails), `maxNumParticles` = 1000 on almost
  every system, uncompressed 256² noise textures (35 of 131), duplicated Animator/`DoShake`/`AutoDestroy` on root and child.
- The demo never pools: it uses `Instantiate` + `stopAction = Destroy` / `AllIn1VfxAutoDestroy`. Mobile pooling needs
  `stopAction = Disable`/`Callback` and a reset (see the scripting reference).

**Case → mobile summary**

| ID | Case | Mobile |
|---|---|---|
| CMB-01 | Projectile with trail | OK (single-trail head), LIMIT (multi-trail) |
| CMB-02 | Muzzle flash | OK |
| CMB-03 | Impact / hit burst | OK (flare + sparks + ring) |
| CMB-04 | Colour-coded area impacts | LIMIT |
| CMB-05 | Explosion | LIMIT (cut to ~5 draws) |
| CMB-06 | Slash arc | LIMIT |
| CMB-07 | Charged beam | AVOID (heaviest per pixel) |
| CMB-08 | Lightning strike | OK (trimmed) |
| CMB-09 | Spell cast and release | LIMIT |
| CMB-10 | Water splash | OK (lightest ground effect) |
| CMB-11 | Effect lifecycle: containers, cleanup, light, shake, timing | OK |
| CMB-12 | Sparks and embers recipe | OK |

---

### CMB-01 — Projectile with trail
- **Goal:** a bullet, bolt or magic shot that flies and leaves a trail.
- **Anatomy:** a carrier (trigger collider + Rigidbody + movement script) with the visual parented below, so the effect prefab
  holds no physics; visual = hot core (small mesh with an HDR `_ShapeColor` and `GLOW_ON`) + halo (additive quad/sphere) + 1–4
  `TrailRenderer`s with a scrolling noise strip + `TRAILWIDTH` taper + a spark/ember particle system in **World** space + an
  optional persistent light + a spawn fade-in by Animator or an alpha ramp.
- **Settings (Digital):** core `ADDITIVECONFIG GLOW PREMULTIPLYCOLOR`, `_Glow` 0.17, a 220×128 head texture, spun by
  `AllIn1AutoRotate` 450°/s; halo = Soft Add quad, `Glow7`; four trails (`minVertexDistance` 0.1, times 0.2–0.45 s, all 1 fetch,
  scroll `_ShapeXSpeed` -2…-7). **Fire:** body mesh with `COLORGRADING GLOW MASK RIM SHAPE1DISTORT SHAPE1MASK SHAPE2 SHAPE2DISTORT`
  (6 fetches), two soft glow spheres, a 4-fetch trail (`TRAILWIDTH`, `minVertexDistance` 0.001), 45 sparks/s with a Noise module.
  **Gun:** one mesh + one trail (`TRAILWIDTH`, `SmokeTrail10` 1024) — 2 materials, no particles, no light, 2 fetches.
- **Mobile:** cheapest = **Gun Bullet**. Heaviest = Fire Bullet (6-fetch body, three glow spheres, trail, noisy sparks, Animator,
  a `Renderer.material` instance from `AllIn1VfxScrollShaderProperty`) and Digital (4 overlapping additive trails, an `Update`
  spin; but every material is 1 fetch). Cheap variant: head = one 1–2 fetch additive material (keep `ADDITIVECONFIG GLOW
  PREMULTIPLYCOLOR`, drop `SHAPE2`/`SHAPE1DISTORT`/`MASK`/`RIM`), **one** `TrailRenderer` with `minVertexDistance` ≥ 0.05 and
  `TRAILWIDTH` off, replace the halo with one flat glow quad, no Noise module, shader-side `SHAPE1ROTATE`/scroll instead of
  rotation scripts, shadows off on Mesh/Trail renderers, no light or one shared light.
- **Pitfalls:** `minVertexDistance` 0.001 on a fast projectile adds a vertex almost every frame (4 of the demo's 8 trails);
  `All1VfxRandomTimeSeed` on trails writes through a `MaterialPropertyBlock` (leaves the SRP Batcher).
- **Based on:** Digital Projectile, Fire Bullet, Gun Bullet, Ice Projectile, zProjectileBase (carrier).

### CMB-02 — Muzzle flash
- **Goal:** a 0.15–0.5 s flash at the barrel.
- **Anatomy:** a cone/wave **mesh particle** whose dissolve is driven by Custom1.y + stretched sparks (burst 3–10) + an optional
  soft sphere glow + a fade light. 3–5 draws, 5–19 particles, 48–609 KB of textures. Spawned with `forward = muzzle.forward`.
- **Settings:** Digital: `Wave` mesh (78 vertices) with `ADDITIVECONFIG BACKFACETINT` (1 fetch), `VelocityOverLifetime` z -4, size
  curve 0.28 → 1. Fire/Ice cone: `ADDITIVECONFIG ALPHAFADEINPUTSTREAM ALPHAFADETRANSPARENCYTOO ALPHAFADE COLORGRADING GLOW
  PREMULTIPLYCOLOR SHAPE1DISTORT SHAPE1MASK SHAPE2` (4 fetches), `_AlphaFadeSmooth` ~0.98, red→orange→yellow grading. Sparks:
  Stretched, lengthScale 5, Limit Velocity dampen 1 so they burst then stop.
- **Mobile:** cost = the 4-fetch cone + `SphereVfx` glow (559 vertices) ×3 with `RIM`+`SOFTPART` + a light each. Cheap variant: the
  **Digital** pattern (1-fetch Premult cone, no distortion/mask), a flat `ImpactCenterGlow`-style quad instead of soft spheres,
  drop `SHAPEDEBUG`, no light on low tiers.
- **Based on:** Digital / Fire / Gun / Ice Muzzle Flash.

### CMB-03 — Impact / hit burst
- **Goal:** a hit effect on projectile or melee contact (0.1–0.4 s, 15–26 particles, 5–8 draws).
- **Anatomy (reused by four prefabs):** centre flash (0.05 s, size ~0.5, `GLOW` 5) + soft disc (0.3–0.4 s, size 3–8, warm colour
  over life) + a rotating flare sprite (0.12 s, random rotation, ramp + HSV) + stretched sparks burst (7–15, Limit Velocity curve
  ×15 to freeze at the end) + big sparks (3–6) + a ring/shockwave (size over life 0 → 1, 0.25 s) + an optional distortion ring +
  a fade light (0.2 s) + camera shake 0.15. Order glow under flare with a negative `Sorting Fudge`.
- **Settings:** flare: `ADDITIVECONFIG COLORRAMPGRAD COLORRAMP GLOW HSV` or `ALPHAFADEINPUTSTREAM ALPHAFADE` (ALU only), custom
  stream `Position, Normal, Color, UV, Custom1XY`. Sparks: `ALPHAFADE COLORGRADING GLOW`, `_GlowGlobal` 1.5, 256² embers.
- **Mobile:** the overdraw is concentrated in 1–3 additive discs (`ImpactGlow` is 6.3 world units at container scale 3; 9 for the Ice
  flare). Risks: `SOFTPART` on 2–4 materials per prefab (depth texture), Gun Impact's `Grab` distortion on every spawn, a realtime
  light range 10–15 intensity 5. Cheap variant = the **Digital Proj Impact** pattern: flare + sparks + ring, max 2 fetches, 1 soft
  material, 240 KB — delete the `ImpactGlow`/`ImpactGlowSphere` `SOFTPART` layers (keep the flat `ImpactCenterGlow`, the most
  shared material), no distortion, light reduced or off.
- **Based on:** Digital Proj Impact, Fire Impact, Gun Impact, Ice Impact.

### CMB-04 — Colour-coded area impacts
- **Goal:** one impact set in several colours (Blue/Red/Purple), larger and longer than CMB-03.
- **Anatomy:** a root particle that is itself the centre flash (colour `#8ef6ff` / `#ff8080` / `#9b54ff`, same `ImpactCenterGlow`
  material), a counter-rotating shape quad (`SHAPE1ROTATE SHAPE2ROTATE`), a delayed long flare, a ring, debris sprites (flipbook
  4×4 or 8×1), and a big slow smoke (delays 0.2–0.3 s). 24–30 particles, 5–6 draws, 1.5 MB (Blue).
- **Recolour rule:** same structure and often the same materials; change `startColor`, colour over lifetime,
  `_ColorGrading*` or the ramp — only the shape textures differ.
- **Mobile:** these have the largest quads of the combat set (smoke 3–10, flare 8–10 world units before the ×2 demo multiplier),
  3 soft materials, a 1024² `Noise100` dissolve texture and a 4-fetch smoke material. Drop `ImpactSmoke` (biggest, longest,
  4 fetches + soft + 1024 noise) or use the **Purple** pattern (Soft Add, `ALPHAFADE` instead of `FADE`, no depth).
- **Based on:** Blue Impact, Red Impact, Purple Impact.

### CMB-05 — Explosion
- **Goal:** a bomb/blast with smoke, shockwave and tail.
- **Anatomy:** glow disc + flare + stretched sparks + horizontal shockwave ring + a distortion ring (`Grab`) + three smoke layers
  (burst 12 / 3×2 cycles / 5, dissolved by noise + soft) + a ground burn mark at render queue 2999 (sorts under everything) +
  late embers/smoke/stones. 11–14 draws, 70–100 particles, 1.7–2.6 MB. Staggering is done with `startDelay` 0.05–0.3 s, not an Animator.
  Variants: Galaxy adds `SHAPE2SCREENUV` smoke sampling a fixed screen-space galaxy texture; Toon uses 25 mesh smoke puffs with
  `LIGHTANDSHADOW` and `ZWrite On`.
- **Mobile:** each prefab has one `Grab` distortion, 2–5 soft materials, `LateSmoke` at 5 fetches + depth, a Collision module on
  stones. Cheap variant (~5 draws, ~35 particles, only 1-fetch materials): keep **Glow + Sparks + Shockwave + Burnmark**; remove
  `ShockwaveDistortion`/`Distort`, `LateSmoke`, `Stones`, `LightRays`, `GlowSphere`; make the smoke `Vfx` with `ALPHAFADE`
  (no `FADE` noise fetch, no `SOFTPART`) on a 128² smoke texture.
- **Based on:** Explosion Bomb, Explosion Galaxy, Toon Explosion.

### CMB-06 — Slash arc
- **Goal:** a sword or claw swing (0.2–0.4 s swing, up to 1 s tail).
- **Anatomy:** 1–2 mesh quads for the swing (the UV-offset wipe comes from **Custom2.x 0.416 → -0.68** via `OFFSETSTREAM`, or an
  Animator keying `_Shape2Tex_ST`) + dissolve + a smoke/ash sprite trail (0.7–1.4 s) + a spray in **World** space during the swing
  window. Emission window shorter than particle life keeps the live count bounded (rate 300–400 × 0.13 s = 39–52 particles).
  Core: `SoftAdd`, `COLORRAMPGRAD COLORRAMP GLOW MASK OFFSETSTREAM SHAPE2` with 128² clamp masks. Venom/Magic add Collision +
  a Birth sub-emitter puddle (dead weight when left inactive).
- **Mobile:** 3–6 draws, 33–91 particles, no soft/grab; cost is the 4–6-fetch slash materials (`SlashDark` 6, `18_Slash_Mesh` 5,
  `VenomSwordSlash` 4), 30–40 large dark smoke sprites and the 300–400/s spray with Collision. Cheap variant: a `Slash Blue`-style
  single mesh with ≤ 3 fetches (drop `SHAPE3`/`SHAPE1DISTORT`), smoke burst 30 → 8, **no Collision or sub-emitter**, the offset-stream
  wipe instead of an Animator.
- **Based on:** Slash Orange, Slash Blue, Slash Venom, Slash Magic.

### CMB-07 — Charged beam
- **Goal:** a charge-up and a sustained beam (5.7 s).
- **Anatomy:** one tessellated beam mesh (2278 vertices) with a scrolling noise + gradient mask (no particles for the body); charge =
  sphere + inward spiral particles with trails + a distortion hemisphere; the **whole timeline lives in one Animator clip**
  (scales, emission rate, `m_IsActive`/`m_Enabled`, `material._Alpha/_FadeAmount/_AlphaFadeAmount`) with a `DoShake` animation event.
- **Mobile:** **AVOID** except in a trimmed form — 6–7 materials with 5–7 fetches, `DistortionField` = `Grab` + `SOFTPART` + 5
  samples on a 2.4-unit hemisphere with ZTest off, `ZWrite On` bodies, a ZTest-Always overlay, trail particles, duplicated
  components on root and child. Keep `8_Beam1` (2 fetches) with a decimated beam mesh, replace the 5-fetch `ShootAura` with a
  2-fetch glow, drop `Charging Distortion` and `OverlayBlackLines`, disable the trail module on the charging particles.
- **Based on:** Beam Blue, Toon Beam Orange.

### CMB-08 — Lightning strike
- **Goal:** a bolt from the sky with a ground flash.
- **Anatomy:** a tall camera-facing bolt quad (2 particles per burst, size up to 15 units tall) whose jagged shape comes from the
  shader (`DOODLE_ON WAVEUV_ON SHAPE1DISTORT_ON`, `_HandDrawnAmount` 8.7, `_WaveSpeed` 15.7), **Birth sub-emitters** for flash
  orbs and sparks, and ground-crack decals that dissolve by `ALPHAFADE` (ALU only) over 2 s. 9 draws, 33 particles, no depth,
  grab or lights.
- **Mobile:** only the bolt (4 fetches) and two `Orb` glow quads up to 12–17 world units are heavy. Keep `Strike` (2 quads), one
  `Orb`, one `CrackLighting`; drop `Sparks2/3`, `Orb 2`, `CrackLighting2/3`; shrink the orbs.
- **Based on:** Lightning Strike.

### CMB-09 — Spell cast and release
- **Goal:** a staged cast: absorb → charge → release flare → burst.
- **Anatomy:** choreograph with `startDelay` and one-shot **mesh particles** whose texture offset / dissolve is driven by Custom Data
  (no Animator); a late release flare synced with `AllIn1DoShake` delay (1.7 s). Absorb pieces: stretched billboards, speed -1
  (inward), 8×1 flipbook. Incinerate adds heat-haze debris (mesh particles with a `Grab` material), a shockwave distortion and a
  pentagram (`FADE ALPHAFADEUSESHAPE1 SHAPE2`).
- **Mobile:** `Magic Explosive Spell`: 7 draws, 66 particles, 2 soft materials, a 5-fetch swirl; `Incinerate`: two `Grab` materials
  (up to 30 mesh particles each sampling the grab), 10 draws, 93 particles. Remove `DistortionDebris` and `DistortionShockwave` (use
  the keyword-free `Debris` material), replace `SOFTPART` flares with flat `GLOW` quads.
- **Based on:** Magic Explosive Spell, Incinerate Spell.

### CMB-10 — Water splash
- **Goal:** a ground splash with rings, drops and a little smoke.
- **Anatomy:** horizontal-billboard glow/rings/shockwave, fade-sprite splash with erode textures (all 32–256 px), gravity drops
  (burst 15), one soft smoke layer. 9 draws, ~56 particles; the only rate-driven systems (`Rings` 35/s, `Shockwave` 10/s) run for
  0.4 s (~14 + 4 particles).
- **Mobile:** the lightest ground effect (1–3 fetches, textures ≤ 256). Remove `SmokeWater` (the only `SOFTPART`) and `DarkBackWater`.
- **Based on:** Water Splash.

### CMB-11 — Effect lifecycle: containers, cleanup, light, shake, timing
- **Container particle system:** 13 prefabs have a particle system with emission off and the renderer disabled, duration ≈ the
  longest child and `stopAction = Destroy`; Unity runs the stop action when the whole hierarchy finished, and its `localScale`
  sizes the effect (×3/×4 on muzzle/impact). `AllIn1VfxAutoDestroy` (1–6 s) is the safety net in 14 prefabs. For pooling use
  `Disable`/`Callback`.
- **Light:** `AllIn1VfxFadeLight` lerps a point light's intensity to 0 over `fadeDuration` then destroys it. Each spawn creates a
  realtime light — omit or share lights on mobile.
- **Camera shake:** `AllIn1Shaker.DoCameraShake(amount)` **sets** the trauma (not additive); the prefab side is `AllIn1DoShake` with
  `doShakeOnStart` + `shakeOnStartDelay` aligned to the hit frame, or an animation event. Demo amounts: muzzle 0.1, impacts 0.15,
  explosion 0.15, lightning 0.17, water 0.05, beam 1.
- **Spawn scaling:** the demo multiplies authored size by `scaleMultiplier` (0.6–5) via `localScale`; particles follow it only with
  `scalingMode = Hierarchy`, light range does not scale. Read costs at your gameplay scale.
- **Timeline:** beams/slashes use one Animator clip (scale, `m_IsActive`, emission rate scalar, material floats); everything else
  uses `startDelay` only.

### CMB-12 — Sparks and embers recipe
- Life 0.15–0.45 s, speed 2–25, size 0.05–0.35, Stretched billboard (length scale 2–5, pivot y 0.5–1.8), Limit Velocity curve ×15…×30
  with dampen 1 (fast start, near stop), colour over life alpha 0 → 1 (0.1–0.25) → 1 (0.6) → 0, 3–15 per burst. Material =
  a 64–512 px glow shape + `GLOW` `_GlowGlobal` 1.2–4.5 (`ADDITIVECONFIG PREMULTIPLYCOLOR`). Use `ALPHAFADE` (ALU only) rather than
  `FADE` (a noise fetch) on sparks. A random-variation atlas (Texture Sheet `frameOverTime = 0`, random `startFrame`) gives several
  looks from one material; true flipbooks only for debris/smoke.

---

## Reusable patterns across cases

- **Dissolve-first design:** 41 of 136 demo materials use a stream-driven dissolve; ALU-only `ALPHAFADE` (22) vs noise-sampled `FADE`
  (26). `ALPHAFADE` is the cheap option for sparks, embers and crack decals. With `ALPHAFADEINPUTSTREAM`, vertex alpha stays pure opacity.
- **Gradient over lifetime:** the colour-over-lifetime gradient multiplies `_ShapeColor` (HDR 1.5–2.6 on additive materials); its alpha
  fades the particle and, in `FADE`/`ALPHAFADE`, drives dissolve (`_FadeAmount + (1 − vertex alpha)`).
- **Per-particle seed:** Custom1.x random 0–100 decorrelates scroll/distort speeds between simultaneous particles; meshes/trails need
  `All1VfxRandomTimeSeed` (an MPB) or an owned material value.
- **Shared base materials:** `ImpactCenterGlow` is the centre flash of six prefabs (Blue/Red/Purple only change `startColor`); 22
  materials are reused across prefabs; `COLORGRADING` Dark/Middle/Light triples (or a 64×1 ramp) recolour one grey texture.
- **Ordering:** `Sorting Fudge` (−100…+11) and queue 2999 vs 3000 (burn marks under everything); horizontal-billboard render mode for
  ground rings/shockwaves/burn marks; Stretched + Limit Velocity for sparks.
- **Mesh as the effect body:** a beam/slash/cone mesh + scrolling noise + gradient mask (+ `RIM`/`COLORRAMP`) replaces many sprites;
  mesh particles emit 1–5 particles with 3D size/rotation.
- **Overdraw reading of the set:** all 136 materials are alpha-blended (none opaque), so the set is fill-bound, not vertex-bound;
  64% use ≤ 2 fetches, 9 materials use ≥ 5. Only 5 use `ZWrite On`, 3 disable ZTest.
- **Variants:** 99 distinct keyword sets in 136 materials — a mobile build either strips to a curated subset or must warm variants up;
  keep the number of distinct keyword sets low by reusing materials.
