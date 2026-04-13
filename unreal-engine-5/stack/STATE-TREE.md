---
version: 1.0.0
---

# StateTree

> **Scope**: StateTree system — states, tasks, evaluators, conditions, transitions, data binding, schemas, contexts, external data, linked trees, C++ task authoring, Smart Object/Mass integration
> **Load when**: building hierarchical AI logic with StateTree — authoring FStateTreeTaskCommonBase tasks with InstanceData, returning EStateTreeRunStatus from EnterState/Tick/ExitState, defining evaluators and conditions, configuring transitions and linked subtrees, running trees via UStateTreeComponent and binding properties between nodes

---

## Core Concepts

StateTree is UE5's hierarchical state machine framework — a hybrid of state machines and behavior trees. Unlike Behavior Trees, StateTrees:
- Run on any actor via `UStateTreeComponent` (no AI Controller required)
- Support concurrent task execution within states
- Use data binding for passing values between nodes
- Integrate natively with Smart Objects and Mass Entity Framework

**Key classes:**

| Class / Struct | Purpose |
|---------------|---------|
| `UStateTree` | Asset containing tree definition (editor + baked runtime) |
| `UStateTreeComponent` | Component running a StateTree on an actor |
| `UStateTreeSchema` | Defines valid inputs, evaluators, tasks, and conditions |
| `FStateTreeExecutionContext` | Runtime context passed to all node callbacks |
| `FStateTreeTaskBase` / `FStateTreeTaskCommonBase` | Base structs for C++ tasks |
| `UStateTreeTaskBlueprintBase` | Base class for Blueprint tasks |
| `UStateTreeEvaluatorBlueprintBase` | Base class for Blueprint evaluators |
| `UStateTreeConditionBlueprintBase` | Base class for Blueprint conditions |
| `FStateTreeTransitionResult` | Transition data passed to Enter/ExitState |

## Module Setup

```csharp
// MyProject.Build.cs
PublicDependencyModuleNames.AddRange(new string[] {
    "StateTreeModule",
    "GameplayStateTreeModule"  // For gameplay-specific tasks/evaluators
});
```

Enable the **StateTree** plugin in your `.uproject` file.

## States

States form the tree hierarchy. Each state has:
- **Tasks** — behaviors executed while the state is active (run concurrently)
- **Enter Conditions** — evaluated before entering the state
- **Transitions** — rules for leaving the state
- **Child States** — sub-states forming the hierarchy

**State types:**

| Type | Purpose |
|------|---------|
| State | Standard state with tasks and transitions |
| Linked Asset | References another StateTree asset (subtree) |
| Group | Organizational container (no tasks) |

**Completion behavior** defines what happens when all tasks in a state complete — succeed, fail, or keep running.

## Tasks (C++)

### Basic Structure

```cpp
USTRUCT(meta = (DisplayName = "My Custom Task"))
struct FMyTask : public FStateTreeTaskCommonBase
{
    GENERATED_BODY()

    // Instance data type for runtime state
    using FInstanceDataType = FMyTaskInstanceData;

    virtual const UStruct* GetInstanceDataType() const override
    {
        return FInstanceDataType::StaticStruct();
    }

    virtual EStateTreeRunStatus EnterState(
        FStateTreeExecutionContext& Context,
        const FStateTreeTransitionResult& Transition) const override;

    virtual void ExitState(
        FStateTreeExecutionContext& Context,
        const FStateTreeTransitionResult& Transition) const override;

    virtual EStateTreeRunStatus Tick(
        FStateTreeExecutionContext& Context,
        const float DeltaTime) const override;

    virtual void TreeStart(FStateTreeExecutionContext& Context) const override;
    virtual void TreeStop(FStateTreeExecutionContext& Context) const override;
};
```

### Instance Data

Separate struct holding per-instance runtime state. Bindable in the editor.

```cpp
USTRUCT()
struct FMyTaskInstanceData
{
    GENERATED_BODY()

    // Input — bindable from other nodes
    UPROPERTY(EditAnywhere, Category = Input)
    AActor* TargetActor = nullptr;

    // Output — available for other nodes to bind to
    UPROPERTY(EditAnywhere, Category = Output)
    FVector ResultLocation = FVector::ZeroVector;
};
```

**Key distinction:**
- Properties on the **task struct** → editable in editor only, not bindable
- Properties in **InstanceData** → changeable at runtime, bindable to other nodes

### Return Status

| Status | Meaning |
|--------|---------|
| `EStateTreeRunStatus::Running` | Task remains active, continues ticking |
| `EStateTreeRunStatus::Succeeded` | Task completed successfully |
| `EStateTreeRunStatus::Failed` | Task failed |
| `EStateTreeRunStatus::Stopped` | Halts entire StateTree execution |

**Pre-5.6 behavior:** Returning `Succeeded` immediately triggered state completion regardless of other active tasks. In UE 5.6+ this is configurable.

**Rule:** Data-retrieval tasks should return `Running` even when finished to prevent premature state transitions. Only action tasks should return completion status.

### External Data Access

```cpp
// Header
TStateTreeExternalDataHandle<AAIController> AIControllerHandle;

// Link function
virtual bool Link(FStateTreeLinker& Linker) override
{
    Linker.LinkExternalData(AIControllerHandle);
    return true;
}

// Usage in EnterState/Tick
virtual EStateTreeRunStatus EnterState(
    FStateTreeExecutionContext& Context,
    const FStateTreeTransitionResult& Transition) const override
{
    AAIController* Controller = Context.GetExternalData(AIControllerHandle);
    if (!Controller) return EStateTreeRunStatus::Failed;

    // Use controller...
    return EStateTreeRunStatus::Running;
}
```

### Getting Instance Data

```cpp
virtual EStateTreeRunStatus Tick(
    FStateTreeExecutionContext& Context,
    const float DeltaTime) const override
{
    FMyTaskInstanceData& Data = Context.GetInstanceData<FMyTaskInstanceData>(*this);
    // Use Data.TargetActor, set Data.ResultLocation, etc.
    return EStateTreeRunStatus::Running;
}
```

## Evaluators

Evaluators provide data to the tree but **do not trigger transitions**. They run outside the state hierarchy.

- Set data that tasks and conditions can bind to
- No inputs beyond context data
- Tick independently of state activation
- Use for: sensor data, computed values, interface casts

**Pattern:** Create evaluators that output interfaces to avoid repeated casting in tasks.

**Caveat:** Evaluators may cache values — for event-driven data, use tick-based updates or external event refresh.

## Conditions

Conditions gate state entry and drive transitions. Evaluated before `EnterState`.

- **Enter Conditions** — must pass for a state to be entered
- **Transition Conditions** — must pass for a transition to fire

Can be written in C++ (`FStateTreeConditionBase`) or Blueprint (`UStateTreeConditionBlueprintBase`).

## Transitions

### Transition Triggers

| Trigger | When |
|---------|------|
| On State Completed | Any task returns Succeeded/Failed |
| On Task Succeeded | Specific task succeeds |
| On Task Failed | Specific task fails |
| On Event | Manual trigger from code or task |
| On Tick | Evaluated every tick while state is active |

### Transition Types

| Type | Behavior |
|------|----------|
| **Changed** | Fires when state selection actually changes |
| **Sustained** | Fires for active state persistence — triggers Enter/Exit repeatedly |

**Critical:** Check `Transition.ChangeType` in `EnterState`/`ExitState` to distinguish between initial entry and sustained re-entry.

### Transition Priority

`EStateTreeTransitionPriority` resolves conflicts when multiple transitions fire simultaneously.

## Schemas

`UStateTreeSchema` constrains what a StateTree can contain:
- Valid task types
- Valid condition types
- Available context data
- Prevents authoring errors at edit time

Schemas are set on the StateTree asset and determine the execution environment.

## Linked Trees (Subtrees)

Set a state's type to **Linked Asset** to reference another StateTree:
- Splits logic into manageable chunks
- Shares behavior groups between AI types
- Parameters can be passed to subtrees

**Limitations:**
- Global tasks in subtrees with parameters can crash — avoid this combination
- "Should State Change on Reselect" may be ignored in subtrees until manual recompilation

## Data Binding

StateTree uses property binding to pass data between nodes:
- Bindings pass **values, not references** (copies)
- Struct bindings copy the entire struct
- Blueprint property getters are bypassed in C++ — won't update dynamically

**Workaround for stale bindings:** Add a 0-second delay task before relying on initial binding values.

## Global Tasks

Tasks placed at the tree root that run across all states:
- Use for cross-cutting concerns (value watchers, tag sync)
- **Warning:** If a global task calls `FinishTask` / returns Succeeded, the entire StateTree stops immediately with no warning log

## Smart Object Integration

StateTrees can drive Smart Object behaviors:
- StateTree tasks find, claim, and use Smart Objects
- Smart Object slots can trigger StateTree-based behaviors
- Data binding passes context between states and SO interactions

## Mass Entity Integration

StateTrees can control Mass entities in crowd simulations:
- Mass processors tick StateTrees for entity-level AI
- StateTree schemas for Mass define entity-specific context data

## Debugging

| Tool | How |
|------|-----|
| Built-in StateTree Debugger | Shows execution flow, active states, transition history |
| Unreal Insights | Measure StateTree tick cost |
| Linked tree debugging | Access debugger via parent tree |

For linked assets, the debugger must be accessed from the **parent tree**.

## Performance

- **C++ tasks significantly outperform Blueprint tasks** — use C++ for frequently ticking tasks
- Tasks are **not ticked every frame by default** — they tick once active after `EnterState`, then on subsequent ticks while `Running`
- StateTrees **cannot be modified at runtime** when run through `UStateTreeComponent`
- UE 5.5+ introduced utility-based state selection for more sophisticated decision-making

## Best Practices

- **Write tasks in C++** for performance-critical AI — Blueprint tasks have measurable overhead
- **Use InstanceData for bindable properties**, task struct properties for editor-only configuration
- **Return `Running` from data-retrieval tasks** — returning `Succeeded` prematurely triggers state completion (pre-5.6)
- **Check `Transition.ChangeType`** in Enter/ExitState — distinguish `Changed` from `Sustained` to avoid unexpected re-initialization
- **Use evaluators for data, tasks for actions** — evaluators set data without triggering transitions
- **Create root-level watcher tasks** for cross-cutting concerns (tag sync, value monitoring)
- **Use Linked Assets** to split complex trees — but avoid global tasks with parameters in subtrees
- **Use soft references** in task parameters — hard references to Blueprint widgets inflate memory footprint
- **Create actor components for Gameplay Tag management** — with event dispatchers; global task syncs into tree
- **Use schemas** to constrain valid node types — catches authoring errors at edit time

## Anti-patterns

- **Global task completing** — a global task returning `Succeeded`/`Failed` silently stops the entire tree
- **Blueprint tasks in hot paths** — significantly slower than C++ equivalents
- **Ignoring transition types** — not checking `Changed` vs `Sustained` causes repeated Enter/Exit logic
- **Hard references in task parameters** — pointing at Blueprint widgets bloats StateTree memory
- **Binding to primitives instead of objects** — values are copied, not referenced; stale data results
- **FinishTask in cosmetic subtasks** — premature state completion; cosmetic tasks (sounds, particles) should never call FinishTask
- **Global tasks + parameters in subtrees** — causes hard crashes
- **Accessing nonexistent external data** — using `GetExternalData` for data not in context (e.g., AIController on a pawn without one) crashes
- **Assuming bindings are references** — struct bindings copy entire structs; changes to source don't propagate automatically
- **Modifying tree at runtime** — StateTrees run via component cannot be changed at runtime
