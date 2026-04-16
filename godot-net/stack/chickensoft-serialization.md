---
version: 1.0.0
---

# Chickensoft Serialization

> **Scope**: AOT-compatible, polymorphic serialization for Godot 4 C# game models — covers the [Meta]/[Id]/[Save]/[Version] attribute system, JsonSerializerOptions setup, versioning with IOutdated, custom hooks via ICustomSerializable, Godot-type converters, and the SaveFileBuilder/SaveChunk save-file composition pattern.
> **Load when**: authoring serializable game data models, setting up a save/load system, versioning existing save data, integrating serialization with LogicBlocks state machines, using SaveFileBuilder or SaveChunk in the scene tree, configuring JsonSerializerOptions for Chickensoft types, serializing Godot vector/transform/color types.

---

## Packages

Three NuGet packages are required:

```xml
<PackageReference Include="Chickensoft.Introspection" Version="*" />
<PackageReference Include="Chickensoft.Introspection.Generator"
                  Version="*"
                  PrivateAssets="all"
                  OutputItemType="analyzer" />
<PackageReference Include="Chickensoft.Serialization" Version="*" />
<!-- optional: Godot type converters -->
<PackageReference Include="Chickensoft.Serialization.Godot" Version="*" />
<!-- optional: save-file composition -->
<PackageReference Include="Chickensoft.SaveFileBuilder" Version="*" />
```

`Chickensoft.Introspection.Generator` must be declared as a source generator (not a build dependency) — always include `PrivateAssets="all" OutputItemType="analyzer"`.

---

## Core Concepts

- **Introspection Generator** generates type metadata at build time, enabling polymorphic deserialization without runtime reflection (AOT-safe).
- **Serialization layer** wraps `System.Text.Json` and uses the generated metadata to drive type resolution and versioning.
- Serialization is **opt-in**: a property is never saved unless it carries `[Save]`.
- Every serializable model must be a `partial` class/record/struct.

---

## Attributes

| Attribute | Required on | Purpose |
|-----------|-------------|---------|
| `[Meta]` | Every serializable type | Triggers metadata generation by Introspection Generator |
| `[Id("key")]` | Concrete identifiable types | Type discriminator written as `"$type"` in JSON |
| `[Save("jsonKey")]` | Properties to persist | Opt-in property serialization |
| `[Version(n)]` | Versioned concrete types | Tracks schema version; written as `"$v"` in JSON |

`[Id]` on abstract base types is optional — concrete subtypes each need their own unique `[Id]`.

---

## JsonSerializerOptions Setup

Always create options with `SerializableTypeResolver` and `SerializableTypeConverter`:

```csharp
var options = new JsonSerializerOptions {
  WriteIndented = true,
  TypeInfoResolver = new SerializableTypeResolver(),
  Converters = { new SerializableTypeConverter() }
};
```

For Godot types, call `GodotSerialization.Setup()` **once** at startup (e.g., in `_Ready` on the root node) before any serialization:

```csharp
GodotSerialization.Setup();
```

---

## Defining Serializable Models

```csharp
using Chickensoft.Introspection;
using Chickensoft.Serialization;

// Abstract base — no [Id] needed here
[Meta]
public abstract partial record GameData;

// Concrete type — must have [Id]
[Meta, Id("player_data")]
public partial record PlayerData : GameData {
  [Save("health")]
  public required int Health { get; init; }

  [Save("position")]
  public required Vector3 Position { get; init; }
}
```

Rules:
- All types must be `partial`.
- Use `required` + `init` for properties — enforces initialization at construction.
- Abstract base types get `[Meta]`; only concrete types need `[Id]`.
- `[Id]` values must be **globally unique** and stable — do not rename them after shipping.

---

## Supported Types

**Collections:** `List<T>`, `HashSet<T>`, `Dictionary<TKey, TValue>`

**Primitives:** `bool`, `byte`, `char`, `decimal`, `double`, `float`, `int`, `long`, `short`, `string`, `DateTime`, `DateTimeOffset`, `TimeSpan`, `Guid`, `Uri`, `Version` (and their nullable variants)

**JSON DOM types:** `JsonArray`, `JsonDocument`, `JsonElement`, `JsonNode`, `JsonObject`, `JsonValue`

**Godot types** (requires `Chickensoft.Serialization.Godot`): `Vector2`, `Vector2I`, `Vector3`, `Vector3I`, `Transform2D`, `Transform3D`, `Basis`, `Color`

**Enums:** Not handled by `SerializableTypeResolver` — require a separate `JsonSerializerContext`. Combine resolvers with `JsonTypeInfoResolver.Combine()`:

```csharp
[JsonSerializable(typeof(EnemyType))]
[JsonSerializable(typeof(LogType))]
public partial class GameEnumContext : JsonSerializerContext;

private static readonly JsonSerializerOptions JsonOptions = new() {
  WriteIndented = true,
  TypeInfoResolver = JsonTypeInfoResolver.Combine(
    new SerializableTypeResolver(),
    GameEnumContext.Default
  ),
  Converters = { new SerializableTypeConverter() }
};
```

**Known limitations:**
- No generic types.
- Root-level collections not supported — only nested.
- No versioning for value types (value types work but `IOutdated` is unavailable).

---

## Versioning (IOutdated)

Version early — add `[Version]` and `IOutdated` the moment a model's schema is first shipped.

Pattern: keep old version as a separate type that knows how to upgrade itself:

```csharp
// Shared abstract base — [Id] lives here for stable discriminator
[Meta, Id("log_entry")]
public abstract partial record LogEntry;

// V1 — marks itself as outdated
[Meta, Version(1)]
public partial record LogEntry1 : LogEntry, IOutdated {
  [Save("text")]
  public required string Text { get; init; }

  // Upgrade is called automatically on deserialization when version is stale
  public object Upgrade(IReadOnlyBlackboard deps) =>
    new LogEntry2 { Text = Text, Type = LogType.Info };
}

// V2 — current, no IOutdated
[Meta, Version(2)]
public partial record LogEntry2 : LogEntry {
  [Save("text")]
  public required string Text { get; init; }

  [Save("type")]
  public required LogType Type { get; init; }
}
```

The deserializer detects `"$v": 1` in the JSON, instantiates `LogEntry1`, calls `Upgrade()`, and returns a `LogEntry2`.

---

## Custom Serialization (ICustomSerializable)

Use only when attribute-based serialization is insufficient:

```csharp
[Meta, Id("custom_data")]
public partial class CustomData : ICustomSerializable {
  public int Value { get; set; }

  public void OnSerialized(
    IdentifiableTypeMetadata metadata,
    JsonObject json,
    JsonSerializerOptions options
  ) => json["value"] = Value;

  public object OnDeserialized(
    IdentifiableTypeMetadata metadata,
    JsonObject json,
    JsonSerializerOptions options
  ) {
    Value = json["value"]?.GetValue<int>() ?? 0;
    return this;
  }
}
```

---

## LogicBlocks Integration

Add `[Meta]` + `[Id]` to the logic block and every non-abstract state:

```csharp
[Meta, LogicBlock(typeof(State), Diagram = true)]
public partial class GameLogic : LogicBlock<GameLogic.State> {
  public override Transition GetInitialState() => To<State.Idle>();

  [Meta]
  public abstract partial record State : StateLogic<State> {
    [Meta, Id("game_logic_state_idle")]
    public partial record Idle : State;

    [Meta, Id("game_logic_state_playing")]
    public partial record Playing : State;
  }
}
```

Serialize/deserialize with the same `JsonSerializerOptions` as regular models. JSON output:

```json
{
  "$type": "game_logic",
  "$v": 1,
  "state": { "$type": "game_logic_state_idle", "$v": 1 },
  "blackboard": { "$type": "blackboard", "$v": 1, "values": {} }
}
```

To persist blackboard values, register them explicitly:

```csharp
logic.Save(() => new MyRelatedData());
```

To absorb a deserialized instance into an existing live logic block (preserving bindings):

```csharp
existingLogic.RestoreFrom(deserializedLogic);
```

Mark test-only state implementations with `[TestState]` to prevent pre-allocation by the serialization system:

```csharp
[TestState, Meta, Id("test_idle")]
public partial class TestIdle : GameLogic.State.Idle;
```

---

## SaveFileBuilder / SaveChunk

Use `SaveFileBuilder` to compose save data from nodes scattered across the scene tree. Requires `AutoInject` for chunk discovery.

### Root node — provides and owns the SaveFile

```csharp
[Meta(typeof(IAutoNode))]
public partial class Game : Node {
  // Provide the root chunk to descendants via AutoInject
  [Provide] public ISaveChunk<GameData> GameChunk { get; } = new SaveChunk<GameData>(
    onSave: (chunk) => new GameData {
      PlayerData = chunk.GetChunkSaveData<PlayerData>(),
      MapData    = chunk.GetChunkSaveData<MapData>()
    },
    onLoad: (chunk, data) => {
      chunk.LoadChunkSaveData(data.PlayerData);
      chunk.LoadChunkSaveData(data.MapData);
    }
  );

  private SaveFile<GameData> _saveFile = default!;

  public override void _Ready() {
    _saveFile = new SaveFile<GameData>(
      root: GameChunk,
      onSave: async (data) => {
        var json = JsonSerializer.Serialize(data, _jsonOptions);
        await FileSystem.File.WriteAllTextAsync(SavePath, json);
      },
      onLoad: async () => {
        var json = await FileSystem.File.ReadAllTextAsync(SavePath);
        return JsonSerializer.Deserialize<GameData>(json, _jsonOptions)!;
      }
    );
  }
}
```

### Child node — registers its chunk with the parent

```csharp
[Meta(typeof(IAutoNode))]
public partial class PlayerController : Node {
  [Dependency] public ISaveChunk<GameData> GameChunk => DependOn<ISaveChunk<GameData>>();

  private ISaveChunk<PlayerData> _playerChunk = default!;

  public void OnResolved() {
    _playerChunk = new SaveChunk<PlayerData>(
      onSave: (_) => new PlayerData { Health = _health, Position = GlobalPosition },
      onLoad: (_, data) => { _health = data.Health; GlobalPosition = data.Position; }
    );
    GameChunk.AddChunk(_playerChunk);
  }
}
```

---

## Best Practices

- **Add `[Id]` to every concrete serializable type immediately** — not retroactively; changing or adding an `[Id]` after shipping breaks existing save files.
- **Use stable, human-readable `[Id]` strings** (e.g., `"player_data"`, `"game_logic_state_idle"`) — not auto-generated or class-name-derived; renaming a class must never change the id.
- **Apply `[Save]` selectively** — only properties that actually need to be persisted; non-saved properties are ignored on round-trip.
- **Version from the start** — apply `[Version(1)]` to the first shipped version of every model; retrofitting versioning after the fact requires a migration.
- **Keep model classes simple** — avoid business logic in serializable types; they should be pure data records.
- **Match `SaveChunk` hierarchy to scene structure** — each node owns exactly the data it manages; do not serialize state that belongs to a sibling or parent.
- **Call `GodotSerialization.Setup()` once at app startup**, before any serialization call involving Godot types.
- **Use `logic.RestoreFrom(deserialized)`** to patch a live logic block rather than replacing it — preserves active bindings and subscriptions.

---

## Anti-patterns

- **Missing `[Meta]` on a serializable type** — the generator silently skips the type; deserialization will fail at runtime with a type-not-found error.
- **Duplicate `[Id]` values** — two types sharing the same id cause non-deterministic deserialization; always verify uniqueness.
- **Mutable properties without `init`** — allows accidental mutation post-deserialization; prefer `required … { get; init; }`.
- **Generic serializable types** — not supported; use a concrete subtype or a wrapper record instead.
- **Serializing root-level collections** — `JsonSerializer.Serialize(myList, options)` is not supported; wrap the collection in a record.
- **Forgetting `IOutdated.Upgrade()` implementation** — `[Version]` without `IOutdated` on old versions silently loads stale data without upgrading it.
- **Using `RestoreFrom` after `Dispose`** — always restore before disposing the original logic block.
- **Saving runtime-only dependencies in blackboard** — use `logic.Save(...)` only for data that must survive a save/load cycle; runtime services should be re-injected, not serialized.
