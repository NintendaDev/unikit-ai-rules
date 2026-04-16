---
version: 1.0.0
---

# EditorPlugin & EditorScript

> **Scope**: Godot 4 editor extension authoring — creating persistent editor plugins with custom docks, inspector overrides, and custom node types via `EditorPlugin`, and running one-off editor automation scripts via `EditorScript`.
> **Load when**: authoring an editor plugin or addon, adding custom docks or toolbars, writing a custom inspector, registering custom node types via `AddCustomType`, running batch scene operations from the editor, using `EditorScript` for one-off editor automation.

---

## Plugin File Structure

Every addon requires a `plugin.cfg` alongside the entry C# class inside `addons/<plugin_name>/`:

```
addons/
  my_plugin/
    plugin.cfg
    MyPlugin.cs        ← entry class (the EditorPlugin subclass)
    SomeDock.cs        ← optional sub-classes
    icon.png           ← optional 16×16 custom node icon
```

`plugin.cfg` (INI format, all keys required):

```ini
[plugin]

name="My Plugin"
description="Short description."
author="Your Name"
version="1.0"
script="MyPlugin.cs"
```

---

## EditorPlugin — Lifecycle

Always wrap the entire file in `#if TOOLS` to prevent editor code from leaking into game builds:

```csharp
#if TOOLS
using Godot;

[Tool]
public partial class MyPlugin : EditorPlugin
{
    private MyInspectorPlugin _inspector;
    private Control _dock;

    public override void _EnterTree()
    {
        // Register everything here.
        _inspector = new MyInspectorPlugin();
        AddInspectorPlugin(_inspector);

        _dock = GD.Load<PackedScene>("res://addons/my_plugin/MyDock.tscn").Instantiate<Control>();
        AddControlToDock(DockSlot.LeftUl, _dock);
    }

    public override void _ExitTree()
    {
        // Remove and free everything registered in _EnterTree.
        RemoveInspectorPlugin(_inspector);
        RemoveControlFromDocks(_dock);
        _dock.QueueFree();
    }
}
#endif
```

Rules:
- `_EnterTree()` — all registration (add docks, inspector plugins, custom types, menu items).
- `_ExitTree()` — **must** mirror `_EnterTree()` exactly; call both `Remove*` **and** `QueueFree()` for any `Control` nodes created by the plugin.
- Both methods are always guarded by `#if TOOLS` — never guard individual lines inside them.

---

## EditorPlugin — Registration APIs

| What to register | Add | Remove |
|-----------------|-----|--------|
| Custom inspector plugin | `AddInspectorPlugin(plugin)` | `RemoveInspectorPlugin(plugin)` |
| Custom dock panel | `AddControlToDock(slot, control)` | `RemoveControlFromDocks(control)` + `QueueFree()` |
| Custom node type | `AddCustomType(name, base, script, icon)` | `RemoveCustomType(name)` |
| Tool menu item | `AddToolMenuItem(name, callable)` | `RemoveToolMenuItem(name)` |
| Bottom panel | `AddControlToBottomPanel(control, title)` | `RemoveControlFromBottomPanel(control)` + `QueueFree()` |
| Container control | `AddControlToContainer(container, control)` | `RemoveControlFromContainer(container, control)` + `QueueFree()` |

---

## EditorInspectorPlugin — Custom Inspector

`EditorInspectorPlugin` is a sub-plugin registered through `EditorPlugin`. It intercepts property rendering for specific types.

```csharp
#if TOOLS
using Godot;

[Tool]
public partial class MyInspectorPlugin : EditorInspectorPlugin
{
    // Called for every object opened in the inspector.
    // Return true only for types this plugin handles.
    public override bool _CanHandle(GodotObject @object)
        => @object is MyResource;

    // Called before property rows are rendered. Add controls here.
    public override void _ParseBegin(GodotObject @object)
    {
        var button = new Button { Text = "Do Something" };
        button.Pressed += () => GD.Print("Clicked");
        AddCustomControl(button);
    }

    // Called for each property. Return true to suppress the default editor.
    public override bool _ParseProperty(
        GodotObject @object, Variant.Type type, string name,
        PropertyHint hintType, string hintString, PropertyUsageFlags usageFlags, bool wide)
    {
        if (name == "my_special_property")
        {
            // Add a replacement editor control.
            AddPropertyEditor(name, new MyCustomPropertyEditor());
            return true; // suppress default editor for this property
        }
        return false;
    }
}
#endif
```

Rules:
- Always mark sub-plugin classes with `[Tool]` and `#if TOOLS`. Without `[Tool]`, the plugin cannot cast to the sub-type at runtime.
- `_CanHandle()` should be as narrow as possible — return `false` for everything the plugin doesn't own.
- `_ParseProperty()` returning `true` suppresses Godot's default editor for that property; returning `false` keeps the default.

---

## EditorScript — One-Off Automation

`EditorScript` is for one-shot scripts run directly from the editor — batch operations, scene migrations, data validation — without setting up a full addon.

```csharp
using Godot;

[Tool]
public partial class FixNodeNames : EditorScript
{
    public override void _Run()
    {
        var scene = GetScene();
        if (scene == null)
        {
            GD.PrintErr("No scene is open.");
            return;
        }

        foreach (Node child in scene.GetChildren())
        {
            // Example: strip trailing spaces from node names.
            child.Name = child.Name.ToString().Trim();
        }

        GD.Print("Done.");
    }
}
```

Key APIs inside `_Run()`:

| Method | Returns | Purpose |
|--------|---------|---------|
| `GetScene()` | `Node` | The root of the currently edited scene. |
| `GetEditorInterface()` | `EditorInterface` | Full editor interface singleton. |
| `EditorInterface.GetEditedSceneRoot()` | `Node` | Same as `GetScene()` but available globally. |
| `EditorInterface.GetResourceFilesystem()` | `EditorFileSystem` | Access the project file system. |
| `EditorInterface.SaveScene()` | `void` | Save the currently edited scene. |

Rules:
- Always check `GetScene() != null` before operating on the scene — the script may be run with no scene open.
- Do not add UI or persistent state in `EditorScript`; use `EditorPlugin` for that.
- Call `EditorInterface.SaveScene()` explicitly if the script modifies scene nodes and you want changes persisted.

---

## EditorPlugin vs EditorScript — When to Use Which

| Criterion | EditorPlugin | EditorScript |
|-----------|-------------|--------------|
| Needs to persist across editor sessions | Yes | No |
| Adds UI (dock, toolbar, inspector override) | Yes | No |
| One-time batch operation or migration | No | Yes |
| Requires `plugin.cfg` and `addons/` folder | Yes | No |
| C# external IDE compatibility | Full | Limited (see pitfalls) |

---

## Anti-patterns

- **Missing `#if TOOLS` guard** — `EditorPlugin` code compiled into game builds causes export errors and runtime failures.
- **Missing `[Tool]` on sub-types** — any C# class instantiated by an `EditorPlugin` (inspector plugins, dock controllers) must also carry `[Tool]`; otherwise the engine cannot cast to it and returns `null`.
- **Skipping `QueueFree()` in `_ExitTree()`** — nodes added to the editor tree are not freed automatically; always call `QueueFree()` after removing them with `Remove*`.
- **Blocking calls in editor code** — `Thread.Sleep`, `OS.DelayUsec`, or long synchronous loops freeze the entire editor UI; use deferred calls or threads for slow operations.
- **Running `EditorScript` with an external IDE active** — when Dotnet External Editor is set in editor settings, `_Run()` may silently fail. Run from the FileSystem dock right-click menu as a workaround.
- **Calling `_Run()` more than once from the script editor** — C# `EditorScript` can only be executed once per session from Ctrl+Shift+X due to a known engine limitation; re-trigger from FileSystem dock instead.
- **Using `AddCustomType()` without a matching icon** — passing `null` as the icon causes an error on some Godot 4 versions; always provide a `Texture2D` (even a 1×1 placeholder).
