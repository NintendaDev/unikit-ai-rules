# Unity CLI — Version control (git, UVCS, Unity-aware diff and merge)

> See also: [unity-cli-multi-editor-worktrees.md](unity-cli-multi-editor-worktrees.md), [unity-cli-projects-templates.md](unity-cli-projects-templates.md), [unity-cli-assets-import.md](unity-cli-assets-import.md), [unity-cli-build-ci.md](unity-cli-build-ci.md)

Written against Unity CLI 1.0.0-beta.14; the CLI's own `--help` outranks this page.

---

## Goal -> command

`unity vcs` covers GitHub, GitLab, self-hosted git and Unity Version Control (UVCS). It is not Unity Collaboration (`unity collab`). Use plain `git` for ordinary git work; use a `vcs` verb only when Unity semantics matter (scene YAML, `.meta`, GUIDs, reimport cost).

| Goal | Command |
|---|---|
| Put the project under version control, push a first commit | `unity vcs setup` (`--vcs github\|gitlab\|uvcs\|<host>`) |
| What changed, grouped by Unity meaning, `.meta` pairing problems | `unity vcs status --format json` |
| Pull with Editor and LFS accounted for | `unity vcs sync` |
| Change branch, preview the reimport first | `unity vcs switch <branch> --dry-run` |
| Audit ignore rules, LFS patterns, META, package pinning | `unity vcs doctor` (`--fix`, `--check META,LFS`) |
| Make scene/prefab merges work at all | `unity vcs merge-setup` (`--check` for a gate) |
| Run Unity integrity checks at commit time | `unity vcs hooks install` / `status` / `uninstall` |
| What changed inside a scene/prefab, by object name | `unity vcs diff <path> --from <ref> --to <ref>` |
| Who last changed an object or field | `unity vcs blame <path> --object <name> [--field <f>]` |
| PR-ready summary of a branch | `unity vcs summarize --since <ref>` |
| Assets, assemblies, tests a change reaches | `unity vcs affected --since <ref>` |
| List, explain, resolve merge conflicts | `unity vcs conflicts` / `explain <path>` / `resolve <path>` |
| Find binaries to move into LFS | `unity vcs git migrate-lfs` (prints the command, never runs it) |
| A second checkout for another branch or agent | `unity vcs git worktree add <branch> --into <dir>` |
| Which providers this machine can reach, as whom | `unity vcs providers` |
| UVCS locks, changesets, review | `unity vcs uvcs …`; anything else `unity uvcs <cm args>` |

## Rules for every verb

- Pass `--format json` when something parses the output. When stdout is redirected (every agent shell) the default is `tsv`, and the advisories (identity confidence, walk bounds, lower-bound caveats) go to stderr.
- `--since` takes a **revision** on `summarize`, `affected` and `unity test`. A date bound is `vcs git migrate-lfs --after`. `--vcs git` is not a value.
- `diff`, `blame`, `explain` and `resolve` need text YAML: set Asset Serialization Mode to Force Text in Editor settings (via settings, see [unity-cli-settings-packages.md](unity-cli-settings-packages.md)). A binary-serialized scene answers `binary-serialized`, which is an answer, not a failure.
- Verbs that rewrite the working tree (`sync`, `switch`, `worktree remove`) refuse while an Editor holds the project. That refusal is the feature.

## Case: first-time setup of a repository

**When:** a project has no repository, or has one without Unity-appropriate ignore, LFS and merge settings.

```bash
unity vcs setup                                          # detect, ask only what is missing
unity vcs setup --vcs github --git-namespace my-org --git-repo my-game \
  --git-visibility private --git-lfs --non-interactive   # fully specified
unity vcs setup --vcs uvcs --cloud-org my-org --vcs-region <region> --dry-run   # UVCS preview
```

Token on stdin, never in argv. Git Bash: `unity vcs setup … --git-token-from-stdin <<<"$GIT_TOKEN"`. PowerShell: `$env:GIT_TOKEN | unity vcs setup … --git-token-from-stdin`.

- Credentials are tried in this order: stdin/`--git-token`, provider env var, git credential helper, signed-in `gh`/`glab`/`tea`, guided prompt. If a helper already works, pass no token. The CLI stores no Git token.
- `--git-lfs` is for new repositories only and needs `git-lfs` on `PATH`; `UNITY_INSTALL_MISSING_TOOLS=1` accepts the install offer non-interactively.
- UVCS handles binaries natively (no LFS) and uses the Unity sign-in. `--dry-run` exists for `--vcs uvcs` only.
- `--no-initial-commit` lets you add packages/assets before the first commit. `--save-preset <name>` / `--preset <name>` reuse choices.
- A repository that already has a remote is adopted, not recreated. Creating a project with a remote in one step is [unity-cli-projects-templates.md](unity-cli-projects-templates.md).

**Verify:** `git remote -v` and `git log -1` show the remote and the first commit; `unity vcs doctor` reports no finding; `git ls-files | grep -c '^Library/'` prints `0` (PowerShell: `(git ls-files | Select-String '^Library/').Count`).

**Pitfall:** a purely local repo without `vcs setup` needs a Unity `.gitignore` before the first `git add -A`: download a maintained one with `curl -fsSL <url> -o .gitignore` (never pipe a download to a shell) and check that `Library/`, `Temp/`, `obj/`, `Build/` are not staged.

## Case: repository hygiene and merge tooling

**When:** after setup, after cloning, or when scene merges produce garbage.

```bash
unity vcs doctor --fix                 # idempotent: a second run changes nothing
unity vcs merge-setup                  # .gitattributes + merge driver + a proving test merge
unity vcs merge-setup --check          # report only; exit 4 while work remains
unity vcs hooks install                # pre-commit, post-checkout, post-merge
```

**Verify:** `merge-setup --check` exits `0`; `hooks status` lists the three hooks at the current version; `doctor` is clean. `merge-setup --check` exiting `4` is by design, so a `set -e` script stops there.

**Pitfalls:** `doctor` checks the repository's Unity configuration, `unity projects verify` checks the asset tree (different subjects). When a hook blocks a commit, fix the finding; do not bypass the hook. `hooks uninstall` edits only the managed block.

## Case: daily loop (status, sync, switch)

**Steps:**

```bash
unity vcs status --format json         # look for meta-pairing problems before committing
git add -A && git commit -m "…"         # plain git for the commit itself
unity vcs switch feature/lighting --dry-run   # reimport scope, no change
unity vcs switch feature/lighting
unity vcs sync --rebase
```

**Verify:** `status` reports no unpaired `.meta`; after `switch`/`sync` the CLI reports the reimport it causes; reopen or refresh the Editor and wait for it to be ready ([unity-cli-editor-session.md](unity-cli-editor-session.md)).

**Pitfalls:**
- A missing or orphaned `.meta` is the most common "works on my machine" bug. Move and rename assets through the Editor-side asset commands ([unity-cli-assets-import.md](unity-cli-assets-import.md)), or move the asset and its `.meta` together.
- With an Editor open, `sync`/`switch` stop. Save first (`editor save_all`, see [unity-cli-scenes.md](unity-cli-scenes.md)); unsaved scene edits are lost when the Editor is closed. Prefer `--close-editor` over `--force`, and never close an Editor you did not start without asking the user.
- `--allow-dirty` carries uncommitted tracked changes across; `--discard-changes` deletes them. Use the second only on explicit instruction.

## Case: read a change (diff, blame, summarize, affected)

All four are read-only. A raw `git diff` of a scene is numeric ids; these name objects.

```bash
unity vcs diff Assets/Scenes/Level.unity --from main --to HEAD --format json
unity vcs blame Assets/Scenes/Level.unity --object Player --field m_Mass --max-revisions 400
unity vcs summarize --since origin/main --format json     # works from a monorepo root
unity vcs affected --since origin/main --format json
```

`--to` defaults to the working tree, `--from` to `HEAD`. Branch on these fields:

| Field | Verb | Meaning |
|---|---|---|
| `confidence` | `diff`, `blame` | below `exact`: identity was matched, not established; treat as a hypothesis |
| `walkBounded` | `blame` | answer may be older than reported; raise `--max-revisions` |
| `historyCrossedNonYaml` | `blame` | walk stopped at a binary-serialized revision |
| `prefabInstance` | `diff` | override reported on the instance; attribution stops at this asset |
| `lowerBound`, `holes` | `affected` | real dependencies exist that no static reader finds |

**Pitfall:** `affected` is a lower bound (Addressables, Resources lookups, load-by-name are invisible). Never skip tests on it; `unity test --affected` has its own refusals ([unity-cli-tests.md](unity-cli-tests.md)).

## Case: merge conflicts

```bash
unity vcs conflicts --format json                  # which ones can merge automatically
unity vcs explain Assets/Scenes/Level.unity        # what each branch changed, by object
unity vcs resolve Assets/Scenes/Level.unity        # UnityYAMLMerge (default)
unity vcs resolve --all                            # every auto-resolvable conflict
unity vcs resolve Assets/Scenes/Level.unity --theirs   # take a side, discarding the other
```

**Verify:** `vcs conflicts` no longer lists the file; open the scene (in a live Editor) and read the hierarchy before committing.

**Pitfalls:** run `merge-setup` first. `--ours`/`--theirs` discard the other side. Conflicts the table marks as not automatic need a human decision; do not force them with a side.

## Case: large binaries already in history

```bash
unity vcs git migrate-lfs --min-size 500KB --after "6 months ago"
```

It prints a `git lfs migrate import` command and runs nothing. That command rewrites history (it carries `--everything` even for a bounded scan), so show it to the user and let them run it. The include list is narrower than the report on purpose; source code is never offered for LFS. `--since` is a deprecated spelling here: write `--after`.

## Case: a worktree per agent or branch

**When:** several agent sessions or branches need separate checkouts, each with its own Editor.

```bash
unity vcs git worktree add feature/lighting --into ../lighting --format json
unity vcs git worktree add feature/lighting --into ../lighting --dry-run     # plan only
unity vcs git worktree add feature/lighting --into ../lighting --seed full --install-editor
unity vcs git worktree remove ../lighting
```

It creates the git worktree (the branch is created from `HEAD` if missing), copies a seeded `Library`, and registers a Hub row. `--seed` is `cache`, `full` or `none`; the default withholds `PackageCache/` because UPM refills it. `--no-register` keeps a short-lived checkout out of `unity projects list`.

**Verify:** read `worktree`, `project`, `repository`, `sourceProject` from the JSON output (human output masks the account name in home paths; field placement under `data` is unconfirmed). The Unity project is `<worktree>` when it sits at the repository root, else `<worktree>/<its folder>`. `git worktree list` shows the checkout.

**Pitfalls:** `remove` needs the path and refuses uncommitted work and a live Editor unless `--discard-changes` / `--force` (both destructive; use on explicit instruction). Opening and driving one Editor per worktree, and never driving a sibling checkout's Editor, is [unity-cli-multi-editor-worktrees.md](unity-cli-multi-editor-worktrees.md).

## Case: UVCS day to day

`unity vcs uvcs <verb>` wraps reads that join `cm` data to the project (`locks` also shows which locks cover files you changed; `changesets --limit 50`; `review list/comments/reply/resolve`). `unity uvcs <args>` forwards verbatim to `cm` (shelves, partial checkout, taking or releasing a lock). Prefer the wrapped verb when a script parses the output; use the passthrough for `cm` verbs that are not wrapped.

```bash
unity vcs uvcs locks --format json
unity uvcs lock list
unity vcs uvcs review reply --review 42 --comment 7 --body "Fixed in cs:118"
```

`review reply` needs `--review` and `--comment`; `review resolve` also needs `--changeset`. If `cm` is missing, follow the install hint the command prints (`unity plugin install uvcs`; the skill text also mentions `plastic`: confirm the id with `unity plugin list`).
