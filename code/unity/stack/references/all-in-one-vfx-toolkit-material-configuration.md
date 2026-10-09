# All In One VFX Toolkit — Material configuration (blend, render state, shapes)

> **Base path:** `<AllIn1Root>` is the asset folder — the one that contains `AllIn1VfxAssemebly.asmdef` (find it with `Glob **/AllIn1VfxAssemebly.asmdef`; never hard-code its location).
> See also: [all-in-one-vfx-toolkit-effects-quickref.md](all-in-one-vfx-toolkit-effects-quickref.md) (pick effects), [all-in-one-vfx-toolkit-mobile-optimization.md](all-in-one-vfx-toolkit-mobile-optimization.md) (overdraw and blend cost)

How the shader inspector is organised and what each render-state choice does. Sources: vendor docs "Shader Structure and
Usage" and "Advanced Configuration and Key Rendering Concepts", plus the v2.32 material editor and shader code.

---

## The three blocks

The material inspector has **Configuration** (blend preset + advanced options, at the very top), **Shapes** (1 to 3 textures
combined first) and **Effects** (Color, Alpha, UV/Vertex effects applied to the combined result). Defaults of every main
shader: queue `Transparent` (3000), `Blend SrcAlpha OneMinusSrcAlpha`, `ZWrite Off`, `ZTest LEqual`, `Cull Off`, `ColorMask RGBA`.

- One shape is always on; add two more with the button under the shape block. Combination controls appear only with more than
  one shape. Default combination = multiply; `Add Shape Results` (`SHAPEADD_ON`) adds; per-shape weights tune influence.
- Effects run after the shapes combine. Color effects touch RGB, alpha effects touch alpha, UV/vertex effects change the
  coordinates of **all** textures (shapes included) plus one effect that displaces vertices.
- Hover a property in the inspector to read its reference name (use it with `SetFloat`/`SetColor`); the small `R` button resets it.

## Blend presets (Configuration)

| Preset | Blend | Use it for | Mobile note |
|---|---|---|---|
| **Transparent** (default) | `SrcAlpha OneMinusSrcAlpha` | Textures with an alpha channel; the required preset for `SCREENDISTORTION` | Standard blended overdraw. |
| **Additive** | `One One` + `ADDITIVECONFIG_ON` | Black-background textures and bright effects (fire, sparks, energy); black is invisible | Very bright on non-dark backgrounds; stacking layers multiplies brightness **and** fill cost. |
| **Soft Add** (vendor: "use with caution") | `OneMinusDstColor One` + `ADDITIVECONFIG_ON` | Softer than Additive | Overlapping bright soft-add materials misbehave (a blend limitation); workaround: Additive with lower alpha. |
| **Blend Add / Premultiply** | `One OneMinusSrcAlpha` + `ADDITIVECONFIG_ON` + `PREMULTIPLYCOLOR_ON` | A mix of Transparent and Additive (the technique from the GDC Diablo 3 technical-artist talk): ignores a black background like additive, less bright, can still be tinted black without fading | Good default for sparks/fire over varied backgrounds. |
| **Opaque** | `One Zero`, `ZWrite On`, queue Geometry | Non-transparent meshes; "very performant", rarely used for VFX | Needs no blending; alpha cutoff still applies. |
| **Custom** | any Src/Dst, ZWrite, ZTest, Cull | Special cases | Easy to break; start from a preset. |

- With the additive configuration active, alpha effects act on the **greyscale of the result** instead of alpha.
- Presets also set the `RenderType` override tag and move the render queue between 2000 and 3000 when the current queue
  sits on the other side of 2050; the inspector preserves `_ZWrite` and `renderQueue` when it swaps the shader.
- Black backgrounds by design: the premade textures have black backgrounds. To make black transparent use *Premultiply
  Color*, a white texture whose grayscale becomes alpha (`SHAPE_N_SHAPECOLOR`, *Alpha Is Red Channel*), or Additive.

## Advanced Configuration options

| Option | Meaning / default / note |
|---|---|
| Alpha Blending Modes | The `Blend` command (`_SrcMode`, `_DstMode`). |
| Additive Configuration | `ADDITIVECONFIG_ON`: global greyscale is treated as alpha; only meaningful with an additive blend. |
| Premultiply Alpha | `PREMULTIPLYALPHA_ON`: multiply shape-result alpha into colour; darkens where alpha < 1. |
| Premultiply Color | `PREMULTIPLYCOLOR_ON`: multiply shape-result greyscale into alpha; black becomes invisible. |
| Enable Z Write | `_ZWrite`: the mesh writes depth and changes sorting of other objects — for less-transparent or self-overlapping meshes. Off by default. |
| ZTest Mode | `_ZTestMode`, default `LEqual`; `Always` shows the object regardless of depth (for overlays). |
| Culling Mode | `_CullingOption`: `Off` (default; back faces drawn), `Front`, `Back`. |
| Color Write Mask | `_ColorMask`, rarely used. |
| Random Seed | `_TimingSeed`: varies all scroll/rotation/distortion between instances of a reused material; set by script or particle Custom Data. |
| Use Unity Fog | `FOG_ON`; no effect in HDRP. |
| Use Custom Time | `TIMEISCUSTOM_ON`; needs `SetAllIn1VfxCustomGlobalTime` in the scene. |
| Enable GPU Instancing | The material's instancing checkbox (`m_EnableInstancingVariants`); saves draws only for **identical meshes** and only for shaders that are not SRP-batched. |
| Render Queue | Higher renders later; adjust with *Project Settings → Graphics → Transparency Sort Mode and Axis* if sorting is wrong. |

## Choosing render state by effect type

| Effect type | Preset | ZWrite | Cull | Notes |
|---|---|---|---|---|
| Sprite-like particle (smoke, puff, spark) | Transparent or Blend Add | Off | Off is fine on quads | Keep quads small; trim transparent borders. |
| Fire, energy, glow | Additive or Blend Add | Off | Off | Premultiply Color keeps black invisible. |
| Shield / bubble / dome shell (mesh) | Transparent or Additive | Off (add a `ZWrite` helper material only if overlapping shells sort wrongly) | Back or Front when only one side is needed — halves the fill cost | `BACKFACETINT` requires back faces drawn. |
| Dissolving solid mesh | Transparent + `ALPHACUTOFF`, or Opaque + cutoff | On for opaque | Back | Cutoff turns the dissolve into discard instead of blended overdraw. |
| Screen distortion quad | Transparent | Off | Off | Needs opaque texture; AVOID on mobile. |
| UI image effect | Transparent | Off | — | Each Image must own its material to animate (see scripting reference). |

## Sorting and queue

- Transparent shaders sort by render queue and then by distance; ZWrite is off by default, so overlapping shells can pop.
  Raise `Render Queue` for effects that must draw on top (for example `3000 + n`), keep related layers in a deterministic
  order, and avoid ZWrite on transparent meshes unless you accept changed sorting for everything behind them.
- A VFX quad never enters the camera depth texture (the shader has no `DepthOnly` pass): do not rely on depth-based fades
  against other VFX.
- In the Scene view, enable *Always Refresh* in the Scene view effects dropdown or animated materials look frozen
  (editor only).

## Shape workflow tips

- Prefer one well-made texture plus one noise/mask shape over three similar textures; every shape is a sample plus scroll maths.
- Put pure-white or very simple shapes through the Asset Window's *Texture Creators* (white texture, gradients, atlases,
  tileable noise) instead of shipping large files.
- Use `SHAPE1MASK` to keep a trail's main shape from being smeared by distortions, and the per-shape multipliers
  (`_OffsetSh1…3`, `_RandomSh1…3Mult`, `_ShNBlendOffset`) to make one particle stream animate shapes differently.
