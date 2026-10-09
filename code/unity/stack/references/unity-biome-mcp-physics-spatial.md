# Unity Biome MCP — Physics and Spatial Analysis

> See also: [unity-biome-mcp-scene-objects.md](unity-biome-mcp-scene-objects.md) (component mutation), [unity-biome-mcp-runtime-playmode.md](unity-biome-mcp-runtime-playmode.md) (Play Mode reads and waits), [unity-biome-mcp-diagnostics-performance.md](unity-biome-mcp-diagnostics-performance.md) (`scan_scene`, `scene_health`)

Category gates: `SCENE` for `spatial_query`, `get_spatial_context`, `check_colliders`, `validate_triggers`,
`autofit_collider`, `region_clear`, `navmesh_query`; `RUNTIME` for `debug_physics`; `VERIFY` for `scan_scene`; `MEDIA`
for `analyze_lod_culling`. Written against server and plugin v2.0.0.

> Notation: inside tables a literal pipe is written `\|` because of Markdown escaping. The real character is a bare `|`.

---

## Tool Map

| Question | Tool | Mode |
|---|---|---|
| Add or tune a Rigidbody or collider | `manage_component` + `set_property` (scene tools) | Edit |
| Are colliders set up sanely | `check_colliders` | Edit or Play |
| Fit a collider to the visible mesh | `autofit_collider` | Edit |
| What is around this object | `get_spatial_context`, `spatial_query` | Edit; raycast inside `get_spatial_context` needs Play |
| Are triggers placed too close | `validate_triggers` | Edit |
| Live velocity, contacts, sleeping state | `debug_physics` | **Play Mode only** |
| Walkable point, path, NavMesh bake | `navmesh_query` (direct-only, not batchable) | Edit |
| Preview or delete everything inside a polygon | `region_clear` | Edit |

Component mutation goes through the ordinary scene tools; the tools on this page read, validate and analyse.

```text
batch(commands="""
manage_component path=/Crate type=Rigidbody action=add
manage_component path=/Crate type=BoxCollider action=add
set_property path=/Crate component=Rigidbody prop=mass value=5
get_component path=/Crate type=Rigidbody
""", on_error="stop", atomic=True)
check_colliders(path="/Crate")
```

## Collider Checks

| Tool | What it actually tests | Limits |
|---|---|---|
| `check_colliders(path=None)` | 3D trigger without a Rigidbody on the object or a parent; negative scale on a collider object; Box side or Sphere radius below `0.01` | With `path`, checks **that object only**, not its descendants. Omit `path` for the whole scene |
| `validate_triggers(root="/", min_distance=3.0)` | Distance between trigger **transform positions** under `root` | It does not test collider-volume intersection, despite the name |
| `autofit_collider(path, type="box"\|"sphere"\|"capsule")` | Reuses or adds that collider and fits it to a `SkinnedMeshRenderer`, `MeshFilter` mesh or `Renderer` bounds on the object | Capsule radius and direction are guesses — read the collider back |

## `spatial_query`

| `action` | Required | Returns / limits |
|---|---|---|
| `nearest` | `path` (origin); optional `component` | Closest object; `component` is a **case-sensitive substring** of the type name |
| `objects_in_radius` | `radius` + `path` **or** `center="x,y,z"` | Sorted by distance; `center` wins over `path`; `cap` default 20, clamped 1–200 |
| `in_front_of` | `path`, `distance` | A position in front of the object |
| `bounds_info` | `path` | Bounds and dimensions |
| `raycast` | `path` (from), `target` (to); optional `layer_mask` | Physics ray between the two endpoints, at most 20 hits sorted by distance. Either endpoint may be a parenthesized position `"(0,1,0)"`. `distance` does **not** change the ray length; `layer_mask` is a numeric mask |
| `spatial_map` | `path`, `cell_size` | ASCII XZ grid of the hierarchy under `path`, at most 40×40 cells and 26 legend labels. `center` is ignored |
| `objects_in_polygon` | `vertices="x1,z1;x2,z2;..."` **or** `region_id` | Objects whose XZ **pivot** is inside; 3–256 vertices; `cap` default 50, clamped 1–200 |

`get_spatial_context(path, radius=5)` bundles collider bounds, eight approach directions (physics linecasts toward the
target) and nearby colliders. It describes level layout; it is not a NavMesh path and not a reachability proof.

Region membership everywhere on this page uses the object's XZ pivot, never its full bounds.

## `region_clear`

```text
region_clear(vertices="0,0;10,0;10,10;0,10", filter="Temp_", dry_run=True, cap=50)
# review the listed objects, then repeat with the identical vertices and filter:
region_clear(vertices="0,0;10,0;10,10;0,10", filter="Temp_", dry_run=False, cap=50)
```

- `dry_run` defaults to `True`. Deletion needs an explicit `dry_run=False`.
- `filter` is a case-sensitive name substring.
- `cap` (default 50, hard max 200) is applied while collecting objects inside the polygon, **before** the name filter.
  In a crowded region a narrow filter can therefore return fewer matches than really exist.
- It does not accept `region_id`; copy the saved region's vertices.
- Deletion is recorded in Unity Undo, but take a checkpoint or commit before a large clear.

## `navmesh_query`

| `action` | Arguments | Notes |
|---|---|---|
| `status` | — | Triangulation stats |
| `sample` | `center="x,y,z"`, `max_distance` | Nearest walkable point; run it before a path claim when endpoints may be off-mesh |
| `path` | `from_pos`, `to`, `area_mask=-1` | Returns Unity's path status and corners — read the **status**, a non-empty answer is not a complete path |
| `raycast` | `from_pos`, `to` | NavMesh raycast |
| `get_settings` | — | Agent type settings |
| `set_settings` | `agentRadius`, `agentHeight`, `agentClimb`, `agentSlope` | Updates every `NavMeshSurface` found; does not touch legacy Navigation-window agents |
| `bake` | — | Builds all surfaces or falls back to the legacy builder. **Project mutation** |
| `clear` | — | Removes baked data. **Project mutation** |

When the AI Navigation module is missing the tool says so. `bake` without any `NavMeshSurface` returns
`err:no NavMeshSurface found…`. Never run `bake`, `clear` or `set_settings` just to answer a read-only question.

## Play Mode Physics

`debug_physics(path, radius=5)` returns Rigidbody state, colliders, contacts and nearby bodies. It is refused outside
Play Mode. For "did it settle / did it collide" use a bounded wait on an observable value
(`wait_until`, or `WAIT_UNTIL /Ball|Rigidbody|speed < 0.05 TIMEOUT 5` in a playtest) — never a fixed delay.

## Scene-Wide Scans

- `scan_scene()` — counts of colliders, triggers, audio sources, lights, rigidbodies, canvases and navigation
  components.
- `analyze_lod_culling(focus="lod"|"culling"|"occlusion")` — LOD groups, high-poly renderers without an `LODGroup`,
  crossfade cost, whether occlusion data is baked. `culling` and `occlusion` select the same section.

## Rules

- Read `Transform`, `Rigidbody` and collider data before editing them, and read mass, constraints, trigger flag and
  bounds back afterwards.
- Confirm Edit Mode vs Play Mode before interpreting any physics state — Edit Mode values are authored data, not
  simulation results.
- A screenshot shows spatial presentation; it never proves a collision, a trigger overlap or reachability.
- Preview every polygon operation with `dry_run=True` and apply only when the count and the object list match the
  intended scope.
