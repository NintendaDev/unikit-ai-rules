---
version: 1.0.0
---

# IMGUI Editor Windows & Tools

> **Scope**: Rules for creating Unity Editor utility windows using built-in IMGUI system (EditorWindow, EditorGUILayout, GUILayout). Use when Odin Inspector is not available or when a lightweight IMGUI-only solution is preferred.
> **Load when**: building Unity Editor tooling with plain IMGUI — subclassing EditorWindow/ScriptableWizard, laying out controls in OnGUI with EditorGUILayout, wiring MenuItem entries, persisting state via EditorPrefs, handling Undo and AssetDatabase mutations

---

## Window Types

| Type | When to Use |
|---|---|
| `EditorWindow` | Dockable window with persistent state, complex UI |
| `ScriptableWizard` | Step-by-step wizard with "Create"/"Apply" button |
| `PopupWindowContent` | Small transient popup near cursor |
| `EditorWindow` + `IHasCustomMenu` | Window with custom context menu items |

## File Location

Place scripts in `Assets/Editor/` directory. Use subfolders if they exist (`Assets/Editor/Tools/`, `Assets/Editor/Windows/`).

## IMGUI Best Practices

- Use `EditorGUILayout` for inspector-style controls (labeled fields, foldouts, toggles)
- Use `GUILayout` only for custom layout needs (buttons, flexible areas)
- Use `EditorGUI.BeginChangeCheck()` / `EndChangeCheck()` to track modifications
- Call `Repaint()` or use `wantsMouseMove = true` when UI needs frequent updates
- Use `SerializeField` + `ScriptableObject` or `EditorPrefs` for persistent state between sessions
- Handle `Undo.RecordObject()` before any object modifications
- Use `EditorUtility.SetDirty()` after modifying assets

## Layout Patterns

- `EditorGUILayout.BeginVertical("box")` / `EndVertical()` for grouped sections
- `EditorGUILayout.BeginHorizontal()` / `EndHorizontal()` for inline controls
- `EditorGUILayout.Space()` for visual separation
- `GUILayout.FlexibleSpace()` for alignment
- `EditorGUILayout.BeginScrollView()` / `EndScrollView()` for scrollable content
- `EditorGUILayout.Foldout(value, label, true)` for foldable sections

## Menu Integration

- Use `[MenuItem("chosen/menu/path")]` on a `static void` method
- For `EditorWindow`, call `GetWindow<T>()` to open
- Set `titleContent` with name and optional icon via `EditorGUIUtility.IconContent()`
- Shortcut format: `%` = Ctrl/Cmd, `#` = Shift, `&` = Alt (e.g. `%#e` = Ctrl+Shift+E)

### Common Menu Locations

1. **Tools/** — General-purpose utilities and helper tools
2. **Window/** — Dockable panels and persistent windows (e.g., `Window/Analysis/My Tool`)
3. **Assets/** — Tools that operate on project assets
4. **GameObject/** — Tools for scene object manipulation
5. **Component/** — Tools related to component management

## Error Handling

- Validate user input before operations
- `EditorUtility.DisplayDialog()` for confirmations on destructive actions
- `EditorUtility.DisplayProgressBar()` / `ClearProgressBar()` for long operations
- Wrap asset operations in `AssetDatabase.StartAssetEditing()` / `StopAssetEditing()` for batch performance

## Style Caching

No magic strings for repeated labels — use `GUIContent` or `const string`. Cache `GUIStyle` via lazy initialization:

```csharp
private GUIStyle _headerStyle;
private GUIStyle HeaderStyle => _headerStyle ??= new GUIStyle(EditorStyles.boldLabel)
{
    fontSize = 14,
    margin = new RectOffset(0, 0, 8, 4)
};
```

## Template

```csharp
using UnityEditor;
using UnityEngine;

namespace <ProjectNamespace>.Editor
{
    public sealed class <UtilityName>Window : EditorWindow
    {
        // === Serialized State ===
        private Vector2 _scrollPosition;

        // === Cached Styles ===
        private GUIStyle _headerStyle;
        private GUIStyle HeaderStyle => _headerStyle ??= new GUIStyle(EditorStyles.boldLabel)
        {
            fontSize = 14
        };

        [MenuItem("<MenuPath>")]  // e.g., "Tools/My Utility %#m"
        public static void ShowWindow()
        {
            var window = GetWindow<<UtilityName>Window>();
            window.titleContent = new GUIContent("<Display Name>",
                EditorGUIUtility.IconContent("d_UnityEditor.ConsoleWindow").image);
            window.minSize = new Vector2(300, 200);
            window.Show();
        }

        private void OnEnable()
        {
            // Initialize state, subscribe to events
        }

        private void OnDisable()
        {
            // Cleanup, unsubscribe from events
        }

        private void OnGUI()
        {
            _scrollPosition = EditorGUILayout.BeginScrollView(_scrollPosition);

            DrawHeader();
            EditorGUILayout.Space(4);
            DrawContent();
            EditorGUILayout.Space(4);
            DrawActions();

            EditorGUILayout.EndScrollView();
        }

        private void DrawHeader()
        {
            EditorGUILayout.LabelField("<Utility Name>", HeaderStyle);
            EditorGUILayout.LabelField("Description of what this utility does.",
                EditorStyles.wordWrappedMiniLabel);
            EditorGUILayout.Space(2);
            DrawUILine(Color.gray);
        }

        private void DrawContent()
        {
            // Main UI content here
        }

        private void DrawActions()
        {
            EditorGUILayout.BeginHorizontal();
            GUILayout.FlexibleSpace();

            if (GUILayout.Button("Execute", GUILayout.Width(120), GUILayout.Height(28)))
            {
                ExecuteAction();
            }

            EditorGUILayout.EndHorizontal();
        }

        private void ExecuteAction()
        {
            // Core logic
        }

        private static void DrawUILine(Color color, int thickness = 1, int padding = 10)
        {
            var rect = EditorGUILayout.GetControlRect(false, thickness + padding);
            rect.height = thickness;
            rect.y += padding / 2f;
            EditorGUI.DrawRect(rect, color);
        }
    }
}
```

## IMGUI Input Pitfalls

### TextField Consumes Enter Key Events

`TextField` (and `EditorGUILayout.TextField`) internally consumes `EventType.KeyDown` with `KeyCode.Return`. You cannot reliably intercept Enter key press on a TextField — the event is consumed before custom handler code runs.

**Fix:** Do not rely on Enter key interception. Use an explicit **"Apply" button** pattern instead — show a button when the value has uncommitted changes.

### Repaint After Paste and Drag-Drop

IMGUI does **not** trigger automatic repaint after:
- `ExecuteCommand("Paste")` (Ctrl+V)
- Drag-and-drop value changes
- Any value change that doesn't go through standard keyboard input

If your UI has conditional elements (e.g., an "Apply" button that appears when value differs from saved state), you must call `Repaint()` explicitly when such values change. Compare the current value against the last known value each frame and repaint on difference.

## Checklist

- [ ] File is in an `Editor/` folder
- [ ] `MenuItem` path matches the chosen menu location
- [ ] Keyboard shortcut is correct (if requested)
- [ ] All `Begin*` calls have matching `End*` calls
- [ ] No `GUILayout` group mismatches that would cause Unity errors
- [ ] `Undo` support for any object modifications
- [ ] `EditorPrefs` used for settings that should survive domain reload
- [ ] No allocations inside `OnGUI` hot path (cache GUIContent, GUIStyle)
- [ ] Namespace matches project conventions
- [ ] All required `using` directives are present
