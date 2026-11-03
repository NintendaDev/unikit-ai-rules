# Coplay Unity MCP — Tests and Play Mode

| Goal | MCP | CLI |
|---|---|---|
| Discover test identities | `mcpforunity://tests` or `mcpforunity://tests/{mode}` | No generic resource reader documented; use known test identities or an available project query |
| Start tests | `run_tests` | `editor tests --async` or raw |
| Poll existing run | `get_test_job` | `editor poll-test` or raw |
| Inspect console | `read_console` | `editor console` or raw |
| Manual runtime check | `manage_editor`: `play`, `pause`, `stop` plus targeted observation | `editor play/pause/stop` |

## Run once, poll to completion

1. Follow the project's bridge route and test-scope rules. Confirm compilation is complete before starting. Activate `testing` only if this bridge is selected for the run.
2. Discover exact full names or assembly/category/group filters. `test_names` are exact full names; `group_names` supports regex. Do not assume a short class name selects the intended suite.
3. Start **one** async run, keep the returned `job_id`, and poll that job. For PlayMode, the docs recommend `init_timeout=120000` **milliseconds** because initialization can reload the domain.
4. Poll with `wait_timeout` of 30–60 **seconds**, bounded by the caller's own timeout. A still-running reply means poll again, not launch again.
5. Inspect the terminal status, test counts, failures and execution errors before declaring success. A completed zero-test filter is not proof that a feature passed tests.

```python
run_tests(mode="EditMode", assembly_names=["Game.Tests.EditMode"], include_failed_tests=True)
# Use the job_id actually returned above.
get_test_job(job_id="returned-job-id", wait_timeout=30, include_failed_tests=True)
```

```powershell
unity-mcp --format json --timeout 60 raw run_tests '{"mode":"EditMode","assemblyNames":["Game.Tests.EditMode"],"includeFailedTests":true}'
unity-mcp --format json --timeout 60 raw get_test_job '{"job_id":"returned-job-id","includeFailedTests":true}'
```

CLI transport detail: `run_tests` raw filters use `assemblyNames`, `testNames`, `groupNames`, `categoryNames`, `initTimeout`, `includeFailedTests`. Its `get_test_job` handler accepts `job_id`, `includeFailedTests` and `includeDetails`, but **does not implement `wait_timeout`**: poll from the caller with a bounded interval. The MCP wait loop lives in Python. The documented `editor poll-test --wait/--details` wrapper sends different fields and prints its own summaries; verify behavior against the installed handler and prefer the explicit raw example for reliable result inspection. Do not assume the wrapper waits merely because `--wait` was accepted.

## Interpret failed runs correctly

- `get_test_job` documents terminal states `succeeded`, `failed`, `cancelled`. On success, `data.result` can contain summary/details.
- A run with failing tests can end as `failed` with **`data.result=null` and `data.error=null`**. Read `data.progress.failures_so_far` instead of interpreting null result/error as no failures.
- That failure list is capped at 25. Check `failures_capped`; do not claim the visible list is exhaustive when capped. Retrieve other available test artifacts or rerun a focused scope only when needed to investigate missing details.
- `data.error` describes job execution problems such as initialization timeout, exception, cancellation or orphaning; distinguish those from assertion failures.
- `include_failed_tests` limits output to failures/skips when result details are available; `include_details` can return every test. Choose the smaller useful response.

## Stuck-job recovery

- `tests_running` with retry advice usually means wait for the existing run. A slow PlayMode initialization is not proof of an orphan.
- `run_tests(clear_stuck=true)` only clears tracking: it marks any tracked running job failed and **does not stop actual Unity tests**. Use it only after establishing the job is orphaned, for example by a domain reload and absent active execution.
- It does not start a replacement run. Reconfirm Editor state after clearing, then start a new run if required.
- Polling can briefly focus the Unity window when a background test stalls. This is documented behavior, not evidence of a new test launch.

## Manual Play Mode verification

Use `manage_editor(action="play")`, observe readiness/runtime state, exercise the relevant interaction, inspect console and capture if visual. Stop when verification is complete, or restore the mode expected by the user. Do not issue an ordinary stop during a real test run. A screenshot, no console errors, or entering Play Mode alone cannot replace behavioral evidence.

Record mode, filters, job ID, terminal status, actual counts, failures/error and relevant artifacts. Distinguish tests that passed from tests not run and runs interrupted by infrastructure.

Sources: [run_tests](https://coplaydev.github.io/unity-mcp/reference/tools/testing/run_tests), [get_test_job](https://coplaydev.github.io/unity-mcp/reference/tools/testing/get_test_job), [CLI](https://coplaydev.github.io/unity-mcp/guides/cli).
