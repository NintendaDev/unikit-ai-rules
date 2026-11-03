# ChiR24 Unreal MCP — Assets and data

| Task | Discover these capability families |
|---|---|
| Find existing content | `asset.list`, `asset.query_asset`, `asset.find_assets_like`, `asset.thumbnail_sheet` |
| Inspect dependencies/metadata/validity | `asset.inspect_asset` |
| Import/reimport/export | `asset.import`, `asset.reimport`, `asset.export_mesh` |
| Duplicate/move/rename/repair redirectors | `asset.duplicate`, `asset.move`, `asset.rename`, `asset.maintain_content` |
| Fab library/import | `asset.query_marketplace`, `asset.import_marketplace_asset` |
| DataTables | `datatable.edit_data_table`, `datatable.inspect_data_table`, `datatable.delete_data_table_row` |
| Structs and enums | `struct.get_struct`, `struct.edit_struct`, `enum.get_enum`, `enum.edit_enum` |
| Source control | `asset.source_control`; inspect the selected variant before executing |

All routes above are capability ids passed through `unreal`; `manage_asset` remains their internal parent. Inspect live selectors rather than treating this table as an input schema.

## Find before creating

```json
{"operation":"search","query":"find assets by name","tool":"manage_asset","effect":"read","limit":3}
```

Narrow by folder/class/tags through the described query. Inspect returned package/object paths, references and type. A similarly named mesh, Blueprint and generated class are different targets. Use contact/thumbnail sheets when appearance determines reuse; do not import another copy merely because a broad listing omitted it.

## Import a source asset

1. Establish the actual source file, format and destination package. Check existing content and the import capability's overwrite/settings options.
2. Describe `asset.import` and satisfy its explicit consent contract. The source file address is not a `/Game` package address.
3. Import, then wait for the actual outcome or task. Inspect the produced asset paths and dependent materials/textures; an accepted download or import queue is unfinished work.
4. Validate references, assign the imported content where needed, save the intended packages, and inspect after reload when persistence is the acceptance criterion.

For a rename/move, read dependencies first, execute on the exact asset, then inspect old/new references and any redirectors. Do not delete redirectors before their users are repaired. Inspect partial failures and source-control checkout results. A source-control capability must not be used to commit or submit without the user's instruction to do so.

## Fab and migration are different workflows

- Discover available content sources before migration. Existing editor-compatible `.uasset` trees must keep their package layout so stored `/Game/...` references resolve. A file extension does not prove version compatibility.
- Use a migration preview and package cap if its live contract provides them. Verify both the destination registry and dependent packages.
- Fab uses Epic's authenticated plugin and format-specific import workflow. Describe the marketplace family, choose its appropriate variant, poll import status, then verify real saved assets and relocation references.
- Pass listing/content identifiers supported by the contract. Do not collect session cookies, bearer tokens or transient signed download URLs to implement a parallel download path.
- Fab service endpoints are private and version-sensitive; MetaHuman listings may require a different route. Do not infer USD-stage, Alembic, groom or package-authoring support from general import support.

## Edit structured data

```json
{"operation":"describe","capability":"datatable.edit_data_table"}
```

Read the existing row struct and rows before selecting `edit`. Create the struct before assigning it; supply values matching declared field types. Read modified rows back and validate table users.

Before changing a struct/enum, inspect dependent Blueprints/tables, choose the smallest schema delta and compile affected users afterward. Recompilation can touch packages outside a path-scoped token and be refused. Do not replace an enum to work around a type error or change a shared struct without assessing its users.

SaveGame slot operations live under `system_control.list_save_games` / `edit_save_game` in the pinned catalog. They affect saved game data, not editor packages; describe their exact format and destructive policy before using them. Generic data-asset/curve/save workflows in Roadmap are not necessarily implemented.

Sources: [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md), [Roadmap phases 31 and 37](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Roadmap.md), [Tools Reference](https://github.com/ChiR24/Unreal_mcp/wiki/Tools-Reference). For material/texture editing use [materials-textures](chir24-unreal-mcp-materials-textures.md).
