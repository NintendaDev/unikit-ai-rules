---
version: 1.0.0
---

# Performance Optimization

> **Scope**: Rules for performance optimization — memory/GC, caching, ZLinq, strings, object pooling, delegates, math, physics, UI optimization, mobile specifics.
> **Load when**: performance issues, optimization, hot paths, memory/GC, pooling, ZLinq.

---

## Memory & GC

- Reuse variables and collections in hot paths (Update, FixedUpdate) instead of creating new ones
- Avoid boxing/unboxing — strict typing instead of `Dictionary<string, object>`
- Avoid closures capturing variables in loops — copy to local variable
- Initialize collections with capacity: `new List<T>(expectedSize)`
- Reuse collections via `Clear()` instead of `new`
- `readonly struct` for simple immutable data (value type on stack)
- `struct` instead of `class` for simple data models without inheritance
- `stackalloc` and `Span<T>` for temporary buffers instead of `new T[]`
- Avoid `params T[]` in hot paths — creates array on each call. Use overloads
- Avoid `async void` and `.Forget()` without error handling — use `async UniTask` / `UniTaskVoid`

### `readonly struct` and Defensive Copies in IL2CPP

Declare struct as `readonly` — otherwise the compiler generates a defensive copy on every method call through an interface or readonly field:

```csharp
// ❌ Defensive copy on every GetValue() call — _data is readonly field but struct is not readonly
private readonly MyStruct _data;
_data.GetValue(); // IL2CPP creates a copy of the struct

// ✅ readonly struct — no defensive copy
public readonly struct MyStruct
{
    public int GetValue() => _value;
}
```

### `in` Parameters for Large Structs

Without `in`, every method call copies the entire struct. Critical for `Vector3`, `Matrix4x4`, and custom game structs:

```csharp
// ❌ Copies 48 bytes on every call
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

- Cache `GetComponent<T>()` in Awake — NEVER in Update
- Cache `transform` and `gameObject` in fields when accessed frequently
- Cache `Camera.main` — don't use in hot paths
- Early exit (`if (!_isDirty) return;`) to avoid unnecessary computations
- Cache `WaitForSeconds`: `private readonly WaitForSeconds _delay = new(0.5f);`
- Cache Animator string hash: `private static readonly int RunHash = Animator.StringToHash("Run");`
- Cache Shader property ID: `private static readonly int ColorId = Shader.PropertyToID("_Color");`

### OnValidate/Reset Caching for Scene Components

- Expensive component lookups (`GetComponentInParent`, `FindRootCanvas`, `GetComponentsInChildren`) that return values constant at runtime — cache in a `[SerializeField, HideInInspector]` field populated via `OnValidate()` / `Reset()`. This eliminates runtime search cost for scene objects.

### Cache Constant Dependencies at Initialization

If an object is constant and does not change over time — cache it once in the constructor or initialization method. Never retrieve it repeatedly in hot paths:

```csharp
// ❌ Retrieved on every call — unnecessary overhead
public sealed class EnemyTargetSelector
{
    private readonly ITargetProvider _targetProvider;

    public Transform GetTarget()
    {
        return _targetProvider.GetMainTarget().Transform; // GetMainTarget() called every frame
    }
}

// ✅ Constant target cached once at initialization
public sealed class EnemyTargetSelector : IInitializable
{
    private readonly ITargetProvider _targetProvider;
    private Transform _targetTransform;

    public EnemyTargetSelector(ITargetProvider targetProvider)
    {
        _targetProvider = targetProvider;
    }

    public void Initialize()
    {
        _targetTransform = _targetProvider.GetMainTarget().Transform;
    }

    public Transform GetTarget() => _targetTransform;
}
```

This applies to: resolved services, config values, component references, pre-calculated constants — anything that is set once and never changes at runtime.

---

## ZLinq Instead of LINQ

NEVER use `System.Linq` in hot paths. Use ZLinq (zero-allocation) or explicit `for` loops:

```csharp
using ZLinq;

// ZLinq — zero allocation
var result = items.AsValueEnumerable().Where(x => x.IsActive).Select(x => x.Value).ToArray();

// Explicit for — always preferable for simple cases
for (int i = 0; i < items.Count; i++)
{
    if (items[i].IsActive)
        Process(items[i]);
}
```

- `AsValueEnumerable()` works with `T[]`, `List<T>`, `Span<T>`, `IEnumerable<T>`
- Zero-alloc for `IEnumerable<T>` only if real type is `T[]` or `List<T>`

---

## Strings

- `StringBuilder` for concatenation in hot paths
- Avoid `string.Format` and `+` in Update — use `StringBuilder.Append()`
- `StringComparison.Ordinal` for string comparison
- Cache frequently used strings in `static readonly` fields
- String interpolation (`$""`) only outside hot paths

### StringBuilder Pool

Prefer pooled `StringBuilder` over a shared `readonly` field — no threading concerns, no state leaks:

```csharp
using UnityEngine.Pool;

StringBuilder stringBuilder = GenericPool<StringBuilder>.Get();
stringBuilder.Clear();
stringBuilder.Append("Score: ").Append(score);
string result = stringBuilder.ToString();
GenericPool<StringBuilder>.Release(stringBuilder);
```

---

## Object Pooling

- Pools (Queue-based) instead of Instantiate/Destroy for frequently created objects
- Pattern: `Get()` retrieves from pool + `SetActive(true)`, `Return()` — `SetActive(false)` + return

### Unity Built-in `ObjectPool<T>`

Prefer Unity's built-in pool over manual `Queue<T>` implementations:

```csharp
private readonly ObjectPool<Bullet> _pool = new(
    createFunc:      () => Instantiate(prefab),
    actionOnGet:     b => b.gameObject.SetActive(true),
    actionOnRelease: b => b.gameObject.SetActive(false),
    actionOnDestroy: b => Destroy(b.gameObject),
    defaultCapacity: 32
);

// Usage
Bullet bullet = _pool.Get();
_pool.Release(bullet);
```

### ArrayPool

- After `ArrayPool<T>.Shared.Rent(count)`, always account for the returned array being larger than `count`. Either clear extra slots with `Array.Clear(array, count, array.Length - count)` before passing to APIs that use `.Length`, or iterate only up to `count` — never assume `array.Length == count`.

### State Reset

- When an object performs a state reset (e.g., via a `Reset()` method), all object state must be reset to default values. All caches must also be cleared and disposed.

### Component Validation in Pool Code

- When `GetComponent<T>()` is used in generic/pool code where the component type is not guaranteed at compile time, always validate the result and throw `InvalidOperationException` if null.

---

## Delegates & Events

```csharp
// Cached delegate
private readonly Action<int> _onValueChanged;
// In constructor: _onValueChanged = OnValueChanged;
observable.Subscribe(_onValueChanged);
```

- Use `static` lambdas where no capture: `static (x) => x * 2`
- Don't subscribe/unsubscribe in Update — do it in Awake/OnEnable/OnDisable

---

## Math

- `sqrMagnitude` instead of `magnitude` for distance comparisons
- Precompute inverse values: `value * invMax` instead of `value / max`
- Integer arithmetic where possible
- `Vector3.zero`, `Vector3.one`, `Quaternion.identity` instead of `new Vector3(0,0,0)`

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
// ❌ Boxing on every access — Enum equality falls back to object in IL2CPP
Dictionary<StateType, Handler> _handlers = new();

// ✅ Use int key to avoid boxing
Dictionary<int, Handler> _handlers = new();
_handlers[(int)StateType.Idle] = handler;
```

---

## Physics

- Configure Layer Collision Matrix — disable unnecessary interactions
- `NonAlloc` versions of Physics queries with preallocated buffer: `Physics.OverlapSphereNonAlloc(pos, radius, _hitBuffer)`

---

## UI Optimization

### Hiding UI

- Hide via **disabling Canvas component** (`canvas.enabled = false`), NOT via `SetActive(false)` — Canvas preserves vertex buffer and doesn't trigger expensive OnDisable/OnEnable
- Alternative: `CanvasGroup.alpha = 0` + `CanvasGroup.blocksRaycasts = false`

### Canvas Scaler Timing

- UI code depending on Canvas dimensions (`GetWorldCorners`, offset calculations) MUST NOT run in `Awake()` — Canvas Scaler has not applied scale yet. Use `Start()` + `Canvas.ForceUpdateCanvases()` as the safe point for Canvas-dependent calculations.

### UI Animations

- Do NOT use `Animator` on UI — marks element dirty every frame, even without changes
- DOTween or code for UI animations
- `Image.fillAmount` for progress bar — doesn't cause layout rebuild

---

## IL2CPP Specifics

### Avoid Reflection at Runtime

```csharp
// ❌ AOT cannot pre-generate code for runtime reflection
Type type = obj.GetType();
MethodInfo method = type.GetMethod("Execute");
method.Invoke(obj, args);

// ✅ Use interfaces and non-generic base classes instead
```

### Avoid Generic Explosion

Each unique closed generic generates separate AOT code — bloats binary and increases compile time:

```csharp
// ❌ AOT generates separate code for every type combination
Container.Bind<Service<TypeA, TypeB, TypeC>>();

// ✅ Prefer non-generic interfaces and base classes
Container.Bind<IService>();
```

### Virtual Dispatch in Hot Paths

```csharp
// ❌ Virtual dispatch through interface prevents inlining in tight loops
foreach (IUpdatable updatable in _updatables)
    updatable.Tick(); // virtual call every frame

// ✅ sealed class allows AOT/JIT to devirtualize calls
public sealed class EnemyController : IUpdatable
{
    public void Tick() { ... } // devirtualized when called through concrete type
}
```

---

## Low-Level C#

### `[MethodImpl(AggressiveInlining)]` for Hot Utility Methods

```csharp
using System.Runtime.CompilerServices;

[MethodImpl(MethodImplOptions.AggressiveInlining)]
private static float CalculateDamage(float baseDamage, float multiplier)
    => baseDamage * multiplier;
```

Apply to small math/utility methods called frequently in gameplay loops.

### Avoid try/catch in Hot Paths

In IL2CPP, `try/catch` generates overhead even when no exception is thrown:

```csharp
// ❌ try/catch in Update or frequently called logic
private void Update()
{
    try { ProcessInput(); }
    catch (Exception e) { ... }
}

// ✅ Validate input before calling, use try/catch only at system boundaries (I/O, network, loading)
```

---

## Mobile Specifics

- Limit UI update frequency (not every frame) when using MonoBehaviour
- Lower `targetFrameRate` and `timeScale` in `OnApplicationPause`
- Unload unused resources: `Resources.UnloadUnusedAssets()` after scene changes
- Addressables for async loading — don't forget `Release()`
- Minimize `SetActive(false/true)` — expensive operation on mobile
