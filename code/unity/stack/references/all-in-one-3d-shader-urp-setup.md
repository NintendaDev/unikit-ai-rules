# All In One 3D Shader — URP setup

> **Base path:** `Assets/Third-Party Assets/VFX/AllIn13DShader/`
> See also: [all-in-one-3d-shader-variants-and-baking.md](all-in-one-3d-shader-variants-and-baking.md) (variants), [all-in-one-3d-shader-mobile-optimization.md](all-in-one-3d-shader-mobile-optimization.md) (MO-08)

Source tags: **[code]** shader/editor code (v2.74) · **[docs]** vendor docs · **[unity]** Unity manual · **[general]**.

## Section index

| ID | Section |
|---|---|
| URP-01 | Requirements and what the auto-configure step really does |
| URP-02 | Per-renderer checklist (every quality level) |
| URP-03 | URP Shader Feature Configuration — options and their variant cost |
| URP-04 | Bloom, HDR and color space for Emission |
| URP-05 | Decals |
| URP-06 | Symptoms and fixes |

---

## URP-01 — Requirements and auto-configure

- The URP SubShader requires the `com.unity.render-pipelines.universal` package (12.0 or newer); the shader contains
  Unity 6 branches (`include_with_pragmas`, cluster light loop on 6.2+) [code]. A second SubShader serves the Built-in
  pipeline; this project's materials use the URP one.
- On import the asset offers **Configure** (auto-configure). Manual route: `Tools/AllIn1/3DShaderWindow` → **URP
  Settings** → *Configure AllIn13D to work correctly with URP* [docs][code].
- What it actually does [code]: for the **active** render pipeline asset only, on its first renderer data
  (`m_RendererDataList[0]`): sets **Depth Priming Mode = Disabled**, and adds two `Render Objects` features if missing:
  `Render Feature - Outline Opaque` (queue Opaque, event `AfterRenderingOpaques`) and
  `Render Feature - Outline Transparent` (queue Transparent, event `AfterRenderingTransparents`); both filter pass name
  `OutlinePass`, layer mask Everything. It also converts the demo materials.
- Consequence: **every other pipeline asset and renderer** (a PC quality level, a second mobile tier) gets nothing.
  Outlines are invisible there until the same two features are added by hand.

## URP-02 — Per-renderer checklist

For each `UniversalRendererData` that renders these materials:

| Check | Why |
|---|---|
| Depth Priming Mode = Disabled (mobile) | URP's mobile recommendation; the setup tool does the same [unity][code] |
| Two `Render Objects` features with pass name `OutlinePass` (Opaque at `AfterRenderingOpaques`, Transparent at `AfterRenderingTransparents`) — only if any material uses an outline | Without them outline passes are never drawn and no error appears [code] |
| URP asset: Depth Texture only if a depth effect is in use | Intersection Glow/Fade, Screen Space UV, Depth Coloring, Dither (see catalog) |
| URP asset: main-light shadows and Additional Lights modes match the shader defines | A define turned off in URP-03 cannot be recovered by the URP asset |
| Post-processing Volume with Bloom if `Emission` must glow | URP-04 |
| Decal renderer feature if decals are received | URP-05 |
| Same checklist for the PC and editor renderers when they share materials | They are separate renderer assets |

## URP-03 — Shader Feature Configuration

Where: `Tools/AllIn1/3DShaderWindow` → **URP Settings** → *Shader Feature Configuration*; press **Apply Changes**, wait for the
recompile (console: "Shader feature configuration applied successfully!"); **Reset to Defaults** restores the
recommended set [docs]. The tool writes `Shaders/ShaderLibrary/AllIn13DShader_FeaturesURP_Defines.hlsl` [code].

| Option (define) | Default | Pragmas it adds [code] | Turn off when |
|---|---|---|---|
| GPU Instancing (`ALLIN1_GPU_INSTANCING_SUPPORT`) | on | `multi_compile_instancing` (×2) | SRP Batcher is the only batching path |
| Fog (`ALLIN1_FOG_SUPPORT`) | on | fog modes (`multi_compile_fog`, or `Fog.hlsl` on Unity 6.2+) | no scene uses Unity fog |
| Lightmaps (`ALLIN1_LIGHTMAPS_SUPPORT`) | on | `LIGHTMAP_SHADOW_MIXING`, `LIGHTMAP_ON`, `DIRLIGHTMAP_COMBINED` (each ×2) | no baked scene |
| Additional Lights (`ALLIN1_ADDITIONAL_LIGHTS_SUPPORT`) | on | `_ADDITIONAL_LIGHTS_VERTEX`/`_ADDITIONAL_LIGHTS` (×3), `_ADDITIONAL_LIGHT_SHADOWS` (×2) | the game has only the main light — materials then ignore point and spot lights |
| Cast Shadows (`ALLIN1_CAST_SHADOWS_SUPPORT`) | on | `_MAIN_LIGHT_SHADOWS` family (×4: off, main, cascade, screen), `_SHADOWS_SOFT` (×2) | the game has no real-time shadows |
| Shadow Mask (`ALLIN1_SHADOW_MASK_SUPPORT`) | on | `SHADOWS_SHADOWMASK` (×2) | no shadowmask lighting mode |
| Forward+ (`ALLIN1_FORWARD_PLUS_SUPPORT_UNITY6`) | on | `_FORWARD_PLUS` or `_CLUSTER_LIGHT_LOOP` (×2) | renderer is plain Forward |
| SSAO (`ALLIN1_SSO_SUPPORT`) | on | `_SCREEN_SPACE_OCCLUSION` (×2, fragment) | no SSAO feature on the renderer |
| Adaptive Probe Volumes (`ALLIN1_ADAPTATIVE_PROBE_VOLUMES_UNITY6`) | on | probe-volume variants | project does not use APV |
| DOTS Instancing | off | `DOTS_INSTANCING_ON`, target 4.5 | stays off unless ECS rendering |
| Reflection Probes Blending (`…REFLECTIONS_PROBES_SUPPORT_UNITY6`) | off | blending, box projection, atlas (×2 each) | stays off on mobile |
| Light Layers | off | `_LIGHT_LAYERS` (×2) | stays off unless light layers are used |
| LOD Cross Fade, Decals, Light Cookies | optional | `LOD_FADE_CROSSFADE`, `_DBUFFER_MRT1/2/3`, `_LIGHT_COOKIES` | stay off unless used |

URP strips combinations the active URP assets cannot use, but the editor still compiles and the baked shader count
grows with every define left on [general]. Verify after each Apply: effects relying on the removed feature stop reacting.

## URP-04 — Emission glow

- `Emission` multiplies the color above 1; the halo comes from Bloom in a Volume on the camera [docs].
- Needs an HDR color buffer (URP asset *HDR*). The vendor's demos use **Linear** color space; switch it if you must
  match their look (`Project Settings → Player → Other Settings → Color Space`) [docs]. Changing color space late
  re-colors all assets — decide early.
- On mobile Bloom is the expensive part (see MO-08). Without Bloom, keep emission ≤ 1 or fake the glow.

## URP-05 — Decals

The shader is a decal **receiver** only [docs]. Two steps: enable the Decals option in URP-03 (adds `_DBUFFER_MRT*`
variants), and add URP's Decal renderer feature to the renderer data [docs]. DBuffer decals need extra render targets —
treat as desktop/high-end on mobile [general].

## URP-06 — Symptoms and fixes

| Symptom | Cause | Fix |
|---|---|---|
| Outline invisible | No `OutlinePass` Render Objects features on this renderer asset, or the material uses a non-outline shader | URP-02; check Outline Type ≠ None |
| Black meshes | Pipeline mismatch: URP package present but no pipeline asset assigned (or the reverse) [docs] | Assign a URP asset in Graphics settings, or remove URP; docs message "URP Installed, But Render Pipeline Asset Not Assigned" |
| Pink material | Shader error, or in a build a missing variant (VAR-06) | Console shader errors first; then variants |
| Emission does not glow | No Bloom, no HDR, or value ≤ 1 | URP-04 |
| Intersection / depth effects flat or wrong | Depth Texture off | Enable only if worth the cost, or use another effect |
| Effects vanish in a device build | Keyword flipped at runtime or variant stripped | VAR-06 |
| Light flicker (Unity 6 early versions) | Unity bug in early Unity 6 releases | Upgrade to 6.2 or newer [docs] |
| `ALLOC_TEMP_TLS` messages in the editor | Harmless editor warnings during URP variant compile; no visual or build impact [docs] | Reduce keywords or unused URP features to lessen them |
| Unlit look wanted | — | Light Model `None` + Custom Ambient white [docs] |
