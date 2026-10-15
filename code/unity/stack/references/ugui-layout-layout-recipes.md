# uGUI Layout — Layout Recipes

> See also: [Hierarchy cases](ugui-layout-hierarchy-cases.md), [Prefab cases](ugui-layout-prefab-cases.md), [Source audit](ugui-layout-source-audit.md).

---

## CanvasScaler configuration

| Setting | Landscape | Portrait |
|---|---|---|
| UI Scale Mode | Scale With Screen Size | Scale With Screen Size |
| Reference Resolution | **1920 × 1080** | **1080 × 1920** |
| Screen Match Mode | Choose for the design | Choose for the design |
| Match Width Or Height, when used | Choose and verify | Choose and verify |

The resolutions are mandatory user instructions. Both inspected main Canvas assets use landscape `1920 × 1080`, `Match Width Or Height`, and match `0.5`; the portrait value is prescribed by the user, not inferred from Obby. There is no universal requirement to use match `0.5`.

Configure scaling at the root screen-space Canvas. Nested screens normally inherit that coordinate system. Do not add an independent scaler per widget. The specified offsets below are **UI/reference units**, not guaranteed physical display pixels. [Unity Canvas Scaler](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-CanvasScaler.html)

## Recommended RectTransform recipes

These are original reusable authoring recipes, not exact copies of the production screens. All anchors are relative to the immediate RectTransform parent. Use localScale `(1,1,1)` for the static widget layout.

| Purpose | Anchor Min | Anchor Max | Pivot | Size / offsets |
|---|---|---|---|---|
| Screen content covering its host | `(0,0)` | `(1,1)` | `(0.5,0.5)` | Left/Right/Top/Bottom `0` |
| Background filling a widget | `(0,0)` | `(1,1)` | `(0.5,0.5)` | Left/Right/Top/Bottom `0` |
| Top-left fixed control | `(0,1)` | `(0,1)` | `(0,1)` | Pos `(24,-24)`, explicit width/height |
| Top-right fixed control | `(1,1)` | `(1,1)` | `(1,1)` | Pos `(-24,-24)`, explicit width/height |
| Bottom-right fixed control | `(1,0)` | `(1,0)` | `(1,0)` | Pos `(-24,24)`, explicit width/height |
| Centered fixed popup | `(0.5,0.5)` | `(0.5,0.5)` | `(0.5,0.5)` | Pos `(0,0)`, explicit width/height |
| Top strip of fixed height | `(0,1)` | `(1,1)` | `(0.5,1)` | Left/Right `24`, Pos Y `-24`, Height `120` |
| Bottom strip of fixed height | `(0,0)` | `(1,0)` | `(0.5,0)` | Left/Right `24`, Pos Y `24`, explicit height |
| Top fraction of a screen | `(0,0.8)` | `(1,1)` | `(0.5,1)` | Zero offsets; height follows parent proportion |
| Vertically growing scroll content | `(0,1)` | `(1,1)` | `(0.5,1)` | Width follows viewport; height owned by content layout/fitter |

A 20% top region and a fixed-height top strip have different resizing behavior. Choose based on the intended relation, not on which produces the desired rectangle at one resolution.

For corner controls, match the pivot to the attached corner when the control should grow inward. A different pivot is valid when an intentional growth or animation origin requires it. [Unity RectTransform layout](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/UIBasicLayout.html)

## Work out the size instead of guessing from sizeDelta

For each axis:

```text
resolvedSize = parentSize × (anchorMax − anchorMin) + sizeDelta
offsetMin = anchoredPosition − sizeDelta × pivot
offsetMax = anchoredPosition + sizeDelta × (1 − pivot)
```

Example: a stretched child of a `400 × 150` button with padding 16 on the left/right and 8 on the top/bottom:

```text
anchorMin        = (0,0)
anchorMax        = (1,1)
pivot            = (0.5,0.5)
offsetMin        = (16,8)
offsetMax        = (-16,-8)
anchoredPosition = (0,0)
sizeDelta        = (-32,-16)
resolvedSize     = (368,134)
```

In the Inspector this is simply Left `16`, Right `16`, Top `8`, Bottom `8`. Negative sizeDelta is normal for inset stretched content; it does not mean a negative-sized rectangle.

The source RectButton Label instead uses anchors `(0.05,0.05)` to `(0.95,0.95)` with zero offsets. On `400 × 150` that yields `360 × 135`: proportional margins rather than fixed-unit padding. Choose the appropriate policy deliberately.

## Preserve coordinate space when removing wrappers

Observed shared Play screen:

```text
View - Play                     anchors (0,0)..(1,1)
  HeadRoot                      anchors (0,0.8)..(1,1)
    Head                        anchors (0,0)..(1,1)
```

For a new normalized screen, put the regional anchors `(0,0.8)..(1,1)` directly on `Head`. Its children remain relative to that region. Do not leave Head full stretch after deleting HeadRoot, because that changes its coordinate space from a top band to the whole screen.

Likewise, the observed BodyRoot uses `(0.04,0.03)..(0.96,0.82)` and Body fills it. The normalized Body inherits the outer bounds. These fractions are evidence of one layout, not universal margins.

## Layout ownership recipes

| Situation | Parent/container | Child inputs | Avoid |
|---|---|---|---|
| Vertical list of fixed-height rows | VerticalLayoutGroup, Control Width/Height enabled, Force Expand Height disabled | LayoutElement preferred row height | Manually editing row positions |
| Equal-width cards in a horizontal row | HorizontalLayoutGroup with controlled width | Equal preferred widths and equal flexible widths, chosen intentionally | Letting title preferred widths make sibling cards unequal |
| Variable-height text rows | Parent layout controls row rect; row reports preferred size | Text/layout preferred height and explicit padding | A child's fitter competing with the parent's height control |
| Freestanding content-sized stack | VerticalLayoutGroup + vertical ContentSizeFitter on the stack | Descendants report their sizes | Another parent controller owning that same stack height |
| Horizontal toolbar with equal square items | GridLayoutGroup with fixed row count `1` | Cell size and spacing on the grid | Depending on each icon's preferred size |
| Overlay badge inside a layout-managed card | Anchor inside the card; Ignore Layout if it is also a direct layout child | Explicit badge bounds | Moving the badge beside the card |

ContentSizeFitter is not categorically forbidden with layout groups. The conflict is **two controllers for the same property/axis**. A group on Content controls its children; a fitter on Content can own Content's height. A parent group that also controls Content's height would conflict. [Unity content fitting](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/HOWTO-UIFitContentSize.html)

For equal cards, account for image/text preferred sizes. The target project's `.unikit/rules/ui-conventions.md` includes the established equal-card LayoutElement policy; use it where that case applies.

## Observed layout settings worth understanding

| Source / object | Verified settings | Transferable lesson |
|---|---|---|
| MainMenu `Body/DefaultScroll/Content/Left` | VerticalLayoutGroup; padding L30/R15/T30/B0, spacing 30; controls width/height; expands width, not height | Define spacing once at the list owner |
| Shared Play `TutorialView` | VerticalLayoutGroup; padding 20 on all sides, spacing 10, no force expansion; vertical ContentSizeFitter Preferred | A freestanding stack can size itself from its children |
| Shared Play `Toolbar` | GridLayoutGroup; cell `105 × 105`, spacing `(10,0)`, padding 10; Fixed Row Count `1`; fitter Min on both axes | One row of equal cells, with a single size owner for the toolbar |
| Maze `CoinContainer/Value` | Horizontal ContentSizeFitter Preferred, Vertical Unconstrained | Content fitting can be limited to one axis |
| GameHub `HorizontalCoffeeBreakTimer` | HorizontalLayoutGroup controls child width/height; TimerLabel also has horizontal ContentSizeFitter Preferred | Observed same-axis ownership conflict; do not copy the child's fitter pattern into a parent-controlled layout |

Numbers are reference measurements, not global UI tokens. Inspect the host and axis ownership before reusing a recipe.

## Recommended vertical scroll hierarchy

```text
OffersScrollView                  [ScrollRect, fills the offered region]
  Viewport                        [RectMask2D, fills scroll view]
    Content                       [top pivot, width stretched]
      OfferCard                   [nested prefab]
      OfferCard                   [nested prefab]
```

Assign ScrollRect's Viewport and Content to those exact descendants. Let the viewport own visible bounds and clipping; let Content move and grow. For a vertical list, use vertical scrolling, horizontal scrolling disabled, a vertical layout on Content, and a vertical fitter when Content owns its height. For a grid, fix the column count when height is fitted from the number of rows. Do not fit both axes of an unconstrained grid unless that behavior is specifically intended. [Unity ScrollRect](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-ScrollRect.html)

This is a recommended normalized recipe. Some inspected legacy scrolls put the mask on the ScrollRect root or use a different viewport target. They are not evidence that an extra Viewport is always required, nor that a node called Content is already configured correctly.

## Verification at authoring time

1. Verify the correct orientation-specific reference resolution on the root scaler.
2. Inspect immediate parent bounds, anchors, pivot, and offsets for corner controls, stretch regions, and nested widgets.
3. Check which component drives each axis before editing positions or adding fitters.
4. Check narrow/wide aspect ratios, content growth, the longest intended text, masks, and hit regions in the target UI sandbox.
5. Put must-visible controls inside a real safe-area boundary when needed; decorative full-bleed backgrounds may remain outside it. Safe-area handling was not established by the reference audit and is an additional device-layout consideration.
6. Use screenshots to verify appearance. Serialized fields prove settings, not the final rendered result or runtime animation.
