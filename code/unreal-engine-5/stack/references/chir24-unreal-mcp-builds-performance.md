# ChiR24 Unreal MCP — Builds, tests, settings and performance

| Task | Discover under `system_control` |
|---|---|
| Compile/test | `run_build` (legacy members include `run_ubt`, `run_tests`) |
| Package/launch | `package_project`, `package_status`, `launch_build` |
| Validate content | `validate_assets` |
| Project config | `get_project_settings`, `set_project_setting`, `configure_rendering` |
| Plugins | `list_plugins`, `get_plugin_info`, `enable_plugin` |
| Profiling/Insights | `profile_performance`, `start_session`, `get_trace_status` |
| Logs/outputs | `read_log`, `list_output_files` |

## Compile and test the requested scope

```json
{"operation":"search","query":"run automation tests","tool":"system_control","limit":2}
```

Describe the family and its exact build/test selector. Read the real target/platform/configuration and existing errors before execution. Capture the final exit/test result and diagnostics, not merely a process-start acknowledgement.

Validate content through the relevant mode: loadability, Data Validation and material usage are separate checks. Inspect invalid/not-validated assets and diagnostics. Do not call a folder “fully validated” when no validator handles its asset types.

Example content check, after describing its installed contract:

```json
{"operation":"execute","capability":"system_control.validate_assets","params":{"path":"/Game/Acceptance","recursive":true,"dataValidation":true,"materialUsage":true}}
```

Inspect `isValid` and each result. Material usage can be missing or set only in memory; apply the intended flag and save that material. This check is especially relevant to meshes spawned only in PIE and to packaged output.

## Package and run actual output

Inspect default maps and packaging settings → describe package platform/options → start one job → keep its actual job id → query `package_status` until terminal → inspect exit/output/archive evidence → launch the produced build when required.

Packaging job status and an early gateway task are different handles. A successful package start is unfinished; an archive path without files is not a build. For launch, inspect loaded maps, game log and exit state; Shipping may omit logs, so absent errors are not proof of successful startup.

Do not infer signing/cooking/chunking/encryption or platform SDK automation from the package capability. Discover the exact needed action and confirm prerequisites. Platform SDK installation is external to an MCP record.

## Settings and plugins

Read a settings section/key before changing it. Distinguish global renderer methods from post-process-volume values. `configure_rendering` returns changed/read-back settings, unavailable settings and `restartRequired`; inspect all three.

Set project versus per-user configuration intentionally and inspect the reported config file. A saved setting can require restart before its effect is observable. Do not use reflected settings access to modify EngineWire's own authorization limits.

After plugin enable/disable, inspect any rebuild/restart requirement. Optional compiled support such as PCG may require rebuilding the plugin with the project dependency enabled.

## Measure performance in the right process

```json
{"operation":"search","query":"capture insights trace","tool":"system_control","limit":2}
```

Reproduce a defined workload, capture the relevant baseline, start/capture/stop the described profiling session, and inspect the trace/report and its actual output. Explain which process, engine, platform, resolution and duration were measured. A trace file's existence is not analysis of it.

Do not quote repository Node search latency/RSS as editor performance, source contracts as compiled-plugin behavior, or an old UE 5.7.4 record as current certification. Background throttling invalidates many timing comparisons; use [runtime-verification](chir24-unreal-mcp-runtime-verification.md).

Sources: [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md), [system operation records](https://github.com/ChiR24/Unreal_mcp/blob/dev/src/tools/catalog/capabilities/records/system-control/system-ops.ts), [performance/evidence](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/performance-and-evidence.md), [Roadmap phases 32–33](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Roadmap.md).
