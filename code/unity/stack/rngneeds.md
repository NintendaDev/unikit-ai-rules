---
version: 1.0.0
---

# RNGNeeds Rules

> **Scope**: Rules for RNGNeeds plugin — ProbabilityList<T>, weighted random selection, pick methods, item management, influence providers, seeding.
> **Load when**: implementing weighted random selection with RNGNeeds — declaring ProbabilityList<T> fields, picking values via TryPickValue/PickValues, configuring repeat-prevention and depletable items, plugging in seed providers or IProbabilityInfluenceProvider for dynamic weighting

---

RNGNeeds — plugin for probability lists (`ProbabilityList<T>`) in Unity.

## Declaration & Serialization

```csharp
using RNGNeeds;

// Serialized field in MonoBehaviour/ScriptableObject
[SerializeField] private ProbabilityList<GameObject> _obstacles;

// Creation from code
var lootTable = new ProbabilityList<string>();
lootTable.AddItem("Common", 0.6f);
lootTable.AddItem("Rare", 0.3f);
lootTable.AddItem("Legendary", 0.1f);
lootTable.NormalizeProbabilities();
```

## Adding & Removing Items

```csharp
// With explicit probability — requires NormalizeProbabilities() after
list.AddItem("ItemA", 0.5f);
list.NormalizeProbabilities();

// Without probability — normalization automatic
list.AddItem("ItemC");

// Bulk add
list.AddItems(new List<string> { "X", "Y", "Z" }, enabled: true, locked: false);

// Removal
list.RemoveItem("ItemA");
list.RemoveItemAtIndex(0);
```

## Picking Values

```csharp
// Safe single pick
if (list.TryPickValue(out var value)) { /* handle value */ }

// With index
if (list.TryPickValueWithIndex(out var value, out var index)) { /* ... */ }

// Multiple picks
List<string> results = list.PickValues(5);
List<string> results = list.PickValues(2, 4); // random count 2-4
```

## Item Management

```csharp
list.SetItemEnabled(index, false);
list.SetAllItemsEnabled(true);
list.SetItemLocked(index, true);
list.SetItemBaseProbability(index, 0.3f);
list.AdjustItemBaseProbability(index, 0.05f);
```

## Repeat Prevention

| Method | Speed | Guarantee |
|--------|-------|-----------|
| `Spread` | Fast | Yes |
| `Repick` | Medium | Yes |
| `Shuffle` | Slow | No |

```csharp
list.PreventRepeat = PreventRepeatMethod.Spread;
```

## Depletable Lists

```csharp
var item = list.GetProbabilityItem(index);
item.Units = 15;
item.MaxUnits = 20;
list.RefillItems();
```

## Seeding

```csharp
list.KeepSeed = true;
list.Seed = 1337;

// Custom provider
RNGNeedsCore.SetSeedProvider(new CustomSeedProvider());
```

## Influence Providers

Implement `IProbabilityInfluenceProvider` for dynamic probability changes based on external factors.

```csharp
public sealed class HealthInfluenceProvider : MonoBehaviour, IProbabilityInfluenceProvider
{
    public float ProbabilityInfluence => HealthPercentage.Remap(0, 1, 1, -1);
    public string InfluenceInfo => $"Health: {HealthPercentage:P2}";
}
```

## Best Practices

1. Prefer `TryPickValue` over `PickValue`
2. Call `NormalizeProbabilities()` after bulk additions with explicit probabilities
3. Use `MaintainPickCountIfDisabled = true` for guaranteed result count
4. Configure lists in inspector when possible
5. Don't modify probabilities in hot paths (Update)
6. Cache `PickValues()` results — don't call repeatedly without need
7. Use Influence Providers for dynamic probabilities
8. Register custom Seed Provider once at app start (bootstrap)
9. Choose `Spread` for minimal distortion, `Shuffle` for multi-picks
10. Avoid creating `ProbabilityList` in Update — create once and reuse
