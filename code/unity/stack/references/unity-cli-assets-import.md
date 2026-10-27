# Unity CLI — Assets and Import Settings

> See also: [unity-cli.md](../unity-cli.md) · [unity-cli-sprites-atlases.md](unity-cli-sprites-atlases.md) · [unity-cli-materials-shaders.md](unity-cli-materials-shaders.md) · [unity-cli-projects-templates.md](unity-cli-projects-templates.md) · [unity-cli-version-control.md](unity-cli-version-control.md)

Written against Unity CLI 1.0.0-beta.14 and com.unity.pipeline 0.9.1-exp.1; the live catalog (`unity command --query <term> --format json`) outranks this page.

---

## Goal -> command

Commands run as `unity command asset <verb> --<param> <value>` against a ready Editor; add `--project-path "<project>"` when several Editors may run. An `<asset>` reference is a path, a GUID or a globalId; a string with a file extension and no leading `/` is read as an asset path under the authoring root, and the `Assets/` prefix is optional.

| Goal | Command | Notes |
|---|---|---|
| See where bare paths land | `authoring get_root` | default `Assets`; narrow it with `authoring set_root --root Assets/AgentWork` |
| Create a folder | `asset create_folder --path Gameplay/Enemies` | creates intermediate folders; no confirm |
| Create a ScriptableObject, material or other asset | `asset create --path Data/Config.asset --type MyGame.GameConfig` | `--shader` applies to materials only |
| Bring an external file in (texture, audio, model, text) | `asset import --source <absolute file> --path Art/hero.png` | copies, then imports |
| Move or rename (keeps GUID) | `asset move --asset A --destination B`, `asset rename --asset A --new_name N` | `new_name` has no folder part |
| Copy (new GUID) | `asset copy --asset A --destination B` | |
| Delete | `asset delete --asset A --confirm true` | refused without `confirm`; not undoable |
| Find | `asset find --type Material --search_in Materials` | one of `type`, `name`, `label` is required; `limit` defaults to 200 |
| Read / write importer settings | `asset get_import_settings`, `asset set_import_settings --settings '{...}'` | |
| Read / write a UTF-8 text file | `asset read_text`, `asset write_text` | UXML, USS, JSON, plain text |
| Preview any overwriting or destructive call | add `--dry_run true` | `dry_run` wins even when `confirm` is also true |

Shell note: JSON and markup values use Git Bash quoting (single quotes around the value). In Windows PowerShell 5.1 write each inner `"` as `\"`; PowerShell 7.3+ accepts the Git Bash form. Pass absolute file paths with forward slashes. C# quoting is owned by [unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md).

## Authoring root and paths

**When:** before the first write of a session, and whenever a path lands somewhere unexpected.

```bash
unity command authoring get_root
unity command authoring set_root --root Assets/AgentWork
```

- Every path argument is confined to the authoring root: `..` is rejected, a bare `Materials/Stone.mat` resolves under the root, an explicit `Assets/...` path is used as written but must still sit inside the root. Writes outside it are refused.
- Do not assume the root is `Assets`: read it, because another session or tool may have narrowed it. Whether the root survives an Editor restart is not documented.
- **Verify:** every reply carries `assetPath` (and `guid`); check it is the folder you meant. Keep the `guid` for later references.

## Create folders, ScriptableObjects and material assets

```bash
unity command asset create_folder --path Data
unity command asset create --path Data/Balance.asset --type MyGame.BalanceConfig --dry_run true
unity command asset create --path Data/Balance.asset --type MyGame.BalanceConfig
unity command component set_field --target Assets/Data/Balance.asset --field maxLives --value 3
unity command component get_fields --target Assets/Data/Balance.asset --field maxLives
```

- `path` includes the extension (`.asset`, `.mat`). `type` is a short or fully qualified name of a creatable `UnityEngine.Object` subclass; a ScriptableObject type must already be compiled (`script create` -> recompile loop is owned by [unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md)).
- Creating over an existing asset needs `--confirm true`; without it the call is refused. Run `--dry_run true` first when the path may exist.
- Materials: pass `--type UnityEngine.Material` and optionally `--shader "Universal Render Pipeline/Lit"`. Without `--shader` the default is URP/Lit when a scriptable render pipeline is active, otherwise Standard. Property editing is in [unity-cli-materials-shaders.md](unity-cli-materials-shaders.md).
- Field writes on an asset use `component set_field` / `component get_fields` (field path syntax such as `items.Array.data[0]`).
- **Verify:** `asset find --name Balance --search_in Data`, then `component get_fields` for the values. A field write is only in memory until the asset is saved; confirm it reached disk (a read-only look at the `.asset` YAML with `asset read_text` is enough) before committing. Saving behaviour of field writes is not stated in the docs.

## Import an external file

```bash
unity command asset import --source "<absolute path>/hero.png" --path Art/Characters/hero.png --dry_run true
unity command asset import --source "<absolute path>/hero.png" --path Art/Characters/hero.png
unity command asset get_import_settings --asset Art/Characters/hero.png --format json
```

- `source` is an absolute filesystem path; `path` is the destination under the authoring root, extension included. An existing destination needs `--confirm true`.
- For a texture that must become a sprite, continue with import settings below and [unity-cli-sprites-atlases.md](unity-cli-sprites-atlases.md).
- C# files are not imported this way: use `script create` ([unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md)).
- A screenshot saved with a project-relative path can land inside `Assets/` and get imported as a texture (bridge check `visual-1`; see [unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md)).

## Move, rename, copy, delete

```bash
unity command asset move --asset Art/old/hero.png --destination Art/Characters/hero.png --dry_run true
unity command asset move --asset Art/old/hero.png --destination Art/Characters/hero.png
unity command asset delete --asset Art/Characters/unused.png --dry_run true
unity command asset delete --asset Art/Characters/unused.png --confirm true
```

- Move and rename go through the AssetDatabase, so the GUID and the `.meta` travel with the file and every reference survives. Moving a file with `mv` or `git mv` outside the Editor is what breaks references; see [unity-cli-version-control.md](unity-cli-version-control.md).
- `copy` produces a new GUID; scenes and prefabs still point at the original.
- `delete` leaves every reference to the asset dangling. Before deleting, read the asset's GUID from `asset find` and search scenes and prefabs for it (read-only); reading a `.meta` is fine, editing it never is.
- **Verify:** `asset find --name <name>` returns the new location and none at the old one.

## Find assets

```bash
unity command asset find --type Material --search_in Materials --limit 50 --format json
unity command asset find --name Hud --search_in UI
unity command asset find --label Boss
```

At least one of `type`, `name`, `label`; `search_in` is relative to the authoring root. A type filter is matched against each asset's actual main type, so filter by the concrete type name (`Material`, `MyGame.GameConfig`). Results are capped by `limit`; raise it for big folders.

## Import settings (read, write, verify)

**When:** texture type, readability, sRGB, filter mode, compression, audio load type and similar importer properties.

```bash
unity command asset get_import_settings --asset Art/ui_icon.png --platform Android --format json
unity command asset set_import_settings --asset Art/ui_icon.png --settings '{"textureType":"Sprite","isReadable":false}' --dry_run true
unity command asset set_import_settings --asset Art/ui_icon.png --settings '{"textureType":"Sprite","isReadable":false}'
unity command asset get_import_settings --asset Art/ui_icon.png --format json
```

- `settings` is a JSON object of importer property or field names to values; enums go in by name. `--dry_run true` reports which names would apply and which are unknown. Run it first and treat an unknown name as a failed call, not a warning.
- `get_import_settings` returns settings by importer type (texture, model, audio) plus one platform block (`Default | Standalone | iOS | Android | WebGL | tvOS`).
- `set_import_settings` has no platform parameter. Per-platform overrides (max size, compression format) are written with C# through `script run`; see [unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md).
- Settings live in the `.meta` file and re-import the asset. Never edit the `.meta` by hand.
- **Verify:** read the settings back after the write and compare the changed names; do not trust the success reply.

## Text assets: UXML, USS, JSON

**When:** UI Toolkit screens (`.uxml`, `.uss`), JSON or plain-text data inside `Assets/`.

```bash
unity command asset read_text --path UI/Hud.uxml
unity command asset write_text --path UI/Hud.uss --contents '.root { flex-grow: 1; }' --dry_run true
unity command asset write_text --path UI/Hud.uss --contents '.root { flex-grow: 1; }'
unity command asset import --source "<scratch>/Hud.uxml" --path UI/Hud.uxml --confirm true
```

- `write_text` replaces the whole file and then imports it; overwriting needs `--confirm true`. `read_text` rejects files over 1 MiB (`max_bytes`).
- For long or quote-heavy markup, write the file outside the project with your normal file tool and bring it in with `asset import` instead of squeezing it through a shell argument (an inference from `asset import`; confirm with `read_text`).
- Write each file complete, never a draft: a half-written UXML is a parse error the moment the Editor imports it. Finish all related files (UXML, USS, `PanelSettings`) before checking.
- UXML rules that fail silently: one top-level element, `<ui:Style src="..."/>` for stylesheets, no `style="..."` attributes. USS is a CSS subset: no `gap`, `z-index`, `box-shadow`, `border` shorthand or gradients; images use `url("project://database/Assets/...")`.
- A `PanelSettings` asset is required for a `UIDocument` to render: `asset create --path UI/PanelSettings.asset --type UnityEngine.UIElements.PanelSettings` (confirm the type name in the catalog); scene wiring is in [unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md).
- **Verify (bridge check `asset-1`):** a broken markup or style file is accepted as a success and the parse error appears only in the console. After the write run `console status`, then `console get --level warn`, and read the entries for the file name. Read the file back with `read_text`. Whether the layout looks right still needs a screenshot ([unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md)).

## Not undoable, not batchable, Play Mode

- Asset and file writes are outside Unity's Undo: `asset create/import/move/copy/rename/delete/create_folder/set_import_settings/write_text` and `authoring set_root` cannot be reverted with Ctrl+Z. Commit or copy before bulk changes.
- A transactional `job batch` rejects all of them (`not_batchable_transactional`); run them standalone or in a batch with `transactional: false` ([unity-cli-editor-session.md](unity-cli-editor-session.md)).
- The docs do not say whether asset commands are blocked in Play Mode (scene and object mutations are). Stop Play Mode before moving, deleting or re-importing assets: a re-import can trigger a reload.

## Pitfalls

- A reply of success is not evidence: read back `find`, `get_import_settings` or `read_text` (false success, eaten parameter).
- A misspelled importer property in `settings` is reported as unknown only if you look; use `--dry_run` and read the unknown list.
- Forgetting `--confirm true` is refused, not skipped: the file stays as it was.
- `asset find` with no filter fails; with a wrong `search_in` it returns nothing, which reads like "asset missing".
- Hand-editing `.meta`, `.asset` or `.prefab` files while an Editor is reachable breaks GUIDs and is invisible to the Editor until a reimport (rule in [unity-cli.md](../unity-cli.md)).
- `.unitypackage` export and import are standalone `unity assets ...` commands owned by [unity-cli-projects-templates.md](unity-cli-projects-templates.md).
