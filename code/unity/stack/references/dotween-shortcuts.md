# DOTween — Shortcut Methods Catalog

> See also: [dotween.md](../dotween.md)

All shortcut extension methods organized by Unity component type.
Requires `using DG.Tweening;`. Methods marked **(No FROM)** do not support `.From()`.

---

## Transform

### Movement

| Method | Description |
|--------|-------------|
| `DOMove(Vector3 to, float duration, bool snapping)` | World position |
| `DOMoveX(float to, float duration, bool snapping)` | World X only |
| `DOMoveY(float to, float duration, bool snapping)` | World Y only |
| `DOMoveZ(float to, float duration, bool snapping)` | World Z only |
| `DOLocalMove(Vector3 to, float duration, bool snapping)` | Local position |
| `DOLocalMoveX/Y/Z(float to, float duration, bool snapping)` | Local single-axis |
| `DOJump(Vector3 endValue, float jumpPower, int numJumps, float duration, bool snapping)` | Arc jump — returns `Sequence` |
| `DOLocalJump(Vector3 endValue, float jumpPower, int numJumps, float duration, bool snapping)` | Local arc jump — returns `Sequence` |

### Rotation

| Method | Description |
|--------|-------------|
| `DORotate(Vector3 to, float duration, RotateMode mode)` | Euler angles. `RotateMode`: `Fast`, `FastBeyond360`, `WorldAxisAdd`, `LocalAxisAdd` |
| `DORotateQuaternion(Quaternion to, float duration)` | Pure quaternion rotation |
| `DOLocalRotate(Vector3 to, float duration, RotateMode mode)` | Local euler rotation |
| `DOLocalRotateQuaternion(Quaternion to, float duration)` | Local quaternion rotation |
| `DOLookAt(Vector3 towards, float duration, AxisConstraint axisConstraint, Vector3 up)` | Face a direction |
| `DODynamicLookAt(Vector3 towards, float duration, AxisConstraint axisConstraint, Vector3 up)` | Recalculates target every frame |

### Scale

| Method | Description |
|--------|-------------|
| `DOScale(float to, float duration)` | Uniform scale |
| `DOScale(Vector3 to, float duration)` | Per-axis scale |
| `DOScaleX/Y/Z(float to, float duration)` | Single-axis scale |

### Punch & Shake (No FROM)

| Method | Description |
|--------|-------------|
| `DOPunchPosition(Vector3 punch, float duration, int vibrato, float elasticity, bool snapping)` | Elastic position punch |
| `DOPunchRotation(Vector3 punch, float duration, int vibrato, float elasticity)` | Elastic rotation punch |
| `DOPunchScale(Vector3 punch, float duration, int vibrato, float elasticity)` | Elastic scale punch |
| `DOShakePosition(float duration, float/Vector3 strength, int vibrato, float randomness, bool snapping, bool fadeOut, ShakeRandomnessMode mode)` | Position shake |
| `DOShakeRotation(float duration, float/Vector3 strength, int vibrato, float randomness, bool fadeOut, ShakeRandomnessMode mode)` | Rotation shake |
| `DOShakeScale(float duration, float/Vector3 strength, int vibrato, float randomness, bool fadeOut, ShakeRandomnessMode mode)` | Scale shake |

### Path (No FROM)

| Method | Description |
|--------|-------------|
| `DOPath(Vector3[] waypoints, float duration, PathType pathType, PathMode pathMode, int resolution, Color gizmoColor)` | Follow world-space path. `PathType`: `Linear`, `CatmullRom`, `CubicBezier` |
| `DOLocalPath(Vector3[] waypoints, float duration, PathType pathType, PathMode pathMode, int resolution, Color gizmoColor)` | Local-space path |

### Blendable (additive, non-conflicting)

| Method | Description |
|--------|-------------|
| `DOBlendableMoveBy(Vector3 by, float duration, bool snapping)` | Relative world movement |
| `DOBlendableLocalMoveBy(Vector3 by, float duration, bool snapping)` | Relative local movement |
| `DOBlendableRotateBy(Vector3 by, float duration, RotateMode mode)` | Relative rotation (experimental) |
| `DOBlendableLocalRotateBy(Vector3 by, float duration, RotateMode mode)` | Relative local rotation |
| `DOBlendableScaleBy(Vector3 by, float duration)` | Relative scale |

---

## RectTransform

### Position

| Method | Description |
|--------|-------------|
| `DOAnchorPos(Vector2 to, float duration, bool snapping)` | `anchoredPosition` |
| `DOAnchorPosX(float to, float duration, bool snapping)` | Anchored X only |
| `DOAnchorPosY(float to, float duration, bool snapping)` | Anchored Y only |
| `DOAnchorPos3D(Vector3 to, float duration, bool snapping)` | 3D anchored position |
| `DOAnchorPos3DX/Y/Z(float to, float duration, bool snapping)` | 3D single-axis anchored |

### Anchors, Size & Pivot

| Method | Description |
|--------|-------------|
| `DOAnchorMin(Vector2 to, float duration, bool snapping)` | Min anchor |
| `DOAnchorMax(Vector2 to, float duration, bool snapping)` | Max anchor |
| `DOSizeDelta(Vector2 to, float duration, bool snapping)` | `sizeDelta` |
| `DOPivot(Vector2 to, float duration)` | Pivot point |
| `DOPivotX/Y(float to, float duration)` | Single-axis pivot |

### Jump, Punch & Shake (No FROM)

| Method | Description |
|--------|-------------|
| `DOJumpAnchorPos(Vector2 endValue, float jumpPower, int numJumps, float duration, bool snapping)` | Arc jump — returns `Sequence` |
| `DOPunchAnchorPos(Vector2 punch, float duration, int vibrato, float elasticity, bool snapping)` | Elastic punch |
| `DOShakeAnchorPos(float duration, float/Vector3 strength, int vibrato, float randomness, bool snapping, bool fadeOut, ShakeRandomnessMode mode)` | Position shake |

### Special

| Method | Description |
|--------|-------------|
| `DOShapeCircle(Vector2 center, float endValueDegrees, float duration, bool relativeCenter, bool snapping)` | Circular motion around center point |

---

## Material

### Color & Fade

| Method | Description |
|--------|-------------|
| `DOColor(Color to, float duration)` | Default color property |
| `DOColor(Color to, string property, float duration)` | Named property |
| `DOColor(Color to, int propertyID, float duration)` | Property ID (fastest) |
| `DOFade(float to, float duration)` | Alpha of default color |
| `DOFade(float to, string property, float duration)` | Alpha of named property |
| `DOFade(float to, int propertyID, float duration)` | Alpha by property ID |
| `DOGradientColor(Gradient to, float duration)` | Gradient color — returns `Sequence` |
| `DOGradientColor(Gradient to, string property, float duration)` | Named gradient |
| `DOGradientColor(Gradient to, int propertyID, float duration)` | Gradient by ID |

### Float, Vector & Texture

| Method | Description |
|--------|-------------|
| `DOFloat(float to, string property, float duration)` | Float shader property |
| `DOFloat(float to, int propertyID, float duration)` | Float by property ID |
| `DOVector(Vector4 to, string property, float duration)` | Vector4 shader property |
| `DOVector(Vector4 to, int propertyID, float duration)` | Vector4 by property ID |
| `DOOffset(Vector2 to, float duration)` | `textureOffset` |
| `DOOffset(Vector2 to, string property, float duration)` | Named texture offset |
| `DOOffset(Vector2 to, int propertyID, float duration)` | Texture offset by ID |
| `DOTiling(Vector2 to, float duration)` | `textureScale` |
| `DOTiling(Vector2 to, string property, float duration)` | Named texture tiling |
| `DOTiling(Vector2 to, int propertyID, float duration)` | Tiling by ID |

### Blendable

| Method | Description |
|--------|-------------|
| `DOBlendableColor(Color to, float duration)` | Additive color — avoids fighting |
| `DOBlendableColor(Color to, string property, float duration)` | Named blendable color |
| `DOBlendableColor(Color to, int propertyID, float duration)` | Blendable by ID |

---

## Camera

| Method | Description |
|--------|-------------|
| `DOAspect(float to, float duration)` | Aspect ratio |
| `DOColor(Color to, float duration)` | Background color |
| `DOFieldOfView(float to, float duration)` | Field of view |
| `DOFarClipPlane(float to, float duration)` | Far clipping plane |
| `DONearClipPlane(float to, float duration)` | Near clipping plane |
| `DOOrthoSize(float to, float duration)` | Orthographic size |
| `DOPixelRect(Rect to, float duration)` | Pixel rectangle |
| `DORect(Rect to, float duration)` | Normalized viewport rect |
| `DOShakePosition(float duration, ...)` | Position shake (No FROM) |
| `DOShakeRotation(float duration, ...)` | Rotation shake (No FROM) |

---

## UI Components

### Image (`UnityEngine.UI.Image`)

| Method | Description |
|--------|-------------|
| `DOColor(Color to, float duration)` | Image color |
| `DOFade(float to, float duration)` | Image alpha |
| `DOFillAmount(float to, float duration)` | Fill amount (0..1) |
| `DOGradientColor(Gradient to, float duration)` | Gradient — returns `Sequence` |
| `DOBlendableColor(Color to, float duration)` | Additive color |

### Text (`UnityEngine.UI.Text`)

| Method | Description |
|--------|-------------|
| `DOColor(Color to, float duration)` | Text color |
| `DOFade(float to, float duration)` | Text alpha |
| `DOText(string to, float duration, bool richTextEnabled, ScrambleMode scrambleMode, string scrambleChars)` | Type-on animation |
| `DOBlendableColor(Color to, float duration)` | Additive color |

### CanvasGroup

| Method | Description |
|--------|-------------|
| `DOFade(float to, float duration)` | `alpha` fade |

### Slider

| Method | Description |
|--------|-------------|
| `DOValue(float to, float duration, bool snapping)` | Slider value |

### ScrollRect

| Method | Description |
|--------|-------------|
| `DONormalizedPos(Vector2 to, float duration, bool snapping)` | Scroll position |
| `DOHorizontalNormalizedPos(float to, float duration, bool snapping)` | Horizontal scroll |
| `DOVerticalNormalizedPos(float to, float duration, bool snapping)` | Vertical scroll |

### Graphic (`UnityEngine.UI.Graphic`)

| Method | Description |
|--------|-------------|
| `DOColor(Color to, float duration)` | Graphic color |
| `DOFade(float to, float duration)` | Graphic alpha |
| `DOBlendableColor(Color to, float duration)` | Additive color |

### LayoutElement

| Method | Description |
|--------|-------------|
| `DOMinSize(Vector2 to, float duration, bool snapping)` | `minWidth` / `minHeight` |
| `DOPreferredSize(Vector2 to, float duration, bool snapping)` | `preferredWidth` / `preferredHeight` |
| `DOFlexibleSize(Vector2 to, float duration, bool snapping)` | `flexibleWidth` / `flexibleHeight` |

### Outline

| Method | Description |
|--------|-------------|
| `DOColor(Color to, float duration)` | Outline color |
| `DOFade(float to, float duration)` | Outline alpha |

---

## Rigidbody

| Method | Description |
|--------|-------------|
| `DOMove(Vector3 to, float duration, bool snapping)` | Position via physics |
| `DOMoveX/Y/Z(float to, float duration, bool snapping)` | Single-axis physics move |
| `DORotate(Vector3 to, float duration, RotateMode mode)` | Rotation via physics |
| `DOJump(Vector3 endValue, float jumpPower, int numJumps, float duration, bool snapping)` | Jump — returns `Sequence` (No FROM) |
| `DOPath(Vector3[] waypoints, float duration, ...)` | Path following (No FROM) |
| `DOLocalPath(Vector3[] waypoints, float duration, ...)` | Local path (No FROM) |

---

## Rigidbody2D

| Method | Description |
|--------|-------------|
| `DOMove(Vector2 to, float duration, bool snapping)` | 2D physics position |
| `DOMoveX/Y(float to, float duration, bool snapping)` | Single-axis 2D move |
| `DORotate(float toAngle, float duration)` | 2D rotation (Z angle) |
| `DOJump(Vector2 endValue, float jumpPower, int numJumps, float duration, bool snapping)` | 2D jump — returns `Sequence` (No FROM) |
| `DOPath(Vector2[] waypoints, float duration, ...)` | 2D path (No FROM) |
| `DOLocalPath(Vector2[] waypoints, float duration, ...)` | 2D local path (No FROM) |

---

## SpriteRenderer

| Method | Description |
|--------|-------------|
| `DOColor(Color to, float duration)` | Sprite color |
| `DOFade(float to, float duration)` | Sprite alpha |
| `DOGradientColor(Gradient to, float duration)` | Gradient — returns `Sequence` |
| `DOBlendableColor(Color to, float duration)` | Additive color |

---

## AudioSource

| Method | Description |
|--------|-------------|
| `DOFade(float to, float duration)` | Volume fade |
| `DOPitch(float to, float duration)` | Pitch adjustment |

---

## Light

| Method | Description |
|--------|-------------|
| `DOColor(Color to, float duration)` | Light color |
| `DOIntensity(float to, float duration)` | Light intensity |
| `DOShadowStrength(float to, float duration)` | Shadow strength |
| `DOBlendableColor(Color to, float duration)` | Additive color |

---

## TrailRenderer / LineRenderer

| Component | Method | Description |
|-----------|--------|-------------|
| TrailRenderer | `DOResize(float toStartWidth, float toEndWidth, float duration)` | Width transition |
| TrailRenderer | `DOTime(float to, float duration)` | Time value |
| LineRenderer | `DOColor(Color2 startValue, Color2 endValue, float duration)` | Gradient colors |

---

## AudioMixer

| Method | Description |
|--------|-------------|
| `DOSetFloat(string floatName, float to, float duration)` | Exposed float parameter |

---

## VisualElement (UI Toolkit)

| Method | Description |
|--------|-------------|
| `DOMove(Vector3 to, float duration, bool snapping)` | Position |
| `DOMoveX/Y/Z(float to, float duration, bool snapping)` | Single-axis |
| `DORotate(float to, float duration)` | Z rotation |
| `DOScale(float to, float duration)` | Uniform scale |
| `DOScale(Vector2 to, float duration)` | Per-axis scale |
| `DOPunch(Vector2 punch, float duration, int vibrato, float elasticity, bool snapping)` | Punch (No FROM) |
| `DOShake(float duration, float/Vector3 strength, int vibrato, float randomness, bool snapping, bool fadeOut, ShakeRandomnessMode mode)` | Shake (No FROM) |

---

## TextMesh Pro (TMPro module)

| Method | Description |
|--------|-------------|
| `DOText(string to, float duration, bool richTextEnabled, ScrambleMode scrambleMode, string scrambleChars)` | Type-on animation |
| `DOColor(Color to, float duration)` | Text color |
| `DOFade(float to, float duration)` | Text alpha |
| `DOFaceColor(Color32 to, float duration)` | TMP face color |
| `DOFaceFade(float to, float duration)` | TMP face alpha |
| `DOGlowColor(Color32 to, float duration)` | TMP glow color |
| `DOOutlineColor(Color32 to, float duration)` | TMP outline color |
| `DOBlendableColor(Color to, float duration)` | Additive color |

For per-character animation use `DOTweenTMPAnimator` — see `dotween.md` DOTween Pro section.
