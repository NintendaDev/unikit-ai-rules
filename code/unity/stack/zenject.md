---
version: 1.0.0
---

# Zenject

> **Scope**: Zenject dependency injection framework for Unity — binding API, container hierarchy, injection methods, installer types, entry points, execution order, and composition root patterns.
> **Load when**: wiring dependencies with Zenject, creating installers or bindings, choosing lifetimes, injecting into MonoBehaviours or plain C# classes, implementing IInitializable/ITickable/IDisposable, debugging container resolution errors, managing scene or project-level container scope.
> **References**: `.unikit/memory/stack/references/zenject-factories.md` (factories), `.unikit/memory/stack/references/zenject-memorypools.md` (memory pools), `.unikit/memory/stack/references/zenject-signals.md` (signals), `.unikit/memory/stack/references/zenject-subcontainers.md` (sub-containers), `.unikit/memory/stack/references/zenject-automocking.md` (auto-mocking in tests), `.unikit/memory/stack/references/zenject-async.md` (async initialization).

---

## Core Concepts

Zenject is a lightweight dependency injection (DI) framework for Unity. The core component is `DiContainer` — it holds all bindings and resolves object graphs automatically. Never use `new` for objects that should be injected; always let the container construct them.

All DI wiring happens in **Installers** (the composition root). Classes that need dependencies declare them in constructors or via `[Inject]` — they must not know how their dependencies are created.

## Container Types

| Container | Scope | How to set up |
|-----------|-------|---------------|
| `ProjectContext` | Global — app lifetime, survives scene loads | Place a prefab at `Assets/Resources/ProjectContext` |
| `SceneContext` | Scene lifetime | Add `SceneContext` component to a scene GameObject and assign Installers |
| `GameObjectContext` | Prefab/GameObject scope | Add `GameObjectContext` component to the root of a prefab |

Container hierarchy: `ProjectContext` → `SceneContext` → `GameObjectContext`. Child containers inherit all parent bindings; parent containers cannot access child bindings.

## Binding API

```csharp
Container.Bind<ContractType>()
    .WithId(identifier)                 // optional — distinguish multiple bindings of same type
    .To<ConcreteType>()                 // what to create; omit → binds contract to itself
    .FromNew()                          // how: new() — default for plain classes
    .FromInstance(instance)             // how: bind an existing instance
    .FromComponentInHierarchy()         // how: find MonoBehaviour in scene hierarchy
    .FromComponentInNewPrefab(prefab)   // how: instantiate a prefab and get component
    .AsSingle()                         // lifetime: one shared instance per container
    .AsTransient()                      // lifetime: new instance for every injection
    .AsCached()                         // lifetime: one instance per requesting type
    .WhenInjectedInto<T>()              // condition: inject only into T
    .WithArguments(args)                // supply extra constructor arguments
    .NonLazy();                         // create immediately at container build time
```

**Shortcut bindings:**
```csharp
// Bind all interfaces T implements to a single instance
Container.BindInterfacesTo<AudioManager>().AsSingle();

// Bind interfaces AND the concrete type (use when other classes need the concrete type)
Container.BindInterfacesAndSelfTo<GameController>().AsSingle();

// Bind an existing instance (implicit AsSingle)
Container.BindInstance(mySettings);

// Bind multiple contract types to the same implementation
Container.Bind(typeof(IFoo), typeof(IBar)).To<FooBar>().AsSingle();
```

## Lifetimes

| Method | Behavior | When to use |
|--------|----------|-------------|
| `AsSingle()` | One instance shared across the entire container | Services, managers, stateful singletons |
| `AsTransient()` | New instance for every injection point | Stateless utilities, value objects |
| `AsCached()` | One instance per requesting type | Rarely needed — prefer Single or Transient |

Default when no lifetime is specified is `AsSingle()`. For `BindFactory` / `BindMemoryPool`, the default is `AsCached()`.

## Binding Conventions

**Use `NonLazy()` for controllers and presenters.** Controllers (GRASP pattern) and presenters (MVP Passive View) drive behaviour on their own — nothing requests them as dependencies. Without `NonLazy()` the container never instantiates them and their logic silently never runs.

```csharp
Container.BindInterfacesAndSelfTo<GameFlowController>().AsSingle().NonLazy();
Container.BindInterfacesTo<HudPresenter>().AsSingle().NonLazy();
```

Apply the same pattern to any class whose sole purpose is to observe/react (entry points that are not reached via `IInitializable`/`ITickable` interfaces).

## Injection Methods

Only two forms of injection are allowed. Every other form (field injection, property injection, method named anything other than `Construct`, non-public `Construct`) is an **anti-pattern** — see the "Anti-patterns" section.

1. **Constructor injection** — MUST be used for every non-MonoBehaviour class.
2. **`[Inject] public void Construct(...)`** — MUST be used for every MonoBehaviour.

> **Installers are exempt.** `MonoInstaller`, `ScriptableObjectInstaller<T>`, and `Installer<T>` register dependencies inside `InstallBindings()`; they do not receive injections themselves.

### Constructor injection (plain C# classes)

```csharp
public class ScoreCalculator
{
    readonly GameSettings _settings;
    readonly ILogger _logger;

    public ScoreCalculator(GameSettings settings, ILogger logger)
    {
        _settings = settings;
        _logger = logger;
    }
}
```

Mark injected fields `readonly`. Never place `[Inject]` on fields or properties of plain C# classes.

**A plain C# class used by Zenject MUST have exactly one constructor.** Multiple overloads cause ambiguous resolution; refactor to a single canonical constructor with optional parameters or factory methods.

### Method injection (MonoBehaviours only)

The injection method MUST be named `Construct`, MUST be `public`, MUST carry `[Inject]`, and MUST be the **first method declared in the class** (above Unity lifecycle methods and any other members):

```csharp
public class Ship : MonoBehaviour
{
    ShipStateFactory _stateFactory;

    [Inject]
    public void Construct(ShipStateFactory stateFactory)
    {
        _stateFactory = stateFactory;
    }

    void Awake() { /* ... */ }
    void Start() { /* ... */ }
}
```

`Construct` runs before `Awake` and `Start`. Keep it logic-free — only assign fields. Put initialization logic in `Awake`/`Start`, where injected fields are already populated.

ID-based or optional dependencies go on `Construct` **parameters**, never on fields:

```csharp
[Inject]
public void Construct(
    [Inject(Id = "PlayerSpawn")] Transform spawn,
    [InjectOptional] ILogger logger = null)
{
    _spawn = spawn;
    _logger = logger;
}
```

## Installer Types

| Type | Use case |
|------|----------|
| `MonoInstaller` | Scene or prefab installers — attach as a component to a GameObject |
| `ScriptableObjectInstaller<T>` | Data-driven config installers — reusable assets, editable in Inspector |
| `Installer<T>` | Pure C# sub-installers — no Unity dependency, composable via `Installer<T>.Install(Container)` |

**MonoInstaller** (most common):
```csharp
public class GameInstaller : MonoInstaller
{
    [SerializeField] GameSettings _settings;

    public override void InstallBindings()
    {
        Container.BindInstance(_settings).AsSingle();
        Container.BindInterfacesAndSelfTo<GameController>().AsSingle();
        Container.Bind<ILogger>().To<UnityLogger>().AsSingle();
    }
}
```

**ScriptableObjectInstaller**:
```csharp
[CreateAssetMenu(fileName = "SettingsInstaller", menuName = "Installers/Settings")]
public class SettingsInstaller : ScriptableObjectInstaller<SettingsInstaller>
{
    public GameSettings Settings;

    public override void InstallBindings()
    {
        Container.BindInstance(Settings).AsSingle();
    }
}
```

**Reusable sub-installer** (called from another installer):
```csharp
public class AudioInstaller : Installer<AudioInstaller>
{
    public override void InstallBindings()
    {
        Container.Bind<IAudioService>().To<FmodAudioService>().AsSingle();
    }
}

// In parent installer:
AudioInstaller.Install(Container);
```

## Installer Organization

Structure installers by scope and concern:

- **One central project installer** mounts on the `ProjectContext` prefab and composes feature installers for global, app-lifetime services.
- **Feature installers** — author each cross-cutting concern (audio, remote config, localization, persistence) as its own `ScriptableObjectInstaller<T>` (when it exposes serialized configuration) or `Installer<T>` (pure C#). The project installer calls them via `Installer<T>.Install(Container)` or references the ScriptableObject asset directly.
- **Global services** (anything needed across scenes) MUST be registered from the project installer, not from a scene installer.
- **Scene installers** live next to their scenes and register scene-scoped dependencies only.
- **UI installers are separate from service installers.** Never mix view/presenter bindings with domain-service bindings in one installer — split so the UI layer can change without touching service wiring.

```csharp
// ✅ Project installer composes feature installers — no inline domain bindings
public sealed class GameProjectInstaller : MonoInstaller
{
    public override void InstallBindings()
    {
        RemoteConfigInstaller.Install(Container);
        LocalizationInstaller.Install(Container);
        AudioInstaller.Install(Container);
    }
}

// ✅ Feature installer encapsulates a single concern
public sealed class RemoteConfigInstaller : Installer<RemoteConfigInstaller>
{
    public override void InstallBindings()
    {
        Container.BindInterfacesAndSelfTo<GameRemoteConfig>().AsSingle();
        // feature-specific bindings only
    }
}
```

## Entry Points

Implement these interfaces on services to receive automatic lifecycle callbacks. Bind with `BindInterfacesAndSelfTo<T>()` to register all interfaces at once.

| Interface | Equivalent | When called |
|-----------|-----------|-------------|
| `IInitializable` | `Start()` | Once, after all injections are complete |
| `ITickable` | `Update()` | Every frame |
| `ILateTickable` | `LateUpdate()` | After all `Tick()` calls |
| `IFixedTickable` | `FixedUpdate()` | Fixed physics timestep |
| `IDisposable` | `OnDestroy()` | Container disposed (scene unload, app quit) |
| `IGuiRenderable` | `OnGUI()` | GUI rendering pass |

```csharp
public class GameController : IInitializable, ITickable, IDisposable
{
    readonly SignalBus _signalBus;

    public GameController(SignalBus signalBus) => _signalBus = signalBus;

    public void Initialize() => _signalBus.Subscribe<PlayerDiedSignal>(OnPlayerDied);
    public void Tick() { /* per-frame logic */ }
    public void Dispose() => _signalBus.Unsubscribe<PlayerDiedSignal>(OnPlayerDied);

    void OnPlayerDied() { /* ... */ }
}
```

## Execution Order

Control the order `IInitializable`, `ITickable`, and `IDisposable` are called with `BindExecutionOrder<T>(priority)`. **Lower numbers run first.** Default is 0.

```csharp
Container.BindExecutionOrder<InputManager>(-30);
Container.BindExecutionOrder<PhysicsManager>(-20);
Container.BindExecutionOrder<GameController>(-10);
// UIManager runs at 0 (default)
// CleanupService runs at 10 (after everything else)
Container.BindExecutionOrder<CleanupService>(10);
```

## Validation

Zenject validates the dependency graph at edit-time (via the Validate menu or `CTRL+SHIFT+V` in the editor). Enable validation to catch missing bindings before entering Play Mode. To validate custom factories that use `DiContainer.Instantiate` directly, implement `IValidatable`.

## Subsystem Lookup Workflow

When the task involves a Zenject subsystem, open the appropriate reference file:

1. **Factories** (`PlaceholderFactory`, `BindFactory`, runtime object creation) → open `zenject-factories.md`
2. **Memory Pools** (`MemoryPool<T>`, `MonoMemoryPool`, `Spawn`/`Despawn`) → open `zenject-memorypools.md`
3. **Signals** (`SignalBus`, `DeclareSignal`, `Fire`, `Subscribe`) → open `zenject-signals.md`
4. **Sub-containers / Facades** (`GameObjectContext`, `FromSubContainerResolve`) → open `zenject-subcontainers.md`
5. **Auto-mocking in tests** (`FromMock`, `FromSubstitute`) → open `zenject-automocking.md`
6. **Async initialization** (`AsyncInject<T>`, `BindAsync`) → open `zenject-async.md`

Do NOT guess — always open the relevant reference file before writing factory, pool, signal, or sub-container code.

## Anti-patterns

- **Never inject `DiContainer` into non-factory/non-installer classes.** This is the Service Locator anti-pattern. The only valid exception is factory classes.
- **Never use field or property injection.** `[Inject]` on a field or property — on any class, MonoBehaviour or plain — is forbidden. Plain classes receive dependencies through the constructor; MonoBehaviours through `[Inject] public void Construct(...)`.
- **Never name the MonoBehaviour injection method anything but `Construct`.** Zenject accepts any `[Inject]` method name, but the project convention is `Construct` for discoverability and consistency across installers and reviews.
- **Never make `Construct` non-public.** Must be `public void Construct(...)`.
- **Never put logic in `Construct`.** Only assign fields. Any setup that depends on injected state belongs in `Awake`/`Start`.
- **`Construct` must be the first method declared in the class.** Placing it below Unity lifecycle methods or other members hides the dependency contract at the top of the file.
- **Plain C# classes used by Zenject must have exactly one constructor.** Multiple constructors create ambiguity in resolution; refactor to a single canonical constructor.
- **Never call `Container.Resolve<T>()` outside installers or factories.** Resolve only at the composition root.
- **Never register a controller or presenter without `NonLazy()`.** They have no consumers — without `NonLazy()` the container never instantiates them and their logic never runs.
- **Don't bind the same type twice without `WithId()`.** Later bindings silently override earlier ones.
- **Don't use `AsTransient()` for MonoBehaviours** unless you manage their `Destroy` lifecycle explicitly.
- **Don't mix UI bindings and service bindings in the same installer.** Split UI installers from service installers so either layer can change independently.
- **Don't skip `SignalBusInstaller.Install(Container)`** before declaring signals — it causes a runtime exception.
- **Don't call `Spawn()` without a matching `Despawn()`** when using memory pools — causes unbounded pool growth.
