# Rep Raiders: game flow

> Agreed 2026-11-12. Where this differs from `idle_rpg_workout_project_roadmap.md`, this file wins (see "Changes from the roadmap" below).
> **Built** = in the app now. **Planned** = agreed direction, not built yet.

## 1. First run

```text
Title ──PLAY──▶ Choose Class ──▶ Hero ──ENTER THE WORLD──▶ Map (Chapter 1 card)
```

| Step         | What happens                                                                                                      | Status |
| ------------ | ----------------------------------------------------------------------------------------------------------------- | ------ |
| Title        | PLAY is the only button. There is no separate Classes button.                                                     | Built  |
| Choose Class | Any of the five classes: Warrior, Archer, Mage, Summoner, Rogue. Each class shows its base stat spread.           | Built  |
| Hero         | Lands here after picking a class: stats, class level, Change Class. A first-run card sends the player to the Map. | Built  |
| Map          | Opens with the Chapter 1 story card for the starting region.                                                      | Built  |

Returning players: **PLAY → Camp**.

### Combat training

Before the first fight the player controls (a map encounter, PLAY THROUGH or the checkpoint fight), a guided spar against a calm Goblin runs first, then goes on to that fight. The rules are in `rpg/tutorial.ts`.

- **One prompt per step.** The next step starts once the player has done it: MOVE, ATTACK (Summoner: SUMMON, then WATER BALL), JUMP, DODGE (Warrior: BLOCK), the class's trick, then FINISH IT.
- **The class tricks:** the Rogue's counter thrust, the Warrior's shield shove, and the corner blink for everyone else.
- **Nobody can lose.** The hero never drops below 1 health. The Goblin stands still for the first steps, then walks in and swings slowly, never dodging. It can only fall in the last step.
- **SKIP** is on the prompt, and SKIP TRAINING is in the pause menu. Both count as done.
- **It runs again after a class change**, since a new hero means a new kit.
- **Replays:** COMBAT TRAINING on the Hero screen, or the DEV spar's TRAINING chip with a class chip.
- **Pause menu:** HOW TO FIGHT shows 4 short tips for the class, in every fight.

## 2. The four tabs

### Camp: where the game is played

Camp is where expeditions are planned, followed and replayed. It has two separate entry points, and they never open the same menu:

| Button        | Opens              | Purpose                                                |
| ------------- | ------------------ | ------------------------------------------------------ |
| **YOUR CALL** | Expedition planner | Decide how the **next** expedition runs, then start it |
| **REPLAY**    | Expedition log     | Look back at **past** expeditions                      |

**Status:** Screens built and interactive; expedition results are **fought with the fight engine** (§ build order 4): Camp states, YOUR CALL planner, warm-up, checkpoint decision, CLAIM GOLD, REPLAY log with WATCH and PLAY THROUGH. Dev builds have "to checkpoint" and "to morning" skips. Full design in §6.

### Quests: workouts through the day

- **Quest batches:** the day starts with **3 quests** at midnight. Every **2–4 hours** (seeded per player and day) a fresh batch of **2–3** arrives and replaces any still open. A workout already under way gets a 1-hour grace period.
  - About 6–8 batches a day, so roughly 15–20 quests are on offer; most players will do far fewer.
  - Missed quests simply expire, with no penalty.
- **Rewards:** each quest awards its full **2–4 points**: 2 for easy movements, 3 for standard, 4 for hard. There is no stat cap.
- **Ad quests:** rewarded ads unlock up to **2 extra quests a day**, each open until midnight.
  - The hook is built: dev builds show "+1 QUEST (DEV)".
  - Real ads are Planned.
- **Easier / Harder:** Easier steps down the swap chain (e.g. push-ups → knee → wall push-ups); Harder steps back up toward the planned exercise. The reward stays the same either way.
- **Variety:** no movement pattern repeats within two quests, and quests are about 60/40 class/world.
- Rest days cost nothing.

**Status:** Built.

### Hero: stats and class

- **Stats:** STR / END / AGI / VIT. Only workouts raise them.
- **Class level** comes from points trained above the class base, on a rising curve, and sets which expedition levels the hero can take on.
- **Change Class works as a reset** (see §3).

**Status:** Built.

### Map: the open world

There's no Start Expedition here. The Map is the world you roam:

- walk your hero through each chapter's area;
- find camp sites, see the level band and enemies to expect, and set camp;
- rewatch past story scenes;
- spend gold to unlock new areas, each with its own scene and chapter card.

Setting camp sends you to Camp, where the expedition is planned (§6). This is modelled on Shadow Sprinter's RPG overworld.

**Status:**

- Partly built: regions with prices and levels, the camp marker, Chapter 1 on first open, Past Scenes replay.
- Planned: the walkable world, camp sites, gold unlocks. Full design in §7.

## 3. Classes and stats

**Base spread:** every class starts with the same 20 points, spread toward its style (`rpg/classes.ts`).

| Class    | STR | END | AGI | VIT |
| -------- | --: | --: | --: | --: |
| Warrior  |   7 |   5 |   3 |   5 |
| Archer   |   4 |   5 |   7 |   4 |
| Mage     |   3 |   8 |   4 |   5 |
| Summoner |   3 |   7 |   4 |   6 |
| Rogue    |   5 |   4 |   8 |   3 |

**Workouts and abilities.** CLASS quests come from the workouts tagged with the class; WORLD quests from the rest. All workouts and warm-ups are listed in **`rpg/data/workouts.json`**: edit it to add or change one (`npm run workouts:sheet` draws them as `docs/workouts.html`). The warm-up before an expedition is the class's signature move.

| Class    | Focus      | Class workouts                                                                                      | Warm-up       | Abilities                              |
| -------- | ---------- | --------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------- |
| Warrior  | Upper body | push-ups, chair dips, arm circles, plank                                                            | push-ups      | Guard, Counter, Heavy Strike           |
| Archer   | Lower body | lunges, squats, mountain climbers, wall sit, calf raises                                            | lunges        | Focus Target, Special Arrow, Evade     |
| Mage     | Core       | sit-ups, heel touches, plank, dead bugs, Russian twists, alternating toe touches, lying knee raises | sit-ups       | Fire Bolt, Frost Ward, Chain Lightning |
| Summoner | Full body  | burpees, push-ups, squats, sit-ups                                                                  | squats        | Summon, Water Ball, Recall             |
| Rogue    | Bursts     | lunges, burpees, jump squats, jumping jacks, high knees                                             | jumping jacks | Dodge, Combo, Disengage                |

Every workout has an animated how-to diagram (`src/diagrams/poses.ts`), shown on the workout screen and quest cards; tap it for the big version with cues. Keep exercises simple and well known.

**How each class fights** (`KITS` in `rpg/fight.ts`; art in `assets/fighters/hero/<class>/`):

| Class    | Damage from | Attack                                                                                                                                                                                                                                                                                                                                                                                             |
| -------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Warrior  | STR         | Katana slash, extra knock-back, a little extra armor. DODGE is a **shield block** (BLOCK): holds ground, blocks swings and shots, shoves the attacker back                                                                                                                                                                                                                                         |
| Rogue    | AGI         | Quick dagger slashes; after a dodge, a **counter** (the dagger thrust: quicker, ×1.3 damage)                                                                                                                                                                                                                                                                                                       |
| Archer   | AGI         | Arrows from range (fast, far)                                                                                                                                                                                                                                                                                                                                                                      |
| Mage     | END         | Alternates: a spell cast (purple bolt), then a staff thrust (fireball), a cast, a thrust (lightning bolt), and so on                                                                                                                                                                                                                                                                               |
| Summoner | END         | First attack (spell cast) **summons a copy of the enemy** on your side, hitting as hard as the Summoner's power. It takes **2 hits** and falls; each hit's damage goes to **the Summoner's health**. The enemy fights whichever is closer. While it stands, attacks are staff thrusts firing **water balls** (half the summon's damage). One summon at a time; after it falls, 3 s before the next |

VIT and END give health (END also armor, capped lower for END-powered classes), AGI speed, quicker attacks and dodge cooldown. Arrows, bolts and wisp shots can be jumped or dodged, by the hero and by enemies. Against a shot, a dodge counts only if it's timed to the shot's arrival (still in the dodge's invincible moment), not to the shooter's wind-up; enemies react to shots in flight, never to the wind-up. **Corner blink:** a successful back-step dodge while pinned in a corner teleports the dodger behind the attacker (hero or enemy), and they swap sides. The Warrior's shield block never blinks; it shoves the attacker back instead. Enemy health and damage grow with the stat points a hero trains by that level, so a same-level fight stays a fight. Damage multipliers are tuned so every class wins about 75% of autopilot fights at its own level, with an autopilot that dodges and swings readily (`EXPEDITION_SKILL` 0.6, close to a person playing). Enemy health ×1.3 and damage ×1.76 (`ENEMY_SCALE`): a same-level enemy takes about 11–14 melee hits (goblin ~6, ogre ~18), more for the safer ranged classes (**`npm run balance`** prints the table; the class balance test keeps them in a band). Ability names are still labels only.

**The class is locked once chosen.** Changing class starts a new hero, after a confirmation:

- stats reset to the new class's base;
- quest history clears (and class level, since it comes from stats);
- the story starts over: chapter scenes show again as their areas open;
- gold, unlocked areas, replays and any expedition out are lost (a full reset).

There is no free stat swap between classes.

## 4. Class level

Each level costs 4 more trained points than the last (doubled 2026-11-12 so daily quests alone can't level the hero; expeditions are meant to carry part of it). Trained points to reach level L = 2(L − 1)(L + 4).

| Level | Points to next | Total trained |
| ----: | -------------: | ------------: |
|     1 |             12 |             0 |
|     2 |             16 |            12 |
|     3 |             20 |            28 |
|     5 |             28 |            72 |
|    10 |             48 |           252 |
|    20 |             88 |           912 |

A player doing 6–8 quests a day at about 3 points earns 18–24 points, so early levels come within a day or two: working out a lot feels rewarding at once. From level 6 a level costs 32+ points, so even a full day of quests no longer covers one, and expeditions carry more of the climb.

Region levels (`rpg/world.ts`, placeholders):

| Region            | Level | Gold to unlock |
| ----------------- | ----: | -------------: |
| Whispering Forest |     1 |              0 |
| Fallen Kingdom    |     5 |          2,350 |
| Ashen Wastes      |    10 |          5,000 |

## 6. Camp design (planned)

### 6.1 The loop

```text
Map: pick a camp site ──▶ Camp
                           │
           YOUR CALL ──────┤  plan: Cautious / Balanced / Aggressive (+ optional warm-up)
                           ▼
                 Expedition runs (up to 8h, offline)
                           │  checkpoints may wait for a decision
                           ▼
            Results: battles, gold ──CLAIM GOLD (once)
                           │
           REPLAY ─────────┘  watch it, or play it through for a bonus
```

### 6.2 What Camp shows

Camp shows one main card, depending on the expedition state:

| State                                                      | Main card                                              | Buttons                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| No camp yet                                                | "Set up camp": choose a site on the Map                | GO TO MAP                                                     |
| Camp set, nothing running (incl. the **first expedition**) | "Plan tonight's expedition"                            | **YOUR CALL** (start)                                         |
| Running                                                    | Time left, battles so far, a pending checkpoint if any | YOUR CALL (answer the checkpoint) · REPLAY (past nights only) |
| Finished, gold not claimed                                 | Overnight results scoreboard                           | **CLAIM GOLD** · REPLAY · YOUR CALL (plan the next one)       |

### 6.3 YOUR CALL: the expedition planner

You choose how the hero approaches the area, relative to your class level. Each camp site has a level band, and the enemy level is clamped to it.

| Choice         | Enemy level    | Risk                   | Rewards                             |
| -------------- | -------------- | ---------------------- | ----------------------------------- |
| **CAUTIOUS**   | your level − 2 | Safe; few retreats     | Less gold                           |
| **BALANCED**   | your level     | Even fights            | Normal gold                         |
| **AGGRESSIVE** | your level + 2 | Hero may retreat early | More gold, rarer finds, boss chance |

- **Warm-up (optional, §6.5):** before starting, YOUR CALL offers one quick set.
- Then **START EXPEDITION**. It runs on the server-style deterministic simulation (roadmap §3.3–3.4): the same inputs always give the same events.
- While an expedition is running, YOUR CALL is where the **checkpoint** is answered: "A Brute blocks the path".
  - **TAKE CONTROL**: fight the Brute yourself (the Fight screen). Win: +25% gold and better odds for the rest of the night. Lose: the hero presses on, hurt (−10% gold, worse odds). The night carries on either way.
  - **WATCH IT PLAY OUT**: don't take control; the hero fights the Brute alone on autopilot. First a one-set boost (a class exercise other than the warm-up, `checkpointBoostExercise`) adds +30% to the hero's odds; it can be skipped. Odds start even at the same level, ±8% per level of gap (15–90%), decided once per expedition (`checkpointWatchWins`). A watched win pays less than taking control: +10% gold for the night (vs +25%), a smaller odds bump; a watched loss costs the same as losing it yourself (`watch-won` / `watch-lost`).
  - **RETURN TO CAMP**: run away; the night ends now with the gold so far.
  - No answer: the hero handles it alone (Guard, or Heavy Strike on Aggressive).

### 6.4 REPLAY: the expedition log

A list of past expeditions, newest first (last night at the top). Each entry offers two modes:

| Mode      | What it is                                                                                                                                                          | Rewards                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **WATCH** | The night's key battles (the first, the checkpoint Brute, the last) replayed as fights with the hero on autopilot, each ending as it really did; pause, 2× and skip | None. Read-only, never changes the original results     |
| **PLAY**  | Fight those key battles yourself, in a row                                                                                                                          | A one-time **gold bonus** per expedition (win them all) |

The original night's results and gold are never rewritten. Play-through is a separate challenge with its own once-only reward.

### 6.5 Bonus workout: warm-up before departure (decided)

YOUR CALL offers one optional quick set (1 set of the class's warm-up movement) before the expedition starts.

- **Expedition buff, that run only:** +15% loot and +5% win chance in every fight.
- **No stat points:** the warm-up never raises stats or class level, so it can't be farmed for levels.
- **Skipping:** the warm-up never blocks starting, and skipping it costs nothing.

Power moves and push-through checkpoints were considered and set aside for now.

## 7. Map design (planned)

Built like Shadow Sprinter's overworld, reusing its approach and art pipeline: LPC tiles and sprite sheets, the tilemap, joystick and camera code. Every reused asset is listed in `ASSETS.md`.

- **Structure:**
  - tile maps (a terrain grid, one character per tile);
  - joystick movement with a camera that follows the hero;
  - doors and paths between maps;
  - each chapter is a set of maps.
- **Camp sites:** campfires placed on the map. Walking up to one shows a panel with:
  - chapter and site name;
  - **level band** (e.g. Whispering Forest: levels 1–4);
  - **enemies to expect**, boss included;
  - a **SET CAMP HERE** button, which saves the site and goes to Camp (§6).
- **Locked areas:** gates or bridges with a gold price. Unlocking one opens the new area and shows its chapter card.
- **Past scenes:** chapter cards, and later the spots where past expeditions happened, can be revisited.
- **Wild encounters** (`rpg/encounters.ts`), like tall grass: walking on grass, each tile may bring out one of the nearest camp site's enemies (lower half of its level band). Never on dirt roads, near campfires or the gate, or within 10 tiles of the last one. The hero stops and chooses:
  - **FIGHT**: a hand-played fight. A win pays one battle's gold, **3 paid wins a day**; after that fights are practice. Losing costs nothing.
  - **TRAIN**: skip the fight with one quick set of a class exercise for **+1** to its stat, **3 a day**.
  - **RUN**: carry on.
    The daily caps stop walking in circles from farming gold or stats; a day of encounter gold is at most about a quarter of a night's expedition gold.
- **Enemies to find** (`src/overworld/spots.ts`): 6 enemies stand at spots on each map, new spots every day, shown as **red dots** on the mini-map and full map and with a red marker in the world. Walking up to one starts its encounter (same choices and daily caps); they're tougher, from the top half of the area's level band. FIGHT or TRAIN clears one for the day; after RUN AWAY it waits until the hero walks off. A tip on entering each area (and on its loading screen) says grass encounters can happen.

**Data:**

- `CampSite { id, regionId, name, levelBand: [min, max], enemies[], position }`
- maps follow Shadow Sprinter's `MapDef` (terrain, objects, doors, spawn).

### Build order

1. **Expedition screens, interactive, placeholder results:**
   - the Camp states (§6.2);
   - YOUR CALL: Cautious / Balanced / Aggressive, plus the warm-up;
   - running and finished states, CLAIM GOLD;
   - the REPLAY log, with WATCH and PLAY THROUGH entry points.
     Results come from a simple seeded placeholder, not real fights.
2. **Map overworld (done):** the Map tab opens an **area select** (`src/screens/MapScreen.tsx`): each region's level, camp sites and status. Picking an open area opens its **overworld** (`OverworldScreen`), 120 × 108 tiles, built from a spec in `src/overworld/maps/` (forest, kingdom, wastes). On it: camp sites with level and enemy previews, SET CAMP HERE, gates to the next region, a mini-map. The overworld and combat can be portrait or landscape (Settings); every other screen is portrait.
3. **Connect them (done):** the camp site picked on the Map drives Camp's expeditions (`useCamp.setSite`; refused while an expedition runs).
4. **Real expedition simulation (done):** `expeditionResult` fights every battle of the night with the fight engine, using the hero's stats and class as they set out (snapshotted on the expedition), on autopilot at `EXPEDITION_SKILL`: sharper after a warm-up or a checkpoint win, worse after a loss. Each battle's seed and skill are recorded, so WATCH replays the exact fight. Saves from before this settle with the old estimate.
5. **Gold unlocks (done):** buy regions in order (the Fallen Kingdom costs 1.5× the expedition gold earned reaching level 5: `rpg/economy.ts`) on the area select or at their gate (`useCamp.buyRegion`, once each). Buying shows the region's chapter card.

## 8. Changes from the roadmap

| Roadmap                                                                | Now                                                                                                                               |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| §1.2 loop: onboarding → choose class → quests                          | PLAY → class → Hero → Map; returning players go to Camp                                                                           |
| D19: class change is free and keeps stats; T30                         | Class is locked; changing it is a full hero reset                                                                                 |
| §3.1: every hero earns the same stats from the same start              | Same total (20), class-specific spread                                                                                            |
| §3.1: daily stat-award budget of 12 points (T04)                       | No stat cap. 3 quests at midnight, then batches of 2–3 every 2–4h, plus up to 2 ad quests                                         |
| §3.1: level bracket undefined                                          | Rising-cost class level from trained points; gates expedition levels                                                              |
| Expedition setup screen starts expeditions                             | Expeditions start from Camp; Map is the open world                                                                                |
| Replay is read-only; never a second reward source (§3.5, rule 2)       | WATCH stays read-only; PLAY THROUGH is a separate once-per-expedition challenge with its own bonus. Original results never change |
| Stats only from daily quests                                           | Still true: the warm-up is an expedition-only buff, never stats (§6.5)                                                            |
| Expedition strategy: Aggressive / Balanced / Cautious (fighting style) | The same three words now set difficulty relative to class level: Aggressive = level + 2, Balanced = level, Cautious = level − 2   |

## Leaving screens

No swipe-back on iOS (`gestureEnabled: false`). Android's back button does what the screen's own back button does (`src/navigation/useBack.ts`): nothing on the home tabs (Camp, Quests, Hero, Map) and setup screens; PAUSE in combat; LEAVE AREA in the overworld (or closes an open encounter card / full map first); go back everywhere else. Every header has a **Home** button (next to Settings) that returns to the title screen, except on the title screen itself, class select and Settings.

**DEV: SPAR** (dev builds, Camp): pick the enemy's level (yours −1, yours, or +2) and a class to fight as. Your own class uses your real stats; another class uses a typical hero of that class at your level (`profileAt`).
