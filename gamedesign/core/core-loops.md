---
version: 1.0.0
---

# Core Loops

> **Scope**: Engagement loop architecture — loop anatomy (action→reward→investment→re-entry), the action stage as operative-vs-resultant verbs (depth via emergence) and as a stream of meaningful decisions (viable options, information, partly-predictable consequences, uncertainty/yomi), goal quality and short/long-term goal stacking, arc-vs-loop structure, timescale layering from moment-to-moment to meta, player awareness layers, interest curves (session-level pacing of engagement: hook→peaks/valleys→climax, fractal across timescales), anticipation as re-entry fuel, dual skill/accumulation loops and the skill ramp (the loop as a learning engine that keeps opening deeper layers), the motivation→loop→reward map, overlapping-loop re-entry (Zeigarnik), reward cadence and the reward-type palette, appointment and return triggers, resource-flow diagnostics, loop construction and cadence (the concentric/onion loop diagram, the core-loop-vs-micro-loop distinction, building loops outward, deriving loops from a user story), and the ethical line between habit and compulsion exploitation.
> **Load when**: designing or documenting a core loop, sharpening the verbs/actions a loop offers, auditing whether each loop pass holds a real decision or has degraded to a treadmill, tuning information balance (starvation vs surplus) to sharpen choices, writing or auditing game goals, classifying arcs vs loops, defining session structure and pacing, drawing the interest curve for a session or level, layering progression over moment-to-moment play, designing how a loop keeps teaching as player skill rises, designing daily or retention mechanics, evaluating reward schedules, cadence, and reward types, drawing a concentric/onion loop diagram, distinguishing the core loop from the micro-loop, deriving a loop from a user story, drawing the GAME.md loop stack, questioning why players return.
> **References**: `.unikit/memory/gamedesign/core/references/core-loops-interest-curves.md` (session/level/encounter interest-curve shape, the three interest factors, checklist + worked session-beat table); `.unikit/memory/gamedesign/core/references/core-loops-reward-design.md` (full reward-cadence rules + the 10-entry reward-type palette catalog).

---

## Loop Anatomy

A loop is a closed chain **action → reward → investment → re-entry**. Each stage
must have an explicit answer:

- **Action** — what the player *does* (a verb; skill-expressive where possible).
- **Reward** — what they *get*, immediately and legibly.
- **Investment** — where the reward *goes* so the next pass is different or better
  (upgrade, unlock, base, knowledge).
- **Re-entry** — why the next pass is *desirable now* (goal proximity, fresh
  variation, restored tension).

A loop missing investment is a treadmill; a loop missing re-entry leaks players at
every pass boundary.

**Arc vs loop — pick the right shape per driver** (Schreiber & Romero, Ch 11): a
progression *arc* is one-time (A→B: discovery, narrative, completion); a *loop*
repeats (power, difficulty, complexity, cosmetics). Arcs end and must be replaced or
stacked to keep a player engaged; loops self-renew. **Tag every entry in the GAME.md
loop stack as arc or loop** — an arc masquerading as a retention driver silently
runs dry. (Metroidvania = a repeating "master ability → reach new area" loop;
*Her Story* = a one-time narrative arc.)

**Re-entry is a constant cost/benefit calculation.** A player re-enters only while a
faster-than-conscious calc says expected future payout > continued cost + the
temptation of alternatives. Costs are not just time — cognitive load, resource
spend, and opportunity cost vs other loops. Keep perceived future payout visibly
ahead of accumulating cost; "continue this loop or switch?" is itself a core
dynamic to design, not a leak to plug.

## The Action Stage — Operative vs Resultant Actions

Schell splits a loop's *verbs* into two kinds, and the ratio between them is what
gives the Action stage its depth (Jesse Schell, *Game Design*, Ch 12):

- **Operative actions** — the basic verbs the rules grant directly (in checkers:
  *move forward, jump an enemy, move back as a king*). This is "what the player
  *can do*", the literal interface.
- **Resultant actions** — the strategic plays that *emerge* from combining
  operative actions with the objects and the space (in checkers: *guard a piece,
  force a wasteful move, sacrifice to bait, build a bridge to defend the back row*).
  These are not written in the rules; they grow out of play.

**Depth = many meaningful resultant actions per operative action.** A great loop
yields the most strategy from the fewest verbs; one good operative action beats two
weak ones. Emergence is gardened, not coded — spot a rich resultant action in
playtest and nurture it. Five levers raise the resultant:operative ratio (use as a
checklist when the Action stage feels shallow):

1. **More verbs** — but only ones that *interact*; orphan verbs add length, not depth.
2. **Universal verbs** — one verb (shoot) acting on many objects (locks, glass,
   tires, signs) multiplies plays without growing the interface.
3. **Multiple paths to each goal** — if there is one way to win, players never look
   for inventive plays; many paths reward resultant action. (Watch for a single
   dominant path — that is a balance concern; see balance rule.)
4. **Many nouns** — more controllable pieces = more interactions to exploit.
5. **Frame-changing side effects** — each action that alters the next state's
   constraints seeds fresh resultant plays.

Give every loop's Action stage this vocabulary: name the operative verbs *and* the
resultant plays you want the loop to make possible. An Action stage specified only
as operative verbs is an interface, not a game.

## Decisions — the Loop's Core Unit (Sylvester)

Where operative/resultant actions describe the *verbs* a loop offers, Sylvester
sharpens the same Action stage with a finer lens: the atom of interactive gameplay
is the **meaningful decision** (Tynan Sylvester, *Designing Games*, Ch 5). A loop
is, mechanically, a stream of decisions; the decision is "game design in its purest
form" and the **only emotional trigger unique to games** — spectacle, character,
and music move every medium, but only a game moves the player through a *choice*.
Resultant actions are the strategies a player *finds*; the decision is the *moment
they commit to one*. Specify both: a loop's Action stage is not done until you can
name the decision each pass forces.

**Anatomy of a meaningful decision** — all three must hold, or the choice
collapses:

1. **Multiple viable options.** At least two paths can lead to a good outcome. One
   obviously-best option is a **degenerate / non-decision** (just "pick Chuck
   Norris"). Note Sylvester's refinement of the emergence levers above: *more*
   options do not deepen a loop — two viable strategies is enough; beyond that,
   enrich the *internal deliberation* (more detail to weigh) rather than counting
   choices. (Raw option count → complexity, not depth; full degenerate-strategy
   and viable-strategy treatment lives in the balance rule.)
2. **Information to read the situation** — see Information Balance below.
3. **Partly-predictable consequences.** The outcome must be neither random nor
   inevitable — it must be *partially foreseeable*. The player "feels the future":
   the emotion of a decision comes not from what happened but from the *possible
   outcomes the mind projects*. Standing on a skyscraper ledge terrifies; a porch
   ledge does not — same present, different felt future. A loop whose outcomes the
   player cannot anticipate is a reaction test, not a decision.

**Decisions feed on partly-predictable systems.** Foresight requires systems that
are **consistent** (same rules every time, like gravity, so learning transfers)
and **understandable** (simple enough to hold in the head). Mario always jumps the
same height from a few clear rules, so the player can plan a route and *feel* each
path. Inconsistent or opaque systems erase prediction and the decision with it.
Corollary on AI: a *smarter* AI is often *worse*, because unpredictable AI cannot
be planned against — "the more the AI thinks, the less the player can." Treat AI
as mechanics with a few legible tendencies, not as a life-simulation, except when
the experience is *about* the AI's nuance rather than mechanical choice.

**Mechanical decisions vs predetermined (story) decisions.** A *mechanical*
decision is resolved by game systems the player can study and compute (a chess
move, a fighting-game attack). A *predetermined* decision (Choose-Your-Own-
Adventure branch) has author-scripted outcomes — the player chooses by fiction or
by guessing the designer, not by reading the system. Both are legitimate and pair
well, but they are different tools: keep fiction-only moral/character choices out
of the mechanical-prediction path, and the moment a "story" choice starts changing
stats, gates, or tools, it becomes a mechanical decision and needs unambiguous
mechanical information.

**Sources of decision uncertainty — the fuel that keeps loop decisions meaningful
pass after pass.** A loop stops generating decisions when its outcomes become
fully known. Keep one or more of these alive:

- **Hidden information** — part of the game state is concealed (poker's hole
  cards). Even *perfect-information* games hide the *future*: the present board is
  visible, but the outcome lies behind a chain of interactions you must work to
  see.
- **Reading the opponent (yomi)** — in a deep multiplayer loop, once the
  mechanical framework is mastered by both sides, the last thing left to
  manipulate is *the other mind*: predict their read before they predict yours,
  mix strategies to stay unreadable. This is why the deepest loops are
  multiplayer — a person can master any system but never fully model another
  person.
- **Speed** — information that arrived in the last fractions of a second hasn't
  been processed yet, so it is effectively hidden (why rock-paper-scissors works).
- **Randomness** — for *variety* (already covered under compulsion ethics: variety
  vs retention-lever randomness).

## Information Balance — Sharpen Decisions Without Touching Mechanics (Sylvester)

The character and difficulty of a decision depend on the **information** the player
holds — and you can re-tune a decision by revealing or hiding information *without
changing the mechanics at all* (Sylvester, Ch 5). This is the cheapest sharpening
tool in the loop. Two failure poles:

- **Information starvation** — too little to predict, so the player chooses
  blind/at random; the decision evaporates. The insidious form is the
  **author-challenge-prep problem**: the loop asks the player to prepare for a
  challenge they haven't seen yet (an RPG forcing a 50-hour-defining class choice
  at minute zero → 80% pick the safe/familiar option and miss the game's depth).
  Designers under-detect starvation because *they* know the whole game; a useful
  community FAQ that visibly improves the game is a red flag that the loop withholds
  decision-critical info. Critical decision info is usually pure mechanics (damage,
  speed, mission structure) — when fiction can't carry it, surface it directly.
- **Information surplus** — the data hands the player the answer, so no thinking
  happens (a heartbeat sensor that shows every enemy at all times kills the
  cat-and-mouse). Fix by *withholding*: Modern Warfare 2's sensor pulses every 3.5 s
  and misses ninja-perk enemies, so reading it becomes a decision again. Surplus is
  a *missed opportunity*, not a crash — playtests run "too smoothly," which is why
  it is hard to notice. Beware **meta-game information** (genre conventions, "the
  game will be fair") silently creating surplus and draining tension.

Run information balance as an explicit pass on every loop decision: *too little,
just enough, or too much?* — then add or remove information before you touch the
system.

## Goal Quality & Goal Stacking

A loop's "why again" rides on a clear goal. Schell's three properties of a good
goal (Jesse Schell, *Game Design*, Ch 12) — apply to every goal in the stack:

- **Concrete** — the player can state exactly what to achieve. A four-word goal
  ("capture the enemy king") drives engagement far harder than a fuzzy one; an
  unclear goal sheds players before the loop ever starts.
- **Achievable** — the player must believe it is reachable, or they quit early.
- **Rewarding** — worth the effort, and *previewed before completion* so the reward
  itself motivates the climb. Don't oversell: a goal that under-delivers on its
  promised payoff kills the next re-entry.

**Stack short-term and long-term goals** so there is always something to pursue
now *and* something to build toward — this balance is what keeps a player occupied
across the timescale layers. A concrete, visible goal is also a re-entry engine:
it lets the player picture finishing, which is exactly the foresight the awareness
layers depend on. Where the awareness layers describe *what the player can see*,
goal quality describes *whether what they see is worth chasing* — design both.

## Timescale Layers

| Layer | Horizon | Question it answers | Typical carriers |
|---|---|---|---|
| Moment | seconds | is doing this satisfying right now? | game feel, micro-feedback |
| Core loop | 30 s – minutes | one full verb→reward pass | the central activity |
| Session | 5–30 min | what makes one sitting feel complete? | quests, runs, levels |
| Meta | days–weeks | what am I building toward? | progression, collection, base |
| Social / event | weeks+ | what is happening in the world? | events, seasons, guilds |

- Document each layer with its loop and its **"why again"**. A missing layer is a
  deliberate, named decision (a session game may legitimately have no meta) — not an
  oversight.
- Mid-core pattern (Deconstructor of Fun): a core loop simple enough for short
  sessions + a meta deep enough for long-term goals. Accessibility lives in the
  core, depth lives in the meta.

## Loop Construction & Cadence (Zubek)

Where the timescale table names the *layers*, Zubek (*Elements of Game Design*,
Ch 5) gives the method for *building* the stack and a tool for auditing its
cadence.

**Concentric (onion) loop diagram — Will Wright's tool for finding cadence gaps.**
Draw the loops as nested rings: the fastest/smallest loop at the centre, each
longer-period loop an outer ring, so one pass of an inner ring only partially
advances the outer ones. Its value is diagnostic — an *empty ring* (a periodicity
with no interesting activity) becomes visible and demands a loop to fill it. A flat
sequence of same-cadence loops is monotonous; deliberately provision decision
points at several periodicities. (Monopoly onion: "move / gain-lose money" ~1 min →
"buy property & hotels" ~5 min → "complete a colour set" ~20 min → "bankrupt a
rival" ~60 min.)

**The core loop is the smallest loop that is *fun on its own* — usually NOT the
smallest loop.** Distinguish the micro-loop (second-by-second input) from the
*core* loop (the smallest pass a player would keep repeating for its own sake). In
action games the two coincide — moment-to-moment control is inherently fun (a
racer, a shmup). In systems-heavy games the core loop sits *higher*, because the
micro-actions aren't interesting alone (The Sims' core loop is "work → earn → buy
something for the home → repeat", not "satisfy bladder/hunger"; Diablo's is
"venture out → fight → loot → return → sell → re-gear → repeat"). Polish the core
loop hardest — players touch it constantly — and remember experienced players find
it less compelling than novices do.

**Build outward from the core (construction order).** (1) Stand up the
interactive-but-dull micro level to test the fundamentals. (2) Iterate until you
find the *fun* core loop (good for a few minutes). (3) Add longer-period loops that
*consume or modify the core loop's outputs* so each outer pass refreshes the core's
parameters (The Sims layers family/career goals that change the base money loop) —
an outer loop that merely sits *beside* the core, instead of feeding back into it,
adds length, not depth.

**Derive loops from a user story.** Ask "what will the player do over and over?",
write it as a short narrative, then extract the core loop and imagine the smaller
and larger loops around it. Worked tower-defense derivation: core = "build defenses
→ waves attack the base → killed creeps drop coins → spend coins to repair/upgrade
before the next, stronger wave"; a smaller reflex loop = "grab dropped coins before
they vanish"; a larger strategic loop = "bank coins for wave-weakening spells,
hoarding instead of building more towers".

**Desync loops on purpose, and share systems between neighbours.** Progress on one
loop need not track another — slight desynchronisation is itself a source of
tension and interest (Factorio: an early layout that solves the near-term goal
becomes the long-term problem you must tear down and rebuild). Adjacent-cadence
loops should *share* some systems (inventory, character stats span several loops)
so a single action advances or regresses several loops at once, making each choice
strategically richer.

**Prototype loops early — they feel different in play than on paper.** A narrative
loop description inflates expectations a real prototype often deflates; even expert
designers can't substitute imagination for a playable build. Implement any paper
loop as soon as it can be played, and let playtesters confirm it is actually fun
before you build outward from it.

## Interest Curves

Where loop anatomy answers *why a player returns*, the **interest curve** answers
*how engagement is paced across one whole experience* — a session, a level, a
single encounter (Jesse Schell, *Game Design*, Ch 16). The canonical shape:
entry → **hook** (early spike) → rising peaks with rest-valleys that set up each
next peak → **climax** (biggest peak) → residual interest (exit above entry,
"leave them wanting more"). The failure curve is hookless: an early dip below the
**interest threshold** (the quit line), then a too-late spike. Curves are
**fractal** — the whole game, each level, and each encounter want this shape — and
a flat segment is a defect to cut or let the player skip.

→ Full canonical shape, the three interest factors (inherent / presentation /
projection), the audit checklist, and a worked session-beat table are in
`references/core-loops-interest-curves.md` — load it when actually plotting a
curve for a session, level, or encounter.

## Anticipation as Re-entry Fuel

Anticipation of a coming reward or event is itself a re-entry driver: the *belief
that the next level holds something new* is what powers a player through the
current one (Jesse Schell, *Game Design*, Ch 4 & 11). Two engines:

- **Surprise** — "fun is pleasure with surprises." The brain is wired to enjoy the
  unexpected; surprise is the basis of humor, strategy, and problem-solving, and a
  loop with no possible surprise goes stale. Design surprise into rules and
  outcomes, not just story.
- **Novelty** — players are explorers; the promise of something not-yet-seen pulls
  them forward. But novelty fades: pair every novel hook with a durable reason to
  stay once the new wears off, and blend the new with the familiar.

Keep a *visible promise of what's next* attached to the loop — a previewed reward,
a glimpsed-but-locked area, a teased next beat. (This is the anticipation side of
the flow channel; flow itself lives in the frameworks rule — do not duplicate it
here.)

## Awareness Layers

At any moment a player holds several views of a loop — design what they can see
ahead (Schreiber & Romero, Ch 11):

- **Current iteration** — the pass they are in.
- **Foresight** — the payoff of finishing the current pass.
- **Near-future loops** — what unlocks next (visible-but-locked is the strongest pull).
- **Far-future loops** — known to exist but opaque.
- **Anchoring goal** — the long-term thing it all serves.
- **Exits** — how to leave.

A visible anchoring goal + a glimpsed-but-locked near-future is the "Do X → ??? →
Profit" pull (Metroidvania shows areas you can see but can't yet reach). Always
design explicit, **non-punishing exits** so leaving a loop is a choice, not a
rage-quit.

## Dual Loops

Pair a **skill loop** (mastery-driven: better play → better outcomes) with an
**accumulation loop** (progress-driven: time invested → guaranteed growth):

- The accumulation loop carries motivation through skill plateaus; the skill loop
  keeps accumulation from degenerating into pure waiting.
- Keep the exchange rate honest: if accumulated power fully substitutes for skill,
  the skill loop dies (and Competence with it); if accumulation is irrelevant, dry
  skill plateaus churn players.

## The Skill Ramp / Learning Loop (Sylvester)

The skill loop above ("better play → better outcomes") has a hidden engine:
**player skill grows on every pass, and the loop must keep teaching** (Sylvester,
Ch 3). A loop holds attention only while it keeps opening something new to learn —
the moment a player hits the **skill ceiling** (the level above which more practice
no longer improves results), the loop runs dry and they leave. (This is the
re-entry side of the flow channel — flow itself lives in the frameworks rule; here
the point is that the *challenge must keep tracking rising skill*, and the loop is
the vehicle that delivers the next thing to learn.)

**One skill is not enough — layer games inside the game.** No single mechanical
skill (aiming, jumping, route-finding) sustains a wide skill range; a player
exhausts any one of them. Lasting loops nest deeper layers that surface *as the
shallower ones are mastered* — Sylvester's three transformations (load-bearing
ladder for "what is the loop teaching at each tier of skill"):

- **Mechanical** — mastering the interface itself (hold the crosshair on target;
  land the block where you want; learn each chess piece's moves). Every loop starts
  here.
- **Situational** — the mechanics are now unconscious, so the decision shifts to
  *who/when/where* (whom to shoot, which unit to commit, reading patterns and
  counters). Most players live here; most games are tuned for it.
- **Intellectual** — the mechanical framework is fully solved for both sides, so
  the contest becomes managing one's own mind and reading the opponent's (the yomi
  / poker end-state). Reached rarely, and the reason the deepest loops are
  multiplayer.

Design implication: when a loop feels like it's "running out," check whether it has
a *next layer to reveal*, not just more content of the current layer. A loop that
only ever exercises one transformation has a narrow skill range and a near skill
ceiling — it churns experienced players even if it never repeats an asset.

## Motivation → Loop → Reward

Anchor each loop to an intrinsic motivator and deliver the reward that satisfies
*that* motivator — mismatches produce hollow loops (Schreiber & Romero, Ch 11; SDT):

| Motivation | Loop / arc | Reward |
|---|---|---|
| Agency | stat-gain loop (= accumulation loop) | virtual skill (power) |
| Mastery | difficulty/complexity loop (= skill loop) | player skill |
| Curiosity | discovery arc | knowledge |
| Closure | accomplishment arc | completion |
| Expression | cosmetic collection | self-expression |
| Connection / Superiority / Community | guild / leaderboard / influence loops | belonging / recognition |

- Per self-determination theory, **intrinsic motivation is the stronger driver and
  can be extinguished** by adding then removing an extrinsic reward — so avoid
  bolting trophies onto non-trivial activities players already enjoy. (Audience
  motivation taxonomy → player-motivation rule.)

## Overlapping Loops & Re-entry (Zeigarnik)

The strongest *non-monetized* re-entry engine is staggered, always-open loops
(Schreiber & Romero, Ch 11):

- Keep multiple loops open at once, **reopen each the instant it closes**, and
  stagger them so the player is always one or two steps from completing *something*.
- The **Zeigarnik effect** (open tasks carry persistent cognitive load) then
  converts "almost done" into "one more turn." (Civilization runs tech/military/
  economy/building loops concurrently and staggered → "just one more turn" for hours.)
- Its honest counterpart is **total completion / closure**: periodically synchronize
  loops so they climax together, letting cognitive load drop and the player step away
  satisfied — not held hostage. Closure needs a moment to look back; it is stronger
  with longer loops and when earlier phases can't be revisited.

## Reward Cadence & Type

Pace rewards deliberately and pair the *cadence* (when/how often) with the *type*
(what the reward is). The load-bearing rules: tie intermittent rewards to
**deliberate player action** (never login/hidden/luck-gated payouts); reward
magnitude has **diminishing returns** (many small spaced gains beat one lump);
**chart all reward types on one timeline and avoid stacking** them outside major
beats; and watch for **false progression** (a loop that only *simulates* movement,
which collapses into futility once hope dies — give failed pulls a salvage
outlet). Match the reward *type* to the loop's motivator — a mismatch is hollow on
even a perfect schedule.

→ The full cadence rules and the 10-entry **reward-type palette** catalog (praise,
points, prolonged play, access, spectacle, expression, powers, resources, status,
completion — with best-fit loops) are in
`references/core-loops-reward-design.md` — load it when choosing or scheduling a
loop's rewards.

## Want vs Must — Pleasure-Seeking vs Pain-Avoidance

Pleasure-seeking and pain-avoidance are two distinct motivational circuits, and a
loop can run on either (Jesse Schell, *Game Design*, Ch 11): earning combos and
stars is *want* (pleasure-seeking); dodging enemies "trying not to die" is *must*
(pain-avoidance). Both motivate and pair well. The failure mode is a loop that
**drifts from want to must** — many F2P loops open in pleasure-seeking (big
rewards, surprise bonuses, splashy animation) then convert to pain-avoidance ("log
in now or lose points; invite friends or miss prizes"), so the player keeps
returning but stops enjoying it ("they don't quit the game, they divorce it"). A
diagnostic to run beside the appointment-trigger and compulsion tests: **is this
loop still pulling on *want*, or has it slid into *must*?**

## Resource Flow Diagnostics

- Trace every loop output to an input somewhere: rewards with no sink pile up into
  meaninglessness; sinks with no faucet starve the loop. (Full faucet/sink economy
  math belongs to the economy rule.)
- Name each loop's **aspirational driver** — the visible thing the player wants that
  the loop feeds. A loop without a visible aspiration is maintenance work.
- For loop connections across systems, state which system produces and which
  consumes every connecting resource.

## Appointment & Return Triggers

Appointment mechanics (daily quests, timed rewards, energy, events) build return
habits. The honest/manipulative line:

- **Honest**: rewards presence and respects absence — show-up bonuses, catch-up
  mechanics, earned things never decay.
- **Manipulative**: punishes absence — streak loss, decaying progress, fear of
  missing out as the primary driver. Retention built on loss-aversion is churn debt
  plus reputational risk.

Design test: **does the loop respect a player who leaves for a week?**

## Compulsion-Loop Ethics

Variable-ratio reward schedules (random reward per action) are the strongest known
*habit* engine — and the most ethically loaded (overlapping-loops + Zeigarnik is an
equally strong but un-randomized engagement engine; prefer it):

- Research links loot-box spending with problem-gambling severity (Zendle & Cairns).
  Randomized **monetized** rewards are a red-line domain; the monetization-ethics
  rule carries the dark-pattern catalog and the legal landscape.
- Zagal's dark-pattern categories — **temporal** (forced grind, appointment abuse),
  **monetary** (pay to skip pain you designed), **social** (guilt and obligation as
  levers), **psychological** (exploitative variable rewards) — are load-bearing dark
  patterns to avoid.
- Design tests: "would this loop still be engaging with deterministic rewards?" (if
  no — the schedule is the game, and that is a finding); "are we rewarding play, or
  monetizing anxiety?"
- Randomness for *variety* (build diversity, encounter spice) is distinct from
  randomness as a *retention or monetization lever* aimed at compulsion.

## Anti-patterns

- A loop whose reward feeds nothing — no investment stage, no re-entry pull.
- An arc dressed up as a retention loop — a one-time A→B leaned on for long-term
  return, which silently runs dry with no self-renewing iteration.
- An onion/concentric diagram with an empty ring — a periodicity with no
  interesting loop, leaving a dead stretch in the cadence.
- Treating the micro-loop as the core loop in a systems game — polishing
  second-by-second input that isn't fun alone instead of the higher loop players
  actually repeat; or bolting an outer loop *beside* the core instead of feeding
  its outputs back in (length, not depth).
- Rewards detached from the verb: the player is paid for logging in, not for playing
  (login trophies, hidden/luck-gated achievements) — and it waters down later fiero.
- Front-loading reward magnitude (one big lump / early flurry) — diminishing returns
  make it land weaker than the same total spaced out.
- Stacking all reward types at once outside a major beat — flattens the cadence.
- False progression: a loop that only *simulates* movement, with no salvage outlet —
  collapses into futility the moment hope dies.
- Loops with no designed exit — leaving must be a rage-quit, not a clean choice.
- The meta loop devouring the core: optimal play becomes menu management.
- Retention via punishment: streaks, decay, and FOMO as primary return drivers.
- Variable-ratio schedules stacked on monetized rewards and labeled "engagement".
- Loop timing asserted nowhere — no target bands, "it feels right" as the spec.
- Loops documented as marketing prose instead of a traceable verb/resource chain.
- An Action stage listed only as operative verbs — an interface with no resultant
  depth (one path to the goal, orphan verbs, nothing to discover).
- A fuzzy or invisible goal — the player can't state what to achieve, so re-entry
  never forms; or a goal whose payoff was oversold and under-delivers.
- A flat interest curve — no hook, a dead mid-section dipping below the interest
  threshold, or a climax that doesn't overshadow what came before.
- A reward type mismatched to the loop's motivator (cosmetics for a mastery loop),
  hollow on even a perfect schedule.
- A loop that has drifted from *want* to *must* — retained by pain-avoidance, no
  longer enjoyed.
- A loop pass with no real decision — one obviously-best option (a degenerate
  choice) or outcomes the player can't anticipate (a reaction test) — which
  degrades the Action stage to a treadmill no matter how busy the screen is.
- A decision built on inconsistent or opaque systems, or on a "smart" AI too
  unpredictable to plan against — the player can't feel the future, so the choice
  is a guess.
- Information starvation: a decision-critical loop withholding the data needed to
  predict (signalled by a community FAQ that visibly improves the game), or
  forcing a defining choice before the player can read the game.
- Information surplus: the loop hands the player the answer, so the decision stops
  being a decision (a too-generous detector, full enemy positions, an obvious-best
  readout).
- A loop that stops teaching — no deeper layer to reveal once the current skill
  tier is mastered, so it hits the skill ceiling and churns experienced players
  even with fresh content.

## Worked Example — Real Decision vs False Choice

Run this checklist on the decision a loop pass forces; a "no" on any anatomy row
means the pass has no real decision and the loop is a treadmill there. The
contrast below is Sylvester's fantasy-combat case (sword vs fire spell on an ogre):

| Anatomy test | False choice (degenerate) | Real decision (tuned) |
|---|---|---|
| Multiple viable options? | Sword always out-damages fire → one best answer | Sword wins fights < 30 s, fire wins fights > 30 s → both viable |
| Information to read it? | n/a — answer is given | Player can read the ogre's health, the room, the threat |
| Partly-predictable consequence? | Outcome is inevitable (sword) | Player must *guess whether the fight runs long* — partly foreseeable |
| Resolved by a consistent + legible system? | — | Yes: damage rules are fixed and simple, so the future can be felt |
| Net | "pick the obvious" — instant non-decision, treadmill | a felt, emotionally-charged choice — the loop generates depth |

Information-balance variant of the same decision (no mechanics changed, only what
the player can see): hide the ogre's exact HP → the player must *estimate* fight
length (sharper decision); show a precise "this fight will last 41 s" readout →
the answer is handed over (surplus, decision evaporates). Tune the *information*
first; reach for the *system* only when information alone can't fix it.

## Source Map

| Source | Used for |
|--------|----------|
| Schreiber & Romero, *Game Balance* (CRC Press, 2021), Ch 11 "Progression in PvE Games" | Arc vs loop; re-entry cost/benefit calculus; awareness layers; motivation→loop→reward map (SDT); overlapping loops & Zeigarnik; total completion / closure; reward cadence (deliberate action, diminishing magnitude, type interleaving); false progression |
| Jesse Schell, *The Art of Game Design: A Book of Lenses* (Russian translation), Ch 4, 11, 12, 16 | Operative vs resultant actions and the five emergence levers (Action stage depth); goal quality (concrete/achievable/rewarding) and short/long-term goal stacking; interest curves (hook, peaks/valleys, climax, residual interest, fractal nesting, three interest factors) + worked session beat table; anticipation/surprise/novelty as re-entry fuel; reward-type palette; want-vs-must (pleasure-seeking vs pain-avoidance) drift |
| Tynan Sylvester, *Designing Games* (O'Reilly, 2013; Russian translation), Ch 3, 5 | Decisions as the loop's core unit and the only game-unique emotional trigger; decision anatomy (viable options, information, partly-predictable consequence) and "feeling the future"; consistent + understandable systems and AI-as-mechanics for prediction; mechanical vs predetermined decisions; sources of decision uncertainty (hidden info, yomi, speed, randomness); information balance (starvation vs surplus, author-challenge-prep, meta-game info) as a no-mechanics sharpening lever + the real-decision-vs-false-choice worked example; the skill ramp / learning loop (skill ceiling, mechanical→situational→intellectual transformations, layered games-within-game); degenerate/non-decision as treadmill |
| Robert Zubek, *Elements of Game Design* (MIT Press, 2020; Russian translation), Ch 5 | Loop Construction & Cadence — the concentric/onion loop diagram (Will Wright) and the cadence-gap diagnostic; core loop = the smallest loop that is fun on its own ≠ micro-loop (genre-dependent: action vs systems games); build-outward construction order (micro → fun core → outer loops that consume/modify core outputs); user-story loop derivation (tower-defense worked example); deliberate loop desync and shared systems across adjacent-cadence loops; prototype-loops-early |
