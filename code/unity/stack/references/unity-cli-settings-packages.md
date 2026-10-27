# Unity CLI — Project Settings and Packages

> See also: [unity-cli.md](../unity-cli.md) · [unity-cli-editor-session.md](unity-cli-editor-session.md) · [unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md) · [unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md) · [unity-cli-build-ci.md](unity-cli-build-ci.md)

Written against Unity CLI 1.0.0-beta.14 and com.unity.pipeline 0.9.1-exp.1; the live catalog (`unity command --query <term> --format json`) outranks this page.

---

## Goal -> command

Run as `unity command <group> <verb> --<param> <value>` against a ready Editor; add `--project-path "<project>"` when several Editors may run.

| Goal | Command |
|---|---|
| Read an area | `settings.<area> get` (`audio`, `graphics`, `input`, `physics`, `player`, `quality`, `runtime_pipeline`, `tags_layers`, `time`) |
| Preview a change | `settings.<area> set --settings '{...}' --dry_run true` |
| Apply a change | `settings.<area> set --settings '{...}' --confirm true`, then `settings.<area> get` |
| Add / remove tags, name layers | `settings.tags_layers set --settings '{"addTags":["Enemy"],"setLayers":[{"index":8,"name":"Ball"}]}'` |
| Set the default render pipeline asset | `settings.graphics set --settings '{"renderPipelineAsset":{"path":"Assets/Settings/URP.asset"}}'` |
| List installed packages | `package list` (`--scope installed\|available\|all`) |
| Find a package in the registry | `package search --query com.unity.2d.feature` |
| Add a package | `package add --identifier com.unity.foo@1.2.3 --confirm true`, poll `package status` |
| Remove a package | `package remove --name com.unity.foo --confirm true`, poll `package status` |
| Re-resolve the manifest | `package resolve`, then `package status` |
| Result of the last add / remove / resolve | `package status` (`idle`, `in_progress`, `completed`, `failed`) |
| `package` group missing | `unity pipeline upgrade` ([unity-cli-editor-session.md](unity-cli-editor-session.md)) |

Shell note: JSON values use Git Bash quoting (single quotes around the value). In Windows PowerShell 5.1 write each inner `"` as `\"`; PowerShell 7.3+ accepts the Git Bash form. `--timeout` belongs to the CLI and is in seconds (default 30).

Fields of each `settings` object (omitted fields stay unchanged; the group is re-read after the write):

| Area | Fields |
|---|---|
| `audio` | `volume` (0..1), `rolloffScale`, `dopplerFactor` |
| `graphics` | `renderPipelineAsset` (path / guid / globalId; `{}` selects the built-in pipeline) |
| `input` | legacy Input Manager only: `axis` (required), `sensitivity`, `gravity`, `dead` |
| `physics` | `gravityX`, `gravityY`, `gravityZ`, `defaultSolverIterations`, `bounceThreshold` |
| `player` | `companyName`, `productName`, `bundleVersion`, `scriptingBackend` (`Mono2x`, `IL2CPP`), `apiCompatibilityLevel` (`NET_Standard_2_0`, `NET_Unity_4_8`) |
| `quality` | `level`, `vSyncCount` (0, 1, 2), `antiAliasing` (0, 2, 4, 8) |
| `runtime_pipeline` | `enableInDevelopmentBuilds`, `enableInReleaseBuilds`, `port`, `enableAuditLogging`, `autoStart`, `maxWorkItemsPerFrame` |
| `tags_layers` | `addTags`, `removeTags`, `setLayers[]` of `{index, name}` |
| `time` | `fixedDeltaTime`, `maximumDeltaTime`, `timeScale` |

## Change a project setting (dry run, confirm, read back)

**When:** any value in the table above.

```bash
unity command settings.time get --format json
unity command settings.time set --settings '{"fixedDeltaTime":0.02}' --dry_run true
unity command settings.time set --settings '{"fixedDeltaTime":0.02}' --confirm true
unity command settings.time get --format json
```

- `dry_run` validates and describes the change and writes nothing; it wins even when `confirm` is also true. Without `confirm` the call is refused, not skipped.
- **Verify (bridge check `settings-1`):** a misspelled key answers success with nothing applied. After every write run `get` and compare the field you changed with the value you sent. The `set` reply already re-reads the group; still check the changed field by name.
- Settings writes are outside Unity's Undo and cannot run in a transactional `job batch`; run them standalone. Note the old value from the first `get` before writing.
- `player set` of `scriptingBackend` or `apiCompatibilityLevel` triggers a domain reload (`requiresDomainReload`) and reads/writes the active build target. After it, wait for the Editor with `unity status --until-ready` and read `script recompile_status` (`failed`, `errors`; bridge check `compile-2`).
- Never leave `timeScale` at anything but 1 unless asked: a project value of 0 freezes every Play session. The runtime time scale is a separate command ([unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md)).
- `quality set` takes `level` as an index from `levelNames` in `quality get`. Which level a `vSyncCount` or `antiAliasing` write lands on is not documented: set `level` in its own call, then read back.
- `physics` covers the 3D Physics manager only; 2D physics, sorting layers, Editor settings and Input System settings are not in these groups. Confirm in the catalog (`unity command --query settings --format json`); otherwise use C# through `script eval` and read the value back ([unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md)).

## Tags and layers

```bash
unity command settings.tags_layers get --format json
unity command settings.tags_layers set --settings '{"addTags":["Enemy","Pickup"],"setLayers":[{"index":8,"name":"Ball"},{"index":9,"name":"Bricks"}]}' --dry_run true
unity command settings.tags_layers set --settings '{"addTags":["Enemy","Pickup"],"setLayers":[{"index":8,"name":"Ball"},{"index":9,"name":"Bricks"}]}' --confirm true
unity command settings.tags_layers get --format json
```

- User layers are indices 8-31; 0-7 are reserved. An empty `name` clears the slot, which orphans objects and physics matrices that still use that layer. Check usage before clearing or removing a tag.
- Add the tag or layer first, then assign it: `gameobject set_tag` and `gameobject set_layer` ([unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md)). A tag that does not exist yet makes the assignment fail.
- **Verify:** `get` lists the new names at the indices you sent.

## Render pipeline and quality

- `graphics set` writes only the default render pipeline asset. `{"renderPipelineAsset":{}}` selects the built-in pipeline, which turns URP materials pink; the asset must already exist (locate it with `asset find --name URP --search_in Settings`; [unity-cli-assets-import.md](unity-cli-assets-import.md)).
- **Verify:** `settings.graphics get` shows the asset you set, and a screenshot shows no pink ([unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md)).

## Pipeline runtime settings (security)

`settings.runtime_pipeline` controls whether the Pipeline server is compiled into Player builds.

- `enableInDevelopmentBuilds` and `enableInReleaseBuilds` write scripting define symbols for every installed build target, so they trigger a recompile and a domain reload.
- A release build that carries the Pipeline exposes code execution over a local HTTP server. Never enable `enableInReleaseBuilds` unless the user asks for it explicitly.
- The command is refused in Play Mode (the running driver has already loaded its settings). `port` (0-65535, 0 = auto from 7900-7999) and `maxWorkItemsPerFrame` (1-50) outside their bounds are rejected, not clamped.
- `get` reports the effective values (built-in defaults when none were authored) and never creates the settings file. Runtime-connection details: [unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md).

## Add, remove or upgrade a package

**When:** a task needs a UPM package, or a package must move to another version.

```bash
unity command package list --format json
unity command package search --query com.unity.cinemachine --format json --timeout 120
unity command package add --identifier com.unity.cinemachine@<version> --dry_run true
unity command package add --identifier com.unity.cinemachine@<version> --confirm true
unity command package status --format json
unity command package list --format json
```

- `identifier` is `name@version`, a git URL, or `file:../Path`; take `<version>` from the `package search` reply. The documented parameter takes one identifier per call, so add several packages with several calls, one after another (a second call while one runs answers `busy`). A name without a version resolves the latest compatible release; pin a version only when a minimum is required. Upgrading is `add` with the newer `@version`.
- `add` and `remove` are async: the reply is `in_progress`; poll `package status` until `completed` or `failed` (it reads a status file that survives the domain reload). `--wait true` blocks until done (up to 300 s) and needs `--timeout 300` on the CLI, because the default 30 s ends the call first; prefer polling.
- A successful add or remove triggers a recompile and domain reload. Poll `script recompile_status` (`failed`, `errors`) and wait with `unity status --until-ready` before the next Editor command ([unity-cli-editor-session.md](unity-cli-editor-session.md)). Stop Play Mode first (precaution: a reload follows).
- **A lost reply is not a failed install** (bridge check `transport-1`): the reload can drop a synchronous reply. Read `package status` and `package list` before retrying.
- **Verify:** `package list` shows the package at the expected version; `package status` is `completed`; the compile state has `failed: false`.
- `package resolve` is fire-and-forget: it re-fetches and re-links the manifest and may reload; its outcome appears in `package status`.
- Read-only queries (`list` with scope `available` or `all`, and `search`) wait for the registry, up to 60 s; pass `--timeout 120`. `--offline true` uses the local cache.
- No `package` command can run inside `job batch` (all are rejected as not batchable).
- **Never hand-edit `Packages/manifest.json`**: the Package Manager resolves dependencies and compatible versions, manual edits routinely break resolution, and the open Editor does not see them. `unity pipeline install` / `upgrade` is the one sanctioned manifest change, and it is the CLI's own.

## Choosing what to install

- Install what the project needs, not everything; prefer packages the project template already provides. 2D work usually wants `com.unity.2d.feature` (sprites, tilemap, animation, pixel-perfect), Input System `com.unity.inputsystem`, uGUI/TextMeshPro `com.unity.ugui`, camera framing `com.unity.cinemachine`, testing `com.unity.test-framework`, large streamed content `com.unity.addressables`.
- The render pipeline comes from the template. Adding `com.unity.render-pipelines.universal` to a Built-in project does not assign a pipeline asset, and materials render pink; switching pipeline is a migration, not a package add.
- Confirm an id exists before depending on it: `package search`, or for a known id `curl -fsSL https://packages.unity.com/<id>` (the registry has no free-text search over HTTP).
- Platform support (Android, iOS, WebGL) is Editor modules, not packages ([unity-cli-editors-modules.md](unity-cli-editors-modules.md)).

## The `package` group is missing (old Pipeline package)

The `package` group exists only in newer Pipeline versions. If `unity command package list` answers that no such command exists (exit 13), the project's `com.unity.pipeline` predates it. Run `unity pipeline list --format json` to see the installed and latest versions, then `unity pipeline upgrade --project-path "<project>"` and wait for `unity status --until-ready`; an open Editor picks the new package up on its next refresh. Pipeline 0.9.0 and newer name commands as `<group> <verb>` (`package add`); flat names such as `package_add` belong to older packages and are not accepted, so confirm every name in the live catalog. Owner of install and upgrade details: [unity-cli-editor-session.md](unity-cli-editor-session.md).

## No Editor available: headless fallback

Use this only when no Editor can answer, the project has no Pipeline package and installing it is unwanted, or in CI. The project must not be open in another Editor. `unity run` cannot be used for this: it injects `-quit`, the Editor exits before the asynchronous request completes, and nothing installs. Run the Editor binary directly in batch mode without `-quit`; the method ends the process with `EditorApplication.Exit`. Put the script under an `Editor/` folder:

```csharp
using UnityEditor;
using UnityEditor.PackageManager;
using UnityEditor.PackageManager.Requests;

public static class PackageInstaller
{
    static AddAndRemoveRequest request;
    static double deadline;

    // -executeMethod PackageInstaller.Install   (no -quit)
    public static void Install()
    {
        request = Client.AddAndRemove(new[] { "com.unity.inputsystem" }, null);
        deadline = EditorApplication.timeSinceStartup + 600;
        EditorApplication.update += Poll;
    }

    static void Poll()
    {
        if (!request.IsCompleted && EditorApplication.timeSinceStartup < deadline) return;
        EditorApplication.update -= Poll;
        EditorApplication.Exit(request.IsCompleted && request.Status == StatusCode.Success ? 0 : 1);
    }
}
```

```bash
"<editor-binary>" -batchmode -projectPath "<project>" -executeMethod PackageInstaller.Install -logFile -
echo $?
```

`unity editors path <editor-version>` prints the install directory ([unity-cli-editors-modules.md](unity-cli-editors-modules.md)); `<editor-binary>` is `Editor/Unity.exe` inside it on Windows, `Editor/Unity` on Linux, `Unity.app/Contents/MacOS/Unity` on macOS. **Verify:** exit code 0, and the ids appear in `Packages/manifest.json` (a read-only look). Never busy-wait on `IsCompleted`: the request completes on later editor ticks and a blocking loop deadlocks it.

## Pitfalls

- A reply of success is not evidence: `get` after every settings write, `package list` after every package change.
- `confirm` forgotten means refused, not skipped; `dry_run` plus `confirm` means a preview only.
- Settings and package writes are not undoable and not batchable; record the old values first.
- Passing several ids to one `package add`: the documented `identifier` takes one; read the schema first.
- Using the default 30 s CLI timeout for registry queries or `--wait true`.
- Treating a dropped connection after a package change as a failed install (bridge check `transport-1`).
- Commands named from an older page (`package_add`, `get_runtime_pipeline_settings`): names differ between Pipeline versions; read the live catalog.
