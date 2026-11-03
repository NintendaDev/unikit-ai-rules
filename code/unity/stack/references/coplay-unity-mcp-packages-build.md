# Coplay Unity MCP — Packages and player builds

| Goal | MCP | CLI |
|---|---|---|
| Installed/search/package info | `manage_packages`: `list_packages`, `search_packages`, `get_package_info` | `packages list/search/info` |
| Install/remove/embed/resolve | Package mutation actions | `packages add/remove/embed/resolve` |
| Poll package job | `manage_packages(action="status", job_id=...)` | `packages status` |
| Scoped registries | `list_registries`, `add_registry`, `remove_registry` | `packages list-registries/add-registry/remove-registry` |
| Build target, scenes/settings/profiles | `manage_build`: `platform`, `scenes`, `settings`, `profiles` | `build platform/scenes/settings/profiles` |
| Start/monitor/cancel player build | `build`, `batch`, `status`, `cancel` | `build run/batch/status/cancel` |

## Package operations

- Read installed state before adding a package to satisfy a missing optional tool. Group visibility and package availability are independent.
- Package identifiers can be registry names, versioned names, Git URLs or file paths. Inspect source/version deliberately; do not add a dependency because a template mentions it.
- List/search can return async jobs; retain the job ID and poll `status`. After add/remove/embed/resolve, wait through compilation/reload and verify the final installed package state.
- Removal checks dependents; `force=true` bypasses that check. Do not use force to conceal an unresolved dependency question.
- Scoped registry changes and package embedding are persistent project changes. Apply them only when within the task and allowed by project rules.

```python
manage_packages(action="list_packages")
# If the response returns a job_id, poll it instead of repeating the list request.
manage_packages(action="status", job_id="returned-package-job-id")
```

```powershell
unity-mcp --format json packages list
unity-mcp --format json packages status returned-package-job-id
```

## Build workflow

1. Inspect active platform, build scenes, relevant settings/profile and readiness. Distinguish reading a setting from changing it; omitting a setting `value` is the documented read path.
2. Select the intended target and explicit output path; verify scene inclusion/order. `manage_scene` can read build settings, but `manage_build(action="scenes")` owns their mutation.
3. Check platform support and follow project constraints on ProjectSettings. Switching platform or scripting backend is persistent state and can trigger lengthy imports; it is not a harmless build flag.
4. Start one build, retain any job ID, and poll `status` until terminal completion. Do not retry an uncertain build launch just because a client timed out.
5. Inspect the build report and output files. Build success proves compilation/packaging, not runtime behavior on the target device.

```python
manage_build(action="platform")
manage_build(action="scenes")
manage_build(action="build", target="windows64", output_path="Builds/Probe/Probe.exe",
             development="true")
manage_build(action="status")  # Include the returned job_id when provided.
```

```powershell
unity-mcp --format json build platform
unity-mcp --format json build scenes
unity-mcp --format json raw manage_build '{"action":"build","target":"windows64","output_path":"Builds/Probe/Probe.exe","development":true}'
unity-mcp --format json build status
```

These are build-request examples, not operations to run during a documentation task. Many `manage_build` parameters are documented as **strings**, including booleans and JSON-array strings; preserve its actual schema rather than applying another tool's typed-value convention blindly.

## Profiles, batches and editor deployment

- Build Profiles require Unity 6+. Use explicit profile asset paths and inspect activation state; do not assume activating a profile is temporary.
- `batch` accepts targets/profiles/output directory according to its schema. Follow the actual returned reports/jobs, and distinguish per-target failures from overall request acceptance.
- `options` can request clean builds, auto-run, deep profiling, compression or detailed reports. Set only what is required; auto-run starts the produced player.
- `manage_editor(action="deploy_package")` replaces the project's installed MCP package from a configured source and recompiles; `restore_package` restores its backup. These are bridge maintenance operations, not normal recovery from a hidden group or busy compiler.

Sources: [packages](https://coplaydev.github.io/unity-mcp/reference/tools/core/manage_packages), [builds](https://coplaydev.github.io/unity-mcp/reference/tools/core/manage_build), [editor deployment](https://coplaydev.github.io/unity-mcp/reference/tools/core/manage_editor), [CLI](https://coplaydev.github.io/unity-mcp/guides/cli).
