# Unity Biome MCP — Animation

> See also: [unity-biome-mcp-materials-vfx.md](unity-biome-mcp-materials-vfx.md) (particles), [unity-biome-mcp-batch-transactions.md](unity-biome-mcp-batch-transactions.md) (batching and rollback limits), [unity-biome-mcp-runtime-playmode.md](unity-biome-mcp-runtime-playmode.md) (`debug_animator`)

Category gate: `MEDIA` for `animation`, `animator`, `timeline`; `animator_intent` lives in `SYSTEM` and is
direct-only. Written against server and plugin v2.0.0. The three typed tools are batchable; all three can create or
rewrite **asset files**, which `atomic=True` does not roll back.

> Notation: inside tables a literal pipe is written `\|` because of Markdown escaping. The real character is a bare `|`.

---

## Pick the Tool

| Need | Tool | Asset it touches |
|---|---|---|
| Keyframes or events on one object | `animation` | `AnimationClip` under `Assets/Animations/` |
| Parameters, states, transitions, layers, blend trees | `animator` | `AnimatorController` (`Assets/Animations/<object>.controller` when auto-created) |
| Multi-track sequence with bindings | `timeline` | `TimelineAsset` (`.playable`) plus a `PlayableDirector` |
| A first draft from a description | `animator_intent(target, intent, dry_run=True)` | same as `animator`; direct-only, needs sampling |

`path` is always a **scene path** to the animated object (or the `PlayableDirector` object); clips and controllers are
addressed through that object, never by asset path. Asset paths appear only in `asset_path`, `avatar_path`, and the
clip part of `states=` / `clip=`.

## `animation` — Clips and Keys

| Action | Required | Notes |
|---|---|---|
| `get` | `path` (+ `clip`, `time`) | Lists clips and keys; read before every edit |
| `create` | `path`, `clip_name`, `keys` (+ `property`) | `property` defaults to `localPosition`. Saves the clip, adds an `Animator` if missing, assigns a controller containing the clip |
| `edit` / `add_key` | `clip`, `property`, `keys` | **Add** keys to the curve |
| `set_keys` | `clip`, `property`, `keys` | **Replace** the curve with exactly these keys |
| `remove_key` | `clip`, `property`, `keys="t:<time>"` | Removes the key at that time |
| `remove_curve` | `clip`, `property` | Removes the whole binding |
| `set_wrap` | `clip`, `keys="loop\|once\|pingpong\|clamp"` | The value travels in `keys` |
| `set_loop` | `clip`, `keys="true\|false"` | Loop-time flag only |
| `set_framerate` | `clip`, `keys="30"` | |
| `preview` | `clip`, `time` | Samples one instant in the Editor; it does not play the clip |
| `add_event` / `remove_event` / `get_events` | `clip`, `time`, `function_name` (+ `int_param`/`float_param`/`string_param`) | |
| `get_clip_path` | `clip` | Returns the saved asset path for a later tool |

Rules:

- Key syntax is `t:<seconds> v:<value>` entries separated by `;`. A value is a number, a vector `(x,y,z)`, or a color.
  A scalar sub-property such as `localPosition.y` takes scalar values; a whole vector property takes vectors.
- There is no standalone `value` argument on `animation` — the payload is always `keys`.
- `component_type` selects the animated component (default `Transform`; e.g. `Light`, `Camera`).
  `binding_path` targets a child relative to the animated root (`Head/Jaw`).
- `tangent` is `auto` (default), `smooth`, `linear`, or `constant`.
- `create` uses `clip_name`; every later action uses `clip`.

```text
animation(action="create", path="/Door", clip_name="DoorOpen",
          property="localEulerAnglesRaw.y", keys="t:0 v:0; t:0.8 v:95", tangent="smooth")
animation(action="set_keys", path="/Door", clip="DoorOpen",
          property="localEulerAnglesRaw.y", keys="t:0 v:0; t:0.6 v:100; t:0.8 v:95")
animation(action="get", path="/Door", clip="DoorOpen")
animation(action="preview", path="/Door", clip="DoorOpen", time=0.4)
```

## `animator` — Controller State Machine

Build order: parameters → states → default state → transitions → read back.

| Action | Arguments |
|---|---|
| `get` | `path` (+ `state` to narrow) |
| `add_param` | `params="Speed:float:0; Grounded:bool:true; Jump:trigger"` — `name:type[:default]`, types `float\|int\|bool\|trigger` |
| `add_state` | `states="Idle:Assets/Animations/Idle.anim; Walk"` — `name[:clip]`; `layer` = integer index |
| `set_default` | `state`, `layer` |
| `add_transition` | `source`, `target`, `conditions="Speed>0.1; Grounded; !Crouched"`, `duration`, `exit_time`, `has_exit_time`, `layer` |
| `update_transition` | same selectors as `add_transition`, only the supplied fields change |
| `remove` | `type="param\|state\|transition"` + `name` (param/state) or `source`+`target` (transition) |
| `add_blend_tree` | `state`, `blend_type="1d\|2d_simple\|2d_freeform\|2d_cartesian\|direct"`, `param` (+ `param_y`), `children` |
| `edit_blend_tree` | `state`, `edit_action="add_child\|remove_child\|set_thresholds\|set_param\|set_type"` |
| `get_blend_tree` | `state` |
| `add_layer` / `remove_layer` / `rename_layer` | `name`, `layer` (name or index), `weight`, `blending="Override\|Additive"` |
| `set_layer_weight` / `set_layer_blending` | `layer`, `weight` / `blending` |
| `set_state_speed` | `state`, `value` |
| `rename_state` / `rename_param` | old identity in `state` / `param`, new name in `name` |
| `set_avatar` | `avatar_path` |

Rules:

- `source="*"` creates an Any State transition.
- A transition created with `conditions` and no explicit `has_exit_time` does **not** wait for exit time.
- Blend-tree children: 1D `"Idle:0; Walk:0.5; Run:1"`, 2D `"Idle:0,0; Walk:0,1"`. Missing blend parameters are created
  as floats.
- Layer 0 (Base) cannot be removed.
- Authoring actions create the controller (and the `Animator`) when the object has none. `edit_blend_tree` is the
  exception: it fails when no controller exists.
- Every mutation saves the shared controller asset, so it affects every object using that controller.

```text
batch(commands="""
animator action=add_param path=/Hero params="Speed:float:0; Grounded:bool:true"
animator action=add_state path=/Hero states="Idle:Assets/Animations/Idle.anim; Run:Assets/Animations/Run.anim"
animator action=set_default path=/Hero state=Idle
animator action=add_transition path=/Hero source=Idle target=Run conditions="Speed>0.1; Grounded" duration=0.12
animator action=get path=/Hero
""", on_error="stop")
```

## `timeline` — Tracks, Clips, Bindings

| Group | Actions |
|---|---|
| Read (allowed in Play Mode) | `get`, `get_bindings`, `preview` |
| Create | `create` (`asset_path`, optional `tracks="Animation:HeroMotion; Audio:Music"`) |
| Tracks | `add_track`, `remove_track`, `rename_track`, `reorder_track` (`index`), `add_sub_track`, `mute`, `unmute`, `lock`, `unlock`, `set_track_offset` (`value="auto\|transform\|scene"`) |
| Clips | `add_clip`, `remove_clip`, `duplicate_clip` (`offset`), `set_timing` (`start`, `duration`, `blend_in`, `blend_out`), `set_clip_in` (`clip_in`) |
| Bindings and markers | `set_binding` (`track`, `binding=<scene path>`), `add_marker` / `remove_marker` (`track`, `start`, `name`), `set_duration` |

Rules:

- Root track types: `Animation`, `Audio`, `Activation`, `Signal`, `Control`, `Group`.
- `create` makes the GameObject at `path` (with a `PlayableDirector`) when it does not exist. The `tracks` spec is
  `Type:Name` pairs separated by `;`.
- `set_binding` needs the **director's scene path**, not the `.playable` asset path.
- Every write action is refused in Play Mode with `err: timeline write actions not allowed in Play Mode`.
- `preview` samples the director at `time`; it is not playback.

```text
timeline(path="/Intro", action="create", asset_path="Assets/Timelines/Intro.playable",
         tracks="Animation:HeroMotion")
timeline(path="/Intro", action="set_binding", track="HeroMotion", binding="/Hero")
timeline(path="/Intro", action="add_clip", track="HeroMotion",
         clip="Assets/Animations/Enter.anim", start=0, duration=1.5)
timeline(path="/Intro", action="get_bindings")
```

## Verification

1. Read the clip, controller or timeline **before** the edit and again after it — names, conditions, timings and
   bindings are verified as data.
2. Check the console delta for import, binding or serialization errors.
3. `preview` at representative times, then a screenshot only when appearance is the acceptance criterion.
4. Runtime behaviour (does the state machine actually transition) needs Play Mode: `debug_animator` or a playtest with
   `ASSERT /Hero|Animator|currentState == Run`.

## Pitfalls

- A stopped batch leaves a **partial asset**: the clip, controller or `.playable` file already written stays on disk.
  Inspect it and remove it explicitly instead of retrying blind.
- Generating many transitions without first reading the real state and parameter names produces transitions that
  reference nothing. Build one logical path, read it back, then extend.
- `animation` is not a state machine and `animator` does not author curves — choosing the wrong tool yields a clip
  nobody plays or a state without motion.
- `animator_intent` output is a draft. Run it with `dry_run=True`, confirm the named clips exist, then apply the exact
  commands yourself.
