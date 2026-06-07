---
version: 1.0.0
---

# Unit Testing Rules

> **Scope**: Rules for unit tests in Godot .NET — GdUnit4 C# framework, AAA pattern, test class structure, naming, test doubles (Fake/Stub/Mock), parameterized tests, boundary conditions, project configuration, Resource in tests, scene tests.
> **Load when**: writing or reviewing unit tests, creating test doubles, setting up test structure.

---

## Framework & Mode

- Framework: **GdUnit4** (C# edition) — `addons/gdUnit4/`
- Alternative: **NUnit** / **xUnit** for pure C# classes (no Godot dependencies)
- Test location: `test/` at project root, or `modules/{ModuleName}/test/` for module-specific tests
- Test files: `{ClassName}Test.cs` — GdUnit4 discovers classes with `[TestSuite]`
- All test classes MUST have `[TestSuite]` attribute

## Class Type -> Test Approach

| Class type | Unit test | Integration test |
|---|---|---|
| Pure C# (POCO, no Node) | Recommended | Not needed |
| RefCounted / GodotObject subclass | Recommended | Not needed |
| Resource (custom data) | Recommended | Not needed |
| Node with extractable logic | For pure logic | For lifecycle |
| Node with _Process/_PhysicsProcess | Not applicable | Required (scene runner) |
| Node with physics/UI interaction | Not applicable | Required (scene runner) |
| Static utility class | Recommended | Not needed |
| Autoload singletons | With mock replacement | With real autoload |

## File & Folder Structure

```
test/
  src/
    TestDoubles/
      Fake{DependencyName}.cs
      Stub{DependencyName}.cs
      Mock{DependencyName}.cs
    {ClassName}Test.cs
  resources/                         <- test-specific scenes/resources
    TestScene.tscn

modules/{ModuleName}/
  test/
    src/
      TestDoubles/
        Fake{DependencyName}.cs
      {ClassName}Test.cs
```

**One test double = one file.** Never place test doubles inside the test file.

### Project Configuration

GdUnit4 C# tests are compiled as part of the Godot .NET project. Ensure `addons/gdUnit4/` is installed and the plugin is enabled in Project Settings.

For pure C# tests (NUnit/xUnit), create a separate `.csproj` test project:

```xml
<!-- Game.Tests.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="NUnit" Version="4.*" />
    <PackageReference Include="NUnit3TestAdapter" Version="4.*" />
    <ProjectReference Include="../Game.csproj" />
  </ItemGroup>
</Project>
```

## Naming

| Element | Rule | Example |
|---------|------|---------|
| Test file | `{ClassName}Test.cs` | `WalletTest.cs` |
| Test class | `{ClassName}Test`, `sealed` with `[TestSuite]` | `WalletTest` |
| Test double | Prefix `Fake`/`Stub`/`Mock`, `internal sealed` | `FakeCurrency`, `StubDataService`, `MockEventBus` |
| Test method | `{Condition}_{ExpectedResult}` or `{Action}_{ExpectedResult}` | `WithValidAmount_IncreasesBalance` |

## Test Class Structure

- `[TestSuite]` attribute on class
- Class `sealed`
- Group tests via **nested classes** with `[TestSuite]` (by operation/scenario)
- `[Before]` for common initialization within group — keep minimal (create SUT + inject stubs)
- `[After]` for cleanup (mandatory for Node instances — free them)
- `[BeforeTest]` / `[AfterTest]` for one-time setup/teardown

```csharp
[TestSuite]
public sealed class WalletTest
{
    [TestSuite]
    public sealed class AddOperation
    {
        private Wallet _wallet;

        [Before]
        public void SetUp()
        {
            _wallet = CreateWallet();
        }

        [TestCase]
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
[TestCase]
public void WithSufficientFunds_ReturnsTrueAndDecreasesBalance()
{
    // Arrange
    Wallet wallet = CreateWalletWithBalance(100);

    // Act
    bool result = wallet.TrySpend(CurrencyType.Coins, 30);

    // Assert
    Assertions.AssertThat(result).IsTrue();
    Assertions.AssertThat(wallet.GetBalance(CurrencyType.Coins)).IsEqual(70);
}
```

Each test method tests **one behavior**. Multi-assert only when verifying a single logical outcome.

## Parameterized Tests

Use `[TestCase]` with parameters for multiple input values:

```csharp
[TestCase(0.5f, 100, 50)]
[TestCase(1.0f, 100, 100)]
[TestCase(2.0f, 100, 200)]
public void WithVariousMultipliers_ReturnsExpectedValue(
    float multiplier,
    int cost,
    int expected)
{
    // Arrange
    SetMultiplier(multiplier);

    // Act
    int result = _sut.Calculate(cost);

    // Assert
    Assertions.AssertThat(result).IsEqual(expected);
}
```

## Boundary Conditions

For **every** method under test, check applicable boundaries:

### Value Boundaries

- Null arguments (for reference types)
- Empty collections (List, Array, Dictionary with count 0)
- Single-element collections
- `int`: 0, -1, `int.MaxValue`, `int.MinValue`
- `float`: 0f, -1f, `float.MaxValue`, `float.NaN`, `float.PositiveInfinity`, `float.Epsilon`
- `string`: null, `""`, `" "` (whitespace)
- `StringName`: empty StringName
- `Vector2` / `Vector3`: `Vector2.Zero`, very large magnitudes, `NaN` components
- Enums: first value, last value, undefined cast `(MyEnum)999`

### State Boundaries

- Node not yet in tree (before `_Ready`)
- Node already freed (`GodotObject.IsInstanceValid() == false`)
- Method called twice in a row (idempotency)
- Order-dependent sequences (e.g., `Initialize()` before `Execute()`)

### Collection Boundaries

- Add to full collection (if capacity-limited)
- Remove from empty collection
- Access by index: -1, 0, last, beyond last
- Duplicate entries

### Godot-Specific Boundaries

- Node is not visible (`Visible == false`)
- Node processing is disabled (`SetProcess(false)`)
- `delta` = 0 (paused via `GetTree().Paused = true`)
- Missing node references (`GetNodeOrNull<T>()` returns `null`)
- Node not in scene tree (`IsInsideTree() == false`)

## Stub / Mock / Fake Rules

- Each double in a separate file under `TestDoubles/`
- **Reusable doubles belong to the interface owner's test folder.** If a test double implements an interface from another module, place it in that module's `test/src/TestDoubles/`, not in the consumer's tests. This lets all modules that depend on the interface reuse the same double.
- Access modifier: `internal sealed` (use `[assembly: InternalsVisibleTo]` when shared across test projects)
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
namespace Modules.Wallets.Tests
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
namespace Modules.Wallets.Tests
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
namespace Modules.Wallets.Tests
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
// GdUnit4 style
Assertions.AssertThrown(() => _wallet.Add(CurrencyType.Coins, -1))
    .IsInstanceOf<ArgumentException>();

// NUnit style
Assert.Throws<ArgumentException>(() => _wallet.Add(CurrencyType.Coins, -1));
```

## Resource in Tests

```csharp
[Before]
public void SetUp()
{
    _config = new EnemyConfig();
    _config.Health = 100;
    _config.Speed = 5.0f;
}

// No cleanup needed for plain C# objects — GC handles them
// For RefCounted-based Resources — auto-freed when no references remain
// For Node-based test objects — must free explicitly:
[After]
public void TearDown()
{
    if (GodotObject.IsInstanceValid(_node))
        _node.Free();
}
```

## Scene Runner Tests (GdUnit4)

For tests requiring scene tree, use GdUnit4's `ISceneRunner`:

```csharp
[TestSuite]
public sealed class PlayerControllerTest
{
    [TestCase]
    public async Task Ready_WhenCalled_InitializesHealth()
    {
        // Arrange
        ISceneRunner runner = ISceneRunner.Load("res://scenes/entities/Player.tscn");

        // Act
        await runner.SimulateFrames(1);
        PlayerController player = runner.Scene() as PlayerController;

        // Assert
        Assertions.AssertThat(player.CurrentHealth).IsEqual(100);
    }

    [TestCase]
    public async Task TakeDamage_WhenNodeInactive_DoesNotApply()
    {
        // Arrange
        ISceneRunner runner = ISceneRunner.Load("res://scenes/entities/Player.tscn");
        await runner.SimulateFrames(1);
        PlayerController player = runner.Scene() as PlayerController;

        // Act
        player.Visible = false;
        player.TakeDamage(50);

        // Assert
        Assertions.AssertThat(player.CurrentHealth).IsEqual(100);
    }
}
```

## Running Tests

```
# In-editor: GdUnit4 panel (bottom dock) > Run All / Run Selected

# Command line (GdUnit4):
godot --headless -s addons/gdUnit4/bin/GdUnitCmdTool.gd --add test/

# NUnit (for pure C# test project):
dotnet test Game.Tests.csproj

# Run specific test:
dotnet test --filter "FullyQualifiedName~WalletTest"
```

## Additional Test Requirements

- When code uses string constants to reference node paths, input actions, or animation names (e.g., `GetNode("NodePath")`, `Input.IsActionPressed("action_name")`), these constants SHOULD be covered by tests verifying the referenced node/action/animation exists
- Always free Node instances in `[After]` — use GdUnit4's `AutoFree()` for automatic cleanup
- When testing autoloads, mock them or replace via DI
- Cover pool-friendly `Reset()` methods with a test verifying all fields return to default values after reset
- Always call `Dispose()` in `[After]` for all `IDisposable` test subjects and `CancellationTokenSource` instances created during tests

## Untestable Code

If a class is untestable (tightly coupled, no interfaces, static dependencies), suggest refactoring:

1. Extract interface from concrete class — needed for stubbing
2. Replace autoload singleton access with injected interfaces (pass via constructor or `Initialize()`)
3. Move calculation logic from lifecycle methods (`_Process`, `_Ready`) into pure methods
4. Provide refactored interface files alongside the tests
