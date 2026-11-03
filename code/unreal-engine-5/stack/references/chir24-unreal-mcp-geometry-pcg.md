# ChiR24 Unreal MCP — Geometry and PCG

| Task | Discover |
|---|---|
| Primitives/SDF | `manage_geometry.create_primitive` |
| Topology/modeling | `edit_dynamic_mesh`, `model_mesh`, `boolean_mesh`, `deform_mesh`, `optimize_mesh` on `manage_geometry` |
| UVs/material regions | `manage_geometry.edit_uvs`, `edit_dynamic_mesh` |
| Collision/LOD/Nanite | `configure_mesh_collision`, `configure_mesh_lods`, `convert_to_nanite` on `manage_geometry` |
| Persistent mesh asset | `manage_geometry.convert_to_static_mesh` |
| Inspect geometry | `manage_geometry.get_mesh_info`, `inspect.check_mesh`, `inspect.raycast_mesh` |
| Procedural graph | `manage_pcg.edit_pcg_graph`, `add_pcg_node`, `execute_pcg_graph` |

## Model and retain a mesh

```json
{"operation":"search","query":"create mesh primitive","tool":"manage_geometry","limit":2}
```

Describe the selected primitive and coordinate conventions. Create a bounded test shape, inspect its dimensions/topology, then perform edits sequentially. Boolean operands must be valid geometry in compatible spaces; inspect the result for holes, degenerates and normals before further operations.

Use the contract's region selector when changing only faces/material ids. Keep modeling operations on the intended Dynamic Mesh; a geometry-script operation is not a Modeling Tools UI command on whatever mesh happens to be selected.

Primitive geometry may have **no collision**. Explicitly generate the appropriate simple/complex collision, then verify with a trace and a player/physics interaction. Rendered geometry alone does not prove a blocking surface.

Assign UVs, normals/tangents and material slots as needed; inspect them rather than assuming the generator supplied usable values. Convert the final Dynamic Mesh to a Static Mesh at a named package path when persistent reusable content is required. Save its assets and owning level; inspect the reloaded mesh.

Subdivision modes can need Mesh Modeling Toolset. Nanite/LOD configuration depends on engine/platform/mesh compatibility; inspect availability and output rather than claiming conversion success from a flag alone. Chaos fracturing/Geometry Collection creation in the Roadmap is separate from this supported modeling surface.

## Build a PCG graph

```json
{"operation":"describe","capability":"manage_pcg.edit_pcg_graph"}
```

1. Check that the **project itself enables PCG** and EngineWire was built with PCG support. An enabled internal category does not add a missing compiled module.
2. Create/open the graph; resolve input terrain/spline/volume and target bounds.
3. Add sampler/filter/transform nodes and a spawner through described family selectors. Connect real returned node ids and pin names.
4. Set density, seed, mesh and bounds explicitly for a reproducible bounded sample.
5. Execute and inspect the generated instances/actors, placement, collision and material references. A saved graph can still generate nothing because its inputs or bounds are wrong.
6. Save graph/settings and any intended world changes. Exercise regeneration; do not duplicate generated actors manually to conceal an empty graph.

Use deterministic seeds when the live node contract supports them. For repeated execution inspect replacement/cleanup behavior before rerunning a large spawn.

Sources: [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md), [Roadmap phases 6, 27 and 45](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Roadmap.md), [engine API reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Engine-API-Reference.md), [native playbooks](https://github.com/ChiR24/Unreal_mcp/blob/dev/plugins/EngineWire/Source/EngineWire/Private/MCP/Primitives/McpPromptPlaybooks.cpp). Engine API snippets are implementation guidance based on UE 5.6, not callable MCP schemas.
