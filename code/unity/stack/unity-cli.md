---
version: 1.0.0
---

# Unity CLI

> **Scope**: Operating Unity from a terminal or an AI agent with the Unity CLI (`unity`, v1.0.0-beta.14) and its live-Editor layer (the `com.unity.pipeline` package, 0.9.1-exp.1) — choosing between standalone commands and `unity command` against a running Editor, installing Editors and creating projects, authoring scenes, prefabs, GameObjects, UI, sprites, materials and animations through the CLI, compile, test and Play Mode loops, headless builds and CI, licenses, version control, and the behaviours where a call reports success but nothing changed.
> **Load when**: running any `unity` command, installing or opening a Unity Editor or project from a terminal, driving a running Editor from an agent instead of editing scene, prefab or asset files, creating or editing scenes, prefabs, GameObjects, uGUI or UI Toolkit screens, sprites, materials or animations through the CLI, compiling code, running tests or entering Play Mode from the command line, setting up headless builds or CI, activating licenses, setting up Git or Unity Version Control for a project, recovering a lost Editor connection, choosing which `unity` command fits a task.
> **References**: `.unikit/memory/code/stack/references/unity-cli-install-diagnostics.md` (CLI install, update, doctor, proxy, bug reports), `.unikit/memory/code/stack/references/unity-cli-editors-modules.md` (Editors and platform modules), `.unikit/memory/code/stack/references/unity-cli-projects-templates.md` (create, open, upgrade projects, templates, packages of assets), `.unikit/memory/code/stack/references/unity-cli-auth-cloud.md` (sign-in, service accounts, cloud organizations), `.unikit/memory/code/stack/references/unity-cli-licenses.md` (license activation and return, CI seats), `.unikit/memory/code/stack/references/unity-cli-version-control.md` (Git and UVCS, merge, conflicts, diffs), `.unikit/memory/code/stack/references/unity-cli-build-ci.md` (headless builds and CI recipes), `.unikit/memory/code/stack/references/unity-cli-editor-session.md` (connecting to a live Editor, Safe Mode, jobs, batch), `.unikit/memory/code/stack/references/unity-cli-multi-editor-worktrees.md` (several Editors, worktrees), `.unikit/memory/code/stack/references/unity-cli-scenes.md` (scenes), `.unikit/memory/code/stack/references/unity-cli-gameobjects-components.md` (objects, components, UI hierarchies), `.unikit/memory/code/stack/references/unity-cli-prefabs.md` (prefabs), `.unikit/memory/code/stack/references/unity-cli-assets-import.md` (assets, import settings, text assets), `.unikit/memory/code/stack/references/unity-cli-sprites-atlases.md` (sprites and atlases), `.unikit/memory/code/stack/references/unity-cli-materials-shaders.md` (materials), `.unikit/memory/code/stack/references/unity-cli-animation-timeline.md` (clips, Animator, Timeline), `.unikit/memory/code/stack/references/unity-cli-baking.md` (lighting, NavMesh, occlusion), `.unikit/memory/code/stack/references/unity-cli-scripts-compile-eval.md` (C# scripts, recompile, eval), `.unikit/memory/code/stack/references/unity-cli-tests.md` (tests), `.unikit/memory/code/stack/references/unity-cli-playmode-runtime.md` (Play Mode, runtime, screenshots, console), `.unikit/memory/code/stack/references/unity-cli-settings-packages.md` (project settings, packages)

---

## Core Model

- The CLI has **two layers**. Pick the layer first; it decides which reference you need.

| Layer | Needs | Entry points | Typical work |
|---|---|---|---|
| **Standalone** | only the `unity` binary | `unity install`, `projects`, `open`, `build`, `test`, `run`, `license`, `auth`, `vcs`, `config`, `doctor` | Editors, modules, projects, headless build and test, licenses, accounts, version control, diagnostics |
| **Live Editor** (Pipeline) | a project with `com.unity.pipeline` (Unity 6.0+), an Editor open and `ready` | `unity status`, `unity command <group> <verb>`, `unity list`, `unity job` | Scenes, GameObjects, prefabs, assets, UI, compile, tests, Play Mode, screenshots, C# execution |

- **If an Editor is open and reachable, drive it.** Never hand-edit `.unity`, `.prefab`, `.asset` or `.meta` files while one is reachable: hand-assigned fileIDs and GUIDs break easily, the running Editor does not see the change until a reimport, and the write can land in a file other than the active scene. Fall back to file edits only after ruling out Safe Mode and a sandbox that hides the Editor (see `unity-cli-editor-session.md`), and say explicitly that no live Editor was used.
- The CLI is a **beta** and its surface follows the Editor version and the packages in the project. A command in these files can be missing in your build, and a command in the live catalog can need a package the project lacks. **The live catalog and the schema outrank every page of this rule.**
- Always use the latest CLI unless told otherwise: `unity self-update --check --format json`. An outdated CLI fails in ways that read like wrong documentation.
- One Editor executes one command at a time. A long synchronous call holds the lane for everyone.
- Exhaustive parameter tables are in the collected documentation `.unikit/references/bridges/unity-cli/` (`INDEX.md`, `FILES.md`; search with `Grep`, never read whole). The project's known failure classes and their checks are in `.unikit/system/engine-bridges/unity-cli/INDEX.md`; the reference files cite them as bridge checks (`scene-2`, `compile-2`, …).

## Work Loop

1. **Orient** — `unity status --format json`; look for the project's instance with state `ready`. Wait with `unity status --until-ready --project-path "<project>"`. Asset and scene paths are relative to the authoring root (`authoring get_root`, `Assets/` by default).
2. **Find the command** — `unity commands --grep <term>` or `unity command --query <term> --format json`. Both search built-in commands, plugins and the connected Editor's commands. Never filter `--help` output with `grep`: help is long and a filter drops the match.
3. **Read the schema** before the first call of a command. The compact listing reports zero parameters for every command; that number does not mean "no parameters".
4. **Act narrowly** — one change, then verify. Read objects by name, tag or type; do not dump a whole scene (about 30 tokens per object).
5. **Read back** the changed state by name. A success reply is not evidence.
6. **Save** what you changed (`scene save`, `editor save_all`) once the read-back is clean.
7. **Clean up** — stop a Play Mode you started, remove temporary objects and files.

```bash
unity status --until-ready --project-path "<project>"
unity command --query scene --format json --project-path "<project>"
unity command scene list_open --project-path "<project>"
unity command editor.playmode start --project-path "<project>"
```

Parameters follow the command name as the schema names them: `unity command <group> <verb> --<parameter> <value>`. The CLI's own flags (`--project-path`, `--format`, `--timeout`, in seconds) are consumed by the CLI; to pass a command parameter whose name collides with one of them, put the command's arguments after `--` (confirm the form in the command's schema).

## Hard Rules

- **Target explicitly.** Pass `--project-path "<full project path>"` whenever more than one Editor may run. Without it the CLI targets the Editor whose project contains the current directory. Never drive an Editor whose project is not your own checkout.
- **Machine output.** Use `--format json` (or `--json`) when you parse output; branch on the exit code, then on `errors[0].code`. In `tsv`, select columns by header name, never by position.
- **A timeout or a lifecycle failure is reported, not worked around.** Rule out Safe Mode, a sandbox and a still-importing Editor first; then tell the user what ran and what failed. Do not retry in a loop, switch to another Editor or fall back to file edits.
- **Ask before side effects outside the task.** Run none of these on your own initiative: `unity bug` (uploads logs), `unity close` (quits an Editor without saving), `unity self-update`, `unity plugin install`, `unity skill install`, `terms accept --yes`, `license activate --personal --accept-eula`, `projects clean`, `editors prune --remove`, `cloud org create`. When the JSON envelope carries a `notifications` entry whose `remediation.requiresUserApproval` is true, do not run the suggested command yourself.
- **Cloud link by default.** `projects create` links the project to Unity Cloud unless told otherwise, and a service account cannot create that link (exit 3). Scripts and CI pass `--no-cloud`.
- **Secrets never go on the command line.** Pass a service-account secret from stdin (`--secret-from-stdin`) or from the `UNITY_SERVICE_ACCOUNT_*` environment variables.
- **Irreversible steps need a save and a commit first.** Opening or creating a scene in place of an unsaved one discards the unsaved work; a hung call can force an Editor restart; prefab-asset and file writes are outside Unity's Undo; mutating scene commands are refused in Play Mode; a transactional `job batch` rejects asset, settings, material, prefab-asset, animation-asset and package writes.
- **Names come from the live catalog.** Command names differ between Pipeline versions and parameter spelling mixes `snake_case` and `camelCase`; copy both from the schema, never from memory or from a page written for another version. Pipeline 0.9+ names are `<group> <name>`; flat names from older pages map as follows, and `unity command --obsolete-command-names --query <old-name>` resolves the rest:

| Older flat name | Grouped name |
|---|---|
| `eval`, `eval_file`, `run_script` | `script eval`, `script eval_file`, `script run` |
| `recompile`, `recompile_status` | `script recompile`, `script recompile_status` |
| `run_tests`, `list_tests`, `test_status`, `cancel_tests` | `test run`, `test list`, `test status`, `test cancel` |
| `editor_play`, `editor_status`, `set_autotick` | `editor.playmode start`, `editor status`, `editor set_auto_tick` |
| `package_add`, `audit`, `reload_file` | `package add`, `diagnostics run_audit`, `script.methodreload reload` |

- **Two `job`s.** `unity job …` (status, wait, cancel) is the CLI's own detached-job command; `unity command job batch` / `job wait` is the Pipeline group. They are unrelated.
- **Timeouts have two owners.** The CLI's `--timeout` is whole seconds (default 30 for `unity command`); a command's own `timeout` parameter has its own unit, read from the schema.
- **Quoting.** JSON- and C#-valued arguments need single quotes in Git Bash and escaped `\"` in Windows PowerShell 5.1. For anything longer than a one-liner write a file and run it (`script run`, `script eval_file`) — see `unity-cli-scripts-compile-eval.md`.
- **Name the scope of a test run.** A live `test run` defaults to `all` (Play Mode included), and an unfiltered run of a large suite takes tens of minutes to start. Pass the mode, a filter and `--timeout` (see `unity-cli-tests.md`).
- **Agent shells and `vcs`.** The `vcs` verbs default to `tsv` with advisories on stderr; pass `--format json`. `unity logs` shows the CLI's own log; the Editor console is `unity logs --console --project-path`.
- **Verify by the claim.** A read after a failed compile or after a flood of console messages describes the past; a misspelled settings key or animation property answers success with nothing applied. Read the value back.

## Base: Flags, Environment, Exit Codes

| Flag | Use |
|---|---|
| `--format json` / `--json` | machine-readable envelope (`success`, `data`, `errors`); `ndjson`, `tsv`, `github` also exist |
| `--non-interactive` | no prompts — CI and agents |
| `--project-path <path>` | choose the Editor / project for Editor-driving commands |
| `--quiet` | hide notices and progress; errors and the exit code stay |
| `--verbose` | full error details on failure |

| Variable | Effect |
|---|---|
| `UNITY_PROJECT_PATH` | project path when none is passed (`open`, `status`, `command`, `list`, `job`; not `recompile`, `close`) |
| `UNITY_FORMAT` | default output format |
| `UNITY_NON_INTERACTIVE` | same as `--non-interactive` |
| `UNITY_SERVICE_ACCOUNT_ID`, `UNITY_SERVICE_ACCOUNT_SECRET` | non-interactive cloud authentication |

| Exit | Name | Retry | Meaning |
|---|---|---|---|
| 0 | `SUCCESS` | – | done |
| 1 | `ERROR` | no | unexpected or unsupported state |
| 2 | `BAD_ARGS` | no | usage error: nothing ran — fix the command line |
| 3 | `AUTH_ERROR` | no | not signed in, expired session, permission denied |
| 4 | `NEEDS_CONFIG` | no | a required tool, setting or link is missing |
| 6 | `COMMAND_FAILED` | no | failed for a reason no other code names |
| 7 | `NETWORK_UNREACHABLE` | yes | a required service could not be reached |
| 8 | `TESTS_FAILED` | no | `unity test` ran and some tests failed |
| 9 | `INSTALL_LOCKED` | yes | another process holds the install lock |
| 10 | `READY_TIMEOUT` | yes | `unity open --until-ready`: the Editor did not become ready |
| 11 | `NOT_FOUND` | no | project, release or module does not exist |
| 12 | `EDITOR_UNREACHABLE` | yes | no running Editor answered or matched |
| 13 | `REMOTE_COMMAND_FAILED` | no | the Editor answered but has no command by that name |
| 14 | `TIMEOUT` | yes | an Editor request, HTTP request or batch run ran out of time |
| 130 / 143 | `INTERRUPTED` / `TERMINATED` | yes | Ctrl-C / SIGTERM |

Do not retry exit 2 unchanged, and do not rewrite a command line on a retryable code. For `unity test`, a run that never completed (6) or timed out (14) can be retried by CI; never blindly re-run exit 8.

## Domain Lookup Workflow

Open the reference for the work at hand **before** the first call in that area. Open one at a time; add a second only when the task crosses areas. Do not act from memory of command names.

**UI work uses these files too.** uGUI Canvas, RectTransform, Button and layout work is scene, GameObject, component and prefab work; UI Toolkit UXML/USS files are text assets; UI sprites are sprite imports. The rows below say so explicitly. Layout rules for uGUI hierarchies live in the project rule `ugui-layout.md`; this rule only supplies the CLI mechanics.

| The task involves… | Open |
|---|---|
| `unity` not found, outdated, a proxy, odd behaviour, `doctor`, `logs`, a bug report, finding Unity documentation | `unity-cli-install-diagnostics.md` |
| Installing or removing an Editor, platform modules (Android, iOS, WebGL), LTS versus tech stream | `unity-cli-editors-modules.md` |
| Creating, opening, closing or upgrading a project, templates, `.unitypackage` export and import | `unity-cli-projects-templates.md` |
| Signing in, service accounts, cloud organizations and projects | `unity-cli-auth-cloud.md` |
| Activating or returning a license, floating or offline seats, CI licensing | `unity-cli-licenses.md` |
| Git or Unity Version Control setup, sync, `.meta` problems, merge of scenes and prefabs, conflicts, scene diffs, LFS, creating a worktree | `unity-cli-version-control.md` |
| Headless build, build profiles and targets, CI pipelines | `unity-cli-build-ci.md` |
| No Editor connection, Safe Mode, a command that hangs, a modal dialog, jobs, batch, waiting for async commands, the command grammar | `unity-cli-editor-session.md` |
| Several Editors, parallel agent sessions, one Editor per worktree, `AMBIGUOUS_EDITOR` | `unity-cli-multi-editor-worktrees.md` |
| Creating, opening, saving, hierarchy of scenes; the build scene list; additive scenes — **including UI scenes** | `unity-cli-scenes.md` |
| Creating or finding GameObjects, adding components, reading and writing properties, selection — **including every uGUI element: Canvas, EventSystem, RectTransform, Image, Button, TextMeshPro, layout groups** | `unity-cli-gameobjects-components.md` |
| Creating, instantiating, varying, editing prefabs; overrides — **including UI prefabs** | `unity-cli-prefabs.md` |
| Creating, moving, deleting or finding assets, import settings, ScriptableObject assets, text assets — **including UI Toolkit UXML and USS files** | `unity-cli-assets-import.md` |
| Sprite import, slicing, pivots, 9-slice borders, outlines, sprite atlases — **including UI sprites** | `unity-cli-sprites-atlases.md` |
| Materials, shader properties | `unity-cli-materials-shaders.md` |
| Animation clips, Animator controllers, Timeline | `unity-cli-animation-timeline.md` |
| Lighting bake, NavMesh bake, occlusion culling | `unity-cli-baking.md` |
| Creating or attaching C# scripts, compile errors, the recompile loop, `eval`, builder scripts, method reload, quoting C# in a shell | `unity-cli-scripts-compile-eval.md` |
| Running or listing tests, a run that hangs, filters, `unity test` | `unity-cli-tests.md` |
| Entering Play Mode, simulating input, time scale, screenshots, console, proving the game is running | `unity-cli-playmode-runtime.md` |
| Project settings, tags and layers, adding or removing packages | `unity-cli-settings-packages.md` |

## Not Covered

No reference file exists for: the CLI's own MCP server (`unity mcp`), the cloud inventory groups (`pipeline cloud-build`, `pipeline automation`), collaboration (annotations, Jira), authoring custom `[CliCommand]` commands, Multiplayer Play Mode scenarios, analytics. Read the collected documentation for them: `cli-skill/references/integration-advanced.md`, `cloud-automation.md`, `collaboration.md`, and `pipeline-docs/Documentation~/creating-commands.md`, `commands/multiplayer-play-mode.md` under `.unikit/references/bridges/unity-cli/`.

## Anti-patterns

- Filtering `unity --help` with `grep` instead of `unity commands --grep`.
- Editing `.unity`, `.prefab`, `.asset` or `.meta` files by hand while an Editor is reachable.
- Treating a success reply as proof, and reading the console or compile state after a failed compile as if it were current.
- Retrying a timed-out command in a loop, or switching to the Editor of another checkout.
- Omitting `--project-path` when more than one Editor runs.
- Guessing a command name or a parameter from memory, or copying one from a page written for another Pipeline version.
- Passing a service-account secret as a command-line argument.
- Treating "no instances" from a sandboxed agent shell as proof that no Editor is open.

## Source Map

| Source | Used for |
|---|---|
| https://docs.unity.com/en-us/unity-cli , `/use-unity-cli` , `/unity-cli-reference` | the two-layer model, command groups, install and update, exit codes |
| Unity-Technologies/skills — `skills/unity-cli`, `skills/unity-pipeline` | the work loop, hard rules, exit-code table, flags and variables, Safe Mode and sandbox guidance |
| Unity-Technologies/skills — `skills/ui-ugui`, `skills/sprite-editor`, `skills/manage-sprite-atlas`, `skills/unity-package-management` | which task families the lookup table must route, the UI rows |
| `.unikit/references/bridges/unity-cli/` (collected CLI skill and Pipeline package documentation) | layer boundaries, Editor-driving model, the beta caveat |
| `.unikit/system/engine-bridges/unity-cli/INDEX.md` | failure classes and checks the hard rules point to |
