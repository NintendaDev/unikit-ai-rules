# All In One 3D Shader — Effects quick reference

> **Base path:** `Assets/Third-Party Assets/VFX/AllIn13DShader/`
> See also: [all-in-one-3d-shader-effects-full.md](all-in-one-3d-shader-effects-full.md) (per-effect detail), [all-in-one-3d-shader-mobile-optimization.md](all-in-one-3d-shader-mobile-optimization.md) (rules behind the verdicts)

One effect = one line. Pick candidates here, then open detail **only for the ones you will use**: in
`all-in-one-3d-shader-effects-full.md` every effect is a block headed `### <ID> — <name>`; run
`Grep "^### HIT " -A 9` (use the ID from the first column) instead of reading the whole file. Group sections in the
full file (`## Pipeline order`, `## Advanced configuration`, `## Depth-texture note`) are also grep-able.

**Mobile verdict:** `OK` use freely · `LIMIT` a few objects or one per material class · `AVOID` desktop or hero-only.
Verdicts are recommendations from reading the shader code (v2.74), not device measurements.
**Needs:** `depth` URP Depth Texture · `bloom` Bloom post-processing · `comp:X` a scene component · `tangents`,
`vcolor`, `UV2` mesh data · `tex` an extra texture · `bake` baked lightmaps · `—` nothing special.

---

## Lighting

| ID | Effect | What it does — use it for | Mobile | Needs |
|---|---|---|---|---|
| `LIGHTMODEL` | Light Model | Base shading style: `None` (ambient only), `Classic`, `Toon`, `ToonRamp`, `HalfLambert`, `FakeGI`, `FastLighting` (one global light, mobile-oriented) | OK (`ToonRamp` LIMIT) | `FastLighting`: comp:FastLightConfigurator |
| `SHADINGMODEL` | Shading Model | `Basic` or `PBR` (metallic/smoothness) — realistic metal and gloss | LIMIT | tex (optional metallic map) |
| `SPECULARMODEL` | Specular Model | Highlight spots: `Classic`, `Toon`, `Anisotropic`, `AnisotropicToon` — shiny surfaces, hair, brushed metal | LIMIT (aniso AVOID) | tangents (aniso) |
| `REFLECTIONS` | Reflections | Environment reflection, `Classic` or `Toon` | AVOID | probes/skybox |
| `NORMAL_MAP` | Normal Map | Fine surface detail without geometry | LIMIT | tangents, tex |
| `FLAT_NORMALS` | Flat Normals | Faceted low-poly shading per pixel; also the fix for outline gaps | OK | — |
| `CUSTOM_SHADOW_COLOR` | Custom Shadow Color | Colored instead of black shadows, set globally | OK | comp:ShadowsConfigurator |
| `AFFECTED_BY_LIGHTMAPS` | Affected by Lightmaps | Receive baked lighting (static scenery) with optional color correction | LIMIT | bake |
| `CUSTOM_AMBIENT_LIGHT` | Custom Ambient Light | Override environment light; white (1,1,1) with Light Model `None` = unlit | OK | — |
| `CAST_SHADOWS_ON` | Cast Shadows | Object writes into the shadow map | LIMIT | — |
| `RECEIVE_SHADOWS` | Receive Shadows | Receive main-light shadows, `Classic` soft or `Stylized` hard-edged toon | LIMIT | — |

## Color

| ID | Effect | What it does — use it for | Mobile | Needs |
|---|---|---|---|---|
| `COLOR_RAMP` | Color Ramp | Maps luminance through a gradient texture — palette swaps, toon color bands | OK | tex |
| `AOMAP` | AO Map | Baked ambient occlusion on indirect light — depth in crevices | OK | tex |
| `HIGHLIGHTS` | Highlights | Bright edge highlights facing the light — stylized glossy edges | OK | — |
| `RIM_LIGHTING` | Rim or Fresnel | Glow at grazing angles — shields, glass, backlight, selection glow | OK | — |
| `GREYSCALE` | Greyscale | Desaturate with optional tint — frozen, petrified, dead, disabled states | OK | — |
| `POSTERIZE` | Posterize | Reduce the number of colors — cel or retro look | OK | — |
| `HUE_SHIFT` | Hue Shift | Rotate hue, saturation, brightness — recolored variants, poison/heat tint | OK | — |
| `EMISSION` | Emission | Self-illumination that exceeds 1 to glow — lamps, crystals, power-ups | LIMIT | bloom, tex |
| `HOLOGRAM` | Hologram | Scan lines and alpha flicker — sci-fi projection, ghost | LIMIT | transparent preset |
| `MATCAP` | Matcap | Fake lighting or reflection from one sphere texture — cheap metal, ice, toon shading | OK | tex |
| `HIT` | Hit | Blend the color toward a flash color — damage flash, power-up pulse | OK | — |
| `CONTRAST_BRIGHTNESS` | Contrast and Brightness | Simple tone adjustment | OK | — |
| `HEIGHT_GRADIENT` | Height Gradient | Two-color vertical gradient, local or world — terrain, buildings, fog base | OK | — |
| `INTERSECTION_GLOW` | Intersection Glow | Glow where the mesh meets other geometry — force fields, water edges | AVOID | depth |
| `ALBEDO_VERTEX_COLOR` | Albedo From Vertex Color | Base color from mesh vertex colors, multiply or replace — untextured vertex-colored models | OK | vcolor |
| `TRIPLANAR_MAPPING` | Triplanar Mapping | Project textures along three axes, no UVs needed — large rocks, terrain | AVOID | tex |
| `TEXTURE_BLENDING` | Texture Blending | Blend two or three textures by mask or vertex colors — terrain layers | AVOID | tex, vcolor or mask |
| `DEPTH_COLORING` | Depth Coloring | Color by distance from the camera — stylized fog and depth gradients | LIMIT | comp:DepthColoringCamera, depth (see full) |
| `SUBSURFACE_SCATTERING` | Fake Subsurface Scattering | Light bleeding through thin material — leaves, wax, skin | LIMIT | tex |

## Alpha

| ID | Effect | What it does — use it for | Mobile | Needs |
|---|---|---|---|---|
| `ALPHA_CUTOFF` | Alpha Cutoff | Discard pixels under an alpha threshold — cutout foliage, dissolve on opaque meshes | OK | — |
| `FADE` | Fade | Progressive transparency from a noise texture, optional burning edge — dissolve, death | OK | tex, UV2 (if chosen) |
| `INTERSECTION_FADE` | Intersection Fade | Fade out where the mesh meets other geometry — soft particles on meshes | AVOID | depth |
| `ALPHA_ROUND` | Alpha Round | Round alpha to 0 or 1 — hard cutout from soft alpha | OK | — |
| `FADE_BY_CAM_DISTANCE` | Fade By Cam Distance | Fade by distance to the camera, far or near — see-through obstructions, LOD pop hiding | OK | — |
| `DITHER` | Dither | Screen-door transparency pattern — cheap fade on opaque meshes | LIMIT | depth (define, see full) |

## Mesh (vertex stage, also runs in shadow and depth passes)

| ID | Effect | What it does — use it for | Mobile | Needs |
|---|---|---|---|---|
| `VERTEX_SHAKE` | Vertex Shake | Random wobble of vertices — vibration, rage, damage shiver | OK | — |
| `VERTEX_INFLATE` | Vertex Inflate | Expand the mesh along normals — growth, power-up pulse, hit squash | OK | — |
| `VERTEX_DISTORTION` | Vertex Distortion | Displace vertices by a scrolling noise texture — melting, warping | LIMIT | tex |
| `VOXELIZE` | Voxelize | Snap vertices to a grid — blocky look without changing the mesh asset | OK | — |
| `GLITCH` | Glitch | Digital slicing displacement — teleport, corruption | LIMIT | — |
| `RECALCULATE_NORMALS` | Recalculate Normals | Rebuild normals after vertex effects | AVOID | tangents |
| `WIND` | Wind | Sway driven by the global wind noise — grass, trees, banners | LIMIT | comp:WindController |

## UV

| ID | Effect | What it does — use it for | Mobile | Needs |
|---|---|---|---|---|
| `SCROLL_TEXTURE` | Scroll Texture | Scroll the texture in X and Y — conveyors, flowing energy | OK | — |
| `SCREEN_SPACE_UV` | Screen Space UV | Use screen coordinates instead of mesh UVs — screen-fixed patterns | LIMIT | depth (define, see full) |
| `PIXELATE` | Pixelate | Low-resolution pixel look by quantizing UVs | OK | — |
| `STOCHASTIC_SAMPLING` | Stochastic Sampling | Break up visible tiling by random multi-sampling | AVOID | — |
| `WAVE_UV` | Wave UV | Ripple distortion of UVs — water, heat shimmer | LIMIT | — |
| `HAND_DRAWN` | Hand Drawn | Frame-by-frame UV jitter — hand-drawn animation feel | OK | — |
| `UV_DISTORTION` | Distortion | Warp UVs with a noise map — heat haze, underwater, psychedelic | LIMIT | tex |

## Other

| ID | Effect | What it does — use it for | Mobile | Needs |
|---|---|---|---|---|
| `OUTLINETYPE` | Outline Type | Inverted-hull outline: `Simple`, `Constant` (fixed screen width), `FadeWithDistance` — selection, bosses, toon characters | LIMIT | URP Render Objects features for `OutlinePass` |
| `ADV` | Advanced configuration | Render preset, blend modes, culling, ZWrite/ZTest, color mask, fog, spherize normals, custom time, GPU instancing, render queue, stencil reference | OK | — |
