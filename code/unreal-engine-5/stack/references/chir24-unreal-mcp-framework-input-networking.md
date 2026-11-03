# ChiR24 Unreal MCP — Framework, input and networking

| Task | Discover under `manage_networking` |
|---|---|
| GameMode/controller/state/HUD | `create_framework_class`, `configure_game_mode`, `get_game_framework_info` |
| Start location/spawn | `configure_player_start` and the configured framework/pawn classes |
| Enhanced Input | `configure_input`, `get_input_info` |
| Replication/RPC/ownership | `configure_replication`, `configure_rpc`, `set_owner`, `check_authority` |
| Prediction | `configure_prediction` |
| LAN/split-screen/voice | `configure_session`, `host_lan_server`, `add_local_player`, `configure_voice`, `get_sessions_info` |

These families include local single-player setup even though the parent is called `manage_networking`.

## Make the intended pawn receive input

```json
{"operation":"search","query":"create input action","tool":"manage_networking","limit":2}
```

1. Read active map/world settings and configured GameMode, pawn and controller classes. Verify which settings are inherited versus overridden per map.
2. Create Input Actions with appropriate value types and an Input Mapping Context; map keys and modifiers/triggers through the described `configure_input` selector.
3. Author EnhancedInputAction event nodes bound to the actual `inputActionPath` at creation. An unbound event node can compile and never fire.
4. Register the mapping context on the local player's Enhanced Input subsystem, normally through BeginPlay. Runtime `enable_mapping` is useful for diagnosis but does not author startup registration.
5. Ensure the pawn is possessed by the intended controller; compile/save affected assets.
6. Start PIE, record a state value/transform, send key-down and then key-up, and inspect the resulting change. Sending an input event successfully does not prove a binding exists.

Missing AddMappingContext, wrong pawn/controller, paused game and UI input capture are separate causes. Diagnose them before rebuilding mappings. Inspect [ui-umg](chir24-unreal-mcp-ui-umg.md) when menus own focus.

## Configure multiplayer with runtime proof

```json
{"operation":"search","query":"configure property replication","tool":"manage_networking","limit":2}
```

Inspect actor ownership, authority, net mode and property/RPC definitions before changing replication. Configure the specific property condition, RepNotify or RPC direction/reliability supported by its contract. Replication settings alone do not implement server validation or correct game logic.

Exercise a real server/client fixture: authoritative mutation → observed client state → expected owner/non-owner differences → reconnect/relevant late-join behavior when required. Local split-screen players share a process and do not prove network replication.

For LAN sessions inspect the installed Online Subsystem and actual session state, host/join outcome and loaded map. A successful host request is not evidence another client joined. Separate LAN support from the planned online identity/lobby/friends/achievement APIs; do not invent an EOS/Steam route from engine availability.

When removing a mapping or local player, inspect the destructive policy and exact target. Restore transient input and test-session state created by the task.

Sources: [input-setup playbook](https://github.com/ChiR24/Unreal_mcp/blob/dev/plugins/EngineWire/Source/EngineWire/Private/MCP/Primitives/McpPromptPlaybooks.cpp), [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md), [Roadmap phases 20–22 and 43](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Roadmap.md). For synthetic input and PIE ownership use [runtime-verification](chir24-unreal-mcp-runtime-verification.md).
