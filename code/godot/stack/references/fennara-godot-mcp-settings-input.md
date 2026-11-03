# Fennara Godot MCP — Project Settings and Input

> See also: [Runtime controls](fennara-godot-mcp-runtime-playtesting.md), [Visual validation](fennara-godot-mcp-visual-animation.md), [Export maintenance](fennara-godot-mcp-maintenance-export.md).

## Structured settings operations

| Need | `project_settings` action |
| --- | --- |
| Discover an unfamiliar setting name | `find_setting` with a non-empty prefix/key/query |
| Read one known value | `get` with an exact key |
| Read settings saved/changed in this project | `list`, optionally with a prefix |
| Add/update one setting or InputMap action | `set` |
| Remove one exact setting | `remove` |

Use this tool for `project.godot`. Ordinary text tools help find code consuming a setting; they do not replace Godot-aware persistence. Fennara's CLI has no general project-settings command.

## Discover, change, read back

Call `project_settings` separately for these dependent steps:

```json
{"action":"find_setting","prefix":"display/window/size/"}
```

Select a key actually returned by discovery, inspect it, then set the value with the correct type. For a project using the shown key:

```json
{"action":"get","key":"display/window/size/viewport_width"}
```

```json
{"action":"set","key":"display/window/size/viewport_width","value":720}
```

Read it back and inspect the affected view. `list` reports project-saved settings, not every engine default. `find_setting` deliberately requires a non-empty search; do not dump all known settings.

For renderer changes, first inspect `fennara_status` rendering context and consider the intended platform. Check current official Godot support when uncertain. A changed setting alone does not prove compatibility, correct output, or that a restart-sensitive setting is active.

## Input actions

Inspect existing InputMap and the consuming script before adding or replacing controls:

```json
{"action":"list","prefix":"input/"}
```

Example for a **new** project action after confirming its name is unused:

```json
{
  "action":"set",
  "key":"input/workshop_confirm",
  "events":[{"event_type":"key","physical_keycode":69}],
  "deadzone":0.3
}
```

Use structured `events` rather than a raw `value` for input actions. Supported event types in the snapshot are `key`, `mouse_button`, `joypad_button`, and `joypad_motion`; read the installed schema for their fields. Distinguish a logical `keycode` from a physical key binding.

Treat updating an existing action as replacing its intended configuration: inspect and preserve every binding that should survive. Do not assume a set operation appends to prior events.

Verify persisted event summaries/deadzone, then use a short real runtime input and inspect the project-specific outcome. An action name does not establish what the game does with it.

## Autoloads

Read existing `autoload/` entries and startup dependencies before changing one. For an intentionally enabled singleton:

```json
{
  "action":"set",
  "key":"autoload/WorkshopRegistry",
  "value":"*res://scripts/workshop_registry.gd"
}
```

The leading `*` enables the autoload. Confirm the target script exists and diagnoses cleanly, then verify startup behavior. Never remove or rename Fennara's capture autoload as a gameplay shortcut. The explicit addon-free CI exception is `fennara prepare-export` in the maintenance reference.

## Verification boundaries

Project settings can affect startup, rendering, input, and addon behavior. Select validation accordingly: code diagnostics for the autoload script, scene startup for boot paths, screenshots for display/UI, and runtime state for input. Do not claim all settings are live merely because persistence succeeded.

## Sources

See [source inventory](fennara-godot-mcp-sources.md): `tools.md`, generated renderer-sensitive guidelines, and `project_settings.json`.
