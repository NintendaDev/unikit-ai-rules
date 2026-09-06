---
version: 1.1.0
---

# Feel (MMFeedbacks)

> **Scope**: MoreMountains Feel library for adding game feel in Unity — MMF_Player setup and scripting, feedback sequencing, timing configuration, shakers and springs, render-pipeline requirements, the event system, runtime modification, and custom feedback authoring.
> **Load when**: adding game feel or juice with Feel/MMFeedbacks, scripting MMF_Player, picking which feedback fits an effect, wiring shakers or post-process volumes, tuning a scene's impact feel, creating custom feedback classes, configuring playback events, modifying feedbacks at runtime, sequencing screen shakes or animations via Feel.
> **References**: `.unikit/memory/code/stack/references/feel-quickref.md` (quick lookup — always open first), `.unikit/memory/code/stack/references/feel-feedbacks-full.md` (exhaustive index of all 199 feedbacks), `.unikit/memory/code/stack/references/feel-tools-full.md` (exhaustive index of tools, shakers, springs, haptics), `.unikit/memory/code/stack/references/feel-use-cases.md` (20 ready-made recipes)

---

## Core Concepts

- **MMF_Player** is the current (v3.0+) component — use it for all new code. The legacy `MMFeedbacks` class was deprecated in 2022 and fully phased out in 2024; it persists only for backward compatibility.
- An **MMF_Player** holds an ordered sequence of feedbacks. Every feedback in the list is played together (with individual timing offsets) when the player is triggered.
- Feedbacks are data objects, not MonoBehaviours — they live inside the MMF_Player inspector and are serialized with it.
- Use `[SerializeField] private MMF_Player _feedbackPlayer;` (not public) to reference players in code, in line with the project code-style rules.
- Feel splits into three layers, and knowing which layer an effect lives in is what makes it findable:
  - **Feedbacks** — what you add to an MMF_Player list (199 of them).
  - **Shakers** — components placed on the *affected* object that receive a feedback's event and animate the property. Post-process, camera and audio-filter feedbacks do nothing without one.
  - **Tools** — standalone systems (`MMSoundManager`, `MMTimeManager`, `MMProgressBar`, `MMFloatingTextSpawner`, pooling, MMRadio…) that some feedbacks drive and that are also usable on their own.

---

## Feedback & Tool Lookup Workflow

Feel ships 199 feedbacks and several hundred tool classes. **Never guess a feedback or
class name** — the naming is regular enough to invent plausible-but-nonexistent types.

1. **First** — open `references/feel-quickref.md`. It carries an intent → feedback table,
   the most-used feedbacks per category, the key tools, and the ten rules that prevent
   most mistakes. This covers the large majority of tasks.
2. **If the quick reference has no match** — open the matching exhaustive index:
   - a feedback (something you add to an MMF_Player list) → `references/feel-feedbacks-full.md`
   - a shaker, spring, manager, helper or the haptics API → `references/feel-tools-full.md`
3. **When building or tuning a whole effect** rather than looking up one name, read the
   matching block in `references/feel-use-cases.md` (see the index below) — it gives the
   full stack in order, with delays, required scene components and tuning numbers.
4. **When a feedback is missing from the inspector dropdown**, it was compiled out.
   Check the package and define requirements in §"Render pipelines and defines", then run
   `Tools > More Mountains > MMFeedbacks > Output MMF_Feedbacks list` to see exactly what
   is available in this project.

---

## Use Cases Index

One line per recipe. Open only the matching block in
`references/feel-use-cases.md` — do not read the whole file.

| Case | What it covers |
|---|---|
| CASE-01 | Hit impact on an enemy — the reference stack every other impact is derived from. |
| CASE-02 | Enemy death and destruction, including how to destroy safely after a sequence. |
| CASE-03 | Player takes damage — screen-space effects, intensity scaled by damage. |
| CASE-04 | UI button press and hover, including the direction-flip hover pattern. |
| CASE-05 | Card in hand — tap, flip and highlight as separate players on one prefab. |
| CASE-06 | Jump and landing with squash-and-stretch, scaled by fall speed. |
| CASE-07 | Pickup and loot collect on pooled objects. |
| CASE-08 | Screen shake budget and layering rules when several systems shake at once. |
| CASE-09 | Floating damage numbers — passing the value, criticals, labelled feedbacks. |
| CASE-10 | Progress bars (health, XP, cooldown) with MMProgressBar and springs. |
| CASE-11 | Weapon fire — muzzle, spring recoil, casings, high fire rates. |
| CASE-12 | Scene transition and level start, with a persistent fader. |
| CASE-13 | Slot machine / spinning wheel / gacha reveal using the loop primitives. |
| CASE-14 | Music-driven and rhythmic feedbacks via MMAudioAnalyzer or MMSequencer. |
| CASE-15 | Mobile haptics layering — event class to preset mapping, settings wiring. |
| CASE-16 | 2D platformer and arcade feel — substitutions for orthographic projects. |
| CASE-17 | Placement confirm — separate valid and invalid stacks. |
| CASE-18 | Inventory, crafting and reward reveal escalating by rarity. |
| CASE-19 | Dialogue line reveal with skip-to-end. |
| CASE-20 | Victory / defeat screens and sustained tutorial highlights. |

---

## API / Interface

### MMF_Player — core methods

```csharp
// Initializes the player and all feedbacks. Runs on Start by default.
// Call again after any runtime property changes.
player.Initialization();

// Play the feedback sequence
player.PlayFeedbacks();

// Play with world position and intensity (feedbacks that use them will respond)
player.PlayFeedbacks(transform.position, intensity: 1f);

// Async: awaitable — waits until the sequence completes
await player.PlayFeedbacksTask(transform.position);

// Stop sequence AND interrupt active feedbacks
player.StopFeedbacks();

// Stop sequence but let already-started feedbacks finish
player.StopFeedbacks(false);

// Skip to the end — puts all targets in final state
// CAUTION: requires the player to be playing; may take up to 3 frames
player.SkipToTheEnd();

// Revert all targets to their initial values
player.RestoreInitialValues();  // prefer over the legacy ForceInitialValues()

// Reset state (clear loops, timers, etc.)
player.ResetFeedbacks();
```

### Direction control

The list can play bottom-to-top, which turns one player into a reversible pair
(open/close, hover in/out) without authoring a second stack.

```csharp
player.SetDirection(MMFeedbacks.Directions.BottomToTop);
player.PlayFeedbacks();

player.ChangeDirection();               // flip the current direction
player.PlayFeedbacksInReverse();        // one-off reverse play
player.PlayFeedbacksOnlyIfReversed();   // no-op unless currently reversed
player.PlayFeedbacksOnlyIfNormalDirection();
```

### Accessing feedbacks at runtime

```csharp
// Get first feedback of type
MMF_Scale scaleF = player.GetFeedbackOfType<MMF_Scale>();

// Get first feedback of type with matching label
MMF_Scale scaleF = player.GetFeedbackOfType<MMF_Scale>("HitScale");

// Get all feedbacks of type
List<MMF_Scale> scales = player.GetFeedbacksOfType<MMF_Scale>();

// Positional access relative to an index — First, Previous, Closest, Next, Last
MMF_Scale next = player.GetFeedbackOfType<MMF_Scale>(
    MMF_Player.AccessMethods.Next, referenceIndex: 3);
```

### Modifying feedbacks at runtime

```csharp
MMF_Scale scale = player.GetFeedbackOfType<MMF_Scale>();
scale.Duration = 0.3f;

// After any timing change — recompute the cached total duration
player.ComputeCachedTotalDuration();

// After any cached property change — re-initialize before playing
player.Initialization();

player.PlayFeedbacks();
```

### Adding / removing feedbacks at runtime

```csharp
var scale = new MMF_Scale();
scale.Label = "PunchScale";
scale.AnimateScaleDuration = 0.2f;
player.AddFeedback(scale);

player.RemoveFeedback(index: 0);

// Copy all feedbacks and settings from another player
player.CopyPlayerFrom(otherPlayer);
player.CopyFeedbackListFrom(otherPlayer);   // feedbacks only
player.AddFeedbackListFrom(otherPlayer);    // append feedbacks from other
```

### Channel-based control (no direct reference required)

```csharp
// Broadcast to all MMF_Players listening on channel 12
MMChannelData channelData = new MMChannelData(MMChannelModes.Int, 12, null);
MMF_PlayerEvent.Trigger(channelData, true, transform.position, MMF_PlayerEvent.Modes.PlayFeedbacks);
```

Prefer a `MMChannel` ScriptableObject asset over a raw integer — an asset reference is
refactor-safe and reads as documentation in the inspector:

```csharp
MMChannelData channelData = new MMChannelData(MMChannelModes.MMChannel, 0, _hitChannelAsset);
```

---

## Patterns & Examples

### Standard usage pattern

```csharp
using MoreMountains.Feedbacks;
using UnityEngine;

public class PlayerHit : MonoBehaviour
{
    [SerializeField] private MMF_Player _hitFeedbacks;
    [SerializeField] private MMF_Player _deathFeedbacks;

    public void OnHit()
    {
        _hitFeedbacks.PlayFeedbacks(transform.position, intensity: 1f);
    }

    public async void OnDeath()
    {
        await _deathFeedbacks.PlayFeedbacksTask(transform.position);
        // safe to proceed — sequence has finished
        Destroy(gameObject);
    }
}
```

### Reacting to completion

```csharp
// Option A — Unity Events (set TriggerUnityEvents = true on the player)
private void OnEnable()
{
    _feedbackPlayer.Events.OnComplete.AddListener(HandleComplete);
}
private void OnDisable()
{
    _feedbackPlayer.Events.OnComplete.RemoveListener(HandleComplete);
}

// Option B — MMFeedbacksEvents bus (set TriggerMMFeedbacks = true on the player)
public void OnMMFeedbacksEvent(MMFeedbacks source, MMFeedbacksEvent.EventTypes type)
{
    if (type == MMFeedbacksEvent.EventTypes.Complete)
        Debug.Log($"{source.name} finished");
}
private void OnEnable() => MMFeedbacksEvent.Register(OnMMFeedbacksEvent);
private void OnDisable() => MMFeedbacksEvent.Unregister(OnMMFeedbacksEvent);

// Option C — async/await (simplest for sequential logic)
await _feedbackPlayer.PlayFeedbacksTask(transform.position);
```

### Passing a gameplay value into the stack

The play intensity is the idiomatic channel for "how big was this event". Feedbacks
that use it (floating text value, shake amplitude, particle count) scale automatically.

```csharp
float normalized = Mathf.Clamp01(damage / _maxHealth);
_hitFeedbacks.PlayFeedbacks(hitPoint, normalized);
```

---

## Shakers

A shaker sits on the object being affected and listens for the feedback's event. This
indirection is what lets one feedback drive many targets on a channel — and it is also
the single most common reason a feedback "does nothing".

**Which feedbacks need one**: every post-process feedback, the camera feedbacks
(`Camera Shake`, `Camera Zoom`, `Field of View`, `Orthographic Size`, `Clipping Planes`),
the audio-filter and AudioSource-property feedbacks, the `*Shake` transform feedbacks,
`Flash` (`MMFlash`), `Fade` (`MMFader`), and remote `Feedbacks Player`
(`MMFeedbacksShaker`). The full mapping is in `references/feel-tools-full.md` §2.

**Setting one up**: 40 feedbacks expose an **Automatic Shaker Setup** button in their
inspector — it creates the shaker, and for post-process feedbacks the Volume and
override too. Use it; the manual path is only worth it when the volume already exists
and must not be duplicated.

**Shaker-side settings that matter**

| Setting | Effect |
|---|---|
| `OnlyUseShakerValues` | The shaker's own tuning wins over the feedback's. Set this when many different feedbacks trigger the same visual and should look identical. |
| `Interruptible` | Whether a new shake can cut off the current one. |
| `PermanentShake` | Shakes forever until stopped — sustained states, not events. |
| `CooldownBetweenShakes` | Guards against spam-triggered stacking. |
| `TimescaleMode` | Set to `Unscaled` for anything that must keep animating during a freeze frame or pause. |

Shakers can also be driven directly from code, bypassing feedbacks entirely:

```csharp
// Fire a camera shake from anywhere — caught by MMCameraShaker / MMCinemachineCameraShaker
MMCameraShakeEvent.Trigger(
    duration: 0.3f, amplitude: 2f, frequency: 20f,
    amplitudeX: 2f, amplitudeY: 2f, amplitudeZ: 0f,
    infinite: false,
    channelData: new MMChannelData(MMChannelModes.Int, 0, null),
    useRange: false);

// One-line hit stop, caught by MMTimeManager
MMFreezeFrameEvent.Trigger(0.03f);

// Screen fade, caught by an MMFader
MMFadeEvent.Trigger(0.5f, 0f, MMTween.MMTweenCurve.EaseInOverhead, 0, false, Vector3.zero);
```

---

## Springs

Springs are a second animation model alongside curve-based feedbacks: no fixed duration,
physically damped, and **re-targetable mid-flight**.

**Choose springs when the effect can be re-triggered before it finishes** — UI buttons,
pickups, repeated hits, full-auto recoil. A curve feedback restarts from its beginning
and reads as a stutter; a spring absorbs the new target and keeps its velocity.

Two ways to use them:

- `Transform/Position Spring`, `Rotation Spring`, `Scale Spring`,
  `Squash and Stretch Spring` — self-contained, target a transform directly.
- `Springs/Spring Float | Vector2 | Vector3 | Vector4 | Color` — drive a spring
  **component** (`MMSpringImageFillAmount`, `MMSpringLightIntensity`,
  `MMSpringTMPFontSize`, …). Use these to spring a property that has no dedicated
  feedback. The component catalogue is in `references/feel-tools-full.md` §3.

Modes on every spring feedback: `MoveTo` (settle at a new value),
`MoveToAdditive` (offset from current), `Bump` (impulse, returns to rest).

Spring components are also directly drivable from code:

```csharp
[SerializeField] private MMSpringScale _scaleSpring;

public void OnHit()   => _scaleSpring.Bump(75f);       // impulse, settles on its own
public void OnEquip() => _scaleSpring.MoveTo(1.2f);    // new resting value
public void OnReset() => _scaleSpring.RestoreInitialValue();
```

Subscribe to `OnEquilibriumReached` when logic must wait for the spring to settle.

---

## Render pipelines and defines

Feel ships three parallel implementations of every post-process feedback, guarded by
scripting define symbols. **A feedback whose define is missing does not exist** — it is
absent from the dropdown and from `GetFeedbackOfType<T>()`, with no error to explain why.

| Pipeline | Define | Feedback suffix | Shaker suffix |
|---|---|---|---|
| Built-in + Post Processing Stack v2 | (none, needs the package) | none | none |
| URP | `MM_URP` | `… URP` | `…Shaker_URP` |
| HDRP | `MM_HDRP` | `… HDRP` | `…Shaker_HDRP` |

Rules:

- Set the define for the project's pipeline in `Project Settings > Player > Scripting
  Define Symbols` for **every** build target the project ships to. Missing it on one
  platform produces a build that compiles locally and fails in CI.
- Never mix families in one scene — a URP project must use only `… URP` feedbacks with
  `…Shaker_URP` components on a URP `Volume`.
- URP also gates `Lights/Light2D_URP` and `MMVolumeBlendShaker_URP` behind `MM_URP`.
- Other feedbacks have package dependencies rather than defines: Cinemachine, TextMeshPro,
  Visual Effect Graph, and the legacy Post Processing package. Missing packages remove
  their feedbacks the same silent way.
- **Demo scenes**: `FeelDemos/` holds the built-in-pipeline versions. The URP versions
  ship as `FeelDemosURP/FeelDemosURP.unitypackage` and must be imported by double-clicking
  it inside Unity — importing **overwrites** the same scenes and materials with URP
  variants rather than creating a parallel folder. HDRP works the same way.

---

## Configuration

### Initialization Mode (player-level)

| Mode | Behaviour |
|------|-----------|
| `Start` | Initializes automatically on Start. Recommended default. |
| `Awake` | Initializes on Awake — useful when dependent systems also initialize in Awake. |
| `Script` | Manual — caller must invoke `Initialization()` before the first play. |

### Player-level sequence settings

| Setting | Description |
|---------|-------------|
| Direction | Play feedbacks top-to-bottom (default) or bottom-to-top. |
| Auto Change Direction on End | Reverses direction after each play (ping-pong). |
| Feedbacks Intensity | Global amplitude multiplier — 1 = full, 0.5 = half, 0 = silent. |
| Duration Multiplier | Scales all feedback durations uniformly. |
| Force TimeScale Mode | Override to scaled or unscaled (ignoring game pause). |
| Randomize Duration | Adds per-play random variance to durations. |
| Performance Mode | Skips some editor-side bookkeeping. Enable on players that fire many times per second (per-beat, per-projectile). |
| Restore Initial Values On Disable | Reverts targets when the object is disabled — required for pooled objects. |
| Stop Feedbacks On Disable | Interrupts the sequence on disable instead of leaving it mid-flight. |
| Keep Play Mode Changes | Preserves runtime tweaks when exiting play mode. |

### Per-feedback timing settings (Timing foldout)

| Setting | Description |
|---------|-------------|
| Initial Delay | Seconds before this feedback starts after the player is triggered. |
| Cooldown Duration | Minimum time before this feedback can fire again. |
| Chance (0–100) | Probability this feedback executes on each play. |
| InterruptsOnStop | If false, the feedback finishes even when `StopFeedbacks()` is called. |

### Range-based execution

| Setting | Description |
|---------|-------------|
| Only Play If Within Range | Skip the whole player if the listener is out of range. |
| RangeCenter | Reference transform (player, camera, etc.). |
| RangeDistance | Maximum active distance in world units. |
| UseRangeFalloff | Reduces intensity with distance via an AnimationCurve. |

Range is the cheapest optimisation for scenes with many identical emitters — off-screen
explosions cost nothing instead of shaking a camera that cannot see them.

### Global feedback authorization

`MMFeedbacksAuthorizations` on one empty scene object exposes a checkbox per feedback
type and disables the unchecked ones globally. Use it to wire accessibility and platform
switches (no camera shake, no haptics, no post-process) from one place instead of editing
every player.

---

## Custom Feedbacks

### Creating a new feedback from scratch

Inherit from `MMF_Feedback` (not the old `MMFeedback`). Place the file anywhere; no special folder required.

```csharp
using UnityEngine;
using MoreMountains.Tools;

namespace MoreMountains.Feedbacks
{
    [AddComponentMenu("")]
    [System.Serializable]
    [FeedbackHelp("Describe what this feedback does.")]
    [FeedbackPath("Category/MyFeedbackName")]
    public class MMF_MyFeedback : MMF_Feedback
    {
        public static bool FeedbackTypeAuthorized = true;
        public override float FeedbackDuration => 0f;

        #if UNITY_EDITOR
        public override Color FeedbackColor => MMFeedbacksInspectorColors.DebugColor;
        #endif

        protected override void CustomInitialization(MMF_Player owner)
        {
            base.CustomInitialization(owner);
            // cache references here
        }

        protected override void CustomPlayFeedback(Vector3 position, float feedbacksIntensity = 1f)
        {
            if (!Active || !FeedbackTypeAuthorized) return;
            // trigger the effect here
        }

        protected override void CustomStopFeedback(Vector3 position, float feedbacksIntensity = 1f)
        {
            if (!FeedbackTypeAuthorized) return;
            // cancel or interrupt the effect here
        }

        // override CustomReset() to restore initial state if needed
    }
}
```

### Extending an existing feedback

Prefer inheritance over copy-paste when you need minor modifications:

```csharp
[FeedbackPath("TextMesh Pro/TMP Count To With Suffix")]
public class MMF_TMPCountToSuffix : MMF_TMPCountTo
{
    public string Suffix = "$";

    protected override void UpdateText(float currentValue)
    {
        base.UpdateText(currentValue);
        TargetTMPText.text += Suffix;
    }
}
```

Before writing a custom feedback, check `GameObject/Property` — it animates any exposed
field or property on any component via reflection and covers most one-off needs without
a new class.

---

## Best Practices

- **Always use MMF_Player**, never the legacy `MMFeedbacks` component, for new code.
- **Use Start initialization mode** for standard MonoBehaviour workflows.
- After modifying any feedback's **timing** property at runtime, call `ComputeCachedTotalDuration()` before playing.
- After modifying any **cached** property at runtime, call `Initialization()` before playing.
- Use `RestoreInitialValues()` instead of the legacy `ForceInitialValues()`.
- Use `StopFeedbacks(false)` when you want to stop scheduling new feedbacks but allow in-progress ones to finish.
- Call `SkipToTheEnd()` only when the player is already playing — it is a no-op on a stopped player and takes up to 3 frames to complete.
- Use channel-based events (`MMF_PlayerEvent.Trigger`) to control multiple MMF_Players from a single call without coupling; prefer a `MMChannel` asset over an integer channel.
- Enable `TriggerMMFeedbacks = true` on the player before subscribing to `MMFeedbacksEvent`; enable `TriggerUnityEvents = true` before wiring Unity Events.
- Always register/unregister `MMFeedbacksEvent` listeners in `OnEnable` / `OnDisable`.
- Use the **Keep Playmode Changes** button in the inspector to preserve runtime tweaks across sessions.
- When duplicating an MMF_Player's feedback list, use the **Copy All** button inside the inspector — not Unity's "copy component values".
- Prefer `GetFeedbackOfType<T>("Label")` over `GetFeedbackOfType<T>()` when a player has multiple feedbacks of the same type — and label every feedback that code touches.
- Press **Automatic Shaker Setup** rather than hand-wiring post-process volumes and shakers.
- Prefer **springs over curves** for anything the player can re-trigger before it finishes.
- Use `Pause/Holding Pause`, not `Pause/Pause`, when a stage must wait for everything above it to finish.
- Set `RestoreInitialValuesOnDisable = true` on players that live on pooled objects.
- Enable `PerformanceMode` on players that fire many times per second.
- Use range settings on world-space emitters so off-screen events cost nothing.
- Scale effects with the play intensity argument instead of authoring one player per magnitude.
- Add `Debug/Comment` feedbacks to label the stages of a long stack — they cost nothing at runtime.

---

## Anti-Patterns

- **Never copy feedbacks via Unity's "copy component values"** — internal serialization breaks silently. Use Feel's dedicated Copy/Paste buttons.
- **Never call `SkipToTheEnd()` on a stopped player** — it requires active playback.
- **Never use `ForceInitialValues()`** — it is a legacy shim that plays and immediately stops. Use `RestoreInitialValues()`.
- **Never modify feedback properties at runtime without calling `Initialization()` afterwards** — many feedbacks cache values at init time.
- **Never inherit from `MMFeedback`** (old API) for new custom feedbacks — inherit from `MMF_Feedback`.
- **Never destroy the GameObject that owns an MMF_Player right after `PlayFeedbacks()`** — await `PlayFeedbacksTask()`, or end the stack with `Holding Pause` + the `Destroy` feedback.
- **Never mix render-pipeline feedback families** in one scene, and never ship without the pipeline's define set on every build target.
- **Never use the `Haptics/Haptics DEPRECATED!` feedback** — it exists only to keep old scenes loading.
- **Don't assume a feedback did nothing because it is broken** — check for its missing shaker, missing scene manager (`MMTimeManager`, `MMSoundManager`, `MMFloatingTextSpawner`) or missing define first.
- **Don't fire feedbacks in a tight loop without cooldown** — set `CooldownDuration` on time-sensitive feedbacks to prevent thrashing.
- **Don't forget to guard `CustomPlayFeedback` with `if (!Active || !FeedbackTypeAuthorized) return;`** — without this guard the feedback ignores global disable toggles.
- **Don't run an infinite `Looper` without an explicit stop path** — `HasFeedbackStillPlaying()` never returns false and the only exit is `StopFeedbacks()`.

---

## Source Map

| Source | Used for |
|--------|----------|
| `Assets/Third-Party Assets/Feel/MMFeedbacks/**` | Feedback catalogue (199 entries with menu paths and descriptions), MMF_Player API surface, shaker list, spring components, pipeline define guards |
| `Assets/Third-Party Assets/Feel/MMTools/**` | Tool index — sound, UI, time, pooling, MMRadio, scene loading, utilities, debug tooling |
| `Assets/Third-Party Assets/Feel/NiceVibrations/**` | Haptics API (`HapticController`, `HapticPatterns`, `HapticSource`, `HapticReceiver`, presets) |
| `Assets/Third-Party Assets/Feel/FeelDemos/**`, `MMFeedbacks/Demos/**` (37 scenes and prefabs) | Use-case recipes — real feedback stacks, ordering and labelling conventions |
| `Assets/Third-Party Assets/Feel/FeelDemosURP/FeelDemosURP.unitypackage` | URP demo delivery model (overwrite-on-import), URP scene list |
| `Assets/Third-Party Assets/Feel/readme.txt` (Feel v5.9.1) | Version, package dependencies, URP/HDRP installation notes |
| Context7 `/websites/feel-docs_moremountains` | Automatic Shaker Setup, channel events, range options, hover/direction recipe, floating-text value passing, URP volume setup |
