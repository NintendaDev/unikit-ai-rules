---
version: 1.0.0
---

# Iris Replication System

> **Scope**: Iris — UE5's next-generation, data-driven replication system — covering project setup, Push Model integration, subobject replication, spatial filtering, prioritization, memory/buffer configuration, and migration from the legacy replication system.
> **Load when**: enabling or configuring Iris replication, authoring replicated UObject subobjects, setting up spatial relevancy filters for many-actor scenarios, tuning replication memory budgets, migrating from legacy replication or Replication Graph, debugging network desync or bandwidth issues with Iris, integrating Iris with GAS or large-scale worlds.

---

## Core Concepts

- **Iris** is UE5's replacement for the legacy replication system, designed around Fortnite's requirements (100-player servers). It uses a data-driven, Push Model architecture that avoids per-frame polling.
- **ReplicationSystem** — the central orchestrator that drives the replication loop.
- **ReplicationBridge / UObjectReplicationBridge** — connects UE `UObject`s to the Iris pipeline; manages object registration and NetHandle lifetime.
- **ReplicationFragment** — wraps a `ReplicationState` for a specific object; created automatically via `FReplicationFragmentUtil::CreateAndRegisterFragmentsForObject`.
- **ReplicationState / FReplicationStateDescriptor** — holds the actual replicated data and its schema (property types, conditions, serializers).
- **NetHandle** — the unique identifier an object has within the Iris replication system.
- **Push Model** — properties mark themselves dirty on write instead of being polled every frame; Iris requires push model for best performance.
- **SubObjectReplicationList** — the modern mechanism for registering UObject subobjects; replaces the legacy `ReplicateSubobjects` override.

---

## Project Setup

### 1. Enable the plugin

In your `.uproject` file (or via the Plugin Browser), enable the **Iris** plugin.

### 2. Build.cs dependency

In your primary game module's `Build.cs`, add Iris support **before** `base.SetupModuleSupport(Target)` if you use a custom base, or simply call:

```csharp
// MyGame.Build.cs
SetupIrisSupport(Target);
```

This adds the required module references (`IrisCore`, `IrisUtils`, `Net`, etc.) for the current target.

### 3. DefaultEngine.ini — enable Iris and Push Model

```ini
[SystemSettings]
net.Iris.UseIrisReplication=1
net.Iris.PushModelMode=1
net.IsPushModelEnabled=1
net.SubObjects.DefaultUseSubObjectReplicationList=1
```

All four lines are required together. Omitting `net.IsPushModelEnabled=1` leaves the legacy polling path active alongside Iris, negating bandwidth savings.

---

## Replicating Properties (Push Model Pattern)

Always declare properties as push-based when using Iris. The `MARK_PROPERTY_DIRTY_FROM_NAME` macro must be called whenever the value changes.

```cpp
UCLASS()
class AMyActor : public AActor
{
    GENERATED_BODY()

    UPROPERTY(Replicated)
    int32 Health = 100;

    void TakeDamage(int32 Amount)
    {
        Health -= Amount;
        MARK_PROPERTY_DIRTY_FROM_NAME(AMyActor, Health, this);  // required with push model
    }
};

void AMyActor::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);

    FDoRepLifetimeParams Params;
    Params.bIsPushBased = true;
    DOREPLIFETIME_WITH_PARAMS_FAST(AMyActor, Health, Params);
}
```

In UE 5.6+ unregistered `UPROPERTY(Replicated)` fields replicate with default settings automatically (Iris-like behavior). To enforce registration, set `Net.EnsureOnMissingReplicatedPropertiesRegister=true`.

---

## UObject Subobject Replication

`UObject` instances (not derived from `AActor`) replicate as **subobjects** of an owning actor or component. The legacy `ReplicateSubobjects` override is deprecated; use `AddReplicatedSubObject` / `RemoveReplicatedSubObject` instead.

### Subobject class requirements

```cpp
UCLASS()
class UMyInventoryItem : public UObject
{
    GENERATED_BODY()

public:
    // 1. Declare as networking-capable
    bool IsSupportedForNetworking() const override { return true; }

    UPROPERTY(Replicated)
    int32 ItemCount = 0;

    void SetItemCount(int32 NewCount)
    {
        ItemCount = NewCount;
        MARK_PROPERTY_DIRTY_FROM_NAME(UMyInventoryItem, ItemCount, this);
    }
};

void UMyInventoryItem::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);

    FDoRepLifetimeParams Params;
    Params.bIsPushBased = true;
    DOREPLIFETIME_WITH_PARAMS_FAST(UMyInventoryItem, ItemCount, Params);
}

// 2. RegisterReplicationFragments — if omitted, Iris calls CreateAndRegisterFragmentsForObject
//    automatically; implement only if you need custom fragment registration.
void UMyInventoryItem::RegisterReplicationFragments(
    UE::Net::FFragmentRegistrationContext& Context,
    UE::Net::EFragmentRegistrationFlags RegistrationFlags)
{
    UE::Net::FReplicationFragmentUtil::CreateAndRegisterFragmentsForObject(this, Context, RegistrationFlags);
}
```

### Owning actor/component wiring

```cpp
UCLASS()
class UInventoryComponent : public UActorComponent
{
    GENERATED_BODY()

    UPROPERTY(Replicated)
    TArray<TObjectPtr<UMyInventoryItem>> Items;

public:
    void AddItem(UMyInventoryItem* Item)
    {
        Items.Add(Item);
        AddReplicatedSubObject(Item);  // registers with Iris
    }

    void RemoveItem(UMyInventoryItem* Item)
    {
        Items.Remove(Item);
        RemoveReplicatedSubObject(Item);  // unregisters from Iris
    }
};
```

**Critical:** Always create subobject instances with the owning actor/component as `Outer`:

```cpp
// Correct — Outer = owning actor
auto* Item = NewObject<UMyInventoryItem>(OwningActor);
OwningActor->GetInventoryComponent()->AddItem(Item);

// Wrong — Outer mismatch causes undefined replication behavior
auto* Item = NewObject<UMyInventoryItem>(GetTransientPackage());
```

---

## Spatial Filtering (Relevancy)

By default, all `AActor`-derived classes are **AlwaysRelevant** in Iris — they replicate to every connected client regardless of distance. This is catastrophic for world objects with many instances (trees, foliage, pickups).

Apply the `Spatial` filter in `DefaultEngine.ini` under `[/Script/IrisCore.ObjectReplicationBridgeConfig]`:

```ini
[/Script/IrisCore.ObjectReplicationBridgeConfig]
; Restrict world-decoration actors to spatial relevancy (distance-based culling)
+FilterConfigs=(ClassName=/Script/YourGame.ATreeActor, DynamicFilterName=Spatial)
+FilterConfigs=(ClassName=/Script/YourGame.APickupActor, DynamicFilterName=Spatial)

; APawn already receives Spatial filtering by default
; AInfo and APlayerState are AlwaysRelevant by default
```

Add hysteresis to avoid rapid in/out relevancy flicker at the boundary:

```ini
[/Script/IrisCore.ReplicationFilteringConfig]
bEnableObjectScopeHysteresis=true
DefaultHysteresisFrameCount=4
HysteresisUpdateConnectionThrottling=4
; Slower hysteresis for pawns (character bodies lingering at the edge)
+FilterProfiles=(FilterProfileName=PawnFilterProfile, HysteresisFrameCount=30)

[/Script/IrisCore.ObjectReplicationBridgeConfig]
+FilterConfigs=(ClassName=/Script/Engine.Pawn, DynamicFilterName=Spatial, FilterProfile=PawnFilterProfile)
```

Grid (spatial) filter configuration:

```ini
[/Script/IrisCore.NetObjectGridFilterConfig]
DefaultCullDistance=15000.0   ; cm — matches typical NetCullDistanceSquared sqrt
bUseExactCullDistance=false   ; grid-cell approximation is cheaper
```

---

## Buffer & Memory Configuration

Iris pre-allocates per-object tracking buffers. **These buffers never shrink** — once expanded they stay at peak size even after objects are removed.

| Setting | Default | Notes |
|---------|---------|-------|
| `MaxReplicatedObjectCount` | 65536 | Hard limit; must be power of 2. Increase only when needed. |
| `InitialNetObjectListCount` | 65536 | Initial buffer allocation for object tracking. |
| `NetObjectListGrowCount` | 16384 | Expansion amount when buffers are exhausted. |
| `PreAllocatedMemoryBuffersObjectCount` | 65536 | Pre-allocated memory for chunked arrays. |
| `MaxDeltaCompressedObjectCount` | 2048 | Size of the delta-compression pool. |
| `MaxNetObjectGroupCount` | 2048 | Maximum filter groups allowed. |

Override via `GameInstance`:

```cpp
void UMyGameInstance::OverrideIrisReplicationSystemConfig(
    FNetDriverReplicationSystemConfig& OutConfig, bool bIsServer) const
{
    Super::OverrideIrisReplicationSystemConfig(OutConfig, bIsServer);

    if (bIsServer)
    {
        OutConfig.MaxReplicatedObjectCount = 1 << 17;  // 131072 for large server worlds
    }
    else
    {
        // Clients track fewer objects — right-size to reduce overhead
        OutConfig.MaxReplicatedObjectCount = 1 << 15;  // 32768
    }
}
```

---

## Performance Guidelines

- **Use Push Model everywhere.** Never leave `bIsPushBased = false` for properties that change infrequently — polling every property every frame negates Iris's bandwidth savings.
- **Keep MaxReplicatedObjectCount as small as reasonable.** Increasing buffer capacity causes permanent CPU overhead even when the object count drops back down.
- **Apply Spatial filter to ALL world-actor classes** with more than a few hundred instances. The default AlwaysRelevant behavior with 10,000+ actors collapses server performance regardless of the replication system.
- **Remove server-side camera components.** `USpringArmComponent` and `UCameraComponent` tick unnecessarily on dedicated servers; strip them in `ACharacter::BeginPlay()` for server builds.
- **Increase tick rate cautiously.** Moving from 30 Hz to 120 Hz can triple outgoing bandwidth. Profile with Unreal Insights (`NetBroadcastTickTime` trace) before committing.
- **Separate client and server buffer configurations** via `OverrideIrisReplicationSystemConfig` — clients never need the same MaxReplicatedObjectCount as the server.
- **Delta compression** is opt-in and has its own pool (`MaxDeltaCompressedObjectCount`); enable it per-class for large structs that change partially.

```ini
[/Script/IrisCore.ObjectReplicationBridgeConfig]
+DeltaCompressionConfigs=(ClassName=/Script/YourGame.AMyHeavyActor, bEnableDeltaCompression=true)
```

---

## Migration from Legacy Replication

| Legacy | Iris equivalent |
|--------|----------------|
| `virtual bool ReplicateSubobjects(...)` | `AddReplicatedSubObject` / `RemoveReplicatedSubObject` |
| `DOREPLIFETIME(Class, Prop)` | `DOREPLIFETIME_WITH_PARAMS_FAST` with `bIsPushBased=true` |
| Replication Graph | Iris prioritization + `FilterConfigs` in `ObjectReplicationBridgeConfig` |
| `SetIsReplicated(true)` per channel | Iris handles registration automatically via `RegisterReplicationFragments` |
| `NetCullDistanceSquared` on actor | Still respected by the Spatial (Grid) filter |

Iris is backward-compatible with existing `UPROPERTY(Replicated)` declarations at the cost of not using push model. Legacy code compiles without changes; optimize incrementally by adding `bIsPushBased = true` per property.

---

## Anti-patterns

- **Never leave world-decoration actor classes on the default AlwaysRelevant filter** — replicate to all clients without spatial culling collapses performance beyond ~500 instances.
- **Never increase `InitialNetObjectListCount` or `PreAllocatedMemoryBuffersObjectCount` speculatively** — the memory and CPU overhead is permanent, even when the actual count decreases.
- **Never create subobjects with a mismatched `Outer`** — subobjects must have the owning actor or component as `Outer` or Iris cannot resolve the replication relationship.
- **Never use `ReplicateSubobjects` override with Iris** — the SubObjectReplicationList mechanism is required when `net.SubObjects.DefaultUseSubObjectReplicationList=1`.
- **Never skip `IsSupportedForNetworking()` on replicated UObject subclasses** — without it, Iris ignores the object for replication entirely.
- **Do not enable Iris without `SetupIrisSupport(Target)` in Build.cs** — missing module references cause linker errors or silent fallback to legacy replication.