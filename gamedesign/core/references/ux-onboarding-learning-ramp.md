# UX & Onboarding — The Learning Ramp & Uncertainty

Detailed skill-ramp material extracted from `ux-onboarding.md` (load on demand
when designing a difficulty/skill ramp, widening a game's skill range, or framing
onboarding as managing player uncertainty). The main rule keeps the conceptual
hook; this file holds Sylvester's full learning ramp (floor/ceiling/range, the
three transformations, the ramp-building levers, the checklist) and Zubek's
"learning as overcoming uncertainty" lens with the Costikyan taxonomy table.
Sources: Tynan Sylvester, *Designing Games* (O'Reilly, 2013), Ch 3, 9; Robert
Zubek, *Elements of Game Design* (MIT Press, 2020), Ch 5 (drawing on Koster and
Costikyan).

## The Learning Ramp (Sylvester)

Where the JIT/teach-by-doing material covers *how* to introduce one mechanic,
Sylvester frames onboarding as building the player's **mental model up an
escalating ramp** — and as fitting the game's *skill range* to its audience.
Three anchors:

- **Accessibility (floor)** — the minimum skill below which the game is unplayable
  (an FPS demands you can move, turn, and shoot before any content lands).
  Designers chronically underestimate the floor because they no longer see it.
- **Depth (ceiling)** — how much remains to learn at high skill; the **skill
  ceiling** is the level above which no further mastery helps. A game is
  *infinitely deep* if the ceiling lies beyond human ability (StarCraft II
  multiplayer); shallow once "solved" (tic-tac-toe).
- **Skill range** — the span between floor and ceiling: *easy to learn, hard to
  master* is a wide range and the goal of elegant design.

**The skill ladder is the mental model forming in layers.** Sylvester's three
transformations describe the order in which a player's model deepens, and good
teaching walks them up it:

1. **Mechanical** — operating the interface itself (aim and hold, where the block
   lands, how each piece moves). *Every* game starts here; this is what
   teach-by-doing must get past first.
2. **Situational** — the mechanics are unconscious; the challenge is now *when and
   on whom* to use them (which units, which target, which counter).
3. **Intellectual** — reading and out-thinking another mind; reached rarely, and
   why the deepest games are multiplayer (a system can be mastered; a person
   cannot be fully read).

Levers that build the ramp without the player feeling taught:

- **Invisible / optional / adaptive teaching.** The best tutorial is the one the
  player never notices — woven into narrative (Call of Duty 4's training run is a
  story beat *and* a timed challenge experts race), skippable when not needed, or
  **adaptive** (the game detects the missing skill and teaches just that). The
  least intrusive lesson is the unnecessary one that never happened.
- **Flexible goals widen the range.** Replace binary pass/fail with graded
  outcomes so every skill level has a hard-but-reachable target (darts' scoring
  rings; Hitman's Silent Assassin rating; grab-the-ledge instead of fall-and-die).
  Graded *failure* works the same way — let a setback cost resources or progress,
  not a restart.
- **Difficulty adjustment.** *Explicit* (easy/normal/hard — simple but players
  fear choosing wrong), *adaptive* (silently ease after deaths / harden after
  wins — only works while hidden and only for non-expert audiences, who else
  game it), and *implicit* (class or strategy choice self-selects difficulty —
  the only one safe in competitive multiplayer; Team Fortress 2 classes).
- **Emotional support over the early boundary.** Before the player has any skill,
  the experience can't lean on puzzle-solving or combat, so carry them with
  *skill-free* triggers — art, characters, music, a tech-demo spectacle. BioShock's
  opening (plane crash, lighthouse, "No gods or kings, only man") teaches the
  walk/look controls while the player is too absorbed to notice a tutorial. This
  is the mechanism behind "get the player playing fast": fill the pre-skill
  minutes with emotion, not a "press W to walk" wall.

> **Learning-ramp checklist** (Sylvester)
> - Where is this game's accessibility floor — and have I tested it on someone who
>   has *never* played the genre?
> - Does the model build mechanical → situational → intellectual, one layer
>   surfacing as the last becomes automatic?
> - Can a lesson be made invisible, optional, or adaptive — or skipped entirely?
> - Do graded goals give every skill level a hard-but-reachable target?

## Learning as Overcoming Uncertainty (Zubek)

Sylvester's ramp frames *how* to escalate teaching; Zubek (*Elements of Game
Design*, Ch 5, drawing on Koster and Costikyan) frames *why* it works and what the
player is actually learning — a complementary lens for tuning onboarding.

**Fun is learning, and learning needs a safe space (Koster).** Players enjoy
building a mental model of the game and learning to *predict its outcomes*; that
enjoyment only happens in a low-stakes environment with room to experiment and
fail. Onboarding's job is therefore to protect a safe experimentation space — never
punish early mistakes hard — and to keep the model *growing*: once a player fully
understands and can predict a system, that loop goes stale, so teaching must keep
opening new layers as skill rises (the re-entry / skill-ceiling argument is owned by
the core-loops rule).

**What the player is learning is to manage uncertainty (Costikyan).** Frame the
onboarding ramp as progressively handing the player the tools to overcome each kind
of uncertainty a game poses — the order below is a teaching sequence, floor first:

| Uncertainty type | What the player learns to manage | Onboarding implication |
|------------------|----------------------------------|------------------------|
| Performance (skill) | executing actions reliably (aim, time, route) | the accessibility floor — drill the raw verbs first, in safety |
| Perception | reading a cluttered or partly-hidden display | teach the HUD / how to scan before the content that needs it |
| Decision | choosing among legible options | introduce one decision axis at a time |
| Player unpredictability | predicting an opponent / ally / AI | a late-ramp skill — gate behind mechanical mastery |
| Complexity / hidden info | branching depth, fog of war | reveal layers gradually, not all at once |
| Anticipation | what comes next (story, an evolving game) | the pull that carries the player past the early ramp |

(The same taxonomy seen as *decision* uncertainty — hidden info, yomi, speed,
randomness — is owned by the core-loops rule; here it is reframed as *what teaching
must defuse*.)

**Skill uncertainty is the lever you directly control.** A novice's biggest
uncertainty is *their own inability to perform*; because its source is the player,
you raise or lower it by tuning difficulty and posing new challenges. Synchronise
each difficulty increase to the *rising* skill curve — escalate the same loop, add
a harder loop, or introduce a new challenge type — because misalignment breaks the
player either way: too fast reads as frustration, too slow as boredom.
