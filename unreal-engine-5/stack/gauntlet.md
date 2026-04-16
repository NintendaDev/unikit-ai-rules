---
version: 1.0.0
---

# Gauntlet Automation Framework

> **Scope**: Gauntlet — UE5's framework for automated functional and performance testing of cooked game builds. Covers UGauntletTestController authoring in C++, C# test node setup via DefaultTest, the RunUnreal execution pipeline, performance profiling via CSV/FCsvProfiler, and CI/CD integration patterns.
> **Load when**: writing Gauntlet test controllers in C++, setting up automated cooked-game tests, authoring C# test node scripts, running functional or smoke tests on a real game session, integrating game testing into CI pipelines, collecting in-game performance metrics with FCsvProfiler.

---

## Core Concepts

Gauntlet splits test logic across two processes:

| Side | Language | Base class | Purpose |
|------|----------|-----------|---------|
| **Game (runtime)** | C++ | `UGauntletTestController` | Controls test flow inside the running game process |
| **Node (orchestration)** | C# | `DefaultTest` | Configures roles, launches sessions, collects artifacts |

**Choose Gauntlet when:**
- Tests require a fully loaded, cooked game session (functional, smoke, performance)
- Tests involve multiplayer/networking (client–server session pairs)
- You need platform-level performance metrics (frame time, memory, GPU)

**Use `FAutomationTestBase` instead when:**
- Tests do not need a real game session
- Tests are fast, self-contained, and editor-runnable

## Module Setup

**1. Enable plugin in `.uproject`:**
```json
{
  "Name": "Gauntlet",
  "Enabled": true
}
```

**2. Add dependency in `Build.cs`:**
```csharp
PrivateDependencyModuleNames.AddRange(new string[] { "Gauntlet" });
```

**3. Create C# test project:**
- Target: **.NET Framework 4.6.2+** — never .NET Core or .NET Standard
- Location: `Engine\Source\Programs\AutomationTool\`
- Output path: `..\..\..\Binaries\DotNET\AutomationScripts\`
- Required references: `AutomationUtils.Automation`, `Gauntlet.Automation`, `UnrealBuildTool`

## C++ Controller (Game Side)

Subclass `UGauntletTestController` in a game plugin or test module:

```cpp
UCLASS()
class UMyGauntletController : public UGauntletTestController
{
    GENERATED_BODY()

protected:
    // Called once at startup — world is NOT available yet; avoid GetWorld() here
    virtual void OnInit() override;

    // First safe point to access UWorld — initialize all gameplay state here
    virtual void OnPostMapChange(UWorld* World) override;

    // Called before map transition begins — cancel any pending timers
    virtual void OnPreMapChange() override;

    // Called every frame — drive state machine, check conditions
    virtual void OnTick(float DeltaTime) override;

    // Called when a named module state changes
    virtual void OnStateChange(FName OldState, FName NewState) override;
};
```

**Lifecycle rules:**
- `OnInit()` runs before the map loads — `GetWorld()` returns null → never use GetWorld() here
- `OnPostMapChange(UWorld*)` is the first safe point for world-dependent initialization
- `EndTest(int32 ExitCode)` must be called exactly once on the **game thread**; `0` = pass, non-zero = fail

**Typical controller flow:**
```cpp
void UMyGauntletController::OnPostMapChange(UWorld* World)
{
    // Delay test start by 3s to let the game fully stabilize after map load
    GetWorld()->GetTimerManager().SetTimer(
        StartTimer,
        this,
        &UMyGauntletController::StartTesting,
        3.0f,
        /*bLoop=*/false
    );
}

void UMyGauntletController::StartTesting()
{
    FCsvProfiler::Get()->BeginCapture();

    GetWorld()->GetTimerManager().SetTimer(
        StopTimer,
        this,
        &UMyGauntletController::StopProfiling,
        7.0f,
        /*bLoop=*/false
    );
}

void UMyGauntletController::StopProfiling()
{
    TSharedFuture<FString> CsvFile = FCsvProfiler::Get()->EndCapture();

    // Wait on a background thread, then end test on the game thread
    Async(EAsyncExecution::Thread, [this, CsvFile]()
    {
        CsvFile.Wait();
        AsyncTask(ENamedThreads::GameThread, [this]()
        {
            EndTest(0);
        });
    });
}
```

**Wire controller to a session role:**

The C# test node adds `-gauntlet=MyGauntletController` to the game command line when launching the client role. The name must match the class name **without the `U` prefix**.

## C# Test Node (Orchestration Side)

Subclass `DefaultTest`, compiled into `AutomationScripts`:

```csharp
public class MyGauntletTest : DefaultTest
{
    public MyGauntletTest(UnrealTestContext InContext)
        : base(InContext) { }

    public override UE4TestConfig GetConfiguration()
    {
        UE4TestConfig Config = base.GetConfiguration();

        // Safety limit — auto-fails if test takes longer than this
        Config.MaxDuration = TimeSpan.FromMinutes(10);

        // Add C++ controller to the client role
        var ClientRole = Config.RequireRole(UnrealTargetRole.Client);
        ClientRole.Controllers.Add("MyGauntletController");

        return Config;
    }

    protected override void CreateReport(TestResult TestResult)
    {
        // Collect artifacts from the client role after test finishes
        IEnumerable<UnrealRoleArtifacts> ClientArtifacts =
            GetArtifactsForRole(UnrealTargetRole.Client);

        foreach (var Artifacts in ClientArtifacts)
        {
            Log.Info($"Artifacts written to: {Artifacts.ArtifactPath}");
        }
    }
}
```

**Key configuration methods:**

| Method | Purpose |
|--------|---------|
| `GetConfiguration()` | Define roles, controllers, duration limits |
| `CreateReport()` | Post-test artifact collection and analysis |
| `Config.RequireRole(role)` | Add a game role (Client, Server) to the session |
| `ClientRole.Controllers.Add("Name")` | Wire a C++ controller to the role |
| `Config.MaxDuration` | Safety timeout; test auto-fails if exceeded |

## Build & Execution Pipeline

**Step 1 — Cook the game:**
```bash
RunUAT.bat BuildCookRun ^
  -project=<full_path_to.uproject> ^
  -platform=Win64 ^
  -configuration=Development ^
  -build -cook -pak -stage
```
Output goes to `<Project>\Saved\StagedBuilds\`.

**Step 2 — Run the test:**
```bash
RunUAT.bat RunUnreal ^
  -project=<GameNameOnly> ^
  -platform=Win64 ^
  -configuration=Development ^
  -test=MyGauntletTest ^
  -build=<path_to_StagedBuilds_parent> ^
  -uploaddir=<output_reports_directory>
```

**RunUnreal parameter rules:**
- `-project` — game name only (no path, no `.uproject` extension)
- `-build` — path to the **parent** of `StagedBuilds`, not to `WindowsNoEditor` itself
- `-uploaddir` — directory where artifacts and HTML reports are written
- Gauntlet **never builds** — always supply a pre-cooked build

## Performance Profiling

**FCsvProfiler captures in-game metrics:**
```cpp
// Start capture at the beginning of the test scenario
FCsvProfiler::Get()->BeginCapture();

// Stop capture; returns a TSharedFuture that resolves to the CSV file path
TSharedFuture<FString> CsvFileFuture = FCsvProfiler::Get()->EndCapture();
```

**Report generation from artifacts:**
```bash
# From Engine\Binaries\DotNET\CsvTools
PerfReportTool.exe -csv <path_to.csv> -o <output_dir>
```

**Data captured:** frame time (game thread, render thread, GPU), physical and virtual memory, CPU thread utilization, custom stat categories.

**Manual console profiling workflow:**
```
CsvProfile Start
# play 5+ seconds of representative gameplay
CsvProfile Stop
# CSV written to Saved\Profiling\CSV\
```

## Common Pitfalls

**1. Accessing world in `OnInit()` → null pointer crash**
`OnInit()` fires before map load; `GetWorld()` returns null.
Fix: move all world-dependent setup to `OnPostMapChange(UWorld* World)`.

**2. Not delaying test start after `OnPostMapChange()`**
The level loads but actors may still be initializing when the callback fires.
Fix: schedule `StartTesting()` via a timer with at least a 3-second delay.

**3. Calling `EndTest()` off the game thread → race condition**
`FCsvProfiler::EndCapture()` resolves on a background thread.
Fix: dispatch `EndTest()` back using `AsyncTask(ENamedThreads::GameThread, ...)`.

**4. Calling `EndTest()` more than once → undefined behavior**
Fix: guard with a `bool bTestEnded` flag; check before calling `EndTest`.

**5. Non-English locale corrupts SVG graphs in reports**
`PerfReportTool` uses the system locale for decimal separators; non-English locales break SVG numbers.
Fix: add `Thread.CurrentThread.CurrentCulture = CultureInfo.InvariantCulture;` at the start of `CsvToSVG.cs::Run()`.

**6. Port conflicts in parallel test runs**
Default Unreal server port is shared across test instances.
Fix: assign unique ports to each test role when parallelizing in CI.

**7. Wrong .NET target for C# project**
.NET Core / .NET Standard projects cannot find Gauntlet assemblies.
Fix: always target **.NET Framework** (4.6.2+) in Visual Studio project settings.

**8. Stale cooked build → silently tests old code**
Gauntlet never rebuilds; it uses whatever binary is in `-build`.
Fix: make the cook step mandatory before every test run in CI pipelines.

## Anti-patterns

- **Never put game logic in `OnInit()`** — the world does not exist yet; always use `OnPostMapChange()`.
- **Never hardcode absolute paths in C# scripts** — use `Context.Options` and artifact collection APIs for portability across machines.
- **Never skip `MaxDuration`** — without a safety timeout, a hung session blocks the CI queue indefinitely.
- **Never mix Gauntlet with `FAutomationTestBase`** — they run in different contexts; use `FAutomationTestBase` for editor-runnable unit and integration tests.
- **Never call `EndTest()` multiple times** — once is sufficient and expected; additional calls produce undefined behavior.