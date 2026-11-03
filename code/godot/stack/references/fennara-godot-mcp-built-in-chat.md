# Fennara Godot MCP — Optional Built-In Chat

> See also: [External MCP setup](fennara-godot-mcp-connection-cli.md), [Troubleshooting](fennara-godot-mcp-operations-troubleshooting.md).

## Choose the conversation surface

| Choice | Model/account | Configuration |
| --- | --- | --- |
| External MCP app | That app's own account/subscription/API setup | `fennara mcp-setup` or its MCP config |
| Built-in Fennara dock | Provider selected in Fennara Chat Settings | **Chat Settings → Chat → Open providers** |
| Fennara chat in a system browser | The same built-in provider/history/project | Enable browser display and restart Godot |

No Fennara provider setup is required to use external MCP. Connecting an external app does not transfer its subscription into Fennara's dock. Browser display is not another provider or the external app.

These are UI configuration procedures; no public Fennara CLI provider-configuration command is documented. Do not invent one or modify daemon credential files directly.

## Provider and model workflow

1. Open the provider picker in Chat Settings or type `/provider` in the built-in composer.
2. Choose a cloud provider and supply the user's own appropriate credential, or connect a local server.
3. Use `/model` to choose a compatible available model.
4. Confirm that the selected model supports text and tool calls; image context additionally needs image-input support.

`/provider` and `/model` are composer UI commands, not shell commands, MCP tools, or text prompts sent to the model.

Upstream supports cloud provider families and local endpoints; consult the installed picker/current `providers.md` for exact choices, credential types, and model IDs rather than freezing a list of model recommendations.

Stored API keys, custom headers, provider definitions, URLs, selected model, history, and reasoning settings live in daemon-managed local app data outside the Godot project. Do not put them under `addons/fennara/` or commit them into the repository.

## Local endpoint examples

| Server | Default URL | Fennara model ID form |
| --- | --- | --- |
| Ollama | `http://127.0.0.1:11434` | `ollama/<local-model>` |
| LM Studio | `http://127.0.0.1:1234/v1` | `lmstudio/<loaded-model-id>` |

Start the selected local server and ensure the actual model is available. Prefer explicit `ollama/` IDs over old `local/` compatibility aliases. Ollama Cloud is a separate hosted provider, not the local server. Refresh the picker after server/catalog changes.

Example for an already available Ollama model is simply selecting its observed `ollama/model-id` in the picker. A source-code example is intentionally omitted: this operation is UI setup, not a Godot API.

The researched version defaults each local provider's output allowance to 8,192 tokens and caps it at half an advertised loaded context length. Treat these as version-dependent defaults. It does not enable Ollama image input in built-in chat.

## Custom compatible providers

Use the picker’s **Custom** form for a supported compatible endpoint:

- a unique lowercase provider ID and display name;
- a version-root base URL, for example `http://localhost:20128/v1`;
- optional auth and custom headers;
- the endpoint's real model IDs and accurate context/output limits.

Fennara displays `provider-id/model-id` but sends the model ID expected by the endpoint. The documented contract is compatible streaming `/chat/completions`. Do not infer support for another protocol from the endpoint's marketing name.

Keys/header values belong in the protected auth store. Leaving the form's API key empty preserves an existing key; do not claim it clears credentials.

## Approval, display, and timing

Built-in chat `ask` mode can require UI approval for mutation/runtime execution; read-only calls can run immediately. `full_access` removes those prompts while hard tool restrictions still apply. Follow the active host's authorization and do not change the user's approval mode as a workaround.

Provider response timeout is distinct from MCP tool timeout and runtime lease. The researched default is 120 seconds with a 30–3,600 second range.

Embedded display uses WebView2 on Windows, system WKWebView on macOS, or a shared managed CEF runtime on Linux. Browser display changes UI placement only and takes effect after restart. External MCP can remain operational when this optional webview fails.

## Telemetry settings

Telemetry is enabled by default in the researched version and sends a bounded anonymous activity event after a compatible editor connects, at most once per UTC day. The documentation excludes project contents, paths, prompts, tool payloads, logs, screenshots, and credentials from that event. Provider requests remain a separate data flow to the configured provider.

If the user requests opt-out or a headless environment requires it, use the UI toggle or set one documented variable in the daemon's environment before launch:

```text
FENNARA_DISABLE_TELEMETRY=true
DO_NOT_TRACK=1
```

Either variable is sufficient and overrides the saved preference. Do not silently change this preference during unrelated work.

## Sources

See [source inventory](fennara-godot-mcp-sources.md): `providers.md`, `slash-commands.md`, `chat-vs-mcp.md`, `telemetry.md`, `faq.md`, and chat boundaries in `architecture.md`.
