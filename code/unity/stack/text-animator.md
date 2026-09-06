---
version: 1.0.0
---

# Text Animator for Unity (Febucci)

> **Scope**: Febucci Text Animator for Unity (v3) — animating TextMesh Pro and UI Toolkit texts with rich-text effect tags, driving the typewriter component from C#, wiring typing events and action tags, and authoring custom effects, actions and typing timings as ScriptableObjects.
> **Load when**: animating text with Text Animator, writing effect tags into dialogue or UI strings, showing text through a typewriter, skipping or pausing typing, reacting to per-character or message events, authoring custom text effects or typewriter actions, debugging text that renders tags literally or refuses to animate.

---

## Version & Assemblies

The project uses **Text Animator v3** (`com.febucci.text-animator-unity`, package under `Packages/`). Runtime data assets (effects, actions, playbacks, curves, settings) live in `Assets/Plugins/Febucci/Text Animator for Unity/` — treat that folder as read-only third-party content, but its `.asset` files are the authoritative list of available tags.

- Minimum Unity for the package is **2022.3**; the UI Toolkit path additionally requires **6000.3+**.
- **v3 is not source-compatible with v2.** Ignore any snippet using `Febucci.UI`, `Febucci.UI.Core`, `Febucci.UI.Effects`, `TAnimCore`, `TAnimPlayer`, `TextAnimator` (as a component), `TypewriterByCharacter`, or `BehaviorSineBase` — those are v2. Online tutorials, the `api.febucci.com` reference site, and even some current doc snippets still show them.
- Correct v3 namespaces:
  - `Febucci.TextAnimatorForUnity` — `TextAnimatorComponentBase`, `TypewriterComponent`, `AnimatedLabel`, timings scriptables.
  - `Febucci.TextAnimatorForUnity.TextMeshPro` — `TextAnimator_TMP`.
  - `Febucci.TextAnimatorForUnity.Actions` — action base classes.
  - `Febucci.TextAnimatorCore.Typing` — `EventMarker`, `ActionMarker`, `IActionState`, `ActionStatus`, `TypingInfo`.
  - `Febucci.TextAnimatorCore.Text` — `CharacterData`.
  - `Febucci.TextAnimatorCore` — `IEffectState`, `ManagedEffectContext`, `TextAnimator` (the engine class, not a component).

### Assembly definition references

Package assemblies are `autoReferenced`, so `Assembly-CSharp` sees them for free — but **every module with its own `.asmdef` must reference them explicitly**:

| Assembly | Needed for |
|----------|------------|
| `Febucci.TextAnimatorForUnity.Runtime` | `TypewriterComponent`, `TextAnimatorComponentBase`, custom actions/effects/timings |
| `Febucci.TextAnimatorForUnity.TMP.Runtime` | `TextAnimator_TMP` |
| `Febucci.TextAnimatorForUnity.UITk.Runtime` | `AnimatedLabel` (Unity 6000.3+) |
| `Febucci.TextAnimatorForUnity.Input.Runtime` | the `waitinput` action |

---

## Core Concepts

- **Two components, two responsibilities.** The *animator* (`TextAnimator_TMP` for TMP, `AnimatedLabel` for UI Toolkit) parses tags and animates vertices. The *typewriter* (`TypewriterComponent`) is optional and only controls **when** each character becomes visible. Both live on the same GameObject; the typewriter finds the animator via `GetComponent`.
- **Three effect categories**, each with its own tag bracket family:
  - **Behaviors** (persistent) — play forever while the character is visible.
  - **Appearances** — play once when a character becomes visible.
  - **Disappearances** — appearances in reverse, played while hiding text.
- **Everything is data.** Effects, actions, playbacks, curves and styles are ScriptableObjects registered in databases. A tag is just a string key (`tagId`) looked up in a database — so adding an effect means creating an asset, not writing an `if`.
- **Global settings are a singleton asset.** `TextAnimatorSettings` must be named exactly that and live in a `Resources` folder; it holds the global effects/actions/playbacks databases, the global stylesheet, and the bracket configuration for each tag category.
- **Per-component settings can be local or shared.** Both `TextAnimatorComponentBase` and `TypewriterComponent` expose `localSettings` plus an optional `sharedSettings` ScriptableObject. **When `sharedSettings` is assigned it wins and `localSettings` is ignored** — do not tune the inspector's local block and wonder why nothing changes.

---

## Setup Rules

- Add `TextAnimator_TMP` next to the `TMP_Text` component; add `TypewriterComponent` on the same GameObject only if you need character-by-character reveal.
- A typewriter **requires a timings asset** (`TypingDelaysByCharacter` or `TypingDelaysByWord`) in its `Timing Settings` field. Without it the typewriter silently misbehaves; the inspector warns `Timings is not set`.
- After importing/upgrading the package, run the Febucci welcome window once (`Tools → Febucci`) so it installs the built-in data. Missing built-in data produces `BuiltIn data not found` and no tag resolves.
- **Databases cannot be edited in Play Mode** — Text Animator caches tags at runtime. Add or rename effects/actions in Edit Mode only.
- Give every custom effect/action asset a **unique, non-empty `tagId`**. Duplicates and empties are reported by the database inspector and the later entry is dropped.

---

## Tag Syntax

Brackets are configured per category in `TextAnimatorSettings` (defaults below and in this project):

| Category | Open | Close one | Close all |
|----------|------|-----------|-----------|
| Behavior (persistent) | `<wave>` | `</wave>` | `</>` |
| Appearance | `{wave}` | `{/wave}` | `{/}` |
| Disappearance | `{#wave}` | `{/#wave}` | `{/#}` |

Rules:

- **Stack freely** — `<shake><wave>text</>` applies both. Closing tags are optional at the end of the string: `<shake>hello` animates to the end of the text.
- **Modifiers (attributes) override an effect's default parameters per tag**, written space-separated inside the opening tag: `<wiggle a=2 s=2>` (the vendor's own sample documents this as "double amplitude and speed"). Each effect declares its own keys — the authoritative list is what its state reads via `RegionParameters.ModifyFloat("<key>", default)`, so check the effect's script or asset rather than assuming `a`/`s`/`f` exist everywhere. A modifier applies only inside its tag region and reverts on close.
- **Modifiers can also be bare flags** with no `=`, e.g. `<cshake instant f=10>`.
- Values are parsed with `CultureInfo.InvariantCulture` — **always write `.` as the decimal separator**, never `,`. A failed parse silently falls back to the asset default instead of erroring.
- Use TMP's `<noparse>…</noparse>` to print a tag literally (e.g. in tutorial or debug text).
- Effect, action and playback tag lookups are **case-insensitive** (ids are lowercased internally), but write ids lowercase anyway — the stylesheet lookup is the one place where casing has bitten people.
- Text Animator tags coexist with TMP rich text (`<color=…>`, `<b>`, `<sprite=…>`); TMP tags are stripped from the animator's character indices, so `MaxVisibleCharacters` counts *visible glyphs*, not raw string length.

### Reserved tag ids

TMP's own rich-text tag names are **rejected as effect tag ids** and logged as `Tag ID 'X' is reserved by Unity rich text…`. The blocked set covers `a, align, allcaps, alpha, b, br, color, cspace, font, font-weight, gradient, i, indent, line-height, line-indent, link, lowercase, margin, margin-left, margin-right, mark, material, mspace, nobr, noparse, page, pos, rotate, s, size, smallcaps, space, sprite, style, sub, sup, u, uppercase, voffset, width`.

This is why the size effect ships as **`incr`** and not `size`. Name custom effects accordingly — a reserved id is silently ignored, so the effect simply never plays. Duplicate ids are also skipped with an `already present… Skipping` warning, and whitespace inside an id is rewritten to `_`.

### Styles

A `StyleSheetScriptable` maps one style tag to an opening/closing tag pair, e.g. `style1` → `<wave><wiggle>` / `</wave></wiggle>`. Assign it globally in `TextAnimatorSettings` or per-component via `StyleSheet` (the setter also schedules a mesh refresh, so it is safe at runtime). **Prefer styles over repeating long tag stacks in every UI string** — one asset edit then retunes every line.

### Default effects

`AnimatorSettings` carries `defaultBehaviorTags`, `defaultAppearanceTags`, `defaultDisappearanceTags` plus `defaultEffectsMode`:

- `DefaultEffectsMode.Fallback` — apply defaults only to characters with no tag of that category (the usual choice).
- `DefaultEffectsMode.Constant` — apply defaults to every character on top of its own tags.

Use a default appearance tag (this project ships `incr`) instead of prefixing every UI string with the same appearance tag.

---

## Built-in Effect Tags

The effects database installed in this project registers 14 tags. Each works in all three categories (`<wave>`, `{wave}`, `{#wave}`) because every effect asset defines an appearance, persistent and disappearance content block.

| Tag | Implementation | Typical use |
|-----|----------------|-------------|
| `wave` | position (directional sine) | idle "alive" text |
| `bounce` | position (bounce curve) | playful emphasis |
| `shake` | random position, index advances with time | impact, cold, fear |
| `wiggle` | random position, index fixed | nervous / comedic |
| `incr` | size / scale | default appearance pop |
| `expand` | expand from a chosen axis or centre | reveal |
| `fade` | colour (alpha) | reveal / secret text |
| `rainb` | rainbow colour cycling | rare / legendary |
| `rot` | rotation (continuous, `loopDegrees`) | confusion |
| `pend` | rotation with a custom pivot | swinging signage |
| `swing` | rotation oscillation | cheerful emphasis |
| `dangle` | shear | limp / tired text |
| `slideh` | shear, horizontal | slide-in reveal |
| `slidev` | shear, vertical | slide-in reveal |

Naming traps: the size effect is **`incr`** (not `size` — reserved), rainbow is **`rainb`** (not `rainbow`), and there is no plain `slide` — only `slideh` / `slidev`.

Effect assets are composed of four swappable parts **per category**: **state params** (amplitude, direction, scale, degrees, pivot…), **phase params** (`charOffset`, `wordOffset`, `speed`), a **curve** (Sine, Linear, Bounce, Hold, Square, Step), and a **playback**. Playbacks are themselves a tagged database — `infinite`, `short`, `loop`, `once`, `external`. Duplicate a built-in asset and retune these instead of writing C# when you only need a new look.

`effectSettings.bakeCurves` defaults to `true` and pre-samples the curve — leave it on unless a curve must be evaluated live.

---

## Typewriter Tags: Actions and Events

Two different mechanisms, easily confused:

- **Actions** pause or steer the typewriter. Plain tag, id looked up in the actions database:
  - `<waitfor=1>` — pause typing for 1 second.
  - `<waitinput>` — pause until the player presses input.
  - `<speed=3>` — multiply typing speed from this point on (`<speed=1>` restores).
- **Events (messages)** notify your code and never block. Prefix with `?`:
  - `<?face=1>`, `<?crate=0>` — delivered to `onMessage` as an `EventMarker` with `name` and `string[] parameters`.

```csharp
using Febucci.TextAnimatorCore.Typing;
using Febucci.TextAnimatorForUnity;
using UnityEngine;

public sealed class DialogueEventRouter : MonoBehaviour
{
    [SerializeField] private TypewriterComponent _typewriter;

    private void OnEnable() => _typewriter.onMessage.AddListener(OnMessage);
    private void OnDisable() => _typewriter.onMessage.RemoveListener(OnMessage);

    private void OnMessage(EventMarker marker)
    {
        switch (marker.name)
        {
            case "face":
                if (marker.parameters.Length > 0 && int.TryParse(marker.parameters[0], out int faceIndex))
                    SetPortrait(faceIndex);
                break;
            case "shake":
                ShakeCamera();
                break;
        }
    }
}
```

Always guard `marker.parameters.Length` before indexing — a mistyped tag in writer-authored text must not throw. `Febucci.Parsing.FormatUtils.TryGetFloat(parameter, fallback, out float value)` is the package's own helper for parsing marker parameters safely.

---

## C# API — Setting Text

**Never assign `TMP_Text.text` (or `SetText`) on a text that has a Text Animator component.** The animator would not re-parse the string, so tags render literally and effects stop. Route text through Text Animator instead:

```csharp
using Febucci.TextAnimatorForUnity;
using Febucci.TextAnimatorForUnity.TextMeshPro;
using UnityEngine;

public sealed class ScoreLabel : MonoBehaviour
{
    [SerializeField] private TextAnimator_TMP _animator;   // no typewriter — instant text
    [SerializeField] private TypewriterComponent _typewriter; // typewriter — animated reveal

    // Instant: replaces the text and shows it immediately.
    public void SetInstant(string value) => _animator.SetText(value);

    // Replaces the text but keeps it hidden, ready to be revealed later.
    public void Preload(string value) => _animator.SetText(value, hideText: true);

    // Keeps the current visibility state while swapping the string
    // (use for counters that must not replay their appearance effect).
    public void Swap(string value) => _animator.SwapText(value);

    // Appends without restarting what is already on screen.
    public void Append(string value) => _animator.AppendText(value);

    // With a typewriter: this is the entry point — it sets the text AND starts typing
    // (depending on StartTypewriterMode).
    public void Say(string value) => _typewriter.ShowText(value);
}
```

Rules:

- With a `TypewriterComponent` present, prefer `typewriter.ShowText(text)` over `animator.SetText(text)` — `ShowText` re-parses action/event tags and drives the reveal.
- **`ShowText` only starts typing when `startTypewriterMode` includes `OnShowText`.** With `FromScriptOnly`, the correct order is `ShowText(line)` **then** `StartShowingText()`. Text that appears fully but never types is almost always this.
- `SwapText` is the right call for values that change every frame or on every hit (counters, timers): it preserves visibility and does not re-trigger appearance effects.
- **Never call `TMP_Text.ForceMeshUpdate()`** on an animated label — Text Animator loses its mesh references and letters stop rendering. Use `animator.ScheduleMeshRefresh()`.
- Text from an external source (localization tables, dialogue databases, network payloads) has **no built-in hook** — resolve the string yourself and feed it to `SetText` / `ShowText`, and re-feed it whenever the source changes.
- Clear pooled text objects with `SetText(string.Empty)` before deactivating so the next spawn starts clean.

---

## C# API — Typewriter Control

```csharp
_typewriter.ShowText(line);              // set text (+ start typing per StartTypewriterMode)
_typewriter.StartShowingText();          // resume where it stopped
_typewriter.StartShowingText(restart: true); // restart from character 0
_typewriter.StopShowingText();           // pause, leave text as-is
_typewriter.SkipTypewriter();            // reveal everything now (also skips a running hide)

_typewriter.StartDisappearingText();     // animate the text away
_typewriter.StopDisappearingText();

_typewriter.SetTypewriterSpeed(2f);      // runtime speed multiplier

bool typing  = _typewriter.IsShowingText;
bool hiding  = _typewriter.IsHidingText;
float approx = _typewriter.GetApproximateShowDuration(); // sum of per-character waits only
```

- `SetTypewriterSpeed(v)` is a **divisor on wait time**: at `2` a 1-second wait becomes 0.5 s. `resetTypingSpeedAtStartup` decides whether it resets on each new text.
- `SkipTypewriter()` skips whichever pass is running; **if the text is both revealing and hiding, hiding wins**.
- `GetApproximateShowDuration()` / `GetApproximateHideDuration()` ignore action tags, callbacks and effect durations — use them for pacing heuristics, never as a precise "text is done" timer. For completion, subscribe to `onTextShowed`.

### Events

| Event | Payload | Fires |
|-------|---------|-------|
| `onTypewriterStart` | — | just before the first character (only when the typewriter is enabled) |
| `onCharacterVisible` | `CharacterData` | every time a character is revealed |
| `onCharacterWaitStarted` / `onCharacterWaitFinished` | `CharacterData` | around each per-character wait |
| `onMessage` | `EventMarker` | on every `<?tag>` |
| `onTextShowed` | — | all characters shown |
| `onTextDisappeared` | — | all characters hidden |

These are `UnityEvent`s. **Add listeners in `OnEnable` and remove them in `OnDisable`** (or `Awake`/`OnDestroy` for one-shot wiring) — a pooled dialogue box that only adds listeners leaks duplicate callbacks.

`onTextShowed` fires as soon as the last character is *revealed*; set `triggerShowedAfterEffectsEnd` if you must wait for its appearance effect to finish too.

### Skipping

`SkipTypewriter()` behaviour is governed by typewriter settings:

- `hideAppearancesOnSkip` — skip appearance effects instead of playing them all at once.
- `triggerEventsOnSkip` — fire every pending `<?tag>` when skipping. **Leave this on for dialogue**, otherwise portraits/sounds bound to late events are lost when the player mashes skip. `TriggerRemainingEvents()` / `TriggerVisibleEvents()` do the same manually.

---

## C# API — Manual Visibility

For fully custom reveals (no typewriter), drive the animator directly:

```csharp
_animator.SetText(text, hideText: true);
_animator.SetVisibilityChar(index, isVisible: true);        // plays the appearance effect
_animator.SetVisibilityWord(wordIndex, isVisible: true);
_animator.SetVisibilityEntireText(true, canPlayEffects: false); // reveal with no effects

_animator.FirstVisibleCharacter = 0;
_animator.MaxVisibleCharacters = n;      // window clamp; a character still needs its own visible flag

bool done = _animator.allLettersShown;   // includes waiting for appearance effects
bool any  = _animator.anyLetterVisible;  // false once all disappearances finished
```

`FirstVisibleCharacter` / `MaxVisibleCharacters` only clamp the allowed range — a character also needs `SetVisibilityChar(i, true)`. Setting the range alone and expecting text to appear is a common mistake.

**`Characters` and `Words` are pooled buffers that can be longer than the real content** — always iterate to `CharactersCount` / `WordsCount`, never to `.Length`.

For a progressive reveal driven by your own logic, set the full string **once** and then move `MaxVisibleCharacters`. Re-assigning the text every frame forces both a TMP mesh rebuild and a full Text Animator re-parse.

---

## Configuration

### Animator settings (`AnimatorSettings`)

| Field | Meaning |
|-------|---------|
| `useDynamicScaling` / `referenceFontSize` | keeps effect amplitude consistent across font sizes and resolutions — **keep enabled**, tune `referenceFontSize` to the size you authored against |
| `timeScale` | `Scaled` / `Unscaled` — use `Unscaled` for text that must animate while the game is paused |
| `isResettingTimeOnNewText` | restart effect time on each new text |
| `defaultEffectsMode`, `default*Tags` | see "Default effects" above |
| `isAnimatingBehaviors` / `Appearances` / `Disappearances` | category master switches (also `SetBehaviorsActive` / `SetAppearancesActive` at runtime) |

`animationLoop` (on the component, not the settings) selects `Update`, `LateUpdate`, or `Script`. With `Script` nothing animates until you call `animator.Animate(deltaTime)` yourself — use it to batch text updates into your own loop or to freeze a specific label.

### Typewriter settings (`TypewriterSettings`)

| Field | Meaning |
|-------|---------|
| `useTypeWriter` | master switch — when off, most other options are ignored |
| `startTypewriterMode` | flags: `FromScriptOnly`, `OnEnable`, `OnShowText`, `AutomaticallyFromAllEvents`. Use `FromScriptOnly` when a dialogue system owns the pacing |
| `hideAppearancesOnSkip`, `hideDisappearancesOnSkip`, `triggerEventsOnSkip` | skip behaviour |
| `disappearanceOrientation` | `SameAsTypewriter`, `Inverted`, `Random` |
| `triggerShowedAfterEffectsEnd`, `triggerDisappearedAfterEffectsEnd` | wait for the last character's effect before firing the event |
| `resetTypingSpeedAtStartup` | reset the `<speed=…>` multiplier on each new text |

### Timings

`TypingDelaysByCharacter` (per-character) exposes `waitForNormalChars`, `waitLong` (`! ? .`), `waitMiddle` (`; : ) - ,`), `avoidMultiplePunctuationWait`, `waitForNewLines`, `waitForLastCharacter`, `skipLastPunctuationWait`, a punctuation whitelist for abbreviations (`Dr.`, `Mr.`), and separate disappearance timing. `TypingDelaysByWord` reveals whole words instead.

`TimingSettings` is settable at runtime, so a "fast text" accessibility option is a single asset swap:

```csharp
_typewriter.TimingSettings = _fastTimings;
```

---

## Custom Effects (C#)

Implement a `struct` state plus a ScriptableObject wrapper. The state reads tag modifiers in `UpdateParameters` and mutates the character in `Apply`.

```csharp
using Febucci.Parsing;
using Febucci.TextAnimatorCore;
using Febucci.TextAnimatorCore.Text;
using Febucci.TextAnimatorForUnity;
using Febucci.TextAnimatorForUnity.Effects;
using UnityEngine;

[System.Serializable]
public class HeatParameters
{
    public float amount = 1.5f;
}

public struct HeatState : IEffectState
{
    private readonly float _defaultAmount;
    private float _amount;

    public HeatState(HeatParameters data)
    {
        _defaultAmount = data.amount;
        _amount = data.amount;
    }

    // Called when the tag is parsed — "a" is the modifier key: <heat a=3>
    public void UpdateParameters(RegionParameters parameters)
        => _amount = parameters.ModifyFloat("a", _defaultAmount);

    public void Apply(ref CharacterData character, in ManagedEffectContext context)
    {
        // progressionRange is the curve result in [-1,1]; intensity fades the effect in/out
        float saturation = (context.progressionRange * 0.5f + 0.5f) * _amount * context.intensity;
        character.SetColor(Color.HSVToRGB(0.05f, Mathf.Clamp01(saturation), 1f));
    }
}

[CreateAssetMenu(menuName = ScriptablePaths.EFFECT_STATES_SPECIAL + "Heat", fileName = "HeatEffect")]
public sealed class HeatScriptable : ManagedEffectScriptable<HeatState, HeatParameters>
{
    protected override HeatState CreateState(HeatParameters parameters) => new HeatState(parameters);
}
```

Then set the asset's `tagId` and add it to the effects database (global, or the component's `DatabaseEffects`).

- `CharacterData` exposes `SetColor`, `SetPosition` and `GetCenter` — colour and position are the building blocks for custom effects.
- **Duplicate a built-in effect asset instead of writing C#** when you only need a different curve, playback, amplitude or direction. Write C# only for behaviour the four composable parts cannot express.
- Keep the state a **`struct`** and keep `Apply` allocation-free — it runs per character per frame.
- Read `context.progressionRange` (`-1..1`) for symmetric motion, `context.progression01` (`0..1`) for one-directional motion, and multiply by `context.intensity` so appearance/disappearance fades still work.
- After changing preset defaults from the editor, call `animator.ForceDatabaseRefresh()` (or `RefreshAllEffectStates` on the engine) to see the change without re-entering Play Mode.

---

## Custom Typewriter Actions (C#)

Two authoring routes, both implementing `ITypewriterAction`:

- `TypewriterActionScriptable` — a ScriptableObject asset added to an actions database. Preferred: stateless, reusable, no scene wiring.
- `TypewriterActionComponent` — a MonoBehaviour on the typewriter's GameObject. Use only when the action needs scene references. Its `makeAvailableGlobally` flag registers it in a global database while enabled.

Stateless pattern (the typewriter blocks while the state returns `Running`):

```csharp
using Febucci.TextAnimatorCore.Typing;
using Febucci.TextAnimatorForUnity;
using Febucci.TextAnimatorForUnity.Actions;
using UnityEngine;

public struct CameraShakeState : IActionState
{
    private float _timeLeft;

    public CameraShakeState(float duration) => _timeLeft = duration;

    public ActionStatus Progress(float deltaTime, ref TypingInfo typingInfo)
    {
        _timeLeft -= deltaTime;
        return _timeLeft > 0f ? ActionStatus.Running : ActionStatus.Finished;
    }

    public void Cancel() => _timeLeft = 0f;
}

[CreateAssetMenu(menuName = ScriptablePaths.ACTIONS_PATH + "Camera Shake", fileName = "CameraShakeAction")]
public sealed class CameraShakeAction : TypewriterActionScriptable
{
    [SerializeField] private float _defaultDuration = 0.3f;

    protected override IActionState CreateCustomState(ActionMarker marker, object typewriter)
    {
        float duration = _defaultDuration;
        if (marker.parameters.Length > 0)
            float.TryParse(marker.parameters[0], System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out duration);

        return new CameraShakeState(duration);
    }
}
```

- Parse tag parameters with `CultureInfo.InvariantCulture` — the built-in actions do, and a comma-decimal locale otherwise breaks `<waitfor=1.5>`.
- Prefer the stateless pattern over the coroutine override (`PerformAction`) — coroutines need a live MonoBehaviour runner and die with it.
- An action that never returns `Finished` **hangs the typewriter forever**. Always give waits a timeout or a `Cancel` path.
- Actions resolve local-first: the typewriter's own components, then the global component database, then the stateless asset database. A local component silently shadows an asset with the same `tagId`.

---

## Custom Typing Timings (C#)

Subclass `TypingsTimingsScriptableBase` when per-character pacing is game logic rather than a tuning value:

```csharp
using Febucci.TextAnimatorCore;
using Febucci.TextAnimatorCore.Text;
using Febucci.TextAnimatorForUnity;
using UnityEngine;

[CreateAssetMenu(fileName = "RobotTypingWaits")]
public sealed class RobotTypingWaits : TypingsTimingsScriptableBase
{
    [SerializeField] private float _delay = 0.05f;

    public override float GetWaitAppearanceTimeOf(CharacterData character, TextAnimator animator)
        => char.IsWhiteSpace(character.info.character) ? 0f : _delay;
}
```

This is the supported extension point for "different wait times per character" — do **not** override `TypewriterComponent.OnBeforeShowingCharacter` for that. Those hooks exist to *block* the typewriter on external game state (a cutscene, a loading step), not to compute delays.

---

## UI Toolkit

`AnimatedLabel` is a `[UxmlElement]` available **only on Unity 6000.3+** (the whole file is `#if UNITY_6000_3_OR_NEWER`). Drag it from *Custom Controls → Febucci* in the UI Builder.

- UXML attributes: `EnableInEditMode` (animate outside Play Mode, default off) and `IsGeometryUpdated` (default on).
- It animates on a **fixed 60 Hz scheduler**, not per frame — do not expect frame-locked motion or `Time.deltaTime` parity with the TMP path.
- Its mesh buffers grow by doubling; churning very long strings reallocates.

Everything else — tags, typewriter, actions, events — works the same as on the TMP path.

---

## Diagnostics

When text does not animate, walk this list before debugging anything else:

1. **Text was set on TMP directly.** The single most common cause. Route through `SetText` / `ShowText`.
2. **UGUI label with no Canvas ancestor.** `TextAnimator_TMP` refuses to animate a `TextMeshProUGUI` until `tmpComponent.canvas` is non-null — hits pooled UI created before reparenting, and prefabs instantiated outside a Canvas.
3. **Global settings missing.** `TextAnimatorSettings` is loaded via `Resources.Load` and *can* return null. It must be named exactly `TextAnimatorSettings` and sit in a `Resources/` folder; without it no database resolves and every tag is inert.
4. **Tag id is reserved, duplicated, or empty** — see "Reserved tag ids".
5. **Typewriter has no timings asset**, or `useTypeWriter` is off, or `startTypewriterMode` never fires (see the `ShowText` / `StartShowingText` rule).
6. **`sharedSettings` is assigned** and silently overriding the `localSettings` you were editing.
7. Enable the scripting define **`FEBUCCI_TEXT_ANIMATOR_DEBUG`** to turn on the package's internal `Logger.Debug` output — it is `[Conditional]` and compiled out otherwise.

Two editor-only notes: `RefreshAllEffectStates` (context menu) only works in Play Mode, and the `m_EditorClassIdentifier` strings inside this project's Febucci `.asset` files still name v2 types (`Febucci.UI.Effects.*`) — that is stale serialized metadata, not the runtime class. Never infer type identity from it.

---

## Performance

- Effects animate vertices every frame per visible character. On mobile, budget the number of simultaneously animated labels; a screen full of `<rainb><wave><shake>` text is a real cost.
- Prefer `animationLoop = Script` (and stop calling `Animate`) or `SetBehaviorsActive(false)` for labels that are on screen but should not animate, instead of leaving dozens of idle animators in `Update`. `TextAnimatorSettings.SetEffectsActive(false)` is the global kill switch (a "reduce motion" accessibility toggle).
- Pool text objects rather than instantiating them: `SetText(string.Empty)` on release, `SetText(value)` on acquire. Recreating TMP + animator objects per damage number is the expensive path.
- Keep `useDynamicScaling` on so amplitudes stay correct across resolutions instead of authoring per-device values.
- Effect states are structs applied per character per frame — never allocate, box, or call `GetComponent` inside `Apply`.
- `ScheduleMeshRefresh()` marks a refresh for the next animation pass; it is the cheap way to react to external mesh changes. Avoid forcing full re-parses (`SetText` with the same string) every frame.

---

## Anti-patterns

- **Never set `TMP_Text.text` / `TMP_Text.SetText()` on an animated label.** Tags will show up literally and effects will stop. Use `TextAnimator_TMP.SetText` / `TypewriterComponent.ShowText`.
- **Never call `SetText` every frame for a changing counter** — use `SwapText`, which keeps visibility and skips replaying appearance effects. For a progressive reveal, set the string once and move `MaxVisibleCharacters`.
- **Never call `TMP_Text.ForceMeshUpdate()`** on an animated label — use `ScheduleMeshRefresh()`.
- **Never name a custom effect after a TMP rich-text tag** (`size`, `color`, `rotate`, `space`, …) — the id is reserved and the effect silently never plays.
- **Never write tag numbers with a comma decimal separator** (`<waitfor=1,5>`) — parsing is invariant-culture and falls back to the asset default without an error.
- **Never copy v2 code.** `Febucci.UI`, `TAnimPlayer`, `TypewriterByCharacter`, `ShowAllCharacters`, `UpdateEffects`, `ForceMeshRefresh`, `ResetEffectsTime` are legacy/obsolete; the v3 equivalents are `Febucci.TextAnimatorForUnity`, `TextAnimator_TMP`, `TypewriterComponent`, `SetVisibilityEntireText`, `Animate`, `ScheduleMeshRefresh`, `time.RestartTime()`.
- **Never add/rename database entries in Play Mode** — tags are cached at startup and the change is silently ignored.
- **Never leave a typewriter without a timings asset**, and never leave `sharedSettings` assigned while tuning `localSettings` — the shared asset overrides it entirely.
- **Never write an action state that can return `Running` forever** without a timeout — it deadlocks the typewriter.
- **Never trust `GetApproximateShowDuration()` as a completion signal** — it ignores actions and effects. Use `onTextShowed`.
- **Don't forget `triggerEventsOnSkip`** (or a manual `TriggerRemainingEvents()`), or skipping a line silently drops its portrait/sound/camera events.
- **Don't hardcode long tag stacks into every string** — put them in a stylesheet or in the default tags so designers can retune them in one place.
- **Don't index `EventMarker.parameters` / `ActionMarker.parameters` without a length check** — a typo in a writer-authored string must not throw at runtime.
- **Don't reference Text Animator types from a module `.asmdef` without adding the assembly reference** — the package is `autoReferenced`, so it compiles in `Assembly-CSharp` and then fails in your module.

---

## Source Map

| Source | Used for |
|--------|----------|
| `Packages/com.febucci.text-animator-unity/Scripts/Runtime/**` (v3.14.2 C# sources) | component/API surface, settings fields, custom effect / action / timings authoring patterns, obsolete-member list |
| `Packages/com.febucci.text-animator-unity/Libraries/Runtime/Febucci.TextAnimatorCore.xml` | engine API semantics (`TextAnimator`, `TypewriterCore`, enums, effect contexts) |
| `Packages/com.febucci.text-animator-unity/Samples~/**` | canonical usage patterns, tag syntax examples, pooling and event-routing patterns |
| `Assets/Plugins/Febucci/Text Animator for Unity/**` (`.asset` data) | installed effect/action/playback/curve tag ids, default settings values, bracket configuration |
| `Packages/com.febucci.text-animator-unity/Scripts/Runtime/Parsing/**` | reserved tag ids, database case-handling, duplicate/empty tag behaviour |
| https://docs.febucci.com/text-animator-unity/ (via the Context7 index and web-search snippets — the site blocks direct fetches) | tag bracket families and close-all syntax, dynamic scaling guidance, troubleshooting list, custom-effect recommendations |
