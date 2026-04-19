---
version: 1.0.0
---

# Animancer

> **Scope**: Animancer animation framework — playing clips and transitions, cross-fading, layer management, mixer blending, animation events, and Animancer FSM state machines.
> **Load when**: playing animations with Animancer, using AnimancerComponent or ClipTransition, setting up layers for concurrent animations, blending with LinearMixerState or DirectionalMixerState, wiring animation end events or OnEnd callbacks, building animation state machines with Animancer FSM.

---

## Core Setup

- Add `AnimancerComponent` to the root GameObject that has the `Animator` component.
- Assign it via `[SerializeField] private AnimancerComponent _Animancer;` — never find it at runtime.
- Default execution order is **-5000** (initializes before most components). Do not call `Play()` before `Awake()` unless the graph is explicitly initialized via `InitializeGraph()`.

## Playing Animations

### Prefer ClipTransition over raw AnimationClip

Prefer `ClipTransition` over raw `AnimationClip` fields — it encapsulates fade duration, speed, start time, end time, and events in a single serializable unit. Configure all settings in the Inspector.

```csharp
// Preferred — encapsulates all animation settings
[SerializeField] private ClipTransition _Idle;
[SerializeField] private ClipTransition _Run;

_Animancer.Play(_Idle);
```

```csharp
// Avoid — forces fade duration into script, removes designer control
[SerializeField] private AnimationClip _Idle;
_Animancer.Play(_Idle, 0.25f);
```

### Play API

```csharp
// Immediate (no blend — use for sprites or instant transitions)
AnimancerState state = _Animancer.Play(clip);

// Cross-fade (skeletal animations)
AnimancerState state = _Animancer.Play(clip, 0.25f);
AnimancerState state = _Animancer.Play(clip, 0.25f, FadeMode.FixedSpeed);

// Transition (preferred — fade duration and all settings come from the asset)
AnimancerState state = _Animancer.Play(transition);

// Safe lookup — returns null if state was never created, never allocates
AnimancerState state = _Animancer.TryPlay(key);
```

### Control AnimancerState at Runtime

```csharp
AnimancerState state = _Animancer.Play(_Clip);
state.Speed = 2f;
state.Time = 0f;              // Restart from beginning
state.NormalizedTime = 0.5f;  // Jump to midpoint (0–1)
state.IsPlaying = false;      // Freeze on current frame
```

To force restart of an already-playing animation:

```csharp
_Animancer.Play(_Clip).Time = 0;
```

### TransitionAsset for Shared Transitions

Use `TransitionAssetBase` ScriptableObjects when the same animation transition is shared across multiple components. Each component holds a reference to the shared asset.

```csharp
[SerializeField] private ClipTransition.Asset _JumpAsset;
_Animancer.Play(_JumpAsset);
```

## Layers

Layers allow multiple animations to run simultaneously on different body parts.

- Access via `_Animancer.Layers[index]` — layers auto-create when accessed.
- Assign an `AvatarMask` to each non-base layer to control which bones it affects.
- **Always fade the layer, not the state,** when blending layer weight.
- Layers default to `Weight = 0` when first created; calling `Play()` on a zero-weight layer auto-sets `Weight = 1`.
- Use `IsAdditive = true` for additive blending (procedural additions, facial expressions).

```csharp
private AnimancerLayer _BaseLayer;
private AnimancerLayer _ActionLayer;

protected virtual void Awake()
{
    _BaseLayer   = _Animancer.Layers[0];
    _ActionLayer = _Animancer.Layers[1];
    _ActionLayer.Mask = _ActionMask;

    _Action.Events.OnEnd = OnActionEnd;
}

// Correct: fade the layer, not the individual state
private void OnActionEnd()
{
    _ActionLayer.StartFade(0, 0.25f);
}
```

## Mixers

Mixers blend multiple clips based on a parameter — equivalent to Unity Blend Trees, but created and controlled entirely from code.

| Type | Parameter | Blend Tree equivalent |
|------|-----------|----------------------|
| `LinearMixerState` | `float` | 1D Blend Tree |
| `CartesianMixerState` | `Vector2` | 2D Freeform Cartesian |
| `DirectionalMixerState` | `Vector2` | 2D Freeform Directional |
| `ManualMixerState` | none (manual weights) | Direct Blend Tree |

```csharp
// Store the mixer as a field — you need to update Parameter every frame
private LinearMixerState _MovementMixer;

protected virtual void Awake()
{
    _MovementMixer = new LinearMixerState
    {
        { _Idle, 0f   },
        { _Walk, 0.5f },
        { _Run,  1f   },
    };

    // Prevent Idle from syncing its time with Walk/Run cycles
    _MovementMixer.DontSynchronize(_MovementMixer.GetChild(0));

    _Animancer.Play(_MovementMixer);
}

protected virtual void Update()
{
    _MovementMixer.Parameter = _MovementSpeed;
}
```

- Prefer `DirectionalMixerState` over `CartesianMixerState` for character directional movement.
- Always include a central idle clip in 2D mixers to avoid dead zones at low parameter values.
- Use `ManualMixerState` when you need independent per-child weight control (facial blend shapes, additive layers).

## Animation Events (End Events)

Register end-of-animation callbacks via `state.Events(this).OnEnd`. Pass `this` as the owner to prevent conflicts when multiple scripts share the same state.

```csharp
// Use ??= to avoid allocating a new delegate on every call
AnimancerState state = _Animancer.Play(_Animation);
state.Events(this).OnEnd ??= OnAnimationEnd;

private void OnAnimationEnd()
{
    Debug.Log(AnimancerEvent.Current.State + " Ended");
}
```

For mid-animation timed events:

```csharp
state.Events(this).Add(0.5f, OnMidAnimation); // Fires at 50% of the clip
```

For shared states accessed by multiple scripts, use a shared static owner:

```csharp
public static readonly object SharedOwner = new();
state.Events(SharedOwner).OnEnd ??= OnAnimationEnd;
```

- Looping animations do **not** fire `OnEnd` automatically — only non-looping clips trigger it at `EndTime` (default 1.0 = end of clip).
- Never assign `OnEnd` inside `Update()` without the `??=` guard — it allocates a new delegate every frame.

## Finite State Machine (Animancer.FSM)

Animancer ships a general-purpose FSM under the `Animancer.FSM` namespace — use it to organize animation logic into self-contained, reusable state classes.

```csharp
using Animancer.FSM;

// Define state
public class IdleState : IState
{
    [SerializeField] private AnimancerComponent _Animancer;
    [SerializeField] private ClipTransition _Idle;

    public bool CanEnterState => true;
    public bool CanExitState  => true;

    public void OnEnterState() => _Animancer.Play(_Idle);
    public void OnExitState()  { }
}

// State machine field
private StateMachine<IState> _StateMachine = new();

void Awake()
{
    _StateMachine.ForceSetState(_IdleState); // Initial state — skips CanEnterState
}

// Normal transition — checks both CanExitState and CanEnterState
_StateMachine.TrySetState(_RunState);

// Forced transition — bypasses checks (use for death, cutscenes, forced interrupts)
_StateMachine.ForceSetState(_DeadState);
```

- Use `TrySetState` for all normal game-logic transitions.
- Use `ForceSetState` only when the transition must not be refused.
- Keep `CanEnterState` / `CanExitState` lightweight — they are evaluated synchronously on every transition attempt.

## Component Variants

| Component | When to use |
|-----------|-------------|
| `AnimancerComponent` | Standard — use by default |
| `NamedAnimancerComponent` | When string/name-based state lookup is needed |
| `HybridAnimancerComponent` | Gradual migration from an existing `RuntimeAnimatorController` |

## Anti-patterns

- **Fading the state instead of the layer** — to remove an upper-body animation, call `_ActionLayer.StartFade(0, duration)`, not `state.StartFade(0, duration)`. Fading a state leaves the layer at `Weight = 1` with a stopped animation.
- **Raw `AnimationClip` fields instead of `ClipTransition`** — you lose inspector-configurable fade duration, speed, start time, and events.
- **Assigning `OnEnd` without `??=` in frequently-called code** — allocates a new delegate object on every call; causes unnecessary GC pressure.
- **Calling `Play()` every frame in `Update()`** — prevents fade transitions from completing. Call `Play()` only when the desired animation actually changes.
- **Layer without an `AvatarMask`** — an upper-body layer without a mask overrides the entire skeleton, completely hiding base-layer animations.
- **Ignoring `TryPlay()`** — when you need a state reference without creating a new state, use `TryPlay(key)` which returns `null` if the state hasn't been created yet.
