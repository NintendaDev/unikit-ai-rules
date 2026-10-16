# UniText — Range State Rules (hover, press, focus, custom signals)

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-animation-reveal-sequencer.md](unitext-animation-reveal-sequencer.md), [unitext-animation-phase.md](unitext-animation-phase.md), [unitext-interaction-links.md](unitext-interaction-links.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-effects-paint.md](unitext-effects-paint.md), [unitext-version-traps.md](unitext-version-traps.md)

---

A **range state rule** (`RangeStateRule`) animates a parameter of a sibling modifier while a tagged range is in a state (hovered, pressed, focused, spoiler concealed, loading, or any signal your code sets). It replaces hand-written hover/press code on keywords, links, mentions and spoilers.

Mobile verdicts (`OK` / `LIMIT` / `AVOID`) in this file come from reading source and docs; nothing was profiled.

## 1. Lookup — I want ... → use

| I want | Selector | Playback | Code? |
|---|---|---|---|
| Hover highlight on a keyword/link/mention | `InteractionRangeStateSelector { Required = Hovered }` | `TransitionPlayback` | none in the inspector |
| Press feedback (the touch-friendly one) | `InteractionRangeStateSelector { Required = Pressed }` | `TransitionPlayback` | none |
| Hover **or** press | `AnyRangeStateSelector` of two interaction selectors | `TransitionPlayback` | none |
| Focus ring for keyboard/gamepad | `InteractionRangeStateSelector { Required = Focused }` | `TransitionPlayback` | none |
| Click flash | no selector, `Trigger = Activated` | `TransitionPlayback` (enter 0, exit 0.25) | none |
| Hold-to-confirm fill (touch/pen long press) | `ScalarRangeStateSelector` on `LongPressProgress` (`Greater` 0) | `SignalProgressPlayback` on `LongPressProgress` | none (§10.1) |
| Spoiler cover | `SpoilerConcealedRangeStateSelector` | `TransitionPlayback` | none (preset) |
| Loading bar inside text, karaoke highlight | `ScalarRangeStateSelector` on `LoadingProgress` / `VoiceProgress` | `SignalProgressPlayback` | set the signal from code |
| React to game state on tagged words (alert, current step) | `RangeSignalSelector<T>` on your own `RangeSignal<T>` | `TransitionPlayback` | yes (§10) |
| Time the animation yourself (tween, Animator) | any | `ManualPlayback` | yes |
| Debug what is matching | – | – | menu `Tools → LightSide → UniText → Range Debugger` (live entities, playbacks, push signal values) |

## 2. How a rule works

1. **Signals**: typed values per entity (and per wrapped fragment, called a segment). The interaction router writes `Hovered`, `Pressed`, `Focused`, `Disabled`, `LongPressProgress` and `DragProgress` itself; everything else you set with `UniTextRanges.SetSignal`.
2. **Selector** (`RangeStateSelector.Matches`) turns signals into true/false. Edge false→true = Enter, true→false = Exit, still true with a signal change = Update.
3. **Playback** (`RangeStatePlayback`) turns Enter/Exit/Update into a **weight** on the rule instance: 0 = normal cascade, 1 = rule target. Weight may overshoot under `Back`/`Elastic` easing.
4. Each **`ParameterChange`** contributes `Lerp(cascade, target, weight)` to one parameter of one sibling modifier, using its `Composition` (`Replace` default).

A rule never touches the text itself; it only moves parameters. Typical look: a sibling `HighlightModifier` whose `Tint` is permanently transparent (a transparent decoration costs no geometry) and a rule that animates `Tint` to an opaque colour.

### 2.1 Where rules live and what they may target

- Rules are stored in `InteractiveModifierBase.Rules` (`RangeStateRule` state list: `Add`, `ReplaceAll`, ...). Concrete hosts: `InteractiveModifier`, `LinkModifier`, `SpoilerModifier`. A plain `HighlightModifier`, `ColorModifier` etc. cannot host rules.
- A rule drives only modifiers that are **nodes of the same modifier graph**, i.e. siblings or descendants under the same root `CompositeModifier` as the host. Each modifier instance may occur once in the graph, with no cycles.
- Registration validates this and throws `InvalidOperationException` (with the path) outside authoring: playback must be non-null; a selector or a trigger must exist; `SignalProgressPlayback.InputMin` must differ from `InputMax`; every change's target must be a unique node of the graph, must declare the parameter, carry a typed value, and support the composition.
- So: **build every target into the same `CompositeModifier` before the style is added to the text.**

| Host | How it gets registered on a text (no tag is wired by default) |
|---|---|
| `InteractiveModifier` | style picker "Interactive" (auto-detect rule `TriggerWordParseRule`: `@name`, `#tag`), or your own `Style.Tag(graph, "kw")` / `new TagRule("kw")` |
| `LinkModifier` | style picker "Link" (Tags/Common, `<link>`), a ready-made composite copied from the package preset |
| `SpoilerModifier` | style picker "Spoiler" (Tags/Interactive, `<spoiler>`), copied from the package preset |

For the general tag bootstrap see [unitext.md](../unitext.md) section "Tag vocabulary bootstrap" and `unitext-markup-system.md`; for the pointer events, hit policies and `RangeInteraction` events that feed the signals see `unitext-interaction-links.md`.

## 3. `RangeStateRule` members (all public)

| Member | Default | Meaning |
|---|---|---|
| `Selector` | `InteractionRangeStateSelector { Required = Hovered }` | when the rule is active; may be null only if `Trigger` is set |
| `Playback` | `InstantPlayback` | how the weight moves (mandatory) |
| `Scope` | `Entity` | `Entity`: one playback writes every fragment of a wrapped range; `Segment`: independent playback per fragment |
| `Trigger` | `None` | `Activated` or `ContextRequested`: a one-shot pulse independent of the selector |
| `Priority` | 0 | with `Replace`, the highest priority wins |
| `Changes` | empty | `ParameterChange` state list; may be empty for lifecycle-only or `Manual` rules |

Entity-level built-in signals aggregate fragments: hovered/pressed/focused are true if any fragment has them, disabled only if all do, progress is the maximum.

**`ParameterChange`**: `Composition` (default `Replace`), `SetTarget<TModifier,TValue>(modifier, parameterDescriptor, value)` (throws if the modifier does not declare the parameter), read-only `TargetNode` (`StateNodeId`) and `ParameterId`. Composition support follows the parameter type: float/int/Vector2 add + multiply, `Color32` multiply, `UnitValue` add, enum/bool/string replace only.

## 4. Selectors

| Selector | Matches | Serializable |
|---|---|---|
| `InteractionRangeStateSelector` | `Required` flags all true and `Excluded` flags all false (`InteractionSignalMask`: `Hovered`, `Pressed`, `Focused`, `Disabled`) | yes |
| `ScalarRangeStateSelector` | `Signal` (`BuiltInScalarSignal`: `LongPressProgress`, `LoadingProgress`, `DragProgress`, `VoiceProgress`) `Comparison` (`Less`, `LessOrEqual`, `Equal`, `GreaterOrEqual`, `Greater`; default `Greater`) `Threshold` (default 0) | yes |
| `AllRangeStateSelector`, `AnyRangeStateSelector` | AND / OR of `Selectors` (state list; a null child throws) | yes |
| `NotRangeStateSelector` | negation of `Selector` | yes |
| `SpoilerConcealedRangeStateSelector` | spoiler entities whose `RevealedSignal` is false | yes |
| `RangeSignalSelector<T>` | code-only `(RangeSignal<T> signal, Func<T,bool> predicate)` | **no** (`[NonSerialized]`, hidden from the type picker) |
| custom | derive `RangeStateSelector`, override `protected internal bool Matches(in RangeSignalReader signals)` | if serializable |

## 5. Signals (`RangeSignals`, each a `RangeSignal<T>`)

Ids starting `unitext.` are reserved: `new RangeSignal<T>(id, default)` with such an id throws. Declare your own as `static readonly RangeSignal<bool> Alert = new("game.alert");`.

| Signal | Type | Meaning / who writes it |
|---|---|---|
| `Hovered` | bool | a pointer rests over the entity; router (needs a pointer: not meaningful on touch) |
| `Pressed` | bool | a pointer owns an uncancelled press; router |
| `Focused` | bool | keyboard or gamepad navigation addresses the entity; router |
| `Disabled` | bool | present but rejects interaction; router |
| `LongPressProgress` | float 0..1 | touch/pen hold progress; router |
| `DragProgress` | float 0..1 | gesture progress; router on gesture interactions, also settable |
| `Selected` | bool | document selection includes the entity |
| `Current`, `Visited` | bool | application-defined (you set them) |
| `LoadingProgress`, `VoiceProgress` | float 0..1 | application-defined (you set them) |

Built-in float signals clamp to 0..1; custom ones do not.

## 6. Playbacks

| Playback | Behaviour and defaults | Mobile |
|---|---|---|
| `InstantPlayback` (default) | enter: weight 1; exit: weight 0 and release; a trigger holds one frame | OK |
| `TransitionPlayback` | `EnterDuration` **0.12**, `ExitDuration` **0.10** (≥ 0), `Easing` `CubicOut`, `Clock` `Unscaled`, `AnimateInitialMatch` false (a range already matching when the rule starts snaps in); a trigger pulses (up `EnterDuration`, down `ExitDuration`) | OK for short transitions |
| `SignalProgressPlayback` | weight = `lerpUnclamped(OutputMin, OutputMax, clamp01((v − InputMin)/(InputMax − InputMin)))` of its `Signal` (`BuiltInScalarSignal`); `InputMin 0`, `InputMax 1`, `OutputMin 0`, `OutputMax 1`, `SampleOnEnter` true, `EnterWeight` 1, `ExitDuration` 0, `ExitEasing` `CubicOut`, `ExitClock` `Unscaled` | OK |
| `ManualPlayback` | does nothing by itself: an external tween/Animator/code owns the values (see §9) | OK |

Custom playbacks override `Enter`, `Exit` and optionally `Trigger`, `Update`, `Cancel`, and drive the weight through `RangeRuleInstance.SetWeight`/`TransitionTo...` (host interface `IPlaybackHost`).

Cost: an active transition rewrites a mesh-side parameter such as `Tint` every frame for its duration (0.1–0.3 s typical) and rebuilds the mesh — OK. Many entities animating at once on a long text — LIMIT. A rule that drives a layout parameter (size, spacing) re-lays out every frame through the same parameter path as driver clips — AVOID on long text. `PlaybackClock.Manual` transitions advance only through `UniTextRanges.AdvanceManual(dt)`.

## 7. `UniTextRanges` runtime API (one per component)

Get it with `UniTextRanges.For(text)` (creates) or `UniTextRanges.TryGet(text, out ranges)`.

| Member | Purpose |
|---|---|
| `SetSignal<T>(RangeIdentity entity, RangeSignal<T> signal, T value)` | set a signal for one entity (all its fragments) |
| `SetSignal<T>(RangeIdentity entity, RangeSegmentId segment, signal, value)` | one wrapped fragment |
| `SetSignal<T>(RangeChannel channel, signal, value)` | every entity on a channel |
| `SetSignalForAll<T>(signal, value)` | every entity at once |
| `AdvanceManual(float dt)` | tick for `PlaybackClock.Manual` |
| `Own(...)` | take ownership of a parameter of a range (same ownership model as `UniTextDriver` and `RangeQuery.Own`) |
| events `RuleEntered`, `RuleExited`, `RuleUpdated` (signal change without a selector edge), `RuleTriggered` | `delegate void RangeRuleLifecycleHandler(RangeRuleInstance rule, in RangeRuleContext context)` |
| `PrefersReducedMotion` | per-component bool, default false; when true all decorative playbacks complete to their final value. Not wired to the OS accessibility flag; set it yourself from `Accessibility.PrefersReducedMotion`. Reveal and driver ignore it |

`RangeRuleInstance`: `Definition`, `Entity`, `Segment`, `TargetCount`, `GetTarget(i)`, `RepresentativeRange`, `IsAlive`, `Weight` (get/set), `SetWeight`, `Release()`, `GetParameter<TModifier,TValue>(key, descriptor, change = null)`. `RangeRuleContext`: `Signals` (`Get(signal)`), `Interaction`, `PrefersReducedMotion`, `IsInitialEvaluation`. Also `UniTextRangeDebugSnapshot.Capture(text)` for diagnostics.

Listening example (tick sound when a keyword highlight starts); handlers with `in` parameters must be declared methods:

```csharp
// not compiled — checked against public signatures only
private void OnEnable()  { UniTextRanges.For(text).RuleEntered += OnRuleEntered; }
private void OnDisable() { if (UniTextRanges.TryGet(text, out var r)) r.RuleEntered -= OnRuleEntered; }

private void OnRuleEntered(RangeRuleInstance rule, in RangeRuleContext context)
{
    if (!context.IsInitialEvaluation) PlayTick();       // your audio call
}
```

## 8. Package presets as worked examples

`<UniTextRoot>/Defaults/ModifierGraphPresets/LinkPreset.asset` and `SpoilerPreset.asset` show the intended shape.

- **Link**: Composite { Composite { `LinkModifier` (3 rules), 3 × `HighlightModifier` (priority −10, `Tint` transparent, padding (0.1, 0.06) em, corner radius 0.15 em) }, `ColorModifier`, `UnderlineModifier` }. Rule 1: selector `Any { Interaction(Hovered), Interaction(Pressed) }`, `TransitionPlayback` enter 0.18 / exit 0.1, drives highlight 1 `Tint` to opaque. Rule 2: `Interaction(Pressed)`, enter 0 / exit 0.15, drives highlight 2 (denser paint). Rule 3: no selector, `Trigger = Activated`, enter 0 / exit 0.25, drives highlight 3 (click flash). All `Scope = Entity`, `Clock = Unscaled`.
- **Spoiler**: Composite { `SpoilerModifier`, `HighlightModifier` (order `Above`, the cover) }; selector `SpoilerConcealedRangeStateSelector`, enter 0.25 / exit 0.18, drives the highlight `Tint` to opaque.

## 9. Worked example A — hover fade on keywords

Goal: `Collect <kw>keys</kw> to open the <kw>gate</kw>.` — a yellow highlight fades in under a keyword on hover (0.12 s) and fades out (0.2 s); a second one answers a press for touch.

### 9.1 Inspector (no code)

1. Component → **Styles** → `+` → **Interactive**. Its source is the auto-detect `@name`/`#tag` rule; edit the source to a **Tag** rule (`kw`) if you want `<kw>…</kw>`. Source and modifier are edited independently. The style's modifier must be a `CompositeModifier` holding the Interactive modifier **and** the modifiers it drives; the picker's **Link** and **Spoiler** entries arrive as ready-made composites you can copy.
2. Inside the composite add a **Highlight** modifier: set the paint (hover colour) and set **Tint** to a transparent colour (alpha 0). It stays in the graph permanently and costs no geometry while transparent.
3. On the **Interactive** modifier → **Rules** → `+`. Selector: *Interaction signals* → Required `Hovered`. Playback: *Parameter transition* (defaults enter 0.12 s, exit 0.10 s, ease CubicOut, clock Unscaled; use exit 0.2 for a gentler fade-out). Scope `Entity`. **Changes** → `+` → target *Highlight → Tint* → opaque white (any colour; `Replace` moves the highlight's `Tint` from transparent to this colour).
4. Optional second change in the same rule (shared playback): colour the text itself by adding a fill/colour sibling and changing its `Tint`.
5. Add a second rule with selector `Pressed` (and a second highlight) for touch feedback. Hover does not exist on touch screens.

### 9.2 Code only

```csharp
// not compiled — checked against public signatures only
using LightSide;
using UnityEngine;

public static class KeywordStyle
{
    public static void Install(UniTextBase text)
    {
        var hover = MakeHighlight(new Color32(255, 210, 64, 90));
        var press = MakeHighlight(new Color32(255, 210, 64, 170));

        var keyword = new InteractiveModifier();
        keyword.Rules.ReplaceAll(new[]
        {
            MakeRule(InteractionSignalMask.Hovered, hover, 0.12f, 0.20f),
            MakeRule(InteractionSignalMask.Pressed, press, 0f, 0.20f),
        });

        var graph = new CompositeModifier();
        graph.Modifiers.ReplaceAll(new BaseModifier[] { keyword, hover, press });   // WHOLE graph first
        text.Styles.Add(Style.Tag(graph, "kw"));                                    // then the style
        text.Text = "Collect <kw>keys</kw> to open the <kw>gate</kw>.";
    }

    private static HighlightModifier MakeHighlight(Color32 color) => new()
    {
        Paint = PaintRef.Solid(color),
        GeometryMapping = GeometryMapping.Range,
        Height = RangeHeight.Content,
        Padding = new UnitVector2(new Vector2(0.1f, 0.04f), UnitKind.Em),
        CornerRadius = UnitValue.Em(0.2f),
        Priority = RangeDecorationPriorities.Interactive,
        Tint = new Color32(255, 255, 255, 0),            // permanently present, transparent
    };

    private static RangeStateRule MakeRule(InteractionSignalMask signal, HighlightModifier target,
        float enter, float exit)
    {
        var change = new ParameterChange();
        change.SetTarget(target, HighlightModifier.Param.Tint, new Color32(255, 255, 255, 255));
        var rule = new RangeStateRule
        {
            Selector = new InteractionRangeStateSelector { Required = signal },
            Playback = new TransitionPlayback { EnterDuration = enter, ExitDuration = exit },
        };
        rule.Changes.Add(change);
        return rule;
    }
}
```

Order matters: the target (`hover`, `press`) must already be a node of the same graph when the rule registers, and each instance appears once. Pointer events need an `EventSystem` and a raycastable text (`raycastTarget` on Canvas text); world text needs `WorldPointerRaycaster` on the camera (see `unitext-interaction-links.md`).

## 10. Worked example B — custom signal, code only

Goal: keywords flash red while the game raises an alert.

```csharp
// not compiled — checked against public signatures only
using System.Collections.Generic;
using LightSide;
using UnityEngine;

public sealed class AlertKeywords : MonoBehaviour
{
    private static readonly RangeSignal<bool> Alert = new("game.alert");   // id must not start with "unitext."

    [SerializeField] private UniTextBase text;
    private InteractiveModifier keyword;
    private readonly List<ModifierRange> ranges = new();

    private void Awake()
    {
        var flash = new HighlightModifier
        {
            Paint = PaintRef.Solid(new Color32(255, 64, 64, 160)),
            GeometryMapping = GeometryMapping.Range,
            Height = RangeHeight.Content,
            Priority = RangeDecorationPriorities.Interactive,
            Tint = new Color32(255, 255, 255, 0),
        };
        var change = new ParameterChange();
        change.SetTarget(flash, HighlightModifier.Param.Tint, new Color32(255, 255, 255, 255));
        var rule = new RangeStateRule
        {
            Selector = new RangeSignalSelector<bool>(Alert, on => on),     // code-only: rebuild at runtime
            Playback = new TransitionPlayback { EnterDuration = 0.15f, ExitDuration = 0.4f },
        };
        rule.Changes.Add(change);

        keyword = new InteractiveModifier();
        keyword.Rules.Add(rule);
        var graph = new CompositeModifier();
        graph.Modifiers.ReplaceAll(new BaseModifier[] { keyword, flash });
        text.Styles.Add(Style.Tag(graph, "kw"));
    }

    public void SetAlert(bool on)                       // call after the text has parsed
    {
        ranges.Clear();
        keyword.GetRanges(ranges);                      // text order; empty before the first parse
        var runtime = UniTextRanges.For(text);
        for (var i = 0; i < ranges.Count; i++)
            runtime.SetSignal(ranges[i].Identity, Alert, on);             // entity-scoped; false releases
        // or for every entity at once: runtime.SetSignalForAll(Alert, on);
    }
}
```

Notes: the `(entity, segment, ...)` overload targets one wrapped fragment; `SetSignal(RangeChannel, ...)` targets every entity on a channel. Built-in scalar signals (`LongPressProgress`, `LoadingProgress`, `DragProgress`, `VoiceProgress`) can be selected in the inspector with `ScalarRangeStateSelector`; project-defined signals need a code selector, which is not saved with a scene or prefab. For a karaoke highlight drive `RangeSignals.VoiceProgress` with `ScalarRangeStateSelector` + `SignalProgressPlayback`.

### 10.1 Hold-to-confirm fill (inspector)

Selector: `ScalarRangeStateSelector` (`LongPressProgress`, `Greater`, threshold 0). Playback: `SignalProgressPlayback` on `LongPressProgress` (weight follows the hold 0→1). Change: highlight `Tint` → opaque. Result: the highlight fills as the finger holds and drains on release over `ExitDuration` (default 0 = it clears instantly). Pair it with the `ContextRequested` trigger if the long press should also open a menu.

### 10.2 Manual timing

`Playback = new ManualPlayback()` plus a `Changes` target. Obtain the rule instance in `UniTextRanges.RuleEntered`, then call `rule.GetParameter(key, HighlightModifier.Param.Tint, change)` to get an `OwnedParameter<T>`, set `Value` per frame and `rule.Release()` when done. For a manual clock on a `TransitionPlayback`, call `AdvanceManual(dt)` every frame.

## 11. Pitfalls

1. A rule can only drive modifiers of its own graph; each instance once. Breaking this throws `InvalidOperationException` at registration (`Modifier node '…' is not a unique target in this graph.`). Build the full graph before `Styles.Add`.
2. Rules live only on `InteractiveModifierBase`. `Selector` may be null only with a `Trigger`; `Playback` is mandatory; `SignalProgressPlayback` needs `InputMin ≠ InputMax`.
3. Keep the animated decoration permanently in the composite with an alpha-0 `Tint` and target an opaque `Tint`. Temporary "modifier templates" no longer exist.
4. Hover is not a touch concept: use `Pressed`, `Focused` or `LongPressProgress` for mobile feedback; `Hovered` needs a pointer.
5. `TransitionPlayback.AnimateInitialMatch` is false: a range already matching when the rule first evaluates snaps to the target instead of animating in.
6. `Scope = Entity` (default): a wrapped multi-line range is one playback; use `Segment` for per-fragment feedback.
7. `RangeSignalSelector<T>` is not serializable (rebuild it at runtime); `unitext.`-prefixed ids are reserved; built-in float signals clamp to 0..1; custom ones do not.
8. `SetSignal` needs a valid `RangeIdentity`: ranges exist only after a parse, and a range's identity retires when text inside it is edited.
9. Rules, driver clips and owned values on one parameter compose by `Composition`; with `Replace` the highest `Priority` wins. Do not mix control surfaces on one parameter without priorities.
10. `PrefersReducedMotion` is per-component, off by default and not wired to the OS flag.
11. `TransitionPlayback.Clock` defaults to `Unscaled` (animates at `timeScale 0`); the driver defaults to `Scaled`.
12. No pointer events means no signals: Canvas text needs an `EventSystem` and `raycastTarget`; world text needs `WorldPointerRaycaster`.
13. Renamed API: `RangeStateEffect → RangeStateRule`, `*Driver → *Playback`, `UniTextEffects.For → UniTextRanges.For`, `Effects → Rules` (see `unitext-version-traps.md`).

## Unverified

- Exact inspector clicks to wrap an existing modifier into a `CompositeModifier` (the code in §9.2 is the exact equivalent).
- How user code builds the `ModifierKey<TModifier>` that `RangeRuleInstance.GetParameter` needs for `ManualPlayback` (the creation was not found public).
- Tie-break between equal-priority `Replace` contributions of a rule, a driver clip and an owned value.
- Whether `Hovered` is ever published on touch-only devices (assumed absent).
- Which component writes the `Selected` signal (no writer found in the rule or router code); set it yourself if you depend on it.
- Property names `Signal`, `Comparison`, `Threshold` and `Selectors` on the scalar/all/any selectors are read from field names and usage; compile once before relying on object-initializer syntax.
- No code in this file was executed in Unity; snippets were checked against signatures only.
