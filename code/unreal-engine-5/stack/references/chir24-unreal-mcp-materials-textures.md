# ChiR24 Unreal MCP — Materials and textures

| Task | Capability family |
|---|---|
| Material asset/domain/model | `material.create_material`, `set_material_property` |
| Graph nodes and links | `material.add_material_node`, `connect_nodes`, `get_material_info` |
| Instances and parameters | `material.create_material_instance`, `set_material_parameter`, `asset.edit_material_instance` |
| Compile | `material.compile_material` |
| Generate a texture | `texture.create_texture` |
| Adjust/configure/inspect a texture | `texture.adjust_texture`, `configure_texture`, `get_texture_info` |
| Assign a surface | `control_actor.set_material` |

## Author a material, then variants

```json
{"operation":"search","query":"build material graph","tool":"manage_asset","limit":2}
```

Inspect an existing material before changing its domain, blend/shading model or graph. Create a new base only when reuse is unsuitable. Use instances for parameter variants and inspect which parent owns the intended parameter.

Graph workflow: describe nodes/batch contract → add expressions → connect exact output/input pins and material output properties → compile → inspect `compiled` and `compileErrors` → assign a known mesh slot → save and inspect the surface. Use batch dry-run only when the contract declares it; do not assume each step or disk write rolls back.

Material writes frequently require explicit consent, including operations whose effect is just `write`. Obtain the described grant for each invocation. Do not infer policy from the English verb “set”.

A material compile failure may render the engine default material. First fix diagnostics; then verify mesh component, slot and actual assigned instance. When exposure makes changes hard to see, use a temporary unmistakable parameter value or measured view analysis, then restore the intended value.

Special uses (Niagara sprites/ribbons, skeletal/instanced/spline meshes, Nanite) need matching material usage flags. Flags set implicitly during a preview or PIE may remain unsaved. Validate material usage before packaging and save the actual material/instance identified by the result.

## Texture workflow

```json
{"operation":"describe","capability":"texture.create_texture","param":"kind"}
```

Choose the family variant from its contract: gradients, noise, patterns, text, derived normals/AO, resize or channel operations. Provide only that variant's parameters. Do not copy a `create_noise_texture` example and add an inconsistent `kind`.

For derived/packed textures: identify the source assets and channel meaning → process → inspect output dimensions/channels/alpha → choose compression, texture group and sRGB appropriate to its use → save → sample it through the intended material. A texture may exist while using the wrong color-space interpretation.

Render targets are separate mutable rendering resources. Creating one does not bind a SceneCapture or produce a saved image; use [environment-lighting](chir24-unreal-mcp-environment-lighting.md) for that pipeline.

Sources: [material-authoring playbook](https://github.com/ChiR24/Unreal_mcp/blob/dev/plugins/EngineWire/Source/EngineWire/Private/MCP/Primitives/McpPromptPlaybooks.cpp), [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md), [Roadmap phases 8–9](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Roadmap.md), [validation record](https://github.com/ChiR24/Unreal_mcp/blob/dev/src/tools/catalog/capabilities/records/system-control/system-ops.ts). For renderer/project settings use [builds-performance](chir24-unreal-mcp-builds-performance.md).
