# ChiR24 Unreal MCP — Extending the bridge

| Concern | Source location in the EngineWire repository |
|---|---|
| Capability contract | `src/tools/catalog/capabilities/records/` |
| Family selectors | `records/folds/<tool>.folds.ts` |
| Native handler | `plugins/EngineWire/Source/EngineWire/Private/Domains/<Domain>/` |
| Queue/authorization/routing | Plugin `Private/Core/` |
| Shared helpers | Plugin `Private/Foundation/` |
| Save/load/delete wrappers | Plugin `Private/Safety/` |
| Native gateway/generated schemas | Plugin `Private/MCP/` |
| Integration cases | `tests/mcp-tools/`; runner uses `unreal.execute` |

Load this reference only when changing EngineWire itself. These contributor rules do not automatically become conventions for the host game's source code.

## Add one capability end to end

1. Read the applicable upstream `AGENTS.md` files in the actual checkout being edited.
2. Write/update its record. Declare only handler-read inputs and real output fields, effect, exact scope, consent, availability, cost and task-oriented search topics. Extend a family selector when appropriate.
3. Declare the handler in the matching subsystem declaration list, implement it in the domain, and register/route it through the existing parent and dispatcher.
4. Generate all derived contracts; do not hand-edit counts, shards, definitions or documentation to hide drift.
5. Add meaningful parameter, refusal and result assertions in tests, search phrases where relevant, and live execution/readback for changed editor behavior.

Original validation sequence for a record/handler change (run in the bridge repository):

```text
npm run registry:generate
npm run registry:check
npm run manifest:check
npm run headers:check
npm run type-check
npm run test:params
npm run test:unit
npm run eval:check
```

Run lint/build and the relevant native build/live integration checks appropriate to the changed area. Schema changes require a full plugin build; Live Coding does not establish generated-contract parity or survive restart.

## Preserve native invariants

- Editor API calls run on the game thread through the one existing dequeuer. Do not add a socket-thread editor call or another queue-drain path.
- Use `McpSafeAssetSave`, `McpSafeLevelSave`, `McpSafeLoadMap` and safe deletion helpers. Direct `UPackage::SavePackage()` is forbidden by source contracts.
- Choose truthful `EMcpMutationDurability` in `FMcpScopedEditorTransaction` and report it through `DescribeInto`. Disk writes, build outputs and renders are not editor-state undo.
- Create Blueprint-owned components through SCS nodes. If an operation promises gameplay behavior, author that behavior through the established behavior recipe mechanism; setting metadata is insufficient.
- Reuse Foundation's reflection/path/auth/JSON/response helpers. Keep dispatchers thin and failure responses typed. Output projection drops undeclared properties, so every useful diagnostic must be in the declared schema.
- Guard engine-version-specific APIs and optional modules with the existing compatibility mechanisms; publish a minimum engine version when the entire handler is unavailable below it.
- Include what each file uses, honor upstream size/folder/path ceilings, and split by responsibility. Do not create `Common*` or numbered fragments to evade those ceilings.
- Keep the stdio proxy a relay, runtime logs on stderr and generated ordering byte-deterministic. The plugin remains the authorization authority.

## Test claims honestly

| Check | Proves |
|---|---|
| Unit/source-contract checks | Tested TypeScript behavior or inspected source shape |
| Parameter audit | Schema/case coverage, not native runtime semantics |
| Plugin compilation | This source compiles for this engine/platform |
| Live integration and state readback | The tested behavior on that actual engine/binary |

Success-first integration cases must not accept arbitrary error/timeout alternatives. Use narrow expected refusals and inspect output fields/state. Record engine, plugin commit, commands, results and owned-fixture cleanup. A green Node CI run does not certify live Unreal behavior.

Sources: [editor extension guide](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/editor-plugin-extension.md), [Development](https://github.com/ChiR24/Unreal_mcp/wiki/Development), [testing guide](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/testing-guide.md), [performance and evidence](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/performance-and-evidence.md). No C++ handler template is reproduced: the handler signature/macros and ownership must come from the matching upstream checkout, not a version-independent fabricated example.
