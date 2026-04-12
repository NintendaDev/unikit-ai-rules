---
version: 1.0.0
---

# Smart Objects

> **Scope**: Smart Object system — definitions, slots, behaviors, claiming/releasing workflow, spatial queries, filtering, tags, conditions, StateTree integration, Mass integration, C++ API patterns
> **Load when**: Smart Object, SmartObject, USmartObjectSubsystem, USmartObjectComponent, USmartObjectDefinition, slot, claim, behavior definition, GameplayBehavior, interaction point, AI interaction

---

## Core Concepts

Smart Objects are a reservation-based interaction system for actors in the world. They define points where AI (or players) can perform activities — sit on a bench, use a terminal, pick up an item. The system provides spatial searching, slot reservation, and behavior execution.

**Key classes:**

| Class | Purpose |
|-------|---------|
| `USmartObjectSubsystem` | World subsystem — spatial queries, reservation API |
| `USmartObjectComponent` | Component on actors enabling Smart Object functionality |
| `USmartObjectDefinition` | Data asset defining slots, behaviors, tags, conditions |
| `USmartObjectBehaviorDefinition` | Abstract base — binds behavior framework to slots |
| `USmartObjectUserComponent` | Component on users — defines common user settings |
| `FSmartObjectClaimHandle` | Handle to a claimed slot — pass around to use/release |
| `FSmartObjectRequestFilter` | Filter for spatial queries (tags, conditions) |
| `FSmartObjectRequestResult` | Result from FindSmartObjects — contains candidate slots |
| `USmartObjectSlotValidationFilter` | Navigation and collision validation settings |

## Module Setup

```csharp
// MyProject.Build.cs
PublicDependencyModuleNames.AddRange(new string[] {
    "SmartObjectsModule",
    "GameplayBehaviorsModule",   // For GameplayBehavior integration
    "GameplayTags"               // For tag-based filtering
});
```

Enable the **SmartObjects** plugin in your `.uproject` file.

## Architecture

### Definition Asset

`USmartObjectDefinition` is a data asset that defines:
- **Slots** — interaction positions with individual state, behavior, and conditions
- **Activity Tags** — `FGameplayTagContainer` distinguishing what the object offers
- **User Tag Filter** — `FGameplayTagQuery` filtering which users can interact
- **Object Tags** — tags on the object itself for query filtering
- **Selection Preconditions** — `FWorldConditionBase` functors for dynamic filtering

### Slots

Each slot represents one interaction point. A slot has:
- **Position/Rotation** — relative to the owning actor
- **Behavior Definitions** — what happens when the slot is used
- **Slot Tags** — per-slot gameplay tags
- **Conditions** — per-slot world conditions
- **Custom Data** — `FSmartObjectSlotDefinitionData` for extending slot metadata

### Slot States

| State | Color | Meaning |
|-------|-------|---------|
| `Free` | Green | Available for claiming |
| `Claimed` | Yellow | Reserved but user hasn't arrived yet |
| `Occupied` | Red | Actively being used |
| `Disabled` | — | Slot disabled, not available |

State transitions:

```
Free → Claimed (via ClaimSmartObject)
Claimed → Occupied (via UseSmartObject)
Occupied → Free (via ReleaseSmartObject or behavior completion)
Claimed → Free (via ReleaseSmartObject if user cancels)
```

## Claiming / Using / Releasing Workflow

### Standard C++ Workflow

```cpp
// 1. Get the subsystem
USmartObjectSubsystem* SOSubsystem = USmartObjectSubsystem::GetCurrent(GetWorld());
if (!SOSubsystem) return;

// 2. Build a request filter
FSmartObjectRequestFilter Filter;
Filter.ActivityRequirements.AddTag(TAG_Activity_Sit);
// Filter.UserTags, Filter.BehaviorDefinitionClasses, etc.

// 3. Find candidates (spatial query)
FSmartObjectRequest Request;
Request.Filter = Filter;
Request.QueryBox = FBox(ActorLocation - SearchExtent, ActorLocation + SearchExtent);
TArray<FSmartObjectRequestResult> Results;
SOSubsystem->FindSmartObjects(Request, Results);

// 4. Claim the best result
if (Results.Num() > 0)
{
    FSmartObjectClaimHandle ClaimHandle = SOSubsystem->ClaimSmartObject(Results[0].SlotHandle);

    if (ClaimHandle.IsValid())
    {
        // 5. Use the claimed slot (triggers behavior)
        SOSubsystem->UseSmartObject(ClaimHandle);

        // 6. Release when done (or on interruption)
        SOSubsystem->ReleaseSmartObject(ClaimHandle);
    }
}
```

### Via AITask (Gameplay Behavior)

```cpp
// Claim first, then use via AITask
UAITask_UseGameplayBehaviorSmartObject::UseClaimedGameplayBehaviorSmartObject(
    AIController, ClaimHandle, /*bLockAILogic=*/ true)
    ->ReadyForActivation();  // CRITICAL: must call ReadyForActivation()
```

UE 5.2+ also provides:
```cpp
UAITask_UseGameplayBehaviorSmartObject::MoveAndUseClaimedGameplaySmartObject(
    AIController, ClaimHandle, /*bLockAILogic=*/ true);
```

### Validation

```cpp
if (USmartObjectBlueprintFunctionLibrary::IsValidSmartObjectClaimHandle(ClaimHandle))
{
    // Handle is valid, slot is still claimed
}
```

## Behavior Definitions

`USmartObjectBehaviorDefinition` is an abstract base class. Subclass it to bind specific behavior frameworks to Smart Object slots.

### Built-in Behavior Types

| Class | Framework | Use Case |
|-------|-----------|----------|
| `UGameplayBehaviorSmartObjectBehaviorDefinition` | GameplayBehavior | General AI behaviors |
| `UGameplayInteractionSmartObjectBehaviorDefinition` | GameplayInteraction | Interactive elements |
| Custom subclass | Any | Project-specific logic |

### Custom Behavior Definition

```cpp
UCLASS()
class UMyCustomBehaviorDefinition : public USmartObjectBehaviorDefinition
{
    GENERATED_BODY()

public:
    UPROPERTY(EditDefaultsOnly, Category = SmartObject)
    UAnimMontage* InteractionMontage;

    UPROPERTY(EditDefaultsOnly, Category = SmartObject)
    float InteractionDuration = 2.0f;
};
```

### Multiple Behaviors Per Slot

Only the **first** behavior definition of a specific type per slot is used. For multiple activities from one object:

**Option A — Multiple Slots:** Position overlapping slots with different activity tags and behaviors.

**Option B — Tag-to-Behavior Mapping (Recommended):**

```cpp
UCLASS()
class UTagBehaviorSmartObjectBehaviorDefinition : public USmartObjectBehaviorDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditDefaultsOnly, Category = SmartObject, Instanced)
    TMap<FGameplayTag, UGameplayBehaviorConfig*> GameplayBehaviorConfigs;
};
```

Query by activity tag, then use a custom AITask that selects the correct behavior from the map.

## Spatial Searching

Smart Objects use a spatial partition for efficient queries:

| Partition | Class | Notes |
|-----------|-------|-------|
| Hash Grid | `USmartObjectHashGrid` | Default — good for most cases |
| Octree | `USmartObjectOctree` | Alternative — configurable in project settings |

Searches use actor bounds to determine closest Smart Object and slot to the querier.

## Filtering & Conditions

### Tag Filtering

| Tag Type | Defined On | Purpose |
|----------|-----------|---------|
| **Activity Tags** | Definition | What the object offers (`Activity.Sit`, `Activity.Repair`) |
| **User Tags** | Request Filter | Tags the user must have to qualify |
| **Object Tags** | Definition | Tags on the object for search refinement |
| **Slot Tags** | Slot Definition | Per-slot distinguishing tags |

**Tag Policies:**

| Policy | Enum | Controls |
|--------|------|----------|
| Tag Filtering | `ESmartObjectTagFilteringPolicy` | How slot/object TagQueries process request tags |
| Tag Merging | `ESmartObjectTagMergingPolicy` | How slot and object tags combine for evaluation |

### World Conditions (Selection Preconditions)

Custom functors inheriting `FWorldConditionBase` for dynamic runtime filtering:

```cpp
// Schema for Smart Object conditions
USmartObjectWorldConditionSchema
```

Conditions are evaluated after spatial search, before results are returned.

### Slot Validation

`USmartObjectSlotValidationFilter` handles navigation and collision checks:
- Navigation reachability
- Collision clearance
- Custom validation parameters

## StateTree Integration

Smart Objects integrate with StateTree for AI workflows:

- StateTree tasks can find, claim, and use Smart Objects
- Smart Object slots can trigger StateTree behaviors
- Data binding passes context between StateTree states and Smart Object interactions
- Designed as a more flexible alternative to Behavior Trees for Smart Object workflows

## Mass (ECS) Integration

Smart Objects integrate with the Mass Entity Framework for crowd simulations:

- **MassSmartObjects** plugin — bridges Mass entities and Smart Objects
- `UMassSmartObjectSettings` — configuration for annotation settings, ZoneGraph integration
- Mass fragments store Smart Object data (not replicated)
- ZoneGraph annotation links Smart Objects to navigation lanes

Configuration:
```cpp
// MassSmartObjectSettings (Config=Plugins)
UPROPERTY(EditDefaultsOnly, Category = ZoneGraph, Config)
float SearchExtents;  // Extents for finding precomputed entry points

UPROPERTY(EditDefaultsOnly, Category = ZoneGraph, Config)
FZoneGraphTag SmartObjectTag;  // Tag linking SO to ZoneGraph lanes
```

## EQS Integration

`UEnvQueryGenerator_SmartObjects` — EQS generator for spatial Smart Object queries:
- Fetches slots within `QueryBoxExtent` from `QueryOriginContext` locations
- Filters by `SmartObjectRequestFilter`
- Results available as `UEnvQueryItemType_SmartObject`

## Slot Claim Priority

`ESmartObjectClaimPriority` controls claim precedence when multiple agents compete for slots. Higher priority claims can preempt lower ones.

## Key Enums

| Enum | Purpose |
|------|---------|
| `ESmartObjectSlotState` | Slot runtime state (Free, Claimed, Occupied, Disabled) |
| `ESmartObjectClaimPriority` | Claim precedence level |
| `ESmartObjectChangeReason` | How object/slot was changed |
| `ESmartObjectSlotShape` | Slot spatial shape |
| `ESmartObjectTagFilteringPolicy` | How tag queries are processed |
| `ESmartObjectTagMergingPolicy` | How slot/object tags merge |
| `ESmartObjectSlotNavigationLocationType` | Enter vs exit location lookup |
| `ESmartObjectEntrancePriority` | Entrance selection priority |

## Best Practices

- **Always call `ReadyForActivation()`** on AITasks — omitting this is the most common cause of Smart Object tasks silently failing
- **Release claimed slots** when the agent dies, gets interrupted, or switches to higher-priority tasks — unclaimed slots block other agents
- **Use Activity Tags** to distinguish interaction types — query by tag rather than definition class for flexibility
- **Prefer Hash Grid** (default) for spatial partitioning — switch to Octree only if profiling shows benefit
- **Use World Conditions** for dynamic filtering instead of hardcoded checks — keeps logic data-driven and designer-friendly
- **Use the tag-to-behavior mapping pattern** for multiple activities per object rather than duplicating slots
- **Test in full levels** — Smart Object spatial queries are bounds-based; small test maps may not reveal real-world query performance
- **Consider replication** — Smart Object Mass fragments are not replicated; for multiplayer, handle synchronization explicitly
- **Set appropriate claim priority** — in competitive AI scenarios, configure `ESmartObjectClaimPriority` to avoid starvation

## Anti-patterns

- **Missing `ReadyForActivation()`** — AITasks created but never activated; slot remains claimed with no behavior executing
- **Not releasing slots** — agent dies or switches tasks without releasing claim; slot permanently blocked
- **Multiple behavior definitions of same type per slot** — only the first one is used; use tag-mapping pattern instead
- **Hardcoded slot indices** — slot ordering can change; query by tags and conditions, not by index
- **Ignoring claim validity** — using a `FSmartObjectClaimHandle` without checking `IsValid()` leads to undefined behavior
- **Direct data access instead of subsystem API** — always go through `USmartObjectSubsystem` for find/claim/use/release operations
- **Over-relying on Smart Objects for simple interactions** — for trivial one-shot actions, a direct function call is simpler than the full SO pipeline
- **Not configuring tag merging policy** — default may not match your intent for how slot and object tags combine during filtering
