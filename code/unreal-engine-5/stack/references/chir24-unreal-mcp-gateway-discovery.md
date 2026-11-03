# ChiR24 Unreal MCP — Gateway discovery

| Need | Gateway operation |
|---|---|
| Find a task from its intent | `search` with a short verb/object query |
| Browse the taxonomy | `describe` → domain → family → capability |
| Read an exact callable contract | `describe` with `capability`, or `tool` and `action` |
| Clarify one parameter | Add `param` to that describe |
| Execute | Copy the described `nextCall`, then fill `params` |
| Enable a disabled internal tool | `configure`, following the returned guidance |

## Discover without loading everything

```json
{"operation":"search","query":"set actor material","limit":3}
```

Read each candidate's summary, effect, availability, `runnable`, policy and outputs. A lexical first hit is not proof of a match. Check `whenToUse` and `whenNotToUse` when ambiguous.

```json
{"operation":"describe","capability":"control_actor.set_material"}
```

Copy the reply's execute selector exactly. A `tool` summary contains action names and `browse`, not the action input schema. Drill down before supplying action-specific arguments.

- Prefer 2–4 meaningful words. Filter by `tool`, `domain`, `family`, `effect` or capability when a query is broad. `effect: read` supports inspection tasks, but still inspect parameter-raised scopes.
- Search normally returns 12 rows and caps at 25. Follow `nextCursor` as `cursor`; obey byte-budget/truncation metadata. Describe listings can also page through `offset`.
- A first row can carry a complete `signature` and `executeCall` when unambiguous and consent-free. Use it for a fully understood call; otherwise describe.
- If a query returns nothing, rephrase or browse a domain. Do not dump every schema into context.
- Search can offer saved recipes separately. Inspect their scope and script before reuse; they are project content, not new MCP tools.

## Families, names and selectors

A capability family combines operations behind a parameter such as `edit`, `kind`, `setting` or `spawnKind`. Its contract lists selector values and variant-specific parameters. The advertised action may differ from the canonical capability suffix.

```json
{"operation":"describe","tool":"manage_asset","action":"create_noise_texture"}
```

This legacy pair resolves to a texture family and can pin its noise selector. A caller-supplied selector is not overwritten; avoid contradictory selector/member combinations.

- New calls should use the returned canonical selector. Both `capability` and `{tool, action}` are accepted when they resolve to the same record; disagreement is `FORM_CONFLICT`.
- Declared aliases are valid; a namespace or similarly named server is not a license to invent a route. `ALIAS_CONFLICT` requires disambiguation.
- Direct MCP calls named `manage_asset`, `control_actor`, etc. are removed on 0.6. Send their migration `nextCall` through `unreal`.
- `UNKNOWN_CAPABILITY`, `UNKNOWN_ACTION` and invalid selectors carry suggestions and a next step. Follow them instead of trying casing variants at random.

## Configuration is a separate operation

```json
{"operation":"configure","action":"get_status"}
```

Inspect status before changing visibility. Enable just the missing tool/category through the advertised action; avoid resetting all categories unnecessarily. `inspect` and `manage_tools` remain available. The public listing remains one `unreal` tool even when internal categories change.

An enabled record can still require an absent engine plugin, a newer engine or a different editor state. Respect `availability`; `ENGINE_VERSION_UNSUPPORTED` is not repaired by enabling the category.

Sources: [gateway guide](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/gateway-client-guide.md), [Using the Gateway](https://github.com/ChiR24/Unreal_mcp/wiki/Using-the-Gateway), [Tools Reference](https://github.com/ChiR24/Unreal_mcp/wiki/Tools-Reference). For call results and recovery load [execution safety](chir24-unreal-mcp-execution-safety.md).
