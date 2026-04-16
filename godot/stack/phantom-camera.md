---
version: 1.0.0
---

# Phantom Camera

> **Scope**: Phantom Camera addon for Godot 4 — priority-based camera management, PhantomCameraHost wiring, follow modes, look-at modes, tween transitions, noise/shake, and 2D boundary setup for Camera2D and Camera3D nodes.
> **Load when**: adding Phantom Camera to a scene, configuring follow or look-at behavior, switching cameras at runtime via priority, setting up tween transitions, implementing camera shake, wiring PhantomCameraHost, debugging camera jitter or priority conflicts.

---

## Core Architecture

Three-layer system between game code and the engine camera:

```
Camera2D / Camera3D
  └── PhantomCameraHost          ← must be a DIRECT child
PhantomCamera2D / 3D             ← placed anywhere in the scene tree
PhantomCameraManager             ← autoload singleton, added by the plugin
```

**Minimum required setup:** Camera + PhantomCameraHost (direct child) + at least one PhantomCamera.
All three must be present for the Viewfinder to render and for follow to function.

**PhantomCameraManager** — autoload singleton registered by the plugin. Maintains the global registry of all hosts and cameras; broadcasts priority-change signals. Do not instantiate manually.

**PhantomCameraHost** — must be a direct child of Camera2D or Camera3D. Evaluates the highest-priority PCam each frame and applies its transform to the parent camera. Use `interpolation_mode` to match the game's loop (`IDLE` for `_process`, `PHYSICS` for `_physics_process`).

**PhantomCamera2D / PhantomCamera3D** (abbreviated PCam2D / PCam3D) — the logic nodes. Can live anywhere in the scene tree. Compute desired transform based on follow and look-at configuration.

## Priority System

The PCam with the **highest `priority` int value** takes control of the scene camera.
Changing priority at runtime triggers an animated tween to the new camera.

```gdscript
# Hand control to this camera (must exceed current active priority)
pcam.set_priority(10)

# Read current value
var p: int = pcam.get_priority()
```

**Editor-only override** — `priority_override = true` forces a PCam active in the editor for Viewfinder preview. It **auto-disables** at runtime and in exported builds. Never use it in game logic.

**Priority spacing:** use gaps (e.g. 0, 10, 20) instead of consecutive integers so dynamic adjustments never collide.

## Follow Modes

| Mode | Value | Description |
|------|-------|-------------|
| None | `0` | No following |
| Glued | `1` | Locks directly to target position, no offset |
| Simple | `2` | Follows with optional offset and damping |
| Group | `3` | Follows the centroid (AABB centre) of multiple targets |
| Path | `4` | Follows along a Path2D / Path3D |
| Framed | `5` | Dead-zone following — stays still while target is inside the zone |
| Third Person | `6` | 3D only — SpringArm3D behaviour, camera rotates around target |

```gdscript
# Read current follow mode (returns int matching the table above)
pcam.get_follow_mode()

# ── Assign / query follow target (Glued / Simple / Framed / Third Person) ──
pcam.set_follow_target(player_node)
pcam.get_follow_target_node()

# ── Offset from target (Simple / Framed / Third Person) ──
pcam.set_follow_offset(Vector2(0.0, -1.0))       # 2D
pcam.set_follow_offset(Vector3(0.0, 1.0, 0.0))   # 3D

# ── Positional damping ──
pcam.set_follow_damping(true)
# Range 0–1, typical 0.1–0.25. Lower = faster/sharper, higher = slower/heavier.
pcam.set_follow_damping_value(Vector2(0.15, 0.15))          # 2D
pcam.set_follow_damping_value(Vector3(0.15, 0.15, 0.15))    # 3D

# ── Group follow — manage target list at runtime ──
pcam.set_follow_targets([node_a, node_b])
pcam.append_follow_targets(node_c)
pcam.append_follow_targets_array([node_d, node_e])
pcam.erase_follow_targets(node_a)
```

**Framed follow** — `dead_zone_width` / `dead_zone_height` are inspector-only properties.
Preview zones via the Viewfinder panel (`show_viewfinder_in_play = true`; disabled in builds).
Best for platformers and action games where constant camera movement causes jitter.

**Third Person (3D)** — internally uses SpringArm3D. Control arm distance via `spring_length`.
Erratic tilting when moving the cursor: increase `follow_damping_value` and `look_at_damping_value`,
or lock unwanted axes with the Follow Axis Lock property.

## Look At Modes (3D)

Controls Camera3D rotation toward targets. 3D-only feature.

```gdscript
# ── Simple / Mimic look-at ──
pcam.set_look_at_target(node)

# ── Group look-at (looks at AABB centre of all targets) ──
pcam.set_look_at_targets([node_a, node_b])
pcam.append_look_at_targets(node)
pcam.append_look_at_targets_array([node_c, node_d])
pcam.erase_look_at_targets(node)

# Offset from look-at target
pcam.set_look_at_offset(Vector3(0.5, 2.5, 0.0))

# Rotational damping (avoids sharp camera turns)
pcam.set_look_at_damping(true)
pcam.set_look_at_damping_value(0.2)   # float, ideal 0.1–0.25
```

## Tween Transitions

Assign a `PhantomCameraTween` resource to `tween_resource`.
Share the same resource across multiple PCams for a consistent transition feel.

```gdscript
# Read assigned tween resource
var res: PhantomCameraTween = pcam.get_tween_resource()

# Skip the entry tween when the scene loads (instant positioning)
pcam.set_tween_on_load(false)
```

`PhantomCameraTween` properties: `duration` (float, seconds), `transition` (`Tween.TransitionType`), `ease` (`Tween.EaseType`).

**TweenDirectorResource** — advanced override: assign a list of "To" tween resources that activate only when transitioning to specific PCams. Resources must be saved to the filesystem, not set inline.

## 2D-Specific Features

```gdscript
# ── Zoom ──
pcam.set_zoom(Vector2(1.5, 1.5))

# ── Pixel-perfect (align to nearest pixel; enable snap_to_pixel in Inspector) ──

# ── Camera boundary limits (manual) ──
pcam.set_limit_left(-200)
pcam.set_limit_right(2000)
pcam.set_limit_top(-100)
pcam.set_limit_bottom(800)

# ── Auto-limits from TileMapLayer or CollisionShape2D ──
# Assign limit_target in the Inspector — no code needed.
# Use limit_margin (Vector4i) to add padding around the detected boundary.

# ── Teleport without damping (jump to target once, skipping smoothing) ──
pcam.teleport_position()
```

## Noise / Camera Shake

Assign a `PhantomCameraNoise2D` or `PhantomCameraNoise3D` resource to the PCam's `noise` property
for persistent shake while that PCam is active. Shake begins only **after** the entry tween completes.

```gdscript
# One-shot custom shake (pass a Transform2D / Transform3D offset)
pcam.emit_noise(transform)

# Layer-based shake emitter — set matching noise_emitter_layer bitmask
# on both the PhantomCameraNoiseEmitter node and the PCam.
```

## Signals

```gdscript
pcam.became_active.connect(_on_became_active)
pcam.became_inactive.connect(_on_became_inactive)
pcam.tween_started.connect(_on_tween_started)
pcam.tween_completed.connect(_on_tween_completed)
pcam.tween_interrupted.connect(func(new_pcam: Node) -> void: pass)  # cut in by another PCam
pcam.follow_target_changed.connect(_on_target_changed)
# 2D only:
pcam.dead_zone_changed.connect(_on_dead_zone_changed)
pcam.dead_zone_reached.connect(_on_dead_zone_reached)
```

## Performance

```gdscript
# Reduce per-frame cost for cameras that are rarely or never active.
# Set inactive_update_mode = NEVER (1) in the Inspector.
# Default is ALWAYS (0) — computes transform every frame even while inactive.
```

Use `inactive_update_mode = NEVER` when many PCams coexist in the scene simultaneously.

## Best Practices

- Make PhantomCameraHost a **direct child** of Camera2D / Camera3D — any other placement breaks tracking.
- Assign `follow_target` in `_ready()`, not in `_process()`, to prevent one-frame null errors.
- Use a **shared `PhantomCameraTween` resource** (saved to disk) across all cameras for a consistent transition feel.
- Leave **gaps between priority values** (e.g. 0, 10, 20) so dynamic runtime adjustments never collide.
- Use `host_layers` bitmask to isolate PCam sets when multiple independent cameras coexist in the scene.
- Set `tween_on_load = false` on the initial PCam to skip the entry animation and position immediately.
- For pixel art projects: enable `snap_to_pixel` on PCam2D.
- **Physics body jitter (Godot 4.4+):** enable Physics Interpolation in Project Settings.
  **Godot 4.3:** set `top_level = true` on the visual node and either use the smoothing-addon
  or point `follow_target` at the visual node rather than the physics body.
- Use `limit_target` to auto-sync 2D camera boundaries with a TileMapLayer or CollisionShape2D
  instead of setting limit values manually.

## Anti-patterns

- **Never manually move Camera2D/Camera3D while a PhantomCameraHost is active** — the host overwrites the transform every frame.
- **Never assign multiple PhantomCameraHosts to the same camera node** — one host per camera only.
- **Never change `priority` every frame** — fires transitions every frame and defeats damping and smoothing.
- **Never use `priority_override = true` in runtime code** — editor-only flag, silently inactive in builds.
- **Never place PhantomCameraHost as anything other than a direct child of the camera** — indirect placement breaks the plugin.
- **Never rely on `reload_current_scene()` to reset camera state** — known bugs exist; manage PCam state explicitly.
