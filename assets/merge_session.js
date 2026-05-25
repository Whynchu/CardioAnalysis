// Merge an external HR-only CSV (1 Hz wall-clock) into a walk/run session CSV
// and produce a cleaned-up combined file with GPS jump filtering.
//
// Usage: node merge_session.js <hrCsv> <walkCsv> <outCsv>

const fs = require('fs');
const path = require('path');

function parseHr(file) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(l => l.trim());
    // header: "Date/Time", "Heart Rate (bpm)"
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const m = lines[i].match(/^"([^"]+)"\s*,\s*(\d+)/);
        if (!m) continue;
        // "May 25, 2026 at 17:53:50"  -> parse manually
        const dm = m[1].match(/^(\w+)\s+(\d+),\s+(\d+)\s+at\s+(\d+):(\d+):(\d+)$/);
        if (!dm) continue;
        const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
        const d = new Date(+dm[3], months[dm[1].slice(0, 3)], +dm[2], +dm[4], +dm[5], +dm[6]);
        rows.push({ epoch: d.getTime() / 1000, hr: +m[2] });
    }
    return rows;
}

function parseWalk(file) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    const meta = [];
    const data = [];
    let header = null;
    for (const ln of lines) {
        if (!ln.trim()) continue;
        if (ln.startsWith('#')) meta.push(ln);
        else if (!header) header = ln.split(',');
        else data.push(ln.split(','));
    }
    return { meta, header, data };
}

function haversineM(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

function main() {
    const [hrFile, walkFile, outFile] = process.argv.slice(2);
    const hr = parseHr(hrFile);
    const walk = parseWalk(walkFile);

    // Align: assume HR start = walk t=0.
    const hrStartEpoch = hr[0].epoch;
    // Map t_seconds -> hr by snapping to nearest second in the HR series.
    const hrByOffset = new Map();
    for (const r of hr) {
        const off = Math.round(r.epoch - hrStartEpoch);
        if (!hrByOffset.has(off)) hrByOffset.set(off, r.hr);
    }

    const idx = {
        time: walk.header.indexOf('time_s'),
        hr: walk.header.indexOf('hr_bpm'),
        lat: walk.header.indexOf('lat'),
        lon: walk.header.indexOf('lon'),
        speed: walk.header.indexOf('speed_mps')
    };

    // GPS cleaning pass:
    //   - Walking realistic max speed: 2.5 m/s steady, 3.5 m/s burst.
    //   - We compute instantaneous speed from haversine between consecutive
    //     accepted points. If it exceeds maxStep m/s, we DROP that GPS fix
    //     (zero out lat/lon/speed for that sample so it doesn't pollute pace).
    const MAX_STEP_MPS = 4.0; // anything above this is GPS teleport
    let lastLat = null, lastLon = null, lastT = null;
    let cleanedFixes = 0, droppedFixes = 0;
    let totalDistM = 0;

    const out = [];
    for (const row of walk.data) {
        const r = row.slice(); // mutable
        const t = parseFloat(r[idx.time]);

        // Fill HR
        const hrVal = hrByOffset.get(t) ?? hrByOffset.get(Math.round(t));
        if (hrVal != null) r[idx.hr] = String(hrVal);

        // GPS cleaning
        const lat = parseFloat(r[idx.lat]);
        const lon = parseFloat(r[idx.lon]);
        if (isFinite(lat) && isFinite(lon) && (lat !== 0 || lon !== 0)) {
            if (lastLat != null) {
                const dt = Math.max(1, t - lastT);
                const dm = haversineM(lastLat, lastLon, lat, lon);
                const v = dm / dt;
                if (v > MAX_STEP_MPS) {
                    // Drop this fix entirely — keep timing but blank GPS.
                    r[idx.lat] = '';
                    r[idx.lon] = '';
                    r[idx.speed] = '';
                    droppedFixes++;
                    out.push(r);
                    continue;
                }
                totalDistM += dm;
            }
            lastLat = lat; lastLon = lon; lastT = t;
            cleanedFixes++;
        }
        out.push(r);
    }

    // Update #distance_m in meta to reflect cleaned distance.
    const newMeta = walk.meta.map(line => {
        if (line.startsWith('#distance_m=')) return `#distance_m=${Math.round(totalDistM)}`;
        return line;
    });

    const lines = [...newMeta, walk.header.join(','), ...out.map(r => r.join(','))];
    fs.writeFileSync(outFile, lines.join('\n') + '\n');

    // ---- Pacing analysis ----
    const totalT = parseFloat(out[out.length - 1][idx.time]);
    const km = totalDistM / 1000;
    const secPerKm = totalT / km;
    const min = Math.floor(secPerKm / 60), sec = Math.round(secPerKm % 60);
    const secPerMi = secPerKm * 1.609344;
    const minMi = Math.floor(secPerMi / 60), secMi = Math.round(secPerMi % 60);

    // Rolling 8 s pace from raw speed_mps
    const speeds = out.map(r => parseFloat(r[idx.speed])).map(v => isFinite(v) ? v : 0);
    const W = 8;
    let maxRolling = 0;
    for (let i = W - 1; i < speeds.length; i++) {
        let s = 0;
        for (let j = i - W + 1; j <= i; j++) s += speeds[j];
        const avg = s / W;
        if (avg > maxRolling) maxRolling = avg;
    }
    const maxPaceSecPerKm = maxRolling > 0 ? 1000 / maxRolling : Infinity;
    const mp = Math.floor(maxPaceSecPerKm / 60), sp = Math.round(maxPaceSecPerKm % 60);

    console.log('--- Merge summary ---');
    console.log(`HR samples loaded:     ${hr.length}`);
    console.log(`Walk samples:          ${walk.data.length}`);
    console.log(`HR-matched samples:    ${out.filter(r => r[idx.hr] && r[idx.hr] !== '').length}`);
    console.log(`GPS fixes accepted:    ${cleanedFixes}`);
    console.log(`GPS fixes dropped:     ${droppedFixes} (jumps > ${MAX_STEP_MPS} m/s)`);
    console.log(`Cleaned distance:     ${(totalDistM).toFixed(0)} m  (${km.toFixed(2)} km, ${(km * 0.621371).toFixed(2)} mi)`);
    console.log(`Original meta dist:    ${walk.meta.find(l => l.startsWith('#distance_m='))}`);
    console.log(`Total time:            ${totalT} s  (${(totalT / 60).toFixed(1)} min)`);
    console.log(`Avg pace:              ${min}:${String(sec).padStart(2, '0')} /km   ${minMi}:${String(secMi).padStart(2, '0')} /mi`);
    console.log(`Max 8-s rolling pace:  ${mp}:${String(sp).padStart(2, '0')} /km  (peak ${maxRolling.toFixed(2)} m/s)`);
    console.log(`Output:                ${path.resolve(outFile)}`);
}

main();
