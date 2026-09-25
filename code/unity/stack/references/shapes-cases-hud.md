# Shapes — Cases: HUD and UI

> **Base path:** `Assets/Third-Party Assets/Shapes/Samples/`
> See also: [shapes-immediate-mode.md](shapes-immediate-mode.md) (drawer lifecycle, canvas drawing), [shapes-draw-api.md](shapes-draw-api.md) (overloads)

Read only the block you need. HUD-01…HUD-05 are distilled from the **FPS HUD** sample (`FpsController.cs`,
`Crosshair.cs`, `AmmoBar.cs`, `ChargeBar.cs`, `Compass.cs`), HUD-06 from the **IMCanvas** sample
(`IMCanvasSample.cs`, `IMPanelSample.cs`). All code below is original and follows the project code style; sample
scripts use the legacy `UnityEngine.Input` API and must not be copied as-is.

---

## HUD-01 — Camera-anchored HUD host

**Goal.** Draw a vector HUD (crosshair, gauges, compass) that sticks to the screen, paints over the world, and keeps a
fixed paint order — without a Canvas.

**Mode.** Immediate. One `ImmediateModeShapeDrawer` owns the command; widgets are plain components with a draw method.

**Setup.**
- `Anchor` — an empty child of the camera at local position `(0, 0, d)`, `d` a bit larger than the near clip plane
  (the sample uses 0.348). Everything is drawn in the anchor's local XY plane.
- Optional: scale the anchor so one local unit equals the screen height, making widget coordinates resolution- and
  FOV-independent: `scale = 2 · d · tan(fov / 2)`.
- One `HudShapesDrawer` referencing the camera, the anchor and the widgets in paint order.

```csharp
using Shapes;
using UnityEngine;

public abstract class HudWidget : MonoBehaviour
{
    public abstract void DrawWidget();
}
```

```csharp
using Shapes;
using UnityEngine;
using UnityEngine.Rendering;

[ExecuteAlways]
public sealed class HudShapesDrawer : ImmediateModeShapeDrawer
{
    [SerializeField] private Camera _hudCamera;
    [SerializeField] private Transform _anchor;
    [SerializeField] private HudWidget[] _widgets;   // array order = paint order

    public override void DrawShapes(Camera cam)
    {
        if (cam != _hudCamera)
        {
            return;                                   // no HUD in the Scene view or other cameras
        }

        FitAnchorToScreenHeight();

        using (Draw.Command(cam))
        {
            Draw.ResetAllDrawStates();
            Draw.ZTest = CompareFunction.Always;      // never hidden by world geometry
            Draw.LineGeometry = LineGeometry.Flat2D;
            Draw.Matrix = _anchor.localToWorldMatrix;

            foreach (HudWidget widget in _widgets)
            {
                using (Draw.Scope)                    // a widget's state never leaks into the next one
                {
                    widget.DrawWidget();
                }
            }
        }
    }

    private void FitAnchorToScreenHeight()
    {
        float distance = _anchor.localPosition.z;
        float height = 2f * distance * Mathf.Tan(_hudCamera.fieldOfView * 0.5f * Mathf.Deg2Rad);
        _anchor.localScale = new Vector3(height, height, 1f);
    }
}
```

**Pitfalls.**
- The default injection point is before post-processing: depth of field, motion blur and bloom affect the HUD. Keep
  those effects off for HUD-heavy cameras or pass a later `RenderPassEvent` (see `shapes-immediate-mode.md`).
- The anchor must be farther than the near clip plane or everything is clipped.
- Widgets that are not `[ExecuteAlways]` never run `Awake` in edit mode; guard lazily-created state in `DrawWidget`.
- Mouse-look jitter: move the camera in `LateUpdate` or before rendering; the drawer reads the anchor at render time.

**Adapt.** Any diegetic helmet HUD, cockpit overlay or scope reticle. For UI that must follow uGUI layout use HUD-06
instead.

---

## HUD-02 — Crosshair that punches on fire and flashes on hit

**Goal.** A four-arm crosshair that kicks outward when firing and a separate diagonal hit marker that appears on a
confirmed hit and fades.

**Mode.** Immediate, a `HudWidget` under HUD-01.

**Technique.** A tiny trigger-and-decay value drives each effect. Animation state is one float per effect; drawing is
a pure function of it.

```csharp
using System;
using UnityEngine;

[Serializable]
public sealed class ImpulseDecay
{
    [SerializeField] private float _decayPerSecond = 5f;
    [SerializeField] private float _magnitude = 0.01f;
    [SerializeField] private AnimationCurve _shape = AnimationCurve.EaseInOut(0f, 0f, 1f, 1f);

    private float _remaining01;

    public float Remaining01 => _remaining01;

    public float Value => _shape.Evaluate(_remaining01) * _magnitude;

    public void Trigger() => _remaining01 = 1f;

    public void Tick(float deltaTime) => _remaining01 = Mathf.Max(0f, _remaining01 - _decayPerSecond * deltaTime);
}
```

```csharp
using Shapes;
using UnityEngine;

public sealed class CrosshairWidget : HudWidget
{
    private static readonly Vector2[] _arms = { Vector2.up, Vector2.right, Vector2.down, Vector2.left };
    private static readonly Vector2[] _diagonals =
    {
        new Vector2(1f, 1f).normalized, new Vector2(1f, -1f).normalized,
        new Vector2(-1f, -1f).normalized, new Vector2(-1f, 1f).normalized,
    };

    [SerializeField] private float _innerRadius = 0.012f;
    [SerializeField] private float _outerRadius = 0.03f;
    [SerializeField] private float _thickness = 0.003f;
    [SerializeField] private Color _hitColor = new Color(1f, 0.3f, 0.3f, 1f);
    [SerializeField] private ImpulseDecay _fireKick = new ImpulseDecay();
    [SerializeField] private ImpulseDecay _hitFlash = new ImpulseDecay();

    private void Update()
    {
        _fireKick.Tick(Time.deltaTime);
        _hitFlash.Tick(Time.deltaTime);
    }

    public void NotifyFired() => _fireKick.Trigger();

    public void NotifyHit() => _hitFlash.Trigger();

    public override void DrawWidget()
    {
        Draw.LineEndCaps = LineEndCap.Round;

        float kick = _fireKick.Value;

        foreach (Vector2 arm in _arms)
        {
            Draw.Line(arm * (_innerRadius + kick), arm * (_outerRadius + kick), _thickness, Color.white);
        }

        if (_hitFlash.Remaining01 <= 0f)
        {
            return;
        }

        Color color = _hitColor;
        color.a *= _hitFlash.Remaining01;
        float squeeze = _hitFlash.Value;            // starts wide, settles inward as it fades

        foreach (Vector2 diagonal in _diagonals)
        {
            Draw.Line(diagonal * (_innerRadius + squeeze), diagonal * (_outerRadius + squeeze), _thickness, color);
        }
    }
}
```

**Pitfalls.** Keep all line calls consecutive (arms, then diagonals) — they batch into one instanced draw. Detect hits
through your damage events, not by comparing `GameObject` names as the sample does.

**Adapt.** Any "punch and settle" feedback: reticle bloom, hit markers, UI pops, radial damage indicators (replace the
arms with an arc pointing toward the damage source).

---

## HUD-03 — Segmented pip bar (ammo, charges, hearts)

**Goal.** N pips laid along an arc beside the crosshair; spent pips fly outward and fade instead of vanishing.

**Mode.** Immediate `HudWidget`.

**Technique.** Store only the time each pip was spent; derive position and alpha every frame. A single `Arc` with
round caps draws the backing plate.

```csharp
using Shapes;
using UnityEngine;

public sealed class PipArcWidget : HudWidget
{
    [SerializeField] private int _capacity = 12;
    [SerializeField] private float _radius = 0.12f;
    [SerializeField] private float _centerAngle = Mathf.PI;   // radians; PI = left of centre
    [SerializeField] private float _span = 1.2f;               // radians covered by the pips
    [SerializeField] private float _pipLength = 0.02f;
    [SerializeField] private float _pipThickness = 0.004f;
    [SerializeField] private float _fadeSeconds = 0.6f;
    [SerializeField] private float _ejectDistance = 0.03f;
    [SerializeField] private Color _plateColor = new Color(0f, 0f, 0f, 0.5f);

    private float[] _spentAt;
    private int _remaining;

    private void Awake() => Refill();

    public void Refill()
    {
        _spentAt = new float[_capacity];
        _remaining = _capacity;
    }

    public void Spend()
    {
        if (_remaining == 0)
        {
            return;
        }

        _remaining--;
        _spentAt[_remaining] = Time.time;
    }

    public override void DrawWidget()
    {
        if (_spentAt == null)
        {
            return;
        }

        float start = _centerAngle - _span * 0.5f;
        float end = _centerAngle + _span * 0.5f;
        float plateRadius = _radius + _pipLength * 0.5f;
        Draw.Arc(Vector3.zero, plateRadius, _pipLength * 1.8f, start, end, ArcEndCap.Round, _plateColor);

        Draw.LineEndCaps = LineEndCap.Round;

        for (int i = 0; i < _capacity; i++)
        {
            float angle = Mathf.Lerp(start, end, i / (_capacity - 1f));
            Vector2 direction = ShapesMath.AngToDir(angle);
            Vector2 root = direction * _radius;
            Color color = Color.white;

            if (i >= _remaining)
            {
                float t = (Time.time - _spentAt[i]) / _fadeSeconds;

                if (t >= 1f)
                {
                    continue;
                }

                root += direction * (_ejectDistance * t);
                color.a = 1f - t;
            }

            Draw.Line(root, root + direction * _pipLength, _pipThickness, color);
        }
    }
}
```

**Pitfalls.** The `_spentAt` timestamps are real state — never reset them on draw. With `_capacity == 1` the
`Lerp` divisor is zero; clamp or special-case. For a hollow outline around the plate instead of a filled one, draw two
arcs (inner and outer edge) plus two half-turn arcs at the tips — the sample's `DrawRoundedArcOutline` approach.

**Adapt.** Straight bars: replace the angle lerp with a position lerp. Hearts/shields: replace the line with
`Draw.RegularPolygon` or a textured `Draw.Texture` per slot.

---

## HUD-04 — Radial charge / cooldown gauge

**Goal.** An arc gauge that fills with a color ramp, labelled ticks that swell as the value passes them, a moving dot
at the fill head, and a glow.

**Mode.** Immediate `HudWidget`.

**Technique.** Track arc + fill arc (`Draw.Arc` with round caps), ticks as short lines, labels as `Draw.Text`, the dot
as two stacked discs (outline trick), glow as an additive radial-gradient disc.

```csharp
using Shapes;
using UnityEngine;

public sealed class ChargeGaugeWidget : HudWidget
{
    private const int TickCount = 5;

    [SerializeField] private float _radius = 0.12f;
    [SerializeField] private float _thickness = 0.015f;
    [SerializeField] private float _angleEmpty = -0.6f;
    [SerializeField] private float _angleFull = 0.6f;
    [SerializeField] private Gradient _fillColor = new Gradient();
    [SerializeField] private Color _trackColor = new Color(0f, 0f, 0f, 0.5f);
    [SerializeField] private float _labelFontSize = 0.1f;
    [SerializeField] private float _labelGrowRange = 0.15f;

    private readonly string[] _labels = new string[TickCount];
    private float _charge01;

    private void Awake()
    {
        for (int i = 0; i < TickCount; i++)
        {
            _labels[i] = $"{Mathf.RoundToInt(100f * i / (TickCount - 1))}%";   // built once, not per frame
        }
    }

    public void SetCharge(float charge01) => _charge01 = Mathf.Clamp01(charge01);

    public override void DrawWidget()
    {
        float head = Mathf.Lerp(_angleEmpty, _angleFull, _charge01);
        Color fill = _fillColor.Evaluate(_charge01);

        Draw.Arc(Vector3.zero, _radius, _thickness, _angleEmpty, _angleFull, ArcEndCap.Round, _trackColor);
        Draw.Arc(Vector3.zero, _radius, _thickness, _angleEmpty, head, ArcEndCap.Round, fill);

        DrawTicks();
        DrawLabels();

        Vector2 dot = ShapesMath.AngToDir(head) * _radius;
        Draw.Disc(dot, _thickness * 0.8f, Color.black);   // outline: bigger disc underneath
        Draw.Disc(dot, _thickness * 0.55f, fill);

        using (Draw.StyleScope)
        {
            Draw.BlendMode = ShapesBlendMode.Additive;
            Draw.Disc(dot, _thickness * 3f, DiscColors.Radial(fill, Color.clear));
        }
    }

    private void DrawTicks()
    {
        for (int i = 0; i < TickCount; i++)
        {
            Vector2 direction = ShapesMath.AngToDir(TickAngle(i));
            Vector2 from = direction * (_radius + _thickness);
            Draw.Line(from, from + direction * _thickness, _thickness * 0.2f, Color.white);
        }
    }

    private void DrawLabels()
    {
        for (int i = 0; i < TickCount; i++)
        {
            float tickValue = i / (TickCount - 1f);
            float proximity01 = Mathf.Clamp01(Mathf.Abs(tickValue - _charge01) / _labelGrowRange);
            float swell = 1f - ShapesMath.SmoothCos01(proximity01);      // 1 at the value, 0 outside the range

            float angle = TickAngle(i);
            Vector2 position = ShapesMath.AngToDir(angle) * (_radius + _thickness * 3f);
            Quaternion tangent = Quaternion.Euler(0f, 0f, angle * Mathf.Rad2Deg);

            Draw.FontSize = _labelFontSize * (1f + swell);
            Draw.Text(position, tangent, _labels[i], TextAlign.Left, Color.white);
        }
    }

    private float TickAngle(int index) => Mathf.Lerp(_angleEmpty, _angleFull, index / (TickCount - 1f));
}
```

**Pitfalls.**
- Group by type: both arcs, then all ticks, then all labels, then discs. Interleaving tick + label per iteration
  breaks every batch.
- `Draw.FontSize` is in TMP units under the current matrix; values around 0.1–0.25 suit a gauge of radius ~0.12 in
  the HUD-01 anchor. Tune by eye.
- Arc/Pie coverage is the sector of size `|end − start|` from `start`, so `start > end` is legal (an angular color
  gradient or dash pattern just runs the other way). Keep the fixed end of the gauge as `angleRadStart` and move only
  `angleRadEnd`.

**Adapt.** Ability cooldown rings (full circle: `_angleEmpty = π/2`, `_angleFull = π/2 − TAU`), stamina arcs,
speedometers. Add screen shake near full charge by offsetting `Draw.Matrix` with `Draw.Translate(shake)` inside the
widget scope.

---

## HUD-05 — Curved compass / heading strip

**Goal.** A bent horizontal strip showing ticks and N/E/S/W labels for the directions inside the view cone, with the
current heading in the middle.

**Mode.** Immediate `HudWidget`.

**Technique.** Map each world bearing inside a window around the current heading onto an arc of the UI: world angle →
0..1 with `ShapesMath.InverseLerpAngleRad` → UI angle with `Mathf.Lerp`. The strip itself is an `Arc` of large radius,
so it looks gently bent.

```csharp
using Shapes;
using UnityEngine;

public sealed class CompassWidget : HudWidget
{
    private const int TicksPerQuarter = 6;
    private static readonly string[] _cardinals = { "E", "N", "W", "S" };   // bearing 0 = +X, counter-clockwise

    [SerializeField] private Transform _viewer;
    [SerializeField] private Vector2 _center = new Vector2(0f, 0.4f);
    [SerializeField] private float _bendRadius = 0.6f;
    [SerializeField] private float _uiHalfSpan = 0.35f;      // radians of the UI arc on each side
    [SerializeField] private float _worldHalfWindow = 1.5f;  // radians of world bearing visible on each side
    [SerializeField] private float _thickness = 0.003f;

    public override void DrawWidget()
    {
        Vector3 forward = _viewer.forward;
        float heading = ShapesMath.DirToAng(new Vector2(forward.x, forward.z));
        Vector2 arcOrigin = _center - Vector2.up * _bendRadius;
        float uiMin = Mathf.PI * 0.5f - _uiHalfSpan;
        float uiMax = Mathf.PI * 0.5f + _uiHalfSpan;

        Draw.Arc(arcOrigin, _bendRadius, _thickness, uiMin, uiMax, ArcEndCap.Round, Color.white);

        const int tickCount = TicksPerQuarter * 4;

        for (int i = 0; i < tickCount; i++)
        {
            float bearing = i / (float)tickCount * ShapesMath.TAU;
            float t = ShapesMath.InverseLerpAngleRad(heading - _worldHalfWindow, heading + _worldHalfWindow, bearing);

            if (t <= 0f || t >= 1f)
            {
                continue;
            }

            float uiAngle = Mathf.Lerp(uiMin, uiMax, t);
            Vector2 direction = ShapesMath.AngToDir(uiAngle);
            float edgeFade = Mathf.Clamp01((1f - Mathf.Abs(2f * t - 1f)) * 4f);
            bool isCardinal = i % TicksPerQuarter == 0;
            float length = isCardinal ? 0.03f : 0.015f;
            Vector2 root = arcOrigin + direction * _bendRadius;

            Draw.Line(root, root + direction * length, _thickness, new Color(1f, 1f, 1f, edgeFade));

            if (isCardinal)
            {
                Quaternion tangent = Quaternion.Euler(0f, 0f, (uiAngle - Mathf.PI * 0.5f) * Mathf.Rad2Deg);
                Draw.Text(root + direction * 0.05f, tangent, _cardinals[i / TicksPerQuarter], TextAlign.Center, new Color(1f, 1f, 1f, edgeFade));
            }
        }

        Draw.RegularPolygon(_center - Vector2.up * 0.02f, 3, 0.01f, -Mathf.PI * 0.5f, 0f, Color.white);  // centre notch
    }
}
```

**Pitfalls.** Bearings wrap at ±π — always use `InverseLerpAngleRad`, never a plain `InverseLerp`, or the strip jumps
at the seam. `InverseLerpAngleRad` measures the short way between its two limits, so the whole world window
(`2 · _worldHalfWindow`) must stay below π. Bearings grow counter-clockwise seen from above, i.e. toward the viewer's
left, which is why `heading + window` maps to `uiMax` (the left end of the arc). This block interleaves lines and text
for readability; for many ticks collect the label positions and draw them in a second loop.

**Adapt.** Radar bearings, objective markers on the strip (map their bearing the same way), wind direction.

---

## HUD-06 — Vector widgets inside a uGUI Canvas

**Goal.** Health/stamina/mana bars and canvas-wide decoration drawn with Shapes but laid out by `RectTransform`s —
works in **Screen Space – Overlay**, where shape components cannot render.

**Mode.** Immediate, through `ImmediateModeCanvas` (on the Canvas) and `ImmediateModePanel` (on each widget).

**Setup.** Canvas (+ `CanvasScaler`) with `CanvasDecorationDrawer`; child `RectTransform`s ("Health", "Stamina") each
with `ShapesBarPanel`. Rotating or scaling a panel's `RectTransform` rotates/scales its drawing.

```csharp
using Shapes;
using UnityEngine;

public sealed class CanvasDecorationDrawer : ImmediateModeCanvas
{
    [SerializeField] private float _frameThickness = 6f;

    public override void DrawCanvasShapes(ImCanvasContext ctx)
    {
        Draw.RectangleBorder(ctx.canvasRect, _frameThickness, 12f, new Color(1f, 1f, 1f, 0.4f));  // behind panels
        DrawPanels();                                                                                // panels paint here
        Draw.Disc(Vector3.zero, 3f, Color.white);                                                    // on top: canvas centre dot
    }
}
```

```csharp
using Shapes;
using UnityEngine;

public sealed class ShapesBarPanel : ImmediateModePanel
{
    [SerializeField] private string _title = "Health";
    [SerializeField] private Gradient _fillColor = new Gradient();
    [SerializeField] private float _padding = 6f;
    [SerializeField] private float _cornerRadius = 8f;
    [SerializeField, Range(0f, 1f)] private float _fill01 = 1f;

    public void SetFill(float fill01) => _fill01 = Mathf.Clamp01(fill01);

    public override void DrawPanelShapes(Rect rect, ImCanvasContext ctx)
    {
        Draw.Rectangle(rect, _cornerRadius, new Color(0f, 0f, 0f, 0.7f));

        Rect fillRect = new Rect(rect.x + _padding, rect.y + _padding, rect.width - 2f * _padding, rect.height - 2f * _padding);
        fillRect.width *= _fill01;

        if (fillRect.width > 0f)
        {
            Draw.Rectangle(fillRect, _cornerRadius * 0.5f, _fillColor.Evaluate(_fill01));
        }

        Draw.RectangleBorder(rect, 3f, _cornerRadius, Color.white);

        Draw.FontSize = 240f;                                   // roughly 10x the glyph height in canvas units
        Draw.Text(new Vector2(rect.xMin, rect.yMax + 6f), _title, TextAlign.BottomLeft, Color.white);
    }
}
```

**Pitfalls.**
- Override `DrawCanvasShapes`/`DrawPanelShapes`, never `DrawShapes` — the canvas base already opens the command,
  sets `ZTest = Always` and the canvas matrix.
- Units are canvas units (after `CanvasScaler`), so thicknesses are UI pixels at the reference resolution. Shapes text
  goes through TextMeshPro's 3D scale, so `Draw.FontSize` is about ten times the glyph height (the sample uses 240).
- A panel with no `ImmediateModeCanvas` ancestor logs a warning and draws nothing.
- Shapes panels render in the camera's pass (before post-processing), not inside uGUI's batch. uGUI sibling order does
  not interleave with them, and in an Overlay canvas every regular uGUI element paints on top of them. Keep
  Shapes-only visuals on their own canvas.
- Clicks still need normal uGUI `Graphic`s with raycast targets; Shapes panels are visuals only.

**Adapt.** Any single-value gauge (linear or radial) in UI, rounded-corner cards, custom-shaped button backplates,
radial menus (PROC-04 as a panel).

---

## HUD-07 — Frequently changing numeric text without GC

**Goal.** Score, ammo count, timer or FPS readout updated every frame with zero string allocations.

**Mode.** Immediate (any drawer or `HudWidget`).

```csharp
using Shapes;
using UnityEngine;

[ExecuteAlways]
public sealed class ScoreReadoutWidget : HudWidget
{
    [SerializeField] private Vector2 _position = new Vector2(-0.8f, 0.45f);
    [SerializeField] private float _fontSize = 0.15f;

    private TextElement _text;
    private int _shownScore = int.MinValue;
    private int _score;

    private void OnEnable() => _text = new TextElement();

    private void OnDisable()
    {
        _text.Dispose();
        _text = null;
    }

    public void SetScore(int score) => _score = score;

    public override void DrawWidget()
    {
        if (_text == null)
        {
            return;
        }

        if (_score != _shownScore)                  // rebuild the glyphs only when the value changes
        {
            _shownScore = _score;
            _text.ClearText();
            _text.AppendString("SCORE ");
            _text.AppendInt(_score);
        }

        Draw.Text(_text, _position, TextAlign.TopLeft, _fontSize, Color.white);   // no content argument = keep the element's text
    }
}
```

**Pitfalls.** Overloads that take an element but no `content` (or `content: null`) keep the element's current text;
passing a string re-lays it out. Always dispose `TextElement`s — the text pool refuses past 1000 live elements. Text ignores custom `ZTest`; it still draws on
top here because the HUD anchor is in front of everything.

**Adapt.** Damage numbers (one `TextElement` per pooled number object), timers (`AppendFloat(seconds, "0.0")`),
debug counters.
