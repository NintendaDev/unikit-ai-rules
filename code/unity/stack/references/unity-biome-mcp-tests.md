# Unity Biome MCP — NUnit Test Runs

> See also: [unity-biome-mcp-csharp-compile.md](unity-biome-mcp-csharp-compile.md) (a clean sync comes first), [unity-biome-mcp-playtest-dsl.md](unity-biome-mcp-playtest-dsl.md) (scenario tests without NUnit), [unity-biome-mcp-connection-session.md](unity-biome-mcp-connection-session.md) (reply offload and distillation)

Always visible: `run_tests_wait`, `run_tests`. `TESTS`: `get_test_run`, `list_test_runs`, `resolve_test_request`,
`cancel_test_run`, `get_test_count`, `get_test_progress`, `get_test_results`. None of the dispatch tools can be
batched. Written against server and plugin v2.0.0 with Unity Test Framework 1.6.

> Notation: inside tables a literal pipe is written `\|` because of Markdown escaping. The real character is a bare `|`.

---

## The One Normal Path

```text
run_tests_wait(mode="EditMode", filter="^Game\\.Tests\\.InventoryTests\\.", timeout=300,
               request_id="inventory-edit-001")
```

- One `run_tests_wait` call per logical run. It preflights the domain, dispatches once, survives domain reloads and
  polls the exact run. Do not rebuild that loop with `run_tests` + polling.
- A passing result is compact **JSON** with `"state":"terminal"` and `"outcome":"passed"`. Anything that does not
  start with `{` is not a result: `BLOCKED`, `START-UNKNOWN`, `TIMEOUT`, `PROTOCOL-ERROR`.
- Always pass your own `request_id` (`[A-Za-z0-9._-]`, 1–200 characters, unique per logical run). It is the key to the
  durable record when the call does not come back.
- Run focused EditMode tests first. Use PlayMode only when the claim needs frames, physics, rendering or coroutines.
- `mode` is exactly `EditMode` or `PlayMode`, case-sensitive.

## Preconditions That Block a Run

| Condition | How it surfaces |
|---|---|
| Uncompiled or failed source edits | `BLOCKED: FAIL:…` from the preflight — through `run_tests_wait` this is **masked** as `START-UNKNOWN\|…\|reason=invalid-start-response` |
| Compiling / reload pending / failed last compile | `Unity is compiling. Retry in 5s.`, or dispatch failure `compilation is in progress` / `domain reload is pending` |
| Editor in Play Mode | Dispatch failure `cannot run tests while the Editor is in Play Mode` |
| **A loaded scene has unsaved changes** | Dispatch failure `scene has unsaved changes; save or discard them before tests: <path>` |
| Untitled scene open, prefab stage open | Dispatch failure naming the scene condition |
| **Another run is active** — started by MCP or by a human in the Test Runner window | Dispatch failure `test run already active: <run_id>` |
| Previous run still `finalizing` | Same; poll that run so it can finish |

Rules:

- Check all loaded scenes with `scene(action="list")` before dispatching; the status line shows only the active
  scene's dirty flag. In a shared Editor a dirty scene is the other person's work — do not save or discard it to get
  the run through; hand back instead.
- A refused dispatch reaches `run_tests_wait` as `PROTOCOL-ERROR|…|reason=run-start-boundary-missing`. The real cause
  is **not** in that line. Read `issues[].message` of the embedded snapshot, or the `dispatch_failed` line in the run's
  `events.jsonl`, before changing the filter or rebuilding.
- A run **replaces the open scenes** with a temporary owned scene and restores them afterwards. This is why dirty
  scenes block it.

## `filter`

The string is split on `|` first; each piece becomes an unanchored regular expression against the test's full name.

| Want | Write |
|---|---|
| One fixture exactly | `^Ns\.Fixture\.` |
| Several fixtures | Join whole expressions with a bare pipe at the top level — see the example below |
| Nested fixture | `Outer\+Inner` or `Outer[+.]Inner` (the full name uses `+`, which is a regex quantifier) |
| Parameterised test | Match the prefix before `(`, or escape the parentheses |
| Everything in a mode | Omit `filter` |

```text
filter = ^Ns\.FixtureA\.|^Ns\.FixtureB\.          two fixtures: one bare pipe between two complete expressions
filter = ^Ns\.(FixtureA|FixtureB)\.               WRONG: split at the pipe into two broken expressions
```

- **Never put `|` inside parentheses.** `(A|B)` is split into two unbalanced expressions and the run ends `invalid`
  with an infrastructure error.
- A bare `Ns.Fixture` is a substring regex: `.` matches any character and `Ns.FixtureExtra` matches too.
- **A filter that matches nothing does not fail in Unity**: the run finishes `outcome: passed` with
  `expected_count: 0`. `run_tests_wait` turns that into `PROTOCOL-ERROR|…|reason=run-zero-match-*`; the legacy
  `get_test_results` prints `0 tests … outcome=passed`. Always check that the executed count is greater than zero.
- Categories, assemblies and explicit test lists are not selectable through the public tools.
- A filter proves only what it selected. Record mode and filter with the result.

## Accepting a Result

Accept a pass only when **all** hold in the terminal snapshot for the run you dispatched:

- `state` (lifecycle) is `terminal` and `outcome` is `passed`;
- `expected_count > 0` and `completed_expected_count == expected_count`;
- `failed`, `invalid`, `missing_count`, `unexpected_count`, `conflict_count` are all zero;
- `request_id` and `run_id` are the ones from your dispatch.

`outcome` values: `passed`, `failed`, `cancelled`, `incomplete`, `invalid`, `dispatch_failed`.

- `failed` is a real test result: read the failing leaves.
- `invalid` can be caused by an infrastructure issue while every test passed (for example a leftover preview scene, or
  source files edited during the run). Judge it by the counters and by `issues[]`: with all leaves passed and one
  unrelated infrastructure issue, the tests are green but the run is not clean evidence — say so explicitly.
- `incomplete`, `dispatch_failed`, `cancelled` are never a pass.

## When the Call Does Not Come Back

| Reply | Meaning | Do |
|---|---|---|
| `TIMEOUT\|request_id=…\|run_id=…\|snapshot=…` | The caller stopped waiting. **The Unity run is not cancelled and may already be finished** | `get_test_run(run_id)` or read the durable record |
| `START-UNKNOWN\|request_id=…\|reason=…` | The start acknowledgement was lost, or the preflight blocked | `resolve_test_request(request_id)`; never dispatch with a new id |
| `PROTOCOL-ERROR\|…\|reason=…\|snapshot=…` | The terminal evidence failed validation | Keep the record, read the snapshot; never accept it as a pass |
| `BLOCKED: …` | Domain not ready | Fix compile or domain state, then start a new intentional run |

`resolve_test_request(request_id)` answers `none` (nothing persisted — reusing the **same** id is safe),
`tests-started|…|run_id=…` (poll that run), or `test-request|…|state=…|outcome=…[|reason_b64=…]` — the reason is
base64-encoded UTF-8.

**Large runs.** A terminal snapshot grows by roughly 600 characters per test. Beyond about 130 tests it exceeds the
reply size limit and arrives as `Data saved to: <file>` instead of JSON. `run_tests_wait` cannot parse that, keeps
polling until its own `timeout`, and only then returns the on-disk summary marked `"read_via":"disk"`. Consequences:

- For a large run, a call that is "still running" long after the tests finished is expected. Read the durable record
  instead of waiting.
- Set `timeout` close to the real duration of the run rather than leaving the 900 s default.

## The Durable Record

Everything about a run is on disk under `<project>/Library/UnityMCP/TestRuns/`:

| File | Content |
|---|---|
| `requests/<request_id>.json` | Binds your `request_id` to a `run_id`, mode and filter |
| `runs/<run_id>/run.json` | Identity, `lifecycle`, `outcome`, `health`, timestamps, `source` (`mcp` or `unity-ui`) |
| `runs/<run_id>/summary.json` | The reconciled result: counters, `issues[]`, and `leaves[]` with `full_name`, `outcome`, `message`, `stack_trace` |
| `runs/<run_id>/events.jsonl` | Journal: `run_started`, `test_finished`, `dispatch_failed` (with the reason), `domain_reloading`, `run_finalized` |
| `runs/<run_id>/utf-results.xml` | NUnit 3 XML with failure text |
| `active.json`, `latest.json` | Pointers to the active and newest run |

- All files are UTF-8 without BOM.
- Reading path after any lost or late reply: `requests/<request_id>.json` → `run_id` → `run.json`
  (`lifecycle == "terminal"`?) → `summary.json`.
- `lifecycle`: `prepared → dispatched → running → finalizing → terminal`. `health`: `healthy`, `reloading`,
  `no_test_progress`, `editor_unresponsive`, `suspected_stall`.
- A completed `utf-results.xml` does not mean the run is over. Wait for `lifecycle == "terminal"` before editing any
  source: a domain reload during `finalizing` leaves the run hanging, and the next dispatch is refused with
  `test run already active`.
- A run in `finalizing` is finalized when it is polled — call `get_test_run(run_id)`.
- Per-test failure text lives in `summary.json` → `leaves[]`, in `events.jsonl`, and in the XML. `list_test_runs` and
  `get_test_results` carry counts only.
- The newest 50 terminal runs are kept; older ones are pruned.

## Low-Level Tools

| Tool | Use |
|---|---|
| `run_tests(mode, filter, request_id)` | Dispatch only. Returns `tests-started\|request_id=…\|run_id=…\|utf_guid=…\|state=dispatched`. For recovery and integrations that own polling |
| `get_test_run(run_id)` | Full JSON snapshot of one exact run. A run started from the Test Runner window always answers `PROTOCOL-ERROR … request-intent-mismatch`; its embedded snapshot is still readable |
| `list_test_runs(limit=20)` | Recent runs, newest first, counts only. For diagnosis — never to replace a lost `run_id` with "the latest" |
| `cancel_test_run(run_id)` | Asynchronous request. Keep polling the same run until terminal; a cancelled run ends `cancelled` or `incomplete` |
| `get_test_count()` | `discovering` first, then `<total>\|edit=<n>\|play=<n>`. Discovery only |
| `get_test_progress(run_id)`, `get_test_results(run_id)` | Legacy summaries. Without `run_id` they describe whichever run is latest — never use them for acceptance |

## Reporting

State for every verdict: mode, filter, `request_id`, `run_id`, counts (`passed/failed/skipped`, expected vs
completed), and for failures the exact test names with expected and actual values and the first stack frame. A
timeout, a disconnect, a partial result or "the newest run" is not a verdict.

## Pitfalls

- Dispatching again with a new `request_id` after `START-UNKNOWN` or `TIMEOUT` — it either collides with the active run
  or doubles the work.
- Changing the filter after a dispatch failure without reading the actual reason.
- Trusting `outcome` alone, in either direction.
- Starting a run while a human is running tests in the Editor, or editing code while your own run is finalizing.
- Running the whole suite to check a one-fixture change, then running a sibling suite "for reassurance". One focused
  green run that covers the claim is the evidence.
