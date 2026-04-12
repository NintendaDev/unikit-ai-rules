# ASPID MVVM StarterKit — Converters Reference

Namespace: `Aspid.MVVM.StarterKit`

## Base

```csharp
public interface IConverter<in TFrom, out TTo> { TTo Convert(TFrom value); }
```

| Class | Description |
|-------|-------------|
| `GenericFuncConverter<TFrom, TTo>` | Wraps `Func<TFrom, TTo>` as `IConverter` |
| `SequenceConverters<T>` | Chains `IConverter<T, T>[]` sequentially. `[SerializeReference]` |
| `.ToConvert()` | Extension: `Func` -> `IConverter` |
| `.ToConvertSpecific()` | Extension: generic `IConverter` -> specific interface alias |

---

## Bool Converters

| Interface | Signature |
|-----------|-----------|
| `IConverterFloatToBool` | `float -> bool` |
| `IConverterDoubleToBool` | `double -> bool` |
| `IConverterIntToBool` | `int -> bool` |
| `IConverterLongToBool` | `long -> bool` |
| `IConverterObjectToBool` | `object? -> bool` |
| `IConverterStringToBool` | `string? -> bool` |

| Implementation | Interfaces | Fields | Behaviour |
|----------------|-----------|--------|-----------|
| `NumberToBoolConverter` | Float/Double/Int/Long ToBool | `Comparisons`, `float` | Сравнение числа с порогом |
| `ObjectNullToBoolConverter` | ObjectToBool | `bool _isInvert` | `true` если `null` |
| `StringEmptyToBoolConverter` | StringToBool | `bool _isInvert` | `true` если пустая строка |

**Comparisons**: `Equal`, `Inequality`, `LessThan`, `GreaterThan`, `LessThanOrEqual`, `GreaterThanOrEqual`

---

## Number Converters

Полная матрица 4x4 — все комбинации `int`, `long`, `float`, `double`:

| From \ To | int | long | float | double |
|-----------|-----|------|-------|--------|
| **int** | `IConverterInt` | `IConverterIntToLong` | `IConverterIntToFloat` | `IConverterIntToDouble` |
| **long** | `IConverterLongToInt` | `IConverterLong` | `IConverterLongToFloat` | `IConverterLongToDouble` |
| **float** | `IConverterFloatToInt` | `IConverterFloatToLong` | `IConverterFloat` | `IConverterFloatToDouble` |
| **double** | `IConverterDoubleToInt` | `IConverterDoubleToLong` | `IConverterDoubleToFloat` | `IConverterDouble` |

| Implementation | Fields | Behaviour |
|----------------|--------|-----------|
| `ArithmeticNumberConverter` | `NumberOperation`, `double` | Реализует все 16 интерфейсов. Логика на `double`, каст в целевой тип |

**NumberOperation**: `Plus`, `Minus`, `Division`, `Multiply`

---

## String Converters

| Interface | Signature |
|-----------|-----------|
| `IConverterString` | `string? -> string?` |
| `IConverterObjectToString` | `object? -> string?` |
| `IConverterTimeSpanToString` | `TimeSpan -> string?` |

| Implementation | Interface | Fields | Behaviour |
|----------------|----------|--------|-----------|
| `GenericToString<TFrom>` | `IConverter<TFrom?, string?>` | `string? _format` | `string.Format` или `ToString()` |
| `ObjectToStringConverter` | ObjectToString | — | Наследник `GenericToString<object?>` |
| `TimeSpanToStringConverter` | TimeSpanToString | — | Наследник `GenericToString<TimeSpan>` |
| `StringFormatConverter` | String | `string _format` | `string.Format(_format, value)` |

---

## Color Converters (Unity)

| Interface | Signature |
|-----------|-----------|
| `IConverterColor` | `Color -> Color` |
| `IConverterStringToColor` | `string? -> Color` |

| Implementation | Interface | Fields | Behaviour |
|----------------|----------|--------|-----------|
| `ParseHtmlStringConverter` | StringToColor | `bool _isThrowException`, `Color _defaultColor` | `ColorUtility.TryParseHtmlString` |

---

## Vector Converters (Unity)

| Interface | Signature |
|-----------|-----------|
| `IConverterVector2` | `Vector2 -> Vector2` |
| `IConverterVector3` | `Vector3 -> Vector3` |
| `IConverterVector2ToVector3` | `Vector2 -> Vector3` |
| `IConverterVector3ToVector2` | `Vector3 -> Vector2` |

| Implementation | Interface | Fields | Behaviour |
|----------------|----------|--------|-----------|
| `Vector2SubstitutionConverter` | Vector2 | `Mode` | Swizzle: `XY`, `YX`, `XX`, `YY` |
| `Vector3SubstitutionConverter` | Vector3 | `Mode` | Swizzle: 27 режимов (все перестановки с повторами) |
| `Vector3ToVector2Converter` | Vector3ToVector2 | `Values` | Выбор 2 осей: `XY`, `XZ`, `YX`, `YZ`, `ZX`, `ZY` |
| `Vector2ToVector3Converter` | Vector2ToVector3 | `Values`, `float _thirdValue` | Маппинг на плоскость: `XY`, `XZ`, `YZ` |

### Combine (standalone, не IConverter)

Слияние `from` в `to` по выбранным осям. Поддержка pre/post конвертера.

| Class | Signature | Modes |
|-------|-----------|-------|
| `Vector2CombineConverter` | `(Vector2 from, Vector2 to) -> Vector2` | `X`, `Y`, `XY` |
| `Vector3CombineConverter` | `(Vector3 from, Vector3 to) -> Vector3` | `X`, `Y`, `Z`, `XY`, `XZ`, `YZ`, `XYZ` |

---

## Unity Asset Converters (только интерфейсы)

Нет готовых реализаций — создавать через `.ToConvert()`.

| Interface | Signature |
|-----------|-----------|
| `IConverterMesh` | `Mesh? -> Mesh?` |
| `IConverterMaterial` | `Material? -> Material?` |
| `IConverterQuaternion` | `Quaternion -> Quaternion` |
| `IConverterPhysicsMaterial` | `PhysicsMaterial? -> PhysicsMaterial?` |

---

## Quick Lookup: From -> To

| From | To | Interface | Implementation |
|------|----|-----------|----------------|
| `float/double/int/long` | `bool` | `IConverter{Type}ToBool` | `NumberToBoolConverter` |
| `object?` | `bool` | `IConverterObjectToBool` | `ObjectNullToBoolConverter` |
| `string?` | `bool` | `IConverterStringToBool` | `StringEmptyToBoolConverter` |
| any number | any number | `IConverter{From}To{To}` | `ArithmeticNumberConverter` |
| any value | `string` | `IConverterObjectToString` | `ObjectToStringConverter` / `GenericToString<T>` |
| `TimeSpan` | `string` | `IConverterTimeSpanToString` | `TimeSpanToStringConverter` |
| `string?` | `string?` | `IConverterString` | `StringFormatConverter` |
| `string?` | `Color` | `IConverterStringToColor` | `ParseHtmlStringConverter` |
| `Vector3` | `Vector2` | `IConverterVector3ToVector2` | `Vector3ToVector2Converter` |
| `Vector2` | `Vector3` | `IConverterVector2ToVector3` | `Vector2ToVector3Converter` |
| `Vector2` | `Vector2` | `IConverterVector2` | `Vector2SubstitutionConverter` |
| `Vector3` | `Vector3` | `IConverterVector3` | `Vector3SubstitutionConverter` |
| `Color` | `Color` | `IConverterColor` | `.ToConvert()` |
| `Mesh` | `Mesh` | `IConverterMesh` | `.ToConvert()` |
| `Material` | `Material` | `IConverterMaterial` | `.ToConvert()` |
| `Quaternion` | `Quaternion` | `IConverterQuaternion` | `.ToConvert()` |
| `PhysicsMaterial` | `PhysicsMaterial` | `IConverterPhysicsMaterial` | `.ToConvert()` |
