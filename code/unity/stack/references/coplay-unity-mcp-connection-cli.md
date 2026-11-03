# Coplay Unity MCP — Connection and CLI

| Need | MCP | CLI |
|---|---|---|
| Identify Editor sessions | Read `mcpforunity://instances` | `unity-mcp instance list` |
| Select one | `set_active_instance(instance="ProjectName@hash")` | Global `--instance "ProjectName@hash"` or `UNITY_MCP_INSTANCE` |
| Check Editor readiness | Read `mcpforunity://editor/state` | `status` checks connectivity; it is not the complete resource snapshot |
| Identify project | Read `mcpforunity://project/info` | Verify instance listing and project identity returned by available diagnostics |
| Reveal a hidden tool | `manage_tools(action="list_groups")`, then `activate` | No raw equivalent for MCP session visibility; inspect Editor-side availability |
| Read custom tool catalog | Read `mcpforunity://custom-tools` | `unity-mcp tool list` |
| Execute a known menu action | Discover `mcpforunity://menu-items`, then `execute_menu_item` | `editor menu 'Exact/Menu/Path'` |

## Connect to the right process

1. Inspect instances and project identity before mutation. Do not use a short name when multiple Editors or worktrees match.
2. Select the exact returned identifier; examples such as `ProjectName@hash` are illustrative, not a real session to reuse.
3. Inspect readiness, Play Mode, active scene and prefab stage. The skill includes simplified state examples; actual responses may nest readiness under `data.advice` and compilation under `data.compilation`. Follow the returned schema and check staleness, blocking reasons, and retry advice.
4. Reconfirm identity after reconnecting. Object IDs and session visibility may need discovery again after a reload.

```python
set_active_instance(instance="ProjectName@hash")  # Substitute a discovered ID.
manage_tools(action="list_groups")
manage_tools(action="activate", group="profiling")
```

```powershell
unity-mcp --format json status
unity-mcp --format json instance list
# Set only after matching this identifier to the intended project.
$env:UNITY_MCP_INSTANCE = 'ProjectName@hash'
unity-mcp --format json scene active
```

## Transport and tool visibility

- MCP can expose tools and resources through its configured transport. The documented CLI supports **local HTTP**. It needs both the Python server and connected Unity plugin; switching to CLI does not fix an offline Editor. The reviewed server exposes CLI routes only outside remote-hosted mode.
- Over HTTP, sessions start with `core`. The official skill says stdio initially enables all groups and then synchronizes Editor tool toggles. Inspect actual visibility instead of treating the guide's core-only shorthand as a rule for every transport.
- Groups: `core`, `animation`, `ui`, `vfx`, `scripting_ext`, `testing`, `probuilder`, `profiling`, `docs`, `asset_gen`. Activate only what the task requires. Visibility does not install optional Unity packages.
- `manage_tools(action="sync")` pulls Editor toggle states into the session; `reset` restores defaults; `deactivate` hides a named group. These are server-only MCP operations, not Unity commands callable through CLI raw. Do not reset or synchronize unrelated state just to access one tool.
- If the client caches tools, refresh its tool listing after activation. Check the custom catalog before concluding that a project extension is missing.

## CLI grammar and payloads

- Global options precede the group: `--host`, `--port`, `--timeout`, `--format`, `--instance`, `--verbose`. Documented defaults are loopback host, port 8080, timeout 30 seconds; discover the configured endpoint instead of changing it.
- Environment equivalents are `UNITY_MCP_HOST`, `UNITY_MCP_HTTP_PORT`, `UNITY_MCP_TIMEOUT`, `UNITY_MCP_FORMAT`, `UNITY_MCP_INSTANCE`. Keep them task-scoped when projects differ.
- `unity-mcp --format json --timeout 60 scene active` is correctly ordered. `unity-mcp scene active --format json` is not.
- `unity-mcp raw COMMAND '{"key":"value"}'` posts directly to the server's `/api/command`, which dispatches to a Unity handler. It does not execute the Python function with the same name. Use the wire contract below and a real Unity command. No generic CLI resource reader is documented; use MCP resources or a narrower supported query, stating any missing coverage. Do not invent `raw resources/read`.
- Snippets use single-quoted JSON. Native argument passing varies across Windows PowerShell, PowerShell 7, shells and launchers: verify the actual payload if parsing fails, preferably with `--verbose` on non-sensitive data. For complex operations use `batch run` with a UTF-8 JSON file or launch the executable with an argument array; do not build a shell command by interpolating untrusted code/JSON.
- CLI exits and transport success are insufficient; inspect the returned Unity response for operation-level errors. Convenience commands can print headings/summaries around JSON; capture the structured result instead of assuming their entire stdout is one JSON document. Raw output is the simpler choice for machine consumption.

## MCP versus CLI wire contract

These mappings are from the reviewed Python wrappers and Unity handlers. They are not a global snake_case-to-camelCase rule: some command families deliberately retain snake_case.

| Direct MCP input | CLI raw Unity command/fields |
|---|---|
| `manage_components(component_type, search_method, component_index)` | Same command; `componentType`, `searchMethod`, `componentIndex` |
| `manage_prefabs(prefab_path, component_properties, create_child, ...)` | `prefabPath`, `componentProperties`, `createChild`, `deleteChild`, `componentsToAdd`, etc. |
| `find_gameobjects(search_term, search_method, page_size)` | `searchTerm`, `searchMethod`, `pageSize` |
| `manage_asset(search_pattern, generate_preview, page_size, page_number)` | `searchPattern`, `generatePreview`, `pageSize`, `pageNumber` |
| `manage_material(material_path, search_method)` | `materialPath`, `searchMethod` |
| `manage_animation(clip_path, controller_path)` | `clipPath`, `controllerPath` |
| `manage_texture(fill_color, import_settings)` | `fillColor`, `importSettings`; sprite conversion has additional wrapper normalization |
| `manage_scriptable_object(type_name, folder_path, asset_name, dry_run)` | `typeName`, `folderPath`, `assetName`, `dryRun` |
| `read_console(include_stacktrace, page_size, filter_text)` | `includeStacktrace`, `pageSize`, `filterText` |
| `script_apply_edits` / `apply_text_edits` / `get_sha` | Use Unity `manage_script` with `action=edit` / `apply_text_edits` / `get_sha`, matching name/folder and wire payload; Python editing safeguards do not automatically run |
| `generate_image/model/audio(..., output_folder, job_id)` | `outputFolder`, `jobId`; other renamed fields follow the specific wrapper |
| `import_model_file(source_path, target_size, animation_type)` | `sourcePath`, `targetSize`, `animationType` |
| `blender_bridge(object_names, place_in_scene, ...)` | `objectNames`, `placeInScene`, `autoAnimate`, `savePrefab`, `ensureBloom`, etc. |
| `manage_profiler`, `manage_sprite`, most `manage_physics` fields | Retain documented snake_case; inspect exceptions such as physics `componentIndex` |
| `manage_tools`, `set_active_instance`, `debug_request_context`, `manage_script_capabilities` | Server-only: no equivalent raw Unity command; use MCP or CLI routing/discovery facilities |
| `unity_docs` | `docs get` runs a local Python docs helper; it is not `raw unity_docs` |

For UI Toolkit, test polling, batching and compilation waiting, read the topic's additional transport notes. No raw route restores Python preflight, retry protection, image-content wrapping or resource enrichment by implication. Use an exact discovered instance hash when possible: the reviewed CLI route can fall back to the first connected Editor if none is specified.

## Recovery

| Symptom | Next step |
|---|---|
| No HTTP connection | Check server process/endpoint and plugin connection; inspect `status` |
| Busy or reload pending | Read Editor state, honor retry advice, then retry boundedly |
| Tool not listed | Inspect groups, Editor toggles, cached listing and custom tools |
| Wrong object or scene changed | Recheck project, instance, active scene/stage, then re-find target |
| Timeout after mutation | Inspect state or existing job before repeating the request |
| Routing identity unclear | MCP: inspect `debug_request_context`; CLI: recheck instance listing and explicit instance argument |

Sources: [official skill](https://github.com/CoplayDev/unity-mcp/blob/beta/unity-mcp-skill/SKILL.md), [resource reference](https://github.com/CoplayDev/unity-mcp/blob/beta/unity-mcp-skill/references/resources-reference.md), [CLI](https://coplaydev.github.io/unity-mcp/guides/cli), [groups](https://coplaydev.github.io/unity-mcp/guides/tool-groups).

Implementation cross-check: [CLI dispatch route](https://github.com/CoplayDev/unity-mcp/blob/e2fd09c71644d1d9fa1ae134526ce913cbf97536/Server/src/main.py), [raw command](https://github.com/CoplayDev/unity-mcp/blob/e2fd09c71644d1d9fa1ae134526ce913cbf97536/Server/src/cli/main.py), [Python tool adapters](https://github.com/CoplayDev/unity-mcp/tree/e2fd09c71644d1d9fa1ae134526ce913cbf97536/Server/src/services/tools).
