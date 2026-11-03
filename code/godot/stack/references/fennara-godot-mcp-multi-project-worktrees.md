# Fennara Godot MCP — Multiple Projects and Worktrees

> See also: [Connection](fennara-godot-mcp-connection-cli.md), [Runtime](fennara-godot-mcp-runtime-playtesting.md).

## Isolation model

| Resource | Scope | Consequence |
| --- | --- | --- |
| Canonical Project Root | Directory containing `project.godot`, resolved to filesystem identity | Names and process IDs are not project identity |
| MCP binding | One process lifetime | One bound MCP connection per distinct project/worktree |
| Godot editor | One connected editor per canonical root for unambiguous routing | Each worktree needs its own editor/addon |
| Daemon | Shared per-user service | Projects share routing infrastructure and runtime version |
| Runtime Slot | One managed game across projects | Serialize managed playtests; other work can continue |

Do not assume that creating a Git worktree changes an inherited MCP connection. A child whose native file tools use another worktree can still mutate the parent's Godot project through that connection. Give it its own correctly bound MCP process, or keep its work in the bound parent project.

## Bind at startup

Precedence:

1. `--project-path /absolute/path` (or `--project-path=/absolute/path`).
2. `FENNARA_PROJECT_PATH`.
3. Nearest startup-directory ancestor containing `project.godot`.
4. `legacy_unbound` compatibility routing if automatic discovery finds no project.

An empty, invalid, inaccessible, missing, or non-Godot explicit path fails startup. It never silently falls through. Relative paths resolve against the captured startup directory; prefer absolute paths.

Example for an MCP host using JSON:

```json
{
  "mcpServers": {
    "fennara": {
      "command": "/absolute/path/to/fennara-mcp",
      "args": [],
      "env": {
        "FENNARA_PROJECT_PATH": "/absolute/path/to/worktree-a"
      }
    }
  }
}
```

Configure worktree B in its own host/workspace with a second process and B's root. A tool-call argument cannot change projects. Retargeting a symlink also does not change a frozen binding; restart the MCP process.

`fennara mcp-setup` writes a global, neutral launcher entry. Running it from worktree A is not a permanent binding to A. Use host-supported project/workspace configuration or a documented project startup directory.

Global-only client setups require separately named, explicitly bound entries and correct selection. Do not promise automatic isolation in a host that does not supply it. Verify current host behavior rather than generalizing from another app.

## Open editors and verify

Where headless editors suit the task, Godot's own CLI can start distinct roots with separate LSP ports:

```text
godot --editor --headless --path "/absolute/path/to/worktree-a" --lsp-port 6006
godot --editor --headless --path "/absolute/path/to/worktree-b" --lsp-port 6007
```

These are long-running editor processes, not Fennara CLI calls. Manage their lifetime explicitly. Separate LSP ports do not create separate Fennara daemons.

From each MCP connection, check `fennara_status` and require the intended `bound` root, binding source, connected editor, and filesystem readiness before concurrent work.

| State | Correct response |
| --- | --- |
| `bound_project_not_connected` | Open/reconnect that same root and wait; the valid MCP process may remain running |
| `ambiguous_project_binding` | Close the duplicate editor or give it another worktree |
| `legacy_unbound` | Configure an explicit binding before relying on isolation |
| Wrong bound root | Restart with the intended startup binding |

Legacy routing uses the dock-selected MCP Target, then the sole-editor fallback. Bound routing neither reads nor changes that global target.

## Runtime contention

Editing, inspection, bounded scene validation, and detached screenshots may run across distinct projects concurrently. This does not make simultaneous edits to the **same files** safe.

For managed playtests, use the [Runtime admission loop](fennara-godot-mcp-runtime-playtesting.md). A successful response with `availability: "busy"` and `slot_acquired: false` means no slot was acquired. Wait at least `retry_after_ms` plus jitter and retry; there is no FIFO queue.

Only the owning canonical root can inspect detailed status, renew, probe, or stop a session. Another project gets anonymous contention or `runtime_session_not_owned_or_found`. Do not steal or stop another project's process.

Keep owner status alive about every 30 seconds while a session should continue. Its 120-second inactivity deadline and absolute runtime lease are distinct. Stop promptly after collecting evidence.

## Sources

See [source inventory](fennara-godot-mcp-sources.md): `multi-agent-worktrees.md`, `mcp-setup.md`, `tools.md`, generated guidelines, and `runtime_session.json`.
