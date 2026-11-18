# Project Roadmap: Workout-Powered Idle RPG — Hybrid Expeditions

> **Status:** Planning / pre-production · **Version:** 0.2 · **Updated:** 2026-11-10  
> **Working title:** *Rep Raiders* (chosen 2026-11-10; not final until store / trademark checks). Brand colors: red, white and gold.  
> **Source:** Game concept and design decisions discussed in this project, with the user's attached `roadmap.md` used as a **structural template**, not as a source of game requirements. v0.2 merges the class system from `workout_rpg_class_system_design.docx` (classes, class-weighted quests, stat interpretation, guild trials, class mastery, summons).  
> **Team assumption:** Solo developer at launch. Workstream letters **A–D** represent responsibilities, not four required hires.  
> **Legend:** **MVP** = required for initial playable release; **Post-MVP** = deferred; **TBD** = explicit decision still open. Estimates, prices, stat formulas, and success targets are proposed starting assumptions, not validated facts.

---

## 1. The project in one paragraph

Build a mobile **idle RPG powered by real-life, equipment-free exercise**. Players choose a fantasy **class** (Warrior, Archer, Mage, Summoner, Rogue) that shapes both their training theme and their fighting style. Users receive personalized daily workout quests they can complete at home: class-themed training plus balanced cross-class missions. Completed quests grant **character stats** (Strength, Endurance, Agility, Vitality); stats influence simulated RPG combat, but **cannot be purchased with in-game money**. While users are away—especially overnight—their hero automatically explores regions, fights enemies, earns **gold** and discovers content. Players can review **animated battle replays** or participate in **unresolved, interactive encounters** by selecting routes, activating tactical abilities, or choosing risk/reward strategies. Currency unlocks new locations, enemies, story content, cosmetic items, and other **non-stat progression**. The objective is a game players enjoy playing, not just an exercise log with badges.

### 1.1 Product pillars and non-goals

| Pillar | Binding product rule | Validation question |
|---|---|---|
| Real exercise powers combat | Only completed real-world workout quests improve base combat stats | Can a player gain base STR/END/AGI/VIT without training? **No.** |
| Idle progress respects time away | Offline expeditions resolve consistently without the app open | Does returning after the night produce sensible results? |
| Agency without mandatory attendance | Every pivotal interactive event has a default offline policy | Can a busy player progress without checking in hourly? |
| Currency unlocks breadth, not strength | Gold unlocks locations, story, cosmetics, encounters; no paid stat boosts | Does currency ever increase damage/health directly? **No.** |
| Replay is a window into real results | Replay visuals reconstruct authoritative logged events | Can replay or scrub accidentally produce extra loot? **No.** |
| Exercise is sustainable and accessible | Onboarding, substitutions, recovery, intensity limits | Can users progress safely on a rest/recovery day? |
| Genuine game depth | Maps, enemy mechanics, decisions, challenges, discoveries | Is there meaningful play after completing today's exercises? |
| Class fantasy changes training and fighting | Class sets quest *preferences* and combat style; all classes earn the same four stats | Can any player pick any class regardless of fitness level? **Yes.** |
| One engine for every class | Classes are data (abilities, AI policy, stat weights), not separate engines | Do all classes run through the same deterministic simulator? **Yes.** |

**Non-goals for MVP:** full action-platformer controls, PvP, social guilds (the solo *weekly guild trials* in §3.11 are not a social feature), AI-generated quests, camera exercise verification, an open world, dozens of classes, procedural 3D worlds, real-money stat sales, and medical/diagnostic coaching.

### 1.2 Daily player loop

```text
FIRST RUN: Onboarding + movement preferences → choose class (changeable later)
    ↓
MORNING: Claim last expedition rewards → view replay / highlights → choose path
    ↓
DAY: Receive class-themed quests + cross-class missions → exercise → verify → earn stats
    ↓
PREPARE: Choose region, approach (Aggressive/Balanced/Cautious), class abilities / summon
    ↓
EVENING / OFFLINE: Server-authoritative expedition simulation
    ↓
EVENT: Auto-resolve with saved strategy OR offer an optional pending special encounter
    ↓
RETURN: Replay already-resolved fights + interact with unresolved decisions
    ↺ Repeat; unlock worlds and gameplay options with earned currency
```

---

## 2. Workstreams and ownership

The attached example roadmap organizes work by owner; this plan preserves that format while allowing one person to work through tracks sequentially.

| Track | Workstream | Core deliverables | Test suite owned | Demo responsibility |
|---|---|---|---|---|
| **A** | **Mobile UX & Fitness** | Onboarding, class selection, accessibility, tagged exercise catalog, class-weighted quest planner, guild trials, workout completion, character sheet, notifications | Workout selection, cap/recovery, navigation and accessibility | Complete quests and show stats change |
| **B** | **Combat & Expeditions** | Pure deterministic combat engine, class ability sets + AI policies, status effects, summon actor, enemies, encounters, auto-strategy, persistent expedition event log, offline reconciliation | Determinism, combat balance, replay correctness | Offline battle → return → replay |
| **C** | **Backend & Economy** | Auth, persistence, rewards, gold transactions, content unlocks, idempotency, anti-abuse, cloud deployment | Authorization, concurrency, economy invariants | Claim rewards and unlock area once |
| **D** | **Game Content & Quality** | Pixel-art visual layer, per-class animation sets, spell/arrow/summon VFX, maps, decisions, boss content, sound, testing/telemetry, releases | End-to-end flows, performance, content QA | Choose a path and change upcoming encounter |

**Shared responsibilities:** define API/data contracts early; maintain architecture decisions in `docs/design.md`; review game balance, security, accessibility and privacy; record test results in `docs/results/`; keep launch scope controlled.

### 2.1 Logical system architecture

```text
┌───────────────────────────────────────────────────────────────┐
│ Expo / React Native mobile app                               │
│ Home · Quests · Training · Hero · Map · Expedition · Replay    │
│ React UI + 2D renderer (Phaser/WebView SPIKE; alternate TBD)  │
└────────────────────────┬──────────────────────────────────────┘
                         │ HTTPS (authenticated)
┌────────────────────────▼──────────────────────────────────────┐
│ Node.js / TypeScript backend                                 │
│ Auth context · QuestService · StatsService · EconomyService   │
│ ExpeditionService · CheckpointService · ContentService        │
└──────────────┬───────────────────────┬────────────────────────┘
               │                       │
┌──────────────▼─────────────┐  ┌──────▼────────────────────────┐
│ PostgreSQL                │  │ Stateless simulation engine  │
│ users / quests / training │  │ Seeded RNG + content version │
│ hero_stats / expeditions  │  │ Combat events + checkpoints  │
│ battle_events / rewards   │  │ Pure functions, no UI         │
│ wallets / ledger / unlocks│  └──────┬────────────────────────┘
└────────────────────────────┘         │
                          ┌───────────▼────────────────────────┐
                          │ Simulation trigger                 │
                          │ Lazy on return for MVP, worker     │
                          │ queue / scheduled jobs later       │
                          └────────────────────────────────────┘

External (as needed): auth provider, push notification service, analytics,
crash reporting, cloud hosting. Never trust client-reported rewards/stat totals.
```

### 2.2 Shared boundaries

| Boundary | Contract needed | Owner |
|---|---|---|
| Quest completion → Stats | Validated quest ID, awarded stats, cap consumption, idempotency key | A + C |
| Saved hero → Simulation | Immutable stat snapshot + skills + region + strategy + seed + engine version | B + C |
| Simulation → Replay renderer | Versioned event sequence with stable ordering and timestamps | B + D |
| Checkpoint → Player decision | Which checkpoint is actionable, deadline/default, legal options, state version | B + D + C |
| Reward → Wallet | Claim ID, currency amount, ledger entry, once-only atomic settlement | B + C |
| Gold → Unlock | Cost, prerequisites, entitlement, atomic spend | C + D |

---

## 3. Core game systems and contracts

### 3.1 Character attributes (MVP)

| Attribute | Example associated exercises | Combat contribution |
|---|---|---|
| **STR — Strength** | Squats, supported push-ups, wall push-ups | Melee / physical damage, heavy attacks, stagger checks |
| **END — Endurance** | Marching in place, low-impact cardio | Ability resource, combat stamina, spell / summon uptime |
| **AGI — Agility** | Side steps, mobility sequences | Accuracy, evasion, attack timing / turn frequency, subject to caps |
| **VIT — Vitality** | Core stability, modified planks | Maximum HP, mitigation, status resistance |

**Design invariant:** exercises are associated with stat rewards for *game design*, not as an assertion that particular exercises uniquely train a single physiological system. Provide accessible alternatives of comparable effort.

**Class invariant:** every class earns the same four attributes into one account-level pool. Classes change how those attributes are *interpreted* in combat (§3.9), never how many points an exercise awards. No class-exclusive exercises and no class reward multipliers.

**Proposed progression model (TBD by playtesting):**
- `masteryStat` persists across days and increases via verified quest awards.
- `readiness` is a bounded bonus from recent appropriate activity, not a punishment for rest. Recovery quests may maintain readiness.
- `effectiveStat = boundedScale(masteryStat, levelBracket) + readinessBonus`.
- Never equate unlimited repetitions to unlimited stat awards: daily caps, diminishing returns, and difficulty normalization apply.
- Define a soft cap and content difficulty tiers to avoid runaway numeric inflation; no stat decay that erases previously earned mastery.

**Starter balancing assumptions — NOT final:**

| Parameter | Proposed first-pass value | Purpose |
|---|---:|---|
| Quest count per day | 3 standard quests | Low-friction onboarding |
| Optional quest variants | 1–2 swaps per quest | Adaptability |
| Daily stat-award budget | 12 points total | Prevent farming / overexertion incentive |
| Standard quest award | 2–4 stat points | Visible feedback |
| Expedition duration limit | 8 hours | Fair idle progress |
| Strategy options | 3 | Meaningful non-mandatory decision |
| Launch character classes | 2 playable (Warrior + Archer); Mage, Rogue, Summoner in Phase 3 | Validate the shared simulator on two distinct styles first |
| Class / world quest mix | ~60% class-weighted, ~40% balanced, over a planning window (not per day) | Class identity without movement monotony |
| Active summons | 1 companion (Summoner only) | Contain scope |

### 3.2 Fitness quests and safety (MVP)

**Exercise catalog minimum fields:** `exerciseId`, name, instructions, demonstration asset, targeted reward stat, intensity tier, sets/reps/duration, movement pattern, muscle groups, joint impact, equipment (none), progression/regression links, accessibility alternatives, cautions, contraindication flags for self-selection, estimated duration, cooldown, **class affinity tags**, active/archived status. Target catalog: 30–40 beginner-friendly movements with substitutions.

**Personalization inputs:** beginner/intermediate/advanced (self-selected), available time, preferences, accessible movement options, disliked exercises, recent completed quests, rest-day choice. Do **not** ask for or require a diagnosis.

**Quest generation:**
1. Exclude movements user has opted out of and ones incompatible with chosen accessibility settings.
2. Balance movement categories and avoid unnecessary repeated high-load patterns on consecutive days.
3. Enforce weekly movement coverage, recovery and the player's goals **first**; only then apply class preference weighting (§3.10).
4. Match time/intensity goals and select from a curated catalog, with a deterministic quest-generation seed.
5. Label each quest `CLASS` or `WORLD`; structure the session as warm-up → short primary block → optional cooldown.
6. Attach appropriate easier alternatives with equivalent in-game reward potential.
7. Cap awards and avoid penalizing skipped workouts; allow rest/recovery paths.

**Completion model:** self-attestation in MVP, optional guided timer; no mandatory camera, biometric, or health platform integration. Clear safety message: exercises are general fitness content, not medical treatment; users may stop, skip or substitute. Avoid encouraging pain, unsafe exertion or streak guilt.

### 3.3 Idle combat and enemies (MVP)

**Combat components:** health, stamina, initiative, dodge chance, armor/resistance, attack, special ability, enemy traits, status effects (small initial set), retreat logic, victory/defeat, loot table. Enforce min/max bounds and deterministic ordering.

**Enemy archetypes:** Slime (intro), Forest Wolf (speed), Goblin (balanced), Brute (high HP), Wisp (evasion), Forest Guardian (boss); a second boss may be introduced after core combat is stable.

**Proposed engine API (TypeScript interface sketch):**

```ts
interface ExpeditionInput {
  expeditionId: string;
  heroSnapshot: HeroStatsSnapshot;
  regionId: string;
  strategy: 'AGGRESSIVE' | 'BALANCED' | 'CAUTIOUS';
  seed: string;
  contentVersion: string;
  engineVersion: string;
  elapsedSeconds: number;
}

interface ExpeditionResult {
  events: BattleEvent[];
  checkpoint?: DecisionCheckpoint;
  unclaimedRewards: RewardBundle;
  state: 'RUNNING' | 'WAITING_DECISION' | 'COMPLETED' | 'FAILED';
}
```

**Determinism rule:** Same snapshot + seed + decision sequence + elapsed time + content/engine versions must produce exactly the same event outcomes. Never resimulate with newly earned stats halfway through an existing expedition.

### 3.4 Offline expedition rules (MVP)

- **Start:** server snapshots stats, ability loadout, strategy, chosen region, engine/content version, seed and start timestamp.
- **While away:** no requirement to keep an always-running game process. MVP computes an authoritative time-bounded simulation when the client requests status, using server timestamps.
- **Progress:** capped at defined duration; server computes legal number of encounters; lower performance or defeat changes survival and loot, not base stats.
- **Return:** backend commits generated events and rewards atomically; repeated fetches return the same result.
- **Later scaling:** scheduled background workers may materialize expeditions; use a single, shared authoritative simulation routine so lazy/worker paths agree.
- **No negative incentive for remaining logged in:** active viewing must not slow or halt idle progress; only optional special encounters can wait for manual input.

### 3.5 Replay vs intervention: critical separation (MVP)

**Replay of resolved events (read-only):** animated reconstruction of stored, already-settled combat; pause, speed-up, skip, event timeline, boss highlights. Rewinding must never change gold, health history, or rewards.

**Interactive unresolved encounter (state-changing):** player selects among a *defined set* of options (route, retreat, guarded approach, tactical ability) before that event resolves. Decision is saved, then the backend simulates the next segment exactly once.

**Offline default:** if user is absent, normal checkpoint decisions auto-resolve via saved expedition strategy. Optional story/boss encounters may remain `WAITING_DECISION` without blocking the general idle-reward track; avoid forcing users to log in at specific hours.

**No retroactive changes to completed events.** A “branch preview” may show hypothetical outcomes, but cannot replace settled results or award loot.

### 3.6 Decision types and tactical abilities (MVP)

| Type | Example | Impact | Offline behavior |
|---|---|---|---|
| Route | Cave vs Ruins | Encounter pool, risk, discoverables | Strategy preference picks |
| Risk | Continue vs Retreat | Risk/loot versus preservation | HP threshold policy |
| Objective | Treasure vs Enemy | Gold, discovery, story content | Configured preference |
| Ability | Shield Bash / Evasive Roll | Interrupt or dodge in unresolved fight | AI loadout policy |
| Class tactic | Warrior guard/counter · Archer focus target / special arrow · Mage element + timing · Summoner command · Rogue dodge/combo/disengage | Class-specific options at an unresolved fight | Class default AI policy (§3.9) |

**Balancing constraint:** tactical abilities can create varied outcomes but must not become a currency-purchased substitute for exercise-derived stat growth. Abilities may be unlocked as *sidegrades* with cooldowns and tradeoffs. No pay-to-win energy system.

### 3.7 Currencies, unlocks, inventory (MVP)

| Item | Earned by | Spent on | Must NOT do |
|---|---|---|---|
| **Gold** | Completed expedition encounters | Regions, cosmetics, camp decor, story content | Buy base STR/END/AGI/VIT or stronger gear |
| **Discovery tokens** (Post-MVP unless needed) | Exploration and milestone bosses | Special encounters/modes | Directly raise hero attack |
| **Titles / achievements** | Quest milestones, bosses, exploration, guild trials | Showcase identity | Confer combat boosts |
| **Class mastery** (Phase 3+) | Using a class and its themed milestones | Alternate tactics (sidegrades), animations, class cosmetics | Inflate raw stats |
| **Summon essence** (Phase 3+) | Expedition discoveries | Companion variants and tactical commands | Level companions into an alternate power source |

**Early content:** Whispering Forest is free; Fallen Kingdom and Ashen Wastes are proposed future regions. Example prices `1,500` and `5,000` gold are **placeholders** until progression pacing is tested.

**Economy invariant:** reward claims are idempotent; a wallet is derived from auditable ledger entries; unlock purchases are transactional; balances never become negative. Entitlements are permanent unless a content license/legal issue requires a documented migration.

### 3.8 World progression and content (MVP)

**Launch:** one forest region, six enemy types including boss, a map with route branches, three decision archetypes, cosmetic unlocks and a compact quest/tutorial storyline. The goal is depth and replayability within one region before more worlds.

**Progression:** visible goals, boss milestones, new areas to discover, enemy variants, cosmetic collections, region story beats, meaningful choice consequences, and long-term character mastery. Separate combat difficulty from gold price (gold buys access; stats determine survival).

**Post-MVP:** additional regions, enemy families, abilities, rotating weekly modifiers, challenge bosses, seasonal visual rewards, classes beyond the five, player-shared cosmetic showcases, and potentially direct-control special dungeons.

### 3.9 Character classes

Five classes share one deterministic simulator. A class is configuration: `CharacterClass { id, name, workoutPreferences[], combatStyle, statWeights, abilities[], aiPolicy }`. Keep workout planning independent from class config: the class supplies preferences and attack style; the planner enforces balance and accessibility.

| Class | Workout emphasis (themed examples) | Combat identity | Default auto-battle | Player intervention | Ships |
|---|---|---|---|---|---|
| **Warrior** | Incline push-ups, supported dips where suitable, planks, squats | Melee, blocking, durable front line | Approach, attack, block | Guard, counter, heavy strike | MVP |
| **Archer** | Side steps, low-impact jumping-jack alternatives, arm circles, mountain climbers where suitable | Ranged shots, tempo, positioning | Keep distance, prioritize targets | Focus target, special arrow, evade | MVP |
| **Mage** | Squats, lunges, dead bugs / sit-up alternatives, glute bridges | Elemental spells, area and status effects | Cast elemental attacks / statuses | Choose element and spell timing / area | Phase 3 |
| **Summoner** | Bird dogs, wall sits, step-ups, planks | One elemental companion, tactical commands | Deploy companion; basic attacks | Deploy, direct, recall | Phase 3 |
| **Rogue** | Lateral / reverse lunges, knee raises, controlled skater steps | Evasion, rapid strikes, burst windows | Fast strikes and evasions | Dodge, combo, disengage | Phase 3 |

**Provisional stat interpretation weights (design priorities, not formulas or multipliers):**

| Class | STR | AGI | END | VIT |
|---|---:|---:|---:|---:|
| Warrior | 45% | 10% | 15% | 30% |
| Archer | 20% | 45% | 25% | 10% |
| Mage | 10% | 15% | 50% | 25% |
| Summoner | 15% | 15% | 45% | 25% |
| Rogue | 25% | 45% | 20% | 10% |

**Rules:** exercise-class matching is a game theme, not a physiological rule; anyone can pick any class. Class changes are free/low-friction and preserve account-level stats and fitness history. Do not make an unfinished class selectable in a public build — show it as "coming soon" instead. Mage and Summoner stay separate (spells vs companion); merge only if scope becomes unmanageable.

**Summoner scope constraint:** one active elemental companion with a simple duration or cooldown. Defer boss summons, multi-summon formations, dual elements and complex energy drain.

### 3.10 Class-weighted quest planning

Two complementary tracks feed the same daily board and the same stat ledger:

| Track | Purpose | Example | Rewards |
|---|---|---|---|
| **Class Training** | Express class identity through thematic exercises | Warrior push-up / plank quests; Mage lower-body / core quests | Universal attributes |
| **World / Cross-Class Missions** | Full-body coverage, varied patterns, fresh content | Ranger agility trial for a Warrior; Warrior strength trial for a Mage | Universal attributes + optional cosmetic / access unlocks |

Starting hypothesis: ~60% class / ~40% world across a planning window, **after** weekly coverage, recovery, accessibility and stated goals are satisfied. Alternatives earn comparable progress for comparable effort. Personalized weekly planning, not fixed daily muscle-group repetition.

### 3.11 Weekly guild trials (Phase 4)

Solo cross-class trials that introduce other movement styles without switching class (e.g. for a Warrior: Warrior strength trial, Ranger agility trial, Mage core / lower-body trial, Summoner stability trial). Exercise gives normal capped attributes; trial prizes are non-stat only (Guild Explorer title, regional discovery, cosmetic).

### 3.12 Spell, projectile and summon presentation

Spells, arrows and summons are rendered **from battle events only** (`CAST_START`, `PROJECTILE`, `IMPACT`, `STATUS_APPLIED`, `STATUS_TICK`, `SUMMON_DEPLOY`, `SUMMON_RECALL`). Any visual randomness (particles, bolt shape) is seeded from `expeditionId + sequence` so a replay looks identical every time. Effects are drawn in the pixel-art style of the sprites (low-res, pixel-snapped, limited palette, stepped frame rate) and respect reduced-motion settings (no screen flash or shake).

---

## 4. Fixed constraints and launch guardrails

| Area | Constraint |
|---|---|
| Platform | Android-first or simultaneous iOS/Android **TBD**; Expo/React Native preferred |
| Gameplay | Equipment-free home exercise → combat stats; offline combat → non-stat rewards |
| Live involvement | Watch replays and influence **future unresolved** checkpoints, not overwrite history |
| Server authority | Server determines rewards, gold, state transitions and legal decisions |
| Auth/data isolation | Every query/mutation scoped to authenticated `user_id` |
| Exercise safety | Accessible alternatives, rest/recovery support, no medically prescriptive claims |
| Offline fairness | Defined expedition cap, deterministic settlement, no requirement for perpetual connection |
| Monetization | No purchasable stat advantage; rewarded ads optional and not required for core progression |
| Privacy | Data minimization, secure deletion/export process, clear retention and consent rules |
| QA | Automated unit/integration/e2e tests; performance checks on target devices |
| Content | Consistent ownership/licensing for sprites, art, SFX, music and exercise demos |

---

## 5. Early architecture and design decisions (log in `docs/design.md`)

| ID | Decision | Starting recommendation | Tradeoff / proof needed |
|---|---|---|---|
| D1 | Mobile framework | React Native + Expo + TypeScript | Fits existing development familiarity; test graphics integration |
| D2 | 2D rendering | Spike Phaser in WebView vs native renderer; Godot fallback | Measure animation smoothness, packaging, input latency |
| D3 | Backend framework | Node.js + TypeScript, modular service boundaries | Shared models, easy deterministic engine reuse |
| D4 | Database | PostgreSQL | Transactions, relational content, ledger correctness |
| D5 | Deployment | Cloud Run (or comparable container hosting) | Reuse known Docker workflow; measure idle costs |
| D6 | Authentication | Managed identity provider with short-lived tokens | Secure mobile sign-in, account deletion support |
| D7 | Offline simulation | Lazy, deterministic settlement on return | Avoid 24/7 workers for MVP; later worker option |
| D8 | Combat cadence | Event-based turn/tick simulation | Keep event counts bounded for replay storage |
| D9 | Replay | Persist events, render animation client-side | Storage versus fidelity; event schema versioning |
| D10 | Pending decisions | Only unresolved special events are interactive | Never mutate completed replay; optional events do not block rewards |
| D11 | Stats | Mastery + capped readiness; caps and substitutions | Long-term retention vs sustainable exercise habits |
| D12 | Exercise verification | Self-attested, plus optional guided timer | Simplicity/privacy vs possible cheating |
| D13 | Economy | Gold for access/cosmetics only | Make unlocks exciting without stat purchases |
| D14 | Analytics | Minimal event instrumentation, user consent where required | Balance evidence without invasive health tracking |
| D15 | Notifications | Opt-in daily quest/return reminders; no guilt language | Retention without pressure |
| D16 | Asset strategy | Original/licensed pixel art and audio | Avoid licensing problems |
| D17 | Launch scope | One region, one deep loop, two playable classes (Warrior + Archer) | Complete MVP over broad but shallow content |
| D18 | Class model | Data-driven `CharacterClass` configs over one shared engine; one account-level stat pool | Must prove two styles feel distinct without separate engines |
| D19 | Class changing | Free / low-friction; stats and history preserved | Identity commitment vs experimentation |
| D20 | Quest weighting | ~60/40 class/world over a window, after coverage + recovery checks | Week-long simulated plans per class must stay varied |
| D21 | Summon capacity | One active companion in first Summoner release | Depth vs scope |
| D22 | Spell / projectile VFX | Code-drawn pixel-snapped effects driven by events; LPC `spellcast` sheet for the caster pose | Must visually match 64px sprites; perf on low-end phones |

---

## 6. Repository structure and shared contracts

```text
workout-rpg/
├── apps/
│   └── mobile/
│       ├── app/                        # Expo Router screens
│       ├── components/                 # Shared UI
│       ├── features/
│       │   ├── onboarding/
│       │   ├── class-select/
│       │   ├── guild-trials/
│       │   ├── quests/
│       │   ├── workouts/
│       │   ├── hero/
│       │   ├── world-map/
│       │   ├── expeditions/
│       │   ├── combat-replay/
│       │   └── unlocks/
│       ├── game-renderer/              # Phaser bridge or equivalent
│       └── assets/
├── services/
│   └── api/
│       ├── src/modules/
│       │   ├── auth/
│       │   ├── exercises/
│       │   ├── classes/
│       │   ├── quests/
│       │   ├── stats/
│       │   ├── expeditions/
│       │   ├── decisions/
│       │   ├── economy/
│       │   └── content/
│       ├── src/db/
│       └── tests/
├── packages/
│   ├── contracts/                      # Shared schemas / enums / DTOs
│   ├── combat-engine/                  # Pure deterministic TS module
│   └── content/                        # Versioned quests, enemies, regions, class configs
├── infra/                              # Docker, deploy config, migrations
├── tests/                              # Cross-service/e2e/scenario fixtures
├── docs/
│   ├── design.md                       # Decisions D1–D22
│   ├── game-balance.md                 # Formulas, simulations, tuning
│   ├── content-bible.md                # Lore, enemy taxonomy, quests
│   ├── api.md                          # Endpoints + errors
│   ├── privacy-and-safety.md
│   ├── results/
│   └── screenshots/
├── .github/workflows/
├── .env.example
└── README.md
```

### 6.1 API contract sketch

| Operation | API shape (illustrative) | Key safeguard |
|---|---|---|
| Get today's quests | `GET /v1/quests/today` | One seeded daily set/user/date |
| Complete quest | `POST /v1/quests/:id/complete` | Eligibility, award cap, idempotency |
| Get hero | `GET /v1/hero` | Server-computed effective stats |
| Start expedition | `POST /v1/expeditions` | Validate region and open-expedition rule |
| Get expedition | `GET /v1/expeditions/:id` | Authoritative reconciliation + user scoping |
| Get events | `GET /v1/expeditions/:id/events` | Stable ordered event pagination |
| Choose checkpoint | `POST /v1/expeditions/:id/decisions` | Version/expected state, one-time resolution |
| Claim reward | `POST /v1/expeditions/:id/claim` | Transactional, claim once |
| Buy unlock | `POST /v1/unlocks/:id/purchase` | Atomic gold deduction + entitlement grant |

### 6.2 Data model (initial)

| Table | Core fields | Constraints |
|---|---|---|
| `users` | id, auth_subject, locale, timezone, active_class_id, created_at | Unique auth subject |
| `fitness_preferences` | user_id, tier, time_budget, exclusions, accessibility, rest_preferences | User-owned, privacy-minimal |
| `character_classes` | id, workout_preferences, combat_style, stat_weights, abilities, ai_policy, content_version | Versioned content |
| `exercises` | id, movement_pattern, intensity, impact, muscle_groups, class_affinity, instructions, substitutions | Versioned content |
| `daily_quests` | id, user_id, local_date, exercise_id, track (`CLASS`/`WORLD`), reward, status, seed | Prevent duplicate issuance |
| `class_mastery` | user_id, class_id, xp, unlocked_sidegrades | Never feeds base stats |
| `summon_collection` | user_id, companion_id, element, unlocked_abilities | Never feeds base stats |
| `guild_trials` | id, user_id, week, trial_class_id, status | One completion per trial per week |
| `quest_completions` | id, quest_id, user_id, awarded_points, completed_at, request_key | Unique quest and idempotency |
| `hero_stats` | user_id, STR, END, AGI, VIT, readiness, version | Server writes only |
| `regions` / `enemies` | id, content_version, config data | Immutable version references |
| `expeditions` | id, user_id, seed, snapshot, strategy, status, start/end, version | One authoritative state |
| `battle_events` | id, expedition_id, sequence, elapsed_ms, type, payload | Unique `(expedition_id, sequence)` |
| `decision_checkpoints` | id, expedition_id, options, state, deadline, chosen_option | Compare-and-swap transition |
| `wallet_ledger` | id, user_id, source_id, delta, type, created_at | Unique source per settlement |
| `unlock_entitlements` | user_id, unlock_id, acquired_at | Unique `(user_id, unlock_id)` |
| `content_migrations` | content_version, migration_id | Prevent duplicate migration |

**Recommended indexes:** daily quests `(user_id, local_date)`, expeditions `(user_id, started_at DESC)`, events `(expedition_id, sequence)`, ledger `(user_id, created_at DESC)`.

### 6.3 State machines

```text
Daily quest:     ASSIGNED → COMPLETED
                         ↘ SKIPPED / EXPIRED

Expedition:      CREATED → RUNNING → COMPLETED → REWARDS_CLAIMED
                              ↘ WAITING_DECISION → RUNNING
                              ↘ FAILED (simulation/system fault, not battle loss)

Decision:        OPEN → PLAYER_SELECTED → RESOLVED
                      ↘ AUTO_SELECTED → RESOLVED

Unlock:          LOCKED → AVAILABLE → PURCHASED
```

**Important:** losing a game battle is a normal simulation outcome, not the `FAILED` system state. Illegal state transitions must be rejected and logged. Use row locking/optimistic version checks to prevent double decisions, duplicate claims or concurrent wallet overspending.

---

## 7. Prep checklist (before coding)

### Product definition
- [ ] Pick project name, target audience, art direction and intended age rating.
- [ ] Decide Android-first versus dual-platform release.
- [ ] Write 1-page game design brief and user stories.
- [ ] Freeze exact MVP vs post-MVP feature list.
- [ ] Define intended minimum device specification and performance budget.
- [ ] Define workout safety language, substitutions and rest-day flow.
- [ ] Document initial monetization principles (if any).

### Development and access
- [ ] Initialize GitHub monorepo, branches, issues/milestones and `.gitignore`.
- [ ] Configure Expo app and TypeScript backend; check local Android/iOS development workflow.
- [ ] Add formatter/linter, typechecks, unit test runner, pre-commit hooks and CI.
- [ ] Create `.env.example`; secrets only in secret manager or local ignored env files.
- [ ] Provision dev PostgreSQL and separate dev/test environments.
- [ ] Create cloud budget alerts before provisioning production services.
- [ ] Create artwork/audio license inventory.
- [ ] Start architecture decision log (`docs/design.md`).

### Prototype spikes (highest technical uncertainty first)
- [ ] **A:** Show quest selection, completion and stat gain in a clickable Expo screen.
- [ ] **A:** Run a simulated week of quest plans for each class; check movement diversity and no class gets a monotonous plan.
- [ ] **B:** Produce identical combat event output twice from the same seed/snapshot.
- [ ] **B:** Warrior and Archer configs run through the same engine against the same three enemies.
- [ ] **C:** Atomically award gold only once under two concurrent requests.
- [ ] **D:** Render event timeline as 2D animated combat at target frame rate.
- [ ] **Integration:** Resume from a decision checkpoint and produce a new future branch without rewriting previous events.

---

## 8. Phased development roadmap

> **Scheduling model:** phased delivery with parallel-capable workstreams, but no assumption of a four-person team. Exit criteria matter more than calendar dates. Mark a phase complete only after its demo and tests pass.

### Phase 0 — Discovery, design and risk spikes

- [ ] Confirm product vision, player personas, core loop and MVP promise.
- [ ] Select mobile renderer after a small performance comparison.
- [ ] Prototype a 10-turn deterministic fight and event playback.
- [ ] Prototype quest assignment and substitution screen.
- [ ] Prove `start → elapsed offline time → same settled rewards on repeat`.
- [ ] Decide schema for snapshots, seeds, engine versions and battle events.
- [ ] Define exercise tags, `CharacterClass` metadata, basic attack timing and class stat mapping; one class config + mock daily quest run.
- [ ] Record decisions D1–D22 with alternatives and reasoning.
- **Exit:** one local vertical prototype proves workout → stat → combat → event replay; high-risk renderer decision documented.

### Phase 1 — Foundations, contracts and data

- [ ] Initialize monorepo, shared contracts, lint/test/CI and versioned game content.
- [ ] Build DB migrations, auth guard, user profile and preferences.
- [ ] Define exercise catalog and seed 30–40 curated beginner-friendly movements, tagged by pattern, impact and class affinity.
- [ ] Define class config schema and content for all five classes (only Warrior + Archer marked playable).
- [ ] Implement data models and fixtures for enemies, regions and quests.
- [ ] Implement idempotency keys, transaction patterns, structured errors and logging.
- [ ] Set up optional crash reporting and privacy-respecting analytics.
- **Exit:** authenticated player can view persistent profile/content; contract tests pass; duplicate write attempts fail safely.

### Phase 2 — Parallel feature tracks

#### Track A: Workout quests and character progression
- [ ] Onboarding: difficulty, time, exclusions, reminders and optional rest preference.
- [ ] Class selection screen (Warrior/Archer playable; others "coming soon") and free class change preserving stats.
- [ ] Daily seeded quest selection with exercise instructions and substitute options.
- [ ] Class-weighted planner: coverage/recovery checks first, then ~60/40 class/world weighting; `CLASS`/`WORLD` labels on the board.
- [ ] Completion flow with self-attestation and optional guided timer.
- [ ] Point award caps, anti-repetition balancing, mastery and readiness calculations.
- [ ] Character sheet with stat breakdown and today's training contribution.
- [ ] Recovery/rest quests and accessible low-impact alternatives.
- [ ] Offline-friendly draft UX; only server-validated completion may award stats.
- **Exit:** complete, skip and substitute quests; stats change once; no unsafe infinite-rep incentive.

#### Track B: Battle engine and offline expeditions
- [ ] Define combat entities, turn rules, status effects and enemy AI.
- [ ] Load class configs into the engine: stat interpretation weights, ability sets, default AI policy (Warrior melee/block, Archer range/target priority).
- [ ] Implement three expedition strategies and automatic route decisions.
- [ ] Start expedition with immutable snapshot/seed/version/time.
- [ ] Implement elapsed-time cap, deterministic fight generation and defeat handling.
- [ ] Persist ordered battle events and generate highlight markers.
- [ ] Return the same results on repeated reconciliation requests.
- [ ] Define waiting special-encounter checkpoints separately from normal auto-resolve flow.
- **Exit:** simulate a full night in tests, reproduce exact events, and never block passive rewards on login.

#### Track C: Backend, economy and persistence
- [ ] Create API endpoints with auth/user-scoped queries and schema validation.
- [ ] Implement gold wallet ledger, reward claim, unlock and entitlement checks.
- [ ] Protect stats, loot and gold from client edits.
- [ ] Guard duplicate quest completion, double claim, concurrent unlock purchase.
- [ ] Build content versioning and migration policy for live expeditions.
- [ ] Add database backups, retention plan, error alerts and rate limiting.
- **Exit:** repeat requests cannot farm rewards; balances remain valid; unauthorized users cannot read another user's state.

#### Track D: Replays, decisions, maps and audiovisual content
- [ ] Create battle stage and character/enemy animation states (per-class sets: Warrior slash, Archer shoot).
- [ ] Projectile renderer for arrows, built so spells reuse it later (§3.12).
- [ ] Consume authoritative `BattleEvent[]`: spawn, damage, dodge, ability, defeat, reward.
- [ ] Implement replay play/pause/skip/2×/4×, scrub and highlights.
- [ ] Render map, world unlocks, available expedition destinations and decisions.
- [ ] Implement unresolved special encounter choice with explicit confirmation and feedback.
- [ ] Add titles/cosmetics, audio settings, reduced-motion option and text legibility checks.
- [ ] Create consistent sprite, UI, audio and exercise-demo asset pipeline.
- **Exit:** replay matches logged facts; changing a *pending* decision changes only future events; no extra rewards from watching.

### Integration milestones

| Milestone | End-to-end proof | Exit checks |
|---|---|---|
| **M1 Training slice** | Onboard → receive quests → finish one → stats persist | Caps, substitutions, accessibility, repeat-submit |
| **M2 Offline slice** | Start expedition → close app/time elapses → return → encounter log appears | Seed determinism, cap, cross-user scope |
| **M3 RPG slice** | Watch replay → pick unresolved path → future fights change → claim gold → unlock content | No rewrites, once-only rewards, ledger integrity |
| **M3b Class slice** | Pick Warrior or Archer → class-weighted quests → same stats fight differently → switch class, stats preserved | Same engine, comparable win rates for equal effort |
| **M4 Playable alpha** | Complete the full day/night loop with tutorial, 1 region and boss | E2E tests, device performance, crash monitoring |
| **M5 Release candidate** | New player can complete loop without developer guidance | Store requirements, privacy, balance, accessibility |

### Phase 3 — Class expansion

- [ ] **Mage:** element choice (fire / frost / lightning / earth), spell rotation, area selection, status effects (burn, slow, shock); END-weighted resource.
- [ ] **Rogue:** evasion, rapid strikes, burst windows; dodge / combo / disengage tactics.
- [ ] **Summoner:** one elemental companion as a second actor with duration or cooldown; deploy / direct / recall commands; summon essence unlocks variants only.
- [ ] Spell and summon VFX from events, seeded for replay fidelity; reduced-motion variants (§3.12).
- [ ] Class mastery track: alternate tactics, animations, cosmetics — no raw stat inflation.
- [ ] Balance pass: every class viable vs the starter roster with equivalent training effort.
- **Exit:** all five classes run on the same engine; replays show summons and statuses correctly; no class needs a different exercise volume to keep up.

### Phase 4 — Balance, progression and retention

- [ ] Run statistical combat simulations across beginner/regular/advanced hero snapshots **for every class**.
- [ ] Weekly guild trials (§3.11) with non-stat prizes; class-specific cosmetic rewards.
- [ ] Tune quest duration, stat rewards, content difficulty and gold earning/spending pace.
- [ ] Ensure players who exercise moderately and consistently feel progress without excessive requirements.
- [ ] Test 0-day, 1-day, 7-day and 30-day inactivity behavior; never fabricate past exercises.
- [ ] Add meaningful cosmetic goals, achievements, enemy discoveries and boss milestones.
- [ ] Keep reward odds, target progression time and unlock prerequisites documented.
- [ ] Evaluate opt-in reminder timing and quiet hours.
- **Exit:** simulated economy stable, no easy reward exploit, playtesters understand why training matters.

### Phase 5 — Alpha, beta and release

- [ ] Internal alpha with automated test accounts and seeded expeditions.
- [ ] Closed beta with consented feedback from a small, diverse fitness/gameplay group.
- [ ] Collect usability findings: exercise clarity, effort, idle fairness, replay engagement.
- [ ] Fix crashes, sync conflicts, poor text contrast and battery/performance problems.
- [ ] Create onboarding/tutorial, screenshots, store descriptions and release notes.
- [ ] Review app-store disclosures, account deletion, privacy policy and content age rating.
- [ ] Release cautiously, monitor errors/reward anomalies, keep rollback procedure ready.
- **Exit:** complete core experience shipped and monitored; unresolved critical bugs = 0.

### Phase 6 — Post-launch roadmap (not MVP commitments)

1. New regions, story arcs, bosses and enemy families.
2. Additional classes, loadout sidegrades, Summoner expansions (boss summons, formations, dual elements) — never purchased stat advantages.
3. Rotating weekly challenge modifiers and seasonal cosmetic collections.
4. Richer interactive expeditions with multiple branching decisions.
5. Optional fully manual combat in special dungeons; never required for idle progress.
6. Optional HealthKit/Health Connect integrations, only with explicit consent and a clear benefit.
7. Social achievements, friend showcases or cooperative events after privacy/moderation planning.
8. Monetization experiments limited to cosmetics or clearly non-power optional value; avoid coercive ads.

---

## 9. Test plan and scenario coverage map

| ID | Category | Scenario | Expected result | Track |
|---|---|---|---|---|
| T01 | Quest | Same user opens daily board multiple times | Same eligible quest set | A |
| T02 | Quest | User substitutes a disliked exercise | Valid alternative, comparable reward | A |
| T03 | Quest | Submit completion twice / race two requests | Exactly one stat award | A+C |
| T04 | Fitness | Exceed daily stat cap | Extra points refused without punitive messaging | A |
| T05 | Fitness | Rest/recovery day selected | Safe alternative path, no guilt penalty | A |
| T06 | Combat | Same seed + stats + choices + version | Byte/semantic-identical ordered results | B |
| T07 | Combat | Hero defeated mid-expedition | Normal outcome and bounded rewards | B |
| T08 | Offline | Elapsed time exceeds cap | Only capped duration simulated | B |
| T09 | Offline | Two devices reconcile same expedition | Single persisted authoritative outcome | B+C |
| T10 | Replay | Pause/scrub/watch repeatedly | No change to gold, results or events | B+D |
| T11 | Replay | Replay selected ability from prior event | Shows event, does not resubmit action | D |
| T12 | Decision | Player acts on `OPEN` special checkpoint | One valid transition; future segment changes | B+C+D |
| T13 | Decision | Player submits same decision twice | No duplicate encounter/reward | B+C |
| T14 | Decision | Player tries to edit resolved checkpoint | Rejected, prior results unchanged | B+C |
| T15 | Decision | Player absent for automatic checkpoint | Saved strategy picks legal default | B |
| T16 | Economy | Claim completed expedition twice | Wallet credited once | C |
| T17 | Economy | Simultaneous unlocks exceed balance | At most one legal purchase | C |
| T18 | Economy | Bought region has a prerequisite | Access denied until prerequisite met | C |
| T19 | Security | User requests another hero's expedition | Forbidden; no data leakage | C |
| T20 | Security | Client sends fake reward/stat value | Ignored or rejected | C |
| T21 | Versioning | Content updated during existing expedition | Original snapshot/version honored | B+C |
| T22 | Reliability | Client closes during pending sync | Retry safely completes or shows error | A+C |
| T23 | UX | Reduced motion / screen reader / large text | Core screens and choices remain usable | A+D |
| T24 | Performance | Long replay with hundreds of events | Smooth enough on minimum device; no unbounded memory | D |
| T25 | Economy | Purchase a cosmetic or region | Never changes hero base stats | C |
| T26 | Privacy | Delete account/data request | Documented process removes/retains only lawful data | C |
| T27 | Safety | Exercise marked painful or not suitable | User can skip or swap without losing all progress | A |
| T28 | Failure | Server unavailable when returning from expedition | Clear retry path, no invented rewards | B+C |
| T29 | Class | Simulated week of quests for each class | Weekly movement diversity maintained | A |
| T30 | Class | Change class | Stats and fitness history preserved; nothing reset | A+C |
| T31 | Class | Equal training effort, each class vs starter roster | All classes viable; no class needs extra exercise | B |
| T32 | Class | Accessible substitution inside class quests | Comparable reward, no exploit, player not excluded | A |
| T33 | Replay | Replay with summon and status effects | Summon actions, statuses and VFX match event log every time | B+D |
| T34 | Economy | Earn class mastery / summon essence | Base stats unchanged | C |
| T35 | Class | Unfinished class in public build | Not selectable | A |
| T36 | Trials | Complete a guild trial twice in one week | One prize; normal capped stat award only | A+C |

**Required test layers:** unit tests for pure battle math/quest generator; DB integration tests for transactions; API contract tests; app component tests; scripted end-to-end journey; device smoke tests; simulations over large synthetic player cohorts. Keep fixture snapshots and random seeds under version control.

---

## 10. Balance and gameplay evaluation

### 10.1 Working metrics (targets to validate; not promises)

| Metric | Initial desired direction | Measurement |
|---|---|---|
| First workout quest completion | High completion among users who begin onboarding | Onboarding funnel |
| Time to first exciting battle | Short enough to show game value in first session | UX test timed journey |
| Expedition replay engagement | Players voluntarily watch highlights | Optional event analytics |
| Choice comprehension | Users distinguish past replays from future decision points | Interview and task success |
| 7-day return rate | Improve between beta iterations | Cohort retention (consented data) |
| Training adherence | Users can sustain moderate training with rest | Qualitative + aggregate opt-in metrics |
| Early progression | First meaningful area/cosmetic unlock feels attainable | Simulated days + playtests |
| Economy health | No negative balances or duplicate payouts | Database invariant monitoring |
| Crash-free sessions | High and improving release quality | Crash reporting |

### 10.2 Balance harness

Run seeded simulation batches representing beginners, consistent players, intermittent players, and highly engaged players. Vary quest adherence, strategy and encounter RNG. Record enemy win rates, expected gold/night, region completion time, point accumulation and cases where combat becomes trivial/impossible. Adjust formulas only after observing the distributions.

**Questions to investigate:** Are rest days viable? Is the cautious strategy always optimal? Does purchasing regions ever feel like paying to enter unbeatable content? Can an active player earn more gold than an idle player in a way that harms fairness? Does stat growth plateau too early? Are replays interesting after the tenth night?

---

## 11. Risks, abuse cases and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| Exercise misreporting | Self-attestation can be exploited | Focus on intrinsic motivation, daily cap, no high-stakes leaderboard MVP |
| Overexercise incentives | Players may chase stats by unsafe repetition | Limits, recovery quests, rest options, balanced rewards and substitutions |
| Idle boredom | Game feels like spreadsheet automation | Route decisions, boss highlights, collection, goals, cosmetic identity |
| Choice illusion | Choices appear different but resolve identically | Distinct encounter pools, risk, narrative and rewards; test outcomes |
| Replay exploit | Scrub/branch used to duplicate rewards | Read-only event stream; separate unresolved decisions; transactional claims |
| Content balance drift | Update changes old saved expeditions | Content+engine version per snapshot; migration tests |
| Server expense | Too many always-on jobs or event writes | Lazy settlement, compressed/paged events, batch writes, budget alerts |
| Performance | WebView animation stutter on low-end phones | Renderer proof-of-concept, event windowing, adaptive effects |
| Privacy | Fitness-related preference data is personal | Data minimization, protected storage, retention controls, clear consent |
| Copyright | Unlicensed sprites/music/demos | Asset ledger and original/licensed material |
| Scope creep | Solo dev builds MMO instead of MVP | Phase exit gates and explicit post-MVP backlog |
| Motivation guilt | Streak pressure reduces engagement | No punitive missed-day language or compulsory daily logins |
| Class monotony | Class weighting narrows movement variety | Coverage checks before weighting; world missions; guild trials |
| Class imbalance | One class dominates, or a class needs more exercise to keep up | Per-class balance harness; weights tuned, not reward multipliers |
| Summoner scope creep | Companions become a second progression game | One companion; essence buys variants only; formations deferred |
| Five-class art load | Solo dev must animate five kits plus VFX | Reuse LPC sheets (slash, shoot, spellcast); code-drawn effects; ship two classes first |

---

## 12. Demo script / vertical slice

| Order | Segment | What must be shown |
|---|---|---|
| 1 | New player onboarding | Choose level, time and accessibility preferences, then a class |
| 2 | Daily quests | Generate class + world quests; substitute an equipment-free workout |
| 3 | Training reward | Complete a quest; STR/END/AGI/VIT update exactly once |
| 4 | Expedition start | Snapshot hero and choose region/strategy |
| 5 | Offline progression | Simulate an elapsed period; verify backend result persists |
| 6 | Replay | Watch combat, pause, scrub and jump to highlight |
| 7 | Branch | Make a legal decision at an **unresolved** checkpoint |
| 8 | Reward settlement | Claim gold once; purchase cosmetic/region |
| 9 | Proof of constraints | Retry claim, replay prior fight and show no duplicated rewards |

---

## 13. Launch acceptance tracker

| Done | Outcome | Track | Milestone |
|---|---|---|---|
| [ ] | Accessible onboarding and quest substitution work | A | M1 |
| [ ] | 30–40 curated movements have instructions, tags and substitutions | A | M1 |
| [ ] | Class-weighted planner keeps weekly movement diversity for every class | A | M1 |
| [ ] | Warrior + Archer playable on one engine; class change preserves stats | A+B | M3b |
| [ ] | Stat awards are capped, repeat-proof, server authoritative | A+C | M1 |
| [ ] | Exercise-only stat growth enforced in all code paths | A+C | M1–M5 |
| [ ] | Combat deterministic for same inputs and version | B | M2 |
| [ ] | Offline expeditions settle consistently up to cap | B+C | M2 |
| [ ] | Three auto-strategies choose distinct legal behaviors | B | M2 |
| [ ] | Replay renders persisted events without reward changes | B+D | M3 |
| [ ] | Unresolved decisions change future, not past events | B+C+D | M3 |
| [ ] | Gold claim and unlock purchase are atomic/idempotent | C | M3 |
| [ ] | One playable region, boss, map, and cosmetics included | D | M4 |
| [ ] | Cross-user access and fake-stat payloads denied | C | M4 |
| [ ] | App passes accessibility/device/performance smoke tests | A+D | M4–M5 |
| [ ] | Balance simulations and user feedback reviewed | All | M4–M5 |
| [ ] | Privacy, account deletion, asset licensing documented | All | M5 |
| [ ] | CI, test reports, deploy and rollback documented | All | M5 |
| [ ] | First store-ready build has no unresolved critical defects | All | M5 |

---

## 14. First sprint: executable backlog

> Start here. This is the smallest vertical slice that proves the unique value proposition before investing in extensive content.

| Priority | Task | Deliverable | Definition of done |
|---|---|---|---|
| P0 | Create repository/app/API | Expo app + Node API + shared contracts | CI typecheck and unit test pass |
| P0 | Define hero and quest models | Typed `HeroStats`, `Exercise`, `Quest` | Validation tests pass |
| P0 | Build three sample exercise quests | Quest board with substitution | User can complete one in local app |
| P0 | Award stats once | Server endpoint and test DB | Double submit cannot double award |
| P0 | Define class config | `CharacterClass` for Warrior + Archer | Both load into the engine; tests pass |
| P0 | Build small battle engine | Warrior and Archer vs Slime/Wolf/Goblin | Seeded run deterministic |
| P0 | Build expedition result | Snapshot + seed + events + gold | Two loads identical |
| P0 | Build rudimentary replay | Colored sprites/placeholder animation | Event order and outcome match |
| P0 | Add choice checkpoint | Cave/Ruins with new future event pool | Settled history unchanged |
| P1 | Add gold ledger and unlock | One cosmetic unlock | No negative balances/double claims |
| P1 | Run quick user usability test | Observations in `docs/results/` | Player understands train → battle → unlock |

### Suggested issue labels

`track:A-fitness`, `track:B-combat`, `track:C-backend`, `track:D-content`, `priority:P0`, `priority:P1`, `phase:0` ... `phase:6`, `class:warrior` ... `class:summoner`, `type:feature`, `type:bug`, `type:test`, `risk:balance`, `risk:privacy`, `status:blocked`.

---

## 15. Definition of done (per feature)

- [ ] User story and clear acceptance criteria exist.
- [ ] Code is typechecked, formatted, linted, and tested.
- [ ] UI handles loading, retry, offline/error and accessibility where relevant.
- [ ] API validates identity, input, state transition and idempotency where relevant.
- [ ] Metrics/logging avoid sensitive workout details unless needed and appropriately protected.
- [ ] Documentation, fixtures, content version and decisions updated.
- [ ] Tested on a representative mobile device or emulator.
- [ ] No contradiction with exercise-only stats or no-retroactive-replay rules.

---

## 16. Open decisions and unanswered design questions

1. **Title/brand:** What is the final game name and visual identity?
2. **Platforms:** Android first, or iOS and Android together?
3. **Rendering:** Phaser/WebView proof succeeds, or move to Godot/native integration?
4. **Combat presentation:** Side-scrolling action visuals or turn-based pixel tactics as default?
5. **Quest difficulty:** Exact rep/time ranges and alternative mapping after fitness-content review?
6. **Progression:** Mastery leveling curve, readiness model and level bracket rules?
7. **Idle schedule:** Explicit nightly launch, any-time timed expedition, or both? Recommendation: any-time expeditions with nighttime theme.
8. **Decisions:** How many optional special checkpoints per expedition before players feel interrupted?
9. **Economy:** Gold-per-hour, unlock prices, cosmetics and milestone pacing?
10. **Auth/hosting:** Final cloud/provider choice after cost and local prototype testing?
11. **Art production:** Original hand-made pixel art, licensed packs, or commissioned assets?
12. **Monetization:** Cosmetics, rewarded ads for non-power rewards, or fully free first version?
13. **Age/accessibility:** Intended age rating, supervision guidance, low-impact content standard?
14. **Success bar:** What retention, fun and workout adherence indicators make the MVP worth expanding?
15. **Class weighting:** Is ~60/40 class/world right, and over what window (week? 10 days?)
16. **Readiness:** How large is the short-term readiness bonus so rest days never feel punished?
17. **Spell art:** Code-drawn pixel effects only, or mix in licensed (CC0 / OGA-BY) effect sheets? Record in `ASSETS`-style license manifest either way.

**Resolved by the class design doc (2026-11-10):** class changing is free and keeps stats (D19); Mage and Summoner stay separate; one active companion (D21); strategic intervention before any direct-action combat; class balance via equal effort, not reward multipliers; monetization stays cosmetic / optional convenience only.

---

## 17. Progress log

| Date | Owner/Track | Phase/Milestone | What changed | Tests / balance findings | Next action |
|---|---|---|---|---|---|
| 2026-11-04 | Planning | Pre-production | Initial project roadmap drafted | Not yet tested | Start Phase 0 technical spikes |
| 2026-11-10 | Planning | Pre-production | v0.2: merged class system (5 classes, class-weighted quests, stat interpretation, guild trials, mastery, summons); new Phase 3 Class expansion; phases renumbered | Not yet tested | Week-long simulated quest plans per class |
| 2026-11-13 | A | Phase 3 (started) | Mage, Summoner and Rogue playable: class configs, abilities (names only), class workouts (4 new movements + easier swaps), warm-ups | Quest planner tests pass for all five classes (variety, ~60/40, all stats) | Class abilities in the combat sim; per-class sprites |
| | | | | | |

---

## 18. Project-specific engineering rules to preserve

1. **One source of truth:** Backend owns authoritative hero stats, expedition outcomes, wallet and unlocks.
2. **One meaning per replay:** Historical playback never becomes a second reward-producing game.
3. **One decision per checkpoint:** Choices can influence only unresolved future segments.
4. **One reward per source:** Every awarded currency transaction has a unique settlement source.
5. **One stat origin:** Character power is earned through completed exercises and explicitly defined safe/recovery alternatives—not gold, ads or microtransactions.
6. **One consistent version:** An expedition stores engine/content versions and stays replayable after updates.
7. **Offline by design:** Absence shouldn't stop basic progression or create punitive pressure.
8. **Small complete world first:** A polished forest with satisfying decisions beats ten empty regions.
9. **One stat pool, many interpretations:** Classes read the same four stats differently; they never change what an exercise awards.
10. **Classes are data:** A new class is a config, ability set and animation kit — never a new engine.

**North-star experience:** *Train in real life. Let your hero adventure. Return to shape the story.*
