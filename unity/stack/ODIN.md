---
version: 1.0.0
---

# Odin Inspector & Odin Validator

> **Scope**: Rules for Odin Inspector attributes (grouping, validation, conditional visibility) and Odin Validator (ISelfValidator, SceneValidator, RootObjectValidator, WithFix).
> **Load when**: adding inspector attributes like [ShowIf], [Required], [BoxGroup], [Title], validation, ISelfValidator, SceneValidator.

---

## Inspector Attributes

### Grouping & Organization

- `[Title("...")]` — visual section separators
- `[BoxGroup("...")]` — logical grouping in a frame
- `[FoldoutGroup("...")]` — collapsible groups
- `[TabGroup("...", "...")]` — tab-separated fields. Use `[TabGroup]` for mutually exclusive sections (Show/Hide, Day/Night). Use `[FoldoutGroup]` for optional/collapsible content. Never use `[FoldoutGroup]` for mutually exclusive sections
- `[HorizontalGroup]` / `[VerticalGroup]` — row/column layout

### Required References

- `[Required]` — all SerializeField object references that must be assigned
- `[Required("Custom error message")]` — descriptive error
- `[ChildGameObjectsOnly]` — references to child objects only
- `[SceneObjectsOnly]` — scene objects only
- `[AssetsOnly]` — project assets only (prefabs, ScriptableObject)

```csharp
[SerializeField, Required] private Transform _spawnPoint;
[SerializeField, Required("Health bar view is required")] private HealthBarView _healthBar;
[SerializeField, ChildGameObjectsOnly] private Collider _hitbox;
[SerializeField, AssetsOnly] private GameObject _prefab;
```

### Conditional Visibility

- `[ShowIf]` / `[HideIf]` — conditional field display
- `[EnableIf]` / `[DisableIf]` — conditional field enable/disable
- Supports field names, method names, and `@` expressions

### Display & ReadOnly

- `[ShowInInspector]` — display in inspector WITHOUT serialization
- `[ReadOnly]` — visible but not editable
- NEVER confuse `[ShowInInspector]` with `[SerializeField]` — ShowInInspector does NOT serialize
- Struct fields displayed with `[Title("X")]` MUST also have `[HideLabel, InlineProperty]` on the field — otherwise Odin shows both the Title and the field name (duplication). Use `[InlineProperty, HideLabel]` for struct fields inside `[TabGroup]` to avoid unnecessary foldouts

### Value Validation

- `[ValidateInput]` — custom field validation in inspector
- `[MinValue]` / `[MaxValue]` / `[PropertyRange]` — numeric constraints
- `[InfoBox]` — hints and warnings

### Enums & Selection

- `[EnumToggleButtons]` — enum selection via buttons (prefer for 2-5 values)
- `[ValueDropdown]` — dropdown with predefined values

### Collections

- `[TableList]` — display lists as table
- `[ListDrawerSettings]` — list display settings (pagination, drag, labels)

### Buttons

- `[Button]` — quick actions in inspector (testing, data filling). Editor-only
- `[Button]` methods in runtime classes (MonoBehaviour/ScriptableObject) that call Editor-only API (`AssetDatabase`, `EditorUtility`, `Selection`) MUST wrap the method body in `#if UNITY_EDITOR`

### Inline Editing

- `[InlineEditor]` — inline editing of ScriptableObject in parent inspector
- ScriptableObject reference fields intended for in-place editing MUST use `[InlineEditor(InlineEditorObjectFieldModes.Foldout)]` — displays ObjectField with expandable arrow for inline editing

### File Paths

- `[FilePath]` / `[FolderPath]` — fields with file picker

### Callbacks

- `[OnValueChanged]` — react to value changes in inspector
- `[OnInspectorInit]` / `[OnInspectorDispose]` — editor data init/cleanup

## Validator

### ISelfValidator — In-Class Validation

Simplest way. Interface in `Sirenix.OdinInspector` (not Editor), works in runtime code without `#if UNITY_EDITOR`. No registration required — auto-discovered.

ALWAYS implement as `void ISelfValidator.Validate(SelfValidationResult result)`.

```csharp
public sealed class EnemySpawner : MonoBehaviour, ISelfValidator
{
    [SerializeField, Required] private Transform _spawnPoint;
    [SerializeField, Required] private GameObject _enemyPrefab;

    public void Validate(SelfValidationResult result)
    {
        if (_spawnPoint == null)
            result.AddError("Spawn point is not assigned");

        if (_enemyPrefab != null && _enemyPrefab.GetComponent<EnemyView>() == null)
            result.AddError($"Prefab \"{_enemyPrefab.name}\" must have EnemyView component");
    }
}
```

**SelfValidationResult methods:** `AddError("...")`, `AddWarning("...")`. Chain: `.WithFix()`, `.WithButton()`, `.WithMetaData()`, `.WithSceneGUI()`, `.EnableRichText()`

### SceneValidator

Checks scene contents. Requires `[assembly: RegisterValidator]`.

```csharp
[assembly: RegisterValidator(typeof(SingleEventSystemValidator))]

public sealed class SingleEventSystemValidator : SceneValidator
{
    protected override void Validate(ValidationResult result)
    {
        var eventSystems = FindAllComponentsInSceneOfType<EventSystem>(includeInactive: false);
        int count = 0;
        foreach (var es in eventSystems) count++;

        if (count > 1)
            result.AddError($"Scene has {count} active EventSystem components. Must be exactly 1.");
    }
}
```

### RootObjectValidator<T>

Checks specific Unity object type (ScriptableObject, Component, Material). Requires `[assembly: RegisterValidator]`.

### ValueValidator<T>

Checks ALL values of a specific type across the entire project. Requires `[assembly: RegisterValidator]`.

### AttributeValidator

Checks fields marked with a specific attribute. Requires `[assembly: RegisterValidator]`.

### WithFix — Auto-Fixes

Always add `.WithFix()` to errors that can be fixed automatically:

```csharp
result.AddError("Speed must be non-negative")
    .WithFix("Set to 0", () => _speed = 0);
```

## Best Practices

### Inspector
1. Group related fields via `[Title]`, `[BoxGroup]`, `[FoldoutGroup]`
2. Mark all required references with `[Required]`
3. Constrain references by context — `[AssetsOnly]`, `[SceneObjectsOnly]`, `[ChildGameObjectsOnly]`
4. Constrain numeric values — `[MinValue]`, `[MaxValue]`, `[PropertyRange]`
5. Use conditional visibility — `[ShowIf]`/`[HideIf]` for clean inspector
6. Do NOT use `[ShowInInspector]` for data that should be saved
7. Use `[ReadOnly]` for debug fields

### Validator
1. Use `ISelfValidator` for MonoBehaviour/ScriptableObject validation — simplest, no registration
2. Use `SceneValidator` for scene integrity checks
3. Use `RootObjectValidator<T>` for specific component type checks
4. Always add `.WithFix()` to auto-fixable errors
5. Place custom validators (SceneValidator, RootObjectValidator) in `Editor/` folder
6. ISelfValidator can be placed in runtime code
