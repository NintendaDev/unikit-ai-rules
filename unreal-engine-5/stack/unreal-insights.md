---
version: 1.0.0
---

# Unreal Insights

> **Scope**: Profiling and telemetry analysis in UE5 — capturing CPU/GPU timing, memory allocations, asset loading, and network traffic via the Trace system, and analyzing recorded sessions in the Unreal Insights viewer.
> **Load when**: profiling game performance, analyzing CPU or GPU bottlenecks, instrumenting C++ code for profiling, working with Trace channels, debugging memory usage or leaks, profiling asset loading times, optimizing frame time, analyzing network traffic in multiplayer.

---

## Core Concepts

Unreal Insights is a telemetry capture and analysis suite built into UE5. Two major components:

- **Unreal Trace Server** — records and saves trace streams from running applications
- **Unreal Insights viewer** — opens `.utrace` files and visualizes the captured data

The **Trace system** is a structured, self-describing logging framework designed for high-frequency event streams. Sessions are stored as `.utrace` files; companion index data lives in `.ucache` files alongside them. Default output location: `<ProjectDir>/Saved/TraceSessions/`.

By default **all trace channels are disabled**. Opt-in explicitly via command-line, console commands, or the C++ API.

## Trace Channels

Enable channels at launch via `-trace=channel1,channel2` or at runtime via `trace.togglechannel <name> <0|1>`.

| Channel | What it captures |
|---------|-----------------|
| `cpu` | CPU profiler event scopes (named functions/blocks on all threads) |
| `gpu` | GPU profiler events |
| `frame` | Frame timing and synchronization markers |
| `memory` | Memory allocation / reallocation / free events |
| `llm` | Low Level Memory — per-category memory budgets |
| `loadtime` | Asset load time (alias: `AssetLoadTime`) |
| `file` | File I/O operations |
| `object` | UObject creation and destruction |
| `bookmark` | Custom named markers |
| `log` | Log messages |
| `counters` | Performance counters |
| `rhicommands` | RHI command list events |
| `rendercommands` | Render thread commands |
| `input` | Input system events |
| `callstack` | Call stacks — requires `module` channel too |
| `module` | Module info needed for call stack symbol resolution |

**Recommended channel sets:**

```
# Minimal — quick CPU/GPU health check
-trace=cpu,gpu,frame

# Balanced — most profiling sessions (low overhead, good coverage)
-trace=counters,cpu,frame,bookmark,gpu

# Full detail — deep investigation (high overhead, large files)
-trace=log,counters,cpu,frame,bookmark,file,loadtime,gpu,rhicommands,rendercommands,object
```

## C++ Trace API

### CPU event scopes

```cpp
// Static name — zero overhead when channel is off
TRACE_CPUPROFILER_EVENT_SCOPE_STR(TEXT("MySystem::Update"));

// Dynamic name — use sparingly; slight overhead even when channel is off
TRACE_CPUPROFILER_EVENT_SCOPE_TEXT(*DynamicEventName);

// Also visible via stat commands (SCOPED_NAMED_EVENT adds color in Insights)
SCOPED_NAMED_EVENT(TEXT("ExpensiveCalc"), FColor::Red);
```

### Custom bookmarks

```cpp
// Visible as a vertical marker in Timing Insights
TRACE_BOOKMARK(TEXT("LevelLoaded"));
TRACE_BOOKMARK(TEXT("BossSpawned"));
TRACE_BOOKMARK(TEXT("AbilityActivated"));
```

### Programmatic trace control

```cpp
#if UE_TRACE_ENABLED

// Start writing a trace to file
FTraceAuxiliary::FOptions Options;
Options.bExcludeTail = true;       // exclude pre-start ring-buffer tail
FTraceAuxiliary::Start(
    FTraceAuxiliary::EConnectionType::File,
    *TraceFilePath, nullptr, &Options);

// Stop and flush
FTraceAuxiliary::Stop();

#endif // UE_TRACE_ENABLED
```

### Channel management at runtime

```cpp
// Toggle a named channel
UE::Trace::ToggleChannel(TEXT("Memory"), true);

// Check whether any tracing is active
bool bActive = UE::Trace::IsTracing();

// Live-stream to a remote Insights instance
UE::Trace::SendTo(TEXT("192.168.1.10"), 1981, Flags);
```

## Workflow

### Standard session workflow

1. Launch `Engine/Binaries/Win64/UnrealInsights.exe` (or via **Tools → Unreal Insights** in the editor).
2. Start your game process with trace channels enabled:
   ```
   YourGame.exe -trace=cpu,gpu,frame
   ```
3. Play the scenario you want to profile (10–30 seconds is usually sufficient).
4. Stop tracing: run `trace.stop` in the in-game console.
5. Open the `.utrace` file in Insights (double-click, drag-and-drop, or browse in the Session Browser).

### Live streaming to Insights

```
# Stream directly to Insights on the same machine
YourGame.exe -trace=cpu,gpu,frame -tracehost=127.0.0.1

# Stream to a separate profiling machine
YourGame.exe -trace=cpu,gpu,frame -tracehost=192.168.1.10
```

### Mobile (Android) configuration

Place a `UECommandline.txt` in the app folder on device:

```
../../../MyGame/MyGame.uproject -trace=cpu,frame,gpu,loadtime
  -tracehost=127.0.0.1
  -tracefile=/sdcard/UnrealEngine/MyGame/session.utrace
  -statnamedevents
```

Forward the Insights port before launching: `adb reverse tcp:1981 tcp:1981`.

### Build type for profiling

| Build | Timing accuracy | Profiling tools |
|-------|-----------------|----------------|
| Development | Poor — extra asserts and checks inflate timings | Full tools available |
| **Test** | **Representative — closest to Shipping** | **Full tools available** |
| Shipping | — | Stripped — no profiling possible |

Always profile **Test builds** for numbers that reflect real player experience.

To keep stats and GPU profiling in Test builds, add to `YourGame.Target.cs`:

```csharp
bForceEnableStats = true;
bAllowProfileGPUInTest = true;
```

## Timing Insights

The main profiling view. Displays CPU and GPU timeline tracks arranged by thread.

**Reading tracks:**
- Each horizontal lane = one thread
- Colored bars = named scopes (width = duration, depth = call nesting)
- Mouse wheel to zoom; drag to pan

**Key panels:**

| Panel | Purpose |
|-------|---------|
| **Frames** | Frame bar at the top; click to jump to a specific frame |
| **Timing** | Main timeline — per-thread CPU and GPU tracks |
| **Timers / Counters** | Aggregate stats: inclusive time, exclusive time, call count |
| **Callers / Callees** | Who calls this event and what it calls |

**Inclusive vs exclusive time — the critical distinction:**

- **Inclusive** = total wall-clock time of the scope including all child calls
- **Exclusive** = time spent in the scope itself, excluding children
- High inclusive + low exclusive → a wrapper calling expensive children; drill into the children
- High exclusive → the function itself is the actual bottleneck

**Common bottleneck patterns:**

| Pattern in timeline | Likely cause |
|--------------------|-------------|
| Game thread bar stalls render thread | CPU bottleneck — game thread is too expensive |
| Render thread stalled waiting on GPU | GPU bottleneck |
| Tiny bars with gaps on worker threads | Task graph starvation |
| Many micro-allocations per frame | Excessive heap pressure |

## Memory Insights

Tracks every `malloc`, `realloc`, and `free`. Add overhead — use for targeted sessions only.

Enable: `-trace=memory` (add `callstack,module` to get allocation call stacks).

**Key features:**
- Graph of total allocated memory over time
- Call stack traces pinpoint where allocations are made
- **A/B comparison**: select two time points and diff allocations between them
- **Memory rules/budgets**: define per-category limits and see violations highlighted

**LLM (Low Level Memory) asset tracking (UE 5.6+):**

```
YourGame.exe -trace=memory,llm -llm-trace-assets
```

Switch between `TagSet` views — System, AssetClass, Asset — and sort by size to identify the largest memory consumers.

## Network & Asset Loading Insights

**Network Insights** captures packet timing, bandwidth usage, and connection statistics. Useful for profiling multiplayer games and identifying bandwidth spikes.

**Asset Loading Insights** (`-trace=loadtime`):
- Timeline of per-asset load times during async loading
- Shows load order of packages and whether `AsyncLoading` respects priorities
- Identifies slow-loading assets

Tuning async loading in `DefaultEngine.ini`:

```ini
[/Script/Engine.StreamingSettings]
s.PriorityAsyncLoadingExtraTime=275.0
s.LevelStreamingActorsUpdateTimeLimit=250.0
s.UseUnifiedTimeBudgetForStreaming=1     ; UE 5.6+ unified streaming budget
```

## Best Practices

- **Profile on target hardware.** Dev-machine frame times are irrelevant for console or mobile. Always validate on the weakest supported configuration.
- **Always use Test builds.** Development builds contain extra validation passes that inflate timings.
- **Instrument code as you write it.** Add `TRACE_CPUPROFILER_EVENT_SCOPE_STR` to major systems at authoring time, not only when a performance complaint arrives.
- **Keep sessions short (10–30 s).** Trace files grow fast; shorter sessions stay manageable and are easier to analyze.
- **Enable only channels you need.** Extra channels add runtime overhead and produce large files.
- **Use bookmarks to mark scenario boundaries** (`TRACE_BOOKMARK`) so you can quickly navigate to the relevant time range in Insights.
- **Compare before/after with the same channel set.** Different channels = different overhead = incomparable results.
- **Establish a baseline before optimizing.** Save a trace or screenshot of key metrics to document where you started.
- **Add finer instrumentation when the bottleneck is unclear.** Add `TRACE_CPUPROFILER_EVENT_SCOPE_STR` inside suspect functions and re-profile rather than guessing.
- **Profile multiple scenarios separately** (loading, gameplay, menu, combat). Performance characteristics differ significantly between them.

## Console Commands & Launch Parameters

**In-game console commands:**

| Command | Effect |
|---------|--------|
| `trace.start` | Start recording with configured channels |
| `trace.stop` | Stop recording and flush to disk |
| `trace.channels` | List all registered channels with enabled state |
| `trace.togglechannel <name> <0\|1>` | Enable or disable a channel at runtime |
| `stat fps` | Overlay FPS counter |
| `stat unit` | Overlay game/render/GPU thread breakdown per frame |

**Launch parameters:**

| Parameter | Purpose |
|-----------|---------|
| `-trace=<channels>` | Enable channels at startup |
| `-tracehost=<IP>` | Live-stream to Insights at that address |
| `-tracefile=<path>` | Write trace to a specific file |
| `-statnamedevents` | Make `SCOPED_NAMED_EVENT` visible in Insights |
| `-filetrace` | Enable file I/O tracing |
| `-loadtimetrace` | Enable asset load time tracing |
| `-llm-trace-assets` | Enable LLM per-asset memory breakdown (with `-trace=llm`) |

**Useful CVars for richer GPU captures:**

| CVar | Purpose |
|------|---------|
| `r.ShowMaterialDrawEvents=1` | Show per-material draw call labels in GPU tracks |
| `r.Shadow.Virtual.ShowLightDrawEvents=1` | Show per-light virtual shadow map draw events |

## Anti-patterns

- **Profiling in Shipping builds** — Shipping strips all profiling infrastructure. Use Test builds.
- **Enabling all channels by default** — Adds significant overhead and produces multi-GB files. Use the minimal channel set needed for the question at hand.
- **Only profiling on the development machine** — A high-end workstation hides console or mobile performance problems. Always verify on target hardware.
- **Trusting inclusive time alone** — A wrapper function always shows high inclusive time. Inspect exclusive time to locate the actual bottleneck.
- **Single-session conclusions** — One session may hit an anomalous frame. Profile the same scenario multiple times and look for consistent patterns.
- **Ignoring GPU tracks** — The game thread can be perfectly idle while the GPU is the bottleneck. Always check both CPU and GPU timeline tracks.
- **No instrumentation on custom systems** — Without `TRACE_CPUPROFILER_EVENT_SCOPE_STR`, custom code appears as an opaque block in the timeline, making it impossible to identify the expensive subsystem.
- **Live-streaming with full channel set during active testing** — Live tracing with many channels measurably impacts frame rate. Prefer file-based recording for performance measurements.
- **Long recording sessions** — A 5-minute trace of all channels produces files too large to analyze efficiently. Record the minimal scenario (10–30 s) that reproduces the issue.