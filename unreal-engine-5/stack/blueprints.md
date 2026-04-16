---
version: 1.0.0
---

# Blueprints & Blueprint ↔ C++ Interaction

> **Scope**: Blueprint visual scripting patterns in UE5 — when to use Blueprint vs C++, exposing C++ systems via UPROPERTY/UFUNCTION specifiers, communication patterns (interfaces, delegates, casting, function libraries), and Blueprint graph organization.
> **Load when**: writing Blueprint-callable C++ functions, exposing properties to Blueprint, creating Blueprint subclasses of C++ bases, declaring interfaces between Blueprint and C++, declaring event dispatchers, authoring Blueprint function libraries, organizing Blueprint graphs, deciding what logic belongs in Blueprint vs C++.

---

## Blueprint vs C++ Decision Framework

**Core distinction:** C++ defines *systems*; Blueprint defines *behaviors* that compose those systems.

| Use Blueprint | Use C++ |
|---------------|---------|
| Event-driven logic: on damage, on overlap, on input | Performance-critical code executed every frame |
| Content-specific behavior: animation, VFX, sounds | Core framework: base classes, component contracts, attribute systems |
| Designer iteration: tuning values, patrol paths, door timings | Math-heavy computations over large data sets |
| Level scripting: triggers, cutscenes, environmental interaction | Systems with many simultaneously active instances |
| Prototyping new gameplay ideas quickly | Tight loops (for-each over large arrays) |
| Wiring existing C++ systems together in a visual graph | Logic that must compile cleanly for multiplayer prediction |

**Thumb rule:** if a designer will touch it → Blueprint. If it is a performance-critical path → C++.

**Profile before converting.** Use Unreal Insights to identify actual hotspots before porting Blueprint to C++. Most Blueprint gameplay logic runs fast enough; optimize only measured bottlenecks.

**Tick budget rule:** avoid Blueprint Tick on any class with multiple world instances. A Blueprint Tick can be 10× slower than a native tick. Replace periodic checks with `SetTimerByEvent` or delegate subscriptions.

---

## Exposing C++ to Blueprint

### UPROPERTY Specifiers

| Specifier | Blueprint access | When to use |
|-----------|-----------------|-------------|
| `BlueprintReadWrite` | Read + write | Mutable state Blueprint needs to read and set |
| `BlueprintReadOnly` | Read only | State Blueprint displays but must not modify |
| `EditAnywhere` | Editable in defaults and instances | Per-instance tuning values |
| `EditDefaultsOnly` | Editable in class defaults only | Per-class configuration, never per-instance |
| `EditInstanceOnly` | Editable on world-placed instances | World-actor overrides |
| `VisibleAnywhere` | Visible, not editable | Expose component references for inspection |
| `BlueprintAssignable` | Blueprint can bind to this event | Dynamic multicast delegates exposed as event dispatchers |

> Always include `Category = "..."` on every public `UPROPERTY`. Without a category, the Blueprint Details Panel becomes unordered noise.

```cpp
UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "UI")
TSoftObjectPtr<UTexture2D> Icon;

UPROPERTY(EditAnywhere, Category = "Combat")
float BaseDamage = 10.f;

UPROPERTY(BlueprintAssignable, Category = "Events")
FOnHealthChanged OnHealthChanged;
```

### UFUNCTION Specifiers

| Specifier | C++ impl | Blueprint can override | When to use |
|-----------|----------|------------------------|-------------|
| `BlueprintCallable` | Yes | No | Utility functions Blueprint invokes |
| `BlueprintPure` | Yes | No | Side-effect-free getters — no exec pin in Blueprint |
| `BlueprintImplementableEvent` | No | Yes (required) | Events C++ fires; Blueprint provides the visual reaction |
| `BlueprintNativeEvent` | Yes (`_Implementation`) | Yes (optional) | Default C++ behavior that Blueprint may override |
| `BlueprintAuthorityOnly` | Yes | No | Server-only calls exposed to Blueprint |

> Always include `Category` on every Blueprint-exposed `UFUNCTION`. Node menus in Blueprint become chaotic without it.

```cpp
UFUNCTION(BlueprintCallable, Category = "Inventory")
bool TryAddItem(UItemData* Item);

UFUNCTION(BlueprintPure, Category = "Combat")
float GetHealthPercent() const;

// C++ fires the event; Blueprint implements the reaction
UFUNCTION(BlueprintImplementableEvent, Category = "Combat")
void OnDeath(AActor* Killer);

// C++ provides default logic; Blueprint may override
UFUNCTION(BlueprintNativeEvent, Category = "Interaction")
void Interact(APawn* InstigatorPawn);
```

For `BlueprintNativeEvent`, declare the `_Implementation` body in `.cpp`:

```cpp
void AMyActor::Interact_Implementation(APawn* InstigatorPawn)
{
    // Default C++ behavior — Blueprint override replaces this entirely
}
```

Call site in C++ always invokes `Execute_*`, not `_Implementation` directly:
```cpp
IInteractable::Execute_Interact(TargetActor, InstigatorPawn);
```

---

## C++ Base Class + Blueprint Subclass

The standard UE5 architecture pattern: C++ declares structure and contracts; Blueprint subclasses assign assets and wire logic.

**Rules:**
- Create Blueprint children for all C++ Actor types: `BP_PlayerCharacter` ← `APlayerCharacter`
- **Assets live only in Blueprint** — skeletal meshes, materials, sounds, particles are assigned in the Details Panel, never hardcoded in C++ constructors
- Use `TSoftObjectPtr<T>` for optional asset references; hard references load the entire referenced asset chain
- Use `TSubclassOf<T>` when C++ needs to store a reference to a Blueprint class (for spawning, class comparisons)

```cpp
// C++ — declares structure only
UPROPERTY(EditDefaultsOnly, Category = "Visuals")
TSoftObjectPtr<USkeletalMesh> CharacterMesh; // assigned in BP_PlayerCharacter

UPROPERTY(EditDefaultsOnly, Category = "Spawning")
TSubclassOf<AProjectile> ProjectileClass; // set to BP_Projectile in Blueprint
```

Avoid `Cast<>` to Blueprint subclass types from C++ — this hard-loads all assets the Blueprint references into memory. Use interfaces or delegates instead.

---

## Communication Patterns

### Interfaces

Use when multiple unrelated types need to answer the same contract, or when the implementor may be a Blueprint class (not a C++ subclass).

**C++ declaration:**
```cpp
// IInteractable.h
#pragma once
#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "IInteractable.generated.h"

UINTERFACE(MinimalAPI, Blueprintable)
class UInteractable : public UInterface { GENERATED_BODY() };

class IInteractable
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Interaction")
    void Interact(APawn* InstigatorPawn);
};
```

**C++ implementation:**
```cpp
class AChest : public AActor, public IInteractable
{
    virtual void Interact_Implementation(APawn* InstigatorPawn) override;
};
```

**Calling from C++:**
```cpp
// Always use Execute_* — works whether the implementation is C++ or Blueprint
if (TargetActor->Implements<UInteractable>())
{
    IInteractable::Execute_Interact(TargetActor, InstigatorPawn);
}

// Never use Cast<IInterface> to call interface functions
// Cast fails when Blueprint adds the interface without C++ inheritance
```

`Blueprintable` on `UINTERFACE` allows Blueprint classes to implement the interface without inheriting it in C++.

---

### Dynamic Multicast Delegates (Event Dispatchers)

Use for one-to-many notifications: one system broadcasts an event; multiple other systems subscribe independently.

```cpp
// Outside class declaration (in header)
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnHealthChanged, float, NewHealth, float, Delta);

// Inside component
class UHealthComponent : public UActorComponent
{
    UPROPERTY(BlueprintAssignable, Category = "Health")
    FOnHealthChanged OnHealthChanged;

    void ApplyDamage(float Amount)
    {
        Health -= Amount;
        OnHealthChanged.Broadcast(Health, -Amount);
    }
};
```

Blueprint binds via the "Bind Event to OnHealthChanged" or "Assign" nodes on the event dispatcher.

C++ subscription:
```cpp
HealthComp->OnHealthChanged.AddDynamic(this, &AMyCharacter::HandleHealthChanged);
```

> `DECLARE_DYNAMIC_MULTICAST_DELEGATE` is slower than a non-dynamic delegate. Use it only when Blueprint needs to subscribe. For C++-only pub/sub, use `DECLARE_MULTICAST_DELEGATE`.

---

### Casting

Use `Cast<T>` when the object's concrete type is known (e.g., player character, player controller — unique instances).

```cpp
if (APlayerCharacter* PC = Cast<APlayerCharacter>(GetPawn()))
{
    PC->EnableAbility(AbilityTag);
}
```

Casting to a Blueprint subclass from C++ causes all assets that Blueprint references (textures, meshes, particles) to load into memory. Avoid for any non-singleton type.

| Situation | Preferred pattern |
|-----------|-------------------|
| Player-specific interaction (one instance) | `Cast<AMyPlayerCharacter>` |
| Multiple different types share the same behavior | Interface + `Execute_*` |
| Many actors notify one system | `DECLARE_DYNAMIC_MULTICAST_DELEGATE` + `Broadcast` |
| Component on the same Actor | `GetComponentByClass<T>()` |

---

### Blueprint Function Library

Use for static utility functions with no owning object — math helpers, string formatters, actor queries, world context utilities.

```cpp
UCLASS()
class UGameMathLibrary : public UBlueprintFunctionLibrary
{
    GENERATED_BODY()
public:
    // Pure: no exec pin, chainable in Blueprint
    UFUNCTION(BlueprintPure, Category = "Math")
    static float EasedLerp(float A, float B, float Alpha);

    // Callable: has exec pin, may have side effects
    UFUNCTION(BlueprintCallable, Category = "World",
              meta = (WorldContext = "WorldContextObject"))
    static TArray<AActor*> GetActorsInRadius(
        UObject* WorldContextObject, FVector Center, float Radius);
};
```

Use `BlueprintPure` for reads with no side effects (no exec pin — composable in Blueprint expressions). Use `BlueprintCallable` when execution order matters or the function has side effects.

---

## Blueprint Graph Organization

- **Keep Event Graph thin.** Move all non-trivial logic into Blueprint Functions — functions are faster, debuggable in isolation, and reusable
- **Collapse to Function / Macro.** Select a reused node chain → right-click → "Collapse to Function" or "Collapse to Macro"
- **Comment boxes.** Press `C` to create comment regions; label each region by responsibility ("Initialization", "Damage Response", "UI Update")
- **Variable categories.** Use `|` in the Category field for subcategories: `"Combat|Damage"`, `"Combat|Armor"` — shows as a tree in the Blueprint Variables panel
- **Local variables in functions.** Use Blueprint local variables inside functions to avoid polluting the component-level variable list
- **Sequence nodes for ordered execution.** Use Sequence to split one execution flow into multiple ordered branches; keeps graphs readable and avoids diagonal wire crossings

---

## Anti-patterns

- **Blueprint Tick with multiple-instance classes** — use `SetTimerByEvent` or delegate subscription instead; Blueprint Tick is significantly slower than native Tick
- **For-each loops in Blueprint over large arrays** — move to C++; Blueprint iteration is much slower than native iteration
- **Hardcoded asset paths in C++ constructors** — use `EditDefaultsOnly UPROPERTY` and assign in Blueprint Details Panel
- **Casting to Blueprint subclasses from C++** — triggers cascading asset loading; prefer interfaces or delegates
- **Blueprint-only base classes** — cannot be extended in C++; always start the inheritance chain with a C++ class
- **All logic in Level Blueprint** — Level Blueprint is for level-specific one-off triggers only; reusable behaviors belong in dedicated Blueprint Actor classes
- **Single monolithic Blueprint Actor** — split responsibilities into components (C++ or Blueprint); deeply nested event graphs in one Actor class become unmaintainable
- **Using Hot Reload** — use Live Coding (Ctrl+Alt+F11) instead; Hot Reload is unstable and can corrupt editor state