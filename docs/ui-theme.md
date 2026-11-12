# Rep Raiders UI theme: "Iron Arena"

> A fantasy gladiator gym where every rep powers your raid.
> The game's personality comes from training. The fantasy comes from the badges and expeditions.

## 1. How it differs from Shadow Sprinter

| | Shadow Sprinter | Rep Raiders: Iron Arena |
|---|---|---|
| Setting | Night city / ninja village outdoors | Indoor arena-gym: rubber floor, iron racks, stadium lights |
| Mood | Stealthy, calm, drifting | Loud, pumped, game-day energy |
| Motion | Slow ambient loops, each layer on its own timer | **Everything pulses to one beat (BPM clock)**, like a workout playlist |
| Background layers | Gradient sky, aurora, stars, scrolling skyline, walkers | Floodlight beams, chalk dust, bleacher crowd, equipment silhouettes, exercising figures |
| Particles | Twinkling stars | Chalk-dust bursts and sweat sparks on each beat |
| Figures | People walking past | People **doing reps**: squats, jumping jacks, push-ups |
| Palette | Purple/teal night | Rubber-black and steel, with brand red, gold and chalk white |
| Type | Soft UI sans | Scoreboard numbers, italic sports headings |

## 2. Palette

| Token | Hex | Use |
|---|---|---|
| `floor` | `#111114` | Base background (rubber gym floor) |
| `iron` | `#1E1F24` | Panels and silhouettes (racks, plates) |
| `steel` | `#3A3D45` | Secondary silhouettes, dividers |
| `steelLight` | `#8A8F99` | Muted text, inactive icons |
| `chalk` | `#F4F1EA` | Main text, chalk particles |
| `crimson` | `#C8102E` | Brand red, primary energy color, active states |
| `deepRed` | `#7A0C14` | Card fill, pressed states |
| `gold` | `#F2B233` | Rewards, gold, PRs, primary button |
| `hype` | `#FF6A1A` | Streak/flame accents, heart-rate line (use sparingly) |
| `success` | `#3DDC84` | Completed set/quest check only |

Stat colors stay the same everywhere: **STR** crimson `#C8102E` · **END** orange `#FF6A1A` · **AGI** gold `#F2B233` · **VIT** green `#3DDC84`.

## 3. Typography

- **Headings:** "Lilita One". It matches the badge lettering. Use ALL CAPS, slanted -6° with `transform: skewX` to look sporty.
- **Numbers (reps, timers, stats, gold):** "Teko" or "Bebas Neue". Tall, condensed scoreboard digits, and big: timers 96px+, stat values 28px+.
- **Body:** "Inter", 14–16px.
- **Voice:** a hype coach, never a guilt trip. Use lines like "SET COMPLETE", "REP IT OUT", "NEW PR!", "RAID POWERED UP". Never "You missed your workout." When a quest is skipped, say "Rest day logged. Your hero still raids."

## 4. Shapes and UI motifs (all code-drawable)

- **Weight-plate ring:** a progress ring styled as a weight plate. It has a thick outer ring, an inner hub circle, and a small kg-style number on the rim. Use it for the workout timer, daily quest progress and the expedition timer.
- **Barbell stat bar:** a horizontal bar with end-caps shaped like plates. The bar fills from the left in the stat's color.
- **Hazard / speed stripes:** diagonal 45° stripes in `crimson` at 15% opacity, used in headers and the "START" button track. Animation: the stripes slide sideways continuously (translateX loop).
- **Scoreboard panel:** a dark `iron` box with a 2px `steel` border. It shows big numbers with a crimson label strip above. Use it for overnight results, gold and stats.
- **Chalk tape tags:** CLASS/WORLD tags look like slightly rotated (±2°) white tape strips with dark text.
- **Ribbon headers:** keep these from the badges (a polygon with notched ends), in crimson with a gold trim.
- **Cards:** `iron` at 90% opacity, 14px radius, 1px `steel` border, with a 4px crimson accent bar down the left edge. Featured cards get a gold border.
- **Buttons:** primary is gold with dark text, skewed -6°, with a "press" scale down to 0.96. Secondary is crimson with chalk text. Destructive actions are a steel outline.
- **Lucide icons:** dumbbell, flame, heart-pulse, timer, trophy, swords, map, shield.

## 5. Animated background system

One shared `beat` value loops at the screen's tempo (e.g. 100 BPM = 600ms). Every layer reads `beat` through `interpolate`, so the whole scene moves together like a gym playlist. Only transform and opacity are animated, on the native driver. If "Reduce motion" is on, the scene shows a still frame.

Layers, back to front:

1. **Arena wall:** a vertical gradient from `floor` at the top to `#1A0D10` at the bottom, with a radial crimson glow at 25% behind the main content.
2. **Floodlight beams:** 2–3 long trapezoid beams with a white-to-transparent gradient, coming from lamp rectangles at the top edge. Animation: they slowly swing between about ±8°, and their opacity flickers slightly on the beat.
3. **Bleachers and crowd:** stepped rectangles along the far wall, with rows of small circle heads in `steel`. Animation: the heads bob translateY 0 to -3px on the beat, with alternate rows offset by half a beat (the "wave").
4. **Equipment silhouettes:** in `iron`, along the floor line. They include a dumbbell rack (rectangle shelf with dumbbells made of pairs of circles and a bar), kettlebells (a circle with an arch handle), a barbell on a squat rack (uprights plus a bar with plate circles), a hanging banner with the logo badge, and a pull-up bar. These stay mostly still. A punching-bag rectangle can sway ±3°.
5. **Exercising figures:** a circle head, a trapezoid torso and line limbs, in `steel` or crimson for the hero. Each one loops a 2-pose rep on the beat:
   - Squat: the body translates down, then up.
   - Jumping jack: the arm and leg lines rotate out, then in.
   - Push-up: the whole figure is horizontal and translates down, then up.
   - Plank: holds still, with a slow breathing scale of 1.00 to 1.02.
6. **Chalk dust:** 15–25 small `chalk` circles at 20–40% opacity near the figures and floor. Animation: on every 4th beat a small puff bursts out (scale up, fade out, drift up).
7. **Floor:** a `#0B0B0D` strip with a faint rubber-tile grid (thin `steel` lines at 8% opacity) and a crimson painted line along its top edge.
8. **UI scrim:** a gradient from transparent to `floor` at 85% behind the card stack. The tab bar is solid `floor`.

## 6. Scene per screen

| Screen | Scene | Tempo |
|---|---|---|
| Class Select | **Main stage.** Crowd bleachers, two floodlights crossing on the selected badge, and the hero figure flexing (arms rotate up) | 110 BPM |
| Home / Camp | **Guild gym at night.** A dumbbell rack, a scoreboard panel showing overnight results, chalk dust drifting, the crowd mostly empty | 80 BPM (calm) |
| Daily Quests | **Training floor.** Three figures in the background, each doing one of today's quest exercises | 100 BPM |
| Workout In Progress | **Focus mode.** Equipment and crowd are hidden. Plate-ring timer, a heart-rate line that scrolls behind the timer, a chalk burst on each rep, and floodlights locked on center | Exercise's own cadence |
| Hero Sheet | **Trophy wall.** Shelves with trophies (rectangle bases and circle or cup polygons), one spotlight on the portrait badge, and the hero holding a plank | 70 BPM |
| Expedition Setup | **Arena gate.** A portcullis made of grid rectangles lifts up (translateY), with a crimson glow of the region beyond. The hero figure jogs in place, then out through the gate | 120 BPM |

Fantasy appears in only three places: the badges, the expedition gate, and the region glow. Everything else should feel like a game-day gym.

## 7. Do / don't

- **Do:** pulse to the beat, use big numbers, give satisfying "set complete" bursts, and use the red/gold/chalk contrast.
- **Don't:** use night skies, moons, stars, auroras, scrolling city or forest skylines, or purple/teal. Those belong to Shadow Sprinter.
- **Don't:** use flashing faster than 3 times a second, screen shake, or guilt language.
