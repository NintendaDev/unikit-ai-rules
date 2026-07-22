# Balance — The Twelve Types of Balance (Schell)

Detailed pre-tuning audit checklist extracted from `balance.md` (load on demand
when running a qualitative balance audit across all twelve axes). The main rule
keeps the conceptual hook; this file holds the full list and its worked example.
Source: Jesse Schell, *The Art of Game Design*, Ch 12–13. Several axes map onto
the deeper sections of `balance.md` (noted inline).

## The Twelve Types of Balance (Schell)

The Schreiber & Romero "Kinds of Balance" taxonomy asks "is the *math* priced
right?". Jesse Schell's **twelve types of game balance** are a wider, qualitative
checklist of **axes the designer must consciously place** — most aren't about cost
curves at all. Run the list as a pre-tuning audit: for each axis decide where this
game should sit and why. Several map onto the deeper sections of the balance rule
(noted).

1. **Fairness — symmetric vs asymmetric.** Symmetric (equal forces) is
   auto-fair and the cleanest skill test, but real symmetry leaks at "who goes
   first?" — settle it by a coin flip or let the weaker player go first.
   Asymmetric is harder to balance (sum each side's force values and equalize the
   totals) but buys realism, exploration ("ten fighters = a hundred games"),
   personalization, handicapping, and the player-curiosity hook *"is this game
   fair?"*. (→ Possibility-Space Levers, Cost Curves.)
2. **Challenge vs success — the flow corridor.** Keep the player between boredom
   (too easy) and frustration (too hard). Tools: ramp difficulty after each win,
   let skilled players *skip* easy stretches fast, grade-gate ("clear with a 3+"),
   offer difficulty modes, playtest with **both** novices and experts, and give
   the trailing player a break (Mario Kart's rubber-band item drops). Ask "what %
   of players should finish?". (→ Power, Difficulty, TTK/TTC.)
3. **Meaningful choices — kill dominant *and* dominated options.** A choice is
   dead if one option is clearly best (dominant strategy / exploit) or if no one
   would ever pick an option. Match the *number* of choices to the player's
   *desire* count (Mathis: choices > desires → overwhelm; < → frustration;
   = → freedom). Aim for **triangularity** (below). (→ Degenerate Strategies,
   Characters & Builds.)
4. **Skill vs chance.** Skill games rate the player (sport-like); chance games
   relax and randomize. Alternate them (random deal → skilled play) and pick the
   mix for the audience. (→ Luck & Skill; Probability & Expected Value.)
5. **Head vs hands — mental vs dexterity.** Decide the thinking-to-twitch ratio
   and **signal it honestly** — a puzzle game dressed as an action platformer
   (Pac-Man 2) disappoints both crowds. Rate the game 1 (pure dexterity) to 10
   (pure mental); consider offering a dexterity *or* strategy path to the same win.
6. **Competition vs cooperation.** Both are primal drives. You can blend them via
   **team competition**, or hold them in deliberate tension (Joust's alternating
   Team Wave / Gladiator Wave). Cooperation needs real communication and tasks
   that are impossible solo (so 2+2 = 5, not 3).
7. **Short vs long — session length.** Too short blocks strategy; too long bores
   or filters out players. Length is driven mainly by **win/loss conditions** —
   tune those (Spy Hunter's 90 s of invincibility before lives count; Minotaur's
   20-minute "Armageddon" room that forces an ending).
8. **Rewards.** Catalogue what you grant: praise, points, prolonged play (lives /
   energy), gateways, spectacle, expression, powers, resources, status,
   completion. More *types* is usually better. Fight habituation: **escalate**
   reward value with progress, and make rewards **variable** (1/3 chance of 30 pts
   beats a flat 10 — same average, longer-lasting thrill).
9. **Punishment.** Used well it raises stakes, creates endogenous value, and
   makes risk meaningful — but punishment motivates less than reward, so **convert
   to reward where you can** (Diablo: no hunger penalty, but eating gives a buff).
   Punishment must be *understandable and avoidable*, or it reads as unfair (→ AI
   Fairness). Stack mild penalties (Toontown "sadness") rather than one harsh one.
10. **Freedom vs controlled experience.** A game is not a life-sim; strip boring
    or pointless decisions. Take control away exactly where every player would do
    the same thing anyway (Aladdin's scripted final flight to Jafar — no tester
    noticed losing freedom).
11. **Simple vs complex — elegance.** Split *innate complexity* (heavy rulebooks,
    "except / unless / even if" exceptions — sometimes needed for sim fidelity or
    balance) from *emergent complexity* (simple rules → deep play, the prized
    kind). Prefer **natural balance** (behaviour emerges from one rule — Space
    Invaders' "fewer aliens move faster") over **artificial balance** (piling on
    rules). Measure **elegance** by counting an element's *purposes* (Pac-Man dots
    serve five) — merge or cut single-purpose elements. Keep a little **character**
    (deliberate non-functional quirk) so elegance doesn't become bland.
12. **Detail vs imagination.** Decide what to render and what to leave to the
    player's mind. Detail only what you can do *better* than the player imagines
    (subtitles beat bad synthesized speech); supply details the imagination can
    *reuse* (chess piece roles) and that *stimulate* it; skip detail for familiar
    things. Use the "binocular effect" — one close-up early, then let memory fill in.

> **Worked asymmetric balance (Schell's biplane fight).** Rate each stat
> Low/Med/High = 1/2/3 and sum per plane. Playtest shows the firepower stat is
> ~2× as valuable, so re-weight that column to 2/3/6 and re-sum — the totals now
> match the felt win-rates, and you raise the loser's firepower to equalize. The
> model and the balance co-evolve: tuning teaches the model, the model guides
> tuning. Then **playtest to confirm**; never balance before the game is playable.
