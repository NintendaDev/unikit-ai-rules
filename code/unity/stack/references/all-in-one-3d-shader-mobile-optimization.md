# All In One 3D Shader — Mobile optimization

> **Base path:** `Assets/Third-Party Assets/VFX/AllIn13DShader/`
> See also: [all-in-one-3d-shader-effects-quickref.md](all-in-one-3d-shader-effects-quickref.md) (per-effect verdicts), [all-in-one-3d-shader-variants-and-baking.md](all-in-one-3d-shader-variants-and-baking.md) (variant and build-size control), [all-in-one-3d-shader-urp-setup.md](all-in-one-3d-shader-urp-setup.md) (URP features and defines)

Source tags: **[code]** read in the shader/editor code (v2.74) · **[docs]** vendor documentation · **[unity]** Unity manual ·
**[general]** common mobile-GPU practice, not specific to this asset. Numeric budgets are **working targets, assigned
not measured** — tune them on the weakest target device.

## Rule index (read the line, open the section only if it applies)

| ID | Rule |
|---|---|
| MO-01 | Disabled effects are free; every ticked effect is code in the shipping variant |
| MO-02 | Choose the lighting tier first: `None` / `FastLighting` / main-light models / `PBR` |
| MO-03 | Additional lights are evaluated per pixel by this shader — avoid them |
| MO-04 | Shadows: both toggles off removes the pass; renderer shadow mode for the rest |
| MO-05 | Stay opaque; cut out and dither instead of blending |
| MO-06 | Count texture samples; fragment-stage UV effects make reads dependent |
| MO-07 | Vertex effects are paid again in shadow and depth passes |
| MO-08 | Depth Texture, Opaque Texture, Bloom and SSAO are renderer-wide costs |
| MO-09 | Outlines: one extra draw per object — a handful only |
| MO-10 | Protect the SRP Batcher: no MPB, shared (baked) shaders, owned material instances |
| MO-11 | Keep variants and build size small at the source |
| MO-12 | Global components are cheap; one of each |
| MO-13 | Texture and memory hygiene |
| MO-14 | Verification checklist and the Batch Override audit |
| MO-15 | Budget table per material class |

---

## MO-01 — Cost model

- The shader compiles code only for enabled effects; a disabled effect is removed, not branched around [docs]. So the
  levers are: how many effects are ticked, which lighting model, how many passes the material has, and how many
  materials/shaders the scene uses.
- Per pixel: base sample + lighting (main light, then every additional light) + sum of enabled effects. Per draw: main
  pass + ShadowCaster (+ outline pass, + depth passes when URP needs them). Per frame on the CPU: draws, material and
  shader changes, light count [code][general].
- Baseline claims from the vendor: with no effects it is lighter than the Standard shader, with equivalent features it is
  comparable [docs]. Treat "comparable to Standard" as too heavy for a mobile crowd; the tiers below are cheaper.

## MO-02 — Lighting tier

| Tier | Setting | Notes |
|---|---|---|
| Unlit | Light Model `None` + Custom Ambient (1,1,1) | Albedo only; no light, no shadows [docs FAQ][code] |
| Fast | Light Model `FastLighting` + `FastLightConfigurator` | One global direction and color, N·L only, additional-light loop skipped; the vendor says remove scene lights and turn all shadows off [docs][code] |
| Main light | `Classic`, `HalfLambert`, `FakeGI`, `Toon` | Main light plus whatever additional lights reach the object [code] |
| Ramped | `ToonRamp` | One ramp sample per light [code] |
| Hero | `PBR`, anisotropic specular, Reflections | BRDF, many dot products per light, probe lookups [code] |

Pick per material class (MO-15), not per project. Specular and Reflections are separate switches: the Basic preset
ships with Specular `Classic` on — set it to `None` when no highlight is needed [code].

## MO-03 — Additional lights

- `DirectLighting` loops over every additional light that URP assigns to the object and runs the full diffuse (and
  specular, if on) term per pixel [code]. Their shadows are used only if the material receives shadows **and** the URP
  asset enables additional-light shadows [code].
- Keep dynamic additional lights off mobile levels, or cap URP's per-object additional-light limit as low as the art
  allows [general]. For a fixed look use `FastLighting` [docs].
- `Classic` with one directional light is the intended cheap main-light path.

## MO-04 — Shadows

- Receiving: main directional light only; additional lights and lightmaps are not received [docs]. `Stylized` is a
  hard-edged toon variant; `Classic` is soft [docs].
- Casting: with `Cast Shadows` off, the generic ShadowCaster pass still draws and `discard`s in the fragment stage
  [code] — the object still costs vertex work in the shadow map. Turn **both** `Cast Shadows` and `Receive Shadows` off
  and the inspector swaps to the `…_NoShadowCaster` shader (no pass at all) [code]; or set the renderer's shadow
  casting to Off.
- A caster runs the object's vertex effects and its alpha test in the shadow pass [code]: keep heavy vertex effects and
  `Fade` off objects that must cast shadows, or accept the cost twice.
- URP asset side (shadow resolution, cascade count, distance, soft shadows) belongs to the renderer setup; small
  distance, one cascade and soft shadows off are the usual mobile choice [general].

## MO-05 — Transparency and overdraw

- Prefer the Opaque preset. `Alpha Cutoff` is the only transparency method for opaque objects; `Fade`, `Dither` and
  `Fade By Cam Distance` all work with it [docs][code].
- The Opaque preset turns `Alpha Cutoff` on. On meshes with no cutout, switch it **off**: `discard` can reduce the
  efficiency of tile-based early rejection [general].
- Transparent (queue 3000, ZWrite off) and Additive (queue 3000, `One/One`) overdraw every covered pixel [code]. Use them
  for small or short-lived meshes, never for large or stacked ones.
- Keep `Culling Mode` at Back; `Off` shades the back faces too.

## MO-06 — Texture samples

- Budget by counting: base color 1; each of Normal Map, Emission (always samples its map), Specular (when on), AO,
  Color Ramp, Matcap, Subsurface, Fade, Distortion, Depth Coloring adds 1; `ToonRamp` adds 1 per light; Texture
  Blending adds 2–3 plus its normal maps; `Triplanar` makes the base lookup 4; `Stochastic Sampling` triples every lookup
  it covers (Triplanar + Stochastic = 12 for the base color alone) [code].
- Fragment-stage UV effects (`Wave UV`, `Distortion`, `Pixelate`, `Triplanar`) change the UVs before the main texture
  read, so that read depends on earlier math [code]; avoid them on weak GPUs [general].
- Use `Matcap`, `Rim` and `Color Ramp` for look instead of extra lit textures.

## MO-07 — Vertex effects and extra passes

- `Shake`, `Inflate`, `Vertex Distortion`, `Voxelize`, `Glitch`, `Wind` run in the main pass, ShadowCaster, DepthOnly
  and DepthNormals; `Recalculate Normals` triples them [code]. Prefer one cheap vertex effect per material.
- Baked URP shaders always contain DepthOnly, DepthNormals and Meta passes in addition to main/shadow/outline [code].
  They draw only when URP needs them (depth prepass, SSAO/normals, lightmap baking) [general], but they compile — a
  reason to keep effect sets small.

## MO-08 — Renderer-wide costs

- Depth Texture: `Intersection Glow`, `Intersection Fade`, `Screen Space UV`, `Depth Coloring` and `Dither` set the
  scene-depth define [code]. URP's advice is to disable depth textures, especially on mobile [unity]. Do not enable the
  Depth Texture for a few materials; pick depth-free effects (`Rim`, `Fade By Cam Distance`) instead.
- Depth Priming: the setup tool switches it off, matching URP's mobile recommendation [code][unity].
- SSAO: integrated through URP's Screen Space Ambient Occlusion renderer feature; if the renderer has none, untick SSAO support in
  URP Settings so its variants disappear [docs][code].
- Bloom: `Emission` only reads as glow with Bloom [docs]; Bloom needs HDR and a post-processing Volume. On mobile use low
  Bloom resolution, or fake the glow with `Rim`, `Hit` and additive meshes [general].
- Render scale and MSAA are URP asset decisions that dominate fill cost more than any single effect [unity][general].

## MO-09 — Outlines

- Inverted-hull method: every outlined renderer is drawn again, so cost grows linearly with the outlined object count
  [docs]. The pass is `Cull Front`, uses the object's vertex effects and alpha effects [code].
- Needs the two `Render Objects` features on every renderer asset that renders the object (see urp-setup) [code].
- Use for the selected unit, a boss or the player. For crowds use `Rim` or a darker rim color instead.
- Hard-edged meshes show gaps; use smooth normals plus `Flat Normals` [docs]. `Clean` mode uses stencil: avoid sharing
  stencil reference values with other stencil users [code].
- Switch at runtime with `Material.SetShaderPassEnabled("OutlinePass", enabled)` — the API matches the LightMode tag
  value, which is `OutlinePass` here [unity][code]. Verify once on the target Unity and URP version.

## MO-10 — Batching

- The URP passes put material properties in `UnityPerMaterial` [code]; the vendor states SRP Batcher compatibility
  [docs]. Confirm on the shader asset ("SRP Batcher: compatible") and in the Frame Debugger ("SRP Batch" events).
- A renderer with a `MaterialPropertyBlock` is excluded from the SRP Batcher [unity]. The shipped
  `AllIn13DShaderRandomTimeSeed` sets `_TimingSeed` through an MPB [code] — do not put it on batched objects.
- The SRP Batcher batches different materials that share the same shader variant [docs][unity]. Therefore: one generic or
  baked shader for many materials is fine; many different baked shaders defeat batching — let materials with identical
  effect sets share one baked shader.
- `renderer.material` creates an instance: acceptable for batching, but create it once per object (pool it) and destroy
  it with the owner; per-hit `renderer.material` access leaks instances.
- GPU Instancing adds `multi_compile_instancing` (2× variants per pass) [code]; it is irrelevant while the SRP Batcher
  draws the objects. Disable the GPU Instancing define if the project never uses `DrawMeshInstanced` [general].

## MO-11 — Variants and build size

Full procedure in `all-in-one-3d-shader-variants-and-baking.md`. Essentials: untick unused effects in the Active Effects
List; untick unused URP features (Shadow Mask, Forward+, SSAO, Adaptive Probe Volumes, lightmaps, additional lights,
GPU instancing); bake keywords for shipping materials; never flip keywords at runtime.

## MO-12 — Global components

`WindController` (sets 8 globals), `FastLightConfigurator` (2), `ShaderGlobalTimeController` (1 vector) set globals in
`Update`; `ShadowsConfigurator` sets once unless `updateEveryFrame` [code]. They are cheap; keep one of each per scene.
Global shader values persist until changed, so a disabled configurator leaves its last values in place.

## MO-13 — Textures and memory [general]

- Compress for the target (ASTC), keep mipmaps for 3D, and size by on-screen footprint.
- Share noise textures (`_FadeTex`, `_DistortTex`, `_VertexDistortionNoiseTex`) across materials; ramps and gradients are
  tiny (the Gradient Creator makes them) — keep them small with clamp wrapping.
- Do not import the `Demo` folder into a shipping project; keep `Matcaps/` only if used.

## MO-14 — Verification

1. Shader asset inspector: SRP Batcher compatible. Frame Debugger: materials of one class collapse into few SRP batches;
   no ShadowCaster events for objects that should not cast; no depth copy pass unless intended.
2. Audit materials in bulk with **Batch Override Materials** (`Tools/AllIn1/3DShaderWindow` → *Override Materials*): choose
   scope (folders, project or scene), press **+** to add a property, use the two toggles (force-enable on all materials vs
   edit only where active), preview non-destructively, then confirm [docs]. Use it to switch off Specular, Cast Shadows
   or Alpha Cutoff across a mobile folder in one pass. Commit first — confirmation rewrites the materials.
3. Build: compare the per-shader variant counts in `Editor.log` before and after a change [general].
4. Device: capture a GPU frame on the weakest supported phone; the numbers in MO-15 are starting points, not proof.

## MO-15 — Budget table (working targets)

| Class | Lighting | Pixel texture samples | Allowed | Avoid |
|---|---|---|---|---|
| Unlit (pickups, markers) | `None` + white ambient | ≤ 2 | Rim, Hit, Emission map, Scroll, Color Ramp | shadows, normal map, specular |
| Crowd (enemies, small props) | `FastLighting` or `Classic` | ≤ 3 | Hit, Rim, Fade/Alpha Cutoff, Albedo From Vertex Color, Inflate, Shake | normal map, specular, reflections, outline, cast shadows |
| Standard (props, NPCs) | `Classic`, `HalfLambert`, `Toon` | ≤ 4 | Normal Map **or** Matcap, Receive Shadows, Highlights, Height Gradient | anisotropic, triplanar, per-object outline |
| Hero (player, boss) | `Toon`, `Classic`, `PBR` | ≤ 6 | Normal Map, Specular, Rim, Outline, Emission | stochastic, texture blending, recalculate normals |
| Environment | `Toon`, `HalfLambert`, `FastLighting`, lightmapped | ≤ 3 | Height Gradient, Wind on foliage, Receive Shadows, Fog | triplanar, stochastic, screen-space/depth effects |
