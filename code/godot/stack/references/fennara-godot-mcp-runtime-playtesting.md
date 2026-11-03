# Fennara Godot MCP — Runtime Playtesting

> See also: [Input settings](fennara-godot-mcp-settings-input.md), [Visual observation](fennara-godot-mcp-visual-animation.md), [Multiple projects](fennara-godot-mcp-multi-project-worktrees.md).

## Pick the runtime source

| Situation | Correct evidence |
| --- | --- |
| Managed scene started by Fennara | `runtime_session` receipts plus full `runtime_session.log` |
| Bounded observation/input inside that managed scene | `runtime_script` |
| Scene manually run by the user inside Godot | `scrape_editor` debugger snapshot |
| Only saved appearance is relevant | Detached `screenshot_scene` |
| Existing automated test suite is required | The project's real test runner and terminal result |

There is no Fennara CLI managed-playtest command. Launching Godot directly does not create a Fennara-managed session identifier or its ownership/lease/log contract.

## Acquire and release the Runtime Slot

Call `runtime_session`:

```json
{"action":"status"}
```

When free, request a bounded run:

```json
{
  "action":"start",
  "scene_path":"res://scenes/workshop.tscn",
  "max_run_seconds":180
}
```

A preflight status is advisory; start is the atomic claim. Continue only with `status: "started"` and `slot_acquired: true`. Its `availability: "busy"` then reflects your acquired slot.

A successful `busy` result with `slot_acquired: false` is contention, not a started scene or a tool error. Wait at least `retry_after_ms` plus jitter before retrying. There is one managed Runtime Slot across projects and no FIFO queue.

Keep the returned `session_id`. Owner calls use it:

```json
{"action":"status","session_id":"returned-session-id"}
```

Only the owning canonical Project Root can inspect details, renew, probe, or stop. A different project gets anonymous busy or `runtime_session_not_owned_or_found`.

While keeping a run alive, call owner status roughly every 30 seconds with jitter. It renews a 120-second inactivity deadline. A bounded active owner operation suspends inactivity expiry; a terminal script result renews it, but timeout/setup error/cancellation does not. The absolute lease never pauses.

`max_run_seconds` defaults to 900 and accepts 1–86,400. Budget cleanup time. Stop promptly when evidence is complete:

```json
{"action":"stop","session_id":"returned-session-id"}
```

A final probe may instead call `ctx.close_scene()`. Do not close the session at the end of every incremental probe.

## Preflight and launch semantics

Start runs scene structural/script gates and, for C#, the actual Debug runtime build. Failed gates prevent launch. The managed game is a separate windowed Godot process, not the editor's manually running game.

Startup requires both ready and orientation markers within 20 seconds. Missing markers cause kill/reap and `startup_timeout`; do not report an initially successful running session.

Optional `user_args` are passed unchanged after Godot's `--` separator and read by the game with `OS.get_cmdline_user_args()`. Use only arguments the project actually supports.

## Probe contract and helpers

`runtime_script` requires `session_id` and exactly one of `code`/`script_path`. Runtime scripts extend `RefCounted` and define `func run(ctx: Variant) -> void`. **Do not include `@tool`.**

The default probe operation budget is 30,000 ms, bounded to 500–120,000 ms. A longer session lease does not extend one probe's budget.

Before an unfamiliar helper, read installed `addons/fennara/runtime/runtime_script_context.gd` and its relevant helper file. Do not infer option names, coordinate spaces, return fields, or success semantics from a method name.

| Need | Helpers to inspect |
| --- | --- |
| Live root/node/state | `get_scene_root`, `node`, `exists`, `snapshot` |
| Bounded condition | `until`, `until_exists`, `until_missing`, `until_prop` |
| Project InputMap | `press_action`, `release_action`, `tap_action`, `action_sequence` |
| Raw keyboard/mouse | Input driver helpers and `input_event` |
| Coordinate conversion | `world_to_viewport_2d`, `set_mouse_world_2d` |
| Sensing | `raycast_2d/3d` and bounded scan variants |
| UI interaction | `click_at`, `click_button` and button lookup helpers |
| Cleanup | `release_all_actions`, `release_all_inputs` |

Await yielding helpers, including waits, taps, movements, condition waits, clicks, captures, and restart. Synchronous setters/readers, raycasts, cleanup, `sheet`, and `output` do not need await. Verify exact signatures in the installed source.

## Example: one observed action pulse

Use only after inspecting that `workshop_confirm` and `Hud/Status` are the real action and outcome display. This is a bounded experiment; a changed caption is an observation, not a universal success predicate.

```gdscript
extends RefCounted

func run(ctx: Variant) -> void:
    var root: Node = ctx.get_scene_root()
    if root == null:
        ctx.error("No live scene root.")
        return
    var status: Label = root.get_node_or_null("Hud/Status") as Label
    if status == null:
        ctx.error("Observed status node is unavailable.")
        return
    var before: String = status.text
    var sent: bool = await ctx.tap_action("workshop_confirm", 0.08)
    await ctx.wait(0.12)
    ctx.release_all_inputs()
    root = ctx.get_scene_root()
    if root == null:
        ctx.log("Scene closed after the action.")
        return
    status = root.get_node_or_null("Hud/Status") as Label
    if status == null:
        ctx.log("Status node was replaced; inspect the current scene.")
        return
    ctx.log("Input accepted=%s; text before=%s; text after=%s" % [
        str(sent), before, status.text
    ])
    await ctx.capture("after-confirm")
```

Read the current helper contract before using the pulse. Prefer condition waits over fixed delays once a real success signal is identified. Add explicit cleanup before every early exit after a hold; for timeout/failure recovery, send cleanup from a follow-up owner probe or stop the session.

## Observation discipline

1. Inspect InputMap, controller/aim/camera code, paths, groups, and project success signals.
2. Observe the live state.
3. Apply one short input/experiment.
4. Await processing or a bounded condition.
5. Re-fetch current root/nodes, measure the change, and choose the next action.

Bound loops by time or count. Release simulated inputs on success, failure, direction change, and early return. Nodes can become invalid after awaits, deletion, restart, reload, and transitions. Re-observe after planning delays; the game keeps simulating between calls.

Viewport mouse, UI, canvas, and world coordinates differ. Convert 2D world targets through the documented helpers; never pass a global position to a viewport helper by assumption. Ray hits and input-helper success are sensing/dispatch evidence, not gameplay completion.

Do not rewrite gameplay semantics merely to make a probe pass. Requested product fixes are valid; identify them and verify the final intended behavior.

## Images, logs, and physics

`await ctx.capture(label)` immediately saves/publishes and returns a Dictionary receipt. `await ctx.frame()` returns an unsaved Image; collect exact states, compose with `ctx.sheet`, then publish with `ctx.output`. Screenshot-worker `ctx.capture` has a different return type.

For exact physics checkpoints, use the real runtime, pause between observations, and count completed physics callbacks through a bounded project-local probe. Record transforms/velocities/contacts with images. Compare fresh sessions when solver history matters; choose event/tolerance checks when exact replay is not justified.

Receipts contain capped new log excerpts and advance a cursor. Read the full saved runtime log for older/omitted context. Intentional stop/non-zero exit alone is not proof of failure. Lease expiry and startup failure are terminal for that session; preserve the reason.

## Sources

See [source inventory](fennara-godot-mcp-sources.md): runtime/session/scraper schemas, `tools.md`, generated runtime guidance, and `runtime/runtime_script_context.gd`.
