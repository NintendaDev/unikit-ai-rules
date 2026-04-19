---
version: 1.0.0
---

# Reflex

> **Scope**: Reflex dependency injection framework for Unity — container hierarchy, registration and resolution API, injection patterns (constructor / attribute / source-generated), scope lifecycle, installer authoring, runtime injection utilities, and IL2CPP considerations.
> **Load when**: wiring DI with Reflex — creating installers, registering services, choosing lifetimes (Singleton/Scoped/Transient), injecting into MonoBehaviours or plain C# classes, authoring RootScope/SceneScope, resolving containers at runtime, injecting manually instantiated prefabs, debugging container state with the Reflex Debugger.

---

## Container Hierarchy

Reflex uses a two-level default hierarchy:

- **Root Container** (`ProjectScope` / `ReflexSettings`): application-wide, shared across all scenes. Lazily created on first scene load.
- **Scene Container** (`SceneScope`): per-scene, inherits from root. Created when the scene loads; requires a `ContainerScope` GameObject in the scene hierarchy.

Scene containers can be nested (a scene container inheriting from another scene container) via `ContainerScope.OnSceneContainerBuilding`.

Containers are **immutable and thread-safe** after build.

## Setup

1. Create `ReflexSettings` ScriptableObject in `Assets/Resources/`.
2. Create a **Root Installer** prefab — a `MonoBehaviour : IInstaller` — and add it to `ReflexSettings.RootScopes`.
3. Add a **`ContainerScope`** component to a GameObject in each scene that needs DI.
4. Attach a **Scene Installer** (`IInstaller`) to the `ContainerScope`.

```csharp
public class GameInstaller : MonoBehaviour, IInstaller
{
    public void InstallBindings(ContainerBuilder builder)
    {
        builder.RegisterValue<ISettings>(settings);
        builder.RegisterType<AudioService>(Lifetime.Singleton);
        builder.RegisterFactory<IData>(_ => new DataService(), Lifetime.Scoped);
    }
}
```

> Since v8.0.0 Reflex no longer auto-injects any scene. A `ContainerScope` GameObject is **required** in every scene that uses DI.

## Registration API

Use `ContainerBuilder` inside `IInstaller.InstallBindings`:

| Method | Purpose | Notes |
|--------|---------|-------|
| `RegisterValue<T>(instance)` | Pre-created object | Always **Singleton**; lifetime parameter ignored |
| `RegisterType<T>(lifetime)` | Container constructs via constructor | Supports all lifetimes |
| `RegisterFactory<T>(factory, lifetime)` | Custom creation delegate | Full control over construction |

Registration with a contract type:

```csharp
builder.RegisterType<AudioService>(Lifetime.Singleton).As<IAudioService>();

// expose under multiple contracts
builder.RegisterType<AudioService>(Lifetime.Singleton).As<IAudioService>().AsSelf();
```

**Lifetimes:**

| Lifetime | Behaviour |
|----------|-----------|
| `Singleton` | One instance per container hierarchy (root or scene) |
| `Scoped` | One instance per owning container |
| `Transient` | New instance on every resolution |

**Resolution timing** (optional parameter to `RegisterType` / `RegisterFactory`):

| Timing | Behaviour |
|--------|-----------|
| `Lazy` *(default)* | Created on first resolve |
| `Eager` | Created at container build time |

## Injection Patterns

Only two forms of injection are allowed. Every other form (field injection, property injection, method named anything other than `Construct`, non-public `Construct`, `[SourceGeneratorInjectable]`) is an **anti-pattern** — see the "Anti-patterns" section.

1. **Constructor injection** — MUST be used for every non-MonoBehaviour class.
2. **`[Inject] public void Construct(...)`** — MUST be used for every MonoBehaviour.

> **Installers are exempt.** `IInstaller` implementations (including `MonoBehaviour, IInstaller`) register dependencies inside `InstallBindings()`; they do not receive injections themselves.

### Constructor Injection (plain C# classes)

Dependencies are resolved from constructor parameters automatically — no attributes required.

```csharp
public class AudioService : IAudioService
{
    private readonly ISettings _settings;

    public AudioService(ISettings settings)
    {
        _settings = settings;
    }
}
```

Use `[ReflexConstructor]` when a class has multiple constructors to indicate which one Reflex should use. Never place `[Inject]` on fields or properties of plain classes.

### Method Injection (MonoBehaviours only)

The injection method MUST be named `Construct`, MUST be `public`, and MUST carry `[Inject]`:

```csharp
public class HudView : MonoBehaviour
{
    private IScoreService _scoreService;
    private IInputManager _inputManager;

    [Inject]
    public void Construct(IScoreService scoreService, IInputManager inputManager)
    {
        _scoreService = scoreService;
        _inputManager = inputManager;
    }
}
```

- Reflex technically accepts `[Inject]` on fields, properties, and methods with any name — the project convention strictly forbids those paths.
- `Construct` runs after the container finishes building. Keep it logic-free — only assign fields. Use `Awake`/`Start` for setup that depends on injected state.
- `[SourceGeneratorInjectable]` relies on field injection and is therefore **forbidden** in this project (see Anti-patterns).

## Resolution API

Resolve from `Container` (or `IContainer`) injected into a class or accessed via `ContainerScope.Container`:

| Method | Behaviour |
|--------|-----------|
| `container.Resolve<T>()` | Returns last registered binding; no uniqueness validation |
| `container.Single<T>()` | Validates exactly one binding exists; throws if 0 or 2+ |
| `container.All<T>()` | Returns all registered bindings as `IEnumerable<T>` |

Prefer `Single<T>()` when only one implementation should be registered — it guards against accidental duplicate bindings at startup.

## Runtime Injection (Manually Instantiated Objects)

For prefabs or objects instantiated outside the container:

```csharp
// inject all MonoBehaviours on root + entire child hierarchy
GameObjectInjector.InjectRecursive(go, container);

// inject a non-MonoBehaviour instance (field/property/method injection)
AttributeInjector.Inject(instance, container);

// construct a new non-MonoBehaviour instance resolving constructor parameters
var obj = ConstructorInjector.Construct<MyClass>(container);
```

| `GameObjectInjector` method | Scope |
|-----------------------------|-------|
| `InjectSingle(go, container)` | First MonoBehaviour on `go` |
| `InjectObject(go, container)` | All MonoBehaviours on `go` (no children) |
| `InjectRecursive(go, container)` | `go` + entire child hierarchy |
| `InjectRecursiveMany(gos, container)` | Multiple root GameObjects + children |

## Selective Resolution (Multiple Bindings of the Same Type)

Reflex has no named bindings. Use typed wrapper classes to disambiguate:

```csharp
public class AppName : TypedInstance<string>
{
    public AppName(string value) : base(value) { }
}

public class AppVersion : TypedInstance<string>
{
    public AppVersion(string value) : base(value) { }
}

// Consumer resolves each wrapper type independently
public class AppWindow
{
    public AppWindow(AppName name, AppVersion version) { }
}
```

## Manual Scoping

Create child containers at runtime:

```csharp
var childContainer = parentContainer.Scope(builder =>
{
    builder.RegisterType<LevelService>(Lifetime.Scoped);
});
```

## Container Events

| Event | When it fires |
|-------|--------------|
| `ContainerScope.OnRootContainerBuilding` | Before root container is built |
| `ContainerScope.OnSceneContainerBuilding` | Before scene container is built; use to override parent |
| `ContainerBuilder.OnContainerBuilt` | Callback fired after build completes |

## Debugging

Enable the Reflex Debugger: **Window → Analysis → Reflex Debugger** (Ctrl+E).

Add `REFLEX_DEBUG` to **Player → Scripting Define Symbols** for full diagnostics (construction call stacks, resolution counts). Remove in production — the symbol adds measurable overhead.

## Anti-patterns

- **Field or property injection.** `[Inject]` on a field or property is forbidden on any class. Plain classes receive dependencies through the constructor; MonoBehaviours through `[Inject] public void Construct(...)`.
- **Method injection with a non-`Construct` name or non-public access.** Reflex accepts any method name, but the project convention locks it to `public void Construct(...)`.
- **`[SourceGeneratorInjectable]`.** It only optimises field injection, which this project forbids. If reflection overhead becomes a measured bottleneck, pre-resolve dependencies via `Construct` and cache them in fields — do not add the attribute.
- **Logic inside `Construct`.** Assign fields only; put initialization in `Awake`/`Start`.
- **Skipping `ContainerScope` in a scene.** Since v8.0.0 a `ContainerScope` GameObject is required in every scene — forgetting it silently leaves all MonoBehaviours uninjected.
- **Missing `ReflexSettings` in Resources.** The asset must exist at `Assets/Resources/` — its absence causes a runtime error on first scene load.
- **Using `Resolve<T>()` when uniqueness matters.** Prefer `Single<T>()` — `Resolve<T>()` silently returns the last registered binding even when duplicates exist.
- **Accessing injected dependencies in `OnDestroy`.** Unity does not call `OnDestroy` deterministically; injected services may already be disposed. Move cleanup to `IDisposable` resolved by the container.
- **`IEnumerable<T>` injection on IL2CPP.** Causes an AOT compilation error. Workaround — add a preserved hint method:
  ```csharp
  [Preserve]
  static void AotHint() => Array.Empty<MyType>().Cast<MyType>();
  ```
- **Multiple `ContainerScope` components in one scene.** Only one is supported per scene — multiple instances cause undefined behaviour.
- **Leaving `REFLEX_DEBUG` enabled in production.** Remove the scripting define before release builds.
- **Unloading a parent container before its children.** Child containers hold references into the parent; always dispose children first.
