---
version: 1.0.0
---

# FMOD for Godot

> **Scope**: FMOD Studio audio middleware integration in Godot 4 .NET projects — installing the GDExtension plugin, loading banks, playing events and controlling instances, managing parameters and adaptive audio, mixing via VCAs and buses, spatial audio setup, and accessing FMOD from C# using the FMOD Sharp wrapper or the official FMOD C# SDK.
> **Load when**: integrating FMOD audio into a Godot 4 project, loading FMOD banks, playing or controlling event instances, setting FMOD parameters for adaptive audio, configuring listeners or 3D positional audio, mixing audio via VCAs or buses, wiring FMOD from C#, debugging FMOD initialization or bank loading failures, exporting a project with FMOD audio.

---

## Core Concepts

| Term | Meaning |
|------|---------|
| **FMOD Studio** | The authoring tool (external to Godot) where audio events and banks are designed |
| **Bank** | A compiled FMOD audio asset file (`.bank`). Must reside inside the Godot project |
| **Master.bank** | The required root bank — must be loaded before any other bank |
| **Master.strings.bank** | Required for string-based event path lookups (`event:/SFX/Explosion`); load first |
| **Event** | A named, parameterizable audio behaviour defined in FMOD Studio (`event:/...`) |
| **Event instance** | A live, controllable instance of an event (start, pause, stop, set params) |
| **Parameter** | A named float or label value that adapts an event's audio in real time |
| **VCA** | Volume Control Automation — adjusts a category's volume globally (`vca:/Master`) |
| **Bus** | An audio routing channel; supports mute, pause, and stop-all (`bus:/Music`) |
| **Listener** | The spatial audio perspective node (camera/player) registered with FmodServer |

---

## Plugin Options

There are two main GDExtension integrations for Godot 4:

| Plugin | Repo | Primary language | C# support |
|--------|------|-----------------|------------|
| **fmod-gdextension** | `utopia-rise/fmod-gdextension` | GDScript (full) | Via FMOD Sharp wrapper |
| **fmod-for-godot** | `alessandrofama/fmod-for-godot` | GDScript | Partial |

**For Godot 4 .NET C# projects**, use `utopia-rise/fmod-gdextension` with one of the following C# approaches:

| C# approach | When to use |
|-------------|-------------|
| **FMOD Sharp** (`straussna/fmod-gdextension-sharp`) | Clean C# API over fmod-gdextension; recommended for most C# projects |
| **Official FMOD C# SDK** (`FMOD.Studio.EventInstance`) | Direct SDK access; useful when bypassing the GDExtension layer entirely |

---

## Installation

### 1. fmod-gdextension

1. Download the latest release from [utopia-rise/fmod-gdextension](https://github.com/utopia-rise/fmod-gdextension/releases) matching your Godot and FMOD API versions.
2. Extract `addons/fmod/` into your project's `/addons/` directory.
3. Enable the plugin: **Project Settings → Plugins → FMOD GDExtension**.
4. Export banks from FMOD Studio and place them **inside** your Godot project directory.
5. Open **Project Settings → (Advanced) → Fmod → Settings** and set **Banks Path**.
6. Click the **FMOD toolbar button → Refresh Project** and wait for `[FMOD] Loaded Editor Banks` in the console.
7. Run any scene. Confirm `[FMOD] Initialized Runtime System` appears.

### 2. FMOD Sharp (C# wrapper — additional step)

```
# Copy addons/fmod-sharp/ into res://addons/
# Enable via Project Settings → Plugins → FMOD Sharp
```

FMOD Sharp requires `utopia-rise/fmod-gdextension` to already be installed and enabled.

**Critical:** The FMOD Sharp autoload must be registered **before all other autoloads** in Project Settings. Calling FMOD from any autoload that precedes it will crash.

### Version control

```
# .gitignore
addons/FMOD/fmod_project_cache.tres   # auto-regenerates on refresh

# Include (check in):
addons/FMOD/editor/resources/         # generated FMOD asset resources
```

### Team workflow

After every FMOD Studio bank re-export:
- Click **FMOD toolbar → Refresh Project**.
- Every team member pulling updated banks must repeat this step.

---

## Bank Loading

Always load `Master.strings.bank` before `Master.bank`. Load other banks after both.

```gdscript
# GDScript — blocking load (safe for startup)
var master_strings = FmodServer.load_bank("res://assets/Banks/Master.strings.bank",
    FmodServer.FMOD_STUDIO_LOAD_BANK_NORMAL)
var master = FmodServer.load_bank("res://assets/Banks/Master.bank",
    FmodServer.FMOD_STUDIO_LOAD_BANK_NORMAL)

# Non-blocking for large banks during loading screens
var music_bank = FmodServer.load_bank("res://assets/Banks/Music.bank",
    FmodServer.FMOD_STUDIO_LOAD_BANK_NONBLOCKING)

# Check state before using events from a non-blocking bank
if music_bank.get_loading_state() == FmodServer.FMOD_STUDIO_LOADING_STATE_LOADED:
    FmodServer.play_one_shot("event:/Music/Level01", self)

# Unload on scene exit
func _exit_tree():
    FmodServer.unload_bank("res://assets/Banks/Music.bank")
```

```csharp
// C# — FMOD Sharp
FmodServerWrapper.LoadBank("res://assets/Banks/Master.strings.bank");
FmodServerWrapper.LoadBank("res://assets/Banks/Master.bank");
FmodServerWrapper.LoadBank("res://assets/Banks/Music.bank");
```

---

## Playing Events

### One-shot (fire and forget)

Use one-shot for short, non-looping SFX like UI sounds or explosions.

```gdscript
# GDScript
FmodServer.play_one_shot("event:/SFX/Explosion", self)
```

```csharp
// C# — FMOD Sharp
FmodServerWrapper.PlayOneShot("event:/SFX/Explosion");
```

### Instance-based (looping music, ambient, controlled SFX)

Use `create_event_instance` when you need to pause, seek, set parameters, or stop with fadeout.

```gdscript
# GDScript
var music: FmodEvent = FmodServer.create_event_instance("event:/Music/Level01")
music.start()

# Pause/resume
music.paused = true
music.paused = false

# Stop — allow FMOD fadeout
music.stop(FmodServer.FMOD_STUDIO_STOP_ALLOWFADEOUT)
# Stop — immediate hard cut
music.stop(FmodServer.FMOD_STUDIO_STOP_IMMEDIATE)
```

```csharp
// C# — FMOD Sharp
var fmodEvent = FmodServerWrapper.CreateEventInstance("event:/Music/Loop");
AddChild(fmodEvent);
fmodEvent.Start();
fmodEvent.Stop(immediate: false);  // false = allow fadeout
```

```csharp
// C# — Official FMOD SDK (bypassing GDExtension layer)
using FMOD.Studio;

public partial class MusicPlayer : Node
{
    private EventInstance _music;

    public override void _Ready()
    {
        _music = FMODRuntime.CreateInstancePath("event:/Music/Level01");
        _music.start();
    }

    public override void _ExitTree()
    {
        _music.stop(FMOD.Studio.STOP_MODE.ALLOWFADEOUT);
        _music.release();
    }
}
```

---

## Node-Based Usage (FmodEventEmitter)

`FmodEventEmitter2D` / `FmodEventEmitter3D` are scene nodes that auto-update their position and expose event control as properties. Prefer them for objects that move.

```gdscript
extends FmodEventEmitter2D

func _ready():
    event_name = "event:/Vehicles/Car Engine"
    autoplay = true
    attached = true      # auto-sync position every frame
    allow_fadeout = true

    # Connect playback signals
    started.connect(_on_started)
    stopped.connect(_on_stopped)
    timeline_beat.connect(_on_beat)

    # Set initial parameter
    self["fmod_parameters/RPM"] = 600

func _process(_delta):
    # Update parameter in real time
    self["fmod_parameters/RPM"] += 10
    # Or via method
    set_parameter("RPM", 800.0)
    var rpm = get_parameter("RPM")

func _on_beat(params: Dictionary):
    print("Beat %d, Bar %d" % [params.beat, params.bar])
```

**Key emitter properties:**

| Property | Type | Purpose |
|----------|------|---------|
| `event_name` | String | FMOD event path |
| `autoplay` | bool | Start event when node enters scene tree |
| `attached` | bool | Sync transform to FMOD every frame |
| `allow_fadeout` | bool | Use FMOD fadeout when stopping |
| `paused` | bool | Pause/resume |
| `volume` | float | Playback volume multiplier |

---

## Parameters & Adaptive Audio

### Local parameters (on an event instance or emitter)

```gdscript
# On FmodEvent instance
event.set_parameter_by_name("RPM", 1000.0)
var rpm = event.get_parameter_by_name("RPM")

# On FmodEventEmitter node
emitter.set_parameter("RPM", 1000.0)
emitter.get_parameter("RPM")
emitter.set_parameter_by_id(5864137074015534804, 1000.0)

# Via property path on emitter
self["fmod_parameters/RPM"] = 1000.0
```

### Global parameters (affect all events)

```gdscript
FmodServer.set_global_parameter_by_name("TimeOfDay", 12.0)
FmodServer.set_global_parameter_by_name_with_label("Weather", "Rainy")
var tod = FmodServer.get_global_parameter_by_name("TimeOfDay")
```

```csharp
// C# — FMOD Sharp
FmodServerWrapper.SetGlobalParameterByName("TimeOfDay", 18.0f);
```

---

## Spatial Audio & Listener

Register the listener before playing any 3D events. For split-screen, register one listener per player.

```gdscript
# Register listener — call from camera or player node
FmodServer.add_listener(0, self)  # index 0 = first listener

# For 3D events created via FmodServer API, set attributes
var event = FmodServer.create_event_instance("event:/Ambient/Forest")
event.set_2d_attributes(self.global_transform)  # 2D
# Note: FmodEventEmitter3D handles 3D attributes automatically when attached = true
```

Use `FmodEventEmitter2D` / `FmodEventEmitter3D` with `attached = true` whenever the sound source moves. The node updates FMOD spatial attributes automatically every frame.

---

## Mixer Control (VCA & Bus)

```gdscript
# VCA — category volume (0.0–1.0)
var master_vca = FmodServer.get_vca("vca:/Master")
master_vca.set_volume(0.8)

var music_vca = FmodServer.get_vca("vca:/Music")
music_vca.set_volume(0.5)

# Bus — mute / pause / stop all
var sfx_bus = FmodServer.get_bus("bus:/SFX")
sfx_bus.set_mute(true)
sfx_bus.set_paused(true)
sfx_bus.stop_all_events(FmodServer.FMOD_STUDIO_STOP_IMMEDIATE)

# Global controls
FmodServer.pause_all_events()
FmodServer.unpause_all_events()
FmodServer.mute_all_events()
FmodServer.unmute_all_events()
```

---

## Callbacks & Timeline Sync

Use callbacks to synchronize gameplay with music beats, markers, and playback state.

```gdscript
var music: FmodEvent

func _ready():
    music = FmodServer.create_event_instance("event:/Music/Dynamic")
    music.set_callback(
        Callable(self, "_on_event_callback"),
        FmodServer.FMOD_STUDIO_EVENT_CALLBACK_TIMELINE_BEAT |
        FmodServer.FMOD_STUDIO_EVENT_CALLBACK_TIMELINE_MARKER |
        FmodServer.FMOD_STUDIO_EVENT_CALLBACK_STARTED |
        FmodServer.FMOD_STUDIO_EVENT_CALLBACK_STOPPED
    )
    music.start()

func _on_event_callback(event_data: Dictionary, callback_type: int):
    match callback_type:
        FmodServer.FMOD_STUDIO_EVENT_CALLBACK_TIMELINE_BEAT:
            print("Beat %d, Bar %d" % [event_data.beat, event_data.bar])
        FmodServer.FMOD_STUDIO_EVENT_CALLBACK_TIMELINE_MARKER:
            print("Marker: %s at %d ms" % [event_data.name, event_data.position])
        FmodServer.FMOD_STUDIO_EVENT_CALLBACK_STARTED:
            print("Started")
        FmodServer.FMOD_STUDIO_EVENT_CALLBACK_STOPPED:
            print("Stopped")
```

### Programmer Sound (audio table / dialogue)

```gdscript
FmodServer.load_bank("res://assets/Banks/Dialogue_EN.bank", FmodServer.FMOD_STUDIO_LOAD_BANK_NORMAL)
var dialogue = FmodServer.create_event_instance("event:/Character/Dialogue")
dialogue.set_programmer_callback("welcome")  # key in the audio table
dialogue.start()
```

---

## Event Introspection

```gdscript
# Check if event path exists before use
if FmodServer.check_event_path("event:/Vehicles/Car Engine"):
    var desc = FmodServer.get_event("event:/Vehicles/Car Engine")
    print("Is 3D: ", desc.is_3d())
    print("Is one-shot: ", desc.is_one_shot())
    print("Length: ", desc.get_length(), " ms")

    var min_max = desc.get_min_max_distance()
    print("Min/Max dist: ", min_max[0], " / ", min_max[1])

# GUID-based lookup (more stable than string paths across renames)
var guid = FmodServer.get_event_guid("event:/Vehicles/Car Engine")
var desc_by_guid = FmodServer.get_event_from_guid(guid)

# Generate GUIDs file: click FMOD toolbar → Generate GUIDs
# Access in GDScript via FMODGuids class
```

---

## Anti-patterns

- **Not loading `Master.strings.bank` before `Master.bank`** — string-based event paths (`event:/...`) will fail to resolve.
- **Storing banks outside the Godot project directory** — the plugin cannot find them; paths must be under `res://`.
- **Not refreshing the project after re-exporting banks** — stale asset references; events may not appear or crash.
- **Using `play_one_shot` for looping music** — one-shot cannot be paused, seeked, or faded; use `create_event_instance` instead.
- **Not setting `attached = true` on moving FmodEventEmitter nodes** — 3D position is never updated; audio won't follow the object.
- **Not registering a listener before playing 3D events** — all 3D events play from (0,0,0); attenuation and spatialization break.
- **Not unloading banks on scene exit** — leaked banks accumulate in memory across scene transitions.
- **FMOD Sharp autoload not registered first** — if any earlier autoload calls the FMOD API during initialization, Godot crashes.
- **Calling events from a non-blocking bank before it finishes loading** — check `bank.get_loading_state()` before any event access.
- **Not keeping `addons/FMOD/editor/resources/` in version control** — team members lose generated event references on pull.
- **Blocking loads of large banks on the main thread** — use `FMOD_STUDIO_LOAD_BANK_NONBLOCKING` with a loading screen and state polling.
