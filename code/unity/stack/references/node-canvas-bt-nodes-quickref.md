# NodeCanvas — BT Nodes Quick Reference

Most commonly needed BT nodes. If nothing fits — see `node-canvas-bt-nodes-full.md`.

Used in project: Sequencer, Selector, Repeater, Limiter, Merge, WaitUntil, ActionNode, ConditionNode.

---

## Composites (control flow, multiple children)

| Node | Purpose | Key Params |
|------|---------|------------|
| **Sequencer** | Run children in order; **Failure** on first fail, **Success** if all succeed (AND) | `dynamic`, `random` |
| **Selector** | Run children in order; **Success** on first success, **Failure** if all fail (OR) | `dynamic`, `random` |
| **Parallel** | Run **all** children simultaneously; finish based on policy | `policy` (FirstFailure / FirstSuccess / FirstSuccessOrFailure), `dynamic` |
| **Switch** | Run **one** child by int index or enum value | `intCase` / `enumCase`, `dynamic` |
| **ProbabilitySelector** | Pick child by weighted random chance | `childWeights`, `failChance` |

`dynamic` = re-evaluate every tick (interrupt running child if priority changes).
`random` = shuffle children order each reset.

## Decorators (wrap single child, modify behavior)

| Node | Purpose | Key Params |
|------|---------|------------|
| **Repeater** | Repeat child N times / until status / forever | `repeaterMode`, `repeatTimes` |
| **Limiter** | Allow child to run max N times (resets on graph restart) | `maxCount`, `limitedStatus` |
| **Conditional** | Execute child only if condition is true | `_condition`, `isDynamic`, `conditionFailReturn` |
| **WaitUntil** | Return Running until condition becomes true, then execute child | `_condition` |
| **Cooldown** | Block child re-execution for N seconds after it finishes | `coolDownTime` |
| **Timeout** | Interrupt child if Running longer than N seconds | `timeout`, `timeoutStatus` |
| **Merge** | Allow multiple parents to share one child branch | — |
| **Succeed** | Force child result to Success | — |
| **Fail** | Force child result to Failure | — |
| **Optional** | Child executes but result is ignored by parent | — |

## Leafs (no children, do actual work)

| Node | Purpose |
|------|---------|
| **ActionNode** | Execute an `ActionTask` (see tasks reference) |
| **ConditionNode** | Check a `ConditionTask`, return Success/Failure instantly |
| **SubTree** | Execute a sub-BehaviourTree, return its root status |
| **Sub FSM** | Execute a sub-FSM; optionally map states to Success/Failure |
| **Sub Dialogue** | Execute a sub-DialogueTree; Running until finished |
