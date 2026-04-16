---
version: 1.0.0
---

# Chickensoft SaveFileBuilder

> **Scope**: Composing game save data from loosely coupled chunks distributed across the scene tree — defining `SaveFile<T>`, authoring `SaveChunk<T>` nodes, wiring chunks through AutoInject, and integrating with Chickensoft.Serialization for AOT-compatible persistence.
> **Load when**: implementing save/load systems, authoring SaveChunk nodes, wiring save data chunks via dependency injection, serializing game state to disk, integrating SaveFileBuilder with LogicBlocks or Serialization, debugging save data composition.

---

## Installation

Add to `.csproj`:

```xml
<PackageReference Include="Chickensoft.SaveFileBuilder" Version="#.#.#" />
```

Namespace: `Chickensoft.SaveFileBuilder`

For full persistence also add:

```xml
<PackageReference Include="Chickensoft.Serialization" Version="#.#.#" />
<PackageReference Include="Chickensoft.Serialization.Godot" Version="#.#.#" />
```

## Core Concepts

**Save architecture** is a tree that mirrors the scene tree:

- `SaveFile<T>` — root manager that orchestrates the full save/load lifecycle. Holds the root chunk and the file-level I/O callbacks.
- `SaveChunk<T>` — a node in the save tree. Knows how to collect data from its children (`onSave`) and how to distribute loaded data back to them (`onLoad`).
- Each node in the scene tree that owns persistent state owns a `SaveChunk<T>`, registers it with the nearest parent chunk, and provides/consumes it via AutoInject.

**Data flows top-down on load, bottom-up on save:**

```
Save:  root.onSave → GetChunkSaveData<ChildData>() per child → file I/O onSave
Load:  file I/O onLoad → root.onLoad → LoadChunkSaveData(childData) per child
```

## API / Interface

### `SaveFile<T>`

```csharp
new SaveFile<T>(
  ISaveChunk<T> root,
  Func<T, Task> onSave,     // receives composed data, writes to disk
  Func<Task<T?>> onLoad     // reads from disk, returns null if no save exists
);
```

Trigger save/load via:

```csharp
await SaveFile.Save();
await SaveFile.Load();
```

### `SaveChunk<T>`

```csharp
new SaveChunk<T>(
  Action<SaveChunk<T>> onSave,       // collect child data, return composed T
  Action<SaveChunk<T>, T> onLoad     // receive T, distribute to children
);
```

### `ISaveChunk<T>` key methods

| Method | Description |
|--------|-------------|
| `AddChunk(ISaveChunk<TChild> chunk)` | Register a child chunk |
| `GetChunkSaveData<TChild>()` | Retrieve data from a registered child chunk (used in onSave) |
| `LoadChunkSaveData(TChild data)` | Push data into a registered child chunk (used in onLoad) |

Child chunks are looked up **by type** — each `TChild` type can appear only once per parent chunk.

## Patterns & Examples

### Root node — create SaveFile and provide root chunk

```csharp
[Meta(typeof(IAutoNode))]
public partial class Game : Node3D, IProvide<ISaveChunk<GameData>>
{
  public SaveFile<GameData> SaveFile { get; set; } = default!;

  ISaveChunk<GameData> IProvide<ISaveChunk<GameData>>.Value() => SaveFile.Root;

  public void Setup()
  {
    SaveFile = new SaveFile<GameData>(
      root: new SaveChunk<GameData>(
        onSave: (chunk) => new GameData
        {
          MapData    = chunk.GetChunkSaveData<MapData>(),
          PlayerData = chunk.GetChunkSaveData<PlayerData>(),
        },
        onLoad: (chunk, data) =>
        {
          chunk.LoadChunkSaveData(data.MapData);
          chunk.LoadChunkSaveData(data.PlayerData);
        }
      ),
      onSave: async (data) =>
      {
        var json = JsonSerializer.Serialize(data, _jsonOptions);
        await File.WriteAllTextAsync(SavePath, json);
      },
      onLoad: async () =>
      {
        if (!File.Exists(SavePath)) return null;
        var json = await File.ReadAllTextAsync(SavePath);
        return JsonSerializer.Deserialize<GameData>(json, _jsonOptions);
      }
    );
  }
}
```

### Child node — consume parent chunk and register own chunk

```csharp
[Meta(typeof(IAutoNode))]
public partial class Player : CharacterBody3D
{
  [Dependency]
  public ISaveChunk<GameData> GameChunk => this.DependOn<ISaveChunk<GameData>>();

  public SaveChunk<PlayerData> PlayerChunk { get; set; } = default!;

  public void Setup()
  {
    PlayerChunk = new SaveChunk<PlayerData>(
      onSave: (_) => new PlayerData
      {
        GlobalTransform = GlobalTransform,
        Velocity        = Velocity,
      },
      onLoad: (_, data) =>
      {
        GlobalTransform = data.GlobalTransform;
        Velocity        = data.Velocity;
      }
    );
  }

  public void OnResolved()
  {
    // Register with parent chunk after dependencies are resolved.
    GameChunk.AddChunk(PlayerChunk);
  }
}
```

### Triggering save and load

```csharp
// Save
await SaveFile.Save();

// Load (returns false if no save file exists)
var loaded = await SaveFile.Load();
```

## Integration with Chickensoft.Serialization

Use `Chickensoft.Serialization` for AOT-safe JSON (compatible with iOS/consoles). Configure `JsonSerializerOptions` with the Chickensoft resolvers:

```csharp
private static readonly JsonSerializerOptions _jsonOptions = new()
{
  WriteIndented = true,
  TypeInfoResolver = new SerializableTypeResolver(),
  Converters = { new SerializableTypeConverter() },
};
```

Mark save data records with `[Meta]` and `[Id]` so the serializer can resolve polymorphic types:

```csharp
[Meta, Id("game_data")]
public partial record GameData
{
  [Save("map")]    public MapData    MapData    { get; init; } = new();
  [Save("player")] public PlayerData PlayerData { get; init; } = new();
}
```

To serialize a LogicBlock's state as part of save data, use `RestoreFrom` on load:

```csharp
// onLoad in the chunk that owns the LogicBlock:
onLoad: (_, data) =>
{
  _myLogicBlock.RestoreFrom(data.LogicBlockSnapshot);
}
```

## Best Practices

- Place `SaveFile<T>` **at the highest scene-tree node** that needs persistence; expose the root chunk via `IProvide<ISaveChunk<T>>`.
- Call `AddChunk()` inside `OnResolved()` — never in `_Ready()`, because dependencies are not yet available there.
- Keep `onSave`/`onLoad` lambdas **focused on a single node's data** — delegate child data to child chunks.
- Use `Chickensoft.Serialization` (not `Newtonsoft.Json`) for AOT compatibility.
- Design save data types as **immutable records** (`record`) — simpler to compare, copy, and version.
- Return `null` from the file-level `onLoad` when no save file exists; `SaveFile.Load()` handles the null case gracefully.
- Each `TChild` type must be **unique per parent chunk** — if two nodes need to save the same data type, wrap them in distinct record wrappers.

## Anti-patterns

- **Do not call `AddChunk()` in `_Ready()`** — AutoInject dependencies are resolved after `_Ready()`; the parent chunk is not yet available.
- **Do not store a `SaveChunk` as a static or singleton** — chunks must be per-scene-instance to avoid stale data across scene reloads.
- **Do not use `GetChunkSaveData<T>()` outside `onSave`** — calling it before all child chunks have run their `onSave` yields incomplete data.
- **Do not mix `System.Text.Json` defaults with `Chickensoft.Serialization`** — always pass the configured `JsonSerializerOptions` with `SerializableTypeResolver` and `SerializableTypeConverter`; the default resolver will fail on polymorphic types.
- **Do not register the same chunk type twice in one parent** — `AddChunk` uses the generic type as the key; a second call silently overwrites the first.
