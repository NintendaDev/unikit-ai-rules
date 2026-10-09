# Unity Biome MCP — Diagnostics, Console and Performance

> See also: [unity-biome-mcp-connection-session.md](unity-biome-mcp-connection-session.md) (connection recovery, reply trimming), [unity-biome-mcp-csharp-compile.md](unity-biome-mcp-csharp-compile.md) (compile verdicts), [unity-biome-mcp-runtime-playmode.md](unity-biome-mcp-runtime-playmode.md) (runtime probes)

Core: `get_console`. Always visible: `console_mark`, `get_console_since`, `validate_references`, `lint_scene_refs`.
`VERIFY`: `scene_health`, `scan_scene`, `resolve_scene_refs`. `RUNTIME`: `get_frame_stats`, `get_memory`, `profile`,
`get_metrics`. `MEDIA`: `render_analyze`, `analyze_lod_culling`. `SYSTEM`: `brief_build`, `get_changes`,
`get_capabilities`. Written against server and plugin v2.0.0.

> Notation: inside tables a literal pipe is written `\|` because of Markdown escaping. The real character is a bare `|`.

---

## Diagnostic Ladder

Go from the cheapest deterministic signal to the most expensive probe; stop as soon as the evidence points somewhere.

1. `mcp_status()` — connection, mode, compile state.
2. `get_compile_errors()` / `diagnose()` — is the domain healthy.
3. `console_mark()` → reproduce **once** → `get_console_since(mark_id=…)`.
4. Targeted `get_component` / `inspect` on the suspect objects.
5. `scene_health`, `validate_references`, `scan_scene`, domain linters.
6. Play Mode: `query_state`, `runtime_snapshot`, a bounded `watch`, `get_frame_stats`, `profile`.
7. Screenshot — only for a visual symptom.

## Console

### The watermark flow

```text
mark = console_mark(label="before-equip")          # pure server-side timestamp, no Unity call
# … the bounded operation under test, once …
get_console_since(mark_id=mark, level="Error,Exception,Assert")
```

- Pass the exact returned token through `mark_id`. There is no `mark` argument.
- The window is "entries newer than the mark's wall-clock time". The mark does not clear or snapshot anything.
- A reply containing `[WARN: ring overflow=N …]` means entries were evicted — the window is incomplete. Repeat the
  operation with a fresh mark instead of reading the absence of errors as a pass.
- Default `level` is all levels; default `count` is 500.

### `get_console`

`get_console(count=10, level=None, keyword=None, since=None, count_only=False, first=0)`

| Behaviour | Consequence |
|---|---|
| `level` is a comma list of Unity log types: `Log`, `Warning`, `Error`, `Assert`, `Exception` | **`Error` alone excludes exceptions and assertion failures.** Use `Error,Exception,Assert` for "problems" |
| An unknown level name is ignored; a list of only unknown names means **no filter** | `level="info"` returns everything |
| Order of filters: `since` → `level` → last `count` → `keyword` | `keyword` searches only the last `count` entries. Raise `count` when filtering by keyword |
| `count` defaults to 10 | The default call sees almost nothing |
| `first` is not a pagination offset | Leave it at 0 |
| Consecutive identical messages collapse to one line with `(xN)` | Do not count lines to count occurrences |
| Line format | `[Type] HH:mm:ss.fff message [(xN)] [@ file:line]` |

### Why an expected line can be absent

- Only messages that reach Unity's log callback are captured. A project logger that filters below its own level never
  emits them — check the logger's configured level before waiting for an `Info` line.
- The buffer holds roughly 500 entries (the first 50 after a domain load plus a 450-entry ring).
- A domain reload (any script recompile) wipes logs and warnings; only the last ~20 errors survive it.
- Clearing the Unity console clears the buffer.
- A long reply can be reduced to `[... +N hidden]` by the response distiller. That is not an empty console — re-read
  with a narrower `keyword`/`level`/`count`, or confirm the claim another way (a state read, a file diff).
- Tool failures of **any** MCP client connected to the same Editor are logged as console errors and land in your
  window too.

Use `get_compile_errors` for C# compile errors — it survives a console clear.

## Scene and Reference Health

| Tool | Checks | Limits |
|---|---|---|
| `scene_health(focus="all"\|"hierarchy"\|"naming"\|"duplicates"\|"origins"\|"missing"\|"empty"\|"disabled")` | Hierarchy audit with `CRITICAL` / `WARNING` / `INFO` / `OK` tags | Findings to inspect, not a repair plan |
| `validate_references(path, depth=3, verbose=False)` | `[ERROR]` missing script or prefab asset; `[MISSING]` a serialized reference whose target is gone. Summary `N ERROR, M OK` | **Unassigned (null) fields are not reported.** `ignore_optional` has no effect. `depth=1` checks only that object |
| `resolve_scene_refs(refs="$alias,/Path,t:Type", fields=…)` | One line per token: `OK`, `MISS` or `AMB` | Resolve every `AMB` before a mutation |
| `lint_scene_refs(path=…\|snippet=…)` | Unresolved or embedded aliases, missing objects, ambiguous names in a `.playtest` file or a batch snippet | Checks against the **currently loaded** scenes: objects spawned at runtime read as missing in Edit Mode |
| `scan_scene()` | Counts of colliders, triggers, audio, lights, rigidbodies, canvases, navigation | Coverage numbers only |
| `get_changes(clear=True)` | Editor events since the last call: hierarchy, undo/redo, play mode, scene open/save, selection | **Consumes** the buffer by default; pass `clear=False` to peek |
| `brief_build(kinds="console,compile_errors,hierarchy", budget=2000)` | A token-budgeted project brief | Each section is truncated to fit the budget |

`validate_references` being clean does not prove that required references are assigned. For fields that must be set,
read them explicitly.

## Performance

| Tool | Mode | Use |
|---|---|---|
| `get_frame_stats()` | **Play Mode only** | One-shot: frame time and fps, CPU, GPU, draw calls, batches, triangles, managed memory |
| `profile(action="start", mode="burst", duration=5)` → `status` → `analyze(session="p1", focus="cpu"\|"gc"\|"rendering"\|"physics")` | **Play Mode only** | Bounded capture. `start` returns at once with a session id; poll `status`. `compare` needs `session` and `compare_with`. `mode="triggered"` is not implemented. Sessions live in memory (10 kept) and are lost on a domain reload |
| `get_memory(include="all"\|"textures"\|"meshes"\|"audio"\|"gc")` | Both | Counts and sizes; deltas are against the **previous call** |
| `render_analyze(action=…, path, detail="brief"\|"full")` | Both | `stats`, `materials`, `shaders`, `lights`, `batching`, `overdraw`, `audit`, `compare`, `frame_debug`, `shadow_audit`, `probe_audit`, `light_optimize` |
| `analyze_lod_culling(focus)` | Both | LOD coverage and occlusion data |
| `material_audit(action, platform)` | Both | Scene-wide material and texture audit |
| `get_metrics(format, reset)` | Both | The MCP server's own telemetry; `reset=True` clears counters |

Rules:

- Establish the scenario and a baseline before profiling. Compare like for like: same scene, camera, Editor state,
  time scale and resolution.
- Keep CPU, allocation, rendering, memory and loading claims separate, and report measured values with their capture
  conditions — not generic budgets.
- `render_analyze(action="stats")` stores one in-memory baseline; a later `compare` diffs against **that last sample**
  (`baseline_id` is accepted but ignored). Live counters can be zero when no Scene view is open.
- `frame_debug` briefly pauses rendering.
- Editor numbers are indicative. They are not a substitute for profiling a build on the target device.
- Stop every profiling session and clear every watch before finishing.

## Symptom Routing

| Symptom | First probe |
|---|---|
| No connection, stale port | `mcp_status`, `list_connections`, `doctor` |
| Edit not live, compile state unclear | `sync_unity` reply, then `diagnose` |
| New runtime or Editor error | Fresh `console_mark` window |
| Object missing or ambiguous | `resolve_scene_refs`, `search_scene` |
| Clicks do not reach UI | `lint_ugui` |
| Broken or missing references | `validate_references` + explicit field reads |
| Animator stuck | `debug_animator` (Play Mode) |
| Physics misbehaviour | `debug_physics` (Play Mode), `check_colliders` |
| Navigation | `navmesh_query(action="status"\|"sample"\|"path")` |
| Frame time | `get_frame_stats`, then a bounded `profile` |
| Draw calls, overdraw | `render_analyze` |
| Serialized field rename | `serialized_field_rename_audit` |

## Reporting Format

```text
SYMPTOM:      what was observed, with the exact message
EVIDENCE:     tool, arguments, the relevant lines verbatim
BOUNDARY:     what was ruled out and how
LIKELY CAUSE: stated as a hypothesis unless proven
NEXT ACTION:  one concrete step
UNVERIFIED:   what could not be checked
```

## Rules

- Never retry an identical failing call without new evidence.
- Keep exact stack traces, compiler diagnostics, expected and actual values. Do not paraphrase failures.
- A diagnostic session must leave no residue: watches cleared, profiling stopped, Play Mode stopped if you started it,
  no scene saved.
- An empty or trimmed reply is not proof that nothing happened.
