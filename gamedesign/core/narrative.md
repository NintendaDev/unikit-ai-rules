---
version: 1.0.0
---

# Narrative Design

> **Scope**: Narrative design method — the story-vs-game (Aristotle-vs-Mario) tension, the two story structures (string of pearls vs the story machine), Sylvester's three narrative-tool families (scripted story vs world narrative vs emergent story) and the scripted-vs-emergent trade-off, fiction as the meaning layer that amplifies mechanics, world-building for player-generated stories (world coherence, apophenia, labeling/abstraction/chronicle/commentator amplifiers), dramatic structure models mapped to game phases/levels, character arc (write-from-the-arc-backwards, want vs need, the backstory "ghost"), character-design tools (the character web, interpersonal circumplex, traits, avatars, status, transformation), antagonist and supporting-cast design, player agency, the agency/motivation-mismatch ("desk-jumping") problem and the human-interaction problem, indirect control and the illusion of freedom, meaningful choice, mechanics-as-meaning and ludonarrative consonance, level-as-story, cinematics discipline, reactive bark/dialogue systems, transmedia worlds and what makes a fictional world endure, environmental and emergent storytelling, quests as composable modules and open-world quest-dependency design with the stateful-branching "spooky action at a distance" hazard (Zubek), and narrative pre-production artifacts (story bible, GCD, pitch).
> **Load when**: designing story, characters, dialogue, or quests; choosing a story structure or branching shape (string-of-pearls vs story-machine); deciding how much story to author vs generate (scripted story vs world narrative vs emergent story) and where to spend authoring effort; designing a world/systems so players generate their own memorable stories; using fiction to give mechanics meaning; steering a player's path while preserving their feeling of freedom (indirect control); writing a character arc, antagonist, or supporting NPC; mapping character relationships, status, traits, or transformation; designing an avatar for projection; designing meaningful choices and consequences; diagnosing players acting against their character's motivation; aligning mechanics with fiction; deciding what earns a cutscene; writing barks or reactive dialogue; building a deep/enduring or transmedia game world; building a story bible, game concept document, or pitch; designing multiplayer/emergent or sandbox narrative; designing quests or an open-world quest network and making cross-quest dependencies explicit.
> **References**: `.unikit/memory/gamedesign/core/references/narrative-character-toolkit.md` (character-design toolkit — avatar/traits/circumplex/web/status/transformation), `.unikit/memory/gamedesign/core/references/narrative-transmedia-worlds.md` (transmedia worlds — enduring-world properties, portals, strangest-thing), `.unikit/memory/gamedesign/core/references/narrative-bark-dialogue.md` (reactive bark/dialogue selector spec).

---

Narrative *design* is the architecture of how story is delivered through play —
distinct from writing prose. This rule is about structure, character, and
integration with mechanics, drawn from Heussner et al., *The Game Narrative
Toolbox*, and Bryant & Giglio, *Slay the Dragon: Writing Great Video Games*.

## Story vs Game: the Aristotle-vs-Mario Tension

The central problem of game writing is that authored story and player agency pull
against each other — Aristotle (structure, drama) vs Mario (mechanics, fun).
Reconcile them; never pick one.

- A **story is a journey of emotion; a game is a journey of action.** The aim is
  *transference of emotion* — the player should *experience* the character's arc by
  playing, not watch it in cutscenes. When mechanics mirror the fiction you get
  **empathetic immersion**: player and story become one.
- **Story ≠ Plot.** A game can be a "story" with almost no plot. The minimal spine
  is `Protagonist + Goal + Conflict + Obstacles + [Resolution]` (resolution is
  bracketed because games can suspend, branch, or repeat it). *Asteroids* has the
  whole spine and no plot.
- **Gate narrative success on player success.** If the player cannot succeed, the
  character does not succeed — the story advances *through* the player's actions.
- Players skip cutscenes, mute audio, and ignore lore. Design so emotional
  attachment forms *during play* anyway; the fix is investment, not coercion.
- **Interactive ≠ a new art form with nothing to learn from old craft** (Schell).
  In *any* story the engaged audience is already making decisions ("what now?",
  "don't open that door!") — interactivity only adds the *power to act*. So mine
  traditional storytelling technique heavily; the difference is harder execution,
  not a different rulebook.

## Story Structures: String of Pearls vs the Story Machine

Schell frames the *experiential* choice as two dominant, near-opposite methods.
~99% of games use one or a blend; pick by how much story you want to *author*
vs *generate*, and the agency/replay you want in return.

- **The string of pearls** (Schell's "string of pearls" / "rivers and lakes").
  Non-interactive story beads (text/slide/cutscene = the *string*) joined by free
  interactive segments (the *pearls* — a level the player completes toward a
  goal). Cutscene → level → cutscene → level. Critics call it under-interactive;
  **players love it** and it reliably keeps story and gameplay in balance. The
  reward for clearing a pearl is *more story and more gameplay*. Its quiet
  superiority: the player is **always on the authored path and knows it**, so each
  task solved is a confirmed step toward the ending (*ICO*, *The Walking Dead*,
  *The Last of Us*).
- **The story machine** (Schell's story-machine lens, Lens of the Story Machine).
  A *story* is just a sequence of connected events; a great game is a **machine
  that generates interesting sequences while people play** — stories worth
  retelling that the designer never wrote (*The Sims*, *RollerCoaster Tycoon*,
  basketball/golf). Key inverse law: **the more story text you bake in up front,
  the fewer stories the system can generate** — string-of-pearls and the
  story-machine pull against each other. The story machine is the engine room of
  **emergent narrative** (cross-link "Multiplayer & Emergent Narrative").
- **Lens of the Story Machine** — to tune the generator, ask: (1) Do multiple
  *ways to reach a goal* spawn varied stories? Add more paths. (2) **More
  conflicts → more stories** — where can I add conflict? (3) Can players
  *personalize* characters/world so the same story plays out differently? (4) Do
  the rules produce a good interest curve? (5) **Only a story worth retelling
  counts** — would anyone want to hear the story my players make?
- **Why the "branching tree of AI characters" dream stays a dream** (Schell's
  five hard problems — most are structural, not laziness or budget):
  1. **Good stories have unity** — beginning and ending are built for each other;
     12 endings that each perfectly fit one beginning is near-impossible
     (Cinderella who quits and gets an office job is *not* Cinderella).
  2. **Combinatorial explosion** — 10 three-way choices = ~88k outcomes; 20 = ~5
     billion. Authors collapse them with foldback, which *converges distinct
     choices to one result* and guts their meaning (see "Branching & Player
     Agency").
  3. **Multiple endings disappoint** — players ask "is this the *real* ending?"
     (breaking immersion) and "must I replay the whole thing?" (tedious repeat
     content). Exception: KOTOR's light/dark split is **two whole stories**, each
     complete — not variant endings of one.
  4. **Not enough verbs** — game verbs are physical (run, shoot, jump, climb);
     story verbs are social (talk, persuade, plead, complain). Until games hold a
     real conversation, their storytelling power is capped.
  5. **The time machine kills tragedy** — freedom buys away inevitability; with
     save/retry the player can always undo doom, so games can't deliver the
     fated, can't-look-away pull of true tragedy (the *Prince of Persia: Sands of
     Time* "wait — that didn't really happen" rewind). Strong interactive
     narrative should at least *risk* tragedy.
  Takeaway: the dream's flaw is focusing on *story structure* instead of
  *experience*. Don't chase the perfect branching tree — recombine ordinary
  story + ordinary gameplay structures into an extraordinary *experience*.

| Method | Player control | Authored content | Authoring cost | Replayability | Best when |
|---|---|---|---|---|---|
| String of pearls | low (linear path, free *within* a pearl) | high (whole story pre-written) | high per beat, predictable | low | a hand-crafted, emotionally-shaped story; tight interest curve |
| Story machine | high (player authors the events) | low (only a thin seed) | high up front (systems), then self-generating | very high | sandbox/sim/emergent play; stories worth retelling |

## Scripted vs Emergent Narrative (Sylvester)

Sylvester organizes a game's narrative tools into **three families** and warns
against importing film method wholesale — film teaches framing, composition,
pacing, and effects, but says **nothing** about interactivity, real-time choice,
or what to do when a player goes off-script. His central axis runs **scripted
story → world narrative → emergent story**, and he leans hard toward the latter
two. (A *narrative tool* is any device that forms a fragment of story in the
player's mind.)

This **parallels** Schell's string-of-pearls vs story-machine choice (don't
re-derive that table). Sylvester's distinctive contribution is the **fragility
argument** and where it sends your authoring budget:

- **Scripted story** — events written directly into the code, so they always
  play out the same (the cutscene is the most basic instance; cutscenes
  *inevitably break flow* because all interactivity stops, so over-using them
  gives a start-stop pace). Sylvester's image: a carefully authored plot is a
  **house of cards** — every character beat, every line, every withheld fact is
  load-bearing, and an agency-bearing player (out of ignorance or mischief) can
  topple the whole structure. Scripted story is therefore **expensive and
  fragile under interactivity**: the more you script, the more cases the player
  can violate.
- **Flexible scripting** — the affordable middle: pre-record/animate the *event*
  (a murder the player witnesses in an alley plays identically the first time)
  but **leave the player's reaction unscripted**. Flow stays unbroken because the
  stick never leaves the player's hand; the cost is reduced designer control
  (they can shoot the killer, the victim, or miss it entirely). Every scripted
  sequence must **balance player influence against designer impact**; pick the
  point on the control↔freedom continuum that fits the beat and the core verb:
  - *Half-Life* opening tram (full designer control, player can only look) →
    *Dead Space 2* falling-train set-piece (locks movement, keeps shooting to
    preserve flow) → *Halo: Reach* AI **tactical hints** (scripted strategy,
    AI handles instant tactics) → fully non-influenceable events (timed mail,
    radio/PA broadcasts, objects appearing while the player is elsewhere — cheap
    and robust because the player can't interfere).
- **The limits of authored story** — Sylvester's stance is that in an interactive
  medium **the narrative is, in large part, the player's own story**, so don't
  pour budget into the brittle authored skeleton. Spend it instead on the systems
  and fiction that let the player *generate* their story — the design power lives
  there. (Cross-link "World Narrative", "Emergent Story", and Schell's story
  machine.)

## World Narrative (Sylvester)

**World narrative** is the story of a *place* — its past and its people — told by
the architecture, layout, and contents of space ("use the world for words").
Walk a war-obsessed king's castle, a drug dealer's ghetto house, or a 50-years-
married couple's home and reconstruct the story event-by-event without reading a
line or meeting a character. In other media world narrative is a *supplement*; in
games Sylvester argues it is the **primary** narrative tool, because it dissolves
the hardest interactivity problems. (This complements the file's "Environmental &
Embedded Storytelling" with *why it is primary* and the world-coherence angle.)

- **It can't be disturbed.** A story that *already happened* needs no contingency
  handling — the player can jump on the corpse or shoot it; the authored story is
  untouched. Real-time storytelling, by contrast, must anticipate or forbid every
  player action (expensive and brittle).
- **It needs no linear ordering**, freeing you from herding the player down a
  path. Find the body first or the bloody bedroom first — either order assembles
  the same picture, so the house can be explored freely.
- **It rewards replay**: scripted story reveals itself event-by-event start-to-
  finish, but world narrative reveals itself **general → specific** — first pass
  gets the gist (a body, blood), later passes surface the divorce papers, the
  weapon, the audio log, filling in *why* and *how*.
- **Techniques** — presence/absence of features (a fortress implies past sieges),
  cultural symbols by association (Roman architecture → empire/gladiators),
  **mise-en-scène** (bound bodies against a bullet-pocked wall = an execution;
  starved bodies = genocide; royal robes = revolution), and **embedded
  documents/audio/video** (Deus Ex PDAs, BioShock audio diaries, security
  footage). Some tools sit on the border with scripted story (a PA broadcast, a
  dropped flyer): present-tense, but conveying *world* facts, not plot.
- **World coherence and the implication web.** A well-built fictional world is a
  *puzzle of relationships and working implications* — every observed fact agrees
  with every other, and the implication web extends **far beyond what is actually
  shown** (Star Wars, Lord of the Rings, BioShock, Elder Scrolls). An incoherent
  world is "pretty pictures with no connections" — a hollow shell the player can't
  step into. Make every element consistent on multiple levels (historical,
  physical, cultural). World narrative *strengthens* as the world expresses more
  internal links. (Different from Schell's transmedia "internal consistency": this
  is the **implication economy** — content implied per content shown — not
  franchise-portal canon.)

## Fiction as a Meaning Layer (Sylvester)

The fictional wrapper is not decoration: it gives a mechanic *meaning* and lets
the world's implications **amplify** the mechanic. (Additive to "Mechanics as
Meaning" / ludonarrative consonance — Sylvester's distinct framing is *fiction
amplifies mechanics*, not just *mechanics carry theme*.)

- **Worked example — Dead Space 2 "Kinesis."** Telekinesis is an elegant verb
  even as a bare mechanic (move/throw objects, solve puzzles, hurl things at
  enemies). Leaving it bare would ignore the technology's place in the fiction.
  Visceral instead wired answers into the world narrative: Isaac first rips
  Kinesis out of a **patient-restraint surgical device**; he sees **ads** for a
  Kinesis sleep-restraint product; he finds engineering systems **labeled with
  Kinesis warnings**, implying it is a common heavy-industry tool. The
  elegance is not only the many uses in combat/exploration/puzzles but the **web
  of connections it makes in the fictional world** — the fiction makes the same
  verb mean more.
- **Design move**: for each core mechanic, ask *what would this mean if it were
  real in this world?* and seed the answers into world narrative — economy,
  culture, signage, history. Consonance here is fiction reinforcing the verb, not
  merely the verb echoing the theme.

## Emergent Story (Sylvester)

**Emergent story** is the sequence of connected events that mechanics + players +
chance generate during a session — *the player's own true story*, neither written
by an author nor scripted by a machine. Coming back from a bad crash to win a race
against a friend is a story, but it happened *in your session*. Sylvester frames
it two ways at once: a **narrative tool** (you author it *indirectly* by choosing
which verbs exist — Assassin's Creed players get a million rooftop-assassination
stories but never a tooth-brushing story, because brushing is not a verb) and a
**content-generation technology** (boundaries set by the designer, but mechanics ×
choice × chance write the actual plot — limitless output, the authoring load
shifted onto systems and players). Its unique power: it crosses the **fiction-vs-
reality barrier** — a chess move that beats your older brother is a *real* story,
and the designer "cannot live the player's life for them."

- **Lens shift, not new content.** Calling generated experience a "story" is a
  *way of thinking*. Analyzing a system, you ask: is it beatable? is the UI clear?
  is there depth? Analyzing the *same* system as emergent story, you ask: is the
  character interesting? is the climax unpredictable-yet-inevitable? is exposition
  smooth? what act structure emerges? — surfacing storytelling tools you'd
  otherwise miss.

### Apophenia — the engine of emergent story

The mind is a relentless pattern-matcher; it sees agents, intentions, and feelings
even where none exist (a desk lamp afraid of a ball; "oxygen *wants* another
oxygen"). **Apophenia** is what lets sparse game cues bloom into characters and
emotion in the player's head — the computer need not simulate a real mind, only
give the player enough to project one. This is the lever behind every emergent-
story amplifier:

- **Labeling / tagging** — bolt story onto existing mechanics with names and
  traits. *Close Combat* names and tracks each soldier, so the player imagines a
  bond between the two last survivors of a squad; *Medieval: Total War* grants
  nobles personality tags ("Drunkard", "Coward") instead of raw stats. The system
  doesn't model the bond or the courage — the **labeled cue** does, and the player
  finishes the story. (A Fallout 3 raider in an antlered helmet self-labels and
  invites stories — Sylvester notes most Fallout 3 NPCs *miss* this chance.)
- **Abstraction — show less, get more.** Richer graphics/audio/dialogue *add*
  fidelity but *remove* room to imagine; the more abstract and minimal the
  representation, the stronger the apophenia (Dwarf Fortress's ASCII couple by the
  river; Rory's Story Cubes). Any gap invites the mind to fill it — show the
  Medieval general's actual marriage and you erase the imagined personality. This
  is why strategy/building/economy sims and tabletop RPGs (which present elements
  at a distance, as stats and symbols) generate more emergent story than shooters
  or sports games (which show too much).
- **Record-keeping / chronicle** — keep a record so the player need not remember
  to build the story. Civilization IV's end-game animated border map retells the
  player's empire history; *Myth* leaves every corpse, limb, and blood-spray on
  the field for **emergent mise-en-scène** the player reads after the fight; The
  Sims photo albums become story blogs.
- **Sports-commentator system** — game systems that interpret and string events
  into a narrative (the literal sports commentator; *Hitman: Blood Money*'s
  post-level newspaper that changes with method, accuracy, headshots, and
  witnesses). Hard to do well — over-explaining can *crowd out* the player's own
  apophenia — so the best versions seed the process rather than narrate the whole
  story.

## Story Ordering & Agency Problems (Sylvester)

**Ordering tools** decide which narrative tools fire in what sequence (we usually
want setup before payoff, one subplot resolved before the next). Sylvester's
ladder of ordering strength: **levels** and **missions** (a self-contained
mini-story inside an open world — fixed internal order, but startable, pausable,
and interruptible any time) → hard **gates/locks** (a locked door, a guard, a
camera — guarantees X happens before Y) → soft ordering: **ability-gating** (all
content technically open from minute one, but you need skill/level to reach it —
MMOs feel open while funneling newcomers) and even **spatial layout** (nearby
figures are met before distant ones). (Hard gating/foldback-style convergence is
already covered under "Branching & Player Agency" — this is the *soft*-ordering
addition.)

The deeper interactive-narrative risk is **agency mismatch**:

- **"Desk-jumping"** (Sylvester's term) — the player does what the *character*
  never would, because their **motivations differ**: the character wants to save
  the princess; the player wants to laugh, probe the simulation's edges, grab
  loot, or see special effects. (Named for dancing on the boss's desk in *Deus
  Ex* — imagine Bond doing it mid-briefing.) It shipped accidentally in *GTA IV*:
  the game spends hours building Niko's agonized kill-or-spare moral choice, yet
  its mechanics had the player mow down hundreds of innocents minutes earlier —
  the result is **nonsense** (the same ludonarrative dissonance the file warns
  about, here caused by motive divergence).
- **Four responses, worst to best:**
  1. **Disallow** (invisible blockers, can't-die allies) — works only when the
     *fiction* justifies it; otherwise players feel the game cheating its own
     rules and stop asking "what do the mechanics allow?" and start asking "what
     does the designer want?" — engagement drops.
  2. **Ignore** — often better than disallow or punish: shoot a Half-Life 2 ally
     and *nothing* happens (no blood, no death, no animation). The player feels
     freer and quits the boring behavior fast. Simple, obvious limits beat
     disguised ones.
  3. **Embrace** — fold the act into the fiction (Deus Ex's women's-restroom gag;
     Duke Nukem Forever's *ego* meter that *rewards* goofing off). Prefer a
     **closed** form so it doesn't spiral into ever-expanding required reactions.
  4. **Align (best)** — design so the desire never arises: the player's
     *motivations and abilities* match the character's. CoD4 keeps combat so
     fierce that the urge to fight overrides the urge to clown. Motives needn't be
     *identical*, only point to the **same actions** toward the **same goal** (CoD
     character: honor/loyalty/fear; player: energy/fun → both fight fearlessly).
     This is why story and mechanics must be **built as one**, not designed apart
     and bolted together.
- **The human-interaction problem.** Most stories are built from rich human
  exchange, but buttons and sticks can't convey it and no tech can simulate a real
  mind in reply — Sylvester's workarounds: **don't require it** (world + emergent
  tools shine precisely because they need no controlled human conversation);
  expose only **insane/non-human interlocutors** (BioShock's sane NPCs speak only
  by radio or behind unbreakable glass; everyone face-to-face is mad and merely
  *observed* until you attack, which the computer *can* model); use a **dialogue
  tree** (every side pre-authored, nothing simulated — at the cost of finite
  options); **reuse ordinary game verbs as social verbs** (GTA IV expresses a
  kill-or-spare choice through the same shoot/walk controls, preserving flow); or
  use a **real human game-master** (D&D — handles any input, but requires
  motivating every player to role-play honestly, which only face-to-face social
  pressure reliably supplies). (Complements Schell's "not enough verbs" with
  concrete design workarounds.)

## The Story Bible

The single canonical source for the fiction — world rules, history, tone,
factions, timeline, naming conventions. Everything written elsewhere must agree
with it. "A writer is the first player of the game."

- Treat the bible as the narrative **facts registry**: proper nouns, dates, and
  canon facts must stay consistent everywhere so a character's home town can't
  drift between two quests.
- Tone and content guardrails live here too — what the game will and won't depict.
  Derive tone from **theme**, even in a "realistic" setting (*GTA*'s satire).
- **World-building checklist** (scale it down for a single room or up for a galaxy):
  history, technology/magic, inhabitants, culture, class/hierarchy, religion,
  geography, language, and the *current situation* (war/peace/fear/calm). For the
  player character answer "Who am I? What am I?" — backstory, want, why, and how the
  world's inhabitants regard them. Imagine *your* world, not a recycled one.

## Dramatic Structure

There is no one-act-fits-all, but there is always *a* structure — "plot is there
so the character can change." Pick a model for the pacing the medium and genre
need, then apply the same beginning/middle/end lens **fractally** at every scale
(whole game → level → mission → scene).

| Structure | Shape | Game mapping | Use when |
|---|---|---|---|
| 3-act | setup → confrontation → resolution | 3 phases: **tutorial** → **content/levels** → **endgame** (hardest beats + a *playable* finale, not just a cinematic) | default for linear, story-driven games |
| 4-act (midpoint) | a twist/reversal splits Act 2 | a mid-game revelation re-energizes the second half | the game sags in the middle |
| 5-act (Shakespeare) | open *in* conflict → escalate → twist → spiral → climax | drop the player straight into trouble; minimal exposition | low-patience players; long campaigns |
| 8-sequence | acts split into 8 self-contained mini-stories, each with a mini-objective | 1:1 with **levels/missions**; not capped at 8 | chaining causal missions |
| Serialized | each episode self-contained, ends on a cliffhanger | episodic releases and DLC ("potato-chip effect") | episodic or live content |
| "Slay the Dragon" | define the WANT (the "dragon") first; pyramid that scales up ("start small, go big") | keep story and gameplay advancing in lockstep at every granularity | the authors' default game model |

- **"Therefore / but, never and."** Connect beats so each *causes* the next
  (*therefore*) or *complicates* it (*but*). A chain of "and… and… and…" fetch
  quests is activity without purpose.
- Each beat is a **turning point**: it answers a question and raises a new one — the
  hero gets wiser, the stakes higher, the antagonist scarier.
- **Know the ending first.** You can't reach an ending you haven't defined, even
  with multiple endings.
- **Give the game an "engine"** — a premise that keeps generating content (the
  engine of *The Last of Us* is "get Ellie to the Fireflies").
- **Time is different in games.** Act lengths are *unbalanced* (*The Last of Us*
  Act 1 ≈ 25 min, the rest is hours); tutorials double as exposition (*Fallout 3*'s
  vault childhood); a reveal can be delayed for hours (*why* Kratos hunts Ares).

## Branching & Player Agency

Choose a branching shape for the **fantasy of agency** you want vs the cost you can
afford. Agency has two axes — *agency of action* (what the player can do) and
*agency of identity* (who they get to be) — decide both with the gameplay designers
up front.

| Structure | Shape | Cost | Player feels |
|---|---|---|---|
| Linear | one path, no choice | lowest | authored, guided |
| Gauntlet | choices that only delay/branch briefly then rejoin | low | small agency, cheap |
| Branch & bottleneck (foldback) | branches that reconverge at story beats | moderate | real local choice, controlled scope |
| Open / state-based | choices set world flags, content reacts | highest (combinatorial) | deep agency, expensive to author |

- **Combinatorial cost is the trap.** **Foldback** is the workhorse — felt choice
  while keeping authored content linear-ish; reconvergence points reclaim scope.
- Track choice **consequences as state** (flags) so reactive content reads them
  consistently (*Fable*'s villagers remember you; *Shadow of Mordor*'s Nemesis
  system; *Mass Effect* logging choices across a trilogy).
- **Choices must lead to consequences.** The holy grail is true choice → true
  consequence. A **fake choice** (cosmetically different, same outcome — *BioShock*'s
  harvest/save) erodes the one thing only games offer.
- **Tactical choices ≠ dramatic choices.** Dodge/gun/grenade are gameplay; a
  *dramatic* choice is proactive and hard. Easy choices aren't drama — a bank robber
  who stops to save a family is a story; a fireman doing it is not.
- **Budget branches.** Content costs money and players miss expensive paths. Keep
  alternate endings *similar* unless the divergence is a genuine moral choice — don't
  force a 40-hour replay to see "the good one."
- Players tend to pick the "right" choice even in grey, no-win situations — design
  moral forks knowing this tendency.

## Quests & Stateful Branching (Zubek)

The branching table above names the *shapes*; Zubek (*Elements of Game Design*,
Ch 6) adds the **composition unit** (the quest) and the **engineering hazard** of
the state-based shape. (Don't re-derive linear/foldback/state-based here.)

- **Quests are composable narrative modules.** A quest is a short, goal-directed
  sequence (usually linear or branching) with **defined start conditions, defined
  end points, and success/failure consequences**. It delivers exposition
  (cutscene/NPC dialogue) and supplies the goal-plus-reward "carrot". Build a larger
  narrative by chaining small, self-contained quest modules — e.g. a sequence of
  hub-and-spoke zones, each unlocking when its quests resolve.
- **Star / hub-and-spoke** is a distinct narrative shape, not only a level layout: a
  set of required objectives the player tackles **in any order**, returning to a hub
  between them. It grants more agency over *order and timing* than any DAG branching
  schema, while the player changes world state per spoke.
- **Open worlds are a dense quest network.** Instead of one forced chain, scatter
  many small stories — some linked into the main arc, others independent (flavour,
  loot, boosts). Topologically a densely-connected net the player can move through
  almost arbitrarily, switching threads or leaving to explore. This trades authorial
  control over sequence/tempo for player autonomy.
- **Stateful branching's hazard: "spooky action at a distance".** Branching on
  tracked state (counters, relationships, "quest done" flags) encodes complex
  relations with a tiny graph — but it couples *unrelated* parts of the game through
  global variables, making bugs very hard to find. A "ghost counter" set by an early
  quest that silently gates a late hidden location means editing the early quest
  (ghost → troll) **breaks the late content undetectably**.
- **Mitigation — isolate state and make dependencies explicit via quest items.**
  Limit cross-quest interactions, and where one quest must gate another, express the
  dependency as a granted **quest item** rather than a hidden flag (Witcher 3's
  safe-conduct letters gating new zones). A granted item is *greppable* in the
  database — you can auto-verify that every required item has a giver and every
  giver's item has a use, which a buried global flag never lets you check.

## Indirect Control (Narrative Agency)

The story-vs-game conflict is, at root, a conflict about **freedom**. The
*feeling* of freedom — not actual freedom — is what makes play special and lets
the player project into the world (Schell's Lens of Freedom). You can keep a
tight authored interest curve *and* a free-feeling player by guiding them with
**indirect control**: subtle, near-invisible means that make the player choose
the path you wanted, by their own will. The narrative payoff: you steer the
*story* while the player keeps their sense of agency. (Other rules own the
*spatial-guidance* and *UI-affordance* angles of this same idea; here it is
strictly the freedom/agency lens.)

Schell's six methods of indirect control (use any mix):

1. **Constraints** — cut the option space and the few remaining choices still
   *feel* like choice. A room with two doors guarantees the player goes through
   one (a door "says open me"); an open field is unpredictable. (Candy-stall
   "top-6 flavors" effect: too much freedom paralyzes; a curated short list both
   delights *and* steers.)
2. **Goals** — the bluntest lever. Give a goal ("find all the bananas") and the
   player visits only the places and does only the acts that serve it — so build
   only what serves the goal; unseen content is wasted budget, not added freedom.
   (The engraved fly in the Schiphol urinal: a hidden goal that shaped behavior.)
3. **Interface** — what the interface affords *is* what the player imagines doing.
   A plastic-guitar controller never prompts thoughts of stage-diving; a gamepad
   does. The **chosen avatar is part of the interface** — Lara Croft, a dragonfly,
   and a tank each silently license different actions.
4. **Visual design** — the eye goes where composition leads, and the body follows
   the eye. Use a focal "weenie" (Disney's term — the castle that pulls guests to
   the park center, then signage that fans them out). Keep the player's gaze
   *ahead* of their character to steer them. (Aladdin VR: a single bold **red line
   on the floor** drew 90% of players to the throne while they had no conscious
   memory of it — it out-competed the distracting columns for attention.)
5. **Characters** — if players take your characters seriously, they will obey,
   help, or protect them by their own choice (*ICO*: rushing to save the princess
   from the shadow-creatures because *failing her* feels real; *Animal Crossing*'s
   HRA judging your house). Schell's Lens of Help: who do players help, and how
   does that bond steer them?
6. **Music / sound** — speaks to mood and pace below awareness (fast restaurant
   music makes diners eat faster). Cue music to make players search for secrets,
   slow down, sense they're off-path, or run.

- **Collusion** (Schell's principle): let in-world characters pursue their own
  goals *and* secretly serve the designer's experience goal at once — characters
  "collude" with the designer. *Pirates of the Caribbean: Battle for the
  Buccaneer Gold*: enemy ships attacked, then *fled toward* the next island quest,
  pulling the player through a perfectly-paced loop (combat → quest → combat →
  quest → set-piece finale) with no felt loss of freedom. *Façade* binds NPC
  decisions to a tension timeline so their motives stay legible and the player
  stays gripped. "When a good leader is done, the people say: we did it ourselves."
- **Indirect-control checklist** (Lens of Indirect Control): (1) Ideally, what do
  I want players to *do*? (2) Which lever fits — constraints, goals, interface,
  visual design, characters, music? (3) Does it steer them **without costing the
  feeling of freedom**? Caveat: indirect cues can lead players down a path you
  never anticipated — playtest the *whole* set of expectations your design implies.

## Characters (Playable, Antagonist, Supporting Cast)

A character sheet pairs **fiction** (role, voice, arc, relationships) with a
**gameplay function**; rich lore with no function is content debt, a central
system with no voice reads as a system — keep both halves or cut one. The core
moves: **write from the arc backwards** (decide the emotional end-state first,
then engineer the plot to force it), put **want vs need** at war (the internal
conflict beneath the external one), build the protagonist as a flawed, *active*
**ordinary-person-in-extraordinary-circumstances** (Batman, not Superman),
motivate them with a backstory **"ghost,"** and reduce that motive to a primal
emotion. A villain is the **hero of their own story** — build them with the same
want/need/conflict tools; the *only* hard requirement is that hero and villain
wants are **mutually exclusive**. Supporting NPCs build up and challenge the PC
without outshining a hollow one.

> The full **character-design toolkit** — the avatar (idealized form vs blank
> slate), character traits, the interpersonal circumplex, the character web,
> status (Johnstone), the transformation table, surprise, faces/eyes/voice
> craft, and the uncanny valley — lives in
> `core/references/narrative-character-toolkit.md`. Load it when authoring a
> protagonist, antagonist, or supporting cast.

## Mechanics as Meaning (Ludonarrative Consonance)

Mechanics and story must say the **same thing**. Ludonarrative *dissonance* (a
remorseful character the player controls as a mass killer) breaks immersion by
contradicting itself.

- **Mechanics = active verbs** (jump, shoot, build, herd). A verb alone is
  meaningless — "Mario jumping is just Mario jumping." It becomes meaningful as
  **mechanic + content + context + goal**: wrap the verb in content (enemies,
  layout, dialogue), point it at a play goal, and give it story context (cracking a
  *BioShock* turret is a puzzle; *survival* is why you bother).
- **Gameplay must be the story of the game** — what the player *does* mirrors the
  theme. Deliver narrative *during* play (*GTA V*'s car-ride dialogue), so players
  rush through gameplay to learn what's next rather than skipping cutscenes.
- **Narrative balance vs gameplay balance.** Gameplay balance optimizes challenge vs
  difficulty; *narrative* balance optimizes emotional involvement vs interactivity —
  keep the player inside the story *while* playing, not only between levels.
- **Theory of fun = surprise.** Uncertainty of outcome is fun (a loot drop, a card
  flip); certainty is not (a light switch). *Fiero* — pride in overcoming
  adversity — is rooted in surprise.
- Test each pillar: does the mechanic reinforce the fiction it sits in? When a
  mechanic must diverge from fiction for fun, make it a **named, deliberate
  trade-off** (an aesthetics-vs-systems tension, frameworks-rule MDA language), not
  an accident.

## Levels as Story

"Level design *is* story design" — levels are the scenes/chapters that push the
player through the dramatic structure. (For layout, pacing, and composition craft,
load `level-design.md`; this section is the *narrative* lens.)

- Design levels **narrative-first**: decide what drives the story forward, then
  design what happens inside. A level is a contained environment where the
  protagonist must achieve a goal to advance the story.
- Every level needs its **own goal and arc** (the fractal rule). Use the **? ! .**
  lens: **?** = what the PC wants, **!** = the obstacles, **.** = the resolution and
  the PC's reaction. End each level on a **turning point or false goal** (the
  *BioShock* escape sub explodes just as you reach it).
- A level should also deliver **character insight** (*The Last of Us* giraffe
  moment), **foreshadow** the next, and be fun. Map **story beats by level** the way
  the book dissects *The Last of Us*.

## Cinematics & Cutscenes

Default stance: **"cut the cut scenes."** They are non-interactive, and players want
to play, not watch. Before writing one, make sure it *can't* be cut — it must do at
least one of three (all three is better):

1. **Move the narrative forward** — be the highlight reel, not the news report.
2. **Reveal character** — emotional state, motivation, the "ghost."
3. **Deliver one piece of crucial A/V information** — and only one; push the rest to
   on-the-fly voiceover/text. The longer the info, the duller the scene.

- **Bracket gameplay with setup + reaction**: a *setup* scene primes the player
  before a set-piece; a *reaction* scene shows the emotional aftermath.
- A good scene meets a want, then spins the story in a new direction (the
  **"whammo"**) — when expectations are merely met, things get boring.
- **In-engine "fake interactivity"** (jiggling props, walking during a briefing) is
  hollow because it doesn't affect the outcome. Write cinematics good enough that
  players *won't want* to skip them.

## Environmental & Embedded Storytelling

- **Show through space** — "use the world for words." A ransacked room, a body, a
  graffiti tag tells story with zero reading cost. Unlike film (where the camera must
  hold on a clue, breaking flow), games let each player discover at their own
  pace — the *joy of discovering* beats passive receiving.
- **Breadcrumb / "shuffled nuggets":** scatter fragments across a level and let the
  player assemble the backstory in their head (the *BioShock* audio diaries) — more
  satisfying than spoon-feeding.
- **Diegetic delivery** keeps the channel in-world: a readable GUI (*Fallout 3*'s
  Pip-Boy), interactables and collectibles (every left-behind item in *L.A. Noire*),
  and even loading screens with in-character hints.
- **Embedded** narrative (logs, item descriptions, overheard barks) is opt-in depth.
  **Reserve the environmental channel for lore, never mission-critical
  information** — environmental detail is easy to miss, and flagging it with floating
  arrows breaks immersion. Never put critical-path information *only* in skippable
  text.

## Reactive Bark / Dialogue Systems

For reactive, context-sensitive lines, specify the **selector**, not just the
lines — the lines are content, the selector is design. Each bark needs a
**trigger**, **conditions** (world/state flags, character knowledge),
**priority**, **cooldown** (anti-repetition), and a one-shot vs variant-pool
flag; the core writing problem is **combinatorial explosion** (states × variants
× speakers × placements), tracked in a database, not a flat list. Every line in
the character's distinct voice, and brief.

> The full **bark-selector spec** — barge-in/interruption handling, the
> spreadsheet-matrix discipline, voice/pipeline craft, and the repeated-line
> fourth-wall problem (Firewatch, GDC 2017) — lives in
> `core/references/narrative-bark-dialogue.md`. Load it when building a bark or
> reactive-dialogue system.

## Multiplayer & Emergent Narrative

- **"We all can't be Batman."** In multiplayer the marquee heroes are NPCs; the
  player rolls their own avatar of *themselves*. Real humans are exciting and
  *distract from authored narrative*.
- The narrative designer's job shifts from *telling a story* to **planning the
  party / building the playground** — a cruise director who sets the table and gives
  players reasons to mingle; the story becomes the *theme*/backdrop. Theme every
  detail like a Disney "Imagineer" (a Disneyland, not a Six Flags).
- An MMO's meta-story is always **"max my level"**; the real story lives in the
  **side quests = the lore**, and players learn the world from each other.
- **Sandbox ≠ MMO** — free-roam games still have a main narrative; "story rules."
- **Emergent gameplay** (players using systems in unintended ways) breeds **emergent
  narrative** (players authoring their own stories). Design *for the stories you
  didn't write*, accepting they may lack your intended resonance.

## Worlds & Transmedia

Stories and games happen in **worlds**, and the most valuable end product is
often not a story or a game but the *world* itself (Schell, via Henry Jenkins).
A world exists independently of any one medium; each product — game, film, comic,
toy — is a **portal** into it. Build the world deeper and more enduring than any
single game it ships in: **know it like a god**, hold its **internal
consistency** (one contradiction "jumps the shark" and breaks belief in the
whole world), leave room for **many stories**, and pair **simplicity +
transcendence** (a world simpler than the real one, with powers greater than it).

> The full **transmedia treatment** — the properties of enduring worlds
> (powerful / long-lived / evolving), what successful transmedia worlds share and
> the "binocular effect," franchise-portal authoring, and the "strangest thing" /
> accessible-not-accurate lens — lives in
> `core/references/narrative-transmedia-worlds.md`. Load it when building a
> deep/enduring fictional world or authoring portals into one.

## Narrative Pre-production Artifacts

- **Game Concept Document (GCD)** *starts* the conversation; the **GDD** *ends* it.
  The GCD (≤~20 pages) holds what a writer needs to write for the game: pitch, genre
  and core mechanics, world, protagonist/key NPCs, the opening hook, a level outline
  with story beats, and the "trailer" highlights.
- **The "back of the box" / pitch** = three ingredients: **gameplay + story + "you"**
  (the "you play as ___" line). Name a title and a genre. Practice by writing the
  one-line store blurb.
- **Make your map** — like carding out a screenplay, lay out the world as the game
  board before opening any tool; start on paper.

## Anti-patterns

- Characters with deep lore and no gameplay function (or function with no voice).
- A **power-up-only arc** — relying on new abilities/levels as the *only* way the
  character "changes," with no emotional arc.
- The **blank-slate / amnesiac protagonist** as a default — a shallow, short
  emotional journey; give a real character with a backstory.
- A **flat antagonist** with no want of their own — "the bad guys think it's their
  game" was ignored.
- **Fake choices** that look meaningful but converge on the same outcome.
- **"And"-chained levels** — fetch-quest shopping lists with no turning points;
  motion mistaken for action.
- Choosing fully independent branches and discovering the combinatorial blowup
  late — foldback was the affordable structure.
- Critical-path information hidden only in skippable embedded or environmental text.
- A **cutscene that could be cut** — exposition dumped because the team "understands
  movies"; fake-interactive cinematics that don't change the outcome.
- A bark list with no trigger/condition/priority/cooldown, under-written variants, or
  speakers who all sound alike — repetition and audible nonsense in play.
- Story and mechanics contradicting each other with no named trade-off (ludonarrative
  dissonance shipped by accident).
- Treating a multiplayer game like a linear story instead of a party/playground.
- Canon facts (names, dates) duplicated in prose instead of the registry —
  guaranteed drift.
- Chasing the "perfect branching tree of AI characters" — sinking budget into a
  structure defeated by unity, combinatorial explosion, disappointing multiple
  endings, missing verbs, and the time machine; focusing on *story structure*
  instead of *experience*.
- Authoring content the player will never see (extra streets, unreachable rooms)
  and calling it freedom — it is wasted budget, not agency.
- **Seizing direct control** to force a player onto the path (cutscene-railroading
  a free-roam moment) when an indirect lever (a goal, a focal "weenie", a colluding
  character) would have steered them while preserving the feeling of freedom.
- A world broken by one internal contradiction ("jumping the shark") — rules not
  held consistently.
- A transmedia portal that only makes sense if you consumed another one ("read the
  book first"); inconsistent portals that turn the world to dust.
- **Too many "strangest things"** — a world so unfamiliar players can't orient; or
  a single strange element dropped in with no priming.
- Static characters (villain forever a villain) with no transformation; flat
  status (every NPC behaves identically regardless of who they're with); dead eyes.
- A realism-chasing human character that falls into the **uncanny valley**.
- Importing the player's own face as the avatar as a headline feature — players
  play to be who they *want* to be, not themselves.
- Pouring budget into a **brittle authored skeleton** (the "house of cards") that
  one off-script player can topple, instead of into the systems + fiction that let
  the player generate their own story.
- **Over-fidelity that kills apophenia** — showing/telling so much (hi-detail art,
  full dialogue, modeled relationships) that there's no gap left for the player's
  mind to fill with character and meaning.
- A bare mechanic with **no fictional implications** — a verb that means nothing
  in the world (Kinesis left unwired to the world's culture/economy/signage).
- An **incoherent world** — disconnected pretty details with no implication web;
  the player can't step in because there isn't enough meaning.
- **Desk-jumping shipped by accident** — mechanics that reward acts the character
  would never do (mass-murder minutes before an agonized kill-or-spare beat),
  producing motive-driven ludonarrative nonsense.
- **Disallowing** off-script acts with disguised blockers the player can feel —
  breaking faith in the mechanics' honesty when *ignoring* or *aligning* would
  have been cleaner.
- Forcing **rich human dialogue** the medium can't deliver instead of using a
  workaround (world/emergent tools, insane/non-human NPCs, a dialogue tree, reused
  game verbs, or a human GM).
- **Hidden global-state coupling across quests** ("spooky action at a distance") —
  an early quest silently gating late content via a buried flag, so editing the
  early quest breaks the late one undetectably; make cross-quest dependencies
  explicit and auto-verifiable via granted quest items instead.

## Source Map

| Source | Used for |
|--------|----------|
| Bryant & Giglio, *Slay the Dragon: Writing Great Video Games* (Michael Wiese Productions, 2015) | Aristotle-vs-Mario tension; story≠plot spine; dramatic-structure models and the game-phase mapping; "therefore/but, never and"; the story "engine"; write-from-the-arc-backwards, want vs need, the backstory "ghost", Superman-vs-Batman, agency of action/identity, choice→consequence and fake choices; antagonist "bad guys think it's their game"; mechanics-as-verbs and narrative balance; level-as-story (? ! .); cinematics three-job test, setup/reaction, the "whammo"; breadcrumb/diegetic environmental storytelling; bark combinatorial explosion and voice craft; multiplayer/emergent narrative; GCD/pitch/map artifacts |
| Heussner et al., *The Game Narrative Toolbox* | Story bible as canon/facts registry; character sheets with a gameplay function; the foldback branching taxonomy |
| *Firewatch* dialog system (GDC 2017) | Reactive bark selector — trigger/conditions/priority/cooldown/one-shot and barge-in handling |
| Jesse Schell, *The Art of Game Design: A Book of Lenses* (Russian translation), Ch 17–20 | String of pearls vs the story machine and the story-machine lens; the five hard problems of branching narrative (unity, combinatorial explosion, multiple endings, not-enough-verbs, the time machine); indirect control and the illusion of freedom (constraints, goals, interface, visual design/"weenie", characters, music) and collusion; transmedia worlds, what makes a world deep/consistent/enduring, simplicity+transcendence, the strangest-thing and accessibility-over-accuracy; character tools — the avatar (idealized form vs blank slate), traits, the interpersonal circumplex, the character web, status (Johnstone), character transformation, faces/eyes, the uncanny valley |
| Robert Zubek, *Elements of Game Design* (MIT Press, 2020; Russian translation), Ch 6 | Quests & Stateful Branching — quests as composable narrative modules (defined start/end, success/fail consequences); the star/hub-and-spoke shape; open worlds as a dense quest network; the stateful-branching "spooky action at a distance" hazard and the quest-item-as-explicit-greppable-dependency mitigation (Witcher 3 safe-conduct letters) |
| Tynan Sylvester, *Designing Games* (O'Reilly, 2013; Russian translation), Ch 4 | The three narrative-tool families (scripted story, world narrative, emergent story) and the scripted-vs-emergent trade-off (scripted story as a fragile "house of cards"; flexible scripting and the control↔freedom continuum — Half-Life/Dead Space 2/Halo: Reach/non-influenceable events); world narrative as the primary game tool (can't-be-disturbed, non-linear, replay-friendly general→specific reveal; mise-en-scène, embedded documents/audio/video) and world coherence / the implication web; fiction as a meaning layer that amplifies mechanics (Dead Space 2 "Kinesis"); emergent story as both narrative tool and content-generation tech, apophenia, and the amplifiers (labeling, abstraction, record-keeping/chronicle, sports-commentator); soft story-ordering (ability-gating, spatial layout); agency mismatch ("desk-jumping") and the four responses (disallow/ignore/embrace/align); the human-interaction problem and its workarounds |
