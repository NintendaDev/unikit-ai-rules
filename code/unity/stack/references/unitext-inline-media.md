# UniText — Inline sprites and inline objects

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location. `<LightSideCoreRoot>` is the folder whose `package.json` has `"name": "media.lightside.core"` (catalog and state types live there).
> See also: [unitext-emoji.md](unitext-emoji.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-formatting-tags-quickref.md](unitext-formatting-tags-quickref.md), [unitext-interaction-links.md](unitext-interaction-links.md), [unitext-input-fields.md](unitext-input-fields.md), [unitext-range-state-rules.md](unitext-range-state-rules.md), [unitext-tmp-migration.md](unitext-tmp-migration.md), [unitext-3d-text.md](unitext-3d-text.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-version-traps.md](unitext-version-traps.md)

---

Mobile verdicts (`OK` / `LIMIT` / `AVOID`) in this file come from reading the package source and docs; nothing was profiled.

Tag vocabulary: neither `<sprite>` nor `<obj>` exists in a fresh component. The package ships prefabs with empty `styles` and `UniTextSettings` with no global style preset, so both tags show as literal text until a `Style` registers them (section 2). For the full bootstrap see the master rule's section "Tag vocabulary bootstrap" (`../unitext.md`) and [unitext-markup-system.md](unitext-markup-system.md).

## 1. Quick lookup

| Task | Answer |
|---|---|
| Put an icon inside a string | Register a sprite style (section 2), keep icons in a `UniTextSprites` asset (section 6), write `<sprite=coin/>`. |
| `<sprite=...>` appears as literal text | The component has no style for it. Add `Style.FromSource(new InlineTagRule("sprite"), new SpriteModifier{...})` or a global style preset. |
| Make the icon bigger | Size slot with **both** axes and a matching advance: `<sprite=coin,,,1.2 1.2,,1.2/>`. |
| Icon sits too high next to lowercase text | Lower it: `BearingOffset.y` about -0.1 to -0.2 on the entry or a keyed override (not per tag). |
| Tall or wide picture overlaps neighbours | Set `size` (aspect-correct), `advance`, and extra `lineHeightAbove` / `lineHeightBelow` (section 5, R6). |
| Tint the sprite | Slot 1: `#RRGGBB`, a CSS name, or `i` to follow the component's `color`. `<color>` ranges do not tint sprites. |
| Retune an icon for every use without editing strings | Keyed override row on the modifier (R9). |
| Icons resolved from a runtime database | Custom `ISpriteProvider` (R4). |
| Animated or interactive widget in a sentence | `<obj=name/>` with a prefab in Clone mode (R7). |
| Put one existing scene widget into a sentence | `<obj>` with `InlineObjectMode.Existing` (R8). |
| Clickable icon | `<link=...><sprite=info/></link>`; `InlineObjectPolicy` controls hit geometry (R10). |
| Insert an icon at the caret of an input field | `editable.InsertObject<SpriteModifier>("heart")` (R11). |
| Custom emoji set from own art | Sprite catalog plus a shortcode map, or a custom color font (R5). |
| Wrong sprite name | Fails **silently**: the bare U+FFFC stays in the text. |
| Works in world-space or 3D text | Yes for sprites (mesh glyphs since 3.5.0); `<obj>` clones are ordinary scene objects (R12). |
| Per-tag-name alias such as `<coin/>` | `new InlineTagRule("coin") { DefaultParameter = "coin,,,1.2 1.2,,1.2" }` (R13). |
| Find an inline tag later by label | `<obj #icon=star/>`, `<sprite #icon/>` give a `#label` for `RangeQuery.WhereLabel` ([unitext-range-state-rules.md](unitext-range-state-rules.md)). |
| Untrusted text (chat, names) | Strip U+FFFC and neutralize `<`, or use a component without the media styles (pitfall 6). |

## 2. Registering the tags

The chain: tag text, `InlineTagRule`, `Style`, modifier (`SpriteModifier` / `ObjModifier`), **provider** (inline list, shared asset, or your own), **entry** (`InlineSprite` / `InlineObject`), optional keyed override, then the tag's own arguments.

| Tag | Rule + modifier | How it gets registered |
|---|---|---|
| `sprite` | `InlineTagRule("sprite")` + `SpriteModifier` | Styles picker: `+` → *Inline Tags* → **Inline Sprite**; or code (below); or a `StylePreset` set as the global preset; the TMP migration generates the pair for each TMP sprite asset |
| `obj` | `InlineTagRule("obj")` + `ObjModifier` | Styles picker: *Inline Tags* → **Inline Object**; or code; or a preset |
| any name you choose (`coin`, `smile`) | `new InlineTagRule("coin") { DefaultParameter = ... }` + the same modifier | user-defined (R13) |
| `<quad>`, `:shortcode:` | no UniText equivalent | n/a |

```csharp
// sprites = a UniTextSprites asset (section 6), assigned in the inspector or loaded
var modifier = new SpriteModifier { Provider = new AssetSpriteProvider { Asset = sprites } };
text.Styles.Add(Style.FromSource(new InlineTagRule("sprite"), modifier));
text.Text = "Reward: 250 <sprite=coin/>  3 <sprite=gem/>";
```

- `Style.FromSource(new InlineTagRule("sprite"), modifier)` is the correct form: `InlineTagRule` is a void tag, so `<sprite=x>` works without `/>` and a stray `</sprite>` is stripped.
- **`Style.Tag(modifier, "sprite")` builds a plain `TagRule`**, not an `InlineTagRule`. With it, `<sprite=x>` without `/>` is an opening tag with range semantics that never closes. Always write `<sprite=x/>` when the style came from `Style.Tag`.
- A modifier belongs to its `Style`: create one `SpriteModifier` per component and share the **asset** (`UniTextSprites`) between components.
- Project-wide: `Assets → Create → LightSide → UniText → Style Preset`, add *Inline Sprite* (and *Inline Object*) with the asset provider, then set the preset in Project Settings → LightSide → UniText → **Global Style Preset**; every component with *Use Global Style Preset* on understands `<sprite=...>`. At runtime a preset can be extended with `StylePreset.AddStyle(...)`.
- Inspector route for one component: Styles `+` → *Inline Tags* → *Inline Sprite*, set the modifier's Provider type to *Asset Sprite Provider*, assign the asset.
- No Unity Font, material or shader assignment is needed: inline sprites draw through a per-texture sub-mesh of the same shared pipeline.

## 3. Tag syntax

### 3.1 `<sprite>` slots

`<sprite=name[,color][,aspect][,size][,offset][,advance][,lineAbove][,lineBelow][,pivot][,rotation]/>`. Slots are **positional**; leave a slot empty to keep its default (`,,`).

| Slot | Argument | Syntax | Unit | When omitted or empty | Notes |
|---|---|---|---|---|---|
| 0 | `name` | text; quote it (`"my icon"`) if it holds `,`, space or `>`; case-insensitive, trimmed | – | nothing resolves without it | name of the provider entry and key of a keyed override |
| 1 | `color` | empty: original · `i`: inherit · `#RGB` / `#RRGGBB` / `#RRGGBBAA` · CSS name (`red`) | – | override colour, else entry `Color` (white) | multiplies the sprite texture |
| 2 | `aspect` | `true` / `false` / `inherit` (or first letter `t` / `f` / `i`) | – | override, else entry `PreserveAspect` (**true**) | true letterboxes inside the size box; false stretches to fill it |
| 3 | `size` | `"x y"`, two numbers separated by a **space** | em | override, else entry `Size` (**1 1**) | **a single number sets only X**; Y stays inherited |
| 4 | `offset` | `"x y"` | em | override, else entry `BearingOffset` (0 0) | +y is up; does not change advance |
| 5 | `advance` | float | em | override, else entry `Advance` (**1**) | cursor movement after the sprite, independent of size |
| 6 | `lineAbove` | float | em | override, else entry `LineHeightAbove` (0) | *extra* ascent reserved on the line beyond the font's own |
| 7 | `lineBelow` | float | em | override, else entry `LineHeightBelow` (0) | extra descent |
| 8 | `pivot` | `"x y"` normalized | 0..1 | override, else entry `Pivot` (**0 0**) | where content that does not fill the box sits; rotation centre |
| 9 | `rotation` | float | degrees | override, else entry `Rotation` (0) | rotates the quad around the pivot |

### 3.2 `<obj>` slots

`<obj=name[,size][,offset][,advance][,lineAbove][,lineBelow][,pivot][,rotation]/>`. There are no colour or aspect slots. Formats, units and defaults equal sprite slots 3–9 shifted down by two: 0 name, 1 size, 2 offset, 3 advance, 4 lineAbove, 5 lineBelow, 6 pivot, 7 rotation.

### 3.3 Value syntax and precedence

- All metrics are in **em** (1 = the current font size); pivot is normalized 0..1; rotation is in degrees.
- Vector slots are `"x y"` separated by a **space**, no parentheses: `<sprite=coin,,,1.2 1.2,0 -0.1/>`. One number sets only X.
- Colour modes: *empty* = keep the original art; `i` = the **component's** `color` RGB (CSS `currentColor`), not an enclosing `<color>` range; hex or CSS name = fixed tint. In C# the same choice is `SpriteColorRef` with `source` = `Original` / `Inherit` / `Override`.
- Booleans (`InheritBool`) accept the names or first letters `t` / `f` / `i`.
- Quoted names may contain `<` and `>` (`<sprite="<Keyboard>/a">`), a convenient way to key input-prompt icons.
- **Precedence, weakest to strongest:** provider entry, then keyed override row, then the rule's `DefaultParameter` (per slot), then the tag argument. Overrides never choose *which* sprite; they only change presentation.

## 4. Entry, override and provider data

### 4.1 Entries (serialized; names are the public C# properties)

| Class | Member | Type | Default | Meaning |
|---|---|---|---|---|
| `InlineMedia` (base) | `Name` | string | – | lookup name, case-insensitive; empty names are skipped when the catalog is snapshotted |
| | `Size` | `Vector2` em | (1,1) | box size |
| | `BearingOffset` | `Vector2` em | (0,0) | offset from the layout position |
| | `Pivot` | `Vector2` | (0,0) | content anchor in the box and rotation centre |
| | `Rotation` | float deg | 0 | |
| | `Advance` | float em | 1 | |
| | `LineHeightAbove` / `LineHeightBelow` | float em | 0 / 0 | extra over the font's own ascent / descent |
| `InlineSprite` | `Sprite` | `Sprite` | null | null: entry draws nothing but still reserves layout |
| | `Color` | `Color` | white | tint multiplied with the texture |
| | `PreserveAspect` | bool | true | |
| `InlineObject` | `Source` | `RectTransform` | null | prefab (Clone) or scene object (Existing) |
| | `Mode` | `InlineObjectMode` | `Clone` | `Clone` (0) or `Existing` (1) |

### 4.2 Keyed overrides (`modifier.Overrides`)

| Class | Member | Type | Default | Meaning |
|---|---|---|---|---|
| `InlineMediaOverride` (row) | `Key` | string | – | entry name this row retunes (case-insensitive; last duplicate wins) |
| | `Size`, `BearingOffset`, `Pivot` | `Vector2` | (NaN, NaN) | NaN **per axis** means inherit the entry |
| | `Advance`, `LineHeightAbove`, `LineHeightBelow`, `Rotation` | float | NaN | NaN means inherit |
| `InlineSpriteOverride` | `Color` | `SpriteColorRef` | `Original` | token form: empty / `i` / `#RRGGBBAA` |
| | `PreserveAspect` | `InheritBool` | `Inherit` | |
| `InlineObjectOverride` | – | – | – | only the shared fields |

### 4.3 Providers and catalog assets

| Type | Role | How to use | Mobile |
|---|---|---|---|
| `InlineSpriteProvider` / `InlineObjProvider` | default provider: an inline `Entries` list on the modifier (not shareable) | `provider.Entries.Add(new InlineSprite { Name = "coin", Sprite = s })`; `Entries` is a `StyledList` (also `ReplaceAll`, `Remove(name)`) | OK |
| `AssetSpriteProvider` / `AssetObjProvider` | provider reading a shared asset | `new AssetSpriteProvider { Asset = spritesAsset }` | OK |
| `UniTextSprites` / `UniTextObjects` | ScriptableObject catalogs: `Entries`, `Count`, `Names`, `TryGet(name, out entry)`, `Enumerate()`, `Changed` event | `Assets → Create → LightSide → UniText → Sprites` / `Objects`; many components may share one asset | OK |
| `ISpriteProvider` / `IObjProvider` | marker interfaces over `INamedCatalog<TEntry>` for **custom providers** (item icons, input-prompt icons, localization) | assign `modifier.Provider = myProvider`; `Enumerate()` must return **every** resolvable entry and `Changed` must fire when results change | OK if cached |

`SpriteModifier.Provider` / `ObjModifier.Provider` default to a new inline provider. A modifier snapshots the catalog from `Enumerate()` on the main thread before parallel layout and recaptures when `Changed` fires (outside play mode it recaptures on every sweep). The create-menu path in the API page text ("Assets → Create → UniText → Sprites") is stale; the real path is `Assets → Create → LightSide → UniText → Sprites` (and `Objects`).

## 5. Layout model

- A sprite is a glyph in the text mesh: a box standing on the baseline, `size` in em, plus `offset`; the cursor then moves by `advance`.
- `aspect = sprite.rect.width / sprite.rect.height`. **Preserve:** glyph height = `min(box.x / aspect, box.y)` em and the content sits in the box at `(box - content) * pivot`. **Stretch:** height `box.y`, width `box.x`.
- Defaults give a square icon 1 em x 1 em, bottom on the baseline, advance 1 em. A wide sprite (aspect 3) at defaults shrinks to about 0.33 em tall: give it `size` = `"3 1"` and `advance` = 3.
- A bigger sprite also needs `advance` (else it overlaps the next character) and, if it rises above or sinks below the line, `lineHeightAbove` / `lineHeightBelow`.
- `lineHeightAbove` / `lineHeightBelow` are *extra* beyond the font's own ascent / descent, not absolute heights. Rule of thumb: above = (top of picture above baseline) - (font ascent, about 1 em); below = (depth under baseline) - (font descent).
- `pivot` defaults to (0,0) since 3.5.6: content that does not fill the box is pinned bottom-left, not centred. Use `0.5 0.5` to centre.
- All inline media share these metrics; only the sprite draws mesh glyphs, the obj positions a RectTransform.

## 6. Sprite versus object

### 6.1 Sprite = glyph (`SpriteModifier`)

- Drawn inside the text mesh from a process-wide `SpriteFont`: works in `UniText`, `UniTextWorld`, the layer stack, takes layer effects. Needs no Read/Write on the texture, any compression, any `SpriteAtlas` or loose texture; a *Tight* mesh sprite is drawn by its outline.
- `<color>` ignores sprites; tint through the colour slot. Component alpha, `Hide()` / `Show()`, fades and `<alpha>` fade sprites (a sprite with colour `i` does not fade twice).
- `SpriteFont` registers each distinct `Sprite` object permanently (`Register`, `Unregister`, `TryGetGlyph`); glyph ids per `Sprite` object are never reissued.
- Effects on sprites follow the colour-glyph policy: shadow and glow decorate them by default; stroke, extrude, inner shadow, glitch and fill skip them unless `ColorGlyphs = Apply` (see [unitext-emoji.md](unitext-emoji.md), section 6).

### 6.2 Object = child (`ObjModifier`)

- **Clone** mode: the prefab is instantiated under `UniText.RenderRoot`, one instance per occurrence, pooled per entry per component. Its RectTransform is forced to top-left anchors, scale 1, `sizeDelta = size * fontSize` px, pivot = media pivot, rotation = prefab rotation times `rotation`. The prefab is **resized to the tag size**: build its content with stretch anchors or layout groups.
- **Existing** mode (`InlineObjectMode.Existing`): one scene `RectTransform` is moved (its `AnchoredPosition3D` is driven) to the occurrence every frame the text is processed; its own size, rotation, scale and parent are kept; `size` only reserves layout space; the position is restored when the occurrence disappears. It throws `InvalidOperationException` if the object is not in a scene, if it contains the text, or if it is already used by another **visible** occurrence (one scene object, one occurrence).
- On a Canvas text, clones fade and hide with the text (`Hide()` also hides inline Clone objects). On `UniTextWorld` they are scene objects that keep their own opacity.
- `SpriteImageWrapper` (a single uGUI `Image` child) exists only for custom `InlineObjectModifier` types that place sprites as child objects; `SpriteModifier` does not use it.

## 7. U+FFFC and `InlineObjectPolicy`

- Every sprite or obj occurrence inserts exactly **one U+FFFC** into the cleaned text. For caret, selection, backspace, code-point indices and `RangeQuery` ranges the icon counts as one character; `string.Length` of the markup is a different number.
- An unresolved name leaves the bare U+FFFC, drawn as whatever the font gives for it. A raw U+FFFC typed by a user renders as the same bare placeholder.
- `InlineObjectPolicy` (`Include` default / `Exclude` / `Only`) is a parameter of every `InteractiveModifierBase` (`LinkModifier`, `InteractiveModifier`, `SpoilerModifier`). It decides whether U+FFFC clusters take part in that interactive range's hit geometry: `Include` makes the icon part of the hit area, `Exclude` removes the icon fragments (only the text around is clickable), `Only` makes only the inline media clickable. It is the only U+FFFC-specific hit-testing rule. Details: [unitext-interaction-links.md](unitext-interaction-links.md).
- `UniTextEditable.InsertObject<T>(string parameter)` inserts a self-closing tag at the caret when the component has a tag style for modifier `T`, else a bare U+FFFC.

## 8. Mobile cost

| Item | Facts | Verdict |
|---|---|---|
| Sprite glyphs | mesh glyphs in the text mesh, no GameObject, no CPU copy of the texture; one draw call per distinct texture | OK |
| Icons from many separate textures | each distinct texture adds a draw call | LIMIT: pack all icons into one texture or atlas |
| Creating new `Sprite` objects at runtime | each distinct `Sprite` gets a permanent glyph id until `SpriteFont.Instance.Unregister(sprite)` | LIMIT: reuse Sprite objects; never create them per frame |
| Sprite decorated by an effect with `ColorGlyphs = Apply` (or default shadow/glow) | the first request derives a silhouette: a synchronous GPU blit plus `ReadPixels` (`SpritePixelReader`) and one SDF-atlas entry per decorated sprite | LIMIT: avoid first-time effect requests on many new sprites mid-gameplay |
| `<obj>` Clone | a real GameObject per occurrence (pooled; `Instantiate` plus canvas rebuild on setup) | AVOID for hundreds of occurrences or per-frame churn; OK for a handful |
| `<obj>` Existing | one scene object repositioned every processed frame | OK |
| Counters changing every frame | `text.SetText(stringBuilder)` does not parse when unchanged; sprites are cheap glyphs | OK |
| Custom provider | `Enumerate()` runs on the main thread when the catalog is recaptured | OK if it returns a cached, allocation-free collection |
| Large inline pictures | one big quad; costs layout space, not extra draws when sharing a texture | OK |

## 9. Recipes

### R1. Make `<sprite=...>` work in a component
See section 2: `Style.FromSource(new InlineTagRule("sprite"), new SpriteModifier { Provider = new AssetSpriteProvider { Asset = sprites } })`. Setup it needs: a `UniTextSprites` asset and the style. Result: `"Reward: 250 <sprite=coin/>"` shows the icon. Gotcha: the style must exist on the component (or in the global preset) before the text is built; a fresh component shows the tag literally.

### R2. Build a `UniTextSprites` catalog from a sprite sheet (editor script)
Manual route: `Assets → Create → LightSide → UniText → Sprites`, expand *Entries*, add rows (Name plus Sprite; each row foldout holds size, bearing offset, pivot, rotation, advance, line height, colour, preserve aspect). There is no "import sheet" button, so script it:

```csharp
#if UNITY_EDITOR
using System.IO;
using System.Linq;
using LightSide;
using UnityEditor;
using UnityEngine;

// Editor assembly referencing LightSide.UniText. Select a sliced sprite sheet (Sprite Mode = Multiple), run the menu item.
public static class BuildIconCatalog
{
    [MenuItem("Tools/Game/Build Icon Catalog")]   // not compiled
    static void Build()
    {
        var sheetPath = AssetDatabase.GetAssetPath(Selection.activeObject);
        var catalog = ScriptableObject.CreateInstance<UniTextSprites>();
        foreach (var s in AssetDatabase.LoadAllAssetsAtPath(sheetPath).OfType<Sprite>().OrderBy(x => x.name))
        {
            var aspect = s.rect.width / s.rect.height;
            catalog.Entries.Add(new InlineSprite
            {
                Name = s.name, Sprite = s, PreserveAspect = true,
                Size = new Vector2(aspect, 1f), Advance = aspect,         // 1 em tall, as wide as the art
                BearingOffset = new Vector2(0f, -0.12f),                  // drop slightly below the baseline
            });
        }
        var outPath = AssetDatabase.GenerateUniqueAssetPath(Path.ChangeExtension(sheetPath, null) + "_Catalog.asset");
        AssetDatabase.CreateAsset(catalog, outPath);
        AssetDatabase.SaveAssets();
    }
}
#endif
```
Names are the tag keys (case-insensitive): use stable ids (`coin`, `gem`, `item_sword`). Keep sprite atlas rotation off. Gotcha: all icons in one texture means one draw call.

### R3. Currency and stat icons in a HUD string
```
"{gold} <sprite=coin/>   {gems} <sprite=gem/>   <sprite=heart,i/> {hp}"
```
- Square icons at defaults are 1 em x 1 em on the baseline. Fine-tune once per icon on the entry or a keyed override (R9), not per tag.
- Per-occurrence tweaks (empty slots keep defaults): lower by 0.12 em `<sprite=coin,,,,0 -0.12/>`; 1.2x bigger with matching advance `<sprite=coin,,,1.2 1.2,,1.2/>`; stretch without aspect `<sprite=bar,,false,4 1/>`.
- `<sprite=heart,i/>` follows the **component** `color` (a red `text.color` turns the heart red) but not `<color=red>` ranges; `<sprite=heart,#FF4040/>` forces a tint.
- For counters changing every frame use `text.SetText(stringBuilder)`.

### R4. Item icons in tooltips (custom provider)
```csharp
public sealed class ItemIconProvider : ISpriteProvider
{
    readonly Dictionary<string, InlineSprite> map = new(StringComparer.OrdinalIgnoreCase);
    public event NamedCatalogChangedHandler<InlineSprite> Changed;

    public bool TryGet(string name, out InlineSprite entry) => map.TryGetValue(name, out entry);
    public IEnumerable<InlineSprite> Enumerate() => map.Values;      // MUST list every resolvable entry

    public void Set(string key, Sprite sprite)                       // main thread only
    {
        map[key] = new InlineSprite { Name = key, Sprite = sprite };
        var change = new NamedCatalogChange<InlineSprite>(StateChangeKind.ReplaceAll, affectsResolution: true);
        Changed?.Invoke(this, in change);
    }
}
// text.Styles.Add(Style.FromSource(new InlineTagRule("sprite"), new SpriteModifier { Provider = itemIcons }));
// tooltip.Text = $"<sprite=item_{id}/> {name}\n{description}";        // not compiled
```
Add icons before the text that uses them is built, or raise `Changed` after adding. For a fixed set a `UniTextSprites` asset is simpler. A name the provider lacks leaves the bare U+FFFC, silently.

### R5. Custom emoji set from your own art
- Option A (explicit tags): one catalog (R2) with names `smile`, `cry`, ...; tags `<sprite=smile/>`; combine with the shortcode map in [unitext-emoji.md](unitext-emoji.md) (R4) so chat `:smile:` becomes `<sprite=smile/>`.
- Option B (tag per emoji): `new InlineTagRule("smile") { DefaultParameter = "smile" }` with the same `SpriteModifier` makes `<smile/>` work (default parameter fills slot 0).
- Option C: a custom color font (`UniTextColorFont`, see [unitext-emoji.md](unitext-emoji.md), section 5): real Unicode characters, so copy, paste, selection and caret treat them as one cluster and the string stays plain text.
Choose C when users type emoji; A or B when the art is yours and names are known.

### R6. Large inline picture or portrait
Rule of thumb: `size` = the picture in em (aspect-correct), `advance` = the width actually reserved, `lineHeightAbove` = (top above baseline) - (font ascent, about 1 em), `lineHeightBelow` = (depth under baseline) - (font descent). Example values from the package's BasicUsage sample catalog: a wide logo has size `6.72 2.29`, bearingOffset `-0.3 -0.6`, advance `5.97`, lineHeightAbove `0.57`, lineHeightBelow `0.12`; a tall portrait has size `5.41 5.87`, bearingOffset `-0.01 -1.48`, advance `3.54`, lineHeightAbove `3.39`, lineHeightBelow `1.14`. Without the line-height values tall pictures overlap neighbouring lines.

### R7. Animated inline widget (prefab clone)
Goal: a spinning loader in a sentence.
1. Prefab with a root `RectTransform` (stretch-anchored children, an `Image` plus Animator or script).
2. `Assets → Create → LightSide → UniText → Objects` (`UniTextObjects`); entry `Name = spinner`, `Source = prefab RectTransform`, `Mode = Clone`.
3. Style (code):
```csharp
var mod = new ObjModifier { Provider = new AssetObjProvider { Asset = objects } };
text.Styles.Add(Style.FromSource(new InlineTagRule("obj"), mod));
text.Text = "Loading <obj=spinner,1.2 1.2,0 -0.2,1.2/> please wait";   // size slot 1, offset slot 2, advance slot 3
```
Each occurrence is a GameObject under `text.RenderRoot`, pooled per component and destroyed when its tag disappears. Budget a handful per text; for a static icon use a sprite. Clone mode inherits Canvas raycasting, so buttons inside the prefab can work.

### R8. One existing scene widget in the text (Existing mode)
```csharp
var provider = new InlineObjProvider();
provider.Entries.Add(new InlineObject { Name = "hp", Source = hpBarRect, Mode = InlineObjectMode.Existing });
text.Styles.Add(Style.FromSource(new InlineTagRule("obj"), new ObjModifier { Provider = provider }));
text.Text = "Boss <obj=hp,8 0.6/> is enraged";   // size reserves 8 em x 0.6 em of layout; the bar keeps its own size
```
`hpBarRect` must be a scene object outside the text's own hierarchy, and only one visible occurrence per object is allowed: a second `<obj=hp/>` or a second text using it throws `InvalidOperationException`.

### R9. Retune a sprite for every use (keyed override)
```csharp
modifier.Overrides.Add(new InlineSpriteOverride
{
    Key = "coin",                                        // = sprite name, case-insensitive
    BearingOffset = new Vector2(float.NaN, -0.12f),      // NaN axis = inherit the entry
    Advance = 1.1f,
    // Color = new SpriteColorRef { source = SpriteColorSource.Inherit } for currentColor
});
```
Precedence: entry, this override, rule default parameter, tag token. The inspector exposes the same *Overrides* list on the modifier.

### R10. Clickable icon
`<link=https://example.com><sprite=info/></link>` makes the icon part of the link's hit geometry (`InlineObjectPolicy.Include`, the default). Set the policy in the link modifier's parameters. The link tag needs its own style (Styles picker, *Link* preset); see [unitext-interaction-links.md](unitext-interaction-links.md).

### R11. Insert an icon at the caret of an input field
```csharp
editable.InsertObject<SpriteModifier>("heart");   // inserts <sprite=heart/> if the component has a tag style for SpriteModifier
```
Without the sprite style on the component it inserts a bare U+FFFC, which draws nothing meaningful. See [unitext-input-fields.md](unitext-input-fields.md).

### R12. World-space and 3D text
Sprites are mesh glyphs, so the setup of section 2 works on `UniTextWorld` unchanged. `UniText3D` draws colour glyphs flat on the front of the extrusion (default) or as die-cut stickers (`colorGlyphs = Sticker`, `stickerBorder` em); its 2D effect layers are not drawn on 3D text. `<obj>` clones in 3D text are ordinary scene objects. See [unitext-3d-text.md](unitext-3d-text.md).

### R13. A tag alias with default arguments
```csharp
var coin = new InlineTagRule("coin") { DefaultParameter = "coin,,,1.2 1.2,,1.2" };
text.Styles.Add(Style.FromSource(coin, new SpriteModifier { Provider = new AssetSpriteProvider { Asset = sprites } }));
// "<coin/>" now draws sprite "coin" 1.2 em with advance 1.2
```
Slot-by-slot merge: a value present in a tag slot wins, empty slots take the default.

### R14. Text migrated from TextMeshPro
TMP sprite tags migrate as numeric keys (`<sprite=15>`, also `/>`); each TMP sprite asset becomes a generated `UniTextSprites` plus an `InlineTagRule` + `SpriteModifier` pair. A component that has a sprite asset but no tag in its serialized text gets no catalog and needs `SpriteModifier` + `AssetSpriteProvider` + `InlineTagRule("sprite")` by hand. Details: [unitext-tmp-migration.md](unitext-tmp-migration.md). The migration docs still say world-space `TextMeshPro` with sprite tags stays on TMP; that is stale since 3.5.0.

## 10. Type catalog

| Type | Kind | Role | Mobile |
|---|---|---|---|
| `SpriteModifier` | sealed : `InlineMediaModifier<InlineSprite, InlineSpriteOverride>` | draws sprites as `SpriteFont` glyphs; `Provider`, `Overrides` | OK |
| `ObjModifier` | sealed : `InlineObjectModifier<InlineObject, ObjectMediaWrapper, InlineObjectOverride>` | prefab clones and scene objects; `Provider`, `Overrides` | LIMIT |
| `InlineMediaModifier<TEntry>` | abstract : `BaseModifier` | catalog snapshot, per-occurrence resolution, shaping-slot rewrite (advance, offset), line-space reservation; hooks `OnExtraTokens`, `OnShapingStarted`, `OnMediaShaped`, `HasRenderable`, `CatalogRecaptured`, `SnapshotEntries` | OK |
| `InlineMediaModifier<TEntry,TOverride>` | abstract | adds the keyed `Overrides` list (`ResolveOverride(key)`) | OK |
| `InlineObjectModifier<TEntry,TWrapper,TOverride>` | abstract | per-entry wrapper pools and lifecycle; `ConfigureWrapper`, `IsSingular` | LIMIT |
| `InlineMedia`, `InlineSprite`, `InlineObject` | classes | entry data (section 4.1) | – |
| `InlineMediaOverride`, `InlineSpriteOverride`, `InlineObjectOverride` | classes | keyed override rows (section 4.2) | – |
| `InlineObjectMode` | enum | `Clone` = 0, `Existing` = 1 | – |
| `InheritBool` | enum byte | `Inherit` = 0, `True`, `False` | – |
| `SpriteColorSource` / `SpriteColorRef` | enum / struct | `Original` = 0, `Inherit` = 1, `Override` = 2; `ToToken()`, `FromToken()`, `Parse(ReadOnlySpan<char>)` (empty to Original, `i` to Inherit, colour to Override, unparsable to Original) | – |
| `ISpriteProvider` / `IObjProvider` | interfaces | custom catalogs | – |
| `InlineSpriteProvider` / `InlineObjProvider` / `AssetSpriteProvider` / `AssetObjProvider` | sealed | inline lists and asset-backed providers | OK |
| `MediaWrapper` | abstract | one inline RectTransform (`instance`, `owner`, `anchoredPosition`, `sizeDelta`, `pivot`, `rotation`); `Setup()`, `Destroy()`, abstract `TryCreate()` / `ApplyContent()` | LIMIT |
| `ObjectMediaWrapper` | sealed | clones a prefab or tracks one scene object (`source`, `mode`) | LIMIT |
| `SpriteImageWrapper` | sealed | one uGUI `Image` child for custom object modifiers; not used by `SpriteModifier` | LIMIT |
| `SpriteFont` | sealed : `ColorFontCore` | process-wide font whose glyphs are `Sprite`s: `static Instance`, `uint Register(Sprite)`, `bool Unregister(Sprite)`, `bool TryGetGlyph(Sprite, out uint id, out float aspect)`; glyph box 1 em tall on the baseline, width = sprite aspect | LIMIT |
| `UniTextSprites` / `UniTextObjects` | ScriptableObjects (`NamedCatalogAsset<TEntry>`) | shared catalogs | OK |

Assemblies for scripting: `LightSide.UniText` (runtime) and the editor assembly `LightSide.UniText.Editor`; `NamedCatalogChange`, `INamedCatalog<T>` and `StateChangeKind` come from `<LightSideCoreRoot>/Runtime/Catalogs/` and `<LightSideCoreRoot>/Runtime/State/` (namespace `LightSide`).

## 11. Pitfalls

**Setup and silent failures**
1. `<sprite=...>` and `<obj=...>` show as literal text in a component with no matching Style. Wire the style (section 2) or a global preset.
2. `Style.Tag(mod, "sprite")` builds a plain `TagRule`: `<sprite=x>` without `/>` becomes an unclosed range. Use `Style.FromSource(new InlineTagRule("sprite"), mod)` or always write `<sprite=x/>`.
3. **A misspelled or unknown name is silent**: no log, no exception; the occurrence is skipped and the bare U+FFFC stays in the text. Names are case-insensitive and trimmed; quote names with commas or spaces. An entry with `Sprite == null` still reserves layout but draws nothing.
4. A custom provider whose `Enumerate()` returns an empty sequence breaks every tag silently; `Changed` must fire on the main thread after changes.
5. Do not share one `SpriteModifier` between components; share the asset.
6. **Untrusted text** (chat, names, user input): if the sprite or obj style exists, a user can type `<sprite=...>` / `<obj=...>` and inject icons or prefab clones, and a raw U+FFFC renders as a bare placeholder. Strip `￼`, neutralize `<` (for example with `BackslashEscapeRule` or `<noparse>`), or route user text to a component with `UseGlobalStylePreset = false` and no media styles.

**Layout**
7. The size slot with **one number sets only X** (`<sprite=coin,,,1.5/>`); with preserve-aspect the picture does not grow. Write `1.5 1.5`.
8. `advance` is independent of `size`: a bigger or wider sprite needs a matching `advance`; a tall one needs `lineHeightAbove` / `lineHeightBelow`. A wide sprite at defaults shrinks to a 1 x 1 em box.
9. Icons stand on the baseline and look high beside lowercase text: lower with `BearingOffset.y` about -0.1 to -0.2 on the entry or override, not per tag.
10. `pivot` defaults to (0,0): content that does not fill the box sits bottom-left. Set `0.5 0.5` to centre.
11. `<obj>` Clone resizes the prefab's RectTransform to `size * fontSize` px and forces top-left anchors and scale 1: prefabs built with fixed pixel children distort; use stretch anchors.
12. `<obj>` Existing: one scene object, one visible occurrence, never a parent of the text, else `InvalidOperationException`.

**Colour and effects**
13. `<color>` never tints sprites; sprite `i` tracks the **component** `color`, not an enclosing colour tag.
14. Stroke, extrude, inner shadow, glitch and fill skip sprites unless `ColorGlyphs = Apply`; shadow and glow decorate them by default, so a whole-text shadow also shadows every sprite.

**Performance**
15. Sprites are cheap only when packed into one texture; each extra texture costs a draw call.
16. `<obj>` Clone is a GameObject per occurrence: avoid per-frame churn and hundreds of occurrences.
17. Never create fresh `Sprite` objects every frame: each gets a permanent glyph id until `SpriteFont.Instance.Unregister(sprite)`.

**Docs versus code**
18. API page text for `UniTextSprites` says "Assets → Create → UniText → Sprites"; the real menu is `Assets → Create → LightSide → UniText → Sprites` (also *Objects*).
19. The package samples show `<sprite=heart,\#FF0000>`; the backslash is only the sample's escape so the text displays literally. In real text write `#FF0000`.

**Version traps**
- 2.11.0 (breaking): entry `width` + `height` became `size`, `bearingX` + `bearingY` became `bearingOffset`; old catalogs lose customized size and bearing (reset): re-enter after upgrading.
- 3.5.0: sprites became glyphs of `SpriteFont` (mesh) instead of child `Image` objects: they work in `UniTextWorld`, obey layer order, accept layer effects and need no Read/Write; wrapper-based media must derive from `InlineObjectModifier<TEntry,TWrapper,TOverride>`.
- 3.5.6 (breaking): `Pivot` anchors content in its box; default (0,0) pins bottom-left; set (0.5,0.5) to restore centring.
- 3.8.0 (breaking rename): `PrefabMediaWrapper` became `ObjectMediaWrapper`, `InlineObject.Prefab` became `Source`; scene objects (`InlineObjectMode.Existing`) and `SpriteFont.Unregister` arrived.
- 3.20.0: `CatalogRecaptured` hook for custom inline-media modifiers; `Hide()` also hides inline Clone objects.

## Unverified

- Whether an unresolved `<sprite=typo/>` placeholder draws a box or nothing (depends on font coverage of U+FFFC).
- Whether a plain `TagRule("sprite")` with `<sprite=x>` (no `/>`) consumes the following character (derived from the rule's finalization code, not run).
- Behaviour of rotated sprites packed into a `SpriteAtlas` with *Allow Rotation* on.
- Whether the `DefaultParameter`-alias trick (R13, R5-B) works at runtime: composed from the documented per-slot merge, not run.
- The custom `ISpriteProvider` snippet (R4) and the editor catalog script (R2) are composed from source signatures and not compiled.
- Whether `FilterModifier` (greyscale and similar filters) recolors inline sprites the way it recolors emoji: expected from the shared colour-glyph path, not run.
