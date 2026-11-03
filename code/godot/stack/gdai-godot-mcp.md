---
version: 1.0.0
---

# GDAI Godot MCP

> **Scope**: Operating the Godot Editor through GDAI MCP: selecting task-specific tools, inspecting projects, editing scenes and scripts, and checking saved and running results.
> **Load when**: using GDAI MCP to inspect a Godot project, build or modify scenes and resources, author GDScript, arrange Godot UI, diagnose errors, verify gameplay, or recover a GDAI connection.
> **References**: `.unikit/memory/code/stack/references/gdai-godot-mcp-connection-configuration.md` (connection), `.unikit/memory/code/stack/references/gdai-godot-mcp-project-navigation.md` (discovery), `.unikit/memory/code/stack/references/gdai-godot-mcp-scenes-nodes.md` (structure), `.unikit/memory/code/stack/references/gdai-godot-mcp-resources-physics.md` (resources), `.unikit/memory/code/stack/references/gdai-godot-mcp-ui-layout.md` (UI), `.unikit/memory/code/stack/references/gdai-godot-mcp-scripts-debugging.md` (scripting), `.unikit/memory/code/stack/references/gdai-godot-mcp-runtime-verification.md` (verification), `.unikit/memory/code/stack/references/gdai-godot-mcp-editor-scripting.md` (automation), `.unikit/memory/code/stack/references/gdai-godot-mcp-sources.md` (provenance).

---

## Identity and evidence

- These rules apply to **GDAI MCP for Godot**. Keep its tool schemas separate from other Godot MCP implementations and other engines. Storing this package in a knowledge base does not change the host project's engine or bridge configuration.
- Reviewed on **2026-11-03**. The website pages display an update date of **2026-09-07**. This is a documentation snapshot; no GDAI server was connected for live validation.
- Prefer the installed tool schema for callable names, arguments, defaults and return values; confirm outcomes against editor and saved state. Use matching-version Godot documentation for engine APIs.
- Public GDAI pages describe capabilities without complete payload schemas. Never turn the recipes below into calls by inventing argument names, enum values, entry-point functions or response fields.
- Examples are original. Arrow sequences describe **tool order and intent**, not an SDK or executable payload. GDScript blocks illustrate engine code; adapt editor execution wrappers to the installed contract.

## Operating loop

1. **Orient.** Discover the available GDAI tools. Read `get_project_info`; identify the project, Godot version, intended scene and running state. Follow any applicable project bridge routes.
2. **Load narrowly.** Open only the reference matching the next operation in the table below. Add another reference when crossing into its area. Do not load all references or the source inventory at startup.
3. **Inspect.** Resolve exact file and node paths; read the affected scene, script or resource before mutation. The selected editor scene is mutable session state, not a permanent target binding.
4. **Change.** Prefer a dedicated tool. Use editor GDScript for a verified capability gap; load its reference first. Sequence dependent operations, and inspect partial results before retrying a timeout.
5. **Persist.** Determine whether the operation actually saves. Save the intended scene/resource through a discovered tool or verified editor API, then inspect the serialized result. A node visible in the editor is insufficient evidence of persistence.
6. **Verify.** Check relevant errors; inspect screenshots for visual changes; reproduce the affected interaction for behavior changes. Report separately what was saved, what ran, and what remains unverified.

## Task lookup workflow

Reference filenames below are relative to `.unikit/memory/code/stack/references/`.

| Task being performed | Open only this reference first |
|---|---|
| Connect, select ports, recover missing tools, update the plugin, prepare export exclusions | [gdai-godot-mcp-connection-configuration.md](references/gdai-godot-mcp-connection-configuration.md) |
| Find assets, resolve UIDs, locate the player, explain a project or scene | [gdai-godot-mcp-project-navigation.md](references/gdai-godot-mcp-project-navigation.md) |
| Create/open a scene, instance a reusable scene, add/move/duplicate/delete nodes | [gdai-godot-mcp-scenes-nodes.md](references/gdai-godot-mcp-scenes-nodes.md) |
| Assign a texture/material/shape, add collisions, resolve unintended shared-resource edits | [gdai-godot-mcp-resources-physics.md](references/gdai-godot-mcp-resources-physics.md) |
| Build a menu or HUD, fix anchors, responsive layout, or blocked UI input | [gdai-godot-mcp-ui-layout.md](references/gdai-godot-mcp-ui-layout.md) |
| Implement a feature, patch GDScript, fix errors, add types or documentation | [gdai-godot-mcp-scripts-debugging.md](references/gdai-godot-mcp-scripts-debugging.md) |
| Run a scene/project, exercise gameplay, inspect game screenshots, validate a small prototype | [gdai-godot-mcp-runtime-verification.md](references/gdai-godot-mcp-runtime-verification.md) |
| Execute editor code, inspect unsupported properties, wire signals, ensure ownership/save behavior | [gdai-godot-mcp-editor-scripting.md](references/gdai-godot-mcp-editor-scripting.md) |
| Audit a claim, refresh this package, inspect the complete tool-name inventory | [gdai-godot-mcp-sources.md](references/gdai-godot-mcp-sources.md) |

For a compound task, load in stages. Example: adding a player starts with scene structure, adds resources/physics for collision, scripting for movement, and runtime verification for the acceptance check. Each topic owns its detailed recipe; this file owns routing and the common operating loop.

## Boundaries and failure rules

- Keep `res://` paths, `uid://` identifiers, node paths and host filesystem paths distinct. Re-resolve node paths after hierarchy changes.
- A missing capability may reflect version or configuration differences. Inspect discovery/configuration before substituting a similarly named tool from another server.
- Do not assume automatic saving, Undo support, transactional batches, runtime-tree access, input simulation, a test runner or an export runner. Discover each capability independently.
- `execute_editor_script` runs in the editor. It does not imply execution in the running game's process.
- Inspect a timed-out mutation before retrying; creation and replacement may already have occurred. Preserve error evidence before clearing logs.
- Keep edits bounded to the requested files/nodes. Inspect references before deletion and existing content before replacement. Routine authorized edits need no extra approval gate.

## Source Map

| Source | Used for |
|---|---|
| [Supported tools](https://gdaimcp.com/docs/supported-tools) | Tool identities and dedicated-tool routing |
| [Examples](https://gdaimcp.com/docs/examples) | Scenario coverage: explanation, features, collisions, debugging, typing, documentation and prototypes |
| [Introduction](https://gdaimcp.com/docs), [installation](https://gdaimcp.com/docs/installation), [configuration](https://gdaimcp.com/docs/configuration), [common issues](https://gdaimcp.com/docs/common-issues), [update guide](https://gdaimcp.com/docs/update-guide), [exporting](https://gdaimcp.com/docs/exporting) | Environment setup and lifecycle |
| [Official repository](https://github.com/3ddelano/gdai-mcp-plugin-godot), Context7 `/3ddelano/gdai-mcp-plugin-godot` | Cross-checks and documentation disagreements; no inferred payload contracts |
| [Godot editor scripting](https://docs.godotengine.org/en/stable/tutorials/plugins/running_code_in_the_editor.html), [EditorInterface](https://docs.godotengine.org/en/stable/classes/class_editorinterface.html), [PackedScene](https://docs.godotengine.org/en/stable/classes/class_packedscene.html), [Resource](https://docs.godotengine.org/en/stable/classes/class_resource.html), [Control](https://docs.godotengine.org/en/stable/classes/class_control.html), [containers](https://docs.godotengine.org/en/stable/tutorials/ui/gui_containers.html), [physics](https://docs.godotengine.org/en/stable/tutorials/physics/physics_introduction.html), [typing](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/static_typing.html), [comments](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_documentation_comments.html), [Input](https://docs.godotengine.org/en/stable/classes/class_input.html) | Engine semantics behind the original task recipes |

The [source inventory](references/gdai-godot-mcp-sources.md) records individual source roles, limitations and maintenance checks. Workflow choices and acceptance checks are authored guidance, not guarantees made by the plugin documentation.
