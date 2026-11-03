# GDAI Godot MCP — Resources, appearance and collisions

> See also: [scene structure](gdai-godot-mcp-scenes-nodes.md), [runtime checks](gdai-godot-mcp-runtime-verification.md).

---

| Need | Route |
|---|---|
| Change an existing node value/reference | Inspect, then `update_property` with the installed encoding |
| Create and assign a resource/subresource | `add_resource` |
| Build nested or unsupported resource data | Discover the dedicated contract; otherwise bounded editor GDScript |
| Add physical collision | Appropriate body/area node plus matching collision node and shape resource |

`update_property` is explicitly documented as not creating subresources. Do not send a resource type name as a scalar and expect allocation. Inspect the target property, resource class, existing value and ownership before choosing a tool.

## Resource scope

Godot can share a loaded resource between users of its path. Decide whether an edit is intended for every consumer or only one scene/instance. For local edits, create an appropriate independent resource or duplicate deliberately. `duplicate(true)` is not a blanket promise to clone every referenced external resource; inspect the resulting graph and the engine version's duplication rules.

An original engine-level example for a **new**, independent 3D material:

```gdscript
func make_warning_material() -> StandardMaterial3D:
    var material := StandardMaterial3D.new()
    material.albedo_color = Color(0.95, 0.35, 0.1)
    material.roughness = 0.8
    return material
```

Creating this value does not assign or save it. Attach it to the intended slot/override using a verified route; save either its owning scene or its external resource as appropriate. Inspect the visible result and serialized reference.

## Worked case: give a 3D player collision

1. Inspect the existing player: body class, transform, visual size, movement script and existing collision children.
2. Preserve the intended physics model. A character controller, a simulated rigid body and a trigger area have different responsibilities; do not replace one with another merely to make overlap visible.
3. Add `CollisionShape3D` under the appropriate collision object if missing. Allocate a compatible `Shape3D` resource and size it to the actor. Keep the 2D/3D families consistent.
4. Inspect disabled state, transform, layer/mask pairing, and the floor/obstacle's own collision setup.
5. Save; reproduce movement against the obstacle. Check both blocking behavior and errors. A visible mesh or non-null shape alone cannot prove collision works.

Example intended composition, **not an MCP payload**:

```text
Pilot (CharacterBody3D)
├── Visual (MeshInstance3D)
└── Collision (CollisionShape3D)
    └── shape property: CapsuleShape3D
```

For a pickup, choose an area/overlap design and its signal handling rather than a blocking body by default. Adding a shape does not supply movement code or connect signals; load the scripting reference for behavior.

## Appearance verification

For a texture/material change, inspect the actual resource assignment, then the game image under the intended camera and lighting. Distinguish wrong assignment from visibility, camera, shader or lighting problems before replacing more assets.

Sources: [resource tools](https://gdaimcp.com/docs/supported-tools), [Resource](https://docs.godotengine.org/en/stable/classes/class_resource.html), [physics models and shapes](https://docs.godotengine.org/en/stable/tutorials/physics/physics_introduction.html). Collision and material recipes are original applications.
