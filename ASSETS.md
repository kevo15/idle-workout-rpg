# Asset License Manifest

Every third-party asset that ships in Rep Raiders, the license it is used under, and where it comes from. Add a row whenever a new asset is `require()`d by the app; Metro only bundles assets that code requires.

## Fonts

| Asset | Package | Source | License | Notes |
|--|--|--|--|--|
| Lilita One | `@expo-google-fonts/lilita-one` | Google Fonts | SIL OFL 1.1 | Headings |
| Teko (500, 600) | `@expo-google-fonts/teko` | Google Fonts | SIL OFL 1.1 | Scoreboard numbers |
| Inter (400–800) | `@expo-google-fonts/inter` | Google Fonts | SIL OFL 1.1 | Body text |

## Art

| Asset | Files | Source | License | Notes |
|--|--|--|--|--|
| App icon, adaptive icon, splash | `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash-icon.png` | Expo template placeholders | MIT (Expo) | Replace with Rep Raiders art before release |
| Class badges | `assets/badges/*.png` | Generated for this project (ChatGPT image tool) | Own use | Not bundled yet |
| Scene and UI drawings | `src/components/arenabackground/*`, `src/components/ui/Icon.tsx` | Drawn in code from `docs/mockups/*`; icon paths follow Lucide | Lucide: ISC | No image files |

Design sources (`docs/`, `assets/Rep Raiders UI Refresh.html`) are not bundled.
