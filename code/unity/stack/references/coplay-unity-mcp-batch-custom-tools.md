# Coplay Unity MCP — Batches and project tools

| Work | Use | Boundary |
|---|---|---|
| Several independent searches | `batch_execute` with parallel reads | Do not request full serialized scenes |
| Repeated known edits | Ordered `commands` with `parallel=false` | Split when a later input needs an earlier result |
| Project-specific authoring | Discover and call a custom tool | Read its schema; project APIs can enforce domain invariants |
| Unsupported one-off operation | `execute_code` after schema/API inspection | Read the scripting reference first |

## Batch safely

- Each command is `{"tool":"tool_name","params":{...}}`. The reviewed default limit is 25 commands; Editor configuration can raise it up to 100. The reviewed CLI `batch run/inline` wrappers also impose their own 40-command cap. Use the lowest applicable limit.
- Nested commands invoke Unity handlers, not arbitrary Python MCP tools. Do not batch server-only tools. Use the handler's wire field names; the C# batch normalizes some top-level keys but does not recreate Python tool-specific conversions or logic.
- Set `parallel=false` and `fail_fast=true` for ordered mutations. Use `parallel=true` only for independent reads; it is an advisory optimization, not guaranteed Editor parallelism.
- A batch has no rollback guarantee. A failing fourth step can leave the first three applied. Inspect per-command outcomes and read back before retrying; `fail_fast` is not atomicity.
- Split at discovered IDs, jobs, compilation/reload, scene load and other state boundaries. Do not assume response-variable substitution exists inside the batch.
- Avoid batching a test/build launch with edits it depends on. Finish and verify edits first.

MCP example: two independent queries in one round trip.

```python
batch_execute(commands=[
    {"tool": "find_gameobjects", "params": {
        "search_term": "Rigidbody", "search_method": "by_component", "page_size": 20}},
    {"tool": "find_gameobjects", "params": {
        "search_term": "Camera", "search_method": "by_component", "page_size": 10}}
], parallel=True, fail_fast=False)
```

CLI equivalent: save the following as a task-local UTF-8 JSON file, then run it. The file contains a command array, not the outer `batch_execute` argument object.

```json
[
  {"tool":"find_gameobjects","params":{"search_term":"Rigidbody","search_method":"by_component","page_size":20}},
  {"tool":"find_gameobjects","params":{"search_term":"Camera","search_method":"by_component","page_size":10}}
]
```

```powershell
unity-mcp --format json batch run queries.json --parallel
```

For an exact CLI raw envelope use `failFast` and `maxParallelism`, versus MCP's outer `fail_fast` and `max_parallelism`. For ordered file batches, use `--fail-fast` and leave parallel execution disabled. Current C# source serializes even parallel requests on the main thread; do not promise parallel speedup. Inspect each result's `callSucceeded` and nested `result`, rather than trusting the CLI wrapper's summary counts.

## Discover project extensions

1. Read `mcpforunity://custom-tools` or run `unity-mcp tool list` (`custom_tool list` is also documented).
2. Inspect the matching tool's parameters. Never invent an extension name from the feature description.
3. With project-scoped tools enabled, call `execute_custom_tool`; the extension is not directly callable by its catalog name. With that server option disabled it may appear as a normal MCP tool.
4. Read the actual domain result and persisted state, not only the dispatcher response.

Illustrative call shape, after discovering this exact extension and its parameter schema:

```python
execute_custom_tool(tool_name="validate_level", parameters={"level_id": "arena"})
```

```powershell
unity-mcp --format json editor custom-tool 'validate_level' --params '{"level_id":"arena"}'
```

Do not replay custom tools or `execute_code` history without inspecting their side effects. Keep cleanup restricted to artifacts created for the current task.

Sources: [batch parameters and examples](https://coplaydev.github.io/unity-mcp/reference/tools/core/batch_execute), [custom dispatcher](https://coplaydev.github.io/unity-mcp/reference/tools/core/execute_custom_tool), [CLI](https://coplaydev.github.io/unity-mcp/guides/cli).
