---
version: 1.0.0
---

# A* Pathfinding Project

> **Scope**: A* Pathfinding Project (by Aron Granberg) — graph setup and selection, movement script usage, path requesting via Seeker, runtime graph updates, local avoidance (RVO), and performance optimization for Unity.
> **Load when**: implementing AI movement with A* Pathfinding Project, setting up graphs (grid, recast, navmesh), scripting Seeker path requests, updating walkability at runtime, configuring local avoidance, debugging pathfinding performance, choosing between AIPath / FollowerEntity / RichAI / AILerp.

---

## Core Components

| Component | Role |
|-----------|------|
| `AstarPath` | Singleton. Owns all graphs, settings, and the pathfinding thread. One per scene. |
| `Seeker` | Per-agent path requester and post-processor. Attach to every agent using path movement. Not needed for `FollowerEntity`. |
| `AIPath` | General-purpose movement script. Works with all graph types. |
| `FollowerEntity` | ECS-based movement script. Recommended for new projects (navmesh/recast). Does not need a Seeker. |
| `RichAI` | Legacy navmesh/recast movement script. Kept for compatibility — prefer `FollowerEntity` in new projects. |
| `AILerp` | Fastest movement script; linear interpolation, no physics. |
| `AIDestinationSetter` | Helper component that sets `ai.destination` from a Transform every frame. |

Always add `using Pathfinding;` at the top of scripts that use pathfinding types.

---

## Graph Types

Choose the right graph for your world geometry:

| Graph | Best for | Pros | Cons |
|-------|----------|------|------|
| **GridGraph** | RTS, tower defence, small-to-mid worlds, runtime updates | Fast graph updates, tags/penalties work well | High memory, slow pathfinding over long distances |
| **RecastGraph** *(Pro)* | Large open worlds, detailed 3D geometry | Fast pathfinding, low memory, handles varied detail | Slow initial scan, slower updates than grid |
| **NavmeshGraph** | Hand-crafted navmeshes from a modeling tool | Fast pathfinding, low memory | Requires manual authoring, poor tag precision |
| **LayerGridGraph** *(Pro)* | Multi-storey / overlapping walkable areas | Handles vertical stacking | Slightly higher memory than GridGraph |
| **PointGraph** | Fully custom node placement, 3D graphs | Full control | Requires extensive manual setup; generally slow |

**Selection heuristic:** start with RecastGraph for most 3D worlds → GridGraph for top-down / RTS → NavmeshGraph only when you author the mesh manually → PointGraph as a last resort.

### Graph Scanning Tips

**GridGraph scan optimizations:**
- Disable Height Testing for flat worlds.
- Turn off Erosion when not needed.
- Disable Collision Testing if obstacles are large/simple.

**RecastGraph scan optimizations:**
- Increase Cell Size to reduce voxel count.
- Enable Tiling (64–256 voxels per tile) to leverage parallel scanning on multicore hardware.
- Rasterize colliders instead of meshes — colliders are simpler, physics queries are faster too.
- Minimize the graph bounding box to the essential world area.

**Async scanning** to avoid startup freeze:

```csharp
// Disable "Scan On Awake" in AstarPath inspector, then:
IEnumerator Start() {
    foreach (var progress in AstarPath.active.ScanAsync()) {
        yield return null;
    }
}
```

Cache scanned graphs for static worlds (see "Saving and Loading Graphs" in official docs) to eliminate startup scan entirely.

---

## Movement Scripts

### Choosing a Movement Script

| Script | Graph types | Physics | Local avoidance | Notes |
|--------|-------------|---------|-----------------|-------|
| `FollowerEntity` | Grid, Navmesh, Recast | No CharacterController | Built-in (enable checkbox) | ECS-based; recommended for new projects; no path modifiers |
| `AIPath` | All | Rigidbody / CharacterController / transform | Via `RVOController` | Best general-purpose choice |
| `RichAI` | Navmesh/Recast only | transform | Via `RVOController` | Legacy; prefer `FollowerEntity` |
| `AILerp` | All | None (lerp only) | Not supported | Fastest; for arcade / non-physics movement |

All scripts implement `IAstarAI` — use the interface in code to stay script-agnostic:

```csharp
var ai = GetComponent<IAstarAI>();
ai.destination = targetPosition;
ai.SearchPath();
```

### IAstarAI Key API

```csharp
// --- Destination & movement ---
ai.destination       = pos;      // Set target (does NOT auto-recalculate — call SearchPath or rely on repathRate)
ai.SearchPath();                 // Request immediate path recalculation
ai.isStopped         = true;     // Smooth stop (maintains gravity / avoidance reactions)
ai.canMove           = false;    // Disable movement entirely
ai.canSearch         = false;    // Disable automatic path recalculation
ai.maxSpeed          = 5f;

// --- Status ---
bool arriving     = ai.reachedDestination;  // Best-effort: within endReachedDistance of destination
bool atEndOfPath  = ai.reachedEndOfPath;    // Reliable: agent is at end of computed path
bool calculating  = ai.pathPending;
bool hasPath      = ai.hasPath;

// --- Teleport ---
ai.Teleport(newPos, clearPath: true);

// --- Reset path ---
ai.SetPath(null); // Clears current path
```

**`reachedDestination` vs `reachedEndOfPath`:**
- `reachedDestination` — updates immediately when destination changes (approximate, useful for quick checks).
- `reachedEndOfPath` — waits for path to be calculated and traversed (more reliable for "arrival" logic).

### Waiting for Arrival

```csharp
IEnumerator MoveTo(Vector3 target) {
    ai.destination = target;
    ai.SearchPath();
    yield return new WaitUntil(() => !ai.pathPending);
    yield return new WaitUntil(() => ai.reachedEndOfPath);
    // agent has arrived
}
```

### AIPath-Specific Settings

```csharp
ai.slowdownDistance       = 0.6f;    // Start decelerating at this distance
ai.pickNextWaypointDist   = 2f;      // Lookahead for steering target
ai.endReachedDistance     = 0.2f;    // Distance threshold to consider destination reached
ai.rotationSpeed          = 360f;    // Degrees per second
```

Movement fallback chain (highest priority first): `RVOController` → `CharacterController` → `Rigidbody` / `Rigidbody2D` → `Transform.position`.

### FollowerEntity & ECS

`FollowerEntity` runs on ECS internally even when used as a regular MonoBehaviour — no code changes required for the performance benefit.

For **maximum performance** (hundreds of agents), bake `FollowerEntity` into a Subscene. Access baked entities via `FollowerEntityProxy`:

```csharp
var proxy = new FollowerEntityProxy(world, entity);
proxy.maxSpeed    = 5f;
proxy.destination = targetPos;
```

ECS mode is worth the complexity at roughly **100+ agents**. Below that, plain `AIPath` is simpler with comparable performance.

---

## Path Requests (Seeker)

### Basic Pattern

```csharp
using Pathfinding;

public class EnemyAI : MonoBehaviour {
    Seeker _seeker;

    void Awake() => _seeker = GetComponent<Seeker>();

    public void MoveTo(Vector3 target) {
        _seeker.StartPath(transform.position, target, OnPathComplete);
    }

    void OnPathComplete(Path path) {
        if (path.error) {
            Debug.LogError($"Path error: {path.errorLog}");
            return;
        }
        var abPath = path as ABPath;
        List<Vector3> waypoints = abPath.vectorPath; // world-space waypoints
    }
}
```

### Seeker API

```csharp
seeker.StartPath(start, end, callback);
seeker.StartPath(start, end, callback, graphMask);
seeker.CancelCurrentPathRequest();
bool done = seeker.IsDone();

// Graph mask — only search specific graphs
seeker.graphMask = GraphMask.FromGraphName("My Grid Graph");
seeker.graphMask = GraphMask.FromGraphIndex(0) | GraphMask.FromGraphIndex(1);

// Tag traversal
seeker.traversableTags = (1 << 0) | (1 << 2); // tags 0 and 2 only

// Tag cost multipliers
var costs = new float[32];
costs[1] = 2.5f; // tag 1 is 2.5× more expensive
seeker.tagCostMultipliers = costs;
```

Do NOT use the deprecated `seeker.pathCallback` delegate — pass callbacks per `StartPath` call instead.

### Path Types

| Type | Use case |
|------|----------|
| `ABPath` | Standard A-to-B path (default) |
| `MultiTargetPath` | Shortest path from one origin to multiple targets |
| `RandomPath` | Path to a random reachable point |
| `FleePath` | Path leading away from a given point |
| `ConstantPath` | All nodes reachable within a given distance (flood) |
| `FloodPath` | Pre-compute paths from everywhere to a single point |

`vectorPath` — post-modifier world-space points; use this for steering.
`path` (List<GraphNode>) — raw graph nodes; use for node-level logic.

### Path States

`PathCompleteState`: `NotCalculated` → `Complete` | `Partial` | `Error`

Always check `path.error` before using the result. A `Partial` path is valid but may not reach the target.

---

## Runtime Graph Updates

### Quick Update (physics-based)

```csharp
var guo = new GraphUpdateObject(obstacleCollider.bounds);
guo.updatePhysics = true; // rescan colliders in the region
AstarPath.active.UpdateGraphs(guo);
```

Updates are queued and processed before the next pathfinding calculation.

### Tower Defence Placement Check

Use `GraphUpdateUtilities.UpdateGraphsNoBlock` to validate that a placed obstacle does not block the path — it reverts the update automatically if the path is blocked:

```csharp
var guo = new GraphUpdateObject(tower.GetComponent<Collider>().bounds);
var spawnNode = AstarPath.active.GetNearest(spawnPoint.position).node;
var goalNode  = AstarPath.active.GetNearest(goalPoint.position).node;

if (GraphUpdateUtilities.UpdateGraphsNoBlock(guo, spawnNode, goalNode, false)) {
    // valid placement — graph is updated
} else {
    Destroy(tower); // blocked — graph was reverted
}
```

### Thread-Safe Direct Node Modification

Use `AddWorkItem` when you need to write directly to graph data. Pathfinding threads are automatically paused:

```csharp
AstarPath.active.AddWorkItem(new AstarWorkItem(ctx => {
    var gg = AstarPath.active.data.gridGraph;
    for (int z = 0; z < gg.depth; z++)
        for (int x = 0; x < gg.width; x++)
            gg.GetNode(x, z).Walkable = Mathf.PerlinNoise(x * 0.1f, z * 0.1f) > 0.4f;
    gg.RecalculateAllConnections();
}));
```

Never write to graph data outside an `AddWorkItem` — pathfinding may be running on a background thread.

### NavmeshCut (Pro — Recast/Navmesh only)

`NavmeshCut` punches holes in a recast graph without a full tile rescan. It is faster than `UpdateGraphs` for dynamic obstacles on navmesh graphs. Cannot *add* new navmesh surface — only cut existing area.

---

## Local Avoidance (RVO) — Pro Only

### Setup

1. Add one `RVOSimulator` component per scene (auto-discovered by agents).
2. For `AIPath` / `RichAI`: add `RVOController` to the same GameObject.
   - Remove `Rigidbody` and `CharacterController` — they conflict with RVO movement.
3. For `FollowerEntity`: enable the "Local Avoidance" checkbox directly.
4. `AILerp`: incompatible — do not use with RVO.

### RVOController Key Properties

```csharp
rvo.radius            = 0.5f;    // Agent physical radius
rvo.height            = 2.0f;    // Agent vertical extent
rvo.agentTimeHorizon  = 1.0f;    // Seconds to look ahead for agent collisions
rvo.obstacleTimeHorizon = 0.5f;  // Seconds to look ahead for obstacle collisions
rvo.maxNeighbours     = 10;      // Fewer = faster, more = better avoidance quality
rvo.priority          = 0.5f;    // 0–1; higher priority agents yield less
rvo.locked            = false;   // Prevent this agent from moving (others still avoid it)
rvo.layer             = ...;     // Avoidance layer (independent of Unity physics layers)
rvo.collidesWith      = ...;     // Layer mask of agents to avoid
```

### Manual Velocity Control (e.g., player character)

Set `rvo.velocity` directly to bypass avoidance calculations while still being seen by other agents:

```csharp
void Update() {
    var v = new Vector3(Input.GetAxis("Horizontal"), 0, Input.GetAxis("Vertical")) * speed;
    rvoController.velocity = v;
    transform.position += v * Time.deltaTime;
}
```

Disable agent-layer self-collision in Unity Physics settings (Edit → Project Settings → Physics) to prevent physics interference in crowded scenes.

---

## Optimization

### Highest-Impact Settings

1. **Enable multithreading** — A* Inspector → Settings → Thread Count (match CPU core count). Moves pathfinding off the main thread. Single most impactful setting.
2. **Set Path Log Mode to None** — disables path debug logging, which can halve throughput.
3. **Reduce `repathRate`** — increase the interval between automatic path recalculations. Use "Dynamic" mode to recalculate less often when agents are far from their target.
4. **Use RecastGraph over GridGraph** for large open worlds — significantly fewer nodes → faster pathfinding.

### Startup

- Cache scanned graphs and load from file at startup (no scan needed for static worlds).
- Use `AstarPath.active.ScanAsync()` to prevent frame freezes during scanning.

### Many Agents (50+)

- Avoid `CharacterController` per agent — it is expensive. Use raycasting for ground detection instead (AIPath / RichAI support this natively).
- For 100+ agents, switch to `FollowerEntity` which leverages Burst + Jobs.
- Remove the unused Update/FixedUpdate override in `AIBase.cs` if you have many agents (saves per-frame overhead).

### Graph Updates

- Prefer `NavmeshCut` over full `UpdateGraphs()` for Recast graphs — much faster for dynamic obstacles.
- Batch graph updates when possible rather than calling `UpdateGraphs` every frame.

### Path Modifiers

- Avoid excessive smoothing passes (e.g., SimpleSmoothModifier with many subdivisions) when not needed — `AIPath` already handles smooth steering natively.

### Editor Profiling

- Disable "Show Graphs" in the A* Inspector during performance profiling — rendering graph gizmos adds significant overhead in the Editor (no impact in builds).

---

## Anti-patterns

- **Writing graph data outside `AddWorkItem`** — pathfinding runs on background threads; direct writes cause race conditions.
- **Calling `UpdateGraphs` every frame for moving obstacles** — prefer `NavmeshCut` for recast graphs; for grid graphs, keep update regions small.
- **Using deprecated `seeker.pathCallback` delegate** — pass callbacks directly to `StartPath` to avoid GC and stale delegate issues.
- **Adding `RVOController` with `CharacterController` still active** — movement fallback chain picks CharacterController and ignores RVO velocity; remove CharacterController first.
- **Polling `reachedEndOfPath` without waiting for `!pathPending`** — path may still be in-flight; `reachedEndOfPath` returns false even when already at destination.
- **Using `RichAI` in new projects** — it is kept for compatibility only. Use `FollowerEntity` instead.
- **Using PointGraph without strong justification** — requires extensive manual setup and has slow pathfinding; prefer GridGraph or RecastGraph.
- **Enabling "Show Graphs" during profiling** — graph rendering inflates frame time in Editor, masking real performance issues.
- **Scanning large RecastGraphs synchronously at startup** — causes a visible freeze; always use `ScanAsync`.
- **Statically batching meshes used for RecastGraph generation at runtime** — Unity makes statically batched meshes unreadable at runtime; those meshes cannot be used for graph scanning.
