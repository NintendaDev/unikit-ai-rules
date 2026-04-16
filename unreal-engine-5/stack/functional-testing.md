---
version: 1.0.0
---

# Functional Testing

> **Scope**: UE5 Functional Testing plugin — level-based integration testing using `AFunctionalTest` actors, test lifecycle (PrepareTest → IsReady → StartTest → Tick → FinishTest), step-based test flows, telemetry, and command-line execution.
> **Load when**: authoring functional (map-level) tests, creating `AFunctionalTest` C++ subclasses, setting up test levels, running gameplay-scenario or multi-frame integration tests, distinguishing functional tests from unit tests, configuring test timeouts or observation points.

---

## Overview

Functional Tests are **level-placed actors** that run inside a fully initialized game world. They are the right tool for multi-frame gameplay scenarios, physics interactions, and end-to-end feature validation. Do not use them for pure logic testing — that belongs in the Automation Framework (`testing.md`).

| Dimension | Automation Framework | Functional Testing |
|-----------|---------------------|-------------------|
| Base class | `FAutomationTestBase` | `AFunctionalTest` (extends `AActor`) |
| World required | No (or minimal fake world) | Yes — full level context |
| Assertions | `TestTrue`, `TestEqual`, etc. | `FinishTest()` + custom Tick logic |
| Multi-frame | Latent commands | `Tick` override |
| Trigger | `IMPLEMENT_SIMPLE_AUTOMATION_TEST` | Actor placed in level map |
| Speed | Fast | Slow (full world init per level) |
| Best for | Logic, algorithms, boundaries | Gameplay scenarios, feature flows |

## Plugin & Module Setup

**Enable plugins** (Edit → Plugins, search "functional"):
- `Functional Testing Editor` — provides the editor UI and test runner integration
- `Functional Testing` — core runtime module

**Build.cs** — add to the module that contains your test actors:

```csharp
if (Target.bBuildDeveloperTools || Target.Configuration != UnrealTargetConfiguration.Shipping)
{
    PrivateDependencyModuleNames.Add("FunctionalTesting");
}
```

**World Settings** — set Game Mode to `FunctionalTestGame` on test levels (or let the runner override it automatically).

## Test Map Setup

- Place test levels under `Content/Tests/Maps/`
- Name test maps with prefix `FTEST_`: `FTEST_Combat.umap`, `FTEST_PlayerMovement.umap`
- One level can contain multiple `AFunctionalTest` actors (one actor = one test case)
- Actor name in the level → test name displayed in Session Frontend

**Folder structure:**

```
Content/
  Tests/
    Maps/
      FTEST_Combat.umap
      FTEST_PlayerMovement.umap
Source/{ModuleName}/
  Private/
    Tests/
      Functional/
        PlayerMovementFunctionalTest.h
        PlayerMovementFunctionalTest.cpp
```

## Lifecycle

```
PrepareTest()          ← Setup: spawn actors, load sub-levels (may span multiple frames)
     ↓
IsReady_Implementation()  ← Polled each frame. Test starts when this returns true.
     ↓
StartTest()            ← Main test execution begins; Tick activates if enabled
     ↓
Tick(DeltaSeconds)     ← Per-frame test logic; call FinishTest() when done
     ↓
FinishTest(Result, Msg)  ← Ends the test with a result code and message
     ↓
OnTestFinished()       ← Cleanup: destroy spawned actors, reset modified state
     ↓
WantsToRunAgain()      ← Return true to re-run this test (rare; default false)
```

Override only the phases you need. `PrepareTest` and `IsReady` handle async setup (e.g., waiting for a streamed sub-level or asset to load). `FinishTest` must be called in **every code path** — missing it causes a timeout failure.

## C++ Pattern

```cpp
// PlayerMovementFunctionalTest.h
#pragma once
#include "FunctionalTest.h"
#include "PlayerMovementFunctionalTest.generated.h"

UCLASS()
class MYGAME_API APlayerMovementFunctionalTest : public AFunctionalTest
{
    GENERATED_BODY()

public:
    APlayerMovementFunctionalTest();

protected:
    virtual void PrepareTest() override;
    virtual bool IsReady_Implementation() override;
    virtual void StartTest() override;
    virtual void Tick(float DeltaSeconds) override;

    /** Expected movement distance for the test to pass. */
    UPROPERTY(EditAnywhere, Category="Test Configuration")
    float ExpectedDistance = 250.f;

    /** Acceptance threshold around the expected distance. */
    UPROPERTY(EditAnywhere, Category="Test Configuration")
    float DistanceThreshold = 55.f;

private:
    ACharacter* TestedCharacter = nullptr;
    FVector InitialLocation;
};
```

```cpp
// PlayerMovementFunctionalTest.cpp
#include "PlayerMovementFunctionalTest.h"
#include "Kismet/GameplayStatics.h"
#include "GameFramework/Character.h"

APlayerMovementFunctionalTest::APlayerMovementFunctionalTest()
{
    // Tick must be explicitly enabled — it is off by default on AFunctionalTest.
    PrimaryActorTick.bCanEverTick = true;
}

void APlayerMovementFunctionalTest::PrepareTest()
{
    Super::PrepareTest();
    TestedCharacter = UGameplayStatics::GetPlayerCharacter(GetWorld(), 0);
    if (TestedCharacter)
    {
        InitialLocation = TestedCharacter->GetActorLocation();
    }
}

bool APlayerMovementFunctionalTest::IsReady_Implementation()
{
    return TestedCharacter != nullptr;
}

void APlayerMovementFunctionalTest::StartTest()
{
    Super::StartTest();
    StartStep(TEXT("Trigger movement input"));
    // Trigger the gameplay action under test here
    // e.g., call a movement ability, send input events
    FinishStep();
}

void APlayerMovementFunctionalTest::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    if (!IsValid(TestedCharacter))
    {
        FinishTest(EFunctionalTestResult::Failed, TEXT("TestedCharacter became invalid during test"));
        return;
    }

    const float Distance = FVector::Distance(TestedCharacter->GetActorLocation(), InitialLocation);
    if (Distance >= ExpectedDistance - DistanceThreshold)
    {
        FinishTest(EFunctionalTestResult::Succeeded, TEXT("Character reached expected distance"));
    }
}
```

## Key API

### EFunctionalTestResult

```cpp
EFunctionalTestResult::Succeeded   // Test passed
EFunctionalTestResult::Failed      // Test logic determined failure
EFunctionalTestResult::Error       // Unexpected error (exception, null ref)
EFunctionalTestResult::Running     // Test is in progress (internal state)
EFunctionalTestResult::Default     // Not yet started
EFunctionalTestResult::Invalid     // Configuration problem
```

### FinishTest

```cpp
// BlueprintCallable — Category="Functional Testing"
virtual void FinishTest(EFunctionalTestResult TestResult, const FString& Message);
```

Call this to end the test. Always provide a meaningful message — it appears in test reports and helps diagnose failures.

### Step-Based Testing

Break complex tests into named steps for better reporting:

```cpp
StartStep(TEXT("Spawn enemy"));
// ... setup enemy actor ...
FinishStep();

StartStep(TEXT("Trigger attack"));
// ... call attack logic ...
FinishStep();

StartStep(TEXT("Verify health reduced"));
if (Enemy->GetHealth() < InitialHealth)
{
    FinishTest(EFunctionalTestResult::Succeeded, TEXT("Health reduced after attack"));
}
else
{
    FinishTest(EFunctionalTestResult::Failed, TEXT("Health unchanged after attack"));
}
```

### Logging & Telemetry (UAutomationBlueprintFunctionLibrary)

```cpp
#include "FunctionalTestingHelpers.h"   // or AutomationBlueprintFunctionLibrary.h

UAutomationBlueprintFunctionLibrary::AddTestInfo(TEXT("Spawning enemy..."));
UAutomationBlueprintFunctionLibrary::AddTestWarning(TEXT("Fallback path taken"));
UAutomationBlueprintFunctionLibrary::AddTestError(TEXT("Missing component reference"));

// Performance telemetry — record measurements to the test report
UAutomationBlueprintFunctionLibrary::AddTestTelemetryData(TEXT("FrameTime"), DeltaSeconds * 1000.f, TEXT("attack phase"));

// Check if automated tests are running (use to skip gameplay UI during tests)
bool bTesting = UAutomationBlueprintFunctionLibrary::AreAutomatedTestsRunning();

// Enable/disable stat groups for profiling within tests
UAutomationBlueprintFunctionLibrary::EnableStatGroup(GetWorld(), FName("RHI"));
UAutomationBlueprintFunctionLibrary::DisableStatGroup(GetWorld(), FName("RHI"));
```

Also available directly on `AFunctionalTest`:

```cpp
void LogStep(ELogVerbosity::Type Verbosity, const FString& Message);
```

### WantsToRunAgain

```cpp
virtual bool WantsToRunAgain() override { return bShouldRepeat; }
```

Return true to repeat the test (e.g., stress-testing with multiple iterations). Reset state in `PrepareTest` on each pass.

## Test Configuration (Details Panel)

| Property | Purpose | Recommended |
|----------|---------|------------|
| `Is Enabled` | Toggle test on/off without removing the actor | — |
| `Time Limit` | Max execution time before timeout failure | ≤ 5 seconds |
| `Preparation Time Limit` | Max time for `IsReady()` to return true | ≤ 10 seconds |
| `Times Up Message` | Failure message when timeout fires | Always set |
| `Observation Point` | Camera actor for viewing this test during automation | Optional |
| `Owner` / `Description` | Metadata for reporting | Fill in |

Make all test-specific parameters `UPROPERTY(EditAnywhere)` so they can be tuned per level without recompilation.

## Running Tests

**Session Frontend (editor):**
Tools → Session Frontend → Automation tab → `Project > Functional Tests > Tests > {LevelName}`
Check tests → click play.

**Command line (Windows):**

```bat
UnrealEditor.exe "{PathToProject}\{ProjectName}.uproject" ^
  -ExecCmds="Automation RunTests project.functional tests.tests" ^
  -ReportOutputPath="{OutputPath}" ^
  -nullrhi -unattended -log

# Run tests from a specific level only:
-ExecCmds="Automation RunTests project.functional tests.test.FTEST_Combat"
```

**Command line (Mac/Linux):**

```sh
UnrealEditor \
  "/{PathToProject}/{ProjectName}.uproject" \
  -ExecCmds="Automation RunTests project.functional tests.tests" \
  -ReportOutputPath="{OutputPath}" \
  -nullrhi -unattended -log
```

## When to Use Functional Tests

| Use functional test | Use unit test instead |
|--------------------|-----------------------|
| Multi-frame gameplay sequence | Pure calculation or algorithm |
| Physics or collision validation | Data transformation |
| Actor interaction and event flow | Boundary conditions on plain data |
| Input → animation → state change | Subsystem initialization logic |
| End-to-end feature workflow | Logic extractable to an `F` struct |

When in doubt: if the test requires a game world to be running, use a functional test. If it only needs UObjects and no physics/gameplay, use the Automation Framework with `FAutomationEditorCommonUtils::CreateNewMap()`.

## Anti-patterns

- **Don't test pure logic** in functional tests — they are slow (full world init per level); use unit tests for correctness checks.
- **Don't leave code paths without `FinishTest()`** — the test will run until `Time Limit` fires and report a timeout failure.
- **Don't initialize in `BeginPlay`** — use `PrepareTest` / `IsReady` so the runner controls test readiness.
- **Don't rely on world state from other tests** — each test actor must be self-contained; don't assume prior tests left specific actors or state.
- **Don't set excessively long timeouts** — if a test takes more than 5 seconds, it's likely doing too much (split it) or has a bug in its termination logic.
- **Don't forget to enable Tick** if you need per-frame checks — `PrimaryActorTick.bCanEverTick = true` must be set in the constructor; it is `false` by default on `AFunctionalTest`.
- **Don't hardcode actor references in C++** — expose them as `UPROPERTY(EditAnywhere)` so levels can wire up the right actors without code changes.