# Fennara Godot MCP — Operations and Troubleshooting

> See also: [Setup](fennara-godot-mcp-connection-cli.md), [Maintenance](fennara-godot-mcp-maintenance-export.md), [Runtime](fennara-godot-mcp-runtime-playtesting.md).

## Symptom to next step

| Symptom | Inspect | Next action |
| --- | --- | --- |
| CLI absent from PATH | Installed `bin` and a fresh terminal | Repair PATH or install the CLI through the documented bootstrap |
| Server absent in the MCP client | Actual config, absolute stable launcher, syntax, app reload | Repair that client's config; restart it |
| Status shows another bound root | Process startup arguments/environment/directory | Restart the MCP process with the intended binding |
| `bound_project_not_connected` | Expected canonical root and editor | Open/reconnect that project; wait |
| `ambiguous_project_binding` | Duplicate editors for the same filesystem identity | Close the duplicate or use a distinct worktree |
| `legacy_unbound` during concurrent work | Missing automatic/explicit binding | Give the connection its own root binding |
| Scanning/importing | `fennara_status` readiness | Wait without hammering tools, then check once |
| Imported asset has no valid sidecar | Godot's source import/readiness | Finish importing before calling the asset worker |
| Missing or wrong native API | Real class and `get_class_info` | Correct the API before blaming placeholder semantics |
| Worker parse/type error | Returned `script_path` and diagnostics | Patch that exact worker; rerun by path |
| Scene reports no saved change | `modified`/`scene_saved` and intended mode | For an intentional edit, ensure the correct graph changed and was marked; read back persistence |
| Scene save rejects inheritance/ownership | Worker and preserved original scene | Narrow the override; stop owning instance internals |
| Import edit failed | Typed option metadata, result and recovery status | Choose supported changes; verify whether restoration succeeded |
| Clean C# diagnostics but old runtime | Diagnostic output versus real Debug assembly | Let managed runtime start perform its authoritative build |
| Runtime start returns successful busy | `slot_acquired`, `availability`, retry hint | Wait with jitter; do not treat it as a launched game |
| Runtime session expired | End reason and saved log | Treat as terminal; acquire a new bounded session if needed |
| Empty/sparse image with successful encoding | Pixels, framing/occupancy metrics, renderer, selected nodes | Correct framing/context; encoding success is insufficient |
| Install/update failed | `fennara diagnostics` operation report | Use documented repair/recovery, preserving the operation ID |
| Optional chat webview fails | `fennara doctor` and platform prerequisite | Repair the webview or use browser chat; MCP may remain usable |

This table is a decision procedure rather than a code example: its branches depend on observed diagnostics, not a reusable universal repair script.

## Recover a lost or timed-out tool result

A client timeout does not prove the Godot-side operation stopped. Do not immediately repeat a mutation or expensive scan.

Fennara records lifecycle events under:

```text
user://.fennara/tool_logs/<session_id>/calls.jsonl
```

The bracketed segment represents an observed tool-log session directory, not necessarily a managed runtime session ID. Use returned absolute paths when available; `user://` is this Godot project's user-data root, not `res://` or the repository root.

1. Find the relevant call by request ID, tool, scene path, worker path, or distinctive input.
2. Read its latest `received`, `started`, `completed`, or `failed` event.
3. For a terminal event, follow the saved result/artifact path and use that evidence.
4. For `started`, wait and check once more instead of launching overlapping work.
5. If work remains unfinished beyond its supported window, reduce scope and establish that another retry is safe.

Use the MCP client's ordinary file tools to inspect returned absolute artifact paths. Built-in chat has project-aware reading tools; do not assume those are advertised to an external MCP client.

For a known absolute log path, an ordinary PowerShell inspection might be:

```powershell
Get-Content -LiteralPath "D:/GodotUserData/Example/.fennara/tool_logs/observed-id/calls.jsonl" -Tail 20
```

Use the actual returned path, not this illustrative location. Runtime scripts usually share their session artifact directory; the full runtime log can contain evidence omitted from a receipt.

## Narrow expensive workers

Start from saved hierarchy, exact node properties, source search, or a tiny probe. Before a large traversal:

- skip irrelevant subtrees early;
- cache bounds, classifications, parent/resource data;
- cap nodes, frames, candidates, samples, and output;
- log concise milestones/counts rather than per-frame dumps;
- reuse a complete saved worker through `script_path` or load a focused project utility.

A 300-second client timeout is not permission for an unbounded algorithm. After a timeout, reduce work rather than just extending the timeout. If the same call fails twice for the same reason, stop repeating it and investigate the next concrete cause; continue useful independent work.

## Installation and platform failures

Use `fennara doctor` for layout/version/daemon/webview state and `fennara diagnostics --operation "id" --json` for durable lifecycle failures. These do not replace gameplay logs.

| Platform issue | Documented remedy |
| --- | --- |
| Windows `VCRUNTIME`/`MSVCP` missing, `0xc0000135` or `-1073741515` | Install Microsoft Visual C++ Redistributable 2015–2022 x64, then rerun version/doctor/install |
| Windows optional embedded chat unavailable | Check Microsoft Edge WebView2 Runtime |
| macOS manually extracted native addon blocked | Follow CLI reinstall flow; do not rely on in-editor bootstrap to load a blocked library |
| Linux embedded chat missing CEF | Let install/update manage the shared CEF payload outside the addon |
| Version mismatch after activation | Restart affected old editor/MCP processes and compare status |
| C# diagnostics unavailable | Check `dotnet` and the selected project/solution graph |

Never publish raw credentials or control tokens while diagnosing local transport. Prefer the sanitized operation report. Do not manually manipulate internal active-version markers to bypass a rejected update.

## Evidence integrity

A tool failure, partial image, skipped resource, unavailable language server, or unverified rollback is a real limitation to report. Do not turn it into a clean validation claim. Conversely, expected no-save inspection results, successful Runtime Slot contention, and intentional validation stops are not automatically defects.

## Sources

See [source inventory](fennara-godot-mcp-sources.md): generated `operations.md`/guidelines, `setup.md`, `faq.md`, `cli.md`, `mcp-setup.md`, and affected tool schemas.
