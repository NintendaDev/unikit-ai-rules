# Coplay Unity MCP — Canvas UI

> See also: [UI Toolkit](coplay-unity-mcp-ui-toolkit.md), [objects/components](coplay-unity-mcp-scene-objects.md), [visual captures](coplay-unity-mcp-camera-rendering.md).

| Task | MCP path | CLI path |
|---|---|---|
| Inspect screen | Find Canvas/target; read RectTransform and UI component resources | `gameobject find`, then an available query/custom tool |
| Create basic Canvas/widget | `manage_gameobject` + `manage_components`, optionally batched | `ui create-canvas/create-button/create-image/create-text` where their templates fit |
| Layout/property change | `manage_components(action="set_property")` | `component set/modify` or raw |
| Reusable screen/widget | Prefab workflow | `prefab ...` |
| Verify final Game view | `manage_camera(action="screenshot")` without a camera override | `camera screenshot` without `--camera-ref` |

## Select the correct UI system

- `manage_ui` is for **UI Toolkit**, not uGUI. Activate no extra `ui` group just to edit a Canvas; the generic object/component tools are in `core`.
- Inspect project/package/component availability before creation. The CLI's `ui create-*` commands are convenience templates, not a promise to use the project's chosen text engine, input module or prefab architecture.
- The reviewed CLI source specifically creates TextMeshProUGUI for `ui create-text`, performs several calls, and can print a creation summary after only partial success. Inspect each component and references; use project prefabs or explicit generic operations when that template is incompatible.
- Reuse existing screen/button/text prefabs when conventions require them. Inspect generated component types immediately if a convenience command is used. Do not introduce TMP or legacy Text merely because an upstream example contains it.

## Layout workflow

1. Inspect the Canvas mode, CanvasScaler, parent RectTransforms, layout groups and existing widget components.
2. Decide which layout component owns each axis. Do not repeatedly set offsets that a LayoutGroup/ContentSizeFitter/animation overwrites.
3. Inspect anchors, pivot, anchored position and size; change only the necessary fields. Use the target's actual serialized representation for Vector2 and reference values.
4. Verify at the requested dimensions/aspect ratios, including safe area if relevant to the task. Check both hierarchy/property state and rendered results.
5. Save the screen prefab or scene specified by the task. Confirm source asset changes separately from instance overrides.

Example: move an existing uniquely resolved panel; its `RectTransform` resource has already confirmed the value format.

```python
manage_components(action="set_property", target="HUD/StatusPanel", search_method="by_path",
    component_type="RectTransform", property="anchoredPosition", value={"x": 0, "y": -32})
manage_camera(action="screenshot", include_image=True, max_resolution=640)
```

```powershell
unity-mcp --format json raw manage_components '{"action":"set_property","target":"HUD/StatusPanel","searchMethod":"by_path","componentType":"RectTransform","property":"anchoredPosition","value":{"x":0,"y":-32}}'
unity-mcp --format json camera screenshot --include-image --max-resolution 640
```

Inspect the image, then reread the actual rectangle. A screenshot alone cannot prove an anchor/constraint is correct for another resolution.

## Interaction and text

- Inspect EventSystem and the input module compatible with the project's input setup. Avoid adding a second EventSystem as a generic fix for a button that does not respond.
- Check raycast targets, CanvasGroup interaction, sorting and active state before changing event bindings.
- Button creation does not wire application behavior. Bind through project code, a discovered custom tool, or a narrow editor operation after inspecting the real event API. Do not invent a Coplay `bind_event` action.
- For text, use the component already chosen by the project. Fonts, references and markup are component-specific; generic templates are insufficient verification.
- Behavioral verification requires triggering the interaction or a meaningful test. A visible button does not prove its handler executes.

## Captures

For Screen Space Overlay canvases, omit `camera`/`--camera-ref`: the documented ScreenCapture path includes overlay UI while direct camera rendering excludes it. A Scene View screenshot documents editor layout/context, not final Game view presentation. Save and open returned image paths when inline images are unavailable.

Sources: [official UI workflows](https://github.com/CoplayDev/unity-mcp/blob/beta/unity-mcp-skill/references/workflows.md), [CLI UI commands](https://coplaydev.github.io/unity-mcp/guides/cli), [camera capture behavior](https://coplaydev.github.io/unity-mcp/reference/tools/core/manage_camera).
