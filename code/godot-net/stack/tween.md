---
version: 1.0.0
---

# Tween

> **Scope**: Godot 4 Tween and Tweener system — creating and controlling property/method/callback animations via script, managing lifecycle, sequential and parallel sequencing, transition and ease configuration.
> **Load when**: animating node properties via script, creating UI transitions, sequencing animation steps, using TweenProperty/TweenCallback/TweenMethod/TweenInterval, managing tween lifecycle (kill, pause, resume), choosing transition and ease curves.

---

## Core Concepts

`Tween` is a **fire-and-forget, RefCounted animation object** — not a Node. Once created, it runs automatically. Once finished, it is invalid and cannot be restarted; create a new instance instead.

A Tween holds an ordered list of **Tweeners** (animation steps). By default steps run sequentially; they can also run in parallel.

**Four Tweener types:**

| Type | Method | Purpose |
|------|--------|---------|
| `PropertyTweener` | `TweenProperty()` | Interpolate a node/object property value |
| `CallbackTweener` | `TweenCallback()` | Execute a callable at a specific point in the sequence |
| `MethodTweener` | `TweenMethod()` | Call a method repeatedly with an interpolated value |
| `IntervalTweener` | `TweenInterval()` | Insert a timed pause/delay |

---

## Creation Patterns

```csharp
// From a Node — creates and automatically binds to the node.
// The tween pauses when the node leaves the tree and is killed when the node is freed.
Tween tween = CreateTween();

// From SceneTree — creates an unbound tween.
// Manually bind it to a node's lifetime if needed.
Tween tween = GetTree().CreateTween();
tween.BindNode(this);  // make it follow this node's lifetime
```

**Rule:** Prefer `CreateTween()` (from a Node) — it handles binding automatically. Only use `GetTree().CreateTween()` when a tween must survive node transitions or in static/singleton contexts.

---

## PropertyTweener — `TweenProperty()`

Animates any numeric, Vector, Color, or Rect property over time.

```csharp
// Signature
PropertyTweener TweenProperty(GodotObject obj, NodePath property, Variant finalValue, double duration)

// Basic usage — move to position (200, 100) over 1 second
Tween tween = CreateTween();
tween.TweenProperty(this, "position", new Vector2(200f, 100f), 1.0f);

// Sub-property paths — animate only one component
tween.TweenProperty(this, "position:x", 200f, 1.0f);
tween.TweenProperty(this, "modulate:a", 0f, 0.5f);  // fade out
tween.TweenProperty(this, "scale:y", 1.5f, 0.3f);

// Relative offset — move 100px to the right from wherever it is now
tween.TweenProperty(this, "position", Vector2.Right * 100f, 1.0f).AsRelative();

// Custom start value
tween.TweenProperty(this, "position", new Vector2(200f, 100f), 1.0f)
     .From(new Vector2(100f, 100f));

// Start from current value at the moment this tweener is created
tween.TweenProperty(this, "position", new Vector2(200f, 100f), 1.0f)
     .FromCurrent();

// Per-tweener transition, easing, and delay
tween.TweenProperty(this, "scale", new Vector2(2f, 2f), 0.5f)
     .SetTrans(Tween.TransitionType.Back)
     .SetEase(Tween.EaseType.Out)
     .SetDelay(0.2f);

// Custom easing curve (receives float 0..1, returns float 0..1)
[Export] public Curve EaseCurve { get; set; }

tween.TweenProperty(this, "position:x", 300f, 1.0f)
     .AsRelative()
     .SetCustomInterpolator(Callable.From<float, float>(v => EaseCurve.SampleBaked(v)));
```

**PropertyTweener modifier methods (chained immediately after `TweenProperty()`):**
- `.AsRelative()` — treats `finalValue` as a relative offset from the starting value
- `.From(value)` — sets an explicit starting value
- `.FromCurrent()` — captures the current property value as the starting point
- `.SetDelay(float delay)` — delays this tweener's start by `delay` seconds
- `.SetTrans(TransitionType)` — overrides the Tween's default transition for this step
- `.SetEase(EaseType)` — overrides the Tween's default easing for this step
- `.SetCustomInterpolator(Callable)` — custom `float → float` easing function

---

## CallbackTweener — `TweenCallback()`

Calls a `Callable` at a specific point in the animation sequence.

```csharp
// Queue free after fade-out
Tween tween = CreateTween();
tween.TweenProperty(sprite, "modulate:a", 0f, 1.0f);
tween.TweenCallback(Callable.From(sprite.QueueFree));

// Lambda callback
tween.TweenCallback(Callable.From(() => GD.Print("Animation complete")));

// Delayed callback (fires 2 seconds after the previous step ends)
tween.TweenCallback(Callable.From(OnExplosionFinished)).SetDelay(2.0f);
```

**Modifier:**
- `.SetDelay(double delay)` — delay in seconds before the callback fires

---

## MethodTweener — `TweenMethod()`

Repeatedly calls a method with an interpolated value over time. Useful for effects that don't map to a direct property path.

```csharp
// Signature
MethodTweener TweenMethod(Callable method, Variant from, Variant to, double duration)

// Counting label from 0 to 1000 over 2 seconds
Tween tween = CreateTween();
tween.TweenMethod(
    Callable.From<int>(count => _label.Text = $"Score: {count}"),
    0, 1000, 2.0f);

// LookAt interpolation
tween.TweenMethod(
    Callable.From((Vector3 target) => LookAt(target, Vector3.Up)),
    new Vector3(-1f, 0f, -1f),
    new Vector3(1f, 0f, -1f),
    1.0f);
```

**Modifier methods:** `.SetDelay()`, `.SetTrans()`, `.SetEase()`

---

## IntervalTweener — `TweenInterval()`

Inserts a timed pause/delay into the sequence.

```csharp
// Jump, wait 2 seconds, jump back — looping
Tween tween = CreateTween().SetLoops();
tween.TweenProperty(sprite, "position:x", 200f, 1.0f).AsRelative();
tween.TweenCallback(Callable.From(Jump));
tween.TweenInterval(2.0f);
tween.TweenProperty(sprite, "position:x", -200f, 1.0f).AsRelative();
```

---

## Sequencing — Sequential vs Parallel

```csharp
// DEFAULT: sequential — tweeners run one after another
Tween tween = CreateTween();
tween.TweenProperty(this, "position:x", 200f, 1.0f);  // step 1
tween.TweenProperty(this, "position:y", 300f, 1.0f);  // step 2 (starts after step 1 ends)

// SetParallel() — ALL subsequent tweeners run simultaneously
Tween tween = CreateTween().SetParallel();
tween.TweenProperty(this, "position:x", 200f, 1.0f);   // both run
tween.TweenProperty(this, "position:y", 300f, 1.0f);   // at the same time
tween.Chain();  // return to sequential for anything added after this

// Parallel() — makes only the NEXT tweener parallel to the previous one
Tween tween = CreateTween();
tween.TweenProperty(this, "position:x", 200f, 1.0f);
tween.Parallel()  // next tweener runs alongside position:x
     .TweenProperty(this, "rotation", Mathf.Pi, 1.0f);
tween.TweenCallback(Callable.From(OnDone));  // runs after BOTH complete
```

---

## Lifecycle

```csharp
private Tween _tween;

// Kill existing before creating new — always do this on re-trigger
_tween?.Kill();
_tween = CreateTween();
_tween.TweenProperty(this, "scale", new Vector2(1.2f, 1.2f), 0.3f);

// Pause and resume
_tween.Pause();  // freeze in place
_tween.Play();   // continue from where it paused

// Stop — halts and resets to initial state; tween remains valid
_tween.Stop();
_tween.Play();   // can be restarted

// Kill — immediately aborts and invalidates; must create a new Tween to animate again
_tween.Kill();

// State checks
bool running = _tween.IsRunning();
bool valid   = _tween.IsValid();

// Bind to a node for tweens created via GetTree()
_tween.BindNode(this);

// Manual advance — useful for testing or custom timing logic
_tween.CustomStep(0.016f);  // advance by 16ms
```

**Kill vs Stop:**
| Method | Effect | Reusable? |
|--------|--------|-----------|
| `Kill()` | Aborts and invalidates the tween | No — create a new one |
| `Stop()` | Halts and resets to initial state | Yes — call `Play()` to restart |

---

## Tween Configuration

All configuration methods return `Tween` for fluent chaining. Apply before adding tweeners.

```csharp
Tween tween = CreateTween()
    .SetTrans(Tween.TransitionType.Sine)             // default transition for all steps
    .SetEase(Tween.EaseType.Out)                     // default easing for all steps
    .SetLoops(3)                                     // repeat 3 times (0 = infinite loop)
    .SetSpeedScale(2.0f)                             // play at 2× speed
    .SetParallel()                                   // all tweeners run simultaneously
    .SetProcessMode(Tween.TweenProcessMode.Physics)  // update in _PhysicsProcess
    .SetPauseMode(Tween.TweenPauseMode.Ignore);      // run even when game is paused
```

**`SetPauseMode` values:**
| Value | Behavior |
|-------|---------|
| `Bound` (default) | Follows the bound node's pause state |
| `Stop` | Always stops when the scene tree is paused |
| `Ignore` | Always runs even when the scene tree is paused |

---

## Transition & Ease Types

```csharp
// TransitionType — shape of the animation curve
Tween.TransitionType.Linear    // constant speed (no curve)
Tween.TransitionType.Sine      // smooth S-curve
Tween.TransitionType.Cubic     // smooth, slightly sharper than Sine
Tween.TransitionType.Quart     // sharper curve (power of 4)
Tween.TransitionType.Quint     // even sharper (power of 5)
Tween.TransitionType.Expo      // exponential — very sharp acceleration/deceleration
Tween.TransitionType.Circ      // circular arc
Tween.TransitionType.Back      // slight overshoot past target, then snaps back
Tween.TransitionType.Bounce    // bounces at the destination
Tween.TransitionType.Elastic   // spring oscillation around the target

// EaseType — where in the curve the transition is applied
Tween.EaseType.In     // slow start, fast end
Tween.EaseType.Out    // fast start, slow end  (most natural for UI)
Tween.EaseType.InOut  // slow start and end, fast middle (default)
```

Use [easings.net](https://easings.net/) to visually preview combinations.

Common recipes:
- **UI element pop-in**: `Back + Out`
- **UI fade or slide**: `Sine + Out`
- **Physics-feel landing**: `Bounce + Out`
- **Snappy/punchy**: `Expo + Out`

---

## Signals & Async Patterns

```csharp
// C# event-style connection
_tween.Finished += OnAnimationFinished;
_tween.LoopFinished += loopsLeft => GD.Print($"Loop done, {loopsLeft} left");
_tween.StepFinished += stepIdx  => GD.Print($"Step {stepIdx} complete");

// Async/await (only inside async methods)
private async void PlayAndDestroy()
{
    Tween tween = CreateTween();
    tween.TweenProperty(this, "modulate:a", 0f, 1.0f);
    await ToSignal(tween, Tween.SignalName.Finished);
    QueueFree();
}

// Inline callback — preferred for simple post-animation actions
Tween tween = CreateTween();
tween.TweenProperty(this, "modulate:a", 0f, 1.0f);
tween.TweenCallback(Callable.From(QueueFree));
```

**Rule:** Use `TweenCallback()` for sequential post-animation actions. Reserve `await ToSignal()` for async method contexts only — it requires `async void`/`async Task` and carries GC overhead.

---

## Best Practices

- **Always kill before recreating**: `_tween?.Kill(); _tween = CreateTween();` — prevents two tweens competing on the same properties.
- **Store as a member field**: `private Tween _tween;` — enables `Kill()`, `Pause()`, and `IsRunning()` from any method.
- **Use `FromCurrent()`** when starting a new tween that may interrupt a previous one — it captures the property's actual value at that moment, avoiding a visual jump.
- **Create tweens on demand**, not in `_Ready()` — create them in the method that triggers the animation.
- **Use sub-property paths** (`"position:x"`, `"modulate:a"`) to animate individual components without overwriting the full property.
- **Chain modifiers immediately**: `TweenProperty(...).SetTrans(...).SetEase(...).SetDelay(...)` — modifiers must be chained to the Tweener returned by the method.
- **`BindNode()` for SceneTree tweens**: Any tween created via `GetTree().CreateTween()` must be explicitly bound if it should automatically stop when a specific node is freed.

---

## Anti-patterns

```csharp
// BAD: Trying to add tweeners to a finished/invalid tween
_tween = CreateTween();
_tween.TweenProperty(this, "position:x", 200f, 1.0f);
// ... later, after the tween has finished ...
_tween.TweenProperty(this, "position:x", 0f, 1.0f);  // no effect — tween is invalid

// GOOD: Kill and recreate
_tween?.Kill();
_tween = CreateTween();
_tween.TweenProperty(this, "position:x", 0f, 1.0f);

// BAD: Godot 3 syntax — Start() does not exist in Godot 4
tween.Start();  // compile error

// BAD: Creating a Tween in _Ready() then adding tweeners later
public override void _Ready()
{
    _tween = CreateTween();  // starts immediately with no tweeners — bad pattern
}

// GOOD: Create on demand in the method that starts the animation
private void PlayEntrance()
{
    _tween?.Kill();
    _tween = CreateTween();
    _tween.TweenProperty(this, "position:y", 0f, 0.4f)
          .SetTrans(Tween.TransitionType.Back)
          .SetEase(Tween.EaseType.Out);
}

// BAD: Not killing the previous tween — two tweens fight over the same property
private void OnHit()
{
    var tween = CreateTween();
    tween.TweenProperty(this, "modulate:a", 0.3f, 0.1f);  // previous one still running
}

// GOOD:
private void OnHit()
{
    _tween?.Kill();
    _tween = CreateTween();
    _tween.TweenProperty(this, "modulate:a", 0.3f, 0.1f);
    _tween.TweenProperty(this, "modulate:a", 1.0f, 0.2f);
}

// BAD: Not using FromCurrent() when interrupting an in-progress tween
private void ScaleUp()
{
    _tween?.Kill();
    _tween = CreateTween();
    // "scale" starts from its designed default, not the current interrupted value
    _tween.TweenProperty(this, "scale", new Vector2(1.5f, 1.5f), 0.3f);
}

// GOOD:
private void ScaleUp()
{
    _tween?.Kill();
    _tween = CreateTween();
    _tween.TweenProperty(this, "scale", new Vector2(1.5f, 1.5f), 0.3f).FromCurrent();
}
```
