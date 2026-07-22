---
version: 1.0.0
---

# Godot 4 SoftBody3D

> **Scope**: Soft body physics simulation in Godot 4 — deformable mesh setup, simulation parameter tuning, vertex pinning to anchors and skeletons, collision configuration, and known engine limitations.
> **Load when**: setting up soft body simulation, authoring cloth or jelly physics, pinning soft body vertices, integrating soft bodies with Skeleton3D or BoneAttachment3D, configuring SoftBody3D collision layers, debugging soft body instability or collapse.

---

## Core Concepts

`SoftBody3D` inherits from `MeshInstance3D` — it is both the renderer and the physics body. Each mesh vertex becomes an independent physics particle connected to its neighbours by simulated springs. Deformation is applied directly to the mesh; there is no separate visual mesh to manage.

`SoftBody3D` is suitable for **cosmetic simulation only** (cloth, capes, jelly effects). Do not use it for gameplay-critical collision shapes or player characters — the simulation has known instability and collision reliability issues in both physics backends.

Godot Physics (default) and Jolt Physics both support soft bodies, but their behaviour differs. Jolt is more stable in practice; see the [Jolt-specific section](#jolt-physics-specifics).

## Mesh Requirements

- Use a **subdivided mesh** — at minimum 5 subdivisions per axis for visible deformation. More subdivisions improve quality at a performance cost.
- Built-in primitive meshes (`PlaneMesh`, `BoxMesh`, `SphereMesh`) work reliably. Imported custom meshes may contain UV seams that split vertices in Godot's representation, causing immediate deflation or random vertex jitter.
- For **cloth/flags**, use `PlaneMesh` and disable backface culling so both sides render:

  ```csharp
  var mat = new StandardMaterial3D();
  mat.CullMode = BaseMaterial3D.CullModeEnum.Disabled;
  softBody.MaterialOverride = mat;
  ```

- For **closed-volume objects** (jelly, balloon), use a fully sealed mesh. `PressureCoefficient > 0` requires a watertight mesh — open-mesh pressure causes explosive instability.

## API / Interface

### Properties (C#)

| Property | Type | Default | Description |
|---|---|---|---|
| `SimulationPrecision` | `int` | `5` | Physics solver iterations per tick. Must stay ≥ 5; values below 5 cause collapse. |
| `TotalMass` | `float` | `1.0` | Total mass distributed evenly across all vertices. |
| `LinearStiffness` | `float` | `0.5` | Spring stiffness between vertices (0.0–1.0). Higher = stiffer, less stretchy. |
| `PressureCoefficient` | `float` | `0.0` | Internal gas pressure. Use only on closed meshes. |
| `DampingCoefficient` | `float` | `0.01` | Per-vertex velocity damping. Higher values suppress oscillation. |
| `DragCoefficient` | `float` | `0.0` | Per-vertex air drag. |
| `RayPickable` | `bool` | `true` | Whether raycasts detect the body. |
| `ParentCollisionIgnore` | `Array<NodePath>` | `[]` | Bodies excluded from collision (add the parent character body here). |

### Methods (C#)

```csharp
// Pin a vertex to a node (e.g., BoneAttachment3D or StaticBody3D).
// attachmentPath must be relative from the SoftBody3D node.
softBody.PinVertex(vertexIndex, softBody.GetPathTo(anchorNode));

// Unpin a vertex to let it simulate freely again.
softBody.UnpinVertex(vertexIndex);

// Query whether a vertex is pinned.
bool pinned = softBody.IsVertexPinned(vertexIndex);

// Get the world-space position of a vertex (not a full Transform3D).
Vector3 pos = softBody.GetPointTransform(vertexIndex);
```

Pinned vertices are shown in **blue** in the 3D editor viewport. Static pin assignments (not attached to a node) can be created and assigned directly in the Inspector under `Collision → Attachments`.

## Patterns & Examples

### Cloth Hanging from a Static Bar

```csharp
// Assuming a PlaneMesh aligned to the XZ plane.
// Pin top-row vertices to a static anchor node.
// Vertex indices must be determined from the mesh surface arrays at design time.
var topY = 0.5f; // top edge Y in local space (half of PlaneMesh height)
for (int i = 0; i < vertexCount; i++)
{
    // GetPointTransform returns world-space position after _Ready
    Vector3 pos = softBody.GetPointTransform(i);
    if (pos.Y > topY - 0.05f)
        softBody.PinVertex(i, softBody.GetPathTo(topBarNode));
}
```

### Cloak / Cape (Skeleton-Attached)

Use `BoneAttachment3D` nodes as pin anchors driven by the character skeleton:

1. Add a `BoneAttachment3D` child to the character's `Skeleton3D`.
2. Set `BoneAttachment3D.BoneName` to the collar or neck bone.
3. In the SoftBody3D Inspector → `Collision → Attachments`, set each pinned joint's **Spatial Attachment Path** to the `BoneAttachment3D`.
4. Add the character's physics body to `ParentCollisionIgnore` to prevent the cape from colliding with the character itself.

```csharp
// Programmatic version — pin two shoulder vertices to neck bone
var neckAttach = skeleton.GetNode<BoneAttachment3D>("NeckAttachment");
softBody.PinVertex(0, softBody.GetPathTo(neckAttach));
softBody.PinVertex(1, softBody.GetPathTo(neckAttach));

// Prevent self-collision with parent CharacterBody3D
softBody.AddCollisionExceptionWith(character); // preferred over ParentCollisionIgnore
```

### Jelly / Balloon (Pressure-Based)

```csharp
// Only valid on a fully closed mesh (SphereMesh, sealed BoxMesh, etc.)
softBody.PressureCoefficient = 0.5f;
softBody.LinearStiffness = 0.3f;
softBody.DampingCoefficient = 0.05f;
softBody.TotalMass = 2.0f;
```

## Configuration

| Parameter | Recommended range | Notes |
|---|---|---|
| `SimulationPrecision` | 5–15 | Default `5` is the minimum. Raise for complex meshes or heavy collisions. |
| `TotalMass` | 0.5–10.0 | Match physical expectation. Critical for Jolt — see below. |
| `LinearStiffness` | 0.1–0.9 | `0.5` = cloth. Reduce for loose fabric; raise for rubber. |
| `DampingCoefficient` | 0.01–0.3 | `0.01` = minimal. `0.1–0.3` simulates air resistance. |
| `PressureCoefficient` | 0.0 or 0.1–1.0 | `0.0` = off. Enable only on watertight meshes. |

**Physics Ticks per Second**: raise `Project Settings → Physics → Common → Physics Ticks Per Second` (e.g., to 60 or 120) for smoother deformation. This is a project-wide setting with a global performance cost.

## Jolt Physics Specifics

When using the `godot-jolt` GDExtension as the physics backend:

- **Always set `TotalMass` explicitly.** Jolt distributes `TotalMass / vertexCount` kg per vertex. With the default `TotalMass = 1.0` and a 100-vertex mesh, each vertex gets 0.01 kg — which is correct. However, if you leave `TotalMass` at `1.0` and the mesh has many vertices, Godot Physics and Jolt may behave very differently in collisions with `RigidBody3D` objects. Set an intentional value.
- **Avoid extremely low per-vertex mass.** If `TotalMass / vertexCount` becomes too small (< ~0.001 kg per vertex), Jolt's simulation often becomes erratic or explosive. Increase `TotalMass` to keep per-vertex mass reasonable.
- Jolt provides **more reliable rigid–soft collisions** than Godot Physics. Prefer Jolt for any production use of soft bodies.

## Best Practices

- Always pin **at least two vertices** when attaching cloth to a character. A single pin allows unrealistic free rotation around one point.
- Call `PinVertex` (or assign Attachments) **before** the first physics step. Setting pins after the body has been simulating for a few frames can produce a visible pop.
- Set position and scale in the **scene editor before runtime**. Modifying `SoftBody3D.Position` or `Transform` at runtime after the node enters the scene tree causes incorrect rendering (the physics server tracks vertex positions in global space, ignoring the node transform).
- Use `AddCollisionExceptionWith(otherBody)` instead of `ParentCollisionIgnore` when the excluded body is a known node reference — it is clearer and avoids stale `NodePath` issues.
- Prefer the **Inspector pin workflow** for fixed-topology capes and cloth. Use `PinVertex` / `UnpinVertex` at runtime only when pins need to change dynamically (e.g., a cape that detaches on impact).
- Do **not** use `SoftBody3D` for player hitboxes, interactable collision volumes, or any geometry that determines gameplay outcomes — simulation instability makes it unsuitable for reliable collision.

## Anti-patterns

- **Changing transform at runtime**: `SoftBody3D.Position` and `SoftBody3D.Transform` have no effect once the node is in the scene tree. The physics server tracks vertices in global space. To "move" a live soft body, you must move the vertices individually via `SetPointTransform` or restart the simulation.
- **`PressureCoefficient > 0` on open meshes**: The body flies uncontrollably when internal gas can escape through open edges. Restrict pressure to fully closed meshes only.
- **`SimulationPrecision` below 5**: The soft body implodes. Never lower the default. If performance is tight, reduce mesh subdivision density instead.
- **Importing meshes without welding vertices**: UV seams split vertices in Godot's mesh representation, making the soft body behave as if it has a tear. Weld vertices in the DCC tool before export, or use procedural primitive meshes.
- **Expecting soft–soft collision**: There is no soft–soft collision detection in either physics backend. Soft–rigid collision is also unreliable — hard objects may tunnel through the soft body. Never depend on these interactions for gameplay.
- **Relying on physics interpolation**: Physics interpolation does not currently affect soft bodies. For smoother motion at low tick rates, raise `Physics Ticks per Second` — enabling interpolation has no effect on `SoftBody3D`.
