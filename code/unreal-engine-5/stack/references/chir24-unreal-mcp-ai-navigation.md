# ChiR24 Unreal MCP — AI and navigation

| Task | Discover under `manage_ai` |
|---|---|
| Controller/BT/Blackboard | `create_ai_controller`, `create_behavior_tree`, `edit_blackboard`, `edit_behavior_tree`, `run_behavior_tree` |
| Perception | `setup_perception`, `set_focus` |
| EQS | `edit_eqs_query` |
| StateTree/Smart Objects/Mass | `edit_state_tree`, `edit_smart_object`, `edit_mass_entity` |
| Navigation setup/path | `configure_navigation`, `create_nav_actor`, `get_ai_info` |
| Inspect tree/layout | `get_tree`, `get_ai_info`, `analyze_level_layout` |

## Make one AI work before multiplying it

```json
{"operation":"search","query":"create behavior tree","tool":"manage_ai","limit":2}
```

Inspect the pawn, controller, possession rules, navigation bounds and existing assets. Create or select a Blackboard, declare typed keys, then create the Behavior Tree referencing that board. Add nodes/services/decorators and connect actual returned ids in the intended order.

Read the tree back: root/composite wiring, task settings, key selectors and decorators must match the intended behavior. Assign both tree and Blackboard to the correct AI controller, start it through the supported workflow, compile/save affected assets, and test one possessed pawn in PIE.

For perception, verify component ownership, sense settings, affiliation/team and the event path updating Blackboard state. A configured sense does not prove that the intended target is detected or selected.

## Separate reachability from observed movement

```json
{"operation":"search","query":"navigation path","tool":"manage_ai","effect":"read","limit":2}
```

Configure agent radius/height and bounds to match the pawn, rebuild navigation if needed, and inspect a full path between real positions. A partial path or absent NavMesh is not successful reachability.

Then exercise movement: controller owns pawn → movement task runs → pawn progresses → goal is reached without collision/stuck/fall errors. Nav links need the correct endpoints, direction and agent compatibility; test traversal itself. Use the PIE playtest reference when driving a pawn is appropriate.

## Other AI models

For EQS: establish querier/context → add generator/tests/scoring → inspect settings → evaluate in the intended world → verify selected result and its use. Creating a query does not connect it to the tree.

For StateTree: verify engine/plugin availability, schema/context, entry state, tasks and transitions. For Smart Objects: verify definition, slots, behavior and user/claim flow. For Mass: verify config/fragments/processors/spawner and actual spawned entities. Treat these as separate runtime systems, not synonyms for Behavior Tree nodes.

Use minimal test fixtures and inspect task failures, Blackboard values and runtime logs. Do not clone hundreds of AI actors until one demonstrates the intended perception, decision and movement loop.

Sources: [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md), [Roadmap phases 16 and 25](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Roadmap.md), [Engine API reference, AI and navigation](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Engine-API-Reference.md). For NavMesh bounds use [actors-levels](chir24-unreal-mcp-actors-levels.md); for evidence use [runtime-verification](chir24-unreal-mcp-runtime-verification.md).
