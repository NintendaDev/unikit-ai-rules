version: 1.0.0

# Unreal Engine Subsystems

> **Scope**: UE5 Subsystem framework — choosing the right subsystem type, lifecycle hooks, C++ access patterns, tick support, dependency ordering, Blueprint exposure, and loose coupling between subsystems.
> **Load when**: creating a new subsystem, choosing between GameInstance/World/LocalPlayer/Engine subsystem types, implementing Initialize or Deinitialize, adding tick to a subsystem, accessing a subsystem from C++ or Blueprint, ordering subsystem initialization, designing global or scoped services without singletons.

---

## Core Concepts

Subsystems are auto-instanced `UObject`s managed by a specific *outer* (Engine, GameInstance, World, or LocalPlayer). They replace manual singletons with engine-managed lifecycle, automatic Blueprint accessibility, and scoped lifetime.

| Type | Base Class | Outer | Lifetime | Typical Use |
|------|-----------|-------|----------|-------------|
| Engine | `UEngineSubsystem` | `GEngine` | Engine startup → shutdown | Global engine-level services, analytics infrastructure, performance monitoring |
| Editor | `UEditorSubsystem` | `GEditor` | Editor launch → close | Editor-only tools and utilities; excluded from cooked game builds |
| GameInstance | `UGameInstanceSubsystem` | `UGameInstance` | Game start → exit | Cross-level persistent state: save data, achievements, network sessions, player progress |
| World | `UWorldSubsystem` | `UWorld` | Level load → unload | Level-scoped logic: spawn management, environmental effects, puzzle systems |
| LocalPlayer | `ULocalPlayerSubsystem` | `ULocalPlayer` | Player join → player leave | Per-player services: UI settings, input mapping, tutorial progress (split-screen safe) |

Choose the subsystem type whose lifetime matches the data's lifetime. If data must persist across level transitions → GameInstance. If it resets each level → World. If it is per-player → LocalPlayer.

---

## API / Interface

All subsystems inherit from `USubsystem`. Override these virtual methods:

```cpp
// Called after instantiation. Use Collection.InitializeDependency<T>() here
// to guarantee ordering before calling Super.
virtual void Initialize(FSubsystemCollectionBase& Collection) override;

// Called before destruction. Release all held resources; null out UPROPERTY references.
virtual void Deinitialize() override;

// Return false to skip creation entirely (e.g., server-only, specific game mode).
// Default returns true.
virtual bool ShouldCreateSubsystem(UObject* Outer) const override;
```

### Tick Support

World subsystems that need per-frame updates inherit from `UTickableWorldSubsystem`:

```cpp
UCLASS()
class UMyWorldSubsystem : public UTickableWorldSubsystem
{
    GENERATED_BODY()
public:
    virtual void Tick(float DeltaTime) override;
    virtual TStatId GetStatId() const override
    {
        RETURN_QUICK_DECLARE_CYCLE_STAT(UMyWorldSubsystem, STATGROUP_Tickables);
    }
};
```

For GameInstance and Engine subsystems, combine with `FTickableGameObject`:

```cpp
UCLASS()
class UMyGameInstanceSubsystem : public UGameInstanceSubsystem, public FTickableGameObject
{
    GENERATED_BODY()
public:
    virtual void Tick(float DeltaTime) override;
    virtual bool IsTickable() const override { return true; }
    virtual TStatId GetStatId() const override
    {
        RETURN_QUICK_DECLARE_CYCLE_STAT(UMyGameInstanceSubsystem, STATGROUP_Tickables);
    }
};
```

Only add tick when the subsystem genuinely requires per-frame updates — unnecessary ticking adds overhead.

---

## Access Patterns

```cpp
// GameInstance subsystem — from any UObject that has a GameInstance:
UMyGameSubsystem* Sub = GameInstance->GetSubsystem<UMyGameSubsystem>();
// Null-safe static variant (use when GameInstance pointer may itself be null):
UMyGameSubsystem* Sub = UGameInstance::GetSubsystem<UMyGameSubsystem>(GameInstance);

// World subsystem — from any UObject with a world context:
UMyWorldSubsystem* Sub = GetWorld()->GetSubsystem<UMyWorldSubsystem>();

// LocalPlayer subsystem — from PlayerController or LocalPlayer:
UMyPlayerSubsystem* Sub = LocalPlayer->GetSubsystem<UMyPlayerSubsystem>();

// Engine subsystem — globally available after engine initialization:
UMyEngineSubsystem* Sub = GEngine->GetEngineSubsystem<UMyEngineSubsystem>();

// Interface array — when multiple subsystems implement the same interface:
const TArray<IMyInterface*>& Subs = GameInstance->GetSubsystemArray<IMyInterface>();
```

Always null-check the result. `GetSubsystem<T>` returns `nullptr` when the outer is null, the world is being torn down, or `ShouldCreateSubsystem` returned false.

---

## Patterns & Examples

### Basic GameInstance Subsystem

```cpp
// MySaveSubsystem.h
UCLASS()
class UMySaveSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()
public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    UFUNCTION(BlueprintCallable, Category = "Save")
    void SaveGame();

private:
    UPROPERTY()
    TObjectPtr<USaveGame> CurrentSave;
};

// MySaveSubsystem.cpp
void UMySaveSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    // Perform startup initialization here
}

void UMySaveSubsystem::Deinitialize()
{
    CurrentSave = nullptr; // Release UPROPERTY reference before Super call
    Super::Deinitialize();
}
```

### Conditional Creation (server-only subsystem)

```cpp
virtual bool ShouldCreateSubsystem(UObject* Outer) const override
{
    const UWorld* World = Cast<UWorld>(Outer);
    return World && World->GetNetMode() != NM_Client;
}
```

### Dependency Ordering

```cpp
void UMySubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    // Guarantee UOtherSubsystem is fully initialized before this one proceeds:
    Collection.InitializeDependency<UOtherSubsystem>();
    Super::Initialize(Collection);

    UOtherSubsystem* Other = GetGameInstance()->GetSubsystem<UOtherSubsystem>();
    // Other is guaranteed non-null and initialized here
}
```

### Interface Pattern (multiple implementations)

Define a shared interface, implement it in multiple subsystems, and iterate them as a group:

```cpp
// Shared interface
UINTERFACE()
class UMySystemInterface : public UInterface { GENERATED_BODY() };
class IMySystemInterface
{
    GENERATED_BODY()
public:
    virtual void DoSomething() = 0;
};

// Two auto-registered implementations
UCLASS() class UImplA : public UGameInstanceSubsystem, public IMySystemInterface { ... };
UCLASS() class UImplB : public UGameInstanceSubsystem, public IMySystemInterface { ... };

// Caller iterates all implementations without knowing their concrete types:
for (IMySystemInterface* Impl : GameInstance->GetSubsystemArray<IMySystemInterface>())
{
    Impl->DoSomething();
}
```

---

## Best Practices

- **Match scope to lifetime.** Use GameInstance for cross-level data, World for per-level data, LocalPlayer for per-player data. Mismatched scope causes null references after level transitions or player removal.
- **Use `InitializeDependency` to enforce ordering.** Never assume another subsystem is already initialized; call `Collection.InitializeDependency<T>()` in `Initialize` before accessing it.
- **Use `ShouldCreateSubsystem` to gate creation.** Server-only subsystems, game-mode-specific logic, or platform-specific services should be conditionally created here — not scattered throughout the code.
- **Decouple subsystems with delegates or interfaces.** Prefer `DECLARE_MULTICAST_DELEGATE` or interface arrays over direct subsystem-to-subsystem calls so each subsystem remains independently testable.
- **Expose to Blueprint with `BlueprintCallable`.** Subsystems are accessible in Blueprint graphs via the GameInstance/World node chain. Mark all designer-relevant methods.
- **Null out UPROPERTY references in `Deinitialize`.** Assign `nullptr` to stored `TObjectPtr<>` or `UPROPERTY()` references before calling `Super::Deinitialize()` to avoid keeping targets alive past the subsystem's lifetime.
- **Prefer World or LocalPlayer over GameInstance** when the service is genuinely level- or player-scoped — narrower scope reduces unintentional state leakage between sessions.

---

## Anti-patterns

- **Using a GameInstance subsystem for level-specific logic.** State accumulates across level transitions and produces hard-to-trace bugs. Use `UWorldSubsystem` instead.
- **Accessing subsystems in constructors or destructors.** The subsystem collection is not set up at construction time. Use `Initialize` and `Deinitialize` for all setup and teardown.
- **Skipping `ShouldCreateSubsystem` for conditional services.** Creating a subsystem unconditionally when it should only exist for certain game modes, platforms, or net roles wastes memory and can cause crashes in unsupported configurations.
- **Creating subsystems for actor-specific logic.** If the logic belongs to one actor, use a component. Subsystems are for shared, scoped services consumed by multiple parties.
- **Referencing `UEditorSubsystem` from game code.** Editor subsystems are stripped in cooked builds; any game-side dependency causes linker or packaging failures.
- **Calling another subsystem in `Initialize` without `InitializeDependency`.** Initialization order is undefined unless declared; accessing an uninitialized subsystem yields stale or null state.
- **Skipping null-checks on `GetSubsystem<T>()`.** Returns null when the outer is null, the world is tearing down, or `ShouldCreateSubsystem` returned false — all of which can happen in valid game flows.
