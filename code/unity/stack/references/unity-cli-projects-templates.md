# Unity CLI — Projects, templates and new-project bootstrap
> See also: [../unity-cli.md](../unity-cli.md) · [unity-cli-editors-modules.md](unity-cli-editors-modules.md) · [unity-cli-auth-cloud.md](unity-cli-auth-cloud.md) · [unity-cli-version-control.md](unity-cli-version-control.md) · [unity-cli-editor-session.md](unity-cli-editor-session.md)

Written against Unity CLI 1.0.0-beta.14; the CLI's own `--help` outranks this page.

---

## Goal -> command

| Goal | Command |
|---|---|
| Registered projects | `unity projects list --format json` (on a terminal without it, a pager waits for a key) |
| Details: Editor version, cloud link, diagnostics | `unity projects info "<project>" --format json` |
| New project, scripted, never prompts, never cloud | `unity projects new "<name>" --path "<parent>" --editor-version lts --template com.unity.template.urp-blank` |
| New project with cloud / VCS options | `unity projects create "<name>" ... --no-cloud` (see below) |
| Clone a repo | `unity projects clone <url>` or `--vcs github --vcs-namespace <ns> --vcs-repo <repo> --path <dir>` |
| Open and wait until commands work | `unity open "<project>" --until-ready --timeout 600 --format json` |
| Close its Editor (**no save**) | `unity close "<project>"` (`--timeout`, `--force`) |
| Move to another Editor version | `unity projects upgrade "<project>" --to <version> --yes` |
| Make sure its Editor is installed | `unity projects require "<project>" --yes` |
| Is the project sound (meta/guid/manifest)? | `unity projects verify "<project>" --strict` |
| Free disk / size | `unity projects clean "<project>" --dry-run`, `unity projects size "<project>"` |
| Template ids for an Editor | `unity templates list --editor <6000.x.y> --type core --brief --format json` |
| Package assets | `unity assets inspect\|export\|import ...` |
| Link a folder to Unity Cloud | `unity projects link cloud "<project>" --cloud-project <id-or-name>` |
| Register / unregister (files kept), favourite | `unity projects add "<path>"` / `remove "<path>"` / `pin "<path>"` |

---

## Bootstrap a new project: the order

Decide first: target platforms (they choose the Editor modules), 2D or 3D, render pipeline (default URP), source control. Each step has a read-back; do not move on without it.

```bash
# 1. CLI, licence, and sign-in (sign-in only matters when the cloud link or a UVCS repo is wanted)
unity --version && unity license status --format json && unity auth status --format json
# 2. Editor with the modules the platforms need
unity install lts --module android --module ios --yes --accept-eula
unity editors --installed --format json                       # note the CONCRETE version, e.g. 6000.0.47f1
# 3. Real template ids for that concrete version; pick by render pipeline
unity templates list --editor 6000.0.47f1 --type core --brief --format json
# 4. Create. Name is positional, --path is the PARENT folder. Fully specified, so nothing prompts.
unity projects create "MyGame" --path "<parent-dir>" --editor-version lts \
  --template com.unity.template.urp-blank --no-cloud --non-interactive --format json
# 5. Pipeline package: create already added it (see Verify). Only if the result says otherwise:
unity pipeline install --project-path "<parent-dir>/MyGame"   # BEFORE the first open
# 6. First open, wait until the Editor serves commands
unity open "<parent-dir>/MyGame" --until-ready --timeout 600 --format json
# 7. Work in the live Editor (editor-session file); commit only after the Editor ran, so .meta files exist
```

**Verify**
- Step 4 JSON: `data.pipeline.installed` is `true` and `data.steps` shows no `failed` entry (a failed step still exits `0`, so read it); `Packages/manifest.json` lists `com.unity.pipeline`.
- Step 6 exit `0` with `data.ready.outcome` `ready`. Wait by the project's full path, so an Editor open on a sibling checkout cannot end the wait.

**Pitfalls**
- `projects create` adds `com.unity.pipeline` right after scaffolding unless `--bare`; `projects new` does **not**. An unreachable registry only warns (exit `0`, `installed:false`, `PIPELINE_INSTALL_FAILED`); `pipeline install --project-path` retries. Pre-Unity-6 projects are skipped (`skipped: UNSUPPORTED_VERSION`).
- Package installed while the Editor is already open: `unity status` reports `STATUS_PIPELINE_LOAD_PENDING` until the Editor window regains focus (or while it still imports). The CLI cannot trigger the refresh: ask the user to focus the Editor, then `unity status --until-ready`. Installing before the first open avoids it.
- The project folder must be new or empty (hidden files and `.git` count): otherwise exit `6`, `Project path already exists`, nothing written.
- Do not scaffold gameplay in batch mode (`unity run -- -executeMethod`) when an Editor can stay open: batch cannot see what it produced (a reference saved as null still reports success). Details: [unity-cli-editor-session.md](unity-cli-editor-session.md).
- Extra UPM packages after the template: `package add` through the live Editor ([unity-cli-settings-packages.md](unity-cli-settings-packages.md)); never hand-edit `manifest.json`.

## Templates

Pick by render pipeline, not 2D/3D alone. Ids as of Unity 6000.3 to 6000.7:

| Brief | Template id | Pipeline |
|---|---|---|
| 3D (default) | `com.unity.template.urp-blank` | URP |
| 2D (default) | `com.unity.template.universal-2d` | URP + `com.unity.2d.*` (JSON `renderPipeline` is blank: match by id) |
| High-fidelity PC / console | `com.unity.template.hdrp-blank` | HDRP |
| VR / MR / AR | `com.unity.template.vr` / `.mixed-reality` / `.ar-mobile` | URP |
| Built-in, only if the user asks | `com.unity.template.3d` / `com.unity.template.2d` | Built-in; deprecated from 6.5, absent from 6.7 |

- `--template 3d` and `--template 2d` name the version's **URP** templates (`com.unity.template.universal-2d` for 2D); create never falls back to Built-in. A version without the URP template exits `6`, `TEMPLATE_NOT_FOUND`, and `data.offered` lists what exists.
- `templates` takes a concrete `6000.x.y` for `--editor`; `lts` / `latest` fail with an invalid-version error. Read the version from `editors --installed`.
- `--brief` trims the JSON to name, displayName, type, version, status; the full payload can run to hundreds of KB.
```bash
unity templates list --editor 6000.0.47f1 --type core --brief --format json       # ids, not display names
unity templates info com.unity.template.universal-2d --editor 6000.0.47f1 --format json
```

- Custom: `templates create "<project>" --name com.org.template.x --display-name "X"` registers it (`templates list --custom`); `templates pack "<project>" --output ./x.tgz --name ... --display-name ...` writes a standalone archive (`--output` is a file, not inside the project). `--template ./x.tgz` feeds either into `projects create`. `templates edit|delete` touch only user templates; `templates location` gets or sets the folder.

## Cloud link on create, and linking later

`projects create` links to Unity Cloud **by default**, even when it cannot ask (CI, `--non-interactive`, machine formats). So signing in is a precondition: signed out it fails `NOT_SIGNED_IN` (exit `3`), a service account fails `CLOUD_PROJECT_REQUIRES_OAUTH` (exit `3`), before anything is scaffolded.

- Scripts and CI: pass `--no-cloud` (or `UNITY_NO_CLOUD`, any value). `--cloud`, `--cloud-project <id-or-name>`, `--cloud-org`, `--coppa` answer the question the other way; `--no-cloud` beside them is refused.
- `--non-interactive` on a TTY silences only the cloud question; also pass `--path`, `--editor-version`, `--template`, or use `projects new`.
- A link that fails after the project exists leaves the project unlinked with a warning, exit `0`; explicit `--cloud` fails outright. Absence of `cloudLinked` in the JSON means no link was requested.
- `--coppa not_compliant` is the default for a *new* cloud project; use `compliant` for a game aimed at children under 13. It cannot be combined with `--cloud-project` / `--no-cloud` (`COPPA_ARGS_CONFLICT`) and never changes an existing project.

```bash
unity projects link cloud "<project>" --cloud-project <id-or-name>             # link an existing cloud project
unity projects link cloud "<project>" --cloud-project <id> --replace           # switch an already linked project
unity close "<project>" && unity open "<project>"                              # relink needs an Editor restart
```

`link cloud` creates a cloud project only when none is named by `--cloud-project`, `UNITY_CLOUD_PROJECT` or the saved default (`cloud project set-default`, see [unity-cli-auth-cloud.md](unity-cli-auth-cloud.md)). Failures to know: `ALREADY_LINKED` (exit `2`, the message carries the `--replace` command), `CLOUD_PROJECT_NAME_TAKEN` (exit `6`, nothing created), `REPLACE_NEEDS_CLOUD_PROJECT`, `VCS_DEPENDS_ON_CLOUD` (unlink VCS first). An open Editor keeps the old link and may write it back: `data.editor.restartRequired` is `true`; close and reopen. `unity projects unlink cloud "<project>"` disconnects.

## Source control at creation

`--vcs github|gitlab|uvcs|<host>` creates a remote and pushes; flags `--git-namespace`, `--git-repo`, `--git-visibility`, `--git-default-branch`, `--git-lfs`, `--no-initial-commit`, `--vcs-region` (UVCS). Add `--no-initial-commit` when packages or assets must exist before the first commit. UVCS needs a cloud project (`--vcs uvcs` with `UNITY_NO_CLOUD` set is refused); UVCS handles binaries without LFS. Pass the Git token on **stdin**, never as a literal:

```bash
printf '%s' "$GIT_TOKEN" | unity projects create "MyGame" --path "<parent-dir>" --editor-version lts \
  --vcs github --git-namespace my-org --git-repo my-game --git-visibility private \
  --git-token-from-stdin --git-lfs --no-initial-commit          # bash; PowerShell: $env:GIT_TOKEN | unity projects create ...
```

Token order: stdin flag, `--git-token`, `UNITY_GITHUB_TOKEN` / `UNITY_GITLAB_TOKEN`, `git credential fill`, masked prompt; the CLI stores none. With nobody to answer (CI, machine format) a missing credential exits `4`. Flag names differ: `create` / `link vcs` use `--git-namespace` / `--git-repo`, `clone` uses `--vcs-namespace` / `--vcs-repo`. `--git-token` works only for github.com / gitlab.com over HTTPS. Day-to-day Git or UVCS work, `.gitignore`, LFS, `.meta` pairing: [unity-cli-version-control.md](unity-cli-version-control.md).

## Open, wait, close

```bash
unity open "<project>" --until-ready --timeout 600 --format json   # 0 ready | 6 dialog/exited | 10 timeout
unity open "<project>" --batchmode --until-ready --format json     # headless Editor; stop with unity close --force if no Pipeline
unity 6000.0.47f1 "<project>"                                      # shorthand for open --editor-version
```

| `errors[0].code` | Exit | Do |
|---|---|---|
| `OPEN_BLOCKED_BY_DIALOG*` (`_SAFE_MODE`, `_GRAPHICS_API`, `_SOFTWARE_TERMS`) | 6 | read `data.ready.dialog.kind`: `projectUpgrade` / `scriptUpdating` -> ask the user, or reopen with `--accept-upgrades` / run `projects upgrade`; `safeMode` -> fix compile errors; `softwareTerms` -> user accepts once ([unity-cli-editors-modules.md](unity-cli-editors-modules.md)); `graphicsApi` / `other` -> user answers in the Editor |
| `OPEN_EDITOR_EXITED_BEFORE_READY` | 6 | read the Editor's `Editor.log` |
| `OPEN_READY_TIMEOUT` | 10 | Editor still runs; `unity status --project-path "<project>"` or a larger `--timeout` |

- `open` on an already-open project exits `0` with `data.alreadyOpen: true` and `pid`; nothing launches and no window is raised.
- `--accept-upgrades` upgrades the project and lets Unity rewrite obsolete-API scripts with no backup prompt. Pass it only when the user chose it, after a VCS checkpoint. It never moves a project onto 6.7+ (`PROJECT_UPGRADE_REQUIRED`, exit `2`; use `projects upgrade`).
- `--wait` returns the Editor's real exit code but is refused on Windows (exit `2`). `--timeout` needs `--until-ready` and `--until-ready` excludes `--wait`.
- Never put `-projectPath`, `-useHub`, `-hubIPC` in `--args` (exit `6`).
- **`unity close` exits the Editor without saving.** Unsaved scene edits are gone and the undo journal does not return them (bridge `Irreversible` section; same family as check `scene-2`). Save first, ask the user, then close; `--force` terminates the process.

## Upgrade, verify, clean

```bash
unity projects upgrade "<project>" --to 6000.7.0f1 --yes --no-cloud     # a 6.7+ target needs a cloud choice; below 6.7 leave it out
unity projects verify "<project>" --strict --expect-editor 6000.0.47f1 --format github
unity projects clean "<project>" --dry-run                              # sizes of Library/Temp/Logs; then --yes to delete
```

**Verify:** `projects info "<project>" --format json` shows the new `editorVersion`; `verify` exits `0`.

- `projects upgrade --to <version>`: into 6.7+ an unlinked project needs a cloud choice, else `CLOUD_CHOICE_REQUIRED` (exit `2`) with one `notifications` entry per option; ask the user, then add `--cloud`, `--cloud-project "<id-or-name>"` or `--no-cloud`.
- `projects verify` needs no Editor, licence or network. Errors (`META_MISSING`, `GUID_DUPLICATE`, `CONFLICT_MARKERS`, `MANIFEST_INVALID`) exit `6`; warnings (`META_ORPHAN`, `EDITOR_VERSION_DRIFT` only with `--expect-editor <v>`, `PATH_UNVERIFIABLE`) pass unless `--strict`. It detects, never repairs.
- `projects clean` deletes `Library`, `Temp`, `Logs`: first `--dry-run`; it refuses an open project and, unattended, needs `--yes`. If it cannot tell whether an Editor holds the project it warns and proceeds, so close Editors first. The next open reimports slowly.
- `projects exec --filter 'version:6000.*' --parallel 4 -- <cmd>` runs a command per registered project (no shell: no pipes or `&&`); stops at the first failure unless `--continue-on-error`.

## `.unitypackage` files

```bash
unity assets inspect ./Art.unitypackage --format json                         # offline: path, GUID, size, preview
unity assets export Assets/Art --output ./Art.unitypackage --no-sign --project "<project>"
unity assets import ./Art.unitypackage --project "<project>"
```

`export` and `import` start a batch-mode Editor: the project must not be open in another Editor, a matching Editor must be installed, CI spends a licence seat. Asset paths (inside `Assets/` or `Packages/`) are validated before the boot (`ASSET_PATH_NOT_FOUND`, `ASSET_PATH_OUTSIDE_PROJECT`); dependencies are included unless `--no-dependencies`. From Unity 6.6 export signs by default for an organization (`--cloud-org`, `UNITY_CLOUD_ORG`, stored default; service accounts must pass an id); `--no-sign` skips; unsigned output is deleted with `ASSETS_EXPORT_SIGNING_FAILED`. Import is checked locally first (`ASSET_PACKAGE_NOT_FOUND`, `ASSET_PACKAGE_EMPTY`). Do not close the user's Editor to make room.
