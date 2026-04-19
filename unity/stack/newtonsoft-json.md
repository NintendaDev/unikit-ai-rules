---
version: 1.0.0
---

# Newtonsoft.Json (Json.NET)

> **Scope**: JSON serialization and deserialization in Unity using Newtonsoft.Json — configuring JsonSerializerSettings, applying serialization attributes, writing custom converters, LINQ to JSON for dynamic data, and Unity-specific setup (IL2CPP, AOT, Unity type handling).
> **Load when**: serializing or deserializing data with Newtonsoft.Json or JsonConvert, configuring JsonSerializerSettings, writing custom JsonConverters, using JObject/JToken for dynamic JSON, handling Unity types in JSON, debugging AOT or IL2CPP errors with Json.NET.

---

## Installation

Use the official Unity package — do **not** use the deprecated community fork (`jilleJr/Newtonsoft.Json-for-Unity`, archived 2023).

In `Packages/manifest.json`:
```json
{
  "dependencies": {
    "com.unity.nuget.newtonsoft-json": "3.2.2"
  }
}
```

Corresponds to Newtonsoft.Json `13.0.2`.

> **Never install both** the official Unity package and the community fork simultaneously — GUID conflicts will occur and the build will break.

---

## Core API

### Serialize

```csharp
string json       = JsonConvert.SerializeObject(value);
string jsonPretty = JsonConvert.SerializeObject(value, Formatting.Indented);
string jsonCustom = JsonConvert.SerializeObject(value, settings);
```

### Deserialize

```csharp
// Preferred — generic, compile-time safe
MyType obj = JsonConvert.DeserializeObject<MyType>(json);
MyType obj = JsonConvert.DeserializeObject<MyType>(json, settings);

// Non-generic (returns object — avoid unless necessary)
object obj = JsonConvert.DeserializeObject(json);

// Anonymous type helper
var template = new { Name = "", Score = 0 };
var anon = JsonConvert.DeserializeAnonymousType(json, template);
```

### JsonSerializer (stream-based)

Use `JsonSerializer` directly when working with streams or needing maximum performance:

```csharp
var serializer = JsonSerializer.Create(settings);

// Serialize to stream
using var sw = new StringWriter();
using var jw = new JsonTextWriter(sw);
serializer.Serialize(jw, value);
string result = sw.ToString();

// Deserialize from stream
using var sr = new StringReader(json);
using var jr = new JsonTextReader(sr);
var obj = serializer.Deserialize<MyType>(jr);
```

---

## JsonSerializerSettings

Create a **shared settings instance** — never create new `JsonSerializerSettings` per call (allocates garbage and resets customizations):

```csharp
private static readonly JsonSerializerSettings _settings = new JsonSerializerSettings
{
    Formatting            = Formatting.None,              // Compact; use Indented only for debug output
    NullValueHandling     = NullValueHandling.Ignore,     // Skip null fields to reduce payload size
    DefaultValueHandling  = DefaultValueHandling.Include,
    MissingMemberHandling = MissingMemberHandling.Ignore, // Safe deserialization of partial JSON
    ReferenceLoopHandling = ReferenceLoopHandling.Ignore, // Required when any Unity type appears in the graph
    MaxDepth              = 32,                           // Guard against deep-graph stack overflow
    DateTimeZoneHandling  = DateTimeZoneHandling.Utc,
    Converters            = new List<JsonConverter>
    {
        new StringEnumConverter()                         // Serialize enums as strings, not integers
    }
};

// Register globally — applied whenever no explicit settings are passed to JsonConvert
[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
private static void InitJsonSettings()
{
    JsonConvert.DefaultSettings = () => _settings;
}
```

**Key settings at a glance:**

| Setting | Default | Recommended for Unity |
|---------|---------|----------------------|
| `NullValueHandling` | `Include` | `Ignore` — reduces JSON size |
| `ReferenceLoopHandling` | `Error` | `Ignore` — Unity types have circular refs |
| `TypeNameHandling` | `None` | Keep `None` — see Security section |
| `MissingMemberHandling` | `Ignore` | `Ignore` — forward-compatible deserialization |
| `MaxDepth` | `64` | `32` — prevents stack overflow on deep graphs |
| `Formatting` | `None` | `None` in production, `Indented` for debug |

---

## Serialization Attributes

Use attributes to control exactly what and how fields/properties are included:

```csharp
[JsonObject(MemberSerialization.OptIn)]       // Only [JsonProperty]-marked members are serialized
public class PlayerData
{
    [JsonProperty("player_id")]                // Custom JSON key — stable across refactoring
    public int Id { get; set; }

    [JsonProperty(Required = Required.Always)] // Throws if missing during deserialization
    public string Name { get; set; }

    [JsonProperty("email", NullValueHandling = NullValueHandling.Ignore)]
    public string Email { get; set; }          // Omitted when null

    [JsonIgnore]                               // Never included in JSON
    public string InternalState { get; set; }

    [JsonProperty("created_at")]
    [JsonConverter(typeof(IsoDateTimeConverter))]
    public DateTime CreatedAt { get; set; }

    [JsonProperty("status")]
    [JsonConverter(typeof(StringEnumConverter))]
    public PlayerStatus Status { get; set; }

    [JsonExtensionData]                        // Captures unknown JSON keys during deserialization
    public IDictionary<string, JToken> Extra { get; set; }
}
```

**Conditional serialization** — add a `ShouldSerialize{PropertyName}()` method to exclude a property at runtime:

```csharp
public bool ShouldSerializeEmail() => !string.IsNullOrEmpty(Email);
```

**Member serialization modes:**

| Mode | Behavior |
|------|---------|
| `OptOut` (default) | All public members unless `[JsonIgnore]` |
| `OptIn` | Only members explicitly marked `[JsonProperty]` |
| `Fields` | All public and private fields |

Prefer `OptIn` for data classes — prevents accidental serialization of new properties.

---

## Custom Converters

Inherit from `JsonConverter<T>` (strongly typed, preferred over non-generic `JsonConverter`):

```csharp
public class Vector3Converter : JsonConverter<Vector3>
{
    public override void WriteJson(JsonWriter writer, Vector3 value, JsonSerializer serializer)
    {
        writer.WriteStartObject();
        writer.WritePropertyName("x"); writer.WriteValue(value.x);
        writer.WritePropertyName("y"); writer.WriteValue(value.y);
        writer.WritePropertyName("z"); writer.WriteValue(value.z);
        writer.WriteEndObject();
    }

    public override Vector3 ReadJson(JsonReader reader, Type objectType,
        Vector3 existingValue, bool hasExistingValue, JsonSerializer serializer)
    {
        JObject jo = JObject.Load(reader);
        return new Vector3(
            jo["x"]?.Value<float>() ?? 0f,
            jo["y"]?.Value<float>() ?? 0f,
            jo["z"]?.Value<float>() ?? 0f
        );
    }
}
```

Register globally via `settings.Converters.Add(new Vector3Converter())` or per-property:
```csharp
[JsonConverter(typeof(Vector3Converter))]
public Vector3 Position { get; set; }
```

---

## LINQ to JSON

Use `JObject` / `JArray` / `JToken` when the JSON structure is unknown at compile time or when partial parsing is needed:

```csharp
// Parse
JObject obj  = JObject.Parse(json);
JArray  arr  = JArray.Parse(jsonArray);
JToken  root = JToken.Parse(anyJson);      // Use when the root may be object or array

// Read values
string name  = obj["name"]?.Value<string>();
int    score = (int)obj["score"];

// Modify
obj["name"]  = "NewName";
obj["tags"]  = new JArray("rpg", "action");
obj.Remove("obsolete_field");

// JSONPath queries
JToken first             = obj.SelectToken("store.books[0].title");
IEnumerable<JToken> all = obj.SelectTokens("store.books[?(@.price < 15)]");
IEnumerable<JToken> prices = obj.SelectTokens("$..price"); // Recursive descent

// SelectToken with errorWhenNoMatch: false returns null instead of throwing
JToken maybe = obj.SelectToken("store.nonexistent", errorWhenNoMatch: false);

// Build programmatically
var data = new JObject(
    new JProperty("id",   42),
    new JProperty("tags", new JArray("rpg", "action"))
);

// Round-trip between LINQ and strongly-typed
MyType typed = obj.ToObject<MyType>(JsonSerializer.Create(_settings));
JObject back = JObject.FromObject(typed, JsonSerializer.Create(_settings));
```

---

## Unity-Specific Setup

### Handling Unity Types

Unity types (`Vector3`, `Quaternion`, `Color`, `Transform`, etc.) contain circular object graph references and will cause `JsonSerializationException: Self referencing loop detected` with the default settings.

**Always set `ReferenceLoopHandling = ReferenceLoopHandling.Ignore`** as a baseline.

For types you actually need to serialize, write a custom `JsonConverter<T>` (see Custom Converters section). Common Unity types that require converters:

| Unity Type | Approach |
|-----------|---------|
| `Vector2`, `Vector3`, `Vector4` | Custom converter (serialize as `{x, y, z}`) |
| `Quaternion` | Custom converter (serialize as `{x, y, z, w}`) |
| `Color` | Custom converter (serialize as `{r, g, b, a}`) |
| `Rect` | Custom converter |
| `LayerMask` | Serialize `.value` (int) directly |

**Never serialize `MonoBehaviour`, `GameObject`, or `Component`** — always define plain C# DTO classes and serialize those:

```csharp
// BAD — serializes Unity object graph, always crashes
string bad = JsonConvert.SerializeObject(this.gameObject);

// GOOD — serialize a plain data class
var dto = new PlayerDto { Name = player.Name, Score = player.Score };
string json = JsonConvert.SerializeObject(dto, _settings);
```

### IL2CPP / AOT (WebGL, iOS, Android)

IL2CPP performs Ahead-Of-Time (AOT) compilation and strips unused code. Json.NET uses reflection heavily, which can cause `ExecutionEngineException: Attempting to JIT compile method` at runtime on IL2CPP platforms.

**1. Add `link.xml` to prevent stripping of Json.NET internals:**

```xml
<!-- Assets/link.xml -->
<linker>
  <assembly fullname="Newtonsoft.Json" preserve="all"/>
</linker>
```

**2. Use `AotHelper` to register generic types that will be deserialized at runtime:**

```csharp
[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
private static void EnsureAotTypes()
{
    AotHelper.EnsureList<PlayerData>();
    AotHelper.EnsureList<LevelData>();
    AotHelper.EnsureDictionary<string, PlayerData>();
    AotHelper.EnsureDictionary<string, int>();
}
```

**3. Avoid `dynamic`** — dynamic dispatch requires JIT compilation, which is unavailable on IL2CPP. Use `JObject` / `JToken` as an alternative for dynamic JSON handling.

**4. Prefer explicit generic overloads** — always use `DeserializeObject<T>()` rather than non-generic `DeserializeObject()`.

---

## Best Practices

- **Cache `JsonSerializerSettings`** as a static field — create once, reuse for all calls.
- **Set `JsonConvert.DefaultSettings` globally** in a `[RuntimeInitializeOnLoadMethod]` — eliminates passing settings to every call.
- **Use `[JsonObject(MemberSerialization.OptIn)]`** for data classes that require strict serialization control — prevents accidental exposure of new properties.
- **Use `[JsonProperty]` with explicit names** — names are stable across property renames and refactoring.
- **Use `StringEnumConverter`** for all enums — numeric values break when enum members are reordered or renamed.
- **Use plain C# DTOs** for all data that crosses the serialization boundary — never serialize `MonoBehaviour` or other Unity objects directly.
- **Add `link.xml`** for every project targeting IL2CPP — even if no AOT issues manifest during development, they can appear after stripping changes.

---

## Anti-patterns

- **`TypeNameHandling.All` or `TypeNameHandling.Objects` with untrusted input** — this is a well-documented deserialization gadget attack. When `TypeNameHandling` is active, the `$type` field in JSON can instantiate arbitrary .NET types. Never use `TypeNameHandling` when deserializing user-provided or network-received JSON. If polymorphism is required, implement a custom `ISerializationBinder` with a strict whitelist.

- **Serializing `MonoBehaviour`, `GameObject`, or `Component`** — always causes circular reference errors or `MissingReferenceException`. Model data as plain C# DTOs and serialize those.

- **Creating `JsonSerializerSettings` per call** — allocates garbage on every operation and loses all registered converters unless recreated. Create once, cache statically.

- **Leaving `ReferenceLoopHandling` at the default `Error`** — any Unity type in the object graph will throw immediately. Set to `Ignore` in the shared settings.

- **Using `dynamic` with IL2CPP targets** — fails at runtime with `ExecutionEngineException`. Use `JObject`/`JToken` instead.

- **Skipping `link.xml` for IL2CPP builds** — code stripping silently removes reflection-required types, causing runtime failures that don't appear in the Unity Editor.

- **Installing both `com.unity.nuget.newtonsoft-json` and the community fork** — causes GUID conflicts and unpredictable build failures.
