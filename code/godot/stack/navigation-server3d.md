---
version: 1.0.0
---

# NavigationServer3D & NavigationAgent3D

> **Scope**: Godot 4 navigation system — NavigationAgent3D usage patterns, initialization timing, RVO avoidance setup, direct NavigationServer3D API, path query objects, NavigationObstacle3D behavior, and navigation layer filtering.
> **Load when**: implementing agent pathfinding, setting up navigation meshes, wiring RVO avoidance, querying paths via NavigationServer3D, using NavigationAgent3D, debugging navigation issues, optimizing large navigation maps.

---

## Core Concepts

The navigation system separates **scene helpers** from a **singleton server**:

| Node/Class | Role |
|---|---|
| `NavigationRegion3D` | Holds a `NavigationMesh` resource defining walkable areas |
| `NavigationAgent3D` | Helper node — wraps common `NavigationServer3D` API calls |
| `NavigationLink3D` | Connects distant mesh positions (ladders, jumps, teleporters) |
| `NavigationObstacle3D` | Affects avoidance velocity and/or mesh baking — not pathfinding alone |
| `NavigationServer3D` | Singleton server — manages maps, regions, agents via RIDs |

`NavigationServer3D` operates asynchronously. All setter/delete calls are **queued** and executed at the physics frame synchronization point, not immediately.

## Initialization Timing — Critical Rule

**On the first frame the NavigationServer map has never synchronized and any path query returns empty.**

Never `await` directly inside `_ready()` — it can stall the scene tree. Always use `call_deferred()` to defer setup, then await inside the deferred function:

```gdscript
func _ready():
    navigation_agent.path_desired_distance = 0.5
    navigation_agent.target_desired_distance = 0.5
    # call_deferred prevents stalling _ready()
    actor_setup.call_deferred()

func actor_setup():
    # Wait for first physics frame so NavigationServer can sync.
    await get_tree().physics_frame
    navigation_agent.set_target_position(movement_target_position)
```

In `_physics_process`, guard against an unsynced map before querying:

```gdscript
func _physics_process(delta):
    if NavigationServer3D.map_get_iteration_id(navigation_agent.get_navigation_map()) == 0:
        return  # Map has never synced — skip this frame
```

## NavigationAgent3D — Key Properties

| Property | Purpose |
|---|---|
| `target_position` | Destination in world space; setting it triggers path query |
| `path_desired_distance` | Advance to the next waypoint when this close |
| `target_desired_distance` | Mark target as reached when this close |
| `path_max_distance` | Re-request path if agent strays farther than this |
| `navigation_layers` | Bitmask — limits which navigation regions the agent can use |
| `avoidance_enabled` | Toggles RVO avoidance processing |
| `simplify_path` / `simplify_epsilon` | Remove redundant waypoints (Ramer-Douglas-Peucker) |

`path_desired_distance` and `target_desired_distance` must be tuned to the agent's movement speed and the polygon density of the navigation mesh. Too small values cause oscillation at high speeds.

## Movement Pattern — CharacterBody3D

NavigationAgent3D **never moves the parent node automatically**. Movement is always the developer's responsibility.

```gdscript
extends CharacterBody3D

@export var movement_speed: float = 4.0
@onready var navigation_agent: NavigationAgent3D = $NavigationAgent3D

func _ready():
    navigation_agent.path_desired_distance = 0.5
    navigation_agent.target_desired_distance = 0.5
    navigation_agent.velocity_computed.connect(_on_velocity_computed)
    actor_setup.call_deferred()

func actor_setup():
    await get_tree().physics_frame
    navigation_agent.set_target_position(target_position)

func set_movement_target(movement_target: Vector3):
    navigation_agent.set_target_position(movement_target)

func _physics_process(_delta):
    if NavigationServer3D.map_get_iteration_id(navigation_agent.get_navigation_map()) == 0:
        return
    if navigation_agent.is_navigation_finished():
        return

    var next_pos: Vector3 = navigation_agent.get_next_path_position()
    var new_velocity: Vector3 = global_position.direction_to(next_pos) * movement_speed

    if navigation_agent.avoidance_enabled:
        navigation_agent.set_velocity(new_velocity)  # RVO path: server computes safe_velocity
    else:
        _on_velocity_computed(new_velocity)

func _on_velocity_computed(safe_velocity: Vector3):
    velocity = safe_velocity
    move_and_slide()
```

Always call `get_next_path_position()` **every physics frame** while navigating — it updates internal agent state. Do not call it after `is_navigation_finished()` returns `true`.

## RVO Avoidance

The avoidance system uses **Reciprocal Velocity Obstacles (RVO)** and operates independently from pathfinding:

1. Set `velocity` on the agent → the server computes a `safe_velocity` that avoids other agents/obstacles.
2. The server emits `velocity_computed` signal with the result.
3. Apply `safe_velocity` to actually move the body.

**Avoidance is separate from pathfinding.** The avoidance `radius` property does not affect the navigation mesh or path calculation in any way.

```gdscript
# Enabling avoidance via property (simplest):
navigation_agent.avoidance_enabled = true
navigation_agent.velocity_computed.connect(_on_velocity_computed)

# Or via server RID for more control:
var agent_rid: RID = navigation_agent.get_rid()
NavigationServer3D.agent_set_avoidance_enabled(agent_rid, true)
NavigationServer3D.agent_set_avoidance_callback(agent_rid, Callable(self, "_on_velocity_computed"))
NavigationServer3D.agent_set_use_3d_avoidance(agent_rid, true)  # Default is 2D (XZ plane)
```

Key avoidance properties on `NavigationAgent3D`:

| Property | Purpose |
|---|---|
| `radius` | Agent body size for avoidance calculations (independent of NavMesh radius) |
| `max_speed` | Max velocity the avoidance system will output |
| `neighbor_distance` | Search radius for detecting nearby agents |
| `max_neighbors` | Maximum agents considered per calculation |
| `time_horizon_agents` | Prediction time window for other agents (seconds) |
| `time_horizon_obstacles` | Prediction time window for static obstacles (seconds) |
| `use_3d_avoidance` | `false` = flat XZ plane; `true` = full 3D sphere |
| `avoidance_layers` | Bitmask — which avoidance layers this agent belongs to |
| `avoidance_mask` | Bitmask — which avoidance layers this agent avoids |
| `avoidance_priority` | Higher priority agents are avoided more by others |

Only agents on the **same navigation map** with `avoidance_enabled = true` interact with each other. Avoidance signals dispatch **before** `PhysicsServer` sync — `move_and_slide()` inside the callback is safe.

## NavigationObstacle3D

`NavigationObstacle3D` has two independent behaviors controlled by separate properties:

| Property | Effect |
|---|---|
| `avoidance_enabled = true` | Agents steer around this obstacle (RVO only — no path change) |
| `affect_navigation_mesh = true` | Obstacle geometry is carved into the baked navigation mesh |

**If an obstacle completely blocks the path, the agent will NOT reroute.** Dynamic blocking requires runtime rebaking of the navigation mesh.

Vertex winding for polygon obstacles matters: **clockwise** winds push agents **inward**; **counter-clockwise** winds push agents **outward**.

## NavigationServer3D — Direct API

Prefer scene nodes (`NavigationRegion3D`, `NavigationAgent3D`) for most cases. Use the direct API when procedurally generating navigation data:

```gdscript
func custom_setup():
    # Create and activate a new navigation map.
    var map: RID = NavigationServer3D.map_create()
    NavigationServer3D.map_set_up(map, Vector3.UP)
    NavigationServer3D.map_set_active(map, true)

    # Create a region and attach a navigation mesh.
    var region: RID = NavigationServer3D.region_create()
    NavigationServer3D.region_set_transform(region, Transform3D())
    NavigationServer3D.region_set_map(region, map)
    NavigationServer3D.region_set_navigation_mesh(region, navigation_mesh)

    # Wait for sync before querying.
    await get_tree().physics_frame

    var path: PackedVector3Array = NavigationServer3D.map_get_path(
        map, start_position, target_position, true
    )
```

**Thread safety**: Path query functions (`map_get_path`, `query_path`) are thread-safe and can run in true parallel from worker threads. However, they are **blocked by a Mutex during the sync phase**. All setter/deleter calls are always queued — never applied immediately.

## NavigationPathQueryParameters3D — Advanced Queries

Prefer `NavigationPathQueryParameters3D` over `map_get_path()` when you need region filtering, metadata, or path simplification.

Create both objects **once** and reuse them — avoid per-frame allocation:

```gdscript
var _query_params := NavigationPathQueryParameters3D.new()
var _query_result := NavigationPathQueryResult3D.new()

func query_path(from: Vector3, to: Vector3, layers: int = 1) -> PackedVector3Array:
    var map: RID = get_world_3d().get_navigation_map()
    if NavigationServer3D.map_get_iteration_id(map) == 0:
        return PackedVector3Array()

    _query_params.map = map
    _query_params.start_position = from
    _query_params.target_position = to
    _query_params.navigation_layers = layers

    NavigationServer3D.query_path(_query_params, _query_result)
    return _query_result.get_path()
```

Key parameters:

| Parameter | Options / Notes |
|---|---|
| `path_postprocessing` | `CORRIDORFUNNEL` (default — shortest), `EDGECENTERED` (grid games), `NONE` (debug) |
| `simplify_path` | Enable Ramer-Douglas-Peucker simplification |
| `simplify_epsilon` | Tolerance for simplification — higher = fewer waypoints |
| `excluded_regions` | Skip these region RIDs during search |
| `included_regions` | Only search these region RIDs (great for chunked large maps) |
| `path_search_max_polygons` | Stop after N polygons — calibrate carefully or path quality degrades |
| `metadata_flags` | Disable `PATH_METADATA_INCLUDE_TYPES/RIDS/OWNERS` for performance |

Overly restrictive `path_search_max_polygons` or `path_search_max_distance` can send agents in completely wrong directions. Increase conservatively.

## Navigation Layers

Use `navigation_layers` (bitmask) to control which regions each agent can use:

- Changing layers on a **path query** is cheap — no NavigationServer updates triggered.
- Enabling/disabling entire **regions** is expensive — triggers large-scale server updates.
- Prefer layer filtering over region toggling for per-agent access control.

## Performance Guidelines

- **Update `target_position` at intervals** for chasing targets, not every frame. A 0.1–0.5s interval is typical for 60fps; every-frame updates cause unneeded path queries.
- **Reuse** `NavigationPathQueryParameters3D` and `NavigationPathQueryResult3D` objects — never create them per query.
- **Disable unused metadata flags** on path query objects to reduce memory allocation.
- **Use region partitioning + `included_regions`** on large open-world maps to limit polygon search scope.
- For performance-critical NPCs, consider querying paths from a worker thread (path query functions are thread-safe).

## Anti-patterns

- **Awaiting in `_ready()`** — never `await get_tree().physics_frame` directly inside `_ready()`. Use `call_deferred()` instead to avoid stalling.
- **Querying path on frame 0** — `NavigationServer3D.map_get_iteration_id() == 0` means the map is empty; any query returns no path. Always guard or defer.
- **Calling `get_next_path_position()` after `is_navigation_finished()`** — internal state is undefined; skip the call when navigation is finished.
- **Confusing avoidance radius with NavMesh agent radius** — these are completely independent. The avoidance `radius` on `NavigationAgent3D` does not affect pathfinding geometry.
- **Mismatched `avoidance_layers` / `avoidance_mask`** — agents that don't share compatible layer/mask pairs will not avoid each other.
- **Using `NavigationObstacle3D` to dynamically block paths** — obstacles only affect avoidance unless `affect_navigation_mesh` is set AND the mesh is rebaked. A fully blocked path will not cause the agent to reroute.
- **Setting agent size without matching NavMesh bake settings** — if the NavMesh was baked with a smaller agent radius, agents of the actual size will get stuck on walls. Rebake with correct `agent_radius` in the `NavigationMesh` resource.
- **Enabling `use_3d_avoidance` unnecessarily** — 3D avoidance is more expensive. Use 2D (XZ plane) avoidance for flat-ground games.
- **Updating `target_position` every physics frame for a moving target** — throttle to a fixed interval to avoid constant path re-queries.
