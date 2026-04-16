---
version: 1.0.0
---

# SoftBody3D

> **Scope**: Godot 4 SoftBody3D simulation — configuring deformable physics meshes, tuning simulation parameters, pinning vertices to anchor nodes, integrating with skeletons, and handling known engine limitations.
> **Load when**: using SoftBody3D, simulating cloth or deformable objects, pinning soft body vertices, attaching a soft body to a skeleton or BoneAttachment3D, debugging soft body physics behavior, tuning simulation performance, working with Jolt physics and soft bodies.

---

## Core Concepts

SoftBody3D inherits from MeshInstance3D — the node's assigned mesh serves as **both the collision surface and the rendered mesh**. Do not add a separate MeshInstance3D child for visuals; assign the mesh directly to the SoftBody3D node.

Wind forces defined in Area3D affect SoftBody3D nodes within that area.

### Physics Engine

Use **Jolt Physics** for SoftBody3D. Jolt is faster, more stable, and better supported than the legacy GodotPhysics3D backend.

- Godot 4.6+: Jolt is the default engine.
- Older projects: switch manually via **Project Settings → Physics → 3D → Physics Engine → JoltPhysics3D**.

## Setup Workflow

1. Add a `SoftBody3D` node to the scene.
2. Assign a `Mesh` resource directly to the node's **Mesh** property.
3. Subdivide the mesh adequately — higher subdivision enables finer deformations but costs performance.
4. Keep `simulation_precision` at or above **5** (default) to prevent collapse.
5. For imported meshes: enable **Save to File** in Advanced Import Settings and disable/reduce LOD generation (the importer merges nearly-flat adjacent faces by default, blocking natural bending).

## Key Properties

| Property | Type | Default | Notes |
|---|---|---|---|
| `total_mass` | float | 1.0 | Distributed evenly across vertices; keep ≥ 0.5 with Jolt |
| `linear_stiffness` | float | 0.5 | Material stiffness 0.0–1.0; cloth ≈ 0.1–0.3, rubber ≈ 0.8 |
| `damping_coefficient` | float | 0.01 | Energy loss per step; increase for sluggish/heavy feel |
| `drag_coefficient` | float | 0.0 | Air resistance; increase for cloth in wind |
| `pressure_coefficient` | float | 0.0 | **Closed meshes only** — see Anti-patterns |
| `simulation_precision` | int | 5 | Iterations per physics frame; never go below 5 |
| `parent_collision_ignore` | NodePath | `""` | Set to parent character node to prevent clipping |
| `collision_layer` | int | 1 | Physics layer this body occupies |
| `collision_mask` | int | 1 | Physics layers this body reacts to |
| `ray_pickable` | bool | true | Whether raycasts can hit this body |
| `disable_mode` | DisableMode | 0 | Behavior when the node is disabled |

## Methods

```gdscript
# Pin a vertex to its current world position
soft_body.set_point_pinned(point_index: int, true)

# Pin a vertex and attach it to a Node3D (e.g., BoneAttachment3D)
soft_body.set_point_pinned(point_index: int, true, NodePath("../BoneAttach"))

# Unpin a previously pinned vertex
soft_body.set_point_pinned(point_index: int, false)

# Read the world-space Transform3D of a vertex
var xf: Transform3D = soft_body.get_node_transform(vertex_index)

# Total vertex count in the simulation mesh
var count: int = soft_body.get_node_count()
```

Godot 4.5+ adds per-vertex `apply_force()` and `apply_impulse()`.

## Pinning Vertices

Pinned vertices are fixed in world space or anchored to a target `Node3D`. Use them to hang cloth from a ceiling, attach a cloak to a neck bone, etc.

**Via Inspector:**
1. Select the SoftBody3D node.
2. Click vertices in the 3D viewport — selected vertices turn blue.
3. Expand **Collision → Attachments** in the Inspector.  
   *If the Attachments section is missing: deselect the node, then reselect it.*
4. For each pinned joint, set **Spatial Attachment Path** to the anchor node.

**Via code:**
```gdscript
# Attach vertex 0 to a BoneAttachment3D node
soft_body.set_point_pinned(0, true, $Skeleton3D/NeckAttach.get_path())
```

## Skeleton Integration

To attach a soft body (e.g., a cloak) to a character skeleton:

1. Add `BoneAttachment3D` as a child of `Skeleton3D`; set its **Bone Name**.
2. Keep the SoftBody3D as a sibling of the character — **do not parent it under BoneAttachment3D**.
3. Pin the soft body's upper vertices and set their **Spatial Attachment Path** to the BoneAttachment3D.
4. Set **Parent Collision Ignore** to the root character node to prevent clipping:

```gdscript
soft_body.parent_collision_ignore = $CharacterBody3D.get_path()
```

## Performance

- `simulation_precision`: values 5–15 cover most use cases; each additional iteration costs CPU linearly.
- Mesh subdivision: balance triangle count with the number of simultaneously active soft bodies.
- Physics interpolation does **not** affect SoftBody3D appearance. For smoother motion, increase **Project Settings → Physics → Common → Physics Ticks per Second** instead.
- Disable soft bodies that are off-screen (`process_mode = PROCESS_MODE_DISABLED`) rather than leaving them simulating.

## Anti-patterns

- **`pressure_coefficient > 0` on an open mesh** — the body inflates uncontrollably and flies away like a balloon. Only use pressure on fully closed meshes.
- **Importing without disabling LOD** — the importer merges nearly-flat faces, destroying tessellation needed for bending. Always use **Save to File** and tune import settings for any mesh used with SoftBody3D.
- **Parenting SoftBody3D under BoneAttachment3D** — causes transform doubling, rendering the body at the wrong position. Keep SoftBody3D as a sibling and use pinned points to follow the bone.
- **Modifying transform after adding to scene** — known engine bug: changing a SoftBody3D's transform once it is in the scene tree results in the transform being applied twice. Set the initial transform before calling `add_child()`.
- **Using GodotPhysics3D for soft bodies** — the GodotPhysics3D backend is slower and less stable. Always use Jolt for any project that uses SoftBody3D.
- **Very low `total_mass` with Jolt** — extremely low mass values (distributed across many vertices) cause erratic or explosive Jolt behavior. Keep `total_mass` ≥ 0.5 for typical objects.
- **Backface culling on deforming meshes** — SoftBody3D deforms in ways that expose back faces, which are culled by default. Assign a `StandardMaterial3D` with **Cull Mode → Disabled** to the mesh material.
