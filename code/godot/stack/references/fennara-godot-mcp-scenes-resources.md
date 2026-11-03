# Fennara Godot MCP — Scenes and Resources

> See also: [Code checks](fennara-godot-mcp-scripts-diagnostics.md), [Imports](fennara-godot-mcp-assets-import.md), [Visual evidence](fennara-godot-mcp-visual-animation.md).

## Task to tool

| Task | MCP path | CLI/repository role |
| --- | --- | --- |
| Inspect saved hierarchy, scripts, and scene instances | `get_scene_tree` | Search related files with `rg`; no Fennara CLI equivalent |
| Read changed node properties and resource summaries | `get_node_properties` | Read source when defaults or script meaning matter |
| Discover native properties, methods, signals, enums, or inheritance | `get_class_info` | Consult version-matched official Godot docs if needed |
| Create/edit an authored scene, its nodes, UI, materials, or assigned resources | `run_scene_edit_script`, `mode: "edit"` | Godot owns serialization; do not replace it with text surgery |
| Query a resource graph procedurally without saving | `run_scene_edit_script`, `mode: "inspect"` | Keep the probe side-effect free |
| Change a source asset's import globally | `run_asset_import_script` | Read the import reference |
| Confirm persistence and visual correctness | Saved node/resource readback, validation, relevant screenshot | Review the file diff |

## Inspect before authoring

Example `get_scene_tree` arguments:

```json
{"scene_paths":["res://scenes/workshop.tscn"]}
```

Then `get_node_properties` with exact paths from that tree:

```json
{
  "targets": [
    {"scene_path":"res://scenes/workshop.tscn","node_path":"."},
    {"scene_path":"res://scenes/workshop.tscn","node_path":"Hud/Title"}
  ]
}
```

`.` means the root; child paths exclude the root's name. Properties show differences from class defaults, not every possible property. A hierarchy is not a complete mesh/material/skeleton report.

Before editing native classes, use `get_class_info`, for example:

```json
{"class_names":["Node2D","Label"]}
```

Snapshot limits: five scenes per tree call, five property targets, and three classes. Split larger requests rather than expanding one enormous procedural traversal.

## Scene-worker contract

Pass `scene_path`, explicit `mode`, and exactly one of `code` or `script_path`. The target must be an authored `.tscn` or `.scn`. Imported `.glb`/`.gltf` targets belong to the import tool.

Editor workers are `@tool` scripts extending `RefCounted` with `func run(ctx) -> void`. Use explicit local types, bounded output, `ctx.log(String)`, and `ctx.error(String)`. Use the returned worker path for patch-and-rerun.

| Helper | Use |
| --- | --- |
| `ctx.get_scene_root()` | Existing detached root, or null for a new scene |
| `ctx.set_scene_root(root)` | Register a **new** root once, before owning children |
| `ctx.own(node)` | Persist a raw newly created node/subtree |
| `ctx.instance_scene(parent, path, name)` | Preserve PackedScene instance ownership |
| `ctx.mark_modified()` | Request saving intentional scene changes |
| `ctx.remove_node(path)` / `ctx.clear_children(node)` | Deliberate scoped structural edits in edit mode |

For inspect mode, read values and log; never call mutation helpers, `ResourceSaver`, editor/OS operations, or filesystem writes. The context guard is not an operating-system sandbox.

A detached graph is not a running game. Avoid assumptions about `get_tree()`, `get_path()`, timers, gameplay callbacks, or global transforms. Use local properties or a real runtime session. Before blaming a placeholder-instance error, confirm the native class and that the requested method actually exists.

## Example: create a small authored scene

Use `scene_path: "res://scenes/workshop_badge.tscn"` and `mode: "edit"` after confirming the output path is new:

```gdscript
@tool
extends RefCounted

func run(ctx) -> void:
    if ctx.get_scene_exists():
        ctx.error("Output scene already exists; inspect it before editing.")
        return
    var root: Node2D = Node2D.new()
    root.name = "WorkshopBadge"
    ctx.set_scene_root(root)

    var caption: Label = Label.new()
    caption.name = "Caption"
    caption.text = "Workshop"
    root.add_child(caption)
    ctx.own(caption)
    ctx.mark_modified()
    ctx.log("Created WorkshopBadge with one owned Caption.")
```

Read back the saved tree/properties and inspect a screenshot for layout. Configure real UI layout through appropriate Control/container APIs after inspecting their classes; do not infer anchors or sizing from this minimal creation example.

## Example: instance an existing component

Use only after the component path and destination were inspected:

```gdscript
@tool
extends RefCounted

func run(ctx) -> void:
    var root: Node = ctx.get_scene_root()
    if root == null or root.get_node_or_null("StatusCard") != null:
        ctx.error("Need an existing root without a StatusCard child.")
        return
    var card: Node = ctx.instance_scene(
        root, "res://ui/status_card.tscn", "StatusCard"
    )
    if card == null:
        return
    ctx.mark_modified()
    ctx.log("Added one StatusCard PackedScene instance.")
```

Do not call `ctx.own` on that instance or its internals. A recursive owner pass must stop at every subscene boundary; skipping only the instance root and then owning its children still corrupts instance structure.

For inherited scenes, prefer narrow existing-node/property/resource overrides. Do not replace the root or rebuild inherited subtrees. If the inheritance guard rejects the save, the original target is restored; a returned path is not evidence that the edit applied.

## Scene-owned versus standalone resources

For a local material/style/animation change, inspect how the resource is shared. Duplicate an assigned resource only when the requested change should be local, assign the duplicate to the intended owner, mutate it, and mark that scene modified. A global import change belongs to the import tool.

Standalone Godot resources may be created through Godot APIs using a small safe authored scene as worker context. Example in **edit mode**, after inspecting `StandardMaterial3D` and confirming the output path is new:

```gdscript
@tool
extends RefCounted

func run(ctx) -> void:
    var output_path: String = "res://materials/workshop_accent.tres"
    if FileAccess.file_exists(output_path):
        ctx.error("Material already exists; inspect before replacement.")
        return
    var material: StandardMaterial3D = StandardMaterial3D.new()
    material.resource_name = "WorkshopAccent"
    material.albedo_color = Color(0.18, 0.62, 0.85, 1.0)
    var result: Error = ResourceSaver.save(material, output_path)
    if result != OK:
        ctx.error("Material save failed: %s" % error_string(result))
        return
    ctx.log("Saved standalone material at %s" % output_path)
```

Create the destination directory through ordinary project file tools first if absent. This worker intentionally does not mark or save its context scene. Verify the standalone resource separately through a fresh targeted Godot load. Scene-save rollback is not a transaction for arbitrary external side effects performed by worker code.

## Read the receipt

Inspect `script_diagnostics`, `runtime_errors`, `modified`, `scene_created`, `scene_saved`, `script_path`, validation, and inherited-root preservation fields when present.

A successful read-only probe with `modified=false` and `scene_saved=false` is normal. A failed scene edit does not create/update its target scene; only its temporary script may remain. Patch that script and narrow the edit. Check the final saved state, not just in-memory before/after logs.

## Sources

See [source inventory](fennara-godot-mcp-sources.md): `tools.md`, generated guidelines, and schemas for scene editing, hierarchy, properties, and class information.
