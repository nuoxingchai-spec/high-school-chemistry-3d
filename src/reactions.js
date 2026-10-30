/* ============================================================
   CHEM·PLANT — reaction data + realtime simulation
   High-school chemistry, plant-scale teaching batch.
   ============================================================ */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 2.2);
const round = (v, d = 2) => Number(v.toFixed(d));

const C = {
  paleBlue: 0x9edbe7,
  paleCyan: 0x9fe8ff,
  milky: 0xdff7f4,
  pink: 0xff8fa9,
  amber: 0xffc46b,
  acid: 0xf4dfa8,
  water: 0xa9dcf2,
  chlorine: 0xd6e66b,
  hclMist: 0xe9f3f0,
  molten: 0xff6a22,
  white: 0xffffff,
};

export const REACTIONS = [
  {
    id: 'limewater',
    no: '01',
    name: '碳酸氢钠与石灰水',
    menuName: 'NaHCO₃ + 石灰水',
    menuFormula: 'NaHCO₃ + Ca(OH)₂',
    formula: 'NaHCO₃ + Ca(OH)₂',
    tag: '沉淀反应',
    risk: 'low',
    riskText: '低风险',
    accent: '#63dcff',
    accentRgb: '99,220,255',
    sceneMode: 'reactor',
    defaultView: 'reactor',
    startLabel: '开始投料',
    batchNote: 'NaHCO₃ 批次 4.0 L · 教学装置',
    tankA: { code: 'T-101', title: 'NaHCO₃ 溶液', short: 'NaHCO₃', color: C.paleCyan },
    tankB: { code: 'T-102', title: '澄清石灰水', short: 'Ca(OH)₂', color: C.milky },
    reactorLabel: '沉淀反应釜',
    defaults: { cA: 0.25, cB: 0.02, ratio: 0.35, feed: 1.0 },
    controls: [
      { key: 'cA', label: 'NaHCO₃ 浓度', min: 0.05, max: 0.8, step: 0.05, value: 0.25, decimals: 2, unit: 'mol/L', hintLeft: '稀', hintRight: '浓' },
      { key: 'cB', label: '石灰水浓度', min: 0.005, max: 0.022, step: 0.001, value: 0.02, decimals: 3, unit: 'mol/L', hintLeft: '稀', hintRight: '饱和 ≈ 0.022' },
      { key: 'ratio', label: '石灰水配比', min: 0.2, max: 1.6, step: 0.05, value: 0.35, decimals: 2, unit: 'mol/mol', hintLeft: '少量', hintRight: '过量' },
      { key: 'feed', label: '投料速度', min: 0.5, max: 2.5, step: 0.1, value: 1.0, decimals: 1, unit: '×', hintLeft: '慢', hintRight: '快' },
    ],
    presets: [
      { label: '少量石灰水', values: { ratio: 0.35 } },
      { label: '恰好完全反应', values: { ratio: 0.5 } },
      { label: '过量石灰水', values: { ratio: 1.25 } },
    ],
    equations: [
      {
        label: '石灰水少量 · NaHCO₃ 过量',
        html: '<span class="coef">2</span>NaHCO₃ + Ca(OH)₂ <span class="arrow">→</span> CaCO₃<span class="phase">↓</span> + Na₂CO₃ + <span class="coef">2</span>H₂O',
      },
      {
        label: '石灰水过量 · 足量',
        html: 'NaHCO₃ + Ca(OH)₂ <span class="arrow">→</span> CaCO₃<span class="phase">↓</span> + NaOH + H₂O',
      },
    ],
    ionic: [
      '2HCO₃⁻ + Ca²⁺ + 2OH⁻ → CaCO₃↓ + CO₃²⁻ + 2H₂O',
      'HCO₃⁻ + Ca²⁺ + OH⁻ → CaCO₃↓ + H₂O',
    ],
    initialLead: '两组澄清溶液已就位。设定石灰水配比后开始进料，观察白色沉淀的动态变化。',
    initialList: [
      'NaHCO₃ 溶液与澄清石灰水均为无色透明液体',
      '混合后生成 CaCO₃ 白色沉淀，全程无气体产生',
      '沉淀量随石灰水增加而增大，至 1:1 后不再增加',
    ],
    risks: [
      { text: '室温酸碱—沉淀反应，无有毒气体与明显放热。', level: 0 },
      { text: '石灰水呈碱性，操作时佩戴护目镜，避免溅入眼睛。', level: 0 },
      { text: '少量石灰水时清液含 Na₂CO₃；过滤后加 CaCl₂ 溶液可检出 CO₃²⁻。', level: 0 },
      { text: '过量石灰水时清液含 NaOH 与剩余 Ca(OH)₂，酚酞均变红。', level: 0 },
    ],
    notes: '饱和澄清石灰水浓度约 0.020 mol/L（25 °C）。本演示放大为工业批次，便于观察与读数。',
  },
  {
    id: 'sodium',
    no: '02',
    name: '钠与水反应',
    menuName: '钠与水',
    menuFormula: '2Na + 2H₂O',
    formula: 'Na + H₂O',
    tag: '剧烈反应',
    risk: 'high',
    riskText: '高风险',
    accent: '#ff9358',
    accentRgb: '255,147,88',
    sceneMode: 'reactor',
    defaultView: 'reactor',
    startLabel: '投入钠块',
    batchNote: '金属钠自密封仓 · 氢气体积实时累计',
    tankA: { code: 'T-201', title: '工艺水 · 含酚酞', short: 'H₂O + 酚酞', color: C.water },
    tankB: { code: 'T-202', title: '钠 · 煤油保护', short: 'Na / 煤油', color: C.amber },
    reactorLabel: '钠水反应釜',
    defaults: { mass: 3, waterTemp: 25, sealed: 0 },
    controls: [
      { key: 'mass', label: '钠块质量', min: 0.5, max: 25, step: 0.5, value: 3, decimals: 1, unit: 'g', hintLeft: '0.5 g', hintRight: '25 g' },
      { key: 'waterTemp', label: '水温', min: 15, max: 70, step: 1, value: 25, decimals: 0, unit: '°C', hintLeft: '15', hintRight: '70' },
      { key: 'sealed', label: '空间密闭度', min: 0, max: 100, step: 5, value: 0, decimals: 0, unit: '%', hintLeft: '敞开通风', hintRight: '密闭' },
    ],
    presets: [
      { label: '安全演示 · 敞开', values: { mass: 3, sealed: 0, waterTemp: 25 } },
      { label: '高危 · 密闭 8 g', values: { mass: 8, sealed: 80, waterTemp: 40 } },
      { label: '临界 · 密闭 15 g', values: { mass: 15, sealed: 100, waterTemp: 50 } },
    ],
    equations: [
      {
        label: '钠与水的置换反应',
        html: '<span class="coef">2</span>Na + <span class="coef">2</span>H₂O <span class="arrow">→</span> <span class="coef">2</span>NaOH + H₂<span class="phase">↑</span>',
      },
    ],
    ionic: ['2Na + 2H₂O → 2Na⁺ + 2OH⁻ + H₂↑'],
    initialLead: '反应釜内为含酚酞的水，顶部钠仓备有金属钠。投料前请评估钠块质量与空间密闭度。',
    initialList: [
      '钠须保存在煤油中，取用时应吸干表面煤油',
      '钠与水剧烈反应，生成 NaOH 并放出 H₂，放热明显',
      '氢气与空气混合的爆炸极限约为 4%–75%（体积分数）',
      '密闭空间内氢气积聚，遇反应热或明火可能爆炸',
    ],
    risks: [
      { text: '钠与水反应剧烈，容易飞溅、着火，必须少量取用。', level: 1 },
      { text: '氢气在空气中爆炸极限约 4%–75%，密闭操作可致爆炸。', level: 2 },
      { text: '钠着火不能用水扑灭，应使用干燥沙土或专用灭火剂。', level: 2 },
      { text: '演示默认敞开并保持通风；工业装置须氮封、防爆与氢浓度联锁。', level: 1 },
    ],
    notes: '为了可视化，氢气体积按 0 °C、101 kPa 的近似摩尔体积计算。真实操作请在通风橱内、使用极少量钠。',
  },
  {
    id: 'chlorine',
    no: '03',
    name: '氢气与氯气光照化合',
    menuName: 'H₂ + Cl₂',
    menuFormula: 'H₂ + Cl₂ → 2HCl',
    formula: 'H₂ + Cl₂',
    tag: '光化学爆炸',
    risk: 'high',
    riskText: '高风险',
    accent: '#d4e66b',
    accentRgb: '212,230,107',
    sceneMode: 'gas',
    defaultView: 'reactor',
    startLabel: '光照引爆',
    batchNote: '石英光反应腔 · 强光自由基引发',
    tankA: { code: 'G-301', title: '氢气', short: 'H₂', color: 0xbfe9ff },
    tankB: { code: 'G-302', title: '氯气', short: 'Cl₂', color: C.chlorine },
    reactorLabel: '石英光反应腔',
    defaults: { ratio: 1.0, pressure: 1.0, light: 70 },
    controls: [
      { key: 'ratio', label: 'H₂ / Cl₂ 体积比', min: 0.3, max: 2.8, step: 0.05, value: 1.0, decimals: 2, unit: 'mol/mol', hintLeft: 'Cl₂ 过量', hintRight: 'H₂ 过量' },
      { key: 'pressure', label: '初始压强', min: 0.5, max: 3.0, step: 0.1, value: 1.0, decimals: 1, unit: 'atm', hintLeft: '0.5', hintRight: '3.0' },
      { key: 'light', label: '光照强度', min: 20, max: 100, step: 10, value: 70, decimals: 0, unit: '%', hintLeft: '弱光', hintRight: '强光' },
    ],
    presets: [
      { label: '化学计量比 1:1', values: { ratio: 1.0, light: 100, pressure: 1.0 } },
      { label: '氯气过量', values: { ratio: 0.55, light: 60, pressure: 1.0 } },
      { label: '氢气过量', values: { ratio: 1.8, light: 60, pressure: 1.0 } },
    ],
    equations: [
      {
        label: '光照或点燃条件下爆炸式化合',
        html: 'H₂ + Cl₂ <span class="condition">光照 / 点燃</span><span class="arrow">→</span> <span class="coef">2</span>HCl',
      },
    ],
    ionic: ['共价分子间反应，不写离子方程式。生成的 HCl 遇水汽形成白色酸雾。'],
    initialLead: '石英反应腔已按设定比例充入 H₂ 与 Cl₂。黄绿色来自氯气，强光照射会引发链式反应。',
    initialList: [
      'H₂ 无色，Cl₂ 黄绿色、有毒，混合气体外观呈黄绿色',
      '光照下发生自由基链式反应，化学计量比混合时剧烈爆炸',
      'HCl 无色、易溶于水，遇水汽形成白雾',
      '氯气过量时尾气必须送入碱液吸收塔',
    ],
    risks: [
      { text: 'Cl₂ 为黄绿色剧毒气体，吸入会损伤呼吸道，必须密闭操作。', level: 2 },
      { text: 'H₂ 与 Cl₂ 按 1:1 混合，强光下可发生爆炸式反应。', level: 2 },
      { text: '反应生成 HCl 酸雾，设备与尾气管路须耐腐蚀。', level: 1 },
      { text: '尾气进入 NaOH 吸收塔：Cl₂ + 2NaOH → NaCl + NaClO + H₂O。', level: 0 },
    ],
    notes: '用强光（镁条燃烧或高压汞灯）照射氢氯混合气，是演示自由基链式反应的经典实验，严禁在开放环境模仿。',
  },
  {
    id: 'thermite',
    no: '04',
    name: '铝热反应',
    menuName: '铝热反应',
    menuFormula: '2Al + Fe₂O₃',
    formula: 'Al + Fe₂O₃',
    tag: '高温冶金',
    risk: 'high',
    riskText: '高风险',
    accent: '#ff6b3d',
    accentRgb: '255,107,61',
    sceneMode: 'thermite',
    defaultView: 'reactor',
    startLabel: '点火引燃',
    batchNote: '石墨坩埚 · 砂床 · 铁水锭模',
    tankA: { code: 'H-401', title: '铝粉', short: 'Al', color: 0xb9c6cf },
    tankB: { code: 'H-402', title: '氧化铁粉', short: 'Fe₂O₃', color: 0x9d4a35 },
    reactorLabel: '铝热反应坩埚',
    defaults: { ratio: 1.0, charge: 0.6 },
    controls: [
      { key: 'ratio', label: '铝 / 氧化铁配比', min: 0.6, max: 1.6, step: 0.05, value: 1.0, decimals: 2, unit: '×理论量', hintLeft: '铝不足', hintRight: '铝过量' },
      { key: 'charge', label: '装料量', min: 0.2, max: 2.0, step: 0.1, value: 0.6, decimals: 1, unit: 'kg', hintLeft: '0.2', hintRight: '2.0' },
    ],
    presets: [
      { label: '理论配比', values: { ratio: 1.0, charge: 0.6 } },
      { label: '铝不足', values: { ratio: 0.7, charge: 0.6 } },
      { label: '铝过量', values: { ratio: 1.4, charge: 0.6 } },
      { label: '大装料 · 高危', values: { ratio: 1.0, charge: 1.8 } },
    ],
    equations: [
      {
        label: '铝还原氧化铁 · 放热置换',
        html: '<span class="coef">2</span>Al + Fe₂O₃ <span class="condition">高温</span><span class="arrow">→</span> <span class="coef">2</span>Fe + Al₂O₃',
      },
    ],
    ionic: ['高温固相反应，不写离子方程式。产物为熔融铁与氧化铝炉渣。'],
    initialLead: '坩埚内装有铝粉与氧化铁粉的混合物，下方为砂床与铁水锭模。点火后反应温度可达 2500 °C 以上。',
    initialList: [
      '铝热剂是铝粉与金属氧化物的混合物，需引燃剂启动',
      '反应放出极大热量，产物铁以熔融态流出',
      '强光可损伤视网膜，严禁直视反应区',
      '熔融金属遇水会瞬间汽化，引发喷溅甚至爆炸',
    ],
    risks: [
      { text: '反应温度可达 2500 °C 以上，强光与热辐射危险。', level: 2 },
      { text: '熔融铁水飞溅，须保持安全距离并设置隔热屏。', level: 2 },
      { text: '严禁用水扑救铝热反应，只能使用干燥砂土覆盖隔离。', level: 2 },
      { text: '工业上用于野外焊接钢轨与冶炼难熔金属。', level: 0 },
    ],
    notes: '铝热反应是放热的置换反应：铝的还原性强于铁，在高温下将铁从其氧化物中置换出来。',
  },
  {
    id: 'dilution',
    no: '05',
    name: '浓硫酸稀释',
    menuName: '浓硫酸稀释',
    menuFormula: 'H₂SO₄ + H₂O',
    formula: 'H₂SO₄ + H₂O',
    tag: '放热 · 操作安全',
    risk: 'high',
    riskText: '高风险',
    accent: '#ffb545',
    accentRgb: '255,181,69',
    sceneMode: 'reactor',
    defaultView: 'reactor',
    startLabel: '开始稀释',
    batchNote: '耐酸稀释釜 · 温度联锁 · 冷却夹套',
    tankA: { code: 'A-501', title: '浓硫酸', short: 'H₂SO₄', color: C.acid },
    tankB: { code: 'A-502', title: '工艺水', short: 'H₂O', color: C.water },
    reactorLabel: '耐酸稀释釜',
    defaults: { acidConc: 98, waterRate: 1.0, stir: 300, order: true },
    controls: [
      { key: 'acidConc', label: '硫酸浓度', min: 30, max: 98, step: 1, value: 98, decimals: 0, unit: '%', hintLeft: '30%', hintRight: '98%' },
      { key: 'waterRate', label: '加料速度', min: 0.3, max: 3.0, step: 0.1, value: 1.0, decimals: 1, unit: '×', hintLeft: '慢', hintRight: '快' },
      { key: 'stir', label: '搅拌转速', min: 100, max: 600, step: 20, value: 300, decimals: 0, unit: 'r/min', hintLeft: '100', hintRight: '600' },
    ],
    presets: [
      { label: '酸入水 · 正确', values: { order: true, acidConc: 98 } },
      { label: '水入酸 · 危险', values: { order: false, acidConc: 98 } },
      { label: '稀酸入水', values: { order: true, acidConc: 50 } },
    ],
    equations: [
      {
        label: '稀释水合放热（示意）',
        html: 'H₂SO₄ + <span class="coef">n</span>H₂O <span class="arrow">→</span> H₂SO₄·<span class="coef">n</span>H₂O + <span class="condition">Q</span>',
      },
    ],
    ionic: ['浓硫酸稀释以物理稀释与水合放热为主，通常不要求书写化学方程式。稀硫酸中：H₂SO₄ → 2H⁺ + SO₄²⁻。'],
    initialLead: '当前为“酸入水”操作：釜内为水，浓硫酸将沿器壁缓慢加入并持续搅拌。可切换“水入酸”观察危险后果。',
    initialList: [
      '浓硫酸密度大于水，稀释时放出大量热',
      '正确顺序：将浓硫酸沿器壁缓缓加入水中，并不断搅拌',
      '若将水加入浓硫酸，水浮于酸面，局部过热会沸腾飞溅',
      '酸液飞溅会造成严重化学灼伤，必须佩戴面罩与耐酸手套',
    ],
    risks: [
      { text: '稀释放出大量热，局部温度可超过水的沸点。', level: 2 },
      { text: '水入酸会因局部沸腾导致酸液飞溅与酸雾逸出。', level: 3 },
      { text: '皮肤接触浓硫酸会造成严重灼伤，立即用大量清水冲洗。', level: 3 },
      { text: '工业稀释釜设温度联锁、冷却夹套与酸雾吸收。', level: 1 },
    ],
    notes: '稀释热主要来自水合作用。本演示为教学模型，温升与飞溅阈值做了可视化夸张处理。',
  },
];

export const getReaction = (id) => REACTIONS.find((r) => r.id === id) || REACTIONS[0];

const hazard = (level, title, desc, actionLabel = '紧急处置') => ({ level, title, desc, actionLabel });

/* ============================================================
   Simulator
   ============================================================ */

export class Simulator {
  constructor() {
    this.reaction = REACTIONS[0];
    this.params = { ...this.reaction.defaults };
    this.phase = 'idle';
    this.elapsed = 0;
    this.duration = 1;
    this.progress = 0;
    this._temp = 25;
    this._prevTemp = 25;
    this._dangerTime = 0;
    this._events = [];
    this._flags = {};
    this._mitigated = false;
    this._explosion = null;
    this._spatter = false;
  }

  load(reaction) {
    this.reaction = typeof reaction === 'string' ? getReaction(reaction) : reaction;
    this.params = { ...this.reaction.defaults };
    this._resetRuntime(true);
    this._temp = 25;
    this._prevTemp = 25;
    this._emit('info', `切换实验：${this.reaction.name}`);
  }

  reset() {
    this._resetRuntime(false);
    this._temp = 25;
    this._prevTemp = 25;
  }

  _resetRuntime(silent) {
    this.phase = 'idle';
    this.elapsed = 0;
    this.progress = 0;
    this.duration = 1;
    this._dangerTime = 0;
    this._flags = {};
    this._mitigated = false;
    this._explosion = null;
    this._spatter = false;
    this._events = [];
    if (!silent) this._emit('info', '实验已重置 · 参数保持不变');
  }

  setParam(key, value) {
    const ctrl = this.reaction.controls.find((c) => c.key === key);
    const next = ctrl ? clamp(Number(value), ctrl.min, ctrl.max) : value;
    this.params[key] = next;
    if (key === 'cB' || key === 'cA') {
      /* derived amounts are recomputed each frame */
    }
  }

  applyPreset(values) {
    Object.assign(this.params, values);
  }

  start() {
    if (this.phase === 'danger') return;
    if (this.phase === 'running') {
      this.phase = 'paused';
      return;
    }
    if (this.phase === 'paused') {
      this.phase = 'running';
      return;
    }
    this.phase = 'running';
    this.elapsed = 0;
    this.progress = 0;
    this.duration = this._getDuration();
    this._dangerTime = 0;
    this._flags = {};
    this._mitigated = false;
    this._explosion = null;
    this._spatter = false;
    this._events = [];
    this._temp = this._initialTemp();
    this._prevTemp = this._temp;
    this._emit('info', this.reaction.startLabel + ' · 联锁检查通过');
    this._onStart();
  }

  pause() {
    if (this.phase === 'running') this.phase = 'paused';
  }

  resume() {
    if (this.phase === 'paused') this.phase = 'running';
  }

  emergency() {
    if (this.phase === 'idle') return;
    this._mitigated = true;
    this._dangerTime = Math.max(this._dangerTime, 1.2);
    this._emit('warn', '紧急处置已执行 · 进料切断、系统泄压、冷却开启');
    if (this.phase === 'danger') {
      this.phase = 'done';
    } else if (this.phase === 'running' || this.phase === 'paused') {
      this.phase = 'done';
    }
    this._explosion = null;
    this._spatter = false;
  }

  _getDuration() {
    switch (this.reaction.id) {
      case 'limewater': return 7 / clamp(this.params.feed, 0.3, 3);
      case 'sodium': return 7.5 + this.params.mass * 0.22;
      case 'chlorine': return 6;
      case 'thermite': return 9.5;
      case 'dilution': return 8 / clamp(this.params.waterRate, 0.2, 4);
      default: return 7;
    }
  }

  _initialTemp() {
    if (this.reaction.id === 'sodium') return 25 + (this.params.waterTemp - 25) * 0.3;
    return 25;
  }

  _onStart() {
    switch (this.reaction.id) {
      case 'limewater':
        this._emit('info', `B 罐进料阀开启 · 石灰水配比 ${this.params.ratio.toFixed(2)} : 1`);
        break;
      case 'sodium':
        this._emit('warn', `钠块 ${this.params.mass.toFixed(1)} g 装入投料仓 · 空间密闭度 ${this.params.sealed}%`);
        break;
      case 'chlorine':
        this._emit('info', `石英腔配气完成 · H₂/Cl₂ = ${this.params.ratio.toFixed(2)} · 等待强光引发`);
        break;
      case 'thermite':
        this._emit('warn', `引燃剂点燃 · 铝热剂装料 ${this.params.charge.toFixed(1)} kg`);
        break;
      case 'dilution':
        this._emit(this.params.order ? 'info' : 'warn', this.params.order ? '酸入水 · 冷却夹套与搅拌已启动' : '水入酸 · 危险操作！局部过热风险极高');
        break;
      default:
    }
  }

  _emit(level, text, extra = null) {
    this._events.push({
      level,
      text,
      time: this.elapsed,
      stamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      ...(extra || {}),
    });
  }

  _triggerExplosion(kind, title, desc) {
    if (this.phase === 'danger') return;
    this.phase = 'danger';
    this._dangerTime = 0;
    this._explosion = { kind, title, desc };
    this._temp = Math.max(this._temp, kind === 'chlorine' ? 1150 : 680);
    this._events.push({
      type: 'explosion',
      level: 'danger',
      text: title,
      desc,
      kind,
      intensity: kind === 'chlorine' ? 1 : 0.85,
      stamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    });
  }

  update(dt) {
    const d = clamp(dt, 0, 0.08);
    this._prevTemp = this._temp;
    if (this.phase === 'running') {
      this.elapsed += d;
      this.progress = clamp(this.elapsed / this.duration, 0, 1);
      this._step(d);
      if (this.phase === 'running' && this.progress >= 1) {
        this.phase = 'done';
        this._progress = 1;
        this._onDone();
      }
    } else if (this.phase === 'danger') {
      this._dangerTime += d;
      this._cool(d, this.reaction.id === 'chlorine' ? 0.22 : 0.3);
    } else if (this.phase === 'done') {
      this._cool(d, this.reaction.id === 'thermite' ? 0.018 : 0.06);
    }
    const snap = this.getSnapshot();
    snap.events = this._events.splice(0);
    return snap;
  }

  _cool(dt, rate) {
    this._temp += (25 - this._temp) * clamp(dt * rate, 0, 1);
  }

  _approachTemp(target, k, dt) {
    this._temp += (target - this._temp) * (1 - Math.exp(-k * dt));
    this._temp = clamp(this._temp, 0, 3000);
  }

  _step(dt) {
    const p = this.progress;
    const f = this._flags;
    switch (this.reaction.id) {
      case 'limewater': {
        const target = 25 + 3.4 * Math.min(this.params.ratio, 1) * Math.pow(this.params.cA / 0.25, 0.35) * p;
        this._approachTemp(target, 1.1, dt);
        if (!f.precip && p > 0.5) {
          f.precip = true;
          this._emit('info', '检测到白色沉淀析出 · 浊度上升');
        }
        if (!f.half && p > 0.9) {
          f.half = true;
          this._emit('info', '进料接近终点 · 沉淀量变化趋缓');
        }
        break;
      }
      case 'sodium': {
        if (!f.inject && p > 0.08) {
          f.inject = true;
          this._emit('warn', '钠块接触水面 · 反应开始');
        }
        const reactionP = clamp((p - 0.06) / 0.86, 0, 1);
        const target = 25 + (this.params.waterTemp - 25) * 0.35 + 46 * Math.sqrt(this.params.mass / 25) * reactionP;
        this._approachTemp(target, 1.35, dt);
        if (!f.explode && this.params.sealed >= 70 && this.params.mass >= 2 && p >= 0.37) {
          f.explode = true;
          this._triggerExplosion('sodium', '氢气爆炸', '密闭空间内 H₂ 达到爆炸极限，被反应热引燃，釜体超压泄爆。');
          return;
        }
        if (!f.jet && this.params.sealed < 70 && this.params.mass >= 8 && p > 0.45) {
          f.jet = true;
          this._emit('danger', '氢气流股被引燃 · 火炬燃烧');
        }
        if (!f.bubbleEvent && p > 0.2) {
          f.bubbleEvent = true;
          this._emit('info', 'H₂ 持续逸出 · 液面剧烈翻腾');
        }
        break;
      }
      case 'chlorine': {
        if (!f.ignite && p >= 0.2) {
          f.ignite = true;
          const explosive = Math.abs(this.params.ratio - 1) <= 0.08 && this.params.light >= 45 && this.params.pressure >= 0.7;
          if (explosive) {
            f.explode = true;
            this._triggerExplosion('chlorine', '光化学爆炸', 'H₂ 与 Cl₂ 按化学计量比混合，强光引发链式反应，腔体瞬间超压。');
            return;
          }
          this._emit('warn', '强光引发链式反应 · 黄绿色开始褪去');
        }
        const reactionP = clamp((p - 0.2) / 0.72, 0, 1);
        const target = 25 + 520 * easeOut(reactionP);
        this._approachTemp(target, 1.8, dt);
        if (!f.mist && reactionP > 0.4) {
          f.mist = true;
          this._emit('info', '腔壁出现白色酸雾 · HCl 生成');
        }
        break;
      }
      case 'thermite': {
        if (!f.ignite && p > 0.1) {
          f.ignite = true;
          this._emit('warn', '引燃剂燃烧 · 铝热反应开始');
        }
        if (!f.iron && p > 0.38) {
          f.iron = true;
          this._emit('warn', '铁水形成 · 熔融物流入锭模');
        }
        const reactionP = clamp((p - 0.12) / 0.76, 0, 1);
        const factor = this._thermiteConversion();
        const target = 25 + 2550 * reactionP * factor;
        this._approachTemp(target, 2.6, dt);
        break;
      }
      case 'dilution': {
        const peak = this._dilutionPeak();
        const tempTarget = 25 + (peak - 25) * easeOut(p);
        this._approachTemp(tempTarget, 1.5, dt);
        if (!this.params.order && this.params.acidConc >= 70 && p > 0.12 && !f.warnDanger) {
          f.warnDanger = true;
          this._emit('danger', '水入浓硫酸 · 局部过热，液面出现爆沸征兆');
        }
        if (!f.spatter && this._temp >= 100) {
          f.spatter = true;
          this._spatter = true;
          this._emit('danger', '局部沸腾 · 酸液飞溅，酸雾逸出');
        }
        break;
      }
      default:
    }
  }

  _onDone() {
    switch (this.reaction.id) {
      case 'limewater': {
        const r = this.params.ratio;
        const mode = r < 0.495 ? '石灰水少量' : r < 0.995 ? '石灰水过量 · 部分转化' : '石灰水过量';
        this._emit('success', `进料完成 · ${mode} · 取样分析`);
        break;
      }
      case 'sodium':
        this._emit('success', '反应结束 · 溶液显碱性，氢气已释放');
        break;
      case 'chlorine': {
        const excess = this.params.ratio < 0.85 ? 'Cl₂' : this.params.ratio > 1.15 ? 'H₂' : null;
        this._emit(excess ? 'warn' : 'success', excess ? `反应结束 · 尾气含过量 ${excess}，吸收塔运行` : '反应完成 · HCl 酸雾进入碱液吸收塔');
        break;
      }
      case 'thermite':
        this._emit('success', '铝热反应结束 · 铁水在锭模中冷却');
        break;
      case 'dilution':
        this._emit(this._spatter ? 'warn' : 'success', this._spatter ? '稀释失控后紧急冷却 · 现场需中和处理' : '稀释完成 · 温度开始回落');
        break;
      default:
    }
  }

  _thermiteConversion() {
    const stoich = clamp(1 - Math.abs(this.params.ratio - 1) * 0.9, 0.12, 1);
    const loadFactor = clamp(this.params.charge / 0.6, 0.35, 1.08);
    return clamp(stoich * loadFactor, 0, 1);
  }

  _dilutionPeak() {
    const concFactor = Math.pow(this.params.acidConc / 98, 1.35);
    const orderFactor = this.params.order ? 34 : 118;
    const rateFactor = 0.64 + 0.36 * this.params.waterRate;
    const stirFactor = this.params.order ? 1 - Math.min(0.22, this.params.stir / 2600) : 1;
    let peak = 25 + orderFactor * concFactor * rateFactor * stirFactor;
    if (this._mitigated) peak = Math.min(peak, 62);
    if (this._spatter) peak = Math.min(peak, 108);
    return peak;
  }

  _limewaterAmounts() {
    const { cA, ratio, cB } = this.params;
    const a = cA * 4; // batch volume 4.0 L
    const p = this.phase === 'idle' ? 0 : this.phase === 'done' || this.phase === 'danger' ? 1 : this.progress;
    const sm = smoothstep(p);
    const b = ratio * a * sm;
    let nCaCO3, nNa2CO3 = 0, nNaOH = 0, nNaHCO3 = 0, nCaOH2 = 0;
    nCaCO3 = Math.min(a, b);
    if (b < a / 2) {
      nNa2CO3 = b;
      nNaHCO3 = a - 2 * b;
    } else if (b < a) {
      nNa2CO3 = a - b;
      nNaOH = 2 * b - a;
    } else {
      nNaOH = a;
      nCaOH2 = b - a;
    }
    const x = a > 0 ? b / a : 0;
    const bVolume = cB > 0 ? b / cB : 0;
    return { a, b, p, sm, x, nCaCO3, nNa2CO3, nNaOH, nNaHCO3, nCaOH2, bVolume };
  }

  getSnapshot() {
    switch (this.reaction.id) {
      case 'limewater': return this._snapLimewater();
      case 'sodium': return this._snapSodium();
      case 'chlorine': return this._snapChlorine();
      case 'thermite': return this._snapThermite();
      case 'dilution': return this._snapDilution();
      default: return this._snapLimewater();
    }
  }

  /* ------------------------- SNAPSHOTS ------------------------- */

  _snapLimewater() {
    const { cA, cB, ratio } = this.params;
    const m = this._limewaterAmounts();
    const temp = this._temp;
    const targetRatio = ratio;
    const activeEq = targetRatio > 0.5 ? 1 : 0;
    let mode;
    if (targetRatio < 0.495) mode = '石灰水少量';
    else if (targetRatio <= 0.505) mode = '恰好完全反应';
    else if (targetRatio < 0.995) mode = '石灰水过量 · 部分转化';
    else mode = '石灰水过量';

    let pH;
    if (m.x <= 0.5) pH = 8.35 + (11.9 - 8.35) * (m.x / 0.5);
    else pH = 11.9 + 1.35 * Math.min(1, (m.x - 0.5) / 0.5) + (m.x > 1 ? 0.08 : 0);
    if (this.phase === 'idle') pH = 8.35;
    pH = clamp(pH, 0, 14);

    const idle = this.phase === 'idle';
    const feedP = idle ? 0 : this.phase === 'done' || this.phase === 'danger' ? 1 : this.progress;
    const running = this.phase === 'running';
    const paused = this.phase === 'paused';
    const stage = idle ? '准备就绪' : this.phase === 'done' ? '取样分析' : paused ? '进料暂停' : '石灰水进料中';

    let lead;
    let items;
    if (idle) {
      lead = `反应釜已预装 ${(4).toFixed(1)} L NaHCO₃ 溶液（${cA.toFixed(2)} mol/L）。B 罐澄清石灰水待命，设定配比后开始进料。`;
      items = [
        '两溶液均为无色透明，混合前无沉淀产生',
        `当前配比指向：${mode}`,
        '本反应无气体生成，现象以白色沉淀与溶液碱性为主',
      ];
    } else if (this.phase === 'running' || paused) {
      lead = paused
        ? '进料已暂停，釜内白色沉淀保持悬浮，组分不再变化。'
        : '石灰水连续注入，釜内液体逐渐浑浊，白色沉淀不断增多。';
      items = [
        `<strong>已生成 CaCO₃ ≈ ${(m.nCaCO3 * 100.09).toFixed(1)} g</strong>，沉淀呈白色絮状`,
        m.x < 0.5
          ? '石灰水不足：反应按 2NaHCO₃ + Ca(OH)₂ 进行，清液含 Na₂CO₃ 与剩余 NaHCO₃'
          : '石灰水相对过量：Na₂CO₃ 继续与 Ca(OH)₂ 反应，沉淀量继续增加',
        '液面无气泡产生，压力表保持常压',
        `实时配比 n(Ca(OH)₂)/n(NaHCO₃) = ${m.x.toFixed(2)}`,
      ];
    } else {
      if (targetRatio < 0.495) {
        lead = '石灰水少量：白色沉淀生成但未达最大量，清液中的 Na₂CO₃ 使酚酞变红。';
        items = [
          '白色 CaCO₃ 沉淀沉积于釜底，上层清液仍较澄清',
          '清液含 Na₂CO₃（水解显碱性），滴加酚酞变红',
          '取过滤后清液加 CaCl₂ 溶液，出现白色 CaCO₃ 沉淀',
          '全过程无气体产生',
        ];
      } else if (targetRatio < 0.995) {
        lead = '石灰水已超过第一步反应所需量：Na₂CO₃ 部分转化为 CaCO₃，沉淀仍在增加但增速下降。';
        items = [
          '白色沉淀量继续增大，尚未达到最大值',
          '清液同时含 Na₂CO₃ 与 NaOH，碱性增强',
          '过滤后加 CaCl₂ 仍可检出 CO₃²⁻',
          '没有气体逸出',
        ];
      } else {
        lead = '石灰水过量：白色沉淀量达到最大值并沉积釜底；清液含 NaOH 与剩余 Ca(OH)₂。';
        items = [
          '白色沉淀量不再增加（n(Ca(OH)₂) : n(NaHCO₃) ≥ 1 : 1）',
          '酚酞试验：清液明显变红，碱性更强',
          '过滤后加 CaCl₂ 溶液无明显现象（CO₃²⁻ 已完全沉淀）',
          '全程无气泡，区别于碳酸氢钠受热分解',
        ];
      }
    }

    const products = [
      { formula: 'CaCO₃', amount: m.nCaCO3 * 100.09, unit: 'g', color: '#dfeef3' },
      m.nNa2CO3 > 0.0005 ? { formula: 'Na₂CO₃', amount: m.nNa2CO3, unit: 'mol', color: '#8fe3ff' } : null,
      m.nNaOH > 0.0005 ? { formula: 'NaOH', amount: m.nNaOH, unit: 'mol', color: '#ffcf88' } : null,
      m.nNaHCO3 > 0.0005 ? { formula: 'NaHCO₃', amount: m.nNaHCO3, unit: 'mol', color: '#9fe8ff' } : null,
      m.nCaOH2 > 0.0005 ? { formula: 'Ca(OH)₂', amount: m.nCaOH2, unit: 'mol', color: '#d9f3ef' } : null,
    ].filter(Boolean).slice(0, 4);

    const xTarget = targetRatio;
    return this._base({
      phase: this.phase,
      stage,
      tempC: temp,
      pressureKpa: 101.3,
      hazard: hazard(0, '反应平稳', '室温沉淀反应，无有毒气体，风险低。', ''),
      equationMode: mode,
      activeEquation: activeEq,
      observations: { lead, items },
      products,
      metrics: [
        { label: '温度', value: temp.toFixed(1), unit: '°C', bar: clamp((temp - 20) / 50 * 100, 0, 100), color: '#ffb84d', level: 'ok' },
        { label: 'pH', value: pH.toFixed(2), unit: '', bar: clamp(pH / 14 * 100, 0, 100), color: '#63dcff', level: 'ok' },
        { label: 'CaCO₃ 沉淀', value: (m.nCaCO3 * 100.09).toFixed(1), unit: 'g', bar: clamp(Math.min(1, m.x) * 100, 0, 100), color: '#d9edf3', level: 'ok' },
        { label: '石灰水用量', value: m.bVolume.toFixed(1), unit: 'L', bar: clamp(targetRatio / 1.6 * 100, 0, 100), color: '#8fe3ff', level: 'ok' },
      ],
      visual: {
        mode: 'reactor',
        fill: idle ? 0.43 : 0.43 + 0.19 * m.sm,
        liquidColor: C.paleBlue,
        liquidOpacity: 0.5 + 0.2 * Math.min(1, m.x),
        turbidity: clamp(m.x * 1.4, 0, 1) * (idle ? 0 : 0.9),
        ppt: clamp(m.x, 0, 1),
        sediment: idle ? 0 : this.phase === 'done' ? 0.55 : 0.12 * m.sm,
        bubble: 0,
        steam: Math.max(0, (temp - 40) / 100),
        spatter: 0,
        stir: idle ? 90 : running ? 360 : 180,
        feedA: 0,
        feedB: running && feedP < 0.97 ? 1 : 0,
        tankA: 0.46,
        tankB: 0.92 - 0.74 * m.sm,
        tankAColor: C.paleCyan,
        tankBColor: C.milky,
        flame: 0, sparks: 0, glow: 0, molten: 0, moldFill: 0, sodium: 0,
        gasColor: C.chlorine, gasOpacity: 0, mist: 0, gasFill: 0,
        ventType: 'none', ventRate: 0,
        shake: 0, flash: 0,
        acidSpray: 0,
      },
      extra: {
        chart: true,
        ratio: targetRatio,
        x: xTarget,
        threshold: 0.5,
        curve: 'limewater',
        nRatio: m.x,
        bVolume: m.bVolume,
      },
    });
  }

  _snapSodium() {
    const { mass, waterTemp, sealed } = this.params;
    const idle = this.phase === 'idle';
    const p = idle ? 0 : this.progress;
    const reactionP = idle ? 0 : clamp((p - 0.06) / 0.86, 0, 1);
    const h2mol = (mass / 22.99) * 0.5 * reactionP;
    const h2L = h2mol * 22.4;
    const danger = this.phase === 'danger' && !this._mitigated;
    const running = this.phase === 'running';
    const temp = this._temp;
    const pH = idle ? 7 : 7 + 6 * Math.pow(reactionP, 0.62);
    const sealedR = sealed / 100;
    let pressureKpa = 101.3 + Math.pow(sealedR, 1.4) * (h2L / 20) * 260;
    if (danger) pressureKpa += 430 * Math.exp(-this._dangerTime * 0.55);
    if (this._mitigated) pressureKpa = 101.3;
    pressureKpa = clamp(pressureKpa, 95, 700);

    const jetFire = !danger && running && sealed < 70 && mass >= 8 && p > 0.45;
    const nearExplosive = running && sealed >= 70 && mass >= 2;
    let hz = hazard(0, '反应受控', '敞开、通风条件下氢气被迅速稀释，风险较低。', '');
    if (danger) {
      hz = hazard(3, '氢气爆炸 · 超压泄爆', '密闭空间内 H₂ 达到爆炸极限，被反应热引燃；冲击波与钠火同时出现。', '紧急泄压');
    } else if (this._mitigated) {
      hz = hazard(1, '紧急泄压完成', '系统已切断进料并泄压，氢气浓度回落，温度逐渐下降。', '');
    } else if (nearExplosive) {
      hz = hazard(2, '密闭氢气积聚 · 爆炸风险', 'H₂ 在密闭空间内持续累积，已接近爆炸极限（4%–75%）。', '紧急泄压');
    } else if (jetFire) {
      hz = hazard(2, '氢气流股燃烧', '逸出的 H₂ 被反应热引燃，形成稳定火炬，须切断钠源。', '切断钠源');
    } else if (running && sealed >= 70) {
      hz = hazard(1, '密闭运行 · 氢气监测', '氢气在密闭空间内累积，建议打开通风或降低密闭度。', '');
    }

    const stage = idle ? '准备就绪' : this.phase === 'done' ? '反应完成' : this.phase === 'paused' ? '投料暂停' : this.phase === 'danger' ? '爆燃 / 泄压' : '钠水反应中';
    let lead;
    let items;
    if (idle) {
      lead = `反应釜内为 ${waterTemp} °C 的水，钠仓备有 ${mass.toFixed(1)} g 金属钠。密闭度 ${sealed}%，请评估风险后投料。`;
      items = [
        '钠浮在水面上，反应放热会使其熔成小球',
        '气体产物为 H₂，溶液生成 NaOH（酚酞变红）',
        `理论 H₂ 体积约 ${((mass / 22.99) * 0.5 * 22.4).toFixed(2)} L`,
        sealed >= 70 && mass >= 2 ? '当前参数存在密闭爆炸风险' : '敞开操作可有效稀释氢气',
      ];
    } else if (danger) {
      lead = '氢气与空气/氧气混合达到爆炸极限，被反应热引燃，釜内发生爆燃并超压泄放。';
      items = [
        '强闪光与冲击波，釜体安全阀起跳',
        '熔融钠飞溅，遇水继续反应，火势扩大',
        'H₂ 爆炸极限约 4%–75%，密闭空间风险极高',
        '必须切断钠源，使用干燥沙土灭火，严禁用水',
      ];
    } else if (this.phase === 'done') {
      lead = this._mitigated
        ? '紧急泄压后氢气浓度下降，反应停止；溶液呈碱性，需中和与通风。'
        : '反应结束：钠完全消耗，溶液呈红色（酚酞），氢气已逸出或收集。';
      items = [
        '钠浮、熔、游、响，溶液变红的经典现象',
        `生成 NaOH ≈ ${(mass / 23 * 40).toFixed(1)} g`,
        `放出 H₂ ≈ ${((mass / 22.99) * 0.5 * 22.4).toFixed(2)} L（0 °C，101 kPa）`,
        jetFire ? '逸出氢气流股曾被点燃，火炬已熄灭' : '反应放热明显，釜体温度升高',
      ];
    } else {
      lead = sealed >= 70
        ? '钠块入水剧烈反应，H₂ 在密闭空间内快速累积，压力表持续上升。'
        : '钠块落入水中：熔成光亮小球，在水面四处游动，发出嘶嘶声，溶液逐渐变红。';
      items = [
        '<strong>浮</strong>：钠密度小于水，浮于液面',
        '<strong>熔、游、响</strong>：放热熔成小球，反应气体推动其游动并发出响声',
        '<strong>红</strong>：生成 NaOH，酚酞变红',
        sealed >= 70 ? `H₂ 累积 ≈ ${h2L.toFixed(2)} L，空间密闭度 ${sealed}%` : `H₂ 逸出 ≈ ${h2L.toFixed(2)} L，通风稀释`,
      ];
    }

    const products = [
      { formula: 'NaOH', amount: (mass / 23) * 40 * reactionP, unit: 'g', color: '#ffcf88' },
      { formula: 'H₂', amount: h2L, unit: 'L', color: '#bfe9ff' },
      mass * (1 - reactionP) > 0.01 ? { formula: 'Na', amount: mass * (1 - reactionP), unit: 'g', color: '#c9d4dc' } : null,
      { formula: '酚酞', amount: reactionP > 0.05 ? '变红' : '无色', unit: '', color: '#ff8fa9', textOnly: true },
    ].filter(Boolean);

    const visual = {
      mode: 'reactor',
      fill: 0.5,
      liquidColor: C.pink,
      liquidOpacity: 0.66,
      turbidity: danger ? 0.35 : 0.05,
      ppt: 0,
      sediment: 0,
      bubble: reactionP * clamp(0.35 + mass / 18, 0.3, 1),
      steam: clamp((temp - 55) / 80, 0, 0.8),
      spatter: danger ? 0.8 : 0,
      stir: idle ? 80 : 280,
      feedA: 0,
      feedB: 0,
      tankA: 0.82,
      tankB: 0.75,
      tankAColor: C.water,
      tankBColor: C.amber,
      flame: danger ? 1 : jetFire ? 0.75 : 0,
      sparks: danger ? 1 : 0,
      glow: danger ? 0.9 : jetFire ? 0.4 : 0,
      molten: 0, moldFill: 0,
      sodium: idle ? 0.95 : clamp(1 - reactionP * 1.1, 0, 1),
      gasColor: C.chlorine, gasOpacity: 0, mist: 0, gasFill: 0,
      ventType: danger ? 'fire' : jetFire ? 'fire' : 'none', ventRate: danger || jetFire ? 1 : 0,
      shake: danger ? Math.exp(-this._dangerTime * 0.7) : 0,
      flash: danger ? Math.exp(-this._dangerTime * 2.2) : 0,
      acidSpray: 0,
    };

    const h2bar = clamp(h2L / 15 * 100, 0, 100);
    return this._base({
      phase: this.phase,
      stage,
      tempC: temp,
      pressureKpa,
      hazard: hz,
      equationMode: '置换 · 放热',
      activeEquation: 0,
      observations: { lead, items },
      products,
      metrics: [
        { label: '温度', value: temp.toFixed(1), unit: '°C', bar: clamp((temp - 20) / 100 * 100, 0, 100), color: '#ffb84d', level: temp > 70 ? 'warn' : 'ok' },
        { label: '压力', value: pressureKpa.toFixed(0), unit: 'kPa', bar: clamp((pressureKpa - 90) / 520 * 100, 0, 100), color: '#ff9358', level: pressureKpa > 160 ? 'danger' : 'ok' },
        { label: 'pH', value: pH.toFixed(2), unit: '', bar: clamp(pH / 14 * 100, 0, 100), color: '#63dcff', level: 'ok' },
        { label: 'H₂ 体积', value: h2L.toFixed(2), unit: 'L', bar: h2bar, color: '#bfe9ff', level: 'ok' },
      ],
      visual,
      extra: { chart: false },
    });
  }

  _snapChlorine() {
    const r = this.params.ratio;
    const nH2 = r / (1 + r);
    const nCl2 = 1 / (1 + r);
    const idle = this.phase === 'idle';
    const p = idle ? 0 : this.progress;
    const danger = this.phase === 'danger' && !this._mitigated;
    const running = this.phase === 'running';
    const done = this.phase === 'done';
    const reacted = idle ? 0 : danger ? 0.72 : done ? 1 : clamp(smoothstep(clamp((p - 0.2) / 0.75, 0, 1)), 0, 1);
    const limiting = Math.min(nH2, nCl2);
    const hcl = 2 * limiting * reacted;
    const cl2Used = limiting * reacted;
    const cl2Remain = Math.max(0, nCl2 - cl2Used);
    const cl2Pct = nCl2 > 0 ? cl2Remain / nCl2 * 100 : 0;
    const temp = this._temp;
    let pressureAtm = this.params.pressure * (temp + 273) / 298;
    if (danger) {
      const shock = Math.exp(-this._dangerTime * 0.7);
      pressureAtm = Math.max(pressureAtm, this.params.pressure + 7.2 * shock);
    }
    pressureAtm = clamp(pressureAtm, 0.2, 12);

    let hz = hazard(0, '腔体稳定', '配气完成，等待强光引发；尾气吸收塔处于待机。', '');
    if (danger) {
      hz = hazard(3, '光化学爆炸 · 腔体超压', '链式反应在毫秒级完成，压力骤升并产生强闪光与冲击波。', '隔离泄爆');
    } else if (this._mitigated) {
      hz = hazard(1, '泄爆完成 · 尾气吸收', '腔体已泄压，残余气体送入碱液吸收塔。', '');
    } else if ((running || done) && r < 0.9) {
      hz = hazard(2, 'Cl₂ 过量 · 剧毒尾气', '氯气未被完全消耗，黄绿色尾气进入碱液吸收塔；严禁直排。', '加大碱液循环');
    } else if ((running || done) && r > 1.1) {
      hz = hazard(2, 'H₂ 富余 · 燃爆风险', '尾气含氢气，与空气混合后仍具爆炸风险，须火炬燃烧或回收。', '切断气源');
    }

    const explosivePotential = Math.abs(r - 1) <= 0.08 && this.params.light >= 45 && this.params.pressure >= 0.7;
    const stage = idle
      ? '配气完成'
      : danger
        ? '爆炸 / 泄压'
        : done
          ? '尾气吸收'
          : p < 0.2
            ? '配气 / 光照'
            : '链式反应中';

    let lead;
    let items;
    if (idle) {
      lead = `石英腔内 H₂ : Cl₂ = ${r.toFixed(2)} : 1（体积比），初始压强 ${this.params.pressure.toFixed(1)} atm。强光照射将引发反应。`;
      items = [
        'Cl₂ 呈黄绿色，是腔内颜色的来源',
        `当前配比 ${explosivePotential ? '接近化学计量比，存在爆炸式反应条件' : '偏离化学计量比，反应相对温和'}`,
        '反应生成 HCl，遇水汽形成白雾',
        '尾气由吸收塔处理，禁止直排',
      ];
    } else if (danger) {
      lead = '强光引发自由基链式反应，H₂ 与 Cl₂ 在瞬间化合，释放大量热并产生爆鸣。';
      items = [
        '强烈闪光，压力瞬间升高，安全泄爆装置动作',
        '黄绿色迅速消失，生成 HCl 白色酸雾',
        '过量气体与酸雾经尾气系统进入碱液吸收塔',
        '爆炸冲击波可损坏视镜与管路，必须远程操作',
      ];
    } else if (done || this.phase === 'paused') {
      lead = cl2Pct > 8
        ? '反应结束，腔内残留黄绿色 Cl₂，尾气处理系统持续运行。'
        : r > 1.1
          ? '反应结束，剩余氢气进入火炬/回收系统，HCl 白雾被吸收。'
          : '反应完成，黄绿色褪去，HCl 白雾被碱液吸收。';
      items = [
        `HCl 生成量 ≈ ${hcl.toFixed(2)} mol（以 1 mol 初始混合气计）`,
        cl2Pct > 8 ? `Cl₂ 余量 ≈ ${cl2Pct.toFixed(1)}%，剧毒，须碱液吸收` : 'Cl₂ 已基本反应完全',
        '腔壁酸雾用水/碱液冲洗，避免腐蚀设备',
        '反应放热明显，腔体需耐压与耐酸设计',
      ];
    } else {
      lead = '强光穿过石英腔，黄绿色逐渐褪去，链式反应正在快速进行，腔壁出现白雾。';
      items = [
        'H₂ + Cl₂ → 2HCl，气体总物质的量不变',
        '黄绿色 Cl₂ 被消耗，腔内颜色变浅',
        '生成的 HCl 遇水汽形成白色酸雾',
        `当前表压约 ${pressureAtm.toFixed(1)} atm，温度快速上升`,
      ];
    }

    const products = [
      { formula: 'HCl', amount: hcl, unit: 'mol', color: '#e8f3ef' },
      cl2Remain > 0.005 ? { formula: 'Cl₂', amount: cl2Remain, unit: 'mol', color: '#d6e66b' } : null,
      nH2 - limiting * reacted > 0.005 ? { formula: 'H₂', amount: nH2 - limiting * reacted, unit: 'mol', color: '#bfe9ff' } : null,
    ].filter(Boolean);

    const visual = {
      mode: 'gas',
      fill: 0,
      liquidColor: C.paleBlue,
      liquidOpacity: 0,
      turbidity: 0,
      ppt: 0,
      sediment: 0,
      bubble: 0,
      steam: 0,
      spatter: 0,
      stir: 0,
      feedA: running && p < 0.18 ? 1 : 0,
      feedB: running && p < 0.18 ? 1 : 0,
      tankA: 0.82 - 0.1 * reacted,
      tankB: 0.78 - 0.12 * reacted,
      tankAColor: 0xbfe9ff,
      tankBColor: C.chlorine,
      flame: 0,
      sparks: danger ? 0.9 : 0,
      glow: danger ? 0.9 : 0,
      molten: 0, moldFill: 0, sodium: 0,
      gasColor: C.chlorine,
      gasOpacity: idle ? 0.42 : clamp(0.42 * (cl2Remain / Math.max(nCl2, 0.001)), 0.03, 0.42),
      mist: reacted * 0.85,
      gasFill: 0.82,
      ventType: (cl2Pct > 8 || danger) ? 'chlorine' : 'hcl',
      ventRate: danger ? 1 : reacted * 0.8,
      shake: danger ? Math.exp(-this._dangerTime * 0.7) : 0,
      flash: danger ? Math.exp(-this._dangerTime * 2.4) : 0,
      acidSpray: 0,
    };

    return this._base({
      phase: this.phase,
      stage,
      tempC: temp,
      pressureKpa: pressureAtm * 101.325,
      hazard: hz,
      equationMode: explosivePotential ? '按计量比 · 可爆炸' : '光照化合',
      activeEquation: 0,
      observations: { lead, items },
      products,
      metrics: [
        { label: '温度', value: temp.toFixed(0), unit: '°C', bar: clamp(temp / 1200 * 100, 0, 100), color: '#ffb84d', level: temp > 300 ? 'warn' : 'ok' },
        { label: '压力', value: pressureAtm.toFixed(1), unit: 'atm', bar: clamp(pressureAtm / 10 * 100, 0, 100), color: '#ff9358', level: pressureAtm > 2 ? 'danger' : 'ok' },
        { label: 'HCl 生成', value: hcl.toFixed(2), unit: 'mol', bar: clamp(hcl / 2 * 100, 0, 100), color: '#63dcff', level: 'ok' },
        { label: 'Cl₂ 余量', value: cl2Pct.toFixed(1), unit: '%', bar: cl2Pct, color: '#d6e66b', level: cl2Pct > 8 ? 'warn' : 'ok' },
      ],
      visual,
      extra: { chart: false, explosivePotential },
    });
  }

  _snapThermite() {
    const { ratio, charge } = this.params;
    const idle = this.phase === 'idle';
    const p = idle ? 0 : this.progress;
    const running = this.phase === 'running';
    const done = this.phase === 'done';
    const reacted = idle ? 0 : done ? 1 : clamp((p - 0.12) / 0.76, 0, 1);
    const conversion = reacted * this._thermiteConversion();
    const temp = this._temp;
    const ironTemp = idle ? 25 : Math.max(25, temp * 0.955);
    const mAl = charge * (54 * ratio) / (54 * ratio + 160);
    const mFe2O3 = charge - mAl;
    const feKg = mFe2O3 * (112 / 160) * conversion;
    const slagKg = mAl * (102 / 54) * conversion;
    const leftoverAl = Math.max(0, mAl - mAl * conversion);
    const cooling = done && temp > 600;
    const hazardLevel = running && charge > 1.4 && reacted > 0.3 ? 2 : (running && reacted > 0.1) || cooling ? 1 : 0;
    const hz = hazardLevel === 2
      ? hazard(2, '高温熔融物 · 强辐射', '大装料铝热反应，铁水与炉渣可能飞溅；强光可损伤眼睛。', '隔离警戒')
      : hazardLevel === 1
        ? running
          ? hazard(1, '强光高温 · 防护中', '反应区温度可达 2500 °C 以上，须佩戴防护面罩并保持距离。', '')
          : hazard(1, '冷却中 · 高温铁水', '反应结束，铁水与炉渣仍处于高温状态，须隔离冷却至安全温度。', '')
        : hazard(0, this._mitigated ? '反应受控' : '待命', '坩埚装料完成，砂床与锭模就位。', '');

    const stage = idle ? '装料完成' : done ? '冷却 / 出铁' : this.phase === 'paused' ? '引燃暂停' : reacted > 0.1 ? '铝热反应中' : '点火准备';

    let lead;
    let items;
    if (idle) {
      lead = `坩埚内装有 ${charge.toFixed(1)} kg 铝热剂（配比 ${ratio.toFixed(2)} × 理论量），点火后将发生剧烈放热置换。`;
      items = [
        `理论配比 2Al + Fe₂O₃ → 2Fe + Al₂O₃`,
        `预计铁水温度约 ${(2420 * this._thermiteConversion()).toFixed(0)} °C`,
        '反应放出耀眼白光，严禁直视',
        '熔融铁水将流入下方锭模，砂床用于隔热',
      ];
    } else if (done) {
      lead = '反应结束，铁水与氧化铝炉渣分离并在锭模中冷却；现场仍有强热辐射。';
      items = [
        `还原得到铁 ≈ ${feKg.toFixed(2)} kg`,
        `生成 Al₂O₃ 炉渣 ≈ ${slagKg.toFixed(2)} kg`,
        ratio < 0.95 ? '铝不足，氧化铁未完全还原，转化率偏低' : ratio > 1.05 ? '铝过量，产物中残留少量铝' : '配比接近理论值，反应充分',
        '冷却后破碎坩埚，分离铁锭与炉渣',
      ];
    } else {
      lead = '引燃剂点燃铝热剂：反应瞬间产生耀眼白光，熔融铁水沿坩埚底部流出。';
      items = [
        '剧烈燃烧，放出大量热，温度可达 2500 °C 以上',
        '铝将铁从氧化铁中置换出来，铁以熔融态分离',
        '强光与热辐射危险，须使用焊接面罩',
        '严禁向反应区喷水，防止熔融金属遇水爆溅',
      ];
    }

    const products = [
      { formula: 'Fe', amount: feKg, unit: 'kg', color: '#ff9a6b' },
      { formula: 'Al₂O₃', amount: slagKg, unit: 'kg', color: '#d7c7b8' },
      leftoverAl > 0.005 ? { formula: 'Al', amount: leftoverAl, unit: 'kg', color: '#c9d4dc' } : null,
    ].filter(Boolean);

    const sparks = idle ? 0 : running ? clamp((reacted < 0.92 ? 1 - Math.abs(reacted - 0.5) * 1.1 : 0.25) * (0.55 + charge / 2), 0, 1) : 0;
    const visual = {
      mode: 'thermite',
      fill: 0, liquidColor: C.paleBlue, liquidOpacity: 0, turbidity: 0, ppt: 0, sediment: 0,
      bubble: 0, steam: done ? 0.25 : 0, spatter: sparks * 0.4, stir: 0,
      feedA: 0, feedB: 0, tankA: 0.8, tankB: 0.8,
      tankAColor: 0xb9c6cf, tankBColor: 0x9d4a35,
      flame: reacted > 0.1 && !done ? 0.85 : 0,
      sparks,
      glow: reacted,
      molten: clamp((reacted - 0.32) / 0.45, 0, 1),
      moldFill: clamp((reacted - 0.45) / 0.45, 0, 1),
      sodium: 0,
      gasColor: C.chlorine, gasOpacity: 0, mist: 0, gasFill: 0,
      ventType: 'smoke', ventRate: reacted > 0.15 ? 0.7 : 0,
      shake: reacted > 0.1 && reacted < 0.6 ? 0.12 : 0,
      flash: reacted > 0.1 && reacted < 0.2 ? 0.6 : 0,
      acidSpray: 0,
    };

    return this._base({
      phase: this.phase,
      stage,
      tempC: temp,
      pressureKpa: 101.3,
      hazard: hz,
      equationMode: '高温置换',
      activeEquation: 0,
      observations: { lead, items },
      products,
      metrics: [
        { label: '炉温', value: temp.toFixed(0), unit: '°C', bar: clamp(temp / 2600 * 100, 0, 100), color: '#ff6b3d', level: temp > 1000 ? 'danger' : 'ok' },
        { label: '铁水温度', value: ironTemp.toFixed(0), unit: '°C', bar: clamp(ironTemp / 2500 * 100, 0, 100), color: '#ffb84d', level: 'warn' },
        { label: '转化率', value: (conversion * 100).toFixed(0), unit: '%', bar: conversion * 100, color: '#63dcff', level: 'ok' },
        { label: '装料量', value: charge.toFixed(1), unit: 'kg', bar: charge / 2 * 100, color: '#9fb1bd', level: 'ok' },
      ],
      visual,
      extra: { chart: false, conversion, feKg, slagKg },
    });
  }

  _snapDilution() {
    const { acidConc, waterRate, stir, order } = this.params;
    const idle = this.phase === 'idle';
    const p = idle ? 0 : this.progress;
    const running = this.phase === 'running';
    const done = this.phase === 'done';
    const peak = this._dilutionPeak();
    const temp = this._temp;
    const tempRate = (temp - this._prevTemp) / 0.0166;
    const pressureKpa = 101.3 + Math.max(0, temp - 100) * 4.5;
    const dangerHot = temp >= 100 || this._spatter;
    const dangerousOrder = !order && acidConc >= 70 && (running || done) && p > 0.1 && !this._mitigated;
    let hz = hazard(0, '操作稳定', '稀释热被搅拌与冷却夹套带走，温度在安全范围内。', '');
    if (dangerHot && !this._mitigated) {
      hz = hazard(3, '稀释失控 · 酸液飞溅', '局部沸腾导致酸液与酸雾喷出，具有严重化学灼伤风险。', '紧急冷却');
    } else if (dangerousOrder) {
      hz = hazard(2, '危险操作 · 水入浓酸', '水浮于酸面，局部稀释热使水瞬间沸腾，导致酸液飞溅。', '紧急冷却');
    } else if (this._mitigated) {
      hz = hazard(1, '紧急冷却中', '已停止加料并开启冷却夹套，温度正在下降。', '');
    } else if (running && temp > 75) {
      hz = hazard(1, '温度偏高', '稀释热正在累积，请保持搅拌并检查冷却水。', '');
    }

    const stage = idle ? '准备就绪' : done ? '冷却 / 分析' : this.phase === 'paused' ? '加料暂停' : dangerHot ? '飞溅 / 紧急冷却' : '稀释中';

    let lead;
    let items;
    if (idle) {
      lead = order
        ? '当前为正确操作“酸入水”：釜内先加水，浓硫酸沿器壁缓慢加入并持续搅拌。'
        : '当前为危险操作“水入酸”：釜内是浓硫酸，水将被加入酸中，极易局部沸腾飞溅！';
      items = [
        '浓硫酸密度大于水，溶于水放出大量热',
        order ? '酸入水并搅拌，热量及时分散' : '水入酸：水浮于酸面，局部温度可超过 100 °C',
        `预计峰值温度约 ${peak.toFixed(0)} °C`,
        '现场须佩戴护目镜、耐酸手套和防护面罩',
      ];
    } else if (dangerHot && !this._mitigated) {
      lead = '水在浓硫酸表面局部汽化，液面爆沸，酸液飞溅并伴随白色酸雾逸出。';
      items = [
        '液面剧烈沸腾，酸液液滴向四周飞溅',
        '大量酸雾逸出，刺激呼吸道和眼睛',
        '釜壁局部过热，温度联锁准备启动',
        '立即停止加水并开启紧急冷却，严禁直接接触',
      ];
    } else if (done) {
      lead = this._mitigated
        ? '紧急冷却后温度回落，稀释液仍需中和处理；飞溅区域须冲洗并检测酸度。'
        : '稀释完成，温度逐渐回落；稀硫酸可转入储罐，操作记录归档。';
      items = [
        `峰值温度约 ${Math.max(temp, 25).toFixed(0)} °C`,
        order ? '酸入水操作正确，热量分散，无沸腾' : '水入酸造成局部过热，现场需要清理',
        '稀释后的硫酸浓度显著降低',
        '冷却夹套继续运行至安全温度',
      ];
    } else {
      lead = order
        ? '浓硫酸沿釜壁缓慢流入水中，搅拌将稀释热分散，液面平稳。'
        : '水加入浓硫酸后浮于表面，局部剧烈放热，液面开始剧烈沸腾。';
      items = [
        `当前温度 ${temp.toFixed(1)} °C，峰值预计 ${peak.toFixed(0)} °C`,
        order ? '温升平缓，冷却夹套工作正常' : '局部沸腾，酸液飞溅风险升高',
        `搅拌转速 ${stir} r/min，加料速度 ${waterRate.toFixed(1)} ×`,
        order ? '始终保持“酸入水”，不可反向操作' : '应立即停止加水并紧急冷却',
      ];
    }

    const products = [
      { formula: 'H₂SO₄(aq)', amount: acidConc > 70 ? '稀硫酸' : '稀硫酸', unit: '', color: '#ffcf88', textOnly: true },
      { formula: 'Q', amount: ((peak - 25) * 0.86).toFixed(0), unit: 'kJ/kg', color: '#ff6b3d', textOnly: false },
      order
        ? { formula: '操作', amount: '安全', unit: '', color: '#35e0c2', textOnly: true }
        : { formula: '操作', amount: '危险', unit: '', color: '#ff4b3e', textOnly: true },
    ];

    const visual = {
      mode: 'reactor',
      fill: idle ? (order ? 0.45 : 0.38) : (order ? 0.45 : 0.38) + 0.24 * p,
      liquidColor: order ? C.water : C.acid,
      liquidOpacity: 0.6,
      turbidity: 0,
      ppt: 0,
      sediment: 0,
      bubble: Math.max(0, (temp - 95) / 20),
      steam: clamp((temp - 60) / 55, 0, 1),
      spatter: dangerHot && !this._mitigated ? 1 : 0,
      stir: idle ? 60 : stir,
      feedA: running && order ? 1 : 0,
      feedB: running && !order ? 1 : 0,
      tankA: 0.82 - (running && order ? 0.5 * p : 0),
      tankB: 0.82 - (running && !order ? 0.5 * p : 0),
      tankAColor: C.acid,
      tankBColor: C.water,
      flame: 0, sparks: 0,
      glow: clamp((temp - 80) / 80, 0, 1) * 0.35,
      molten: 0, moldFill: 0, sodium: 0,
      gasColor: C.hclMist, gasOpacity: 0, mist: dangerHot ? 0.7 : 0, gasFill: 0,
      ventType: dangerHot ? 'acid-mist' : temp > 80 ? 'steam' : 'none',
      ventRate: dangerHot ? 1 : clamp((temp - 70) / 40, 0, 1),
      shake: dangerHot ? 0.15 : 0,
      flash: 0,
      acidSpray: dangerHot && !this._mitigated ? 1 : 0,
    };

    return this._base({
      phase: this.phase,
      stage,
      tempC: temp,
      pressureKpa,
      hazard: hz,
      equationMode: order ? '酸入水 · 正确' : '水入酸 · 危险',
      activeEquation: 0,
      observations: { lead, items },
      products,
      metrics: [
        { label: '温度', value: temp.toFixed(1), unit: '°C', bar: clamp(temp / 150 * 100, 0, 100), color: '#ffb84d', level: temp > 90 ? 'danger' : temp > 65 ? 'warn' : 'ok' },
        { label: '压力', value: pressureKpa.toFixed(0), unit: 'kPa', bar: clamp((pressureKpa - 90) / 100 * 100, 0, 100), color: '#ff9358', level: pressureKpa > 130 ? 'warn' : 'ok' },
        { label: '温升速率', value: Math.max(0, tempRate).toFixed(1), unit: '°C/s', bar: clamp(tempRate / 20 * 100, 0, 100), color: '#ff6b3d', level: tempRate > 8 ? 'warn' : 'ok' },
        { label: '硫酸浓度', value: acidConc.toFixed(0), unit: '%', bar: acidConc, color: '#ffcf88', level: 'ok' },
      ],
      visual,
      extra: { chart: false, peak, order },
    });
  }

  _base(partial) {
    return {
      reactionId: this.reaction.id,
      name: this.reaction.name,
      phase: this.phase,
      paused: this.phase === 'paused',
      progress: this.progress,
      elapsed: this.elapsed,
      duration: this.duration,
      tempC: 25,
      pressureKpa: 101.3,
      equations: this.reaction.equations,
      ionic: this.reaction.ionic[partial.activeEquation || 0] || this.reaction.ionic[0],
      params: { ...this.params },
      events: [],
      ...partial,
    };
  }
}

export const sim = new Simulator();
