# ChatGPT prompt: Rep Raiders loading screen art

**Done (2026-11-13):** the art came back as an animated SVG scene, `assets/loading-anim.html`. The app draws it in code: `src/components/loading/ArenaGateScene.tsx` (animations) and `arenaGateArt.ts` (the static layers, taken from the HTML). `LoadingScreen.tsx` puts the title, bar and tips on it. If the HTML changes, update `arenaGateArt.ts` to match.

The prompt below is kept for variants (e.g. one scene per region).

---

## Prompt

```text
Create a vertical mobile game loading-screen background, 1080 x 1920 pixels, for "Rep Raiders", a fantasy idle RPG powered by real at-home bodyweight workouts. Match the style of my attached class badges and logo: bold flat vector shapes, thick clean edges, limited palette, no painterly texture.

SCENE: "the gate to the wilds". We look down the length of a gladiator training arena at night-game lighting. On the far wall stands a huge stone archway with an iron portcullis half raised. Through the arch, glowing, is the Whispering Forest: tall pine and oak silhouettes, a dirt path and floating teal-white wisps. In the foreground, at the bottom of the frame, a hero silhouette (crimson, seen from behind, a sword on the back and a small pack) stands at the start of the path, rolling their shoulders like they're warming up. Chalk dust drifts in the floodlight beams.

COMPOSITION (important): the app draws a round progress ring, the word LOADING and a line of tips in the MIDDLE 60% of the image, from about 20% to 80% of the height. Keep that zone calm and dark: the arch glow and soft beams only, no figures, no detail, no bright spots. Put the interest at the top (lamps, beams, the top of the arch) and the bottom 20% (the hero, the floor, a dumbbell rack and kettlebells to the sides). The image should still work cropped to a landscape 16:9 band through its middle.

PALETTE (use only these): rubber black #111114 and #0B0B0D, iron #1E1F24, steel #3A3D45, crimson #C8102E, deep red #7A0C14, gold #F2B233, chalk white #F4F1EA, with a single cool accent for the forest glow and wisps (#7FD8C8 at low strength). Overall dark, with crimson and gold as the only strong colors.

LIGHT: two or three long floodlight beams from the top edge, white fading to transparent. A warm gold glow spilling from the arch onto the floor. A soft crimson haze low behind the hero.

DO NOT include: any text, letters, numbers, logos, UI, borders, frames, watermarks, faces, photorealism, 3D renders, noise or grain, or busy detail in the middle band.
```

---

## Optional: one per region

Use the same prompt, and swap the line describing what glows through the arch:

- **Fallen Kingdom:** "Through the arch, glowing, are the ruins of a fallen kingdom in autumn: broken towers, a moat, orange-red trees, a cold moon."
- **Ashen Wastes:** "Through the arch, glowing, are the Ashen Wastes: grey ash plains, dead grey trees and rivers of orange lava under a smoky sky."

Save them as `loading-forest.png`, `loading-kingdom.png` and `loading-wastes.png` if you want a different image per region; the loading screen can be given the region's art later.
