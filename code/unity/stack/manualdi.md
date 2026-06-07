---
version: 1.0.0
---

# ManualDI

> **Scope**: ManualDI dependency injection framework for Unity/C# — binding and resolving dependencies via `DiContainerBindings`, container lifecycle management, Unity3D integration via `MonoBehaviourInstaller`, `MonoBehaviourRootEntryPoint`, and `MonoBehaviourSubordinateEntryPoint`.
> **Load when**: wiring DI with ManualDI — creating `DiContainerBindings`, binding services with `Bind<>/Default()/FromConstructor()`, resolving dependencies, setting up Unity entry points (`MonoBehaviourRootEntryPoint` / `MonoBehaviourSubordinateEntryPoint`), authoring `MonoBehaviourInstaller` or `ScriptableObjectInstaller`, managing container lifecycle and disposal, debugging resolution failures, choosing between sync and async container variants.

---

## Core Concepts

### Container Lifecycle Phases

1. **Binding Phase** — configure the container in `DiContainerBindings`
2. **Building Phase** — resolve and construct the full object graph (`.Build()`)
3. **Startup Phase** — startup callbacks run in reverse-dependency order
4. **Alive Phase** — container ready for use
5. **Disposal Phase** — `IDisposable` / `IAsyncDisposable` objects auto-disposed

### Apparent vs. Concrete Types

- **Apparent type** — the interface/type used to resolve (left generic argument)
- **Concrete type** — the actual implementation class (right generic argument)
- One concrete instance can satisfy multiple apparent types via multi-type bind

### Lifetime Scopes

- **Single** (default) — one instance per container lifetime
- **Transient** (sync-only) — new instance per resolution call
- **Scoped** — create a child sub-container for an isolated scope

---

## Container Setup

```csharp
// Sync variant
using DiContainer container = new DiContainerBindings()
    .Install(b => { /* bindings */ })
    .Build();

// Async variant (recommended for Unity — supports async initialization)
await using DiContainer container = await new DiContainerBindings()
    .Install(b => { /* bindings */ })
    .Build(cancellationToken);
```

---

## Binding API

Basic pattern:

```csharp
b.Bind<TApparent, TConcrete>()
    .Default()          // auto-wire full lifecycle via source generation
    .FromConstructor(); // resolve constructor params from container
```

### Key Binding Modifiers

- `.Default()` — automatically registers `Inject()`, `Initialize()`, `InitializeAsync()`, `IDisposable`, `IAsyncDisposable` via source generation. **Always prefer `.Default()` over manual `.Inject()/.Initialize()/.Dispose()` chains.**
- `.Transient()` — sync variant only; creates a new instance on every `Resolve<>()` call
- `.WithId(id)` — tag this binding for conditional resolution via `InjectedIntoId`
- `.When(x => x.InjectedIntoType<T>())` — resolve this binding only when injecting into a specific type

### Construction Strategies

| Method | Use case |
|--------|---------|
| `FromConstructor()` | Standard DI — constructor parameters resolved from container |
| `FromInstance(obj)` | Pre-built object; container does not own construction |
| `FromMethod(c => ...)` | Custom factory; receives container to resolve its own deps |
| `FromMethodAsync(async (c, ct) => ...)` | Async factory with `CancellationToken` |
| `FromContainerResolve()` | Alias/remap an existing binding to another apparent type |
| `FromGameObjectAddComponent(go)` | Add component to existing `GameObject` |
| `FromInstantiateComponent(prefab, parent)` | Instantiate prefab and get component |
| `FromLoadSceneAsyncGetComponent("Scene")` | Load scene and retrieve a root component |
| `FromAddressablesLoadAssetAsync("key")` | Load asset via Unity Addressables |
| `FromObjectResource("path")` | Load from `Resources` folder |

---

## Injection & Initialization Methods

Only two forms of injection are allowed:

1. **Constructor injection** — MUST be used for every non-MonoBehaviour class.
2. **`public void Inject(...)` method** — MUST be used for every MonoBehaviour (and is the only way to break a genuine cyclic dependency; see "Cyclic Dependencies" below).

Any other form (field injection, property injection, method named anything other than `Inject`, non-public `Inject`) is an **anti-pattern** — see "Anti-Patterns" below.

> The method name `Inject` is a **source-generator contract**, not a convention — `.Default()` discovers it by name. Renaming it disables auto-wiring. Other DI stacks in this project use `Construct`; ManualDI is the exception because the generator is name-sensitive.

> **Installers are exempt.** `MonoBehaviourInstaller`, `ScriptableObjectInstaller`, and static installer extension methods register dependencies; they do not receive injections themselves.

ManualDI uses "duck typing via source generation" — place these methods on your class and `.Default()` wires them automatically:

```csharp
// Constructor — plain C# classes resolve all dependencies here
public MyService(IService service, ILogger logger) { ... }

// Post-construction dependency assignment — MonoBehaviours only (or cyclic dep breaks)
public void Inject(IService service, ILogger logger) { ... }

// Synchronous initialization (runs after all Inject() calls in the container)
public void Initialize() { ... }

// Async initialization (runs during async Build, supports async/await)
public async UniTask InitializeAsync(CancellationToken ct) { ... }

// Cleanup — implement IDisposable or IAsyncDisposable for auto-disposal
public void Dispose() { ... }
```

**Execution order guarantee:** dependencies are fully initialized before their dependents run `Initialize()` — uses reverse-dependency order.

---

## Resolving Dependencies

```csharp
T instance     = container.Resolve<T>();               // throws if not found
T? instance    = container.ResolveNullable<T>();        // null if not found
bool ok        = container.TryResolve<T>(out T inst);  // bool + out param
List<T> all    = container.ResolveAll<T>();             // all bindings of T
int? val       = container.ResolveNullableValue<int>(); // for value types
```

Prefer constructor injection over runtime `Resolve<>()` calls. Call `Resolve<>()` only from factories or entry points, never from service classes.

---

## Startup Hooks

```csharp
b.QueueStartup<T>(svc => svc.Run());
b.QueueStartup<T>(async (svc, ct) => await svc.RunAsync(ct));
```

Startup callbacks run after the entire object graph is built and initialized. Use them for application-level bootstrapping instead of `MonoBehaviour.Start()`.

---

## Installer Pattern

Use **static extension methods** for zero-allocation installers. Avoid instance-based installer objects — they allocate on the heap.

```csharp
static class FeatureInstaller
{
    public static DiContainerBindings InstallFeature(
        this DiContainerBindings b)
    {
        b.Bind<ServiceA>().Default().FromConstructor();
        b.Bind<ServiceB>().Default().FromConstructor();
        return b;
    }
}

// Usage
new DiContainerBindings()
    .Install(b => b.InstallFeature())
    .Build();
```

---

## Sub-Containers

```csharp
// Child sub-container — inherits parent bindings
b.BindSubContainer<Enemy>(sub => {
    sub.Bind<Enemy>().Default().FromInstance(enemy);
    sub.Bind<SubDep>().Default().FromConstructor();
});

// Isolated sub-container — no access to parent bindings
b.BindIsolatedSubContainer<Enemy>(sub => {
    sub.Bind<Enemy>().Default().FromInstance(enemy);
});
```

Use child sub-containers for per-entity scopes (enemies, rooms, sessions) that need parent services. Use isolated for fully self-contained subsystems.

---

## Multiple Apparent Types

```csharp
// Single instance resolves for both IFirst and ISecond
b.Bind<IFirst, ISecond, Implementation>()
    .Default()
    .FromConstructor();
```

---

## Conditional Resolution

```csharp
b.Bind<int>().FromInstance(1).When(x => x.InjectedIntoType<ClassA>());
b.Bind<int>().FromInstance(2).When(x => x.InjectedIntoType<ClassB>());
```

Use `.When()` sparingly. When more than 2–3 conditions stack up, prefer a factory delegate or a dedicated configuration object.

---

## Cyclic Dependencies

Design away cyclic dependencies first. If unavoidable, break the cycle with an `Inject()` method on the dependent:

```csharp
public class A(B b) { }
public class B
{
    // B is constructed first; A is injected after construction
    public void Inject(A a) { _a = a; }
}

// Async container: mark the cyclic parameter explicitly
public void Inject([CyclicDependency] A a) { _a = a; }
```

---

## Unity3D Integration

### Installers

Expose serialized `UnityEngine.Object` references via installer MonoBehaviours. Keep Unity objects out of service classes.

```csharp
public class UIInstaller : MonoBehaviourInstaller
{
    [SerializeField] private Image _healthBar;
    [SerializeField] private Toggle _soundToggle;

    public override void Install(DiContainerBindings b)
    {
        b.Bind<Image>().FromInstance(_healthBar);
        b.Bind<Toggle>().FromInstance(_soundToggle);
    }
}

public class SettingsInstaller : ScriptableObjectInstaller
{
    public override void Install(DiContainerBindings b) { ... }
}
```

### Entry Points

**Root entry point** — self-contained scene or app root:

```csharp
class GameInit : MonoBehaviourRootEntryPoint
{
    public override void Install(DiContainerBindings b)
    {
        b.Install(b => b.InstallGame());
        b.QueueStartup<GameController>(gc => gc.StartGame());
    }
}
```

**Subordinate entry point** — receives external data, produces a facade:

```csharp
class LevelSetup : MonoBehaviourSubordinateEntryPoint<LevelData, LevelFacade>
{
    public override void Install(DiContainerBindings b)
    {
        b.Bind<LevelData>().FromInstance(Data);
        b.Bind<LevelFacade>().Default().FromConstructor();
    }
}

// Trigger from parent code:
LevelFacade facade = levelSetup.Initiate(new LevelData { ... });
```

### Runtime Configuration During Binding

Resolve already-bound instances during the binding phase to drive conditional registration:

```csharp
b.Bind<Config>().FromInstance(new Config(enabled: true));

var config = b.ResolveInstance<Config>();
if (config.Enabled)
    b.Bind<IFeature, EnabledFeature>().Default().FromConstructor();
else
    b.Bind<IFeature, DisabledFeature>().Default().FromConstructor();
```

### Failure Debug Report

Enable during development to diagnose construction order failures:

```csharp
try
{
    await using var container = await new DiContainerBindings()
        .Install(b => { ... })
        .WithFailureDebugReport()
        .Build(cancellationToken);
}
catch (Exception e)
{
    var report = (string)e.Data[DiContainer.FailureDebugReportKey];
    Debug.LogError(report); // shows full resolution and initialization order
}
```

---

## Best Practices

1. **Always call `.Default()`** — it auto-wires the full lifecycle. Only omit it when you need explicit control over inject/initialize/dispose.
2. **Use static extension method installers** — avoids GC allocations from instance-based installer objects.
3. **Use constructor injection for every non-MonoBehaviour class, `Inject()` for every MonoBehaviour.** The only exception to constructor-only for plain classes is breaking a genuine cyclic dependency (see "Cyclic Dependencies"). Field and property injection are forbidden.
4. **Keep `Inject()` logic-free** — assign fields only. Move any computation to `Initialize()`.
5. **Never use `Awake()` / `Start()` for dependency setup** — use `Inject()` and `Initialize()` for guaranteed, ordered initialization.
6. **Serialize `UnityEngine.Object` references in installers**, not in service classes — keeps Unity coupling contained.
7. **Validate the graph at startup** — ManualDI detects missing bindings during `Build()`, not at runtime. Treat build failures as compile errors.
8. **Enable `.WithFailureDebugReport()`** in development to trace initialization order failures.
9. **Use sub-containers for per-entity scopes** (enemies, sessions, levels) rather than ad-hoc factory patterns.
10. **Prefer `FromConstructor()` over `FromMethod()`** unless custom construction logic is genuinely needed.

---

## Anti-Patterns

- **Field or property injection** — ManualDI has no field/property injection attribute, and custom reflection-based injection defeats source generation. Plain classes MUST use the constructor; MonoBehaviours MUST use `public void Inject(...)`.
- **Method injection with a non-`Inject` name or non-public access** — the source generator discovers the method by name. Any other name (e.g. `Construct`, `Setup`) breaks `.Default()` auto-wiring.
- **Service Locator in service classes** — calling `container.Resolve<>()` inside a service class is Service Locator, not DI. Inject all dependencies via constructor or `Inject()`.
- **Logic in `Inject()`** — `Inject()` is strictly for field assignment. Computation and side effects belong in `Initialize()`.
- **Lazy bindings** — ManualDI intentionally omits lazy loading. It hides initialization order bugs. Restructure the dependency graph instead.
- **Overusing `.WithId()`** — creates tight coupling between provider and consumer. Prefer factory delegates or typed wrapper objects.
- **Multiple same-type bindings without `.When()` constraints** — produces ambiguous resolution errors. Add `.When()` constraints whenever you bind the same type more than once.
- **Splitting source-generated classes across files** — the source generator requires a single partial class declaration per file.
- **Using reflection alongside ManualDI** — defeats source generation and negates all performance benefits.
