# Unity Biome MCP — Prefabs, Assets and Project Data

> See also: [unity-biome-mcp-scene-objects.md](unity-biome-mcp-scene-objects.md) (value literals, object references), [unity-biome-mcp-materials-vfx.md](unity-biome-mcp-materials-vfx.md) (materials and shaders), [unity-biome-mcp-batch-transactions.md](unity-biome-mcp-batch-transactions.md) (what never rolls back)

Category gate: `ASSETS` for `prefab`, `asset`, `scriptable_object`, `project_settings`, `package`, `bake`; `build` and
`menu` are in `SYSTEM`. Written against server and plugin v2.0.0.

Everything on this page writes **files** immediately. None of it is covered by Unity Undo, `atomic=True` or
`undo_last`. Version control is the only rollback. All of these tools are also refused in Play Mode — including their
read actions (`asset find`, `prefab get_overrides`, `scriptable_object get`, `project_settings get`).

> Notation: inside tables a literal pipe is written `\|` because of Markdown escaping. The real character is a bare `|`.

---

## Prefabs

| Goal | Call |
|---|---|
| Scene object → new prefab asset (object becomes an instance) | `prefab(action="save", path="/Pickup", asset_path="Assets/Prefabs/Pickup.prefab", mode="new")` |
| Change the prefab **asset** | `prefab(action="edit", asset_path=…, component=…, prop=…, value=…)` |
| Change one scene **instance** | `set_property` / `manage_component` on the scene path (creates an override) |
| List an instance's overrides | `prefab(action="get_overrides", path="/Pickup", format="structured")` |
| Push instance overrides into the asset | `prefab(action="apply", path="/Pickup")` |
| Drop instance overrides | `prefab(action="revert", path="/Pickup", scope="object"\|"children")` |
| Variant | `prefab(action="create_variant", base_path=…, variant_path=…)` |
| Instance in the scene | `create_object(name=…, parent=…, prefab_path=…, scene=…)` — or `prefab(action="instantiate", asset_path=…)` for an unrenamed instance at the active scene root |
| Break the link | `prefab(action="unpack", path=…, recursive=False)` |

### `prefab(action="edit")`

```text
prefab(action="edit", asset_path="Assets/Prefabs/Hero.prefab",
       path="Visual/Nameplate", component="TextMeshProUGUI", prop="m_text", value="Hero")
prefab(action="edit", asset_path="Assets/Prefabs/Bomb.prefab", add_component="Rigidbody")
```

- It loads the prefab contents headlessly, edits, saves the asset and unloads. **No prefab stage is opened**, and no
  tool can open, close or save one.
- `path` is **relative to the prefab root and does not include the root's name**. Among same-named children the first
  one is used; a child whose name contains `/` cannot be addressed.
- **One property per call.** Order inside one call: `add_component`, `remove_component`, then the property.
  `add_component` is a no-op when the component is already there.
- Property names and value literals follow `set_property` rules — including the keyword rewriting of `yes/no/on/off`
  and color names.
- An object reference to **another object inside the same prefab** cannot be given by path: references resolve against
  loaded scenes. Use `execute_code` with `PrefabUtility.LoadPrefabContents` / `SaveAsPrefabAsset` for intra-prefab
  wiring, or wire it on a scene instance and `apply`.
- The change reaches every instance that has not overridden that property.
- `mode` on `save`: `new` fails when the file exists; **any other value overwrites**.

### Reading and verifying a prefab asset

There is no tool that reads a prefab asset's component values directly. To verify an edit:

```text
create_object(name="__PrefabCheck", prefab_path="Assets/Prefabs/Hero.prefab")
get_component(path="/__PrefabCheck/Visual/Nameplate", type="TextMeshProUGUI", fields="m_text")
delete_object(path="/__PrefabCheck", force=True)
```

Alternatives: read the `.prefab` YAML from disk, or `execute_code` with `AssetDatabase.LoadAssetAtPath`. Deleting the
temporary instance leaves the scene dirty — do not save a scene only because of the check.

Before `apply` or `revert`, always read `get_overrides`: `apply` writes **every** override of that instance into the
asset, not only the one you just made.

## `asset`

| Action | Arguments | Notes |
|---|---|---|
| `find` | any of `type`, `name`, `folder`, `labels` | At least one is required; max 200 results. There is no `query` argument |
| `get_info` | `path` | Type, GUID, size, direct dependencies |
| `get_dependencies` | `path`, `recursive` | Forward dependencies |
| `find_dependents` | `path` | Reverse scan over the whole `Assets/` — slow, capped at 100 |
| `validate_move` → `move` | `source`, `dest` | Keeps the `.meta` and GUID. `path_only=True` is a syntax-only check |
| `duplicate` | `source`, `dest` | |
| `delete` | `path` | Immediate and permanent, including the `.meta` |
| `create` | `type=Folder\|Material\|PhysicMaterial\|AnimatorController\|ScriptableObject`, `path` | ScriptableObject also needs `class_name` (short type name). A `Material` created here gets the built-in `Standard` shader when that shader is present — in URP/HDRP create materials with `material(action="create", shader=…)` instead |
| `import_settings` | `path`, `prop`, `value` | No `value` = read; no `prop` = dump all. Writes a public importer property (bool, int, float, enum, string) and reimports |
| `read_text` | `path` | Above 64 KB only the first 32 768 characters come back, marked `truncated:true` |
| `write_text` | `path`, `content` | Overwrites; **writes a UTF-8 BOM**; imports the asset |
| `reimport` | `path` | Forced import |
| `export_package` / `import_package` | `path`, `output`, `include_deps` | |

Rules:

- Move, rename and delete assets **only** through `asset` (or the Editor). A filesystem move loses the `.meta` and
  breaks every reference.
- Before `move` or `delete`: `validate_move`, then `find_dependents`.
- Prefer your own file tools for reading and writing text assets and source files: `read_text` truncates and can be
  further trimmed by the response distiller, and `write_text` adds a BOM. After an external write, let Unity import it
  (`sync_unity` for code, `asset(action="reimport")` for data).

## `scriptable_object`

```text
scriptable_object(action="list_types", filter="Settings")
scriptable_object(action="create", type="GameSettings", path="Assets/Config/GameSettings.asset",
                  fields="difficulty=Normal\nvolume=0.8")
scriptable_object(action="get", path="Assets/Config/GameSettings.asset", fields="difficulty,volume")
scriptable_object(action="set", path="Assets/Config/GameSettings.asset", prop="volume", value="0.6")
```

- `get` returns **top-level fields only**; arrays are shown inline up to 10 elements, structs up to 8 members.
- `set` takes either `prop` + `value` (both non-empty) or `fields` (newline-separated `prop=value`, split at the first
  `=`). To clear a string use `fields="prop="`.
- Nested data: `list.Array.size=3`, then `list.Array.data[0]=…`, `list.Array.data[0].member=…`. A whole list or struct
  cannot be assigned in one value.
- Property names are the exact serialized names — no alias mapping here. An unknown name answers
  `Property not found: 'x'. Allowed: …`.
- The type is matched by short or full name; with two types sharing a short name the **first** one is used without an
  ambiguity error — pass the full name.
- The asset is saved immediately. On a failed `create` the half-made asset is deleted.

## `project_settings`

`action`: `get` | `set`. `target`: `tags`, `layers`, `sorting_layers`, `quality`, `physics`, `time`, `player`,
`graphics`, `audio`, `input`. Read-only targets: `sorting_layers`, `audio`, `input`.

```text
project_settings(action="get", target="layers")
project_settings(action="set", target="layers", index=8, value="Interactable")
project_settings(action="set", target="tags", prop="remove", value="Obsolete")
project_settings(action="set", target="player", prop="ScriptingBackend", value="IL2CPP", build_target="Android")
```

- `tags set` without `prop="remove"` **adds** a tag and does not check for duplicates.
- User layers start at index 6.
- These are project-wide changes: read first, record the old value, report target, property or index, old and new.

## `package`, `build`, `bake`, `menu`

- `package(action="list"|"search"|"add"|"remove", name, version, query)` — direct-only. `add` and `remove` trigger
  downloads, imports and a domain reload; follow with `sync_unity(resolve=True)` and wait for a clean result.
- `build(action="build", target, scenes, path, dev)` — direct-only, up to 300 s. Defaults: active target, Build
  Settings scenes, `Builds/<target>`. A produced build is not acceptance evidence.
- `bake(target="lighting"|"occlusion", action="start"|"status"|"cancel"|"clear"|"settings")` — lighting `start` is
  asynchronous: poll `status` until idle.
- `menu(action="execute"|"list", path)` — only existing, enabled items; `Edit/` items are not supported.

## Pitfalls

- Treating a stopped batch as "nothing happened": every asset line that ran has already changed a file.
- `prefab apply` after a multi-property experiment on an instance — it bakes all overrides into the asset.
- Editing a prefab asset to change one object in one scene (use an override), or overriding an instance to change all
  of them (edit the asset).
- Passing `Assets/….prefab` as the `path` of a scene tool.
- `asset(action="create", type="Material")` in a scriptable render pipeline project: the material can end up on the
  built-in `Standard` shader and render pink. Name the shader explicitly through `material`.
