---
version: 1.0.0
---

# Lyra Starter Game

> **Scope**: Patterns, conventions, and extension rules for projects built on the Lyra Starter Game sample — covering the Experience system, Game Feature Plugin structure, modular gameplay initialization, PawnData configuration, GAS integration, and asset loading strategy.
> **Load when**: building on Lyra Starter Game, creating a new Experience or ExperienceActionSet, writing modular pawn initialization, integrating a Game Feature Plugin, hooking into experience-loaded callbacks, debugging Lyra initialization order, authoring PawnData or InputConfig assets, extending Lyra's interaction system.

---

## Core Concepts

**Lyra** is Epic's reference game built to demonstrate UE5 best practices: modular gameplay via Game Feature Plugins, data-driven character configuration via PawnData, a fully async experience loading pipeline, networked GAS-based abilities, and thread-safe animations.

Key design axioms:
- **Composition over inheritance** — experiences reference reusable `ActionSets`; they do not subclass each other.
- **Content in GFPs** — custom content lives in Game Feature Plugins (`/Plugins/GameFeatures/`), base Lyra code is left unmodified.
- **Async-first initialization** — gameplay logic starts on `OnExperienceLoaded`, never in `BeginPlay`.
- **Soft references everywhere** — hard reference cascades destroy load times; use `TSoftObjectPtr` / `TSoftClassPtr` in data assets.

---

## Experience System

### Key Classes

| Class | Role |
|---|---|
| `ULyraExperienceDefinition` | Full experience asset: GFPs to enable, DefaultPawnData, Actions, ActionSets |
| `ULyraExperienceActionSet` | Reusable bundle of GFP deps + Game Feature Actions shared across experiences |
| `ULyraPawnData` | Per-experience pawn configuration: class, ability sets, tag relationships, input config, camera mode |
| `ULyraInputConfig` | Input bindings: native Lyra actions + ability-triggered input actions |
| `ULyraUserFacingExperienceDefinition` | Lightweight UI proxy — stores asset IDs, not direct references, for fast experience-picker loading |
| `ULyraExperienceManagerComponent` | Lives on `AGameStateBase`; drives the full async load/activate pipeline |
| `ULyraWorldSettings` | Per-level config exposing `DefaultGameplayExperience` (soft class ref) |
| `ULyraAssetManager` | Extends `UAssetManager` with thread-safe async loading helpers |

### Loading Sequence

`ULyraExperienceManagerComponent::StartExperienceLoad()` runs four sequential states:

1. **Loading** — async-loads primary `ULyraExperienceDefinition` via `ULyraAssetManager`; loads all referenced `ActionSets`.
2. **LoadingGameFeatures** — activates all Game Feature Plugins listed in the experience and its action sets.
3. **ExecutingActions** — runs all `UGameFeatureAction` instances from the experience and action sets.
4. **Loaded** — broadcasts `OnExperienceLoaded`.

`ULyraGameMode` delays player spawning until `OnExperienceLoaded` fires.

### Hooking into Experience Load (C++)

```cpp
void AMyActor::BeginPlay()
{
    Super::BeginPlay();

    ULyraExperienceManagerComponent* ExperienceComponent =
        GetWorld()->GetGameState()->FindComponentByClass<ULyraExperienceManagerComponent>();
    check(ExperienceComponent);

    ExperienceComponent->CallOrRegister_OnExperienceLoaded(
        FOnLyraExperienceLoaded::FDelegate::CreateUObject(
            this, &ThisClass::OnExperienceLoaded));
}

void AMyActor::OnExperienceLoaded(const ULyraExperienceDefinition* Experience)
{
    // Safe to access GAS, teams, pawn data here
}
```

Blueprint equivalent: use the `AsyncAction_OnExperienceLoaded` async action node.

### Priority Tiers

Use the three-tier system to manage initialization order:

| Delegate | Example use |
|---|---|
| `OnExperienceLoaded_HighPriority` | Team creation — must exist before any player setup |
| `OnExperienceLoaded` | Player state configuration, ability set grants |
| `OnExperienceLoaded_LowPriority` | Bot spawning — depends on teams and configured player states |

### Composing Experiences via ActionSets

Share configuration across experiences by referencing `ULyraExperienceActionSet` assets rather than copying actions:

```
ExperienceA (Elimination)
  └─ ActionSet_SharedInput
  └─ ActionSet_SharedHUD
  └─ ActionSet_TeamDeathmatch

ExperienceB (Control)
  └─ ActionSet_SharedInput     ← same set, no duplication
  └─ ActionSet_SharedHUD
  └─ ActionSet_ControlPoint
```

**Never subclass `ULyraExperienceDefinition`** — Blueprint subclassing of experience definitions is unsupported; always use ActionSet composition.

---

## Game Feature Plugins (GFPs)

- Store custom content in `/Plugins/GameFeatures/<PluginName>/`.
- Each GFP has a `UGameFeatureData` asset that lists:
  - **Actions** to execute when the plugin activates: `Add Components`, `Add Cheats`, `Add Data Registry`, `Add Data Registry Source`.
  - **Primary Data Asset** scan paths so `UAssetManager` can discover assets inside the plugin.
- Set the plugin's initial state to **Registered** — it loads on-demand when an experience references it, not at startup.
- Experience definition asset for the plugin should live at `/Experiences/` or `/System/Experiences/` within the plugin.

### Adding Components via GFP Action

Use `Add Components` game feature action to inject components into framework actors without modifying their source:

```
GameFeatureData → Actions:
  Add Components:
    Actor Class: ALyraCharacter
    Component Class: UMyGameplayComponent
    Client: true
    Server: true
```

---

## Modular Gameplay Initialization

Lyra's pawn initialization is **asynchronous and inter-dependent**. Components that need to initialize at different times use `UGameFrameworkComponentManager`.

### Registering an Actor as a Modular Receiver

```cpp
void AMyModularActor::PreInitializeComponents()
{
    Super::PreInitializeComponents();
    UGameFrameworkComponentManager::AddGameFrameworkComponentReceiver(this);
}

void AMyModularActor::BeginPlay()
{
    Super::BeginPlay();
    UGameFrameworkComponentManager::SendGameFrameworkComponentExtensionEvent(
        this, UGameFrameworkComponentManager::NAME_GameActorReady);
}

void AMyModularActor::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    UGameFrameworkComponentManager::RemoveGameFrameworkComponentReceiver(this);
    Super::EndPlay(EndPlayReason);
}
```

### Pre-Built Modular Base Classes

Prefer these over raw framework classes — they are already wired for modular component injection:

| Class | Base |
|---|---|
| `AModularCharacter` | `ACharacter` |
| `AModularPawn` | `APawn` |
| `AModularPlayerController` | `APlayerController` |
| `AModularPlayerState` | `APlayerState` |
| `AModularGameMode` | `AGameMode` |
| `AModularGameState` | `AGameState` |
| `AModularAIController` | `AAIController` |

### Extension Subscription (on a Component)

```cpp
ComponentManager->AddExtensionHandler(
    AMyModularActor::StaticClass(),
    UGameFrameworkComponentManager::FExtensionHandlerDelegate::CreateUObject(
        this, &ThisClass::HandleActorExtension));
```

---

## PawnData & Input Configuration

`ULyraPawnData` drives per-experience character setup. Define a separate asset per experience or game mode:

```
ULyraPawnData:
  PawnClass:            BP_LyraCharacter (or custom subclass)
  AbilitySets:          [ DA_AbilitySet_ShooterHero ]
  TagRelationshipMapping: DA_TagRelationships_Shooter
  InputConfig:          DA_InputConfig_ShooterHero
  DefaultCameraMode:    B_LyraCameraMode_ThirdPerson
```

`ULyraInputConfig` splits bindings into two arrays:
- **NativeInputActions** — bound directly in C++ via `UEnhancedInputComponent::BindAction`.
- **AbilityInputActions** — forwarded to GAS via input tags; abilities declare which tag activates them.

---

## GAS Integration

- **ASC ownership**: `UAbilitySystemComponent` lives on `APlayerState`; the character's `GetAbilitySystemComponent()` delegates to the PlayerState.
- **Initialization order**: call `InitAbilityActorInfo` on both server (in `PossessedBy`) and client (in `OnRep_PlayerState`) to avoid missed replication.
- **Ability Sets**: grant ability sets via `ULyraAbilitySet::GiveToAbilitySystem(ASC, &OutGrantedHandles)` on `OnExperienceLoaded`, not in `BeginPlay`.
- **Tag relationships**: define cancellation and blocking rules in `ULyraAbilityTagRelationshipMapping` data asset; reference it from `PawnData`.
- The `GameState` also holds an ASC used for global/team-level effects separate from player abilities.

---

## Asset Loading

- Use `ULyraUserFacingExperienceDefinition` in the experience selection UI — it holds soft `FPrimaryAssetId` references, not hard pointers.
- Full `ULyraExperienceDefinition` loads only when the server selects the experience, preventing premature asset streaming.
- Configure Asset Manager scan paths per GFP in its `GameFeatureData` asset; do not add GFP-owned paths to the global project config.
- Asset bundles (`"Client"`, `"Server"`, `"Equipped"`) allow selective loading of sub-sets of an experience's dependencies.

---

## Configuration

`DefaultEngine.ini` (required for Lyra's systems to activate):
```ini
[/Script/Engine.Engine]
WorldSettingsClassName=/Script/LyraGame.LyraWorldSettings
AssetManagerClassName=/Script/LyraGame.LyraAssetManager
```

Per-level experience selection:
- Open **World Settings** → set `Default Gameplay Experience` to the desired `ULyraExperienceDefinition` asset.

---

## Best Practices

- **Never modify base Lyra source** unless required — treat the `LyraGame` module namespace as reserved. Extend via GFPs or subclassing with care.
- **Start new features as GFPs** — isolation makes them easier to enable/disable per experience and simplifies future upgrades.
- **Use ActionSets** for any configuration shared by two or more experiences; avoid copy-pasting actions between experience assets.
- **Prefer `TSubclassOf` / `TSoftClassPtr`** in PawnData and InputConfig; keep hard references out of data assets.
- **Register modular actors** (`AddGameFrameworkComponentReceiver`) before `BeginPlay` so GFP-injected components initialize in time.
- **Test slow loading** with `lyra.chaos.ExperienceDelayLoad.MinSecs` to surface race conditions in `OnExperienceLoaded` hooks.
- Keep `InteractionScanRange` larger than `InteractionRange` in the interaction ability — replication must deliver the interaction ability to the client before the player can trigger it.

---

## Interaction System

| Class / Interface | Role |
|---|---|
| `IInteractableTarget` | Implement on actor or component to make it detectable |
| `GA_Interact` / `ULyraGameplayAbility_Interact` | Auto-runs on PlayerState; spawns the two scanning tasks |
| `UAbilityTask_GrantNearbyInteraction` | Sphere trace scan (500 cm, every 0.1 s); grants interaction abilities |
| `UAbilityTask_WaitForInteractableTargets_SingleLineTrace` | Line trace (200 cm) when player looks at object |
| `ALyraWorldCollectable` | Blueprint-friendly pickup base; implements `IInteractableTarget` + `IPickupable` |
| `Lyra_TraceChannel_Interaction` | Collision channel required for interaction detection |

**Constraint**: current system supports single-option interactions only (proximity auto or one player-initiated choice). Multiple interaction choices per object require custom task authoring.

---

## Debugging

```
# Verbose experience loading log
Log LogLyraExperience Verbose
Log LogGameFeatures Verbose

# Dump component injection state (modular gameplay)
ModularGameplay.DumpGameFrameworkComponentManagers

# Simulate slow experience loading (race condition testing)
lyra.chaos.ExperienceDelayLoad.MinSecs 2.0
lyra.chaos.ExperienceDelayLoad.RandomSecs 3.0
```

---

## Anti-patterns

- **`BeginPlay` for gameplay logic** — experience may not be loaded yet; causes intermittent initialization failures. Always use `OnExperienceLoaded`.
- **Subclassing `ULyraExperienceDefinition`** in Blueprint — unsupported; use ActionSet composition instead.
- **Hard references in experience/UI code** — one Blueprint reference can transitively load hundreds of assets. Use soft refs and asset bundles.
- **Modifying base Lyra code** when a GFP or subclass suffices — makes engine upgrades and Lyra updates painful.
- **Not registering modular actors** (`AddGameFrameworkComponentReceiver`) — GFP-injected components silently fail to initialize.
- **Setting `InteractionScanRange <= InteractionRange`** — replication races cause missed interaction ability grants on clients.
- **Granting ability sets in `BeginPlay`** instead of `OnExperienceLoaded` — GAS actor info may not be initialized yet.