---
version: 1.0.0
---

# Godot SQLite

> **Scope**: godot-sqlite (2shady4u) GDExtension plugin — database connection lifecycle, query execution with parameter binding, CRUD helpers, transaction management, BLOB handling, schema definition, and save/load patterns for Godot 4 GDScript projects.
> **Load when**: using SQLite in a Godot 4 project, writing database queries, defining table schemas, managing game save data, bulk-inserting data, handling BLOB assets in a database, debugging SQLite errors, designing a save system with godot-sqlite.

---

## Setup & Database Lifecycle

Always open with `open_db()` and close with `close_db()` in `_exit_tree()`. Set `foreign_keys` and `verbosity_level` **before** `open_db()`.

```gdscript
var db := SQLite.new()
db.path = "user://game_data"       # user:// for writable, res:// for read-only bundles
db.foreign_keys = true             # MUST be set before open_db()
db.verbosity_level = SQLite.QUIET  # QUIET in production, VERBOSE during development
if not db.open_db():
    push_error("DB open failed: " + db.error_message)

func _exit_tree() -> void:
    if db:
        db.close_db()
```

Use `"user://"` for all writable databases (saves, player data). Use `"res://"` with `read_only = true` for static game content bundled in the PCK.

## Autoload Pattern (Recommended)

Expose the database as a project-level singleton so all systems share one connection:

```gdscript
# res://autoload/Database.gd
extends Node

var db: SQLite

func _ready() -> void:
    db = SQLite.new()
    db.path = "user://game_data"
    db.foreign_keys = true
    db.verbosity_level = SQLite.QUIET
    if not db.open_db():
        push_error("Database failed to open: " + db.error_message)
    _init_schema()

func _exit_tree() -> void:
    db.close_db()

func _init_schema() -> void:
    pass  # create_table() calls here
```

Register in **Project > Project Settings > Autoload** as `Database`. Access everywhere via `Database.db`.

## Schema Definition

```gdscript
# create_table() is idempotent — returns false if table exists (not an error)
db.create_table("players", {
    "id":       {"data_type": "int",  "primary_key": true, "auto_increment": true, "not_null": true},
    "name":     {"data_type": "text", "not_null": true, "unique": true},
    "level":    {"data_type": "int",  "default": 1},
    "email":    {"data_type": "text", "default": "'unknown@example.com'"},  # string defaults need quotes
    "portrait": {"data_type": "blob"},                                      # binary data
    "team_id":  {"data_type": "int",  "foreign_key": "teams.id"},          # requires foreign_keys=true
})
```

**Field options:**

| Key | Values | Notes |
|-----|--------|-------|
| `data_type` | `"int"`, `"real"`, `"text"`, `"char(n)"`, `"blob"` | Required |
| `not_null` | `true`/`false` | Default false |
| `unique` | `true`/`false` | Default false |
| `primary_key` | `true`/`false` | Default false |
| `auto_increment` | `true`/`false` | Requires single primary_key |
| `default` | any value | String defaults must include inner quotes: `"'value'"` |
| `foreign_key` | `"table.column"` | Requires `db.foreign_keys = true` before `open_db()` |

Critical: `"default": "active"` fails — must be `"default": "'active'"` for TEXT columns.

## Querying

### Always Prefer `query_with_bindings()` Over Raw `query()`

```gdscript
# SAFE — prevents SQL injection, handles type conversion
var ok := db.query_with_bindings(
    "SELECT name, level FROM players WHERE age > ? AND team_id = ?",
    [player_age, team_id]
)
var rows: Array = db.query_result  # Copy — safe to keep after further queries

# Named bindings — cleaner for many params (prefix : @ $ ? all work)
db.query_with_named_bindings(
    "SELECT * FROM players WHERE age > :age AND name = :name",
    {"age": 30, "name": "Alice"}  # Keys WITHOUT prefix
)

# Raw query — only for static strings with no user input
db.query("PRAGMA journal_mode = WAL;")
```

Use `query()` only for PRAGMA statements and DDL with no user input. **Never build query strings with user data and `%s` / string concatenation.**

You cannot bind table or column names — use string interpolation for identifiers and `?` for values only:
```gdscript
# Identifier interpolation + value binding (safe combination)
db.query_with_bindings("SELECT %s FROM %s WHERE id = ?" % [column, table], [id])
```

### CRUD Helpers

```gdscript
# Insert single row — returns false on failure
db.insert_row("players", {"name": "Alice", "level": 5})

# Insert multiple rows in one call
db.insert_rows("players", [
    {"name": "Alice", "level": 5},
    {"name": "Bob",   "level": 10},
])
var new_id: int = db.last_insert_rowid  # Row ID of last insert

# Select with optional WHERE and column filter
var rows: Array = db.select_rows("players", "level > 5", ["name", "level"])
# Returns Array[Dictionary]: [{"name": "Alice", "level": 7}, ...]
var all_cols := db.select_rows("players", "", ["*"])

# Update matching rows
db.update_rows("players", "name = 'Alice'", {"level": 15})

# Delete matching rows ("*" = all rows, deletes all data but keeps table)
db.delete_rows("players", "name = 'Alice'")
db.delete_rows("players", "*")

# Drop table entirely
db.drop_table("players")
```

## Transactions — Use for All Bulk Operations

SQLite defaults to autocommit (one commit per statement). Wrap multi-step or bulk operations in explicit transactions — **10–100× speed improvement** for bulk inserts/updates.

```gdscript
db.query("BEGIN TRANSACTION;")
for item: Dictionary in batch:
    if not db.insert_row("items", item):
        db.query("ROLLBACK;")
        push_error("Batch failed: " + db.error_message)
        return false
db.query("COMMIT;")
return true
```

Transaction pattern for atomic multi-table operations:
```gdscript
db.query("BEGIN TRANSACTION;")

var ok := db.update_rows("players", "id = %d" % player_id, {"level": new_level})
if ok:
    ok = db.insert_row("player_log", {"player_id": player_id, "event": "'level_up'"})

if ok:
    db.query("COMMIT;")
else:
    db.query("ROLLBACK;")
    push_error("Transaction failed: " + db.error_message)
```

Check `db.get_autocommit()` → `1` = autocommit on (no open transaction), `0` = inside a transaction.

## Error Handling

Every query method returns `bool`. Always check the return value for write operations. Read `db.error_message` for diagnostics.

```gdscript
if not db.insert_row("players", {"name": "Alice"}):
    push_error("Insert failed: %s" % db.error_message)
```

Common error messages:
- `"no such table: players"` — table not created yet
- `"table players already exists"` — `create_table()` called twice (not fatal, returns false)
- `"UNIQUE constraint failed"` — duplicate unique value
- `"NOT NULL constraint failed"` — missing required column
- `"FOREIGN KEY constraint failed"` — invalid FK reference
- `"SQL logic error or missing database"` — syntax error in query string

## Query Results

```gdscript
db.query("SELECT * FROM players;")
var rows: Array = db.query_result             # Returns Array[Dictionary], copy (safe)
var ref: Array = db.query_result_by_reference # Points to internal buffer — CLEARED after next query
```

Prefer `query_result` (copy). Only use `query_result_by_reference` if you immediately duplicate it — it is invalidated by the next query call.

## BLOB Data

BLOB (binary data: images, audio, serialized objects) **must** be inserted with `query_with_bindings()` or `query_with_named_bindings()` — raw `query()` cannot handle `PackedByteArray`.

```gdscript
# Store image as BLOB
var img_bytes: PackedByteArray = texture.get_image().save_png_to_buffer()
db.query_with_bindings("INSERT INTO textures (id, data) VALUES (?, ?)", [1, img_bytes])

# Retrieve and reconstruct
db.query_with_bindings("SELECT data FROM textures WHERE id = ?", [1])
var bytes: PackedByteArray = db.query_result[0]["data"]
var image := Image.new()
image.load_png_from_buffer(bytes)
var tex := ImageTexture.create_from_image(image)
```

## Import / Export / Backup

```gdscript
# Export full DB to JSON (BLOB → base64 automatically)
db.export_to_json("user://backup/save")  # → save.json

# Import (DESTRUCTIVE — drops all tables and reimports)
db.import_from_json("user://backup/save")

# Export to in-memory buffer (use case: encrypt before writing)
var buf: PackedByteArray = db.export_to_buffer()

# Import from buffer (use case: decrypt before loading)
db.import_from_buffer(decrypted_bytes)

# Binary backup (faster than JSON; backup_to creates a full copy)
db.backup_to("user://saves/slot_1.db")

# Restore — OVERWRITES the current database entirely
db.restore_from("user://saves/slot_1.db")
```

## Performance

1. **Transactions for bulk writes** — wrap loops in `BEGIN / COMMIT` (see Transactions section).
2. **Indexes on frequently filtered columns** — run once after schema init:
   ```gdscript
   db.query("CREATE INDEX IF NOT EXISTS idx_players_level ON players(level);")
   ```
3. **PRAGMA WAL mode** — better concurrency, faster writes:
   ```gdscript
   db.query("PRAGMA journal_mode = WAL;")
   db.query("PRAGMA synchronous = NORMAL;")  # Default is FULL — slower but safer
   ```
4. **Select specific columns** — avoid `SELECT *`; fetch only needed fields.
5. **QUIET verbosity in production** — `SQLite.VERBOSE` adds significant console overhead.
6. **Batch pending events** — accumulate writes during `_process()`, flush with a transaction at regular intervals; do not write to DB every frame.

## Anti-patterns

**SQL injection via string interpolation:**
```gdscript
# DANGEROUS
db.query("SELECT * FROM players WHERE name = '%s'" % user_input)
# SAFE
db.query_with_bindings("SELECT * FROM players WHERE name = ?", [user_input])
```

**Binding identifiers (table/column names) as values:**
```gdscript
# WRONG — SQLite doesn't allow binding identifiers
db.query_with_bindings("SELECT ? FROM ?", ["name", "players"])
# CORRECT — interpolate identifiers, bind values
db.query_with_bindings("SELECT %s FROM %s WHERE id = ?" % [col, table], [id])
```

**Missing inner quotes on TEXT default values:**
```gdscript
{"status": {"data_type": "text", "default": "active"}}   # WRONG — silently wrong
{"status": {"data_type": "text", "default": "'active'"}}  # CORRECT
```

**Setting `foreign_keys` after `open_db()`:**
```gdscript
db.open_db()
db.foreign_keys = true  # WRONG — too late, constraints not enforced
# Set BEFORE open_db()
```

**Holding `query_result_by_reference` across queries:**
```gdscript
var ref = db.query_result_by_reference  # Cleared on next query!
db.query("SELECT ...")                  # ref is now overwritten
# Use db.query_result instead, or: db.query_result_by_reference.duplicate()
```

**Not closing the database on exit:**
```gdscript
# Always pair open_db() with close_db() in _exit_tree()
```

**Writing to DB every `_process()` frame:**
Accumulate writes in an Array and flush via a transaction (e.g., every 5 seconds or on scene exit).

**Using `delete_rows("players", "")` to delete all rows:**
The condition for all rows is `"*"`, not `""`. An empty string may behave unexpectedly depending on the SQLite version. Prefer `DELETE FROM players` via raw `query()`.
