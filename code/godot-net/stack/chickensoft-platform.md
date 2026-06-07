---
version: 1.0.0
---

# Chickensoft.Platform

> **Scope**: Low-level, cross-platform native display detection for Godot 4 C# — querying true native pixel resolution and DPI scale factor directly from the OS when GameTools' `LookGood()` is too high-level.
> **Load when**: reading native display resolution, computing display scale factor directly, extending GameTools display scaling, writing platform-specific display code, debugging HiDPI issues, understanding how GameTools interacts with the OS display layer.

---

## Overview

`Chickensoft.Platform` provides a unified `Displays` singleton that calls OS-native APIs to determine the **actual pixel resolution and DPI scale factor** of the display where a Godot window is located. Godot itself only reports logical (device-independent) pixels, which makes precise HiDPI rendering impossible without this package.

**Prefer `GameTools.LookGood()` for typical games.** Use `Chickensoft.Platform` directly when you need raw display metrics beyond what GameTools exposes.

---

## Installation

```xml
<!-- MyGame.csproj -->
<PackageReference Include="Chickensoft.Platform" Version="*-*" />
```

```sh
dotnet add package Chickensoft.Platform --prerelease
```

Requires .NET 8.0+ and Godot 4.5.1+.

---

## Core API

Only one entry point: the `Displays` singleton.

```csharp
using Chickensoft.Platform;

// Always pass the Window node — e.g. GetWindow()
Vector2 nativeRes = Displays.Singleton.GetNativeResolution(window);
float scale      = Displays.Singleton.GetDisplayScaleFactor(window);
```

| Method | Returns | Description |
|--------|---------|-------------|
| `GetNativeResolution(Window)` | `Vector2` | True physical pixel dimensions of the display |
| `GetDisplayScaleFactor(Window)` | `float` | Scale ratio between logical pixels and native pixels |

---

## Platform Internals

Each OS uses a different native mechanism. Knowing this helps diagnose edge cases.

| OS | Mechanism |
|----|-----------|
| Windows 10+ | Win32 P/Invoke — temporarily enables per-thread DPI awareness to read monitor native resolution and system scale |
| macOS | CoreGraphics via NSWindow handle — searches display modes to derive scale from native vs. logical resolution |
| Linux (Xorg) | `xrandr` + `/sys/class/drm` — matches Godot logical resolution to an output, reads native pixels from the device tree |
| Linux (Wayland) | Partial support — primary monitor only; multi-monitor DPI may be inaccurate |

---

## Usage Pattern

```csharp
public partial class BootstrapNode : Node {
    private float _scaleFactor;

    public override void _Ready() {
        var window = GetWindow();
        // Query once at startup and cache
        _scaleFactor = Displays.Singleton.GetDisplayScaleFactor(window);
        window.ContentScaleFactor = _scaleFactor;

        // Re-query when the window moves to a different monitor
        window.SizeChanged += OnWindowSizeChanged;
    }

    public override void _ExitTree() {
        GetWindow().SizeChanged -= OnWindowSizeChanged;
    }

    private void OnWindowSizeChanged() {
        var window = GetWindow();
        _scaleFactor = Displays.Singleton.GetDisplayScaleFactor(window);
        window.ContentScaleFactor = _scaleFactor;
    }
}
```

---

## Relationship with GameTools

`Chickensoft.GameTools` uses `Chickensoft.Platform` internally to implement `LookGood()` and `GetWindowScaleInfo()`.

| Use case | Recommended API |
|----------|-----------------|
| Standard game window scaling | `GetWindow().LookGood(...)` from **GameTools** — see `chickensoft-game-tools.md` |
| Raw scale factor or native resolution | `Displays.Singleton.GetDisplayScaleFactor(window)` from **Platform** |
| Custom scaling beyond GameTools defaults | Read `scaleInfo.NativeResolution` / `scaleInfo.SystemScale` from `GetWindowScaleInfo()` |

Do not add both packages for the same job — if GameTools is already in the project, calling `LookGood()` is always preferable.

---

## Best Practices

- **Call in `_Ready()`, not `_Process()`** — `GetDisplayScaleFactor` triggers native API calls; calling it every frame is expensive.
- **Cache the result** — store the value in a field and invalidate only on `Window.SizeChanged`.
- **Handle monitor moves** — subscribe to `Window.SizeChanged` and re-query; the DPI changes when the window crosses a monitor boundary.
- **Test at multiple DPI settings** — 100 %, 125 %, 150 %, 200 % on Windows; Retina vs. non-Retina on macOS.
- **Prefer GameTools** — add `Chickensoft.Platform` directly only when GameTools does not expose the display data you need.

---

## Anti-patterns

- **Querying every frame** — `GetDisplayScaleFactor` is a native system call; cache in `_Ready()` and update only on `SizeChanged`.
- **Hardcoding `ContentScaleFactor = 1.0f`** — ignores HiDPI displays; produces blurry rendering on Retina and 4K monitors.
- **Setting scale once and never updating** — if the user drags the window to a monitor with different DPI, the scale becomes wrong.
- **Adding Platform when GameTools is already a dependency** — redundant; GameTools calls Platform internally via `GetWindowScaleInfo()`.
- **Writing platform-conditional code yourself** — Platform abstracts OS differences; use `Displays.Singleton` uniformly instead of `#if WINDOWS` / `#elif OSX` preprocessor blocks.
