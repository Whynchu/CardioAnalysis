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

## Storage
All state (profile, recent CSVs, saved analyses, accent color) is kept in `localStorage` under the `cardioanalysis:*` namespace.
