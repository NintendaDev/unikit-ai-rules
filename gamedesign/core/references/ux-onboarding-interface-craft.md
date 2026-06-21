# UX & Onboarding — Interface Craft (Intent, Mapping, Metaphor)

Detailed input/output interface-craft material extracted from `ux-onboarding.md`
(load on demand when mapping controls to player intent, minimizing interface
friction, or choosing/building an interface metaphor vocabulary). The main rule
keeps the conceptual hook; this file holds Sylvester's intent-translation model,
the mapping / constrained-control / invisible-input-assist craft, the metaphor
toolkit with its good/bad table, and both checklists. Source: Tynan Sylvester,
*Designing Games* (O'Reilly, 2013), Ch 3, 9.

## Interface as Intent Translation (Sylvester)

Sylvester frames the interface as a **two-way translator**, the distinctive
complement to Schell's transparency: "*the game is no more than what it
communicates.*" One arrow carries the game's **state** out to the player's mind
(output signal); the other carries the player's **intent** back into the game
(input signal). The design goal of the input side is **synchronization between
the player's intent and the in-game action** — the player thinks "throw fireball"
and the character throws, with no felt gap. Every point where that translation
loses fidelity is **interface friction**, and friction is where intent leaks:

- **Output friction — noise.** A signal that carries no meaningful information to
  the player's model of the game *is noise*, even if it is loud or beautiful.
  Over-detailed graphics are a top source: a gray-box level reads instantly
  because every shape has mechanical meaning; skinning it in art buries the
  mechanically-relevant shapes among decorative lines and colors. Match signal
  density to what the player can absorb; differentiate the games whose look is
  *built* to stay legible (Team Fortress 2, Portal, Mirror's Edge read like
  gray-box). (This is the read half of the loop; the *salience-ranking* of those
  signals is the Hodent/Schell channel material — don't re-rank here.)
- **Input friction — lost intent.** Intent is lost when the mapping is ambiguous,
  when controls that physically can't be used together are mapped to actions the
  player wants simultaneously, or when the response lags or never arrives.
- **Redundancy beats forcing.** Because players look anywhere and miss signals
  (unlike film/book audiences, who then blame themselves), send a critical
  message **several times across different paths** (companion shouts + points +
  a lit plank trail + a HUD marker) so a missed cue still lands — rather than
  hijacking the camera or a modal popup, which break flow. *Passive* redundancy
  fires the backup cues only if the primary is missed.

The payoff is identical to Schell's transparency — "the interface disappears" —
but Sylvester gets there by minimizing translation loss in both directions, not
only by intuitiveness. A game can be brilliant and still be **buried behind its
interface** if intent and state don't cross it cleanly.

### Mapping, Constrained Control & Invisible Input Assist

The input side has its own craft for shrinking friction (Sylvester):

- **Mapping** — make the physical control *resemble* its in-game effect so it
  works as a built-in mnemonic; the player never memorizes an abstract
  button↔action table. The kitchen stove whose knobs sit in the layout of the
  burners needs no labels; BioShock maps left/right triggers to the character's
  left/right hands, and ties the red health bar to the red heal button. Map by
  position, shape, color, or motion — and lean on cultural convention (red =
  health), which is itself a metaphor.
- **Constrained control** — when the *physical* interface forbids two inputs at
  once (one finger can hold the bumper *or* the trigger, not both), map those to
  game actions that are **also** mutually exclusive (select weapon vs. fire).
  Constrained controls fronting *unconstrained* actions cause the classic
  frustration: tool-swap on the D-pad while movement is on the same thumb's
  stick, forcing the player to stop moving to swap. Either move the control or
  add the matching in-game constraint.
- **Invisible input assist** — guess the player's intent and silently nudge the
  raw input to match, so the player never knows they were helped. Aim assist is
  the canonical case: a layered set of sub-systems (track the target's screen
  motion, slow the reticle as it crosses a target, bend a near-miss onto it) that
  each only adjust what the player *can't perceive*. Done well, the player credits
  their own skill — and the same lever can balance (Halo's sniper gets zero assist
  un-scoped to discourage close-range use). This is the *fidelity-of-intent* tool;
  the response-latency budget (frame pipeline, 30 vs 60 fps) is owned by the
  frameworks game-feel section.

> **Intent-translation checklist** (Sylvester)
> - Out: is any on-screen/audio element noise — present but carrying no meaning
>   to the player's model? Cut or quiet it.
> - In: does the physical mapping resemble its effect, or must it be memorized?
> - Do mutually-exclusive controls front mutually-exclusive actions (and vice
>   versa)?
> - For any must-not-miss message, how many independent channels carry it?

## Metaphor & Intuition (Sylvester)

Metaphor is Sylvester's mechanism for making an interface *intuitive*: wrap
unfamiliar mechanics in **familiar concepts** so the player imports existing
knowledge instead of learning from zero ("folders" on a disk, real Newtonian
physics, fire, supply-and-demand). The fiction layer of a whole game is, at its
most basic, one giant metaphor that makes its systems comprehensible. Sources to
borrow from:

- **Real objects & systems** — cars, books, gravity, electricity; real physics is
  a powerful, zero-teaching system foundation precisely because everyone already
  knows it.
- **Cultural archetypes** — goatee = villain, square jaw = hero, red = danger.
- **Game clichés** — food heals bullet wounds, lava is safe if untouched, an "X"
  in the corner closes a window. Useful where no real-world analog exists, but
  **dangerous**: unreadable to anyone who lacks the convention (a player stuck in
  the original *Zelda* because a cracked wall "means" bombable — a learned rule,
  not a real-world inference).
- **Logical/spatial systems** — the most abstract and most elegant: chess maps 64
  squares onto a 2-D plane so the brain's native spatial reasoning does the work.

The cost of metaphor: it implies more than the mechanics deliver. By an unspoken
contract, the designer uses metaphor to teach and the player forgives that not
every implied property is real (in-game cars rarely need oil changes). But that
leaves the player guessing **which** properties are real mechanics. The fix is a
consistent **metaphor vocabulary**: pick stable visual signifiers for "this is
actually interactive" and never break them. *Prince of Persia* gives climbable
bricks one unique, unchanging look, taught in an early puzzle with no other path,
so the player recognizes them for the rest of the game across every environment.
Breaking an established metaphor — or letting fiction imply mechanics that don't
exist — sends the player pixel-hunting and, at worst, makes them quit at an
"impossible" wall that was never meant to block them.

| Intent | Metaphor used | Good (clean translation) | Bad (broken metaphor) |
|--------|---------------|--------------------------|-----------------------|
| "Heal me" | Red = health (cultural) | Red bar + red heal button + red kit pickup all match | Heal item rendered green, hidden among loot |
| "Climb here" | Distinct brick shape (game vocab) | One unchanging climbable-brick look, taught early, reused everywhere | Some cracked walls bombable, others decorative — no signal which |
| "Throw fireball" | Left hand = magic (BioShock) | Left trigger casts, right trigger shoots; hands match triggers | Both abilities on one stick mode the player can't tell apart |
