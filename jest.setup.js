// jest-expo 58 turns asset files (fonts included) into the id 1 without
// registering it, so an icon's font load fails with "Module 1 is missing
// from the asset registry" as soon as a test renders one. Fonts never matter
// in a test: report them as already loaded, so icons render without loading.
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(() => Promise.resolve()),
}))
