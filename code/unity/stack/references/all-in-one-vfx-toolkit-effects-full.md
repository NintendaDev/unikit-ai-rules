# All In One VFX Toolkit — Effects full reference

> **Base path:** `<AllIn1Root>` is the asset folder — the one that contains `AllIn1VfxAssemebly.asmdef` (find it with `Glob **/AllIn1VfxAssemebly.asmdef`; never hard-code its location). Property names live in the `Properties` block of `<AllIn1Root>/Shaders/AllIn1Vfx.shader`; the same names are used by `AllIn1VfxSRPBatch`, `AllIn1VfxDOTS`, `AllIn1VfxBuiltIn`, `AllIn1VfxGrabPass` and (mostly) `AllIn1VfxLit`.
> See also: [all-in-one-vfx-toolkit-effects-quickref.md](all-in-one-vfx-toolkit-effects-quickref.md) (one line per effect — start there), [all-in-one-vfx-toolkit-runtime-scripting.md](all-in-one-vfx-toolkit-runtime-scripting.md) (driving properties from code)

Do not read this file top to bottom. Find the effect ID in the quick reference, then
`Grep "^### <ID> " -A 10` here. Costs come from reading the shader code (v2.32), not from device measurements.

**Cost legend.** `ALU-s` a few multiply-adds · `ALU-m` several `pow`/`sin`/`cos`/`sqrt`/`atan2`/divides · `T+n` n extra
texture samples per pixel · `DEP` that sample is *dependent* (its UV comes from another sample or a heavy calculation)
· `DEPTH` reads the camera depth texture · `SCREEN` reads the opaque/grab scene colour · `VTX` vertex-stage maths ·
`VTF` vertex texture fetch · `INTERP` adds interpolators · `DISCARD` uses `clip`.
All effects run in the fragment stage unless `VTX` is listed. A disabled effect is not compiled and costs nothing.
"Off value" is the property value that makes an enabled effect invisible (use it to switch effects at runtime instead of
toggling keywords — see the runtime-scripting reference).

---

## Processing order

1. Shapes: shape 1, then `SHAPE2`/`SHAPE3`, each with its own contrast, distortion and rotation, are combined
   (multiplied by default, added with `SHAPEADD`, weights per shape).
2. UV effects change the coordinates of **every** texture, including the shapes: `DISTORT`, `POLARUV`, `TWISTUV`,
   `WAVEUV`, `ROUNDWAVEUV`, `DOODLE`, `PIXELATE`, `SHAKEUV`, `TEXTURESCROLL`, `SHAPETEXOFFSET`, `OFFSETSTREAM`.
3. Colour effects act on the RGB of the combined result; alpha effects on its alpha.
4. Pipeline-bound effects (`SOFTPART`, `DEPTHGLOW`, `SCREENDISTORTION`, `FOG`) are applied last.
5. Blend preset and render state (queue, ZWrite, cull) decide how the result enters the frame.
Because UV effects and distortions are applied before the other effects, putting a heavy UV effect on a material means
all later texture reads pay for it.

## Keyword families

- 64 `shader_feature_local` keywords per main shader (the local cap is fully used) plus 3 global `shader_feature`:
  `ALPHAFADETRANSPARENCYTOO_ON`, `ALPHAFADEINPUTSTREAM_ON`, `CAMDISTFADE_ON`.
- Blend/colour mode: `TIMEISCUSTOM_ON`, `ADDITIVECONFIG_ON`, `PREMULTIPLYALPHA_ON`, `PREMULTIPLYCOLOR_ON`, `SPLITRGBA_ON`, `SHAPEADD_ON`.
- Pipeline-bound: `FOG_ON`, `SCREENDISTORTION_ON`, `DISTORTUSECOL_ON`, `DISTORTONLYBACK_ON`, `SOFTPART_ON`, `DEPTHGLOW_ON`, `SHAPE1/2/3SCREENUV_ON`.
- Per shape (n = 1..3; shape 2/3 also have `SHAPE2_ON`/`SHAPE3_ON`): `SHAPEnCONTRAST_ON`, `SHAPEnDISTORT_ON`, `SHAPEnROTATE_ON`, `SHAPEnSHAPECOLOR_ON`.
- Colour: `GLOW_ON`, `GLOWTEX_ON`, `COLORRAMP_ON`, `COLORRAMPGRAD_ON`, `COLORGRADING_ON`, `HSV_ON`, `POSTERIZE_ON`, `RIM_ON`, `BACKFACETINT_ON`, `LIGHTANDSHADOW_ON`, `MASK_ON`, `SHAPE1MASK_ON`.
- Alpha: `ALPHACUTOFF_ON`, `ALPHASMOOTHSTEP_ON`, `FADE_ON`, `FADEBURN_ON`, `ALPHAFADE_ON`, `ALPHAFADEUSESHAPE1_ON`, `ALPHAFADEUSEREDCHANNEL_ON`.
- UV/vertex: `DISTORT_ON`, `POLARUV_ON`, `POLARUVDISTORT_ON`, `PIXELATE_ON`, `SHAKEUV_ON`, `WAVEUV_ON`, `ROUNDWAVEUV_ON`, `TWISTUV_ON`, `DOODLE_ON`, `TEXTURESCROLL_ON`, `VERTOFFSET_ON`, `TRAILWIDTH_ON`, `SHAPETEXOFFSET_ON`, `OFFSETSTREAM_ON`, `SHAPEWEIGHTS_ON`.
- `SHAPEDEBUG_ON` is authoring-only. `NORMALMAP_ON` exists only in the Lit shader (global there).
- `AllIn1Vfx.shader` (the base shader) **declares but ignores** `FOG_ON`, `SOFTPART_ON`, `DEPTHGLOW_ON`,
  `SCREENDISTORTION_ON` and `SHAPE_N_SCREENUV_ON`: toggling them does nothing there. Which shader implements what:
  see `all-in-one-vfx-toolkit-shaders-and-variants.md`.

## Vertex-stream rows

Particle Custom Data after `Custom Data Auto Setup`: row 1 = random timing seed (`_TimingSeed`, X, range 0–100); row 2 = fade
amount (shared by `FADE` and `ALPHAFADE`, use one); rows 3–4 = texture offset X/Y (`OFFSETSTREAM`); row 5 = shape weight
offset (`SHAPEWEIGHTS`, only with 2+ shapes). A missing row means the effect that uses it is off on the material.
Vertex layout in the shader: `TEXCOORD0.z` seed (Custom1.x), `TEXCOORD0.w` fade input (Custom1.y), `TEXCOORD1.xy` offset
(Custom2.xy), `TEXCOORD1.z` weight offset (Custom2.z); vertex-colour alpha drives dissolve amount.

---

## Base, shapes and combination

### SHAPE1 — Shape 1 (always on)
- **Properties:** `_MainTex` (+ tiling/offset), `_ShapeColor` (HDR tint), `_ShapeXSpeed`, `_ShapeYSpeed`, `_ShapeColorWeight`, `_ShapeAlphaWeight`; global `_Color` (tint) and `_Alpha`.
- **Cost:** `T+1`, two `fmod` for scroll — LOW. **Needs:** texture with **Wrap Mode = Repeat** (scroll uses `% 1`; clamped textures smear).
- **Notes:** `_MainTex` is assigned automatically on Sprite Renderers and UI Images. Scroll speed higher = faster.

### SHAPE2 / SHAPE3 — Extra shapes
- **Keyword:** `SHAPE2_ON`, `SHAPE3_ON`. **Properties:** `_Shape2Tex`, `_Shape2Color`, `_Shape2XSpeed`, `_Shape2YSpeed`, `_Shape2ColorWeight`, `_Shape2AlphaWeight`; same with `Shape3`.
- **Cost:** `T+1` each, LOW each. **Needs:** textures (noise/masks tile best).
- **Notes:** combined multiplicatively by default; weights tune influence. Shape 2/3 sub-features keep the number in the keyword.

### SHAPE_N_CONTRAST — Shape contrast / brightness
- **Keyword:** `SHAPEnCONTRAST_ON`. **Properties:** `_ShapeContrast`, `_ShapeBrightness` (shape 1; `_Shape2Contrast`, … for others).
- **Cost:** `ALU-s`. **Notes:** high contrast = punchier, low = flatter.

### SHAPE_N_DISTORT — Per-shape distortion
- **Keyword:** `SHAPEnDISTORT_ON`. **Properties:** `_ShapeDistortTex` (`_Shape2DistortTex`…), `_ShapeDistortAmount`, `_ShapeDistortXSpeed`, `_ShapeDistortYSpeed`.
- **Cost:** `T+1 DEP`, `INTERP` (a `half2` each) — MEDIUM each; three stacked add three dependent reads.
- **Needs:** noise texture (Repeat). **Notes:** distorts one shape only; `DISTORT` distorts all.

### SHAPE_N_ROTATE — Shape rotation
- **Keyword:** `SHAPEnROTATE_ON`. **Properties:** `_ShapeRotationOffset` (radians, applied before the timed rotation), `_ShapeRotationSpeed` (radians).
- **Cost:** `sin`+`cos` per shape — LOW-MEDIUM (x3 with all shapes).

### SHAPE_N_SHAPECOLOR — Red channel is alpha
- **Keyword:** `SHAPEnSHAPECOLOR_ON`. **Notes:** the texture's red channel becomes alpha, RGB comes from `Shape Color`. Use for single-channel greyscale masks; saves memory because the source can be one channel.
- **Cost:** `ALU-s`.

### SHAPE_N_SCREENUV — Screen-position UVs
- **Keyword:** `SHAPEnSCREENUV_ON`. **Properties:** `_ScreenUvShDistScale` (shape 1), `_ScreenUvSh2DistScale`, `_ScreenUvSh3DistScale`: 1 = texture keeps constant size regardless of distance, 0 = it scales with distance.
- **Cost:** `INTERP` (screen pos + world pos), `distance`, perspective divide — LOW-MEDIUM; no texture. Implemented only in `AllIn1VfxBuiltIn`, `AllIn1VfxGrabPass`, `AllIn1VfxSRPBatch`, `AllIn1VfxDOTS`, the URP shader and Lit — **ignored by `AllIn1Vfx`**.
- **Notes:** world position is stored as `half4` in the CG shaders, so far-from-origin objects lose precision.

### SHAPEADD — Add shape results
- **Keyword:** `SHAPEADD_ON`. Add instead of multiply; the weight sliders only appear with more than one shape. **Cost:** `ALU-s`.

### SPLITRGBA — Split colour/alpha weights
- **Keyword:** `SPLITRGBA_ON`. Separate `_Shape*ColorWeight` and `_Shape*AlphaWeight`. **Cost:** `ALU-s`.
- **Notes:** in the SRP-batch/DOTS shaders there is a copy-paste bug in the shape-3 weight code — `SPLITRGBA` has no effect for shape 3 there (the CG shaders are correct).

### SHAPE1MASK — Shape 1 mask
- **Keyword:** `SHAPE1MASK_ON`. **Properties:** `_Shape1MaskTex` (white = keep shape 1 intact, black = keep the combined result), `_Shape1MaskPow`.
- **Cost:** `T+1`, `pow` — LOW-MEDIUM. **Notes:** keeps a trail's main shape from being warped by other shapes/distortions.

### SHAPEDEBUG — Shape debug
- **Keyword:** `SHAPEDEBUG_ON`. Renders only the shape whose debug toggle is on. Authoring aid; confirm it is off before shipping.

---

## Colour

### GLOW — Glow
- **Keyword:** `GLOW_ON` (+ `GLOWTEX_ON`). **Properties:** `_GlowColor` (HDR), `_Glow` (intensity of the glow colour), `_GlowGlobal` (brightness of the global result), `_GlowTex` (alpha mask: glow only where its alpha > 0).
- **Cost:** `ALU-s` (`GLOWTEX`: `T+1`). **Needs:** values above 1 only show as glow with an HDR target **and** Bloom post-processing.
- **Mobile:** without Bloom this is just a brightness boost; do not enable Bloom only for this (see mobile reference).

### COLORRAMP — Color Ramp
- **Keyword:** `COLORRAMP_ON` (+ `COLORRAMPGRAD_ON` for the live gradient). **Properties:** `_ColorRampTex`, `_ColorRampTexGradient` (live gradient — material must be saved as an asset, toggle `Use Editable Gradient`), `_ColorRampLuminosity` (shifts which part of the gradient is hit), `_ColorRampBlend` (0 = invisible).
- **Cost:** `T+1 DEP` (UV = computed luminance), luminance dot — MEDIUM. **Notes:** the gradient is a tiny texture; 64×1 bilinear is enough. Unused gradient textures stay embedded in the material until `Assets/AllIn1Vfx Gradients/Remove All Gradient Textures` is run.

### COLORGRADING — Color Grading
- **Keyword:** `COLORGRADING_ON`. **Properties:** `_ColorGradingLight`, `_ColorGradingMiddle`, `_ColorGradingDark`, `_ColorGradingMidPoint` (skews toward light or dark).
- **Cost:** two `lerp`, `step`, divides — LOW-MEDIUM; the vendor calls it "more lightweight" than Color Ramp.

### HSV — Hue shift and saturation
- **Keyword:** `HSV_ON`. **Properties:** `_HsvShift`, `_HsvSaturation`, `_HsvBright`. **Cost:** ~9 MAD — LOW-MEDIUM.
- **Notes:** recolour a whole effect family from one set of textures; a cheaper alternative to duplicating textures.

### POSTERIZE — Posterize
- **Keyword:** `POSTERIZE_ON`. **Properties:** `_PosterizeNumColors` (higher = more colours). **Cost:** `floor` + divides — LOW.

### RIM — Fresnel / Rim colour
- **Keyword:** `RIM_ON`. **Properties:** `_RimColor` (HDR), `_RimBias`, `_RimScale`, `_RimPower`, `_RimIntensity`, `_RimAddAmount` (0 = multiplied against the shape result, 1 = always visible), `_RimErodesAlpha`.
- **Cost:** `pow`; normal + view-direction interpolators (6 halves) — LOW-MEDIUM. **Needs:** `mesh` with normals (no use on flat quads).
- **Notes:** `_RimErodesAlpha` up with `_RimIntensity` 0 fades a model's rim.

### BACKFACETINT — Backface tint
- **Keyword:** `BACKFACETINT_ON`. **Properties:** `_BackFaceTint` (HDR), `_FrontFaceTint` (usually white).
- **Cost:** LOW, but it relies on back faces being drawn — default `Cull Off` doubles the pixels of closed meshes.
- **Needs:** mesh with visible back faces.

### LIGHTANDSHADOW — Fake light and shadow
- **Keyword:** `LIGHTANDSHADOW_ON`. **Properties:** `_LightAmount` (0 none, 1 full), `_LightColor`, `_ShadowAmount` (0 black, 1 invisible), `_ShadowStepMin`, `_ShadowStepMax` (closer together = more cartoon); global `_All1VfxLightDir`.
- **Cost:** `dot`, `smoothstep`, normal/view interpolators — LOW. **Needs:** `AllIn1VfxFakeLightDirSetter` in the scene (sets the global light direction).
- **Notes:** not real lighting; ignores Unity lights. **Caveat:** in `AllIn1VfxSRPBatch`/`DOTS` the light direction is also a per-material property — the global set by the component probably does not reach it (inferred from the shader source; verify, or set it with `Material.SetVector("_All1VfxLightDir", …)`). Commented out in the Lit shader.

### MASK — Alpha mask
- **Keyword:** `MASK_ON`. **Properties:** `_MaskTex` (white = unchanged, black = invisible), `_MaskPow`. **Cost:** `T+1`, `pow` — LOW-MEDIUM.

### DEPTHGLOW — Intersection glow
- **Keyword:** `DEPTHGLOW_ON`. **Properties:** `_DepthGlowDist` (higher = sharper), `_DepthGlowPow`, `_DepthGlowColor` (HDR), `_DepthGlow`, `_DepthGlowGlobal`.
- **Cost:** `DEPTH`, `pow`, `LinearEyeDepth` — shader cost LOW-MEDIUM, **pipeline cost HIGH on mobile** (forces the camera depth texture).
- **Needs:** URP *Depth Texture* on the pipeline asset **of every quality level that uses it**; the toolkit never enables it. ZWrite should be off on this material; the intersecting geometry must write depth (see the depth-pass note in the shaders reference: toolkit materials themselves never enter the depth texture). Bloom for the glow look.
- **Mobile:** AVOID. Substitute `RIM` for shield edges.

---

## Alpha

### FADE — Fade from noise texture (dissolve)
- **Keyword:** `FADE_ON` (+ `FADEBURN_ON`, `ALPHAFADEINPUTSTREAM_ON`, `ALPHAFADETRANSPARENCYTOO_ON`). **Properties:** `_FadeTex`, `_FadeAmount` (-0.1 none … 1 fully faded), `_FadeTransition`, `_FadePower`, `_FadeScrollXSpeed`, `_FadeScrollYSpeed`; burn edge `_FadeBurnTex`, `_FadeBurnColor` (HDR), `_FadeBurnWidth`, `_FadeBurnGlow`.
- **Cost:** `T+1` (`T+2` with burn), two `pow`, `smoothstep` — MEDIUM (`FADEBURN` MEDIUM-HIGH). Dissolved pixels are still shaded at alpha 0 unless `ALPHACUTOFF` is also on.
- **Needs:** noise texture; for stream-driven fade the Particle System Custom Data (`Fade Amount Driven By Vertex Stream` toggle, only visible on particle materials); Bloom for burn glow.
- **Notes:** with `FADE`/`ALPHAFADE` the vertex-colour alpha drives the dissolve amount instead of multiplying the output — do not start particles below alpha 1 unless the stream is used. Off value: `_FadeAmount` = -0.1.

### ALPHAFADE — Fade from final shape (procedural dissolve)
- **Keyword:** `ALPHAFADE_ON` (+ `ALPHAFADEUSESHAPE1_ON` use shape 1 as the mask, `ALPHAFADEUSEREDCHANNEL_ON` use grayscale as alpha for additive setups). **Properties:** `_AlphaFadeAmount` (-0.1 … 1), `_AlphaFadeSmooth`, `_AlphaFadePow`.
- **Cost:** two `pow`, `smoothstep` — MEDIUM, one texture fewer than `FADE`. Same stream rules as `FADE`.

### SOFTPART — Soft particles / intersection fade
- **Keyword:** `SOFTPART_ON`. **Properties:** `_SoftFactor` (higher = thinner transition).
- **Cost:** `DEPTH`, `LinearEyeDepth`, projective-position interpolator — shader LOW-MEDIUM, pipeline cost HIGH on mobile. **Needs:** URP *Depth Texture*. **Implemented** in `AllIn1VfxBuiltIn`, `AllIn1VfxGrabPass`, `AllIn1VfxSRPBatch`, `AllIn1VfxDOTS`, the URP shader — **not** in `AllIn1Vfx` or Lit. Not supported by the URP 2D Renderer.
- **Mobile:** AVOID; use `CAMDISTFADE` or shaped alpha instead.

### CAMDISTFADE — Camera distance fade
- **Keyword:** `CAMDISTFADE_ON` (global keyword). **Properties:** `_CamDistFadeStepMin` (far fade start), `_CamDistFadeStepMax` (far fade end), `_CamDistProximityFade` (close fade start).
- **Cost:** `distance`, two `smoothstep`, `half4` world position interpolator — LOW-MEDIUM. **Notes:** the default proximity value 0 gives a zero-width edge; set it explicitly.

### ALPHASMOOTHSTEP — Alpha remap
- **Keyword:** `ALPHASMOOTHSTEP_ON`. **Properties:** `_AlphaStepMin`, `_AlphaStepMax`. **Cost:** one `smoothstep` — LOW.

### ALPHACUTOFF — Alpha cutoff
- **Keyword:** `ALPHACUTOFF_ON`. **Properties:** `_AlphaCutoffValue`. **Cost:** `DISCARD` — LOW ALU.
- **Notes:** the inspector hint says it "clips transparent pixels and reduces overdraw". It removes blending work for the clipped pixels but the shader still runs up to the `clip`; on opaque/ZWrite materials discard disables some early-depth benefits.

---

## UV and vertex

### DISTORT — Global distortion
- **Keyword:** `DISTORT_ON`. **Properties:** `_DistortTex`, `_DistortAmount`, `_DistortTexXSpeed`, `_DistortTexYSpeed`. **Cost:** `T+1 DEP`, applied before all shapes — MEDIUM. **Needs:** noise texture.

### TEXTURESCROLL — Global texture scroll
- **Keyword:** `TEXTURESCROLL_ON`. **Properties:** `_TextureScrollXSpeed`, `_TextureScrollYSpeed`. **Cost:** `fmod` — LOW.

### POLARUV — Polar coordinates
- **Keyword:** `POLARUV_ON` (+ `POLARUVDISTORT_ON`). **Cost:** `atan2` + `length` + divide — MEDIUM. **Notes:** UVs jump at the `atan2` seam, so a thin seam or blurry mip line can appear; mask uses the pre-polar UV.

### TWISTUV — Twist
- **Keyword:** `TWISTUV_ON`. **Properties:** `_TwistUvAmount`, `_TwistUvPosX` (0 left … 1 right), `_TwistUvPosY` (0 bottom … 1 top), `_TwistUvRadius`. **Cost:** two `sqrt`, three `sin`, `cos` — MEDIUM-HIGH ALU only.

### WAVEUV — Wave
- **Keyword:** `WAVEUV_ON`. **Properties:** `_WaveAmount`, `_WaveSpeed`, `_WaveStrength`, `_WaveX`, `_WaveY` (origin 0–1). **Cost:** `sqrt`, `normalize`, `sin`, `% 360` — MEDIUM.

### ROUNDWAVEUV — Round wave
- **Keyword:** `ROUNDWAVEUV_ON`. **Properties:** `_RoundWaveStrength`, `_RoundWaveSpeed`. **Cost:** `sqrt`, `sin`, divide — MEDIUM.

### DOODLE — Hand drawn
- **Keyword:** `DOODLE_ON`. **Properties:** `_HandDrawnAmount`, `_HandDrawnSpeed` (how often textures re-distort). **Cost:** `floor`, `sin`, `cos` — LOW-MEDIUM.

### PIXELATE — Pixelate
- **Keyword:** `PIXELATE_ON`. **Properties:** `_PixelateSize` (lower = more pixelated). **Cost:** `floor` + divide — LOW. **Notes:** looks bad combined with distortions (vendor warning); block edges make mip selection jump.

### SHAKEUV — Shake
- **Keyword:** `SHAKEUV_ON`. **Properties:** `_ShakeUvSpeed`, `_ShakeUvX`, `_ShakeUvY`. **Cost:** `sin`/`cos` — LOW.

### TRAILWIDTH — Trail width
- **Keyword:** `TRAILWIDTH_ON`. **Properties:** `_TrailWidthGradient` (black = scale 0, white = max width), `_TrailWidthPower`.
- **Cost:** `T+1 DEP`, `pow`, two `clip` — MEDIUM. **Needs:** material saved as an asset (the gradient is a sub-asset), Trail Renderer with a **constant** width curve (the gradient does the shaping).

### VERTOFFSET — Vertex offset
- **Keyword:** `VERTOFFSET_ON`. **Properties:** `_VertOffsetTex` (1 = max offset), `_VertOffsetAmount`, `_VertOffsetPower`, `_VertOffsetTexXSpeed`, `_VertOffsetTexYSpeed`.
- **Cost:** `VTX`, `VTF` (`tex2Dlod`), `pow`, two `fmod` — LOW on quads, MEDIUM on dense meshes. **Needs:** mesh with normals; vertex texture fetch support.

### SHAPETEXOFFSET — Shape texture offset (random seed)
- **Keyword:** `SHAPETEXOFFSET_ON`. **Properties:** `_RandomSh1Mult`, `_RandomSh2Mult`, `_RandomSh3Mult` (0 none … 1 full), driven by `_TimingSeed`.
- **Cost:** `ALU-s`. **Notes:** break the sync between copies of one material; the seed comes from particle Custom Data row 1 or from `All1VfxRandomTimeSeed` (an MPB — see the scripting reference for its SRP Batcher cost).

---

## Particle-stream driven

### OFFSETSTREAM — Texture offset from stream
- **Keyword:** `OFFSETSTREAM_ON`. **Properties:** `_OffsetSh1`, `_OffsetSh2`, `_OffsetSh3` (per-shape multiplier of the stream's X/Y offset; the stream carries one offset pair for all shapes).
- **Cost:** extra `TEXCOORD1` stream — LOW (more vertex bytes per particle). **Needs:** `stream`, `ps`. Visible only on materials used by a Particle System.

### SHAPEWEIGHTS — Shape weights from stream
- **Keyword:** `SHAPEWEIGHTS_ON`. **Properties:** `_Sh1BlendOffset`, `_Sh2BlendOffset`, `_Sh3BlendOffset`. Negative stream values hide a shape, positive show it more; needs 2+ shapes.
- **Cost:** LOW. **Needs:** `stream`, `ps`. **Notes:** in the SRP-batch/DOTS shaders the shape-3 weight code is wrong (see `SPLITRGBA`).

### ALPHAFADEINPUTSTREAM / ALPHAFADETRANSPARENCYTOO — Fade options
- Global keywords. `ALPHAFADEINPUTSTREAM_ON`: drive the fade amount from Custom Data (otherwise the particle alpha drives it). `ALPHAFADETRANSPARENCYTOO_ON`: global transparency also falls with the fade amount.
- **Cost:** LOW (stream = extra vertex bytes). They are `shader_feature` (global): they are the only toolkit keywords that count against the 256 global budget.

---

## Pipeline-bound and render configuration

### SCREENDISTORTION — Screen distortion
- **Keyword:** `SCREENDISTORTION_ON` (+ `DISTORTUSECOL_ON`, `DISTORTONLYBACK_ON`). **Properties:** `_DistNormalMap`, `_DistortionPower`, `_DistortionBlend`, `_DistortionScrollXSpeed`, `_DistortionScrollYSpeed`.
- **Cost:** `T+1` normal map (unless `DISTORTUSECOL_ON`) + `SCREEN` read — HIGH; `DISTORTONLYBACK_ON` adds a depth read and a second screen read ("less performant" in the inspector). The vendor calls it "potentially the most performance intensive effect in the asset, specially in the Built-In render pipeline".
- **Needs:** URP *Opaque Texture* (transparent objects are never in it), a normal map (make one with the Asset Window's Normal/Distortion Map Creator), the **Transparent** blend preset. Built-in uses `AllIn1VfxGrabPass` (an unnamed `GrabPass` per object that uses the shader, even when distortion is off — it does not run under SRP). Not supported by the URP 2D Renderer. Implemented only in the Grab-pass, SRP-batch, DOTS and URP shaders.
- **Mobile:** AVOID. If used, one distorting quad on screen at a time, small, short-lived, behind a quality-tier switch.

### FOG — Use Unity fog
- **Keyword:** `FOG_ON`. Applies the pipeline fog (no effect in HDRP, where fog is post-processing). **Cost:** fog factor interpolator — LOW. The SRP-batch/DOTS shaders compile `multi_compile_fog` unconditionally, which multiplies every variant by the fog modes.

### TIMEISCUSTOM — Use custom time
- **Keyword:** `TIMEISCUSTOM_ON` ("Use Custom Time" in Advanced Configuration). Reads the global `globalCustomTime` instead of `_Time` so effects ignore `Time.timeScale`. **Needs:** an active `SetAllIn1VfxCustomGlobalTime` in the scene — without it the global stays 0 and time-driven effects freeze. **Caveat:** in `AllIn1VfxSRPBatch`/`DOTS` `globalCustomTime` is also a per-material property; the global written by the component probably does not reach it — verify in Play Mode before relying on it.

### ADDITIVECONFIG / PREMULTIPLYALPHA / PREMULTIPLYCOLOR — Blend helpers
- Set by the blend presets; see `all-in-one-vfx-toolkit-material-configuration.md`. `ADDITIVECONFIG_ON` makes the greyscale of the result the alpha; `PREMULTIPLYALPHA_ON` multiplies alpha into colour; `PREMULTIPLYCOLOR_ON` multiplies grey into alpha. **Cost:** `ALU-s`.

### LIT — Lit shader
- Separate shader `AllIn1Vfx/AllIn1VfxLit` (generated for the active pipeline and Unity version). Writes only Albedo, Alpha (and Normal with `NORMALMAP_ON`); blend modes other than opaque do not apply (`Blend One Zero` is hard-coded) and alpha clip is always on.
- **Cost:** HIGH: seven passes in URP, and the whole procedural surface function re-runs in ShadowCaster, DepthOnly, DepthNormals and others. Raw `multi_compile` cross product is enormous before URP stripping.
- **Mobile:** AVOID for effects; it is for lit meshes that must react to lights. Details: `all-in-one-vfx-toolkit-shaders-and-variants.md`.
