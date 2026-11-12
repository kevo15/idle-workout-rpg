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
| Choose Class | Warrior or Archer (others "coming soon"). Each class shows its base stat spread.                                  | Built  |
| Hero         | Lands here after picking a class: stats, class level, Change Class. A first-run card sends the player to the Map. | Built  |
| Map          | Opens with the Chapter 1 story card for the starting region.                                                      | Built  |

Returning players: **PLAY → Camp**.

## 2. The four tabs

### Camp: where the game is played

Camp is where expeditions are planned, followed and replayed. It has two separate entry points, and they never open the same menu:

| Button        | Opens              | Purpose                                                |
| ------------- | ------------------ | ------------------------------------------------------ |
| **YOUR CALL** | Expedition planner | Decide how the **next** expedition runs, then start it |
| **REPLAY**    | Expedition log     | Look back at **past** expeditions                      |

**Status:** Screens built and interactive, but expedition **results are placeholders** (seeded numbers, no real fights yet): Camp states, YOUR CALL planner, warm-up, checkpoint decision, CLAIM GOLD, REPLAY log with WATCH and PLAY THROUGH. Dev builds have "to checkpoint" and "to morning" skips. Full design in §6.

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

**The class is locked once chosen.** Changing class starts a new hero, after a confirmation:

- stats reset to the new class's base;
- quest history and mastery clear;
- story chapters already seen stay seen.

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
| Fallen Kingdom    |     5 |          1,500 |
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
- While an expedition is running, YOUR CALL is where pending **checkpoint decisions** are answered (e.g. "A Brute blocks the path": Heavy Strike / Guard / Retreat).

### 6.4 REPLAY: the expedition log

A list of past expeditions, newest first (last night at the top). Each entry offers two modes:

| Mode             | What it is                                                                                  | Rewards                                             |
| ---------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **WATCH**        | Plays the recorded events back, with pause, 2× and skip                                     | None. Read-only, never changes the original results |
| **PLAY THROUGH** | Re-run the expedition yourself: you make the calls, and the original result stays as it was | A one-time **gold bonus** per expedition            |

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
2. **Map overworld:** roam, camp sites with level and enemy previews, SET CAMP HERE.
3. **Connect them:** the camp site picked on the Map drives Camp's expeditions.
4. **Real expedition simulation** (`rpg/expedition.ts` events, checkpoints, gold), then WATCH playback and PLAY THROUGH with its once-only bonus.
5. Gold unlocks for new areas.

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
