# Fennara Godot MCP — Sources and Coverage

## Research snapshot

| Field | Value |
| --- | --- |
| Repository | [fennaraOfficial/fennara-godot-ai](https://github.com/fennaraOfficial/fennara-godot-ai) |
| Requested entry point | [Canonical docs directory](https://github.com/fennaraOfficial/fennara-godot-ai/tree/main/docs) |
| Pinned commit | `0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6` |
| Repository VERSION | `0.4.3` |
| Research date | 2026-11-03 |
| Language authority | Canonical English docs; translations may lag |
| Scope | Agent use of Fennara, not development/publishing of Fennara itself |
| Enrichment | Context7 `/fennaraofficial/fennara-godot-ai`, queried for usage, best practices, quick reference, and common mistakes |

These rules are distilled guidance, not copied documentation or a record of successful live calls. Operational examples are original and checked against the pinned schema shapes. They were not executed in a connected Godot editor during this documentation task.

The survey fetched 21 top-level documentation pages, 17 tool-schema files, and eight guidance/source/version files. Operational pages and relevant contributor sections informed the rules; the inventory below records exclusions. Localized duplicates and demonstration videos were unnecessary for exact tool contracts.

## Documentation source inventory

| Source | Type | Scope | Signal / use | Gap or treatment |
| --- | --- | --- | --- | --- |
| [docs/README.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/README.md) | docs | Task navigation and separation of operational versus contributor documentation | Routing | Navigation only |
| [docs/setup.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/setup.md) | docs | Requirements, install, readiness, update and platform recovery | Connection; maintenance; operations | Version-dependent requirements |
| [docs/cli.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/cli.md) | docs | Actual command set, adoption, version pinning, transactions and export preparation | Connection; maintenance; CLI boundaries | No engine-operation CLI command documented |
| [docs/mcp-setup.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/mcp-setup.md) | docs | External app setup, stable launcher, config formats and timeouts | Connection; multiple projects | Client formats can change; consult current client documentation |
| [docs/multi-agent-worktrees.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/multi-agent-worktrees.md) | docs | Canonical binding, host boundaries, editor ambiguity and Runtime Slot | Multiple projects; runtime | Host-specific isolation must be verified |
| [docs/tools.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/tools.md) | docs | Tool behavior, successful-result meaning and limitations | All operational references | Exact signatures require schemas |
| [docs/examples.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/examples.md) | docs | Inspect/change/check workflows in an existing project | Master workflow; scenes; runtime | Prompt examples are not executable API contracts |
| [docs/chat-vs-mcp.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/chat-vs-mcp.md) | docs | Separate accounts, chat display and routing | Connection; built-in chat | No gap for the documented distinction |
| [docs/providers.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/providers.md) | docs | Provider picker, custom/local endpoints, credential storage and response timeout | Built-in chat | Provider/model catalogs change; no fixed recommendation |
| [docs/slash-commands.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/slash-commands.md) | docs | Provider/model composer shortcuts and UI semantics | Built-in chat | No CLI/MCP equivalence |
| [docs/faq.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/faq.md) | docs | Setup, routing, runtime concurrency, webviews and account confusion | Connection; operations; chat | Use deeper pages/schemas for exact actions |
| [docs/manual-install.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/manual-install.md) | docs | Matching release assets, shared layout and generated project guidance | Connection; maintenance | Manual manifest assembly intentionally deferred to upstream |
| [docs/architecture.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/architecture.md) | docs | Local component boundaries, update handoff, C# builds, routing and export lifecycle | Master; code; maintenance; operations | Relevant operational sections studied; contributor internals not reproduced |
| [docs/repo-map.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/repo-map.md) | docs | Locate authoritative schemas, guidance and runtime helper sources | Source discovery | Contributor directory catalog not turned into agent rules |
| [docs/release.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/release.md) | docs | Version/manifest identity, stable/staging selection and activation guarantees | Maintenance | Relevant consumer sections studied; release publishing/building excluded |
| [docs/telemetry.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/telemetry.md) | docs | Anonymous-event scope, opt-out and failure isolation | Built-in chat | Documented behavior; no live telemetry audit performed |
| [docs/languages.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/languages.md) | docs | Canonical English sources and translation freshness policy | Research source selection | Localized duplicates intentionally not reread |
| [docs/fennara-vs-traditional-godot-mcp.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/fennara-vs-traditional-godot-mcp.md) | docs | Feedback-loop rationale | Master workflow | Marketing comparisons are not capability evidence |
| [docs/open-rpg-demo.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/open-rpg-demo.md) | docs | Existing-project repair loop illustrated by a demo | Workflow rationale | No independent verification of video claims |
| [docs/demos.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/demos.md) | docs | Examples and links illustrating product intent | Assessed; no API claims derived | Videos not analyzed; no need for tool contracts |
| [docs/github-metadata.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/docs/github-metadata.md) | docs | Repository About text/topics | Assessed and excluded from operational rules | No actionable engine guidance |

## Authoritative guidance and implementation checks

| Source | Scope | Used for |
| --- | --- | --- |
| [local/templates/fennara-guidelines.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/templates/fennara-guidelines.md) | Always-needed connection, selection, serialization, validation and recovery discipline | Master and all workflow references |
| [local/templates/fennara-ai/index.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/templates/fennara-ai/index.md) | Upstream selective-loading routes | Master routing; specialized guidance links |
| [local/templates/fennara-ai/operations.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/templates/fennara-ai/operations.md) | Lost results, lifecycle events, large-worker limits | Operations |
| [local/templates/fennara-ai/runtime-observation.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/templates/fennara-ai/runtime-observation.md) | Lease, controls discovery, live state, evidence and physics | Runtime; multiple projects |
| [local/templates/fennara-ai/visual-observation.md](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/templates/fennara-ai/visual-observation.md) | Framing, sheets, imported animation, graph/rig/IK evaluation | Visuals and animation |
| [runtime/runtime_script_context.gd](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/runtime/runtime_script_context.gd) | Public runtime helper signatures and await behavior | Runtime example and helper boundaries |
| [local/crates/fennara-mcp/src/runtime/schemas.rs](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/crates/fennara-mcp/src/runtime/schemas.rs) | Exact external forwarded tool subset | Master capability boundary |
| [VERSION](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/VERSION) | Repository snapshot version 0.4.3 | Version provenance |

## Schema inventory

The external MCP server embeds **13 forwarded Godot tools** and separately implements `fennara_status`. Four additional schema files in the directory are not part of that forwarded external list. Do not infer exposure from directory contents.

| Source | Scope | Used for |
| --- | --- | --- |
| [local/schemas/tools/exec_command.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/exec_command.json) | Reviewed to distinguish non-external schemas; not recommended as external MCP tools | Not included in the external forwarded list |
| [local/schemas/tools/file_ops.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/file_ops.json) | Reviewed to distinguish non-external schemas; not recommended as external MCP tools | Not included in the external forwarded list |
| [local/schemas/tools/get_class_info.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/get_class_info.json) | Arguments, worker contract, limits, and result semantics for get_class_info | Affected thematic reference and example validation |
| [local/schemas/tools/get_node_properties.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/get_node_properties.json) | Arguments, worker contract, limits, and result semantics for get_node_properties | Affected thematic reference and example validation |
| [local/schemas/tools/get_scene_tree.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/get_scene_tree.json) | Arguments, worker contract, limits, and result semantics for get_scene_tree | Affected thematic reference and example validation |
| [local/schemas/tools/project_settings.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/project_settings.json) | Arguments, worker contract, limits, and result semantics for project_settings | Affected thematic reference and example validation |
| [local/schemas/tools/read_file.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/read_file.json) | Reviewed to distinguish non-external schemas; not recommended as external MCP tools | Not included in the external forwarded list |
| [local/schemas/tools/run_asset_import_script.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/run_asset_import_script.json) | Arguments, worker contract, limits, and result semantics for run_asset_import_script | Affected thematic reference and example validation |
| [local/schemas/tools/run_scene_edit_script.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/run_scene_edit_script.json) | Arguments, worker contract, limits, and result semantics for run_scene_edit_script | Affected thematic reference and example validation |
| [local/schemas/tools/runtime_script.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/runtime_script.json) | Arguments, worker contract, limits, and result semantics for runtime_script | Affected thematic reference and example validation |
| [local/schemas/tools/runtime_session.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/runtime_session.json) | Arguments, worker contract, limits, and result semantics for runtime_session | Affected thematic reference and example validation |
| [local/schemas/tools/save_custom_resource.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/save_custom_resource.json) | Reviewed to distinguish non-external schemas; not recommended as external MCP tools | Not included in the external forwarded list |
| [local/schemas/tools/scrape_editor.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/scrape_editor.json) | Arguments, worker contract, limits, and result semantics for scrape_editor | Affected thematic reference and example validation |
| [local/schemas/tools/screenshot_scene.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/screenshot_scene.json) | Arguments, worker contract, limits, and result semantics for screenshot_scene | Affected thematic reference and example validation |
| [local/schemas/tools/script_diagnostics.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/script_diagnostics.json) | Arguments, worker contract, limits, and result semantics for script_diagnostics | Affected thematic reference and example validation |
| [local/schemas/tools/validate_scene.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/validate_scene.json) | Arguments, worker contract, limits, and result semantics for validate_scene | Affected thematic reference and example validation |
| [local/schemas/tools/write_or_update_file.json](https://github.com/fennaraOfficial/fennara-godot-ai/blob/0abbac3b3a1cb46bbce4f90e8cebc6a3e5d61ec6/local/schemas/tools/write_or_update_file.json) | Arguments, worker contract, limits, and result semantics for write_or_update_file | Affected thematic reference and example validation |

## Context7 enrichment

The four queries covered:

1. Usage patterns: setup, CLI, binding, workers and scene context.
2. Best practices: ownership, narrow edits and verification.
3. Quick reference: tool arguments, screenshot/runtime workers and helper boundaries.
4. Common mistakes: scan scope, project routing, timeout handling and runtime contention.

Context7 returned excerpts from the same official repository, including generated guidance that the overview docs did not fully explain. The pinned primary files and schemas were then read directly. Context7 was corroborating discovery, not an independent authority or evidence of a live tool result.

## What stays outside this ruleset

- Release publishing, Rust/C++ builds, and contributor packaging commands are not ordinary Godot-project workflows.
- Provider/model lists and host configuration locations are intentionally not exhaustive; use the current picker/help/client documentation for exact choices.
- Specialized animation graph, skinning, procedural motion, and IK evaluation links to the installed visual-observation guide after a concise decision checklist. A speculative universal worker would conceal project assumptions.
- No Fennara scene-edit/screenshot/test CLI was documented in this snapshot. Native Godot CLI commands and repository tools are labelled as separate mechanisms.
- No local Godot editor/addon/client configuration was installed or changed to research these rules.

## Refresh procedure

1. Read installed `fennara_status`, live advertised schemas, and generated `addons/fennara/ai/guidelines.md`.
2. Compare upstream `VERSION`, `docs/tools.md`, `docs/cli.md`, binding/runtime documentation, and external schema selection against this snapshot.
3. Fetch only the authoritative files for changed topics. Recheck helper source before introducing new runtime helper signatures.
4. Update the existing thematic reference instead of adding numbered duplicates.
5. Keep the main rule small and its routing table complete; preserve the `fennara-godot-mcp` filename prefix on every main/reference file.
6. Validate examples, local links, headers, index/state registration, and source provenance. Record a new commit/date and any unverified runtime limitation.

## Example coverage map

| Topic | Concrete example location |
| --- | --- |
| Install, external stdio config and project binding | Connection and CLI; multiple projects |
| Lifecycle, rollback and addon-free CI export | Maintenance and export |
| Saved hierarchy/properties/class discovery, new scene, subscene, standalone material | Scenes and resources |
| Exact text replacement and scoped/project diagnostics | Scripts and diagnostics |
| Typed imported-resource inspection/edit | Imported assets |
| Settings discovery, display size, InputMap and autoload | Settings and input |
| Detached capture and fixed-camera animation sheet | Visuals and animation |
| Runtime acquisition, owner status/stop and observed action pulse | Runtime playtesting |
| Lost-result recovery and large-worker failure triage | Operations and troubleshooting |
| Provider configuration and opt-out | Built-in chat UI procedure and endpoint/environment examples |

Policy-only sections and symptom tables intentionally use checklists rather than executable repair scripts. Those choices depend on observed project/operation state. No example should be interpreted as a completed action or a universal gameplay success predicate.
