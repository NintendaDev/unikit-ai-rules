# Shapes — Setup, render pipelines, builds and performance

> **Base path:** `Assets/Third-Party Assets/Shapes/`
> See also: [shapes-immediate-mode.md](shapes-immediate-mode.md) (command lifecycle), [shapes-components.md](shapes-components.md) (unique-material rule)

---

## Installation facts (4.6.0)

| Item | Value |
|---|---|
| Minimum Unity | 6000.0 |
| Hard dependency | `com.unity.textmeshpro` (TMP is also the text backend) |
| Runtime assembly | `ShapesRuntime` (`Scripts/Runtime/Shapes Runtime.asmdef`) — reference it from every asmdef that uses `Shapes` types |
| Editor assembly | `ShapesEditor` (editor-only) |
| Samples assembly | `ShapesSamples` (`autoReferenced`) — never reference it from game code; its scripts use the legacy `UnityEngine.Input` API |
| Pipeline defines | `URP_INSTALLED` / `HDRP_INSTALLED` come from asmdef `versionDefines` (package ≥ 17.0). The old `SHAPES_URP`/`SHAPES_HDRP`/`SHAPES_BIRP` scripting defines are obsolete; Shapes offers to strip them |
| Settings asset | `Resources/Shapes Config.asset` (`ShapesConfig.Instance`), edited only through `Tools/Shapes/⚙ Settings` |
| Asset registry | `Resources/Shapes Assets.asset` (meshes, default TMP font) — do not move or rename either `Resources` asset; builds then get `null` materials silently |
| Generated shaders/materials | `Shaders/Generated Shaders/Resources/`, `Shaders/Generated Materials/` — per shape × blend mode × keywords, found by `Shader.Find` in builds |

Treat the Shapes folder as vendor code. The settings window and "Regenerate …" buttons rewrite files inside it
(`Shapes Config.asset`, generated shaders, `DrawOverloads.cs`, `GeneratedInterfaceImplementations.cs`) — run them only
as a deliberate, reviewed change.

---

## Render pipelines

| Pipeline | Components | Immediate mode |
|---|---|---|
| Built-in | Work | Command buffer attached to the camera automatically |
| URP | Work (plain `MeshRenderer`s) | Needs **`ShapesRenderFeature`** on every URP renderer asset that renders a camera receiving `Draw.Command` |
| HDRP | Work | Hidden `Shapes HDRP Manager` with custom pass volumes is created automatically |

### URP checklist

1. Open `Tools/Shapes/⚙ Settings` → *Render Pipeline*. It lists every `ScriptableRendererData` and whether it has the
   feature; press **Add Shapes Render Feature** for each renderer that immediate mode must reach (all quality levels:
   e.g. both a mobile and a PC renderer). Automatic insertion is disabled in 4.6 — it is always a manual step.
2. With the feature missing, immediate mode fails silently: no error, nothing visible, and pending commands for that
   camera keep growing. Components are unaffected, which makes the failure look like "only my drawer is broken".
3. The pass is recorded through Render Graph (`RecordRenderGraph`) and writes the active color and depth targets.
   In URP compatibility mode (Render Graph disabled) the legacy `Execute` path is used.
4. Shapes supports the URP 2D renderer (since 4.1.1); the feature is added to the 2D renderer data the same way.
5. `autoConfigureRenderPipeline` (default on) re-detects the pipeline after script reloads and regenerates shaders
   and materials when it changes.

---

## `ShapesConfig` settings

| Setting | Default | Effect |
|---|---|---|
| `useImmediateModeInstancing` | on | Batch consecutive same-type immediate draws into instanced calls |
| `pushPopStateInDrawCommands` | on | `Draw.Command` restores style/matrix on dispose (small overhead) |
| `polylineDefaultPointsPerTurn` | 64 | Density of `ArcTo`/`BezierTo` (16 jagged, 32 ok, 64 recommended, 128 very smooth) |
| `polylineBezierAngularSumAccuracy` | 2 | Accuracy of automatic bezier point counts |
| `boundsSize*` | 65536 | Bounds used by `ShapeCulling.SimpleGlobal` (effectively disables culling for such shapes) |
| `sphereDetail`, `torusDivsMinorMajor`, `coneDivs`, `cylinderDivs`, `capsuleDivs` | per `DetailLevel` | Tessellation of 3D primitives ("Apply & regenerate primitives") |
| `FRAG_OUTPUT_V4` | `half4` | Fragment output precision |
| `LOCAL_ANTI_ALIASING_QUALITY` | `High` | `Off`, `Medium`, `High` |
| `QUAD_INTERPOLATION_QUALITY` | `Medium` | Quad color interpolation |
| `NOOTS_ACROSS_SCREEN` | 100 | Definition of the `Noots` unit |

Shader settings are baked into `Shapes Config.cginc` by "Apply shader settings" — they are compile-time, not runtime.

---

## Builds

- `ForceIncludeInstancing` (an `IPreprocessShaders` step) keeps the instanced variant of every `Shapes/*` shader in
  builds. If shapes still vanish in a player but work in the editor, check in order: Graphics settings →
  *Instancing Variants* = **Keep All**; the shaders reach the build (a disabled shape of each used type in a built scene
  forces them, or add them to *Always Included Shaders*); the correct pipeline's shaders were generated (Settings →
  Force-refresh); clear `Library/ShaderCache` after pipeline switches.
- Some low-end mobile GPUs report `SystemInfo.supportsInstancing == true` but render instanced shapes wrongly
  (reported on PowerVR GE8320). Test on the lowest target device; disabling `useImmediateModeInstancing` is the
  fallback for immediate mode.
- The Samples folder ships with the asset; exclude its scenes from build settings and its code from game assemblies.

---

## Batching rules

### Components

- Shapes of the same type and material variant share one mesh and one instanced material → one draw call for many
  instances. Per-instance numbers (radius, color, thickness, angles, dash values) keep instancing.
- These break it for the shape that has them: non-default `ZTest`, `ZOffsetFactor`, `ZOffsetUnits`, `ColorMask`, any
  stencil value, explicit `RenderQueue`. The shape gets a private material.
- Different material variants batch separately: each `BlendMode`, each `Disc.Type`, each `Rectangle.Type`, each
  `Line.Geometry`/`EndCaps` combination is its own batch.
- `Polyline` and `Polygon` never instance — each is a unique mesh (plus a join mesh for Round/Bevel joins).
- Frustum culling uses per-shape bounds (`ShapeCulling.CalculatedLocal`, default since 4.4). Pixel/Noot-sized shapes
  need `BoundsPadding`; wide miter spikes are padded automatically.

### Immediate mode

- Only **consecutive** draws with the same mesh, submesh and material state merge, up to 1023 instances per batch.
  Group calls by shape type and state: `for all enemies: Disc` then `for all enemies: Line`, not interleaved.
- A state change that alters the material (blend mode, depth/stencil, geometry mode, dash or fill on/off) ends the batch.
- `Draw.Texture` batches only while the same texture repeats. `Draw.Mesh` and multi-material (fallback font) text
  never batch.
- Drawing without `Draw.Command` (gizmos) is one draw call per shape.

---

## CPU and memory budget

| Cost | Where | Mitigation |
|---|---|---|
| Re-meshing | Polyline/Polygon point, join or triangulation changes | Batch point edits (mesh rebuilds once per frame), keep point counts moderate, use `Simple` joins for dense curves |
| Path allocation | `new PolylinePath()` per frame, `AddPoints(IEnumerable)` LINQ overloads | Keep one path per purpose, `ClearAllPoints()` and refill with `AddPoint` loops |
| Leaked meshes | Undisposed `PolylinePath`/`PolygonPath` | `Dispose()` in `OnDisable`/`OnDestroy`; watch `DisposableMesh.ActiveMeshCount` |
| Text layout | Every `Draw.Text(string)` call; string building for numbers | Persistent `TextElement` + `AppendInt/AppendFloat` |
| Leaked text | Undisposed `TextElement` | Pool warns at 500, refuses at 1000 elements |
| `ShapeGroup` updates | Every color change re-applies all child shapes | Change at event rate |
| Command pile-up | Commands for cameras that never render (URP without the feature, disabled cameras, commands from `Update`) | Issue from the drawer hook; verify with the monitor |

`Tools/Shapes/⏱ Immediate Mode Monitor` shows live command, mesh and text counts — numbers that grow every frame mean
a leak or a missing render feature.

---

## Verification checklist for a new Shapes feature

1. Components only? No render feature needed. Immediate mode in URP? Feature present on every renderer used.
2. Angles converted to radians; sizes in the intended space; ground shapes rotated or given `Vector3.up` normals.
3. Depth: do ground indicators hide behind props as intended, and do they z-fight with the floor?
4. Batching: Frame Debugger shows instanced draws, not one draw per shape; no unexpected `(instance)` materials.
5. No per-frame GC from paths or text (Profiler, GC Alloc column).
6. Scene view vs Game view: camera filter is correct; HUD does not appear in the Scene view unless intended.
7. Player build on the lowest target device renders the shapes.
