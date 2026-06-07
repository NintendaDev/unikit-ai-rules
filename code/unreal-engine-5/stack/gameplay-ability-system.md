---
version: 1.0.0
---

# Gameplay Ability System (GAS)

> **Scope**: GAS runtime patterns in UE5 — AbilitySystemComponent initialization and ownership setup, Gameplay Ability authoring and lifecycle, Gameplay Effect types and application, AttributeSet definition and clamping, Ability Tasks, Gameplay Cues, network prediction limits, and naming conventions.
> **Load when**: authoring Gameplay Abilities or UGameplayAbility subclasses, setting up AbilitySystemComponent, implementing AttributeSets or Gameplay Effects, working with ability cooldowns or costs, creating Ability Tasks, working with Gameplay Cues, debugging GAS replication or prediction issues, designing character stat systems.

---

## Module Setup

Add the following to your module's `Build.cs`. All three are required:

```csharp
PrivateDependencyModuleNames.AddRange(new string[]
{
    "GameplayAbilities",
    "GameplayTasks",
    "GameplayTags"
});
```

---

## Core Concepts

| Concept | Class | Role |
|---------|-------|------|
| Ability System Component | `UAbilitySystemComponent` | Central hub — owns abilities, effects, and attributes. Lives on an Actor. |
| Gameplay Ability | `UGameplayAbility` | A discrete action an Actor can perform (attack, dash, heal). |
| Gameplay Effect | `UGameplayEffect` | Data-only class that modifies Attributes and applies/removes GameplayTags. |
| Attribute Set | `UAttributeSet` | Container for numeric gameplay values (Health, Mana, Speed). |
| Gameplay Tag | `FGameplayTag` | Hierarchical string label used for ability categorization, blocking, and triggering. |
| Gameplay Cue | `UGameplayCueNotify_*` | Visual/audio feedback triggered by tags starting with `GameplayCue.`. |
| Ability Task | `UAbilityTask` | Async latent action used inside a Gameplay Ability. |

---

## AbilitySystemComponent (ASC)

### Owner vs Avatar

- **Non-respawning entities** (AI, buildings, props): Owner = Avatar = the Actor itself.
- **Respawning entities** (player characters): Owner = `PlayerState`, Avatar = `Pawn`.
  - `PlayerState` preserves ability and attribute state across respawns.
  - `PlayerState` replicates to all clients; `PlayerController` does not.

### Initialization

Call `InitAbilityActorInfo(OwnerActor, AvatarActor)` in two places — server and client:

```cpp
// Server — in Pawn::PossessedBy()
void AMyCharacter::PossessedBy(AController* NewController)
{
    Super::PossessedBy(NewController);
    if (AMyPlayerState* PS = GetPlayerState<AMyPlayerState>())
    {
        AbilitySystemComponent = Cast<UAbilitySystemComponent>(PS->GetAbilitySystemComponent());
        AbilitySystemComponent->InitAbilityActorInfo(PS, this);
    }
}

// Client — in Pawn::OnRep_PlayerState()
void AMyCharacter::OnRep_PlayerState()
{
    Super::OnRep_PlayerState();
    if (AMyPlayerState* PS = GetPlayerState<AMyPlayerState>())
    {
        AbilitySystemComponent = Cast<UAbilitySystemComponent>(PS->GetAbilitySystemComponent());
        AbilitySystemComponent->InitAbilityActorInfo(PS, this);
    }
}
```

For simple non-PlayerState setups (ASC on the Pawn itself), init in `AcknowledgePossession`:

```cpp
void AMyPlayerController::AcknowledgePossession(APawn* P)
{
    Super::AcknowledgePossession(P);
    if (AMyCharacter* Char = Cast<AMyCharacter>(P))
    {
        Char->GetAbilitySystemComponent()->InitAbilityActorInfo(Char, Char);
    }
}
```

### Granting Abilities

Grant only on the server. Use a guard flag to prevent double-granting on respawn:

```cpp
void AMyCharacter::AddCharacterAbilities()
{
    if (!HasAuthority() || !AbilitySystemComponent.IsValid() || AbilitySystemComponent->bCharacterAbilitiesGiven)
    {
        return;
    }
    for (const TSubclassOf<UGameplayAbility>& AbilityClass : StartupAbilities)
    {
        AbilitySystemComponent->GiveAbility(FGameplayAbilitySpec(AbilityClass, 1, INDEX_NONE, this));
    }
    AbilitySystemComponent->bCharacterAbilitiesGiven = true;
}
```

---

## Gameplay Abilities

### Lifecycle

```
CanActivateAbility() → PreActivate() → ActivateAbility() → [logic/tasks] → EndAbility()
```

- Always call `EndAbility()` explicitly when done. Passive abilities that intentionally run forever are the only exception.
- Call `CommitAbility()` inside `ActivateAbility()` to atomically apply cost and start cooldown.
- Server calls `ClientActivateAbilitySucceed()` / `ClientActivateAbilityFailed()` to confirm or roll back client prediction.

### Instancing Policy

| Policy | Behavior | When to use |
|--------|----------|-------------|
| `NonInstanced` | CDO is used — no instance created | Stateless abilities only; most performant |
| `InstancedPerActor` | One instance per Actor | Default choice; supports per-actor state |
| `InstancedPerExecution` | New instance per activation | Abilities that run concurrently with themselves |

Default to `InstancedPerActor`. Use `NonInstanced` only for abilities that hold absolutely no state.

### Net Execution Policy

| Policy | Where it runs | When to use |
|--------|--------------|-------------|
| `LocalOnly` | Owning client | Cosmetic/UI effects with no game impact |
| `LocalPredicted` | Client first, server corrects | Responsive player-driven actions |
| `ServerOnly` | Server only | Passive abilities, authoritative game logic; also use for single-player |
| `ServerInitiated` | Server first, then client | Rare; server-triggered abilities that notify the client |

### Cost and Cooldown

- **Cost**: Instant `UGameplayEffect` that subtracts an attribute (e.g., Mana).
- **Cooldown**: Duration `UGameplayEffect` that grants a blocking tag.
- `CommitAbility()` calls `CommitCost()` + `CommitCooldown()` in one call — always use it.
- `CanActivateAbility()` automatically checks both via `CheckCost()` and `CheckCooldown()`.

### Activation Failure Tags

Map activation failure reasons to GameplayTags in `DefaultGame.ini` for queryable feedback:

```ini
[/Script/GameplayAbilities.AbilitySystemGlobals]
ActivateFailIsDeadName=Activation.Fail.IsDead
ActivateFailCooldownName=Activation.Fail.OnCooldown
ActivateFailCostName=Activation.Fail.CantAffordCost
ActivateFailTagsBlockedName=Activation.Fail.BlockedByTags
ActivateFailTagsMissingName=Activation.Fail.MissingTags
ActivateFailNetworkingName=Activation.Fail.Networking
```

---

## Gameplay Effects

### Duration Types

| Type | Attribute change | GameplayCue event | When to use |
|------|-----------------|-------------------|-------------|
| `Instant` | Permanent (`BaseValue`) | `Execute` | Damage, healing, one-shot stat changes |
| `Duration` | Temporary (`CurrentValue`) | `OnActive` / `Removed` | Timed buffs/debuffs |
| `Infinite` | Temporary (`CurrentValue`), manual removal | `OnActive` / `Removed` | Persistent auras, equipment bonuses |

### Periodic Effects

- Apply modifiers every `Period` seconds; each tick is treated as an Instant GE.
- Use for damage-over-time (DoT) and healing-over-time (HoT).
- **Cannot be predicted** — always server-authoritative.

### Applying and Removing

```cpp
// Apply to self
FGameplayEffectContextHandle Context = AbilitySystemComponent->MakeEffectContext();
FGameplayEffectSpecHandle Spec = AbilitySystemComponent->MakeOutgoingSpec(EffectClass, Level, Context);
FActiveGameplayEffectHandle ActiveHandle = AbilitySystemComponent->ApplyGameplayEffectSpecToSelf(*Spec.Data.Get());

// Apply to target
AbilitySystemComponent->ApplyGameplayEffectSpecToTarget(*Spec.Data.Get(), TargetASC);

// Remove by active handle
AbilitySystemComponent->RemoveActiveGameplayEffect(ActiveHandle);

// Remove all effects with a specific tag
AbilitySystemComponent->RemoveActiveEffectsWithGrantedTags(FGameplayTagContainer(RemoveTag));
```

### Listening to Effect Events

```cpp
// Effect applied
AbilitySystemComponent->OnActiveGameplayEffectAddedDelegateToSelf.AddUObject(
    this, &AMyActor::OnEffectAdded);

// Effect removed
AbilitySystemComponent->OnAnyGameplayEffectRemovedDelegate().AddUObject(
    this, &AMyActor::OnEffectRemoved);
```

---

## AttributeSet

### Defining a Replicated Attribute

```cpp
// MyAttributeSet.h
UPROPERTY(BlueprintReadOnly, Category = "Attributes", ReplicatedUsing = OnRep_Health)
FGameplayAttributeData Health;
ATTRIBUTE_ACCESSORS(UMyAttributeSet, Health)

UFUNCTION()
virtual void OnRep_Health(const FGameplayAttributeData& OldHealth);
```

```cpp
// MyAttributeSet.cpp
void UMyAttributeSet::OnRep_Health(const FGameplayAttributeData& OldHealth)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(UMyAttributeSet, Health, OldHealth);
}

void UMyAttributeSet::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);
    DOREPLIFETIME_CONDITION_NOTIFY(UMyAttributeSet, Health, COND_None, REPNOTIFY_Always);
}
```

Always pass the old value to `GAMEPLAYATTRIBUTE_REPNOTIFY` — the macro signature changed and omitting it breaks prediction rollback.

### Clamping Attribute Values

Use `PreAttributeChange` to clamp values modified by GE modifiers (CurrentValue changes):

```cpp
void UMyAttributeSet::PreAttributeChange(const FGameplayAttribute& Attribute, float& NewValue)
{
    if (Attribute == GetHealthAttribute())
    {
        NewValue = FMath::Clamp(NewValue, 0.0f, GetMaxHealth());
    }
    if (Attribute == GetMoveSpeedAttribute())
    {
        NewValue = FMath::Clamp(NewValue, 150.0f, 1000.0f);
    }
}
```

Use `PostGameplayEffectExecute` for damage→health reduction and for Execution-driven changes:

```cpp
void UMyAttributeSet::PostGameplayEffectExecute(const FGameplayEffectModCallbackData& Data)
{
    if (Data.EvaluatedData.Attribute == GetDamageAttribute())
    {
        // Subtract damage meta-attribute from health, then reset Damage to 0
        const float LocalDamage = GetDamage();
        SetDamage(0.0f);
        if (LocalDamage > 0.0f)
        {
            const float NewHealth = FMath::Clamp(GetHealth() - LocalDamage, 0.0f, GetMaxHealth());
            SetHealth(NewHealth);
            // trigger hit react, check for death, notify UI...
        }
    }
}
```

### Meta Attributes (Calculation Buffers)

Define non-replicated meta attributes (e.g., `Damage`, `HealAmount`) as temporary buffers:
- GE writes to the meta attribute (e.g., `Damage = 50`).
- `PostGameplayEffectExecute` reads the meta attribute, applies it to a real attribute (Health), then resets meta to `0`.
- Meta attributes are not meaningful outside of a single GE execution frame — do not replicate them.

---

## Ability Tasks

Use Ability Tasks for async operations inside abilities: wait for montage end, wait for input, wait for a gameplay event.

### Creating a Custom Task

```cpp
// Header — static factory function is mandatory for Blueprint exposure
UCLASS()
class UMyAbilityTask : public UAbilityTask
{
    GENERATED_BODY()
public:
    UPROPERTY(BlueprintAssignable)
    FMyTaskDelegate OnCompleted;

    UPROPERTY(BlueprintAssignable)
    FMyTaskDelegate OnCancelled;

    UFUNCTION(BlueprintCallable, Category = "Ability|Tasks",
        meta = (HidePin = "OwningAbility", DefaultToSelf = "OwningAbility", BlueprintInternalUseOnly = "true"))
    static UMyAbilityTask* CreateMyTask(UGameplayAbility* OwningAbility, FName TaskInstanceName);

    virtual void Activate() override;
    virtual void OnDestroy(bool bInOwnerFinished) override;
};
```

### Activating a Task in C++

```cpp
void UMyAbility::ActivateAbility(const FGameplayAbilitySpecHandle Handle,
    const FGameplayAbilityActorInfo* ActorInfo,
    const FGameplayAbilityActivationInfo ActivationInfo,
    const FGameplayEventData* TriggerEventData)
{
    UMyAbilityTask* Task = UMyAbilityTask::CreateMyTask(this, NAME_None);
    Task->OnCompleted.AddDynamic(this, &UMyAbility::OnTaskCompleted);
    Task->OnCancelled.AddDynamic(this, &UMyAbility::OnTaskCancelled);
    Task->ReadyForActivation();  // must be called after all delegates are bound
}
```

### Built-in Tasks Reference

| Task class | Purpose |
|-----------|---------|
| `UAbilityTask_WaitGameplayEvent` | Wait for a specific GameplayTag event on the ASC |
| `UAbilityTask_WaitInputPress` | Wait for input button press |
| `UAbilityTask_WaitInputRelease` | Wait for input button release |
| `UAbilityTask_WaitDelay` | Wait a fixed duration |
| `UAbilityTask_PlayMontageAndWait` | Play animation montage, wait for completion or interruption |
| `UAbilityTask_WaitTargetData` | Wait for targeting data (hit results, actors) from a `AGameplayAbilityTargetActor` |
| `UAbilityTask_WaitConfirm` | Wait for generic confirm/cancel input |

### Passing Data Into Abilities

Three strategies for injecting data into a running ability:

1. **Activate by GameplayEvent** — call `UAbilitySystemBlueprintLibrary::SendGameplayEventToActor(Actor, EventTag, Payload)`. Payload replicates for `LocalPredicted` abilities. Requires the ability to have `Triggers` configured with a matching tag.
2. **`WaitGameplayEvent` task** — activate normally, then listen for events mid-execution. Works for local-only or server-only abilities.
3. **`TargetData` struct** — custom `FGameplayAbilityTargetData` for complex or arbitrary client→server data transfer.

---

## Gameplay Cues

Gameplay Cues are client-side cosmetic events (particles, sounds, camera shake). They must never contain game logic.

### Tag Naming

All GameplayCue tags must start with `GameplayCue.`:

```
GameplayCue.Character.FireImpact
GameplayCue.Character.LevelUp
GameplayCue.Weapon.Reload
```

### Event Types

| Event | Triggered by | Behavior |
|-------|-------------|---------|
| `Execute` | Instant GE | One-shot, fire-and-forget |
| `OnActive` | Duration/Infinite GE applied | Plays on effect start |
| `WhileActive` | Duration/Infinite GE active | Ticks while active |
| `Removed` | Duration/Infinite GE removed | Plays on effect end |

### Local Cues (Avoid Replication)

For client-only cosmetic effects (projectile impacts, local montage cues), skip the network RPC:

```cpp
// Add these to a custom UAbilitySystemComponent subclass
void UMyAbilitySystemComponent::ExecuteGameplayCueLocal(
    const FGameplayTag GameplayCueTag, const FGameplayCueParameters& Params)
{
    UAbilitySystemGlobals::Get().GetGameplayCueManager()->HandleGameplayCue(
        GetOwner(), GameplayCueTag, EGameplayCueEvent::Executed, Params);
}

void UMyAbilitySystemComponent::AddGameplayCueLocal(
    const FGameplayTag GameplayCueTag, const FGameplayCueParameters& Params)
{
    UAbilitySystemGlobals::Get().GetGameplayCueManager()->HandleGameplayCue(
        GetOwner(), GameplayCueTag, EGameplayCueEvent::OnActive, Params);
    UAbilitySystemGlobals::Get().GetGameplayCueManager()->HandleGameplayCue(
        GetOwner(), GameplayCueTag, EGameplayCueEvent::WhileActive, Params);
}

void UMyAbilitySystemComponent::RemoveGameplayCueLocal(
    const FGameplayTag GameplayCueTag, const FGameplayCueParameters& Params)
{
    UAbilitySystemGlobals::Get().GetGameplayCueManager()->HandleGameplayCue(
        GetOwner(), GameplayCueTag, EGameplayCueEvent::Removed, Params);
}
```

---

## Prediction

### What GAS Can Predict

- Ability activation
- Triggered Events
- Attribute modification (via Modifiers — **not** via `ExecutionCalculation`)
- GameplayTag modification
- GameplayCue events (from within a predicted GE or standalone)
- Montages
- Character movement (built into `UCharacterMovementComponent`)

### What Cannot Be Predicted

- **GameplayEffect removal** — including cooldown expiry
- **Periodic effects** (DoT ticks) — always server-authoritative
- **ExecutionCalculation** results

### Practical Prediction Rules

- Do not predict damage on remote characters — health blips on server correction are jarring.
- Do not predict death — a ragdolling character snapping back to life is unacceptable.
- Accept cooldown latency discrepancy: high-latency clients see a longer apparent cooldown.
- For hitscan weapons, batch RPCs to cut network overhead:

```cpp
// In UGameplayAbility subclass
virtual bool ShouldDoServerAbilityRPCBatch() const override { return true; }
```

---

## Naming Conventions

| Asset / class type | Prefix / suffix | Example |
|-------------------|----------------|---------|
| GameplayAbility Blueprint | `GA_` | `GA_FireGun`, `GA_Dash` |
| GameplayEffect Blueprint | `GE_` | `GE_Damage`, `GE_HealOverTime` |
| GameplayCue Blueprint | `GC_` | `GC_FireImpact`, `GC_LevelUp` |
| AttributeSet C++ class | `U…AttributeSet` | `UCharacterAttributeSet` |
| AbilityTask C++ class | `UAbilityTask_…` | `UAbilityTask_PlayMontageAndWait` |
| Activation failure tags | `Activation.Fail.*` | `Activation.Fail.OnCooldown` |
| GameplayCue tags | `GameplayCue.*` | `GameplayCue.Weapon.FireImpact` |

---

## Best Practices

- Always initialize `AbilitySystemComponent` on both server (`PossessedBy`) and client (`OnRep_PlayerState`) — missing either causes silent attribute/ability failures.
- Grant abilities on the server only; guard with `bCharacterAbilitiesGiven` to prevent double-granting on respawn.
- Call `CommitAbility()` once in `ActivateAbility()` to apply both cost and cooldown atomically.
- Prefer `InstancedPerActor` instancing; use `NonInstanced` only for provably stateless abilities.
- Keep Gameplay Effects as pure data assets — put calculation logic in `ExecutionCalculation` (C++) or `AttributeSet` callbacks.
- Clamp attributes in both `PreAttributeChange` (modifier-driven changes) and `PostGameplayEffectExecute` (execution-driven changes).
- Use meta attributes (non-replicated, reset to 0 after use) as damage/heal calculation buffers instead of directly subtracting health in a GE.
- Always call `ReadyForActivation()` after binding all delegates on an Ability Task.
- Use local GameplayCues (`ExecuteGameplayCueLocal`) for purely cosmetic client-side effects to avoid RPC overhead.
- Declare `GetLifetimeReplicatedProps` and `OnRep_X` for every replicated attribute — skipping either breaks replication silently.
- Always pass the old value to `GAMEPLAYATTRIBUTE_REPNOTIFY(Class, Attr, OldValue)` — the two-argument form is obsolete and breaks prediction rollback.

---

## Anti-patterns

- **Forgetting `EndAbility()`** — abilities that never end block re-activation and leak Ability Tasks indefinitely.
- **Granting abilities on clients** — always server-authoritative; client grants appear to succeed locally but cause state desync.
- **Putting gameplay logic in Gameplay Cues** — cues are cosmetic only; logic belongs in the ability or `AttributeSet`.
- **Using `InstancedPerExecution` by default** — allocates a new `UObject` per activation; expensive at scale and for rapid-fire abilities.
- **Predicting damage on remote characters** — health blips on server rollback look broken.
- **Skipping `InitAbilityActorInfo` on clients** — attributes return 0, abilities cannot activate, and GEs have no effect on the client.
- **Writing state to CDO in `NonInstanced` abilities** — the CDO is shared; any written state corrupts all future activations.
- **Applying Infinite GEs without a removal strategy** — modifiers accumulate permanently and cannot be predicted away.
- **Using the two-argument `GAMEPLAYATTRIBUTE_REPNOTIFY`** — the old value is discarded before `SetBaseAttributeValueFromReplication` runs, breaking prediction rollback.
- **Calling `GiveAbility` multiple times for the same spec** — creates duplicate ability specs that activate unexpectedly; always remove before re-granting.
