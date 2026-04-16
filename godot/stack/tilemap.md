---
version: 1.0.0
---

# TileMap & TileSet

> **Scope**: Godot 4 tile-based map authoring — TileMapLayer node usage, TileSet resource configuration, tile manipulation at runtime via GDScript, physics/navigation/custom data layer setup, terrain autotiling, and performance tuning.
> **Load when**: building tile-based levels, configuring TileSet physics or navigation layers, placing or reading tiles at runtime, implementing terrain autotiling, debugging tilemap collisions, optimizing tilemap rendering.

---

## Core Concepts

**TileSet** is a `Resource` (not a node) — a shared library of tiles. It owns:
- **Sources** — `TileSetAtlasSource` (texture atlas, most common) or `TileSetScenesCollectionSource` (scene tiles)
- **Physics Layers** — collision layer/mask pairs for tiles
- **Navigation Layers** — pathfinding polygon layers
- **Occlusion Layers** — for 2D lights and shadow casting
- **Custom Data Layers** — per-tile typed metadata (string name → Variant)

**TileMapLayer** is a `Node2D` subclass — a single painted tile layer. Use multiple `TileMapLayer` nodes to achieve multi-layer maps. The old `TileMap` node (multi-layer, single node) is **deprecated since Godot 4.3** — prefer `TileMapLayer`.

Each tile is identified by three IDs:
- **Source ID** — which `TileSetSource` it comes from
- **Atlas Coords** — `Vector2i` position within the atlas texture
- **Alternative Tile** — variant index (0 = base tile)

**Coordinate limits**: X and Y are 16-bit signed integers — valid range is **-32768 to 32767**. Tiles placed outside this range wrap silently when saved.

## Node Architecture

Use one `TileMapLayer` per visual/logical layer. Common setup:

```
Level
├── TileMapLayer (background)    # shared TileSet, no physics
├── TileMapLayer (ground)        # collision + navigation
├── TileMapLayer (walls)         # collision only
└── TileMapLayer (decorations)   # no physics, Y-sort enabled
```

All layers can share the **same `TileSet` resource** or use separate ones. Sharing is preferred when tiles come from the same atlas — it avoids duplicating physics/navigation layer definitions.

## TileSet Setup Workflow

1. Add a `TileMapLayer` node to the scene.
2. Inspector → **Tile Set** → New TileSet.
3. Bottom panel → TileSet editor → drag sprite sheet from FileSystem.
4. Accept auto-slice (Godot detects non-transparent cells) or configure tile size manually.
5. If the atlas has padding or margins → set **Margins** and **Separation** in the source Inspector to prevent pixel bleeding.

### Adding Physics Layers

In TileSet Inspector → **Physics Layers** → **Add Element**:
- **Collision Layer** — bit(s) this tilemap occupies (e.g., layer 1)
- **Collision Mask** — bit(s) this tilemap detects (typically 0 for static geometry)

After adding the layer → switch to the **Select** tool in TileSet editor → select tiles → **Physics Layer 0** → "Reset to default tile shape" (full-tile rectangle) or draw a custom polygon.

### Adding Navigation Layers

In TileSet Inspector → **Navigation Layers** → **Add Element** → set layer bits. After adding → paint navigation polygons on walkable tiles in the TileSet editor.

### Adding Custom Data Layers

In TileSet Inspector → **Custom Data Layers** → **Add Element** → set **Name** (string identifier, e.g., `"surface_type"`) and **Type** (`String`, `int`, `float`, `bool`, `Color`, etc.).

Access at runtime via `TileData.get_custom_data("surface_type")`.

## Runtime API (TileMapLayer)

### Placing and Reading Tiles

```gdscript
# Place a tile (source_id = -1 erases the cell)
layer.set_cell(coords: Vector2i, source_id: int = -1,
               atlas_coords: Vector2i = Vector2i(-1, -1),
               alternative_tile: int = 0) -> void

# Erase a tile explicitly
layer.erase_cell(coords: Vector2i) -> void

# Remove all tiles
layer.clear() -> void

# Read tile identifiers
var src_id: int      = layer.get_cell_source_id(coords)    # -1 if empty
var ac: Vector2i     = layer.get_cell_atlas_coords(coords)
var data: TileData   = layer.get_cell_tile_data(coords)    # null if empty / not atlas source

# Read custom metadata from a tile
func get_tile_surface(coords: Vector2i) -> String:
    var data := layer.get_cell_tile_data(coords)
    return data.get_custom_data("surface_type") if data else ""
```

### Coordinate Conversion

Always use the built-in helpers — never compute tile coordinates manually:

```gdscript
# Local/screen position → tile grid position
var tile_pos: Vector2i = layer.local_to_map(layer.get_local_mouse_position())

# Tile grid position → local/screen position (tile center)
var world_pos: Vector2 = layer.map_to_local(tile_pos)
```

### Querying Used Tiles

```gdscript
var all_cells: Array[Vector2i]    = layer.get_used_cells()
var by_source: Array[Vector2i]    = layer.get_used_cells_by_id(source_id)
var bounds: Rect2i                = layer.get_used_rect()  # bounding rectangle of all used tiles
```

### Terrain Autotiling at Runtime

```gdscript
# Fill an area — auto-selects the best tile for each cell based on neighbours
layer.set_cells_terrain_connect(
    cells: Array[Vector2i],
    terrain_set: int,
    terrain: int,
    ignore_empty_terrains: bool = true
)

# Apply terrain along a linear path
layer.set_cells_terrain_path(
    path: Array[Vector2i],
    terrain_set: int,
    terrain: int,
    ignore_empty_terrains: bool = true
)
```

Terrain methods require the TileSet to have **all transition tile combinations** configured — missing combinations cause unexpected tile choices. For complex autotile needs (Godot 3-style), consider the **Better Terrain** plugin.

### Forcing Updates

All tile updates are batched at the end of a frame. To force an earlier update (e.g., after programmatic changes before the node is fully in the scene tree):

```gdscript
layer.update_internals()
```

## Key Properties

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| `tile_set` | TileSet | null | Shared TileSet resource |
| `enabled` | bool | true | Enables/disables the entire layer |
| `collision_enabled` | bool | true | Toggle tile collision processing |
| `navigation_enabled` | bool | true | Toggle navigation mesh generation |
| `occlusion_enabled` | bool | true | Toggle occlusion polygon processing |
| `rendering_quadrant_size` | int | 16 | Tiles per canvas item batch |
| `physics_quadrant_size` | int | 16 | Tiles per physics batch |
| `use_kinematic_bodies` | bool | false | Static (false) vs Kinematic (true) tile bodies |
| `y_sort_origin` | int | 0 | Y offset for Y-sort ordering per tile |
| `x_draw_order_reversed` | bool | false | Reverse X draw order (requires Y sort enabled) |

## Performance

**Quadrant batching** groups tiles into canvas items to reduce draw calls:
- Default `rendering_quadrant_size = 16` → 256 tiles per canvas item.
- Increase for large static maps; decrease for small dynamic layers.
- **Y-sorted layers bypass quadrant batching** — tiles are grouped by Y position instead.

```gdscript
# Large static background — increase quadrant size
$BackgroundLayer.rendering_quadrant_size = 32   # 1024 tiles per canvas item

# Decorative layer with Y-sort — quadrant size has no effect, leave at default
$DecorLayer.y_sort_origin = 0
```

- Disable unused features on decorative layers: `collision_enabled = false`, `navigation_enabled = false`.
- `use_kinematic_bodies = true` has higher physics overhead — use only when tiles must move.

## Best Practices

- **Use `TileMapLayer`, not the deprecated `TileMap` node.** One `TileMapLayer` per logical layer.
- **Share one `TileSet` across layers** when tiles come from the same atlas — avoids duplicating layer definitions.
- **Paint collision polygons after adding a physics layer** — adding the physics layer to TileSet alone is not enough.
- **Use "Reset to default tile shape"** for solid rectangular tiles; draw custom polygons only for non-rectangular shapes.
- **Match collision bits**: TileSet physics layer bit must be included in the character's `collision_mask`.
- **Use `local_to_map()` and `map_to_local()`** for all coordinate conversions — never compute manually.
- **Read custom metadata via `get_cell_tile_data()`** instead of maintaining a parallel runtime data structure.
- **Disable `collision_enabled` and `navigation_enabled`** on purely visual/decorative layers.

## Anti-patterns

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Player falls through floor | Physics layer added but no polygons painted | Paint collision shapes on each solid tile |
| Collision invisible at runtime | Layer/mask mismatch with character | TileSet physics layer bit must be in character's `collision_mask` |
| Only some tiles collide | Shapes painted on wrong physics layer index | Check which physics layer index was used during painting |
| Migration from `TileMap` breaks collision | Physics bits reset after migration | Re-configure layer bits in TileSet Inspector |
| Terrain autotile picks wrong tile | Incomplete terrain set (missing transitions) | Configure all required terrain combinations in TileSet |
| Tiles appear misaligned / pixel bleeding | Atlas margins/padding not configured | Set Margins and Separation in source Inspector |
| `set_cell` has no visible effect | Updates are batched; node may not be in tree | Call `update_internals()` to force an immediate update |
| Wrong world position from tile coords | Manual coordinate math | Use `local_to_map()` / `map_to_local()` exclusively |
| One-way platform allows tunneling | One-way margin too low for character speed | Increase margin to ≥ (max_speed / physics_tick_rate) |

## Debugging

```gdscript
# Verify physics layer configuration at runtime
func _ready() -> void:
    if tile_set.get_physics_layers_count() == 0:
        push_warning("TileSet has no physics layers — tiles have no collision")

# Verify character sees the tile layer (in CharacterBody2D)
func _ready() -> void:
    if not get_collision_mask_value(1):
        push_warning("Character mask excludes layer 1 — cannot collide with tiles")
```

- Enable **Debug → Visible Collision Shapes** at runtime to confirm collision polygons are active.
- Enable **Debug → Visible Navigation** to confirm navigation meshes are generated.
- If shapes appear in the editor but not at runtime → layer/mask mismatch.
- If only some tiles collide → check for inconsistent polygon painting across tiles.
