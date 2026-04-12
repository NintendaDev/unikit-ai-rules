# NodeCanvas — ActionTask Reference

Quick-lookup for the AI agent. Each entry: **class name**, display name (if differs), agent type, and one-line purpose.

---

## Built-in Tasks (ParadoxNotion NodeCanvas)

### Animation (Legacy)

| Class | Agent | Purpose |
|-------|-------|---------|
| `PlayAnimationSimple` | `Animation` | Play an animation clip on legacy Animation component |
| `PlayAnimationAdvanced` | `Animation` | Play animation clip with layer, mix transform, and blend options |

### Animator

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `MecanimPlayAnimation` | Play Animation | `Animator` | Play Mecanim animation state by name and layer |
| `MecanimSetBool` | Set Parameter Bool | `Animator` | Set Animator bool parameter by name or hashID |
| `MecanimSetFloat` | Set Parameter Float | `Animator` | Set Animator float parameter |
| `MecanimSetInt` | Set Parameter Integer | `Animator` | Set Animator int parameter |
| `MecanimSetTrigger` | Set Parameter Trigger | `Animator` | Set Animator trigger parameter |
| `MecanimSetIK` | Set IK | `Animator` | Set IK goal target and weight |
| `MecanimSetLayerWeight` | Set Layer Weight | `Animator` | Set weight on an Animator layer |
| `MecanimSetLookAt` | Set Look At | `Animator` | Set Animator look-at target and weight |

### Application

| Class | Agent | Purpose |
|-------|-------|---------|
| `LoadScene` | agentless | Load a Unity scene by name with optional load mode |

### Audio

| Class | Agent | Purpose |
|-------|-------|---------|
| `PlayAudioAtPosition` | `Transform` | Play an AudioClip at agent's world position |

### Blackboard

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `SetBoolean` | — | agentless | Set a blackboard bool variable |
| `SetBooleanRandom` | — | agentless | Set a blackboard bool to random true/false |
| `SetFloat` | — | agentless | Set a blackboard float (supports math operations) |
| `SetFloatRandom` | — | agentless | Set a blackboard float to random value in [min, max] |
| `SetInt` | Set Integer | agentless | Set a blackboard int (supports math operations) |
| `SetIntRandom` | Set Integer Random | agentless | Set a blackboard int to random value in [min, max] |
| `SetEnum` | — | agentless | Set a blackboard enum variable |
| `SetEnumFlag` | — | agentless | Set or clear enum flag bits |
| `SetVector3` | — | agentless | Set a blackboard Vector3 |
| `SetVariable<T>` | — | agentless | Generic: set any blackboard variable |
| `TriggerBoolean` | — | agentless | Set bool to true for 1 frame, then back to false |
| `ComposeVector` | — | agentless | Create Vector3 from three floats |
| `DecomposeVector` | — | agentless | Split Vector3 into three float variables |
| `NormalizeVector` | — | agentless | Normalize a Vector3, optionally multiply |
| `GetSelf` | — | agentless | Save the agent's GameObject to blackboard |
| `GetToString` | Get Variable To String | agentless | Convert any variable to its string representation |
| `EvaluateCurve` | — | agentless | Lerp-evaluate an AnimationCurve between from/to over time |
| `SampleCurve` | — | agentless | Sample an AnimationCurve at a specific time |
| `GetOtherBlackboardVariable` | — | `Blackboard` | Read a variable from another blackboard by name |
| `SetOtherBlackboardVariable` | — | `Blackboard` | Write a variable on another blackboard by name |
| `SaveBlackboard` | — | `Blackboard` | Save blackboard state to PlayerPrefs key |
| `LoadBlackboard` | — | `Blackboard` | Load blackboard state from PlayerPrefs key |

### Blackboard / Dictionaries

| Class | Agent | Purpose |
|-------|-------|---------|
| `AddElementToDictionary<T>` | agentless | Add key-value pair to a Dictionary\<string, T\> |
| `GetDictionaryElement<T>` | agentless | Get value from dictionary by key |

### Blackboard / Lists

| Class | Agent | Purpose |
|-------|-------|---------|
| `AddElementToList<T>` | agentless | Add element to List\<T\> |
| `RemoveElementFromList<T>` | agentless | Remove element from List\<T\> |
| `InsertElementToList<T>` | agentless | Insert element at index in List\<T\> |
| `ClearList` | agentless | Clear all elements from a list |
| `ShuffleList` | agentless | Randomly shuffle list elements |
| `GetListCount` | agentless | Get list length and save to int variable |
| `PickListElement<T>` | agentless | Get element at index |
| `PickRandomListElement<T>` | agentless | Get random element from list |
| `SetListElement<T>` | agentless | Set element at index |
| `GetIndexOfElement<T>` | agentless | Find index of element in list |
| `GetCloserGameObjectInList` | `Transform` | Find closest GameObject to agent from a list |
| `SortGameObjectListByDistance` | `Transform` | Sort GameObject list by distance to agent (closest first) |

### Camera

| Class | Agent | Purpose |
|-------|-------|---------|
| `FadeIn` | agentless | Fade camera from black to clear over time |
| `FadeOut` | agentless | Fade camera from clear to black over time |

### Dialogue

| Class | Agent | Purpose |
|-------|-------|---------|
| `Say` | `IDialogueActor` | Show a dialogue statement. Supports inline `[varName]` substitution |
| `SayRandom` | `IDialogueActor` | Show a randomly chosen dialogue statement |
| `StartDialogueTree` | `IDialogueActor` | Start a DialogueTreeController with agent as instigator |

### GameObject

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `SetObjectActive` | Set Active | `Transform` | Enable/disable GameObject |
| `SetObjectEnabled` | Set Enabled | `MonoBehaviour` | Enable/disable a MonoBehaviour component |
| `SetObjectVisibility` | Set Visibility | `Renderer` | Show/hide Renderer |
| `DestroyGameObject` | — | `Transform` | Destroy the agent's GameObject |
| `InstantiateGameObject` | — | `Transform` | Instantiate a prefab at position/rotation |
| `CreateGameObject` | — | agentless | Create empty GameObject with name/position/rotation |
| `CreatePrimitive` | — | agentless | Create a primitive shape (cube, sphere, etc.) |
| `FindWithName` | — | agentless | Find GameObject by name |
| `FindWithTag` | — | agentless | Find first GameObject by tag |
| `FindAllWithName` | — | agentless | Find all GameObjects by name (slow) |
| `FindAllWithTag` | — | agentless | Find all GameObjects by tag |
| `FindAllWithLayer` | — | agentless | Find all GameObjects in layer mask |
| `FindClosestWithTag` | — | `Transform` | Find closest GameObject with tag to agent |
| `FindChildByName` | — | `Transform` | Find child transform by name |
| `FindObjectOfType<T>` | — | agentless | Find single component of type (slow) |
| `FindObjectsOfType<T>` | — | agentless | Find all components of type (slow) |
| `GetAllChildGameObjects` | — | `Transform` | Get all child GameObjects |
| `GetComponent<T>` | — | `Transform` | Get component of type on agent |
| `GetDistance` | — | `Transform` | Get distance to another GameObject |
| `GetGameObjectPosition` | — | `Transform` | Get agent's world position (obsolete — use Get Property) |
| `LookAt` | — | `Transform` | Rotate agent to look at target |
| `RemoveComponent<T>` | — | `Transform` | Remove component of type from agent |

### Input (Legacy)

| Class | Agent | Purpose |
|-------|-------|---------|
| `GetInputAxis` | agentless | Read legacy Input axes (horizontal/vertical) to Vector3 |
| `GetMousePosition` | agentless | Get current mouse position as Vector3 |
| `GetMouseScrollDelta` | agentless | Get mouse scroll wheel delta |
| `WaitMousePick` | agentless | Wait for mouse click on 3D collider, save hit info |
| `WaitMousePick2D` | agentless | Wait for mouse click on 2D collider, save hit info |

### Movement / Direct

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `MoveTowards` | — | `Transform` | Move toward target per frame (no pathfinding) |
| `MoveAway` | — | `Transform` | Move away from target per frame (no pathfinding) |
| `RotateTowards` | — | `Transform` | Rotate toward target per frame |
| `RotateAway` | — | `Transform` | Rotate away from target per frame |
| `InputMove` | — | `Transform` | Move + turn agent based on -1..1 input values |
| `CurveTransformTween` | Curve Tween | `Transform` | Tween transform using AnimationCurve |
| `EaseTransformTween` | Ease Tween | `Transform` | Tween transform using built-in easing |

### Movement / Pathfinding

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `MoveToGameObject` | Seek (GameObject) | `NavMeshAgent` | Navigate to target GameObject via NavMesh |
| `MoveToPosition` | Seek (Vector3) | `NavMeshAgent` | Navigate to world position via NavMesh |
| `Flee` | — | `NavMeshAgent` | Flee away from target via NavMesh |
| `Patrol` | — | `NavMeshAgent` | Patrol between waypoints (random or sequential) |
| `Wander` | — | `NavMeshAgent` | Wander randomly on NavMesh |
| `FindClosestEdge` | Find Closest NavMesh Edge | agentless | Find nearest NavMesh edge to a position |

### Physics

| Class | Agent | Purpose |
|-------|-------|---------|
| `GetLinecastInfo` | `Transform` | Linecast to target, save hit info (3D) |
| `GetLinecastInfo2D` | `Transform` | Linecast to target, save hit info (2D) |
| `GetLinecastInfo2DAll` | `Transform` | Linecast to target, save ALL hit info (2D) |
| `GetOverlapSphereObjects` | `Transform` | Get all GameObjects in sphere overlap around agent |

### Script Control (Reflected)

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `ExecuteFunction_Multiplatform` | Execute Function | reflected | Call any method on any component, save return value |
| `GetProperty_Multiplatform` | Get Property | reflected | Read any property, save to blackboard |
| `SetProperty_Multiplatform` | Set Property | reflected | Write any property from blackboard |
| `GetField` | Get Field | reflected | Read any field, save to blackboard |
| `SetField` | Set Field | reflected | Write any field from blackboard |
| `ImplementedAction_Multiplatform` | Implemented Action | reflected | Call method returning `Status` (Success/Failure/Running) |
| `SendMessage` | — | `Transform` | Unity SendMessage to agent |
| `SendMessage<T>` | — | `Transform` | Unity SendMessage with typed argument |
| `SendMessageToType<T>` | — | agentless | SendMessage to all objects with component of type (slow) |

### Script Control / Desktop Only (Faster)

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `ExecuteFunction` | Execute Function | reflected | JIT-only faster version of Execute Function |
| `GetProperty` | Get Property | reflected | JIT-only faster version of Get Property |
| `SetProperty` | Set Property | reflected | JIT-only faster version of Set Property |
| `ImplementedAction` | Implemented Action | reflected | JIT-only faster version of Implemented Action |

### Utility

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `Wait` | — | agentless | Wait for N seconds, then succeed |
| `RunForever` | — | agentless | Never-ending action (always Running) |
| `DebugLogText` | Debug Log | `Transform` | Log message + show UI label at agent position |
| `DebugBeep` | — | agentless | Play system beep sound (editor only) |
| `DebugDrawLine` | — | agentless | Draw debug line between two points |
| `ForceFinishGraph` | — | agentless | Immediately finish the current graph |
| `GraphOwnerControl` | Control Graph Owner | `GraphOwner` | Start / Resume / Pause / Stop a GraphOwner |
| `SwitchBehaviourTree` | — | `BehaviourTreeOwner` | Replace the active BehaviourTree on an owner |
| `SwitchFSM` | — | `FSMOwner` | Replace the active FSM on an owner |
| `SendEvent` | — | `GraphOwner` | Send named graph event (optionally global) |
| `SendEvent<T>` | — | `GraphOwner` | Send named graph event with typed value |
| `SendEventToObjects` | — | agentless | Send graph event to a list of GameObjects |
| `SendEventToObjects<T>` | — | agentless | Send graph event with value to a list of GameObjects |
| `ShoutEvent` | — | `Transform` | Broadcast event to all GraphOwners in radius over time |
| `InvokeSignal` | — | `Transform` | Invoke a SignalDefinition on agent (optionally global) |
