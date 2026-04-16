---
version: 1.0.0
---

# FMOD

> **Scope**: FMOD Studio GDExtension (utopia-rise/fmod-gdextension) for Godot 4 — bank lifecycle management, event playback tiers (one-shot / node / manual), parameter control, 3D spatial audio, Bus/VCA mixer control, timeline callbacks, and project export with banks.
> **Load when**: using FMOD audio middleware, loading or unloading FMOD banks, playing or stopping FMOD events, controlling audio parameters at runtime, configuring 3D spatial audio or listeners, mixing audio via buses or VCAs, handling event timeline or beat callbacks, exporting a Godot 4 project with FMOD.

---

## Setup

Primary Godot 4 integration: **[utopia-rise/fmod-gdextension](https://github.com/utopia-rise/fmod-gdextension)** (Godot 4.4+, FMOD 2.03+).

1. Copy the `addons/fmod` folder into the project; enable via Project Settings → Plugins.
2. Set the banks directory: Project Settings → Advanced Settings → FMOD → Banks Path (banks must live **inside** the Godot project directory).
3. After every bank re-export from FMOD Studio, click **Refresh Project** in the FMOD Project Browser inside the Godot editor.

The plugin auto-initializes FMOD via the `FmodServer` autoload singleton — **do not call `FmodServer.init()` manually**.

### GUIDs (optional but recommended)

Click **Generate GUIDs** in the FMOD Project Browser (requires FMOD Studio running in the background). Produces `res://addons/FMOD/editor/fmod_guids.gd`. Enables type-safe event references without hard-coded path strings:

```gdscript
FmodServer.create_event_instance_with_guid(FmodGuids.Events.WEAPONS_GUNSHOT)
```

Include FMOD asset resources in `addons/FMOD/editor/resources` in version control.
Exclude the project cache file (`fmod_project_cache.tres`) — it auto-regenerates on refresh.

---

## Bank Management

Always load `Master.bank` **and** `Master.strings.bank` first — the strings bank is required for all `"event:/..."` path lookups.

```gdscript
# Persistent banks — load once at startup (e.g., in an autoload)
func _enter_tree() -> void:
    FmodServer.load_bank("res://assets/Banks/Master.bank",
        FmodServer.FMOD_STUDIO_LOAD_BANK_NORMAL)
    FmodServer.load_bank("res://assets/Banks/Master.strings.bank",
        FmodServer.FMOD_STUDIO_LOAD_BANK_NORMAL)

# Per-level bank — load on scene enter, unload on exit
var _level_bank: FmodBank

func _enter_tree() -> void:
    _level_bank = FmodServer.load_bank("res://assets/Banks/Level01.bank",
        FmodServer.FMOD_STUDIO_LOAD_BANK_NORMAL)

func _exit_tree() -> void:
    _level_bank.unload()
```

Alternatives to code-based loading:
- Add banks to **"Banks to Load at Startup"** in Project Settings for banks that should always be present.
- Use a **`StudioBankLoader`** scene node to trigger load/unload automatically on Enter/Exit Tree.

Pre-load sample data for time-sensitive events to eliminate runtime latency spikes:

```gdscript
FmodServer.get_event("event:/Weapons/Gunshot").load_sample_data()
# Unload when the content is no longer needed
FmodServer.get_event("event:/Weapons/Gunshot").unload_sample_data()
```

---

## Event Playback

Three tiers — use the simplest tier that satisfies the requirement.

### Tier 1 — One-Shot (fire-and-forget)

Lifecycle managed automatically. Memory is freed when the event finishes. Use for UI sounds, footsteps, explosions, and any non-looping SFX.

```gdscript
# Simple
FmodServer.play_one_shot("event:/UI/Click")

# With initial parameters
FmodServer.play_one_shot_with_params("event:/Weapons/Gunshot", {
    "WeaponType": 2.0,
    "Distance": 15.0
})

# Attached to a node — follows node position automatically each frame
FmodServer.play_one_shot_attached("event:/Explosions/Large", self)
FmodServer.play_one_shot_attached_with_params("event:/Player/Footstep", self, {
    "Surface": 1.0,
    "Speed": 1.5
})
```

### Tier 2 — Scene Node (FmodEventEmitter2D / FmodEventEmitter3D)

Use for persistent, scene-owned sounds: ambient loops, engine sounds, NPC voices. Attach to the Node that owns the sound source.

```gdscript
extends FmodEventEmitter2D

func _ready() -> void:
    event_name = "event:/Vehicles/Car Engine"
    autoplay = true
    attached = true        # auto-sync position to parent node each frame
    allow_fadeout = true   # respect AHDSR release on stop

    started.connect(_on_started)
    stopped.connect(_on_stopped)
    timeline_beat.connect(_on_beat)

    self["fmod_parameters/RPM"] = 600.0

func update_rpm(rpm: float) -> void:
    set_parameter("RPM", rpm)

func _on_beat(params: Dictionary) -> void:
    print("Beat: %d, Bar: %d" % [params.beat, params.bar])
```

**Spatial audio requires a listener node in the scene tree** — add `FmodEventListener2D` or `FmodEventListener3D` to the Camera or Player.

### Tier 3 — Manual Instance

Use for looping music, complex parameter-driven sounds, or when explicit start/stop/release control is needed.

```gdscript
var _music: FmodEvent = null

func _ready() -> void:
    _music = FmodServer.create_event_instance("event:/Music/Level01")
    _music.set_parameter_by_name("Intensity", 0.0)
    _music.start()

func _exit_tree() -> void:
    if _music:
        _music.stop(FmodServer.FMOD_STUDIO_STOP_ALLOWFADEOUT)
        _music.release()   # MANDATORY — manual instances are never auto-released
```

Stop modes:

| Constant | Behavior |
|----------|----------|
| `FMOD_STUDIO_STOP_ALLOWFADEOUT` | Respect AHDSR envelope release — preferred for music and ambience |
| `FMOD_STUDIO_STOP_IMMEDIATE` | Cut audio immediately — use only when instant silence is required |

---

## Parameters

### Local Parameters (per-instance)

```gdscript
# By name — readable, fine for infrequent updates
event.set_parameter_by_name("Intensity", 0.8)

# By ID — cache once in _ready(), use in _process() for performance
var _rpm_id  # FmodParameterId — cached in _ready()

func _ready() -> void:
    var param_desc = FmodServer.get_event("event:/Vehicles/Car Engine") \
        .get_parameter_by_name("RPM")
    _rpm_id = param_desc.get_id()

func _process(_delta: float) -> void:
    event.set_parameter_by_id(_rpm_id, current_rpm)

# Labeled parameter (string-based enum)
event.set_parameter_by_id_with_label(_surface_id, "Concrete", false)
```

### Global Parameters (affect all events that reference them)

```gdscript
FmodServer.set_global_parameter_by_name("TimeOfDay", 0.75)
var value: float = FmodServer.get_global_parameter_by_name("TimeOfDay")
```

Use a **`StudioGlobalParameterTrigger`** node for no-code global parameter updates in the editor.

**Use parameter IDs (not names) for any parameter updated in `_process()`.**

---

## 3D Spatial Audio

Requirements:
1. The event has a **Spatializer** effect on its Master Track in FMOD Studio (configure Min/Max Distance and attenuation curve).
2. A `FmodEventListener3D` (or `FmodEventListener2D`) node is present in the scene tree, attached to the Camera or Player.

Manual position update for manually-managed instances:

```gdscript
func _process(_delta: float) -> void:
    event.set_3d_attributes(global_transform)   # 3D
    # event.set_2d_attributes(global_transform) # 2D
```

Auto-attach alternative (plugin handles updates):

```gdscript
FmodServer.attach_instance_to_node(event, self)
```

Multiple listeners (split-screen):

```gdscript
FmodServer.set_listener_number(2)
FmodServer.add_listener(0, $Player1)
FmodServer.set_listener_weight(0, 0.5)
FmodServer.add_listener(1, $Player2)
FmodServer.set_listener_weight(1, 0.5)
```

---

## Mixer: Bus and VCA Control

Volume range: **0.0 (silent) → 1.0 (unity)**. Acts as a linear scaling factor on top of FMOD Studio mix values.

```gdscript
# Buses
var music_bus: FmodBus = FmodServer.get_bus("bus:/Music")
music_bus.set_volume(0.5)
music_bus.set_mute(true)
music_bus.set_paused(true)
music_bus.stop_all_events(FmodServer.FMOD_STUDIO_STOP_ALLOWFADEOUT)

# VCAs
var master_vca: FmodVCA = FmodServer.get_vca("vca:/Master")
master_vca.set_volume(0.8)

# Snapshots — identical API to events, different path prefix
var snapshot: FmodEvent = FmodServer.create_event_instance("snapshot:/Underwater")
snapshot.start()
# Later:
snapshot.stop(FmodServer.FMOD_STUDIO_STOP_ALLOWFADEOUT)
snapshot.release()

# Global controls
FmodServer.pause_all_events()
FmodServer.mute_all_events()
FmodServer.unpause_all_events()
FmodServer.unmute_all_events()
```

---

## Event Callbacks

```gdscript
var _event: FmodEvent

func _ready() -> void:
    _event = FmodServer.create_event_instance("event:/Music/Level02")
    _event.set_callback(
        Callable(self, "_on_fmod_callback"),
        FmodServer.FMOD_STUDIO_EVENT_CALLBACK_TIMELINE_BEAT |
        FmodServer.FMOD_STUDIO_EVENT_CALLBACK_TIMELINE_MARKER
    )
    _event.start()

func _on_fmod_callback(props: Dictionary, type: int) -> void:
    match type:
        FmodServer.FMOD_STUDIO_EVENT_CALLBACK_TIMELINE_BEAT:
            print("Beat %d, Bar %d" % [props.beat, props.bar])
        FmodServer.FMOD_STUDIO_EVENT_CALLBACK_TIMELINE_MARKER:
            print("Marker '%s' at %d ms" % [props.name, props.position])

# Remove callback
_event.set_callback(null, FmodServer.FMOD_STUDIO_EVENT_CALLBACK_ALL)
```

Available callback type constants: `TIMELINE_BEAT`, `TIMELINE_MARKER`, `SOUND_PLAYED`, `SOUND_STOPPED`, `ALL`.

### Programmer Callbacks (dialogue audio table)

Load the audio table bank, then set the programmer callback key before starting:

```gdscript
FmodServer.load_bank("res://assets/Banks/Dialogue_EN.bank",
    FmodServer.FMOD_STUDIO_LOAD_BANK_NORMAL)

var event: FmodEvent = FmodServer.create_event_instance("event:/Character/Dialogue")
event.set_programmer_callback("welcome")  # key from the audio table
event.start()
```

---

## Export

1. In the Godot export dialog → **Resources** tab → add `*.bank` to "Filters to export non-resource files/folders".
2. **Android**: enable the **Fmod Android Plugin** in export options.
3. **Windows debug export**: install MSVC C++ Build Tools and the Windows SDK via Visual Studio Installer.
4. Note: the plugin bundles all platform bank variants together — per-target bank filtering is not yet supported.

---

## Anti-Patterns

- **Not calling `release()` after `stop()`** — every `FmodServer.create_event_instance()` call must eventually call `event.release()`. One-shot helpers and `FmodEventEmitter` nodes handle this automatically; manual instances do not.
- **Playing events before banks are loaded** — load banks in `_enter_tree()` before any `play_*` or `create_event_instance` call; events from unloaded banks fail silently with no error output.
- **Omitting `Master.strings.bank`** — all `"event:/..."` path lookups fail silently without it. Always load the strings bank alongside `Master.bank`.
- **Using `set_parameter_by_name()` in `_process()`** — cache the parameter ID once in `_ready()`, then use `set_parameter_by_id()` for every-frame updates.
- **Not updating 3D attributes each frame** — manually-managed instances do not track node position automatically; call `set_3d_attributes()` every frame or use `FmodServer.attach_instance_to_node()`.
- **No `FmodEventListener` in the scene** — 3D spatial audio is non-functional (no attenuation, no panning) without a listener node present.
- **Calling `FmodServer.init()` manually** — the plugin auto-initializes on startup; calling init again causes errors or undefined behavior.
