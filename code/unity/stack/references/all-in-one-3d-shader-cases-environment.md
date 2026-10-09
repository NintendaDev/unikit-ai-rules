# All In One 3D Shader — Cases: environment looks

> **Base path:** `Assets/Third-Party Assets/VFX/AllIn13DShader/`
> See also: [all-in-one-3d-shader-urp-setup.md](all-in-one-3d-shader-urp-setup.md) (defines, renderer features), [all-in-one-3d-shader-runtime-scripting.md](all-in-one-3d-shader-runtime-scripting.md) (RS-07 global components), [all-in-one-3d-shader-cases-mobile-profiles.md](all-in-one-3d-shader-cases-mobile-profiles.md) (MOB-06 surface base)

Read only the block you need. Cases come from the shader code and the vendor's wind, shadow, Fast Lighting and depth-coloring
pages; they are not measured presets. Most cases need **one scene component** (WindController, FastLightConfigurator,
ShadowsConfigurator, DepthColoringCamera) — a missing component is the usual reason "nothing happens".

---

## ENV-01 — Foliage wind with a vertical mask

**Goal.** Grass, bushes and tree crowns sway while the base stays planted.

| Item | Value |
|---|---|
| Scene | One `WindController`: assign `windNoise` (a tileable RGB noise), `windForce` 0.3–1, `noiseSpeed` (12, 6) default, `worldSize` 50 default, `bidirectionalWind` on, `useWindDir` off for omnidirectional wind |
| Material | Wind On, `Use Vertical Mask` On, `_WindVerticalMaskMinY` = object-space Y of the base, `_WindVerticalMaskMaxY` = Y where full sway is reached, `_WindAttenuation` 1 |
| Rendering | Opaque + Alpha Cutoff for leaf cards; `Culling Mode` Off only for double-sided leaves |
| Shadows | Cast Shadows off for small foliage; the wind runs again in the shadow pass |

**How it works.** The vertex stage samples the global noise at the world XZ position scrolled by time, remaps it to
−1…1 (or 0…1 when `bidirectionalWind` is off), multiplies by force and the vertical mask, and moves the vertex; the
vertical component is zeroed [code]. With `useWindDir` on, the noise channels are averaged and the push follows the
controller's forward.

**Mobile verdict.** LIMIT: one vertex-texture fetch per vertex (and per shadow/depth pass vertex). Keep foliage meshes
low-poly. The noise texture is sampled at LOD 0 — disable its mipmaps. Use `Use Custom Time` only if the wind must keep
moving while the game is paused (RS-04).

**Pitfalls.** No `WindController` in the scene → the globals are unset and nothing moves. Two controllers overwrite each
other every frame. Vertex Y mask values are in object space, so scale and pivot matter.

---

## ENV-02 — Stylized toon world: toon light, stylized shadows, colored shadows

**Goal.** Flat shaded surfaces with crisp, tinted shadows.

| Item | Value |
|---|---|
| Material | Light Model `Toon` (or `HalfLambert`), `Receive Shadows` On with `Shadow Type` = `Stylized`, `_ShadowCutoff` ~0.2, `Custom Shadow Color` On |
| Scene | One `ShadowsConfigurator`: `shadowColor` (alpha = strength of the colored shadow), `updateEveryFrame` off for a static scene |
| URP | Main directional light with shadows enabled; additional lights do not contribute shadows to this effect |

**How it works.** The shadow term of the main light is turned into a hard edge with a derivative-based anti-aliasing step
(`Stylized`), and shaded areas lerp toward the global shadow color by its alpha [code]. Only the main directional light
produces these shadows; lightmaps and other lights are not received [docs].

**Mobile verdict.** LIMIT: the shadow map is the cost; the toon look itself is cheap. Use a single cascade, a short
shadow distance and a modest shadow resolution in the URP asset [general].

**Pitfalls.** `Custom Shadow Color` without a `ShadowsConfigurator` leaves the global color at its default (black).
Receiving needs the object to be in the main light's shadow distance; casters (props) need `Cast Shadows` or a normal URP
shadow caster.

---

## ENV-03 — Height gradient and fog tint

**Goal.** A cheap color gradient from base to top (grass tips, building height, terrain strata) plus distance fog.

| Item | Value |
|---|---|
| Height Gradient | On, `Position Space` World (consistent across pieces) or Local (per object), `_MinGradientHeight`, `_MaxGradientHeight`, `_GradientHeightColor01/02` (multiplied with the base color) |
| Fog | `Fog On` in Advanced Configuration; Fog define on in URP Settings; a scene fog configured in Lighting |

**Mobile verdict.** OK: ALU only. Prefer this over Depth Coloring for atmospheric depth because it has no depth-texture
dependency.

**Pitfalls.** The gradient multiplies the albedo: a dark base color stays dark. Fog works only when the Fog support define
is on (otherwise `Fog On` has no effect).

---

## ENV-04 — Fast Lighting scene setup

**Goal.** Run many lit objects with one global light direction and color and no real-time lights.

1. Material: Light Model `FastLighting`; shadows off (Cast + Receive) — the vendor says shadows must be disabled for the
   promised performance [docs].
2. Scene: delete the real-time lights, add an empty GameObject with `FastLightConfigurator`. Rotate it so its forward
   points along the light travel direction (the component writes `-forward` as the light direction); set `lightColor`.
   `Reset()` copies the color from a `Light` if one is on the same object before you remove it.
3. Ambient: the indirect term uses the scene's environment lighting; set a flat environment color or use
   `Custom Ambient Light` on the materials.

**How it works.** The shader reads `global_lightDirection` and `global_lightColor` instead of URP's main light, evaluates
N·L once, and skips the additional-light loop [code].

**Mobile verdict.** OK: this is the vendor's mobile and VR path.

**Pitfalls.** Other shaders in the project (Lit, particles, TextMeshPro) still use the real main light — mixed scenes
need either a matching real light for them or accept the mismatch. Changing the direction at runtime needs the
component enabled (it writes in `Update`).

---

## ENV-05 — Lightmapped static scenery

**Goal.** Baked lighting for static level geometry.

| Item | Value |
|---|---|
| Material | `Affected by Lightmaps` On; Light Model `Classic`/`HalfLambert`; Receive Shadows usually off (baked); `Lightmap Color Correction` only if the bake needs a grade |
| Meshes | Marked static for lighting, with lightmap UVs (the shader reads the second UV set) |
| URP Settings | Lightmaps support on; Shadow Mask support on only for the Shadowmask lighting mode |
| Scene | A baked lightmap set |

**Mobile verdict.** LIMIT for the variant cost: lightmap variants multiply. Use it for static scenery, keep the lightmap
defines off in projects that do not bake.

**Pitfalls.** Dynamic objects do not get lightmaps (they use the real or Fast light). Mixed-mode subtractive lighting
(`LIGHTMAP_SHADOW_MIXING`) uses the URP subtractive shadow color [code].

---

## ENV-06 — Depth Coloring stylized fog

**Goal.** Color objects by distance from the camera using a gradient texture.

1. Material: `Depth Coloring` On.
2. Create the data asset: `Assets/Create/AllIn13DShader/Others/Depth Coloring Properties` (`AllIn1DepthColoringProperties`)
   and set `depthColoringMinDepth`, `depthZoneLength`, `fallOff` (0.1–1.5) and `depthColoringGradientTex`.
3. Add `DepthColoringCamera` to the camera, assign `cam` and the asset; `ApplyValues()` writes the four `global_Depth…`
   values on enable.

**How it works.** The fragment computes the vertex's eye-space distance, normalizes it between the min depth and the zone
length, shapes it with `fallOff`, and lerps toward the gradient color by the gradient's alpha [code].

**Mobile verdict.** LIMIT. The effect itself is one sample, but it raises the scene-depth define; confirm the Depth Texture
requirement on the target quality level (effects catalog depth note). For a depth-free alternative use ENV-03.

**Pitfalls.** The documentation path says "AllIn1 3D Shader → Other"; the menu in v2.74 is `AllIn13DShader/Others`. The
camera component only sets `depthTextureMode` in the editor.

---

## ENV-07 — Large tiling surfaces: triplanar and stochastic (desktop) and the baked alternative

**Goal.** Texture rocks, cliffs or terrain without UVs, or hide tiling.

**Desktop setup.** `Triplanar Mapping` On, `UV Space` World, `_TriplanarSharpness` 10–30 for crisp blends, a top texture
(`_TriplanarTopTex`), optional `Noise Transition`; `Stochastic Sampling` On only if tiling remains visible. Cost: 4
samples (+4 with a normal map), ×3 per lookup with stochastic [code].

**Mobile alternative.** Bake the variation instead of computing it:
- Author tiling textures once and give each mesh proper UVs (trim sheets).
- Use vertex colors as the blend mask in the DCC tool and `Albedo From Vertex Color` (multiply) or a single baked
  texture.
- Add large-scale variation with `Height Gradient` and fog (ENV-03).

**Mobile verdict.** AVOID Triplanar, Stochastic Sampling and Texture Blending. If a single hero rock needs triplanar, use it
on that material only and keep it out of the shared baked shader.

**Pitfalls.** Triplanar and Screen Space UV are mutually exclusive. World-space triplanar textures swim when the object
moves; use Local for moving objects.
