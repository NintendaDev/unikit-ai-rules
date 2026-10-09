# All In One VFX Toolkit — Effects quick reference

> **Base path:** `<AllIn1Root>` is the asset folder — the one that contains `AllIn1VfxAssemebly.asmdef`. Find it (`Glob **/AllIn1VfxAssemebly.asmdef`); never hard-code its location. The property names of every effect live in the `Properties` block of `<AllIn1Root>/Shaders/AllIn1Vfx.shader`.
> See also: [all-in-one-vfx-toolkit-effects-full.md](all-in-one-vfx-toolkit-effects-full.md) (per-effect detail), [all-in-one-vfx-toolkit-mobile-optimization.md](all-in-one-vfx-toolkit-mobile-optimization.md) (rules behind the verdicts)

One effect = one line. Pick candidates here, then open detail **only for the ones you will use**: in
`all-in-one-vfx-toolkit-effects-full.md` every effect is a block headed `### <ID> — <name>`; run
`Grep "^### GLOW " -A 10` (ID from the first column) instead of reading the whole file. Group sections in the full file
(`## Processing order`, `## Keyword families`, `## Vertex-stream rows`) are also grep-able.

**IDs are the shader keyword without `_ON`.** `SHAPE_N_*` stands for `SHAPE1_*`, `SHAPE2_*`, `SHAPE3_*` (one keyword per shape).

**Mobile verdict:** `OK` use freely · `LIMIT` a few layers, a few objects, or one per material class · `AVOID` hero-only or
desktop. Verdicts come from reading the shader code (v2.32) and the vendor docs — **not from device measurements**; the
vendor docs state almost no per-effect costs.
**Needs:** `depth` URP *Depth Texture* on the pipeline asset · `opaque` URP *Opaque Texture* · `bloom` Bloom post-processing
(the look, not the shader) · `tex` an extra texture · `noise` a tileable noise texture · `stream` particle Custom Data +
vertex streams · `ps` only meaningful on a Particle System material · `mesh` real 3D mesh with normals · `comp:X` a scene
component · `—` nothing special.

---

## Base, shapes and combination

| ID | Effect | What it does — use it for | Mobile | Needs |
|---|---|---|---|---|
| `SHAPE1` | Shape 1 (always on) | Main texture `_MainTex` (auto-assigned on sprites/UI Images), tint `_ShapeColor`, scroll speeds — the base of every effect | OK | tex |
| `SHAPE2`, `SHAPE3` | Extra shapes | Layer a second/third texture (noise, mask, detail) multiplied (or added with `SHAPEADD`) onto shape 1 | OK (each +1 sample) | tex |
| `SHAPE_N_CONTRAST` | Shape contrast / brightness | Tone one shape before combining | OK | — |
| `SHAPE_N_DISTORT` | Per-shape distortion | Wobble one shape with a scrolling noise texture — flames, water, energy | LIMIT | noise |
| `SHAPE_N_ROTATE` | Shape rotation | Static offset + timed rotation of one shape — swirls, magic circles | OK | — |
| `SHAPE_N_SHAPECOLOR` | Red channel is alpha | Greyscale single-channel masks tinted by `Shape Color` | OK | tex |
| `SHAPE_N_SCREENUV` | Screen-position UVs | Sample a shape in screen space instead of model UVs — fixed-size patterns on 3D meshes | LIMIT | mesh |
| `SHAPEADD` | Add shape results | Add instead of multiply when combining shapes | OK | — |
| `SPLITRGBA` | Split colour/alpha weights | Weight the RGB and alpha of each shape separately | OK | — |
| `SHAPE1MASK` | Shape 1 mask | Keep the main shape intact while others distort/combine over it — trails | LIMIT | tex |
| `SHAPEDEBUG` | Shape debug | Show one shape alone — authoring aid, must be off in shipped materials | OK (off) | — |

## Colour

| ID | Effect | What it does — use it for | Mobile | Needs |
|---|---|---|---|---|
| `GLOW` | Glow | HDR multiplier so Bloom picks the effect up; `GLOWTEX` adds an alpha mask for where it glows | OK (`GLOWTEX` LIMIT) | bloom |
| `COLORRAMP` | Color Ramp | Map luminance through a gradient — fire/energy palettes, palette swaps; `COLORRAMPGRAD` uses a live gradient baked into the material | LIMIT | tex (gradient) |
| `COLORGRADING` | Color Grading | Three-colour (light/mid/dark) remap — the cheaper alternative to Color Ramp | OK | — |
| `HSV` | Hue shift and saturation | Recolour variants of one material without new textures | OK | — |
| `POSTERIZE` | Posterize | Reduce the number of colours — cel/retro look | OK | — |
| `RIM` | Fresnel / Rim colour | Edge glow at grazing angles — shields, auras, selection | OK | mesh |
| `BACKFACETINT` | Backface tint | Tint back and front faces differently — shells, domes, inside of bubbles | LIMIT (needs back faces drawn) | mesh |
| `LIGHTANDSHADOW` | Fake light and shadow | Cheap directional light + cartoon shadow band on meshes; not Unity lights | OK | mesh, comp:`AllIn1VfxFakeLightDirSetter` |
| `DEPTHGLOW` | Intersection glow | Glow where geometry meets depth-writing meshes — force fields, water edges | AVOID | depth, bloom |

## Alpha

| ID | Effect | What it does — use it for | Mobile | Needs |
|---|---|---|---|---|
| `MASK` | Alpha mask | Texture mask on final opacity | OK | tex |
| `FADE` | Fade from noise (dissolve) | Noise-driven dissolve; `FADEBURN` adds a burn-edge texture and glow | LIMIT (`FADEBURN` AVOID on many) | noise, bloom (burn) |
| `ALPHAFADE` | Fade from final shape (procedural dissolve) | Dissolve using the combined shape as the mask — one texture fewer than `FADE` | OK | — |
| `SOFTPART` | Soft particles / intersection fade | Fade where a quad meets opaque geometry — removes hard intersection lines | AVOID | depth |
| `CAMDISTFADE` | Camera distance fade | Fade by distance (far) and proximity (close) — fade objects that clip the camera | OK | — |
| `ALPHASMOOTHSTEP` | Alpha remap | Smoothstep the alpha range — soften or sharpen edges | OK | — |
| `ALPHACUTOFF` | Alpha cutoff | Discard low-alpha pixels — cartoon edges and a way to cut overdraw | OK | — |

## UV and vertex

| ID | Effect | What it does — use it for | Mobile | Needs |
|---|---|---|---|---|
| `DISTORT` | Global distortion | Wobble every texture with a scrolling noise texture — heat, water, fire | LIMIT | noise |
| `TEXTURESCROLL` | Global texture scroll | Scroll all textures at one speed | OK | — |
| `POLARUV` | Polar coordinates | Turn linear textures into radial ones (rings, portals); `POLARUVDISTORT` also warps the distortion textures | LIMIT | — |
| `TWISTUV` | Twist | Swirl UVs around a point — vortex, portal | LIMIT | — |
| `WAVEUV` | Wave | Directional UV wave — flags, water | LIMIT | — |
| `ROUNDWAVEUV` | Round wave | Radial wave — ripples, shockwave rings | LIMIT | — |
| `DOODLE` | Hand drawn | Frame-by-frame wobble — hand-drawn look | OK | — |
| `PIXELATE` | Pixelate | Pixel-art look (bad together with distortions) | OK | — |
| `SHAKEUV` | Shake | Rapid UV jitter — glitch, damage | OK | — |
| `TRAILWIDTH` | Trail width | Shape the thickness profile along a Trail Renderer with a gradient | LIMIT | tex (gradient), Trail Renderer |
| `VERTOFFSET` | Vertex offset | Displace mesh vertices with scrolling noise — blobs, ocean, wobble | LIMIT (dense meshes AVOID) | noise, mesh |
| `SHAPETEXOFFSET` | Shape texture offset (random) | Offset shapes by `_TimingSeed` so copies of one material do not move in sync | OK | — |

## Particle-stream driven

| ID | Effect | What it does — use it for | Mobile | Needs |
|---|---|---|---|---|
| `ALPHAFADEINPUTSTREAM` | Fade amount from vertex stream | Drive `FADE`/`ALPHAFADE` from Particle Custom Data instead of alpha (global keyword) | OK | stream, ps |
| `ALPHAFADETRANSPARENCYTOO` | Fade also fades transparency | Global alpha falls with the fade amount (global keyword) | OK | — |
| `OFFSETSTREAM` | Texture offset from stream | Scroll shape textures per particle over its life — sword slashes | OK | stream, ps |
| `SHAPEWEIGHTS` | Shape weights from stream | Fade shapes in/out per particle | OK | stream, ps |

## Pipeline-bound and render configuration

| ID | Effect | What it does — use it for | Mobile | Needs |
|---|---|---|---|---|
| `SCREENDISTORTION` | Screen distortion | Bend the final frame behind the quad with a normal map — shockwave, heat haze, portal refraction; `DISTORTONLYBACK` (only objects behind) and `DISTORTUSECOL` are sub-options | AVOID | opaque, tex (normal map) |
| `FOG` | Use Unity fog | Apply scene fog; no effect in HDRP | OK (adds fog variants) | scene fog |
| `TIMEISCUSTOM` | Custom (unscaled) time | Keep animating at `timeScale = 0` | OK | comp:`SetAllIn1VfxCustomGlobalTime` |
| `ADDITIVECONFIG` | Additive configuration | Treat the greyscale of the result as alpha under additive blending | OK | — |
| `PREMULTIPLYALPHA`, `PREMULTIPLYCOLOR` | Premultiply | Multiply alpha into colour / grey into alpha — black becomes invisible without fading | OK | — |
| `NORMALMAP` | Normal map (Lit shader only) | Surface detail for the Lit shader | LIMIT | tex, Lit shader |
| `LIT` | Lit shader | A separate shader that reacts to real 3D lights in every pipeline | AVOID | Lit shader, URP lighting |

## Verdict summary

- **Never on a mobile quality level without a profiled reason:** `SCREENDISTORTION`, `SOFTPART`, `DEPTHGLOW`, `LIT`.
- **Spend sparingly (count them per material):** every `LIMIT` row; stacking three `SHAPE_N_DISTORT` plus `DISTORT`
  plus `TWISTUV` on a full-screen quad is how a cheap texture becomes an expensive shader.
- **Default-safe set** for a mobile effect material: shape 1 (+ one or two shapes), `GLOW`, `COLORGRADING`/`HSV`,
  `ALPHACUTOFF` or `ALPHASMOOTHSTEP`, `TEXTURESCROLL`, `ALPHAFADE`, `CAMDISTFADE`, `RIM` on meshes.
