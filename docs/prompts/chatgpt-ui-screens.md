# ChatGPT prompt: Rep Raiders UI screens

Attach these to the chat before you paste the prompt:
- `REP Raiders Class Badge Collection.png` (the sheet of 6 badges)
- `repraiderlogo.png` (the logo / app-icon sheet)
- Optional: one of the full-crest variants (`ChatGPT Image ... PM-1.png` to `PM-5.png`)

The visual theme is "Iron Arena". The full spec is in `docs/ui-theme.md`. The backgrounds are still built from code layers (gradients, flat SVG silhouettes, dots made from Views), like Shadow Sprinter's, but the look and motion are different: an indoor gym pulsing to one shared beat.

---

## Prompt 1: the mockups

```text
You are a senior mobile game UI designer. Design UI mockups for "Rep Raiders," a mobile idle RPG powered by real at-home bodyweight workouts. Players complete daily exercise quests to earn hero stats (STR, END, AGI, VIT). While they're away, their hero goes on expeditions, fights enemies and earns gold. Gold unlocks regions and cosmetics only. It never buys stats.

I've attached my only image assets: a class badge sheet (Rep Raiders, Warrior, Archer, Mage, Summoner, Rogue) and a logo/app-icon sheet.

THE HARD RULE: every screen, including its background, has to be rebuildable in pure code (React Native + react-native-svg + expo-linear-gradient) using only my attached PNGs. Every pixel on screen must be one of these:
1. One of my attached assets, cropped to a single badge/logo and scaled. Never redrawn, restyled, recolored or extended.
2. A flat vector shape that SVG can draw: rectangles, rounded rectangles, circles, ellipses, triangles, simple polygons, straight lines. Each shape is filled with one solid color.
3. A linear or radial gradient, or a solid color, used for sky, glows, scrims and cards.
4. UI parts: borders, drop shadows, progress bars, pills, dividers, and text in a Google Font.
5. Small UI glyphs from the Lucide icon set (lucide.dev), drawn flat in one color.

Don't do any of these: painterly or detailed illustration, textures (parchment, stone, wood grain, noise), shading or outlines inside figures, faces or anatomy, photos, 3D, or new emblems.

ANIMATED BACKGROUNDS (important)
Every screen sits on a living, layered background scene, like a 2D side-scroller backdrop made of flat silhouettes. The mockup can only show one frozen frame, so design that frame. Every layer must be one I can animate in code using only position (translate), scale, rotation and opacity. The background shows across the whole screen. The UI sits on top in semi-transparent cards, with a dark gradient scrim behind the busiest UI area so text stays readable.

THEME: "IRON ARENA"
The game should feel like game day at a fantasy gladiator gym: loud, pumped and athletic. It should NOT feel like a night-time forest or city RPG. Avoid night skies, moons, stars, auroras, scrolling skylines, forests and purple/teal. The fantasy appears only in my badges and on the Expedition screen. Everything else reads as a gym.

Build each background from these layers, back to front:
- ARENA WALL: a vertical gradient from rubber-black #111114 down to #1A0D10, with a soft radial crimson glow (25%) behind the main content.
- FLOODLIGHTS: 2–3 long trapezoid light beams (white-to-transparent gradient) coming from lamp rectangles at the top edge. Animation: slow swing of ±8°, opacity flickers on the beat.
- BLEACHERS AND CROWD: stepped rectangles along the far wall, with rows of small circle heads in steel grey #3A3D45. Animation: heads bob 3px on the beat, with alternate rows offset (a crowd "wave").
- EQUIPMENT SILHOUETTES in iron grey #1E1F24 along the floor line: a dumbbell rack, kettlebells (circle with an arch handle), a barbell on a squat rack, a pull-up bar, and a punching bag that sways ±3°.
- EXERCISING FIGURES: a circle head, a trapezoid torso and line limbs, in steel grey (the hero is crimson). Each loops a 2-pose rep on the beat: squat (body moves down/up), jumping jack (limb lines rotate out/in), push-up (horizontal figure moves down/up), plank (slow breathing scale).
- CHALK DUST: small off-white #F4F1EA circles at 20–40% opacity near the figures. Animation: a puff bursts out every 4th beat (scale up, fade, drift up).
- FLOOR: a #0B0B0D strip with a faint rubber-tile grid and a crimson painted line on its top edge.
- UI SCRIM: a dark gradient behind the cards. The tab bar is solid #111114.

SIGNATURE MOTION: one shared beat clock (BPM) drives every layer, so the whole scene pulses together like a workout playlist. Animate only position, scale, rotation and opacity.

Scene per screen (same layer system):
- Class Select: main stage. Crowd bleachers, two floodlights crossing on the selected badge, and the hero figure flexing. 110 BPM.
- Home / Camp: guild gym at night (indoors). A dumbbell rack, a scoreboard panel showing overnight results, drifting chalk dust, a mostly empty crowd. 80 BPM.
- Daily Quests: training floor. Three background figures, each doing one of today's quest exercises. 100 BPM.
- Workout In Progress: focus mode. No equipment or crowd. A heart-rate line scrolls behind the timer, chalk bursts on each rep, floodlights lock on center.
- Hero Sheet: trophy wall. Shelves of trophy silhouettes, a spotlight on the portrait badge, and the hero holding a plank. 70 BPM.
- Expedition Setup: arena gate. A portcullis (grid of rectangles) lifting up, a crimson glow of the region beyond, and the hero jogging out through the gate. 120 BPM.

Keep each silhouette at 1–3 flat colors. They should read as atmosphere, never compete with the UI.

VISUAL STYLE FOR THE UI
- Palette: rubber-black #111114, iron #1E1F24, steel #3A3D45, muted steel #8A8F99, chalk white #F4F1EA, brand crimson #C8102E, deep red #7A0C14, gold #F2B233, hype orange #FF6A1A (sparingly), success green #3DDC84 (completed checks only).
- Stat colors everywhere: STR crimson, END orange, AGI gold, VIT green.
- Fonts: "Lilita One" for headings, in ALL CAPS and slanted -6°. "Teko" for big scoreboard numbers (timers, reps, stats, gold). "Inter" for body text.
- Motifs:
  - Weight-plate progress rings: a thick plate ring with a hub circle, used for timers and progress.
  - Barbell stat bars: a bar with plate end-caps, filled in the stat's color.
  - Diagonal hazard/speed stripes behind headers and the START button.
  - Scoreboard panels for numbers.
  - CLASS/WORLD tags as slightly rotated white tape strips.
  - Notched crimson ribbon headers with gold trim, taken from my badges.
- Cards: iron #1E1F24 at 90% opacity, 14px radius, 1px steel border, and a 4px crimson accent bar on the left edge. Featured cards get a gold border.
- Primary button: gold fill, dark text, skewed -6°, all caps. Secondary button: crimson fill, chalk text.
- Copy voice: hype coach, never guilt. Use lines like "SET COMPLETE", "NEW PR!", "RAID POWERED UP". When a quest is skipped: "Rest day logged. Your hero still raids."

FORMAT
- Phone portrait, 390 x 844 (iPhone 14), with a safe-area status bar and a bottom tab bar: Home, Quests, Hero, Map. Give the tab bar a solid dark background so the scene doesn't show through it.
- Make one image per screen, flat and straight-on. No phone mockup frame, perspective or hands.
- All text must be real, readable, correctly spelled English. No lorem ipsum.

SCREENS (design these 6)
1. Class Select: a 2-column grid of the 5 class badges. Warrior and Archer are selectable. Mage, Summoner and Rogue are dimmed (grayscale and 40% opacity) with a "COMING SOON" pill. The selected card has a gold glow. Underneath: a short class description, a STR/AGI/END/VIT emphasis bar chart, and a "CHOOSE WARRIOR" button.
2. Home / Camp: the logo at top. A "Welcome back" card with an expedition summary ("8h expedition complete · 14 battles won · +320 gold") and a big "CLAIM REWARDS" button. Below that: today's quest progress (2/3), gold balance and current region (Whispering Forest). Leave the campfire scene visible in the gap between the logo and the card.
3. Daily Quests: 3 quest cards, each with a CLASS or WORLD tag, exercise name, sets/reps, the stat reward (e.g. "+3 STR"), a "Swap" option for an easier alternative, and a completed state for one card. Daily stat budget bar: 8/12.
4. Workout In Progress: exercise name, a large circular countdown timer (SVG ring), "Set 2 of 3," simple text instructions, PAUSE / DONE buttons, and a small "Stop anytime. Swap for an easier option." safety note.
5. Hero Sheet: the Warrior badge as the portrait, class name and level, 4 stat rows (STR/END/AGI/VIT) with value and bar, an abilities list (Guard, Counter, Heavy Strike) as chips, and a "Change class" text link.
6. Expedition Setup: the arena gate scene filling the top ~40% of the screen. Below it: a region list (Whispering Forest unlocked; Fallen Kingdom locked with 1,500 gold; Ashen Wastes locked with 5,000 gold), a 3-way segmented control (Aggressive / Balanced / Cautious) with one-line tradeoffs, the expected duration of "Up to 8h," and a "START EXPEDITION" button.

Keep the style the same across all 6 screens, as if they come from one design system and one background engine.
```

---

## Prompt 2: the build spec (send after the images come back)

```text
Now write a build spec so a developer can recreate these screens exactly in React Native (Expo) using react-native-svg, expo-linear-gradient and the Animated API, with my PNGs as the only images. Include:
1. Design tokens as a TypeScript object: colors, font families/sizes/weights, spacing scale, radii, borders, shadows, gradients.
2. Asset list: each crop I need from my sheets, a suggested filename (e.g. badge-warrior.png) and the rendered size on each screen.
3. A reusable <ArenaBackground variant="mainStage" | "guildGym" | "trainingFloor" | "focus" | "trophyWall" | "arenaGate"> component, driven by one shared `beat` Animated.Value that loops at the variant's BPM. Every layer interpolates from it. For each variant give:
   a. A theme object (wall gradient stops, glow color, BPM, chalk count, silhouette colors), in the style of `THEMES: Record<Variant, Theme>`.
   b. The layer stack, back to front. For each layer: the SVG primitives, with sizes as a fraction of screen width/height.
   c. The animation for each layer: which property (translateX / translateY / scale / opacity / rotate), from→to values, duration, easing, and loop type (seamless scroll, ping-pong, or restart).
   Rules: exercising figures are an Animated.View wrapping a small Svg, with each limb in its own Animated.View so it can rotate around a joint origin. Rep poses are driven by `beat`. Animate only transform and opacity, with useNativeDriver: true. Stop every loop on unmount and when the screen loses focus. If the OS "reduce motion" setting is on, show the static frame.
4. For each screen, a component tree (View/Text/Image/Pressable/Svg) with layout values (flex, padding, gap, sizes) and the Lucide icon names used.
5. Reusable UI components: RibbonHeader, GoldButton, Card, StatBar, TagPill, SegmentedControl, CountdownRing, with props.
6. Anything in your mockups that CANNOT be drawn in code with these primitives and my assets. List it plainly and give the code-drawable replacement.
```

---

## Notes

- The badge and logo files are sheets, so crop out each badge as its own transparent PNG before building. Then if you remodel the art later, you only swap files and the UI code stays the same.
- If ChatGPT paints a detailed scene instead of flat silhouettes, reply: "Redraw the background using only flat single-color rectangles, circles, lines and polygons: an indoor arena-gym with floodlights, bleachers, equipment silhouettes and figures doing reps. No textures, no shading, no outlines inside figures, no outdoor scenery."
- Generate screens 1–2 at a time if quality drops with all 6 in one request.
- The full theme spec is in `docs/ui-theme.md`. If the look drifts, paste section 1 of that file into ChatGPT.
- Shadow Sprinter code worth reusing for the technique only (not the look), from `shadow-sprinter/src/components/levelbackground/`:
  - `components/Stars.tsx`: its particle loop and cleanup. Use it as the base for the chalk-dust puffs.
  - `components/BackgroundWalkers.tsx`: its figure silhouette. Extend it with limbs to make the exercising figures.
  - `themes.ts`: the pattern of one theme object per variant.
  - What's new: one shared beat clock that drives every layer.
- The battle replay screen is left out on purpose. It needs pixel-art sprites that don't exist yet.
