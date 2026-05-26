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

### Easiest path — let GitHub build the APK for you
A GitHub Actions workflow (`.github/workflows/android.yml`) builds a
debug `.apk` on every push to `main`. No Android Studio required.

1. After a push finishes, open the repo → **Actions** tab → click the
   latest "Android APK" run → scroll to **Artifacts** → download
   `CardioAnalysis-apk.zip`. Unzip → you get `CardioAnalysis-N.apk`.
2. To install on your phone with no cable:
   - Upload the `.apk` to Google Drive (or any file host), grab the
     share link.
   - Generate a QR for that link (e.g. qr-code-generator.com).
   - On the phone, scan → Chrome downloads the APK → tap the file →
     allow "install from unknown sources" once → installed.
3. To make a public release with a stable download URL, tag a commit:
   `git tag v0.1.0 && git push --tags`. The same workflow then
   attaches the APK to a GitHub Release — that URL is what you put
   behind a QR code.

### Local build (optional, for iterating with a debugger)
If you want to step through code or push directly to a tethered phone:

1. Install [Android Studio](https://developer.android.com/studio)
   (gives you the Android SDK + JDK 17) and Node 18+.
2. From the repo root:
   ```
   npm install
   npm run cap:sync
   npm run cap:open:android
   ```
   Android Studio opens the generated `android/` project.
3. Plug in your phone (USB debugging on) and hit the green ▶ in
   Android Studio to install + launch the debug build.

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
