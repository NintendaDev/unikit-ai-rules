---
version: 1.0.0
---

# Gameplay Ability System (GAS)

> **Scope**: GAS architecture, AbilitySystemComponent, GameplayAbility, GameplayEffect, AttributeSet, GameplayTag, GameplayCue, ability activation, effect stacking, multiplayer replication, C++ setup patterns
> **Load when**: GAS, Gameplay Ability System, AbilitySystemComponent, ASC, GameplayAbility, GameplayEffect, GameplayTag, AttributeSet, GameplayCue, ability, effect, attribute, cooldown, cost, prediction

---

## Core Concepts

GAS is a framework for building attribute-based abilities with built-in support for replication, prediction, and tag-based state management. Battle-tested in Paragon and Fortnite.

**Key classes:**

| Class | Purpose |
|-------|---------|
| `UAbilitySystemComponent` (ASC) | Central hub managing abilities, effects, attributes, tags |
| `UGameplayAbility` (GA) | Encapsulates a single ability's logic and lifecycle |
| `UGameplayEffect` (GE) | Data-only asset modifying attributes and tags |
| `UAttributeSet` | Container for gameplay attributes (health, mana, etc.) |
| `FGameplayTag` | Hierarchical label for state classification (`State.Debuff.Stun`) |
| `AGameplayCueNotify` | Visual/audio feedback triggered by effects |

## Naming Conventions

| Prefix | Asset Type | Example |
|--------|-----------|---------|
| `GA_` | GameplayAbility | `GA_FireProjectile` |
| `GE_` | GameplayEffect | `GE_DamageInstant`, `GE_Cooldown_Fireball` |
| `GC_` | GameplayCue | `GC_Impact_Fire` |
| — | AttributeSet | `UMyAttributeSet`, `UCombatAttributeSet` |

GameplayCue tags must start with `GameplayCue.` parent tag: `GameplayCue.Impact.Fire`, `GameplayCue.Buff.Shield`.

## Project Setup

1. Enable `GameplayAbilities` plugin
2. Add to `.Build.cs`:
   ```cpp
   PublicDependencyModuleNames.AddRange(new string[] {
       "GameplayAbilities", "GameplayTags", "GameplayTasks"
   });
   ```
3. `UAbilitySystemGlobals::Get().InitGlobalData()` — automatic in UE 5.3+; call manually in earlier versions via `AssetManager::StartInitialLoading()`

## AbilitySystemComponent Setup

### Owner vs Avatar

- **OwnerActor**: Actor that logically owns the ASC (e.g., `APlayerState`)
- **AvatarActor**: Physical representation in the world (e.g., `ACharacter`)
- Often the same actor; separate when ASC lives on PlayerState for persistence across respawns

### Initialization Pattern

Implement `IAbilitySystemInterface` on the actor:

```cpp
UCLASS()
class AMyCharacter : public ACharacter, public IAbilitySystemInterface
{
    GENERATED_BODY()

public:
    AMyCharacter();

    virtual UAbilitySystemComponent* GetAbilitySystemComponent() const override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Abilities")
    TObjectPtr<UAbilitySystemComponent> AbilitySystemComponent;
};
```

Constructor:
```cpp
AMyCharacter::AMyCharacter()
{
    AbilitySystemComponent = CreateDefaultSubobject<UAbilitySystemComponent>(TEXT("ASC"));
    AbilitySystemComponent->SetIsReplicated(true);
    AbilitySystemComponent->SetReplicationMode(EGameplayEffectReplicationMode::Mixed);
}
```

### Initialization Timing

**Pawn-based ASC:**
- Server: `PossessedBy()` → `InitAbilityActorInfo(this, this)`
- Client: `AcknowledgePossession()` → `InitAbilityActorInfo(this, this)`

**PlayerState-based ASC (recommended for respawning characters):**
- Server in `PossessedBy()`:
  ```cpp
  AMyPlayerState* PS = GetPlayerState<AMyPlayerState>();
  PS->GetAbilitySystemComponent()->InitAbilityActorInfo(PS, this);
  ```
- Client in `OnRep_PlayerState()`:
  ```cpp
  AbilitySystemComponent->InitAbilityActorInfo(PS, this);
  ```
- **Increase `NetUpdateFrequency`** on PlayerState (default is too low, causes perceived lag)

### Replication Modes

| Mode | Use Case | What Replicates |
|------|----------|-----------------|
| **Full** | Single-player | All GameplayEffects to all clients |
| **Mixed** | Multiplayer (players) | GEs to owner only; tags/cues to all |
| **Minimal** | Multiplayer (AI) | Tags/cues only |

## AttributeSet Design

### Basic Implementation

```cpp
// Use the ATTRIBUTE_ACCESSORS macro for boilerplate
#define ATTRIBUTE_ACCESSORS(ClassName, PropertyName) \
    GAMEPLAYATTRIBUTE_PROPERTY_GETTER(ClassName, PropertyName) \
    GAMEPLAYATTRIBUTE_VALUE_GETTER(PropertyName) \
    GAMEPLAYATTRIBUTE_VALUE_SETTER(PropertyName) \
    GAMEPLAYATTRIBUTE_VALUE_INITTER(PropertyName)

UCLASS()
class UCombatAttributeSet : public UAttributeSet
{
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_Health, Category = "Health")
    FGameplayAttributeData Health;
    ATTRIBUTE_ACCESSORS(UCombatAttributeSet, Health)

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_MaxHealth, Category = "Health")
    FGameplayAttributeData MaxHealth;
    ATTRIBUTE_ACCESSORS(UCombatAttributeSet, MaxHealth)

    UFUNCTION()
    void OnRep_Health(const FGameplayAttributeData& OldHealth);

    UFUNCTION()
    void OnRep_MaxHealth(const FGameplayAttributeData& OldMaxHealth);

    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;
};
```

### Attribute Modification Hooks

- **`PreAttributeChange()`** — clamp/validate before modification (e.g., clamp Health to [0, MaxHealth])
- **`PostGameplayEffectExecute()`** — react after a GE applies (ideal for damage calculations, death checks, armor reduction)
- **`OnAttributeAggregatorCreated()`** — initialize modifier aggregators

### Meta Attributes Pattern

Use temporary attributes for intermediate calculations (e.g., `IncomingDamage`, `IncomingHealing`). Process in `PostGameplayEffectExecute()`, then apply to real attributes and clear:

```cpp
void UCombatAttributeSet::PostGameplayEffectExecute(const FGameplayEffectModCallbackData& Data)
{
    if (Data.EvaluatedData.Attribute == GetIncomingDamageAttribute())
    {
        const float LocalDamage = GetIncomingDamage();
        SetIncomingDamage(0.f); // Clear meta attribute

        if (LocalDamage > 0.f)
        {
            const float NewHealth = GetHealth() - LocalDamage;
            SetHealth(FMath::Clamp(NewHealth, 0.f, GetMaxHealth()));
        }
    }
}
```

### Design Rules

- All attributes are `FGameplayAttributeData` (floats, not ints)
- `BaseValue` = permanent value; `CurrentValue` = temporary (modifiers applied)
- One ASC can only have **one instance** of each AttributeSet class
- Register AttributeSet as `DefaultSubobject` in the owner's constructor — GAS auto-detects it
- Prefer multiple focused AttributeSets over one monolithic set (e.g., `UCombatAttributeSet`, `UMovementAttributeSet`)

## GameplayEffects

### Duration Types

| Type | Modifies | Tags Applied | Expires | Use For |
|------|----------|-------------|---------|---------|
| **Instant** | BaseValue (permanent) | Never | Immediately | Damage, healing, pickups |
| **Duration** | CurrentValue (temporary) | Yes, for duration | After timer | Timed buffs/debuffs |
| **Infinite** | CurrentValue (temporary) | Yes, until removed | Manual removal only | Passive auras, persistent states |

### Periodic Effects

Apply modifiers every X seconds. Treated as Instant for each tick. Use for DoT (damage over time). **Cannot be predicted.**

### Stacking

Configure stacking on the GE asset:
- **Aggregate by Source**: Each source maintains separate stack
- **Aggregate by Target**: All sources share one stack
- Set stack limit, duration refresh policy, and period reset policy

### Modifiers vs Execution Calculations

| Feature | Modifier | MMC | Execution Calculation |
|---------|----------|-----|----------------------|
| Complexity | Simple | Medium | Complex |
| Captures | Single attribute | Multiple attributes (snapshot) | Full source/target access |
| Use for | Static +50 HP | Level-scaled damage | Multi-attribute damage formula |

### SetByCaller Pattern

Pass runtime values without creating new GE assets:

```cpp
FGameplayEffectSpecHandle SpecHandle = ASC->MakeOutgoingSpec(DamageEffectClass, Level, Context);
SpecHandle.Data->SetSetByCallerMagnitude(
    FGameplayTag::RequestGameplayTag(FName("Data.Damage")), DamageAmount);
ASC->ApplyGameplayEffectSpecToSelf(*SpecHandle.Data.Get());
```

### Cost & Cooldown

- **Cost GE**: Instant effect reducing a resource attribute (mana, stamina). Checked before activation.
- **Cooldown GE**: Duration effect with a GameplayTag. While active, blocks reactivation of abilities with matching cooldown tag.

## GameplayAbilities

### Lifecycle

`CanActivateAbility()` → `PreActivate()` → `ActivateAbility()` → ... → `EndAbility()`

**Every execution path must call `EndAbility()`** — forgetting this leaks the ability instance.

### Instancing Policies

| Policy | Description | Use When |
|--------|-------------|----------|
| **Instanced Per Actor** | One instance per actor, reused | Default — most abilities |
| **Instanced Per Execution** | New instance each activation | Rare — complex state per execution |
| **Non-Instanced** | No instance, CDO only | Lightweight (e.g., Jump) |

### Net Execution Policy

| Policy | Where Runs | Use When |
|--------|-----------|----------|
| **Local Predicted** | Client predicts, server validates | Most player abilities |
| **Local Only** | Client only, no server | Cosmetic-only abilities |
| **Server Initiated** | Server starts, clients follow | AI abilities, authoritative actions |
| **Server Only** | Server only | Cheat-sensitive logic |

### Ability Tags

| Tag Container | Purpose |
|---------------|---------|
| **Ability Tags** | Classify the ability type (identity) |
| **Cancel Abilities With Tag** | Cancel active abilities matching these tags |
| **Block Abilities With Tag** | Prevent activation of abilities matching these tags |
| **Activation Owned Tags** | Applied to owner while ability is active |
| **Activation Required Tags** | Owner must have these to activate |
| **Activation Blocked Tags** | Owner must NOT have these to activate |

### Granting Abilities

```cpp
// Grant in BeginPlay or PossessedBy
FGameplayAbilitySpec Spec(AbilityClass, Level, InputID, this);
ASC->GiveAbility(Spec);

// Grant via data asset array
for (const TSubclassOf<UGameplayAbility>& AbilityClass : DefaultAbilities)
{
    ASC->GiveAbility(FGameplayAbilitySpec(AbilityClass, 1, INDEX_NONE, this));
}
```

### Activation

```cpp
// By class
ASC->TryActivateAbilityByClass(GA_Fireball::StaticClass());

// By tag
FGameplayTagContainer AbilityTags;
AbilityTags.AddTag(FGameplayTag::RequestGameplayTag(FName("Ability.Fireball")));
ASC->TryActivateAbilitiesByTag(AbilityTags);

// By handle (from GiveAbility return)
ASC->TryActivateAbility(AbilitySpecHandle);
```

## GameplayTags

- Use `FGameplayTagContainer` over `TArray<FGameplayTag>` for efficiency
- Enable **Fast Replication** in Project Settings (requires matching tag lists on server/client)
- Define tags in `DefaultGameplayTags.ini` or via Project Settings editor
- Use hierarchical naming: `Ability.Skill.Fireball`, `State.Debuff.Stun`, `Data.Damage`
- Use `AddLooseGameplayTag()` / `RemoveLooseGameplayTag()` for manual tag management
- Loose tags are **not replicated** — manage replication manually if needed

## GameplayCues

- Tags must start with `GameplayCue.` prefix: `GameplayCue.Impact.Fire`
- **Static cues** (`Execute`): One-shot effects at location (particles, sounds)
- **Actor cues** (`Add`/`Remove`): Persistent effects attached to target (aura, shield glow)
- Non-reliable by default — use manual RPC for critical visual feedback
- Batch multiple cues on a single GE for efficiency

## Multiplayer & Prediction

### Client Prediction Flow

1. Client calls `TryActivateAbility()`
2. Generates Prediction Key
3. Locally executes ability (predicted)
4. Server validates → confirms or rolls back

### What Can Be Predicted

- Ability activation
- Triggered events
- GameplayEffect application (but **not removal**)
- Attribute modification
- GameplayTag addition
- GameplayCue execution
- Montage playback

### What Cannot Be Predicted

- GameplayEffect removal — apply inverse effects instead
- Periodic effects

## Ability Tasks

Async operations within an ability's lifetime:

- **`UAbilityTask_WaitTargetData`** — acquire targeting info
- **`UAbilityTask_WaitGameplayEvent`** — wait for a gameplay event tag
- **`UAbilityTask_WaitInputPress`** — wait for input
- **`UAbilityTask_PlayMontageAndWait`** — play animation montage
- **`UAbilityTask_ApplyRootMotion`** — physics-based character movement

Custom tasks: subclass `UAbilityTask`, implement tick/delegate callbacks, register with the owning ability.

## Best Practices

- Subclass `UAbilitySystemComponent` for project-wide baseline functionality
- Use PlayerState-based ASC for games with character respawning
- Use Meta Attributes to separate "how much damage" from "what to do with damage"
- Use `FGameplayEffectSpec` + SetByCaller for dynamic values instead of creating new GE assets per variation
- Use Execution Calculations for complex multi-attribute formulas (damage with armor, resistances)
- Use Modifiers for simple flat/percentage buffs
- Reference Lyra sample project for multiplayer-ready patterns
- Iterate abilities in Blueprint after C++ base setup
- Use `ABILITYLIST_SCOPE_LOCK()` when iterating the ability list to prevent modification

## Anti-Patterns

- **Forgetting `InitAbilityActorInfo()`** — causes "Can't activate LocalOnly ability when not local" errors
- **Wrong ASC ownership for your game** — PlayerState path is complex but persists; Pawn path is simpler but loses state on respawn
- **Modifying ability list while iterating** — check `AbilityScopeLockCount` or use `ABILITYLIST_SCOPE_LOCK()`
- **Forgetting `EndAbility()`** — every execution path must end the ability explicitly
- **Low `NetUpdateFrequency` on PlayerState** — causes visible lag in attribute/tag replication
- **Removing AttributeSets at runtime** — can crash if active effects reference them
- **Predicting periodic effects** — they cannot be predicted; design accordingly
- **Excessive GE asset creation** — use SetByCaller and Execution Calculations for dynamic values instead
- **Ignoring the source code** — the `GameplayAbilities` plugin source is the authoritative reference when docs are unclear
