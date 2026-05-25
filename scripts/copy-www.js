// Copies the static web app into ./www so Capacitor can sync it to
// the Android project. Kept dependency-free so it works on a fresh
// `npm install` without extra modules.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'www');

const FILES = [
    'index.html',
    'hub.html',
    'walk.html',
    'analysis.html',
    'profile.html',
    'manifest.webmanifest',
    'sw.js'
];

const DIRS = ['assets'];

function rimraf(target) {
    if (!fs.existsSync(target)) return;
    for (const entry of fs.readdirSync(target)) {
        const p = path.join(target, entry);
        const stat = fs.lstatSync(p);
        if (stat.isDirectory()) rimraf(p);
        else fs.unlinkSync(p);
    }
    fs.rmdirSync(target);
}

function copyDir(src, dst) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
        const sp = path.join(src, entry);
        const dp = path.join(dst, entry);
        const stat = fs.lstatSync(sp);
        if (stat.isDirectory()) copyDir(sp, dp);
        else fs.copyFileSync(sp, dp);
    }
}

rimraf(OUT);
fs.mkdirSync(OUT, { recursive: true });

for (const f of FILES) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) {
        console.warn(`[copy-www] skip missing file: ${f}`);
        continue;
    }
    fs.copyFileSync(src, path.join(OUT, f));
}

for (const d of DIRS) {
    const src = path.join(ROOT, d);
    if (!fs.existsSync(src)) {
        console.warn(`[copy-www] skip missing dir: ${d}`);
        continue;
    }
    copyDir(src, path.join(OUT, d));
}

console.log(`[copy-www] wrote ${OUT}`);
