---
version: 1.0.0
---

# Godot State Charts

> **Scope**: Godot State Charts plugin (derkork/godot-statecharts) — node hierarchy setup, StateChart API, event-driven transitions, guard types, signal wiring, and integration patterns for Godot 4.
> **Load when**: using Godot State Charts plugin, authoring state machines with StateChart nodes, wiring state signals, configuring transitions or guards, sending events from GDScript, debugging state chart behavior, using ParallelState or HistoryState, implementing cooldowns with delayed transitions.

---

## Core Concepts

Godot State Charts is a **state chart** plugin — more powerful than a traditional FSM because multiple states can be active simultaneously (via `ParallelState`) and the hierarchy eliminates state explosion.

**Core separation of concerns:**
- The state chart decides **when** to change state.
- Your code decides **what** to do when a state is entered, exited, or ticked.
- Never track the active state in your own variables — query the state chart or use its signals instead.

**Installation:** Asset Library → search "Godot State Charts" → install to `addons/godot_state_charts/`. Enable in Project Settings → Plugins.

---

## Node Hierarchy

A valid state chart always starts with this structure:

```
StateChart          ← root controller (your code talks to this)
└── CompoundState   ← at least one compound/parallel wrapper
    ├── AtomicState ← leaf states
    └── AtomicState
```

### Node Types

| Node | Description |
|------|-------------|
| `StateChart` | Root controller. Exposes `send_event()` and `set_expression_property()`. |
| `AtomicState` | Leaf state — no children. The most common building block. |
| `CompoundState` | Exclusive-child parent: exactly one child is active at a time. Set `initial_state`. |
| `ParallelState` | All-children-active parent: every child state runs simultaneously. Use to model orthogonal concerns (e.g., movement + animation). |
| `HistoryState` | Pseudo-state that restores the previously active child when entered. |
| `Transition` | Child of a state; defines an edge to another state triggered by an event or automatically. |

---

## StateChart API

Obtain a reference once in `_ready()` and store it. Interact **only** through `StateChart` — never navigate to individual states to trigger transitions.

```gdscript
@onready var _state_chart: StateChart = $StateChart

func _ready() -> void:
    _state_chart.set_expression_property("health", 100)

func take_damage(amount: int) -> void:
    _state_chart.set_expression_property("health", health - amount)
    _state_chart.send_event("damaged")
```

### Methods

| Method | Signature | Purpose |
|--------|-----------|---------|
| `send_event` | `(event: String) -> void` | Trigger any transition listening for this event name. |
| `set_expression_property` | `(name: String, value: Variant) -> void` | Update a named value used by `ExpressionGuard` conditions. Also re-evaluates automatic transitions. |

---

## State Signals

All state nodes (`AtomicState`, `CompoundState`, `ParallelState`) emit these signals. Connect them in the editor or in `_ready()`.

| Signal | Parameters | When emitted |
|--------|-----------|--------------|
| `state_entered` | — | State becomes active. |
| `state_exited` | — | State becomes inactive. |
| `event_received` | `event: String` | An event was received while this state was active (even if no transition was taken). |
| `state_processing` | `delta: float` | Every `_process` frame while active. Respects pause mode. |
| `state_physics_processing` | `delta: float` | Every `_physics_process` frame while active. Respects pause mode. |
| `state_input` | `event: InputEvent` | Input event while active (mirrors `_input`). |
| `state_unhandled_input` | `event: InputEvent` | Unhandled input while active (mirrors `_unhandled_input`). |
| `state_stepped` | — | Stepping mode only — manual tick. |
| `transition_pending` | `initial_delay, remaining_delay: float` | A delayed transition is counting down. |

**CompoundState** additionally emits:

| Signal | When |
|--------|------|
| `child_state_entered` | Any direct child becomes active. |
| `child_state_exited` | Any direct child becomes inactive. |

### Typical wiring pattern

```gdscript
func _ready() -> void:
    %IdleState.state_entered.connect(_on_idle_entered)
    %IdleState.state_physics_processing.connect(_on_idle_physics)

func _on_idle_entered() -> void:
    animation_player.play("idle")

func _on_idle_physics(delta: float) -> void:
    if Input.is_action_pressed("move_right"):
        _state_chart.send_event("move")
```

---

## Transitions

`Transition` nodes are children of a **source** state. Configure:
- `to` — path to the target state.
- `event` — name of the event that triggers this transition (leave empty for an automatic transition).
- Guard — optional condition resource attached to the transition.

### Event-triggered transitions

Fire when `state_chart.send_event("event_name")` is called and the source state is active.

```gdscript
_state_chart.send_event("jump")  # triggers any Transition with event = "jump"
```

### Automatic transitions (no event)

Evaluated immediately on:
- State entry.
- Any `set_expression_property()` call.

Always add a guard to automatic transitions to prevent infinite loops.

### Delayed transitions

Set `delay` on a `Transition`. The delay expression can reference expression properties:

```gdscript
_state_chart.set_expression_property("cooldown_time", 2.5)
# Transition delay expression: cooldown_time
```

Only one transition can be pending per state at a time.

### Programmatic transition (since v0.18)

```gdscript
var transition: Transition = $StateChart/MyState/MyTransition
transition.take()          # ignore delay, fire immediately
transition.take(false)     # respect configured delay
```

### Transition ordering

Multiple transitions on the same state are evaluated **top-to-bottom**. The first one whose guard passes is taken. Use `AllOfGuard` / `AnyOfGuard` to combine conditions rather than relying solely on ordering.

### Transition signal

```gdscript
$StateChart/Idle/ToRunning.taken.connect(_on_to_running_taken)
```

---

## Guard Types

Guards are `Resource` objects attached to a `Transition`. Guards can be nested.

| Guard | Logic |
|-------|-------|
| `ExpressionGuard` | Evaluates a Godot `Expression` string against expression properties. |
| `AllOfGuard` | AND — all child guards must pass. |
| `AnyOfGuard` | OR — at least one child guard must pass. |
| `NotGuard` | Negates its single child guard. |
| `StateIsActiveGuard` | Passes when a specified state node is currently active. |

### ExpressionGuard usage

Set properties via `set_expression_property()`, then reference them in the guard expression:

```gdscript
_state_chart.set_expression_property("health", current_health)
_state_chart.set_expression_property("on_ground", is_on_floor())
# Guard expression: "health <= 0"
# Guard expression: "on_ground and velocity_y == 0"
```

Initialize all expression properties in `_ready()` before the state chart starts evaluating guards.

---

## Patterns & Examples

### Input handling — per-state

Put input logic in `state_physics_processing`, not in a global `_physics_process`. The state chart disables signals for inactive states automatically.

```gdscript
func _on_jump_enabled_state_physics_processing(delta: float) -> void:
    if Input.is_action_just_pressed("jump"):
        velocity.y = JUMP_VELOCITY
        _state_chart.send_event("jump")
```

### Event bubbling for shared transitions

Parent (`CompoundState`) states can handle events that apply to all children. Example: `Airborne` compound state catches a `landed` event regardless of whether the character is in `Jumping` or `Falling` sub-state.

```
Airborne (CompoundState)
├── Jumping (AtomicState)
├── Falling (AtomicState)
└── Transition (event=landed, to=Grounded)   ← handles landing from any airborne sub-state
```

This eliminates duplicate transitions on each sub-state.

### No-code signal connections

Simple actions (play sound, trigger animation) can be wired directly in the editor without any code:

```
IdleState.state_entered → AudioPlayer.play()
RunState.state_entered  → AnimationPlayer.play("run")
```

### History state — resume after interruption

Use `HistoryState` as the `to` target of a return-transition:

```
Interrupted (AtomicState)
└── Transition (event=resume, to=PreviousState [HistoryState])
```

Set `deep = true` to restore the entire nested sub-state, not just the compound child.

### Checking if a state is active (when unavoidable)

```gdscript
var state: Node = %SomeState
if state.active:
    do_something()
```

Prefer signal-driven patterns over polling `active`.

---

## Anti-patterns

- **Tracking state in your own variables** — don't maintain `current_state: String` manually. Subscribe to `state_entered` / `state_exited` instead.
- **Forgetting `initial_state` on CompoundState** — the editor shows a warning; the chart will not know which child to activate first.
- **Auto-transitions without guards** — causes an infinite transition loop as the transition re-fires immediately on entry.
- **Global `_physics_process` checking state** — move input and physics logic into `state_physics_processing` signals on the relevant states.
- **Parallel state with fewer than two children** — the editor warns; a single child offers no benefit over a compound state.
- **Mutating expression properties inside a transition callback** — this can trigger re-evaluation of auto-transitions mid-flight. Update properties in `_physics_process` / `state_physics_processing` instead.
- **Deep nesting without hierarchy planning** — model orthogonal concerns (movement, combat, animation) as sibling `ParallelState` children rather than flattening everything into one compound state.
