# Unity CLI — Tests (headless run and live Editor)

> See also: [unity-cli-editor-session.md](unity-cli-editor-session.md), [unity-cli-scenes.md](unity-cli-scenes.md), [unity-cli-build-ci.md](unity-cli-build-ci.md), [unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md)

Written against Unity CLI 1.0.0-beta.14 and com.unity.pipeline 0.9.1-exp.1; the live catalog (`unity command --query <term> --format json`) outranks this page.

---

## Goal -> command

| Goal | Command |
|---|---|
| Run the project's tests with no Editor open (CI, final proof) | `unity test <project> --mode EditMode --output <report.xml>` |
| One fixture or namespace while iterating | `unity test <project> --mode EditMode --filter 'Ns.Fixture' --output <own.xml>` |
| Only the tests a change can reach | `unity test <project> --affected --since origin/main` (needs an NUnit report of a full run) |
| Re-run only the failures of the last report | `unity test <project> --rerun-failed --output <that-report>` |
| JUnit for GitHub/GitLab | `unity test <project> --report-format junit --output <junit.xml>` |
| Split across CI jobs; retry flakes; coverage | `--shard N/M`; `--retries N`; `--coverage` |
| Re-run on every file change (local only) | `unity watch test <project> --mode EditMode` |
| Run in the Editor that is already open | `unity command test run --mode editor --filter '<name>' --timeout 300 --format json` |
| Long live run, poll it | `unity command test run … --async_tests true`, then `unity command test status` |
| List tests without running | `unity command test list --mode editor --format json` |
| Abort a live run | `unity command test cancel` |

## Choose the layer

| | Headless `unity test` | Live `unity command test run` |
|---|---|---|
| Needs | the editor binary; no Pipeline package | an open Editor with the Pipeline package |
| Editor | starts its own batch Editor; refuses a project already open in one (exit `6`) | reuses the open Editor (warm, current unsaved state) |
| Output | report file (NUnit, JUnit) plus exit code | the command's JSON answer, no report file |
| Extras | `--shard`, `--retries`, `--affected`, `--rerun-failed`, `--coverage` | `filter_type` (name, assembly, category), `include_explicit`, async polling |
| Blocked by | compile errors, license, crash | unsaved scene (bridge check `scene-4`), modal dialog, Play Mode, a busy command lane |

Use headless when no Editor holds the project and for the final proof. Use live when an Editor is already open: never close the user's Editor to make room for `unity test`, and run live tests only after `unity command editor status` shows it is not playing (otherwise ask). Never run both on one project at the same time.

## Case: headless run

```bash
unity test <project> --mode EditMode --output reports/full-editmode.xml --allow-install --timeout 900
case $? in 0) echo pass;; 8) echo "tests failed";; *) echo "no verdict";; esac
```

`--mode` is `EditMode` or `PlayMode` (case-insensitive); omitted, the editor's default platform runs. Any `-- <editor args>` are forwarded except the reserved `-projectPath -batchmode -runTests -testPlatform -testResults -testFilter -quit -useHub -hubIPC -enableCodeCoverage -coverageResultsPath -coverageOptions`.

**Verify:**
- Exit `0` passed, `8` ran and some failed (`errors[0].code` `TESTS_FAILED`), `6` no verdict (compile error, license, crash, unknown platform, project open in an Editor, `--timeout` as `TEST_TIMED_OUT`). Exit `2` is a flag mistake. Some exit tables list a timeout as `14`: branch on `errors[0].code` under `--format json`.
- The report exists and its test count is above zero (NUnit root `test-run`, attributes `total` and `failed`). A `--filter` that matches nothing can still exit `0`.
- Retry only exit `6` after the cause is gone; never retry exit `8` unchanged.

**Pitfalls:** the default `--output` is `test-results.xml` in the working directory: point `--output` at a folder outside the repository. `--timeout` is whole seconds as digits (`UNITY_TEST_TIMEOUT` too). A filter is the editor's syntax, `;`-separated full names or regexes, `!` negates, so quote it with single quotes (survives Git Bash and PowerShell): `--filter 'A.B;!A.B.Slow'`. To keep the Editor log, forward `-- -logFile <path>` (not reserved).

## Case: iterate cheaply, prove once

1. EditMode first; PlayMode only for behavior that needs frames, physics or a running scene.
2. While iterating narrow the run: `--filter`, `--affected --since <ref>`, `--rerun-failed`.
3. Run the full suite once per mode on the final code; selection is an approximation, a green `--rerun-failed` is not proof.
4. Never re-run a suite on unchanged code: read the last report. Repeat only after exit `6` with the cause fixed.

```bash
unity test <project> --mode EditMode --output /reports/full.xml                              # the record (NUnit)
unity test <project> --mode EditMode --affected --since origin/main --output /reports/full.xml   # writes full.affected.xml
unity test <project> --mode EditMode --rerun-failed --output /reports/full.affected.xml      # failures of that run
```

- A plain run overwrites `--output`; give every non-full run its own file. Keep the record as NUnit: `--affected` and `--rerun-failed` cannot read a JUnit-only report. A wrong `--rerun-failed` path looks like a pass.
- Keep reports outside the repository: `--affected` counts any changed or untracked file outside `Assets`, `Packages`, `ProjectSettings` as a change outside the project and then runs everything.
- `--affected` is a lower bound and refuses (runs the whole suite) when it cannot prove selection: any non-code change, Addressables, a changed test source, no inventory, a stale one. `--affected-compare` runs all tests and reports the false-negative count: use it before trusting `--affected`. `--affected`, `--affected-compare`, `--shard`, `--rerun-failed` are mutually exclusive.

## Case: CI reports, shards, retries, coverage

```bash
unity test <project> --report-format nunit,junit --output reports/full.xml --junit-output reports/ci.xml
unity test <project> --shard 2/5 --shard-inventory reports/full.xml --report-format nunit,junit --output reports/s.xml
unity test <project> --retries 2 --format json
unity test <project> --coverage --coverage-output coverage
```

- `junit` alone makes `--output` the JUnit file (converted from NUnit after the run; written even when tests fail). `--junit-output` is valid only with `nunit,junit` and not the same path as `--output`.
- `--shard N/M` needs an NUnit inventory from an earlier unsharded run (`--shard-inventory`, default the unsharded `--output`); a JUnit inventory reads as empty. Every output path gains `.shard-N-of-M`. More shards than tests skips the Editor and exits `0`.
- `--retries` (0-10) re-runs only the failed tests; a flaky test exits `0` but is reported in the summary and `test-results.retries.json`, while the JUnit file still holds the first failure. Exit `6` is never retried.
- `--coverage` needs `com.unity.testtools.codecoverage`; without it the CLI warns and runs the tests uncovered (`coverage.enabled: false`).
- `--format github` annotates failures in Actions. CI wiring and licenses: [unity-cli-build-ci.md](unity-cli-build-ci.md).

## Case: live Editor tests

**When:** an Editor is already open on the project. Names are from com.unity.pipeline 0.9.1-exp.1; confirm them in the live catalog.

```bash
unity command editor status --format json            # not playing, no blocking dialog
unity command editor save_all                         # save every open scene first (scene-4)
unity command scene list_open --format json           # nothing dirty left
unity command test list --mode editor --format json
unity command test run --mode editor --filter 'MyGame.Tests.Inventory' --timeout 300 --format json
```

Parameters of `test run`: `mode` (`all`, `editor`, `playmode`; **the default is `all`**), `filter` (case-insensitive partial match), `filter_type` (`testName`, `assembly`, `category`), `include_explicit` (default `false`), `async_tests` (default `false`), `timeout` (seconds, default 600). Name `--mode editor` on purpose.

For a long run or any Play Mode test, start it in the background and poll:

```bash
unity command test run --mode editor --filter_type assembly --filter 'MyGame.Tests.EditMode' --async_tests true
unity command test status --format json              # until finished; {"status":"no_tests"} means nothing is running
unity command test cancel                             # abort
```

`unity command test run --detach` with `unity job wait <id> --timeout 600` also works ([unity-cli-editor-session.md](unity-cli-editor-session.md)).

**Verify:** read the whole JSON answer (default human output keeps one summary line): number of tests above zero, failed count, status of each failed test. A failed test is still a successful call. A run with a part started in the background (Play Mode) is not over until that part reported through `test status` (bridge check `transport-3`). The result field names are not in the collected docs: read them from the live answer.

**Pitfalls:**
- Unsaved scene: the run holds the command lane for its whole timeout and ends as a success with no tests (`scene-4`). Save first, then check the count.
- Timeout: pass `--timeout` explicitly (the CLI's own default for `unity command` is 30 s, the command's is 600 s; which wins when you pass nothing is not documented). On a timeout the run is not cancelled: it goes on in the Editor, keeps no result and holds the lane. Do not start it again as it was; wait for the lane, then start it with `async_tests` and read `test status` (`transport-2`).
- `test run` and `test list` are async commands and are rejected inside `job batch` (they would freeze the Editor).
- Compile first. After a failed compile, reads describe the last good build (`compile-2`); fix and verify with `script recompile_status` ([unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md)).
- An unfocused Editor can stall recompiles and tests: keep it ticking with `editor set_auto_tick`, handle modal dialogs with `editor.dialog` ([unity-cli-editor-session.md](unity-cli-editor-session.md)).
- Do not confuse this with the Pipeline package's `testing.md`: that page describes how the package tests itself, not how to test your project.

## Case: `unity watch test`

```bash
unity watch test <project> --mode EditMode --filter 'MyGame.Tests.Inventory' --ignore Recordings
```

A thin loop around `unity test --affected`: one run now, then one per burst of file changes, never two overlapping. `Library/`, `Temp/`, `Logs/`, `Build/`, `obj/` are always ignored; `--ignore` is repeatable. It refuses to start under `--non-interactive` or when `CI` is set, has no `--shard`, `--coverage`, `--retries`, `--output` and the others, and is not for a pipeline. It spawns an Editor per run like `unity test`, so expect the same refusal when an Editor holds the project. Its selection is `--affected`'s, so it falls back to the whole suite whenever it cannot prove a narrower one.

## Pitfalls

- **An unfiltered live `test run` on a large suite is very slow to start.** Observed on com.unity.pipeline 0.9.1-exp.1 with a project of about 19,000 EditMode tests: the async runner collects every leaf test name to drop `[Explicit]` ones and hands them all to the runner as a name filter. Unity Test Framework turns that into an OrFilter of N FullNameFilters, and NUnit checks every tree node against all N, so cost is quadratic. Start took 20-30 minutes and throughput fell from about 1,800 to about 250 tests per minute; a manual Run All in the Test Runner window (empty filter) took about 10 minutes for the same suite. Numbers are an observation, not a spec: measure on your own suite.
  - For a large project never start the whole suite through `test run` without a filter. Narrow by assembly, category or class (few names, fast).
  - For a true full run use Run All in the Test Runner window, or a script that calls `TestRunnerApi.Execute` with an empty filter and saves the result in `RunFinished` (run it through the script commands, [unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md); confirm the API against the installed Test Framework version):

  ```csharp
  using UnityEditor.TestTools.TestRunner.Api;
  using UnityEngine;
  public static class FullRun
  {
      class Done : ICallbacks
      {
          public void RunStarted(ITestAdaptor t) { }
          public void TestStarted(ITestAdaptor t) { }
          public void TestFinished(ITestResultAdaptor r) { }
          public void RunFinished(ITestResultAdaptor r) { TestRunnerApi.SaveResultToFile(r, "Temp/full-run.xml"); }
      }
      public static void Start()
      {
          var api = ScriptableObject.CreateInstance<TestRunnerApi>();
          api.RegisterCallbacks(new Done());
          api.Execute(new ExecutionSettings(new Filter { testMode = TestMode.EditMode }));
      }
  }
  ```

  - Read `Temp/full-run.xml` when the run ends. Headless `unity test` runs through the editor command line, not the Pipeline runner; its speed on such a suite is unmeasured here.
- Green is not enough: require a test count above zero and every open scene saved before a live run.
- A test exit of `8` and an infrastructure failure (`6`) call for different reactions; wrapping both in one retry hides real failures.
