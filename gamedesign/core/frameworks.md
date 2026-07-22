---
version: 1.0.0
---

# Design Frameworks

> **Scope**: Foundational experience frameworks for grounding design decisions — the Lens meta-method for inspecting a design from many viewpoints, MDA aesthetics targeting (8 aesthetics, backward design), Schell's Elemental Tetrad (Mechanics/Story/Aesthetics/Technology) as a complementary decomposition lens, Sylvester's engines-of-experience lens (the game as a machine that generates emotion via mechanics + fiction) with emotional triggers and the human-value/change principle, elegance (depth-to-complexity ratio, emergent depth from minimal mechanics), the experience-design stance (the game is a vehicle, not the experience) with essential-experience capture, unifying theme and resonance, self-determination needs (SDT/PENS), the flow channel with player-controlled difficulty (active DDA), and game-feel responsiveness budgets (~100 ms).
> **Load when**: defining pillars or experience goals, choosing which framework lens to apply, decomposing a game into its constituent elements, framing a game as an emotion-generating machine, tracing why a mechanic evokes (or fails to evoke) emotion, auditing a mechanic's elegance or depth-to-complexity ratio, deciding whether to add or cut a mechanic, identifying the essential experience to deliver, picking or auditing a unifying theme, evaluating a mechanic against the intended experience, writing Player Fantasy sections, designing difficulty or pacing, choosing a target venue, tuning controls and responsiveness, justifying a design recommendation with theory.
> **References**: `.unikit/memory/gamedesign/core/references/frameworks-elegance.md` (the "smells of elegance" 9-heuristic catalog + the Hellion-vs-Reaper worked depth-vs-complexity comparison); `.unikit/memory/gamedesign/core/references/frameworks-venues-supporting-lenses.md` (the venue catalog, the five kinds of listening, and the supporting lenses — endogenous value, surprise, curiosity).

---

## The Lens Method (Schell's meta-framework)

A **lens** is a focused set of questions you hold up to your design to inspect it
from one viewpoint (Schell, *The Art of Game Design: A Book of Lenses*). Every
named framework below — MDA, the Tetrad, SDT, Flow — is itself a lens. The Lens
method is the **meta-tool that sits over all of them**: it tells you *how* to use
frameworks, not which one is right.

- **No single lens is complete; lenses overlap.** Each one distorts as much as it
  reveals. The discipline is to **rotate through many lenses** on the same design
  rather than committing to one and trusting it.
- A lens is a **diagnostic question set, not a checklist to satisfy.** Use it to
  *find problems and provoke ideas*, then put it down and switch.
- Treat any framework in this file as a lens you pick up deliberately: "Which lens
  exposes why this system feels wrong?" — then reach for MDA (aesthetic break),
  the Tetrad (a missing/weak element), SDT (an unmet need), Flow (skill/challenge
  mismatch), or Game Feel (response budget).
- **Holographic design** (Schell): the master skill is holding two lenses at once
  — *feel the player's experience (the "skin")* while simultaneously *seeing the
  elements that cause it (the "skeleton")*. Skin-only design feels the problem but
  can't fix it; skeleton-only design looks right on paper but doesn't land.

## MDA: Mechanics → Dynamics → Aesthetics

**Mechanics** are the authored rules and data. **Dynamics** are the run-time
behaviors that emerge when mechanics meet player input. **Aesthetics** are the
emotional responses the dynamics evoke (Hunicke, LeBlanc, Zubek).

The eight aesthetics:

| Aesthetic | The game as… | Typical carriers |
|---|---|---|
| Sensation | sense-pleasure | juice, audiovisual impact, tactility |
| Fantasy | make-believe | role embodiment, power fantasy |
| Narrative | drama | authored arcs, character stakes |
| Challenge | obstacle course | mastery, fair difficulty |
| Fellowship | social framework | co-op, guilds, shared goals |
| Discovery | uncharted territory | exploration, secrets, system depth |
| Expression | self-discovery | builds, customization, creation |
| Submission | pastime | low-friction ritual, ambient play |

- **The designer authors mechanics, but the player meets the game from the other
  end — aesthetics first.** Design backward: pick target aesthetics, ask which
  dynamics produce them, then which mechanics produce those dynamics.
- Target **2–3 aesthetics per pillar or system, never all eight.** Aesthetics
  compete: Challenge pulls against Submission; heavy Narrative constrains
  Expression. Name the trade-off you are accepting.
- Use MDA as a **diagnostic lens**: when a mechanic "feels wrong", locate the
  dynamic that breaks the target aesthetic instead of patching the mechanic
  blindly (e.g., a trading mechanic breeds hoarding dynamics that kill the
  intended Fellowship).
- Tuning is second-order: a number change shifts dynamics, which shifts the felt
  aesthetic. Trace the chain M→D→A before and after every significant change.

## Engines of Experience (Sylvester)

Sylvester's central thesis (*Designing Games*): **a game is an artificial system for
generating experience** — a *machine* whose output is not widgets or motion but
**emotion**. A game **does not contain fun; it generates it**, on the fly, through the
interplay of two layers: **mechanics** (the rules/systems) and **fiction** (the
authored story/world wrapped around them). The causal chain:

> **mechanics interact → events → emotional triggers fire → emotions → integrated experience**

- **Two-layer model, not four.** Where the Elemental Tetrad splits a game into four
  media and MDA traces M→D→A, Sylvester collapses the whole thing to **mechanics +
  fiction → emotion**. This is a *lens*, not a contradiction of the others: reach for it
  when you want to ask the blunt question **"what emotion does this generate, and is it
  the mechanics or the fiction doing it?"** — and reach for the Tetrad/MDA when you need
  finer decomposition (tech/art coverage, the D layer). The two layers map onto the
  Tetrad's Mechanics and Story nodes.
- **The primacy of emotion.** The real product is the player's stream of (mostly tiny,
  sub-conscious) emotional impulses — micro-emotions that shift second-to-second.
  **Reading subtle emotion in playtests is the designer's core skill**, the way a chef
  tastes a dish. Name the *emotion*, not "fun" — "fun" is one emotion among many
  (triumph, dread, grief, awe, tension), and it under-describes the palette a game
  actually evokes.
- **Beware emotional misattribution.** Players (and designers) *cannot* directly read
  why they feel what they feel — emotional triggers are unconscious computations. Players
  rationalize a cause after the fact ("I liked it because it was fast"), and that cause is
  often wrong (the stocking/bridge studies). **Never take a player's stated reason at face
  value** — treat playtest verbalizations as noisy signals; trust observed behavior and
  systematic small-change testing over post-hoc explanations.
- **Build experiences by composing triggers.** Multiple triggers aimed at the *same*
  emotion **stack** to a peak (action arcade = music + risk + social stakes + adrenaline).
  Deliberately *clashing* emotions can **fuse** into something new (Gears of War =
  bombast + mourning) or be **antagonistic** and cancel (ruthless skill-competition kills
  relaxed social fun). Vary **intensity** (pacing arc) *and* **valence** (the
  arousal×valence map: rage/joy/grief/relief) over time so no single emotion goes stale.

### Emotional triggers — why mechanics evoke emotion

An **emotional trigger** is any event/observation the unconscious reads as a
significant change, firing an emotion. The framework-level rule:

- **Emotion requires a shift in a *human value*.** A human value is a dimension that
  matters to people and has multiple states — [life/death], [win/loss],
  [friend/stranger/enemy], [wealth/poverty], [high/low status], [together/alone],
  [knowledge/ignorance], [freedom/slavery], [safety/danger]. **Only events that move a
  human value between states are emotionally relevant** — the bigger the value and the
  bigger the shift, the stronger the emotion. (Losing a pawn is trivial early, decisive
  late: same event, different *consequence*.)
- **Anticipation = change.** Emotion fires not only on a change but on its *prospect*;
  **learning information is emotionally equivalent to the change itself** (a coin already
  lost vs. the croupier revealing you lost it). This is why withholding/revealing
  information and high-stakes uncertainty (a kill-streak's 11th kill, a horror corridor)
  are emotional engines — engineer **value-shift potential**, not just value shifts.
- The *kinds* of triggers (learning/insight, character growth, challenge/competence,
  social, acquisition, music, spectacle, beauty, environment, novel tech, threat) are the
  **vocabulary of emotion sources** — pick which ones a system is built to fire. *Deep
  audience taxonomy of these triggers lives in `player-motivation`; this file keeps only
  the framework-level "games trigger emotion via value-shifts" framing.*
- Heuristic from the trigger list: **spectacle, gore, beauty, and sex are the cheapest,
  shallowest triggers** — they fire instantly but habituate fast and only *amplify*
  emotion that mechanics already produced; they are not a substitute for the structured
  triggers (learning, character growth, social) that require interlocking systems.

### Fiction as the meaning-amplifying layer

Mechanics alone generate tension, triumph, mastery, social reward — but a **narrow**
band; humor, awe, immersion, and the whole empathy spectrum need characters.
**Fiction is "skin over the skeleton"** (Zimmerman): it does not hide or replace the
mechanics — it **adds a second layer of meaning** to the emotion mechanics already
produce. "Low on resources" *becomes* "starving"; a removed ally *becomes* a mourned
friend. The naïve view that fiction works by making players forget they're playing is a
"deep fallacy" — players never forget; fiction *re-labels* mechanical emotion.

- **Mechanics ↔ fiction must reinforce, not just coexist.** The peak of the craft is
  fusing perfect mechanics with compelling fiction into **one integrated emotion system**
  — not stacking a great story *on top of* great mechanics. They can also **fight**:
  fiction-first design constrains what you may tune (can't lower gravity in a realistic
  game), and mechanics-first design breeds **clichés as alibis** (crates, amnesiac heroes,
  super-soldiers vs. 5-second enemies) that exist only to justify good mechanics. When
  fiction can't express what the mechanics do (the *Player League* failure — relationship
  events with no readable representation), the game becomes illegible. **Choose fiction
  whose events map cleanly onto mechanical events** (physical combat reads instantly;
  abstract social state does not).
- **Immersion is engineered, not bolted on (two-factor theory).** Sylvester's mechanism:
  immersion = the player's experience mirroring the character's, built from three
  ingredients — **(1) flow** (mechanics evict the real world from the player's head),
  **(2) raw, unlabeled arousal** (mechanics: threat, speed, hard decisions), **(3)
  fiction** that *re-labels* that arousal as the character's emotion (Doom's fast-action
  arousal labeled "terror" by the zombie-infested fiction). This complements — does not
  replace — the file's other immersion note: SDT/PENS frames presence as an *outcome of
  need satisfaction*; Sylvester gives the *moment-to-moment mechanism* (flow + arousal +
  fictional label). Use both: PENS for why immersion lasts, two-factor for how each scene
  manufactures it.

## The Experience-Design Stance (Schell)

The designer creates an **experience, not an artifact** (Schell). The game — rules,
board, code, screen — is only a *vehicle that evokes* an experience in the player's
mind. **"The game is not the experience."** You can touch the artifact; you cannot
touch, share, or directly transmit the experience, and no two players get the same
one. Yet the experience is the entire product — the artifact is worthless if no one
plays.

- **Design for the experience, deliver it by any means.** The game is your clay;
  shape it however best evokes the target experience. Don't defend a mechanic for
  its own sake — defend it for the experience it produces.
- **Identify the *essential experience* and its essence.** From a real or
  remembered experience, separate the **essential elements** (what defines and
  makes it special) from the incidental ones. You don't need to faithfully
  reproduce the original — only to transmit its *essence* through whatever
  carriers (visuals, audio, rules) work. (Schell's *Lens of the Essential
  Experience*: What experience should the player have? What is essential to it?
  How can my game capture that essence?)
- Knowing which elements carry the essence tells you **what you may safely change
  and what you must not touch** when iterating. Without an explicit essential
  experience, iteration is "wandering in the dark."
- **Introspection is a primary design tool** (game design is not science — what
  *feels* true matters more than what is objectively true). Mitigate its two risks
  — distorted perception, and "true for me ≠ true for others" — by also listening
  to and observing others, then putting yourself in the target player's shoes
  (the anthropologist's stance). Analyze *memories* of an experience, or take
  quick "sidelong glances" during it, to observe without destroying it.
- **Name the emotion, not "fun."** A memorable experience is built on emotion;
  practice describing your felt response in concrete words ("too cold / too
  slow / unfair"), never a vague "it was bad." (Schell's *Lens of Emotion*: What
  emotions should the player feel? What do they feel now? How do I close the gap?)

## Elemental Tetrad (Schell)

Every game is made of **four equally important, interrelated elements** (Schell):

| Element | What it is | Visibility to player | Role |
|---|---|---|---|
| **Mechanics** | the rules and procedures (goals, allowed actions, outcomes) | mid | the **core** — "what makes a game a game"; linear media lack it |
| **Story** | the sequence of events, linear or branching | mid | **delivers** the mechanics in a form the player understands |
| **Aesthetics** | how the game looks, sounds, feels | **most visible** — most directly tied to the experience | the player's first and strongest contact with the game |
| **Technology** | the materials/medium that make the game work (not just "high-tech") | **least visible** | the **enabler** in which mechanics run, story is told, aesthetics live |

- The diamond shape encodes **visibility, not importance** — aesthetics on top
  (most seen), technology at the bottom (least seen). **No element outranks
  another;** all four shape the experience and all four are the designer's job.
  The common trap is each specialist believing their element is foundational
  (designers→mechanics, artists→aesthetics, engineers→technology, writers→story).
- **Every element must reinforce the others toward one goal.** A weakness in one
  element can be compensated by strengthening another. (Schell's *Lens of the
  Elemental Tetrad*: Does the design use all four? Could it improve by adding
  detail to an element? Do the four combine and reinforce one shared goal?)

### Tetrad vs MDA — which decomposition lens to reach for

Both are **decomposition lenses**, and they complement rather than compete:

| | Elemental Tetrad (Schell) | MDA (Hunicke/LeBlanc/Zubek) |
|---|---|---|
| Decomposes | the **whole game** into its 4 constituent media/parts | the **causal chain** mechanics → dynamics → emotion |
| Axis | *what the game is made of* | *how authored rules become felt experience* |
| Best for | scoping/auditing whether all four parts pull together; spotting a missing or weak element | diagnosing *why* a mechanic produces the wrong emotion; aesthetic targeting |
| Direction of work | survey all parts, then unify them under a theme | design backward from target aesthetics to mechanics |

Reach for the **Tetrad** when checking coverage and cohesion of the build
("are story, art, tech, and mechanics serving one experience?"); reach for **MDA**
when a specific mechanic feels off and you need to trace the M→D→A chain. The
Tetrad's mechanics/aesthetics nodes *are* the same domains MDA's M and A address —
the Tetrad situates them among the other elements rather than re-explaining them.

## SDT / PENS: Need Satisfaction

Self-Determination Theory (Ryan, Rigby, Przybylski) explains sustained engagement
through three innate needs; the PENS model operationalizes them for games:

- **Competence** — feeling effective: optimal challenge, readable feedback,
  visible skill growth. Served by fair difficulty, mastery curves, clear
  cause→effect.
- **Autonomy** — acting by one's own volition: meaningful choices with
  consequences, room for self-direction. **Option count is NOT autonomy** —
  choices must matter and express intent.
- **Relatedness** — mattering to others: cooperation, recognition, contributing
  to a group (well-written NPCs can partially serve this).

PENS additions: **intuitive controls** (clumsy input blocks all three needs
before content is even reached) and **presence/immersion as an outcome** of need
satisfaction, not a separate feature to add.

- Need satisfaction predicts long-term engagement better than moment-to-moment
  "fun" — design every core system to clearly serve at least one need.
- **Overjustification risk**: stapling heavy extrinsic rewards onto an already
  intrinsically satisfying activity erodes the intrinsic motivation. Reward
  outcomes and expression; don't bribe the action itself.

## Flow & Active DDA (Chen)

- The **flow channel**: engagement holds while challenge tracks skill — boredom
  below the channel, anxiety above. Player skill grows constantly, so a static
  difficulty always exits the channel eventually.
- **Sawtooth pacing**: alternate tension and release inside the channel;
  difficulty rises in waves with deliberate valleys (mastery moments), not
  monotonically.
- **Passive DDA** (the system silently rubber-bands) risks breaking trust and
  cheapening Competence the moment players notice it. Prefer **active DDA**:
  embed difficulty regulation into player choices themselves — optional risk
  routes, push-your-luck mechanics, freely chosen pace — so adjusting flow IS
  gameplay.
- For wide audiences, widen the flow zone through choice architecture rather
  than hunting one perfect curve for a mythical average player.

## Game Feel (Swink)

- **Real-time control budget**: input → visible response within **~100 ms**
  reads as instantaneous; beyond it, controls feel sluggish. Wind-up animations
  that delay response are a feel cost paid deliberately — never free flavor.
- Three building blocks: **real-time control**, **simulated space** (collision
  and physics give the world tactility and weight), and **polish** (particles,
  screenshake, hitstop, audio — amplifying physicality without changing rules).
- Think in response envelopes (attack/decay/sustain/release of motion): how fast
  movement starts, settles, and stops. "Snappy" vs "weighty" is an envelope
  decision — document it as intent, not as an accident of implementation.
- Feel parameters are tuning knobs of category `feel` — tunable late, but the
  response *budget* is a design commitment made early.

## Elegance — Depth from Simplicity (Sylvester)

**Elegance** is Sylvester's core design heuristic and is **genuinely new vs. everything
above** (Schell does not cover it): **elegance = depth ÷ complexity** — how much emergent
experience a mechanic yields per unit of rules the player must learn and the team must
build/balance. Checkers' few-minute ruleset generates millions of distinct games; tic-tac-toe
is its opposite. Two load-bearing principles:

- **Every mechanic has a cost** (dev time, compute, and most expensively **player
  attention**); it earns its keep only if its depth pays that back. The design move is
  *subtractive* — **remove the inessential** rather than pile on.
- **Depth comes from unpredictable *interaction*, not more parts.** Simple mechanics that
  **multiply** (not merely add) explode into emergent situations. Watch the most-missed
  cost — **content restriction** (a change that forces the rest of the game to be rebuilt
  around it), whose price is diffuse and deferred. Elegant mechanics often *look* boring;
  judge by the possibility-space they open, not by flashiness.

→ The full **"smells of elegance"** heuristic catalog (interaction count, simplicity,
multi-use, distinct role, reuse of conventions, tight scaling, repeatability, no content
restriction, full interface use) and the worked **Hellion-vs-Reaper** depth-vs-complexity
comparison are in `references/frameworks-elegance.md` — load it when auditing a specific
mechanic's elegance or deciding whether to cut a duplicate-role mechanic.

## Unifying Theme & Resonance (Schell)

A **theme** is the one idea or feeling that makes the game a whole — the spine
every element reinforces (Schell). Two steps: **(1) decide what your theme is;
(2) use every available means to reinforce it.** Decide it as early as possible:
from then on, anything that supports the theme stays, anything that doesn't is cut.

- **Most themes are experience-based** — their aim is to deliver one specific
  experience (e.g. *"what it feels like to be a pirate,"* not *"pirates"*). State
  the theme as a felt experience, then drive it into *every* element: form factor,
  interface, audio, lighting, even rules. (Disney's *Pirates* — the death rule was
  bent so players are near-invincible until a dramatic end-of-battle sinking,
  because **theme outranks convention**.)
- A theme makes the **whole team aligned**: with a strong theme, anyone can
  contribute a reinforcing detail. It also makes cut/keep decisions fast and
  consistent.
- **Resonance**: the strongest themes strike a deep chord. Resonant themes come
  in two kinds — **experience-based** (a fantasy people of all ages carry, e.g.
  freedom) and **truth-based** (a deep human conviction, e.g. *"love is stronger
  than death"*; *"play must survive work"*). Truth-based themes are often hidden
  even from the designer, which adds to their power. Resonance is **felt, not
  logically derived** — verify it by introspection and by what others light up
  about when you describe the game.
- **Not every game needs a resonant theme** — but even a non-resonant *unifying*
  theme focuses the experience and is worth having (Schell's *Lens of Unity*:
  What's my theme? Am I using every possible means to reinforce it? — and *Lens
  of Resonance*: What makes my game special and powerful? What about it feels
  deeply, intuitively right?).
- **Relation to MDA aesthetics targeting:** MDA's aesthetics are the *categories
  of emotional response* you aim for; a unifying theme is the *single concrete
  idea/feeling* all elements serve. Use MDA to choose which emotions to evoke;
  use theme to make every element pull toward one resonant statement of them.
  Theme is the cohesion layer; aesthetics are the targeting layer.

### Example — one theme → many reinforcing elements

Theme (experience-based): **"feel what it's like to be a pirate — freedom."**

| Element / decision | Reinforcement of the theme |
|---|---|
| Interface | a real ship's wheel and iron cannons, not a generic joystick |
| Audio | 10-speaker rig placing cannon fire all around — felt, not just heard |
| Mechanics | free sailing anywhere; the death rule bent so death is rare and dramatic |
| Aesthetics / lighting | water-reflection light gels; hyper-real treasure made to read as 3D |
| Hardware | side-blinder-free 3D glasses to keep peripheral motion cues (sea feel) |

Every decision was filtered through one question: *does this reinforce the theme?*
Most theme reinforcements (fonts, color, sound effects) are cheap, not expensive.

## Venues & Supporting Lenses (Schell, lighter)

Two supplementary Schell lenses, peripheral to the core frameworks above and
needed only in narrow situations: the **Lens of the Venue** (the *place* play
happens — hearth / workbench / reading nook / public / anywhere — shapes design
more durably than the platform), and the **five kinds of listening** (team,
audience, the game itself, the client, yourself). Plus the problem-solving
corollary lenses — **endogenous value** (a reward's felt value is a readout of how
much players care about the goal), **surprise** ("fun is pleasure with surprises"),
and **curiosity** (players chase the questions a goal raises, not just the goal).

→ Full venue catalog and the supporting-lens detail are in
`references/frameworks-venues-supporting-lenses.md` — load it when choosing a
target venue or grounding a design with the lighter lenses.

## Anti-patterns

- Designing mechanics-first, then rationalizing an aesthetic story around them.
- A pillar list targeting all eight aesthetics — that is no targeting at all.
- "Fun" or "engaging" written as an experience goal — name the aesthetic, the
  need, or the flow intent instead.
- Passive rubber-banding that silently invalidates player skill.
- Input chains beyond ~100 ms excused as "weighty" without an explicit envelope
  decision.
- Bribing intrinsically satisfying actions with stacked extrinsic rewards.
- Treating immersion as a feature to bolt on rather than an outcome of needs
  being met.
- Designing the artifact instead of the experience — defending a mechanic for its
  own sake with no stated essential experience it serves.
- Skeleton-only design (looks right on paper, doesn't land) or skin-only design
  (feels the problem, can't locate its cause) — failing to hold both lenses at once.
- Over-investing one Tetrad element while another is neglected, or assuming your
  specialty is the foundational element.
- Shipping a game with no unifying theme, so cut/keep decisions have no anchor and
  elements pull in different directions.
- Trusting a single framework lens as complete instead of rotating through several.
- Designing for a platform while ignoring the venue where play actually happens.
- Taking a player's stated reason ("too slow", "boring story") at face value instead of
  treating it as a misattributed rationalization — diagnose via observed behavior and
  small-change testing.
- Leaning on cheap triggers (spectacle, gore, beauty, sex) to manufacture emotion that
  the mechanics don't already produce — they habituate fast and only amplify.
- Building events that don't shift any human value (or whose value is already locked) and
  expecting them to feel tense.
- Stacking a great story *on top of* mechanics instead of fusing them; or letting fiction
  and mechanics fight (fiction-first locks tuning; mechanics-first breeds clichés-as-alibis
  like crates and amnesiac heroes).
- Adding a mechanic for an immediate prototype win while ignoring its **content-restriction**
  cost (e.g. a jump height that forces every level to be re-walled).
- Adding a second mechanic that duplicates an existing role with no new play — ballast that
  costs comprehension and dev time for nothing.
- Judging a mechanic by how flashy it looks rather than by the depth-to-complexity ratio
  and the space of possibilities it opens in play.
- Mismatched numeric scales that force ugly conversions and kill natural interactions
  (vs. tight scaling like Magic: The Gathering).

## Source Map

| Source | Used for |
|--------|----------|
| Jesse Schell, *The Art of Game Design: A Book of Lenses* (Russian translation), Ch 1–6 | The Lens method & holographic design; Elemental Tetrad and its Tetrad-vs-MDA comparison; the experience-design stance (game ≠ experience, essential experience, introspection/observation, Lens of Emotion); unifying theme & resonance (experience- vs truth-based, theme→elements example); venues and the five kinds of listening; the problem-solving definition with endogenous value, surprise/fun, and curiosity |
| Tynan Sylvester, *Designing Games: A Guide to Engineering Experiences* (O'Reilly, 2013; Russian translation), Ch 1–2 | Engines of Experience (game as emotion-generating machine; mechanics+fiction→emotion two-layer lens; primacy of emotion; emotional misattribution; composing/stacking/fusing/antagonistic emotions; arousal×valence pacing); emotional triggers and the human-value/change-and-anticipation principle; fiction as the meaning-amplifying "skin over the skeleton" layer with mechanics↔fiction reinforcement, cliché-as-alibi, and the two-factor-theory immersion mechanism; Elegance (depth÷complexity ratio, "smells of elegance" heuristics, content-restriction cost, Hellion-vs-Reaper worked comparison) |
| Robin Hunicke, Marc LeBlanc, Robert Zubek, *MDA: A Formal Approach to Game Design and Game Research* | MDA framework — mechanics→dynamics→aesthetics, the eight aesthetics, backward design, diagnostic use |
| Richard Ryan, Scott Rigby, Andrew Przybylski (Self-Determination Theory; PENS model) | Need satisfaction — competence/autonomy/relatedness, intuitive controls, presence as outcome, overjustification risk |
| Jenova Chen, *Flow in Games* (and Csíkszentmihályi's flow concept) | The flow channel, sawtooth pacing, active vs passive DDA, widening the flow zone via choice |
| Steve Swink, *Game Feel: A Game Designer's Guide to Virtual Sensation* | Real-time control budget (~100 ms), the three building blocks, response envelopes, feel as a tuning-knob category |
