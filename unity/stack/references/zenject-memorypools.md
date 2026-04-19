# Zenject — Memory Pools

> See also: [zenject.md](../zenject.md), [zenject-factories.md](zenject-factories.md)

Memory pools reuse instances instead of allocating new ones, eliminating GC spikes. Critical for mobile and performance-sensitive gameplay (bullets, particles, enemies).

---

## Basic Pattern

```csharp
public class Bullet
{
    public class Pool : MemoryPool<Bullet> { }
}

// Installer
Container.BindMemoryPool<Bullet, Bullet.Pool>();

// Consumer
public class BulletSpawner
{
    readonly Bullet.Pool _pool;

    public BulletSpawner(Bullet.Pool pool) => _pool = pool;

    void Fire() => _pool.Spawn();
    void OnBulletHit(Bullet b) => _pool.Despawn(b);
}
```

## BindMemoryPool API

```csharp
Container.BindMemoryPool<ObjectType, PoolType>()
    .WithInitialSize(count)         // pre-allocate N instances at startup
    .WithMaxSize(limit)             // cap: excess Despawn'd items are destroyed
    .ExpandByOneAtATime()           // grow by 1 when exhausted (default)
    .ExpandByDoubling()             // double pool size when exhausted
    .FromComponentInNewPrefab(prefab)   // for MonoBehaviour pools
    .UnderTransformGroup("PoolGroup")   // organize in hierarchy
    .AsSingle();                        // pool itself is a singleton
```

## Pool Lifecycle Methods

Override in your pool class to control item behavior:

| Method | Called when | Use for |
|--------|-------------|---------|
| `OnCreated(T item)` | Item is first allocated | Set up permanent state |
| `OnSpawned(T item)` | Item leaves the pool | Reset/activate, start effects |
| `OnDespawned(T item)` | Item returns to the pool | Disable, clear transient state |
| `OnDestroyed(T item)` | Pool shrinks or clears | Release resources |
| `Reinitialize(P1..., T item)` | After OnSpawned, when pool has params | Apply runtime parameters |

```csharp
public class BulletPool : MemoryPool<Vector3, Bullet>
{
    protected override void OnCreated(Bullet bullet) { /* one-time setup */ }

    protected override void Reinitialize(Vector3 startPos, Bullet bullet)
    {
        bullet.transform.position = startPos;
        bullet.gameObject.SetActive(true);
    }

    protected override void OnDespawned(Bullet bullet)
    {
        bullet.gameObject.SetActive(false);
    }
}

// Usage
_pool.Spawn(firePosition);
```

## MonoBehaviour Pooling

Use `MonoMemoryPool<T>` for MonoBehaviour/component pooling — it automatically disables/enables the `GameObject` on despawn/spawn:

```csharp
public class Enemy : MonoBehaviour
{
    public class Pool : MonoMemoryPool<Enemy> { }
}

Container.BindMemoryPool<Enemy, Enemy.Pool>()
    .WithInitialSize(5)
    .FromComponentInNewPrefab(EnemyPrefab)
    .UnderTransformGroup("Enemies");
```

`MonoMemoryPool` sets `gameObject.SetActive(false)` on despawn and `SetActive(true)` on spawn automatically — do not call these manually unless overriding the behavior.

## IPoolable + Dispose Pattern

Lets the pooled object return itself to the pool via `Dispose()`, without the consumer knowing which pool it belongs to:

```csharp
public class Foo : IPoolable<IMemoryPool>, IDisposable
{
    IMemoryPool _pool;

    public void OnSpawned(IMemoryPool pool) => _pool = pool;
    public void OnDespawned() => _pool = null;
    public void Dispose() => _pool.Despawn(this);
}

// Installer — use PoolableMemoryPool to auto-call IPoolable methods
Container.BindMemoryPool<Foo, PoolableMemoryPool<IMemoryPool, Foo>>();
```

## Pool with Parameters

Pass runtime data to the spawned instance:

```csharp
public class Explosion : MonoBehaviour
{
    public class Pool : MonoMemoryPool<float, Explosion>
    {
        protected override void Reinitialize(float intensity, Explosion e)
        {
            e.SetIntensity(intensity);
        }
    }
}

// Installer
Container.BindMemoryPool<Explosion, Explosion.Pool>()
    .FromComponentInNewPrefab(ExplosionPrefab);

// Usage
_explosionPool.Spawn(0.8f);
```

## PoolableManager (for Sub-container pools)

When pooling complex objects that use `GameObjectContext` sub-containers, use `PoolableManager` to forward `OnSpawned`/`OnDespawned` to all `IPoolable` objects inside the sub-container:

```csharp
public class EnemyFacade : MonoBehaviour, IPoolable<IMemoryPool>, IDisposable
{
    [Inject] PoolableManager _poolableManager;
    IMemoryPool _pool;

    public void OnSpawned(IMemoryPool pool)
    {
        _pool = pool;
        _poolableManager.TriggerOnSpawned();
    }

    public void OnDespawned()
    {
        _poolableManager.TriggerOnDespawned();
        _pool = null;
    }

    public void Dispose() => _pool.Despawn(this);
}

// Sub-container installer must include:
subContainer.Bind<PoolableManager>().AsSingle();
```

## StaticMemoryPool (no DI)

For hot paths where DI overhead is undesirable — direct static access:

```csharp
public class Foo
{
    public static readonly StaticMemoryPool<Foo> Pool =
        new StaticMemoryPool<Foo>(OnSpawned, OnDespawned);

    static void OnSpawned(Foo foo) { }
    static void OnDespawned(Foo foo) { }
}

var foo = Foo.Pool.Spawn();
foo.Dispose();  // returns to pool via IDisposable
```

## Built-in Collection Pools

```csharp
// List pool
var list = ListPool<Component>.Instance.Spawn();
// ... use list ...
ListPool<Component>.Instance.Despawn(list);

// Scoped despawn via DisposeBlock
using (var block = DisposeBlock.Spawn())
{
    var list = block.SpawnList<Component>();
    // Automatically despawned when block is disposed
}
```

## Debugging

**PoolCleanupChecker** — throws an exception if any pool items are not despawned when the scene closes. Add to your scene installer during development:
```csharp
Container.BindInterfacesTo<PoolCleanupChecker>().AsSingle();
```

**Memory Pool Monitor** — editor window at `Window > Zenject Pool Monitor` shows all active pools, their sizes, and how many items are spawned vs. pooled.

## Key Rules

- Always call `Despawn()` when an item is no longer needed — orphaned items cause unbounded pool growth.
- Use `MonoMemoryPool<T>` for MonoBehaviours; use `MemoryPool<T>` for plain C# classes.
- Set `WithInitialSize()` to the expected steady-state count to avoid spikes on first spawn.
- Use `WithMaxSize()` when memory is constrained; items that exceed the cap are destroyed.
- Prefer `IPoolable<IMemoryPool> + IDisposable` pattern — it lets the item clean itself up without the consumer tracking which pool to call.
- Never access a despawned item — the pool may have given it to another consumer.
