# Behavior Tree — Built-in Node Catalog

> **Base path:** `Engine/Source/Runtime/AIModule/Classes/BehaviorTree/`
> See also: [behavior-tree.md](../behavior-tree.md)

---

## Composites

| Node | Class | Execution logic | Key properties |
|------|-------|-----------------|----------------|
| Selector | `UBTComposite_Selector` | Tries children left-to-right; succeeds on the first child that succeeds, fails only when all children fail. "OR" logic. | `bShowPropertyDetails` |
| Sequence | `UBTComposite_Sequence` | Runs children left-to-right; succeeds only when all children succeed, fails on the first failure. "AND" logic. | — |
| Simple Parallel | `UBTComposite_SimpleParallel` | Runs a main task node and a full background subtree simultaneously. | `FinishMode`: `Immediate` (abort background when main finishes) / `Delayed` (wait for background to finish too) |

---

## Decorators

| Node | Class | Purpose | Key properties |
|------|-------|---------|----------------|
| Blackboard | `UBTDecorator_Blackboard` | Passes / aborts based on whether a blackboard key is set (has a valid value). | `BlackboardKey`, `NotifyObserver` (On Result Change / On Value Change), `ObserverAborts` |
| Compare BB Entries | `UBTDecorator_CompareBlackboardEntries` | Compares two blackboard keys with a chosen operator. | `BlackboardKeyA`, `BlackboardKeyB`, `Operator` (IsEqual, IsNotEqual, IsLess, IsLessOrEqual, IsGreater, IsGreaterOrEqual) |
| Conditional Loop | `UBTDecorator_ConditionalLoop` | Repeats the decorated branch while a blackboard condition is true. | `BlackboardKey` |
| Cone Check | `UBTDecorator_ConeCheck` | Passes if the target actor or vector is within a cone defined by two BB vectors and a half-angle. | `ConeHalfAngle`, `ConeOriginKey`, `ConeDirectionKey`, `ObservedKey` |
| Cooldown | `UBTDecorator_Cooldown` | Blocks the branch for a set duration after it runs. | `CooldownDuration` |
| Does Path Exist | `UBTDecorator_DoesPathExist` | Passes if a valid nav-mesh path exists between two BB keys. | `BlackboardKeyA`, `BlackboardKeyB`, `PathQueryType` (NavMesh / Hierarchical) |
| Force Success | `UBTDecorator_ForceSuccess` | Converts a child's result to Succeeded regardless of outcome. Useful for optional branches. | — |
| Is At Location | `UBTDecorator_IsAtLocation` | Checks if the AI is within `AcceptableRadius` of the BB location. | `BlackboardKey` (vector), `AcceptableRadius` |
| Is BB Entry Of Class | `UBTDecorator_IsBBEntryOfClass` | Passes if the BB Object key is an instance of the specified class. | `BlackboardKey`, `TestClass` |
| Keep In Cone | `UBTDecorator_KeepInCone` | Continuously aborts if the observed actor or vector exits the cone. | `ConeHalfAngle`, `ConeOriginKey`, `ObservedKey` |
| Loop | `UBTDecorator_Loop` | Repeats the decorated branch a fixed number of times (or infinitely). | `NumLoops`, `bInfiniteLoop` |
| Reached Move Goal | `UBTDecorator_ReachedMoveGoal` | Passes if the last MoveTo task finished within acceptable radius. | — |
| Set Tag Cooldown | `UBTDecorator_SetTagCooldown` | Sets a Gameplay Tag cooldown when the branch starts. | `CooldownTag`, `CooldownDuration`, `bAddToExistingDuration` |
| Tag Cooldown | `UBTDecorator_TagCooldown` | Passes if a Gameplay Tag cooldown is NOT active (i.e., branch can run). | `CooldownTag` |
| Time Limit | `UBTDecorator_TimeLimit` | Aborts the decorated branch if it runs longer than the specified time. | `TimeLimit` |

---

## Services

| Node | Class | Purpose | Key properties |
|------|-------|---------|----------------|
| Default Focus | `UBTService_DefaultFocus` | Sets the AIController's focus to a BB actor or location each tick. | `BlackboardKey`, `FocusPriority` |
| Run EQS Query | `UBTService_RunEQS` | Runs an Environment Query System query and writes the best result to a BB key. | `QueryTemplate`, `QueryConfig`, `EQSQueryBlackboardKey` |

---

## Tasks

| Node | Class | Purpose | Key properties |
|------|-------|---------|----------------|
| Finish With Result | `UBTTask_FinishWithResult` | Immediately completes with a chosen result. Useful for forcing a branch outcome. | `Result` (Succeeded / Failed / Aborted) |
| Make Noise | `UBTTask_MakeNoise` | Calls `MakeNoise()` so AI Perception can hear this pawn. | `Loudness` |
| Move Directly Toward | `UBTTask_MoveDirectlyToward` | Moves the AI straight toward a BB actor/vector without path-finding. | `BlackboardKey`, `AcceptableRadius`, `bProjectGoalLocation` |
| Move To | `UBTTask_MoveTo` | Moves the AI to a BB actor or vector using the nav-mesh. Latent task. | `BlackboardKey`, `AcceptableRadius`, `bReachTestIncludesAgentRadius`, `bTrackMovingGoal`, `ObservedBlackboardValueTolerance` |
| Play Animation | `UBTTask_PlayAnimation` | Plays an animation montage on the AI's mesh. | `AnimationToPlay`, `bLooping`, `bNonBlocking` |
| Play Sound | `UBTTask_PlaySound` | Plays a sound at the AI's location. | `SoundToPlay` |
| Rotate To Face BB Entry | `UBTTask_RotateToFaceBBEntry` | Rotates the AI in-place to face a BB actor or vector. Latent task. | `BlackboardKey`, `Precision` |
| Run Behavior | `UBTTask_RunBehavior` | Runs an external Behavior Tree asset as a subtask (must share the same Blackboard). | `BehaviorAsset` |
| Run Behavior Dynamic | `UBTTask_RunBehaviorDynamic` | Like Run Behavior but the subtree asset is selected at runtime via a BB or parameter. | `BehaviorDynamicAsset`, `InjectionTag` |
| Run EQS Query | `UBTTask_RunEQSQuery` | One-shot EQS query that writes the best result to a BB key, then finishes. | `QueryTemplate`, `QueryConfig`, `BlackboardKey` |
| Set Tag Cooldown | `UBTTask_SetTagCooldown` | Sets a Gameplay Tag cooldown, then immediately succeeds. | `CooldownTag`, `CooldownDuration`, `bAddToExistingDuration` |
| Stop Movement | `UBTTask_StopMovement` | Stops any active movement request on the AI. Finishes immediately. | — |
| Wait | `UBTTask_Wait` | Pauses execution for a set duration. Latent task. | `WaitTime`, `RandomDeviation` |
| Wait Blackboard Time | `UBTTask_WaitBlackboardTime` | Like Wait but reads the duration from a BB float key. | `BlackboardKey` |
