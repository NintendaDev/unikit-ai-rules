---
version: 1.0.0
---

# AnimationTree

> **Scope**: Godot 4 animation state machine and blend tree authoring — AnimationNodeStateMachine setup, state transitions via AnimationNodeStateMachinePlayback, parameter-driven blend nodes (BlendSpace1D/2D, OneShot, Blend2, Transition), and root motion integration in Godot 4 .NET C# projects.
> **Load when**: setting up AnimationTree with a state machine, authoring state transitions from C#, using blend nodes (BlendSpace1D/2D, OneShot, Transition), configuring root motion for CharacterBody3D, debugging AnimationTree parameter access or play/travel issues, designing multi-state character animation systems.

---

## Core Concepts

- **AnimationPlayer** — the data bank: stores animation clips, defines tracks and keyframes.
- **AnimationTree** — the execution engine: reads animations from AnimationPlayer, controls blending, state machine logic, and parameter-driven transitions. Extends `AnimationMixer`.
- **AnimationNode** — resource base class for all tree nodes (blend nodes, state machines, animation leaves).
- **Parameters** — runtime values that drive blending; addressed as `"parameters/<NodeName>/<property>"` in a flat dictionary on AnimationTree.

Use AnimationTree when a character has 5+ animation states or requires smooth crossfade blending. For simple sequential playback, AnimationPlayer alone is sufficient.

## Architecture & Node Hierarchy

```
AnimationTree (scene node, extends AnimationMixer)
  └── tree_root: AnimationNode (choose one)
        ├── AnimationNodeStateMachine    ← primary choice for characters
        ├── AnimationNodeBlendTree       ← complex graph with multiple blend sub-nodes
        ├── AnimationNodeBlendSpace1D    ← 1D linear blend (speed-based locomotion)
        └── AnimationNodeBlendSpace2D    ← 2D Delaunay-triangulated blend (directional movement)
```

Processing pipeline per frame:
1. AnimationTree propagates time down the node graph.
2. Leaf `AnimationNodeAnimation` nodes sample AnimationPlayer clips.
3. Track weights accumulate upward through blend nodes.
4. Root motion track (if configured) is extracted instead of applied to the skeleton.
5. Inactive state machine branches are **not** evaluated (lazy evaluation — no CPU cost for idle states).

## Setup

1. Add `AnimationPlayer` to the character scene with all animation clips imported.
2. Add `AnimationTree` as sibling or child of the character root.
3. Set `AnimationTree.anim_player` to the AnimationPlayer node path.
4. Set `AnimationTree.tree_root` to a new `AnimationNodeStateMachine` (or other root type).
5. **Set `AnimationTree.active = true`** — without this, the tree does nothing.
6. Add a `RESET` animation in AnimationPlayer (at timestamp 0) that defines the default rest pose for **all** properties animated by any other animation. Missing tracks in blended animations default to the RESET pose instead of zero, preventing T-pose snapping.

```csharp
[Export] private AnimationTree _animTree = null!;
private AnimationNodeStateMachinePlayback _playback = null!;

public override void _Ready()
{
    // Cast once in _Ready — never call Get("parameters/playback") per frame
    _playback = (AnimationNodeStateMachinePlayback)_animTree.Get("parameters/playback");
}
```

## AnimationNodeStateMachine Patterns

### Accessing Playback

```csharp
// Root-level state machine
var playback = (AnimationNodeStateMachinePlayback)_animTree.Get("parameters/playback");

// Nested sub-state-machine named "Locomotion"
var subPlayback = (AnimationNodeStateMachinePlayback)_animTree.Get("parameters/Locomotion/playback");
```

`travel()` cannot cross sub-state-machine boundaries — always get the playback of the specific sub-machine you want to control.

### AnimationNodeStateMachinePlayback API

| Method | Signature | Description |
|--------|-----------|-------------|
| `Travel` | `Travel(StringName toNode, bool resetOnTeleport = true)` | Follows shortest path through transitions to reach the target. |
| `Start` | `Start(StringName node, bool reset = true)` | Jumps directly, bypassing transitions. |
| `Stop` | `Stop()` | Stops all playback; state machine goes idle. |
| `Next` | `Next()` | Immediately advances to the next state in the travel path. |
| `IsPlaying` | `IsPlaying() → bool` | Returns `true` if the state machine is active. |
| `GetCurrentNode` | `GetCurrentNode() → StringName` | Name of the currently playing state. |
| `GetFadingFromNode` | `GetFadingFromNode() → StringName` | Node being faded from during an active transition. |
| `GetTravelPath` | `GetTravelPath() → PackedStringArray` | Full path being followed (includes intermediate states). |
| `GetCurrentPlayPosition` | `GetCurrentPlayPosition() → float` | Playback position of the current animation in seconds. |
| `GetCurrentLength` | `GetCurrentLength() → float` | Length of the current animation in seconds. |

### Travel vs Start

| Method | Behaviour |
|--------|-----------|
| `Travel("State")` | Follows configured transitions to reach the target; respects `At End` / `Sync` switch modes. |
| `Start("State")` | Jumps directly, ignoring transitions and switch modes. Use for hard interrupts only. |
| `Stop()` | Stops all playback; AnimationTree goes idle. |

**Non-looping animation restart pitfall**: After a non-looping animation ends, `IsPlaying()` still returns `true` and `Travel()` will **not** restart it. Use `Start()` to force re-trigger:

```csharp
if (_playback.GetCurrentNode() == States.Attack && !_playback.IsPlaying())
    _playback.Start(States.Attack);
```

### State Name Constants

```csharp
// Centralise all state names — never scatter magic strings across code
private static class States
{
    public const string Idle   = "Idle";
    public const string Run    = "Run";
    public const string Attack = "Attack";
    public const string Death  = "Death";
}
```

### Guard Travel Calls

```csharp
public override void _PhysicsProcess(double delta)
{
    string target = Velocity.LengthSquared() > 0.01f ? States.Run : States.Idle;

    // Guard: skip if already in target state
    if (_playback.GetCurrentNode() != target)
        _playback.Travel(target);
}
```

### Transition Properties (editor, per-connection)

| Property | Values | Recommendation |
|----------|--------|---------------|
| Switch Mode | Immediate / Sync / At End | Use `At End` for looping animations that should finish before transitioning |
| Xfade Time | float (seconds) | 0.1–0.3 s for characters; 0 = hard cut |
| Xfade Curve | Curve resource | Leave empty for linear; use custom curve for snappy feel |
| Reset | bool | `true` = play from start; `false` = resume at current position |
| Priority | int | Lower value = preferred path during `Travel()` |
| Advance Mode | Disabled / Enabled / Auto | Prefer `Disabled` with C# — see below |

### Advance Expressions & C# Limitation

The editor expression parser **does not** resolve C# enums or constants. This does not work:
```
animationState == AnimationState.WALKING  // ✗ editor cannot resolve C# types
```

Use `Advance Mode = Disabled` on connections and implement all transition logic in C#:

```csharp
// C# switch expression — clean alternative to advance expressions
_playback.Travel(currentState switch
{
    AnimationStates.Idle    => States.Idle,
    AnimationStates.Walking => States.Run,
    _                       => States.Idle
});
```

## Parameter System

All blend parameters are controlled on the `AnimationTree` node via `Set`/`Get` with hierarchical `"parameters/<NodeName>/<property>"` paths.

### Node Parameter Reference

| Node Type | Path suffix | C# Type | Notes |
|-----------|------------|---------|-------|
| `AnimationNodeBlendSpace1D` | `blend_position` | `float` | Linear blend value |
| `AnimationNodeBlendSpace2D` | `blend_position` | `Vector2` | 2D blend position |
| `AnimationNodeBlend2` | `blend_amount` | `float` | 0..1 |
| `AnimationNodeOneShot` | `request` | `(int)AnimationNodeOneShot.OneShotRequest` | Fire / Abort / FadeOut |
| `AnimationNodeOneShot` | `active` | `bool` (read only) | `true` while playing |
| `AnimationNodeTimeScale` | `scale` | `float` | Multiplier; negative = reverse playback |
| `AnimationNodeTimeSeek` | `seek_request` | `float` | Target position in seconds |
| `AnimationNodeTransition` | `transition_request` | `string` | State name to switch to |
| `AnimationNodeTransition` | `current_state` | `string` (read) | Currently active state |
| `AnimationNodeTransition` | `current_index` | `int` (read) | Currently active index |
| `AnimationNodeBlend3` | `blend_amount` | `float` | −1..1; −1 = left, 0 = center, 1 = right |
| `AnimationNodeStateMachine` | `playback` | `AnimationNodeStateMachinePlayback` | Cast and call `Travel()`/`Start()` |
| `AnimationNodeStateMachine` | `conditions/{name}` | `bool` | Boolean flags for `Advance Mode = Auto` transitions |

### C# Set/Get Examples

```csharp
// BlendSpace1D — speed-based locomotion
_animTree.Set("parameters/Locomotion/blend_position", Velocity.Length() / MaxSpeed);

// BlendSpace2D — 8-directional movement
_animTree.Set("parameters/Move/blend_position", new Vector2(inputDir.X, inputDir.Z));

// OneShot — trigger attack overlay
_animTree.Set("parameters/AttackShot/request", (int)AnimationNodeOneShot.OneShotRequest.Fire);
// Abort early
_animTree.Set("parameters/AttackShot/request", (int)AnimationNodeOneShot.OneShotRequest.Abort);
// Check if playing
bool isAttacking = (bool)_animTree.Get("parameters/AttackShot/active");

// TimeScale — slow motion at 50 %
_animTree.Set("parameters/TimeMod/scale", 0.5f);

// TimeSeek — jump to frame 0
_animTree.Set("parameters/SeekNode/seek_request", 0.0f);

// Transition — switch weapon stance
_animTree.Set("parameters/WeaponState/transition_request", "Rifle");
string current = (string)_animTree.Get("parameters/WeaponState/current_state");

// Advance condition (boolean flag for Auto-advance transitions in StateMachine)
_animTree.Set("parameters/conditions/is_grounded", true);
_animTree.Set("parameters/conditions/is_jumping", false);
```

## Blend Nodes

### AnimationNodeBlendSpace1D

Linear blend along a 1D axis. Place animation points at float positions; the engine interpolates between the two nearest.

Use case: speed-based locomotion — `idle(0)` → `walk(0.5)` → `run(1.0)`.

### AnimationNodeBlendSpace2D

2D blend using Delaunay triangulation. Place animation points at `(x, y)` positions.

Blend modes:
- **Interpolated** (default) — smooth blending inside triangles; for 3D directional movement.
- **Discrete** — frame-exact switching; for 2D top-down sprites.
- **Carry** — discrete but preserves playback position when switching.

### AnimationNodeBlend3

Blends three animations: center (0), left (−1), right (+1). Parameter `blend_amount` range is −1..1.

Use case: lean left/right blend on top of locomotion.

```csharp
_animTree.Set("parameters/Lean/blend_amount", leanValue); // −1..1
```

### AnimationNodeOneShot

Overlays a one-shot animation on top of a continuously playing base animation.

**`OneShotRequest` values:**
| Value | Int | Description |
|-------|-----|-------------|
| `None` | 0 | No request |
| `Fire` | 1 | Start the one-shot |
| `Abort` | 2 | Stop immediately |
| `FadeOut` | 3 | Blend out gracefully |

Key properties:
- `mix_mode` — `Blend` (additive on top of base) or `Add` (sum of both)
- `fadein_time` / `fadeout_time` — blend duration in seconds
- `fadein_curve` / `fadeout_curve` — optional `Curve` for non-linear blending
- `filter_enabled` + track filters — restrict to specific bones (e.g. upper-body attack while legs keep running)
- `autorestart` / `autorestart_delay` — automatically re-fire after completion
- `break_loop_at_end` — stop a looping animation at its natural end instead of repeating

Read `active` parameter to check if the one-shot is currently playing.

### AnimationNodeTransition

Simplified state machine for a small fixed set of named inputs with crossfade. Use for switching between 2–5 simple modes (e.g. weapon types, stances) rather than full character locomotion logic.

## Root Motion

Root motion extracts a bone's transform from the AnimationTree instead of applying it to the skeleton. This drives physics-accurate character movement from animation data.

### Setup

1. In AnimationPlayer, ensure the root bone has Position 3D or Rotation tracks with actual movement keyframes.
2. In AnimationTree Inspector, set `root_motion_track` to the skeleton bone track path, e.g. `"Skeleton3D:Root"`.
3. The bone's position/rotation will be cancelled on the skeleton visually; the delta is available via API.

### C# Usage with CharacterBody3D

```csharp
public override void _PhysicsProcess(double delta)
{
    // Per-frame root motion delta in local space
    Vector3 rootMotionDelta = _animTree.GetRootMotionPosition();

    // Convert to world space and apply as velocity
    Velocity = GlobalTransform.Basis * rootMotionDelta / (float)delta;
    MoveAndSlide();
}
```

For slope-aware movement, project the root motion delta onto the floor plane:

```csharp
public override void _PhysicsProcess(double delta)
{
    Vector3 rootMotionDelta = _animTree.GetRootMotionPosition();
    Vector3 worldDelta = GlobalTransform.Basis * rootMotionDelta;

    if (IsOnFloor())
    {
        worldDelta = worldDelta.Slide(GetFloorNormal()); // follow slopes
        Velocity = worldDelta / (float)delta;
    }
    else
    {
        Velocity += GetGravity() * (float)delta;
        Velocity = new Vector3(worldDelta.X / (float)delta, Velocity.Y, worldDelta.Z / (float)delta);
    }
    MoveAndSlide();
}
```

Available extraction methods:

```csharp
// 3D
_animTree.GetRootMotionPosition();             // position delta this frame
_animTree.GetRootMotionRotation();             // rotation delta (Quaternion)
_animTree.GetRootMotionScale();                // scale delta
_animTree.GetRootMotionPositionAccumulator();  // total accumulated position since last reset
_animTree.GetRootMotionRotationAccumulator();  // total accumulated rotation since last reset
_animTree.GetRootMotionScaleAccumulator();     // total accumulated scale since last reset

// 2D characters
_animTree.GetRootMotionPosition2D();           // Vector2 position delta
_animTree.GetRootMotionRotation2D();           // float rotation delta
```

## Best Practices

- **Cache playback in `_Ready()`** — `Get("parameters/playback")` allocates; never call it in `_PhysicsProcess`.
- **Guard `Travel()` with `GetCurrentNode()`** — skip the call when already in the target state.
- **Add a `RESET` animation** — prevents missing-track properties from snapping to zero during blends.
- **Set `Xfade Time` ≥ 0.1 s** — hard cuts feel mechanical on characters; 0.1–0.3 s is the usual range.
- **Drive all transitions from C#** — avoid advance expressions in the editor when the project uses C#; the parser does not understand C# types.
- **Import humanoid models in T-pose** — bones start at Rest, providing the best initial state for rotation blending.
- **Nest state machines for complex characters** — top-level handles major states (Grounded / Airborne / Swimming); each sub-machine handles locomotion detail.

## Anti-patterns

- **Calling `Get("parameters/playback")` per frame** — caches are free; this causes GC pressure.
- **Magic strings for state names** — centralise in a `static class States {}`.
- **Advance expressions referencing C# enums** — the editor parser does not resolve them; use numeric literals or move logic to C#.
- **Calling `Travel()` unconditionally every physics frame** — always guard with a state check; redundant travels cause micro-stutters.
- **Skipping the `RESET` animation** — animated properties missing from a blended animation default to `0`, causing sudden T-pose or incorrect pose snapping.
- **Calling `Travel()` across sub-state-machine boundaries** — `Travel()` cannot navigate into a sub-machine; access that sub-machine's own `playback` parameter.
- **Leaving all connections on `Immediate` switch mode** — causes abrupt animation cuts; set `At End` for looping states that should complete their cycle before transitioning.
