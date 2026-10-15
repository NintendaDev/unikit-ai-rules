# uGUI Layout — Source Audit

> **Base path:** `D:\GameDev\Unity Projects\Obby\`
> See also: [Hierarchy cases](ugui-layout-hierarchy-cases.md), [Prefab cases](ugui-layout-prefab-cases.md), [Layout recipes](ugui-layout-layout-recipes.md).

---

## Evidence boundary

Audited on 2026-10-13. Unity Biome MCP identified the connected project as `D:\GameDev\Unity Projects\Obby`, plugin/server `2.1.0`, port `9500`. Source YAML was used to resolve scene-to-prefab references. Unity's asset database supplied inherited prefab hierarchies and variant chains. All four scene hierarchies were also read in isolated preview scenes, which were closed in `finally` blocks, to include scene instance overrides. The active editing scene remained `StealGO`.

The snapshots establish serialized object containment, components, prefab links, anchors, pivots, offsets, and layout settings. They do **not** establish visual acceptance at different resolutions, runtime visibility, animation behavior, or touch usability. No rendered screenshot review was performed. The reference project's scene/prefab assets were not edited or saved. Temporary extraction files are not part of the knowledge base.

The MCP appended StackOverflowException console notices after the preview read; a subsequent console query returned an internal overflow marker. The snapshots were produced, but a clean-console claim is not made, and the cause of those notices was not investigated as part of layout-rule research.

## Source inventory: scenes

| Source | Type / coverage | Signal | Gap / limit |
|---|---|---|---|
| `Assets/_Project/Scenes/GameHub.unity` | Scene; 719 RectTransform objects in resolved preview | Main-menu screen composition and nested buttons | Includes debug LogCanvas; not all objects are active or production layout examples |
| `Assets/_Project/Scenes/Events/BombTag/BombTagEvent.unity` | Scene; 478 RectTransform objects | Common gameplay screens and timer widget | Runtime timer behavior not reviewed |
| `Assets/_Project/Scenes/Events/Maze/01 FirstConcrete/MazeEvent.unity` | Scene; 510 RectTransform objects | Common HUD, currency widget, navigation Canvas | Third-party navigation implementation is outside the rule scope |
| `Assets/_Project/Scenes/Events/Backrooms/R1_Backrooms.unity` | Scene; 676 RectTransform objects | Common HUD, action popup, separate dialogue/quest Canvases | Dialogue and quest-system UI internals were inventoried but not used as recommended layout patterns |

Counts include inactive and auxiliary UI. They describe the inspected snapshot, not the number of visible elements or a target complexity budget.

## Scene-to-prefab routes

| Scene | Route to the primary UI |
|---|---|
| GameHub | `--UI--/GameHubCanvas` → `Assets/_Project/Game/Prefabs/UI/View/GameHubViews/Old/GameHubCanvas.prefab` |
| BombTag | `Assets/_Project/Game/Prefabs/Gameplay/BombTag/--BombTag GAMEPLAY SCENE COMPONENTS-- Variant.prefab` → `--UI--/GameplayMenuCanvas` |
| Maze | `Assets/_Project/Game/Prefabs/Gameplay/Maze/General/--MAZE GAMEPLAY SCENE COMPONENTS-- Variant.prefab` → `--UI--/GameplayMenuCanvas` |
| Backrooms | `Assets/_Project/Game/Prefabs/Gameplay/Backrooms/Context/--Backrooms GAMEPLAY SCENE COMPONENTS-- Variant.prefab` → `--UI--/GameplayMenuCanvas` |

The three gameplay routes contain nested `Assets/_Project/Game/Prefabs/UI/States/Gameplay/GameplayMenuCanvas.prefab`. Additional UI roots include GiftPopupView, the control rig, the third-party HUD Navigation Canvas, and Backrooms dialogue/quest Canvases. The rules focus on the project's own screens, controls, and HUD composition.

## Source inventory: UI prefabs

Paths in this table are relative to `Assets/_Project/Game/Prefabs/UI/`. Prefabs were read directly or as resolved nested instances; the table states the coverage used for the rules.

| Source | Used for / signal | Limit |
|---|---|---|
| `View/GameHubViews/Old/GameHubCanvas.prefab` | Complete resolved UI tree; 712 RectTransforms; menu screen boundaries | Old folder is genuinely the scene's referenced source; not automatically obsolete evidence |
| `States/Gameplay/GameplayMenuCanvas.prefab` | Shared gameplay screen roster and nested composition | Read through mode composition prefabs, including their overrides |
| `View/GameHubViews/View - MainMenu - Levels Packs Variant.prefab` | Direct screen regions, side panel, event buttons, vertical lists | Non-scrolling containers have scroll-like names |
| `View/GameHubViews/View - Profile.prefab` | Direct Head/Body regions and statistics stack | Layout behavior not rendered |
| `View/GameHubViews/Old/View - Customize Variant.prefab` | Duplicate wrappers and scroll/grid descendants | Legacy hierarchy is partly rejected |
| `View/GameHubViews/Old/View - Teams Variant.prefab` | Duplicate wrappers, room list | Source naming retained for identification only |
| `View/GameHubViews/Old/View - PlayerRoom Variant.prefab` | Duplicate wrappers and scroll composition | Runtime population not reviewed |
| `View/GameHubViews/Old/View - Settings Variant.prefab` | Duplicate wrappers | Not a required screen template |
| `View/GameHubViews/Old/View - News.prefab` | Duplicate wrappers and repeated wallet widgets | Generic names are not normative |
| `View/GameHubViews/Old/View - Shop.prefab` | Grid/content layout and duplicate HeadRoot siblings | Do not normalize duplicate names into a naming recommendation |
| `View/GameplayView/View - Play.prefab` | Shared HeadRoot/Head and BodyRoot/Body; toolbar and HUD region anchors | Duplicate wrappers explicitly rejected by user |
| `View/ViewTemplate.prefab` | Direct inspection of the legacy wrapper template | Do not use unchanged as the new hierarchy standard |
| `Buttons/LeftBox.prefab` | Reusable panel, internal vertical layout, nested buttons | Generic child names should be made semantic in new equivalents |
| `Core/RectButton.prefab` | Base rectangular button, contained visual layers, `400 × 150` root | Root geometry differs in variants/hosts |
| `Buttons/Button - Play.prefab` | Verified variant of RectButton | Zero saved root size is not a universal recipe |
| `Core/BackButton.prefab` | Regular icon-button prefab, `96 × 96` root and nested icon | Not proof Pause is a variant |
| `Buttons/Button - Pause.prefab` | Verified regular prefab, corner anchoring, contained icon | Its zero size requires host/layout context |
| `States/GameHub/QuadButton.prefab` | Reusable compact menu button with nested title/icon | `Text (TMP)` and `Image` are generic source names |
| `Buttons/Events/V2/Button - GameEventType v2.prefab` | Verified regular base of event-button family | Inheritance verified; no behavior prescription |
| `Buttons/Events/V2/Button - Steal Brainrot Variant.prefab` | Verified intermediate variant in old event-button chains | A specialized mode is a poor family base for unrelated modes |
| `Buttons/Events/V2/Button - Maze Variant.prefab` | Old chain through Steal Brainrot | Same filename also exists under New |
| `Buttons/Events/V2/Button - Backrooms Variant.prefab` | Old chain through Steal Brainrot | Used as an inheritance anti-pattern, not the preferred chain |
| `Buttons/Events/V2/New/Button - Maze Variant.prefab` | Direct variant of GameEventType base | Preferred semantic family relationship |
| `Core/CoinContainer.prefab` | Cohesive icon/value/floating-value widget; direct and Maze-instance reads | Layout values depend on the parent instance |
| `Core/ActionPopup.prefab` | Cohesive Background/IconBackground/Icon/Header hierarchy | Backrooms instance overrides its root to centered `400 × 120` |
| `CoffeeBreak/HorizontalCoffeeBreakTimer.prefab` | Icon/value composition and horizontal layout | Child fitter conflicts with the controlling group's width ownership |
| `Buttons/Events/Gadgets/Toolbar/Toolbar.prefab` | Shared grid toolbar with fixed one-row constraint | Numeric cell settings are reference values, not global tokens |

The JetPack button subtree inside Toolbar was also inspected for ownership of selection, lock, and effects. Its nearest source asset is named `JetPackToolbarButton.prefab`; the rules use its contained hierarchy rather than prescribing its scripts or animation setup.

## Decisions from the evidence

| Finding | Decision |
|---|---|
| Screen host contains separate screen prefab instances | Adopt the composition pattern |
| Buttons/widgets own cohesive subtrees | Require entity ownership |
| RectButton → Play is a real variant chain | Adopt base + reusable specialization |
| New Maze derives directly from GameEventType base | Prefer semantic sibling variants |
| Old Maze/Backrooms derive through Steal Brainrot | Record as a relationship to avoid |
| Head/Body can be direct meaningful regions | Permit optional regional grouping |
| HeadRoot/Head and BodyRoot/Body repeat a region | Reject for new authoring per user instruction |
| DefaultScroll/NewScroll do not have ScrollRect themselves | Verify components, do not infer from names |
| Parent layout and child fitter both control timer-label width | Reject competing size ownership |
| Source scaler is landscape 1920 × 1080 | Matches the user's landscape rule; portrait 1080 × 1920 is also mandatory |
| Safe-area behavior and rendered multi-resolution behavior were not established | Treat as separate authoring acceptance checks, not observed facts |

## Documentation enrichment

| Source | Type / scope | Signal / used for | Gap / limit |
|---|---|---|---|
| [Unity Basic Layout, uGUI 2.0](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/UIBasicLayout.html) | Official documentation | Parent-relative anchors, pivot, stretch, offsets | Does not prescribe entity naming |
| [Unity content fitting, uGUI 2.0](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/HOWTO-UIFitContentSize.html) | Official documentation | Layout ownership and fitter conflict | Concrete hierarchy policy comes from user/reference audit |
| [Unity Canvas Scaler, uGUI 2.0](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-CanvasScaler.html) | Official documentation | Scaling semantics and match settings | Required resolutions come from the user |
| [Unity ScrollRect, uGUI 2.0](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-ScrollRect.html) | Official documentation | Viewport/content roles and growing content | Legacy names/components are not assumed correct |
| [Unity prefab variants, Unity 6000.3](https://docs.unity3d.com/6000.3/Documentation/Manual/PrefabVariants.html) | Official documentation | Inheritance, overrides, inherited-object restrictions | Family naming is an authoring decision |
| [Unity nested prefabs, Unity 6000.3](https://docs.unity3d.com/6000.3/Documentation/Manual/NestedPrefabs.html) | Official documentation | Composition with retained prefab links | Does not mandate one prefab per graphic |
| Context7 `/unity-technologies/ugui` | Official uGUI source/documentation; four targeted queries | Usage patterns, best practices, Inspector quick reference, common mistakes | Current docs may include newer components; no unverified Safe Area component dependency is introduced |
| User requirements, this session | Authoring policy | Ownership, variants, optional Head/Body, no duplicate region wrappers, fixed reference resolutions by orientation | Not inferred from implementation code |
