---
version: 1.0.0
---

# TileMap / TileSet

> **Scope**: Godot 4 tile-based map authoring using TileMapLayer nodes and TileSet resources — node setup, runtime cell manipulation, terrain autotiling, physics/navigation/custom data layer configuration, coordinate conversion, and performance tuning.
> **Load when**: authoring tilemaps or tilesets, placing or erasing tiles at runtime, setting up physics or navigation layers on a tileset, implementing terrain autotiling, converting between world and tile coordinates, procedurally generating tile maps, reading tile custom data at runtime, debugging tilemap rendering or collision issues.

---

## Architecture

- **Use `TileMapLayer` nodes, not `TileMap`.** The `TileMap` class is deprecated since Godot 4.3. Each logical layer (ground, objects, overlay) is a separate `TileMapLayer` node in the scene tree.
- A `TileSet` resource is shared among all `TileMapLayer` nodes that draw from the same tile library. Assign it via the `TileSet` property.
- Tile sources are either `TileSetAtlasSource` (texture atlas, most common) or `TileSetScenesCollectionSource` (scene-based tiles).
- Each tile is identified by three IDs: **source ID**, **atlas coordinates** (`Vector2I`), and **alternative tile ID** (0 = default; non-zero = rotated/flipped variant).

## API / Interface

### TileMapLayer — cell manipulation

```csharp
// Place a tile
tileMapLayer.SetCell(Vector2I coords, int sourceId, Vector2I atlasCoords, int alternativeTile = 0);

// Remove a tile (equivalent to SetCell with sourceId = -1)
tileMapLayer.EraseCell(Vector2I coords);

// Query single cell
int      sourceId = tileMapLayer.GetCellSourceId(coords);       // -1 if empty
Vector2I atlas    = tileMapLayer.GetCellAtlasCoords(coords);
int      alt      = tileMapLayer.GetCellAlternativeTile(coords);
TileData data     = tileMapLayer.GetCellTileData(coords);       // null if empty

// Bulk queries
Array<Vector2I> used = tileMapLayer.GetUsedCells();
Array<Vector2I> byId = tileMapLayer.GetUsedCellsById(sourceId, atlasCoords, alternativeTile);
Rect2I          rect = tileMapLayer.GetUsedRect();

// Clear all tiles
tileMapLayer.Clear();
```

### TileMapLayer — terrain autotiling

```csharp
// Fill a connected area with terrain — best for area flood-fill
tileMapLayer.SetCellsTerrainConnect(
    Array<Vector2I> cells,
    int terrainSet,
    int terrain,
    bool ignoreEmptyTerrains = true);

// Place terrain along a path — best for corridors / roads
tileMapLayer.SetCellsTerrainPath(
    Array<Vector2I> path,
    int terrainSet,
    int terrain,
    bool ignoreEmptyTerrains = true);
```

### TileMapLayer — coordinate conversion

```csharp
// World (global) position → tile grid coordinates
Vector2I mapCoords = tileMapLayer.LocalToMap(tileMapLayer.ToLocal(globalPosition));

// Tile grid coordinates → world (global) position (center of the tile)
Vector2 worldPos = tileMapLayer.ToGlobal(tileMapLayer.MapToLocal(mapCoords));

// Neighbors
Array<Vector2I> all     = tileMapLayer.GetSurroundingCells(coords);
Vector2I        oneCell = tileMapLayer.GetNeighborCell(coords, TileSet.CellNeighbor.RightSide);
```

### TileMapLayer — runtime tile data update

Extend `TileMapLayer` in C# and override these virtual methods to modify tile properties per-frame without touching the shared TileSet:

```csharp
public override bool _UseTileDataRuntimeUpdate(Vector2I coords)
{
    // Return true only for tiles that need dynamic modification.
    return _dynamicTiles.Contains(coords);
}

public override void _TileDataRuntimeUpdate(Vector2I coords, TileData tileData)
{
    // Modify tileData here. Never edit sub-resources in-place —
    // they are shared with the TileSet. Duplicate before modifying.
    if (_blockedCoords.Contains(coords))
        tileData.SetNavigationPolygon(0, null);
}
```

Call `tileMapLayer.NotifyRuntimeTileDataUpdate()` to mark tiles dirty and trigger re-evaluation.

### TileMapLayer — patterns

```csharp
// Extract a multi-cell pattern
TileMapPattern pattern = tileMapLayer.GetPattern(coordsArray);

// Paste the pattern at a position
tileMapLayer.SetPattern(position, pattern);
```

### TileMapLayer — key properties

| Property | Type | Notes |
|---|---|---|
| `TileSet` | `TileSet` | Shared tile library |
| `Enabled` | `bool` | Disables rendering + physics when false |
| `CollisionEnabled` | `bool` | Per-node physics toggle |
| `NavigationEnabled` | `bool` | Per-node navigation toggle |
| `YSortEnabled` | `bool` | Y-sort rendering for top-down games |
| `RenderingQuadrantSize` | `int` | Tiles per render chunk (default 16) |
| `CollisionAnimatable` | `bool` | Kinematic sync for moving platforms |
| `CollisionVisibilityMode` | `VisibilityMode` | Show/hide collision debug shapes |
| `NavigationVisibilityMode` | `VisibilityMode` | Show/hide navigation debug meshes |

### TileSet — layer configuration (C# API)

```csharp
var tileSet = new TileSet();

// Physics layer — index corresponds to order added (0-based)
tileSet.AddPhysicsLayer();
tileSet.SetPhysicsLayerCollisionLayer(0, 1u << 1);  // occupies physics layer 2
tileSet.SetPhysicsLayerCollisionMask(0, 0u);

// Navigation layer
tileSet.AddNavigationLayer();
tileSet.SetNavigationLayerLayers(0, 1u);

// Occlusion layer (for 2D shadow casters)
tileSet.AddOcclusionLayer();

// Custom data layer
tileSet.AddCustomDataLayer();
tileSet.SetCustomDataLayerName(0, "walkable");
tileSet.SetCustomDataLayerType(0, Variant.Type.Bool);

// Terrain set
tileSet.AddTerrainSet();
tileSet.SetTerrainSetMode(0, TileSet.TerrainMode.MatchCornersAndSides);
tileSet.AddTerrain(0);           // terrain 0 inside terrain set 0
tileSet.SetTerrainColor(0, 0, Colors.Green);
```

### TileData — reading tile properties at runtime

Obtained via `GetCellTileData()`. Reflects the tile's configured properties from the TileSet.

```csharp
TileData tileData = tileMapLayer.GetCellTileData(coords);
if (tileData != null)
{
    // Custom data by layer name (preferred — decoupled from layer order)
    bool walkable = tileData.GetCustomData("walkable").AsBool();
    int  damage   = tileData.GetCustomData("damage").AsInt32();

    // Custom data by layer index
    Variant raw = tileData.GetCustomDataByLayerId(0);

    // Navigation polygon on layer 0
    NavigationPolygon navPoly = tileData.GetNavigationPolygon(0);

    // Flip / transpose state
    bool flipH      = tileData.FlipH;
    bool flipV      = tileData.FlipV;
    bool transposed = tileData.Transpose;

    // Terrain info
    int terrainSet = tileData.TerrainSet;
    int terrain    = tileData.Terrain;
}
```

## Patterns & Examples

### Placing a tile by atlas coordinates

```csharp
// Source 0, atlas tile at (2, 1), default alternative
_groundLayer.SetCell(new Vector2I(5, 3), sourceId: 0, atlasCoords: new Vector2I(2, 1));
```

### Converting a mouse click to a tile coordinate

```csharp
Vector2  mouseWorld = GetGlobalMousePosition();
Vector2I tileCoords = _groundLayer.LocalToMap(_groundLayer.ToLocal(mouseWorld));
```

### Checking whether a cell is empty

```csharp
bool isEmpty = _groundLayer.GetCellSourceId(coords) == -1;
```

### Terrain autotiling for a procedural map

```csharp
var cells = new Godot.Collections.Array<Vector2I>();
for (int x = 0; x < width; x++)
    for (int y = 0; y < height; y++)
        cells.Add(new Vector2I(x, y));

_groundLayer.SetCellsTerrainConnect(cells, terrainSet: 0, terrain: 0);
```

### Iterating all used tiles

```csharp
foreach (Vector2I coords in _groundLayer.GetUsedCells())
{
    TileData data = _groundLayer.GetCellTileData(coords);
    if (data != null && data.GetCustomData("walkable").AsBool())
        ProcessWalkableTile(coords);
}
```

### Blocking navigation on a tile at runtime

```csharp
// In a class that extends TileMapLayer:
private readonly HashSet<Vector2I> _blocked = new();

public void BlockTile(Vector2I coords)
{
    _blocked.Add(coords);
    NotifyRuntimeTileDataUpdate();
}

public override bool _UseTileDataRuntimeUpdate(Vector2I coords) => _blocked.Contains(coords);

public override void _TileDataRuntimeUpdate(Vector2I coords, TileData tileData)
{
    tileData.SetNavigationPolygon(0, null);
}
```

## Configuration

- **Physics layer index** (0-based in C# API) corresponds to the order layers appear in the TileSet Inspector. Layer 0 is the first physics layer added.
- **`TileSet` is a shared Resource.** Multiple `TileMapLayer` nodes sharing the same `TileSet` share all layer configuration. Configure layers at the project level, not per-node.
- **`CollisionEnabled` and `NavigationEnabled`** are node-level toggles. They enable/disable physics or navigation for that specific `TileMapLayer` without changing TileSet configuration.
- **Scene tiles (`TileSetScenesCollectionSource`)** are instantiated asynchronously. Their children may not be initialized at the same frame the tile is placed — call `UpdateInternals()` if immediate access is required.

## Best Practices

- **One `TileMapLayer` per logical responsibility** — separate nodes for ground, obstacles, and decorations instead of one multi-layer `TileMap`.
- **Always null-check `GetCellTileData()` and `-1`-check `GetCellSourceId()`** before reading data — both indicate empty cells.
- **Use `SetCellsTerrainConnect()` for area fills, `SetCellsTerrainPath()` for corridors.** Batch terrain methods produce better autotile results than individual `SetCell()` calls and are more performant.
- **Pass `ignoreEmptyTerrains: true`** to terrain methods when empty cells should not influence neighbor constraints.
- **Always go through `ToLocal()` / `ToGlobal()`** when converting between world and tile coordinates. `LocalToMap()` / `MapToLocal()` operate in node-local space, not world space.
- **Use the runtime update system** (`_UseTileDataRuntimeUpdate` + `_TileDataRuntimeUpdate` + `NotifyRuntimeTileDataUpdate`) for tiles that change properties dynamically. Prefer this over modifying the TileSet at runtime.
- **Tune `RenderingQuadrantSize`** — increase (32–64) for large sparse maps to reduce render batch overhead; keep low (16) for dense maps with frequent per-frame tile changes.
- **Read custom data by layer name** (`GetCustomData("name")`) rather than layer index to stay decoupled from the layer order in the TileSet Inspector.

## Anti-patterns

- **Do not use the deprecated `TileMap` class.** It is removed in future Godot versions. Migrate to individual `TileMapLayer` nodes.
- **Do not manipulate tiles from a background thread** (`Task.Run`, `Thread`). `SetCell()`, `EraseCell()`, and terrain methods are not thread-safe — calling them off the main thread causes rendering artifacts (terrain not drawn, missing tiles).
- **Do not call `UpdateInternals()` in a hot loop.** Frame-end batching handles updates automatically. Force-updating is expensive and should only be used when physics state must be synchronized immediately within the same frame (e.g., before a raycast right after placing a tile).
- **Do not edit TileData sub-resources in-place inside `_TileDataRuntimeUpdate`.** Physics and navigation polygons are shared with the TileSet. Duplicate the resource before modifying, or changes will affect every tile that uses the same source.
- **Do not exceed the coordinate range [-32768, 32767].** TileMapLayer uses 16-bit signed integers for X and Y. Procedural maps must stay within this range.
- **Do not confuse `MapToLocal()` with world position.** `MapToLocal()` returns a position in the node's local space; wrap it in `ToGlobal()` to get a world position.
