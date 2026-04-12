---
version: 1.0.0
---

# NodeCanvas — Custom Tasks, Nodes & States

> **Scope**: Rules for creating custom NodeCanvas entities: ActionTask, ConditionTask, BTNode, BTDecorator, BTComposite, FSMState, BBParameter, graph events, easing. Also: lookup of built-in tasks, conditions, and BT nodes.
> **Load when**: AI behaviour trees, FSM states, ActionTask, ConditionTask, BTNode, graph events, BBParameter, NodeCanvas.
> **References**: `references/node-canvas-bt-nodes-quickref.md`, `references/node-canvas-bt-nodes-full.md`, `references/node-canvas-tasks-quickref.md`, `references/node-canvas-tasks-full.md`, `references/node-canvas-conditions-quickref.md`, `references/node-canvas-conditions-full.md`.

---

## Built-in Node Lookup

When you need to find an existing built-in NodeCanvas task, condition, or BT node — use reference files below. **Quickref first, full second** (quickref covers the most common nodes; fall back to full only if nothing fits).

### BT Nodes (Composites, Decorators, Leafs)

1. **First** — read `references/node-canvas-bt-nodes-quickref.md`
2. **If not found** — read `references/node-canvas-bt-nodes-full.md`

### ActionTasks

1. **First** — read `references/node-canvas-tasks-quickref.md`
2. **If not found** — read `references/node-canvas-tasks-full.md`

### ConditionTasks

1. **First** — read `references/node-canvas-conditions-quickref.md`
2. **If not found** — read `references/node-canvas-conditions-full.md`

---

## Before Writing Code

1. **Clarify the entity type** (ActionTask, ConditionTask, BTNode, BTDecorator, BTComposite, FSMState)
2. **Identify all BBParameter fields** — prefer `BBParameter<T>` over raw fields for blackboard integration
3. **Determine the namespace** — `NodeCanvas.Tasks.Actions` / `NodeCanvas.Tasks.Conditions` for tasks, `NodeCanvas.BehaviourTrees` for BT nodes, `NodeCanvas.StateMachines` for FSM states
4. **Check if generic** — if the task should work with multiple types, use generic `<T>` pattern
5. Follow project coding style rules
6. Use project naming conventions, not framework naming
7. Up-to-date docs available via Context7
8. Task class names ALWAYS end with `Task` (e.g. `MoveWithBobTask`), with `[Name("Move With Bob")]` attribute (without "Task")
9. In NodeCanvas Tasks (ActionTask, ConditionTask, BTNode, BTDecorator, BTComposite, FSMState), never use `[SerializeField]` on parameter fields. Parameters must always be public fields — NodeCanvas's internal engine automatically serializes them.

---

## Entity Reference

### ActionTask

Base class for actions in BT ActionNodes and FSM states.

**Lifecycle methods:**

```
OnInit()        → Called once on first execution. Return null if OK, string if error.
OnExecute()     → Called once when action starts.
OnUpdate()      → Called every frame while running.
OnStop()        → Called when action ends (EndAction or interrupted).
OnPause()       → Called when graph pauses.
```

**Key members:**

```
Component agent          — The agent this task acts on
IBlackboard blackboard   — Access blackboard variables manually
float elapsedTime        — Seconds since action started running
void EndAction(bool)     — MUST call to complete. true = success, false = failure.
void SendEvent(string)   — Send event to the graph
void SendEvent<T>(string, T) — Send event with value
Coroutine StartCoroutine(IEnumerator) — Run coroutine from task
```

**Template:**

```csharp
using UnityEngine;
using NodeCanvas.Framework;
using ParadoxNotion.Design;

namespace NodeCanvas.Tasks.Actions
{
    [Category("MyProject")]
    [Description("Brief description of what this action does")]
    public class MyActionTask : ActionTask
    {
        public BBParameter<float> SomeValue;

        protected override string info => "MyAction " + SomeValue;

        protected override string OnInit()
        {
            return null;
        }

        protected override void OnExecute()
        {
            // One-shot logic or start of continuous action
        }

        protected override void OnUpdate()
        {
            EndAction(true);
        }

        protected override void OnStop()
        {
            // Cleanup
        }
    }
}
```

**Critical rules:**
- Always call `EndAction(bool)` — forgetting this leaves the action running forever
- For instant actions, call `EndAction()` inside `OnExecute()`
- For duration-based actions, call `EndAction()` inside `OnUpdate()` when condition met
- Use `elapsedTime` for time-based actions instead of manual timers when possible

### ActionTask with Specific Agent Type

```csharp
public class MyActionTask : ActionTask<Rigidbody>
{
    // 'agent' is now typed as Rigidbody
    protected override void OnExecute()
    {
        agent.AddForce(Vector3.up * 10f);
        EndAction(true);
    }
}
```

---

### ConditionTask

Base class for conditions in BT ConditionNodes, FSM transitions, and decorators.

**Lifecycle methods:**

```
OnInit()    → Same as ActionTask.
OnEnable()  → Called when condition becomes active. Good for event subscriptions.
OnCheck()   → Called to evaluate. Return true or false.
OnDisable() → Called when condition deactivates. Unsubscribe events here.
```

**Key members:**

```
Component agent
IBlackboard blackboard
void YieldReturn(bool) — Force return value from outside OnCheck (event-driven conditions)
```

**Template:**

```csharp
using UnityEngine;
using NodeCanvas.Framework;
using ParadoxNotion.Design;

namespace NodeCanvas.Tasks.Conditions
{
    [Category("MyProject")]
    [Description("Brief description of what this condition checks")]
    public class MyConditionTask : ConditionTask
    {
        public BBParameter<float> Threshold;

        protected override string info => "Check " + Threshold;

        protected override bool OnCheck()
        {
            return true;
        }
    }
}
```

**Typed agent version:**

```csharp
public class IsHealthAboveTask : ConditionTask<Health>
{
    public BBParameter<float> Threshold;

    protected override bool OnCheck()
    {
        return agent.currentHealth > Threshold.value;
    }
}
```

---

### BTNode (Behaviour Tree Leaf Node)

Custom leaf node — sits at the bottom of the tree, executes logic directly.

**Lifecycle:**

```
OnGraphStarted()   → When BT starts
OnGraphStoped()    → When BT stops
OnGraphPaused()    → When BT pauses
OnExecute(agent, blackboard) → Each tick. Return Status.Success / Failure / Running.
OnReset()          → When node resets (graph start, interruption, new traversal)
```

**Template:**

```csharp
using UnityEngine;
using NodeCanvas.Framework;
using ParadoxNotion.Design;

namespace NodeCanvas.BehaviourTrees
{
    [Category("MyProject")]
    [Description("Brief description")]
    public class MyLeafNode : BTNode
    {
        public BBParameter<float> Duration;
        private float _timer;

        protected override Status OnExecute(Component agent, IBlackboard blackboard)
        {
            _timer += Time.deltaTime;
            if (_timer >= Duration.value)
                return Status.Success;
            return Status.Running;
        }

        protected override void OnReset()
        {
            _timer = 0f;
        }
    }
}
```

---

### BTDecorator (Behaviour Tree Decorator)

Wraps a single child node, modifies its result or controls execution.

**Key:** Use `decoratedConnection.Execute(agent, blackboard)` to execute the child.

```csharp
using UnityEngine;
using NodeCanvas.Framework;
using ParadoxNotion.Design;

namespace NodeCanvas.BehaviourTrees
{
    [Category("Decorators")]
    [Description("Brief description")]
    public class MyDecorator : BTDecorator
    {
        protected override Status OnExecute(Component agent, IBlackboard blackboard)
        {
            status = decoratedConnection.Execute(agent, blackboard);

            if (status == Status.Success) return Status.Failure;
            if (status == Status.Failure) return Status.Success;
            return status;
        }
    }
}
```

---

### BTComposite (Behaviour Tree Composite)

Has multiple children. Controls execution order/logic (sequences, selectors, parallels).

**Key:** Iterate `outConnections` and call `.Execute()` on each.

```csharp
using UnityEngine;
using NodeCanvas.Framework;
using ParadoxNotion.Design;

namespace NodeCanvas.BehaviourTrees
{
    [Category("Composites")]
    [Description("Brief description")]
    public class MyComposite : BTComposite
    {
        private int _lastRunningIndex;

        protected override Status OnExecute(Component agent, IBlackboard blackboard)
        {
            for (int i = _lastRunningIndex; i < outConnections.Count; i++)
            {
                status = outConnections[i].Execute();
                if (status == Status.Running)
                {
                    _lastRunningIndex = i;
                    return Status.Running;
                }
                if (status == Status.Failure)
                    return Status.Failure;
            }
            return Status.Success;
        }

        protected override void OnReset()
        {
            _lastRunningIndex = 0;
        }
    }
}
```

---

### FSMState (Finite State Machine State)

Custom state node for FSM graphs.

**Lifecycle:**

```
OnInit()    → Once on first use
OnEnter()   → When state becomes active
OnUpdate()  → Every frame while active
OnExit()    → When leaving state
OnPause()   → When graph pauses
Finish()    → Call to signal state completion (triggers transitions)
```

**Template:**

```csharp
using UnityEngine;
using NodeCanvas.Framework;
using ParadoxNotion.Design;

namespace NodeCanvas.StateMachines
{
    [Category("MyProject")]
    [Description("Brief description")]
    public class MyState : FSMState
    {
        public BBParameter<float> Timeout;

        protected override void OnEnter()
        {
            // Entry logic
        }

        protected override void OnUpdate()
        {
            if (elapsedTime >= Timeout.value)
                Finish();
        }

        protected override void OnExit()
        {
            // Cleanup
        }
    }
}
```

---

## BBParameter — Blackboard Variable Binding

**Always prefer `BBParameter<T>` over raw fields** for any value that should be configurable from the NodeCanvas editor or linked to blackboard variables.

### Usage Rules

| Pattern | When to Use |
|---|---|
| `public BBParameter<T> MyVar;` | Default — editable, can link to blackboard |
| `[RequiredField] public BBParameter<T> MyVar;` | Must be set, shows warning if empty |
| `[BlackboardOnly] public BBParameter<T> MyVar;` | Must reference a blackboard variable, no manual input |
| `[RequiredField, BlackboardOnly] public BBParameter<T> MyVar;` | Must reference an existing blackboard variable |

### Accessing Values

```csharp
// READ the value
float val = _myFloatParam.value;

// WRITE the value (updates blackboard if linked)
_myFloatParam.value = 42f;
```

### The `info` Property

Override `info` to show a readable summary in the NodeCanvas editor:

```csharp
protected override string info => $"Set {TargetVar} = {SourceVar}";
```

BBParameter's `ToString()` returns the variable name if linked, or the literal value — use this in `info`.

### Generic Tasks with BBParameter

```csharp
[Category("Blackboard")]
public class SetVariableTask<T> : ActionTask
{
    [RequiredField, BlackboardOnly] public BBParameter<T> ValueA;
    public BBParameter<T> ValueB;

    protected override string info => ValueA + " = " + ValueB;

    protected override void OnExecute()
    {
        ValueA.value = ValueB.value;
        EndAction(true);
    }
}
```

---

## Blackboard API (Manual Access)

```csharp
// Get variable value
float hp = blackboard.GetVariableValue<float>("health");

// Set variable value
blackboard.SetVariableValue("health", hp - 10f);

// Add new variable at runtime
blackboard.AddVariable("score", typeof(int));

// Get typed variable reference
Variable<float> hpVar = blackboard.GetVariable<float>("health");
```

---

## Graph Events

### Sending from tasks:

```csharp
SendEvent("PlayerDied");
SendEvent<int>("DamageDealt", 50);
```

### Sending from external code:

```csharp
graphOwner.SendEvent("MyEvent");
graphOwner.SendEvent<float>("MyEvent", 1.2f);

// Global event to all graphs
GraphOwner.SendGlobalEvent("GlobalReset");
```

---

## FixedUpdate and OnGUI in Tasks

NodeCanvas tasks run in Update. For FixedUpdate or OnGUI, subscribe via `MonoManager`:

```csharp
using ParadoxNotion.Services;

public class PhysicsActionTask : ActionTask
{
    protected override void OnExecute()
    {
        MonoManager.current.onFixedUpdate += OnFixedUpdate;
    }

    private void OnFixedUpdate()
    {
        EndAction(true);
    }

    protected override void OnStop()
    {
        MonoManager.current.onFixedUpdate -= OnFixedUpdate;
    }
}
```

**Critical:** Always unsubscribe in `OnStop()` to prevent leaks.

---

## Easing — ParadoxNotion.Animation

Built-in easing system. **Prefer over DOTween** for movement and interpolation inside tasks — integrates natively with `elapsedTime` and `OnUpdate`, requires no cleanup, zero allocations.

### EaseType enum

`using ParadoxNotion.Animation;`

Available: `Linear`, `QuadraticIn/Out/InOut`, `CubicIn/Out/InOut`, `QuarticIn/Out/InOut`, `QuinticIn/Out/InOut`, `SinusoidalIn/Out/InOut`, `ExponentialIn/Out/InOut`, `CircularIn/Out/InOut`, `BounceIn/Out/InOut`, `ElasticIn/Out/InOut`, `BackIn/Out/InOut`.

Declare as raw public field (not `BBParameter`) — typically set at design time:

```csharp
public EaseType MoveEaseType = EaseType.QuadraticInOut;
```

### Easing.Ease API

```csharp
Vector3 value = Easing.Ease(easeType, from, to, t);
float value = Easing.Ease(easeType, fromFloat, toFloat, t);
```

- `t` is normalized time (0–1), typically `elapsedTime / duration`

### Usage pattern in ActionTask

```csharp
using NodeCanvas.Framework;
using ParadoxNotion.Animation;
using ParadoxNotion.Design;
using UnityEngine;

[Category("Movement")]
[Description("Moves agent to destination with easing")]
public sealed class EasedMoveTask : ActionTask<Transform>
{
    [RequiredField]
    public BBParameter<Vector3> Destination;

    public BBParameter<float> Duration = new BBParameter<float> { value = 1f };
    public EaseType MoveEaseType = EaseType.QuadraticInOut;

    private Vector3 _startPosition;

    protected override void OnExecute()
    {
        _startPosition = agent.position;
    }

    protected override void OnUpdate()
    {
        float t = elapsedTime / Duration.value;
        agent.position = Easing.Ease(MoveEaseType, _startPosition, Destination.value, t);

        if (elapsedTime < Duration.value)
            return;

        agent.position = Destination.value;
        EndAction(true);
    }
}
```

### Easing vs DOTween in tasks

| | ParadoxNotion Easing | DOTween |
|---|---|---|
| Lifecycle | Works with `elapsedTime` + `OnUpdate` natively | Parallel update, needs sync |
| Cleanup | None needed | Must `Kill()` tweens in `OnStop()` |
| Allocations | Zero | Lambdas for getters/setters/callbacks |
| Dependencies | Built into NodeCanvas | External package |
| Interruption | `OnUpdate` stops being called — done | Must explicitly kill tweens |

---

## Common Attributes

| Attribute | Purpose |
|---|---|
| `[Category("Path/SubPath")]` | Organize in NodeCanvas browser menu |
| `[Description("...")]` | Tooltip in editor |
| `[Icon("IconName")]` | Icon from Resources folder |
| `[RequiredField]` | Field must be assigned |
| `[BlackboardOnly]` | BBParameter must link to a blackboard variable |
| `[Name("Display Name")]` | Override field display name |

---

## Quality Checklist

- [ ] **EndAction called** — Every ActionTask code path leads to `EndAction(true/false)`
- [ ] **BBParameter for configurable values** — No raw public fields that should be blackboard-linked
- [ ] **`info` property defined** — Shows meaningful summary in the editor
- [ ] **Category attribute set** — Task appears in the correct menu section
- [ ] **Description attribute set** — Clear tooltip explaining purpose
- [ ] **OnStop cleanup** — Unsubscribe events, reset state, stop coroutines
- [ ] **OnReset for BT nodes** — Reset all mutable state (timers, counters, indices)
- [ ] **Typed agent if applicable** — Prefer generic `ActionTask<T>` / `ConditionTask<T>` when the task needs access to a component. The `agent` property auto-resolves via `GetComponent<T>()` on the behaviour owner, and can be overridden from the Blackboard — this makes the same task reusable for objects where the component lives on the prefab (auto-resolve) and objects where it must be provided externally (Blackboard override).
- [ ] **Namespace correct** — Tasks in `NodeCanvas.Tasks.Actions/Conditions`, BT in `NodeCanvas.BehaviourTrees`, FSM in `NodeCanvas.StateMachines`
- [ ] **No allocations in hot paths** — Avoid `new`, LINQ, string concatenation in `OnUpdate`/`OnExecute`/`OnCheck`
