# GDAI Godot MCP — Editor scripting and persistence

---

| Capability gap | Bounded fallback |
|---|---|
| Inspect properties missing from other responses | Read the exact target and relevant property metadata |
| Wire a signal without a discovered dedicated tool | Inspect existing connections, create the intended connection, verify persistence |
| Author a nested resource structure | Create typed engine resources, assign and save the intended owner |
| Save after an editor mutation | Verified current-scene save API and serialized readback |
| Repeat a small deterministic edit | Inspect existing targets, create only missing content, read back results |

## Invocation contract first

`execute_editor_script` is documented as arbitrary GDScript in the editor. Public docs do not specify its wrapper, injected variables, entry-point function, return encoding, await support or automatic Undo/save behavior. Inspect the installed schema and examples before submitting code. Do not assume that `_run()`, `run()` or `_execute()` is the required MCP entry point.

Keep scripts short and scoped. Check the selected scene path and target types before mutation. Do not search the whole editor tree and modify similarly named editor/plugin controls. Read property metadata or matching-version engine docs before assigning values of uncertain types.

## Original engine example: ensure a local marker and save

This is a **normal Godot 4.2+ EditorScript example**. Its `_run()` belongs to `EditorScript`; it is not a claim about GDAI's execution wrapper. Adapt only after learning that wrapper and confirming the engine version. The example assumes the existing target scene is `res://scenes/world.tscn`.

```gdscript
@tool
extends EditorScript

func _run() -> void:
    var root := EditorInterface.get_edited_scene_root()
    if root == null or root.scene_file_path != "res://scenes/world.tscn":
        push_error("Select the intended saved world scene first.")
        return

    var marker := root.get_node_or_null("ExitMarker")
    if marker != null and not marker is Marker3D:
        push_error("ExitMarker exists with an incompatible type.")
        return
    if marker == null:
        marker = Marker3D.new()
        marker.name = "ExitMarker"
        root.add_child(marker)
        marker.owner = root

    var exit_marker := marker as Marker3D
    exit_marker.position = Vector3(4.0, 0.0, 8.0)
    EditorInterface.mark_scene_as_unsaved()
    var save_error := EditorInterface.save_scene()
    if save_error != OK:
        push_error("World scene could not be saved: %s" % save_error)
        return
    print("ExitMarker updated in ", root.scene_file_path)
```

The script checks the target, avoids duplicate creation on retry, assigns ownership to a newly created local node and inspects the save result. It does not provide a transaction or guaranteed Undo. Preserve pre-existing unsaved work before editor scripts that could make recovery necessary; do not silently save unrelated user edits.

## Persistence and resource boundaries

- Godot editor scripts do not automatically mark changes as unsaved. Explicitly mark intended mutations or use an appropriate Undo manager workflow.
- Save only the intended scene, not every open scene. Newly created scenes need an intended path and the corresponding save-as workflow.
- A scene save does not prove every changed external `.tres` or script was saved. Track those resources separately; check relevant save error codes.
- When building a separate `PackedScene`, check `pack()` and `ResourceSaver.save()` results and ownership. Do not blindly repack a currently edited inherited/instanced scene as a substitute for editor saving.
- Read serialized output and diagnostics after execution. A log line confirms the code reached that point, not that all promised changes persisted.

Source: [execution tool](https://gdaimcp.com/docs/supported-tools), [Godot editor-script semantics](https://docs.godotengine.org/en/stable/tutorials/plugins/running_code_in_the_editor.html), [EditorInterface](https://docs.godotengine.org/en/stable/classes/class_editorinterface.html), [PackedScene](https://docs.godotengine.org/en/stable/classes/class_packedscene.html). Retry and scope checks are authored guidance.
