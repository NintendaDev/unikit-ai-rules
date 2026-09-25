# Shapes — Immediate mode: lifecycle and draw state

> **Base path:** `Assets/Third-Party Assets/Shapes/Scripts/Runtime/Immediate Mode/`
> See also: [shapes-draw-api.md](shapes-draw-api.md) (which `Draw.*` overloads exist), [shapes-setup-performance.md](shapes-setup-performance.md) (render features, batching)

---

## Where drawing may happen

| Context | Allowed? | How |
|---|---|---|
| `ImmediateModeShapeDrawer.DrawShapes(Camera cam)` | Yes — the default | `using (Draw.Command(cam)) { … }` |
| `RenderPipelineManager.beginCameraRendering` / `Camera.onPreRender` handler of your own | Yes | Same `Draw.Command(cam)` block |
| `OnDrawGizmos` / `OnDrawGizmosSelected` | Yes, **without** a command | Direct draw, no instancing (case DEBUG-01) |
| IMGUI `Repaint` in `OnGUI` / editor windows | Yes, without a command | Call `Draw.PrepareForIMGUI()` first (case DEBUG-05) |
| `Update`, `LateUpdate`, coroutines | No | Commands for a camera that does not render that frame are never released |
| `ImmediateModeCanvas.DrawCanvasShapes` / `ImmediateModePanel.DrawPanelShapes` | Yes | The canvas already opened the command and set the matrix |

---

## `ImmediateModeShapeDrawer`

```csharp
public class ImmediateModeShapeDrawer : MonoBehaviour
{
    public bool useCullingMasks;                 // draw only for cameras whose cullingMask sees this GameObject's layer
    public virtual void DrawShapes(Camera cam);  // override: called once per rendering camera
    public virtual void OnEnable();              // subscribes the camera hook
    public virtual void OnDisable();             // unsubscribes it
}
```

- Built-in RP hooks `Camera.onPreRender`; URP/HDRP hook `RenderPipelineManager.beginCameraRendering`.
- Preview and reflection-probe cameras are skipped automatically. Every other camera — Game, **Scene view**, extra
  cameras, render-texture cameras — calls `DrawShapes`. Filter explicitly.
- Add `[ExecuteAlways]` to see the drawing in the Scene view and edit mode; without it, drawing starts in Play Mode.
- Overriding `OnEnable`/`OnDisable` means `public override` + `base.OnEnable()`/`base.OnDisable()`. This is a forced
  exception to "Unity lifecycle methods are private" — the base declares them public virtual.

```csharp
using Shapes;
using UnityEngine;

[ExecuteAlways]
public sealed class ThreatRingDrawer : ImmediateModeShapeDrawer
{
    [SerializeField] private Camera _gameplayCamera;

    private PolylinePath _outline;

    public override void OnEnable()
    {
        base.OnEnable();
        _outline = new PolylinePath();
        BuildOutline();
    }

    public override void OnDisable()
    {
        _outline.Dispose();
        base.OnDisable();
    }

    public override void DrawShapes(Camera cam)
    {
        bool isGameCamera = cam == _gameplayCamera;
        bool isSceneView = cam.cameraType == CameraType.SceneView;

        if (isGameCamera == false && isSceneView == false)
        {
            return;
        }

        using (Draw.Command(cam))
        {
            Draw.ResetAllDrawStates();
            Draw.Matrix = transform.localToWorldMatrix;
            Draw.Polyline(_outline, closed: true, thickness: 0.05f, Color.red);
        }
    }

    private void BuildOutline()
    {
        for (int i = 0; i < 32; i++)
        {
            float angle = i / 32f * ShapesMath.TAU;
            _outline.AddPoint(ShapesMath.AngToDir(angle));
        }
    }
}
```

### Camera filters

| Want | Filter |
|---|---|
| Only the gameplay camera | `if (cam != _camera) return;` |
| Gameplay camera + Scene view while editing | also accept `cam.cameraType == CameraType.SceneView` |
| Every camera that renders this object's layer | set `useCullingMasks = true` on the drawer |
| Never in the Scene view (HUD) | `if (cam.cameraType == CameraType.SceneView) return;` |

### Multiple drawers and order

Separate drawers draw in the order they were **enabled** (subscription order). Order across drawers is therefore
fragile. When relative paint order matters (HUD layers, overlays), keep **one** drawer per camera that calls plain
`DrawXxx()` methods on other components inside its single command (case HUD-01).

### Manual hook without the helper

```csharp
private void OnEnable() => RenderPipelineManager.beginCameraRendering += OnBeginCameraRendering;
private void OnDisable() => RenderPipelineManager.beginCameraRendering -= OnBeginCameraRendering;

private void OnBeginCameraRendering(ScriptableRenderContext context, Camera cam)
{
    if (cam != _camera)
    {
        return;
    }

    using (Draw.Command(cam))
    {
        Draw.Disc(_target.position, Vector3.up, 0.5f, Color.cyan);
    }
}
```

Use this only when inheriting from `ImmediateModeShapeDrawer` is impossible (the class already has a base class).

---

## `Draw.Command`

```csharp
DrawCommand Draw.Command(Camera cam);                                         // default injection point
DrawCommand Draw.Command(Camera cam, CameraEvent cameraEvent);               // built-in RP
DrawCommand Draw.Command(Camera cam, RenderPassEvent cameraEvent);           // URP (URP_INSTALLED)
DrawCommand Draw.Command(Camera cam, CustomPassInjectionPoint cameraEvent);  // HDRP (HDRP_INSTALLED)
```

- Default injection point = **just before post-processing**: `CameraEvent.BeforeImageEffects` (built-in),
  `RenderPassEvent.BeforeRenderingPostProcessing` (URP), `CustomPassInjectionPoint.BeforePostProcess` (HDRP). Shapes
  therefore receive bloom, color grading and other post effects. For HUD elements that must stay ungraded pass an
  explicit later event (URP: `RenderPassEvent.AfterRenderingPostProcessing`) and check the result on the target
  renderer — the default is the only injection point the vendor documents.
- `DrawCommand` is pooled and `IDisposable`; always use it in `using`. Its `Dispose` flushes the last batch and
  registers the command with the pipeline.
- With `ShapesConfig.pushPopStateInDrawCommands` (default on) the command pushes the full style + matrix on entry and
  pops it on dispose — state set inside does not leak out. It does **not** reset state on entry: state left by code
  outside any command (e.g. a gizmo) is still visible inside.
- URP registration relies on `ShapesRenderFeature` on the camera's renderer. Missing feature → no pass is enqueued,
  nothing renders, and the command list for that camera grows every frame. `DrawCommand.ClearAllCommands()` empties
  every pending command (Shapes calls it before assembly reload).
- HDRP creates a hidden `Shapes HDRP Manager` with `CustomPassVolume`s automatically; built-in RP attaches a
  `CommandBuffer` to the camera. No setup is needed there.
- Commands issued for a destroyed camera are flushed on scene unload.

---

## Draw state

State lives in static properties on `Draw`. Any parameter omitted from a `Draw.*` call is read from here.

### Style properties and defaults

| Group | Property (default) |
|---|---|
| Color | `Color` (white), `Opacity` (alpha of `Color`) |
| Blending | `BlendMode` (`Transparent`), `ScaleMode` (`Uniform`), `DetailLevel` (`Medium`) |
| Size | `Thickness` (0.05), `ThicknessSpace` (`Meters`), `Radius` (1), `RadiusSpace` (`Meters`), `SizeSpace` (`Meters`) |
| Lines | `LineGeometry` (`Billboard`), `LineEndCaps` (`Round`) |
| Polylines/polygons | `PolylineGeometry` (`Billboard`), `PolylineJoins` (`Round`), `PolygonTriangulation` (`EarClipping`) |
| Discs/n-gons | `DiscGeometry` (`Flat2D`), `RegularPolygonSideCount` (6), `RegularPolygonGeometry` (`Flat2D`) |
| Depth | `ZTest` (`LessEqual`), `ZOffsetFactor` (0), `ZOffsetUnits` (0), `ColorMask` (`All`) |
| Stencil | `StencilComp` (`Always`), `StencilOpPass` (`Keep`), `StencilRefID` (0), `StencilReadMask` (255), `StencilWriteMask` (255) |
| Dashes | `UseDashes` (false), `DashStyle` (`defaultDashStyle`: Basic, Relative, Off, 4, 4), `DashType`, `DashSpace`, `DashSnap`, `DashSize`, `DashSpacing`, `DashOffset`, `DashShapeModifier`, `DashSizeUniform` (setter) |
| Gradient fill | `UseGradientFill` (false), `GradientFill`, `GradientFillType`, `GradientFillSpace`, `GradientFillColorStart/End`, `GradientFillLinearStart/End`, `GradientFillRadialOrigin`, `GradientFillRadialRadius` |
| Text | `TextStyle`, `Font`, `FontSize` (1), `FontStyle`, `TextAlign` (`Center`), `TextCharacterSpacing`, `TextWordSpacing`, `TextLineSpacing`, `TextParagraphSpacing`, `TextMargins`, `TextWrap`, `TextOverflow`, `TextCurvature`, `TextCurvaturePivot` |

Immediate-mode defaults differ from component defaults: `Draw.LineGeometry` and `Draw.PolylineGeometry` default to
`Billboard`, `Draw.PolylineJoins` to `Round`, `Draw.Thickness` to 0.05. Set them explicitly for flat 2D work.

`ThicknessSpace`, `RadiusSpace`, `SizeSpace`, `LineGeometry`, `PolylineGeometry`, `DiscGeometry`, `BlendMode`, all
depth/stencil state and all dash/fill state are **state-only** — no overload takes them as a parameter.

### Reset

| Call | Resets |
|---|---|
| `Draw.ResetAllDrawStates()` | style + matrix |
| `Draw.ResetStyle()` | style (incl. color), not the matrix |
| `Draw.ResetMatrix()` | matrix to identity |

### Scopes (push on creation, pop on dispose)

| Scope | Saves / restores | Side effect |
|---|---|---|
| `using (Draw.Scope)` | full style + matrix | — |
| `using (Draw.StyleScope)` | style only | — |
| `using (Draw.MatrixScope)` | `Draw.Matrix` | — |
| `using (Draw.ColorScope)` | `Draw.Color` | — |
| `using (Draw.DashedScope())` / `Draw.DashedScope(DashStyle)` | `UseDashes` + `DashStyle` | turns dashes **on** (and sets the style) |
| `using (Draw.GradientFillScope())` / `Draw.GradientFillScope(GradientFill)` | `UseGradientFill` + `GradientFill` | turns the fill **on** (and sets it) |

Explicit forms exist: `Draw.Push()/Pop()`, `PushStyle()/PopStyle()`, `PushMatrix()/PopMatrix()`,
`PushColor()/PopColor()`. An unbalanced pop logs an error instead of throwing.

```csharp
using (Draw.DashedScope(DashStyle.MeterDashes(DashType.Rounded, 0.3f, 0.2f)))
{
    Draw.Ring(center, Vector3.up, radius, 0.05f, Color.yellow);   // dashed
}
Draw.Ring(center, Vector3.up, radius + 0.2f, 0.05f, Color.white); // solid again
```

### Matrix helpers

| Member | Effect |
|---|---|
| `Draw.Matrix` (get/set) | Current local-to-world matrix for every following call |
| `Draw.SetMatrix(Transform)`, `SetMatrix(Matrix4x4)`, `SetMatrix(pos, rot, scale)` | Replace the matrix |
| `Draw.ApplyMatrix(Matrix4x4)` | `Matrix *= m` |
| `Draw.Translate(x, y[, z])`, `Translate(Vector2/Vector3)` | Move in current local space |
| `Draw.Rotate(float angle)` | Around local Z, radians |
| `Draw.Rotate(x, y, z)`, `Rotate(float angle, Vector3 axis)`, `Rotate(Quaternion)` | Radians / axis-angle / quaternion |
| `Draw.Scale(float)`, `Scale(x, y[, z])`, `Scale(Vector2/Vector3)` | Scale current space |
| `Draw.Position`, `Position2D`, `Rotation`, `Angle2D`, `LocalScale` | Read/write components of the matrix |
| `Draw.Right`, `Up`, `Forward` / `RightBasis`, `UpBasis`, `ForwardBasis` | Normalized / scaled basis vectors |

Positional overload parameters (`pos`, `normal`, `rot`) are applied on top of `Draw.Matrix` by push-translate-pop, so
`Draw.Matrix = transform.localToWorldMatrix` plus `Draw.Disc(localPos, …)` draws in the object's local space.
`Draw.Postition` / `Postition2D` (typos) are compile errors; `SetPosition*` helpers do not exist.

---

## Paint order and depth

- Immediate-mode shapes ignore sorting layers and render queues. Inside one command each call paints over the
  previous one unless depth rejects it.
- `Opaque` shapes write and test depth; draw them first so later transparent shapes are depth-rejected behind them.
- Everything else tests depth (`ZTest = LessEqual`) but does not write it. For overlays that must ignore world
  geometry set `Draw.ZTest = CompareFunction.Always`.
- Text drawn with `Draw.Text` ignores custom depth/stencil state.

---

## Canvas drawing: `ImmediateModeCanvas`, `ImmediateModePanel`, `ImCanvasContext`

For vector UI laid out by uGUI `RectTransform`s — including **Screen Space – Overlay** canvases, where shape
components cannot render.

| Type | Put on | Override | Receives |
|---|---|---|---|
| `ImmediateModeCanvas : ImmediateModeShapeDrawer` (`[RequireComponent(typeof(Canvas))]`) | the Canvas GameObject | `DrawCanvasShapes(ImCanvasContext ctx)` — **not** `DrawShapes` | `ctx.canvasRect` (whole canvas in UI units), `ctx.camera`, `ctx.canvas`, matrices |
| `ImmediateModePanel : MonoBehaviour` | any `RectTransform` below that canvas | `DrawPanelShapes(Rect rect, ImCanvasContext ctx)` | `rect` = this panel's local `RectTransform.rect` |

- The canvas opens the command, forces `Draw.ZTest = Always`, sets `Draw.Matrix` to canvas space, then calls
  `DrawCanvasShapes`. Call `DrawPanels()` from inside it at the point where panels should paint (background before,
  foreground after).
- Units are canvas units (reference-resolution pixels after `CanvasScaler`), so thicknesses like `4f` mean 4 UI units.
- Panels register themselves on enable; a panel without an `ImmediateModeCanvas` ancestor logs a warning and never
  draws.
- Camera rules: Overlay canvases draw for game cameras on the same `targetDisplay`; World/Camera-space canvases draw
  only for `Canvas.worldCamera`; the Scene view draws unless the object is scene-hidden.

Full recipe: case HUD-06.

---

## Play Mode and editor notes

- `Draw` state is static. With "Enter Play Mode Options" (no domain reload) it survives between play sessions — one
  more reason to reset or set state at the top of every command.
- Shapes flushes its immediate-mode material pool on scene unload, before assembly reload and on Play Mode
  transitions; do not cache `Material` references taken from Shapes internals.
- `[ExecuteAlways]` drawers run in edit mode; guard play-only data (`if (Application.isPlaying == false) …`) when the
  drawn values come from runtime systems.
