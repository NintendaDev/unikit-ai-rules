---
version: 1.0.0
---

# Behavior Trees

> **Scope**: Behavior Tree AI system — composites, tasks, decorators, services, blackboard, C++ node authoring, execution flow, observer aborts, AI Controller integration
> **Load when**: Behavior Tree, BehaviorTree, BT_, UBTTaskNode, UBTDecorator, UBTService, Blackboard, AIController, RunBehaviorTree, EBTNodeResult, ExecuteTask, TickNode, AI behavior, NPC logic

---

## Core Concepts

Behavior Trees (BT) are the primary decision-making framework for NPC AI in UE5. A BT evaluates nodes top-to-bottom, left-to-right each tick, selecting branches based on conditions and executing leaf actions.

### Node Types

| Type | Base Class | Purpose |
|------|-----------|---------|
| **Composite** | `UBTCompositeNode` | Control flow — manages child execution order |
| **Task** | `UBTTaskNode` | Leaf nodes — perform actual actions |
| **Decorator** | `UBTDecorator` | Conditional gates — allow/block branch execution |
| **Service** | `UBTService` | Periodic updates — run on a timer while branch is active |

### Composite Types

- **Selector** — executes children left-to-right, stops on first **success** (OR logic). Returns Failure only if all children fail.
- **Sequence** — executes children left-to-right, stops on first **failure** (AND logic). Returns Success only if all children succeed.
- **Simple Parallel** — runs a main task and a background subtree simultaneously.

### Execution Flow

```
Root
└── Selector (priority-based)
    ├── [Decorator: IsAlerted?] Sequence (Combat)
    │   ├── [Service: UpdateTarget] Task: MoveTo
    │   └── Task: Attack
    ├── [Decorator: HasPatrolPath?] Sequence (Patrol)
    │   ├── Task: FindPatrolPoint
    │   └── Task: MoveTo
    └── Task: Idle (fallback)
```

The tree re-evaluates from root each time a branch completes or an observer abort fires. Higher-priority branches (leftmost) preempt lower ones.

## C++ Class Hierarchy

```
UBTNode
├── UBTCompositeNode
│   ├── UBTComposite_Selector
│   ├── UBTComposite_Sequence
│   └── UBTComposite_SimpleParallel
├── UBTTaskNode
│   ├── UBTTask_BlackboardBase
│   │   ├── UBTTask_MoveTo
│   │   ├── UBTTask_RotateToFaceBBEntry
│   │   └── UBTTask_RunEQSQuery
│   ├── UBTTask_BlueprintBase
│   ├── UBTTask_Wait
│   ├── UBTTask_PlayAnimation
│   ├── UBTTask_PlaySound
│   ├── UBTTask_MakeNoise
│   ├── UBTTask_RunBehavior
│   ├── UBTTask_RunBehaviorDynamic
│   ├── UBTTask_RunStateTree
│   └── UBTTask_FinishWithResult
├── UBTDecorator
│   ├── UBTDecorator_BlackboardBase
│   ├── UBTDecorator_Blackboard
│   ├── UBTDecorator_ConeCheck
│   ├── UBTDecorator_Cooldown
│   ├── UBTDecorator_TimeLimit
│   ├── UBTDecorator_Loop
│   └── UBTDecorator_BlueprintBase
└── UBTAuxiliaryNode
    └── UBTService
        ├── UBTService_BlackboardBase
        ├── UBTService_DefaultFocus
        └── UBTService_BlueprintBase
```

Required module dependency in `.Build.cs`:
```cpp
PublicDependencyModuleNames.Add("AIModule");
PublicDependencyModuleNames.Add("GameplayTasks");
```

Include paths:
```cpp
#include "BehaviorTree/BTTaskNode.h"
#include "BehaviorTree/BTDecorator.h"
#include "BehaviorTree/BTService.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "BehaviorTree/BehaviorTreeComponent.h"
#include "AIController.h"
```

## Tasks — Key API

Tasks are leaf nodes that perform actions. Override `ExecuteTask` as the entry point.

### Key Virtual Methods

```cpp
// Called when the task starts. Return Succeeded, Failed, or InProgress.
virtual EBTNodeResult::Type ExecuteTask(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;

// Called each frame while task is InProgress. Set bNotifyTick = true in constructor.
virtual void TickTask(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory,
    float DeltaSeconds) override;

// Called when the task is aborted. Return Aborted or InProgress.
virtual EBTNodeResult::Type AbortTask(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;

// Called when task finishes (success, failure, or abort).
virtual void OnTaskFinished(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory,
    EBTNodeResult::Type TaskResult) override;
```

### EBTNodeResult Values

| Value | Meaning |
|-------|---------|
| `EBTNodeResult::Succeeded` | Task completed successfully |
| `EBTNodeResult::Failed` | Task failed |
| `EBTNodeResult::InProgress` | Task is still running (call `FinishLatentTask()` when done) |
| `EBTNodeResult::Aborted` | Task was interrupted |

### Custom Task Example

```cpp
// BTTask_FindPatrolPoint.h
UCLASS()
class MYPROJECT_API UBTTask_FindPatrolPoint : public UBTTask_BlackboardBase
{
    GENERATED_BODY()

public:
    UBTTask_FindPatrolPoint();

    virtual EBTNodeResult::Type ExecuteTask(
        UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;
    virtual FString GetStaticDescription() const override;

protected:
    UPROPERTY(EditAnywhere, Category = "Patrol")
    float PatrolRadius = 1000.f;
};
```

```cpp
// BTTask_FindPatrolPoint.cpp
UBTTask_FindPatrolPoint::UBTTask_FindPatrolPoint()
{
    NodeName = "Find Patrol Point";
    // BlackboardKey is inherited from UBTTask_BlackboardBase
}

EBTNodeResult::Type UBTTask_FindPatrolPoint::ExecuteTask(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
    AAIController* AIController = OwnerComp.GetAIOwner();
    if (!AIController || !AIController->GetPawn())
    {
        return EBTNodeResult::Failed;
    }

    const FVector Origin = AIController->GetPawn()->GetActorLocation();
    FNavLocation NavLocation;

    UNavigationSystemV1* NavSys = FNavigationSystem::GetCurrent<UNavigationSystemV1>(GetWorld());
    if (NavSys && NavSys->GetRandomReachablePointInRadius(Origin, PatrolRadius, NavLocation))
    {
        UBlackboardComponent* BB = OwnerComp.GetBlackboardComponent();
        BB->SetValueAsVector(GetSelectedBlackboardKey(), NavLocation.Location);
        return EBTNodeResult::Succeeded;
    }

    return EBTNodeResult::Failed;
}
```

### Latent Task Pattern (InProgress)

Use `FinishLatentTask()` for tasks that span multiple frames:

```cpp
EBTNodeResult::Type UBTTask_WaitForSignal::ExecuteTask(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
    // Store OwnerComp reference for later callback
    CachedOwnerComp = &OwnerComp;
    // Subscribe to event...
    return EBTNodeResult::InProgress;
}

void UBTTask_WaitForSignal::OnSignalReceived()
{
    if (CachedOwnerComp)
    {
        FinishLatentTask(*CachedOwnerComp, EBTNodeResult::Succeeded);
    }
}
```

For aborting latent tasks, use `FinishLatentAbort()`:

```cpp
EBTNodeResult::Type UBTTask_WaitForSignal::AbortTask(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
    // Unsubscribe from event...
    return EBTNodeResult::Aborted;
}
```

## Decorators — Key API

Decorators gate branch execution based on conditions.

### Key Virtual Methods

```cpp
// Return true to allow execution, false to block.
virtual bool CalculateRawConditionValue(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) const override;

// Called when this decorator's branch becomes active.
virtual void OnBecomeRelevant(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;

// Called when this decorator's branch becomes inactive.
virtual void OnCeaseRelevant(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;

// Tick (set bNotifyTick = true in constructor).
virtual void TickNode(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory,
    float DeltaSeconds) override;
```

### Observer Abort Types

Decorators can trigger abort when their condition changes:

| Mode | Behavior |
|------|----------|
| `None` | No abort — condition checked only on entry |
| `Self` | Aborts own branch if condition becomes false |
| `LowerPriority` | Aborts lower-priority branches if condition becomes true |
| `Both` | Combines Self and LowerPriority |

Use observer aborts to make the tree reactive without polling. Prefer `LowerPriority` on high-priority decorators (e.g., "IsAlerted" on Combat branch) to interrupt Patrol/Idle when threat appears.

### Custom Decorator Example

```cpp
UCLASS()
class MYPROJECT_API UBTDecorator_CheckDistance : public UBTDecorator
{
    GENERATED_BODY()

public:
    UBTDecorator_CheckDistance();

protected:
    virtual bool CalculateRawConditionValue(
        UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) const override;

    UPROPERTY(EditAnywhere, Category = "Condition")
    FBlackboardKeySelector TargetKey;

    UPROPERTY(EditAnywhere, Category = "Condition")
    float MaxDistance = 500.f;
};
```

```cpp
UBTDecorator_CheckDistance::UBTDecorator_CheckDistance()
{
    NodeName = "Check Distance";
    // Enable blackboard observer for reactive abort
    bNotifyBecomeRelevant = true;
}

bool UBTDecorator_CheckDistance::CalculateRawConditionValue(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) const
{
    const AAIController* AIController = OwnerComp.GetAIOwner();
    if (!AIController || !AIController->GetPawn())
    {
        return false;
    }

    const UBlackboardComponent* BB = OwnerComp.GetBlackboardComponent();
    const AActor* Target = Cast<AActor>(BB->GetValueAsObject(TargetKey.SelectedKeyName));
    if (!Target)
    {
        return false;
    }

    const float Distance = FVector::Dist(
        AIController->GetPawn()->GetActorLocation(),
        Target->GetActorLocation());
    return Distance <= MaxDistance;
}
```

## Services — Key API

Services run periodically while their parent composite/task branch is active. Use for perception updates and blackboard maintenance.

### Key Virtual Methods

```cpp
// Called at the configured interval. Primary update function.
virtual void TickNode(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory,
    float DeltaSeconds) override;

// Called when the branch becomes active.
virtual void OnBecomeRelevant(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;

// Called when the branch deactivates.
virtual void OnCeaseRelevant(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;
```

### Custom Service Example

```cpp
UCLASS()
class MYPROJECT_API UBTService_UpdateTargetLocation : public UBTService
{
    GENERATED_BODY()

public:
    UBTService_UpdateTargetLocation();

protected:
    virtual void TickNode(
        UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory,
        float DeltaSeconds) override;

    UPROPERTY(EditAnywhere, Category = "Blackboard")
    FBlackboardKeySelector TargetActorKey;

    UPROPERTY(EditAnywhere, Category = "Blackboard")
    FBlackboardKeySelector TargetLocationKey;
};
```

```cpp
UBTService_UpdateTargetLocation::UBTService_UpdateTargetLocation()
{
    NodeName = "Update Target Location";
    Interval = 0.5f;       // Tick every 0.5 seconds
    RandomDeviation = 0.1f; // Add slight randomness to spread cost
}

void UBTService_UpdateTargetLocation::TickNode(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory,
    float DeltaSeconds)
{
    Super::TickNode(OwnerComp, NodeMemory, DeltaSeconds);

    UBlackboardComponent* BB = OwnerComp.GetBlackboardComponent();
    if (!BB) return;

    AActor* Target = Cast<AActor>(
        BB->GetValueAsObject(TargetActorKey.SelectedKeyName));
    if (Target)
    {
        BB->SetValueAsVector(
            TargetLocationKey.SelectedKeyName, Target->GetActorLocation());
    }
}
```

## Blackboard Integration

### Blackboard Key Types

| Key Type | C++ Type | Getter/Setter |
|----------|----------|---------------|
| `Bool` | `bool` | `GetValueAsBool` / `SetValueAsBool` |
| `Int` | `int32` | `GetValueAsInt` / `SetValueAsInt` |
| `Float` | `float` | `GetValueAsFloat` / `SetValueAsFloat` |
| `String` | `FString` | `GetValueAsString` / `SetValueAsString` |
| `Name` | `FName` | `GetValueAsName` / `SetValueAsName` |
| `Vector` | `FVector` | `GetValueAsVector` / `SetValueAsVector` |
| `Rotator` | `FRotator` | `GetValueAsRotator` / `SetValueAsRotator` |
| `Object` | `UObject*` | `GetValueAsObject` / `SetValueAsObject` |
| `Class` | `UClass*` | `GetValueAsClass` / `SetValueAsClass` |
| `Enum` | `uint8` | `GetValueAsEnum` / `SetValueAsEnum` |

### FBlackboardKeySelector

Use `FBlackboardKeySelector` in UPROPERTY to let designers pick blackboard keys in the editor:

```cpp
UPROPERTY(EditAnywhere, Category = "Blackboard")
FBlackboardKeySelector TargetKey;
```

Access the selected key name via `TargetKey.SelectedKeyName`. Call `ResolveSelectedKey()` during initialization if building trees programmatically — failure to do so causes silent key lookup failures.

### Accessing Blackboard in Nodes

```cpp
UBlackboardComponent* BB = OwnerComp.GetBlackboardComponent();

// Write
BB->SetValueAsObject(TEXT("TargetActor"), FoundActor);
BB->SetValueAsVector(TEXT("MoveLocation"), Location);
BB->SetValueAsBool(TEXT("IsAlerted"), true);

// Read
AActor* Target = Cast<AActor>(BB->GetValueAsObject(TEXT("TargetActor")));
FVector Location = BB->GetValueAsVector(TEXT("MoveLocation"));

// Clear
BB->ClearValue(TEXT("TargetActor"));
```

### Recommended Blackboard Layout

| Key | Type | Purpose |
|-----|------|---------|
| `TargetActor` | Object (AActor) | Current threat/target reference |
| `TargetLocation` | Vector | Last known target position |
| `HomeLocation` | Vector | Spawn/anchor point |
| `PatrolIndex` | Int | Current patrol waypoint index |
| `BehaviorState` | Enum | High-level state (Idle, Patrol, Combat, Flee) |
| `IsAlerted` | Bool | Whether AI has detected a threat |

## AI Controller Setup

### Starting a Behavior Tree

Always start the BT from `OnPossess`, not `BeginPlay`:

```cpp
// MyAIController.h
UCLASS()
class MYPROJECT_API AMyAIController : public AAIController
{
    GENERATED_BODY()

protected:
    virtual void OnPossess(APawn* InPawn) override;

    UPROPERTY(EditDefaultsOnly, Category = "AI")
    TObjectPtr<UBehaviorTree> BehaviorTreeAsset;
};
```

```cpp
// MyAIController.cpp
void AMyAIController::OnPossess(APawn* InPawn)
{
    Super::OnPossess(InPawn);

    if (BehaviorTreeAsset)
    {
        RunBehaviorTree(BehaviorTreeAsset);

        // Initialize blackboard defaults after tree starts
        if (UBlackboardComponent* BB = GetBlackboardComponent())
        {
            BB->SetValueAsVector(TEXT("HomeLocation"), InPawn->GetActorLocation());
        }
    }
}
```

### Character Configuration

Set the AI Controller class on the character:

```cpp
AMyAICharacter::AMyAICharacter()
{
    AIControllerClass = AMyAIController::StaticClass();
    AutoPossessAI = EAutoPossessAI::PlacedInWorldOrSpawned;
}
```

## Best Practices

- **Use observer aborts** instead of polling conditions in services. Attach a Blackboard decorator with `LowerPriority` abort to preempt branches when state changes.
- **Keep tasks atomic** — one action per task. Compose complex behaviors through Sequences, not monolithic tasks.
- **Use services for perception**, not tasks. Services run on a timer independently of task execution.
- **Extract shared logic into ActorComponents** — avoid duplicating code across multiple task/service/decorator classes. Access via `OwnerComp.GetAIOwner()->GetPawn()->FindComponentByClass<T>()`.
- **Prefer `UBTTask_BlackboardBase`** over raw `UBTTaskNode` when the task reads/writes a blackboard key — it provides `GetSelectedBlackboardKey()` and editor integration.
- **Set `bNotifyTick = true`** in the constructor if the task needs `TickTask()`. Use `INIT_TASK_NODE_NOTIFY_FLAGS` macro for automatic flag setup.
- **Override `GetStaticDescription()`** on custom nodes to show meaningful info in the BT editor graph.
- **Use `RandomDeviation`** on services to stagger tick intervals across NPCs and reduce frame spikes.
- **Always validate** AIController, Pawn, and BlackboardComponent before use — spawned/destroyed actors can leave null references.
- **NavMeshBoundsVolume is required** in the level for `MoveTo` tasks to function. Press P in viewport to verify coverage.

## Anti-patterns

- **Starting BT from BeginPlay** — the AI Controller may not have possessed the pawn yet. Always use `OnPossess`.
- **Forgetting `FinishLatentTask()`** — returning `InProgress` without ever calling `FinishLatentTask()` causes the tree to hang indefinitely on that node.
- **Forgetting `FinishLatentAbort()`** — returning `InProgress` from `AbortTask` without calling `FinishLatentAbort()` blocks the tree from switching branches.
- **Tight coupling to character class** — casting directly to a specific character in every node. Use components or interfaces instead.
- **Polling in decorators without observer aborts** — re-checking conditions manually when the Blackboard observer system handles this automatically.
- **Modifying node state in non-instanced nodes** — `ExecuteTask`, `CalculateRawConditionValue`, and `TickNode` should be treated as `const` if the node is not instanced. Use `NodeMemory` for per-instance runtime data.
- **Duplicate logic across nodes** — same check in a decorator and a service. Centralize in a component or let the decorator observe the blackboard key that the service updates.
- **Flashing/looping nodes** — a task that instantly succeeds or fails causes the tree to reset and re-run the same path every frame. Add a `Wait` task or fix the condition that causes the instant return.
- **Forgetting `ResolveSelectedKey()`** — when building BTs programmatically, `FBlackboardKeySelector` must have `ResolveSelectedKey()` called after setting the key name, or lookups silently fail.
