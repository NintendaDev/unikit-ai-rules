version: 1.0.0

# StateTree

> **Scope**: StateTree plugin usage in UE5 — authoring Tasks, Evaluators, and Conditions in C++, configuring Schemas and context data, managing InstanceData, setting up transitions and selectors, integrating with AI controllers, and running External StateTrees.
> **Load when**: authoring StateTree tasks or evaluators, creating custom StateTree conditions, setting up StateTree schema, binding context or instance data, debugging state transitions, integrating StateTree with AI systems, designing hierarchical state machines, using StateTreeComponent or External StateTree.

---

## Core Concepts

StateTree is a general-purpose hierarchical state machine that combines **Selectors** (from behavior trees) with **States** and **Transitions** (from state machines). All tasks in the active branch (root to leaf) execute concurrently.

| Component | Role |
|-----------|------|
| **State** | A node in the hierarchy; holds enter conditions, tasks, and outgoing transitions |
| **Task** | Logic executed while a state is active — has a full lifecycle: `EnterState`, `Tick`, `ExitState` |
| **Evaluator** | Lightweight observer that collects/transforms world data on a schedule and exposes it to the tree |
| **Condition** | Boolean check used in enter conditions or transitions |
| **Selector** | Determines how child states are chosen (Ordered, Random, Utility) |
| **Schema** | Declares which external types (Actors, Components, Subsystems) the tree can access |

---

## Module Setup (Build.cs)

```csharp
PublicDependencyModuleNames.AddRange(new string[]
{
    "StateTreeModule",          // Core StateTree runtime and editor
    "GameplayStateTreeModule",  // AIController-specific built-in tasks (MoveToTask, etc.)
    "GameplayTags",             // Tag-based conditions and transitions
});
```

Also enable the `StateTree` and `GameplayStateTree` plugins in `.uproject`.

---

## Task Authoring (C++)

Use `FStateTreeTaskCommonBase` for struct-based tasks (preferred for all tasks that don't need delegate binding). Use `UStateTreeTaskBlueprintBase` only when you must bind delegates or hold UObject references in instance state.

### Minimal struct-based task

```cpp
USTRUCT(DisplayName="My Task")
struct MYGAME_API FMyTask : public FStateTreeTaskCommonBase
{
    GENERATED_BODY()

    using FInstanceDataType = FMyTaskInstanceData;

    virtual const UStruct* GetInstanceDataType() const override
    {
        return FInstanceDataType::StaticStruct();
    }

    virtual EStateTreeRunStatus EnterState(
        FStateTreeExecutionContext& Context,
        const FStateTreeTransitionResult& Transition) const override;

    // Only override Tick when the task actually needs per-frame logic:
    virtual EStateTreeRunStatus Tick(
        FStateTreeExecutionContext& Context,
        float DeltaTime) const override;

    virtual void ExitState(
        FStateTreeExecutionContext& Context,
        const FStateTreeTransitionResult& Transition) const override;
};
```

### InstanceData struct

```cpp
USTRUCT()
struct MYGAME_API FMyTaskInstanceData
{
    GENERATED_BODY()

    // Input: must be bound in the editor
    UPROPERTY(EditAnywhere, Category=Input)
    float Radius = 100.f;

    // Output: written by the task, readable by other tasks and evaluators
    UPROPERTY(EditAnywhere, Category=Output)
    float Result = 0.f;

    // Parameter: optional binding; can be set directly in the editor
    UPROPERTY(EditAnywhere, Category=Parameter)
    FGameplayTag TargetTag;

    // Context: auto-bound from the StateTree context by matching property name
    UPROPERTY(EditAnywhere, Category=Context)
    TObjectPtr<AActor> ContextActor = nullptr;
};
```

### Accessing InstanceData inside lifecycle methods

```cpp
EStateTreeRunStatus FMyTask::EnterState(
    FStateTreeExecutionContext& Context,
    const FStateTreeTransitionResult& Transition) const
{
    FInstanceDataType& Data = Context.GetInstanceData(*this);
    // Read inputs, write outputs via Data reference
    return EStateTreeRunStatus::Running;
}
```

**Always use `&` (reference) when reading or writing InstanceData — copying the struct prevents Output modifications from persisting back to the tree.**

---

## External Data (C++)

Use `TStateTreeExternalDataHandle` to access objects that live outside the tree (actors, components, subsystems). Register them in `Link()` and retrieve them in lifecycle methods.

```cpp
USTRUCT(DisplayName="Use AI Controller Task")
struct MYGAME_API FUseAIControllerTask : public FStateTreeTaskCommonBase
{
    GENERATED_BODY()

    using FInstanceDataType = FUseAIControllerTaskInstanceData;

    TStateTreeExternalDataHandle<AAIController> AIControllerHandle;
    TStateTreeExternalDataHandle<UAbilitySystemComponent> ASCHandle;

    virtual bool Link(FStateTreeLinker& Linker) override
    {
        Linker.LinkExternalData(AIControllerHandle);
        Linker.LinkExternalData(ASCHandle);
        return true;
    }

    virtual const UStruct* GetInstanceDataType() const override
    {
        return FInstanceDataType::StaticStruct();
    }

    virtual EStateTreeRunStatus EnterState(
        FStateTreeExecutionContext& Context,
        const FStateTreeTransitionResult& Transition) const override
    {
        AAIController& Controller = Context.GetExternalData(AIControllerHandle);
        // Use Controller...
        return EStateTreeRunStatus::Running;
    }
};
```

`GetExternalData()` crashes if the requested type is not available — ensure the Schema's **Context Actor Class** matches the actual runtime owner type.

---

## Evaluator Authoring (C++)

Evaluators observe the world and expose computed values to the tree. They **never trigger transitions** and have no inputs beyond the context. Keep them as pure, side-effect-free observers.

```cpp
USTRUCT(DisplayName="Health Evaluator")
struct MYGAME_API FHealthEvaluator : public FStateTreeEvaluatorCommonBase
{
    GENERATED_BODY()

    using FInstanceDataType = FHealthEvaluatorInstanceData;

    virtual const UStruct* GetInstanceDataType() const override
    {
        return FInstanceDataType::StaticStruct();
    }

    // Called once when the tree starts — bind delegates, cache references
    virtual void TreeStart(FStateTreeExecutionContext& Context) const override;

    // Called each frame (or at TickInterval) — update Output properties
    virtual void Tick(FStateTreeExecutionContext& Context, float DeltaTime) const override;

    // Called when the tree stops — unbind delegates, clean up
    virtual void TreeStop(FStateTreeExecutionContext& Context) const override;
};
```

Set `TickInterval > 0` in the evaluator for logic that doesn't need per-frame precision (e.g., 0.1–0.25 s).

---

## Condition Authoring (C++)

```cpp
USTRUCT(DisplayName="Is Target Valid")
struct MYGAME_API FIsTargetValidCondition : public FStateTreeConditionCommonBase
{
    GENERATED_BODY()

    using FInstanceDataType = FIsTargetValidConditionInstanceData;

    virtual const UStruct* GetInstanceDataType() const override
    {
        return FInstanceDataType::StaticStruct();
    }

    virtual bool TestCondition(FStateTreeExecutionContext& Context) const override;
};
```

---

## Schema Setup

Subclass `UStateTreeSchema` to declare the context types your tree requires:

```cpp
UCLASS()
class MYGAME_API UMyAIStateTreeSchema : public UStateTreeSchema
{
    GENERATED_BODY()

protected:
    virtual bool IsExternalItemAllowed(const UStruct& ExternalItemType) const override;
};
```

Set the **Context Actor Class** in the Schema asset to match the actual owner at runtime (e.g., `APawn` when driven by an `AAIController` over a pawn). A mismatch silently freezes the tree.

---

## Selectors

Three built-in selector modes determine how child states are chosen:

| Selector | Behavior |
|----------|---------|
| **Ordered** | Try child states in order; pick the first whose enter conditions pass |
| **Random** | Pick randomly from children whose enter conditions pass |
| **Utility** | Pick the child with the highest evaluated utility score |

Transitions are evaluated **leaf-to-root** — the first valid transition wins.

---

## Transitions

- Defined per-state; trigger options: Task Completed, On Tick, StateTree Event, or external
- Can target **any** state in the tree, not just immediate children
- **On State Completed** fires when **any** task finishes by default (completion mode = "Any")
  - Change to **"All"** to wait for every task in the state to finish before transitioning

---

## StateTreeComponent vs External StateTree

**StateTreeComponent** (standard — use by default):
- Add as a component to any Actor
- Use `UStateTreeAIComponent` when the owner is an `AAIController`; use `UStateTreeComponent` for all other actors
- Cannot modify or swap the tree asset at runtime

**External StateTree** (advanced — use when embedding StateTree in custom C++ frameworks):
- Drive execution directly without a component
- Useful in custom AI pipelines or animation systems

```cpp
FStateTreeInstanceData InstanceData;
StateTreeAsset->InitInstanceData(InstanceData);

FStateTreeExecutionContext Context(*OwnerActor, *StateTreeAsset, InstanceData);
// Register external data...
Context.Start();
```

---

## Execution Lifecycle

```
Tree starts
  → Evaluators: TreeStart()
  → Root state selected
    → Tasks: EnterState()     (all active states root→leaf)
    [per frame]
    → Evaluators: Tick()
    → Tasks: Tick()           (if bShouldCallTick == true)
    → Transition check (leaf→root; first valid fires)
    → Tasks: ExitState()      (exiting states leaf→root)
    → New state Tasks: EnterState()
  → Evaluators: TreeStop()
Tree stops
```

**Parent state tasks receive `EnterState`/`ExitState` on every child transition.** Guard against repeated initialization with:

```cpp
if (Transition.ChangeType == EStateTreeStateChangeType::Sustained)
{
    return EStateTreeRunStatus::Running; // already running, skip re-init
}
```

---

## AI Controller Integration

- Use `UStateTreeAIComponent` (not `UStateTreeComponent`) when the tree runs on an `AAIController`
- Ensure **Start Logic** is called only after both `BeginPlay` and `OnPossess` have completed — their order differs between editor-placed and dynamically spawned pawns
- Store critical AI state (acquired targets, perception data) on the `AAIController`, not inside the tree — external systems need direct access to it
- Use evaluators to perform interface casts once at `TreeStart()` rather than casting inside every task tick

---

## Best Practices

- Prefer C++ tasks over Blueprint tasks — Blueprint has significant per-tick overhead; use C++ for any task that runs frequently
- Keep Evaluators as pure observers — no transitions, no side effects; only collect and transform data
- Set a custom `TickInterval` on Evaluators for logic that doesn't need frame-perfect updates
- Always include a fallback **Idle** state at the root so the tree always has a valid state to enter
- Use Evaluators to centralize repeated queries (distance to player, current health, etc.) rather than duplicating them across tasks
- Use the built-in **StateTree Debugger** (editor Debug menu) and **Visual Logger** during development

---

## Anti-patterns

- **Global Tasks that return `EStateTreeRunStatus::Succeeded` immediately** — silently terminate the entire tree with no log or error output; global tasks must return `Running` or serve only as persistent side effects
- **Missing `GetInstanceDataType()` override** — any call to `Context.GetInstanceData(*this)` or `Context.GetInstanceDataPtr()` will crash
- **Writing to a copied InstanceData struct** — always use `&` reference; a copied struct discards all writes
- **Context Actor Class mismatch in Schema** — `GetExternalData()` crashes at runtime with no diagnostic output; verify the Schema class matches the actual owner
- **Blueprint-based tasks in performance-critical paths** — Blueprint tasks run significantly slower than equivalent C++ structs
- **Assuming struct bindings are references** — bindings are copied by value; mutating a bound input struct in a task does not propagate the change back to the source
- **Accessing external data at `TreeStart`/`TreeStop` without confirming availability** — external data may not be registered yet
- **Ignoring repeated Enter/Exit events on parent states** — every child state transition re-fires `EnterState`/`ExitState` on all ancestor tasks; failure to guard with `EStateTreeStateChangeType::Sustained` causes double-initialization bugs
- **Combining global tasks in linked assets with tree parameters (≤ UE 5.4)** — causes hard crashes; move global tasks to the subtree's root state instead

---

## Debugging

- Enable **StateTree Debugger** via the editor Debug menu during PIE to inspect active states and data values
- Use **Visual Logger** to observe state selections and transitions over time
- For **subtrees** (linked StateTree assets), enable debugging in the parent tree, not the subtree asset
- If the tree starts but shows **no activity** in Visual Logger: check `BeginPlay`/`OnPossess` ordering and whether external data is registered correctly
- If a transition never fires despite conditions appearing true: add a 0-second delay task before the transition to ensure evaluator values have propagated
