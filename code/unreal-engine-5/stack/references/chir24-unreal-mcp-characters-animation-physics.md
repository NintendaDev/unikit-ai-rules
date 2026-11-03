# ChiR24 Unreal MCP — Characters, animation and physics

| Task | Discover |
|---|---|
| Character Blueprint/movement | `manage_character.create_character_blueprint`, `configure_character`, `setup_movement`, `get_character_info` |
| Skeleton/socket/weights | `animation_physics.get_skeleton_info`, `edit_skeleton`, `configure_socket`, `edit_skin_weights` |
| Clips/montages/blend spaces | `animation_physics.create_animation_asset`, `edit_animation`, `edit_montage`, `edit_blend_space`, `auto_blend_space` |
| Anim Blueprint/state machine | `animation_physics.create_animation_blueprint`, `edit_anim_graph`, `configure_anim_graph_node` |
| Rig/IK | `animation_physics.create_control_rig`, `get_control_rig`, `edit_control_rig`, `setup_ik`, `setup_retargeting` |
| Physics/ragdoll/cloth/vehicles | `animation_physics.edit_physics_asset`, `setup_ragdoll`, `setup_physics_simulation`, `bind_cloth_to_skeletal_mesh`, `configure_vehicle` |

## Set up a controllable character

```json
{"operation":"search","query":"configure character movement","tool":"manage_character","limit":2}
```

Inspect the character class, capsule, mesh, skeleton, movement component and controller before editing. Set movement values using the described units and fields. Verify capsule/mesh offsets and collision independently of the rendered pose. Wire possession and input using [framework-input-networking](chir24-unreal-mcp-framework-input-networking.md).

Author reusable defaults in the Blueprint; edit a placed or PIE instance only when that is the requested target. Test actual movement, jump, floor and rotation behavior in PIE, not only property values.

## Make animation reach the output pose

```json
{"operation":"describe","capability":"animation_physics.edit_anim_graph"}
```

1. Resolve compatible skeleton and clips. Inspect clip motion/root-motion settings rather than naming samples solely by filename.
2. Build the blend space and sample positions, or inspect `auto_blend_space` measurements/dry-run when available.
3. Create the Anim Blueprint and state machine, identify its entry state, and give every transition an actual condition variable/comparison.
4. Wire the state machine's Pose output to Output Pose's Result. A disconnected state machine can leave a reference pose without a warning.
5. Set the skeletal mesh's animation class and drive the variables. A montage also requires the appropriate Slot in the pose graph.
6. Compile/save, then inspect the moving character in PIE and read runtime animation state. Property readback alone cannot prove a changing pose.

For retargeting, inspect source/target rigs and real chain mappings; creating a retargeter asset does not configure its chains. For sockets, verify parent bone, local transform and the attached object's resulting world pose.

## Modify physical representation deliberately

Read the current physics asset, bodies, constraints and collision before changing them. Match bodies to real bones; inspect limits, mass, damping and the assigned physics asset. Exercise ragdoll/forces in a bounded PIE test and verify recovery if the task includes it.

Cloth binding is not a complete Chaos Cloth authoring pipeline. Basic vehicle configuration is not every advanced vehicle setup listed in Roadmap. Geometry Collection fracturing and other planned Chaos actions must be discovered independently rather than inferred from engine C++ examples.

MetaHuman creation/build/rig/export records depend on the matching optional plugins and Epic service workflow. Inspect availability/status and resulting saved content. Never treat a returned job/accepted request as a completed character.

Sources: [animation-setup playbook](https://github.com/ChiR24/Unreal_mcp/blob/dev/plugins/EngineWire/Source/EngineWire/Private/MCP/Primitives/McpPromptPlaybooks.cpp), [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md), [Roadmap phases 7, 10, 14 and 46](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Roadmap.md), [Engine API reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Engine-API-Reference.md). Roadmap contains older missing-Control-Rig notes despite current catalog entries; describe the installed capability rather than assuming complete support or absence.
