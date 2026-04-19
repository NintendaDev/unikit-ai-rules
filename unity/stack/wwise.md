---
version: 1.0.0
---

# Wwise Unity Integration

> **Scope**: Wwise audio middleware integration for Unity — posting events, managing SoundBanks, controlling States, Switches, and RTPCs via C# scripts, using Unity components (AkGameObj, AkEvent, AkAmbient, AkBank, AkInitializer), and spatial audio setup.
> **Load when**: implementing game audio with Wwise, posting Wwise events from C#, managing SoundBank loading and unloading, wiring States or Switches to game logic, controlling RTPCs from gameplay code, setting up spatial or ambient audio, debugging Wwise playback in Unity.

---

## Core Concepts

- **Events** — named actions defined in the Wwise Authoring Tool that trigger audio behaviors (play, stop, pause, seek).
- **SoundBanks** — compiled packages containing audio assets and metadata. Must be loaded before any event in them can be posted.
- **States** — global game conditions that affect audio across the entire project (e.g., `Music_State: Combat`). Set with `SetState`.
- **Switches** — per-object variations tied to a specific GameObject (e.g., `Surface_Type: Stone`). Set with `SetSwitch`.
- **RTPCs** (Real-Time Parameter Controls) — continuous float values that drive audio properties in real time (e.g., health, speed). Set with `SetRTPCValue`.
- **PlayingID** — `uint` handle returned by `PostEvent`. Use it to stop or query a specific event instance.
- **AkGameObj** — Unity component that registers a GameObject with the Wwise engine, enabling 3D positioning and spatial features.

---

## Setup & Configuration

### Recommended project layout
- Set the Wwise project path **outside** Unity's `Assets/` directory.
- Configure SoundBank output to `Assets/StreamingAssets/Audio/GeneratedSoundBanks`.
- Install via **Audiokinetic Launcher** → select Unity project → "Integrate Wwise into Project".

### Scene initialization
Add a **WwiseGlobal** GameObject with an `AkInitializer` component to every scene that uses audio. Only **one** `AkInitializer` is allowed per scene.

```csharp
// Safety check before posting — call during Awake/Start if initialization order is uncertain
if (!AkSoundEngine.IsInitialized())
{
    Debug.LogError("Wwise Sound Engine not initialized!");
    return;
}
```

### SoundBank generation
Generate SoundBanks in Wwise Authoring (F7 → SoundBank Manager). Organize by gameplay context:
- `Init` bank — always loaded; contains global settings and initialization data
- `UI` bank — interface sounds, loaded at startup
- `Combat` bank — loaded when entering combat; unloaded on exit
- `Music` bank — loaded per level or on demand

---

## Components

### AkInitializer
Engine entry point. Attach once to a persistent WwiseGlobal object. Holds initialization settings, `basePath`, language, pool sizes.

### AkGameObj
Registers a GameObject with Wwise for 3D positioning. Required for any emitter using spatial audio. Added automatically to GameObjects that call `PostEvent` — but add it explicitly on 3D emitters to control its properties.

Key properties:
- `isEnvironmentAware` — enables reverb/environment effects
- `isStaticObject` — optimization flag for non-moving emitters
- `scalingFactor` — affects distance attenuation curves
- `useDefaultListeners` — assigns to the default listener

### AkEvent
Declarative event posting via the Inspector. Assign a Wwise event and configure trigger lifecycle (Start, OnTriggerEnter, etc.) without code.

```csharp
// Component method — preferred when posting from another script
[SerializeField] private AkEvent akEventComponent;
akEventComponent.Post(gameObject);
```

### AkAmbient
Extends `AkEvent` for looping/continuous audio. Supports `MultiPositionType` — use it when many instances share the same event (saves memory by running a single voice).

### AkBank
Manages SoundBank lifecycle via the Inspector. Configure load/unload triggers (`triggerList` / `unloadTriggerList`) declaratively instead of writing code.

Properties: `loadAsynchronous` (prefer `true` for large banks), `decodeBank`, `saveDecodedBank`.

---

## API / Interface

### Event posting

```csharp
// String-based — works but error-prone; prefer typed reference below
AkSoundEngine.PostEvent("Play_Footstep", gameObject);

// Typed reference (AK.Wwise.Event) — Inspector-assignable, no magic strings
[SerializeField] private AK.Wwise.Event footstepEvent;

uint playingID = footstepEvent.Post(gameObject);

// Post with callback
footstepEvent.Post(gameObject, (uint)AkCallbackType.AK_END_OF_EVENT, OnEventEnd);

// Stop a specific instance
AkSoundEngine.StopPlayingID(playingID, fadeMs: 200,
    AkCurveInterpolation.AkCurveInterpolation_Linear);

// Execute action (Stop/Pause/Resume) on event by name
AkSoundEngine.ExecuteActionOnEvent("Play_Music",
    AkActionOnEventType.AkActionOnEventType_Stop, gameObject);
```

### SoundBank loading

```csharp
// Typed reference — preferred
[SerializeField] private AK.Wwise.Bank combatBank;

void OnEnable()  => combatBank.LoadAsync();
void OnDisable() => combatBank.Unload();

// With decode options
combatBank.Load(decode: true, saveDecoded: false);

// Low-level string API
AkSoundEngine.LoadBank("CombatBank", out uint bankID);
AkSoundEngine.UnloadBank("CombatBank");
```

### States (global)

```csharp
// String-based
AkSoundEngine.SetState("Music_State", "Combat");
AkSoundEngine.SetState("Music_State", "Exploration");

// Typed reference — preferred
[SerializeField] private AK.Wwise.State combatMusicState;
combatMusicState.SetValue();
```

### Switches (per-object)

```csharp
// String-based
AkSoundEngine.SetSwitch("Surface_Type", "Stone", gameObject);

// Typed reference — preferred
[SerializeField] private AK.Wwise.Switch stoneSwitch;
stoneSwitch.SetValue(gameObject);
```

### RTPCs

```csharp
// Per-object scope
AkSoundEngine.SetRTPCValue("Player_Health", healthValue, gameObject);

// Global scope (music intensity, etc.)
AkSoundEngine.SetRTPCValue("Music_Intensity", intensityValue, AK_INVALID_GAME_OBJECT);

// Typed reference — preferred
[SerializeField] private AK.Wwise.RTPC healthRtpc;
healthRtpc.SetValue(gameObject, healthValue);
healthRtpc.SetGlobalValue(globalValue);

// With interpolation time (ms) for smooth transitions
AkSoundEngine.SetRTPCValue("Speed", speedValue, gameObject, interpolationMs: 200);
```

---

## Patterns & Examples

### Footstep system (Switch + Event)

```csharp
public class FootstepController : MonoBehaviour
{
    [SerializeField] private AK.Wwise.Event footstepEvent;
    [SerializeField] private AK.Wwise.Switch stoneSwitch;
    [SerializeField] private AK.Wwise.Switch grassSwitch;

    public void PlayFootstep(SurfaceType surface)
    {
        switch (surface)
        {
            case SurfaceType.Stone: stoneSwitch.SetValue(gameObject); break;
            case SurfaceType.Grass: grassSwitch.SetValue(gameObject); break;
        }
        footstepEvent.Post(gameObject);
    }
}
```

### Adaptive music manager (State)

```csharp
public class MusicManager : MonoBehaviour
{
    [SerializeField] private AK.Wwise.Event startMusicEvent;
    [SerializeField] private AK.Wwise.State explorationState;
    [SerializeField] private AK.Wwise.State combatState;

    void Start()
    {
        startMusicEvent.Post(gameObject);
        explorationState.SetValue();
    }

    public void EnterCombat() => combatState.SetValue();
    public void ExitCombat()  => explorationState.SetValue();
}
```

### Health-driven RTPC (smooth interpolation)

```csharp
public class PlayerAudioController : MonoBehaviour
{
    [SerializeField] private AK.Wwise.RTPC healthRtpc;
    private float _health = 100f;

    void Update()
    {
        // Interpolation time 200ms — smooth fade, not a jump
        AkSoundEngine.SetRTPCValue("Player_Health", _health, gameObject, 200);
    }
}
```

### Track PlayingID for one-shot stop

```csharp
private uint _introPlayingID;

public void PlayIntro()
{
    _introPlayingID = introEvent.Post(gameObject);
}

public void StopIntro()
{
    if (_introPlayingID != AkSoundEngine.AK_INVALID_PLAYING_ID)
    {
        AkSoundEngine.StopPlayingID(_introPlayingID, 500,
            AkCurveInterpolation.AkCurveInterpolation_Linear);
    }
}
```

### End-of-event callback

```csharp
private void StartLoop()
{
    loopEvent.Post(gameObject,
        (uint)AkCallbackType.AK_END_OF_EVENT,
        OnLoopEnd);
}

private void OnLoopEnd(object cookie, AkCallbackType type, AkCallbackInfo info)
{
    // Re-post or chain next event
}
```

---

## Best Practices

- **Prefer typed references** (`AK.Wwise.Event`, `AK.Wwise.Bank`, `AK.Wwise.RTPC`, `AK.Wwise.State`, `AK.Wwise.Switch`) over raw strings — Inspector-assignable, no magic strings, survive Wwise renames.
- **States are global; Switches are per-object.** Use States for system-wide changes (music phase), Switches for object-specific variations (footstep surface).
- **Load banks by context** — not everything at startup. Load a bank on scene/area entry and unload on exit.
- **Always load `AkBank` before posting events** that belong to it. Use `LoadAsync` to avoid frame hitches on large banks.
- **Add `AkGameObj` explicitly** to 3D emitter prefabs — don't rely on automatic addition. Configure `isStaticObject` on non-moving emitters.
- **Clamp RTPC values** to their defined min/max range in Wwise (default 0–100). Values outside range behave unpredictably.
- **Use `AkSoundEngine.GlobalGameObject`** (or `null` / `AK_INVALID_GAME_OBJECT`) when posting global events such as music. Never attach music to a scene object that may be destroyed.
- **Validate PlayingID** — a return of `AK_INVALID_PLAYING_ID` (0) means the post failed. Log and handle gracefully.
- **Limit active RTPCs per scene** to ~10–20; above that, performance cost accumulates.
- **Use MultiPositionType on AkAmbient** when many ambient instances share the same event — one voice serves all, saving CPU and memory.
- **Configure `stopSoundOnDestroy = true`** on AkEvent/AkAmbient for automatic cleanup when a GameObject is destroyed.
- **For Stop actions on music**, set the stop scope to "Global" in Wwise Authoring — stop-on-gameobject will not affect music playing globally.
- **Use Wwise Profiler** (port 24024, "Run in background" enabled) during playtest to monitor voice count and CPU budget.
- **Voice budgets by platform**: mobile ≈ 32–64 voices, console ≈ 128–256 voices.

---

## Anti-patterns

- **Posting before initialization** — posting events before `AkSoundEngine.IsInitialized()` returns `true` fails silently. Always check in the first script that posts audio.
- **Magic strings everywhere** — `AkSoundEngine.PostEvent("Play_Something", go)` scattered across scripts. Use `AK.Wwise.Event` fields instead.
- **SoundBanks inside `Assets/`** — placing generated banks inside the Assets folder prevents them from packaging correctly in builds. Always use `StreamingAssets/Audio/GeneratedSoundBanks`.
- **Loading all banks at startup** — causes unnecessary memory pressure. Load contextually.
- **Forgetting to unload banks** — causes memory leaks over the session. Pair every `Load` with an `Unload` in the opposite lifecycle event.
- **State before event** — calling `SetState("Group", "NewState")` before `PostEvent` in the same frame can cause the event to play at the wrong mix level. Set state first, then post — but be aware of execution order.
- **Posting events on object destruction** — attaching audio to `OnDestroy` is unreliable; post events in the frame before destruction (e.g., `OnTriggerEnter`, before `Destroy()`).
- **Hardcoding if/else audio logic** — `if (surface == "Stone") PostEvent("Play_Stone")` defeats Wwise's purpose. Use Switches; let the designer control variations.
- **Ignoring RTPC ranges** — setting `SetRTPCValue` to 150 when the curve is defined 0–100 produces undefined results. Always normalize values before sending.
- **Multiple AkInitializers** — more than one per scene causes engine conflicts and duplicate initialization errors.
