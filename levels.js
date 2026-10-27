'use strict';
// Poziomy budowane z prostokątów. Kafelki: '#' ziemia, 'B' cegła,
// '@' start, 'E' wyjście, 'P' teleport do komendy, '$' moneta.
function buildLevel(W, H, fn) {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const api = {
    rect(c1, r1, c2, r2, ch = '#') {
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) g[r][c] = ch;
    },
    clear(c1, r1, c2, r2) { api.rect(c1, r1, c2, r2, '.'); },
    put(c, r, ch) { g[r][c] = ch; },
    coins(c1, c2, r) {
      for (let c = c1; c <= c2; c++) if (g[r][c] === '.') g[r][c] = '$';
    },
  };
  fn(api);
  return g.map((row) => row.join(''));
}

// Układ: dół (stoimy w rzędzie 14), środek (rząd 9) i góra (rząd 4); wysokość 16 kafli.
function skeleton(L, W) {
  L.rect(0, 0, W - 1, 0); L.rect(0, 0, 0, 15); L.rect(W - 1, 0, W - 1, 15); L.rect(0, 15, W - 1, 15);
  L.rect(5, 8, 6, 9, 'B'); L.rect(3, 6, 4, 7, 'B'); // schody z piętra środkowego na górne
  L.put(2, 14, '@');
}
const LEVELS = [
  {
    name: 'Ulica Podatkowa',
    taxDelay: 4.0, copHp: 2, copSpeed: 70,
    rows: buildLevel(48, 16, (L) => {
      skeleton(L, 48);
      L.clear(14, 15, 16, 15);
      L.rect(8, 13, 9, 14, 'B'); L.rect(22, 13, 23, 14, 'B'); L.put(27, 14, 'B');
      L.rect(42, 13, 43, 14, 'B'); L.rect(45, 11, 46, 14, 'B');
      L.rect(8, 10, 41, 10); L.clear(24, 10, 26, 10);
      L.rect(33, 8, 33, 9, 'B');
      L.rect(16, 8, 20, 8, 'B'); L.put(18, 9, 'P');
      L.rect(8, 5, 46, 5); L.clear(30, 5, 32, 5);
      L.rect(15, 3, 16, 4, 'B'); L.rect(38, 3, 39, 4, 'B');
      L.put(44, 4, 'E');
      L.coins(4, 7, 14); L.coins(18, 20, 12); L.coins(24, 26, 12);
      L.coins(10, 14, 8); L.coins(35, 40, 8); L.coins(9, 12, 3);
      L.coins(24, 28, 3); L.coins(34, 37, 2); L.coins(41, 43, 3);
    }),
  },
  {
    name: 'Alejami Akcyzy',
    taxDelay: 3.2, copHp: 3, copSpeed: 85,
    rows: buildLevel(56, 16, (L) => {
      skeleton(L, 56);
      L.clear(12, 15, 14, 15); L.clear(34, 15, 36, 15);
      L.rect(7, 13, 8, 14, 'B'); L.rect(18, 13, 19, 14, 'B');
      L.rect(22, 13, 26, 13, 'B'); L.put(24, 14, 'P');
      L.rect(30, 13, 31, 14, 'B'); L.rect(40, 13, 41, 14, 'B');
      L.rect(44, 13, 45, 14, 'B'); L.rect(47, 11, 48, 14, 'B');
      L.rect(8, 10, 43, 10); L.clear(28, 10, 30, 10);
      L.rect(36, 8, 37, 9, 'B'); L.rect(13, 8, 13, 9, 'B');
      L.rect(18, 8, 22, 8, 'B'); L.put(20, 9, 'P');
      L.rect(8, 5, 54, 5); L.clear(24, 5, 26, 5);
      L.rect(14, 3, 15, 4, 'B'); L.rect(44, 3, 45, 4, 'B');
      L.put(52, 4, 'E');
      L.coins(3, 6, 14); L.coins(10, 11, 14); L.coins(20, 21, 11);
      L.coins(37, 38, 14); L.coins(14, 16, 8); L.coins(24, 27, 8);
      L.coins(38, 42, 8); L.coins(9, 13, 3); L.coins(19, 22, 3);
      L.coins(30, 40, 3); L.coins(47, 50, 3);
    }),
  },
  {
    name: 'Zaułek Zaległości',
    taxDelay: 2.5, copHp: 4, copSpeed: 100,
    rows: buildLevel(64, 16, (L) => {
      skeleton(L, 64);
      L.clear(10, 15, 12, 15); L.clear(38, 15, 40, 15);
      L.rect(6, 13, 7, 14, 'B'); L.rect(16, 13, 17, 14, 'B');
      L.rect(24, 13, 28, 13, 'B'); L.put(26, 14, 'P');
      L.rect(32, 13, 33, 14, 'B'); L.rect(46, 13, 47, 14, 'B');
      L.rect(54, 13, 55, 14, 'B'); L.rect(57, 11, 58, 14, 'B');
      L.rect(8, 10, 53, 10); L.clear(36, 10, 38, 10);
      L.rect(44, 8, 45, 9, 'B'); L.rect(18, 8, 18, 9, 'B'); L.rect(12, 8, 12, 9, 'B');
      L.rect(26, 8, 30, 8, 'B'); L.put(28, 9, 'P');
      L.rect(8, 5, 62, 5); L.clear(20, 5, 22, 5); L.clear(40, 5, 42, 5);
      L.rect(12, 3, 13, 4, 'B'); L.rect(31, 3, 32, 4, 'B'); L.rect(50, 3, 51, 4, 'B');
      L.put(59, 4, 'E');
      L.coins(3, 5, 14); L.coins(8, 9, 14); L.coins(19, 22, 14);
      L.coins(34, 36, 14); L.coins(41, 44, 14); L.coins(13, 16, 8);
      L.coins(34, 40, 8); L.coins(46, 52, 8); L.coins(9, 11, 3);
      L.coins(15, 19, 3); L.coins(23, 29, 3); L.coins(34, 38, 3);
      L.coins(44, 49, 3); L.coins(54, 58, 3);
    }),
  },
];
if (typeof module !== 'undefined') module.exports = { LEVELS };
