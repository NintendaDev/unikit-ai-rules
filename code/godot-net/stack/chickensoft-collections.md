---
version: 1.0.0
---

# Chickensoft.Collections

> **Scope**: Chickensoft.Collections library usage — specialized data structures for insertion-order-preserving collections, type-keyed storage, struct-safe queuing, and object pooling in Godot 4 .NET projects.
> **Load when**: using LinkedHashSet or LinkedHashMap, storing typed dependencies in a Blackboard, working with EntityTable for concurrent id/type lookups, queuing struct values without boxing, implementing object pooling with IPooled, migrating from deprecated Map or AutoProp types.

---

## Installation

```sh
dotnet add package Chickensoft.Collections
```

Package ID: `Chickensoft.Collections` (v3.1.4+).
The deprecated predecessor `Chickensoft.GoDotCollections` is no longer maintained — do not use it in new projects.

---

## LinkedHashSet\<T\>

Set semantics with guaranteed insertion order. Backed by LinkedList + Dictionary.
Use when the order in which elements were added must be preserved on iteration.

```csharp
var set = new LinkedHashSet<string> { "c", "b", "a" };
set.Remove("c");
set.Add("z");
// Iterates as: ["b", "a", "z"]
```

- Use struct enumerators via `foreach` — allocation-free iteration.
- Prefer standard `HashSet<T>` when order does not matter; linked structures sacrifice cache locality due to linked-list heap allocations per insertion.

---

## LinkedHashMap\<TKey, TValue\>

Dictionary that preserves insertion order. Full dictionary semantics including indexer.
Use when stable key ordering matters (e.g., rendering, serialization, deterministic logic).

```csharp
var map = new LinkedHashMap<string, int> { ["b"] = 2, ["a"] = 1 };
map.Remove("b");
map["z"] = 26;
// Keys iterate as: ["a", "z"]
```

- Struct enumerators keep iteration allocation-free.
- Default `Dictionary<TKey, TValue>` is faster and more cache-friendly when order is irrelevant — choose `LinkedHashMap` only when insertion order is required.

---

## Set\<T\> / IReadOnlySet\<T\>

`Set<T>` extends `HashSet<T>` and exposes the `IReadOnlySet<T>` interface, which is absent from netstandard2.1.
Use when APIs need to accept or return `IReadOnlySet<T>` without pulling in a heavier dependency.

```csharp
IReadOnlySet<string> tags = new Set<string> { "player", "damageable" };
bool hasTag = tags.Contains("player"); // true
```

---

## Blackboard / IBlackboard / IReadOnlyBlackboard

Type-keyed, dictionary-backed storage. Values are stored and retrieved by their system type (or interface type).
Used extensively by `LogicBlocks` to share services and data between states.

```csharp
var blackboard = new Blackboard();
blackboard.Set("hello world");          // stored under key typeof(string)
blackboard.Set<IMyService>(new MyService()); // stored under interface key

string value = blackboard.Get<string>();
IMyService svc = blackboard.Get<IMyService>();
```

- Always store values under the **interface type** when the consumer should depend on an abstraction, not a concrete class.
- Expose `IReadOnlyBlackboard` to read-only consumers so they cannot mutate shared state.
- `LogicBlocks` implement `IBlackboard` natively — call `logic.Set<T>(...)` / `logic.Get<T>()` directly on the logic block instance.

---

## EntityTable\<TId\>

Thread-safe wrapper over `ConcurrentDictionary` that associates values with an identifier **and** a type. Returns `null` when the stored type does not match the requested type — never throws.

`EntityTable` (no generic parameter) is a convenience alias for `EntityTable<string>`.

```csharp
var table = new EntityTable<int>();
table.Set(42, "dolphins");         // key=42, type=string
table.Set(42, new MyComponent());  // key=42, type=MyComponent — second slot

if (table.Get<string>(42) is { } text) {
    GD.Print(text); // "dolphins"
}

// Type mismatch — returns null, does not throw
var missing = table.Get<int>(42); // null
```

- Use pattern matching (`is { } value`) to handle the nullable return safely.
- Prefer `EntityTable` over manual `ConcurrentDictionary<(id, Type), object>` boilerplate when an entity holds multiple typed components at runtime.

---

## BoxlessQueue

Queues struct values on the heap without boxing. Dequeuing invokes `IBoxlessValueHandler.HandleValue<TValue>` with the exact value type — no unboxing required.
Use for high-frequency event dispatch systems where GC pressure from boxing would be unacceptable.

```csharp
public class EventProcessor : IBoxlessValueHandler
{
    public void HandleValue<TValue>(in TValue value) where TValue : struct
    {
        if (value is DamageEvent dmg)
            GD.Print($"Damage: {dmg.Amount}");
    }
}

var processor = new EventProcessor();
var queue = new BoxlessQueue(processor);

queue.Enqueue(new DamageEvent { Amount = 10 });

while (queue.HasValues)
    queue.Dequeue(); // calls processor.HandleValue<DamageEvent>(...)
```

- The handler is set at construction time and cannot be changed — design the handler to dispatch to specific subsystems internally.
- Useful inside `LogicBlocks` output processors and other hot-path event pipelines.

---

## Pool\<T\> / IPooled

Thread-safe object pool using concurrent collections. Pooled types must implement `IPooled` and provide a `Reset()` method that restores the object to a clean initial state.

```csharp
public class Bullet : Node3D, IPooled
{
    public void Reset()
    {
        GlobalPosition = Vector3.Zero;
        Velocity = Vector3.Zero;
        IsActive = false;
    }
}

var pool = new Pool<Node3D>();
pool.Register<Bullet>(capacity: 50); // pre-allocates 50 Bullet instances

// Acquire from pool
var bullet = pool.Get<Bullet>();

// Return to pool — calls bullet.Reset() automatically
pool.Return(bullet);
```

- Call `Register<T>(capacity)` at startup to avoid runtime allocations during gameplay.
- `Return()` calls `Reset()` — ensure `Reset()` fully restores state; partial cleanup causes bugs that are hard to trace.
- Retrieve by concrete type with `pool.Get<Bullet>()` or by runtime type with `pool.Get(typeof(Bullet))`.
- Do **not** use returned objects after calling `pool.Return()` — the pool owns them.

---

## Deprecated Types

| Old type | Replacement | Package |
|----------|-------------|---------|
| `Map<TKey, TValue>` | `LinkedHashMap<TKey, TValue>` | `Chickensoft.Collections` |
| `AutoProp<T>` | `AutoValue<T>` | `Chickensoft.Sync` |

Never introduce `Map` or `AutoProp` in new code. Migrate existing usages during normal refactors.

---

## Anti-patterns

- **Using `LinkedHashSet`/`LinkedHashMap` when order is irrelevant** — unnecessary heap allocations per insertion; prefer `HashSet<T>` / `Dictionary<TKey, TValue>`.
- **Storing concrete types in Blackboard when an interface exists** — breaks dependency inversion; store and retrieve by interface type.
- **Ignoring the nullable return from `EntityTable.Get<T>()`** — returns `null` on type mismatch, not an exception; always use null-check or pattern matching.
- **Incomplete `Reset()` in `IPooled`** — stale state from a previous use leaks into the next; `Reset()` must restore every field.
- **Using pooled objects after `Return()`** — undefined behavior; treat `Return()` as a destructor call.
- **Referencing `Chickensoft.GoDotCollections`** — deprecated package; use `Chickensoft.Collections`.
