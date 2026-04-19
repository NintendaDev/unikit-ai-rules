---
version: 1.0.0
---

# NaughtyAttributes

> **Scope**: NaughtyAttributes Unity Inspector extension — drawer, meta, and validator attributes for customizing serialized fields, methods, and non-serialized properties without writing custom editors or property drawers.
> **Load when**: customizing Unity Inspector fields, adding inspector buttons to methods, conditionally showing or hiding fields, grouping inspector fields with BoxGroup or Foldout, validating serialized field values, working with NaughtyInspector in custom editors, annotating fields with dropdowns or tags.

---

## Installation

```
// Package: com.dbrizov.naughtyattributes
// Requires Unity 2022.3+

// Option A — OpenUPM CLI
openupm add com.dbrizov.naughtyattributes

// Option B — manifest.json (Git URL)
"com.dbrizov.naughtyattributes": "https://github.com/dbrizov/NaughtyAttributes.git#upm"
```

Always import the namespace at the top of the file:

```csharp
using NaughtyAttributes;
```

---

## Attribute Categories

NaughtyAttributes has four categories with different composition rules:

| Category | Stack multiple? | Applies to |
|----------|----------------|------------|
| **Drawer** | No — only the bottom-most one renders | Serialized fields, non-serialized fields, methods |
| **Meta** | Yes — freely combinable | Serialized fields |
| **Validator** | Yes — freely combinable | Serialized fields |
| **Special** | — | Nested serializable types (`AllowNesting`) |

---

## Drawer Attributes

Only **one** DrawerAttribute renders per field. If multiple are stacked, only the bottom-most one applies. All others are silently ignored.

### Visual Decorators

```csharp
// InfoBox — descriptive message above a field
[InfoBox("Clamped to [0, 100] range", EInfoBoxType.Normal)] // Normal / Warning / Error
public int health;

// HorizontalLine — visual separator between fields
[HorizontalLine(color: EColor.Gray)]
public int separator;
```

### Data Visualizers

```csharp
// ProgressBar — render an int/float field as a labeled progress bar
[ProgressBar("Health", 100, EColor.Red)]
public int currentHealth;

// MinMaxSlider — dual-handle slider mapped to Vector2 (x = min, y = max)
[MinMaxSlider(0f, 100f)]
public Vector2 speedRange;

// CurveRange — constrain AnimationCurve to a bounding rectangle
[CurveRange(0, 0, 1, 1, EColor.Green)]
public AnimationCurve curve;

// ShowAssetPreview — renders a texture/sprite thumbnail
[ShowAssetPreview(width: 128, height: 128)]
public Sprite icon;

// Expandable — expand a ScriptableObject reference inline
[Expandable]
public ItemConfig config;
```

### Text & Collections

```csharp
// ResizableTextArea — multiline expandable text area
[ResizableTextArea]
public string description;

// ReorderableList — drag-to-reorder array or List<T>
[ReorderableList]
public List<Transform> waypoints;

// EnumFlags — multi-select bitmask enum via checklist
[EnumFlags]
public DamageType damageFlags;
```

### Unity Type Selectors

One-liner selectors — replace magic strings and integer indices with dropdowns:

```csharp
[Tag]          public string targetTag;
[Layer]        public int targetLayer;
[Scene]        public string sceneName;
[SortingLayer] public string sortingLayerName;
[InputAxis]    public string inputAxis;

// AnimatorParam — picks a parameter from a referenced Animator
[AnimatorParam("animator")]
public string triggerName;
private Animator animator;
```

### Dropdown

Source can be: a field (array or `List<T>`), a property, or a method returning `IList` or `DropdownList<T>`:

```csharp
// From array field
[Dropdown("weaponTypes")]
public string selectedWeapon;
private string[] weaponTypes = { "Sword", "Bow", "Staff" };

// From method with display-name → value mapping
[Dropdown("GetDirections")]
public Vector3 spawnDir;
private DropdownList<Vector3> GetDirections() => new DropdownList<Vector3>
{
    { "Right",   Vector3.right   },
    { "Forward", Vector3.forward },
    { "Up",      Vector3.up      },
};
```

### ShowNativeProperty / ShowNonSerializedField

Display read-only extra data in the inspector without serializing it:

```csharp
// ShowNativeProperty — render a C# property value
[ShowNativeProperty]
public string Status => $"HP: {health} | Active: {gameObject.activeSelf}";

// ShowNonSerializedField — render a non-serialized field
[ShowNonSerializedField]
private int framesSinceSpawn;
```

**Supported types:** `bool`, `int`, `long`, `float`, `double`, `string`, `Vector2`, `Vector3`, `Vector4`, `Color`, `Bounds`, `Rect`, `UnityEngine.Object` subtypes.

Non-static fields refresh only after pressing Play in the Editor. Static fields refresh at compile time.

### Button

Renders a clickable button for a method directly in the Inspector:

```csharp
[Button]
private void ResetStats() { /* ... */ }

// Custom button label
[Button("Apply Config")]
private void ApplyConfig() { /* ... */ }

// EButtonEnableMode: Always (default) | Editor | Playmode
[Button("Damage", EButtonEnableMode.Playmode)]
private void SimulateDamage() { health -= 10; }

[Button("Generate Data", EButtonEnableMode.Editor)]
private static void GenerateTestData() { /* ... */ }
```

---

## Meta Attributes

Meta attributes can be **freely stacked** — multiple may be applied to the same field.

### Visibility — ShowIf / HideIf

```csharp
public bool isRanged;

// Single boolean field condition
[ShowIf("isRanged")]
public int ammoCount;

[HideIf("isRanged")]
public string meleeAttack;

// Method as condition (must return bool)
[ShowIf("HasAmmo")]
public float reloadTime;
private bool HasAmmo() => ammoCount > 0;

// Compound conditions with And / Or
[ShowIf(EConditionOperator.And, "isRanged", "isAutomatic")]
public float fireRate;

[ShowIf(EConditionOperator.Or, "isRanged", "canThrow")]
public GameObject projectilePrefab;
```

### Interactivity — EnableIf / DisableIf

Same API as ShowIf/HideIf. The field remains visible but is grayed out (not editable):

```csharp
public bool debugMode;

[EnableIf("debugMode")]
public int debugLevel;

[EnableIf(EConditionOperator.And, "flag0", "flag1")]
public int enabledWhenBoth;

[DisableIf("isLocked")]
public float editableValue;
```

### Grouping — BoxGroup / Foldout

```csharp
// BoxGroup — draws a labeled box around a group of fields
[BoxGroup("Movement")]
public float speed;

[BoxGroup("Movement")]
public float acceleration;

// Foldout — collapsible group
[Foldout("Advanced Settings")]
public float drag;

[Foldout("Advanced Settings")]
public bool useGravity;
```

### Other Meta Attributes

```csharp
// ReadOnly — visible but not editable in inspector
[ReadOnly]
public int spawnCount;

// Label — override the displayed field label
[Label("Maximum HP")]
public int maxHealth;

// OnValueChanged — callback when value changes in Inspector
// NOTE: fires only when changed from Inspector, not from code
[OnValueChanged("OnSpeedChanged")]
public float movementSpeed;
private void OnSpeedChanged() => ApplySpeedChanges();
```

---

## Validator Attributes

Validator attributes enforce constraints and show warnings in the Inspector when rules are violated. Multiple validators can be stacked on one field.

```csharp
// MinValue / MaxValue — clamp int or float values
[MinValue(0), MaxValue(100)]
public int health;

[MinValue(0f)]
public float speed;

// Required — warn if a reference-type field is null
[Required]
public Transform spawnPoint;

[Required("Camera reference is required!")]
public Camera mainCamera;

// RequiredType — validate that a GameObject has a specific component or interface
[RequiredType(typeof(IEnemy))]
public GameObject enemyRef;

// ValidateInput — custom validation via callback (must return bool)
[ValidateInput("IsPositive", "Must be a positive value")]
public int spawnCount;
private bool IsPositive(int value) => value > 0;
```

---

## Special Attributes

### AllowNesting

Required when using **meta attributes** (`ShowIf`, `EnableIf`, etc.) inside a **nested serializable struct or class**. Without it the meta attribute is silently ignored.

```csharp
[System.Serializable]
public struct WeaponConfig
{
    public bool enableDamage;

    [EnableIf("enableDamage")]
    [AllowNesting]  // Required — tells NaughtyAttributes to look up the chain
    public int damageAmount;
}

public class Weapon : MonoBehaviour
{
    public WeaponConfig config;
}
```

---

## Custom Editor Integration

Most DrawerAttributes work automatically via Unity's `CustomPropertyDrawer` system and do not require anything special in custom editors.

**The following require inheriting from `NaughtyInspector` in your custom editor:**
- `Button`
- `ReorderableList`
- `ShowNonSerializedField`
- `ShowNativeProperty`
- All **Meta** attributes (`ShowIf`, `EnableIf`, `BoxGroup`, `Foldout`, `ReadOnly`, `OnValueChanged`, `Label`)

```csharp
#if UNITY_EDITOR
using UnityEditor;
using NaughtyAttributes.Editor;

[CustomEditor(typeof(MyComponent))]
public class MyComponentEditor : NaughtyInspector
{
    public override void OnInspectorGUI()
    {
        base.OnInspectorGUI();  // Renders all NaughtyAttributes normally

        EditorGUILayout.Space();
        if (GUILayout.Button("Custom Action"))
            Debug.Log("Custom editor button clicked");
    }
}
#endif
```

---

## Anti-patterns

**Stacking multiple DrawerAttributes on one field**

```csharp
// Wrong — only ProgressBar renders; ReorderableList is ignored
[ReorderableList]
[ProgressBar("Health", 100)]
public int health;

// Correct — one DrawerAttribute per field
[ProgressBar("Health", 100, EColor.Red)]
public int health;
```

**Forgetting AllowNesting inside serializable structs**

```csharp
// Wrong — ShowIf is silently ignored inside nested struct
[System.Serializable]
public struct Config
{
    public bool enabled;
    [ShowIf("enabled")]   // Has no effect without AllowNesting
    public int value;
}

// Correct
[System.Serializable]
public struct Config
{
    public bool enabled;
    [ShowIf("enabled")]
    [AllowNesting]
    public int value;
}
```

**Expecting OnValueChanged to fire from code**

```csharp
// Wrong — callback does NOT fire when assigned from code
movementSpeed = 5f;

// Correct — add explicit logic in the setter or call the callback manually
// OnValueChanged only fires when the user edits the field in Inspector
```

**Using ShowNativeProperty with unsupported types**

```csharp
// Wrong — custom class will not render
[ShowNativeProperty]
public MyData data => myData;  // Does nothing

// Correct — convert to a supported type first
[ShowNativeProperty]
public string DataSummary => myData.ToString();
```

**Omitting NaughtyInspector in a custom editor**

```csharp
// Wrong — meta attributes and Button will be silently skipped
[CustomEditor(typeof(MyComp))]
public class MyEditor : Editor
{
    public override void OnInspectorGUI()
    {
        DrawDefaultInspector();  // NaughtyAttributes meta/button logic not invoked
    }
}

// Correct
[CustomEditor(typeof(MyComp))]
public class MyEditor : NaughtyInspector { ... }
```
