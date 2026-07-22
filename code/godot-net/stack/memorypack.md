---
version: 1.0.0
---

# MemoryPack

> **Scope**: MemoryPack binary serialization — type annotation with attributes, constructor selection rules, versioning strategies, union types for polymorphism, custom formatters, Brotli compression, and performance-oriented serialization patterns in Godot 4 .NET projects.
> **Load when**: authoring serializable types with MemoryPack, setting up save/load systems using binary format, implementing network message serialization, versioning serialized data across game releases, writing custom formatters for external types, applying compression, debugging MEMPACK diagnostic errors.

---

## Core Concepts

MemoryPack is a zero-encoding binary serializer for C# — it copies C# memory layout as directly as possible, avoiding format overhead.

- **Unmanaged types** (structs with only value-type fields, e.g., `int`, `float`, `Vector3` equivalents) are block-copied via `Unsafe.CopyBlockUnaligned` — no per-field overhead.
- **Reference types** go through generated formatters produced by a source generator at compile time.
- **Format is not self-describing** — binary data cannot be deserialized without the matching C# schema. Plan versioning before shipping.
- Requires `.NET Standard 2.1` minimum; use `net8.0` or later for best performance and AOT compatibility.

## Attributes

### `[MemoryPackable]`
Marks a class, struct, record, or interface as serializable. The type **must** be declared `partial`.

```csharp
[MemoryPackable]
public partial class PlayerState
{
    public int Health { get; set; }
    public float PositionX { get; set; }
}
```

### `[MemoryPackIgnore]`
Excludes a public member from serialization.

```csharp
[MemoryPackIgnore]
public int CachedScore => Health * 10; // computed, not serialized
```

### `[MemoryPackInclude]`
Includes a private or internal member in serialization.

```csharp
[MemoryPackInclude]
private int _internalCounter;
```

### `[MemoryPackOrder(n)]`
Assigns an explicit serialization index to a member. Required when using `SerializeLayout.Explicit` or `GenerateType.VersionTolerant`.

```csharp
[MemoryPackable(SerializeLayout.Explicit)]
public partial class SaveData
{
    [MemoryPackOrder(0)] public int Level { get; set; }
    [MemoryPackOrder(1)] public float Score { get; set; }
}
```

### `[MemoryPackConstructor]`
Designates which constructor the deserializer should use. Required when multiple constructors exist. Constructor parameter names must match member names (case-insensitive).

```csharp
[MemoryPackable]
public partial class Item
{
    public int Id { get; set; }
    public string Name { get; set; }

    public Item() { }

    [MemoryPackConstructor]
    public Item(int id, string name) { Id = id; Name = name; }
}
```

### `[MemoryPackUnion(tag, typeof(ConcreteType))]`
Enables polymorphic serialization of interfaces and abstract classes. Each subtype gets a unique integer tag.

```csharp
[MemoryPackable]
[MemoryPackUnion(0, typeof(MoveCommand))]
[MemoryPackUnion(1, typeof(AttackCommand))]
public partial interface ICommand { }

[MemoryPackable]
public partial class MoveCommand : ICommand { public float X, Y; }

[MemoryPackable]
public partial class AttackCommand : ICommand { public int TargetId; }
```

### `[MemoryPackOnSerializing]` / `[MemoryPackOnSerialized]` / `[MemoryPackOnDeserializing]` / `[MemoryPackOnDeserialized]`
Lifecycle callbacks for pre/post serialization hooks.

```csharp
[MemoryPackable]
public partial class GameData
{
    [MemoryPackOnSerializing]
    public static void OnSerializing() { /* prepare data */ }

    [MemoryPackOnDeserialized]
    public void OnDeserialized() { /* rebuild computed state */ }
}
```

## API / Interface

### Basic Serialization

```csharp
// Serialize → byte[]
byte[] bin = MemoryPackSerializer.Serialize(value);

// Deserialize from byte[]
var value = MemoryPackSerializer.Deserialize<PlayerState>(bin);

// Deserialize from ReadOnlySpan<byte> or ReadOnlySequence<byte>
var value = MemoryPackSerializer.Deserialize<PlayerState>(span);
```

### High-Performance: BufferWriter

Prefer `IBufferWriter<byte>` over returning `byte[]` in hot paths — avoids extra allocation.

```csharp
var buffer = new ArrayBufferWriter<byte>();
MemoryPackSerializer.Serialize(buffer, value);
ReadOnlySpan<byte> written = buffer.WrittenSpan;
```

### Overwrite Mode (Zero Allocation Deserialization)

Reuses an existing object, avoiding allocation on repeated deserialization.

```csharp
var existing = new PlayerState();
MemoryPackSerializer.Deserialize(bin, ref existing); // updates existing in-place
```

### Async (Stream)

```csharp
await MemoryPackSerializer.SerializeAsync(stream, value);
var value = await MemoryPackSerializer.DeserializeAsync<PlayerState>(stream);
```

### Streaming (large collections)

```csharp
// Serialize enumerable incrementally
await MemoryPackStreamingSerializer.SerializeAsync(stream, count: 5000, source: items, flushRate: 4096);

// Deserialize as async enumerable — process without loading all data at once
await foreach (var item in MemoryPackStreamingSerializer.DeserializeAsync<LogEntry>(stream))
{
    // process item
}
```

## Versioning

### Default Mode Rules

In default mode, the only safe schema change is **adding new nullable members at the end**. Everything else breaks deserialization of older data.

| Change | Safe? |
|--------|-------|
| Add nullable member at end | ✅ |
| Remove member | ❌ |
| Reorder members | ❌ |
| Change member type | ❌ |
| Rename member | ✅ |

### Full Version Tolerance (`GenerateType.VersionTolerant`)

Use for types whose schema must evolve freely (e.g., save files across multiple game versions). Requires explicit `[MemoryPackOrder]` on every member. Members can be added, removed, or reordered safely.

```csharp
[MemoryPackable(GenerateType.VersionTolerant)]
public partial class SaveFile
{
    [MemoryPackOrder(0)] public int Level { get; set; }
    [MemoryPackOrder(1)] public float Score { get; set; }
    // [MemoryPackOrder(2)] was removed — safe in VersionTolerant mode
    [MemoryPackOrder(3)] public string PlayerName { get; set; } // newly added
}
```

### Default Value on Missing Field

```csharp
[MemoryPackable]
public partial class Config
{
    [SuppressDefaultInitialization]
    public int MaxEnemies { get; set; } = 20; // returns 20 if field absent in data
}
```

## Custom Formatters

### Built-in Formatter Attributes

Apply these to individual members to control encoding:

| Attribute | Effect |
|-----------|--------|
| `[Utf16StringFormatter]` | UTF-16 encoding (faster for non-ASCII, larger for ASCII) |
| `[InternStringFormatter]` | Interns deserialized strings (saves memory for repeated values) |
| `[OrdinalIgnoreCaseStringDictionaryFormatter<TValue>]` | Case-insensitive `Dictionary<string,TValue>` |
| `[BitPackFormatter]` | Compresses `bool[]` — 8× smaller (1 bit per bool) |
| `[BrotliFormatter]` | Compresses `byte[]` member with Brotli |
| `[BrotliStringFormatter]` | Compresses `string` member with Brotli |
| `[MemoryPoolFormatter<T>]` | Deserializes `Memory<T>` from `ArrayPool` (reduces allocation) |

### Registering a Custom Formatter

```csharp
public class GuidFormatter : MemoryPackFormatter<Guid>
{
    public override void Serialize<TBufferWriter>(
        ref MemoryPackWriter<TBufferWriter> writer, scoped ref Guid value)
    {
        writer.WriteUnmanaged(value); // Guid is unmanaged — copy directly
    }

    public override void Deserialize(ref MemoryPackReader reader, scoped ref Guid value)
    {
        reader.ReadUnmanaged(out value);
    }
}

// Register once at startup (e.g., in an autoload or static constructor)
MemoryPackFormatterProvider.Register(new GuidFormatter());
```

### Wrapping External Types

For types you don't own (Godot types, third-party structs), create a wrapper instead of a formatter:

```csharp
[MemoryPackable]
public readonly partial struct SerializableColor
{
    [MemoryPackIgnore]
    public readonly Godot.Color Color;

    [MemoryPackInclude] private float r => Color.R;
    [MemoryPackInclude] private float g => Color.G;
    [MemoryPackInclude] private float b => Color.B;
    [MemoryPackInclude] private float a => Color.A;

    [MemoryPackConstructor]
    SerializableColor(float r, float g, float b, float a)
        => Color = new Godot.Color(r, g, b, a);

    public SerializableColor(Godot.Color color) => Color = color;
}
```

## Compression

Always use `using` on `BrotliCompressor`/`BrotliDecompressor` — they hold pooled memory.

```csharp
// Compress
using var compressor = new BrotliCompressor(); // quality-1 (Fastest) by default
MemoryPackSerializer.Serialize(compressor, value);
byte[] compressed = compressor.ToArray();

// Decompress
using var decompressor = new BrotliDecompressor();
var buffer = decompressor.Decompress(compressed);
var value = MemoryPackSerializer.Deserialize<T>(buffer);
```

- Use **quality-1** (`CompressionLevel.Fastest`) for game runtime — matches LZ4 speed.
- Avoid the .NET default `BrotliStream` (quality-4) — it is significantly slower and unnecessary in most game scenarios.
- Compress only when payloads are large or highly repetitive (network snapshots, large save files). Small structs are slower to compress than to transmit raw.

## Circular References

Use `GenerateType.CircularReference` for object graphs with parent/child back-references. Requires parameterless constructor.

```csharp
[MemoryPackable(GenerateType.CircularReference)]
public partial class SceneNode
{
    [MemoryPackOrder(0)] public string Name { get; set; }
    [MemoryPackOrder(1)] public SceneNode? Parent { get; set; }
    [MemoryPackOrder(2)] public List<SceneNode>? Children { get; set; }
}
```

## Custom Collections

```csharp
[MemoryPackable(GenerateType.Collection)]
public partial class EntityList<T> : List<T> { }
```

## Best Practices

- **Always declare serializable types `partial`** — the source generator requires it to inject the formatter.
- **Use `GenerateType.VersionTolerant` for save files** and any data persisted to disk across game versions. Use default mode only for purely transient network messages where schema stability is guaranteed.
- **Assign `[MemoryPackOrder]` from day one** for types that might evolve — retrofitting order onto unordered types is a breaking change.
- **Register custom formatters at startup** — place `MemoryPackFormatterProvider.Register(...)` in a static constructor or Godot autoload `_Ready()` before any serialization occurs.
- **Prefer overwrite mode** (`Deserialize(bin, ref existing)`) in hot paths such as network receive loops to avoid per-frame allocation.
- **Use `IBufferWriter<byte>`** instead of `byte[]` returns when serializing in loops or high-frequency code paths.
- **Use `[BitPackFormatter]`** on large `bool[]` arrays (flags, grid maps) — reduces size by 8×.
- **Use `[InternStringFormatter]`** for enum-like string fields with few distinct values (item categories, tags) to reduce memory pressure during deserialization.
- **Keep union tags stable** — reassigning a tag to a different subtype corrupts all existing serialized data.
- **Use `record` primary constructors** for immutable message types — MemoryPack supports them natively.

## Anti-patterns

- **Forgetting `partial`** — the source generator silently generates nothing; type appears to compile but fails at runtime.
- **Removing or reordering members in default mode** — breaks deserialization of any previously saved or received binary without a schema migration.
- **Using `new BrotliStream()` instead of `BrotliCompressor`** — .NET's default quality-4 is ~4× slower and unsuitable for real-time serialization.
- **Forgetting `using` on `BrotliCompressor`/`BrotliDecompressor`** — leaks pooled memory.
- **Defining circular-reference types without `GenerateType.CircularReference`** — causes infinite recursion during serialization.
- **Mismatched constructor parameter names** — `[MemoryPackConstructor]` constructor parameters must match member names case-insensitively; silent mismatch leaves members at default values.
- **Applying `[MemoryPackable]` to nested classes** — generates MEMPACK002; unnest the type.
- **Applying custom formatters to unmanaged structs** — ignored by design; unmanaged structs are always block-copied.
- **Mixing target frameworks** — if your Godot project targets `net8.0`, all assemblies using MemoryPack must also target `net8.0`; referencing a `netstandard2.1` build causes a runtime incompatibility.
- **Serializing to `byte[]` in receive loops** — use `IBufferWriter<byte>` or overwrite mode to avoid per-tick allocation.
- **Changing `[MemoryPackUnion]` tag integers** — equivalent to data corruption; existing binary cannot be deserialized correctly.
