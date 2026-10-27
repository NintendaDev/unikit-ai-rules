# Unity CLI — Play Mode, runtime commands, capture, console, dev Player
> See also: [unity-cli-editor-session.md](unity-cli-editor-session.md), [unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md), [unity-cli-tests.md](unity-cli-tests.md), [unity-cli-build-ci.md](unity-cli-build-ci.md)

Written against Unity CLI 1.0.0-beta.14 and com.unity.pipeline 0.9.1-exp.1; the live catalog (`unity command --query <term> --format json`) outranks this page.

---

## Goal -> command

Entering Play Mode is setup, not proof. `playMode: "playing"` does not mean the game runs, and a screenshot renders on demand, so it can show the last frame of a frozen game. Always: play -> confirm frames advance -> capture -> read the console. Base rules (`--project-path`, JSON, exit codes): [../unity-cli.md](../unity-cli.md).

| Goal | Command |
|---|---|
| Enter / leave / pause Play Mode | `editor.playmode start` / `editor.playmode stop` / `editor.playmode pause` (a toggle) |
| Play state and loop liveness | `editor status` -> `playMode`, `frameCount`, `playerLoopTicking`, `runInBackground` |
| Keep the loop running unfocused | `editor set_auto_tick`, `editor.playmode set_run_in_background` |
| Prove frames advance | `job wait` on `UnityEngine.Time.frameCount` with `op: changed` |
| Screenshot | `capture game_view`, `capture scene_view`, `capture screenshot` |
| Capture the frame a state first holds | `job wait ... --on_met` with `capture` |
| Console | `console status`, `console get`, `console clear` (`console write` is Player-tagged) |
| Read or tune a live value | `script eval` ([unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md)) |
| Time scale | Editor: `script eval`; Player: `runtime set_time_scale` |
| Key / pointer input | `runtime simulate_key`, `runtime simulate_pointer` (Input System; Player-tagged) |
| Player status / quit / target FPS | `runtime status`, `runtime quit`, `runtime set_target_frame_rate` |
| Frame / memory / render stats | `diagnostics get_performance` |
| Static analysis | `diagnostics run_audit` -> poll `diagnostics audit_status` |

## Case 1 - verify a feature in Play Mode (the order)

**When:** any task whose acceptance is "it works in the running game".

```bash
unity status --format json                     # which Editor, state "ready"?
unity command editor status --result-only      # playMode must read stopped; if playing or paused, the session is the user's
unity command editor set_auto_tick             # once per Editor session (enable=true, interval_ms=16, persist=true)
unity command editor.playmode set_run_in_background
unity command editor.playmode start
unity status --until-ready --project-path <project> --format json
unity command editor status --result-only      # playMode playing, playerLoopTicking true
unity command job wait -- --condition '{"member":"UnityEngine.Time.frameCount","op":"changed"}' --timeout 10
unity command capture game_view --source screen --width 960 --height 540 --max_resolution 640
unity command console get --tail 50 --level error
unity command editor.playmode stop
unity command editor.playmode set_run_in_background --enable false
```

PowerShell 5.1: the `job wait` JSON becomes `'{\"member\":\"UnityEngine.Time.frameCount\",\"op\":\"changed\"}'` ([quoting rules](unity-cli-scripts-compile-eval.md#quoting-c-and-json-on-windows)). After `--`, `--timeout` is the wait's own budget in seconds; before it, it would be the CLI's request timeout.

**Verify, in this order:**
1. State: `editor status` reads playing. A "success" text from `start` with state `stopped` means the entry was refused (compile errors, a modal dialog); the reason is in the console (bridge check `compile-1`).
2. Liveness: `job wait` returns `met: true` with `framesObserved > 0`. `timedOut: true` is the frozen-at-frame-1 symptom: go to Case 2 before trusting anything else. `editor status` also carries `frameCount` and `playerLoopTicking` (true when the count advanced within the last second; false while paused or frozen); compare `frameCount` reads at least a second apart. An absent key means the server does not report it: treat it as unknown, not as "not ticking".
3. Image: Case 3.
4. Console: Case 4. Re-run steps 2-4 after every change you make to the running game.

**Pitfalls:**
- `start` drops the Pipeline listener for several seconds (domain reload). `unity command <name>` retries a busy Editor within its `--timeout`; `unity status --until-ready` is the explicit wait. `EDITOR_NOT_READY` (exit 6) means it stayed unavailable.
- Already playing or paused when you looked = the user's session: read it (`editor status`, capture, console), change nothing, stop nothing.
- Undo the overrides you set: `set_run_in_background --enable false` after `stop`. The override survives until reverted, lives only in the Editor (never in a build) and is gone after an Editor restart.
- Play Mode blocks mutating scene, GameObject and component commands (they fail with a recoverable error before touching state; reads are fine). Edit in Edit Mode, then play. Changes made through `script eval` during play are lost at `stop`. A Multiplayer Play Mode scenario is started with `editor.playmode start_scenario`, not `start` ([unity-cli-multi-editor-worktrees.md](unity-cli-multi-editor-worktrees.md)).

## Case 2 - the game is frozen (frame 1)

| Observation | Cause | Action |
|---|---|---|
| `playerLoopTicking: false`, `runInBackground: false` | unfocused Editor, Run In Background off | `editor.playmode set_run_in_background` BEFORE `start` (or the project setting "Ensure editor runs in background in PlayMode") |
| ticking false, run-in-background true | paused | `editor.playmode pause` toggles back; confirm the user did not pause on purpose |
| ticking false, no auto-tick | Editor update throttled | `editor set_auto_tick` |
| still false on Windows | locked desktop | tell the user; do not retry in a loop |
| commands rejected `blocked_by_dialog` | modal dialog | [unity-cli-editor-session.md](unity-cli-editor-session.md) |

Fallback only on a session YOU started: pause, then advance one frame per `script eval` call (an eval holds the player loop until it returns) and read the count in its own call:

```bash
unity command script eval 'UnityEditor.EditorApplication.isPaused = true;'
unity command script eval 'UnityEditor.EditorApplication.Step();'
unity command script eval 'return UnityEngine.Time.frameCount;'
unity command script eval 'UnityEditor.EditorApplication.isPaused = false;'
```

A frame is not a fixed span of game time, and `Time.timeScale = 0` stops `Time.time` while `frameCount` still advances.

## Case 3 - capture

```bash
unity command capture game_view --source screen --max_resolution 640        # inline base64, downscaled
unity command capture game_view --source screen --save_path "<project>/Temp/shots/a.png"
unity command capture screenshot --view game --output "<project>/Temp/shots/b.png"
unity command capture scene_view --width 1280 --height 720
```

- `source=screen` is the composited Game view and includes Screen Space - Overlay UI in Play Mode; it needs a Game view window. `source=camera` renders one camera off-screen and NEVER shows overlay canvases (naming `--camera` implies it). Pass `--source` explicitly: the default is `screen` from Pipeline 0.8.0-exp.1 and was `camera` before.
- With `save_path` the result is a path only; `--include_inline_image true` adds the image, and `max_resolution` only shapes the inline copy. Width and height are capped at 4096.
- `capture screenshot` writes a PNG and returns its path; by default under `<project>/Temp/pipeline-screenshots/`, outside the AssetDatabase.

**Verify:**
- Where did the file land? `save_path` is documented as project-relative but has landed inside `Assets/` and been imported (bridge check `visual-1`). Prefer an absolute path in `<project>/Temp/` (whether an absolute `save_path` is honored is not documented: `ls` the result, and create the folder first if the call fails on the path), and delete any copy found under `Assets/` with `asset delete` ([unity-cli-assets-import.md](unity-cli-assets-import.md)).
- A single-colour image is suspect: a `source=screen` capture on a locked Windows desktop came back solid cyan with no error. Check the frame count is rising before you believe it (a fade to black is legitimate). When unattended, use `--source camera`.
- No baseline and no diff exist; judge the image yourself against the intended look.

**Capture on a state, atomically** (short-lived screens): arm an async wait that screenshots in the frame the condition first holds, then keep working.

```bash
unity command job wait -- --async true --timeout 300 --condition '{"member":"Game.Session.State","op":"equals","value":"Ended"}' --on_met '{"capture":{"view":"game","source":"screen","save_path":"<project>/Temp/shots/end.png"}}'
unity command job wait_status -- --wait_id <waitId>      # repeat until state is not "pending"
```

A failed capture is reported as `onMetError` while `state` stays `met`: read it. `job wait` is rejected inside `job batch`, a sync wait blocks the command queue, async waits do not survive a domain reload, and `start` itself reloads the domain unless Enter Play Mode Options disable it. (The CLI's own `unity job wait <job-id>` is a different command: [unity-cli-editor-session.md](unity-cli-editor-session.md).)

## Case 4 - console

```bash
unity command console status --result-only                      # counts, groundTruth, cursor; cheap, poll-safe
unity command console get --tail 50 --level warn                # level is a minimum: log < warn < error
unity command console get --since <cursor> --since_session <session>
unity command console clear
```

- Take a cursor BEFORE the action (`console status` carries it), read the delta after, and always echo the `session` back as `since_session`: a cursor from another session returns the tail with `reset=true`.
- A clean read is not proof of a clean run. The buffer holds about two thousand entries, so a flood can push an error out: compare `counts.error` with `groundTruth.consoleErrors` and look at `dropped` (bridge check `console-1`). `groundTruth.consoleErrors` above `counts.error` is expected only for output from before the package loaded.
- `console clear` keeps the cursor (the next `get` shows `dropped=true`) and does not remove sticky compile errors until the next compile. `groundTruth.compilationFailed` is a hint; the compile verdict comes from `unity recompile` (bridge `compile-2`).

## Case 5 - drive and tune the running game

```bash
unity command script eval 'return Game.Session.Instance.Score;'          # placeholder type: use the project's own
unity command script eval 'UnityEngine.Time.timeScale = 0.25f;'
unity command script eval 'UnityEngine.Time.timeScale = 1f;'              # restore explicitly
unity command runtime simulate_key --key Space --action press
unity command runtime simulate_pointer --x 540 --y 960 --action click --button left
```

- Prefer `script eval` against the live instance over leaving Play Mode, recompiling and re-entering. A new type or persistent change needs the recompile loop; a method-body fix can use method reload ([unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md)).
- `timeScale` survives your command: put it back before `stop`. Ask before changing it on a session you did not start.
- `simulate_key` (action `down`, `up` or `press`) and `simulate_pointer` (action `move`, `down`, `up` or `click`) need the Input System package and an Active Input Handling that includes it; otherwise they report unavailable. Pointer coordinates are screen pixels with the origin at the BOTTOM-left: a point read off a screenshot (origin top-left) needs `y = Screen.height - y`. They are tagged `runtime` (Player); whether the Editor's Play Mode accepts them is not documented: read the reply, and fall back to calling the game's own entry points with `script eval`.

## Case 6 - the dev Player runtime server

Commands tagged `runtime` target a running Player: they are listed everywhere, but only a Player does anything useful with them, and `job batch` refuses them.

| Command | Editor Play Mode | Dev Player runtime server |
|---|---|---|
| `script eval`, `script eval_file` | yes | yes |
| `console get`, `console status`, `console clear` | yes | yes (no `groundTruth`) |
| `runtime status`, `quit`, `set_target_frame_rate`, `set_time_scale`, `simulate_key`, `simulate_pointer`, `console write` | do not rely on it | yes |
| `capture runtime_element` (UI Toolkit, Unity 6000.7+) | - | yes |
| `capture game_view`, `scene_view`, `editor.*`, scene/object/asset commands | yes | not documented for a Player |
| `script.methodreload reload` | yes | yes (Mono desktop dev build) |
| `script.methodreload reload_player` | served by the Editor; needs a connected development Player (PlayerConnection, works on IL2CPP) | |

**Setup:** (1) Project Settings -> Pipeline -> Runtime: tick "Enable in Development & Profiled Builds" (the project recompiles; read it with `settings.runtime_pipeline get`, writes need `confirm`, see [unity-cli-settings-packages.md](unity-cli-settings-packages.md)). (2) Build a Development Build ([unity-cli-build-ci.md](unity-cli-build-ci.md)) and run it. (3) The server takes the first free port in 7900-7949 and writes `.unity-pipeline-runtime-port` beside the executable (the `.app` root on macOS, `persistentDataPath` on Android). (4) Connect; these options go after `command` and before the group:

```bash
unity command --runtime <player>.exe runtime status
unity command --runtime-path "<build-folder>" script eval 'return UnityEngine.Time.timeScale;'
unity command --runtime <player>.exe runtime set_target_frame_rate --frameRate 30
unity command --runtime <player>.exe console write --message "checkpoint" --level warning
unity command --runtime <player>.exe runtime quit
```

**Verify:** `runtime status` answers; if not, search `Player.log` for `Pipeline: Runtime server started successfully on port`. **Pitfalls:** the server binds `127.0.0.1` only and every call needs the descriptor's bearer token (the CLI reads it): a Player on a phone listens on the phone's own loopback, and reaching it from the PC is not covered here. It executes arbitrary code: enable it for development and QA builds only, never release (that is a separate toggle).

## Case 7 - performance snapshot and audit

```bash
unity command diagnostics get_performance --result-only
unity command diagnostics run_audit --categories Code,ProjectSetting
unity command diagnostics audit_status --result-only      # repeat until completed | failed | unavailable | interrupted
```

`get_performance` is read-only render, memory and frame-timing stats. `run_audit` writes a CSV (`csvPath` from `audit_status`, default `<project>/Temp/pipeline-audit/`): read it with the file tool (columns Category, Severity, Areas, Description, RelativePath, Line, DescriptorId, Recommendation). `unavailable` means Project Auditor or the `com.unity.project-auditor-rules` package is missing: it never reports an empty "completed". `interrupted` = a domain reload killed the scan; re-run. One scan at a time (`busy`), no cancel.
