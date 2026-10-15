---
version: 1.0.0
---

# uGUI Layout and Hierarchy

> **Scope**: Authoring uGUI object hierarchies, self-contained screens and widgets, reusable button prefabs and variants, object names, RectTransform anchors, and automatic layout.
> **Load when**: building or reviewing uGUI screens and HUDs, arranging RectTransforms and anchors, naming UI objects, extracting reusable UI widgets, creating button prefabs or prefab variants, adapting UI to landscape or portrait screens.
> **References**: `.unikit/memory/code/stack/references/ugui-layout-hierarchy-cases.md` (composition), `.unikit/memory/code/stack/references/ugui-layout-prefab-cases.md` (prefabs), `.unikit/memory/code/stack/references/ugui-layout-layout-recipes.md` (layout), `.unikit/memory/code/stack/references/ugui-layout-source-audit.md` (evidence).

---

## Scope and authority

These rules govern the **asset hierarchy and layout**, including the boundary of a visual entity. They do not prescribe presenters, view classes, dependency injection, navigation logic, or a third-party UI framework.

The Obby scenes are production references, not an instruction to copy every existing object. Explicit user requirements take priority over observed legacy structures. Examples distinguish **observed** structures from **recommended** structures. C# examples are deliberately omitted: hierarchy trees, Inspector recipes, and before/after cases are the executable authoring guidance for this scope.

Project-specific UI rules in `.unikit/rules/ui-conventions.md` still take precedence, including font assignment, nested Canvas handling, sliced graphics, and conversion of specification coordinates. Follow the target project's scene composition and asset folders.

## 1. Compose from entities that own their contents

1. Give each screen its own prefab and a clear root. Assemble the UI host from screen instances; assemble screens from widget and control instances.
2. Place **every visual part of an entity inside that entity's subtree**: a button owns its background, title, icon, badge, selection frame, lock, and local effects; a currency widget owns its icon, value, and floating increment.
3. The parent screen controls the position and available space of a widget root. The widget controls its internal arrangement. Do not position a button's title independently under the screen.
4. Extract a small view/widget when it has a cohesive visual purpose, repeats, or needs to be moved or configured as one unit. Do not turn every decorative Image or title into its own prefab without a reuse boundary.
5. Prefer direct semantic children. `Head`, `Body`, and `Foot` are **optional**, not required boilerplate. A simple popup can directly contain `Background`, `Title`, and `ConfirmButton`.

```text
ShopScreen
  CurrencyHud                 [widget prefab instance]
    Icon
    Value
  OffersScrollView
    Viewport
      Content
        OfferCard             [widget prefab instance]
          Background
          Title
          BuyButton           [button prefab instance]
            Background
            Title
```

## 2. Keep each hierarchy level meaningful

- A group must represent a real region, layout owner, clipping boundary, safe-area boundary, or independently arranged visual unit.
- Do not create `HeadRoot → Head`, `BodyRoot → Body`, or equivalent duplicate containers merely because a template did so. Use `Head → elements` and `Body → elements`.
- A CanvasGroup or regional animation component is not, by itself, a reason to add the duplicate parent. Put the regional components on the meaningful region.
- Technical containers such as `Viewport` and `SafeArea` are legitimate when their function actually exists. Name a necessary layout/animation separation by its role, and identify the transform ownership conflict it resolves; do not introduce it pre-emptively.
- Keep a screen's own controls under that screen. Share a global element outside screens only when the UI host actually owns it.

## 3. Name by purpose and keep names stable

- Use readable English PascalCase names for new objects: `PauseButton`, `CurrencyHud`, `OfferCard`, `Title`, `Background`, `Icon`, `Value`, `SelectionFrame`, `Locked`, `CooldownOverlay`.
- Give entity roots a purpose. Inside the entity, short role names are sufficient: `PauseButton/Icon`, not `PauseButton/PauseButtonIconImage`.
- Use `Head`, `Body`, `Foot` when those regions help; use `Actions`, `Tabs`, `ItemList`, `Toolbar`, or `Rewards` when those names convey more.
- Do not ship default or copy-generated names such as `GameObject`, `Image (1)`, `Text (TMP)`, `Panel (2)`, or `Button (Clone)` in authored assets. Rename by role.
- Avoid duplicate sibling names; qualify their purpose rather than adding a numeric suffix. Avoid `/` inside object names because it also separates hierarchy paths.
- Preserve established names in existing assets unless renaming is part of the task and references have been checked. Obby's `View - ...` and `Button - ...` names are source evidence, not a compulsory naming format for new work.

## 4. Reuse prefab families deliberately

- Create a base prefab for a genuinely shared button structure. Create a **prefab variant** for a reusable specialization with the same structure and different graphics, text treatment, or optional visual states.
- Use an ordinary instance override for placement and one-off contextual configuration. Use a variant when the specialization itself must be reused and maintained as an asset.
- Use nested prefab instances for composition: a screen contains buttons and widgets. Inheritance and composition solve different problems; use both where appropriate.
- Put family-wide fixes in the base, specialization changes in the variant, and placement in the containing screen. Check the intended apply target before applying overrides.
- Base variants on the nearest **semantic family base**. Do not derive `MazeButton` from `StealBrainrotButton` merely because the latter happens to look similar.
- Do not unpack instances or duplicate entire prefab hierarchies to make cosmetic siblings. If inherited structure must be substantially rearranged, choose another family base or a separate prefab instead of fighting variant restrictions.

See the prefab reference for verified inheritance chains and complete control subtrees.

## 5. Establish Canvas scaling explicitly

For screen-space UI, use `CanvasScaler → UI Scale Mode = Scale With Screen Size` and **always** set Reference Resolution according to the authored orientation:

| Orientation | Reference Resolution |
|---|---|
| Landscape | **1920 × 1080** |
| Portrait | **1080 × 1920** |

These values are an explicit user requirement. Do not substitute tool defaults or another reference resolution. If both orientations are supported, define and verify each orientation's configuration.

Set `Screen Match Mode` and, when applicable, `Match Width Or Height` intentionally for the design. The reference's `0.5` is not a universal requirement. A scaler does not replace anchors, and adding a scaler to every nested screen does not create independent scaling. [Unity Canvas Scaler](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-CanvasScaler.html)

## 6. Choose anchors for the intended relationship

- Choose the parent, then anchors, then pivot, then offsets or size. Re-check offsets after changing anchors: the Inspector may preserve appearance by counter-adjusting them.
- Anchor a corner control to that corner. Stretch a background to its owner. Use a normalized subregion when that region should track a fraction of its parent. Use a fixed size when the control should retain its reference-unit dimensions.
- Anchors are relative to the **immediate parent**, not the screen. A timer inside `Head` uses `Head` coordinates.
- Keep the static layout scale at `(1,1,1)` for ordinary screen-space widgets. Size through RectTransform and layout settings; reserve scale for intentional visual effects. The root screen-space Canvas has engine-driven geometry and is not a widget-sizing template.
- Do not assume `sizeDelta` is the final size when anchors are split. Do not require zero offsets everywhere: explicit padding is valid. [Unity Basic Layout](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/UIBasicLayout.html)

## 7. Assign one layout owner per property and axis

- Use Horizontal/Vertical Layout Groups for rows and columns; use Grid Layout Group for repeated equal-size cells.
- The parent layout group positions its participating children. Describe child sizing through `LayoutElement` and group settings instead of hand-adjusting driven rectangles.
- Do not let a parent group and a child's ContentSizeFitter both own the same size axis. A layout group and a fitter on the **same** content container can be valid: the group arranges descendants and the fitter sizes that container.
- Separate decorative layers from layout participants. Use `Ignore Layout` only for a deliberate overlay or ornament; it is not a fix for an incorrectly designed group.
- Use a top pivot for a vertically growing list; give a grid an intentional row/column constraint. Avoid a circular dependency between content width, fitted height, and an unconstrained grid.

Use the reference's recipes for exact settings and worked anchor calculations. [Unity content fitting](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/HOWTO-UIFitContentSize.html)

## Anti-patterns

| Do not | Use instead |
|---|---|
| Put button backgrounds, titles, icons, or state overlays beside the button under the screen | Keep all button-owned parts under the button root |
| Add `HeadRoot/Head` or `BodyRoot/Body` by convention | One meaningful `Head` or `Body` region |
| Force every screen and widget into Head/Body/Foot | Regions only where the composition needs them |
| Copy a finished sibling button as an unrelated asset for every visual variation | A family base plus prefab variants |
| Build a chain of unrelated specialized variants | Sibling variants of a semantic family base |
| Use center anchors plus large offsets to simulate attachment to a corner | Corner anchors and local padding |
| Copy landscape scaler settings into portrait UI | Required reference resolution for the authored orientation |
| Resize the whole UI by arbitrary localScale | RectTransform, layout sizing, and the root CanvasScaler |
| Hand-position children whose rectangles are layout-driven | Change the layout owner's settings and child sizing inputs |
| Add a ContentSizeFitter to every item in a controlling layout group | Let the parent own that axis |
| Treat a serialized zero size as proof the widget should be zero-sized | Inspect the parent layout and resolved rectangle |
| Assume a name such as `DefaultScroll` guarantees scrolling | Verify ScrollRect, clipping, and its content references |

## Reference lookup workflow

| Task | Read |
|---|---|
| Split a screen into regions and small views; choose ownership and names | [Hierarchy cases](references/ugui-layout-hierarchy-cases.md) |
| Make a button, widget, base prefab, or variant; choose where overrides belong | [Prefab cases](references/ugui-layout-prefab-cases.md) |
| Set anchors, pivot, padding, CanvasScaler, layout groups, or scroll content | [Layout recipes](references/ugui-layout-layout-recipes.md) |
| Verify which scene/prefab informed a rule; distinguish legacy defects from guidance | [Source audit](references/ugui-layout-source-audit.md) |

## Authoring acceptance

Before handing off a new layout, verify ownership, readable unique sibling names, prefab links, the required scaler resolution, layout ownership, clipping, and button hit regions. Inspect it in the target project's UI sandbox at its reference aspect ratio, a narrower and wider supported aspect ratio, and the longest intended text. Check the safe area if the target devices require it. Capture and inspect images when claiming visual acceptance; YAML and Inspector values alone establish structure and settings.

## Source Map

| Source | Used for |
|---|---|
| `D:\GameDev\Unity Projects\Obby\Assets\_Project\Scenes\GameHub.unity` | Menu screen composition, nested controls, legacy wrappers, and layout groups |
| `D:\GameDev\Unity Projects\Obby\Assets\_Project\Scenes\Events\BombTag\BombTagEvent.unity` | Shared gameplay UI and self-contained timer hierarchy |
| `D:\GameDev\Unity Projects\Obby\Assets\_Project\Scenes\Events\Maze\01 FirstConcrete\MazeEvent.unity` | Currency widget, shared HUD, and grid toolbar |
| `D:\GameDev\Unity Projects\Obby\Assets\_Project\Scenes\Events\Backrooms\R1_Backrooms.unity` | Action popup ownership and shared gameplay screen composition |
| Obby UI prefabs enumerated in [Source audit](references/ugui-layout-source-audit.md) | Verified resolved children, anchors, layout settings, and inheritance chains |
| Unity documentation linked in this file and the layout/prefab references; Context7 `/unity-technologies/ugui` | Verification of engine layout and prefab semantics |
| User instructions in this session | Entity ownership, base-plus-variant preference, optional regions, rejection of duplicate region wrappers, mandatory orientation-specific scaler resolution |
