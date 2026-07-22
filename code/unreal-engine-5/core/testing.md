---
version: 1.0.0
---

# Unit Testing Rules

> **Scope**: Rules for UE5 Automation Framework tests — test structure, naming, test doubles (Fake/Stub/Mock), parameterized tests, boundary conditions, module test organization, latent commands.
> **Load when**: writing or reviewing unit tests, creating test doubles, setting up test structure.

---

## Framework & Mode

- Framework: **UE5 Automation Framework** (`Misc/AutomationTest.h`)
- Test types:
  - `EAutomationTestFlags::EditorContext | ApplicationContextMask | ProductFilter` — for editor-only tests
  - `EAutomationTestFlags::ClientContext | ProductFilter` — for runtime/client tests
- Test location: `Source/{ModuleName}/Private/Tests/` — tests in Private, never in Public
- Test files: `{ClassName}Tests.cpp`

## Class Type -> Test Approach

| Class type | Unit test | Integration test |
|---|---|---|
| Plain C++ (FStruct, non-UObject) | Recommended | Not needed |
| UObject with extractable logic | For pure logic | For lifecycle |
| UActorComponent with Tick | Not applicable | Required (world needed) |
| AActor with physics/collision | Not applicable | Required (world needed) |
| UDataAsset / UDataTable | Recommended | Not needed |
| Static utility (FBlueprintFunctionLibrary) | Recommended | Not needed |
| USubsystem | With mock world | With real world |

## File & Folder Structure

```
Source/{ModuleName}/
  Private/
    Tests/
      TestDoubles/
        Fake{DependencyName}.h
        Stub{DependencyName}.h
        Mock{DependencyName}.h
      {ClassName}Tests.cpp
```

**One test double = one file.** Never place test doubles inside the test file.

### Module Test Setup

Tests use the same module's Build.cs. Add test-only dependencies:

```csharp
if (Target.bBuildDeveloperTools || Target.Configuration != UnrealTargetConfiguration.Shipping)
{
    PrivateDependencyModuleNames.Add("AutomationController");
}
```

## Naming

| Element | Rule | Example |
|---------|------|---------|
| Test file | `{ClassName}Tests.cpp` | `WalletTests.cpp` |
| Simple test | `IMPLEMENT_SIMPLE_AUTOMATION_TEST` | `FWalletAddTest` |
| Complex test | `IMPLEMENT_COMPLEX_AUTOMATION_TEST` | `FWalletParameterizedTest` |
| Test double | Prefix `Fake`/`Stub`/`Mock` | `FakeWallet`, `StubDataService` |
| Test ID | `{Module}.{Class}.{Scenario}` | `Game.Wallet.AddWithValidAmount` |
| Method | `RunTest` (entry point) | Override `RunTest(const FString&)` |

## Test Registration

### Simple Test (Single Test Case)

```cpp
#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FWalletAddValidAmountTest,                                    // Class name
    "Game.Wallet.Add.WithValidAmount_IncreasesBalance",           // Test ID (dot-separated path)
    EAutomationTestFlags::EditorContext |
    EAutomationTestFlags::ApplicationContextMask |
    EAutomationTestFlags::ProductFilter
)

bool FWalletAddValidAmountTest::RunTest(const FString& Parameters)
{
    // Arrange
    FWallet Wallet;

    // Act
    Wallet.Add(ECurrencyType::Coins, 50);

    // Assert
    TestEqual(TEXT("Balance after add"), Wallet.GetBalance(ECurrencyType::Coins), 50);

    return true;
}
```

### Complex Test (Parameterized)

```cpp
IMPLEMENT_COMPLEX_AUTOMATION_TEST(
    FWalletMultiplierTest,
    "Game.Wallet.Calculate.WithVariousMultipliers",
    EAutomationTestFlags::EditorContext |
    EAutomationTestFlags::ApplicationContextMask |
    EAutomationTestFlags::ProductFilter
)

void FWalletMultiplierTest::GetTests(
    TArray<FString>& OutBeautifiedNames,
    TArray<FString>& OutTestCommands) const
{
    // Define parameter sets: "Name|Multiplier|Cost|Expected"
    OutBeautifiedNames.Add(TEXT("Half"));
    OutTestCommands.Add(TEXT("0.5|100|50"));

    OutBeautifiedNames.Add(TEXT("Normal"));
    OutTestCommands.Add(TEXT("1.0|100|100"));

    OutBeautifiedNames.Add(TEXT("Double"));
    OutTestCommands.Add(TEXT("2.0|100|200"));
}

bool FWalletMultiplierTest::RunTest(const FString& Parameters)
{
    // Parse parameters
    TArray<FString> Parts;
    Parameters.ParseIntoArray(Parts, TEXT("|"));

    float Multiplier = FCString::Atof(*Parts[0]);
    int32 Cost = FCString::Atoi(*Parts[1]);
    int32 Expected = FCString::Atoi(*Parts[2]);

    // Arrange
    FCalculator Calculator;
    Calculator.SetMultiplier(Multiplier);

    // Act
    int32 Result = Calculator.Calculate(Cost);

    // Assert
    TestEqual(TEXT("Calculated value"), Result, Expected);

    return true;
}
```

## AAA Pattern

Every test strictly follows **Arrange — Act — Assert** with empty line separators:

```cpp
bool FMyTest::RunTest(const FString& Parameters)
{
    // Arrange
    FWallet Wallet;
    Wallet.Add(ECurrencyType::Coins, 100);

    // Act
    bool bResult = Wallet.TrySpend(ECurrencyType::Coins, 30);

    // Assert
    TestTrue(TEXT("TrySpend returns true"), bResult);
    TestEqual(TEXT("Balance after spend"), Wallet.GetBalance(ECurrencyType::Coins), 70);

    return true;
}
```

Each test tests **one behavior**. Multiple assertions only when verifying a single logical outcome.

## Assertion Methods

| Method | Purpose |
|--------|---------|
| `TestTrue(Description, Value)` | Assert boolean true |
| `TestFalse(Description, Value)` | Assert boolean false |
| `TestEqual(Description, Actual, Expected)` | Assert equality |
| `TestNotEqual(Description, Actual, Unexpected)` | Assert inequality |
| `TestNull(Description, Ptr)` | Assert null pointer |
| `TestNotNull(Description, Ptr)` | Assert non-null pointer |
| `TestSame(Description, ActualRef, ExpectedRef)` | Assert same object reference |
| `TestValid(Description, SharedPtr)` | Assert shared pointer is valid |
| `TestInvalid(Description, SharedPtr)` | Assert shared pointer is invalid |
| `AddError(Message)` | Add error (test fails) |
| `AddWarning(Message)` | Add warning (test passes) |
| `AddExpectedError(Pattern, Count)` | Expect specific error log (use for negative tests) |

All assertions require a `TEXT("Description")` first parameter — mandatory, never skip.

## Latent Tests (Async / World-Dependent)

For tests requiring world, ticking, or async operations:

```cpp
IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FHealthComponentDamageTest,
    "Game.Components.Health.TakeDamage_ReducesHealth",
    EAutomationTestFlags::EditorContext |
    EAutomationTestFlags::ApplicationContextMask |
    EAutomationTestFlags::ProductFilter
)

bool FHealthComponentDamageTest::RunTest(const FString& Parameters)
{
    // Create temporary world
    UWorld* World = FAutomationEditorCommonUtils::CreateNewMap();
    TestNotNull(TEXT("World created"), World);

    // Spawn actor with component
    AActor* TestActor = World->SpawnActor<AActor>();
    UHealthComponent* Health = NewObject<UHealthComponent>(TestActor);
    Health->RegisterComponent();
    Health->InitializeComponent();

    // Act
    Health->TakeDamage(30.0f);

    // Assert
    TestEqual(TEXT("Health after damage"), Health->GetCurrentHealth(), 70.0f);

    // Cleanup
    World->DestroyWorld(false);

    return true;
}
```

### Latent Commands for Multi-Frame Tests

```cpp
bool FAsyncLoadTest::RunTest(const FString& Parameters)
{
    // Latent action that waits for condition
    ADD_LATENT_AUTOMATION_COMMAND(FWaitForCondition([this]() -> bool
    {
        return bAssetLoaded;
    }, 5.0f)); // Timeout in seconds

    // Latent action that runs after condition is met
    ADD_LATENT_AUTOMATION_COMMAND(FAutomationLambdaCommand([this]()
    {
        TestNotNull(TEXT("Loaded asset"), LoadedAsset);
    }));

    // Trigger async load
    StartAsyncLoad();

    return true;
}
```

## Boundary Conditions

For **every** method under test, check applicable boundaries:

### Value Boundaries

- Null UObject pointers (`nullptr`)
- Empty collections (`TArray` / `TMap` / `TSet` with `Num() == 0`)
- Single-element collections
- `int32`: 0, -1, `MAX_int32`, `MIN_int32`
- `float`: 0.0f, -1.0f, `MAX_FLT`, `NAN`, `INFINITY`, `SMALL_NUMBER`
- `FString`: empty `TEXT("")`, whitespace `TEXT(" ")`
- `FName`: `NAME_None`
- `FVector`: `FVector::ZeroVector`, very large magnitudes, NaN components
- `FGameplayTag`: empty tag, non-existent tag
- Enums: first value, last value, `static_cast<EType>(255)` (invalid cast)

### State Boundaries

- UObject not initialized (before `BeginPlay`)
- Actor already destroyed (`IsPendingKillPending()`)
- Component not registered (`!IsRegistered()`)
- Method called twice in a row (idempotency)
- Order-dependent sequences (`Initialize()` before `Execute()`)

### Collection Boundaries

- Add to full collection (if capacity-limited)
- Remove from empty collection
- Access by index: -1, 0, last, beyond last
- Duplicate entries
- `Find` / `FindByPredicate` on empty collection

### UE5-Specific Boundaries

- Actor is hidden (`bHidden == true`)
- Component is disabled (`bIsActive == false`)
- `DeltaTime` = 0 (paused via `UGameplayStatics::SetGamePaused`)
- Missing component references (null from `FindComponentByClass<T>()`)
- Actor not in world (`GetWorld() == nullptr`)
- Subsystem not available (world not yet initialized)
- Garbage collected reference (stale `TWeakObjectPtr`)

## Stub / Mock / Fake Rules

- Each double in a separate file under `Tests/TestDoubles/`
- **Reusable doubles belong to the interface owner's test folder.** If a test double implements an interface from another module, place it in that module's `Tests/TestDoubles/`, not in the consumer's tests
- Implement the same interface (`I` prefix class) as production code
- `/** @brief */` documentation mandatory

### Prefixes

| Prefix | Purpose | Has logic? | Records calls? |
|--------|---------|-----------|----------------|
| `Stub` | Provides canned data, no assertions | Minimal | No |
| `Fake` | Working in-memory implementation | Yes | No |
| `Mock` | Records calls for verification | Minimal | Yes |

### Stub Template

```cpp
// StubCurrency.h
/**
 * Stub ICurrency returning fixed values for unit testing.
 */
class FStubCurrency : public ICurrency
{
public:
    FName Id = FName(TEXT("Coins"));
    int32 MaxStack = 999;

    virtual FName GetId() const override { return Id; }
    virtual int32 GetMaxStack() const override { return MaxStack; }
};
```

### Mock Template

```cpp
// MockEventBus.h
/**
 * Mock IEventBus recording published events for assertion.
 */
class FMockEventBus : public IEventBus
{
public:
    TArray<FName> PublishedEvents;

    int32 GetPublishCallCount() const { return PublishedEvents.Num(); }

    virtual void Publish(FName EventName) override
    {
        PublishedEvents.Add(EventName);
    }

    bool WasPublished(FName EventName) const
    {
        return PublishedEvents.Contains(EventName);
    }

    void AssertPublished(FName EventName, FAutomationTestBase* Test) const
    {
        Test->TestTrue(
            FString::Printf(TEXT("Event '%s' was published"), *EventName.ToString()),
            WasPublished(EventName)
        );
    }

    void AssertNotPublished(FName EventName, FAutomationTestBase* Test) const
    {
        Test->TestFalse(
            FString::Printf(TEXT("Event '%s' should not be published"), *EventName.ToString()),
            WasPublished(EventName)
        );
    }
};
```

### Fake Template

```cpp
// FakeCurrency.h
/**
 * In-memory ICurrency fake for unit testing wallet operations.
 */
class FFakeCurrency : public ICurrency
{
    // Working lightweight implementation with real logic
};
```

## UDataAsset / USTRUCT in Tests

```cpp
bool FConfigTest::RunTest(const FString& Parameters)
{
    // Arrange — create UDataAsset in test
    UEnemyConfig* Config = NewObject<UEnemyConfig>();
    Config->Health = 100;
    Config->Speed = 5.0f;

    // Act
    FEnemySpawner Spawner;
    FEnemyData Data = Spawner.CreateFromConfig(Config);

    // Assert
    TestEqual(TEXT("Health from config"), Data.Health, 100);
    TestEqual(TEXT("Speed from config"), Data.Speed, 5.0f);

    // No manual cleanup needed — GC handles UObject in test scope

    return true;
}
```

## Running Tests

```
# In-editor: Window → Test Automation → Session Frontend
# Select tests from tree → Run Selected

# Command line (Gauntlet):
RunUAT.bat RunUnreal -project=MyProject.uproject -run=RunTests -test="Game.Wallet" -platform=Win64

# Specific test by full path:
-test="Game.Wallet.Add.WithValidAmount_IncreasesBalance"

# All tests in a module:
-test="Game."

# With log output:
-log -AllowStdOutLogVerbosity
```

### CI Integration

```
# Gauntlet for CI pipelines
RunUAT.bat RunUnreal -project=MyProject.uproject \
    -run=RunTests \
    -test="Game." \
    -platform=Win64 \
    -build=editor \
    -nullrhi \
    -unattended \
    -ReportOutputPath=TestResults/
```

## Additional Test Requirements

- When code uses `FName` constants to reference sockets, data table rows, or gameplay tags (e.g., `FName(TEXT("WeaponSocket"))`, `Tag.MatchesTag(DamageTag)`), these constants MUST be covered by tests verifying the referenced asset/tag/socket exists
- Always clean up spawned Actors and created Worlds in tests — use RAII patterns or explicit cleanup at test end
- When testing Subsystems, create a minimal UWorld + UGameInstance to host the Subsystem lifecycle
- Cover poolable Actor `ResetForPool()` with a test verifying all state fields return to default values after reset
- Use `AddExpectedError()` before operations that should log errors — prevents test failure on expected error output

## Untestable Code

If a class is untestable (tightly coupled, no interfaces, global state dependencies), suggest refactoring:

1. Extract interface (`UINTERFACE` + `I` prefix class) from concrete class — needed for stubbing
2. Replace `GetWorld()->GetSubsystem<T>()` direct access with injected interface
3. Move calculation logic from lifecycle methods (`BeginPlay`, `Tick`) into pure functions on `F` structs
4. Use Subsystem pattern instead of singletons — Subsystems are replaceable in test worlds
