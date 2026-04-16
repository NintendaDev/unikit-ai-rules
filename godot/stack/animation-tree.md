---
version: 1.0.0
---

# AnimationTree / AnimationStateMachine

> **Scope**: Godot 4 animation state machine and blend tree authoring — AnimationNodeStateMachine setup, state transitions via AnimationNodeStateMachinePlayback, parameter-driven blend nodes (BlendSpace, OneShot, Transition, Blend2), and root motion integration.
> **Load when**: setting up AnimationTree, authoring or wiring animation states, controlling animations from code, using BlendSpace or OneShot nodes, debugging state transitions, integrating root motion with CharacterBody.

---

## Setup

Always provide an `AnimationPlayer` and set `active = true` before using any state machine methods.

```gdscript
@onready var animation_tree: AnimationTree = $AnimationTree
@onready var state_machine: AnimationNodeStateMachinePlayback = animation_tree["parameters/playback"]

func _ready() -> void:
    animation_tree.active = true
```

- Set **Tree Root** to `New AnimationNodeStateMachine` in the Inspector.
- Link **Anim Player** to the existing `AnimationPlayer`.
- Set `Active` to **On** in Inspector (or `animation_tree.active = true` in code).

---

## AnimationNodeStateMachine — State Transitions

Always retrieve `AnimationNodeStateMachinePlayback` via `animation_tree["parameters/playback"]` and cache it in `_ready()`.

```gdscript
# Travel follows connection paths to reach the target state (respects transitions).
state_machine.travel("Run")

# Get the currently active state (useful for conditional logic).
var current: String = state_machine.get_current_node()
```

Use `travel()` rather than direct state jumps — it respects transition conditions and blending. Never call `start()` unless you need to bypass transition logic.

**Nested state machines:** each nested `AnimationNodeStateMachine` has its own playback parameter.

```gdscript
var sub_sm: AnimationNodeStateMachinePlayback = animation_tree["parameters/SubMachine/playback"]
sub_sm.travel("AttackLoop")
```

---

## Transition Configuration

| Property | Value | When to Use |
|----------|-------|-------------|
| Switch Mode | `Immediate` | Default; instant switch at any time |
| Switch Mode | `At End` | Wait for current animation to finish (attacks → idle) |
| Advance Mode | `Auto` | Automatically follow to the next connected state on finish |
| Advance Condition | string | Code-set boolean parameter that triggers the transition |

Set **Switch Mode = At End** for sequential one-way transitions (attack → idle). Use **Auto** to eliminate manual state pushes for sequential flows.

---

## Parameters API

All AnimationTree node parameters are read/written via the `parameters/` path prefix.

```gdscript
# Blend2 / Seek node
animation_tree["parameters/blend_amount"] = 0.5

# BlendSpace1D — set blend position (float)
animation_tree["parameters/WalkBlend/blend_position"] = velocity.length()

# BlendSpace2D — set blend position (Vector2)
animation_tree["parameters/MoveBlend/blend_position"] = Vector2(input.x, input.y)

# OneShot — fire / abort
animation_tree["parameters/HitOneShot/request"] = AnimationNodeOneShot.ONE_SHOT_REQUEST_FIRE
animation_tree["parameters/HitOneShot/request"] = AnimationNodeOneShot.ONE_SHOT_REQUEST_ABORT
# Read active state (read-only)
var active: bool = animation_tree["parameters/HitOneShot/active"]

# Transition node — request a specific input port by name
animation_tree["parameters/CombatTransition/transition_request"] = "state_2"
# Read current state (read-only)
var cur_state: String = animation_tree["parameters/CombatTransition/current_state"]
var cur_index: int   = animation_tree["parameters/CombatTransition/current_index"]

# Condition-based auto-transitions
animation_tree["parameters/conditions/idle"] = is_on_floor and linear_velocity.x == 0
```

Prefer bracket notation `animation_tree["parameters/..."]` over `set()`/`get()` — same result, more readable.

---

## OneShot Pattern — Priority Override

Use `return` after triggering a one-shot so the caller cannot override it with idle/run on the same frame.

```gdscript
func _physics_process(_delta: float) -> void:
    if Input.is_action_just_pressed("attack"):
        state_machine.travel("Attack")
        return                          # prevent run/idle from overriding

    if velocity.length() > 0.0:
        state_machine.travel("Run")
    else:
        state_machine.travel("Idle")
```

---

## Root Motion

Enable root motion in AnimationTree by setting `root_motion_track` to a skeleton bone path.

```gdscript
# Delta values for the current frame (use with move_and_slide)
var delta_pos: Vector3    = animation_tree.get_root_motion_position()
var delta_rot: Quaternion = animation_tree.get_root_motion_rotation()
var delta_scl: Vector3    = animation_tree.get_root_motion_scale()

# Accumulated blended total (for positional sync)
var acc_pos: Vector3 = animation_tree.get_root_motion_position_accumulator()

# Typical CharacterBody3D integration
func _process(_delta: float) -> void:
    set_quaternion(get_quaternion() * animation_tree.get_root_motion_rotation())
    var vel: Vector3 = get_quaternion() * animation_tree.get_root_motion_position() / _delta
    set_velocity(vel)
    move_and_slide()
```

When `root_motion_local = true`, `get_root_motion_position()` returns a pre-multiplied value — multiply by quaternion directly without an additional transform step.

---

## Anti-patterns

- **Forgetting `active = true`** — AnimationTree shows a warning and produces no output; always activate in `_ready()` or Inspector.
- **Accessing playback before `_ready()`** — `animation_tree["parameters/playback"]` returns `null` if read in the constructor or before the node is in the tree; cache in `_ready()`.
- **Using `start()` instead of `travel()`** — `start()` bypasses all transition logic and blending; use only for hard resets.
- **No `return` after one-shot travel** — calling `travel("Attack")` then `travel("Idle")` in the same frame will overwrite the one-shot request.
- **Wrong switch mode for sequential animations** — using `Immediate` for attack → idle causes the idle to interrupt mid-attack; use `At End`.
- **Hardcoded state name strings** — keep state names in constants or an enum to avoid silent runtime bugs from typos.

```gdscript
# Prefer constants over raw strings
const STATE_IDLE  := "Idle"
const STATE_RUN   := "Run"
const STATE_ATTACK := "Attack"

state_machine.travel(STATE_ATTACK)
```
