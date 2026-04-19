---
version: 1.0.0
---

# DOTween Pro

> **Scope**: DOTween Pro tweening library for Unity — tween creation and chaining, Sequence composition, tween lifecycle and control, global configuration, safe mode, recycling, callbacks, ease types, and DOTween Pro visual components (DOTweenAnimation, DOTweenPath, DOTweenVisualManager).
> **Load when**: animating values with DOTween, creating tweens or sequences, chaining SetEase/SetLoops/SetDelay, wiring tween callbacks, managing tween lifecycle (kill/pause/complete), configuring DOTween initialization, using DOTweenAnimation or DOTweenPath components, debugging tween errors or memory leaks, animating UI with DOTween.
> **References**: `.unikit/memory/stack/references/dotween-shortcuts.md` (shortcut methods catalog)

---

## Initialization & Global Settings

Always call `DOTween.Init()` before creating the first tween — typically in `Awake()` of a bootstrap/installer class:

```csharp
DOTween.Init(recycleAllByDefault: false, useSafeMode: true, LogBehaviour.ErrorsOnly)
       .SetCapacity(200, 50); // (maxTweeners, maxSequences)
```

If not called manually, DOTween auto-initializes with defaults on first tween creation. Prefer explicit init for predictable startup behavior.

**Key global settings** (set once at startup):

```csharp
DOTween.defaultAutoKill     = true;               // kill tweens on completion (default)
DOTween.defaultLoopType     = LoopType.Restart;
DOTween.defaultUpdateType   = UpdateType.Normal;
DOTween.defaultEaseType     = Ease.OutQuad;        // applied to all new Tweeners
DOTween.timeScale           = 1f;                  // global time scale
DOTween.useSafeMode         = true;                // handle destroyed targets gracefully
DOTween.logBehaviour        = LogBehaviour.ErrorsOnly;
```

**Capacity**: Call `DOTween.SetTweensCapacity(tweeners, sequences)` when you know the expected peak load. This prevents automatic (and expensive) mid-session resizing. Use the editor report (`Tools > Demigiant > DOTween Utility Panel`) to measure real peaks during play mode.

**Module setup**: After every DOTween update, re-run setup via `Tools > Demigiant > Setup DOTween...`. Activate only the modules for third-party assets (2D Toolkit, TextMesh Pro) that are actually in the project — unused modules cause compile errors.

---

## Core API

### Generic tween

```csharp
// Tween any readable/writable value via getter + setter lambdas
Tweener t = DOTween.To(() => myValue, x => myValue = x, endValue: 100f, duration: 1f);
```

### Virtual tween (no getter — only setter)

```csharp
Tweener t = DOTween.To(x => myValue = x, startValue: 0f, endValue: 100f, duration: 1f);
```

### Shortcut methods (preferred for Unity components)

```csharp
transform.DOMove(new Vector3(2, 2, 2), 1f);
transform.DOScale(2f, 0.5f);
rectTransform.DOAnchorPos(new Vector2(100, 0), 0.3f);
canvasGroup.DOFade(0f, 0.5f);
image.DOFillAmount(1f, 1f);
```

See `.unikit/memory/stack/references/dotween-shortcuts.md` for the full shortcut catalog.

### FROM tween

`.From()` animates *from* the specified value to the current value. **Warning**: the target immediately jumps to the FROM position the moment `.From()` is called — not when the tween starts.

```csharp
// Object jumps to X=100 immediately, then animates back to its original X
transform.DOMoveX(100f, 1f).From();

// Explicit FROM value
transform.DOMoveX(0f, 1f).From(100f);
```

---

## Tween Chaining

Chain configuration methods in any order before the tween starts playing:

```csharp
transform.DOMove(target, 1f)
    .SetEase(Ease.OutBack)
    .SetLoops(3, LoopType.Yoyo)
    .SetDelay(0.5f)
    .SetRelative()          // treat endValue as offset, not absolute position
    .SetAutoKill(false)     // keep in memory after completion for reuse
    .SetId("myTween")       // tag for bulk operations
    .SetUpdate(UpdateType.Late, isIndependentUpdate: true) // ignore Time.timeScale
    .OnComplete(() => Debug.Log("Done"));
```

**Ease types** — default is `Ease.OutQuad`. Notable types:

| Category | Options |
|----------|---------|
| Linear | `Ease.Linear` |
| Quad/Cubic/Quart/Quint | `In`, `Out`, `InOut` variants |
| Elastic | `InElastic`, `OutElastic`, `InOutElastic` |
| Bounce | `InBounce`, `OutBounce`, `InOutBounce` |
| Back (overshoot) | `InBack`, `OutBack`, `InOutBack` |
| Flash | `Flash`, `InFlash`, `OutFlash`, `InOutFlash` |
| Custom curve | Pass an `AnimationCurve` instead of `Ease` enum |

Use custom `AnimationCurve`: `SetEase(myCurve)` — works with any `AnimationCurve` asset.

**Loop types**: `LoopType.Restart` (default), `LoopType.Yoyo` (ping-pong), `LoopType.Incremental` (additive per loop). Use `-1` for infinite loops.

**UpdateType**: Use `UpdateType.Late` for UI elements that depend on layout calculation. Use `isIndependentUpdate: true` to ignore `Time.timeScale` — useful for pause menus.

---

## Callbacks

All callbacks are chainable and fire at specific lifecycle events:

```csharp
tween
    .OnStart(() => { })        // first time the tween begins playing
    .OnPlay(() => { })         // every time playback resumes (including initial play)
    .OnUpdate(() => { })       // every frame while active
    .OnStepComplete(() => { }) // on each loop iteration complete
    .OnComplete(() => { })     // when the tween finishes (all loops done)
    .OnRewind(() => { })       // when rewound to start
    .OnKill(() => { })         // when killed (cleanup point)
    .OnWaypointChange(i => { }); // path tweens only: on reaching a waypoint
```

Use `OnKill` to null-out cached tween references when `SetAutoKill(false)` is in use:

```csharp
_moveTween = transform.DOMoveX(100f, 1f)
    .SetAutoKill(false)
    .OnKill(() => _moveTween = null);
```

---

## Sequences

A `Sequence` groups tweens and controls them as a single unit. Composition methods must be called **before** the sequence starts.

```csharp
Sequence seq = DOTween.Sequence();

seq.Append(transform.DOMoveX(100f, 1f));            // add at current end
seq.Join(transform.DOFade(0f, 1f));                  // play simultaneously with last appended
seq.AppendInterval(0.5f);                            // pause between steps
seq.Insert(0f, transform.DOScale(2f, 2f));           // place at absolute time
seq.AppendCallback(() => Debug.Log("Midway"));
seq.InsertCallback(1.5f, SomeMethod);

seq.SetLoops(-1, LoopType.Yoyo)
   .SetEase(Ease.Linear)
   .OnComplete(() => Debug.Log("Sequence done"));
```

**Key rules for Sequences:**
- `Append` moves the sequence's "cursor" forward; `Join` adds at the cursor position without advancing it.
- Once a tween is nested inside a Sequence, control it through the Sequence — do not call `Play/Pause/Kill` on the nested tween directly.
- Nested tweens inherit the Sequence's `timeScale` and loop settings.
- Do not reuse a tween in multiple Sequences.

---

## Tween Control

**Instance methods** (called on a `Tween` / `Sequence` reference):

```csharp
tween.Play();          // resume (no-op if already playing)
tween.Pause();         // pause
tween.Kill();          // destroy; calls OnKill
tween.Complete();      // jump to end value; calls OnComplete then OnKill
tween.Restart();       // rewind and play from start
tween.Rewind();        // jump to start without playing
tween.TogglePause();
tween.Flip();          // reverse direction in-place
tween.Goto(atPosition: 0.5f, andPlay: true);
```

**Global methods** (operate on all tweens or by id/target):

```csharp
DOTween.PauseAll();
DOTween.KillAll(complete: false);       // kill all active tweens
DOTween.Kill(target);                   // kill by target object
DOTween.Kill("myId");                   // kill by string id
DOTween.Complete(target);
DOTween.Pause(target);
DOTween.PlayForward(target);
DOTween.PlayBackwards(target);
int count = DOTween.TweensById("myId"); // count active tweens with given id
```

---

## Lifecycle & Memory Management

**Kill tweens before their target is destroyed.** Do this in `OnDestroy()`:

```csharp
private void OnDestroy()
{
    _moveTween?.Kill();
    // Or kill all tweens targeting this object:
    DOTween.Kill(this);
    transform.DOKill();  // shortcut: kills all tweens on this transform
}
```

**Prefer `DOTween.Kill(target)` over manual reference tracking** when multiple tweens target the same object. Use `SetId` for logical groups that span multiple objects.

**Reusable tweens** (`SetAutoKill(false)`): the tween persists after completion and can be `Restart()`-ed. Null-check or track validity — the tween can still be killed externally.

**Recycling** (`DOTween.Init(recycleAllByDefault: true)`): tween objects are pooled. After enabling recycling, do not rely on the identity of a killed `Tween` reference — it may have been reused as a completely different tween.

**Safe mode** (`useSafeMode = true`): DOTween catches errors when targets are destroyed mid-animation. Slight performance cost. Keep enabled in development; can be disabled in production if you manage tween lifetimes manually.

---

## Async / Await (UniTask)

DOTween integrates with UniTask via the `AwaitForComplete()` extension:

```csharp
using Cysharp.Threading.Tasks;

await transform.DOMove(target, 1f).AwaitForComplete(cancellationToken: ct);
await DOTween.Sequence()
    .Append(transform.DOFade(0f, 0.3f))
    .AwaitForComplete();
```

Pass a `CancellationToken` to kill the tween when the token is cancelled.

---

## DOTween Pro Features

### DOTweenAnimation Component

Visual inspector-based animation — no code required. Attach to any GameObject, select animation type, adjust parameters in the Inspector, and call from code when needed:

```csharp
DOTweenAnimation anim = GetComponent<DOTweenAnimation>();
anim.DOPlay();
anim.DOPlayById("fadeIn");
anim.DORewind();
anim.DOKill();

// Access the underlying tween for runtime control
Tween t = anim.GetTween();
```

Supports: Transform (move/rotate/scale/punch/shake), Color/Fade, Fill amount, Text, CanvasGroup, Camera properties.

### DOTweenPath Component

Visual scene-based path editor. Draw waypoints in the Scene view; the object follows the path at runtime:

```csharp
DOTweenPath path = GetComponent<DOTweenPath>();
Tween t = path.GetTween();
```

**Limitations**: does not support path rotation or `RectTransform` (UI). For complex UI paths use `DOAnchorPos` sequences instead.

### DOTweenVisualManager

Attach to a GameObject to register callbacks for activation/deactivation events (useful for object pools):

- OnEnable → Restart, Play
- OnDisable → Rewind, Pause, Kill

Eliminates manual tween management boilerplate in pooled objects.

### TextMesh Pro — Per-Character Animation

Use `DOTweenTMPAnimator` for character-level deformation:

```csharp
DOTweenTMPAnimator animator = new DOTweenTMPAnimator(myTMPText);
for (int i = 0; i < animator.textInfo.characterCount; i++)
{
    animator.DOOffsetChar(i, new Vector3(0, 30f, 0), 0.3f)
            .SetDelay(i * 0.05f);
}
```

### DOSpiral (Pro only)

```csharp
// Spiral outward from current position
transform.DOSpiral(duration: 2f, axis: null, mode: SpiralMode.Expand, speed: 1f, frequency: 10f);
```

---

## Shortcuts Lookup Workflow

1. Need a shortcut for a specific Unity component? Open `.unikit/memory/stack/references/dotween-shortcuts.md`.
2. Find the component section (Transform, RectTransform, Material, Camera, UI, Rigidbody, etc.).
3. Locate the method signature and parameters.
4. Do NOT guess method names — always verify against the reference.

---

## Anti-patterns

**Not killing tweens on destroy.**
Tweens targeting destroyed objects cause `MissingReferenceException`. Always call `DOTween.Kill(target)` or `transform.DOKill()` in `OnDestroy()`.

**Calling `.From()` too late.**
`From()` jumps the target to the FROM value immediately on the line it is called. Calling it inside a coroutine delay or after a frame causes a visible pop. Set up FROM tweens before the first frame renders.

**Animating UI before layout is calculated.**
Layout groups calculate `RectTransform` sizes after `Awake`/`Start`. Starting a `DOAnchorPos` tween in `Start()` may capture wrong initial values. Use `SetUpdate(UpdateType.Late)` or delay with `SetDelay(0)` (executes next frame after layout).

**Relying on killed tween references when recycling is enabled.**
With `recycleAllByDefault: true`, a killed tween object can be reused internally. `tween.IsActive()` will return `true` for the new owner — not yours. Use `OnKill` to clear your reference.

**Creating tweens in `Update` without killing previous ones.**
Each call creates a new tween fighting with the previous one. Cache the tween and kill it before creating a new one:

```csharp
_moveTween?.Kill();
_moveTween = transform.DOMoveX(target, 0.3f);
```

**Modifying a Sequence after it has started.**
`Append`/`Join`/`Insert` are ignored once the Sequence is playing. Build the full Sequence before playing.

**Using `DOText` on TMP components.**
`DOText` targets legacy `UnityEngine.UI.Text`. For TextMesh Pro use `DOTweenTMPAnimator` or the `TMPro` module shortcuts (`text.DOText()`).

**Forgetting module activation.**
Pro modules (TextMesh Pro, 2D Toolkit) must be activated via the DOTween Utility Panel. Missing activation causes compile errors or missing extension methods.
