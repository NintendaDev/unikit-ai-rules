---
version: 1.0.0
---

# Enhanced Input System

> **Scope**: Enhanced Input plugin patterns in UE5 — InputAction and InputMappingContext setup, Modifiers and Triggers, UEnhancedInputLocalPlayerSubsystem context management, C++ binding via UEnhancedInputComponent, value extraction from FInputActionValue, runtime context switching, asset organization, and naming conventions.
> **Load when**: setting up player input, creating InputActions or InputMappingContexts, binding actions in C++, switching input contexts at runtime, implementing custom Triggers or Modifiers, migrating from legacy input system, debugging input not firing, designing multi-context input schemes.

---

## Module Setup

Add to your module's `Build.cs`:

```csharp
PublicDependencyModuleNames.AddRange(new string[]
{
    "EnhancedInput",
    "InputCore"
});
```

**Project Settings** (required, one-time setup):
- *Engine → Input → Default Player Input Class* → `EnhancedPlayerInput`
- *Engine → Input → Default Input Component Class* → `EnhancedInputComponent`

The Enhanced Input plugin is enabled by default in UE5 projects — verify under *Edit → Plugins → Input → Enhanced Input*.

---

## Core Concepts

The system has three layers:

| Layer | Class | Role |
|-------|-------|------|
| Input Action | `UInputAction` | Data asset defining **what** action occurs (value type + Triggers + Modifiers) |
| Input Mapping Context | `UInputMappingContext` | Data asset mapping **which keys** fire which actions, with per-key Modifiers/Triggers |
| Subsystem | `UEnhancedInputLocalPlayerSubsystem` | Runtime controller managing the active set of mapping contexts |

---

## Input Actions

`UInputAction` is a data asset. Its most important property is **Value Type**:

| Value Type | C++ type | When to use |
|------------|----------|-------------|
| `Digital` (bool) | `bool` | Buttons, toggle inputs |
| `Axis1D` (float) | `float` | Scroll wheel, pressure, throttle |
| `Axis2D` (Vector2D) | `FVector2D` | WASD movement, analog sticks, mouse delta |
| `Axis3D` (Vector) | `FVector` | VR controllers, 6DOF input |

Other key properties:
- **Consume Input** — when active at a higher-priority context, blocks the same physical key in lower-priority contexts.
- **Trigger When Paused** — allows the action to fire even when the game is paused.
- **Triggers array** — attach `UInputTrigger` objects to gate when the action fires.
- **Modifiers array** — attach `UInputModifier` objects to transform the raw input value.

---

## Input Mapping Context

`UInputMappingContext` is a data asset containing a **Mappings** array. Each entry pairs a `UInputAction` with a physical key and optional per-mapping Triggers/Modifiers.

### Priority System

Higher numeric priority is processed first. If the winning context's action has **Consume Input** enabled, the same key is blocked from lower-priority contexts.

Typical layering:

| Priority | Context | Description |
|----------|---------|-------------|
| `0` | `IMC_Default` | Always-active base controls |
| `1` | `IMC_Gameplay` | Character movement and abilities |
| `2` | `IMC_UI` | Menu and HUD interactions — blocks gameplay input while active |
| `3` | `IMC_Vehicle` | Added/removed when entering/leaving a vehicle |

---

## ETriggerEvent

`ETriggerEvent` determines **which moment** in the action's lifecycle fires a C++ callback:

| Event | When it fires |
|-------|--------------|
| `Started` | First frame the trigger requirements are satisfied |
| `Ongoing` | Every frame while trigger requirements remain satisfied |
| `Triggered` | Requirements fully met (default single-frame event for most triggers) |
| `Completed` | First frame after transitioning out of Triggered/Ongoing |
| `Canceled` | Trigger interrupted before completing (e.g., Tap key held too long) |

Use `ETriggerEvent::Started` for one-shot button presses (Jump, Fire). Use `ETriggerEvent::Triggered` for continuous axis inputs (Move, Look).

---

## Built-in Input Triggers

Add triggers to an `UInputAction` or to a specific key mapping in an `UInputMappingContext`:

| Trigger class | Behavior |
|---------------|---------|
| `UInputTriggerDown` | Fires while input is past the actuation threshold |
| `UInputTriggerPressed` | Fires once when input crosses the threshold downward |
| `UInputTriggerReleased` | Fires once when input drops below the threshold |
| `UInputTriggerHold` | Fires after the key is held for `HoldTimeThreshold` seconds |
| `UInputTriggerHoldAndRelease` | Fires when the key is released after being held for the required duration |
| `UInputTriggerTap` | Fires if pressed and released within `TapReleaseTimeThreshold` seconds |
| `UInputTriggerPulse` | Fires at fixed intervals while the key is held |
| `UInputTriggerChordedAction` | Fires only while another specified `UInputAction` is active |
| `UInputTriggerCombo` | Fires after a sequence of actions is completed within a time window |

**Custom triggers**: subclass `UInputTrigger`, override `GetTriggerType_Implementation()` and `UpdateState_Implementation()` (returns `ETriggerState`).

---

## Built-in Input Modifiers

Modifiers transform raw input values. They are applied in array order — order matters:

| Modifier class | Effect |
|----------------|--------|
| `UInputModifierNegate` | Inverts the sign of each axis (`1.0 → -1.0`) |
| `UInputModifierSwizzleAxis` | Reorders axes (e.g., `YXZ` to map WASD W-key output to Vector2D's Y) |
| `UInputModifierDeadZone` | Clamps gamepad stick values below a threshold to zero |
| `UInputModifierScalar` | Multiplies the value by a configurable scalar |
| `UInputModifierSmooth` | Smooths input over time using a moving average |
| `UInputModifierFOVScaling` | Scales input by the camera's field of view |
| `UInputModifierResponseCurveExponential` | Applies an exponential response curve per axis |
| `UInputModifierSmoothDelta` | Smooths delta values (useful for mouse look) |

**WASD pattern**: W → `Swizzle(YXZ)`, A → `Negate`, S → `Negate + Swizzle(YXZ)`, D → no modifier. This maps all four keys to a single `Axis2D` action.

**Custom modifiers**: subclass `UInputModifier`, override `ModifyRaw_Implementation(const UEnhancedPlayerInput*, FInputActionValue, float)`.

---

## C++ Setup Pattern

### Header declarations

```cpp
// MyCharacter.h
#pragma once
#include "InputActionValue.h"

class UInputMappingContext;
class UInputAction;

UCLASS()
class AMyCharacter : public ACharacter
{
    GENERATED_BODY()

protected:
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputMappingContext> DefaultMappingContext;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> JumpAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> MoveAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> LookAction;

    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

    void HandleMove(const FInputActionValue& Value);
    void HandleLook(const FInputActionValue& Value);
};
```

### SetupPlayerInputComponent

```cpp
// MyCharacter.cpp
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"

void AMyCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    // 1 — Add mapping context via the subsystem
    if (const APlayerController* PC = Cast<APlayerController>(GetController()))
    {
        if (UEnhancedInputLocalPlayerSubsystem* Subsystem =
            ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
        {
            Subsystem->AddMappingContext(DefaultMappingContext, 0);
        }
    }

    // 2 — Bind actions
    if (UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent))
    {
        EIC->BindAction(JumpAction,  ETriggerEvent::Started,   this, &ACharacter::Jump);
        EIC->BindAction(JumpAction,  ETriggerEvent::Completed, this, &ACharacter::StopJumping);
        EIC->BindAction(MoveAction,  ETriggerEvent::Triggered, this, &AMyCharacter::HandleMove);
        EIC->BindAction(LookAction,  ETriggerEvent::Triggered, this, &AMyCharacter::HandleLook);
    }
}
```

### Reading FInputActionValue

```cpp
void AMyCharacter::HandleMove(const FInputActionValue& Value)
{
    const FVector2D Input = Value.Get<FVector2D>(); // matches Axis2D action type
    AddMovementInput(GetActorForwardVector(), Input.Y);
    AddMovementInput(GetActorRightVector(),   Input.X);
}

void AMyCharacter::HandleLook(const FInputActionValue& Value)
{
    const FVector2D Input = Value.Get<FVector2D>();
    AddControllerYawInput(Input.X);
    AddControllerPitchInput(Input.Y);
}
```

`FInputActionValue::Get<T>()` type must match the action's **Value Type**: `bool`, `float`, `FVector2D`, or `FVector`.

### APlayerController pattern

When input is managed by the controller (not the character), use `SetupInputComponent()`:

```cpp
void AMyPlayerController::SetupInputComponent()
{
    Super::SetupInputComponent();

    if (UEnhancedInputLocalPlayerSubsystem* Subsystem =
        ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(GetLocalPlayer()))
    {
        Subsystem->AddMappingContext(DefaultMappingContext, 0);
    }

    if (UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(InputComponent))
    {
        EIC->BindAction(ConfirmAction, ETriggerEvent::Started, this, &AMyPlayerController::HandleConfirm);
    }
}
```

---

## Runtime Context Switching

Use the subsystem to add/remove contexts dynamically. Never hold a raw pointer; the subsystem manages lifetime:

```cpp
UEnhancedInputLocalPlayerSubsystem* GetInputSubsystem() const
{
    if (const APlayerController* PC = Cast<APlayerController>(GetController()))
    {
        return ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer());
    }
    return nullptr;
}

// Entering a vehicle
void AMyCharacter::OnEnterVehicle()
{
    if (auto* Sub = GetInputSubsystem())
    {
        Sub->RemoveMappingContext(GameplayMappingContext);
        Sub->AddMappingContext(VehicleMappingContext, 3);
    }
}

// Leaving a vehicle
void AMyCharacter::OnExitVehicle()
{
    if (auto* Sub = GetInputSubsystem())
    {
        Sub->RemoveMappingContext(VehicleMappingContext);
        Sub->AddMappingContext(GameplayMappingContext, 1);
    }
}
```

- `RemoveMappingContext` is safe to call even when the context is not currently active.
- Use `ClearAllMappings()` only when you need a complete reset (e.g., game state transitions); it removes every active context including shared ones.

---

## Data Asset Pattern (Scalable Architecture)

For characters with many actions, group them in a `UDataAsset` subclass to avoid property sprawl:

```cpp
UCLASS()
class UInputConfig : public UDataAsset
{
    GENERATED_BODY()
public:
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly)
    TObjectPtr<UInputMappingContext> DefaultContext;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly)
    TObjectPtr<UInputAction> Move;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly)
    TObjectPtr<UInputAction> Look;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly)
    TObjectPtr<UInputAction> Jump;
};
```

Reference a single `UInputConfig* InputConfig` on the character instead of N separate UPROPERTY fields.

---

## Asset Naming Conventions

| Asset type | Prefix | Example |
|------------|--------|---------|
| Input Action | `IA_` | `IA_Move`, `IA_Jump`, `IA_Look_Mouse` |
| Input Mapping Context | `IMC_` | `IMC_KBM_Default`, `IMC_Gamepad_Default` |
| Input Modifier (custom) | `IM_` | `IM_AimSensitivity` |
| Input Trigger (custom) | `IT_` | `IT_DoubleTap` |
| Force Feedback Effect | `FFE_` | `FFE_Explosion`, `FFE_MeleeHit` |
| Force Feedback Attenuation | `FFA_` | `FFA_Explosion` |
| Player Mappable Config | `PMI_` | `PMI_Gamepad`, `PMI_VR` |

### Recommended folder structure

```
Content/
  Framework/
    Input/
      Actions/          ← all UInputAction assets
      MappingContexts/  ← all UInputMappingContext assets
      Modifiers/        ← custom UInputModifier classes/assets
      Triggers/         ← custom UInputTrigger classes/assets
```

---

## Debugging

| Console command | What it shows |
|-----------------|--------------|
| `showdebug enhancedinput` | Active actions, their current ETriggerState, and live values |
| `showdebug devices` | Connected input devices (keyboard, mouse, gamepads) |

To inspect active context priority order, set a breakpoint in `UEnhancedPlayerInput::RebuildControlMappings` and examine `OrderedInputContexts`.

---

## Best Practices

- Declare `UInputAction` and `UInputMappingContext` properties with `EditDefaultsOnly` — set references in the Blueprint CDO, never hardcode asset paths in C++.
- Prefer one `IMC` per functional mode (gameplay, UI, vehicle, spectator) over one mega-context.
- Assign priorities intentionally: UI contexts should outprioritize gameplay contexts so the same physical keys don't both fire UI and gameplay actions.
- Use `ETriggerEvent::Started` for fire-once actions (jump, attack) and `ETriggerEvent::Triggered` for per-frame continuous inputs (movement, look).
- Avoid heavy computation in callbacks bound to `ETriggerEvent::Triggered` on high-frequency axes (mouse look runs every frame).
- When switching input modes at runtime (e.g., entering a vehicle), use `RemoveMappingContext` + `AddMappingContext` rather than `ClearAllMappings`, to preserve shared persistent contexts.
- Always cast `PlayerInputComponent` to `UEnhancedInputComponent` before binding — an uncast `UInputComponent*` does not expose the Enhanced Input API.
- Populate the **Action Description** field on each `UInputAction` — it appears in the editor as documentation and aids in debugging.

---

## Anti-patterns

- **Using old-style `BindAction`/`BindAxis` on `UInputComponent`** — these are the legacy input system; they compile but bypass Enhanced Input entirely.
- **Calling `ClearAllMappings()` carelessly** — clears every active context, including ones added by other systems (Game Feature Actions, UI framework). Prefer `RemoveMappingContext` for targeted removal.
- **Adding mapping contexts in `BeginPlay` instead of `SetupPlayerInputComponent`** — the subsystem may not be ready yet in `BeginPlay`; use `SetupPlayerInputComponent` (character) or `SetupInputComponent` (controller) instead.
- **Binding to a `UInputAction*` not present in the active mapping context** — the action will never fire. The action pointer in `BindAction` must match the exact asset referenced in the mapping.
- **Ignoring Consume Input** — when two contexts map the same key, the higher-priority context silently swallows the input if Consume Input is on. Unexpected input loss is almost always a priority/consume issue.
- **Skipping the Default Classes configuration in Project Settings** — the input component remains a plain `UInputComponent`; casts to `UEnhancedInputComponent` will fail silently and no actions will bind.
- **Declaring `UInputAction` or `UInputMappingContext` properties with `UPROPERTY()` only (no specifiers)** — the editor cannot assign assets; always use `EditDefaultsOnly` (or `EditAnywhere` with intent).
