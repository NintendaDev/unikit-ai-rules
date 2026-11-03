# Fennara Godot MCP — Imported Assets

> See also: [Scenes and local overrides](fennara-godot-mcp-scenes-resources.md), [Visuals and animation](fennara-godot-mcp-visual-animation.md).

## Choose the scope

| Requested result | Tool |
| --- | --- |
| Change one authored instance's transform, material, or local resource | `run_scene_edit_script` on its authored scene |
| Inspect generated model/texture/audio/font data | `run_asset_import_script`, `mode: "inspect"` |
| Change how a source asset imports everywhere | Inspect, then `run_asset_import_script`, `mode: "edit"` |
| Render a loadable imported PackedScene | `screenshot_scene` |
| Change the source mesh/audio/image itself | The appropriate source-authoring tool; import options do not replace source editing |

There is no Fennara CLI asset-inspection/edit command. Let the connected Godot editor own import persistence and reimport verification. Generic filesystem or native headless import commands do not reproduce this tool's typed staging and recovery contract.

## Preconditions and inspection

Wait for editor filesystem readiness. The source must already be imported and have a matching `.import` sidecar. Do not infer the generated resource class solely from its extension.

Pass one `asset_path` and exactly one of `code` or `script_path`. The default mode is inspect, but state it explicitly.

Example invocation envelope:

```json
{
  "asset_path":"res://art/workshop_floor.png",
  "mode":"inspect",
  "script_path":"res://.fennara/tmp/editor_scripts/inspect_floor_import.gd"
}
```

The named script must exist. A small original inspection worker:

```gdscript
@tool
extends RefCounted

func run(ctx) -> void:
    var info: Dictionary = ctx.get_import_info()
    ctx.log("Importer: %s; resource class: %s" % [
        str(info.get("importer", "")),
        str(info.get("resource_class", ""))
    ])
    ctx.log(ctx.list_import_options("mipmaps/"))
    var imported: Resource = ctx.get_imported_resource()
    if imported == null:
        ctx.error("Generated resource could not be loaded.")
        return
    ctx.log("Loaded generated class: %s" % imported.get_class())
```

Use a prefix relevant to the selected importer. Read exact option names, native Variant types, values, and `editable` metadata before proposing a change.

## Context lookup

| Need | Helper |
| --- | --- |
| Import metadata | `get_import_info()` |
| Check/read one option | `has_import_option(name)`, `get_import_option(name)` |
| Relevant typed options | `list_import_options(prefix)` |
| Fresh generated resource | `get_imported_resource()` |
| Bounded imported scene inspection | `instantiate_imported_scene()` |
| Outputs/dependencies | `get_generated_files()`, `get_dependencies()` |
| Bounded resource overview | `get_subresource_summary()` |
| Stage/change inspection | `set_import_option(name, value)`, `get_staged_changes()` |
| Undo one staged choice | `discard_import_option_change(name)` |

All are methods on this tool's `ctx`. They are not scene-worker methods. Dependencies are **upstream import inputs**, not downstream consumers. Find scenes/materials/scripts that use the asset through repository search and targeted Godot inspection.

Generated resource loads ignore deep cached entries. Temporary imported scene inspection runs in the editor tree and is cleaned up. Helpers refuse scripted imported scene graphs, including relevant root/inherited/nested scripts; do not bypass that restriction.

## Typed edit after inspection

Only after inspection has confirmed that `mipmaps/generate` exists, is Boolean, and is editable for this texture:

```gdscript
@tool
extends RefCounted

func run(ctx) -> void:
    var option_name: String = "mipmaps/generate"
    if not ctx.has_import_option(option_name):
        ctx.error("Inspected mipmap option is no longer present.")
        return
    var previous: Variant = ctx.get_import_option(option_name)
    if not (previous is bool):
        ctx.error("Import option type changed; inspect again.")
        return
    if previous == true:
        ctx.log("Mipmaps already enabled; no change needed.")
        return
    if not ctx.set_import_option(option_name, true):
        return
    ctx.log("Accepted staged changes: %s" % str(ctx.get_staged_changes()))
```

Run with `mode: "edit"`. Preserve native types; do not coerce numbers/strings to fit a guessed option. If a setter rejects a value, return immediately. The complete call fails and staged changes are discarded; rejection does not forcibly halt arbitrary statements in your script.

## Supported edits and recovery

The researched version edits safe existing generated-cache options for built-in texture and scene importers. Importer identity, import scripts, `_subresources`, extraction destinations, and unknown-effect options remain inspect-only.

Never write `.import` directly. Fennara detects and restores sidecar modifications and reports failure.

On successful worker completion, Fennara persists staged options, reimports via the live `EditorFileSystem`, checks canonical settings/generated files/filesystem validity, and reloads deeply. If verification fails, it attempts restoration and reimport of the prior settings. Read whether recovery actually succeeded; do not assume atomic success from staging logs.

Summarize rather than dump mesh vertices, animation keys, texture bytes, or entire subresource dictionaries. Reuse the returned `script_path` for repairs. Verify affected consumers and rendered/behavioral output when that is the actual requested outcome.

## Sources

See [source inventory](fennara-godot-mcp-sources.md): `tools.md`, generated guidelines, and `run_asset_import_script.json`.
