---
version: 1.0.0
---

# Unity Biome MCP

> **Scope**: Operating the Unity Editor through the Unity Biome MCP server (v2.0.0) — choosing among its ~160 tools, addressing scene objects and assets, batching and transactional scene edits, the C# write → sync → test loop, NUnit and playtest runs, Play Mode probes, UI, media and physics authoring, and the evidence each kind of claim requires, including the server behaviours that silently rewrite paths, values and replies.
> **Load when**: calling any Unity Biome MCP tool, reading or editing a scene, prefab or asset through MCP, syncing Unity after writing C# files, running Unity tests or playtests from an agent, verifying Play Mode behaviour, taking Editor screenshots, recovering a lost Unity connection, choosing which MCP tool fits a task, debugging a call that returned an error, a blocked state, a stale or trimmed reply.
> **References**: `.unikit/memory/code/stack/references/unity-biome-mcp-connection-session.md` (connection, tool visibility, reply rewriting, error vocabulary), `.unikit/memory/code/stack/references/unity-biome-mcp-batch-transactions.md` (batch grammar, atomic edits, undo), `.unikit/memory/code/stack/references/unity-biome-mcp-scene-objects.md` (scenes, objects, components, property and value syntax, events), `.unikit/memory/code/stack/references/unity-biome-mcp-prefabs-assets.md` (prefabs, asset database, ScriptableObjects, project settings), `.unikit/memory/code/stack/references/unity-biome-mcp-csharp-compile.md` (sync and compile loop, execute_code), `.unikit/memory/code/stack/references/unity-biome-mcp-tests.md` (NUnit runs and their durable record), `.unikit/memory/code/stack/references/unity-biome-mcp-playtest-dsl.md` (playtest scenario language), `.unikit/memory/code/stack/references/unity-biome-mcp-runtime-playmode.md` (Play Mode probes), `.unikit/memory/code/stack/references/unity-biome-mcp-ugui.md` (Canvas UI), `.unikit/memory/code/stack/references/unity-biome-mcp-uitoolkit.md` (UXML and USS), `.unikit/memory/code/stack/references/unity-biome-mcp-diagnostics-performance.md` (console, health checks, profiling), `.unikit/memory/code/stack/references/unity-biome-mcp-screenshots-visual.md` (captures and visual diff), `.unikit/memory/code/stack/references/unity-biome-mcp-animation.md` (clips, Animator, Timeline), `.unikit/memory/code/stack/references/unity-biome-mcp-materials-vfx.md` (materials, shaders, particles), `.unikit/memory/code/stack/references/unity-biome-mcp-physics-spatial.md` (colliders, spatial queries, NavMesh)

> Notation: inside tables a literal pipe is written `\|` because of Markdown escaping. The real character is a bare `|`.

---

## Core Model

- Two processes: a Python MCP server started by the client, and a plugin inside the Unity Editor. The server holds one
  connection to the Editor and sends commands **one at a time**.
- The Editor is **stateful and often shared** with a human. Every call reads or changes a live session: open scenes,
  dirty flags, Play Mode, selection, the Undo stack, running tests.
- Almost every reply is **text**. A call that returns is not a call that succeeded — the outcome is in the text.
- Between the agent and Unity sits middleware that can answer from a cache, substitute the object path, rewrite a
  value, refuse a call with an ordinary-looking reply, or cut the reply down. The rules below exist because of that.
- No destructive tool asks for confirmation. Deleting objects and assets, overwriting files, discarding scenes and
  changing project settings all execute immediately.
- This rule is written against server and plugin **v2.0.0**. The live schema and the live Editor state outrank it:
  check `plugin_version` in `mcp_status` and resolve schemas when the version differs.

## Operating Loop

1. **Orient** — `mcp_status()` when connectivity, mode or compile state is uncertain.
2. **Read narrowly** — a hierarchy summary, one subtree, or the exact fields you need. Never a full-scene dump first.
3. **Resolve schemas** — `resolve_tool_schema(tools="a,b")` before the first use of any tool outside the core set.
4. **Mark the console** — `console_mark()` before a mutation whose side effects matter.
5. **Mutate with the narrowest tool** that expresses the intent.
6. **Read back** the changed state by name.
7. **Verify** with the check that matches the claim (see Evidence Rules).
8. **Save** only what you own, only after the evidence is clean.
9. **Clean up** — stop Play Mode you started, clear watches, delete temporary objects.

```text
mcp_status()
get_hierarchy(root="/Level", depth=2, full=True)
mark = console_mark(label="add-spawner")
batch(commands="""
create_object name=Spawner parent=/Level/Checkpoint
manage_component path=/Level/Checkpoint/Spawner type=AudioSource action=add
set_property path=/Level/Checkpoint/Spawner component=AudioSource prop=m_PlayOnAwake value=false
""", on_error="stop", atomic=True)
get_component(path="/Level/Checkpoint/Spawner", type="AudioSource", fields="m_PlayOnAwake")
get_console_since(mark_id=mark, level="Error,Exception,Assert")
```

When a project keeps `.unikit/MCP-RECHECK-NOTES.md`, read it before relying on a success reply in the areas it lists —
it records cases where a call reported success while the Editor disagreed.

## Domain Lookup Workflow

Open the reference for the work at hand **before** the first call in that domain. Open one at a time; add a second only
when the task genuinely crosses domains. Do not act on a domain from memory of the tool names alone.

| The task involves… | Open |
|---|---|
| A lost connection, a tool that is "missing", an empty schema, a trimmed, cached or odd-looking reply, an unfamiliar error text, intent tools (`do`, `ask`, `*_intent`) | `unity-biome-mcp-connection-session.md` |
| Combining commands, all-or-nothing scene edits, rollback, checkpoints, `undo_last`, learned skills | `unity-biome-mcp-batch-transactions.md` |
| Scenes, hierarchy, GameObjects, components, serialized properties, object references, `UnityEvent` wiring | `unity-biome-mcp-scene-objects.md` |
| Prefab assets and instances, moving or deleting assets, ScriptableObjects, project settings, packages, builds | `unity-biome-mcp-prefabs-assets.md` |
| Writing or changing C# files, compile errors, "is my code live", `execute_code`, renaming serialized fields | `unity-biome-mcp-csharp-compile.md` |
| Running NUnit tests, a run that did not return, reading failures | `unity-biome-mcp-tests.md` |
| Writing, linting or running `.playtest` scenarios and suites | `unity-biome-mcp-playtest-dsl.md` |
| Entering Play Mode, reading or waiting on runtime values, invoking methods at runtime | `unity-biome-mcp-runtime-playmode.md` |
| Canvas, `RectTransform`, uGUI controls | `unity-biome-mcp-ugui.md` |
| UXML, USS, `UIDocument`, `VisualElement` | `unity-biome-mcp-uitoolkit.md` |
| Console evidence, scene or reference health, frame time, memory, rendering cost | `unity-biome-mcp-diagnostics-performance.md` |
| Screenshots, baselines, visual regression | `unity-biome-mcp-screenshots-visual.md` |
| Animation clips, Animator controllers, Timeline | `unity-biome-mcp-animation.md` |
| Materials, shaders, Shader Graph, particle systems | `unity-biome-mcp-materials-vfx.md` |
| Rigidbody and collider checks, raycasts, proximity, NavMesh, region operations | `unity-biome-mcp-physics-spatial.md` |

## Tool Surface

- **Core (13)**, always listed with full schemas: `mcp_status`, `get_hierarchy`, `get_component`, `inspect`,
  `set_property`, `create_object`, `manage_component`, `batch`, `editor`, `get_console`, `get_compile_errors`,
  `compile_preflight`, `execute_code`.
- **Always visible**: `scene`, `search_scene`, `set_active`, `set_parent`, `delete_object`, `validate_references`,
  `lint_scene_refs`, `scene_change_plan`, `apply_scene_change`, `sync_unity`, `await_compile`,
  `verify_after_change`, `run_tests_wait`, `run_tests`, `run_playtest`, `run_playtest_suite`, `console_mark`,
  `get_console_since`, `get_changeset`, `screenshot`, `reconnect_unity`, `discover_tools`, `resolve_tool_schema`.
- **Everything else** sits in ten categories — `SCENE`, `COMPONENTS`, `ASSETS`, `UGUI`, `UITOOLKIT`, `MEDIA`,
  `VERIFY`, `RUNTIME`, `TESTS`, `SYSTEM` — enabled per session with `discover_tools(category="ASSETS")`.
- A category-gated tool is listed with an **empty schema** and a one-line description, even when gating is switched
  off. Its action list and parameters come only from `resolve_tool_schema`. Do not reconstruct signatures from memory.
- Enable only the category the next step needs. Enabling everything is not a recovery step.
- Prefer aggregates over repetition: `inspect` for several reads, `set_properties` / `configure_objects` /
  `setup_objects` for several writes, `batch` for mixed compatible commands.
- Natural-language tools (`do`, `ask`, `ui_intent`, `uitk_intent`, `animator_intent`, `vfx_intent`) are drafting aids:
  call them with `dry_run=True`, read the plan, then issue exact typed commands yourself.

## Addressing

| Target | Form |
|---|---|
| Scene object | `/Root/Child/Leaf` — full path, leading slash |
| Scene object with several scenes loaded | `SceneName:/Root/Child` |
| Object with a duplicate name | The `&ref` printed next to it by `get_hierarchy` / `search_scene` |
| Asset | `Assets/Folder/File.ext` |
| Sub-asset | `Assets/Atlas.png::SpriteName`, `Assets/Model.fbx::ClipName` |
| Component on an object (as a reference value) | `/Path::ComponentType` |
| Runtime value | `/Path\|Component\|member.sub` |
| UI Toolkit element in a playtest | `/GameObject\|UIDocument\|element-name` |

- **Object paths resolve fuzzily, on both sides of the connection.** A path that is not found exactly can be replaced
  — silently — by the unique object whose path ends with what you passed, or whose name matches the last segment. A
  stale or abbreviated path can therefore act on the wrong object. Take full paths from a fresh read; treat
  `[RESOLVED: …]` in a reply as "this ran on a different path than you gave".
- Among same-named siblings the first one wins without an error.
- Objects under `DontDestroyOnLoad` cannot be reached by path or search.
- An asset path is never an object path: scene tools do not open prefab assets.

## Edit Mode vs Play Mode

| | Edit Mode | Play Mode |
|---|---|---|
| Authoring tools (objects, components, properties, prefabs, assets, materials, animation, settings — reads **and** writes of the action-style tools) | Yes | Refused |
| Runtime probes (`query_state`, `wait_until`, `invoke_method`, `debug_*`, `get_frame_stats`, `profile`, `watch`) | Refused | Yes |
| `get_hierarchy`, `get_component`, `inspect`, `search_scene`, console tools, `screenshot`, `execute_code` | Yes | Yes |
| `sync_unity`, NUnit dispatch | Yes | Refused |

- `editor(action="play")` only **requests** Play Mode. Poll `editor(action="state")` for `playing: True` and
  `world_ready: True` before the first probe.
- Never author in Play Mode. A property write there may be silently turned into a runtime write that vanishes on Stop.
- During compilation or a domain reload, reads still work and most mutations are refused unsent. Wait; do not retry
  mutations in a loop.

## Mutations and Persistence

| Kind of change | Undo / `atomic` rollback | Written to disk |
|---|---|---|
| Scene objects, components, serialized properties, event wiring, uGUI creation | Yes | Only by `scene(action="save")` |
| Prefab assets, asset create/move/delete, ScriptableObjects, materials, shaders, clips, controllers, timelines, UXML/USS | **No** | Immediately |
| Project settings, packages | **No** | Immediately or deferred |
| `execute_code` effects | Only what the snippet records with `Undo.*` | Depends on the snippet |

- Use `batch(…, on_error="stop", atomic=True)` for a multi-step scene change. `on_error="stop"` alone undoes nothing.
- Keep asset, file and `execute_code` work **outside** atomic scene transactions and verify it separately.
- `undo_last` and atomic rollback use Unity's global Undo stack — they also revert edits a human made meanwhile.
- **Values are rewritten.** A whole value of `yes`, `no`, `on`, `off`, or a colour name such as `red`, is converted to
  a boolean or a colour tuple on any field type, and the typed `set_property` also turns the strings `1` and `0` into
  booleans. Read back every written value; route exact strings and numbers as described in the scene reference.
- `scene(action="open"|"new"|"close"|"discard")` **drops unsaved changes without asking**. Run
  `scene(action="list")` first and decide what happens to each dirty scene.
- A write repeated with identical arguments within five seconds is not executed (`⚠ RETRY … identical`). Read state
  instead of resending.

## Replies Are Not Raw

| You see | It means | Do |
|---|---|---|
| A field is absent from `get_component` / `inspect` | Lines with default values (`0`, `false`, empty, unit vectors…) are dropped | Ask for it by name: `fields="mass,isKinematic"` |
| `[... +N hidden]`, `[DISTILLED …]` | The reply was cut to lines about recently touched objects — this applies to console, compile-error, search, file-read and test replies too | `full=True` where the tool has it; otherwise narrow the query, read via `batch`, or read the file from disk |
| `[DIFF since #N]`, `NO_CHANGE` | `get_hierarchy` returned a diff against an earlier call | `full=True` |
| `[CACHED]` | A read served from a 12-second cache — possibly older than your last `batch` or `execute_code` | Change an argument or read via `batch` |
| `[TRUNCATED: …]`, `Data saved to: <file>` | Size cap or file offload | Narrow the query / read the file |
| `[HINT: …]`, `[REFLECT: …]`, `--- AUTO STATE ---`, `⚠ CONSOLE ERRORS:` | Extra lines added around a real reply | Strip them before parsing; act on `[REFLECT]` and console errors |

**An empty, short or trimmed reply is never proof that nothing happened.** Close the claim another way: a state read,
a file on disk, a durable record.

## Outcome Signals

Treat every one of these as "not done", wherever it appears in a reply:

`err:` · `ERR` · `FAIL` · `BLOCKED` · `TIMEOUT` · `skip` · `ATOMIC_ROLLBACK` · `[INVALID:` · `[AMBIGUOUS:` ·
`⚠ RETRY` · `Circuit OPEN` · `STOP:` · `GUARD-WEDGED` · `REIMPORT-NEEDED` · `MANUAL-REQUIRED` · `STALE-DOMAIN` ·
`UNITY-UNREACHABLE` · `START-UNKNOWN` · `PROTOCOL-ERROR` · `[DEGRADED:` · `=ERR:` · `Not in Play Mode` ·
`Play mode active`.

- Several of them arrive as an **ordinary result**, not as a tool error, and mean the command was never executed.
- The opposite also happens: a tool error after the effect has landed (a failed later line of a batch, an exception
  thrown by a handler after it wrote, an uncertain delivery). After any error on a mutating call, **read the state
  before deciding to retry**.
- Never retry an identical failing call without new evidence.

## Code and Tests

```text
# write the .cs files with your own file tools, then:
sync_unity(timeout=120)          # once; accept only "sync clean" / "sync clean (no compile needed)"
run_tests_wait(mode="EditMode", filter="^Game\\.Tests\\.InventoryTests\\.", timeout=300,
               request_id="inventory-edit-001")
```

- `sync_unity` is the only call that both makes Unity import your edit and checks that the compiled assemblies match
  the sources. `await_compile` and `get_compile_errors` report on the last compilation and can say "clean" about code
  Unity has not seen yet.
- One `run_tests_wait` per logical run, always with your own `request_id`. A passing result is JSON with
  `"outcome":"passed"`, a positive executed count and zero failed, missing or invalid tests.
- A test run is refused while any loaded scene is dirty, while the Editor is in Play Mode, or while another run is
  active — including one a human started in the Test Runner window.
- The `filter` is split on `|` before it becomes a regex: alternation only at the top level, never inside
  parentheses. A filter that matches nothing is not a pass.
- Every run leaves a durable record under `Library/UnityMCP/TestRuns/`. When a call times out or returns late, read
  the record by `request_id` instead of dispatching again.
- Do not edit sources while a run is active or finalizing.

## Evidence Rules

| Claim | Required evidence |
|---|---|
| A serialized value changed | The exact field read back by name |
| References are intact | `validate_references` on the changed root **and** a read of the fields that must be assigned |
| An event is wired | `list_events` on that event |
| No new errors | Console delta from a `console_mark` taken before the action, at levels `Error,Exception,Assert` |
| Code compiles and is live | A `sync clean` reply from `sync_unity` for this change set |
| Tests pass | The terminal snapshot of the run you dispatched, with counts |
| Runtime behaviour works | A queried value, a bounded wait, or a playtest assertion |
| Layout or appearance | A screenshot you opened and looked at |
| An asset changed | The asset re-read (or the file on disk), plus the console delta |

- Data proves behaviour; images prove appearance. Neither substitutes for the other.
- Report evidence, not a transcript of calls: claim, the exact values or lines, verdict. Use `NOT CONFIRMED` when the
  evidence is missing, trimmed or contradictory.
- Keep failure text verbatim — test names, expected and actual values, file and line.

## Shared Editor Etiquette

- Before any run, save or scene switch, list the loaded scenes. A dirty scene you did not touch is someone else's
  work: do not save it, do not discard it, do not switch away from it. Hand back and say what blocks you.
- Stage and save only what your task changed.
- Do not start a test run, a playtest or Play Mode while a human-started one is in progress.
- A red result that appears while a human is editing the same Editor may be their in-progress change, not a
  regression of yours — check the working tree and ask before "fixing" it.
- Do not interleave a source edit with a live manual walkthrough in the Editor: the recompile reloads the domain and
  destroys unsaved window state.
- Leave no residue: Play Mode stopped, time scale 1, watches cleared, temporary objects and probe values removed.
- Take file-level evidence and hand back rather than sleep-polling the Editor in the background.

## Stop Conditions

Stop and report instead of pushing on when:

- the Editor is compiling, reloading, or unreachable after one reconnect;
- a target resolves ambiguously, or a reply shows the call ran on a different object;
- the live schema differs from the planned call;
- a mutation reports a partial failure and the resulting state is not yet read;
- a blocked dispatch names a condition owned by a human (dirty scene, running tests, focus needed);
- the only remaining move is to repeat the same call with the same arguments.

## Anti-patterns

- **Trusting the return.** Reading "the call returned" as success without scanning the text for outcome signals.
- **Sleeping instead of syncing.** A fixed delay, `await_compile` or a console poll after writing C# files.
- **Abbreviated paths.** `/Button` instead of the full path from a fresh read.
- **Reading absence as fact.** Concluding a field is unset, a console is clean or a file is short from a reply that
  drops defaults or hides lines.
- **Screenshot acceptance.** Proving values, references, wiring or gameplay with an image.
- **Atomic over assets.** Expecting `atomic=True` or `undo_last` to restore prefab, asset or file changes.
- **Re-dispatching tests** with a new `request_id` after a timeout or a lost acknowledgement.
- **Saving to get unblocked.** Saving or discarding a dirty shared scene so a test run can start.
- **Blind retry.** Repeating a failed mutation without reading whether it already landed.
- **Authoring through `execute_code`** what belongs in a source file, or mutating without `Undo` inside it.
- **Signatures from memory.** Calling a gated tool with parameter names not confirmed by `resolve_tool_schema`.
- **Intent tools as executors.** Letting `do` or an `*_intent` tool apply a plan nobody read.
- **Recovery by brute force.** Repeated reconnects, enabling all categories, or `doctor(fix=True)` without a diagnosis.

## Source Map

| Source | Used for |
|---|---|
| https://github.com/german-krasnikov/unity-biome-mcp/blob/master/docs/tools-schema/index.md | The 160-tool inventory, parameters and docstrings; cross-checked against the live tool list |
| https://github.com/german-krasnikov/unity-biome-mcp/tree/master/unity-plugin/ClientSkills (12 skills, 4 agents; identical to the installed package) | Operating loop, routing tables, evidence policy, stop conditions, per-domain workflows |
| https://github.com/german-krasnikov/unity-biome-mcp/tree/master/docs — `tools/*.md`, `features/*.md`, `settings.md`, `testing-reliability.md`, `getting-started/index.md` | Per-domain behaviour, recovery tables, playtest guide, code execution, prefab editing, sessions and skills |
| Installed server source `unity_mcp` 2.0.0 (`tools/tool_specs.py`, `tools/gating.py`, `server*.py`, `middleware*.py`, `distiller.py`, `compressor.py`, `prefetch_cache.py`, `input_normalizer.py`, `bridge*.py`, `tools/sync.py`, `tools/code_intel.py`, `tools/diagnose.py`, `tools/testing.py`, `tools/verify.py`, `tools/runtime.py`, `tools/transaction.py`, `tools/batch.py`, `tools/autobatch.py`, `tools/checkpoint_tool.py`, `tools/console.py`, `tools/screenshot.py`, `visual_diff*.py`) | Tool tiers and categories, direct-only and runtime-only sets, reply rewriting and caches, refusals delivered as text, error vocabulary, reload behaviour, sync and compile verdicts, test-run protocol, transaction rules |
| Installed plugin source `com.unity-biome-mcp.editor` 2.0.0 (`CommandRouter*.cs`, `CommandRegistry.cs`, `BatchHelper.cs`, `ComponentSerializer*.cs`, `ObjectManager*.cs`, `ValueParser.cs`, `InputNormalizer.cs`, `SceneHelper.cs`, `PrefabHelper.cs`, `AssetDatabaseHelper.cs`, `ScriptableObjectHelper.cs`, `CodeExecutor.cs`, `SyncHelper.cs`, `TestRuns/*.cs`, `PlaytestRunner*.cs`, `Runtime/Playtest/Core/PlaytestParser*.cs`, `PlaytestLinter.cs`, `RuntimeHelper.cs`, `ConsoleCapture.cs`, `UIHelper*.cs`, `UIFileHelper*.cs`, `UILinter.cs`, `AnimationHelper.cs`, `AnimatorControllerHelper.cs`, `TimelineHelper.cs`, `ParticleHelper*.cs`, `MaterialHelper.cs`, `ShaderHelper.cs`, `SpatialHelper.cs`, `NavMeshHelper.cs`, `ColliderChecker.cs`, `ScreenshotCapture.cs`) | Path resolution, type resolution, property names and value literals, batch grammar, scene and prefab semantics, Play Mode gate, playtest grammar and step semantics, console capture, durable test-run store, UI and media action lists |
| `CHANGELOG.md` of the package (v2.0.0) | Known issues: sync settle time after package resolve, UTF-8 BOM on text writes |
| Context7 `/german-krasnikov/unity-biome-mcp` | Cross-check of server environment switches and recovery guidance |
| On-disk test-run store of a live project (`Library/UnityMCP/TestRuns/`) | Observed record layout, file encoding, zero-match and split-filter outcomes |
