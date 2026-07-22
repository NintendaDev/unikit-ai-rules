---
version: 1.0.0
---

# Beehave

> **Scope**: Beehave behavior tree addon authoring — custom ActionLeaf/ConditionLeaf implementation, composite node selection (Selector vs Sequence and their reactive/star variants), decorator wrapping, Blackboard data sharing, and BeehaveTree configuration for Godot 4.
> **Load when**: building AI behavior trees with Beehave, authoring custom Action or Condition leaf nodes, choosing between Selector and Sequence composites, wiring decorators, sharing Blackboard data between nodes, configuring BeehaveTree (tick_rate, process_thread), debugging behavior tree execution, designing NPC or enemy AI.

---

## Core Concepts

A behavior tree consists of **leaf nodes** (the actual logic), **composite nodes** (control flow), and **decorator nodes** (single-child wrappers). The tree is attached as a child `BeehaveTree` node to the actor scene.

Every node's `tick()` must return one of three status codes:

```gdscript
enum { SUCCESS, FAILURE, RUNNING }
```

- `SUCCESS` — this node completed its goal this tick.
- `FAILURE` — this node could not complete its goal.
- `RUNNING` — this node is mid-execution and must be ticked again next frame.

### Node Categories

| Category | Base Class | Returns |
|----------|-----------|---------|
| Condition leaf | `ConditionLeaf` | `SUCCESS` or `FAILURE` only |
| Action leaf | `ActionLeaf` | `SUCCESS`, `FAILURE`, or `RUNNING` |
| Composite | `SelectorComposite`, `SequenceComposite`, … | Derived from children |
| Decorator | `Inverter`, `Limiter`, … | Wraps or overrides child's result |

---

## API / Interface

### BeehaveNode Lifecycle

```gdscript
# Override in leaf nodes:

func tick(actor: Node, blackboard: Blackboard) -> int:
    return SUCCESS  # Required — core execution logic

func before_run(actor: Node, blackboard: Blackboard) -> void:
    pass  # Called once before the first tick of each run

func after_run(actor: Node, blackboard: Blackboard) -> void:
    pass  # Called after the tick that returned SUCCESS or FAILURE

func interrupt(actor: Node, blackboard: Blackboard) -> void:
    pass  # Called when the tree interrupts this node mid-run; always clean up state here
```

**Execution order per run:** `before_run` → `tick` (repeated while RUNNING) → `after_run` (on SUCCESS/FAILURE) or `interrupt` (on external abort).

### ConditionLeaf

```gdscript
class_name IsPlayerVisible extends ConditionLeaf

@export var detection_range: float = 200.0
@export var vision_angle: float = 45.0  # degrees

func tick(actor: Node, blackboard: Blackboard) -> int:
    var player = get_tree().get_first_node_in_group("player")
    if not player:
        return FAILURE

    var to_player := player.global_position - actor.global_position
    if to_player.length() > detection_range:
        return FAILURE

    var forward := Vector2.RIGHT.rotated(actor.rotation)
    if abs(forward.angle_to(to_player.normalized())) > deg_to_rad(vision_angle):
        return FAILURE

    # Write shared data to blackboard for downstream action nodes
    blackboard.set_value("player_position", player.global_position)
    blackboard.set_value("player_detected", true)
    return SUCCESS
```

### ActionLeaf

```gdscript
class_name ChasePlayer extends ActionLeaf

@export var move_speed: float = 100.0
@export var attack_range: float = 30.0

func tick(actor: Node, blackboard: Blackboard) -> int:
    var player_pos = blackboard.get_value("player_position")
    if not player_pos:
        return FAILURE

    var direction := (player_pos - actor.global_position).normalized()
    actor.global_position += direction * move_speed * get_physics_process_delta_time()

    if actor.global_position.distance_to(player_pos) <= attack_range:
        return SUCCESS
    return RUNNING

func interrupt(actor: Node, blackboard: Blackboard) -> void:
    # Reset any in-progress state when the tree aborts this node
    actor.stop_movement()
```

### Blackboard API

```gdscript
# Store a value (available to all nodes in the same tree)
blackboard.set_value("key", value)

# Read a value with a safe default (returns default if key absent)
var pos = blackboard.get_value("player_position", null)
var detected: bool = blackboard.get_value("player_detected", false)

# Named blackboard scope — separate namespace, does NOT overwrite the default scope
blackboard.set_value("key", value, "custom_scope")
var v = blackboard.get_value("key", null, "custom_scope")
```

**Shared blackboard (multiple trees):** Create a `Blackboard` node in the scene and assign it to each `BeehaveTree.blackboard`. All trees read from and write to the same instance.

```gdscript
# my_scene.gd
@onready var blackboard := $Blackboard

func _ready() -> void:
    blackboard.set_value("alert_level", 0)
```

### BeehaveTree Properties

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `enabled` | `bool` | `true` | Toggle tree execution |
| `actor` | `Node` | parent | The node the tree controls |
| `blackboard` | `Blackboard` | auto | Shared data store; created automatically if unset |
| `process_thread` | `enum` | `PHYSICS` | `IDLE`, `PHYSICS`, or `MANUAL` |
| `tick_rate` | `int` | `1` | Tick every N frames; increase to reduce CPU cost |
| `custom_monitor` | `bool` | `false` | Register performance metrics with Godot's profiler |

---

## Composite Nodes

### Selector vs Sequence — Quick Decision

| Question | Answer |
|----------|--------|
| "Try alternatives until one works?" | `SelectorComposite` |
| "Do all steps in order?" | `SequenceComposite` |
| "Re-check earlier conditions every tick (priority interrupt)?" | Reactive variant |
| "Skip already-passed earlier nodes (multi-step procedure)?" | Star variant |

### All Composite Variants

| Node | Behavior |
|------|----------|
| `SelectorComposite` | Tries children left-to-right; stops and returns `SUCCESS` on first success; returns `FAILURE` if all fail. Skips already-evaluated children on subsequent ticks (resumes from last running). |
| `SelectorReactiveComposite` | Same as Selector but **re-evaluates from first child every tick**. Use for priority-based interrupts (e.g., flee > attack > patrol). |
| `SelectorStarComposite` | Selector that skips all children before the current running child — only one branch executes at a time. |
| `SequenceComposite` | Runs children left-to-right; returns `SUCCESS` only when all succeed; returns `FAILURE` and resets if any child fails. Resumes from running child on next tick. |
| `SequenceReactiveComposite` | Same as Sequence but **re-starts from first child every tick** when a child is running. Use when earlier conditions can become false mid-run. |
| `SequenceStarComposite` | Sequence that **skips already-succeeded children** — continues from the running child without re-evaluating earlier nodes. Use for ordered multi-step procedures. |

### Reactive vs Non-Reactive — Examples

```
# Non-reactive: checks player once, then chases without re-testing visibility
SequenceComposite
├── IsPlayerVisible   ← evaluated once per run
└── ChasePlayer       ← if RUNNING, re-entered next tick without re-checking

# Reactive: re-checks visibility every tick; stops chasing if player hides
SequenceReactiveComposite
├── IsPlayerVisible   ← re-evaluated every tick
└── ChasePlayer

# Priority interrupt: always re-checks flee condition — takes priority over attack
SelectorReactiveComposite
├── Sequence (Flee)
│   ├── IsHealthCritical
│   └── FleeAction
└── AttackAction      ← interrupted if IsHealthCritical becomes true
```

---

## Decorator Nodes

All decorators have exactly **one child**. Place them directly above a leaf or composite.

| Node | Returns | Use case |
|------|---------|----------|
| `Inverter` | `SUCCESS`↔`FAILURE` flipped | Negate a condition (`IsNotHungry` = `Inverter` + `IsHungry`) |
| `Succeeder` | Always `SUCCESS` | Allow tree to continue even if child fails |
| `Failer` | Always `FAILURE` | Force a branch to always fail |
| `Limiter` | `FAILURE` after N ticks reached | Limit retry attempts |
| `TimeLimiter` | `FAILURE` when time expires | Bound an action by duration |
| `Delayer` | `RUNNING` until timer elapses, then child | Add a delay before an action |
| `Cooldown` | `FAILURE` during cooldown; executes child when ready | Rate-limit attacks, abilities |
| `UntilFail` | `RUNNING` while child succeeds; `SUCCESS` when child fails | Repeat until failure |

```
# Cooldown example: enemy attacks with a 2-second cooldown
Sequence
├── IsPlayerInRange
└── Cooldown (2.0s)
    └── AttackAction

# Limiter example: NPC tries to unlock door 3 times, then gives up
Limiter (max: 3)
└── TryUnlockDoor
```

---

## Patterns & Examples

### Interrupt Pattern (Priority Behavior)

Use `SelectorReactiveComposite` to let a high-priority behavior interrupt a lower-priority one:

```
SelectorReactiveComposite       ← re-evaluates every tick
├── Sequence (dodge)
│   ├── IsIncomingAttack        ← if true, interrupts everything below
│   └── DodgeRoll
└── ContinueAttacking           ← runs only when no incoming attack
```

### Memory Pattern (Remember Last Seen Position)

```gdscript
class_name SpotAndRememberPlayer extends ConditionLeaf

func tick(actor: Node, blackboard: Blackboard) -> int:
    var player = get_tree().get_first_node_in_group("player")
    if player and actor.can_see(player):
        blackboard.set_value("last_seen_position", player.global_position)
        blackboard.set_value("last_seen_time", Time.get_ticks_msec())
        return SUCCESS
    return FAILURE
```

### Cooldown in ActionLeaf (Manual Timer)

```gdscript
class_name AttackWithCooldown extends ActionLeaf

var _cooldown: float = 0.0
var _is_attacking: bool = false

func tick(actor: Node, blackboard: Blackboard) -> int:
    if _is_attacking:
        if actor.animation_finished():
            _is_attacking = false
            _cooldown = 2.0
            return SUCCESS
        return RUNNING

    if _cooldown > 0.0:
        _cooldown -= get_physics_process_delta_time()
        return RUNNING

    actor.play_attack_animation()
    _is_attacking = true
    return RUNNING

func interrupt(actor: Node, blackboard: Blackboard) -> void:
    _is_attacking = false
    _cooldown = 0.0
    actor.stop_attack_animation()
```

### Wait Action

```gdscript
class_name WaitAtPatrolPoint extends ActionLeaf

@export var wait_time: float = 2.0
var _elapsed: float = 0.0

func tick(actor: Node, blackboard: Blackboard) -> int:
    if blackboard.get_value("patrol_point_just_reached", false):
        blackboard.set_value("patrol_point_just_reached", false)
        _elapsed = 0.0

    _elapsed += get_physics_process_delta_time()
    return SUCCESS if _elapsed >= wait_time else RUNNING
```

### Caching Expensive Queries in Blackboard

```gdscript
class_name UpdateNavPath extends ActionLeaf

@export var recalc_interval: float = 0.5
var _since_last_calc: float = 999.0

func tick(actor: Node, blackboard: Blackboard) -> int:
    _since_last_calc += get_physics_process_delta_time()
    if _since_last_calc < recalc_interval:
        return SUCCESS  # Use cached path from blackboard

    var target_pos = blackboard.get_value("player_position", null)
    if not target_pos:
        return FAILURE

    actor.navigation_agent.target_position = target_pos
    blackboard.set_value("path_ready", true)
    _since_last_calc = 0.0
    return SUCCESS
```

---

## Configuration

**Installation:**

1. Download from Godot Asset Library or GitHub (`godot-4.x` branch).
2. Copy `addons/beehave/` to `res://addons/beehave/`.
3. Enable in **Project Settings → Plugins → Beehave**.
4. (Optional) Copy `script_templates/` to the project root for leaf node templates.

**Version compatibility:**

| Godot | Beehave |
|-------|---------|
| 4.0.x | 2.7.x |
| 4.1.x | 2.9.x |
| 4.5+  | 2.10+ |

**BeehaveTree setup:**

```gdscript
# Scene tree:
# NPC (CharacterBody2D)
# └── BeehaveTree         ← add as child; actor defaults to parent (NPC)
#     └── SelectorReactiveComposite
#         ├── ...

# In the NPC script:
@onready var bt: BeehaveTree = $BeehaveTree

func _ready() -> void:
    bt.enabled = true
    # Seed the blackboard before the tree starts:
    bt.blackboard.set_value("home_position", global_position)
```

**process_thread choices:**

- `PHYSICS` — use for CharacterBody2D/3D actors; guarantees physics-safe delta times inside `tick()`.
- `IDLE` — use for non-physics actors (UI, cameras).
- `MANUAL` — call `bt.tick()` yourself; useful for turn-based AI or group-managed ticking.

**tick_rate for performance:** With 50+ NPCs, set `tick_rate = 3` (tick every 3 frames) on trees that don't need frame-perfect reactions. Combine with staggered tree enables to spread CPU cost across frames.

---

## Best Practices

- Keep `ConditionLeaf` nodes single-concern — one condition per class, never return `RUNNING`.
- Use `interrupt()` in every `ActionLeaf` that holds mutable state (timers, flags, in-progress animations). Missing `interrupt()` causes state leaks between tree runs.
- Pass data between nodes via `Blackboard`, not direct node references or signals within the tree.
- Cache node references with `@export` on leaf classes — never call `get_node()` inside `tick()`.
- Use `get_physics_process_delta_time()` inside `tick()` when `process_thread = PHYSICS`; use `get_process_delta_time()` when `IDLE`.
- Prefer `SelectorComposite` / `SequenceComposite` by default; switch to reactive variants only when earlier conditions must be re-evaluated every frame.
- Write `ConditionLeaf` nodes that answer positive questions ("IsHungry" not "IsNotHungry") and negate with `Inverter` in the tree.
- Enable `custom_monitor = true` during development to profile tree performance in Godot's built-in profiler.
- Initialize critical Blackboard keys in `_ready()` before the tree starts to avoid `null` defaults downstream.

---

## Anti-patterns

- **Returning `RUNNING` from `ConditionLeaf`** — conditions are instant checks; returning `RUNNING` causes the composite to wait indefinitely on this node.
- **Multi-condition `ConditionLeaf`** — packing multiple checks into one condition node makes it impossible to reuse individually or negate selectively.
- **No `interrupt()` on stateful `ActionLeaf`** — timers, `_is_attacking` flags, or animation state persist into the next run, producing ghost behavior.
- **Calling `get_node()` inside `tick()`** — fails when the scene tree changes (respawn, level transition); always cache with `@export` or in `before_run()`.
- **Reactive composites everywhere** — re-evaluating all children every tick is expensive; use reactive only where condition priority matters.
- **Pathfinding / raycasting every tick** — recalculate on a `recalc_interval` timer and store the result in the Blackboard instead.
- **Nested composites deeper than ~10 levels** — deep recursion risks stack overflow with many simultaneous agents.
- **Shared `Blackboard` between unrelated agents without scoping** — keys collide; use named scopes (`set_value("key", v, "agent_id")`) or separate `Blackboard` nodes per agent.
- **Not initializing Blackboard keys before tree starts** — `get_value("key", null)` silently returns `null`; downstream casts crash. Seed values in `_ready()`.
