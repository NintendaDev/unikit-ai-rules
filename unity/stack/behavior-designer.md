---
version: 1.0.0
---

# Behavior Designer

> **Scope**: Behavior Designer (Opsive) behavior tree authoring — custom Action and Conditional task classes, task lifecycle, SharedVariable communication, Conditional Aborts, BehaviorTree component scripting API, external behavior trees, and composite node patterns.
> **Load when**: building AI behaviors with Behavior Designer, writing custom Action or Conditional tasks, using SharedVariables to pass data between tasks, configuring Conditional Aborts, scripting the BehaviorTree component at runtime, debugging behavior tree execution, designing reusable subtrees with External Behavior Trees.

---

## Core Concepts

Behavior trees execute tasks in **depth-first order**. Every tree starts from an **Entry Task** (root node). There are four task categories:

| Category | Base class | Role |
|----------|------------|------|
| Action | `Action` | Leaf node — executes a behavior, returns `TaskStatus` |
| Conditional | `Conditional` | Leaf node — evaluates a condition, returns `TaskStatus` |
| Composite | `Composite` | Parent node — controls execution flow (Sequence, Selector, …) |
| Decorator | `Decorator` | Wraps a single child, modifies its behavior |

Sibling execution order is determined by horizontal position in the visual editor (left → right).

---

## Namespaces

Always import both namespaces when working with tasks and SharedVariables:

```csharp
using BehaviorDesigner.Runtime;          // SharedVariable types, BehaviorTree
using BehaviorDesigner.Runtime.Tasks;    // Action, Conditional, TaskStatus
```

---

## Task Lifecycle Methods

The task API mirrors Unity's `MonoBehaviour`. Override only the methods you need.

| Method | When called | Typical use |
|--------|------------|-------------|
| `OnAwake()` | Once when the behavior tree is enabled | Cache expensive lookups (e.g., `FindGameObjectsWithTag`) |
| `OnStart()` | Immediately before each execution run | Initialize per-run state |
| `OnUpdate()` | Every tick while the task is active | Main execution logic, **must return `TaskStatus`** |
| `OnFixedUpdate()` | During `FixedUpdate` loop | Physics-based logic |
| `OnEnd()` | After the task completes (success or failure) | Cleanup |
| `OnPause(bool paused)` | When the behavior is paused or resumed | Pause side effects |
| `OnBehaviorComplete()` | When the entire tree finishes executing | React to tree completion |
| `OnReset()` | When Reset is triggered in the Inspector | Reset default property values |
| `OnDrawGizmos()` | In editor gizmo pass | Visual debugging |

**Rule:** Always cache heavy operations in `OnAwake()` — never in `OnUpdate()`.

---

## TaskStatus

`OnUpdate()` must return one of three values:

```csharp
TaskStatus.Success   // task completed successfully → parent moves to next sibling or succeeds
TaskStatus.Failure   // task failed → parent handles failure
TaskStatus.Running   // task is ongoing → called again next frame
```

---

## Writing a Custom Action Task

```csharp
using UnityEngine;
using BehaviorDesigner.Runtime;
using BehaviorDesigner.Runtime.Tasks;

public class MoveTowards : Action
{
    public float speed = 0;
    public SharedTransform target;   // exposed in Inspector; shared across tasks

    public override TaskStatus OnUpdate()
    {
        if (Vector3.SqrMagnitude(transform.position - target.Value.position) < 0.1f)
            return TaskStatus.Success;

        transform.position = Vector3.MoveTowards(
            transform.position,
            target.Value.position,
            speed * Time.deltaTime
        );
        return TaskStatus.Running;
    }
}
```

Rules:
- Inherit from `Action`.
- Return `Running` while the action is still in progress.
- Use `SharedVariable` fields for data received from preceding tasks.

---

## Writing a Custom Conditional Task

```csharp
using UnityEngine;
using BehaviorDesigner.Runtime;
using BehaviorDesigner.Runtime.Tasks;

public class WithinSight : Conditional
{
    public float fieldOfViewAngle = 90f;
    public string targetTag = "Player";
    public SharedTransform target;           // set here, consumed by Action tasks

    private Transform[] possibleTargets;

    public override void OnAwake()
    {
        // Cache — never call FindGameObjectsWithTag in OnUpdate
        var taggedObjects = GameObject.FindGameObjectsWithTag(targetTag);
        possibleTargets = new Transform[taggedObjects.Length];
        for (int i = 0; i < taggedObjects.Length; i++)
            possibleTargets[i] = taggedObjects[i].transform;
    }

    public override TaskStatus OnUpdate()
    {
        foreach (var t in possibleTargets)
        {
            var dir = t.position - transform.position;
            if (Vector3.Angle(transform.forward, dir) < fieldOfViewAngle * 0.5f)
            {
                target.Value = t;       // pass the found target to other tasks
                return TaskStatus.Success;
            }
        }
        return TaskStatus.Failure;
    }
}
```

Rules:
- Inherit from `Conditional`.
- `OnUpdate()` must be **instant** (no multi-frame logic) — return `Success` or `Failure`, never `Running` in typical use.
- Write the found result into a `SharedVariable` so downstream Action tasks can consume it.

---

## SharedVariable Types

Declare SharedVariables as **public fields** — they appear in the Inspector and can be linked in the visual editor.

```csharp
public SharedTransform target;
float value = target.Value;  // access via .Value
```

**19 built-in types:**

| Category | Types |
|----------|-------|
| Primitive | `SharedBool`, `SharedInt`, `SharedFloat`, `SharedString` |
| Unity types | `SharedTransform`, `SharedGameObject`, `SharedVector3`, `SharedVector2`, `SharedVector3Int`, `SharedVector4`, `SharedQuaternion`, `SharedColor`, `SharedRect`, `SharedMaterial`, `SharedAnimationCurve` |
| Collections | `SharedGameObjectList`, `SharedTransformList`, `SharedObjectList` |
| Generic | `SharedObject` |

**Variable scopes:**

| Scope | Description |
|-------|-------------|
| **Local** | Belongs to a single behavior tree |
| **Global** | Shared across all behavior trees in the scene |
| **Dynamic** | Created and assigned at runtime |

**Variable Mappings** — link a SharedVariable to a MonoBehaviour C# *property* (not a field), so you can read/write component data without a dedicated task.

**External tree inheritance:** If a parent tree and an external tree both have a SharedVariable of the **same name and type**, the parent's value overrides the external tree's value at runtime.

---

## BehaviorTree Component API

```csharp
// Start / stop
behaviorTree.EnableBehavior();             // start or resume
behaviorTree.DisableBehavior();            // stop and reset
behaviorTree.DisableBehavior(pause: true); // pause; resumes from current position

// Query execution state
BehaviorTree.TaskStatus status = behaviorTree.ExecutionStatus; // Running | Success | Failure

// Find tasks
var task   = behaviorTree.FindTask<MyTask>();
var tasks  = behaviorTree.FindTasks<MyTask>();
var named  = behaviorTree.FindTaskWithName("AttackTask");
var all    = behaviorTree.FindTasksWithName("AttackTask");

// Events
behaviorTree.OnBehaviorStart   += OnStart;
behaviorTree.OnBehaviorRestart += OnRestart;
behaviorTree.OnBehaviorEnd     += OnEnd;
```

**BehaviorTree component settings:**

| Setting | Default | Effect |
|---------|---------|--------|
| Start When Enabled | true | Auto-starts when the component activates |
| Asynchronous Load | false | Deserializes tree on a background thread — **disable when using Variable Mappings** |
| Pause When Disabled | false | Pauses execution instead of stopping on disable |
| Restart When Complete | false | Auto-restarts when the tree reaches a terminal status |
| Reset Values On Restart | true | Re-initializes all variables to their original values on restart |
| Log Task Changes | false | Logs task status transitions to Console (debugging) |
| External Behavior | — | References an external behavior tree asset to execute |
| Group | 0 | Numeric tag for multi-tree management |

---

## Conditional Aborts

Conditional Aborts let a conditional task interrupt running tasks when its result changes — without rebuilding the entire tree. Analogous to Observer Aborts in UE4.

| Abort Type | Behavior |
|------------|----------|
| **None** | Default — conditional is never reevaluated once passed |
| **Self** | Aborts and restarts tasks that share the **same parent composite** |
| **Lower Priority** | Aborts tasks in **lower-priority branches** (to the right in the tree) |
| **Both** | Combines Self and Lower Priority |

**Typical pattern — reactive selector:**

```
Selector (abort type = LowerPriority)
├── WithinSight → AttackSequence
└── Patrol
```
When `WithinSight` changes from failure to success, the `Patrol` branch is aborted automatically.

**Important pitfall:** Conditional abort conditions are checked **once per graph update**. If a child task changes a value that would trigger the abort, the effect is not visible until the next frame. Fix with a `WaitForFrame` node:

```
Sequence
├── TriggerConditionChange
├── WaitForFrame          ← ensures the abort condition is evaluated next tick
└── NextTask
```

---

## External Behavior Trees

An **External Behavior Tree** is a reusable behavior tree asset referenced via the `BehaviorTreeReference` task. The subtasks of the external tree are loaded as if they were part of the parent tree.

```csharp
// Pooling pattern for frequently swapped external trees
ExternalBehavior externalBehavior = pool.Get();
externalBehavior.Init();                          // deserialize from pool
behaviorTree.ExternalBehavior = externalBehavior;
```

Rules:
- Use External Behavior Trees to eliminate duplicated task sequences shared across multiple agents.
- Variable inheritance works by **name + type match** — the parent tree's value overwrites the external tree's value for matching variables.
- Use per-reference variable overrides on the `BehaviorTreeReference` task when the same external tree needs different inputs from different callers.
- Enable pooling when external trees are swapped frequently to avoid allocation spikes.

---

## Built-in Composite Tasks

| Task | Behavior |
|------|----------|
| **Sequence** | Runs children left-to-right; stops and returns `Failure` on the first failure |
| **Selector** | Runs children left-to-right; stops and returns `Success` on the first success |
| **Parallel** | Runs all children simultaneously |
| **Priority Selector** | Selects child with the highest value returned by `GetPriority()` |
| **Utility Selector** | Selects child with the highest value returned by `GetUtility()` (Utility Theory AI) |

---

## Task Properties

| Property | Description |
|----------|-------------|
| `Owner` | Reference to the owning `BehaviorTree` component |
| `instant` | When **checked**, the task completes and the next task starts **in the same frame**. When **unchecked** (default), execution waits one update tick before the next task starts. |
| `GetPriority()` | Override in tasks used with Priority Selector |
| `GetUtility()` | Override in tasks used with Utility Selector |

---

## Anti-patterns

- **Never call `FindGameObjectsWithTag` / `GetComponent` in `OnUpdate()`** — cache the result in `OnAwake()`. `OnUpdate()` runs every tick; these methods allocate or are expensive.
- **Never return `Running` from a Conditional task** — Conditional tasks are evaluated as instant checks. Returning `Running` from a `Conditional` will stall the tree indefinitely.
- **Don't enable Asynchronous Load with Variable Mappings** — async deserialization and variable property mappings race; disable async loading when mappings are configured.
- **Don't forget `WaitForFrame` after an in-tree value change that should trigger a Conditional Abort** — abort conditions are sampled once per update, not mid-frame.
- **Don't duplicate shared sequences** — use External Behavior Trees for behavior that is identical across multiple agents.
- **Don't mismatch variable names or types for External Tree inheritance** — both name AND type must match exactly, or the parent value will not propagate to the external tree.
