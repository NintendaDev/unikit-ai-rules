# Fennara Godot MCP — Visual Evidence and Animation

> See also: [Saved scene authoring](fennara-godot-mcp-scenes-resources.md), [Imported assets](fennara-godot-mcp-assets-import.md), [Live behavior](fennara-godot-mcp-runtime-playtesting.md).

## Choose the observation

| Question | MCP path |
| --- | --- |
| What does a saved UI, scene, or imported PackedScene look like? | `screenshot_scene` |
| How do several exact detached states compare? | Screenshot worker → `capture` → `sheet` → `output` |
| What appears during actual input, physics, timing, or a transition? | `runtime_session` + `runtime_script` |
| How does an imported clip render? | Inspect generated tracks first, then capture the imported PackedScene |
| Is the renderer compatible with the intended effect/platform? | Read `fennara_status` context; verify under the required renderer |

No Fennara CLI screenshot command exists. Ordinary image viewers can inspect returned files; generic headless launches are not substitutes for Fennara's framing/context contract.

## Minimal capture and worker contract

For automatic framing, call `screenshot_scene` with:

```json
{"scene_path":"res://scenes/workshop.tscn"}
```

A mixed 2D/3D scene without an appropriate camera can be ambiguous. Select the intended dimension or provide a temporary camera **inside the worker**.

Scripted calls take `scene_path` and exactly one of `code` or `script_path`. Do not send legacy top-level camera paths, target paths, view rectangles, or framing options.

Screenshot workers use `@tool extends RefCounted` and `func run(ctx) -> void`. Their entire context is `ctx.root`, `capture`, `sheet`, `output`, `log`, and `error`. Scene-edit helpers such as `get_scene_root()`, `own()`, and `mark_modified()` are not available here.

Example: inspect a known UI subtree without saving changes:

```gdscript
@tool
extends RefCounted

func run(ctx) -> void:
    var hud: Node = ctx.root.get_node_or_null("Hud")
    if hud == null:
        ctx.error("Inspected Hud node is absent.")
        return
    var image: Image = await ctx.capture(hud)
    ctx.output(image, "Workshop HUD in detached preview")
```

`await ctx.capture(subject, options)` returns an **Image**, not an already published receipt. Publish useful results with `ctx.output(image, description)`. All worker mutations are detached preview changes, not persisted scene edits.

Before the first capture the root is detached. If global-space measurements are required, perform one cheap explicit-view/camera initialization capture and discard its Image. Avoid this extra render when local state is sufficient.

## Framing and evidence

- Keep the authentic environment, camera, viewport, and relevant HUD when judging player-facing appearance.
- A selected subject controls framing; it does not automatically hide all other nodes. Hide only content known to obstruct the question.
- For geometry diagnostics, temporary lighting/fog/camera changes are valid. Label that image as diagnostic and retain a contextual view when normal appearance matters.
- For large worlds or distant subjects, capture readable regions separately instead of shrinking everything into one image.
- Choose an explicit 3D `view` when direction is known: `front`, `back`, `left`, `right`, `top`, `perspective`, or `isometric`. Otherwise, for up to eight selected subjects, automatic search tests 17 deterministic viewpoints.
- Named views fix orientation, but each capture recomputes framing from current bounds. For spatial comparisons use the **same explicit Camera2D/Camera3D**, projection, and scale throughout.
- Prefer meaningful anchors for surrounding-view surveys. Fix position/FOV/height and rotate yaw in deterministic order. This creates a rectilinear view sheet, not a stitched panorama.

Automatic occupancy/presence metrics detect empty or sparse rendering; they do not prove semantic usefulness. Inspect the actual delivered pixels for clipping, occlusion, legibility, and misleading diagnostic changes.

## Comparison sheets

`ctx.sheet(images, options)` only composes Images: it does not capture, advance time, choose states, save, or publish. Supply chronological or intentionally ordered images, then output the returned pages.

Useful options are `columns`, `cell_size: Vector2i`, `cells_per_sheet`, `labels`, `gap`, `fit`, `background: Color`, and `label_scale`. Default fit is `contain`; `stretch` distorts shapes, while `cover` crops. Preserve aspect ratio unless deliberate cropping answers the question.

Every output is saved, but only the first six published images are attached to one tool result as model image context. Later images remain available by saved path. Use content-unique filenames when presenting saved files to avoid stale client image caches.

## Animation workflow

Inspect native APIs with `get_class_info`, then inspect the actual animation resource before sampling: length, non-empty tracks, types, paths, libraries, graph ownership, and skin binding. A clip name or placeholder duration does not prove that useful tracks imported.

| Animation case | Evaluation rule |
| --- | --- |
| Discrete SpriteFrames | Use exact frames, such as `set_frame_and_progress`, when frame coverage is the question |
| Direct AnimationPlayer clip | Pause, assign the clip, then `seek(time, true, true)` for visual-only sampling |
| AnimationTree blending/transitions | Use its real parameters/playback and manual graph advancement; direct clip seeks bypass the graph |
| Skeleton/BoneAttachment3D | Flush the relevant skeleton update before capture; inspect rendered skin as well as bone values |
| Procedural motion/IK | Advance the real solver from a known state with fixed steps and measured state |
| Physics/collisions/ragdolls | Use a real runtime session unless the project exposes an explicit valid offline simulation |

For a chronological storyboard, include the full interval, actual non-looping end, and important authored events. Uniform time is a baseline; cumulative pose-change sampling better preserves progression through pauses/repeated states. Farthest-point pose selection is useful for distinct silhouettes, not a substitute for chronological progression.

Imported Godot key times may be baked samples rather than original authoring keys. Do not infer source FPS from minimum key spacing. Use time/pose labels unless FPS has independent provenance.

## Example: a bounded fixed-camera clip sheet

Prerequisites: inspect the shown paths and clip, and confirm `PreviewCamera` frames all sampled states. This illustrates direct-clip observation, not AnimationTree or gameplay execution.

```gdscript
@tool
extends RefCounted

func run(ctx) -> void:
    var player: AnimationPlayer = ctx.root.get_node_or_null("AnimationPlayer") as AnimationPlayer
    var camera: Camera3D = ctx.root.get_node_or_null("PreviewCamera") as Camera3D
    if player == null or camera == null or not player.has_animation("demo/turn"):
        ctx.error("Need the inspected player, camera, and demo/turn clip.")
        return
    var clip: Animation = player.get_animation("demo/turn")
    if clip == null or clip.get_track_count() == 0:
        ctx.error("Clip has no useful imported tracks.")
        return
    await ctx.capture(ctx.root, {"camera": camera})
    player.pause()
    player.assigned_animation = "demo/turn"
    var times: Array[float] = [0.0, clip.length * 0.5, clip.length]
    var frames: Array[Image] = []
    for time: float in times:
        player.seek(time, true, true)
        frames.append(await ctx.capture(ctx.root, {"camera": camera}))
    var pages: Array[Image] = ctx.sheet(frames, {
        "columns": 3,
        "labels": ["START", "MID", "END"],
        "fit": "contain"
    })
    for page: Image in pages:
        ctx.output(page, "Three sampled states of demo/turn, fixed camera")
```

This sparse sheet proves only those sampled states. For motion quality, inspect a denser relevant interval or real playback. For bone attachments, add the version-verified skeleton update before each capture; do not silently treat the generic sample as a complete rig evaluator.

For AnimationTree/IK/skinning/root-motion work, additionally read installed `addons/fennara/ai/visual-observation.md`. It contains the specialized evaluation contracts; a universal rig script would hide project-specific assumptions. In particular:

- Manual graph evaluation may need a final `advance(0.0)`; method/audio/nested-animation tracks need deliberate temporary suppression for offline visual sampling.
- Read root-motion deltas immediately after their advancing step, before another graph evaluation clears them.
- Confirm the mesh resolves its intended skeleton and has a skin reference; changed bone values alone do not prove mesh deformation.
- Normalize articulation relative to the animated root; measure travel separately.
- Derive shared camera bounds from all selected states. Bake deformed bounds only when needed, with bounded work.

The specialized cases are intentionally a checklist plus upstream on-demand guidance rather than a speculative universal code example.

## Evidence limitations

A detached screenshot is not a live editor screenshot or a gameplay frame. Awaiting a physics-frame signal in that context does not prove gameplay physics advanced. Cross-renderer comparisons test compatibility, not identical pixels. Repeatable image hashes/state traces do not by themselves prove pleasing motion.

## Sources

See [source inventory](fennara-godot-mcp-sources.md): `tools.md`, `screenshot_scene.json`, generated visual/runtime observation guidance, and renderer-sensitive guidelines.
