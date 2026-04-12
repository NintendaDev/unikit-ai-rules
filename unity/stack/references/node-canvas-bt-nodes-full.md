# NodeCanvas — Behaviour Tree Nodes (Full Reference)

Complete reference of all BT node types: Composites, Decorators, Leafs.

---

## Composites

Composite nodes have multiple children and define the control flow strategy.

### Sequencer

**Display:** `SEQUENCER` | **Priority:** 10 (top of list)

Executes children in order. Returns **Success** if all succeed. Returns **Failure** on first child failure.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `dynamic` | bool | false | Re-evaluate higher-priority children every tick; interrupt lower ones if a higher child fails |
| `random` | bool | false | Shuffle children order on each reset |

**Behavior:** Non-dynamic starts from last running child. Dynamic always starts from index 0.

---

### Selector

**Display:** `SELECTOR` | **Priority:** 9

Executes children in order. Returns **Success** on first child success. Returns **Failure** if all children fail (fallback/OR logic).

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `dynamic` | bool | false | Re-evaluate higher-priority children every tick; interrupt lower ones if a higher child succeeds |
| `random` | bool | false | Shuffle children order on each reset |

**Behavior:** Non-dynamic starts from last running child. Dynamic always starts from index 0.

---

### Parallel

**Display:** `PARALLEL` | **Priority:** 8

Executes **all** children simultaneously every tick.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `policy` | ParallelPolicy | FirstFailure | `FirstFailure` / `FirstSuccess` / `FirstSuccessOrFailure` — when to stop |
| `dynamic` | bool | false | If true (displayed as "Repeat"), re-execute finished children until policy is met |

**Policies:**
- **FirstFailure** — returns Failure when any child fails; Success when all succeed
- **FirstSuccess** — returns Success when any child succeeds; Failure when all fail
- **FirstSuccessOrFailure** — returns as soon as any child finishes (non-Running)

When policy is met, all still-Running children are reset.

---

### Switch

Executes **one** child based on int index or enum value. Useful for state-like branching.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `dynamic` | bool | false | Re-evaluate case every tick; interrupt running child if case changed |
| `selectionMode` | CaseSelectionMode | IndexBased | `IndexBased` / `EnumBased` |
| `intCase` | BBParameter\<int\> | — | Child index (IndexBased mode) |
| `enumCase` | BBObjectParameter (Enum) | — | Enum value to match (EnumBased mode) |
| `outOfRangeMode` | OutOfRangeMode | LoopIndex | `ReturnFailure` / `LoopIndex` (wraps via modulo) |

---

### ProbabilitySelector

Selects a child based on **weighted random** chance.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `childWeights` | List\<BBParameter\<float\>\> | 1 per child | Weight for each child |
| `failChance` | BBParameter\<float\> | 0 | Direct chance for immediate Failure |

**Behavior:** Rolls once on entry. If selected child fails, removes its weight and re-rolls. Returns Failure when all children fail. Editor shows percentages.

---

### PrioritySelector (Utility AI)

Executes the child with the **highest utility score**. Falls through on failure like a Selector.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `dynamic` | bool | false | Re-evaluate utility every tick; switch to highest immediately |
| `desires` | List\<Desire\> | — | One Desire per child, each with multiple Considerations |

**Consideration:** `input` (float) mapped through optional `AnimationCurve` within `[inputMin, inputMax]` range.
**Compound utility:** `Average` / `Min` / `Max` of all considerations in a Desire.

---

### StepIterator (Step Sequencer)

**Display:** `STEP SEQUENCER`

Executes **one child per tick** in round-robin order. Returns that child's status each time. Advances to next child on reset.

No configurable params.

---

### BinarySelector

Quick **if/else** branching based on a ConditionTask. Exactly 2 children: TRUE (left) and FALSE (right).

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `dynamic` | bool | false | Re-evaluate condition every tick |
| `_condition` | ConditionTask | — | The branching condition |

---

## Decorators

Decorator nodes wrap a single child and modify its execution or result.

### Repeater (Repeat)

**Display:** Repeat

Repeats child execution according to the selected mode.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `repeaterMode` | RepeaterMode | RepeatTimes | `RepeatTimes` / `RepeatUntil` / `RepeatForever` |
| `repeatTimes` | BBParameter\<int\> | 1 | Times to repeat (RepeatTimes mode) |
| `repeatUntilStatus` | BooleanStatus | Success | Stop when child returns this status (RepeatUntil mode) |

Resets child between iterations. RepeatForever always returns Running.

---

### ConditionalEvaluator (Conditional)

**Display:** Conditional

Executes child only if condition is true. Returns configurable status if condition is/becomes false.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `isDynamic` | bool | false | Re-evaluate condition every tick; interrupt child if false |
| `conditionFailReturn` | FinalStatus | Failure | Status returned when condition is false |
| `_condition` | ConditionTask | — | The condition to evaluate |

Non-dynamic: checks once on entry. Dynamic: checks every tick, interrupts child if false.

---

### Limiter (Limit)

**Display:** Limit

Limits child execution to a maximum number of times (resets on graph restart).

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `maxCount` | BBParameter\<int\> | 1 | Max executions allowed |
| `policy` | BehaviourPolicy | OnSuccessOrFailure | When to increment counter: `OnSuccess` / `OnFailure` / `OnSuccessOrFailure` |
| `limitedStatus` | FinalStatus | Optional | Status returned when limit reached |

---

### WaitUntil

Returns **Running** until condition becomes true, then executes child and returns its status.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `_condition` | ConditionTask | — | The condition to wait for |

Without child: acts as a leaf (Success when true, Running otherwise). Without condition: passthrough to child.

---

### Cooldown

Prevents child re-execution for a time period after it finishes.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `coolDownTime` | BBParameter\<float\> | 5 | Cooldown period in seconds |
| `coolingStatus` | FinalStatus | Optional | Status returned while cooling down |

Shows progress bar in editor.

---

### Timeout

Interrupts child if it stays Running too long.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `timeout` | BBParameter\<float\> | 1 | Max time in seconds |
| `timeoutStatus` | FinalStatus | Failure | Status returned on timeout |

If child finishes before timeout, returns child status. Shows progress bar in editor.

---

### Iterator (Iterate)

Iterates a list, executing child once per element.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `targetList` | BBParameter\<IList\> | — | List to iterate (required) |
| `current` | BBObjectParameter | — | Stores current element (blackboard) |
| `storeIndex` | BBParameter\<int\> | — | Stores current index (blackboard) |
| `terminationCondition` | TerminationConditions | None | `None` / `FirstSuccess` / `FirstFailure` |
| `maxIteration` | BBParameter\<int\> | -1 | Max iterations (-1 = whole list) |
| `resetIndex` | bool | true | Reset index on node reset |

Resets child between iterations. If child returns Running, pauses at current index.

---

### Monitor

Watches child's return status and fires an action when a specific status is detected.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `monitorMode` | BehaviourPolicy | — | Watch for `OnSuccess` / `OnFailure` / `OnSuccessOrFailure` |
| `returnMode` | ReturnStatusMode | — | Return `OriginalDecoratedChildStatus` or `NewDecoratorActionStatus` |
| `_action` | ActionTask | — | Action to execute when monitored status is detected |

---

### Guard

Prevents child execution if another Guard with the same token is already running.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `token` | BBParameter\<GuardToken\> | — | Shared guard token variable (blackboard) |
| `guardedStatus` | GuardMode | Failure | `Failure` / `Success` / `Optional` / `RunningUntilReleased` |

Token scope depends on blackboard scope (graph, gameobject, or global).

---

### Setter (Override Agent)

**Display:** Override Agent

Sets a different agent for the entire branch below this decorator.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `revertToOriginal` | bool | false | If true, reverts to original graph agent |
| `newAgent` | BBParameter\<GameObject\> | — | New agent to use (shown when revertToOriginal is false) |

---

### Merge

Allows **multiple parents** to connect to the same child branch. No configurable params.

Accepts unlimited incoming connections (`maxInConnections = -1`). Simply passes through to child.

---

### Succeed

**Display:** Succeed | **Priority:** -1

Forces child result to **Success** (unless child is Running).

---

### Fail

**Display:** Fail | **Priority:** -2

Forces child result to **Failure** (unless child is Running).

---

### Optional

**Display:** Optional | **Priority:** -3

Forces child result to **Optional** status (parent composite ignores this child's result). Same effect as disabling the node, but child still executes.

---

## Leafs

Leaf nodes have no children and perform actual work.

### ActionNode

**Display:** ACTION

Executes an assigned `ActionTask`. Returns the task's status (Running/Success/Failure). Returns Optional if no action assigned.

### ConditionNode

**Display:** CONDITION

Checks an assigned `ConditionTask`. Returns **Success** if true, **Failure** if false. Never returns Running (instantaneous). Returns Optional if no condition assigned.

### SubTree (Sub Tree)

Executes a sub `BehaviourTree`. Returns the sub-tree's root node status directly.

### NestedFSM (Sub FSM)

Executes a sub `FSM`. Returns Running while FSM is active. Optionally maps specific FSM states to Success/Failure return.

### NestedDT (Sub Dialogue)

Executes a sub `DialogueTree`. Returns Running while dialogue is active. Returns Success/Failure based on Finish node in the dialogue.
