---
version: 1.0.0
---

# Wwise Godot Integration

> **Scope**: Audiokinetic Wwise audio middleware integration in Godot 4 .NET C# projects — event posting, bank management, 3D spatial audio, RTPC/state/switch control, game object registration lifecycle, and Godot node integration patterns.
> **Load when**: integrating Wwise audio middleware, posting Wwise events from C#, managing SoundBanks, setting up 3D spatial audio with listeners and emitters, controlling RTPCs or states, wiring Wwise callbacks in Godot nodes, configuring auxiliary sends or reverb buses.

---

## Setup & Initialization

- Use an autoload singleton node (`WwiseManager` or similar) to initialize Wwise in `_Ready()` and terminate in `_ExitTree()`.
- Always load the **Init SoundBank** before posting any events; failing to do so produces silent failures with no error.
- Load additional SoundBanks asynchronously (`AkBankManager.LoadBankAsync`) to avoid frame stalls.
- Pair every `LoadBank` call with a matching `UnloadBank` call — load/unload with the scene or level that owns the content.

```csharp
// Autoload singleton
public partial class WwiseManager : Node
{
    public override void _Ready()
    {
        // Init bank must be first
        AkBankManager.LoadBank("Init");
    }

    public override void _ExitTree()
    {
        AkSoundEngine.Term();
    }
}
```

---

## Event Posting

- Post events by string name or pre-resolved ID via `AkUtils.GetIDFromString()` — prefer IDs for hot paths to avoid repeated hash lookups.
- Use `WwiseEvent.Post(gameObject)` when the Wwise event is assigned via `[Export]`; this is the idiomatic inspector-friendly pattern.
- Use `Callable.From<ulong, int, IntPtr>(handler)` to wire C# callbacks; never pass raw delegates — Godot's GC will collect unregistered delegates.

```csharp
// Simple post
AkSoundEngine.PostEvent("Play_Footstep", this);

// Inspector-assigned event
[Export] public WwiseEvent FootstepEvent { get; set; }
public void PlayFootstep() => FootstepEvent.Post(this);

// Post with end-of-event callback
var cb = Callable.From<ulong, int, IntPtr>(OnEventCallback);
AkSoundEngine.PostEventAsync(
    AkUtils.GetIDFromString("Play_Music"), this,
    (uint)AkCallbackType.AK_EndOfEvent, cb);

private void OnEventCallback(ulong eventId, int type, IntPtr data)
{
    if ((AkCallbackType)type == AkCallbackType.AK_EndOfEvent)
        GD.Print("Event finished");
}
```

---

## Game Object Registration

- Call `AkSoundEngine.RegisterGameObj(this)` in `_Ready()` for every node that emits or listens to Wwise audio.
- Call `AkSoundEngine.UnregisterGameObj(this)` in `_ExitTree()` — forgetting this leaks Wwise game object handles indefinitely.
- Never post an event on an unregistered game object; the call is silently ignored by Wwise.
- Track registration state with a bool field to guard against double-register or double-unregister.

```csharp
private bool _registered;

public override void _Ready()
{
    AkSoundEngine.RegisterGameObj(this);
    _registered = true;
}

public override void _ExitTree()
{
    if (_registered)
    {
        AkSoundEngine.UnregisterGameObj(this);
        _registered = false;
    }
}
```

---

## 3D Audio — Position Updates

- Update emitter and listener positions in `_Process()`, **not** `_PhysicsProcess()` — audio rendering runs on the game thread frame rate, not the physics step.
- Update position every frame for moving objects; static objects only need one update after registration.
- Include both position and orientation (forward + up vectors) for accurate spatial audio and HRTF.

```csharp
public override void _Process(double delta)
{
    if (!_registered) return;
    AkSoundEngine.SetPosition(this, GlobalTransform.Origin);
}

// For the listener — include orientation
public override void _Process(double delta)
{
    var t = GlobalTransform;
    AkSoundEngine.SetListenerPosition(
        this,
        t.Origin,
        -t.Basis.Z,  // forward
        t.Basis.Y);  // up
}
```

---

## RTPC / Game Parameters

- Set global RTPCs (no game object) for mix-wide parameters (master volume, music intensity).
- Set per-object RTPCs for parameters that vary per instance (speed, health, distance).
- Use `[Export] WwiseRTPC` for inspector-assigned parameters; call `rtpc.SetValue(value, this)` for local or `rtpc.SetValue(value)` for global.

```csharp
// Global RTPC
AkSoundEngine.SetRTPCValue("MasterVolume", 0.8f);

// Per-object RTPC via inspector
[Export] public WwiseRTPC SpeedParameter { get; set; }
public void UpdateSpeed(float speed) => SpeedParameter.SetValue(speed, this);
```

---

## States & Switches

- States are **global** — use them for environment or gameplay mode changes that affect all audio (e.g., `"Environment"/"Indoor"` vs `"Outdoor"`).
- Switches are **per game object** — use them to vary behavior per instance (e.g., surface material for footsteps).
- Use `[Export] WwiseState` / `[Export] WwiseSwitch` for inspector-assigned values.

```csharp
// Global state
AkSoundEngine.SetState("Environment", "Indoor");

// Per-object switch
AkSoundEngine.SetSwitch(
    AkUtils.GetIDFromString("SurfaceType"),
    AkUtils.GetIDFromString("Metal"),
    this);

// Inspector-assigned
[Export] public WwiseState EnvironmentState { get; set; }
[Export] public WwiseSwitch SurfaceSwitch { get; set; }

public void SetEnvironment(string env) => EnvironmentState.SetValue(env);
public void SetSurface(string surface) => SurfaceSwitch.SetValue(surface, this);
```

---

## Bank Management

- Load SoundBanks asynchronously for banks larger than ~1 MB to prevent frame stalls.
- Use Wwise 2024.1+ **Auto-Defined SoundBanks** to simplify management: events that are not in user-defined banks are handled automatically.
- Scope bank lifetime to the scene or level: load in the scene's `_Ready()` / autoload, unload in `_ExitTree()`.

```csharp
// Async loading with callback
AkBankManager.LoadBankAsync(
    AkUtils.GetIDFromString("Combat"),
    Callable.From<uint, object, object>(
        (id, data, cookie) => GD.Print($"Bank {id} loaded")));

// Level-scoped pattern
public override void _Ready() => AkBankManager.LoadBank("Level_Forest");
public override void _ExitTree() => AkBankManager.UnloadBank("Level_Forest");
```

---

## Auxiliary Sends & Reverb

- Define reverb buses in the Wwise authoring tool before referencing them in code.
- Set aux send values via `AkSoundEngine.SetGameObjectAuxSendValues(this, auxSends)`.
- Keep send levels in `[0.0, 1.0]`; values outside this range are clamped by Wwise.
- Enable **Listener Relative Routing** and **3D Spatialization: Position + Orientation** on the reverb bus for spatially accurate room reverb.

```csharp
[Export] public WwiseAuxBus ReverbBus { get; set; }
[Export] public float ReverbSendLevel = 0.5f;

private void ApplyReverb()
{
    var sends = new AkAuxSendArray();
    sends.Add(new AkAuxSendValue
    {
        AuxBusID = ReverbBus.ID,
        SendLevel = Mathf.Clamp(ReverbSendLevel, 0f, 1f)
    });
    AkSoundEngine.SetGameObjectAuxSendValues(this, sends);
}
```

---

## Callbacks

- Always use `Callable.From<ulong, int, IntPtr>(handler)` — raw C# delegates may be garbage collected mid-flight.
- For simple end-of-event tracking, prefer `AkEvent3D.EventEnded` signal over manual callbacks.
- Wrap callback bodies in try-catch; an unhandled exception inside a Wwise callback can crash the audio thread.

```csharp
// Signal-based (preferred for simple use)
GetNode<AkEvent3D>("Source").EventEnded += OnSoundEnded;

// Manual callback (required for music sync, markers, etc.)
AkSoundEngine.PostEventAsync(
    AkUtils.GetIDFromString("Play_Music"), this,
    (uint)(AkCallbackType.AK_MusicSyncBeat | AkCallbackType.AK_EndOfEvent),
    Callable.From<ulong, int, IntPtr>((id, type, data) =>
    {
        try { HandleCallback((AkCallbackType)type); }
        catch (Exception ex) { GD.PrintErr(ex); }
    }));
```

---

## Spatial Audio — Rooms & Portals

- Use `AkRoom` to define acoustic spaces with diffuse reverb; assign an aux bus for the room's reverb send.
- Use `AkPortal` to connect adjacent rooms and control sound propagation through openings (doors, windows).
- Place `AkRoom` and `AkPortal` as child nodes; Wwise automatically reads their transforms.

---

## Wwise Types (Inspector Integration)

Use the typed Wwise asset references for all inspector-assigned Wwise objects — they provide editor validation and auto-update when the Wwise project changes (requires Wwise 2024.1+):

| C# Type | Wwise Object |
|---------|--------------|
| `WwiseEvent` | Sound / Music event |
| `WwiseRTPC` | Game Parameter |
| `WwiseState` | State Group + State Value |
| `WwiseSwitch` | Switch Group + Switch Value |
| `WwiseAuxBus` | Auxiliary Bus |
| `WwiseBank` | SoundBank |
| `WwiseAcousticTexture` | Acoustic Texture |

---

## Anti-patterns

- **Setting position once in `_Ready()`** — Wwise does not auto-track Godot node transforms; update every frame for moving objects.
- **Forgetting `UnregisterGameObj` in `_ExitTree()`** — leaks Wwise game object handles; over time causes audio glitches and memory growth.
- **Posting events before Init bank is loaded** — events posted before Init bank loads fail silently; always load Init first.
- **Loading large banks synchronously** — `AkBankManager.LoadBank` blocks the main thread; use `LoadBankAsync` for any bank larger than ~1 MB.
- **Passing raw C# delegates as callbacks** — the GC may collect them before the callback fires; always use `Callable.From`.
- **Updating Wwise positions in `_PhysicsProcess()`** — physics and audio frame rates differ; use `_Process()` for audio position updates.
- **Multiple unmanaged `AkListener3D` nodes** — only one listener should be active per player camera; additional unmanaged listeners cause incorrect spatialization.
- **Hardcoded magic number game object IDs** — use node instance references (`this`) or `GetInstanceId()`; never pass raw integer IDs.
- **Ignoring bank reference counting** — each `LoadBank` increments a counter; only call `UnloadBank` when the owning scene exits, not on every frame or condition check.
