# ASPID MVVM Binders — Full Index

> **Base path:** `Assets/Plugins/Aspid/MVVM/StarterKit/Unity/Runtime/Binders/`
>
> Полный справочник всех биндеров. Для быстрого поиска используй [aspid-binders-quickref.md](aspid-binders-quickref.md).

---

## Типы биндеров (паттерны)

| Паттерн | Суффикс | Описание | Пример |
|---------|---------|----------|--------|
| **Binder** | `Binder` | Прямой биндинг значения из ViewModel → свойство компонента. Создаётся в коде. | `TextBinder` |
| **MonoBinder** | `MonoBinder` | Инспектор-биндинг (MonoBehaviour). Настраивается через Inspector. | `TextMonoBinder` |
| **Switcher** | `SwitcherBinder` / `SwitcherMonoBinder` | Маппинг `bool` → два типизированных значения (true/false). | `ImageFillSwitcherBinder` |
| **Enum** | `EnumMonoBinder` | Маппинг `Enum` → значение через `EnumValues<T>`. | `GraphicColorEnumMonoBinder` |
| **EnumGroup** | `EnumGroupMonoBinder` | Маппинг `Enum` → группа объектов (default/selected значения). | `GameObjectVisibleEnumGroupMonoBinder` |
| **Addressable** | `AddressableMonoBinder` | Асинхронная загрузка ассетов через Addressables. | `ImageSpriteAddressableMonoBinder` |
| **Command** | `CommandBinder` / `CommandMonoBinder` | Привязка `IRelayCommand` к интерактивным UI-элементам. | `ButtonCommandBinder` |
| **Collection** | `CollectionBinder` / `CollectionMonoBinder` | Привязка observable-коллекций к иерархии view. | `ViewModelCollectionBinder<T>` |
| **Caster** | `CasterMonoBinder` | Конвертация типов + вызов UnityEvent с результатом. | `TimeSpanToStringCasterMonoBinder` |
| **UnityEvent** | `UnityEvent*MonoBinder` | Вызов `UnityEvent<T>` при изменении значения ViewModel. | `UnityEventFloatMonoBinder` |
| **Generic** | `UnityGeneric*Binder<T>` | Обобщённая инфраструктура для кастомных биндингов. | `UnityGenericOneWayBinder<T>` |

### Матрица вариантов для каждого свойства

Большинство свойств компонентов имеют до 6 вариантов биндера:

```
Property
 ├─ Binder              (код)
 ├─ MonoBinder           (инспектор)
 ├─ SwitcherBinder       (код, bool → value)
 ├─ SwitcherMonoBinder   (инспектор, bool → value)
 ├─ EnumMonoBinder       (инспектор, enum → value)
 └─ EnumGroupMonoBinder  (инспектор, enum → группа)
```

---

## Таблица 1: Индекс папок

| # | Папка | Целевой компонент | Назначение | Кол-во скриптов |
|---|-------|-------------------|------------|-----------------|
| 1 | **Animators/** | `Animator` | Управление параметрами аниматора (bool, float, int, trigger) | 10 |
| 2 | **Behaviours/** | `Behaviour` | Включение/выключение `enabled` любого Behaviour | 4 |
| 3 | **CanvasGroups/** | `CanvasGroup` | Alpha, BlocksRaycasts, Interactable, IgnoreParentGroups | 33 |
| 4 | **Casters/** | — (конвертеры) | Преобразование типов (Vector2↔Vector3, TimeSpan→string и др.) | 6 |
| 5 | **Collections/** | — (контейнеры) | Привязка observable-коллекций/списков к view-иерархии | 7 |
| 6 | **Colliders/** | `Collider` (Box/Capsule/Mesh/Sphere) | Enabled, IsTrigger, Material, Center, Size, Radius, Mesh, Convex | 48 |
| 7 | **Commands/** | `Button`, `Toggle`, `Slider`, `ScrollRect`, `InputField`, `Dropdown`, `Scrollbar` | Привязка `IRelayCommand` к интерактивным элементам | 16 |
| 8 | **GameObjects/** | `GameObject` | SetActive (visibility) и Tag | 11 |
| 9 | **Generics/** | — (базовые) | Обобщённые биндеры для кастомных сценариев | 7 |
| 10 | **Graphics/** | `Graphic` / `Renderer` | Цвет (Color) любого UI Graphic или Renderer | 8 |
| 11 | **Images/** | `Image` | Sprite, Fill Amount, Addressable-загрузка спрайтов | 20 |
| 12 | **InputFields/** | `TMP_InputField` | Текстовый ввод: значение + команда + событие обновления | 4 |
| 13 | **LineRenderers/** | `LineRenderer` | Цвет линии (gradient start/end) | 12 |
| 14 | **LocalizeStringEvents/** | `LocalizeStringEvent` | Локализованные строки: таблица/ключ + переменные | 8 |
| 15 | **Mono/** | — (базовые классы) | Базовые MonoBinder: Switcher, Enum, EnumGroup, Addressable, Component | 3 |
| 16 | **RawImages/** | `RawImage` | Texture и Material для RawImage | 12 |
| 17 | **Renderers/** | `Renderer` | Materials массив и цвет материала | 12 |
| 18 | **Sliders/** | `Slider` | Value (bidirectional), Min/Max range | 12 |
| 19 | **Texts/** | `TMP_Text` | Текст, шрифт, размер шрифта, выравнивание, локализация | 31 |
| 20 | **Toggles/** | `Toggle` | IsOn (bidirectional) + Command | 4 |
| 21 | **Transforms/** | `Transform` / `RectTransform` | Position, Rotation, EulerAngles, Scale, AnchoredPosition, SizeDelta | 42 |
| 22 | **UnityEvents/** | — (события) | Вызов UnityEvent<T> при изменении значения (bool, float, int, string, Vector и др.) | 15 |
| 23 | **VirtualizedLists/** | Virtualized List | Привязка коллекций к виртуализированным спискам с пулингом | 2 |

---

## Таблица 2: Индекс всех скриптов

### Animators/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `AnimatorSetBoolBinder` | Binder | `bool` → `Animator.SetBool()` (с инверсией) |
| `AnimatorSetFloatBinder` | Binder | `float` → `Animator.SetFloat()` |
| `AnimatorSetIntBinder` | Binder | `int` → `Animator.SetInteger()` |
| `AnimatorSetParameterBinder<T>` | Binder | `T` → параметр аниматора (базовый generic) |
| `AnimatorSetTriggerBinder` | Binder | `IRelayCommand` → `Animator.SetTrigger()` |
| `AnimatorSetBoolMonoBinder` | MonoBinder | `bool` → `Animator.SetBool()` |
| `AnimatorSetFloatMonoBinder` | MonoBinder | `float` → `Animator.SetFloat()` |
| `AnimatorSetIntMonoBinder` | MonoBinder | `int` → `Animator.SetInteger()` |
| `AnimatorSetParameterMonoBinder<T>` | MonoBinder | `T` → параметр (базовый generic) |
| `AnimatorSetTriggerMonoBinder` | MonoBinder | `IRelayCommand` → `Animator.SetTrigger()` |

### Behaviours/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `BehaviourEnabledBinder` | Binder | `bool` → `Behaviour.enabled` (с инверсией) |
| `BehaviourEnabledMonoBinder` | MonoBinder | `bool` → `Behaviour.enabled` |
| `BehaviourEnabledEnumMonoBinder` | Enum | `Enum` → `bool enabled` |
| `BehaviourEnabledEnumGroupMonoBinder` | EnumGroup | `Enum` → группа Behaviour (default/selected enabled) |

### CanvasGroups/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `CanvasGroupAlphaBinder` | Binder | `float` → `CanvasGroup.alpha` |
| `CanvasGroupAlphaSwitcherBinder` | Switcher | `bool` → `float alpha` (true/false значения) |
| `CanvasGroupBlocksRaycastsBinder` | Binder | `bool` → `CanvasGroup.blocksRaycasts` |
| `CanvasGroupInteractableBinder` | Binder | `bool` → `CanvasGroup.interactable` |
| `CanvasGroupIgnoreParentGroupsBinder` | Binder | `bool` → `CanvasGroup.ignoreParentGroups` |
| `CanvasGroupAlphaMonoBinder` | MonoBinder | `float` → `alpha` |
| `CanvasGroupAlphaSwitcherMonoBinder` | Switcher Mono | `bool` → `float alpha` |
| `CanvasGroupAlphaEnumMonoBinder` | Enum | `Enum` → `float alpha` |
| `CanvasGroupAlphaEnumGroupMonoBinder` | EnumGroup | `Enum` → группа alpha |
| `CanvasGroupBlocksRaycastsMonoBinder` | MonoBinder | `bool` → `blocksRaycasts` |
| `CanvasGroupBlocksRaycastsSwitcherMonoBinder` | Switcher Mono | `bool` → `bool blocksRaycasts` |
| `CanvasGroupBlocksRaycastsEnumMonoBinder` | Enum | `Enum` → `bool blocksRaycasts` |
| `CanvasGroupBlocksRaycastsEnumGroupMonoBinder` | EnumGroup | `Enum` → группа blocksRaycasts |
| `CanvasGroupInteractableMonoBinder` | MonoBinder | `bool` → `interactable` |
| `CanvasGroupInteractableSwitcherMonoBinder` | Switcher Mono | `bool` → `bool interactable` |
| `CanvasGroupInteractableEnumMonoBinder` | Enum | `Enum` → `bool interactable` |
| `CanvasGroupInteractableEnumGroupMonoBinder` | EnumGroup | `Enum` → группа interactable |
| `CanvasGroupIgnoreParentGroupsMonoBinder` | MonoBinder | `bool` → `ignoreParentGroups` |
| `CanvasGroupIgnoreParentGroupsSwitcherMonoBinder` | Switcher Mono | `bool` → `bool ignoreParentGroups` |
| `CanvasGroupIgnoreParentGroupsEnumMonoBinder` | Enum | `Enum` → `bool ignoreParentGroups` |
| `CanvasGroupIgnoreParentGroupsEnumGroupMonoBinder` | EnumGroup | `Enum` → группа ignoreParentGroups |

### Casters/

| Скрипт | Тип | Конвертация |
|--------|-----|-------------|
| `AnyToStringCasterMonoBinder` | Caster | `object` → `string` (через IConverter) → `UnityEvent<string>` |
| `GenericToStringCasterMonoBinder<T>` | Caster | `T` → `string` → `UnityEvent<string>` |
| `StringToBoolCasterMonoBinder` | Caster | `string` → `bool` (IsNullOrEmpty) → `UnityEvent<bool>` |
| `TimeSpanToStringCasterMonoBinder` | Caster | `TimeSpan` → `string` (формат) → `UnityEvent<string>` |
| `Vector2ToVector3CasterMonoBinder` | Caster | `Vector2` → `Vector3` → `UnityEvent<Vector3>` |
| `Vector3ToVector2CasterMonoBinder` | Caster | `Vector3` → `Vector2` → `UnityEvent<Vector2>` |

### Collections/

| Скрипт | Тип | Назначение |
|--------|-----|------------|
| `ViewModelCollectionBinder<T>` | Binder | Статическая коллекция VM → view-иерархия |
| `ViewModelObservableListBinder<T, TViewFactory>` | Binder | Observable list с фильтрацией/сортировкой |
| `ViewModelObservableDictionaryBinder<TKey, TVM>` | Binder | Observable dictionary → view-иерархия |
| `CollectionMonoBinder` | MonoBinder | Фиксированная коллекция с пулингом view |
| `ViewModelCollectionMonoBinder<T>` | MonoBinder | Статическая коллекция (инспектор) |
| `ObservableListMonoBinder` | MonoBinder | Observable list (базовый инспектор) |
| `ViewModelObservableListMonoBinder<T, TFactory>` | MonoBinder | Observable list (инспектор) |

### Colliders/

#### Общие (Collider)

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `ColliderEnabledBinder` | Binder | `bool` → `Collider.enabled` |
| `ColliderIsTriggerBinder` | Binder | `bool` → `Collider.isTrigger` |
| `ColliderMaterialBinder` | Binder | `PhysicMaterial` → `Collider.material` |
| `ColliderProvidesContactsBinder` | Binder | `bool` → `Collider.providesContacts` |
| `ColliderEnabledEnumMonoBinder` | Enum | `Enum` → `bool enabled` |
| `ColliderEnabledEnumGroupMonoBinder` | EnumGroup | `Enum` → группа enabled |
| `ColliderIsTriggerMonoBinder` | MonoBinder | `bool` → `isTrigger` |
| `ColliderIsTriggerEnumMonoBinder` | Enum | `Enum` → `bool isTrigger` |
| `ColliderIsTriggerEnumGroupMonoBinder` | EnumGroup | `Enum` → группа isTrigger |
| `ColliderMaterialEnumMonoBinder` | Enum | `Enum` → `PhysicMaterial` |
| `ColliderMaterialEnumGroupMonoBinder` | EnumGroup | `Enum` → группа material |
| `ColliderProvidesContactsMonoBinder` | MonoBinder | `bool` → `providesContacts` |
| `ColliderProvidesContactsEnumMonoBinder` | Enum | `Enum` → `bool providesContacts` |
| `ColliderProvidesContactsEnumGroupMonoBinder` | EnumGroup | `Enum` → группа providesContacts |

#### BoxColliders/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `BoxColliderCenterBinder` | Binder | `Vector3` → `BoxCollider.center` |
| `BoxColliderCenterSwitcherBinder` | Switcher | `bool` → `Vector3 center` |
| `BoxColliderCenterEnumMonoBinder` | Enum | `Enum` → `Vector3 center` |
| `BoxColliderCenterEnumGroupMonoBinder` | EnumGroup | `Enum` → группа center |
| `BoxColliderSizeBinder` | Binder | `Vector3` → `BoxCollider.size` |
| `BoxColliderSizeSwitcherBinder` | Switcher | `bool` → `Vector3 size` |
| `BoxColliderSizeEnumMonoBinder` | Enum | `Enum` → `Vector3 size` |
| `BoxColliderSizeEnumGroupMonoBinder` | EnumGroup | `Enum` → группа size |

#### CapsuleColliders/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `CapsuleColliderCenterBinder` | Binder | `Vector3` → `CapsuleCollider.center` |
| `CapsuleColliderCenterSwitcherBinder` | Switcher | `bool` → `Vector3 center` |
| `CapsuleColliderCenterEnumMonoBinder` | Enum | `Enum` → `Vector3 center` |
| `CapsuleColliderCenterEnumGroupMonoBinder` | EnumGroup | `Enum` → группа center |
| `CapsuleColliderRadiusBinder` | Binder | `float` → `CapsuleCollider.radius` |
| `CapsuleColliderRadiusSwitcherBinder` | Switcher | `bool` → `float radius` |
| `CapsuleColliderRadiusEnumMonoBinder` | Enum | `Enum` → `float radius` |
| `CapsuleColliderRadiusEnumGroupMonoBinder` | EnumGroup | `Enum` → группа radius |

#### MeshColliders/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `MeshColliderMeshBinder` | Binder | `Mesh` → `MeshCollider.sharedMesh` |
| `MeshColliderMeshSwitcherBinder` | Switcher | `bool` → `Mesh` |
| `MeshColliderMeshEnumMonoBinder` | Enum | `Enum` → `Mesh` |
| `MeshColliderMeshEnumGroupMonoBinder` | EnumGroup | `Enum` → группа mesh |
| `MeshColliderConvexBinder` | Binder | `bool` → `MeshCollider.convex` |
| `MeshColliderConvexMonoBinder` | MonoBinder | `bool` → `convex` |
| `MeshColliderConvexEnumMonoBinder` | Enum | `Enum` → `bool convex` |
| `MeshColliderConvexEnumGroupMonoBinder` | EnumGroup | `Enum` → группа convex |

#### SphereColliders/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `SphereColliderCenterBinder` | Binder | `Vector3` → `SphereCollider.center` |
| `SphereColliderCenterSwitcherBinder` | Switcher | `bool` → `Vector3 center` |
| `SphereColliderCenterMonoBinder` | MonoBinder | `Vector3` → `center` |
| `SphereColliderCenterEnumMonoBinder` | Enum | `Enum` → `Vector3 center` |
| `SphereColliderCenterSwitcherMonoBinder` | Switcher Mono | `bool` → `Vector3 center` |
| `SphereColliderRadiusBinder` | Binder | `float` → `SphereCollider.radius` |
| `SphereColliderRadiusSwitcherBinder` | Switcher | `bool` → `float radius` |
| `SphereColliderRadiusEnumMonoBinder` | Enum | `Enum` → `float radius` |

### Commands/

| Скрипт | Тип | VM Property → Действие |
|--------|-----|------------------------|
| `ButtonCommandBinder` | Command | `IRelayCommand` → `Button.onClick` (0 параметров) |
| `ButtonCommandBinder<T>` | Command | `IRelayCommand<T>` → `Button.onClick` (1 параметр) |
| `ButtonCommandBinder<T1,T2>` | Command | `IRelayCommand` → `Button.onClick` (2 параметра) |
| `ButtonCommandBinder<T1,T2,T3>` | Command | `IRelayCommand` → `Button.onClick` (3 параметра) |
| `ButtonCommandBinder<T1,T2,T3,T4>` | Command | `IRelayCommand` → `Button.onClick` (4 параметра) |
| `DropdownCommandBinder` | Command | `IRelayCommand<int>` → `Dropdown.onValueChanged` |
| `InputFieldCommandBinder` | Command | `IRelayCommand<string>` → `InputField.onSubmit/onValueChanged` |
| `ScrollbarCommandBinder` | Command | `IRelayCommand<float>` → `Scrollbar.onValueChanged` |
| `ScrollRectCommandBinder` | Command | `IRelayCommand<Vector2>` → `ScrollRect.onValueChanged` |
| `SliderCommandBinder` | Command | `IRelayCommand<float>` → `Slider.onValueChanged` |
| `ToggleCommandBinder` | Command | `IRelayCommand<bool>` → `Toggle.onValueChanged` |
| `ButtonCommandMonoBinder` | Command Mono | `IRelayCommand` → `Button.onClick` (инспектор) |
| `DropdownCommandMonoBinder` | Command Mono | `IRelayCommand<int>` → `Dropdown` (инспектор) |
| `InputFieldCommandMonoBinder` | Command Mono | `IRelayCommand<string>` → `InputField` (инспектор) |
| `ScrollRectCommandMonoBinder` | Command Mono | `IRelayCommand<Vector2>` → `ScrollRect` (инспектор) |
| `SliderCommandMonoBinder` | Command Mono | `IRelayCommand<float>` → `Slider` (инспектор) |
| `ToggleCommandMonoBinder` | Command Mono | `IRelayCommand<bool>` → `Toggle` (инспектор) |
| `CommandBinderExtensions` | Extension | Общая логика обновления InteractableMode (Interactable/Visible/Custom) |

### GameObjects/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `GameObjectVisibleBinder` | Binder | `bool` → `GameObject.SetActive()` (с инверсией) |
| `GameObjectTagBinder` | Binder | `string` → `GameObject.tag` |
| `GameObjectTagSwitcherBinder` | Switcher | `bool` → `string tag` |
| `GameObjectVisibleMonoBinder` | MonoBinder | `bool` → `SetActive()` |
| `GameObjectVisibleByBindMonoBinder` | MonoBinder | Кастомный `IBinder<bool>` → `SetActive()` |
| `GameObjectVisibleEnumMonoBinder` | Enum | `Enum` → `bool visible` |
| `GameObjectVisibleEnumGroupMonoBinder` | EnumGroup | `Enum` → группа visible |
| `GameObjectTagEnumMonoBinder` | Enum | `Enum` → `string tag` |
| `GameObjectTagEnumGroupMonoBinder` | EnumGroup | `Enum` → группа tag |
| `GameObjectTagSwitcherMonoBinder` | Switcher Mono | `bool` → `string tag` |
| `GameObjectTagMonoBinder` | MonoBinder | `string` → `tag` |

### Generics/

| Скрипт | Тип | Назначение |
|--------|-----|------------|
| `UnityGenericOneWayBinder<T>` | Generic | Односторонний: VM → `UnityAction<T>` |
| `UnityGenericOneWayBinder<TTarget, T>` | Generic | Односторонний с целевой ссылкой |
| `UnityGenericOneWayToSourceBinder<T>` | Generic | Обратный: Source → VM |
| `UnityGenericTwoWayBinder<T>` | Generic | Двусторонний: VM ↔ Source |
| `UnityGenericOneTimeBinder<T>` | Generic | Однократный биндинг (fire once) |
| `UnityGenericOneTimeBinder<TTarget, T>` | Generic | Однократный с целевой ссылкой |
| `UnityGenericCasterBinder<TIn, TOut>` | Generic | Конвертация типов при биндинге |

### Graphics/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `GraphicColorBinder` | Binder | `Color` → `Graphic.color` / `Renderer.material.color` |
| `GraphicColorSwitcherBinder` | Switcher | `bool` → `Color` |
| `GraphicColorMonoBinder` | MonoBinder | `Color` → `color` |
| `GraphicColorSwitcherMonoBinder` | Switcher Mono | `bool` → `Color` |
| `GraphicColorEnumMonoBinder` | Enum | `Enum` → `Color` |
| `GraphicColorEnumGroupMonoBinder` | EnumGroup | `Enum` → группа Color |

### Images/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `ImageSpriteBinder` | Binder | `Sprite` → `Image.sprite` (+ Texture2D support) |
| `ImageSpriteSwitcherBinder` | Switcher | `bool` → `Sprite` |
| `ImageFillBinder` | Binder | `float` → `Image.fillAmount` |
| `ImageFillSwitcherBinder` | Switcher | `bool` → `float fillAmount` |
| `ImageSpriteMonoBinder` | MonoBinder | `Sprite` → `sprite` |
| `ImageSpriteSwitcherMonoBinder` | Switcher Mono | `bool` → `Sprite` |
| `ImageSpriteAddressableMonoBinder` | Addressable | `string` (address) → async `Sprite` |
| `ImageSpriteEnumMonoBinder` | Enum | `Enum` → `Sprite` |
| `ImageSpriteEnumGroupMonoBinder` | EnumGroup | `Enum` → группа Sprite |
| `ImageFillMonoBinder` | MonoBinder | `float` → `fillAmount` |
| `ImageFillSwitcherMonoBinder` | Switcher Mono | `bool` → `float fillAmount` |
| `ImageFillEnumMonoBinder` | Enum | `Enum` → `float fillAmount` |
| `ImageFillEnumGroupMonoBinder` | EnumGroup | `Enum` → группа fillAmount |

### InputFields/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `InputFieldBinder` | Binder | `string` ↔ `TMP_InputField.text` (TwoWay) |
| `InputFieldMonoBinder` | MonoBinder | `string` ↔ `text` (TwoWay) |
| `InputFieldCommandBinder` | Command | `IRelayCommand<string>` → `onSubmit/onValueChanged` |
| `UpdateInputFieldEvent` | Utility | Enum: `OnSubmit`, `OnValueChanged`, `OnEndEdit` |

### LineRenderers/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `LineRendererColorBinder` | Binder | `Color` → `LineRenderer` startColor/endColor |
| `LineRendererColorSwitcherBinder` | Switcher | `bool` → `Color` |
| `LineRendererColorMonoBinder` | MonoBinder | `Color` → color |
| `LineRendererColorSwitcherMonoBinder` | Switcher Mono | `bool` → `Color` |
| `LineRendererColorEnumMonoBinder` | Enum | `Enum` → `Color` |
| `LineRendererColorEnumGroupMonoBinder` | EnumGroup | `Enum` → группа Color |
| `LineRendererColorSetter` | Extension | Общая логика установки цвета (ColorMode: StartAndEnd, Start, End) |

### LocalizeStringEvents/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `LocalizeStringEventEntryBinder` | Binder | `(table, entry)` → `LocalizeStringEvent.SetEntry()` |
| `LocalizeStringEventVariableBinder` | Binder | `object` → переменная локализации |
| `LocalizeStringEventEntryMonoBinder` | MonoBinder | `string` → entry |
| `LocalizeStringEventEntrySwitcherMonoBinder` | Switcher Mono | `bool` → entry |
| `LocalizeStringEventEntryEnumMonoBinder` | Enum | `Enum` → entry |
| `LocalizeStringEventEntryEnumGroupMonoBinder` | EnumGroup | `Enum` → группа entry |
| `LocalizeStringEventVariableMonoBinder` | MonoBinder | `object` → variable |
| `LocalizeStringEventVariableEnumMonoBinder` | Enum | `Enum` → variable |

### Mono/ (базовые классы)

| Скрипт | Тип | Назначение |
|--------|-----|------------|
| `SwitcherMonoBinder<T>` | Base | Базовый класс switcher-биндеров (bool → T, два значения) |
| `EnumGroupMonoBinder<TElement>` | Base | Базовый класс enum-group (default/selected значения для каждого enum) |
| `AddressableMonoBinder<TAsset>` | Base | Базовый класс async-загрузки ассетов через Addressables |

### RawImages/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `RawImageTextureBinder` | Binder | `Texture` → `RawImage.texture` |
| `RawImageTextureSwitcherBinder` | Switcher | `bool` → `Texture` |
| `RawImageMaterialBinder` | Binder | `Material` → `RawImage.material` |
| `RawImageMaterialSwitcherBinder` | Switcher | `bool` → `Material` |
| `RawImageTextureMonoBinder` | MonoBinder | `Texture` → `texture` |
| `RawImageTextureAddressableMonoBinder` | Addressable | `string` → async `Texture` |
| `RawImageTextureEnumMonoBinder` | Enum | `Enum` → `Texture` |
| `RawImageTextureEnumGroupMonoBinder` | EnumGroup | `Enum` → группа Texture |
| `RawImageMaterialEnumMonoBinder` | Enum | `Enum` → `Material` |
| `RawImageMaterialEnumGroupMonoBinder` | EnumGroup | `Enum` → группа Material |

### Renderers/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `RendererMaterialsBinder` | Binder | `Material[]` → `Renderer.materials` |
| `RendererMaterialsSwitcherBinder` | Switcher | `bool` → `Material[]` |
| `RendererMaterialColorBinder` | Binder | `Color` → `Renderer.material.color` |
| `RendererMaterialColorSwitcherBinder` | Switcher | `bool` → `Color` |
| `RendererMaterialsMonoBinder` | MonoBinder | `Material[]` → `materials` |
| `RendererMaterialsSwitcherMonoBinder` | Switcher Mono | `bool` → `Material[]` |
| `RendererMaterialsEnumMonoBinder` | Enum | `Enum` → `Material[]` |
| `RendererMaterialsEnumGroupMonoBinder` | EnumGroup | `Enum` → группа Materials |
| `RendererMaterialColorMonoBinder` | MonoBinder | `Color` → `material.color` |
| `RendererMaterialColorSwitcherMonoBinder` | Switcher Mono | `bool` → `Color` |
| `RendererMaterialColorEnumMonoBinder` | Enum | `Enum` → `Color` |
| `RendererMaterialColorEnumGroupMonoBinder` | EnumGroup | `Enum` → группа Color |
| `RendererSetters` | Extension | Общая логика установки материалов |

### Sliders/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `SliderValueBinder` | Binder | `float` ↔ `Slider.value` (TwoWay) |
| `SliderMinMaxBinder` | Binder | `(float, float)` → `Slider.minValue/maxValue` |
| `SliderMinMaxSwitcherBinder` | Switcher | `bool` → min/max пара |
| `SliderValueMonoBinder` | MonoBinder | `float` ↔ `value` |
| `SliderValueSwitcherMonoBinder` | Switcher Mono | `bool` → `float value` |
| `SliderValueEnumMonoBinder` | Enum | `Enum` → `float value` |
| `SliderValueEnumGroupMonoBinder` | EnumGroup | `Enum` → группа value |
| `SliderMinMaxMonoBinder` | MonoBinder | `float` → `minValue/maxValue` |
| `SliderMinMaxSwitcherMonoBinder` | Switcher Mono | `bool` → min/max |
| `SliderMinMaxEnumMonoBinder` | Enum | `Enum` → min/max |
| `SliderMinMaxEnumGroupMonoBinder` | EnumGroup | `Enum` → группа min/max |
| `SliderSetters` | Extension | Общая логика установки значений слайдера |

### Texts/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `TextBinder` | Binder | `string`/`number` → `TMP_Text.text` (INumberBinder) |
| `TextSwitcherBinder` | Switcher | `bool` → `string text` |
| `TextFontBinder` | Binder | `TMP_FontAsset` → `TMP_Text.font` |
| `TextFontSwitcherBinder` | Switcher | `bool` → `TMP_FontAsset` |
| `TextFontSizeBinder` | Binder | `float` → `TMP_Text.fontSize` |
| `TextAlignmentBinder` | Binder | `TextAlignmentOptions` → `TMP_Text.alignment` |
| `TextAlignmentSwitcherBinder` | Switcher | `bool` → `TextAlignmentOptions` |
| `TextMonoBinder` | MonoBinder | `string` → `text` |
| `TextSwitcherMonoBinder` | Switcher Mono | `bool` → `string` |
| `TextFontMonoBinder` | MonoBinder | `TMP_FontAsset` → `font` |
| `TextFontSwitcherMonoBinder` | Switcher Mono | `bool` → `TMP_FontAsset` |
| `TextFontSizeMonoBinder` | MonoBinder | `float` → `fontSize` |
| `TextFontSizeSwitcherMonoBinder` | Switcher Mono | `bool` → `float fontSize` |
| `TextFontSizeEnumMonoBinder` | Enum | `Enum` → `float fontSize` |
| `TextFontSizeEnumGroupMonoBinder` | EnumGroup | `Enum` → группа fontSize |
| `TextAlignmentMonoBinder` | MonoBinder | `TextAlignmentOptions` → `alignment` |
| `TextAlignmentSwitcherMonoBinder` | Switcher Mono | `bool` → `TextAlignmentOptions` |
| `TextAlignmentEnumMonoBinder` | Enum | `Enum` → `TextAlignmentOptions` |
| `TextAlignmentEnumGroupMonoBinder` | EnumGroup | `Enum` → группа alignment |

#### Texts/Localizations/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `TextLocalizationEntryBinder` | Binder | `(table, entry)` → локализованный `TMP_Text.text` |
| `TextLocalizationEntrySwitcherBinder` | Switcher | `bool` → entry |
| `TextLocalizationEntryMonoBinder` | MonoBinder | `string` → entry |
| `TextLocalizationEntrySwitcherMonoBinder` | Switcher Mono | `bool` → entry |
| `TextLocalizationEntryEnumMonoBinder` | Enum | `Enum` → entry |
| `TextLocalizationEntryEnumGroupMonoBinder` | EnumGroup | `Enum` → группа entry |
| `TextLocalizationExtensions` | Extension | Хелперы для работы с таблицами локализации |

### Toggles/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `ToggleIsOnBinder` | Binder | `bool` ↔ `Toggle.isOn` (TwoWay) |
| `ToggleIsOnMonoBinder` | MonoBinder | `bool` ↔ `isOn` |
| `ToggleCommandBinder` | Command | `IRelayCommand<bool>` → `Toggle.onValueChanged` |
| `ToggleCommandMonoBinder` | Command Mono | `IRelayCommand<bool>` → `Toggle` (инспектор) |

### Transforms/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `TransformPositionBinder` | Binder | `Vector3` → `Transform.position/localPosition` |
| `TransformPositionSwitcherBinder` | Switcher | `bool` → `Vector3 position` |
| `TransformRotationBinder` | Binder | `Quaternion` → `Transform.rotation/localRotation` |
| `TransformRotationSwitcherBinder` | Switcher | `bool` → `Quaternion rotation` |
| `TransformEulerAnglesBinder` | Binder | `Vector3` → `Transform.eulerAngles/localEulerAngles` |
| `TransformEulerAnglesSwitcherBinder` | Switcher | `bool` → `Vector3 eulerAngles` |
| `TransformScaleBinder` | Binder | `Vector3` → `Transform.localScale` |
| `TransformScaleSwitcherBinder` | Switcher | `bool` → `Vector3 scale` |
| `TransformPositionMonoBinder` | MonoBinder | `Vector3` → `position` |
| `TransformPositionSwitcherMonoBinder` | Switcher Mono | `bool` → `Vector3 position` |
| `TransformPositionEnumMonoBinder` | Enum | `Enum` → `Vector3 position` |
| `TransformPositionEnumGroupMonoBinder` | EnumGroup | `Enum` → группа position |
| `TransformRotationMonoBinder` | MonoBinder | `Quaternion` → `rotation` |
| `TransformEulerAnglesMonoBinder` | MonoBinder | `Vector3` → `eulerAngles` |
| `TransformEulerAnglesSwitcherMonoBinder` | Switcher Mono | `bool` → `Vector3 eulerAngles` |
| `TransformEulerAnglesEnumMonoBinder` | Enum | `Enum` → `Vector3 eulerAngles` |
| `TransformEulerAnglesEnumGroupMonoBinder` | EnumGroup | `Enum` → группа eulerAngles |
| `TransformScaleMonoBinder` | MonoBinder | `Vector3` → `localScale` |
| `TransformScaleSwitcherMonoBinder` | Switcher Mono | `bool` → `Vector3 scale` |
| `TransformScaleEnumMonoBinder` | Enum | `Enum` → `Vector3 scale` |
| `TransformScaleEnumGroupMonoBinder` | EnumGroup | `Enum` → группа scale |
| `TransformSetters` | Extension | Общая логика (World/Local Space) |

#### Transforms/RectTransforms/

| Скрипт | Тип | VM Property → Component Property |
|--------|-----|----------------------------------|
| `RectTransformAnchoredPositionBinder` | Binder | `Vector2` → `RectTransform.anchoredPosition` |
| `RectTransformAnchoredPositionSwitcherBinder` | Switcher | `bool` → `Vector2 anchoredPosition` |
| `RectTransformSizeDeltaBinder` | Binder | `Vector2` → `RectTransform.sizeDelta` |
| `RectTransformSizeDeltaSwitcherBinder` | Switcher | `bool` → `Vector2 sizeDelta` |
| `RectTransformAnchoredPositionMonoBinder` | MonoBinder | `Vector2` → `anchoredPosition` |
| `RectTransformAnchoredPositionEnumMonoBinder` | Enum | `Enum` → `Vector2 anchoredPosition` |
| `RectTransformAnchoredPositionEnumGroupMonoBinder` | EnumGroup | `Enum` → группа anchoredPosition |
| `RectTransformSizeDeltaMonoBinder` | MonoBinder | `Vector2` → `sizeDelta` |
| `RectTransformSizeDeltaSwitcherMonoBinder` | Switcher Mono | `bool` → `Vector2 sizeDelta` |
| `RectTransformSizeDeltaEnumMonoBinder` | Enum | `Enum` → `Vector2 sizeDelta` |
| `RectTransformSizeDeltaEnumGroupMonoBinder` | EnumGroup | `Enum` → группа sizeDelta |
| `SizeDeltaMode` | Enum | `Both`, `Width`, `Height` — режим применения sizeDelta |

### UnityEvents/

| Скрипт | Тип | VM Property → UnityEvent |
|--------|-----|--------------------------|
| `UnityEventBoolMonoBinder` | Event | `bool` → `UnityEvent<bool>` |
| `UnityEventBoolByBindMonoBinder` | Event | Кастомный `IBinder<bool>` → `UnityEvent<bool>` |
| `UnityEventColorMonoBinder` | Event | `Color` → `UnityEvent<Color>` |
| `UnityEventDoubleMonoBinder` | Event | `double` → `UnityEvent<double>` |
| `UnityEventFloatMonoBinder` | Event | `float` → `UnityEvent<float>` |
| `UnityEventIntMonoBinder` | Event | `int` → `UnityEvent<int>` |
| `UnityEventLongMonoBinder` | Event | `long` → `UnityEvent<long>` |
| `UnityEventNumberConditionMonoBinder` | Event | Number + условие → `UnityEvent<bool>` |
| `UnityEventNumberConditionSwitcherMonoBinder` | Event | Number + условие → switcher `UnityEvent` |
| `UnityEventQuaternionMonoBinder` | Event | `Quaternion` → `UnityEvent<Quaternion>` |
| `UnityEventStringMonoBinder` | Event | `string` → `UnityEvent<string>` |
| `UnityEventSwitcherMonoBinder` | Event | `bool` → switcher `UnityEvent` с значением |
| `UnityEventVector2MonoBinder` | Event | `Vector2` → `UnityEvent<Vector2>` |
| `UnityEventVector3MonoBinder` | Event | `Vector3` → `UnityEvent<Vector3>` |

### VirtualizedLists/

| Скрипт | Тип | Назначение |
|--------|-----|------------|
| `VirtualizedListItemSourceBinder` | Binder | Observable collection → виртуализированный список с пулингом |
| `VirtualizedListItemSourceMonoBinder` | MonoBinder | То же, через инспектор |

