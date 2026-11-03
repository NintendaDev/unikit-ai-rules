# ChiR24 Unreal MCP — Batch automation, scripts and Python

| Need | Prefer |
|---|---|
| Many targets with one supported operation | The domain's batch arguments |
| Blueprint game logic | `blueprint.write_graph_from_code` / `edit_graph` |
| Dependent editor calls with loops/conditions | `system_control.run_script` |
| Reusable verified editor workflow | `system_control.save_recipe`, `list_recipes`, `run_recipe` |
| Verified capability gap needing editor API access | `system_control.execute_python` |
| Expose a durable new bridge capability | [plugin-extension](chir24-unreal-mcp-plugin-extension.md) |

## Use the smallest execution mechanism

Native domain operations provide typed contracts and structured results. Prefer them when sufficient. A one-call batch is usually preferable to a script invoking the same operation hundreds of times.

For scripting, inspect the installed contract and every called capability first:

```json
{"operation":"describe","capability":"system_control.run_script"}
```

The script is an S-expression language of capability calls, bindings, loops, conditions and assertions. It is not arbitrary code and does not author game behavior by itself. Original read-only script body illustrating result reuse:

```lisp
(let lamps (control_actor.list :filter "AcceptanceLamp"))
(return lamps)
```

Even a read-only body runs under `run_script`'s elevated consent policy. Supply the exact describe grant. Called capabilities requiring consent must be declared in `destructive`; this includes consent-gated writes, not only deletes. Preserve the same caller's scope/path limits.

The whole script is checked before execution, then each step is validated again. Use explicit step/deadline budgets. Inspect `steps`, returned data, failure/rollback details and `cleanupCall`. Undo cannot reverse saved files, some created assets, builds or renders, and compile/map-load operations can clear history. “All or nothing” is bounded by those limits.

Nested script/recipe and history-control calls are restricted; deferred steps cannot be treated as synchronous. Do not work around a refusal by wrapping the same operation in Python.

## Save a recipe only after proving the workflow

Inspect existing recipes before writing another. Parameterize the values that vary and give a task-oriented summary. `save_recipe` checks/stores a script; it does not run or prove it. `run_recipe` has its own elevated grant and uses the same execution limits. Inspect any `verified` metadata as historical evidence tied to an engine/version.

Recipes live under `Saved/EngineWire/Recipes/`; they are not automatically shared source-controlled assets. Do not overwrite an existing recipe name without inspecting it and confirming replacement is within scope.

## Editor Python fallback

```json
{"operation":"describe","capability":"system_control.execute_python"}
```

The pinned current record accepts **either** inline `code` **or** `file`, not both. Inline code is limited to 1 MiB; file execution is restricted to a real project-contained `.py` file. It requires PythonScriptPlugin, Write scope and explicit consent. Context7's older “Python removed” statement is not applicable to this record.

Inspect the required editor API against the installed engine version. Begin with a bounded read; an original diagnostic body is:

```python
import unreal
subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
print([actor.get_actor_label() for actor in subsystem.get_selected_level_actors()])
```

Verify that API in the target engine before execution. For writes, explicitly resolve targets, save as required and read back independently. Inspect captured `output`, `error`/traceback and actual effects; a print statement is not persistence evidence.

Never route `py`/`python`, shell access or chained commands through `console_command`. Use the dedicated Python capability for authorized code. Do not widen token scopes, paths or command policy to make a script pass.

Sources: [gateway script guide](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/gateway-client-guide.md), [script record](https://github.com/ChiR24/Unreal_mcp/blob/dev/src/tools/catalog/capabilities/records/system-control/scripts.ts), [recipe records](https://github.com/ChiR24/Unreal_mcp/blob/dev/src/tools/catalog/capabilities/records/system-control/recipes.ts), [Python record](https://github.com/ChiR24/Unreal_mcp/blob/dev/src/tools/catalog/capabilities/records/system-control/system-ops.ts), [Epic EditorActorSubsystem Python API](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/EditorActorSubsystem?application_version=5.3). For receipt/nonce/retry rules use [execution-safety](chir24-unreal-mcp-execution-safety.md).
