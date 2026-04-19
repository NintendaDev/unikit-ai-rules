---
version: 1.0.0
---

# LeanTween

> **Scope**: LeanTween tweening library for Unity — tween creation and chaining, sequence composition via LTSeq, tween lifecycle control, easing types, callbacks, value animation, and event system.
> **Load when**: animating values with LeanTween, creating tweens or sequences, chaining setEase/setLoops/setDelay/setOnComplete, managing tween lifecycle (cancel/pause/resume), using LTSeq sequences, debugging tween errors, animating UI transforms or materials with LeanTween.

---

## Initialization & Configuration

Call `LeanTween.init()` before the first tween when you need more than 400 concurrent tweens. Place it in `Awake()` of a bootstrap class:

```csharp
// Optional — default is 400. Must be called before any LeanTween call.
LeanTween.init(800);
```

LeanTween auto-initializes on first use if `init()` is never called. Explicit init prevents silent failures when the tween pool overflows.

---

## Core Tween Methods

All methods return `LTDescr` for chaining. Duration is always in seconds.

### Movement

```csharp
// World space
LeanTween.move(gameObject, new Vector3(1f, 0f, 0f), 1f);
LeanTween.moveX(gameObject, 5f, 1f);
LeanTween.moveY(gameObject, 5f, 1f);
LeanTween.moveZ(gameObject, 5f, 1f);

// Local space (relative to parent)
LeanTween.moveLocal(gameObject, new Vector3(1f, 0f, 0f), 1f);
LeanTween.moveLocalX(gameObject, 5f, 1f);
LeanTween.moveLocalY(gameObject, 5f, 1f);
LeanTween.moveLocalZ(gameObject, 5f, 1f);

// Along a spline path
Vector3[] path = { new(0, 0, 0), new(1, 1, 0), new(2, 0, 0), new(3, 1, 0) };
LeanTween.moveSpline(gameObject, path, 2f).setOrientToPath(true);
```

### Rotation

```csharp
// Euler angle rotation (world space)
LeanTween.rotate(gameObject, new Vector3(0f, 90f, 0f), 1f);
LeanTween.rotateX(gameObject, 90f, 1f);
LeanTween.rotateY(gameObject, 90f, 1f);
LeanTween.rotateZ(gameObject, 90f, 1f);

// Local space
LeanTween.rotateLocal(gameObject, new Vector3(0f, 90f, 0f), 1f);

// Rotation around an arbitrary axis — use this for rotations > 180 degrees
LeanTween.rotateAround(gameObject, Vector3.up, 360f, 2f);
LeanTween.rotateAroundLocal(gameObject, Vector3.forward, 180f, 1f);
```

> **Note**: For rotations exceeding 180°, always use `rotateAround` instead of `rotate` — Euler interpolation will take the short path and give unexpected results.

### Scale

```csharp
LeanTween.scale(gameObject, new Vector3(2f, 2f, 2f), 1f);
LeanTween.scaleX(gameObject, 2f, 1f);
LeanTween.scaleY(gameObject, 2f, 1f);
LeanTween.scaleZ(gameObject, 2f, 1f);
```

### Alpha & Color

```csharp
// Fades the material's alpha (material must have alpha channel)
LeanTween.alpha(gameObject, 0f, 1f);

// Animates full material color
LeanTween.color(gameObject, Color.red, 1f);
```

> **Note**: `alpha` and `color` only work on objects with a compatible material (e.g., Standard shader with Fade/Transparent rendering mode). For UI `Image` or `CanvasGroup`, use `LeanTween.value` with a custom callback.

### Value Animation

Use `LeanTween.value` to animate any arbitrary value with a per-frame callback:

```csharp
// Float value
LeanTween.value(gameObject, 0f, 100f, 1f)
    .setOnUpdate(val => mySlider.value = val);

// Vector3 value
LeanTween.value(gameObject, Vector3.zero, Vector3.one, 1f)
    .setOnUpdate(val => transform.localScale = val);

// Color value
LeanTween.value(gameObject, Color.white, Color.red, 1f)
    .setOnUpdate(val => image.color = val);
```

### Delayed Call

```csharp
// Execute a method after a delay (not attached to a tween)
LeanTween.delayedCall(2f, () => Debug.Log("Delayed!"));

// With a gameObject reference (cancelled if the object is destroyed)
LeanTween.delayedCall(gameObject, 2f, () => OnTimeout());
```

---

## LTDescr Chaining

All methods return `LTDescr` and can be chained in any order:

```csharp
LTDescr tween = LeanTween.moveX(gameObject, 5f, 2f)
    .setEase(LeanTweenType.easeOutBack)
    .setDelay(0.5f)
    .setLoopPingPong(3)
    .setOnComplete(() => Debug.Log("Done"))
    .setOnUpdate(val => Debug.Log(val));
```

### Timing

| Method | Description |
|--------|-------------|
| `.setDelay(float)` | Delay start by N seconds |
| `.setUseFrames(bool)` | Measure duration in frames instead of seconds |
| `.setUseEstimatedTime(bool)` | Use unscaled time (`Time.unscaledDeltaTime`) — useful for pause menus where `timeScale = 0` |
| `.setIgnoreTimeScale(bool)` | Alias for unscaled time |

### Easing

```csharp
.setEase(LeanTweenType.easeOutBounce)
.setEase(myAnimationCurve) // Unity AnimationCurve asset
```

### Looping

| Method | Description |
|--------|-------------|
| `.setLoopClamp(int)` | Restart from beginning on each loop; -1 = infinite |
| `.setLoopPingPong(int)` | Reverse direction on each loop; -1 = infinite |
| `.setRepeat(int)` | Repeat N times; -1 = infinite |
| `.setLoopOnce()` | Play once (default) |
| `.setOnCompleteOnRepeat(bool)` | Fire `onComplete` callback after each loop iteration, not just the final one |

### From / To

```csharp
// Animate FROM a specific value TO the current value
LeanTween.moveX(gameObject, 0f, 1f).setFrom(10f);
// Object starts at X=10 and moves to X=0
```

### Callbacks

| Method | Signature | Description |
|--------|-----------|-------------|
| `.setOnStart(Action)` | `() => {}` | Fires once before the tween begins |
| `.setOnUpdate(Action<float>)` | `val => {}` | Fires every frame with interpolated float value |
| `.setOnUpdate(Action<Vector3>)` | `val => {}` | Fires every frame with interpolated Vector3 |
| `.setOnUpdate(Action<Color>)` | `val => {}` | Fires every frame with interpolated Color |
| `.setOnUpdate(Action<float, object>)` | `(val, obj) => {}` | Frame callback + custom object |
| `.setOnUpdateParam(object)` | `someObject` | Sets the object passed to `setOnUpdate(Action<float,object>)` |
| `.setOnComplete(Action)` | `() => {}` | Fires when tween finishes |
| `.setOnComplete(Action<object>)` | `obj => {}` | Fires with custom object on completion |
| `.setOnCompleteParam(object)` | `someObject` | Sets the object passed to `setOnComplete(Action<object>)` |
| `.setOnCompleteOnStart(bool)` | `true` | Also fire `onComplete` when starting (for reversed tweens) |

### Other Options

| Method | Description |
|--------|-------------|
| `.setOrientToPath(bool)` | Rotate the object to face movement direction when using spline paths |
| `.setDestroyOnComplete(bool)` | Destroy the `gameObject` when the tween finishes |
| `.setPoint(Vector3)` | Sets the rotation center for `rotateAround` in local space |
| `.setRecursive(bool)` | Apply alpha/color to children recursively |

---

## Easing Types

Pass to `.setEase(LeanTweenType)`:

| Category | Values |
|----------|--------|
| Linear | `linear` |
| Quad | `easeInQuad`, `easeOutQuad`, `easeInOutQuad` |
| Cubic | `easeInCubic`, `easeOutCubic`, `easeInOutCubic` |
| Quart | `easeInQuart`, `easeOutQuart`, `easeInOutQuart` |
| Quint | `easeInQuint`, `easeOutQuint`, `easeInOutQuint` |
| Sine | `easeInSine`, `easeOutSine`, `easeInOutSine` |
| Expo | `easeInExpo`, `easeOutExpo`, `easeInOutExpo` |
| Circ | `easeInCirc`, `easeOutCirc`, `easeInOutCirc` |
| Elastic | `easeInElastic`, `easeOutElastic`, `easeInOutElastic` |
| Back (overshoot) | `easeInBack`, `easeOutBack`, `easeInOutBack` |
| Bounce | `easeInBounce`, `easeOutBounce`, `easeInOutBounce` |
| Spring | `easeSpring` |
| Punch | `punch` |
| AnimationCurve | Pass `AnimationCurve` object — full custom control |

---

## Sequences (LTSeq)

Use `LeanTween.sequence()` to chain tweens one after another:

```csharp
LTSeq seq = LeanTween.sequence();

// Add a 1-second delay before everything starts
seq.append(1f);

// Fire a callback before the first tween
seq.append(() => Debug.Log("Starting sequence"));

// Append tweens — each starts after the previous finishes
seq.append(LeanTween.move(gameObject, new Vector3(5f, 0f, 0f), 1f).setEaseOutQuad());
seq.append(LeanTween.scale(gameObject, Vector3.one * 2f, 0.5f));

// Fire a callback after a tween completes
seq.append(() => Debug.Log("Tweens done"));

// Insert plays in parallel with the PREVIOUS append without pushing back subsequent tweens
seq.append(LeanTween.rotateY(gameObject, 180f, 1f));
seq.insert(LeanTween.alpha(gameObject, 0.5f, 0.5f));   // runs alongside rotateY
```

### Sequence Control

```csharp
// Adjust playback speed (e.g., 2f = double speed)
seq.setScale(2f);

// Cancel the entire sequence
LeanTween.cancel(seq.id);
```

> **Note**: `append()` advances the sequence cursor — the next tween starts after the appended one completes. `insert()` branches off at the current cursor position without advancing it, enabling parallel animations.

---

## Lifecycle Control

### Instance Control (via saved LTDescr or tween id)

```csharp
// Save the tween descriptor
LTDescr tween = LeanTween.moveX(gameObject, 5f, 2f);
int tweenId = tween.id;

// Control via descriptor
tween.pause();
tween.resume();
tween.cancel();

// Control via id
LeanTween.pause(tweenId);
LeanTween.resume(tweenId);
LeanTween.cancel(tweenId);
```

### Global Control (by GameObject)

```csharp
// Pause / resume all tweens on a specific GameObject
LeanTween.pause(gameObject);
LeanTween.resume(gameObject);
LeanTween.cancel(gameObject);            // cancel all tweens on the object
LeanTween.cancel(gameObject, callOnComplete: true); // cancel and fire onComplete

// Check if any tween is active on the object
bool isAnimating = LeanTween.isTweening(gameObject);
bool isSpecific  = LeanTween.isTweening(tweenId);
```

### Global Control (all tweens)

```csharp
LeanTween.cancelAll();
LeanTween.cancelAll(callOnComplete: true);
LeanTween.pauseAll();
LeanTween.resumeAll();
```

---

## Lifecycle & Memory Management

Always cancel tweens when the target GameObject is destroyed to prevent `MissingReferenceException`:

```csharp
private void OnDestroy()
{
    LeanTween.cancel(gameObject);
}
```

When storing a tween reference for reuse, kill it before creating a new one for the same property:

```csharp
private LTDescr _moveTween;

public void AnimateTo(Vector3 target)
{
    _moveTween?.cancel();
    _moveTween = LeanTween.move(gameObject, target, 0.3f);
}
```

---

## Event System

LeanTween includes a lightweight event bus for decoupled communication:

```csharp
// Define event ids as constants
public static class GameEvents
{
    public const int OnPlayerDied = 0;
    public const int OnLevelComplete = 1;
}

// Subscribe
LeanTween.addListener(gameObject, GameEvents.OnPlayerDied, OnPlayerDied);

void OnPlayerDied(LTEvent e)
{
    var data = e.data as PlayerData;
}

// Dispatch
LeanTween.dispatchEvent(GameEvents.OnPlayerDied);
LeanTween.dispatchEvent(GameEvents.OnPlayerDied, playerData); // with payload

// Unsubscribe
LeanTween.removeListener(gameObject, GameEvents.OnPlayerDied, OnPlayerDied);
```

> Always call `removeListener` in `OnDestroy()` to avoid callbacks firing on destroyed objects.

---

## Anti-patterns

**Not cancelling tweens on destroy.**
Always call `LeanTween.cancel(gameObject)` in `OnDestroy()`. Tweens targeting destroyed objects throw `MissingReferenceException`.

**Creating tweens in Update without cancelling previous ones.**
Each call allocates a new tween from the pool and fights with the previous one:
```csharp
// Wrong
void Update() { if (Input.GetMouseButton(0)) LeanTween.moveX(go, 5f, 0.3f); }

// Correct
void OnClick()
{
    LeanTween.cancel(go);
    LeanTween.moveX(go, 5f, 0.3f);
}
```

**Exceeding the tween pool limit.**
The default pool is 400 tweens. When the limit is exceeded, LeanTween silently fails to create new tweens. Call `LeanTween.init(N)` at startup if you expect more than 400 simultaneous tweens.

**Using `rotate` for rotations > 180°.**
Quaternion interpolation takes the short path. Use `rotateAround` to guarantee a specific rotation direction and amount.

**Applying `alpha`/`color` to sprites without correct shader.**
`LeanTween.alpha` modifies the material's `_Color.a`. The shader must support transparency (e.g., Sprites/Default already does). Standard shader requires Rendering Mode set to Fade or Transparent.

**Not unsubscribing event listeners.**
If the listener `gameObject` is destroyed before `removeListener` is called, callbacks will fire on a null object. Always unsubscribe in `OnDestroy()`.

**Assuming `setFrom` schedules a jump.**
`setFrom` sets the starting value when the tween *begins*, not when `.setFrom()` is called. This is different from DOTween's `.From()` which jumps immediately.

**Using string callbacks.**
LeanTween supports legacy string-based callbacks (`"MethodName"`). Always use `Action` lambdas or method references instead — strings are untyped, not refactorable, and slower.
