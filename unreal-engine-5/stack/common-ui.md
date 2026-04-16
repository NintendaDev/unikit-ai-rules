---
version: 1.0.0
---

# Common UI

> **Scope**: Common UI plugin patterns for UE5 — activatable widget lifecycle, layered widget stack architecture, input routing, platform-agnostic gamepad/keyboard/mouse support, focus management, and multi-platform HUD setup in C++.
> **Load when**: building UI with Common UI plugin, authoring UCommonActivatableWidget subclasses, setting up widget stacks or layers, implementing gamepad navigation, configuring input routing, integrating CommonUI with Enhanced Input, debugging focus or input mode issues, migrating from legacy UMG input patterns.

---

## Core Concepts

**Activatable Widget** — the fundamental building block. A `UCommonActivatableWidget` can be activated (shown, takes input focus) and deactivated (hidden, releases focus) without being destroyed. Only the topmost active widget in the highest-priority layer receives input.

**Widget Stack** — a `UCommonActivatableWidgetStack` manages a LIFO queue of activatable widgets. Push a widget to show it; the stack automatically deactivates the widget beneath it. Pop to return to the previous widget.

**Action Router** — `UCommonUIActionRouter` (managed by `UCommonInputSubsystem`) determines which widget has input focus based on the active layer priority and active widget within each stack.

**Input Abstraction** — all input is mediated through `CommonInputActionDataBase` assets, not hard-coded keys. This enables platform-agnostic button prompts (the UI shows the correct icon for keyboard, Xbox, PlayStation, etc. automatically).

---

## Initial Setup

### Build.cs

```cpp
PrivateDependencyModuleNames.AddRange(new string[]
{
    "CommonUI",
    "CommonInput",
    "CommonGame",  // optional: CommonGame subsystem utilities
});
```

### Project Settings (required before anything works)

1. **Project Settings → Engine → General Settings → Game Viewport Client Class** → set to `CommonGameViewportClient`.  
   Without this, CommonUI's input routing does not function.

2. **Project Settings → Game → Common Input Settings → Enable Enhanced Input Support** → `true`.

3. **Project Settings → Game → Common Input Settings → Input Data** → assign your `CommonUIInputData` asset (see Configuration section).

4. **Platform Input (Windows)** → set `Default Gamepad Name` to `Generic`.

---

## Layer Architecture

Structure the HUD as prioritized named layers using Gameplay Tags:

| Tag | Purpose |
|-----|---------|
| `UI.Layer.Game` | HUD overlays, in-game displays |
| `UI.Layer.GameMenu` | In-game menus (inventory, pause) |
| `UI.Layer.Menu` | System menus (settings, main menu) |
| `UI.Layer.Modal` | Dialogs and confirmations |

Higher-numbered layers (Modal > Menu > GameMenu > Game) take input priority. Input flows to the topmost visible widget in the highest active layer.

Create a Root Layout widget (`UCommonActivatableWidget` subclass) that holds one `UCommonActivatableWidgetStack` per layer. Push widgets onto the appropriate stack.

---

## Widget Class Reference

| Class | Use |
|-------|-----|
| `UCommonActivatableWidget` | Base for any interactive screen, menu, dialog |
| `UCommonButtonBase` | Interactive button with style support |
| `UCommonBoundActionButton` | Button auto-bound to an input action (displays platform icon) |
| `UCommonActionWidget` | Displays the platform-correct button icon for a given action |
| `UCommonActivatableWidgetStack` | Manages push/pop widget stack |
| `UCommonActivatableWidgetQueue` | Queue-based widget display (dialogs) |
| `UCommonActivatableWidgetSwitcher` | Tab/switcher-style navigation |
| `UCommonTextBlock` | Text with style support |

---

## API / Interface

### UCommonActivatableWidget — key overrides

```cpp
// Specify which child widget should receive focus when this widget activates.
virtual UWidget* NativeGetDesiredFocusTarget() const override;

// Override to control input mode for this widget.
virtual TOptional<FUIInputConfig> GetDesiredInputConfig() const override;

// Called when this widget becomes active. Call SetFocus here.
virtual void NativeOnActivated() override;

// Called when this widget is deactivated (hidden or popped).
virtual void NativeOnDeactivated() override;

// Override to handle the platform Back action. Return true if handled.
virtual bool NativeOnHandleBackAction() override;
```

### UCommonActivatableWidgetStack — pushing widgets

```cpp
// Push a new widget onto the stack. The stack owns the widget lifecycle.
// UE5.5+: PushWidget already activates the widget internally.
template <typename WidgetT>
WidgetT* PushWidget();

// Example: push a menu
UMyMenuWidget* Menu = MenuStack->Push<UMyMenuWidget>(UMyMenuWidget::StaticClass());

// Pop the topmost widget (deactivates and removes it)
MenuStack->PopActivatableWidgets();
```

### Input Config

```cpp
// In your UCommonActivatableWidget subclass — return the desired input mode.
TOptional<FUIInputConfig> UMyMenuWidget::GetDesiredInputConfig() const
{
    // UI-only: blocks gameplay input while this widget is active
    return FUIInputConfig(ECommonInputMode::Menu, EMouseCaptureMode::NoCapture);
}

// For a HUD overlay that should NOT block gameplay input:
TOptional<FUIInputConfig> UMyHUDWidget::GetDesiredInputConfig() const
{
    return FUIInputConfig(ECommonInputMode::Game, EMouseCaptureMode::CapturePermanently);
}
```

### Focus Management

```cpp
void UMyMenuWidget::NativeOnActivated()
{
    Super::NativeOnActivated();
    // Ensure the first focusable element receives focus for gamepad navigation
    if (UWidget* Focus = NativeGetDesiredFocusTarget())
    {
        Focus->SetFocus();
    }
}

UWidget* UMyMenuWidget::NativeGetDesiredFocusTarget() const
{
    return MyFirstButton;  // return the button/widget that should be focused
}
```

### Debugging

```
// Console command: dump the active widget hierarchy to the log
CommonUI.DumpActivatableTree
```

---

## Configuration Assets

Create these data assets once per project:

| Asset | Base Class | Purpose |
|-------|-----------|---------|
| `DT_CommonInputActions` | `CommonInputActionDataBase` | Maps action names (Confirm, Cancel, TabLeft, …) to platform-specific keys |
| `DA_ControllerData_Keyboard` | `CommonInputBaseControllerData` | Keyboard/mouse button icon textures |
| `DA_ControllerData_Gamepad` | `CommonInputBaseControllerData` | Gamepad button icon textures |
| `DA_CommonUIInputData` | `CommonUIInputData` | Maps universal Back and Confirm actions to Enhanced Input `InputAction` assets |

**Asset setup checklist:**
- In `DA_ControllerData_*`: set `Default Gamepad Name` to `Generic` (Windows platform).
- All button icon textures: set **Texture Group** to `UI` in import settings.
- `DA_CommonUIInputData` is assigned in Project Settings → Common Input Settings → Input Data.

---

## Patterns & Examples

### Root Layout (C++)

```cpp
// Created once by PlayerController or LocalPlayer subsystem.
// Holds one stack per UI layer.
UCLASS(Abstract)
class UMyRootLayout : public UCommonActivatableWidget
{
    GENERATED_BODY()

protected:
    UPROPERTY(meta = (BindWidget))
    TObjectPtr<UCommonActivatableWidgetStack> GameLayerStack;

    UPROPERTY(meta = (BindWidget))
    TObjectPtr<UCommonActivatableWidgetStack> MenuLayerStack;

    UPROPERTY(meta = (BindWidget))
    TObjectPtr<UCommonActivatableWidgetStack> ModalLayerStack;
};
```

### Push a menu from C++

```cpp
// Inside PlayerController or GameMode — after RootLayout is created:
UMyMenuWidget* Menu = RootLayout->GetMenuStack()->Push<UMyMenuWidget>(UMyMenuWidget::StaticClass());
```

### Back action handler

```cpp
bool UMyMenuWidget::NativeOnHandleBackAction()
{
    // Returning true consumes the Back input; the stack pops this widget automatically.
    DeactivateWidget();
    return true;
}
```

### Stub widget for empty stack input reset

When a `UCommonActivatableWidgetStack` is empty, no widget owns input. Add a persistent "stub" as the bottom of each stack to restore input to Gameplay mode when all menus are closed:

```cpp
// WBP_StackStub: a CommonActivatableWidget that always returns Game input mode.
TOptional<FUIInputConfig> UStackStub::GetDesiredInputConfig() const
{
    return FUIInputConfig(ECommonInputMode::Game, EMouseCaptureMode::CapturePermanently);
}
```

### Automatic widget name bindings

For `UCommonButtonBase` children to auto-bind:
- The `UCommonTextBlock` child must be named exactly `ButtonText`.
- The `UCommonActionWidget` child must be named exactly `InputActionWidget`.

These names are magic: the base class looks them up by name during construction.

---

## Best Practices

- **One Root Layout per local player.** Create it via a `ULocalPlayerSubsystem` or `UGameInstanceSubsystem`, not per-level code.
- **Use Gameplay Tags for layer identity.** Avoid coupling code to widget class types when pushing to a specific layer — use tag-driven stack lookup so layers can be reconfigured.
- **Override `GetDesiredInputConfig()` on every activatable widget.** Never call `SetInputMode` / `SetInputMode_GameAndUI`; CommonUI derives the combined input mode from all active widgets automatically.
- **Enable `Auto Restore Focus`** on `UCommonActivatableWidget` to recover focus when a child widget deactivates.
- **Use `UCommonActivatableWidgetStack::PushWidget<T>()` exclusively** for pushing screens — do not manually `AddToViewport` widgets that participate in the stack.
- **Prefer Overlay over Canvas Panel** inside Common UI widgets for layering — Canvas Panel is heavier and adds unnecessary layout overhead.
- **Implement C++ base classes** for activatable widgets in a shipping game. Blueprint-only CommonActivatableWidget subclasses are acceptable for prototyping but miss type safety and performance.
- **Keep Gameplay and UI input contexts separate** in Enhanced Input. CommonUI manages focus routing; Enhanced Input manages what actions fire during gameplay.

---

## Anti-patterns

- **Do not call `ActivateWidget()` after `PushWidget()`** — since UE5.5, `PushWidget` activates the widget internally. Calling `ActivateWidget` a second time breaks the lifecycle sequence.
- **Do not use `SetInputMode` / `Set Input Mode Game And UI` nodes with CommonUI** — these bypass the Action Router and produce undefined input state. Use `GetDesiredInputConfig()` overrides exclusively.
- **Do not add activatable widgets directly to the viewport** (`AddToViewport`) if they need to participate in back-button navigation, focus stacking, or input priority. Use a `UCommonActivatableWidgetStack`.
- **Do not leave `GameViewportClientClass` at the default** — input routing silently fails without `CommonGameViewportClient`.
- **Do not rely on tint color alone** to indicate state — add shape or icon indicators for accessibility (color-blind users).
- **Do not use VR with 2D CommonUI widgets directly** — `UCommonActivatableWidget` renders in 2D screen space. For VR use `UWidgetComponent` in world space and manage focus manually.