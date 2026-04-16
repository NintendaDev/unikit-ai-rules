---
version: 1.0.0
---

# Tween

> **Scope**: Godot 4 Tween and Tweener system — creating, configuring, and controlling property/method/callback animations via script, including lifecycle management, sequential and parallel sequencing, transition and ease curves.
> **Load when**: animating properties over time, creating UI transitions, interpolating values in script, using Tween or Tweener, setting up looping animations, awaiting animation completion, managing tween lifecycle.

---

## Core Concepts

A `Tween` is a lightweight object that animates values over time using a sequence of `Tweener` steps. Tweens are ideal for dynamic animations where final values are determined at runtime (e.g., smoothly moving a camera to a computed target, fading a UI panel out).

- A Tween runs through its Tweener steps sequentially by default; steps can be made parallel.
- Tweens are **fire-and-forget**: once finished, the object becomes invalid. A new Tween must be created for the next animation.
- A Tween starts automatically on the next process frame after creation.

**When to prefer Tween over AnimationPlayer:**
- Final values are not known at edit time (computed at runtime).
- One-off procedural animations triggered from code.
- Simple timer-like delays with `tween_interval()`.

**When to prefer AnimationPlayer:**
- Complex multi-track animations authored in the editor.
- Animations that need blending or animation trees.

---

## Creation

Always create Tweens via `Node.create_tween()` or `get_tree().create_tween()`. **Never use `Tween.new()`** — it produces an invalid object.

```gdscript
# From a Node — auto-bound to self (preferred)
var tween := create_tween()

# From SceneTree — not bound, must call bind_node() manually
var tween := get_tree().create_tween()
tween.bind_node(self)
```

`create_tween()` called on a node automatically binds the Tween to that node: the Tween is killed if the node leaves the scene tree.

---

## API / Interface

### Tween — configuration methods (chainable, return `Tween`)

| Method | Description |
|--------|-------------|
| `bind_node(node: Node)` | Bind to a node; auto-kill when node exits the tree |
| `set_loops(loops: int = 0)` | Repeat `loops` times; `0` (no arg) = infinite loop |
| `set_speed_scale(speed: float)` | Multiply playback speed (default `1.0`) |
| `set_trans(trans: TransitionType)` | Default transition for all subsequent PropertyTweeners / MethodTweeners |
| `set_ease(ease: EaseType)` | Default easing for all subsequent PropertyTweeners / MethodTweeners |
| `set_parallel(parallel: bool)` | `true` → subsequent tweeners run simultaneously |
| `chain()` | Return to sequential mode after a parallel block |
| `set_process_mode(mode: TweenProcessMode)` | `TWEEN_PROCESS_IDLE` (default) or `TWEEN_PROCESS_PHYSICS` |
| `set_pause_mode(mode: TweenPauseMode)` | See Pause Modes below |

### Tween — control methods

| Method | Description |
|--------|-------------|
| `kill()` | Abort all steps and invalidate the Tween immediately |
| `pause()` | Suspend animation; resume with `play()` |
| `play()` | Start or resume animation |
| `stop()` | Stop and reset to the beginning |
| `is_running() → bool` | `true` while actively animating |
| `is_valid() → bool` | `false` after `kill()` or natural finish |
| `get_total_elapsed_time() → float` | Seconds since animation started |
| `get_loops_left() → int` | Remaining loops; `-1` = infinite |
| `custom_step(delta: float)` | Manually advance by `delta` seconds |

### Tween — tweener creation methods

| Method | Returns |
|--------|---------|
| `tween_property(object, property: NodePath, final_value, duration: float)` | `PropertyTweener` |
| `tween_method(method: Callable, from, to, duration: float)` | `MethodTweener` |
| `tween_callback(callback: Callable)` | `CallbackTweener` |
| `tween_interval(time: float)` | `IntervalTweener` |

### PropertyTweener — modifiers (all chainable)

| Method | Description |
|--------|-------------|
| `.from(value)` | Override starting value |
| `.from_current()` | Start from the property's value at the moment this Tweener is created |
| `.as_relative()` | Treat `final_value` as an offset from the start value |
| `.set_trans(trans: TransitionType)` | Override transition for this tweener only |
| `.set_ease(ease: EaseType)` | Override ease for this tweener only |
| `.set_delay(delay: float)` | Seconds to wait before this tweener begins |
| `.set_custom_interpolator(fn: Callable)` | Custom easing curve (receives and returns `0.0–1.0`) |

### CallbackTweener — modifiers

| Method | Description |
|--------|-------------|
| `.set_delay(delay: float)` | Seconds to wait before the callback fires |

### Signals

| Signal | When emitted |
|--------|-------------|
| `finished` | All steps complete (never emitted for infinite loops) |
| `loop_finished(loop_count: int)` | After each loop cycle completes (not the last one) |
| `step_finished(idx: int)` | After each individual step (Tweener or parallel group) |

---

## Patterns & Examples

### Sequential property animation

```gdscript
var tween := create_tween()
tween.tween_property(sprite, "position", Vector2(400, 300), 0.5) \
    .set_trans(Tween.TRANS_QUINT).set_ease(Tween.EASE_OUT)
tween.tween_property(sprite, "modulate:a", 0.0, 0.3)
```

Steps run one after another by default.

### Parallel animation (simultaneous)

```gdscript
var tween := create_tween().set_parallel(true)
tween.tween_property(sprite, "position", target_pos, 0.5)
tween.tween_property(sprite, "modulate:a", 1.0, 0.5)
```

### Mixed sequential + parallel

```gdscript
var tween := create_tween()
# Step 1: parallel — move and fade simultaneously
tween.set_parallel(true)
tween.tween_property(sprite, "position", target_pos, 0.5)
tween.tween_property(sprite, "modulate:a", 1.0, 0.5)
# Step 2: sequential — rotate after both finish
tween.chain()
tween.tween_property(sprite, "rotation_degrees", 90.0, 0.3)
```

### Callbacks and delays

```gdscript
var tween := create_tween()
tween.tween_callback(func(): label.text = "Go!").set_delay(1.0)
tween.tween_property(bar, "value", 100.0, 2.0)
tween.tween_callback(on_complete)
```

### Relative movement

```gdscript
# Move 200px to the right from current position
tween.tween_property(self, "position", Vector2(200, 0), 0.4).as_relative()
```

### Looping animation

```gdscript
var tween := create_tween().set_loops()  # infinite
tween.tween_property(icon, "rotation_degrees", 360.0, 1.0) \
    .as_relative().set_trans(Tween.TRANS_LINEAR)
```

### Using as a one-shot timer

```gdscript
await create_tween().tween_interval(2.0).finished
# code here runs 2 seconds later
```

### Awaiting completion

```gdscript
var tween := create_tween()
tween.tween_property(panel, "modulate:a", 0.0, 0.3)
await tween.finished
panel.hide()
```

### Restarting a tween safely

Kill the previous instance before creating a new one:

```gdscript
var _effect_tween: Tween

func play_hit_flash() -> void:
    if _effect_tween:
        _effect_tween.kill()
    _effect_tween = create_tween()
    _effect_tween.tween_property(sprite, "modulate", Color.RED, 0.1)
    _effect_tween.tween_property(sprite, "modulate", Color.WHITE, 0.1)
```

### MethodTweener (shader parameters, non-NodePath targets)

```gdscript
# Animate a shader parameter that can't be accessed via NodePath
var tween := create_tween()
tween.tween_method(
    func(v: float): material.set_shader_parameter("dissolve", v),
    0.0, 1.0, 1.5
).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
```

---

## Configuration

### Transition Types

| Constant | Curve shape |
|----------|------------|
| `TRANS_LINEAR` | Constant speed |
| `TRANS_SINE` | Smooth (sine wave) |
| `TRANS_QUAD` | Power of 2 |
| `TRANS_CUBIC` | Power of 3 |
| `TRANS_QUART` | Power of 4 |
| `TRANS_QUINT` | Power of 5 |
| `TRANS_EXPO` | Exponential |
| `TRANS_CIRC` | Circular |
| `TRANS_BACK` | Overshoots, then snaps back |
| `TRANS_BOUNCE` | Bounces at the end |
| `TRANS_ELASTIC` | Elastic (spring-like wiggle) |
| `TRANS_SPRING` | Spring toward target |

**Rule of thumb:** Start with `TRANS_QUINT` + `EASE_OUT` for UI movement. If unsure, try `EASE_IN_OUT` with different `TRANS_*` values until the motion feels right.

### Ease Types

| Constant | Effect |
|----------|--------|
| `EASE_IN` | Slow start, accelerates |
| `EASE_OUT` | Fast start, decelerates (most natural for ending motions) |
| `EASE_IN_OUT` | Slow at both ends (balanced; good default) |
| `EASE_OUT_IN` | Fast at both ends |

### Process Modes

| Constant | When it updates |
|----------|----------------|
| `TWEEN_PROCESS_IDLE` | After `_process()` (default) |
| `TWEEN_PROCESS_PHYSICS` | After `_physics_process()` — use for physics-driven animations |

### Pause Modes

| Constant | Behavior when SceneTree is paused |
|----------|----------------------------------|
| `TWEEN_PAUSE_BOUND` (default) | Respects bound node's `process_mode` |
| `TWEEN_PAUSE_STOP` | Pauses with SceneTree |
| `TWEEN_PAUSE_PROCESS` | Continues regardless of pause state |

---

## Best Practices

- **Never create a Tween in `_ready()`** and store it for later use — the Tween finishes almost immediately and becomes invalid.
- **Create Tweens on demand**, at the moment the animation should start.
- **Use `create_tween()` from a node** (not `get_tree().create_tween()`) whenever possible — auto-binding is free and prevents memory leaks.
- **Always kill an existing Tween before creating a new one** for the same effect (see "Restarting a tween safely" example).
- **Access sub-properties via NodePath** — prefer `"modulate:a"` over animating the full `modulate` color when only alpha changes; prefer `"position:x"` for single-axis movement.
- **Use `.from_current()`** when constructing parallel Tweens and the starting value may have changed between Tweener additions.
- **Connect to `finished` or `await tween.finished`** instead of using `tween_callback` at the end of a sequence — it is cleaner and avoids accidental double-registration.
- **Use `set_speed_scale()`** to globally slow down or speed up an animation (e.g., for slow-motion effects) without rewriting individual durations.
- **Animate only the minimum needed**: prefer sub-property paths over full structs to avoid overwriting unrelated channels (e.g., `"position:y"` instead of `"position"` if X must stay free).

---

## Anti-patterns

- **`Tween.new()`** — never valid; always crashes silently or does nothing. Use `create_tween()`.
- **Creating multiple Tweens that animate the same property simultaneously** — the last-created Tween wins and produces unpredictable results. Kill the previous one first.
- **Zero-duration steps inside `set_loops()` infinite loops** — Godot stops the loop after a few iterations to prevent freezing; always give each step a positive duration.
- **Checking `is_running()` before `kill()`** — unnecessary; `kill()` is safe to call on any state including an invalid Tween.
- **Holding a reference to a finished Tween and calling methods on it** — `is_valid()` returns `false` after natural completion; all method calls are no-ops. Create a new Tween instead.
- **Forgetting that `set_parallel(true)` is sticky** — every subsequent `tween_*` call runs in parallel until `chain()` is explicitly called.
- **Using `tween_method` for NodePath-accessible properties** — prefer `tween_property`; it is more efficient and the property is animated atomically.
- **Expecting `finished` to emit on infinite loops** — it never does; use `loop_finished` or `step_finished` instead.
