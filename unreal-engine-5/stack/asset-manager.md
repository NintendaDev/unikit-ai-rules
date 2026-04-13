---
version: 1.0.0
---

# Asset Manager

> **Scope**: UAssetManager, Primary/Secondary Assets, FPrimaryAssetId, Asset Bundles, FStreamableManager, async/sync loading, TSoftObjectPtr, TSoftClassPtr, soft/hard references, asset discovery, chunking, cooking rules
> **Load when**: managing async asset loading through UAssetManager — declaring UPrimaryDataAsset types and FPrimaryAssetId, choosing between TSoftObjectPtr/TSoftClassPtr and hard references, organizing soft refs into asset bundles, loading or preloading primary assets via FStreamableManager, subclassing UAssetManager and registering primary asset types in DefaultGame.ini

---

## Core Concepts

### Primary vs Secondary Assets

- **Primary Assets** are manually loaded/unloaded by the Asset Manager via `FPrimaryAssetId` (Type:Name pair). By default only `UWorld` (levels) are Primary.
- **Secondary Assets** are loaded automatically as dependencies of Primary Assets (textures, meshes, sounds, materials).
- To make any `UObject` a Primary Asset, override `GetPrimaryAssetId()` to return a valid `FPrimaryAssetId`.

### Hard vs Soft References

| Type | Loading | Use When |
|------|---------|----------|
| `TObjectPtr<T>` / `UObject*` | Automatic with owner | Core assets always needed |
| `TSubclassOf<T>` | Automatic with owner | Classes always needed at load |
| `TSoftObjectPtr<T>` | On-demand only | Optional/deferred content |
| `TSoftClassPtr<T>` | On-demand only | Dynamically spawned types |

- Hard references create dependency chains — loading A loads B which loads C.
- Soft references store only a path string — break dependency chains, load explicitly.
- **Default to soft references** unless the asset must be available immediately.

---

## API / Interface

### FPrimaryAssetId

Uniquely identifies a Primary Asset — composed of `FPrimaryAssetType` (FName) + asset name (FName):

```cpp
FPrimaryAssetId WeaponId = FPrimaryAssetId(FPrimaryAssetType("Weapon"), FName("Weapon_Hammer_3"));
// String form: "Weapon:Weapon_Hammer_3"
```

### UPrimaryDataAsset

Base class for data-only Primary Assets. Has a working `GetPrimaryAssetId()` using asset short name and native class:

```cpp
UCLASS(Blueprintable)
class MYGAME_API UMyZoneTheme : public UPrimaryDataAsset
{
    GENERATED_BODY()

    UPROPERTY(EditDefaultsOnly, Category = "Zone")
    FText ZoneName;

    // Soft ref — loads only with "Menu" bundle
    UPROPERTY(EditDefaultsOnly, Category = "Visual", meta = (AssetBundles = "Menu"))
    TSoftClassPtr<AGameMapTile> MapTileClass;

    // Soft ref — loads only with "Game" bundle
    UPROPERTY(EditDefaultsOnly, Category = "Gameplay", meta = (AssetBundles = "Game"))
    TSoftClassPtr<APawn> PawnClass;
};
```

A `UMyZoneTheme` saved as "Forest" gets ID `MyZoneTheme:Forest`.

### Custom GetPrimaryAssetId

For non-`UPrimaryDataAsset` classes:

```cpp
FPrimaryAssetId UMyObject::GetPrimaryAssetId() const
{
    return FPrimaryAssetId(TEXT("MyAssetType"), GetFName());
}
```

### UAssetManager Key Methods

| Method | Description |
|--------|-------------|
| `Get()` / `GetIfValid()` | Access global singleton |
| `StartInitialLoading()` | Override for custom init logic |
| `LoadPrimaryAsset(Id, Bundles, Delegate)` | Async load single asset, keeps in memory until unloaded |
| `LoadPrimaryAssets(Ids, Bundles, Delegate)` | Async load multiple assets |
| `PreloadPrimaryAssets(Ids, Bundles)` | Load assets, auto-unload when handle released |
| `GetPrimaryAssetObject<T>(Id)` | Get loaded asset pointer |
| `GetPrimaryAssetIdList(Type, OutList)` | Get all IDs of a type |
| `GetPrimaryAssetData(Id, OutData)` | Get FAssetData without loading |
| `UnloadPrimaryAsset(Id)` | Unload, allow GC |
| `UnloadPrimaryAssetList(Ids)` | Unload multiple |
| `ChangeBundleStateForPrimaryAssets(Ids, AddBundles, RemoveBundles)` | Change active bundles |
| `ScanPathsForPrimaryAssets(Type, Paths, BaseClass)` | Scan disk for assets |
| `AddDynamicAsset(Id, Path, BundleData)` | Register runtime-created asset |
| `ExtractSoftObjectPaths(Struct, Data, OutPaths)` | Gather soft refs from struct |
| `RecursivelyExpandBundleData(BundleData)` | Expand nested references |

### Load vs Preload

| Method | Lifetime | Use Case |
|--------|----------|----------|
| `LoadPrimaryAsset` | Stays in memory until `UnloadPrimaryAsset` | Persistent assets (equipped items, active abilities) |
| `PreloadPrimaryAssets` | Auto-unloads when `FStreamableHandle` released | Optional content (chest loot, preview thumbnails) |

### FStreamableManager

Lower-level async loading for non-Primary Assets. Asset Manager wraps it internally:

```cpp
FStreamableManager& Streamable = UAssetManager::GetStreamableManager();

TArray<FSoftObjectPath> AssetsToLoad;
AssetsToLoad.Add(SoftPtr.ToSoftObjectPath());

TSharedPtr<FStreamableHandle> Handle = Streamable.RequestAsyncLoad(
    AssetsToLoad,
    FStreamableDelegate::CreateUObject(this, &UMyClass::OnAssetsLoaded)
);
// Assets stay loaded while Handle is alive
```

Key methods:
- `RequestAsyncLoad(Paths, Delegate)` — async load, returns handle
- `RequestSyncLoad(Paths)` — synchronous load
- `LoadSynchronous<T>(SoftPtr)` — single asset sync load

### TSoftObjectPtr / TSoftClassPtr

```cpp
// Check state
SoftPtr.IsNull();    // Never set
SoftPtr.IsPending(); // Set but not loaded
SoftPtr.IsValid();   // Loaded and valid

// Synchronous load (blocks)
UMyAsset* Asset = SoftPtr.LoadSynchronous();

// Async load (non-blocking, UE 5.6+)
SoftPtr.LoadAsync(FLoadSoftObjectPathAsyncDelegate::CreateLambda([](FSoftObjectPath Path) {
    // Asset ready
}));

// Get if already loaded (returns nullptr if not)
UMyAsset* Asset = SoftPtr.Get();
```

---

## Patterns & Examples

### Custom Asset Manager Subclass

```cpp
// Header
UCLASS()
class MYGAME_API UMyGameAssetManager : public UAssetManager
{
    GENERATED_BODY()

public:
    static UMyGameAssetManager& Get();

    // Custom asset type names
    static const FPrimaryAssetType WeaponItemType;
    static const FPrimaryAssetType AbilityType;

    virtual void StartInitialLoading() override;
};

// Source
const FPrimaryAssetType UMyGameAssetManager::WeaponItemType = TEXT("Weapon");
const FPrimaryAssetType UMyGameAssetManager::AbilityType = TEXT("Ability");

UMyGameAssetManager& UMyGameAssetManager::Get()
{
    UMyGameAssetManager* Manager = Cast<UMyGameAssetManager>(GEngine->AssetManager);
    check(Manager);
    return *Manager;
}

void UMyGameAssetManager::StartInitialLoading()
{
    Super::StartInitialLoading();
    // Custom init logic here
}
```

Set in `DefaultEngine.ini`:
```ini
[/Script/Engine.Engine]
AssetManagerClassName=/Script/MyGame.MyGameAssetManager
```

### Async Load Single Primary Asset

```cpp
void AMyGameMode::LoadMonster(FPrimaryAssetId MonsterId, FVector SpawnLocation)
{
    if (UAssetManager* Manager = UAssetManager::GetIfValid())
    {
        TArray<FName> Bundles;
        Bundles.Add(FName("Game"));

        FStreamableDelegate Delegate = FStreamableDelegate::CreateUObject(
            this, &AMyGameMode::OnMonsterLoaded, MonsterId, SpawnLocation);

        Manager->LoadPrimaryAsset(MonsterId, Bundles, Delegate);
    }
}

void AMyGameMode::OnMonsterLoaded(FPrimaryAssetId LoadedId, FVector SpawnLocation)
{
    if (UAssetManager* Manager = UAssetManager::GetIfValid())
    {
        UMonsterData* MonsterData = Manager->GetPrimaryAssetObject<UMonsterData>(LoadedId);
        if (MonsterData)
        {
            GetWorld()->SpawnActor<AActor>(MonsterData->MonsterClass, SpawnLocation, FRotator::ZeroRotator);
        }
    }
}
```

### Preload Multiple Assets

```cpp
TArray<FPrimaryAssetId> WeaponIds;
UAssetManager::Get().GetPrimaryAssetIdList(UMyGameAssetManager::WeaponItemType, WeaponIds);

TArray<FName> Bundles;
Bundles.Add(FName("UI"));

TSharedPtr<FStreamableHandle> Handle = UAssetManager::Get().PreloadPrimaryAssets(
    WeaponIds, Bundles, false);

// Store Handle — assets unload when Handle is released/destroyed
```

### FStreamableManager for Non-Primary Assets

```cpp
void UMyCheatManager::GrantItems()
{
    TArray<FSoftObjectPath> ItemsToStream;
    for (const auto& Item : ItemList)
    {
        ItemsToStream.AddUnique(Item.ToSoftObjectPath());
    }

    FStreamableManager& Streamable = UAssetManager::GetStreamableManager();
    Streamable.RequestAsyncLoad(
        ItemsToStream,
        FStreamableDelegate::CreateUObject(this, &UMyCheatManager::OnItemsLoaded));
}

void UMyCheatManager::OnItemsLoaded()
{
    for (const auto& Item : ItemList)
    {
        if (UItemData* ItemData = Item.Get())
        {
            PlayerController->GrantItem(ItemData);
        }
    }
}
```

### Dynamic Asset Registration

```cpp
UMyGameAssetManager& AssetManager = UMyGameAssetManager::Get();
FPrimaryAssetId MapId = FPrimaryAssetId(FPrimaryAssetType("WorldMap"), FName(*MapData.UniqueId));

TArray<FSoftObjectPath> AssetRefs;
AssetManager.ExtractSoftObjectPaths(FMyMapData::StaticStruct(), &MapData, AssetRefs);

FAssetBundleData Bundles;
Bundles.AddBundleAssets(FName("Menu"), AssetRefs);
AssetManager.RecursivelyExpandBundleData(Bundles);

AssetManager.AddDynamicAsset(MapId, FSoftObjectPath(), Bundles);
AssetManager.LoadPrimaryAsset(MapId, AssetManager.GetDefaultBundleState());
```

### Query Asset Metadata Without Loading

```cpp
FAssetData AssetData;
UAssetManager::Get().GetPrimaryAssetData(WeaponId, AssetData);

FName TagValue;
if (AssetData.GetTagValue(GET_MEMBER_NAME_CHECKED(UWeaponItem, Rarity), TagValue))
{
    // Use tag value for filtering without loading the full asset
}
```

---

## Configuration

### DefaultGame.ini — Register Primary Asset Types

```ini
[/Script/Engine.AssetManagerSettings]
+PrimaryAssetTypesToScan=(PrimaryAssetType="Weapon",AssetBaseClass=/Script/MyGame.WeaponItem,bHasBlueprintClasses=False,Directories=((Path="/Game/Items/Weapons")))
+PrimaryAssetTypesToScan=(PrimaryAssetType="Ability",AssetBaseClass=/Script/MyGame.AbilityData,bHasBlueprintClasses=False,Directories=((Path="/Game/Abilities")))
```

Or configure via **Project Settings > Game > Asset Manager > Primary Asset Types to Scan**.

Parameters per type:
- `PrimaryAssetType` — type name (matches `GetPrimaryAssetId()` type)
- `AssetBaseClass` — C++ or Blueprint class path
- `bHasBlueprintClasses` — set `True` if scanning for Blueprint-derived classes
- `Directories` — folders to scan
- `Rules` — cooking/chunking rules (`FPrimaryAssetRules`)

### DefaultEngine.ini — Custom Asset Manager Class

```ini
[/Script/Engine.Engine]
AssetManagerClassName=/Script/MyGame.MyGameAssetManager
```

---

## Asset Bundles

Named groups of soft-referenced secondary assets loaded selectively per context:

```cpp
UCLASS()
class UCharacterData : public UPrimaryDataAsset
{
    GENERATED_BODY()

    UPROPERTY(EditDefaultsOnly)
    FText CharacterName;  // Always available (not an asset ref)

    UPROPERTY(EditDefaultsOnly, meta = (AssetBundles = "Lobby"))
    TSoftObjectPtr<UTexture2D> LobbyPortrait;  // Loaded only in lobby

    UPROPERTY(EditDefaultsOnly, meta = (AssetBundles = "Game"))
    TSoftClassPtr<APawn> GamePawnClass;  // Loaded only in gameplay

    UPROPERTY(EditDefaultsOnly, meta = (AssetBundles = "UI"))
    TSoftObjectPtr<UTexture2D> Icon;  // Loaded only for UI
};
```

Load with specific bundles:
```cpp
TArray<FName> Bundles;
Bundles.Add(FName("Lobby"));  // Only load lobby-relevant refs
Manager->LoadPrimaryAsset(CharacterId, Bundles, Delegate);
```

Switch bundles at runtime:
```cpp
TArray<FName> AddBundles = { FName("Game") };
TArray<FName> RemoveBundles = { FName("Lobby") };
Manager->ChangeBundleStateForPrimaryAssets(CharacterIds, AddBundles, RemoveBundles);
```

---

## Best Practices

- **Default to soft references** (`TSoftObjectPtr`, `TSoftClassPtr`) — use hard references only for assets that must load immediately with the owner.
- **Use Asset Bundles** to categorize secondary assets by game phase (Menu, Lobby, Game, UI) — load only what the current context needs.
- **Prefer `PreloadPrimaryAssets`** for optional content — assets auto-unload when handle is released, preventing leaks.
- **Use `LoadPrimaryAsset`** for persistent content — equipped items, active abilities, currently-used data.
- **Always use async loading during gameplay** — synchronous loads cause frame hitches. Sync loading is acceptable only behind loading screens or in editor.
- **Store `FStreamableHandle`** to keep preloaded assets alive — destruction releases the memory hold.
- **Create a custom `UAssetManager` subclass** early — centralizes asset type definitions, loading states, and custom init logic.
- **Register all Primary Asset types** in Project Settings or `DefaultGame.ini` — unregistered types are invisible to the Asset Manager.
- **Query `FAssetData` tags** for filtering before loading — avoids loading entire assets just to check metadata.
- **Audit dependencies** regularly with Reference Viewer and Asset Audit tools.
- **Use `GetIfValid()`** instead of `Get()` when the manager might not exist yet (early init, shutdown).
- **Define asset type names as `static const FPrimaryAssetType`** in the Asset Manager subclass — prevents typos and centralizes type strings.

---

## Anti-Patterns

- **Hard-referencing everything** — creates massive dependency chains, loads entire asset trees at startup, causes memory bloat and long load times.
- **Synchronous loading during gameplay** — `LoadSynchronous()` and `LoadObject()` block the game thread. Use `RequestAsyncLoad` or `LoadPrimaryAsset` instead.
- **Forgetting to unload** — `LoadPrimaryAsset` keeps assets in memory permanently. Always call `UnloadPrimaryAsset` when done, or use `PreloadPrimaryAssets` with handle-based lifetime.
- **Not registering Primary Asset types** — the Asset Manager cannot discover assets of unregistered types. Always add to Project Settings or `DefaultGame.ini`.
- **Ignoring Asset Bundles** — loading a Primary Asset without specifying bundles loads only the asset itself, not its soft-referenced secondary assets. Specify required bundles explicitly.
- **Not validating soft pointers** — `TSoftObjectPtr::Get()` returns nullptr if not loaded. Always check `IsValid()` or `IsPending()` before use.
- **Capturing stale variables in async callbacks** — values may change between request and completion. Pass needed data via delegate parameters, not captures of outer variables.
- **Using Asset Manager for trivial assets** — small, always-needed assets (core UI, player character mesh) are better as hard references. Asset Manager adds overhead that isn't justified for always-loaded content.
- **Mixing Load and Preload carelessly** — `PreloadPrimaryAssets` auto-unloads on handle release, but if the same asset was also `LoadPrimaryAsset`-ed elsewhere, it persists. Track which method manages each asset.
