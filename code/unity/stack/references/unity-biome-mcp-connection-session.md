# Unity Biome MCP — Connection, Session and Response Handling

> See also: [unity-biome-mcp-csharp-compile.md](unity-biome-mcp-csharp-compile.md) (sync and compile verdicts), [unity-biome-mcp-batch-transactions.md](unity-biome-mcp-batch-transactions.md) (batch surface, checkpoints), [unity-biome-mcp-diagnostics-performance.md](unity-biome-mcp-diagnostics-performance.md) (console and scene diagnostics)

Covers the Python server layer that sits between the agent and the Unity plugin: visibility of tools, how replies are
rewritten or served from cache, which refusals look like success, the error vocabulary, reload behaviour, and where the
server persists state. Written against server and plugin v2.0.0.

> Notation: inside tables a literal pipe is written `\|` because of Markdown escaping. The real character is a bare `|`.

---

## Architecture in One Paragraph

The agent talks to a Python MCP server (launched by the client, usually through `uvx`). The server holds **one** TCP
connection to the Unity Editor plugin and sends commands over it **strictly one at a time** — a long call (a 60 s
batch, a build, a test dispatch) delays every other call, including `mcp_status`. Each call passes through server-side
middleware that may answer from a cache, rewrite the path, refuse the call, or trim the reply before the agent sees it.

## Status and Liveness

`mcp_status()` is the one-call orientation probe. It never raises; it reports even when Unity is unreachable.

| Field | Meaning |
|---|---|
| `liveness=connected` | Socket open |
| `liveness=connected-stalled` | Socket open but the status probe failed |
| `liveness=domain-reloading` | Unity announced a reload and closed the socket |
| `liveness=reconnecting` | Socket closed, reconnect in progress |
| `liveness=dormant` / `waking` | Idle-suspended after 30 min without calls; wakes on the next call |
| `liveness=disconnected` | Reconnect gave up (about 90 s disconnected and not busy) |
| `unity_status`, `pid_alive` | Status probe result; whether the Editor process from the port file is alive |
| `last_contact_s`, `ping_fail`, `ping_stall`, `queue_depth` | Seconds since last contact; heartbeat health; calls waiting in the serial queue |
| `scene=`, `dirty=`, `playing=`, `compiling=`, `port=`, `aliases=`, `readOnly=`, `plugin_version=` | Editor state as Unity reports it |

Rules:

- `dirty=` describes the **active** scene only. List the loaded scenes (`scene(action="list")`) before concluding the
  Editor is clean.
- A `domain-reloading` value that persists with a growing `last_contact_s` usually means the Editor restarted its
  server on another port. Call `reconnect_unity()` once and re-read the status, instead of waiting.
- `list_connections()` prints `port N | tcp:<state> | stdio:alive|dead`.

## Port Discovery and Reconnect

- Each running Editor writes `~/.unity-biome-mcp/ports/<unityPID>.port` (port, project path, project name). Default
  port 9500; the plugin moves to another free port when 9500 is busy, and may move again after a domain reload.
- The server picks: `UNITY_MCP_PORT` → the port file whose project path is a prefix of the client's working directory →
  the newest port file of **any** project → 9500. A client started outside the Unity project can therefore attach to
  the wrong Editor.
- `reconnect_unity(port=0)` rediscovers the port and builds a new connection. It returns
  `Connected to Unity on port N` or `Registered Unity on port N (not yet available)` — the second form is **not** a
  success and does not raise.
- Category enablement is reset only when the port actually changed.
- `doctor()` runs five checks (Python version, port files, lock files, TCP probe, compile/reload state).
  `doctor(fix=True)` only deletes port and lock files whose process is dead; it never restarts or reconnects anything.

## Tool Visibility

| Tier | Tools | Listed with full schema |
|---|---|---|
| Core (13) | `batch`, `compile_preflight`, `create_object`, `editor`, `execute_code`, `get_compile_errors`, `get_component`, `get_console`, `get_hierarchy`, `inspect`, `manage_component`, `mcp_status`, `set_property` | Yes |
| Always visible (27) | `apply_scene_change`, `await_compile`, `console_mark`, `delete_object`, `discover_tools`, `get_changeset`, `get_console_since`, `lint_scene_refs`, `permission_prompt`, `reconnect_unity`, `resolve_tool_schema`, `run_playtest`, `run_playtest_suite`, `run_tests`, `run_tests_wait`, `scene`, `scene_change_plan`, `screenshot`, `search_scene`, `set_active`, `set_parent`, `sync_unity`, `ui_intent`, `uitk_intent`, `validate_references`, `verify_after_change`, `vfx_intent` | Yes |
| Category-gated (120) | Everything else, in `SCENE`, `COMPONENTS`, `ASSETS`, `UGUI`, `UITOOLKIT`, `MEDIA`, `VERIFY`, `RUNTIME`, `TESTS`, `SYSTEM` | **No** — empty schema, one-sentence description |

- `discover_tools(category="MEDIA")` enables a category for the session; `discover_tools(enable=False,
  structured=True)` only lists, adding `surfaces=direct|direct,batch`, `mutability=` and `plane=` per tool. Category
  names are case-sensitive; `CORE` is not a category.
- Gating affects **listing only**. A hidden tool is still callable by name, so gating is not a permission boundary.
- `UNITY_MCP_NO_GATING` (any non-empty value) lists all tools — but the gated ones still arrive with **empty
  schemas**. Call validation uses the real schema, so an argument that is not in the real schema fails with
  `unknown argument(s) for tool X`.
- Before the first use of any non-core, non-always-visible tool, call `resolve_tool_schema(tools="a,b,c")` once for
  everything you plan to use. It returns the full docstring (the only place the action lists live) and a `Params:`
  line with names, required markers and coarse types — no defaults.
- `get_enabled_tools()` reports the Unity-side enablement from **MCP > Settings > Tools**, not the session gating. A
  tool disabled there fails with `Tool 'X' is disabled in settings`.

```text
discover_tools(category="ASSETS")
resolve_tool_schema(tools="prefab,asset,scriptable_object")
```

## Replies Are Rewritten

| Mechanism | Affects | Marker | How to get the real data |
|---|---|---|---|
| Default stripping | `get_component`, `inspect`, `get_object_detail` — lines whose value is `0`, `false`, `null`, `""`, `(0, 0, 0)`, `(1, 1, 1)`, `[]`, `Untagged`, `Default`, … disappear | **none** | Request the fields explicitly: `fields="mass,isKinematic"`. `full=True` does **not** restore them |
| Distiller | Any reply of 1500+ characters from a command outside `set_property`, `batch`, `execute_code`, `create_object`, `delete_object`, `manage_component`, `set_active`, `wire_event`, `recompile` — once any object-targeted call has been made in the session. It keeps only lines mentioning recently touched paths | `[... +N hidden]`, `[DISTILLED heuristic A->B chars …]` | `full=True` on `get_hierarchy`, `get_component`, `inspect`, `get_object_detail`. For every other tool: read through `batch`, narrow the query, or read the file from disk |
| Hierarchy diff | Repeated `get_hierarchy` | `[DIFF since #N]`, `[DIFF since #N: NO_CHANGE]` | `full=True` — mandatory after a context reset, when the earlier full tree is gone |
| Read cache (12 s) | `get_component`, `get_hierarchy`, `get_components_list`, `inspect` right after a write to the same path | `[CACHED]`, `[CACHED:reflect-snapshot]` | Change a real argument (`compress=True`, another `depth`), wait 12 s, or read through `batch` |
| `find_objects(name=…)` shortcut | Answered from the last `get_hierarchy` tree by **exact** name, without reaching Unity | **none** | Add `tag`, `layer` or `component`, or use `search_scene` |
| Unity soft caps | `get_hierarchy` 50 000 chars, `search_scene` 30 000, `get_console` 20 000, `runtime_snapshot` 50 000 | `[TRUNCATED: N chars, showing first M]` | Narrow with `root`, `depth`, `filter`, `level`, `keyword` |
| File offload | Any reply above ~82 000 characters | `Data saved to: <project>/Temp/MCP/output_….txt` | Read that file |
| `ask` without an LLM | `ask` | Raw output cut to 500 characters | Call the underlying read tool |

Rules:

- The distiller applies to `get_console`, `get_compile_errors`, `search_scene`, `validate_references`, `uitk_file`
  reads and `get_test_run` as well. A reply containing `[... +N hidden]` is **not** the full evidence: failure text may
  be among the hidden lines. Re-read it another way before concluding anything from an absence.
- The read cache is not invalidated by `execute_code`, `batch`, or a human editing in the Editor. A `get_component`
  within 12 s of a `set_property` can describe the state from before a later `batch`.
- `summary=True` on `get_hierarchy` silently ignores `depth`, `filter`, `components`, `compress` and `incremental`.
- Extra lines are appended or prepended to replies that did run: `[HINT: …]`, `[REFLECT: …]` (the write reply did not
  match the requested value — verify with a read), `--- AUTO STATE (call #N) ---` after every tenth write,
  `⚠ CONSOLE ERRORS:`, `[next: …]`, `[confidence: x]`. Strip them before parsing a reply as JSON or as a
  pipe-delimited record.

## Path Handling by the Server

- An argument named `path` is checked against the tree from the last `get_hierarchy`. A path that is not in the tree
  can be **silently replaced**: by a unique suffix match, or by the single object whose name contains the last segment.
  A typo or a stale path may therefore act on a different object.
- `[RESOLVED: leaf->path via …]` in front of a reply means the call ran on a path other than the one you passed. Check
  that it is the intended object.
- `[AMBIGUOUS: 'leaf' matches N paths]` means the call was **not sent**. Pass the unique full path.
- Arguments named `parent`, `root`, `target`, `paths`, and every path inside `batch`, `configure_objects` or
  `set_properties` text, are not rewritten.
- Values starting with `&` (hierarchy short ref), `$` (alias or hex id) or `#` (instance id) are passed through
  untouched.

## Refusals That Arrive as Plain Text

These come back as an ordinary result, not as a tool error. The command was **not executed**.

| Reply begins with | Cause | What to do |
|---|---|---|
| `⚠ RETRY (within 5.0s): identical <cmd>` | Same write with the same arguments as the previous write, inside 5 s | Read the state; the earlier call may already have succeeded |
| `[INVALID: component\|prop '…' on …]` + `[FIX: …]` | A name within two edits of a known name — treated as a typo | Use the suggested name, or go through `batch` / `set_properties` when the name is really correct |
| `Component 'X' not found on 'path'. Known: …` | The server's component cache does not know the component (added through `batch`, `execute_code` or a prefab edit) | `get_component(path, type="X")` once, then repeat |
| `[AMBIGUOUS: …]` | Several objects match the path leaf | Pass the full path |
| `err: 'X' requires Play Mode. Use editor(action='play') first.` | Runtime-only tool in Edit Mode | Enter Play Mode |
| `Circuit OPEN: Unity unavailable. Auto-retry in Ns` | Three consecutive send failures | `mcp_status`, then `reconnect_unity` |
| `BLOCKED: …`, `STOP: …`, `REIMPORT-NEEDED: …`, `MANUAL-REQUIRED: …`, `GUARD-WEDGED: …`, `STALE-DOMAIN: …`, `UNITY-UNREACHABLE: …` | Sync, compile or test preflight verdicts | See the compile and tests references |
| `START-UNKNOWN\|…`, `TIMEOUT\|…`, `PROTOCOL-ERROR\|…` | Test-run protocol records | See the tests reference — never re-dispatch with a new id |
| `error: unknown or expired plan_id` | `apply_scene_change` with a plan older than 600 s or from a restarted server | Create a new plan |

Also silent: `configure_objects` and `set_properties` drop malformed lines and fail only when nothing parsed;
`use_skill` with an unknown name returns the skill list instead of an error.

## Error Vocabulary (tool errors)

| Shape | Meaning | Retry |
|---|---|---|
| `VALIDATION: …` | Bad arguments | After fixing them |
| `NOT_FOUND: …` | Object, asset or key missing | After fixing the target |
| `STATE: …` | The Editor or the object is in the wrong state for this operation | After changing the state |
| `NULL_REF: …` | A broken reference inside the handler | Run `validate_references`; **re-read state — the mutation may already have landed** |
| `STALE_CACHE: …` | A short ref went stale | `get_hierarchy`, then retry with a fresh path |
| `TIMEOUT: …`, `UNAVAILABLE: …`, `INTERNAL: …` | Handler timeout; missing optional provider; unexpected exception | Diagnose first |
| `Play mode active — changes will be lost. Stop play mode first.` | Mutating command in Play Mode | After `editor(action="stop")` |
| `Not in Play Mode. Use editor(action='play') first.` | Runtime-only command in Edit Mode | After entering Play Mode |
| `Unity is compiling. Retry in 5s.` / `Server initializing. Retry in 2s.` | The command was not dispatched | After `await_compile` |
| `[UNITY_UNAVAILABLE] state=reloading transient=True …` | Domain reload; the command was **not sent** | After the reload |
| `[UNITY_UNAVAILABLE] … \| Connection error: <text>` | Transport failure — the text after `\|` says which: process dead, compiling, TCP refused, not responding, reconnect cooldown, capacity (8 clients), project mismatch | Depends on the text |
| `… was sent; outcome is uncertain and the unsafe command was not retried` | The frame may have reached Unity | **Never retry blind** — read the state first |
| `READ_ONLY_BLOCKED: …` | Server started with `UNITY_MCP_READ_ONLY=1` | Not retryable |
| `unknown argument(s) for tool X: a, b` | Argument not in the real schema | `resolve_tool_schema` |
| `Unknown error` | In v2.0.0 a detected build-wedge loses its message | `diagnose`, `get_compile_errors`, `sync_unity` |

An error message of the form `'top: A, B, C' not found. Root objects: …` quotes the list of scene roots, not the path
you passed. Confirm the miss with a second, independent read before treating the object as absent.

## Domain Reload and Compilation

- While a reload is in progress the server rejects every command that is not retry-safe, **instantly and unsent**.
  Reads pass. So do the idempotent writes: `set_property`, `set_active`, `set_material`, `set_parent`,
  `rename_object`, `set_rect`, `project_settings`, `wait_until`, `run_tests`, `cancel_test_run`, `reconnect_unity`.
- Blocked during a reload: `batch`, `execute_code`, `create_object`, `manage_component`, `delete_object`, `scene`,
  `editor`, `asset`, `prefab`, `wire_event`, `unwire_event`, `recompile`, `run_playtest`, `sync_unity`.
- Retry-safe commands are retried automatically up to three times (2, 4, 8 s). Others are never resent once the frame
  may have been delivered.
- If the client cancels a pending call, the server closes the connection; Unity may still finish the command.

Default per-command timeouts: 30 s; `get_console` 10; `get_hierarchy` and `search_scene` 15; `execute_code` 60;
`batch` 75 (inner budget 60); `sync_unity` 120; `apply_scene_change` 120; `build` 300; `verify_after_change` 300 per
gate; `run_tests_wait` 900; `ask_user` 300.

## Mutation Gates

| Gate | Behaviour |
|---|---|
| Play Mode | Every mutating command is refused **except** `set_parent`, `execute_code`, `screenshot`, `wait_until`, `invoke_method`, `editor`, `profile start/stop`. Action-style tools are registered as mutating as a whole, so even their read actions are refused: `asset`, `prefab`, `material`, `shader`, `scriptable_object`, `project_settings`, `scene_environment`, `references`, `animation`, `animator`, `particle`, `menu`. `scene` and `timeline` reads stay available. When the server already knows the Editor is playing, `set_property` is silently rerouted to a runtime field write that is lost on Stop |
| Runtime-only tools | `debug_animator`, `debug_physics`, `get_frame_stats`, `invoke_method`, `move_to`, `profile`, `query_state`, `test_step`, `wait_until`, `watch(action="add")` |
| Read-only server | `UNITY_MCP_READ_ONLY=1` refuses every write and every unknown command — including `execute_code`, `run_tests`, `recompile`, `screenshot`, `sync_unity` |
| Unity settings | **MCP > Settings > Tools** can disable a command for all clients |
| Permission prompts | Apply only to the in-Unity chat. An external client is never asked — every destructive tool runs without confirmation |

## LLM-Backed Tools

| Tool | Needs | Without it |
|---|---|---|
| `do`, `ui_intent`, `vfx_intent`, `animator_intent`, `uitk_intent` (no template or preset) | Server env `UNITY_MCP_VISUAL_VERIFY=1` and an authenticated `claude` CLI | Tool error `Haiku … unavailable` |
| `ask` | Same, for summarizing | Raw output cut to 500 characters |
| `screenshot(describe=…)`, `screenshot_compare` semantic modes | Same | `[DEGRADED:…]` plus the file path or the pixel result |
| `run_playtest` report summary | Same | Plain compressed report |
| `auto_fix`, `smart_build` | MCP sampling support in the client | Plain text `Sampling unavailable: …` |

`debug` is not an LLM tool: it runs a keyword-selected batch of `inspect` and `get_console`. Deterministic templates
(`ui_intent`: `hud`, `menu`, `dialog`, `grid`; `uitk_intent`: `hud`, `menu`, `dialog`, `settings`, `editor_window`;
`vfx_intent` presets) never call an LLM. `budget_status()` reports the estimated LLM spend; `set_llm_config` overrides
profiles for the current server process only.

Treat every intent tool as a drafting aid: call it with `dry_run=True`, read the plan, then run the exact typed
commands yourself. A second `do` call samples a new plan — a dry run is not an approval token.

## What the Server Persists

| Item | Location | Notes |
|---|---|---|
| Learned skills | `<project>/.claude/skills/learned/<name>.json` | `save_skill` / `use_skill` / `list_skills`. The kind is guessed: text containing `;`, `var `, `new `, `//` or `using ` is stored as **C#** and later run through `execute_code` |
| Scene templates | `<project>/.claude/templates/<name>.cs` | `save_template` / `apply_template`, `${key}` substitution, run through `execute_code` |
| Session context | `<project>/.claude/session-context.json` | `save_session` / `load_session`: a hierarchy summary for orientation only — nothing is restored |
| Screenshot baselines | `<project>/.claude/baselines/<name>.png` | |
| Screenshots | `<project>/ScreenShots/` | Only the 20 newest are kept |
| Large replies | `<project>/Temp/MCP/output_*.txt` | |
| Port files, locks, crash log, budget, checkpoints | `~/.unity-biome-mcp/` | |

Decide deliberately whether the `.claude/` artifacts belong in version control: skills and templates are executable
code. Save a skill only after the same stable, batch-compatible sequence has appeared at least twice; never store
secrets, machine-specific paths, tests, screenshots or waits in one.

## Server Environment Variables Worth Knowing

| Variable | Effect |
|---|---|
| `UNITY_MCP_PORT` | Fixed port, skips discovery |
| `UNITY_MCP_NO_GATING` | Any non-empty value lists all tools (schemas of gated tools stay empty) |
| `UNITY_MCP_FULL_SCHEMAS=1` | Lists every tool with its full schema |
| `UNITY_MCP_DISTILL=0` | Disables the response distiller for the whole server |
| `UNITY_MCP_PREFETCH_CACHE=0` | Disables the 12 s read cache |
| `UNITY_MCP_HINTS=0`, `UNITY_MCP_AUTO_STATE=0` | Removes hint lines and the every-tenth-write state block |
| `UNITY_MCP_READ_ONLY=1` | Refuses every write |
| `UNITY_MCP_VISUAL_VERIFY=1` | Enables all `claude -p` backed features |

They are read at server start; a change needs an MCP server restart.

## Recovery Ladder

1. `mcp_status()` — read `liveness`, `playing`, `compiling`.
2. Compiling or reloading: wait with `await_compile`, do not retry mutations.
3. Unreachable with a live Editor: `reconnect_unity()` once, then `mcp_status()` again.
4. Still unreachable: `doctor()`; `doctor(fix=True)` only when it names stale port or lock files.
5. Source edit not live: follow the `sync_unity` verdict; `diagnose()` to classify a stall.
6. Never use repeated reconnects, long sleeps or enabling every category as a generic recovery loop — each changes
   state without explaining the failure.
