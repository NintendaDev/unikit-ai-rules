# Unity CLI — Sign-in, accounts and Unity Cloud
> See also: [../unity-cli.md](../unity-cli.md) · [unity-cli-licenses.md](unity-cli-licenses.md) · [unity-cli-projects-templates.md](unity-cli-projects-templates.md) · [unity-cli-build-ci.md](unity-cli-build-ci.md)

Written against Unity CLI 1.0.0-beta.14; the CLI's own `--help` outranks this page.

---

## Goal -> command

| Goal | Command |
|---|---|
| Am I signed in (exit `3` if not) | `unity auth status --format json` |
| Sign in as a person | `unity auth login` (opens a browser: the user does this) |
| Sign in a CI job | set `UNITY_SERVICE_ACCOUNT_ID` + `UNITY_SERVICE_ACCOUNT_SECRET`; no `auth login` needed |
| Store a service account on a box | `printf '%s' "$SECRET" \| unity auth login --client-id <id> --secret-from-stdin [--no-store]` |
| Sign out | `unity auth logout [account]` (no confirmation prompt) |
| Stored accounts, active one marked `*` | `unity auth list` (alias `ls`) |
| Change the active account | `unity auth switch <email-or-id>` |
| Pin a project to an account | `unity auth default <account> [--project <path>]`; `unity auth default --clear` |
| Who used my sign-in | `unity auth consumers`; `unity auth revoke "<app>" [--restore]` |
| Cloud sign-in state + active org | `unity cloud status --format json` |
| Organizations | `unity cloud org list` / `current` / `set-default <id-or-name>` / `clear-default` |
| Cloud projects of the active org | `unity cloud project list` / `current` / `set-default <id-or-name>` / `clear-default` |
| One call against another org / project | `--cloud-org <id-or-name>`, `--cloud-project <id-or-name>`, or `UNITY_CLOUD_ORG`, `UNITY_CLOUD_PROJECT` |
| Link a local folder to a cloud project | `unity projects link cloud "<project>" ...` ([unity-cli-projects-templates.md](unity-cli-projects-templates.md)) |
| Create an organization | `unity cloud org create "<name>" ...` (creates a real org: ask first) |
| Flip account + org + project + editor at once | `unity context use <name>` ([unity-cli-install-diagnostics.md](unity-cli-install-diagnostics.md)) |

Cloud Build / Pipeline Automation inventory (`unity pipeline cloud-build`, `unity pipeline automation`) and `unity collaboration` are not covered here; they use the same sign-in (service accounts need numeric organization ids there).

---

## Check sign-in before any cloud command

**When:** before `cloud ...`, `projects create` (it links to cloud by default), `projects link cloud`, `license activate` (signed-in modes), `assets export` signing, `collaboration`.

```bash
unity auth status --format json     # success:false + errors[0].code NOT_SIGNED_IN | SESSION_EXPIRED, exit 3
unity cloud status --format json    # same session truth, plus the active organization
```

**Verify:** `success` / exit `0`. A status command that answers "no" is a failure on purpose and keeps its report in `data` (`loggedIn:false`); branch on `success`, not on `data`. `auth` and `cloud` map authentication failures to exit `3` ("sign in again") and other failures (network, server) to `6`; only `3` is worth a login.

**Pitfalls**
- `auth status` can say "not signed in" while `auth list` shows an account: the CLI and the Hub share the account list but store sign-in credentials separately. Try `unity auth switch <account>` (no browser when that sign-in is readable here); `switch` cannot sign an account in, only `auth login` can.
- Signed out with the Hub signed in, a terminal `unity auth` asks "Use <email>, signed in to Unity Hub? (y/N)". Without a terminal (`--json`, `--non-interactive`) it never switches: `auth status --json` reports `adoptable: true`, the account and `adoptCommand`. Show the user that `unity auth switch <account>` command; do not run it unasked.

## Interactive sign-in (a person)

`unity auth login` prints the sign-in URL **before** it tries to open a browser, so it also works over SSH, in containers and VMs. Under `--format json` the URL arrives as an `auth_url=...` progress frame on stderr and stdout stays the result envelope. There is no username/password option and no way for an agent to complete the browser step: hand the URL to the user and re-run `unity auth status` after they finish.

```bash
unity auth login --format json 2> "<scratch>/auth-progress.log"   # blocks until the browser step ends: run in the background, read auth_url=... from the log
unity auth status --format json                                   # exit 0 once the user finished in the browser
```

## Service accounts (CI)

Create the key pair in the Unity Dashboard (a key id and secret, not a Unity ID login). Put both in the CI secret store.

```bash
export UNITY_SERVICE_ACCOUNT_ID="$CI_UNITY_SA_ID"           # bash; PowerShell: $env:UNITY_SERVICE_ACCOUNT_ID = ...
export UNITY_SERVICE_ACCOUNT_SECRET="$CI_UNITY_SA_SECRET"
unity cloud org list --format json                           # every later command mints a token from the env, nothing is stored
```

- Env vars mint bearer tokens per process: no browser, no keyring write. Setting only one of the two prints a warning on stderr instead of silently falling back to a stored account.
- `unity auth login --client-id <id> --secret-from-stdin` is for boxes that should keep the credential: the secret must be piped (a terminal on stdin is refused; waiting stops after 30 s if the pipe is never closed). `--no-store` mints in-process only. Avoid `--client-secret`: it lands in shell history and the process list.
- **Service accounts cannot activate a Unity licence.** `license activate` (default and `--personal`) fails up front; use a serial, floating or offline file: [unity-cli-licenses.md](unity-cli-licenses.md).
- A service account needs **ids, not names**: it cannot look an organization up by name (`CLOUD_ORG_NAME_NEEDS_OAUTH`, exit `2`, seen on `assets export`), use numeric organization ids, and `UNITY_CLOUD_PROJECT` / `--cloud-project` take the project id. `projects create` without `--no-cloud` fails `CLOUD_PROJECT_REQUIRES_OAUTH` (exit `3`): pass `--no-cloud` in CI.
- Service-account credentials outrank every stored account and every project pin; `auth switch` says so instead of appearing to work. Unset the variables (or `auth logout`) before switching accounts.

## Several accounts and per-project pins

Precedence for cloud commands run inside a project, highest first: service-account env, the project's pinned account (`auth default`), the active account (`auth switch`).

```bash
unity auth list --format json                       # candidates for a switch
unity auth switch user@example.com                  # ambiguous text fails; data.candidates lists the matches
unity auth default user@example.com --project "<project>"
unity auth default --clear --project "<project>"    # follow the active account again
```

A pin beats `switch`; the switch reports it rather than failing. `auth default` resolves the project from the current directory unless `--project` is given, and rejects a path that is not a Unity project. `auth logout <account>` signs out one stored account and keeps its saved sign-in on the machine when another app (the Hub) still uses it.

## Where credentials live

```bash
unity doctor --format json                  # reports the active token-protection tier and the auth broker
unity auth consumers --format json          # applications in the broker's audit trail: scopes, grants, denials, last use
```

- Every command that needs a token asks a resident **auth broker** (a background `unity` process started on demand, exits after two idle minutes). Tokens are sealed to the machine (TPM / DPAPI / Secret Service / Keychain / key file); a copied token file is useless elsewhere. `unity doctor` reports the active tier. `UNITY_NO_AUTH_BROKER=1` reads the OS keyring directly.
- On macOS and Windows the broker and the Editor identity helper (`unity open` signs the Editor in with the CLI session when no Hub runs) refuse unsigned or non-Unity-signed peers: an Editor built from source gets no automatic sign-in. `UNITY_NO_EDITOR_IDENTITY_SERVER` disables the helper.
- `auth consumers` is the broker's audit trail (read the Granted and Denied columns). `auth revoke` writes a **local list the broker does not enforce yet**: a revoked app can still use the sign-in, and `logout` does not stop an app that already has access. Do not present `revoke` as a security control.
- Git tokens are not stored by the CLI; they come from the user's `git credential` helper or per-call flags ([unity-cli-projects-templates.md](unity-cli-projects-templates.md)).
- Never echo a secret into a log, a commit or a command line; stdin and CI secret stores only.

## Organization and project selection

```bash
unity cloud org list --format json
unity cloud org set-default 1234567                       # numeric id for a service account; names work for a person
unity cloud project list --format json                    # '*' marks the default project of the active org
unity cloud project set-default <id-or-name>              # stored per organization
unity cloud project current --format json                 # activeCloudProjectId, defaultCloudProjectId, linkedCloudProjectId
UNITY_CLOUD_ORG=<id> unity cloud project list --format json   # single-call override (bash; PowerShell: set $env: first)
```

- The default project is stored against the **active organization**: switching organization switches which default applies, and `clear-default` drops only the active org's.
- Commands that need a cloud project and were not given one resolve it: `--cloud-project`, then `UNITY_CLOUD_PROJECT`, then the link in the folder's `ProjectSettings/ProjectSettings.asset`, then the stored default (inside a linked project the link wins). `projects link cloud` uses `--cloud-project`, `UNITY_CLOUD_PROJECT`, the default, and creates only if none is named; `projects create` ignores the stored default.
- `cloud project current` prints the saved default, not necessarily the folder's project: read `linkedCloudProjectId` for the folder.
- `set-default` of a project that lives in another of your organizations fails `UNKNOWN_CLOUD_PROJECT` (exit `2`, `data.organization` names it): `cloud org set-default <genesis id>` first. A `--cloud-org` / `UNITY_CLOUD_ORG` value overrides the stored org and skips that check.
- `cloud org list`, `cloud project list` and `auth list` are table listings: `--format ndjson` ends with a `{"count": N}` frame.
- Close the Editor before relinking a project; an open Editor keeps the old link ([unity-cli-projects-templates.md](unity-cli-projects-templates.md)).

## Creating an organization

Needs a sign-in and a company profile; ask the user, it makes a real organization.

```bash
unity cloud org create "Nebula Games" --type company --company-name "Nebula Games Inc." --country US --region CA --set-default
unity cloud org create "Ada Studio" --first-name Ada --last-name Lovelace --country GB
```

`--type individual` needs `--first-name` and `--last-name`; `--type company` needs `--company-name` (`--type` may be omitted when the names say which). `--country` is ISO 3166-1 alpha-2 (`GB`, not `UK`); `--region` is required for US, Canada and Mexico and refused elsewhere. The name is trimmed to 40 characters. All input is validated before any request, and unattended runs fail naming every missing option. `--set-default` makes it active; if that setting cannot be written the org is still reported created, with a warning. JSON carries `id` and `name` only. A taken name is reported as such.
