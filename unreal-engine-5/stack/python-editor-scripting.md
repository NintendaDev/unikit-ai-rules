---
version: 1.0.0
---

# Python Editor Scripting

> **Scope**: Python Editor Scripting plugin for UE5 — editor-only automation workflows, asset batch processing, actor manipulation, Blueprint type exposure via Python decorators, Editor Utility Widget authoring, and multi-mode script execution.
> **Load when**: writing Python editor tools, automating asset operations or imports, batch processing content browser assets, exposing Python-defined classes or structs to Blueprints, scripting editor menus, spawning or querying actors from Python, building Editor Utility Widgets backed by Python logic.

---

## Core Concepts

- Python runs **only inside the UE5 Editor** — not during PIE, Standalone, or cooked builds. Never use Python for gameplay logic.
- The entry point is the embedded Python 3 interpreter provided by the **PythonScriptPlugin**.
- The `unreal` module is the single root namespace for all Unreal bindings: classes, functions, enums, and structs.
- C++ method names are automatically converted to `snake_case` in Python (`MyFunction(int32 Num)` → `my_function(num=0)`).

## Setup

**Required plugins (enable both, restart editor):**
- `Python Editor Script Plugin` — core interpreter
- `Editor Scripting Utilities Plugin` — additional editor utilities

**Enable Developer Mode** (Edit → Editor Preferences → Plugins → Python → Developer Mode):
- Generates `{ProjectRoot}/Intermediate/PythonStub/unreal.py` with full type hints
- Regenerated on every editor launch; required for Pylance IntelliSense in VS Code

**VS Code workspace settings (keep relative for portability):**
```json
{
  "python.analysis.extraPaths": ["../../../Intermediate/PythonStub"],
  "python.defaultInterpreterPath": "../../../../../UE_5.x/Engine/Binaries/ThirdParty/Python3/Win64/python.exe"
}
```

**Third-party packages** install to UE's embedded interpreter:
```python
# init_unreal.py — install at startup
import subprocess, sys
def ensure_package(pkg):
    try: __import__(pkg)
    except ImportError: subprocess.check_call([sys.executable, "-m", "pip", "install", pkg])
ensure_package("numpy")
```

## API Patterns

**Hierarchy (highest priority first):**
1. **Subsystems** — modern, forward-facing
2. **Convenience functions** — Epic-provided shortcuts (`unreal.load_asset(path)`)
3. **Library classes** — UE4-era legacy (`EditorAssetLibrary`); use only when no subsystem exists

```python
# Prefer subsystems
asset_subsys = unreal.get_editor_subsystem(unreal.EditorAssetSubsystem)
actor_subsys  = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
level_subsys  = unreal.get_editor_subsystem(unreal.EditorLevelSubsystem)

# Convenience shortcut (acceptable)
mat = unreal.load_asset("/Game/Materials/M_Rock")

# Legacy — avoid when a subsystem alternative exists
# unreal.EditorAssetLibrary.load_asset(path)
```

**Logging:**
```python
unreal.log("message")
unreal.log_warning("message")
unreal.log_error("message")
```

**Runtime cast — use `isinstance`, not Python's `cast()`:**
```python
# WRONG: cast() is a type-hint no-op, does zero runtime checking
casted = cast(unreal.PointLight, actor)  # crashes if actor is wrong type

# CORRECT
if isinstance(actor, unreal.PointLight):
    color = actor.get_light_color()
```

## Patterns & Examples

**Asset import (batch):**
```python
tasks = []
for fbx in Path(r"D:\assets").glob("*.fbx"):
    task = unreal.AssetImportTask()
    task.filename = str(fbx)
    task.destination_path = "/Game/Geometry"
    task.automated = True  # suppress dialog
    tasks.append(task)
unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks(tasks)
```

**Actor query and spawn:**
```python
actor_subsys = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
lights = [a for a in actor_subsys.get_all_level_actors() if isinstance(a, unreal.PointLight)]

light = actor_subsys.spawn_actor_from_class(unreal.PointLight, unreal.Vector(0, 0, 100))
light.set_actor_label("MyLight")
light.set_editor_property("intensity", 1000.0)
```

**Undoable batch operation:**
```python
with unreal.ScopedEditorTransaction("Batch update materials"):
    for path in asset_paths:
        mat = unreal.load_asset(path)
        mat.set_editor_property("two_sided", True)
        unreal.EditorAssetLibrary.save_asset(mat)
```

**Non-blocking loop (Slate tick):**
```python
class AsyncProcessor:
    def __init__(self, items):
        self.items = items
        self.idx = 0

    def start(self):
        self.handle = unreal.register_slate_post_tick_callback(self.tick)

    def tick(self, dt):
        if self.idx >= len(self.items):
            unreal.unregister_slate_post_tick_callback(self.handle)
            return
        process(self.items[self.idx])
        self.idx += 1

AsyncProcessor(my_list).start()
```

**Progress dialog:**
```python
with unreal.ScopedSlowTask(len(items), "Processing...") as task:
    task.make_dialog(True)
    for item in items:
        if task.should_cancel():
            break
        process(item)
        task.enter_progress_frame(1)
```

**Expose Python types to Blueprints (must be in `init_unreal.py`):**
```python
@unreal.uclass()
class MyEditorTool(unreal.Object):
    @unreal.ufunction(static=True)
    def run_tool() -> str:
        return "done"

@unreal.ustruct()
class FMyData(unreal.StructBase):
    @unreal.uproperty()
    value: int = 0

@unreal.uenum()
class EMyMode(unreal.EnumBase):
    MODE_A = 0   # Unreal requires value 0 to exist
    MODE_B = 1
```

## Script Execution Modes

| Mode | How | Notes |
|------|-----|-------|
| **Startup** | `{Project}/Content/Python/init_unreal.py` | Auto-executed on editor launch; required for Blueprint-exposed types |
| **Editor console** | Output Log → `py <code>` | Quick one-liners |
| **Command line (with editor)** | `-ExecutePythonScript="path.py"` | Editor stays open |
| **Headless / CI** | `UnrealEditor-Cmd.exe ... -run=pythonscript -script="path.py"` | Editor closes on finish; logs to `Saved/Logs/` |
| **Remote Control REST** | POST to `{EditorIP}:30010` | Requires Remote Control Plugin; works from external processes |

## Best Practices

- Always wrap batch asset modifications in `ScopedEditorTransaction` so artists can undo.
- Always call `EditorAssetLibrary.save_asset()` after modifying an asset — unsaved changes are lost on editor close.
- Use `ScopedSlowTask` + `should_cancel()` for any loop that may take more than a second.
- Spread heavy loops across Slate tick frames to avoid freezing the editor UI.
- Place all Blueprint-exposed `@uclass` / `@ustruct` / `@uenum` definitions in (or imported by) `init_unreal.py` — they are invisible to Blueprints otherwise.
- Add full type hints to every function signature; Pylance depends on them for IntelliSense against the generated stub.
- Prefer subsystems over legacy `*Library` classes for new code.

## Anti-patterns

- **Python at runtime** — Python has no interpreter in PIE or cooked builds. Gameplay logic must live in C++ or Blueprints.
- **`cast()` for runtime dispatch** — Python's `typing.cast` is a type-hint-only no-op. Use `isinstance()` instead.
- **Blocking the main thread** — a `for i in range(10_000)` without tick callbacks freezes the editor. Use `register_slate_post_tick_callback`.
- **Missing `save_asset()` after modification** — changes are in-memory only until explicitly saved.
- **Missing transaction context** — batch modifications without `ScopedEditorTransaction` cannot be undone.
- **Blueprint types outside `init_unreal.py`** — `@uclass`/`@ustruct`/`@uenum` defined in ad-hoc scripts are not registered in Blueprints.
- **Wrong struct base** — use `unreal.StructBase`, not `unreal.Struct`.
- **Enum without value 0** — Unreal requires at least one enum member with value `0`; omitting it causes a registration error.