# GDAI Godot MCP — Runtime and acceptance checks

---

| Claim | Evidence to obtain |
|---|---|
| A scene starts | Intended launch target, observed startup and fresh diagnostics |
| UI looks correct | Open and inspect `get_running_scene_screenshot` result |
| Editor composition is correct | `get_editor_screenshot` plus hierarchy/property inspection |
| Input causes a behavior | Known input, observed state change and relevant diagnostics |
| Content survives reopening | Saved-file inspection and, where useful, scene reconstruction |
| Tests/build pass | Actual runner completion and result from a separately available workflow |

## Run the intended target

1. Inspect diagnostics and save intended changes. Determine whether the check needs an isolated scene or the configured main scene and its initialization.
2. Use `play_scene` with the launch selection from its installed schema. Do not assume a boolean argument name or that any scene can run independently.
3. Observe startup. Capture a running-game screenshot for visuals and reproduce the behavior being changed.
4. Read fresh errors/output. Stop with `stop_running_scene` when the check is complete or before another edit that requires a stopped game.

A screenshot of the editor can contain a game view, but does not by itself establish which process, scene or behavior was tested. Inspect the actual image instead of treating its returned filename as visual verification.

## Input is a conditional capability

The configuration page mentions `simulate_input`, but the supported-tools page does not list its contract. Discover it and inspect its schema before use. Do not infer keyboard, mouse, action, duration or coordinate formats. If disabled, do not silently re-enable it.

If no runtime-input route exists, use another available authorized interaction route or report that the interaction remains unverified. Editor-code execution does not imply access to the running game's `Input` singleton.

Within actual game code, action-state injection and event dispatch differ: `Input.action_press()` changes action state but does not call `_input()`; `Input.parse_input_event()` dispatches an event. Choose based on how the target handles input. Do not introduce a persistent test hook solely to conceal unavailable automation.

## Worked case: verify a collectible

```text
play_scene: launch the world that contains the pickup
  → observe initial counter and pickup placement
  → move into it through a verified input route
  → observe one award and the pickup's intended removal/state change
  → repeat contact if possible to check duplicate awards
  → get_godot_errors: inspect fresh diagnostics
  → stop_running_scene
```

The checks are authored acceptance criteria; no particular diagnostic response format is assumed.

## Turn broad prototype prompts into bounded slices

The official examples include voxel and driving prototypes. Use their themes to define observable increments:

| Prototype | First slice | Further acceptance checks |
|---|---|---|
| Voxel sandbox | One controllable actor and one editable block | Distinct break/place actions, selected inventory slot, valid placement, readable materials/UI |
| Driving collection game | Drivable vehicle and one collectible | Single award per pickup, visible countdown, time-up state, restart behavior |

Load scene/resource references while building composition, the scripting reference for behavior and the UI reference for HUD. Revisit this file for each acceptance run. A successful launch does not establish completion of the whole prototype.

Sources: [play/screenshots/errors tools](https://gdaimcp.com/docs/supported-tools), [conditional input availability](https://gdaimcp.com/docs/configuration), [prototype scenarios](https://gdaimcp.com/docs/examples), [Godot Input semantics](https://docs.godotengine.org/en/stable/classes/class_input.html).
