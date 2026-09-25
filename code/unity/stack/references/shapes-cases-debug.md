# Shapes — Cases: debug and editor visualization

> **Base path:** `Assets/Third-Party Assets/Shapes/Scripts/`
> See also: [shapes-immediate-mode.md](shapes-immediate-mode.md) (where drawing may happen), [shapes-draw-api.md](shapes-draw-api.md) (overloads)

Read only the block you need. DEBUG-01 follows the vendor's gizmo guidance (docs and Quick Start Guide), DEBUG-05 the
vendor's own editor window (`Editor/Windows/AboutWindow.cs`). The rest are additional recipes. All code is original.

---

## DEBUG-01 — Gizmos drawn with Shapes in `OnDrawGizmos`

**Goal.** Thick, anti-aliased, pixel-width gizmos (spawn radii, patrol links, trigger volumes) instead of Unity's
1-pixel `Gizmos` lines.

**Mode.** Direct draw — the one sanctioned place for `Draw.*` without `Draw.Command`.

```csharp
using Shapes;
using UnityEngine;

public sealed class SpawnAreaGizmo : MonoBehaviour
{
    [SerializeField] private float _radius = 3f;
    [SerializeField] private Color _color = new Color(0.2f, 1f, 0.4f, 1f);

    private void OnDrawGizmos()
    {
        using (Draw.Scope)                                   // gizmo state must not leak into later commands
        {
            Draw.ResetAllDrawStates();
            Draw.Matrix = transform.localToWorldMatrix;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;
            Draw.LineGeometry = LineGeometry.Billboard;

            Draw.Ring(Vector3.zero, Vector3.up, _radius, 2f, _color);
            Draw.Line(Vector3.zero, Vector3.forward * _radius, 2f, _color);   // facing
        }
    }
}
```

**Pitfalls.**
- Direct draws are `Material.SetPass` + `Graphics.DrawMeshNow`: one draw call per shape, no instancing. Fine for
  gizmos, wrong for gameplay.
- Outside `OnDrawGizmos*` direct draws depend on the exact render timing and usually show nothing in URP/HDRP.
- Without the `Draw.Scope` wrapper, state set here (thickness space, matrix) is still set when the next
  `Draw.Command` opens, because commands restore state on exit but do not reset it on entry.
- Gizmo shapes are depth-tested; set `Draw.ZTest = CompareFunction.Always` for an x-ray view.
- Use `OnDrawGizmosSelected` for expensive or cluttering gizmos.

**Adapt.** Waypoint graphs (`Draw.Line` between nodes + `Draw.Disc` billboard at nodes), camera frustum previews,
area triggers (`Draw.Cuboid` with a transparent color plus edge lines).

---

## DEBUG-02 — Runtime debug overlay drawer (works from gameplay code)

**Goal.** Let gameplay code "draw" debug shapes from `Update`/`FixedUpdate` — like `Debug.DrawLine`, but visible in
the Game view, in builds and with durations — without breaking the rule that commands are issued only from the camera
hook.

**Mode.** Immediate. Gameplay code only **records** requests; one drawer renders them per camera.

```csharp
using System.Collections.Generic;
using Shapes;
using UnityEngine;

public sealed class DebugShapesDrawer : ImmediateModeShapeDrawer
{
    [SerializeField] private Camera _gameCamera;
    [SerializeField] private bool _isVisible = true;
    [SerializeField] private float _lineThicknessPixels = 2f;

    private readonly List<LineRequest> _lines = new List<LineRequest>();
    private readonly List<SphereRequest> _spheres = new List<SphereRequest>();

    private void LateUpdate()
    {
        int frame = Time.frameCount;
        float now = Time.time;

        for (int i = _lines.Count - 1; i >= 0; i--)                     // no closure allocation, unlike RemoveAll(lambda)
        {
            if (_lines[i].IsExpired(now, frame))
            {
                _lines.RemoveAt(i);
            }
        }

        for (int i = _spheres.Count - 1; i >= 0; i--)
        {
            if (_spheres[i].IsExpired(now, frame))
            {
                _spheres.RemoveAt(i);
            }
        }
    }

    public void Line(Vector3 from, Vector3 to, Color color, float seconds = 0f) =>
        _lines.Add(new LineRequest(from, to, color, Time.time + seconds, Time.frameCount));

    public void Sphere(Vector3 center, float radius, Color color, float seconds = 0f) =>
        _spheres.Add(new SphereRequest(center, radius, color, Time.time + seconds, Time.frameCount));

    public override void DrawShapes(Camera cam)
    {
        bool isTargetCamera = cam == _gameCamera || cam.cameraType == CameraType.SceneView;

        if (_isVisible == false || isTargetCamera == false)
        {
            return;
        }

        using (Draw.Command(cam))
        {
            Draw.ResetAllDrawStates();
            Draw.ZTest = UnityEngine.Rendering.CompareFunction.Always;   // x-ray: debug info is never hidden
            Draw.LineGeometry = LineGeometry.Billboard;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            foreach (LineRequest line in _lines)                        // grouped by type → one batch each
            {
                Draw.Line(line.From, line.To, _lineThicknessPixels, line.Color);
            }

            Draw.DiscGeometry = DiscGeometry.Billboard;

            foreach (SphereRequest sphere in _spheres)
            {
                Draw.Ring(sphere.Center, sphere.Radius, _lineThicknessPixels, sphere.Color);   // billboard ring = sphere silhouette
            }
        }
    }

    private readonly struct LineRequest
    {
        public LineRequest(Vector3 from, Vector3 to, Color color, float expiresAt, int frame)
        {
            From = from;
            To = to;
            Color = color;
            ExpiresAt = expiresAt;
            Frame = frame;
        }

        public Vector3 From { get; }

        public Vector3 To { get; }

        public Color Color { get; }

        public float ExpiresAt { get; }

        public int Frame { get; }

        public bool IsExpired(float now, int frame) => now >= ExpiresAt && frame > Frame;   // zero-duration requests live one rendered frame
    }

    private readonly struct SphereRequest
    {
        public SphereRequest(Vector3 center, float radius, Color color, float expiresAt, int frame)
        {
            Center = center;
            Radius = radius;
            Color = color;
            ExpiresAt = expiresAt;
            Frame = frame;
        }

        public Vector3 Center { get; }

        public float Radius { get; }

        public Color Color { get; }

        public float ExpiresAt { get; }

        public int Frame { get; }

        public bool IsExpired(float now, int frame) => now >= ExpiresAt && frame > Frame;
    }
}
```

**Pitfalls.**
- Expiry runs once per frame in `LateUpdate`, never in `DrawShapes` (which runs once per camera).
- `Draw.Ring(pos, radius, thickness, color)` has no normal — with `DiscGeometry.Billboard` it faces the camera, which is
  exactly a sphere's outline. A solid `Draw.Sphere` hides what is behind it; use it with a low alpha when you want volume.
- Strip the overlay from release builds: guard the request methods with
  `[System.Diagnostics.Conditional("DEVELOPMENT_BUILD"), System.Diagnostics.Conditional("UNITY_EDITOR")]` (they return
  `void`) so calls vanish from release code.
- How gameplay code reaches the drawer (serialized reference, DI, service locator) is a project decision — keep the
  drawer itself free of static state.

**Adapt.** Add request types for arrows (DEBUG-03), boxes, text (DEBUG-04); per-category toggles; a history of the
last N positions (AI paths, projectile traces).

---

## DEBUG-03 — Visualizing physics queries

**Goal.** See what a sphere cast, box overlap or raycast actually tested and what it hit: start and end volumes, the
swept path, hit points and normals.

**Mode.** Immediate — typically inside DEBUG-02's `DrawShapes`, fed by the query code's recorded results.

```csharp
using Shapes;
using UnityEngine;

public static class PhysicsQueryShapes
{
    // Call only inside an open Draw.Command, with DiscGeometry = Billboard and a Pixels thickness space.
    public static void SphereCast(
        Vector3 origin,
        Vector3 direction,
        float radius,
        float distance,
        Color color)
    {
        Vector3 end = origin + direction.normalized * distance;
        Draw.Ring(origin, radius, 2f, color);
        Draw.Ring(end, radius, 2f, color);
        Draw.Line(origin, end, 1f, color);
    }

    public static void Hit(Vector3 point, Vector3 normal, Color color)
    {
        const float arrowLength = 0.4f;
        Vector3 tip = point + normal * arrowLength;

        Draw.Line(point, tip, 2f, color);
        Draw.Cone(tip, normal, 0.05f, 0.12f, color);   // arrow head along the normal (meters)
        Draw.Disc(point, 4f, color);                    // pixel-sized dot (set RadiusSpace = Pixels)
    }

    public static void Box(Vector3 center, Quaternion rotation, Vector3 size, Color fill)
    {
        Draw.Cuboid(center, rotation, size, fill);      // use a low alpha: Cuboid is a solid box
    }
}
```

**Pitfalls.**
- Mixed spaces in one helper are the usual bug: rings/lines above use pixel thickness, the cone uses meters
  (`Draw.SizeSpace`), the hit dot uses `RadiusSpace = Pixels`. Set those three states explicitly before calling.
- Record query inputs and results where the query runs (e.g. `FixedUpdate`) and draw them later; never cast from
  inside `DrawShapes` — it runs per camera and outside the physics step.
- Interleaving rings, lines, cones and discs per query breaks batching. For many queries, loop once per shape type.

**Adapt.** Ground probes, melee hit volumes (`Box` over the active frames), AI line-of-sight checks (line colored by
result), navmesh sample points.

---

## DEBUG-04 — World-space debug labels next to objects

**Goal.** Text above objects (state names, HP, AI goals) that faces the camera and stays readable at any distance.

**Mode.** Immediate.

```csharp
using System.Collections.Generic;
using Shapes;
using UnityEngine;

public sealed class DebugLabelDrawer : ImmediateModeShapeDrawer
{
    [SerializeField] private Camera _camera;
    [SerializeField] private float _fontSizePerMeter = 0.06f;   // keeps a constant on-screen size
    [SerializeField] private Vector3 _offset = new Vector3(0f, 2.2f, 0f);

    private readonly List<(Transform Target, string Text)> _labels = new List<(Transform Target, string Text)>();

    public void SetLabels(IEnumerable<(Transform Target, string Text)> labels)
    {
        _labels.Clear();
        _labels.AddRange(labels);
    }

    public override void DrawShapes(Camera cam)
    {
        if (cam != _camera || _labels.Count == 0)
        {
            return;
        }

        Vector3 cameraPosition = cam.transform.position;
        Quaternion facing = cam.transform.rotation;

        using (Draw.Command(cam))
        {
            Draw.ResetStyle();

            foreach ((Transform target, string text) in _labels)
            {
                Vector3 position = target.position + _offset;
                float fontSize = Vector3.Distance(cameraPosition, position) * _fontSizePerMeter;
                Draw.Text(position, facing, text, fontSize, Color.white);
            }
        }
    }
}
```

**Pitfalls.**
- `Draw.Text(string)` takes a pooled TMP object per call for this command — fine for dozens of debug labels. For
  labels whose numbers change every frame, keep one `TextElement` per label and use `AppendInt`/`AppendFloat`
  (HUD-07) — building strings with interpolation allocates every frame.
- Text ignores custom `ZTest`/stencil, so labels behind walls stay hidden. For always-visible labels project the
  position to the screen and draw the text in a HUD layer instead (HUD-01).
- Do not keep references to destroyed transforms in the list; refresh the list at event rate.

**Adapt.** Damage numbers (billboard + upward drift + fade), name plates, per-object performance counters.

---

## DEBUG-05 — Drawing inside IMGUI and editor windows

**Goal.** Vector drawing inside an `EditorWindow` or a runtime `OnGUI` debug panel — graphs, dials, previews.

**Mode.** Direct draw during the IMGUI `Repaint` event (no command). The vendor's own About window uses exactly this.

```csharp
using Shapes;
using UnityEditor;
using UnityEngine;

public sealed class ShapesPreviewWindow : EditorWindow
{
    [MenuItem("Tools/Debug/Shapes Preview")]
    private static void Open() => GetWindow<ShapesPreviewWindow>("Shapes Preview");

    private void OnGUI()
    {
        if (Event.current.type != EventType.Repaint)
        {
            return;
        }

        Vector2 center = position.size * 0.5f;
        float radius = Mathf.Min(position.width, position.height) * 0.4f;

        using (Draw.Scope)
        {
            Draw.ResetAllDrawStates();
            Draw.Matrix = Matrix4x4.TRS(new Vector3(center.x, center.y, 1f), Quaternion.identity, Vector3.one);
            Draw.LineGeometry = LineGeometry.Flat2D;

            Draw.Ring(Vector3.zero, radius, 4f, Color.white);          // units are GUI points; Meters space = points
            Draw.Disc(new Vector3(0f, -radius), 8f, Color.red);        // GUI y grows downward: -radius is the top
            Draw.Line(Vector3.zero, new Vector3(radius, 0f), 3f, Color.white);
        }
    }
}
```

**Pitfalls.**
- Draw only on `EventType.Repaint`; other IMGUI events (layout, input) must not draw.
- IMGUI space is in GUI points with y pointing down, so positive angles turn **clockwise** on screen.
- Use `Meters` for all spaces here — `Pixels`/`Noots` rely on camera screen parameters that IMGUI does not set. For a
  runtime `OnGUI` panel in the Game view call `Draw.PrepareForIMGUI()` before drawing so anti-aliasing uses the correct
  screen size.
- Wrap in `Draw.Scope` (or `Draw.Push()`/`Pop()`) — the About window does the same — so the window's state never leaks
  into scene drawers.
- Animated windows need `Repaint()` from `Update` or `EditorApplication.update`.

**Adapt.** Custom inspector previews (draw inside the rect from `GUILayoutUtility.GetRect`, offset the matrix to it),
curve/graph editors for balance data, runtime debug HUDs on `OnGUI` without a camera setup.
