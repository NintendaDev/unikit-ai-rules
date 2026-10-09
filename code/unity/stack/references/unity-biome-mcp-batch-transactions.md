# Unity Biome MCP — Batch, Transactions and Rollback

> See also: [unity-biome-mcp-scene-objects.md](unity-biome-mcp-scene-objects.md) (property names and value literals), [unity-biome-mcp-connection-session.md](unity-biome-mcp-connection-session.md) (reply rewriting, refusals), [unity-biome-mcp-prefabs-assets.md](unity-biome-mcp-prefabs-assets.md) (asset effects that never roll back)

`batch` is a core tool; `scene_change_plan`, `apply_scene_change` are always visible; `checkpoint`, `checkpoint_create`,
`checkpoint_restore`, `undo_last` are in `SYSTEM`. Written against server and plugin v2.0.0.

---

## Selection Order

1. One operation → the typed tool.
2. The same read on several objects → `inspect(paths=…, components=…, fields=…)`.
3. Create or configure several objects → `setup_objects` / `configure_objects` / `set_properties` (standalone typed
   calls; they are macros that expand into a non-atomic batch).
4. Several compatible low-level commands → `batch`.
5. A scene mutation that must be all-or-nothing, verified and saved → `scene_change_plan` + `apply_scene_change`.
6. Tests, playtests, screenshots, waits, intent tools and every Python-side orchestrator → separate typed calls.

## `batch` Line Grammar

```text
batch(commands="""
# one command per line; blank lines and lines starting with # are skipped
create_object name="Boss Arena" primitive=Cube
set_property path="/Boss Arena" component=Transform prop=m_LocalPosition value=(0,1.5,6)
get_component path="/Boss Arena" type=Transform
""", on_error="stop", atomic=True)
```

| Element | Rule |
|---|---|
| Command token | Text up to the first **space**. A tab makes the command unknown |
| Arguments | `key=value` pairs using the **wire** parameter names |
| Quoted value | `"…"` with escapes `\"`, `\\`, `\n`, `\r`, `\t` |
| Parenthesised value | `(1, 0.5, 2)` is kept whole, spaces allowed, must close on the same line |
| Unquoted value | Runs until the next ` identifier=` boundary — so a free-text value containing ` word=` breaks; quote it |
| Multi-line value | Not possible with a real newline; use `\n` inside quotes |
| Booleans | **Lowercase** `true` / `false`. `active=True` is read as false |
| Aliases | `$name` is expanded from project aliases before parsing |
| Unknown key | Rejected in a batch line (`?key->closest Unknown param.`). The same typo on a typed call is silently ignored by Unity |

A line cannot use the result of an earlier line: there are no variables and no `$1`. Later lines address a new object
by the path you can predict (`/Parent/Name`).

### Wire names that differ from the typed tool

| Typed tool | In a batch line |
|---|---|
| `navmesh_query` | not batchable (wire command `navmesh`, direct-only) |
| `get_component(component=…)` | `type=` only |
| `get_component` / `get_hierarchy` / `inspect` `full=` | not a wire key — batch output is never distilled anyway |
| `set_property(ref_component_type="T")` | write `value=/Path::T` |
| `inspect_uitk(show_unity_private=…)` | `include_internal=` |
| `asset(class_name=…)` | `class=` |
| `prefab` child addressing | `child_path=` (or `path=`) relative to the prefab root; `parent=` exists on the wire for `instantiate` |

### What can and cannot be batched

Batchable: scene and object reads and writes (`get_hierarchy`, `get_component`, `inspect`, `search_scene`,
`create_object`, `delete_object`, `set_property`, `set_property_delta`, `set_active`, `set_parent`, `rename_object`,
`set_sibling_index`, `transfer_object`, `manage_component`, `wire_event`, `unwire_event`, `auto_wire`), `scene`,
`prefab`, `asset`, `material`, `shader`, `scriptable_object`, `project_settings`, `animation`, `animator`, `timeline`,
`particle`, `create_ui`, `set_rect`, `lint_ugui`, `lint_uitk`, `inspect_uitk`, `uitk_element`, `attach_uitk`,
`validate_references`, `resolve_scene_refs`, `execute_code`, `compile_preflight`, `get_console`,
`get_compile_errors`, `undo_last`, `checkpoint`, `menu`, `bake`, `region_clear`, and a nested `batch`.

Not batchable: `run_tests`, `run_tests_wait`, `run_playtest`, `run_playtest_suite`, `wait_until`, `move_to`,
`test_step`, `watch`, `screenshot*`, `build`, `package`, `sync_unity`, `await_compile`, `uitk_file`, `navmesh_query`,
`configure_objects`, `set_properties`, `setup_objects`, `scene_change_plan`, `apply_scene_change`, every intent tool
(`do`, `ask`, `ui_intent`, `uitk_intent`, `animator_intent`, `vfx_intent`), `console_mark`, `get_console_since`,
`get_changeset`, `snapshot`, `debug`, `mcp_status`, `discover_tools`, `resolve_tool_schema`, `verify_after_change`,
`checkpoint_create`, `checkpoint_restore`, skills, templates and sessions.

`discover_tools(enable=False, structured=True)` prints `surfaces=direct,batch` for the batchable ones — it is the
source of truth after a server update.

## Reading the Result

```text
[0] ok: Created /Enemy
[1] err: Component type 'MissingComponent' not found
[2] skip
ok:1 err:1 skip:1 timeout:0
```

- Indices are zero-based over executable lines (comments and blanks excluded).
- Outcome tokens: `ok:`, `err:`, `BLOCKED:` (Play Mode, compile, read-only, disabled tool, runtime-only), `skip`,
  `TIMEOUT:`, and `ATOMIC_ROLLBACK: reverted ops 0..k`.
- **If any line failed, the whole call comes back as a tool error — even though the earlier lines were applied.** Read
  the per-line report inside the error before deciding what state the scene is in.
- A direct-only command in the text: with `on_error="continue"` it becomes one `err:` line and the rest still runs;
  with `on_error="stop"` the call is rejected before anything is sent.
- `[BATCH_INCOMPLETE: N unaccounted]` means the summary does not cover every line; treat the unaccounted lines as
  unknown.
- An exception inside `execute_code` in a batch surfaces only as
  `Exception has been thrown by the target of an invocation.` Run the snippet as a direct call to see the real message.

## Failure Policy

| Setting | Behaviour |
|---|---|
| `on_error="continue"` (default) | Runs every line; mixed result |
| `on_error="stop"` | Remaining lines print `skip`; **nothing is undone** |
| `atomic=True` | Stops at the first failed, blocked or timed-out line and reverts the batch's Undo group |
| `validate_aliases=True` | Checks `$alias` expansion only and **executes nothing**. It is not a schema or existence dry run. Run it first, then call again without the flag |
| `timeout` (75) | Whole-call limit; the inner budget is capped at 60 s and is checked only **between** lines — one long command is not interrupted |

## What `atomic=True` Really Reverts

Reverted: mutations recorded in Unity Undo — object creation and deletion, parenting, renaming, component add/remove,
serialized property changes, `UnityEvent` wiring, uGUI creation and layout, `attach_uitk`.

**Not** reverted:

- asset files: `prefab save/edit/create_variant/apply`, `asset create/move/delete/write_text`, `scriptable_object`,
  `material create`, `shader`, animation clips, controllers, timelines, `uitk_file`;
- `scene` actions, `project_settings`, packages, builds;
- anything an `execute_code` snippet does without calling `Undo.*`, and all of its file or process effects.

Because the rollback uses Unity's global Undo stack, it also reverts an edit a human made in the same Editor while the
batch was running.

## Guarded Scene Change

```text
scene_change_plan(goal="Add spawner under checkpoint", targets="/Level/Checkpoint")
# -> plan_id=abc123 …
apply_scene_change(plan_id="abc123", commands="""
create_object name=Spawner parent=/Level/Checkpoint
manage_component path=/Level/Checkpoint/Spawner type=ParticleSystem action=add
""", verify=True, save=True)
```

`scene_change_plan` refuses in Play Mode, requires a clean compile, resolves `targets`, opens an Undo checkpoint and
returns a `plan_id` valid for **600 s** (plans live in server memory and are lost on a server restart). The advertised
console check is not performed at plan time.

`apply_scene_change` accepts only these commands: `attach_uitk`, `auto_wire`, `autofit_collider`, `create_object`,
`create_ui`, `delete_object`, `manage_component`, `rename_object`, `set_active`, `set_parent`, `set_property`,
`set_property_delta`, `set_rect`, `set_sibling_index`, `unwire_event`, `wire_event`. Anything else — assets, files,
`execute_code`, nested batches — is rejected before dispatch. It runs `atomic=True`, `on_error="stop"`.

Rules:

- **Verification only works when the plan was created with exactly one literal scene path in `targets`.** With empty
  targets, several targets, a `t:Type` or a `$alias`, the reference check cannot run, the result is `refs=unchecked`,
  `verified=false`, and the scene is **not saved**.
- `save=True` saves the **active scene as a whole**. If it was already dirty before the plan (`foreign_dirty:true`),
  the save writes someone else's unsaved edits too. Check `scene(action="list")` first; use `save=False` on a scene you
  did not start clean.
- Read the returned `state=`, `mutations=`, `refs=`, `console=`, `verified=`, `saved=` fields. A completed call is not
  a saved scene.

## Undo and Checkpoints

| Tool | What it does | Limits |
|---|---|---|
| `checkpoint(label)` | Opens a named Unity Undo group | There is no tool that restores a plain checkpoint; it only marks a point for a human Ctrl+Z |
| `undo_last(turns=N)` | Reverts the last N **MCP mutating calls** (one call or one root batch each — not conversation turns) | Reverts everything above that group on the global Undo stack, including human edits made since. Asset files are not reverted (`warn: K asset file(s) not reverted`). The group list is lost on domain reload. Use one call with `turns=N`, not N calls |
| `checkpoint_create(paths="a,b")` | Undo group plus a snapshot of the listed **text files** (paths relative to the server's working directory) | **Always pass `paths`**: the documented empty default fails in v2.0.0. Binary and missing files are skipped silently |
| `checkpoint_restore(checkpoint_id)` | Undo when the domain is unchanged, otherwise rewrites the files | In the Undo case it reports `method=undo` and **does not touch files on disk**. In the file case there is no conflict detection — later edits are overwritten |
| `get_changeset()` | Lists mutations the server observed this session | Review aid only; not a diff and not a transaction |

None of these replaces version control. Before a broad or destructive change to assets, commit or stash.

## Learned Skills and Templates

`save_skill` stores a stable, parameterised batch sequence (`${name}` placeholders); `use_skill(name,
params="k=v,k2=v2")` runs it with the normal **non-atomic** default. Rules:

- Save only a sequence that has appeared at least twice and whose targets and safety gates are settled.
- Put the verification read inside the stored sequence.
- Text containing `;`, `var `, `new `, `//` or `using ` is stored as C# and executed through `execute_code`. Keep batch
  skills free of those tokens.
- Substitution is textual and unescaped — never feed untrusted text into a skill or a template.
- `use_skill` with an unknown name returns the list of skills instead of an error.

## Pitfalls

- Inferring success from the call returning. Scan every line for `err:`, `BLOCKED:`, `TIMEOUT:`, `ATOMIC_ROLLBACK`.
- Assuming `on_error="stop"` undoes earlier lines.
- Putting asset or file work inside an atomic batch and expecting it to roll back.
- Retrying an identical write within five seconds: the server answers `⚠ RETRY … identical` and does not execute it.
- Raising `timeout` to fit unrelated work instead of splitting the batch.
