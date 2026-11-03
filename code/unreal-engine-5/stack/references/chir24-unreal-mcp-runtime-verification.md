# ChiR24 Unreal MCP — Runtime and visual verification

| Claim | Evidence to collect |
|---|---|
| Editor content exists | Exact object/asset/graph inspection |
| Content persists | Save outcome and package/map readback; reload when material to the task |
| Behavior works | Actual trigger/input and resulting runtime state |
| UI/appearance is correct | A viewed capture from the relevant camera/widget at the relevant size/time |
| Player can reach a goal | Movement evidence and verdict, not only a NavMesh query |
| No relevant runtime errors | Scoped log/runtime report covering the interaction |

## Prepare and own the test session

```json
{"operation":"search","query":"inspect runtime report","tool":"inspect","effect":"read","limit":2}
```

Read editor state first. Preserve a user's existing PIE session rather than stopping/restarting it blindly. Automated `playtest` and explorer operations require a Play session started through MCP; a manually started session can be refused with `PLAY_NOT_STARTED_BY_MCP`.

For timing-sensitive checks restore the editor window and inspect background throttling. Minimized editors can run at a few frames per second. Record and restore any preferences/window/game-speed changes made for the test.

Start the intended Play variant/map, then confirm pawn, possession, world and pause state. `gamePaused` is distinct from the editor's paused stepping state; resolve it through the described resume control before judging movement.

## Exercise and observe

For movement: record transform → send key-down → observe movement over a bounded interval → send key-up → confirm stopping. Always release injected inputs, including after a failed observation.

For actions: trigger the real path and inspect a durable consequence (health, inventory count, door state, score, hit counter). A transient projectile/flash can disappear between calls. Use logpoints or controlled frames when supported instead of assuming an empty actor list proves failure.

For UI: list the live widget instances and use widget-name input where supported; verify the resulting game/menu state. Preview images do not prove focus or bindings. For visuals use a capture that actually includes the target: world capture, full editor window or widget preview as appropriate, then inspect the image.

## Navigate with a playtest

After describing `control_editor.playtest`, a task-specific call can use:

```json
{"operation":"execute","capability":"control_editor.playtest","params":{"goalActor":"AcceptanceExit","acceptRadius":90,"maxSeconds":12,"checks":["BP_TestPlayer.Health > 0"]}}
```

Use names resolved in the running world. Read `verdict`, `ended`, checks, script errors, timeline and distance evidence. `pass`, `fail`, `inconclusive` and `error` are different outcomes. An accepted call or `success: true` does not turn an inconclusive navigation leg into a pass. No/partial NavMesh path means the leg may not have been attempted.

Use `explore_level` for supported exploration/escape/trap checks only after inspecting its budget and fixture ownership. Stop the session created for the task when finished, release inputs and remove only owned instrumentation.

## Diagnostics and reporting

Use `inspect.runtime_report`, described logpoint operations, `system_control.read_log` and relevant `inspect.explain` variants (collision, visibility, input, widgets, audio, lighting). Preserve relevant errors before clearing any log. Scope reports by actor/time/filter where supported.

Distinguish “command accepted”, “state changed”, “asset saved”, “interaction passed” and “visual inspected”. Report unrun tests and absent image/audio observation explicitly. Tests appropriate to a change are sufficient; do not replay the whole project merely to validate a reversible content edit.

Sources: [play-testing playbook](https://github.com/ChiR24/Unreal_mcp/blob/dev/plugins/EngineWire/Source/EngineWire/Private/MCP/Primitives/McpPromptPlaybooks.cpp), [playtest contract](https://github.com/ChiR24/Unreal_mcp/blob/dev/src/tools/catalog/capabilities/records/control-editor/playtest.ts), [Troubleshooting](https://github.com/ChiR24/Unreal_mcp/wiki/Troubleshooting), [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md). Long calls and timeouts follow [execution-safety](chir24-unreal-mcp-execution-safety.md).
