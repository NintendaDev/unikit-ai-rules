---
version: 1.0.0
---

# Design Principles

> **Scope**: Universal software design principles adapted for UE5 — SOLID, GRASP, KISS, DRY, inheritance guidelines, SRP decision framework, method design, defensive programming.
> **Load when**: designing systems, creating new classes, choosing architecture patterns, deciding when to split or merge classes, method design, defensive programming.

---

## SOLID Principles

- **Single Responsibility** — each class has one reason to change. Don't mix logic, input, visual, and data in one Actor or Component
- **Open/Closed** — extend behavior through inheritance, interfaces (`I` prefix), composition (components), and delegates, not modifying existing code
- **Liskov Substitution** — subclass must fully replace base type without breaking behavior. Critical for UE reflection system — `TSubclassOf<T>` and `Cast<T>` rely on correct type hierarchies
- **Interface Segregation** — use UE interfaces (`UINTERFACE` + `I` prefix pure abstract class) for narrow, role-specific contracts. Prefer multiple small interfaces over one monolithic interface
- **Dependency Inversion** — dependencies point from concrete to abstract. Inject via constructor, `Initialize()`, or Subsystem lookup rather than hardcoded `GetWorld()->GetSubsystem<T>()` chains

### SRP in Practice: When to Split Classes

Apply SRP through the lens of **High Cohesion** and **Low Coupling** (GRASP). A class violates SRP when it accumulates many loosely related dependencies that operate on different data — this signals low cohesion and warrants splitting.

**Do NOT split** when:

1. **Dependencies are few and logic is unified by a single domain concept.** Multiple sub-responsibilities under one cohesive name are fine. Example: `UQuestSubsystem` handles quest creation, progression, and rewards — different operations, but all bound by the "quest" domain. Contrast with `UGameManager` where "game" implies everything — such a class should be split.

2. **The class is a framework facade for developer convenience.** A public API facade may aggregate multiple responsibilities to simplify usage for consumers. Split the implementation across multiple `.cpp` files or use helper classes. This is an exception — do not abuse it. Example: `AGameMode` aggregating multiple game rule sub-systems.

**Method-level SRP:** When a class keeps multiple sub-responsibilities without being split into separate classes, each responsibility MUST be expressed as a separate method. Never mix different operations in one method. Example: `UQuestSubsystem::StartNewQuest()` and `UQuestSubsystem::ReceiveReward()` — not a single `UQuestSubsystem::ProcessQuest()`.

- Keep methods short and focused — extract private helper methods when a method grows beyond a single logical step
- Always decompose methods by SRP within the class — each method does one thing, complex operations are composed from smaller reusable private methods

## GRASP Principles

- **Information Expert** — assign responsibility to the class that owns the data for it
- **Creator** — object is created by whoever contains, aggregates, or has data for initialization. In UE5: `NewObject<T>()`, `SpawnActor<T>()`, `CreateDefaultSubobject<T>()`, or Factory pattern
- **Controller** — separate controller class for handling system events and coordination. `APlayerController` is the canonical example. Controller holds no business logic — delegates only
- **Low Coupling** — minimize dependencies between classes. Use interfaces, delegates (single/multicast), Subsystems, and Gameplay Tags
- **High Cohesion** — all class members work toward one task. Extract unrelated logic into separate Components or plain classes
- **Polymorphism** — replace conditional logic (`switch` by type) with polymorphism via UE interfaces or virtual functions. Use `Cast<T>` for safe downcasting when polymorphism is not possible
- **Indirection** — introduce intermediaries (Subsystems, Gameplay Message Router, delegate-based event buses) to reduce direct coupling
- **Static Method Extraction** — Static methods in non-utility classes are an anti-pattern. Extract to a dedicated `UBlueprintFunctionLibrary` subclass or `F`-prefix utility class. Before adding a utility function, check whose data it operates on (Information Expert) — if the data belongs to another type, the method should be there
- **Pure Fabrication** — create service classes (Calculator, Validator, Factory) not tied to domain if it increases cohesion. In UE5, these are `UObject` subclasses or plain `F` structs
- **Protected Variations** — protect system from changes through interfaces (`UINTERFACE`) and `TSubclassOf<T>` at instability points

## Method Patterns

- When a `CanAction()` method defines preconditions and a `TryAction()` method performs the action, `TryAction()` MUST call `CanAction()` for its guard check — never duplicate the conditions. If `CanAction()` uses data-retrieval calls that `TryAction()` also needs for the actual work, re-querying after the `Can` check is acceptable for infrequent operations. For hot paths, warn the developer about the double lookup and confirm the approach before proceeding
- `virtual` methods meant to be overridden by subclasses MUST be called by the base class (Template Method pattern). If a `virtual` method is only called by subclasses, it is unnecessary indirection — remove it and let subclasses call the concrete helper directly
- BlueprintNativeEvent pattern: `UFUNCTION(BlueprintNativeEvent)` declares `Foo()`, engine generates `Foo_Implementation()` virtual method for C++ override. Always implement `Foo_Implementation`, never override `Foo` directly

## API Design

- Public methods MUST NOT return engine implementation-detail types (e.g., raw `FTimerHandle`, internal `TArray` by non-const reference). Return `void`, domain types, or purpose-built result types
- `UFUNCTION(BlueprintCallable)` — methods callable from Blueprint
- `UFUNCTION(BlueprintPure)` — const methods with no side effects (getters)
- `UFUNCTION(BlueprintImplementableEvent)` — Blueprint-only override (no C++ implementation)
- `UFUNCTION(BlueprintNativeEvent)` — C++ default + Blueprint override
- Return `const TArray<T>&` for read-only collection access — avoids copy

## Subscription Lifecycle

- Bind delegates in `BeginPlay()`, unbind in `EndPlay()` for Actor/Component lifecycle
- For dynamic multicast delegates: `AddDynamic(this, &UMyClass::Handler)` / `RemoveDynamic(this, &UMyClass::Handler)`
- For C++ multicast delegates: `AddUObject(this, &UMyClass::Handler)` — returns `FDelegateHandle` for removal
- Always store `FDelegateHandle` for later removal — prevents dangling bindings
- Subsystem delegates: bind in Subsystem `Initialize()`, unbind in `Deinitialize()`

```cpp
// ✅ Proper delegate lifecycle
void UMyComponent::BeginPlay()
{
    Super::BeginPlay();
    if (UMySubsystem* Sub = GetWorld()->GetSubsystem<UMySubsystem>()) {
        DelegateHandle = Sub->OnItemSold.AddUObject(this, &UMyComponent::HandleItemSold);
    }
}

void UMyComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    if (UMySubsystem* Sub = GetWorld()->GetSubsystem<UMySubsystem>()) {
        Sub->OnItemSold.Remove(DelegateHandle);
    }
    Super::EndPlay(EndPlayReason);
}
```

## UE5 Gameplay Framework

### Actor Hierarchy

```
AGameModeBase          — Game rules (server-only, one per game)
  AGameMode            — Match-based game rules (with match state)
AGameStateBase         — Shared game state (replicated to all clients)
APlayerController      — Input → Pawn translation, UI ownership, client authority
APlayerState           — Per-player replicated state (score, name, team)
APawn / ACharacter     — Physical player/AI representation in world
AHUD                   — Canvas drawing, widget creation (legacy — prefer UMG)
```

**Rule**: Controllers own logic and decisions, Pawns own physical representation. Never put decision logic in Pawn; never put movement implementation in Controller.

### Subsystems

Prefer Subsystems over singletons or manager Actors:

| Subsystem type | Lifetime | Use case |
|---|---|---|
| `UEngineSubsystem` | Engine lifetime | Editor tools, global services |
| `UGameInstanceSubsystem` | Game instance | Persistent cross-map systems (saves, analytics) |
| `UWorldSubsystem` | World/Level lifetime | Level-scoped systems (spawning, AI) |
| `ULocalPlayerSubsystem` | Local player | Per-player UI, input, settings |

Access: `GetWorld()->GetSubsystem<UMySubsystem>()` or `UGameplayStatics::GetGameInstance()->GetSubsystem<T>()`

### Component-Based Design

Prefer composition via `UActorComponent` over deep Actor inheritance:

```cpp
// ✅ Composition — attach components to any Actor
UPROPERTY(VisibleAnywhere)
UHealthComponent* HealthComponent;

UPROPERTY(VisibleAnywhere)
UInventoryComponent* InventoryComponent;

// ❌ Deep inheritance — rigid, hard to reuse
class APlayerCharacter : public ADamageableCharacter : public AInventoryCharacter
```

## Defensive Programming

- Every method is responsible for the correctness of its own actions. Each method MUST validate preconditions before performing operations that could lead to incorrect state (e.g., `Contains()` before `Remove()`, null check before use, valid index before access). If the same validation logic is repeated across multiple methods, extract it into a dedicated validation/guard method so other methods can reuse a single check point
- `check(Condition)` for invariants that must never be violated (crashes in all builds)
- `ensure(Condition)` for conditions that indicate a bug but allow recovery (logs callstack, fires once)
- `IsValid(Object)` or `IsValid(this)` before accessing UObject pointers that may have been garbage collected
- `if (!ensure(Ptr != nullptr)) return;` — combined validate + early-out pattern (non-fatal in development, logs callstack)
- Every `Remove`/`Add` on a state-tracking collection must be preceded by an existence check (`Contains`, `Find`, `FindByPredicate`). Never assume the caller guarantees the item is present — validate at the mutation site
- `switch` on `enum` MUST include `default: checkNoEntry();` — fires fatal error on unexpected enum values. Alternative: `default: ensureMsgf(false, TEXT("Unexpected value: %d"), (int32)Value);` for non-fatal
- Methods that iterate over a mutable collection in a `while` loop must include a safety-break counter (`MaxIterations`) and `UE_LOG(Warning)` if the limit is hit — prevents infinite loops when an invariant is violated at runtime
- Always `nullptr`-check results from `Cast<T>()`, `GetWorld()`, `GetOwner()`, `GetSubsystem<T>()` before use

## KISS & DRY

- **KISS (Keep It Simple, Stupid)** — prefer the simplest solution that works. KISS balances SOLID: don't introduce interfaces, abstractions, or patterns until complexity demands it. Especially on early project stages — start with a concrete class, extract an interface when a second implementation or testability actually requires it. Over-engineering upfront costs more than refactoring later.

- **DRY (Don't Repeat Yourself)** — every piece of knowledge should have a single authoritative source. When the same logic appears in 3+ places, extract it into a shared method or class. But do not merge code that merely looks similar yet represents different domain concepts — coincidental duplication is not real duplication.

- **Shallow Inheritance** — keep inheritance hierarchies flat: ideally one level deep from an engine base class (`AActor`, `UActorComponent`, `UObject`). Prefer composition (Components, Subsystems, Interfaces) over deep inheritance chains. Deeper hierarchies are a rare exception, not the norm.
