# Unity Biome MCP — Materials, Shaders and VFX

> See also: [unity-biome-mcp-prefabs-assets.md](unity-biome-mcp-prefabs-assets.md) (asset moves and dependencies), [unity-biome-mcp-diagnostics-performance.md](unity-biome-mcp-diagnostics-performance.md) (`render_analyze`, overdraw), [unity-biome-mcp-screenshots-visual.md](unity-biome-mcp-screenshots-visual.md) (appearance evidence)

Category gates: `ASSETS` for `material`, `shader`, `material_audit`; `SCENE` for `set_material`; `MEDIA` for
`particle` and `render_analyze`. `vfx_intent` is always visible and direct-only. Written against server and plugin
v2.0.0.

> Notation: inside tables a literal pipe is written `\|` because of Markdown escaping. The real character is a bare `|`.

---

## Pick the Tool

| Goal | Tool |
|---|---|
| Throw a color on one scene object, no asset needed | `set_material(path, color="#RRGGBB")` |
| Create a `.mat`, read or change properties, assign to renderers | `material` |
| Inspect or create a `.shader`, edit a Shader Graph | `shader` |
| Create or tune a Particle System | `particle` |
| Draft a particle setup from a description | `vfx_intent(target, intent, dry_run=True)` |
| Scene-wide duplicate, compression or texture audit | `material_audit` |

`set_material` builds a **new in-memory Material** on the renderer. It never produces a reusable asset — use `material`
whenever identity, reuse or version control matters.

## `material`

| Action | Arguments | Result |
|---|---|---|
| `create` | `path` (`.mat`), `shader` | New material asset |
| `get` | `path` (asset) **or** `object_path` (+ `slot`) | Current values |
| `list_properties` | `path` or `object_path` (+ `slot`) | The shader's real property names and types |
| `list_slots` | `object_path` | Renderer slots |
| `set` | `path` or `object_path`, `prop`, `value` (+ `slot`, `target`) | One property |
| `set_fields` | `path`, `value="_BaseColor=#D92B2B\n_Smoothness=0.35"` | Several properties, newline-separated |
| `copy` | `source` (asset or scene object), `targets` (comma-separated scene paths), `slot` | Assigns the **same** shared material |
| `list_shaders` | `filter` | Shader assets in the project |
| `get_errors` | `path` (shader asset) | Shader compiler messages |

Rules:

- Property names differ between Built-in, URP and HDRP (`_Color` vs `_BaseColor`). Call `list_properties` first; never
  assume a name.
- Value syntax follows the shader property type: color (`#RRGGBB[AA]`, bare hex, or `(r,g,b[,a])` with 0–1 floats),
  float/range number, vector, integer, or a **texture asset path**. A missing texture path is an error, not a silent
  skip.
- `prop="shader"` swaps the shader; `prop="renderQueue"` takes an integer. When `prop` is not a declared property,
  `value="true"|"false"` toggles a keyword of that name.
- `set_fields` **skips unknown properties** without failing. Read the result and confirm important values with `get`.
- `copy` skips targets that are missing or have no renderer — compare the returned assignment count with the number of
  targets you passed.

### Shared vs Instance

`material(action="set", object_path=...)` defaults to `target="shared"`: the edit lands on the shared asset and changes
every renderer that uses it.

| `target` | Effect |
|---|---|
| `shared` (default) | Edits the shared material asset in that slot |
| `asset` | Currently the same code path as `shared` |
| `instance` | Clones the slot's material for this renderer only; the clone is not an asset |

State the intended target explicitly in every renderer-addressed `set`. For a durable per-object variation, create a
new `.mat` and assign it with `copy`.

```text
material(action="list_properties", object_path="/Lake", slot=0)
material(action="create", path="Assets/Materials/Alert.mat", shader="Universal Render Pipeline/Lit")
material(action="set_fields", path="Assets/Materials/Alert.mat", value="_BaseColor=#D92B2B\n_Smoothness=0.35")
material(action="get", path="Assets/Materials/Alert.mat")
material(action="copy", source="Assets/Materials/Alert.mat", targets="/Enemies/GuardA,/Enemies/GuardB", slot=0)
```

## `shader`

| Action | `path` means | Notes |
|---|---|---|
| `get` | shader asset | Name, properties, keywords |
| `create` | new `.shader` file | `preset="unlit\|lit\|transparent"` **or** `code=<source>`; optional `shader_name`. The path must end in `.shader`; import errors come back in the result |
| `set` | **scene object with a Renderer** | Changes `prop`+`value` or `keyword`+`enabled` on that renderer's shared material. Prefer `material(action="set")` — it exposes slot and target |
| `graph_get` | `.shadergraph` | Nodes, edges, node IDs — keep the IDs |
| `graph_create` | new `.shadergraph` | `preset="lit_graph\|unlit_graph"`, URP targets |
| `graph_node` | `.shadergraph` | `node_type` + `node_action="add"` (default) or `node_id` + `node_action="remove"`. Any value other than `remove` adds a node — there is no "configure" |
| `graph_edge` | `.shadergraph` | `output_node`/`output_slot` → `input_node`/`input_slot`, `edge_action="add\|remove"` |
| `graph_add_property` / `graph_remove_property` / `graph_rename_property` | `.shadergraph` | `name`, `type`, `default_value`, `reference_name`, `new_name` |
| `graph_get_layout` / `graph_set_layout` / `graph_auto_layout` | `.shadergraph` | Layout text `[id] x,y WxH`; `h_gap`/`v_gap` default 80/50 |

Rules:

- The built-in `.shader` presets are conventional source and may not match the project's render pipeline. Check
  `material(action="get_errors")` after `create`.
- Shader Graph edits mutate the serialized file. Change one logical group, call `graph_get`, check the console, then
  continue. Save the layout with `graph_get_layout` before a large rewire.
- Keep `.shadergraph` files under version control — a malformed edit has no Undo.

## `particle`

`particle(action="create")` takes the **parent** in `path` and the new object's name in `name`. When `name` is omitted
and `path` does not exist, the last path segment becomes the name and the rest becomes the parent.

| Action | Arguments |
|---|---|
| `create` | `path` (parent), `name`, optional `preset` |
| `get` | `path`, optional `module` |
| `set` | `path`, `module`, `prop`, `value` |
| `apply` | `path`, `preset` — resets the system to that preset |
| `play` / `pause` / `stop` | `path` — Editor preview control |

Presets: `fire`, `smoke`, `sparks`, `rain`, `snow`, `explosion`, `magic`, `dust`, `blood`, `trail`.

### Settable Properties

Module and property names are case-insensitive. Anything outside this table is rejected with `Unknown … property`.

| `module` | `prop` values |
|---|---|
| `main` | `duration`, `startDelay`, `startSpeed`, `startSize`, `startLifetime`, `gravityModifier`, `loop`, `playOnAwake`, `maxParticles`, `startColor`, `simulationSpace`, `scalingMode`, `startSize3D`, `startSizeX`, `startSizeY`, `startSizeZ` |
| `emission` | `enabled`, `rateOverTime`, `rateOverDistance` |
| `shape` | `enabled`, `shapeType`, `angle`, `radius`, `radiusThickness`, `scale`, `position` |
| `noise` | `enabled`, `strength`, `frequency`, `scrollSpeed`, `damping`, `octaveCount` |
| `renderer` | `renderMode`, `velocityScale`, `lengthScale` |
| `colorOverLifetime` | `enabled`, `gradient` |
| `sizeOverLifetime` | `enabled`, `curve` |
| `velocityOverLifetime` | `enabled`, `x`, `y`, `z`, `space` |
| `trails` | `enabled`, `ratio`, `lifetime`, `minVertexDistance`, `worldSpace`, `dieWithParticles` |
| `rotationOverLifetime`, `collision` | `enabled` only |

Value syntax:

| Kind | Syntax | Example |
|---|---|---|
| Constant | number | `value=0.6` |
| Random between two constants | `min,max` | `value=0.4,0.9` |
| Gradient | `hex@time` entries separated by `;`, at most 8 keys | `value=#FFD27F@0;#FF3B00@0.6;#000000@1` |
| Curve | `time:value` entries separated by `;` | `value=0:0.2;0.5:1;1:0` |
| Enum | Unity enum member name | `value=World` |

Anything beyond this surface (sub-emitters, bursts, texture sheets, lights) needs `execute_code` or manual authoring.

```text
batch(commands="""
particle action=create path=/Effects name=Impact preset=sparks
particle action=set path=/Effects/Impact module=main prop=startLifetime value=0.3,0.7
particle action=set path=/Effects/Impact module=colorOverLifetime prop=gradient value=#FFF2B0@0;#FF7A00@0.5;#00000000@1
particle action=get path=/Effects/Impact module=main
""", on_error="stop", atomic=True)
```

## `vfx_intent`

- Signature: `vfx_intent(target, intent, kind="auto"|"particle", dry_run=False)`. There is no `instruction` argument.
- The target must already hold the Particle System the generated commands configure.
- Five exact preset names skip the LLM: `fire_explosion`, `magic_burst`, `dissolve`, `glow_outline`, `smoke_trail`.
  Any other text needs configured sampling.
- Shader and material intent is not implemented by this tool.

## `material_audit`

`action`: `summary` (default), `materials`, `textures`, `duplicates`, `compression`, `recommendations`. `platform` is
`Android`, `iOS`, `Standalone` or `Default` for the compression check. The duplicate fingerprint ignores textures, so
review each group before consolidating.

## Verification

1. Read the real property names, then decide shared vs instance.
2. Apply one focused change and read the same material, slot or module again.
3. Check shader compiler messages and the console delta.
4. Screenshot only for appearance; exact assignments are proven by data.
5. Stop or delete temporary preview effects.

## Pitfalls

- Material and shader asset writes are **not** covered by Unity Undo rollback. After a stopped batch, inspect the
  partial assets.
- Editing `target="shared"` on a renderer when a per-object change was intended recolours every user of that asset.
- Treating `set_fields` success as proof: unknown names were skipped.
- Dense effects need an overdraw and material-cost check (`render_analyze(action="overdraw")`) before acceptance.
