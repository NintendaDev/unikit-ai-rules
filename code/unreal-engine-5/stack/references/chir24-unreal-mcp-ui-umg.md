# ChiR24 Unreal MCP — UMG menus and HUD

| Need | Discover under `manage_blueprint` |
|---|---|
| Widget asset or template | `blueprint.edit_widget_blueprint`, `create_widget_template` |
| Tree/panels/controls | `blueprint.add_panel_widget`, `add_content_widget`, `add_game_widget` |
| Layout | `blueprint.set_widget_layout`, `arrange_widgets`, `set_font` |
| Bindings and event handlers | `blueprint.bind_widget` |
| Viewmodels | `blueprint.add_widget_viewmodel`, `bind_widget_viewmodel`, `set_field_notify` |
| Animation | `blueprint.edit_widget_animation`, `get_widget_animation` |
| Inspect and preview | `blueprint.get_widget_info`, `audit_widget`, `preview_widget` |

## Build a screen

```json
{"operation":"search","query":"create widget blueprint","tool":"manage_blueprint","limit":2}
```

Create/open the intended Widget Blueprint and inspect its current tree. Choose an appropriate root and panel hierarchy. Batch tree creation is available through the described panel family/legacy `add_widget_tree` action; inspect its steps and dry-run behavior before a large edit.

For each child, address its actual parent slot. Canvas anchors, alignment, position and size differ from box/grid padding and fill rules. Specify the relationship the layout should maintain under resizing, then inspect the returned slots. `arrange_widgets` can lay out Canvas children by relations and preview their boxes.

Read the tree and counts after each structural edit. A duplicate overlapped widget can be invisible in both a screenshot and a success message. Do not keep adding another child when an earlier add timed out.

## Bind actual behavior

Bind text/visibility/percent/events to real properties or functions with the correct signatures. A health-bar widget does not prove that it receives the player's health. Inspect generated Blueprint logic, viewmodel instances and FieldNotify wiring when those features are used.

Create animation tracks with the declared property paths/time units and inspect keys. Widget creation/animation does not automatically create an instance, add it to the player's viewport or start playback; author and verify those runtime steps.

## Verify both layout and input

```json
{"operation":"describe","capability":"blueprint.audit_widget"}
```

1. Compile the Widget Blueprint; read back its tree, slots, bindings and animation tracks.
2. Audit at relevant screen sizes/aspect ratios for overlap, clipping, safe areas, contrast and touch-target size. Inspect any heuristic finding rather than treating audit success as full visual approval.
3. Render `preview_widget` and view the returned image. A game-scene capture may omit UMG because it is composited above the scene; use the widget preview or an editor-window capture that includes UI.
4. In PIE, confirm the correct widget instance is visible and above competing UI. Diagnose hidden, transparent, zero-size, covered or unbound content with the described `inspect.explain` widget variant.
5. Use supported `simulate_input` widget-list/widget-click modes for interaction. Clicking viewport coordinates can capture the mouse and redirect later clicks. Verify the state change caused by the button, keyboard/controller focus and close/back behavior.
6. Save the widget and any controller/HUD/asset changes separately.

Example pause-menu acceptance: open via the intended action → verify game-paused/input state → activate Resume by widget name → confirm gameplay resumes and the widget is removed/hidden. A preview image cannot prove this interaction.

Sources: [widget-ui playbook](https://github.com/ChiR24/Unreal_mcp/blob/dev/plugins/EngineWire/Source/EngineWire/Private/MCP/Primitives/McpPromptPlaybooks.cpp), [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md), [Engine API reference, UMG](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Engine-API-Reference.md). UMG is the target framework here; Unity uGUI/UI Toolkit conventions do not apply. For input wiring use [framework-input-networking](chir24-unreal-mcp-framework-input-networking.md).
