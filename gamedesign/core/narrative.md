---
version: 1.0.0
---

# Narrative Design

> **Scope**: Narrative design method — the story bible as canon source, character sheets that earn a gameplay function, branching structures (gauntlet, branch-and-bottleneck, foldback, open) and their combinatorial cost, environmental and embedded storytelling, reactive bark/dialogue systems (Firewatch model), and ludonarrative consonance.
> **Load when**: designing story, characters, dialogue, or quests; choosing a branching structure; writing barks or reactive dialogue; aligning narrative with mechanics; building a story bible or character sheet.

---

Narrative *design* is the architecture of how story is delivered through play —
distinct from writing prose. This rule is about structure and integration
(Heussner et al., *The Game Narrative Toolbox*).

## The Story Bible

The single canonical source for the fiction — world rules, history, tone,
factions, timeline, naming conventions. Everything written elsewhere must agree
with it.

- Treat the bible as the narrative **facts registry**: proper nouns, dates, and
  canon facts must stay consistent everywhere so a character's home town can't
  drift between two quests.
- Tone and content guardrails live here too — what the game will and won't depict.

## Character Sheets With a Gameplay Function

Every character earns a **mechanical purpose**, not just a backstory:

- A character sheet pairs fiction (role, voice, arc, relationships) with
  **function**: what does this character *do for the player's experience* — a
  vendor, a tutorial guide, an antagonist who gates a pillar, a companion whose
  mechanics express their personality?
- A character with rich lore and no gameplay function is content debt; a
  mechanically central character with no defined voice reads as a system, not a
  person. Both halves or cut one.

## Branching Structures

Choose a structure for the **fantasy of agency** you want vs the cost you can
afford:

| Structure | Shape | Cost | Player feels |
|---|---|---|---|
| Linear | one path, no choice | lowest | authored, guided |
| Gauntlet | choices that only delay/branch briefly then rejoin | low | small agency, cheap |
| Branch & bottleneck (foldback) | branches that reconverge at story beats | moderate | real local choice, controlled scope |
| Open / state-based | choices set world flags, content reacts | highest (combinatorial) | deep agency, expensive to author |

- **Combinatorial cost is the trap**: fully independent branches multiply
  content. **Foldback** (branch-and-bottleneck) is the workhorse — it grants felt
  choice while keeping authored content linear-ish; reconvergence points are
  where you reclaim scope.
- Track choice **consequences as state** (flags), so reactive content
  (barks, world changes) can read them consistently.

## Environmental & Embedded Storytelling

- **Show through space**: a ransacked room, a body, a graffiti tag tells story
  with zero reading cost. Players skip text; they *inhabit* space.
- **Embedded** narrative (logs, item descriptions, overheard barks) is opt-in
  depth for players who want it — never put critical-path information *only* in
  skippable text.
- Environmental storytelling overlaps the level-design rule's composition: the
  same landmark can guide the eye and tell the story.

## Reactive Bark / Dialogue Systems (Firewatch)

For reactive, context-sensitive lines (the *Firewatch* dialog system, GDC 2017),
specify the selection logic, not just the lines:

- Each bark/line carries: **trigger** (the event), **conditions** (world/state
  flags, character knowledge), **priority** (which line wins when several match),
  **cooldown** (anti-repetition), and a **one-shot vs variant pool** flag.
- **Barge-in / interruption** handling: what happens when a higher-priority line
  fires mid-bark, or the player moves away — define it or get audible nonsense.
- The selection rules are a small state machine — define them as rules, not as a
  flat line list; the lines are content, the *selector* is design.

## Ludonarrative Consonance

Mechanics and story must say the **same thing**. Ludonarrative *dissonance* (a
remorseful character the player controls as a mass killer) breaks immersion by
contradicting itself.

- Test each pillar: does the mechanic reinforce the fiction it sits in? A "lonely
  survival" pillar undercut by chatty, generous systems is dissonant.
- When a mechanic must diverge from fiction for fun, make it a **named, deliberate
  trade-off** (an aesthetic-vs-systems tension, frameworks-rule MDA language) —
  not an accident.

## Anti-patterns

- Characters with deep lore and no gameplay function (or function with no voice).
- Choosing fully independent branches and discovering the combinatorial blowup
  late — foldback was the affordable structure.
- Critical-path information hidden only in skippable embedded text.
- A bark list with no trigger/condition/priority/cooldown — repetition and
  audible nonsense in play.
- Story and mechanics contradicting each other with no named trade-off
  (ludonarrative dissonance shipped by accident).
- Canon facts (names, dates) duplicated in prose instead of the registry —
  guaranteed drift.
