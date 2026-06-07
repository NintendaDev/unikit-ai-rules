---
version: 1.0.0
---

# Unity Input System

> **Scope**: Unity Input System package (com.unity.inputsystem) — action setup and lifecycle, callback patterns, InputActionAsset and generated wrappers, PlayerInput component, control schemes, runtime rebinding, and update mode configuration.
> **Load when**: handling player input with the new Input System, creating InputActions or InputActionAssets, wiring input callbacks, setting up control schemes or device switching, implementing runtime rebinding, debugging input not firing, choosing between PlayerInput and manual action management.

---

## Core Concepts

**Action types** — choose at asset or code level:
- `Value` — continuous monitoring; fires `started`, `performed` on each value change, `canceled` when control returns to default. Use for analog sticks, triggers.
- `Button` — discrete press; fires once per press. Use for jump, fire, menu actions. Skips the initial-state check (avoids accidental triggers on held buttons at scene load).
- `Pass-Through` — like Value but bypasses disambiguation; reports changes from all bound controls simultaneously.

**Action phases**: `Disabled → Waiting → Started → Performed → Canceled`.

**InputActionMap** — a named group of actions. Enable/disable the whole map at once rather than individual actions where possible — it is more efficient and less error-prone.

**InputActionAsset** — a ScriptableObject (`.inputactions` file) that holds one or more action maps and optional control schemes. Enable C# class generation in the asset inspector to get strongly-typed wrappers.

**InputActionReference** — a serializable reference to a specific action inside any asset. Expose this in inspectors instead of the entire asset to keep components reusable.

---

## API / Interface

```csharp
// Enable / disable (prefer map-level)
actionMap.Enable();
actionMap.Disable();

// Individual action callbacks
action.started   += ctx => { };
action.performed += ctx => { };
action.canceled  += ctx => { };

// Read current value — call inside a callback or in Update
Vector2 move = moveAction.ReadValue<Vector2>();
bool     fire = fireAction.triggered; // true for exactly one frame on press

// Read from callback context
void OnFire(InputAction.CallbackContext ctx)
{
    float value = ctx.ReadValue<float>();
    // ctx is valid ONLY inside this callback — never store it
}

// All-actions listener on a map
actionMap.actionTriggered += ctx => Debug.Log(ctx.action.name);
```

**Key InputAction members:**
| Member | Type | Notes |
|---|---|---|
| `performed` | `event Action<CallbackContext>` | Main event for button press or value change |
| `started` | `event Action<CallbackContext>` | Interaction has begun |
| `canceled` | `event Action<CallbackContext>` | Control returned to default |
| `ReadValue<T>()` | method | Current value; valid any time action is enabled |
| `triggered` | `bool` | True for one frame when action performed — poll in Update |
| `phase` | `InputActionPhase` | Current lifecycle phase |
| `Enable()` / `Disable()` | methods | Must call; actions are disabled by default |

---

## Setup Patterns

### Pattern A — InputActionAsset (Recommended)

1. Create a `.inputactions` file via **Assets → Create → Input Actions**.
2. Define action maps, actions, and bindings in the visual editor.
3. Tick **Generate C# Class** in the asset's Inspector to produce a wrapper.
4. Use `InputActionReference` fields on MonoBehaviours for single-action access without referencing the whole asset.

```csharp
// Generated wrapper usage
private PlayerControls _controls; // generated class

void Awake()
{
    _controls = new PlayerControls();
    _controls.Gameplay.Fire.performed += OnFire;
}

void OnEnable()  => _controls.Gameplay.Enable();
void OnDisable() => _controls.Gameplay.Disable();
```

### Pattern B — Embedded in MonoBehaviour

```csharp
public class MyController : MonoBehaviour
{
    [SerializeField] private InputActionReference _moveRef;
    [SerializeField] private InputActionReference _fireRef;

    void Awake()
    {
        _moveRef.action.performed += OnMove;
        _fireRef.action.performed += OnFire;
    }

    void OnEnable()
    {
        _moveRef.action.Enable();
        _fireRef.action.Enable();
    }

    void OnDisable()
    {
        _moveRef.action.Disable();
        _fireRef.action.Disable();
    }

    void OnMove(InputAction.CallbackContext ctx) => _direction = ctx.ReadValue<Vector2>();
    void OnFire(InputAction.CallbackContext ctx) => Fire();
}
```

### Pattern C — Programmatic (testing / procedural binding)

```csharp
var moveAction = new InputAction("Move", InputActionType.Value);
moveAction.AddBinding("<Gamepad>/leftStick");
moveAction.AddCompositeBinding("Dpad")
    .With("Up",    "<Keyboard>/w")
    .With("Down",  "<Keyboard>/s")
    .With("Left",  "<Keyboard>/a")
    .With("Right", "<Keyboard>/d");
moveAction.Enable();
```

---

## Patterns & Examples

### Callback vs Polling

| Use callbacks | Use polling |
|---|---|
| Discrete events (jump, fire, menu open) | Continuous values read every frame (movement, aim) |
| Input processed once per state change | Physics / animation loops where every frame needs current value |

```csharp
// Callback — register once, fire only on change
void Awake() => _jumpAction.performed += _ => Jump();

// Polling — read in Update/FixedUpdate
void Update() => _rb.velocity = _moveAction.ReadValue<Vector2>() * speed;
```

### Input Buffering

For timing-sensitive actions (coyote jump, attack buffering):

```csharp
private bool  _jumpBuffered;
private float _jumpBufferExpiry;
private const float BufferWindow = 0.1f;

void Awake() => _jumpAction.performed += _ =>
{
    _jumpBuffered     = true;
    _jumpBufferExpiry = Time.time + BufferWindow;
};

void FixedUpdate()
{
    if (_jumpBuffered && Time.time <= _jumpBufferExpiry && IsGrounded())
    {
        PerformJump();
        _jumpBuffered = false;
    }
    if (Time.time > _jumpBufferExpiry) _jumpBuffered = false;
}
```

### PlayerInput Component

Prefer `PlayerInput` when:
- Single-player or local co-op (pair with `PlayerInputManager`)
- Want automatic enable/disable lifecycle
- Wiring via UnityEvents or `IInputActionCollection`

```csharp
// Message notification mode — Unity calls these methods automatically
public void OnMove(InputValue value) => _dir = value.Get<Vector2>();
public void OnFire() => Fire();
public void OnControlsChanged() => UpdateHints(); // refresh device UI hints
```

Switch scheme manually:
```csharp
playerInput.SwitchCurrentControlScheme("Gamepad", Gamepad.current);
```

### Runtime Rebinding

```csharp
private RebindingOperation _rebind;

void StartRebind(InputAction action, int bindingIndex)
{
    action.Disable();
    _rebind = action.PerformInteractiveRebinding(bindingIndex)
        .WithControlsExcluding("<Mouse>/delta")
        .OnMatchWaitForAnother(0.1f)
        .OnComplete(_ =>
        {
            _rebind.Dispose();
            action.Enable();
            SaveBindings();
        })
        .Start();
}
```

Always call `Dispose()` on the `RebindingOperation` — it allocates unmanaged memory.

---

## Configuration

**Update modes** (`Project Settings → Input System Package`):

| Mode | Value | When to use |
|---|---|---|
| `ProcessEventsInDynamicUpdate` | default | Most games |
| `ProcessEventsInFixedUpdate` | physics games | Physics responds to input in FixedUpdate |
| `ProcessEventsManually` | testing / custom loop | Manual `InputSystem.Update()` calls |

**Save and restore custom bindings:**

```csharp
// Save
var overrides = myAsset.SaveBindingOverridesAsJson();
PlayerPrefs.SetString("Bindings", overrides);

// Load
myAsset.LoadBindingOverridesFromJson(PlayerPrefs.GetString("Bindings"));
```

---

## Best Practices

- **Enable/disable at the map level**, not per-action. It is more efficient and ensures all actions in the set are consistently active or inactive.
- **Subscribe to callbacks in `Awake`** (not `OnEnable`) to register once. Enable the action in `OnEnable`; disable in `OnDisable`.
- **Prefer `InputActionReference` over public `InputAction` fields** on components. References serialize to asset entries without coupling the component to the full asset.
- **Use `Button` type for one-time press events** (jump, fire, confirm). `Value` type triggers an initial-state check that may fire immediately if the control is already pressed at object activation.
- **Unsubscribe callbacks before destroying** objects that register them to avoid null delegate invocations.
- **Dispose `RebindingOperation` and `InputActionTrace`** — both allocate unmanaged memory.
- **Generate C# wrappers for large projects** — compile-time safety and refactorability outweigh the minor overhead of an extra class.

---

## Common Pitfalls

### Forgot to call `Enable()`

Actions are **disabled by default**. Callbacks are silently ignored. Always pair subscription with `Enable()`.

```csharp
// BAD — callbacks registered but action never enabled; nothing fires
void Awake() => _jumpAction.performed += OnJump;

// GOOD
void Awake()   => _jumpAction.performed += OnJump;
void OnEnable() => _jumpAction.Enable();
void OnDisable() => _jumpAction.Disable();
```

### Storing `CallbackContext` outside the callback

`InputAction.CallbackContext` is valid **only during callback execution**. Reading it afterwards causes undefined behavior.

```csharp
// BAD
InputAction.CallbackContext _storedCtx;
void OnFire(InputAction.CallbackContext ctx) => _storedCtx = ctx; // ctx becomes invalid after method returns

// GOOD — extract the value immediately
void OnFire(InputAction.CallbackContext ctx) => _lastFireValue = ctx.ReadValue<float>();
```

### Modifying bindings while the action is enabled

Rebinding requires the action to be **disabled first**. Attempting to modify bindings on an enabled action throws an exception.

```csharp
// BAD
action.AddBinding("<Keyboard>/space"); // throws if action is enabled

// GOOD
action.Disable();
action.AddBinding("<Keyboard>/space");
action.Enable();
```

### Scene transition / object destruction ordering

If an action still has callbacks pointing to destroyed objects after a scene unload, references dangle. Always remove callbacks in `OnDisable` / `OnDestroy`.

```csharp
void OnDestroy()
{
    _fireAction.performed -= OnFire;
    _fireAction.Disable();
}
```

### Using `Value` type for buttons that may be held at scene load

`Value` actions fire an initial-state check at `Enable()`. If the physical button is already pressed when the action is enabled, `started` + `performed` fire immediately. Use `Button` type to skip this check.

### Polling `triggered` outside `Update`

`InputAction.triggered` resets to `false` after one frame. Reading it in `FixedUpdate` or coroutines will miss events. Use callbacks or buffer the press flag manually.

---

## Anti-patterns

- **Never poll `ReadValue()` for discrete events** — use `performed` callbacks. Polling misses rapid taps between frames.
- **Never hardcode device paths in callbacks** (`<Keyboard>/space`) when multi-platform support is needed. Use bindings in action assets and control schemes instead.
- **Never disable/enable the same action on every frame** — binding resolution happens on each `Enable()` and carries a cost.
- **Never skip `Dispose()` on `InputActionTrace`** — it leaks native memory.
