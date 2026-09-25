# Shapes — `Draw.*` API grammar

> **Base path:** `Assets/Third-Party Assets/Shapes/Scripts/Runtime/Immediate Mode/`
> See also: [shapes-immediate-mode.md](shapes-immediate-mode.md) (state, scopes, where drawing may happen), [shapes-styling.md](shapes-styling.md) (what each option looks like)

`DrawOverloads.cs` is generated: for each shape, every legal combination of optional "axes" becomes one overload that
forwards to a hand-written `*_Internal` method in `Draw.cs`. Omitted axes are read from `Draw.*` state.
**Before writing a call, grep `DrawOverloads.cs` for the exact parameter list** — only emitted combinations exist.

```bash
grep -o "public static void Arc( [^)]*)" "Assets/Third-Party Assets/Shapes/Scripts/Runtime/Immediate Mode/DrawOverloads.cs"
```

---

## Grammar per shape

`[x]` = optional axis, `a | b` = alternatives, `{Shape: x}` = axis only on that shape. Axes always appear in this order.

| Shape | Grammar | Overloads |
|---|---|---|
| `Line` | `(start, end [, thickness] [, endCaps] [, color \| colorStart, colorEnd])` | 12 |
| `Polyline` | `(PolylinePath path [, closed] [, thickness] [, joins] [, color])` | 16 |
| `Polygon` | `(PolygonPath path [, triangulation] [, color])` | 4 |
| `Disc` | `([pos [, normal \| rot]] [, radius] [, DiscColors colors])` | 16 |
| `Ring` | `([pos [, normal \| rot]] [, radius [, thickness]] [, DiscColors colors])` | 24 |
| `Pie` | `([pos [, normal \| rot]] [, radius], angleRadStart, angleRadEnd [, DiscColors colors])` | 16 |
| `Arc` | `([pos [, normal \| rot]] [, radius [, thickness]], angleRadStart, angleRadEnd [, ArcEndCap endCaps] [, DiscColors colors])` | 48 |
| `Rectangle` | `([pos [, normal \| rot]], rect \| size [, pivot] \| width, height [, pivot] [, cornerRadius \| cornerRadii] [, color])` | 96 |
| `RectangleBorder` | as `Rectangle` + mandatory `thickness` right before the corner radius | 96 |
| `Triangle` | `(a, b, c [, roundness] [, color \| colorA, colorB, colorC])` | 6 |
| `TriangleBorder` | `(a, b, c, thickness [, roundness] [, color \| colorA, colorB, colorC])` | 9 |
| `Quad` | `(a, b, c [, d] [, color \| colorA, colorB, colorC, colorD])` — `d` defaults to `a + (c - b)` | 6 |
| `RegularPolygon` | `([pos [, normal \| rot]] [, sideCount] [, radius] [, angle] [, roundness] [, color])` | 64 |
| `RegularPolygonBorder` | as `RegularPolygon` + `thickness` after `radius` | 80 |
| `Sphere` | `([pos] [, radius] [, color])` — no orientation | 8 |
| `Cuboid` / `Cube` | `([pos [, normal \| rot]], Vector3 size \| float size [, color])` | 8 + 8 |
| `Cone` | `([pos [, normal \| rot]], radius, length [, fillCap] [, color])` | 16 |
| `Torus` | `([pos [, normal \| rot]], radius, thickness [, angleRadStart, angleRadEnd] [, color])` — angles default to a full turn | 16 |
| `Text` | `([TextElement element] [, pos [, rot]], string content [, align] [, fontSize] [, font] [, color])` | 144 |
| `TextRect` | `([element] [, pos [, rot]], rect \| pivot, size, string content [, align] [, fontSize] [, font] [, color])` | 192 |
| `Texture` | `(texture, rect [, fillMode \| uvs] [, color])` or `(texture, center, size [, sizeMode] [, color])` | 10 |
| `Mesh` | `(mesh, material [, MaterialPropertyBlock])` — ignores all Draw state | 2 |

Rules that follow from the grammar:

- `normal` orients the shape's local Z along the vector (`Quaternion.LookRotation(normal)`); a ground-plane disc is
  `Draw.Disc(pos, Vector3.up, radius, color)`.
- `Line`, `Triangle`, `Quad` take explicit points only — no `pos`/`rot` axis. Place them with `Draw.Matrix`.
- Pie/Arc angles are mandatory and there is no state fallback for them. All angles are **radians**.
- `Rectangle` with a `Rect` has no `pivot` (the `Rect` carries its own offset); `size`/`width, height` overloads take
  `RectPivot.Center` or `RectPivot.Corner`.
- `cornerRadii` is a `Vector4`, clockwise from the bottom-left corner.
- Thickness spaces, geometry modes, blend mode, dashes, gradient fill and depth/stencil are **state only**.

### Verified signatures used most often

```csharp
Draw.Line(Vector3 start, Vector3 end, float thickness, Color color);
Draw.Line(Vector3 start, Vector3 end, float thickness, LineEndCap endCaps, Color colorStart, Color colorEnd);
Draw.Disc(Vector3 pos, Vector3 normal, float radius, DiscColors colors);
Draw.Ring(Vector3 pos, Vector3 normal, float radius, float thickness, DiscColors colors);
Draw.Ring(Vector3 pos, Quaternion rot, float radius, float thickness, DiscColors colors);
Draw.Pie(Vector3 pos, Vector3 normal, float radius, float angleRadStart, float angleRadEnd, DiscColors colors);
Draw.Arc(Vector3 pos, Vector3 normal, float radius, float thickness, float angleRadStart, float angleRadEnd, ArcEndCap endCaps, DiscColors colors);
Draw.Arc(Vector3 pos, float radius, float thickness, float angleRadStart, float angleRadEnd, ArcEndCap endCaps, DiscColors colors);
Draw.Rectangle(Rect rect, float cornerRadius, Color color);
Draw.Rectangle(Vector3 pos, Quaternion rot, float width, float height, RectPivot pivot, float cornerRadius, Color color);
Draw.RectangleBorder(Rect rect, float thickness, float cornerRadius, Color color);
Draw.RectangleBorder(Vector3 pos, Quaternion rot, float width, float height, RectPivot pivot, float thickness, float cornerRadius, Color color);
Draw.RegularPolygon(Vector3 pos, Vector3 normal, int sideCount, float radius, float angle, float roundness, Color color);
Draw.Triangle(Vector3 a, Vector3 b, Vector3 c, float roundness, Color color);
Draw.Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d, Color colorA, Color colorB, Color colorC, Color colorD);
Draw.Sphere(Vector3 pos, float radius, Color color);
Draw.Cone(Vector3 pos, Vector3 normal, float radius, float length, bool fillCap, Color color);
Draw.Torus(Vector3 pos, Vector3 normal, float radius, float thickness, float angleRadStart, float angleRadEnd, Color color);
Draw.Polyline(PolylinePath path, bool closed, float thickness, Color color);
Draw.Polygon(PolygonPath path, Color color);
Draw.Text(Vector3 pos, Quaternion rot, string content, TextAlign align, float fontSize, Color color);
Draw.Text(TextElement element, Vector3 pos, string content, float fontSize, Color color);
Draw.TextRect(Rect rect, string content);
```

---

## `DiscColors` — the color parameter of Disc, Ring, Pie, Arc

A plain `Color` converts implicitly (`DiscColors.Flat`). Gradients:

| Factory | Look |
|---|---|
| `DiscColors.Flat(Color)` | Single color |
| `DiscColors.Radial(Color inner, Color outer)` | Center-to-edge; `Radial(color, Color.clear)` + `Additive` blend is a cheap glow |
| `DiscColors.Angular(Color start, Color end)` | Along the angle from start to end |
| `DiscColors.Bilinear(innerStart, outerStart, innerEnd, outerEnd)` | Both at once |

---

## Paths — `PolylinePath`, `PolygonPath`

Both derive from `PointPath<T> : DisposableMesh` and own a pooled mesh. **Dispose them.**

| Member (both) | Notes |
|---|---|
| `Count`, `LastPoint`, indexer, `SetPoint(int, T)`, `RemovePointAt(int)` | |
| `AddPoint(T)`, `AddPoints(params T[])`, `AddPoints(IEnumerable<T>)` | `IEnumerable` overloads allocate — avoid in per-frame rebuilds |
| `ClearAllPoints()` | Reuse the same path object for new geometry |
| `Dispose()` | Safe right after the last draw call in a frame — disposal is deferred until pending commands render |

`PolylinePath` (points are `PolylinePoint`: position, color, thickness multiplier):

- `AddPoint(x, y[, z][, color])`, `AddPoint(Vector2/Vector3 pos[, float thickness][, Color color])`.
- `SetPoint(int, Vector3/Vector2)`, `SetColor(int, Color)`.
- `BezierTo(startTangent, endTangent, end[, pointsPerTurn | pointCount])` and `ArcTo(corner, next, radius[, pointsPerTurn | pointCount])`
  continue from `LastPoint` — add a first point before calling them, otherwise they warn and do nothing. Passing a
  `PolylinePoint` endpoint blends color and thickness along the curve. Default density comes from
  `ShapesConfig.polylineDefaultPointsPerTurn` (64).
- The mesh is cached and rebuilt only when points, `closed` or `joins` change — drawing a static path every frame is cheap.

`PolygonPath` (points are `Vector2`, always closed, no per-point color):

- `AddPoint(x, y)`, `BezierTo(...)`, `ArcTo(corner, next, radius[, pointsPerTurn | pointCount])`.
- Color or gradient comes from the `Draw.Polygon` call or `Draw.GradientFill` state. The overload
  `ArcTo(corner, next, radius, pointsPerTurn, Color color)` still compiles but ignores the color.
- Paths with fewer than 2 (polyline) or 3 (polygon) points log a warning and draw nothing.

```csharp
private readonly PolylinePath _arcPath = new PolylinePath();

private void RebuildArc(Vector3 from, Vector3 control, Vector3 to)
{
    _arcPath.ClearAllPoints();
    _arcPath.AddPoint(from);
    _arcPath.BezierTo(control, control, to, 24);   // fixed point count keeps the cost stable
}

private void OnDestroy() => _arcPath.Dispose();
```

---

## Text

- `Draw.Text("…")` without an element takes a pooled TextMeshPro object for the lifetime of the command — safe every
  frame, but re-runs TMP layout on every call.
- `TextElement` keeps its own TMP object: create once, `Dispose()` when done. Update numbers without allocating:

```csharp
private TextElement _scoreText;

private void Awake() => _scoreText = new TextElement();

private void OnDestroy() => _scoreText.Dispose();

private void DrawScore(int score)
{
    _scoreText.ClearText();
    _scoreText.AppendString("Score ");
    _scoreText.AppendInt(score);
    Draw.Text(_scoreText);          // content already set; no string built
}
```

- `TextElement` also has `AppendFloat(value, format, maxCharCount)` and `AppendDouble(...)` (span-based, no GC).
- `Draw.Text(element, null)` leaves the element's text unchanged (it does not clear it); use `ClearText()`.
- Layout state (`Draw.FontSize`, `TextAlign`, `TextWrap`, `TextOverflow`, `TextCurvature`, margins, spacing) is
  state-only. `FontSize` is in TMP font units relative to the current matrix, not pixels.
- Text does not support custom `ZTest`/stencil/blend state and is not instanced. Text with fallback fonts draws one
  extra call per material.
- More than ~500 live text elements logs a warning; the pool refuses past 1000 — that means leaked `TextElement`s.

---

## Textures and custom meshes

```csharp
Draw.Texture(Texture texture, Rect rect[, TextureFillMode fillMode][, Color color]);  // StretchToFill, ScaleToFit (default), ScaleAndCropToFill
Draw.Texture(Texture texture, Rect rect, Rect uvs[, Color color]);
Draw.Texture(Texture texture, Vector2 center, float size[, TextureSizeMode sizeMode][, Color color]);  // Width, Height, LongestSide (default), ShortestSide, PixelsPerMeter, Radius
Draw.Mesh(Mesh mesh, Material material[, MaterialPropertyBlock mpb]);
```

- A `null` texture draws nothing silently. Consecutive textures batch only while the same `Texture` object repeats.
- `Draw.Mesh` injects your own mesh/material into the command's paint order. It ignores every Shapes state (color,
  blend, matrix-independent state) and is never instanced. Keep the mesh and material alive until the frame renders.

---

## Removed 3.x API → 4.x replacement

All of these are compile errors in 4.x.

| Removed | Use |
|---|---|
| `Draw.LineDashed`, `RingDashed`, `ArcDashed`, `*GradientRadialDashed` … | `using (Draw.DashedScope(style)) { Draw.Line(...); }` or `Draw.UseDashes` + `Draw.DashStyle` |
| `Draw.DiscGradientRadial/Angular/Bilinear`, `RingGradient*`, `PieGradient*`, `ArcGradient*` | Last parameter `DiscColors.Radial/Angular/Bilinear(...)` |
| `Draw.PolygonFill*`, `RectangleFill`, `RectangleBorderFill`, `RegularPolygonFill*` | `using (Draw.GradientFillScope(GradientFill.Linear/Radial(...)))` or `Draw.UseGradientFill` + `Draw.GradientFill` |
| `Draw.RegularPolygonHollow`, `Draw.TriangleHollow` | `Draw.RegularPolygonBorder`, `Draw.TriangleBorder` |
| `Draw.LineThickness`, `DiscRadius`, `RingThickness`, `RectangleThickness`, `SphereRadius`, `TorusRadiusSpace` and other per-shape style properties | Shared `Draw.Thickness`, `ThicknessSpace`, `Radius`, `RadiusSpace`, `SizeSpace` |
| `Draw.Postition`, `Draw.Postition2D` | `Draw.Position`, `Draw.Position2D` |
| `GradientFill.CreateLinear/CreateRadial` | `GradientFill.Linear/Radial` |
| `new DashStyle(size, …)` | `DashStyle.RelativeDashes`, `DashStyle.FixedDashCount`, `DashStyle.MeterDashes` |
| `PolylinePath.ArcTo/BezierTo(…, Color color)` | Color-less overload (keeps previous color) or a `PolylinePoint` endpoint (blends) |
