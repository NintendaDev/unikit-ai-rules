# Coplay Unity MCP — Scripts, compilation and editor code

| Task | Preferred tool | CLI |
|---|---|---|
| Create/delete C# asset | `create_script`, `delete_script` | `script create/delete` or raw |
| Read/search/check script | `manage_script`, `find_in_file`, `get_sha`, `validate_script`, `manage_script_capabilities` | `script read/validate`, `code search`, raw for uncovered operations |
| Change a method or stable anchor | `script_apply_edits` | Unity `raw manage_script` with `action="edit"`; not the same Python edit pipeline |
| Exact coordinate patch | `apply_text_edits` with SHA | `script edit` or `raw manage_script` with `action="apply_text_edits"` |
| Import external file edits | `refresh_unity` | `editor refresh --compile` or raw |
| Inspect Unity/project API | `unity_reflect`, then `unity_docs` | `reflect search/type/member`, `docs get`; no `raw unity_docs` |
| Run one-off editor C# | `execute_code` (`scripting_ext`) | `code execute` or raw |
| Create/patch ScriptableObject | `manage_scriptable_object` (`scripting_ext`) | Raw |

## Edit and compile

1. Read current content and identify the owning script/path. `create_script` takes a full file `path`; `script_apply_edits` splits `name` and folder `path`. Do not transfer one tool's path convention to another.
2. Prefer whole-method or anchor edits to brittle coordinates. For positional edits, inspect exact lines/columns and obtain `get_sha`; lines/columns are 1-based, tabs count as one column.
3. On `stale_file`, reread both content and SHA and rebuild the patch. Do not simply replace its precondition hash.
4. `create_script` and `script_apply_edits` already import and request compilation according to the official skill. Wait for compilation/reload/readiness; do not force a redundant refresh immediately afterwards.
5. After filesystem edits, or when the selected operation has not imported changes, request the necessary refresh/compile explicitly. Do not assume every editing tool has identical import behavior.
6. Read console errors after compilation, then inspect/attach the compiled type. Structural validation is useful but does not prove project compilation or runtime behavior.

```python
script_apply_edits(name="ProbeSettings", path="Assets/Scripts/",
    edits=[{"op": "replace_method", "className": "ProbeSettings", "methodName": "GetMass",
            "replacement": "public float GetMass() { return 2.5f; }"}],
    options={"validate": "standard"})
# Poll the live editor-state resource until compilation/reload is complete.
read_console(action="get", types=["error"], count=20, include_stacktrace=True)
```

```powershell
unity-mcp --format json raw manage_script '{"action":"edit","name":"ProbeSettings","path":"Assets/Scripts/","edits":[{"op":"replace_method","className":"ProbeSettings","methodName":"GetMass","replacement":"public float GetMass() { return 2.5f; }"}],"options":{"validate":"standard"}}'
# For externally edited scripts, use this instead of assuming import happened:
unity-mcp --format json raw refresh_unity '{"mode":"if_dirty","scope":"scripts","compile":"request","wait_for_ready":true}'
unity-mcp --format json raw read_console '{"action":"get","types":["error"],"count":20,"includeStacktrace":true}'
```

Structured-edit fields include `op`, `className`, `methodName`, `replacement`; insert-before/after and anchor examples disagree between source sections. Inspect installed capabilities/schema for `beforeMethodName`/`afterMethodName` and anchor `text` versus `replacement` rather than borrowing conflicting templates. Avoid whole-file regex deletion.

CLI raw does not run Python `script_apply_edits` normalization, safety checks or disconnect verification. For SHA-based raw operations use `manage_script(action="get_sha")` and `action="apply_text_edits"` with the real name/folder, coordinates and precondition. The CLI `script edit` wrapper reads a SHA before its coordinate patch, but the patch still needs fresh content inspection. On Unity 6, the C# refresh handler deliberately skips a full readiness wait when compilation is requested: CLI `wait_for_ready=true` does not reproduce the Python wrapper's post-reload readiness polling. Recheck compilation/errors after reconnecting.

## One-off editor execution

- Discover/activate `scripting_ext`. Supply a **method body**, not a complete source file or `using` declarations. Return compact structured data rather than huge logs.
- Prefer dedicated tools and existing project extensions. Keep `safety_checks=true`; it blocks some patterns but is not a full sandbox or an authorization system.
- `compiler="auto"` chooses Roslyn when installed, otherwise CodeDom. The documented CodeDom fallback is limited to C# 6; Roslyn features do not change the project's own C# compilation settings.
- For mutations, use appropriate Undo/serialized APIs, mark/save only affected objects/assets and verify the fields. Do not use broad save calls to flush unrelated dirty assets.
- Inspect history before `replay`; it repeats side effects. Do not create a permanent editor script merely to run a transient query when this capability suffices.

```python
execute_code(action="execute", code="return UnityEngine.Application.unityVersion;",
             compiler="auto", safety_checks=True)
```

```powershell
unity-mcp --format json raw execute_code '{"action":"execute","code":"return UnityEngine.Application.unityVersion;","compiler":"auto","safety_checks":true}'
```

## ScriptableObject patches

Use the namespace-qualified type for `create`. For `modify`, pass an asset `{path}` or `{guid}`, and serialized `propertyPath` patches. Resize arrays with `op="array_resize"` before patching elements. Use `ref`/`value` reference objects in this tool's schema, not component-tool reference syntax by assumption.

```python
manage_scriptable_object(action="modify", target={"path": "Assets/Data/Probe.asset"},
    patches=[{"propertyPath": "_mass", "value": 2.5}], dry_run=True)
# Inspect validation; repeat with dry_run=False only for the intended patch.
```

```powershell
unity-mcp --format json raw manage_scriptable_object '{"action":"modify","target":{"path":"Assets/Data/Probe.asset"},"patches":[{"propertyPath":"_mass","value":2.5}],"dryRun":true}'
```

A dry run proves patch validity only. After applying, independently reread the serialized field and asset persistence.

## API discovery

Activate `docs` when required. Start with `unity_reflect(action="search", query="TypeName", scope="project")`, then `get_type` and `get_member` with `class_name`/`member_name`. CLI example: `unity-mcp reflect member Rigidbody AddForce`. Use `unity_docs` to resolve documentation after matching the installed type/version; docs lookup does not require a Unity connection, reflection does.

Sources: [scripting extensions](https://coplaydev.github.io/unity-mcp/reference/tools/scripting_ext), [structured edits](https://coplaydev.github.io/unity-mcp/reference/tools/core/script_apply_edits), [coordinate edits](https://coplaydev.github.io/unity-mcp/reference/tools/core/apply_text_edits), [refresh](https://coplaydev.github.io/unity-mcp/reference/tools/core/refresh_unity), [reflection](https://coplaydev.github.io/unity-mcp/reference/tools/docs/unity_reflect), [official skill](https://github.com/CoplayDev/unity-mcp/blob/beta/unity-mcp-skill/SKILL.md).
