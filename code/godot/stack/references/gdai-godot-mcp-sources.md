# GDAI Godot MCP — Sources, coverage and maintenance

---

| Maintenance question | Where to check |
|---|---|
| Is a name/argument callable now? | Installed MCP discovery and tool schema |
| Is a feature publicly documented? | Official tool/configuration pages below |
| Did a mutation work and persist? | Observed editor state and serialized files |
| Is an engine API valid? | Documentation matching the connected Godot version |
| Did an example run here? | No: this package is researched guidance, not a live-server test report |

Reviewed **2026-11-03**. GDAI website pages displayed **2026-09-07** as their update date. No GDAI tools were exposed in this authoring session; no project connection, plugin installation or Godot scene was changed.

## Source inventory

| Source | Type / scope | Signal and use | Gaps / limits |
|---|---|---|---|
| https://gdaimcp.com/docs/supported-tools | Official catalog | Tool identities, routing, resource-allocation distinction | No full payload schemas, autosave or transaction contract |
| https://gdaimcp.com/docs/examples | Official scenarios | Explanation, debugging, features, collision, types, comments, voxel/driving prototypes | Prompts demonstrate intent, not validated call sequences; embedded videos were not analyzed |
| https://gdaimcp.com/docs | Official introduction | Product identity and stated engine baseline | Says Godot 4.2+; README differs |
| https://gdaimcp.com/docs/installation | Official setup | Plugin/client connection, reload settings, HTTP transport | Client/version dependent; no local setup attempted |
| https://gdaimcp.com/docs/configuration | Official configuration | Port overrides, disabled tools, runtime-tool mention | Mentions input simulation without a schema |
| https://gdaimcp.com/docs/common-issues | Official troubleshooting | Executable lookup, missing tools, client/path failures | Some path advice needs comparison with newer installation instructions |
| https://gdaimcp.com/docs/update-guide | Official maintenance | Package replacement and displayed-version verification | No compatibility matrix or migration guarantees |
| https://gdaimcp.com/docs/exporting | Official export setup | Add-on exclusion filter | Does not provide an MCP build/export API |
| https://github.com/3ddelano/gdai-mcp-plugin-godot | Official repository / README | Product cross-check and legacy example names | Public contents do not establish current server payload contracts |
| Context7 `/3ddelano/gdai-mcp-plugin-godot` | Indexed documentation | Queried usage, best practices, lookup and mistakes | Mostly stub/README material; generated repository-history claims were not adopted |
| https://docs.godotengine.org/en/stable/tutorials/plugins/running_code_in_the_editor.html | Official engine guide | EditorScript context, ownership, dirty marking and Undo limitations | Verify against connected engine version and GDAI wrapper |
| https://docs.godotengine.org/en/stable/classes/class_editorinterface.html | Official engine API | Edited-scene selection and save APIs | Stable docs may differ from older Godot |
| https://docs.godotengine.org/en/stable/classes/class_packedscene.html | Official engine API | Owned-node serialization and checked packing/saving | Does not describe plugin autosave |
| https://docs.godotengine.org/en/stable/classes/class_resource.html | Official engine API | Sharing, caching and duplication semantics | Duplication behavior must be version checked |
| https://docs.godotengine.org/en/stable/classes/class_control.html | Official engine API | Anchors, offsets, focus and mouse filtering | Does not define MCP property-value encoding |
| https://docs.godotengine.org/en/stable/tutorials/ui/gui_containers.html | Official engine guide | Container-managed child layout and size flags | No GDAI viewport/resize contract |
| https://docs.godotengine.org/en/stable/tutorials/physics/physics_introduction.html | Official engine guide | Body/area roles and collision shape composition | Runtime validation still required |
| https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/static_typing.html | Official language guide | Type annotations and dynamic-boundary checks | Newer syntax must not be assumed on old engines |
| https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_documentation_comments.html | Official language guide | Documentation comment syntax and placement | No plugin-specific transformation guarantee |
| https://docs.godotengine.org/en/stable/classes/class_input.html | Official engine API | Action state versus dispatched events | Does not establish cross-process input injection |

All explanatory prose, recipes and snippets were synthesized for this package. Operational safeguards and acceptance criteria are authored recommendations. They are not quotations or claims that the vendor guarantees those behaviors.

## Catalog coverage

This inventory records the **31 names on the reviewed Supported Tools page**. It is a maintenance lookup, not a startup loading list. Each name routes to a task reference; arguments always come from the installed schema.

| Group | Names | Owning task reference |
|---|---|---|
| Project, 5 | `get_project_info`, `get_filesystem_tree`, `search_files`, `uid_to_project_path`, `project_path_to_uid` | project-navigation |
| Scene, 8 | `get_scene_tree`, `get_scene_file_content`, `create_scene`, `open_scene`, `delete_scene`, `add_scene`, `play_scene`, `stop_running_scene` | scenes-nodes; runtime-verification for launching |
| Node, 8 | `add_node`, `delete_node`, `duplicate_node`, `move_node`, `update_property`, `add_resource`, `set_anchor_preset`, `set_anchor_values` | scenes-nodes; resources-physics; ui-layout |
| Script, 5 | `get_open_scripts`, `view_script`, `create_script`, `attach_script`, `edit_file` | scripts-debugging |
| Editor, 5 | `get_godot_errors`, `get_editor_screenshot`, `get_running_scene_screenshot`, `execute_editor_script`, `clear_output_logs` | scripts-debugging; runtime-verification; editor-scripting |

The suffixes in the last column refer to sibling `gdai-godot-mcp-<suffix>.md` files.

## Known disagreements and unknowns

| Issue | Decision for these rules |
|---|---|
| Website introduction says Godot 4.2+, README says 4.1+ | Do not promise 4.1 compatibility; inspect the installed plugin/engine pair |
| README demonstrates `get_open_script` and `get_open_script_errors` | Prefer the catalog's `get_open_scripts` / `get_godot_errors` unless live discovery explicitly exposes the older names |
| Configuration mentions `simulate_input`, catalog omits it | Conditional capability only; no invented payload |
| Common Issues suggests avoiding spaces; HTTP setup accepts quoted paths | Verify launch argument handling before relocating anything |
| EditorScript's conventional `_run()` versus unknown MCP wrapper | Label engine examples explicitly; inspect the wrapper |
| Dedicated-tool save, Undo, resource encoding, response shape and failure atomicity | Not established by these sources; inspect implementation/schema and test readback when needed |
| Runtime-tree querying, test runner, export runner, viewport control | No contract established here; absence from this snapshot does not prove absence in a later release |

## Update procedure

1. Record reviewed date and installed plugin/Godot versions when a live check is available.
2. Compare discovery with this inventory; inspect schemas only for affected tasks.
3. Refresh the owning thematic reference. Keep filenames stable; do not create a duplicate topic or a second full catalog.
4. Check parent routing, links, case coverage and persistence guidance. Keep only the main rule in `RULES_INDEX.md`.
5. Distinguish documentation updates from live reproductions. Record observed conditions before promoting an unverified recipe to a tested claim.
