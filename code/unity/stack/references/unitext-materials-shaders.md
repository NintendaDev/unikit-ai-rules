# UniText — Materials and Shaders

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location. `<LightSideCoreRoot>` is the folder of the shared core package (`package.json` name `media.lightside.core`, same lookup).
> See also: [unitext-effects-paint.md](unitext-effects-paint.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-3d-text.md](unitext-3d-text.md), [unitext-components-setup.md](unitext-components-setup.md), [unitext-animation-phase.md](unitext-animation-phase.md), [unitext-version-traps.md](unitext-version-traps.md)

---

Mobile verdicts (`OK` / `LIMIT` / `AVOID`) come from reading package source and docs. Nothing was profiled. Figures from the package docs are labelled "vendor". Assume `using LightSide;` and the main thread in C# snippets.

## 1. Lookup — "I want X, do this"

| I want | Do this |
|---|---|
| Plain text, outline, shadow, glow, gradient | Nothing to assign: all of it draws through the shared stock material. Effects are paint layers, see [unitext-effects-paint.md](unitext-effects-paint.md) |
| A material per font | There is none. Every font, SDF, MSDF and colour glyph shares one material per shader tier |
| One word in a rainbow | `MaterialModifier` with the shipped Rainbow material, tag it (§5) |
| A dissolve in/out | `MaterialModifier` with the Dissolve material; write `ConstantUv2 = (progress, scroll, 0, 0)` (§5, M3) |
| A hologram look | Hologram material plus a noise texture you assign (§3) |
| My own effect shader | `Assets -> Create -> LightSide -> UniText -> Custom Effect`; edit only the `.hlsl` (§6) |
| A per-text slider in the inspector | `[HideInInspector] _LightSideInstUv2X ("Name", Range(0,1)) = 0` in the shell (§6.6) |
| Which function do I write? | `half4 LightSideEffect(LightSideFrag i)` — not `UniTextEffect` (§6.2) |
| Noise texture for a shader | `Tools -> LightSide -> Core -> Noise Generator` (§7) |
| World-space text in a player build | Enable **Include World Shaders** in the LightSide settings, plus **Include Lit Shaders** for lit text (§9) |
| No hitch on the first outlined text | `LightSideMaterials.WarmUpUi(LightSideSurfaceTier.Text, LightSideSurfaceTier.StyledText)` on a loading screen (M6) |
| Tint a materialed range | `<mat=#FF8800>` (tint slot of `MaterialModifier`) |
| Same shader on Canvas and in the world | Two shells (Canvas and World) including one `.hlsl` (§6.1) |

## 2. The materials UniText draws with

Text draws with the process-wide shared materials of `LightSideMaterials`, one instance per shader and tier. Sharing the *instance* (not just the shader) is what lets a Canvas collapse text of one tier into one draw: uGUI batches by material and texture.

| API | What it returns |
|---|---|
| `LightSideMaterials.Ui(LightSideSurfaceTier tier)` | the Canvas material for `UniText` (shader `LightSide/UI`) |
| `LightSideMaterials.World(bool lit, LightSideSurfaceTier tier)` | the world material for `UniTextWorld` (`LightSide/World`, `LightSide/World Lit`; under HDRP the lit one is a shared Shader Graph that draws every tier) |
| `LightSideMaterials.CanvasImage` | the premultiplied image material for Canvas image presenters |
| `LightSideMaterials.WarmUpUi(params LightSideSurfaceTier[] tiers)` | compiles the Canvas programs now (M6) |

Facts: materials are created lazily on first access (main thread), hidden (`HideAndDontSave`) and kept for the application's lifetime. `Ui`/`World` throw `InvalidOperationException` if the shader is missing from the build. The three glyph atlases (`_LightSideGlyphSdf`, `_LightSideGlyphMsdf`, `_LightSideGlyphColor`) are **global shader bindings** published by the package, so no material carries an atlas in its identity and the per-glyph mode in the vertex stream (UV1.w) picks the sampler. One program therefore serves SDF, MSDF and colour glyphs. Do not edit, clone or replace these materials.

Stock shaders: `LightSide/UI` (Canvas), `LightSide/World`, `LightSide/World Lit`, `LightSide/World Lit HDRP` (Shader Graph), `LightSide/Canvas Image`, hidden Canvas capture shaders, and for the 3D module `LightSide/Text 3D` and `LightSide/Text 3D HDRP`. They sample the atlas once per fragment (twice for inner shadow) and use one draw per material. Source: `<LightSideCoreRoot>/Runtime/Rendering/LightSide_UI.shader`.

### Shader tiers (`LightSideSurfaceTier`)

A text component draws with the **lightest tier that covers everything on it**. A compiled program's register allocation is static, so a heavier tier slows every fragment it draws, and materials of different tiers never batch. Tiers compile as `multi_compile_local` keywords (`LIGHTSIDE_TIER_TEXT`, `LIGHTSIDE_TIER_STYLED_TEXT`, `LIGHTSIDE_TIER_UNITED_TEXT`, ...).

| Tier | Covers | Triggered by | Mobile |
|---|---|---|---|
| `Text` | glyph fill and colour glyphs | plain text, `<color>`, `<alpha>`, solid fill without softness or dilate | OK |
| `StyledText` | stroke, shadow, glow, inner shadow coverage, corner styles, fill softness, paint layers, colour filters, range decorations (underline, highlight) | any of those on the component (extra UV channels allocated) | OK |
| `UnitedText` | `StyledText` plus glyph unions | `UnionModifier` | LIMIT |
| `Full` | everything, including deformation | any deformed glyph | LIMIT |

Other values (`PanelShapes`, `BasicShapes`, `Shapes`, `AtlasQuads`) belong to other LightSide products; text uses the first four. Vendor claim: on a low-end phone plain text takes several times less GPU time than before tiers existed. Practical rule: keep body text effect-free and put decorated text in its own components ([unitext-effects-paint.md](unitext-effects-paint.md)).

## 3. Shipped sample materials, shaders and templates

Ready-made materials live in `<UniTextRoot>/Defaults/Materials/`. A package under `Library/PackageCache/` is read-only, so copy a material into your own assets before editing it.

| Material | Shader | Key values | Per-text channels (`ConstantUv2`) | Notes |
|---|---|---|---|---|
| `UniTextRainbow.mat` | `LightSide/Custom/Rainbow` | `_HueScale 0.05`, `_HueSpeed 0.15`, `_HueOffset 0`, `_Saturation 1`, `_Brightness 1` | X = hue offset | hue = (cluster + intra-glyph X) * HueScale + offset + userA.x + time * HueSpeed. LIMIT: always animating |
| `UniTextDisolve.mat` (the spelling is the package's) | `LightSide/Custom/Dissolve` | `_NoiseTex` = `UniTextNoise.png`, `_NoiseScale 0.5`, `_EdgeWidth 0.06`, `_EdgeSoftness 0.015`, HDR `_EdgeColor (2,0.7,0.1,1)`, `_NoiseScroll 0` | X = progress (0 hidden .. 1 visible, default 1), Y = noise scroll offset | one noise sample per fragment. LIMIT |
| `UniTextHologram.mat` | `LightSide/Custom/Hologram` | `_Tint`, `_HueScale 0.84`, `_ScanFreq 45`, `_ScanSpeed -3`, `_ScanContrast 0.45`, `_FlickerScale 2`, `_FlickerSpeed 0.7`, `_FlickerAmount 0.25`, `_EdgeColor`, `_EdgeWidth 0.06`; **`_NoiseTex` ships unassigned** | X hue phase, Y flicker phase, Z scan phase, W intensity (0 = default) | assign a noise texture for flicker. LIMIT |
| `UniTextLit.mat` | its shader reference resolves to no shader in the package | `_LightInfluence`, `_AmbientStrength`, `_DirectStrength`, hue properties | — | legacy lit-world material; lit world text is now the `UniTextWorld.Lit` checkbox. Do not use it |
| `UniTextNoise.png` | texture | 512x512 RGBA, sRGB off, bilinear, Repeat, not readable | — | the Dissolve noise |

Shader sources under `<UniTextRoot>/Shaders/`:

- `LightSide_Custom.cginc` — Built-in prelude (Canvas shells; world Built-in shells `#define LIGHTSIDE_WORLD` first).
- `LightSide_Custom-URP.hlsl` — URP world prelude (Core.hlsl based).
- `LightSide_EffectLib.hlsl` — building blocks.
- `LightSide_AtlasPreview.shader` — hidden editor preview.
- `Templates/LightSide_Custom-Example.shader` (Canvas shell, `Shader "LightSide/Custom/Example"`), `Templates/LightSide_Custom-World-Example.shader` (`"LightSide/Custom/World Example"`; SubShaders in order URP with UniversalForward + ShadowCaster, HDRP with a CG pass and **no** ShadowCaster, Built-in with a pass + ShadowCaster), `Templates/LightSide_Effect-Example.hlsl` (the effect include).
- `Templates/Examples/` — `LightSide_Custom-{Dissolve,Hologram,Rainbow}.shader`, `LightSide_Custom-World-{Dissolve,Hologram,Rainbow}.shader`, `LightSide_Effect-{Dissolve,Hologram,Rainbow}.hlsl`. Read these before writing your own.

## 4. `<mat>` and `MaterialModifier`

`MaterialModifier` routes a text range into a **sub-mesh with its own `CanvasRenderer` and your own material**. The tag only selects the range; the material is a field of the modifier, so **one tag = one material** (several looks need several modifiers and tags).

| Member | Meaning |
|---|---|
| `Material` | the material for the range (its shader must include the LightSide prelude; see §6) |
| markup slot `tint` | `<mat=#FF8800>` or `<mat=red>`: multiplied into the vertex colour the shader receives (default white) |
| `RenderOrder` | `Replace` (default): the face quad is removed from the base mesh on the range, only your material shows. `Keep`: the base face stays and your material is an extra layer ordered by the modifier's position in Styles |
| `SortIndex` | tie-break for this sub-mesh (lower first); order against other modifiers follows Styles position |
| `ConstantUv2`, `ConstantUv3` (Vector4) | per-text values written into TEXCOORD2/3 of every glyph vertex of the sub-mesh; they reach the shader as `userA` / `userB` |
| `QuadPaddingOverride` | grows glyph quads, in glyph heights, so glow and edge effects are not clipped by the tight glyph box; `-1` reads `_LightSideMeshPadding` from the shader; capped by the SDF spread; colour glyphs stay unpadded |
| `CloneMaterial` (default **true**) | clones the material so runtime changes are isolated from the asset and other users; `false` uses the asset directly (edits show everywhere) |
| `glyphDataWriter` | a delegate that writes per-glyph UV2/UV3 instead of the constants; **not serialized**, so assign it in `OnEnable` of a subclass |

Behaviour to rely on:

- Paint layers (stroke, shadow, glow) on the same range stay separate base-mesh quads through the stock shader. They never pass through your shader. In `Replace` mode they still render around your material.
- Emoji and sprites are handled like text: the one custom material renders every glyph mode (test `glyphMode > 1.5` for colour).
- `ConstantUv2/3`, `RenderOrder`, `SortIndex`, `Tint` and `Material` are state-tracked: each write marks the text's mesh dirty (a mesh-only rebuild). Writing them every frame on many texts is a CPU cost; drive continuous motion from `_Time` in the shader (M1) and use the constants for slow, event-driven values.
- `Material == null` logs `[MaterialModifier] material is not assigned on <name>.` once and the range is not copied into a sub-mesh.
- For `UniTextWorld` the material must use the **World** shell shader; for `UniText` (Canvas) the Canvas shell. A shell used on the wrong component clips and sorts wrongly.
- The tag is not registered by default. The picker offers a "Material" entry that registers tag `mat`; in code `text.Styles.Add(Style.Tag(mod, "mat"))`. Tag bootstrap: the master rule `../unitext.md`, section "Tag vocabulary bootstrap", and [unitext-markup-system.md](unitext-markup-system.md).
- Mobile: LIMIT. Each material adds a renderer and splits batches; keep it to a few short ranges.

## 5. Using a ready material

1. Make sure the material's shader matches the component: Canvas shell for `UniText`, World shell for `UniTextWorld`.
2. Register a style: Styles `+` -> Material (tag `mat`), or in code as below.
3. Assign `Material`; per-text knobs the shader declares appear as labelled controls in the inspector (§6.6).
4. Mark the range with the tag.

```csharp
// rainbowMat / dissolveMat: materials made from the shipped Rainbow and Dissolve shaders
text.Styles.Add(Style.Tag(new MaterialModifier { Material = rainbowMat }, "rainbow"));
text.Styles.Add(Style.Tag(new MaterialModifier { Material = dissolveMat }, "dissolve"));
text.Text = "Drop: <rainbow>LEGENDARY</rainbow> and <dissolve>Level Up</dissolve>";
```

Result: the first word cycles hue per letter; the second dissolves according to `ConstantUv2`. Gotcha: with several `MaterialModifier` styles on a component, `text.GetModifier<MaterialModifier>()` cannot tell them apart; fetch the list with `GetModifiers<MaterialModifier>(list)` and pick by its `Material`. `GetModifier`/`GetModifiers` return the component's own copy.

## 6. Authoring a custom shader

### 6.1 Files

Select a folder and use `Assets -> Create -> LightSide -> UniText -> Custom Effect`. It writes `UniTextEffect.hlsl` (the effect), `UniTextEffect.shader` (Canvas shell, `Shader "LightSide/Custom/UniTextEffect"`) and `UniTextEffect-World.shader` (World shell) into the folder, numbering names when taken, with the prelude include paths resolved. Keep the three files in one folder: the shells include the effect by relative name.

- You edit **only the `.hlsl`** (visual logic) and list new Properties in **both** shells.
- Canvas and World shells are **separate assets**: a combined Canvas + URP shader would make uGUI pick the URP SubShader for Canvas and break clip and mask.

### 6.2 The hook name — which spelling is right

The correct names are the ones in the package source and templates:

- the function you write: `half4 LightSideEffect(LightSideFrag i)`
- the fragment struct: `LightSideFrag`
- the building-block include: `LightSide_EffectLib.hlsl`
- the preludes: `LightSide_Custom.cginc` (Built-in/Canvas) and `LightSide_Custom-URP.hlsl` (URP world)

The Getting Started chapter on custom effects and the 3.0.0 changelog use the older names `UniTextEffect`, `UniTextFrag` and `UniText_EffectLib.hlsl`. They were renamed in 3.2.0, and code using the old names does not compile. The same release renamed the stock shaders (`UniText/SDF`, `UniText/Lit/SDF`, `UniText/RangeDecoration` became `LightSide/UI`, `LightSide/World`, `LightSide/World Lit`), so a `Shader.Find` with an old name returns null. Follow the templates, not the old docs. The shells call:

```hlsl
// Canvas shell                                              // World shell adds fog instead of clipping
return LightSideApplyClipping(LightSideEffect(LightSideBuildFrag(i)), i.mask);
```

### 6.3 `LightSideFrag` fields

| Field | Meaning |
|---|---|
| `float3 atlasUV` | pass to `LightSideSampleAtlas` / `LightSideSampleSdf` together with `glyphMode` |
| `float glyphMode` | 0 = SDF, 1 = MSDF, 2 = colour glyph; test `glyphMode > 1.5` for emoji/colour |
| `float2 glyphUV` | glyph-local 0..1, size-invariant (for colour glyphs a small atlas sub-range) |
| `float signedDist` | signed distance (0 for colour glyphs) |
| `float sdfAlpha` | anti-aliased face coverage (1 for colour glyphs) |
| `half4 atlasColor` | raw atlas texel (the colour tile for emoji) |
| `half4 color` | vertex colour (effect quads arrive with face alpha pre-multiplied) |
| `float2 glyphMeta` | x = glyph height, y = face dilate |
| `float2 lineFlow` | x = cluster index, y = intra-glyph X; smooth flow across and within letters |
| `float tileId` | stable per-glyph hash seed (colour glyphs: atlas page) |
| `float2 tileHash` | precomputed random pair per glyph; use to desync letters |
| `float4 userA`, `float4 userB` | `MaterialModifier` channels (TEXCOORD2 / TEXCOORD3) |
| `float3 positionWS` | world position in world shells; 0 on Canvas |

### 6.4 Helpers and rules for the return value

- Return a **premultiplied** colour: rgb already multiplied by alpha.
- `LightSideTintPremultiplied(half4 color, half4 tint)`, `LightSideCosPalette(float t, float saturation, float brightness)` (cosine hue cycle), `LightSideTileHash(float tileId)`, `LightSideSampleAtlas(atlasUV, glyphMode)`, `LightSideSampleSdf(atlasUV, glyphMode)`, `LightSideSDFAlpha(signedDist, faceDilate, glyphH, glyphUV)`, `LightSideGammaToLinearIfNeeded`, the coverage helpers `LightSideResolveGlyphCoverage` / `LightSideCoverage` / `LightSideInside` (fill, stroke, shadow and inner-shadow regions).
- Textures: declare with `LightSide_DECLARE_TEX2D(_Tex);` and sample with `LightSide_SAMPLE_TEX2D(_Tex, uv)`. The same call compiles on Built-in and URP.
- **Always handle colour glyphs** (`glyphMode > 1.5`) explicitly, or emoji render wrong.

### 6.5 Required in every shell, and what never to do

Required:

- Properties `[HideInInspector] _SrcBlend ("Source RGB Blend", Float) = 1` and `[HideInInspector] _DstBlend ("Destination RGB Blend", Float) = 10`. A style layer's blend mode reaches a custom shader only through them, and alpha blends source-over (`Blend [_SrcBlend] [_DstBlend], One OneMinusSrcAlpha`).
- Canvas shell: `_ClipRect`, `_MaskSoftnessX/Y`, `_Stencil*` set, `_CullMode`, `_ColorMask`; tags `Queue Transparent`, `IgnoreProjector`, `RenderType Transparent`, `CanvasGroupAlpha=Premultiplied`.
- Pragmas: `#pragma target 3.0`, `#pragma require 2darray integers`; Canvas `multi_compile_fragment __ UNITY_UI_CLIP_RECT` and `__ UNITY_UI_ALPHACLIP`; world `multi_compile_fog`.

Never:

- **Never declare `_LightSideGlyphSdf/Msdf/Color` in Properties.** They are global bindings; a material-level value pins a texture into the material identity and splits batches.
- **Never copy the stock `LIGHTSIDE_SHADER_VARIANTS` block** into a custom shader. Only the four stock shaders are stripped; copying it multiplies variants twelvefold.
- Do not add a `_MainTex` for the atlas. The Getting Started chapter says a `MaterialModifier` material must declare `_MainTex` as a `2DArray`; the shipped shells declare no `_MainTex` and the prelude binds the atlases globally. Follow the shells.
- Do not use a Canvas shell on `UniTextWorld` or the reverse.

### 6.6 Channels, per-text knobs, padding, vertex hook

- On a `MaterialModifier` sub-mesh, TEXCOORD2 and TEXCOORD3 are the **user channels** `userA` and `userB` (filled from `ConstantUv2/3` or `glyphDataWriter`). Base-mesh channels and prelude interpolators are fully claimed, so per-glyph custom data rides the user channels or the vertex hook.
- **Per-text parameters without code:** declare a Property named `_LightSideInstUv2` / `_LightSideInstUv3` (whole vec4) or `_LightSideInstUv2X..W` / `_LightSideInstUv3X..W` (one component) and mark it `[HideInInspector]`. The `MaterialModifier` inspector discovers only hidden ones, shows a labelled control (Range, Float, Vector, Color) backed by `ConstantUv2/3`, and uses the property's shader default as that component's default. The shader reads the value as `i.userA.x`, not from the property.
- `_LightSideMeshPadding` (Property) or `QuadPaddingOverride` grows glyph quads so glow/edge effects are not clipped.
- Optional vertex hook: put `#define LIGHTSIDE_EFFECT_VERT` in the pass before the prelude include and implement `void LightSideEffectVert(LightSide_appdata v, inout LightSideVaryings o)` in the effect file. Field layouts: read the prelude. Use it for per-vertex displacement.

## 7. Noise helpers

- `Tools -> LightSide -> Core -> Noise Generator`: Value or FBM noise; size 64-1024, seed, frequency, octaves 1-8, lacunarity, gain, tileable, invert. It saves a PNG imported as Default, Repeat, Bilinear, no mipmaps, linear (sRGB off), uncompressed.
- Declare `LightSide_DECLARE_TEX2D(_NoiseTex);` and sample `LightSide_SAMPLE_TEX2D(_NoiseTex, uv).r`.
- To desync letters, seed the UV with the glyph hash, size-invariantly: `i.glyphUV * scale + i.tileHash` (as the Dissolve sample does).
- Mobile: a 512x512 RGBA noise is 1 MiB uncompressed; use the smallest size that hides tiling.

## 8. Pipelines and platforms

| Topic | Fact |
|---|---|
| Built-in / URP / HDRP | all supported (Unity 2022.3+); CI compiled against URP 12.1, 14.0 and 17.0. Canvas shells are Built-in CG programs; world text has URP, HDRP and Built-in SubShaders |
| URP world text | custom world shells include `LightSide_Custom-URP.hlsl`; the same `.hlsl` effect compiles in both pipelines |
| HDRP world text | custom world shells carry a CG pass **without** ShadowCaster. Lit HDRP text needs the `LightSide/World Lit HDRP` Shader Graph (the package copies it into the project under a `LightSide/HDRP` folder); without it lit HDRP text errors, with no silent unlit fallback |
| Lit world text | `UniTextWorld.Lit` (default off); `CastShadows` (off, shared per sorting context); `Standalone` (own renderer, +1 draw); lit and unlit world text can coexist. Lighting is the one expensive shader axis |
| UniText 3D | uses `LightSide/Text 3D[ HDRP]`; 2D strokes, shadows and glows are not drawn there ([unitext-3d-text.md](unitext-3d-text.md)) |
| Graphics APIs | D3D11/12, Vulkan, Metal, OpenGL Core, OpenGL ES 3, WebGL 2, WebGPU. Shaders require `2darray` and `integers`, so no GLES2 or WebGL 1 |
| WebGL | shader effects work (they are shader-only); no OS fonts (assign a `UniTextFont`); no compute, so glyph raster falls back to the CPU |

## 9. Build requirements

- **Include World Shaders / Include Lit Shaders** (Project Settings -> LightSide -> Core -> Rendering, stored in the LightSide settings asset). Without world shaders a build rejects scenes that hold world-space surfaces (text, shapes, vector animation), and one that slips through fails on first render. The editor draws them either way, so only a **player build** shows the omission. Include Lit Shaders matters only while Include World Shaders is on; turn it off if nothing is lit. A settings asset that does not store these fields keeps the shaders, but the package's default settings asset stores false, so a new project starts without them.
- The LightSide settings keep a shader list; a shader reachable only through `Shader.Find` does not survive a build. Reference your custom shaders through a material or asset field (as `MaterialModifier.Material` does), never `Shader.Find` them at runtime.
- "Surface capabilities" (`shaderFeatures`) are derived automatically from the installed LightSide packages; a build keeps one variant per tier those packages can draw. Only the four stock shaders are variant-stripped.
- **Warm-up:** `LightSideMaterials.WarmUpUi(tiers)` draws each Canvas tier once offscreen so the program compiles at a moment you pick. It throws `ArgumentException` for a tier the build's shader profile left out. On Vulkan, Metal and D3D12 a Canvas rendering into a target of another format or sample count (an HDR camera, say) may still compile at first draw. World materials are not warmed by this call.
- Atlas size and precision (1024/2048, 8/16 bit) are set in the UniText settings and affect memory, not shaders; see [unitext-effects-paint.md](unitext-effects-paint.md).

## 10. Mobile verdicts

| Item | Verdict | Reason |
|---|---|---|
| Stock shared material, `Text` tier | OK | one atlas sample per fragment, batches across texts |
| `StyledText` tier | OK | one tap per fragment; the cost is the extra quads, not the shader |
| `UnitedText`, `Full` tiers | LIMIT | heavier static register allocation for every fragment of that tier; never batches with lighter tiers |
| `MaterialModifier` range | LIMIT | own renderer and material, splits batches |
| Custom effect shaders | LIMIT | per-fragment work on top of the atlas sample; keep ALU and texture taps minimal, avoid dependent texture reads |
| Dissolve / Hologram samples | LIMIT | noise sample per fragment, HDR edge colour |
| Rainbow sample | LIMIT | per-fragment palette ALU, always animating |
| `ConstantUv2/3` written every frame | LIMIT | each write is a mesh rebuild; use `_Time` in the shader instead |
| Lit world text | AVOID on low-end | lighting is the expensive axis of the shader family |
| Lit shaders in the build | LIMIT | the lit family has thousands of variants; include it only if something is lit |
| First draw of a tier | LIMIT | program compile hitch; warm up behind a loading screen |

## 11. Recipes

Snippets are adapted from the shipped templates and were not compiled in a project.

**M1 — A time-driven pulse/tint effect (per-letter phase)**

Goal: a range that pulses without any script. Setup: run Custom Effect, then in **both** shells add the Properties; edit the `.hlsl`.

```hlsl
// shells: add to Properties
//   _Tint  ("Tint",  Color) = (1, 1, 1, 1)
//   _Speed ("Speed", Float) = 3
half4 _Tint;
float _Speed;
half4 LightSideEffect(LightSideFrag i)
{
    if (i.glyphMode > 1.5) return LightSideTintPremultiplied(i.atlasColor, i.color);   // colour glyph: pass through
    float pulse = 0.75 + 0.25 * sin(_Time.y * _Speed + i.tileHash.x * 6.2831);          // per-letter phase
    half4 c = i.color * _Tint;
    half a = c.a * i.sdfAlpha;
    return half4(c.rgb * pulse * a, a);                                                 // premultiplied
}
```

Then create a Material from the Canvas shader (World shader for `UniTextWorld`), assign it to a `MaterialModifier`, and tag the range (§5). Result: letters pulse out of phase. Gotcha: `_Time` advances on the GPU every frame, so no mesh rebuild is involved.

**M2 — Rainbow item name**

`text.Styles.Add(Style.Tag(new MaterialModifier { Material = rainbowMat }, "rainbow"))`, then `<rainbow>Prismatic Blade</rainbow>`. Per-text hue offset: `ConstantUv2 = new Vector4(offset, 0, 0, 0)` (`_LightSideInstUv2X`). Gotcha: in the default `Replace` mode the range's face comes from the rainbow shader only; stroke, shadow and glow layers on the same range still render around it. `<rainbow=#RRGGBBAA>` sets the tint multiplied into the vertex colour the shader receives.

**M3 — Dissolve in/out**

```csharp
var d = text.GetModifier<MaterialModifier>();          // the dissolve one when it is the only MaterialModifier (see §5)
d.ConstantUv2 = new Vector4(progress, scroll, 0f, 0f);  // X progress 0..1, Y noise scroll; mesh-only rebuild per write
```

How the shader works: it thresholds a noise texture against `1 - progress`, keeps the face where the noise exceeds that threshold plus `_EdgeWidth`, and paints an HDR `_EdgeColor` band between the two values; colour glyphs are treated the same way. Drive `progress` from a short tween for a one-off fade (each step is one mesh rebuild of that text); for a long continuous effect on many texts, move the animation into the shader with `_Time` (M1). Setup: the noise texture must be assigned (the shipped material has `UniTextNoise.png`).

**M4 — A per-text slider**

In the shell: `[HideInInspector] _LightSideInstUv2X ("Intensity", Range(0,1)) = 0.5`. In the `.hlsl`: `float k = i.userA.x;`. Result: the `MaterialModifier` inspector shows an "Intensity" slider; script writes go through `ConstantUv2.x`.

**M5 — Noise-driven edge effect**

Declare `LightSide_DECLARE_TEX2D(_NoiseTex);` and `float _NoiseScale;`, sample `float n = LightSide_SAMPLE_TEX2D(_NoiseTex, i.glyphUV * _NoiseScale + i.tileHash).r;`, then use `smoothstep` on `n`. Generate the texture with the Noise Generator (§7). Gotcha: `glyphUV` is glyph-local; add `tileHash` or every letter shows the same pattern.

**M6 — Warm up shaders behind a loading screen**

```csharp
LightSideMaterials.WarmUpUi(LightSideSurfaceTier.Text, LightSideSurfaceTier.StyledText);
// add LightSideSurfaceTier.UnitedText if UnionModifier is used anywhere
```

Result: the Canvas programs compile now instead of on the first outlined text. Gotcha: throws `ArgumentException` if a tier is not in the build's shader profile; world materials are not covered.

**M7 — A custom effect on world-space text**

Use the World shell shader from the Custom Effect output (Built-in/URP/HDRP SubShaders), give it the same `.hlsl`, enable Include World Shaders for the build (§9), assign the material to a `MaterialModifier` on a `UniTextWorld`. HDRP lit text additionally needs the Shader Graph (§8).

## 12. Pitfalls

1. **Wrong spelling.** `UniTextEffect`, `UniTextFrag`, `UniText_EffectLib.hlsl` and the old stock shader names (`UniText/SDF`, ...) do not exist in 3.x. Use `LightSideEffect`, `LightSideFrag`, `LightSide_EffectLib.hlsl`, `LightSide/UI`.
2. **Not premultiplied.** Return rgb multiplied by alpha; otherwise edges and blends look wrong.
3. **Colour glyphs unhandled.** Always branch on `glyphMode > 1.5`.
4. **Atlas in Properties** or a copied `LIGHTSIDE_SHADER_VARIANTS` block breaks batching or multiplies variants.
5. **Missing `_SrcBlend` / `_DstBlend`** means style-layer blend modes never reach the shader.
6. **Canvas shell on world text** (or the reverse) clips and sorts wrongly.
7. **`<mat>` is a range selector.** The material belongs to the modifier; different materials need different tags.
8. **`MaterialModifier` with no material** logs an error once and does nothing for the range.
9. **Replace mode hides only the face.** Stroke, shadow and glow keep rendering as stock-shader quads; they never go through your shader.
10. **Per-text properties must be `[HideInInspector]`** with the `_LightSideInst` prefix, or the inspector will not show them.
11. **`ConstantUv2/3` writes rebuild the mesh.** Do not write them per frame on many texts.
12. **World shaders missing from a player build.** The editor hides the problem; a build rejects or fails on world-space text. Check the Include World Shaders option before building.
13. **`UniTextLit.mat` is broken** (its shader reference resolves to nothing) and `UniTextHologram.mat` ships without its noise texture.
14. **HDRP:** custom world shells have no ShadowCaster pass; lit HDRP text needs the Shader Graph.
15. **`WarmUpUi` throws** for a tier the build left out and does not warm world materials.
16. **Material cloning:** with `CloneMaterial = true` (default) UniText works on a clone, so `SetColor` and similar edits on the source asset are not reflected immediately; set it false only if you want a live edit shared by every user of the material.
17. **Docs vs templates:** the Getting Started chapter's `_MainTex` as `2DArray` advice does not match the shipped shells. Follow the shells.

## Unverified

- Content of the shader-diagnostics document every shader header points to (`<LightSideCoreRoot>/Docs~/SHADER_DIAGNOSTICS.md`): not present in the package as installed; its "compiler traps" are unknown.
- Observable behaviour of a `MaterialModifier` with no material (error logged and range not copied; whether the base face of a `Replace` range is still suppressed was not confirmed).
- Whether `UniTextLit.mat` has a working replacement shader reference in another package version.
- Whether Canvas shells (Built-in CG programs) behave identically under every URP version's UI path (CI compiled URP 12.1, 14.0, 17.0; rendering was not exercised).
- Real per-fragment and draw-call cost of the sample effects on a device (nothing was profiled).
