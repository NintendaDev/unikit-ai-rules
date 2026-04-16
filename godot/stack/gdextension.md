---
version: 1.0.0
---

# GDExtension

> **Scope**: Patterns, conventions, and rules for building Godot 4 extensions in C++ using the GDExtension system and godot-cpp bindings — class registration, method binding, memory management, initialization lifecycle, and `.gdextension` file configuration.
> **Load when**: authoring a GDExtension in C++, registering custom C++ classes with Godot, binding methods or properties to GDScript, managing memory in native extensions, configuring the `.gdextension` file, debugging native library load failures, choosing a base class for a C++ extension.

---

## Core Concepts

GDExtension is the Godot 4 native extension system (replaces GDNative from Godot 3). It compiles a shared library that Godot loads at runtime; classes registered through it are **indistinguishable from built-in engine classes** in GDScript, the Inspector, and the editor.

- Use **godot-cpp** for C++ bindings (the idiomatic choice). Pure C via `gdextension_interface.h` is possible but rarely needed.
- GDNative plugins from Godot 3 **do not** work in Godot 4 and must be rewritten.
- A GDExtension targeting Godot 4.X works in any later 4.Y ≥ X, but **not** in an older 4.Y < X.

---

## Project Structure

```
my_extension/
├── SConstruct               # or CMakeLists.txt
├── godot-cpp/               # submodule
├── src/
│   ├── register_types.h
│   ├── register_types.cpp
│   ├── my_node.h
│   └── my_node.cpp
└── project/                 # Godot project folder
    ├── bin/
    │   └── libmy_extension.windows.template_debug.x86_64.dll
    └── my_extension.gdextension
```

---

## `.gdextension` File Format

Place one `.gdextension` file inside the Godot project folder. It tells Godot where to find the compiled library and which function to call first.

```ini
[configuration]
entry_symbol = "my_extension_init"
compatibility_minimum = "4.1"
reloadable = true

[libraries]
; Windows
windows.debug.x86_64   = "res://bin/libmy_extension.windows.template_debug.x86_64.dll"
windows.release.x86_64 = "res://bin/libmy_extension.windows.template_release.x86_64.dll"

; Linux
linux.debug.x86_64   = "res://bin/libmy_extension.linux.template_debug.x86_64.so"
linux.release.x86_64 = "res://bin/libmy_extension.linux.template_release.x86_64.so"
linux.debug.arm64    = "res://bin/libmy_extension.linux.template_debug.arm64.so"
linux.release.arm64  = "res://bin/libmy_extension.linux.template_release.arm64.so"

; macOS (framework bundle)
macos.debug   = "res://bin/libmy_extension.macos.template_debug.framework"
macos.release = "res://bin/libmy_extension.macos.template_release.framework"

; Android
android.debug.arm64   = "res://bin/libmy_extension.android.template_debug.arm64.so"
android.release.arm64 = "res://bin/libmy_extension.android.template_release.arm64.so"

; Web
web.debug.wasm32   = "res://bin/libmy_extension.web.template_debug.wasm32.wasm"
web.release.wasm32 = "res://bin/libmy_extension.web.template_release.wasm32.wasm"
```

- `entry_symbol` must match the C++ function name **exactly** (case-sensitive).
- Set `compatibility_minimum` to the oldest Godot version the extension supports.
- `reloadable = true` enables hot-reload in the editor (requires the extension to support it).

---

## Module Initialization

### Entry point (register_types.cpp)

```cpp
#include "register_types.h"
#include <godot_cpp/core/class_db.hpp>
#include <gdextension_interface.h>
#include <godot_cpp/core/defs.hpp>
#include <godot_cpp/godot.hpp>

#include "my_node.h"

using namespace godot;

void initialize_my_extension(ModuleInitializationLevel p_level) {
    if (p_level != MODULE_INITIALIZATION_LEVEL_SCENE) return;

    GDREGISTER_CLASS(MyNode);
    // Register additional classes here
}

void uninitialize_my_extension(ModuleInitializationLevel p_level) {
    if (p_level != MODULE_INITIALIZATION_LEVEL_SCENE) return;
    // Perform cleanup if needed
}

extern "C" {
GDExtensionBool GDE_EXPORT my_extension_init(
        GDExtensionInterfaceGetProcAddress p_get_proc_address,
        const GDExtensionClassLibraryPtr p_library,
        GDExtensionInitialization *r_initialization) {

    godot::GDExtensionBinding::InitObject init_obj(p_get_proc_address, p_library, r_initialization);
    init_obj.register_initializer(initialize_my_extension);
    init_obj.register_terminator(uninitialize_my_extension);
    init_obj.set_minimum_library_initialization_level(MODULE_INITIALIZATION_LEVEL_SCENE);
    return init_obj.init();
}
}
```

### Initialization levels

| Level | When to use |
|-------|-------------|
| `MODULE_INITIALIZATION_LEVEL_CORE` | Lowest-level hooks; requires editor restart |
| `MODULE_INITIALIZATION_LEVEL_SERVERS` | Custom server or rendering backend |
| `MODULE_INITIALIZATION_LEVEL_SCENE` | **Default for most extensions** — custom nodes, resources |
| `MODULE_INITIALIZATION_LEVEL_EDITOR` | Editor plugins and tools only |

Use `MODULE_INITIALIZATION_LEVEL_SCENE` unless you have a specific reason to go lower.

---

## Class Definition

### Header (my_node.h)

```cpp
#pragma once

#include <godot_cpp/classes/node.hpp>

using namespace godot;

class MyNode : public Node {
    GDCLASS(MyNode, Node)   // Required — wires up type info and binding

private:
    int speed = 100;

protected:
    static void _bind_methods();  // Required — expose to GDScript/editor

public:
    MyNode();
    ~MyNode();

    void set_speed(int p_speed);
    int get_speed() const;

    void do_something();
};
```

### Source (my_node.cpp)

```cpp
#include "my_node.h"
#include <godot_cpp/core/class_db.hpp>

using namespace godot;

void MyNode::_bind_methods() {
    // Bind methods
    ClassDB::bind_method(D_METHOD("do_something"), &MyNode::do_something);
    ClassDB::bind_method(D_METHOD("set_speed", "speed"), &MyNode::set_speed);
    ClassDB::bind_method(D_METHOD("get_speed"), &MyNode::get_speed);

    // Register property — getter/setter must be bound first
    ADD_PROPERTY(PropertyInfo(Variant::INT, "speed", PROPERTY_HINT_RANGE, "0,1000,1"),
                 "set_speed", "get_speed");
}

MyNode::MyNode() {}
MyNode::~MyNode() {}

void MyNode::set_speed(int p_speed) { speed = p_speed; }
int MyNode::get_speed() const { return speed; }
void MyNode::do_something() { /* ... */ }
```

---

## Registration Macros

| Macro | Use |
|-------|-----|
| `GDREGISTER_CLASS(T)` | Standard class — appears in Create dialog, scriptable |
| `GDREGISTER_VIRTUAL_CLASS(T)` | Has virtual methods; can be instantiated |
| `GDREGISTER_ABSTRACT_CLASS(T)` | Has pure virtual methods; cannot be instantiated |
| `GDREGISTER_INTERNAL_CLASS(T)` | Not exposed to editor/GDScript; internal use only |
| `GDREGISTER_RUNTIME_CLASS(T)` | Can be registered/unregistered at runtime |

---

## Method Binding

```cpp
// Simple method
ClassDB::bind_method(D_METHOD("do_something"), &MyNode::do_something);

// Method with named arguments (names appear in GDScript autocomplete/docs)
ClassDB::bind_method(D_METHOD("set_speed", "speed"), &MyNode::set_speed);

// Method with default argument values
ClassDB::bind_method(D_METHOD("compute", "a", "b"), &MyNode::compute, DEFVAL(0), DEFVAL(100));

// Static method
ClassDB::bind_static_method("MyNode", D_METHOD("helper", "value"), &MyNode::helper);
```

Always use `D_METHOD` — it registers argument names for GDScript documentation and the editor.

---

## Property Binding

```cpp
void MyNode::_bind_methods() {
    ClassDB::bind_method(D_METHOD("get_health"), &MyNode::get_health);
    ClassDB::bind_method(D_METHOD("set_health", "health"), &MyNode::set_health);

    // Group related properties in Inspector
    ADD_GROUP("Combat", "combat_");

    ADD_PROPERTY(
        PropertyInfo(Variant::INT, "combat_health", PROPERTY_HINT_RANGE, "0,100,1"),
        "set_health",
        "get_health"
    );
}
```

- Getter must be `const`.
- Property name in `PropertyInfo` must match the string used in `ADD_PROPERTY`.
- Group prefix is prepended to property names shown in the Inspector.

---

## Signal Binding

```cpp
void MyNode::_bind_methods() {
    ADD_SIGNAL(MethodInfo("health_changed",
        PropertyInfo(Variant::INT, "old_health"),
        PropertyInfo(Variant::INT, "new_health")));

    ADD_SIGNAL(MethodInfo("died"));  // No arguments
}

// Emitting
void MyNode::take_damage(int amount) {
    int old = health;
    health -= amount;
    emit_signal("health_changed", old, health);
    if (health <= 0) emit_signal("died");
}
```

---

## Base Class Selection

| Base class | Memory model | Use when |
|------------|-------------|----------|
| `Object` | Manual (`memdelete`) | Raw objects not placed in scene |
| `RefCounted` | Automatic (`Ref<T>`) | Utility objects, shared data |
| `Resource` | Automatic (`Ref<T>`) | Saveable data, Inspector-serializable |
| `Node` | Manual (`queue_free`) | Scene-tree objects |
| `Node2D` | Manual (`queue_free`) | 2D positioned scene objects |
| `Node3D` | Manual (`queue_free`) | 3D positioned scene objects |
| `Control` | Manual (`queue_free`) | UI elements |

---

## Memory Management

Use Godot's allocation macros — **never** use raw `new` / `delete`.

```cpp
// Nodes and Object-derived classes — manual lifecycle
MyNode *node = memnew(MyNode);
node->queue_free();   // Deferred, safe from within callbacks
// or:
memdelete(node);      // Immediate — only when safe

// RefCounted-derived — automatic via Ref<T>
Ref<MyResource> res;
res.instantiate();    // Creates and sets reference
res->set_id(42);
// Automatically freed when last Ref<> goes out of scope

// Check before use
if (res.is_valid()) { ... }

// Arrays (rare — prefer Vector<T> or Array)
int *buf = memnew_arr(int, 64);
memdelete_arr(buf);
```

- Never hold a raw pointer to a `RefCounted` object — always use `Ref<T>`.
- Never call `memdelete` on a `RefCounted` object — let `Ref<T>` handle it.
- Call `queue_free()` on `Node`-derived objects inside Godot callbacks; call `memdelete` only when you are certain the tree is not involved.

---

## Error Handling

```cpp
// Abort method with return value if condition is true
ERR_FAIL_COND_V_MSG(health < 0, false, "Health must be non-negative.");

// Abort void method if condition is true
ERR_FAIL_COND_MSG(ptr == nullptr, "Pointer is null.");

// Abort if pointer is null (with return value)
ERR_FAIL_NULL_V_MSG(ptr, default_val, "Unexpected null pointer.");

// Non-fatal warnings
WARN_PRINT("Something unexpected happened.");
WARN_PRINT_ONCE("This prints once per session.");

// Non-fatal error (logs but doesn't crash)
ERR_PRINT("Critical problem encountered.");
```

---

## Patterns & Examples

### Inspector-ready Resource

```cpp
class CharacterData : public Resource {
    GDCLASS(CharacterData, Resource)

private:
    String name;
    int max_health = 100;

protected:
    static void _bind_methods() {
        ClassDB::bind_method(D_METHOD("get_name"), &CharacterData::get_name);
        ClassDB::bind_method(D_METHOD("set_name", "name"), &CharacterData::set_name);
        ClassDB::bind_method(D_METHOD("get_max_health"), &CharacterData::get_max_health);
        ClassDB::bind_method(D_METHOD("set_max_health", "max_health"), &CharacterData::set_max_health);

        ADD_PROPERTY(PropertyInfo(Variant::STRING, "name"), "set_name", "get_name");
        ADD_PROPERTY(PropertyInfo(Variant::INT, "max_health", PROPERTY_HINT_RANGE, "1,9999,1"),
                     "set_max_health", "get_max_health");
    }

public:
    String get_name() const { return name; }
    void set_name(const String &p_name) { name = p_name; }
    int get_max_health() const { return max_health; }
    void set_max_health(int p_val) { max_health = p_val; }
};
```

### Autoload singleton via GDExtension

Register as a normal class, then add it as an AutoLoad in Project Settings — GDExtension classes are visible in the AutoLoad dialog after registration.

---

## Versioning & Compatibility

- Set `compatibility_minimum` in `.gdextension` to the **oldest** engine version the plugin supports.
- A plugin built against Godot 4.3 works in 4.4 and later, but **not** in 4.2.
- When the engine updates its GDExtension ABI (across major minor releases), you may need to recompile.
- Enable `reloadable = true` only when the extension fully supports hot-reload (all object state must survive reload).

---

## Anti-patterns

- **Using `new`/`delete` instead of `memnew`/`memdelete`** — bypasses Godot's memory tracker; causes silent leaks and debug-mode crashes.
- **Storing raw `Object*` pointers long-term** — the object may be freed by GDScript while you hold the pointer. Use `ObjectID` + `ObjectDB::get_instance()` for weak references.
- **Holding a raw pointer to `RefCounted`** — ref count never reaches zero; object leaks. Always use `Ref<T>`.
- **Forgetting `GDREGISTER_CLASS`** — the class exists in C++ but is invisible to GDScript and the editor.
- **Forgetting `ClassDB::bind_method`** — the method is unreachable from GDScript even though the class is registered.
- **`entry_symbol` mismatch** — if the string in `.gdextension` and the C++ export function name differ, Godot fails to load the library with a cryptic error.
- **Using the wrong initialization level** — registering editor-only classes at `SCENE` level causes them to be registered in exported builds; registering scene classes at `CORE` level can cause crashes because the scene system is not ready yet.
- **Double-precision mismatch** — if Godot is compiled with `precision=double`, extensions must also be compiled with double-precision; mixing causes crashes.
- **Not implementing `_bind_methods`** — the compiler requires it via `GDCLASS`; omitting the definition causes a linker error.
