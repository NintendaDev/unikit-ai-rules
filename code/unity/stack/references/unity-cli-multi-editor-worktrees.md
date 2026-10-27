# Unity CLI — Several Editors, Worktrees and Agent Sessions

> See also: [unity-cli-editor-session.md](unity-cli-editor-session.md), [unity-cli-version-control.md](unity-cli-version-control.md), [unity-cli-projects-templates.md](unity-cli-projects-templates.md), [unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md); base rule: [../unity-cli.md](../unity-cli.md).

Written against Unity CLI 1.0.0-beta.14 and com.unity.pipeline 0.9.1-exp.1; the live catalog (`unity command --query <term> --format json`) outranks this page.

---

## Goal -> command

| Goal | Command |
|---|---|
| Aim every call at one project's Editor | `--project-path "<full project path>"` on `command`, `list`, `job`, `status` |
| Pin one Editor by Pipeline port, process id or MPPM instance | `--port <n>`, `--pid <n>`, `--instance "<name or vpId>"` |
| Pin a call without a flag (fresh shell per call) | Git Bash: `UNITY_PROJECT_PATH="<project>" unity command ...`; PowerShell: `$env:UNITY_PROJECT_PATH = "<project>"; unity command ...` |
| See every running Editor with its project path, port, pid | `unity status --format json` (`data.instances[]`) or `unity pipeline list --format json` |
| Wait for the Editor of this checkout | `unity status --until-ready --project-path "<full project path>"` |
| Make a worktree for a branch | `unity vcs git worktree add <branch> --into <path> --format json` ([unity-cli-version-control.md](unity-cli-version-control.md)) |
| Open that worktree's own Editor | `unity open "<project>"` |
| List a project's Multiplayer Play Mode clones | `unity command editor.playmode list_instances --project-path "<project>"` |
| Reach a clone | `unity command <group> <name> --instance "Player 2"` |
| Target a running Player build instead of an Editor | `--runtime <process name>` or `--runtime-path <port-file folder>` |

## How a target is chosen

`unity command`, `unity list`, `unity job` and `unity mcp` share one resolver; it reads selectors in this order and stops at the first that applies:

1. `--runtime`, then `--runtime-path`: a Player, read **before** `--project-path`. Pass only the one you mean.
2. `--port`, `--pid`, `--instance`: pin one Editor. All pins and `--project-path` beside them must name the same Editor. A pin skips steps 3 and 4 and reaches a clone while its main Editor is open. No match: `EDITOR_NOT_RUNNING` (exit 12) with the running Editors as `data.candidates`. A pin beside a runtime selector is exit 2. `UNITY_PROJECT_PATH` is ignored when a pin is given.
3. `--project-path <path>`, or `UNITY_PROJECT_PATH` when the flag is absent.
4. Otherwise the running Editor whose project directory contains the current directory (deepest match wins).

When step 4 finds none or ties, the CLI does not guess: `AMBIGUOUS_EDITOR` (exit 6). Pass `--project-path` whenever more than one Editor may run; relying on the working directory makes the target invisible in the command you ran.

## Case: one Editor per worktree (parallel agent sessions)

**When:** two or more agents or branches work on the same repository at once.

**Steps:**
```bash
unity vcs git worktree add feature/hud --into ../hud-wt --format json     # read `project` from the JSON, not from human output
unity open "<project of that worktree>"
unity status --until-ready --project-path "<project of that worktree>" --format json
unity command scene list_open --project-path "<project of that worktree>"
```
The Unity project is `<path>` when it sits at the repository root and `<path>/<its folder>` otherwise. Pin **every** later call the same way, by the full path.

**Verify:** `unity status --format json` has a `ready` row whose `projectPath` is your worktree's project; compare `port` and `pid` with what you pinned. Read back each change from that same Editor.

**Pitfalls:**
- A full path that exists matches only that project; a bare name matches any path containing it, so an Editor on `<project>-lighting` next to `<project>` can answer a name that was meant for the other one. Use the full path.
- A fresh worktree imports from scratch on first open; `--seed` on `worktree add` pre-fills `Library` (see the version-control file).
- Two sessions on one Editor share its active scene, selection, Play state and Undo stack, and one session's `scene open` discards the other's unsaved work (bridge `scene-2`). Give each session its own worktree and Editor.
- `--port` changes when an Editor restarts: re-read it from `unity status` instead of caching it.

## Case: never drive a sibling checkout's Editor

**When:** the only `ready` Editor belongs to another worktree, or your own Editor is gone. This is a policy, not an invocation, so there is no snippet.

An Editor open on another worktree answers every command exactly like yours. A command sent there edits that checkout's scenes, and its Play Mode, recompiles and imports run against that checkout's code. Drive only the Editor whose project is your own checkout (or one of its MPPM clones). If your own Editor is not open, open it; if it has gone away, tell the user rather than borrowing the one that is running. The same holds for a call that fails with `AMBIGUOUS_EDITOR`: choose by the path you own, never by the first candidate.

**Verify:** before the first write of a session, `unity status --format json` shows the row you target with `projectPath` equal to your checkout's project.

## Case: `AMBIGUOUS_EDITOR` or `EDITOR_NOT_RUNNING`

**When:** a call fails with one of these codes (exit 6 and exit 12).

**Steps:**
```bash
unity command editor status --format json            # fails with candidates in data.candidates
unity status --format json                           # data.instances[].projectPath, port, pid for every Editor
unity command editor status --project-path "<path taken from the list>" --format json
```
Under `--format json` the failure envelope lists `data.candidates` as `{ project, projectPath, port, pid }`, so pick without parsing text. If your project is not in the list, its Editor is not running (or a sandbox hides it: see [unity-cli-editor-session.md](unity-cli-editor-session.md)). A heartbeat older than 60 seconds marks an instance as gone.

**Verify:** the retried call with `--project-path` succeeds and reports the project you meant.

## Case: a fresh shell for every command

**When:** your tool starts a new shell per command, so nothing exported earlier survives.

Agent tools usually start a new shell per command, so an `export` or a bare assignment in one call never reaches the next. Prefix each call, or pass the flag.
```bash
UNITY_PROJECT_PATH="<project>" unity command scene list_open
```
```powershell
$env:UNITY_PROJECT_PATH = "<project>"; unity command scene list_open
```

| Command | Reads `UNITY_PROJECT_PATH`? |
|---|---|
| `open`, `status`, `command`, `list`, `job`, `mcp` | yes |
| `recompile`, `close`, `mcp configure` | **no**: pass `--project-path` |

Without the variable a bare `unity open` opens the project of the current directory, which may be your source checkout rather than the worktree.

**Verify:** the first call's reply (or `unity status`) names the worktree's project, not the source checkout.

## Case: Multiplayer Play Mode clones (pointer level)

**When:** the project runs virtual players and a call must reach one of them.

MPPM runs one extra Editor per virtual player; each has its own Pipeline server and port. The clone's project is scaffolding under `<project>/Library/VP/<vpId>`, so identify it by fields, not by project name.

| Field | Main Editor | Clone |
|---|---|---|
| `role` | `main` | `clone` |
| `instanceName` | `Main Editor` | `Player 2` |
| `vpId` | absent | e.g. `mppm1a2b3c4d` |

The resolver collapses a project's clones into its main Editor, so `unity command` without a pin reaches the main one. Reach a clone with `--instance "Player 2"` (or its `vpId`), or with `--project-path <project>/Library/VP/<vpId>`. A clone whose main Editor is unreachable is still offered as a candidate. `editor.playmode list_instances` works on every supported Unity version and needs no MPPM package; scenario control (`list_scenarios`, `start_scenario`, ...) needs Unity 6000.3+ and `com.unity.multiplayer.playmode`, and is outside these files (collected docs: `commands/multiplayer-play-mode.md`).

```bash
unity command editor.playmode list_instances --project-path "<project>"
unity command editor status --instance "Player 2" --project-path "<project>"
```
**Verify:** `editor.playmode list_instances` lists the clone with its `projectPath`; a call with `--instance` answers from that clone, not from the main Editor.

## Discovery facts worth knowing

- Each Editor publishes `<project>/Library/Pipeline/.unity-pipeline-port` (a git-ignored file) with `pid`, `port`, `projectPath`, a bearer token and a heartbeat refreshed every 15 seconds; Editor ports are the first free one in 7800-7849, Player ports 7900-7949. Never read or copy the token; the CLI handles it.
- The server answers only requests addressed to `127.0.0.1`. Use the CLI rather than a hand-built HTTP client.
- `unity status` works from these files, so a stale or hidden file looks like a missing Editor.

## Pitfalls

- Omitting `--project-path` with two Editors open and trusting the working directory.
- Passing both `--runtime` and `--project-path`: the runtime wins.
- Passing a pin together with `--runtime` or `--runtime-path`: usage error (exit 2).
- Driving the Editor of a sibling worktree because it was the only one `ready`.
- Assuming `UNITY_PROJECT_PATH` survives between agent commands, or that `recompile` and `close` honor it.
