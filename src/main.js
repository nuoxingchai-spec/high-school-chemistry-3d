import { REACTIONS, sim } from './reactions.js';
import { EQUATIONS, EQUATION_CATEGORIES } from './equations.js';
import { Plant } from './plant.js';
import { deriveDemo } from './eqDemoData.js';
import { EquationLab } from './eqLab.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const TAU = Math.PI * 2;

const els = {
  sceneRoot: $('sceneRoot'),
  labelLayer: $('labelLayer'),
  reactionList: $('reactionList'),
  railCount: $('railCount'),
  railMore: $('railMore'),
  railMoreLabel: $('railMoreLabel'),
  expTag: $('expTag'),
  expNo: $('expNo'),
  expTitle: $('expTitle'),
  expFormula: $('expFormula'),
  runState: $('runState'),
  runStateText: $('runStateText'),
  runPhase: $('runPhase'),
  runTime: $('runTime'),
  observationLead: $('observationLead'),
  observationList: $('observationList'),
  equationMode: $('equationMode'),
  equationCard: $('equationCard'),
  ionicEquation: $('ionicEquation'),
  metricsGrid: $('metricsGrid'),
  miniChartWrap: $('miniChartWrap'),
  precipChart: $('precipChart'),
  productsWrap: $('productsWrap'),
  riskLevel: $('riskLevel'),
  riskList: $('riskList'),
  compareSection: $('compareSection'),
  compareCards: [...document.querySelectorAll('.compare-card')],
  compareTip: $('compareTip'),
  presetRow: $('presetRow'),
  sliderRow: $('sliderRow'),
  dockSub: $('dockSub'),
  startBtn: $('startBtn'),
  startBtnText: $('startBtnText'),
  resetBtn: $('resetBtn'),
  emergencyBtn: $('emergencyBtn'),
  processSteps: $('processSteps'),
  dockStatus: document.querySelector('.dock-status'),
  dockStatusText: $('dockStatusText'),
  stage: document.querySelector('.stage'),
  eventFeed: $('eventFeed'),
  hazardBanner: $('hazardBanner'),
  hazardKicker: $('hazardKicker'),
  hazardTitle: $('hazardTitle'),
  hazardDesc: $('hazardDesc'),
  hazardAction: $('hazardAction'),
  hazardVignette: $('hazardVignette'),
  whiteFlash: $('whiteFlash'),
  tooltip: $('tooltip'),
  toastStack: $('toastStack'),
  bootScreen: $('bootScreen'),
  bootBar: $('bootBar'),
  bootStatus: $('bootStatus'),
  plantStatusText: $('plantStatusText'),
  plantLiveDot: $('plantLiveDot'),
  ventStatus: $('ventStatus'),
  sceneHint: $('sceneHint'),
  cameraRail: $('cameraRail'),
  benchViewBtn: $('benchViewBtn'),
  soundBtn: $('soundBtn'),
  rotateBtn: $('rotateBtn'),
  resetViewBtn: $('resetViewBtn'),
  fullscreenBtn: $('fullscreenBtn'),
  libraryBtn: $('libraryBtn'),
  eqLibrary: $('eqLibrary'),
  eqLibClose: $('eqLibClose'),
  eqSearch: $('eqSearch'),
  eqCategories: $('eqCategories'),
  eqTags: $('eqTags'),
  eqList: $('eqList'),
  eqEmpty: $('eqEmpty'),
  eqResultCount: $('eqResultCount'),
  eqLibMeta: $('eqLibMeta'),
  eqDetail: $('eqDetail'),
  eqDetailBody: $('eqDetailBody'),
  eqDetailBack: $('eqDetailBack'),
  eqClearFilter: $('eqClearFilter'),
};

const state = {
  reaction: REACTIONS[0],
  snap: null,
  metricKey: '',
  metricEls: [],
  obsKey: '',
  eqKey: '',
  lastPick: 0,
  autoRotate: false,
};

const libState = {
  open: false,
  cat: 'all',
  tag: '',
  query: '',
  selected: null,
  items: [],
};

const EQ_CAT_BY_ID = new Map(EQUATION_CATEGORIES.map((cat) => [cat.id, cat]));
const EQ_HAYSTACK = new Map(EQUATIONS.map((eq) => {
  const cat = EQ_CAT_BY_ID.get(eq.c);
  const raw = [eq.t, eq.eq, eq.ion, eq.ph, eq.note, eq.cond, (eq.tags || []).join(' '), cat?.label, cat?.short].join(' ');
  return [eq.id, normEq(raw)];
}));

function normEq(value) {
  return String(value || '')
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (ch) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(ch)))
    .replace(/\s+/g, '')
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let plant = null;
let uiAcc = 0;
let lastFrame = performance.now();
let tooltipTimer = 0;

/* ------------------------------------------------------------
   Audio (synthesised, no external assets)
   ------------------------------------------------------------ */

const sound = {
  enabled: true,
  ctx: null,
  master: null,
  ensure() {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {
      this.ctx = null;
    }
  },
  tone(freq, dur, { type = 'sine', gain = 0.05, slide = 0, delay = 0 } = {}) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },
  click() { this.tone(520, 0.06, { type: 'triangle', gain: 0.024 }); },
  tick() { this.tone(780, 0.03, { type: 'sine', gain: 0.009 }); },
  warn() {
    this.tone(660, 0.13, { type: 'square', gain: 0.028 });
    this.tone(520, 0.18, { type: 'square', gain: 0.024, delay: 0.16 });
  },
  alarm() {
    for (let i = 0; i < 3; i++) {
      this.tone(880, 0.13, { type: 'square', gain: 0.032, delay: i * 0.22 });
      this.tone(660, 0.14, { type: 'square', gain: 0.028, delay: i * 0.22 + 0.11 });
    }
  },
  boom() {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;
    const dur = 0.95;
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.2);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const g = this.ctx.createGain();
    g.gain.value = 0.5;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start();
    this.tone(68, 0.8, { type: 'sine', gain: 0.16, slide: -30 });
  },
};

/* ------------------------------------------------------------
   Small UI utilities
   ------------------------------------------------------------ */

function toast(level, title, text = '') {
  if (!els.toastStack) return;
  const el = document.createElement('div');
  el.className = 'toast' + (level === 'warn' ? ' is-warn' : level === 'danger' ? ' is-danger' : '');
  el.innerHTML = `<i></i><div><b>${title}</b>${text ? `<span>${text}</span>` : ''}</div>`;
  els.toastStack.appendChild(el);
  while (els.toastStack.children.length > 4) els.toastStack.firstElementChild.remove();
  setTimeout(() => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 380);
  }, 4200);
}

function pushEvent(level, text, stamp) {
  if (!els.eventFeed) return;
  const el = document.createElement('div');
  el.className = 'event-line' + (level === 'danger' ? ' is-danger' : level === 'warn' ? ' is-warn' : '');
  const time = stamp || new Date().toLocaleTimeString('zh-CN', { hour12: false });
  el.innerHTML = `<time>${time}</time><b>${text}</b>`;
  els.eventFeed.appendChild(el);
  while (els.eventFeed.children.length > 4) els.eventFeed.firstElementChild.remove();
}

function clearEventFeed() {
  if (els.eventFeed) els.eventFeed.innerHTML = '';
}

function flashWhite() {
  els.whiteFlash.classList.remove('flash');
  void els.whiteFlash.offsetWidth;
  els.whiteFlash.classList.add('flash');
  setTimeout(() => els.whiteFlash.classList.remove('flash'), 1000);
}

function showTooltip(info, { x, y }) {
  if (!info) return;
  els.tooltip.innerHTML = `<b>${info.title || ''}</b><span>${info.sub || ''}</span><p>${info.desc || ''}</p>`;
  els.tooltip.classList.add('is-visible');
  const w = els.tooltip.offsetWidth || 228;
  const h = els.tooltip.offsetHeight || 100;
  const left = clamp(x + 18, 12, window.innerWidth - w - 12);
  const top = clamp(y + 16, 12, window.innerHeight - h - 12);
  els.tooltip.style.left = `${left}px`;
  els.tooltip.style.top = `${top}px`;
  clearTimeout(tooltipTimer);
  tooltipTimer = setTimeout(hideTooltip, 4200);
}

function hideTooltip() {
  clearTimeout(tooltipTimer);
  els.tooltip.classList.remove('is-visible');
}

function bootStep(pct, text) {
  if (!els.bootBar) return;
  els.bootBar.style.width = `${pct}%`;
  if (els.bootStatus) els.bootStatus.textContent = text;
}

function mmss(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/* ------------------------------------------------------------
   Reaction library + static panel
   ------------------------------------------------------------ */

const RAIL_INITIAL_VISIBLE = 10;
const RAIL_TAG_PRIORITY = ['重点', '安全', '易错', '对比', '工业', '电池', '基础', '拓展'];
const RAIL_TAG_WEIGHT = { 重点: 30, 安全: 8, 易错: 8, 对比: 6, 工业: 4, 电池: 4, 基础: 3, 拓展: 1 };
const RAIL_EQUATIONS = EQUATIONS
  .map((eq, index) => ({
    eq,
    index,
    score: (eq.tags || []).reduce((sum, tag) => sum + (RAIL_TAG_WEIGHT[tag] || 0), 0) + (eq.link ? 10 : 0),
  }))
  .sort((a, b) => b.score - a.score || a.index - b.index)
  .map((item) => item.eq);

let railExpanded = false;

function railPrimaryTag(eq) {
  return RAIL_TAG_PRIORITY.find((tag) => (eq.tags || []).includes(tag)) || '基础';
}

function railReactionFor(eq) {
  return eq.link ? REACTIONS.find((reaction) => reaction.id === eq.link) : null;
}

function updateRailMore() {
  if (!els.railMore) return;
  els.railMore.setAttribute('aria-expanded', String(railExpanded));
  if (els.railMoreLabel) {
    els.railMoreLabel.textContent = railExpanded
      ? `收起列表 · 仅显示前 ${RAIL_INITIAL_VISIBLE} 条`
      : `展开更多 · 还有 ${EQUATIONS.length - RAIL_INITIAL_VISIBLE} 条`;
  }
}

function setRailExpanded(expanded) {
  railExpanded = expanded;
  els.reactionList.querySelectorAll('.reaction-card').forEach((card, index) => {
    card.hidden = !railExpanded && index >= RAIL_INITIAL_VISIBLE;
  });
  updateRailMore();
  if (railExpanded) {
    const firstExtra = els.reactionList.querySelectorAll('.reaction-card')[RAIL_INITIAL_VISIBLE];
    firstExtra?.scrollIntoView({ block: 'nearest' });
  } else {
    els.reactionList.scrollTop = 0;
  }
}

function buildReactionList() {
  els.reactionList.innerHTML = '';
  RAIL_EQUATIONS.forEach((eq, index) => {
    const reaction = railReactionFor(eq);
    const tag = railPrimaryTag(eq);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'reaction-card';
    card.dataset.id = eq.id;
    if (reaction) card.dataset.link = reaction.id;
    card.hidden = !railExpanded && index >= RAIL_INITIAL_VISIBLE;
    card.title = `${eq.t} · ${eq.eq}${reaction ? '｜化工厂全流程' : '｜3D 实验台'}`;
    card.innerHTML = `
      <span class="rc-index">${String(index + 1).padStart(2, '0')}</span>
      <span class="rc-body">
        <span class="rc-name">${escapeHtml(eq.t)}</span>
        <span class="rc-formula">${escapeHtml(eq.eq)}</span>
      </span>
      <span class="rc-side">
        <span class="rc-tag" data-tag="${tag}">${tag}</span>
        ${reaction ? '<span class="rc-flow">工厂</span>' : ''}
      </span>`;
    card.addEventListener('click', () => {
      if (reaction) {
        if (state.reaction.id === reaction.id) {
          applyView(plant.defaultView);
          return;
        }
        sound.click();
        selectReaction(reaction, false);
        return;
      }
      sound.click();
      openEquationLab(eq, 'rail');
    });
    els.reactionList.appendChild(card);
  });
  if (els.railCount) els.railCount.textContent = String(EQUATIONS.length).padStart(2, '0');
  updateRailMore();
}

function bindReactionRailUI() {
  els.railMore?.addEventListener('click', () => {
    setRailExpanded(!railExpanded);
    sound.click();
  });
}

function markReactionCards() {
  els.reactionList.querySelectorAll('.reaction-card').forEach((card) => {
    card.classList.toggle('is-active', Boolean(card.dataset.link) && card.dataset.link === state.reaction.id);
  });
}

function buildRiskList() {
  const reaction = state.reaction;
  els.riskLevel.className = `risk-level ${reaction.risk === 'low' ? 'low' : reaction.risk === 'mid' ? 'mid' : 'high'}`;
  els.riskLevel.textContent = reaction.riskText;
  els.riskList.innerHTML = reaction.risks
    .map((risk) => `<li class="${risk.level >= 2 ? 'is-danger' : ''}">${risk.text}</li>`)
    .join('');
}

function buildPresets() {
  els.presetRow.innerHTML = '';
  state.reaction.presets.forEach((preset) => {
    const chip = document.createElement('button');
    chip.className = 'preset-chip';
    chip.textContent = preset.label;
    chip.addEventListener('click', () => {
      sim.applyPreset(preset.values);
      syncSliders();
      syncPresetActive();
      updateSnapUI(sim.getSnapshot());
      sound.click();
      toast('info', '参数预设', preset.label);
    });
    els.presetRow.appendChild(chip);
  });
  syncPresetActive();
}

function syncPresetActive() {
  const steps = {};
  state.reaction.controls.forEach((c) => { steps[c.key] = c.step; });
  els.presetRow.querySelectorAll('.preset-chip').forEach((chip, i) => {
    const preset = state.reaction.presets[i];
    const match = Object.entries(preset.values).every(([key, value]) => {
      if (typeof value === 'boolean') return sim.params[key] === value;
      const step = steps[key] || 0.01;
      return Math.abs(sim.params[key] - value) <= step / 2 + 1e-9;
    });
    chip.classList.toggle('is-active', match);
  });
}

function buildSliders() {
  els.sliderRow.innerHTML = '';
  state.reaction.controls.forEach((ctrl) => {
    const cell = document.createElement('div');
    cell.className = 'slider-cell';
    cell.dataset.key = ctrl.key;
    cell.innerHTML = `
      <div class="slider-top">
        <span class="slider-label">${ctrl.label}</span>
        <span class="slider-value"><span data-value></span><i>${ctrl.unit}</i></span>
      </div>
      <div class="range-wrap">
        <input type="range" min="${ctrl.min}" max="${ctrl.max}" step="${ctrl.step}" value="${sim.params[ctrl.key]}" aria-label="${ctrl.label}" />
      </div>
      <div class="slider-hint"><span>${ctrl.hintLeft}</span><span>${ctrl.hintRight}</span></div>`;
    const input = cell.querySelector('input');
    input.addEventListener('input', () => {
      const value = Number(input.value);
      sim.setParam(ctrl.key, value);
      updateSliderCell(cell, ctrl, sim.params[ctrl.key]);
      applySliderDanger();
      syncPresetActive();
      updateCompareCards();
    });
    els.sliderRow.appendChild(cell);
    updateSliderCell(cell, ctrl, sim.params[ctrl.key]);
  });
  applySliderDanger();
}

function updateSliderCell(cell, ctrl, value) {
  const pct = clamp((value - ctrl.min) / (ctrl.max - ctrl.min), 0, 1) * 100;
  cell.style.setProperty('--fill', `${pct}%`);
  const valueEl = cell.querySelector('[data-value]');
  if (valueEl) valueEl.textContent = Number(value).toFixed(ctrl.decimals);
}

function syncSliders() {
  const controls = state.reaction.controls;
  els.sliderRow.querySelectorAll('.slider-cell').forEach((cell) => {
    const ctrl = controls.find((c) => c.key === cell.dataset.key);
    if (!ctrl) return;
    const input = cell.querySelector('input');
    input.value = sim.params[ctrl.key];
    updateSliderCell(cell, ctrl, sim.params[ctrl.key]);
  });
  applySliderDanger();
}

function applySliderDanger() {
  const reaction = state.reaction;
  els.sliderRow.querySelectorAll('.slider-cell').forEach((cell) => {
    let danger = false;
    if (reaction.id === 'dilution' && !sim.params.order) danger = true;
    if (reaction.id === 'sodium' && cell.dataset.key === 'sealed') danger = sim.params.sealed >= 70;
    if (reaction.id === 'chlorine' && cell.dataset.key === 'pressure') danger = sim.params.pressure >= 2.6;
    cell.classList.toggle('is-danger', danger);
  });
}

/* ------------------------------------------------------------
   Camera
   ------------------------------------------------------------ */

function setActiveCamera(view) {
  document.querySelectorAll('.camera-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.view === view);
  });
}

function applyView(view) {
  if (!plant) return;
  plant.focusView(view);
  plant.setLabelFocus(view);
  setActiveCamera(view);
}

function configureCameraRail(reaction, initial) {
  const bench = els.benchViewBtn;
  if (reaction.id === 'limewater') {
    bench.classList.remove('is-hidden');
    bench.dataset.view = 'bench';
    bench.querySelector('span').textContent = '对比台';
  } else if (reaction.id === 'thermite') {
    bench.classList.remove('is-hidden');
    bench.dataset.view = 'thermite';
    bench.querySelector('span').textContent = '铝热台';
  } else {
    bench.classList.add('is-hidden');
  }
  if (!plant) return;
  const view = initial ? 'overview' : plant.defaultView;
  applyView(view);
}

/* ------------------------------------------------------------
   Reaction selection
   ------------------------------------------------------------ */

function selectReaction(reaction, initial) {
  state.reaction = reaction;
  state.obsKey = '';
  state.eqKey = '';
  state.metricKey = '';
  sim.load(reaction);
  if (plant) plant.setReaction(reaction);

  els.expTag.textContent = reaction.tag;
  els.expNo.textContent = `EXP ${reaction.no}`;
  els.expTitle.textContent = reaction.name;
  els.expFormula.textContent = reaction.formula;
  els.dockSub.textContent = reaction.batchNote;

  markReactionCards();
  buildRiskList();
  buildPresets();
  buildSliders();
  configureCameraRail(reaction, initial);

  els.compareSection.style.display = reaction.id === 'limewater' ? '' : 'none';
  els.miniChartWrap.style.display = reaction.id === 'limewater' ? '' : 'none';

  hideHazardBanner();
  clearEventFeed();
  hideTooltip();
  updateSnapUI(sim.getSnapshot());
  if (!initial) toast('info', '实验切换', reaction.name);
}

/* ------------------------------------------------------------
   Snapshot -> panel
   ------------------------------------------------------------ */

const PHASE_LABEL = {
  idle: '待机',
  running: '运行中',
  paused: '已暂停',
  done: '已完成',
  danger: '联锁动作',
};

const PLANT_LABEL = {
  idle: '装置待机',
  running: '反应运行',
  paused: '流程暂停',
  done: '取样分析',
  danger: '联锁动作',
};

function updateSnapUI(snap) {
  if (!snap) return;
  state.snap = snap;
  const phase = snap.phase;
  const hazardLevel = snap.hazard ? snap.hazard.level : 0;

  els.plantStatusText.textContent = PLANT_LABEL[phase] || '装置待机';
  els.plantLiveDot.classList.toggle('is-danger', hazardLevel >= 2 || phase === 'danger');
  els.ventStatus.textContent = hazardLevel >= 2 || phase === 'danger' ? '应急通风' : '运行中';

  els.runStateText.textContent = PHASE_LABEL[phase] || '待机';
  els.runState.classList.toggle('is-running', phase === 'running' || phase === 'paused');
  els.runState.classList.toggle('is-danger', phase === 'danger');
  els.runPhase.textContent = snap.stage || '准备投料';
  els.runTime.textContent = mmss(snap.elapsed);

  updateObservations(snap);
  updateEquations(snap);
  updateMetrics(snap);
  updateProducts(snap);
  updateChart(snap);
  updateCompareCards();
  updateHazard(snap);
  updateStartButton(snap);
  updateSteps(snap);
  updateDockStatus(snap);
}

function updateObservations(snap) {
  const obs = snap.observations || {};
  const key = `${obs.lead || ''}§${(obs.items || []).join('|')}`;
  if (key === state.obsKey) return;
  state.obsKey = key;
  els.observationLead.innerHTML = obs.lead || '';
  els.observationList.innerHTML = (obs.items || []).map((item) => `<li>${item}</li>`).join('');
}

function updateEquations(snap) {
  const active = snap.activeEquation || 0;
  const key = `${snap.reactionId}|${active}|${snap.equationMode}`;
  if (key === state.eqKey) return;
  state.eqKey = key;
  els.equationMode.textContent = snap.equationMode || '反应方程';
  els.equationCard.innerHTML = (snap.equations || [])
    .map((eq, i) => `
      <div class="eq-line ${i === active ? 'is-active' : 'is-dim'}">
        <span class="eq-label" style="flex:1 0 100%;margin-bottom:2px">${eq.label}</span>
        <span>${eq.html}</span>
      </div>`)
    .join('');
  els.ionicEquation.innerHTML = `<b>离子方程式</b>　${snap.ionic || ''}`;
}

function updateMetrics(snap) {
  const metrics = snap.metrics || [];
  const key = `${snap.reactionId}|${metrics.map((m) => m.label + m.unit).join('|')}`;
  if (key !== state.metricKey) {
    state.metricKey = key;
    els.metricsGrid.innerHTML = metrics
      .map((m) => `<div class="metric"><span>${m.label}</span><b><span data-metric-value></span><i>${m.unit}</i></b></div>`)
      .join('');
    state.metricEls = [...els.metricsGrid.querySelectorAll('.metric')];
  }
  metrics.forEach((m, i) => {
    const el = state.metricEls[i];
    if (!el) return;
    el.className = `metric is-${m.level || 'ok'}`;
    el.style.setProperty('--bar', `${clamp(m.bar || 0, 0, 100)}%`);
    el.style.setProperty('--metric-color', m.color || 'var(--accent)');
    const valueEl = el.querySelector('[data-metric-value]');
    if (valueEl) valueEl.textContent = m.value;
  });
}

function updateProducts(snap) {
  const list = snap.products || [];
  if (!list.length) {
    els.productsWrap.innerHTML = '<span class="product-chip is-empty"><i></i>暂无产物</span>';
    return;
  }
  els.productsWrap.innerHTML = list
    .map((p) => {
      const amount = p.textOnly ? p.amount : `${Number(p.amount).toFixed(1)} ${p.unit}`;
      return `<span class="product-chip" style="--chip-color:${p.color}"><i></i><b>${p.formula}</b>${amount}</span>`;
    })
    .join('');
}

function updateChart(snap) {
  if (state.reaction.id !== 'limewater' || !snap.extra || !snap.extra.chart) return;
  const canvas = els.precipChart;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const pad = { l: 48, r: 16, t: 20, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const a = sim.params.cA * 4;
  const yMax = Math.max(a * 100.09, 1);
  const xMax = 2;
  const X = (x) => pad.l + (x / xMax) * iw;
  const Y = (g) => pad.t + ih - (clamp(g, 0, yMax) / yMax) * ih;

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.font = '9px "Cascadia Code", "Consolas", monospace';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i++) {
    const x = i * 0.5;
    const px = X(x);
    ctx.strokeStyle = 'rgba(150, 190, 205, 0.09)';
    ctx.beginPath();
    ctx.moveTo(px, pad.t);
    ctx.lineTo(px, pad.t + ih);
    ctx.stroke();
    ctx.fillStyle = 'rgba(150, 180, 195, 0.6)';
    ctx.textAlign = 'center';
    ctx.fillText(x.toFixed(1), px, H - 9);
  }

  for (let i = 0; i <= 2; i++) {
    const g = (yMax / 2) * i;
    const py = Y(g);
    ctx.strokeStyle = 'rgba(150, 190, 205, 0.09)';
    ctx.beginPath();
    ctx.moveTo(pad.l, py);
    ctx.lineTo(pad.l + iw, py);
    ctx.stroke();
    ctx.fillStyle = 'rgba(150, 180, 195, 0.5)';
    ctx.textAlign = 'right';
    ctx.fillText(`${g.toFixed(0)} g`, pad.l - 6, py + 3);
  }

  ctx.strokeStyle = 'rgba(150, 190, 205, 0.16)';
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + ih);
  ctx.lineTo(pad.l + iw, pad.t + ih);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(X(0), Y(0));
  ctx.lineTo(X(1), Y(yMax));
  ctx.lineTo(X(2), Y(yMax));
  ctx.lineTo(X(2), Y(0));
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, pad.t, 0, pad.t + ih);
  fill.addColorStop(0, 'rgba(99, 220, 255, 0.2)');
  fill.addColorStop(1, 'rgba(99, 220, 255, 0.01)');
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(X(0), Y(0));
  ctx.lineTo(X(1), Y(yMax));
  ctx.lineTo(X(2), Y(yMax));
  ctx.strokeStyle = '#63dcff';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(99, 220, 255, 0.55)';
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = 'rgba(255, 184, 77, 0.55)';
  ctx.beginPath();
  ctx.moveTo(X(0.5), pad.t);
  ctx.lineTo(X(0.5), pad.t + ih);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 200, 120, 0.75)';
  ctx.textAlign = 'left';
  ctx.fillText('2:1 反应终点', X(0.5) + 5, pad.t + 10);

  ctx.strokeStyle = 'rgba(150, 190, 205, 0.22)';
  ctx.beginPath();
  ctx.moveTo(X(1), pad.t);
  ctx.lineTo(X(1), pad.t + ih);
  ctx.stroke();
  ctx.fillStyle = 'rgba(180, 205, 215, 0.55)';
  ctx.textAlign = 'right';
  ctx.fillText('沉淀最大量', X(1) - 5, pad.t + 10);
  ctx.setLineDash([]);

  const ratio = snap.extra.ratio ?? sim.params.ratio;
  const activeX = snap.phase === 'idle' ? ratio : snap.extra.nRatio ?? ratio;
  const currentGrams = Math.min(activeX, 1) * yMax;
  const cx = X(clamp(activeX, 0, 2));
  const cy = Y(currentGrams);

  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = 'rgba(255, 154, 60, 0.35)';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, pad.t + ih);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(cx, cy, 4.5, 0, TAU);
  ctx.fillStyle = '#ff9a3c';
  ctx.shadowColor = 'rgba(255, 154, 60, 0.8)';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 220, 190, 0.9)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = 'rgba(235, 190, 150, 0.9)';
  ctx.textAlign = cx > pad.l + iw * 0.72 ? 'right' : 'left';
  ctx.fillText(`${currentGrams.toFixed(0)} g`, cx + (cx > pad.l + iw * 0.72 ? -8 : 8), Math.max(pad.t + 10, cy - 8));
  ctx.restore();
}

function updateCompareCards() {
  if (state.reaction.id !== 'limewater') return;
  const ratio = sim.params.ratio;
  els.compareCards.forEach((card) => {
    const val = Number(card.dataset.ratio);
    card.classList.toggle('is-current', val < 0.5 ? ratio < 0.5 : ratio >= 0.5);
  });
  const a = sim.params.cA * 4;
  const max = a * 100.09;
  const target = Math.min(ratio, 1) * max;
  const mode = ratio < 0.495 ? '石灰水少量 · 清液含 Na₂CO₃' : ratio <= 0.505 ? '恰好完全反应 · 清液含 Na₂CO₃' : '石灰水过量 · 清液含 NaOH';
  els.compareTip.textContent = `当前配比 n(Ca(OH)₂)/n(NaHCO₃) = ${ratio.toFixed(2)} · ${mode} · 目标 CaCO₃ ≈ ${target.toFixed(1)} g（理论最大 ${max.toFixed(1)} g）。沉淀量随石灰水增加而增多，至 1:1 后不再增加。`;
}

function updateHazard(snap) {
  const h = snap.hazard || { level: 0 };
  const level = h.level || 0;
  const active = level > 0 || snap.phase === 'danger';
  els.hazardBanner.classList.toggle('is-active', active);
  els.hazardBanner.dataset.level = String(level);
  els.hazardVignette.classList.toggle('is-active', level >= 2 || snap.phase === 'danger');
  els.stage.classList.toggle('is-alarm', active);
  if (active) {
    els.hazardKicker.textContent = level >= 3 ? 'PROCESS ALARM · CRITICAL' : level === 2 ? 'PROCESS ALARM' : 'PROCESS NOTICE';
    els.hazardTitle.textContent = h.title || '工况提示';
    els.hazardDesc.textContent = h.desc || '';
    els.hazardDesc.title = h.desc || '';
    const action = h.actionLabel || '';
    els.hazardAction.style.display = action ? '' : 'none';
    els.hazardAction.textContent = action || '紧急处置';
  }
  const emergency = level >= 2 && snap.phase !== 'done';
  els.emergencyBtn.classList.toggle('is-visible', emergency);
}

function hideHazardBanner() {
  els.hazardBanner.classList.remove('is-active');
  els.hazardBanner.dataset.level = '0';
  els.hazardVignette.classList.remove('is-active');
  els.stage.classList.remove('is-alarm');
  els.emergencyBtn.classList.remove('is-visible');
}

function updateStartButton(snap) {
  let text = state.reaction.startLabel;
  if (snap.phase === 'running') text = '暂停反应';
  else if (snap.phase === 'paused') text = '继续反应';
  else if (snap.phase === 'done') text = '重新实验';
  else if (snap.phase === 'danger') text = '联锁锁定';
  els.startBtnText.textContent = text;
  els.startBtn.classList.toggle('is-running', snap.phase === 'running');
  els.startBtn.disabled = snap.phase === 'danger';
}

function updateSteps(snap) {
  const steps = els.processSteps.querySelectorAll('.step');
  let active = 0;
  if (snap.phase === 'idle') active = 0;
  else if (snap.phase === 'done' || snap.phase === 'danger') active = 3;
  else active = snap.progress < 0.2 ? 1 : 2;
  steps.forEach((step, i) => {
    step.classList.toggle('is-done', i < active);
    step.classList.toggle('is-active', i === active);
  });
}

function updateDockStatus(snap) {
  const phase = snap.phase;
  let text = '系统就绪 · 等待指令';
  if (phase === 'running') text = `流程运行 · ${snap.stage || ''} · ${(snap.tempC || 25).toFixed(1)} °C`;
  else if (phase === 'paused') text = '流程暂停 · 参数仍可调整';
  else if (phase === 'done') text = '批次完成 · 可取样分析';
  else if (phase === 'danger') text = '联锁动作 · 请立即执行紧急处置';
  els.dockStatusText.textContent = text;
  els.dockStatus.classList.toggle('is-running', phase === 'running' || phase === 'paused');
  els.dockStatus.classList.toggle('is-danger', phase === 'danger');
}

/* ------------------------------------------------------------
   Simulator events -> feed, toasts, FX
   ------------------------------------------------------------ */

function handleSnapEvents(events) {
  (events || []).forEach((ev) => {
    if (ev.type === 'explosion') {
      plant.triggerExplosion(ev.kind || 'sodium', ev.intensity || 1);
      flashWhite();
      sound.boom();
      pushEvent('danger', ev.text, ev.stamp);
      toast('danger', ev.text, ev.desc || '已触发联锁，请执行紧急处置。');
      return;
    }
    pushEvent(ev.level, ev.text, ev.stamp);
    if (ev.level === 'warn') {
      toast('warn', '工艺警告', ev.text);
      sound.warn();
    } else if (ev.level === 'danger') {
      toast('danger', '危险工况', ev.text);
      sound.alarm();
    } else if (ev.level === 'success') {
      toast('info', '批次完成', ev.text);
    }
  });
}

/* ------------------------------------------------------------
   Actions
   ------------------------------------------------------------ */

function doEmergency() {
  if (sim.phase === 'idle' || sim.phase === 'done') {
    toast('info', '无需处置', '当前没有进行中的反应。');
    return;
  }
  sim.emergency();
  sound.alarm();
  toast('warn', '紧急处置已执行', '进料切断 · 系统泄压 · 冷却与尾气吸收开启');
  updateSnapUI(sim.getSnapshot());
}

function resetExperiment() {
  sim.reset();
  plant.setReaction(state.reaction);
  state.obsKey = '';
  state.eqKey = '';
  state.metricKey = '';
  hideHazardBanner();
  clearEventFeed();
  updateSnapUI(sim.getSnapshot());
  sound.click();
}

/* ------------------------------------------------------------
   Equation library
   ------------------------------------------------------------ */

function buildEqLibrary() {
  const linked = EQUATIONS.filter((eq) => eq.link).length;
  if (els.eqLibMeta) {
    els.eqLibMeta.innerHTML = `<b>${EQUATIONS.length}</b> 条方程式 · <b>${EQUATIONS.length}</b> 个 3D 实景可演示 · <b>${linked}</b> 条化工厂全流程`;
  }

  const counts = {};
  EQUATIONS.forEach((eq) => { counts[eq.c] = (counts[eq.c] || 0) + 1; });
  els.eqCategories.innerHTML = EQUATION_CATEGORIES.map((cat) => {
    const count = cat.id === 'all' ? EQUATIONS.length : counts[cat.id] || 0;
    return `<button class="eq-cat${cat.id === 'all' ? ' is-active' : ''}" type="button" data-cat="${cat.id}">
      <span>${cat.short}</span>${cat.label}<b>${count}</b>
    </button>`;
  }).join('');

  renderEqDetailPlaceholder();
  renderEqList();
}

function renderEqDetailPlaceholder() {
  const linked = EQUATIONS.filter((eq) => eq.link).length;
  els.eqDetail.dataset.c = '';
  els.eqDetailBody.innerHTML = `
    <div class="eq-detail-empty">
      <div class="eq-detail-emblem">
        <svg viewBox="0 0 24 24" fill="none"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v18H6.5A2.5 2.5 0 0 1 4 18.5v-13Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H19M8 7h7M8 10.5h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      </div>
      <h3>${EQUATIONS.length} 条方程式已装订</h3>
      <p>按分类浏览，或直接搜索物质、条件与现象。带 3D 标记的条目可一键进入对应装置演示。</p>
      <div class="eq-stats">
        <div class="eq-stat"><b>${EQUATIONS.length}</b><span>方程式</span></div>
        <div class="eq-stat"><b>${EQUATION_CATEGORIES.length - 1}</b><span>知识模块</span></div>
        <div class="eq-stat"><b>${linked}</b><span>3D 关联</span></div>
      </div>
      <div class="eq-correction-list">
        <b>讲义校正记录 · 3 处</b>
        <ul>
          <li>Na 与 KCl：不采用“钠比钾活泼”的结论，金属活动性 K &gt; Na。</li>
          <li>Na 与 CO₂：原式碳不守恒，校正为 4Na + 3CO₂ → 2Na₂CO₃ + C。</li>
          <li>H₂S 与 H₂O₂：原式氢不守恒，校正为 H₂S + H₂O₂ → S↓ + 2H₂O。</li>
        </ul>
      </div>
    </div>`;
}

function getFilteredEquations() {
  const tokens = libState.query.trim().split(/\s+/).filter(Boolean).map(normEq);
  return EQUATIONS.filter((eq) => {
    if (libState.cat !== 'all' && eq.c !== libState.cat) return false;
    if (libState.tag === '3D') {
      if (!eq.link) return false;
    } else if (libState.tag && !(eq.tags || []).includes(libState.tag)) {
      return false;
    }
    if (tokens.length) {
      const hay = EQ_HAYSTACK.get(eq.id) || '';
      if (!tokens.every((token) => hay.includes(token))) return false;
    }
    return true;
  });
}

function renderEqList() {
  const items = getFilteredEquations();
  libState.items = items;

  if (libState.selected && !items.some((eq) => eq.id === libState.selected.id)) {
    libState.selected = null;
    els.eqLibrary.classList.remove('is-detail');
    renderEqDetailPlaceholder();
  }

  const cat = EQ_CAT_BY_ID.get(libState.cat);
  els.eqResultCount.textContent = `共 ${items.length} 条${cat && cat.id !== 'all' ? ` · ${cat.label}` : ''}`;
  els.eqList.style.display = items.length ? '' : 'none';
  els.eqEmpty.hidden = items.length > 0;

  els.eqList.innerHTML = items.map((eq) => {
    const active = libState.selected && libState.selected.id === eq.id;
    const meta = [];
    if (eq.cond) meta.push(`<span class="eq-item-cond">${escapeHtml(eq.cond)}</span>`);
    meta.push(`<span class="eq-item-3d${eq.link ? ' is-linked' : ''}">3D</span>`);
    return `<button class="eq-item${active ? ' is-active' : ''}" type="button" role="option" aria-selected="${active ? 'true' : 'false'}" data-id="${eq.id}" data-c="${eq.c}">
      <span class="eq-item-dot"></span>
      <span class="eq-item-main">
        <span class="eq-item-title">${escapeHtml(eq.t)}</span>
        <span class="eq-item-eq">${escapeHtml(eq.eq)}</span>
      </span>
      ${meta.length ? `<span class="eq-item-meta">${meta.join('')}</span>` : ''}
    </button>`;
  }).join('');

  els.eqCategories.querySelectorAll('.eq-cat').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.cat === libState.cat);
  });
  els.eqTags.querySelectorAll('.eq-tag-chip').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.tag === libState.tag);
  });
}

function selectEquation(id, { focusBack = true, silent = false } = {}) {
  const eq = EQUATIONS.find((item) => item.id === id);
  if (!eq) return;
  libState.selected = eq;
  els.eqList.querySelectorAll('.eq-item').forEach((item) => {
    const active = item.dataset.id === id;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  renderEqDetail(eq);
  if (window.matchMedia('(max-width: 1024px)').matches) {
    els.eqLibrary.classList.add('is-detail');
    if (focusBack) els.eqDetailBack.focus({ preventScroll: true });
  }
  if (!silent) sound.click();
}

function renderEqDetail(eq) {
  const cat = EQ_CAT_BY_ID.get(eq.c);
  const catIndex = EQUATION_CATEGORIES.findIndex((item) => item.id === eq.c);
  const arrowIndex = eq.eq.search(/[→⇌]/);
  const left = arrowIndex >= 0 ? eq.eq.slice(0, arrowIndex).trim() : eq.eq;
  const arrow = arrowIndex >= 0 ? eq.eq[arrowIndex] : '→';
  const right = arrowIndex >= 0 ? eq.eq.slice(arrowIndex + 1).trim() : '';
  const pillClass = (tag) => tag === '重点' ? ' is-key' : tag === '易错' ? ' is-warn' : tag === '安全' ? ' is-safe' : '';
  const pills = eq.tags.map((tag) => `<span class="eq-pill${pillClass(tag)}">${escapeHtml(tag)}</span>`).join('')
    + (eq.link ? '<span class="eq-pill">3D 已关联</span>' : '');

  els.eqDetail.dataset.c = eq.c;
  els.eqDetailBody.innerHTML = `
    <div class="eq-detail-kicker">
      <span class="eq-detail-cat"><i></i>${String(catIndex).padStart(2, '0')} · ${escapeHtml(cat ? cat.label : '方程式')}</span>
      <div class="eq-detail-tags">${pills}</div>
    </div>
    <h3>${escapeHtml(eq.t)}</h3>
    <div class="eq-formula-card">
      <span class="eq-formula-label">CHEMICAL EQUATION</span>
      <div class="eq-formula">
        <span class="eq-side">${escapeHtml(left)}</span>
        <span class="eq-arrow">${arrow}${eq.cond ? `<em>${escapeHtml(eq.cond)}</em>` : ''}</span>
        <span class="eq-side">${escapeHtml(right)}</span>
      </div>
    </div>
    ${eq.ion ? `<div class="eq-section"><h4>离子方程式</h4><p class="eq-ion">${escapeHtml(eq.ion)}</p></div>` : ''}
    <div class="eq-section"><h4>实验现象</h4><p>${escapeHtml(eq.ph)}</p></div>
    <div class="eq-section"><h4>易错点 · 说明</h4><p class="eq-note">${escapeHtml(eq.note)}</p></div>
    <div class="eq-detail-actions">
      <button class="eq-action" type="button" data-copy>
        <svg viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="11" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.4"/></svg>
        <span>复制方程式</span>
      </button>
      <button class="eq-action primary" type="button" data-demo="${eq.id}">
        <svg viewBox="0 0 24 24" fill="none"><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor"/></svg>
        <span>3D 实验演示</span>
      </button>
      ${eq.link ? `<button class="eq-action" type="button" data-link="${eq.link}">
        <svg viewBox="0 0 24 24" fill="none"><path d="M3 20h18M6 20V9l5 3V9l5 3V6l4 2v12" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
        <span>化工厂全流程</span>
      </button>` : ''}
    </div>`;
}

function hideEqDetail() {
  els.eqLibrary.classList.remove('is-detail');
  const active = els.eqList.querySelector('.eq-item.is-active');
  if (active) active.focus({ preventScroll: true });
}

function openEqLibrary() {
  if (libState.open) return;
  libState.open = true;
  els.eqLibrary.classList.add('is-open');
  els.eqLibrary.classList.remove('is-detail');
  els.eqLibrary.setAttribute('aria-hidden', 'false');
  els.libraryBtn.classList.add('is-active');
  renderEqList();
  hideTooltip();
  sound.ensure();
  sound.click();
  setTimeout(() => els.eqSearch.focus({ preventScroll: true }), 160);
}

function closeEqLibrary({ restoreFocus = true, silent = false } = {}) {
  if (!libState.open) return;
  libState.open = false;
  els.eqLibrary.classList.remove('is-open', 'is-detail');
  els.eqLibrary.setAttribute('aria-hidden', 'true');
  els.libraryBtn.classList.remove('is-active');
  if (restoreFocus) els.libraryBtn.focus({ preventScroll: true });
  if (!silent) sound.click();
}

function clearEqFilters() {
  libState.cat = 'all';
  libState.tag = '';
  libState.query = '';
  els.eqSearch.value = '';
  renderEqList();
  els.eqSearch.focus({ preventScroll: true });
}

function stepEqSelection(direction) {
  if (!libState.items.length) return;
  const current = libState.selected ? libState.items.findIndex((eq) => eq.id === libState.selected.id) : -1;
  const next = clamp(current + direction, 0, libState.items.length - 1);
  const eq = libState.items[next];
  selectEquation(eq.id, { focusBack: false, silent: true });
  const item = els.eqList.querySelector(`.eq-item[data-id="${eq.id}"]`);
  item?.scrollIntoView({ block: 'nearest' });
}

async function copyEquation(eq) {
  if (!eq) return;
  const text = `${eq.eq}${eq.cond ? `（${eq.cond}）` : ''}`;
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch (err) {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;top:-999px;left:-999px;opacity:0';
    document.body.appendChild(area);
    area.select();
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    area.remove();
  }
  const btn = els.eqDetailBody.querySelector('[data-copy]');
  if (btn) {
    btn.classList.toggle('is-copied', ok);
    const label = btn.querySelector('span');
    if (label) label.textContent = ok ? '已复制' : '复制失败';
    setTimeout(() => {
      btn.classList.remove('is-copied');
      if (label) label.textContent = '复制方程式';
    }, 1700);
  }
  if (ok) sound.tick();
}

function jumpToLinkedReaction(link) {
  const reaction = REACTIONS.find((item) => item.id === link);
  if (!reaction) return;
  const switching = state.reaction.id !== reaction.id;
  closeEqLibrary({ restoreFocus: false, silent: true });
  if (switching) selectReaction(reaction, false);
  const views = {
    sodium: 'reactor',
    chlorine: 'reactor',
    thermite: 'thermite',
    limewater: 'bench',
    dilution: 'reactor',
  };
  if (plant) applyView(views[reaction.id] || plant.defaultView || 'overview');
  els.sceneHint.classList.add('is-dim');
  if (!switching) toast('info', '已定位 3D 实验', reaction.name);
  sound.click();
}

let eqLab = null;

function ensureEquationLab() {
  if (eqLab) return eqLab;
  eqLab = new EquationLab({
    root: $('eqLab'),
    onBack: () => {},
    onExit: () => {
      eqLab?.close('exit');
      closeEqLibrary({ restoreFocus: true, silent: true });
    },
    onOpenPlant: (eq) => {
      eqLab?.close('exit');
      if (eq.link) jumpToLinkedReaction(eq.link);
    },
  });
  return eqLab;
}

function openEquationLab(eq, source = 'library') {
  if (!eq) return;
  const backLabel = document.querySelector('#eqLabBack span');
  if (backLabel) backLabel.textContent = source === 'rail' ? '返回化工厂' : '返回方程式库';
  const lab = ensureEquationLab();
  hideTooltip();
  lab.open(deriveDemo(eq));
  sound.ensure();
  sound.click();
}

function bindEqLibraryUI() {
  els.libraryBtn.addEventListener('click', () => {
    sound.ensure();
    if (libState.open) closeEqLibrary();
    else openEqLibrary();
  });

  els.eqLibClose.addEventListener('click', () => closeEqLibrary());
  els.eqLibrary.querySelector('.eq-lib-scrim')?.addEventListener('click', () => closeEqLibrary());

  els.eqSearch.addEventListener('input', () => {
    libState.query = els.eqSearch.value;
    renderEqList();
  });

  els.eqCategories.addEventListener('click', (event) => {
    const btn = event.target.closest('.eq-cat');
    if (!btn || btn.dataset.cat === libState.cat) return;
    libState.cat = btn.dataset.cat;
    renderEqList();
    els.eqList.scrollTop = 0;
    sound.click();
  });

  els.eqTags.addEventListener('click', (event) => {
    const btn = event.target.closest('.eq-tag-chip');
    if (!btn) return;
    libState.tag = libState.tag === btn.dataset.tag ? '' : btn.dataset.tag;
    renderEqList();
    els.eqList.scrollTop = 0;
    sound.click();
  });

  els.eqList.addEventListener('click', (event) => {
    const item = event.target.closest('.eq-item');
    if (!item) return;
    selectEquation(item.dataset.id);
  });

  els.eqDetailBody.addEventListener('click', (event) => {
    if (event.target.closest('[data-copy]')) {
      copyEquation(libState.selected);
      return;
    }
    const demoBtn = event.target.closest('[data-demo]');
    if (demoBtn) {
      openEquationLab(libState.selected);
      return;
    }
    const linkBtn = event.target.closest('[data-link]');
    if (linkBtn) jumpToLinkedReaction(linkBtn.dataset.link);
  });

  els.eqDetailBack.addEventListener('click', hideEqDetail);
  els.eqClearFilter.addEventListener('click', clearEqFilters);
}

function bindStaticUI() {
  els.startBtn.addEventListener('click', () => {
    sound.ensure();
    sound.click();
    if (sim.phase === 'danger') {
      toast('danger', '系统已联锁', '请先执行紧急泄压，再重新开始实验。');
      return;
    }
    sim.start();
    updateSnapUI(sim.getSnapshot());
  });

  els.resetBtn.addEventListener('click', () => {
    resetExperiment();
    toast('info', '实验已重置', '参数保持不变，可重新投料。');
  });

  els.emergencyBtn.addEventListener('click', doEmergency);
  els.hazardAction.addEventListener('click', doEmergency);

  els.cameraRail.querySelectorAll('.camera-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (!view) return;
      applyView(view);
      els.sceneHint.classList.add('is-dim');
      sound.click();
    });
  });

  els.compareCards.forEach((card) => {
    card.addEventListener('click', () => {
      const ratio = Number(card.dataset.ratio);
      sim.setParam('ratio', ratio);
      syncSliders();
      syncPresetActive();
      updateSnapUI(sim.getSnapshot());
      applyView('bench');
      sound.click();
      toast('info', '对比条件已设定', `石灰水配比 ${ratio.toFixed(2)} · CaCO₃ 目标量 ${(Math.min(ratio, 1) * sim.params.cA * 4 * 100.09).toFixed(1)} g`);
    });
  });

  els.soundBtn.addEventListener('click', () => {
    sound.enabled = !sound.enabled;
    els.soundBtn.classList.toggle('is-muted', !sound.enabled);
    if (sound.enabled) {
      sound.ensure();
      sound.click();
    }
  });

  els.rotateBtn.addEventListener('click', () => {
    if (!plant) return;
    plant.controls.autoRotate = !plant.controls.autoRotate;
    state.autoRotate = plant.controls.autoRotate;
    els.rotateBtn.classList.toggle('is-active', state.autoRotate);
    sound.click();
  });

  els.resetViewBtn.addEventListener('click', () => {
    if (!plant) return;
    applyView(plant.defaultView || 'overview');
    sound.click();
  });

  els.fullscreenBtn.addEventListener('click', () => {
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      root.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    sound.click();
  });

  document.addEventListener('pointerdown', (e) => {
    sound.ensure();
    if (!els.tooltip.contains(e.target)) hideTooltip();
  });

  window.addEventListener('keydown', (e) => {
    const target = e.target;
    const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    if (eqLab && eqLab.isOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        eqLab.close();
        return;
      }
      if (!typing && e.code === 'Space') {
        e.preventDefault();
        eqLab.togglePlay();
        return;
      }
      if (!typing && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        eqLab.restart();
        return;
      }
      return;
    }

    if (libState.open) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (els.eqLibrary.classList.contains('is-detail') && window.innerWidth <= 1024) hideEqDetail();
        else closeEqLibrary();
        return;
      }
      if (!typing && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        closeEqLibrary();
        return;
      }
      if (!typing && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        stepEqSelection(e.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      return;
    }

    if (!typing && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      openEqLibrary();
      return;
    }

    if (typing) return;

    if (e.code === 'Space') {
      e.preventDefault();
      els.startBtn.click();
    } else if (e.key === 'r' || e.key === 'R') {
      resetExperiment();
    }
  });

  window.addEventListener('resize', () => {
    plant?.resize();
    eqLab?.resize();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && sim.phase === 'running') sim.pause();
    if (document.hidden && eqLab?.isOpen) eqLab.pause();
  });
}

/* ------------------------------------------------------------
   Main loop
   ------------------------------------------------------------ */

function startLoop() {
  lastFrame = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    if (eqLab && eqLab.isOpen) {
      requestAnimationFrame(frame);
      return;
    }
    const snap = sim.update(dt);
    if (snap.events && snap.events.length) handleSnapEvents(snap.events);
    if (plant) plant.apply(snap, dt);
    uiAcc += dt;
    if (uiAcc >= 0.09) {
      uiAcc = 0;
      updateSnapUI(snap);
    }
    if (plant) plant.render(dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */

function fail(err) {
  console.error('[CHEM·PLANT] init failed', err);
  bootStep(100, `初始化失败：${err && err.message ? err.message : err}`);
  if (els.bootBar) els.bootBar.style.background = 'var(--danger)';
}

function init() {
  try {
    bootStep(22, '正在初始化三维装置…');
    plant = new Plant(els.sceneRoot, els.labelLayer, { onPick: showTooltip });
    bootStep(64, '连接过程仿真与仪表…');
    bindStaticUI();
    bindEqLibraryUI();
    bindReactionRailUI();
    buildEqLibrary();
    buildReactionList();
    selectReaction(REACTIONS[0], true);
    bootStep(88, '校准传感器与联锁…');
    requestAnimationFrame(() => {
      plant.resize();
      updateSnapUI(sim.getSnapshot());
      bootStep(100, '系统就绪');
      setTimeout(() => els.bootScreen.classList.add('is-hidden'), 480);
      startLoop();
    });
  } catch (err) {
    fail(err);
  }
}

init();
