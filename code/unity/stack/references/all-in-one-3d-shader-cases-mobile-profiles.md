# All In One 3D Shader — Cases: mobile material profiles

> **Base path:** `Assets/Third-Party Assets/VFX/AllIn13DShader/`
> See also: [all-in-one-3d-shader-effects-quickref.md](all-in-one-3d-shader-effects-quickref.md) (effect lines), [all-in-one-3d-shader-mobile-optimization.md](all-in-one-3d-shader-mobile-optimization.md) (budgets MO-15), [all-in-one-3d-shader-variants-and-baking.md](all-in-one-3d-shader-variants-and-baking.md) (baking)

Read only the block you need. Each profile is a **starting setting**, derived from the shader code and vendor docs, not a
measured preset; tune on the weakest target device. Settings are written as "Effect: value" in inspector terms; property
names are in the effects full reference.

**Applies to every profile:**
- Start from `Assets/Create/AllIn13DShader/Materials/…`, then **remove what the preset enables**: the Basic, Toon and PBR
  presets ship with Cast Shadows, Alpha Cutoff and Fog on and Specular `Classic` (Basic).
- Both `Cast Shadows` and `Receive Shadows` off unless the profile says otherwise → the inspector selects the
  `…_NoShadowCaster` shader.
- Finish with **Bake Shader Keywords** on one representative material and assign that baked shader to every material of
  the same profile (VAR-04, VAR-05).
- Never flip effect keywords at runtime; drive amount properties or swap prepared materials.

---

## MOB-01 — Cheapest lit opaque mesh (enemy, prop) with a flash slot

**Goal.** Many small lit objects, one flash color, minimal cost; works for untextured vertex-colored models too.

| Setting | Value |
|---|---|
| Render Preset | Opaque |
| Alpha Cutoff | **Off** (solid mesh) |
| Light Model | `FastLighting` (+ `FastLightConfigurator`, remove scene lights) or `Classic` with the main light only |
| Specular / Reflections / Normal Map | `None` / `None` / Off |
| Cast + Receive Shadows | Off + Off |
| Albedo From Vertex Color | On, mode `Replace`, `_VertexColorBlending` 1 — only for vertex-colored meshes without a texture |
| Hit | On, `_HitColor` white, `_HitGlow` 1–3, `_HitBlend` 0 |
| Fog | On only if the scene uses fog |

**Budget.** 1 texture sample (the base map is sampled even for vertex-colored meshes — keep it a 4×4 white texture),
one light.

**Flash.** Either `MaterialFlash` (runtime-scripting RS-03, an owned instance per object) or the zero-allocation swap of
FX-01 (two prepared materials sharing one baked shader).

**Pitfalls.**
- Leaving the preset's Specular `Classic` on adds a specular-map sample and a `pow` per light.
- `Fast Lighting` only saves the light loop; also remove scene lights as the vendor says, or URP still prepares them.
- A material count explosion (one per enemy type) is fine as long as all share the baked shader.

---

## MO-02 — Unlit flat or emissive mesh (pickup, marker)

**Goal.** A bright, flat-colored object with no lighting cost.

| Setting | Value |
|---|---|
| Render Preset | Opaque (Additive for glow-only meshes) |
| Light Model | `None` |
| Custom Ambient Light | On, `_CustomAmbientColor` (1,1,1) — renders the albedo unlit |
| Cast + Receive Shadows | Off + Off |
| Optional | `Rim` (HDR color, after lighting) for a rim glow; `Scroll Texture` for flowing energy; `Hit` for a pulse |

**Budget.** ≤ 2 samples. No shadow pass, no light loop.

**Pitfalls.**
- Without the white custom ambient the mesh shows scene ambient color, not albedo.
- `Emission` only glows with Bloom; for a pickup the rim or `Hit` is cheaper and always visible.

---

## MO-03 — Toon-styled character

**Goal.** Cel-shaded main character or boss with rim light and an optional outline.

| Setting | Value |
|---|---|
| Render Preset | Opaque, Alpha Cutoff off |
| Light Model | `Toon` (`_ToonCutoff` ~0.5, `_ToonSmoothness` small for a hard band) or `ToonRamp` if the ramp is worth one sample per light |
| Rim | On, stage `AfterLighting`, HDR color, `_MinRim` 0.3–0.6, `_MaxRim` 1 |
| Specular | `Toon` only if the highlight is a style feature (`_SpecularToonCutoff` ~0.35) |
| Outline Type | `Simple` or `Constant`, `_OutlineMode` `Clean`, thickness starting at 1, black `_OutlineColor` — **hero/boss/selection only** |
| Flat Normals | On when the mesh is hard-edged and the outline shows gaps |
| Shadows | Receive `Stylized` if the character sits on a shadowed floor; Cast off |

**Budget.** ≤ 4 samples (base, ramp, specular map when specular is on). One extra draw per outlined renderer.

**Pitfalls.**
- Outline needs the `OutlinePass` Render Objects features on every renderer asset (URP-02).
- Outline objects write stencil `_StencilRef` in the main pass — pick a value no other system uses.
- Skinned characters: the outline is drawn after skinning; normals must be smooth or the hull splits.

---

## MO-04 — Dissolving or fading mesh without blended transparency

**Goal.** Death dissolve, spawn-in or teleport on opaque meshes; no sorting, no overdraw.

| Setting | Value |
|---|---|
| Render Preset | **Opaque** (do not switch to Transparent) |
| Alpha Cutoff | On, `_AlphaCutoffValue` ~0.25 |
| Fade | On, `_FadeTex` a shared noise, `_FadeTransition` 0.1–0.2, `_FadePower` 1 |
| Fade burn | On for a glowing edge: `_FadeBurnColor` HDR orange, `_FadeBurnWidth` ~0.05 |
| Drive | `_FadeAmount` 0 → 1 (see FX-02) |

**Budget.** +1 sample. The shadow pass also runs the fade, so the shadow dissolves with the object.

**Alternatives.** `Dither` + `Fade By Cam Distance` for a screen-door see-through (FX-04). Dither raises the scene-depth
define — check the Depth Texture note before using it on a depth-free mobile asset.

**Pitfalls.** Reset `_FadeAmount` to 0 when a pooled object respawns; use an owned material instance or a prepared
"dissolve" material swapped in only during the effect.

---

## MO-05 — Additive glow mesh (aura, energy field)

**Goal.** A soft glowing shell or beam with bounded cost.

| Setting | Value |
|---|---|
| Render Preset | Additive (queue 3000, `One/One`, ZWrite off) |
| Light Model | `None`; Cast + Receive Shadows off |
| Look | `Rim` (after lighting, HDR) for the glow; `Scroll Texture` on a noise main texture for motion; `General Alpha` to fade in/out |
| Culling | Back (default); only `Off` when the shell must show from inside |
| Distance | `Fade By Cam Distance` to remove far auras cheaply |

**Budget.** ≤ 2 samples, but overdraw is the cost: keep few, small, short-lived additive meshes and never stack
screen-sized ones.

**Pitfalls.** Without Bloom the "glow" is just additive color — design it to read without post-processing. Do not use
`Intersection Glow` (depth texture).

---

## MO-06 — Stylized environment surface (ground, walls)

**Goal.** Large static surfaces that look stylized and cost almost nothing.

| Setting | Value |
|---|---|
| Render Preset | Opaque, Alpha Cutoff off |
| Light Model | `Toon` or `HalfLambert` (or lightmapped, ENV-05) |
| Receive Shadows | `Stylized` if the main light casts shadows; Cast Shadows off for floors |
| Color variation | `Height Gradient` (world space) or `Albedo From Vertex Color` (multiply) |
| Fog | On with a scene fog; cheaper than depth coloring |
| Never | Triplanar, Stochastic Sampling, Texture Blending, normal map on distant geometry |

**Budget.** ≤ 3 samples. One shared baked shader for every surface of the level; static meshes keep the SRP Batcher fed.

**Pitfalls.** Unique near-identical materials per mesh multiply variants; share one material and vary with vertex colors.

---

## MO-07 — Quality tiers by swapping prepared materials

**Goal.** Cheaper looks on weaker devices without keyword flips.

Prepare one material per tier in the editor and bake each: for example High = `Toon` + Receive Shadows + Rim, Medium =
`Toon`, Low = `FastLighting` or `None`. Every tier must exist in the build. Swap the shared material at load:

```csharp
using UnityEngine;

public sealed class MaterialTierSwap : MonoBehaviour
{
    [SerializeField] private Renderer _renderer;
    [SerializeField] private Material[] _tiers;     // index = quality tier, baked ahead of time

    public void Apply(int tier)
    {
        int index = Mathf.Clamp(tier, 0, _tiers.Length - 1);
        _renderer.sharedMaterial = _tiers[index];   // a prepared asset: no instance, SRP-Batcher friendly
    }
}
```

Drive `tier` from the project's own quality setting (not from effect keywords). Tiers that share an effect set share one
baked shader and batch together.

**Pitfalls.** A tier whose renderer feature is missing (for example an outline tier on a renderer without the
`OutlinePass` features) silently draws without that feature — keep the URP-02 checklist per tier.
