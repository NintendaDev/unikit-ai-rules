# Unity CLI — Materials and Shaders

> See also: [unity-cli.md](../unity-cli.md) · [unity-cli-assets-import.md](unity-cli-assets-import.md) · [unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md) · [unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md) · [unity-cli-settings-packages.md](unity-cli-settings-packages.md)

Written against Unity CLI 1.0.0-beta.14 and com.unity.pipeline 0.9.1-exp.1; the live catalog (`unity command --query <term> --format json`) outranks this page.

---

## Goal -> command

Run as `unity command material <verb> --<param> <value>` against a ready Editor (add `--project-path "<project>"` when several Editors may run). A `<material>` reference is an asset path (`Materials/Wall.mat`, `Assets/` prefix optional), a GUID, a globalId or the instance id of a loaded material.

| Goal | Command |
|---|---|
| List shaders that exist (pick a valid name) | `material list_shaders --filter "Universal Render Pipeline" --format json` |
| Property names, types and ranges of a shader | `material get_shader_properties --shader "Universal Render Pipeline/Lit"` (or `--material <material>`) |
| Create a material asset | `asset create --path Materials/Wall.mat --type UnityEngine.Material --shader "Universal Render Pipeline/Lit"` |
| Read shader, queue, keywords and every property value | `material get_properties --material Materials/Wall.mat --format json` |
| Set colors, floats, vectors, textures | `material set_properties --material M --properties '{...}'` |
| Swap the shader | `material set_properties --material M --shader "<name>"` |
| Toggle keywords / render queue | `--enableKeywords '["_EMISSION"]'`, `--disableKeywords '[...]'`, `--renderQueue 3000` (`-1` inherits) |
| Preview an edit | add `--dry_run true` |
| Find materials | `asset find --type Material --search_in Materials` |
| Put a material on a renderer | `component set_field` (scene mutation, [unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md)) |

Shell note: JSON values use Git Bash quoting (single quotes around the value). In Windows PowerShell 5.1 write each inner `"` as `\"`; PowerShell 7.3+ accepts the Git Bash form.

## Pick a shader and read its properties

**When:** before the first `set_properties` on any shader you have not used in this session.

```bash
unity command material list_shaders --filter "Lit" --includeBuiltin false --limit 50 --format json
unity command material get_shader_properties --shader "Universal Render Pipeline/Lit" --format json
```

- `list_shaders` returns `name`, `assetPath`, `isBuiltin`, `isSupported`; `assetPath` is absent for engine shaders unless `verbose` is requested, so classify by `isBuiltin`. Prefer entries with `isSupported: true`.
- `get_shader_properties` returns each property's name, type (`Color`, `Vector`, `Float`, `Range`, `TexEnv`, `Int`), range, texture dimension and flags. Property names carry the leading underscore (`_BaseColor`); copy them from this reply, do not recall them.
- **Verify:** the shader name you will assign appears in the `list_shaders` reply exactly as spelled.

## Create a material asset

```bash
unity command asset create --path Materials/Wall.mat --type UnityEngine.Material --shader "Universal Render Pipeline/Lit" --dry_run true
unity command asset create --path Materials/Wall.mat --type UnityEngine.Material --shader "Universal Render Pipeline/Lit"
unity command material get_properties --material Materials/Wall.mat --format json
```

- Without `--shader` the default is URP/Lit when a scriptable render pipeline is active, otherwise Standard (falling back to Standard when URP/Lit is missing). Overwriting an existing path needs `--confirm true`.
- **Verify:** the `shader` field in `get_properties` is the one you asked for. The docs do not say what an unknown shader name does, so check the field instead of trusting the reply.

## Set properties, keywords and render queue

```bash
unity command material set_properties --material Materials/Wall.mat --properties '{"_BaseColor":"#3366FFFF"}' --dry_run true
unity command material set_properties --material Materials/Wall.mat --properties '{"_BaseColor":[0.2,0.4,1,1],"_Metallic":0.0}'
unity command material set_properties --material Materials/Wall.mat --properties '{"_BaseMap":{"path":"Assets/Art/wall.png"}}'
unity command material set_properties --material Materials/Wall.mat --enableKeywords '["_EMISSION"]' --properties '{"_EmissionColor":[1,0.5,0,1]}'
```

| Shader property type | JSON value |
|---|---|
| Float, Range, Int | a number |
| Color | `[r,g,b,a]` or `"#RRGGBBAA"` |
| Vector | `[x,y,z,w]` |
| Texture (`TexEnv`) | an object reference such as `{"path":"Assets/..."}` or `{"guid":"..."}`; `null` clears it |

- A reassigned `--shader` is applied before the properties, so the new names resolve against the new shader.
- Names that do not exist and values of the wrong type are reported in `unknown[]` while the call still returns normally. Run `--dry_run true` (it reports `applied[]` and `unknown[]` without writing), and treat any `unknown` entry as a failed edit.
- `confirm` is not needed for editing an existing material.
- **Verify:** `material get_properties` again and compare each changed value; for a visual check use a screenshot ([unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md)).
- **Pitfalls:** a keyword is not a property: enabling `_EMISSION` shows nothing until `_EmissionColor` is non-black, and setting the color without the keyword does the same. Hex colors use the `#RRGGBBAA` form. Every enabled keyword can add shader variants to the build; enable only what the look needs.

## Put the material on a renderer

Assigning is a component write on the scene object, not a `material` command:

```bash
unity command component set_field --target "/Ground" --component MeshRenderer --field m_Materials.Array.data[0] --value '{"path":"Assets/Materials/Wall.mat"}'
unity command component get_fields --target "/Ground" --component MeshRenderer --field m_Materials
```

- Component writes are scene mutations: they need the scene saved afterwards and follow the Play Mode rules of [unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md). The `.mat` asset itself is written to disk by `set_properties` and needs no scene save.
- **Verify:** the `get_fields` reply shows the material handle you assigned.

## Asset material versus runtime material

- A path, GUID or globalId reference edits the `.mat` asset on disk; every renderer sharing it changes, and the change persists. Do not tweak a shared asset "just to test" in Play Mode: the edit stays after you stop. Restore it, or `asset copy` the material first and test on the copy.
- An instance id targets a loaded material object, for example the per-renderer instance a script created. Such an instance is not an asset; the docs do not say it is saved, so treat it as lost on Play Mode exit. Get the instance id through C# ([unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md)); serialized fields only show the shared asset.
- Per-object variation without touching the shared asset is a runtime concern (an instance or a property block), not a `material` command.

## URP and mobile notes

- Use shaders from the active pipeline. A Built-in shader under URP, or URP shaders in a project whose default pipeline asset is unset, render pink. Check `settings.graphics get` ([unity-cli-settings-packages.md](unity-cli-settings-packages.md)); installing the URP package into a Built-in project does not assign a pipeline asset.
- Typical URP names (confirm each with `list_shaders`): `Universal Render Pipeline/Lit`, `Universal Render Pipeline/Simple Lit`, `Universal Render Pipeline/Unlit`; 2D sprite shaders appear in the same listing (filter by `Sprite`). A Shader Graph shader is assigned by the name it was saved under.
- Mobile: prefer Unlit or Simple Lit for anything that does not need full PBR, keep keywords few, and keep texture sizes and compression in import settings ([unity-cli-assets-import.md](unity-cli-assets-import.md)).

## Not undoable, not batchable

`material set_properties` writes the `.mat` to disk. The reference page calls the edit undoable, but the batch rules list it as non-revertible: a transactional `job batch` rejects it (`not_batchable_transactional`), so run it standalone or with `transactional: false`. Do not rely on Ctrl+Z to roll a material back; keep the previous values from `get_properties` or commit first.

## Pitfalls

- Success is not evidence: read `get_properties` after every edit (false success; unknown names are swallowed into `unknown[]`).
- Property names need the leading underscore (`_BaseColor`, not `BaseColor`).
- A texture assigned to a normal-map slot needs `textureType: NormalMap` in its import settings first (`asset set_import_settings`, [unity-cli-assets-import.md](unity-cli-assets-import.md)); the material edit will not fix a wrongly imported texture.
- `asset create --shader` is for materials only and is ignored for other types.
- The compact command listing shows zero parameters for every command; read the schema (`unity command --query material --format json`) before the first call.
