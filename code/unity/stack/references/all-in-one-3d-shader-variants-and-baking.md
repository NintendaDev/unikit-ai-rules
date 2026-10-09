# All In One 3D Shader — Variants, Active Effects List and baking

> **Base path:** `Assets/Third-Party Assets/VFX/AllIn13DShader/`
> See also: [all-in-one-3d-shader-urp-setup.md](all-in-one-3d-shader-urp-setup.md) (URP feature defines), [all-in-one-3d-shader-mobile-optimization.md](all-in-one-3d-shader-mobile-optimization.md) (MO-11), [all-in-one-3d-shader-runtime-scripting.md](all-in-one-3d-shader-runtime-scripting.md) (runtime enabling policy)

Source tags: **[code]** shader/editor code (v2.74) · **[docs]** vendor docs · **[unity]** Unity manual · **[general]**.

## Procedure index

| ID | Procedure |
|---|---|
| VAR-01 | How the keyword model works and why it bites |
| VAR-02 | Trim the project-wide effect list (Active Effects List) |
| VAR-03 | Trim URP feature variants (feature defines) |
| VAR-04 | Bake a material's keywords into its own shader |
| VAR-05 | Share baked shaders across materials |
| VAR-06 | Runtime enabling policy and Addressables |
| VAR-07 | Build checks |
| VAR-08 | Files these tools rewrite (what to commit) |

---

## VAR-01 — Keyword model

- The generic shader declares one `shader_feature_local` per effect or enum member — 98 lines in
  `Shaders/ShaderLibrary/AllIn13DShader_ShaderFeatures.hlsl` with every effect active — plus URP `multi_compile`
  families (main-light shadows ×4, soft shadows, additional lights, fog, instancing, lightmaps, SSAO, Forward+, shadow
  mask…) that the URP defines file switches on or off [code].
- `shader_feature` compiles only the keyword combinations that materials in the build use; a combination no material
  uses is not in the player, and Unity falls back to the closest compiled variant at runtime — wrong look, or pink
  [unity][docs]. `multi_compile` families multiply regardless of use [unity].
- Unity recommends staying under ~128 keywords per shader [unity]. The vendor built the Active Effects List to prevent
  keyword bottlenecks [docs]; each unticked effect lowers the count and the editor compile time.
- Unique effect combinations in the build ≈ distinct materials × the URP multi_compile product that the renderer keeps
  after stripping. Reuse combinations; do not create many near-identical materials [docs].

## VAR-02 — Active Effects List (project-wide)

1. Open `Tools/AllIn1/3DShaderWindow` → **Effects Profile** tab (the Active Effects List).
2. Untick every effect the project will never use (niche ones first: Triplanar, Stochastic, Texture Blending, Hologram,
   Glitch, Voxelize, Recalculate Normals, Reflections, anisotropic specular). Press **Configure** at the bottom [docs].
3. The tool rewrites `Shaders/ShaderLibrary/AllIn13DShader_ShaderFeatures.hlsl` with only the enabled effects' pragmas
   [code]; Unity recompiles. Disabled effects show **Disabled In Active Effects List** and become unavailable on every
   material [docs].
4. This is a project-wide, hard-to-notice restriction: record which effects were removed and why (commit message), so a
   designer is not surprised later.

## VAR-03 — URP feature variants

Details and option list in `all-in-one-3d-shader-urp-setup.md` (URP Settings tab). Mobile rule: untick what the renderer
does not use — Shadow Mask, Forward+ (when the renderer is plain Forward), SSAO (no SSAO feature), Adaptive Probe
Volumes, lightmaps (no baked scene), additional lights (none in the game), GPU Instancing (SRP Batcher only), Light
Layers, LOD Cross Fade, decals. Each removes a multiplier from the variant product [code]. Unticking a feature removes
that code path from every material: a material then ignores additional lights or lightmaps.

## VAR-04 — Bake a material's keywords

1. Finish the material first (final effect set and values).
2. In the Material Inspector press **Bake Shader Keywords** (visible while the material uses a generic shader) [code].
3. The tool writes `AllIn13D_BakedEffects_<MaterialName>.shader` to the **Baked Shader Save Path** (Asset Window →
   *Save Paths*; default is a `Baked Shaders` folder under the config `Export` folder) and assigns it to the material
   [code][docs]. The new shader has no effect keywords; only enabled effects' code is in it [docs].
4. Passes in a baked URP shader: main + ShadowCaster (only if Cast or Receive Shadows is on) + OutlinePass (only if an
   outline is on) + always DepthOnly, DepthNormals and Meta [code].
5. **Revert To Generic Shader** (same button) restores the generic shader and removes the effects profile; the generated
   shader file stays and can be reused [docs][code].
6. A baked material is committed to its effect set: effects absent at bake time are compiled out. To change the look,
   revert, edit, bake again.

## VAR-05 — Share baked shaders

SRP Batcher groups by shader variant, so a project with one baked shader per material fragments batches [unity][code].
Bake one representative material per effect set, then assign that shader asset to every other material with the same
set (`material.shader = baked` in the editor, or via the inspector's shader dropdown), keeping their property values.
Naming: bake under a descriptive material name (`Crowd_Opaque_Hit`) — the file name is taken from the material name.

## VAR-06 — Runtime enabling and Addressables

- Do not call `EnableKeyword`/`DisableKeyword` for effects. Keep the effect enabled in the material and move its amount
  property to the off value (see the full catalog's "off" values). [docs]
- If a keyword flip is unavoidable, a material using exactly that combination must exist in the build, otherwise it turns
  pink or invisible [docs][unity].
- Addressables: the vendor's FAQ says a material combination missing from a bundle build can be made available by
  putting a material with those effects in a `Resources` folder [docs]. Keep a material and its shader in the same
  group, and do not rely on the editor looking right — test a bundled player build.

## VAR-07 — Build checks

- After a build, compare the per-shader variant counts reported in `Editor.log` with the previous build [general].
- Open the player on the weakest device and visit every material class; effects that vanish indicate a stripped
  combination.
- URP global settings include variant stripping options (strip unused variants); leave them on for mobile [general].
- Never edit Graphics Settings "Always Included Shaders" to fix a missing effect; the vendor says Unity handles
  inclusion [docs].

## VAR-08 — Files these tools rewrite

| Tool | File written | Commit? |
|---|---|---|
| Active Effects List → Configure | `Shaders/ShaderLibrary/AllIn13DShader_ShaderFeatures.hlsl` | yes — project-wide |
| URP Settings → Apply Changes | `Shaders/ShaderLibrary/AllIn13DShader_FeaturesURP_Defines.hlsl` | yes — project-wide |
| Bake Shader Keywords | `AllIn13D_BakedEffects_*.shader` in the Baked Shader Save Path, plus the effects profile asset | yes — with the material |
| Window settings | `AllIn3DShaderConfig/*.asset` (GlobalConfiguration, EffectsProfileCollection, PropertiesConfigCollection, URPSettingsUserPref) | yes if the team shares paths |

Treat the asset folder as vendor code: these writes are deliberate, reviewed changes, not incidental ones. When the
asset is updated, re-apply Configure and Apply Changes — a re-import restores the shipped defaults.
