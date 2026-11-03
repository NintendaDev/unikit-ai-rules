# Fennara Godot MCP — Maintenance and Export

> See also: [Connection](fennara-godot-mcp-connection-cli.md), [Operations](fennara-godot-mcp-operations-troubleshooting.md).

## Choose the operation

| Goal | CLI | Godot/MCP role |
| --- | --- | --- |
| Install/adopt an addon | `fennara install --project "path"` | Open the project afterward; verify `fennara_status` |
| Update the project components | `fennara update --project "path"` | Close that editor before a normal replacing update |
| Stage an editor-managed update | `fennara update --prepare --project "path"` | The dock controls confirmation, closing, activation, and reopening |
| Inspect installation health | `fennara doctor` | Compare MCP status versions and connection |
| Repair base layout | `fennara doctor --repair` | Recheck the precise remaining problem |
| Read operation failures | `fennara diagnostics --operation "id" --json` | Preserve report and logs |
| Recover an interrupted activation | `fennara recover --project "path"` | Close Godot first |
| Update only the CLI | `fennara self-update` | Does not replace the project's addon |
| Remove the capture autoload before addon-free CI startup | `fennara prepare-export --project "path"` | Run before launching Godot |

These are lifecycle operations, not engine scene-edit commands. Do not update a working installation merely because a gameplay task uses Fennara.

## Version and activation rules

Pin `--version` for reproducible installation/update. Choose a concrete version confirmed from release metadata; never infer the latest version from this rule's snapshot.

For example, after setting `$releaseVersion` to the selected exact version in PowerShell:

```powershell
fennara update --project "D:/Godot/ExampleGame" --version $releaseVersion
```

A normal install/update resolves release metadata, verifies hashes, and may replace the outer CLI before continuing the same frozen operation. `--no-self-update` is for controlled continuation, not bypassing a minimum CLI requirement.

Stable addons follow GitHub's Latest Release; staging addons stay in their recorded PR channel. Staging does not automatically cross into stable. Deliberate track changes require an exact target release with Godot closed.

Only one shared runtime version is active per user. Activation is blocked while other Fennara-enabled editors remain connected. Do not force a shared version switch underneath another project.

Updates refresh the addon, local components, generated project guidance, and applicable shared webview payloads. They do **not** rewrite external MCP app configuration. Rerun `mcp-setup` only for a client setup/configuration problem.

## Safe update and recovery

1. Close the target editor for terminal `update`. Use the dock flow if preparation must happen while it is open.
2. Preserve the operation ID and log/report path.
3. Let Fennara stage, verify, replace, reopen, and validate its own components.
4. If activation fails, use the dock recovery controls or CLI `recover`.
5. Verify the reopened editor and external MCP status, then inspect generated guidance changes.

`--prepare` only stages verified files; it does not close Godot, replace the live addon, switch the active runtime, or restart the daemon. Do not describe a prepared operation as an activated update.

For an identified recoverable transaction:

```text
fennara diagnostics --operation "recorded-operation-id" --json
fennara recover --project "/absolute/path/to/game" --operation "recorded-operation-id"
```

Recovery restores the previous addon, launcher snapshots, and runtime manifest, then attempts to reopen the recorded Godot executable. Completed, merely prepared, and already rolled-back operations are not recoverable transactions.

Never manually repair `current.json`, version folders, update receipts, or staged addon directories during the ordinary recovery flow.

## Health reports

`doctor` reports platform, app-data layout, active version, launchers, runtimes, daemon, and optional webview prerequisites. `--repair` recreates missing base directories; on Linux it can also clean stale CEF profiles and repair a current-runtime marker when a complete runtime exists. It is not an arbitrary broken-addon repair.

`diagnostics` concerns install/update/recovery/self-update operations. It is not a substitute for script diagnostics or gameplay runtime logs. Sanitized reports retain phases, stable codes, versions, selected assets, and hash results while redacting sensitive local paths and credentials.

If a running process is older than the active selected runtime, restart the affected editor or MCP app before diagnosing the mismatch as a project-code defect.

## Export and CI

Normal editor export excludes `addons/fennara/` and `.fennara/` and temporarily removes Fennara's runtime autoload and extension registration, restoring editor state afterward.

If CI omits the addon, the saved `_fennara_game_capture` autoload can break project startup **before** an export plugin runs. Use:

```text
fennara prepare-export --project "/absolute/path/to/game"
godot --headless --path "/absolute/path/to/game" --export-release "Android"
```

The second line is a **Godot CLI command** and requires an existing export preset named `Android` and the normal platform prerequisites. `prepare-export` removes only Fennara's capture-autoload entry and is safe to rerun. Inspect its `project.godot` diff; it is intentionally a maintenance exception to normal structured project-settings editing. Alternatively, install the addon before starting Godot in CI.

There is no documented `fennara build` command or general Fennara export runner.

## Manual and older-installation recovery

Use the upstream manual-install guide only when avoiding the normal installer. Match addon, CLI, local runtime, platform, and manifest hashes; keep the large Linux CEF payload outside the project addon.

Upstream documents one-time CLI reinstalls before updating releases ≤0.3.8, and before leaving macOS 0.3.11. Confirm the installed version before applying these historical remedies.

## Sources

See [source inventory](fennara-godot-mcp-sources.md): `cli.md`, `setup.md`, `manual-install.md`, and lifecycle/export sections of `architecture.md` and `release.md`.
