'use strict';

const TILE = 40;
const COLS = 20;
const ROWS = 14;
const W = COLS * TILE;
const H = ROWS * TILE;
const WIN_POP = 250;
const SAVE_KEY = 'city-sim-save-v1';

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
  road:        { name: 'Đường',                cost: 10,  color: '#3f3f46', desc: 'Nối các khu, giúp thành phố sầm uất' },
  house:       { name: 'Nhà dân',              cost: 100, color: '#3b82f6', desc: '+8 dân, cần điện & nước', capacity: 8, powerUse: 1, waterUse: 1, upkeep: 1 },
  shop:        { name: 'Chợ',                  cost: 150, color: '#f59e0b', desc: 'Thu nhập +12, hạnh phúc +4', income: 12, powerUse: 1, waterUse: 1, upkeep: 2, happiness: 4 },
  park:        { name: 'Công viên',            cost: 80,  color: '#22c55e', desc: 'Hạnh phúc +8', happiness: 8, upkeep: 1 },
  school:      { name: 'Trường học',           cost: 180, color: '#8b5cf6', desc: 'Hạnh phúc +5', happiness: 5, powerUse: 1, upkeep: 2 },
  hospital:    { name: 'Bệnh viện',            cost: 200, color: '#ec4899', desc: 'Hạnh phúc +6, sức chứa +10', happiness: 6, capacity: 10, powerUse: 2, waterUse: 1, upkeep: 3 },
  factory:     { name: 'Nhà máy',              cost: 220, color: '#a16207', desc: 'Thu nhập +30, ô nhiễm -6 hạnh phúc', income: 30, powerUse: 3, waterUse: 2, upkeep: 4, happiness: -6 },
  power:       { name: 'Nhà máy điện',         cost: 300, color: '#eab308', desc: 'Cung cấp +12 điện', powerGen: 12, upkeep: 3 },
  water:       { name: 'Tháp nước',            cost: 260, color: '#06b6d4', desc: 'Cung cấp +12 nước', waterGen: 12, upkeep: 3 },
  police:      { name: 'Đồn cảnh sát',         cost: 220, color: '#1e40af', desc: 'Giảm nghi ngờ, hạnh phúc +3', suspicionRate: -2, happiness: 3, upkeep: 4 },
  bank:        { name: 'Ngân hàng',            cost: 280, color: '#10b981', desc: 'Thu nhập +20, hạnh phúc +2', income: 20, happiness: 2, powerUse: 2, waterUse: 1, upkeep: 4 },
  underground: { name: 'Xưởng ngầm (phi pháp)', cost: 120, color: '#b91c1c', desc: 'Thu nhập +55 NHƯNG nghi ngờ +4/turn', income: 55, powerUse: 1, waterUse: 1, upkeep: 5, happiness: -10, suspicionRate: 4 },
  casino:      { name: 'Sòng bạc (phi pháp)',   cost: 200, color: '#7c3aed', desc: 'Thu nhập +60 NHƯNG nghi ngờ +5/turn', income: 60, powerUse: 2, waterUse: 1, upkeep: 6, happiness: -8, suspicionRate: 5 },
};

const EVENTS = [
  { title: 'Nhà đầu tư bí ẩn',
    desc: 'Một tập đoàn bí ẩn đề nghị tài trợ lớn cho dự án nhưng muốn "ưu đãi thủ tục".',
    legal:   { label: 'Từ chối, làm đúng quy trình', reputation: 5, note: 'Danh tiếng +5' },
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
  { title: 'Bầu cử thị trưởng',
    desc: 'Kỳ bầu cử đến gần, đối thủ đang vận động ráo riết.',
    legal:   { label: 'Vận động minh bạch', reputation: 10, note: 'Danh tiếng +10' },
    illegal: { label: 'Mua phiếu bầu', money: -250, suspicion: 22, note: '-250 tiền · Nghi ngờ +22' } },
  { title: 'Dịch bệnh bùng phát',
    desc: 'Dịch bệnh lan trong khu dân cư, người dân lo lắng.',
    legal:   { label: 'Đầu tư y tế công', money: -180, reputation: 8, happiness: 5, note: '-180 tiền · Danh tiếng +8 · Hạnh phúc +5' },
    illegal: { label: 'Che giấu thông tin', suspicion: 20, note: 'Nghi ngờ +20' } },
];

let selected = 'road';

function $(id) { return document.getElementById(id); }

// ---- Âm thanh (Web Audio API, không cần file ngoài) ----
const Sound = {
  ctx: null,
  enabled: true,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) this.ctx = new AC();
  },
  ensure() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  beep(freq, dur, type, vol) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.value = vol || 0.08;
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.stop(this.ctx.currentTime + dur);
  },
  place() { this.beep(220, 0.08, 'square', 0.06); },
  event() { this.beep(520, 0.2, 'triangle', 0.08); },
  danger() { this.beep(180, 0.3, 'sawtooth', 0.09); },
  win() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.beep(f, 0.2, 'sine', 0.08), i * 140)); },
  lose() { [300, 220, 160].forEach((f, i) => setTimeout(() => this.beep(f, 0.3, 'sawtooth', 0.09), i * 180)); },
};

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
  const order = ['road', 'house', 'shop', 'park', 'school', 'hospital', 'factory', 'power', 'water', 'police', 'bank', 'underground', 'casino'];
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
  if (o.happiness) state.happiness = clamp(state.happiness + o.happiness, 0, 100);
  if (o.suspicion > 0) Sound.danger();
  log(o.note || 'Đã quyết định');
  toast(o.note || '');
  updateHUD();
}

// ---- Lưu / nạp game bằng localStorage ----
function saveGame(scene) {
  try {
    const data = {
      state: Object.assign({}, state, { gameOver: false, won: false, eventActive: false }),
      grid: scene.grid,
      roadTiles: scene.roadTiles,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* bỏ qua khi localStorage bị chặn */ }
}

function loadGame(scene) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    Object.assign(state, data.state);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) scene.grid[y][x] = data.grid[y][x] || null;
    }
    scene.roadTiles = data.roadTiles || [];
    scene.recalc();
    scene.drawMap();
    return true;
  } catch (e) { return false; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
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

    this.setupInput();
    this.time.addEvent({ delay: 2500, loop: true, callback: () => this.tick() });

    if (!loadGame(this)) {
      this.drawMap();
      log('Chọn công trình và click vào bản đồ để xây dựng.');
    } else {
      log('Đã tải lại thành phố từ bản lưu.');
    }
    updateHUD();
  }

  worldPoint(p) {
    return this.cameras.main.getWorldPoint(p.x, p.y);
  }

  clampCamera() {
    const cam = this.cameras.main;
    const viewW = W / cam.zoom, viewH = H / cam.zoom;
    cam.scrollX = clamp(cam.scrollX, 0, Math.max(0, W - viewW));
    cam.scrollY = clamp(cam.scrollY, 0, Math.max(0, H - viewH));
  }

  setupInput() {
    this.input.on('pointerdown', (p) => {
      this.dragging = false;
      this.dragStart = { x: p.x, y: p.y };
      this.dragLast = { x: p.x, y: p.y };
    });

    this.input.on('pointermove', (p) => {
      const wp = this.worldPoint(p);
      this.hover = this.tileAt(wp.x, wp.y);
      if (this.input.activePointer.isDown) {
        const dx = p.x - this.dragStart.x, dy = p.y - this.dragStart.y;
        if (!this.dragging && Math.hypot(dx, dy) > 6) this.dragging = true;
        if (this.dragging) {
          const cam = this.cameras.main;
          cam.scrollX -= (p.x - this.dragLast.x) / cam.zoom;
          cam.scrollY -= (p.y - this.dragLast.y) / cam.zoom;
          this.dragLast = { x: p.x, y: p.y };
          this.clampCamera();
        }
      }
    });

    this.input.on('pointerup', (p) => {
      if (!this.dragging) {
        const wp = this.worldPoint(p);
        this.place(wp.x, wp.y);
      }
      this.dragging = false;
    });

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const cam = this.cameras.main;
      const factor = deltaY > 0 ? 0.9 : 1.1;
      const newZoom = clamp(cam.zoom * factor, 0.6, 2.0);
      if (newZoom === cam.zoom) return;
      const before = cam.getWorldPoint(pointer.x, pointer.y);
      cam.setZoom(newZoom);
      const after = cam.getWorldPoint(pointer.x, pointer.y);
      cam.scrollX += before.x - after.x;
      cam.scrollY += before.y - after.y;
      this.clampCamera();
    });
  }

  tileAt(px, py) {
    return { x: Math.floor(px / TILE), y: Math.floor(py / TILE) };
  }

  place(wx, wy) {
    if (state.gameOver || state.won) return;
    const t = this.tileAt(wx, wy);
    if (t.x < 0 || t.x >= COLS || t.y < 0 || t.y >= ROWS) return;
    const def = BUILDINGS[selected];
    if (this.grid[t.y][t.x]) { toast('Ô này đã có công trình'); return; }
    if (state.money < def.cost) { toast('Không đủ tiền!'); return; }
    state.money -= def.cost;
    this.grid[t.y][t.x] = selected;
    if (selected === 'road') this.roadTiles.push({ x: t.x, y: t.y });
    this.recalc();
    this.drawMap();
    Sound.place();
    updateHUD();
    saveGame(this);
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
    saveGame(this);
  }

  triggerEvent() {
    const evt = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    state.eventActive = true;
    Sound.event();
    showModal(evt.title, evt.desc, evt.legal, evt.illegal);
  }

  gameOver(msg) {
    state.gameOver = true;
    Sound.lose();
    showModal('💀 GAME OVER', msg, { label: 'Chơi lại', fn: () => location.reload() }, null);
    updateHUD();
  }

  winGame() {
    state.won = true;
    Sound.win();
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
      case 'school':
        g.fillStyle(0xffffff, 0.9); g.fillRect(cx - 6, cy - 5, 12, 10);
        g.fillStyle(0x1e1b4b, 0.9); g.fillRect(cx - 1, cy - 4, 2, 8); break;
      case 'hospital':
        g.fillStyle(0xffffff, 0.9); g.fillRect(cx - 6, cy - 5, 12, 10);
        g.fillStyle(0xdc2626, 0.9); g.fillRect(cx - 1.5, cy - 4, 3, 8);
        g.fillRect(cx - 5, cy - 2, 10, 3); break;
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
      case 'bank':
        g.fillStyle(0xffffff, 0.9); g.fillRect(cx - 6, cy - 5, 12, 10);
        g.fillStyle(0x065f46, 0.9); g.fillRect(cx - 1, cy - 4, 2, 8); break;
      case 'underground':
        g.fillStyle(0x7f1d1d, 0.9); g.fillRect(cx - 6, cy - 6, 12, 12);
        g.fillStyle(0xffffff, 0.8); g.fillRect(cx - 5, cy - 5, 10, 3); break;
      case 'casino':
        g.fillStyle(0xffffff, 0.9); g.fillRect(cx - 6, cy - 6, 12, 12);
        g.fillStyle(0x4c1d95, 0.9); g.fillCircle(cx - 2, cy - 2, 2); g.fillCircle(cx + 2, cy - 2, 2);
        g.fillCircle(cx - 2, cy + 2, 2); g.fillCircle(cx + 2, cy + 2, 2); break;
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
  Sound.init();
  $('disclaimer').classList.add('hide');
});

$('sound-btn').addEventListener('click', function () {
  Sound.enabled = !Sound.enabled;
  this.textContent = Sound.enabled ? '🔊' : '🔇';
  if (Sound.enabled) Sound.beep(440, 0.1, 'sine', 0.06);
});

$('reset-btn').addEventListener('click', function () {
  if (confirm('Xóa toàn bộ tiến trình đã lưu và chơi lại từ đầu?')) {
    clearSave();
    location.reload();
  }
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
