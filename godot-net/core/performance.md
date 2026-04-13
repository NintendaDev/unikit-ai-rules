---
version: 1.0.0
---

# Performance Optimization

> **Scope**: Rules for performance optimization — memory/GC, caching, strings, object pooling, delegates, math, physics, UI optimization, process management, mobile specifics.
> **Load when**: performance issues, optimization, hot paths, memory/GC, pooling, process management.

---

## Memory & GC

- Godot .NET uses the .NET garbage collector — minimize allocations in `_Process` / `_PhysicsProcess`
- Reuse variables and collections in hot paths instead of creating new ones
- Avoid boxing/unboxing — strict typing instead of `Dictionary<string, object>`
- Avoid closures capturing variables in loops — copy to local variable
- Initialize collections with capacity: `new List<T>(expectedSize)`
- Reuse collections via `Clear()` instead of `new`
- `readonly struct` for simple immutable data (value type on stack)
- `struct` instead of `class` for simple data models without inheritance
- `stackalloc` and `Span<T>` for temporary buffers instead of `new T[]`
- Avoid `params T[]` in hot paths — creates array on each call. Use overloads
- Godot `RefCounted` subclasses are GC-friendly — prefer plain C# classes for non-engine data

### `readonly struct` and Defensive Copies

Declare struct as `readonly` — otherwise the compiler generates a defensive copy on every method call through an interface or readonly field:

```csharp
// ❌ Defensive copy on every GetValue() call — _data is readonly field but struct is not readonly
private readonly MyStruct _data;
_data.GetValue(); // compiler creates a copy of the struct

// ✅ readonly struct — no defensive copy
public readonly struct MyStruct
{
    public int GetValue() => _value;
}
```

### `in` Parameters for Large Structs

Without `in`, every method call copies the entire struct. Critical for `Vector3`, `Transform3D`, and custom game structs:

```csharp
// ❌ Copies bytes on every call
void Process(HitData data) { }

// ✅ Pass by readonly reference — no copy
void Process(in HitData data) { }
```

### `Span<T>` and `stackalloc` Usage Patterns

```csharp
// ✅ Temporary buffer on stack — no GC allocation
private void ProcessHits(int count)
{
    Span<int> indices = stackalloc int[count];
    for (int i = 0; i < count; i++)
        indices[i] = i;
}

// ❌ Do NOT use stackalloc for large buffers (>1KB) — risk of stack overflow
// ❌ Span<T> cannot be stored as a class field — local variable or parameter only
```

### Bit Masks Instead of Bool Arrays

```csharp
// ❌ 8 bytes per bool (with padding) — scattered memory
private bool _isGrounded, _isAttacking, _isDead, _isStunned;

// ✅ All states in one int — 4 bytes, fast bitwise operations
[Flags]
private enum PlayerState { None = 0, Grounded = 1, Attacking = 2, Dead = 4, Stunned = 8 }
private PlayerState _state;

// Set:   _state |= PlayerState.Grounded;
// Clear: _state &= ~PlayerState.Grounded;
// Check: (_state & PlayerState.Grounded) != 0
```

---

## Caching

- Cache `GetNode<T>()` results in `_Ready()` — NEVER in `_Process`
- Cache `GetViewport()`, `GetTree()`, `GetWindow()` in fields when accessed frequently
- Early exit (`if (!_isDirty) return;`) to avoid unnecessary computations
- Cache `StringName` for frequently compared strings: `private static readonly StringName AnimRun = "Run";`
- Cache input action names: `private static readonly StringName ActionJump = "jump";`

### Node Reference Caching

```csharp
// ✅ Cached once at _Ready — zero cost per frame
private Sprite2D _sprite;
private CollisionShape2D _collision;
private AnimationPlayer _animPlayer;

public override void _Ready()
{
    _sprite = GetNode<Sprite2D>("Sprite2D");
    _collision = GetNode<CollisionShape2D>("CollisionShape2D");
    _animPlayer = GetNode<AnimationPlayer>("AnimationPlayer");
}

// ❌ GetNode in _Process — tree traversal every frame
public override void _Process(double delta)
{
    GetNode<Sprite2D>("Sprite2D").Modulate = new Color(1, 1, 1, healthRatio); // Bad
}
```

### Cache Constant Dependencies at Initialization

If an object is constant and does not change over time — cache it once in `_Ready()` or initialization method. Never retrieve it repeatedly in hot paths:

```csharp
// ❌ Retrieved on every call — unnecessary overhead
public sealed class EnemyTargetSelector
{
    private readonly ITargetProvider _targetProvider;

    public Node2D GetTarget()
    {
        return _targetProvider.GetMainTarget(); // called every frame
    }
}

// ✅ Constant target cached once at initialization
public sealed class EnemyTargetSelector
{
    private readonly ITargetProvider _targetProvider;
    private Node2D _targetNode;

    public EnemyTargetSelector(ITargetProvider targetProvider)
    {
        _targetProvider = targetProvider;
    }

    public void Initialize()
    {
        _targetNode = _targetProvider.GetMainTarget();
    }

    public Node2D GetTarget() => _targetNode;
}
```

This applies to: resolved services, config values, node references, pre-calculated constants — anything that is set once and never changes at runtime.

---

## LINQ in Hot Paths

NEVER use `System.Linq` in hot paths. Use explicit `for` loops for zero-allocation:

```csharp
// ❌ LINQ in _Process — allocates enumerator + delegate every frame
var active = items.Where(x => x.IsActive).ToList();

// ✅ Explicit for — always preferable in hot paths
for (int i = 0; i < items.Count; i++)
{
    if (items[i].IsActive)
        Process(items[i]);
}
```

---

## Process Management

**Minimize `_Process` / `_PhysicsProcess` usage** — these are the #1 performance sink:

```csharp
// ❌ Process running every frame even when idle
public override void _Process(double delta)
{
    CheckForNearbyEnemies();
}

// ✅ Disable processing when not needed
public override void _Ready()
{
    SetProcess(false);
}

public void Activate()
{
    SetProcess(true);
}

public void Deactivate()
{
    SetProcess(false);
}

// ✅ Use Timer node instead of _Process for periodic checks
public override void _Ready()
{
    Timer timer = new Timer();
    timer.WaitTime = 0.5;
    timer.Timeout += CheckForNearbyEnemies;
    AddChild(timer);
    timer.Start();
}

// ✅ Use signals instead of polling
public override void _Ready()
{
    _healthComponent.OnHealthChanged += HandleHealthChanged;
}
```

---

## Strings

- `StringName` for identifiers, input actions, animation names — hash-based O(1) comparison
- `string` for mutable string operations and general text
- In hot paths, prefer `StringName` comparisons over `string`
- `StringBuilder` for concatenation in hot paths
- Avoid `string.Format` and `+` in `_Process` — use `StringBuilder.Append()`
- `StringComparison.Ordinal` for string comparison
- Cache frequently used strings in `static readonly` fields

```csharp
// ✅ StringName for lookups — fast comparison
private static readonly StringName AnimIdle = "idle";
private static readonly StringName AnimRun = "run";

// ✅ String interpolation only outside hot paths
string message = $"Player {playerName} scored {score} points";

// ❌ String concatenation in hot paths — allocates intermediate strings
string result = partA + " " + partB; // multiple allocations
```

---

## Object Pooling

- Pools instead of `Instantiate<T>()` / `QueueFree()` for frequently created objects
- Pattern: `Acquire()` retrieves from pool + `Show()` + re-parent, `Release()` — `Hide()` + remove from scene + return to pool

### Simple Pool Pattern

```csharp
public sealed class NodePool<T> where T : Node
{
    private readonly PackedScene _scene;
    private readonly Stack<T> _pool;

    public NodePool(PackedScene scene, int initialSize = 0)
    {
        _scene = scene;
        _pool = new Stack<T>(initialSize);

        for (int i = 0; i < initialSize; i++)
        {
            T instance = _scene.Instantiate<T>();
            instance.Hide();
            _pool.Push(instance);
        }
    }

    public T Acquire()
    {
        if (_pool.Count > 0)
        {
            T instance = _pool.Pop();
            instance.Show();

            return instance;
        }

        return _scene.Instantiate<T>();
    }

    public void Release(T instance)
    {
        instance.Hide();
        instance.GetParent()?.RemoveChild(instance);
        _pool.Push(instance);
    }
}
```

### State Reset

- When an object is returned to pool, ALL state must be reset. All timers stopped, signals disconnected from external sources, caches cleared

### Component Validation in Pool Code

- When `GetNodeOrNull<T>()` is used in generic/pool code where the node type is not guaranteed at compile time, always validate the result and throw `InvalidOperationException` if null.

---

## Delegates & Events

```csharp
// Cached delegate
private readonly Action<int> _onValueChanged;
// In constructor: _onValueChanged = OnValueChanged;
```

- Use `static` lambdas where no capture: `static (x) => x * 2`
- Don't subscribe/unsubscribe in `_Process` — do it in `_Ready` / `_ExitTree`
- For Godot signals, prefer typed C# events over `Connect()` with string method names

---

## Math

- `Vector2.DistanceSquaredTo()` instead of `Vector2.DistanceTo()` for distance comparisons — avoids `sqrt`
- Precompute inverse values: `value * invMax` instead of `value / max`
- `Mathf.IsEqualApprox()` / `Mathf.IsZeroApprox()` for float comparison
- `Vector2.Zero`, `Vector2.One`, `Vector3.Zero`, `Quaternion.Identity` instead of constructing new ones
- Use `Mathf.Lerp`, `Mathf.Clamp`, `Mathf.MoveToward` — engine-optimized built-ins
- Integer arithmetic where possible

---

## Collections

### Array vs List

For fixed-size data sets, prefer arrays — no wrapper overhead, better cache locality:

```csharp
// ✅ Array — no bounds-check wrapper, better cache locality
private readonly EnemySlot[] _slots = new EnemySlot[MaxEnemies];

// List only when dynamic size is required
```

`Array.Clear()` is faster than a manual loop for zeroing.

### HashSet for Contains Checks

```csharp
// ❌ O(n) — linear scan
private List<int> _activeIds;
if (_activeIds.Contains(id)) { } // slow

// ✅ O(1) — hash lookup
private HashSet<int> _activeIds;
if (_activeIds.Contains(id)) { }
```

### Enum as Dictionary Key — Boxing

```csharp
// ❌ Boxing on every access — Enum equality falls back to object
Dictionary<StateType, Handler> _handlers = new();

// ✅ Use int key to avoid boxing
Dictionary<int, Handler> _handlers = new();
_handlers[(int)StateType.Idle] = handler;
```

---

## Physics

- Configure Collision Layers and Masks — disable unnecessary interactions
- Use `PhysicsDirectSpaceState2D` / `PhysicsDirectSpaceState3D` for direct queries
- Prefer `IntersectRay()` with specific collision mask over broad queries
- Use `Area2D` / `Area3D` for overlap detection instead of manual distance checks

---

## UI Optimization

### Hiding UI

- Hide via `Visible = false` on Control nodes — stops rendering but keeps in tree
- Use `CanvasItem.Hide()` / `CanvasItem.Show()` for toggle
- Avoid `RemoveChild()` + `AddChild()` for toggling — expensive tree operations

### UI Update Frequency

- Do NOT update UI labels/controls every frame — use signal-driven updates
- Bind to model change events: update widget only when the underlying data changes
- Use `SetProcess(false)` on UI nodes that don't need per-frame updates

### UI Animations

- Prefer `Tween` (code-driven) for simple UI animations — no `_Process` overhead
- `AnimationPlayer` for complex sequences — but don't use for simple property changes
- Avoid `_Process`-based UI animation when `Tween` can handle it

```csharp
// ✅ Tween for simple UI animation — no _Process overhead
public void FadeIn()
{
    Tween tween = CreateTween();
    tween.TweenProperty(this, "modulate:a", 1.0f, 0.3f);
}

// ❌ _Process-based animation — runs every frame
public override void _Process(double delta)
{
    Color modulate = Modulate;
    modulate.A = Mathf.MoveToward(modulate.A, 1.0f, (float)delta * 3.0f);
    Modulate = modulate;
}
```

---

## .NET Runtime Specifics

### JIT vs AOT Considerations

- For mobile/web exports, Godot .NET may use AOT compilation — avoid heavy runtime reflection
- Prefer interfaces and generic constraints over runtime `GetType()` / reflection
- `sealed` classes help the JIT devirtualize method calls in hot paths

### Virtual Dispatch in Hot Paths

```csharp
// ❌ Virtual dispatch through interface prevents inlining in tight loops
foreach (IUpdatable updatable in _updatables)
    updatable.Tick(); // virtual call every frame

// ✅ sealed class allows JIT to devirtualize calls
public sealed class EnemyController : IUpdatable
{
    public void Tick() { ... } // devirtualized when called through concrete type
}
```

### `[MethodImpl(AggressiveInlining)]` for Hot Utility Methods

```csharp
using System.Runtime.CompilerServices;

[MethodImpl(MethodImplOptions.AggressiveInlining)]
private static float CalculateDamage(float baseDamage, float multiplier)
    => baseDamage * multiplier;
```

Apply to small math/utility methods called frequently in gameplay loops.

---

## Mobile Specifics

- Limit UI update frequency (not every frame)
- Lower `Engine.MaxFps` and use `OS.LowProcessorUsageMode` when backgrounded
- Use compressed textures (ETC2 for Android, ASTC for iOS)
- Minimize node count — flatten scene tree where possible
- Use `ResourceLoader.LoadThreadedRequest()` for async loading — don't block the main thread
- Minimize `QueueFree()` / `Instantiate()` — use pooling
- Unload unused resources after scene changes
