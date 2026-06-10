# 🎯 Darts Checkout Learner

A Duolingo-style PWA for memorizing every 2- and 3-dart checkout (2–170),
tailored to your favourite doubles. Free forever, fully offline, installs to
the home screen on iPhone **and** Android. German/English.

## The idea

Set up to two favourite doubles (e.g. D20 and D16). Every checkout route is
then recalibrated so the final dart lands on a favourite whenever sensible:

1. Score **is** a favourite double → take it directly
2. Route ending on favourite #1, if one exists within 3 darts
3. Otherwise favourite #2 (fewer darts wins; tie goes to #1)
4. Otherwise the textbook route (e.g. 170 stays T20 T20 Bull)

Daily lessons (~10 exercises) mix spaced-repetition reviews with new
checkouts from a 5-stage progression tree. Exercise types: flashcard recall,
dartboard tapping (wedge + S/D/T buttons), and tile ordering. A valid but
untaught route counts as "also works" and resurfaces sooner.

## Development

```bash
npm install
npm test        # engine unit tests (every chart entry is validated)
npm run dev     # local dev server
npm run build   # production build into dist/
```

## Deploying to GitHub Pages (free hosting)

1. Create a free GitHub account and an empty repository
2. Push this folder to the repo's `main` branch
3. In the repo: **Settings → Pages → Source: GitHub Actions**
4. The included workflow (`.github/workflows/deploy.yml`) tests, builds and
   deploys automatically on every push
5. Your app lives at `https://<user>.github.io/<repo>/`

## Installing on your iPhone

1. Open the URL in **Safari**
2. Tap **Share → Add to Home Screen**
3. Launch from the home screen icon — works fully offline from then on

On Android: open in Chrome → "Install app" prompt.

## Data & privacy

Everything is stored locally on the device (localStorage). No accounts, no
server, no tracking. Use **Settings → Backup** to export/import your progress
as a JSON file. The optional 4-digit PIN gates the UI on app open.
