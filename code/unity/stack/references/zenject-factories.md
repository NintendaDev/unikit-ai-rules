# Zenject — Factories

> See also: [zenject.md](../zenject.md)

Factories enable dynamic object creation at runtime while preserving dependency injection. Use them instead of `new` for objects that need injected dependencies and are created after startup.

---

## PlaceholderFactory Pattern (preferred)

Define a nested `Factory` class inside the type it creates. This makes parameter changes detectable at compile-time and keeps the API readable.

```csharp
public class Enemy
{
    readonly Player _player;
    readonly float _speed;

    public Enemy(float speed, Player player)
    {
        _player = player;
        _speed = speed;
    }

    // Nested factory — parameter types are part of the generic signature
    public class Factory : PlaceholderFactory<float, Enemy> { }
}
```

**Consuming the factory:**
```csharp
public class EnemySpawner : ITickable
{
    readonly Enemy.Factory _factory;

    public EnemySpawner(Enemy.Factory factory) => _factory = factory;

    public void Tick()
    {
        var enemy = _factory.Create(Random.Range(1f, 5f));
    }
}
```

**Binding in installer:**
```csharp
Container.BindFactory<float, Enemy, Enemy.Factory>();
```

## BindFactory API

```csharp
Container.BindFactory<ContractType, PlaceholderFactoryType>()
    .WithId(identifier)
    .WithFactoryArguments(factoryDependencies)  // deps injected INTO the factory itself
    .To<ConcreteType>()
    .FromConstructionMethod()
    .WithArguments(constructorArgs)             // extra args for the created object
    .NonLazy();
```

Note: `BindFactory` defaults to `AsCached()` for the factory itself, unlike normal bindings.

## Construction Methods

| Method | When to use |
|--------|-------------|
| `FromNew()` | Plain C# class, no prefab needed |
| `FromComponentInNewPrefab(prefab)` | MonoBehaviour on a prefab |
| `FromComponentInNewPrefabResource(path)` | MonoBehaviour from Resources path |
| `FromSubContainerResolve()` | Object with a complex internal dependency graph (Facade pattern) |
| `FromMethod(...)` | Custom instantiation logic |
| `FromFactory<CustomFactory>()` | Fully custom `IFactory<T>` implementation |

**MonoBehaviour on a prefab:**
```csharp
public class Enemy : MonoBehaviour
{
    [Inject]
    public void Construct(Player player) { /* ... */ }

    public class Factory : PlaceholderFactory<Enemy> { }
}

// Installer
Container.BindFactory<Enemy, Enemy.Factory>()
    .FromComponentInNewPrefab(EnemyPrefab);
```

## Abstract Factory (interface return type)

Return an interface instead of a concrete type to allow swapping implementations:

```csharp
public class PathFindingStrategyFactory : PlaceholderFactory<IPathFindingStrategy> { }

// Installer — switch implementation based on settings
if (useAStar)
    Container.BindFactory<IPathFindingStrategy, PathFindingStrategyFactory>()
        .To<AStarStrategy>();
else
    Container.BindFactory<IPathFindingStrategy, PathFindingStrategyFactory>()
        .To<RandomStrategy>();
```

## BindIFactory (lightweight alternative)

Simpler than PlaceholderFactory, but less type-safe — parameter signature changes are not caught at compile time:

```csharp
Container.BindIFactory<IPathFindingStrategy>().To<AStarPathFindingStrategy>();

// Consuming class
public class GameController : IInitializable
{
    IFactory<IPathFindingStrategy> _strategyFactory;

    public GameController(IFactory<IPathFindingStrategy> f) => _strategyFactory = f;

    public void Initialize() => _strategyFactory.Create();
}
```

## Custom IFactory

Use when creation logic can't be expressed through standard construction methods:

```csharp
public class CustomEnemyFactory : IFactory<IEnemy>
{
    readonly Dog.Factory _dogFactory;
    readonly Demon.Factory _demonFactory;
    readonly DifficultyManager _difficulty;

    public CustomEnemyFactory(DifficultyManager difficulty, Dog.Factory d, Demon.Factory e)
    {
        _difficulty = difficulty;
        _dogFactory = d;
        _demonFactory = e;
    }

    public IEnemy Create()
        => _difficulty.IsHard ? _demonFactory.Create() : _dogFactory.Create();
}

// Installer
Container.BindFactory<IEnemy, EnemyFactory>()
    .FromFactory<CustomEnemyFactory>();
```

Prefer injecting inner factories over injecting `DiContainer` directly — this keeps the custom factory validatable.

## PrefabFactory / PrefabResourceFactory

When the calling code decides which prefab to instantiate at runtime:

```csharp
public class Foo
{
    public class Factory : PlaceholderFactory<UnityEngine.Object, Foo> { }
}

Container.BindFactory<UnityEngine.Object, Foo, Foo.Factory>()
    .FromFactory<PrefabFactory<Foo>>();

// Usage: pass the prefab as the first argument
var instance = fooFactory.Create(myPrefab);
```

```csharp
// Load from Resources by path
public class Bar
{
    public class Factory : PlaceholderFactory<string, Bar> { }
}

Container.BindFactory<string, Bar, Bar.Factory>()
    .FromFactory<PrefabResourceFactory<Bar>>();

var instance = barFactory.Create("Prefabs/MyBar");
```

Note: `PrefabResourceFactory` skips validation because the prefab is unavailable at validation time.

## Custom Factory Interface (decoupling)

Expose a factory via an interface to decouple consumers from the concrete factory class:

```csharp
public interface IFooFactory : IFactory<Foo> { }

public class Foo
{
    public class Factory : PlaceholderFactory<Foo>, IFooFactory { }
}

Container.BindFactoryCustomInterface<Foo, Foo.Factory, IFooFactory>();
```

## IValidatable for Custom Factories

If your custom factory calls `DiContainer.Instantiate` directly, implement `IValidatable` so Zenject can dry-run creation during scene validation:

```csharp
public class CustomEnemyFactory : IFactory<IEnemy>, IValidatable
{
    readonly DiContainer _container;

    public IEnemy Create() => _container.Instantiate<Dog>();

    public void Validate()
    {
        _container.Instantiate<Dog>();    // returns null during validation
        _container.Instantiate<Demon>();
    }
}
```

## Key Rules

- Always use `PlaceholderFactory` nested inside the created class — not `PlaceholderFactory<T>` injected directly.
- Never inject `DiContainer` into non-factory classes; factories are the only valid exception.
- For MonoBehaviours created by factory, injection runs before `Awake` — use `Awake`/`Start` for initialization.
- `WithFactoryArguments()` injects into the factory itself; `WithArguments()` injects into the created object.
- For complex objects with many internal dependencies, prefer `FromSubContainerResolve()` over manually passing all parameters — see `zenject-subcontainers.md`.
