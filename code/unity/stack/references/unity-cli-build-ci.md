# Unity CLI — Headless build, run and CI

> See also: [unity-cli-licenses.md](unity-cli-licenses.md), [unity-cli-tests.md](unity-cli-tests.md), [unity-cli-scenes.md](unity-cli-scenes.md), [unity-cli-editor-session.md](unity-cli-editor-session.md)

Written against Unity CLI 1.0.0-beta.14; the CLI's own `--help` outranks this page.

---

## Goal -> command

| Goal | Command |
|---|---|
| Build a player with Unity's built-in build (desktop target) | `unity build <project> --target StandaloneWindows64 --output-path Build/Game.exe` |
| Build with your own C# method | `unity build <project> --target <t> --execute-method Builder.PerformBuild --output-path <p>` |
| Build with a Unity 6+ Build Profile (also Quest, Android XR) | `unity build <project> --profile "<name>" --output-path <p>` |
| List valid targets / profiles; create a profile | `unity build <project> --list-targets` / `--list-profiles` / `--create-profile <target>` |
| Launch the last recorded build | `unity build run <project>` (`--path <output>` for another one) |
| Any other headless batch work | `unity run <project> -- -executeMethod Class.Method` |
| Run a registered `[CliCommand]` headlessly | `unity run <project> --command <name> -- --arg value` |
| Build from an Editor that is already open | `unity command build run --target <t> --confirm true`, then `unity command build status` |
| Scaffold a CI workflow (GitHub Actions or GitLab) | `unity ci init [--provider gitlab] [--target Android] [--shards 4]` |
| Cache key for the CI `Library/` cache | `unity cache key [<project>] --target <t>` |
| Fail a pipeline in seconds when the machine cannot build | `unity doctor --ci` |
| Only "does it compile?" with an Editor open | `unity recompile`, see [unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md) |
| Test run inside the pipeline | [unity-cli-tests.md](unity-cli-tests.md) |

`<project>` is a path or registered name and defaults to the current directory. Defaults for target, output, profile, timeout live in a committed `ProjectSettings/UnityCliConfig.json` (`build.target`, `build.outputPath`, `build.profile`, `build.timeout`); `unity config resolve build.target <project>` shows the value and its source.

## Choose the route

| Situation | Route |
|---|---|
| CI, build box, no Editor open on the project | `unity build` (spawns a batch Editor, no Pipeline package needed) |
| An Editor with the Pipeline package is open on the project | `unity command build run` (live route below) |
| Scripted editor work that is not a player build | `unity run` |

`unity test` is documented to refuse a project that an Editor holds open; the sources do not say the same for `unity build`, so use the live route when an Editor is open. `unity build run` (standalone, launches the last build) and `unity command build run` (live Editor, starts a build) are different commands with the same words.

## Case: headless player build

**Pick exactly one strategy:** a Build Profile (`--profile`, Unity 6+), a built-in desktop build (`--target` + required `--output-path`), or `--execute-method` (your method builds and must honor `-buildOutput`). Non-desktop targets need `--profile` or `--execute-method`; a `--target` outside the classic list fails with `BUILD_INVALID_TARGET` and points at `--profile`.

```bash
unity build <project> --list-targets --format json            # zero-code vs needs --execute-method/--profile
unity build <project> --target StandaloneLinux64 --output-path Build/Game.x86_64 \
  --allow-install --timeout 3600 --format json > build-result.json
echo "exit=$?"
```

```csharp
// Assets/Editor/Builder.cs (one class per file)
using System; using System.Linq; using UnityEditor; using UnityEditor.Build.Reporting;
public static class Builder
{
    public static void PerformBuild()
    {
        var a = Environment.GetCommandLineArgs();
        var i = Array.IndexOf(a, "-buildOutput");
        var scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray();
        var r = BuildPipeline.BuildPlayer(scenes, i >= 0 ? a[i + 1] : "Build/Game",
            EditorUserBuildSettings.activeBuildTarget, BuildOptions.None);
        EditorApplication.Exit(r.summary.result == BuildResult.Succeeded ? 0 : 1);
    }
}
```

**Verify:** exit code `0`; `data.outputPath` (absolute, the path the CLI told Unity) exists on disk; `data.provenance` names the manifest; `editorErrors` in the JSON is empty; the log (default `<project>/Logs/build-<target>-<timestamp>.log`) shows the target you asked for (check it when using `--execute-method`).

**Pitfalls:**
- For built-in builds the CLI trusts Unity's terminal verdict in the log over the process exit code (a real Editor can exit `0` from a failed player build), so a failed build exits `6`. With `--execute-method` the exit code is whatever your method returns, so return non-zero on failure.
- Exit `6` also covers `--timeout` (disabled by default; whole seconds as digits, `3600` not `1h`). Ctrl-C exits `130`, SIGTERM `143`.
- One `MonoBehaviour` per `.cs` file, named after the class. Several in one file run fine in the Editor, then the built player dies at startup with `The file '.../level0' is corrupted`. Check scripts written this session before building.
- Everything after `--args` or `--` is forwarded to Unity. `-batchmode`, `-quit`, `-projectPath`, `-useHub`, `-hubIPC` are reserved and rejected.
- Android signing flags (`--android-keystore-base64`, `--android-keystore-password`, `--android-key-alias`, `--android-key-alias-password`) come from CI secrets, and the expanded value still shows in argv, so mask it in logs. `--android-export-type apk\|aab\|android-studio-project`.
- `--versioning-strategy semantic\|tag\|custom\|none` (default `none`); `custom` needs `--build-version`. The uncommitted-changes guard is skipped with `--allow-dirty-build`.
- Missing editor: `--allow-install` installs the version from `ProjectSettings/ProjectVersion.txt`; see [unity-cli-editors-modules.md](unity-cli-editors-modules.md) for modules a target needs.

## Case: `unity run` and `run --command`

```bash
unity run <project> --timeout 300 -l run.log -- -executeMethod Tools.Bake
unity run <project> --command greet --format json -- --name Ada
```

`run` always launches in batch mode and returns the Editor's exit code; never pass `-batchmode`/`-quit` yourself. `--timeout` sends SIGTERM, then SIGKILL after 2 s, and exits `6`. `-l/--log-file` makes `-logFile` reserved. `--command` needs the Pipeline package, reuses an already-open Editor (`data.reusedRunningEditor`), parses args after `--` against the command's schema, and `-l` only takes effect when that call spawns the Editor (`logFileApplied` in JSON).

**Pitfall:** a batch-mode script cannot see what it produced; a reference saved as null still reports success. Open the result in a live Editor and read it back before calling it done.

## Case: build from a live Editor (Pipeline)

**When:** an Editor is open on the project; the build must not need a second Editor. Names below come from com.unity.pipeline 0.9.1-exp.1; confirm them with `unity command --query build --format json`.

```bash
unity command editor save_all                        # unsaved scenes first (bridge check scene-2)
unity command build get_settings
unity command build run --target StandaloneWindows64 --outputPath Builds/Win/Game.exe --dry_run true
unity command build run --target StandaloneWindows64 --outputPath Builds/Win/Game.exe --confirm true
unity command build status                           # repeat until status is "completed"
```

**Verify:** `build status` reports `result: Succeeded`, `totalErrors: 0`, the `outputPath`, and `files`. `queued`/`building` carry `elapsedMs`; `idle` means no build has run. The last report is kept until the next build.

**Pitfalls:**
- `build run` without `confirm=true` is refused; `dry_run=true` validates target, path, scenes and queues nothing. One build at a time (`busy` otherwise). It returns at once; the status file survives the domain reload a build can cause, and `build status` answers while the build holds the main thread.
- `build.target switch --target <t> --confirm true` is destructive and long (full reimport and domain reload): poll `build.target switch_status`. `build.target list` shows which targets have build support installed.
- `build set_settings` (needs `confirm` or `dry_run`) does not manage scenes: use `scene add_to_build` / `scene remove_from_build` ([unity-cli-scenes.md](unity-cli-scenes.md)).
- Build Profiles are Unity 6 only (`feature_unavailable` before). `build run --profileName` does not yet use the profile's own scene list (known limitation): pass `--scenes` explicitly.
- `build run`, `build.target switch` and every `package` command are rejected inside `job batch`.

## Case: CI pipeline (license, preflight, test, build, return)

**Scaffold first:** `unity ci init --dry-run` prints the workflow; `unity ci init` writes `.github/workflows/unity.yml` (or `--provider gitlab` writes `.gitlab-ci.yml`). It installs the CLI, restores the editor download cache and `Library/`, installs the editor from `ProjectVersion.txt`, activates a license, runs `doctor --ci`, tests with JUnit, builds, uploads, and returns the license in a teardown that also runs on failure. It references secrets by name only: `UNITY_SERVICE_ACCOUNT_ID`, `UNITY_SERVICE_ACCOUNT_SECRET`, `UNITY_LICENSE_SERIAL`. Scripted runs (no TTY, `--non-interactive`, machine `--format`) never prompt; an existing workflow then needs `--overwrite` (exit `2` otherwise). `--shards <2..64>` splits tests, builds in its own job, and reseeds the inventory when any `.cs`, `.asmdef`, `.asmref` or `packages-lock.json` changed. For standalone desktop targets it adds no editor module (il2cpp, mono and server variants are a guess): choose the module in the install step yourself.

**Hand-written sequence** (the order matters; the license is returned even when a step fails):

```bash
set -u
unity doctor --ci --non-interactive --format json || exit $?        # 6 definitive, 7 retryable
unity license activate --serial "$UNITY_LICENSE_SERIAL" --non-interactive --format json || exit $?
trap 'unity license return --yes --non-interactive' EXIT
unity test <project> --mode EditMode --report-format junit --output reports/editmode.xml --allow-install || exit $?
unity build <project> --target StandaloneLinux64 --output-path Build/Game.x86_64 --allow-install --format github
```

A service account cannot activate a license; activation modes (`--serial`, `--floating`, offline) are in [unity-cli-licenses.md](unity-cli-licenses.md). Export `UNITY_SERVICE_ACCOUNT_ID`/`_SECRET` only when the job also calls cloud commands.

**Pitfalls:**
- `--format github` turns errors and warnings into `::error::` / `::warning::` annotations (inert elsewhere); it is not a replacement for the JUnit report. Never hand-build `::` lines around CLI output.
- A test exit `8` is a verdict, `6` is infrastructure: see [unity-cli-tests.md](unity-cli-tests.md) before wrapping the test step in a retry.
- `doctor --ci` is explicit, never inferred from `CI=true`; with a redirected stdout the default format is `tsv`, which leads with a `verdict` row.

## Case: caches and the Accelerator

```bash
unity cache key <project> --target Android                  # one hash, safe in a shell substitution
unity cache key --component editor                          # fallback key level (editor\|packages\|target)
unity config accelerator cache.example.com:10080            # persist once; run, test and build inject it
unity test <project> --no-accelerator                       # opt out for one call
unity diagnose accelerator                                  # endpoint, project mode, 5 s TCP reachability
```

The key moves with the editor version, the package set (`packages-lock.json`, else `manifest.json`) and `--target`; it ignores scene, script and asset edits and is identical across OSes. `unity cache info` / `clean --yes` manage the **download** cache, not `Library/`.

**Pitfalls:** `--accelerator` / `--no-accelerator` go after the command name (`unity --accelerator build` is exit `2`) and only apply to `run`, `test`, `build`; `unity open` does not inject. `-EnableCacheServer` and `-cacheServerEndpoint` are reserved. A project whose `ProjectSettings/EditorSettings.asset` has `m_CacheServerMode: 2` ignores the endpoint (the CLI warns). From Unity 6.5, new projects have import-result caching off: forward `-cacheServerEnableImportResultCaching`. A reachable port does not prove cache hits.

`unity watch build` is not implemented; `unity watch test` is in [unity-cli-tests.md](unity-cli-tests.md).
