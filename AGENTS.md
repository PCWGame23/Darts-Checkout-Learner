# AGENTS.md — Darts Checkout Learner

This file is written for AI coding agents. If you are editing this project, read this first.

---

## Project overview

**Darts Checkout Learner** is a Duolingo-style progressive web app (PWA) that helps players memorise every 2- and 3-dart checkout from 2 to 170. The app tailors routes to the user's favourite doubles (e.g. D20 and D16) and teaches them via daily lessons with spaced repetition.

Key product facts:
- Fully offline, installs to the home screen on iPhone and Android.
- Bilingual: German and English.
- No backend — everything is stored in `localStorage`.
- Optional 4-digit PIN lock (SHA-256 hashed).
- Curriculum covers scores 61–170 only; 2–60 are considered trivial mental math and are not taught.

---

## Technology stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 (functional components + hooks) |
| Language | TypeScript 5.6 (strict mode) |
| Build tool | Vite 6 |
| Testing | Vitest 2 (node environment) |
| PWA | `vite-plugin-pwa` (Workbox, autoUpdate) |
| Styling | Plain CSS (CSS custom properties, no CSS-in-JS library) |
| State | Custom pub-sub store backed by `localStorage` |
| Routing | None — simple view switching with `useState` in `App.tsx` |
| i18n | Minimal hand-rolled flat dictionary with `{param}` interpolation |

There is **no ESLint or Prettier** configured. The project relies on TypeScript strictness (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`).

---

## Directory structure

```
src/
  engine/          # Core domain logic (pure, no React)
    darts.ts       # Dart/Route model, parsing, labels, values
    routes.ts      # Route enumeration, validation, quality heuristics
    standardChart.ts  # Textbook checkout chart as strings (2–170)
    calibrate.ts   # Favourite-double cascade: pick fav-tailored or standard route
    miss.ts        # Miss-training challenges (triple→single recovery)
    *.test.ts      # Unit tests for the above
  learn/           # Lesson construction & spaced repetition
    lessons.ts     # Build daily/endless/miss lessons; streak logic
    progress.ts    # 5-stage progression tree (61–170)
    scheduler.ts   # SM-2-lite spaced repetition grading
  state/           # Application state
    store.ts       # localStorage pub-sub store, React hook, PIN hashing, backup
  i18n/
    index.ts       # Translation dictionaries (de, en), `useT` hook
  ui/              # React components
    App.tsx        # Root: onboarding → pin lock → home / lesson / settings
    Home.tsx       # Duolingo-style path with stage nodes
    LessonScreen.tsx  # Lesson shell + feedback panels
    Onboarding.tsx # First-run flow: language, PIN, favourites
    Settings.tsx   # Language, favourites, PIN, backup, reset
    PinLock.tsx / PinPad.tsx
    FavoritePicker.tsx
    Dartboard.tsx  # SVG dartboard + wedge/ring buttons
    Mascot.tsx     # Pixel-art SVG mascot (keep in sync with scripts/make-icons.mjs)
    exercises/
      BoardEntry.tsx   # Tap board + S/D/T ring buttons
      TileOrder.tsx    # Drag/ tap tiles to build route
      MissHeader.tsx   # "You aimed X – hit Y" banner
      common.ts        # Grading helpers, accepted routes, tile utilities
      dualRoute.test.ts # Tests for favourite + pro-tip acceptance
```

---

## Build, test, and development commands

```bash
npm install
npm run dev        # Start Vite dev server
npm run build      # Production build → dist/
npm run preview    # Preview the production build locally
npm test           # Run all Vitest tests once
npm run test:watch # Run Vitest in watch mode
npm run icons      # Regenerate PWA icons from pixel-art mascot
```

Tests are run in a **Node** environment (`vite.config.ts` → `test.environment: 'node'`). There are no browser or component tests.

---

## Testing strategy

Test files are co-located with source code and named `*.test.ts`.

Critical test coverage:
- **Engine tests** (`engine/engine.test.ts`, `engine/miss.test.ts`):
  - Round-trip parsing for every dart label.
  - Every standard-chart entry sums to its score and ends on a double.
  - Bogey numbers (159, 162, 163, 165, 166, 168, 169) have no 3-dart routes.
  - Favourite calibration cascade: fav1 → fav2 → standard fallback.
  - Miss-challenge grading: finish vs setup, good/almost/again boundaries.
- **UI logic tests** (`ui/exercises/dualRoute.test.ts`):
  - Accepting both favourite-tailored and pro-tip routes as "good".
  - Tile-bank union logic when routes differ in length.

When modifying checkout logic, **always run `npm test`** — the engine tests validate mathematical correctness for the entire chart.

---

## Code style guidelines

1. **TypeScript strictness** — The project uses `strict: true` plus `noUnusedLocals` and `noUnusedParameters`. The build will fail on unused variables.
2. **No implicit any** — Every function parameter and return type should be explicit, especially in `engine/`.
3. **Pure engine layer** — `src/engine/` must remain free of React and browser APIs. It is pure logic and can be tested in Node without a DOM.
4. **State mutations** — Only `src/state/store.ts` reads/writes `localStorage`. Everywhere else uses `getState()` / `setState()` / `useAppState()`.
5. **CSS conventions**:
   - CSS custom properties are defined in `:root` inside `src/styles.css`.
   - Utility classes (e.g. `.screen`, `.card`, `.btn-primary`) are preferred over inline styles, except for dynamic values.
   - The app is mobile-first, max-width 480px, centred with `#root { max-width: 480px; margin: 0 auto; }`.
6. **i18n** — All user-facing strings must go through `useT()` / `translate()`. Add keys to both `de` and `en` dictionaries in `src/i18n/index.ts`. Keys are camelCase dot-notation (e.g. `lesson.correct`).
7. **Comments** — Write comments in English. JSDoc-style is common in `engine/` for exported functions.
8. **File naming** — Components are PascalCase (`Home.tsx`), utilities are camelCase (`common.ts`), tests are suffixed `.test.ts`.

---

## Key architectural rules

### Favourite-double calibration (`engine/calibrate.ts`)
The cascade is the app's core differentiator. When changing it, preserve this priority:
1. Score **is** a favourite double → direct 1-dart finish.
2. Best route ending on favourite #1 within the dart budget.
3. Otherwise favourite #2 (fewer darts wins; tie goes to #1).
4. Otherwise the textbook route from `standardChart.ts`.

A favourite route may use **one more dart** than the textbook minimum (e.g. 40 → 8 D16 for a D16 lover). This is intentional.

### Spaced repetition (`learn/scheduler.ts`)
- Grades: `'good'` (exact or accepted route), `'almost'` (valid alternative finish), `'again'` (wrong/bust).
- Intervals: 1, 3, 7, 14, 30, 90 days.
- `'again'` resets reps to 0 and schedules for tomorrow.
- `'almost'` halves the interval.

### Progression tree (`learn/progress.ts`)
- 5 stages: 61–80, 81–100, 101–120, 121–140, 141–170.
- Next stage unlocks when ≥70 % of current stage is mastered (2 successful reviews per checkout).
- Progress bar: practiced-but-not-mastered = 0.5, mastered = 1.0.

### Miss training (`engine/miss.ts`)
- Simulates missing the first triple (e.g. T20 → S20).
- If the remainder is a 1- or 2-dart finish → "finish" challenge.
- If the remainder needs 3 darts → "setup" challenge (leave a favourite or standard double).
- Unlocked after the user has practiced at least 5 eligible checkouts (`MISS_UNLOCK_MIN`).

---

## Deployment

The project deploys automatically to **GitHub Pages** via `.github/workflows/deploy.yml`:
- Triggers on every push to `main`.
- Runs `npm ci` → `npm test` → `npm run build` (with `BASE_PATH` set to the repo name).
- Publishes the `dist/` folder using `peaceiris/actions-gh-pages@v3`.

The live URL is `https://<user>.github.io/<repo>/`.

---

## Security & privacy considerations

- **No server-side code** — this is a static client-side app.
- **localStorage only** — user progress, favourites, PIN hash, and language choice stay on the device.
- **PIN hashing** — Uses `crypto.subtle.digest('SHA-256', ...)` with a prefix salt (`dcl:${pin}`).
- **Backup/restore** — JSON export/import in Settings. The import validates `schemaVersion === 1` and that `items` is an object.
- **No external API calls** at runtime. The PWA service worker caches assets for offline use.

---

## Assets & icon generation

PWA icons (`public/icons/icon-192.png`, `icon-512.png`, `icon.svg`) are generated from a pixel-art grid defined in `scripts/make-icons.mjs`. The same grid is hard-coded in `src/ui/Mascot.tsx`. **If you change the mascot art, update both files and run `npm run icons`.**

---

## Useful pointers when editing

- **Adding a new checkout route** — Edit `engine/standardChart.ts`, then verify with `npm test` (the standard-chart test validates every entry).
- **Adding a new screen** — Add a case to the `View` union in `App.tsx` and switch in the `App` component.
- **Adding a new exercise type** — Extend `ExerciseType` in `learn/lessons.ts`, add the component in `ui/exercises/`, and wire it into `LessonScreen.tsx`.
- **Changing state shape** — Bump `schemaVersion` in `store.ts` and handle migrations in `load()`, or existing users will lose data.
- **Changing i18n strings** — Keep `de` and `en` dictionaries in sync. The `TranslationKey` type is derived from the German dictionary, so new keys must be added there first.
