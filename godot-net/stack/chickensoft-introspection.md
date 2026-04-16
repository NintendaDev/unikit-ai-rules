---
version: 1.0.0
---

# Chickensoft Introspection

> **Scope**: Build-time type metadata generation for AOT-compatible reflection in Godot 4 C# — `[Meta]`, `[Id]`, `[Version]`, `[Mixin]` attributes, type registry, type graph queries, and the mixin system.
> **Load when**: annotating types with `[Meta]` or `[Id]`, querying type hierarchies via `Types.Graph`, designing versioned serializable types, implementing custom mixins, integrating with LogicBlocks or Serialization packages, configuring the source generator in `.csproj`.

---

## Core Concepts

**Introspective type** — a `partial` class, record, struct, or record struct decorated with `[Meta]`. The source generator produces a type registry and rich metadata at build time, replacing C# runtime reflection.

**Type Registry** — auto-generated per assembly. Lists every discoverable type and registers them via module initializers. No manual registration required.

**Type Graph** (`Types.Graph`) — runtime query cache built from the registry. Provides O(1) lookups for metadata, properties, and type hierarchies.

**Identifiable type** — an introspective type that also carries `[Id("stable_string")]`. Used as a type discriminator in serialization and for stable lookup regardless of class renames.

**Versioned type** — a concrete subtype with `[Version(n)]` (integer). Used to support multiple concurrent versions of the same identifiable base type. Default version is `1` when `[Version]` is omitted.

**Mixin** — an interface decorated with `[Mixin]` that gets wired into a type's metadata at build time. Enables cross-cutting behavior with per-instance state storage via `MixinState`.

---

## Setup

### `.csproj` configuration

```xml
<PropertyGroup>
  <TargetFramework>net8.0</TargetFramework>
  <!-- Treat compiler version mismatch as a hard error -->
  <WarningsAsErrors>CS9057</WarningsAsErrors>
</PropertyGroup>

<ItemGroup>
  <!-- Runtime library -->
  <PackageReference Include="Chickensoft.Introspection" Version="*" />
  <!-- Source generator — analyzer only, must NOT leak into consumers -->
  <PackageReference Include="Chickensoft.Introspection.Generator"
    Version="*" PrivateAssets="all" OutputItemType="analyzer" />
</ItemGroup>
```

**Always** set `PrivateAssets="all"` on the generator package — it must not become a transitive dependency of projects that consume your library.

---

## Attributes

### `[Meta]`

Marks a type as introspective. The source generator creates metadata and registers the type in the assembly's type registry.

```csharp
[Meta]
public partial class MyModel;

// With mixins declared inline
[Meta(typeof(IMyMixin), typeof(IAnotherMixin))]
public partial class MyModel { ... }
```

### `[Id("stable_id")]`

Makes a type identifiable with a stable string key. The string is used as the JSON type discriminator (`$type`) and for lookup via `Types.Graph`. Use `snake_case` strings by convention.

```csharp
[Meta, Id("player_state")]
public partial class PlayerState;
```

### `[Version(n)]`

Assigns an integer version to a concrete subtype of an identifiable base. Promoted subtypes automatically share the parent's `[Id]` for registry lookup.

```csharp
[Meta, Id("player_state")]
public abstract partial class PlayerState;

[Meta, Version(1)]
public partial class PlayerState1 : PlayerState;

[Meta, Version(2)]
public partial class PlayerState2 : PlayerState;
```

### `[Mixin]`

Applied to interfaces to declare them as mixins. A mixin interface must extend `IMixin<TSelf>` and implement the handler body as a default interface implementation.

```csharp
[Mixin]
public interface IMyMixin : IMixin<IMyMixin>
{
    void IMixin<IMyMixin>.Handler() { /* cross-cutting logic here */ }
}
```

---

## Type Requirements

All introspective types must satisfy every rule — the generator will silently skip or error on violations:

| Requirement | Detail |
|-------------|--------|
| Must be `partial` | The generator adds members to the same partial declaration |
| Must be `class`, `record`, `struct`, or `record struct` | Interfaces, delegates, and enums are not supported |
| Must be visible from global scope | Nesting is allowed only when **all** enclosing types are also `partial` and visible |
| Cannot be generic | `[Meta] public partial class Foo<T>` is unsupported — intentional design constraint |
| Mixins require a reference type | `[Mixin]` has no effect on `struct` / `record struct` |
| `[Version]` requires a reference type | Value types have no inheritance, so versioning is meaningless for them |

---

## Type Graph API

`Types.Graph` provides O(1) cached lookups. Prefer this over `System.Reflection` for AOT compatibility.

```csharp
// Direct subtypes of Parent (non-transitive)
var direct = Types.Graph.GetSubtypes(typeof(Parent));

// All descendant subtypes (transitive)
var all = Types.Graph.GetDescendantSubtypes(typeof(Ancestor));

// Metadata for a single type — null if not introspective
if (Types.Graph.GetMetadata(typeof(MyModel)) is { } meta) { ... }

// All properties including inherited ones
var props = Types.Graph.GetProperties(typeof(MyModel));
```

---

## Metadata Types

Metadata returned by `Types.Graph.GetMetadata()` is one of six concrete types, determined by the attributes applied to the type:

| Metadata type | Attributes on type | Extra members |
|---------------|--------------------|---------------|
| `TypeMetadata` | generic or abstract, no `[Meta]` | name only |
| `ConcreteTypeMetadata` | concrete, no `[Meta]` | `Factory()` |
| `AbstractIntrospectiveTypeMetadata` | abstract + `[Meta]` | `Metatype` |
| `IntrospectiveTypeMetadata` | concrete + `[Meta]` | `Metatype`, `Version` |
| `AbstractIdentifiableTypeMetadata` | abstract + `[Meta, Id]` | `Id` |
| `IdentifiableTypeMetadata` | concrete + `[Meta, Id]` | `Id`, `Version`, `Metatype` |

Key metadata interfaces:
- `IConcreteTypeMetadata` — exposes `Factory()` for reflection-free instantiation
- `IIntrospectiveTypeMetadata` — exposes `Metatype` (type attributes, properties, mixin handlers)
- `IIdentifiableTypeMetadata` — exposes the stable `Id` string

---

## Mixin System

Mixins add cross-cutting behavior to types without inheritance. Only reference types (`class`, `record`) support them.

```csharp
// 1. Define the mixin interface
[Mixin]
public interface IMyMixin : IMixin<IMyMixin>
{
    void IMixin<IMyMixin>.Handler()
    {
        // Access per-instance state via MixinState if needed
    }
}

// 2. Apply the mixin to a type
[Meta(typeof(IMyMixin))]
public partial class MyModel
{
    public void Init()
    {
        // Invoke all registered mixin handlers
        (this as IIntrospectiveRef).InvokeMixins();

        // Or invoke a specific mixin only
        (this as IIntrospectiveRef).InvokeMixin(typeof(IMyMixin));
    }
}
```

`MixinState` is a per-instance blackboard scoped to each mixin, preventing state leakage between mixins on the same object.

---

## Integration with the Chickensoft Ecosystem

### AutoInject

AutoInject mixins (`IAutoOn`, `IDependent`, `IProvider`, etc.) are declared via the `[Meta(typeof(...))]` argument list. Introspection is the underlying mechanism that makes them work at build time. See `chickensoft-auto-inject.md` for the full API.

```csharp
[Meta(typeof(IAutoOn), typeof(IDependent))]
public partial class PlayerHUD : Control
{
    public override void _Notification(int what) => this.Notify(what);
}
```

### LogicBlocks

States and logic block classes need `[Meta]` for diagram generation and `[Id]` for serialization. All state `record` types must be `partial`.

```csharp
[Meta, LogicBlock(typeof(State), Diagram = true)]
public partial class MyLogicBlock : LogicBlock<MyLogicBlock.State>
{
    [Meta]
    public abstract partial record State : StateLogic<State>
    {
        [Meta, Id("my_state_off")]
        public partial record Off : State;

        [Meta, Id("my_state_on")]
        public partial record On : State;
    }
}
```

### Serialization (System.Text.Json)

`[Id]` acts as the JSON type discriminator (`$type` field). `$v` holds the `[Version]` integer. The type table is provided automatically via `Types.Graph`.

```csharp
var options = new JsonSerializerOptions {
    WriteIndented = true,
    TypeInfoResolver = new SerializableTypeResolver(),
    Converters = { new SerializableTypeConverter() }
};

// Output includes "$type": "player_state", "$v": 1
var json = JsonSerializer.Serialize(myState, options);
```

---

## Best Practices

- **Always set `<WarningsAsErrors>CS9057</WarningsAsErrors>`** — a compiler version mismatch silently produces broken metadata that causes runtime errors.
- **Use `[Id]` for any type that crosses a serialization or save-game boundary** — class renames are transparent as long as the `Id` string stays constant.
- **Prefer `snake_case` for `[Id]` strings** — consistent with the Chickensoft ecosystem conventions (e.g., `"player_state_off"`, not `"PlayerStateOff"`).
- **Use abstract base + `[Id]` + versioned subclasses for evolving types** — this pattern allows data migration without breaking existing saves.
- **Mark the generator with `PrivateAssets="all"`** — prevents the source generator from leaking into consuming packages.
- **Use `Types.Graph` instead of `System.Reflection` APIs** — `typeof(T).GetProperties()` and similar calls fail on AOT targets; `Types.Graph` is always safe.

---

## Anti-patterns

- **Generic introspective types** — `[Meta] public partial class Repo<T>` is unsupported and skipped by the generator; extract a non-generic base or redesign the type.
- **Missing `partial` keyword** — the generator cannot add members; the type produces no metadata and is invisible to `Types.Graph`.
- **Nesting inside a non-partial parent** — breaks global-scope visibility; all wrapping types must be `partial` for the generator to traverse them.
- **Applying `[Mixin]` or `[Version]` to structs / record structs** — no inheritance, no per-instance heap state; both attributes are no-ops on value types.
- **Mutable `[Id]` strings** — changing the `[Id]` value after data has been persisted breaks deserialization; treat IDs as stable, permanent constants.
- **Ignoring CS9057** — a compiler version mismatch that emits CS9057 can produce subtly broken metadata; must be treated as an error via `<WarningsAsErrors>`.
- **Accessing `Types.Graph` before the assembly loads** — module initializers fire on first use of any type from the assembly; accessing `Types.Graph` before any such type is referenced may return an incomplete registry.
