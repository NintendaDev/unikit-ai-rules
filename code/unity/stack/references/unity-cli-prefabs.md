# Unity CLI — Prefabs: Create, Instantiate, Variants, Overrides and UI Prefabs

> See also: [unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md), [unity-cli-assets-import.md](unity-cli-assets-import.md), [unity-cli-scenes.md](unity-cli-scenes.md), [unity-cli-editor-session.md](unity-cli-editor-session.md); base rule: [../unity-cli.md](../unity-cli.md).

Written against Unity CLI 1.0.0-beta.14 and com.unity.pipeline 0.9.1-exp.1; the live catalog (`unity command --query <term> --format json`) outranks this page.

---

## Goal -> command

Run as `unity command prefab <name> --project-path "<project>" ...`. Asset paths are relative to the authoring root (default `Assets`; `authoring get_root`); the `Assets/` prefix and the `.prefab` extension are optional on create paths.

| Goal | Command |
|---|---|
| Save a scene object (with its children) as a prefab asset | `prefab create --source "/Enemies/Grunt" --path Prefabs/Grunt` |
| Place a prefab in a scene | `prefab instantiate --prefab Assets/Prefabs/Grunt.prefab [--scene_path <loaded scene>] [--name Grunt2]` |
| Derive a variant from a base prefab | `prefab create_variant --base Assets/Prefabs/Grunt.prefab --path Prefabs/GruntElite` |
| Write an instance's overrides back into its source asset | `prefab apply_overrides --instance "/Enemies/Grunt2"` |
| Discard an instance's overrides | `prefab revert_overrides --instance "/Enemies/Grunt2"` |
| Make an instance plain objects again | `prefab unpack --instance "/Enemies/Grunt2" [--completely true]` |
| Rename a child or set its active state inside the asset | `prefab save_contents --prefab Assets/Prefabs/Grunt.prefab --rename_child Body/Head --new_name Skull` or `--set_active_child Body/Hat --active false` |
| Put an instance under a parent | `gameobject set_parent --target T --parent P` (instantiate has no parent parameter) |
| Find or delete a prefab asset | `asset find --name Grunt --search_in Prefabs`, `asset delete --asset ... --confirm true` ([unity-cli-assets-import.md](unity-cli-assets-import.md)) |

## What is undoable and batchable

| Command | Scene side | Asset write | In a transactional `job batch` |
|---|---|---|---|
| `prefab instantiate` | Undo-able | none | yes |
| `prefab revert_overrides` | Undo-able | none | yes |
| `prefab unpack` | Undo-able | none | yes |
| `prefab create` | Undo-able (source becomes an instance) | **not** undoable | rejected |
| `prefab create_variant` | none | **not** undoable | rejected |
| `prefab apply_overrides` | Undo-able | **not** undoable | rejected |
| `prefab save_contents` | none | **not** undoable (stage save) | rejected |

A prefab asset write cannot be rolled back by Undo or by a batch. Validate up front, commit before a phase that rewrites prefabs, and keep rejected commands out of batches (run them alone, or in a batch with `--transactional false`).

## Case: turn a scene object into a prefab

**When:** a configured scene object (with its children) must become a reusable asset.

**Steps:**
```bash
unity command asset find --name Grunt --search_in Prefabs --project-path "<project>"      # is the path free?
unity command prefab create --source "/Enemies/Grunt" --path Prefabs/Grunt --project-path "<project>"
unity command asset find --name Grunt --search_in Prefabs --project-path "<project>"      # now lists Assets/Prefabs/Grunt.prefab
unity command scene save --project-path "<project>"
```
**Verify:** the second `asset find` returns the path and GUID; `gameobject find --hierarchy_path /Enemies/Grunt` still returns the source, which is now a connected prefab instance; instantiate once (below) and read the copy's properties.

**Pitfalls:** `prefab create` takes no `confirm`, so check the path first (whether an existing file is overwritten is not stated; treat it as destructive). The source must be a scene object, and the connection lives in the scene, so save it. The path is confined to the authoring root. Whether `prefab create` makes a missing target folder is not stated: run `asset create_folder --path Prefabs` first (it creates intermediate folders).

## Case: instantiate

**When:** a copy of a prefab asset is needed in a loaded scene.

```bash
unity command prefab instantiate --prefab Assets/Prefabs/Grunt.prefab --name Grunt2 --project-path "<project>"
unity command gameobject set_parent --target "/Grunt2" --parent "/Enemies" --project-path "<project>"
```
The instance goes to the active scene's root (or `--scene_path`); there is no parent parameter. Take `instanceId` from the reply and use it for the next call. Several copies in one Undo step: `job batch` with `prefab instantiate` then `gameobject set_parent` and a reference `"$a.instanceId"` ([unity-cli-editor-session.md](unity-cli-editor-session.md)). **Verify** with `gameobject find` and `component get_properties` on the copy. Work in Edit Mode: scene commands are refused in Play Mode, and a runtime copy is lost when Play stops.

## Case: change an existing prefab

**When:** an existing prefab asset needs a different structure or values.

Pick the route by what changes.

| Change | Route |
|---|---|
| Rename a child, switch a child on or off | `prefab save_contents` (declarative, nested-prefab safe, no instance needed) |
| Component values, added or removed objects or components | instantiate -> edit the instance with `gameobject`/`component` commands -> `prefab apply_overrides` -> `gameobject delete` the temporary instance |
| Many structural edits | a builder script run in memory ([unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md)) |

```bash
unity command prefab save_contents --prefab Assets/Prefabs/Grunt.prefab --rename_child Body/Head --new_name Skull --project-path "<project>"
```
`apply_overrides` has no parameter that selects which override to push: it applies the instance's overrides to the source asset, which must live under the authoring root. Read the instance's properties before applying. To discard instead, `revert_overrides` (Undo-able). After `prefab unpack` the object is no longer linked, so later applies have nothing to write to; `--completely true` unpacks nested prefabs too, the default only the outermost level.

Whether `component set_properties` or `set_field` can address a component inside a prefab **asset** by its asset path is not documented here; discover with `unity command --query set_field --detail full --format json` rather than assuming.

## Case: variants

**When:** a prefab needs a specialised copy that keeps following its base.

```bash
unity command prefab create_variant --base Assets/Prefabs/Grunt.prefab --path Prefabs/GruntElite --project-path "<project>"
unity command prefab instantiate --prefab Assets/Prefabs/GruntElite.prefab --name Elite1 --project-path "<project>"
unity command component set_properties --target "/Elite1" --type UnityEngine.Rigidbody --properties '{"m_Mass":4}' --project-path "<project>"
unity command prefab apply_overrides --instance "/Elite1" --project-path "<project>"
```
The variant inherits from the base; changing the base propagates to it. **Verify** the base is untouched by reading the property on a fresh instance of each.

## Case: UI prefabs

**When:** a uGUI screen or widget becomes a prefab, or a UI prefab is placed in a scene.

Layout, naming and prefab boundaries of uGUI screens live in the project rule `ugui-layout.md`; this is the CLI mechanics only. Build the screen under a Canvas in a scene ([unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md), section "UI (uGUI) through the CLI"), then:
```bash
unity command prefab create --source "/Canvas/ShopScreen" --path UI/Shop/ShopScreen --project-path "<project>"
unity command prefab instantiate --prefab Assets/UI/Shop/ShopScreen.prefab --name ShopScreen --project-path "<project>"
unity command gameobject set_parent --target "/ShopScreen" --parent "/Canvas" --world_position_stays false --project-path "<project>"
unity command component get_properties --target "/Canvas/ShopScreen" --type UnityEngine.RectTransform --project-path "<project>"
```
- An instantiated UI prefab lands at the scene root, outside any Canvas, so it is neither scaled nor visible: parent it under a Canvas right away, with `--world_position_stays false` (the default `true` rewrites RectTransform values).
- **Verify the rectangles (bridge `ui-1`):** read anchors, pivot, anchored position and size of the instance under its Canvas and compare them with the prefab's intent; width and height above zero.
- Keep scene singletons out of UI prefabs: an EventSystem inside a prefab makes a second one on instantiate. The Canvas is part of the prefab only when the project rule says so.
- Fix a wrong value on the instance in place; if it was a mistake, `revert_overrides`. Do not delete and recreate the instance to fix a property: references to it turn null.
- Sprites and fonts a UI prefab references are assets: import and slicing are in the sprites file; text assets (UXML/USS) in assets-import.

## Pitfalls

- Putting `prefab create`, `create_variant`, `apply_overrides` or `save_contents` into a transactional batch (rejected) or expecting Ctrl+Z to undo their asset write.
- Hand-editing a `.prefab` file while the Editor is reachable: the Editor does not see it and GUIDs break.
- Instantiating a UI prefab and judging it by a screenshot of Edit Mode: overlay UI is not in it; read the rectangles.
- Applying overrides from an instance whose source prefab is outside the authoring root (refused) or from an unpacked object (no source).
- Forgetting to save the scene after `prefab create`: on disk the source object stays an ordinary object, because the connection to the new asset exists only in the unsaved scene.
