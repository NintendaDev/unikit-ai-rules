# GDAI Godot MCP — Connection and configuration

---

| Situation | First check |
|---|---|
| Initial connection | Intended Godot project open; plugin enabled; server status active in the GDAI MCP bottom tab |
| Client cannot launch Python bridge | Executable resolution for `uv`; absolute bridge path copied from the tab |
| Server appears but tools are missing | Godot/server startup order, client rediscovery, disabled-tool configuration |
| Wrong project or several projects | Project identity and distinct bridge/runtime ports; repeat discovery after switching |
| HTTP client | Installed bridge supports HTTP; URL ends in `/mcp`; HTTP port matches launch command |
| Prepare a release | Export preset excludes the plugin folder |

## Establish a connection

1. Use the plugin package and configuration shown by the intended project. Open Godot and confirm the plugin's server is running before client discovery.
2. Resolve `uv` to an executable if the client cannot find it. Keep bridge paths absolute and pass a path containing spaces as one argument.
3. Enable script external-change reload and parse-on-save editor settings when using file edits. The installation guide names both settings; some editor versions hide them behind Advanced Settings.
4. Discover tools, then request project information. Successful transport initialization alone does not identify the project.

An illustrative MCP-client **JSON fragment**, not a universal client config:

```json
{
  "command": "uv",
  "args": ["run", "D:/Godot/MyGame/addons/gdai-mcp-plugin-godot/gdai_mcp_server.py"],
  "env": {
    "GDAI_MCP_SERVER_PORT": "5010",
    "GDAI_RUNTIME_SERVER_PORT": "5011"
  }
}
```

Adapt the surrounding configuration to the client. The sample path is illustrative; copy the actual path from Godot.

## Ports and disabled tools

The project override file is `gdai_mcp_project_config.json`, created by **Override Config** in the plugin tab. After changes, restart Godot and mirror values into the client's `env` configuration.

| Setting | Documented default / meaning |
|---|---|
| `GDAI_MCP_SERVER_PORT` | `3571`, editor bridge |
| `GDAI_RUNTIME_SERVER_PORT` | `3572`, runtime bridge |
| `GDAI_DISABLE_<UPPERCASE_TOOL_NAME>` | String `"YES"` disables that tool |

Keep the documented string representation. Example: `"GDAI_DISABLE_SIMULATE_INPUT": "YES"`. Inspect actual configuration before treating a missing tool as an installation failure.

## Optional HTTP connection

The installation guide introduces Streamable HTTP in **v0.3.3**. Example PowerShell command after resolving the actual bridge path:

```powershell
uv run "D:/Godot/MyGame/addons/gdai-mcp-plugin-godot/gdai_mcp_server.py" --transport http --port 9090
```

Use `http://127.0.0.1:9090/mcp` locally. The HTTP port is separate from the editor/runtime ports above. Keep the bridge process running. Consult the official installation page for Docker-specific host/bind settings; the bridge has no built-in authentication, so do not broaden network binding as a routine fix.

## Recovery and delivery

- The common-issues page suggests relocating the bridge for path-space failures, while the newer HTTP instructions support quoted paths. Verify argument handling first; do not move an entire project as the first remedy.
- On Antigravity/Windows, the documented alternate bridge is `antigravity_windows_fix.py`. Use it only for that client/problem.
- For updates, preserve authorized local configuration and unsaved work, close Godot, replace the plugin from the official package, reopen, verify the displayed version and rediscover tools. This is a maintenance recipe, not an action required for reading these rules.
- Exclude `res://addons/gdai-mcp-plugin-godot/**` in the relevant export preset. Inspect a produced export before claiming exclusion worked. Export itself requires a separately available workflow.

Sources: [installation](https://gdaimcp.com/docs/installation), [configuration](https://gdaimcp.com/docs/configuration), [common issues](https://gdaimcp.com/docs/common-issues), [updates](https://gdaimcp.com/docs/update-guide), [exporting](https://gdaimcp.com/docs/exporting).
