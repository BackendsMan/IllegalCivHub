# TFB Illegal Civ Hub

React (Vite) + Tailwind v4 + Framer Motion + Firebase + React-Leaflet.

## Structure

```
assets/
  MenyooBackgroundPictures/   homepage slideshow + blurred page backdrops (auto-loaded)
  Rules Of Engagements/       original ROE text (source for src/content/roe.jsx)
  TFBLogo.png                 site logo + browser tab icon
scripts/seed-admins.mjs       one-time: creates the 10 management accounts
scripts/build-map-tiles.py    regenerates the glowing turf-map tiles in public/map-tiles
src/
  main.jsx, App.jsx           entry + routes + page transitions
  index.css                   Tailwind theme: dark + light colors, fonts, glow
  ui.jsx                      shared buttons, icons, Page wrapper, backgrounds list
  firebase.js                 Firebase init (reads .env)
  admins.js                   management usernames
  questions.js                thread application questions
  useAuth.js                  auth state hook
  content/roe.jsx             ROE text shown on /roe (layout ported from the FactionROE site)
  pages/                      Home, Roe, Submit, TurfMap, Login, Admin
firestore.rules, firebase.json
```

## Run locally

Requires Node 20+.

```
npm install
npm run dev                    # http://localhost:5173
```

Home, ROE and Turf Map work without Firebase. Submissions and the admin portal need it.

## Firebase setup (free Spark plan, no credit card)

Everything this site uses (Auth, Firestore, Hosting) is on Firebase's free **Spark** plan. Never click "Upgrade" and you can't be charged.
Free limits: 50k reads / 20k writes per day, 1 GB database, 10 GB hosting bandwidth per month. A community hub won't get near them.

1. Go to https://console.firebase.google.com → **Create a project**. Name it anything. Google Analytics: turn it off (not needed).
2. **Project settings** (gear icon) → **Your apps** → click the web icon `</>` → register the app (no hosting checkbox needed). Copy the values from `firebaseConfig` into `.env`:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
3. **Build → Authentication → Get started → Sign-in method** → enable **Email/Password** (leave "Email link" off).
4. **Build → Firestore Database → Create database** → pick a location near your players (e.g. `nam5` for the US; can't be changed later) → **Start in production mode**.
5. Install the Firebase CLI and deploy the security rules (run in this folder):
   ```
   npm install -g firebase-tools
   firebase login
   firebase use --add            # pick your project, alias "default"
   firebase deploy --only firestore:rules
   ```
6. Create the 10 management accounts, passing the shared password:
   ```
   npm run seed-admins -- <shared password>
   ```
   Each person signs in with their name as username. The password lives only in Firebase Auth, not in the code.
7. **Authentication → Settings → User actions** → untick **Enable create (sign-up)** so nobody else can make accounts.
8. Restart `npm run dev` so it picks up `.env`.

`.env` is committed on purpose: Firebase web config only identifies the project and is public in every Firebase site. `firestore.rules` is what protects the data.

### What the rules enforce
- Anyone can **create** an application, but only a well-formed `pending` one (all 17 answers, length limits, valid Streamable/YouTube and Discord links).
- Only the 10 admins can **read** applications.
- An admin can approve/deny a **pending** application once. `reviewedBy` must equal the signed-in admin's own name and `reviewedAt` must be the server time, so the "Approved by Seim on 10/09/2026 at 4:20 PM" log can't be faked.

Adding or removing an admin: update `src/admins.js` **and** the email list in `firestore.rules`, redeploy rules, re-run the seed script (temporarily re-tick *Enable create (sign-up)* first, then untick it again).

## Swapping content

- **Backgrounds**: drop images into `assets/MenyooBackgroundPictures/`. They're picked up automatically. The originals are 2–4 MB PNGs; exporting them as ~300 KB JPG/WebP makes the homepage load much faster.
- **Logo**: overwrite `assets/TFBLogo.png`.
- **Application questions**: edit `src/questions.js` (and `firestore.rules` if you add/remove a question or change a limit).
- **ROE**: edit `src/content/roe.jsx`. Each section has a title and a body built from `<Rules items=[...]>`, `<Sub>`, `<Warn>`, `<Chips>` and `<Tiers>`.
- **Turf map**: Liberty City tiles with the orange coastline glow baked in live in `public/map-tiles/` (made from the open-source `interactive-game-maps/grand_theft_auto_iv` tiles, the same source as tfb.turf-map.io). To change the glow, edit `BANDS` in `scripts/build-map-tiles.py` and run `python scripts/build-map-tiles.py` (needs Pillow + numpy). The TFB logo position is `LOGO_BOUNDS` in `src/pages/TurfMap.jsx`. Turfs aren't drawn yet; the side panel says "Will Be Updated Soon".

## Put it online (GitHub Pages, free)

1. Create a GitHub repo and push this folder to the `main` branch.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` builds and publishes via `.github/workflows/deploy.yml`. The site appears at `https://<username>.github.io/<repo>/` (link shown in the **Actions** tab).

Pages use `#/` URLs (e.g. `…/#/roe`) so links work on static hosting.
