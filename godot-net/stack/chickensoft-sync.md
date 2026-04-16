---
version: 1.0.0
---

# Chickensoft Sync

> **Scope**: Synchronous, single-threaded reactive programming primitives for Godot 4 .NET — observable values and collections (`AutoValue`, `AutoList`, `AutoSet`, `AutoMap`), broadcast channels (`AutoChannel`, `AutoCache`), fluent binding subscriptions, reentrancy-safe deferred mutations, and the ownership pattern for exposing reactive state.
> **Load when**: authoring reactive game state with observable values or collections, wiring UI views to data models via bindings, choosing between Sync and R3 for reactive programming, implementing the owner/consumer pattern for reactive primitives, building custom reactive primitives with `SyncSubject`, integrating reactive state into Godot node lifecycle.

---

## Installation

```xml
<PackageReference Include="Chickensoft.Sync" Version="#.#.#" />
```

Depends on `Chickensoft.Collections` (>= 3.1.0). Targets `netstandard2.1`.

## Core Concepts

Sync provides **deterministic, single-threaded reactive primitives**. Every mutation is atomic: when a binding callback triggers another mutation, that mutation is queued and executed after all current callbacks finish — preventing reentrancy bugs.

Key design decisions:
- **No ReactiveX terminology** — uses `OnValue`, `OnAdd`, `OnModify` instead of `Subscribe`, `Observer`, `Subject`
- **Synchronous only** — no scheduler or thread-safety abstractions
- **BehaviorSubject semantics** for `AutoValue` — new bindings receive the current value immediately upon registration
- **Zero allocations** in hot paths (prefer value types in broadcasts)

## AutoValue\<T\>

Stores a single observable value. New bindings are notified immediately with the current value.

```csharp
private readonly AutoValue<int> _health = new(100);
public IAutoValue<int> Health => _health; // expose read-only

using var binding = _health.Bind();
binding
  .OnValue(v => GD.Print(v))                              // any value
  .OnValue((Dog dog) => GD.Print(dog.Name))               // type-specific (reference types only)
  .OnValue(v => GD.Print(v), condition: v => v > 0);      // conditional

_health.Value = 80; // triggers broadcast
_health.Dispose();  // cleanup (owner's responsibility)
```

## AutoList\<T\>

Reactive wrapper around `List<T>`, implements `IList<T>`.

```csharp
private readonly AutoList<Enemy> _enemies = new(new List<Enemy>());
public IAutoList<Enemy> Enemies => _enemies;

using var binding = _enemies.Bind();
binding
  .OnAdd(enemy => { })                         // item added
  .OnAdd((index, enemy) => { })                // with index
  .OnAdd((Boss boss) => { })                   // type-specific
  .OnRemove(enemy => { })
  .OnRemove((Boss boss) => { })
  .OnUpdate((prev, curr) => { })               // item replaced
  .OnUpdate((prev, curr, index) => { })        // with index
  .OnClear(() => { })
  .OnModify(() => { });                        // any change

_enemies.Add(new Enemy());
_enemies.RemoveAt(0);
_enemies[0] = newEnemy;
```

Custom comparer: `new AutoList<Enemy>(list, new EnemyComparer())`.

## AutoSet\<T\>

Reactive wrapper around `HashSet<T>`. Does **not** implement full `ISet<T>` to avoid temporary allocations.

```csharp
using var binding = _tags.Bind();
binding
  .OnAdd(tag => { })
  .OnAdd((SpecialTag tag) => { })
  .OnRemove(tag => { })
  .OnClear(() => { })
  .OnModify(() => { });

_tags.Add("invincible");
_tags.Remove("invincible");
```

## AutoMap\<TKey, TValue\>

Reactive wrapper around `Dictionary<TKey, TValue>`, implements `IDictionary<TKey, TValue>`.

```csharp
using var binding = _inventory.Bind();
binding
  .OnAdd((key, value) => { })
  .OnRemove((key, value) => { })
  .OnUpdate((key, prev, curr) => { })
  .OnClear(() => { })
  .OnModify(() => { });

_inventory["sword"] = new Item();
_inventory.Remove("sword");
```

## AutoChannel

Broadcasts **struct** events without storing state. Use when you want fire-and-forget notification — consumers who weren't listening at send time receive nothing.

```csharp
readonly record struct EnemyDied(int EnemyId);

private readonly AutoChannel _events = new();
public IAutoChannel Events => _events;

using var binding = _events.Bind();
binding
  .On<EnemyDied>(evt => GD.Print($"Enemy {evt.EnemyId} died"))
  .On<EnemyDied>(evt => { }, condition: evt => evt.EnemyId > 0);

_events.Send(new EnemyDied(42));
```

**Structs only** — `AutoChannel` is optimized for value types; using reference types defeats the purpose and may box.

## AutoCache

Type-keyed cache storing **one value per type**. New bindings receive the stored value immediately. Deduplicates consecutive identical updates.

```csharp
readonly record struct PlayerStats(int Level, float Speed);

private readonly AutoCache _state = new();

using var binding = _state.Bind();
binding.OnUpdate<PlayerStats>(stats => GD.Print(stats.Level));

_state.Update(new PlayerStats(1, 5f));
_state.Update<BaseStats>(new DerivedStats()); // stores under BaseStats key

if (_state.TryGetValue<PlayerStats>(out var current)) { }
```

**Inheritance caveat:** `Update(new Dog())` stores under `Dog`, not `Animal`. To retrieve via `TryGetValue<Animal>()`, call `Update<Animal>(new Dog())` explicitly. Binding callbacks still fire for matching type registrations.

## Binding Lifecycle

```csharp
// Create binding
var binding = autoValue.Bind();

// Register callbacks (fluent, chainable)
binding.OnValue(v => { }).OnValue((Dog d) => { });

// Dispose to unsubscribe and prevent memory leaks
binding.Dispose();

// Or use 'using' for automatic disposal
using var binding = autoValue.Bind();
```

All `Bind()` calls return the concrete `Binding` nested class, not a base interface — store as `AutoValue<T>.Binding` when you need to hold the reference explicitly.

## Ownership Pattern

Always maintain a **private mutable** reactive field and expose it through a **public read-only interface**.

```csharp
// Owner
public sealed class Enemy : IDisposable
{
    private readonly AutoValue<int> _health = new(100);
    public IAutoValue<int> Health => _health;  // consumers bind to this

    public void TakeDamage(int amount) =>
        _health.Value = Math.Max(0, _health.Value - amount);

    public void Dispose() => _health.Dispose();
}

// Consumer (e.g. Godot node or UI view)
public sealed partial class HealthBar : Control
{
    private AutoValue<int>.Binding? _binding;

    public void Init(Enemy enemy)
    {
        _binding = enemy.Health.Bind();
        _binding.OnValue(UpdateBar);
    }

    public override void _ExitTree()
    {
        _binding?.Dispose();
        _binding = null;
    }
}
```

## Godot Node Integration

Bind in `_Ready` (or after dependency injection resolves), dispose in `_ExitTree`.

```csharp
public sealed partial class PlayerHUD : CanvasLayer
{
    [Dependency] public IPlayerModel Player => DependOn<IPlayerModel>();

    private AutoValue<int>.Binding? _healthBinding;
    private AutoList<Item>.Binding? _inventoryBinding;

    public override void _Ready()
    {
        _healthBinding = Player.Health.Bind();
        _healthBinding.OnValue(hp => _healthLabel.Text = $"HP: {hp}");

        _inventoryBinding = Player.Inventory.Bind();
        _inventoryBinding
            .OnAdd(item => AddItemSlot(item))
            .OnRemove(item => RemoveItemSlot(item));
    }

    public override void _ExitTree()
    {
        _healthBinding?.Dispose();
        _inventoryBinding?.Dispose();
    }
}
```

## Reentrancy Protection (Deferred Mutations)

When a binding callback modifies the same reactive primitive it is reacting to, Sync **queues the mutation** and executes it after all current callbacks finish. Execution order is deterministic and identical every time.

```csharp
// Safe — no reentrancy bug:
_health.Bind().OnValue(hp => {
    if (hp <= 0) _health.Value = 0; // deferred, not immediate
});
```

This is the key difference from R3's immediate invocation model.

## Custom Reactive Primitives

To build a custom reactive type, follow the `IAutoObject<TBinding>` / `SyncSubject` pattern:

```csharp
public interface ICustomSignal : IAutoObject<CustomSignal.Binding> { }

public sealed class CustomSignal : ICustomSignal,
    IPerform<CustomSignal.FireOp>
{
    private readonly record struct FireOp(string Message);
    public readonly record struct Fired(string Message); // broadcast

    private readonly SyncSubject _subject = new();

    public Binding Bind() => new(_subject);

    public void Fire(string message) =>
        _subject.Perform(new FireOp(message));

    void IPerform<FireOp>.Perform(in FireOp op) =>
        _subject.Broadcast(new Fired(op.Message));

    public sealed class Binding : SyncBinding
    {
        internal Binding(ISyncSubject subject) : base(subject) { }

        public Binding OnFired(Action<string> cb)
        {
            AddCallback((in Fired f) => cb(f.Message));
            return this;
        }
    }
}
```

## Performance

| Library | Per-update | Allocations |
|---------|-----------|-------------|
| R3 `ReactiveProperty` | ~2.94 ns | 0 |
| Sync `AutoValue` | ~25.21 ns | 0 |

At 60 FPS (~16 ms/frame), Sync allows ~666 000 `AutoValue` updates per frame — sufficient for virtually all game UI and game state scenarios.

**Use Sync when** you need deterministic, reentrancy-safe reactive state (game model ↔ UI binding, state machines, gameplay logic).
**Use R3 when** you need raw throughput (signal processing, physics accumulation) and can manage reentrancy manually.

## Anti-patterns

- **Exposing the mutable field directly** — always hide behind `IAutoValue<T>`, `IAutoList<T>`, etc.
- **Forgetting to dispose bindings** — causes memory leaks; use `using` or dispose in `_ExitTree`.
- **Using reference types with `AutoChannel`** — structs only; boxing reference types defeats the zero-allocation goal.
- **Assuming `Update<Dog>()` populates `TryGetValue<Animal>()`** — it does not; be explicit with base types.
- **Using Sync for cross-thread communication** — it is single-threaded by design; use Godot signals or channels for thread bridging.
- **Holding `AutoValue<T>` instead of `IAutoValue<T>` in consumer** — breaks testability and encapsulation.
- **Mutating from a callback and expecting immediate effect** — mutations are deferred by design.
