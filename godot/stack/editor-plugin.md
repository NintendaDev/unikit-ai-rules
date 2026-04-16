---
version: 1.0.0
---

# EditorPlugin & EditorScript

> **Scope**: Godot 4 editor extension authoring — EditorPlugin lifecycle, plugin structure, adding docks/controls/menu items, custom types, autoload registration, inspector plugins, main screen plugins, and EditorScript for one-off editor tasks.
> **Load when**: authoring an editor plugin, extending the Godot editor UI, adding custom docks or toolbar controls, registering custom node types, creating inspector plugins, writing EditorScript one-off tools, using @tool scripts, accessing EditorInterface, debugging editor-only code.

---

## Plugin Structure

Every plugin lives under `addons/` and requires exactly two files at minimum:

```
addons/my_plugin/
├── plugin.cfg          # Required: plugin metadata
└── plugin.gd           # Required: EditorPlugin implementation
```

`plugin.cfg` is an INI file with required fields:

```ini
[plugin]
name = "My Plugin"
description = "What it does"
author = "Author Name"
version = "1.0.0"
script = "plugin.gd"
```

The main plugin script must always start with:

```gdscript
@tool
extends EditorPlugin
```

The `@tool` annotation is mandatory. Without it the script will not load in the editor.

---

## Lifecycle Methods

| Method | Trigger | Use for |
|--------|---------|---------|
| `_enter_tree()` | Plugin node added to scene tree | Register docks, custom types, inspector plugins, tool menus |
| `_exit_tree()` | Plugin node removed from scene tree | **Reverse every registration** from `_enter_tree()`, free UI nodes |
| `_enable_plugin()` | User enables plugin in Project Settings | Register autoload singletons |
| `_disable_plugin()` | User disables plugin in Project Settings | Unregister autoload singletons |

**Rule: every `add_*` call in `_enter_tree()` must have a matching `remove_*` call in `_exit_tree()`.**

---

## Registering and Cleaning Up Components

### Docks

Store a reference to clean up later:

```gdscript
var _dock: Control

func _enter_tree():
    _dock = preload("res://addons/my_plugin/dock.tscn").instantiate()
    add_control_to_dock(DOCK_SLOT_LEFT_UL, _dock)

func _exit_tree():
    remove_control_from_docks(_dock)
    _dock.queue_free()
```

Dock slot constants: `DOCK_SLOT_LEFT_UL`, `DOCK_SLOT_LEFT_BL`, `DOCK_SLOT_LEFT_UR`, `DOCK_SLOT_LEFT_BR`, `DOCK_SLOT_RIGHT_UL`, `DOCK_SLOT_RIGHT_BL`, `DOCK_SLOT_RIGHT_UR`, `DOCK_SLOT_RIGHT_BR`.

### Toolbar Buttons

```gdscript
var _button: Button

func _enter_tree():
    _button = Button.new()
    _button.text = "My Tool"
    _button.pressed.connect(_on_button_pressed)
    add_control_to_container(CONTAINER_TOOLBAR, _button)

func _exit_tree():
    remove_control_from_container(CONTAINER_TOOLBAR, _button)
    _button.queue_free()
```

### Tool Menu Items

```gdscript
func _enter_tree():
    add_tool_menu_item("My Plugin/Do Something", _on_menu_pressed)

func _exit_tree():
    remove_tool_menu_item("My Plugin/Do Something")
```

### Custom Node Types

Register nodes that appear in the "Create New Node" dialog:

```gdscript
func _enter_tree():
    add_custom_type("MyNode", "Node",
        preload("res://addons/my_plugin/my_node.gd"),
        preload("res://addons/my_plugin/icon.svg"))

func _exit_tree():
    remove_custom_type("MyNode")
```

Icon should be 16×16 pixels for editor display.

### Inspector Plugins

```gdscript
var _inspector_plugin: EditorInspectorPlugin

func _enter_tree():
    _inspector_plugin = preload("res://addons/my_plugin/my_inspector_plugin.gd").new()
    add_inspector_plugin(_inspector_plugin)

func _exit_tree():
    remove_inspector_plugin(_inspector_plugin)
```

### Autoload Singletons

Use `_enable_plugin()` / `_disable_plugin()` — **never** `_enter_tree()` / `_exit_tree()`:

```gdscript
const AUTOLOAD_NAME = "MyAutoload"  # PascalCase, per GDScript style guide

func _enable_plugin():
    add_autoload_singleton(AUTOLOAD_NAME, "res://addons/my_plugin/my_autoload.gd")

func _disable_plugin():
    remove_autoload_singleton(AUTOLOAD_NAME)
```

---

## Main Screen Plugins

To add a tab alongside 2D / 3D / Script / AssetLib:

```gdscript
const MainPanel = preload("res://addons/my_plugin/main_panel.tscn")
var _main_panel: Control

func _enter_tree():
    _main_panel = MainPanel.instantiate()
    EditorInterface.get_editor_main_screen().add_child(_main_panel)
    _make_visible(false)  # Always hide immediately after adding

func _exit_tree():
    if _main_panel:
        _main_panel.queue_free()

func _has_main_screen() -> bool:
    return true

func _make_visible(visible: bool) -> void:
    if _main_panel:
        _main_panel.visible = visible

func _get_plugin_name() -> String:
    return "My Plugin"

func _get_plugin_icon() -> Texture2D:
    return EditorInterface.get_editor_theme().get_icon("Node", "EditorIcons")
```

Always hide the panel immediately after `add_child()` — the editor calls `_make_visible()` itself when the tab is activated.

---

## EditorInspectorPlugin

Used to replace or add custom UI for specific property types in the Inspector:

```gdscript
# my_inspector_plugin.gd
@tool
extends EditorInspectorPlugin

func _can_handle(object: Object) -> bool:
    return object is MyCustomNode  # narrow to specific type

func _parse_begin(object: Object) -> void:
    var label := Label.new()
    label.text = "== Custom Info =="
    add_custom_control(label)

func _parse_property(object: Object, type: Variant.Type, name: String,
        hint_type: PropertyHint, hint_string: String,
        usage_flags: PropertyUsageFlags, wide: bool) -> bool:
    if type == TYPE_INT and name == "my_int_prop":
        add_property_editor(name, MyIntEditor.new())
        return true  # suppress default editor
    return false
```

Return `true` from `_parse_property()` to replace the default editor for that property; return `false` to keep it.

---

## EditorInterface

Access the singleton inside an EditorPlugin with `EditorInterface` (Godot 4.1+) — no need to call `get_editor_interface()`:

```gdscript
# Scene manipulation
var root = EditorInterface.get_edited_scene_root()
EditorInterface.open_scene_from_path("res://scenes/level.tscn")
EditorInterface.mark_scene_as_unsaved()

# Selection
var sel = EditorInterface.get_selection()
var nodes: Array[Node] = sel.get_selected_nodes()

# Filesystem
var fs = EditorInterface.get_resource_filesystem()
fs.scan()

# Settings
var settings = EditorInterface.get_editor_settings()
```

`EditorInterface` is only available in `@tool` context and editor builds. Never call it from non-tool scripts or at runtime.

---

## EditorScript — One-off Editor Tasks

Use `EditorScript` for temporary scripts that run once without persistent registration:

```gdscript
@tool
extends EditorScript

func _run() -> void:
    # Run via File → Run in Script Editor (Ctrl+Shift+X)
    var root := get_scene()  # shorthand for EditorInterface.get_edited_scene_root()
    print("Scene root: ", root.name)
```

Key differences from `EditorPlugin`:

| | EditorPlugin | EditorScript |
|---|---|---|
| Lifecycle | Persistent, managed by editor | Runs once on demand |
| Registration | Requires `plugin.cfg` | Just `@tool extends EditorScript` |
| Access | Full `EditorInterface` API | `get_scene()` + `EditorInterface` singleton |
| Use case | Docks, custom types, tools | One-time data migrations, bulk edits, prototyping |

`get_scene()` is a convenience method equivalent to `EditorInterface.get_edited_scene_root()`.

---

## @tool Scripts (Non-plugin)

Scripts with `@tool` run in the editor without being a plugin. Use `Engine.is_editor_hint()` to branch:

```gdscript
@tool
extends Node

@export var radius: float = 1.0:
    set(value):
        radius = value
        queue_redraw()  # safe: no child access needed here

func _ready() -> void:
    if Engine.is_editor_hint():
        # editor-only setup
        set_notify_transform(true)
    else:
        # runtime-only setup
        _init_gameplay()
```

**Important:** export setters may fire before `_ready()` during editor load — never access child nodes inside setters without a null check or `Engine.is_editor_hint()` guard.

---

## Node Ownership in Editor

When instantiating nodes inside the editor (via plugin or `@tool`), set `owner` so they appear in the Scene panel and persist when saving:

```gdscript
var new_node := Node.new()
new_node.name = "Generated"
get_tree().edited_scene_root.add_child(new_node)
new_node.owner = get_tree().edited_scene_root
```

Without setting `owner`, the node is invisible in the Scene panel and will not be saved.

---

## Anti-patterns

- **Skipping `_exit_tree()` cleanup** — orphaned UI elements, memory leaks, potential editor crashes.
- **Autoloads in `_enter_tree()`** — use `_enable_plugin()` instead; `_enter_tree()` fires on every editor startup even when the plugin is disabled.
- **Forgetting `queue_free()`** — always call `queue_free()` on added controls after removing them from the editor.
- **Accessing child nodes in export setters** — setters fire before `_ready()`, so children may not exist yet.
- **Calling `EditorInterface` in non-tool or runtime code** — it does not exist in exported builds.
- **Not storing dock/control references** — you cannot remove a control you no longer have a reference to.
- **Missing `@tool` on the plugin script** — the script will not load and the plugin will appear broken.
- **Using `EditorPlugin.new().get_editor_interface()` outside plugin context** — instantiating EditorPlugin directly does not wire it into the editor; always work from within the registered plugin instance.
