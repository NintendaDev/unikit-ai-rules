# Coplay Unity MCP — UI Toolkit

> See also: [Canvas UI](coplay-unity-mcp-ui-ugui.md) for uGUI. This file applies to UXML, USS, PanelSettings and UIDocument only.

| Goal | `manage_ui` action |
|---|---|
| Discover assets/capability | `ping`, `list` with `filter_type` and paging |
| Author source | `create`, `read`, `update`, `delete` |
| Link stylesheet | `link_stylesheet` with UXML `path` and USS `stylesheet` |
| Configure panel | `create_panel_settings`, `update_panel_settings` |
| Attach/remove document | `attach_ui_document`, `detach_ui_document` |
| Inspect instantiated elements | `get_visual_tree` with bounded `max_depth` |
| Change a live element | `modify_visual_element` |
| Capture | `render_ui` |

## Author persistent UI

1. Activate `ui`; list/read existing assets before creating replacements.
2. Create UXML and USS at explicit `Assets/...` paths. Use namespace-qualified `<ui:Style>` rather than bare `<Style>`.
3. Link USS to UXML; do not assume creating the stylesheet also attaches it.
4. Create/configure PanelSettings, then attach a UIDocument with `source_asset` and an explicit panel when shared panel behavior matters.
5. Inspect the live visual tree and console, then capture/render. If the UI belongs to a custom EditorWindow instead of a scene UIDocument, use that window's actual loading path; do not add a scene document unnecessarily.

```python
manage_ui(action="create", path="Assets/UI/ProbePanel.uxml",
    contents='<ui:UXML xmlns:ui="UnityEngine.UIElements"><ui:Label name="status" text="Ready" /></ui:UXML>')
manage_ui(action="create", path="Assets/UI/ProbePanel.uss",
    contents='#status { font-size: 22px; color: white; }')
manage_ui(action="link_stylesheet", path="Assets/UI/ProbePanel.uxml",
    stylesheet="Assets/UI/ProbePanel.uss")
```

CLI uses raw dispatch; `unity-mcp ui create-text` creates a uGUI template and is not the equivalent.

Raw dispatch uses the Unity handler, not the Python adapter. Plain `contents` is supported by the handler; the MCP adapter instead base64-encodes it as `encodedContents` plus `contentsEncoded`. Other wire fields include `sourceAsset`, `panelSettings`, `sortOrder`, `maxDepth`, `elementName`, `filterType`, `pageSize`, `pageNumber`. Render options such as `include_image` and `max_resolution` retain snake_case. Do not apply a universal casing conversion.

```powershell
unity-mcp --format json raw manage_ui '{"action":"create","path":"Assets/UI/ProbePanel.uxml","contents":"<ui:UXML xmlns:ui=\"UnityEngine.UIElements\"><ui:Label name=\"status\" text=\"Ready\" /></ui:UXML>"}'
unity-mcp --format json raw manage_ui '{"action":"create","path":"Assets/UI/ProbePanel.uss","contents":"#status { font-size: 22px; color: white; }"}'
unity-mcp --format json raw manage_ui '{"action":"link_stylesheet","path":"Assets/UI/ProbePanel.uxml","stylesheet":"Assets/UI/ProbePanel.uss"}'
```

## Panel configuration and live inspection

- Prefer the documented `settings` dictionary for PanelSettings. Its keys are Unity-style names such as `scaleMode`, `referenceResolution`, `screenMatchMode`, `match`, `referenceDpi`, and `dynamicAtlasSettings`; top-level `scale_mode`/`reference_resolution` are legacy shortcuts.
- Inspect the installed action handler before assuming every create setting works identically for update. Verify scale and reference resolution in the saved panel asset.
- `modify_visual_element` targets `element_name` and can change text/classes/style/enabled/visible/tooltip on an instantiated element. Treat these as live changes; edit UXML/USS or application code separately for persistence.

```python
manage_ui(action="get_visual_tree", target="ProbeUI", max_depth=5)
manage_ui(action="render_ui", target="ProbeUI", width=900, height=1600,
          include_image=True, max_resolution=640)
```

```powershell
unity-mcp --format json raw manage_ui '{"action":"get_visual_tree","target":"ProbeUI","maxDepth":5}'
unity-mcp --format json raw manage_ui '{"action":"render_ui","target":"ProbeUI","width":900,"height":1600,"include_image":true,"max_resolution":640}'
```

In Play Mode, the first `render_ui` can return `pending=true`; call it again to retrieve the queued capture and check `hasContent`. Edit Mode rendering is best-effort and can be blank. A blank render is not proof that the document is absent: inspect visual tree, source/panel references and console, and use an appropriate Game view capture when needed.

Source: [manage_ui — full current action and parameter reference](https://coplaydev.github.io/unity-mcp/reference/tools/ui/manage_ui).
