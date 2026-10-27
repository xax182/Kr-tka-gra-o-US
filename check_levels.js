// Przybliżony sprawdzacz przejścia poziomów (BFS po polach, w których można stać).
const { LEVELS } = require('./levels.js');
for (const [i, lv] of LEVELS.entries()) {
  const rows = lv.rows, H = rows.length, W = rows[0].length;
  const bad = rows.find((r) => r.length !== W);
  if (bad) { console.log('L' + (i + 1), 'zła szerokość'); process.exitCode = 1; continue; }
  const solid = (c, r) => c < 0 || r < 0 || c >= W || r >= H ? true : '#B'.includes(rows[r][c]);
  const free = (c, r) => !solid(c, r);
  const stand = (c, r) => free(c, r) && solid(c, r + 1) && r < H - 1;
  let start, exit; const portals = [];
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '@') start = [c, r]; if (ch === 'E') exit = [c, r]; if (ch === 'P') portals.push([c, r]);
  }));
  const seen = new Set(), q = [start]; const key = (c, r) => c + ',' + r; seen.add(key(...start));
  const push = (c, r) => { if (!seen.has(key(c, r))) { seen.add(key(c, r)); q.push([c, r]); } };
  while (q.length) {
    const [c, r] = q.shift();
    for (const d of [-1, 1]) { // chód i spadanie
      if (!free(c + d, r)) continue;
      let rr = r; while (free(c + d, rr + 1) && rr < H - 1) rr++;
      if (rr < H - 1 && stand(c + d, rr)) push(c + d, rr);
    }
    let room = 0; while (room < 4 && free(c, r - 1 - room)) room++;
    const maxdx = room >= 3 ? 4 : room === 2 ? 3 : 2;
    for (let dx = -maxdx; dx <= maxdx; dx++) for (let t = r - Math.min(3, room); t < H - 1; t++) { // skoki
      if (!stand(c + dx, t) || dx === 0) continue;
      const h = Math.max(r - t, 1); let ok = true;
      for (let k = 1; k <= h; k++) if (!free(c, r - k)) ok = false;
      const top = Math.min(r, t) - 1;
      const lo = Math.min(c, c + dx), hi = Math.max(c, c + dx);
      for (let x = lo; x <= hi; x++) if (!free(x, top)) ok = false;
      if (ok) push(c + dx, t);
    }
  }
  if (process.env.DBG !== undefined && +process.env.DBG === i) rows.forEach((row, r) => console.log(String(r).padStart(2), [...row].map((ch, c) => (seen.has(key(c, r)) ? 'x' : ch)).join('')));
  const reach = (p) => seen.has(key(...p));
  console.log(`L${i + 1} ${lv.name}: wyjście ${reach(exit) ? 'OK' : 'NIEOSIĄGALNE'}, teleporty ${portals.map((p) => (reach(p) ? 'OK' : 'NIE')).join('/')}`);
  if (!reach(exit) || !portals.every(reach)) process.exitCode = 1;
}
