# All In One VFX Toolkit — Mobile optimization

> **Base path:** `<AllIn1Root>` is the asset folder — the one that contains `AllIn1VfxAssemebly.asmdef` (find it with `Glob **/AllIn1VfxAssemebly.asmdef`; never hard-code its location).
> See also: [all-in-one-vfx-toolkit-effects-quickref.md](all-in-one-vfx-toolkit-effects-quickref.md) (per-effect verdicts), [all-in-one-vfx-toolkit-shaders-and-variants.md](all-in-one-vfx-toolkit-shaders-and-variants.md) (variants, SRP Batcher), [all-in-one-vfx-toolkit-runtime-scripting.md](all-in-one-vfx-toolkit-runtime-scripting.md)

What is safe on a phone, what costs, and what to avoid. **Evidence labels:** *[vendor]* stated in the vendor docs or inspector
hints · *[code]* read from the v2.32 shader/script code · *[Unity]* from Unity's own documentation · *[guide]* a working
guideline of this rule — a starting budget to verify on the weakest target device, not a measured fact. The vendor documents very
few costs ("made with efficiency in mind, even in low end devices"); nothing in this file is a profiler measurement.

---

## 1. Verdict table

### Pipeline and shader choices

| Item | Verdict | Why | Instead |
|---|---|---|---|
| `AllIn1VfxSRPBatch` shader in URP | **Use** | The only toolkit shader the SRP Batcher accepts *[code]* | — |
| CG shaders (`AllIn1Vfx`, `BuiltIn`) in URP | Limit | Work as unlit CG but are never SRP-batched *[code]* | `AllIn1VfxSRPBatch` |
| `AllIn1VfxGrabPass` | **Avoid** | Built-in only; a grab per object even with distortion off *[code]* | Drop the effect |
| `SCREENDISTORTION` | **Avoid** | "Potentially the most performance intensive effect" *[vendor]*; needs Opaque Texture *[code]*; `DISTORTONLYBACK` is worse *[vendor hint]* | Scaled ring/mesh with `ROUNDWAVEUV`, a pre-distorted texture, or a camera-shake/hit-stop for impact feel |
| URP **Opaque Texture** | **Avoid** | Extra copy pass, breaks tile-memory residency (GMEM loads) *[Unity]* | Do not turn it on for VFX |
| URP **Depth Texture** | **Avoid** | Extra depth copy/pre-pass; Unity advises disabling depth textures on mobile *[Unity]* | Do not turn it on for VFX |
| `SOFTPART`, `DEPTHGLOW` | **Avoid** | Both need the Depth Texture *[code]* | `CAMDISTFADE`, shaped alpha, `RIM`, smaller quads |
| Lit shader (`AllIn1VfxLit`) | **Avoid** for effects | 4–7 passes, whole surface function re-run per pass, always-on clip *[code]* | Unlit toolkit shader + `LIGHTANDSHADOW` fake light |
| HDR + Bloom just for `GLOW` | Limit | HDR target and a post-process chain cost bandwidth *[Unity]* | LDR brightness (`_Glow`≤1), colour ramp/tint, additive layers |
| URP 2D Renderer | Limit | Does not support soft particles, depth glow, distortion *[vendor]* | *Disable Depth and Scene Color effects* |
| Gamma/Linear switch for VFX | Avoid | Project-wide; retune instead *[guide]* | Retune colours |

### Effects (full list with IDs: the quick reference)

| Class | Effects |
|---|---|
| **OK** (default set) | Shape 1–2, `SHAPEADD`, `SPLITRGBA`, `SHAPE_N_CONTRAST`, `SHAPE_N_ROTATE`, `SHAPE_N_SHAPECOLOR`, `GLOW`, `COLORGRADING`, `HSV`, `POSTERIZE`, `RIM`, `LIGHTANDSHADOW`, `MASK`, `ALPHAFADE`, `CAMDISTFADE`, `ALPHASMOOTHSTEP`, `ALPHACUTOFF`, `TEXTURESCROLL`, `DOODLE`, `PIXELATE`, `SHAKEUV`, `SHAPETEXOFFSET`, stream effects (`OFFSETSTREAM`, `SHAPEWEIGHTS`, stream fade), `FOG` |
| **Limit** (count them; one or two per material) | Shape 3, `SHAPE_N_DISTORT`, `DISTORT`, `SHAPE1MASK`, `COLORRAMP`, `BACKFACETINT`, `FADE`, `POLARUV`, `TWISTUV`, `WAVEUV`, `ROUNDWAVEUV`, `TRAILWIDTH`, `VERTOFFSET`, `GLOWTEX`, `SHAPE_N_SCREENUV` |
| **Avoid** (hero-only, off on the low tier) | `FADEBURN` on many objects, `SCREENDISTORTION`, `SOFTPART`, `DEPTHGLOW`, Lit, any combination of three or more distortion-type effects on a large quad |

Costs behind the classes *[code]*: every enabled effect is fragment ALU; **dependent texture reads** (distortions, colour
ramp, trail width, screen distortion) serialize latency; `sin/cos/pow/atan2/sqrt` effects scale with pixels covered; the
cost of a particle effect is **pixels covered × layers × shader cost**, so a cheap effect on a huge quad can cost more than an
expensive one on a small quad.

### Scripts and authoring

| Item | Verdict | Why | Instead |
|---|---|---|---|
| `Renderer.material` created once and destroyed with its owner | OK | One allocation; SRP Batcher still batches *[Unity]* | — |
| `MaterialPropertyBlock` on toolkit renderers (incl. `All1VfxRandomTimeSeed`) | **Avoid on many** | Takes the renderer out of the SRP Batcher *[Unity]* | Owned material instance, or Custom Data on particles |
| `AllIn1VfxScrollShaderProperty/Texture` | **Avoid** | `Renderer.material` clone or shared-asset edit, writes every frame even after stopping *[code]* | Shader scroll `_ShapeXSpeed`, `TEXTURESCROLL` |
| `Material.EnableKeyword/DisableKeyword` for effects | **Avoid** | Missing variant in the build; vendor calls it less efficient *[vendor]* | Amount properties |
| `SetAllIn1VfxCustomGlobalTime` | OK (1 per scene) | One `SetGlobalVector` per frame *[code]* | — |
| `AllIn1GraphicMaterialDuplicate` / UI material instances | Limit | New material per element, never destroyed, breaks uGUI batching *[code]* | Own instance with `OnDestroy` cleanup, only for animated elements |
| `AllIn1VfxComponent`, `AllIn1ParticleHelperComponent` left on prefabs | Limit | Inert but dead data on every prefab *[code]* | Remove after authoring |
| Demo/Assets folder shipped | **Avoid** | Large; demo asmdefs compile into the player *[code]* | Copy what you use, delete the rest |
| Enabled-but-unused effects, `SHAPEDEBUG` left on | **Avoid** | Each enabled keyword is code in the shipping variant *[vendor]* | Untick before shipping |

### Particles

| Item | Verdict | Why | Instead |
|---|---|---|---|
| Burst of a few dozen short-lived particles | OK | The shipped presets use 15–20 particles *[code]* | — |
| `maxNumParticles` left at 1000 (shipped presets) | Limit | Lower to what the effect needs *[guide]* | Set it per effect |
| Noise / Limit Velocity modules on tiny bursts | Limit | Per-particle CPU work; shipped presets enable them *[code]* | Switch off unless the look needs them |
| Looping bursts (preset default: 1 s loop) | Limit | Re-fires the burst; set looping/stop action deliberately *[code]* | Non-looping + `Stop Action = Destroy`/`Disable` |
| Custom Data auto setup `Normal` stream when no effect needs normals | Limit | Extra vertex bytes per vertex *[code]* | Remove the stream |
| Large camera-facing quads with distortion/twist/polar/dissolve | **Avoid** | Pixel count × heavy shader *[code]* | Smaller quads, bake the look |
| Many stacked additive layers (core + glow + shell + sparks) | Limit | Fill rate; each layer pays the shader *[guide]* | Fewer, cheaper layers |
| Mesh shells with `Cull Off` | Limit | Back faces double fill *[code]* | Cull Back/Front |

### Textures

Max size matched to screen size (256–512 for masks/noise), ASTC per platform, mipmaps off for sprite/2D effects, sRGB off for
data textures, Read/Write off, shared shape + noise across materials *[guide]*. The package imports textures at 2048 with no
platform overrides *[code]*.

## 2. Working budgets *[guide — verify on the weakest device]*

| Budget | Starting limit | Reason |
|---|---|---|
| Enabled effects per material (beyond shape 1) | 3–5; at most one `LIMIT` heavy effect | Fragment cost is additive |
| Shapes per material | 1–2 (3 only for hero effects) | Each is a sample plus scroll maths |
| Distortion-type effects on one material (`DISTORT`, `SHAPE_N_DISTORT`, `TWISTUV`, `POLARUV`, `WAVEUV`) | 1 | They multiply dependent reads |
| Materials per effect | 2–4 (core / glow / sparks) | Draw calls and overdraw |
| Particles alive per effect | tens, not hundreds | CPU simulation and fill |
| Full-screen or near-full-screen transparent layers | 0–1 at a time | Fill rate |
| Simultaneous distinct expensive effects | 1–2 | Combine budgets, then profile |
| Distinct material assets for the same look | 1 | SRP Batcher and memory |

## 3. Replace expensive with cheap

| Expensive | Cheaper |
|---|---|
| `SCREENDISTORTION` | Short expanding ring mesh/quad with additive `ROUNDWAVEUV`; a pre-baked normal-looking texture; hit-stop or camera shake |
| `SOFTPART` / `DEPTHGLOW` | `CAMDISTFADE`; small quads that do not clip geometry; `RIM` on a shell mesh; shaped alpha edges |
| Colour Ramp | `COLORGRADING` (three colours) or tint with `_ShapeColor`; bake the gradient into the texture |
| Dissolve with burn | `ALPHAFADE` + `ALPHACUTOFF` + a bright secondary layer; burn glow only on hero targets |
| Polar / twist / wave on a static look | **Bake** it: *Render Material To Image* to a PNG, then use the baked texture with a simple material |
| Three shapes + distortions | Pre-merge two shapes into one texture (bake) and keep one scrolling noise shape |
| Lit shader | Unlit shader + `LIGHTANDSHADOW` fake light |
| Many unique textures | One atlas, `SHAPE_N_SHAPECOLOR` single-channel masks, shared noise |
| Runtime keyword toggles | Amount properties, or separate prepared material assets per tier |

Baking is the vendor's own optimisation tool *[vendor]*, but they say to do it only after profiling shows a problem.

## 4. Pipeline asset decisions

- Depth Texture and Opaque Texture are **pipeline-wide**: turning them on for one effect charges every frame of every camera
  *[Unity]*. Keep both off on the mobile quality level and build mobile effects without them. Keep them on only on a PC/high
  level that uses `SOFTPART`/`DEPTHGLOW`/`SCREENDISTORTION`; give those materials a mobile twin without the three keywords.
- Quality tiers: make **separate material assets** per tier (for example `Hit_High`, `Hit_Low`) and swap references by quality
  level or device class — do not flip keywords at runtime (variants are stripped). The same Particle System prefab can
  reference both through a small switch component.
- Render scale, MSAA and HDR are pipeline decisions; HDR + Bloom for `GLOW` is optional polish on mobile — judge it by a profile.
- SRP Batcher: keep it enabled on the pipeline asset; verify draws are labelled "SRP Batch" in the Frame Debugger.

## 5. Draw calls, batching and variants

- Same shader **variant** = same batch group: share keyword sets across materials where the look allows *[Unity]*.
- Prefer `AllIn1VfxSRPBatch` for effect materials; the CG shaders batch only through GPU instancing with identical meshes and
  the same material (*Enable GPU Instancing*), and instancing is ignored for SRP-batched shaders.
- One material asset per look; avoid unique material instances per object unless you animate per-object values.
- Dynamic batching is a CPU trade-off and usually off in modern URP mobile setups *[guide]*.
- Variants: each `shader_feature_local` keyword that a built material uses multiplies compile time and size; the toolkit's 64
  local keywords are not a problem by themselves because unused ones are stripped. Delete unused material assets, and audit
  stale keywords (editor reset leaves some on).
- Delete the Demo folder before shipping; remove unused shaders from materials that stay in the project.

## 6. Verification checklist

1. Frame Debugger: effect draws labelled "SRP Batch"; no unexpected full-screen copy passes (CopyColor/CopyDepth) on the
   mobile level.
2. GPU profiler on the weakest device (vendor tools or RenderDoc): look at fragment time and overdraw with the effect alone
   and in a worst-case combat scene; judge by sustained temperature, not a 5-second test.
3. Overdraw view in the Scene view: layered additive quads and large quads show up red.
4. Memory Profiler: texture memory after adding the effect set; confirm ASTC and no Read/Write.
5. Development build with *Strict Shader Variant Matching*: no pink materials; `Editor.log` variant counts after a build.
6. Run the effect for several minutes with and without pause to catch the `half` time-precision stutter on phones.
7. Check every quality level's pipeline asset: Depth/Opaque Texture off where materials do not need them.

## 7. Quality-tier template *[guide]*

| Tier | Allowed |
|---|---|
| Low | Shape 1–2, `ALPHACUTOFF`/`ALPHASMOOTHSTEP`, `COLORGRADING`/`HSV`, `TEXTURESCROLL`, `RIM`, stream fade; 1–2 materials; ≤ 20 particles; no distortion-type effects |
| Mid | + `DISTORT` or `SHAPE_N_DISTORT` (one), `FADE`, `COLORRAMP`, `POLARUV`/`ROUNDWAVEUV` on small quads; 3 materials |
| High | + hero-only `FADEBURN`, Bloom glow; `SCREENDISTORTION`/`SOFTPART`/`DEPTHGLOW` only where the pipeline asset enables the textures and the budget allows |
