---
version: 1.0.0
---

# LimboAI

> **Scope**: Behavior tree and hierarchical state machine authoring with LimboAI — custom task creation, BTPlayer setup, Blackboard variable management, LimboHSM state transitions, BTState integration, and C# usage patterns in Godot 4 .NET projects.
> **Load when**: authoring AI behaviors with LimboAI, creating custom BTAction or BTCondition tasks, setting up BTPlayer, managing Blackboard variables or BBParam types, wiring LimboHSM state transitions, integrating BTState into a state machine, debugging behavior tree execution, combining behavior trees with state machines.

---

## Core Concepts

LimboAI provides two systems that can be used independently or together:

- **Behavior Trees (BT)** — hierarchical task graphs executed each frame via `_tick()`. Each task returns `SUCCESS`, `FAILURE`, or `RUNNING`.
- **Hierarchical State Machines (HSM)** — event-driven state machines with `LimboHSM` + `LimboState` nodes. States can host behavior trees via `BTState`.

**Four task types:**

| Type | Base Class | Role |
|------|-----------|------|
| Action | `BTAction` | Performs work (leaf) |
| Condition | `BTCondition` | Boolean check (leaf) |
| Composite | `BTComposite` | Controls child execution flow |
| Decorator | `BTDecorator` | Wraps and modifies one child |

**Composite behavior:**

- `BTSequence` — runs children left-to-right until one FAILS (AND logic)
- `BTSelector` — runs children left-to-right until one SUCCEEDS (OR logic)
- `BTParallel` — runs all children simultaneously

**Status values:** `Status.Success`, `Status.Failure`, `Status.Running` (C#) / `SUCCESS`, `FAILURE`, `RUNNING` (GDScript)

---

## BTPlayer Setup

`BTPlayer` is the node that executes a `BehaviorTree` resource at runtime.

```gdscript
@onready var bt_player: BTPlayer = $BTPlayer

func _ready() -> void:
    bt_player.set_active(true)

    # Set initial blackboard data before tree starts
    bt_player.blackboard.set_var(&"target", enemy_node)

    # Listen for completion
    bt_player.updated.connect(_on_bt_updated)

func _on_bt_updated(status: int) -> void:
    if status == BTTask.SUCCESS:
        pass  # tree completed
```

Key properties:
- `behavior_tree` — assign a `.tres` BehaviorTree resource
- `blackboard` — direct Blackboard access
- `prefetch_nodepath_vars` — set `true` to auto-convert NodePath blackboard vars to node references on ready
- `set_active(bool)` — start or pause execution
- `set_behavior_tree(bt)` — swap BT at runtime

---

## Custom Task Authoring

### Lifecycle methods

| Method | When called | Required? |
|--------|-------------|-----------|
| `_generate_name()` | Editor display label | No (needs `@tool`) |
| `_setup()` | Once, on tree initialization | No |
| `_enter()` | Each time task starts executing | No |
| `_tick(delta)` | Every frame while task is active | **Yes** |
| `_exit()` | When task ends or is interrupted | No |
| `_get_configuration_warnings()` | Editor validation | No |

**Rule:** Put expensive one-time calculations in `_setup()`, per-activation setup in `_enter()`. Never do heavy work in `_tick()`.

### GDScript example (Action)

```gdscript
@tool
extends BTAction

@export var target_var: StringName = &"target_position"
@export var speed: BBFloat
@export var tolerance: float = 10.0

func _generate_name() -> String:
    return "MoveToTarget [speed=%s]" % [speed]

func _enter() -> void:
    # Cache position when task starts
    pass

func _tick(delta: float) -> Status:
    var target_pos: Vector2 = blackboard.get_var(target_var, agent.global_position)
    var current_speed: float = speed.get_value(scene_root, blackboard, 100.0)
    var dist: float = agent.global_position.distance_to(target_pos)

    if dist <= tolerance:
        agent.velocity = Vector2.ZERO
        return SUCCESS

    var dir: Vector2 = (target_pos - agent.global_position).normalized()
    agent.velocity = dir * current_speed
    agent.move_and_slide()
    return RUNNING

func _exit() -> void:
    agent.velocity = Vector2.ZERO
```

### GDScript example (Condition)

```gdscript
@tool
extends BTCondition

@export var target_var: StringName = &"target"
@export var distance_max: float = 300.0

var _max_dist_sq: float

func _setup() -> void:
    _max_dist_sq = distance_max * distance_max

func _tick(_delta: float) -> Status:
    var target: Node2D = blackboard.get_var(target_var, null)
    if not is_instance_valid(target):
        return FAILURE
    var dist_sq: float = agent.global_position.distance_squared_to(target.global_position)
    return SUCCESS if dist_sq <= _max_dist_sq else FAILURE
```

### C# template

```csharp
using Godot;

[Tool]
public partial class MoveToTarget : BTAction
{
    [Export] public StringName TargetVar { get; set; } = "target_position";
    [Export] public float Tolerance { get; set; } = 10.0f;

    public override string _GenerateName() => "MoveToTarget";

    public override void _Setup() { }

    public override void _Enter() { }

    public override Status _Tick(double delta)
    {
        var targetPos = (Vector2)Blackboard.GetVar(TargetVar, Agent.GlobalPosition);
        float dist = Agent.GlobalPosition.DistanceTo(targetPos);

        if (dist <= Tolerance)
            return Status.Success;

        var dir = (targetPos - Agent.GlobalPosition).Normalized();
        // move logic here
        return Status.Running;
    }

    public override void _Exit() { }
}
```

### Built-in task properties available in every task

- `agent` — the scene node owning the BTPlayer (cast as needed)
- `scene_root` — root of the agent's scene tree; use for `get_node()` calls
- `blackboard` — the Blackboard for this tree instance

### Task file location

Place custom tasks in `res://ai/tasks/` (default, configurable in Project Settings → LimboAI). Subdirectories become task categories in the editor picker.

---

## Blackboard

### API reference

| Method | Description |
|--------|-------------|
| `set_var(name, value)` | Store a value (creates if missing) |
| `get_var(name, default, complain=true)` | Retrieve with fallback |
| `has_var(name)` | Check existence |
| `erase_var(name)` | Remove variable |
| `link_var(name, target_bb, target_name)` | Bidirectional link to another Blackboard |
| `bind_var_to_property(name, obj, prop)` | Bind variable to an object property |
| `top()` | Access the root scope in the Blackboard chain |
| `set_parent(bb)` | Attach a parent scope |
| `get_vars_as_dict()` | Dump all variables as Dictionary |
| `print_state()` | Debug print current state |

### Accessing variables safely

```gdscript
# Correct: no type annotation for object variables in GDScript
var obj = blackboard.get_var(object_var)
if is_instance_valid(obj):
    obj.do_something()

# Wrong: causes errors when the instance is freed
var obj: Node = blackboard.get_var(object_var)  # DON'T
```

**Rule:** Never type-annotate variables that store object references in GDScript — freed instances cause type-check errors. Use `is_instance_valid()` instead.

### Naming convention

Suffix blackboard variable name properties with `_var` to enable inspector hints that warn when the variable isn't declared in the BlackboardPlan:

```gdscript
@export var target_var: StringName = &"target"       # good
@export var target_name: StringName = &"target"      # no hint
```

### BBParam — typed bindable parameters

Use `BBFloat`, `BBInt`, `BBBool`, `BBString`, `BBNode`, `BBVector2`, etc. to expose parameters that can be either a direct value or a Blackboard variable reference:

```gdscript
@export var damage: BBFloat
@export var target: BBNode

func _tick(delta: float) -> Status:
    var dmg: float = damage.get_value(scene_root, blackboard, 10.0)
    var tgt = target.get_value(scene_root, blackboard)
    if not is_instance_valid(tgt):
        return FAILURE
    tgt.take_damage(dmg)
    return SUCCESS
```

### Accessing scene nodes from tasks (three approaches)

1. **BBNode (recommended for parameters)** — inspector-configurable node reference:
   ```gdscript
   @export var cast_param: BBNode
   var node: ShapeCast3D = cast_param.get_value(scene_root, blackboard)
   ```

2. **BlackboardPlan + prefetch (recommended for shared nodes)** — store as NodePath in the plan with `prefetch_nodepath_vars = true` on BTPlayer:
   ```gdscript
   @export var shape_var: StringName = &"shape_cast"
   var shape_cast: ShapeCast3D = blackboard.get_var(shape_var)
   ```

3. **NodePath property** — simple but bypasses Blackboard:
   ```gdscript
   @export var cast_path: NodePath
   var node: ShapeCast3D = scene_root.get_node(cast_path)
   ```

### Shared scope between agents

Use `blackboard.top()` to access the root shared scope, or set a parent Blackboard on BTPlayer instances:

```gdscript
# In a group manager node
var shared_scope := BlackboardPlan.new().create_blackboard()
for child in get_children():
    var bt_player: BTPlayer = child.find_child("BTPlayer")
    if is_instance_valid(bt_player):
        bt_player.blackboard.set_parent(shared_scope)
```

**Rule:** Write to `top()` only for intentional group-shared data. Never write to a parent scope from inside a task by default.

### Blackboard scope creation

New scopes are created automatically inside: `BTNewScope`, `BTSubtree`, `LimboState` with a non-empty plan, `LimboHSM`, and `BTState` children.

---

## Hierarchical State Machine (LimboHSM)

### Setup pattern

```gdscript
extends CharacterBody2D

@onready var hsm: LimboHSM = $LimboHSM
@onready var idle_state: LimboState = $LimboHSM/IdleState
@onready var move_state: LimboState = $LimboHSM/MoveState

func _ready() -> void:
    _init_state_machine()

func _init_state_machine() -> void:
    # Add transitions (from, to, event)
    hsm.add_transition(idle_state, move_state, &"movement_started")
    hsm.add_transition(move_state, idle_state, &"movement_ended")

    # From ANY state
    hsm.add_transition(hsm.ANYSTATE, idle_state, &"forced_idle")

    # With guard condition (callable returning bool)
    hsm.add_transition(idle_state, move_state, &"attack", func(): return has_target())

    hsm.initial_state = idle_state
    hsm.initialize(self)   # pass the agent (owner)
    hsm.set_active(true)
```

### LimboState lifecycle methods

```gdscript
extends LimboState

func _setup() -> void:
    # one-time initialization

func _enter() -> void:
    # state became active

func _update(delta: float) -> void:
    # called each frame while active

func _exit() -> void:
    # state is leaving
```

### Dispatching events

```gdscript
# From within a state or anywhere in the hierarchy:
dispatch(&"movement_started")

# From outside (on HSM directly):
hsm.dispatch(&"movement_started")
```

Event propagation goes leaf → root. Add event handlers in `_setup()` to intercept and consume:

```gdscript
func _setup() -> void:
    add_event_handler(&"movement_started", _on_movement_started)

func _on_movement_started(cargo = null) -> bool:
    # return true to consume and stop propagation
    return true
```

### Prototyping: single-file setup with chained methods

```gdscript
func _init_state_machine() -> void:
    var hsm := LimboHSM.new()
    add_child(hsm)

    var idle := LimboState.new().named("Idle") \
        .call_on_enter(func(): $AnimationPlayer.play("idle")) \
        .call_on_update(_idle_update)

    var move := LimboState.new().named("Move") \
        .call_on_enter(func(): $AnimationPlayer.play("walk")) \
        .call_on_update(_move_update)

    hsm.add_child(idle)
    hsm.add_child(move)
    hsm.add_transition(idle, move, &"movement_started")
    hsm.add_transition(move, idle, &"movement_ended")
    hsm.initialize(self)
    hsm.set_active(true)
```

---

## BTState — Behavior Tree as a State

`BTState` is a `LimboState` that runs a `BehaviorTree` while active. It automatically dispatches events based on BT result:

```gdscript
var patrol_state := BTState.new()
patrol_state.name = "Patrol"
patrol_state.behavior_tree = load("res://ai/patrol.tres")
patrol_state.success_event = &"patrol_complete"
patrol_state.failure_event = &"patrol_failed"

hsm.add_child(patrol_state)
hsm.add_transition(patrol_state, combat_state, &"enemy_spotted")
hsm.add_transition(patrol_state, idle_state, &"patrol_complete")

hsm.initial_state = patrol_state
hsm.initialize(self)
hsm.set_active(true)
```

**Use BTState when:** a state's logic is complex enough to benefit from a full behavior tree rather than a script. Transitions are driven by BT completion status mapped to event names.

---

## Blackboard Mapping between HSM and BTState

Variables must exist in both plans before mapping. Use the Inspector to create mappings, or link programmatically at runtime:

```gdscript
var hsm_bb := hsm.get_blackboard()
var bt_bb := bt_state.get_blackboard()
bt_bb.link_var(&"target_pos", hsm_bb, &"target_pos")
```

**Rule:** Prefer Inspector-based Mapping for clarity. Reserve `link_var()` for runtime-constructed hierarchies.

---

## BTSubtree — Reusable Sub-trees

Use `BTSubtree` to run a separate `.tres` file as a nested behavior tree. Creates its own Blackboard scope. Promotes organization and reuse for shared behaviors across multiple agents.

---

## Installation for C# (.NET)

LimboAI C# support requires the **module version** (custom engine build), not the GDExtension version:

1. Download a precompiled LimboAI module build from GitHub releases.
2. Locate `GodotSharp/Tools/nupkgs/` inside the LimboAI build folder.
3. Register the local NuGet source:
   ```bash
   dotnet nuget add source /path/to/limboai/nupkgs --name LimboNugetSource
   ```
4. The C# project can now reference LimboAI classes.

**GDExtension + C#:** not confirmed working. Use module builds for C# projects.

---

## Visual Debugger

- Available in the LimboAI panel during Play Mode.
- Click any task to inspect its Blackboard variables grouped by scope.
- Supports live editing for debugging.
- Use the debugger first when diagnosing unexpected FAILURE cascades.

---

## Anti-patterns

- **Heavy work in `_tick()`** — move to `_setup()` (one-time) or `_enter()` (per-activation).
- **Type-annotating Blackboard object variables in GDScript** — causes errors when instances are freed; use `is_instance_valid()` without a type hint.
- **Writing to parent Blackboard scope from tasks** — use `top()` only when intentionally sharing data across a group.
- **Using GDExtension version with C#** — use module version instead; GDExtension C# is not confirmed.
- **Hardcoding event strings inline** — define event names as constants or use `EVENT_FINISHED` where available.
- **Forgetting `@tool` on custom tasks** — without it, `_generate_name()` doesn't run in the editor and the task shows a generic label.
- **Calling `hsm.initialize()` after `set_active(true)`** — always initialize before activating.
- **Not calling `hsm.initialize(self)` at all** — the `agent` reference won't be set and tasks will have a null `agent`.
