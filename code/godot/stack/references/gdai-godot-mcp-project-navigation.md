# GDAI Godot MCP — Project navigation and explanation

---

| Question | Tool route |
|---|---|
| Which project is connected? | `get_project_info` |
| Where are candidate files? | Filtered `get_filesystem_tree`, then `search_files` |
| What file does a UID identify? | `uid_to_project_path`; reverse with `project_path_to_uid` |
| What exists in the selected scene? | `get_scene_tree`, then `get_scene_file_content` |
| What behavior does a script implement? | `view_script`; `get_open_scripts` only when open-editor context matters |

## Find the actual target

1. Establish project identity and main-scene configuration from returned information; inspect `project.godot` separately if the needed detail is absent.
2. Narrow file discovery by the filters actually exposed in the schema. A fuzzy filename match is a candidate, not proof that the scene uses it. Filesystem search is not a code-reference search.
3. Open the exact candidate scene and read its hierarchy and serialization. Follow attached scripts and referenced child scenes relevant to the question.
4. Read code that establishes behavior, exported settings that override defaults, and the caller or signal connection that triggers it.

Keep identifiers distinct:

| Identifier | Example | Use |
|---|---|---|
| Project resource path | `res://actors/pilot.tscn` | Scene/resource selection |
| Resource UID | `uid://...` | Resolve with the conversion tools; never invent one |
| Node path | `Actors/Pilot/Camera3D` | Target inside the inspected scene |
| Host path | `D:/Godot/MyGame/project.godot` | External file/bridge access |

The UID example intentionally omits a value: a valid identifier must come from the project. Do not assume a UID or node path survives file recreation or hierarchy changes unchanged.

## Worked case: explain the player

Tool-order recipe, with arguments supplied from live schemas:

```text
get_project_info
  → search_files: locate player scene and script candidates
  → open_scene: select the actual player scene
  → get_scene_tree + get_scene_file_content: establish composition
  → view_script: read the attached controller and relevant dependencies
  → explain: input → movement → collision → presentation
```

An explanation request stays read-only. Do not repair code, start gameplay or rearrange scenes merely to describe them. State whether a behavior is established by source, serialized configuration, or an observed run. Static evidence can explain intended behavior without proving its runtime outcome.

Example conclusion format: “The controller reads action `move_left`; this scene assigns its collision shape; the world instances this actor at the spawn marker.” Include the actual paths found. If the action binding or caller was not inspected, name that gap instead of filling it from convention.

## Missing inspection capability

The public catalog has no dedicated general property-reader contract. Inspect serialization or, if necessary, a bounded read through [editor scripting](gdai-godot-mcp-editor-scripting.md). Never manufacture a `get_property` MCP call from an engine method with a similar name.

Sources: [tool identities](https://gdaimcp.com/docs/supported-tools), [explanation scenario](https://gdaimcp.com/docs/examples). The narrowing strategy and evidence format are authored guidance.
