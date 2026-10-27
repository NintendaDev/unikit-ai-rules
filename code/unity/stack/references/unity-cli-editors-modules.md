# Unity CLI — Editors, modules and releases
> See also: [../unity-cli.md](../unity-cli.md) · [unity-cli-projects-templates.md](unity-cli-projects-templates.md) · [unity-cli-build-ci.md](unity-cli-build-ci.md) · [unity-cli-install-diagnostics.md](unity-cli-install-diagnostics.md)

Written against Unity CLI 1.0.0-beta.14; the CLI's own `--help` outranks this page.

---

## Goal -> command

| Goal | Command |
|---|---|
| What Editors are installed | `unity editors --installed --format json` (rows carry `moduleNames` and `upgradeTo`) |
| Which Editor a project needs | `unity projects info "<project>" --format json` -> `editorVersion` |
| Browse versions | `unity releases --stream lts --limit 5 --format json` (`--lts`, `--stream tech\|beta\|alpha`, `--from-year`, `--skip`) |
| Release details / download info of a version | `unity editors info <version> --format json` (`--architecture x86_64\|arm64`) |
| Install an Editor + platform modules | `unity install lts --module android --module ios --yes --accept-eula` |
| Preview an install | `unity install <version> --dry-run --format json` |
| List module ids of a version | `unity install <version> --list-modules --format json` or `unity modules list <version>` |
| Add modules to an installed Editor | `unity install-modules -e <version> -m android --yes --accept-eula` |
| Install what a project requires | `unity projects require "<project>" --yes` |
| Newest patch of an installed line | `unity editors upgrade <version>` (`--all`, `--dry-run`) |
| Remove an Editor | `unity uninstall <version> --yes` |
| Find unused Editors | `unity editors prune` (report only) |
| Check a half-installed Editor | `unity editors verify <version>` |
| Default Editor | `unity editors default lts` / `--unset` |
| Where one Editor lives / install root | `unity editors path <version>` / `unity editors install-path` |
| Register an Editor installed elsewhere | `unity editors add "<path-to-Unity-Editor>"` |
| Editor Software Terms | `unity terms status` / `unity terms accept <version>` (the user's decision) |
| Bootstrap the Hub app | `unity hub install` |

Which Editors are running right now: [unity-cli-editor-session.md](unity-cli-editor-session.md).

---

## Choose the version and modules

- Default to the latest **LTS** (`lts` alias). Use `--stream tech` only for a feature not yet in LTS; treat `beta` / `alpha` as evaluation-only, never for a project that ships. A deadline argues for LTS.
- An existing project keeps the version in its `ProjectSettings/ProjectVersion.txt`. Install that version (`projects require`) rather than opening it with another Editor: moving a project to a newer Editor is a deliberate upgrade (`projects upgrade`; a plain `open` refuses a move onto 6.7+), see [unity-cli-projects-templates.md](unity-cli-projects-templates.md).
- Decide the **target platforms first**; each needs its module before it can build (Android: `android`; iOS: `ios`; WebGL: `webgl`; Windows IL2CPP: `windows-il2cpp`, also reachable as `il2cpp`). Read real ids from `--list-modules`; the `Aliases` column / `aliases` field lists accepted alternates.
- `lts` / `latest` work for `install`, `projects create` and `editors default`. The `templates` commands are the exception and need a concrete `6000.x.y`.

```bash
unity releases --stream lts --limit 5 --format json     # confirm what exists
unity install lts --module android --module ios --yes --accept-eula
unity editors --installed --format json                  # the concrete version that landed
```

## Install a missing Editor

**When:** `editors --installed` lacks the version a project needs, or `unity open` warns the Editor is missing.

```bash
unity editors --installed --format json                  # is the version already there?
unity install 6000.0.47f1 --module windows-mono --module android --yes --accept-eula
unity editors --installed --format json                  # read moduleNames of the new row
```

**Verify:** the version appears in `editors --installed` with the wanted `moduleNames`; for a doubtful install run `unity editors verify <version>`.

**Pitfalls**
- Without a version, `install` asks interactively. Always pass the version (or an alias) in automation, plus `--yes --accept-eula` (`--yes` = take the first match; `--accept-eula` = module licence agreements). A real run downloads gigabytes: start it with a generous tool timeout and read the result once, do not poll in a loop.
- The `-m` list may be space-separated after one flag (`-m android ios`) or repeated; both are the same. Child modules are installed by default; `--no-child-modules` skips them.
- `--changeset <hash>` is for archive builds; `--force` reinstalls an existing Editor; `--resume` continues an interrupted download and recovers orphaned partials.
- A failed module does not abort the batch: the command continues and exits non-zero. The ndjson `result` frame lists each item (`uid`, `name`, `kind`, `status`) so you can tell which modules landed.
- Transient download failures retry twice by default (`UNITY_INSTALL_RETRIES`, or `--retries` on `install-modules` only; `unity install` has no such flag).

## Add or repair modules later

```bash
unity install-modules -e 6000.0.47f1 --list --format json          # available + installed (isInstalled, sizes in bytes)
unity install-modules -e 6000.0.47f1 -m android -m ios --yes --accept-eula
unity install-modules -e 6000.0.47f1 -m android --reinstall --yes  # repair; --force also skips prompts
unity editors module remove 6000.0.47f1 -m android --yes           # deletes module files; --yes required non-interactively
```

`--list` excludes `--module` and `--all`. `editors module add|remove|list|refresh` and the singular `unity editor module ...` are the same subcommands. Modules of an Editor registered with `editors add` are discoverable too. Verify with `modules list <version> --format json` (`isInstalled`).

## Concurrent installs and the install lock

The Hub and the CLI share one install lock. By default a second install waits without limit.

```bash
unity install 6000.0.47f1 --yes --no-wait                                   # fail at once if busy
unity install-modules -e 6000.0.47f1 -m android --timeout 600 --yes        # whole seconds, digits only
```

Busy lock = exit **9** (`INSTALL_LOCK_BUSY`, retryable); a failed install is exit `6`. The lock is per item: exit 9 after `install <v> -m android --no-wait` can mean the Editor installed and only the module did not. Read `data.completedUids` and finish with `install-modules`, not another `install` (that now fails because the Editor exists). A second `install` of the same version fails at once with exit `6`, whatever the flags.

## Windows: elevation (UAC)

The install helper asks for elevation by default. `--no-elevate` (or `UNITY_NO_ELEVATE=1`) keeps the helper unelevated; the Editor's NSIS installer still asks for elevation when Windows requires it for the account (an administrator token always does, a standard user never does and gets a list of dependencies an admin must finish). In CI, where nobody can answer the prompt, run the agent already elevated.

```bash
unity install 6000.0.47f1 --no-elevate --yes --accept-eula
```

## Portable install into a folder

For an ephemeral CI workspace or a side-by-side copy: `-d` / `--download-directory <dir>` installs to `<dir>/<version>` without touching the install path, the Hub's list or the shared state; `unity editors` does not list it.

```bash
unity install 6000.0.47f1 -d ./.unity -m android --non-interactive --yes --accept-eula --format json   # data.path = Editor folder
unity install-modules -e 6000.0.47f1 -d ./.unity -m ios --yes
```

A second install into the same folder needs `--force`; `--resume` and `--list-modules` cannot be combined with `-d` (exit `2`).

## Upgrade, prune, uninstall

```bash
unity editors upgrade --all --dry-run --format json      # current -> target per Editor, installs nothing
unity editors upgrade <version> --replace --yes          # newest patch of that major.minor; removes the old Editor afterwards
unity editors prune --format json                        # unused Editors + reclaimable size; deletes nothing
unity uninstall <version> --yes                          # deletes that Editor from disk
```

**Verify:** `unity editors --installed --format json` shows the new patch (and no old one after `--replace` / `uninstall`).

- `unity editors upgrade <version|lts|latest|default>` moves to the newest **f-channel patch of the same major.minor line**, carries modules over (not Visual Studio / VS Code; add `-m visualstudiocode` to force), and **keeps the old Editor** unless `--replace`. Preview with `--all --dry-run --format json`; `--no-modules` and `-m` adjust modules.
- `unity editors prune` is report-only. `--remove` deletes; non-interactively it needs `--yes` as well. "Unused" is judged against the project registry, so an Editor used only by an unregistered project counts as unused: register it (`projects add`) or check `unity projects report` first. `--remove-missing` only drops registry entries whose folder is already gone.
- `unity uninstall <version> [-a arm64] --yes` deletes an Editor. Check `unity projects report` (groups projects by required version, flags missing installs and non-LTS streams) before removing a version a project still needs.

## A broken or half-installed Editor

```bash
unity editors verify 6000.0.47f1 --json                       # ok | missing | skipped per component; prints the repair command
unity install-modules -e 6000.0.47f1 -m android --reinstall --yes
```

`unity editors verify <version>` reports each component as `ok`, `missing` or `skipped`, names the exact `install-modules` repair command, and exits non-zero on missing or empty files. It is structural only: it proves files exist, not that they are uncorrupted or signed. Repair with `install-modules --reinstall`, or `install --force` for the Editor itself.

## Editor Software Terms

A first windowed open of an Editor stops at the "Unity Editor Software Terms" dialog; no launch flag skips it (`-acceptSoftwareTermsForThisRunOnly` is ignored by current Editors). `unity open --until-ready` reports `OPEN_BLOCKED_BY_DIALOG_SOFTWARE_TERMS`, `unity status` `STATUS_BLOCKED_BY_DIALOG_SOFTWARE_TERMS`.

```bash
unity terms status --format json          # accepted | not-accepted | no-terms-file per installed Editor
unity terms accept 6000.0.47f1            # shows the link and the Editor's terms, then asks (default No)
```

Accepting is the user's decision: show the link (`https://unity.com/legal/editor-terms-of-service/software`) and let them run it or open the Editor once. Never pass `--yes` or click the dialog for them. Without a terminal and without `--yes` it exits `2` (`TERMS_ACCEPT_NEEDS_CONFIRMATION`). It writes the Editor preference of the current user (registry on Windows): close open Editors first.

## Other operating system, Hub app, odd hosts

- `unity releases --operating-system windows` and `unity install <v> --dry-run --operating-system windows -m il2cpp --format json` plan for another OS. Without `--dry-run` it exits `2` (`CROSS_OS_INSTALL_UNSUPPORTED`); the CLI never runs another OS's installer.
- `unity hub install [--version 3.17.0] [--force] [--headless]` installs the Hub app (`--headless` is Windows only). The installer's code signature and SHA-512 are checked, and a failed check aborts with exit `6`; `--skip-signature-check` bypasses it and is not recommended.
- Linux arm64 has no Editor build. `UNITY_EXPERIMENTAL_FEX_EMU=1` runs the x86_64 Editor under FEX-Emu, unsupported, and C# compilation is known to crash there; do not use it for real work.
