# Unity CLI — Licenses
> See also: [../unity-cli.md](../unity-cli.md) · [unity-cli-auth-cloud.md](unity-cli-auth-cloud.md) · [unity-cli-build-ci.md](unity-cli-build-ci.md) · [unity-cli-install-diagnostics.md](unity-cli-install-diagnostics.md)

Written against Unity CLI 1.0.0-beta.14; the CLI's own `--help` outranks this page.

---

## Goal -> command

| Goal | Command |
|---|---|
| What is active on this machine | `unity license list` (same as bare `unity license`) |
| One-glance health check, scriptable | `unity license status --format json` (exit `4` when none is active) |
| Signed-in user's subscription seat | `unity license activate` |
| Free Unity Personal | `unity license activate --personal --accept-eula` |
| Serial (perpetual / legacy), no sign-in | `unity license activate --serial "$UNITY_LICENSE_SERIAL"` |
| Seat from a floating server | `unity license server status`, then `unity license activate --floating` |
| Air-gapped: request, then import | `unity license activate --generate-request ./unity.alf`, later `--file ./Unity_lic.ulf` |
| Give the seat back | `unity license return --yes` |
| Configured floating server(s) | `unity license server list` |
| Can this machine finish a build (CI preflight) | `unity doctor --ci` (exit `6` no licence / `7` retry) |

`activate` takes **exactly one** mode flag; combining them is a usage error (exit `2`).

---

## Choose the mode

| Situation | Mode | Needs |
|---|---|---|
| Developer machine, subscription | `license activate` (no flag) | `unity auth login` first |
| Free tier | `--personal --accept-eula` | sign-in; accepting the terms is the user's decision, as with the Editor terms |
| CI runner, perpetual or legacy serial | `--serial` | nothing else; no sign-in |
| Serial tied to a subscription | refused ("requires a signed-in Unity account") | sign in on that machine, or use floating / offline |
| Build farm with a licence server | `--floating` | server configured on the machine (exit `4` if not) |
| No network | `--generate-request`, then `--file` | the same machine for both steps |
| Service account (CI identity) | **cannot activate** | pick serial, floating or offline instead |

Service accounts cover Unity *services*, not the Editor licence: the default mode and `--personal` fail up front with guidance, before the licensing client is contacted. No username/password mode exists.

## Check what is active

```bash
unity license list --format json        # product, type (Floating | Assigned | ULF), organization, expiry
unity license status --format json      # success:false + LICENSE_NOT_ACTIVE (exit 4) when nothing is active
```

**Verify:** exit `0` and an active licence in `data`. `status` also returns `floatingServer` and `machineId` (always in JSON): compare them with a lease record when a floating seat looks stuck. For a service-account session it reports `Signed in: yes (service account)`.

**Pitfalls**
- The first `license` command downloads the Unity Licensing Client (about 110 MB) into the CLI data folder of the current user; if the client is unavailable `list` fails non-zero rather than printing an empty list. The client is the managed plugin `licensingClient` (`unity plugin list`).
- `status` exits `4` before any activation. That is expected on a fresh image, not an error to chase.

## CI: activate a licence, run the job, return it

The licence part of the pipeline; build, test and cache steps are in [unity-cli-build-ci.md](unity-cli-build-ci.md).

```bash
unity license activate --serial "$UNITY_LICENSE_SERIAL" --non-interactive --format json   # PowerShell: $env:UNITY_LICENSE_SERIAL
unity license status --format json                                                          # fail the job here, not 20 minutes into a build
# ... build / test ...
unity license return --yes --non-interactive                                                # run it even when the job failed or was cancelled
```

- Store the serial as the CI secret `UNITY_LICENSE_SERIAL` (the name `unity ci init` generates; it references secrets by name only and writes none). Floating: replace the first line with `unity license activate --floating`. Offline: `--file`.
- **Always return.** A serial seat that is never returned keeps counting against the serial's activation limit. Put `return` in a step that runs on failure and cancel (`if: always()` on GitHub Actions). `return` frees serial-activated licences as well as assigned seats, one by one; when only some can be freed the output (and JSON `returned` / `failed`) says which, instead of failing wholesale.
- Without a terminal, `return` needs `--yes`, also with `--json`.
- A resident headless Editor (kept for the live Editor loop) holds a seat until it exits; stop it before the job ends.
- Flag values are part of the process arguments. No stdin form of `--serial` is documented, so keep serials in the secret store and use ephemeral runners.
- `unity doctor --ci` as the first job step checks an activatable licence, the project's Editor, disk and service reachability, and fails in seconds.

## Floating (network) licences

```bash
unity license server list               # configured server (from the licensingServiceBaseUrl machine setting; no client download)
unity license server status             # reachability + free seats; exit 4 LICENSE_SERVER_NOT_CONFIGURED, exit 6 LICENSE_SERVER_UNREACHABLE
unity license activate --floating
```

Check `server status` for free seats before `--floating`. A missing server configuration is exit `4`, an unreachable one exit `6`. Return the lease when the job ends.

## Offline and air-gapped machines

```bash
unity license activate --generate-request ./unity.alf      # on the offline machine: identifies THIS machine
# exchange unity.alf for a .ulf on a machine with internet (Unity's manual activation page), copy the .ulf back
unity license activate --file ./Unity_lic.ulf              # on the SAME offline machine
```

- The request file identifies the machine: import the licence on the one that produced the request.
- Stage the licensing client while the machine or its image still has network: run `unity license status` once.
  - The client lands under the data folder of the user who ran it (`HOME`, or `XDG_CONFIG_HOME`): run staging as the same user and `HOME` that will run the CLI later. A client staged as root in an image build is not found by a container running as another user.
  - A `Unity.Licensing.Client` already on `PATH` is used when no downloaded copy exists, without a version check; an older one fails the handshake. Update or remove it before staging.
- In a Dockerfile or any fail-fast shell, accept exactly exit `4` and keep other failures (`6` = client could not be fetched):

```bash
unity license status || [ $? -eq 4 ]
```
```powershell
unity license status; if ($LASTEXITCODE -notin 0, 4) { exit $LASTEXITCODE }
```

- `license return` cannot return a licence imported with `--file`: it reports it as activated manually and leaves it in place.

## Retire a machine

Run `unity license return --yes --non-interactive` before reimaging or decommissioning, otherwise the activation keeps counting against the serial's limit. Verify with `unity license status` (exit `4`, `LICENSE_NOT_ACTIVE`).

## Exit codes

| Exit | Meaning for `license ...` |
|---|---|
| `2` | bad usage (several mode flags, `--personal` without `--accept-eula`); an unattended `return` without `--yes` is refused as well |
| `3` | sign-in required (default and `--personal` modes) |
| `4` | no licence active, or floating requested with no server configured |
| `6` | licensing-client error, server unreachable |
| `7` | `doctor --ci` only: a required service was unreachable, worth a retry |

When an Editor itself fails on licensing, `unity open --wait` (macOS / Linux) reports a licensing diagnosis for Editor exit code 198 with exit `6`; `unity test` counts an unavailable licence as "no verdict" (exit `6`), never as a failed test (exit `8`). Report persistent licensing problems with `unity bug --area licensing` after asking the user ([unity-cli-install-diagnostics.md](unity-cli-install-diagnostics.md)).
