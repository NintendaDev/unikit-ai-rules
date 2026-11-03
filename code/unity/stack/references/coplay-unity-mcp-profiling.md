# Coplay Unity MCP — Profiling and diagnostics

| Question | `manage_profiler` actions | CLI |
|---|---|---|
| Is profiling active? | `profiler_status` | `profiler status` |
| Record a session | `profiler_start`, `profiler_stop`, `profiler_set_areas` | `profiler start/stop/set-areas` |
| Frame CPU/GPU timings | `get_frame_timing` | `profiler frame-timing` |
| Named/category counters | `get_counters` | `profiler get-counters` |
| One object's memory | `get_object_memory` | `profiler object-memory` |
| Snapshot/compare memory | `memory_take_snapshot`, `memory_list_snapshots`, `memory_compare_snapshots` | `profiler memory-snapshot/memory-list/memory-compare` |
| Rendering event investigation | `frame_debugger_enable/get_events/disable` | `profiler frame-debugger-enable/events/disable` |

## Measure a defined scenario

1. Activate `profiling`; inspect current profiler status and active areas before changing them.
2. Record scene, platform, Play Mode, resolution, workload and the question being measured. Warm up the scenario and repeat the same conditions for before/after comparisons.
3. Select only needed areas/counters. `enable_callstacks` adds overhead; label measurements collected with extra instrumentation.
4. Read supported counters rather than inventing counter names. `get_counters` is asynchronous with a one-frame wait; handle its actual completion response. Missing/zero data is not automatically a zero-cost result.
5. Stop recording started for the task and restore temporary debugging state. Retain `.raw`/`.snap` paths and measurement conditions with the conclusion.

```python
manage_profiler(action="profiler_status")
manage_profiler(action="profiler_start", enable_callstacks=False)
# Exercise the defined scenario, not an idle Editor frame.
manage_profiler(action="get_frame_timing")
manage_profiler(action="get_counters", category="Render")
manage_profiler(action="profiler_stop")
```

```powershell
unity-mcp --format json profiler status
unity-mcp --format json profiler start
unity-mcp --format json profiler frame-timing
unity-mcp --format json profiler get-counters --category Render
unity-mcp --format json profiler stop
```

Inspect `profiler start --help` for recording-path/callstack flags; raw preserves the exact tool schema when wrappers differ. Do not stop another person's pre-existing profiling session without task authorization.

## Memory and Frame Debugger

- Memory snapshots require `com.unity.memoryprofiler`. Check availability; group activation does not install it.
- Take snapshots at comparable lifecycle points, retain both paths, and compare with `snapshot_a`/`snapshot_b`. Account for intentional loading, pooled objects and Editor overhead before labeling growth a leak.
- `get_object_memory` measures a specified object path, not an entire ownership graph by implication.
- Frame Debugger event reads are paged and best-effort via reflection. Follow returned cursor data; API changes can limit detail. Disable Frame Debugger when finished so it does not remain active during gameplay measurement.

```python
manage_profiler(action="frame_debugger_enable")
manage_profiler(action="frame_debugger_get_events", page_size=25, cursor=0)
manage_profiler(action="frame_debugger_disable")
```

```powershell
unity-mcp --format json raw manage_profiler '{"action":"frame_debugger_enable"}'
unity-mcp --format json raw manage_profiler '{"action":"frame_debugger_get_events","page_size":25,"cursor":0}'
unity-mcp --format json raw manage_profiler '{"action":"frame_debugger_disable"}'
```

Use `manage_graphics` rendering/memory stats for quick rendering diagnostics and `read_console` for errors; neither replaces a controlled performance sample. Editor observations do not establish mobile player performance. Report unsupported counters/snapshots as unavailable, not as passing measurements.

Source: [manage_profiler](https://coplaydev.github.io/unity-mcp/reference/tools/profiling/manage_profiler), [CLI](https://coplaydev.github.io/unity-mcp/guides/cli).
