# ChiR24 Unreal MCP — Niagara VFX

| Task | Discover under `manage_effect` |
|---|---|
| System/emitter creation | `create_effect` |
| Add emitter/parameters/static switches | `edit_niagara_system` |
| Stack modules/renderers | `add_niagara_module` |
| Sampling interfaces | `add_niagara_data_interface` |
| Inspection/validation | `get_niagara_info` |
| World preview/playback | `spawn_niagara`, `activate`, `advance_simulation` |
| Debug geometry | `debug_shape`, `list_debug_shapes` |

## Build the complete chain

```json
{"operation":"search","query":"create niagara system","tool":"manage_effect","limit":2}
```

Check Niagara/authoring-plugin availability. Create the system and emitter as distinct assets, then instance the emitter into the system using both real paths. Add spawn/initialization/motion and a renderer with the intended material.

Read each module's actual inputs and ordering requirements. Follow `dependencyHint`, such as a force module needing SolveForcesAndVelocity afterward. Configure user parameters/data interfaces and bind real sources; a parameter with the wrong namespace/type can exist without driving the intended input.

Read back modules, renderer material, static switches and validation. Static switch modes can gate size/width and other values; setting a value while its mode is unset may have no effect.

## Diagnose an invisible effect

```json
{"operation":"describe","capability":"manage_effect.get_niagara_info"}
```

Check in order:

1. System has an enabled emitter and particles spawn within the observed time/bounds.
2. Emitter has a renderer with a valid material; validation alone may miss a missing renderer material.
3. Material has the right Niagara usage flags and compiles. Assigning `materialPath` through the supported renderer workflow can set usage; inspect and save it.
4. Viewport realtime is enabled for an editor preview, or the intended PIE world is ticking.
5. Component is activated, visible, at the intended transform, with camera, bounds and parameter/static-switch settings that can draw.

Advance or restart simulation deliberately, inspect the image over relevant times, and verify retriggering if the effect is reusable. A fleeting effect can vanish between tool calls; capture at a controlled time or inspect a persistent activation/hit counter.

Persist system/emitter/material changes separately from spawned preview components. Remove task-owned debug shapes/previews only. Do not assume event-payload authoring or every GPU simulation feature in Roadmap is available; describe the requested operation.

Sources: [niagara-vfx playbook](https://github.com/ChiR24/Unreal_mcp/blob/dev/plugins/EngineWire/Source/EngineWire/Private/MCP/Primitives/McpPromptPlaybooks.cpp), [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md), [Roadmap phase 12](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Roadmap.md). For material flags use [materials-textures](chir24-unreal-mcp-materials-textures.md).
