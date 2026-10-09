# Unity Biome MCP — Scenes, Objects, Components and Properties

> See also: [unity-biome-mcp-batch-transactions.md](unity-biome-mcp-batch-transactions.md) (batching, guarded changes, undo), [unity-biome-mcp-prefabs-assets.md](unity-biome-mcp-prefabs-assets.md) (prefab assets), [unity-biome-mcp-connection-session.md](unity-biome-mcp-connection-session.md) (reply rewriting, cached reads)

Core tools: `get_hierarchy`, `get_component`, `inspect`, `set_property`, `create_object`, `manage_component`, `editor`.
Always visible: `scene`, `search_scene`, `set_active`, `set_parent`, `delete_object`, `validate_references`. Everything
else here is in `SCENE` or `COMPONENTS`. Written against server and plugin v2.0.0.

---

## Addressing Objects

| Form | Meaning |
|---|---|
| `/Root/Child/Leaf` | Hierarchy path. First segment is a root object in **any** loaded scene; children match by exact, case-sensitive name |
| `SceneName:/Root/Child` | Scene-qualified. Exact scene name, **no** fuzzy fallback. Use it whenever more than one scene is loaded |
| `&abc` | Short ref printed by `get_hierarchy` and `search_scene`. Process-local; dies on Editor restart and can go stale after a scene reload |
| `#12345`, `$1A2B` | Decimal instance id / hex id (legacy) |
| `\/`, `\\`, `[Name/With/Slash]` | Escapes for names containing slashes |

Resolution rules that bite:

- **Paths resolve fuzzily.** When the exact path is not found, the plugin looks for the object whose name equals the
  last segment and whose full path *ends with* what you passed. One candidate is used **silently**. So `/Button` or
  `/Panel/Title` can act on a deeper object than you meant. Only `delete_object` (by path) and `set_parent` are strict.
  Always pass the full path taken from a fresh read.
- **Duplicate sibling names**: the first match wins, no error. Duplicate **root** names raise `Ambiguous`. Use the
  `&ref` in both cases.
- Inactive objects are addressable and are listed by `search_scene` (marked `!`) and `find_objects`.
- Objects under `DontDestroyOnLoad` are **not** reachable by path or search — only by instance id or `execute_code`.
- While a prefab stage is open in the Editor, `/StageRoot/…` resolves inside the stage, and `get_hierarchy` and
  `search_scene` show only the stage. `editor(action="state")` prints `prefab:<assetPath>` in that case.
- The `id` parameter of `get_object_detail`, `get_components_list` and `delete_object` needs the **decimal** instance
  id. The hierarchy prints a base-62 `&ref`; prefer `inspect(paths="&ref")` instead of converting.
- A miss reads `'<path>' not found. Root objects: A, B, … Did you mean '<root>'?`. An `Assets/….prefab` string passed
  as an object path gets a hint to use `prefab(action="edit")`.

## Reading

| Need | Call | Notes |
|---|---|---|
| Orientation | `get_hierarchy(summary=True)` | Root counts only; ignores `depth`/`filter`/`components` |
| A subtree | `get_hierarchy(root="/Level", depth=3, components=True, full=True)` | Default `depth` is 2; `+N` marks hidden descendants; max 3000 nodes. Without `full=True` a repeated call may return only a `[DIFF since #N]` |
| Find by criteria | `search_scene(query="Boss t:Health tag=Enemy active=true", root="/Level", limit=50)` | Terms are AND-ed. `t:` is the exact type name, **not** base classes. `layer=` takes a **number** — a layer name is silently ignored. Name text is a case-insensitive substring |
| Simple find | `find_objects(name=, tag=, layer=, component=)` | Name is a case-**sensitive** substring; `layer` by name. A name-only query may be answered from a cached tree by exact name — prefer `search_scene` |
| One component | `get_component(path, type="Rigidbody", fields="mass,isKinematic")` | `type` is required |
| Several objects | `inspect(paths="/A,/B", components="Transform,Health", fields="position,hp")` or `inspect(find_type="Light")` | One section per path; a missing component is silently omitted |
| Exact field names | `get_schema(type="Health")` | Top-level serialized names and types of a **Component** type. Not for ScriptableObjects |
| Compare two objects | `object_diff(path_a, path_b)` | A missing object comes back as text `Error: pathA not found` inside a successful reply |
| Did anything change | `fingerprint(path, depth=3)` → `fp:XXXXXXXX` | Hash over names and every serialized property; cheap repeat check |
| Structure diff | `scene_diff()` twice | Names, structure and active flag only — no component fields |

Reading traps:

- `get_component` and `inspect` **omit lines whose value is a default** (`0`, `false`, empty, zero or unit vectors,
  `Untagged`, `Default`, mass `1`…). A missing line does not mean a missing field. Ask for the field by name in
  `fields=`.
- `get_component` never shows `m_Enabled`, `m_Script` or `m_GameObject`, so a component's enabled state cannot be read
  this way. Read it with `execute_code`, or verify it by a write-then-behaviour check.
- Values are formatted for reading: floats at 4 significant digits, quaternions as Euler angles, object references as
  `path &ref` (asset references show the name, not the asset path), arrays truncated to 10 elements, curves as
  `<AnimationCurve>`.
- A read within 12 s of a write to the same path can be served from a cache (`[CACHED]`).

## Creating and Restructuring

```text
create_object(name="Spawner", parent="/Level/Checkpoint", components="AudioSource")
create_object(name="Guard_01", parent="/Enemies", prefab_path="Assets/Prefabs/Guard.prefab", scene="Level01")
set_parent(path="/Sword", parent="/Hero/WeaponSocket", world_position_stays=True)
rename_object(path="/Enemy", name="Guard")          # returns the new path — use it from now on
transfer_object(path="Main:/Hero", action="move", target_scene="Gameplay")
delete_object(path="/TempPreview", force=True)      # force is required for a non-empty object
```

- `create_object` builds the object **first** and resolves `parent`, `scene` and `components` afterwards. A bad parent
  or component type raises an error but **leaves an orphan object at the scene root**. After a failed create, search
  for the name and delete the orphan.
- A new child is parented with its local transform kept (not world position).
- `transfer_object(action="copy")` is the only duplicate tool; without `parent` the clone lands at the scene root.
- `set_parent` on a non-root child of a prefab instance is refused: edit the prefab asset or unpack first.
- `setup_objects(specs)` — one object per line: `Name [primitive=X] [parent=/P] [pos=(x,y,z)] [components=A,B]`. The
  name is the first whitespace-delimited token, so it cannot contain spaces. No rotation, scale or scene keys.

## Components

- `manage_component(path, type, action="add"|"remove")`. There is no enable/disable action — write `m_Enabled`.
- `add` is refused when a component of that type already exists on the object, even for types that allow several.
- Type resolution for `add`: short name (`Button`) or full name (`UnityEngine.UI.Button`), nested type as
  `Outer+Inner`. Every loaded assembly is searched. Two types with the same short name raise
  `Ambiguous: 'X' = A and B. Use full namespace.`
- Matching an **existing** component (the `type` / `component` argument of read and write tools) ignores the namespace
  and tolerates near-misses: a name within three edits of a component on the object is accepted. Read the reply to see
  which component was actually used.
- `[INVALID: type 'X' not found]` on `add` can come from a server-side pre-check that uses a different type lookup
  than the plugin and rejects some valid types. When the class exists and the project compiles, send the same command
  as a `batch` line (the pre-check does not run there) or use `execute_code` with `Undo.AddComponent`, then re-read the
  object.

## Writing Properties

```text
set_property(path="/Hero", component="Rigidbody", prop="mass", value="2.5")
set_property(path="/Spawner", component="Spawner", prop="target", value="/Hero", ref_component_type="CapsuleCollider")
set_property(path="/Lamp", component="Light", prop="m_Enabled", value="false")
set_property(component="Light", prop="intensity", value="1.5", find_type="Light")   # bulk over all Lights
set_property_delta(path="/Hero", component="Health", prop="maxHp", delta="+10")
```

- `component` is **required in practice** — the documented "empty = Transform" default does not exist. Only
  `prop="active"` and `prop="layer"` work without a component.
- The write goes through `SerializedObject`, is recorded in Undo and marks the scene dirty. **Nothing is saved** until
  `scene(action="save")`.
- The reply contains `prop = <new> (was <old>)`. `dry_run=True` previews.
- In Play Mode the call may be silently rerouted to a runtime field write that is lost on Stop. Do not author in Play
  Mode.
- `set_property_delta` supports float, integer, `LayerMask` and `Vector3` only, and is not idempotent.

### Property names

Resolution order: exact serialized path → alias table → `m_` + Capitalized → `_` + camelCase.

| You want | Write |
|---|---|
| Nested member | `a.b.c` |
| Array size / element / element field | `list.Array.size`, `list.Array.data[0]`, `list.Array.data[2].field` |
| Whole array of simple values | `prop=list value=a,b,c` (resizes; `[]` empties it) |
| Local position / rotation / scale | `position`, `rotation`, `scale` map to `m_LocalPosition`, `m_LocalRotation`, `m_LocalScale` — **local**, also on `RectTransform` |
| RectTransform layout | `m_AnchoredPosition`, `m_SizeDelta`, `m_AnchorMin`, `m_AnchorMax`, `m_Pivot` |
| Text | TMP `m_text`, uGUI `Text` → `m_Text` |

Not accepted: Inspector display names ("Max Hp"), C# properties that are not serialized fields. When a name is
rejected, call `get_schema` or read the component and copy the serialized name.

### Value literals

| Field type | Literal |
|---|---|
| bool | `true` / `false` |
| int, float | invariant-culture number (`3`, `0.5`, `1e-3`) |
| string | raw text |
| Vector2/3/4, `Vector*Int` | `(x,y,z)` — parentheses optional, **exact arity** |
| Quaternion | three numbers = Euler degrees; four = raw x,y,z,w |
| Color | `#RRGGBB`, `#RRGGBBAA`, bare hex, or `(r,g,b[,a])` with 0–1 floats |
| Rect / RectInt | `(x,y,w,h)` |
| Bounds | `(cx,cy,cz,sx,sy,sz)` — center and **size** |
| Enum | member name, or the integer underlying value. Flag combinations need the integer |
| LayerMask | integer bitmask only — names are not accepted |
| Object reference | `null` clears. Scene path (`/Hero`), `/Hero::CapsuleCollider` for a specific component, `&ref`, asset path (`Assets/X.mat`), sub-asset (`Assets/Atlas.png::SpriteName`, `Assets/X.fbx::ClipName`) |
| Unsupported | `AnimationCurve`, `Gradient`, `[SerializeReference]` managed references, a whole struct or list of structs, `UnityEvent` → use `execute_code` (or `wire_event` for events) |

A `Sprite` field given a bare `Assets/x.png` is rejected, because the main asset is a `Texture2D`; use the `::Sprite`
sub-asset form. `None` is not `null`.

### Values that get rewritten

- **Whole-value keywords.** On every field type — including strings and enums — the plugin rewrites a value that is
  exactly `yes`, `no`, `on`, `off`, `true`, `false` (any case) to `True`/`False`, and `red`, `green`, `blue`, `white`,
  `black`, `Color.*`, `Vector3.up`, `Vector2.one`, `Quaternion.identity` to tuples. A label "Yes", "Off" or "Red"
  therefore becomes `True`, `False` or `(1,0,0,1)`, and an enum member named `On` fails. The same applies to
  `prefab(action="edit")`.
- **Typed `set_property` only.** The server additionally turns the strings `1`, `0`, `yes`, `no`, `on`, `off` into
  `true`/`false` before sending. An int or float field written as `"1"` or `"0"` can therefore fail with
  `Invalid int: 'true'`.
- For a string, enum or numeric field that must hold one of those exact values, write through `execute_code`
  (`SerializedObject` + `ApplyModifiedProperties`), and read the value back. `scriptable_object`, `material` and
  `create_ui(text=…)` do not apply these rewrites.

### Several properties at once

- `set_properties(path, props="Transform.m_LocalPosition=(1,0,0);Rigidbody.mass=5")` — one object.
- `configure_objects(config)` — one object per line: `/Path Comp.prop=value Comp2.prop=value`.

Both are macros over a non-atomic batch followed by a read. Limits: the left side is split at the **last dot**, so
nested paths (`Transform.m_LocalPosition.x`) and array elements (`list.Array.data[0]`) are not expressible; malformed
lines are dropped silently; `configure_objects` cuts the object path at the first space. For those cases use
`batch` with explicit `set_property` lines.

## Scenes

`scene(action=…)`: `list`, `open`, `open_additive`, `close`, `set_active`, `save`, `save_copy`, `discard`, `new`.

| Action | Effect on unsaved work |
|---|---|
| `list` | None. Prints `* Name  path  N objs [dirty]`; `(unsaved)` for an untitled scene |
| `save [path] [scene]` | Saves the active scene, or the one named in `scene=`. `path` = save-as. An untitled scene needs `path` |
| `save_copy path` | Writes the current in-memory state elsewhere; the scene and its dirty flag are untouched |
| `open path` | **If the active scene is dirty, its changes are discarded without saving.** All other loaded scenes are closed |
| `new` | Discards the current scenes without saving |
| `close path` | Closes a scene **without saving**; refuses to close the only scene |
| `discard [scene]` | Without `scene`: reloads the active scene and **closes every additive scene**. With `scene=X`: closes and reopens X additively |
| `open_additive path` | No dirty check |

Rules:

- Run `scene(action="list")` before `open`, `new`, `close` or `discard`, and decide explicitly what happens to each
  dirty scene. In a shared Editor a dirty scene may hold someone else's work — `save` and `discard` are both wrong
  there until the owner is known; `save_copy` is the non-destructive option.
- `mcp_status` and `editor(action="state")` report dirtiness of the **active** scene only.
- In multi-scene work, pass `scene=` to `create_object` and to `save`, and verify an object's owning scene after
  `transfer_object`.
- `scene_environment(action="get"|"set", prop, value)` reads or writes ambient, fog, skybox and reflection settings.

## References and Events

```text
references(action="get", path="/HUD", children=True, depth=2)       # outgoing scene references
references(action="find_to", path="/Hero/Weapon")                    # who references this object
validate_references(path="/HUD", depth=3)
auto_wire(path="/HUD/Controller", dry_run=True)
wire_event(path="/HUD/StartButton", component="Button", event="onClick",
           target="/Game", method="StartGame", target_component_type="GameManager")
list_events(path="/HUD/StartButton", component="Button", event="onClick")
```

- `references` works on **scene-object** references in loaded scenes. Asset dependencies are
  `asset(action="get_dependencies"|"find_dependents")`.
- `references(action="remap", path=T, source=S, target=T)` rewrites references on the components of `T` itself (not
  its children) that point into `S` to the same relative path under `T`.
- `validate_references` reports `[ERROR]` (missing script or prefab asset) and `[MISSING]` (a serialized id whose
  object is gone). **A plain unassigned (null) field is not reported**, and `ignore_optional` has no effect. A clean
  result does not prove that required fields are assigned — read them.
- `auto_wire` matches null fields to objects by name: exact, then *contains*, then type only. A *contains* match can
  pick the wrong object. Run with `dry_run=True` and apply only when every proposed match is exact and unambiguous.
- `wire_event`: `event` is the serialized field name (`onClick`, `_onCompleted`). `arg_type` is
  `void|bool|int|float|string|object` with `arg_value`. With several components owning the method pass
  `target_component_type`; with overloads also `parameter_types="int"`.
  - It is **not idempotent** — calling twice adds two listeners.
  - The method signature is **not validated**: a private, static or wrong-arity method registers and fails at runtime.
  - Always verify with `list_events`, and remove with `unwire_event(index=N)`; omitting `index` clears the whole event.
- `get_unity_events(path)` scans only the **active** scene.

## Verification Checklist

1. Read the exact fields you changed, naming them in `fields=`.
2. `validate_references` on the changed root when references moved — plus a direct read of required fields.
3. `list_events` after wiring.
4. Console delta: `get_console_since(mark_id=…)`.
5. `scene(action="list")`, then save only the scene you own, only after the evidence is clean.
