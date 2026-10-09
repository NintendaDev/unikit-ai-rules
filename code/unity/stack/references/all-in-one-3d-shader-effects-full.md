# All In One 3D Shader — Effects full reference

> **Base path:** `Assets/Third-Party Assets/VFX/AllIn13DShader/` (property names live in the `Properties` block of `Shaders/Generic Shaders/AllIn13DShader.shader`)
> See also: [all-in-one-3d-shader-effects-quickref.md](all-in-one-3d-shader-effects-quickref.md) (one line per effect — start there), [all-in-one-3d-shader-runtime-scripting.md](all-in-one-3d-shader-runtime-scripting.md) (driving properties from code)

Do not read this file top to bottom. Find the effect ID in the quick reference, then
`Grep "^### <ID> " -A 9` here. Costs come from reading the shader code (v2.74), not from device measurements.

**Cost legend.** `ALU-s` small fragment math · `ALU-m` several `pow`/trig/`normalize` · `T+n` n extra texture samples per
pixel · `VTX` vertex math · `VTF` vertex texture fetch · `DEPTH` samples the URP depth texture · `PASS` extra draw ·
`LIGHT` repeats per light. Vertex effects run in the main pass **and** in ShadowCaster, DepthOnly and DepthNormals.
"Off value" is the property value that makes an enabled effect invisible (see the runtime-scripting reference).

---

## Pipeline order

1. Vertex: Shake → Inflate → Vertex Distortion → Voxelize → Glitch → Wind. `Recalculate Normals` repeats this chain for
   two neighbour points (3× the vertex math).
2. Vertex-stage UV: Screen Space UV → Scroll Texture → Hand Drawn.
3. Fragment UV: Triplanar → Wave UV → Distortion → Pixelate (they change the UVs every later sample uses).
4. Base color × `_Color` → "before lighting" color: Albedo From Vertex Color → Texture Blending → Hologram → Height
   Gradient → Hue Shift → Matcap → Posterize → Contrast/Brightness → Greyscale(before) → Rim(before) → Color
   Ramp(before) → Rim(before-last).
5. Lighting (or ambient only) → Emission added.
6. Alpha: Fade → Intersection Fade → Alpha Round → Fade By Cam Distance → Dither → Alpha Cutoff `clip`.
7. "After lighting" color: Subsurface → **Hit** → Highlights → Depth Coloring → Rim(after) → Greyscale(after) →
   Intersection Glow → Color Ramp(after). Then `General Alpha`, then fog.

`Hit` runs after lighting and the cutoff clip: a flash is unaffected by shading and never changes alpha.
Effects with a "stage" enum (Color Ramp, Rim, Greyscale) are placed before or after lighting by that enum.

---

## Lighting

### LIGHTMODEL — Light Model
- **Keyword:** `_LIGHTMODEL_NONE/CLASSIC/TOON/TOONRAMP/HALFLAMBERT/FAKEGI/FASTLIGHTING` (default `Classic`).
- **Cost:** `None` free · `FastLighting` ALU-s · `Classic/HalfLambert/FakeGI/Toon` ALU-s + LIGHT (main light plus a per-pixel loop over additional lights) · `ToonRamp` T+1 **per light**.
- **Needs:** `FastLighting`: `FastLightConfigurator` in the scene; docs say remove scene lights and turn shadows off. `ToonRamp`: `_ToonRamp` gradient.
- **Properties:** `_ToonCutoff`, `_ToonSmoothness` (Toon) · `_HalfLambertWrap` · `_HardnessFakeGI` · `_ToonRamp`.
- **Mobile:** OK. `None` + Custom Ambient (1,1,1) = unlit. `FastLighting` skips the additional-light loop entirely. `ToonRamp` LIMIT.
- **Notes:** Shading Model, Specular Model, Reflections, Normal Map and Flat Normals are declared dependent on a Light Model.

### SHADINGMODEL — Shading Model
- **Keyword:** `_SHADINGMODEL_BASIC/PBR`, `_METALLIC_MAP_ON`.
- **Cost:** `PBR` ALU-m + LIGHT; metallic map T+1.
- **Properties:** `_Metallic`, `_Smoothness`, `_MetallicMap` (R metallic, A smoothness).
- **Mobile:** LIMIT — hero assets only; PBR is the `MAT_Preset_StandardPBR` look.

### SPECULARMODEL — Specular Model
- **Keyword:** `_SPECULARMODEL_NONE/CLASSIC/TOON/ANISOTROPIC/ANISOTROPICTOON`.
- **Cost:** `Classic/Toon` ALU-m + T+1 (samples `_SpecularMap`, default white, whenever any model is on); `Anisotropic*` ALU-m per light.
- **Needs:** tangents for the anisotropic models.
- **Properties:** `_SpecularAtten`, `_Shininess`, `_AnisoShininess`, `_Anisotropy`, `_SpecularToonCutoff`, `_SpecularToonSmoothness`, `_SpecularMap`.
- **Mobile:** LIMIT; anisotropic AVOID. The Basic preset ships with `Classic` on — switch it to `None` unless the highlight is wanted.

### REFLECTIONS — Reflections
- **Keyword:** `_REFLECTIONS_NONE/CLASSIC/TOON`.
- **Cost:** sky/probe lookup per pixel; pulls reflection-probe variants (blending, box projection) when the URP defines allow them.
- **Properties:** `_ReflectionsAtten`, `_ToonFactor` (Toon).
- **Mobile:** AVOID — use `MATCAP` for fake reflection. The docs advise keeping values low.

### NORMAL_MAP — Normal Map
- **Keyword:** `_NORMAL_MAP_ON`.
- **Cost:** T+1 plus tangent-space interpolators; T+3 with Stochastic; T+4 with Triplanar.
- **Needs:** mesh tangents; Light Model other than none.
- **Properties:** `_NormalMap`, `_NormalStrength`.
- **Mobile:** LIMIT — skip on small or distant meshes.

### FLAT_NORMALS — Flat Normals
- **Keyword:** `_FLAT_NORMALS_ON`.
- **Cost:** ALU-s (`ddx/ddy` of the world position).
- **Properties:** `_FlatNormalsBlend`.
- **Mobile:** OK. Documented fix for outline gaps on hard-edged meshes: model with smooth normals, then fake the facets here.

### CUSTOM_SHADOW_COLOR — Custom Shadow Color
- **Keyword:** `_CUSTOM_SHADOW_COLOR_ON`.
- **Cost:** ALU-s.
- **Needs:** `ShadowsConfigurator` in the scene sets the global `global_shadowColor` (alpha controls strength).
- **Mobile:** OK. One color for the whole scene; per-material override does not exist.

### AFFECTED_BY_LIGHTMAPS — Affected by Lightmaps
- **Keyword:** `_AFFECTED_BY_LIGHTMAPS_ON`, `_LIGHTMAP_COLOR_CORRECTION_ON`.
- **Cost:** T+1 (lightmap) + ALU-s for the optional color correction; adds `LIGHTMAP_ON`/`DIRLIGHTMAP_COMBINED` variants.
- **Needs:** baked lightmaps and static objects.
- **Properties:** `_HueShiftLM`, `_HueSaturationLM`, `_HueBrightnessLM`, `_ContrastLM`, `_BrightnessLM`.
- **Mobile:** LIMIT — static scenery only; turn the lightmap define off when no scene is baked.

### CUSTOM_AMBIENT_LIGHT — Custom Ambient Light
- **Keyword:** `_CUSTOM_AMBIENT_LIGHT_ON`.
- **Cost:** ALU-s.
- **Properties:** `_CustomAmbientColor` (default 0.65 grey).
- **Mobile:** OK. White (1,1,1) with Light Model `None` renders the albedo unlit.

### CAST_SHADOWS_ON — Cast Shadows
- **Keyword:** `_CAST_SHADOWS_ON` (default on).
- **Cost:** PASS — the object is drawn into the shadow map, with vertex effects and an alpha sample.
- **Mobile:** LIMIT. Off alone does not remove the pass in the generic shader (fragment `discard` only). Turn **both** shadow toggles off to get the NoShadowCaster shader, or set the renderer's shadow casting to Off.

### RECEIVE_SHADOWS — Receive Shadows
- **Keyword:** `_RECEIVE_SHADOWS_ON` (default on), `_RECEIVEDSHADOWSTYPE_CLASSIC/STYLIZED`.
- **Cost:** T+1 (shadow map) + ALU-s; `Stylized` adds a derivative-based edge.
- **Needs:** main directional light with shadows in the URP asset. Other lights and lightmaps are not supported.
- **Properties:** `_ShadowCutoff` (Stylized, 0.001–0.5).
- **Mobile:** LIMIT. The toon look of Stylized is cheap; the shadow map is the cost.

---

## Color

### COLOR_RAMP — Color Ramp
- **Keyword:** `_COLOR_RAMP_ON`, `_COLORRAMPLIGHTINGSTAGE_BEFORELIGHTING/AFTERLIGHTING`.
- **Cost:** T+1.
- **Properties:** `_ColorRampTex` (gradient, use the built-in Gradient drawer/creator), `_ColorRampLuminosity`, `_ColorRampBlend` (off = 0), `_ColorRampTiling`, `_ColorRampScrollSpeed`.
- **Mobile:** OK.

### AOMAP — AO Map
- **Keyword:** `_AOMAP_ON`.
- **Cost:** T+1; affects indirect light only.
- **Properties:** `_AOMap`, `_AOMapStrength`, `_AOContrast`, `_AOColor`.
- **Mobile:** OK.

### HIGHLIGHTS — Highlights
- **Keyword:** `_HIGHLIGHTS_ON`.
- **Cost:** ALU-s.
- **Properties:** `_HighlightsColor` (HDR), `_HighlightsStrength` (off = 0), `_HighlightCutoff`, `_HighlightSmoothness`, `_HighlightOffset`.
- **Mobile:** OK.

### RIM_LIGHTING — Rim or Fresnel
- **Keyword:** `_RIM_LIGHTING_ON`, `_RIMLIGHTINGSTAGE_BEFORELIGHTING/BEFORELIGHTINGLAST/AFTERLIGHTING`.
- **Cost:** ALU-s; a zero `_RimOffset` takes the cheaper branch.
- **Properties:** `_RimColor` (HDR), `_RimAttenuation` (off = 0), `_MinRim`, `_MaxRim`, `_RimOffset`.
- **Mobile:** OK. `AfterLighting` keeps the rim unshaded (good for shields); `BeforeLighting` lets lighting tint it.

### GREYSCALE — Greyscale
- **Keyword:** `_GREYSCALE_ON`, `_GREYSCALESTAGE_BEFORELIGHTING/AFTERLIGHTING`.
- **Cost:** ALU-s.
- **Properties:** `_GreyscaleBlending` (off = 0), `_GreyscaleTintColor`, `_GreyscaleLuminosity`.
- **Mobile:** OK.

### POSTERIZE — Posterize
- **Keyword:** `_POSTERIZE_ON`.
- **Cost:** ALU-m (3 `pow`).
- **Properties:** `_PosterizeNumColors`, `_PosterizeGamma`. No blend property — it is all-or-nothing per material.
- **Mobile:** OK.

### HUE_SHIFT — Hue Shift
- **Keyword:** `_HUE_SHIFT_ON`.
- **Cost:** ALU-s.
- **Properties:** `_HueShift` (degrees), `_HueSaturation`, `_HueBrightness`; neutral values are 0, 1, 1.
- **Mobile:** OK.

### EMISSION — Emission
- **Keyword:** `_EMISSION_ON`.
- **Cost:** T+1 (`_EmissionMap` is sampled even when it is the default white).
- **Needs:** Bloom for the halo (Volume component under URP); Linear color space matches the vendor's look.
- **Properties:** `_EmissionColor` (HDR), `_EmissionSelfGlow` (off = 0), `_EmissionMap`.
- **Mobile:** LIMIT — without Bloom, values above 1 only clip. Bloom costs a full-screen chain; keep it low-resolution or fake the glow with Rim/Hit.

### HOLOGRAM — Hologram
- **Keyword:** `_HOLOGRAM_ON`.
- **Cost:** ALU-m (two `pow`, frac), no textures.
- **Needs:** a Transparent or Additive render preset for the lines to show.
- **Properties:** `_HologramColor` (HDR), `_HologramLineDirection`, `_HologramFrequency`, `_HologramScrollSpeed`, `_HologramAlpha`, `_HologramBaseAlpha`, `_HologramAccent*`, `_HologramLineCenter`, `_HologramLineSpacing`, `_HologramLineSmoothness`.
- **Mobile:** LIMIT — implies blended overdraw.

### MATCAP — Matcap
- **Keyword:** `_MATCAP_ON`, `_MATCAPBLENDMODE_MULTIPLY/REPLACE`.
- **Cost:** T+1 plus matrix math.
- **Properties:** `_MatcapTex`, `_MatcapIntensity`, `_MatcapBlend` (off = 0).
- **Mobile:** OK — the preferred stand-in for reflections and specular.

### HIT — Hit
- **Keyword:** `_HIT_ON`.
- **Cost:** ALU-s (one `lerp`).
- **Properties:** `_HitColor`, `_HitGlow` (multiplier, 0–100), `_HitBlend` (off = 0).
- **Mobile:** OK. Runs after lighting, so the flash color is not shaded. Drive `_HitBlend` from code.

### CONTRAST_BRIGHTNESS — Contrast and Brightness
- **Keyword:** `_CONTRAST_BRIGHTNESS_ON`.
- **Cost:** ALU-s.
- **Properties:** `_Contrast` (neutral 1), `_Brightness` (neutral 0).
- **Mobile:** OK.

### HEIGHT_GRADIENT — Height Gradient
- **Keyword:** `_HEIGHT_GRADIENT_ON`, `_HEIGHTGRADIENTPOSITIONSPACE_LOCAL/WORLD`.
- **Cost:** ALU-s.
- **Properties:** `_MinGradientHeight`, `_MaxGradientHeight`, `_GradientHeightColor01`, `_GradientHeightColor02` (both HDR; multiplies the base color).
- **Mobile:** OK.

### INTERSECTION_GLOW — Intersection Glow
- **Keyword:** `_INTERSECTION_GLOW_ON`.
- **Cost:** DEPTH.
- **Needs:** URP Depth Texture (URP asset or camera).
- **Properties:** `_DepthGlowDist`, `_DepthGlowPower`, `_DepthGlowColor`, `_DepthGlowColorIntensity`, `_DepthGlowGlobalIntensity`.
- **Mobile:** AVOID — enabling the depth texture costs the whole camera. Use `RIM_LIGHTING` for shield edges.

### ALBEDO_VERTEX_COLOR — Albedo From Vertex Color
- **Keyword:** `_ALBEDO_VERTEX_COLOR_ON`, `_ALBEDOVERTEXCOLORMODE_MULTIPLY/REPLACE` (default Replace).
- **Cost:** ALU-s.
- **Needs:** vertex colors in the mesh.
- **Properties:** `_VertexColorBlending`.
- **Mobile:** OK. `Replace` ignores the texture; `Multiply` tints it.

### TRIPLANAR_MAPPING — Triplanar Mapping
- **Keyword:** `_TRIPLANAR_MAPPING_ON`, `_TRIPLANARNORMALSPACE_LOCAL/WORLD`, `_TRIPLANAR_NOISE_TRANSITION_ON`.
- **Cost:** T+4 (front, side, top, down); +4 normal-map samples; every lookup ×3 with Stochastic Sampling.
- **Needs:** `_TriplanarTopTex`, `_TriplanarTopNormalMap`; incompatible with Screen Space UV.
- **Properties:** `_TopNormalStrength`, `_FaceDownCutoff`, `_TriplanarSharpness`, `_TriplanarNoiseTex`, `_TriplanarTransitionPower`.
- **Mobile:** AVOID — bake the texturing into UVs or vertex colors instead.

### TEXTURE_BLENDING — Texture Blending
- **Keyword:** `_TEXTURE_BLENDING_ON`, `_TEXTUREBLENDINGSOURCE_VERTEXCOLOR/TEXTURE`, `_TEXTUREBLENDINGMODE_RGB/BLACKANDWHITE`.
- **Cost:** T+2 (RGB) or T+1 (B/W), +1 for a texture mask, plus samples for every normal map involved.
- **Properties:** `_BlendingTextureG/B/White`, `_BlendingNormalMapG/B/White`, `_TexBlendingMask`, `_BlendingMaskCutoff*`, `_BlendingMaskSmoothness*`.
- **Mobile:** AVOID — pre-blend in the texture.

### DEPTH_COLORING — Depth Coloring
- **Keyword:** `_DEPTH_COLORING_ON`.
- **Cost:** T+1 (global gradient) + ALU-s; sets the scene-depth define (see the depth note).
- **Needs:** `DepthColoringCamera` on the camera and an `AllIn1DepthColoringProperties` asset (`Create > AllIn13DShader > Others > Depth Coloring Properties`); `ApplyValues()` writes `global_MinDepth`, `global_DepthZoneLength`, `global_DepthGradientFallOff`, `global_DepthGradient`.
- **Mobile:** LIMIT — one global gradient is cheap; the depth define is the risk.

### SUBSURFACE_SCATTERING — Fake Subsurface Scattering
- **Keyword:** `_SUBSURFACE_SCATTERING_ON`.
- **Cost:** T+1 + ALU-m.
- **Properties:** `_SSSMap`, `_SSSColor` (HDR), `_SSSPower`, `_SSSFrontPower`, `_SSSFrontAtten`, `_SSSAtten`, `_NormalInfluence`.
- **Mobile:** LIMIT — hero foliage or skin only.

---

## Alpha

### ALPHA_CUTOFF — Alpha Cutoff
- **Keyword:** `_ALPHA_CUTOFF_ON` (default on; the Opaque preset enables it).
- **Cost:** `clip`.
- **Properties:** `_AlphaCutoffValue`.
- **Mobile:** OK. The only transparency method for Opaque objects. Turn it **off** on fully solid meshes: `discard` can reduce tile-based early-rejection efficiency (general GPU note).

### FADE — Fade
- **Keyword:** `_FADE_ON`, `_FADEUVSET_UV1/UV2/WORLD_SPACE`, `_FADE_BURN_ON`.
- **Cost:** T+1 + ALU-s.
- **Needs:** `_FadeTex` noise; UV2 needs a second UV set on the mesh.
- **Properties:** `_FadeAmount` (0 = visible, off), `_FadePower`, `_FadeTransition`, `_FadeBurnColor` (HDR), `_FadeBurnWidth`.
- **Mobile:** OK — on an Opaque material with Alpha Cutoff it dissolves without blending.

### INTERSECTION_FADE — Intersection Fade
- **Keyword:** `_INTERSECTION_FADE_ON`.
- **Cost:** DEPTH.
- **Properties:** `_IntersectionFadeFactor`.
- **Mobile:** AVOID (Depth Texture).

### ALPHA_ROUND — Alpha Round
- **Keyword:** `_ALPHA_ROUND_ON`.
- **Cost:** ALU-s. No properties.
- **Mobile:** OK.

### FADE_BY_CAM_DISTANCE — Fade By Cam Distance
- **Keyword:** `_FADE_BY_CAM_DISTANCE_ON`, `_FADE_BY_CAM_DISTANCE_NEAR_FADE`.
- **Cost:** ALU-s.
- **Properties:** `_MinDistanceToFade`, `_MaxDistanceToFade`. Its normalized factor also scales Dither.
- **Mobile:** OK.

### DITHER — Dither
- **Keyword:** `_DITHER_ON`.
- **Cost:** ALU-s; sets the scene-depth define.
- **Properties:** `_DitherScale`.
- **Mobile:** LIMIT — pair with Alpha Cutoff on Opaque and Fade By Cam Distance for a screen-door fade.

---

## Mesh

### VERTEX_SHAKE — Vertex Shake
- **Keyword:** `_VERTEX_SHAKE_ON`. **Cost:** VTX (3 `sin`).
- **Properties:** `_ShakeSpeed`, `_ShakeSpeedMult`, `_ShakeMaxDisplacement`, `_ShakeBlend` (off = 0).
- **Mobile:** OK.

### VERTEX_INFLATE — Vertex Inflate
- **Keyword:** `_VERTEX_INFLATE_ON`. **Cost:** VTX.
- **Properties:** `_MinInflate`, `_MaxInflate`, `_InflateBlend` (off = 0); the offset is `lerp(min, max, blend)`.
- **Mobile:** OK.

### VERTEX_DISTORTION — Vertex Distortion
- **Keyword:** `_VERTEX_DISTORTION_ON`. **Cost:** VTF.
- **Properties:** `_VertexDistortionNoiseTex`, `_VertexDistortionAmount` (off = 0), `_VertexDistortionNoiseSpeedX/Y`.
- **Mobile:** LIMIT.

### VOXELIZE — Voxelize
- **Keyword:** `_VOXELIZE_ON`. **Cost:** VTX.
- **Properties:** `_VoxelSize`, `_VoxelBlend` (off = 0).
- **Mobile:** OK.

### GLITCH — Glitch
- **Keyword:** `_GLITCH_ON`. **Cost:** VTX (several noise calls).
- **Properties:** `_GlitchAmount` (off = 0), `_GlitchTiling`, `_GlitchSpeed`, `_GlitchOffset`, `_GlitchWorldSpace`.
- **Mobile:** LIMIT — short-lived effects only.

### RECALCULATE_NORMALS — Recalculate Normals
- **Keyword:** `_RECALCULATE_NORMALS_ON`. **Cost:** VTX ×3 (vertex effects evaluated for two extra neighbour points).
- **Needs:** tangents.
- **Mobile:** AVOID.

### WIND — Wind
- **Keyword:** `_WIND_ON`, `_USE_WIND_VERTICAL_MASK`. **Cost:** VTF.
- **Needs:** `WindController` in the scene (globals `global_windNoiseTex`, `global_windForce`, `global_noiseSpeed`, `global_useWindDir`, `global_windDir`, `global_minWindValue`, `global_maxWindValue`, `global_windWorldSize`); a noise texture.
- **Properties:** `_WindAttenuation` (off = 0), `_WindVerticalMaskMinY`, `_WindVerticalMaskMaxY` (object-space Y). The vertical component of the displacement is zeroed.
- **Mobile:** LIMIT. Without a controller the globals are unset and nothing moves.

---

## UV

### SCROLL_TEXTURE — Scroll Texture
- **Keyword:** `_SCROLL_TEXTURE_ON`. **Cost:** ALU-s (vertex stage).
- **Properties:** `_ScrollTextureX`, `_ScrollTextureY`. **Mobile:** OK.

### SCREEN_SPACE_UV — Screen Space UV
- **Keyword:** `_SCREEN_SPACE_UV_ON`. **Cost:** ALU-s; sets the scene-depth define.
- **Properties:** `_ScaleWithCameraDistance`. Incompatible with Triplanar. **Mobile:** LIMIT.

### PIXELATE — Pixelate
- **Keyword:** `_PIXELATE_ON`. **Cost:** ALU-s; a fragment-stage UV change.
- **Properties:** `_PixelateSize`. **Mobile:** OK.

### STOCHASTIC_SAMPLING — Stochastic Sampling
- **Keyword:** `_STOCHASTIC_SAMPLING_ON`. **Cost:** every covered texture lookup becomes 3 samples plus derivatives.
- **Properties:** `_StochasticScale`, `_StochasticSkew`. **Mobile:** AVOID.

### WAVE_UV — Wave UV
- **Keyword:** `_WAVE_UV_ON`. **Cost:** ALU-m; a fragment-stage UV change.
- **Properties:** `_WaveAmount`, `_WaveSpeed`, `_WaveStrength` (off = 0), `_WaveX`, `_WaveY`. **Mobile:** LIMIT.

### HAND_DRAWN — Hand Drawn
- **Keyword:** `_HAND_DRAWN_ON`. **Cost:** ALU-s (vertex stage).
- **Properties:** `_HandDrawnAmount`, `_HandDrawnSpeed`. **Mobile:** OK.

### UV_DISTORTION — Distortion
- **Keyword:** `_UV_DISTORTION_ON`. **Cost:** T+1; the displacement happens before the main texture read, which makes that read dependent.
- **Properties:** `_DistortTex`, `_DistortAmount` (off = 0), `_DistortTexXSpeed`, `_DistortTexYSpeed`. **Mobile:** LIMIT.

---

## Other

### OUTLINETYPE — Outline Type
- **Keyword:** `_OUTLINETYPE_NONE/SIMPLE/CONSTANT/FADEWITHDISTANCE`. **Cost:** PASS — a second draw of the mesh pushed along its normals, `Cull Front`.
- **Needs:** an `…Outline…` generic shader (the inspector selects it), the two `Render Objects` renderer features for `LightMode = OutlinePass`, smooth normals (or Flat Normals) on hard-edged meshes. The main pass of outline shaders writes stencil `_StencilRef`.
- **Properties:** `_OutlineColor` (HDR), `_OutlineThickness`, `_OutlineMode` (`Basic` = 8 Always, `Clean` = 6 NotEqual via stencil), `_MaxCameraDistance` (Constant), `_MaxFadeDistance` (FadeWithDistance).
- **Mobile:** LIMIT — a few objects. Toggle at runtime with `Material.SetShaderPassEnabled("OutlinePass", …)` (by LightMode value).

---

## Advanced configuration

### ADV — Advanced configuration (every material, "Show Advanced Configuration")
| Property | Name / keyword | Notes |
|---|---|---|
| Render Preset | `_RenderPreset` | Opaque (queue 2000, `One/Zero`, ZWrite on, enables Alpha Cutoff) · Transparent (3000, `SrcAlpha/OneMinusSrcAlpha`, ZWrite off) · Additive (3000, `One/One`, ZWrite off) |
| Blend Source / Destination | `_BlendSrc`, `_BlendDst` | Unity `BlendMode` enum |
| Culling Mode | `_CullingMode` | Default Back (2); `Off` shades back faces too |
| Depth Write, Z Test, Color Write Mask | `_ZWrite`, `_ZTestMode`, `_ColorMask` | Defaults 1, LessEqual (4), All (15) |
| Fog On | `_FOG_ON` | Needs the Fog support define in URP Settings |
| Spherize Normals | `_SPHERIZE_NORMALS_ON` | Normals taken from the normalized vertex position; near-spherical meshes only |
| Use Custom Time | `_USE_CUSTOM_TIME` | Time comes from the global `allIn13DShader_globalTime`; needs `ShaderGlobalTimeController` |
| Enable GPU Instancing | material checkbox | Needs the GPU Instancing define; moot while the SRP Batcher handles the draws |
| Render Queue | material | 0–2500 opaque, 2501–3000 transparent, 3001+ overlays |
| Stencil Reference | `_StencilRef` (1–255) | Outline shaders only; the main pass writes it, the outline pass tests it |

## Depth-texture note

`Intersection Glow` and `Intersection Fade` truly consume scene depth. `Screen Space UV`, `Depth Coloring` and `Dither`
only raise the same `REQUIRE_SCENE_DEPTH` define, which declares the URP depth texture and samples it in the fragment
stage; whether the compiler drops an unused sample was not verified. Treat all five as depth-texture dependent while the
URP asset's Depth Texture is off, and confirm on device (the Frame Debugger shows the depth copy pass).
