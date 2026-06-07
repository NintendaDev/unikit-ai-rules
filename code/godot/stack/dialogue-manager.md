---
version: 1.0.0
---

# Dialogue Manager (nathanhoad)

> **Scope**: Nathan Hoad's Dialogue Manager addon for Godot 4 — authoring `.dialogue` files, integrating the runtime via GDScript, managing dialogue balloon UI, writing mutations and conditions, and communicating with game state.
> **Load when**: writing dialogue scripts, integrating Dialogue Manager into scenes, showing or customizing dialogue balloons, authoring conditions or mutations in `.dialogue` files, handling dialogue lifecycle signals, debugging dialogue flow, localizing dialogue content.

---

## Core Concepts

**Stateless design** — the addon is a *data provider*, not a state manager. It reads `.dialogue` files and delivers `DialogueLine` objects; your game owns all state (variables, flags, progression). Never store game state inside `.dialogue` files.

**DialogueResource** — a compiled `.dialogue` file loaded with `load()`. One resource can contain multiple titled sections (cues).

**DialogueLine** — the data object returned per printable line. Contains character name, text, responses, tags, and `next_id` for progression.

**Balloon** — the UI layer that renders dialogue. Dialogue Manager provides an example balloon you can clone; the addon itself does not prescribe any UI.

**Mutations** — one-directional calls from dialogue into your game: `do`, `set`, or `$>` syntax. Use them to update flags, trigger animations, emit signals.

---

## API / Interface

### DialogueManager singleton

```gdscript
# Show dialogue using the default balloon (configured in Project Settings)
DialogueManager.show_dialogue_balloon(resource: DialogueResource, title: String = "", extra_game_states: Array = []) -> Node

# Show dialogue using a specific balloon scene
DialogueManager.show_dialogue_balloon_scene(balloon_scene, resource: DialogueResource, title: String = "", extra_game_states: Array = []) -> Node

# Get the next printable line — MUST be awaited
await DialogueManager.get_next_dialogue_line(resource, key, extra_game_states, mutation_behaviour)
# or shorthand directly from resource:
await resource.get_next_dialogue_line(key)

# Create a resource at runtime from a string (for testing / procedural dialogue)
var resource = DialogueManager.create_resource_from_text("~ start\nCharacter: Hello!")
```

**Signals:**

| Signal | When fired |
|--------|-----------|
| `dialogue_started(resource)` | Balloon opens |
| `dialogue_ended(resource)` | All dialogue complete |
| `got_dialogue(line)` | Each line delivered |
| `mutated(mutation)` | Before a mutation executes |
| `passed_cue(cue)` | On reaching a `~` marker |

### DialogueLine properties

| Property | Type | Description |
|----------|------|-------------|
| `character` | `String` | Speaker name |
| `text` | `String` | Rendered dialogue text |
| `responses` | `Array[DialogueResponse]` | Player choice options |
| `next_id` | `String` | ID of the next line — pass to `get_next_dialogue_line` |
| `tags` | `PackedStringArray` | Metadata labels from `[#tag]` |
| `id` / `static_id` | `String` | Line identifier / translation key |

**DialogueResponse** mirrors `DialogueLine` and adds:
- `is_allowed: bool` — false when the `[if …/]` condition failed
- `condition_as_text: String` — the original condition string

### DialogueLabel node

Drop into balloon scenes to render animated text.

```gdscript
$DialogueLabel.dialogue_line = dialogue_line
$DialogueLabel.type_out()           # starts typewriter animation

# Signals
# started_typing  / finished_typing / skipped_typing
# spoke(letter, letter_index, speed)

# Key export properties
seconds_per_step: float = 0.02     # typing speed
pause_at_characters: String        # default ".?!"
seconds_per_pause_step: float = 0.3
```

### MutationBehaviour enum

| Value | Effect |
|-------|--------|
| `MutationBehaviour.Wait` | (default) awaits each mutation |
| `MutationBehaviour.DoNoWait` | fires mutations without awaiting |
| `MutationBehaviour.Skip` | ignores mutations entirely |

---

## Dialogue File Syntax

### Structure

```dialogue
~ cue_name          # section title / entry point

Character: Line of dialogue.
- Response option A
    Character: Reply to A.
- Response option B
    => another_cue
```

### Navigation

| Syntax | Meaning |
|--------|---------|
| `~ cue` | Define a section entry point |
| `=> cue` | Jump to cue (no return) |
| `=><` | Jump and return when done |
| `=> END` | End dialogue immediately |
| `=> DONE` | End current branch, fall through |

### Conditions

```dialogue
if SomeGlobal.has_met_npc == false
    NPC: Hi, we've never met!
    set SomeGlobal.has_met_npc = true
elif SomeGlobal.relationship > 5
    NPC: Great to see you again!
else
    NPC: Hello.

# match shorthand
match SomeGlobal.quest_stage
    when 0
        NPC: The quest hasn't started.
    else
        NPC: Thanks for helping.

# Inline condition in response
- Give key [if SomeGlobal.has_key /]
- Attack [if SomeGlobal.strength >= 10 /]

# Inline condition in text
NPC: You have {{count}} [if count == 1]coin[else]coins[/if].
```

### Mutations

```dialogue
# Block mutations (keyword syntax)
do SomeGlobal.animate("NPC", "Wave")
set SomeGlobal.has_met_npc = true

# Block mutations ($> prefix syntax — equivalent)
$> SomeGlobal.animate("NPC", "Wave")
$> SomeGlobal.has_met_npc = true

# Inline mutation — pauses typing until complete
NPC: Wait a moment [do SomeGlobal.play_sound("bell")] then continue.

# Inline mutation — fire-and-forget (no wait)
NPC: Continuing [$>> SomeGlobal.fire_effect()] immediately.

# Built-in mutations
$> wait(1.5)          # pause 1.5 seconds
$> debug(variable)    # print to Output
```

### Variables & randomization

```dialogue
# Inline variable interpolation
NPC: Your score is {{SomeGlobal.score}}.

# Random lines (equal weight)
% NPC: Might say this.
% NPC: Or this instead.

# Weighted random (3× more likely)
%3 NPC: Common line.
%  NPC: Rare line.

# Random inline choice
NPC: [[Great|Wonderful|Fantastic]] to meet you!
```

### BBCode extensions

| Tag | Effect |
|-----|--------|
| `[wait=N]` | Pause typing for N seconds |
| `[wait="ui_accept"]` | Wait for input action |
| `[speed=N]` | Multiply typing speed by N |
| `[next=N]` | Auto-advance after N seconds |
| `[next=auto]` | Auto-advance immediately |
| `[[A\|B\|C]]` | Pick random text inline |

### Concurrent lines (simultaneous speech)

```dialogue
NPC_A: I start talking.
| NPC_B: And I speak at the same time!
```

### Tags & localization IDs

```dialogue
NPC: Watch out! [#warning, #urgent]
NPC: Hello there! [ID:NPC_GREETING]    # static ID for localization
## Translator note: this plays during the tutorial    # POT comment
NPC: Let's begin. [ID:NPC_BEGIN]
```

---

## State Management

**The game is the authority on state** — never put flags or counters inside `.dialogue` files as local variables for anything that needs to persist between conversations.

### Passing state into dialogue

```gdscript
# extra_game_states: Array of nodes/objects/dictionaries
# accessible by name in dialogue without prefix
var dialogue_line = await DialogueManager.get_next_dialogue_line(
    resource, "start", [self, quest_data]
)
```

```dialogue
# Inside .dialogue — access passed objects directly
if quest_stage == 2          # from quest_data dict
    NPC: Quest is at stage 2.
do complete_quest()           # calls self.complete_quest()
```

### Autoload shortcuts

In **Project Settings > Dialogue Manager > State Autoload Shortcuts**, list Autoload names (e.g., `GameManager`). Then reference their properties without prefix:

```dialogue
# Without shortcut: GameManager.health
# With shortcut registered:
if health > 0
    NPC: You're still alive.
```

Or per-file: add `using GameManager` at the top of a `.dialogue` file.

### Null-safe access

```dialogue
if some_node?.name == "Player"
    NPC: Found the player.
```

---

## Balloon System

### Quickest integration

```gdscript
# Uses balloon scene configured in Project Settings > Dialogue Manager > Balloon Path
DialogueManager.show_dialogue_balloon(load("res://dialogue/intro.dialogue"), "start")

# Listen for completion
DialogueManager.dialogue_ended.connect(_on_dialogue_ended)
```

### Custom balloon

1. **Project > Tools > Create copy of example dialogue balloon…** — never edit the original.
2. Customize `Balloon` panel theme (fonts, margins, colours).
3. Use `DialogueLabel` for text rendering and `DialogueResponsesMenu` for responses.

```gdscript
# Minimal custom balloon loop
func run(resource: DialogueResource, title: String, extra_game_states: Array = []) -> void:
    var line = await resource.get_next_dialogue_line(title, extra_game_states)
    while line != null:
        $DialogueLabel.dialogue_line = line
        $DialogueLabel.type_out()
        await $DialogueLabel.finished_typing
        # handle responses…
        if line.responses.size() > 0:
            line = await resource.get_next_dialogue_line(
                await _handle_responses(line.responses), extra_game_states
            )
        else:
            line = await resource.get_next_dialogue_line(line.next_id, extra_game_states)
    queue_free()
```

### Multiple balloon scenes

```gdscript
# Show a specific balloon scene for this conversation
DialogueManager.show_dialogue_balloon_scene(
    "res://ui/cinematic_balloon.tscn",
    load("res://dialogue/cutscene.dialogue"),
    "boss_intro"
)
```

---

## Best Practices

- **Player input during dialogue** — implement player movement in `_unhandled_input`, not `_process`. The balloon consumes input via `_unhandled_input` too, so movement stops naturally while balloon is open.
- **Cleanup after dialogue** — always connect to `DialogueManager.dialogue_ended` to re-enable player control, close HUD elements, etc.
- **Clone, never modify** the example balloon. Modifications to the original are overwritten on addon updates.
- **Use `[ID:KEY]` static IDs** on every translatable line from day one. Retrofitting is painful.
- **Keep mutations thin** — call a method on an Autoload or passed node; don't embed game logic in dialogue mutations.
- **Test dialogue in-editor** — press the play button in the dialogue editor to test flow without running the full game.
- **`await`-safety** — `get_next_dialogue_line` must always be awaited; missing `await` silently returns a `Signal` object instead of a `DialogueLine`.

---

## Anti-patterns

- **State in `.dialogue` local variables for persistent data** — local vars reset every run. Put persistent state in Autoloads.
- **Player moving during dialogue** — if you handle movement in `_process`, it ignores input blocking. Move to `_unhandled_input`.
- **Forgetting `dialogue_ended` signal** — not listening means you never know when to unlock the player or close UI.
- **Calling `get_next_dialogue_line` without `await`** — returns a coroutine/Signal, not a `DialogueLine`. Always prefix with `await`.
- **Hardcoding the balloon path** in scripts — configure it in Project Settings so you can swap balloons globally.
- **Showing dialogue before the node is in the scene tree** — `show_dialogue_balloon` adds a CanvasLayer to the current scene; call it only after the scene is ready.
- **Ignoring `is_allowed`** on responses — always filter `line.responses` by `response.is_allowed == true` before displaying choices to the player.
