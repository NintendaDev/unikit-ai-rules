# GDAI Godot MCP — Scenes and nodes

> See also: [editor scripting and persistence](gdai-godot-mcp-editor-scripting.md).

---

| Intended edit | Tool choice |
|---|---|
| Select/create a scene file | `open_scene` / `create_scene` |
| Instance an existing scene | `add_scene` |
| Add an ordinary node | `add_node` |
| Copy or reparent a node | `duplicate_node` / `move_node` |
| Change an existing property | `update_property` |
| Remove content | `delete_node` / `delete_scene` after inspecting dependents |

## Author against the current scene

- Establish the active scene immediately before structural edits. Creation/opening may change selection; inspect the result before continuing.
- Choose root and node classes for the project's actual 2D/3D/UI domain. Preserve reusable child-scene instances unless the task requires editing their source.
- After reparenting, inspect the resulting path and transform. Do not assume whether the wrapper preserves global transform or rewrites NodePath references.
- Check duplication results for generated names, copied scripts, shared resources and unintended signal connections.
- The documented node-deletion tool excludes the scene root. Replacing a root requires another verified workflow; do not emulate it by deleting the whole scene file.

## Worked case: place an enemy in a world

```text
open_scene: res://scenes/world.tscn
  → get_scene_tree + get_scene_file_content
  → add_scene: instance the existing enemy scene under the discovered Actors parent
  → inspect the returned/actual instance path
  → update_property: set its placement using the live value encoding
  → read back hierarchy, transform and serialized scene reference
  → save the intended world scene and verify its saved content
```

This changes the placement. Open the enemy's own scene when changing the reusable archetype. Check which level owns a property override before editing nested children.

## Save and ownership

The public catalog lists no standalone save-scene MCP tool and does not state an autosave contract. Discover installed additions first. Otherwise use the verified editor save workflow; do not invent a `save_scene` MCP tool from the Godot API name.

When code adds a node to an edited scene, parenting and ownership are separate. Set ownership for newly authored local descendants so they serialize. Do not recursively overwrite ownership of existing instanced scenes. Godot's `PackedScene` packs owned nodes; a live child without the intended owner can disappear after reopening.

**Persistence acceptance:** inspect the saved `.tscn` or an equivalent disk read, then reopen/reload the intended scene after saving if needed to test reconstruction. `get_scene_file_content` is a candidate inspection tool; confirm whether the installed implementation returns disk content or an in-memory representation. A cached resource read alone does not establish persistence.

## Destructive-edit check

Before removing a node or scene, inspect child content, known scene instances, script NodePaths and connections that refer to it. Use project text/reference search if available; filename search alone cannot find these references. Apply only the deletion authorized by the task, then check missing-resource and missing-node errors.

Sources: [dedicated tools](https://gdaimcp.com/docs/supported-tools), [Godot ownership](https://docs.godotengine.org/en/stable/classes/class_packedscene.html), [editor mutation semantics](https://docs.godotengine.org/en/stable/tutorials/plugins/running_code_in_the_editor.html).
