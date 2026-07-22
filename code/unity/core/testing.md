---
version: 1.0.0
---

# Unit Testing Rules

> **Scope**: Rules for NUnit unit tests — AAA pattern, test class structure, naming, test doubles (Fake/Stub/Mock), parameterized tests, boundary conditions, assembly definitions, ScriptableObject in tests, PlayMode tests.
> **Load when**: writing or reviewing unit tests, creating test doubles, setting up test assemblies.

---

## Framework & Mode

- Framework: **NUnit** (`NUnit.Framework`)
- Mode: **EditMode** — tests in `Tests/EditMode/`
- Assembly Definition: `{Module}.Tests.asmdef` with `includePlatforms: ["Editor"]`, `overrideReferences: true`, `precompiledReferences: ["nunit.framework.dll"]`, `defineConstraints: ["UNITY_INCLUDE_TESTS"]`

## Class Type -> Test Mode

| Class type | EditMode | PlayMode |
|---|---|---|
| Pure C# (POCO, no MonoBehaviour) | Recommended | Not needed |
| MonoBehaviour with extractable logic | For pure logic | For lifecycle |
| MonoBehaviour with coroutines | Not applicable | Required |
| MonoBehaviour with physics/UI | Not applicable | Required |
| ScriptableObject | Recommended | Not needed |
| Static utility class | Recommended | Not needed |

## File & Folder Structure

```
Modules/{ModuleName}/Tests/
  {ModuleName}.Tests.asmdef
  EditMode/
    TestDoubles/
      Fake{DependencyName}.cs
      Stub{DependencyName}.cs
      Mock{DependencyName}.cs
    {ClassName}Tests.cs
  PlayMode/                          <- only if PlayMode tests needed
    TestDoubles/
      ...
    {ClassName}PlayTests.cs
```

**One test double = one file.** Never place test doubles inside the test file.

### Assembly Definitions

**EditMode asmdef** — create if missing:

```json
{
    "name": "{ModuleName}.Tests",
    "rootNamespace": "{ModuleName}.Tests",
    "references": [
        "GUID:<production-assembly-guid>"
    ],
    "includePlatforms": [
        "Editor"
    ],
    "overrideReferences": true,
    "precompiledReferences": [
        "nunit.framework.dll"
    ],
    "defineConstraints": [
        "UNITY_INCLUDE_TESTS"
    ],
    "optionalUnityReferences": [
        "TestAssemblies"
    ]
}
```

**PlayMode asmdef** — `includePlatforms: []` (empty = all platforms):

```json
{
    "name": "{ModuleName}.PlayTests",
    "rootNamespace": "{ModuleName}.PlayTests",
    "references": [
        "GUID:<production-assembly-guid>"
    ],
    "includePlatforms": [],
    "overrideReferences": true,
    "precompiledReferences": [
        "nunit.framework.dll"
    ],
    "defineConstraints": [
        "UNITY_INCLUDE_TESTS"
    ],
    "optionalUnityReferences": [
        "TestAssemblies"
    ]
}
```

> Always look up the actual GUID of the production asmdef via `Grep`. Never use a placeholder.

## Naming

| Element | Rule | Example |
|---------|------|---------|
| Test file | `{ClassName}Tests.cs` | `WalletTests.cs` |
| Test class | `{ClassName}Tests`, `sealed` | `WalletTests` |
| PlayMode file | `{ClassName}PlayTests.cs` | `PlayerPlayTests.cs` |
| Test double | Prefix `Fake`/`Stub`/`Mock`, `internal sealed` | `FakeCurrency`, `StubDataService`, `MockEventBus` |
| Test method | `{Condition}_{ExpectedResult}` or `{Action}_{ExpectedResult}` | `WithValidAmount_IncreasesBalance` |

## Test Class Structure

- `[TestFixture]` attribute on class
- Class `sealed`
- Group tests via **nested classes** with `[TestFixture]` (by operation/scenario)
- `[SetUp]` for common initialization within group — keep minimal (create SUT + inject stubs)
- `[TearDown]` for cleanup (mandatory for `ScriptableObject` — `Object.DestroyImmediate`)
- Use `[Category("Slow")]` for slow PlayMode tests

```csharp
[TestFixture]
public sealed class WalletTests
{
    [TestFixture]
    public sealed class AddOperation
    {
        private Wallet _wallet;

        [SetUp]
        public void SetUp()
        {
            _wallet = CreateWallet();
        }

        [Test]
        public void WithValidAmount_IncreasesBalance()
        {
            // Arrange
            // Act
            // Assert
        }
    }
}
```

## AAA Pattern

Every test strictly follows **Arrange — Act — Assert** with empty line separators:

```csharp
[Test]
public void WithSufficientFunds_ReturnsTrueAndDecreasesBalance()
{
    // Arrange
    var wallet = CreateWalletWithBalance(100);

    // Act
    bool result = wallet.TrySpend(CurrencyType.Coins, 30);

    // Assert
    Assert.IsTrue(result);
    Assert.AreEqual(70, wallet.GetBalance(CurrencyType.Coins));
}
```

Each test method tests **one behavior**. Multi-assert only when verifying a single logical outcome.

## Parameterized Tests

Use `[TestCase]` for multiple input values:

```csharp
[TestCase(0.5f, 100, 50)]
[TestCase(1.0f, 100, 100)]
[TestCase(2.0f, 100, 200)]
public void WithVariousMultipliers_ReturnsExpectedValue(float multiplier, int cost, int expected)
{
    // Arrange
    SetMultiplier(multiplier);

    // Act
    int result = _sut.Calculate(cost);

    // Assert
    Assert.AreEqual(expected, result);
}
```

Use `[TestCaseSource]` for complex data sets. Avoid copy-pasting test methods.

## Boundary Conditions

For **every** method under test, check applicable boundaries:

### Value Boundaries

- Null arguments (for reference types)
- Empty collections (List, Array, Dictionary with count 0)
- Single-element collections
- `int`: 0, -1, `int.MaxValue`, `int.MinValue`
- `float`: 0f, -1f, `float.MaxValue`, `float.NaN`, `float.PositiveInfinity`, `float.Epsilon`
- `string`: null, `""`, `" "` (whitespace)
- `Vector3`: `Vector3.zero`, very large magnitudes, `NaN` components
- Enums: first value, last value, undefined cast `(MyEnum)999`

### State Boundaries

- Object not initialized (before `Awake`/`Start`)
- Object already destroyed / disabled
- Method called twice in a row (idempotency)
- Order-dependent sequences (e.g., `Init()` before `Execute()`)

### Collection Boundaries

- Add to full collection (if capacity-limited)
- Remove from empty collection
- Access by index: -1, 0, last, beyond last
- Duplicate entries

### Unity-Specific Boundaries

- `GameObject` is inactive
- `Component` is disabled (`enabled = false`)
- `Time.deltaTime` = 0 (paused)
- Missing references (`null` from `GetComponent<T>()`)

## Stub / Mock / Fake Rules

- Each double in a separate file under `TestDoubles/`
- **Reusable doubles belong to the interface owner's test assembly.** If a test double implements an interface from another module (e.g., `IWallet` from `Pawnshop.Wallets`), place it in that module's `Tests/EditMode/TestDoubles/`, not in the consumer's tests. This lets all modules that depend on the interface reuse the same double via assembly reference.
- Access modifier: `internal sealed` (use `[assembly: InternalsVisibleTo]` when shared across test assemblies)
- Namespace: matches the interface owner's test namespace (`{Module}.Tests`)
- `<summary>` documentation mandatory
- Implement the same interface as production code

### Prefixes

| Prefix | Purpose | Has logic? | Records calls? |
|--------|---------|-----------|----------------|
| `Stub` | Provides canned data, no assertions | Minimal | No |
| `Fake` | Working in-memory implementation | Yes | No |
| `Mock` | Records calls for verification | Minimal | Yes |

### Stub Template

```csharp
namespace Pawnshop.Wallets.Tests
{
    /// <summary>
    /// Stub ICurrency returning fixed values for unit testing.
    /// </summary>
    internal sealed class StubCurrency : ICurrency
    {
        public string Id { get; set; } = "coins";
        public int MaxStack { get; set; } = 999;
    }
}
```

### Mock Template

```csharp
namespace Pawnshop.Wallets.Tests
{
    /// <summary>
    /// Mock IEventBus recording published events for assertion.
    /// </summary>
    internal sealed class MockEventBus : IEventBus
    {
        private readonly List<string> _publishedEvents = new();

        public int PublishCallCount => _publishedEvents.Count;

        public void Publish(string eventName)
        {
            _publishedEvents.Add(eventName);
        }

        public bool WasPublished(string eventName) => _publishedEvents.Contains(eventName);

        public void AssertPublished(string eventName)
        {
            if (WasPublished(eventName) == false)
                throw new AssertionException(
                    $"Expected event '{eventName}' was not published. Published: [{string.Join(", ", _publishedEvents)}]");
        }

        public void AssertNotPublished(string eventName)
        {
            if (WasPublished(eventName))
                throw new AssertionException(
                    $"Event '{eventName}' was published but should not have been.");
        }
    }
}
```

### Fake Template

```csharp
namespace Pawnshop.Wallets.Tests
{
    /// <summary>
    /// In-memory ICurrency fake for unit testing wallet operations.
    /// </summary>
    internal sealed class FakeCurrency : ICurrency
    {
        // Working lightweight implementation with real logic
    }
}
```

## Exception Testing

```csharp
Assert.Throws<ArgumentException>(() => _wallet.Add(CurrencyType.Coins, -1));

var exception = Assert.Throws<ArgumentException>(() => _wallet.Add(CurrencyType.Coins, -1));
Assert.That(exception.Message, Contains.Substring("must be greater than zero"));
```

## ScriptableObject in Tests

```csharp
[SetUp]
public void SetUp()
{
    _config = ScriptableObject.CreateInstance<EnemyConfig>();
}

[TearDown]
public void TearDown()
{
    if (_config != null)
        Object.DestroyImmediate(_config);
}
```

## PlayMode Tests

Use PlayMode when testing MonoBehaviour lifecycle, coroutines, physics, or UI.

```csharp
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace Pawnshop.SomeModule.PlayTests
{
    [TestFixture]
    public sealed class PlayerControllerPlayTests
    {
        private GameObject _playerGO;
        private PlayerController _sut;

        [SetUp]
        public void SetUp()
        {
            _playerGO = new GameObject("TestPlayer");
            _sut = _playerGO.AddComponent<PlayerController>();
        }

        [TearDown]
        public void TearDown()
        {
            Object.DestroyImmediate(_playerGO);
        }

        [UnityTest]
        public IEnumerator Start_WhenCalled_InitializesHealth()
        {
            yield return null; // Wait one frame for Start()

            Assert.AreEqual(100, _sut.CurrentHealth);
        }

        [UnityTest]
        public IEnumerator OnDisable_WhileActive_StopsProcessing()
        {
            yield return null;
            _sut.enabled = false;
            yield return null;

            Assert.IsFalse(_sut.IsProcessing);
        }

        [UnityTest]
        public IEnumerator TakeDamage_WhenGameObjectInactive_DoesNotApply()
        {
            yield return null;
            _playerGO.SetActive(false);
            _sut.TakeDamage(50);

            Assert.AreEqual(100, _sut.CurrentHealth);
        }
    }
}
```

## Running Tests

```
# Run all EditMode tests
mcp__UnityMCP__run_tests(mode="EditMode")

# Run specific test assembly
mcp__UnityMCP__run_tests(mode="EditMode", assembly_names=["Pawnshop.Wallets.Tests"])

# Run specific test by name
mcp__UnityMCP__run_tests(mode="EditMode", test_names=["FullTestName"])

# Poll results
mcp__UnityMCP__get_test_job(job_id="...", wait_timeout=30)
```

Test assemblies: `Game.Tests.EditMode`, `Game.Tests.PlayMode`, `Pawnshop.Wallets.Tests`, `Pawnshop.MiniGames.Tests`, `Pawnshop.GameInventory.Tests.EditMode`, `Pawnshop.SelectionSystems.Simple.Tests`.

## Additional Test Requirements

- When code uses string constants to reference scene objects or components (e.g., `GlobalBlackboard.Find("GlobalBlackboard")`, `blackboard.GetVariableValue<Transform>("CustomerSpawnPoint")`), these constants MUST be covered by tests. Tests should verify that the referenced asset (prefab, scene object) exists with the expected identifier and contains the expected variables/components with correct types. This prevents silent runtime failures from typos or renamed objects.
- Always call `Dispose()` in `[TearDown]` for all `IDisposable` test subjects and `CancellationTokenSource` instances created during tests.
- Cover pool-friendly MonoBehaviour `Reset()` with a reflection-based test verifying all fields are reset to default values after `Reset()` call.

## Untestable Code

If a class is untestable (tightly coupled, no interfaces, static dependencies), suggest refactoring:

1. Extract interface from concrete class — needed for stubbing
2. Replace singletons/statics with injected interfaces
3. Move calculation logic from lifecycle methods into pure methods
4. Provide refactored interface files alongside the tests
