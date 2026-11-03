# ChiR24 Unreal MCP — Actors and levels

| Task | Discover |
|---|---|
| Find exact actors and components | `control_actor.list`, `find`, `find_by_tag`, `get_components`, `get_transform` |
| Place or rearrange | `control_actor.spawn`, `set_transform`, `attach`, `detach`, `duplicate`, `edit_component` |
| Relational placement and diagnosis | `describe_relations`, `arrange_by_relations`, `audit_placement`, `fix_placement`, `fix_coplanar` on `control_actor` |
| Map lifecycle | `manage_level.list_levels`, `get_summary`, `create_level`, `load`, `save` |
| Streaming/sublevels | `manage_level.add_sublevel`, `stream`, `move_actors_to_level` |
| Partition/data layers/HLOD/instances | `manage_level_structure.create_level_structure`, `configure_level_streaming` |
| Volumes | `manage_level_structure.create_volume`, `set_volume_properties`, `get_volumes_info` |

## Place an actor with evidence

```json
{"operation":"describe","capability":"control_actor.spawn"}
```

Resolve an existing mesh/Blueprint/class before spawning. The spawn family distinguishes class, Blueprint and batch through `spawnKind`; only send parameters for that variant. Use a unique stable name/tag and verify the returned handle rather than assuming the requested name was accepted unchanged.

For a row/grid or many equivalent targets, prefer supported batch/arrangement inputs. Inspect one representative before expanding. Do not silently replace a requested mesh with an empty actor after `MESH_NOT_FOUND`.

After placement inspect transform, world bounds, component and material assignment. Read warnings for ground penetration, floating, overlap, coplanar faces or pasted duplicates. An editor pivot is not necessarily the visual object's base. Inspect intentional intersections individually; never label all placements acceptable to suppress diagnostics.

```json
{"operation":"search","query":"audit actor placement","effect":"read","limit":2}
```

Use a dry-run repair only if the action declares it. Review proposed moves before applying them. Attachments need an explicit parent/component/socket and transform rule; read the hierarchy and world transform afterward. Re-resolve renamed actors before dependent calls.

## Save and change maps

1. Read editor/PIE state and `manage_level.get_summary`. Establish which map owns the target actor; a selection is not durable targeting.
2. Check dirty packages before loading another map. On `DIRTY_PACKAGES`, preserve the intended changes or apply an explicitly authorized discard choice; never set `discardUnsaved` just to clear the error.
3. Execute load/create/save using the described package path. Verify the current map and resulting packages.
4. Persist actor edits through the owning level and any affected asset packages. `save_all` can include unrelated dirty content; use target filters when available.

PIE spawns generally belong to the running world and disappear when Play stops. To author permanent level content operate in edit state, or explicitly transfer the desired values through a supported workflow. Do not report a runtime actor as saved level content.

## Streaming and spatial ownership

For a streamed sublevel or data layer: inspect the existing structure → create/assign → configure load/visibility policy → save the affected map/assets → exercise load/unload in the intended world. Existence of a sublevel does not prove its runtime streaming condition.

For a trigger/blocking/nav/audio/post-process volume: choose the correct volume type, read dimensions versus half-extents from its contract, set collision/effect properties, inspect world bounds, and exercise its boundary. A generic box actor is not a working gameplay volume.

Example discovery for a large-world task:

```json
{"operation":"search","query":"assign actor data layer","tool":"manage_level_structure","limit":2}
```

Sources: [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md), [world-building playbook](https://github.com/ChiR24/Unreal_mcp/blob/dev/plugins/EngineWire/Source/EngineWire/Private/MCP/Primitives/McpPromptPlaybooks.cpp), [gateway guide](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/gateway-client-guide.md). For collision generation see [geometry-pcg](chir24-unreal-mcp-geometry-pcg.md); for behavioral checks see [runtime-verification](chir24-unreal-mcp-runtime-verification.md).
