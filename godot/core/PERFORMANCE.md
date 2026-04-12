---
version: 1.0.0
---

# Performance Optimization

> **Scope**: Rules for performance optimization — memory/GC, caching, strings, object pooling, signals, math, physics, UI optimization, process management, mobile specifics.
> **Load when**: performance issues, optimization, hot paths, memory/GC, pooling, process management.

---

## Memory & GC

- Godot uses reference counting (`RefCounted`) + manual management (`Object` / `Node`)
- Prefer `RefCounted` over `Object` for non-node data classes — auto-freed when no references remain
- Use typed arrays `Array[T]` — avoids boxing and improves type safety
- Avoid creating new objects in `_process` / `_physics_process` — reuse pre-allocated variables
- Avoid closures capturing variables in loops — copy to local variable
- Initialize arrays with pre-known size when possible: `array.resize(expected_size)`
- Reuse arrays via `clear()` instead of creating new ones
- Free `Node` and `Object` instances explicitly when done — they are NOT reference-counted

### Value Types vs Reference Types

```gdscript
# ✅ Vector2/Vector3/Rect2/Color are value types — no heap allocation
var direction: Vector2 = Vector2.ZERO

# ❌ Creating new Resource in hot path — heap allocation
func _process(delta: float) -> void:
    var data: ItemData = ItemData.new()  # Bad — allocates every frame

# ✅ Reuse pre-allocated objects
var _cached_data: ItemData

func _ready() -> void:
    _cached_data = ItemData.new()
```

### Packed Arrays for Large Data

```gdscript
# ✅ PackedFloat32Array — contiguous memory, no boxing
var positions: PackedVector2Array = PackedVector2Array()

# ✅ PackedByteArray for raw data buffers
var buffer: PackedByteArray = PackedByteArray()
buffer.resize(1024)

# ❌ Array[float] for large datasets — each element is a Variant
var positions: Array[float] = []
```

---

## Caching

- Cache `get_node()` results in `@onready` — NEVER in `_process`
- Cache `get_viewport()`, `get_tree()`, `get_window()` in variables when accessed frequently
- Early exit (`if not _is_dirty: return`) to avoid unnecessary computations
- Cache `StringName` for frequently compared strings: `const ANIM_RUN: StringName = &"run"`
- Cache input action names: `const ACTION_JUMP: StringName = &"jump"`

### @onready Caching for Scene Nodes

```gdscript
# ✅ Cached once at _ready — zero cost per frame
@onready var _sprite: Sprite2D = $Sprite2D
@onready var _collision: CollisionShape2D = $CollisionShape2D
@onready var _anim_player: AnimationPlayer = $AnimationPlayer

# ❌ get_node() in _process — tree traversal every frame
func _process(delta: float) -> void:
    $Sprite2D.modulate.a = health_ratio  # Bad — traverses tree
```

### Cache Constant Dependencies at Initialization

If an object is constant and does not change over time — cache it once in `_ready()` or `initialize()`. Never retrieve it repeatedly in hot paths:

```gdscript
# ❌ Retrieved on every call — unnecessary overhead
func get_target() -> Node2D:
    return TargetProvider.get_main_target()  # Calls autoload every frame

# ✅ Constant target cached once
var _cached_target: Node2D

func _ready() -> void:
    _cached_target = TargetProvider.get_main_target()

func get_target() -> Node2D:
    return _cached_target
```

---

## Process Management

**Minimize `_process` / `_physics_process` usage** — these are the #1 performance sink:

```gdscript
# ❌ Process running every frame even when idle
func _process(delta: float) -> void:
    _check_for_nearby_enemies()

# ✅ Disable processing when not needed
func _ready() -> void:
    set_process(false)

func activate() -> void:
    set_process(true)

func deactivate() -> void:
    set_process(false)

# ✅ Use timers instead of _process for periodic checks
func _ready() -> void:
    var timer: Timer = Timer.new()
    timer.wait_time = 0.5
    timer.timeout.connect(_check_for_nearby_enemies)
    add_child(timer)
    timer.start()

# ✅ Use signals/events instead of polling
func _ready() -> void:
    health_changed.connect(_on_health_changed)
```

---

## Strings

- `StringName` (`&"name"`) for identifiers, input actions, animation names — hash-based O(1) comparison
- `String` for mutable string operations
- In hot paths, prefer `StringName` comparisons over `String`
- Avoid string concatenation with `+` in `_process` — use `%` formatting or `String.join()`
- Cache frequently used `StringName` values in constants

```gdscript
# ✅ StringName for lookups — fast comparison
const ANIM_IDLE: StringName = &"idle"
const ANIM_RUN: StringName = &"run"

# ✅ String formatting (outside hot paths)
var message: String = "Player %s scored %d points" % [player_name, score]

# ❌ String concatenation in hot paths — allocates intermediate strings
var result: String = part_a + " " + part_b  # multiple allocations
```

---

## Object Pooling

- Pools instead of `instantiate()`/`queue_free()` for frequently created objects
- Pattern: `acquire()` retrieves from pool + `show()` + re-parent, `release()` — `hide()` + remove from scene + return to pool

### Simple Pool Pattern

```gdscript
class_name ObjectPool
extends RefCounted

var _scene: PackedScene
var _pool: Array[Node] = []

func _init(scene: PackedScene, initial_size: int = 0) -> void:
    _scene = scene
    for i in initial_size:
        var instance: Node = _scene.instantiate()
        instance.hide()
        _pool.append(instance)

func acquire() -> Node:
    if _pool.size() > 0:
        var instance: Node = _pool.pop_back()
        instance.show()

        return instance

    return _scene.instantiate()

func release(instance: Node) -> void:
    instance.hide()
    if instance.get_parent():
        instance.get_parent().remove_child(instance)
    _pool.append(instance)
```

### State Reset

- When an object is returned to pool, ALL state must be reset. All timers stopped, signals disconnected from external sources, caches cleared

---

## Signals & Callables

```gdscript
# ✅ Connect once in _ready, disconnect in _exit_tree for external signals
func _ready() -> void:
    EventBus.item_sold.connect(_on_item_sold)

func _exit_tree() -> void:
    EventBus.item_sold.disconnect(_on_item_sold)
```

- Don't connect/disconnect signals in `_process` — do it in `_ready`/`_exit_tree`
- Use `Callable` references for frequently passed callbacks — avoid creating lambdas in loops
- Prefer direct signal connections over `call_group()` / `call_deferred()` when possible
- Use `signal.emit()` (Godot 4) not `emit_signal()` (deprecated form)

---

## Math

- `Vector2.distance_squared_to()` instead of `Vector2.distance_to()` for distance comparisons — avoids `sqrt`
- Precompute inverse values: `value * inv_max` instead of `value / max`
- `is_equal_approx()` / `is_zero_approx()` for float comparison
- `Vector2.ZERO`, `Vector2.ONE`, `Vector3.ZERO`, `Quaternion.IDENTITY` instead of constructing new ones
- Use `lerp()`, `clamp()`, `move_toward()` — engine-optimized built-ins

---

## Collections

### Array vs PackedArray

For large numeric datasets, prefer PackedArrays — contiguous memory, no Variant overhead:

```gdscript
# ✅ PackedFloat32Array — contiguous memory, better cache locality
var weights: PackedFloat32Array = PackedFloat32Array()

# ✅ PackedVector2Array for position data
var path_points: PackedVector2Array = PackedVector2Array()

# Array only when dynamic types or small sizes
var items: Array[ItemData] = []
```

### Dictionary for Lookups

```gdscript
# ❌ O(n) — linear scan
var active_ids: Array[int] = []
if active_ids.has(id):
    pass  # slow

# ✅ O(1) — hash lookup
var active_ids: Dictionary = {}  # int -> bool
if active_ids.has(id):
    pass
```

### Enum as Dictionary Key

```gdscript
# ✅ Enum values are integers in GDScript — no boxing issue
var handlers: Dictionary = {}  # WeaponType -> Callable
handlers[WeaponType.MELEE] = _handle_melee
```

---

## Physics

- Configure Collision Layers and Masks — disable unnecessary interactions
- Use `PhysicsDirectSpaceState2D` / `PhysicsDirectSpaceState3D` for direct queries
- Prefer `intersect_ray()` with specific collision mask over broad queries
- Use `Area2D`/`Area3D` for overlap detection instead of manual distance checks

---

## UI Optimization

### Hiding UI

- Hide via `visible = false` — stops rendering but keeps in tree
- Use `CanvasItem.hide()` / `CanvasItem.show()` for toggle
- Avoid `remove_child()` + `add_child()` for toggling — expensive tree operations

### UI Update Frequency

- Do NOT update UI labels/controls every frame — use signal-driven updates
- Bind to model signals: update widget only when the underlying data changes
- Use `set_process(false)` on UI nodes that don't need per-frame updates

### UI Animations

- Prefer `Tween` (code-driven) for simple UI animations
- `AnimationPlayer` for complex sequences — but don't use for simple property changes
- Avoid `_process`-based UI animation when `Tween` can handle it

```gdscript
# ✅ Tween for simple UI animation — no _process overhead
func fade_in() -> void:
    var tween: Tween = create_tween()
    tween.tween_property(self, "modulate:a", 1.0, 0.3)

# ❌ _process-based animation — runs every frame
func _process(delta: float) -> void:
    modulate.a = move_toward(modulate.a, 1.0, delta * 3.0)
```

---

## GDScript Specifics

### Avoid Dynamic Lookups in Hot Paths

```gdscript
# ❌ String-based property access — slow reflection
func _process(delta: float) -> void:
    var value = get(property_name)  # Dynamic lookup

# ✅ Direct typed access
func _process(delta: float) -> void:
    var value: float = _cached_property
```

### Use Built-in Methods Over Manual Loops

```gdscript
# ❌ Manual loop for filtering
var result: Array[Item] = []
for item in items:
    if item.is_active:
        result.append(item)

# ✅ Use filter() — engine-optimized (but only outside hot paths)
var result: Array = items.filter(func(item: Item) -> bool: return item.is_active)
```

Note: `Array.filter()`, `Array.map()`, `Array.reduce()` create closures — acceptable outside hot paths but avoid in `_process`.

---

## Mobile Specifics

- Limit UI update frequency (not every frame)
- Use `OS.low_processor_usage_mode = true` and `OS.low_processor_usage_mode_msec` for battery-friendly idle
- Lower `Engine.physics_ticks_per_second` and `Engine.max_fps` when backgrounded
- Use compressed textures (ETC2 for Android, PVRTC/ASTC for iOS)
- Minimize node count — flatten scene tree where possible
- Use `ResourceLoader.load_threaded_request()` for async loading
- Minimize `queue_free()` / `instantiate()` — use pooling
