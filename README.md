# CardioAnalysis

A browser-based heart-rate session review tool for combat-sports and weight-training workouts.

Load a CSV exported from the HR timer and the dashboard scores the session, classifies the training type, and renders a per-second HR chart with round shading, zone reference lines, and recovery metrics.

## Pages
- `index.html` — HR timer
- `analysis.html` — session review dashboard
- `hub.html` — entry point / launcher
- `profile.html` — athlete profile (age, sex, height, weight)

## CSV format
Columns: `time_s, phase, round, time_left_s, hr_bpm`
Optional metadata lines prefixed with `#` (e.g. `#session_type=mixed`, `#max_hr=190`).

Sample CSVs live in `pieces/`.

## Running
Open `hub.html` (or any page) directly in a browser — no build step.

## Install as a PWA
Open the site in Chrome on Android/desktop and use **Install app** /
**Add to Home screen**. The app then runs fullscreen, gets a launcher
icon, and works offline (service worker caches all five pages on first
visit).

## Build as a native Android app (Capacitor)
The repo is wired to Capacitor so the exact same HTML/JS can be
shipped as a real `.apk`. Use this when you need GPS that doesn't get
suspended by Chrome (long walks/runs with the screen off, etc.).

**One-time setup on your dev machine:**
1. Install [Android Studio](https://developer.android.com/studio)
   (gives you the Android SDK + JDK 17).
2. Install Node 18+.
3. From the repo root:
   ```
   npm install
   npm run cap:sync
   npm run cap:open:android
   ```
   Android Studio opens the generated `android/` project.
4. Plug in your phone (USB debugging on) and hit the green ▶ in
   Android Studio to install + launch the debug build.

**To produce a signed release APK:**
1. In Android Studio: **Build → Generate Signed Bundle / APK → APK**.
2. Create a keystore the first time (keep the `.jks` file safe —
   ignored by git).
3. Output lands in `android/app/release/`.

**Re-syncing after changing the web app:**
```
npm run cap:sync
```
That copies the current HTML/assets into `www/`, syncs them into the
Android project, and refreshes the native plugin wiring.

Permissions already declared in `AndroidManifest.xml`: `INTERNET`,
`ACCESS_FINE/COARSE_LOCATION`, `WAKE_LOCK`, `FOREGROUND_SERVICE`,
`FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`.

## Storage
All state (profile, recent CSVs, saved analyses, accent color) is kept in `localStorage` under the `cardioanalysis:*` namespace.
