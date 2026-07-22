version: 1.0.0

# Smart Objects

> **Scope**: Smart Objects plugin for UE5 — data-driven, slot-based AI interaction system including USmartObjectComponent registration and lifecycle, spatial slot querying, claim/occupy/release workflow, USmartObjectDefinition asset authoring, GameplayInteractions StateTree integration, and Behavior Tree / Mass Entity bindings.
> **Load when**: authoring smart objects or interaction points in the world, implementing AI character interactions with environment objects, configuring USmartObjectDefinition assets, writing C++ claim/occupy/release workflows, integrating smart objects with StateTree or Behavior Trees, setting up Mass Entity agents to use smart objects, debugging slot availability or claim failures.

---

## Core Concepts

Smart Objects decouple interaction logic from actor implementations. A **definition asset** (`USmartObjectDefinition`) describes one or more **slots** — spatial interaction points. At runtime, `USmartObjectComponent` registers the object with `USmartObjectSubsystem`, which maintains a spatial index. AI agents query the subsystem by bounding box and filter criteria, claim a specific slot (preventing other agents at the same priority from taking it), mark it as occupied during active use, then release it when done.

**Slot lifecycle:**
```
Free → Claimed → Occupied → Free
```
- **Free**: available for new claims
- **Claimed**: reserved but not actively used; can be pre-empted by a higher-priority claim
- **Occupied**: actively in use; cannot be pre-empted regardless of priority
- **Disabled**: slot or parent object explicitly disabled

## Module Dependencies (Build.cs)

```csharp
PublicDependencyModuleNames.AddRange(new string[]
{
    "SmartObjectsModule",   // Core plugin — always required
    "GameplayTags",         // FGameplayTag, FGameplayTagContainer
    "WorldConditions",      // Selection conditions on slot definitions
});

// For StateTree / GameplayInteractions integration:
PublicDependencyModuleNames.AddRange(new string[]
{
    "GameplayInteractionsModule",   // FGameplayInteractionContext, StateTree tasks
    "StateTreeModule",
});

// For Mass Entity integration:
PublicDependencyModuleNames.AddRange(new string[]
{
    "MassSmartObjects",
    "MassEntity",
});
```

Enable plugins in `.uproject`:
```json
{ "Name": "SmartObjects", "Enabled": true },
{ "Name": "GameplayInteractions", "Enabled": true }
```

## Key Classes

| Class / Struct | Role |
|---|---|
| `USmartObjectComponent` | Attached to world Actor; registers the object with the subsystem |
| `USmartObjectSubsystem` | World subsystem; owns all runtime instances, spatial index, claim state |
| `USmartObjectDefinition` | Blueprint/data asset; defines slots, tags, and behavior definitions |
| `FSmartObjectSlotDefinition` | Per-slot config: offset, rotation, tags, validation data |
| `USmartObjectBehaviorDefinition` | Abstract base for pluggable interaction frameworks |
| `FSmartObjectRequestFilter` | Filter criteria for spatial slot queries |
| `FSmartObjectRequest` | Combines query bounding box + filter |
| `FSmartObjectRequestResult` | A candidate slot result (`SmartObjectHandle` + `SlotHandle`) |
| `FSmartObjectClaimHandle` | Token held by the claimer; required for all post-claim operations |
| `FSmartObjectSlotHandle` | Identifies a specific slot within an object |
| `FSmartObjectHandle` | Identifies a registered smart object instance |

## Patterns & Examples

### Standard C++ Claim Workflow

```cpp
USmartObjectSubsystem* SOSys = GetWorld()->GetSubsystem<USmartObjectSubsystem>();

// 1. Build a spatial request
FSmartObjectRequestFilter Filter;
Filter.UserTags              = UserTagContainer;         // tags the slot UserTagFilter must pass
Filter.ActivityRequirements  = ActivityQuery;            // FGameplayTagQuery on slot ActivityTags
Filter.ClaimPriority         = ESmartObjectClaimPriority::Normal;
Filter.BehaviorDefinitionClasses.Add(UMyBehaviorDefinition::StaticClass()); // narrow to specific behavior
Filter.bShouldEvaluateConditions = true;                // evaluate WorldConditions on slots

FSmartObjectRequest Request;
Request.QueryBox = FBox::BuildAABB(AgentLocation, FVector(500.f));
Request.Filter   = Filter;

// 2. Find candidates
TArray<FSmartObjectRequestResult> Results;
if (!SOSys->FindSmartObjects(Request, Results, FConstStructView()))
{
    return; // nothing available
}

// 3. Claim the first viable slot
for (const FSmartObjectRequestResult& Result : Results)
{
    FSmartObjectClaimHandle ClaimHandle = SOSys->MarkSlotAsClaimed(
        Result.SlotHandle,
        ESmartObjectClaimPriority::Normal);

    if (!ClaimHandle.IsValid())
    {
        continue;
    }

    // 4. Register invalidation callback before any movement
    FOnSlotInvalidated InvalidationCb;
    InvalidationCb.BindUObject(this, &AMyAI::HandleSlotInvalidated);
    SOSys->RegisterSlotInvalidationCallback(ClaimHandle, InvalidationCb);

    // 5. Navigate to slot entrance, then mark occupied
    FTransform SlotTransform = SOSys->GetSlotTransform(ClaimHandle).GetValue();

    const UMyBehaviorDefinition* BehaviorDef =
        Cast<UMyBehaviorDefinition>(SOSys->MarkSlotAsOccupied(
            ClaimHandle, UMyBehaviorDefinition::StaticClass()));

    // 6. Execute behavior using BehaviorDef data ...

    // 7. Release when done
    SOSys->UnregisterSlotInvalidationCallback(ClaimHandle);
    SOSys->MarkSlotAsFree(ClaimHandle);
    break;
}
```

### Slot Entrance Location Validation

Validate the entrance location before committing agent movement to avoid navigation failures:

```cpp
FSmartObjectSlotEntranceLocationRequest EntranceReq;
EntranceReq.UserActor                  = MyActor;
EntranceReq.LocationType               = ESmartObjectSlotNavigationLocationType::Entry;
EntranceReq.bProjectNavigationLocation = true;
EntranceReq.bTraceGroundLocation       = true;
EntranceReq.bCheckTransitionTrajectory = true;

FSmartObjectSlotEntranceLocationResult EntranceResult;
if (SOSys->FindEntranceLocationForSlot(Result.SlotHandle, EntranceReq, EntranceResult))
{
    MoveToLocation(EntranceResult.Location, EntranceResult.Rotation);
}
else
{
    // Slot unreachable — skip and try the next candidate
}
```

### Slot Invalidation Callback

Always register immediately after claiming. The callback fires if the object is destroyed or disabled while the agent is navigating:

```cpp
void AMyAI::HandleSlotInvalidated(const FSmartObjectClaimHandle& Handle, ESmartObjectSlotState State)
{
    // Slot gone — abort interaction and pick a new target
    AbortCurrentInteraction();
}
```

### Enabling / Disabling Objects at Runtime

```cpp
// Preferred: tag-based reason — multiple systems can enable/disable independently
SOComponent->SetSmartObjectEnabledForReason(
    FGameplayTag::RequestGameplayTag(FName("Reason.Combat")), /*bEnabled=*/false);

// Re-enable from the same system
SOComponent->SetSmartObjectEnabledForReason(
    FGameplayTag::RequestGameplayTag(FName("Reason.Combat")), /*bEnabled=*/true);

// Unconditional (use only when a single owner controls availability)
SOComponent->SetSmartObjectEnabled(false);
```

### Dynamic Smart Objects (No Actor)

For transient objects without a world Actor:

```cpp
FSmartObjectHandle Handle = SOSys->CreateSmartObject(
    *MyDefinition, SlotTransform, FConstStructView());

// ... claim / use ...

SOSys->DestroySmartObject(Handle); // always destroy — no component auto-cleanup
```

## Configuration — USmartObjectDefinition Asset

Create via **Content Browser → Smart Object Definition**.

| Property | Purpose |
|---|---|
| `Slots[]` | Array of `FSmartObjectSlotDefinition`; each slot has offset, rotation, `ActivityTags`, `UserTagFilter` |
| `ObjectTags` | Tags on the object itself; queried by filter predicates |
| `BehaviorDefinitions[]` | One entry per behavior framework; instanced inline in the asset |
| `UserValidationFilterClass` | `USmartObjectSlotValidationFilter` subclass for entrance collision checks |

**Slot setup checklist:**
1. Set `Offset` and `Rotation` relative to the component transform.
2. Add `ActivityTags` — queried via `FSmartObjectRequestFilter.ActivityRequirements`.
3. Set `UserTagFilter` — a `FGameplayTagQuery` evaluated against the claiming agent's tags.
4. Add `DefinitionData` entries for any behavior-specific per-slot payload.
5. Assign a `USmartObjectSlotValidationFilter` if entrance collision validation is required.

## StateTree Integration — GameplayInteractions Module

The `GameplayInteractions` plugin provides a StateTree-based behavior framework. Add `UGameplayInteractionSmartObjectBehaviorDefinition` to the definition's `BehaviorDefinitions` array and assign a `UStateTree` asset.

**Key types:**

| Type | Role |
|---|---|
| `UGameplayInteractionSmartObjectBehaviorDefinition` | `BehaviorDefinition` subclass; stores a `UStateTree` driving the interaction |
| `FGameplayInteractionContext` | StateTree context struct (agent, claim handle, subsystem) — bound automatically |
| `FGameplayInteractionSlotUserData` | Written to the slot on interaction start; allows tasks to look up the active user |
| `FGameplayInteractionStateTreeTask` | Base class for all StateTree tasks related to smart object interactions |
| `FStateTreeTask_FindSlotEntranceLocation` | Built-in task; finds and validates the slot entrance location |

**Typical StateTree task sequence for an interaction:**
1. `FStateTreeTask_FindSlotEntranceLocation` — find and validate entrance point.
2. Move task — navigate agent to the entrance.
3. `MarkSlotAsOccupied` — mark occupied once at the slot.
4. Animation / logic task — play the interaction.
5. `MarkSlotAsFree` on transition to success or abort state.

```cpp
// Assign from C++ when constructing the definition:
UGameplayInteractionSmartObjectBehaviorDefinition* BehaviorDef =
    NewObject<UGameplayInteractionSmartObjectBehaviorDefinition>();
BehaviorDef->SetStateTree(MyInteractionStateTree);
Definition->BehaviorDefinitions.Add(BehaviorDef);
```

## Behavior Tree Integration

The `GameplayBehaviorSmartObjects` plugin provides `BTTask_FindAndUseGameplayBehaviorSmartObject`, which handles the full find → claim → move → use → release cycle automatically.

Configure in the editor:
- **ActivityRequirements** — `FGameplayTagQuery` to match slot `ActivityTags`
- **ClaimPriority** — `ESmartObjectClaimPriority` (Normal / High / Critical)
- **Radius** — search radius around the Pawn

For manual control from `AIController`:

```cpp
UAITask_UseGameplayBehaviorSmartObject* Task =
    UAITask_UseGameplayBehaviorSmartObject::MoveToAndUseSmartObjectWithGameplayBehavior(
        Controller, ClaimHandle, /*bLockAILogic=*/true, ESmartObjectClaimPriority::Normal);
Task->ReadyForActivation();
```

## Mass Entity Integration

Enable via the `MassSmartObjects` module. Add `FMassSmartObjectUserTrait` to the entity config.

```cpp
// Runtime fragment on each Mass entity tracking its smart object interaction state:
USTRUCT()
struct FMassSmartObjectUserFragment : public FMassFragment
{
    FGameplayTagContainer      UserTags;            // tags for slot UserTagFilter evaluation
    FSmartObjectClaimHandle    InteractionHandle;   // active claim (invalid when idle)
    EMassSmartObjectInteractionStatus InteractionStatus; // Unset / Requested / Claimed / Occupied / Done
    double                     InteractionCooldownEndTime;
};
```

The following Mass processors handle the lifecycle automatically:
- `UMassSmartObjectRequestProcessor` — bulk spatial search for all entities in one pass
- `UMassSmartObjectClaimProcessor` — bulk claim / release operations

## Events and Delegates

```cpp
// Component-level — fires on any state change for the whole object
SOComponent->OnSmartObjectEvent.AddDynamic(this, &AMyClass::OnSmartObjectEvent);
SOComponent->GetOnSmartObjectEventNative().AddRaw(this, &AMyClass::OnSmartObjectEventNative);

// Subsystem-level — scoped to a specific object or slot
FOnSmartObjectEvent* ObjDelegate  = SOSys->GetEventDelegate(Handle);
FOnSmartObjectEvent* SlotDelegate = SOSys->GetSlotEventDelegate(SlotHandle);

// Slot invalidation (most critical — register immediately after claiming)
FOnSlotInvalidated Cb;
Cb.BindUObject(this, &AMyClass::OnSlotInvalidated);
SOSys->RegisterSlotInvalidationCallback(ClaimHandle, Cb);
SOSys->UnregisterSlotInvalidationCallback(ClaimHandle); // always unregister in cleanup
```

**`ESmartObjectChangeReason` values:** `OnClaimed`, `OnOccupied`, `OnReleased`, `OnSlotEnabled`, `OnSlotDisabled`, `OnObjectEnabled`, `OnObjectDisabled`, `OnTagAdded`, `OnTagRemoved`.

## Debugging

| Tool | How to use |
|---|---|
| Gameplay Debugger | Press `'` in PIE → select **SmartObjects** category; shows all registered objects, slot states, and claim owners |
| `log LogSmartObject Verbose` | Console command; logs all registration, claim, occupy, and release events |
| Editor visualization | `USmartObjectRenderingComponent` (auto-added by subsystem) shows slot gizmos and state colors |

## Best Practices

- **Cache `USmartObjectSubsystem*`** in `BeginPlay` — avoid repeated `GetWorld()->GetSubsystem<>()` per tick or per ability.
- **Always register the invalidation callback** immediately after a successful claim. Actors can be streamed out or destroyed while an agent is navigating toward them.
- **Check `IsClaimedSmartObjectValid` before using a `ClaimHandle`** — the handle survives in your variable even after the underlying slot is invalidated.
- **Use `SetSmartObjectEnabledForReason` with a `FGameplayTag`** rather than unconditional `SetSmartObjectEnabled`; multiple independent systems can then enable/disable the same object without conflicts.
- **Validate entrance locations** (`FindEntranceLocationForSlot`) before committing agent movement, especially with `bCheckTransitionTrajectory = true`, to prevent agents clipping through geometry.
- **Prefer `ESmartObjectClaimPriority::High` only for critical actions** (flee, take cover) — it pre-empts Normal-priority claims that are still in the Claimed (not Occupied) state.
- **For GameplayInteractions (StateTree) behavior**: always assign a non-null `UStateTree` to `UGameplayInteractionSmartObjectBehaviorDefinition` — a null asset silently skips execution without an error.

## Anti-patterns

- **Forgetting `MarkSlotAsFree`** — slots stay Claimed/Occupied forever, starving all other agents in the area.
- **Storing `FSmartObjectSlotHandle` long-term** — slot handles become stale when the owner actor is streamed out; always work through a valid `FSmartObjectClaimHandle` and check `IsClaimedSmartObjectValid`.
- **Marking Occupied before reaching the slot** — sets the non-pre-emptable Occupied state while the agent is still navigating; use Claimed during movement, Occupied only once the agent is at the destination.
- **Querying with `bShouldEvaluateConditions = false`** — world conditions on slots (e.g., time-of-day gates) are bypassed, producing invalid interactions.
- **Dynamic actors without `RemoveSmartObject`** — when a frequently spawning/despawning actor with `USmartObjectComponent` is destroyed without explicit unregistration, the runtime instance leaks in the subsystem and pollutes the spatial index.
- **`CreateSmartObject` without `DestroySmartObject`** — handle-based objects have no component auto-cleanup; always destroy explicitly.
