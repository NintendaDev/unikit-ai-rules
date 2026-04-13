---
version: 1.0.0
---

# Performance Optimization

> **Scope**: Rules for performance optimization — memory/GC, caching, strings, object pooling, delegates, math, physics, UI optimization, Tick management, cooking/packaging, mobile specifics.
> **Load when**: performance issues, optimization, hot paths, memory/GC, pooling, Tick management.

---

## Memory & Garbage Collection

- UE5 GC is mark-and-sweep — ALL UObject* fields MUST be `UPROPERTY()` to be visible to GC
- Non-UPROPERTY `UObject*` fields WILL be garbage collected unexpectedly — this is the #1 UE crash cause
- Avoid creating UObjects in Tick — use pooling or pre-allocation
- `UPROPERTY(Transient)` for runtime-only fields that should not be serialized (reduces save/load overhead)
- Use `FObjectKey` for UObject-keyed maps — stable across GC
- `AddToRoot()` / `RemoveFromRoot()` for UObjects that must survive GC without an outer — use sparingly, always pair
- Call `ConditionalBeginDestroy()` for manual UObject cleanup when needed

### Value Types vs UObject

```cpp
// ✅ USTRUCT — stack-allocated, no GC overhead, value semantics
USTRUCT(BlueprintType)
struct FItemData
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere)
    FName ItemId;

    UPROPERTY(EditAnywhere)
    int32 Quantity = 0;
};

// ❌ UObject for simple data — unnecessary GC tracking, heap allocation
UCLASS()
class UItemData : public UObject { ... }; // Overkill for data-only
```

**Rule**: Use `USTRUCT` for data without lifecycle. Use `UObject` only when you need GC tracking, Blueprint subclassing, or reflection-heavy features.

### Smart Pointers (Non-UObject)

For non-UObject C++ objects, use UE smart pointers:

| Type | Use case |
|------|----------|
| `TSharedPtr<T>` | Shared ownership (reference counted) |
| `TSharedRef<T>` | Non-nullable shared reference |
| `TWeakPtr<T>` | Non-owning observer of TSharedPtr |
| `TUniquePtr<T>` | Exclusive ownership |

- NEVER mix `TSharedPtr` with UObject pointers — UObject has its own GC
- Prefer `TUniquePtr` when only one owner exists — avoids ref counting overhead
- `MakeShared<T>(Args...)` instead of `TSharedPtr<T>(new T(Args...))` — single allocation

### Allocation Strategies

```cpp
// ✅ Reserve capacity upfront — avoids reallocation
TArray<FHitResult> Results;
Results.Reserve(ExpectedCount);

// ✅ Empty() + Reserve() instead of new array
Results.Empty(ExpectedCount); // Resets count, keeps allocation if capacity fits

// ✅ SetNum for fixed-size initialization
TArray<float> Weights;
Weights.SetNum(SlotCount); // Sets exact count, default-initializes

// ❌ Creating new TArray in Tick
void Tick(float DeltaTime)
{
    TArray<AActor*> Found; // Allocates every frame
    // ...
}

// ✅ Member array, reused
TArray<AActor*> CachedResults; // Declared as member
void Tick(float DeltaTime)
{
    CachedResults.Reset(); // Keeps allocation, resets count to 0
    // ...
}
```

---

## Caching

- Cache `GetWorld()`, `GetOwner()`, `GetPlayerController()` results when accessed frequently — store in member variable during `BeginPlay`
- Cache `Cast<T>()` results — casting is not free (traverses class hierarchy)
- Early exit (`if (!bIsDirty) return;`) to avoid unnecessary computations
- Cache `FName` for frequently used identifiers: `static const FName WeaponSocket(TEXT("WeaponSocket"));`
- Cache Gameplay Tags: `static FGameplayTag DamageTag = FGameplayTag::RequestGameplayTag(FName("Damage.Physical"));`
- Cache component references in `BeginPlay()` — NEVER call `FindComponentByClass<T>()` in Tick

### Precomputed Data

If a value is constant and does not change at runtime — compute it once in `BeginPlay` or constructor. Never recompute in Tick:

```cpp
// ❌ Recomputed every frame
void Tick(float DeltaTime)
{
    float MaxRange = WeaponData->GetBaseRange() * RangeMultiplier; // Recomputed
    // ...
}

// ✅ Computed once
void BeginPlay()
{
    Super::BeginPlay();
    CachedMaxRange = WeaponData->GetBaseRange() * RangeMultiplier;
}
```

---

## Strings

- `FName` for identifiers, tags, socket names, row names — hashed, O(1) comparison, immutable
- `FString` for mutable runtime strings, concatenation, manipulation
- `FText` for ALL user-facing text — supports localization, formatting
- NEVER use `FString` for identifiers compared frequently — use `FName`
- NEVER use `FName` or `FString` for UI display — use `FText`

```cpp
// ✅ Correct usage per type
static const FName WeaponSocket(TEXT("hand_r"));           // Identifier
FString LogMessage = FString::Printf(TEXT("Hit %s"), *TargetName); // Runtime string
FText DisplayName = NSLOCTEXT("UI", "PlayerName", "Player"); // User-facing

// ❌ FString for frequent comparison — slow
if (ItemId == TEXT("sword_01")) { } // String comparison every time

// ✅ FName — hashed comparison
static const FName SwordId(TEXT("sword_01"));
if (ItemId == SwordId) { } // Integer comparison
```

### String Formatting

```cpp
// ✅ FString::Printf for logging/debug strings
UE_LOG(LogGame, Log, TEXT("Player %s scored %d"), *PlayerName, Score);

// ✅ FText::Format for UI (supports localization)
FText Result = FText::Format(LOCTEXT("ScoreFormat", "{0}: {1} points"), PlayerName, Score);

// ❌ Concatenation in hot paths — multiple allocations
FString Result = PartA + TEXT(" ") + PartB; // 2+ allocations
```

---

## Tick Management

**Minimize Tick usage** — Tick is the #1 performance sink in UE5:

```cpp
// ❌ Tick running every frame even when idle
void Tick(float DeltaTime)
{
    CheckForNearbyEnemies(); // Runs even when no enemies exist
}

// ✅ Disable Tick when not needed
AMyActor::AMyActor()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.bStartWithTickEnabled = false; // Off by default
}

void Activate()
{
    SetActorTickEnabled(true);
}

void Deactivate()
{
    SetActorTickEnabled(false);
}

// ✅ Use Timer instead of Tick for periodic checks
GetWorldTimerManager().SetTimer(
    CheckTimerHandle,
    this,
    &AMyActor::CheckForNearbyEnemies,
    0.5f,  // Every 0.5 seconds
    true   // Looping
);

// ✅ Use Tick interval for reduced frequency
PrimaryActorTick.TickInterval = 0.1f; // 10 Hz instead of every frame
```

### Component Tick Control

```cpp
// ✅ Disable component tick independently
HealthComponent->PrimaryComponentTick.bCanEverTick = false;

// ✅ Tick groups for ordering
PrimaryActorTick.TickGroup = TG_PrePhysics; // Before physics
PrimaryActorTick.AddPrerequisite(OtherActor, OtherActor->PrimaryActorTick); // Dependency
```

---

## Object Pooling

- Pools instead of `SpawnActor`/`Destroy` for frequently created objects
- Pattern: `Acquire()` retrieves from pool + activate, `Release()` — deactivate + return to pool

### Actor Pool Pattern

```cpp
UCLASS()
class UActorPool : public UObject
{
    GENERATED_BODY()

public:
    void Initialize(UWorld* World, TSubclassOf<AActor> ActorClass, int32 InitialSize);

    AActor* Acquire(const FTransform& SpawnTransform);

    void Release(AActor* Actor);

private:
    UPROPERTY()
    TArray<AActor*> Pool;

    UPROPERTY()
    TSubclassOf<AActor> PooledClass;

    TWeakObjectPtr<UWorld> WorldRef;
};

// Usage
AActor* Projectile = ProjectilePool->Acquire(SpawnTransform);
// ... later
ProjectilePool->Release(Projectile);
```

### State Reset

- When an Actor is returned to the pool, ALL state must be reset: timers cleared, delegates unbound from external sources, physics state reset, overlaps cleared
- Use a `ResetForPool()` virtual method on poolable actors

### Deactivation Strategy

```cpp
// ✅ Full deactivation for pooled actors
void DeactivateForPool(AActor* Actor)
{
    Actor->SetActorHiddenInGame(true);
    Actor->SetActorEnableCollision(false);
    Actor->SetActorTickEnabled(false);

    // Disable components
    if (UPrimitiveComponent* Prim = Actor->FindComponentByClass<UPrimitiveComponent>()) {
        Prim->SetSimulatePhysics(false);
    }
}
```

---

## Delegates & Events

```cpp
// ✅ Bind once in BeginPlay, unbind in EndPlay
// Store handle for later removal
FDelegateHandle Handle = Subsystem->OnEvent.AddUObject(this, &UMyComponent::HandleEvent);

// ✅ Use static delegate binding when possible — avoids dynamic dispatch
DECLARE_MULTICAST_DELEGATE_OneParam(FOnScoreChanged, int32);

// ❌ Dynamic delegates for C++-only code — unnecessary reflection overhead
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnScoreChanged, int32, NewScore);
// Dynamic delegates are only needed when Blueprint binding is required
```

- Use `DECLARE_MULTICAST_DELEGATE` for C++-only events (faster, no reflection)
- Use `DECLARE_DYNAMIC_MULTICAST_DELEGATE` ONLY when Blueprint needs to bind
- Lambda captures in Tick: avoid — cache the lambda or use member function pointer

---

## Math

- `FVector::SizeSquared()` instead of `FVector::Size()` for distance comparisons — avoids `sqrt`
- `FMath::Square(X)` instead of `X * X` for readability + potential optimization
- Precompute inverse values: `Value * InvMax` instead of `Value / Max`
- `FVector::ZeroVector`, `FVector::OneVector`, `FRotator::ZeroRotator`, `FQuat::Identity` instead of constructing new ones
- `FMath::IsNearlyZero()`, `FMath::IsNearlyEqual()` for float comparison
- `FMath::Clamp()`, `FMath::Lerp()`, `FMath::InterpTo()` — engine-optimized built-ins
- Integer arithmetic where possible

---

## Collections

### TArray Optimization

```cpp
// ✅ Reserve before bulk insertion — avoids reallocation
TArray<FHitResult> Results;
Results.Reserve(128);

// ✅ Emplace instead of Add — constructs in place, avoids copy
Results.Emplace(HitLocation, HitNormal, HitActor);

// ✅ Reset() to reuse allocation — Reset keeps memory, Empty frees it
Results.Reset(); // Count = 0, capacity unchanged
// vs
Results.Empty(); // Count = 0, may shrink capacity

// ✅ RemoveSwap for unordered arrays — O(1) instead of O(n) shift
Array.RemoveAtSwap(Index); // Swaps with last element, no shift
```

### TSet / TMap for Lookups

```cpp
// ❌ O(n) — linear scan
TArray<int32> ActiveIds;
if (ActiveIds.Contains(Id)) { } // Linear search

// ✅ O(1) — hash lookup
TSet<int32> ActiveIds;
if (ActiveIds.Contains(Id)) { }

// ✅ TMap for key-value lookups
TMap<FName, FItemData> ItemDatabase;
if (FItemData* Item = ItemDatabase.Find(ItemId)) {
    // Use Item directly — no copy
}
```

### Enum as Map Key

```cpp
// ✅ enum class as TMap key — works out of the box in UE5, no boxing issue
TMap<EWeaponType, FWeaponConfig> WeaponConfigs;
```

---

## Physics

- Configure Collision Channels and Profiles — disable unnecessary interactions in Project Settings → Collision
- Use `ECC_GameTraceChannel` custom channels instead of default channels
- `LineTraceSingleByChannel` / `SweepSingleByChannel` for simple queries — avoid `Multi` variants when single hit suffices
- Pre-allocated hit result arrays for Multi queries:

```cpp
// ✅ Static buffer for overlap queries
TArray<FOverlapResult> OverlapResults;
OverlapResults.Reserve(32); // Allocated once as member

GetWorld()->OverlapMultiByChannel(
    OverlapResults,
    Origin,
    FQuat::Identity,
    ECC_Pawn,
    FCollisionShape::MakeSphere(Radius)
);
```

- Use `Async` trace variants for non-time-critical queries: `AsyncLineTraceByChannel`

---

## UI Optimization (UMG / Slate)

### Widget Visibility

- Hide via `SetVisibility(ESlateVisibility::Collapsed)` — removes from layout + rendering
- `ESlateVisibility::Hidden` — hidden but occupies layout space
- `ESlateVisibility::HitTestInvisible` — visible but ignores input
- Avoid `RemoveFromParent()` + `AddToViewport()` for toggling — expensive widget tree rebuild

### Widget Update Frequency

- Do NOT bind widget properties with `TAttribute` lambdas that run every frame for complex computations
- Prefer event-driven updates: listen for data changes, update widget only when data changes
- Use `InvalidateLayoutAndVolatility()` sparingly — triggers layout recalculation

### Slate Optimization

```cpp
// ✅ SNew — compile-time Slate widget creation (faster than UMG Blueprint)
SNew(STextBlock)
    .Text(FText::FromString(TEXT("Score: 100")))

// ✅ Invalidation Box — caches child widget rendering
SNew(SInvalidationPanel)
[
    // Child widgets only re-rendered when explicitly invalidated
]
```

- Avoid complex widget hierarchies with deep nesting — flatter trees render faster
- `Volatile` widgets (frequently changing) should NOT be inside `SInvalidationPanel`

---

## Async Loading

### Streamable Manager

```cpp
// ✅ Async load with soft reference — does not block game thread
FStreamableManager& Manager = UAssetManager::GetStreamableManager();
TSoftObjectPtr<UTexture2D> TextureRef;

Manager.RequestAsyncLoad(
    TextureRef.ToSoftObjectPath(),
    FStreamableDelegate::CreateUObject(this, &UMyClass::OnTextureLoaded)
);

// ✅ Bulk async load
TArray<FSoftObjectPath> AssetsToLoad;
AssetsToLoad.Add(Texture1.ToSoftObjectPath());
AssetsToLoad.Add(Texture2.ToSoftObjectPath());

Manager.RequestAsyncLoad(
    AssetsToLoad,
    FStreamableDelegate::CreateLambda([this]() { OnBulkLoadComplete(); })
);
```

- NEVER use `LoadObject<T>()` / `StaticLoadObject()` in gameplay code — blocks game thread
- Use `TSoftObjectPtr<T>` / `TSoftClassPtr<T>` in UPROPERTY for lazy-loadable references
- Hard references (`UTexture2D*`) force asset into memory at owner load time — use only for always-needed assets

---

## Blueprint / C++ Boundary

- Logic in C++ → visualization in Blueprint (same principle as Non-Actor First)
- `BlueprintCallable` methods should be lightweight — avoid exposing hot-path methods
- Nativize performance-critical Blueprint logic into C++
- `UFUNCTION(BlueprintPure)` for getters — no execution pin, cheaper to call
- Avoid Blueprint Tick — use C++ Tick or Timer-based approach instead

---

## Mobile Specifics

- Limit UI update frequency (not every frame) — event-driven widget updates
- Disable `bCanEverTick` on all actors/components that don't need it
- Use compressed textures (ASTC for mobile)
- Lower physics substep count and solver iterations
- Minimize draw calls — use instanced static meshes, merge actors
- Use LODs aggressively — auto-generate with engine tools
- `FApp::SetBenchmarking(false)` and reduced target frame rate for battery-friendly idle
- Use Async loading for all non-essential assets
- Minimize garbage collection pauses — use `GC.SetMaxFrameGCSweepTime()` budgeting
