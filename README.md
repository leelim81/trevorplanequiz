# Trevor Plane Quiz ✈️

A picture quiz for Trevor: airline logos, car logos and country flags. Earn points and coins,
play the claw machine for plane trading cards, and build 3D planes.

Live site: **https://leelim81.github.io/trevorplanequiz/**

Plain HTML + CSS + JavaScript (no build step), Firebase for Google sign-in and data, Three.js for the 3D bits.

## How to play
- Sign in with Google and pick a pilot name.
- **Play**: pick Airlines, Cars, Flags or Mixed. You have 3 lives. Each question shows a picture and 4 answers.
  Answer inside the gold part of the timer bar (first second) for a bonus point. 3 points = 1 coin.
- **Claw machine**: 1 coin per try, 50% chance to win a trading card. Watch the video to unwrap the card.
- Each plane has 4 cards (nose, wings, fuselage, tail). Collect all 4 and watch the plane build itself in 3D.
- **Leaderboard** shows the best single runs. Tap a pilot to see their hangar and badges.

## One-time Firebase setup (about 10 minutes)

1. Go to https://console.firebase.google.com → **Add project** → name it `trevorplanequiz` → turn Google Analytics off → Create.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable**. Pick a support email → Save.
3. **Authentication → Settings → Authorized domains → Add domain** → `leelim81.github.io`. (`localhost` is already there for testing.)
4. **Build → Firestore Database → Create database → Start in production mode**. Location: `asia-southeast1` (Singapore) or the one nearest you → Enable.
5. **Firestore → Rules** tab → delete what is there, paste the contents of [`firestore.rules`](firestore.rules) → **Publish**.
6. **Project settings (gear icon) → General → Your apps → Web (`</>`)**. Nickname `trevorplanequiz`, leave *Firebase Hosting* unticked → Register app.
   Copy the `const firebaseConfig = { … }` block and paste the values into [`js/config.js`](js/config.js). It is safe to commit — the key only identifies the project; the rules protect the data.
7. Commit and push. The site switches from "Guest mode" to Google sign-in automatically.

You do **not** need Firebase Storage or the Blaze plan. The free Spark plan covers this game easily.

## Adding the reward videos

The reward clips live in `assets/videos/` as `reward1.mp4` … `reward4.mp4` (add more by listing them in `GAME.VIDEOS` in `js/config.js`). Big files are fine
locally; before committing, shrink each one (about 30 s → ~3 MB):

```bash
ffmpeg -i input.mp4 -vf "scale=-2:720" -c:v libx264 -crf 28 -preset slow -c:a aac -b:a 96k -movflags +faststart assets/videos/reward1.mp4
```

If a clip fails to load, the game shows the card after a short pause instead.

To test without signing in, open the site with `?guest=1` added to the URL.

## Tuning

All the knobs are in [`js/config.js`](js/config.js): timer length, bonus window, lives, points per coin, claw win chance.

## Rebuilding the assets

- `node tools/fetch-assets.mjs` downloads the logos and flags and writes `data/*.json`.
- `./tools/prepare-models.sh` downloads the 3D models, converts the two glTF 1.0 files and shrinks everything into `assets/models/`.
- `debug/models.html` shows each model with its four card slices (open it from the local server).

Run locally with any static server, e.g. `python3 -m http.server 8765` then open http://localhost:8765/.

## Credits
See [CREDITS.md](CREDITS.md) — 3D models from Flightradar24 / FlightAirMap (GPLv2) and poly.pizza (CC-BY), flags from flagcdn.com, logos from public datasets.
