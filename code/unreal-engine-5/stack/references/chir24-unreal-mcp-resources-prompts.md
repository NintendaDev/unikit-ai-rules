# ChiR24 Unreal MCP — Resources and prompts

| Resource | Use |
|---|---|
| `ue://project` | Project/engine identity and content-root context |
| `ue://health` | Readiness and diagnostics |
| `ue://automation-bridge` | Bridge diagnostics and activity |
| `ue://capability/catalog` | Bounded catalog summary and visibility revision |
| `ue://state/revisions` | Counters for selective stale-write protection |
| `ue://changes` | Current change-journal cursor on versions that expose it |
| `ue://capability/{capabilityId}` | Short record; use describe for the complete contract |
| `ue://knowledge/{topic}` | Stable engine notes |
| `ue://asset/{assetPath}` | Normalized asset handle, not a full live asset inspection |

## Context is read separately from execution

Discover the server's resources/templates/prompts with the client's available MCP facilities. Attach only the resource relevant to the question. Reads are bounded to 64 KiB and can be normalized/redacted; they are not a project dump.

Do not request `ue://assets`, `ue://actors`, `ue://editor` or `ue://selection` as live-state resources. Native socket-thread reads cannot wait for editor work and return `RESOURCE_UNAVAILABLE`. Obtain current state through capabilities instead:

```json
{"operation":"search","query":"list selected actors","effect":"read","limit":2}
```

For journal-aware clients, read the cursor, discover `inspect.changes_since`, and consume only the needed changes. Use subscriptions only when the transport advertises them: the pinned native transport supports `ue://changes`, while the stdio proxy does not open the GET stream needed to advertise subscriptions.

## Prompt selection

| Workflow prompt | Task |
|---|---|
| `inspect-fix` | Inspect a named UObject and correct a property |
| `asset-import` | Inspect a supplied destination/source and validate import |
| `level-build` | Create a level, build lighting and save |
| `blueprint-edit` | Inspect/edit/compile a Blueprint |
| `validation` | Project/asset/level validation |
| `sequence-render` | Prepare and render a sequence |

The pinned `dev` additionally defines nine playbooks: `blueprint-logic`, `input-setup`, `widget-ui`, `niagara-vfx`, `material-authoring`, `world-building`, `animation-setup`, `cinematics`, `play-testing`. Discover `prompts/list`; do not assume an older installation has all fifteen.

For example, obtain `widget-ui` with a goal such as “a pause menu with resume and settings”, then follow its capability order with current describe contracts. A prompt returns text; retrieving it creates no widget and grants no authorization. Do not repeatedly fetch all prompts into context.

Completions supply suggestions for prompt arguments and template variables. They are bounded (100 values, 8 KiB in the pinned docs), not an authoritative full asset inventory. Resolve selected paths through inspection.

## Progress and protocol

Use `_meta.progressToken` on the MCP `tools/call` envelope when supported, outside the arguments passed to `unreal`. Correlate notifications with that token and inspect the final result. Sources disagree on progress without a token; absence of progress does not prove a hang.

Session-based initialization documents `2025-11-25`, `2025-06-18` and `2025-03-26`. The newer `2026-07-28` path is a separate per-request protocol with different headers, elicitation and task rules; do not send it as an initialization version. Let the client implement negotiation rather than handcrafting undocumented HTTP messages.

Sources: [MCP primitives](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/mcp-primitives.md), [Resources and Prompts](https://github.com/ChiR24/Unreal_mcp/wiki/Resources-and-Prompts), [protocol](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/protocol.md). For retries/tasks see [execution safety](chir24-unreal-mcp-execution-safety.md).
