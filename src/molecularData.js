const SUB = '₀₁₂₃₄₅₆₇₈₉';
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';

const ELEMENT_STYLES = {
  H: { color: 0xeef4f8, radius: 0.15, name: '氢' },
  C: { color: 0x454c54, radius: 0.2, name: '碳' },
  N: { color: 0x4a7cf0, radius: 0.2, name: '氮' },
  O: { color: 0xe05a4f, radius: 0.19, name: '氧' },
  F: { color: 0x74d38b, radius: 0.17, name: '氟' },
  Na: { color: 0xa77bf0, radius: 0.25, name: '钠' },
  Mg: { color: 0x7fc46a, radius: 0.25, name: '镁' },
  Al: { color: 0xb7c4cf, radius: 0.25, name: '铝' },
  Si: { color: 0xc7a06a, radius: 0.24, name: '硅' },
  P: { color: 0xe79242, radius: 0.23, name: '磷' },
  S: { color: 0xe8cf4a, radius: 0.23, name: '硫' },
  Cl: { color: 0x63cf7a, radius: 0.22, name: '氯' },
  K: { color: 0xb07cf0, radius: 0.27, name: '钾' },
  Ca: { color: 0x8ccf74, radius: 0.27, name: '钙' },
  Ti: { color: 0x91a3b5, radius: 0.26, name: '钛' },
  Cr: { color: 0x53b0aa, radius: 0.25, name: '铬' },
  Mn: { color: 0xd985b0, radius: 0.25, name: '锰' },
  Fe: { color: 0xe0824c, radius: 0.25, name: '铁' },
  Cu: { color: 0xcb7f4a, radius: 0.25, name: '铜' },
  Zn: { color: 0x7f9fb8, radius: 0.25, name: '锌' },
  Br: { color: 0xb04a35, radius: 0.24, name: '溴' },
  Ag: { color: 0xc7d0d8, radius: 0.26, name: '银' },
  I: { color: 0x8a4cc0, radius: 0.26, name: '碘' },
  Ba: { color: 0x86c979, radius: 0.29, name: '钡' },
  Hg: { color: 0xb8c2ca, radius: 0.26, name: '汞' },
  Pb: { color: 0x8794a4, radius: 0.28, name: '铅' },
  Li: { color: 0xd269a8, radius: 0.24, name: '锂' },
  B: { color: 0xc98c72, radius: 0.21, name: '硼' },
};

const FALLBACK_COLORS = [0x6fb7d8, 0x8d8ae0, 0x6bc9a8, 0xd8a25f, 0xc978a8];

export function elementStyle(el) {
  const hit = ELEMENT_STYLES[el];
  if (hit) return hit;
  let hash = 0;
  for (let i = 0; i < el.length; i++) hash = (hash * 31 + el.charCodeAt(i)) >>> 0;
  return { color: FALLBACK_COLORS[hash % FALLBACK_COLORS.length], radius: 0.23, name: el };
}

function latin(text) {
  return text
    .replace(/[₀-₉]/g, (c) => String(SUB.indexOf(c)))
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => String(SUP.indexOf(c)))
    .replace(/⁺/g, '+')
    .replace(/⁻/g, '-');
}

function parseComp(text, mult = 1) {
  const atoms = {};
  let i = 0;
  const readNum = () => {
    let n = '';
    while (i < text.length && /[0-9.]/.test(text[i])) n += text[i++];
    return n ? Number(n) : 1;
  };
  function parseSub(expected) {
    const out = {};
    while (i < text.length) {
      const ch = text[i];
      if (expected && ch === expected) {
        i++;
        return out;
      }
      if (ch === '(' || ch === '[') {
        const close = ch === '(' ? ')' : ']';
        i++;
        const sub = parseSub(close);
        const num = readNum();
        for (const [el, n] of Object.entries(sub)) out[el] = (out[el] || 0) + n * num;
        continue;
      }
      if (/[A-Z]/.test(ch)) {
        let el = ch;
        i++;
        while (i < text.length && /[a-z]/.test(text[i])) el += text[i++];
        const num = readNum();
        out[el] = (out[el] || 0) + num;
        continue;
      }
      i++;
    }
    return out;
  }
  const res = parseSub(null);
  for (const [el, n] of Object.entries(res)) atoms[el] = n * mult;
  return atoms;
}

function sumAtoms(target, source, factor = 1) {
  for (const [el, n] of Object.entries(source)) target[el] = (target[el] || 0) + n * factor;
  return target;
}

function scaleAtoms(atoms, factor) {
  const out = {};
  for (const [el, n] of Object.entries(atoms)) out[el] = n * factor;
  return out;
}

function elementCount(atoms) {
  return Object.values(atoms).reduce((sum, n) => sum + n, 0);
}

function dominantElement(atoms) {
  const entries = Object.entries(atoms);
  if (!entries.length) return 'H';
  if (atoms.C) return 'C';
  const heavy = entries.filter(([el]) => el !== 'H');
  const pool = heavy.length ? heavy : entries;
  return pool.reduce((best, item) => (item[1] > best[1] ? item : best), pool[0])[0];
}

function chargeSuffix(charge) {
  if (!charge) return '';
  const mag = Math.abs(charge);
  return `${mag > 1 ? mag : ''}${charge > 0 ? '+' : '-'}`;
}

function chargeUnicode(charge) {
  if (!charge) return '';
  const mag = Math.abs(charge);
  const sup = mag > 1 ? String(mag).split('').map((d) => SUP[Number(d)]).join('') : '';
  return `${sup}${charge > 0 ? '⁺' : '⁻'}`;
}

/**
 * Parse one stoichiometric term such as `2H₂O`, `SO₄²⁻`, `[Cu(NH₃)₄]²⁺`
 * or `CuSO₄·5H₂O`. Returns atoms counted per formula unit and in total.
 */
export function parseTerm(raw) {
  let text = raw.trim().replace(/[↑↓]/g, '');
  let coeff = 1;
  const cm = text.match(/^(\d+(?:\.\d+)?|n)\s*/);
  if (cm) {
    coeff = cm[1] === 'n' ? 1 : Number(cm[1]);
    text = text.slice(cm[0].length);
  }
  const stateRe = /\((?:浓|稀|胶体|气体|固体|溶液|aq|g|l|s|过量|少量)\)/g;
  const display = text.replace(stateRe, '').replace(/\s+/g, '').trim();
  text = text.replace(stateRe, '');

  let charge = 0;
  const chm = text.match(/([⁰¹²³⁴⁵⁶⁷⁸⁹]*)([⁺⁻])$/);
  if (chm) {
    const mag = chm[1] ? Number([...chm[1]].map((c) => SUP.indexOf(c)).join('')) : 1;
    charge = mag * (chm[2] === '⁺' ? 1 : -1);
    text = text.slice(0, -chm[0].length);
  }
  text = latin(text).trim().replace(/\s+/g, '');
  if (!text || ['Q', '热量', '能量'].includes(text)) return null;

  if (text === 'e' && charge === -1) {
    return {
      raw: raw.trim(), display: display || 'e⁻', key: 'e', coefficient: coeff, charge: -1,
      electrons: coeff, atoms: {}, perUnitAtoms: {}, parts: [], atomCount: 0,
      dominantEl: 'e', isElectron: true,
    };
  }

  const parts = text.split('·').filter(Boolean).map((part) => {
    const pm = part.match(/^(\d+(?:\.\d+)?|n)/);
    let mult = 1;
    let body = part;
    if (pm) {
      mult = pm[1] === 'n' ? 1 : Number(pm[1]);
      body = part.slice(pm[0].length);
    }
    return { mult, repeat: pm && pm[1] === 'n' ? 2 : mult, body, atoms: parseComp(body, mult) };
  });
  if (!parts.length) return null;

  const perUnitAtoms = {};
  parts.forEach((p) => sumAtoms(perUnitAtoms, p.atoms));
  const atoms = scaleAtoms(perUnitAtoms, coeff);
  return {
    raw: raw.trim(),
    display: display || text,
    key: parts.map((p) => p.body).join('·'),
    formula: parts[0].body,
    coefficient: coeff,
    charge,
    electrons: 0,
    atoms,
    perUnitAtoms,
    parts,
    atomCount: elementCount(atoms),
    dominantEl: dominantElement(perUnitAtoms),
    isElectron: false,
  };
}

function parseSide(side) {
  return side.split('+').map((term) => parseTerm(term)).filter(Boolean);
}

function totals(list) {
  const map = {};
  list.forEach((term) => sumAtoms(map, term.atoms));
  return map;
}

function compareAtoms(left, right) {
  const els = new Set([...Object.keys(left), ...Object.keys(right)]);
  const rows = [];
  let ok = true;
  for (const el of els) {
    const l = left[el] || 0;
    const r = right[el] || 0;
    if (l !== r) ok = false;
    rows.push({ el, left: l, right: r });
  }
  rows.sort((a, b) => (b.left + b.right) - (a.left + a.right) || a.el.localeCompare(b.el));
  return { ok, rows };
}

function sideCharge(list) {
  return list.reduce((sum, term) => sum + term.charge * term.coefficient, 0);
}

function sideText(list) {
  return list.map((term) => `${term.coefficient > 1 ? term.coefficient : ''}${term.display}`).join(' + ');
}

function sideAtomsText(list) {
  return list.map((term) => {
    const parts = Object.entries(term.perUnitAtoms).map(([el, n]) => `${el}${n > 1 ? n : ''}`);
    return `${term.coefficient > 1 ? term.coefficient : ''}${term.display}${parts.length ? '' : ''}`;
  }).join(' + ');
}

function collectOxStates(list) {
  const map = {};
  list.forEach((term) => {
    if (term.isElectron || term.parts.length !== 1) return;
    const entries = Object.entries(term.perUnitAtoms);
    if (entries.length !== 1) return;
    const [el, count] = entries[0];
    if (count !== 1 && term.charge !== 0) return;
    if (!map[el]) map[el] = [];
    map[el].push({ charge: term.charge, display: term.display });
  });
  return map;
}

function buildElectronInfo(left, right) {
  const l = collectOxStates(left);
  const r = collectOxStates(right);
  const pairs = [];
  for (const el of Object.keys(l)) {
    if (!r[el]) continue;
    const chargesL = l[el].map((x) => x.charge);
    const chargesR = r[el].map((x) => x.charge);
    const lowL = Math.min(...chargesL);
    const highL = Math.max(...chargesL);
    const lowR = Math.min(...chargesR);
    const highR = Math.max(...chargesR);
    if (lowL === lowR && highL === highR) continue;
    const from = chargesL.find((c) => !chargesR.includes(c));
    const to = chargesR.find((c) => !chargesL.includes(c));
    if (from == null || to == null) continue;
    pairs.push({
      el,
      from,
      to,
      gain: to > from,
      label: `${el}${chargeUnicode(from) || '0'} ${from > to ? '失电子' : '得电子'} ${el}${chargeUnicode(to) || '0'}`,
    });
  }
  const hasElectronTerm = [...left, ...right].some((term) => term.isElectron);
  const text = pairs.length
    ? pairs.slice(0, 3).map((p) => `${p.el}${p.from > p.to ? ' 失电子' : ' 得电子'}`).join('，')
    : '';
  return { active: pairs.length > 0 || hasElectronTerm, pairs, text, hasElectronTerm };
}

/**
 * Decide whether the ionic or the full equation gives the clearest particle
 * picture, then expose both sides with coefficient-expanded atom totals.
 */
export function analyzeEquation(eq) {
  const fullSegs = eq.eq.split(/[→⇌]/).map((s) => s.trim()).filter(Boolean);
  const fullLeft = parseSide(fullSegs[0] || '');
  const fullRight = parseSide(fullSegs[fullSegs.length - 1] || '');
  const fullTotalsL = totals(fullLeft);
  const fullTotalsR = totals(fullRight);
  const fullCompare = compareAtoms(fullTotalsL, fullTotalsR);
  const fullCharge = [sideCharge(fullLeft), sideCharge(fullRight)];

  let left = fullLeft;
  let right = fullRight;
  let source = 'full';
  if (eq.ion) {
    const ionSegs = eq.ion.split(/[→⇌]/).map((s) => s.trim()).filter(Boolean);
    const ionLeft = parseSide(ionSegs[0] || '');
    const ionRight = parseSide(ionSegs[ionSegs.length - 1] || '');
    const ionL = totals(ionLeft);
    const ionR = totals(ionRight);
    const ionCompare = compareAtoms(ionL, ionR);
    const ionCharge = [sideCharge(ionLeft), sideCharge(ionRight)];
    const atoms = elementCount(ionL);
    if (ionCompare.ok && ionCharge[0] === ionCharge[1] && atoms <= 60 && ionLeft.length + ionRight.length <= 9) {
      left = ionLeft;
      right = ionRight;
      source = 'ionic';
    }
  }

  const totalsL = totals(left);
  const totalsR = totals(right);
  const compare = compareAtoms(totalsL, totalsR);
  const charges = [sideCharge(left), sideCharge(right)];
  const electron = buildElectronInfo(left, right);

  return {
    eq,
    source,
    reversible: /⇌/.test(eq.eq),
    arrow: /⇌/.test(eq.eq) ? '⇌' : '→',
    left,
    right,
    leftText: sideText(left),
    rightText: sideText(right),
    fullLeftText: sideText(fullLeft),
    fullRightText: sideText(fullRight),
    fullCompare,
    fullCharges: fullCharge,
    balance: compare,
    elementTotals: compare.rows,
    charges,
    chargeBalanced: charges[0] === charges[1],
    atomCountLeft: elementCount(totalsL),
    atomCountRight: elementCount(totalsR),
    speciesCount: left.length + right.length,
    reactantFormula: sideAtomsText(left),
    productFormula: sideAtomsText(right),
    electron,
    condLabel: eq.cond || '常温',
  };
}

export function atomSummary(rows) {
  return rows.slice(0, 6).map((row) => `${row.el} ${row.left}`).join(' · ');
}
