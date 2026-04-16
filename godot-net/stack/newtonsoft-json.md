---
version: 1.0.0
---

# Newtonsoft.Json

> **Scope**: JSON serialization and deserialization in Godot 4 .NET — strongly-typed and dynamic JSON handling, custom converters for Godot types, game save/load patterns, serialization settings configuration, and safe polymorphic type handling.
> **Load when**: serializing or deserializing JSON data, implementing save/load systems with Newtonsoft.Json, writing custom JsonConverter for Godot types, configuring JsonSerializerSettings, debugging JSON serialization errors, parsing external API or network payloads, handling circular references or polymorphic types.

---

## Core Types

| Type | Namespace | Purpose |
|------|-----------|---------|
| `JsonConvert` | `Newtonsoft.Json` | Static entry point — `SerializeObject` / `DeserializeObject` |
| `JsonSerializer` | `Newtonsoft.Json` | Reusable serializer instance for high-throughput paths |
| `JsonSerializerSettings` | `Newtonsoft.Json` | Central configuration — always share as a `static readonly` field |
| `JObject` | `Newtonsoft.Json.Linq` | Dynamic JSON object; use when schema is unknown |
| `JArray` | `Newtonsoft.Json.Linq` | Dynamic JSON array |
| `JToken` | `Newtonsoft.Json.Linq` | Base type for all LINQ-to-JSON elements |
| `JsonTextReader` / `JsonTextWriter` | `Newtonsoft.Json` | Streaming API — required for JSON larger than 85 KB |

## Serialization Basics

```csharp
// Serialize
string json = JsonConvert.SerializeObject(obj);
string json = JsonConvert.SerializeObject(obj, Formatting.Indented);
string json = JsonConvert.SerializeObject(obj, settings);

// Deserialize — always use the generic overload
MyClass obj  = JsonConvert.DeserializeObject<MyClass>(json)!;
List<T> list = JsonConvert.DeserializeObject<List<T>>(json)!;

// Populate existing object (preserves properties absent from JSON)
JsonConvert.PopulateObject(json, existingObj);
```

Prefer `DeserializeObject<T>` over untyped `DeserializeObject` — it avoids `JObject` boxing and is significantly faster.

## Attributes

| Attribute | Effect |
|-----------|--------|
| `[JsonProperty("name")]` | Map to a different JSON key |
| `[JsonProperty(Required = Required.Always)]` | Throw if field is missing from JSON |
| `[JsonProperty(NullValueHandling = NullValueHandling.Ignore)]` | Per-property null omission |
| `[JsonProperty(Order = N)]` | Control serialization property order |
| `[JsonIgnore]` | Exclude from both serialization and deserialization |
| `[JsonConverter(typeof(T))]` | Apply a custom converter to a property or type |
| `[JsonConstructor]` | Mark which constructor to use for deserialization |
| `[JsonObject(MemberSerialization.OptIn)]` | Only serialize properties explicitly marked with `[JsonProperty]` |
| `[JsonExtensionData]` | Capture unknown JSON fields into `IDictionary<string, JToken>` for forward compatibility |

```csharp
[JsonObject(MemberSerialization.OptIn)]
public class PlayerData
{
    [JsonProperty("player_id", Required = Required.Always)]
    public int Id { get; set; }

    [JsonProperty("display_name")]
    public string Name { get; set; }

    [JsonIgnore]
    public bool IsDirty { get; set; } // runtime-only, never persisted

    [JsonProperty("role")]
    [JsonConverter(typeof(StringEnumConverter))]
    public PlayerRole Role { get; set; }

    [JsonProperty("created_at")]
    [JsonConverter(typeof(IsoDateTimeConverter))]
    public DateTime CreatedAt { get; set; }

    [JsonExtensionData]
    public IDictionary<string, JToken> Extra { get; set; } // absorbs unknown fields
}
```

## JsonSerializerSettings

Always declare settings as a `static readonly` field — constructing a new `CamelCasePropertyNamesContractResolver` per call is expensive (uses reflection internally).

```csharp
private static readonly JsonSerializerSettings SaveSettings = new()
{
    Formatting = Formatting.Indented,
    NullValueHandling = NullValueHandling.Ignore,
    DefaultValueHandling = DefaultValueHandling.Ignore,
    DateTimeZoneHandling = DateTimeZoneHandling.Utc,
    ReferenceLoopHandling = ReferenceLoopHandling.Ignore,
    MaxDepth = 32,
    Converters = { new StringEnumConverter(), new Vector3Converter() }
};
```

### Key Settings Reference

| Setting | Default | Recommended for game data |
|---------|---------|--------------------------|
| `NullValueHandling` | `Include` | `Ignore` — reduce save file size |
| `DefaultValueHandling` | `Include` | `Ignore` — reduce save file size |
| `ReferenceLoopHandling` | `Error` | `Ignore` — prevent StackOverflow on node graphs |
| `DateTimeZoneHandling` | `Local` | `Utc` — avoid timezone bugs |
| `Formatting` | `None` | `Indented` for saves; `None` for network |
| `TypeNameHandling` | `None` | **Never change** — serious security risk (see Anti-patterns) |
| `MaxDepth` | `64` | Set to `32` to limit deep object traversal |

Set global defaults once at startup when the same settings apply everywhere:

```csharp
JsonConvert.DefaultSettings = () => new JsonSerializerSettings
{
    NullValueHandling = NullValueHandling.Ignore,
    DateTimeZoneHandling = DateTimeZoneHandling.Utc,
    Converters = { new StringEnumConverter() }
};
```

## Custom Converters

Inherit from `JsonConverter<T>` (generic, preferred — provides compile-time type safety over non-generic `JsonConverter`).

```csharp
public class Vector3Converter : JsonConverter<Vector3>
{
    public override Vector3 ReadJson(JsonReader reader, Type objectType,
        Vector3 existingValue, bool hasExistingValue, JsonSerializer serializer)
    {
        var jo = JObject.Load(reader);
        return new Vector3(
            jo["x"]?.Value<float>() ?? 0f,
            jo["y"]?.Value<float>() ?? 0f,
            jo["z"]?.Value<float>() ?? 0f);
    }

    public override void WriteJson(JsonWriter writer, Vector3 value, JsonSerializer serializer)
    {
        new JObject { ["x"] = value.X, ["y"] = value.Y, ["z"] = value.Z }.WriteTo(writer);
    }
}
```

Register converters either via `[JsonConverter]` attribute on the type (preferred — avoids repeated `CanConvert()` checks) or in `JsonSerializerSettings.Converters`. An attribute on a property takes precedence over an attribute on the type, which takes precedence over settings.

Create converters for all Godot math types used in serialized data: `Vector2`, `Vector3`, `Color`, `Quaternion`, `Transform3D`. Register them once in a shared settings instance.

## Dynamic JSON — LINQ to JSON

Use `JObject` / `JArray` only when the schema is truly unknown or when extracting a few fields from a large document without deserializing the whole thing. Prefer strongly-typed deserialization otherwise.

```csharp
// Query individual fields
JObject jobj = JObject.Parse(json);
string? name  = jobj["name"]?.Value<string>();
int     level = jobj["level"]?.Value<int>() ?? 0;

// Modify and reserialize
jobj["score"] = 9999;
string updated = jobj.ToString();

// Filter arrays
JArray items = JArray.Parse(json);
var swords = items.Children<JObject>()
    .Where(o => o["type"]?.Value<string>() == "sword")
    .ToList();

// Parse once, extract multiple typed subsections
JObject root    = JObject.Parse(bigJson);
var players     = root["players"]?.ToObject<List<PlayerData>>(serializer);
var config      = root["config"]?.ToObject<GameConfig>(serializer);
```

JSONPath queries via `SelectToken` / `SelectTokens` for complex navigation:

```csharp
// All item names anywhere in the document
var names = root.SelectTokens("$..inventory[*].name")
    .Select(t => t.Value<string>())
    .ToList();
```

## Godot 4 .NET Integration

### Save / Load Pattern

```csharp
public partial class SaveManager : Node
{
    private static readonly JsonSerializerSettings SaveSettings = new()
    {
        Formatting = Formatting.Indented,
        NullValueHandling = NullValueHandling.Ignore,
        DefaultValueHandling = DefaultValueHandling.Ignore,
        DateTimeZoneHandling = DateTimeZoneHandling.Utc,
        Converters = { new StringEnumConverter(), new Vector3Converter() }
    };

    public void Save(GameState state, string path)
    {
        string json = JsonConvert.SerializeObject(state, SaveSettings);
        using var file = FileAccess.Open(path, FileAccess.ModeFlags.Write);
        file.StoreString(json);
    }

    public GameState Load(string path)
    {
        using var file = FileAccess.Open(path, FileAccess.ModeFlags.Read);
        return JsonConvert.DeserializeObject<GameState>(file.GetAsText(), SaveSettings)
               ?? new GameState();
    }
}
```

### Network Serialization

Use compact settings for network payloads to reduce bandwidth:

```csharp
private static readonly JsonSerializerSettings NetSettings = new()
{
    Formatting = Formatting.None,
    NullValueHandling = NullValueHandling.Ignore,
    Converters = { new StringEnumConverter() }
};
```

### Large JSON / Streaming

For save files or loaded assets larger than 85 KB, use `JsonTextReader` to avoid Large Object Heap allocations:

```csharp
using var stream = new FileStream(path, FileMode.Open);
using var reader = new StreamReader(stream);
using var jsonReader = new JsonTextReader(reader);
var serializer = JsonSerializer.CreateDefault(SaveSettings);
var data = serializer.Deserialize<LargeDataType>(jsonReader);
```

## Error Handling

Log deserialization errors without aborting by setting `Error` in settings:

```csharp
private static readonly JsonSerializerSettings RobustSettings = new()
{
    Error = (_, args) =>
    {
        GD.PrintErr($"[JSON] path={args.ErrorContext.Path} " +
                    $"error={args.ErrorContext.Error.Message}");
        args.ErrorContext.Handled = true; // continue deserialization
    }
};
```

Use `[OnDeserialized]` for post-load validation of business rules:

```csharp
[OnDeserialized]
void Validate(StreamingContext _)
{
    if (Level is < 1 or > 100)
        throw new JsonSerializationException($"Invalid level value: {Level}");
}
```

## Polymorphic Types

Use a discriminator field and a custom `JsonConverter<T>` instead of `TypeNameHandling` (see Anti-patterns):

```csharp
public class EntityConverter : JsonConverter<Entity>
{
    public override Entity ReadJson(JsonReader reader, Type objectType,
        Entity existingValue, bool hasExistingValue, JsonSerializer serializer)
    {
        var jo = JObject.Load(reader);
        return jo["kind"]?.Value<string>() switch
        {
            "enemy" => jo.ToObject<Enemy>(serializer)!,
            "item"  => jo.ToObject<Item>(serializer)!,
            _ => throw new JsonSerializationException(
                     $"Unknown entity kind: {jo["kind"]}")
        };
    }

    public override void WriteJson(JsonWriter writer, Entity value, JsonSerializer serializer)
    {
        var jo = JObject.FromObject(value, serializer);
        jo["kind"] = value switch
        {
            Enemy => "enemy",
            Item  => "item",
            _ => throw new JsonSerializationException("Unknown entity type")
        };
        jo.WriteTo(writer);
    }
}
```

## Anti-patterns

**Never use `TypeNameHandling` other than the default `None`.** Any other value enables remote code execution via crafted JSON — an attacker can embed arbitrary `$type` fields. Use the discriminator pattern above instead.

```csharp
// UNSAFE — never do this
var settings = new JsonSerializerSettings { TypeNameHandling = TypeNameHandling.All };
```

**Never create `JsonSerializerSettings` inside a loop or per-call.** Contract resolver construction uses reflection — create once, share everywhere.

**Never parse the same JSON string twice.** Parse once to `JObject`, then call `.ToObject<T>(serializer)` per subsection.

**Always set `ReferenceLoopHandling = ReferenceLoopHandling.Ignore` for any object that holds Godot node references.** Parent/child node cycles cause `StackOverflowException` with the default `Error` setting.

**Do not serialize Godot `Node` objects directly.** Extract only the data you need into a plain C# record or class, then serialize that. Nodes contain engine state that cannot be safely round-tripped through JSON.

**Avoid `[JsonObject(MemberSerialization.Fields)]` for Godot nodes.** Private backing fields may include engine-managed state.
