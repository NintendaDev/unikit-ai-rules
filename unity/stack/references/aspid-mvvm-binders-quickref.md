# ASPID MVVM Binders — Quick Reference

> **Base path:** `Assets/Plugins/Aspid/MVVM/StarterKit/Unity/Runtime/Binders/`
> Полный индекс всех биндеров: [aspid-binders-full.md](aspid-binders-full.md)

## Паттерны именования

Каждое свойство компонента имеет предсказуемые варианты биндера:

| Суффикс | Описание |
|---------|----------|
| `*Binder` | Код-биндинг: VM property → component property |
| `*MonoBinder` | Инспектор-биндинг (MonoBehaviour) |
| `*SwitcherBinder` / `*SwitcherMonoBinder` | `bool` → два типизированных значения |
| `*EnumMonoBinder` | `Enum` → значение через `EnumValues<T>` |
| `*EnumGroupMonoBinder` | `Enum` → группа объектов (default/selected) |
| `*AddressableMonoBinder` | Async-загрузка ассета через Addressables |
| `*CommandBinder` / `*CommandMonoBinder` | `IRelayCommand` → UI-элемент |

## Выбор биндера по задаче

| Задача | Биндер | Папка |
|--------|--------|-------|
| Показать/скрыть GameObject | `GameObjectVisibleMonoBinder` | GameObjects/ |
| Скрыть UI без layout rebuild | `CanvasGroupAlphaMonoBinder` + `CanvasGroupBlocksRaycastsMonoBinder` | CanvasGroups/ |
| Отобразить текст | `TextMonoBinder` | Texts/ |
| Отобразить число как текст | `TextMonoBinder` (поддерживает INumberBinder) | Texts/ |
| Локализованный текст | `TextLocalizationEntryMonoBinder` | Texts/Localizations/ |
| Локализация через LocalizeStringEvent | `LocalizeStringEventEntryMonoBinder` | LocalizeStringEvents/ |
| Спрайт в Image | `ImageSpriteMonoBinder` | Images/ |
| Спрайт по Addressable-адресу | `ImageSpriteAddressableMonoBinder` | Images/ |
| Fill-бар (HP, прогресс) | `ImageFillMonoBinder` | Images/ |
| Текстура в RawImage | `RawImageTextureMonoBinder` | RawImages/ |
| Слайдер (значение, bidirectional) | `SliderValueMonoBinder` | Sliders/ |
| Слайдер (min/max range) | `SliderMinMaxMonoBinder` | Sliders/ |
| Toggle (вкл/выкл, bidirectional) | `ToggleIsOnMonoBinder` | Toggles/ |
| Текстовый ввод (bidirectional) | `InputFieldMonoBinder` | InputFields/ |
| Кнопка → команда | `ButtonCommandMonoBinder` | Commands/ |
| Toggle → команда | `ToggleCommandMonoBinder` | Commands/ |
| Slider → команда | `SliderCommandMonoBinder` | Commands/ |
| InputField → команда | `InputFieldCommandMonoBinder` | Commands/ |
| Dropdown → команда | `DropdownCommandMonoBinder` | Commands/ |
| Цвет UI-элемента (Graphic) | `GraphicColorMonoBinder` | Graphics/ |
| Цвет по bool-состоянию | `GraphicColorSwitcherMonoBinder` | Graphics/ |
| Цвет по enum-состоянию | `GraphicColorEnumMonoBinder` | Graphics/ |
| Включить/выключить Behaviour | `BehaviourEnabledMonoBinder` | Behaviours/ |
| Observable list → view-иерархия | `ViewModelObservableListMonoBinder<T, TFactory>` | Collections/ |
| Статическая коллекция | `ViewModelCollectionMonoBinder<T>` | Collections/ |
| Большой список с виртуализацией | `VirtualizedListItemSourceMonoBinder` | VirtualizedLists/ |
| Позиция Transform | `TransformPositionMonoBinder` | Transforms/ |
| Scale Transform | `TransformScaleMonoBinder` | Transforms/ |
| AnchoredPosition (RectTransform) | `RectTransformAnchoredPositionMonoBinder` | Transforms/RectTransforms/ |
| SizeDelta (RectTransform) | `RectTransformSizeDeltaMonoBinder` | Transforms/RectTransforms/ |
| Материал Renderer | `RendererMaterialsMonoBinder` | Renderers/ |
| Параметр Animator | `AnimatorSetBoolMonoBinder` / `Float` / `Int` / `Trigger` | Animators/ |
| Конвертация типов + UnityEvent | `*CasterMonoBinder` (см. Casters/) | Casters/ |
| Пробросить значение в UnityEvent | `UnityEvent{Type}MonoBinder` | UnityEvents/ |

## Выбор биндера по типу VM-свойства

| Тип VM Property | Основные биндеры |
|-----------------|-----------------|
| `bool` | `GameObjectVisible*`, `BehaviourEnabled*`, `CanvasGroupBlocksRaycasts*`, `CanvasGroupInteractable*`, `ToggleIsOn*` |
| `string` | `Text*`, `InputField*`, `GameObjectTag*` |
| `int` / `float` / `double` | `Text*` (INumberBinder), `SliderValue*`, `ImageFill*`, `CanvasGroupAlpha*`, `AnimatorSetFloat/Int*` |
| `Color` | `GraphicColor*`, `RendererMaterialColor*`, `LineRendererColor*` |
| `Sprite` | `ImageSprite*`, `ImageSpriteAddressable*` |
| `Texture` | `RawImageTexture*`, `RawImageTextureAddressable*` |
| `Material` / `Material[]` | `RawImageMaterial*`, `RendererMaterials*` |
| `Vector2` | `RectTransformAnchoredPosition*`, `RectTransformSizeDelta*` |
| `Vector3` | `TransformPosition*`, `TransformScale*`, `TransformEulerAngles*` |
| `Quaternion` | `TransformRotation*` |
| `Enum` | Любой `*EnumMonoBinder` или `*EnumGroupMonoBinder` |
| `IRelayCommand` | `ButtonCommand*`, `ToggleCommand*`, `SliderCommand*`, `InputFieldCommand*`, `DropdownCommand*`, `ScrollRectCommand*` |
| `IObservableList<T>` | `ViewModelObservableList*`, `VirtualizedListItemSource*` |
| `IReadOnlyList<T>` | `ViewModelCollection*`, `CollectionMonoBinder` |
| `TimeSpan` | `TimeSpanToStringCasterMonoBinder` → `UnityEvent<string>` |

## Casters (конвертеры типов)

| Скрипт | Конвертация |
|--------|-------------|
| `AnyToStringCasterMonoBinder` | `object` → `string` → `UnityEvent<string>` |
| `GenericToStringCasterMonoBinder<T>` | `T` → `string` → `UnityEvent<string>` |
| `StringToBoolCasterMonoBinder` | `string` → `bool` (IsNullOrEmpty) → `UnityEvent<bool>` |
| `TimeSpanToStringCasterMonoBinder` | `TimeSpan` → `string` (формат) → `UnityEvent<string>` |
| `Vector2ToVector3CasterMonoBinder` | `Vector2` → `Vector3` → `UnityEvent<Vector3>` |
| `Vector3ToVector2CasterMonoBinder` | `Vector3` → `Vector2` → `UnityEvent<Vector2>` |

## UnityEvent биндеры

Все в папке `UnityEvents/Mono/`. Вызывают `UnityEvent<T>` при изменении VM-свойства:

`Bool`, `Color`, `Double`, `Float`, `Int`, `Long`, `Quaternion`, `String`, `Vector2`, `Vector3`

Специальные: `NumberCondition` (число + условие → bool), `Switcher` (bool → значение), `BoolByBind` (кастомный IBinder).
