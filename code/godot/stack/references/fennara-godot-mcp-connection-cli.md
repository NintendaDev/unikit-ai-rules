# Fennara Godot MCP — Connection and CLI

> See also: [Multiple projects](fennara-godot-mcp-multi-project-worktrees.md), [Maintenance](fennara-godot-mcp-maintenance-export.md), [Troubleshooting](fennara-godot-mcp-operations-troubleshooting.md).

## Pick the entry point

| Situation | Path |
| --- | --- |
| Fennara already works in the correct editor | Read its live schemas and proceed; installation is unnecessary |
| No addon/local components | Install with the CLI, then open the Godot project |
| Addon already copied into the project | Finish **Set Up Fennara** in the dock, or let CLI install matching local components |
| External MCP app lacks the server | `fennara mcp-setup --help`, choose the app, restart it |
| Need project isolation | Bind the MCP **process** at startup; setup alone is project-neutral |
| Want optional built-in chat | Read [Built-in chat](fennara-godot-mcp-built-in-chat.md); external MCP needs no Fennara provider key |

## Requirements and install

The researched version requires Godot 4.5+, Windows/Linux x86_64 or macOS arm64. C# validation additionally needs `dotnet` on PATH. Verify current release requirements before installing on another platform.

Run installation only in the intended **Godot** project, identified by `project.godot`. Installation can write generated project guidance in `AGENTS.md` and `addons/fennara/ai/`; inspect the resulting diff.

If the CLI is absent, upstream bootstrap commands are:

```powershell
irm https://raw.githubusercontent.com/fennaraOfficial/fennara-godot-ai/main/install.ps1 | iex
```

```bash
curl -fsSL https://raw.githubusercontent.com/fennaraOfficial/fennara-godot-ai/main/install.sh | sh
```

Then use explicit paths for automation:

```text
fennara --version
fennara install --project "/absolute/path/to/godot-project"
fennara doctor
fennara mcp-setup --help
```

A complete existing addon is adopted: install reads its version, validates the platform library, and installs matching shared components without replacing that addon. An explicit `--version` must agree with it. Use the maintenance reference for intentional updates.

On macOS, prefer CLI installation. If a manually extracted addon is blocked by quarantine, upstream recovery is to close Godot, remove that manually copied addon, and install through the CLI; a normal install preserves a complete existing addon.

## Configure an external client

| Target | CLI flag |
| --- | --- |
| Claude Code + Desktop | `--claude` |
| Claude Code / Desktop separately | `--claude-code` / `--claude-desktop` |
| Codex | `--codex` |
| Cursor | `--cursor` |
| Gemini + Antigravity | `--gemini` or `--antigravity` |
| Cline, VS Code, OpenCode, Windsurf, Kiro | `--cline`, `--vscode`, `--opencode`, `--windsurf`, `--kiro` |

Example: `fennara mcp-setup --cursor`. Confirm supported targets with installed help. Setup backs up the app configuration. Preserve other MCP entries, and fully restart the client afterward.

Use the stable launcher, never a specific `versions/.../fennara-mcp-runtime` executable:

| Platform | Default MCP launcher |
| --- | --- |
| Windows | `%LOCALAPPDATA%\Fennara\bin\fennara-mcp.exe` |
| macOS | `~/Library/Application Support/Fennara/bin/fennara-mcp` |
| Linux | `~/.local/share/fennara/bin/fennara-mcp` |

Resolve environment variables/`~` to a real absolute executable path in client configuration. Fennara's CLI, launchers, daemon, runtimes, and logs are per-user app data; `addons/fennara/` stays in each project.

For a JSON client using `mcpServers`:

```json
{
  "mcpServers": {
    "fennara": {
      "command": "/absolute/path/to/fennara-mcp",
      "args": ["--project-path", "/absolute/path/to/godot-project"],
      "env": {}
    }
  }
}
```

For a TOML client:

```toml
[mcp_servers.fennara]
command = "/absolute/path/to/fennara-mcp"
args = ["--project-path", "/absolute/path/to/godot-project"]
startup_timeout_sec = 30
tool_timeout_sec = 300
```

Match the client's actual format. VS Code uses `servers` plus `type: "stdio"`; OpenCode uses `mcp` plus `type: "local"` and a command array. Do not translate one structure mechanically into another. Upstream recommends a 30-second startup and 300-second tool budget; some JSON clients express 300 seconds as `300000` milliseconds.

## Binding and verification

Binding precedence is `--project-path` → `FENNARA_PROJECT_PATH` → nearest startup-directory ancestor containing `project.godot` → `legacy_unbound`. Invalid explicit paths fail startup. A process never accepts a per-tool project override; restart it to change its binding.

After opening the intended editor, call `fennara_status` with `{}`. Read its returned text and confirm:

- the expected canonical Project Root and, for isolated work, `bound` routing;
- binding source and connected bound editor;
- component version agreement and advertised tools;
- filesystem readiness rather than an active scan/import;
- renderer and target-platform warnings when rendering matters.

If the editor is scanning/importing, wait a meaningful interval without more asset calls, then check status once. Status describes project readiness, not the validity of one particular asset.

MCP names may have a client namespace prefix. Discover the exact callable tool and schema instead of inventing that prefix. The status output is a text block, not a guaranteed JSON field layout.

## Boundaries

`fennara doctor` checks installation health; it does not prove the MCP client routes to the intended editor. `fennara mcp-setup` connects the client; it does not configure the dock's model or bind all future connections to the current directory.

No extra provider key or built-in chat setup is needed for external MCP. A broken optional webview does not by itself mean the MCP tools are broken.

## Sources

See [source inventory](fennara-godot-mcp-sources.md): `setup.md`, `cli.md`, `manual-install.md`, `mcp-setup.md`, `chat-vs-mcp.md`, `multi-agent-worktrees.md`, and generated guidelines.
