---
version: 1.0.0
---

# NavigationServer3D / NavigationAgent3D

> **Scope**: Godot 4 built-in navigation system — NavigationAgent3D path following and lifecycle, RVO avoidance setup, direct NavigationServer3D API for map/region management and path queries, NavigationObstacle3D behavior, and navigation layer filtering.
> **Load when**: implementing AI movement with NavigationAgent3D, setting up pathfinding for NPCs, using NavigationServer3D directly for path queries or multi-map setups, configuring RVO avoidance, using NavigationObstacle3D, filtering navigation by layer bitmask.

---

## Core Concepts

The navigation system is split across three layers:

- **NavigationServer3D** — singleton server that owns all maps, regions, agents, and obstacles; all data is accessed via `Rid` handles.
- **NavigationRegion3D** — scene node that registers a baked `NavigationMesh` with the server.
- **NavigationAgent3D** — high-level helper node for path-following and RVO avoidance; wraps NavigationServer3D API calls.
- **NavigationObstacle3D** — adds avoidance-only constraints (does not affect global pathfinding or the navigation mesh).

The server does **not** apply changes immediately. All mutations (new regions, agent position updates, obstacle changes) are batched and synchronized at the **end of each physics frame**.

---

## NavigationAgent3D — Standard Setup

Always add `NavigationAgent3D` as a **child node** of the moving body (`CharacterBody3D`, `RigidBody3D`, or `Node3D`).

### Initialization Timing

Never query a path in `_Ready()` — the navigation map is not synchronized yet. Guard with `MapGetIterationId` before any path operation:

```csharp
// MapGetIterationId returns 0 when the map has never synchronized (empty / not ready).
if (NavigationServer3D.MapGetIterationId(_navigationAgent.GetNavigationMap()) == 0)
    return;
```

### Physics Process Loop (CharacterBody3D)

Path following must happen inside `_PhysicsProcess`. Call `GetNextPathPosition()` every frame — it advances internal waypoint state:

```csharp
public partial class MyEnemy : CharacterBody3D
{
    [Export] public float MovementSpeed { get; set; } = 4.0f;

    private NavigationAgent3D _navigationAgent;

    public override void _Ready()
    {
        _navigationAgent = GetNode<NavigationAgent3D>("NavigationAgent3D");
        // Connect VelocityComputed before the first physics tick.
        _navigationAgent.VelocityComputed += OnVelocityComputed;
    }

    public void SetTarget(Vector3 target)
    {
        _navigationAgent.TargetPosition = target;
    }

    public override void _PhysicsProcess(double delta)
    {
        if (NavigationServer3D.MapGetIterationId(_navigationAgent.GetNavigationMap()) == 0)
            return;

        if (_navigationAgent.IsNavigationFinished())
            return;

        Vector3 nextPos = _navigationAgent.GetNextPathPosition();
        Vector3 newVelocity = GlobalPosition.DirectionTo(nextPos) * MovementSpeed;

        if (_navigationAgent.AvoidanceEnabled)
            _navigationAgent.Velocity = newVelocity; // triggers VelocityComputed asynchronously
        else
            OnVelocityComputed(newVelocity);
    }

    private void OnVelocityComputed(Vector3 safeVelocity)
    {
        Velocity = safeVelocity;
        MoveAndSlide();
    }
}
```

### Physics Process Loop (RigidBody3D)

```csharp
private void OnVelocityComputed(Vector3 safeVelocity)
{
    LinearVelocity = safeVelocity;
}
```

### Physics Process Loop (Node3D — manual movement)

```csharp
private float _movementDelta;

public override void _PhysicsProcess(double delta)
{
    if (NavigationServer3D.MapGetIterationId(_navigationAgent.GetNavigationMap()) == 0)
        return;

    if (_navigationAgent.IsNavigationFinished())
        return;

    _movementDelta = MovementSpeed * (float)delta;
    Vector3 nextPos = _navigationAgent.GetNextPathPosition();
    Vector3 newVelocity = GlobalPosition.DirectionTo(nextPos) * _movementDelta;

    if (_navigationAgent.AvoidanceEnabled)
        _navigationAgent.Velocity = newVelocity;
    else
        OnVelocityComputed(newVelocity);
}

private void OnVelocityComputed(Vector3 safeVelocity)
{
    GlobalPosition = GlobalPosition.MoveToward(GlobalPosition + safeVelocity, _movementDelta);
}
```

### Key Distance Properties

| Property | Purpose |
|---|---|
| `PathDesiredDistance` | Advance to next waypoint when agent is within this distance |
| `TargetDesiredDistance` | Mark navigation finished when within this distance from the target |
| `PathMaxDistance` | Trigger repath if agent strays this far from the calculated path |

---

## RVO Avoidance

Avoidance is **decoupled from pathfinding** — it adjusts the per-frame velocity to steer away from nearby agents and obstacles, but does not recalculate the global path.

### Enabling Avoidance

Set `AvoidanceEnabled = true` on `NavigationAgent3D`, then pass the intended velocity via the `Velocity` property. The server computes a safe velocity and fires the `VelocityComputed` signal:

```csharp
_navigationAgent.AvoidanceEnabled = true;
_navigationAgent.Radius = 0.5f;
_navigationAgent.MaxSpeed = 5.0f;
_navigationAgent.NeighborDistance = 50.0f;
_navigationAgent.MaxNeighbors = 10;
_navigationAgent.TimeHorizonAgents = 1.5f;
_navigationAgent.TimeHorizonObstacles = 0.5f;
```

### 2D vs 3D Avoidance

- **2D avoidance** (default): agents are treated as cylinders; fast and sufficient for flat or single-level terrain.
- **3D avoidance**: full sphere-based RVO; use only when agents move on different elevation levels simultaneously.

```csharp
_navigationAgent.Use3dAvoidance = true; // enable only when agents occupy multiple height levels
```

### Avoidance Layers and Masks

Avoidance uses a separate 32-bit bitmask system, independent from navigation mesh layers:

```csharp
_navigationAgent.AvoidanceLayers = 1;     // layers this agent occupies
_navigationAgent.AvoidanceMask = 1;       // layers this agent avoids
_navigationAgent.AvoidancePriority = 1.0f; // higher priority agents are deflected less
```

---

## Direct NavigationServer3D API

Use the direct API when `NavigationAgent3D` is insufficient: custom map separation by actor size, runtime baking, or one-shot path queries without a scene node.

### Map and Region Setup

```csharp
// Create and activate a map
Rid navigationMap = NavigationServer3D.MapCreate();
NavigationServer3D.MapSetActive(navigationMap, true);
NavigationServer3D.MapSetUp(navigationMap, Vector3.Up);

// Create a region and assign the navigation mesh
Rid navigationRegion = NavigationServer3D.RegionCreate();
NavigationServer3D.RegionSetMap(navigationRegion, navigationMap);
NavigationServer3D.RegionSetNavigationMesh(navigationRegion, myNavigationMesh);

// Changes are applied at end of next physics frame — guard with MapGetIterationId before querying.
```

### One-Shot Path Query (`MapGetPath`)

```csharp
Vector3[] path = NavigationServer3D.MapGetPath(
    map, startPosition, targetPosition, optimize: true);
```

### Reusable Path Query (`QueryPath` — preferred for frequent use)

Create parameter and result objects **once** and reuse to avoid per-frame allocation:

```csharp
// Declare at field level:
private readonly NavigationPathQueryParameters3D _queryParams = new();
private readonly NavigationPathQueryResult3D _queryResult = new();

private Vector3[] QueryPath(Vector3 from, Vector3 to, uint navLayers = 1)
{
    Rid map = GetWorld3D().NavigationMap;

    if (NavigationServer3D.MapGetIterationId(map) == 0)
        return System.Array.Empty<Vector3>();

    _queryParams.Map = map;
    _queryParams.StartPosition = from;
    _queryParams.TargetPosition = to;
    _queryParams.NavigationLayers = navLayers;
    _queryParams.PathPostprocessing =
        NavigationPathQueryParameters3D.PathPostprocessingEnum.Corridorfunnel;

    NavigationServer3D.QueryPath(_queryParams, _queryResult);
    return _queryResult.GetPath();
}
```

### Path Simplification (Ramer-Douglas-Peucker)

```csharp
_queryParams.SimplifyPath = true;
_queryParams.SimplifyEpsilon = 1.0f; // higher = fewer points, less accurate
```

### NavigationMesh Baking at Runtime

```csharp
NavigationMesh navMesh = new NavigationMesh();
navMesh.AgentRadius = 0.5f;
navMesh.AgentHeight = 1.8f;

NavigationMeshSourceGeometryData3D sourceGeom = new();
NavigationServer3D.ParseSourceGeometryData(navMesh, sourceGeom, sceneRootNode);
// Baking can run on a background thread for large meshes:
NavigationServer3D.BakeFromSourceGeometryData(navMesh, sourceGeom);
```

---

## NavigationObstacle3D

`NavigationObstacle3D` affects **avoidance only** — it does not modify the navigation mesh and does not cause agents to recalculate their global path around moving obstacles.

### Static Obstacle (polygon boundary)

Populate `Vertices` to define a polygon area. Avoidance-enabled agents will not cross into the area:

```csharp
NavigationObstacle3D obstacle = GetNode<NavigationObstacle3D>("Obstacle");
obstacle.Vertices = new Vector3[]
{
    new(-1, 0, -1), new(1, 0, -1),
    new(1, 0, 1),  new(-1, 0, 1)
};
```

### Dynamic Obstacle (radius-based)

Set `Radius > 0` for a moving obstacle. Agents smoothly steer away rather than hard-stopping at a boundary:

```csharp
obstacle.Radius = 1.0f; // Vertices must be empty for dynamic mode.
```

### Carving Into the NavigationMesh

`CarveNavigationMesh = true` cuts the obstacle shape into the navigation mesh so agents route around it in **pathfinding** as well. Use for static geometry that was not included in the original bake.

---

## Navigation Layers

Navigation layers use a 32-bit bitmask. A path query only traverses regions whose layer bits overlap with the query's layer bits. Note: navigation layers are separate from avoidance layers.

```csharp
// Utility helpers:
private static uint EnableLayer(uint bitmask, int index)  => bitmask | (1u << index);
private static uint DisableLayer(uint bitmask, int index) => bitmask & ~(1u << index);
private static bool IsLayerEnabled(uint bitmask, int index) => (bitmask & (1u << index)) != 0;

// Apply to a region node:
region.NavigationLayers = EnableLayer(region.NavigationLayers, 3);

// Apply to an agent — future path queries will only use matching regions:
agent.NavigationLayers = DisableLayer(agent.NavigationLayers, 3);

// Apply to a manual MapGetPath query:
uint queryLayers = EnableLayer(0, 1); // only layer 1
Vector3[] filteredPath = NavigationServer3D.MapGetPath(map, start, end, true, queryLayers);
```

---

## Best Practices

- **Always guard with `MapGetIterationId == 0`** before any path query — an unsynchronized map returns empty paths silently, with no error.
- **Call `GetNextPathPosition()` every physics frame**, even when `TargetPosition` has not changed — the function advances internal waypoint tracking state.
- **Stop calling `GetNextPathPosition()` once `IsNavigationFinished()` is true** — continued calls cause jitter at the destination.
- **Rate-limit `TargetPosition` updates** for moving targets; updating every frame is wasteful. Cache the last assigned target and only re-assign when it has moved beyond a threshold.
- **Reuse `NavigationPathQueryParameters3D` / `NavigationPathQueryResult3D`** — create once at field level, update fields per query.
- **Enable avoidance selectively** — RVO processing scales with the number of registered agents. Disable it on agents that are far from any neighbors or that are parked/idle.
- **Use separate navigation maps for different actor sizes** (`AgentRadius`, `AgentHeight`) rather than one compromise mesh.
- **Prefer 2D avoidance** (the default) unless agents genuinely navigate at different elevation levels simultaneously.
- **Lower the NavigationServer3D edge merge margin** from its default (`5.0`) when regions share borders — the default can cause agents to get lost near seams between NavigationRegion3D nodes.

---

## Anti-patterns

- **Setting `TargetPosition` before map synchronization** — results in an empty path with no warning. Always guard with `MapGetIterationId`.
- **Querying paths in `_Ready()`** — map synchronization runs at the end of the first physics frame; `_Ready()` is too early.
- **Writing to `CharacterBody3D.Velocity` directly in `_PhysicsProcess` when avoidance is enabled** — overwrites the safe velocity from `VelocityComputed`. Apply motion only inside the `VelocityComputed` callback.
- **Enabling `AvoidanceEnabled` unconditionally on all agents** — avoidance cost grows with agent count; enable only when agents are within interaction range.
- **Expecting `NavigationObstacle3D` to affect global pathfinding for moving obstacles** — it only influences local avoidance velocity. Moving obstacles are invisible to A* / navmesh routing. For static changes, use `CarveNavigationMesh` or rebake.
- **Allocating `NavigationPathQueryParameters3D` inside a loop or per-frame method** — causes GC pressure. Allocate once and reuse.
- **Ignoring the `NavigationFinished` signal and always relying on polling** — connect to `NavigationFinished` and `TargetReached` signals to trigger state transitions cleanly instead of polling `IsNavigationFinished()` every frame in non-movement code.
