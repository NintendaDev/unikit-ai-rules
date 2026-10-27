# Unity CLI — Animation clips, Animator controllers, Timeline
> See also: [unity-cli-assets-import.md](unity-cli-assets-import.md), [unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md), [unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md), [unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md)

Written against Unity CLI 1.0.0-beta.14 and com.unity.pipeline 0.9.1-exp.1; the live catalog (`unity command --query <term> --format json`) outranks this page.

---

## Goal -> command

Run as `unity command <group> <verb> [--param value]`. The group is ONE token with a dot: `animation.clip create` runs, `animation clip create` is Command Not Found. `unity command animation` lists the three subgroups. Asset paths are relative to the authoring root (default `Assets`; the `Assets/` prefix is optional). Base rules (JSON output, `--project-path`, exit codes): [../unity-cli.md](../unity-cli.md).

| Goal | Command (parameters) |
|---|---|
| New clip | `animation.clip create` (`path` .anim, `frameRate`=60, `loop`, `confirm`, `dry_run`) |
| Add or replace one float curve | `animation.clip set_curve` (`clip`, `path`, `type`, `property`, `keys`, `dry_run`) |
| Read clip + curves | `animation.clip get` (`clip`, `includeKeys`) |
| Drop a curve | `animation.clip remove_curve` (`clip`, `path`, `type`, `property`, `confirm`, `dry_run`) |
| New controller | `animation.animator create_controller` (`path` .controller) |
| Parameter / layer | `animation.animator add_parameter` (`controller`, `name`, `type` Float\|Int\|Bool\|Trigger, `defaultValue`) / `add_layer` (`name`, `weight`, `blendingMode` Override\|Additive) |
| State / transition | `animation.animator add_state` (`layer`, `name`, `motion`, `isDefault`) / `add_transition` (`fromState`, `toState`, `conditions`, `hasExitTime`, `exitTime`, `duration`, `hasFixedDuration`) |
| Read controller | `animation.animator get_controller` (`controller`) |
| Timeline asset | `animation.timeline create` (`path` .playable, `frameRate`) -> `add_track` (`timeline`, `trackType`, `name`, `parentTrack`) -> `add_clip` (`track`, `start`, `duration`, `asset`) -> `get` |

No command exists for: clip events, blend tree creation, avatar masks, override controllers, sprite-swap (object reference) curves, Timeline marker/signal content, Timeline track bindings to scene objects, root-motion or humanoid settings. Do these with a builder script ([unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md)). Attaching a controller or a Timeline to a scene object also needs `component add` and `component set_field` (see the end).

Shell note: `--keys`, `--conditions`, `--args` and object-valued `--value` are JSON. Git Bash: wrap in single quotes. PowerShell 5.1: single quotes AND `\"` for every inner double quote ([quoting rules](unity-cli-scripts-compile-eval.md#quoting-c-and-json-on-windows)).

## Case 1 - an AnimationClip with curves

**When:** move, rotate, scale, fade or toggle something over time with plain float curves.

```bash
unity command animation.clip create --path Anim/Spin.anim --frameRate 60 --loop true
# 0 -> 360 degrees about Z in 1 s. Tangents set to the slope (360/s) = linear motion.
unity command animation.clip set_curve --clip Anim/Spin.anim --type Transform \
  --property localEulerAnglesRaw.z \
  --keys '[{"time":0,"value":0,"inTangent":360,"outTangent":360},{"time":1,"value":360,"inTangent":360,"outTangent":360}]'
unity command animation.clip get --clip Anim/Spin.anim --includeKeys true
```

- `path` on `set_curve` is the child path under the animated root (empty = the root itself); `type` is a component type ("Transform", "RectTransform", "UnityEngine.Light"); `property` is the serialized curve name (`m_LocalPosition.x`, `m_LocalScale.y`, `localEulerAnglesRaw.z`; other components use their own serialized names such as `m_Color.a`).
- Re-running `set_curve` for the same binding overwrites it. `remove_curve` is destructive: `--dry_run true` first, then `--confirm true`.
- `loop true` only sets the loop-time flag; for a seamless loop make the last key equal the first.

**Verify:**
1. Read back with `animation.clip get --includeKeys true`: the binding and the key count match what you sent.
2. A readback proves the write, not that the property exists on the target: an unknown property name is accepted and leaves a dead curve, a dry run included (bridge check `anim-1`). Resolve every new binding against the real object with a builder script (`AgentScripts/CurveCheck.cs`, written outside `Assets/`):

```csharp
using UnityEditor;
using UnityEngine;

public static class CurveCheck
{
    // "ok <value>" when the binding resolves on the root, "DEAD binding" otherwise.
    public static string Run(string rootName, string path, string property)
    {
        var root = GameObject.Find(rootName);
        if (root == null) return "root not found";
        var binding = EditorCurveBinding.FloatCurve(path, typeof(Transform), property);
        return AnimationUtility.GetFloatValue(root, binding, out var v) ? "ok " + v : "DEAD binding";
    }
}
```

```bash
unity command script run --file AgentScripts/CurveCheck.cs --entry CurveCheck.Run --args '["Hero","","localEulerAnglesRaw.z"]'
```

**Pitfalls:**
- Omitted tangents are 0 (flat), NOT Unity's Auto mode: two keys without tangents give an ease-in/out S-curve, not a straight line. Pass `inTangent`/`outTangent` equal to (value delta / time delta) for linear motion.
- `create` on an existing path is refused unless `--confirm true`, and then it replaces the whole asset with an empty clip. Pass `confirm` only when replacing is the intent.
- These are asset writes, outside Unity's Undo: Ctrl+Z will not take them back; roll back through version control ([unity-cli-version-control.md](unity-cli-version-control.md)).

## Case 2 - an AnimatorController

**When:** states driven by parameters (idle/run/jump) built from existing clips.

```bash
unity command animation.animator create_controller --path Anim/Hero.controller
unity command animation.animator add_parameter --controller Anim/Hero.controller --name Speed --type Float --defaultValue 0
unity command animation.animator add_state --controller Anim/Hero.controller --name Idle --motion Anim/Idle.anim --isDefault true
unity command animation.animator add_state --controller Anim/Hero.controller --name Run --motion Anim/Run.anim
unity command animation.animator add_transition --controller Anim/Hero.controller \
  --fromState Idle --toState Run --duration 0.1 \
  --conditions '[{"parameter":"Speed","mode":"Greater","threshold":0.1}]'
unity command animation.animator get_controller --controller Anim/Hero.controller
```

- `layer` takes an index or a name (default 0 = Base Layer). `fromState` also accepts `AnyState` / `Entry`; `toState` accepts `Exit`.
- Condition `mode` must fit the parameter type: `If`/`IfNot` for Bool and Trigger, `Greater`/`Less` for Float and Int, `Equals`/`NotEqual` for Int. The command validates states, parameters and the mode/type pair; an invalid one fails, nothing is written.
- Transition defaults: `hasExitTime=false`, `duration=0.25`, `hasFixedDuration=true` (seconds). A transition meant to fire when the source clip ends needs `--hasExitTime true` (and `exitTime`).
- A blend tree cannot be created by these commands; `motion` only accepts an existing clip or BlendTree asset.

**Verify:** `get_controller` returns parameters, layers, states (with motion and default flag) and transitions (with conditions). Check there is exactly one default state, every state has its motion, and each transition lists the intended conditions. Duplicate parameter and unknown layer come back as the codes `duplicate_parameter` and `layer_not_found`. Runtime proof is in the last section.

**Pitfalls:** all writes are asset writes (not undoable, see Case 1). Name the default state explicitly with `--isDefault true` and read it back; do not assume the first state added is the default.

## Case 3 - a Timeline

**When:** a cutscene or sequenced effect. Needs the `com.unity.timeline` package: if `unity command animation.timeline` does not list the commands, or a call fails on the package, add it first ([unity-cli-settings-packages.md](unity-cli-settings-packages.md)).

```bash
unity command animation.timeline create --path Cutscenes/Intro.playable --frameRate 30
unity command animation.timeline add_track --timeline Cutscenes/Intro.playable --trackType Animation --name Hero
unity command animation.timeline add_clip --timeline Cutscenes/Intro.playable --track Hero --start 0 --duration 2 --asset Anim/Spin.anim
unity command animation.timeline get --timeline Cutscenes/Intro.playable
```

- `trackType`: Animation, Audio, Activation, Control, Playable, Signal, Marker. Animation and Audio clips require `asset` (an AnimationClip / AudioClip). `parentTrack` nests under an existing group.
- Always give `--name`: `add_clip` finds its target by track name.

**Verify:** `get` returns frame rate, duration and each track with its clips (start, duration); the duration must cover the last clip end.

**Pitfalls:** a track is not bound to any scene object by these commands, so playback shows nothing until a `PlayableDirector` has the binding (set it in a builder script with `PlayableDirector.SetGenericBinding`). Keep track names unique.

## Attach to a scene object, then prove it plays

```bash
unity command component add --target Hero --type Animator
unity command component set_field --target Hero --component Animator --field m_Controller --value '{"path":"Assets/Anim/Hero.controller"}'
unity command component get_fields --target Hero --component Animator --field m_Controller
```

`m_Controller` is the Animator's serialized name: confirm it with `component get_fields` first. `component add`: [unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md); `component set_field`/`get_fields`: [unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md). Scene edits are blocked in Play Mode, so attach in Edit Mode, then follow the play -> frames advance -> observe order of [unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md). A quote-free probe of the live state (survives both shells):

```bash
unity command script eval 'return UnityEngine.Object.FindFirstObjectByType<UnityEngine.Animator>().GetCurrentAnimatorStateInfo(0).normalizedTime;'
```

Read it twice a second apart: an unchanged value with advancing frames means the state machine is not running (no controller assigned, wrong default state, or a disabled Animator).
