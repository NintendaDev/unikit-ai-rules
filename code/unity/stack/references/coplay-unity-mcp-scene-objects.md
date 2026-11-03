# Coplay Unity MCP — Scenes, objects and components

| Goal | Tool/actions | CLI entry |
|---|---|---|
| Inspect scene context | `manage_scene`: `get_active`, `get_loaded_scenes`, `get_hierarchy` | `scene active`, `scene loaded`, `scene hierarchy` |
| Load/save | `manage_scene`: `load`, `save` | `scene load`, `scene save` |
| Multi-scene editing | `load` with additive; `close_scene`, `set_active_scene`, `move_to_scene` | `scene open-additive`, `close`, `set-active`, `move-to` |
| Find objects | `find_gameobjects` | `gameobject find` |
| Inspect one object | `mcpforunity://scene/gameobject/{id}` and component resources | Use exact query/custom code only if no matching CLI query exists |
| Create/move/parent/duplicate/delete | `manage_gameobject` | `gameobject ...` or `raw manage_gameobject` |
| Add/remove/configure components | `manage_components` | `component add`, `remove`, `set`, `modify` |
| Validate scene | `manage_scene(action="validate")` | `scene validate` |

## Find, read, edit, read back

1. Read the active scene and prefab-stage context before editing. Saving a scene does not save a prefab stage and vice versa.
2. Start with a bounded hierarchy or exact search. `find_gameobjects` returns IDs; read the matching object and only the affected component through resources.
3. Resolve ambiguous names by hierarchy path or current ID. Use `search_method="by_id"` with IDs and `by_path` with paths; do not use a tag-wide target for a single-object change.
4. Inspect `component_index` when multiple instances of one component type exist. The omitted index selects the first instance.
5. Use the serialized names and value/reference shape that the resource actually exposes. `manage_components` writes components; it has no general `get` action.
6. Read back properties and object references, then save the intended scene. Runtime edits do not automatically become authored scene data.

```python
find_gameobjects(search_term="PhysicsProbe", search_method="by_name", page_size=10)
# After resource inspection, replace 24680 with the returned unique ID.
manage_components(action="set_property", target=24680, search_method="by_id",
                  component_type="Rigidbody", property="mass", value=2.5)
manage_scene(action="save")
```

```powershell
unity-mcp --format json gameobject find 'PhysicsProbe'
# Use the ID resolved above, not an unchecked duplicate name.
unity-mcp --format json raw manage_components '{"action":"set_property","target":24680,"searchMethod":"by_id","componentType":"Rigidbody","property":"mass","value":2.5}'
unity-mcp --format json scene save
```

## Scene operations

- Use explicit `Assets/.../*.unity` paths when loading; preserve unrelated dirty work before a scene replacement. Do not create/load an empty scene as a routine diagnostic.
- `create` supports templates; inspect available values instead of assuming the template matches the project's render pipeline.
- For multi-scene authoring, distinguish loaded, active and owning scene. `move_to_scene` changes ownership; changing the active scene alone does not move an object.
- `get_hierarchy` currently pages one level; `max_depth` is documented as forward-compatible. Traverse the required parents and follow returned cursors instead of assuming a recursive dump.
- Read-only validation is distinct from `auto_repair=true`, which changes the scene. Inspect findings before using repair within the requested scope.
- Use `manage_build(action="scenes")` for changing the build scene list; `manage_scene` is not the build configuration editor.

## Object and component details

- Read transform coordinate semantics for the specific operation; scene object and prefab-content setters need not use the same space. Reparent, then verify local/world placement.
- `manage_components` supports `property`/`value` or a `properties` dictionary. Object references may use instance IDs, asset paths or `{guid}`/`{path}`; Sprite sub-assets can need `spriteName` or `fileID`.
- Use numeric/boolean JSON values. Keep GameObject names, component names, layer names and asset paths distinct; a layer index is not a bit mask.
- Instantiating a prefab is `manage_gameobject(action="create", prefab_path="Assets/...prefab")`. See the [prefab reference](coplay-unity-mcp-prefabs-assets.md) for asset editing.
- If available, use dedicated `undo`/`redo` and inspect the affected group; do not assume every tool/custom operation has a complete Undo implementation.

Sources: [scenes](https://coplaydev.github.io/unity-mcp/reference/tools/core/manage_scene), [objects](https://coplaydev.github.io/unity-mcp/reference/tools/core/manage_gameobject), [components](https://coplaydev.github.io/unity-mcp/reference/tools/core/manage_components), [search](https://coplaydev.github.io/unity-mcp/reference/tools/core/find_gameobjects).
