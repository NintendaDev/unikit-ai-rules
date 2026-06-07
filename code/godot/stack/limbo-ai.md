---
version: 1.0.0
---

# LimboAI

> **Scope**: LimboAI behavior tree and hierarchical state machine authoring — custom BTTask/BTAction/BTCondition/BTDecorator implementation, Blackboard variable management, BTPlayer setup, LimboHSM/LimboState/BTState patterns, and event-driven AI composition for Godot 4.
> **Load when**: authoring AI behavior trees, creating custom BT tasks or conditions, setting up hierarchical state machines, wiring BTState with HSM events, managing Blackboard data between tasks, configuring BTPlayer, debugging behavior tree execution, designing enemy or NPC AI.

---

## Core Concepts

LimboAI provides two complementary systems that work together:

- **Behavior Trees (BT)** — hierarchical task execution. Tasks return `SUCCESS`, `FAILURE`, or `RUNNING` each tick.
- **Hierarchical State Machines (HSM)** — event-driven state flow. States transition via named events (`StringName`), decoupling transition logic from state logic.
- **Blackboard** — shared key-value store passed to all tasks and states within an agent. Each agent gets its own `Blackboard` instance; the BehaviorTree resource is shared.

### Key Node Types

| Node | Role |
|------|------|
| `BTPlayer` | Executes a `BehaviorTree` resource each frame |
| `LimboHSM` | Manages `LimboState` children and event-driven transitions |
| `LimboState` | A single state with `_enter`, `_update`, `_exit` lifecycle |
| `BTState` | A `LimboState` that executes a BehaviorTree; bridges BT and HSM |
| `BehaviorTreeView` | In-game debug visualization of BT execution |

### Task Class Hierarchy

| Base Class | Purpose |
|------------|---------|
| `BTAction` | Leaf task performing a game action |
| `BTCondition` | Leaf task checking a condition (usually instant) |
| `BTComposite` | Parent task controlling children (Sequence, Selector, Parallel) |
| `BTDecorator` | Single-child wrapper modifying behavior (Invert, Repeat, Cooldown) |

---

## API / Interface

### BTTask Lifecycle

```gdscript
@tool
extends BTAction  # or BTCondition, BTDecorator, BTComposite

func _generate_name() -> String:
    return "MyTask"  # Displayed in editor (requires @tool)

func _setup() -> void:
    pass  # Called once when tree initializes; cache node refs here

func _enter() -> void:
    pass  # Called when this task starts executing (before first _tick)

func _tick(delta: float) -> Status:
    return SUCCESS  # Return SUCCESS, FAILURE, or RUNNING

func _exit() -> void:
    pass  # Called when task finishes OR is interrupted; always clean up here

func _get_configuration_warnings() -> PackedStringArray:
    return []  # Editor validation warnings
```

**Execution order:** `_setup` (once at init) → `_enter` (on start) → `_tick` (each frame) → `_exit` (on finish or abort).

**Status enum** (from `BT`):
- `SUCCESS` — task completed successfully
- `FAILURE` — task failed
- `RUNNING` — task is ongoing, will be ticked next frame
- `FRESH` — internal reset state; do not return from `_tick`

Only `_tick` is required; all other methods are optional.

### BBParam — Typed Blackboard Parameters

Declare task parameters as `BBParam` subtypes to allow direct values or Blackboard variable bindings, configurable from the editor.

```gdscript
@tool
extends BTAction

@export var speed: BBFloat          # float value or BB variable reference
@export var target_var: BBNode      # Node reference or BB variable
@export var tag: BBString = BBString.new()

func _tick(delta: float) -> Status:
    var current_speed: float = speed.get_value(scene_root, blackboard, 100.0)
    var target = target_var.get_value(scene_root, blackboard)
    var label: String = tag.get_value(scene_root, blackboard, "enemy")
    ...
```

Common `BBParam` types: `BBFloat`, `BBInt`, `BBString`, `BBBool`, `BBVector2`, `BBVector3`, `BBNode`, `BBColor`, `BBStringName`.

Use `@export var my_var: StringName = &"var_name"` for Blackboard variable name references when not using BBParam.

### Blackboard API

```gdscript
# Inside any BTTask — 'blackboard' is provided automatically
blackboard.set_var(&"speed", 200.0)              # Set variable (creates if absent)
var speed: float = blackboard.get_var(&"speed", 100.0)  # Get with default
blackboard.has_var(&"target")                     # Check existence
blackboard.erase_var(&"target")                   # Remove variable

# Access root (shared) scope across all agents in a group
var shared = blackboard.top()
shared.set_var(&"alert_level", 2)
var alert = blackboard.top().get_var(&"alert_level", 0)

# Link a local variable to another blackboard's variable
blackboard.link_var(&"ally_health", ally_blackboard, &"health")

# Bind to a node property — auto-syncs
blackboard.bind_var_to_property(&"velocity", character_body, &"velocity")
```

Do NOT type-annotate variables retrieved for potentially freed nodes:
```gdscript
# Correct — no type annotation prevents errors on freed instances
var obj = blackboard.get_var(&"target_node")
if is_instance_valid(obj):
    obj.do_something()
```

### BTPlayer API

```gdscript
@onready var bt_player: BTPlayer = $BTPlayer

func _ready() -> void:
    bt_player.set_active(true)                                   # Start execution
    bt_player.blackboard.set_var(&"target", enemy_node)          # Seed blackboard
    bt_player.set_behavior_tree(load("res://ai/combat.tres"))     # Swap tree at runtime

# Listen for tick completion
bt_player.updated.connect(func(status: int):
    if status == BTTask.SUCCESS:
        print("Tree completed with success"))
```

`BTPlayer.update_mode` options: `IDLE` (every `_process`), `PHYSICS` (every `_physics_process`), `MANUAL` (call `bt_player.update(delta)` yourself).

### LimboHSM / LimboState API

```gdscript
# State lifecycle (override in LimboState subclass)
func _setup() -> void: pass   # Called once at initialize()
func _enter() -> void: pass   # Called when state becomes active
func _update(delta: float) -> void: pass  # Called each frame while active
func _exit() -> void: pass    # Called when state deactivates

# Dispatch an event (can be called from state or from outside)
dispatch(&"move_started")     # Inside a state
hsm.dispatch(&"move_started") # From the owning node
```

**Setup pattern:**

```gdscript
func _init_state_machine() -> void:
    # Both states must be immediate children of hsm
    hsm.add_transition(idle_state, move_state, &"move_started")
    hsm.add_transition(move_state, idle_state, &"move_stopped")
    # Wildcard: any state → attack when event fires (with guard)
    hsm.add_transition(hsm.ANYSTATE, attack_state, &"attack_input",
        func(): return can_attack())

    hsm.initial_state = idle_state
    hsm.initialize(self)       # Must be called before set_active
    hsm.set_active(true)
```

`initialize(agent: Node, parent_scope: Blackboard = null)` — call **before** `set_active`. Pass a shared `Blackboard` as `parent_scope` for group data.

---

## Patterns & Examples

### Minimal Custom Action

```gdscript
@tool
extends BTAction

@export var target_var: StringName = &"target"

func _tick(delta: float) -> Status:
    var target = blackboard.get_var(target_var)
    if not is_instance_valid(target):
        return FAILURE
    agent.look_at(target.global_position)
    return SUCCESS
```

### Action with Resource Cleanup

```gdscript
@tool
extends BTAction

var _tween: Tween

func _enter() -> void:
    _tween = agent.create_tween()
    _tween.tween_property(agent, "modulate:a", 0.0, 0.5)

func _tick(delta: float) -> Status:
    return RUNNING if _tween.is_running() else SUCCESS

func _exit() -> void:
    if is_instance_valid(_tween):
        _tween.kill()
    _tween = null
```

### Inline HSM with Delegation (rapid prototyping)

```gdscript
func _ready() -> void:
    var idle = LimboState.new().named("Idle")
    idle.call_on_enter(func(): $AnimPlayer.play("idle"))
    idle.call_on_update(_idle_update)

    var move = LimboState.new().named("Move")
    move.call_on_enter(func(): $AnimPlayer.play("walk"))
    move.call_on_update(_move_update)

    hsm.add_child(idle)
    hsm.add_child(move)
    hsm.add_transition(idle, move, &"move_started")
    hsm.add_transition(move, idle, &"move_stopped")
    hsm.initial_state = idle
    hsm.initialize(self)
    hsm.set_active(true)
```

### BTState — Combining BT with HSM

```gdscript
# patrol_state and combat_state are BTState nodes
patrol_state.behavior_tree = load("res://ai/patrol.tres")
patrol_state.success_event = &"patrol_done"
patrol_state.failure_event = &"patrol_failed"

combat_state.behavior_tree = load("res://ai/combat.tres")
combat_state.success_event = &"enemy_defeated"
combat_state.failure_event = &"retreat"

hsm.add_transition(patrol_state, combat_state, &"enemy_spotted")
hsm.add_transition(combat_state, patrol_state, &"enemy_defeated")
hsm.add_transition(combat_state, flee_state, &"retreat")
hsm.initialize(self)
hsm.set_active(true)
```

### Shared Group Blackboard

```gdscript
# Group manager node
var shared_board: Blackboard = BlackboardPlan.new().create_blackboard()
shared_board.set_var(&"group_target", null)

# In each agent's setup — make shared_board the parent scope
agent.get_node("BTPlayer").blackboard.set_parent(shared_board)
# or pass as parent_scope to hsm.initialize()
hsm.initialize(agent, shared_board)
```

### BTSubtree for Reusability

Add a `BTSubtree` node in the behavior tree editor and assign a `.tres` BehaviorTree resource to compose modular sub-behaviors. Shared resources are safe — each agent has its own `BTInstance` state.

---

## Configuration

**Installation (GDExtension — no engine rebuild needed):**
Download from the Godot Asset Library or GitHub releases, place the addon folder under `addons/`, enable it in Project Settings → Plugins.

**BTPlayer properties:**
- `behavior_tree` — assigned `BehaviorTree` resource (`.tres`)
- `blackboard_plan` — `BlackboardPlan` resource defining default variables
- `update_mode` — `IDLE`, `PHYSICS`, or `MANUAL`
- `active` — toggles execution

**BlackboardPlan in editor:** Define variables with name, type, and default value. Assign to `BTPlayer.blackboard_plan`; the player creates a fresh `Blackboard` per instance automatically.

**Visual Debugger:** Available in the Godot editor during Play mode; select the agent node to inspect live BT execution state.

---

## Best Practices

- Always annotate custom tasks with `@tool` so `_generate_name()` and editor warnings work at edit-time.
- Use `BBParam` types for task parameters instead of plain `@export`; this lets designers bind parameters to Blackboard variables without code changes.
- Declare Blackboard variable names as `@export var xxx_var: StringName = &"default_name"` — keeps variable names configurable per-task.
- Cache node and resource references in `_setup()`, not `_enter()`, since `_setup()` runs only once per `BTPlayer` lifetime.
- Acquire dynamic state (positions, targets) in `_enter()` so the task always starts with fresh data.
- Always clean up in `_exit()` — it fires on both natural completion and external abortion. Tweens, timers, and signals acquired in `_enter()` must be released here.
- Keep `BTCondition` tasks side-effect-free — they should only read state, never mutate it.
- Use `BTSubtree` to split complex trees into composable `.tres` files; the resource is shared but each agent has isolated `BTInstance` state.
- In HSM, define events as `const` `StringName` literals on each `LimboState` subclass to avoid typos and enable autocomplete.
- Always call `hsm.initialize(self)` before `hsm.set_active(true)`.
- Pass a shared `Blackboard` as `parent_scope` to `hsm.initialize()` or `bt_player.blackboard.set_parent()` for group-level coordination.

---

## Anti-patterns

- **Missing `@tool` annotation** — `_generate_name()` won't run, tasks appear unnamed in the editor; configuration warnings won't show.
- **Mutating state in `BTCondition._tick()`** — conditions must be pure reads; side effects in conditions make trees unpredictable.
- **Ignoring `_exit()` cleanup** — failing to release tweens, signals, or timers causes leaks or double-execution on re-entry.
- **Type-annotating Blackboard node variables** — `var obj: Node = blackboard.get_var(...)` crashes when the node has been freed; always use untyped `var obj =` and check `is_instance_valid(obj)`.
- **Sharing BTInstance across agents** — each agent must have its own `BTPlayer` (or create its own `BTInstance`); sharing instances corrupts per-agent state.
- **Calling `set_active(true)` before `initialize()`** — state machine enters an uninitialized state; always `initialize` first.
- **Missing `success_event` / `failure_event` on BTState** — BT completion silently dispatches nothing; the HSM never transitions. Always configure both events.
- **Using `hsm.ANYSTATE` for frequent conditions** — wildcard transitions fire against all states every tick; prefer explicit transitions or inline guards for performance-sensitive AI.
- **Hardcoding Blackboard variable names as strings** — use `StringName` literals (`&"name"`) or exported `StringName` properties to avoid runtime typos and enable refactoring.
