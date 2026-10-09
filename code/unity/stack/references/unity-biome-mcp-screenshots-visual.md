# Unity Biome MCP — Screenshots and Visual Comparison

> See also: [unity-biome-mcp-ugui.md](unity-biome-mcp-ugui.md) and [unity-biome-mcp-uitoolkit.md](unity-biome-mcp-uitoolkit.md) (UI checks that come before a screenshot), [unity-biome-mcp-playtest-dsl.md](unity-biome-mcp-playtest-dsl.md) (`CAPTURE_FRAMES`), [unity-biome-mcp-diagnostics-performance.md](unity-biome-mcp-diagnostics-performance.md) (`render_analyze`)

`screenshot` is always visible; `screenshot_baseline` and `screenshot_compare` are in `MEDIA`. All three are
direct-only and classified as writes (they create files). Written against server and plugin v2.0.0.

---

## What a Screenshot Proves

Appearance: visibility, spacing, clipping, framing, color. It never proves a component value, a reference, a count,
console health or gameplay state — those are proven by data. One changed frame does not prove continuous animation.

## `screenshot`

```text
screenshot(camera="scene_view", width=1280, height=720)
screenshot(camera="single_view", path="/Hero", angle="iso", zoom=1.4,
           highlight="/Hero:#00FF88", show_colliders=True)
```

The reply is `Data saved to: <absolute path>`. Read the image file to actually look at it.

| `camera` | What is captured |
|---|---|
| omitted / `game` — **Play Mode** | The composited Game view, including Screen Space Overlay canvases. The image has the Game view window's size; `width`/`height` are ignored |
| omitted / `game` — **Edit Mode** | An offscreen render of the Main Camera. **Overlay canvases are not in it** |
| `scene_view` | The last active Scene view |
| `scene_view_frame` | Scene view framed on the current selection — select first with `editor(action="select")` |
| `single_view` | One generated view of the object in `path`; `angle` = `front`, `left`, `top`, `iso` or `ex,ey,ez` |
| `multi_view` | Combined diagnostic views of the object in `path` |
| `overview`, `overview_game` | Top-down overview; overview aligned to the main camera |
| any other string | Treated as the scene path of a camera object, rendered offscreen (no overlay canvases). When that object is not found it falls back to the Main Camera with only a console warning |

Rules:

- Files go to `<project>/ScreenShots/`, and every default-path capture **prunes that folder to the 20 newest PNGs**.
  Pass `output_path` (project-contained, `.png`) for an image that must survive, or save it as a baseline.
- With `scene_view` and `scene_view_frame`, the `path` argument is an output path, not an object. Use `output_path`
  to stay unambiguous.
- In Edit Mode an active overlay canvas adds `warn:ScreenSpaceOverlay canvas present — not captured…` to the reply.
  The warning is a hint, not evidence either way: open the image and state what is actually in the frame. To see
  overlay UI, capture in Play Mode or switch to `scene_view`.
- Allowed in Play Mode. Refused by a read-only server.
- `supersample` 1–4 sharpens; `offset` and `fixed_size` adjust framing; `annotation_id` frames a saved region.

### `describe=`

`describe` asks the server's LLM backend for a text description instead of the image: a built-in key (`auto`,
`scene_overview`, `verify_position`, `verify_color`, `verify_visible`, `ui_check`, `animation`, `particle`,
`multi_view`) or a short question. It needs the server started with `UNITY_MCP_VISUAL_VERIFY=1` and an authenticated
`claude` CLI. Without that the reply is `[DEGRADED:screenshot_describe:describe_disabled]` followed by the image path.
`raw=True` forces the path. A model's description is supporting evidence, never a pixel-exact assertion — for
acceptance, look at the image yourself.

## Baselines and Comparison

```text
screenshot_baseline(name="main-menu-1280x720", camera="scene_view", width=1280, height=720)
# … one scoped change …
screenshot_compare(name="main-menu-1280x720", camera="scene_view", width=1280, height=720, mode="pixel")
```

- A baseline is stored as `<project>/.claude/baselines/<name>.png`. `name` is a file name: no `/`, `\` or `..`.
- Compare with **the same** camera, size, scene state and render settings as the baseline. In Play Mode the capture
  follows the Game view window size, so a resized window gives `SIZE_MISMATCH`.
- Each comparison takes a fresh capture into `ScreenShots/`; it never modifies the baseline.

| `mode` | Result |
|---|---|
| `pixel` | Local and deterministic: `IDENTICAL (pixel)`, `SIZE_MISMATCH`, or `PIXEL: xx.x% similar (max diff n)`. **There is no pass/fail threshold** — you judge the number |
| `auto` (default) | `IDENTICAL`, or `NEAR_IDENTICAL: …` at ≥ 99 % similarity with a small maximum difference; otherwise it escalates to a model. Without the LLM backend it degrades to `[DEGRADED:visual_diff:pixel_only]` plus the pixel line |
| `structural`, `ui_layout`, `animation`, `color`, `position`, `regression` | Model-assisted; same degradation |
| `targeted` | Model-assisted answer to the required `question` |

Use `pixel` for regression evidence and state your own threshold with the measured value. A missing baseline answers
`No baseline '<name>' found…`.

## Reliable Workflow

1. Put the scene, camera, resolution and time scale into a deterministic state.
2. Capture once and inspect the framing.
3. Save a clearly named, versioned baseline — only after the data checks for that state have passed.
4. Make one scoped change and recreate the same state.
5. Compare; update the baseline only when the visual change is intended and reviewed.

## Frame Sequences in Playtests

`CAPTURE_FRAMES n INTERVAL s [CAMERA c] [LABEL l]` followed by `ASSERT_FRAMES_DIFFER label` or
`ASSERT_FRAMES_STATIC label`. The comparison uses a per-frame pixel sum, so a pure translation of identical pixels can
read as "static", and frames beyond 20 push the earliest ones out of the `ScreenShots/` folder. It proves that pixels
changed — not that the right thing moved.

## Pitfalls

- Reporting a tool warning ("overlay not captured") as a finding without opening the image.
- Comparing captures taken with different cameras or sizes and reading the difference as a regression.
- Taking repeated screenshots to detect change — use `fingerprint` or a data read instead.
- Leaving the only copy of an evidence image in `ScreenShots/`.
- Accepting behaviour from a picture.
