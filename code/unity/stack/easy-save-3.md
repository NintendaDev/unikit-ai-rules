---
version: 1.0.0
---

# Easy Save 3

> **Scope**: Easy Save 3 (ES3) data persistence system — save and load operations, ES3Settings configuration, serialization control, caching, reference management, encryption, backup, and save slot patterns for Unity projects.
> **Load when**: saving or loading game data with ES3, configuring ES3Settings, managing save files or save slots, serializing custom types or writing ES3Type scripts, dealing with reference loading warnings, implementing encrypted or compressed saves, optimizing save performance with caching.

---

## Core Concepts

Easy Save 3 is a key-value persistence system. Data is stored with a string key inside files located at `Application.persistentDataPath` by default.

- Files default to JSON format stored in `Application.persistentDataPath`
- Use separate files to logically group data (e.g., `player.es3`, `settings.es3`, `world.es3`)
- Keys must be unique within a file — duplicate keys silently overwrite previous values
- Call `ES3.Init()` from the main thread (e.g., in `Awake`) when using ES3 on background threads

## API / Interface

### ES3 — Primary Static Class

```csharp
// Save
ES3.Save<T>(string key, T value);
ES3.Save<T>(string key, T value, string filePath);
ES3.Save<T>(string key, T value, string filePath, ES3Settings settings);

// Load — always provide a default value to avoid KeyNotFoundException on first run
T value = ES3.Load<T>(string key, T defaultValue);
T value = ES3.Load<T>(string key, string filePath, T defaultValue);
T value = ES3.Load<T>(string key, string filePath, T defaultValue, ES3Settings settings);

// Load into an existing object (preserves object references; preferred over Load when object already exists)
ES3.LoadInto<T>(string key, T objectToLoadInto);
ES3.LoadInto<T>(string key, string filePath, T objectToLoadInto);

// Existence checks
bool exists = ES3.KeyExists(string key);
bool exists = ES3.KeyExists(string key, string filePath);
bool exists = ES3.FileExists(string filePath);

// Deletion
ES3.DeleteKey(string key);
ES3.DeleteKey(string key, string filePath);
ES3.DeleteFile(string filePath);
ES3.DeleteDirectory(string directoryPath);

// Caching
ES3.CacheFile(string filePath);           // load file from disk into RAM
ES3.StoreCachedFile(string filePath);     // flush RAM cache back to disk

// Backup
ES3.CreateBackup(string filePath);
ES3.RestoreBackup(string filePath);

// File utilities
string[] keys = ES3.GetKeys(string filePath);
string[] files = ES3.GetFiles(string directoryPath);
ES3.CopyFile(string oldPath, string newPath);
ES3.RenameFile(string oldPath, string newPath);
DateTime ts = ES3.GetTimestamp(string filePath);

// Media
ES3.SaveImage(string filePath, Texture2D texture);
Texture2D tex = ES3.LoadImage(string filePath);
AudioClip clip = ES3.LoadAudio(string filePath, AudioType audioType);
```

### ES3Settings — Configuration Object

```csharp
var settings = new ES3Settings
{
    location           = ES3.Location.File,         // File (default), PlayerPrefs, Cache, Cloud
    directory          = "SaveData",                 // subfolder under persistentDataPath
    encryptionType     = ES3.EncryptionType.AES,
    encryptionPassword = "your-secret-key",
    compressionType    = ES3.CompressionType.Gzip,
    format             = ES3.Format.JSON,            // JSON (default) or Binary
    bufferSize         = 2048,
    encoding           = System.Text.Encoding.UTF8
};
```

| Location | Storage target |
|---|---|
| `ES3.Location.File` | `Application.persistentDataPath` (default) |
| `ES3.Location.PlayerPrefs` | Unity PlayerPrefs — small data only |
| `ES3.Location.Cache` | RAM — must flush manually with `StoreCachedFile` |
| `ES3.Location.Cloud` | ES3Cloud server |

### ES3Writer / ES3Reader — Batch Operations

Use inside `using` blocks for batch read/write. More efficient than many separate `ES3.Save`/`ES3.Load` calls.

```csharp
// Batch write
using (var writer = ES3Writer.Create("save.es3"))
{
    writer.Write("name",     playerName);
    writer.Write("level",    playerLevel);
    writer.Write("position", transform.position);
}

// Batch read
using (var reader = ES3Reader.Create("save.es3"))
{
    string  name  = reader.Read<string>("name");
    int     level = reader.Read<int>("level");
    Vector3 pos   = reader.Read<Vector3>("position");
}

// Iterate all keys
using (var reader = ES3Reader.Create("save.es3"))
{
    foreach (string key in reader.Properties)
        Debug.Log(key);
}
```

## Patterns & Examples

### Basic Save / Load

```csharp
// Save
ES3.Save("health", currentHealth);
ES3.Save("inventory", inventoryList);

// Load with default (safe on first run)
float health = ES3.Load<float>("health", 100f);
List<Item> inv = ES3.Load<List<Item>>("inventory", new List<Item>());

// Load without default — check existence first (use only when no sensible default exists)
if (ES3.KeyExists("saveVersion"))
    int version = ES3.Load<int>("saveVersion", 0);
```

### Timing: When to Save and Load

```csharp
// Load in Start, save on quit/pause — covers desktop and mobile
void Start()          => ES3.LoadInto<PlayerData>("player", playerData);
void OnApplicationQuit()              => ES3.Save("player", playerData);
void OnApplicationPause(bool paused)  { if (paused) ES3.Save("player", playerData); }
```

### Custom Serializable Data Class

```csharp
[System.Serializable]
public class PlayerData
{
    public string  name;
    public int     level;
    public float   health;
    public Vector3 position;
    // UnityEngine.Object fields (Sprite, Texture2D, etc.) are saved by reference — see pitfalls
}

// Save
ES3.Save("playerData", new PlayerData { name = "Hero", level = 10 });

// Load into existing instance (avoids creating a new object — recommended)
var data = new PlayerData();
ES3.LoadInto("playerData", data);
```

### Caching Pattern (frequent access or performance-critical)

Load the file into RAM once per session; all subsequent reads/writes go to RAM; flush to disk on exit.

```csharp
void Start()
{
    ES3.CacheFile("stats.es3");            // one disk read
}

void OnScoreChanged()
{
    ES3.Save("score", score, "stats.es3"); // RAM only — no disk I/O
}

void OnApplicationQuit()
{
    ES3.StoreCachedFile("stats.es3");      // one disk write
}
```

To enable caching globally: **Tools > Easy Save 3 > Settings > Location > Cache**. The default file is cached automatically on startup and flushed each frame.

### Backup Before Overwrite

```csharp
void SaveGame(string file)
{
    ES3.CreateBackup(file);                // keep previous state safe
    ES3.Save("level", currentLevel, file);
    ES3.Save("gold",  gold,         file);
    // On corruption: ES3.RestoreBackup(file);
}
```

### Encryption

```csharp
var settings = new ES3Settings
{
    encryptionType     = ES3.EncryptionType.AES,
    encryptionPassword = "your-secret-key"    // store in a ScriptableObject, not hardcoded
};

ES3.Save<int>("currency", goldAmount, "secure.es3", settings);
int gold = ES3.Load<int>("currency", 0, "secure.es3", settings);
// Use the same settings for Save and Load — mismatched settings will fail to decrypt
```

### Save Slots

```csharp
// Let ES3SlotManager manage slot selection via built-in UI (recommended)
// After the player selects a slot, calls without a file path use it automatically:
ES3.Save("progress", progressData);        // uses selected slot path
ES3.Load<ProgressData>("progress", defaultProgress);

// Access current slot path for display or logging
string slotPath = ES3SlotManager.selectedSlotPath;  // null if none selected

// Trigger Auto Save manually
ES3AutoSaveMgr.Current.Save();
ES3AutoSaveMgr.Current.Load();
ES3AutoSaveMgr.Current.settings.path = "custom_slot.es3";
```

## Serialization Control

### Attributes

```csharp
public class MyBehaviour : MonoBehaviour
{
    public float speed;                            // saved (public)
    [SerializeField] private int _health;          // saved (SerializeField)
    [ES3Serializable] private float _stamina;      // saved (ES3 explicit opt-in for private)
    [ES3NonSerializable] public float debugValue;  // excluded
    [NonSerialized] public float transient;        // excluded (standard Unity)
    public const int Version = 1;                  // excluded (const is never saved)
}
```

### Custom ES3Type (for types you cannot annotate)

Generate via **Window > Easy Save 3 > Types** tab. Modify the generated script only when:
- The type lacks a parameterless constructor
- Methods must be called to initialize variables before assignment

```csharp
// WriteComponent — define which fields to save
protected override void WriteComponent(object obj, ES3Writer writer)
{
    var instance = (MyScript)obj;
    writer.WriteProperty<int>("points",   instance.points);
    writer.WriteProperty<float>("speed",  instance.speed);
    writer.WriteProperty<Transform>("partner", instance.partner);
}

// ReadComponent — restore fields by name; always call reader.Skip() on unknown properties
protected override void ReadComponent<T>(ES3Reader reader, object obj)
{
    var instance = (MyScript)obj;
    foreach (string prop in reader.Properties)
    {
        switch (prop)
        {
            case "points":  instance.points  = reader.Read<int>();       break;
            case "speed":   instance.speed   = reader.Read<float>();     break;
            case "partner": instance.partner = reader.Read<Transform>(); break;
            default: reader.Skip(); break;   // must skip unknown properties
        }
    }
}

// For non-default constructors — override ReadObject to supply constructor arguments
protected override object ReadObject(ES3Reader reader)
{
    var instance = new MyClass(/* required args */);
    ReadObject(reader, instance);
    return instance;
}
```

## Supported Types

ES3 serializes the following out of the box:

- **Primitives:** `int`, `float`, `string`, `bool`, `byte`, `char`, `double`, `long`, `short`, `uint`, `ulong`, `ushort`
- **Structs and enums**
- **Non-generic classes** with a parameterless constructor
- **`MonoBehaviour` and `ScriptableObject`** subclasses
- **Collections** of supported types: `Array`, `List<T>`, `Dictionary<K,V>`, `Queue<T>`, `Stack<T>`, `HashSet<T>`, `Tuple`, `ArrayList`, `NativeArray<T>`
- **Unity native types:** `Vector2/3/4`, `Quaternion`, `Color`, `Rect`, `Transform`, `GameObject`, `Camera`, `Light`, `AnimationCurve`, `Gradient`, `Mesh`, `Texture2D` (by ref by default), and 50+ more

**Serialization requirements:** fields must be `public` or marked `[SerializeField]`/`[ES3Serializable]`. Fields that are `const`, `readonly`, `[Obsolete]`, `[NonSerialized]`, or `[ES3NonSerializable]` are excluded.

## Best Practices

- **Separate data by concern** — use dedicated files (`player.es3`, `world.es3`, `settings.es3`) rather than one giant file; this prevents loading unrelated data.
- **Always provide a default value** in `ES3.Load<T>` — prevents `KeyNotFoundException` on a fresh install or after key rename.
- **Prefer `ES3.LoadInto`** over `ES3.Load` when the object already exists — preserves identity and avoids allocating a new instance.
- **Save only reconstructable state**, not transient runtime values (positions cached by physics, active particles, etc.).
- **Enable Gzip compression** for large save files on mobile — reduces storage and improves transfer speed.
- **Always back up** before overwriting a critical save file; `ES3.CreateBackup` is a one-liner.
- **Use caching** when the same file is read/written many times per session or per frame.
- **Keep passwords out of source code** — store the encryption key in a `ScriptableObject` or retrieve it from a secure service at runtime.
- **Disable auto reference tracking** in large scenes (100k+ objects) — switch to manual management via **Tools > Easy Save 3 > Settings > Editor Settings** to avoid Editor slowdown.

## Anti-patterns

### Saving `UnityEngine.Object` fields by value accidentally
Changing `MemberReferenceMode` to `ByValue` or `ByRefAndValue` for Sprite/Texture2D fields serializes raw uncompressed pixel data — files can grow to hundreds of MB. Keep those fields as `ByRef` and save texture data explicitly with `ES3.SaveImage`.

### Loading references before their targets exist
If object A references object B, and you load A before loading B, the reference in A will be null. **Fix:** load referenced objects first, or call `Load` twice — once to instantiate all objects, then again to resolve their references.

### Loading without a default value
`ES3.Load<int>("key")` (no default) throws `KeyNotFoundException` when the key does not exist. Always pass a default: `ES3.Load<int>("key", 0)`.

### Using explicit file paths with save slots
`ES3.Save("key", value, "hardcoded.es3")` bypasses the slot system — the slot manager's selected path is ignored. Omit the file path argument to let slot management work correctly.

### Calling ES3 from a background thread without initialization
ES3 is not thread-safe. If you must use it off the main thread, call `ES3.Init()` from the main thread first (once in `Awake` is sufficient) and ensure only one thread accesses ES3 at a time. Prefer caching + coroutines over raw threading.

### Mismatched ES3Settings between Save and Load
Saving with AES encryption and loading without `encryptionType = ES3.EncryptionType.AES` (or with a different password) will silently fail or throw. Reuse the same `ES3Settings` instance for both Save and Load calls.

### Not calling `ES3.StoreCachedFile` when using Cache location
Data saved to `ES3.Location.Cache` lives only in RAM. If the app crashes before `StoreCachedFile` is called, all unsaved changes are lost. Always flush in `OnApplicationQuit` and `OnApplicationPause(true)`.
