# Shapes — Component catalog

> **Base path:** `Assets/Third-Party Assets/Shapes/Scripts/Runtime/Components/`
> See also: [shapes-styling.md](shapes-styling.md) (what the shared options look like), [shapes-setup-performance.md](shapes-setup-performance.md) (batching rules)

Every shape component derives from `ShapeRenderer : MonoBehaviour`, carries `[ExecuteAlways]` and
`[DisallowMultipleComponent]`, and adds its own hidden `MeshRenderer` + `MeshFilter`. Set values through the C#
properties below; the setters write a cached `MaterialPropertyBlock` and apply it immediately.

---

## Quick pick — which component draws what

| Visual | Component | Key settings |
|---|---|---|
| Filled circle | `Disc` | `Type = DiscType.Disc`, `Radius` |
| Circle outline | `Disc` | `Type = DiscType.Ring`, `Radius` (to the middle of the stroke), `Thickness` |
| Filled wedge / sector | `Disc` | `Type = DiscType.Pie`, `AngRadiansStart/End` |
| Open arc / progress ring | `Disc` | `Type = DiscType.Arc`, `AngRadiansStart/End`, `ArcEndCaps` |
| Straight segment, arrow shaft | `Line` | `Start`, `End`, `Thickness`, `EndCaps`, `Geometry` |
| Multi-point path | `Polyline` | `points`, `Closed`, `Joins` |
| Filled arbitrary outline (concave allowed) | `Polygon` | `points` (`Vector2`), `Triangulation` |
| Box, panel, lane, rounded card | `Rectangle` | `Type`, `Width/Height`, `Pivot`, `CornerRadius`/`CornerRadii` |
| Triangle, arrow head | `Triangle` | `A/B/C`, `Border`, `Roundness` |
| Four-corner gradient patch | `Quad` | `A/B/C/D`, `ColorMode = PerCorner` |
| Hexagon, star-like n-gon | `RegularPolygon` | `Sides`, `Radius`, `Angle`, `Border`, `Roundness` |
| Solid 3D ball / box / cone / donut | `Sphere` / `Cuboid` / `Cone` / `Torus` | size in `RadiusSpace`/`SizeSpace`, `DetailLevel` |
| Tint or fade a whole group of shapes | `ShapeGroup` on the parent | `Color` multiplies every child shape |
| Curved TextMeshPro text | `TextMeshProShapes` | `Curvature = 1 / radius`, `CurvaturePivot` |

Create from `Tools/Shapes/Create/<Shape>` or `GameObject/Shapes/<Shape>` (items: Line, Polyline, Disc, Pie, Ring, Arc,
Rectangle, Triangle, Quad, Polygon, Regular Polygon, Sphere, Cuboid, Torus, Cone). The Pie/Ring/Arc items create a
`Disc` with the matching `Type`; the Line item sets `Geometry = Billboard`.

---

## `ShapeRenderer` — members shared by every shape

| Property | Type | Default | Notes |
|---|---|---|---|
| `Color` | `Color` | white | Alpha is opacity in every blend mode. Several shapes override it to also set their secondary colors |
| `BlendMode` | `ShapesBlendMode` | `Transparent` | Switches the material variant. Only `Opaque` writes depth |
| `ScaleMode` | `ScaleMode` | `Uniform` | `Coordinate` keeps thickness unscaled by the transform. No effect on Polygon, Quad, Sphere, Cuboid, Cone |
| `DetailLevel` | `DetailLevel` | `Medium` | Mesh tessellation for Sphere, Cone, Torus and volumetric Line only |
| `SortingLayerID` / `SortingOrder` | `int` | 0 | Proxies the `MeshRenderer`; `SortingLayerName` is read-only |
| `Culling` | `ShapeCulling` | `CalculatedLocal` | Per-shape bounds; `SimpleGlobal` uses huge config bounds (effectively never culled) |
| `BoundsPadding` | `float` | 0 | Local meters added to bounds. Needed for Pixels/Noots sizes, which bounds ignore |
| `RenderQueue` | `int` | `-1` (auto) | Non-default → unique material, no instancing |
| `ZTest` | `CompareFunction` | `LessEqual` | Non-default → unique material |
| `ZOffsetFactor` / `ZOffsetUnits` | `float` / `int` | 0 / 0 | Depth bias against z-fighting with ground; non-default → unique material |
| `ColorMask` | `ColorWriteMask` | `All` | Non-default → unique material |
| `StencilComp` / `StencilOpPass` | `CompareFunction` / `StencilOp` | `Always` / `Keep` | Stencil masking (case WORLD-08) |
| `StencilRefID` / `StencilReadMask` / `StencilWriteMask` | `byte` | 0 / 255 / 255 | |
| `Mesh` | `Mesh` (read-only) | — | Never modify it |
| `meshOutOfDate` | `bool` (public field) | — | Set `true` after raw edits of `Polyline.points`/`Polygon.points` |

Methods: `UpdateMesh(bool force = false)`, `GetBounds()` (local, includes `BoundsPadding`), `GetWorldBounds()`.

Behaviour worth knowing:

- The hidden `MeshRenderer` is forced to no shadows, no light/reflection probes — Shapes are unlit overlays by design.
  Do not re-enable those on the renderer; batching breaks.
- `Awake` picks material and mesh; `OnValidate` re-applies properties in the editor; `OnDestroy` destroys generated
  meshes and private materials.
- Animator/Timeline curves on shape fields are applied through `OnDidApplyAnimationProperties`, so animating
  `radius`, `color` etc. in an Animation clip works.
- Instancing holds while `RenderQueue`, `ZTest`, `ZOffset*`, `ColorMask` and all stencil values stay default. Touch any
  of them and the shape gets a private `"<shader> (instance)"` material.

---

## Per-shape property tables

Obsolete members exist as compile errors (`[Obsolete(..., true)]`). Never write the names in the "Removed" rows.

### `Line`

| Property | Type | Default | Notes |
|---|---|---|---|
| `Start` / `End` | `Vector3` | `(0,0,0)` / `(1,0,0)` | Local space; indexer `this[0]`/`this[1]` |
| `Thickness` | `float` | 0.125 | |
| `ThicknessSpace` | `ThicknessSpace` | `Meters` | |
| `Geometry` | `LineGeometry` | `Billboard` | `Flat2D`, `Billboard`, `Volumetric3D` |
| `EndCaps` | `LineEndCap` | `Round` | `None`, `Square`, `Round` |
| `ColorMode` | `Line.LineColorMode` | `Single` | `Double` enables `ColorEnd` |
| `ColorStart` / `ColorEnd` | `Color` | white | Setting `Color` in `Single` mode sets both |
| Dash members | see `IDashable` | line preset | Dashes are ignored on `Volumetric3D` |

### `Disc` (Disc, Pie, Ring, Arc)

| Property | Type | Default | Notes |
|---|---|---|---|
| `Type` | `DiscType` | `Disc` | `Disc`, `Pie`, `Ring`, `Arc`; `HasThickness` (Ring/Arc), `HasSector` (Pie/Arc) |
| `Radius` / `RadiusSpace` | `float` / `ThicknessSpace` | 1 / `Meters` | Disc/Pie: to the outer edge. Ring/Arc: to the **middle** of the stroke |
| `Thickness` / `ThicknessSpace` | `float` / `ThicknessSpace` | 0.5 / `Meters` | Ring/Arc only |
| `AngRadiansStart` / `AngRadiansEnd` | `float` | 0 / `TAU * 3/8` | Radians, counter-clockwise from local +X |
| `ArcEndCaps` | `ArcEndCap` | `None` | `Round` rounds arc ends |
| `Geometry` | `DiscGeometry` | `Flat2D` | `Billboard` faces the camera |
| `ColorMode` | `Disc.DiscColorMode` | `Single` | `Single`, `Radial`, `Angular`, `Bilinear` |
| `ColorInner`/`ColorOuter` | `Color` | white | Radial mode |
| `ColorStart`/`ColorEnd` | `Color` | white | Angular mode |
| `ColorInnerStart`/`ColorOuterStart`/`ColorInnerEnd`/`ColorOuterEnd` | `Color` | white | Bilinear mode |
| Dash members | see `IDashable` | ring preset | Ring and Arc only |
| Removed | `RadiusInner` | — | Use `Thickness` |

### `Polyline`

| Member | Type | Default | Notes |
|---|---|---|---|
| `points` | `List<PolylinePoint>` (field) | 3-point triangle | Raw edits need `meshOutOfDate = true` |
| `Closed` | `bool` | `true` | |
| `Joins` | `PolylineJoins` | `Miter` | `Simple`, `Miter`, `Round`, `Bevel` |
| `Geometry` | `PolylineGeometry` | `Flat2D` | `Flat2D`, `Billboard` (no volumetric) |
| `Thickness` / `ThicknessSpace` | `float` / `ThicknessSpace` | 0.125 / `Meters` | Multiplied by each point's `thickness` |
| `Count`, indexer | | | Indexer setter marks the mesh dirty |

Methods (all mark the mesh dirty): `SetPointPosition(int, Vector3)`, `SetPointColor(int, Color)`,
`SetPointThickness(int, float)`, `SetPoints(IReadOnlyCollection<Vector3>, IReadOnlyCollection<Color> = null)`,
`SetPoints(IReadOnlyCollection<Vector2>, IReadOnlyCollection<Color> = null)`, `SetPoints(IEnumerable<PolylinePoint>)`,
`AddPoints(IEnumerable<PolylinePoint>)`, `AddPoint(Vector3)`, `AddPoint(Vector3, Color)`,
`AddPoint(Vector3, Color, float)`, `AddPoint(Vector3, float)`, `AddPoint(PolylinePoint)`.
The mesh is rebuilt lazily once per frame just before a camera renders, however many points changed.
No dashes. No instancing (each polyline owns its mesh). `Round`/`Bevel` joins add a second draw for the join mesh.

`PolylinePoint` struct: `point` (`Vector3`), `color` (`Color`), `thickness` (`float` multiplier, default 1).

### `Polygon`

| Member | Type | Default | Notes |
|---|---|---|---|
| `points` | `List<Vector2>` (field) | hexagon | Same dirty contract as Polyline |
| `Triangulation` | `PolygonTriangulation` | `EarClipping` | `FastConvexOnly` is cheaper but wrong for concave outlines |
| Fill members | see `IFillable` | | Only whole-shape color/gradient; no per-point colors |

Methods: `SetPointPosition(int, Vector2)`, `SetPoints(IEnumerable<Vector2>)`, `AddPoints(IEnumerable<Vector2>)`,
`AddPoint(Vector2)`. No dashes, no anti-aliasing, no instancing.

### `Rectangle`

| Property | Type | Default | Notes |
|---|---|---|---|
| `Type` | `Rectangle.RectangleType` | `HardSolid` | `HardSolid`, `RoundedSolid`, `HardBorder`, `RoundedBorder`; `IsBorder`, `IsRounded` |
| `Width` / `Height` | `float` | 1 / 1 | |
| `Pivot` | `RectPivot` | `Center` | `Corner` anchors the bottom-left at the origin — use it for bars that grow in one direction |
| `CornerRadiusMode` | `Rectangle.RectangleCornerRadiusMode` | `Uniform` | `PerCorner` enables `CornerRadii` |
| `CornerRadius` | `float` | 0.25 | Rounded types only |
| `CornerRadii` | `Vector4` | all 0.25 | Clockwise from bottom-left |
| `Thickness` / `ThicknessSpace` | `float` / `ThicknessSpace` | 0.1 / `Meters` | Border types only |
| Dash and fill members | `IDashable`, `IFillable` | | |
| Removed | `Radius`, `CornerRadiii`, `IsHollow` | — | Use `CornerRadius`, `CornerRadii`, `IsBorder` |

### `Triangle`

| Property | Type | Default | Notes |
|---|---|---|---|
| `A` / `B` / `C` | `Vector3` | `(0,0,0)` / `(0,1,0)` / `(1,0,0)` | Local; indexer 0..2, `Get/SetTriangleVertex` |
| `ColorMode` | `Triangle.TriangleColorMode` | `Single` | `PerCorner` uses `ColorA/B/C` |
| `Border` | `bool` | `false` | Outline only |
| `Thickness` / `ThicknessSpace` | `float` / `ThicknessSpace` | 0.5 / `Meters` | Border |
| `Roundness` | `float` 0..1 | 0 | Rounds corners |
| Dash members | `IDashable` | ring preset | |
| Removed | `Hollow` | — | Use `Border` |

### `Quad`

| Property | Type | Default | Notes |
|---|---|---|---|
| `A`/`B`/`C`/`D` | `Vector3` | unit square, clockwise | Setting `D` while `IsUsingAutoD` logs a warning |
| `IsUsingAutoD` | `bool` | `false` | `D` becomes `DAuto = A + (C - B)` (parallelogram) |
| `ColorMode` | `Quad.QuadColorMode` | `Single` | `Horizontal` (`ColorLeft/Right`), `Vertical` (`ColorTop/Bottom`), `PerCorner` (`ColorA..D`) |

No dashes, no fill, no anti-aliasing, no `ScaleMode`.

### `RegularPolygon`

| Property | Type | Default | Notes |
|---|---|---|---|
| `Sides` | `int` | 3 | Clamped to ≥ 3 |
| `Radius` / `RadiusSpace` | `float` / `ThicknessSpace` | 1 / `Meters` | Center to vertex |
| `Angle` | `float` | `TAU / 4` | Radians rotation offset |
| `Roundness` | `float` 0..1 | 0 | |
| `Border` | `bool` | `false` | Outline only |
| `Thickness` / `ThicknessSpace` | `float` / `ThicknessSpace` | 0.5 / `Meters` | Border |
| `Geometry` | `RegularPolygonGeometry` | `Flat2D` | `Billboard` faces the camera |
| Dash and fill members | `IDashable`, `IFillable` | | |
| Removed | `Hollow` | — | Use `Border` |

### 3D primitives

| Component | Properties (type, default) | Notes |
|---|---|---|
| `Sphere` | `Radius` (1), `RadiusSpace` (`Meters`) | Icosphere by `DetailLevel` |
| `Cuboid` | `Size` (`Vector3.one`), `SizeSpace` (`Meters`) | Fixed 8-vertex box |
| `Cone` | `Radius` (1), `Length` (1.5), `SizeSpace` (`Meters`), `FillCap` (`true`) | Base circle at the origin, tip along local +Z. `FillCap` swaps the mesh. Removed: `RadiusSpace` → `SizeSpace` |
| `Torus` | `Radius` (1), `Thickness` (0.5), `RadiusSpace`, `ThicknessSpace` (`Meters`), `AngRadiansStart/End` (0 / `TAU`) | Axis = local Z. `RadiusSpace` writes the same shader slot as `ThicknessSpace` — set both to the same space |

None of the 3D primitives support dashes or gradients; all are solid color, blend mode, depth and stencil only.

---

## Interfaces

### `IDashable` — `Disc`, `Line`, `Rectangle`, `RegularPolygon`, `Triangle`

`Dashed` (`bool`), `DashSize`, `DashSpacing`, `DashOffset` (`float`), `DashSpace` (`DashSpace`), `DashSnap`
(`DashSnapping`), `DashType` (`DashType`), `DashShapeModifier` (`float` −1..1, for `Angled`/`Chevron`),
`MatchDashSpacingToSize` (`bool`). Defaults: lines use `DashStyle.defaultDashStyleLine` (`Relative`, `EndToEnd`,
size 4, spacing 4); the others use `DashStyle.defaultDashStyleRing` (`FixedCount`, `Tiling`, 16 dashes, spacing 0.5).
Meaning of each value: `shapes-styling.md` → Dashes.

### `IFillable` — `Polygon`, `Rectangle`, `RegularPolygon`

`UseFill` (`bool`), `Fill` (`GradientFill`), `FillType` (`LinearGradient`/`RadialGradient`), `FillSpace`
(`Local`/`World`), `FillColorStart`/`FillColorEnd`, `FillLinearStart`/`FillLinearEnd` (`Vector3`),
`FillRadialOrigin` (`Vector3`), `FillRadialRadius` (`float`). The fill replaces `Color` while `UseFill` is on.

---

## `ShapeGroup`

A plain `MonoBehaviour` (not a shape) whose `Color` multiplies the color of every `ShapeRenderer` below it. Use it to
fade or tint a multi-part visual as one (e.g. a telegraph made of area, rim and fill). Every change re-applies all
material properties on every child shape, so drive it at event rate (appear/disappear), not every frame on large
hierarchies. When no `ShapeGroup` exists in the scene the lookup costs nothing.

```csharp
[SerializeField] private ShapeGroup _group;

public void SetAlpha(float alpha)
{
    _group.Color = new Color(1f, 1f, 1f, alpha);   // multiplies every child's own color
}
```

## `TextMeshProShapes`

A `TextMeshPro` subclass that bends text: `Curvature` (signed radians per local meter; `1 / r` follows a circle of
radius `r`) and `CurvaturePivot` (`Vector2`, the point that stays fixed). Use it for text around a ring or dial.
Shapes has no other text component; plain labels use normal TextMeshPro.

---

## Scripting patterns

```csharp
// Setup-time: pick the variant once
_zone.Type = DiscType.Ring;
_zone.ThicknessSpace = ThicknessSpace.Pixels;
_zone.Thickness = 4f;

// Per-frame: numbers only
_zone.Radius = _currentRadius;
_zone.Color = Color.Lerp(_idleColor, _alertColor, _threat01);

// Polyline: replace all points without a raw list edit
_route.SetPoints(_waypoints);               // IReadOnlyCollection<Vector3>

// Raw edit (only when unavoidable)
_route.points[3] = new PolylinePoint(_newPos, Color.red, 1.5f);
_route.meshOutOfDate = true;
```

Reading the current look in code: every serialized field has a public property of the same name in PascalCase
(`radius` → `Radius`, `angRadiansEnd` → `AngRadiansEnd`, `cornerRadii` → `CornerRadii`). Private serialized fields
(for `SerializedObject` in editor tooling or tests) are the camelCase names.

## Editor menus

| Menu | Opens |
|---|---|
| `Tools/Shapes/⚙ Settings` | Shapes settings window (`ShapesConfig`), incl. URP render-feature check |
| `Tools/Shapes/⏱ Immediate Mode Monitor` | Live view of immediate-mode command/mesh counts — use it to spot leaks |
| `Tools/Shapes/📄 Documentation`, `✨ Changelog`, `🐞 Report Bug`, `💬 Feedback Center`, `About ⁄ Check for Updates` | External pages and version info |

## Live reference: the Shapes Gallery scene

`Assets/Third-Party Assets/Shapes/Samples/Shapes Gallery.unity` holds a labelled example of every component and most
options (every blend mode, every disc type, pixel-sized discs and spheres, dashed lines and rings, gradient
rectangles and polygons, a hex "beehive", a stencil mask). When unsure which field values produce a look, find the
matching object there (case PROC-06) instead of guessing.
