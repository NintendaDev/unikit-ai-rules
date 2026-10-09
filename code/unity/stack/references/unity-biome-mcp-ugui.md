# Unity Biome MCP — uGUI (Canvas) Authoring

> See also: [unity-biome-mcp-uitoolkit.md](unity-biome-mcp-uitoolkit.md) (UXML/USS — a different system and toolset), [unity-biome-mcp-scene-objects.md](unity-biome-mcp-scene-objects.md) (`set_property`, `wire_event`), [unity-biome-mcp-screenshots-visual.md](unity-biome-mcp-screenshots-visual.md) (layout evidence)

Category gate: `UGUI` for `create_ui`, `set_rect`, `lint_ugui`; `ui_intent` is always visible and direct-only.
`create_ui` and `set_rect` are batchable and allowed in `apply_scene_change`. Written against server and plugin
v2.0.0.

---

## Workflow

1. Read the existing Canvas and hierarchy; decide the parent explicitly.
2. `console_mark()`.
3. Create controls with stable names.
4. Set anchors before pixel offsets.
5. Read back `RectTransform` fields.
6. `lint_ugui`, `list_events` for interactive controls, console delta.
7. Screenshot only for layout and appearance.

```text
batch(commands="""
create_ui type=Panel name=StatusPanel parent=/HUD anchor=top-right size=(320,120) color=#202226E6
create_ui type=Text name=Status parent=/HUD/StatusPanel anchor=stretch text=READY font_size=24 font_min=14 font_max=28
set_rect path=/HUD/StatusPanel/Status anchor=stretch offset_min=(16,12) offset_max=(-16,-12)
""", on_error="stop", atomic=True)
get_component(path="/HUD/StatusPanel/Status", type="RectTransform",
              fields="anchoredPosition,sizeDelta,anchorMin,anchorMax,pivot")
lint_ugui(root="/HUD")
```

## `create_ui`

`type`: `Canvas`, `Panel`, `Button`, `Text`, `Image`, `Toggle`, `Slider`, `InputField`, `ScrollView`
(case-insensitive). Any other value is an error.

| Type | Default anchor / size | What is built |
|---|---|---|
| `Canvas` | — | Canvas + `CanvasScaler` (Scale With Screen Size, **reference 1920×1080**) + `GraphicRaycaster`; creates an `EventSystem` with the legacy `StandaloneInputModule` when none exists |
| `Panel` | `stretch` | `Image` |
| `Button` | `center`, 160×30 | `Button` + child `Text` |
| `Text` | `center`, 200×50 | `TextMeshProUGUI` when TextMeshPro is present, else legacy `Text` |
| `Image` | `center`, 100×100 | `Image` |
| `Toggle` | `center`, 160×30 | Background / Checkmark / Label |
| `Slider` | `center`, 160×20 | Background / Fill Area / Fill / Handle Slide Area / Handle |
| `InputField` | `center`, 200×30 | **Legacy** `UnityEngine.UI.InputField` and `Text` |
| `ScrollView` | `stretch` | Viewport + `Mask`, Content with a vertical `ContentSizeFitter` |

Rules:

- **Always pass `parent`.** When it is omitted the element goes under the first active Canvas found anywhere in the
  loaded scenes, or a new Canvas is created.
- `render_mode`: `SSO` (Screen Space Overlay, default), `SSC` (Screen Space Camera), `WorldSpace`.
- After creating a Canvas, set the `CanvasScaler` reference resolution and match mode to the project's standard — the
  1920×1080 landscape default is rarely right for a portrait game. A project using the new Input System also needs
  the `EventSystem` input module replaced.
- `color` accepts hex or `(r,g,b[,a])`. Color **names** are not accepted here.
- `font_min` / `font_max` enable TextMeshPro auto-sizing; the legacy `Text` fallback ignores them.
- Non-latin `text` on a TextMeshPro element can make TMP generate fallback glyphs into a shared font asset. After
  creating text, check the working tree for modified font assets outside your change, and assign the project's font
  explicitly.
- A failing `Panel` or `Image` call (bad `anchor` or `color`) can leave the already-created object behind. Search for
  it after an error.
- Generated controls are a starting point: read the children's rects and the `targetGraphic` of interactive controls
  before relying on them, and prefer the project's own UI prefabs when they exist.

## `set_rect`

`set_rect(path, anchor, pos, size, pivot, offset_min, offset_max, pos3)` — vectors are `(x,y)`.

- Anchor presets: `stretch`, `center`, `top-left`, `top-center`, `top-right`, `middle-left`, `middle-right`,
  `bottom-left`, `bottom-center`, `bottom-right`, `top-stretch`, `bottom-stretch`, `left-stretch`, `right-stretch`.
  **Each preset also sets the pivot** to the matching corner or edge.
- Order of application: anchor preset → `pivot` → `pos` (`anchoredPosition`) → `size` (`sizeDelta`) → `offset_min` /
  `offset_max` → `pos3`.
- A stretch preset does not zero the size delta. For a true fill pass `offset_min=(0,0) offset_max=(0,0)`; for an
  inset pass `offset_min=(12,12) offset_max=(-12,-12)`.
- `pos3` sets `anchoredPosition3D` (World Space depth) and wins over `pos`.
- Changes are Undo-recorded; the scene is not saved.

## `lint_ugui`

Checks: missing `EventSystem`; Canvas without `GraphicRaycaster`; ScrollRect structure (viewport not full-stretch,
content that cannot grow, masks on both root and viewport, unwired scrollbar, null content); an active point-anchored
rect with zero size; a sprite-less `Image` that blocks raycasts with no interactable ancestor; a `LayoutGroup` with no
active children. A clean result is `ok: 0 issues`.

- `root` is resolved with Unity's `GameObject.Find` — active objects only, not this server's path rules. **If it does
  not resolve, the whole scene is scanned silently.** Read the report's scope, not only its verdict.
- Inactive objects are skipped.
- A clean lint proves structure, not layout quality, interactability or wiring.

## `ui_intent`

`ui_intent(intent, parent, template, dry_run)` — direct-only. Templates `hud`, `menu`, `dialog`, `grid` are
deterministic; free text needs the server's LLM backend.

- Always run with `dry_run=True` first and read the generated commands.
- In v2.0.0 the generated plan can contain layout nodes (`create_ui type=Layout` …) that `create_ui` rejects, so the
  `menu` and `grid` templates and any plan with layout groups fail part-way. Take the dry-run output as a draft and
  run the valid `create_ui` / `set_rect` / `manage_component` lines yourself.

## Events and Interaction

- Persistent listeners: `wire_event` → `list_events` (see the scene reference). Not idempotent; the method signature is
  not validated.
- Verify interactability, references and listeners as **data**.
- In a playtest, `CLICK /Canvas/Button` calls `onClick.Invoke()` directly — it does not prove that a pointer can reach
  the control (no raycast, `CanvasGroup` or `EventSystem` check).
- A Screen Space Overlay canvas is **not** in an Edit Mode `game` capture; use `camera="scene_view"` or Play Mode. The
  tool's warning about the missing overlay is only a hint — open the image to see what is actually in the frame.

## Rules

- Keep touch-target size, text wrapping and narrow viewports in the acceptance criteria.
- Establish a visual baseline only after the data checks pass.
- Never send uGUI events to a UI Toolkit `VisualElement`, and never mix `RectTransform` coordinates with UI Toolkit
  panel coordinates.
- Editor windows and other IMGUI tooling are not uGUI: none of these tools apply to them.
