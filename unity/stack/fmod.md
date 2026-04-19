---
version: 1.0.0
---

# FMOD

> **Scope**: FMOD Studio Unity integration — event playback patterns, EventInstance lifecycle management, bank loading, parameter control, mixer (Bus/VCA), 3D audio setup, and project configuration.
> **Load when**: playing audio with FMOD, creating or managing EventInstances, loading banks, setting event parameters, controlling mixer Bus or VCA, configuring 3D spatial audio, setting up FMOD in a new Unity project.

---

## Core Concepts

- **EventReference** — type-safe inspector field for selecting FMOD events. Use instead of deprecated `[EventRef] string` fields.
- **EventInstance** — a runtime copy of an FMOD Studio event. Multiple instances of the same event can play simultaneously. Every manually created instance must be released.
- **Bank** — binary container of audio assets built from FMOD Studio. Must be loaded before events inside it can be played.
- **Bus** — mixer group for routing and controlling sets of sounds (volume, mute, stop-all).
- **VCA** — Volume Control Automation; adjusts volume of a bus group without routing signals through it.
- **RuntimeManager** — the central Unity-side API helper. Entry point for creating instances, loading banks, and accessing the Studio system.
- **Studio Event Emitter** — a MonoBehaviour component for simple event playback without code. Good for prototyping; prefer scripted instances when parameter control is needed.

---

## Project Setup

- Disable Unity's built-in audio system in **Edit → Project Settings → Audio → Disable Unity Audio**. Required on Xbox; strongly recommended on all platforms to prevent resource conflicts.
- Match FMOD Studio and the Unity integration package to the **same version**. A mismatch causes `ERR_HEADER_MISMATCH` or `ERR_FORMAT` when loading banks.
- Replace the scene's `AudioListener` with the **FMOD Studio Listener** component.
- When updating FMOD, delete old platform native libs before importing the new package to avoid format errors.
- Use `EventReference` type for all event fields; never use raw `string` paths in inspector fields.

```csharp
// Correct
[SerializeField] private FMODUnity.EventReference _shootEvent;

// Deprecated — do not use
[FMODUnity.EventRef]
[SerializeField] private string _shootEvent;
```

---

## Bank Loading

FMOD loads banks configured in **FMOD Settings** automatically on startup. For dynamic loading (DLC, localization, addressables) manage banks manually:

```csharp
// Load a bank (preloads sample data: pass true as second arg to preload audio)
FMODUnity.RuntimeManager.LoadBank("Localization_RU", true);

// Unload when no longer needed
FMODUnity.RuntimeManager.UnloadBank("Localization_RU");
```

**Async loading pattern** — block scene activation until banks are ready:

```csharp
IEnumerator LoadWithBanks(string sceneName, string[] bankNames)
{
    var sceneLoad = SceneManager.LoadSceneAsync(sceneName);
    sceneLoad.allowSceneActivation = false;

    foreach (var bank in bankNames)
        FMODUnity.RuntimeManager.LoadBank(bank, true);

    // Wait for all banks to finish loading
    while (!FMODUnity.RuntimeManager.HaveAllBanksLoaded)
        yield return null;

    // Wait for sample data (streaming assets on mobile)
    while (FMODUnity.RuntimeManager.AnySampleDataLoading())
        yield return null;

    sceneLoad.allowSceneActivation = true;
}
```

Rules:
- The **Master Bank** and **Master Bank.strings** must always be loaded. The strings bank is required for all path-based lookups — without it, `FMOD_ERR_EVENT_NOTFOUND` is returned.
- When using Addressables for banks, automatic loading is disabled — load manually via `RuntimeManager.LoadBank`.

---

## Event Playback Patterns

### One-Shot (fire and forget)

Use for sounds that play once with no lifecycle control needed (footsteps, UI clicks, explosions).

```csharp
// 2D — no position
FMODUnity.RuntimeManager.PlayOneShot(_shootEvent);

// 3D — fixed position at call time (does NOT track object movement)
FMODUnity.RuntimeManager.PlayOneShot(_shootEvent, transform.position);

// 3D — follows the GameObject for the entire duration
FMODUnity.RuntimeManager.PlayOneShotAttached(_shootEvent, gameObject);
```

- `PlayOneShot(event, position)` anchors to the position given at call time. Use `PlayOneShotAttached` for moving sources.
- Parameters cannot be set on `PlayOneShot` calls. Use a manual `EventInstance` when parameters are needed.

### One-Shot with Parameters

```csharp
var instance = FMODUnity.RuntimeManager.CreateInstance(_healEvent);
instance.setParameterByName("FullHeal", restoreAll ? 1f : 0f);
instance.set3DAttributes(FMODUnity.RuntimeUtils.To3DAttributes(gameObject));
instance.start();
instance.release(); // release immediately — FMOD destroys it after it stops
```

### Managed EventInstance (loops, sustained sounds)

```csharp
private FMOD.Studio.EventInstance _engineLoop;

private void OnEnable()
{
    _engineLoop = FMODUnity.RuntimeManager.CreateInstance(_engineEvent);
    FMODUnity.RuntimeManager.AttachInstanceToGameObject(
        _engineLoop, transform, GetComponent<Rigidbody>());
    _engineLoop.start();
}

private void OnDisable()
{
    _engineLoop.stop(FMOD.Studio.STOP_MODE.ALLOWFADEOUT);
    _engineLoop.release();
}
```

---

## EventInstance Lifecycle

Every instance created with `CreateInstance` must be explicitly released — failing to do so causes a memory leak.

| Step | Method | Notes |
|------|--------|-------|
| Create | `RuntimeManager.CreateInstance(eventRef)` | Instance is stopped; 3D position defaults to far-off value |
| Position (3D) | `instance.set3DAttributes(...)` or `AttachInstanceToGameObject(...)` | Call before `start()` |
| Start | `instance.start()` | Begins playback |
| Stop | `instance.stop(STOP_MODE.ALLOWFADEOUT)` | Respects AHDSR release; use `IMMEDIATE` for hard cut |
| Release | `instance.release()` | Marks for async destruction when stopped; call after stop |

Calling `release()` immediately after `start()` is correct for one-shots — FMOD destroys the instance once it finishes naturally.

**3D positioning options:**

```csharp
// Manual update — call every frame (Update) to track position
instance.set3DAttributes(FMODUnity.RuntimeUtils.To3DAttributes(gameObject));

// Auto-track via RuntimeManager — also computes velocity for Doppler
FMODUnity.RuntimeManager.AttachInstanceToGameObject(instance, transform, rigidbody);
```

Prefer `AttachInstanceToGameObject` for moving sources — it handles Doppler via velocity automatically.

---

## Parameters

### Local Parameters (per instance)

```csharp
// By name (simpler, slight overhead per call)
instance.setParameterByName("Speed", 0.8f);

// Immediate — bypass seek speed
instance.setParameterByName("Speed", 0.8f, ignoreSeekSpeed: true);

// By ID (better performance in hot paths)
FMOD.Studio.PARAMETER_ID speedId;
// cache the ID once:
instance.getParameterDescriptionByName("Speed", out var desc);
speedId = desc.id;
// reuse each frame:
instance.setParameterByID(speedId, currentSpeed);
```

### Global Parameters (system-wide)

No instance reference required. Affects all events that reference the parameter.

```csharp
// By name
FMODUnity.RuntimeManager.StudioSystem.setParameterByName("DangerLevel", 0.75f);

// By ID
FMODUnity.RuntimeManager.StudioSystem.setParameterByID(globalParamId, 0.75f);
```

Use global parameters for game state (e.g., tension level, time of day) that affects multiple events simultaneously. Use local parameters for per-instance variation (e.g., material surface, vehicle RPM).

---

## Mixer Control

### Bus

```csharp
// Retrieve bus by path (matches FMOD Studio mixer hierarchy)
FMOD.Studio.Bus sfxBus = FMODUnity.RuntimeManager.GetBus("bus:/SFX");

// Volume (0.0 – 1.0; values above 1 are valid for gain)
sfxBus.setVolume(0.5f);

// Mute
sfxBus.setMute(true);

// Stop all events on bus (useful for level transitions)
sfxBus.stopAllEvents(FMOD.Studio.STOP_MODE.ALLOWFADEOUT);
```

### VCA

```csharp
FMOD.Studio.VCA musicVca = FMODUnity.RuntimeManager.GetVCA("vca:/Music");
musicVca.setVolume(0.7f); // maps to player's music volume setting
```

Expose Bus and VCA paths as `[SerializeField] private string` constants or `const string` in an audio manager class.

---

## Snapshots

Snapshots behave like looping events — start them with an instance, stop them when no longer needed.

```csharp
private FMOD.Studio.EventInstance _combatSnapshot;

void EnterCombat()
{
    _combatSnapshot = FMODUnity.RuntimeManager.CreateInstance(_combatSnapshotEvent);
    _combatSnapshot.start();
}

void ExitCombat()
{
    _combatSnapshot.stop(FMOD.Studio.STOP_MODE.ALLOWFADEOUT);
    _combatSnapshot.release();
}
```

---

## Sustain Points (Cues)

Advance playback through sustain points added in FMOD Studio.

```csharp
// Advances to the next sustain point
instance.triggerCue();
```

If `triggerCue()` is called before the playhead reaches the next point, that point is skipped. Multiple calls queue and execute in order.

---

## Anti-patterns

- **Never omit `release()`** after `CreateInstance`. Even one-shot instances must be released — FMOD does not auto-clean them.
- **Don't use `PlayOneShot(event, position)` for moving objects.** The position is captured at call time. Use `PlayOneShotAttached` instead.
- **Don't mix FMOD Studio and Unity integration versions.** Always upgrade both together.
- **Don't skip deleting old native libs when updating.** Leftover libs cause `ERR_HEADER_MISMATCH` and `ERR_FORMAT`.
- **Don't leave Unity's built-in audio enabled** on projects using FMOD, especially on console platforms.
- **Don't do path lookups without the strings bank loaded.** Result is `FMOD_ERR_EVENT_NOTFOUND`.
- **Don't combine `encryptionKey` with `loadBankMemory`.** They are incompatible — use file-based loading instead.
- **Don't cache `EventInstance` as a field and recreate it every `Update`.** Create once in `OnEnable`/`Start`, stop and release in `OnDisable`/`OnDestroy`.
- **Don't use raw string event paths in production code.** Use `EventReference` fields for refactoring safety and FMOD Studio live-linking.
