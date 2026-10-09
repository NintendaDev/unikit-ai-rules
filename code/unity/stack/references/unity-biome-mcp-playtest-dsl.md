# Unity Biome MCP — Playtest DSL

> See also: [unity-biome-mcp-runtime-playmode.md](unity-biome-mcp-runtime-playmode.md) (direct Play Mode tools, `editor play/stop`), [unity-biome-mcp-tests.md](unity-biome-mcp-tests.md) (NUnit runs), [unity-biome-mcp-diagnostics-performance.md](unity-biome-mcp-diagnostics-performance.md) (console capture rules)

Category gate: `TESTS`. `run_playtest` and `run_playtest_suite` are always visible and direct-only (never inside
`batch`). Written against server and plugin v2.0.0; the parser and `lint_playtest` are the final authority.

> Notation: inside tables a literal pipe is written `\|` because of Markdown escaping. The real character is a bare `|`.

---

## Workflow

1. State the scenario as: initial state → action → observable value → expected change → timeout → cleanup.
2. Save it as a descriptively named file under `Assets/Playtests/`. Inline `script=` is for disposable probes only.
3. `resolve_scene_refs(refs="/HUD,t:GameManager,$player")`, then `lint_playtest(path=...)` and `lint_scene_refs(path=...)`.
4. Enter Play Mode yourself (`editor(action="play")`, then wait for `world_ready` — see the runtime reference).
   `run_playtest` **never enters or leaves Play Mode**.
5. `run_playtest(path=..., timeout=120)`.
6. Read every line containing `FAIL`, `ERR`, `TIMEOUT`, `CONSOLE_ERR`, `ABORTED` or `BLOCKED`. Keep them verbatim.
7. Stop Play Mode after success **and** after a tool error.

```text
lint_playtest(path="Assets/Playtests/door-opens.playtest")
editor(action="play")
run_playtest(path="Assets/Playtests/door-opens.playtest", timeout=60)
editor(action="stop")
```

## `run_playtest`

| Parameter | Meaning |
|---|---|
| `path` / `script` | Mutually exclusive. `path` runs are **strict**: an unresolved `$alias` is a fatal `PARSE ERROR`. Inline `script` only warns |
| `timeout` (120) | Whole-run real-time limit. `> 120` switches to a start-and-poll route; `<= 120` is one blocking call |
| `defs` | Inline `VAL` lines prepended to the script |
| `abort_on_fail` | Stop at the first failed step; **remaining steps and TEARDOWN are skipped** and Play Mode is stopped |
| `fresh` | Stop → play → wait for the world before the first step |
| `snapshot_on_failure` | Appends textual state and the last console errors to a failure. It is not a screenshot |
| `before_hook` / `after_hook` | **C# source** executed through the `execute_code` engine — not DSL. `before_hook` runs after the Play Mode check, so it cannot prepare Edit Mode state "before play". An `after_hook` failure is not reported |
| `format` | `text` (default) or `json` (step ledger; no values or messages per step) |

Outcome rules:

- A passing run returns one line: `PLAYTEST: 5/5 (33.1s) OK` — no per-step lines and no values. Add `SNAPSHOT` steps
  when a passing report must show values.
- **Every non-pass raises a tool error carrying the full report.** A pass additionally requires that the report text
  contains none of the words `FAIL`, `ERROR`, `CONSOLE_ERR`, `BLOCKED`, `TIMEOUT`, `ABORTED` — so a `LOG` or `SECTION`
  label containing one of those uppercase words turns a green run into a failure.
- `PLAYTEST: 0/0`, an empty result and a parse error are failures.
- A step fails automatically when any Error, Exception or Assert is logged while it runs (`CONSOLE_ERR during …`),
  including errors caused by another MCP client using the same Editor.
- Time scale is reset to 1 when the run finishes. Nothing else is restored: no scene reload, no state rollback.
- A domain reload during a run kills it; the next reload records it as `ABORTED: domain reload`.
- If the project disables domain or scene reload in Enter Play Mode Options, `fresh=True` and
  `restart_between=True` restart Play Mode **without** resetting statics or scene state. The scenario must reset what it
  depends on.

## `run_playtest_suite`

- Exactly one of `pattern` or `suite_path`. A wildcard is allowed only in the file-name part, the directory is relative
  to the **project root**, and the match is non-recursive: use `Assets/Playtests/*.playtest`. `**` fails. Without a
  wildcard, `pattern` is a comma- or newline-separated list of paths.
- `suite_path` is an absolute path to a `.suite` text file: one project-relative `.playtest` path per line, `#` comments.
- `auto_play=True` enters Play Mode if needed; `restart_between=True` does stop+play before each later file;
  `stop_after=True` (default) **stops Play Mode in every case**, even when you had entered it yourself.
- `timeout_per_test` above ~120 s runs into the Editor's dispatch ceiling; split long scenarios instead.
- Output: `SUITE: X/Y passed (Zs) terminal:true play_stopped:true|false`, one line per file, failure blocks, then a
  `SUITE_RESULT|…` line. **A failing suite does not raise a tool error** — read the text.
- Accept only `passed == total > 0`. An empty match is `SUITE: 0/0` and a failure.
- Do not rely on `tag=`: in the 2.0.0 package the filter fails closed (`tag filtering unavailable`). Select files with
  `pattern`.
- The matrix is coordination output. For any file whose details are missing or ambiguous, rerun it with
  `run_playtest(path=...)` and keep that report.

## Lexical Rules

| Rule | Detail |
|---|---|
| Comments | Only a line that **starts** with `#`. A trailing `# note` is not stripped and becomes part of the value. `COMMENT … END_COMMENT` for blocks |
| Case | Keywords and operators are case-insensitive |
| Tokens | Split on spaces. `"…"` protects spaces. Parentheses do **not**: write `(1,0,0)`, never `(1, 0, 0)` |
| Query | `/Path\|Component\|member`. `member` may be a dotted chain or `Method(args)`. Two-part form `/Path\|activeSelf\|activeInHierarchy\|tag\|layer\|name` |
| UI Toolkit query | `/GameObject\|UIDocument\|selector[\|field]`; fields `text value visible display enabledSelf enabledInHierarchy class width height` |
| Path escapes | `\/` and `\\` for literal slashes, or `[Name/With/Slash]` |
| Alias | `$name`, expanded textually anywhere in a line, including mid-token (`$hero\|Health\|hp`) |
| Header | `# @needs editmode` is the only enforced header: the run skips the Play Mode check, refuses a dirty scene and rejects movement, `TIMESCALE`, `SIMULATE` and frame capture. `@tags`, `@expect`, `@suite-only`, `@needs playmode` are parsed but not enforced by `run_playtest` |

## Commands

### Definitions and structure (no step emitted)

| Command | Syntax | Notes |
|---|---|---|
| `VAL` | `VAL $n /Path\|Comp\|field` or `VAL $n literal` | Parse-time text alias; last definition wins. Unity tags are pre-defined as `VAL $Tag tag`, so an alias named like a tag collides |
| `VAR` | `VAR $n @/Path\|Comp\|field` | Runtime alias: re-read each time it is used as a value |
| `PATH_PREFIX` | `PATH_PREFIX /Root` | Prefixes `VAL` values that start with `/` |
| `INCLUDE` | `INCLUDE common.defs` | Resolved under `Assets/PlaytestDefs/` only; no `..`, depth ≤ 5 |
| `MACRO` / `END_MACRO` / `CALL` | `MACRO name p1 p2` … `CALL name a1 a2` | Parse-time expansion; no nested definitions; call depth ≤ 10 |
| `FOR` / `END_FOR` | `FOR $i IN 0..3` | Half-open: 0, 1, 2. Max 10000 iterations |
| `SETUP` … `SETUP_END`, `TEARDOWN` … `TEARDOWN_END` | blocks | A SETUP failure skips the main steps and jumps to TEARDOWN |
| `ABORT_ON_FAIL` | bare line | Same as `abort_on_fail=True` |
| `SET_DEFAULT_TIMEOUT` | `SET_DEFAULT_TIMEOUT 10` | Applies to `WAIT_UNTIL` only |
| `EXPECT_FAIL` | line before a step | Inverts that step's own result |
| `SECTION "t"`, `DESC "l"`, `LOG msg` | | Report structure only |

### Waiting

| Command | Syntax | Notes |
|---|---|---|
| `WAIT_UNTIL` | `WAIT_UNTIL q op v [TIMEOUT n] [ABORT] [AND\|OR q op v …]` | Default timeout 5 s. Mixing `AND` and `OR` is a parse error. `ABORT` stops Play Mode on timeout |
| `WAIT_CAPTURED` | `WAIT_CAPTURED label INCREASED\|DECREASED\|UNCHANGED\|INCREASED_BY\|DECREASED_BY [op v] [TIMEOUT n]` | Polls against a `CAPTURE` baseline; default 5 s |
| `WAIT_STABLE` | `WAIT_STABLE q DELTA d OVER t [TIMEOUT n]` | Numeric values only |
| `WAIT` | `WAIT 2.5` | Real-time delay. `WAIT 5s` is a parse error. Use only for a deliberate observation window |

All waits measure **real time**: at `TIMESCALE 5`, `WAIT 5` spans 25 game-seconds.

### Assertions

| Command | Syntax | Notes |
|---|---|---|
| `ASSERT` | `ASSERT q op v [TIMEOUT n]`; `ASSERT /p\|C\|boolField` | Instant unless `TIMEOUT` is given |
| `ASSERT_BATCH` … `END` | block of `ASSERT` lines | One step; all must pass |
| `ASSERT_CONSOLE_CLEAN` | `ASSERT_CONSOLE_CLEAN [IGNORE "a", "b"]` | See traps below |
| `ASSERT_NEAR` | `ASSERT_NEAR /A /B dist` | Distance `<=` dist |
| `ASSERT_ONE_ACTIVE` | `ASSERT_ONE_ACTIVE /A /B /C` | Exactly one active in hierarchy |
| `CAPTURE` → `ASSERT_CAPTURED` | `CAPTURE label q`, `ASSERT_CAPTURED label MODE [op v]` | Numeric deltas |
| `ASSERT_CHANGED` | `ASSERT_CHANGED label` | String inequality — works for vectors and text |
| `CAPTURE_MIN` / `CAPTURE_MAX` → `ASSERT_MIN` / `ASSERT_MAX` | `CAPTURE_MIN $n q`, `ASSERT_MIN $n op v` | Running extremum over the rest of the run |
| `CAPTURE_FRAMES` → `ASSERT_FRAMES_DIFFER` / `ASSERT_FRAMES_STATIC` | `CAPTURE_FRAMES n INTERVAL s [CAMERA c] [LABEL l]` | `n >= 2` and `INTERVAL` are mandatory. Proves pixel change only |

Comparison semantics: operators `== != > < >= <= contains`. When both sides parse as numbers the comparison is numeric
and `==` tolerates 0.001. Otherwise it is a string comparison: `==`/`!=` ignore case, `contains` is case-sensitive, and
ordering operators raise an error.

### Actions

| Command | Syntax | Notes |
|---|---|---|
| `INVOKE` | `INVOKE /p Comp Method a,b` | Arguments are **comma**-separated; a `Vector3` takes three |
| `INVOKE_REPEAT` | `INVOKE_REPEAT n /p Comp Method [args]` | |
| `SET` | `SET /p Comp field value` | One token for the value — quote it if it has spaces |
| `SET_ACTIVE` | `SET_ACTIVE /p true\|false` | |
| `TELEPORT` | `TELEPORT /p x,y,z` | Sets world position, syncs the Rigidbody |
| `MOVE` / `MOVE_PATH` | `MOVE /p TO x,y,z`; `MOVE_PATH a > b TIMEOUT n` | Needs a movement component (see traps) |
| `CLICK` / `TAP` | `CLICK /Canvas/Btn [WAIT s]` or `CLICK /HUD\|UIDocument\|name` | See Limits |
| `FILL` / `FOCUS` | `FILL /HUD\|UIDocument\|name text` | UI Toolkit `TextField` only |
| `TIMESCALE` | `TIMESCALE 5` | Reset to 1 at the end of the run |
| `SNAPSHOT` | `SNAPSHOT q1,q2` | Always passes; prints live values |
| `MCP` | `MCP <command> k=v … [INTO $n]` | Runs a Biome command mid-scenario. Denied: `execute_code`, `sync_unity`, `await_compile`, `run_tests`, `run_playtest`, `batch`, `build`, `package`, and `editor play/stop/pause` |

## Traps That Lint Does Not Catch

- **Vector equality is a string compare.** A vector is read through `ToString()`, so `position == (1,0,0)` never
  matches. Assert scalar members (`…|Transform|position.x == 1`), use `ASSERT_NEAR`, or `ASSERT_CHANGED`.
- **`MOVE`, `MOVE_PATH` and `SWEEP_PATH` always count as passed** — also on `no movement component`, `blocked` and
  `timeout`. Follow every move with a `WAIT_UNTIL` or `ASSERT` on the resulting position.
- **`INVARIANT` and `ASSERT_CONSERVED` do not fail the run.** Violations are only appended to the report text.
- **`WAIT_UNTIL` cannot wait for a spawn.** A query whose object, component or member does not exist yet ends as
  `ERROR after 3 consecutive exceptions` within a few frames, not after the timeout. Wait on an object that already
  exists (a counter, a flag) and assert on the spawned object afterwards.
- **`ASSERT_CONSOLE_CLEAN` is not scoped to the run.** It inspects the last 20 `Error`-level entries of the whole
  console buffer and ignores `Exception` and `Assert` entries. Stale errors from before the run fail it; exceptions
  during the run are caught by the automatic per-step console check instead.
- **`IGNORE` takes one comma-separated list.** `IGNORE "a", "b"` works; `IGNORE "a" IGNORE "b"` becomes a single
  pattern that matches nothing.
- **A query without a pipe is an object path.** `ASSERT SomeType.Member != null` is read as a GameObject path and ends
  in `ERR object not found`. Only `Component.member` on a scene object is reachable; statics and objects that live only
  in a DI container are not.
- `TRACE_FLOW` always fails (`not yet implemented`). `SIMULATE` and `MONITOR` need project classes implementing
  `IPlaytestSimulator` / `IPlaytestMonitor`.
- A component is matched by its **exact type name**; a base class or interface name does not match.

## Limits

| Area | Behaviour |
|---|---|
| Input | No keyboard, touch, pointer position, drag or gamepad simulation |
| uGUI `CLICK` | Calls `Button.onClick.Invoke()` directly (only `interactable` is checked — no raycast, `CanvasGroup` or `EventSystem`), or `IPointerClickHandler` for non-Buttons |
| UI Toolkit `CLICK` | Button `clicked` callbacks fire; `ClickEvent` listeners do not. `FILL` sets the text without change callbacks |
| Scene loading | No DSL verb; opening a scene is refused in Play Mode |
| Not assertable | Console text content, audio, pixels beyond frame sums, statics, generic methods, event ordering |
| Lint blind spots | Wrong object, component, field or method names; every timing behaviour; all traps above |

## Aliases

- `PlaytestConfig.asset` (a ScriptableObject) holds project aliases plus movement and time-scale settings. Only the
  first config asset found is loaded.
- `.defs` files under `Assets/PlaytestDefs/` hold `VAL` / `VAR` lines and macros. They reach a run **only through
  `INCLUDE`** or the `defs=` argument.
- Outside playtests, `$name` is expanded in the arguments of every tool call and in `batch` text from the config asset
  and the top-level `.defs` files.
- `validate_playtest_aliases`, `sync_playtest_aliases_from_defs` and `export_playtest_aliases_to_defs` default to
  `Assets/PlaytestDefs/farm_core.defs` and `Assets/Configs/PlaytestConfig.asset` — **always pass your own `defs` and
  `asset` paths**. None of them creates a missing asset. `sync` overwrites the asset; `export` overwrites the `.defs`
  file and drops macros and comments. Pick one direction deliberately.
- `alias_status` reports whether the alias cache is loaded or stale. It is not a defs-vs-asset drift check.

## What Lint Catches

`lint_playtest` reports as errors: parse errors, the removed `ALIAS` keyword, a script with no evidence step, and a
main sequence that does not end with `ASSERT_CONSOLE_CLEAN`. It warns on unresolved aliases, an `MCP` step without a
following evidence step, and polling under `TIMESCALE > 1`. A report containing an error comes back as a tool error;
`lint_playtest_suite` stops at the first file with an error.

## Example

```text
# Assets/Playtests/door-opens.playtest
VAL $door /Level/Door
SET_DEFAULT_TIMEOUT 4

SETUP
  TIMESCALE 5
  ASSERT $door|Door|IsOpen == false
SETUP_END

CAPTURE angle_before $door|Transform|localEulerAngles.y
INVOKE $door Door Open
WAIT_UNTIL $door|Door|IsOpen == true TIMEOUT 3
ASSERT_CAPTURED angle_before INCREASED
SNAPSHOT $door|Transform|localEulerAngles.y

TEARDOWN
  TIMESCALE 1
TEARDOWN_END
ASSERT_CONSOLE_CLEAN IGNORE "known vendor warning"
```

Keep `TIMESCALE 1` for the whole scenario when the claim depends on real-time duration, frame pacing, animation timing
or physics stability.
