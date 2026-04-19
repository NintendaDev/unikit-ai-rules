---
version: 1.0.0
---

# VContainer

> **Scope**: VContainer dependency injection framework for Unity — LifetimeScope composition roots, injection methods (constructor/method/property), scope hierarchy, entry point interfaces, UniTask/UniRx/ECS integrations, and performance optimizations.
> **Load when**: wiring dependency injection with VContainer — creating LifetimeScopes, registering services, choosing injection method, managing scope hierarchy, implementing IStartable/ITickable/IDisposable entry points, debugging container build errors, integrating VContainer with UniTask or UniRx.
> **References**: `.unikit/memory/stack/references/vcontainer-registration.md` (registration method catalog)

---

## Core Concepts

VContainer is a code-first DI framework for Unity. The fundamental building block is `LifetimeScope` — a MonoBehaviour component that acts as a composition root. It holds a `Configure(IContainerBuilder builder)` override where all dependencies are registered.

**Key types:**
- `LifetimeScope` — composition root; attach to a scene GameObject
- `IContainerBuilder` — registers types and instances during `Configure()`
- `IObjectResolver` — the built container; use for runtime resolution

**Three lifetimes:**

| Lifetime | Behaviour |
|----------|-----------|
| `Lifetime.Singleton` | One instance shared across the entire container |
| `Lifetime.Scoped` | One instance per `LifetimeScope`; behaves like Singleton when only one scope exists |
| `Lifetime.Transient` | New instance created on every resolve |

**Scope hierarchy rules:**
- Child scopes inherit parent registrations via lookup chain
- If both parent and child register the same type, the closest scope's instance wins
- `IDisposable` instances are automatically disposed when their `LifetimeScope` is destroyed
- `Scoped` MonoBehaviours are **not** auto-destroyed when only the scope is destroyed (scene stays alive); make them child transforms or dispose manually

## Injection Methods

Only two forms of injection are allowed. Every other form (field injection, property injection, a method named anything other than `Construct`, non-public `Construct`) is an **anti-pattern** — see the "Anti-patterns" section.

1. **Constructor injection** — MUST be used for every non-MonoBehaviour class.
2. **`[Inject] public void Construct(...)`** — MUST be used for every MonoBehaviour.

> **Installers are exempt.** `LifetimeScope` subclasses register dependencies inside `Configure()`; they do not receive injections themselves.

### Constructor Injection (plain C# classes)

`[Inject]` is not required when a class has a single constructor. Add it when multiple constructors exist — exactly one must be marked.

```csharp
public class GameController
{
    readonly IGameService _service;

    public GameController(IGameService service)  // VContainer resolves automatically
    {
        _service = service;
    }
}
```

Rules:
- Mark injected fields `readonly` to enforce immutability.
- Optional dependencies are **not** supported — missing registrations throw at container build time.
- Add `[Inject]` or a `link.xml` entry for IL2CPP builds where constructors may be stripped.
- Use `[Key(WeaponType.Primary)]` on parameters to resolve keyed registrations.
- Large constructors signal violation of Single Responsibility Principle — refactor the class.
- Never place `[Inject]` on fields or properties.

### Method Injection (MonoBehaviours only)

MonoBehaviours cannot use constructors. The injection method MUST be named `Construct`, MUST be `public`, and MUST carry `[Inject]`:

```csharp
public class PlayerView : MonoBehaviour
{
    float _speed;

    [Inject]
    public void Construct(GameSettings settings) => _speed = settings.speed;
}
```

- Although VContainer technically accepts any `[Inject]` method name and access modifier, the project convention is strict: `public void Construct(...)` only.
- Register the MonoBehaviour via `RegisterComponent` or `RegisterComponentInHierarchy` (see reference file).
- Supports `[Key]` on parameters for keyed dependencies.
- Keep `Construct` logic-free — only assign fields. Initialization logic that depends on injected state belongs in `Awake`/`Start` or in an `IStartable.Start()` implementation.

## Registration Patterns

See the **Registration Method Catalog** lookup workflow at the bottom of this file for the full API reference.

### Plain C# types

```csharp
// Concrete type as itself
builder.Register<GameController>(Lifetime.Singleton);

// Interface → implementation
builder.Register<IGameService, GameService>(Lifetime.Scoped);

// Multiple interfaces
builder.Register<ServiceA>(Lifetime.Singleton).As<IServiceA, IInputPort>();

// All interfaces the type implements
builder.Register<ServiceA>(Lifetime.Singleton).AsImplementedInterfaces();

// Both concrete type and all interfaces
builder.Register<ServiceA>(Lifetime.Singleton).AsImplementedInterfaces().AsSelf();
```

### Constructor parameters

```csharp
builder.Register<ApiClient>(Lifetime.Singleton)
    .WithParameter<string>("https://api.example.com");
// Named parameter:
    .WithParameter("url", "https://api.example.com");
```

### Delegate registration (build-time factory)

```csharp
// Executed once at scope build — NOT for runtime object creation
builder.Register<IFoo>(container =>
{
    var dep = container.Resolve<SomeDependency>();
    return dep.CreateFoo();
}, Lifetime.Scoped);
```

For runtime object creation (on demand, with arguments), use `RegisterFactory`.

### Runtime factory

```csharp
// Inject Func<int, Enemy> where int is a runtime argument
builder.RegisterFactory<int, Enemy>(container =>
{
    var pool = container.Resolve<EnemyPool>();
    return hp => pool.Get(hp);
}, Lifetime.Scoped);
```

VContainer does **not** manage the lifetime of objects produced by factories — handle `Dispose()` manually.

### Keyed registration

```csharp
builder.Register<IWeapon, Sword>(Lifetime.Singleton).Keyed(WeaponType.Primary);
builder.Register<IWeapon, Bow>(Lifetime.Singleton).Keyed(WeaponType.Secondary);

// Constructor parameter resolves by key:
public WeaponSystem([Key(WeaponType.Primary)] IWeapon primary, [Key(WeaponType.Secondary)] IWeapon secondary) { }
```

Supported key types: `enum`, `string`, `int` (any type is valid).

### Collections (multiple implementations)

```csharp
builder.Register<IEnemy, Goblin>(Lifetime.Scoped);
builder.Register<IEnemy, Troll>(Lifetime.Scoped);

// Inject as:
public EnemyManager(IReadOnlyList<IEnemy> enemies) { }
// or: IEnumerable<IEnemy>
```

### ScriptableObject settings

```csharp
public class GameLifetimeScope : LifetimeScope
{
    [SerializeField] GameSettings _settings;

    protected override void Configure(IContainerBuilder builder)
    {
        builder.RegisterInstance(_settings.cameraSettings);
        builder.RegisterInstance(_settings.actorSettings);
    }
}
```

`RegisterInstance` always registers as Singleton. The container does not manage disposal of registered instances.

### Post-build and dispose callbacks

```csharp
// Runs after the container is fully built
builder.RegisterBuildCallback(container =>
{
    container.Resolve<ServiceA>().Initialize();
});

// Runs when the scope is disposed
builder.RegisterDisposeCallback(container =>
{
    container.Resolve<ResourceCache>().Clear();
});
```

## Scoping

### Scene-based scope hierarchy

Use `EnqueueParent` before loading an additive scene to wire parent–child scope chains:

```csharp
using (LifetimeScope.EnqueueParent(parentScope))
{
    await SceneManager.LoadSceneAsync("GameScene", LoadSceneMode.Additive);
}
```

Queue extra registrations into the incoming scene's scope:

```csharp
using (LifetimeScope.Enqueue(builder => builder.RegisterInstance(runtimeData)))
{
    await SceneManager.LoadSceneAsync("GameScene", LoadSceneMode.Additive);
}
```

Both `EnqueueParent` and `Enqueue` can be combined and nested.

> **Note:** If a `LifetimeScope` has an Inspector-specified parent type and that type is not found when the scene is loaded, an exception is thrown.

### Code-first child scopes

```csharp
// Simple child scope
var childScope = currentScope.CreateChild();

// From a prefab
var childScope = currentScope.CreateChildFromPrefab(prefab);

// With extra registrations
var childScope = currentScope.CreateChild(builder =>
{
    builder.RegisterInstance(levelData);
    builder.RegisterEntryPoint<LevelController>();
});

// Cleanup — MUST call explicitly
childScope.Dispose();
```

Entry points registered in a child scope run immediately after the scope is created.

### Project-root scope

Creates a global parent scope for all scenes in the project (equivalent to ProjectContext in Zenject).

Setup:
1. Create a `LifetimeScope` subclass and register project-wide singletons in `Configure()`.
2. Create a prefab from the component.
3. `Assets → Create → VContainer → VContainer Settings` → assign the prefab as **Root Lifetime Scope**.
4. Verify `VContainerSettings` is listed in `Project Settings → Player → Preload Assets`.

## Entry Points

`RegisterEntryPoint<T>()` wires lifecycle interfaces into Unity's PlayerLoopSystem without requiring a MonoBehaviour.

```csharp
builder.RegisterEntryPoint<GameController>();

class GameController : IStartable, ITickable, IDisposable
{
    void IStartable.Start()    { /* runs at Start() timing */ }
    void ITickable.Tick()      { /* runs every Update() */ }
    void IDisposable.Dispose() { /* runs when scope is destroyed */ }
}
```

**All PlayerLoop interfaces:**

| Interface | Timing | Notes |
|-----------|--------|-------|
| `IInitializable` | Immediately after container build | Before MonoBehaviour.Start |
| `IPostInitializable` | After all `IInitializable` | |
| `IStartable` | MonoBehaviour.Start equivalent | |
| `IAsyncStartable` | Start timing, returns `UniTask` | Requires UniTask; all calls run simultaneously |
| `IPostStartable` | After all `IStartable` | |
| `IFixedTickable` | FixedUpdate | |
| `IPostFixedTickable` | After FixedUpdate | |
| `ITickable` | Update | |
| `IPostTickable` | After Update | |
| `ILateTickable` | LateUpdate | |
| `IPostLateTickable` | After LateUpdate | |
| `IDisposable` | On scope destroy | Applies to Singleton and Scoped lifetimes |

Register a custom exception handler (suppresses default logging):

```csharp
builder.RegisterEntryPointExceptionHandler(ex => Debug.LogException(ex));
```

## Integrations

### UniTask

When `com.cysharp.unitask` is installed, `VCONTAINER_UNITASK_INTEGRATION` is enabled automatically.

```csharp
public class SceneLoader : IAsyncStartable
{
    public async UniTask StartAsync(CancellationToken cancellation)
    {
        await LoadAddressableAsync(cancellation);
    }
}

builder.RegisterEntryPoint<SceneLoader>();
```

- All `StartAsync` calls run **simultaneously** on the main thread — the PlayerLoop does not wait for them.
- The provided `CancellationToken` is cancelled automatically when the parent `LifetimeScope` is destroyed.
- For async initialization before scope build (e.g., loading assets), use `LifetimeScope.Enqueue()` + set `autoRun = false`.

### UniRx

Combine `IStartable` + `IDisposable` with a `CompositeDisposable`:

```csharp
public class FooController : IStartable, IDisposable
{
    readonly CompositeDisposable _disposable = new CompositeDisposable();
    readonly IObservable<Unit> _fooObservable;

    public FooController(IObservable<Unit> fooObservable)
        => _fooObservable = fooObservable;

    void IStartable.Start()
        => _fooObservable.Subscribe(_ => { }).AddTo(_disposable);

    void IDisposable.Dispose() => _disposable.Dispose();
}
```

VContainer's scope disposal automatically calls `IDisposable.Dispose()`, cleaning up all subscriptions.

### ECS / DOTS (experimental, Unity 2019.3+, requires `com.unity.entities`)

**Default World** (method injection only — Systems are managed by Unity, no constructors):

```csharp
builder.RegisterSystemFromDefaultWorld<MySystem>();

// Grouped:
builder.UseDefaultWorld(systems => systems.Add<MySystem>());
```

**Custom World** (constructor injection supported; requires `[DisableAutoCreation]` or `UNITY_DISABLE_AUTOMATIC_SYSTEM_BOOTSTRAP`):

```csharp
builder.RegisterNewWorld("GameWorld", Lifetime.Scoped);
builder.RegisterSystemIntoWorld<MySystem>("GameWorld");

// Grouped:
builder.UseNewWorld("GameWorld", Lifetime.Scoped, systems =>
{
    systems.Add<MovementSystem>();
    systems.Add<CombatSystem>();
});
```

VContainer manages World creation and disposal; Systems are disposed with their World. Single World can be injected directly (`World world`); multiple Worlds require `IEnumerable<World>`.

## Optimization

### Source Generator (Unity 2021.3+, recommended)

Replaces runtime reflection with Roslyn-generated C# code at compile time. More performant and debuggable than IL weaving.

**Setup:**
1. Download `VContainer.SourceGenerator.dll` from GitHub releases.
2. Place in `Assets/`.
3. Select the DLL → add **RoslynAnalyzer** label → disable **Any Platform**, uncheck **Editor** and **Standalone** in Include Platforms.

Target classes must: reference `VContainer.asmdef` + have `[Inject]` attribute or appear in `Register*()` calls.

- `[Inject]` — explicitly include in code generation
- `[InjectIgnore]` — explicitly exclude (falls back to reflection)

Unsupported (fall back to reflection): nested classes, structs, non-public access.

### Async container build

Avoids blocking the main thread during reflection-heavy container construction:

```csharp
lifetimeScope.autoRun = false;

// After scene load:
var lifetimeScope = LifetimeScope.Find<MyLifetimeScope>(scene);
await UniTask.Run(() => lifetimeScope.Build());
```

**Constraint:** `RegisterComponentInHierarchy()` and other Unity API calls must remain in `Awake()` (main thread). Move them there and keep only pure registration logic in `Configure()`.

### Parallel container build

Enable with `VCONTAINER_PARALLEL_CONTAINER_BUILD` compilation flag. VContainer builds the container on multiple threads in parallel.

Only beneficial for large containers — adds overhead for small registration sets. Measure before enabling.

## Registration Method Catalog Lookup

Open `.unikit/memory/stack/references/vcontainer-registration.md` when you need to:
- Choose between `RegisterComponent`, `RegisterComponentInHierarchy`, `RegisterComponentInNewPrefab`, or `RegisterComponentOnNewGameObject`
- Decide whether to use `Register<T>` vs `RegisterInstance` vs delegate registration
- Check lifetime constraints for a specific registration method
- Look up modifier chaining syntax (`.As`, `.AsSelf`, `.AsImplementedInterfaces`, `.WithParameter`, `.UnderTransform`, `.DontDestroyOnLoad`)

## Anti-patterns

- **Field or property injection** — `[Inject]` on a field or property is forbidden on any class, MonoBehaviour or plain. Plain classes receive dependencies through the constructor; MonoBehaviours through `[Inject] public void Construct(...)`.
- **Method injection with a non-`Construct` name or non-public access** — VContainer accepts any `[Inject]` method, but the project convention locks it to `public void Construct(...)` for consistency with other DI stacks and code review.
- **Logic inside `Construct`** — assign fields only. Anything that depends on those fields belongs in `Awake`/`Start` or `IStartable.Start()`.
- **Service Locator via `Resolve<T>()` in classes** — inject dependencies through constructors. Direct resolution is the service-locator anti-pattern; reserve `Resolve` for integration boundary code only.
- **`UnityEngine.Object.Instantiate` instead of `container.Instantiate`** — prefab-based MonoBehaviours must be instantiated via `IObjectResolver.Instantiate(prefab)` to receive injections.
- **Registering MonoBehaviours as Transient** — MonoBehaviour lifetime is tied to its GameObject. Transient creates a new resolved instance each call, but previously created GameObjects remain in the scene.
- **Forgetting to Dispose child scopes** — always call `childScope.Dispose()`; VContainer does not automatically destroy programmatically created child scopes.
- **Registering the same type in parent and child scopes expecting a shared Singleton** — child scope creates its own instance for types it registers. Use the parent scope exclusively for true cross-scope Singletons.
- **Enabling `VCONTAINER_PARALLEL_CONTAINER_BUILD` unconditionally** — the feature adds thread-coordination overhead; only beneficial for containers with many registrations. Benchmark first.
- **Ignoring factory-produced object lifetime** — objects created via `RegisterFactory` are not tracked or disposed by the container. Manage their lifecycle explicitly.
- **`[Key]` without `.Keyed()` registration** — `[Key]` on a constructor/method parameter resolves nothing unless the corresponding implementation was registered with `.Keyed(key)`.
- **Running Unity API in `Configure()` when using async build** — `FindObjectOfType`, `GetComponentInChildren`, etc. must run on the main thread; move them to `Awake()`.
