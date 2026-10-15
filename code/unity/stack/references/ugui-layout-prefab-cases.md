# uGUI Layout — Prefab Cases

> **Base path:** `D:\GameDev\Unity Projects\Obby\Assets\_Project\Game\Prefabs\UI\`
> See also: [Hierarchy cases](ugui-layout-hierarchy-cases.md), [Layout recipes](ugui-layout-layout-recipes.md), [Source audit](ugui-layout-source-audit.md).

---

## Decide between an instance, a variant, and a new base

| Need | Authoring choice |
|---|---|
| Place the same button elsewhere, adjust its local placement or one contextual label | Instance of the existing prefab with deliberate local overrides |
| Reuse a named visual specialization of the same structure | Prefab variant of the relevant family base |
| Combine several independent controls and widgets into a screen/card/panel | New composition prefab with nested prefab instances |
| Reuse a structurally different kind of control | Separate family base; reuse smaller nested elements where useful |
| Fix a shared background/label arrangement for the whole family | Edit the base and review affected variants |

Nested prefabs retain their own asset links. Variants inherit a base and hold differences; inheritance does not replace composition. Unity restricts reparenting or deleting inherited GameObjects in a variant, so choose a base whose structure matches the family. [Nested prefabs](https://docs.unity3d.com/6000.3/Documentation/Manual/NestedPrefabs.html), [Prefab variants](https://docs.unity3d.com/6000.3/Documentation/Manual/PrefabVariants.html).

## Case 1: shared rectangular button

Verified source: `Core/RectButton.prefab`.

```text
RectButton                        [interactive root, RectTransform]
  Background                      [Image, full stretch]
  Lines                           [decorative Image]
  Label                           [TextMeshProUGUI]
```

The base root is centered and has a reference size of `400 × 150`. Its Background is full stretch with zero offsets; Label occupies anchors `(0.05,0.05)` to `(0.95,0.95)` with zero offsets.

Verified inheritance:

```text
Core/RectButton.prefab             [Regular]
  → Buttons/Button - Play.prefab   [Variant]
```

The variant retains Background, Lines, and Label. This is the desired family relationship: the base owns the shared structure, and a reusable specialized button inherits it.

For a new family, use semantic child names such as `Title` and `Decoration` where appropriate. Do not require a `Lines` object on a button that has no such decoration.

The inspected Play variant stores a zero root size. This is an observation, **not** a recipe: verify which host/layout allocates size before using such an instance. A standalone button needs usable dimensions, or an explicit layout owner providing them.

## Case 2: icon button and nested visual ownership

Verified source: `Core/BackButton.prefab`.

```text
BackButton                        [interactive root, 96 × 96]
  Background                      [Image, full stretch]
    Icon                          [Image, anchors 0.1..0.9]
```

The Icon belongs to Background's coordinate space; both remain inside BackButton. It is valid to nest a title or icon under a visual panel when that panel provides the correct bounds. The rule is containment and meaningful coordinates, not an absolute demand that every visual be a direct child of the button root.

`Buttons/Button - Pause.prefab` is a **regular prefab**, despite looking similar to BackButton. Do not describe it as a variant. A future equivalent can share an icon-button base when its structure and behavior actually match.

The root does not need to carry the visible Image itself. A child background may supply the graphic/hit target. Configure the actual interactive component and its graphic intentionally; do not add a second independent button to the title or icon merely to receive clicks.

## Case 3: compact menu button

Verified source: `States/GameHub/QuadButton.prefab`.

```text
QuadButton
  Background                      [bottom-centered panel]
    Text (TMP)
    Image                         [icon extending above the panel]
```

The source is a cohesive reusable control but its child names are generic. A recommended new equivalent is:

```text
ShopButton
  Background
    Title
    Icon
```

An icon may intentionally extend beyond its panel. Check the root's hit region, parent masks, and layout allocation; extending decoration is not a reason to move the icon outside the entity subtree.

## Case 4: semantic variant families

Verified older chain:

```text
Buttons/Events/V2/Button - GameEventType v2.prefab
  → Buttons/Events/V2/Button - Steal Brainrot Variant.prefab
    → Buttons/Events/V2/Button - Maze Variant.prefab
    → Buttons/Events/V2/Button - Backrooms Variant.prefab
```

Verified newer chain:

```text
Buttons/Events/V2/Button - GameEventType v2.prefab
  → Buttons/Events/V2/New/Button - Maze Variant.prefab
```

Use the newer chain's **semantic relationship** as the model. Sibling game-mode buttons should inherit the game-mode family base, not another specific mode. A multi-level chain is appropriate only when each level represents a real reusable category.

The inspected event-button structure is:

```text
GameEventButton
  Background
  EventNameLabel
```

The source has old and new assets with the same filename in different folders. Resolve the complete asset path or GUID; never select a prefab by filename alone.

## Case 5: a button owns all its states

Observed in the gameplay Toolbar's `JetPackToolbarButton.prefab` instance:

```text
JetPackButton
  BackgroundUnselected
  BackgroundSelected
  AbilityIcon
  Unlocked
    Effects
      EndCooldown
  Locked
    Locker
  LockEffects
    LockAnimation
```

Keep lock, selection, cooldown, and effects inside the button. A parent Toolbar lays out the button roots; it should not separately manage a global collection of their icons and lock overlays. Author only the states the control needs. This case documents containment, not animation logic or activation policy.

## Case 6: small self-contained views

Observed Maze widget, `Core/CoinContainer.prefab`:

```text
CoinContainer
  Coin
  Value
  FloatingValue
```

Observed Backrooms widget, `Core/ActionPopup.prefab`:

```text
ActionPopup
  Background
    IconBackground
      Icon
    Header
```

These are useful prefab boundaries because each root groups one concept. Neither requires Head/Body/Foot. An icon, title, or floating text that belongs to the widget must not be placed beside the widget under the screen.

## Apply changes at the correct level

| Change | Owner |
|---|---|
| Background stretch and standard internal title inset | Family base prefab |
| Reusable selected style or named visual specialization | Variant |
| Widget position within one screen | Containing screen prefab |
| Layout spacing and item allocation | Parent layout container |
| One scene's genuinely unique configuration | Scene instance override, kept narrow |

Keep nested prefab links intact. Review overrides before applying them: a change to a base can affect every screen using it. Do not push a contextual label, scene position, or temporary layout result into the family base.
