---
version: 1.0.0
---

# Save Game System

> **Scope**: Unreal Engine 5 built-in save/load system — `USaveGame` subclass authoring, slot-based I/O via `UGameplayStatics`, sync vs. async API, actor world-state serialization, save data versioning, and corruption protection patterns.
> **Load when**: implementing save or load functionality, authoring a `USaveGame` subclass, choosing between sync and async save, serializing actor world state, managing save slots, adding save versioning, handling missing or corrupted save files, designing a save system architecture.

---

## Core Concepts

| Concept | Description |
|---------|-------------|
| `USaveGame` | Base UObject to inherit from. Add `UPROPERTY(SaveGame)` fields to define what gets persisted. No game logic — pure data carrier. |
| `UGameplayStatics` | Static utility class that performs all disk I/O: create, save, load, check, delete slots. |
| Save slot | A string name + int32 user index that maps to a file in `../ProjectName/Saved/SaveGames/`. The string is the filename. |
| `UPROPERTY(SaveGame)` | Specifier that marks a property for persistence. Only these properties are included when `ArIsSaveGame = true` on the archive. |

## API / Interface

### Slot utilities

```cpp
// Check before loading — always guard against missing slot
bool bExists = UGameplayStatics::DoesSaveGameExist(SlotName, UserIndex);

// Delete a slot
UGameplayStatics::DeleteGameInSlot(SlotName, UserIndex);
```

### Synchronous save

Use only when the game is **paused or in a menu**. Blocks the render thread for the duration of the write.

```cpp
if (UMySaveGame* SaveGame = Cast<UMySaveGame>(
    UGameplayStatics::CreateSaveGameObject(UMySaveGame::StaticClass())))
{
    SaveGame->PlayerName = TEXT("PlayerOne");
    SaveGame->SaveVersion = 1;

    if (UGameplayStatics::SaveGameToSlot(SaveGame, TEXT("Slot1"), 0))
    {
        // success
    }
}
```

### Synchronous load

```cpp
if (UGameplayStatics::DoesSaveGameExist(TEXT("Slot1"), 0))
{
    if (UMySaveGame* Loaded = Cast<UMySaveGame>(
        UGameplayStatics::LoadGameFromSlot(TEXT("Slot1"), 0)))
    {
        // use Loaded->PlayerName etc.
    }
}
```

### Asynchronous save — preferred for autosaves

`FAsyncSaveGameToSlotDelegate` callback signature: `void(const FString& SlotName, int32 UserIndex, bool bSuccess)`.

```cpp
FAsyncSaveGameToSlotDelegate SaveDelegate;
SaveDelegate.BindUObject(this, &UMySaveManager::OnSaveComplete);
UGameplayStatics::AsyncSaveGameToSlot(SaveGame, TEXT("Slot1"), 0, SaveDelegate);

void UMySaveManager::OnSaveComplete(const FString& SlotName, int32 UserIndex, bool bSuccess)
{
    if (!bSuccess)
    {
        UE_LOG(LogSave, Error, TEXT("Save failed: %s"), *SlotName);
    }
}
```

### Asynchronous load

`FAsyncLoadGameFromSlotDelegate` callback signature: `void(const FString& SlotName, int32 UserIndex, USaveGame* LoadedGame)`.

```cpp
FAsyncLoadGameFromSlotDelegate LoadDelegate;
LoadDelegate.BindUObject(this, &UMySaveManager::OnLoadComplete);
UGameplayStatics::AsyncLoadGameFromSlot(TEXT("Slot1"), 0, LoadDelegate);

void UMySaveManager::OnLoadComplete(const FString& SlotName, int32 UserIndex, USaveGame* LoadedGame)
{
    if (UMySaveGame* SaveGame = Cast<UMySaveGame>(LoadedGame))
    {
        // restore game state from SaveGame
    }
}
```

## Patterns & Examples

### Minimal USaveGame subclass

```cpp
// MySaveGame.h
#pragma once
#include "GameFramework/SaveGame.h"
#include "MySaveGame.generated.h"

USTRUCT(BlueprintType)
struct FPlayerSaveData
{
    GENERATED_BODY()

    UPROPERTY(SaveGame)
    FVector Location = FVector::ZeroVector;

    UPROPERTY(SaveGame)
    int32 Credits = 0;
};

UCLASS()
class MYGAME_API UMySaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    /** Increment whenever the save format changes. */
    UPROPERTY(SaveGame)
    int32 SaveVersion = 1;

    UPROPERTY(SaveGame)
    FPlayerSaveData PlayerData;

    /** World-state deltas: actors that changed from their defaults. */
    UPROPERTY(SaveGame)
    TArray<FActorSaveData> WorldActors;
};
```

### Actor world-state serialization via archive

Serialize only `UPROPERTY(SaveGame)` fields of arbitrary world actors into a `TArray<uint8>` byte blob.

```cpp
// Writing actor state
FActorSaveData ActorData;
ActorData.ActorName = Actor->GetFName();
ActorData.Transform  = Actor->GetActorTransform();

FMemoryWriter MemWriter(ActorData.ByteData, /*bIsPersistent=*/true);
FObjectAndNameAsStringProxyArchive Ar(MemWriter, /*bLoadIfFindFails=*/false);
Ar.ArIsSaveGame = true;   // ← only SaveGame-marked UPROPERTYs
Actor->Serialize(Ar);

// Reading actor state back
FMemoryReader MemReader(ActorData.ByteData, /*bIsPersistent=*/true);
FObjectAndNameAsStringProxyArchive Ar(MemReader, /*bLoadIfFindFails=*/true);
Ar.ArIsSaveGame = true;
Actor->Serialize(Ar);
// Call a restoration interface method so the actor can update visuals/state
IMyGameplayInterface::Execute_OnActorLoaded(Actor);
```

### Interface-based saveable actors

Tag actors that participate in world-state save with an interface rather than iterating all world actors.

```cpp
// IMyGameplayInterface declares:
//   virtual void OnActorLoaded_Implementation() {}
// Actors implement it to sync visuals after deserialization.

for (AActor* Actor : TActorRange<AActor>(GetWorld()))
{
    if (Actor->Implements<UMyGameplayInterface>())
    {
        // serialize / deserialize
    }
}
```

### Loading sequence — load before BeginPlay

Override `InitGame()` in `AGameModeBase` (or in a `UWorldSubsystem`) to deserialize world actors before `BeginPlay` fires, so actors can read restored data during their own `BeginPlay`.

```cpp
void AMyGameMode::InitGame(const FString& MapName, const FString& Options, FString& ErrorMessage)
{
    Super::InitGame(MapName, Options, ErrorMessage);

    const FString SlotName = UGameplayStatics::ParseOption(Options, TEXT("savegame"));
    if (!SlotName.IsEmpty() && UGameplayStatics::DoesSaveGameExist(SlotName, 0))
    {
        CurrentSaveGame = Cast<UMySaveGame>(UGameplayStatics::LoadGameFromSlot(SlotName, 0));
        // Restore world actors now — BeginPlay hasn't run yet
        RestoreWorldActors();
    }
}
```

### Save system in a GameInstance subsystem

Place save management in `UGameInstanceSubsystem` so it persists across level transitions and is accessible from anywhere.

```cpp
UCLASS()
class UMySaveManager : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    void SaveGame(const FString& SlotName);
    void LoadGame(const FString& SlotName);

private:
    UPROPERTY()
    TObjectPtr<UMySaveGame> CurrentSaveGame;
};
```

## Save Data Versioning

Always include a `SaveVersion` field. On load, compare it to the current expected version and apply migrations:

```cpp
void UMySaveManager::MigrateIfNeeded(UMySaveGame* SaveGame)
{
    if (SaveGame->SaveVersion < 2)
    {
        // v1 → v2: PlayerData.Credits moved from flat int
        SaveGame->PlayerData.Credits = SaveGame->Legacy_Credits_DEPRECATED;
        SaveGame->SaveVersion = 2;
    }
    if (SaveGame->SaveVersion < 3)
    {
        // v2 → v3: ...
        SaveGame->SaveVersion = 3;
    }
}
```

- One migration per version step, chained sequentially.
- Keep deprecated fields tagged `UPROPERTY(SaveGame)` until all live saves have migrated; then remove.

## Corruption Protection

For critical save slots (only one save file, no backup):

1. **Write-rename pattern**: write to a `.tmp` file, then rename to the target. If the process crashes mid-write, the original is intact.
2. **Backup slot**: before overwriting, copy current slot to `SlotName_backup`.
3. **Checksum**: store a CRC32 at the end of the byte blob; validate before deserializing.

The built-in `SaveGameToSlot` / `AsyncSaveGameToSlot` do not implement write-rename. For high-stakes saves, implement a custom `ISaveGameSystem` or write raw bytes via `IPlatformFile`.

## Best Practices

- **Use `AsyncSaveGameToSlot` for all autosaves** — sync save during active gameplay causes framerate hitches and can trigger certification failures on console platforms.
- **Use sync save only when paused or in a menu** — the blocking cost is acceptable when the game is already frozen.
- **Always call `DoesSaveGameExist` before `LoadGameFromSlot`** — loading a missing slot returns `nullptr`; unguarded casts cause crashes.
- **Never store raw `UObject*` in save data** — serialize by `FSoftObjectPath`, `FName` row name, or unique string ID; re-acquire via `LoadObject<>` or `FindObject<>` at load time.
- **Save only deltas** — store only what changed from the default level state, not all actor properties. Reduces file size and I/O time significantly.
- **Separate player data from world state** — they have different lifetimes, access patterns, and migration needs.
- **Version every save file from day one** — retrofitting versioning after shipping is painful and risks breaking existing player saves.
- **Test save/load as soon as any game state exists** — late integration leads to expensive architectural rework.

## Anti-patterns

- **Sync save during active gameplay** — blocks the render thread; players notice hitches every autosave cycle.
- **Storing `TObjectPtr<UObject>` or raw `AActor*` in `USaveGame` fields** — the object may not exist on the next load; always store identifiers, not pointers.
- **Keeping save logic in `AGameModeBase`** — GameMode is destroyed on level transition; save state is lost. Use `UGameInstanceSubsystem` instead.
- **Loading in `BeginPlay`** — `BeginPlay` runs too late; other systems may have already initialized with stale/default data. Load in `InitGame()` or a subsystem `Initialize()`.
- **No null check after `LoadGameFromSlot`** — returns `nullptr` for missing slots and on deserialization failure; always cast-guard.
- **Saving all `UPROPERTY()` instead of `UPROPERTY(SaveGame)`** — without `ArIsSaveGame = true` filtering, the archive serializes every reflected property, bloating save files with transient data.