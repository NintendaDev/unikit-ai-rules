# Zenject — Sub-containers

> See also: [zenject.md](../zenject.md), [zenject-factories.md](zenject-factories.md)

Sub-containers are isolated DI scopes nested inside a parent container. They inherit all parent bindings but keep their own bindings private. Use them to group related classes into self-contained, reusable subsystems (Facade pattern).

---

## When to Use Sub-containers

- **Multiple instances of a dependent group** — e.g., several spaceships, each with its own engine, shield, and weapon systems.
- **Encapsulation** — hide complex internal wiring behind a single facade interface.
- **Lifecycle isolation** — manage a group of objects together, independently of the parent scene.
- **Dynamic objects with complex dependency graphs** — avoid passing 10+ constructor parameters through factories.

## Container Hierarchy

```
ProjectContext (root — app lifetime)
    └── SceneContext (scene lifetime)
            ├── Normal bindings (shared across scene)
            └── GameObjectContext (prefab scope — private to this GO)
                    ├── Facade (exposed to parent)
                    └── Internal dependencies (invisible to parent)
```

Child containers can resolve bindings from parent containers. Parent containers cannot resolve bindings from child containers.

## GameObjectContext (recommended for MonoBehaviours)

Add `GameObjectContext` component to the root of a prefab. All MonoBehaviours on that prefab and its children belong to the sub-container. Lifecycle events (`IInitializable`, `ITickable`, `IDisposable`) are handled automatically.

**Setup steps:**
1. Right-click Hierarchy → Zenject → Game Object Context (or add the component manually).
2. Assign Installers to the `GameObjectContext.Installers` list.
3. Use `ZenjectBinding` component to expose specific MonoBehaviour components to the container.
4. Bind the facade in the parent installer via `FromSubContainerResolve().ByNewContextPrefab(...)`.

## FromSubContainerResolve Binding Patterns

### ByNewContextPrefab (prefab with GameObjectContext)

The prefab already has a `GameObjectContext` and a `MonoInstaller`:

```csharp
public class ShipFacade : MonoBehaviour
{
    // Implement facade interface methods that delegate to internal components
    public class Factory : PlaceholderFactory<ShipFacade> { }
}

// Parent installer
Container.BindFactory<ShipFacade, ShipFacade.Factory>()
    .FromSubContainerResolve()
    .ByNewContextPrefab(ShipPrefab);
```

### ByNewPrefabInstaller (prefab without GameObjectContext)

Zenject automatically adds a `GameObjectContext` and runs the given installer. No manual setup needed on the prefab:

```csharp
Container.BindFactory<float, ShipFacade, ShipFacade.Factory>()
    .FromSubContainerResolve()
    .ByNewPrefabInstaller<ShipInstaller>(ShipPrefab);
```

### ByMethod (no GameObject required)

For plain C# sub-containers. Does NOT automatically handle `IInitializable`/`ITickable`/`IDisposable` — add `.WithKernel()` to enable lifecycle:

```csharp
Container.Bind<Greeter>()
    .FromSubContainerResolve()
    .ByMethod(InstallGreeter)
    .WithKernel()
    .AsSingle();

void InstallGreeter(DiContainer subContainer)
{
    subContainer.Bind<Greeter>().AsSingle();
    subContainer.BindInstance("Hello world!");
}
```

### ByInstaller (preferred over ByMethod)

Uses a reusable `Installer<T>` class instead of a local method. Prevents accidentally referencing the wrong container:

```csharp
public class GreeterInstaller : Installer<GreeterInstaller>
{
    public override void InstallBindings()
    {
        Container.Bind<Greeter>().AsSingle();
        Container.BindInstance("Hello world!");
    }
}

Container.Bind<Greeter>()
    .FromSubContainerResolve()
    .ByInstaller<GreeterInstaller>()
    .WithKernel()
    .AsSingle();
```

## Passing Parameters to Sub-containers

Parameters flow through the factory into the sub-container's installer. Use `[InjectOptional]` on the parameter in the installer to allow edit-time validation without runtime values:

```csharp
// Factory signature defines the parameter
public class ShipFacade : MonoBehaviour
{
    public class Factory : PlaceholderFactory<float, ShipFacade> { }
}

// Installer receives the parameter
public class ShipInstaller : MonoInstaller
{
    [Inject(Optional = true)] float _speed;

    public override void InstallBindings()
    {
        // Bind the parameter for injection into sub-container classes
        Container.BindInstance(_speed).WhenInjectedInto<ShipEngine>();
    }
}

// Usage
var ship = _shipFactory.Create(25f);
```

## Kernel Pattern (lifecycle for ByMethod/ByInstaller)

`ByMethod` and `ByInstaller` don't create a `GameObjectContext`, so `IInitializable`/`ITickable`/`IDisposable` don't fire automatically. Use `.WithKernel()` to enable them:

```csharp
Container.Bind<Greeter>()
    .FromSubContainerResolve()
    .ByInstaller<GreeterInstaller>()
    .WithKernel()
    .AsSingle();
```

For ordering, create a custom Kernel class:

```csharp
public class GreeterKernel : Kernel { }

Container.Bind<Greeter>()
    .FromSubContainerResolve()
    .ByInstaller<GreeterInstaller>()
    .WithKernel<GreeterKernel>()
    .AsSingle();

Container.BindExecutionOrder<GreeterKernel>(-1);
```

## Facade Pattern (recommended architecture)

The facade exposes only the public API of the subsystem. All internal wiring stays in the sub-container.

```csharp
public class SpaceshipFacade : MonoBehaviour, ISpaceship
{
    [Inject] SpaceshipEngine _engine;
    [Inject] SpaceshipShield _shield;
    [Inject] SpaceshipWeapon _weapon;

    public void Fire() => _weapon.Fire();
    public void ActivateShield() => _shield.Activate();
    public float Speed => _engine.Speed;

    public class Factory : PlaceholderFactory<SpaceshipFacade> { }
}

// Parent installer only knows about SpaceshipFacade
Container.BindFactory<SpaceshipFacade, SpaceshipFacade.Factory>()
    .FromSubContainerResolve()
    .ByNewContextPrefab(SpaceshipPrefab);
```

## Key Rules

- Always bind the facade type inside the sub-container's installer — `FromSubContainerResolve` resolves it from the sub-container, not the parent.
- Use `ByNewContextPrefab` or `ByNewPrefabInstaller` for MonoBehaviour-based facades; use `ByInstaller`/`ByMethod` + `.WithKernel()` for plain C# facades.
- Prefer `ByInstaller` over `ByMethod` — it avoids accidentally closing over the wrong container variable.
- When pooling sub-container objects, use `PoolableManager` inside the sub-container — see `zenject-memorypools.md`.
- Keep the facade API minimal — only expose what parent-scope consumers need.
