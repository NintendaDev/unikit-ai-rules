# NodeCanvas — ConditionTask Quick Reference

Most commonly needed conditions. If nothing fits — see `node-canvas-conditions-full.md`.

> No custom project ConditionTasks exist yet — all below are built-in.

---

## Blackboard — Variable Checks

| Class | Purpose |
|-------|---------|
| `CheckBoolean` | Compare two bool values |
| `CheckBooleanTrigger` | Check if bool is true, then immediately reset to false |
| `CheckFloat` | Compare float against value (>, <, ==, etc.) |
| `CheckInt` | Compare int against value |
| `CheckString` | Compare two strings |
| `CheckEnum` | Compare two enum values |
| `CheckNull` | Check if variable is null |
| `CheckVariable<T>` | Generic: compare any two variables of same type |
| `BBVariableChanged` | Returns true when a blackboard variable changes value |

## Blackboard — Collections

| Class | Purpose |
|-------|---------|
| `ListContainsElement<T>` | Check if list contains element |
| `ListIsEmpty` | Check if list is empty |
| `TryGetValue<T>` | Try get value from dictionary by key; true if found |

## GameObject

| Class | Display Name | Purpose |
|-------|-------------|---------|
| `IsActive` | — | Check if GameObject is active |
| `HasComponent<T>` | — | Check if agent has component of type |
| `CheckDistanceToGameObject` | Target Within Distance | Compare distance to target (3D) |
| `CanSeeTarget` | — | Combined LOS + view angle check (3D) |
| `CheckLOS` | Target In Line Of Sight | Linecast visibility check (3D) |
| `IsInFront` | Target In View Angle | Check if target within view angle (3D) |

## Events & Signals

| Class | Purpose |
|-------|---------|
| `CheckEvent` | Returns true for 1 frame when named graph event received |
| `CheckEvent<T>` | Same + saves event value |
| `CheckSignal` | Check for invoked SignalDefinition on agent (or global) |

## Script Control (Reflected)

| Class | Display Name | Purpose |
|-------|-------------|---------|
| `CheckFunction_Multiplatform` | Check Function | Call method, compare return value |
| `CheckProperty_Multiplatform` | Check Property | Read property, compare against value |
| `CheckField` | Check Field | Compare component field against value |
| `CheckCSharpEvent` | — | Subscribe to C# `event Action`; true when raised |
| `CheckUnityEvent` | — | Subscribe to UnityEvent; true when raised |

## Physics & Collisions

| Class | Purpose |
|-------|---------|
| `CheckCollision` | Detect collision Enter/Stay/Exit; optional tag filter |
| `CheckTrigger` | Detect trigger Enter/Stay/Exit; optional tag filter |

## Utility

| Class | Purpose |
|-------|---------|
| `Probability` | Roll chance once on enable (0..1); returns true/false |
| `Timeout` | False while counting down, true after N seconds |
| `CheckStateStatus` | Check parent FSM state status |
| `DebugCondition` | Always true (invert for false) — debugging |
