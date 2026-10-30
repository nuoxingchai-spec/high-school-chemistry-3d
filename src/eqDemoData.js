const GASES = new Set([
  'H₂', 'O₂', 'O₃', 'N₂', 'Cl₂', 'F₂', 'Br₂', 'I₂', 'CO', 'CO₂', 'SO₂', 'SO₃',
  'NO', 'NO₂', 'N₂O', 'N₂O₄', 'NH₃', 'H₂S', 'HCl', 'HF', 'HBr', 'HI', 'CH₄',
  'C₂H₄', 'C₂H₂', 'SiF₄', 'SiCl₄', 'ClO₂', 'PH₃',
]);

const CLEAR_GASES = new Set([
  'H₂', 'O₂', 'N₂', 'CO', 'CO₂', 'SO₂', 'SO₃', 'NO', 'N₂O', 'NH₃', 'H₂S',
  'HCl', 'HF', 'HBr', 'HI', 'CH₄', 'C₂H₄', 'C₂H₂', 'SiF₄', 'SiCl₄', 'PH₃',
]);

const METALS = new Set(['Na', 'K', 'Ca', 'Li', 'Ba', 'Mg', 'Al', 'Zn', 'Fe', 'Cu', 'Ag', 'Hg', 'Pb', 'Sn', 'Ni', 'Mn', 'Cr', 'Ti']);

const ELEMENT_SOLIDS = new Set(['S', 'C', 'P', 'Si', 'I₂']);
const MOLECULAR_SOLIDS = new Set(['C₁₂H₂₂O₁₁', 'C₆H₁₂O₆', 'C₆H₅OH', 'PCl₅']);
const SOLID_COMPOUNDS = new Set([
  'Mg₃N₂', 'NaH', 'CaF₂', 'PbO₂', 'PbSO₄', 'MnO(OH)', 'CaC₂', 'Al₄C₃', 'Mg₂Si',
  'Si₃N₄', 'Ca₃N₂', 'Ca₃P₂', 'Fe₃C',
]);
const MOLECULAR_LIQUIDS = new Set([
  'H₂O', 'Br₂', 'Hg', 'C₂H₅OH', 'CH₃CH₂OH', 'CH₃COOH', 'C₆H₆', 'H₂O₂', 'PCl₃', 'TiCl₄',
]);

const SOLUTION_GASES = new Set(['HCl', 'HBr', 'HI', 'HF', 'H₂S', 'NH₃', 'Cl₂', 'Br₂', 'I₂']);

const OXIDES = new Set([
  'Na₂O', 'Na₂O₂', 'K₂O', 'CaO', 'MgO', 'Al₂O₃', 'FeO', 'Fe₂O₃', 'Fe₃O₄',
  'CuO', 'Cu₂O', 'MnO₂', 'SiO₂', 'P₂O₅', 'ZnO', 'PbO', 'HgO', 'Ag₂O', 'SO₃',
]);

const GAS_COLORS = [
  ['ClO₂', 0xc8d64f],
  ['Cl₂', 0xb8d24a],
  ['F₂', 0xd8eaa0],
  ['Br₂', 0x8e3a1e],
  ['I₂', 0x5a3a72],
  ['NO₂', 0x9a4a24],
  ['N₂O₄', 0xeaf4f8],
  ['O₃', 0xa9d8e8],
];

const SOLUTION_COLORS = [
  ['[Cu(NH₃)₄]', 0x123f8c],
  ['Fe(SCN)₃', 0x9b1c1c],
  ['KMnO₄', 0x7b2f8a],
  ['MnO₄⁻', 0x7b2f8a],
  ['K₂MnO₄', 0x2e7d32],
  ['K₂Cr₂O₇', 0xd35a1e],
  ['Cr₂O₇²⁻', 0xd35a1e],
  ['K₂CrO₄', 0xe0c21e],
  ['Cr³⁺', 0x4a8b6a],
  ['Cr₂(SO₄)₃', 0x4a8b6a],
  ['CuSO₄', 0x2e86c9],
  ['CuCl₂', 0x2f9b8a],
  ['Cu(NO₃)₂', 0x2e86c9],
  ['Cu²⁺', 0x2e86c9],
  ['FeCl₃', 0xb07a2a],
  ['Fe₂(SO₄)₃', 0xb07a2a],
  ['Fe(NO₃)₃', 0xb07a2a],
  ['Fe³⁺', 0xb07a2a],
  ['FeCl₂', 0x7fb493],
  ['FeSO₄', 0x7fb493],
  ['Fe(NO₃)₂', 0x7fb493],
  ['Fe²⁺', 0x7fb493],
  ['Mn²⁺', 0xf0e4ee],
  ['MnCl₂', 0xf0e4ee],
  ['MnSO₄', 0xf0e4ee],
  ['NiSO₄', 0x4f9b6b],
  ['NiCl₂', 0x4f9b6b],
  ['CoCl₂', 0xc25b78],
  ['Cl₂', 0xc9d96a],
  ['Br₂', 0xc06a1e],
  ['I₂', 0x8a5a1e],
  ['K₂FeO₄', 0x8a2f6a],
  ['FeO₄²⁻', 0x8a2f6a],
];

const SOLID_COLORS = [
  ['CuSO₄·5H₂O', 0x2e86c9],
  ['Cu₂(OH)₂CO₃', 0x3f8f7b],
  ['Cu(OH)₂', 0x2e86c9],
  ['Fe(OH)₃', 0x9b4a21],
  ['Fe(OH)₂', 0xe9eff1],
  ['Al(OH)₃', 0xe9eff1],
  ['Mg(OH)₂', 0xe9eff1],
  ['CaCO₃', 0xedf2f4],
  ['MgCO₃', 0xedf2f4],
  ['BaCO₃', 0xedf2f4],
  ['BaSO₄', 0xedf2f4],
  ['CaSO₃', 0xedf2f4],
  ['BaSO₃', 0xedf2f4],
  ['AgCl', 0xedf2f4],
  ['H₂SiO₃', 0xe6eef0],
  ['AgBr', 0xf2e8b4],
  ['AgI', 0xf2d24a],
  ['FeCO₃', 0x8a9b83],
  ['Fe₂O₃', 0xa8452a],
  ['Fe₃O₄', 0x3b3b3b],
  ['FeO', 0x2a2a2a],
  ['CuO', 0x1d1d1d],
  ['Cu₂O', 0xb03a26],
  ['MnO₂', 0x232323],
  ['CuS', 0x2a2a2a],
  ['PbS', 0x292929],
  ['ZnS', 0xe9eff1],
  ['FeS', 0x2f2f2f],
  ['HgS', 0xb02a1e],
  ['Ag₂S', 0x1d1d1d],
  ['P₂O₅', 0xf2f5f4],
  ['MgO', 0xf2f5f4],
  ['Al₂O₃', 0xeef2f0],
  ['SiO₂', 0xe8eef0],
  ['NaHCO₃', 0xf4f7f8],
  ['Na₂CO₃', 0xf4f7f8],
  ['NaOH', 0xf4f7f8],
  ['KOH', 0xf4f7f8],
  ['NH₄Cl', 0xf4f7f8],
  ['NH₄HCO₃', 0xf4f7f8],
  ['NH₄NO₃', 0xf4f7f8],
  ['(NH₄)₂SO₄', 0xf4f7f8],
  ['K₂S', 0xf0efe0],
  ['Na₂S', 0xf0efe0],
  ['KClO₃', 0xf4f7f8],
  ['KNO₃', 0xf4f7f8],
  ['CaO', 0xf4f7f8],
  ['Ca(OH)₂', 0xf4f7f8],
  ['CaSO₄', 0xf4f7f8],
  ['Na₂SO₃', 0xf4f7f8],
  ['Na₂SO₄', 0xf4f7f8],
  ['Na₂SiO₃', 0xf4f7f8],
  ['NaAlO₂', 0xf4f7f8],
  ['NaCl', 0xf4f7f8],
  ['KCl', 0xf4f7f8],
  ['NaBr', 0xf4f7f8],
  ['NaI', 0xf4f7f8],
  ['KBr', 0xf4f7f8],
  ['KI', 0xf4f7f8],
  ['AgNO₃', 0xf4f7f8],
  ['BaCl₂', 0xf4f7f8],
  ['Ba(OH)₂', 0xf4f7f8],
  ['Na₂S₂O₃', 0xf4f7f8],
  ['KMnO₄', 0x3d2352],
  ['K₂MnO₄', 0x2e6b32],
  ['K₂Cr₂O₇', 0xd35a1e],
  ['CuCl₂', 0x9a6b2f],
  ['FeCl₃', 0x5a3420],
  ['FeBr₃', 0x8a3a1f],
  ['CuBr₂', 0x2a2a2a],
  ['CuI', 0xf0ead6],
  ['Na₂O₂', 0xe8d98a],
  ['Na₂O', 0xf0f2ef],
  ['K₂O', 0xf0f2ef],
  ['HgO', 0xa83232],
  ['Ag₂O', 0x4a3a34],
  ['PbO₂', 0x3b2f26],
  ['PbSO₄', 0xedf2f4],
  ['MnO(OH)', 0x3a2a20],
  ['Mg₃N₂', 0xc9d18a],
  ['NaH', 0xd6dbdd],
  ['CaF₂', 0xf4f7f8],
  ['PCl₅', 0xf2ecd8],
  ['Hg', 0xc7ccce],
  ['Ag', 0xcfd6da],
  ['Cu', 0xb45a2c],
  ['Fe', 0x8b9297],
  ['Al', 0xbfc7cb],
  ['Mg', 0xbfc7cb],
  ['Zn', 0xaeb7bb],
  ['Na', 0xd6dbdd],
  ['K', 0xd0d4d6],
  ['Ca', 0xc9cecc],
  ['Ba', 0xc3c8c6],
  ['Ti', 0xc3c8c6],
  ['Si', 0x3a4448],
  ['SiC', 0x3a4448],
  ['C', 0x202020],
  ['S', 0xf2e39a],
  ['P', 0xf2ecd8],
  ['I₂', 0x4a2b57],
  ['Br₂', 0x8e2f1a],
  ['C₁₂H₂₂O₁₁', 0xf4f7f8],
  ['C₆H₁₂O₆', 0xf4f7f8],
];

const PPT_KEYS = [
  'Cu(OH)₂', 'Fe(OH)₃', 'Fe(OH)₂', 'Al(OH)₃', 'Mg(OH)₂', 'Cu₂(OH)₂CO₃',
  'CaCO₃', 'BaCO₃', 'FeCO₃', 'MgCO₃', 'BaSO₄', 'AgCl', 'AgBr', 'AgI', 'H₂SiO₃',
  'CaSO₃', 'BaSO₃', 'CaSO₄', 'PbSO₄', 'CuS', 'PbS', 'ZnS', 'FeS', 'HgS', 'Ag₂S', 'S',
];

const PPT_STYLES = [
  ['Al(OH)₃', 'gel'], ['H₂SiO₃', 'gel'],
  ['Fe(OH)₃', 'curdy'], ['Fe(OH)₂', 'curdy'], ['Cu(OH)₂', 'curdy'],
  ['BaSO₄', 'fine'], ['CaCO₃', 'fine'], ['BaCO₃', 'fine'], ['BaSO₃', 'fine'], ['PbSO₄', 'fine'],
  ['CaSO₃', 'fine'], ['AgCl', 'fine'], ['AgBr', 'fine'], ['AgI', 'fine'], ['CuS', 'fine'],
  ['PbS', 'fine'], ['HgS', 'fine'], ['Ag₂S', 'fine'], ['FeS', 'fine'],
  ['FeCO₃', 'fine'], ['Cu₂(OH)₂CO₃', 'fine'], ['Mg(OH)₂', 'fine'], ['ZnS', 'fine'],
];

const COLOR_NAMES = [
  [0xf4f7f8, '白色'], [0xe8f6fb, '无色'], [0xe2f1f8, '无色'],
  [0xbfe0ea, '淡蓝色'], [0x7cc6de, '浅蓝色'], [0x2e86c9, '蓝色'], [0x123f8c, '深蓝色'],
  [0x7fb493, '浅绿色'], [0x42cfba, '蓝绿色'], [0x2e7d32, '绿色'], [0x4a8b6a, '灰绿色'], [0x9fb89f, '灰绿色'],
  [0xc8d64f, '黄绿色'], [0xb8d24a, '黄绿色'], [0xf6e7a8, '淡黄色'], [0xf0d24a, '黄色'], [0xe0c21e, '黄色'],
  [0xd35a1e, '橙色'], [0xc06a1e, '橙黄色'], [0x8a5a1e, '棕黄色'],
  [0x9a4a24, '红棕色'], [0xa8452a, '红棕色'], [0x9b4a21, '红褐色'], [0xb07a2a, '黄色'],
  [0x9b1c1c, '血红色'], [0xb02a1e, '红色'], [0xb03a26, '红色'],
  [0xe2557e, '粉红色'], [0x7b2f8a, '紫红色'], [0x6b3a7a, '紫色'], [0x3d2352, '紫黑色'],
  [0x202020, '黑色'], [0x1d1d1d, '黑色'], [0x3b3b3b, '黑色'], [0x3a4448, '灰黑色'], [0x4a3a34, '棕黑色'], [0x8e2f1a, '深红棕色'],
  [0xd6dbdd, '银白色'], [0xcfd6da, '银白色'], [0x8b9297, '银灰色'], [0xb45a2c, '紫红色'],
];

const ORGANIC = /C₂H₅OH|CH₃CH₂OH|CH₃COOH|CH₃CHO|C₆H₆|C₆H₁₂O₆|C₁₂H₂₂O₁₁|CH₃COO|C₁₆H₃₄|C₈H₁₈/;

const INTERMEDIATE_PPT = {
  'alcl3-naoh-excess': 'Al(OH)₃',
  'naalo2-hcl-excess': 'Al(OH)₃',
  'co2-caoh2-excess': 'CaCO₃',
  'baoh2-co2-excess': 'BaCO₃',
  'so2-caoh2-excess': 'CaSO₃',
};

function cleanFormula(raw) {
  return raw
    .replace(/^\d+(?:\.\d+)?/, '')
    .replace(/^n(?=[A-Z])/, '')
    .replace(/[↑↓]/g, '')
    .replace(/\((?:g|l|s|aq|浓|稀|过量|少量)\)/g, '')
    .trim();
}

function matchesKey(formula, key) {
  if (formula === key) return true;
  if (formula.startsWith(`${key}·`)) return true;
  if (key.startsWith('[') && formula.includes(key)) return true;
  return false;
}

function lookup(list, formula) {
  return list.find(([key]) => matchesKey(formula, key)) || null;
}

function isKnownPpt(formula) {
  return PPT_KEYS.some((key) => matchesKey(formula, key));
}

function splitSpecies(side) {
  return side.split(/\s*\+\s*/).filter(Boolean).map((raw) => {
    const formula = cleanFormula(raw);
    return {
      raw: raw.replace(/[↑↓]/g, '').trim(),
      formula,
      gas: raw.includes('↑') || GASES.has(formula) || raw.includes('(g)'),
      ppt: raw.includes('↓') || isKnownPpt(formula),
      metal: METALS.has(formula),
      water: formula === 'H₂O',
      coeff: (raw.match(/^(\d+(?:\.\d+)?)/) || [])[1] || '',
    };
  }).filter((item) => item.formula && !['Q', '热量', '能量'].includes(item.formula));
}

function gasColor(formula) {
  const hit = lookup(GAS_COLORS, formula);
  if (hit) return hit[1];
  if (CLEAR_GASES.has(formula)) return 0xeaf4f8;
  return null;
}

function pickGasColor(list) {
  const colors = list.filter((s) => s.gas).map((s) => gasColor(s.formula)).filter((c) => c != null);
  return colors.find((c) => saturation(c) >= 0.13) ?? colors[0] ?? null;
}

function solidColor(formula) {
  const hit = lookup(SOLID_COLORS, formula);
  return hit ? hit[1] : null;
}

function solutionColor(formula) {
  const hit = lookup(SOLUTION_COLORS, formula);
  return hit ? hit[1] : null;
}

function colorFor(species) {
  return gasColor(species.formula) ?? solidColor(species.formula) ?? solutionColor(species.formula);
}

function hex(color) {
  return `#${(color >>> 0).toString(16).padStart(6, '0')}`;
}

function channels(color) {
  return [(color >> 16) & 255, (color >> 8) & 255, color & 255];
}

function saturation(color) {
  const [r, g, b] = channels(color);
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

function mixHex(a, b, t) {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  return ((Math.round(lerp(ar, br, t)) << 16) | (Math.round(lerp(ag, bg, t)) << 8) | Math.round(lerp(ab, bb, t))) >>> 0;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function averageColor(list) {
  if (!list.length) return null;
  const sum = list.reduce((acc, value) => {
    const [r, g, b] = channels(value);
    return [acc[0] + r, acc[1] + g, acc[2] + b];
  }, [0, 0, 0]);
  const n = list.length;
  return ((Math.round(sum[0] / n) << 16) | (Math.round(sum[1] / n) << 8) | Math.round(sum[2] / n)) >>> 0;
}

function averageTint(list) {
  const colored = list.filter((c) => saturation(c) >= 0.13);
  if (!colored.length) return averageColor(list);
  return colored.reduce((best, c) => (saturation(c) > saturation(best) ? c : best), colored[0]);
}

function colorName(color) {
  if (color == null) return '无色';
  let best = COLOR_NAMES[0];
  let bestDist = Infinity;
  for (const entry of COLOR_NAMES) {
    const [r, g, b] = channels(entry[0]);
    const [cr, cg, cb] = channels(color);
    const dist = (r - cr) * (r - cr) * 2 + (g - cg) * (g - cg) * 4 + (b - cb) * (b - cb) * 3;
    if (dist < bestDist) {
      bestDist = dist;
      best = entry;
    }
  }
  return best[1];
}

function isElectric(eq) {
  const text = `${eq.t} ${eq.cond}`;
  if (/电解|电镀|蓄电池|干电池|燃料电池|原电池/.test(text)) return true;
  return /充电/.test(text) && /电池/.test(eq.t);
}

function deriveArchetype(eq, reactants, products) {
  const text = `${eq.t} ${eq.cond}`;
  const left = reactants.map((item) => item.formula);
  const allGas = reactants.length > 0 && reactants.every((item) => item.gas);
  const hasWater = left.some((f) => f === 'H₂O');
  const organic = reactants.some((r) => ORGANIC.test(r.formula));
  const metalWater = reactants.some((r) => ['Na', 'K', 'Ca', 'Li', 'Ba'].includes(r.formula))
    && hasWater
    && products.some((p) => p.formula === 'H₂')
    && /水/.test(eq.t)
    && !/水蒸气/.test(eq.t);
  const highTemp = /高温|煅烧|灼烧|熔融|镁条引燃|Δ|加热|受热/.test(text);
  const ignite = /点燃|燃烧/.test(text);
  const light = /光照|暗处/.test(eq.cond);
  const liquidReagent = hasWater
    || organic
    || reactants.some((r) => /H₂O₂|H₂SO₃|H₂CO₃|NaOH|KOH|NH₃·H₂O|HCl|H₂SO₄|HNO₃|H₃PO₄|HF|H₂O₂/.test(r.formula))
    || /溶液|稀|浓硫酸|浓盐酸|浓硝酸|石灰水|石灰乳|氨水|胶体|水解|酯化|酸性|碱性|溴水|氯水|碘水|亚硫酸|氢硫酸|淀粉/.test(`${eq.t} ${eq.cond}`);
  const saltLike = reactants.some((r) => /SO₄|NO₃|CO₃|ClO|MnO₄|Cr₂O₇|AlO₂|SiO₃|S₂O₃/.test(r.formula))
    || reactants.some((r) => /(?:Na|K|Ca|Ba|Mg|Al|Fe|Cu|Ag|Zn|NH₄)(?:Cl|Br|I)/.test(r.formula))
    || reactants.some((r) => /(?:Ca|Ba)\(OH\)₂/.test(r.formula));
  const hasIon = reactants.some((r) => /[⁺⁻]/.test(r.formula));
  const solutionContext = liquidReagent
    || hasIon
    || (!highTemp && !ignite && !/晶体/.test(eq.t) && saltLike);

  if (isElectric(eq)) return 'cell';
  if (metalWater) return 'trough';
  if (/缓慢氧化|潮解|风化/.test(eq.t)) return 'beaker';
  if (allGas) return 'gasjar';
  const gasFormulas = reactants.filter((r) => r.gas).map((r) => r.formula);
  const tubeRedox = highTemp
    && gasFormulas.some((f) => f === 'CO' || f === 'H₂' || f === 'H₂O')
    && reactants.some((r) => !r.gas && (r.formula === 'C' || METALS.has(r.formula)
      || /CuO|Fe₂O₃|Fe₃O₄/.test(r.formula)));
  if (tubeRedox) return 'tube';
  if (/水蒸气|水煤气/.test(eq.t)) return 'crucible';
  if (ignite && !hasWater && !/石灰水|NaOH|溶液/.test(eq.t)
    && (reactants.some((r) => r.gas) || /爆炸|火药/.test(eq.t))) return 'gasjar';
  if (highTemp && !solutionContext) return 'crucible';
  if (!solutionContext && !hasWater && reactants.some((r) => !r.gas)) return 'crucible';
  if (light && !solutionContext) return 'crucible';
  return 'beaker';
}

const APPARATUS = {
  beaker: { name: '烧杯', label: '烧杯 · 溶液反应' },
  gasjar: { name: '集气瓶', label: '集气瓶 · 气相反应' },
  crucible: { name: '坩埚', label: '坩埚 · 固相/高温反应' },
  trough: { name: '水槽', label: '水槽 · 金属与水' },
  cell: { name: '电解槽', label: '电解槽 · 电化学' },
  tube: { name: '硬质玻璃管', label: '硬质玻璃管 · 气固还原' },
};

function speciesState(species, { archetype, molten, dissolved, evolved, side, heat }) {
  const f = species.formula;
  const solidContext = archetype === 'gasjar' || archetype === 'crucible' || archetype === 'tube';
  if (species.ppt) return solidContext || archetype === 'cell' ? '固' : '沉淀';
  if (f === 'H₂O') return '液';
  if (f === 'Br₂') return solidContext ? '液' : '溶液';
  if (f === 'I₂') return solidContext ? (heat ? '气' : '固') : '溶液';
  if (f === 'Hg') return '液';
  if (evolved.has(f)) return '气';
  if (species.gas) {
    if (side === 'reactant' && ['HCl', 'HBr', 'HI', 'HF'].includes(f)
      && archetype !== 'gasjar' && archetype !== 'crucible' && archetype !== 'tube') return '溶液';
    if (side === 'reactant' && dissolved.has(f)) return '溶液';
    if (side === 'product' && !solidContext && SOLUTION_GASES.has(f)) return '溶液';
    return '气';
  }
  if (species.metal || ELEMENT_SOLIDS.has(f) || MOLECULAR_SOLIDS.has(f)) return '固';
  if (OXIDES.has(f) || SOLID_COMPOUNDS.has(f)) return '固';
  if (MOLECULAR_LIQUIDS.has(f)) return '液';
  if (solidContext) return '固';
  if (archetype === 'cell' && molten) return '液';
  return '溶液';
}

function speciesColor(species, state) {
  const f = species.formula;
  if (state === '溶液') return solutionColor(f) ?? (species.gas ? gasColor(f) ?? 0xe2f1f8 : 0xe2f1f8);
  if (state === '气') return gasColor(f) ?? 0xeaf4f8;
  if (state === '沉淀') return solidColor(f) ?? 0xf4f7f8;
  if (state === '液') return solidColor(f) ?? (f === 'H₂O' ? 0xe2f1f8 : 0xcfe9f3);
  return solidColor(f) ?? 0xb8c0c4;
}

function colorNameFor(color, state) {
  if (color == null) return '无色';
  if ((state === '溶液' || state === '液') && saturation(color) < 0.13) return '无色';
  return colorName(color);
}

// 无色溶液在 3D 场景中需要一点水色才可见，文字描述仍按“无色”处理
const AQUEOUS_TINT = 0xbfe0ed;

function visibleSolution(color) {
  return saturation(color) >= 0.1 ? color : AQUEOUS_TINT;
}

function appearanceOf(formula, state, color, style) {
  const name = colorNameFor(color, state);
  if (state === '溶液') return name === '无色' ? '无色溶液' : `${name}溶液`;
  if (state === '气') return name === '无色' ? '无色气体' : `${name}气体`;
  if (state === '液') return name === '无色' ? '无色液体' : `${name}液体`;
  if (state === '沉淀') {
    if (style === 'gel' && name === '白色') return '白色胶状沉淀';
    if (style === 'curdy' && name === '白色') return '白色絮状沉淀';
    return `${name}沉淀`;
  }
  return `${name === '无色' ? '白色' : name}固体`;
}

function flameFor(eq, reactants) {
  const text = `${eq.t} ${eq.cond} ${eq.ph || ''}`;
  if (!/点燃|燃烧|火焰|灼烧|镁条引燃/.test(text)) return null;
  const has = (f) => reactants.some((r) => r.formula === f);
  if (has('H₂') && has('Cl₂')) return { color: 0xeef7e4, color2: 0xffffff, label: '苍白色火焰' };
  if (has('Al') && /铝热/.test(eq.t)) return { color: 0xffffff, color2: 0xfff6d8, label: '耀眼白光' };
  if (has('Mg')) return { color: 0xffffff, color2: 0xfff2cc, label: '耀眼白光' };
  if (has('Na')) return { color: 0xffc247, color2: 0xfff0c0, label: '黄色火焰' };
  if (has('K')) return { color: 0xb98cff, color2: 0xf0e4ff, label: '紫色火焰' };
  if (has('Fe')) return /火星/.test(eq.ph || '') ? { color: 0xffb04a, color2: 0xfff0c8, label: '火星四射' } : null;
  if (has('Cu')) return /氯气|溴/.test(eq.t) ? null : { color: 0x66d98a, color2: 0xd9ffe6, label: '绿色火焰' };
  if (has('S')) return { color: 0x8f7dff, color2: 0xd9d2ff, label: '蓝紫色火焰' };
  if (has('P')) return { color: 0xffd36e, color2: 0xfff6d0, label: '黄色火焰' };
  if (has('H₂')) return { color: 0xa8d8ff, color2: 0xeaf6ff, label: '淡蓝色火焰' };
  if (has('CO')) return { color: 0x7fb8ff, color2: 0xd9ecff, label: '蓝色火焰' };
  if (has('CH₄') || has('C₂H₅OH') || has('CH₃CH₂OH')) return { color: 0x9fd0ff, color2: 0xeaf6ff, label: '淡蓝色火焰' };
  if (has('H₂S')) return { color: 0x9fd0ff, color2: 0xeaf6ff, label: '淡蓝色火焰' };
  if (has('NH₃')) return { color: 0x9fd0ff, color2: 0xeaf6ff, label: '淡蓝色火焰' };
  if (has('C')) return { color: 0xffb347, color2: 0xffe6b0, label: '橙黄色火焰' };
  return { color: 0xffb347, color2: 0xffe6b0, label: '火焰' };
}

function indicatorFor(eq) {
  const ph = eq.ph || '';
  if (/酚酞[^。；]*红/.test(ph)) return { color: 0xe2557e, label: '酚酞变红', fade: /褪色/.test(ph) };
  if (/溶液变红/.test(ph)) return { color: 0xd8506a, label: '溶液变红' };
  if (/石蕊[^。；]*变蓝/.test(ph)) return { color: 0x3f6fdc, label: '石蕊变蓝' };
  if (/石蕊[^。；]*变红/.test(ph)) return { color: 0xd8506a, label: '石蕊变红' };
  if (/淀粉[^。；]*变蓝/.test(ph)) return { color: 0x233a8f, label: '淀粉变蓝' };
  return null;
}

function isElementary(species) {
  return species.metal || ['O₂', 'H₂', 'Cl₂', 'N₂', 'F₂', 'Br₂', 'I₂', 'S', 'C', 'P', 'Si'].includes(species.formula);
}

function reactionTypeFor(eq, reactants, products, ctx) {
  if (/稀释/.test(eq.t)) return { type: '稀释', note: '浓硫酸沿器壁缓缓加入水中，放出大量热' };
  if (ctx.battery) {
    return {
      type: '原电池反应',
      note: ctx.recharge ? '放电：化学能→电能；充电：电能→化学能' : '化学能转化为电能',
    };
  }
  if (ctx.electric) return { type: '电解反应', note: '电能驱动，两极分别发生氧化、还原反应' };
  if ((eq.eq.match(/⇌/g) || []).length > 1) return { type: '电离', note: '可逆电离，溶液中存在电离平衡' };
  if (/酯化/.test(eq.t)) return { type: '酯化反应', note: '酸脱羟基、醇脱氢，属于取代反应' };
  if (/水解/.test(eq.t)) return { type: '水解反应', note: '水分子参与断裂化学键' };
  if (products.some((p) => p.formula.startsWith('[') || /SCN/.test(p.formula))) {
    return { type: '络合反应', note: '形成配离子（络离子）' };
  }
  if (eq.eq.includes('⇌') && reactants.some((r) => r.formula === 'H₂O')
    && products.some((p) => /H⁺|OH⁻/.test(p.formula))) {
    return { type: '水解反应', note: '盐类水解，促进水的电离' };
  }
  if (/加成/.test(eq.t)) return { type: '加成反应', note: '不饱和键断裂，原子直接加上' };
  if (/取代/.test(eq.t)) return { type: '取代反应', note: '有机物中的原子或原子团被替代' };
  const nR = reactants.length;
  const nP = products.length;
  const rEl = reactants.filter(isElementary).length;
  const pEl = products.filter(isElementary).length;
  if (nR === 1 && nP === 1) {
    const rUnits = parseFloat(reactants[0].coeff) || 1;
    const pUnits = parseFloat(products[0].coeff) || 1;
    if (pUnits > rUnits) return { type: '分解反应', note: '一变多' };
    if (rUnits > pUnits) return { type: '化合反应', note: '多变一' };
  }
  if (nR === 1 && nP >= 2) return { type: '分解反应', note: '一变多' };
  if (nR >= 2 && nP === 1) return { type: '化合反应', note: '多变一' };
  if (nR === 2 && nP === 2 && rEl === 1 && pEl === 1) {
    return { type: '置换反应', note: '单质 + 化合物 → 单质 + 化合物' };
  }
  const rText = reactants.map((r) => r.formula).join(' ');
  const pText = products.map((p) => p.formula).join(' ');
  const hasOxidizer = /MnO₄⁻|MnO₄|Cr₂O₇²⁻|K₂Cr₂O₇|ClO⁻|ClO₃⁻|HNO₃|NO₃⁻|H₂O₂|Na₂O₂|Fe³⁺|NO₂|Cl₂|Br₂|I₂|O₂|O₃/.test(rText);
  const hasReducer = /Fe²⁺|FeO|Fe\(OH\)₂|I⁻|HI|S²⁻|H₂S|SO₃²⁻|H₂SO₃|SO₂|CO|H₂|C₂O₄²⁻|H₂C₂O₄/.test(rText);
  if (hasOxidizer && hasReducer) {
    return { type: '氧化还原反应', note: '反应前后有元素化合价发生变化（电子转移）' };
  }
  if (/NO₂/.test(rText) && /NO₂|NO₃/.test(pText)) {
    return { type: '氧化还原反应', note: 'NO₂ 中氮元素化合价既升高又降低（歧化）' };
  }
  const drivers = [];
  if (ctx.hasPpt) drivers.push('生成沉淀');
  if (ctx.hasGas) drivers.push('生成气体');
  if (products.some((p) => p.formula === 'H₂O')) drivers.push('生成水');
  if (rEl === 0 && pEl === 0 && nR >= 2) {
    return { type: '复分解反应', note: drivers.length ? `发生条件：${drivers.join('、')}` : '两种化合物互相交换成分' };
  }
  if (rEl + pEl > 0) {
    return { type: '氧化还原反应', note: '反应前后有元素化合价发生变化（电子转移）' };
  }
  return { type: '', note: '' };
}

function observationsFor(demo, eq, contexts) {
  const {
    flame, smoke, mist, hasGas, hasPpt, gasProduct, pptProduct, indicator, solidProducts, pptFromFormula,
  } = contexts;
  const list = [];
  const activeMetal = demo.reactants.find((s) => ['Na', 'K', 'Ca', 'Li', 'Ba'].includes(s.formula));
  if (demo.archetype === 'trough' && activeMetal) {
    list.push(['Na', 'K'].includes(activeMetal.formula)
      ? '金属浮于水面、熔成小球并四处游动，发出嘶嘶声'
      : '金属与水剧烈反应，表面产生大量气泡');
  }
  if (flame) list.push(flame.label);
  if (smoke && demo.smokeLabel) {
    list.push(`产生${demo.smokeLabel}`);
    if (demo.smokeLabel === '黑烟') list.push('固体变黑、体积膨胀');
  }
  if (mist) list.push('产生白雾（酸雾 / 小液滴）');
  const fromName = colorNameFor(demo.colors.reactant, '溶液');
  const toName = colorNameFor(demo.colors.product, '溶液');
  const turbid = /变浑浊/.test(eq.ph || '');
  if (!demo.molten && demo.archetype !== 'gasjar' && demo.archetype !== 'crucible' && demo.archetype !== 'tube'
    && fromName !== toName && !(fromName === '无色' && toName === '无色')) {
    list.push(`溶液由${fromName}变为${toName}`);
  }
  if (turbid) {
    list.push(demo.archetype === 'tube' || demo.archetype === 'crucible'
      ? '生成 CO₂，可使澄清石灰水变浑浊'
      : '溶液变浑浊');
  }
  const gasOnly = (demo.archetype === 'gasjar' || demo.archetype === 'crucible' || demo.archetype === 'tube')
    && !hasPpt && solidProducts.length === 0
    && demo.reactants.some((s) => s.state === '气') && demo.products.some((s) => s.state === '气');
  const gasFromName = colorName(demo.colors.gasFrom);
  const gasToName = colorName(demo.colors.gasTo);
  const gasShift = gasOnly && !mist && gasFromName !== gasToName;
  if (gasShift) list.push(`气体颜色由${gasFromName}变为${gasToName}`);
  if (demo.cell && (demo.cell.anodeGas || demo.cell.cathodeGas || demo.cell.cathodeMetal)) {
    if (demo.cell.anodeGas) {
      list.push(`阳极产生${appearanceOf(demo.cell.anodeGas, '气', demo.cell.anodeColor)} ${demo.cell.anodeGas}`);
    }
    if (demo.cell.cathodeGas) {
      list.push(`阴极产生${appearanceOf(demo.cell.cathodeGas, '气', demo.cell.cathodeColor)} ${demo.cell.cathodeGas}`);
    }
    if (demo.cell.cathodeMetal) {
      list.push(`阴极析出${colorName(demo.cell.metalColor)}金属 ${demo.cell.cathodeMetal}`);
    }
  } else if (hasGas && gasProduct && !gasShift && !turbid && !(mist && ['HCl', 'HBr', 'HI', 'HF'].includes(gasProduct.formula))) {
    const gasList = demo.products.filter((p) => p.gas).map((p) => p.formula);
    if (demo.archetype === 'tube' && gasList.length > 1) {
      list.push(`生成 ${gasList.join('、')} 混合气体`);
    } else {
      list.push(`产生${appearanceOf(gasProduct.formula, '气', gasColor(gasProduct.formula) ?? 0xeaf4f8)} ${gasProduct.formula}`);
    }
  }
  if (hasPpt && pptProduct && !demo.pptInitial) {
    const style = lookup(PPT_STYLES, pptProduct.formula)?.[1];
    const state = demo.archetype === 'beaker' || demo.archetype === 'trough' ? '沉淀' : '固';
    list.push(`生成${appearanceOf(pptProduct.formula, state, demo.colors.ppt, style)} ${pptProduct.formula}`);
  } else if ((demo.archetype === 'gasjar' || demo.archetype === 'crucible' || demo.archetype === 'tube') && solidProducts.length && !smoke) {
    const rendered = solidProducts.slice(0, 2).map((p) => `${p.appearance} ${p.formula}`);
    list.push(`生成${rendered.join('、')}`);
  }
  if (demo.thermite) list.push('高温下铁以红热铁水流出，冷却后凝成铁块');
  if (demo.pptTimeline === 'dissolve') list.push('沉淀逐渐溶解，溶液变澄清');
  if (demo.pptTimeline === 'form-dissolve') list.push('先产生沉淀，随后沉淀逐渐溶解');
  if (demo.pptTimeline === 'convert' && pptProduct) {
    const fromC = colorName(demo.colors.pptFrom);
    const toC = colorName(demo.colors.pptTo);
    list.push(fromC === toC
      ? `沉淀转化为更难溶的 ${pptProduct.formula}`
      : `沉淀由${fromC} ${pptFromFormula || ''} 变为${toC} ${pptProduct.formula}`);
  }
  if (demo.pptTimeline === 'aging') list.push('白色沉淀迅速变为灰绿色，最终变为红褐色');
  if (demo.deposit) list.push(`析出${colorName(demo.deposit.color)}固体 ${demo.deposit.label}`);
  if (indicator) list.push(indicator.label);
  if (demo.exotherm) list.push('反应放出大量热，溶液温度升高');
  if (demo.endotherm) list.push('反应吸收热量，温度降低');
  if (!list.length && eq.ph) list.push(eq.ph);
  return list.slice(0, 7);
}

export function deriveDemo(eq) {
  const arrowMatch = eq.eq.match(/[→⇌]/);
  const arrow = arrowMatch ? arrowMatch[0] : '→';
  const segments = eq.eq.split(/[→⇌]/).map((part) => part.trim()).filter(Boolean);
  const left = segments[0] || eq.eq;
  const right = segments.length > 1 ? segments[segments.length - 1] : '';
  const reactants = splitSpecies(left);
  const products = splitSpecies(right);
  const archetype = deriveArchetype(eq, reactants, products);
  const molten = archetype === 'cell' && /熔融/.test(`${eq.t} ${eq.cond}`);
  const flags = {
    flame: /点燃|燃烧|镁条引燃/.test(`${eq.cond} ${eq.t}`),
    light: /光照|暗处/.test(`${eq.cond} ${eq.t}`),
    heat: /加热|Δ|高温|煅烧|灼烧|熔融|受热|镁条引燃/.test(`${eq.cond} ${eq.t}`),
    electric: /电解|电解熔融/.test(eq.cond) || /电解|电镀|电池/.test(eq.t),
    spark: /放电/.test(eq.cond),
    catalyst: /催化剂|MnO₂/.test(eq.cond),
    pressure: /高压/.test(eq.cond),
    waterVapor: /水蒸气/.test(eq.t),
  };
  if (archetype === 'cell') flags.electric = true;

  const explicitGas = eq.eq.includes('↑');
  const gasText = /产生[^。；]*(气体|气泡)|放出[^。；]*气体|大量气泡|有气泡|冒泡|刺激性气体|无色气体|红棕色气体|白雾|酸雾/.test(eq.ph || '');
  const gasProductCandidate = products.find((p) => p.gas && !['I₂', 'Br₂'].includes(p.formula))
    || products.find((p) => p.gas) || null;
  const evolvedGas = archetype === 'gasjar'
    ? gasProductCandidate
    : (gasProductCandidate && (explicitGas || gasText || archetype === 'crucible' || archetype === 'tube') ? gasProductCandidate : null);
  const hasGas = !!evolvedGas;
  const hasPpt = products.some((p) => p.ppt);
  const solutionText = `${eq.t} ${eq.cond} ${eq.ph || ''}`;
  const dissolved = new Set();
  reactants.forEach((r) => {
    if (!SOLUTION_GASES.has(r.formula)) return;
    if (/\((?:浓|稀|aq)\)/.test(r.raw)
      || /盐酸|氢溴酸|氢碘酸|氢氟酸|氢硫酸|氨水|溴水|氯水|碘水/.test(solutionText)) {
      dissolved.add(r.formula);
    }
  });
  const evolvedSet = new Set(evolvedGas ? products.filter((p) => p.gas).map((p) => p.formula) : []);
  const gasInlet = (archetype === 'beaker' || archetype === 'tube')
    && reactants.some((r) => r.gas && !dissolved.has(r.formula));
  const absorbing = /被吸收|吸收|褪去|褪色|变浅|颜色加深/.test(eq.ph || '');
  const gasProduct = evolvedGas
    ? (evolvedGas.gas && !CLEAR_GASES.has(evolvedGas.formula) ? evolvedGas : gasProductCandidate)
    : null;
  const pptProduct = products.find((p) => p.ppt) || null;

  const intermediatePpt = INTERMEDIATE_PPT[eq.id] ? splitSpecies(INTERMEDIATE_PPT[eq.id])[0] : null;
  const reactantPpt = reactants.find((r) => r.ppt) || null;
  const pptSource = pptProduct || intermediatePpt || null;
  const pptStyle = lookup(PPT_STYLES, (pptSource || reactantPpt)?.formula ?? '')?.[1] || 'fine';

  const dissolveText = /沉淀(逐渐)?溶解|浑浊(逐渐)?消失|沉淀消失|逐渐溶解/.test(eq.ph || '');
  const convertText = /沉淀.*变为|沉淀转化|转化为/.test(`${eq.ph || ''} ${eq.t}`);
  const solutionContext = archetype === 'beaker' || archetype === 'trough' || archetype === 'cell';
  let pptTimeline = 'form';
  if (solutionContext) {
    if (pptProduct?.formula === 'Fe(OH)₂' || (pptProduct?.formula === 'Fe(OH)₃' && /氢氧化亚铁|氧化/.test(`${eq.t} ${eq.ph}`))) {
      pptTimeline = 'aging';
    } else if (reactantPpt && pptProduct && reactantPpt.formula !== pptProduct.formula
      && (convertText || solidColor(reactantPpt.formula) !== solidColor(pptProduct.formula) || /硫化亚铁/.test(eq.t))) {
      pptTimeline = 'convert';
    } else if (reactantPpt && !pptProduct) {
      pptTimeline = 'dissolve';
    } else if (!reactantPpt && dissolveText && (pptProduct || intermediatePpt)) {
      pptTimeline = 'form-dissolve';
    } else if (reactantPpt && dissolveText) {
      pptTimeline = 'dissolve';
    }
  }
  const pptInitial = !!reactantPpt && ['dissolve', 'convert', 'aging'].includes(pptTimeline);

  const pptFinalColor = solidColor((pptProduct || intermediatePpt)?.formula ?? '') ?? 0xf4f7f8;
  const pptFromColor = solidColor(reactantPpt?.formula ?? '') ?? pptFinalColor;
  const pptToColor = solidColor(pptProduct?.formula ?? '') ?? pptFinalColor;
  const pptAging = pptTimeline === 'aging'
    ? [0xf4f7f5, 0x9fb89f, 0x9b4a21]
    : null;

  const gasFromC = pickGasColor(reactants);
  const gasToC = pickGasColor(products);
  const gasFrom = gasFromC ?? 0xeaf4f8;
  const gasTo = gasToC ?? 0xeaf4f8;
  const thermite = /铝热/.test(eq.t);

  const decorate = (list, side) => list.map((item) => {
    const state = speciesState(item, {
      archetype, molten, dissolved, evolved: evolvedSet, side, heat: flags.heat,
    });
    let color = speciesColor(item, state);
    // 高温还原得到的铁为黑色铁粉，区别于银白色铁片
    if (side === 'product' && state === '固' && item.formula === 'Fe'
      && (archetype === 'crucible' || archetype === 'tube') && !thermite) color = 0x353a3f;
    return {
      ...item,
      display: item.raw,
      state,
      color,
      colorHex: hex(color),
      appearance: appearanceOf(item.formula, state, color, side === 'product' ? pptStyle : undefined),
    };
  });
  const reactantsUi = decorate(reactants, 'reactant');
  const productsUi = decorate(products, 'product');

  const reactantSolutionColors = reactantsUi.filter((s) => s.state === '溶液').map((s) => s.color);
  const productSolutionColors = productsUi.filter((s) => s.state === '溶液').map((s) => s.color);
  const reactantColor = averageTint(reactantSolutionColors) ?? 0xe2f1f8;
  let productColor = averageTint(productSolutionColors);
  if (productColor == null) productColor = 0xe2f1f8;

  const pickSaturated = (list) => (list.length
    ? list.reduce((best, c) => (saturation(c) > saturation(best) ? c : best), list[0])
    : null);
  const solidMixColor = pickSaturated(reactantsUi.filter((s) => s.state === '固' && !s.water).map((s) => s.color));
  const solidProductColor = pickSaturated(productsUi.filter((s) => s.state === '固' && !s.water).map((s) => s.color));
  const solidOnly = archetype === 'crucible' || archetype === 'tube';
  const displayReactantColor = solidOnly && solidMixColor != null ? solidMixColor : reactantColor;
  const displayProductColor = solidOnly && solidProductColor != null ? solidProductColor : productColor;

  const flame = flameFor(eq, reactants);
  const smokeText = /白烟|烟|黑面包/.test(`${eq.ph || ''} ${eq.t}`) || (archetype === 'crucible' && /铝热/.test(eq.t));
  const solidProducts = products.filter((p) => !p.gas && solidColor(p.formula));
  const smokeProduct = solidProducts.find((p) => !METALS.has(p.formula) && !ELEMENT_SOLIDS.has(p.formula))
    || solidProducts[0] || null;
  const smoke = smokeText && !!(smokeProduct || pptSource);
  const smokeColor = (/黑面包/.test(eq.t) ? 0x202020 : null)
    ?? solidColor(smokeProduct?.formula ?? pptSource?.formula ?? '')
    ?? 0xf4f7f8;
  const mistGas = products.find((p) => ['HCl', 'HBr', 'HI', 'HF'].includes(p.formula) && evolvedSet.has(p.formula));
  const mistText = /白雾|酸雾/.test(eq.ph || '')
    || (archetype !== 'gasjar' && !!mistGas);
  const mist = mistText ? { color: 0xffffff, gas: mistGas?.formula || '' } : null;

  const bubbleGas = archetype === 'cell' || archetype === 'trough'
    || (archetype === 'beaker' && (!!evolvedGas || (gasInlet && !absorbing)));

  const depositMetal = (archetype === 'beaker' || archetype === 'trough')
    ? products.find((p) => METALS.has(p.formula) && !p.gas) || null
    : null;
  const deposit = depositMetal
    ? { color: solidColor(depositMetal.formula) ?? 0xb45a2c, label: depositMetal.formula }
    : null;
  const solidReactant = reactantsUi.find((s) => s.state === '固' && !s.water) || null;
  const solidForm = solidReactant
    ? (METALS.has(solidReactant.formula) && !/粉|屑/.test(eq.ph || '') ? 'strip' : 'powder')
    : 'none';

  const indicator = indicatorFor(eq);
  if (indicator && archetype === 'cell' && indicator.label === '溶液变红') indicator.label = '阴极区变红';
  const exotherm = /放出大量热|放热|温度升高|液面.*沸腾/.test(eq.ph || '');
  const endotherm = /结冰|吸热|温度降低/.test(eq.ph || '');

  const hazard = {
    explosive: /爆炸|爆鸣/.test(`${eq.t} ${eq.ph}`),
    warning: /有毒|刺激性|腐蚀|爆炸|爆鸣/.test(eq.ph) || (eq.tags || []).includes('安全'),
  };
  hazard.text = hazard.explosive
    ? '演示涉及爆炸性反应，已启用安全视角与冲击波提示。'
    : hazard.warning
      ? '反应过程可能产生刺激性或有毒物质，演示已开启通风提示。'
      : '';

  const apparatus = APPARATUS[archetype];
  const reactantText = reactantsUi.map((r) => `${r.display}（${r.appearance}）`).join('、');
  const productText = productsUi.map((p) => `${p.display}（${p.state}）`).join('、');
  const steps = [
    { title: '反应物就位', desc: `${apparatus.name}中加入 ${reactantText}` },
    { title: '条件触发', desc: eq.cond ? `建立「${eq.cond}」反应条件` : '常温下混合，开始反应' },
    { title: '反应进行', desc: eq.ph },
    { title: '产物收集', desc: `检测到 ${productText}` },
  ];

  const reactionType = reactionTypeFor(eq, reactants, products, {
    hasPpt,
    hasGas,
    electric: archetype === 'cell',
    battery: /电池|蓄电池|干电池|燃料电池|原电池/.test(eq.t),
    recharge: /充电/.test(eq.cond),
  });
  const gasLabel = gasProduct
    ? `${appearanceOf(gasProduct.formula, '气', gasColor(gasProduct.formula) ?? 0xeaf4f8)} ${gasProduct.formula}`
    : '';
  const pptLabelSource = pptSource || reactantPpt;
  const pptLabelColor = pptSource ? pptFinalColor : pptFromColor;
  const pptLabel = pptLabelSource
    ? `${appearanceOf(pptLabelSource.formula, archetype === 'beaker' || archetype === 'trough' ? '沉淀' : '固', pptLabelColor, pptStyle)} ${pptLabelSource.formula}`
    : '';
  const smokeLabel = smoke ? `${colorName(smokeColor).replace('白色', '白').replace('黑色', '黑')}烟` : '';

  const cell = archetype === 'cell' ? (() => {
    const anode = products.find((p) => p.gas && ['Cl₂', 'O₂', 'Br₂', 'I₂', 'F₂'].includes(p.formula));
    const cathodeGas = products.find((p) => p.formula === 'H₂');
    const cathodeMetal = products.find((p) => METALS.has(p.formula) && !p.gas);
    return {
      molten,
      anodeGas: anode?.formula || '',
      cathodeGas: cathodeGas?.formula || '',
      cathodeMetal: cathodeMetal?.formula || '',
      anodeColor: anode ? gasColor(anode.formula) ?? 0xeaf4f8 : 0xeaf4f8,
      cathodeColor: cathodeGas ? gasColor(cathodeGas.formula) ?? 0xeaf4f8 : 0xeaf4f8,
      metalColor: solidColor(cathodeMetal?.formula ?? '') ?? 0xcfd6da,
    };
  })() : null;

  const liquid = {
    from: { color: visibleSolution(reactantColor), opacity: clamp(0.46 + saturation(reactantColor) * 0.8, 0.46, 0.84) },
    to: { color: visibleSolution(productColor), opacity: clamp(0.46 + saturation(productColor) * 0.8, 0.46, 0.84) },
  };

  const demo = {
    eq,
    left,
    right,
    arrow,
    reactants: reactantsUi,
    products: productsUi,
    archetype,
    apparatus,
    condLabel: eq.cond || '常温',
    flags,
    hasGas,
    hasPpt,
    gasInlet,
    gasEvolution: explicitGas || !!evolvedGas,
    bubbleGas,
    organic: reactants.some((r) => ORGANIC.test(r.formula)),
    smoke,
    smokeLabel,
    mist,
    flame,
    indicator,
    exotherm,
    endotherm,
    molten,
    cell,
    deposit,
    solidForm,
    thermite,
    solidOnly,
    absorbing,
    liquid,
    flash: /耀眼|白光|爆炸|爆鸣/.test(`${eq.ph || ''} ${eq.t}`) ? 0.55 : 0,
    pptStyle,
    pptTimeline,
    pptInitial,
    pptAging,
    colors: {
      reactant: displayReactantColor,
      product: displayProductColor,
      gas: gasProduct ? (gasColor(gasProduct.formula) ?? gasTo) : gasTo,
      gasFrom,
      gasTo,
      ppt: pptFinalColor,
      pptFrom: pptFromColor,
      pptTo: pptToColor,
      solid: solidColor(solidReactant?.formula ?? '') ?? 0xb8c0c4,
      solidMix: solidMixColor ?? 0xb8c0c4,
      solidTo: solidProductColor,
      solidSample: reactantsUi.some((s) => s.state === '固' && !s.water),
      smoke: smokeColor,
      metal: solidColor(products.find((p) => METALS.has(p.formula))?.formula ?? '') ?? 0xcfd6da,
      deposit: deposit?.color ?? null,
      flame: flame?.color ?? 0xffb347,
      flame2: flame?.color2 ?? 0xffe6b0,
    },
    colorNames: {
      reactant: solidOnly && solidMixColor != null ? colorName(solidMixColor) : colorNameFor(reactantColor, '溶液'),
      product: solidOnly && solidProductColor != null ? colorName(solidProductColor) : colorNameFor(productColor, '溶液'),
      gas: colorName(gasProduct ? gasColor(gasProduct.formula) ?? gasTo : gasTo),
      ppt: colorName(pptFinalColor),
      smoke: colorName(smokeColor),
      solid: colorName(solidMixColor ?? solidColor(solidReactant?.formula ?? '') ?? 0xb8c0c4),
    },
    labels: {
      reactant: reactants.map((r) => r.formula).join(' + '),
      product: products.map((p) => p.formula).join(' + '),
      gas: gasProduct
        ? (archetype === 'tube'
          ? products.filter((p) => p.gas).map((p) => p.formula).join(' + ')
          : gasProduct.formula)
        : '',
      ppt: pptLabelSource ? pptLabelSource.formula : '',
      gasLong: gasLabel,
      pptLong: pptLabel,
    },
    hazard,
    steps,
    reactionType,
    observations: [],
    isBattery: /电池|蓄电池|干电池|燃料电池|原电池/.test(eq.t),
    isLinked: !!eq.link,
    swatches: {
      reactant: hex(displayReactantColor),
      product: hex(displayProductColor),
      gas: hex(gasProduct ? (gasColor(gasProduct.formula) ?? gasTo) : gasTo),
      ppt: hex(pptFinalColor),
      solid: hex(solidMixColor ?? solidColor(solidReactant?.formula ?? '') ?? 0xb8c0c4),
      smoke: hex(smokeColor),
    },
  };

  demo.observations = observationsFor(demo, eq, {
    flame, smoke, mist, hasGas, hasPpt, gasProduct, pptProduct: pptSource, indicator,
    solidProducts: productsUi.filter((p) => p.state === '固'),
    pptFromFormula: reactantPpt?.formula || '',
  });

  return demo;
}
