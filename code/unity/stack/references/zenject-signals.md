# Zenject — Signals

> See also: [zenject.md](../zenject.md)

Signals provide loosely-coupled event communication between classes. Use them when multiple receivers need notification and the sender doesn't need a response.

---

## Setup

Install `SignalBus` once per container. For project-wide signals, install in `ProjectContext`. For scene-scoped signals, install in the scene installer.

```csharp
public class GameInstaller : MonoInstaller
{
    public override void InstallBindings()
    {
        SignalBusInstaller.Install(Container);
        Container.DeclareSignal<PlayerDiedSignal>();
        Container.DeclareSignal<WeaponEquippedSignal>();
    }
}
```

**Never skip `SignalBusInstaller.Install(Container)`** — firing or subscribing to an undeclared signal throws a runtime exception.

## Signal Declaration

A signal is a plain C# class or struct. Use a class for signals with data, a parameterless class for event-only signals:

```csharp
// Event-only signal
public class PlayerDiedSignal { }

// Signal with data
public class WeaponEquippedSignal
{
    public Player Player { get; }
    public IWeapon Weapon { get; }

    public WeaponEquippedSignal(Player player, IWeapon weapon)
    {
        Player = player;
        Weapon = weapon;
    }
}
```

## DeclareSignal Options

```csharp
Container.DeclareSignal<SignalType>()
    .WithId(identifier)
    .OptionalSubscriber()               // allow firing with no listeners (default)
    .OptionalSubscriberWithWarning()    // allow but log a warning
    .RequireSubscriber()                // throw if no listener when fired
    .RunSync()                          // synchronous dispatch (default)
    .RunAsync()                         // deferred to next tick
    .WithTickPriority(priority)         // async only: when in the frame to run
    .CopyIntoAllSubContainers();        // make signal available in child containers
```

## Firing Signals

```csharp
public class WeaponController : IInitializable
{
    readonly SignalBus _signalBus;

    public WeaponController(SignalBus signalBus) => _signalBus = signalBus;

    public void EquipWeapon(IWeapon weapon)
    {
        // ...
        _signalBus.Fire(new WeaponEquippedSignal(this, weapon));
    }

    public void OnPlayerDied()
    {
        _signalBus.Fire<PlayerDiedSignal>(); // parameterless signal
    }
}
```

| Method | Behavior |
|--------|----------|
| `Fire<T>()` / `Fire(new T(...))` | Standard — throws if signal not declared |
| `TryFire<T>()` / `TryFire(new T(...))` | Silent — ignores undeclared signals |
| `AbstractFire<T>()` | Fire by interface type (for abstract signals) |

## Subscribing to Signals

**Via `IInitializable` / `IDisposable`** (recommended):
```csharp
public class Greeter : IInitializable, IDisposable
{
    readonly SignalBus _signalBus;

    public Greeter(SignalBus signalBus) => _signalBus = signalBus;

    public void Initialize()
        => _signalBus.Subscribe<UserJoinedSignal>(OnUserJoined);

    public void Dispose()
        => _signalBus.Unsubscribe<UserJoinedSignal>(OnUserJoined);

    void OnUserJoined(UserJoinedSignal signal)
        => Debug.Log("Hello " + signal.Username);
}
```

**Via `BindSignal` in installer** (declarative, no manual subscribe/unsubscribe):
```csharp
// Static lambda
Container.BindSignal<UserJoinedSignal>()
    .ToMethod(s => Debug.Log("Hello " + s.Username));

// Instance method on a resolved class
Container.Bind<Greeter>().AsSingle();
Container.BindSignal<UserJoinedSignal>()
    .ToMethod<Greeter>(x => x.SayHello)
    .FromResolve();

// Instance method on a new instance created for the signal handler
Container.BindSignal<UserJoinedSignal>()
    .ToMethod<Greeter>(x => x.SayHello)
    .FromNew();

// Map signal properties to method parameters
Container.BindSignal<UserJoinedSignal>()
    .ToMethod<Greeter>((x, s) => x.SayHello(s.Username))
    .FromResolve();
```

**Via R3 observable stream** (when using R3/UniRx):
```csharp
_signalBus.GetStream<UserJoinedSignal>()
    .Subscribe(x => SayHello(x.Username))
    .AddTo(_disposables);
```

## Abstract / Interface-Based Signals

Decouple handlers from concrete signal types by subscribing to an interface:

```csharp
public interface ISignalGameSaver { }
public interface ISignalSoundPlayer { int SoundId { get; } }

public struct SignalCheckpointReached : ISignalGameSaver, ISignalSoundPlayer
{
    public int SoundId => 2;
}

public struct SignalLevelCompleted : ISignalGameSaver { }

// Installer
Container.DeclareSignalWithInterfaces<SignalCheckpointReached>();
Container.DeclareSignalWithInterfaces<SignalLevelCompleted>();

// Handler subscribes to the interface — decoupled from concrete signal
public class SaveGameSystem : IInitializable, IDisposable
{
    readonly SignalBus _signalBus;

    public SaveGameSystem(SignalBus signalBus) => _signalBus = signalBus;

    public void Initialize()
        => _signalBus.Subscribe<ISignalGameSaver>(_ => SaveGame());

    public void Dispose()
        => _signalBus.Unsubscribe<ISignalGameSaver>(_ => SaveGame());

    void SaveGame() { /* ... */ }
}

// Fire via the interface
_signalBus.AbstractFire<ISignalGameSaver>();
```

## Async Signals

Deferred signals run in the next frame's tick cycle. Use when you need predictable dispatch order or fire-and-forget semantics, and do NOT need the signal to be handled in the same frame.

```csharp
Container.DeclareSignal<LevelCompletedSignal>()
    .RunAsync()
    .WithTickPriority(TickPriority.Normal);  // runs after all ITickable.Tick()
```

Avoid async signals for real-time state synchronization — the one-frame delay can cause inconsistencies.

## Sub-container Signal Visibility

Signals declared in a parent container (`ProjectContext`, `SceneContext`) are visible to child containers. Use `CopyIntoAllSubContainers()` to propagate signals to dynamically created sub-containers:

```csharp
Container.DeclareSignal<GlobalPauseSignal>().CopyIntoAllSubContainers();
```

## Key Rules

- Always call `SignalBusInstaller.Install(Container)` before declaring any signals.
- Always unsubscribe in `Dispose()` — failing to do so causes null reference errors after the subscriber is destroyed.
- Use `BindSignal` for purely declarative handler wiring; use `Subscribe`/`Unsubscribe` when handler logic is conditional or dynamic.
- Use signals when: multiple receivers, sender doesn't need a return value, events are infrequent.
- Avoid signals when: tight coupling is needed, real-time synchronization is required, or direct method calls are simpler.
- Prefer `RunSync()` (default) for most signals; use `RunAsync()` only when execution order predictability matters more than same-frame handling.
