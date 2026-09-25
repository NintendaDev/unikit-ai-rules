---
version: 1.0.0
---

# Shapes

> **Scope**: Shapes by Freya Holmér (v4.6, namespace `Shapes`) — GPU vector graphics for Unity: choosing between shape components and immediate-mode drawing, the shared styling model (thickness spaces, geometry, blend modes, dashes, gradients, depth and stencil), render-pipeline and build setup, batching and performance rules, and a case library of HUD, world-space, procedural and debug drawing recipes.
> **Load when**: drawing lines, circles, rings, arcs, rectangles, polygons or 3D primitives with Shapes, building telegraph zones, range indicators or HUD gauges from vector shapes, scripting Shapes components at runtime, writing an ImmediateModeShapeDrawer or Draw.Command code, drawing debug gizmos or editor overlays with Shapes, setting Shapes up for URP, HDRP or a player build, debugging shapes that are invisible, mis-sorted, aliased, leaking draw commands or not batching.
> **References**: `.unikit/memory/code/stack/references/shapes-components.md` (component catalog), `.unikit/memory/code/stack/references/shapes-immediate-mode.md` (immediate-mode lifecycle and draw state), `.unikit/memory/code/stack/references/shapes-draw-api.md` (Draw.* overload grammar), `.unikit/memory/code/stack/references/shapes-styling.md` (shared visual options), `.unikit/memory/code/stack/references/shapes-setup-performance.md` (pipelines, config, builds, batching), `.unikit/memory/code/stack/references/shapes-cases-hud.md` (HUD and UI recipes), `.unikit/memory/code/stack/references/shapes-cases-world.md` (world-space gameplay recipes), `.unikit/memory/code/stack/references/shapes-cases-procedural.md` (procedural, animated and interactive recipes), `.unikit/memory/code/stack/references/shapes-cases-debug.md` (debug and editor recipes)

---

## Core Concepts

- Shapes draws primitives with shader math, not tessellated meshes. Every flat 2D shape (Line, Disc/Ring/Pie/Arc,
  Rectangle, RegularPolygon, Triangle, Quad) is a single quad or triangle whose outline, thickness, corners and
  anti-aliasing are computed in the fragment shader. Resolution is effectively infinite and changing a radius or
  thickness costs a `MaterialPropertyBlock` write, never a re-mesh.
- Three exceptions build real geometry: **3D primitives** (Sphere, Cone, Torus, volumetric Line) use pre-baked meshes
  picked by `DetailLevel`; **Polyline** and **Polygon** generate their own mesh from points and re-mesh when points,
  joins or triangulation change.
- There are exactly two ways to draw, and the whole API splits along them:

| Mode | What it is | Lives | Sorted by |
|---|---|---|---|
| **Components** | `ShapeRenderer` MonoBehaviours (`Disc`, `Line`, `Rectangle`…) that add a hidden `MeshRenderer`/`MeshFilter` | Persistent GameObjects in scenes and prefabs | Render queue, sorting layer/order, depth — like any renderer |
| **Immediate mode** | Static `Draw.*` calls issued inside `using (Draw.Command(cam))`, usually from `ImmediateModeShapeDrawer.DrawShapes(cam)` | One frame, one camera — re-issued every frame | Issue order only (plus depth for `Opaque`) |

- Every component property has an immediate-mode twin: `disc.Radius` ↔ `Draw.Radius`, `line.ThicknessSpace` ↔
  `Draw.ThicknessSpace`, `shape.BlendMode` ↔ `Draw.BlendMode`. Styling knowledge transfers between the modes.
- Code lives in namespace `Shapes`, assembly `ShapesRuntime` (asmdef). An asmdef that uses Shapes must reference
  `ShapesRuntime`; the samples live in a separate `ShapesSamples` assembly that production code must not reference.

## Choosing a Mode

| Situation | Use | Why |
|---|---|---|
| A visual that designers place, tweak in the Inspector, keep in a prefab, or animate with Animator/Timeline | Components | Persistent, serialized, animatable; `OnDidApplyAnimationProperties` pushes animated values |
| A gameplay indicator that follows an object and changes a few numbers per frame (radius, fill, color) | Components | Setting properties is cheap; batching works across instances |
| Many short-lived or procedurally counted shapes (hundreds of lines, per-bullet pips, graph plots) | Immediate mode | No GameObject overhead; consecutive same-type draws are GPU-instanced |
| Screen-space HUD with custom vector widgets | Immediate mode (camera-anchored matrix) or `ImmediateModeCanvas` | One drawer composes all widgets in controlled order |
| UI inside a **Screen Space – Overlay** canvas | `ImmediateModeCanvas` + `ImmediateModePanel` | Shape components do not render in Overlay canvases |
| Debug visualization, editor-only gizmos | Immediate mode in `OnDrawGizmos`, or an `[ExecuteAlways]` drawer | No scene objects to clean up; see `shapes-cases-debug.md` |

Mixing is fine: persistent indicators as components and a debug overlay as an immediate-mode drawer in the same scene.

## Component Essentials

- Add shapes through `Tools/Shapes/Create/…`, `GameObject/Shapes/…` or `AddComponent<Disc>()`. A GameObject holds
  **one** shape (`[DisallowMultipleComponent]`) — build multi-part visuals from child objects.
- Drive shapes through their **C# properties** (`Radius`, `Thickness`, `Color`, `AngRadiansEnd`…), never through
  serialized fields via reflection or `SerializedObject` at runtime — the setters are what push values to the renderer.
- Per-frame numeric changes are cheap. Changes that switch the material variant — `BlendMode`, `Disc.Type`,
  `Rectangle.Type`, `Line.Geometry`, `Line.EndCaps`, `Polyline.Joins` — belong to setup, not to the per-frame path.
- Keep `ZTest`, `ZOffsetFactor/Units`, stencil fields, `ColorMask` and `RenderQueue` at their defaults on shapes you
  want batched: any non-default value gives that shape a private material and removes it from instancing.
- Edit `Polyline.points` / `Polygon.points` through `SetPoints`/`AddPoint`/`SetPointPosition` (they flag the mesh
  dirty). After a raw list edit, set `meshOutOfDate = true` yourself or the mesh never updates.

```csharp
using Shapes;
using UnityEngine;

public sealed class CooldownRingView : MonoBehaviour
{
    [SerializeField] private Disc _ring;   // Type = Arc, set once in the prefab

    public void SetProgress(float progress01)
    {
        _ring.AngRadiansStart = 0f;
        _ring.AngRadiansEnd = Mathf.Clamp01(progress01) * ShapesMath.TAU; // radians, never degrees
    }
}
```

Full property tables for every component: `shapes-components.md`.

## Immediate-Mode Essentials

- Inherit `ImmediateModeShapeDrawer`, override `DrawShapes(Camera cam)`, and put every `Draw.*` call inside
  `using (Draw.Command(cam)) { … }`. `DrawShapes` runs once per rendering camera (Game, Scene view, extra cameras),
  so filter the camera you mean.
- Never issue `Draw.Command` from `Update`/`LateUpdate`. Commands are released only after a camera renders them; a
  command issued for a camera that does not render that frame (hidden Game view, disabled camera) piles up.
- Draw state (`Draw.Color`, `Draw.Thickness`, `Draw.Matrix`…) is **global and static**. `Draw.Command` restores it on
  dispose (config `pushPopStateInDrawCommands`, on by default), but it does not reset it on entry — set every state
  you rely on, or call `Draw.ResetStyle()` / `Draw.ResetAllDrawStates()` first.
- Draw order is paint order. Draw opaque shapes first; keep consecutive calls of the same shape type together — each
  switch of shape type, material state or texture ends an instanced batch.
- `PolylinePath`, `PolygonPath` and `TextElement` own pooled resources: create once, reuse across frames, `Dispose()`
  in `OnDisable`/`OnDestroy`.
- **URP**: immediate mode renders only through `ShapesRenderFeature`. Every URP renderer asset used by a camera that
  receives commands needs it (`Tools/Shapes/⚙ Settings` → Render Pipeline → "Add Shapes Render Feature"). Without it
  nothing draws, no error is logged, and the unrendered commands accumulate. Components do not need the feature.
- `ImmediateModeShapeDrawer.OnEnable/OnDisable` are `public virtual`: override them as `public override` and call
  `base`, or the camera hook is never registered.

```csharp
using Shapes;
using UnityEngine;

[ExecuteAlways]
public sealed class AimLineDrawer : ImmediateModeShapeDrawer
{
    [SerializeField] private Camera _camera;
    [SerializeField] private Transform _muzzle;
    [SerializeField] private float _length = 6f;

    public override void DrawShapes(Camera cam)
    {
        if (cam != _camera)
        {
            return;
        }

        using (Draw.Command(cam))
        {
            Draw.ResetStyle();
            Draw.LineGeometry = LineGeometry.Billboard;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Thickness = 3f;

            Vector3 start = _muzzle.position;
            Vector3 end = start + _muzzle.forward * _length;
            Draw.Line(start, end, Color.white, new Color(1f, 1f, 1f, 0f)); // per-end colors fade the tip
        }
    }
}
```

Lifecycle, state tables, scopes and matrix helpers: `shapes-immediate-mode.md`. Exact overloads: `shapes-draw-api.md`.

## Units, Angles and Planes

- **Thickness/radius/size space** (`ThicknessSpace`): `Meters` scales with the world; `Pixels` keeps a constant
  on-screen size; `Noots` is resolution-independent screen size (100 noots across the shorter screen side by default).
  The property is `ThicknessSpace`, `RadiusSpace` or `SizeSpace` depending on the dimension; the enum is the same.
- **Angles are radians everywhere in code** (`AngRadiansStart/End`, `angleRadStart/End`, `Draw.Rotate`, polygon
  `Angle`). The Inspector may display degrees or turns; code never does. Use `ShapesMath.TAU` for a full turn.
- **Flat 2D shapes lie in the local XY plane** (normal = local Z). For a ground decal on the XZ plane rotate the
  component's transform 90° around X, or pass a normal/rotation to the immediate-mode overload
  (`Draw.Disc(pos, Vector3.up, radius, color)`). All Shapes shaders are double-sided (`Cull Off`).
- Pixel- and noot-sized shapes are not covered by component bounds; add `BoundsPadding` or they are frustum-culled early.

Details on spaces, `ScaleMode`, geometry modes, gradients, dashes, blend modes, depth and stencil: `shapes-styling.md`.

## Case Lookup Workflow

The case library is split by domain so only one file is loaded per task.

1. Find the task in the **Case Index** below. Open **only** the listed file and read **only** that case block — each
   block is self-contained (mode, setup, original code, pitfalls, how to adapt).
2. If no case matches, pick the nearest one by technique (e.g. "boss attack cone" → WORLD-02 sector telegraph) and
   adapt it; do not load the other case files "just in case".
3. For API detail not in the case, open exactly one API reference:
   - component property, enum member, editor menu → `shapes-components.md`
   - drawer lifecycle, draw-state defaults, scopes, matrix helpers, canvas drawing → `shapes-immediate-mode.md`
   - which `Draw.*` overload exists, paths, text, textures → `shapes-draw-api.md`
   - spaces, geometry, dashes, gradients, blend modes, sorting, depth, stencil, anti-aliasing → `shapes-styling.md`
   - render pipeline, `ShapesConfig`, builds, batching and allocation budget → `shapes-setup-performance.md`
4. **Never guess a `Draw.*` overload.** Overloads are code-generated combinations; a plausible one may not exist.
   Grep `Assets/Third-Party Assets/Shapes/Scripts/Runtime/Immediate Mode/DrawOverloads.cs` for the exact signature.

## Case Index

| ID | Case | Mode | File |
|---|---|---|---|
| HUD-01 | Camera-anchored HUD host: one drawer composes every widget, drawn on top of the world | Immediate | `shapes-cases-hud.md` |
| HUD-02 | Crosshair that punches outward on fire and flashes a hit marker | Immediate | `shapes-cases-hud.md` |
| HUD-03 | Segmented pip bar (ammo, charges, hearts) with per-pip fade-out | Immediate | `shapes-cases-hud.md` |
| HUD-04 | Radial charge / cooldown gauge with ticks, labels, moving dot and glow | Immediate | `shapes-cases-hud.md` |
| HUD-05 | Curved compass / heading strip | Immediate | `shapes-cases-hud.md` |
| HUD-06 | Vector widgets inside a uGUI Canvas (`ImmediateModeCanvas` + `ImmediateModePanel` bars) | Immediate (canvas) | `shapes-cases-hud.md` |
| HUD-07 | Frequently changing numeric text without GC (`TextElement`) | Immediate | `shapes-cases-hud.md` |
| WORLD-01 | Circular area telegraph: area fill, rim ring and a progress fill (radial or sweep) | Components | `shapes-cases-world.md` |
| WORLD-02 | Cone / sector telegraph (pie wedge with border arc) | Components | `shapes-cases-world.md` |
| WORLD-03 | Rectangular lane / charge-corridor telegraph with a filling bar | Components | `shapes-cases-world.md` |
| WORLD-04 | Selection ring or range circle under a unit (dashed, constant pixel width) | Components | `shapes-cases-world.md` |
| WORLD-05 | Aim line and ballistic arc preview with an end marker | Immediate | `shapes-cases-world.md` |
| WORLD-06 | Health bars above many enemies, facing the camera, batched | Immediate | `shapes-cases-world.md` |
| WORLD-07 | Route / waypoint path with rounded corners | Components or immediate | `shapes-cases-world.md` |
| WORLD-08 | Masked reveal: clip shapes to another shape's silhouette with the stencil buffer | Components | `shapes-cases-world.md` |
| PROC-01 | Time-driven animated array (spinner, orbiting dots, rainbow ring) | Immediate | `shapes-cases-procedural.md` |
| PROC-02 | Recursive procedural drawing with the matrix stack (tree, lightning, L-system) | Immediate | `shapes-cases-procedural.md` |
| PROC-03 | Interactive immediate-mode widget (HSV color picker: ring + 4-corner gradient quad + raycast input) | Immediate | `shapes-cases-procedural.md` |
| PROC-04 | Radial menu with highlighted sector | Immediate | `shapes-cases-procedural.md` |
| PROC-05 | Hex grid / honeycomb tiling from regular polygons | Immediate or components | `shapes-cases-procedural.md` |
| PROC-06 | Picking a look from the Shapes Gallery showcase scene | Components | `shapes-cases-procedural.md` |
| DEBUG-01 | Gizmos drawn with Shapes in `OnDrawGizmos` (no command) | Direct draw | `shapes-cases-debug.md` |
| DEBUG-02 | Runtime debug overlay drawer (toggleable, Game and Scene view) | Immediate | `shapes-cases-debug.md` |
| DEBUG-03 | Visualizing physics queries (casts, overlaps, hit normals) | Immediate | `shapes-cases-debug.md` |
| DEBUG-04 | World-space debug labels next to objects | Immediate | `shapes-cases-debug.md` |
| DEBUG-05 | Drawing inside IMGUI / editor windows (`Draw.PrepareForIMGUI`) | Direct draw | `shapes-cases-debug.md` |

## Anti-patterns

- **`Draw.*` outside a command in gameplay code.** Without `Draw.Command` shapes draw immediately via
  `Graphics.DrawMeshNow` — no instancing, and in URP/HDRP usually nothing visible. Only `OnDrawGizmos` and IMGUI
  repaint are sanctioned direct-draw contexts.
- **Issuing commands from `Update`.** Accumulates commands whenever the camera does not render; use the drawer hook.
- **Assuming draw state is clean.** Another drawer's `Draw.BlendMode = Additive` leaks into yours; set or reset state.
- **Degrees in angle parameters.** `AngRadiansEnd = 90` is 90 radians (~14 turns).
- **Constructing a `PolylinePath` every frame without `Dispose()`.** Leaks pooled meshes (watch
  `DisposableMesh.ActiveMeshCount` or `Tools/Shapes/⏱ Immediate Mode Monitor`).
- **Changing `ZTest`/stencil/`RenderQueue` on hundreds of component shapes.** Each becomes a unique material and a
  separate draw call. Prefer sorting order or a dedicated camera/layer.
- **Non-`Opaque` shapes expecting depth sorting against each other.** Only `Opaque` writes depth; transparent shapes
  sort by queue/order (components) or issue order (immediate mode).
- **Interleaving shape types in a hot immediate-mode loop** (`Disc, Line, Disc, Line…`). Group by type: draw all
  discs, then all lines.
- **Using obsolete 3.x API**: `Draw.LineDashed`, `Draw.RingGradientRadial`, `Draw.RectangleFill`,
  `Draw.RegularPolygonHollow`, `Draw.TriangleHollow`, per-shape style properties (`Draw.LineThickness`,
  `Draw.DiscRadius`) and component names like `Disc.RadiusInner`, `Rectangle.IsHollow`, `Triangle.Hollow`. They are
  compile errors in 4.x — use `Draw.DashedScope()`, `DiscColors.*`, `Draw.GradientFillScope()`, `*Border`, and the
  shared `Draw.Thickness`/`Draw.Radius`.
- **Relying on legacy scripting defines** `SHAPES_URP`/`SHAPES_HDRP`/`SHAPES_BIRP` — 4.6 detects the pipeline at
  runtime and offers to strip those defines.
- **Referencing or shipping `ShapesSamples` code.** Samples use the legacy `UnityEngine.Input` API and a name-based
  hit check; they are teaching material only.

## Source Map

| Source | Used for |
|---|---|
| `Assets/Third-Party Assets/Shapes/Scripts/Runtime/Components/*.cs` | component property catalog, lifecycle, instancing/unique-material rule, Polyline/Polygon mesh contract |
| `Assets/Third-Party Assets/Shapes/Scripts/Runtime/Immediate Mode/*.cs` (`Draw.cs`, `DrawCommand.cs`, `DrawState*.cs`, `DrawStyle.cs`, `ImmediateModeShapeDrawer.cs`, `ImmediateModeCanvas.cs`, `ImmediateModePanel.cs`, `PolylinePath.cs`, `PolygonPath.cs`, `TextElement.cs`, `ShapesRenderFeature.cs`, `ShapesRenderPass.cs`) | drawer lifecycle, command registration per pipeline, URP render-feature requirement and command accumulation, state defaults, scopes, paths, text, canvas drawing |
| `Assets/Third-Party Assets/Shapes/Scripts/Runtime/Immediate Mode/DrawOverloads.cs`, `DrawOverloadsObsolete.cs` | overload grammar and counts per shape, obsolete 3.x API and replacements |
| `Assets/Third-Party Assets/Shapes/Scripts/Runtime/Microtypes/*.cs`, `Utils/ShapesConfig.cs`, `Utils/ShapesMath.cs` | enums, `DashStyle`/`GradientFill`/`DiscColors` factories, config defaults, math helpers |
| `Assets/Third-Party Assets/Shapes/Scripts/Editor/Utils/MenuItems.cs`, `ShapesImportState.cs`, `ForceIncludeInstancing.cs`, `Windows/ShapesConfigWindow.cs` | menu paths, render-pipeline detection, settings window, build-time instancing variants |
| `Assets/Third-Party Assets/Shapes/Samples/` (six scenes, eleven scripts, `Enemy.prefab`) | HUD-01…HUD-06, PROC-01…PROC-03, PROC-06, WORLD-08 stencil setup, cross-cutting patterns |
| `Assets/Third-Party Assets/Shapes/Quick Start Guide.pdf`, `README.md`, `package.json` | two drawing modes, gizmo caveats, version 4.6.0 and Unity 6000.0 minimum |
| https://acegikmo.com/shapes/docs/ | drawing modes, units, blend modes, sorting, dashes, gradients, anti-aliasing, UI limits, instancing guidance |
| https://acegikmo.com/shapes/changelog/ | 4.0 API restructure, 4.2 text limits, 4.4 culling and `BoundsPadding`, 4.5 text changes, 4.6 pipeline/define changes |
| Context7 `/websites/acegikmo_shapes` | draw-order rules, command hook recommendations, gizmo direct-draw caveats |
| Shapes feedback forum (shapes.userecho.com) threads on builds and URP | shader-variant stripping in builds, GPUs that misreport instancing support, URP 2D renderer and Render Graph notes |
