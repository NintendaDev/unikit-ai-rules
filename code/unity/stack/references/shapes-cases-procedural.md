# Shapes — Cases: procedural, animated and interactive drawing

> **Base path:** `Assets/Third-Party Assets/Shapes/Samples/`
> See also: [shapes-immediate-mode.md](shapes-immediate-mode.md) (matrix helpers, scopes), [shapes-draw-api.md](shapes-draw-api.md) (overloads, paths)

Read only the block you need. PROC-01 is distilled from **Spinning Color Discs** (`SpinningColorDiscs.cs`), PROC-02 from
**Procedural Tree** (`ProceduralTree.cs`), PROC-03 from **Color Picker** (`IMColorPickerRenderer.cs`,
`IMColorPickerInteraction.cs`), PROC-06 describes **Shapes Gallery**. PROC-04 and PROC-05 are additional recipes. All
code is original.

---

## PROC-01 — Time-driven animated array (spinner, orbiting dots, rainbow ring)

**Goal.** N evenly spaced shapes on a circle, rotating with a secondary wobble and a rainbow color sweep — loading
spinners, orbiting pickups, idle decoration.

**Mode.** Immediate.

**Technique.** Every position and color is a pure function of `(index, time)`: no per-item state, no drift, no
allocation. All discs are consecutive → one instanced draw call.

```csharp
using Shapes;
using UnityEngine;

[ExecuteAlways]
public sealed class OrbitingDotsDrawer : ImmediateModeShapeDrawer
{
    [SerializeField] private Camera _camera;
    [SerializeField] private int _dotCount = 24;
    [SerializeField] private float _orbitRadius = 1f;
    [SerializeField] private float _dotRadius = 0.09f;
    [SerializeField] private float _turnsPerSecond = 0.25f;
    [SerializeField] private float _wobble = 0.16f;

    public override void DrawShapes(Camera cam)
    {
        if (cam != _camera && cam.cameraType != CameraType.SceneView)
        {
            return;
        }

        float time = Application.isPlaying ? Time.time : (float)Time.realtimeSinceStartupAsDouble;

        using (Draw.Command(cam))
        {
            Draw.ResetAllDrawStates();
            Draw.Matrix = transform.localToWorldMatrix;

            for (int i = 0; i < _dotCount; i++)
            {
                float t = i / (float)_dotCount;
                float angle = (t + time * _turnsPerSecond) * ShapesMath.TAU;
                angle += Mathf.Cos(angle * 2f + time * ShapesMath.TAU * 0.5f) * _wobble;   // secondary wave

                Draw.Disc(ShapesMath.AngToDir(angle) * _orbitRadius, _dotRadius, Color.HSVToRGB(t, 1f, 1f));
            }
        }
    }
}
```

**Pitfalls.** `Time.time` does not advance in edit mode, and the Scene view repaints only on interaction — preview
animation in Play Mode or read a realtime clock as above. Resetting all state at the top protects this drawer from
state left by others.

**Adapt.** Loading spinner (fade alpha by `t` instead of hue), orbiting shields, clock faces, particle-like bursts
(`t` → radius over lifetime).

---

## PROC-02 — Recursive procedural drawing with the matrix stack

**Goal.** Branching structures — trees, cracks, lightning, L-systems — generated and drawn in one pass, identical every
frame for a given seed.

**Mode.** Immediate.

**Technique.** Walk the structure with `Draw.Matrix` as the "turtle": draw a segment along local +Y, `Draw.Translate`
to its tip, derive children with `Draw.Rotate` inside `Draw.MatrixScope`, queue their matrices and process the queue
breadth-first under a global segment budget. The sample reseeds `UnityEngine.Random` every frame, which silently
changes the global random sequence used by gameplay — use a local generator instead.

```csharp
using System.Collections.Generic;
using Shapes;
using UnityEngine;

[ExecuteAlways]
public sealed class BranchingCrackDrawer : ImmediateModeShapeDrawer
{
    [SerializeField] private Camera _camera;
    [SerializeField] private uint _seed = 2353u;
    [SerializeField] private int _segmentBudget = 300;
    [SerializeField] private float _minLength = 0.2f;
    [SerializeField] private float _maxLength = 0.7f;
    [SerializeField] private float _maxTurn = 1.1f;          // radians
    [SerializeField, Range(0f, 1f)] private float _splitChance = 0.35f;
    [SerializeField] private float _thickness = 0.012f;
    [SerializeField] private Color _color = new Color(0.3f, 0.6f, 1f, 0.5f);

    private readonly Queue<Matrix4x4> _pending = new Queue<Matrix4x4>();
    private uint _state;
    private int _segmentsLeft;

    public override void DrawShapes(Camera cam)
    {
        if (cam != _camera && cam.cameraType != CameraType.SceneView)
        {
            return;
        }

        using (Draw.Command(cam))
        {
            Draw.ResetAllDrawStates();
            Draw.BlendMode = ShapesBlendMode.Additive;
            Draw.LineGeometry = LineGeometry.Flat2D;
            Draw.Thickness = _thickness;
            Draw.Color = _color;

            _state = _seed == 0u ? 1u : _seed;               // same seed → same shape every frame
            _segmentsLeft = _segmentBudget;
            _pending.Clear();
            _pending.Enqueue(transform.localToWorldMatrix);

            while (_pending.Count > 0 && _segmentsLeft > 0)
            {
                DrawSegment(_pending.Dequeue());
            }
        }
    }

    private void DrawSegment(Matrix4x4 origin)
    {
        _segmentsLeft--;
        Draw.Matrix = origin;

        float length = Mathf.Lerp(_minLength, _maxLength, Next01());
        Draw.Line(Vector3.zero, new Vector3(0f, length, 0f));
        Draw.Translate(0f, length);

        int childCount = Next01() < _splitChance ? 2 : 1;

        for (int i = 0; i < childCount; i++)
        {
            using (Draw.MatrixScope)
            {
                Draw.Rotate(Mathf.Lerp(-_maxTurn, _maxTurn, Next01()));
                _pending.Enqueue(Draw.Matrix);
            }
        }
    }

    private float Next01()
    {
        _state ^= _state << 13;                              // xorshift32: no allocation, no global side effects
        _state ^= _state >> 17;
        _state ^= _state << 5;

        return (_state & 0x00FFFFFFu) / 16777216f;
    }
}
```

**Pitfalls.**
- Without a budget the recursion never stops; breadth-first processing spreads the budget over all branches instead
  of letting the first branch consume it.
- Regenerating every frame is fine for a few hundred segments. For thousands, or when the generation is expensive,
  build a `PolylinePath` per branch once and redraw it (see PROC-03).
- 3D variant: `Draw.LineGeometry = Volumetric3D` and rotate around a random axis perpendicular to up
  (`ShapesMath.GetRandomPerpendicularVector(Vector3.up)` uses `UnityEngine.Random` — replace with the local generator).

**Adapt.** Lightning (short segments, high turn, low split, animate the seed every few frames), road networks, crack
decals that grow (`_segmentBudget` over time), fractal UI flourishes.

---

## PROC-03 — Interactive immediate-mode widget (HSV color picker)

**Goal.** A world- or UI-space widget with draggable handles, drawn entirely in immediate mode: a hue ring plus a
saturation/value square.

**Mode.** Immediate. Rendering and input live in separate components that share the widget's local space.

**Technique.**
- The hue ring is a **cached** closed `PolylinePath` whose points carry their own colors — built in `OnEnable`,
  disposed in `OnDisable`, redrawn every frame at no meshing cost.
- The saturation/value square is a single `Draw.Quad` with four corner colors (black, white, pure hue, black).
- Handles use the outline trick: a slightly larger black disc under the colored disc.
- Input converts the pointer ray into the widget's local space and intersects the local `z = 0` plane, so the widget
  works at any position, rotation and scale.

```csharp
using Shapes;
using UnityEngine;

[ExecuteAlways]
public sealed class HsvPickerView : ImmediateModeShapeDrawer
{
    private const int HueSegments = 64;

    [SerializeField] private float _ringRadius = 1f;
    [SerializeField] private float _ringThickness = 0.16f;
    [SerializeField] private float _outline = 0.03f;
    [SerializeField] private float _squareHalfSize = 0.55f;

    private PolylinePath _hueRing;
    private float _hue;
    private float _saturation = 1f;
    private float _value = 1f;

    public float RingRadius => _ringRadius;

    public float RingThickness => _ringThickness;

    public Rect Square => new Rect(-_squareHalfSize, -_squareHalfSize, 2f * _squareHalfSize, 2f * _squareHalfSize);

    public Color CurrentColor => Color.HSVToRGB(_hue, _saturation, _value);

    public override void OnEnable()
    {
        base.OnEnable();
        _hueRing = new PolylinePath();

        for (int i = 0; i < HueSegments; i++)
        {
            float hue = i / (float)HueSegments;
            _hueRing.AddPoint(ShapesMath.AngToDir(hue * ShapesMath.TAU) * _ringRadius, Color.HSVToRGB(hue, 1f, 1f));
        }
    }

    public override void OnDisable()
    {
        _hueRing.Dispose();
        base.OnDisable();
    }

    public void SetHue(float hue01) => _hue = Mathf.Repeat(hue01, 1f);

    public void SetSaturationValue(Vector2 sv01)
    {
        _saturation = Mathf.Clamp01(sv01.x);
        _value = Mathf.Clamp01(sv01.y);
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.ResetAllDrawStates();
            Draw.Matrix = transform.localToWorldMatrix;
            Draw.PolylineGeometry = PolylineGeometry.Flat2D;
            Draw.PolylineJoins = PolylineJoins.Simple;                 // cheapest joins for a dense smooth curve

            Draw.Ring(Vector3.zero, _ringRadius, _ringThickness + _outline, Color.black);
            Draw.Polyline(_hueRing, closed: true, _ringThickness);     // per-point colors

            float s = _squareHalfSize;
            Draw.Rectangle(Vector3.zero, Vector2.one * (2f * s + _outline), Color.black);
            Draw.Quad(
                new Vector3(-s, -s), new Vector3(-s, s), new Vector3(s, s), new Vector3(s, -s),
                Color.black, Color.white, Color.HSVToRGB(_hue, 1f, 1f), Color.black);

            DrawHandle(ShapesMath.AngToDir(_hue * ShapesMath.TAU) * _ringRadius, Color.HSVToRGB(_hue, 1f, 1f));
            DrawHandle(ShapesMath.Lerp(Square, new Vector2(_saturation, _value)), CurrentColor);
        }
    }

    private void DrawHandle(Vector2 position, Color color)
    {
        Draw.Disc(position, _ringThickness * 0.6f, Color.black);   // outline under the fill
        Draw.Disc(position, _ringThickness * 0.45f, color);
    }
}
```

```csharp
using Shapes;
using UnityEngine;

public sealed class HsvPickerInput : MonoBehaviour
{
    private enum DragTarget : byte
    {
        None = 0,
        Hue = 1,
        Square = 2,
    }

    [SerializeField] private HsvPickerView _view;

    private DragTarget _drag;

    private void OnDisable() => _drag = DragTarget.None;

    // Input-agnostic: feed it from mouse, touch or a VR pointer.
    public void HandlePointer(Ray worldRay, bool isPressed, bool isHeld, bool isReleased)
    {
        if (isPressed || isHeld)
        {
            Matrix4x4 toLocal = transform.worldToLocalMatrix;
            Ray localRay = new Ray(toLocal.MultiplyPoint3x4(worldRay.origin), toLocal.MultiplyVector(worldRay.direction));

            if (new Plane(Vector3.forward, 0f).Raycast(localRay, out float distance))
            {
                Vector2 point = localRay.GetPoint(distance);

                if (isPressed)
                {
                    _drag = HitTest(point);
                }

                ApplyDrag(point);
            }
        }

        if (isReleased)
        {
            _drag = DragTarget.None;
        }
    }

    private DragTarget HitTest(Vector2 point)
    {
        float halfBand = _view.RingThickness * 0.5f;
        float distanceToRing = Mathf.Abs(point.magnitude - _view.RingRadius);

        if (distanceToRing <= halfBand)
        {
            return DragTarget.Hue;
        }

        return _view.Square.Contains(point) ? DragTarget.Square : DragTarget.None;
    }

    private void ApplyDrag(Vector2 point)
    {
        if (_drag == DragTarget.Hue)
        {
            _view.SetHue(ShapesMath.DirToAng(point) / ShapesMath.TAU);
        }
        else if (_drag == DragTarget.Square)
        {
            _view.SetSaturationValue(ShapesMath.InverseLerp(_view.Square, point));
        }
    }
}
```

**Pitfalls.**
- The sample converts the ray direction with `InverseTransformDirection`, which ignores scale; with a scaled widget the
  origin and direction disagree. Use the same matrix for both (`worldToLocalMatrix`), as above.
- The quad blends corner colors bilinearly in RGB, which only approximates true HSV; raise
  `QUAD_INTERPOLATION_QUALITY` or accept the approximation.
- The sample polls the legacy `UnityEngine.Input` API; in an Input-System-only project that throws. Feed
  `HandlePointer` from your own input layer.
- Draw the widget for the cameras you intend (this view draws for every camera — add a filter for gameplay use).

**Adapt.** Sliders and knobs in diegetic UI, radial dials, draggable gizmo handles for level tools, minimap pan/zoom
controls.

---

## PROC-04 — Radial menu with a highlighted sector

**Goal.** A ring of N sectors with gaps, labels at the sector centers, and the sector under the pointer highlighted.

**Mode.** Immediate inside a Canvas (`ImmediateModePanel`, so it also works in Screen Space – Overlay).

```csharp
using Shapes;
using UnityEngine;

public sealed class RadialMenuPanel : ImmediateModePanel
{
    [SerializeField] private string[] _labels = { "Attack", "Defend", "Item", "Flee" };
    [SerializeField, Range(0.1f, 0.9f)] private float _innerFraction = 0.4f;
    [SerializeField] private float _gapRadians = 0.05f;
    [SerializeField] private float _fontSize = 180f;
    [SerializeField] private Color _idleColor = new Color(0f, 0f, 0f, 0.6f);
    [SerializeField] private Color _hoverColor = new Color(1f, 0.8f, 0.2f, 0.9f);

    private int _hoveredIndex = -1;

    private float SectorSize => ShapesMath.TAU / _labels.Length;

    private float FirstSectorStart => Mathf.PI * 0.5f - SectorSize * 0.5f;   // first sector centred at the top

    // localPoint: pointer in this RectTransform's local space (RectTransformUtility.ScreenPointToLocalPointInRectangle)
    public void SetPointer(Vector2 localPoint)
    {
        Rect rect = ((RectTransform)transform).rect;
        Vector2 offset = localPoint - rect.center;
        float outer = Mathf.Min(rect.width, rect.height) * 0.5f;
        float distance = offset.magnitude;

        if (distance < outer * _innerFraction || distance > outer)
        {
            _hoveredIndex = -1;
            return;
        }

        float angleFromFirst = Mathf.Repeat(ShapesMath.DirToAng(offset) - FirstSectorStart, ShapesMath.TAU);
        _hoveredIndex = Mathf.FloorToInt(angleFromFirst / SectorSize);
    }

    public override void DrawPanelShapes(Rect rect, ImCanvasContext ctx)
    {
        Vector2 center = rect.center;
        float outer = Mathf.Min(rect.width, rect.height) * 0.5f;
        float inner = outer * _innerFraction;
        float ringRadius = (outer + inner) * 0.5f;
        float ringThickness = outer - inner;

        for (int i = 0; i < _labels.Length; i++)
        {
            float start = FirstSectorStart + i * SectorSize + _gapRadians * 0.5f;
            float end = start + SectorSize - _gapRadians;
            Draw.Arc(center, ringRadius, ringThickness, start, end, i == _hoveredIndex ? _hoverColor : _idleColor);
        }

        Draw.FontSize = _fontSize;

        for (int i = 0; i < _labels.Length; i++)
        {
            float middle = FirstSectorStart + (i + 0.5f) * SectorSize;
            Vector2 labelPosition = center + ShapesMath.AngToDir(middle) * ringRadius;
            Draw.Text(labelPosition, _labels[i], TextAlign.Center);
        }
    }
}
```

**Pitfalls.** Sectors are laid out counter-clockwise from the top (angles grow counter-clockwise in canvas space); for
a clockwise menu subtract the index instead of adding it, in both `SetPointer` and the drawing. All arcs first, then all
labels — two batches. The panel only draws; selection still comes from your input code calling `SetPointer`.

**Adapt.** Weapon wheels (icons via `Draw.Texture(icon, center, size)` instead of text), emote wheels, pie-chart stats
(sector size proportional to a value, no gaps).

---

## PROC-05 — Hex grid / honeycomb tiling

**Goal.** A grid of hexagon cells with per-cell colors and outlines — tactics maps, build grids, hex UI.

**Mode.** Immediate (shown) or `RegularPolygon` components (the Gallery's "beehive" objects).

**Geometry.** `RegularPolygon` radius is center-to-vertex. `Angle = 0` puts a vertex on local +X (flat-top hexagon);
`Angle = π/2` (or `π/6`) puts a vertex on top (pointy-top). Pointy-top spacing: `√3 · r` horizontally, `1.5 · r`
vertically, odd rows offset by half a column.

```csharp
using Shapes;
using UnityEngine;

[ExecuteAlways]
public sealed class HexGridDrawer : ImmediateModeShapeDrawer
{
    private const float PointyTop = Mathf.PI * 0.5f;
    private static readonly float _sqrt3 = Mathf.Sqrt(3f);

    [SerializeField] private Camera _camera;
    [SerializeField] private int _columns = 12;
    [SerializeField] private int _rows = 10;
    [SerializeField] private float _cellRadius = 0.5f;
    [SerializeField] private float _gap = 0.04f;
    [SerializeField] private float _outlineThickness = 0.02f;
    [SerializeField] private Color _cellColor = new Color(0.2f, 0.25f, 0.3f, 0.8f);
    [SerializeField] private Color _outlineColor = Color.white;

    private Vector2Int _highlighted = new Vector2Int(-1, -1);

    public void SetHighlighted(Vector2Int cell) => _highlighted = cell;

    public override void DrawShapes(Camera cam)
    {
        if (cam != _camera && cam.cameraType != CameraType.SceneView)
        {
            return;
        }

        float radius = _cellRadius - _gap;

        using (Draw.Command(cam))
        {
            Draw.ResetAllDrawStates();
            Draw.Matrix = transform.localToWorldMatrix * Matrix4x4.Rotate(Quaternion.Euler(90f, 0f, 0f));  // lie on the ground

            for (int row = 0; row < _rows; row++)                        // pass 1: fills (one batch)
            {
                for (int column = 0; column < _columns; column++)
                {
                    bool isHighlighted = _highlighted.x == column && _highlighted.y == row;
                    Color color = isHighlighted ? Color.yellow : _cellColor;
                    Draw.RegularPolygon(CellCenter(column, row), 6, radius, PointyTop, 0f, color);
                }
            }

            for (int row = 0; row < _rows; row++)                        // pass 2: outlines (one batch)
            {
                for (int column = 0; column < _columns; column++)
                {
                    Draw.RegularPolygonBorder(CellCenter(column, row), 6, radius, _outlineThickness, PointyTop, 0f, _outlineColor);
                }
            }
        }
    }

    private Vector3 CellCenter(int column, int row)
    {
        float x = _sqrt3 * _cellRadius * (column + 0.5f * (row & 1));
        float y = 1.5f * _cellRadius * row;

        return new Vector3(x, y, 0f);
    }
}
```

**Pitfalls.** More than 1023 cells split into several instanced batches automatically — still cheap. For static maps
with thousands of cells consider components (frustum-culled per cell) or baking. Border thickness is inside the
radius; with `Meters` thickness the outline scales with zoom — use `Draw.ThicknessSpace = Pixels` for a constant line.

**Adapt.** Square grids (`Draw.Rectangle` per cell), range previews (color cells within N steps), board games, hex
minimaps in UI (draw inside an `ImmediateModePanel`).

---

## PROC-06 — Picking a look from the Shapes Gallery showcase scene

**Goal.** Find proven field values for a look instead of guessing: `Samples/Shapes Gallery.unity` is a labelled
showcase of every component and most options (no scripts, ~280 objects).

**Mode.** Components (values transfer 1:1 to `Draw.*` state).

| Gallery section | What it demonstrates |
|---|---|
| Blend Modes | One disc per `ShapesBlendMode` (Transparent, Additive, Screen, Lighten, Color Dodge, Multiply, Darken, Linear Burn, Color Burn, Subtract) |
| Stencil | "Stencil Ball" mask writer (`Always`/`Replace`/ref 1) with child discs reading `Equal`/ref 1 — WORLD-08 |
| Discs | Every `DiscType`, rounded arcs, radial/angular/bilinear gradients ("Disc Gradient"), dashed rings, pixel-sized discs ("Disc Px Sized") |
| Lines | All `LineEndCap`s, all three `LineGeometry` modes, dashed and two-color lines |
| Polylines | Per-point color and thickness, open vs closed, join types |
| Triangles, Quads | Per-corner colors, rounded and border triangles, `IsUsingAutoD` quads |
| Rectangles | Hard/rounded, solid/border, per-corner radii, linear/radial `GradientFill` |
| Regular Polygons | Side counts, roundness, borders, fills; the hexagon "beehive" tiling |
| Polygons | Concave outlines (ear clipping), world-space radial fill independent of the points |
| 3D primitives | Spheres (incl. pixel-sized), tori, capped/uncapped cones, cuboids |

**How to use it.**
1. Open the scene, select the object whose look matches, and copy its component (`Copy Component` → `Paste Component
   Values`) or read its fields in the Inspector.
2. Without the editor: grep the scene YAML — `grep -n "m_Name: Disc Gradient" "Assets/Third-Party Assets/Shapes/Samples/Shapes Gallery.unity"`,
   then read the MonoBehaviour block that follows; serialized names are the camelCase twins of the C# properties
   (`radiusSpace: 1` = `Pixels`, `blendMode: 2` = `Additive`, `type: 3` = `Arc`).
3. The "Title – …" labels and grid containers are plain `TextMesh`/`RectTransform` organisers, not Shapes UI.

**Pitfalls.** Sample materials for the level geometry target a specific pipeline; the gallery's shapes themselves use
Shapes shaders and render in any pipeline. Do not add the gallery scene to build settings.
