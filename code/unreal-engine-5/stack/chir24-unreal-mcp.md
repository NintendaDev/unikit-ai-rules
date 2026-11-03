---
version: 1.0.0
---

# ChiR24 Unreal MCP / EngineWire

> **Scope**: Operating Unreal Editor through ChiR24 Unreal MCP (EngineWire), choosing capabilities and task-specific workflows, and verifying editor, saved and runtime results.
> **Load when**: using ChiR24 Unreal MCP or EngineWire to inspect or edit an Unreal project, choose an automation capability, author content, test gameplay, recover a connection, or extend this bridge.
> **References**: `.unikit/memory/code/stack/references/chir24-unreal-mcp-connection-configuration.md` (connection), `.unikit/memory/code/stack/references/chir24-unreal-mcp-gateway-discovery.md` (discovery), `.unikit/memory/code/stack/references/chir24-unreal-mcp-execution-safety.md` (execution), `.unikit/memory/code/stack/references/chir24-unreal-mcp-resources-prompts.md` (context), `.unikit/memory/code/stack/references/chir24-unreal-mcp-assets-data.md` (content), `.unikit/memory/code/stack/references/chir24-unreal-mcp-actors-levels.md` (world), `.unikit/memory/code/stack/references/chir24-unreal-mcp-environment-lighting.md` (environment), `.unikit/memory/code/stack/references/chir24-unreal-mcp-geometry-pcg.md` (procedural), `.unikit/memory/code/stack/references/chir24-unreal-mcp-blueprints.md` (logic), `.unikit/memory/code/stack/references/chir24-unreal-mcp-ui-umg.md` (UI), `.unikit/memory/code/stack/references/chir24-unreal-mcp-materials-textures.md` (surfaces), `.unikit/memory/code/stack/references/chir24-unreal-mcp-characters-animation-physics.md` (motion), `.unikit/memory/code/stack/references/chir24-unreal-mcp-gameplay-combat-inventory.md` (gameplay), `.unikit/memory/code/stack/references/chir24-unreal-mcp-ai-navigation.md` (AI), `.unikit/memory/code/stack/references/chir24-unreal-mcp-framework-input-networking.md` (framework), `.unikit/memory/code/stack/references/chir24-unreal-mcp-audio.md` (audio), `.unikit/memory/code/stack/references/chir24-unreal-mcp-vfx-niagara.md` (VFX), `.unikit/memory/code/stack/references/chir24-unreal-mcp-cinematics-media.md` (cinematics), `.unikit/memory/code/stack/references/chir24-unreal-mcp-runtime-verification.md` (verification), `.unikit/memory/code/stack/references/chir24-unreal-mcp-builds-performance.md` (delivery), `.unikit/memory/code/stack/references/chir24-unreal-mcp-scripting-automation.md` (automation), `.unikit/memory/code/stack/references/chir24-unreal-mcp-plugin-extension.md` (extension), `.unikit/memory/code/stack/references/chir24-unreal-mcp-sources.md` (provenance).

---

## Identity and applicability

- Apply this package only to **ChiR24/Unreal_mcp**, whose editor plugin is **EngineWire** (formerly `McpAutomationBridge`) and npm package is `unreal-engine-mcp-server`. Do not borrow schemas from other Unreal MCP servers.
- Research snapshot: **2026-11-03**, `dev` commit `1f64129a5d61a6dbaa490f76578571a1c9cf695a`, package version **0.6.0**; Wiki commit `939bb6005f0492fdec175fd4457c7597a4cb8783`. No connected Unreal Editor was used to validate this package.
- This is portable bridge knowledge. Its presence in a Unity knowledge base does not change the project's engine, install EngineWire, or authorize changes to bridge routing or project settings.
- Prefer the installed gateway schema and exact capability contract for calls; verify behavior in the editor. Use matching-version engine APIs. The sources disagree on counts, defaults and some transport details; consult the source inventory when refreshing a claim.

## Common operating loop

1. **Orient:** identify the connected project, plugin/engine version, active map and editor/PIE state through available resources and inspected capabilities. Follow applicable project bridge routes.
2. **Discover:** on 0.6, the sole public MCP tool is `unreal`. Use `search` → the chosen row's `nextCall` → `describe` → its execute `nextCall`, filling only declared `params`. The 23 parent tools are internal routes. A clear first hit may supply `signature` and `executeCall`; use that shortcut only when it completely describes the intended call.
3. **Load narrowly:** open only the next task's reference below. Add a second reference when crossing a concern. Do not read the whole reference folder, source inventory or action catalog at startup.
4. **Inspect before writing:** resolve exact asset/object/actor paths and world context. Read existing content. `/Game/...` packages, `/Script/...` classes and host files are different address spaces. Use returned handles and re-resolve after rename, reload or PIE changes.
5. **Execute deliberately:** check availability, required plugins, scope and consent; keep envelope controls outside `params`. A protocol consent grant is copied from `describe` within the user's authorized scope; it does not itself require another conversational approval. A refusal is a reason to inspect the contract, not bypass policy.
6. **Verify the outcome:** read `data`, receipt, warnings, diagnostics and expectations. A running task is unfinished; a successful call can leave failed expectations. Inspect state before retrying a timeout or partial mutation. Persist the intended packages and confirm saved state; PIE edits are generally temporary.
7. **Prove the relevant claim:** compile/lint logic, inspect visuals, exercise behavior in PIE, and check files for renders/builds. Report what changed, what was saved, what ran and what remains unverified. A catalog record, clean build or roadmap checkbox is not runtime evidence.

Example gateway argument (send through the discovered `unreal` tool):

```json
{"operation":"search","query":"inspect editor state","effect":"read","limit":3}
```

## Task reference lookup workflow

Paths below are relative to this file. Each reference owns its domain recipes and checks; sequences are operation order, not a substitute for a live parameter schema.

| Task | Open first |
|---|---|
| Install/update EngineWire, choose HTTP/stdio, resolve auth/port/session failures | [connection-configuration](references/chir24-unreal-mcp-connection-configuration.md) |
| Find a capability, browse domains, resolve aliases, enable an internal tool | [gateway-discovery](references/chir24-unreal-mcp-gateway-discovery.md) |
| Handle consent, stale state, retries, partial results, paging or long tasks | [execution-safety](references/chir24-unreal-mcp-execution-safety.md) |
| Read MCP resources, request prompts, use completions or change notifications | [resources-prompts](references/chir24-unreal-mcp-resources-prompts.md) |
| Find/import/migrate/Fab assets, maintain references, edit tables/structs/enums | [assets-data](references/chir24-unreal-mcp-assets-data.md) |
| Place/attach/edit actors, load/save maps, streaming, data layers and volumes | [actors-levels](references/chir24-unreal-mcp-actors-levels.md) |
| Terrain, foliage, roads, sky, water, light, exposure and scene captures | [environment-lighting](references/chir24-unreal-mcp-environment-lighting.md) |
| Create/model meshes, UVs, collision, LOD/Nanite or PCG graphs | [geometry-pcg](references/chir24-unreal-mcp-geometry-pcg.md) |
| Author Blueprint variables, components, graphs, interfaces and behavior | [blueprints](references/chir24-unreal-mcp-blueprints.md) |
| Build or repair UMG menus/HUD, layout, bindings, animation and input | [ui-umg](references/chir24-unreal-mcp-ui-umg.md) |
| Materials, shader graphs, instances and procedural texture operations | [materials-textures](references/chir24-unreal-mcp-materials-textures.md) |
| Characters, locomotion, rigs, retargeting, montages, ragdoll and physics assets | [characters-animation-physics](references/chir24-unreal-mcp-characters-animation-physics.md) |
| Weapons/projectiles, GAS, items, loot, crafting, doors and interactions | [gameplay-combat-inventory](references/chir24-unreal-mcp-gameplay-combat-inventory.md) |
| Behavior Trees/Blackboards, perception, EQS, StateTree, Mass and NavMesh | [ai-navigation](references/chir24-unreal-mcp-ai-navigation.md) |
| GameMode/pawn startup, Enhanced Input, ownership/RPCs and LAN/local play | [framework-input-networking](references/chir24-unreal-mcp-framework-input-networking.md) |
| Sound Cues, MetaSounds, playback, attenuation, mixes and loudness | [audio](references/chir24-unreal-mcp-audio.md) |
| Niagara systems, emitters, modules, data interfaces and invisible effects | [vfx-niagara](references/chir24-unreal-mcp-vfx-niagara.md) |
| Sequencer, camera cuts, Movie Render Queue, media, takes and replays | [cinematics-media](references/chir24-unreal-mcp-cinematics-media.md) |
| PIE, synthetic input, visual/runtime evidence, playtests and diagnostics | [runtime-verification](references/chir24-unreal-mcp-runtime-verification.md) |
| Build/package/launch, project settings, automation tests, profiling and Insights | [builds-performance](references/chir24-unreal-mcp-builds-performance.md) |
| Batch capability calls, S-expression scripts/recipes or editor Python | [scripting-automation](references/chir24-unreal-mcp-scripting-automation.md) |
| Add/change EngineWire records, C++ handlers, schemas and bridge tests | [plugin-extension](references/chir24-unreal-mcp-plugin-extension.md) |
| Audit provenance, coverage, version conflicts or roadmap-only requests | [sources](references/chir24-unreal-mcp-sources.md) |

For a compound task, load in stages. A working door starts with actors/levels and gameplay, adds Blueprint logic if needed, then runtime verification. A HUD starts with UMG and adds input/framework only when wiring player interaction. Do not make every domain reference a prerequisite for every operation.

## Source Map

| Source | Used for |
|---|---|
| [All `dev/docs` files](https://github.com/ChiR24/Unreal_mcp/tree/1f64129a5d61a6dbaa490f76578571a1c9cf695a/docs) | Gateway contracts, security, primitives, evidence limits, native extension and testing; roadmap/API scope boundaries |
| [Wiki](https://github.com/ChiR24/Unreal_mcp/wiki), including [Tools Reference](https://github.com/ChiR24/Unreal_mcp/wiki/Tools-Reference) and [Resources and Prompts](https://github.com/ChiR24/Unreal_mcp/wiki/Resources-and-Prompts) | Installation, client setup, task families, operation examples and recovery |
| [Native domain playbooks](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/plugins/EngineWire/Source/EngineWire/Private/MCP/Primitives/McpPromptPlaybooks.cpp) and selected capability records | Practical traps, original workflows and checks against the current implementation contracts |
| Context7 `/chir24/unreal_mcp` | Supplemental comparison; older multi-tool/WS/Python claims were rejected where contradicted by the pinned sources |

The [source inventory](references/chir24-unreal-mcp-sources.md) lists each document, topic coverage and unresolved discrepancies. Domain recipes and acceptance checks are synthesized guidance; they are not claims of live verification.
