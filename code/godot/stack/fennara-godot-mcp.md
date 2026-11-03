---
version: 1.0.0
---

# Fennara Godot MCP

> **Scope**: Operating Fennara's Godot connection, choosing the correct MCP, CLI, or repository workflow, and verifying scene, code, import, visual, and runtime changes.
> **Load when**: using Fennara with a Godot project, selecting a Fennara tool, connecting or repairing its local components, automating Godot inspection or authoring, or collecting Godot validation evidence.
> **References**: `.unikit/memory/code/stack/references/fennara-godot-mcp-connection-cli.md` (connection), `.unikit/memory/code/stack/references/fennara-godot-mcp-maintenance-export.md` (maintenance), `.unikit/memory/code/stack/references/fennara-godot-mcp-scenes-resources.md` (authoring), `.unikit/memory/code/stack/references/fennara-godot-mcp-scripts-diagnostics.md` (code), `.unikit/memory/code/stack/references/fennara-godot-mcp-assets-import.md` (imports), `.unikit/memory/code/stack/references/fennara-godot-mcp-settings-input.md` (settings), `.unikit/memory/code/stack/references/fennara-godot-mcp-visual-animation.md` (visuals), `.unikit/memory/code/stack/references/fennara-godot-mcp-runtime-playtesting.md` (runtime), `.unikit/memory/code/stack/references/fennara-godot-mcp-multi-project-worktrees.md` (isolation), `.unikit/memory/code/stack/references/fennara-godot-mcp-operations-troubleshooting.md` (recovery), `.unikit/memory/code/stack/references/fennara-godot-mcp-built-in-chat.md` (chat), `.unikit/memory/code/stack/references/fennara-godot-mcp-sources.md` (provenance).

---

## Applicability and contract

Apply this rule to Fennara in **Godot** projects. Its presence in a knowledge base does not install Fennara, establish a connection, or make Godot operations applicable to another engine.

This rule was researched against repository version **0.4.3**, commit `0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6`. Treat the installed tool schemas and generated `addons/fennara/ai/guidelines.md` as the current tool contract. Recheck schemas when versions differ; do not invent arguments from this snapshot.

Fennara provides a local feedback chain: MCP client → stdio MCP process → shared per-user daemon → Godot addon. The optional built-in chat uses the same Godot bridge with separate model settings.

## Choose the surface

| Need | Use |
| --- | --- |
| Understand or change engine state, serialize resources, inspect imports, render, validate, or observe gameplay | Fennara MCP |
| Install, configure an MCP app, update, diagnose the installation, recover, or prepare an addon-free export | `fennara` CLI |
| Read source, search files, inspect diffs, edit ordinary text, or run existing repository automation | The agent's repository and shell tools |
| Run a native export or existing headless test fixture | Godot CLI or the project's runner, explicitly identified as such |

The documented `fennara` CLI has **no scene-edit, arbitrary MCP-call, screenshot, playtest, or test-runner commands**. `fennara-mcp` is a stdio protocol server, not a one-command CLI for calling its tools. Use the thematic reference's CLI alternative only within its stated limits.

External MCP exposes `fennara_status` plus the Godot tools routed below. Built-in-chat `read_file` and `exec_command` are not external Fennara MCP tools; use the external client's own equivalents. Do not assume that every JSON file in upstream `local/schemas/tools/` is externally advertised.

## Working rules

1. **Establish the target.** Check `fennara_status` when connection, project, renderer, tool availability, or import readiness is uncertain. Before concurrent work, verify `bound` routing, the expected canonical Project Root, and its connected editor. Wait through scanning/importing before asset operations.
2. **Inspect the relevant state.** Use the saved scene tree, exact node properties, source, and native class API. Reuse reliable current evidence. Read the target class with `get_class_info` before scene/resource authoring; query only the classes needed.
3. **Use the correct context.** Authored scene workers, imported-asset workers, screenshot workers, and managed runtime probes have different APIs and lifecycles. Read their reference before writing a worker.
4. **Let Godot serialize.** Use structured tools for scenes, resources, project settings, and imports. Do not hand-edit `.tscn`, `.tres`, `.res`, `.import`, or `project.godot` as a substitute for these operations.
5. **Keep edits bounded.** Name persistent nodes explicitly, preserve PackedScene ownership and inheritance, and inspect only relevant subtrees. Do not modify Fennara infrastructure unless repairing, replacing, or removing it is requested.
6. **Read the result.** Inspect diagnostics, runtime errors, save flags, partial results, recovery status, and artifact paths. An accepted request is not proof of a saved scene, correct framing, or successful gameplay.
7. **Verify the claim.** Use diagnostics for code; scene validation and saved-state inspection for authoring; actual images for appearance; observed state and logs for behavior. Do not repeat successful checks that already cover the final state.
8. **Recover deliberately.** Patch a failed worker's returned `script_path` and rerun it. After a timeout, recover the saved result before repeating a possible mutation. Stop identical retries after the same failure occurs twice; investigate a narrower cause.

Useful workers belong under `res://.fennara/`: one-off editor workers in `tmp/editor_scripts/`, reusable screenshot workers in `scripts/screenshots/`, and runtime probes in `scripts/runtime/`. Check for existing useful workers first; keep these separate from product code.

## Task Lookup Workflow

Load **this file first, then only the matching reference**. Add another reference only when the task actually crosses its boundary. Do not preload every file or the provenance inventory.

| Task or uncertainty | Open |
| --- | --- |
| Install Fennara, configure stdio MCP, choose a launcher, or verify a first connection | [Connection and CLI](references/fennara-godot-mcp-connection-cli.md) |
| Update/pin components, recover an interrupted update, or export without the addon | [Maintenance and export](references/fennara-godot-mcp-maintenance-export.md) |
| Inspect saved scenes, create nodes/subscenes, edit materials, UI, or serialized resources | [Scenes and resources](references/fennara-godot-mcp-scenes-resources.md) |
| Edit GDScript/C#/shaders, understand diagnostics, or choose validation scope | [Scripts and diagnostics](references/fennara-godot-mcp-scripts-diagnostics.md) |
| Inspect imported models/textures/audio/fonts or change import options globally | [Asset imports](references/fennara-godot-mcp-assets-import.md) |
| Configure autoloads, startup/display/rendering settings, or InputMap | [Settings and input](references/fennara-godot-mcp-settings-input.md) |
| Check UI, frame a scene/asset, compare views, or build an animation storyboard | [Visuals and animation](references/fennara-godot-mcp-visual-animation.md) |
| Drive input, reproduce behavior, inspect physics, or gather managed runtime evidence | [Runtime playtesting](references/fennara-godot-mcp-runtime-playtesting.md) |
| Work across several Godot projects/worktrees or reason about a shared Runtime Slot | [Multiple projects](references/fennara-godot-mcp-multi-project-worktrees.md) |
| Diagnose missing/wrong connections, lost results, slow workers, or misleading evidence | [Operations and troubleshooting](references/fennara-godot-mcp-operations-troubleshooting.md) |
| Configure the optional dock/browser chat, providers, local models, or telemetry | [Built-in chat](references/fennara-godot-mcp-built-in-chat.md) |
| Audit coverage, refresh these rules, or resolve upstream documentation discrepancies | [Sources](references/fennara-godot-mcp-sources.md) |

For example, a UI layout fix starts with **Scenes and resources** and adds **Visuals and animation**. An imported character issue starts with **Asset imports**; add **Visuals and animation** for pose evidence or **Runtime playtesting** for behavior. Do not load chat-provider setup for ordinary external MCP work.

## Completion evidence

Report what changed, the relevant diagnostic/validation outcome, whether visual or runtime evidence was inspected, and any remaining limitation. Distinguish a saved edit, a detached preview, a three-second startup check, and a tested gameplay outcome.

## Source Map

| Source | Used for |
| --- | --- |
| [Canonical documentation](https://github.com/fennaraOfficial/fennara-godot-ai/tree/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs) | Surface selection, lifecycle, setup, tools, and task routing |
| [Generated project guidelines](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/templates/fennara-guidelines.md) | Inspection, serialization, verification, worker reuse, and recovery rules |
| [External tool selection](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/crates/fennara-mcp/src/runtime/schemas.rs) | External MCP boundary; avoid treating chat/internal schema files as public tools |
| [Complete source inventory](references/fennara-godot-mcp-sources.md) | Per-document provenance, schema coverage, Context7 enrichment, exclusions, and refresh procedure |
