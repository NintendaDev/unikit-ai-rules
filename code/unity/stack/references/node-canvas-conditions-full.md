# NodeCanvas — ConditionTask Reference

Quick-lookup for the AI agent. Each entry: **class name**, display name (if differs), agent type, and one-line purpose.

> No custom project ConditionTasks exist — all conditions below are built-in (ParadoxNotion NodeCanvas).

---

## Animator

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `MecanimCheckBool` | Check Parameter Bool | `Animator` | Check if Animator bool parameter equals value |
| `MecanimCheckFloat` | Check Parameter Float | `Animator` | Compare Animator float parameter against value |
| `MecanimCheckInt` | Check Parameter Int | `Animator` | Compare Animator int parameter against value |
| `MecanimIsInTransition` | Is In Transition | `Animator` | Check if Animator layer is currently in transition |

## Blackboard

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `CheckBoolean` | — | agentless | Compare two blackboard bool values |
| `CheckBooleanTrigger` | — | agentless | Check if bool is true, then immediately reset to false (one-shot) |
| `CheckFloat` | — | agentless | Compare blackboard float against value (supports >, <, ==, etc.) |
| `CheckInt` | — | agentless | Compare blackboard int against value |
| `CheckString` | — | agentless | Compare two blackboard strings for equality |
| `CheckEnum` | — | agentless | Compare two blackboard enum values |
| `CheckEnumFlag` | — | agentless | Check if specific enum flag bits are set |
| `CheckNull` | — | agentless | Check if a blackboard variable is null |
| `CheckVariable<T>` | — | agentless | Generic: compare any two blackboard variables of same type |
| `CheckVariableOther<T>` | — | `IBlackboard` | Check variable value on another Blackboard by name |
| `CheckVectorDistance` | — | agentless | Compare distance between two Vector3 values |
| `StringContains` | — | agentless | Check if a string contains a substring |
| `BBVariableChanged` | On Variable Changed | agentless | Returns true when the watched blackboard variable changes |
| `CheckUnityObject` | — | agentless | *(Obsolete)* Compare UnityObjects — use `CheckVariable<T>` instead |

## Blackboard / Dictionaries

| Class | Agent | Purpose |
|-------|-------|---------|
| `TryGetValue<T>` | agentless | Try get value from Dictionary\<string, T\> by key; true if found, saves value |

## Blackboard / Lists

| Class | Agent | Purpose |
|-------|-------|---------|
| `ListContainsElement<T>` | agentless | Check if List\<T\> contains a specific element |
| `ListIsEmpty` | agentless | Check if a list has zero elements |

## GameObject

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `IsActive` | — | `Transform` | Check if agent's GameObject is active |
| `HasComponent<T>` | — | `Transform` | Check if agent has a component of type T |
| `IsInFront` | Target In View Angle | `Transform` | Check if target is within agent's view angle (3D) |
| `IsInFront2D` | Target In View Angle 2D | `Transform` | Check if target is within agent's view angle (2D) |
| `IsWithinLayerMask` | — | `Transform` | Check if agent's layer is in a LayerMask |
| `CheckSpeed` | — | `Rigidbody` | Compare agent's Rigidbody velocity speed against value |
| `CheckDistanceToGameObject` | Target Within Distance | `Transform` | Compare distance to single target (3D) |
| `CheckDistanceToGameObject2D` | Target Within Distance 2D | `Transform` | Compare distance to single target (2D) |
| `CheckDistanceToGameObjectAny` | Any Target Within Distance | `Transform` | Check distance to any target in list; saves closest and all matches (3D) |
| `CheckDistanceToGameObjectAny2D` | Any Target Within Distance 2D | `Transform` | Same as above for 2D |
| `CheckLOS` | Target In Line Of Sight | `Transform` | Linecast check — is target visible? Saves distance (3D) |
| `CheckLOS2D` | Target In Line Of Sight 2D | `Transform` | Linecast check — is target visible? Saves distance (2D) |
| `CanSeeTarget` | — | `Transform` | Combined LOS + view angle check (3D). Params: `maxDistance`, `viewAngle`, `awarnessDistance` |
| `CanSeeTarget2D` | — | `Transform` | Combined LOS + view angle check (2D) |
| `CanSeeTargetAny` | — | `Transform` | Check visibility of any target in list; saves all visible + closest (3D) |
| `CanSeeTargetAny2D` | — | `Transform` | Same as above for 2D |

## Input (Legacy)

| Class | Agent | Purpose |
|-------|-------|---------|
| `CheckButtonInput` | agentless | Check legacy Input button state (down/pressed/up) |
| `CheckKeyboardInput` | agentless | Check specific key state (down/pressed/up) |
| `CheckMousePick` | agentless | Check mouse click on 3D collider; saves hit info |
| `CheckMousePick2D` | agentless | Check mouse click on 2D collider; saves hit info |

## Movement

| Class | Agent | Purpose |
|-------|-------|---------|
| `PathExists` | `NavMeshAgent` | Check if a valid NavMesh path exists to target position; optionally saves path |

## Script Control (Reflected)

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `CheckField` | Check Field | reflected | Compare a component field against a value |
| `CheckFunction_Multiplatform` | Check Function | reflected | Call a method, compare return value (cross-platform) |
| `CheckProperty_Multiplatform` | Check Property | reflected | Read a property, compare against value (cross-platform) |

### Script Control / Desktop Only (Faster)

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `CheckFunction` | Check Function | reflected | JIT-only faster version of Check Function |
| `CheckProperty` | Check Property | reflected | JIT-only faster version of Check Property |

### Script Control / Events

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `CheckCSharpEvent` | — | reflected | Subscribe to C# `event Action`; returns true when raised |
| `CheckCSharpEvent<T>` | — | reflected | Subscribe to `event Action<T>`; returns true when raised, saves value |
| `CheckCSharpEventValue<T>` | — | reflected | Subscribe to `event Action<T>`; returns true only when raised with matching value |
| `CheckUnityEvent` | — | reflected | Subscribe to UnityEvent; returns true when raised |
| `CheckUnityEvent<T>` | — | reflected | Subscribe to UnityEvent\<T\>; returns true when raised, saves value |
| `CheckUnityEventValue<T>` | — | reflected | Subscribe to UnityEvent\<T\>; returns true only when raised with matching value |

## System Events

| Class | Display Name | Agent | Purpose |
|-------|-------------|-------|---------|
| `CheckCollision` | Check Collision | `Rigidbody` | Detect collision events (Enter/Stay/Exit); optionally filter by tag. Saves hit info |
| `CheckCollision2D` | Check Collision 2D | `Rigidbody2D` | Same as above for 2D physics |
| `CheckTrigger` | Check Trigger | `Transform` | Detect trigger events (Enter/Stay/Exit); optionally filter by tag. Works with Collider or Rigidbody |
| `CheckTrigger2D` | Check Trigger 2D | `Transform` | Same as above for 2D physics |
| `CheckMouse` | — | `Collider` | Detect mouse interaction (Enter/Over/Exit/Down/Up/Drag) on 3D collider |
| `CheckMouse2D` | Check Mouse 2D | `Collider2D` | Same as above for 2D |
| `CheckMouseClick` | — | `Collider` | Detect mouse click (Down/Pressed/Up) on 3D collider |
| `CheckMouseClick2D` | Check Mouse Click 2D | `Collider2D` | Same as above for 2D |

## UGUI

| Class | Agent | Purpose |
|-------|-------|---------|
| `ButtonClicked` | agentless | Returns true when a UI Button is clicked |
| `InterceptEvent` | `Transform` | Returns true when a specified EventTrigger event fires on agent (works for UI and 3D objects) |

## Utility

| Class | Agent | Purpose |
|-------|-------|---------|
| `CheckEvent` | `GraphOwner` | Returns true for one frame when a named graph event is received |
| `CheckEvent<T>` | `GraphOwner` | Same as above, also saves the event's typed value |
| `CheckEventValue<T>` | `GraphOwner` | Returns true only when event is received AND value matches |
| `CheckSignal` | `Transform` | Check for an invoked SignalDefinition on agent (or global) |
| `CheckStateStatus` | agentless | Check parent FSM state status (FSM only) |
| `Probability` | agentless | Roll probability once on enable; returns true/false based on chance (0..1) |
| `Timeout` | agentless | Returns false while counting down, true after N seconds elapsed |
| `DebugCondition` | agentless | Always returns true (invert to get false) — for debugging |
