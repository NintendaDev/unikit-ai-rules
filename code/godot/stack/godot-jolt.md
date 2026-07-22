---
version: 1.0.0
---

# Godot Jolt Physics

> **Scope**: Godot Jolt Physics integration — enabling Jolt as the 3D physics backend, behavioral differences from Godot Physics, configuration guidance, and GDScript usage patterns.
> **Load when**: configuring Jolt Physics backend, debugging physics behavior differences, tuning physics performance, migrating from Godot Physics or godot-jolt extension, authoring collision shapes for Jolt, working with Area3D/RigidBody3D/CharacterBody3D with Jolt active.
> **References**: `.unikit/memory/stack/references/godot-jolt-settings.md` (settings reference)

---

## Core Concepts

### Two Variants: Extension vs. Built-in Module

Godot Jolt exists in two forms:

1. **Extension (godot-jolt addon)** — Available for Godot 4.3–4.5. Now in maintenance mode. Exposes additional joint nodes (`JoltHingeJoint3D`, `JoltPinJoint3D`, etc.) with soft limits and breakable joints.
2. **Built-in Module** — Native since Godot 4.4, default since Godot 4.6. Use standard Godot joint nodes. Has experimental thread-safety. No Jolt-specific joint node variants.

**Rule:** Use the built-in module for Godot 4.4+ projects. Do not install the extension alongside the built-in — it causes project setting namespace conflicts and undefined behavior.

### Optimal Physics Scale

Jolt is tuned for specific value ranges. Outside these, simulation accuracy degrades:

- **Dynamic objects:** 0.1–10 m size, 0–500 m/s speed, 0–10 m/s² gravity
- **Static objects:** 0.1–2,000 m size

**Rule:** Design world units so typical dynamic objects fall in the 1–5 m range. Avoid micro-scale (< 0.1 m) or macro-scale (> 10 m) dynamic bodies.

### Enabling Jolt

**Project Settings → Physics → 3D → Physics Engine → "Jolt Physics"** → Save → Restart Godot.

Enable "Advanced Settings" in the Project Settings window to see all Jolt-specific parameters.

---

## Behavioral Differences from Godot Physics

### Area3D and Static Bodies

- By default, **Area3D does not detect overlaps with StaticBody3D** (or RigidBody3D frozen with `FREEZE_MODE_STATIC`) — an intentional performance trade-off.
- Enable detection via the `Generate All Kinematic Contacts` project setting — but only where needed; the cost is significant with complex geometry.
- Non-monitoring Area3D nodes still cause performance overhead if they spatially overlap other areas. Set `collision_mask = 0` on non-monitoring areas to eliminate the overhead.

### Collision Margins (Convex Radius)

Jolt's margin behavior differs from Godot Physics:

- Godot Physics: expands the shape outward by the margin value.
- Jolt: **shrinks the shape first, then applies the margin shell** — edges are rounded without increasing the overall shape size.

Prefer `Collision Margin Fraction` (auto-scales with shape size) over setting the `margin` property manually. Do not set margins near zero — it causes collision anomalies.

### Single-Body Joint World Node

When only one body is assigned to a two-body joint, Jolt treats the **unassigned body as `node_b` (world)** by default. Godot Physics assumed `node_a`. This inverts limit shapes and reversal constraints.

Configure the expected behavior via `Physics > Jolt Physics 3D > Joints > World Node` project setting.

### Unsupported Joint Properties

The following properties emit warnings and are silently ignored by Jolt:

| Joint | Ignored Properties |
|-------|--------------------|
| `PinJoint3D` | `bias`, `damping`, `impulse_clamp` |
| `HingeJoint3D` | `bias`, `softness`, `relaxation` |
| `SliderJoint3D` | angular limits, softness, restitution, damping |
| `ConeTwistJoint3D` | soft limit parameters |
| `Generic6DOFJoint3D` | soft limit parameters |

**Rule:** Do not rely on soft joint limits with the built-in module — use the godot-jolt extension (legacy projects only) if soft limits are required.

### Contact Impulse Accuracy

`PhysicsDirectBodyState3D.get_contact_impulse()` returns **pre-estimated values** based on manifold data and velocities. Results are unreliable when a body is simultaneously in contact with multiple objects.

### Ghost Collisions

Jolt uses two mitigation techniques:

1. **Active Edge Detection** — marks edges in `ConcavePolygonShape3D` / `HeightMapShape3D` as active/inactive based on neighbor triangle angles. Configurable via `Active Edge Threshold`.
2. **Enhanced Internal Edge Removal** — runtime checks during simulation, queries, and kinematic movement. Toggle separately per context in project settings.

**Important:** Neither technique addresses ghost collisions between **distinct bodies** — only between shape pairs within the same body.

### Baumgarte Stabilization

Jolt corrects position errors directly without velocity overshoot (unlike Godot Physics which uses a spring approach). The `Baumgarte Stabilization Factor` (0.0–1.0) controls correction strength. Value 1.0 resolves penetration in one step — fast but potentially unstable for constraint-heavy setups.

### RayCast Face Index

`face_index` returns `-1` by default in Jolt. Enable `Enable Ray Cast Face Index` to get real indices, but this adds **~25% memory overhead** per `ConcavePolygonShape3D`. Enable only where `face_index` is actually used.

### Area3D + SoftBody3D Overlap

Unlike Godot Physics, Jolt **does** fire `body_entered` / `body_exited` signals between `Area3D` and `SoftBody3D`. If this is undesired, adjust the area's `collision_mask` or filter signals manually.

---

## Settings Lookup Workflow

1. Open `.unikit/memory/stack/references/godot-jolt-settings.md` for the full settings reference.
2. Use the category sections (Sleep, Collisions, Solver, Limits, etc.) to find the relevant parameter.
3. Critical settings to review first when switching to Jolt: `collision_margin_fraction`, `generate_all_kinematic_contacts`, `enable_ray_cast_face_index`, `max_bodies`, `velocity_steps`.

---

## Best Practices

- **Remove the extension before upgrading** to Godot 4.4+: delete `addons/godot-jolt`, regenerate the `.godot` folder, and re-verify the physics engine selection.
- **Use `Collision Margin Fraction`** instead of setting `margin` on individual shapes — it scales automatically with each shape's AABB.
- **Enable CCD per-object** for fast-moving projectiles and thin objects, not globally — the global cost is too high.
- **Raise solver iterations for stable stacking:** `velocity_steps` 8 → 12–16, `position_steps` 4 → 8.
- **Avoid non-uniform scaling of physics nodes** — modify shape properties directly instead; non-uniform scale causes "Failed to correctly scale" errors.
- **Re-tune physics materials after migration** — friction and restitution values produce different results under Jolt's solver.
- **Test Area3D overlap timing after migration** — overlap signals may shift by one frame compared to Godot Physics.
- **Keep world unit scale in the 0.1–10 m range** for dynamic bodies to stay in Jolt's optimal accuracy band.

---

## Anti-patterns

- **Enabling `Generate All Kinematic Contacts` globally** — causes severe performance degradation when large kinematic bodies overlap complex static geometry. Enable only per-body/per-area where needed.
- **Enabling `Enable Ray Cast Face Index` project-wide** — doubles memory per `ConcavePolygonShape3D`. Enable only in the specific scenes that use `face_index`.
- **Using soft joint limits** with the built-in module — they are silently ignored and emit warnings. Soft limits require the godot-jolt extension (maintenance mode).
- **Micro-scale dynamic bodies (< 0.1 m)** — simulation accuracy degrades; objects may jitter, tunnel, or fail to sleep.
- **Non-uniform scaling of physics nodes** — causes runtime errors and incorrect collision geometry. Scale the shape's own parameters instead.
- **Installing godot-jolt extension alongside Godot 4.4+ built-in Jolt** — causes project setting namespace conflicts and undefined physics behavior.
- **Relying on `get_contact_impulse()` in multi-collision scenarios** — values are pre-estimated manifold data; accurate only when the two bodies interact with no other objects.
- **Ignoring `Max Bodies` / `Max Body Pairs` / `Max Contact Constraints` limits** — exceeding these silently drops collision pairs and contacts, causing invisible physics failures with no runtime errors.
- **Using thread-safe physics mode in production** — `Run On Separate Thread` is experimental in the built-in module; avoid until it is officially stable.
