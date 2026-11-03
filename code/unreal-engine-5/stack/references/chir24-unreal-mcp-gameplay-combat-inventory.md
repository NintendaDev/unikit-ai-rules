# ChiR24 Unreal MCP — Combat, GAS, items and interaction

| Outcome | Capability families |
|---|---|
| Weapon/projectile/damage | `manage_combat.create_combat_asset`, `configure_weapon`, `configure_projectile`, `configure_damage`, `apply_damage`, `get_combat_info` |
| Abilities/attributes/effects | `manage_gas.create_gas_asset`, `configure_asc`, `configure_ability`, `configure_attribute_set`, `configure_gameplay_effect`, `get_gas_info` |
| Items/loot/crafting | `manage_inventory.create_inventory_asset`, `configure_item`, `configure_loot`, `configure_crafting`, `get_inventory_info` |
| Doors/chests/switches/traces | `manage_interaction.create_interactable`, `configure_interactable`, `get_interaction_info` |
| Authored behavior recipes | `blueprint.add_behaviour`; inspect the selected variant's authored logic |

## Build a projectile interaction

```json
{"operation":"search","query":"configure projectile collision","tool":"manage_combat","limit":2}
```

Resolve or create the intended projectile Blueprint → configure visual and collision components → configure movement/speed/gravity/homing → wire spawn, owner/instigator and hit behavior → compile/save → trigger firing in PIE.

Check collision on both participants and verify a durable result such as the target's health delta, hit counter or destruction. A projectile can disappear before a follow-up actor list. A `configure_projectile` success does not prove that input fires it, damage is applied once, or the owner is excluded.

For weapon attachments inspect socket/bone and relative transform. For an existing combat system prefer a bounded change over creating a second unrelated damage path.

## Configure GAS as a connected system

```json
{"operation":"describe","capability":"manage_gas.configure_asc"}
```

Inspect ASC ownership/initialization, owner/avatar, attribute sets, abilities, gameplay effects and tag references. Create referenced assets before assigning them. Configure ability costs/cooldowns/policies and effect duration/modifier/stacking using described selectors.

Read the configured assets back, compile relevant Blueprints, save, then activate through the actual gameplay path. Check attribute values, costs, cooldown/tag changes and repeated activation. In multiplayer also check authority/replication; a locally visible attribute does not prove synchronization.

Do not infer arbitrary ability tasks, targeting, cue-trigger authoring or gameplay-tag creation from the presence of GAS. Some are roadmap scope rather than callable capabilities. Discover the missing part or author it through a verified Blueprint/code path.

## Items, loot and crafting

Inspect existing item/category identifiers and table/schema relationships. Create a data asset or recipe, set supported fields, and read the result back. Verify stack/crafting requirements in a real inventory flow, including insufficient ingredients/full slots and repeat use where relevant.

A loot table entry is data; it does not itself spawn drops or grant items. The inventory catalog does not promise every inventory component/equipment/pickup feature in Roadmap. Identify the actual component and authored runtime logic before claiming an end-to-end inventory.

## Doors and interactables

Example task sequence: inspect door/interface and collision → configure interaction range/trace and door behavior → wire input and the actual call → compile/save → approach, interact, verify movement/state, leave range and verify refusal. Test repeat/open-close behavior if requested.

A trigger or interface asset without callers/events is incomplete behavior. Read the Blueprint and runtime values when a shortcut's message says setup succeeded. Use [blueprints](chir24-unreal-mcp-blueprints.md) for missing logic and [runtime-verification](chir24-unreal-mcp-runtime-verification.md) for acceptance.

Sources: [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md), [Roadmap phases 13, 15, 17 and 18](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Roadmap.md), [Engine API reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Engine-API-Reference.md). The task sequences are authored guidance, not assertions that asset creation supplies all game logic.
