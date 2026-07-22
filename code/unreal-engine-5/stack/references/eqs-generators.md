# EQS — Generator Catalog

> **Base path:** `EnvironmentQuery/Generators/`
> See also: [eqs-tests.md](eqs-tests.md)

---

## Built-in Generators

| Generator Name | C++ Class | Item Type | Description |
|---------------|-----------|-----------|-------------|
| Actors of Class | `UEnvQueryGenerator_ActorsOfClass` | Actor | All actors of a given class within `SearchRadius` around `SearchCenter` context |
| Composite | `UEnvQueryGenerator_Composite` | Any | Merges items from multiple child generators into a single set |
| Current Location | `UEnvQueryGenerator_CurrentLocation` | Point | Single point: the querier's current world location |
| Points: Circle | `UEnvQueryGenerator_OnCircle` | Point | Points distributed along a circle perimeter |
| Points: Donut | `UEnvQueryGenerator_Donut` | Point | Multiple concentric rings of points |
| Points: Grid | `UEnvQueryGenerator_SimpleGrid` | Point | 2D flat grid of points centered on a context |
| Points: Pathing Grid | `UEnvQueryGenerator_PathingGrid` | Point | Grid of points reachable via NavMesh (auto-projected onto nav) |

---

## Parameter Reference

### Actors of Class

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `SearchedActorClass` | `TSubclassOf<AActor>` | None | Actor class to search for |
| `SearchCenter` | Context | `EnvQueryContext_Querier` | Center of the search radius |
| `SearchRadius` | `FAIDataProviderFloatValue` | 500 | World-unit radius to search within |
| `GenerateOnlyActorsInRadius` | bool | true | Restrict results to actors inside the radius |

### Points: Circle

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `Circle Radius` | `FAIDataProviderFloatValue` | 500 | Radius of the circle in world units |
| `CircleCenter` | Context | `EnvQueryContext_Querier` | Center point of the circle |
| `ArcDirection` | Context | — | Direction context for arc limiting |
| `ArcAngle` | float | 360 | Arc angle in degrees (360 = full circle) |
| `PointsOnCircle` | `FAIDataProviderIntValue` | 16 | Number of sample points around the perimeter |
| `SpaceBetween` | float | — | Alternative to PointsOnCircle: spacing in world units |

### Points: Donut

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `InnerRadius` | `FAIDataProviderFloatValue` | 100 | Inner radius (hole size) |
| `OuterRadius` | `FAIDataProviderFloatValue` | 500 | Outer radius of the donut |
| `NumberOfRings` | `FAIDataProviderIntValue` | 3 | Number of concentric rings |
| `PointsPerRing` | `FAIDataProviderIntValue` | 16 | Points distributed per ring |
| `Center` | Context | `EnvQueryContext_Querier` | Center of the donut |
| `ArcDirection` | Context | — | Direction for arc-based limiting |
| `ArcAngle` | float | 360 | Arc angle in degrees |

### Points: Grid (Simple Grid)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `GridHalfSize` | `FAIDataProviderFloatValue` | 500 | Half-size; total grid = 2 × GridHalfSize |
| `SpaceBetween` | `FAIDataProviderFloatValue` | 100 | Distance between adjacent grid points |
| `GenerateAround` | Context | `EnvQueryContext_Querier` | Center of the grid |

### Points: Pathing Grid

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `GridHalfSize` | `FAIDataProviderFloatValue` | 500 | Half-size of the reachable grid |
| `SpaceBetween` | `FAIDataProviderFloatValue` | 100 | Distance between adjacent grid points |
| `PathingContext` | Context | `EnvQueryContext_Querier` | Source actor for nav reachability check |
| `ScanRangeMultiplier` | `FAIDataProviderFloatValue` | 1.5 | Multiplier on nav search range |

---

## Item Count Formula

> **Grid**: `item count = ((2 × GridHalfSize / SpaceBetween) + 1)²`
> Example: GridHalfSize=500, SpaceBetween=100 → 121 items.
> Example: GridHalfSize=1000, SpaceBetween=50 → 1681 items — very expensive.

Keep item count **below ~200** for real-time AI queries to avoid per-frame budget overruns.
