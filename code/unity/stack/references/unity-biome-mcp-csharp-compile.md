# Unity Biome MCP — C# Edit, Compile and Sync Loop

> See also: [unity-biome-mcp-tests.md](unity-biome-mcp-tests.md) (running tests after a sync), [unity-biome-mcp-connection-session.md](unity-biome-mcp-connection-session.md) (reload behaviour, error vocabulary), [unity-biome-mcp-diagnostics-performance.md](unity-biome-mcp-diagnostics-performance.md) (console delta)

Core: `compile_preflight`, `get_compile_errors`, `execute_code`. Always visible: `sync_unity`, `await_compile`,
`verify_after_change`. `VERIFY`: `diagnose`, `serialized_field_rename_audit`. `SYSTEM`: `recompile`, `release_smoke`.
Written against server and plugin v2.0.0.

---

## The Loop

Source files are written with the agent's own file tools. Unity does not know about them until it is told.

```text
compile_preflight(file_path="Assets/Scripts/Spinner.cs", new_content="<complete proposed file>")   # optional
# write the file(s) with your file tools
sync_unity(timeout=120)                    # exactly once per change set
run_tests_wait(mode="EditMode", filter="SpinnerTests", timeout=300)
```

1. Optional `compile_preflight` on the complete proposed file.
2. Write every file of the change set.
3. `sync_unity` **once**. Accept only `sync clean` or `sync clean (no compile needed)`.
4. Any other reply is a failed sync: read it, fix the cause, sync again. Do not run tests on it.
5. Focused tests, then the console delta, then any serialized data affected by the change.

## Which Tool Proves What

| Tool | Does | Does **not** |
|---|---|---|
| `sync_unity` | Imports changed sources, requests compilation, follows its own compile cycle across the domain reload, then checks compile errors and whether each assembly's debug data matches the source on disk | Prove behaviour. `sync clean` means the observed cycle finished without captured errors |
| `await_compile` | Waits for a compilation that **something else already started** | Refresh or compile anything. In v2.0.0 its fallback path cannot see the compiler state: after an external file write it sleeps a few seconds and reports `compile clean (0.0s)` regardless. `timeout=0` cannot report "still compiling". `expected_generation` has no effect |
| `get_compile_errors` | Returns the error list captured at the **last** compilation (`No compilation errors` when empty), up to 50 errors, no warnings | Know whether Unity has noticed your edit. Errors are cleared only when the next compilation starts, so a fixed file keeps showing old errors until then |
| `recompile` | Asks for an asset refresh and returns immediately | Wait, or prove the new assembly loaded |
| `diagnose` | One read-only snapshot of compile, reload and assembly-freshness signals, reduced to a verdict | Trigger anything |
| `compile_preflight` | Type-checks **one file** against the assemblies currently loaded, without writing | See below |
| `verify_after_change` | Chains wait → compile errors → console → tests → playtests | Refresh or compile. Run `sync_unity` first |

**Never treat `compile clean`, `No compilation errors` or `(no IL change)` as evidence that an edit is live.** The only
MCP call that both forces the import and checks freshness is `sync_unity`. An independent check, when it matters:
the modification time of `Library/ScriptAssemblies/<Assembly>.dll` is later than the newest edited source.

## `sync_unity` Replies

| Reply | Meaning | Next |
|---|---|---|
| `sync clean`, `sync clean (no compile needed)` | Success | Continue |
| `N compilation error(s):` + `file:line:col` lines | Compile failed | Fix, sync again |
| `FAIL:CS####`, `FAIL:unknown` | Compile failure verdict | `get_compile_errors` |
| `FAIL:stale-dll` | A source differs from the compiled assembly — the edit was not compiled | Sync once more |
| `BUILD-FAILED-WEDGE: …` | Reload failed after a build | Follow the text; do not restart the Editor |
| `GUARD-WEDGED: TriggerSync re-wedge guard fired …` | The previous cycle is stuck between "compiled" and "reloaded" | `get_compile_errors`, then `diagnose`. Repeating `sync_unity` hits the same guard until the state changes. **The import may already have happened** — check before retrying |
| `BLOCKED: <reason>` | Mutation Mode (source patch) must be disabled first | `editor(action="mutation_mode", enable=False)` |
| `REIMPORT-NEEDED: …`, `MANUAL-REQUIRED: …` | Automatic recovery exhausted; the Editor window needs focus or a reimport | Hand back to the human |
| `STOP: reload observation exceeded Ns; Unity operation may still be running` | The call's time budget ran out — Unity is **not** cancelled | Poll `diagnose` / `get_compile_errors`; do not assume failure |
| `UNITY-UNREACHABLE: …` | Connection lost while verifying | `mcp_status`, `reconnect_unity`, then `diagnose` |

Rules:

- `sync_unity` is refused in Play Mode, in a read-only server and during a domain reload.
- `resolve=True` only after changing package metadata. `bump=True` belongs to the plugin's own release workflow and
  fails in a packaged install — never use it for recovery.
- After a Package Manager resolve the call can take up to ~80 s to settle.
- A timeout does not cancel anything in Unity.

## `diagnose` Verdicts

`CLEAN-LIVE` is the only positive verdict.

| Verdict | Meaning |
|---|---|
| `FAIL:CS####`, `FAIL:unknown` | Compile errors |
| `FAIL:stale-dll`, `STALE-CACHE`, `STALE-TRANSIENT` | Compiled output does not match the sources |
| `BUILD-FAILED-WEDGE`, `WEDGE-ENGINE`, `WEDGE-STATE` | The compile/reload machinery is stuck |
| `TESTS-INVISIBLE`, `REBUILDING` | Test or all assemblies are missing |
| `STALE-DOMAIN`, `NO-OP` | Only with `prev_mvid` — see below |
| `UNKNOWN` | Busy, never compiled this session, or unreachable. **Not** evidence of success |

Do not pass `prev_mvid` to check a change in project code: the stamp it compares covers only the plugin's own
assemblies and never changes when project code recompiles, so the answer is a false `STALE-DOMAIN`.

## `compile_preflight`

- Inputs: `file_path` (Assets-relative; used for hints) and `new_content` (the **complete** file). Calling it without
  both is an error.
- Replies: `OK preflight (Nms)` possibly with `WARN:` hints; a tool error starting `ERR preflight` with diagnostics;
  `[ROSLYN UNAVAILABLE: …]` as a normal reply — that last one is **not** a pass.
- Limits:
  - one file at a time — a type defined in another new file reads as a false `CS0246`;
  - assembly-definition boundaries are ignored: every loaded assembly is referenced, so a missing asmdef reference is
    **not** caught;
  - no preprocessor symbols are defined, so `#if UNITY_EDITOR` bodies are not analysed;
  - analyzers and source generators do not run.
- A clean preflight proves syntax and types of that file against the currently loaded domain. It proves nothing about
  the final project.

## `verify_after_change`

Gates run in order and stop at the first failure:

1. wait for a compilation already in progress (at most 120 s);
2. compile errors;
3. console errors after `mark_id` — only when `mark_id` is given;
4. NUnit run — only when `run_tests_mode` is `EditMode` or `PlayMode`, with `test_filter`;
5. playtest suite — only when `playtests` is given.

```text
verify_after_change(mark_id="<token from console_mark>", run_tests_mode="EditMode",
                    test_filter="InventoryTests", timeout=300)
```

- Result: `PASS(n/5): compile + errors_clean [+ console_clean] [+ tests(c/e)] [+ playtests(a/b)] | SKIPPED: …` or
  `FAIL: <gate> gate failed` with detail.
- It inherits every `await_compile` blind spot: it is an outer gate **after** a clean `sync_unity`, never a
  replacement for it.
- `changed_files` is ignored. `timeout` bounds the compile wait and the test gate separately — it is not one wall
  clock for the whole call.
- It does not validate object references, scan the scene, capture a screenshot, create a checkpoint or save.
- The playtest gate can stop or restart Play Mode.

## `execute_code`

For bounded Editor automation and for data the typed tools cannot reach — never as a substitute for maintainable
source.

```text
execute_code(code="""
var lights = Object.FindObjectsByType<Light>(FindObjectsSortMode.None);
Undo.RecordObjects(lights, "clamp light intensity");
foreach (var l in lights) l.intensity = Mathf.Min(l.intensity, 2f);
return $"lights={lights.Length}";
""", undo_label="clamp light intensity")
```

| Topic | Behaviour |
|---|---|
| Wrapping | Bare statements are wrapped in a static `object Run()`. If the text contains the substring `class ` or `namespace ` **anywhere** — even in a comment or a string — it is compiled as-is and must define exactly one static parameterless `Run()` |
| Usings | `UnityEngine`, `UnityEditor`, `System`, `System.Linq`, `System.Collections.Generic`, and `Object = UnityEngine.Object` are present. Plain `using X.Y;` lines are hoisted; `using static` and alias usings are not |
| References | Every loaded assembly, including project asmdef assemblies. `internal` and `private` members of other assemblies are not visible to the snippet — reach them through reflection |
| Return value | `result?.ToString()`, or the string `null`. Nothing is serialized: return an explicit string (`string.Join`, a hand-built JSON string) |
| Timing | Synchronous on the Editor main thread, no `await`. The server stops waiting after 60 s while Unity keeps running; an infinite loop hangs the Editor |
| Undo | Only what the snippet records through `Undo.*`. A direct field write is neither undoable nor marks the scene dirty unless the snippet does both |
| Play Mode | Allowed. Runtime state disappears on Stop, but asset, file and settings effects persist — Play Mode is not a rollback boundary |
| Security | The Editor-side level defaults to **AllowAll**: no scan, no sandbox. `Standard` and `Strict` block file, network, process and reflection patterns. There is no per-call policy argument |
| Errors | `Compile error:` + diagnostics; a runtime exception surfaces with its message on a direct call, but only as a generic invocation error inside `batch` |

Rules:

- Keep work bounded and return a compact string that states what was done and what was counted.
- Wrap every mutation in the matching `Undo` call and mark the scene dirty when the change must persist.
- Keep file, asset and process effects out of atomic scene transactions.
- When a project exposes its own editor commands as static methods, call them through `execute_code` and return their
  result as a string.
- Each call loads a new in-memory assembly; avoid hundreds of calls in a loop — put the loop inside the snippet.

## Renaming Serialized Fields

```text
serialized_field_rename_audit(type="Game.PlayerStats", old_field="health", new_field="hitPoints")
```

- Run it **after** the renamed field has compiled: the type is looked up among loaded assemblies.
- It checks for `[FormerlySerializedAs("old")]` on the new field and greps prefabs, scenes and ScriptableObjects for
  the old name (text match — false positives are possible, binary-serialized assets are missed, capped at 100 hits).
- Output: `has_formerly_serialized_as`, `stale_assets`, `safe_to_remove_attribute`, `recommended_actions`. It modifies
  nothing.
- After the domain reload, re-read the serialized values on a real asset.

## Mutation Mode (Source Patch)

An optional, experimental fast path that patches a method body without a domain reload. It exists only when the
separate Fast Script Reload provider package is installed; without it `editor(action="mutation_mode")` reports off,
enabling it fails with `source patch provider absent`, and nothing on this page is affected. Do not enable it for
routine work: it supports only body-only changes to existing synchronous methods of non-`MonoBehaviour` classes, and a
failed patch leaves a `Recovery` state that blocks further source writes until the mode is disabled.

## Pitfalls

- Sleeping, or polling `get_console`, instead of `sync_unity`.
- Calling `await_compile` after writing files and reading `compile clean` as proof.
- Running tests after a failed, timed-out or `GUARD-WEDGED` sync — the old domain is still live.
- Editing sources while a test run is active or finalizing: the run ends `invalid` and the next dispatch is refused
  until it is finalized.
- Using `execute_code` for persistent behaviour that belongs in a source file.
