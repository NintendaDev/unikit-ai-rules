# Narrative — Reactive Bark / Dialogue Systems

Detailed bark/dialogue selector spec extracted from `narrative.md` (load on
demand when designing a reactive, context-sensitive line system). The main rule
keeps the conceptual hook; this file holds the full spec. Source: *Firewatch*
dialog system (GDC 2017).

## Reactive Bark / Dialogue Systems (Firewatch)

For reactive, context-sensitive lines (the *Firewatch* dialog system, GDC 2017),
specify the **selector**, not just the lines — the lines are content, the selector
is design.

- Each bark carries: **trigger** (the event), **conditions** (world/state flags,
  character knowledge), **priority** (which line wins when several match),
  **cooldown** (anti-repetition), and a **one-shot vs variant-pool** flag.
- Handle **barge-in / interruption**: what happens when a higher-priority line fires
  mid-bark, or the player walks away — define it or get audible nonsense.
- **Combinatorial explosion is the core writing problem.** States × variants ×
  speakers × placements multiplies fast — track the matrix in a **spreadsheet/
  database**, not a flat list.
- **Craft rules:** every line in that character's **distinct voice** (dialogue is a
  character's "emotional DNA"), and **brief** — a game can't lean on long monologues
  the way a film can; long lines pull focus off play.
- **"There's no such thing as bad voice acting."** What reads as bad acting is bad
  *dialogue* plus a bad pipeline — give the actor a mood column per line and, ideally,
  the writer in the booth.
- **Interactive dialogue** must anticipate every response; the moment a quest-giver
  repeats a line, the fourth wall breaks — an unsolved problem to design around.
