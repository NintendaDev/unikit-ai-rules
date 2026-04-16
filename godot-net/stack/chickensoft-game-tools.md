---
version: 1.0.0
---

# Chickensoft.GameTools

> **Scope**: Utilities from the Chickensoft.GameTools package — background resource loading via the Loader class, strongly-typed runtime environment detection via the Features API, and DPI-aware window scaling via display extension methods.
> **Load when**: loading resources in the background, managing progress UI during asset loading, detecting platform or OS at runtime, writing platform-conditional code, setting up window scaling for desktop builds, handling high-DPI displays, faking platform features in unit tests.

---

## Installation

```xml
<!-- MyGame.csproj -->
<PackageReference Include="Chickensoft.GameTools" Version="*-*" />
```

```sh
dotnet add package Chickensoft.GameTools --prerelease
```

---

## Resource Loading

Godot's `ResourceLoader` can load resources in the background, but loading multiple resources concurrently requires significant boilerplate. Use `Loader` from GameTools instead.

### Setup pattern

```csharp
private Loader _loader = default!;

public override void _Ready() {
    _loader = new Loader();
    _loader.AddJob<Mesh>("res://assets/hero.mesh", m => _heroMesh = m);
    _loader.AddJob<PackedScene>("res://scenes/level.tscn", s => _levelScene = s);

    _loader.Progress += OnProgress;   // float 0.0 – 1.0
    _loader.Completed += OnCompleted;

    _loader.Load(); // kicks off background loading
}

public override void _Process(double delta) {
    if (!_loader.IsCompleted) {
        _loader.Update(); // must be called every frame to drive progress events
    }
}

public override void _ExitTree() {
    _loader.Progress -= OnProgress;
    _loader.Completed -= OnCompleted;
}
```

### Key API

| Member | Type | Description |
|--------|------|-------------|
| `AddJob<T>(path, callback)` | method | Register a resource path and a callback that receives the loaded resource |
| `Load()` | method | Start background loading all queued jobs |
| `Update()` | method | Pump the loader — must be called every frame until `IsCompleted` |
| `IsCompleted` | property | `true` when all jobs have finished |
| `Progress` | event | `Action<float>` — always fires at exactly 0.0 and 1.0 |
| `Started` | event | Fires once when `Load()` begins |
| `Completed` | event | Fires once when all jobs are done |

### Best practices

- Always call `Update()` inside `_Process()` — skipping it stalls the loader and prevents callbacks.
- Unsubscribe from events in `_ExitTree()` to avoid callback invocations on freed nodes.
- Use the `Completed` event to trigger scene transitions; do not poll `IsCompleted` from outside the process loop.

---

## Feature Tags

Use `Features` for strongly-typed, testable access to Godot's runtime feature tags. Prefer this over raw `OS.HasFeature("windows")` strings — compile-time safety and testability are both improved.

### Usage

```csharp
using Chickensoft.GameTools.Environments;

// OS detection
if (Features.OperatingSystem is OSFamily.macOS or OSFamily.Linux) {
    // Unix-specific code
}

// Build type
if (Features.BuildType is BuildType.Export) {
    // Released build only
}

// Faking for unit tests
Features.FakeOperatingSystem(OSFamily.Linux);
// ... assertions ...
Features.Reset(); // restore real environment — always call in teardown
```

### Available enums

| Feature | Enum type | Example values |
|---------|-----------|----------------|
| Operating system | `OSFamily` | `Windows`, `macOS`, `Linux`, `Android`, `iOS`, `Web` |
| Platform | `Platform` | `Desktop`, `Mobile`, `Web` |
| Interactivity mode | `InteractivityMode` | `Normal`, `Editor`, `Headless` |
| Build type | `BuildType` | `Debug`, `Export` |
| Tool environment | `ToolEnvironment` | `Game`, `Editor` |
| Precision | `Precision` | `Single`, `Double` |
| Bit length | `BitLength` | `Bits32`, `Bits64` |
| Architecture | `Architecture` | `X86`, `X86_64`, `Arm32`, `Arm64` |
| Texture compression | `TextureCompression` | `S3TC`, `ETC2`, `BPTC` |

### Best practices

- Always call `Features.Reset()` in test teardown — failing to reset pollutes subsequent test cases.
- Do not check `OS.HasFeature()` directly in game code; use `Features.*` for consistent testability.
- Use `Features.FakeOperatingSystem()` (and similar fakes) in unit tests to cover platform branches without a real device.

---

## Display Scaling

Use the window extension method `LookGood()` to configure DPI-aware window scaling in a single call. GameTools uses `Chickensoft.Platform` native APIs to detect the true display scale factor.

### Quick setup (recommended)

```csharp
// In your root scene or autoload:
private static readonly Vector2I BaseResolution = new(1920, 1080);

public override void _Ready() {
    GetWindow().LookGood(WindowScaleBehavior.UIProportional, BaseResolution);
}
```

### Scaling behaviors

| Behavior | When to use |
|----------|-------------|
| `WindowScaleBehavior.UIProportional` | Game and UI both scale together — best for pixel-art or fixed-layout games |
| `WindowScaleBehavior.UIFixed` | UI stays fixed; game content scales independently via SubViewport — best for responsive HUDs |

```csharp
// UIFixed with fullscreen
GetWindow().LookGood(WindowScaleBehavior.UIFixed, BaseResolution, isFullscreen: true);
```

### Manual scaling API

Use these when `LookGood()` is not flexible enough:

```csharp
// Get scale information for the current screen
var scaleInfo = GetWindow().GetWindowScaleInfo(Display.UHD4k);
GetWindow().ContentScaleFactor = scaleInfo.ContentScaleFactor;

// Get recommended window size
var sizeInfo = Display.GetWindowSizeInfo(scaleInfo.LogicalResolution);
```

**`WindowScaleInfo` properties:**

| Property | Description |
|----------|-------------|
| `ContentScaleFactor` | DPI-adjusted scale multiplier — apply directly to `Window.ContentScaleFactor` |
| `SystemScale` | OS-reported display scale |
| `LogicalResolution` | Virtual (CSS-like) resolution |
| `NativeResolution` | Physical screen pixel resolution |
| `DisplayScale` | Monitor-level scaling factor |

### Best practices

- Call `LookGood()` in `_Ready()` of the root node or an autoload — before any UI lays out.
- Test in both windowed and fullscreen modes; DPI handling differs.
- On Linux with Wayland, GameTools can only detect the primary monitor — multi-monitor scaling may be inaccurate.
- Always pass `BaseResolution` matching the project's `display/window/size/viewport_width` and `viewport_height` settings.

---

## Anti-patterns

- **Not calling `Loader.Update()` every frame** — the loader never makes progress; callbacks never fire.
- **Not unsubscribing loader events in `_ExitTree()`** — freed node callbacks cause crashes or silent errors after scene changes.
- **Using `OS.HasFeature("windows")` strings** instead of `Features.OperatingSystem` — breaks refactoring, untestable, prone to typos.
- **Not calling `Features.Reset()` after faking** — test state leaks into subsequent tests, causing false passes or failures.
- **Calling `LookGood()` too late** — if called after `_Ready()` completes on the root node, UI layout may have already run with wrong scale.
- **Ignoring the `isFullscreen` parameter** on `LookGood()` when the game supports both modes — scale computation differs between windowed and fullscreen.
