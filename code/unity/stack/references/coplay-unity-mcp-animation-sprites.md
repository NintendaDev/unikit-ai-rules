# Coplay Unity MCP — Animation and sprite sheets

| Task | MCP | CLI |
|---|---|---|
| Read/control Animator | `manage_animation`: `animator_get_info`, `animator_play`, parameter/speed/crossfade actions | `animation animator ...` |
| Author AnimatorController | `controller_create/get_info/add_state/add_transition/add_parameter/...` | `animation controller ...` |
| Author AnimationClip | `clip_create/get_info/add_curve/set_curve/...` | `animation clip ...` |
| Inspect/slice a sprite sheet | `manage_sprite`: `get_info`, `slice_sheet` | `sprite info`, `sprite slice` |
| Build sprite animation assets | `setup_clips`, `setup_controller`, `full_setup` | `sprite setup-clips/setup-controller/full-setup` |

## Animator, controller and clip are different targets

- MCP `controller_path`/`clip_path` map to CLI raw `controllerPath`/`clipPath`. In contrast, `manage_sprite` intentionally forwards its snake_case fields such as `controller_path` and `output_dir` unchanged.
- Activate `animation`. Use `target` for a scene object's Animator, `controller_path` for a `.controller`, and `clip_path` for a `.anim` asset. Put action-specific settings in `properties`.
- Inspect the assigned controller, parameter names/types, layers and state names before playback or authoring. A controller edit does not automatically assign it to a target Animator.
- Distinguish transient playback/parameter changes from persistent controller/clip changes. Verify both when a task spans authoring and behavior.
- Inspect curve binding path, component type and property name before adding keys. A valid clip with an incorrect binding can animate nothing. Verify events refer to valid handlers and the expected receiver.

```python
manage_animation(action="animator_get_info", target="PreviewActor")
manage_animation(action="controller_add_transition", controller_path="Assets/Animations/Preview.controller",
    properties={"fromState": "Idle", "toState": "Move", "hasExitTime": False,
                "conditions": [{"parameter": "Speed", "mode": "greater", "threshold": 0.2}]})
```

```powershell
unity-mcp --format json animation animator info 'PreviewActor'
unity-mcp --format json raw manage_animation '{"action":"controller_add_transition","controllerPath":"Assets/Animations/Preview.controller","properties":{"fromState":"Idle","toState":"Move","hasExitTime":false,"conditions":[{"parameter":"Speed","mode":"greater","threshold":0.2}]}}'
```

This example assumes both states and the float parameter already exist. Query `controller_get_info` afterward, then observe the transition in Play Mode. Inspect exact nested keys in the installed handler when the generic action schema is insufficient.

## Sprite-sheet workflow

1. `get_info` returns importer data, paged slices and an image block for PNG/JPEG sources. Inspect the image and count the actual grid before choosing `cols`/`rows` or frame dimensions.
2. Slicing replaces existing slices **even when `overwrite=false`**. Preserve intentional custom slicing and references unless replacing them is part of the task.
3. Define explicit frame ranges, fps and loop flags rather than relying on name-derived defaults. Check first/last frames against the actual sheet.
4. Choose `filter_mode`: default `point` suits pixel art; bilinear/trilinear can suit high-resolution artwork. Re-slicing sets the filter again, overwriting a manually set filter.
5. Create clips/controller at explicit paths. Existing clips can be skipped with `CLIP_EXISTS`; an existing controller can fail with `CONTROLLER_EXISTS`. Inspect warnings and outputs before treating the operation as complete.

```python
manage_sprite(action="get_info", path="Assets/Sprites/Probe.png", page_size=64)
# After visual inspection confirms a 4 by 2 sheet:
manage_sprite(action="full_setup", path="Assets/Sprites/Probe.png", cols=4, rows=2,
    clips=[{"name": "idle", "start_frame": 0, "end_frame": 3, "fps": 8, "loop": True}],
    output_dir="Assets/Animations/Probe", controller_path="Assets/Animations/Probe/Probe.controller",
    overwrite=False, add_to_scene=False)
```

```powershell
unity-mcp --format json sprite info 'Assets/Sprites/Probe.png'
unity-mcp --format json raw manage_sprite '{"action":"full_setup","path":"Assets/Sprites/Probe.png","cols":4,"rows":2,"clips":[{"name":"idle","start_frame":0,"end_frame":3,"fps":8,"loop":true}],"output_dir":"Assets/Animations/Probe","controller_path":"Assets/Animations/Probe/Probe.controller","overwrite":false,"add_to_scene":false}'
```

## Generated controller behavior and partial results

- Clip names affect controller generation: idle selects the default state, one walk/run clip becomes a plain state, multiple walk/run clips can create a Speed-driven 1D blend tree, and jump/attack/hurt-like names create trigger states. Inspect the generated controller rather than assuming arbitrary names produce the desired machine.
- `full_setup(add_to_scene=true)` replaces the selected object's controller and can add SpriteRenderer. It requires exactly one matching existing `scene_target`; ambiguity can fail **after** asset creation. Inspect partial outputs before retrying.
- Reread slice counts, clip assets and controller assignment, then observe frames/transitions. Imported rigged FBX clips use the model-import workflow; see [asset generation and Blender](coplay-unity-mcp-asset-generation-blender.md).

Sources: [animation tools](https://coplaydev.github.io/unity-mcp/reference/tools/animation), [sprite details](https://coplaydev.github.io/unity-mcp/reference/tools/animation/manage_sprite), [action examples](https://github.com/CoplayDev/unity-mcp/blob/beta/unity-mcp-skill/references/tools-reference.md), [CLI](https://coplaydev.github.io/unity-mcp/guides/cli).
