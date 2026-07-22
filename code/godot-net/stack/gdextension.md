---
version: 1.0.0
---

# GDExtension

> **Scope**: Authoring Godot 4 native extensions in C++ using godot-cpp — class declaration and registration, method and property binding, signal system, memory management, initialization lifecycle, error handling, build system setup, and `.gdextension` manifest configuration.
> **Load when**: building a GDExtension plugin in C++, authoring custom Godot classes with godot-cpp, registering methods or properties for GDScript or C# access, configuring the `.gdextension` manifest file, managing native memory in extensions, debugging extension initialization or registration failures, setting up a GDExtension project structure.

---

## Core Concepts

GDExtension is the official C API for extending Godot 4 with native libraries. Classes registered through GDExtension become first-class Godot objects — they appear in the editor, support signals, properties, scripting, and inheritance just like built-in classes.

Three components form every extension:
1. **Native library** — compiled C++ code (`.dll`, `.so`, `.dylib`, `.wasm`)
2. **`.gdextension` manifest** — maps platforms/build configurations to library paths and specifies the entry symbol
3. **Entry point function** — a `extern "C"` function that registers initializers and terminators

## Initialization Lifecycle

The entry point function must:
- Be declared with `extern "C"` linkage and `GDE_EXPORT` visibility
- Match the `entry_symbol` value in the `.gdextension` manifest
- Register one `initialize_*` function and one `uninitialize_*` function
- Set the minimum initialization level (almost always `MODULE_INITIALIZATION_LEVEL_SCENE`)

```cpp
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/godot.hpp>

using namespace godot;

void initialize_my_module(ModuleInitializationLevel p_level) {
    if (p_level != MODULE_INITIALIZATION_LEVEL_SCENE) {
        return;
    }
    GDREGISTER_CLASS(MyNode);
    GDREGISTER_CLASS(MyResource);
}

void uninitialize_my_module(ModuleInitializationLevel p_level) {
    if (p_level != MODULE_INITIALIZATION_LEVEL_SCENE) {
        return;
    }
    // Cleanup if needed
}

extern "C" {
GDExtensionBool GDE_EXPORT my_library_init(
    GDExtensionInterfaceGetProcAddress p_get_proc_address,
    GDExtensionClassLibraryPtr p_library,
    GDExtensionInitialization *r_initialization)
{
    GDExtensionBinding::InitObject init_obj(p_get_proc_address, p_library, r_initialization);
    init_obj.register_initializer(initialize_my_module);
    init_obj.register_terminator(uninitialize_my_module);
    init_obj.set_minimum_library_initialization_level(MODULE_INITIALIZATION_LEVEL_SCENE);
    return init_obj.init();
}
}
```

**Available initialization levels** (ordered):

| Level | When | Use for |
|-------|------|---------|
| `MODULE_INITIALIZATION_LEVEL_CORE` | Engine core starts | Fundamental types |
| `MODULE_INITIALIZATION_LEVEL_SERVERS` | Servers start | Rendering/physics integration |
| `MODULE_INITIALIZATION_LEVEL_SCENE` | Scene system starts | Custom nodes and resources (**default**) |
| `MODULE_INITIALIZATION_LEVEL_EDITOR` | Editor starts | Editor plugins and tools only |

## Class Declaration

Every custom class must:
- Inherit from a Godot base class (`Node`, `Node2D`, `Node3D`, `Control`, `RefCounted`, `Resource`, `Object`)
- Use the `GDCLASS(ClassName, ParentClass)` macro inside the class body
- Implement `static void _bind_methods()` in the `protected` section

```cpp
#include <godot_cpp/classes/node.hpp>
#include <godot_cpp/core/class_db.hpp>

using namespace godot;

class MyNode : public Node {
    GDCLASS(MyNode, Node);

private:
    float speed = 100.0f;

protected:
    static void _bind_methods();

public:
    MyNode();
    ~MyNode();

    void set_speed(float p_speed);
    float get_speed() const;

    void _ready() override;
    void _process(double p_delta) override;
};
```

**Choose the base class by purpose:**

| Base class | Use when |
|------------|----------|
| `Node` | Scene tree object with lifecycle hooks |
| `Node2D` / `Node3D` | Positioned node in 2D/3D space |
| `Control` | UI element |
| `RefCounted` | Utility/data object shared by reference (auto memory) |
| `Resource` | Serializable data (`.tres` files), auto reference-counted |
| `Object` | Raw base; avoid unless building editor internals |

## Class Registration

Register all custom classes inside `initialize_*` **after** checking the initialization level. Use the appropriate macro for each class type.

```cpp
void initialize_my_module(ModuleInitializationLevel p_level) {
    if (p_level != MODULE_INITIALIZATION_LEVEL_SCENE) {
        return;
    }
    GDREGISTER_CLASS(MyNode);              // Standard: editor + scripting
    GDREGISTER_VIRTUAL_CLASS(MyBase);      // Instantiable; subclasses override virtual methods
    GDREGISTER_ABSTRACT_CLASS(MyAbstract); // Not instantiable; has pure virtual methods
    GDREGISTER_INTERNAL_CLASS(MyHelper);   // Hidden from editor and scripting
}
```

Never register classes outside the initialization callback — Godot's type system is not ready.

## Method & Property Binding

All methods must be bound inside `_bind_methods()` to be accessible from GDScript, C#, or the editor.

```cpp
void MyNode::_bind_methods() {
    // Bind method with argument names for documentation
    ClassDB::bind_method(D_METHOD("set_speed", "speed"), &MyNode::set_speed);
    ClassDB::bind_method(D_METHOD("get_speed"), &MyNode::get_speed);

    // Expose as an inspectable property
    ADD_PROPERTY(
        PropertyInfo(Variant::FLOAT, "speed", PROPERTY_HINT_RANGE, "0,1000,1"),
        "set_speed",
        "get_speed"
    );

    // Declare a signal
    ADD_SIGNAL(MethodInfo("speed_changed",
        PropertyInfo(Variant::FLOAT, "new_speed")));

    // Bind a static method
    ClassDB::bind_static_method("MyNode", D_METHOD("create"), &MyNode::create);

    // Bind a virtual method (overridable from GDScript)
    GDVIRTUAL_BIND(_on_custom_event, "event_data");
}
```

Use `PROPERTY_HINT_*` constants to guide the editor inspector: `PROPERTY_HINT_RANGE`, `PROPERTY_HINT_ENUM`, `PROPERTY_HINT_FILE`, `PROPERTY_HINT_RESOURCE_TYPE`, etc.

## Signal Emission

```cpp
// Declare in _bind_methods:
ADD_SIGNAL(MethodInfo("health_changed", PropertyInfo(Variant::INT, "new_health")));

// Emit at runtime:
emit_signal("health_changed", new_health);
```

## Memory Management

Use Godot's memory macros — never use `new`/`delete` or STL allocators directly.

```cpp
#include <godot_cpp/core/memory.hpp>

// Allocate and free single objects (for non-RefCounted types)
MyClass *obj = memnew(MyClass);
memdelete(obj);

// Allocate and free arrays
int *arr = memnew_arr(int, 100);
memdelete_arr(arr);
```

For `RefCounted`-derived objects, always use `Ref<T>` — never `memnew` directly:

```cpp
// CORRECT: reference-counted smart pointer
Ref<MyResource> res;
res.instantiate();        // Creates a new instance
res->set_value(42);
// Automatic cleanup when Ref goes out of scope

// WRONG: manual allocation of a RefCounted type
MyResource *raw = memnew(MyResource); // Leaks unless you track it exactly
```

For `Node`-derived objects in the scene tree, call `queue_free()` to schedule deletion:

```cpp
node->queue_free();       // Safe deferred deletion during scene tree processing
// Never: memdelete(node) for a node that is in the scene tree
```

## Error Handling

Never use `try`/`catch` or `std::cout`. Use Godot's macros instead:

```cpp
// Abort method and return default value if condition fails
ERR_FAIL_COND_V(p_speed < 0, false);

// Abort and return if pointer is null
ERR_FAIL_NULL_V(p_node, Variant());

// Abort void method if condition fails
ERR_FAIL_COND(index >= size);

// Print a warning without aborting
WARN_PRINT("Speed clamped to maximum");

// Print once per session
WARN_PRINT_ONCE("Deprecated method called");

// Print an error
ERR_PRINT("Invalid state detected");
```

## .gdextension Manifest

Place the `.gdextension` file in the project's `res://` directory (or a subdirectory like `res://addons/my_plugin/`). Godot discovers all `.gdextension` files automatically on project load.

```ini
[configuration]
entry_symbol = "my_library_init"
compatibility_minimum = "4.1"
reloadable = true

[libraries]
; macOS
macos.debug = "res://bin/libmyext.macos.template_debug.framework"
macos.release = "res://bin/libmyext.macos.template_release.framework"

; Windows
windows.debug.x86_64 = "res://bin/libmyext.windows.template_debug.x86_64.dll"
windows.release.x86_64 = "res://bin/libmyext.windows.template_release.x86_64.dll"

; Linux
linux.debug.x86_64 = "res://bin/libmyext.linux.template_debug.x86_64.so"
linux.release.x86_64 = "res://bin/libmyext.linux.template_release.x86_64.so"
linux.debug.arm64 = "res://bin/libmyext.linux.template_debug.arm64.so"
linux.release.arm64 = "res://bin/libmyext.linux.template_release.arm64.so"

; Android
android.debug.arm64 = "res://bin/libmyext.android.template_debug.arm64.so"
android.release.arm64 = "res://bin/libmyext.android.template_release.arm64.so"

; iOS
ios.debug = "res://bin/libmyext.ios.template_debug.xcframework"
ios.release = "res://bin/libmyext.ios.template_release.xcframework"

; Web
web.debug.wasm32 = "res://bin/libmyext.web.template_debug.wasm32.wasm"
web.release.wasm32 = "res://bin/libmyext.web.template_release.wasm32.wasm"
```

Key fields:
- `entry_symbol` — must exactly match the exported C function name
- `compatibility_minimum` — minimum Godot version required to load this extension
- `reloadable = true` — allows hot-reload in the editor (disable for production builds or if causing instability)

## Build System Setup

Use SCons (godot-cpp's native build system) or CMake:

```python
# SConstruct (SCons)
env = SConscript("godot-cpp/SConstruct")
env.Append(CPPPATH=["src/"])
sources = Glob("src/*.cpp")
library = env.SharedLibrary("bin/libmyext{}{}".format(
    env["suffix"], env["SHLIBSUFFIX"]), source=sources)
Default(library)
```

Version pinning: the `godot-cpp` submodule branch **must** match the target Godot version (e.g., `4.4` branch for Godot 4.4). Extensions targeting an earlier version work in later minor releases; the reverse is not true.

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Class name | PascalCase | `MyCustomNode` |
| Method name | snake_case (GDScript-facing) | `get_speed`, `set_health` |
| Property name | snake_case | `move_speed`, `max_health` |
| Signal name | snake_case | `health_changed`, `target_reached` |
| Library filename | `lib<name>.<platform>.<build>.<arch>.<ext>` | `libmyext.windows.template_debug.x86_64.dll` |
| Entry function | snake_case with `_init` suffix | `my_library_init` |

## Anti-Patterns

**Memory:**
- Using `new`/`delete` instead of `memnew`/`memdelete` — bypasses Godot's memory tracking
- Using raw pointers for `RefCounted` objects — use `Ref<T>` to prevent leaks
- Calling `memdelete()` on a `Node` that is in the scene tree — call `queue_free()` instead

**Registration:**
- Forgetting to check the initialization level in `initialize_*` — causes double-registration or crashes at wrong level
- Registering classes outside the initialize callback — Godot's type system is not ready yet
- Not implementing `_bind_methods()` — methods and properties become inaccessible from scripting

**Entry point:**
- Missing `extern "C"` — name mangling prevents Godot from finding the symbol
- Missing `GDE_EXPORT` — symbol not exported from the dynamic library
- Entry symbol name mismatch between `.gdextension` and C++ — extension silently fails to load

**Standard library:**
- Using STL containers — use Godot's `Vector<T>`, `HashMap<K,V>`, `String`, `Array` instead
- Using `try`/`catch` — use `ERR_FAIL_COND*` macros
- Using `std::cout` — use `WARN_PRINT`, `ERR_PRINT`, or `UtilityFunctions::print()`

**Version:**
- Using a godot-cpp branch newer than the target Godot version — extension will not load
