version: 1.0.0

# Data Assets

> **Scope**: Unreal Engine's data asset system — `UDataAsset` and `UPrimaryDataAsset` class usage, Asset Manager integration, async loading patterns, Asset Bundle configuration, `TSoftObjectPtr`/`TSoftClassPtr` soft references, and data-driven architecture design in UE5.
> **Load when**: creating or using `UDataAsset` or `UPrimaryDataAsset` subclasses, configuring Asset Manager, implementing async content loading, defining Asset Bundles, using `TSoftObjectPtr` or `TSoftClassPtr` in data types, debugging missing primary asset types, designing data-driven systems, choosing between DataAsset and DataTable.

---

## Core Concepts

**UDataAsset** — simple `UObject` subclass for pure data containers. Always loads when directly referenced by any hard pointer. Use for small, always-needed config that does not require lifecycle control.

**UPrimaryDataAsset** — extends `UDataAsset` with a built-in `GetPrimaryAssetId()` implementation and Asset Bundle support. Use when assets need to be discovered, loaded, and unloaded via the Asset Manager, or when selective (bundle-based) loading is needed.

**Primary Asset** — any `UObject` that returns a valid `FPrimaryAssetId` from `GetPrimaryAssetId()`. All `UPrimaryDataAsset` subclasses are primary by default. Plain `UObject` subclasses can also become primary assets by overriding `GetPrimaryAssetId()`.

**Secondary Asset** — any asset loaded automatically because a Primary Asset holds a (hard or soft) reference to it. Not directly managed by the Asset Manager.

**FPrimaryAssetId** — a two-part identifier: `Type` (category name, e.g., `"Monsters"`) and `Name` (unique name within that type, typically `GetFName()`). Example: `"Monsters:Goblin_01"`.

**Asset Bundle** — a named group of soft-reference properties on a Primary Asset. All properties tagged with the same bundle name are loaded and unloaded together. Enables context-specific loading: load only the `"UI"` bundle for menus; load the `"Game"` bundle when spawning gameplay content.

**TSoftObjectPtr / TSoftClassPtr** — soft (lazy) references to assets or classes. Do not cause automatic loading; content is only loaded when explicitly requested. Required for Asset Bundle tagging.

**FStreamableHandle** — RAII handle for async-loaded content. Assets stay in memory while the handle is alive. Must be stored as a member variable (not a local) to keep content in memory.

## Class Selection

| Situation | Class |
|-----------|-------|
| Small, always-needed config (no lifecycle control) | `UDataAsset` |
| Asset Manager-controlled loading/unloading, bundles | `UPrimaryDataAsset` |
| Many homogeneous rows (e.g., level-scaling stat tables) | `UDataTable` + `FTableRowBase` |
| Custom class that cannot inherit DataAsset hierarchy | `UObject` + `GetPrimaryAssetId()` override |
| Game-wide singleton settings referenced by Subsystems | `UDataAsset` or `UPrimaryDataAsset` |

Prefer `UPrimaryDataAsset` over `UDataAsset` in any medium-to-large project. It enables async loading and Asset Bundles with no extra overhead if those features are never used.

## GetPrimaryAssetId()

`UPrimaryDataAsset` provides a default implementation that derives the type from the class name and the name from the asset `FName`. Override only when a custom type name or dynamic type resolution is needed:

```cpp
// Override for a fixed custom type name
FPrimaryAssetId UMonsterData::GetPrimaryAssetId() const
{
    return FPrimaryAssetId("Monsters", GetFName());
}

// Override for a configurable type (type stored as a UPROPERTY on each asset)
FPrimaryAssetId UItemData::GetPrimaryAssetId() const
{
    return FPrimaryAssetId(ItemType, GetFName()); // ItemType is an FPrimaryAssetType property
}
```

**After adding or changing `GetPrimaryAssetId()` on existing assets:** resave all existing Data Asset instances so the new ID is serialized to disk. Existing `.uasset` files retain the old (stale or empty) ID until resaved.

## Asset Manager Configuration

Register each `UPrimaryDataAsset` subclass in **Project Settings → Game → Asset Manager**, or directly in `DefaultGame.ini`:

```ini
[/Script/Engine.AssetManagerSettings]
+PrimaryAssetTypesToScan=(
    PrimaryAssetType="Monsters",
    AssetBaseClass=/Script/MyGame.MonsterData,
    bHasBlueprintClasses=False,
    bIsEditorOnly=False,
    Directories=((Path="/Game/Data/Monsters")),
    Rules=(Priority=-1,ChunkId=-1,bApplyRecursively=True,CookRule=Unknown)
)
```

Key fields:
- `PrimaryAssetType` — must match the string returned by `GetPrimaryAssetId().PrimaryAssetType`
- `AssetBaseClass` — the C++ class path (or Blueprint base)
- `Directories` — paths the editor scans for instances
- `bHasBlueprintClasses` — set `true` if instances are Blueprint subclasses

**If this registration is missing:** `GetPrimaryAssetIdList` returns nothing and `LoadPrimaryAsset` silently fails with no error message.

## Asset Bundles

Tag soft-reference properties with named bundles using the `AssetBundles` meta specifier:

```cpp
UCLASS(BlueprintType)
class MYGAME_API UCharacterData : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    // No bundle tag — always loads when the Primary Asset itself is loaded
    UPROPERTY(EditDefaultsOnly, Category="Base")
    FText DisplayName;

    // Loaded only when the "UI" bundle is requested
    UPROPERTY(EditDefaultsOnly, Category="Visual", meta=(AssetBundles = "UI"))
    TSoftObjectPtr<UTexture2D> Portrait;

    // Loaded only when the "Game" bundle is requested
    UPROPERTY(EditDefaultsOnly, Category="Gameplay", meta=(AssetBundles = "Game"))
    TSoftClassPtr<APawn> PawnClass;

    // Loaded when either "Game" or "Audio" bundle is requested
    UPROPERTY(EditDefaultsOnly, Category="Audio", meta=(AssetBundles = "Game,Audio"))
    TSoftObjectPtr<USoundBase> SpawnSound;
};
```

Properties without `AssetBundles` meta load immediately when the Primary Asset loads. Tag everything that should not be universally loaded.

## Soft References

Use `TSoftObjectPtr<T>` for asset references (textures, meshes, sounds, data assets):
```cpp
UPROPERTY(EditDefaultsOnly, meta=(AssetBundles = "Game"))
TSoftObjectPtr<USkeletalMesh> CharacterMesh;
```

Use `TSoftClassPtr<T>` for class references (Blueprint actors, ability classes):
```cpp
UPROPERTY(EditDefaultsOnly, meta=(AssetBundles = "Game"))
TSoftClassPtr<ACharacter> CharacterClass;
```

Do not use `TObjectPtr` or `TSubclassOf` for properties that should belong to an Asset Bundle — hard references defeat lazy loading and always load the referenced asset.

## Async Loading

### Load a single Primary Asset

```cpp
void AMyGameMode::RequestMonsterLoad(FPrimaryAssetId MonsterId, FVector SpawnLocation)
{
    UAssetManager* Manager = UAssetManager::GetIfValid();
    if (!Manager) { return; }

    TArray<FName> Bundles = { "Game" };
    FStreamableDelegate Delegate = FStreamableDelegate::CreateUObject(
        this, &AMyGameMode::OnMonsterLoaded, MonsterId, SpawnLocation);

    Manager->LoadPrimaryAsset(MonsterId, Bundles, Delegate);
}

void AMyGameMode::OnMonsterLoaded(FPrimaryAssetId LoadedId, FVector SpawnLocation)
{
    UAssetManager* Manager = UAssetManager::GetIfValid();
    if (!Manager) { return; }

    UMonsterData* Data = Cast<UMonsterData>(Manager->GetPrimaryAssetObject(LoadedId));
    if (Data && !Data->SpawnClass.IsNull())
    {
        GetWorld()->SpawnActor<AActor>(Data->SpawnClass.Get(), SpawnLocation, FRotator::ZeroRotator);
    }
}
```

### Load multiple Primary Assets

```cpp
TArray<FPrimaryAssetId> AssetIds = { ... };
TArray<FName> Bundles = { "UI" };

UAssetManager::Get().LoadPrimaryAssets(AssetIds, Bundles,
    FStreamableDelegate::CreateUObject(this, &UMyWidget::OnAllAssetsLoaded));
```

### FStreamableHandle lifetime

```cpp
// .h — store the handle as a member to keep assets in memory
class AMyActor : public AActor
{
    TSharedPtr<FStreamableHandle> AssetHandle;
};

// .cpp — capture and store the returned handle
AssetHandle = UAssetManager::Get().LoadPrimaryAsset(AssetId, Bundles, Delegate);

// Explicit unload
UAssetManager::Get().UnloadPrimaryAsset(AssetId);
AssetHandle.Reset();
```

Never store `FStreamableHandle` as a local function variable — assets are released when the local handle is destroyed at the end of the scope.

### Preload vs Load

| API | AM holds strong reference | When content is released |
|-----|--------------------------|--------------------------|
| `LoadPrimaryAsset` | Yes | Explicit `UnloadPrimaryAsset` |
| `PreloadPrimaryAsset` | No | When the returned handle goes out of scope |

Use `PreloadPrimaryAsset` for speculative content (loot, conditional spawns, rewards). If the condition doesn't fire, dropping the handle auto-unloads without manual tracking.

## Accessing Loaded Assets

```cpp
// Get a single loaded asset by ID
UMyData* Data = Cast<UMyData>(
    UAssetManager::Get().GetPrimaryAssetObject(AssetId));

// Get all loaded instances of a type
TArray<UObject*> AllMonsters;
UAssetManager::Get().GetPrimaryAssetObjectList("Monsters", AllMonsters);

// Get IDs of all registered assets of a type (not necessarily loaded)
TArray<FPrimaryAssetId> MonsterIds;
UAssetManager::Get().GetPrimaryAssetIdList("Monsters", MonsterIds);
```

Use `UAssetManager::GetIfValid()` (instead of `Get()`) in code that may run before the Asset Manager is fully initialized (e.g., module startup, early game phase).

## Naming Conventions

- Asset files: `DA_` prefix — e.g., `DA_Monster_Goblin`, `DA_Weapon_Sword`
- C++ classes: standard `U` prefix — e.g., `UMonsterData`, `UItemDefinition`
- Primary Asset Type string: singular PascalCase noun — e.g., `"Monster"`, `"Weapon"`, `"ShipConfig"`
- Bundle names: PascalCase context noun — e.g., `"UI"`, `"Game"`, `"Lobby"`, `"Menu"`

## Anti-patterns

- **Hard reference on a bundled property** — using `TObjectPtr<UTexture2D>` or `TSubclassOf<>` instead of `TSoftObjectPtr`/`TSoftClassPtr` → the asset always loads, defeating the bundle system.
- **Missing Asset Manager registration** — subclass not listed in `PrimaryAssetTypesToScan` → `LoadPrimaryAsset` silently fails with no error.
- **Logic inside Data Asset classes** — Data Assets are pure data containers. Gameplay logic belongs in Actors, Components, and Subsystems that read from Data Assets.
- **`LoadSynchronous()` on large assets** — stalls the game thread and blocks the async load queue. Use async loading with a delegate callback instead.
- **Local-variable handle** — `TSharedPtr<FStreamableHandle> Handle = Manager->LoadPrimaryAsset(...)` declared as a local → assets unload when the function returns.
- **`NewObject<UMyDataAsset>()` at runtime** — Data Assets are editor-created, packaged assets. Never instantiate them at runtime; obtain references to existing ones.
- **Forgetting to resave instances after `GetPrimaryAssetId()` change** — existing `.uasset` files keep the old ID until manually resaved.
- **Circular soft references** — PDA A's soft ref points to PDA B, which soft-references back to PDA A → creates a load cycle; keep the reference graph acyclic.
