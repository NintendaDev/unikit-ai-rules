---
version: 1.0.0
---

# Wwise Godot Integration

> **Scope**: Integration of Audiokinetic Wwise audio middleware into Godot 4 via the `alessandrofama/wwise-godot-integration` GDExtension — event posting, SoundBank management, RTPC control, state/switch management, spatial audio nodes, and the Wwise Types inspector workflow.
> **Load when**: integrating Wwise audio into Godot, posting Wwise events from GDScript, loading or unloading SoundBanks, setting RTPC values, configuring states or switches, authoring spatial audio with Wwise rooms and portals, debugging Wwise audio in Godot.

---

## Setup

- Install via the integration app from the [Releases page](https://github.com/alessandrofama/wwise-godot-integration/releases) — close Godot before installing.
- Enable the Wwise plugin: **Project Settings → Plugins → Wwise**.
- Supported: Wwise 2024.1 / 2025.1 + Godot 4.3–4.6. Platform binaries live in `addons/wwise/bin/`.
- **Platform folder names** in Wwise SoundBank output must be exactly: `Windows`, `Mac`, `Linux`, `Android`, `iOS`.
- Disable **"Use SoundBank names"** in Wwise SoundBank project settings unless you intend to load banks by string name.
- Wwise 2024.1+ uses **WwiseProjectDatabase**: monitors SoundBank directories automatically — no need to keep the Wwise Authoring app open alongside Godot.

### Generating Wwise IDs

- In Godot Editor, open **Wwise Browser** → click **"Generate Wwise IDs"** → overwrite `res://wwise/GeneratedSoundBanks/wwise_ids.gd`.
- Restart the editor after first generation.
- Access generated constants via the `AK` class: `AK.EVENTS.MY_EVENT`, `AK.BANKS.INIT`, `AK.STATES.MUSIC_STATE.GROUP`, etc.

---

## Available Nodes

| Node | Purpose |
|------|---------|
| `AkEvent3D` / `AkEvent2D` | Post and stop events via inspector configuration |
| `AkListener3D` / `AkListener2D` | Spatial audio listener (auto-updates position) |
| `AkBank` | Load/unload SoundBanks with trigger callbacks |
| `AkState` | Set a Wwise State at a configured trigger point |
| `AkSwitch` | Set a Wwise Switch on a target game object |
| `AkEnvironment` | Attach aux bus effects to areas |
| `AkGeometry` | Define reflective surfaces for early reflections |
| `AkRoom` | Define acoustic spaces with reverb characteristics |
| `AkPortal` | Connect rooms for sound propagation through openings |
| `AkEarlyReflections` | Configure early reflection auxiliary bus per object |

## Wwise Types (Inspector-Integrated)

Wwise Types are GDScript classes that render a **Wwise Picker button** in the Inspector when exported. Always prefer them over hardcoded IDs.

```gdscript
@export var event: WwiseEvent
@export var bank: WwiseBank
@export var rtpc: WwiseRTPC
@export var state: WwiseState
@export var switch_group: WwiseSwitch
@export var trigger: WwiseTrigger
@export var aux_bus: WwiseAuxBus
```

---

## SoundBank Loading

Always load the `Init` bank before any other bank. Do this in a root Autoload or the earliest scene.

### Node approach (visual)

Add an `AkBank` node → select the bank → configure `Load On` and `Unload On` callbacks in the inspector.

### WwiseBank export (recommended for code)

```gdscript
extends Node

@export var bank: WwiseBank

func _enter_tree() -> void:
    bank.load()

func _exit_tree() -> void:
    bank.unload()
```

### Wwise singleton (imperative)

```gdscript
Wwise.load_bank_id(AK.BANKS.INIT)       # by generated ID (preferred)
Wwise.load_bank("TestBank")             # by name (requires "Use SoundBank names" enabled)
Wwise.unload_bank("TestBank")
Wwise.load_bank_async("TestBank", _on_bank_loaded)

func _on_bank_loaded(data: Dictionary) -> void:
    # data = { "bank_id": 3291379323, "result": 1 }
    pass
```

---

## Posting Events

### WwiseEvent export (recommended — works with Auto-Defined SoundBanks)

`WwiseEvent.post(game_object)` auto-registers the game object — no manual `register_game_obj` call needed.

```gdscript
extends Node3D

@export var event: WwiseEvent

func _enter_tree() -> void:
    event.post(self)

func _exit_tree() -> void:
    event.stop(self, 500, AkUtils.AK_CURVE_LINEAR)
```

### Event callbacks

```gdscript
func _enter_tree() -> void:
    event.post_callback(self, AkUtils.AK_END_OF_EVENT, _on_event_ended)

func _on_event_ended(data: Dictionary) -> void:
    print("Event ended: ", data)
```

### AkEvent3D node approach (visual)

Add an `AkListener3D` to the scene first. On `AkEvent3D`, set `Trigger On` (e.g., `Ready`) and `Stop On`. Connect Area/Body signals to `on_area_entered()` on the node. Use group tags to filter which objects trigger it.

### Wwise singleton (User-Defined SoundBanks only)

```gdscript
Wwise.post_event_id(AK.EVENTS.MUSIC, self)   # by generated ID
Wwise.post_event("Music", self)               # by name
```

> **Warning:** `Wwise.post_event` / `Wwise.post_event_id` only work for **User-Defined SoundBanks**. For Auto-Defined SoundBanks, always use `WwiseEvent.post()`.

### MIDI events

```gdscript
var posts: Array[AkMidiPost] = []
var note := AkMidiPost.new()
note.by_type = AkMidiPost.MIDI_EVENT_TYPE_NOTE_ON
note.by_note = 42
note.by_velocity = 127
posts.push_back(note)

event.post_midi(self, posts)
event.stop_midi(self)
```

---

## RTPC Values

States that RTPC scope is per-game-object (local) or global.

```gdscript
extends Node3D

@export var rtpc: WwiseRTPC

func _ready() -> void:
    rtpc.set_value($AkEvent3D, 1200.0)   # object-scoped
    rtpc.set_global_value(1200.0)         # global (all instances)
```

Singleton variant:

```gdscript
Wwise.set_rtpc_value("MyParam", 100.0, self)
Wwise.set_rtpc_value_id(AK.GAME_PARAMETERS.MY_PARAM, 100.0, self)
```

---

## States

States are **global** — they affect all audio objects simultaneously. Use them for large-scale audio transitions (combat music, ambient mix, day/night).

```gdscript
extends Node3D

@export var state: WwiseState

func _ready() -> void:
    state.set_value()
```

Singleton variant:

```gdscript
Wwise.set_state("MusicState", "Calm")
Wwise.set_state_id(AK.STATES.MUSICSTATE.GROUP, AK.STATES.MUSICSTATE.STATE.CALM)
```

AkState node: select state in inspector, set `Trigger On`. Call `$AkState.set_value()` manually when `Trigger On` is `None`.

---

## Switches

Switches are **local** to a game object — use them for per-object variation (footstep surface, weapon material).

```gdscript
extends Node

@export var switch_group: WwiseSwitch

func _ready() -> void:
    switch_group.set_value($AkEvent3D)   # target: the game object emitting sound
```

Singleton variant:

```gdscript
Wwise.set_switch("Footsteps", "Water", $AkEvent3D)
Wwise.set_switch_id(
    AK.SWITCHES.FOOTSTEPSSWITCH.GROUP,
    AK.SWITCHES.FOOTSTEPSSWITCH.SWITCH.WATER,
    $AkEvent3D
)
```

AkSwitch node: set `Switch` and `GameObject` in inspector. Call `$AkSwitch.set_value()` manually when `Trigger On` is `None`.

---

## Spatial Audio

### Listener setup

Add `AkListener3D` (or `AkListener2D`) to the Camera or player node — it auto-updates position from the node's transform. No manual code required for basic setup.

Manual listener code (when not using node):

```gdscript
func _ready() -> void:
    Wwise.register_listener(self)

func _process(_delta: float) -> void:
    Wwise.set_3d_position(self, global_transform)
```

### Room-based spatial audio

- Add `AkRoom` to volumes defining indoor spaces.
- Add `AkPortal` between two rooms (doorways, windows) for sound propagation.
- Add `AkGeometry` to collision meshes for surface reflections.
- Add `AkEnvironment` to areas that should apply an aux bus effect.
- Add `AkEarlyReflections` to objects that should receive reflection calculations.

---

## Game Object Lifecycle

`WwiseEvent.post(self)` auto-registers the game object — prefer this workflow.

When managing game objects manually:

```gdscript
func _enter_tree() -> void:
    Wwise.register_game_obj(self, name)

func _exit_tree() -> void:
    Wwise.unregister_game_obj(self)  # always unregister to avoid memory leaks
```

---

## Profiling & Debugging

- Wwise Profiler connects in **debug** and **profile** builds — use it to inspect active voices, RTPCs, and memory.
- Errors appear in Godot's **Errors** dock with descriptive messages about missing SoundBanks or misconfiguration.
- Check the [issues page](https://github.com/alessandrofama/wwise-godot-integration/issues) before logging a new bug.

---

## Anti-patterns

- **Using `Wwise.post_event_id` with Auto-Defined SoundBanks** — it silently fails; use `WwiseEvent.post(self)` instead.
- **Forgetting to load the Init bank first** — all other bank loads will fail or produce no audio.
- **Not unregistering game objects** — call `Wwise.unregister_game_obj(self)` in `_exit_tree()` for manually registered objects.
- **Using string names with IDs disabled** — `Wwise.load_bank("BankName")` requires "Use SoundBank names" enabled in Wwise project settings; otherwise use `load_bank_id`.
- **Modifying SoundBank output paths without updating the Godot base path setting** — keep Wwise output path and Godot `Base Path` in sync.
- **Keeping the Wwise Authoring app open to push changes** — not needed in Wwise 2024.1+; WwiseProjectDatabase monitors directories automatically.
- **Using `AkUtils.AK_CURVE_LINEAR` without importing AkUtils** — ensure the enum value is accessible; reference it from the AkUtils class.
