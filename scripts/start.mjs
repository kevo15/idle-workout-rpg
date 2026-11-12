// npm run start  → Expo dev server for Expo Go / a dev build on iOS and Android
//
// Clears Metro's cache each run (like Shadow Sprinter's start script), so
// EXPO_PUBLIC_* values are always baked in fresh. Backend targets
// (prod / stage / local) get added here once the API exists.
// Extra arguments go to `expo start`, e.g. `npm run start -- --tunnel`.
import { spawn } from 'node:child_process'

const expoArgs = process.argv.slice(2)

// One command string: passing an args array with shell: true is deprecated.
const child = spawn(['npx expo start --clear', ...expoArgs].join(' '), {
  stdio: 'inherit',
  shell: true,
})
child.on('exit', (code) => process.exit(code ?? 0))
