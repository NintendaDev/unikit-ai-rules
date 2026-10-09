# Unity Biome MCP — Play Mode and Runtime Probes

> See also: [unity-biome-mcp-playtest-dsl.md](unity-biome-mcp-playtest-dsl.md) (repeatable scenarios), [unity-biome-mcp-diagnostics-performance.md](unity-biome-mcp-diagnostics-performance.md) (console, profiling), [unity-biome-mcp-physics-spatial.md](unity-biome-mcp-physics-spatial.md) (`debug_physics`)

`editor` is a core tool. The probes are in `RUNTIME`: `query_state`, `wait_until`, `invoke_method`, `watch`,
`get_watches`, `runtime_snapshot`, `snapshot`, `move_to`, `debug`, `debug_animator`, `debug_physics`; `test_step` is
in `TESTS`. Written against server and plugin v2.0.0.

> Notation: inside tables a literal pipe is written `\|` because of Markdown escaping. The real character is a bare `|`.

---

## Entering and Leaving Play Mode

```text
editor(action="play")           # -> "requested": returns at once, it does not wait
editor(action="state")          # poll until  playing: True  AND  world_ready: True
# … probes …
editor(action="stop")
```

- `play` only **requests** Play Mode and answers `requested` (or `already_playing`). Entry can still be refused by
  compile errors without any error reply. Poll `editor(action="state")` for `playing: True` **and**
  `world_ready: True` (set after the first frame, i.e. after `Awake`/`Start`). `play_epoch` increments per entry.
- `pause` **toggles**.
- Unsaved scene changes do not block Play Mode.
- If a `play` or `stop` call fails with an uncertain-delivery error, do not resend it. Read the state and reconcile.
- Always stop Play Mode you started — after success and after an error. Leave Play Mode alone if someone else started
  it.
- `editor` actions: `state`, `play`, `pause`, `stop`, `select` (`path` or comma-separated `paths`), `project_path`,
  `mutation_mode`.

## What Works in Which Mode

| Call | Edit Mode | Play Mode |
|---|---|---|
| Runtime probes: `query_state`, `wait_until`, `invoke_method`, `move_to`, `test_step`, `debug_animator`, `debug_physics`, `get_frame_stats`, `profile`, `watch(action="add")` | Refused: `Not in Play Mode…` (tool error) or `err: '<cmd>' requires Play Mode…` (**plain text**) | Yes |
| Authoring tools (`set_property`, `create_object`, `manage_component`, `prefab`, `asset`, `material`, `scriptable_object`, `animation`, `animator`, `particle`, `project_settings`, …) — **including their read actions** | Yes | Refused: `Play mode active — changes will be lost. Stop play mode first.` |
| `get_hierarchy`, `get_component`, `inspect`, `search_scene`, `runtime_snapshot`, `get_memory`, console tools, `screenshot`, `scene`, `timeline` reads | Yes | Yes |
| `execute_code`, `set_parent`, `editor` | Yes | Yes |
| `run_playtest` | Only with `# @needs editmode` | Yes |
| `sync_unity`, `run_tests*` | Yes | Refused |

When the server already knows the Editor is playing, a typed `set_property` is **silently rerouted** to a runtime
member write (by C# member name, not serialized name; lost on Stop). Do not rely on it — change runtime state with
`invoke_method` or a playtest `SET`.

## Member Path Syntax

`<scene path>|<Component type name>|<member>` — shared by `query_state`, `wait_until`, `watch` and the playtest DSL.

- `member` is a dotted chain over public **and private** instance fields and properties: `stats.health.current`.
- A segment may be a method call: `HasItem(sword)`, `DistanceTo(5,0,3)`. No generic methods.
- Lists print the first 10 items; floats print with 6 significant digits; everything else is `ToString()`.
- Two-part form for GameObject state: `/Hero|activeSelf`, `|activeInHierarchy`, `|tag`, `|layer`, `|name`.
- Virtual members: `Animator|currentState` (the playing **clip** name), `Rigidbody|speed`, `Rigidbody2D|speed`.
- The component is matched by its **exact type name**. A base class or an interface name does not match.
- Not reachable: static members, objects that exist only inside a DI container, objects under `DontDestroyOnLoad`
  (use `execute_code` for those).

## Probes

| Tool | Call | Behaviour |
|---|---|---|
| `query_state` | `query_state(queries="/Hero\|Health\|hp,/Hero\|Rigidbody\|speed")` | Instant, read-only. One line per query: `Comp.member=value`. **A failed query is text `…=ERR:msg`, never a tool error** — scan the reply |
| `wait_until` | `wait_until(path, component, field, value, timeout=5, negate=False, abort_on_fail=False)` | Polls about every 0.1 s. **Equality only** (case-insensitive string compare). The object and component must exist already — it cannot wait for a spawn. Keep `timeout` at 25 s or less. A timeout is a tool error. `abort_on_fail=True` also stops Play Mode |
| `invoke_method` | `invoke_method(path, component, method, args="10,0,5")` | Reflection call, public or non-public. Arguments are comma-separated (a `Vector3` consumes three); a component reference is `@/Path\|Type`; no commas inside strings. Returns `ToString()` of the result (`void` for none). Coroutines and async methods are **not awaited**. Overloads are chosen by argument count; give a unique method name when ambiguous |
| `runtime_snapshot` | `runtime_snapshot(type="EnemyController", name="Boss", compress=True)` | Works in both modes. Dumps **serialized** fields of up to 50 objects having that component — not private runtime state, not properties. For live values use `query_state` |
| `watch` | `watch(action="add", path, component, field, condition="< 20", trigger_action="log"\|"pause", interval_ms=500)` | Up to 20 watches. Fields and properties only. Fires once until `reset`. `remove` and `reset` need `watch_id`; `clear` removes all |
| `get_watches` | `get_watches()` | **Drains** the watch log — a second call is empty |
| `snapshot` | `snapshot(path, label="before")` … `snapshot(path, label="after", compare="before")` | Server-memory capture and diff of an `inspect` result; lost on server restart |
| `move_to` | `move_to(path, position="x,y,z", timeout=15)` | Needs a movement component with a public `(Vector3, Action<bool>)` method, or one configured in `PlaytestConfig`. `blocked` and `timeout … still moving` come back as **normal results** — read the text |
| `test_step` | `test_step(path, position, checks_before, checks_after, wait_after=0.5)` | `move_to` plus before/after `query_state` and a console check. Same movement caveats |
| `debug_animator` | `debug_animator(path)` | Layers, parameters, transition progress. States appear as name **hashes**, not names |
| `debug_physics` | `debug_physics(path, radius=5)` | 3D only: Rigidbody state, colliders, nearby bodies |
| `debug` | `debug(symptom="enemy does not move", path="/Enemy")` | Works in both modes. Runs a keyword-selected batch of `inspect` and `get_console`. No LLM involved |

## Patterns

Wait on state, never on time:

```text
editor(action="play")
# poll editor(action="state") until world_ready: True
mark = console_mark(label="open-door")
invoke_method(path="/Level/Door", component="Door", method="Open")
wait_until(path="/Level/Door", component="Door", field="IsOpen", value="true", timeout=5)
query_state(queries="/Level/Door|Door|IsOpen,/Level/Door|Transform|localEulerAngles.y")
get_console_since(mark_id=mark, level="Error,Exception,Assert")
editor(action="stop")
```

- For numeric comparisons (`>`, `<`), compound conditions or anything repeatable, write a playtest instead of a chain
  of direct calls.
- Read related values in **one** `query_state` call so they describe one moment.
- To observe something that appears later (a spawned object), wait on a value of an object that already exists — a
  counter, a list length, a flag — and query the new object afterwards.
- When the runtime entry point is not a component method, expose a small public method on an existing component, or
  use `execute_code` for a one-off read.

## Domain and Scene Reload

Projects can disable domain reload and scene reload in Enter Play Mode Options. Then entering Play Mode does not reset
static state, and a stop/play cycle is not a clean slate. Check `ProjectSettings/EditorSettings.asset`
(`m_EnterPlayModeOptions`) or ask, and make probes and scenarios reset the state they depend on.

## Rules

- Confirm the mode before interpreting any value: Edit Mode values are authored data, Play Mode values are live.
- Clear every watch you add and stop every profiling session before finishing.
- Do not treat `set_property` as a way to change runtime state.
- One changed frame or one screenshot does not prove behaviour; a queried value does.
- Restore `Time.timeScale` and stop Play Mode in every exit path.
