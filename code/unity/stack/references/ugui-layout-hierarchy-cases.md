# uGUI Layout — Hierarchy Cases

> **Base path:** `D:\GameDev\Unity Projects\Obby\Assets\_Project\Game\Prefabs\UI\`
> See also: [Prefab cases](ugui-layout-prefab-cases.md), [Layout recipes](ugui-layout-layout-recipes.md), [Source audit](ugui-layout-source-audit.md).

---

## Choose the composition level

| Entity | Owns | Parent owns |
|---|---|---|
| UI host | Screen instances and genuinely global visual elements | Scene placement and host configuration |
| Screen | Its regions, controls, lists, and widget instances | Screen's place in the host |
| Region | A meaningful portion of a screen and its layout | Region bounds |
| Widget | Cohesive content such as icon + value or card + actions | Widget position, available size, and ordering |
| Button | Hit region and all its visual parts and states | Button placement and layout allocation |
| Decorative child | A local visual layer | Its owner's geometry |

The hierarchy is a containment model. It must remain understandable without reading a presenter or relying on inspector references to unrelated siblings.

## Case 1: main menu assembled from screens

Observed in `View/GameHubViews/Old/GameHubCanvas.prefab`, referenced by `GameHub.unity`:

```text
GameHubCanvas
  Background                     [nested prefab]
  PlayerModel                    [nested prefab]
  View - MainMenu - Levels Packs  [nested variant]
  View - Profile                 [nested prefab]
  View - Customize Variant       [nested variant]
  View - Teams                   [nested variant]
  View - PlayerRoom              [nested variant]
  View - Settings                [nested variant]
  View - News                    [nested prefab]
  View - Shop                    [nested prefab]
  Age_Quiz                       [nested prefab]
  Flow Controller
```

This is an abbreviated **observed** tree; it establishes screen boundaries. Do not import the flow-controller implementation or the Obby UI framework into another project. For ROGUE BRICK, use its existing `[MENU UI]` / `[GAMEPLAY UI]` host and screen prefab folders.

## Case 2: screen assembled from reusable units

Observed, abbreviated main-menu screen:

```text
View - MainMenu - Levels Packs
  Head
  LeftBox                         [nested prefab]
    Head
    Layout                        [VerticalLayoutGroup]
      RankView
      Button - Shop               [QuadButton instance]
      Button - Customize          [QuadButton instance]
      Button - News               [QuadButton instance]
      Button - Back               [BackButton instance]
  Body
    DefaultScroll
      Content
        Left                      [VerticalLayoutGroup]
          Button - Backrooms      [variant instance]
          Button - Maze           [variant instance]
        Middle                    [VerticalLayoutGroup]
    NewScroll
  RightBox
  Button - Play                   [RectButton variant]
  HorizontalCoffeeBreakTimer      [nested widget]
```

Keep the compositional lessons: reusable side panel, cohesive controls, layout-managed repeated entries, and independent widgets. Do not copy empty regions or generic names mechanically. `Head` under the screen and `LeftBox/Head` describe **different owners**; that is different from the redundant `HeadRoot/Head` chain.

`DefaultScroll` and `NewScroll` have clipping/container components but are not themselves ScrollRects in the inspected asset. Names alone do not prove scrolling. Use `OffersPanel` for a non-scrolling panel, or a real ScrollRect hierarchy when scrolling is required.

## Case 3: shared gameplay screens with local widgets

All three gameplay references resolve to a shared `States/Gameplay/GameplayMenuCanvas.prefab` under their scene-components prefab:

```text
GameplayMenuCanvas
  View - Move-And-Rotation-Tutorial
  View - Controller
  View - Play
  View - Pause
  View - Lose
  View - Results
  View - Finish
  View - FortuneWheel
  View - Customize Variant
```

The mode-specific content is inside the appropriate screen rather than scattered among unrelated UI roots:

| Scene | Observed addition inside `View - Play` | Ownership lesson |
|---|---|---|
| BombTag | `HeadRoot/Head/BombTagTimerView/{TimerLabel, Image}` | Timer visuals belong to one timer root; `Image` should become `Icon` when authoring a new equivalent |
| Maze | `HeadRoot/Head/CoinContainer/{Coin, Value, FloatingValue}` | Currency icon, amount, and increment form one widget |
| Backrooms | `HeadRoot/Head/ActionPopup/Background/{IconBackground, Header}` | Popup-local decoration and text stay inside the popup |

The legacy wrapper paths above identify the source; **do not reproduce them**. A recommended new HUD can be:

```text
GameplayHud
  Head
    CurrencyHud                   [widget prefab]
      Icon
      Value
      FloatingValue
    TimerHud                      [widget prefab]
      Background
      Icon
      Value
    PauseButton                   [button prefab]
      Background
      Icon
  Toolbar                         [widget prefab, layout group]
    AbilityButton                 [button variant]
```

This tree is a **recommended normalization**, not a claim that these names exist in Obby. It does not require every HUD to have a `Head`.

## Case 4: optional regional organization

Both of these recommended hierarchies are valid:

```text
ResultsScreen
  Head
    Title
  Body
    RewardsList
  Foot
    ContinueButton
```

```text
ConfirmationPopup
  Background
  Title
  Message
  CancelButton
  ConfirmButton
```

Use regions when they provide useful bounds, layout, or manipulation. Do not add empty Head/Body/Foot nodes to the confirmation popup to satisfy a template.

## Case 5: remove duplicate regional wrappers

Observed in `View/ViewTemplate.prefab` and several old screens:

```text
View
  HeadRoot                        [regional anchors]
    Head                          [full stretch, CanvasGroup]
      Title
      BackButton
  BodyRoot                        [regional anchors]
    Body                          [full stretch]
      Content
```

Recommended for a new equivalent:

```text
Screen
  Head                            [regional anchors, CanvasGroup if needed]
    Title
    BackButton
  Body                            [regional anchors]
    Content
```

When simplifying an existing asset, transfer the outer region's bounds to the surviving node and preserve the inner node's needed components and references. Check animation targets and inherited prefab constraints before reparenting. Removing a node without preserving its coordinate space can move every descendant.

`Viewport → Content` is a different case: one clips and bounds the visible area; the other moves and grows. Those roles should remain separate.

## Case 6: name an object where its role becomes clear

| Legacy/generic name | Recommended new equivalent | Reason |
|---|---|---|
| `Button - Pause` | `PauseButton` | Purpose is visible at the entity boundary |
| `BombTagTimerView/Image` | `TimerHud/Icon` | The decoration's role is clear inside its owner |
| `QuadButton/Background/Text (TMP)` | `ShopButton/Background/Title` | Name content by function, not component type |
| `BodyRoot/Body` | `Body` | One meaningful region |
| Two sibling `HeadRoot` objects | `Header` and `CategoryTabs`, if those are their actual roles | Distinguish purpose instead of numbered copies |
| `Layout` | `NavigationButtons` or `OffersList`, where accurate | Communicate the content, not merely the presence of a layout component |

These are authoring conventions for new assets. A bulk rename of existing production hierarchies is a separate change and must preserve bindings and animations.
