# Coplay Unity MCP — Physics queries and authoring

| Task | `manage_physics` action | CLI |
|---|---|---|
| Check system/settings | `ping`, `get_settings` | `physics ping/get-settings` |
| Inspect/configure body | `get_rigidbody`, `configure_rigidbody` | `physics get-rigidbody/configure-rigidbody` |
| Ray/shape/overlap query | `raycast`, `raycast_all`, `linecast`, `shapecast`, `overlap` | Corresponding `physics` command |
| Layer interactions | `get_collision_matrix`, `set_collision_matrix` | `physics get-collision-matrix/set-collision-matrix` |
| Physics material/joints | Material and joint actions | Dedicated wrappers or raw |
| Apply force/torque | `apply_force` | `physics apply-force` |
| Scene diagnostics | `validate` | `physics validate` |
| Advance Edit Mode simulation | `simulate_step` | `physics simulate` |

## Query before changing physics

1. Inspect dimension, bodies/colliders, world scale and layer configuration. Explicitly select `dimension="3d"` or `"2d"` based on the project, not the apparent camera view.
2. State the query's coordinate space, origin/shape, size, direction, distance, layers and trigger policy. A single hit does not mean all hits; use `raycast_all` for that question.
3. Inspect results and target IDs before changing a body/material/joint. Resolve repeated components using `component_index` where supported.
4. Validate and observe behavior under the intended simulation mode. A correct serialized setting is not proof of stable gameplay physics.

```python
manage_physics(action="raycast", dimension="3d", origin=[0, 5, 0], direction=[0, -1, 0],
               max_distance=20, query_trigger_interaction="Ignore")
manage_physics(action="get_rigidbody", dimension="3d", target="PhysicsProbe")
```

```powershell
unity-mcp --format json raw manage_physics '{"action":"raycast","dimension":"3d","origin":[0,5,0],"direction":[0,-1,0],"max_distance":20,"query_trigger_interaction":"Ignore"}'
unity-mcp --format json physics get-rigidbody PhysicsProbe
```

## Authoring and simulation

- Query masks, layer indices and layer names are different values. Inspect the action's accepted `layer_mask`, `layer_a` and `layer_b` formats before passing them.
- `overlap.size` is a radius for a sphere and half-extents for a box. Do not transfer full mesh dimensions without converting to the requested shape semantics.
- Inspect `configure_rigidbody`'s property keys against the installed Unity version; older drag/velocity examples may not match newer serialized/API names.
- Force/torque/explosion and normal/impulse modes are explicit options of `apply_force`. Verify the body's kinematic/gravity/constraint state and runtime response before assuming the force took effect.
- Physics materials and collision matrix changes can have shared/global effects. Limit writes to the requested scope and follow project restrictions on settings.
- `simulate_step` advances physics in Edit Mode; it is a mutation, not a read-only query or a normal fixed-update gameplay loop. Capture relevant starting state and avoid stepping the user's scene merely to inspect it. The documented maximum is 100 steps per call.
- Scene validation is paged; follow the returned cursor before claiming a complete pass. Fixing a reported issue still requires revalidation and behavior checks.

Source: [manage_physics](https://coplaydev.github.io/unity-mcp/reference/tools/core/manage_physics), [CLI](https://coplaydev.github.io/unity-mcp/guides/cli).
