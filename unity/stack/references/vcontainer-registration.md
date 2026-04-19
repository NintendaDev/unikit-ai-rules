# VContainer — Registration Method Catalog

> See also: [vcontainer.md](../vcontainer.md)

---

## Registration Method Quick Reference

| Method | Registers | Lifetime Constraint | Key Notes |
|--------|-----------|---------------------|-----------|
| `Register<T>(Lifetime)` | Plain C# type as itself | Any | Core registration method |
| `Register<TInterface, TImpl>(Lifetime)` | Implementation mapped to one interface | Any | Shorthand for `.As<TInterface>()` |
| `RegisterInstance(obj)` | Existing object instance | **Singleton only** | Container does not call `Dispose()` or inject into it |
| `RegisterInstance<T>(obj)` | Existing instance as interface | **Singleton only** | |
| `Register(typeof(GenericType<>), Lifetime)` | Open generic type | Any | Runtime type construction via non-generic overload |
| `Register<T>(container => expr, Lifetime)` | Delegate factory (build-time) | Any | Executed **once** at scope build; use `RegisterFactory` for runtime creation |
| `RegisterFactory<TArg, TResult>(container => hp => new T(...), Lifetime)` | `Func<TArg, TResult>` delegate | Any | Inject `Func<TArg, TResult>`; container does **not** manage lifetime of produced objects |
| `RegisterEntryPoint<T>()` | Entry point wired to PlayerLoopSystem | Singleton (default) | Supports `IStartable`, `ITickable`, `IFixedTickable`, `ILateTickable`, `IDisposable`, `IAsyncStartable`, etc. |
| `RegisterComponent(mb)` | MonoBehaviour instance | Scene-tied Singleton | Injected even if not explicitly resolved elsewhere |
| `RegisterComponentInHierarchy<T>()` | MonoBehaviour found in scene hierarchy | **Scoped only** | Searches hierarchy at scope build time; throws if not found |
| `RegisterComponentInNewPrefab(prefab, Lifetime)` | New instance instantiated from prefab | Any | Instantiated on first resolve |
| `RegisterComponentOnNewGameObject<T>(Lifetime, "name")` | New GameObject + new component | Any | `name` parameter is optional |
| `RegisterBuildCallback(container => ...)` | Post-build hook | — | Executes after container fully built; receives `IObjectResolver` |
| `RegisterDisposeCallback(container => ...)` | Dispose hook | — | Executes when `LifetimeScope` is disposed |
| `RegisterEntryPointExceptionHandler(ex => ...)` | Exception handler for entry points | — | Suppresses default exception logging |

## Modifier Chaining

Chain modifiers after any `Register<T>(...)` call to control how the type is exposed:

| Modifier | Effect |
|----------|--------|
| `.As<IA>()` | Expose as `IA` only (hides the concrete type) |
| `.As<IA, IB>()` | Expose as both `IA` and `IB` |
| `.AsImplementedInterfaces()` | Expose as all interfaces the type implements |
| `.AsSelf()` | Also expose as the concrete type (use with `.AsImplementedInterfaces()`) |
| `.WithParameter<T>(value)` | Provide a specific constructor parameter value by type |
| `.WithParameter("name", value)` | Provide a specific constructor parameter value by name |
| `.Keyed(key)` | Register under a key (enum / string / int); inject with `[Key(key)]` |

MonoBehaviour-specific modifiers (for `RegisterComponent*` methods):

| Modifier | Effect |
|----------|--------|
| `.UnderTransform(transform)` | Place the created GameObject under the given parent |
| `.UnderTransform(container => ...)` | Resolve the parent transform from the container |
| `.DontDestroyOnLoad()` | Persist the component across scene loads |
| `.UseComponents(builder => ...)` | Group multiple component registrations with a shared parent transform |

### Chaining examples

```csharp
// Expose as both interface and concrete type
builder.Register<ServiceA>(Lifetime.Singleton)
    .AsImplementedInterfaces()
    .AsSelf();

// Provide a typed constructor parameter
builder.Register<ApiClient>(Lifetime.Singleton)
    .WithParameter<string>("https://api.example.com");

// Register a prefab component with hierarchy placement
builder.RegisterComponentInNewPrefab(hudPrefab, Lifetime.Scoped)
    .AsImplementedInterfaces()
    .UnderTransform(uiRoot);

// Keyed registration for multiple implementations of the same interface
builder.Register<IWeapon, Sword>(Lifetime.Singleton).Keyed(WeaponType.Primary);
builder.Register<IWeapon, Bow>(Lifetime.Singleton).Keyed(WeaponType.Secondary);
```

## MonoBehaviour Registration Selector

| Scenario | Recommended Method |
|----------|--------------------|
| Have an existing serialized field reference | `RegisterComponent(myBehaviour)` |
| Find an instance already in the scene hierarchy | `RegisterComponentInHierarchy<T>()` |
| Instantiate from a prefab on first resolve | `RegisterComponentInNewPrefab(prefab, Lifetime)` |
| Create a fresh GameObject and attach a component | `RegisterComponentOnNewGameObject<T>(Lifetime, "Name")` |
| Instantiate at runtime with DI via code | `container.Instantiate(prefab)` (via `IObjectResolver`) |

## IObjectResolver API (runtime resolution)

| Method | Description |
|--------|-------------|
| `Resolve<T>()` | Resolve a registered type; throws if not found |
| `Resolve<T>(key)` | Resolve a keyed registration |
| `TryResolve<T>(out var instance)` | Safe resolve; returns `false` instead of throwing |
| `TryResolve<T>(key, out var instance)` | Safe keyed resolve |
| `Inject(object)` | Inject `[Inject]`-annotated members into an existing object |
| `InjectGameObject(gameObject)` | Inject into all MonoBehaviours on the GameObject and its descendants |
| `Instantiate(prefab)` | Instantiate a prefab and inject into all MonoBehaviours |
| `Instantiate(prefab, position, rotation, parent)` | Instantiate with transform parameters |
