'use strict';

const TILE = 40;
const COLS = 20;
const ROWS = 14;
const W = COLS * TILE;
const H = ROWS * TILE;
const WIN_POP = 250;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const state = {
  money: 1200, population: 0, capacity: 0,
  happiness: 55, reputation: 60, suspicion: 0,
  powerGen: 0, powerUse: 0, waterGen: 0, waterUse: 0,
  incomeContrib: 0, happinessContrib: 0, suspicionRate: 0, upkeep: 0,
  day: 1, taxIncome: 0,
  gameOver: false, won: false, eventActive: false,
};

const BUILDINGS = {
  road:        { name: 'Đường',              cost: 10,  color: '#3f3f46', desc: 'Nối các khu, giúp thành phố sầm uất' },
  house:       { name: 'Nhà dân',            cost: 100, color: '#3b82f6', desc: '+8 dân, cần điện & nước', capacity: 8, powerUse: 1, waterUse: 1, upkeep: 1 },
  shop:        { name: 'Chợ',                cost: 150, color: '#f59e0b', desc: 'Thu nhập +12, hạnh phúc +4', income: 12, powerUse: 1, waterUse: 1, upkeep: 2, happiness: 4 },
  park:        { name: 'Công viên',          cost: 80,  color: '#22c55e', desc: 'Hạnh phúc +8', happiness: 8, upkeep: 1 },
  factory:     { name: 'Nhà máy',            cost: 220, color: '#a16207', desc: 'Thu nhập +30, ô nhiễm -6 hạnh phúc', income: 30, powerUse: 3, waterUse: 2, upkeep: 4, happiness: -6 },
  power:       { name: 'Nhà máy điện',       cost: 300, color: '#eab308', desc: 'Cung cấp +12 điện', powerGen: 12, upkeep: 3 },
  water:       { name: 'Tháp nước',          cost: 260, color: '#06b6d4', desc: 'Cung cấp +12 nước', waterGen: 12, upkeep: 3 },
  police:      { name: 'Đồn cảnh sát',       cost: 220, color: '#1e40af', desc: 'Giảm nghi ngờ, hạnh phúc +3', suspicionRate: -2, happiness: 3, upkeep: 4 },
  underground: { name: 'Xưởng ngầm (phi pháp)', cost: 120, color: '#b91c1c', desc: 'Thu nhập +55 NHƯNG nghi ngờ +4/turn', income: 55, powerUse: 1, waterUse: 1, upkeep: 5, happiness: -10, suspicionRate: 4 },
};

const EVENTS = [
  { title: 'Nhà đầu tư bí ẩn',
    desc: 'Một tập đoàn bí ẩn đề nghị tài trợ lớn cho dự án nhưng muốn "ưu đãi thủ tục".',
    legal:   { label: 'Từ chối, làm đúng quy trình', money: 0, reputation: 5, note: 'Danh tiếng +5' },
    illegal: { label: 'Nhận hối lộ để duyệt nhanh', money: 300, suspicion: 15, note: '+300 tiền · Nghi ngờ +15' } },
  { title: 'Kiểm tra môi trường',
    desc: 'Thanh tra môi trường sắp đến kiểm tra các nhà máy trong thành phố.',
    legal:   { label: 'Đầu tư lọc thải sạch', money: -200, reputation: 10, note: '-200 tiền · Danh tiếng +10' },
    illegal: { label: 'Hối lộ thanh tra', money: -100, suspicion: 20, note: '-100 tiền · Nghi ngờ +20' } },
  { title: 'Tố giác nặc danh',
    desc: 'Một lá thư nặc danh tố cáo hoạt động phi pháp trong thành phố.',
    legal:   { label: 'Hợp tác điều tra', reputation: 8, suspicion: -5, note: 'Danh tiếng +8 · Nghi ngờ -5' },
    illegal: { label: 'Dìm vụ việc xuống', money: -150, suspicion: 15, note: '-150 tiền · Nghi ngờ +15' } },
  { title: 'Gói thầu xây dựng',
    desc: 'Một gói thầu hạ tầng lớn đang được đấu thầu công khai.',
    legal:   { label: 'Đấu thầu minh bạch', money: 80, reputation: 4, note: '+80 tiền · Danh tiếng +4' },
    illegal: { label: 'Dàn xếp thầu', money: 250, suspicion: 18, note: '+250 tiền · Nghi ngờ +18' } },
];

let selected = 'road';

function $(id) { return document.getElementById(id); }

function updateHUD() {
  $('stat-money').textContent = Math.round(state.money);
  $('stat-pop').textContent = Math.round(state.population) + ' / ' + state.capacity;
  $('stat-happy').textContent = Math.round(state.happiness);
  $('stat-rep').textContent = Math.round(state.reputation);
  $('stat-sus').textContent = Math.round(state.suspicion);
  $('stat-power').textContent = state.powerGen + '/' + state.powerUse;
  $('stat-water').textContent = state.waterGen + '/' + state.waterUse;
  $('stat-day').textContent = state.day;
  const bar = $('sus-bar');
  bar.style.width = state.suspicion + '%';
  bar.style.background = state.suspicion > 70 ? '#ef4444' : state.suspicion > 40 ? '#f59e0b' : '#22c55e';
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { el.classList.remove('show'); }, 1800);
}

function log(msg) {
  const el = $('log');
  const div = document.createElement('div');
  div.textContent = 'Ngày ' + state.day + ': ' + msg;
  el.prepend(div);
  while (el.children.length > 40) el.removeChild(el.lastChild);
}

function populateToolbar() {
  const bar = $('toolbar');
  const order = ['road', 'house', 'shop', 'park', 'factory', 'power', 'water', 'police', 'underground'];
  order.forEach(function (id) {
    const d = BUILDINGS[id];
    const btn = document.createElement('button');
    btn.className = 'tool';
    btn.dataset.id = id;
    btn.innerHTML = '<span class="swatch" style="background:' + d.color + '"></span>' +
      '<span class="tname">' + d.name + '</span>' +
      '<span class="tcost">$' + d.cost + '</span>';
    btn.title = d.desc;
    btn.addEventListener('click', function () { setSelected(id); });
    bar.appendChild(btn);
  });
}

function setSelected(id) {
  selected = id;
  document.querySelectorAll('.tool').forEach(function (b) {
    b.classList.toggle('active', b.dataset.id === id);
  });
  $('sel-name').textContent = BUILDINGS[id].name;
}

function showModal(title, desc, optA, optB) {
  $('modal-title').textContent = title;
  $('modal-desc').textContent = desc;
  const b1 = $('modal-btn1');
  const b2 = $('modal-btn2');
  b1.textContent = optA.label;
  b1.onclick = function () {
    hideModal();
    if (optA.fn) optA.fn();
    else applyChoice(optA);
  };
  if (optB) {
    b2.style.display = '';
    b2.textContent = optB.label;
    b2.onclick = function () { hideModal(); applyChoice(optB); };
  } else {
    b2.style.display = 'none';
  }
  $('modal').classList.add('show');
}

function hideModal() {
  $('modal').classList.remove('show');
  state.eventActive = false;
}

function applyChoice(o) {
  if (o.money) state.money += o.money;
  if (o.reputation) state.reputation = clamp(state.reputation + o.reputation, 0, 100);
  if (o.suspicion) state.suspicion = clamp(state.suspicion + o.suspicion, 0, 100);
  log(o.note || 'Đã quyết định');
  toast(o.note || '');
  updateHUD();
}

class CityScene extends Phaser.Scene {
  constructor() { super('city'); }

  create() {
    this.grid = [];
    this.roadTiles = [];
    for (let y = 0; y < ROWS; y++) {
      this.grid[y] = [];
      for (let x = 0; x < COLS; x++) this.grid[y][x] = null;
    }
    this.hover = { x: -1, y: -1 };
    this.mapG = this.add.graphics();
    this.fxG = this.add.graphics();
    this.citizens = [];
    for (let i = 0; i < 8; i++) {
      this.citizens.push({ x: Math.random() * W, y: Math.random() * H, tx: Math.random() * W, ty: Math.random() * H });
    }

    this.drawMap();
    this.input.on('pointermove', (p) => {
      const t = this.tileAt(p.x, p.y);
      this.hover = t;
    });
    this.input.on('pointerdown', (p) => this.place(p));

    this.time.addEvent({ delay: 2500, loop: true, callback: () => this.tick() });
    log('Chọn công trình và click vào bản đồ để xây dựng.');
    updateHUD();
  }

  tileAt(px, py) {
    return { x: Math.floor(px / TILE), y: Math.floor(py / TILE) };
  }

  place(p) {
    if (state.gameOver || state.won) return;
    const t = this.tileAt(p.x, p.y);
    if (t.x < 0 || t.x >= COLS || t.y < 0 || t.y >= ROWS) return;
    const def = BUILDINGS[selected];
    if (this.grid[t.y][t.x]) { toast('Ô này đã có công trình'); return; }
    if (state.money < def.cost) { toast('Không đủ tiền!'); return; }
    state.money -= def.cost;
    this.grid[t.y][t.x] = selected;
    if (selected === 'road') this.roadTiles.push({ x: t.x, y: t.y });
    this.recalc();
    this.drawMap();
    updateHUD();
  }

  recalc() {
    let capacity = 0, powerGen = 0, powerUse = 0, waterGen = 0, waterUse = 0,
        income = 0, happiness = 0, suspicionRate = 0, upkeep = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const b = this.grid[y][x];
        if (!b) continue;
        const d = BUILDINGS[b];
        capacity += d.capacity || 0;
        powerGen += d.powerGen || 0;
        powerUse += d.powerUse || 0;
        waterGen += d.waterGen || 0;
        waterUse += d.waterUse || 0;
        income += d.income || 0;
        happiness += d.happiness || 0;
        suspicionRate += d.suspicionRate || 0;
        upkeep += d.upkeep || 0;
      }
    }
    Object.assign(state, {
      capacity, powerGen, powerUse, waterGen, waterUse,
      incomeContrib: income, happinessContrib: happiness,
      suspicionRate: suspicionRate, upkeep: upkeep,
    });
  }

  tick() {
    if (state.gameOver || state.won) return;
    this.recalc();
    const powerOk = state.powerGen >= state.powerUse;
    const waterOk = state.waterGen >= state.waterUse;
    const targetHappy = clamp(55 + state.happinessContrib + (powerOk ? 0 : -12) + (waterOk ? 0 : -12), 0, 100);
    state.happiness += (targetHappy - state.happiness) * 0.25;

    if (powerOk && waterOk && state.happiness > 40 && state.population < state.capacity) {
      const grow = Math.max(1, Math.round(state.capacity * 0.05));
      state.population = Math.min(state.capacity, state.population + grow);
    }

    const income = Math.round(state.population * 2 + state.incomeContrib - state.upkeep);
    state.money += income;
    state.taxIncome = income;

    state.suspicion = clamp(state.suspicion + state.suspicionRate, 0, 100);
    state.day++;

    if (income >= 0) log('Thu ' + income + '$ · Dân ' + Math.round(state.population));
    else log('Lỗ ' + Math.abs(income) + '$ · Dân ' + Math.round(state.population));

    if (state.suspicion >= 100) return this.gameOver('Bạn bị bắt vì tham nhũng và hoạt động phi pháp (hư cấu).');
    if (state.money < -300) return this.gameOver('Ngân khố phá sản. Thành phố sụp đổ.');
    if (state.population >= WIN_POP) return this.winGame();

    if (state.day % 4 === 0 && !state.eventActive) this.triggerEvent();

    updateHUD();
  }

  triggerEvent() {
    const evt = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    state.eventActive = true;
    showModal(evt.title, evt.desc, evt.legal, evt.illegal);
  }

  gameOver(msg) {
    state.gameOver = true;
    showModal('💀 GAME OVER', msg, { label: 'Chơi lại', fn: () => location.reload() }, null);
    updateHUD();
  }

  winGame() {
    state.won = true;
    showModal('🏆 CHIẾN THẮNG', 'Thành phố đạt ' + WIN_POP + ' dân với Nghi ngờ ' + Math.round(state.suspicion) + '.',
      { label: 'Chơi lại', fn: () => location.reload() }, null);
    updateHUD();
  }

  drawMap() {
    const g = this.mapG;
    g.clear();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const b = this.grid[y][x];
        const px = x * TILE, py = y * TILE;
        if (!b) {
          g.fillStyle((x + y) % 2 ? 0x6fbf4a : 0x74c851);
          g.fillRect(px, py, TILE, TILE);
        } else {
          this.drawTile(g, x, y, b);
        }
      }
    }
    g.lineStyle(1, 0x000000, 0.05);
    for (let x = 0; x <= COLS; x++) { g.beginPath(); g.moveTo(x * TILE, 0); g.lineTo(x * TILE, H); g.strokePath(); }
    for (let y = 0; y <= ROWS; y++) { g.beginPath(); g.moveTo(0, y * TILE); g.lineTo(W, y * TILE); g.strokePath(); }
  }

  drawTile(g, x, y, b) {
    const px = x * TILE, py = y * TILE;
    const cx = px + TILE / 2, cy = py + TILE / 2;
    const c = Phaser.Display.Color.HexStringToColor(BUILDINGS[b].color).color;
    g.fillStyle(c);
    g.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
    g.lineStyle(1, 0xffffff, 0.25);
    g.strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
    switch (b) {
      case 'road':
        g.fillStyle(0x9ca3af, 0.5); g.fillRect(px + 2, cy - 3, TILE - 4, 6); break;
      case 'house':
        g.fillStyle(0xffffff, 0.9); g.fillRect(cx - 5, cy - 2, 10, 8);
        g.fillStyle(0xb91c1c, 0.9); g.fillRect(cx - 3, cy - 6, 6, 5); break;
      case 'shop':
        g.fillStyle(0xfff7ed, 0.9); g.fillRect(cx - 6, cy - 4, 12, 9);
        g.fillStyle(0xfde047, 0.9); g.fillRect(cx - 4, cy - 6, 4, 3); break;
      case 'park':
        g.fillStyle(0x166534, 0.9); g.fillCircle(cx, cy, 6); break;
      case 'factory':
        g.fillStyle(0x292524, 0.9); g.fillRect(cx - 3, cy - 8, 6, 6);
        g.fillStyle(0x57534e, 0.9); g.fillRect(cx - 7, cy - 1, 14, 8); break;
      case 'power':
        g.fillStyle(0xfef08a, 0.95); g.fillTriangle(cx, cy - 8, cx - 6, cy + 5, cx + 6, cy + 5); break;
      case 'water':
        g.fillStyle(0x7dd3fc, 0.95); g.fillCircle(cx, cy, 6);
        g.fillStyle(0x38bdf8, 0.8); g.fillCircle(cx, cy, 3); break;
      case 'police':
        g.fillStyle(0xffffff, 0.9); g.fillRect(cx - 6, cy - 5, 12, 10);
        g.fillStyle(0x1e3a8a, 0.9); g.fillRect(cx - 1.5, cy - 3, 3, 6); break;
      case 'underground':
        g.fillStyle(0x7f1d1d, 0.9); g.fillRect(cx - 6, cy - 6, 12, 12);
        g.fillStyle(0xffffff, 0.8); g.fillRect(cx - 5, cy - 5, 10, 3); break;
    }
  }

  update(time, delta) {
    const g = this.fxG;
    g.clear();
    if (!state.gameOver && !state.won && this.hover.x >= 0 && this.hover.x < COLS && this.hover.y >= 0 && this.hover.y < ROWS) {
      const t = this.hover;
      const occupied = this.grid[t.y][t.x];
      g.lineStyle(2, occupied ? 0xef4444 : 0xffffff, 0.9);
      g.strokeRect(t.x * TILE + 2, t.y * TILE + 2, TILE - 4, TILE - 4);
    }
    const sp = 0.05;
    for (const c of this.citizens) {
      const dx = c.tx - c.x, dy = c.ty - c.y, dist = Math.hypot(dx, dy);
      if (dist < 2) {
        let r;
        if (this.roadTiles.length) r = this.roadTiles[Math.floor(Math.random() * this.roadTiles.length)];
        else r = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
        c.tx = r.x * TILE + TILE / 2;
        c.ty = r.y * TILE + TILE / 2;
      } else {
        c.x += dx / dist * sp * delta;
        c.y += dy / dist * sp * delta;
      }
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(c.x, c.y, 3);
    }
  }
}

populateToolbar();
setSelected('road');
updateHUD();

$('start-btn').addEventListener('click', function () {
  $('disclaimer').classList.add('hide');
});

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#2a5a1e',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: CityScene,
});
