# Shapes — Cases: world-space gameplay visuals

> **Base path:** `Assets/Third-Party Assets/Shapes/`
> See also: [shapes-components.md](shapes-components.md) (component properties), [shapes-styling.md](shapes-styling.md) (spaces, sorting, stencil)

Read only the block you need. These cases are not in the vendor samples (except the stencil setup of WORLD-08, taken
from the *Stencil* section of `Samples/Shapes Gallery.unity`); they are distilled from the component API and the
vendor's batching rules. All code is original.

**Shared conventions for ground indicators (WORLD-01…WORLD-04):**
- Flat shapes live in local XY. Put them under a `Visual` child rotated `(90, 0, 0)`; then local +X = world +X of the
  root and local +Y = the root's **forward**. Angle `π/2` points forward; angles grow counter-clockwise seen from above.
- Lift `Visual` 1–3 cm above the floor instead of using `ZOffset*` (which breaks instancing).
- Give overlapping layers increasing `SortingOrder` (area 0 → fill 1 → rim 2) so transparent layers never swap.
- Choose each node's variant (`Disc.Type`, `Rectangle.Type`, `BlendMode`) in the prefab; at runtime change numbers only.
- Pixel-thickness rims need `BoundsPadding` (bounds ignore pixel sizes).

---

## WORLD-01 — Circular area telegraph (area, rim, progress fill)

**Goal.** A danger circle on the ground that shows its full radius and fills as the attack charges.

**Mode.** Components — many simultaneous telegraphs batch per layer.

**Prefab.**

| Node (under `Visual`, rotated X = 90°) | Component | Settings |
|---|---|---|
| `Area` | `Disc` | `Type = Disc`, color alpha ~0.15, `SortingOrder = 0` |
| `Fill` | `Disc` | Radial fill: `Type = Disc`. Sweep fill: `Type = Pie`. Alpha ~0.35, `SortingOrder = 1` |
| `Rim` | `Disc` | `Type = Ring`, `ThicknessSpace = Pixels`, `Thickness = 3`, `BoundsPadding = 0.1`, `SortingOrder = 2` |

```csharp
using Shapes;
using UnityEngine;

public enum TelegraphFillMode : byte
{
    Radial = 0,
    Sweep = 1,
}

public sealed class CircleTelegraphView : MonoBehaviour
{
    private const float Forward = Mathf.PI * 0.5f;

    [SerializeField] private Disc _area;
    [SerializeField] private Disc _fill;
    [SerializeField] private Disc _rim;
    [SerializeField] private TelegraphFillMode _fillMode = TelegraphFillMode.Radial;
    [SerializeField] private AnimationCurve _fillEase = AnimationCurve.Linear(0f, 0f, 1f, 1f);

    private float _radius = 1f;

    public void SetRadius(float radius)
    {
        _radius = radius;
        _area.Radius = radius;
        _rim.Radius = radius;          // Ring radius = middle of the stroke
    }

    public void SetProgress(float progress01)
    {
        float t = _fillEase.Evaluate(Mathf.Clamp01(progress01));

        if (_fillMode == TelegraphFillMode.Radial)
        {
            _fill.Radius = _radius * t;   // grows from the centre
            return;
        }

        _fill.Radius = _radius;
        _fill.AngRadiansStart = Forward;
        _fill.AngRadiansEnd = Forward - t * ShapesMath.TAU;   // clockwise from the root's forward, like a clock hand
    }

    public void SetTint(Color area, Color fill, Color rim)
    {
        _area.Color = area;
        _fill.Color = fill;
        _rim.Color = rim;
    }
}
```

**Pitfalls.**
- The sweep `Pie` covers `|end − start|`; at exactly `TAU` it fades into a full disc — that is expected.
- A flat disc on sloped or uneven ground clips into the terrain. Shapes has no projection; for terrain use a decal, or
  accept `ZTest = Always` on the rim only (that rim then loses instancing).
- Fading the whole telegraph: put a `ShapeGroup` on the root and change its alpha on appear/disappear — not per frame
  on hundreds of telegraphs (each change touches every child).

**Adapt.** Heal zones, pickup radius, AoE preview under the cursor (move the root, call `SetRadius`), shrinking
safe-zone circles (animate `Radius` of the ring over time).

---

## WORLD-02 — Cone / sector telegraph

**Goal.** A wedge in front of an attacker (breath attack, cleave, vision cone) with a bright outer edge and side edges.

**Mode.** Components.

**Prefab.** Root faces the attack direction (rotate the root around Y). Under `Visual` (X = 90°): `Area` (`Disc`,
`Type = Pie`), `Fill` (`Disc`, `Type = Pie`), `Edge` (`Disc`, `Type = Arc`, `ThicknessSpace = Pixels`), `SideA` and
`SideB` (`Line`, `Geometry = Flat2D`, `ThicknessSpace = Pixels`, `EndCaps = Round`).

```csharp
using Shapes;
using UnityEngine;

public sealed class SectorTelegraphView : MonoBehaviour
{
    private const float Forward = Mathf.PI * 0.5f;

    [SerializeField] private Disc _area;
    [SerializeField] private Disc _fill;
    [SerializeField] private Disc _edge;
    [SerializeField] private Line _sideA;
    [SerializeField] private Line _sideB;

    private float _radius = 1f;

    public void SetShape(float radius, float halfAngleRadians)
    {
        _radius = radius;
        float start = Forward - halfAngleRadians;
        float end = Forward + halfAngleRadians;

        ApplySector(_area, radius, start, end);
        ApplySector(_fill, _fill.Radius, start, end);
        ApplySector(_edge, radius, start, end);

        _sideA.Start = Vector3.zero;
        _sideA.End = ShapesMath.AngToDir(start) * radius;
        _sideB.Start = Vector3.zero;
        _sideB.End = ShapesMath.AngToDir(end) * radius;
    }

    public void SetProgress(float progress01) => _fill.Radius = _radius * Mathf.Clamp01(progress01);

    private static void ApplySector(Disc disc, float radius, float start, float end)
    {
        disc.Radius = radius;
        disc.AngRadiansStart = start;
        disc.AngRadiansEnd = end;
    }
}
```

**Pitfalls.** The angles are in the `Visual` node's local frame; rotate the **root** to aim, never recompute angles
from world directions per frame. `Arc` radius is the middle of its stroke — with a pixel stroke that is visually the
outer edge. For a "sweeping" attack (the wedge rotates), rotate the root; the shapes stay batched.

**Adapt.** Turret field of view, vision cones for stealth guards (tint by alert level), shotgun spread preview.

---

## WORLD-03 — Rectangular lane / charge-corridor telegraph

**Goal.** A straight corridor ahead of a charging enemy that fills from the start to the end before the dash.

**Mode.** Components.

**Prefab.** Root at the attacker, facing the lane. Under `Visual` (X = 90°): `Area` (`Rectangle`, `HardSolid`),
`Fill` (`Rectangle`, `HardSolid`), `Rim` (`Rectangle`, `HardBorder`, `ThicknessSpace = Pixels`). All three use
`Pivot = Corner`, so the rectangle grows along local +Y (forward) from the node origin without moving the node.

```csharp
using Shapes;
using UnityEngine;

public sealed class LaneTelegraphView : MonoBehaviour
{
    [SerializeField] private Rectangle _area;
    [SerializeField] private Rectangle _fill;
    [SerializeField] private Rectangle _rim;

    private float _length;

    public void SetSize(float width, float length)
    {
        _length = length;
        Vector3 centreOnLane = new Vector3(-width * 0.5f, 0f, 0f);   // Corner pivot: shift left by half the width

        ApplyRect(_area, centreOnLane, width, length);
        ApplyRect(_rim, centreOnLane, width, length);
        ApplyRect(_fill, centreOnLane, width, 0f);
    }

    public void SetProgress(float progress01) => _fill.Height = _length * Mathf.Clamp01(progress01);

    private static void ApplyRect(Rectangle rectangle, Vector3 localPosition, float width, float height)
    {
        rectangle.transform.localPosition = localPosition;
        rectangle.Width = width;
        rectangle.Height = height;
    }
}
```

**Pitfalls.** `Pivot = Center` would force a position update every frame while the fill grows — `Corner` avoids it.
Rounded types (`RoundedSolid`/`RoundedBorder`) look softer but clamp the corner radius to half the smaller side, so a
nearly empty fill turns into a pill; use hard types for the fill.

**Adapt.** Laser lines (thin, `Additive` blend), bridge/zone boundaries, "line up" attack previews. For a lane that
bends, use WORLD-07 with a thick polyline instead.

---

## WORLD-04 — Selection ring or range circle under a unit

**Goal.** A crisp ring under the selected unit (or showing weapon range) that stays the same line width at any zoom and
has slowly crawling dashes.

**Mode.** Components.

**Prefab.** `Ring` node under a `Visual` child (X = 90°) of the unit: `Disc`, `Type = Ring`, `RadiusSpace = Meters`,
`ThicknessSpace = Pixels`, `Thickness = 2–4`, `Dashed = true`, `DashType = Rounded`, `DashSpace = FixedCount`,
`DashSnap = Tiling`, `DashSize = 32`, `DashSpacing = 0.4`, `BoundsPadding = 0.2`.

```csharp
using Shapes;
using UnityEngine;

public sealed class SelectionRingView : MonoBehaviour
{
    [SerializeField] private Disc _ring;
    [SerializeField] private float _crawlPeriodsPerSecond = 0.25f;
    [SerializeField] private float _pulseSpeed = 3f;
    [SerializeField] private Color _color = Color.cyan;

    private void Update()
    {
        _ring.DashOffset = ShapesMath.Frac(_ring.DashOffset + _crawlPeriodsPerSecond * Time.deltaTime);

        Color color = _color;
        color.a *= Mathf.Lerp(0.6f, 1f, 0.5f + 0.5f * Mathf.Sin(Time.time * _pulseSpeed));
        _ring.Color = color;
    }

    public void SetRadius(float radius) => _ring.Radius = radius;

    public void SetVisible(bool isVisible) => _ring.enabled = isVisible;
}
```

**Pitfalls.** Toggle `enabled` on the shape (or the GameObject) to hide it — setting alpha to 0 still costs a draw.
`FixedCount` dashes keep their count when the radius changes; `Meters` dashes keep their length instead. Hundreds of
rings with their own `Update` are fine for rendering (instanced) but move the per-frame logic to one manager if the
script overhead shows up in the profiler.

**Adapt.** Range rings for towers (static, no crawl), aggro radius debug, target lock (`DashType = Chevron` pointing
inward).

---

## WORLD-05 — Aim line and ballistic arc preview

**Goal.** Show where a thrown or lobbed projectile will fly: a dotted arc that fades with distance and a ring at the
landing point, aligned to the ground normal.

**Mode.** Immediate — the point count changes every frame and there are no persistent objects.

**Technique.** Simulate in `LateUpdate` (physics queries belong to the update loop), store points in a fixed array,
draw only in `DrawShapes`. Dots are billboard discs with a pixel radius — all consecutive, so one instanced batch.

```csharp
using Shapes;
using UnityEngine;

public sealed class TrajectoryPreviewDrawer : ImmediateModeShapeDrawer
{
    private const int MaxPoints = 64;

    [SerializeField] private Camera _camera;
    [SerializeField] private Transform _launchPoint;
    [SerializeField] private float _launchSpeed = 12f;
    [SerializeField] private float _stepSeconds = 0.05f;
    [SerializeField] private LayerMask _groundMask = ~0;
    [SerializeField] private float _dotRadiusPixels = 4f;
    [SerializeField] private float _markerRadius = 0.5f;

    private readonly Vector3[] _points = new Vector3[MaxPoints];
    private int _pointCount;
    private bool _hasLanding;
    private RaycastHit _landing;

    private void LateUpdate() => Simulate();

    public override void DrawShapes(Camera cam)
    {
        if (cam != _camera || _pointCount < 2)
        {
            return;
        }

        using (Draw.Command(cam))
        {
            Draw.ResetStyle();
            Draw.DiscGeometry = DiscGeometry.Billboard;
            Draw.RadiusSpace = ThicknessSpace.Pixels;

            for (int i = 0; i < _pointCount; i++)
            {
                float fade = 1f - 0.7f * i / (_pointCount - 1f);
                Draw.Disc(_points[i], _dotRadiusPixels, new Color(1f, 1f, 1f, fade));
            }

            if (_hasLanding == false)
            {
                return;
            }

            Draw.DiscGeometry = DiscGeometry.Flat2D;
            Draw.RadiusSpace = ThicknessSpace.Meters;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.Ring(_landing.point + _landing.normal * 0.02f, _landing.normal, _markerRadius, 3f, Color.white);
        }
    }

    private void Simulate()
    {
        Vector3 position = _launchPoint.position;
        Vector3 velocity = _launchPoint.forward * _launchSpeed;
        _pointCount = 0;
        _hasLanding = false;

        while (_pointCount < MaxPoints)
        {
            _points[_pointCount++] = position;
            Vector3 next = position + velocity * _stepSeconds;
            velocity += Physics.gravity * _stepSeconds;

            if (Physics.Linecast(position, next, out _landing, _groundMask))
            {
                _hasLanding = true;

                if (_pointCount < MaxPoints)
                {
                    _points[_pointCount++] = _landing.point;
                }

                return;
            }

            position = next;
        }
    }
}
```

**Pitfalls.**
- `return` inside a `using (Draw.Command)` block is fine — the command is still disposed.
- Polylines cannot be dashed. For a dashed look use dots (above) or `Draw.Line` segments inside `Draw.DashedScope()`
  with `DashSpace.Meters` (the pattern restarts per segment).
- For a solid arc: keep one `PolylinePath`, `ClearAllPoints()` + `AddPoint` loop each frame, draw with
  `Draw.PolylineGeometry = PolylineGeometry.Billboard`, dispose in `OnDestroy`.

**Adapt.** Grenade arcs, jump previews, laser bounce paths (straight segments with `Draw.Line`), drag-to-aim lines
(single `Draw.Line` with per-end colors and `LineEndCap.Round`).

---

## WORLD-06 — Health bars above many enemies

**Goal.** Camera-facing bars over dozens or hundreds of enemies, drawn in a handful of draw calls.

**Mode.** Immediate — one drawer draws all bars; no per-enemy renderer.

**Technique.** Collect targets through an interface, skip off-screen ones, draw **all backgrounds first, then all
fills** so each pass is one instanced batch. Billboard by giving every rectangle the camera rotation.

```csharp
using UnityEngine;

public interface IHealthBarSource
{
    Vector3 BarAnchor { get; }

    float Health01 { get; }
}
```

```csharp
using System.Collections.Generic;
using Shapes;
using UnityEngine;

public sealed class HealthBarDrawer : ImmediateModeShapeDrawer
{
    [SerializeField] private Camera _camera;
    [SerializeField] private float _width = 1f;
    [SerializeField] private float _height = 0.12f;
    [SerializeField] private float _cornerRadius = 0.03f;
    [SerializeField] private Color _background = new Color(0f, 0f, 0f, 0.6f);
    [SerializeField] private Gradient _fillColor = new Gradient();
    [SerializeField] private bool _isHiddenWhenFull = true;

    private readonly List<IHealthBarSource> _sources = new List<IHealthBarSource>();
    private readonly List<IHealthBarSource> _visible = new List<IHealthBarSource>();

    public void Register(IHealthBarSource source) => _sources.Add(source);

    public void Unregister(IHealthBarSource source) => _sources.Remove(source);

    public override void DrawShapes(Camera cam)
    {
        if (cam != _camera)
        {
            return;
        }

        CollectVisible(cam);

        if (_visible.Count == 0)
        {
            return;
        }

        Quaternion facing = cam.transform.rotation;
        Vector3 halfLeft = facing * Vector3.left * (_width * 0.5f);
        Vector3 halfDown = facing * Vector3.down * (_height * 0.5f);

        using (Draw.Command(cam))
        {
            Draw.ResetStyle();

            foreach (IHealthBarSource source in _visible)                // pass 1: backgrounds
            {
                Draw.Rectangle(source.BarAnchor, facing, _width, _height, RectPivot.Center, _cornerRadius, _background);
            }

            foreach (IHealthBarSource source in _visible)                // pass 2: fills
            {
                float health = source.Health01;
                Vector3 corner = source.BarAnchor + halfLeft + halfDown;
                Draw.Rectangle(corner, facing, _width * health, _height, RectPivot.Corner, _cornerRadius, _fillColor.Evaluate(health));
            }
        }
    }

    private void CollectVisible(Camera cam)
    {
        _visible.Clear();

        foreach (IHealthBarSource source in _sources)
        {
            if (_isHiddenWhenFull && source.Health01 >= 1f)
            {
                continue;
            }

            Vector3 viewport = cam.WorldToViewportPoint(source.BarAnchor);
            bool isOnScreen = viewport.z > 0f && viewport.x > -0.1f && viewport.x < 1.1f && viewport.y > -0.1f && viewport.y < 1.1f;

            if (isOnScreen)
            {
                _visible.Add(source);
            }
        }
    }
}
```

**Pitfalls.**
- Bars are in meters, so they shrink with distance. For constant screen size scale `_width`/`_height` by
  `distance * k` per bar (still one batch — only numbers change).
- The fill's rounded corners collapse as `health → 0`; clamp the fill width to at least `2 * _cornerRadius` or use
  `_cornerRadius = 0` for the fill.
- Keep registration symmetric (enemy `OnEnable`/`OnDisable`) so destroyed enemies never stay in `_sources`.
- Bars are depth-tested: walls hide them. Set `Draw.ZTest = CompareFunction.Always` inside the command for
  always-visible bars.

**Adapt.** Cast bars, shield pips (loop N small rectangles), name plates (add `Draw.Text` in a third pass), off-screen
markers (clamp the viewport position to the screen edge and draw an arrow triangle there).

---

## WORLD-07 — Route / waypoint path with rounded corners

**Goal.** A path through waypoints (patrol route, planned movement, conveyor preview) with smooth corners.

**Mode.** Immediate with a cached `PolylinePath` (shown); component alternative below.

```csharp
using System.Collections.Generic;
using Shapes;
using UnityEngine;

public sealed class RoutePathDrawer : ImmediateModeShapeDrawer
{
    [SerializeField] private Camera _camera;
    [SerializeField] private float _cornerRadius = 0.5f;
    [SerializeField] private float _thickness = 0.12f;
    [SerializeField] private Color _color = new Color(0.3f, 0.9f, 1f, 0.8f);

    private PolylinePath _path;
    private bool _isDirty;
    private IReadOnlyList<Vector3> _waypoints;

    public override void OnEnable()
    {
        base.OnEnable();
        _path = new PolylinePath();
    }

    public override void OnDisable()
    {
        _path.Dispose();
        base.OnDisable();
    }

    public void SetRoute(IReadOnlyList<Vector3> waypoints)
    {
        _waypoints = waypoints;
        _isDirty = true;
    }

    public override void DrawShapes(Camera cam)
    {
        if (cam != _camera || _waypoints == null || _waypoints.Count < 2)
        {
            return;
        }

        if (_isDirty)
        {
            RebuildPath();
        }

        using (Draw.Command(cam))
        {
            Draw.ResetStyle();
            Draw.PolylineGeometry = PolylineGeometry.Flat2D;
            Draw.Matrix = Matrix4x4.TRS(Vector3.up * 0.02f, Quaternion.Euler(90f, 0f, 0f), Vector3.one);
            Draw.Polyline(_path, closed: false, _thickness, PolylineJoins.Round, _color);
        }
    }

    private void RebuildPath()
    {
        _isDirty = false;
        _path.ClearAllPoints();
        _path.AddPoint(ToPlane(_waypoints[0]));

        for (int i = 1; i < _waypoints.Count - 1; i++)
        {
            _path.ArcTo(ToPlane(_waypoints[i]), ToPlane(_waypoints[i + 1]), _cornerRadius);   // arc points only
        }

        _path.AddPoint(ToPlane(_waypoints[_waypoints.Count - 1]));
    }

    private static Vector3 ToPlane(Vector3 world) => new Vector3(world.x, world.z, 0f);   // XZ ground → path XY
}
```

**Pitfalls.**
- `ArcTo(corner, next, radius)` adds only the arc wedged into the corner; the final waypoint needs an explicit
  `AddPoint`. It warns and does nothing if the path is empty.
- `Flat2D` polylines flatten Z, so map ground XZ into the path's XY and rotate with `Draw.Matrix` (as above). For
  paths with height changes use `PolylineGeometry.Billboard` and world positions directly.
- Rebuild only when the route changes — the mesh is cached otherwise. Polylines cannot be dashed; show direction with a
  few `Draw.Triangle` arrow heads or a disc moving along the path.

**Component alternative.** A `Polyline` (Flat2D, `Joins = Round`, `Closed = false`) under a `Visual` node rotated
X = 90°; call `polyline.SetPoints(pointsInLocalXY)` when the route changes. Per-point colors/thickness via
`PolylinePoint` fade the path's tail.

**Adapt.** Patrol previews in the editor (`[ExecuteAlways]`), rope/cable visuals (`Billboard`, per-frame points),
graph plots (`Simple` joins for dense points).

---

## WORLD-08 — Masked reveal with the stencil buffer

**Goal.** Content (stripes, a pattern, a fill) visible only inside another shape's silhouette — a circular reveal, a
spotlight, a scanner window. Taken from the *Stencil* section of the Shapes Gallery ("Stencil Ball" and its children).

**Mode.** Components (immediate mode uses the same `Draw.Stencil*` state).

| Role | Settings |
|---|---|
| Mask writer | `StencilComp = Always`, `StencilOpPass = Replace`, `StencilRefID = 1`, `StencilWriteMask = 255`; `ColorMask = 0` for an invisible mask; lower `SortingOrder` than the content |
| Masked content | `StencilComp = Equal`, `StencilRefID = 1`, `StencilReadMask = 255` |
| Content outside the mask | `StencilComp = NotEqual`, `StencilRefID = 1` |

```csharp
using Shapes;
using UnityEngine;
using UnityEngine.Rendering;

public sealed class StencilRevealSetup : MonoBehaviour
{
    private const byte MaskId = 1;

    [SerializeField] private ShapeRenderer _mask;
    [SerializeField] private ShapeRenderer[] _masked;
    [SerializeField] private bool _isMaskVisible;

    private void Awake()
    {
        _mask.StencilComp = CompareFunction.Always;
        _mask.StencilOpPass = StencilOp.Replace;
        _mask.StencilRefID = MaskId;
        _mask.SortingOrder = -1;

        if (_isMaskVisible == false)
        {
            _mask.ColorMask = 0;            // writes stencil only
        }

        foreach (ShapeRenderer shape in _masked)
        {
            shape.StencilComp = CompareFunction.Equal;
            shape.StencilRefID = MaskId;
        }
    }
}
```

**Pitfalls.**
- Every shape with stencil or `ColorMask` changes gets a private material — fine for a few, not for hundreds.
- The mask must render before the content. Both are transparent by default, so order them with `SortingOrder`
  (or render queue) — distance sorting alone is unreliable.
- Other renderer features (URP decals, deferred lighting, custom passes) may use stencil bits; pick an unused ref and
  restrict with `StencilWriteMask`/`StencilReadMask`.
- Moving or scaling the mask animates the reveal; animate the mask shape, not the content.

**Adapt.** Fog-of-war holes (content = dark overlay with `NotEqual`), minimap circle clipping in world space, scanner
sweeps (mask = `Pie` rotating).
