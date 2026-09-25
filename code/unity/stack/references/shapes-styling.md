# Shapes — Styling: spaces, geometry, color, dashes, blending, depth

> **Base path:** `Assets/Third-Party Assets/Shapes/Scripts/Runtime/Microtypes/`
> See also: [shapes-components.md](shapes-components.md) (property names per component), [shapes-immediate-mode.md](shapes-immediate-mode.md) (Draw state names)

Each option below exists on both sides: a component property and a `Draw.*` state property with the same meaning.

---

## Feature support matrix

| Shape | Dashes | Gradient | Anti-aliasing | Instancing | Geometry modes |
|---|---|---|---|---|---|
| Line | yes (not `Volumetric3D`) | start→end colors | yes | yes | Flat2D, Billboard, Volumetric3D |
| Polyline | **no** | per-point colors | yes | **no** (own mesh) | Flat2D, Billboard |
| Disc / Pie | no | Radial, Angular, Bilinear | yes | yes | Flat2D, Billboard |
| Ring / Arc | yes | Radial, Angular, Bilinear | yes | yes | Flat2D, Billboard |
| Rectangle | yes | `GradientFill` | yes | yes | flat only |
| RegularPolygon | yes | `GradientFill` | yes | yes | Flat2D, Billboard |
| Triangle | yes | per-corner colors | yes | yes | flat only |
| Quad | no | horizontal, vertical, per-corner | **no** | yes | flat only |
| Polygon | no | `GradientFill` | **no** | **no** (own mesh) | flat only |
| Sphere, Cuboid, Cone, Torus | no | no | n/a (mesh) | yes | 3D meshes |

---

## Size spaces — `ThicknessSpace`

| Value | Meaning | Use for |
|---|---|---|
| `Meters` (0) | World units; thinner with distance | Anything that is part of the world: zones, lanes, ground marks |
| `Pixels` (1) | Constant on-screen pixels | Outlines, selection rims, debug lines that must stay readable at any zoom |
| `Noots` (2) | Screen-relative: `NOOTS_ACROSS_SCREEN` (default 100) across the shorter screen side, like CSS `vmin` | HUD strokes that must scale with resolution, not pixel density |

- The same enum is exposed as `ThicknessSpace` (strokes), `RadiusSpace` (disc/polygon/sphere/torus radius) and
  `SizeSpace` (cuboid, cone). Radius and thickness can use different spaces — a `Meters` radius with a `Pixels`
  thickness gives a world-sized ring with a constant-width outline.
- Strokes thinner than one pixel are clamped to one pixel and faded by coverage instead of flickering.
- Bounds ignore Pixels/Noots sizes: give components in those spaces a `BoundsPadding`.

## `ScaleMode`

- `Uniform` (default): the transform scale scales everything, including thickness.
- `Coordinate`: the transform scale moves coordinates (positions, radius, size) but thickness stays as authored —
  use it when a parent scales a gizmo-like shape and the stroke must not balloon.

## Geometry modes

| Enum | Values | Effect |
|---|---|---|
| `LineGeometry` | `Flat2D`, `Billboard`, `Volumetric3D` | Flat in local XY / camera-facing quad in 3D / real capsule-or-cylinder mesh (uses `DetailLevel`) |
| `PolylineGeometry` | `Flat2D`, `Billboard` | Flattens Z vs. camera-facing strip |
| `DiscGeometry`, `RegularPolygonGeometry` | `Flat2D`, `Billboard` | `Billboard` always faces the camera (markers, health pips above units) |

Components default lines to `Billboard`, polylines to `Flat2D`; immediate mode defaults both to `Billboard`.

## Caps and joins

| Enum | Values | Notes |
|---|---|---|
| `LineEndCap` | `None`, `Square`, `Round` | `Square` extends past the endpoints by half the thickness |
| `ArcEndCap` | `None`, `Round` | Arcs only |
| `PolylineJoins` | `Simple`, `Miter`, `Round`, `Bevel` | `Simple` is cheapest (for dense smooth curves); `Miter` spikes to infinity on very sharp corners; `Round`/`Bevel` add a second draw for the join mesh |

---

## Color

- `Color.a` is opacity in every blend mode. Shapes converts colors to linear space when the project is linear.
- Per-shape gradients: Line `ColorMode = Double` (`ColorStart`/`ColorEnd`); Disc `ColorMode` Radial/Angular/Bilinear
  (immediate mode: `DiscColors`); Triangle/Quad per-corner colors; Polyline per-point `PolylinePoint.color`.
- `ShapeGroup.Color` on a parent multiplies every child shape.

### `GradientFill` — Rectangle, RegularPolygon, Polygon

```csharp
GradientFill.Linear(Vector3 start, Vector3 end, Color colorStart, Color colorEnd, FillSpace space = FillSpace.Local);
GradientFill.Radial(Vector3 origin, float radius, Color colorInner, Color colorOuter, FillSpace space = FillSpace.Local);
```

- `FillSpace.Local` follows the shape; `FillSpace.World` pins the gradient in the world while the shape moves through
  it (e.g. a danger gradient that stays centred on a boss).
- While the fill is on it replaces the shape's `Color`.
- Component: `UseFill = true`, then `Fill = GradientFill.Linear(...)` (or the individual `Fill*` properties).
  Immediate mode: `using (Draw.GradientFillScope(GradientFill.Radial(...))) { Draw.Rectangle(...); }`.

---

## Dashes

| Field | Values / meaning |
|---|---|
| `DashType` | `Basic`, `Angled` (hazard stripes), `Rounded`, `Chevron` (arrows along the stroke) |
| `DashSpace` | `Meters` (world length), `Relative` (multiples of thickness — size 1 is a square dash), `FixedCount` (size = number of dashes around the shape, spacing = gap fraction 0..1) |
| `DashSnap` (`DashSnapping`) | `Off`, `Tiling` (pattern repeats cleanly, ends on a gap), `EndToEnd` (a dash at both ends) |
| `DashSize`, `DashSpacing` | Units depend on `DashSpace` |
| `DashOffset` | 1 = one dash+gap period; animate it to make dashes crawl |
| `DashShapeModifier` | −1..1 skew for `Angled` and `Chevron` |

Factories: `DashStyle.RelativeDashes(type, size, spacing, snap, offset, shapeModifier)`,
`DashStyle.FixedDashCount(type, count, spacingFraction, snap, offset, shapeModifier)`,
`DashStyle.MeterDashes(type, size, spacing, snap, offset, shapeModifier)`.

- Rings and arcs read cleanest with `FixedCount` + `Tiling` (no half dash at the seam).
- Crawling "marching ants": increment `DashOffset` by `speed * Time.deltaTime` and wrap with `ShapesMath.Frac`.
- `Chevron` dashes on a line make a cheap direction arrow without extra shapes.

```csharp
// Component: marching dashed selection ring
_ring.Dashed = true;
_ring.DashType = DashType.Rounded;
_ring.DashSpace = DashSpace.FixedCount;
_ring.DashSnap = DashSnapping.Tiling;
_ring.DashSize = 24f;          // 24 dashes around the ring
_ring.DashSpacing = 0.4f;      // 40 % of each period is gap

// per frame
_ring.DashOffset = ShapesMath.Frac(_ring.DashOffset + _crawlSpeed * Time.deltaTime);
```

---

## Blend modes — `ShapesBlendMode`

| Value | Look | Typical use |
|---|---|---|
| `Opaque` | Solid; the only mode that writes depth; sorts correctly when intersecting | Solid 3D primitives, opaque UI-less geometry |
| `Transparent` (default) | Standard alpha "over" | Almost everything |
| `Additive` | Brightens (linear dodge) | Glows, energy, telegraph pulses on dark ground |
| `Screen` | Soft brighten | Subtle highlights |
| `ColorDodge` | Harsh brighten | Flashes |
| `Lighten` | Max of shape and background | |
| `Multiplicative` | Tints / darkens | Shadows, darkening overlays on bright ground |
| `LinearBurn`, `ColorBurn` | Darken linearly / harshly | |
| `Darken` | Min of shape and background | |
| `Subtractive` | Subtracts color | Inverse effects |

Changing a component's `BlendMode` swaps its material variant; set it at setup time.

---

## Sorting and depth

**Components** behave like any `MeshRenderer`:

- `Opaque` → Geometry queue (2450, writes depth); everything else → Transparent queue (3000), order-dependent.
- Among transparent shapes use `SortingLayerID`/`SortingOrder`, then camera distance. Overlapping layers of one
  indicator (area → fill → rim) should get increasing `SortingOrder` so they never flicker.
- Depth test is on by default (`LessEqual`) — shapes are hidden by geometry in front of them.
- Avoid z-fighting of ground decals by lifting them a few millimetres or by `ZOffsetFactor/Units` (the latter breaks
  instancing for that shape — prefer the lift).
- Changing `ZTest`, `ZOffset*`, `ColorMask`, stencil or `RenderQueue` gives the shape a private material and removes
  it from instancing.

**Immediate mode** ignores queues and sorting layers: paint order = call order, `Opaque` also depth-sorts. Set
`Draw.ZTest = CompareFunction.Always` for overlays that ignore world geometry.

---

## Stencil masking

Every shape has `StencilComp`, `StencilOpPass`, `StencilRefID`, `StencilReadMask`, `StencilWriteMask`
(`Draw.Stencil*` in immediate mode).

| Role | Settings |
|---|---|
| Mask writer (invisible or visible) | `StencilComp = Always`, `StencilOpPass = Replace`, `StencilRefID = N`; add `ColorMask = 0` to make it invisible |
| Masked content (visible only inside) | `StencilComp = Equal`, `StencilRefID = N`, `StencilReadMask = 255` |
| Content visible only outside | `StencilComp = NotEqual`, `StencilRefID = N` |

The writer must render before the readers (lower queue or `SortingOrder`, or earlier in the command). Stencil use
always costs instancing on those shapes. Recipe: case WORLD-08.

---

## Anti-aliasing and quality

- Flat shapes are anti-aliased in the shader (local AA), independent of MSAA/TAA. Quality: `ShapesConfig`
  `LOCAL_ANTI_ALIASING_QUALITY` (`Off`, `Medium`, `High` — default High).
- Quad and Polygon have no local AA; rely on MSAA or accept jagged edges.
- `QUAD_INTERPOLATION_QUALITY` (`Low`, `Medium` default, `High2D`, `High`) controls how smoothly per-corner quad colors blend.
- `DetailLevel` (`Minimal`, `Low`, `Medium`, `High`, `Extreme`) picks the mesh for Sphere, Cone, Torus and volumetric
  lines; it does nothing for flat shapes.
- MSAA with opaque alpha-to-coverage shapes does not work in the Scene view — check AA in the Game view.
