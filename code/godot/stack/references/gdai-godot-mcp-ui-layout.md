# GDAI Godot MCP — UI layout and interaction

> See also: [resources](gdai-godot-mcp-resources-physics.md), [editor scripting](gdai-godot-mcp-editor-scripting.md).

---

| UI task | Route |
|---|---|
| Build widget hierarchy | Scene/node tools with `Control` and container classes |
| Apply a standard anchor arrangement | `set_anchor_preset` |
| Set explicit anchor fractions | `set_anchor_values` |
| Set text, minimum size or existing layout properties | `update_property` after property/schema inspection |
| Create a theme/style resource | `add_resource` or a verified editor-code fallback |
| Verify appearance and interaction | Running-game screenshot plus the intended input/result |

## Layout rules

- Inspect the parent before adjusting a child. A `Container` controls its children's placement; tune sizing flags, minimum sizes and container layout rather than repeatedly overwriting child positions.
- Anchors and offsets jointly determine a non-container child's rectangle. An anchor preset alone does not prove offsets were reset. Read both back; inspect available preset names instead of guessing their spelling.
- Keep decorative overlays from consuming input intended for controls beneath them. Check `mouse_filter`, visibility, focus and clipping when a button looks correct but does not respond.
- Use existing project theme/text conventions. Creating a new theme per widget can make consistent styling harder; decide resource sharing deliberately.

## Worked case: responsive pause panel

```text
PauseRoot (Control, fills viewport)
├── Dimmer (ColorRect)
└── Center (CenterContainer, fills parent)
    └── Panel (PanelContainer)
        └── Buttons (VBoxContainer)
            ├── Resume (Button)
            └── Exit (Button)
```

1. Inspect the existing screen and reuse its root/style where appropriate.
2. Create the missing hierarchy; apply full-rect anchors to the non-container roots using the live preset contract.
3. Configure minimum size and spacing, then text and resource references. Wire button behavior with the scripting workflow if no dedicated signal tool is exposed.
4. Save, run and inspect at the target viewport size. Test the button actions and any click-blocking dimmer behavior.
5. Change to another relevant aspect ratio through an available verified workflow; inspect again. Do not claim responsive coverage from one editor screenshot.

Original engine-code example for a **decorative icon** inside a button:

```gdscript
func configure_button_icon(icon: TextureRect) -> void:
    icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
```

Apply that choice only to the decoration, not to the interactive button or an overlay meant to block gameplay input. A pause screen also needs an explicit decision about processing while the game is paused; verify that its interaction still runs in the chosen process mode.

## Acceptance evidence

Read back hierarchy and layout properties, inspect the saved scene, open the running screenshot, then exercise the action. The public GDAI catalog does not specify a viewport-resize tool or reliable UI automation schema; discover installed capabilities or record the missing check.

Sources: [anchor tools](https://gdaimcp.com/docs/supported-tools), [Control input/layout](https://docs.godotengine.org/en/stable/classes/class_control.html), [container ownership of layout](https://docs.godotengine.org/en/stable/tutorials/ui/gui_containers.html). The pause-panel recipe is original.
