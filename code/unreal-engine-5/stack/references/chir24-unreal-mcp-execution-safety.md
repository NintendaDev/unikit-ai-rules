# ChiR24 Unreal MCP — Execution, receipts and recovery

| Evidence | Meaning |
|---|---|
| `success`, `data`, receipt | Inspect all; transport success alone is insufficient |
| `warnings`, failed/unknown expectations | The change may have occurred but acceptance remains unmet |
| Task state `queued`/`running` | Unfinished work; retrieve its outcome |
| `DELETE_PARTIAL` / `PARTIAL_FAILURE` | Some effects occurred; reconcile before retry |
| `undo`/durability information | Determines what editor undo can actually reverse |
| Saved package/file readback | Evidence of persistence, separate from editor visibility |

## Build the envelope correctly

```json
{"operation":"execute","capability":"control_actor.spawn","params":{"classPath":"/Script/Engine.PointLight","actorName":"ReviewLamp","location":[120,40,260]},"options":{"idempotencyKey":"review-lamp-create-01","expect":["ReviewLamp exists"]}}
```

This original example targets the documented spawn contract. Describe it first in the installed version. `action`, `subAction`, `operation`, `consent` and execution `options` do not belong inside `params`. Parameter names and types are exact and case-sensitive.

## Authorization and consent

- Read policy per capability and per parameter. Scopes form an exact set: Write does not imply Read; Admin is the wildcard. A nominal read can need Write when a parameter presses keys or chooses a file destination.
- A capability declaring `explicit`/`elevated` consent needs the **fresh `consentGrant` returned by describe**, including capability, acknowledgement and server-issued nonce, copied to the top-level `consent` field. Do not fabricate a nonce or copy a nonce-less example from an older document.
- The grant covers one invocation. Handler entry spends it, even if execution later fails. A pre-handler refusal may return it. On `CONSENT_REUSED` or `CONSENT_NOT_ISSUED`, obtain a fresh grant and inspect state before rerunning a mutation.
- Obtaining and echoing the bridge grant is a protocol step within already authorized work. Ask the user only for genuinely missing authorization or a required client elicitation; do not create a second blanket approval workflow.
- Never bypass scope/path/project/console refusals with reflection, Python or another transport. The plugin remains the authority.

## Revisions, preconditions and retries

| Option | Use |
|---|---|
| `expectedCatalogRevision` | Refuse a call built against a changed catalog |
| `expectedRevisions` | Pin selection, level, asset registry or package revisions when stale writes matter |
| `require` | Preconditions checked before execution; failed/unknown means `PRECONDITION_FAILED` and no handler work |
| `expect` | Postconditions; failed/unknown verdicts do not undo or fail the already executed mutation |
| `idempotencyKey` | Replay the same intended request safely; changing its fingerprint produces a conflict |
| `timeoutMs` | Requested deadline within the installed contract; not proof the handler stopped |

The pinned implementation also declares `pageCursor` and `aggregate`; Wiki's four-option list is older. Never send an option merely because this reference mentions it: confirm the installed envelope.

The idempotency ledger is principal/capability scoped, bounded and expiring. It does not make a failure atomic, persist through arbitrary server changes, or authorize a call. After an ambiguous failure inspect the resulting actors/assets, then reuse the same key for the same intent where supported. Do not issue a fresh create key to recover an uncertain create.

## Long work and cancellation

The Wiki documents an early task receipt around 27 seconds. When a reply provides a task, preserve its actual id:

```json
{"operation":"configure","action":"get_task_result","params":{"taskId":"num:41"}}
```

`num:41` is illustrative; use the returned id. Wait/poll with reasonable spacing, inspect the final `outcome`, and treat `TASK_NOT_FOUND` as a reason to inspect editor/output state. Some versions/protocols expose MCP tasks instead; use only advertised support. Do not confuse a packaging job id with a gateway task id.

Cancellation removes queued work where possible. Already dispatched editor work can finish even when its response is suppressed. Timeout, stream close and cancellation do not prove rollback. Read state before issuing another write.

## Bounded results and errors

- Prefer filters, projections and limits. If a result carries `page.nextCall`, send it with the same capability/params; a cursor page reads cached results rather than repeating the mutation. Cursors can expire or mismatch.
- `aggregate` counts the returned list, potentially only one page. Check its note and the underlying limit before claiming a project-wide total.
- Schema errors: follow `pointer`, allowed names, suggestions and `nextCall`. Stale state: inspect afresh and reassess the edit. Disabled tool: configure only what is required.
- `EDITOR_BLOCKED`: inspect the editor/modal state; do not queue more writes behind it. `RATE_LIMITED`/`QUOTA_EXCEEDED`: honor retry timing. Output-schema/size errors after dispatch may still accompany effects; preserve details and inspect.
- Keep `/Game` package roots distinct from filesystem paths. Name full targets for path-scoped principals; reported content mounts do not grant arbitrary file access. Capture/export files must use the implementation's permitted project paths.

Sources: [security and receipts](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/security-and-receipts.md), [gateway guide](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/gateway-client-guide.md), [protocol](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/protocol.md), [native envelope definition](https://github.com/ChiR24/Unreal_mcp/blob/1f64129a5d61a6dbaa490f76578571a1c9cf695a/plugins/EngineWire/Source/EngineWire/Private/MCP/Gateway/McpNativeGatewayDefinition.cpp). See [source discrepancies](chir24-unreal-mcp-sources.md) for protocol-version differences.
