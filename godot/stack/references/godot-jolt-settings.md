# Godot Jolt Physics — Settings Reference

> **Base path (built-in module, Godot 4.4+):** Project Settings → Physics → Jolt Physics 3D → *(requires "Advanced Settings" enabled)*
> **Base path (extension, Godot 4.3):** Project Settings → Physics → Jolt Physics Extension 3D

---

## Sleep

| Setting (built-in key) | Default | Description |
|------------------------|---------|-------------|
| `simulation/allow_sleep` | `true` | Whether bodies can enter sleep state. |
| `simulation/sleep_velocity_threshold` | `0.03 m/s` | Point velocity below which a body qualifies for sleep. |
| `simulation/sleep_time_threshold` | `0.5 s` | Duration the body must remain below the velocity threshold before it sleeps. |

## Collisions

| Setting (built-in key) | Performance Impact | Notes |
|------------------------|--------------------|-------|
| `collisions/collision_margin_fraction` | Moderate | Fraction of the shape's smallest AABB axis used as collision margin. Set to `0` to disable auto-scaling and use manual `margin` property. Replaces `use_shape_margins`. |
| `simulation/use_enhanced_internal_edge_removal` | Moderate cost | Removes hits with internal edges during simulation. Reduces ghost collisions inside a body's own shape pairs. |
| `simulation/generate_all_kinematic_contacts` | ⚠️ Heavy cost | Enables kinematic bodies detecting static/kinematic bodies. Enable per-body only, not globally. Replaces `report_all_kinematic_contacts`. |
| `collisions/body_pair_cache_enabled` | Saves CPU | Reuses collision results when relative body orientation is unchanged. |
| `collisions/body_pair_cache_distance_threshold` | — | Max relative movement distance before cached collision result is invalidated. |
| `collisions/body_pair_cache_angle_threshold` | — | Max relative rotation angle before cached collision result is invalidated. |
| `collisions/soft_body_point_margin` | — | Prevents Z-fighting artifacts on SoftBody3D cloth simulation. |

## Joints

| Setting | Notes |
|---------|-------|
| `joints/world_node` | Which body becomes the "world anchor" when one body is omitted from a two-body joint. Default: `Node A` (extension); built-in default may differ. Set to `Node B` for Godot Physics-compatible behavior. |

## Continuous Collision Detection (CCD)

| Setting (built-in key) | Notes |
|------------------------|-------|
| `simulation/continuous_cd_movement_threshold` | Fraction of the shape's inner radius that must be crossed per step to trigger CCD. Replaces percentage-based value from extension. |
| `simulation/continuous_cd_max_penetration` | Fraction of inner radius allowed as penetration before CCD activates. |

## Kinematics (CharacterBody3D / move_and_slide)

| Setting | Notes |
|---------|-------|
| `kinematics/use_enhanced_internal_edge_removal` | Removes internal-edge hits during `move_and_slide`, `move_and_collide`, `test_move`. Reduces ghost collisions during character movement. |
| `kinematics/recovery_iterations` | Number of penetration-resolution iterations per `move_and_slide` call. Increase if character clips through surfaces. |
| `kinematics/recovery_amount` | Fraction of penetration resolved per recovery iteration (0.0–1.0). |

## Queries (PhysicsDirectSpaceState3D)

| Setting | Impact | Notes |
|---------|--------|-------|
| `queries/use_enhanced_internal_edge_removal` | Moderate | Improves collision normals for ray/shape casts; may miss hits on multi-shape bodies. |
| `queries/enable_ray_cast_face_index` | ⚠️ ~25% extra memory per ConcavePolygonShape3D | Populates `face_index` in ray cast results. Disable unless `face_index` is actually consumed. |
| `queries/use_legacy_ray_casting` | Behavior change | Restores pre-0.14.0 behavior for `hit_back_faces`. Extension only — removed in built-in module. |

## Solver

| Setting (built-in key) | Default | Tuning Notes |
|------------------------|---------|--------------|
| `simulation/velocity_steps` | `8` | Velocity solver iterations per physics tick. Raise to 12–16 for stable stacking or ragdolls. Replaces `solver/velocity_iterations`. |
| `simulation/position_steps` | `4` | Position solver iterations per physics tick. Raise to 8 to reduce visible penetration. Replaces `solver/position_iterations`. |
| `simulation/baumgarte_stabilization_factor` | `0.2` | Position error correction strength (0.0–1.0). 0 = off, 1 = one-step correction (fast but unstable). Replaces `solver/position_correction` (was %). |
| `collisions/active_edge_threshold` | `50°` | Angle below which a triangle edge is marked as inactive (uses face normal instead). Lower = fewer ghost collisions but risks new artifacts. |
| `simulation/bounce_velocity_threshold` | `1.0 m/s` | Minimum relative velocity required to trigger elastic bounce. |
| `simulation/contact_speculative_distance` | `0.02 m` | Radius for speculative contact detection. High values cause ghost collisions. |
| `simulation/contact_allowed_penetration` | `0.02 m` | Maximum allowed body penetration depth before correction kicks in. |

## Limits

| Setting | Notes |
|---------|-------|
| `limits/world_boundary_shape_size` | Half-extent of `WorldBoundaryShape3D` plane. Jolt's maximum is smaller than Godot Physics to prevent floating-point precision errors. |
| `limits/max_linear_velocity` | Velocity cap per body (default 500 m/s). Prevents physics explosions. |
| `limits/max_angular_velocity` | Angular velocity cap (default ~6.28 × 1000 rad/s in built-in). Prevents spin explosions. |
| `limits/max_bodies` | ⚠️ Warning shown **in the editor** when active body count exceeds this value. Does not hard-limit at runtime. |
| `limits/max_body_pairs` | Additional body pairs beyond this count are silently ignored — collisions between those pairs are skipped. |
| `limits/max_contact_constraints` | Additional contact constraints beyond this count are silently dropped — no runtime error, silent physics failure. |
| `limits/max_temporary_memory` | Pre-allocated stack for per-tick simulation allocations. Falls back to the slow heap allocator when exhausted. |

---

## Migration: Extension → Built-in Key Mapping

Key renames when moving from the godot-jolt extension (`physics/jolt_3d/*`) to the built-in module (`physics/jolt_physics_3d/*`):

| Extension Setting | Built-in Equivalent | Change |
|-------------------|---------------------|--------|
| `sleep/enabled` | `simulation/allow_sleep` | Renamed |
| `sleep/velocity_threshold` | `simulation/sleep_velocity_threshold` | Renamed |
| `collisions/use_shape_margins` | `collisions/collision_margin_fraction` | Now a fraction (0 = disabled) |
| `collisions/use_enhanced_internal_edge_removal` | `simulation/use_enhanced_internal_edge_removal` | Moved to simulation category |
| `collisions/report_all_kinematic_contacts` | `simulation/generate_all_kinematic_contacts` | Renamed |
| `continuous_cd/movement_threshold` | `simulation/continuous_cd_movement_threshold` | Now fractional (was %) |
| `solver/velocity_iterations` | `simulation/velocity_steps` | Renamed |
| `solver/position_iterations` | `simulation/position_steps` | Renamed |
| `solver/position_correction` | `simulation/baumgarte_stabilization_factor` | Now fractional (was %) |
| `queries/use_legacy_ray_casting` | *(removed)* | Not present in built-in module |
