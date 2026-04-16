---
version: 1.0.0
---

# Dialogic 2

> **Scope**: Dialogic 2 plugin for Godot 4 — timeline authoring, dialogue flow control, subsystem API, character/portrait management, variable integration, save/load patterns, and game-code integration.
> **Load when**: authoring dialogue timelines, integrating Dialogic into game code, controlling dialogues from GDScript, working with characters or portraits, managing dialogue variables, implementing save/load for dialogue state, creating branching narratives, debugging dialogue issues.

---

## Core Concepts

- **Timeline** (`.dtl` file) — ordered sequence of events that plays top-to-bottom. The basic unit of dialogue.
- **Character** (`.dch` file) — definition of a speaker with portraits and expressions. The filename without `.dch` is the in-timeline reference name (`Emilio.dch` → `Emilio:`).
- **Event** — a single instruction in a timeline (text, choice, condition, jump, signal, etc.).
- **Subsystem** — a specialized component accessed via `Dialogic.<Subsystem>`. Each owns one concern (text display, portraits, variables, audio, etc.).
- **DialogicGameHandler** — the global autoload (`Dialogic`). Central controller for starting timelines and accessing subsystems.

Requires **Godot 4.3+** (Godot 4.4+ recommended). Plugin installs to `res://addons/dialogic/`.

---

## Starting and Stopping Dialogue

```gdscript
# Start a timeline — pass name or full path
Dialogic.start("chapterA")
Dialogic.start("res://timelines/intro.dtl")

# Start at a specific label inside a timeline
Dialogic.start("chapterA", "SomeLabel")

# Always guard against starting while already active
if Dialogic.current_timeline == null:
    Dialogic.start("chapterA")

# Pause / resume
Dialogic.paused = true
Dialogic.paused = false
```

React to dialogue lifecycle via signals:

```gdscript
func start_dialog() -> void:
    Dialogic.timeline_ended.connect(_on_timeline_ended)
    Dialogic.start("my_timeline")

func _on_timeline_ended() -> void:
    Dialogic.timeline_ended.disconnect(_on_timeline_ended)
    # restore game state, unlock player movement, etc.
```

**Always disconnect** `timeline_ended` after use, or connect with `CONNECT_ONE_SHOT`:

```gdscript
Dialogic.timeline_ended.connect(_on_timeline_ended, CONNECT_ONE_SHOT)
Dialogic.start("my_timeline")
```

---

## Signals

| Signal | When emitted |
|--------|-------------|
| `timeline_started` | A timeline begins execution |
| `timeline_ended` | A timeline finishes or hits `[end_timeline]` |

Access via `Dialogic.timeline_started` / `Dialogic.timeline_ended`.

---

## Subsystems

All subsystems are properties of the `Dialogic` autoload:

| Property | Module | Purpose |
|----------|--------|---------|
| `Dialogic.VAR` | Variable | Read/write/parse dialogue variables |
| `Dialogic.Save` | Save | Save and load dialogue state |
| `Dialogic.Text` | Text | Text display control |
| `Dialogic.Portraits` | Character | Change portraits from code |
| `Dialogic.PortraitContainers` | Character | Manage portrait containers |
| `Dialogic.Choices` | Choice | Choice visibility and state |
| `Dialogic.Audio` | Audio | Play music/SFX from code |
| `Dialogic.Backgrounds` | Background | Change backgrounds from code |
| `Dialogic.Expressions` | Core | Evaluate expressions |
| `Dialogic.Animations` | Core | Portrait animations |
| `Dialogic.Inputs` | Core | Input handling |
| `Dialogic.Glossary` | Glossary | Glossary lookup |
| `Dialogic.History` | History | Dialogue history |
| `Dialogic.Jump` | Jump | Timeline navigation |
| `Dialogic.Settings` | Settings | Runtime settings |
| `Dialogic.Styles` | Style | Layout style control |
| `Dialogic.TextInput` | TextInput | Player text input |
| `Dialogic.Voice` | Voice | Voice audio |

**Never call methods prefixed with `_`** — they are private and may break between plugin versions.

---

## Variables

Dialogue variables are defined in Dialogic Settings. Reference them in timelines with curly braces:

```dtl
Character: Your score is {Player.Score} points!
set {Player.Coins} += 10
```

Access and parse from GDScript:

```gdscript
# Parse variables in an arbitrary string (same logic as text events)
var parsed: String = Dialogic.VAR.parse_variables("{Player.Name} has {Player.Coins} coins")
```

Variable groups use dot notation: `{Group.Variable}`.

---

## Save / Load

```gdscript
# Simple save/load (uses default slot)
Dialogic.Save.save()
Dialogic.Save.load()

# Named slots
Dialogic.Save.save("slot_1")
Dialogic.Save.load("slot_1")

# Manual full-state save (for custom save systems)
func save_dialogic() -> Dictionary:
    return Dialogic.get_full_state()

func restore_dialogic(state: Dictionary) -> void:
    Dialogic.load_full_state(state)
```

---

## Timeline Text Syntax

Timelines can be authored in the visual editor or as plain `.dtl` text files. Both formats are interchangeable.

```dtl
# Plain text (no speaker)
A wonderful text event, said by no one in particular.

# Character dialogue
Emilio: Hello and welcome!

# With expression
Emilio (excited): I'm excited, can you tell?

# Multi-line text (backslash continues to next line)
Emilio: This is a very long line \
that continues here.

# Character join/leave/update
join Emilio (happy) center [animation="Bounce In"]
leave Emilio [animation="Bounce Out" length="0.3"]
update Emilio (excited) left [animation="Tada" wait="true"]

# Background
[background path="res://assets/bg.png" fade="1.0"]

# Choices
- Yes
- No
- Maybe | [if {Stats.Charisma} > 10]
- Disabled option | [if {Flag} == false] [else="disable" alt_text="(unavailable)"]

# Conditions (indentation-based)
if {Player.Wisdom} > 3:
    Emilio: Very wise!
elif {Player.Health} <= 10:
    Emilio: You look hurt.
else:
    Emilio: Hello there.

# Variables
set {Player.Score} += 10

# Labels and jumps
label ChapterStart
jump ChapterStart
jump OtherTimeline/LabelName
jump OtherTimeline/          # jump to start of another timeline

# Call GDScript from timeline
do GameManager.unlock_door("east_wing")

# End timeline explicitly
[end_timeline]

# Comments
# This is a comment

# Inline text effects
Emilio: Wait[pause=0.5]... did you hear that?[speed=0.3] I think someone is here.

# Change portrait mid-text
Emilio: Well[portrait=surprised]... that was unexpected.
```

---

## Patterns & Examples

### NPC interaction trigger

```gdscript
# On interaction with NPC
func interact() -> void:
    if Dialogic.current_timeline != null:
        return  # dialogue already running
    Dialogic.timeline_ended.connect(_on_dialogue_done, CONNECT_ONE_SHOT)
    Dialogic.start("npc_merchant")

func _on_dialogue_done() -> void:
    npc_state = NPCState.WAITING
    player.set_controls_active(true)
```

### Change portrait from code

```gdscript
Dialogic.Portraits.change_portrait(character_resource, "angry")
```

### Change background from code

```gdscript
Dialogic.Backgrounds.update_background("res://assets/bg_night.png")
```

### Preload to avoid first-dialogue lag

```gdscript
# Call during loading screen or splash
func _preload_dialogic() -> void:
    Dialogic.Styles.prepare()          # pre-warms style/shader
    Dialogic.start("_empty_timeline")  # triggers shader compilation
    Dialogic.timeline_ended.connect(
        func(): pass, CONNECT_ONE_SHOT
    )
```

---

## Configuration

Key settings in **Project > Dialogic > Settings**:

| Setting | Notes |
|---------|-------|
| **Layout Node Behaviour** | `Delete` — remove layout on end; `Hide` — hide for external transitions; `Keep` — keep for reuse |
| **Variables** | Define project variables and groups here |
| **Translation enabled** | Disable during development (CSV overrides timeline text when enabled) |

**Layout Node Behaviour** guidance:
- Use `Hide` when managing entry/exit transitions from game code.
- Use `Delete` (default) for simple games without custom layout transitions.
- Use `Keep` when the same layout is reused across back-to-back dialogues.

---

## Best Practices

- **Always guard `start()`** with `Dialogic.current_timeline == null` to prevent double-starting.
- **Connect to `timeline_ended`** (not a polling loop) to react when dialogue finishes.
- **Disconnect signals** after use — or use `CONNECT_ONE_SHOT` — to avoid memory leaks and duplicate calls.
- **Use `do` events sparingly** — prefer signals or `timeline_ended` for game–dialogue integration; `do` couples timelines to Autoload names.
- **Preload styles and shaders** during a loading/splash screen to eliminate first-dialogue freezes.
- **Keep UI at a higher Canvas Layer index** than the Dialogic layout node to ensure buttons remain clickable.
- **Disable translation** (`CSV`) until timeline content is finalized — CSV rows take priority over `.dtl` text.
- **Name character files clearly** — the filename (minus `.dch`) is the exact reference name in all timelines; renaming breaks existing timelines.
- **Avoid private API** — never call methods prefixed with `_`; they are undocumented and change without notice.

---

## Anti-patterns

- **Polling `current_timeline`** in `_process` — use the `timeline_ended` signal instead.
- **Starting a timeline without a guard** — always check `current_timeline == null` first.
- **Leaving `timeline_ended` connected** — causes multiple callbacks on subsequent dialogues.
- **Relying on underscore methods** (`_remove_character()`, etc.) — breaks on plugin updates.
- **Enabling translation too early in development** — CSV rows silently override `.dtl` text, making edits appear to have no effect.
- **Forgetting `[end_timeline]`** in branching timelines — flow may hang at the last event without an explicit end.
- **Putting UI at the same Canvas Layer as Dialogic** — Dialogic's overlay captures input and blocks game UI.
