---
version: 1.0.0
---

# Editor Windows & Tools (Odin)

> **Scope**: Rules for creating editor windows and tools using OdinEditorWindow, OdinMenuEditorWindow, PropertyTree, Proxy ScriptableObject pattern, split layouts, EditorPrefs persistence.
> **Load when**: creating editor windows, custom inspectors, OdinEditorWindow, OdinMenuEditorWindow, editor tools with Odin.
> **Dependencies**: also read ODIN.md for basic Odin attributes.

---

## OdinEditorWindow — Custom Editor Windows

### CRITICAL: NEVER Override OnGUI() Without base.OnGUI()

`OdinEditorWindow.OnGUI()` performs critical GUIHelper initialization, IMGUI event handling, and state management. Without `base.OnGUI()`, all interactive elements stop responding.

**Use `DrawEditors()` for custom UI instead.**

### Template

```csharp
using Sirenix.OdinInspector.Editor;
using UnityEditor;
using UnityEngine;

internal sealed class MyEditorWindow : OdinEditorWindow
{
    [MenuItem("Tools/My Editor")]
    private static void ShowWindow()
    {
        var window = GetWindow<MyEditorWindow>("My Editor");
        window.minSize = new Vector2(600f, 400f);
        window.Show();
    }

    protected override void OnEnable()
    {
        base.OnEnable();
        UseScrollView = false; // Disable if managing scroll yourself
    }

    protected override void OnDestroy()
    {
        // Cleanup resources
        base.OnDestroy();
    }

    protected override void DrawEditors()
    {
        EditorGUILayout.LabelField("My Editor Content", EditorStyles.boldLabel);
    }
}
```

### UseScrollView

Default: wraps `DrawEditors()` in ScrollView. Disable for custom ScrollView or split layout:

```csharp
protected override void OnEnable()
{
    base.OnEnable();
    UseScrollView = false;
}
```

## OdinMenuEditorWindow — Side Menu Windows

Adds tree menu on left and editing area on right.

```csharp
public sealed class MyMenuEditorWindow : OdinMenuEditorWindow
{
    protected override OdinMenuTree BuildMenuTree()
    {
        var tree = new OdinMenuTree(supportsMultiSelect: false)
        {
            Config = { DrawSearchToolbar = true, AutoHandleKeyboardNavigation = true },
            DefaultMenuStyle = { Height = 28 }
        };

        tree.Add("Section A", new SectionAData());
        tree.Add("Section B", new SectionBData());

        return tree;
    }
}
```

Rebuild tree: `ForceMenuTreeRebuild()`. Access: `MenuTree`, `tree.Selection`.

## PropertyTree — Manual Odin Inspector Rendering

For rendering Odin Inspector on arbitrary objects:

```csharp
private PropertyTree _propertyTree;

private void CreatePropertyTree()
{
    _propertyTree?.Dispose();
    _propertyTree = PropertyTree.Create(_target);
}

private void DrawPropertyTreeUI()
{
    if (_propertyTree == null) return;

    _propertyTree.BeginDraw(false);
    _propertyTree.DrawProperties();

    if (_propertyTree.ApplyChanges()) { /* Data changed — mark dirty */ }

    _propertyTree.EndDraw();
}

// MANDATORY — Dispose in OnDestroy
protected override void OnDestroy()
{
    _propertyTree?.Dispose();
    _propertyTree = null;
    base.OnDestroy();
}
```

## Proxy ScriptableObject Pattern

For rendering `[SerializeReference]` fields via Odin (type picker dropdown):

1. Create proxy SO with `[SerializeReference]` fields
2. On selection — copy data from source to proxy (`LoadFrom`)
3. On save — copy back from proxy to source (`ApplyTo`)
4. Render proxy via `PropertyTree`

Lifecycle: create in `OnEnable` with `HideFlags.HideAndDontSave`, `DestroyImmediate` in `OnDestroy`.

## Split Layout Pattern

```csharp
private float _splitPosition = 250f;

protected override void DrawEditors()
{
    EditorGUILayout.BeginHorizontal();

    EditorGUILayout.BeginVertical(GUILayout.Width(_splitPosition));
    DrawLeftPanel();
    EditorGUILayout.EndVertical();

    DrawSplitSeparator();

    EditorGUILayout.BeginVertical();
    DrawRightPanel();
    EditorGUILayout.EndVertical();

    EditorGUILayout.EndHorizontal();
}
```

**Critical for split separator:** `GUIUtility.GetControlID` MUST be called every frame (not conditionally). Handle events ONLY for your controlId. Never reset `hotControl = 0` on MouseUp unconditionally.

## Partial Classes for Large Windows

Split by functionality:

```
Assets/Editor/MyFeature/
  MyEditorWindow.cs                — class, OnEnable, OnDestroy, DrawEditors
  MyEditorWindow_LeftPanel.cs      — UI constants, left panel drawing
  MyEditorWindow_RightPanel.cs     — right panel drawing, status bar
  MyEditorWindow_Data.cs           — data logic, filtering, CRUD
  MyEditorWindow_Persistence.cs    — EditorPrefs save/restore
```

## EditorPrefs State Persistence

```csharp
private const string PrefsPrefix = "MyEditor_";

private void LoadSettings()
{
    _splitPosition = EditorPrefs.GetFloat(PrefsPrefix + "Split", 250f);
    string guid = EditorPrefs.GetString(PrefsPrefix + "DatabaseGuid", string.Empty);
    if (string.IsNullOrEmpty(guid) == false)
    {
        string path = AssetDatabase.GUIDToAssetPath(guid);
        if (string.IsNullOrEmpty(path) == false)
            _database = AssetDatabase.LoadAssetAtPath<MyDatabase>(path);
    }
}
```

Use GUID instead of paths for asset references in EditorPrefs.

## Unsaved Changes Handling

Use `EditorUtility.DisplayDialogComplex("Unsaved Changes", ...)` with Apply/Discard/Cancel on item selection change and `OnDestroy`.

## Critical Pitfalls: AssetDatabase & State in OdinEditorWindow

### NEVER Call AssetDatabase Mutations During IMGUI Event Processing

`AssetDatabase.RenameAsset`, `MoveAsset`, `DeleteAsset`, and `CreateAsset` + `SaveAssets` silently fail or cause unpredictable behavior when called during IMGUI event processing (inside `DrawEditors()`, `DrawGUI()`, or any method called from `OnGUI()`).

**Pattern — field-based deferred execution:**

```csharp
// Queue the operation
private string _pendingRenamePath;
private string _pendingRenameNewName;

private void RequestRename(string path, string newName)
{
    _pendingRenamePath = path;
    _pendingRenameNewName = newName;
}

// Execute at start of DrawGUI/DrawEditors — BEFORE any IMGUI controls
protected override void DrawEditors()
{
    ProcessPendingRename(); // Deferred execution first
    // ... normal IMGUI drawing
}

private void ProcessPendingRename()
{
    if (_pendingRenamePath == null) return;
    AssetDatabase.RenameAsset(_pendingRenamePath, _pendingRenameNewName);
    AssetDatabase.SaveAssets();
    _pendingRenamePath = null;
    // Refresh all SerializedObject instances and selection state here
}
```

Apply the same pattern for Delete, Move, and Create+Save operations. Also call deferred handlers from `Dispose()`/`OnDestroy()` for cleanup on window close.

### EditorApplication.delayCall Is Unreliable in OdinEditorWindow

`EditorApplication.delayCall` may not fire while OdinEditorWindow is actively drawing (continuous repaints block the callback). **Do not use it for deferred operations** — use field-based queuing (above) instead.

### CreateAsset in OdinMenuEditorWindow Triggers BuildMenuTree

`AssetDatabase.CreateAsset()` + `SaveAssets()` inside `OdinMenuEditorWindow` triggers `BuildMenuTree()`, which **recreates all section instances** with default state. Any state stored on a section instance (selection index, editing flags) is lost.

**Fix:** Store post-creation state (e.g., pending selection GUID) on the **EditorWindow** itself (which survives tree rebuilds), not on section instances. Process it in the new section's `DrawGUI()`.

### PropertyTree Resets Fields of [Serializable] Classes

Odin `PropertyTree` resets field values of `[Serializable]` classes between IMGUI event passes via reflection/deep copy. This bypasses:
- Property setters
- `[NonSerialized]` attribute
- Any C# access control

**Never store mutable state** (selection index, editing name, flags) on `[Serializable]` classes used in Odin PropertyTree or OdinMenuEditorWindow menu items.

**Fix:** Store such state on the `EditorWindow` itself with `[NonSerialized]` (to skip Unity serialization) and access via property/delegate from the section class.

### Refresh State After AssetDatabase Operations

After **any** `AssetDatabase` mutation (Create, Rename, Move, Delete), explicitly:
1. Refresh all `SerializedObject` instances (`serializedObject.Update()` or recreate)
2. Refresh selection state (re-find the selected item, update index)
3. Call `Repaint()` on the window

### [Required] Does Not Work in Custom IMGUI Editors

Odin's `[Required]` attribute only fires validation in the **default ScriptableObject inspector**. Custom IMGUI-based editors that render fields via `SerializedProperty` or `EditorGUILayout` must replicate validation manually:

```csharp
private void DrawPrefabField()
{
    EditorGUILayout.PropertyField(_prefabProp);
    if (IsPrefabMissing())
        EditorGUILayout.HelpBox("Prefab is required.", MessageType.Error);
}
```

## Checklist

- [ ] Inherit from `OdinEditorWindow` or `OdinMenuEditorWindow`
- [ ] Do NOT override `OnGUI()` — use `DrawEditors()`
- [ ] Set `UseScrollView = false` for custom scroll/split layout
- [ ] Call `base.OnEnable()` and `base.OnDestroy()` in overrides
- [ ] `Dispose()` all `PropertyTree` in `OnDestroy()`
- [ ] `DestroyImmediate()` all proxy `ScriptableObject` in `OnDestroy()`
- [ ] Use `EditorPrefs` for window state (GUID for assets)
- [ ] Handle unsaved changes on selection change and window close
- [ ] Split large windows into partial files
- [ ] Mark proxy SO as `HideFlags.HideAndDontSave`
- [ ] Use `[MenuItem("Tools/...")]` for menu access
