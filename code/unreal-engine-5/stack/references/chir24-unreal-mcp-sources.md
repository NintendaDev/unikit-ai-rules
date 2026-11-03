# ChiR24 Unreal MCP — Sources, coverage and maintenance

## Snapshot and reading policy

Reviewed **2026-11-03**. Repository: `ChiR24/Unreal_mcp`, branch **dev**, commit **`1f64129a5d61a6dbaa490f76578571a1c9cf695a`**, package **0.6.0**. Wiki snapshot: **`939bb6005f0492fdec175fd4457c7597a4cb8783`** in `ChiR24/Unreal_mcp.wiki.git`.

All **10 Markdown files present in `dev/docs` at that commit** and all **13 substantive Wiki pages**, plus `_Sidebar` and `_Footer`, were read. Large API/roadmap documents were read in successive bounded sections; the complete action table was reviewed with repeated table syntax compacted. This package distills guidance rather than storing copies of those documents.

The GitHub connector established the directory/commit; read-only Git snapshots supplied complete file bodies and Wiki pages. A web-rendered/cached directory listing showed extra historical documents absent from this commit; those are not silently counted as current documentation. Linked engine/private-service APIs are not an independently exhaustive audit of those external systems.

No Unreal connection, engine build, live mutation, render, playtest or package run was performed while writing these rules. Capability/handler details remain documentation/source evidence until checked against an installed bridge and editor.

## Complete documentation inventory

`docs/` links below are pinned to the reviewed repository commit.

| Source | Type and scope | Used for / signal | Gaps and limits |
|---|---|---|---|
| [gateway-client-guide.md](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/docs/gateway-client-guide.md) | Docs: discovery, forms, options, warnings, scripts, paging, errors | Main loop, gateway/execution references | Some network prose differs from the security document; use the stricter pinned security contract |
| [protocol.md](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/docs/protocol.md) | Docs: native/proxy, versions, sessions, progress, cancellation | Connection and protocol boundaries | Its general task-support section and modern task paragraph differ; discover support live |
| [security-and-receipts.md](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/docs/security-and-receipts.md) | Docs: policy, scopes, nonce lifecycle, paths, idempotency, safety | Execution reference and restricted-path handling | Describes contract guarantees and explicitly unexercised live authorization coverage; one inline consent example omits the required nonce |
| [mcp-primitives.md](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/docs/mcp-primitives.md) | Docs: resources, subscriptions, 6 prompts + 9 playbooks, completions | Context and narrow loading | Transport/client availability varies; not all live state is a resource |
| [action-reference.generated.md](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/docs/action-reference.generated.md) | Generated catalog: complete 482-row capability table, policy and legacy pairs | All domain routing; 23 parents and 76 consent-gated records in this snapshot | Does not replace exact per-action input/output schemas or live availability |
| [editor-plugin-extension.md](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/docs/editor-plugin-extension.md) | Docs: record/handler/route/generation/testing, native constraints | Plugin extension workflow and safety wrappers | Some transport narration retains historical WS wording; current proxy is HTTP |
| [testing-guide.md](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/docs/testing-guide.md) | Docs: unit/source checks, parameter audit, eval, live suites, expectation grammar | Verification categories and extension test discipline | Runner-specific old environment names must not be generalized into proxy settings |
| [performance-and-evidence.md](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/docs/performance-and-evidence.md) | Docs: recorded metrics, blocked lanes, engine matrix, CI limits | Honest evidence/compatibility/performance reporting | Historical measurements and stale certification; some catalog counts predate the generated table |
| [Engine-API-Reference.md](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/docs/Engine-API-Reference.md) | Docs: engine C++/Python concepts across content/gameplay/tooling/advanced plugins | Domain vocabulary, editor/runtime, persistence and implementation boundaries | Based on UE 5.6 analysis; includes conceptual/incomplete examples and APIs with no MCP capability; not an executable contract |
| [Roadmap.md](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/docs/Roadmap.md) | Docs: all 48 phases, historical CRI work, planned and partial scope | Task coverage and preventing invented capabilities | Older checked/unchecked status can conflict with newer records; projected 2,825 actions is a planning estimate |

## Complete Wiki inventory

Wiki links are readable public URLs; reproducibility comes from the Wiki commit above. These pages describe the 0.6 line and can change independently of `dev`.

| Source | Type / scope | Used for | Gaps and limits |
|---|---|---|---|
| [Home](https://github.com/ChiR24/Unreal_mcp/wiki/Home) | Overview | Product identity, two routes, domain map | Marketing range/status is not certification |
| [Quick Start](https://github.com/ChiR24/Unreal_mcp/wiki/Quick-Start) | Setup walkthrough | First connection and read/write/visual checks | Use real project/token and installed version |
| [Installation](https://github.com/ChiR24/Unreal_mcp/wiki/Installation) | Fab/source/prebuilt/dependencies | Installation modes, optional modules, engine/platform matching | Fab can trail source; advertised engine range differs from recorded validation |
| [Connecting Clients](https://github.com/ChiR24/Unreal_mcp/wiki/Connecting-Clients) | HTTP/stdio configs and lifecycle | One route per client, restart behavior, per-editor ports | Client-specific configuration syntax must match the actual client |
| [Using the Gateway](https://github.com/ChiR24/Unreal_mcp/wiki/Using-the-Gateway) | Search/describe/execute/configure examples | Narrow discovery, grants, tasks, error recovery | Four-option list is older than the pinned envelope's eight controls |
| [Tools Reference](https://github.com/ChiR24/Unreal_mcp/wiki/Tools-Reference) | 23-parent overview and folds | Complete thematic routing coverage | Reports 453 capabilities/69 consent records, older than generated `dev` counts |
| [Resources and Prompts](https://github.com/ChiR24/Unreal_mcp/wiki/Resources-and-Prompts) | MCP context/primitives | Six workflow prompt purposes/arguments, live-resource exclusions | Prompt/subscription/progress details differ from newer primitive docs |
| [Configuration](https://github.com/ChiR24/Unreal_mcp/wiki/Configuration) | Plugin/env/defaults/limits | Native enablement, Fab default, timeouts, render caps | Some LAN guidance predates stricter pinned native policy |
| [Security](https://github.com/ChiR24/Unreal_mcp/wiki/Security) | Tokens, scopes, grants, limits | Exact scope membership, sensitive data, dedicated Python route | Off-loopback recipe conflicts with pinned security docs; do not apply it automatically |
| [Troubleshooting](https://github.com/ChiR24/Unreal_mcp/wiki/Troubleshooting) | Symptom-based diagnosis | Ports/auth/tool list, task versus timeout, background throttling | Diagnose actual version instead of applying every historical remedy |
| [FAQ](https://github.com/ChiR24/Unreal_mcp/wiki/FAQ) | Common questions | Editor-only plugin, version/proxy behavior, observation limits | High-level claims need more precise contracts/evidence |
| [Upgrading](https://github.com/ChiR24/Unreal_mcp/wiki/Upgrading) | Migration and removed settings | 0.5 direct calls → gateway; EngineWire rename | Don't mix generations; smaller current relay versions need not match every 0.6 plugin exactly |
| [Development](https://github.com/ChiR24/Unreal_mcp/wiki/Development) | Contributor map/checks | Record-first generation, native constraints, live testing | Source/CI checks do not establish engine behavior |
| `_Sidebar.md`, `_Footer.md` in the pinned Wiki Git snapshot | Navigation | Checked that all Wiki pages were enumerated | No additional usage contract |

## Additional cross-checks

| Source | Scope read | Used for / limitations |
|---|---|---|
| [package.json](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/package.json) | Full package metadata | 0.6.0, Node 20.19+, actual scripts; no installation executed |
| [McpPromptPlaybooks.cpp](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/plugins/EngineWire/Source/EngineWire/Private/MCP/Primitives/McpPromptPlaybooks.cpp) | All nine domain playbooks | Blueprint/input/UMG/material/Niagara/world/animation/cinematic/play traps; source guidance, not live results |
| [McpNativeGatewayDefinition.cpp](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/plugins/EngineWire/Source/EngineWire/Private/MCP/Gateway/McpNativeGatewayDefinition.cpp) | Envelope schema and instructions | Nonce requirement, eight options, search/describe/execute hints |
| [system-ops.ts](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/src/tools/catalog/capabilities/records/system-control/system-ops.ts) | Selected operation records: Python, project settings/rendering, validation, package status | Examples and result distinctions; not an audit of every system handler |
| [playtest.ts](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/src/tools/catalog/capabilities/records/control-editor/playtest.ts) | Full playtest record | Parameters, MCP-started PIE ownership, verdict semantics |
| [scripts.ts](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/src/tools/catalog/capabilities/records/system-control/scripts.ts) | Full script record | Grammar, consent list, budgets and rollback limits |
| [recipes.ts](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/src/tools/catalog/capabilities/records/system-control/recipes.ts) | Full recipe records | Save/list/run workflow, parameters and historical verification |
| Context7 `/chir24/unreal_mcp` | Three queries: discovery/workflows, mutation conventions, connection/recovery | Supplemental source comparison; indexed `main`/0.5 material conflicts with `dev` and was not promoted into current call/config rules |
| [Epic EditorActorSubsystem Python API](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/EditorActorSubsystem?application_version=5.3) | Selection-query API used by the original Python diagnostic | Confirms the subsystem method and editor-world scope; verify the target engine version before execution |

## Internal-parent coverage map

This table proves thematic coverage, not a request to load every file. Names are internal routes, not public MCP tools.

| Parent | Primary references |
|---|---|
| `manage_asset` | assets-data; materials-textures |
| `manage_blueprint` | blueprints; ui-umg |
| `control_actor` | actors-levels; runtime-verification |
| `control_editor` | runtime-verification; actors-levels |
| `manage_level` | actors-levels |
| `system_control` | builds-performance; scripting-automation |
| `inspect` | actors-levels; runtime-verification; task-specific diagnostics |
| `manage_tools` | gateway-discovery; execution-safety |
| `build_environment` | environment-lighting |
| `manage_level_structure` | actors-levels |
| `manage_geometry` | geometry-pcg |
| `manage_pcg` | geometry-pcg |
| `animation_physics` | characters-animation-physics |
| `manage_character` | characters-animation-physics |
| `manage_combat` | gameplay-combat-inventory |
| `manage_effect` | vfx-niagara |
| `manage_gas` | gameplay-combat-inventory |
| `manage_ai` | ai-navigation |
| `manage_inventory` | gameplay-combat-inventory |
| `manage_interaction` | gameplay-combat-inventory |
| `manage_audio` | audio |
| `manage_sequence` | cinematics-media |
| `manage_networking` | framework-input-networking |

## Resolve disagreements explicitly

| Disagreement | Applied rule |
|---|---|
| 482 current generated records versus Wiki/Roadmap 453 and performance history 380 | Pin counts to their source/date; discover the installed catalog. Do not hardcode counts into operating rules |
| 0.5 direct tools/WS versus 0.6 gateway/HTTP proxy | Route by installed generation. Current operating examples target 0.6 |
| Historical “Python removed” versus current explicit Python capability | Use the installed `system_control.execute_python` contract, exact `code` XOR `file`, with required grant |
| Wiki's six prompts/no subscription versus current nine additional playbooks/native changes subscription | Discover actual primitive listings and advertised transport support |
| Wiki says progress without token; primitive docs say no token means no progress | Send a token when supported; do not infer task liveness from absent notifications |
| Modern per-request task support versus the general “task support not advertised” paragraph | Follow actual protocol advertisements/returned task handles. Legacy `receipt.task` is separate from MCP task extensions |
| Wiki LAN recipe versus pinned native loopback-only security contract | Keep native loopback; use a protected tunnel/proxy and verify installed settings |
| Roadmap checkboxes/missing actions versus newer catalog records | Treat Roadmap as scope/history. Describe the exact current action; never restore a removed/no-op capability by assumption |
| UE 5.0–5.8 marketing/build range versus recorded evidence | Report target-specific compile/live evidence. The pinned evidence has a stale 5.7.4 live pass, a 5.8 Preview 1 compile failure and untested older minors; it does not certify current support |
| Engine API snippets versus bridge-safe wrappers and exact schemas | Use matching engine source for implementation, the installed contract for calls, and the extension guide's wrappers for plugin code |

## Roadmap-only requests

Search the installed catalog for the actual requested outcome, not only a proposed action name. Third-party audio middleware, Live Link/mocap, virtual-production control, XR, online services, streaming, full Chaos destruction/cloth, accessibility and modding contain extensive planned scope. Neither a C++ API example nor an installed engine plugin makes those MCP workflows available.

If no verified capability provides the operation: identify the precise missing piece, then choose authorized Blueprint/code authoring, a bounded supported scripting path, bridge extension or an explicit limitation. Do not invent `manage_modding`, `manage_accessibility` or other roadmap placeholder tools.

## Maintenance checks

1. Enumerate `dev/docs` and Wiki again; record both new commits and inventory additions/removals.
2. Resolve the package/plugin generation and generated catalog before changing names/examples.
3. Compare exact option/parameter/policy/output records for touched recipes and capture contradictions.
4. Update the existing thematic reference instead of creating numbered/overlapping files.
5. Keep the master limited to identity, common loop and routing. Add a reference only for an independently loaded task area.
6. Check every relative link, header/reference registration, prefix and main-rule index row. References are not separate index entries.
7. Distinguish documentation refresh from live verification and report any unread/unavailable source honestly.
