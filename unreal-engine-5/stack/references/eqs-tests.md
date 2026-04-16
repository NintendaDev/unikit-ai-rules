# EQS — Test Catalog

> **Base path:** `EnvironmentQuery/Tests/`
> See also: [eqs-generators.md](eqs-generators.md)

---

## Common Test Properties

Every test inherits these base properties from `UEnvQueryTest`:

| Property | Type | Description |
|----------|------|-------------|
| `TestPurpose` | `EEnvTestPurpose::Type` | `Filter`, `Score`, or `FilterAndScore` |
| `FilterType` | `EEnvTestFilterType::Type` | `Minimum`, `Maximum`, `Range`, `Match` |
| `FloatValueMin` / `FloatValueMax` | float | Threshold values used by the filter |
| `ScoringEquation` | `EEnvTestScoreEquation` | `Linear`, `InverseLinear`, `Square`, `SquareRoot`, `Constant` |
| `ScoreClampMin` / `ScoreClampMax` | float | Clamp range applied to the normalized score |
| `MultipleContextFilterOp` | `EEnvTestFilterOperator::Type` | `AllPass` (AND) or `AnyPass` (OR) when context returns multiple items |

---

## Built-in Tests

### Distance
Measures distance (3D, 2D, or Z-axis only) from each item to a context.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `DistanceTo` | Context | `EnvQueryContext_Querier` | Reference actor or location for measurement |
| `TestMode` | enum | `3D` | `3D`, `2D` (XY plane only), or `Z` (height only) |

**Cost**: Low.

---

### Dot
Scores based on the dot product between two directional vectors (measures alignment/facing).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `LineA` / `LineA Mode` | Context + enum | — | First direction: from context toward another, or context's rotation |
| `LineB` / `LineB Mode` | Context + enum | — | Second direction |
| `TestMode` | enum | `Dot 3D` | `Dot 3D` or `Dot 2D` |
| `AbsoluteValue` | bool | false | Use absolute value of dot product (ignore facing polarity) |

**Cost**: Low.

---

### GameplayTag
Filters or scores actors based on whether they own a set of Gameplay Tags.

| Parameter | Type | Description |
|-----------|------|-------------|
| `TagsToMatch` | `FGameplayTagContainer` | Tags to check against |
| `TagMatchType` | enum | `Any` (has at least one) or `All` (has all) |
| `GameplayTagAssetActor` | Context | Actor whose tags are checked |
| `Inverted` | bool | Pass when tags are **absent** |

**Cost**: Low.

---

### Overlap
Filters items whose location overlaps a shape (box, sphere, or capsule).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ShapeOffset` | FVector | (0, 0, 0) | Offset from the item's location |
| `OverlapChannel` | ECollisionChannel | `Pawn` | Collision channel |
| `ShapeType` | enum | `Box` | `Box`, `Sphere`, or `Capsule` |
| `ExtentX` / `ExtentY` / `ExtentZ` | float | 10 | Shape half-extents |
| `bOnlyBlockingHits` | bool | true | Count only blocking-type overlaps |

**Cost**: Medium.

---

### Pathfinding
Checks path existence, path cost, or path length from each item to a context via NavMesh.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `Context` | Context | `EnvQueryContext_Querier` | Navigation goal |
| `PathingContext` | Context | `EnvQueryContext_Querier` | Actor used for nav agent properties |
| `TestMode` | enum | `PathExist` | `PathExist`, `PathCost`, `PathLength` |
| `FilterClass` | class | None | Optional nav query filter class |
| `bPathFromContext` | bool | false | Reverse direction: path FROM context TO item |

**Cost**: High (~5 ms per item). Use `PathfindingBatch` for more than 10 items.

---

### PathfindingBatch
Batched version of the Pathfinding test. Same parameters as `Pathfinding`, but all nav requests are submitted together. Significantly faster than Pathfinding when item count > 10.

**Cost**: High per batch, but amortized per item — always prefer over `Pathfinding` at scale.

---

### Project
Tests whether an item can be successfully projected onto the NavMesh. Use as an early filter to discard floating or underground points.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ProjectDown` | float | 100 | How far to project downward (world units) |
| `ProjectUp` | float | 100 | How far to project upward |
| `PostProjectionVerticalOffset` | float | 0 | Z offset applied after projection |
| `TraceToFloor` | bool | false | Trace to floor geometry after projection |

**Cost**: Low.

---

### Random
Adds a random component to scores, useful for introducing position variety.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `RandomScoreModifier` | `FAIDataProviderFloatValue` | 1.0 | Weight of the random score component |

**Cost**: Negligible.

---

### Trace
Performs a line trace (or shaped trace) between each item and a context to test visibility or obstruction.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `Context` | Context | `EnvQueryContext_Querier` | Target context for the trace |
| `TraceChannel` | ECollisionChannel | `Visibility` | Collision channel |
| `TraceMode` | enum | `Navigation` | `Navigation` (NavMesh aware) or `Geometry` (physics) |
| `bTraceToItem` | bool | true | `true` = trace from context TO item; `false` = from item TO context |
| `BoolMatch` | bool | true | Pass when trace hits (`true`) or misses (`false`) |
| `TraceShape` | enum | `Line` | `Line`, `Sphere`, `Capsule`, `Box` |
| `TraceExtent` | FVector | varies | Half-extents for shaped traces |

**Cost**: Medium.

---

## Recommended Test Order

Run tests in this order (cheapest to most expensive) to minimize items evaluated by expensive tests:

1. **Project** — discard off-NavMesh points (Low, Filter).
2. **Distance** — discard items clearly out of range (Low, Filter).
3. **GameplayTag** — filter by actor tags (Low, Filter).
4. **Overlap** — check area clearance (Medium, Filter).
5. **Trace** — line-of-sight check (Medium, Filter or Score).
6. **PathfindingBatch** — reachability (High, Score last).
7. **Random** — add variety to the final result set (Negligible, Score).
