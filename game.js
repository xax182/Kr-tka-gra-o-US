'use strict';
// "Uciekaj przed US" – platformówka w stylu Mario, Phaser 3, sterowanie dotykiem (iPad) i klawiaturą.

const TILE = 32, VW = 800, VH = 512;
const SPEED = 190, JUMP = 520, GRAV = 1300;
const START_LIVES = 5;
const TEXT = { fontFamily: '"Trebuchet MS", Arial, sans-serif', fontSize: '20px', color: '#fff', stroke: '#000', strokeThickness: 4 };

/* ---------- dźwięk (WebAudio, bez plików) ---------- */
const Sfx = {
  ctx: null,
  init() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { /* brak dźwięku to nie tragedia */ }
  },
  tone(f1, f2, dur, type = 'square', vol = 0.07, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  play(n) {
    switch (n) {
      case 'jump': this.tone(300, 700, 0.14); break;
      case 'coin': this.tone(990, 990, 0.07); this.tone(1320, 1320, 0.16, 'square', 0.07, 0.07); break;
      case 'stomp': this.tone(260, 60, 0.18, 'sawtooth', 0.1); break;
      case 'hurt': this.tone(200, 50, 0.35, 'sawtooth', 0.1); break;
      case 'portal': this.tone(200, 1400, 0.45, 'triangle', 0.1); break;
      case 'alarm': this.tone(900, 600, 0.12, 'square', 0.06); this.tone(900, 600, 0.12, 'square', 0.06, 0.16); break;
      case 'door': this.tone(120, 400, 0.4, 'triangle', 0.1); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.18, 'square', 0.07, i * 0.12)); break;
      case 'die': [400, 300, 200, 120].forEach((f, i) => this.tone(f, f * 0.8, 0.2, 'square', 0.07, i * 0.14)); break;
    }
  },
};
['pointerdown', 'touchend', 'keydown'].forEach((ev) => document.addEventListener(ev, () => Sfx.init(), { passive: true }));
document.addEventListener('gesturestart', (e) => e.preventDefault());

/* ---------- tekstury rysowane w kodzie (pixel art) ---------- */
const BODY = {
  player: [
    '................', '.....kkkkkk.....', '....kkkkkkkk....', '....kkssssss....',
    '....kssseess....', '....ssssssss....', '......ssmss.....', '....bbbbbbbb....',
    '...sbbbbbbbbs...', '...sbbbbbbbbs...', '....bbbbbbbb....',
  ],
  tax: [
    '................', '.....hhhhhh.....', '....hhhhhhhh....', '....ssssssss....',
    '....sGGssGGs....', '....ssssssss....', '......ssmss.....', '....gggrrggg....',
    '...sgggrrgggs...', '...sgggrrgggs...', '....gggrrggg....',
  ],
  cop: [
    '................', '....nnnnnnnn....', '...nnnnyynnnn...', '..nnnnnnnnnnnn..',
    '....ssssssss....', '....ssseesss....', '....ssssssss....', '......ssss......',
    '...nnnnnnnnnn...', '..snnnnyynnnns..', '..snnnnnnnnnns..',
  ],
};
const LEGS = [
  ['....dddddddd....', '....dddddddd....', '....dd....dd....', '....dd....dd....', '...oooo..oooo...'],
  ['....dddddddd....', '.....ddddddd....', '....dd.....dd...', '...dd.......dd..', '..ooo.......ooo.'],
  ['....dddddddd....', '....dddddd......', '.....dddd.......', '.....dd.dd......', '....oooo.oooo...'],
];
const PAL = {
  k: '#3a2212', s: '#f2c9a0', e: '#111111', b: '#2f6fd6', o: '#2a1a0e', m: '#b5524a',
  h: '#c9c9c9', G: '#222222', g: '#8d94a0', r: '#d32f2f', n: '#1d3f9e', y: '#ffd23f',
};
const LEG_COLOR = { player: '#2b2d42', tax: '#454a57', cop: '#14213d' };

function canvasTex(scene, key, w, h, draw) {
  const t = scene.textures.createCanvas(key, w, h);
  draw(t.getContext(), w, h); t.refresh();
}

function makeTextures(scene) {
  const px = (ctx, rows, pal, s) => rows.forEach((row, y) => [...row.padEnd(16, '.')].forEach((ch, x) => {
    if (ch === '.') return;
    ctx.fillStyle = pal[ch]; ctx.fillRect(x * s, y * s, s, s);
  }));
  for (const who of Object.keys(BODY)) {
    for (let f = 0; f < 3; f++) {
      canvasTex(scene, `${who}_${f}`, 32, 32, (ctx) => {
        px(ctx, BODY[who].concat(LEGS[f]), { ...PAL, d: LEG_COLOR[who] }, 2);
      });
    }
  }
  const noise = (ctx, c1, c2, n) => { // drobne kropki ziemi
    for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? c1 : c2; ctx.fillRect((i * 13) % 30, (i * 7 + 5) % 28, 3, 2); }
  };
  canvasTex(scene, 'dirt', 32, 32, (ctx) => {
    ctx.fillStyle = '#9a6330'; ctx.fillRect(0, 0, 32, 32); noise(ctx, '#7c4b22', '#b27a42', 14);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 30, 32, 2); ctx.fillRect(30, 0, 2, 32);
  });
  canvasTex(scene, 'grass', 32, 32, (ctx) => {
    ctx.fillStyle = '#9a6330'; ctx.fillRect(0, 0, 32, 32); noise(ctx, '#7c4b22', '#b27a42', 10);
    ctx.fillStyle = '#3fa64a'; ctx.fillRect(0, 0, 32, 9);
    ctx.fillStyle = '#7bd66b'; ctx.fillRect(0, 0, 32, 3);
    ctx.fillStyle = '#3fa64a'; for (let x = 0; x < 32; x += 8) ctx.fillRect(x, 9, 4, 3);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 30, 32, 2); ctx.fillRect(30, 0, 2, 32);
  });
  canvasTex(scene, 'brick', 32, 32, (ctx) => {
    ctx.fillStyle = '#c4622f'; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#6b2e12';
    ctx.fillRect(0, 0, 32, 2); ctx.fillRect(0, 15, 32, 2); ctx.fillRect(0, 30, 32, 2);
    ctx.fillRect(15, 2, 2, 13); ctx.fillRect(7, 17, 2, 13); ctx.fillRect(23, 17, 2, 13);
    ctx.fillStyle = '#e48b57'; ctx.fillRect(2, 2, 12, 2); ctx.fillRect(18, 2, 12, 2); ctx.fillRect(10, 17, 12, 2);
  });
  canvasTex(scene, 'coin', 32, 32, (ctx) => {
    ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.ellipse(16, 16, 9, 11, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(16, 16, 7, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff2a8'; ctx.fillRect(13, 9, 3, 10);
  });
  canvasTex(scene, 'portal', 32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 2, 16, 16, 15);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#7fd8ff'); g.addColorStop(0.7, '#6a3df0'); g.addColorStop(1, 'rgba(90,40,200,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = '#1d3f9e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(16, 16, 11, 0.3, 4.2); ctx.stroke();
  });
  canvasTex(scene, 'badge', 16, 16, (ctx) => { // gwiazda policyjna
    ctx.fillStyle = '#ffd23f'; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3 : 7; ctx.lineTo(8 + Math.cos(a) * r, 8 + Math.sin(a) * r); }
    ctx.fill();
  });
  canvasTex(scene, 'flag', 32, 64, (ctx) => { // biało-czerwona flaga = granica
    ctx.fillStyle = '#ddd'; ctx.fillRect(6, 0, 4, 64);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(4, 0, 8, 4);
    ctx.fillStyle = '#fff'; ctx.fillRect(10, 5, 20, 8);
    ctx.fillStyle = '#d32f2f'; ctx.fillRect(10, 13, 20, 8);
    ctx.strokeStyle = '#555'; ctx.strokeRect(10.5, 5.5, 19, 15);
  });
  canvasTex(scene, 'door', 32, 32, (ctx) => {
    ctx.fillStyle = '#5b6370'; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#2d323b'; for (let x = 4; x < 32; x += 8) ctx.fillRect(x, 0, 3, 32);
    ctx.fillStyle = '#8b94a3'; ctx.fillRect(0, 0, 32, 2); ctx.fillRect(0, 30, 32, 2);
  });
  canvasTex(scene, 'police_floor', 32, 32, (ctx) => {
    ctx.fillStyle = '#3a4250'; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#2c333e'; ctx.fillRect(0, 0, 16, 16); ctx.fillRect(16, 16, 16, 16);
    ctx.fillStyle = '#6c778a'; ctx.fillRect(0, 0, 32, 2);
  });
  canvasTex(scene, 'police_wall', 32, 32, (ctx) => {
    ctx.fillStyle = '#26324f'; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#1b253d'; ctx.fillRect(0, 15, 32, 2); ctx.fillRect(15, 0, 2, 15); ctx.fillRect(7, 17, 2, 15); ctx.fillRect(23, 17, 2, 15);
  });
  canvasTex(scene, 'sky', VW, VH, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#4a86f0'); g.addColorStop(1, '#bfe3ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#7fcf86';
    for (const [x, w, h] of [[40, 220, 110], [300, 280, 150], [620, 260, 100]]) {
      ctx.beginPath(); ctx.ellipse(x + w / 2, VH, w / 2, h, 0, Math.PI, 0); ctx.fill();
    }
    ctx.fillStyle = '#5fb86a';
    for (const [x, w, h] of [[-60, 240, 70], [180, 200, 60], [470, 240, 80], [720, 200, 65]]) {
      ctx.beginPath(); ctx.ellipse(x + w / 2, VH, w / 2, h, 0, Math.PI, 0); ctx.fill();
    }
  });
  canvasTex(scene, 'cloud', 96, 40, (ctx) => {
    ctx.fillStyle = '#fff';
    for (const [x, y, r] of [[22, 26, 13], [42, 18, 17], [64, 24, 14], [78, 28, 10]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    ctx.fillRect(14, 26, 72, 12);
  });
}

/* ---------- sterowanie: klawiatura + przyciski dotykowe ---------- */
class Controls {
  constructor(scene) {
    this.scene = scene;
    scene.input.addPointer(3);
    this.keys = scene.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D', up: 'UP', w: 'W', space: 'SPACE', z: 'Z',
    });
    const forced = /[?&]touch=1/.test(location.search);
    this.showTouch = forced || scene.sys.game.device.input.touch;
    // strefy dotyku trochę większe niż narysowane przyciski
    this.zones = {
      left: new Phaser.Geom.Rectangle(0, 330, 150, 182),
      right: new Phaser.Geom.Rectangle(150, 330, 150, 182),
      jump: new Phaser.Geom.Rectangle(560, 300, 240, 212),
    };
    this.state = { left: false, right: false, jump: false };
    this.prevJump = false;
    this.pressed = false; // jump naciśnięty w tej klatce
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(1000);
    this.lastKey = '';
  }

  update() {
    const k = this.keys, s = { left: false, right: false, jump: false };
    s.left = k.left.isDown || k.a.isDown; s.right = k.right.isDown || k.d.isDown;
    s.jump = k.up.isDown || k.w.isDown || k.space.isDown || k.z.isDown;
    for (const p of this.scene.input.manager.pointers) {
      if (!p.isDown) continue;
      for (const n of ['left', 'right', 'jump']) if (this.zones[n].contains(p.x, p.y)) s[n] = true;
    }
    this.pressed = s.jump && !this.prevJump;
    this.prevJump = s.jump;
    const key = `${+s.left}${+s.right}${+s.jump}`;
    this.state = s;
    if (key !== this.lastKey) { this.lastKey = key; this.draw(); }
  }

  draw() {
    const g = this.gfx; g.clear();
    if (!this.showTouch) return;
    const s = this.state;
    const btn = (x, y, r, on, label) => {
      g.fillStyle(0x000000, on ? 0.55 : 0.28).fillCircle(x, y, r);
      g.lineStyle(4, 0xffffff, on ? 0.9 : 0.5).strokeCircle(x, y, r);
      g.fillStyle(0xffffff, on ? 0.95 : 0.65);
      if (label === 'L') g.fillTriangle(x - 18, y, x + 12, y - 20, x + 12, y + 20);
      if (label === 'R') g.fillTriangle(x + 18, y, x - 12, y - 20, x - 12, y + 20);
      if (label === 'J') g.fillTriangle(x, y - 22, x - 22, y + 14, x + 22, y + 14);
    };
    btn(70, 440, 52, s.left, 'L'); btn(220, 440, 52, s.right, 'R'); btn(710, 430, 62, s.jump, 'J');
  }
}

/* ---------- wspólny ruch bohatera ---------- */
function makeHero(scene, x, y) {
  const h = scene.physics.add.sprite(x, y, 'player_0').setDepth(6);
  h.body.setSize(18, 28).setOffset(7, 4);
  h.body.setMaxVelocity(400, 700);
  h.coyote = 0; h.buf = 0; h.animT = 0; h.jumping = false;
  return h;
}

function updateHero(h, c, dt) {
  const b = h.body, on = b.blocked.down;
  const dir = (c.state.right ? 1 : 0) - (c.state.left ? 1 : 0);
  let vx = b.velocity.x;
  const acc = on ? 2600 : 1600, fr = on ? 2400 : 500, step = dt / 1000;
  if (dir) { vx += dir * acc * step; vx = Phaser.Math.Clamp(vx, -SPEED, SPEED); h.setFlipX(dir < 0); }
  else vx -= Math.sign(vx) * Math.min(Math.abs(vx), fr * step);
  b.setVelocityX(vx);
  h.coyote = on ? 0.1 : h.coyote - step;
  h.buf = c.pressed ? 0.12 : h.buf - step;
  if (on) h.jumping = false;
  if (h.buf > 0 && h.coyote > 0) {
    b.setVelocityY(-JUMP); h.buf = 0; h.coyote = 0; h.jumping = true; Sfx.play('jump');
  }
  if (h.jumping && !c.state.jump && b.velocity.y < -160) { b.setVelocityY(b.velocity.y * 0.55); h.jumping = false; }
  h.animT += dt;
  if (!on) h.setTexture('player_1');
  else if (Math.abs(vx) > 25) h.setTexture(`player_${1 + (Math.floor(h.animT / 110) % 2)}`);
  else h.setTexture('player_0');
}

function puff(scene, x, y, color = 0xffffff, n = 8) {
  for (let i = 0; i < n; i++) {
    const c = scene.add.circle(x, y, Phaser.Math.Between(3, 6), color).setDepth(20);
    const a = (i / n) * Math.PI * 2;
    scene.tweens.add({ targets: c, x: x + Math.cos(a) * 34, y: y + Math.sin(a) * 34, alpha: 0, scale: 0.2, duration: 380, onComplete: () => c.destroy() });
  }
}

function hud(scene, name) {
  const reg = scene.registry;
  const lives = scene.add.text(12, 8, '', { ...TEXT, color: '#ff6b6b' }).setScrollFactor(0).setDepth(1001);
  const coins = scene.add.text(VW - 12, 8, '', { ...TEXT, color: '#ffe066' }).setOrigin(1, 0).setScrollFactor(0).setDepth(1001);
  scene.add.text(VW / 2, 8, name, { ...TEXT, fontSize: '16px' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1001);
  const refresh = () => { lives.setText('♥'.repeat(Math.max(reg.get('lives'), 0))); coins.setText(`${reg.get('coins')} zł`); };
  refresh();
  return refresh;
}

function banner(scene, text, ms = 2400, size = '30px') {
  const t = scene.add.text(VW / 2, 150, text, { ...TEXT, fontSize: size, align: 'center', strokeThickness: 6 })
    .setOrigin(0.5).setScrollFactor(0).setDepth(1002);
  scene.tweens.add({ targets: t, alpha: 0, delay: ms, duration: 500, onComplete: () => t.destroy() });
  return t;
}

/* ---------- scena: ładowanie ---------- */
class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    makeTextures(this);
    this.registry.set({ lives: START_LIVES, coins: 0, level: 0 });
    this.scene.start('Title');
  }
}

/* ---------- scena: tytuł ---------- */
class Title extends Phaser.Scene {
  constructor() { super('Title'); }
  init(data) { this.msg = data && data.msg; }
  create() {
    this.add.image(0, 0, 'sky').setOrigin(0);
    for (let i = 0; i < 5; i++) {
      const c = this.add.image(100 + i * 170, 60 + (i % 3) * 40, 'cloud').setScale(1.4);
      this.tweens.add({ targets: c, x: c.x + 40, duration: 4000 + i * 700, yoyo: true, repeat: -1 });
    }
    for (let x = 0; x < VW; x += TILE) { this.add.image(x + 16, VH - 48, 'grass'); this.add.image(x + 16, VH - 16, 'dirt'); }
    this.add.text(VW / 2, 90, 'UCIEKAJ PRZED US', { ...TEXT, fontSize: '56px', color: '#ffd23f', strokeThickness: 10 }).setOrigin(0.5);
    this.add.text(VW / 2, 150, 'Brunet kontra Urząd Skarbowy', { ...TEXT, fontSize: '24px' }).setOrigin(0.5);
    const hero = this.add.image(-40, VH - 96, 'player_1').setScale(2).setDepth(2);
    const tax = this.add.image(-200, VH - 96, 'tax_1').setScale(2).setDepth(2);
    let f = 0;
    this.time.addEvent({ delay: 120, loop: true, callback: () => { f ^= 1; hero.setTexture(`player_${1 + f}`); tax.setTexture(`tax_${1 + f}`); } });
    const run = () => {
      hero.x = -40; tax.x = -220;
      this.tweens.add({ targets: hero, x: VW + 80, duration: 4200 });
      this.tweens.add({ targets: tax, x: VW + 80, duration: 4200, delay: 500, onComplete: run });
    };
    run();
    if (this.msg) this.add.text(VW / 2, 215, this.msg, { ...TEXT, fontSize: '26px', align: 'center', color: '#fff2a8' }).setOrigin(0.5);
    const tip = this.add.text(VW / 2, 300, this.sys.game.device.input.touch
      ? 'Dotknij ekranu, aby zacząć' : 'Naciśnij spację lub kliknij, aby zacząć', { ...TEXT, fontSize: '28px' }).setOrigin(0.5);
    this.tweens.add({ targets: tip, alpha: 0.25, yoyo: true, repeat: -1, duration: 600 });
    this.add.text(VW / 2, 350, '◀ ▶ biegniesz   ▲ skaczesz   teleport = komenda policji: skacz policjantowi na głowę!',
      { ...TEXT, fontSize: '14px', strokeThickness: 3 }).setOrigin(0.5);
    let started = false;
    const go = () => {
      if (started) return; started = true; Sfx.init();
      this.registry.set({ lives: START_LIVES, coins: 0, level: 0 });
      this.scene.start('Game', { level: 0 });
    };
    this.time.delayedCall(250, () => { this.input.once('pointerdown', go); this.input.keyboard.once('keydown', go); });
  }
}

/* ---------- scena: poziom ---------- */
class Game extends Phaser.Scene {
  constructor() { super('Game'); }
  init(data) { this.levelIndex = data.level; }

  create() {
    const LV = this.lv = LEVELS[this.levelIndex];
    const rows = LV.rows, W = rows[0].length;
    this.coinBase = this.registry.get('coins');
    this.registry.set('level', this.levelIndex);
    this.ended = false; this.busy = false; this.clock = 0;

    this.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0).setDepth(-10);
    for (let i = 0; i < W / 6; i++) {
      this.add.image(i * 230 + Phaser.Math.Between(0, 100), Phaser.Math.Between(20, 200), 'cloud')
        .setScale(Phaser.Math.FloatBetween(1, 1.7)).setScrollFactor(0.3).setDepth(-9);
    }

    this.solids = this.physics.add.staticGroup();
    this.coinGroup = this.physics.add.staticGroup();
    this.portals = this.physics.add.staticGroup();
    let start = [0, 0], exit = null;
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const x = c * TILE + 16, y = r * TILE + 16;
      if (ch === '#') this.solids.create(x, y, r > 0 && rows[r - 1][c] === '#' ? 'dirt' : 'grass');
      else if (ch === 'B') this.solids.create(x, y, 'brick');
      else if (ch === '@') start = [x, y];
      else if (ch === 'E') exit = [x, y];
      else if (ch === '$') {
        const coin = this.coinGroup.create(x, y, 'coin').setDepth(2);
        this.tweens.add({ targets: coin, scaleX: 0.25, yoyo: true, repeat: -1, duration: 450, delay: (c * 40) % 400, ease: 'Sine.easeInOut' });
      } else if (ch === 'P') this.makePortal(x, y);
    }));
    this.exitFlag = this.physics.add.staticImage(exit[0], exit[1] - 16, 'flag').setDepth(2);
    this.exitFlag.body.setSize(24, 60).setOffset(4, 2);

    this.hero = makeHero(this, start[0], start[1] + 4);
    this.physics.world.gravity.y = GRAV;
    this.physics.add.collider(this.hero, this.solids);
    this.physics.add.overlap(this.hero, this.coinGroup, (h, coin) => {
      coin.destroy(); Sfx.play('coin');
      this.registry.set('coins', this.registry.get('coins') + 10); this.refreshHud();
    });
    this.physics.add.overlap(this.hero, this.portals, (h, p) => this.enterPortal(p));
    this.physics.add.overlap(this.hero, this.exitFlag, () => this.win());

    this.tax = this.add.image(start[0], start[1] + 4, 'tax_0').setDepth(5);
    this.trail = [{ t: 0, x: this.hero.x, y: this.hero.y, fl: false }];
    this.taxIdx = 0; this.lastTaxX = this.tax.x;
    this.arrow = this.add.text(0, 0, '', { ...TEXT, color: '#ff6b6b', fontSize: '26px' }).setScrollFactor(0).setDepth(1001).setVisible(false);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W * TILE, VH).startFollow(this.hero, true, 0.12, 0.12).setRoundPixels(true);
    cam.fadeIn(300);
    this.controls = new Controls(this);
    this.refreshHud = hud(this, `${this.levelIndex + 1}/${LEVELS.length}  ${LV.name}`);
    banner(this, `Poziom ${this.levelIndex + 1}: ${LV.name}\nBiegnij! Urząd rusza za ${LV.taxDelay.toFixed(0)} s`);
  }

  makePortal(x, y) {
    const p = this.portals.create(x, y, 'portal').setDepth(2);
    p.body.setSize(22, 28).setOffset(5, 4);
    p.glow = this.add.image(x, y, 'portal').setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
    p.star = this.add.image(x, y, 'badge').setDepth(3);
    this.tweens.add({ targets: p.glow, angle: 360, duration: 1800, repeat: -1 });
    this.tweens.add({ targets: [p, p.star], scale: 1.18, yoyo: true, repeat: -1, duration: 500 });
  }

  enterPortal(p) {
    if (this.busy || this.ended) return;
    this.busy = true; this.usedPortal = p;
    Sfx.play('portal');
    this.hero.body.setVelocity(0, 0);
    this.cameras.main.flash(250, 255, 255, 255);
    this.time.delayedCall(260, () => {
      this.scene.pause();
      this.scene.launch('Arena', { hp: this.lv.copHp, speed: this.lv.copSpeed });
    });
  }

  onArenaDone() { // wywoływane z Arena po pokonaniu policjanta
    this.scene.resume();
    const p = this.usedPortal; p.glow.destroy(); p.star.destroy(); p.destroy();
    this.cameras.main.flash(300, 255, 255, 255);
    this.busy = false;
  }

  win() {
    if (this.ended || this.busy) return;
    this.ended = true; Sfx.play('win'); this.hero.body.setVelocity(0, 0).setAllowGravity(false);
    banner(this, 'Uciekłeś! Urząd został w tyle…', 1200);
    this.time.delayedCall(1700, () => {
      if (this.levelIndex + 1 < LEVELS.length) this.scene.restart({ level: this.levelIndex + 1 });
      else this.scene.start('End', { win: true });
    });
  }

  die(text) {
    if (this.ended) return;
    this.ended = true; Sfx.play('die');
    this.hero.setTint(0xff6b6b).body.setVelocity(0, -300);
    this.hero.body.checkCollision.none = true;
    const lives = this.registry.get('lives') - 1;
    this.registry.set('lives', lives); this.registry.set('coins', this.coinBase); this.refreshHud();
    banner(this, text, 1100);
    this.time.delayedCall(1500, () => {
      if (lives <= 0) this.scene.start('End', { win: false });
      else this.scene.restart({ level: this.levelIndex });
    });
  }

  update(time, delta) {
    this.controls.update();
    if (this.ended) return;
    updateHero(this.hero, this.controls, delta);
    this.clock += delta;
    const h = this.hero;
    this.trail.push({ t: this.clock, x: h.x, y: h.y, fl: h.flipX });

    // urzędnik odtwarza Twoją drogę z opóźnieniem
    const target = this.clock - this.lv.taxDelay * 1000;
    while (this.trail[this.taxIdx + 1] && this.trail[this.taxIdx + 1].t <= target) this.taxIdx++;
    const p = this.trail[this.taxIdx];
    const moving = Math.abs(p.x - this.lastTaxX) > 0.4;
    this.tax.setPosition(p.x, p.y).setFlipX(p.fl);
    this.tax.setTexture(moving ? `tax_${1 + (Math.floor(this.clock / 110) % 2)}` : 'tax_0');
    this.lastTaxX = p.x;
    if (this.taxIdx > 800) { this.trail.splice(0, this.taxIdx); this.taxIdx = 0; }

    const sx = this.tax.x - this.cameras.main.scrollX;
    if (sx < 0 || sx > VW) {
      this.arrow.setVisible(true).setText(sx < 0 ? '◀ US!' : 'US! ▶').setPosition(sx < 0 ? 10 : VW - 90, 50);
    } else this.arrow.setVisible(false);

    if (this.clock > this.lv.taxDelay * 1000 + 300 && Math.abs(this.tax.x - h.x) < 20 && Math.abs(this.tax.y - h.y) < 26) {
      puff(this, h.x, h.y, 0xffd23f);
      this.die('KONTROLA! Złapał Cię Urząd Skarbowy');
    } else if (h.y > VH + 40) this.die('Wpadłeś w dziurę w budżecie!');
  }
}

/* ---------- scena: komenda policji (arena z policjantem) ---------- */
class Arena extends Phaser.Scene {
  constructor() { super('Arena'); }
  init(data) { this.cfg = data; }

  create() {
    const COLS = 25, ROWS = 16;
    this.over = false; this.defeated = false; this.invuln = 0;
    this.add.tileSprite(0, 0, VW, VH, 'police_wall').setOrigin(0);
    this.add.text(VW / 2, 52, 'KOMENDA POLICJI', { ...TEXT, fontSize: '28px', color: '#ffd23f', strokeThickness: 6 }).setOrigin(0.5);
    this.add.image(VW / 2 - 190, 52, 'badge').setScale(2); this.add.image(VW / 2 + 190, 52, 'badge').setScale(2);
    for (const x of [150, 650]) { // zakratowane okna
      this.add.rectangle(x, 190, 90, 70, 0x0b1020).setStrokeStyle(4, 0x6c778a);
      for (let i = -30; i <= 30; i += 15) this.add.rectangle(x + i, 190, 4, 70, 0x6c778a);
    }
    this.solids = this.physics.add.staticGroup();
    const tile = (c, r, key) => this.solids.create(c * TILE + 16, r * TILE + 16, key);
    for (let c = 0; c < COLS; c++) { tile(c, 14, 'police_floor'); tile(c, 15, 'police_floor'); tile(c, 0, 'police_floor'); }
    for (let r = 1; r < 14; r++) tile(0, r, 'police_wall');
    for (let r = 1; r < 10; r++) tile(24, r, 'police_wall');
    for (const [c1, c2, r] of [[3, 6, 11], [18, 21, 11], [10, 14, 8]]) for (let c = c1; c <= c2; c++) tile(c, r, 'brick');
    this.doors = [];
    for (let r = 10; r < 14; r++) this.doors.push(this.solids.create(24 * TILE + 16, r * TILE + 16, 'door'));

    this.physics.world.gravity.y = GRAV;
    this.hero = makeHero(this, 80, 13 * TILE);
    this.physics.add.collider(this.hero, this.solids);

    this.cop = this.physics.add.sprite(560, 13 * TILE - 20, 'cop_0').setScale(1.3).setDepth(6);
    this.cop.body.setSize(20, 30).setOffset(6, 2);
    this.physics.add.collider(this.cop, this.solids);
    this.cop.hp = this.cfg.hp; this.cop.maxHp = this.cfg.hp;
    this.cop.state = 'patrol'; this.cop.t = 0; this.cop.dir = -1; this.cop.stun = 0; this.cop.animT = 0;
    this.physics.add.overlap(this.hero, this.cop, () => this.touchCop());

    this.exit = this.add.zone(24 * TILE + 16, 12 * TILE, 20, 4 * TILE); this.physics.add.existing(this.exit, true);
    this.physics.add.overlap(this.hero, this.exit, () => this.leave());
    this.bar = this.add.graphics().setDepth(10);
    this.controls = new Controls(this);
    this.refreshHud = hud(this, 'Pokonaj policjanta!');
    this.cameras.main.fadeIn(250);
    banner(this, `Teleport do komendy!\nSkacz policjantowi na głowę (${this.cop.hp}×), żeby wyjść`, 2600, '26px');
    this.sign = this.add.text(0, 0, '!', { ...TEXT, fontSize: '34px', color: '#ff4d4d' }).setOrigin(0.5).setDepth(11).setVisible(false);
  }

  touchCop() {
    const c = this.cop, h = this.hero;
    if (this.over || this.defeated || c.stun > 0) return;
    if (h.body.velocity.y > 40 && h.body.bottom - c.body.top < 24) { // skok na głowę
      Sfx.play('stomp'); h.body.setVelocityY(-380); puff(this, c.x, c.body.top, 0xffffff, 6);
      c.hp--; c.stun = 1.1; c.state = 'patrol'; this.cameras.main.shake(120, 0.006);
      if (c.hp <= 0) this.defeat();
    } else if (this.invuln <= 0) this.hurt();
  }

  hurt() {
    const reg = this.registry, h = this.hero;
    Sfx.play('hurt'); this.invuln = 1.4;
    reg.set('lives', reg.get('lives') - 1); this.refreshHud();
    h.body.setVelocity(h.x < this.cop.x ? -320 : 320, -260);
    this.cameras.main.shake(150, 0.008);
    if (reg.get('lives') <= 0) {
      this.over = true; banner(this, 'Mandat… i koniec!', 1500);
      this.time.delayedCall(1600, () => { this.scene.stop('Game'); this.scene.start('End', { win: false }); });
    }
  }

  defeat() {
    this.defeated = true; this.cop.body.setVelocity(0, 0);
    this.cop.setTint(0xffffff); puff(this, this.cop.x, this.cop.y, 0xffd23f, 14);
    this.tweens.add({ targets: this.cop, alpha: 0, angle: 90, y: this.cop.y + 20, duration: 600 });
    Sfx.play('door');
    this.time.delayedCall(500, () => {
      this.doors.forEach((d) => d.destroy());
      this.add.text(24 * TILE - 10, 11 * TILE, '▶', { ...TEXT, fontSize: '42px', color: '#7bd66b' }).setOrigin(0.5);
      banner(this, 'Policjant pokonany! Drzwi otwarte →', 2000, '26px');
    });
  }

  leave() {
    if (!this.defeated || this.over || this.left) return;
    this.left = true;
    this.scene.get('Game').onArenaDone();
    this.scene.stop();
  }

  update(time, delta) {
    this.controls.update();
    if (this.over) return;
    const dt = delta / 1000, c = this.cop, h = this.hero;
    updateHero(h, this.controls, delta);
    this.invuln -= dt;
    h.setAlpha(this.invuln > 0 && Math.floor(time / 90) % 2 ? 0.35 : 1);
    if (h.x < 20) h.x = 20;

    if (!this.defeated) {
      c.t += dt; c.stun -= dt;
      const base = this.cfg.speed * (1 + (1 - c.hp / c.maxHp) * 0.6);
      if (c.stun > 0) { c.body.setVelocityX(0); c.setAlpha(Math.floor(time / 80) % 2 ? 0.4 : 1); }
      else {
        c.setAlpha(1);
        if (c.state === 'patrol') {
          c.body.setVelocityX(c.dir * base);
          if (c.x < 100) c.dir = 1; else if (c.x > 22 * TILE) c.dir = -1;
          if (c.t > 2.2) { c.state = 'windup'; c.t = 0; Sfx.play('alarm'); }
        } else if (c.state === 'windup') {
          c.body.setVelocityX(0); c.dir = h.x > c.x ? 1 : -1; c.setTint(0xff8080);
          if (c.t > 0.55) { c.state = 'charge'; c.t = 0; c.clearTint(); }
        } else if (c.state === 'charge') {
          c.body.setVelocityX(c.dir * base * 3.1);
          if (c.t > 0.85 || c.x < 60 || c.x > 23 * TILE) { c.state = 'patrol'; c.t = 0; }
        }
      }
      c.setFlipX(c.dir < 0);
      c.animT += delta;
      c.setTexture(Math.abs(c.body.velocity.x) > 5 ? `cop_${1 + (Math.floor(c.animT / 130) % 2)}` : 'cop_0');
      this.sign.setVisible(c.state === 'windup').setPosition(c.x, c.y - 56);
      // pasek życia policjanta
      this.bar.clear().fillStyle(0x000000, 0.6).fillRect(c.x - 26, c.y - 46, 52, 8)
        .fillStyle(0xff4d4d, 1).fillRect(c.x - 24, c.y - 44, 48 * Math.max(c.hp, 0) / c.maxHp, 4);
    } else { this.bar.clear(); this.sign.setVisible(false); }
  }
}

/* ---------- scena: koniec ---------- */
class End extends Phaser.Scene {
  constructor() { super('End'); }
  init(data) { this.won = data.win; }
  create() {
    this.add.image(0, 0, 'sky').setOrigin(0);
    const coins = this.registry.get('coins');
    this.add.text(VW / 2, 120, this.won ? 'WOLNOŚĆ!' : 'KONIEC GRY', { ...TEXT, fontSize: '64px', color: this.won ? '#ffd23f' : '#ff6b6b', strokeThickness: 10 }).setOrigin(0.5);
    this.add.text(VW / 2, 220, this.won
      ? `Brunet uciekł urzędowi przez wszystkie poziomy\ni zachował ${coins} zł. Księgowy płacze.`
      : `Urząd Skarbowy wygrał. Zostało Ci ${coins} zł…\nale tylko do następnej kontroli.`,
    { ...TEXT, fontSize: '26px', align: 'center' }).setOrigin(0.5);
    const hero = this.add.image(VW / 2, 330, this.won ? 'player_0' : 'tax_0').setScale(3);
    if (this.won) this.tweens.add({ targets: hero, y: 300, yoyo: true, repeat: -1, duration: 350 });
    const tip = this.add.text(VW / 2, 440, 'Dotknij, aby zagrać jeszcze raz', { ...TEXT, fontSize: '24px' }).setOrigin(0.5);
    this.tweens.add({ targets: tip, alpha: 0.3, yoyo: true, repeat: -1, duration: 600 });
    this.time.delayedCall(700, () => {
      this.input.once('pointerdown', () => this.scene.start('Title'));
      this.input.keyboard.once('keydown', () => this.scene.start('Title'));
    });
  }
}

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VW, height: VH,
  backgroundColor: '#000000',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: GRAV }, debug: false } },
  input: { activePointers: 4 },
  scene: [Boot, Title, Game, Arena, End],
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
