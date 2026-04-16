version: 1.0.0

# Behavior Tree

> **Scope**: Unreal Engine's event-driven Behavior Tree system — authoring Tasks, Decorators, and Services in C++, wiring AIController and Blackboard, managing NodeMemory, configuring Observer Aborts, and structuring AI decision trees.
> **Load when**: authoring AI behavior with Behavior Trees, creating custom BT Tasks or Decorators or Services in C++, setting up AIController with a Behavior Tree, accessing or writing Blackboard values, debugging tree execution or abort flow, designing patrol or combat AI.
> **References**: `.unikit/memory/stack/references/behavior-tree-nodes.md` (built-in node catalog)

---

## Core Concepts

The UE5 Behavior Tree is **event-driven** ("lazy evaluation"), not polling-based. The tree does not tick every frame by default — it re-evaluates only when an Observer Abort fires or an active task finishes. This is the key difference from classic BT implementations.

Three assets collaborate at runtime:

| Asset | Class | Role |
|-------|-------|------|
| Blackboard | `UBlackboardData` | Shared AI knowledge — key/value store |
| Behavior Tree | `UBehaviorTree` | Decision logic tree |
| AI Controller | `AAIController` | Owns `UBehaviorTreeComponent` + `UBlackboardComponent`, starts the tree |

**Node categories:**

| Category | Base class | Role |
|----------|-----------|------|
| Composite | `UBTCompositeNode` | Branch control: Sequence, Selector, SimpleParallel |
| Decorator | `UBTDecorator` | Condition gate on a branch; can trigger Observer Aborts |
| Service | `UBTService` | Periodic background worker attached to a composite or task |
| Task | `UBTTaskNode` | Leaf node that performs an action and returns a result |

---

## AIController Setup

```cpp
// MyAIController.h
UPROPERTY()
TObjectPtr<UBehaviorTreeComponent> BehaviorTreeComp;
UPROPERTY()
TObjectPtr<UBlackboardComponent> BlackboardComp;

UPROPERTY(EditDefaultsOnly, Category = "AI")
TObjectPtr<UBehaviorTree> BehaviorTreeAsset;

// MyAIController.cpp
AMyAIController::AMyAIController()
{
    BehaviorTreeComp = CreateDefaultSubobject<UBehaviorTreeComponent>(TEXT("BehaviorTreeComp"));
    BlackboardComp   = CreateDefaultSubobject<UBlackboardComponent>(TEXT("BlackboardComp"));
}

void AMyAIController::OnPossess(APawn* InPawn)
{
    Super::OnPossess(InPawn);
    if (BehaviorTreeAsset)
    {
        UseBlackboard(BehaviorTreeAsset->BlackboardAsset, BlackboardComp);
        RunBehaviorTree(BehaviorTreeAsset);
    }
}
```

**Rules:**
- Always call `UseBlackboard()` before `RunBehaviorTree()` — it initializes the BB component.
- Reference `UBehaviorTree` via `UPROPERTY(EditDefaultsOnly)` on the controller, not hardcoded.
- Assign `AIControllerClass = AMyAIController::StaticClass()` in the Character/Pawn constructor — do not rely on the default controller.

---

## Blackboard

### Accessing values at runtime

```cpp
UBlackboardComponent* BB = OwnerComp.GetBlackboardComponent();

// Read
AActor* Target = Cast<AActor>(BB->GetValueAsObject(FName("TargetActor")));
FVector Loc    = BB->GetValueAsVector(FName("HomeLocation"));
bool bFlag     = BB->GetValueAsBool(FName("bCanAttack"));

// Write
BB->SetValueAsObject(FName("TargetActor"), SomeActor);
BB->SetValueAsVector(FName("PatrolPoint"), SomeLocation);
BB->ClearValue(FName("TargetActor"));  // resets to "not set"
```

### FBlackboardKeySelector — editor-exposed key picker

Use `FBlackboardKeySelector` to let designers choose a BB key in the Details panel instead of typing names.

```cpp
// Header
UPROPERTY(EditAnywhere, Category = "Blackboard")
FBlackboardKeySelector TargetKey;

// Constructor — register allowed key types so the dropdown filters correctly
UMyBTTask::UMyBTTask()
{
    // Only show Object keys that are AActor or its subclasses
    TargetKey.AddObjectFilter(this,
        GET_MEMBER_NAME_CHECKED(UMyBTTask, TargetKey),
        AActor::StaticClass());

    // For vector keys:
    // TargetKey.AddVectorFilter(this, GET_MEMBER_NAME_CHECKED(UMyBTTask, TargetKey));
}

// Usage in ExecuteTask
AActor* Actor = Cast<AActor>(
    OwnerComp.GetBlackboardComponent()->GetValueAsObject(TargetKey.SelectedKeyName));
```

**Blackboard key type filters:**

| Filter method | Accepts |
|---------------|---------|
| `AddObjectFilter(owner, propName, BaseClass)` | Object keys of a given class |
| `AddClassFilter(owner, propName, BaseClass)` | Class keys |
| `AddEnumFilter(owner, propName, Enum)` | Enum keys |
| `AddIntFilter(owner, propName)` | Int keys |
| `AddFloatFilter(owner, propName)` | Float keys |
| `AddBoolFilter(owner, propName)` | Bool keys |
| `AddStringFilter(owner, propName)` | String keys |
| `AddNameFilter(owner, propName)` | Name keys |
| `AddVectorFilter(owner, propName)` | Vector keys |
| `AddRotatorFilter(owner, propName)` | Rotator keys |

---

## Custom Task (UBTTaskNode)

```cpp
// Header
UCLASS()
class MYGAME_API UMyBTTask_DoSomething : public UBTTaskNode
{
    GENERATED_BODY()
public:
    UMyBTTask_DoSomething();

    UPROPERTY(EditAnywhere, Category = "Blackboard")
    FBlackboardKeySelector TargetKey;

protected:
    virtual EBTNodeResult::Type ExecuteTask(UBehaviorTreeComponent& OwnerComp,
                                            uint8* NodeMemory) override;
    virtual EBTNodeResult::Type AbortTask(UBehaviorTreeComponent& OwnerComp,
                                          uint8* NodeMemory) override;
    virtual void TickTask(UBehaviorTreeComponent& OwnerComp,
                          uint8* NodeMemory,
                          float DeltaSeconds) override;
    virtual FString GetStaticDescription() const override;
};

// Source
UMyBTTask_DoSomething::UMyBTTask_DoSomething()
{
    NodeName = TEXT("Do Something");
    bNotifyTick = false;  // enable only when TickTask is needed — saves perf
    TargetKey.AddObjectFilter(this,
        GET_MEMBER_NAME_CHECKED(UMyBTTask_DoSomething, TargetKey),
        AActor::StaticClass());
}

EBTNodeResult::Type UMyBTTask_DoSomething::ExecuteTask(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
    AAIController* AIC = OwnerComp.GetAIOwner();
    if (!AIC) return EBTNodeResult::Failed;

    // Synchronous logic → return Succeeded or Failed
    // Async / multi-frame → return InProgress, then call FinishLatentTask() later
    return EBTNodeResult::Succeeded;
}

EBTNodeResult::Type UMyBTTask_DoSomething::AbortTask(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
    // Cancel any pending actions started in ExecuteTask
    return EBTNodeResult::Aborted;
}

void UMyBTTask_DoSomething::TickTask(UBehaviorTreeComponent& OwnerComp,
                                     uint8* NodeMemory,
                                     float DeltaSeconds)
{
    // Called each frame while task is InProgress
    // Call FinishLatentTask when done:
    // FinishLatentTask(OwnerComp, EBTNodeResult::Succeeded);
}
```

### EBTNodeResult values

| Value | Meaning |
|-------|---------|
| `Succeeded` | Task completed successfully — tree moves to next node |
| `Failed` | Task failed — parent composite handles failure |
| `InProgress` | Task is running — call `FinishLatentTask()` when complete |
| `Aborted` | Task was aborted externally — return from `AbortTask()` |

### Latent tasks

When `ExecuteTask` returns `InProgress`, the task stays active until you call:
```cpp
FinishLatentTask(OwnerComp, EBTNodeResult::Succeeded);
```
**Never forget to call `FinishLatentTask()` on all code paths** — a missing call hangs the tree forever.

### Inherit from UBTTask_BlackboardBase when appropriate

Use `UBTTask_BlackboardBase` as base (instead of `UBTTaskNode`) when the task operates on a single BB key. It provides `GetSelectedBlackboardKey()` and handles key initialization automatically.

---

## Custom Decorator (UBTDecorator)

```cpp
// Header
UCLASS()
class MYGAME_API UMyBTDecorator_Check : public UBTDecorator
{
    GENERATED_BODY()
public:
    UMyBTDecorator_Check();

    UPROPERTY(EditAnywhere, Category = "Blackboard")
    FBlackboardKeySelector TargetKey;

protected:
    virtual bool CalculateRawConditionValue(UBehaviorTreeComponent& OwnerComp,
                                            uint8* NodeMemory) const override;
    virtual void OnBecomeRelevant(UBehaviorTreeComponent& OwnerComp,
                                  uint8* NodeMemory) override;
    virtual void OnCeaseRelevant(UBehaviorTreeComponent& OwnerComp,
                                 uint8* NodeMemory) override;
};

// Source
UMyBTDecorator_Check::UMyBTDecorator_Check()
{
    NodeName = TEXT("My Check");
    bNotifyBecomeRelevant = true;  // required to receive OnBecomeRelevant calls
    bNotifyCeaseRelevant  = true;
    bNotifyTick           = false; // enable only if TickNode is needed
    TargetKey.AddObjectFilter(this,
        GET_MEMBER_NAME_CHECKED(UMyBTDecorator_Check, TargetKey),
        AActor::StaticClass());
}

bool UMyBTDecorator_Check::CalculateRawConditionValue(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) const
{
    // Return true → branch is allowed; false → branch is blocked
    return OwnerComp.GetBlackboardComponent()
        ->GetValueAsObject(TargetKey.SelectedKeyName) != nullptr;
}
```

### Observer Aborts

Observer Aborts make the BT event-driven — the tree re-evaluates when the decorator's condition changes:

| Mode | Behavior |
|------|----------|
| `None` | No automatic re-evaluation |
| `Self` | Aborts this decorator's own subtree if condition changes to false while running |
| `Lower Priority` | Aborts lower-priority branches (to the right) when condition becomes true |
| `Both` | Combination of Self + Lower Priority |

Use `Lower Priority` or `Both` on conditions that should interrupt currently running lower-priority branches (e.g., "has target" decorator on an "attack" branch should abort the "patrol" branch).

---

## Custom Service (UBTService)

Services run periodically while their parent composite or task node is active. Use them to **update Blackboard** (perception checks, target selection) — not to perform actions.

```cpp
// Header
UCLASS()
class MYGAME_API UMyBTService_UpdateTarget : public UBTService
{
    GENERATED_BODY()
public:
    UMyBTService_UpdateTarget();

    UPROPERTY(EditAnywhere, Category = "Blackboard")
    FBlackboardKeySelector TargetKey;

protected:
    virtual void TickNode(UBehaviorTreeComponent& OwnerComp,
                          uint8* NodeMemory,
                          float DeltaSeconds) override;
    virtual void OnBecomeRelevant(UBehaviorTreeComponent& OwnerComp,
                                  uint8* NodeMemory) override;
};

// Source
UMyBTService_UpdateTarget::UMyBTService_UpdateTarget()
{
    NodeName         = TEXT("Update Target");
    Interval         = 0.5f;   // seconds between TickNode calls
    RandomDeviation  = 0.1f;   // random jitter on interval
    bNotifyTick           = true;  // required to receive TickNode calls
    bNotifyBecomeRelevant = true;
    TargetKey.AddObjectFilter(this,
        GET_MEMBER_NAME_CHECKED(UMyBTService_UpdateTarget, TargetKey),
        AActor::StaticClass());
}

void UMyBTService_UpdateTarget::TickNode(UBehaviorTreeComponent& OwnerComp,
                                         uint8* NodeMemory,
                                         float DeltaSeconds)
{
    // Write updated data to Blackboard — do not return a result
    APawn* Pawn = OwnerComp.GetAIOwner() ? OwnerComp.GetAIOwner()->GetPawn() : nullptr;
    if (!Pawn) return;

    // Example: write closest enemy to BB
    // OwnerComp.GetBlackboardComponent()->SetValueAsObject(TargetKey.SelectedKeyName, Enemy);
}
```

**Service `Interval` guideline:** Avoid values below 0.1 s. Higher-frequency updates are almost never justified and waste CPU when many AI agents run simultaneously.

---

## NodeMemory — Per-instance State

By default, BT nodes are **not instanced** — one node object is shared across all AI using the same tree asset. Store per-execution state in `NodeMemory`, not on the node object.

```cpp
// Define memory struct in the header (POD or trivially constructible)
struct FMyTaskMemory
{
    float ElapsedTime;
    TWeakObjectPtr<AActor> CachedTarget;
};

// In the node class
virtual uint16 GetInstanceMemorySize() const override
{
    return sizeof(FMyTaskMemory);
}

virtual EBTNodeResult::Type ExecuteTask(UBehaviorTreeComponent& OwnerComp,
                                        uint8* NodeMemory) override
{
    FMyTaskMemory* Memory = reinterpret_cast<FMyTaskMemory*>(NodeMemory);
    Memory->ElapsedTime = 0.f;
    return EBTNodeResult::InProgress;
}
```

Alternatively, set `bCreateNodeInstance = true` in the constructor to get a dedicated instance per BT component — simpler, but more memory per AI.

---

## Build.cs Dependencies

```csharp
PublicDependencyModuleNames.AddRange(new string[]
{
    "AIModule",
    "NavigationSystem",  // for MoveTo / pathfinding
    "GameplayTasks",     // if using UGameplayTask inside tasks
});
```

---

## Built-in Node Lookup Workflow

Open the node catalog when you need to pick a built-in node rather than writing a custom one.

1. First — check `.unikit/memory/stack/references/behavior-tree-nodes.md`. It lists all built-in composites, decorators, services, and tasks with their key properties.
2. If the catalog has a node that fits, prefer it over a custom implementation.
3. If nothing fits, author a custom node following the C++ patterns above.

---

## Best Practices

- **Use Services for Blackboard updates, not Tasks.** Perception logic, target selection, and enemy scoring belong in Services attached to the relevant subtree root — not inside Tasks.
- **Prefer Observer Aborts over tick-polling.** If a `Blackboard` decorator's abort would re-evaluate the condition automatically, do not poll in a Task loop.
- **Attach Services as high up the tree as needed.** A Service on the root runs as long as the tree runs; attach closer to the leaf for tighter scoping.
- **Keep Tasks synchronous when possible.** Latent tasks complicate abort handling. Only go `InProgress` when the action is genuinely asynchronous (e.g., MoveTo, montage playback).
- **Name nodes descriptively.** Set `NodeName` in the constructor so the editor shows meaningful labels instead of class names.
- **Always provide `GetStaticDescription()`.** It shows UPROPERTY values as a tooltip in the editor, which saves designers from opening Details every time.
- **Filter key selectors in the constructor.** Call `AddObjectFilter()` (or the appropriate filter) before `InitializeFromAsset()` runs — the editor dropdown filters by registered types.
- **One concern per node.** A Task that also updates perception and manages a timer is doing too much — split into a Task + Service.

---

## Anti-patterns

- **Modifying node object state in non-instanced nodes** — `ExecuteTask`, `TickTask`, `TickNode`, `CalculateRawConditionValue` must treat `this` as const if `bCreateNodeInstance = false`. Store mutable state in `NodeMemory` or enable instancing.
- **Forgetting `bNotifyTick = true`** — `TickTask` and `TickNode` are silently never called without this flag. Same for `bNotifyBecomeRelevant` / `bNotifyCeaseRelevant`.
- **Not calling `FinishLatentTask()`** — returning `InProgress` from `ExecuteTask` without a corresponding `FinishLatentTask()` call hangs the tree. Always trace all code paths.
- **High-frequency Services** — a 0.05 s interval on a service running on 50 AI is 1000 calls/s. Use `Interval` ≥ 0.1 s and add `RandomDeviation` to stagger updates.
- **Hardcoding Blackboard key names as `FName` literals** — use `FBlackboardKeySelector` properties instead. Hard-coded names break silently when the BB key is renamed.
- **Performing heavy work in `CalculateRawConditionValue`** — it can be called multiple times per frame during tree evaluation. Keep it lightweight; push expensive checks into a Service.
- **Deep nesting without sub-trees** — flatten with `UBTTask_RunBehavior` (reusable subtrees) when the tree becomes unreadable.
- **Using instanced nodes by default** — `bCreateNodeInstance = true` allocates a node object per BT component. Only use it when `NodeMemory` is genuinely insufficient (e.g., requires `TArray` or delegate binding).
