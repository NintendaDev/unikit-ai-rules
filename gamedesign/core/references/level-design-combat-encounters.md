# Level Design — Combat Encounter Design

Detailed combat-encounter method extracted from `level-design.md` (load on demand
when designing firefights, cover layouts, or wave-based fights). The main rule keeps
the conceptual hook; this file holds the full method, the cover taxonomy, and the
placement numbers. Source: Михаил Кадиков, *Проектирование виртуальных миров. Теория и
практика дизайна уровней* (Ridero, 2020).

## Combat Encounter Design

Scattering cover generously and placing enemy spawns in surprising spots does *not*
make an interesting firefight. Define the battlefield **structure** first.

**Focus of the encounter.** The spot the player's attention centers on. The #1
combat frustration is inability to control/predict, so mark the focus clearly with
three rules: (1) introduce enemies **strictly within the focus** — never spawn
reinforcements behind the player's attention; (2) place enemy cover **close
together**, never spread (spread = fire from all directions at once); (3) put the
battlefield **exit inside the focus** to cue the next direction. Multiple foci are
fine but placed far apart and telegraphed when they switch (a light at the active
tunnel — *Half-Life 2: Ep2*). **Telegraph the enemy:** stage entrance in three beats
— appear with an attention-grabbing event → take advantageous positions → *then*
open fire. Never let enemies fire on arrival.

**Coverless crossroads are evil.** A player can't focus on multiple directions at
once. Core fairness rule: at a crossroads the player must be able to focus on
direction #1 while **fully safe** from direction #2 (and vice-versa); sequence the
threat checks (clear behind the door, *then* turn to the next). Exception: levels
built for coordinated team play, where teammates cover each other's focus.

**The front line & no-man's-land.** Every battlefield has four parts per side:
front, left flank, right flank, rear. Without a clear front line you get
uncontrolled chaos. Separate the two sides with a **no-man's-land** — an open,
dangerous neutral strip that grants no advantage and is so disadvantageous to stand
in that players hold their own side. An *impassable* front line (chasm, toxic river)
forces a ranged duel; a passable one mixes melee/flanking.

**Flanking.** A flank route is a "bridge of cover" letting a combatant close to the
nearest range. Keep cover on the no-man's-land to a **minimum** (brief shelter
only — too much and the flank stalls). Organize flanks *within the focus*: the
attacker moves **parallel** to the line first, then crosses. A flank from outside
the player's view is allowed **only** with a warning signal (breaking glass, birds,
a car alarm). A flank must always give a tangible advantage over the frontal
approach. **Redirect the front line** to keep a fight dynamic: after the player wins
at line #1, the enemy's remnants retreat to line #2 where reinforcements arrive;
mark each new focus with a spectacular event, and pull allies forward too.

**Cover.** An ideal cover fully hides the model *and* blocks bullet/grenade damage,
is tuned to the core combat mechanics, and is built from modular assets with
**standardized dimensions** (wrong dimensions leave the head exposed while the player
believes they're safe). Editor-tag each cover for correct interaction (auto-stick,
vault, blind-fire). Cover taxonomy:

| Cover type | Use |
|------------|-----|
| **Static** | most common; **prefer low cover** — it gives a sightline, more attack directions, and instant vault-forward; high cover only allows predictable left/right lean-fire |
| **Destructible** | guarantees safety only briefly — stops camping and forces movement; destructible walls/doors reshape the floor plan mid-fight (*Rainbow Six: Siege*) |
| **Moving** | rare, mostly escort (a vehicle, a pushed cart); in open ground often the *only* survivable cover |
| **Concealment-only** | hides but gives no protection (grass, bushes, glass); whole stealth episodes build on it |

**Cover placement numbers:** **1-2 covers** on the no-man's-land for flanking (don't
let the player linger); **2-3 covers per enemy shooter** so the AI can move between
them and stay unpredictable (a cover shortage makes AI predictable); space covers
close enough to dash between without being caught in the open; key spacing to the
intended engagement range (don't impose a sniper duel at grenade range). Use cover
to **lure** the player into the start position (offer several start-cover options),
and counter the predictability of repeated start layouts with **dynamically
appearing cover** (a falling column, a flipped table).

**Staging waves.** The LD is the *director* the AI can't be. Build any defensive
fight on stepwise escalation: a **weak first wave** (player learns the space,
restocks, digs in), each later wave more dangerous. Insert short **breathers**
between waves (for rest, story, and to introduce a new enemy type before it
attacks). Keep **melee and ranged enemies in separate waves** so the player focuses
one gameplay type at a time. For drama, occasionally force a **retreat** (enemy
breaches the line → fall back to an inner stronghold → turn the tables).

**Allies.** Four rules: allies must **never steal the fun** (the *player* wins the
unfair fight and loots the bodies); never be a **babysitting burden** (except a
script-mandated protect target); never **block the player's path** (unless
story-driven); their placement **defines the front line and the player's start
position** — send them to the front *ahead* of the player, but the decision to
assault always stays with the player.

## Anti-patterns

- Scattering cover + surprise spawns with no defined front line.
- A coverless crossroads that exposes the player from several directions at once
  (non-team modes).
- Enemies that fire on arrival or spawn behind the focus.
- Non-standardized cover that leaves the head exposed.
- A cover shortage that makes AI predictable.
- Mismatched cover spacing vs weapon range.
- Mixing melee and ranged enemies in one wave; no inter-wave breathers.
- Allies that steal the fun, babysit, or block the path.
