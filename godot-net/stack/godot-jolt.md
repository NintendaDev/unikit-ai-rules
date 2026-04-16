---
version: 1.0.0
---

# Godot Jolt Physics

> **Scope**: Jolt Physics integration in Godot 4 .NET — enabling the 3D physics backend, behavioral differences from Godot Physics, project settings, joint configuration, and migration guidance for Godot 4.4+.
> **Load when**: enabling or configuring Jolt Physics, migrating from Godot Physics or the godot-jolt GDExtension, authoring physics bodies with Jolt, debugging physics behavioral differences, tuning joints or ragdolls under Jolt, working with VehicleBody3D.

---

## Overview

Jolt Physics is an alternative 3D physics backend for Godot 4. It uses the Jolt Physics Engine with a GJK/EPA collision detection algorithm and a velocity-based constraint solver — replacing Godot Physics' SAT-based approach. The public physics API (`RigidBody3D`, `CharacterBody3D`, `Area3D`, `StaticBody3D`) is unchanged; the abstraction layer handles backend differences.

**Engine status by version:**
- **Godot 4.4+** — Jolt is built into the engine as a native module. The third-party `godot-jolt` GDExtension is now maintenance-only. Use the built-in module for all new projects.
- **Godot 4.6+** — Jolt is the default 3D physics engine for new projects.
- **2D physics is unaffected** — Jolt only replaces the 3D backend.

## Enabling Jolt

1. Open **Project Settings** → **Physics** → **3D** (enable **Advanced Settings**)
2. Set **Physics Engine** to `Jolt Physics`
3. Click **Save & Restart**

To reduce binary size by stripping Godot Physics from export templates:
```shell
scons target=template_release module_godot_physics_3d_enabled=no
```

## Migrating from the GDExtension (Godot 4.4+)

When upgrading a project that used the `godot-jolt` addon:

1. **Remove the `godot-jolt` addon entirely** — it conflicts with the built-in module.
2. **Delete `.godot/` directory** to force a clean re-import.
3. **Verify project settings** — all Jolt settings moved from `physics/jolt_3d` to `physics/jolt_physics_3d`.
4. **Test collision detection** — edge cases, wall-sliding, slopes.
5. **Re-tune joints** — stricter limit enforcement requires tighter, anatomically correct values.
6. **Adjust physics materials** — friction and restitution behave differently at the solver level.

Time estimates: small project ~2–4 h, medium ~1–2 days, large with complex physics ~3–5 days.

## Behavioral Differences from Godot Physics

### Collision Detection
- Jolt uses **GJK/EPA** (more precise); Godot Physics used **SAT** (faster, less precise).
- Objects that "mostly worked" before may behave differently. Thoroughly test collision edge cases.
- Existing CCD workarounds for fast-moving objects may now interfere — test before keeping them; Jolt handles CCD natively via motion clamping and speculative contacts.

### Collision Shape Margins
- Jolt uses a **convex radius** — shape is shrunk inward, a rounded shell is added back; overall size is unchanged. Godot Physics applied margin as extra thickness.
- Non-default margin values cause effective shape size changes and odd normals in shape queries.
- **Set collision shape margin to `0`** and rely on Jolt's convex radius. Lower the margin fraction project setting (even to `0.0`) if shape query normals are wrong.

### Kinematic Body Velocity
- Moving a `StaticBody3D` or `AnimatableBody3D` by directly setting `Position` produces incorrect velocity calculations in Jolt.
- **Use `AnimatableBody3D` with `SyncToPhysics = true`** — Jolt then derives velocity from the position delta.

### Object Sleeping
- Sleep thresholds differ from Godot Physics; objects may sleep or remain awake at different times.
- Tune via `velocity_threshold` and `time_threshold` under Physics > Jolt Physics 3D > Sleep.
- Disable sleeping (`enabled = false`) if object continuity is required.

### Area3D
- Overlap signals may fire **one frame later** than in Godot Physics — design detection logic accordingly.
- As of Godot 4.5+, `Area3D` always reports overlaps with static bodies. There is no opt-out.

### Non-uniform Scaling
- Jolt performs runtime error-checking for non-uniform scaling on physics bodies; Godot Physics discarded it silently.
- **Never scale physics nodes with non-uniform `Scale`.** Adjust collision shape dimensions directly.

## CharacterBody3D

- `MoveAndSlide()` and `MoveAndCollide()` API is **unchanged**.
- Slope behavior and edge detection may differ due to improved collision precision.
- Enable **"Use Enhanced Internal Edge Removal"** (Physics > Jolt Physics 3D > Kinematics) to eliminate ghost collisions on `ConcavePolygonShape3D` and `HeightMapShape3D`.

```csharp
public override void _PhysicsProcess(double delta)
{
    if (!IsOnFloor())
        Velocity += GetGravity() * (float)delta;

    Velocity = Velocity with { X = _inputDir.X * Speed, Z = _inputDir.Z * Speed };
    MoveAndSlide();
}
```

## RigidBody3D

- Impulse response and mass calculations are more physically accurate; revisit `PushForce`, `LinearDamp`, and similar values.
- **Kinematic freeze mode** (`FREEZE_MODE_KINEMATIC`) does not report contacts with static or kinematic bodies by default (performance optimization). Enable opt-in via **Physics > Jolt Physics 3D > Simulation > Generate All Kinematic Contacts**.
- Avoid dynamic non-uniform scaling — Jolt emits a runtime error when applied to a physics body.

## Joints

### Joint Type → Jolt Constraint Mapping

| Godot Joint | Jolt Constraint |
|---|---|
| `PinJoint3D` | `JPH::PointConstraint` |
| `HingeJoint3D` | `JPH::HingeConstraint` or `JPH::FixedConstraint`* |
| `SliderJoint3D` | `JPH::SliderConstraint` or `JPH::FixedConstraint`* |
| `ConeTwistJoint3D` | `JPH::SwingTwistConstraint` |
| `Generic6DOFJoint3D` | `JPH::SixDOFConstraint` |

*When both limits are set to 0 and springs are disabled, Jolt uses `FixedConstraint` (fully rigid).

### Unsupported Joint Properties
The following properties are **ignored** by Jolt (engine emits a warning if set to non-default values):

`bias`, `damping`, `softness`, `relaxation`, `restitution`, ERP values, impulse clamps.

This applies to all joint types: `PinJoint3D`, `HingeJoint3D`, `SliderJoint3D`, `ConeTwistJoint3D`, `Generic6DOFJoint3D`. Do not rely on these — they have no effect.

### Jolt-Specific Substitute Joints
Jolt exposes substitute joint nodes with capabilities unavailable through standard Godot joints:
- `JoltHingeJoint3D`, `JoltSliderJoint3D` — per-joint solver iteration override, breakable joints, soft limits.
- Use these for precise ragdoll tuning or chains where solver iterations need per-joint control.

### Single-Body Joints
- Godot Physics: omitting one body produced inconsistent behavior and could invert limits.
- Jolt: missing body defaults to `node_b = world`, `node_a = the assigned body`.
- Configure compatibility via **Physics > Jolt Physics 3D > Joints > World Node**.

### HingeJoint3D / Ragdolls
- Jolt enforces joint limits more strictly than Godot Physics.
- "Close enough" joint limit configurations now produce visible artifacts.
- Tighten all limits to anatomically correct values. Ragdolls with complex chains require re-tuning but are more stable once done.

### VehicleBody3D
- One of the largest behavioral divergences from Godot Physics.
- Suspension stiffness, tire friction curves, and drivetrain simulation all differ significantly.
- **Start vehicle tuning from scratch** — carrying over Godot Physics values is not viable.

## Key Project Settings

**Location: Project Settings > Physics > Jolt Physics 3D**

| Category | Setting | Default | Notes |
|---|---|---|---|
| Solver | `velocity_iterations` | 8 | Increase to 12–16 for unstable stacking |
| Solver | `position_iterations` | 4 | Raise to 8 if objects interpenetrate |
| Solver | `bounce_velocity_threshold` | — | Minimum velocity for elastic collision |
| Solver | `contact_speculative_distance` | — | Radius for speculative contact points |
| Sleep | `enabled` | true | Toggle sleeping globally |
| Sleep | `velocity_threshold` | — | Velocity threshold for sleep eligibility |
| Sleep | `time_threshold` | — | Duration at low velocity before sleeping |
| Collisions | `use_shape_margins` | true | Disable for accuracy (performance cost) |
| Collisions | `use_enhanced_internal_edge_removal` | true | Reduces internal edge collisions on meshes |
| Collisions | `body_pair_cache_enabled` | true | Reuses collision results when orientation unchanged |
| Kinematics | `use_enhanced_internal_edge_removal` | — | Reduces ghost collisions in `MoveAndSlide` |
| Kinematics | `recovery_iterations` | — | Penetration resolution iteration count |
| CCD | `movement_threshold` | — | Fraction of inner radius to trigger CCD |
| Limits | `max_linear_velocity` | 500 | Clamp to prevent instability for fast bodies |
| Limits | `max_angular_velocity` | 47.1 rad/s | Clamp to prevent instability |
| Limits | `max_bodies` | — | Maximum total body count (awake + sleeping) |
| Queries | `enable_ray_cast_face_index` | false | Populates `face_index`; +~25% memory for concave shapes |
| Simulation | `generate_all_kinematic_contacts` | false | Opt-in kinematic-to-static contact reporting |

## Anti-patterns

- **Keeping the godot-jolt GDExtension with Godot 4.4+** — it conflicts with the built-in module. Remove the addon before upgrading.
- **Non-zero collision shape margins** — causes effective shape size changes and odd query normals. Set to `0`.
- **Moving platforms via direct `Position` set** — use `AnimatableBody3D` with `SyncToPhysics = true`.
- **Non-uniform `Scale` on physics nodes** — Jolt emits runtime errors. Resize shape dimensions instead.
- **Relying on joint properties `bias`, `softness`, `damping`** — Jolt ignores them silently; behavior differs from Godot Physics without warning.
- **Carrying over VehicleBody3D tuning values from Godot Physics** — full re-tune is required.
- **Assuming Area3D signals fire in the same frame** — signals may arrive one frame later. Design detection accordingly.
- **Keeping old CCD workarounds** — Jolt handles CCD natively; previous hacks may now conflict with simulation.
