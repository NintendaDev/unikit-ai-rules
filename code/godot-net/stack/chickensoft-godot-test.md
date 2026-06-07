---
version: 1.0.0
---

# GoDotTest

> **Scope**: Chickensoft's C# test runner for Godot 4 — test class authoring with `TestClass`, lifecycle attributes, async test support, `TestEnvironment` configuration, code coverage via coverlet, and VS Code debug launch integration.
> **Load when**: authoring tests with GoDotTest, setting up a test scene for Chickensoft packages, running tests from the command line, configuring code coverage, debugging tests in VS Code, integrating GoDotTest into CI/CD.

---

## Core Concepts

- GoDotTest is **Chickensoft's dedicated test runner** for Godot 4 C# projects and NuGet packages. It complements (does not replace) GdUnit4 — use it when working inside the Chickensoft package ecosystem or when the project scaffolded from the Chickensoft GodotGame / GodotPackage template.
- Test discovery is **reflection-based**: `GoTest.RunTests` scans the assembly for all classes that extend `TestClass`.
- Tests run **sequentially** — no parallelism. This is by design to safely support visual and integration-style tests that mutate scene tree state.
- Async `Task` test methods are fully supported and awaited automatically.

## API / Interface

### Base class and lifecycle attributes

```csharp
using Chickensoft.GoDotTest;
using Godot;

public class ExampleTest : TestClass
{
    // Required: the test scene is injected via constructor
    public ExampleTest(Node testScene) : base(testScene) { }

    [SetupAll]  // Once before all tests in this suite
    public void SetupAll() { }

    [Setup]     // Before each [Test]
    public void Setup() { }

    [Test]      // Marks a test method (sync or async Task)
    public void SomeTest() { }

    [Test]
    public async Task AsyncTest()
    {
        await TestScene.ToSignal(
            TestScene.GetTree().CreateTimer(0.5f),
            SceneTreeTimer.SignalName.Timeout
        );
    }

    [Cleanup]   // After each [Test]
    public void Cleanup() { }

    [CleanupAll]// Once after all tests complete
    public void CleanupAll() { }

    [Failure]   // Whenever any test in this suite fails
    public void OnFailure() { GD.PrintErr("Test failed!"); }
}
```

### Test runner entry point

```csharp
using System.Reflection;
using Godot;
using Chickensoft.GoDotTest;

public partial class Tests : Node2D
{
    public override async void _Ready()
        => await GoTest.RunTests(Assembly.GetExecutingAssembly(), this);
}
```

### Main scene integration

```csharp
public partial class Main : Node2D
{
    public override void _Ready()
    {
        var env = TestEnvironment.From(OS.GetCmdlineArgs());
        if (env.ShouldRunTests)
        {
            CallDeferred(nameof(RunTests), env);
            return;
        }
        GetTree().ChangeSceneToFile("res://src/Game.tscn");
    }

    private async void RunTests(ITestEnvironment env)
        => await GoTest.RunTests(Assembly.GetExecutingAssembly(), this, env);
}
```

### TestEnvironment properties

| Property | CLI flag | Description |
|---|---|---|
| `ShouldRunTests` | `--run-tests` | Activates test mode |
| `TestPatternToRun` | `--run-tests=Name` | Suite or `Suite.Method` name |
| `StopOnError` | `--stop-on-error` | Halt on first failure |
| `Sequential` | `--sequential` | Skip remaining tests after failure in a suite |
| `QuitOnFinish` | `--quit-on-finish` | Exit Godot after tests complete |
| `Coverage` | `--coverage` | Use `Environment.Exit()` for coverlet compatibility |

## Patterns & Examples

### Adding nodes to the test scene

```csharp
public class PlayerTest : TestClass
{
    private Player _player = null!;

    public PlayerTest(Node testScene) : base(testScene) { }

    [SetupAll]
    public void SetupAll()
    {
        _player = new Player();
        TestScene.AddChild(_player);  // gives the node a scene tree
    }

    [CleanupAll]
    public void CleanupAll() => _player.QueueFree();
}
```

### Mocking with LightMoq

```csharp
using LightMock.Generator;
using LightMoq;

public class GameManagerTest : TestClass
{
    private Mock<IScoreService> _scoreService = null!;
    private GameManager _gameManager = null!;

    public GameManagerTest(Node testScene) : base(testScene) { }

    [Setup]
    public void Setup()
    {
        _scoreService = new Mock<IScoreService>();
        _scoreService.Setup(s => s.GetScore()).Returns(0);
        _gameManager = new GameManager(_scoreService.Object);
        TestScene.AddChild(_gameManager);
    }

    [Test]
    public void AddingPoints_UpdatesScore()
    {
        _scoreService.Setup(s => s.GetScore()).Returns(100);
        _gameManager.CollectCoin();
        _scoreService.Verify(s => s.AddPoints(10));
    }

    [Cleanup]
    public void Cleanup() => _gameManager.QueueFree();
}
```

### Running specific tests from command line

```bash
godot --run-tests                             # all suites
godot --run-tests=PlayerTest                  # single suite
godot --run-tests=PlayerTest.SomeMethod       # single method
godot --run-tests --quit-on-finish            # CI mode
godot --run-tests --stop-on-error             # fail fast
godot --run-tests --sequential                # skip on suite failure
godot --run-tests --coverage --quit-on-finish # coverage collection
```

## Configuration

### .csproj — package reference and release exclusion

```xml
<ItemGroup>
  <PackageReference Include="Chickensoft.GoDotTest" Version="2.*" />
</ItemGroup>

<!-- Exclude test files from release builds -->
<PropertyGroup Condition="'$(Configuration)' == 'ExportRelease'">
  <DefaultItemExcludes>$(DefaultItemExcludes);test/**/*</DefaultItemExcludes>
</PropertyGroup>
```

### Code coverage with coverlet

```bash
coverlet \
  "./.godot/mono/temp/bin/Debug" --verbosity detailed \
  --target "$GODOT" \
  --targetargs "--run-tests --coverage --quit-on-finish" \
  --format "opencover" \
  --output "./coverage/coverage.xml" \
  --exclude-by-file "**/test/**/*.cs" \
  --exclude-by-file "**/*Microsoft.NET.Test.Sdk.Program.cs" \
  --exclude-by-file "**/Godot.SourceGenerators/**/*.cs" \
  --exclude-assemblies-without-sources "missingall"
```

The `--coverage` flag switches from `SceneTree.Quit()` to `Environment.Exit()` so that coverlet can capture coverage data before the process terminates.

### VS Code launch.json

```json
{
  "configurations": [
    {
      "name": "Debug Tests",
      "type": "coreclr",
      "request": "launch",
      "preLaunchTask": "build",
      "program": "${env:GODOT}",
      "args": ["--run-tests", "--quit-on-finish"],
      "cwd": "${workspaceFolder}"
    },
    {
      "name": "Debug Current Test",
      "type": "coreclr",
      "request": "launch",
      "preLaunchTask": "build",
      "program": "${env:GODOT}",
      "args": ["--run-tests=${fileBasenameNoExtension}", "--quit-on-finish"],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

Set the `GODOT` environment variable to the Godot 4 executable path. The "Debug Current Test" profile relies on the test class name matching the file name (standard C# convention).

### Godot project settings — console log limits

Increase limits to avoid truncated output during long test runs:  
**Project Settings → Network → Limits → Debugger → Max Chars Per Second** and **Max Queued Messages**.

## Best Practices

- Use `[Failure]` to log game state or take screenshots on test failure — it is the last chance to capture diagnostic information before teardown.
- Always `QueueFree()` any nodes added to `TestScene` — do this in `[Cleanup]` (per test) or `[CleanupAll]` (per suite), depending on where the node was created.
- Prefer `[Setup]` / `[Cleanup]` over `[SetupAll]` / `[CleanupAll]` when each test needs a fresh instance — shared mutable state between tests causes hard-to-diagnose failures.
- For Godot signal timing in async tests, use `TestScene.GetTree().CreateTimer(seconds)` rather than `Task.Delay` to respect Godot's process loop.
- Use **LightMock.Generator + LightMoq** for compile-time mock generation — AOT-compatible and closest to Moq's API.
- Use **GodotTestDriver** for integration tests that require simulated input or UI interaction.
- Name each test class to match its file name — this is required for the VS Code "Debug Current Test" launch profile.

## Anti-patterns

- **Do not skip `--coverage` when collecting coverage.** Without it, `SceneTree.Quit()` is called instead of `Environment.Exit()`, and coverlet cannot capture data before process termination.
- **Do not run tests in parallel.** GoDotTest does not support it and attempting to force parallelism (e.g. via `Task.WhenAll`) will cause race conditions in the shared scene tree.
- **Do not include test files in release builds.** Use the conditional `<DefaultItemExcludes>` in `.csproj` to strip the `test/` directory from `ExportRelease` builds.
- **Do not spin up full scene hierarchies in unit tests.** Every child scene and its scripts execute. Prefer adding individual nodes to `TestScene` and injecting fakes, rather than loading complex `.tscn` files.
- **Do not forget to set the `GODOT` environment variable.** Missing it causes all VS Code launch profiles to fail silently or with a misleading error.
