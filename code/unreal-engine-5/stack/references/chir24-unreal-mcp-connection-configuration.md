# ChiR24 Unreal MCP — Connection and configuration

| Situation | Use/check |
|---|---|
| Client supports Streamable HTTP and headers | Connect to the editor's `/mcp`; Node.js is unnecessary |
| Client launches a local process, or must survive editor restarts | Use `unreal-engine-mcp-server`, the stdio-to-HTTP proxy; Node.js 20.19+ |
| Several editors | Give each a distinct native port, project token and client URL |
| Duplicate `unreal` entries | Keep one route to the intended editor |
| Client lists 23 tools | Identify an older 0.5.x plugin/server; use its matching docs or migrate |
| Plugin loaded but status reads `MCP off` | Enable native MCP, including for stdio; Fab builds ship it off |

## Establish a working connection

1. Identify the real engine version and platform. Install EngineWire from Fab, a release source archive, or a source checkout. A source build needs a C++ project and matching compiler; prebuilt binaries must match engine minor and platform.
2. Keep one plugin copy. Releases through beta-e used `McpAutomationBridge`; beta-f renamed it `EngineWire`. Migrate the folder, `.uproject` plugin entry and settings section with the editor closed. Do not keep both listeners installed.
3. Check **Project Settings → Plugins → EngineWire**. Native HTTP normally uses `http://127.0.0.1:3000/mcp`; the Fab build requires enabling `bEnableNativeMCP`. Restart after listener settings change.
4. Native HTTP sends `X-MCP-Capability-Token`. The proxy obtains it from `Saved/MCP/capability-token` using `UE_PROJECT_PATH`; `MCP_AUTOMATION_CAPABILITY_TOKEN` overrides that file. Handle tokens without printing or committing them.
5. Confirm the intended project through `ue://project` or a described project-info action. A cached tool list or successful proxy initialization does not prove the editor is reachable.

Example client configuration for Windows stdio (replace the example project path):

```json
{"mcpServers":{"unreal-engine":{"command":"cmd","args":["/c","npx","-y","unreal-engine-mcp-server"],"env":{"UE_PROJECT_PATH":"D:/Projects/BridgeSandbox","UNREAL_MCP_URL":"http://127.0.0.1:3001/mcp"}}}}
```

Use port 3001 only when that editor actually listens there. A client that launches `npx` directly need not use `cmd`. In a container use stdin without a TTY; the container must reach the loopback endpoint and obtain its token securely.

## Settings that matter

| Setting | Owner and meaning |
|---|---|
| `MCP_NATIVE_PORT` | Environment of the **editor process**, overriding its native port |
| `NativeMCPPort`, `bEnableNativeMCP` | Plugin settings in `[/Script/EngineWire.EngineWireSettings]` |
| `UNREAL_MCP_URL` | Proxy's upstream HTTP endpoint |
| `UE_PROJECT_PATH` | Project folder or `.uproject`, used to locate the token |
| `UNREAL_MCP_PROXY_CACHE` | Cached listing/instructions; separate editors when necessary |
| `LOG_LEVEL` | Proxy diagnostics on stderr |
| `bLoadAllToolsOnStart` | Internal-tool visibility, not the single public tool's existence |
| `NativeMCPInstructions` | Project guidance appended to initialization instructions |

Do not revive removed `.env`, gateway-mode, WebSocket host/port, category or timeout environment settings from 0.5 examples. Ports 8090/8091 are legacy WebSocket listeners; the 0.6 proxy uses HTTP.

## Recover by symptom

| Symptom | Next check |
|---|---|
| `NOT_CONNECTED` | Editor running, plugin loaded, native MCP enabled, correct URL/port and project token |
| HTTP 401 | Token present and current; reconnect if session identity changed |
| HTTP 400 | Client protocol/header contract; do not keep resending malformed requests |
| HTTP 403 | Origin policy and token configuration |
| HTTP 503 | Connection/session capacity; close idle clients |
| Missing modules | Build the project's Editor target with the required toolchain |
| Optional capability missing | Its `availability.requiredPlugins`, engine minimum and project build |
| Slow timed PIE | Restore the editor and inspect background CPU throttling |

The proxy stays alive while the editor is down and reconnects upstream on a later call. A direct native client may need reconnecting after editor restart. Re-read world identity and targets after either path recovers.

For remote access retain a loopback native endpoint and use an SSH tunnel or protected TLS proxy. The pinned security document forbids direct off-loopback native binding while Wiki still describes it; do not automate that older recipe. See [execution safety](chir24-unreal-mcp-execution-safety.md).

Sources: [Installation](https://github.com/ChiR24/Unreal_mcp/wiki/Installation), [Connecting Clients](https://github.com/ChiR24/Unreal_mcp/wiki/Connecting-Clients), [Configuration](https://github.com/ChiR24/Unreal_mcp/wiki/Configuration), [Upgrading](https://github.com/ChiR24/Unreal_mcp/wiki/Upgrading), [Troubleshooting](https://github.com/ChiR24/Unreal_mcp/wiki/Troubleshooting), [protocol](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/protocol.md). Engine compatibility is a target range, not certification; see the [source inventory](chir24-unreal-mcp-sources.md).
