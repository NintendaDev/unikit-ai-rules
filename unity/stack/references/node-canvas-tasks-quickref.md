# NodeCanvas — ActionTask Quick Reference

Most commonly needed tasks. If nothing fits — see `node-canvas-tasks-full.md`.

---

## Custom Project Tasks (always check first)

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `MoveWithBobTask` | Move With Bob | `Transform` | Move to destination with vertical bobbing (sine wave + exponential fadeout). Params: `Destination`, `MoveSpeed`, `BobAmplitude`, `BobFrequency`, `BobFadeOutK` |
| `MoveToPointTask` | Move To Point | `Transform` | Move to position with easing. World/local coords, ping-pong mode. Params: `TargetPosition`, `Duration` |
| `CustomerOfferDialogueTask` | Customer Offer Dialogue | agentless | Run customer offer dialogue. Params: `Offer` (First/Second), `Price` (int) |
| `CustomerFarewellsDialogueTask` | Customer Farewell Dialogue | agentless | Run farewell dialogue. Params: `Farewell` (Positive/Negative) |

---

## Flow Control

| Class | Purpose |
|-------|---------|
| `Wait` | Pause for N seconds |
| `RunForever` | Never-ending action (always Running) |
| `ForceFinishGraph` | Immediately finish current graph |

## Blackboard — Variables

| Class | Purpose |
|-------|---------|
| `SetBoolean` | Set bool variable |
| `SetFloat` | Set float (supports +, -, *, / operations) |
| `SetInt` | Set int (supports +, -, *, / operations) |
| `SetEnum` | Set enum variable |
| `SetVariable<T>` | Generic: set any variable |
| `SetVector3` | Set Vector3 variable |
| `TriggerBoolean` | Set bool to true for 1 frame, then reset |
| `ComposeVector` | Create Vector3 from 3 floats |
| `DecomposeVector` | Split Vector3 into 3 floats |

## Blackboard — Lists

| Class | Purpose |
|-------|---------|
| `AddElementToList<T>` | Add element to list |
| `RemoveElementFromList<T>` | Remove element from list |
| `PickListElement<T>` | Get element at index |
| `PickRandomListElement<T>` | Get random element |
| `GetListCount` | Get list length |
| `ClearList` | Clear all elements |

## Dialogue

| Class | Purpose |
|-------|---------|
| `Say` | Show dialogue statement (supports `[varName]` substitution) |
| `SayRandom` | Show random dialogue statement |
| `StartDialogueTree` | Start a DialogueTreeController |

## GameObject

| Class | Purpose |
|-------|---------|
| `SetObjectActive` | Enable/disable GameObject |
| `SetObjectEnabled` | Enable/disable MonoBehaviour |
| `InstantiateGameObject` | Instantiate prefab |
| `DestroyGameObject` | Destroy agent's GameObject |
| `FindWithTag` | Find first GameObject by tag |
| `FindChildByName` | Find child transform by name |
| `GetComponent<T>` | Get component on agent |
| `GetDistance` | Get distance to target |

## Movement — Direct (no pathfinding)

| Class | Purpose |
|-------|---------|
| `MoveTowards` | Move toward target per frame |
| `MoveAway` | Move away from target per frame |
| `RotateTowards` | Rotate toward target per frame |

## Movement — Pathfinding (NavMesh)

| Class | Display Name | Purpose |
|-------|-------------|---------|
| `MoveToGameObject` | Seek (GameObject) | Navigate to target via NavMesh |
| `MoveToPosition` | Seek (Vector3) | Navigate to position via NavMesh |
| `Patrol` | Patrol | Patrol between waypoints |
| `Wander` | Wander | Wander randomly on NavMesh |

## Script Control (Reflected)

| Class | Display Name | Purpose |
|-------|-------------|---------|
| `ExecuteFunction_Multiplatform` | Execute Function | Call any method on any component |
| `GetProperty_Multiplatform` | Get Property | Read any property to blackboard |
| `SetProperty_Multiplatform` | Set Property | Write any property from blackboard |
| `ImplementedAction_Multiplatform` | Implemented Action | Call method returning `Status` |

## Utility — Events & Signals

| Class | Purpose |
|-------|---------|
| `SendEvent` | Send named graph event (optionally global) |
| `InvokeSignal` | Invoke a SignalDefinition on agent |
| `GraphOwnerControl` | Start / Resume / Pause / Stop a GraphOwner |

## Debug

| Class | Purpose |
|-------|---------|
| `DebugLogText` | Log message + UI label at agent position |
