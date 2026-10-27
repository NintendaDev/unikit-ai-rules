# Unity CLI — GameObjects, Components, Properties and uGUI Hierarchies

> See also: [unity-cli-scenes.md](unity-cli-scenes.md), [unity-cli-prefabs.md](unity-cli-prefabs.md), [unity-cli-assets-import.md](unity-cli-assets-import.md), [unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md); base rule: [../unity-cli.md](../unity-cli.md).

Written against Unity CLI 1.0.0-beta.14 and com.unity.pipeline 0.9.1-exp.1; the live catalog (`unity command --query <term> --format json`) outranks this page.

---

## Goal -> command

Run as `unity command <group> <name> --project-path "<project>" ...`. `T` is a handle (see below). Mutations are Undo-able and refused in Play Mode; reads work anywhere.

| Goal | Command |
|---|---|
| Create an empty object or a primitive | `gameobject create --name Foo [--primitive cube\|sphere\|capsule\|cylinder\|plane\|quad] [--parent P]` |
| Create N at once | `gameobject create_many --name Spawn --count 3 --positions '[[0,0,0],[1,0,0],[2,0,0]]' [--parent P]` |
| Find (filters combine) | `gameobject find [--name N] [--tag T] [--type UnityEngine.Camera] [--hierarchy_path /Root/Child] [--include_inactive false]` |
| Local position / rotation (Euler) / scale | `gameobject set_transform --target T --position '[x,y,z]' [--rotation ...] [--scale ...]` |
| Reparent or detach to root | `gameobject set_parent --target T [--parent P] [--world_position_stays false]` |
| Active / tag / layer / name | `gameobject set_active --target T --active false`, `set_tag --tag Player`, `set_layer --layer UI`, `rename --name X` |
| Delete | `gameobject delete --target T` |
| Add / remove a component | `component add --target T --type UnityEngine.UI.Image`, `component remove --target T --type ...` |
| Read all serialized properties | `component get_properties --target T --type X` |
| Write several properties (one Undo step) | `component set_properties --target T --type X --properties '{"name":value}'` |
| Read / write one field, arrays, references | `component get_fields --target T --component X [--field F]`, `component set_field --target T --component X --field F --value V` |
| Selection and Unity Search | `gameobject get_selection`, `gameobject set_selection --instance_ids '[1,2]'`, `editor search --query "t:Material" --limit 20` |
| Many steps in one request | `job batch` ([unity-cli-editor-session.md](unity-cli-editor-session.md)) |

Note the asymmetry: `add`, `remove`, `get_properties`, `set_properties` take `--type`; `get_fields`, `set_field` take `--component`. Read the schema before the first call. JSON arguments are shown in Git Bash quoting; for Windows PowerShell 5.1 escape the inner quotes as described in [unity-cli-editor-session.md](unity-cli-editor-session.md).

## Case: address objects reliably

**When:** every call that names an object (`--target`, `--parent`, `--source`, `--instance`).

A handle is one of: `hierarchyPath` (leading `/`: `/Canvas/Panel`), `instanceId`, `globalId`, an asset `path` (has an extension, no leading `/`), or `guid`. Every creating or modifying call returns the object's identity (`instanceId`, `hierarchyPath`, `type`, `globalId`); chain the returned `instanceId` into the next call instead of rebuilding a path. Paths change when you rename or reparent, and one path can exist in two open scenes: address by instance id when in doubt (bridge `scene-3`). Pass `T` as a path string, or as a JSON handle such as `'{"instanceId":123}'` (confirm how the CLI spells a numeric id in the schema). Use full type names (`UnityEngine.Camera`, `UnityEngine.UI.Image`): a short name can be ambiguous.

```bash
unity command gameobject find --hierarchy_path /Canvas/Panel --project-path "<project>"       # identity: instanceId, hierarchyPath, type, globalId
unity command gameobject rename --target '{"instanceId":123}' --name Title --project-path "<project>"
```
**Verify:** the identity a call returns names the object you meant (`hierarchyPath`, `type`) before you build on it.

## Case: find and read narrowly

**When:** you need to know what exists before changing it, or to confirm a change.

A whole-scene read costs about 30 tokens per object ([unity-cli-scenes.md](unity-cli-scenes.md)). Prefer `gameobject find` with the narrowest filter, then `component get_properties` on the one object. `include_inactive` defaults to true, so inactive copies show up in counts.
```bash
unity command gameobject find --type UnityEngine.Canvas --project-path "<project>"
unity command component get_properties --target "/Canvas" --type UnityEngine.UI.CanvasScaler --project-path "<project>"
```
**Verify:** the identity list is the count you expected; read properties by name, never infer them.

**Pitfalls:** a whole-scene dump instead of `find`; a path built from memory after a rename or reparent.

## Case: create and arrange objects

**When:** new gameobjects, primitives or an object tree are needed in the open scene.

**Steps:**
```bash
unity command gameobject create --name Enemies --project-path "<project>"
unity command gameobject create --name Grunt --primitive capsule --parent "/Enemies" --project-path "<project>"
unity command gameobject set_transform --target "/Enemies/Grunt" --position '[2,0,5]' --project-path "<project>"
unity command gameobject set_tag --target "/Enemies/Grunt" --tag Enemy --project-path "<project>"
```
**Verify:** `gameobject find --hierarchy_path /Enemies/Grunt` returns one identity; `component get_properties --target ... --type UnityEngine.Transform` shows the values; then `scene save` ([unity-cli-scenes.md](unity-cli-scenes.md)).

**Pitfalls:** a new object lands in the **active** scene. `set_tag` needs a tag that already exists (add it with `settings.tags_layers set`, see settings-packages). `set_parent` keeps world position by default (`--world_position_stays true`). `create_many` array lengths must equal `count`; without explicit names objects are `Name1..NameN`. `delete` is Undo-able but the scene stays dirty until saved.

## Case: components and properties

**When:** a component must be added or removed, or a serialized value changed.

**Steps:** read first, write second, read again.
```bash
unity command component get_properties --target "/Enemies/Grunt" --type UnityEngine.Rigidbody --project-path "<project>"
unity command component set_properties --target "/Enemies/Grunt" --type UnityEngine.Rigidbody --properties '{"m_Mass":2.5}' --project-path "<project>"
unity command component set_field --target "/Enemies/Grunt" --component MyGame.Health --field m_Max --value 40 --project-path "<project>"
```
- Names are **serialized property names** as `get_properties` prints them (for example `m_Mass`), not C# property names. Vectors and colors are arrays, enums are value names, object references are handle objects (`null` clears one). `set_field` addresses nested paths and arrays: `items.Array.data[0]`, `items.Array.size` to resize.
- `set_properties` is one Undo step; an unknown property name fails the whole call with no partial apply. Do not rely on every command to reject a wrong name: after any write, read the value back and compare (bridge classes "false success" and "eaten parameter").
- **Verify:** `get_properties` or `get_fields` after the write returns the value you set. **Pitfalls:** guessing a property name; setting a script field before the script compiled.
- Custom MonoBehaviour fields are visible only after the script compiled; creating, attaching and recompiling are in [unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md).

## UI (uGUI) through the CLI

**When:** a uGUI screen, HUD or widget is created, changed or checked. UI work here is scene, GameObject and component work. Rules for layout (what contains what, naming, anchors per screen, prefab boundaries, automatic layout) live in the project rule `ugui-layout.md` and win over this page; this section supplies only the CLI mechanics. UXML and USS files are text assets: see [unity-cli-assets-import.md](unity-cli-assets-import.md).

**1. Read before you create.** Reuse what exists; a second Canvas or EventSystem is a defect.
```bash
unity command scene list_open --project-path "<project>"
unity command gameobject find --type UnityEngine.Canvas --project-path "<project>"
unity command gameobject find --type UnityEngine.EventSystems.EventSystem --project-path "<project>"   # exactly one across all open scenes
```
**2. Canvas root: Canvas + CanvasScaler + GraphicRaycaster.** Add all three. Default scaler mode is Scale With Screen Size with the reference resolution of the project or specification and match 0.5; keep an existing Constant Pixel Size canvas and ask before changing it; with Screen Space - Camera read the camera first. Read the exact property names with `get_properties`, then write them (enums by value name):
```bash
unity command gameobject create --name Canvas --project-path "<project>"
unity command component add --target "/Canvas" --type UnityEngine.Canvas --project-path "<project>"
unity command component add --target "/Canvas" --type UnityEngine.UI.CanvasScaler --project-path "<project>"
unity command component add --target "/Canvas" --type UnityEngine.UI.GraphicRaycaster --project-path "<project>"
unity command component set_field --target "/Canvas" --component UnityEngine.UI.CanvasScaler --field m_UiScaleMode --value ScaleWithScreenSize --project-path "<project>"
unity command component set_field --target "/Canvas" --component UnityEngine.UI.CanvasScaler --field m_ReferenceResolution --value '[1080,1920]' --project-path "<project>"
```
**3. Exactly one EventSystem** with an input module that matches the project's active input handling: `UnityEngine.InputSystem.UI.InputSystemUIInputModule` (Input System package) or `UnityEngine.EventSystems.StandaloneInputModule` (legacy Input Manager). A missing EventSystem or GraphicRaycaster leaves interactive elements that exist but never react, with no error.

**4. Children: create under the parent, then RectTransform in this order: anchors, pivot, offsets.** Adding a uGUI component (`Image`, `TMPro.TextMeshProUGUI`) is expected to turn the object's Transform into a RectTransform: confirm it by reading `UnityEngine.RectTransform` (step 7). `set_transform` has no anchor, pivot or size parameters, so RectTransform layout goes through properties. Pivot follows the anchor point (a top-right corner element gets pivot `[1,1]`, a bottom bar `[0.5,0]`, not the default centre). Offsets are `m_AnchoredPosition` and `m_SizeDelta`; with stretched anchors `m_SizeDelta` is relative to the anchor span (0 fills it). Example, a full-width bottom bar 160 high:
```bash
unity command gameobject create --name BottomBar --parent "/Canvas" --project-path "<project>"
unity command component add --target "/Canvas/BottomBar" --type UnityEngine.UI.Image --project-path "<project>"
unity command component set_properties --target "/Canvas/BottomBar" --type UnityEngine.RectTransform --properties '{"m_AnchorMin":[0,0],"m_AnchorMax":[1,0],"m_Pivot":[0.5,0],"m_AnchoredPosition":[0,0],"m_SizeDelta":[0,160]}' --project-path "<project>"
```
Honor pixel sizes and colors the user gave exactly. Reparent with `gameobject set_parent --world_position_stays false`: the default `true` rewrites a RectTransform's anchored values to keep the world position.

**5. Controls.** Text is `TMPro.TextMeshProUGUI`, not legacy `UnityEngine.UI.Text`; text is `m_text`, the font asset follows the project's UI rules. Never import TMP Essentials through a menu item (`editor invoke_menu` or `ExecuteMenuItem` opens a modal that blocks the Editor): import them non-interactively from code with `TMP_PackageResourceImporter.ImportResources()`. A `UnityEngine.UI.Button` needs a target graphic (`Image`, assigned as an object reference). Set `m_RaycastTarget` false on every non-interactive Image and text, true on interactive ones. Wiring `onClick` is needed only when logic was requested, and is done from code.

**6. ScrollView.** Hierarchy: ScrollView (`UnityEngine.UI.ScrollRect`) -> Viewport (`UnityEngine.UI.Mask` + `Image`) -> Content (`VerticalLayoutGroup` + `ContentSizeFitter`, vertical fit Preferred Size). Assign the ScrollRect's content and viewport fields with `set_field` and handle objects (`'{"hierarchyPath":"/Canvas/List/Viewport/Content"}'`). Clear Content before filling it at runtime, or items duplicate on every open. Jitter or an ignored fitter usually means a ContentSizeFitter is fighting a Layout Group (same object with Control Child Size on the same axis, or a parent that controls the child's size); the settings are in `ugui-layout.md`.

**7. Verify the rectangles (bridge `ui-1`).** After creating an element under a **child** of a screen-space overlay canvas, read its RectTransform back and compare anchors, pivot, anchored position and size with what you intended; width and height must be above zero (or stretch anchors with valid offsets), the rectangle must sit inside its parent, a later sibling draws over an earlier one, and an Image needs a sprite or a color with alpha above zero.
```bash
unity command component get_properties --target "/Canvas/BottomBar" --type UnityEngine.RectTransform --project-path "<project>"
```
Layout-group-driven sizes exist only as computed values: read `rect` with `script eval` after `UnityEngine.Canvas.ForceUpdateCanvases()` ([unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md)). Overlay UI is not in an Edit Mode screenshot; in Play Mode `capture game_view --source screen` shows it ([unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md)). Save the scene when clean.

**Bulk build:** one transactional batch makes the whole skeleton a single Undo step; dry-run it first.
```bash
unity command job batch --project-path "<project>" --dry_run true --operations '[{"id":"cv","command":"gameobject create","params":{"name":"Canvas"}},{"command":"component add","params":{"target":"$cv.instanceId","type":"UnityEngine.Canvas"}},{"command":"component add","params":{"target":"$cv.instanceId","type":"UnityEngine.UI.GraphicRaycaster"}}]'
```
**UI Toolkit:** a `UnityEngine.UIElements.UIDocument` is added like any component and needs a PanelSettings asset assigned or nothing renders. The `.uxml`/`.uss` files and the PanelSettings asset belong to the assets-import file, where a broken file is accepted as success and its parse error shows only in the Console (bridge `asset-1`). Scene wiring only:
```bash
unity command component add --target "/Hud" --type UnityEngine.UIElements.UIDocument --project-path "<project>"
unity command component get_fields --target "/Hud" --component UnityEngine.UIElements.UIDocument --project-path "<project>"   # read the field names, then assign the PanelSettings and UXML assets with set_field and {"path":"Assets/..."} handles
```

## Pitfalls

- Short UI type names (`Image`, `Button`) resolving to another namespace; use `UnityEngine.UI.*`.
- Destroying and recreating a hierarchy to fix one property: references to it turn null. Fix in place; if a fix fails, revert it before the next attempt; change one thing, then read back.
- A Layout Group on the parent overrides the child's anchors and size; check the parent first when a child ignores its values.
- Trusting a success reply, or a screenshot of Edit Mode, as evidence a UI element sits where intended.
- Editing `.unity` or `.prefab` YAML by hand to place UI while the Editor is reachable.
