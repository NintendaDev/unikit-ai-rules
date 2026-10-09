# Unity Biome MCP — UI Toolkit (UXML / USS) Authoring

> See also: [unity-biome-mcp-ugui.md](unity-biome-mcp-ugui.md) (Canvas UI — a different system), [unity-biome-mcp-playtest-dsl.md](unity-biome-mcp-playtest-dsl.md) (UI Toolkit queries and clicks in scenarios), [unity-biome-mcp-connection-session.md](unity-biome-mcp-connection-session.md) (reply distillation)

Category gate: `UITOOLKIT` for `inspect_uitk`, `uitk_element`, `uitk_file`, `attach_uitk`, `lint_uitk`; `uitk_intent`
is always visible. `uitk_file` and `uitk_intent` are direct-only. Written against server and plugin v2.0.0.

---

## Three Different Things

| Thing | Tool | Persistence |
|---|---|---|
| UXML / USS **source files** | `uitk_file`, `lint_uitk` (or your own file tools) | On disk, immediately; not Undo-able |
| The `UIDocument` **component** on a GameObject | `attach_uitk`, then ordinary scene tools | Scene, Undo-recorded |
| The **live** `VisualElement` tree | `inspect_uitk`, `uitk_element` | In memory only — never written to UXML or USS |

A `VisualElement` is not a GameObject: scene tools, `wire_event` and uGUI tools do not apply to it.

## Scope Limit

`inspect_uitk` and `uitk_element` see **only panels hosted by a scene `UIDocument`** (`PanelRenderer` on Unity 6.4+).
They do not see `EditorWindow` UI, custom inspectors or wizards. "No UI host found" therefore says nothing about an
open editor window. To inspect or drive an editor window, use `execute_code` and walk its `rootVisualElement`.

In Edit Mode a `UIDocument` panel often has no tree at all (`null — Edit Mode without RunInEditMode`); the real tree
usually exists only in Play Mode. For Edit Mode work read the UXML source.

## Inspect and Query the Live Tree

```text
inspect_uitk(path="scene")                                   # list every active UIDocument host
inspect_uitk(path="/HUD", depth=5, show_style=True)
uitk_element(action="get", path="/HUD", name="health-label", property="text")
uitk_element(action="query", path="/HUD", selector=".inventory__slot")
```

- Tree lines look like `name [Type] .class !hidden !disabled "text" ~N`. Elements named `unity-*` are hidden unless
  `show_unity_private=True`. Depth defaults to 4; at most 300 elements.
- `selector` forms: `.class`, `#name`, bare `name`, or `TypeName` (exact type name).
- `~N` refs are valid only until the next `inspect_uitk` call or a domain reload. Pass them through the **`ref`**
  argument of `uitk_element`; as an `inspect_uitk` selector they are not accepted.
- `uitk_element` addressing priority: `ref` → `name` → `selector`.

| `uitk_element` action | Notes |
|---|---|
| `query` | Lists matches |
| `get` | `property` in `text`, `value`, `visible`, `name`, `enabled` |
| `get_style` | `color`, `backgroundColor`, `opacity`, `display`, `width`, `height` |
| `set_style` | **Only** `display`, `opacity`, `visibility` |
| `add_class` / `remove_class` | `class_name` without the leading dot |
| `enable` / `disable` | |

Every mutating action changes the live tree only. In Play Mode the reply carries an explicit non-persistence warning.
Errors come back as `err: …` **text**, not as tool errors. For a durable change edit the USS or UXML.

## Source Files: `uitk_file`

Paths must be `.uxml` or `.uss` under `Assets/`; `Packages/` and `Library/` are rejected.

| Action | Arguments | Notes |
|---|---|---|
| `read` | `path` | Returns the raw text — but a long reply can be trimmed by the response distiller. **Read UI source with your own file tool** when you need the literal bytes |
| `write` | `path`, `content` | Full replace. UXML is parsed and test-instantiated; a failing import is auto-reverted. Unchanged content answers `no-op` |
| `create_uxml` / `create_uss` | `path`, optional `content` | New file with a minimal template |
| `set-attr` | `selector` (element **name**), `attr`, `value` | |
| `add-class` / `remove-class` | `selector` (element name), `cls` | |
| `add-element` | `parent` (element name or root), `tag="ui:Label"`, `attrs="name=score text=0"` | `attrs` is split on single spaces; each pair has exactly one `=` — no spaces inside values |
| `remove-element` | `selector` | No-op when absent |
| `set-rule` | `selector` (exact selector text), `prop`, `value` | Creates the rule at the end of the file when the selector is absent. Works on multi-line rule blocks |
| `remove-rule` | `selector` | |
| `revert` | `path` | One level, in memory, cleared by a domain reload. A newly created file has nothing to revert to |

Rules:

- `write` rejects USS containing constructs Unity does not support: `display: grid`, `@media`, `calc(`, `:nth-child`,
  `@keyframes`, gradients.
- UXML structural actions rewrite the whole file (re-indented). Expect a formatting-only diff around your change.
- After `add-element`, read the file and run `lint_uitk`: confirm the new tag carries the same namespace prefix as its
  siblings.
- Whole-file edits made with your own file tools are equally valid; follow them with
  `asset(action="reimport", path=…)` and `lint_uitk`.

```text
uitk_file(path="Assets/UI/HUD.uxml", action="add-element", parent="root", tag="ui:Label",
          attrs="name=score-label text=0")
uitk_file(path="Assets/UI/HUD.uss", action="set-rule", selector=".hud__score", prop="color", value="#ffffff")
lint_uitk(path="Assets/UI/HUD.uxml")
lint_uitk(path="Assets/UI/HUD.uss")
```

## `lint_uitk`

Read-only checks: malformed UXML; missing `<Style src>` file; missing `<Template src>` file; a Button, Toggle, Slider
or TextField without a `name`; duplicate USS selectors; empty USS rules. `fix=True` is unsupported and returns an
error. It does not check that selectors match anything, that names are unique, or that the layout works.

## `attach_uitk`

```text
attach_uitk(path="/HUD", uxml="Assets/UI/HUD.uxml",
            panel_settings="Assets/UI/HUDPanelSettings.asset", sort_order=10)
inspect_uitk(path="/HUD")
```

- Adds one Undo-recorded `UIDocument`. Supplied assets are validated first; none is created.
- Refuses an object that already has a `UIDocument`.
- **Without `panel_settings` nothing renders** — the reply says `warn:panelSettings=null`. Always pass an existing
  `PanelSettings` asset.

## `uitk_intent`

`uitk_intent(intent, name, path="Assets/UI", attach_to, template, dry_run)`. Templates `hud`, `menu`, `dialog`,
`settings`, `editor_window` are deterministic; free text needs the server's LLM backend.

- Use `dry_run=True` first: it returns the UXML and USS text without writing.
- A real run writes the USS, then the UXML, then optionally attaches. The steps are **not** a transaction: on a
  failure, inspect every path named in the report and remove only what that run created.

## Playtest Addressing

`GameObject|UIDocument|element-name[|field]`:

```text
CLICK /HUD|UIDocument|submit-button
FILL /HUD|UIDocument|player-name Player1
ASSERT /HUD|UIDocument|status-label|text == "Ready"
```

A Button click fires `clicked` callbacks but not `ClickEvent` listeners; `FILL` sets the text without change
callbacks. Design verification around the resulting state, not around event delivery.

## Authoring Rules

- Stable kebab-case element names and USS classes; BEM-style class names for reusable components.
- Flex layout only. Not available in USS: grid, media queries, `calc()`, keyframes, pseudo-elements, `box-shadow`.
- New custom controls use `[UxmlElement]` and `[UxmlAttribute]`, not the deprecated `UxmlFactory` / `UxmlTraits`.
- `wire_event` cannot target a `VisualElement` or a `UIDocument`. Bind in C#; use a `MonoBehaviour` with a serialized
  `UnityEvent` only when persistent scene wiring is required.
- No `EventSystem` or `GraphicRaycaster` for a UI Toolkit panel.
- A synthetic event dispatched from `execute_code` can throw inside the dispatch and still have committed its effect.
  After such an error re-read the state — never conclude "nothing happened" from the exception, and never blindly
  repeat the dispatch.

## Verification

1. Lint both files after every source change.
2. Read the source from disk to confirm the edit landed as written.
3. In Play Mode, `inspect_uitk` the host and `uitk_element(action="get")` the values that matter.
4. Screenshot for layout only.
