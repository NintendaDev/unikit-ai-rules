---
version: 1.0.0
---

# Feel (MMFeedbacks)

> **Scope**: MoreMountains Feel library for adding game feel in Unity — MMF_Player setup and scripting, feedback sequencing, timing configuration, event system, runtime modification, and custom feedback authoring.
> **Load when**: adding game feel or juice with Feel/MMFeedbacks, scripting MMF_Player, creating custom feedback classes, configuring playback events, modifying feedbacks at runtime, sequencing screen shakes or animations via Feel.

---

## Core Concepts

- **MMF_Player** is the current (v3.0+) component — use it for all new code. The legacy `MMFeedbacks` class was deprecated in 2022 and fully phased out in 2024; it persists only for backward compatibility.
- An **MMF_Player** holds an ordered sequence of feedbacks. Every feedback in the list is played together (with individual timing offsets) when the player is triggered.
- Feedbacks are data objects, not MonoBehaviours — they live inside the MMF_Player inspector and are serialized with it.
- Use `[SerializeField] private MMF_Player _feedbackPlayer;` (not public) to reference players in code, in line with the project code-style rules.

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

### Accessing feedbacks at runtime

```csharp
// Get first feedback of type
MMF_Scale scaleF = player.GetFeedbackOfType<MMF_Scale>();

// Get first feedback of type with matching label
MMF_Scale scaleF = player.GetFeedbackOfType<MMF_Scale>("HitScale");

// Get all feedbacks of type
List<MMF_Scale> scales = player.GetFeedbacksOfType<MMF_Scale>();
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

---

## Best Practices

- **Always use MMF_Player**, never the legacy `MMFeedbacks` component, for new code.
- **Use Start initialization mode** for standard MonoBehaviour workflows.
- After modifying any feedback's **timing** property at runtime, call `ComputeCachedTotalDuration()` before playing.
- After modifying any **cached** property at runtime, call `Initialization()` before playing.
- Use `RestoreInitialValues()` instead of the legacy `ForceInitialValues()`.
- Use `StopFeedbacks(false)` when you want to stop scheduling new feedbacks but allow in-progress ones to finish.
- Call `SkipToTheEnd()` only when the player is already playing — it is a no-op on a stopped player and takes up to 3 frames to complete.
- Use channel-based events (`MMF_PlayerEvent.Trigger`) to control multiple MMF_Players from a single call without coupling.
- Enable `TriggerMMFeedbacks = true` on the player before subscribing to `MMFeedbacksEvent`; enable `TriggerUnityEvents = true` before wiring Unity Events.
- Always register/unregister `MMFeedbacksEvent` listeners in `OnEnable` / `OnDisable`.
- Use the **Keep Playmode Changes** button in the inspector to preserve runtime tweaks across sessions.
- When duplicating an MMF_Player's feedback list, use the **Copy All** button inside the inspector — not Unity's "copy component values".
- Prefer `GetFeedbackOfType<T>("Label")` over `GetFeedbackOfType<T>()` when a player has multiple feedbacks of the same type.

---

## Anti-Patterns

- **Never copy feedbacks via Unity's "copy component values"** — internal serialization breaks silently. Use Feel's dedicated Copy/Paste buttons.
- **Never call `SkipToTheEnd()` on a stopped player** — it requires active playback.
- **Never use `ForceInitialValues()`** — it is a legacy shim that plays and immediately stops. Use `RestoreInitialValues()`.
- **Never modify feedback properties at runtime without calling `Initialization()` afterwards** — many feedbacks cache values at init time.
- **Never inherit from `MMFeedback`** (old API) for new custom feedbacks — inherit from `MMF_Feedback`.
- **Don't fire feedbacks in a tight loop without cooldown** — set `CooldownDuration` on time-sensitive feedbacks to prevent thrashing.
- **Don't forget to guard `CustomPlayFeedback` with `if (!Active || !FeedbackTypeAuthorized) return;`** — without this guard the feedback ignores global disable toggles.
