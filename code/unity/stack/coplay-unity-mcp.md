---
version: 1.0.0
---

# Coplay Unity MCP

> **Scope**: Operating the Unity Editor through CoplayDev MCP for Unity and its `unity-mcp` CLI: selecting a session and tools, inspecting before editing, choosing task-specific workflows, and verifying persisted and runtime results.
> **Load when**: using Coplay Unity MCP tools or the `unity-mcp` CLI, choosing a Coplay tool for editor automation, recovering a Coplay connection, authoring scenes or assets through Coplay, compiling scripts, running tests, or collecting visual and performance evidence through Coplay.
> **References**: `.unikit/memory/code/stack/references/coplay-unity-mcp-connection-cli.md` (connection), `.unikit/memory/code/stack/references/coplay-unity-mcp-batch-custom-tools.md` (batching), `.unikit/memory/code/stack/references/coplay-unity-mcp-scene-objects.md` (scene authoring), `.unikit/memory/code/stack/references/coplay-unity-mcp-prefabs-assets.md` (asset authoring), `.unikit/memory/code/stack/references/coplay-unity-mcp-scripts-compilation.md` (scripting), `.unikit/memory/code/stack/references/coplay-unity-mcp-ui-ugui.md` (Canvas UI), `.unikit/memory/code/stack/references/coplay-unity-mcp-ui-toolkit.md` (UI Toolkit), `.unikit/memory/code/stack/references/coplay-unity-mcp-materials-vfx.md` (effects), `.unikit/memory/code/stack/references/coplay-unity-mcp-camera-rendering.md` (rendering), `.unikit/memory/code/stack/references/coplay-unity-mcp-animation-sprites.md` (animation), `.unikit/memory/code/stack/references/coplay-unity-mcp-tests-playmode.md` (testing), `.unikit/memory/code/stack/references/coplay-unity-mcp-profiling.md` (measurement), `.unikit/memory/code/stack/references/coplay-unity-mcp-probuilder.md` (modeling), `.unikit/memory/code/stack/references/coplay-unity-mcp-asset-generation-blender.md` (generation and import), `.unikit/memory/code/stack/references/coplay-unity-mcp-physics.md` (physics), `.unikit/memory/code/stack/references/coplay-unity-mcp-packages-build.md` (packages and builds), `.unikit/memory/code/stack/references/coplay-unity-mcp-sources.md` (provenance).

---

## Authority and scope

- These rules describe **CoplayDev/unity-mcp**. Its executable is `unity-mcp`, its resources use `mcpforunity://`, and its tool names include `manage_scene`. Do not substitute the `unity` CLI or another Unity MCP server's methods, resource URIs, or parameter shapes.
- Follow the project's bridge routing and editor/content conventions before choosing this bridge. A CLI call to Coplay is still a Coplay operation; changing transport does not bypass a route restricting an area to another bridge.
- Sources were reviewed on 2026-11-03 against upstream `beta` revision `e2fd09c71644d1d9fa1ae134526ce913cbf97536`. This is a documentation snapshot, not a claim about the installed server version or a live-tested compatibility matrix.
- Resolve drift in this order: installed tool schema and observed editor state, matching installed implementation, current generated parameter reference, then skill templates. Templates are examples to adapt, not payload contracts. For Unity APIs, inspect live reflection before relying on documentation for another version.

## Operating loop

1. **Orient.** Confirm the project and Unity instance, active scene or prefab stage, Edit/Play Mode, compilation and reload state. Read relevant resources before mutation; start with `mcpforunity://editor/state` and `mcpforunity://project/info`.
2. **Load narrowly.** Use the table below to open only the reference for the current task. Re-evaluate when the task changes area. Do not preload every reference, the source inventory, or the entire online tool catalog.
3. **Discover.** Inspect the installed schema, find exact targets, read the affected component or asset, and establish what must change. Instance IDs are session-local; re-find after reloads, scene changes, or object recreation.
4. **Act.** Use a dedicated tool or discovered project custom tool. Batch operations with known inputs; split at response dependencies and compilation boundaries. Use code execution only for a gap the normal tools do not cover.
5. **Verify.** Inspect each response, then independently read back the specific changed state. Check console errors after script imports and substantial edits. Save only the scene, prefab, or asset intended by the task. Verify persistence separately from transient Play Mode state.
6. **Prove the claim.** Inspect a screenshot for visual work, observe the relevant runtime behavior for gameplay, obtain terminal job results for tests/builds/generation, and retain measurement conditions for performance claims. A successful request alone proves none of these outcomes.

## Task lookup workflow

All filenames in this table are relative to `.unikit/memory/code/stack/references/`. Each topic contains MCP examples and CLI commands or an explicit CLI limitation. Group activation in the last column concerns MCP session visibility, not a CLI prerequisite.

| Current task | Open | Group to discover/activate |
|---|---|---|
| Connect, select an instance, choose transport, recover hidden tools or a reload | [coplay-unity-mcp-connection-cli.md](references/coplay-unity-mcp-connection-cli.md) | `core` |
| Reduce round trips, perform repeated edits, invoke project extensions | [coplay-unity-mcp-batch-custom-tools.md](references/coplay-unity-mcp-batch-custom-tools.md) | `core` |
| Inspect/load/save scenes; find, create, parent, or configure objects | [coplay-unity-mcp-scene-objects.md](references/coplay-unity-mcp-scene-objects.md) | `core` |
| Edit prefab contents/stages, instantiate prefabs, search/import/move assets | [coplay-unity-mcp-prefabs-assets.md](references/coplay-unity-mcp-prefabs-assets.md) | `core` |
| Edit C#, wait for compilation, execute editor C#, patch ScriptableObjects, inspect APIs | [coplay-unity-mcp-scripts-compilation.md](references/coplay-unity-mcp-scripts-compilation.md) | `core`; `scripting_ext` or `docs` as needed |
| Build or debug Canvas UI, RectTransforms and input | [coplay-unity-mcp-ui-ugui.md](references/coplay-unity-mcp-ui-ugui.md) | `core` |
| Author UXML/USS/PanelSettings or inspect a UIDocument visual tree | [coplay-unity-mcp-ui-toolkit.md](references/coplay-unity-mcp-ui-toolkit.md) | `ui` |
| Edit materials, shader source, textures, particles, trails, lines or VFX Graph | [coplay-unity-mcp-materials-vfx.md](references/coplay-unity-mcp-materials-vfx.md) | `core`; `vfx` as needed |
| Capture visuals, configure cameras, volumes, URP features, environment or baking | [coplay-unity-mcp-camera-rendering.md](references/coplay-unity-mcp-camera-rendering.md) | `core` |
| Author clips/controllers, drive an Animator, slice and animate sprite sheets | [coplay-unity-mcp-animation-sprites.md](references/coplay-unity-mcp-animation-sprites.md) | `animation` |
| Run filtered EditMode/PlayMode tests or investigate a stuck test job | [coplay-unity-mcp-tests-playmode.md](references/coplay-unity-mcp-tests-playmode.md) | `testing`; `core` for mode/console |
| Read frame/counter/memory evidence or inspect Frame Debugger events | [coplay-unity-mcp-profiling.md](references/coplay-unity-mcp-profiling.md) | `profiling` |
| Construct/edit ProBuilder geometry and select faces or vertices | [coplay-unity-mcp-probuilder.md](references/coplay-unity-mcp-probuilder.md) | `probuilder` |
| Generate image/model/audio assets, import a local model or exchange with Blender | [coplay-unity-mcp-asset-generation-blender.md](references/coplay-unity-mcp-asset-generation-blender.md) | `asset_gen` |
| Inspect bodies/colliders, query collisions, apply forces or step simulation | [coplay-unity-mcp-physics.md](references/coplay-unity-mcp-physics.md) | `core` |
| Query/change UPM packages, build scenes/settings/profiles or run player builds | [coplay-unity-mcp-packages-build.md](references/coplay-unity-mcp-packages-build.md) | `core` |
| Audit a statement, update these rules, resolve upstream disagreements | [coplay-unity-mcp-sources.md](references/coplay-unity-mcp-sources.md) | No editor call required |

## MCP and CLI conventions

- Use an available MCP client for tools and read-only resources. The actual client may namespace tool names; examples use their unprefixed Coplay names in Python-style notation to describe calls, not an installed Python SDK.
- Use `unity-mcp` when terminal automation is appropriate and local HTTP is configured. It reaches the running MCP server and Editor; it is not a standalone Unity batchmode replacement and does not eliminate Editor readiness requirements.
- Inspect `unity-mcp --help` and the relevant subcommand's `--help` before using a version-sensitive wrapper. Put global flags **before** the command group. Bind `--instance` explicitly or set a verified `UNITY_MCP_INSTANCE` for the task.
- When no dedicated CLI wrapper exists, use `unity-mcp raw COMMAND JSON` only for an actual Unity-side command. The CLI posts directly to `/api/command`, bypassing Python MCP wrappers: command names, field names, conversions and waiting behavior can differ. Follow the transport mappings in the topic/connection references. Server-only MCP tools and resources have no automatic raw equivalent.
- Prefer typed JSON values and `Assets/...` paths. Resolve actual serialized property names, enum values, reference shapes, material slots and repeated-component indices from the target; do not guess from a template.
- Keep output bounded: query one subtree/component, turn previews off for searches, follow returned pagination, and request inline images only when inspecting them. Resource cursors, hierarchy cursors and asset page numbers are different protocols.

## Failure rules

- Wait on compilation/domain reload using the current readiness response and its retry advice. Do not infer readiness from a fixed sleep or a reachable HTTP server. After a disconnect, re-check instance and state before resuming.
- A hidden tool may require group activation or custom-tool dispatch. Inspect that before reinstalling anything. HTTP and stdio have different initial visibility; never assume all tools are active.
- Set `parallel` and `fail_fast` explicitly in batches. Parallelism is advisory and intended for reads; batches are **not transactions**. Inspect completed steps before retrying a failed batch.
- A timeout leaves mutation outcome uncertain. Read back state or poll the existing job before repeating create, import, test or build requests.
- On stale file edits, reread content and SHA, rebuild the patch against current content, then retry. Replacing only the SHA can apply obsolete coordinates to somebody else's edit.
- Do not turn a saved screenshot path into a visual approval without opening the image; do not turn an accepted job ID into a passing test, successful build or imported asset.

## Source Map

| Source | Used for |
|---|---|
| [Official beta skill](https://github.com/CoplayDev/unity-mcp/tree/beta/unity-mcp-skill) | Resource-first operation, readiness, examples, specialized workflows |
| [Tool reference](https://coplaydev.github.io/unity-mcp/reference/tools/) | Tool/group boundaries and current generated parameter contracts |
| [CLI guide](https://coplaydev.github.io/unity-mcp/guides/cli), [CLI examples](https://coplaydev.github.io/unity-mcp/guides/cli-examples) | Wrappers, raw dispatch, local HTTP and flags |
| [Tool groups](https://coplaydev.github.io/unity-mcp/guides/tool-groups) | Session visibility and Editor toggle synchronization |
| [Official source at the reviewed revision](https://github.com/CoplayDev/unity-mcp/tree/e2fd09c71644d1d9fa1ae134526ce913cbf97536) | Resolves CLI routing, wire-field conversions, server-only tools, batching and wait behavior that the guides simplify |
| Context7 `/coplaydev/unity-mcp` | Cross-checks for usage patterns, best practices, command lookup and common mistakes; checked against the primary sources |

The [source inventory](references/coplay-unity-mcp-sources.md) records individual pages, source roles, coverage gaps and known disagreements. Examples here and in the topic files are authored for these rules; they were not executed against a live Editor during this documentation task.
