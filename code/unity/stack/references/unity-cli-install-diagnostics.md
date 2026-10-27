# Unity CLI — Install, update and diagnostics
> See also: [../unity-cli.md](../unity-cli.md) · [unity-cli-editor-session.md](unity-cli-editor-session.md) · [unity-cli-build-ci.md](unity-cli-build-ci.md) · [unity-cli-auth-cloud.md](unity-cli-auth-cloud.md)

Written against Unity CLI 1.0.0-beta.14; the CLI's own `--help` outranks this page.

---

## Goal -> command

| Goal | Command |
|---|---|
| Is the CLI there, which version | `unity --version` (bare string) or `unity version --format json` |
| Install the CLI, macOS / Linux | `curl -fsSL https://unity.com/install.sh \| bash` |
| Install the CLI, Windows (PowerShell) | `irm https://unity.com/install.ps1 \| iex` or `winget install Unity.CLI` |
| Is a newer CLI out (read-only) | `unity self-update --check --format json` |
| Update the CLI | `unity self-update --yes` (alias `unity upgrade`) |
| Pin / install an exact CLI version | `unity self-update --target 1.0.0-beta.14 --yes` (`v1.0.0`, `latest` also accepted) |
| Preview or undo an update | `unity self-update --dry-run` / `unity self-update --rollback` |
| Why does the CLI not update | `unity diagnose update` |
| Release notes of a version | `unity changelog --target latest` |
| One-shot health report | `unity doctor --format json` |
| Paths, versions, resolved proxy | `unity env --format json` |
| The CLI's own log | `unity logs --tail 50 --level error` |
| The running Editor's console | `unity logs --console --level error --project-path "<project>"` |
| Proxy trouble | `unity diagnose proxy`, then retry with `--proxy-disable` |
| Version-matched Unity docs | `unity docs toc`, `unity docs --url <Class.member>`, `unity docs <topic> --content` |
| Read or set a persisted CLI setting | `unity config list` / `get <key>` / `set <key> <value>` / `unset <key>` |
| Switch account + org + project + editor + install path at once | `unity context save <name>` / `use <name>` |
| Fast repeated calls from an agent | `unity shell --protocol ndjson` |
| File a bug with Unity (asks the user first) | `unity bug --area <area> ...` |

---

## CLI missing -> install and verify

**When:** `which unity` finds nothing, or `unity --version` fails.

```bash
# macOS / Linux
curl -fsSL https://unity.com/install.sh | bash
# Windows PowerShell:  irm https://unity.com/install.ps1 | iex      (or: winget install Unity.CLI)
unity --version                       # in a NEW shell: PATH is read at shell start
unity doctor --format json            # install dir on PATH, shadowing binaries, long paths, git credential helper
```

**Verify:** `unity --version` prints a version; `doctor` has no failing `PATH` row. `UNITY_CLI_HOME=<dir>` before the install script moves the root to `<dir>/bin`.

**Pitfalls**
- A Windows terminal opened before the install does not see `unity`; open a new one (the top post-install pitfall).
- If the installer fails or the binary is still not found, tell the user and stop. A permissions error or crash from an installed binary means a broken install: re-run the script.
- Script install plus Homebrew cask leaves two copies on `PATH`: `which unity` keeps the script copy while `brew upgrade` updates the other. Remove the script copy with `unity self-uninstall -y`.
- Supported hosts: Windows 10 21H1+, Ubuntu 22.04+ / RHEL 9 (glibc 2.34+), macOS 14+. Package managers: `brew install --cask unity-cli`, `winget install Unity.CLI`, `apt install unity-cli`, `dnf install unity-cli`.
- `unity self-uninstall` removes the CLI; `--purge` also removes config and data. Never run either unasked.

---

## CLI outdated or version-pinned

**When:** commands or output fields from the docs are missing, or a `CLI_UPDATE_AVAILABLE` entry shows up. An outdated CLI fails in ways that read like wrong docs.

```bash
unity self-update --check --format json                  # read-only; a beta install follows betas
unity self-update --check --channel stable --format json # moving off a beta once GA ships
unity changelog --target latest                          # read the notes before updating
unity self-update --target 1.0.0-beta.14 --yes           # pin (also: --target latest, --channel beta|stable)
unity self-update --rollback                             # restore the binary installed before the last update
```

**Verify:** `unity --version` shows the target. `unity diagnose update` names the channel, the manifest read and what holds an update back.

**Pitfalls**
- Under `--format json` / `ndjson` the envelope may carry `notifications`. Tell the user about every entry. When `remediation.requiresUserApproval` is `true` (the update command is), do not run `remediation.command` yourself.
- A package-managed install (Homebrew, winget, apt, dnf) is not replaced by `self-update`; it prints the owning manager's command. MSIX/winget installs have no rollback. The Unity Hub also updates the CLI on its own.
- Interrupted downloads resume on the next `self-update`. `self-update` without `--target` goes to the newest release of the channel, so a pin holds only while nobody runs it unqualified. The background "update available" notice is switched off with `unity config update-check off` or `UNITY_NO_UPDATE_CHECK`; that does not stop updates, only the notice.

---

## Scripts written for the Hub CLI (`-- --headless`)

Replace `"Unity Hub.exe" -- --headless <cmd>` with `unity <cmd>`; no Hub install is needed (the table is the example, no further snippet adds anything). Removed global flags without equivalent: `--headless`, `--errors`, `--silent`, `--logLevel`, `--editorLicense`, `--cloudEnvironment` and similar.

| Hub CLI | Unity CLI |
|---|---|
| `install -v <version>` | `unity install <version>` (`-v` is not the version; `-V` prints the CLI version) |
| `install-modules --version <v> --module <id>` | `unity install-modules -e <v> -m <id>` |
| `editors --add <path>` | `unity editors add <path...>` |
| `HUB_FORMAT` | `UNITY_FORMAT` (old name still read) |

Piped stdout defaults to `tsv`, not JSON: pass `--format json` explicitly. Do not parse progress output; its format changed. Exit `130` means user cancellation.

---

## Something is odd: diagnose in this order

1. `unity doctor --format json` - platform, auth, installed Editors, recent CLI log lines, resolved proxy and accelerator, `PATH` health, third-party component list. `unity doctor --ci` is the pipeline preflight (exit `6` definitive, `7` retryable): recipe in [unity-cli-build-ci.md](unity-cli-build-ci.md).
2. `unity env --format json` - user data, Editor install, download cache and config paths.
3. `unity logs --level error --tail 100` - the **CLI's** log (`cli-log.json`), levels `trace` to `fatal`; `--follow` streams, e.g. during an install.
4. `unity logs --console --follow --format ndjson --project-path "<project>"` - the **Editor** console (needs the Pipeline package loaded; exit `12` if no Editor runs). It survives script reloads. Compile errors that put the Editor into Safe Mode are read here or from `Editor.log`: see [unity-cli-editor-session.md](unity-cli-editor-session.md).
5. `unity diagnose update`, `unity diagnose proxy`, `unity diagnose accelerator` - redacted, paste-safe reports (an unreachable accelerator is a reported row, exit `0`).

**Pitfalls:** `unity logs` without `--console` never shows Editor output. `--project-path` without `--console` is a usage error. `unity logs --help` still says "Hub log file"; it reads the CLI log.

---

## Proxy, accelerator and persisted config

```bash
unity config proxy                                  # effective proxy + where it came from
unity config proxy http://proxy.example.com:8080 --bypass "localhost,127.0.0.1"
unity config proxy --unset
unity --proxy-disable releases --limit 1            # same call ignoring every proxy source
UNITY_PROXY="http://user:pass@proxy.example.com:8080" unity releases --limit 1   # bash; PowerShell: $env:UNITY_PROXY = "..." first. Credentials via env, not argv
unity config accelerator cache.example.com:10080    # host:port, never a URL (a scheme exits 6)
unity config resolve build.target "<project>"       # value + source: env | project | global | default
```

- Proxy order: `--proxy` > `UNITY_PROXY` > `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY` / `NO_PROXY` > persisted `proxy.json` > system proxy. An invalid `--proxy` is exit `2`. A URL on the command line (`--proxy`, `config proxy <url>`) leaks credentials into the process list and CI logs; Kerberos needs none.
- `--log-proxy` (or `UNITY_LOG_PROXY=1`) writes one redacted entry per request to `proxy-request.json`; use it once to reproduce a proxy issue.
- Accelerator order: `--accelerator` (only on `run` / `test` / `build`, after the command name; see [unity-cli-build-ci.md](unity-cli-build-ci.md)) > `UNITY_ACCELERATOR` > persisted `accelerator.json`. A project whose `m_CacheServerMode` is Disabled ignores the injected flags (the CLI warns).
- `config get|set|unset` keys: `proxy`, `proxy.bypass`, `accelerator`, `update-check`, `proxyRequestLogging`, plus the nine `build.*` / `test.*` keys of a committed `ProjectSettings/UnityCliConfig.json`. Unknown key or bad value is exit `2`. `unity config path` prints the settings file.
- `unity context` bundles five defaults (account, organization, cloud project, default editor, install path). `use` is all-or-nothing and clears what the context does not pin (except the account). It is unrelated to `build --profile`.

---

## Output control for agents

| Need | Use |
|---|---|
| No pager in output of `unity command`, `releases`, `editors`, `changelog`, `logs` | `--no-pager` or `UNITY_NO_PAGER` (any value, even `0`, disables). Human output only; redirected stdout and machine formats never page. Custom pager: `UNITY_PAGER` / `PAGER`. |
| `unity projects list` waiting for a keypress on a terminal | `--no-pager`, `--all`, `--format json`, or redirect stdout; `--format tsv` on a TTY still pages |
| No banner / colour | `--no-banner` (`UNITY_NO_BANNER`), `--color never` or `--no-color`, `NO_COLOR` |
| TSV without header row | `--no-header`; select TSV columns by header name, not position |
| Stop agent-plugin install hints | `UNITY_NO_AGENT_HINTS` |
| Telemetry / crash reports | `UNITY_NO_CRASH_REPORT`, `UNITY_NO_CLI_INVOKED_TELEMETRY=1`; `unity analytics status` shows consent |

---

## Version-matched documentation

```bash
unity docs toc --format json                         # real page paths for the project's Editor version
unity docs --url Rigidbody2D.AddForce --format json  # address only; read resolvedBy: index | direct | search
unity docs Rigidbody2D.AddForce --content            # page as Markdown on stdout
unity docs --package com.unity.2d.sprite --url       # package manual, at the locked package version
unity docs --url --cli use-unity-cli                 # CLI / --hub / --cloud sets are not Editor-versioned
```

Version order: `--editor-version` (full or `6000.0` branch), then the project's `ProjectSettings/ProjectVersion.txt`, then the newest hosted. Pin it when you stand outside the project. `resolvedBy: search` is a result list, not the page; pick a `docs toc` path instead. Never open a browser from an unattended run (drop `--url` only when a person watches). The page index caches for a day; offline `toc` exits `7`.

---

## Filing a bug

Ask the user first: `unity bug` uploads logs, system info and optional attachments to Unity. Offer it after a timeout, an Editor that never reaches `ready`, a dropped connection, or an Editor that quit under you. Do not retry in a loop.

```bash
unity bug --title "Editor never reaches ready after open" --description "unity status --until-ready exits 10 on a fresh project." \
  --steps "unity open <project>" --steps "unity status --until-ready" --reproducibility always \
  --area pipeline-package --email "<contact>" --non-interactive
```

`--area` is `cli`, `pipeline-package`, `editor`, `licensing` or `not-sure`. `--attachments <files...>` takes files only. `--share-project .` uploads a stripped project copy; only on a yes. Missing fields in a non-interactive run exit `2` and name the flags.

## Small extras

```bash
unity completion bash                      # also zsh, fish, powershell: prints the script, you install it
unity language --set en                    # alias: unity lang; --set takes ja, ja-JP, ja_JP, ...
printf '{"id":"1","argv":["editors","--installed"]}\n{"type":"shutdown"}\n' | unity shell --protocol ndjson   # bash quoting
```

`unity shell --protocol ndjson` is one warm process answering one JSON request per line with `{id, exitCode, envelope}` (the `--format json` envelope); it runs exactly the commands you send, so build them yourself, never from untrusted text. In a piped session stdin carries the commands, so `--secret-from-stdin` reads nothing there. The interactive `unity shell` takes commands without the `unity` prefix.
