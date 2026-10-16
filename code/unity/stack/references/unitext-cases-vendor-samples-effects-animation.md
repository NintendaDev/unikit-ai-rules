# UniText — Vendor Samples: Effects, Animation and Interaction Cases, Tag Census, Runtime Patterns, Quirks

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-cases-vendor-samples.md](unitext-cases-vendor-samples.md) (case index for every group, sample inventory, formatting/fonts/layout/editing/3D cases), [unitext-animation-phase.md](unitext-animation-phase.md), [unitext-animation-reveal-sequencer.md](unitext-animation-reveal-sequencer.md), [unitext-effects-paint.md](unitext-effects-paint.md), [unitext-range-state-rules.md](unitext-range-state-rules.md), [unitext-interaction-links.md](unitext-interaction-links.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-version-traps.md](unitext-version-traps.md)

---

This file holds the cases of the five packaged samples that concern **animation and reveal (E), paint effects (F) and links/spoilers/interaction (H)**, plus four reference blocks that apply to every sample: the **tag-name census** (section 4), the **vendor-blessed runtime API list** (section 5), the **sample quirks not to copy** (section 6) and pitfalls (section 7). The case index of all groups, how to import the samples (Package Manager → UniText → Samples tab) and the per-sample inventory are in [unitext-cases-vendor-samples.md](unitext-cases-vendor-samples.md). Sample code lives under `<UniTextRoot>/Samples~/BasicUsage/` (`Slides/*.cs`, `BasicUsageExampleBase.cs`) and `<UniTextRoot>/Samples~/Text3D/`. All types are in `namespace LightSide`.

**Reading rules**
- **No tag name works by default.** A fresh `UniText` understands no tags (shipped prefabs have empty `styles`/`stylePresets`; `UniTextSettings` ships with no global style preset). Every tag below works because the sample registered it on the component that shows it. Bootstrap: master rule [unitext.md](../unitext.md), section "Tag vocabulary bootstrap", and [unitext-markup-system.md](unitext-markup-system.md).
- **Mobile verdicts** (`OK` / `LIMIT` / `AVOID`) come from reading source and docs; nothing was profiled.
- Snippets marked `// not compiled` were adapted by hand and never built; the rest are copied or abridged from sample code.

---

## 1. Index of the cases in this file

| Feature | Case | What it shows | Needs | Mobile |
|---|---|---|---|---|
| Animation | E1 | Phase-driven tags: wave wobble pulse bounce shake float pendulum spin glitch | modifier + `TagRule` per tag | LIMIT with many animated ranges |
| Animation | E2 | Code-driven effects: scramble, rolling counter, split-flap | per-frame `Progress`/`Roll` write | LIMIT |
| Reveal | E3 | One `RevealModifier`, eight named handler entries | `InlineRevealHandlerProvider` | LIMIT |
| Reveal | E4 | Staggered entrance of whole texts | wrapper tag + `Front` per text | LIMIT |
| Animation | E5 | Per-frame change of a non-animated parameter | explicit `MarkModifierDirty` | AVOID on many texts |
| Paint | F1 | Paint tags: gold, fire, ice, neon, candy, outline, layers, inner shadow | `UniTextPaints` + composites + `modak` family | LIMIT (animated ones) |
| Paint | F2 | Code gradient and scrolling paint | `InlinePaintProvider`, `PaintOffset` | LIMIT |
| Paint | F3 | Highlight/marker backgrounds, geometry and paint mapping | `HighlightModifier` | OK (LIMIT animated) |
| Interaction | H1 | Link with press feedback, events, `AutoOpenUrl = false` | `LinkModifier` graph | OK |
| Interaction | H2 | `<link=scheme:value>` as an in-app command channel | H1 | OK |
| Interaction | H3 | `@mention` / `#hashtag` chips | `TriggerWordParseRule` + graph | OK |
| Interaction | H4 | Spoilers (tap to reveal) | `SpoilerModifier` graph | OK |
| Interaction | H5 | Find-in-page highlight | `MutableRangeSource` | OK |
| Interaction | H6 | Tap-to-advance that ignores interactive ranges | `HitTestRange` | OK |
| Interaction | H7 | Links on 3D solids | `WorldPointerRaycaster` + `RaycastTarget` | LIMIT |

---

## 2. Case library: animation, reveal, paint

### E. Animation and reveal

**E1. Phase-driven tags.** Every effect is a pure function of the modifier's `Phase`, which the modifier advances on its own `Clock` (`PlaybackClock` Scaled / Unscaled / Manual; default `Scaled`). The minimal form is a single registration and no per-frame code (the 3D `AnimationSlide` does exactly this):
```csharp
text.Styles.Add(Style.Tag(new WaveModifier(), "wave"));   // a bare <wave> plays with no clip and no driver
```
BasicUsage registers nine modifiers and also writes one shared timer into every `Phase` each frame:
```csharp
private void AddAnimation<T>(GlyphParamModifier<T> modifier, string tag) where T : unmanaged {
    AddStyle(modifier, new TagRule(tag));                 // AddStyle = new Style{Modifier, Source} + Styles.Add
    phaseWriters.Add(value => modifier.Phase = value); }  // one shared clock written every frame
AddAnimation(new WaveModifier(), "wave");  AddAnimation(new WobbleModifier(), "wobble");  AddAnimation(new PulseModifier(), "pulse");
AddAnimation(new BounceModifier(), "bounce");  AddAnimation(new ShakeModifier(), "shake");  AddAnimation(new FloatModifier(), "float");
AddAnimation(new PendulumModifier(), "pendulum");  AddAnimation(new SpinModifier(), "spin");
var glitch = new GlitchModifier(); AddStyle(glitch, new TagRule("glitch")); phaseWriters.Add(v => glitch.Phase = v);
void Update() { animationPhase += Time.deltaTime; foreach (var write in phaseWriters) write(animationPhase); }
```
Markup: `<wave>Wave: riding the sine</wave>  <wave=3 3,2,0.35>and riding a circle</wave>`, `<wobble>..</wobble>`, `<pulse>..</pulse>`, `<bounce>..</bounce>`, `<shake>..</shake>`, `<float>..</float>`, `<pendulum>..</pendulum>`, `<spin>..</spin>`, `<glitch>..</glitch>`. Shape parameters ride the tag: `<wave=0 8,2,0.25>` is "amplitude x y, frequency, spread" (vendor caption); `<wave=3 3,2,0.35>` traces a circle.
- When your code, a tween or a driver should own time, set the clock to manual: `foreach (var m in phased) m.Clock = PlaybackClock.Manual;` (package doc). Shake and Glitch replay identically backwards. The vendor caption: "No active range - no per-frame cost". See quirk Q1 for why the sample's own pattern is not the one to copy.
- Game use: `<shake>` on a critical-hit number, `<wave>` on a quest title, `<pulse>` on a low-health counter.

**E2. Code-driven effects (scramble, rolling counter, split-flap).**
```csharp
scrambleModifier = new ScrambleModifier();                 example.AddStyle(scrambleModifier, new TagRule("scramble"));
rollingModifier  = new RollingModifier();                  example.AddStyle(rollingModifier,  new TagRule("roll"));
flapModifier     = new RollingModifier { Wheel = "ABCDEFGHIJKLMNOPQRSTUVWXYZ " }; example.AddStyle(flapModifier, new TagRule("flap"));
// Update:
scrambleModifier.Progress = Mathf.Clamp01(Mathf.Repeat(scrambleTime, 1.5f));          // 0..1
var settle = 1f - Mathf.Clamp01(Mathf.Repeat(rollTime, 4.5f) / 3f);
rollingModifier.Roll = flapModifier.Roll = 12f * settle * settle;                     // decays 12 -> 0
// Exit: scrambleModifier.Progress = 1f; rollingModifier.Roll = 0f;
```
Markup: `<scramble>DECRYPTING CLASSIFIED LINE...</scramble>`, `<roll>1234567</roll>`, `<roll=1.5>42195</roll>` (spread 1.5: slot-machine), `<flap>NOW BOARDING</flap>`. Game use: score and damage counters (tween `Roll` to 0), "decrypt" dialogue, split-flap titles. Mobile: LIMIT, one value write per frame per modifier; keep the animated ranges short.

**E3. Reveal: one modifier, eight handler entries.** The tag parameter picks a named handler entry from the provider; a bare tag uses the entry with an empty name; one `Front` sweeps a sequential frontier across every range while each handler keeps its own duration.
```csharp
var provider = new InlineRevealHandlerProvider();
provider.Entries.ReplaceAll(new[] {
    Entry("",      new PopRevealHandler  { Duration = 0.35f }),  Entry("fade",  new FadeRevealHandler { Duration = 0.35f }),
    Entry("drop",  new DropRevealHandler { Duration = 0.45f }),  Entry("pop",   new PopRevealHandler  { Duration = 0.3f }),
    Entry("spin",  new SpinRevealHandler { Duration = 0.4f }),   Entry("rain",  new RainRevealHandler { Duration = 0.5f }),
    Entry("glitch", new GlitchRevealHandler { Duration = 0.35f }), Entry("composite", composite) });   // CompositeRevealHandler{Duration=0.5f} of Fade+Slide+Spin+Tint
revealModifier = new RevealModifier { Provider = provider };
example.AddStyle(revealModifier, new TagRule("reveal"));
revealModifier.Front = UnitValue.Percent(0f);                                                  // on enter; Percent(100f) on exit
revealModifier.Front = UnitValue.Percent(Mathf.Clamp01(Mathf.Repeat(time, 1.25f)) * 100f);     // Update, time += dt * 0.16f
static RevealHandlerEntry Entry(string name, RevealHandler handler) => new() { Name = name, Handler = handler };
```
Markup: `<reveal>..</reveal>`, `<reveal=fade>`, `<reveal=drop>`, `<reveal=pop>`, `<reveal=spin>`, `<reveal=rain>`, `<reveal=glitch>`, `<reveal=composite>`. The entry names are the sample's choice; a shared `UniTextRevealHandlers` asset works the same as the inline provider. Handler classes seen: `Fade Slide Spin Tint{StartTint, Duration} Pop Drop Rain Glitch Composite{Handlers}` (2D) and `Flip3D FlyIn3D Extrude3D Tumble3D` (3D). A typewriter needs no handler: `var reveal = text.GetModifier<RevealModifier>(); reveal.Collapse = false; reveal.Front = UnitValue.Percent(100f * t / duration);` (package doc); a `UniTextDriver` clip on `RevealModifier.Param.Front` replaces the coroutine. Quirk Q4: the slide text says the unnamed entry "types this line in" but the code gives it a `PopRevealHandler`.

**E4. Staggered entrance of whole texts.**
```csharp
var provider = new InlineRevealHandlerProvider();
provider.Entries.Add(new RevealHandlerEntry { Name = string.Empty, Handler = handler });
var reveal = new RevealModifier { Provider = provider };
text.Styles.Add(Style.Tag(reveal, "enter"));
reveal.Front = UnitValue.Percent(0f);
text.Text = "<enter>" + text.Text + "</enter>";                       // wrap everything in the tag
// per frame: entrances[i].Front = UnitValue.Percent(Mathf.Clamp01((elapsed - i * stagger) / seconds) * 100f);
```
The 3D example uses `Flip3DRevealHandler{Duration=0.5f}` per slide and `FlyIn3DRevealHandler{Duration=0.8f}` for the intro; the same pattern works for 2D menu text (UI list items entering one after another).

**E5. A non-animated parameter changed every frame needs an explicit dirty mark.**
```csharp
animatedGlow.Radius = UnitValue.Em(0.16f + 0.34f * (0.5f + 0.5f * Mathf.Sin(time * 2.2f)) - 0.05f);
text.MarkModifierDirty(pulseComposite, UniTextDirty.Mesh);      // extension method from ModifierInvalidation
```
`FillModifier.PaintOffset`, `HighlightModifier.PaintOffset` and `.Tint` are animated parameters and need no dirty mark. The glow `Radius` does, and the mark rebuilds the text mesh every frame. The sample does it for two short words; do not copy it to dozens of HUD texts.

### F. Paint effects (stroke, glow, gradient, texture, inner shadow, highlight)

**F1. Paint tags as composites.** Registration (A7 in the main file): `CompositeModifier` of `StrokeModifier`/`GlowModifier`/`FillModifier`, parameter segments joined by `;`.
```
<font=modak><size=280%><gold>GOLD</gold>  <fire>FIRE</fire>  <ice>ICE</ice></size></font>
<font=modak><size=250%><neon>NEON</neon>  <candy>CANDY</candy>  <texture>PHOTO</texture></size></font>
<font=modak><size=200%><outline>OUTLINE</outline>  <layers>LAYERS</layers>  <inner-shadow=#000000E0,0.05 -0.07><fill=#EDE6D0>INSET</fill></inner-shadow></size></font>
<font=modak><size=280%><glow-pulse>PULSE</glow-pulse>  <rainbow>RAINBOW</rainbow></size></font>
```
```csharp
IPaintProvider paints = new AssetPaintProvider { Asset = demoPaints };       // UniTextPaints asset with named swatches
// "gold" = Stroke ; Fill:  AddPaintTag(example, "gold", "#2A1A00CC,0.05;gold", MakeStroke(paints), MakeFill(paints));
// helper body: var c = new CompositeModifier(); c.Modifiers.ReplaceAll(layers); AddStyle(c, new TagRule(tag){ DefaultParameter = parameter });
```
Swatch names go in the tag parameter (`"...;gold"`) or `PaintRef.Named("neon")`; colours are `#RRGGBB[AA]`; widths and radii are bare numbers. `FIRE` and `PULSE` animate the glow radius, `PHOTO` scrolls its texture, `RAINBOW` its gradient (vendor caption); `LAYERS` stacks two strokes, `INSET` is an inner shadow. Setup: a `UniTextPaints` asset (`DemoPaints.asset`: `gold fire ice neon candy photo shine`), the `modak` family for the thick face, SDF render mode (`renderMode 0`; MSDF is sharper at corners). All tag names here are sample-private (section 4). Mobile: LIMIT; stacked stroke/glow/fill layers and animated paint cost more than a plain fill (nothing measured), so use them on a few headline texts.

**F2. Code gradient and scrolling paint.**
```csharp
var codePaints = new InlinePaintProvider();
codePaints.Entries.Add(PaintSwatch.LinearGradient("rainbow", 0f, Stop("#FF3B3B", 0f), Stop("#FFE600", 0.35f), Stop("#37D67A", 0.5f), Stop("#3B7BFF", 0.8f), Stop("#9B5CFF", 1f)));
animatedFill = new FillModifier { Provider = codePaints };
example.AddStyle(animatedFill, new TagRule("rainbow") { DefaultParameter = "rainbow" });
animatedFill.PaintOffset = new Vector2(0.5f + 0.5f * Mathf.Sin(time * 1.5f), 0f);            // Update
animatedTextureFill.PaintOffset = new Vector2(Mathf.Repeat(time * 0.15f, 1f), 0f);           // 'photo' scroll
static GradientStop Stop(string hex, float t) { ColorUtility.TryParseHtmlString(hex, out var c); return new GradientStop(t, c); }
```
3D equivalent: `Style.Tag(fill, "brand", "brand")`, `fill.PaintSpread = PaintSpread.Mirror`, `brand.PaintOffset = new Vector2(Mathf.Repeat(time * 0.15f, 2f), 0f)`.

**F3. Highlight / marker backgrounds.**
```csharp
new HighlightModifier { Paint = PaintRef.Solid(color), GeometryMapping = GeometryMapping.Block,   // Glyph | Line | Range | Block
    PaintMapping = RangePaintMapping.Range, Height = RangeHeight.Content,
    Padding = new UnitVector2(new Vector2(0.1f, 0.06f), UnitKind.Em), CornerRadius = UnitValue.Em(0.22f) }
// painted + animated, text kept legible by a Fill in the same composite:
graph = Composite[ new HighlightModifier { Provider = assetPaints, Paint = PaintRef.Named("neon") }, new FillModifier { Paint = PaintRef.Solid(textColor) } ];
shining.PaintOffset = new Vector2(Mathf.Repeat(time * 0.8f, 3.5f) - 1.75f, 0f);       // moving shine band ('shine' swatch)
pulsingTint.Tint = new Color32(b, b, b, 255);                                         // tint pulse
```
`GeometryMapping`: Glyph = one rounded figure per cluster; Line = per line/BiDi fragment; Range = fragments rounded only at their logical ends; Block = one connected multi-line contour. `RangeHeight` = LineBox / Content / LineAdvance. Tags (private): `highlight-glyph/-line/-range/-block`, `highlight-neon/-shine/-photo/-pulse`. Game use: item-name plates, keyword markers, "selected word" backgrounds.

---

## 3. Case library: links, spoilers, interaction

### H. Links, spoilers, mentions

**H1. Link modifier with press feedback, events and `AutoOpenUrl = false`.**
```csharp
linkModifier = new LinkModifier();
var graph = new CompositeModifier();  graph.Modifiers.Add(linkModifier);
AddFeedback(new InteractionRangeStateSelector { Required = InteractionSignalMask.Pressed }, RangeRuleEvent.None, 0f, 0.15f);
AddFeedback(null, RangeRuleEvent.Activated, 0.04f, 0.18f);
AddStyle(graph, new TagRule("link"));
void AddFeedback(RangeStateSelector selector, RangeRuleEvent trigger, float enter, float exit) {
    var highlight = new HighlightModifier { Paint = PaintRef.Solid(new Color32(128, 128, 128, 64)), GeometryMapping = GeometryMapping.Range,
        Height = RangeHeight.Content, Padding = new UnitVector2(new Vector2(0.1f, 0.06f), UnitKind.Em), CornerRadius = UnitValue.Em(0.15f),
        Priority = RangeDecorationPriorities.Interactive, Tint = new Color32(255, 255, 255, 0) };   // transparent until a rule raises Tint
    var change = new ParameterChange();  change.SetTarget(highlight, HighlightModifier.Param.Tint, new Color32(255, 255, 255, 255));
    var rule = new RangeStateRule { Selector = selector, Trigger = trigger, Playback = new TransitionPlayback { EnterDuration = enter, ExitDuration = exit } };
    rule.Changes.Add(change);  linkModifier.Rules.Add(rule);  graph.Modifiers.Add(highlight); }
linkModifier.AutoOpenUrl = false;                                       // handle clicks yourself
linkModifier.LinkClicked += url => { if (url.StartsWith("http")) Application.OpenURL(url); };
linkModifier.LinkEntered += url => { };  linkModifier.LinkExited += () => { };
linkModifier.Events.Interaction += i => Debug.Log($"{i.Kind}: {i.Range.PrimaryValue} at {i.AnchorRect}");
```
Markup: `<link=https://unity.lightside.media/unitext/docs><color=#45B7D1><u>Documentation</u></color></link>`. The sample's graph has **no colour and no underline**: the slides add `<color><u>` in the markup, while the shipped `LinkPreset.asset` bundles Color + Underline + hover/pressed highlights. Raw-URL detection one-liner (package doc): `text.Styles.Add(Style.Tag(new LinkModifier(), "link")); text.Styles.Add(Style.FromSource(new RawUrlParseRule(), new LinkModifier()));`. Teardown: unsubscribe with `-=` and `Styles.Remove`. `AutoOpenUrl` defaults to true; set it false and check the scheme for any text you do not author.

**H2. `<link=scheme:value>` as an in-app command channel.**
```csharp
// OnLinkClicked(url): if (activeSlide?.HandleLink(this, url) == true) return;  then default URL handling
public override bool HandleLink(BasicUsageExampleBase example, string url) {
    if (!url.StartsWith("font:")) return false;            // not mine, let others handle
    var familyName = url.Substring(5);  /* apply */  return true; }
```
Values the samples use: `preset:fire`, `lang:ja`, `font:body`, `dir:rtl`, `find:fox`, `findnext`, `findprev`, `findclear`, `start`, plain `https://...`. Game use: `<link=quest:accept>`, item links `<link=item:42>`, glossary terms in tooltips. Each handler claims only its own prefix and returns false otherwise.

**H3. `@mention` / `#hashtag` chips (auto-detected, no markup).** Text: `Morning @alice and @bob_42 — the shaping pass by @charlie landed! Tag reviews with #unicode, #typography or #rtl.`; negative case `support@lightside.media` stays plain (match only at a word start).
```csharp
mentionModifier = new InteractiveModifier();
mentionModifier.Rules.ReplaceAll(new[] {
    Rule(InteractionSignalMask.Hovered, mentionHover,   HighlightModifier.Param.Tint,  0.14f, 0.18f),
    Rule(InteractionSignalMask.Pressed, mentionPressed, HighlightModifier.Param.Tint,  0f,    0.2f),
    Rule(InteractionSignalMask.Focused, mentionFocus,   PaintLayerModifier.Param.Tint, 0.12f, 0.12f) });
var mentionGraph = new CompositeModifier();
mentionGraph.Modifiers.ReplaceAll(new BaseModifier[] { mentionBase /*persistent Highlight*/, new FillModifier { Paint = PaintRef.Solid(new Color32(224, 226, 255, 255)) },
    mentionModifier, mentionHover, mentionPressed, mentionFocus });
example.AddStyle(mentionGraph, new TriggerWordParseRule("@"));        // hashtags: new TriggerWordParseRule("#")
mentionModifier.Events.Interaction += i => { switch (i.Kind) {
    case RangeInteractionKind.Activated:         /* i.Range.PrimaryValue = the word without '@', i.Entity */ break;
    case RangeInteractionKind.ContextRequested:  /* i.AnchorRect */ break;
    case RangeInteractionKind.Entered:           /* i.LocalPosition */ break;
    case RangeInteractionKind.LongPressProgress: /* i.Progress */ break; } };
static RangeStateRule Rule<TModifier>(InteractionSignalMask signal, TModifier modifier, ParameterDescriptor<TModifier, Color32> parameter, float enter, float exit) where TModifier : BaseModifier {
    var change = new ParameterChange();  change.SetTarget(modifier, parameter, new Color32(255, 255, 255, 255));
    var rule = new RangeStateRule { Selector = new InteractionRangeStateSelector { Required = signal }, Playback = new TransitionPlayback { EnterDuration = enter, ExitDuration = exit } };
    rule.Changes.Add(change);  return rule; }
```
`TriggerWordParseRule`: word charset = letters, digits and `_` (extend with `ExtraWordChars`), trigger and word stay visible, priority -100 so explicit markup wins. The hashtag graph uses `HighlightModifier{Provider=AssetPaintProvider, Paint=PaintRef.Named("neon"), GeometryMapping.Glyph, PaintMapping=RangePaintMapping.Range}` and a `ParameterChange` that darkens the fill on hover. Dispose: `Events.Interaction -= handler`.

**H4. Spoilers (tap to reveal).**
```csharp
var cover = new HighlightModifier { Paint = PaintRef.Solid(new Color32(32, 34, 42, 255)), GeometryMapping = GeometryMapping.Range, Height = RangeHeight.Content,
    Padding = new UnitVector2(new Vector2(0.12f, 0.08f), UnitKind.Em), CornerRadius = UnitValue.Em(0.2f),
    Order = RangeDecorationOrder.Above, Priority = RangeDecorationPriorities.Interactive, Tint = new Color32(255, 255, 255, 0) };
var change = new ParameterChange();  change.SetTarget(cover, HighlightModifier.Param.Tint, new Color32(255, 255, 255, 255));
var rule = new RangeStateRule { Selector = new SpoilerConcealedRangeStateSelector(), Playback = new TransitionPlayback { EnterDuration = 0.25f, ExitDuration = 0.18f } };
rule.Changes.Add(change);
spoilerModifier = new SpoilerModifier();  spoilerModifier.Rules.Add(rule);
var graph = new CompositeModifier();  graph.Modifiers.ReplaceAll(new BaseModifier[] { spoilerModifier, cover });
example.AddStyle(graph, new TagRule("spoiler"));
```
Markup: `The killer is <spoiler>the butler [emoji]</spoiler>, and the twist: <spoiler>it was all a dream</spoiler>`. The reveal state keys on range identity, survives re-parses and resets when the entity disappears; the cover is an ordinary `HighlightModifier` whose `Tint` a signal-driven rule animates. The shipped `<UniTextRoot>/Defaults/ModifierGraphPresets/SpoilerPreset.asset` is the same graph as an asset.

**H5. Find-in-page (search highlight).**
```csharp
private readonly TextRange[] matches = new TextRange[64];
private readonly MutableRangeSource matchesSource = new(), currentSource = new();
matchesSource.SetIdentity("basic-usage.find.matches");  currentSource.SetIdentity("basic-usage.find.current");
example.AddStyle(new HighlightModifier { Paint = PaintRef.Solid(new Color32(255, 210, 60, 90)), GeometryMapping = GeometryMapping.Range, CornerRadius = UnitValue.Em(0.25f) }, matchesSource);
example.AddStyle(new HighlightModifier { Paint = PaintRef.Solid(new Color32(255, 140, 0, 160)), GeometryMapping = GeometryMapping.Range, CornerRadius = UnitValue.Em(0.25f),
    Priority = RangeDecorationPriorities.FindCurrent }, currentSource);
var count = text.FindAll(value, StringComparison.OrdinalIgnoreCase, matches);         // allocation-free for queries up to 64 UTF-16 chars
using (var update = matchesSource.BeginUpdate(matchesSource.Snapshot.Revision)) { update.Clear(); for (var i = 0; i < count; i++) update.Add(matches[i]); update.Commit(); }
// clear: if (!snapshot.IsValid || source.Count == 0) return; using var u = source.BeginUpdate(snapshot.Revision); u.Clear(); u.Commit();
```
Needs a `Style` whose `Source` is the `MutableRangeSource` (ranges are codepoint ranges of the rendered text). Game use: highlight a searched item or keyword in a codex or chat log.

**H6. Tap-to-advance that ignores interactive ranges.**
```csharp
var cam = CanvasUtil.GetCanvasCamera(demoText.canvas);
var hit = demoText.HitTestRange(screenPos, cam, 0f);                       // TextHitResult { hit, cluster }
return hit.hit && (linkModifier.TryGetRange(hit.cluster, out _) || activeSlide?.HasRangeAt(hit.cluster) == true);
```
Pointer helpers from `LightSide.Core`: `InputUtils.GetKey/GetKeyDown(KeyCode)`, `GetPointerPressed()`, `MousePosition`, `GetMouseButtonDown(0)`, `GetTouchBegan()` (Input System and legacy agnostic).

**H7. Links on 3D solids.** Needs `WorldPointerRaycaster` on the camera and `RaycastTarget = true` on that text (`Spawn` sets it false by default). `links = new LinkModifier { AutoOpenUrl = false }; links.LinkClicked += ...; menu.Styles.Add(Style.Tag(links, "link"));` markup `<link=gold><color=#FFD27A>Gold</color></link>`.

Beyond the samples (package doc): `UniTextRanges.For(text).SetSignal(entity, RangeSignals.Selected, true)` and `AdvanceManual(dt)` drive rules from code; the samples only use the built-in signals Hovered/Pressed/Focused and the spoiler selector. `PrefersReducedMotion` collapses decorative playbacks. `ModifierFieldsAnimationHandler` does not reach modifiers that live in a `StylePreset` or the global preset.

---

## 4. Tag-name census

The census covers every runtime string in the sample scripts and the text of every `UniText`/`UniText3D` component in the five scenes: **81 distinct tag names**. **None is built in.** Each one exists only because the sample registers it (`new Style { Modifier = ..., Source = new TagRule("name") }`, `Style.Tag(modifier, "name")`, or a serialized rule in a scene). 48 names are the modifier's own concept (`b`, `color`, `wave`, ...); **33 are sample-private** names for bundles or one-off effects (flagged `PRIVATE`); pick your own names for those. Two more private tags exist only as serialized rules in the chat scenes: `cat` and `kittens`. In BasicUsage each tag is registered by `BasicUsageExampleBase` or by the slide that shows it; the "(3D)" rows are registered per text in `<UniTextRoot>/Samples~/Text3D/`.

| Tag(s) | Parameter forms seen in sample text | Registered as | Scope |
|---|---|---|---|
| `color` | names (`red`, `gold`, ...), `#RGB`, `#RRGGBB`, `#RRGGBBAA` (the most-used tag, 210 uses) | `ColorModifier` ← `TagRule` | modifier-named |
| `b` | `100 300 400 500 700 900`, `700,r`, `700,f` (the log also `1000`, `800,f`, ...) | `BoldModifier` ← `TagRule` (scenes: also `**`) | modifier-named |
| `i` | `r`, `f`, shear `10 20 30 45 -20` | `ItalicModifier` ← `TagRule` | modifier-named |
| `u` | `,double ,dotted ,dashed ,wavy`, `#FF6B6B`, `#4ECDC4,wavy`, `,solid,3px`, `,solid,1px,-4px`, `#A06CD5,solid,2px,,true` | `UnderlineModifier` ← `TagRule` | modifier-named |
| `s` | `,double ,wavy`, `#FF6B6B`, `#888,dashed`, `#FF0000,solid,2px` | `StrikethroughModifier` ← `TagRule` | modifier-named |
| `size` | `80% 72% 64% 60% 280% 200% 160%`, `16`, `+16`, `-8` | `SizeModifier` ← `TagRule` | modifier-named |
| `font` | `body mono modak`, `header` (undefined family, see Q3) | `FontModifier` ← `TagRule` | modifier-named |
| `var` | `900` (literal docs also `700,80 150% +200 ~,~,~,-12`) | `VariationModifier` ← `TagRule` | modifier-named |
| `lang` | `zh-Hans zh-Hant ja ko` | `LanguageModifier` ← `TagRule` | modifier-named |
| `cspace`, `cwidth`, `wspace` | `15 -2 8 0.25em -1 6`; `auto 1em`; `0.8em` | `LetterSpacingModifier`, `CharacterWidthModifier`, `WordSpacingModifier` ← `TagRule` each | modifier-named |
| `line-height`, `pspace` | `160% 52 ,primary 150%`; `18 1em,0.5em` | `LineHeightModifier`, `ParagraphSpacingModifier` ← `TagRule` | modifier-named |
| `upper`, `lower`, `smallcaps` | none | `UppercaseModifier`, `LowercaseModifier`, `SmallCapsModifier` ← `TagRule` | modifier-named |
| `sup`, `sub` | none (default parameters `super`/`sub`) | one `ScriptPositionModifier` ← `CompositeParseRule` of two `TagRule`s | modifier-named |
| `align`, `indent`, `li` | `Start Center End Left Justify Justify,InterCharacter,Center`; `1.5em 2em 8%`; `1 2 0,1 0,2 0,3 1,1` | `AlignmentModifier`, `IndentModifier`, `ListModifier` ← `TagRule` | modifier-named |
| `nobr`, `sep`, `ellipsis`, `truncate` | none; `" ● "` (void tag); `1`; `1` | `NoBreakModifier` ← `TagRule`; `SeparatorModifier` ← `SeparatorParseRule`; `EllipsisModifier`, `TruncateModifier` ← `TagRule` | modifier-named |
| `ruby`, `rt` | `Tōkyō` (`<ruby=reading>`); `rt` is the inner element | `RubyModifier` ← `RubyParseRule` (element names `ruby`, `rt`) | modifier-named |
| `math` | none | `MathModifier{MathFont, Mode}` ← `MathParseRule` (default `MathDelimiters.Tags`) | modifier-named |
| `fill`, `inner-shadow` | `#EDE6D0`; `#000000E0,0.05 -0.07` | `FillModifier`, `InnerShadowModifier` ← `TagRule` | modifier-named |
| `link` | values: `https://...`, `preset:fire`, `lang:ja`, `font:body`, `dir:auto/ltr/rtl/clear`, `find:fox`, `findnext`, `start` (the schemes are sample-private) | Composite[`LinkModifier`, 2x `HighlightModifier`] ← `TagRule` (3D: bare `LinkModifier`) | modifier-named |
| `spoiler` | none | Composite[`SpoilerModifier`, cover `HighlightModifier`] ← `TagRule` | modifier-named |
| `sprite` | `cat-sulejman`, `unitext-logo` | `SpriteModifier{AssetSpriteProvider}` ← `TagRule` (scenes: `InlineTagRule`, default parameter `test`) | modifier-named |
| `obj` | `cube` (3D) | `ObjModifier{InlineObjProvider}` ← `Style.Tag(.., "obj")` | modifier-named |
| `reveal` | `drop fade pop spin rain glitch composite` (entry names) | `RevealModifier{InlineRevealHandlerProvider}` ← `TagRule` | modifier-named; entry names are the sample's |
| `wave` | `3 3,2,0.35`, `0 8,2,0.25` | `WaveModifier` ← `TagRule` | modifier-named |
| `wobble`, `pulse`, `bounce`, `shake`, `float`, `pendulum`, `spin`, `glitch` | none | `WobbleModifier`, `PulseModifier`, `BounceModifier`, `ShakeModifier`, `FloatModifier`, `PendulumModifier`, `SpinModifier`, `GlitchModifier` ← `TagRule(name)` | modifier-named |
| `scramble` | none (`Progress` driven in `Update`) | `ScrambleModifier` ← `TagRule` | modifier-named |
| `roll`, `flap` | `1.5` | `RollingModifier` ← `TagRule`; `flap` uses `Wheel = "ABC...Z "` | modifier-named |
| `gold`, `candy`, `outline` | none | Composite[`StrokeModifier`, `FillModifier`] with default parameters `#2A1A00CC,0.05;gold`, `#FFFFFF,0.05;candy`, `neon,0.12;#00000000` | PRIVATE |
| `ice`, `neon` | none | Composite[`GlowModifier`, `FillModifier`] with `#9EE8FF80,0.30;ice`, `#FF2BD6,0.40;neon` | PRIVATE |
| `fire`, `glow-pulse` | none | Composite[animated `GlowModifier`, `FillModifier`] with `#FF7A00;fire`, `#00F5FF;#FFFFFF` | PRIVATE |
| `layers` | none | Composite[`StrokeModifier` x2, `FillModifier`] with `#101010,0.40;#FFD447,0.22;#E8407A` | PRIVATE |
| `rainbow`, `texture` | none | `FillModifier` with a code gradient `rainbow` / swatch `photo` (both scrolled via `PaintOffset`) | PRIVATE |
| `highlight-glyph`, `-line`, `-range`, `-block` | none | `HighlightModifier` with `GeometryMapping` Glyph / Line / Range / Block | PRIVATE |
| `highlight-neon`, `-shine`, `-photo`, `-pulse` | none | Composite[`HighlightModifier` (paint `neon` / `shine` / `photo` / `candy`), `FillModifier`], animated | PRIVATE |
| `t`, `t2`, `accent` | none | `StylePreset` entries: Color+Bold, Color+LetterSpacing (`#00B4D8;2`), Color+Wave (`#3A86FF;0 3,3,0.5`) | PRIVATE |
| `brand` | none (3D) | `FillModifier{InlinePaintProvider 'brand'}` | PRIVATE |
| `candles`, `sprinkles`, `snow`, `icicles`, `bulbs` | none (3D) | `Attach3DModifier` with `Placement` Top / Surface / Surface / Bottom / Centerline | PRIVATE |
| `edge`, `plate`, `lit`, `flicker`, `gold` (3D meaning) | none (3D) | `Bevel3DModifier`; `Layer3DModifier` plate; `Layer3DModifier` Tube layer; `Layer3DModifier` whose layer is swapped from code; `Surface3DModifier` | PRIVATE (`gold` reuses the 2D name for a different effect) |
| `field`, `enter` | none (3D) | `Field3DModifier` + `UniText3DField`; `RevealModifier` entrance wrapper added by `Spawn` | PRIVATE |

**Syntax forms other than `<tag>`** (all sample-registered):

| Form | Rule | Where |
|---|---|---|
| `@name`, `#name` | `TriggerWordParseRule("@")` / `("#")` | InteractiveRangesSlide (H3) |
| `**x**` | `MarkdownWrapRule{Marker="**"}` in a `CompositeParseRule` with `TagRule("b")` | password field and field A |
| `%%x%%`, `&x&` | `MarkdownWrapRule` markers (bold-like `%%`, italic `&`) | chat composers |
| `[text](url)` | `MarkdownLinkParseRule` | chat composers |
| `<math>..</math>`, `$..$`, `\(..\)`, `\[..\]`, `\ce{..}`, `\pu{..}` | `MathParseRule{Delimiters = Tags / LatexInline / LatexDisplay}` | MathSlide, LatexSlide |
| `\begin{tabular}` etc., `\textbf`, `\textit`, `\emph`, `\underline`, `\textcolor` | `TabularParseRule`, `Latex*Rule`, `LatexCommandRule(name, ...)` | LaTeX slides |
| `\x` escapes | `BackslashEscapeRule` (style with `Modifier = null`) | `\<` x20, `\#` x5 in slide text |

Escaped-literal forms in slide text are documentation, not parsed: `\<font=name>`, `\<wave=0 8,2,0.25>`, `\<sep>`, `\<DirectionModifier>`, `\<var=...>`, `\<sprite...>`, `\<obj...>`, `\<mat...>`. The 2 MB log uses only `b`, `i`, `u`, `color` (19 colour names, 18 hex forms); its other `<...>` fragments are log noise. README feature lists mention `<b> <i> <u> <s> <color=#FF0000> <size=150%> <cspace=10> <cwidth=1em>` and the snippets `new TagRule("color")` / `new TagRule("link")`.

---

## 5. Vendor-blessed runtime usage patterns (API the sample scripts call)

| Area | Members and patterns |
|---|---|
| Text content | `Text`; `SetText(string)`, `SetText(char[], start, length)`, `SetText(ReadOnlyMemory<char>)`, `SetText(StringBuilder)` (no serialization, no alloc); `TextResolver` (`IUniTextResolver.TryResolve(ReadOnlyMemory<char>, out ReadOnlyMemory<char>)`) |
| Component props | `Font`, `FontStack`, `FontSize`, `Language` (string), `color`, `RaycastTarget`, `rectTransform`, `canvas`, `Buffers`, `CodepointCount`, `Styles` (`Add`, `Remove`, indexer, `Count`), `StylePresets` (`Add`, `Clear`) |
| Whole-text modifiers | `SetWholeText<T>(string parameter = null)`, `ClearWholeText<T>()`, `ToggleWholeText<T>` (font family, direction) |
| Style builders | `new Style { Modifier, Source }`, `Style.Tag(modifier, tag, defaultParameter)`, `Style.WholeText(modifier, parameter)`, `Style.Range(modifier, start, end, parameter)`, `Style.FromSource(source, modifier)`, `Style.Enabled` |
| Rules and sources | `TagRule(name){DefaultParameter}`, `InlineTagRule`, `CompositeParseRule.Rules.ReplaceAll(...)`, `MarkdownWrapRule{Marker}`, `MarkdownLinkParseRule`, `TriggerWordParseRule`, `RubyParseRule`, `SeparatorParseRule`, `MathParseRule{Delimiters}`, `BackslashEscapeRule`, `Latex*Rule`, `TabularParseRule`, `FixedRangeSource`, `MutableRangeSource` (`SetIdentity`, `Snapshot.Revision/IsValid`, `Count`, `BeginUpdate(rev)` → `Clear`/`Add`/`Commit`) |
| Presets | `ScriptableObject.CreateInstance<StylePreset>()`, `preset.Styles.Add(..)`, `Object.Destroy(preset)` |
| Composition | `CompositeModifier.Modifiers.Add / ReplaceAll(BaseModifier[])`; parameter `a;b;c`, one segment per child |
| Search and ranges | `FindAll(query, StringComparison, TextRange[] / Span<TextRange>)`, `HitTestRange(screenPos, camera, maxDistance)` → `{hit, cluster}`, `GetRangeBounds(start, end, IList<Rect>)`, `LinkModifier/InteractiveModifier/SpoilerModifier.TryGetRange(cluster, out _)` |
| Invalidation | extension `MarkModifierDirty(modifier, UniTextDirty.Mesh)` |
| Interaction | `LinkModifier{AutoOpenUrl, LinkClicked, LinkEntered, LinkExited, Events.Interaction, Rules}`; `InteractiveModifier{Rules, Events.Interaction}`; `SpoilerModifier{Rules}`; `RangeInteraction{Kind, Range.PrimaryValue, Entity, AnchorRect, LocalPosition, Progress}`; `RangeInteractionKind{Activated, ContextRequested, Entered, LongPressProgress}`; `RangeStateRule{Selector, Trigger, Playback, Changes}`; `ParameterChange.SetTarget(modifier, Param, Color32)`; `InteractionRangeStateSelector{Required}`; `InteractionSignalMask{Hovered, Pressed, Focused}`; `SpoilerConcealedRangeStateSelector`; `TransitionPlayback{EnterDuration, ExitDuration}`; `RangeRuleEvent{None, Activated}` |
| Animation | `GlyphParamModifier<T>.Phase` (wave, wobble, pulse, bounce, shake, float, pendulum, spin, glitch); `Clock = PlaybackClock.Manual`; `ScrambleModifier.Progress`; `RollingModifier{Roll, Wheel}`; `RevealModifier{Provider, Front}`; `InlineRevealHandlerProvider.Entries`; `RevealHandlerEntry{Name, Handler}`; handlers `Fade/Slide/Spin/Tint/Pop/Drop/Rain/Glitch/CompositeRevealHandler`; `UnitValue.Percent(x)`, `UnitValue.Em(x)`, `new UnitVector2(Vector2, UnitKind.Em)` |
| Paint | `PaintRef.Solid(Color32)`, `PaintRef.Named(string)`, `AssetPaintProvider{Asset}`, `InlinePaintProvider.Entries.Add(PaintSwatch.LinearGradient(name, angle, GradientStop[]))`, `FillModifier{Provider, Paint, PaintOffset, PaintSpread}`, `StrokeModifier{Provider, Paint, Width, Tint}`, `GlowModifier{Provider, Radius}`, `HighlightModifier{Provider, Paint, GeometryMapping, PaintMapping, Height, Padding, CornerRadius, Priority, Order, Tint, PaintOffset}`, `RangeDecorationPriorities{Interactive, FindCurrent}`, `RangeDecorationOrder.Above` |
| Fonts, sprites, math | `SystemFont.Disabled`, `SpriteModifier{Provider}`, `AssetSpriteProvider{Asset}`, `MathModifier{MathFont, Mode}`; `UniTextFont`, `UniTextFontStack`, `UniTextPaints`, `UniTextSprites` as serialized fields |
| Editing | `UniTextEditable`: `Submitted`, `VisibleText`, `SetText`, `Activate(bool showKeyboard = true)`, `GetBehavior<T>()`, `IsStyleActive<T>()`, `TryGetStyleParameter<T>(out string)`, `ToggleStyle<T>(string = null)` → bool, `ApplyStyle<T>(string = null)`; `PasswordBehavior.Revealed`; subclass points `CaretContextHandler.OnAttach/OnDetach/OnContextChanged(in CaretContext)`, `MediaInputBehavior.OnImage/OnFiles/ReadFile/ReadFileAsync`; `ClipboardFormat.TryDetectImage`; `ColorParsing.TryParse(string, out Color32)` |
| Core helpers (`LightSide.Core`) | `InputUtils.GetKey/GetKeyDown/GetPointerPressed/MousePosition/GetMouseButtonDown/GetTouchBegan`, `CanvasUtil.GetCanvasCamera(canvas)`, `WorldPointerRaycaster`, `DraggableRect`, `EventSystemBootstrap`, `FocusGuard` |
| 3D (`LightSide.UniText.3D`) | `UniText3D`: `Depth`, `FrontBevel`, `FaceMaterial/BevelMaterial/SideMaterial/BackMaterial`, `ColorGlyphs`, `Glyphs`, `Raycast(Ray, out hit)`, `TryGetPose(in Text3DSurfacePoint, out pose)`, `Shatter(List<Material>)`; structs `Text3DBevel`, `Text3DLayer`, `Text3DDeformer`; `Text3DLook.ApplyTo`; modifiers `Layer3D`, `Bevel3D`, `Surface3D`, `Deform3D`, `Attach3D`, `Field3D`, `Spin3D/Swing3D/Wave3D/Orbit3D/Tumble3D`, `ObjModifier`; `UniText3DField`, `UniText3DColliders`; `Ease.Of(EasingType.BounceOut)` |

Patterns the vendor repeats: hold the modifier instance and drive `Phase` / `Front` / `Progress` / `Roll` / `PaintOffset` from `Update`; swap `StylePresets` for themes; `<link=action:value>` as a command channel with `AutoOpenUrl = false`; `SetWholeText<T>` for whole-text font or direction; `SetText` overloads for frequently changing text; `FindAll` + `MutableRangeSource` for search; a `MediaInputBehavior` subclass for pasted images; `UniTextDocumentView` + `UniTextDocumentLoader` for multi-MB text.

---

## 6. Sample quirks not to copy

- **Q1. Additive `Phase` writes over a Scaled clock.** The BasicUsage animation tags keep the modifiers' default `Clock = Scaled` **and** assign `Phase` from one shared timer every frame. `Phase` is added to whatever the clock has advanced, so the two sources stack. The vendor's own slide text and the package doc say to set `Clock = PlaybackClock.Manual` when code owns the time. Copy the bare registration of E1 (clock runs itself), or the manual-clock form; never both.
- **Q2. Per-frame mesh rebuild from the glow pulse.** `PaintLayersSlide` changes `GlowModifier.Radius` every frame and calls `MarkModifierDirty(.., UniTextDirty.Mesh)`; that rebuilds the text mesh each frame. Two words in a demo are fine; a HUD with many such texts is not (E5).
- **Q3. `<font=header>` points at an undefined family.** FontSlide shows `<font=header>`, but the shipped `LanguagesFont` stack defines only `body`, `mono` and `modak`. The tag falls back to the stack and logs a warning. Define every family name you use.
- **Q4. The unnamed reveal entry is a Pop handler.** The slide text says the bare `<reveal>` "types this line in", while the code gives the empty-name entry a `PopRevealHandler`. There is no typewriter handler in the sample; a typewriter is `Front` swept over a plain reveal (E3).
- **Q5. Scene objects reference things the package does not contain.** BasicUsage's `StatusText` has no styles yet receives `<color=...>` strings; the chat scenes' `InlineTagRule` points at a sprite provider asset that is not shipped; several FontExamples `Test` objects reference a `fontStack` that is missing. Treat such objects as illustrations, not working setups.
- **Q6. README vs content.** READMEs name an `EditableText.unity` scene that does not exist (the editing demo is the inactive `EditableText` container of `BasicUsage.unity`); the Layout README (and `package.json`) call the Layout sample an alignment/AutoSize demo and list `HorizontalAlignment` as Left/Center/Right, while the sample is a chat-bubble layout test and the enum is `Start=0, Center=1, End=2, Justify=3, Left=4, Right=5`; the BasicUsage README mentions `SourceHanSans-LICENSE.txt` while the folder holds `STIXTwoMath-OFL.txt`; `package.json` lists four samples, not Text3D.
- **Q7. The sample link graph has no colour or underline.** Press/activation feedback only; the slides add `<color><u>` in markup. Copying the code alone yields links that look like plain text until pressed. Use the shipped `LinkPreset.asset` graph or compose Color + Underline yourself.
- **Q8. Demo plumbing.** The five-way `SetText` cycle per slide, the resolver that allocates a prefix string per call, `Debug.Log` per slide, `Application.OpenURL` after only an `http` prefix check, and the Gemini chat (the API key is sent from the client and public in a build) are harness code, not recommendations.
- **Q9. Tag names in the slide strings are the sample's.** `gold`, `neon`, `highlight-*`, `t`, `accent`, `candles` and the rest of the 33 `PRIVATE` names in section 4 should not appear in your game unless you register them yourself.

---

## 7. Pitfalls and version traps (effects, animation, interaction)

1. **Link and spoiler graphs created in code carry no default feedback** (since 3.8.0): add `HighlightModifier` + `RangeStateRule`s (H1, H4) or use the `LinkPreset`/`SpoilerPreset` assets. `AutoOpenUrl` is on by default: set it false and validate the scheme before `Application.OpenURL` for text you do not author.
2. **Animated parameters are cheap, non-animated ones are not.** Writing `Phase`, `PaintOffset` or `Tint` is cheap; a parameter such as glow `Radius` needs `MarkModifierDirty` and costs a mesh rebuild per frame (E5). Many simultaneously animated ranges on mobile: measure first.
3. **A bare phase tag already animates itself.** A per-frame `Phase` write on top adds to the clock; set `Clock = PlaybackClock.Manual` when code owns time (Q1).
4. **Reveal timing has two layers:** one `Front` sweeps the frontier; each handler has its own `Duration` (E3).
5. **Event and style hygiene.** Unsubscribe `LinkClicked`/`LinkEntered`/`LinkExited` and `Events.Interaction`, remove styles you added, destroy runtime presets; otherwise handlers and styles leak across scene reloads.
6. **Mention/hashtag escaping.** A `#` can start a hashtag or colour; escape with `\#` where `TriggerWordParseRule("#")` is registered.
7. **3D effects** (attach, layers, deformers, shatter) multiply geometry; keep counts and the number of 3D texts small on mobile and let the shader animate entrances (`animateInShader`).
8. **Version traps visible in the samples** (details in [unitext-version-traps.md](unitext-version-traps.md)): the 2.x names `RangeStateEffect/ModifierEffect/PropertyEffect/InteractiveModifier.Effects/RangeEffectDriver/RangeEffectClock` became `RangeStateRule/ModifierRule/ParameterRule/Rules/Playback/PlaybackClock` in 3.2.0, and `ModifierRule`, `ParameterRule`, `RuleValue` were removed in 3.8.0 (a `RangeStateRule` now holds `Changes` = `ParameterChange` entries; a transient effect becomes a permanent composite member with a transparent `Tint`); `RangeStyler`/`StateHighlightStyler`/`SpoilerCoverStyler`/`TextHighlighter` were replaced by rules plus highlight modifiers in 3.0.0; `UniTextPhaseDriver` is gone; the monospace flag `<cspace=..,true>` was retired in 3.2.0 (use `<cwidth=auto>`; markup is not rewritten); 2.x→3.0 migrations changed serialized data only (`Outline → Stroke`, `Gradient → Fill`, `Wobble → Wave`, `UniTextGradients → UniTextPaints`); 3.30.0 added the `ListModifier` third parameter, `LineGapModifier`, the LaTeX list/size/alignment/spacing rules, `\ce{}`/`\pu{}` and `TextBoxTrimModifier`.

---

## Unverified

- The net visual speed of the sample's pattern (clock advance plus per-frame `Phase` write) comes from reading the source, not from watching a Play Mode run.
- `RollingModifier`: that `Roll = 0` shows the real digits (the sample decays `Roll` from 12 to 0 and resets it to 0 on exit) and the unit of `<roll=1.5>`.
- Stroke/glow widths in the paint composites (`0.05` ... `0.40`) are probably em fractions; the unit is not stated.
- Whether `<lang>` per range beats `UniText.Language`, the meaning of `~` in `<var=~,~,~,-12>` and of `f` in `<i=f>`, and the slot names of `<u>`/`<s>` are open (see the main file).
- Whether `UniText3D` honours a global style preset: every 3D sample registers its tags locally.
- How a text component treats a tag that no style claims, in particular the unregistered fragments of the 2 MB log and the `<color=...>` strings sent to the BasicUsage `StatusText`.
