# Core Loops — Interest Curves

Detailed session-pacing material extracted from `core-loops.md` (load on demand
when plotting an interest curve for a session, level, or encounter). The main
rule keeps the conceptual hook; this file holds the full canonical shape, the
fractal-nesting rule, the three interest factors, the checklist, and the worked
session-beat example. Source: Jesse Schell, *The Art of Game Design: A Book of
Lenses*, Ch 16.

## Interest Curves

Where loop anatomy answers *why a player returns*, the **interest curve** answers
*how engagement is paced across one whole experience* — a session, a level, a
single encounter. Treat any experience as a sequence of moments of differing
strength, and plot the player's interest over time. The canonical successful
shape:

1. **Entry interest** — the player arrives already curious, from packaging,
   marketing, and reputation. Set expectations *high enough to start, not so high
   the rest disappoints.*
2. **The hook** — an early spike (intro cinematic, opening riff, the ghost in
   *Hamlet*) that buys attention and carries the player through the slower setup
   that follows.
3. **Rising peaks and valleys** — interest climbs overall, cresting at successive
   peaks and dipping into rest valleys *only to climb higher* — the valleys make
   the next peak land.
4. **Climax** — the biggest peak, the spectacular finale that eclipses everything
   before it.
5. **Residual interest** — the player leaves satisfied but wanting more ("leave
   them wanting more"); ideally exit interest sits *above* entry interest.

The common failure curve: no hook, an early dip below the **interest threshold**
(the line at which the player changes channel / closes the app / quits), then a
too-late spike that no longer matters because attention was already lost.

**Interest curves are fractal — curves within curves at every timescale.** This is
the same nesting as the timescale layers, viewed as pacing rather than re-entry:
the whole game is a curve (intro film → rising levels → final climax); each level
is a curve (fresh aesthetic/tension hook → escalating challenges → boss); each
challenge is a curve (interesting setup → step-by-step difficulty rise). A flat
segment is a defect — either cut it or let the player skip it. (Validated beyond
short sessions: *Half-Life 2 Ep.1*'s per-section death counts trace this shape
across a ~5.5-hour playthrough.)

**The three factors of interest** — when a beat feels weak, raise one of these:

- **Inherent interest** — some events simply grip more: risk over safety, the
  fantastic over the mundane, dramatic change over routine. (Wrestling a crocodile
  beats eating a sandwich.)
- **Poetry of presentation** — the aesthetic quality of the delivery (art, music,
  cinematography, prose). High polish lifts even low-inherent material; a violin
  recital lives or dies on presentation.
- **Projection / empathy** — how deeply the player puts *themselves* into the
  experience. Interactive media's edge: the player is the protagonist, events
  happen to *them*. Strong projection compensates for low inherent interest and
  thin presentation — *Tetris* is bare dropping blocks, but total agency drives
  intense projection. Build it via relatable characters, a coherent (not
  necessarily realistic) imagined world, immersion (fragile — one contradiction
  breaks it), and multiple ways to enter the fiction.

**Interest-curve checklist** (Schell's lens, distilled): Does the experience open
with a real hook? Does interest rise through peaks and rest-valleys to a finale
that overshadows the rest? Are there fractal curves at level and encounter scale —
and do you want them there? Does your predicted curve match what playtesters
actually feel (have them draw their own)? Draw a separate curve per target
audience — a beat that grips one segment may bore another.

## Worked Example — Session Interest Curve

A target interest curve for one ~25-minute roguelite run, beats vs interest
(0–10 = relative interest, not absolute "fun units"; only the *shape* matters):

| Beat | Time | Interest | Role on the curve |
|---|---|---|---|
| Boot / menu | 0:00 | 3 | entry interest (from reputation) |
| Run-start cinematic + first elite sighting | 0:30 | 8 | **hook** — early spike buys attention |
| Early rooms, basic clears | 2:00 | 5 | rest valley — establish verbs, low stakes |
| First build-defining drop | 5:00 | 8 | peak C — power reward, anticipation rises |
| Travel / shop lull | 8:00 | 5 | valley D — restock, breathe |
| Mini-boss | 12:00 | 9 | peak E — skill test, spectacle |
| Pre-boss prep / loadout | 16:00 | 6 | valley F — tension coil before climax |
| Final boss | 20:00 | 10 | **climax** — biggest peak, eclipses all |
| Reward screen + meta-unlock preview | 24:00 | 7 | **residual** — leave wanting more (> entry 3) |

Reading the curve: the hook (8) outruns entry (3); peaks climb C→E→climax
(8→9→10) with valleys between (5/5/6) that *set up* each next peak; residual (7)
exits above entry (3) — "leave them wanting more." The curve is **fractal** — the
mini-boss beat (E) is itself a hook→escalation→defeat sub-curve, and so is each
room clear. If the "Travel/shop lull" (D, interest 5) ever flattens into a long
dead stretch, either compress it or let the player skip it.
