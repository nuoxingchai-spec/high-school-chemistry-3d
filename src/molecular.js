import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { analyzeEquation, elementStyle } from './molecularData.js';

const TAU = Math.PI * 2;
const B = 0.46;
const H_B = 0.33;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
const rand = (a, b) => a + Math.random() * (b - a);

const METALS = new Set([
  'Li', 'Na', 'K', 'Mg', 'Ca', 'Ba', 'Al', 'Fe', 'Cu', 'Ag', 'Zn', 'Mn',
  'Hg', 'Pb', 'Ti', 'Cr', 'Sn', 'Ni',
]);
const NO_SPLIT = new Set(['TiCl4', 'SiC', 'Si3N4', 'PCl3', 'PCl5', 'SiCl4', 'SiF4', 'AlCl3', 'BeCl2', 'SnCl4']);
const HALOGENS = new Set(['F', 'Cl', 'Br', 'I']);
const ION_FORMULAS = [
  'H2PO4', 'HPO4', 'FeO4', 'MnO4', 'Cr2O7', 'CrO4', 'S4O6', 'S2O3', 'SiO3',
  'AlO2', 'HCO3', 'HSO4', 'HSO3', 'ClO4', 'ClO3', 'ClO2', 'ClO', 'CO3', 'SO4',
  'SO3', 'NO3', 'NO2', 'PO4', 'OH', 'CN', 'SCN', 'O2',
];
const SIMPLE_ION_ATOMS = new Map([
  ['OH', { O: 1, H: 1 }],
  ['O2', { O: 2 }],
  ['CO3', { C: 1, O: 3 }],
  ['HCO3', { H: 1, C: 1, O: 3 }],
  ['SO4', { S: 1, O: 4 }],
  ['HSO4', { H: 1, S: 1, O: 4 }],
  ['SO3', { S: 1, O: 3 }],
  ['HSO3', { H: 1, S: 1, O: 3 }],
  ['NO3', { N: 1, O: 3 }],
  ['NO2', { N: 1, O: 2 }],
  ['PO4', { P: 1, O: 4 }],
  ['HPO4', { H: 1, P: 1, O: 4 }],
  ['H2PO4', { H: 2, P: 1, O: 4 }],
  ['MnO4', { Mn: 1, O: 4 }],
  ['FeO4', { Fe: 1, O: 4 }],
  ['CrO4', { Cr: 1, O: 4 }],
  ['Cr2O7', { Cr: 2, O: 7 }],
  ['ClO', { Cl: 1, O: 1 }],
  ['ClO2', { Cl: 1, O: 2 }],
  ['ClO3', { Cl: 1, O: 3 }],
  ['ClO4', { Cl: 1, O: 4 }],
  ['SiO3', { Si: 1, O: 3 }],
  ['AlO2', { Al: 1, O: 2 }],
  ['S2O3', { S: 2, O: 3 }],
  ['S4O6', { S: 4, O: 6 }],
  ['SCN', { S: 1, C: 1, N: 1 }],
  ['NH4', { N: 1, H: 4 }],
]);

const tetra = [
  new THREE.Vector3(1, 1, 1),
  new THREE.Vector3(-1, -1, 1),
  new THREE.Vector3(-1, 1, -1),
  new THREE.Vector3(1, -1, -1),
].map((d) => d.normalize());
const octa = [
  new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
];
const trig = [90, 210, 330].map((deg) => new THREE.Vector3(
  Math.cos(THREE.MathUtils.degToRad(deg)),
  Math.sin(THREE.MathUtils.degToRad(deg)),
  0,
));

function V(x = 0, y = 0, z = 0) {
  return new THREE.Vector3(x, y, z);
}

function atom(el, x = 0, y = 0, z = 0) {
  return { el, p: V(x, y, z) };
}

function bond(a, b, order = 1) {
  return [a, b, order];
}

function makeModel(atoms, bonds = [], contacts = []) {
  if (!atoms.length) return { atoms: [], bonds: [], contacts: [], extent: 0.2 };
  const box = new THREE.Box3();
  atoms.forEach((a) => box.expandByPoint(a.p));
  const center = box.getCenter(V());
  atoms.forEach((a) => a.p.sub(center));
  contacts.forEach(([a, b]) => {
    a.sub(center);
    b.sub(center);
  });
  let extent = 0.3;
  atoms.forEach((a) => {
    extent = Math.max(extent, a.p.length() + elementStyle(a.el).radius * 0.8);
  });
  return { atoms, bonds, contacts, extent };
}

function mergeModels(entries) {
  const atoms = [];
  const bonds = [];
  const contacts = [];
  entries.forEach((entry) => {
    const { model, offset = V(), rot = null } = entry;
    if (!model) return;
    const base = atoms.length;
    model.atoms.forEach((a) => {
      const p = a.p.clone();
      if (rot) p.applyQuaternion(rot);
      p.add(offset);
      atoms.push({ el: a.el, p });
    });
    model.bonds.forEach(([i, j, order]) => bonds.push([base + i, base + j, order]));
    (model.contacts || []).forEach(([a, b]) => {
      const p1 = a.clone();
      const p2 = b.clone();
      if (rot) {
        p1.applyQuaternion(rot);
        p2.applyQuaternion(rot);
      }
      contacts.push([p1.add(offset), p2.add(offset)]);
    });
  });
  return makeModel(atoms, bonds, contacts);
}

function placeModel(model, offset, rot = null) {
  return mergeModels([{ model, offset, rot }]);
}

function atomsOfModel(model) {
  const map = {};
  model.atoms.forEach((a) => { map[a.el] = (map[a.el] || 0) + 1; });
  return map;
}

function sameAtoms(a, b) {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((el) => a[el] === b[el]);
}

function dirsFor(n, shape = 'sphere') {
  if (shape === 'octa' && n <= 6) return octa.slice(0, n);
  if (shape === 'tetra' && n <= 4) return tetra.slice(0, n);
  if (shape === 'trig' && n <= 3) return trig.slice(0, n);
  if (shape === 'linear' && n <= 2) return [V(1, 0, 0), V(-1, 0, 0)].slice(0, n);
  const out = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i + 0.5) * 2 / Math.max(1, n);
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    out.push(V(Math.cos(th) * r, y, Math.sin(th) * r));
  }
  return out;
}

function hydrogensAround(center, used, count, dist = H_B) {
  const dirs = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < 40 && dirs.length < count; i++) {
    const y = 1 - (i + 0.5) * 2 / 40;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    const d = V(Math.cos(th) * r, y, Math.sin(th) * r);
    if (used.every((u) => d.dot(u) < 0.35)) dirs.push(d);
    if (i === 39 && dirs.length < count) {
      for (let k = 0; k < count - dirs.length; k++) dirs.push(V(0, 1, 0).applyAxisAngle(V(0, 0, 1), k * TAU / count));
    }
  }
  return dirs.slice(0, count).map((d) => atom('H', center.x + d.x * dist, center.y + d.y * dist, center.z + d.z * dist));
}

function hydroxyl(centerEl, oPos, outDir, atoms, bonds, oIndex) {
  atoms.push(atom('O', oPos.x, oPos.y, oPos.z));
  const oi = atoms.length - 1;
  const hd = outDir.clone().normalize();
  const hp = oPos.clone().addScaledVector(hd, H_B);
  atoms.push(atom('H', hp.x, hp.y, hp.z));
  bonds.push(bond(centerEl, oi, 1));
  bonds.push(bond(oi, atoms.length - 1, 1));
  return oi;
}

/* ---------------- curated molecule geometry ---------------- */

function diatomic(a, b, order = 1) {
  return makeModel([atom(a, -B / 2, 0, 0), atom(b, B / 2, 0, 0)], [bond(0, 1, order)]);
}

function waterModel() {
  const half = THREE.MathUtils.degToRad(104.5) / 2;
  return makeModel([
    atom('O', 0, 0, 0),
    atom('H', Math.sin(half) * B, Math.cos(half) * B, 0),
    atom('H', -Math.sin(half) * B, Math.cos(half) * B, 0),
  ], [bond(0, 1), bond(0, 2)]);
}

function bentModel(centerEl, ligandEl, angleDeg, order = 1) {
  const half = THREE.MathUtils.degToRad(angleDeg) / 2;
  return makeModel([
    atom(centerEl, 0, 0, 0),
    atom(ligandEl, Math.sin(half) * B, Math.cos(half) * B, 0),
    atom(ligandEl, -Math.sin(half) * B, Math.cos(half) * B, 0),
  ], [bond(0, 1, order), bond(0, 2, order)]);
}

function centralModel(centerEl, ligandEl, count, shape = 'tetra', order = 1) {
  const atoms = [atom(centerEl, 0, 0, 0)];
  const bonds = [];
  dirsFor(count, shape).forEach((d) => {
    atoms.push(atom(ligandEl, d.x * B, d.y * B, d.z * B));
    bonds.push(bond(0, atoms.length - 1, order));
  });
  return makeModel(atoms, bonds);
}

function ammoniaModel() {
  const atoms = [atom('N', 0, -0.03, 0)];
  const bonds = [];
  [[0.94, 0.33, 0], [-0.47, 0.33, 0.816], [-0.47, 0.33, -0.816]].forEach(([x, y, z]) => {
    const d = V(x, y, z).normalize();
    atoms.push(atom('H', d.x * H_B, d.y * H_B - 0.03, d.z * H_B));
    bonds.push(bond(0, atoms.length - 1));
  });
  return makeModel(atoms, bonds);
}

function ammoniumModel() {
  const atoms = [atom('N', 0, 0, 0)];
  const bonds = [];
  tetra.forEach((d) => {
    atoms.push(atom('H', d.x * H_B, d.y * H_B, d.z * H_B));
    bonds.push(bond(0, atoms.length - 1));
  });
  return makeModel(atoms, bonds);
}

function methaneModel() {
  return centralModel('C', 'H', 4, 'tetra');
}

function oxyAcidModel(center, terminal, hydroxyls, centerH = 0, shape = 'tetra') {
  const atoms = [atom(center, 0, 0, 0)];
  const bonds = [];
  const total = terminal + hydroxyls + centerH;
  const dirs = dirsFor(Math.max(total, shape === 'tetra' ? 4 : total), shape);
  let di = 0;
  for (let i = 0; i < terminal; i++) {
    const d = dirs[di++] || V(1, 0, 0);
    atoms.push(atom('O', d.x * B, d.y * B, d.z * B));
    bonds.push(bond(0, atoms.length - 1, 2));
  }
  for (let i = 0; i < hydroxyls; i++) {
    const d = dirs[di++] || V(0, 1, 0);
    const oPos = d.clone().multiplyScalar(B);
    atoms.push(atom('O', oPos.x, oPos.y, oPos.z));
    const oi = atoms.length - 1;
    bonds.push(bond(0, oi, 1));
    const out = d.clone().add(V(0, 0.55, 0.15)).normalize();
    const hp = oPos.clone().addScaledVector(out, H_B);
    atoms.push(atom('H', hp.x, hp.y, hp.z));
    bonds.push(bond(oi, atoms.length - 1));
  }
  for (let i = 0; i < centerH; i++) {
    const d = dirs[di++] || V(0, -1, 0);
    atoms.push(atom('H', d.x * H_B, d.y * H_B, d.z * H_B));
    bonds.push(bond(0, atoms.length - 1));
  }
  return makeModel(atoms, bonds);
}

function carbonateModel() {
  const atoms = [atom('C', 0, 0, 0)];
  const bonds = [];
  trig.forEach((d, i) => {
    atoms.push(atom('O', d.x * B, d.y * B, 0));
    bonds.push(bond(0, atoms.length - 1, i === 0 ? 2 : 1));
  });
  return makeModel(atoms, bonds);
}

function bicarbonateModel() {
  const atoms = [atom('C', 0, 0, 0)];
  const bonds = [];
  trig.forEach((d, i) => {
    if (i === 2) return;
    atoms.push(atom('O', d.x * B, d.y * B, 0));
    bonds.push(bond(0, atoms.length - 1, i === 0 ? 2 : 1));
  });
  const oPos = trig[2].clone().multiplyScalar(B);
  atoms.push(atom('O', oPos.x, oPos.y, 0));
  const oi = atoms.length - 1;
  bonds.push(bond(0, oi));
  const hp = oPos.clone().add(V(0.18, -H_B, 0.12));
  atoms.push(atom('H', hp.x, hp.y, hp.z));
  bonds.push(bond(oi, atoms.length - 1));
  return makeModel(atoms, bonds);
}

function nitrateModel() {
  const atoms = [atom('N', 0, 0, 0)];
  const bonds = [];
  trig.forEach((d, i) => {
    atoms.push(atom('O', d.x * B, d.y * B, 0));
    bonds.push(bond(0, atoms.length - 1, i === 0 ? 2 : 1));
  });
  return makeModel(atoms, bonds);
}

function nitriteModel() {
  return bentModel('N', 'O', 134, 1);
}

function sulfuricModel() {
  return oxyAcidModel('S', 2, 2);
}

function hydrogenSulfateModel() {
  const atoms = [atom('S', 0, 0, 0)];
  const bonds = [];
  tetra.forEach((d, i) => {
    atoms.push(atom('O', d.x * B, d.y * B, d.z * B));
    bonds.push(bond(0, atoms.length - 1, i === 0 ? 2 : 1));
  });
  const oi = atoms.length - 1;
  const p = atoms[oi].p;
  const d = tetra[3];
  atoms.push(atom('H', p.x + d.x * H_B, p.y + d.y * H_B, p.z + d.z * H_B));
  bonds.push(bond(oi, atoms.length - 1));
  return makeModel(atoms, bonds);
}

function hydrogenSulfiteModel() {
  const atoms = [atom('S', 0, 0, 0)];
  const bonds = [];
  tetra.slice(0, 3).forEach((d, i) => {
    atoms.push(atom('O', d.x * B, d.y * B, d.z * B));
    bonds.push(bond(0, atoms.length - 1, i === 0 ? 2 : 1));
  });
  const oi = atoms.length - 1;
  const p = atoms[oi].p;
  const d = tetra[2];
  atoms.push(atom('H', p.x + d.x * H_B, p.y + d.y * H_B, p.z + d.z * H_B));
  bonds.push(bond(oi, atoms.length - 1));
  return makeModel(atoms, bonds);
}

function phosphateIonModel(ohCount) {
  const atoms = [atom('P', 0, 0, 0)];
  const bonds = [];
  tetra.forEach((d, i) => {
    atoms.push(atom('O', d.x * B, d.y * B, d.z * B));
    bonds.push(bond(0, atoms.length - 1, i === 0 ? 2 : 1));
  });
  const oIndices = [4, 3, 2];
  for (let i = 0; i < ohCount; i++) {
    const oi = oIndices[i];
    const p = atoms[oi].p;
    const d = p.clone().normalize();
    atoms.push(atom('H', p.x + d.x * H_B, p.y + d.y * H_B, p.z + d.z * H_B));
    bonds.push(bond(oi, atoms.length - 1));
  }
  return makeModel(atoms, bonds);
}

function sulfurousModel() {
  return oxyAcidModel('S', 1, 2);
}

function nitricModel() {
  const atoms = [atom('N', 0, 0, 0)];
  const bonds = [];
  trig.forEach((d, i) => {
    atoms.push(atom('O', d.x * B, d.y * B, 0));
    const oi = atoms.length - 1;
    bonds.push(bond(0, oi, i < 2 ? 2 : 1));
    if (i === 2) {
      const hp = atoms[oi].p.clone().add(V(0, -H_B, 0.12));
      atoms.push(atom('H', hp.x, hp.y, hp.z));
      bonds.push(bond(oi, atoms.length - 1));
    }
  });
  return makeModel(atoms, bonds);
}

function phosphoricModel() {
  return oxyAcidModel('P', 1, 3);
}

function phosphorousModel() {
  return oxyAcidModel('P', 1, 2, 1);
}

function carbonicModel() {
  return oxyAcidModel('C', 1, 2, 0, 'trig');
}

function sulfurDioxideModel() {
  return bentModel('S', 'O', 119, 2);
}

function sulfurTrioxideModel() {
  const atoms = [atom('S', 0, 0, 0)];
  const bonds = [];
  trig.forEach((d, i) => {
    atoms.push(atom('O', d.x * B, d.y * B, 0));
    bonds.push(bond(0, atoms.length - 1, i === 0 ? 2 : 1));
  });
  return makeModel(atoms, bonds);
}

function sulfateModel() {
  return centralModel('S', 'O', 4, 'tetra', 1);
}

function thiosulfateModel() {
  const atoms = [
    atom('S', -0.32, 0, 0),
    atom('S', 0.32, 0, 0),
  ];
  const bonds = [bond(0, 1, 1)];
  [[0.95, 0.35, 0], [0.55, -0.55, 0.6], [0.55, -0.55, -0.6]].forEach(([x, y, z], i) => {
    const d = V(x, y, z).normalize();
    atoms.push(atom('O', 0.32 + d.x * B, d.y * B, d.z * B));
    bonds.push(bond(1, atoms.length - 1, i === 0 ? 2 : 1));
  });
  return makeModel(atoms, bonds);
}

function tetrathionateModel() {
  const atoms = [];
  const bonds = [];
  for (let i = 0; i < 4; i++) atoms.push(atom('S', -0.66 + i * 0.44, 0, 0));
  for (let i = 0; i < 3; i++) bonds.push(bond(i, i + 1));
  [0, 3].forEach((si) => {
    [[0.9, 0.5, 0], [0.2, -0.85, 0.4], [0.2, -0.85, -0.4]].forEach(([x, y, z]) => {
      const d = V(x, y, z).normalize();
      atoms.push(atom('O', atoms[si].p.x + d.x * B, d.y * B, d.z * B));
      bonds.push(bond(si, atoms.length - 1));
    });
  });
  return makeModel(atoms, bonds);
}

function dichromateModel() {
  const atoms = [
    atom('Cr', -0.5, 0, 0),
    atom('Cr', 0.5, 0, 0),
    atom('O', 0, 0.1, 0),
  ];
  const bonds = [bond(0, 2, 1), bond(2, 1, 1)];
  [[-0.5, 1, 0.35], [-0.9, -0.35, 0.3], [-0.9, -0.35, -0.5]].forEach(([x, y, z], i) => {
    const d = V(x, y, z).normalize();
    atoms.push(atom('O', -0.5 + d.x * B, d.y * B, d.z * B));
    bonds.push(bond(0, atoms.length - 1, i === 0 ? 2 : 1));
  });
  [[0.5, 1, -0.35], [0.9, -0.35, -0.3], [0.9, -0.35, 0.5]].forEach(([x, y, z], i) => {
    const d = V(x, y, z).normalize();
    atoms.push(atom('O', 0.5 + d.x * B, d.y * B, d.z * B));
    bonds.push(bond(1, atoms.length - 1, i === 0 ? 2 : 1));
  });
  return makeModel(atoms, bonds);
}

function chromateModel() {
  return centralModel('Cr', 'O', 4, 'tetra', 1);
}

function permanganateModel() {
  return centralModel('Mn', 'O', 4, 'tetra', 1);
}

function ferrateModel() {
  return centralModel('Fe', 'O', 4, 'tetra', 1);
}

function hypochloriteModel() {
  return makeModel([atom('Cl', -B / 2, 0, 0), atom('O', B / 2, 0, 0)], [bond(0, 1)]);
}

function sodiumPeroxideModel() {
  return makeModel([
    atom('Na', -0.82, 0.34, 0),
    atom('O', -0.2, 0, 0),
    atom('O', 0.2, 0, 0),
    atom('Na', 0.82, -0.34, 0),
  ], [bond(1, 2)]);
}

function chlorateModel() {
  const atoms = [atom('Cl', 0, 0.08, 0)];
  const bonds = [];
  const dirs = [V(0.95, -0.2, 0), V(-0.45, -0.2, 0.83), V(-0.45, -0.2, -0.83)];
  dirs.forEach((raw, i) => {
    const d = raw.clone().normalize();
    atoms.push(atom('O', d.x * B, d.y * B + 0.08, d.z * B));
    bonds.push(bond(0, atoms.length - 1, i === 0 ? 2 : 1));
  });
  return makeModel(atoms, bonds);
}

function perchlorateModel() {
  return centralModel('Cl', 'O', 4, 'tetra', 1);
}

function silicateModel() {
  const atoms = [atom('Si', 0, 0, 0)];
  const bonds = [];
  trig.forEach((d, i) => {
    atoms.push(atom('O', d.x * B, d.y * B, 0));
    bonds.push(bond(0, atoms.length - 1, i === 0 ? 2 : 1));
  });
  return makeModel(atoms, bonds);
}

function aluminateModel() {
  return bentModel('Al', 'O', 118, 1);
}

function thiocyanateModel() {
  return makeModel([
    atom('S', -0.5, 0, 0),
    atom('C', 0, 0, 0),
    atom('N', 0.47, 0, 0),
  ], [bond(0, 1, 1), bond(1, 2, 3)]);
}

function manganeseOxyHydroxideModel() {
  const atoms = [atom('Mn', 0, 0, 0), atom('O', 0.42, 0.28, 0)];
  const bonds = [bond(0, 1, 2)];
  const op = V(-0.28, 0.34, 0.22);
  atoms.push(atom('O', op.x, op.y, op.z));
  const oi = atoms.length - 1;
  bonds.push(bond(0, oi));
  const hp = op.clone().add(V(-0.2, 0.25, 0.12));
  atoms.push(atom('H', hp.x, hp.y, hp.z));
  bonds.push(bond(oi, atoms.length - 1));
  return makeModel(atoms, bonds);
}

function hydrogenPeroxideModel() {
  return makeModel([
    atom('O', -0.22, 0, 0),
    atom('O', 0.22, 0, 0),
    atom('H', -0.5, 0.22, 0.13),
    atom('H', 0.5, -0.1, -0.2),
  ], [bond(0, 1), bond(0, 2), bond(1, 3)]);
}

function hydrogenSulfideModel() {
  return bentModel('S', 'H', 92, 1);
}

function siliconDioxideModel() {
  const atoms = [atom('Si', 0, 0, 0)];
  const bonds = [];
  [V(-0.75, 0.66, 0), V(0.75, 0.66, 0)].forEach((d) => {
    atoms.push(atom('O', d.x * B, d.y * B, 0));
    bonds.push(bond(0, atoms.length - 1, 2));
  });
  return makeModel(atoms, bonds);
}

function phosphorusPentoxideModel() {
  const atoms = [atom('P', -0.42, 0, 0), atom('P', 0.42, 0, 0), atom('O', 0, 0.32, 0)];
  const bonds = [bond(0, 2), bond(2, 1)];
  [[-0.7, 0.8, 0.2], [-0.7, 0.8, -0.4]].forEach(([x, y, z]) => {
    const d = V(x, y, z).normalize();
    atoms.push(atom('O', -0.42 + d.x * B, d.y * B, d.z * B));
    bonds.push(bond(0, atoms.length - 1, 2));
  });
  [[0.7, 0.8, -0.2], [0.7, 0.8, 0.4]].forEach(([x, y, z]) => {
    const d = V(x, y, z).normalize();
    atoms.push(atom('O', 0.42 + d.x * B, d.y * B, d.z * B));
    bonds.push(bond(1, atoms.length - 1, 2));
  });
  return makeModel(atoms, bonds);
}

function dinitrogenTetroxideModel() {
  const atoms = [atom('N', -0.25, 0, 0), atom('N', 0.25, 0, 0)];
  const bonds = [bond(0, 1)];
  [[-0.6, 0.8, 0.35], [-0.6, -0.5, 0.35]].forEach(([x, y, z], i) => {
    const d = V(x, y, z).normalize();
    atoms.push(atom('O', -0.25 + d.x * B, d.y * B, d.z * B));
    bonds.push(bond(0, atoms.length - 1, 2));
  });
  [[0.6, 0.8, -0.35], [0.6, -0.5, -0.35]].forEach(([x, y, z], i) => {
    const d = V(x, y, z).normalize();
    atoms.push(atom('O', 0.25 + d.x * B, d.y * B, d.z * B));
    bonds.push(bond(1, atoms.length - 1, 2));
  });
  return makeModel(atoms, bonds);
}

function nitrousOxideModel() {
  return makeModel([
    atom('N', -0.48, 0, 0),
    atom('N', 0.02, 0.02, 0),
    atom('O', 0.5, 0.02, 0),
  ], [bond(0, 1, 3), bond(1, 2, 1)]);
}

function phosphorusTrichlorideModel() {
  const atoms = [atom('P', 0, 0.06, 0)];
  const bonds = [];
  [V(0.95, -0.2, 0), V(-0.45, -0.2, 0.83), V(-0.45, -0.2, -0.83)].forEach((d) => {
    atoms.push(atom('Cl', d.x * B, d.y * B + 0.06, d.z * B));
    bonds.push(bond(0, atoms.length - 1));
  });
  return makeModel(atoms, bonds);
}

function phosphorusPentachlorideModel() {
  const atoms = [atom('P', 0, 0, 0)];
  const bonds = [];
  [V(1, 0, 0), V(-1, 0, 0), V(0, 1, 0)].forEach((d) => {
    atoms.push(atom('Cl', d.x * B, d.y * B, d.z * B));
    bonds.push(bond(0, atoms.length - 1));
  });
  [V(0.6, -0.5, 0.6), V(-0.6, -0.5, -0.6)].forEach((d) => {
    const n = d.normalize();
    atoms.push(atom('Cl', n.x * B, n.y * B, n.z * B));
    bonds.push(bond(0, atoms.length - 1));
  });
  return makeModel(atoms, bonds);
}

function tetrahalideModel(center, ligand) {
  return centralModel(center, ligand, 4, 'tetra');
}

/* ---------------- organic geometry ---------------- */

function benzeneModel(kind = 'benzene') {
  const atoms = [];
  const bonds = [];
  const ring = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 2 + i * TAU / 6;
    atoms.push(atom('C', Math.cos(a) * 0.43, Math.sin(a) * 0.43, 0));
    ring.push(atoms.length - 1);
  }
  for (let i = 0; i < 6; i++) {
    bonds.push(bond(ring[i], ring[(i + 1) % 6], i % 2 ? 1 : 2));
    const a = Math.PI / 2 + i * TAU / 6;
    const out = V(Math.cos(a), Math.sin(a), 0);
    const cPos = atoms[ring[i]].p;
    if (kind === 'phenol' && i === 0) {
      atoms.push(atom('O', cPos.x + out.x * 0.34, cPos.y + out.y * 0.34, 0.04));
      const oi = atoms.length - 1;
      bonds.push(bond(ring[i], oi));
      const hp = atoms[oi].p.clone().add(out.clone().multiplyScalar(0.28)).add(V(0, 0.08, 0.12));
      atoms.push(atom('H', hp.x, hp.y, hp.z));
      bonds.push(bond(oi, atoms.length - 1));
    } else if (kind === 'phenoxide' && i === 0) {
      atoms.push(atom('O', cPos.x + out.x * 0.34, cPos.y + out.y * 0.34, 0.04));
      bonds.push(bond(ring[i], atoms.length - 1));
    } else {
      const hp = cPos.clone().add(out.clone().multiplyScalar(0.3)).add(V(0, 0.03, 0.08));
      atoms.push(atom('H', hp.x, hp.y, hp.z));
      bonds.push(bond(ring[i], atoms.length - 1));
    }
  }
  return makeModel(atoms, bonds);
}

function ethanolModel(charge = 0) {
  const c1 = V(-0.3, -0.12, 0.02);
  const c2 = V(0.2, 0.14, -0.02);
  const o = V(0.62, 0.38, 0.02);
  const atoms = [atom('C', c1.x, c1.y, c1.z), atom('C', c2.x, c2.y, c2.z), atom('O', o.x, o.y, o.z)];
  const bonds = [bond(0, 1), bond(1, 2)];
  const h1 = hydrogensAround(c1, [c2.clone().sub(c1).normalize()], 3);
  h1.forEach((h) => { atoms.push(h); bonds.push(bond(0, atoms.length - 1)); });
  const h2 = hydrogensAround(c2, [c1.clone().sub(c2).normalize(), o.clone().sub(c2).normalize()], 2);
  h2.forEach((h) => { atoms.push(h); bonds.push(bond(1, atoms.length - 1)); });
  if (charge >= 0) {
    const hp = o.clone().add(V(0.16, 0.27, 0.1));
    atoms.push(atom('H', hp.x, hp.y, hp.z));
    bonds.push(bond(2, atoms.length - 1));
  }
  return makeModel(atoms, bonds);
}

function sucroseModel() {
  const atoms = [];
  const bonds = [];
  const rings = [];
  const centers = [V(-0.68, 0, 0), V(0.68, 0, 0)];
  centers.forEach((center, ri) => {
    const ring = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 2 + i * TAU / 6 + (ri ? Math.PI / 6 : 0);
      atoms.push(atom('C', center.x + Math.cos(a) * 0.43, center.y + Math.sin(a) * 0.43, ri ? 0.04 : -0.04));
      ring.push(atoms.length - 1);
    }
    for (let i = 0; i < 6; i++) bonds.push(bond(ring[i], ring[(i + 1) % 6]));
    rings.push(ring);
  });
  const a0 = rings[0][0];
  const b3 = rings[1][3];
  atoms.push(atom('O', 0, 0, 0));
  const bridge = atoms.length - 1;
  bonds.push(bond(a0, bridge), bond(bridge, b3));
  const skip = new Set([a0, b3]);
  for (let i = 0; i < 6; i++) {
    [rings[0][i], rings[1][i]].forEach((ci) => {
      if (skip.has(ci)) return;
      const cPos = atoms[ci].p;
      const dir = V(cPos.x, cPos.y, cPos.z).normalize();
      const op = cPos.clone().addScaledVector(dir, 0.32);
      atoms.push(atom('O', op.x, op.y, op.z));
      const oi = atoms.length - 1;
      bonds.push(bond(ci, oi));
      const hp = op.clone().addScaledVector(dir, 0.24).add(V(0, 0.12, 0.16));
      atoms.push(atom('H', hp.x, hp.y, hp.z));
      bonds.push(bond(oi, atoms.length - 1));
    });
  }
  rings.forEach((ring) => {
    ring.forEach((ci) => {
      const cPos = atoms[ci].p;
      const dir = V(cPos.x, cPos.y, cPos.z).normalize();
      const hp = cPos.clone().addScaledVector(dir, 0.25).add(V(0, -0.18, 0.2));
      atoms.push(atom('H', hp.x, hp.y, hp.z));
      bonds.push(bond(ci, atoms.length - 1));
    });
  });
  return makeModel(atoms, bonds);
}

/* ---------------- generic geometry ---------------- */

function parseAtoms(formula) {
  const map = {};
  let i = 0;
  const readNum = () => {
    let n = '';
    while (i < formula.length && /[0-9.]/.test(formula[i])) n += formula[i++];
    return n ? Number(n) : 1;
  };
  const stack = [{}];
  while (i < formula.length) {
    const ch = formula[i];
    if (ch === '(' || ch === '[') {
      i++;
      stack.push({});
      continue;
    }
    if (ch === ')' || ch === ']') {
      i++;
      const sub = stack.pop();
      const num = readNum();
      const top = stack[stack.length - 1];
      Object.entries(sub).forEach(([el, n]) => { top[el] = (top[el] || 0) + n * num; });
      continue;
    }
    if (/[A-Z]/.test(ch)) {
      let el = ch;
      i++;
      while (i < formula.length && /[a-z]/.test(formula[i])) el += formula[i++];
      const num = readNum();
      const top = stack[stack.length - 1];
      top[el] = (top[el] || 0) + num;
      continue;
    }
    i++;
  }
  while (stack.length > 1) {
    const sub = stack.pop();
    const top = stack[stack.length - 1];
    Object.entries(sub).forEach(([el, n]) => { top[el] = (top[el] || 0) + n; });
  }
  return stack[0];
}

function elementOrder(formula) {
  const out = [];
  const re = /\[?([A-Z][a-z]?)/g;
  let m;
  while ((m = re.exec(formula))) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

function addBondSafe(bonds, a, b, order = 1) {
  if (a === b) return;
  const key = a < b ? `${a}:${b}` : `${b}:${a}`;
  if (bonds.some(([i, j]) => (i < j ? `${i}:${j}` : `${j}:${i}`) === key)) return;
  bonds.push([a, b, order]);
}

function relaxModel(atoms, bonds, iterations = 70) {
  const minGap = 0.23;
  const hydro = new Set(['H']);
  for (let step = 0; step < iterations; step++) {
    const moves = atoms.map(() => V());
    const weights = atoms.map((a) => (hydro.has(a.el) ? 1.5 : 1));
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const d = atoms[j].p.clone().sub(atoms[i].p);
        const dist = d.length();
        if (dist < 0.0001) {
          d.set(rand(-1, 1), rand(-1, 1), rand(-1, 1));
          d.normalize();
        } else {
          d.divideScalar(dist);
        }
        const gap = Math.min(minGap, (elementStyle(atoms[i].el).radius + elementStyle(atoms[j].el).radius) * 1.15 + 0.07);
        if (dist < gap) {
          const push = (gap - dist) * 0.5;
          const wi = weights[i];
          const wj = weights[j];
          moves[i].addScaledVector(d, -push * wj / (wi + wj));
          moves[j].addScaledVector(d, push * wi / (wi + wj));
        }
      }
    }
    bonds.forEach(([i, j]) => {
      const d = atoms[j].p.clone().sub(atoms[i].p);
      const dist = d.length();
      if (dist < 0.0001) return;
      const diff = (dist - B) / dist;
      moves[i].addScaledVector(d, diff * 0.22);
      moves[j].addScaledVector(d, -diff * 0.22);
    });
    atoms.forEach((a, i) => {
      a.p.add(moves[i].multiplyScalar(0.55));
    });
  }
  return atoms;
}

function genericModel(formula, atomsMap, charge = 0) {
  const order = elementOrder(formula);
  const hCount = atomsMap.H || 0;
  const nonH = [];
  order.forEach((el) => {
    if (el === 'H') return;
    for (let i = 0; i < (atomsMap[el] || 0); i++) nonH.push(el);
  });
  if (!nonH.length) {
    if (hCount >= 2) return diatomic('H', 'H');
    return makeModel([atom('H', 0, 0, 0)], []);
  }
  if (nonH.length === 1 && hCount === 0) {
    return makeModel([atom(nonH[0], 0, 0, 0)], []);
  }
  const atoms = [];
  const bonds = [];
  const ligandEls = new Set(['O', 'F', 'Cl', 'Br', 'I']);
  const centers = nonH.filter((el) => !ligandEls.has(el));
  const centerEls = centers.length ? centers : nonH.slice(0, 1);
  const centerIndex = [];
  centerEls.forEach((el, i) => {
    const x = (i - (centerEls.length - 1) / 2) * B * 1.25;
    atoms.push(atom(el, x, 0, 0));
    centerIndex.push(atoms.length - 1);
    if (i > 0) addBondSafe(bonds, centerIndex[i - 1], centerIndex[i], 1);
  });
  const attachments = [];
  nonH.forEach((el) => {
    if (!centerEls.includes(el)) {
      for (let i = 0; i < atomsMap[el]; i++) attachments.push(el);
    } else {
      const extra = atomsMap[el] - centerEls.filter((c) => c === el).length;
      for (let i = 0; i < extra; i++) attachments.push(el);
    }
  });
  const oxygens = [];
  const others = [];
  attachments.forEach((el) => { (el === 'O' ? oxygens : others).push(el); });
  const pendingO = oxygens.slice();
  if (centerIndex.length > 1) {
    for (let i = 0; i < centerIndex.length - 1 && pendingO.length; i++) {
      const p = atoms[centerIndex[i]].p.clone().add(atoms[centerIndex[i + 1]].p).multiplyScalar(0.5);
      atoms.push(atom('O', p.x, p.y + 0.22, p.z));
      const oi = atoms.length - 1;
      addBondSafe(bonds, centerIndex[i], oi);
      addBondSafe(bonds, centerIndex[i + 1], oi);
      pendingO.shift();
    }
  }
  centerIndex.forEach((ci, k) => {
    const around = centerIndex.length === 1 ? 4 : 3;
    const dirs = dirsFor(around, 'tetra');
    const localO = pendingO.filter((_, i) => i % centerIndex.length === k);
    const localOther = others.filter((_, i) => i % centerIndex.length === k);
    let di = 0;
    localO.forEach((el) => {
      const d = dirs[di++] || dirsFor(4, 'tetra')[di % 4];
      atoms.push(atom(el, atoms[ci].p.x + d.x * B, atoms[ci].p.y + d.y * B, atoms[ci].p.z + d.z * B));
      addBondSafe(bonds, ci, atoms.length - 1, 1);
    });
    localOther.forEach((el) => {
      const d = dirs[di++] || dirsFor(4, 'tetra')[di % 4];
      atoms.push(atom(el, atoms[ci].p.x + d.x * B, atoms[ci].p.y + d.y * B, atoms[ci].p.z + d.z * B));
      addBondSafe(bonds, ci, atoms.length - 1, 1);
    });
  });
  let remainingH = hCount;
  const oIndices = atoms.map((a, i) => (a.el === 'O' ? i : -1)).filter((i) => i >= 0);
  for (let i = 0; i < oIndices.length && remainingH > 0; i++) {
    if (bonds.some(([a, b]) => (a === oIndices[i] || b === oIndices[i]) && atoms[a === oIndices[i] ? b : a].el === 'H')) continue;
    const oi = oIndices[i];
    const d = atoms[oi].p.clone().normalize();
    const hp = atoms[oi].p.clone().addScaledVector(d, H_B);
    atoms.push(atom('H', hp.x, hp.y, hp.z));
    addBondSafe(bonds, oi, atoms.length - 1);
    remainingH--;
  }
  if (remainingH > 0) {
    const host = centerIndex[0];
    const used = bonds.filter(([a, b]) => a === host || b === host).map(([a, b]) => {
      const other = a === host ? b : a;
      return atoms[other].p.clone().sub(atoms[host].p).normalize();
    });
    hydrogensAround(atoms[host].p, used, Math.min(remainingH, 5)).forEach((h) => {
      atoms.push(h);
      addBondSafe(bonds, host, atoms.length - 1);
      remainingH--;
    });
  }
  if (remainingH > 0) {
    const host = centerIndex[centerIndex.length - 1];
    for (let i = 0; i < remainingH; i++) {
      const a = i * TAU / Math.max(1, remainingH);
      atoms.push(atom('H', atoms[host].p.x + Math.cos(a) * H_B, atoms[host].p.y + 0.16, atoms[host].p.z + Math.sin(a) * H_B));
      addBondSafe(bonds, host, atoms.length - 1);
    }
  }
  if (atoms.some((a) => a.el === 'O')) relaxModel(atoms, bonds, 55);
  return makeModel(atoms, bonds);
}

function cloudModel(atomsMap, charge = 0) {
  const atoms = [];
  const bonds = [];
  const list = [];
  Object.entries(atomsMap).forEach(([el, n]) => {
    for (let i = 0; i < n; i++) list.push(el);
  });
  const center = list[0] || 'H';
  atoms.push(atom(center, 0, 0, 0));
  const dirs = dirsFor(Math.max(1, list.length - 1));
  list.slice(1).forEach((el, i) => {
    const d = dirs[i] || V(0, 0, 0);
    atoms.push(atom(el, d.x * B * (1.2 + (i % 2) * 0.25), d.y * B, d.z * B));
    bonds.push(bond(0, atoms.length - 1));
  });
  return makeModel(atoms, bonds);
}

/* ---------------- ionic compounds ---------------- */

function stripFormula(formula) {
  return formula.replace(/[·]/g, '').replace(/[₀-₉]/g, '');
}

function cationTokens(prefix) {
  const out = [];
  let text = prefix;
  while (text) {
    const g = text.match(/^\(NH4\)(\d*)/);
    if (g) {
      out.push({ el: 'NH4', count: g[1] ? Number(g[1]) : 1 });
      text = text.slice(g[0].length);
      continue;
    }
    const m = text.match(/^(NH4|NH3)(\d*)/);
    if (m && m[1] === 'NH4') {
      out.push({ el: 'NH4', count: m[2] ? Number(m[2]) : 1 });
      text = text.slice(m[0].length);
      continue;
    }
    const e = text.match(/^([A-Z][a-z]?)(\d*)/);
    if (!e) return null;
    if (!METALS.has(e[1])) return null;
    out.push({ el: e[1], count: e[2] ? Number(e[2]) : 1 });
    text = text.slice(e[0].length);
  }
  return out.length ? out : null;
}

function suffixAnion(formula) {
  const sorted = ION_FORMULAS.slice().sort((a, b) => b.length - a.length);
  for (const ion of sorted) {
    if (!formula.endsWith(ion) || formula === ion) continue;
    const prefix = formula.slice(0, -ion.length);
    const cations = cationTokens(prefix);
    if (cations) return { cations, anions: [{ formula: ion, count: 1 }] };
  }
  return null;
}

function parseAnionRemainder(remainder) {
  // e.g. (OH)2CO3 -> OH x2 + CO3 x1; (SO4)2 -> SO4 x2; Cl2 -> Cl x2
  const anions = [];
  let text = remainder;
  while (text) {
    const g = text.match(/^\(([^()]+)\)(\d*)/);
    if (g) {
      anions.push({ formula: g[1], count: g[2] ? Number(g[2]) : 1 });
      text = text.slice(g[0].length);
      continue;
    }
    const simple = text.match(/^([A-Z][a-z]?)(\d*)$/);
    if (simple) {
      anions.push({ formula: simple[1], count: simple[2] ? Number(simple[2]) : 1 });
      text = '';
      break;
    }
    anions.push({ formula: text, count: 1 });
    text = '';
  }
  return anions;
}

function splitSalt(term) {
  if (term.charge) return null;
  const formula = stripFormula(term.parts[0].body);
  if (!formula || NO_SPLIT.has(term.key) || isComplexFormula(formula)) return null;
  const suffix = suffixAnion(formula);
  let cations = null;
  let anions = null;
  if (suffix) {
    cations = suffix.cations;
    anions = suffix.anions;
  } else {
    let prefix = '';
    let rest = formula;
    while (rest) {
      const g = rest.match(/^(\(NH4\)\d*|NH4\d*)/);
      if (g) {
        prefix += g[1];
        rest = rest.slice(g[1].length);
        continue;
      }
      const token = rest.match(/^([A-Z][a-z]?)(\d*)/);
      if (!token || !METALS.has(token[1])) break;
      prefix += token[0];
      rest = rest.slice(token[0].length);
    }
    if (!prefix || !rest) return null;
    cations = cationTokens(prefix);
    if (!cations) return null;
    anions = parseAnionRemainder(rest);
  }
  if (!cations || !anions) return null;
  const expected = {};
  cations.forEach((c) => {
    if (c.el === 'NH4') { expected.N = (expected.N || 0) + c.count; expected.H = (expected.H || 0) + c.count * 4; }
    else expected[c.el] = (expected[c.el] || 0) + c.count;
  });
  anions.forEach((a) => {
    const m = SIMPLE_ION_ATOMS.get(a.formula) || parseAtoms(a.formula);
    Object.entries(m).forEach(([el, n]) => { expected[el] = (expected[el] || 0) + n * a.count; });
  });
  if (!sameAtoms(expected, term.perUnitAtoms)) return null;
  return { cations, anions };
}

function isComplexFormula(formula) {
  return formula.includes('[') || /NH3/.test(formula) || (/SCN/.test(formula) && /Fe|Ag|Cu|Zn/.test(formula));
}

function ionModel(formula, charge = 0) {
  if (formula === 'NH4') return ammoniumModel();
  if (formula === 'H') return makeModel([atom('H', 0, 0, 0)], []);
  const simple = SIMPLE_ION_ATOMS.get(formula);
  if (simple) {
    const recipe = RECIPES.get(formula);
    if (recipe) return recipe();
    return genericModel(formula, simple, charge);
  }
  const atoms = parseAtoms(formula);
  const recipe = RECIPES.get(formula);
  if (recipe) return recipe();
  return genericModel(formula, atoms, charge);
}

function saltUnitModel(split, term) {
  const cationModels = [];
  split.cations.forEach((c) => {
    for (let i = 0; i < c.count; i++) {
      cationModels.push({ model: c.el === 'NH4' ? ammoniumModel() : makeModel([atom(c.el, 0, 0, 0)], []), kind: 'cation' });
    }
  });
  const anionModels = [];
  split.anions.forEach((a) => {
    for (let i = 0; i < a.count; i++) {
      anionModels.push({ model: ionModel(a.formula), kind: 'anion' });
    }
  });
  return combineIons(cationModels, anionModels);
}

function combineIons(cationModels, anionModels) {
  const all = [];
  const cationRadius = cationModels.length ? Math.max(...cationModels.map((m) => m.model.extent)) : 0;
  const anionRadius = anionModels.length ? Math.max(...anionModels.map((m) => m.model.extent)) : 0;
  const gap = 0.3;
  const xCat = -(anionRadius + gap);
  const xAni = cationRadius + gap;
  const placeColumn = (list, x, kind) => {
    const totalH = list.reduce((sum, m) => sum + m.model.extent * 2, 0) + (list.length - 1) * 0.22;
    let y = totalH / 2;
    list.forEach((m) => {
      y -= m.model.extent;
      all.push({ model: m.model, offset: V(x, y, 0), kind });
      y -= m.model.extent + 0.22;
    });
  };
  if (cationModels.length) placeColumn(cationModels, cationModels.length === 1 ? 0 : xCat, 'cation');
  if (anionModels.length) placeColumn(anionModels, cationModels.length ? xAni : 0, 'anion');
  return mergeModels(all);
}

function organicSaltModel(term) {
  const map = term.perUnitAtoms;
  if (!map.C) return null;
  const metals = [];
  Object.keys(map).forEach((el) => {
    if (el === 'Na' || el === 'K' || el === 'Li') {
      for (let i = 0; i < map[el]; i++) metals.push(el);
    }
  });
  if (!metals.length) return null;
  const remainder = { ...map };
  metals.forEach((el) => {
    remainder[el] -= 1;
    if (remainder[el] <= 0) delete remainder[el];
  });
  let anion = null;
  if (remainder.C === 6 && remainder.O === 1 && !remainder.Na && !remainder.K) {
    anion = benzeneModel('phenoxide');
  } else if (remainder.C === 2 && remainder.O === 1) {
    anion = ethanolModel(-1);
  } else {
    const formula = Object.entries(remainder).map(([el, n]) => `${el}${n > 1 ? n : ''}`).join('');
    anion = genericModel(formula, remainder, -metals.length);
  }
  if (!sameAtoms(atomsOfModel(anion), remainder)) return null;
  const cations = metals.map((el) => ({ model: makeModel([atom(el, 0, 0, 0)], []) }));
  const merged = combineIons(cations, [{ model: anion }]);
  return sameAtoms(atomsOfModel(merged), map) ? merged : null;
}

/* ---------------- complex ions ---------------- */

function complexUnitModel(term) {
  const formula = stripFormula(term.parts[0].body).replace(/^\[|\]$/g, '');
  const map = term.perUnitAtoms;
  const centerEl = elementOrder(formula).find((el) => METALS.has(el));
  if (!centerEl) return null;
  const nh3 = map.N ? Math.min(map.N, Math.floor((map.H || 0) / 3)) : 0;
  const scn = map.S && map.C && map.N && /SCN/.test(formula) ? Math.min(map.S, map.C, map.N) : 0;
  const cl = map.Cl || 0;
  const otherHal = (map.F || 0) + (map.Br || 0) + (map.I || 0);
  const ligands = [];
  for (let i = 0; i < nh3; i++) ligands.push('NH3');
  for (let i = 0; i < scn; i++) ligands.push('SCN');
  for (let i = 0; i < cl; i++) ligands.push('Cl');
  for (let i = 0; i < otherHal; i++) ligands.push('X');
  const atoms = [atom(centerEl, 0, 0, 0)];
  const bonds = [];
  const dirs = ligands.length === 2 ? [V(1, 0, 0), V(-1, 0, 0)] : ligands.length === 4
    ? [V(1, 1, 0), V(-1, 1, 0), V(-1, -1, 0), V(1, -1, 0)].map((d) => d.normalize())
    : ligands.length === 3 ? trig : dirsFor(ligands.length);
  ligands.forEach((kind, i) => {
    const d = dirs[i] || dirsFor(ligands.length)[i];
    if (kind === 'NH3') {
      const nPos = d.clone().multiplyScalar(0.55);
      atoms.push(atom('N', nPos.x, nPos.y, nPos.z));
      const ni = atoms.length - 1;
      bonds.push(bond(0, ni));
      const perp = new THREE.Vector3().crossVectors(d, V(0, 1, 0.2)).normalize();
      const up = new THREE.Vector3().crossVectors(d, perp).normalize();
      for (let k = 0; k < 3; k++) {
        const a = k * TAU / 3;
        const hp = nPos.clone().addScaledVector(perp, Math.cos(a) * 0.28).addScaledVector(up, Math.sin(a) * 0.28).addScaledVector(d, 0.13);
        atoms.push(atom('H', hp.x, hp.y, hp.z));
        bonds.push(bond(ni, atoms.length - 1));
      }
    } else if (kind === 'SCN') {
      const nPos = d.clone().multiplyScalar(0.55);
      const cPos = d.clone().multiplyScalar(0.95);
      const sPos = d.clone().multiplyScalar(1.32);
      atoms.push(atom('N', nPos.x, nPos.y, nPos.z));
      const ni = atoms.length - 1;
      atoms.push(atom('C', cPos.x, cPos.y, cPos.z));
      const ci = atoms.length - 1;
      atoms.push(atom('S', sPos.x, sPos.y, sPos.z));
      bonds.push(bond(0, ni), bond(ni, ci, 3), bond(ci, atoms.length - 1));
    } else {
      const p = d.clone().multiplyScalar(0.65);
      atoms.push(atom(kind === 'X' ? 'Cl' : kind, p.x, p.y, p.z));
      bonds.push(bond(0, atoms.length - 1));
    }
  });
  const built = makeModel(atoms, bonds);
  return sameAtoms(atomsOfModel(built), map) ? built : null;
}

/* ---------------- recipes ---------------- */

const RECIPES = new Map();

RECIPES.set('H2', () => diatomic('H', 'H'));
RECIPES.set('O2', () => diatomic('O', 'O', 2));
RECIPES.set('N2', () => diatomic('N', 'N', 3));
RECIPES.set('F2', () => diatomic('F', 'F'));
RECIPES.set('Cl2', () => diatomic('Cl', 'Cl'));
RECIPES.set('Br2', () => diatomic('Br', 'Br'));
RECIPES.set('I2', () => diatomic('I', 'I'));
RECIPES.set('HCl', () => diatomic('H', 'Cl'));
RECIPES.set('HF', () => diatomic('H', 'F'));
RECIPES.set('HBr', () => diatomic('H', 'Br'));
RECIPES.set('HI', () => diatomic('H', 'I'));
RECIPES.set('CO', () => diatomic('C', 'O', 3));
RECIPES.set('NO', () => diatomic('N', 'O', 2));
RECIPES.set('H2O', waterModel);
RECIPES.set('H2O2', hydrogenPeroxideModel);
RECIPES.set('Na2O2', sodiumPeroxideModel);
RECIPES.set('H2S', hydrogenSulfideModel);
RECIPES.set('CO2', () => makeModel([
  atom('C', 0, 0, 0), atom('O', -B, 0, 0), atom('O', B, 0, 0),
], [bond(0, 1, 2), bond(0, 2, 2)]));
RECIPES.set('SO2', sulfurDioxideModel);
RECIPES.set('SO3', sulfurTrioxideModel);
RECIPES.set('NO2', nitriteModel);
RECIPES.set('N2O', nitrousOxideModel);
RECIPES.set('N2O4', dinitrogenTetroxideModel);
RECIPES.set('SiO2', siliconDioxideModel);
RECIPES.set('P2O5', phosphorusPentoxideModel);
RECIPES.set('NH3', ammoniaModel);
RECIPES.set('NH4', ammoniumModel);
RECIPES.set('CH4', methaneModel);
RECIPES.set('H2SO4', sulfuricModel);
RECIPES.set('H2SO3', sulfurousModel);
RECIPES.set('HNO3', nitricModel);
RECIPES.set('H3PO4', phosphoricModel);
RECIPES.set('H3PO3', phosphorousModel);
RECIPES.set('H2CO3', carbonicModel);
RECIPES.set('HClO', () => makeModel([
  atom('O', 0, 0, 0), atom('H', -0.28, 0.32, 0), atom('Cl', 0.4, 0.24, 0),
], [bond(0, 1), bond(0, 2)]));
RECIPES.set('CO3', carbonateModel);
RECIPES.set('HCO3', bicarbonateModel);
RECIPES.set('NO3', nitrateModel);
RECIPES.set('NO2', nitriteModel);
RECIPES.set('SO4', sulfateModel);
RECIPES.set('HSO4', hydrogenSulfateModel);
RECIPES.set('SO3', sulfurTrioxideModel);
RECIPES.set('HSO3', hydrogenSulfiteModel);
RECIPES.set('PO4', () => phosphateIonModel(0));
RECIPES.set('HPO4', () => phosphateIonModel(1));
RECIPES.set('H2PO4', () => phosphateIonModel(2));
RECIPES.set('MnO4', permanganateModel);
RECIPES.set('FeO4', ferrateModel);
RECIPES.set('CrO4', chromateModel);
RECIPES.set('Cr2O7', dichromateModel);
RECIPES.set('ClO', hypochloriteModel);
RECIPES.set('ClO3', chlorateModel);
RECIPES.set('ClO4', perchlorateModel);
RECIPES.set('SiO3', silicateModel);
RECIPES.set('AlO2', aluminateModel);
RECIPES.set('S2O3', thiosulfateModel);
RECIPES.set('S4O6', tetrathionateModel);
RECIPES.set('SCN', thiocyanateModel);
RECIPES.set('MnO(OH)', manganeseOxyHydroxideModel);
RECIPES.set('OH', () => diatomic('O', 'H'));
RECIPES.set('PCl3', phosphorusTrichlorideModel);
RECIPES.set('PCl5', phosphorusPentachlorideModel);
RECIPES.set('SiCl4', () => tetrahalideModel('Si', 'Cl'));
RECIPES.set('SiF4', () => tetrahalideModel('Si', 'F'));
RECIPES.set('TiCl4', () => tetrahalideModel('Ti', 'Cl'));
RECIPES.set('SiO2', siliconDioxideModel);
RECIPES.set('C6H6', () => benzeneModel('benzene'));
RECIPES.set('C6H5OH', () => benzeneModel('phenol'));
RECIPES.set('C6H5O', () => benzeneModel('phenoxide'));
RECIPES.set('CH3CH2OH', () => ethanolModel(0));
RECIPES.set('C2H5OH', () => ethanolModel(0));
RECIPES.set('C2H5O', () => ethanolModel(-1));
RECIPES.set('C12H22O11', sucroseModel);

/* ---------------- info / legend / steps ---------------- */

function atomCountText(n) {
  return `${n} 个原子`;
}

export function moleculeInfo(demo) {
  const a = analyzeEquation(demo.eq);
  const ordered = a.elementTotals.filter((row) => row.left > 0 || row.right > 0);
  const elements = ordered.map((row) => {
    const style = elementStyle(row.el);
    return {
      el: row.el,
      name: style.name,
      count: row.left,
      color: `#${style.color.toString(16).padStart(6, '0')}`,
    };
  });
  const ionic = a.source === 'ionic';
  const noteBits = [];
  if (ionic) noteBits.push('粒子按离子方程式排布，旁观离子已略去');
  else if (a.eq.ion) noteBits.push('粒子按完整化学方程式展开，保留全部系数');
  else noteBits.push('粒子按化学方程式展开');
  if (a.electron.active && a.electron.pairs.length) {
    noteBits.push(`电子转移：${a.electron.pairs.slice(0, 2).map((p) => `${p.el}${p.from > p.to ? '失电子' : '得电子'}`).join('、')}`);
  }
  const cond = a.condLabel || '常温';
  const steps = [
    {
      title: '投料 · 按系数排布',
      desc: `反应物 ${a.left.length} 种粒子，共 ${atomCountText(a.atomCountLeft)}；系数决定每种粒子的份数。`,
    },
    {
      title: `活化 · ${cond}`,
      desc: a.electron.active
        ? '粒子获得活化能，电子发生转移，旧键开始松动。'
        : ionic
          ? '离子在反应区靠静电作用相遇，溶剂化层被剥离。'
          : '粒子吸收能量，旧化学键断裂或明显伸长。',
    },
    {
      title: '重组 · 原子迁移',
      desc: '同种原子逐一配对并穿过反应区，原子种类与数量保持不变。',
    },
    {
      title: '成键 · 产物生成',
      desc: `生成 ${a.right.length} 种粒子，共 ${atomCountText(a.atomCountRight)}；新键形成。`,
    },
  ];
  return {
    analysis: a,
    elements,
    steps,
    note: noteBits.join('；'),
    sourceLabel: ionic ? '离子方程式视角' : '化学方程式视角',
    particleEquation: `${a.leftText} ${a.arrow} ${a.rightText}`,
    condLabel: cond,
    balanced: a.balance.ok,
  };
}

/* ---------------- Three.js show ---------------- */

function makeSoftTexture(inner = 'rgba(255,255,255,.9)', outer = 'rgba(255,255,255,0)') {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.45, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeRingTexture() {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.25, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,255,255,.9)');
  g.addColorStop(0.68, 'rgba(255,255,255,.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeParticleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.28, 'rgba(255,255,255,.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function copyOffsets(n) {
  if (n <= 1) return [V()];
  const layers = n <= 6 ? 1 : 2;
  const perLayer = Math.ceil(n / layers);
  const cols = Math.ceil(Math.sqrt(perLayer));
  const rows = Math.ceil(perLayer / cols);
  const spacing = n > 8 ? 0.92 : 0.98;
  const out = [];
  for (let i = 0; i < n; i++) {
    const layer = layers === 1 ? 0 : Math.floor(i / perLayer);
    const index = layers === 1 ? i : i % perLayer;
    const col = index % cols;
    const row = Math.floor(index / cols);
    out.push(V(
      (col - (cols - 1) / 2) * spacing,
      ((rows - 1) / 2 - row) * spacing,
      layers === 1 ? 0 : (layer - (layers - 1) / 2) * 0.65,
    ));
  }
  return out;
}

function hashColor(charge) {
  return charge > 0 ? 0xffb066 : charge < 0 ? 0x7fe3ff : 0x9fd8ff;
}

function elementMaterial(el) {
  const style = elementStyle(el);
  const color = new THREE.Color(style.color);
  return new THREE.MeshStandardMaterial({
    color: style.color,
    roughness: 0.34,
    metalness: 0.18,
    emissive: color.clone().multiplyScalar(0.12),
    emissiveIntensity: 0.5,
  });
}

export function buildMoleculeShow(demo) {
  const info = moleculeInfo(demo);
  const a = info.analysis;
  const phaseStarts = [0, 1.2, 2.4, 6.3];
  const duration = 9.6;
  const group = new THREE.Group();
  group.name = 'molecule-show';
  const atomLayer = new THREE.Group();
  const bondLayer = new THREE.Group();
  const labelLayer = new THREE.Group();
  const effectLayer = new THREE.Group();
  const stageLayer = new THREE.Group();
  atomLayer.name = 'mol-atoms';
  bondLayer.name = 'mol-bonds';
  labelLayer.name = 'mol-labels';
  effectLayer.name = 'mol-effects';
  stageLayer.name = 'mol-stage';
  group.add(stageLayer, bondLayer, atomLayer, effectLayer, labelLayer);

  const disposables = new Set();
  const labelObjects = [];
  const textures = {
    soft: makeSoftTexture('rgba(255,255,255,.95)', 'rgba(255,255,255,0)'),
    spark: makeSoftTexture('rgba(255,240,190,1)', 'rgba(255,150,60,0)'),
    bubble: makeRingTexture(),
    smoke: makeSoftTexture('rgba(255,255,255,.5)', 'rgba(255,255,255,0)'),
  };
  Object.values(textures).forEach((tex) => disposables.add(tex));

  const sphereGeo = new THREE.SphereGeometry(1, 18, 14);
  const bondGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  const haloGeo = new THREE.SphereGeometry(1, 16, 12);
  const ringGeo = new THREE.TorusGeometry(1, 0.012, 6, 80);
  [sphereGeo, bondGeo, haloGeo, ringGeo].forEach((geo) => disposables.add(geo));

  const atomMats = new Map();
  const getAtomMat = (el) => {
    if (!atomMats.has(el)) {
      const mat = elementMaterial(el);
      atomMats.set(el, mat);
      disposables.add(mat);
    }
    return atomMats.get(el);
  };
  const bondMats = {
    left: [1, 2, 3].map((order) => {
      const mat = new THREE.MeshStandardMaterial({
        color: order === 3 ? 0xffd28a : order === 2 ? 0xc7e9f5 : 0xa9c8d6,
        roughness: 0.32,
        metalness: 0.28,
        transparent: true,
        opacity: 1,
        emissive: 0x6fbdd6,
        emissiveIntensity: 0.18,
      });
      disposables.add(mat);
      return mat;
    }),
    right: [1, 2, 3].map((order) => {
      const mat = new THREE.MeshStandardMaterial({
        color: order === 3 ? 0xffe0a3 : order === 2 ? 0xd6f7ff : 0xc4e6ee,
        roughness: 0.3,
        metalness: 0.25,
        transparent: true,
        opacity: 0,
        emissive: 0x8adfc8,
        emissiveIntensity: 0.24,
      });
      disposables.add(mat);
      return mat;
    }),
  };
  const track = (obj) => {
    if (obj.geometry) disposables.add(obj.geometry);
    if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => disposables.add(m));
    return obj;
  };

  /* ----- stage ----- */
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(5.2, 96),
    new THREE.MeshStandardMaterial({ color: 0x0a1822, roughness: 0.82, metalness: 0.25 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  track(floor);
  stageLayer.add(floor);

  const floorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(4.9, 96),
    new THREE.MeshBasicMaterial({
      map: textures.soft, color: 0x1c4556, transparent: true, opacity: 0.42,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = -0.03;
  stageLayer.add(floorGlow);

  [4.3, 3.5, 2.2].forEach((r, i) => {
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: i === 0 ? 0x4fb6d8 : 0x2c6d84, transparent: true, opacity: i === 0 ? 0.45 : 0.24,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    ring.rotation.x = Math.PI / 2;
    ring.scale.setScalar(r);
    ring.position.y = 0.005 + i * 0.001;
    track(ring);
    stageLayer.add(ring);
  });

  const padMatLeft = new THREE.MeshBasicMaterial({
    map: textures.soft, color: 0x3a9fbe, transparent: true, opacity: 0.22,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const padMatRight = new THREE.MeshBasicMaterial({
    map: textures.soft, color: 0x6fd6a8, transparent: true, opacity: 0.15,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  [padMatLeft, padMatRight].forEach((mat) => disposables.add(mat));
  const padLeft = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.2), padMatLeft);
  padLeft.rotation.x = -Math.PI / 2;
  padLeft.position.set(-2.55, 0.01, 0.2);
  stageLayer.add(padLeft);
  const padRight = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.2), padMatRight);
  padRight.rotation.x = -Math.PI / 2;
  padRight.position.set(2.55, 0.01, 0.2);
  stageLayer.add(padRight);

  const gate = new THREE.Group();
  gate.position.set(0, 1.72, 0);
  gate.rotation.y = -0.5;
  const gateRing = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.018, 8, 120), new THREE.MeshBasicMaterial({
    color: 0x8fe6ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  gateRing.rotation.y = Math.PI / 2;
  track(gateRing);
  gate.add(gateRing);
  const gateRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.008, 8, 120), new THREE.MeshBasicMaterial({
    color: 0x67b9ff, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  gateRing2.rotation.y = Math.PI / 2;
  track(gateRing2);
  gate.add(gateRing2);
  const gateMembrane = new THREE.Mesh(
    new THREE.CircleGeometry(1, 72),
    new THREE.MeshBasicMaterial({
      map: textures.soft, color: 0x6fdcff, transparent: true, opacity: 0.08,
      depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }),
  );
  gateMembrane.rotation.y = Math.PI / 2;
  track(gateMembrane);
  gate.add(gateMembrane);
  const gateGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.soft, color: 0x7fdcff, transparent: true, opacity: 0.18,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  gateGlow.scale.setScalar(2.6);
  disposables.add(gateGlow.material);
  gate.add(gateGlow);
  const gateLight = new THREE.PointLight(0x74d8ff, 3.2, 5.2, 2);
  gate.add(gateLight);
  stageLayer.add(gate);

  for (let i = 0; i < 80; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textures.spark, color: i % 3 ? 0x7fd8ff : 0xc4a6ff, transparent: true,
      opacity: rand(0.08, 0.34), depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    sprite.position.set(rand(-4.4, 4.4), rand(0.2, 4.4), rand(-2.4, 2.4));
    sprite.scale.setScalar(rand(0.018, 0.055));
    disposables.add(sprite.material);
    stageLayer.add(sprite);
  }

  /* ----- term preparation ----- */
  const leftTerms = a.left.map((term) => prepareTerm(term));
  const rightTerms = a.right.map((term) => prepareTerm(term));

  function prepareTerm(term) {
    if (term.isElectron) {
      return { term, electron: true, radius: 0.34, atoms: [], bonds: [], modelScale: 1, copies: term.coefficient };
    }
    let unit = buildTermModel(term);
    let modelScale = clamp(0.66 / Math.max(unit.extent, 0.28), 0.62, 1.25);
    let copyScale = term.coefficient > 6 ? 0.72 : term.coefficient > 3 ? 0.86 : 1;
    const offsets = copyOffsets(term.coefficient);
    const atoms = [];
    const bonds = [];
    offsets.forEach((offset, ci) => {
      const base = atoms.length;
      unit.atoms.forEach((atomDef) => {
        atoms.push({
          el: atomDef.el,
          p: offset.clone().addScaledVector(atomDef.p, modelScale * copyScale),
          copy: ci,
        });
      });
      unit.bonds.forEach(([i, j, order]) => bonds.push([base + i, base + j, order]));
    });
    const maxOffset = offsets.reduce((max, o) => Math.max(max, o.length()), 0);
    const moleculeRadius = unit.extent * modelScale * copyScale;
    return {
      term,
      electron: false,
      unit,
      atoms,
      bonds,
      copies: term.coefficient,
      modelScale,
      copyScale,
      scaleFactor: modelScale * copyScale,
      radius: maxOffset + moleculeRadius + 0.18,
      moleculeRadius,
    };
  }

  function buildTermModel(term) {
    const expected = term.perUnitAtoms;
    let model = null;
    if (isComplexFormula(term.display) || isComplexFormula(stripFormula(term.parts[0].body))) {
      model = complexUnitModel(term);
    }
    if (!model && term.parts.length > 1) {
      model = hydrateModel(term);
    }
    if (!model && term.parts.length === 1) {
      const key = term.key;
      if (RECIPES.has(key)) model = RECIPES.get(key)();
      if (!model) model = organicSaltModel(term);
      if (!model) {
        const salt = splitSalt(term);
        if (salt) model = saltUnitModel(salt, term);
      }
      if (!model && isOrganic(term)) model = organicModel(term);
      if (!model && Object.keys(term.perUnitAtoms).length === 1) {
        const el = Object.keys(term.perUnitAtoms)[0];
        model = makeModel([atom(el, 0, 0, 0)], []);
      }
      if (!model) model = genericModel(term.parts[0].body, term.perUnitAtoms, term.charge);
    }
    if (!model) model = genericModel(term.parts[0].body, term.perUnitAtoms, term.charge);
    if (!sameAtoms(atomsOfModel(model), expected)) model = cloudModel(expected, term.charge);
    return model;
  }

  function hydrateModel(term) {
    const parts = term.parts;
    const main = parts[0];
    const mainAtoms = {};
    Object.entries(main.atoms).forEach(([el, n]) => { mainAtoms[el] = (mainAtoms[el] || 0) + n; });
    let mainModel = RECIPES.has(main.body)
      ? RECIPES.get(main.body)()
      : (() => {
        const fake = {
          ...term,
          parts: [{ body: main.body, atoms: mainAtoms, mult: main.mult }],
          perUnitAtoms: mainAtoms,
          key: main.body,
          display: main.body,
          charge: term.charge,
        };
        const salt = splitSalt(fake);
        return salt ? saltUnitModel(salt, fake) : genericModel(main.body, mainAtoms, term.charge);
      })();
    const entries = [{ model: mainModel, offset: V() }];
    const waters = [];
    parts.slice(1).forEach((part) => {
      const count = part.repeat || part.mult || 1;
      for (let i = 0; i < count; i++) waters.push(i);
    });
    const ring = waters.length > 4 ? 1.15 : 0.82;
    waters.forEach((_, i) => {
      const ang = -Math.PI / 2 + (i / Math.max(1, waters.length)) * TAU;
      const r = ring + (i % 2) * 0.16;
      entries.push({
        model: waterModel(),
        offset: V(Math.cos(ang) * r, Math.sin(ang) * r * 0.75, Math.sin(ang * 2) * 0.22),
      });
    });
    const extra = {};
    parts.slice(1).forEach((part) => {
      const count = part.repeat || part.mult || 1;
      Object.entries(parseAtoms(part.body)).forEach(([el, n]) => { extra[el] = (extra[el] || 0) + n * count; });
    });
    const expected = {};
    Object.entries(mainAtoms).forEach(([el, n]) => { expected[el] = (expected[el] || 0) + n; });
    Object.entries(extra).forEach(([el, n]) => { expected[el] = (expected[el] || 0) + n; });
    const merged = mergeModels(entries);
    return sameAtoms(atomsOfModel(merged), expected) ? merged : null;
  }

  function isOrganic(term) {
    const map = term.perUnitAtoms;
    return !!map.C && map.C >= 2 && !!map.H && !splitSalt(term);
  }

  function organicModel(term) {
    const key = term.key;
    if (RECIPES.has(key)) return RECIPES.get(key)();
    const map = term.perUnitAtoms;
    if (map.C === 6 && map.O === 1) return benzeneModel(map.H >= 6 ? 'phenol' : 'phenoxide');
    if (map.C === 2 && map.O === 1) return ethanolModel(term.charge >= 0 ? 0 : -1);
    if (map.C === 12 && map.O === 11) return sucroseModel();
    return genericModel(term.parts[0].body, map, term.charge);
  }

  /* ----- layouts ----- */
  const leftLayout = layoutSide(leftTerms, -1);
  const rightLayout = layoutSide(rightTerms, 1);

  function layoutSide(terms, dir) {
    const items = terms.map((t, original) => ({ t, original, r: t.radius }));
    const W = 3.35;
    const H = 3.2;
    let best = null;
    for (let cols = 1; cols <= Math.min(3, Math.max(1, items.length)); cols++) {
      const columns = Array.from({ length: cols }, () => ({ items: [], height: 0, width: 0 }));
      items.forEach((item, i) => {
        const target = cols === 1 ? columns[0] : columns.reduce((min, c) => (c.height < min.height ? c : min), columns[0]);
        target.items.push(item);
        target.height += item.r * 2 + 0.18;
        target.width = Math.max(target.width, item.r * 2);
      });
      const width = columns.reduce((s, c) => s + c.width, 0) + (cols - 1) * 0.16;
      const height = Math.max(...columns.map((c) => c.height), 0.1);
      const scale = Math.min(1, (W - 0.12) / width, (H - 0.12) / height);
      if (!best || scale > best.scale + 1e-4) best = { cols, columns, width, height, scale };
    }
    const sideScale = clamp(best.scale, 0.48, 1);
    const gap = 0.16 * sideScale;
    const totalWidth = best.width * sideScale;
    let cursor = -totalWidth / 2;
    const xCenter = dir * 2.5;
    const centerY = 1.72;
    best.columns.forEach((col) => {
      const colWidth = col.width * sideScale;
      const cx = cursor + colWidth / 2;
      let y = centerY + (col.height * sideScale) / 2;
      col.items.forEach((item) => {
        const r = item.r * sideScale;
        y -= r;
        item.center = V(xCenter + cx, y, 0);
        item.radius = r;
        y -= r + 0.18 * sideScale;
      });
      cursor += colWidth + gap;
    });
    const atomList = [];
    const bondList = [];
    const termList = [];
    const electronList = [];
    best.columns.forEach((col) => {
      col.items.forEach((item) => {
        const t = item.t;
        if (t.electron) {
          electronList.push({ term: t.term, center: item.center.clone(), side: dir, count: t.copies });
          termList.push({ term: t.term, center: item.center.clone(), side: dir, electron: true, radius: item.radius });
          return;
        }
        t.atoms.forEach((atomDef, index) => {
          atomList.push({
            el: atomDef.el,
            pos: item.center.clone().addScaledVector(atomDef.p, sideScale),
            term: t.term,
            copy: atomDef.copy,
            index,
            side: dir,
            scale: t.scaleFactor * sideScale,
            termCenter: item.center.clone(),
          });
        });
        t.bonds.forEach(([i, j, order]) => {
          bondList.push({
            a: item.center.clone().addScaledVector(t.atoms[i].p, sideScale),
            b: item.center.clone().addScaledVector(t.atoms[j].p, sideScale),
            order,
            side: dir,
            thickness: clamp(0.033 * t.scaleFactor * sideScale, 0.016, 0.04),
          });
        });
        termList.push({
          term: t.term,
          center: item.center.clone(),
          side: dir,
          radius: item.radius,
          moleculeRadius: t.moleculeRadius * sideScale,
          electron: false,
        });
      });
    });
    return { atomList, bondList, termList, electronList, sideScale };
  }

  /* ----- pair atoms ----- */
  const leftAtoms = leftLayout.atomList;
  const rightAtoms = rightLayout.atomList;
  const pairs = new Map();
  const byEl = (list) => {
    const map = new Map();
    list.forEach((atomDef) => {
      if (!map.has(atomDef.el)) map.set(atomDef.el, []);
      map.get(atomDef.el).push(atomDef);
    });
    return map;
  };
  const rightByEl = byEl(rightAtoms);
  const leftByEl = byEl(leftAtoms);
  rightByEl.forEach((list, el) => {
    const candidates = (leftByEl.get(el) || []).slice();
    const used = new Set();
    list.forEach((target) => {
      let best = null;
      let bestDist = Infinity;
      candidates.forEach((cand) => {
        if (used.has(cand)) return;
        const d = cand.pos.distanceToSquared(target.pos);
        if (d < bestDist) {
          bestDist = d;
          best = cand;
        }
      });
      if (best) {
        used.add(best);
        pairs.set(best, target);
      }
    });
  });

  /* ----- create atoms ----- */
  const atomObjects = [];
  leftAtoms.forEach((atomDef, index) => {
    const style = elementStyle(atomDef.el);
    const node = new THREE.Group();
    const mesh = new THREE.Mesh(sphereGeo, getAtomMat(atomDef.el));
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    node.add(mesh);
    const target = pairs.get(atomDef);
    const charged = atomDef.term.charge && Object.keys(atomDef.term.perUnitAtoms).length === 1;
    if (charged) {
      const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({
        color: hashColor(atomDef.term.charge),
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      halo.scale.setScalar(2.05);
      disposables.add(halo.material);
      node.add(halo);
    }
    node.position.copy(atomDef.pos);
    node.scale.setScalar(0.001);
    atomLayer.add(node);
    const radius = style.radius * 0.78 * (atomDef.scale || 1);
    atomObjects.push({
      node,
      atom: atomDef,
      target: target ? target.pos.clone() : atomDef.pos.clone().add(V(rand(-0.4, 0.4), 0.6, 0)),
      targetDef: target || null,
      radius,
      targetRadius: target ? style.radius * 0.78 * (target.scale || 1) : radius,
      seed: rand(0, TAU),
      delay: index / Math.max(1, leftAtoms.length),
      targetSeed: target ? rand(0, TAU) : 0,
    });
  });

  /* ----- bonds ----- */
  const leftBondGroup = new THREE.Group();
  const rightBondGroup = new THREE.Group();
  bondLayer.add(leftBondGroup, rightBondGroup);
  const buildBonds = (list, target) => {
    list.forEach((b) => {
      const p1 = b.a;
      const p2 = b.b;
      const dir = p2.clone().sub(p1);
      const len = dir.length();
      if (len < 0.01) return;
      const thickness = b.thickness || 0.033;
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const quat = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
      const spread = clamp(thickness / 0.033, 0.6, 1.15);
      const offsets = b.order === 1 ? [0] : b.order === 2 ? [-0.035, 0.035] : [-0.058, 0, 0.058];
      const perp = V(1, 0, 0).cross(dir.clone().normalize());
      if (perp.lengthSq() < 0.01) perp.set(0, 0, 1);
      perp.normalize();
      offsets.forEach((off) => {
        const mesh = new THREE.Mesh(bondGeo, bondMats[target ? 'right' : 'left'][b.order - 1]);
        mesh.position.copy(mid).addScaledVector(perp, off * spread);
        mesh.quaternion.copy(quat);
        mesh.scale.set(thickness, len, thickness);
        (target ? rightBondGroup : leftBondGroup).add(mesh);
      });
    });
  };
  buildBonds(leftLayout.bondList, false);
  buildBonds(rightLayout.bondList, true);

  /* ----- labels ----- */
  function makeLabel(className, html = '') {
    const div = document.createElement('div');
    div.className = `mol-label ${className}`;
    div.innerHTML = html;
    const obj = new CSS2DObject(div);
    labelObjects.push(obj);
    labelLayer.add(obj);
    return { obj, div };
  }
  const leftLabels = [];
  const rightLabels = [];
  leftTerms.forEach((t) => {
    if (t.electron) {
      const label = makeLabel('mol-tag is-reactant', `<b>${t.term.coefficient > 1 ? t.term.coefficient : ''}e⁻</b><span>电子</span>`);
      const center = leftLayout.termList.find((x) => x.term === t.term)?.center || V(-2.5, 2, 0);
      label.obj.position.copy(center).add(V(0, 0.2, 0.2));
      leftLabels.push({ ...label, term: t.term, center });
      return;
    }
    const layoutTerm = leftLayout.termList.find((x) => x.term === t.term);
    if (!layoutTerm) return;
    const text = t.term.coefficient > 1 ? `${t.term.coefficient}${t.term.display}` : t.term.display;
    const sub = t.term.charge !== 0 && Object.keys(t.term.perUnitAtoms).length === 1
      ? `${t.term.atomCount} 个离子`
      : `${t.term.atomCount} 原子`;
    const label = makeLabel('mol-tag is-reactant', `<b></b><span></span>`);
    label.div.querySelector('b').textContent = text;
    label.div.querySelector('span').textContent = sub;
    label.obj.position.copy(layoutTerm.center).add(V(0, -layoutTerm.radius - 0.08, 0.25));
    leftLabels.push({ ...label, term: t.term, center: layoutTerm.center });
  });
  rightTerms.forEach((t) => {
    if (t.electron) {
      const label = makeLabel('mol-tag is-product is-hidden', `<b>${t.term.coefficient > 1 ? t.term.coefficient : ''}e⁻</b><span>电子</span>`);
      const center = rightLayout.termList.find((x) => x.term === t.term)?.center || V(2.5, 2, 0);
      label.obj.position.copy(center).add(V(0, 0.2, 0.2));
      rightLabels.push({ ...label, term: t.term, center });
      return;
    }
    const layoutTerm = rightLayout.termList.find((x) => x.term === t.term);
    if (!layoutTerm) return;
    const text = t.term.coefficient > 1 ? `${t.term.coefficient}${t.term.display}` : t.term.display;
    const sub = t.term.charge !== 0 && Object.keys(t.term.perUnitAtoms).length === 1
      ? `${t.term.atomCount} 个离子`
      : `${t.term.atomCount} 原子`;
    const label = makeLabel('mol-tag is-product is-hidden', `<b></b><span></span>`);
    label.div.querySelector('b').textContent = text;
    label.div.querySelector('span').textContent = sub;
    label.obj.position.copy(layoutTerm.center).add(V(0, -layoutTerm.radius - 0.08, 0.25));
    rightLabels.push({ ...label, term: t.term, center: layoutTerm.center });
  });

  const captionLeft = makeLabel('mol-caption is-left', '<i></i>反应物 · 按系数排布');
  captionLeft.obj.position.set(-2.55, 0.16, 1.35);
  const captionRight = makeLabel('mol-caption is-right', '<i></i>生成物 · 原子守恒');
  captionRight.obj.position.set(2.55, 0.16, 1.35);
  captionRight.div.classList.add('is-hidden');
  const condLabel = makeLabel('mol-cond', '<b></b><span></span>');
  condLabel.obj.position.set(0, 4.02, 0.2);

  /* ----- electron terms ----- */
  const electronParticles = [];
  const electronTerms = [
    ...leftLayout.electronList.map((e) => ({ ...e, paired: true })),
    ...rightLayout.electronList.map((e) => ({ ...e, paired: false })),
  ];
  let electronTarget = null;
  const rightElectron = rightLayout.electronList[0];
  const leftElectron = leftLayout.electronList[0];
  const firstRightTerm = rightLayout.termList.find((x) => !x.electron);
  const gateCenter = V(0, 1.7, 0);
  if (rightElectron) electronTarget = rightElectron.center;
  else if (firstRightTerm) electronTarget = firstRightTerm.center;
  else electronTarget = gateCenter;
  leftLayout.electronList.forEach((term, i) => {
    for (let k = 0; k < Math.min(term.count, 6); k++) {
      const mat = new THREE.SpriteMaterial({
        map: textures.soft, color: 0x8fe8ff, transparent: true, opacity: 0.85,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.setScalar(0.16);
      const start = term.center.clone().add(V(rand(-0.22, 0.22), rand(-0.2, 0.2), rand(-0.15, 0.15)));
      sprite.position.copy(start);
      effectLayer.add(sprite);
      disposables.add(mat);
      electronParticles.push({
        sprite,
        start,
        end: electronTarget ? electronTarget.clone().add(V(rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.2, 0.2))) : start,
        delay: k * 0.08 + i * 0.12,
        seed: rand(0, TAU),
      });
    }
  });
  rightLayout.electronList.forEach((term) => {
    if (!leftElectron) {
      for (let k = 0; k < Math.min(term.count, 6); k++) {
        const mat = new THREE.SpriteMaterial({
          map: textures.soft, color: 0x8fe8ff, transparent: true, opacity: 0.85,
          depthWrite: false, blending: THREE.AdditiveBlending,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.setScalar(0.16);
        const end = term.center.clone().add(V(rand(-0.22, 0.22), rand(-0.2, 0.2), rand(-0.15, 0.15)));
        const start = gateCenter.clone().add(V(rand(-0.18, 0.18), rand(-0.18, 0.18), rand(-0.12, 0.12)));
        sprite.position.copy(start);
        effectLayer.add(sprite);
        disposables.add(mat);
        electronParticles.push({ sprite, start, end, delay: k * 0.08, seed: rand(0, TAU) });
      }
    }
  });

  /* ----- effects ----- */
  const sprites = [];
  const effectMats = [];
  for (let i = 0; i < 120; i++) {
    const mat = new THREE.SpriteMaterial({
      map: textures.soft, color: 0xffffff, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.visible = false;
    effectLayer.add(sprite);
    disposables.add(mat);
    effectMats.push(mat);
    sprites.push({ sprite, mat, life: 0, max: 1, vel: V(), gravity: 0, startScale: 0.1, endScale: 0.2, settle: null });
  }
  let spriteCursor = 0;
  function spawn(type, pos, color, opts = {}) {
    const item = sprites.find((s) => s.life <= 0) || sprites[spriteCursor++ % sprites.length];
    item.life = opts.life ?? 1.2;
    item.max = item.life;
    item.gravity = opts.gravity ?? 0;
    item.vel.copy(opts.vel || V(0, 0.2, 0));
    item.startScale = opts.startScale ?? 0.08;
    item.endScale = opts.endScale ?? 0.16;
    item.settle = opts.settle ?? null;
    item.sprite.position.copy(pos);
    item.mat.map = textures[type] || textures.soft;
    item.mat.color.set(color);
    item.mat.blending = type === 'spark' ? THREE.AdditiveBlending : THREE.NormalBlending;
    item.mat.opacity = opts.opacity ?? 0.7;
    item.sprite.scale.setScalar(item.startScale);
    item.sprite.visible = true;
    return item;
  }
  function spawnBurst(pos, color, n = 6, speed = 0.9) {
    for (let i = 0; i < n; i++) {
      const d = V(rand(-1, 1), rand(-0.3, 1), rand(-1, 1)).normalize();
      spawn('spark', pos, color, {
        vel: d.multiplyScalar(rand(0.4, speed)), gravity: -0.35,
        life: rand(0.45, 0.9), startScale: 0.03, endScale: 0.09,
      });
    }
  }
  function clearEffects() {
    sprites.forEach((s) => { s.life = 0; s.sprite.visible = false; s.mat.opacity = 0; });
  }

  const state = {
    lastPhase: -1,
    sparkAcc: 0,
    gasAcc: 0,
    pptAcc: 0,
    smokeAcc: 0,
    bubbles: 0,
    cond: '',
  };

  function productCenters() {
    return rightLayout.termList.filter((t) => !t.electron && t.center.x > 0).map((t) => t.center);
  }
  const productCenterList = productCenters();

  function updateLabelClasses(t, phase) {
    const reactFade = smooth((t - 2.35) / 0.45);
    leftLabels.forEach((label) => {
      label.div.style.opacity = String(clamp(1 - reactFade, 0, 1));
      label.div.classList.toggle('is-hidden', reactFade > 0.98);
    });
    const productK = smooth((t - 5.35) / 0.8);
    rightLabels.forEach((label) => {
      label.div.style.opacity = String(productK);
      label.div.classList.toggle('is-hidden', productK < 0.02);
    });
    const captionFade = clamp(1 - smooth((t - 4.75) / 0.8), 0, 1);
    captionLeft.div.style.opacity = String(captionFade);
    captionLeft.div.classList.toggle('is-hidden', captionFade < 0.02);
    captionRight.div.style.opacity = String(productK);
    captionRight.div.classList.toggle('is-hidden', productK < 0.02);
  }

  function setCond(phase) {
    let title = '';
    let sub = '';
    if (phase === 0) {
      title = '投料';
      sub = `按系数排布 · ${a.left.length} 种粒子`;
    } else if (phase === 1) {
      title = info.condLabel;
      sub = a.electron.active ? '电子转移 · 旧键活化' : a.source === 'ionic' ? '离子相遇 · 静电作用' : '吸收能量 · 旧键松动';
    } else if (phase === 2) {
      title = '原子重组';
      sub = '旧键断裂 · 新键形成';
    } else {
      title = '产物生成';
      sub = `${a.right.length} 种粒子 · ${a.atomCountRight} 原子`;
    }
    const key = `${title}|${sub}`;
    if (key === state.cond) return;
    state.cond = key;
    condLabel.div.querySelector('b').textContent = title;
    condLabel.div.querySelector('span').textContent = sub;
    condLabel.div.classList.remove('is-pop');
    void condLabel.div.offsetWidth;
    condLabel.div.classList.add('is-pop');
  }

  function reset() {
    clearEffects();
    state.lastPhase = -1;
    state.sparkAcc = 0;
    state.gasAcc = 0;
    state.pptAcc = 0;
    state.smokeAcc = 0;
    state.cond = '';
    atomObjects.forEach((obj) => {
      obj.node.position.copy(obj.atom.pos);
      obj.node.scale.setScalar(0.001);
    });
    leftLabels.forEach((label) => {
      label.div.style.opacity = '1';
      label.div.classList.remove('is-hidden');
    });
    rightLabels.forEach((label) => {
      label.div.style.opacity = '0';
      label.div.classList.add('is-hidden');
    });
    captionRight.div.style.opacity = '0';
    captionRight.div.classList.add('is-hidden');
    bondMats.left.forEach((m) => { m.opacity = 1; });
    bondMats.right.forEach((m) => { m.opacity = 0; });
    rightBondGroup.children.forEach((child) => { child.visible = true; });
    electronParticles.forEach((p) => { p.sprite.visible = false; });
    gate.scale.setScalar(1);
    gateLight.intensity = 3.2;
  }

  function update(t, intensity = 1, dt = 0.016) {
    const phase = t < phaseStarts[1] ? 0 : t < phaseStarts[2] ? 1 : t < phaseStarts[3] ? 2 : 3;
    if (phase !== state.lastPhase) {
      state.lastPhase = phase;
      if (phase === 2) {
        spawnBurst(V(0, 1.7, 0), 0x9fe8ff, 14, 1.3);
        gateLight.intensity = 6;
      }
      if (phase === 3) spawnBurst(V(2.5, 1.8, 0.2), 0x8fe6b8, 10, 0.8);
      setCond(phase);
    }
    const appear = smooth(t / 0.6);
    const jitter = phase === 1 ? smooth((t - phaseStarts[1]) / 0.35) : 0;
    const reactStart = phaseStarts[2];
    const reactEnd = phaseStarts[3];
    const breakK = smooth((t - reactStart) / 0.42);
    const formK = smooth((t - 5.15) / 0.95);
    const settle = smooth((t - reactEnd) / 0.9);

    const appearBond = smooth(t / 0.6);
    bondMats.left.forEach((m) => { m.opacity = (1 - breakK) * appearBond; });
    bondMats.right.forEach((m) => { m.opacity = formK; });
    leftBondGroup.visible = breakK < 0.99;
    rightBondGroup.visible = formK > 0.01;

    atomObjects.forEach((obj) => {
      const d = obj.delay;
      const appearK = clamp(smooth((t - d * 0.35) / 0.55), 0, 1);
      if (t < reactStart) {
        obj.node.scale.setScalar(Math.max(0.001, obj.radius * appearK));
        const start = obj.atom.pos;
        const bob = Math.sin(t * 1.1 + obj.seed) * 0.018;
        const shakeX = jitter * Math.sin(t * 22 + obj.seed) * 0.035;
        const shakeY = jitter * Math.cos(t * 19 + obj.seed * 1.7) * 0.035;
        obj.node.position.set(start.x + shakeX, start.y + bob + shakeY, start.z + Math.cos(t * 0.9 + obj.seed) * 0.012);
        return;
      }
      if (t < reactEnd) {
        const stagger = d * 1.0;
        const k = smooth((t - reactStart - 0.18 - stagger) / 2.0);
        const start = obj.atom.pos;
        const target = obj.target;
        const c1 = start.clone().add(V(lerp(start.x, 0, 0.55) - start.x, 0.5 + Math.sin(obj.seed) * 0.3, rand(-0.15, 0.15)));
        const c2 = target.clone().add(V(lerp(target.x, 0, 0.55) - target.x, 0.55 + Math.cos(obj.seed) * 0.3, rand(-0.15, 0.15)));
        const p = new THREE.Vector3();
        const inv = 1 - k;
        p.copy(start).multiplyScalar(inv * inv * inv)
          .addScaledVector(c1, 3 * inv * inv * k)
          .addScaledVector(c2, 3 * inv * k * k)
          .addScaledVector(target, k * k * k);
        const wobble = Math.sin(k * Math.PI) * Math.sin(t * 11 + obj.seed) * 0.035;
        obj.node.position.set(p.x + wobble, p.y + wobble * 0.6, p.z + wobble * 0.4);
        obj.node.scale.setScalar(Math.max(0.001, lerp(obj.radius, obj.targetRadius, k) * appearK));
        return;
      }
      const target = obj.target;
      const hover = 0.02 + settle * 0.02;
      obj.node.scale.setScalar(Math.max(0.001, obj.targetRadius * appearK));
      obj.node.position.set(
        target.x + Math.sin(t * 0.8 + obj.targetSeed) * hover,
        target.y + Math.cos(t * 0.9 + obj.targetSeed * 1.4) * hover,
        target.z + Math.sin(t * 0.6 + obj.targetSeed * 2.1) * hover * 0.8,
      );
    });

    updateLabelClasses(t, phase);

    gateRing.material.opacity = 0.3 + Math.sin(t * 2.6) * 0.08 + (phase === 2 ? 0.24 : 0);
    gateRing2.material.opacity = 0.16 + Math.sin(t * 1.8 + 1) * 0.06 + (phase === 2 ? 0.16 : 0);
    gateRing.rotation.z = t * (phase === 2 ? 1.4 : 0.35);
    gateRing2.rotation.z = -t * (phase === 2 ? 0.9 : 0.22);
    const gatePulse = phase === 2 ? 1 + Math.sin(t * 6) * 0.045 : 1 + Math.sin(t * 1.4) * 0.015;
    gate.scale.setScalar(gatePulse);
    gateGlow.material.opacity = 0.1 + (phase === 2 ? 0.18 : 0) + Math.sin(t * 3.2) * 0.02;
    gateMembrane.material.opacity = 0.06 + (phase === 2 ? 0.1 : 0) + Math.sin(t * 2.1) * 0.015;
    gateLight.intensity = phase === 2 ? 5.2 + Math.sin(t * 6) * 1.6 : 3.1;
    padMatRight.opacity = 0.12 + formK * 0.14 + Math.sin(t * 1.7) * 0.02;

    if (phase === 1) {
      state.sparkAcc += dt * 14 * intensity;
      while (state.sparkAcc >= 1) {
        state.sparkAcc -= 1;
        const term = leftLayout.termList[Math.floor(Math.random() * Math.max(1, leftLayout.termList.length))];
        const pos = (term?.center || V(-2.5, 1.8, 0)).clone().add(V(rand(-0.5, 0.5), rand(-0.4, 0.4), rand(-0.3, 0.3)));
        spawn('spark', pos, 0x9fe8ff, {
          vel: V(rand(-0.35, 0.35), rand(0.2, 0.8), rand(-0.25, 0.25)),
          gravity: -0.15, life: rand(0.4, 0.8), startScale: 0.025, endScale: 0.07,
        });
      }
    }
    if (phase === 2) {
      state.sparkAcc += dt * 18 * intensity;
      while (state.sparkAcc >= 1) {
        state.sparkAcc -= 1;
        const pos = V(rand(-0.55, 0.55), rand(1.2, 2.3), rand(-0.4, 0.4));
        spawn('spark', pos, 0x8fe6ff, {
          vel: V(rand(-0.5, 0.5), rand(0.2, 1.0), rand(-0.3, 0.3)),
          gravity: -0.2, life: rand(0.35, 0.7), startScale: 0.025, endScale: 0.08,
        });
      }
    }
    if (phase >= 2 && t > 5.4 && demo.hasGas) {
      state.gasAcc += dt * 7 * intensity;
      while (state.gasAcc >= 1) {
        state.gasAcc -= 1;
        const center = productCenterList[Math.floor(Math.random() * Math.max(1, productCenterList.length))] || V(2.5, 1.8, 0);
        spawn('bubble', center.clone().add(V(rand(-0.35, 0.35), rand(0, 0.3), rand(-0.2, 0.2))), 0xd7f4ff, {
          vel: V(rand(-0.1, 0.1), rand(0.35, 0.7), rand(-0.12, 0.12)),
          gravity: -0.03, life: rand(1.0, 2.0), startScale: 0.035, endScale: 0.12,
          opacity: 0.26,
        });
      }
    }
    if (phase >= 2 && t > 5.8 && demo.hasPpt) {
      state.pptAcc += dt * 6 * intensity;
      while (state.pptAcc >= 1) {
        state.pptAcc -= 1;
        const center = productCenterList[Math.floor(Math.random() * Math.max(1, productCenterList.length))] || V(2.5, 1.8, 0);
        spawn('soft', center.clone().add(V(rand(-0.3, 0.3), rand(-0.3, 0.2), rand(-0.2, 0.2))), demo.colors.ppt, {
          vel: V(rand(-0.1, 0.1), rand(-0.5, -0.25), rand(-0.1, 0.1)),
          gravity: -0.55, life: rand(1.1, 2.0), startScale: 0.035, endScale: 0.075,
          opacity: 0.4, settle: 0.1,
        });
      }
    }
    if (phase >= 2 && demo.smoke) {
      state.smokeAcc += dt * 3.5 * intensity;
      while (state.smokeAcc >= 1) {
        state.smokeAcc -= 1;
        const center = productCenterList[Math.floor(Math.random() * Math.max(1, productCenterList.length))] || V(2.5, 1.8, 0);
        spawn('smoke', center.clone().add(V(rand(-0.45, 0.45), rand(0.1, 0.5), rand(-0.3, 0.3))), 0x9fb6c2, {
          vel: V(rand(-0.08, 0.08), rand(0.2, 0.45), rand(-0.08, 0.08)),
          gravity: 0.03, life: rand(1.4, 2.4), startScale: 0.08, endScale: 0.25,
          opacity: 0.18,
        });
      }
    }

    sprites.forEach((s) => {
      if (s.life <= 0) return;
      s.life -= dt;
      if (s.life <= 0) {
        s.sprite.visible = false;
        s.mat.opacity = 0;
        return;
      }
      s.vel.y += s.gravity * dt;
      s.sprite.position.addScaledVector(s.vel, dt);
      if (s.settle != null && s.sprite.position.y < s.settle) {
        s.sprite.position.y = s.settle;
        s.vel.set(0, 0, 0);
        s.gravity = 0;
      }
      const age = 1 - s.life / s.max;
      s.mat.opacity = Math.sin(Math.min(1, age * 1.3) * Math.PI) * 0.65;
      s.sprite.scale.setScalar(lerp(s.startScale, s.endScale, smooth(age)));
    });

    electronParticles.forEach((p) => {
      const k = smooth((t - 3.0 - p.delay) / 2.3);
      p.sprite.visible = t > 2.8 && t < 6.1 && k > 0;
      p.sprite.position.lerpVectors(p.start, p.end, k);
      p.sprite.position.y += Math.sin(k * Math.PI) * 0.8;
      p.sprite.position.x += Math.sin(k * Math.PI) * 0.25;
      p.sprite.material.opacity = Math.sin(k * Math.PI) * 0.85;
      p.sprite.scale.setScalar(0.12 + Math.sin(t * 7 + p.seed) * 0.02);
    });

    condLabel.div.style.opacity = String(clamp(0.35 + appear * 0.65, 0, 1));
  }

  reset();
  setCond(0);

  function boundsFor(list, includeGate = false) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    list.forEach((t) => {
      x0 = Math.min(x0, t.center.x - t.radius);
      x1 = Math.max(x1, t.center.x + t.radius);
      y0 = Math.min(y0, t.center.y - t.radius - 0.5);
      y1 = Math.max(y1, t.center.y + t.radius + 0.12);
    });
    if (!Number.isFinite(x0)) {
      x0 = -1.2; x1 = 1.2; y0 = 0.8; y1 = 2.8;
    }
    if (includeGate) {
      x0 = Math.min(x0, -0.8);
      x1 = Math.max(x1, 0.8);
    }
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    return {
      cx,
      cy,
      halfW: Math.max(x1 - cx, cx - x0, 0.9) + 0.4,
      halfH: Math.max(y1 - cy, cy - y0, 0.9) + 0.35,
    };
  }
  const feedBounds = boundsFor(leftLayout.termList, true);
  const productBounds = boundsFor(rightLayout.termList, true);
  const allBounds = boundsFor([...leftLayout.termList, ...rightLayout.termList]);

  return {
    group,
    info,
    stats: {
      leftAtoms: leftAtoms.length,
      rightAtoms: rightAtoms.length,
      pairedAtoms: pairs.size,
      leftTerms: leftLayout.termList.length,
      rightTerms: rightLayout.termList.length,
      leftScale: leftLayout.sideScale,
      rightScale: rightLayout.sideScale,
    },
    framing: {
      pos: [0, 3.55, 10.2],
      target: [0, 1.7, 0],
      fitTarget: [allBounds.cx, allBounds.cy],
      halfW: allBounds.halfW,
      halfH: allBounds.halfH,
      phase: [feedBounds, allBounds, allBounds, productBounds],
    },
    update,
    reset,
    pulse(phase) {
      if (phase === 2) spawnBurst(V(0, 1.7, 0), 0x9fe8ff, 12, 1.1);
      if (phase === 3) spawnBurst(V(2.5, 1.8, 0.2), 0x8fe6b8, 8, 0.7);
    },
    dispose() {
      labelObjects.forEach((obj) => {
        obj.parent?.remove(obj);
        obj.element?.remove();
      });
      group.parent?.remove(group);
      disposables.forEach((item) => item.dispose?.());
      group.clear();
    },
  };
}
