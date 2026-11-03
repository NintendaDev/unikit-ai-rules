# Coplay Unity MCP — Prefabs and assets

| Need | MCP | CLI |
|---|---|---|
| Inspect prefab asset | `manage_prefabs`: `get_info`, `get_hierarchy` | `prefab info`, `prefab hierarchy` |
| Edit without opening stage | `manage_prefabs(action="modify_contents")` | `prefab modify` or raw |
| Interactive stage | `open_prefab_stage` → edits → `save_prefab_stage` → `close_prefab_stage` | `prefab open` → edits → `prefab save` → `prefab close` |
| Save object as prefab | `create_from_gameobject` | `prefab create` |
| Instantiate prefab | `manage_gameobject(action="create", prefab_path=...)` | `raw manage_gameobject` |
| Search/read/import/move assets | `manage_asset` | `asset search`, `info`, `import`, `move`, `rename` |

## Prefab asset versus scene instance

- Establish whether the task changes the source asset, a nested prefab, a variant, or a scene-instance override. Do not silently broaden one instance change to all instances.
- Read `mcpforunity://editor/prefab-stage` before stage operations. Resource prefab paths are URL-encoded: `mcpforunity://prefab/Assets%2FPrefabs%2FProbe.prefab`; tool arguments use normal asset paths.
- Prefer `modify_contents` for bounded asset edits. Its transforms are local. `target` is an object name/path **inside the prefab**, not an arbitrary scene object ID.
- Use `component_properties` for existing serialized component fields, `components_to_add/remove` for composition, and `create_child`/`delete_child` for structure. `create_child` can create nested instances with `source_prefab_path`; do not combine that field with `primitive_type`.
- Inspect the asset after save. For persistence-sensitive changes, reread from the saved prefab; a scene screenshot alone cannot prove the source asset changed.

Example: change a probe's body mass in its source prefab.

```python
manage_prefabs(action="get_hierarchy", prefab_path="Assets/Prefabs/PhysicsProbe.prefab")
manage_prefabs(action="modify_contents", prefab_path="Assets/Prefabs/PhysicsProbe.prefab",
               target="Body", component_properties={"Rigidbody": {"mass": 2.5}})
manage_prefabs(action="get_info", prefab_path="Assets/Prefabs/PhysicsProbe.prefab")
```

```powershell
unity-mcp --format json prefab hierarchy 'Assets/Prefabs/PhysicsProbe.prefab'
unity-mcp --format json raw manage_prefabs '{"action":"modify_contents","prefabPath":"Assets/Prefabs/PhysicsProbe.prefab","target":"Body","componentProperties":{"Rigidbody":{"mass":2.5}}}'
unity-mcp --format json prefab info 'Assets/Prefabs/PhysicsProbe.prefab'
```

The final `get_info` establishes asset identity, not the mass value. Read the changed component through the stage/resources or a narrow serialized-asset query to verify the actual field.

## Asset database work

- MCP arguments use `prefab_path`/`component_properties`; CLI raw uses `prefabPath`/`componentProperties`. Asset search raw likewise uses `searchPattern`, `generatePreview`, `pageSize`, `pageNumber`. The paired examples intentionally differ.
- Scope searches by `path`, `search_pattern` and current `filter_type` spelling; older prose may say `filterType`. Keep `generate_preview=false`, start with a small `page_size`, and follow 1-based `page_number` paging.
- Use AssetDatabase-aware tools to move or rename Unity assets so references and companion metadata follow the asset. Verify the resulting GUID and references.
- `manage_asset` covers import/create/modify/delete/duplicate/move/rename/search/get_info/create_folder/get_components. For ScriptableObjects, use `manage_scriptable_object` instead; see [scripting](coplay-unity-mcp-scripts-compilation.md).
- Distinguish importing an existing project file (`manage_asset import`) from copying/normalizing an external DCC model (`import_model_file` in [asset generation and Blender](coplay-unity-mcp-asset-generation-blender.md)).
- Keep overwrite flags off unless replacing the specified asset is part of the task. When a call times out, query existence before issuing another create/import.

```python
manage_asset(action="search", path="Assets/Prefabs", search_pattern="t:Prefab",
             page_size=20, page_number=1, generate_preview=False)
```

```powershell
unity-mcp --format json raw manage_asset '{"action":"search","path":"Assets/Prefabs","searchPattern":"t:Prefab","pageSize":20,"pageNumber":1,"generatePreview":false}'
```

Sources: [prefabs](https://coplaydev.github.io/unity-mcp/reference/tools/core/manage_prefabs), [assets](https://coplaydev.github.io/unity-mcp/reference/tools/core/manage_asset), [resource reference](https://github.com/CoplayDev/unity-mcp/blob/beta/unity-mcp-skill/references/resources-reference.md).
