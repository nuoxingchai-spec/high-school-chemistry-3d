import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EQUATION_CATEGORIES } from './equations.js';

const TAU = Math.PI * 2;
const WHITE = new THREE.Color(0xffffff);
const IRON_HOT = new THREE.Color(0xffb066);
const IRON_COOL = new THREE.Color(0x4a4f55);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
const rand = (a, b) => a + Math.random() * (b - a);

const DURATION = 9.6;
const PHASE_STARTS = [0, 1.2, 2.4, 6.3];
const PHASE_NAMES = ['投料', '条件', '反应', '产物'];
const PHASE_STATES = ['反应物就位', '条件建立中', '反应进行中', '产物检测'];

const PLANT_INFO = {
  beaker: {
    code: 'R-101',
    name: '搅拌反应釜',
    line: '夹套控温 · 机械搅拌',
    note: '物料经计量泵送入 R-101 反应釜，夹套控温并持续搅拌，反应完成后由底部出料阀采出。',
  },
  gasjar: {
    code: 'T-201',
    name: '气体吸收塔',
    line: '密闭气相 · 稳压进料',
    note: '气体经稳压阀送入 T-201 吸收塔，塔内密闭混合反应，顶部尾气经管线送吸收工段处理。',
  },
  crucible: {
    code: 'F-301',
    name: '高温焙烧炉',
    line: '燃气加热 · 集气外排',
    note: '物料装入 F-301 焙烧炉，燃气燃烧提供高温，炉气经集气罩和烟囱外排，产物由炉口取出。',
  },
  tube: {
    code: 'P-401',
    name: '管式反应器',
    line: '固定床 · 外加热',
    note: '气体经流量计送入 P-401 管式反应器，外加热固定床连续反应，尾气经吸收装置处理后排放。',
  },
  trough: {
    code: 'B-501',
    name: '水解处理池',
    line: '防腐蚀衬里 · 液位联锁',
    note: '物料由加料斗投入 B-501 水解处理池，池体防腐衬里并设液位、温度联锁，槽面强制排风。',
  },
  cell: {
    code: 'E-601',
    name: '电解槽',
    line: '整流供电 · 强制排风',
    note: 'E-601 电解槽由整流柜供电，两极经铜排连接，槽面设强制排风，电解液循环控温。',
  },
};

/* ------------------------------------------------------------
   Procedural textures
   ------------------------------------------------------------ */

function makeCanvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function softTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 128) {
  return makeCanvasTexture(size, size, (ctx) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.5, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
}

function bubbleTexture() {
  return makeCanvasTexture(128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    const cx = 64;
    const cy = 64;
    const r = 46;
    const g = ctx.createRadialGradient(cx - 15, cy - 18, 3, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(0.32, 'rgba(255,255,255,.16)');
    g.addColorStop(0.78, 'rgba(255,255,255,.34)');
    g.addColorStop(0.92, 'rgba(255,255,255,.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.72)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 3, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath();
    ctx.arc(cx - 16, cy - 18, 7, 0, TAU);
    ctx.fill();
  });
}

function smokeTexture() {
  return makeCanvasTexture(128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    [[64, 68, 50], [42, 78, 32], [88, 76, 30], [64, 46, 34]].forEach(([x, y, r]) => {
      // 先铺偏移的灰蓝阴影，让白烟在浅色背景上有体积感
      const shade = ctx.createRadialGradient(x + 5, y + 7, 0, x + 5, y + 7, r);
      shade.addColorStop(0, 'rgba(96,116,132,.26)');
      shade.addColorStop(0.65, 'rgba(120,140,155,.12)');
      shade.addColorStop(1, 'rgba(120,140,155,0)');
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(x + 5, y + 7, r, 0, TAU);
      ctx.fill();
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,.66)');
      g.addColorStop(0.6, 'rgba(255,255,255,.26)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    });
  });
}

function flameTexture() {
  return makeCanvasTexture(128, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(64, 158, 4, 64, 150, 104);
    g.addColorStop(0, 'rgba(255,255,238,1)');
    g.addColorStop(0.22, 'rgba(255,236,150,.95)');
    g.addColorStop(0.52, 'rgba(255,168,62,.65)');
    g.addColorStop(0.8, 'rgba(255,96,20,.24)');
    g.addColorStop(1, 'rgba(255,70,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(64, 130, 44, 96, 0, 0, TAU);
    ctx.fill();
    const core = ctx.createRadialGradient(64, 170, 2, 64, 168, 54);
    core.addColorStop(0, 'rgba(255,255,255,.95)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, w, h);
  });
}

// 冷色火焰单独用白蓝渐变，避免橙色底图把淡蓝/紫色火焰染黄
function coolFlameTexture() {
  return makeCanvasTexture(128, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(64, 158, 4, 64, 150, 104);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.24, 'rgba(226,246,255,.9)');
    g.addColorStop(0.56, 'rgba(170,220,255,.6)');
    g.addColorStop(0.82, 'rgba(140,200,255,.22)');
    g.addColorStop(1, 'rgba(130,195,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(64, 130, 44, 96, 0, 0, TAU);
    ctx.fill();
    const core = ctx.createRadialGradient(64, 170, 2, 64, 168, 54);
    core.addColorStop(0, 'rgba(255,255,255,.95)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, w, h);
  });
}

function isCoolFlame(color) {
  const c = new THREE.Color(color ?? 0xffffff);
  return c.b > c.r * 0.98 && c.b > c.g * 0.9;
}

function benchTexture() {
  return makeCanvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#b7d3e2';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(46,92,116,.2)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(54,118,150,.4)';
    ctx.lineWidth = 3;
    [176, 316, 452].forEach((r) => {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, TAU);
      ctx.stroke();
    });
    ctx.setLineDash([14, 18]);
    ctx.strokeStyle = 'rgba(54,118,150,.26)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 470, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(38,100,132,.55)';
    ctx.font = '600 22px "Cascadia Code", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EQ · LAB BENCH / PARAMETRIC 3D', w / 2, h / 2 + 8);
    ctx.font = '500 15px "Cascadia Code", monospace';
    ctx.fillStyle = 'rgba(38,100,132,.38)';
    ctx.fillText('250 EQUATIONS · REAL-TIME RESPONSE', w / 2, h / 2 + 36);
  });
}

function gauzeTexture() {
  return makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(120,132,140,.92)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(206,216,222,.5)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i <= w; i += 10) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(228,224,214,.96)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 56, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,146,136,.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 56, 0, TAU);
    ctx.stroke();
  });
}

function arcTexture() {
  return makeCanvasTexture(128, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(220,248,255,.95)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(120,220,255,.9)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(8, h / 2);
    for (let x = 8; x <= w - 8; x += 10) {
      ctx.lineTo(x, h / 2 + (Math.random() - 0.5) * 26);
    }
    ctx.stroke();
  });
}

function concreteTexture() {
  return makeCanvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#1a2830';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3200; i++) {
      const v = Math.random() * 26;
      ctx.fillStyle = `rgba(${42 + v},${56 + v},${64 + v},${0.1 + Math.random() * 0.22})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2.4, 1 + Math.random() * 2.4);
    }
    for (let i = 0; i < 7; i++) {
      const gx = Math.random() * w;
      const gy = Math.random() * h;
      const gr = 70 + Math.random() * 150;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      g.addColorStop(0, 'rgba(10,20,26,.26)');
      g.addColorStop(1, 'rgba(10,20,26,0)');
      ctx.fillStyle = g;
      ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
    ctx.strokeStyle = 'rgba(5,11,15,.62)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo((i * w) / 4, 0);
      ctx.lineTo((i * w) / 4, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (i * h) / 4);
      ctx.lineTo(w, (i * h) / 4);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(142,182,196,.12)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 30 + Math.random() * 90, y + (Math.random() - 0.5) * 20);
      ctx.stroke();
    }
  });
}

function hazardRingTexture() {
  return makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const outer = 236;
    const inner = 214;
    const segments = 30;
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * TAU;
      const a1 = ((i + 1) / segments) * TAU;
      ctx.beginPath();
      ctx.arc(cx, cy, outer, a0, a1);
      ctx.arc(cx, cy, inner, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#b98e1e' : '#161b1e';
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(214,170,52,.32)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, outer + 7, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath();
    ctx.arc(cx, cy, inner - 7, 0, TAU);
    ctx.stroke();
  });
}

function plantSignTexture(title, subtitle, accent = '#f0b23a') {
  return makeCanvasTexture(768, 224, (ctx, w, h) => {
    ctx.fillStyle = '#0c171d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 1);
    ctx.strokeStyle = 'rgba(150,196,212,.24)';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = accent;
    ctx.fillRect(32, 34, 7, h - 68);
    ctx.fillStyle = '#eef8fb';
    ctx.font = '600 42px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, 60, 100);
    ctx.fillStyle = 'rgba(180,214,224,.78)';
    ctx.font = '500 24px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText(subtitle, 60, 148);
    ctx.fillStyle = 'rgba(120,220,170,.9)';
    ctx.beginPath();
    ctx.arc(w - 54, 50, 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,214,224,.6)';
    ctx.font = '500 18px "Cascadia Code", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('SYSTEM ONLINE', w - 72, 56);
  });
}

function plantScreenTexture(title, lines) {
  return makeCanvasTexture(512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#08141a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(92,196,214,.28)';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#8fe8ff';
    ctx.font = '600 34px "Cascadia Code", monospace';
    ctx.fillText(title, 30, 62);
    ctx.strokeStyle = 'rgba(92,196,214,.4)';
    ctx.beginPath();
    ctx.moveTo(30, 82);
    ctx.lineTo(w - 30, 82);
    ctx.stroke();
    ctx.font = '500 25px "Cascadia Code", monospace';
    lines.forEach((line, i) => {
      ctx.fillStyle = i === lines.length - 1 ? '#7ff0c0' : 'rgba(176,226,238,.84)';
      ctx.fillText(line, 30, 128 + i * 42);
    });
    ctx.fillStyle = 'rgba(126,240,192,.9)';
    ctx.beginPath();
    ctx.arc(w - 44, 56, 8, 0, TAU);
    ctx.fill();
  });
}

/* ------------------------------------------------------------
   Sprite particle pool
   ------------------------------------------------------------ */

class SpritePool {
  constructor(parent, map, { max = 48, blending = THREE.NormalBlending } = {}) {
    this.items = [];
    for (let i = 0; i < max; i++) {
      const material = new THREE.SpriteMaterial({
        map, transparent: true, opacity: 0, depthWrite: false, blending,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      parent.add(sprite);
      this.items.push({
        sprite, material, life: 0, total: 1,
        vel: new THREE.Vector3(), gravity: 0, drag: 0, base: 0.1, grow: 0, opacity: 1,
      });
    }
    this.index = 0;
  }

  emit({ x, y, z, vx = 0, vy = 0, vz = 0, life = 1, size = 0.1, grow = 0, gravity = 0, drag = 0, color = 0xffffff, opacity = 0.6 }) {
    const item = this.items[this.index];
    this.index = (this.index + 1) % this.items.length;
    item.sprite.visible = true;
    item.sprite.position.set(x, y, z);
    item.sprite.scale.setScalar(size);
    item.material.color.set(color);
    item.material.opacity = opacity;
    item.base = size;
    item.grow = grow;
    item.gravity = gravity;
    item.drag = drag;
    item.opacity = opacity;
    item.life = life;
    item.total = life;
    item.vel.set(vx, vy, vz);
  }

  update(dt) {
    for (const item of this.items) {
      if (item.life <= 0) continue;
      item.life -= dt;
      if (item.life <= 0) {
        item.sprite.visible = false;
        continue;
      }
      item.vel.y += item.gravity * dt;
      if (item.drag) item.vel.multiplyScalar(Math.max(0, 1 - item.drag * dt));
      item.sprite.position.addScaledVector(item.vel, dt);
      const k = item.life / item.total;
      item.sprite.scale.setScalar(item.base + item.grow * (1 - k));
      item.material.opacity = item.opacity * Math.min(1, k * 2.4);
    }
  }

  clear() {
    for (const item of this.items) {
      item.life = 0;
      item.sprite.visible = false;
    }
  }
}

/* ------------------------------------------------------------
   Materials & geometry helpers
   ------------------------------------------------------------ */

const glassMaterial = () => new THREE.MeshPhysicalMaterial({
  color: 0xdff1fa, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.02,
  clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false,
});

const liquidMaterial = (color) => new THREE.MeshPhysicalMaterial({
  color, transparent: true, opacity: 0.8, roughness: 0.18, metalness: 0.0,
  clearcoat: 0.7, clearcoatRoughness: 0.16, depthWrite: false,
});

const steelMaterial = () => new THREE.MeshStandardMaterial({ color: 0xc9d5dc, metalness: 0.85, roughness: 0.34 });
const darkMaterial = () => new THREE.MeshStandardMaterial({ color: 0x49565f, metalness: 0.7, roughness: 0.42 });
const rubberMaterial = () => new THREE.MeshStandardMaterial({ color: 0x3a444c, metalness: 0.1, roughness: 0.85 });
const ceramicMaterial = () => new THREE.MeshStandardMaterial({ color: 0xd9d3c7, metalness: 0.05, roughness: 0.9 });
const graphiteMaterial = () => new THREE.MeshStandardMaterial({ color: 0x262b30, metalness: 0.55, roughness: 0.5 });

const industrialSteel = () => new THREE.MeshStandardMaterial({ color: 0x8d9ba4, metalness: 0.78, roughness: 0.42 });
const industrialDark = () => new THREE.MeshStandardMaterial({ color: 0x39464e, metalness: 0.64, roughness: 0.5 });
const industrialPaint = (color = 0x3f6f8f) => new THREE.MeshStandardMaterial({ color, metalness: 0.42, roughness: 0.56 });
const safetyYellow = () => new THREE.MeshStandardMaterial({ color: 0xdca61e, metalness: 0.32, roughness: 0.52 });
const insulationMat = () => new THREE.MeshStandardMaterial({ color: 0xb7c0c4, metalness: 0.16, roughness: 0.82 });

function shadow(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function addMesh(parent, geometry, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = true, receive = true } = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

function addGlassEdges(parent, width, height, depth, color = 0xffffff, opacity = 0.55) {
  const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth));
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const lines = new THREE.LineSegments(geo, mat);
  parent.add(lines);
  return lines;
}

function addTube(parent, points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 36, radius, 8, false);
  return addMesh(parent, geo, material, { cast: false, receive: false });
}

function addGraduations(parent, radius, startY, step, count) {
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42 });
  for (let i = 0; i < count; i++) {
    const y = startY + i * step;
    const pts = [];
    for (let a = -0.4; a <= 0.4001; a += 0.05) {
      pts.push(new THREE.Vector3(Math.sin(a) * (radius - 0.02), y, Math.cos(a) * (radius - 0.02)));
    }
    parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
}

function makeFlame(parent, texture, x, y, z, sx, sy) {
  const mat = new THREE.SpriteMaterial({
    map: texture, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.NormalBlending, color: 0xffffff,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(sx, sy, 1);
  parent.add(sprite);
  return { sprite, mat, sx, sy, seed: Math.random() * TAU };
}

function addBurner(parent, x, z, texture, rig) {
  const dark = darkMaterial();
  addMesh(parent, new THREE.CylinderGeometry(0.26, 0.3, 0.07, 28), dark, { x, y: 0.035, z });
  addMesh(parent, new THREE.CylinderGeometry(0.045, 0.055, 0.22, 16), steelMaterial(), { x, y: 0.17, z });
  addMesh(parent, new THREE.TorusGeometry(0.06, 0.012, 6, 16), dark, { x, y: 0.27, z, rx: Math.PI / 2 });
  const outer = makeFlame(parent, texture, x, 0.43, z, 0.27, 0.5);
  const inner = makeFlame(parent, texture, x, 0.38, z, 0.1, 0.22);
  outer.mat.color.set(0xff7a1c);
  inner.mat.color.set(0xffdca0);
  outer.role = 'outer';
  inner.role = 'core';
  rig.flames.push(outer, inner);
  const light = new THREE.PointLight(0xff8a2a, 0, 3.4, 2);
  light.position.set(x, 0.55, z);
  parent.add(light);
  rig.flameLight = light;
}

function addTripod(parent, { radius = 0.5, height = 0.52, y = 0 } = {}) {
  const dark = darkMaterial();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + Math.PI / 6;
    addMesh(parent, new THREE.CylinderGeometry(0.017, 0.024, height, 10), dark, {
      x: Math.cos(a) * radius, y: y + height / 2, z: Math.sin(a) * radius,
      rx: Math.sin(a) * 0.05, rz: -Math.cos(a) * 0.05,
    });
  }
  addMesh(parent, new THREE.TorusGeometry(radius * 0.9, 0.021, 8, 44), dark, { y: y + height, rx: Math.PI / 2 });
  return y + height;
}

function addGauze(parent, y) {
  const mat = new THREE.MeshStandardMaterial({
    map: gauzeTexture(), color: 0xb8c2c8, metalness: 0.35, roughness: 0.72,
    transparent: true, opacity: 0.96, side: THREE.DoubleSide,
  });
  addMesh(parent, new THREE.BoxGeometry(0.78, 0.012, 0.78), mat, { y });
  addMesh(parent, new THREE.CylinderGeometry(0.23, 0.23, 0.016, 36), new THREE.MeshStandardMaterial({
    color: 0xe9e4d8, roughness: 0.94,
  }), { y: y + 0.004 });
}

function addAlcoholLamp(parent, texture, rig, lift = 0) {
  const lamp = new THREE.Group();
  lamp.position.y = lift;
  parent.add(lamp);
  addMesh(lamp, new THREE.CylinderGeometry(0.18, 0.16, 0.06, 30), new THREE.MeshStandardMaterial({
    color: 0xd9d3c7, roughness: 0.55,
  }), { y: 0.03 });
  addMesh(lamp, new THREE.CylinderGeometry(0.15, 0.165, 0.21, 30), glassMaterial(), { y: 0.165, cast: false });
  const spiritMat = liquidMaterial(0xa8d8ea);
  spiritMat.opacity = 0.62;
  addMesh(lamp, new THREE.CylinderGeometry(0.145, 0.155, 0.13, 28), spiritMat, { y: 0.12, cast: false });
  addMesh(lamp, new THREE.CylinderGeometry(0.052, 0.095, 0.06, 22), new THREE.MeshStandardMaterial({
    color: 0xb9b2a6, roughness: 0.68,
  }), { y: 0.3 });
  addMesh(lamp, new THREE.CylinderGeometry(0.026, 0.03, 0.05, 12), steelMaterial(), { y: 0.35 });
  addMesh(lamp, new THREE.CylinderGeometry(0.012, 0.014, 0.04, 8), new THREE.MeshStandardMaterial({
    color: 0x5a5148, roughness: 0.9,
  }), { y: 0.385 });

  const outer = makeFlame(parent, texture, 0, lift + 0.47, 0, 0.19, 0.3);
  outer.mat.color.set(0xffb24a);
  outer.role = 'outer';
  const core = makeFlame(parent, texture, 0, lift + 0.43, 0, 0.075, 0.13);
  core.mat.color.set(0xa8d8ff);
  core.role = 'core';
  rig.flames.push(outer, core);
  const light = new THREE.PointLight(0xff9a3a, 0, 3.2, 2);
  light.position.set(0, lift + 0.6, 0);
  parent.add(light);
  rig.flameLight = light;
  rig.alcoholLamp = lamp;
}

function addThermometer(parent, rig, { x, z, bottomY, topY }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  addMesh(group, new THREE.CylinderGeometry(0.019, 0.019, topY - bottomY, 12), glassMaterial(), {
    y: (topY + bottomY) / 2, cast: false,
  });
  addMesh(group, new THREE.SphereGeometry(0.03, 14, 10), new THREE.MeshStandardMaterial({
    color: 0xd23a2e, roughness: 0.42,
  }), { y: bottomY, cast: false });
  const columnMat = new THREE.MeshBasicMaterial({ color: 0xe04434 });
  const column = addMesh(group, new THREE.CylinderGeometry(0.0075, 0.0075, 1, 8), columnMat, {
    y: bottomY + 0.12, cast: false, receive: false,
  });
  column.scale.y = 0.22;
  addMesh(group, new THREE.SphereGeometry(0.024, 12, 10), glassMaterial(), { y: topY, cast: false });
  rig.thermoColumn = column;
  rig.thermoBottom = bottomY;
  return group;
}

function addTweezers(parent, rig) {
  const group = new THREE.Group();
  parent.add(group);
  const steel = steelMaterial();
  [-1, 1].forEach((side) => {
    addMesh(group, new THREE.BoxGeometry(0.03, 0.46, 0.02), steel, {
      x: side * 0.032, y: 0.26, z: 0, rz: -side * 0.07,
    });
    addMesh(group, new THREE.BoxGeometry(0.026, 0.03, 0.05), steel, {
      x: side * 0.016, y: 0.05, z: 0.01, rx: 0.3,
    });
  });
  addMesh(group, new THREE.TorusGeometry(0.045, 0.009, 6, 16), steel, { y: 0.5, rx: Math.PI / 2 });
  rig.tweezers = group;
}

function addKnifeSwitch(parent, rig, { x = 0, y = 0, z = 0 } = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  addMesh(group, new THREE.BoxGeometry(0.19, 0.04, 0.11), darkMaterial(), { y: 0.02 });
  addMesh(group, new THREE.CylinderGeometry(0.016, 0.016, 0.03, 10), steelMaterial(), { x: -0.062, y: 0.048 });
  addMesh(group, new THREE.CylinderGeometry(0.016, 0.016, 0.03, 10), steelMaterial(), { x: 0.062, y: 0.048 });
  const pivot = new THREE.Group();
  pivot.position.set(-0.062, 0.062, 0);
  group.add(pivot);
  addMesh(pivot, new THREE.BoxGeometry(0.13, 0.014, 0.018), new THREE.MeshStandardMaterial({
    color: 0xd8b25a, metalness: 0.75, roughness: 0.3,
  }), { x: 0.065 });
  addMesh(pivot, new THREE.SphereGeometry(0.018, 10, 8), rubberMaterial(), { y: 0.012 });
  rig.switchLever = pivot;
  rig.switchGroup = group;
}

function addGalvanometer(parent, rig) {
  const meter = new THREE.Group();
  meter.position.set(0, 1.22, -0.46);
  parent.add(meter);
  addMesh(meter, new THREE.BoxGeometry(0.36, 0.1, 0.24), darkMaterial(), { y: 0.05 });
  addMesh(meter, new THREE.CylinderGeometry(0.16, 0.16, 0.055, 32), new THREE.MeshStandardMaterial({
    color: 0x243038, metalness: 0.5, roughness: 0.45,
  }), { y: 0.13, rx: Math.PI / 2 });
  addMesh(meter, new THREE.CircleGeometry(0.135, 32), new THREE.MeshBasicMaterial({ color: 0xf3f7f2 }), {
    y: 0.13, z: 0.029, cast: false,
  });
  addMesh(meter, new THREE.TorusGeometry(0.135, 0.007, 6, 32), steelMaterial(), { y: 0.13, z: 0.032 });
  const needlePivot = new THREE.Group();
  needlePivot.position.set(0, 0.09, 0.035);
  meter.add(needlePivot);
  addMesh(needlePivot, new THREE.BoxGeometry(0.008, 0.115, 0.004), new THREE.MeshBasicMaterial({
    color: 0xd23a2e,
  }), { y: 0.052 });
  addMesh(meter, new THREE.CylinderGeometry(0.012, 0.012, 0.02, 10), steelMaterial(), { x: -0.13, y: 0.19 });
  addMesh(meter, new THREE.CylinderGeometry(0.012, 0.012, 0.02, 10), steelMaterial(), { x: 0.13, y: 0.19 });
  rig.meterNeedle = needlePivot;
  return meter;
}

function addValveWheel(parent, x, y, z, { ry = 0, r = 0.085 } = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);
  const mat = new THREE.MeshStandardMaterial({ color: 0xb5472e, metalness: 0.45, roughness: 0.5 });
  addMesh(group, new THREE.TorusGeometry(r, 0.011, 6, 22), mat);
  for (let i = 0; i < 3; i++) {
    addMesh(group, new THREE.BoxGeometry(r * 1.9, 0.009, 0.012), mat, { rz: (i * Math.PI) / 3 });
  }
  addMesh(group, new THREE.CylinderGeometry(0.018, 0.018, 0.06, 10), industrialSteel(), { rz: Math.PI / 2 });
  return group;
}

function addPlantGauge(parent, x, y, z, ry = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);
  addMesh(group, new THREE.CylinderGeometry(0.072, 0.072, 0.026, 20), industrialSteel(), { rx: Math.PI / 2, cast: false });
  addMesh(group, new THREE.CircleGeometry(0.058, 20), new THREE.MeshBasicMaterial({ color: 0xeef4ec }), { z: 0.015, cast: false });
  addMesh(group, new THREE.BoxGeometry(0.006, 0.046, 0.003), new THREE.MeshBasicMaterial({ color: 0xc2412c }), { y: 0.018, z: 0.019, rz: 0.6, cast: false });
  addMesh(group, new THREE.TorusGeometry(0.063, 0.006, 6, 20), industrialDark(), { z: 0.016, cast: false });
  return group;
}

function addPipeFlange(parent, x, y, z, axis = 'z', r = 0.09) {
  const discRot = axis === 'x' ? { rz: Math.PI / 2 } : axis === 'z' ? { rx: Math.PI / 2 } : {};
  const ringRot = axis === 'x' ? { ry: Math.PI / 2 } : axis === 'y' ? { rx: Math.PI / 2 } : {};
  addMesh(parent, new THREE.CylinderGeometry(r, r, 0.035, 20), industrialSteel(), { x, y, z, ...discRot });
  addMesh(parent, new THREE.TorusGeometry(r * 0.82, 0.011, 6, 20), industrialDark(), { x, y, z, ...ringRot, cast: false });
}

function addBoltRing(parent, x, y, z, { axis = 'y', r = 0.1, count = 8, size = 0.014, len = 0.03 } = {}) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU;
    const c = Math.cos(a) * r;
    const s = Math.sin(a) * r;
    if (axis === 'x') {
      addMesh(parent, new THREE.CylinderGeometry(size, size, len, 8), industrialSteel(), { x, y: y + c, z: z + s, rz: Math.PI / 2 });
    } else if (axis === 'z') {
      addMesh(parent, new THREE.CylinderGeometry(size, size, len, 8), industrialSteel(), { x: x + c, y: y + s, z, rx: Math.PI / 2 });
    } else {
      addMesh(parent, new THREE.CylinderGeometry(size, size, len, 8), industrialSteel(), { x: x + c, y, z: z + s });
    }
  }
}

function addLadder(parent, x, z, height, baseY = 0) {
  const steel = industrialSteel();
  [-0.085, 0.085].forEach((dx) => {
    addMesh(parent, new THREE.CylinderGeometry(0.012, 0.012, height, 8), steel, { x: x + dx, y: baseY + height / 2, z });
  });
  for (let y = baseY + 0.16; y < baseY + height; y += 0.22) {
    addMesh(parent, new THREE.BoxGeometry(0.19, 0.014, 0.014), steel, { x, y, z });
  }
}

function addSignBoard(parent, x, y, z, { title, subtitle, ry = 0, w = 1.1, h = 0.32 } = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);
  addMesh(group, new THREE.BoxGeometry(w + 0.06, h + 0.04, 0.04), industrialDark(), { z: -0.026 });
  const mat = new THREE.MeshStandardMaterial({
    map: plantSignTexture(title, subtitle), roughness: 0.62, metalness: 0.15,
  });
  addMesh(group, new THREE.PlaneGeometry(w, h), mat, { z: 0.002, cast: false, receive: false });
  return group;
}

function addPlantScreen(parent, x, y, z, title, lines) {
  addMesh(parent, new THREE.PlaneGeometry(0.34, 0.21), new THREE.MeshBasicMaterial({
    map: plantScreenTexture(title, lines),
  }), { x, y, z, cast: false, receive: false });
}

function addPlantCommon(rig, demo, { cabinet = true } = {}) {
  const group = new THREE.Group();
  rig.group.add(group);
  const steel = industrialSteel();
  const dark = industrialDark();

  const backZ = -1.95;
  [-2.25, 2.25].forEach((x) => {
    addMesh(group, new THREE.BoxGeometry(0.09, 2.35, 0.09), dark, { x, y: 1.175, z: backZ });
    addMesh(group, new THREE.BoxGeometry(0.06, 0.06, 0.9), dark, { x, y: 0.06, z: backZ + 0.45 });
  });
  [1.5, 2.3].forEach((y) => {
    addMesh(group, new THREE.BoxGeometry(4.6, 0.08, 0.08), dark, { y, z: backZ });
  });
  [1.6, 1.86, 2.1].forEach((y, i) => {
    addTube(group, [
      new THREE.Vector3(-2.25, y, backZ),
      new THREE.Vector3(2.25, y, backZ),
    ], 0.05, i === 1 ? industrialPaint(0x6b7f8a) : steel);
    [-1.35, 0, 1.35].forEach((x) => addPipeFlange(group, x, y, backZ, 'x', 0.082));
  });
  addTube(group, [
    new THREE.Vector3(-2.25, 1.6, backZ),
    new THREE.Vector3(-2.25, 0.55, backZ + 0.3),
    new THREE.Vector3(-2.25, 0.2, backZ + 0.8),
  ], 0.045, steel);
  addValveWheel(group, -2.25, 0.9, backZ + 0.16, { ry: Math.PI / 2 });
  addSignBoard(group, 0, 2.46, backZ + 0.02, {
    title: 'REACTION UNIT · 反应工段',
    subtitle: '全流程密闭输送 · 尾气经吸收处理后排放',
    w: 1.25,
    h: 0.34,
  });

  if (cabinet) {
    const dcs = new THREE.Group();
    dcs.position.set(1.62, 0, -1.3);
    group.add(dcs);
    addMesh(dcs, new THREE.BoxGeometry(0.56, 0.92, 0.34), industrialPaint(0x2f4650), { y: 0.46 });
    addMesh(dcs, new THREE.BoxGeometry(0.6, 0.05, 0.38), dark, { y: 0.94 });
    addMesh(dcs, new THREE.BoxGeometry(0.58, 0.03, 0.36), dark, { y: 0.025 });
    addPlantScreen(dcs, 0, 0.62, 0.173, 'DCS', ['P 101.3 kPa', 'T 25.0 ℃', 'FLOW  OK']);
    addMesh(dcs, new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8), safetyYellow(), { x: -0.2, y: 0.9, z: 0.16, rx: Math.PI / 2 });
    addMesh(dcs, new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8), new THREE.MeshStandardMaterial({ color: 0x4fe0a0, emissive: 0x2fae7c, emissiveIntensity: 0.7 }), { x: 0.2, y: 0.9, z: 0.16, rx: Math.PI / 2 });
  }

  addMesh(group, new THREE.CylinderGeometry(0.09, 0.11, 0.06, 16), dark, { x: -2.0, y: 0.03, z: -0.85 });
  addMesh(group, new THREE.CylinderGeometry(0.045, 0.045, 1.1, 10), steel, { x: -2.0, y: 0.58, z: -0.85 });
  addMesh(group, new THREE.TorusGeometry(0.085, 0.012, 6, 16), dark, { x: -2.0, y: 1.13, z: -0.85, rx: Math.PI / 2 });
  rig.ventAnchor = new THREE.Vector3(-2.0, 1.16, -0.85);
  return group;
}

function addBeakerPlantShell(rig, demo, { baseY, r, h, heat, texture }) {
  const group = new THREE.Group();
  rig.group.add(group);
  const steel = industrialSteel();
  const dark = industrialDark();

  addMesh(group, new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.04, 44), dark, { y: baseY + 0.02 });
  addMesh(group, new THREE.TorusGeometry(r + 0.04, 0.016, 8, 44), steel, { y: baseY + 0.045, rx: Math.PI / 2, cast: false });

  if (heat) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      const x = Math.cos(a) * 0.56;
      const z = Math.sin(a) * 0.56;
      addMesh(group, new THREE.CylinderGeometry(0.032, 0.04, baseY - 0.04, 10), dark, { x, y: (baseY - 0.04) / 2, z });
      addMesh(group, new THREE.BoxGeometry(0.5, 0.03, 0.04), dark, { x: x * 0.7, y: baseY * 0.55, z: z * 0.7, ry: -a });
    }
    addMesh(group, new THREE.TorusGeometry(0.33, 0.025, 8, 36), safetyYellow(), { y: 0.5, rx: Math.PI / 2 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      const x = Math.cos(a) * 0.26;
      const z = Math.sin(a) * 0.26;
      addMesh(group, new THREE.CylinderGeometry(0.028, 0.034, 0.09, 10), dark, { x, y: 0.535, z });
      const outer = makeFlame(group, texture, x, 0.56, z, 0.12, 0.16);
      outer.mat.color.set(0x6aa8ff);
      outer.role = 'outer';
      const core = makeFlame(group, texture, x, 0.55, z, 0.055, 0.09);
      core.mat.color.set(0xffd9a2);
      core.role = 'core';
      rig.flames.push(outer, core);
    }
    const light = new THREE.PointLight(0x6fb2ff, 0, 3, 2);
    light.position.set(0, 0.65, 0);
    group.add(light);
    if (!rig.flameLight) rig.flameLight = light;
  } else {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      addMesh(group, new THREE.BoxGeometry(0.16, 0.06, 0.1), dark, {
        x: Math.cos(a) * 0.5, y: 0.03, z: Math.sin(a) * 0.5, ry: -a,
      });
    }
  }

  addMesh(group, new THREE.CylinderGeometry(r + 0.02, r + 0.02, 0.05, 44), steel, { y: baseY + h + 0.025 });
  addMesh(group, new THREE.TorusGeometry(r + 0.015, 0.014, 8, 44), dark, { y: baseY + h + 0.05, rx: Math.PI / 2 });
  addBoltRing(group, 0, baseY + h + 0.056, 0, { axis: 'y', r: r * 0.9, count: 10, size: 0.014, len: 0.03 });

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    addMesh(group, new THREE.CylinderGeometry(0.011, 0.011, h + 0.04, 8), steel, {
      x: Math.cos(a) * (r + 0.015), y: baseY + h / 2 + 0.02, z: Math.sin(a) * (r + 0.015),
    });
  }
  [0.32, 0.72].forEach((f) => {
    addMesh(group, new THREE.TorusGeometry(r + 0.012, 0.01, 6, 44), steel, {
      y: baseY + h * f, rx: Math.PI / 2, cast: false,
    });
  });

  const topY = baseY + h + 0.05;
  addMesh(group, new THREE.CylinderGeometry(0.12, 0.14, 0.09, 24), dark, { y: topY + 0.045 });
  addMesh(group, new THREE.CylinderGeometry(0.105, 0.105, 0.24, 24), industrialPaint(0x365a6d), { y: topY + 0.21 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    addMesh(group, new THREE.BoxGeometry(0.02, 0.2, 0.045), dark, {
      x: Math.cos(a) * 0.115, y: topY + 0.21, z: Math.sin(a) * 0.115, ry: -a,
    });
  }
  addMesh(group, new THREE.BoxGeometry(0.16, 0.11, 0.16), dark, { y: topY + 0.08, x: 0.17 });
  addMesh(group, new THREE.CylinderGeometry(0.045, 0.045, 0.11, 12), steel, { y: topY + 0.39 });
  addTube(group, [
    new THREE.Vector3(0.2, topY + 0.02, -0.02),
    new THREE.Vector3(0.55, topY - 0.06, -0.35),
    new THREE.Vector3(0.95, 0.55, -1.2),
  ], 0.016, rubberMaterial());

  addMesh(group, new THREE.CylinderGeometry(0.017, 0.017, h - 0.18, 10), steel, { y: baseY + h / 2 + 0.09 });
  const agitator = new THREE.Group();
  agitator.position.set(0, baseY + 0.22, 0);
  group.add(agitator);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    addMesh(agitator, new THREE.BoxGeometry(0.17, 0.012, 0.055), steel, {
      x: Math.cos(a) * 0.09, z: Math.sin(a) * 0.09, ry: -a,
    });
  }
  rig.agitator = agitator;

  addTube(group, [
    new THREE.Vector3(-0.28, topY + 0.02, -0.12),
    new THREE.Vector3(-0.3, topY + 0.36, -0.2),
    new THREE.Vector3(-1.15, topY + 0.46, -0.5),
    new THREE.Vector3(-1.9, topY + 0.47, -1.5),
  ], 0.024, steel);
  addPipeFlange(group, -0.3, topY + 0.06, -0.16, 'y', 0.055);
  addValveWheel(group, -0.95, topY + 0.46, -0.4);

  addTube(group, [
    new THREE.Vector3(-r * 0.55, baseY + 0.1, 0),
    new THREE.Vector3(-0.82, baseY + 0.02, 0.22),
    new THREE.Vector3(-0.9, 0.12, 0.52),
  ], 0.026, steel);
  addValveWheel(group, -0.86, baseY + 0.03, 0.33);

  addPlantGauge(group, 0.3, topY + 0.09, 0.1);
  addPlantGauge(group, -0.18, topY + 0.1, 0.22);
  addTube(group, [
    new THREE.Vector3(0, topY + 0.02, -0.32),
    new THREE.Vector3(0, topY + 0.24, -0.4),
    new THREE.Vector3(0, topY + 0.26, -1.15),
  ], 0.02, steel);
  return group;
}

function addGasjarPlantShell(rig, demo, { r, h, hasGas, gasInlet, texture }) {
  const group = new THREE.Group();
  rig.group.add(group);
  const steel = industrialSteel();
  const dark = industrialDark();

  addMesh(group, new THREE.CylinderGeometry(r + 0.2, r + 0.24, 0.07, 44), dark, { y: 0.035 });
  addMesh(group, new THREE.TorusGeometry(r + 0.16, 0.018, 8, 44), steel, { y: 0.07, rx: Math.PI / 2, cast: false });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    addMesh(group, new THREE.BoxGeometry(0.16, 0.05, 0.12), dark, {
      x: Math.cos(a) * (r + 0.05), y: 0.025, z: Math.sin(a) * (r + 0.05), ry: -a,
    });
  }

  [-0.42, 0, 0.42].forEach((x) => {
    addMesh(group, new THREE.CylinderGeometry(0.014, 0.014, h + 0.12, 8), steel, { x, y: (h + 0.12) / 2, z: -0.52 });
  });
  addMesh(group, new THREE.TorusGeometry(r + 0.03, 0.014, 6, 44), steel, { y: h + 0.08, rx: Math.PI / 2 });
  addMesh(group, new THREE.TorusGeometry(r + 0.03, 0.012, 6, 44), steel, { y: 0.16, rx: Math.PI / 2 });
  addLadder(group, -0.78, -0.5, 1.35);

  if (!hasGas) {
    addMesh(group, new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.07, 44), steel, { y: h + 0.095 });
    addBoltRing(group, 0, h + 0.135, 0, { axis: 'y', r: r * 0.9, count: 10, size: 0.013, len: 0.03 });
  } else {
    addMesh(group, new THREE.TorusGeometry(r + 0.03, 0.02, 8, 44), new THREE.MeshStandardMaterial({
      color: 0x232a2d, roughness: 0.75,
    }), { y: h + 0.035, rx: Math.PI / 2 });
  }

  const mkCylinder = (x, color) => {
    addMesh(group, new THREE.CylinderGeometry(0.11, 0.11, 0.5, 20), industrialPaint(color), { x, y: 0.27, z: 0.28 });
    addMesh(group, new THREE.SphereGeometry(0.11, 18, 12), industrialPaint(color), { x, y: 0.52, z: 0.28 });
    addMesh(group, new THREE.CylinderGeometry(0.03, 0.03, 0.08, 10), steel, { x, y: 0.6, z: 0.28 });
    addMesh(group, new THREE.TorusGeometry(0.05, 0.012, 6, 16), dark, { x, y: 0.65, z: 0.28, rx: Math.PI / 2 });
    addValveWheel(group, x, 0.62, 0.28, { r: 0.055 });
  };
  mkCylinder(-1.42, 0x7fa3b5);
  mkCylinder(1.42, 0x8f9a78);
  addTube(group, [
    new THREE.Vector3(-1.42, 0.6, 0.28),
    new THREE.Vector3(-1.42, 0.85, 0.2),
    new THREE.Vector3(-1.05, 0.8, 0.08),
    new THREE.Vector3(-0.62, 0.66, 0.02),
  ], 0.022, steel);
  addValveWheel(group, -1.0, 0.8, 0.12, { r: 0.06 });
  addTube(group, [
    new THREE.Vector3(1.42, 0.6, 0.28),
    new THREE.Vector3(1.42, 0.85, 0.2),
    new THREE.Vector3(1.05, 0.8, 0.08),
    new THREE.Vector3(0.62, 0.66, 0.02),
  ], 0.022, steel);
  addValveWheel(group, 1.0, 0.8, 0.12, { r: 0.06 });
  if (gasInlet) {
    addTube(group, [
      new THREE.Vector3(-1.42, 0.85, 0.2),
      new THREE.Vector3(-0.9, 1.0, 0.1),
      new THREE.Vector3(-0.42, 0.82, 0.02),
      new THREE.Vector3(-0.28, 0.62, 0),
    ], 0.022, steel);
  }

  addTube(group, [
    new THREE.Vector3(0.2, h + (hasGas ? 0.1 : 0.14), -0.22),
    new THREE.Vector3(0.2, h + 0.55, -0.28),
    new THREE.Vector3(0.95, h + 0.55, -0.5),
    new THREE.Vector3(1.18, 0.85, -0.72),
  ], 0.024, steel);
  addMesh(group, new THREE.CylinderGeometry(0.2, 0.22, 0.66, 24), industrialPaint(0x4c7386), { x: 1.22, y: 0.33, z: -0.8 });
  addMesh(group, new THREE.SphereGeometry(0.2, 20, 12), industrialPaint(0x4c7386), { x: 1.22, y: 0.66, z: -0.8 });
  addMesh(group, new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10), steel, { x: 1.22, y: 0.85, z: -0.8 });
  addValveWheel(group, 1.22, 1.0, -0.8, { r: 0.06 });
  addPlantGauge(group, 0.36, h + 0.16, -0.18);

  if (demo.flags.light) {
    addMesh(group, new THREE.CylinderGeometry(0.018, 0.018, 1.5, 8), steel, { x: -1.08, y: 0.75, z: 0.36 });
    addMesh(group, new THREE.CylinderGeometry(0.014, 0.014, 0.36, 8), steel, { x: -0.95, y: 1.5, z: 0.3, rz: Math.PI / 2.4 });
    addMesh(group, new THREE.CylinderGeometry(0.06, 0.08, 0.1, 16), dark, { x: -0.82, y: 1.62, z: 0.24, rz: 0.35 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      addMesh(group, new THREE.CylinderGeometry(0.004, 0.004, 0.13, 6), steel, {
        x: -0.82 + Math.cos(a) * 0.08, y: 1.55, z: 0.24 + Math.sin(a) * 0.08,
      });
    }
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xdff6ff, emissive: 0xa8e8ff, emissiveIntensity: 0, roughness: 0.15, metalness: 0.05,
      transparent: true, opacity: 0.92,
    });
    addMesh(group, new THREE.SphereGeometry(0.085, 22, 16), bulbMat, { x: -0.82, y: 1.55, z: 0.24 });
    rig.lampBulb = bulbMat;
    const glowMat = new THREE.SpriteMaterial({
      map: softTexture('rgba(255,255,255,.95)', 'rgba(190,235,255,0)', 128),
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.position.set(-0.82, 1.5, 0.24);
    glow.scale.set(0.55, 0.55, 1);
    group.add(glow);
    rig.lightGlow = glow;
  }
  return group;
}

function addCruciblePlantShell(rig, demo, texture) {
  const group = new THREE.Group();
  rig.group.add(group);
  const steel = industrialSteel();
  const dark = industrialDark();

  addMesh(group, new THREE.CylinderGeometry(0.5, 0.58, 0.07, 30), dark, { y: 0.035 });
  addMesh(group, new THREE.CylinderGeometry(0.16, 0.22, 0.5, 20), industrialDark(), { y: 0.31 });
  addMesh(group, new THREE.CylinderGeometry(0.42, 0.46, 0.07, 30), steel, { y: 0.575 });
  addMesh(group, new THREE.TorusGeometry(0.44, 0.016, 8, 36), dark, { y: 0.61, rx: Math.PI / 2, cast: false });

  addMesh(group, new THREE.TorusGeometry(0.56, 0.026, 8, 40), safetyYellow(), { y: 0.5, rx: Math.PI / 2, cast: false });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const x = Math.cos(a) * 0.56;
    const z = Math.sin(a) * 0.56;
    addMesh(group, new THREE.CylinderGeometry(0.026, 0.034, 0.08, 10), dark, { x, y: 0.545, z });
    const outer = makeFlame(group, texture, x, 0.63, z, 0.1, 0.2);
    outer.mat.color.set(0x6aa8ff);
    outer.role = 'outer';
    const core = makeFlame(group, texture, x, 0.61, z, 0.045, 0.1);
    core.mat.color.set(0xffd9a2);
    core.role = 'core';
    rig.flames.push(outer, core);
  }
  const light = new THREE.PointLight(0xffa04a, 0, 3.4, 2);
  light.position.set(0, 0.85, 0);
  group.add(light);
  if (!rig.flameLight) rig.flameLight = light;

  for (const x of [-0.64, 0.64]) {
    for (const z of [-0.58, 0.58]) {
      addMesh(group, new THREE.BoxGeometry(0.08, 1.34, 0.08), dark, { x, y: 0.67, z });
    }
  }
  [0.1, 1.3].forEach((y) => {
    addMesh(group, new THREE.BoxGeometry(1.42, 0.07, 0.07), dark, { y, z: -0.58 });
    addMesh(group, new THREE.BoxGeometry(1.42, 0.07, 0.07), dark, { y, z: 0.58 });
    addMesh(group, new THREE.BoxGeometry(0.07, 0.07, 1.22), dark, { x: -0.64, y, z: 0 });
    addMesh(group, new THREE.BoxGeometry(0.07, 0.07, 1.22), dark, { x: 0.64, y, z: 0 });
  });
  const brickMat = new THREE.MeshStandardMaterial({ color: 0x8a6f5c, roughness: 0.95, metalness: 0.03 });
  addMesh(group, new THREE.BoxGeometry(1.26, 0.9, 0.07), brickMat, { y: 0.55, z: -0.62 });
  addMesh(group, new THREE.BoxGeometry(0.07, 0.9, 0.55), brickMat, { x: -0.66, y: 0.55, z: -0.32 });
  addMesh(group, new THREE.BoxGeometry(0.07, 0.9, 0.55), brickMat, { x: 0.66, y: 0.55, z: -0.32 });

  const hood = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.5, 0.32, 28, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x7c8b93, metalness: 0.7, roughness: 0.45, side: THREE.DoubleSide }),
  );
  hood.position.set(0, 1.7, 0);
  group.add(hood);
  addMesh(group, new THREE.CylinderGeometry(0.15, 0.15, 0.55, 20), industrialPaint(0x6d7c84), { y: 2.12, z: 0 });
  addPipeFlange(group, 0, 1.86, 0, 'y', 0.17);
  addTube(group, [
    new THREE.Vector3(0, 2.35, 0),
    new THREE.Vector3(0, 2.48, -0.5),
    new THREE.Vector3(0, 2.48, -1.5),
  ], 0.15, industrialPaint(0x6d7c84));

  addMesh(group, new THREE.CylinderGeometry(0.03, 0.03, 1.3, 10), industrialSteel(), {
    x: -0.55, y: 0.15, z: 0.55, rz: Math.PI / 2, ry: -0.5,
  });
  addValveWheel(group, -0.95, 0.18, 0.72, { r: 0.07 });
  addPlantGauge(group, 0.2, 1.32, 0.57, 0);

  const cabinet = new THREE.Group();
  cabinet.position.set(1.24, 0, 0.12);
  group.add(cabinet);
  addMesh(cabinet, new THREE.BoxGeometry(0.4, 0.72, 0.26), industrialPaint(0x2f4650), { y: 0.36 });
  addPlantScreen(cabinet, 0, 0.5, 0.133, 'F-301', ['T 860 ℃', 'AIR OK', 'RUN']);
  addMesh(cabinet, new THREE.BoxGeometry(0.44, 0.04, 0.3), dark, { y: 0.73 });
  addMesh(cabinet, new THREE.BoxGeometry(0.44, 0.03, 0.3), dark, { y: 0.02 });
  addSignBoard(group, -1.02, 0.88, 0.54, { title: '高温 · 当心烫伤', subtitle: 'F-301 焙烧炉 · 禁止靠近', ry: 0.42, w: 0.62, h: 0.2 });
  return group;
}

function addTubePlantShell(rig, demo, { tubeY, rad, len, texture }) {
  const group = new THREE.Group();
  rig.group.add(group);
  const steel = industrialSteel();
  const dark = industrialDark();

  [-1, 1].forEach((side) => {
    const x = side * (len / 2 + 0.035);
    addMesh(group, new THREE.CylinderGeometry(0.31, 0.31, 0.07, 32), steel, { x, y: tubeY, rz: Math.PI / 2 });
    addMesh(group, new THREE.TorusGeometry(0.3, 0.018, 8, 32), dark, { x: side * (len / 2 + 0.075), y: tubeY, ry: Math.PI / 2 });
    addBoltRing(group, side * (len / 2 + 0.08), tubeY, 0, { axis: 'x', r: 0.26, count: 8, size: 0.013, len: 0.04 });
    addMesh(group, new THREE.CylinderGeometry(0.075, 0.075, 0.26, 16), steel, {
      x: side * (len / 2 + 0.2), y: tubeY, rz: Math.PI / 2,
    });
  });

  [-0.45, 0.45].forEach((x) => {
    addMesh(group, new THREE.BoxGeometry(0.22, 0.68, 0.34), dark, { x, y: 0.34, z: 0 });
    addMesh(group, new THREE.BoxGeometry(0.26, 0.1, 0.4), industrialPaint(0x3c4c55), { x, y: 0.72, z: 0 });
  });

  addMesh(group, new THREE.BoxGeometry(1.24, 0.08, 0.18), dark, { y: 0.62 });
  for (let i = 0; i < 4; i++) {
    const x = -0.45 + i * 0.3;
    addMesh(group, new THREE.CylinderGeometry(0.026, 0.032, 0.08, 10), steel, { x, y: 0.66 });
    const outer = makeFlame(group, texture, x, 0.72, 0.2, 0.11, 0.2);
    outer.mat.color.set(0x74baff);
    outer.role = 'outer';
    const core = makeFlame(group, texture, x, 0.7, 0.2, 0.05, 0.1);
    core.mat.color.set(0xffd9a2);
    core.role = 'core';
    rig.flames.push(outer, core);
  }
  const light = new THREE.PointLight(0x6fb2ff, 0, 3.2, 2);
  light.position.set(0, 0.8, 0);
  group.add(light);
  if (!rig.flameLight) rig.flameLight = light;

  [-0.42, 0, 0.42].forEach((x) => {
    addMesh(group, new THREE.TorusGeometry(0.25, 0.014, 6, 32), insulationMat(), { x, y: tubeY, ry: Math.PI / 2, cast: false });
  });

  addMesh(group, new THREE.CylinderGeometry(0.13, 0.13, 0.56, 20), industrialPaint(0x5f7f8a), { x: -1.36, y: 0.3, z: 0.2 });
  addMesh(group, new THREE.SphereGeometry(0.13, 20, 12), industrialPaint(0x5f7f8a), { x: -1.36, y: 0.58, z: 0.2 });
  addMesh(group, new THREE.CylinderGeometry(0.03, 0.03, 0.12, 10), industrialSteel(), { x: -1.36, y: 0.7, z: 0.2 });
  addValveWheel(group, -1.36, 0.73, 0.2, { r: 0.055 });
  addMesh(group, new THREE.TorusGeometry(0.135, 0.012, 6, 20), safetyYellow(), { x: -1.36, y: 0.28, z: 0.2, rx: Math.PI / 2, cast: false });

  addTube(group, [
    new THREE.Vector3(-1.36, 0.73, 0.2),
    new THREE.Vector3(-1.2, 0.88, 0.14),
    new THREE.Vector3(-1.02, 0.99, 0.06),
    new THREE.Vector3(-0.88, tubeY, 0),
  ], 0.026, steel);
  addValveWheel(group, -1.11, 0.94, 0.1, { r: 0.055 });
  addPlantGauge(group, -1.12, 0.78, 0.22);
  addTube(group, [
    new THREE.Vector3(0.95, tubeY, 0),
    new THREE.Vector3(1.06, 1.14, 0),
    new THREE.Vector3(1.08, 1.28, 0),
  ], 0.026, steel);
  addMesh(group, new THREE.CylinderGeometry(0.055, 0.07, 0.1, 12), dark, { x: 1.08, y: 1.31, z: 0 });
  addPipeFlange(group, 1.0, 1.02, 0, 'z', 0.05);
  addSignBoard(group, -0.55, 1.5, -0.62, { title: 'P-401 管式反应器', subtitle: '固定床 · 外加热 · 尾气处理', w: 0.86, h: 0.26 });
  return group;
}

function addTroughPlantShell(rig, demo, { w, d, h }) {
  const group = new THREE.Group();
  rig.group.add(group);
  const steel = industrialSteel();
  const dark = industrialDark();

  addMesh(group, new THREE.BoxGeometry(w + 0.18, 0.1, 0.1), industrialPaint(0x4a606b), { y: h + 0.03, z: d / 2 });
  addMesh(group, new THREE.BoxGeometry(w + 0.18, 0.1, 0.1), industrialPaint(0x4a606b), { y: h + 0.03, z: -d / 2 });
  addMesh(group, new THREE.BoxGeometry(0.1, 0.1, d + 0.02), industrialPaint(0x4a606b), { x: w / 2, y: h + 0.03 });
  addMesh(group, new THREE.BoxGeometry(0.1, 0.1, d + 0.02), industrialPaint(0x4a606b), { x: -w / 2, y: h + 0.03 });
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      addMesh(group, new THREE.BoxGeometry(0.08, h + 0.08, 0.08), dark, {
        x: (sx * w) / 2, y: (h + 0.08) / 2, z: (sz * d) / 2,
      });
    });
  });
  addMesh(group, new THREE.BoxGeometry(w + 0.1, 0.03, 0.08), safetyYellow(), { y: h + 0.075, z: d / 2 + 0.06, cast: false });

  [-w / 2, 0, w / 2].forEach((x) => {
    addMesh(group, new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), safetyYellow(), { x, y: h + 0.3, z: -d / 2 });
  });
  [h + 0.24, h + 0.5].forEach((y) => {
    addMesh(group, new THREE.CylinderGeometry(0.011, 0.011, w, 8), safetyYellow(), { y, z: -d / 2, rz: Math.PI / 2, cast: false });
  });

  addTube(group, [
    new THREE.Vector3(-1.55, 0.12, -0.35),
    new THREE.Vector3(-1.35, 0.3, -0.32),
    new THREE.Vector3(-1.2, 0.6, -0.2),
    new THREE.Vector3(-w / 2 - 0.02, 0.64, 0.08),
  ], 0.03, steel);
  addValveWheel(group, -1.3, 0.42, -0.28);
  addTube(group, [
    new THREE.Vector3(w / 2 + 0.01, 0.18, 0),
    new THREE.Vector3(w / 2 + 0.2, 0.18, 0.2),
    new THREE.Vector3(w / 2 + 0.22, 0.06, 0.55),
  ], 0.03, steel);
  addValveWheel(group, w / 2 + 0.16, 0.2, 0.32, { r: 0.06 });

  addMesh(group, new THREE.CylinderGeometry(0.035, 0.035, 0.46, 12), glassMaterial(), { x: -w / 2 - 0.08, y: 0.36, z: d / 2 + 0.01, cast: false });
  addMesh(group, new THREE.CylinderGeometry(0.024, 0.024, 0.36, 10), liquidMaterial(0x7fd0e4), { x: -w / 2 - 0.08, y: 0.32, z: d / 2 + 0.01, cast: false });
  addMesh(group, new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), steel, { x: -w / 2 - 0.08, y: 0.3, z: d / 2 + 0.05 });

  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.06, 0.24, 22, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x546872, metalness: 0.6, roughness: 0.48, side: THREE.DoubleSide }),
  );
  cone.position.set(0, 1.26, 0);
  group.add(cone);
  addMesh(group, new THREE.CylinderGeometry(0.055, 0.055, 0.34, 14), steel, { y: 1.0 });
  addMesh(group, new THREE.BoxGeometry(0.16, 0.07, 0.12), dark, { y: 0.86 });
  addValveWheel(group, 0.12, 0.9, 0.02, { r: 0.06 });
  [-0.18, 0.18].forEach((x) => {
    addMesh(group, new THREE.BoxGeometry(0.025, 0.36, 0.025), steel, { x, y: h + 0.24, z: 0.02, rx: 0.28 });
  });
  return group;
}

function addCellPlantShell(rig, demo, { w, d, h, molten }) {
  const group = new THREE.Group();
  rig.group.add(group);
  const steel = industrialSteel();
  const dark = industrialDark();
  const copper = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.9, roughness: 0.3 });

  addMesh(group, new THREE.BoxGeometry(w + 0.16, 0.1, 0.1), industrialPaint(0x35505c), { y: h + 0.03, z: d / 2 });
  addMesh(group, new THREE.BoxGeometry(w + 0.16, 0.1, 0.1), industrialPaint(0x35505c), { y: h + 0.03, z: -d / 2 });
  addMesh(group, new THREE.BoxGeometry(0.1, 0.1, d + 0.02), industrialPaint(0x35505c), { x: w / 2, y: h + 0.03 });
  addMesh(group, new THREE.BoxGeometry(0.1, 0.1, d + 0.02), industrialPaint(0x35505c), { x: -w / 2, y: h + 0.03 });
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      addMesh(group, new THREE.BoxGeometry(0.08, h + 0.08, 0.08), dark, {
        x: (sx * w) / 2, y: (h + 0.08) / 2, z: (sz * d) / 2,
      });
    });
  });

  const clampX = [-0.52, 0.52];
  clampX.forEach((x) => {
    addMesh(group, new THREE.BoxGeometry(0.1, 0.08, 0.12), copper, { x, y: 0.92 });
    addTube(group, [
      new THREE.Vector3(x, 0.96, 0),
      new THREE.Vector3(x, 1.06, -0.22),
      new THREE.Vector3(x * 0.55, 1.12, -0.44),
      new THREE.Vector3(0, 1.12, -0.52),
    ], 0.026, copper);
  });

  if (!demo.isBattery) {
    addMesh(group, new THREE.BoxGeometry(0.72, 0.36, 0.24), industrialPaint(0x24363e), { y: 1.15, z: -0.66 });
    addMesh(group, new THREE.BoxGeometry(0.76, 0.04, 0.28), dark, { y: 1.34, z: -0.66 });
    addPlantScreen(group, 0, 1.16, -0.537, 'RECT', ['U 6.0 V', 'I 12.5 A', 'RUN']);
    addMesh(group, new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8), new THREE.MeshStandardMaterial({ color: 0x4fe0a0, emissive: 0x2fae7c, emissiveIntensity: 0.8 }), { x: 0.28, y: 1.28, z: -0.537, rx: Math.PI / 2 });
    addMesh(group, new THREE.BoxGeometry(0.72, 0.02, 0.24), dark, { y: 0.97, z: -0.66 });
  } else {
    addTube(group, [
      new THREE.Vector3(-0.52, 0.96, 0),
      new THREE.Vector3(-0.3, 1.12, -0.28),
      new THREE.Vector3(-0.13, 1.2, -0.42),
    ], 0.02, new THREE.MeshStandardMaterial({ color: 0x2f3a42, roughness: 0.6 }));
    addTube(group, [
      new THREE.Vector3(0.52, 0.96, 0),
      new THREE.Vector3(0.3, 1.12, -0.28),
      new THREE.Vector3(0.13, 1.2, -0.42),
    ], 0.02, new THREE.MeshStandardMaterial({ color: 0xb8452f, roughness: 0.6 }));
  }

  addMesh(group, new THREE.CylinderGeometry(0.02, 0.02, 0.045, 8), new THREE.MeshStandardMaterial({ color: 0xff8a3d, emissive: 0xff5a14, emissiveIntensity: 0.5 }), {
    x: 0.74, y: 0.96, z: 0.46, rx: Math.PI / 2,
  });

  addMesh(group, new THREE.CylinderGeometry(0.17, 0.17, 0.6, 18, 1, true), industrialPaint(0x556b76), { x: 0.62, y: 1.5, z: -0.3 });
  addMesh(group, new THREE.CylinderGeometry(0.17, 0.44, 0.28, 24, 1, true), new THREE.MeshStandardMaterial({
    color: 0x627782, metalness: 0.6, roughness: 0.48, side: THREE.DoubleSide,
  }), { x: 0.62, y: 1.14, z: -0.3 });
  addTube(group, [
    new THREE.Vector3(0.62, 1.8, -0.3),
    new THREE.Vector3(0.62, 2.0, -0.75),
    new THREE.Vector3(0.62, 2.0, -1.5),
  ], 0.14, industrialPaint(0x556b76));
  addSignBoard(group, -0.2, 1.5, 0.62, { title: '有毒气体 · 强制排风', subtitle: 'E-601 电解槽 · 严禁烟火', w: 0.8, h: 0.24 });
  if (molten) {
    addMesh(group, new THREE.TorusGeometry(0.42, 0.035, 8, 32), safetyYellow(), { x: -0.52, y: 0.9, rx: Math.PI / 2, cast: false });
  }
  return group;
}

function addProductTray(demo, rig, x, mode = 'lab') {
  const plant = mode === 'plant';
  const group = new THREE.Group();
  group.position.set(x, 0, 0.74);
  const w = plant ? 0.72 : 0.62;
  const dpt = plant ? 0.4 : 0.32;
  addMesh(group, new THREE.BoxGeometry(w, 0.045, dpt), plant ? industrialDark() : steelMaterial(), { y: 0.022 });
  addMesh(group, new THREE.BoxGeometry(w - 0.06, 0.02, dpt - 0.04), darkMaterial(), { y: 0.052 });
  if (plant) {
    addMesh(group, new THREE.BoxGeometry(w, 0.03, 0.05), industrialSteel(), { y: 0.075, z: -dpt / 2 + 0.02 });
    addMesh(group, new THREE.BoxGeometry(w, 0.03, 0.05), industrialSteel(), { y: 0.075, z: dpt / 2 - 0.02 });
    addMesh(group, new THREE.BoxGeometry(w, 0.06, 0.03), safetyYellow(), { y: 0.07, z: dpt / 2 + 0.015, cast: false });
    [-1, 1].forEach((s) => {
      addMesh(group, new THREE.BoxGeometry(0.05, 0.03, dpt), industrialDark(), { x: s * (w / 2 - 0.02), y: 0.01 });
    });
  }

  const vials = [];
  const defs = [{ x: -0.12, color: demo.colors.product }];
  if (demo.hasPpt) defs.push({ x: 0.12, color: demo.colors.ppt });
  else if (demo.hasGas) defs.push({ x: 0.12, color: demo.colors.gas });
  defs.forEach(({ x: vx, color }) => {
    const rv = plant ? 0.1 : 0.085;
    const hv = plant ? 0.4 : 0.34;
    addMesh(group, new THREE.CylinderGeometry(rv, rv, hv, 22, 1, true), glassMaterial(), { x: vx, y: 0.09 + hv / 2, cast: false });
    addMesh(group, new THREE.CylinderGeometry(rv + 0.004, rv + 0.004, 0.03, 22), plant ? industrialSteel() : steelMaterial(), { x: vx, y: 0.075 });
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 });
    const fill = addMesh(group, new THREE.CylinderGeometry(rv - 0.017, rv - 0.017, hv - 0.08, 20), mat, {
      x: vx, y: 0.09 + (hv - 0.08) / 2 + 0.01, cast: false, receive: false,
    });
    addMesh(group, new THREE.CylinderGeometry(rv + 0.006, rv + 0.006, 0.022, 20), plant ? industrialSteel() : steelMaterial(), {
      x: vx, y: 0.09 + hv + 0.011, cast: false,
    });
    if (plant) {
      addMesh(group, new THREE.CylinderGeometry(rv + 0.012, rv + 0.012, 0.014, 20), safetyYellow(), { x: vx, y: 0.085, cast: false });
    }
    vials.push({ fill, mat });
  });

  rig.group.add(group);
  rig.vials = vials;
  rig.labels.product = new THREE.Vector3(x, plant ? 0.66 : 0.55, 0.74);
}

/* ------------------------------------------------------------
   Apparatus builders
   ------------------------------------------------------------ */

function buildBeaker(demo, rig, texture, mode = 'lab') {
  const plant = mode === 'plant';
  const r = 0.62;
  const h = 1.0;
  const level = 0.5;
  const heat = demo.flags.heat || demo.flags.flame;
  const baseY = heat ? 0.6 : 0;
  const vessel = new THREE.Group();
  vessel.position.y = baseY;
  rig.group.add(vessel);

  if (heat && !plant) {
    addTripod(rig.group, { radius: 0.5, height: 0.56 });
    addGauze(rig.group, 0.572);
    addAlcoholLamp(rig.group, texture, rig);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.016, 8, 48), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.582;
    rig.group.add(ring);
    rig.heatRing = ring;
  }

  addMesh(vessel, new THREE.CylinderGeometry(r, r - 0.02, h, 46, 1, true), glassMaterial(), { y: h / 2, cast: false });
  addMesh(vessel, new THREE.CylinderGeometry(r - 0.02, r - 0.02, 0.03, 46), glassMaterial(), { y: 0.015, cast: false });
  addMesh(vessel, new THREE.TorusGeometry(r - 0.005, 0.012, 6, 46), glassMaterial(), { y: h, rx: Math.PI / 2, cast: false });
  if (!plant) addGraduations(vessel, r, 0.2, 0.14, 5);

  const liquidMat = liquidMaterial(demo.liquid.from.color);
  liquidMat.opacity = demo.liquid.from.opacity;
  addMesh(vessel, new THREE.CylinderGeometry(r - 0.045, r - 0.05, level, 42), liquidMat, { y: level / 2 + 0.02, cast: false });
  const surfaceMat = new THREE.MeshPhysicalMaterial({
    color: 0xc9e8f5, transparent: true, opacity: 0.5, roughness: 0.06, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false,
  });
  addMesh(vessel, new THREE.CircleGeometry(r - 0.046, 42), surfaceMat, { y: level + 0.022, rx: -Math.PI / 2, cast: false });
  rig.surfaceMat = surfaceMat;

  if (demo.colors.solidSample) {
    const strip = demo.solidForm === 'strip';
    const solidMat = new THREE.MeshStandardMaterial({
      color: demo.colors.solid,
      roughness: strip ? 0.32 : 0.72,
      metalness: strip ? 0.78 : 0.2,
    });
    const solid = strip
      ? addMesh(vessel, new THREE.BoxGeometry(0.3, 0.42, 0.036), solidMat, {
        x: -0.16, y: 0.32, z: 0.08, rz: 0.06, ry: 0.4,
      })
      : addMesh(vessel, new THREE.IcosahedronGeometry(0.13, 0), solidMat, {
        x: -0.16, y: 0.09, z: 0.08, rx: 0.6, ry: 0.4,
      });
    if (!strip) solid.scale.set(1, 0.75, 0.9);
    rig.solid = solid;
    rig.solidStrip = strip;
    rig.solidMat = solidMat;
    rig.bubbleOrigin = new THREE.Vector3(-0.16, baseY + 0.14, 0.08);

    if (demo.deposit) {
      const depMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(demo.deposit.color).lerp(new THREE.Color(0xa63c14), 0.45),
        metalness: 0.32, roughness: 0.5, transparent: true, opacity: 0,
      });
      const layer = strip
        ? addMesh(vessel, new THREE.BoxGeometry(0.304, 0.42, 0.05), depMat, {
          x: -0.16, y: 0.32, z: 0.08, rz: 0.06, ry: 0.4,
        })
        : addMesh(vessel, new THREE.IcosahedronGeometry(0.142, 0), depMat, {
          x: -0.16, y: 0.09, z: 0.08, rx: 0.6, ry: 0.4,
        });
      layer.scale.set(strip ? 1.02 : 0.01, 0.01, strip ? 1.25 : 0.01);
      layer.position.y = strip ? 0.11 : 0.09;
      layer.renderOrder = 1;
      rig.depositLayer = layer;
      rig.depositMat = depMat;
    }
  }

  if (!plant) {
    addMesh(vessel, new THREE.CylinderGeometry(0.012, 0.012, 1.2, 10), glassMaterial(), {
      x: 0.44, y: 0.55, z: 0.12, rz: -0.14, cast: false,
    });
    addMesh(vessel, new THREE.SphereGeometry(0.017, 10, 8), glassMaterial(), {
      x: 0.525, y: 1.13, z: 0.12, cast: false,
    });
  }

  if (!plant && (heat || demo.exotherm || demo.endotherm)) {
    addThermometer(vessel, rig, { x: -0.42, z: 0.22, bottomY: 0.09, topY: 1.06 });
  }

  if (demo.gasInlet) {
    const gasReactant = demo.reactants.find((item) => item.gas);
    if (!plant) {
      const tubeMat = rubberMaterial();
      addTube(rig.group, [
        new THREE.Vector3(-1.15, 1.55, -0.12),
        new THREE.Vector3(-0.8, 1.62, -0.02),
        new THREE.Vector3(-0.5, 1.45, 0.06),
        new THREE.Vector3(-0.34, baseY + 0.18, 0.02),
      ], 0.026, tubeMat);
    }
    rig.inletLabel = gasReactant ? gasReactant.formula : '';
  }

  const showSediment = demo.hasPpt || demo.smoke;
  const sedimentMat = new THREE.MeshBasicMaterial({
    color: demo.pptInitial ? demo.colors.pptFrom : demo.colors.ppt,
    transparent: true, opacity: 0, depthWrite: false,
  });
  const sediment = addMesh(vessel, new THREE.CylinderGeometry(r - 0.09, r - 0.11, 0.02, 36), sedimentMat, {
    y: 0.03, cast: false, receive: false,
  });
  sediment.visible = showSediment;
  rig.sediment = sediment;
  rig.sedimentMat = sedimentMat;
  rig.pptStyle = demo.pptStyle;

  rig.liquidMat = liquidMat;
  rig.arch = 'beaker';
  if (plant) addBeakerPlantShell(rig, demo, { baseY, r, h, heat, texture });
  rig.surfaceY = baseY + level;
  rig.bottomY = baseY + 0.05;
  rig.radius = r - 0.1;
  rig.bubbleTop = baseY + level - 0.02;
  rig.bubbleBottom = baseY + 0.08;
  rig.bubbleRate = 24;
  rig.smokeAnchor = new THREE.Vector3(0, baseY + h + 0.05, 0);
  rig.steamAnchor = new THREE.Vector3(0, baseY + level + 0.12, 0);
  rig.boomPos = new THREE.Vector3(0, baseY + 0.55, 0);
  rig.labels.name = plant ? new THREE.Vector3(-0.42, baseY + h + 0.66, -0.1) : new THREE.Vector3(0, baseY + h + 0.16, 0);
  rig.labels.gas = new THREE.Vector3(r + 0.22, baseY + level + 0.16, 0);
  rig.labels.ppt = new THREE.Vector3(-r - 0.18, baseY + 0.22, 0);
  rig.labels.flame = new THREE.Vector3(0, baseY + h + 0.42, 0);
  rig.labels.mist = new THREE.Vector3(r + 0.2, baseY + level + 0.34, 0);
  rig.labels.smoke = new THREE.Vector3(-r - 0.05, baseY + h + 0.3, 0);
  rig.labels.indicator = new THREE.Vector3(-r - 0.16, baseY + level - 0.02, 0);
  rig.arc = null;
  return rig;
}

function buildGasjar(demo, rig, texture, coolTexture, mode = 'lab') {
  const plant = mode === 'plant';
  const r = 0.55;
  const h = 1.02;
  const jar = new THREE.Group();
  rig.group.add(jar);

  const jarGlass = glassMaterial();
  jarGlass.opacity = 0.17;
  addMesh(jar, new THREE.CylinderGeometry(r, r - 0.02, h, 44, 1, true), jarGlass, { y: h / 2, cast: false });
  addMesh(jar, new THREE.CylinderGeometry(r - 0.02, r - 0.02, 0.03, 44), glassMaterial(), { y: 0.015, cast: false });
  addMesh(jar, new THREE.TorusGeometry(r - 0.004, 0.012, 6, 44), glassMaterial(), { y: h, rx: Math.PI / 2, cast: false });
  if (!plant) addGraduations(jar, r, 0.24, 0.2, 4);

  const gasMat = new THREE.MeshBasicMaterial({
    color: demo.colors.gasFrom, transparent: true, opacity: demo.hasGas || demo.gasInlet ? 0.16 : 0.05, depthWrite: false,
  });
  addMesh(jar, new THREE.CylinderGeometry(r - 0.05, r - 0.05, h - 0.14, 40), gasMat, { y: h / 2 - 0.02, cast: false, receive: false });
  rig.gasMat = gasMat;

  if (!plant) {
    addMesh(jar, new THREE.CylinderGeometry(r + 0.035, r + 0.035, 0.055, 44), glassMaterial(), { y: h + 0.03, cast: false });
    if (!demo.hasGas) {
      addMesh(jar, new THREE.SphereGeometry(0.055, 16, 12), glassMaterial(), { y: h + 0.095, cast: false });
    }
  }

  if (demo.hasGas && !plant) {
    const coverMat = glassMaterial();
    coverMat.opacity = 0.36;
    const cover = new THREE.Group();
    cover.position.set(0, h + 0.42, 0);
    addMesh(cover, new THREE.BoxGeometry(0.78, 0.024, 0.78), coverMat, { cast: false });
    addMesh(cover, new THREE.SphereGeometry(0.034, 12, 10), coverMat, { x: 0.29, y: 0.032, z: 0.29, cast: false });
    jar.add(cover);
    rig.cover = cover;
    rig.coverY = { from: h + 0.42, to: h + 0.07 };
  }

  const sedimentMat = new THREE.MeshBasicMaterial({
    color: demo.pptInitial ? demo.colors.pptFrom : (demo.hasPpt ? demo.colors.ppt : demo.colors.smoke),
    transparent: true, opacity: 0, depthWrite: false,
  });
  const sediment = addMesh(jar, new THREE.CylinderGeometry(r - 0.12, r - 0.14, 0.02, 34), sedimentMat, { y: 0.04, cast: false, receive: false });
  sediment.visible = demo.hasPpt || demo.smoke;
  rig.sediment = sediment;
  rig.sedimentMat = sedimentMat;
  rig.pptStyle = demo.pptStyle;

  if (!plant) {
    const stand = new THREE.Group();
    stand.position.set(-0.98, 0, -0.13);
    rig.group.add(stand);
    addMesh(stand, new THREE.BoxGeometry(0.52, 0.05, 0.36), darkMaterial(), { y: 0.025 });
    addMesh(stand, new THREE.CylinderGeometry(0.022, 0.022, 1.7, 12), steelMaterial(), { y: 0.88 });
    addMesh(stand, new THREE.CylinderGeometry(0.018, 0.018, 0.55, 10), steelMaterial(), { x: 0.26, y: 1.24, rz: Math.PI / 2 });
    addMesh(stand, new THREE.TorusGeometry(0.1, 0.016, 6, 18), darkMaterial(), { x: 0.48, y: 1.24, rx: Math.PI / 2 });
    const padMat = rubberMaterial();
    addMesh(stand, new THREE.BoxGeometry(0.026, 0.05, 0.14), padMat, { x: 0.41, y: 1.24, z: 0.055 });
    addMesh(stand, new THREE.BoxGeometry(0.026, 0.05, 0.14), padMat, { x: 0.41, y: 1.24, z: -0.055 });
    addMesh(stand, new THREE.BoxGeometry(0.16, 0.02, 0.05), darkMaterial(), { x: 0.3, y: 1.32 });
  }

  const inletPoint = new THREE.Vector3(-0.28, 0.6, 0);
  if (demo.gasInlet) {
    if (!plant) {
      addTube(rig.group, [
        new THREE.Vector3(-0.95, 1.27, -0.13),
        new THREE.Vector3(-0.7, 1.34, -0.05),
        new THREE.Vector3(-0.42, 1.24, 0.04),
        new THREE.Vector3(-0.36, 0.95, 0.02),
        new THREE.Vector3(-0.3, 0.62, 0),
      ], 0.025, rubberMaterial());
    }
    const gasReactant = demo.reactants.find((item) => item.gas);
    rig.inletLabel = gasReactant ? gasReactant.formula : '';
    rig.bubbleOrigin = inletPoint;
  }

  if (demo.flags.flame) {
    const flameTex = isCoolFlame(demo.colors.flame) ? coolTexture : texture;
    const outer = makeFlame(jar, flameTex, 0, 0.58, 0, 0.36, 0.6);
    outer.mat.color.set(demo.colors.flame ?? 0xffcf6e);
    outer.role = 'outer';
    const core = makeFlame(jar, flameTex, 0, 0.5, 0, 0.16, 0.3);
    core.mat.color.set(demo.colors.flame2 ?? 0xffe6b0);
    core.role = 'core';
    rig.flames.push(outer, core);
    rig.flameMode = 'combustion';
    const light = new THREE.PointLight(demo.colors.flame ?? 0xffa04a, 0, 3.6, 2);
    light.position.set(0, 0.75, 0);
    jar.add(light);
    rig.flameLight = light;
  } else {
    rig.flameMode = 'none';
  }

  if (demo.flags.light && !plant) {
    const lamp = new THREE.Group();
    lamp.position.set(-1.22, 0, 0.46);
    rig.group.add(lamp);
    addMesh(lamp, new THREE.CylinderGeometry(0.16, 0.19, 0.05, 24), darkMaterial(), { y: 0.025 });
    addMesh(lamp, new THREE.CylinderGeometry(0.018, 0.018, 1.08, 10), steelMaterial(), { y: 0.56 });
    addMesh(lamp, new THREE.CylinderGeometry(0.014, 0.014, 0.22, 8), steelMaterial(), { x: 0.1, y: 1.08, rz: Math.PI / 2 });
    addMesh(lamp, new THREE.CylinderGeometry(0.055, 0.07, 0.1, 18), darkMaterial(), { x: 0.22, y: 1.02 });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xdff6ff, emissive: 0xa8e8ff, emissiveIntensity: 0, roughness: 0.15, metalness: 0.05,
      transparent: true, opacity: 0.92,
    });
    addMesh(lamp, new THREE.SphereGeometry(0.085, 22, 16), bulbMat, { x: 0.22, y: 0.9 });
    rig.lampBulb = bulbMat;

    const glowMat = new THREE.SpriteMaterial({
      map: softTexture('rgba(255,255,255,.95)', 'rgba(190,235,255,0)', 128),
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.position.set(-1.0, 0.9, 0.46);
    glow.scale.set(0.55, 0.55, 1);
    rig.group.add(glow);
    rig.lightGlow = glow;
  }

  rig.arch = 'gasjar';
  if (plant) addGasjarPlantShell(rig, demo, { r, h, hasGas: demo.hasGas, gasInlet: demo.gasInlet, texture });
  rig.surfaceY = h;
  rig.bottomY = 0.06;
  rig.smokeAnchor = new THREE.Vector3(0, 0.42, 0);
  rig.boomPos = new THREE.Vector3(0, 0.55, 0);
  rig.labels.name = new THREE.Vector3(0, h + (plant ? 0.34 : 0.26), 0);
  rig.labels.gas = new THREE.Vector3(r + 0.24, 0.7, 0);
  rig.labels.ppt = new THREE.Vector3(-r - 0.2, 0.18, 0);
  rig.labels.flame = new THREE.Vector3(0, h + 0.5, 0);
  rig.labels.mist = new THREE.Vector3(r + 0.22, h + 0.08, 0);
  rig.labels.smoke = new THREE.Vector3(-r - 0.16, h + 0.34, 0);
  rig.arc = null;
  return rig;
}

function buildCrucible(demo, rig, texture, mode = 'lab') {
  const plant = mode === 'plant';
  const stand = new THREE.Group();
  rig.group.add(stand);

  if (!plant) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.5;
      addMesh(stand, new THREE.CylinderGeometry(0.02, 0.024, 0.62, 10), darkMaterial(), {
        x: Math.cos(a) * 0.5, y: 0.31, z: Math.sin(a) * 0.5, rz: Math.cos(a) * 0.06, rx: Math.sin(a) * 0.06,
      });
    }
    addMesh(stand, new THREE.TorusGeometry(0.47, 0.024, 8, 40), darkMaterial(), { y: 0.62, rx: Math.PI / 2 });
    const clayMat = new THREE.MeshStandardMaterial({ color: 0xe7e0d2, roughness: 0.92 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + Math.PI / 2;
      addMesh(stand, new THREE.BoxGeometry(0.3, 0.026, 0.05), clayMat, {
        x: Math.cos(a) * 0.32, y: 0.638, z: Math.sin(a) * 0.32, ry: -a,
      });
    }
    addBurner(stand, 0, 0, texture, rig);
  }

  if (!plant) {
    const accessories = new THREE.Group();
    rig.group.add(accessories);
    const lid = new THREE.Group();
    lid.position.set(0.92, 0.02, 0.52);
    accessories.add(lid);
    addMesh(lid, new THREE.CylinderGeometry(0.23, 0.2, 0.035, 28), ceramicMaterial(), { y: 0.018, rx: 0.12 });
    const lidKnob = addMesh(lid, new THREE.SphereGeometry(0.045, 14, 10), ceramicMaterial(), { y: 0.06 });
    lidKnob.scale.set(1, 0.7, 1);
    const tongs = new THREE.Group();
    tongs.position.set(0.9, 0.02, 0.18);
    tongs.rotation.y = -0.5;
    accessories.add(tongs);
    const tongMat = steelMaterial();
    addTube(tongs, [
      new THREE.Vector3(-0.02, 0.018, 0), new THREE.Vector3(-0.14, 0.05, 0.02),
      new THREE.Vector3(-0.26, 0.09, 0.05), new THREE.Vector3(-0.34, 0.12, 0.08),
    ], 0.012, tongMat);
    addTube(tongs, [
      new THREE.Vector3(0.02, 0.018, 0), new THREE.Vector3(0.14, 0.05, 0.02),
      new THREE.Vector3(0.26, 0.09, 0.05), new THREE.Vector3(0.34, 0.12, 0.08),
    ], 0.012, tongMat);
    addMesh(tongs, new THREE.TorusGeometry(0.022, 0.009, 6, 14), tongMat, { y: 0.05, rx: Math.PI / 2 });
  }

  const crucible = new THREE.Group();
  crucible.position.y = 0;
  rig.group.add(crucible);
  const ceramic = ceramicMaterial();
  rig.crucibleMat = ceramic;
  addMesh(crucible, new THREE.CylinderGeometry(0.53, 0.35, 0.5, 36, 1, true), ceramic, { y: 0.85 });
  addMesh(crucible, new THREE.CylinderGeometry(0.35, 0.35, 0.03, 36), ceramic, { y: 0.61 });
  addMesh(crucible, new THREE.TorusGeometry(0.525, 0.018, 8, 40), ceramic, { y: 1.1, rx: Math.PI / 2 });

  const powderMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(demo.colors.solidMix ?? demo.colors.solid ?? 0xb8c0c4).multiplyScalar(0.8),
    roughness: 0.95, metalness: 0.05,
  });
  const powderGroup = new THREE.Group();
  powderGroup.position.y = 0.63;
  crucible.add(powderGroup);
  const powderGeo = new THREE.SphereGeometry(0.4, 46, 26);
  const powderPos = powderGeo.attributes.position;
  for (let i = 0; i < powderPos.count; i++) {
    const px = powderPos.getX(i);
    const py = powderPos.getY(i);
    const pz = powderPos.getZ(i);
    const n = 1 + (Math.sin(px * 26.3 + py * 18.7) + Math.sin(pz * 21.1 - py * 12.9)) * 0.008;
    powderPos.setXYZ(i, px * n, py * n, pz * n);
  }
  powderGeo.computeVertexNormals();
  const powder = addMesh(powderGroup, powderGeo, powderMat, { y: 0.2, cast: false });
  powder.scale.set(1, 0.32, 1);
  for (let i = 0; i < 14; i++) {
    const a = i * 2.399;
    const rr = 0.08 + ((i * 7) % 11) * 0.024;
    const lump = addMesh(powderGroup, new THREE.SphereGeometry(0.026 + (i % 3) * 0.009, 10, 8), powderMat, {
      x: Math.cos(a) * rr,
      y: 0.2 + 0.3 * Math.sqrt(Math.max(0, 0.16 - rr * rr)),
      z: Math.sin(a) * rr, cast: false,
    });
    lump.scale.y = 0.5;
  }
  rig.powderMat = powderMat;
  rig.powderGroup = powderGroup;

  if (demo.thermite) {
    const poolMat = new THREE.MeshStandardMaterial({
      color: 0x4a4f55, emissive: 0xff8c2a, emissiveIntensity: 0.2, roughness: 0.3, metalness: 0.85,
      transparent: true, opacity: 0,
    });
    const pool = addMesh(crucible, new THREE.CylinderGeometry(0.31, 0.33, 0.035, 32), poolMat, { y: 0.835, cast: false });
    pool.scale.setScalar(0.02);
    rig.moltenPool = pool;
    rig.moltenPoolMat = poolMat;
    const slagMat = new THREE.MeshStandardMaterial({
      color: 0xeef0ef, roughness: 0.92, metalness: 0.04, transparent: true, opacity: 0,
    });
    const slagRing = addMesh(crucible, new THREE.TorusGeometry(0.3, 0.05, 10, 32), slagMat, {
      y: 0.845, rx: Math.PI / 2, cast: false,
    });
    slagRing.scale.setScalar(0.02);
    rig.slagRing = slagRing;
    rig.slagMat = slagMat;
  }

  const glowMat = new THREE.SpriteMaterial({
    map: softTexture('rgba(255,242,206,.95)', 'rgba(255,150,50,0)', 128),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const crucibleGlow = new THREE.Sprite(glowMat);
  crucibleGlow.position.set(0, 1.22, 0);
  crucibleGlow.scale.set(0.4, 0.4, 1);
  crucible.add(crucibleGlow);
  rig.crucibleGlow = crucibleGlow;

  const sedimentMat = new THREE.MeshBasicMaterial({
    color: demo.hasPpt ? (demo.pptInitial ? demo.colors.pptFrom : demo.colors.ppt) : demo.colors.smoke,
    transparent: true, opacity: 0, depthWrite: false,
  });
  const crust = addMesh(crucible, new THREE.CylinderGeometry(0.31, 0.33, 0.02, 26), sedimentMat, { y: 0.625, cast: false, receive: false });
  crust.visible = demo.hasPpt || demo.smoke;
  rig.sediment = crust;
  rig.sedimentMat = sedimentMat;
  rig.pptStyle = demo.pptStyle;

  rig.arch = 'crucible';
  if (plant) addCruciblePlantShell(rig, demo, texture);
  rig.bottomY = 0.62;
  rig.smokeAnchor = new THREE.Vector3(0, 1.16, 0);
  rig.boomPos = new THREE.Vector3(0, 0.9, 0);
  rig.labels.name = plant ? new THREE.Vector3(-0.95, 1.44, 0.12) : new THREE.Vector3(0, 1.32, 0);
  rig.labels.gas = new THREE.Vector3(0.74, 1.22, 0);
  rig.labels.ppt = new THREE.Vector3(-0.74, 0.74, 0);
  rig.labels.flame = new THREE.Vector3(0, 1.62, 0);
  rig.labels.mist = new THREE.Vector3(0.74, 1.42, 0);
  rig.labels.smoke = new THREE.Vector3(-0.74, 1.55, 0);
  rig.arc = null;
  return rig;
}

function buildTube(demo, rig, texture, coolTexture, mode = 'lab') {
  const plant = mode === 'plant';
  const tubeY = 1.04;
  const rad = 0.24;
  const len = 1.7;
  const tube = addMesh(rig.group, new THREE.CylinderGeometry(rad, rad, len, 42, 1, true), (() => {
    const mat = glassMaterial();
    mat.opacity = 0.34;
    mat.color.setHex(0xd8eef7);
    return mat;
  })(), { y: tubeY, rz: Math.PI / 2, cast: false });

  const rimMat = glassMaterial();
  rimMat.opacity = 0.55;
  [-len / 2, len / 2].forEach((x) => {
    addMesh(rig.group, new THREE.TorusGeometry(rad, 0.012, 6, 40), rimMat, {
      x, y: tubeY, ry: Math.PI / 2, cast: false,
    });
  });

  if (!plant) {
    const stand = new THREE.Group();
    stand.position.set(-1.14, 0, -0.32);
    rig.group.add(stand);
    addMesh(stand, new THREE.BoxGeometry(0.5, 0.05, 0.36), darkMaterial(), { y: 0.025 });
    addMesh(stand, new THREE.CylinderGeometry(0.022, 0.022, 1.52, 12), steelMaterial(), { y: 0.78 });
    addMesh(stand, new THREE.CylinderGeometry(0.016, 0.016, 0.44, 10), steelMaterial(), { x: 0.2, y: 1.04, rz: Math.PI / 2 });
    addMesh(stand, new THREE.CylinderGeometry(0.016, 0.016, 0.34, 10), steelMaterial(), { x: 0.42, y: 1.04, z: 0.16, rx: Math.PI / 2 });
    addMesh(stand, new THREE.TorusGeometry(rad + 0.025, 0.016, 6, 30), darkMaterial(), { x: 0.42, y: 1.04, z: 0.32, ry: Math.PI / 2 });

    addMesh(rig.group, new THREE.BoxGeometry(0.16, 0.16, 0.14), ceramicMaterial(), { x: 0.66, y: 0.68, cast: false });
    addMesh(rig.group, new THREE.CylinderGeometry(0.05, 0.07, 0.08, 12), ceramicMaterial(), { x: 0.66, y: 0.78, cast: false });
  }

  const boat = addMesh(rig.group, new THREE.BoxGeometry(0.52, 0.06, 0.22), ceramicMaterial(), { y: 0.82 });
  boat.castShadow = true;
  const powderMat = new THREE.MeshStandardMaterial({
    color: demo.colors.solidMix ?? demo.colors.solid ?? 0xb8c0c4, roughness: 0.86, metalness: 0.08,
  });
  const powder = addMesh(rig.group, new THREE.IcosahedronGeometry(0.17, 0), powderMat, { y: 0.88, cast: false });
  powder.scale.set(1.3, 0.34, 0.62);
  rig.powderMat = powderMat;
  rig.powder = powder;
  rig.powderBase = new THREE.Vector3(1.3, 0.34, 0.62);

  if (!plant) {
    addMesh(rig.group, new THREE.BoxGeometry(0.46, 0.16, 0.46), darkMaterial(), { y: 0.08 });
    addMesh(rig.group, new THREE.BoxGeometry(0.4, 0.012, 0.4), steelMaterial(), { y: 0.166 });
    addAlcoholLamp(rig.group, texture, rig, 0.17);
  }
  const glowMat = new THREE.SpriteMaterial({
    map: softTexture('rgba(255,186,96,.9)', 'rgba(255,80,0,0)', 128),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const tubeGlow = new THREE.Sprite(glowMat);
  tubeGlow.position.set(0, 0.92, 0);
  tubeGlow.scale.set(0.52, 0.3, 1);
  rig.group.add(tubeGlow);
  rig.crucibleGlow = tubeGlow;

  rig.pptStyle = demo.pptStyle;

  if (!plant) {
    const gasMat = new THREE.MeshStandardMaterial({ color: 0x61796b, metalness: 0.5, roughness: 0.42 });
    addMesh(rig.group, new THREE.CylinderGeometry(0.11, 0.11, 0.46, 22), gasMat, { x: -1.28, y: 0.25, z: 0.2 });
    addMesh(rig.group, new THREE.SphereGeometry(0.11, 20, 12), gasMat, { x: -1.28, y: 0.48, z: 0.2 });
    addMesh(rig.group, new THREE.CylinderGeometry(0.026, 0.026, 0.11, 10), steelMaterial(), { x: -1.28, y: 0.58, z: 0.2 });
    addMesh(rig.group, new THREE.TorusGeometry(0.05, 0.012, 6, 18), darkMaterial(), { x: -1.28, y: 0.64, z: 0.2, rx: Math.PI / 2 });
    addTube(rig.group, [
      new THREE.Vector3(-1.28, 0.64, 0.2),
      new THREE.Vector3(-1.18, 0.86, 0.14),
      new THREE.Vector3(-1.02, 0.99, 0.06),
      new THREE.Vector3(-0.86, tubeY, 0),
    ], 0.026, rubberMaterial());

    addTube(rig.group, [
      new THREE.Vector3(0.86, tubeY, 0),
      new THREE.Vector3(0.98, 1.08, 0),
      new THREE.Vector3(1.1, 1.22, 0),
      new THREE.Vector3(1.08, 1.32, 0),
    ], 0.026, rubberMaterial());
  }

  const tail = makeFlame(rig.group, coolTexture, 1.08, 1.38, 0, 0.075, 0.2);
  tail.mat.color.set(0x9dc8ff);
  tail.role = 'tail';
  rig.flames.push(tail);

  rig.arch = 'tube';
  if (plant) addTubePlantShell(rig, demo, { tubeY, rad, len, texture });
  const gasReactant = demo.reactants.find((r) => r.gas);
  rig.inletLabel = gasReactant ? gasReactant.formula : '';
  rig.smokeAnchor = new THREE.Vector3(1.08, 1.42, 0);
  rig.surfaceY = tubeY;
  rig.boomPos = new THREE.Vector3(0, 0.9, 0);
  rig.labels.name = new THREE.Vector3(0, 1.74, 0);
  rig.labels.gas = new THREE.Vector3(1.16, 1.52, 0);
  rig.labels.ppt = new THREE.Vector3(-0.72, 0.74, 0);
  rig.labels.flame = new THREE.Vector3(0, 1.62, 0);
  rig.labels.mist = new THREE.Vector3(1.0, 1.42, 0);
  rig.labels.smoke = new THREE.Vector3(0, 1.92, 0);
  rig.labels.indicator = new THREE.Vector3(-1.0, 1.32, 0.2);
  rig.arc = null;
  return rig;
}

function buildTrough(demo, rig, texture, coolTexture, mode = 'lab') {
  const plant = mode === 'plant';
  const tank = new THREE.Group();
  rig.group.add(tank);
  const w = 1.9;
  const d = 1.14;
  const h = 0.78;

  const tankGlass = glassMaterial();
  tankGlass.opacity = plant ? 0.18 : 0.12;
  tankGlass.color.setHex(plant ? 0x93aeb8 : 0xbfe6f2);
  addMesh(tank, new THREE.PlaneGeometry(w, h), tankGlass, { y: h / 2 + 0.02, z: d / 2, cast: false });
  addMesh(tank, new THREE.PlaneGeometry(w, h), tankGlass, { y: h / 2 + 0.02, z: -d / 2, ry: Math.PI, cast: false });
  addMesh(tank, new THREE.PlaneGeometry(d, h), tankGlass, { x: w / 2, y: h / 2 + 0.02, ry: -Math.PI / 2, cast: false });
  addMesh(tank, new THREE.PlaneGeometry(d, h), tankGlass, { x: -w / 2, y: h / 2 + 0.02, ry: Math.PI / 2, cast: false });
  addMesh(tank, new THREE.PlaneGeometry(w, d), tankGlass, { y: 0.02, rx: -Math.PI / 2, cast: false });
  addGlassEdges(tank, w, h, d, 0xffffff, 0.6).position.y = h / 2 + 0.02;

  const waterMat = liquidMaterial(new THREE.Color(demo.liquid.from.color).lerp(new THREE.Color(0x9ed4e8), 0.3));
  waterMat.opacity = Math.max(0.7, demo.liquid.from.opacity);
  addMesh(tank, new THREE.BoxGeometry(w - 0.08, 0.5, d - 0.08), waterMat, { y: 0.27, cast: false });
  const troughSurfaceMat = new THREE.MeshPhysicalMaterial({
    color: 0xb2dff0, transparent: true, opacity: 0.32, roughness: 0.08, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.06, side: THREE.DoubleSide, depthWrite: false,
  });
  addMesh(tank, new THREE.PlaneGeometry(w - 0.1, d - 0.1), troughSurfaceMat, { y: 0.521, rx: -Math.PI / 2, cast: false });
  rig.surfaceMat = troughSurfaceMat;
  rig.liquidMat = waterMat;

  const metalMat = new THREE.MeshStandardMaterial({ color: demo.colors.solid, metalness: 0.75, roughness: 0.3 });
  const metal = addMesh(tank, new THREE.SphereGeometry(0.13, 20, 14), metalMat, { y: 1.16 });
  rig.metal = metal;
  rig.metalMat = metalMat;
  if (plant) rig.metalDropY = 1.32;

  if (!plant) {
    addTweezers(tank, rig);
    rig.tweezers.position.set(0, 1.18, 0);
  }

  const metalFormula = demo.reactants.find((r) => ['Na', 'K', 'Ca', 'Li', 'Ba'].includes(r.formula))?.formula;
  const flameColor = metalFormula === 'K' ? 0xc08cff : metalFormula === 'Na' ? 0xffd23f : 0xffc766;
  const flameTex = isCoolFlame(flameColor) ? coolTexture : texture;
  const outer = makeFlame(tank, flameTex, 0, 0.74, 0, 0.2, 0.26);
  outer.mat.color.set(flameColor);
  outer.role = 'outer';
  const core = makeFlame(tank, flameTex, 0, 0.68, 0, 0.09, 0.13);
  core.mat.color.set(0xfff1c8);
  core.role = 'core';
  rig.flames.push(outer, core);
  rig.metalFlame = outer;
  const light = new THREE.PointLight(flameColor, 0, 4, 2);
  light.position.set(0, 0.8, 0);
  tank.add(light);
  rig.flameLight = light;

  rig.arch = 'trough';
  if (plant) addTroughPlantShell(rig, demo, { w, d, h });
  rig.waterY = 0.52;
  rig.bubbleTop = 0.5;
  rig.bubbleBottom = 0.1;
  rig.bubbleRate = 30;
  rig.smokeAnchor = new THREE.Vector3(0, 0.8, 0);
  rig.boomPos = new THREE.Vector3(0, 0.6, 0);
  rig.labels.name = new THREE.Vector3(0, h + 0.26, 0);
  rig.labels.gas = new THREE.Vector3(w / 2 + 0.08, 0.66, 0);
  rig.labels.ppt = new THREE.Vector3(-w / 2 - 0.06, 0.2, 0);
  rig.labels.flame = plant ? new THREE.Vector3(0.92, 0.86, 0.1) : new THREE.Vector3(0, 1.02, 0);
  rig.labels.mist = new THREE.Vector3(w / 2 - 0.1, 0.9, 0);
  rig.labels.smoke = new THREE.Vector3(-w / 2 + 0.2, 1.1, 0);
  rig.labels.indicator = new THREE.Vector3(-w / 2 - 0.12, 0.62, 0.2);
  rig.arc = null;
  rig.flameMode = 'metal';
  return rig;
}

function buildCell(demo, rig, mode = 'lab') {
  const plant = mode === 'plant';
  const tank = new THREE.Group();
  rig.group.add(tank);
  const w = 1.88;
  const d = 1.04;
  const h = 0.9;

  const tankGlass = glassMaterial();
  tankGlass.opacity = plant ? 0.18 : 0.12;
  tankGlass.color.setHex(plant ? 0x93aeb8 : 0xbfe6f2);
  addMesh(tank, new THREE.PlaneGeometry(w, h), tankGlass, { y: h / 2 + 0.02, z: d / 2, cast: false });
  addMesh(tank, new THREE.PlaneGeometry(w, h), tankGlass, { y: h / 2 + 0.02, z: -d / 2, ry: Math.PI, cast: false });
  addMesh(tank, new THREE.PlaneGeometry(d, h), tankGlass, { x: w / 2, y: h / 2 + 0.02, ry: -Math.PI / 2, cast: false });
  addMesh(tank, new THREE.PlaneGeometry(d, h), tankGlass, { x: -w / 2, y: h / 2 + 0.02, ry: Math.PI / 2, cast: false });
  addMesh(tank, new THREE.PlaneGeometry(w, d), tankGlass, { y: 0.02, rx: -Math.PI / 2, cast: false });
  addGlassEdges(tank, w, h, d, 0xffffff, 0.6).position.y = h / 2 + 0.02;

  const molten = !!demo.molten;
  const electrolyteMat = molten
    ? new THREE.MeshStandardMaterial({
      color: 0xc25a18, emissive: 0xff5a00, emissiveIntensity: 0.24, roughness: 0.42, metalness: 0.04,
    })
    : new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(demo.liquid.from.color).lerp(new THREE.Color(0x4fabc6), 0.62),
      transparent: true, opacity: Math.max(0.86, demo.liquid.from.opacity), roughness: 0.16,
      metalness: 0.0, depthWrite: false,
    });
  addMesh(tank, new THREE.BoxGeometry(w - 0.08, 0.58, d - 0.08), electrolyteMat, { y: 0.31, cast: false });
  if (!molten) {
    const cellSurfaceMat = new THREE.MeshPhysicalMaterial({
      color: 0x8fd2e6, transparent: true, opacity: 0.52, roughness: 0.06, metalness: 0,
      clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide,
    });
    addMesh(tank, new THREE.PlaneGeometry(w - 0.1, d - 0.1), cellSurfaceMat, { y: 0.601, rx: -Math.PI / 2, cast: false });
    rig.surfaceMat = cellSurfaceMat;
  } else {
    const heatMat = new THREE.SpriteMaterial({
      map: softTexture('rgba(255,186,96,.9)', 'rgba(255,80,0,0)', 128),
      transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const heatGlow = new THREE.Sprite(heatMat);
    heatGlow.position.set(0, 0.4, 0);
    heatGlow.scale.set(1.5, 0.5, 1);
    heatGlow.material.opacity = 0.1;
    tank.add(heatGlow);
    rig.moltenGlow = heatGlow;
  }
  rig.liquidMat = electrolyteMat;

  if (demo.indicator && !molten) {
    const tintMat = new THREE.MeshBasicMaterial({
      color: demo.indicator.color, transparent: true, opacity: 0, depthWrite: false,
      side: THREE.DoubleSide,
    });
    const tintRegion = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.5, 24, 1, true), tintMat);
    tintRegion.position.set(-0.52, 0.34, 0);
    tintRegion.renderOrder = 2;
    tank.add(tintRegion);
    rig.cathodeTintMat = tintMat;
    const tintGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softTexture('rgba(255,120,150,.9)', 'rgba(255,120,150,0)', 96),
      transparent: true, opacity: 0, depthWrite: false,
    }));
    tintGlow.position.set(-0.52, 0.44, 0.16);
    tintGlow.scale.set(0.6, 0.6, 1);
    tintGlow.renderOrder = 3;
    tank.add(tintGlow);
    rig.cathodeTintGlow = tintGlow;
  }

  const plateMat = graphiteMaterial();
  const plateL = demo.isBattery && demo.reactants[0]
    ? new THREE.MeshStandardMaterial({ color: demo.reactants[0].color, metalness: 0.55, roughness: 0.45 })
    : plateMat;
  const plateR = demo.isBattery
    ? new THREE.MeshStandardMaterial({ color: demo.reactants[1]?.color ?? 0x3b2f26, metalness: 0.4, roughness: 0.52 })
    : plateMat;
  addMesh(tank, new THREE.BoxGeometry(0.055, 0.62, 0.36), plateL, { x: -0.52, y: 0.52 });
  addMesh(tank, new THREE.BoxGeometry(0.055, 0.62, 0.36), plateR, { x: 0.52, y: 0.52 });
  addMesh(tank, new THREE.BoxGeometry(0.14, 0.05, 0.14), steelMaterial(), { x: -0.52, y: 0.86 });
  addMesh(tank, new THREE.BoxGeometry(0.14, 0.05, 0.14), steelMaterial(), { x: 0.52, y: 0.86 });
  rig.electrodes = [-0.52, 0.52];

  const cellInfo = demo.cell || {};
  const bubbleColor = (hex) => new THREE.Color(hex ?? 0xeaf4f8).lerp(WHITE, 0.12).getHex();
  rig.electrodeBubbles = [
    { x: -0.52, color: bubbleColor(cellInfo.cathodeColor), active: !!cellInfo.cathodeGas },
    { x: 0.52, color: bubbleColor(cellInfo.anodeColor), active: !!cellInfo.anodeGas },
  ];

  if (cellInfo.cathodeMetal) {
    const platingMat = new THREE.MeshStandardMaterial({
      color: cellInfo.metalColor ?? 0xcfd6da, metalness: 0.85, roughness: 0.3,
    });
    const plating = addMesh(tank, new THREE.BoxGeometry(0.075, 0.52, 0.3), platingMat, {
      x: -0.52, y: 0.5, cast: false,
    });
    plating.scale.set(1, 0.02, 0.55);
    rig.plating = plating;
  }

  if (demo.isBattery && demo.hasPpt) {
    const crustMat = new THREE.MeshStandardMaterial({
      color: demo.colors.ppt, roughness: 0.82, metalness: 0.05,
    });
    rig.batteryCrust = [-0.52, 0.52].map((x) => {
      const crust = addMesh(tank, new THREE.BoxGeometry(0.075, 0.46, 0.3), crustMat, {
        x, y: 0.46, cast: false,
      });
      crust.scale.set(1, 0.02, 0.55);
      return crust;
    });
  }

  const wireRed = new THREE.MeshStandardMaterial({ color: 0xb8452f, roughness: 0.6 });
  const wireDark = new THREE.MeshStandardMaterial({ color: 0x2f3a42, roughness: 0.6 });
  if (!plant) {
    addTube(rig.group, [
      new THREE.Vector3(-0.52, 0.88, 0),
      new THREE.Vector3(-0.5, 1.22, -0.1),
      new THREE.Vector3(-0.18, 1.3, -0.38),
      new THREE.Vector3(-0.1, 1.2, -0.44),
    ], 0.022, wireDark);
    addTube(rig.group, [
      new THREE.Vector3(0.52, 0.88, 0),
      new THREE.Vector3(0.5, 1.22, -0.1),
      new THREE.Vector3(0.18, 1.3, -0.38),
      new THREE.Vector3(0.1, 1.2, -0.44),
    ], 0.022, wireRed);
  }

  if (demo.isBattery) {
    rig.meter = addGalvanometer(rig.group, rig);
    rig.batteryLabelPos = new THREE.Vector3(0, 1.56, -0.46);
  } else if (!plant) {
    const battery = new THREE.Group();
    battery.position.set(0, 1.14, -0.46);
    rig.group.add(battery);
    addMesh(battery, new THREE.BoxGeometry(0.46, 0.24, 0.24), darkMaterial(), { y: 0 });
    addMesh(battery, new THREE.BoxGeometry(0.47, 0.045, 0.25), new THREE.MeshStandardMaterial({ color: 0xff8a3d, metalness: 0.4, roughness: 0.4 }), { y: 0.02 });
    addMesh(battery, new THREE.CylinderGeometry(0.022, 0.022, 0.05, 10), steelMaterial(), { x: -0.13, y: 0.14 });
    addMesh(battery, new THREE.CylinderGeometry(0.022, 0.022, 0.05, 10), steelMaterial(), { x: 0.13, y: 0.14 });
    rig.battery = battery;
    rig.batteryLabelPos = new THREE.Vector3(0, 1.48, -0.46);
    addKnifeSwitch(rig.group, rig, { x: 0, y: 1.265, z: -0.46 });
  }

  if (!demo.isBattery) {
    const glowTex = softTexture('rgba(214,244,255,.9)', 'rgba(190,235,255,0)', 96);
    const cathodeGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: cellInfo.cathodeMetal ? (cellInfo.metalColor ?? 0xcfd6da) : 0xbfe9ff,
      transparent: true, opacity: 0, depthWrite: false,
    }));
    cathodeGlow.position.set(-0.52, 0.34, 0.14);
    cathodeGlow.scale.set(0.66, 0.56, 1);
    tank.add(cathodeGlow);
    rig.cathodeGlow = cathodeGlow;
  }

  rig.arch = 'cell';
  if (plant) addCellPlantShell(rig, demo, { w, d, h, molten });
  rig.molten = molten;
  rig.bubbleTop = 0.58;
  rig.bubbleBottom = 0.1;
  rig.bubbleRate = 26;
  rig.smokeAnchor = null;
  rig.boomPos = new THREE.Vector3(0, 0.55, 0);
  rig.labels.name = plant ? new THREE.Vector3(-1.05, 1.36, 0.15) : new THREE.Vector3(0, 1.12, 0);
  rig.labels.gas = new THREE.Vector3(0.74, 0.86, 0);
  rig.labels.ppt = new THREE.Vector3(-0.74, 0.16, 0);
  rig.labels.battery = plant && !demo.isBattery
    ? new THREE.Vector3(0, 1.56, -0.66)
    : new THREE.Vector3(0, 1.68, -0.46);
  rig.labels.anode = new THREE.Vector3(0.72, 1.04, 0);
  rig.labels.cathode = new THREE.Vector3(-0.72, 1.04, 0);
  rig.flameMode = 'none';
  return rig;
}

/* ------------------------------------------------------------
   EquationLab
   ------------------------------------------------------------ */

export class EquationLab {
  constructor({ root, onBack, onExit, onOpenPlant }) {
    this.root = root;
    this.viewEl = root.querySelector('#eqLabView');
    this.sceneEl = root.querySelector('#eqLabScene');
    this.labelEl = root.querySelector('#eqLabLabels');
    this.callbacks = { onBack, onExit, onOpenPlant };
    this.el = {
      title: root.querySelector('#eqLabTitle'),
      back: root.querySelector('#eqLabBack'),
      exit: root.querySelector('#eqLabExit'),
      plant: root.querySelector('#eqLabPlant'),
      modeToggle: root.querySelector('#eqLabModeToggle'),
      modeToggleLabel: root.querySelector('#eqLabModeToggleLabel'),
      plantNote: root.querySelector('#eqLabPlantNote'),
      archetype: root.querySelector('#eqLabArchetype'),
      equation: root.querySelector('#eqLabEquation'),
      tags: root.querySelector('#eqLabTags'),
      states: root.querySelector('#eqLabStates'),
      type: root.querySelector('#eqLabType'),
      obs: root.querySelector('#eqLabObs'),
      obsSection: root.querySelector('#eqLabObsSection'),
      phen: root.querySelector('#eqLabPhen'),
      ion: root.querySelector('#eqLabIon'),
      note: root.querySelector('#eqLabNote'),
      hazard: root.querySelector('#eqLabHazard'),
      hazardText: root.querySelector('#eqLabHazardText'),
      steps: root.querySelector('#eqLabSteps'),
      swatches: root.querySelector('#eqLabSwatches'),
      phaseLabel: root.querySelector('#eqLabPhaseLabel'),
      intensity: root.querySelector('#eqLabIntensity'),
      intensityVal: root.querySelector('#eqLabIntensityVal'),
      play: root.querySelector('#eqLabPlay'),
      restart: root.querySelector('#eqLabRestart'),
      track: root.querySelector('#eqLabTrack'),
      trackFill: root.querySelector('#eqLabTrackFill'),
      timer: root.querySelector('#eqLabTimer'),
      telemetry: root.querySelector('#eqLabTelemetry'),
      infoToggle: root.querySelector('#eqLabInfoToggle'),
      flash: root.querySelector('#eqLabFlash'),
    };

    this.demo = null;
    this.rig = null;
    this.isOpen = false;
    this.playing = false;
    this.done = false;
    this.t = 0;
    this.intensity = 1;
    this.mode = 'plant';
    this._uiAcc = 0;
    this._bubbleAcc = 0;
    this._pptAcc = 0;
    this._smokeAcc = 0;
    this._steamAcc = 0;
    this._mistAcc = 0;
    this._sparkAcc = 0;
    this._lightAcc = 0;
    this._flash = 0;
    this.shake = 0;
    this._lastPhase = -1;
    this._waves = [];
    this._stepItems = [];
    this._phaseButtons = [];
    this._raf = 0;

    this.tex = {
      bubble: bubbleTexture(),
      soft: softTexture('rgba(255,255,255,.9)', 'rgba(255,255,255,0)'),
      smoke: smokeTexture(),
      flame: flameTexture(),
      coolFlame: coolFlameTexture(),
      spark: softTexture('rgba(255,246,214,1)', 'rgba(255,150,40,0)', 64),
      steam: softTexture('rgba(255,255,255,.5)', 'rgba(255,255,255,0)', 96),
      arc: arcTexture(),
    };

    this._initThree();
    this._bindUI();
  }

  /* ---------------- three.js setup ---------------- */

  _initThree() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.style.display = 'block';
    this.sceneEl.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.labelEl.appendChild(this.labelRenderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    this.camera.position.set(3.1, 2.7, 4.2);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.8, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.4;
    this.controls.maxDistance = 9.5;
    this.controls.minPolarAngle = 0.22;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.06;
    this.controls.update();

    const env = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(env, 0.04).texture;
    if ('environmentIntensity' in this.scene) this.scene.environmentIntensity = 0.26;
    pmrem.dispose();
    env.dispose?.();

    this.hemiLight = new THREE.HemisphereLight(0xeaf7ff, 0x7d929e, 0.72);
    this.scene.add(this.hemiLight);

    const key = new THREE.DirectionalLight(0xfff3e2, 1.55);
    key.position.set(3.6, 6.4, 4.8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 24;
    key.shadow.bias = -0.0009;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);
    this.keyLight = key;

    const fill = new THREE.DirectionalLight(0xbfe4ff, 0.55);
    fill.position.set(-4.5, 3.4, -2.6);
    this.scene.add(fill);
    this.fillLight = fill;

    const rim = new THREE.PointLight(0xe8f7ff, 12, 14, 2);
    rim.position.set(0, 4.2, -3.4);
    this.scene.add(rim);
    this.rimLight = rim;

    this.plantWarm = new THREE.PointLight(0xffb066, 0, 13, 2);
    this.plantWarm.position.set(-2.7, 3.0, 1.6);
    this.scene.add(this.plantWarm);
    this.plantCool = new THREE.PointLight(0x6fbfe0, 0, 12, 2);
    this.plantCool.position.set(2.8, 2.6, 2.2);
    this.scene.add(this.plantCool);

    this._buildStage();
    this._buildPlantStage();

    this.pools = {
      bubble: new SpritePool(this.scene, this.tex.bubble, { max: 90 }),
      ppt: new SpritePool(this.scene, this.tex.soft, { max: 60 }),
      smoke: new SpritePool(this.scene, this.tex.smoke, { max: 48 }),
      steam: new SpritePool(this.scene, this.tex.steam, { max: 36 }),
      spark: new SpritePool(this.scene, this.tex.spark, { max: 80, blending: THREE.AdditiveBlending }),
    };

    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 7;
      dustPos[i * 3 + 1] = Math.random() * 3.2 + 0.2;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.02, transparent: true, opacity: 0.3, depthWrite: false,
    }));
    this.scene.add(this.dust);

    this._initLabels();
    this._applyModeLook(this.mode);
    this._resizeObserver = new ResizeObserver(() => this.resize());
    this._resizeObserver.observe(this.viewEl);
    this.resize();
  }

  _buildStage() {
    this.stageLab = new THREE.Group();
    this.scene.add(this.stageLab);
    const top = new THREE.MeshStandardMaterial({ map: benchTexture(), roughness: 0.58, metalness: 0.06 });
    const side = new THREE.MeshStandardMaterial({ color: 0x93aebf, roughness: 0.65, metalness: 0.15 });
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(2.58, 2.72, 0.16, 72, 1),
      [side, top, side],
    );
    base.position.y = -0.08;
    base.receiveShadow = true;
    this.stageLab.add(base);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.012, 6, 80),
      new THREE.MeshBasicMaterial({ color: 0x3f9ec4, transparent: true, opacity: 0.8 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.005;
    this.stageLab.add(ring);

    const shadowTex = softTexture('rgba(36,66,84,.5)', 'rgba(36,66,84,0)', 128);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.8, 3.6),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.34, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.004;
    this.stageLab.add(shadow);
  }

  _buildPlantStage() {
    const group = new THREE.Group();
    this.stagePlant = group;
    this.stagePlant.visible = false;
    this.scene.add(group);

    const apron = new THREE.Mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.MeshStandardMaterial({ color: 0x0c171d, roughness: 0.97, metalness: 0.05 }),
    );
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.19;
    apron.receiveShadow = true;
    group.add(apron);

    const side = new THREE.MeshStandardMaterial({ color: 0x222d33, roughness: 0.92, metalness: 0.08 });
    const top = new THREE.MeshStandardMaterial({ map: concreteTexture(), roughness: 0.84, metalness: 0.14 });
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(3.15, 3.32, 0.18, 80, 1),
      [side, top, side],
    );
    pad.position.y = -0.09;
    pad.receiveShadow = true;
    group.add(pad);

    const hazard = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 72),
      new THREE.MeshStandardMaterial({
        map: hazardRingTexture(), transparent: true, opacity: 0.9, roughness: 0.68, metalness: 0.1,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
      }),
    );
    hazard.rotation.x = -Math.PI / 2;
    hazard.position.y = 0.006;
    hazard.receiveShadow = true;
    group.add(hazard);

    const grate = new THREE.Mesh(new THREE.TorusGeometry(2.86, 0.05, 8, 80), industrialSteel());
    grate.rotation.x = Math.PI / 2;
    grate.position.y = 0.012;
    grate.castShadow = false;
    group.add(grate);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      addMesh(group, new THREE.BoxGeometry(0.3, 0.012, 0.055), industrialDark(), {
        x: Math.cos(a) * 2.66, y: 0.018, z: Math.sin(a) * 2.66, ry: -a, cast: false,
      });
    }

    addTube(group, [
      new THREE.Vector3(-2.72, 0.07, 1.02),
      new THREE.Vector3(-2.1, 0.07, 1.24),
      new THREE.Vector3(0.4, 0.07, 1.48),
      new THREE.Vector3(2.62, 0.07, 1.3),
    ], 0.055, industrialPaint(0x5a6c74));
    addTube(group, [
      new THREE.Vector3(2.55, 0.06, -0.95),
      new THREE.Vector3(2.3, 0.06, -0.15),
      new THREE.Vector3(2.5, 0.06, 0.72),
    ], 0.042, safetyYellow());

    [[-2.72, 1.5], [2.78, 1.35]].forEach(([x, z]) => {
      addMesh(group, new THREE.CylinderGeometry(0.065, 0.085, 0.46, 14), safetyYellow(), { x, y: 0.23, z });
      addMesh(group, new THREE.TorusGeometry(0.07, 0.012, 6, 16), industrialDark(), { x, y: 0.46, z, rx: Math.PI / 2 });
    });

    const tankMat = industrialPaint(0x4d6670);
    [[-3.4, -2.85, 1.9], [3.5, -3.05, 1.5]].forEach(([x, z, hgt]) => {
      addMesh(group, new THREE.CylinderGeometry(0.52, 0.55, hgt, 28), tankMat, { x, y: hgt / 2, z, cast: false });
      addMesh(group, new THREE.SphereGeometry(0.52, 24, 12, 0, TAU, 0, Math.PI / 2), tankMat, { x, y: hgt, z, cast: false });
      addMesh(group, new THREE.CylinderGeometry(0.02, 0.02, hgt + 0.7, 8), industrialSteel(), { x: x + 0.3, y: (hgt + 0.7) / 2, z: z + 0.34, cast: false });
      addMesh(group, new THREE.CylinderGeometry(0.14, 0.14, 0.06, 14), safetyYellow(), { x: x + 0.3, y: hgt * 0.6, z: z + 0.34, cast: false });
    });

    addMesh(group, new THREE.CylinderGeometry(0.16, 0.24, 3.8, 20), industrialPaint(0x6a5a4c), { x: -2.95, y: 1.9, z: -3.75, cast: false });
    [1.2, 2.1, 3.0].forEach((y) => {
      addMesh(group, new THREE.TorusGeometry(0.2, 0.026, 6, 20), safetyYellow(), { x: -2.95, y, z: -3.75, rx: Math.PI / 2, cast: false });
    });

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x18242a, roughness: 0.95, metalness: 0.05 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffc274 });
    [[-3.5, 1.9, 1.5], [-1.7, 2.5, 1.15], [0.3, 2.0, 1.4], [2.1, 2.85, 1.25], [3.7, 1.7, 1.0]].forEach(([x, hgt, w]) => {
      addMesh(group, new THREE.BoxGeometry(w, hgt, 0.28), wallMat, { x, y: hgt / 2, z: -4.6, cast: false });
      for (let i = 0; i < 3; i++) {
        addMesh(group, new THREE.BoxGeometry(0.07, 0.05, 0.02), windowMat, {
          x: x - w / 2 + 0.22 + i * 0.2, y: hgt * 0.68, z: -4.45, cast: false, receive: false,
        });
      }
    });

    const glowTex = softTexture('rgba(255,178,96,.55)', 'rgba(255,178,96,0)', 128);
    const warmGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 2.4),
      new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    warmGlow.rotation.x = -Math.PI / 2;
    warmGlow.position.set(0, 0.01, 0.4);
    group.add(warmGlow);
  }

  _initLabels() {
    const make = (cls, html = '') => {
      const div = document.createElement('div');
      div.className = `lab-tag ${cls}`;
      div.innerHTML = html;
      div.style.pointerEvents = 'none';
      const object = new CSS2DObject(div);
      this.scene.add(object);
      return { object, el: div };
    };
    this.labels = {
      name: make('lab-tag--name', '<b>—</b><span></span>'),
      gas: make('lab-tag--gas', ''),
      ppt: make('lab-tag--ppt', ''),
      product: make('lab-tag--product', ''),
      battery: make('lab-tag--battery', '<b>DC 6V</b><span>电源</span>'),
      flame: make('lab-tag--flame', ''),
      mist: make('lab-tag--mist', ''),
      smoke: make('lab-tag--mist', ''),
      indicator: make('lab-tag--indicator', ''),
      anode: make('lab-tag--electrode', ''),
      cathode: make('lab-tag--electrode', ''),
    };
    this.labels.battery.object.visible = false;
  }

  _applyModeLook(mode) {
    const plant = mode === 'plant';
    this.mode = mode;
    this.root.classList.toggle('is-plant-mode', plant);
    this.stageLab.visible = !plant;
    this.stagePlant.visible = plant;
    this.renderer.toneMappingExposure = plant ? 1.02 : 0.94;
    this.scene.fog = plant ? new THREE.Fog(0x0a1a22, 10, 26) : null;
    if ('environmentIntensity' in this.scene) this.scene.environmentIntensity = plant ? 0.16 : 0.26;

    if (plant) {
      this.hemiLight.color.setHex(0x8fb6cc);
      this.hemiLight.groundColor.setHex(0x22303a);
      this.hemiLight.intensity = 0.44;
      this.keyLight.color.setHex(0xe8f1f7);
      this.keyLight.intensity = 1.85;
      this.fillLight.color.setHex(0x8fc6e0);
      this.fillLight.intensity = 0.72;
      this.rimLight.color.setHex(0xffc27a);
      this.rimLight.intensity = 9;
      this.plantWarm.intensity = 16;
      this.plantCool.intensity = 8;
      this.dust.material.color.setHex(0xffd0a0);
      this.dust.material.opacity = 0.16;
      this.dust.material.size = 0.016;
    } else {
      this.hemiLight.color.setHex(0xeaf7ff);
      this.hemiLight.groundColor.setHex(0x7d929e);
      this.hemiLight.intensity = 0.72;
      this.keyLight.color.setHex(0xfff3e2);
      this.keyLight.intensity = 1.55;
      this.fillLight.color.setHex(0xbfe4ff);
      this.fillLight.intensity = 0.55;
      this.rimLight.color.setHex(0xe8f7ff);
      this.rimLight.intensity = 12;
      this.plantWarm.intensity = 0;
      this.plantCool.intensity = 0;
      this.dust.material.color.setHex(0xffffff);
      this.dust.material.opacity = 0.3;
      this.dust.material.size = 0.02;
    }

    if (this.el.modeToggle) {
      this.el.modeToggle.setAttribute('aria-pressed', String(plant));
      const action = plant ? '切换到实验室形态' : '切换到化工厂形态';
      this.el.modeToggle.title = action;
      this.el.modeToggle.setAttribute('aria-label', action);
    }
    if (this.el.modeToggleLabel) {
      this.el.modeToggleLabel.textContent = plant ? '切换实验室' : '切换化工厂';
    }
  }

  /* ---------------- UI ---------------- */

  _bindUI() {
    this.el.back.addEventListener('click', () => this.close('back'));
    this.el.exit.addEventListener('click', () => this.callbacks.onExit?.());
    this.el.modeToggle?.addEventListener('click', () => {
      this.setMode(this.mode === 'plant' ? 'lab' : 'plant');
    });
    this.el.plant.addEventListener('click', () => {
      if (this.demo?.eq) this.callbacks.onOpenPlant?.(this.demo.eq);
    });
    this.el.play.addEventListener('click', () => this.togglePlay());
    this.el.restart.addEventListener('click', () => this.restart());
    this.el.intensity.addEventListener('input', () => {
      this.setIntensity(parseFloat(this.el.intensity.value));
    });
    this.el.infoToggle.addEventListener('click', () => {
      this.root.classList.toggle('is-info-open');
    });

    PHASE_NAMES.forEach((name, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lab-phase';
      const dot = document.createElement('i');
      const idx = document.createElement('span');
      idx.textContent = `0${index + 1}`;
      const label = document.createElement('b');
      label.textContent = name;
      btn.append(dot, idx, label);
      btn.addEventListener('click', () => this.seek(index));
      this.el.track.appendChild(btn);
      this._phaseButtons.push(btn);
    });
  }

  /* ---------------- open / close ---------------- */

  open(demo) {
    this.demo = demo;
    this.isOpen = true;
    this.t = 0;
    this.playing = true;
    this.done = false;
    this.intensity = 1;
    this._lastPhase = -1;
    this._uiAcc = 0;
    this._bubbleAcc = 0;
    this._pptAcc = 0;
    this._smokeAcc = 0;
    this._steamAcc = 0;
    this._mistAcc = 0;
    this._sparkAcc = 0;
    this._lightAcc = 0;
    this._flash = 0;
    this.shake = 0;
    this.el.flash.style.opacity = 0;
    this.el.intensity.value = '1';
    this.el.intensityVal.textContent = '1.0×';
    this.root.classList.add('is-open');
    this.root.classList.remove('is-info-open');
    this.root.setAttribute('aria-hidden', 'false');
    this._applyModeLook(this.mode);

    this.palette = {
      bubble: new THREE.Color(demo.colors.gas).lerp(WHITE, 0.5).getHex(),
      ppt: demo.pptInitial ? demo.colors.pptFrom : demo.colors.ppt,
      pptFrom: demo.colors.pptFrom,
      pptTo: demo.colors.pptTo,
      // 纯白烟在浅色背景上会“隐形”，加一点灰蓝让体积感可辨
      smoke: (() => {
        const c = new THREE.Color(demo.colors.smoke);
        if (c.r > 0.88 && c.g > 0.88 && c.b > 0.88) c.lerp(new THREE.Color(0x8ba3b1), 0.55);
        return c.getHex();
      })(),
      spark: demo.flame ? demo.flame.color : 0xffc46a,
      mist: demo.mist ? demo.mist.color : 0xffffff,
      deposit: demo.deposit ? demo.deposit.color : 0xcfd6da,
    };

    this._renderInfo(demo);
    this._buildRig(demo);
    this._createLabelsContent(demo);
    this._refreshLabels();
    this._updateUI();

    this.resize();
    this._lastFrame = performance.now();
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame((now) => this._loop(now));
  }

  close(reason = 'back') {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.playing = false;
    cancelAnimationFrame(this._raf);
    this.root.classList.remove('is-open', 'is-info-open');
    this.root.setAttribute('aria-hidden', 'true');
    Object.values(this.pools).forEach((pool) => pool.clear());
    if (this.rig) this.rig.group.position.set(0, 0, 0);
    if (reason === 'back') this.callbacks.onBack?.();
  }

  setMode(mode) {
    if (mode !== 'lab' && mode !== 'plant') return;
    if (mode === this.mode) return;
    this._applyModeLook(mode);
    if (!this.isOpen || !this.demo) return;
    this._buildRig(this.demo);
    this._renderInfo(this.demo);
    this._createLabelsContent(this.demo);
    this._refreshLabels();
    this.t = 0;
    this.done = false;
    this.playing = true;
    this._lastPhase = -1;
    this._lastFrame = performance.now();
    this._updateUI();
  }

  /* ---------------- layout ---------------- */

  get _phaseIndex() {
    const t = this.t;
    if (t < PHASE_STARTS[1]) return 0;
    if (t < PHASE_STARTS[2]) return 1;
    if (t < PHASE_STARTS[3]) return 2;
    return 3;
  }

  _applyFraming(pos, target) {
    const t = new THREE.Vector3(...target);
    const p = new THREE.Vector3(...pos);
    const aspect = (this.viewEl.clientWidth || 1) / Math.max(1, this.viewEl.clientHeight);
    const fit = aspect < 0.95 ? Math.min(1.55, Math.pow(0.95 / aspect, 0.7)) : 1;
    p.sub(t).multiplyScalar(fit).add(t);
    this.camera.position.copy(p);
    this.controls.target.copy(t);
    this.controls.update();
  }

  _setCameraFor(arch, demo, mode = 'lab') {
    const heatBeaker = arch === 'beaker' && !!(demo?.flags.heat || demo?.flags.flame);
    if (mode === 'plant') {
      const plantFraming = {
        beaker: [[3.85, 3.35, 5.15], [0, 1.12, -0.12]],
        gasjar: [[3.8, 3.15, 5.05], [0, 1.0, -0.1]],
        crucible: [[3.8, 3.7, 5.05], [0, 1.08, -0.16]],
        tube: [[4.05, 3.4, 5.25], [0, 1.08, -0.12]],
        trough: [[4.35, 3.35, 5.65], [0, 0.8, 0]],
        cell: [[4.3, 3.35, 5.5], [0, 0.9, -0.1]],
      }[arch] || [[3.9, 3.3, 5.2], [0, 1.0, -0.1]];
      this._applyFraming(...plantFraming);
      return;
    }
    const framing = {
      beaker: heatBeaker ? [[3.2, 3.05, 4.35], [0, 1.05, 0]] : [[2.85, 2.55, 4.0], [0, 0.8, 0]],
      gasjar: [[3.05, 2.7, 4.15], [0, 0.8, 0]],
      crucible: [[3.05, 3.35, 4.1], [0, 0.92, 0]],
      tube: [[3.3, 3.0, 4.35], [0, 0.95, 0]],
      trough: [[3.6, 3.05, 4.8], [0, 0.6, 0]],
      cell: [[3.7, 3.1, 4.85], [0, 0.76, 0]],
    }[arch] || [[3.1, 2.7, 4.2], [0, 0.8, 0]];
    this._applyFraming(...framing);
  }

  resize() {
    const w = this.viewEl.clientWidth;
    const h = this.viewEl.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.labelRenderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /* ---------------- panel content ---------------- */

  _renderInfo(demo) {
    const { eq } = demo;
    const cat = EQUATION_CATEGORIES.find((item) => item.id === eq.c);
    const plant = this.mode === 'plant';
    const plantInfo = PLANT_INFO[demo.archetype];
    this.el.title.textContent = eq.t;
    this.el.archetype.textContent = plant && plantInfo
      ? `${plantInfo.code} · ${plantInfo.name}`
      : demo.apparatus.label;
    this.el.telemetry.textContent = plant && plantInfo
      ? `${plantInfo.name} · ${demo.condLabel}`
      : `${demo.apparatus.name} · ${demo.condLabel}`;

    if (this.el.plantNote) {
      this.el.plantNote.hidden = !(plant && plantInfo);
      if (plant && plantInfo) {
        const line = document.createElement('b');
        line.textContent = `${plantInfo.code} · ${plantInfo.line}`;
        const note = document.createElement('span');
        note.textContent = plantInfo.note;
        this.el.plantNote.replaceChildren(line, note);
      } else {
        this.el.plantNote.replaceChildren();
      }
    }

    const line = document.createElement('div');
    line.className = 'lab-eq-line';
    const left = document.createElement('span');
    left.className = 'lab-eq-side';
    left.textContent = demo.left;
    const arrow = document.createElement('span');
    arrow.className = 'lab-eq-arrow';
    arrow.textContent = demo.arrow;
    if (eq.cond) {
      const cond = document.createElement('em');
      cond.textContent = eq.cond;
      arrow.appendChild(cond);
    }
    const right = document.createElement('span');
    right.className = 'lab-eq-side';
    right.textContent = demo.right;
    line.append(left, arrow, right);
    this.el.equation.replaceChildren(line);

    const chips = [];
    if (cat) chips.push(cat.label);
    if (eq.cond) chips.push(eq.cond);
    if (demo.indicator) chips.push(demo.indicator.label);
    if (demo.mist) chips.push('白雾');
    (eq.tags || []).forEach((tag) => chips.push(tag));
    chips.push(plant ? '化工厂形态' : '实验室形态');
    this.el.tags.replaceChildren(...chips.map((text, index) => {
      const chip = document.createElement('span');
      chip.className = `lab-chip${index === chips.length - 1 ? ' is-accent' : ''}`;
      chip.textContent = text;
      return chip;
    }));

    if (this.el.type) {
      this.el.type.hidden = !demo.reactionType;
      this.el.type.replaceChildren();
      if (demo.reactionType) {
        const type = document.createElement('b');
        type.textContent = demo.reactionType.type;
        const note = document.createElement('span');
        note.textContent = demo.reactionType.note || '';
        this.el.type.append(type, note);
      }
    }

    if (this.el.states) {
      const rows = [['反应物', demo.reactants], ['生成物', demo.products]].map(([label, list]) => {
        const row = document.createElement('div');
        row.className = 'lab-state-row';
        const side = document.createElement('span');
        side.className = 'lab-state-side';
        side.textContent = label;
        row.appendChild(side);
        list.forEach((species) => {
          const chip = document.createElement('span');
          chip.className = 'lab-state';
          chip.title = `${species.display} · ${species.appearance}`;
          const dot = document.createElement('i');
          dot.style.background = species.colorHex;
          const formula = document.createElement('b');
          formula.textContent = species.formula;
          const state = document.createElement('em');
          state.textContent = species.state;
          state.dataset.state = species.state;
          chip.append(dot, formula, state);
          row.appendChild(chip);
        });
        return row;
      });
      this.el.states.replaceChildren(...rows);
    }

    if (this.el.obs) {
      const observations = demo.observations || [];
      this.el.obs.replaceChildren(...observations.map((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        return li;
      }));
      if (this.el.obsSection) this.el.obsSection.hidden = !observations.length;
    }

    this.el.phen.textContent = eq.ph || '';
    this.el.phen.hidden = !eq.ph;

    this.el.ion.hidden = !eq.ion;
    this.el.ion.textContent = eq.ion ? `离子方程式：${eq.ion}` : '';
    this.el.note.hidden = !eq.note;
    this.el.note.textContent = eq.note ? `易错点：${eq.note}` : '';

    const hazard = demo.hazard;
    this.el.hazard.hidden = !hazard.warning;
    this.el.hazard.classList.toggle('is-danger', hazard.explosive);
    this.el.hazardText.textContent = hazard.text;

    this.el.plant.hidden = !demo.isLinked;
    if (demo.isLinked) this.el.plant.dataset.eq = eq.id;

    this._stepItems = demo.steps.map((step, index) => {
      const li = document.createElement('li');
      const idx = document.createElement('i');
      idx.textContent = `0${index + 1}`;
      const body = document.createElement('div');
      const title = document.createElement('b');
      title.textContent = step.title;
      const desc = document.createElement('span');
      desc.textContent = step.desc;
      body.append(title, desc);
      li.append(idx, body);
      return li;
    });
    this.el.steps.replaceChildren(...this._stepItems);

    const swatches = [
      [`反应物 · ${demo.colorNames.reactant}`, demo.swatches.reactant],
      [`产物 · ${demo.colorNames.product}`, demo.swatches.product],
      demo.hasGas && [`气体 · ${demo.colorNames.gas}`, demo.swatches.gas],
      demo.hasPpt && [`沉淀 · ${demo.colorNames.ppt}`, demo.swatches.ppt],
      demo.colors.solidSample && !demo.solidOnly && [`固体 · ${demo.colorNames.solid}`, demo.swatches.solid],
      demo.smoke && [`烟 · ${demo.colorNames.smoke}`, demo.swatches.smoke],
    ].filter(Boolean);
    this.el.swatches.replaceChildren(...swatches.map(([label, color]) => {
      const item = document.createElement('span');
      item.className = 'lab-swatch';
      const dot = document.createElement('i');
      dot.style.background = color;
      const text = document.createElement('em');
      text.textContent = label;
      item.append(dot, text);
      return item;
    }));
  }

  _createLabelsContent(demo) {
    const plant = this.mode === 'plant';
    const plantInfo = PLANT_INFO[demo.archetype];
    const name = this.labels.name.el;
    if (plant && plantInfo) {
      name.querySelector('b').textContent = `${plantInfo.code} ${plantInfo.name}`;
      name.querySelector('span').textContent = `${plantInfo.line} · ${demo.condLabel}`;
    } else {
      name.querySelector('b').textContent = demo.apparatus.name;
      name.querySelector('span').textContent = `${demo.apparatus.label.split(' · ')[1] || ''} · ${demo.condLabel}`;
    }

    let gasText = '';
    if (demo.archetype === 'tube') {
      const inlet = this.rig?.inletLabel || demo.reactants.find((r) => r.gas)?.formula || '';
      const inletText = inlet === 'H₂O' ? '水蒸气' : inlet;
      const out = demo.labels.gas;
      gasText = out ? `通入 ${inletText} · 尾气 ${out}` : `通入 ${inletText}`;
    } else if (demo.hasGas && demo.labels.gas) gasText = `↑ ${demo.labels.gas}`;
    else if (demo.gasInlet) gasText = this.rig?.inletLabel ? `通入 ${this.rig.inletLabel}` : '通入气体';
    this.labels.gas.el.textContent = gasText;
    this.labels.gas.el.hidden = !gasText;

    const showPpt = demo.hasPpt || demo.pptInitial;
    this.labels.ppt.el.textContent = showPpt ? `↓ ${demo.labels.ppt}` : '';
    this.labels.ppt.el.hidden = !showPpt;

    const mainProduct = demo.products[0]?.raw || '';
    this.labels.product.el.innerHTML = `<b>产物</b><span>${mainProduct}</span>`;
    this.labels.product.el.hidden = !mainProduct;

    this.labels.battery.el.hidden = demo.archetype !== 'cell';
    this.labels.battery.object.visible = !!this.rig?.labels.battery;
    this.labels.battery.el.innerHTML = demo.isBattery
      ? '<b>G</b><span>电流计</span>'
      : plant ? '<b>RECT</b><span>整流柜</span>' : '<b>DC 6V</b><span>电源</span>';

    this.labels.flame.el.innerHTML = demo.flame ? `<b>${demo.flame.label}</b>` : '';
    this.labels.flame.el.hidden = !demo.flame;

    this.labels.mist.el.textContent = demo.mist ? (demo.mist.gas ? `白雾 · ${demo.mist.gas}` : '白雾') : '';
    this.labels.mist.el.hidden = !demo.mist;

    this.labels.smoke.el.textContent = demo.smoke ? (demo.smokeLabel || '烟') : '';
    this.labels.smoke.el.hidden = !demo.smoke;

    this.labels.indicator.el.textContent = demo.indicator ? demo.indicator.label : '';
    this.labels.indicator.el.hidden = !demo.indicator;

    if (demo.cell) {
      if (demo.isBattery) {
        this.labels.cathode.el.innerHTML = '<b>负极</b> (−)';
        this.labels.anode.el.innerHTML = '<b>正极</b> (+)';
      } else {
        this.labels.anode.el.innerHTML = demo.cell.anodeGas
          ? `<b>阳极 (+)</b> ↑ ${demo.cell.anodeGas}`
          : '<b>阳极 (+)</b>';
        this.labels.cathode.el.innerHTML = demo.cell.cathodeMetal
          ? `<b>阴极 (−)</b> ${demo.cell.cathodeMetal} 析出`
          : demo.cell.cathodeGas
            ? `<b>阴极 (−)</b> ↑ ${demo.cell.cathodeGas}`
            : '<b>阴极 (−)</b>';
      }
      this.labels.anode.el.hidden = false;
      this.labels.cathode.el.hidden = false;
    } else {
      this.labels.anode.el.hidden = true;
      this.labels.cathode.el.hidden = true;
    }

    Object.values(this.labels).forEach((label) => label.el.classList.remove('is-on'));
  }

  _refreshLabels() {
    const rig = this.rig;
    if (!rig) return;
    const anchors = rig.labels;
    if (anchors.name) this.labels.name.object.position.copy(anchors.name);
    if (anchors.gas) this.labels.gas.object.position.copy(anchors.gas);
    if (anchors.ppt) this.labels.ppt.object.position.copy(anchors.ppt);
    if (anchors.product) this.labels.product.object.position.copy(anchors.product);
    if (anchors.battery) this.labels.battery.object.position.copy(anchors.battery);
    if (anchors.flame) this.labels.flame.object.position.copy(anchors.flame);
    if (anchors.mist) this.labels.mist.object.position.copy(anchors.mist);
    if (anchors.smoke) this.labels.smoke.object.position.copy(anchors.smoke);
    if (anchors.indicator) this.labels.indicator.object.position.copy(anchors.indicator);
    if (anchors.anode) this.labels.anode.object.position.copy(anchors.anode);
    if (anchors.cathode) this.labels.cathode.object.position.copy(anchors.cathode);
    this.labels.battery.object.visible = !!anchors.battery;
    this.labels.name.el.classList.add('is-on');
  }

  /* ---------------- rig ---------------- */

  _buildRig(demo) {
    if (this.rig) {
      this.scene.remove(this.rig.group);
      this._disposeObject(this.rig.group);
      this.rig = null;
    }
    const rig = {
      group: new THREE.Group(),
      flames: [],
      labels: {},
      flameMode: 'burner',
    };
    this.scene.add(rig.group);

    const mode = this.mode;
    if (demo.archetype === 'gasjar') buildGasjar(demo, rig, this.tex.flame, this.tex.coolFlame, mode);
    else if (demo.archetype === 'crucible') buildCrucible(demo, rig, this.tex.flame, mode);
    else if (demo.archetype === 'tube') buildTube(demo, rig, this.tex.flame, this.tex.coolFlame, mode);
    else if (demo.archetype === 'trough') buildTrough(demo, rig, this.tex.flame, this.tex.coolFlame, mode);
    else if (demo.archetype === 'cell') buildCell(demo, rig, mode);
    else buildBeaker(demo, rig, this.tex.flame, mode);

    const trayX = (demo.archetype === 'trough' || demo.archetype === 'cell') ? 1.62 : 1.34;
    addProductTray(demo, rig, trayX, mode);
    if (mode === 'plant') addPlantCommon(rig, demo, { cabinet: demo.archetype !== 'crucible' });

    this.rig = rig;
    this._setCameraFor(demo.archetype, demo, mode);
    this._resetEffects();
  }

  _disposeObject(root) {
    const shared = new Set(Object.values(this.tex));
    root.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((mat) => {
          if (mat.map && !shared.has(mat.map)) mat.map.dispose?.();
          mat.dispose?.();
        });
      }
    });
  }

  /* ---------------- playback ---------------- */

  togglePlay() {
    if (!this.isOpen) return;
    if (this.done) {
      this.restart();
      return;
    }
    this.playing = !this.playing;
    this._lastFrame = performance.now();
    this._updateUI();
  }

  restart() {
    if (!this.isOpen) return;
    this.t = 0;
    this.done = false;
    this.playing = true;
    this._lastPhase = -1;
    this._resetEffects();
    this._refreshLabels();
    this._lastFrame = performance.now();
    this._updateUI();
  }

  seek(index) {
    if (!this.isOpen) return;
    this.t = PHASE_STARTS[index] + 0.02;
    this.done = false;
    this.playing = true;
    this._lastPhase = -1;
    this._resetEffects();
    this._lastFrame = performance.now();
    this._updateUI();
  }

  setIntensity(value) {
    this.intensity = clamp(value, 0.3, 2);
    this.el.intensityVal.textContent = `${this.intensity.toFixed(1)}×`;
    this.el.intensity.value = String(this.intensity);
  }

  pause() {
    if (!this.isOpen) return;
    this.playing = false;
    this._updateUI();
  }

  _resetEffects() {
    Object.values(this.pools).forEach((pool) => pool.clear());
    for (const wave of this._waves) {
      this.scene.remove(wave.mesh);
      wave.mesh.geometry.dispose();
      wave.mesh.material.dispose();
    }
    this._waves.length = 0;
    this._bubbleAcc = 0;
    this._pptAcc = 0;
    this._smokeAcc = 0;
    this._steamAcc = 0;
    this._mistAcc = 0;
    this._sparkAcc = 0;
    this._lightAcc = 0;
    this._flash = 0;
    this.shake = 0;
    this.el.flash.style.opacity = 0;
    if (this.rig) {
      this.rig.group.position.set(0, 0, 0);
      if (this.rig.sedimentMat) this.rig.sedimentMat.opacity = 0;
      if (this.rig.vials) this.rig.vials.forEach((vial) => { vial.mat.opacity = 0; });
      if (this.rig.flames) this.rig.flames.forEach((flame) => { flame.mat.opacity = 0; });
      if (this.rig.flameLight) this.rig.flameLight.intensity = 0;
      if (this.rig.arcMat) this.rig.arcMat.opacity = 0;
      if (this.rig.cathodeGlow) this.rig.cathodeGlow.material.opacity = 0;
      if (this.rig.crucibleGlow) this.rig.crucibleGlow.material.opacity = 0;
      if (this.rig.powderMat) this.rig.powderMat.emissiveIntensity = 0;
      if (this.rig.powderGroup) this.rig.powderGroup.scale.set(1, 1, 1);
      if (this.rig.powder) this.rig.powder.scale.copy(this.rig.powderBase || this.rig.powder.scale);
      if (this.rig.moltenPool) this.rig.moltenPool.scale.setScalar(0.02);
      if (this.rig.slagRing) this.rig.slagRing.scale.setScalar(0.02);
      this.rig._rippled = false;
      if (this.rig.cover) this.rig.cover.position.y = this.rig.coverY.from;
      if (this.rig.plating) this.rig.plating.scale.set(1, 0.02, 0.55);
      if (this.rig.batteryCrust) this.rig.batteryCrust.forEach((crust) => crust.scale.set(1, 0.02, 0.55));
      if (this.rig.switchLever) this.rig.switchLever.rotation.z = -0.62;
      if (this.rig.meterNeedle) this.rig.meterNeedle.rotation.z = 0;
      if (this.rig.tweezers) this.rig.tweezers.visible = true;
      if (this.rig.depositLayer) {
        if (this.rig.solidStrip) {
          this.rig.depositLayer.scale.set(1.02, 0.04, 1.25);
          this.rig.depositLayer.position.y = 0.118;
        } else {
          this.rig.depositLayer.scale.set(0.01, 0.01, 0.01);
        }
      }
      if (this.rig.depositMat) this.rig.depositMat.opacity = 0;
      if (this.rig.thermoColumn) {
        this.rig.thermoColumn.scale.y = 0.22;
        this.rig.thermoColumn.position.y = this.rig.thermoBottom + 0.12;
      }
      if (this.rig.lampBulb) this.rig.lampBulb.emissiveIntensity = 0;
      if (this.rig.moltenGlow) this.rig.moltenGlow.material.opacity = 0.16;
      if (this.rig.metalMat && this.demo) this.rig.metalMat.color.set(this.demo.colors.solid);
      if (this.rig.solidMat && this.demo) this.rig.solidMat.color.set(this.demo.colors.solid);
      this.rig._rippled = false;
    }
  }

  /* ---------------- loop ---------------- */

  _loop(now) {
    if (!this.isOpen) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - this._lastFrame) / 1000));
    this._lastFrame = now;

    if (this.playing && !this.done) {
      this.t += dt;
      if (this.t >= DURATION) {
        this.t = DURATION;
        this.done = true;
        this.playing = false;
        this._updateUI();
      }
    }

    this._updateScene(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);

    this._uiAcc += dt;
    if (this._uiAcc >= 0.08) {
      this._uiAcc = 0;
      this._updateUI();
    }

    this._raf = requestAnimationFrame((next) => this._loop(next));
  }

  _updateUI() {
    if (!this.demo) return;
    const t = this.t;
    const phase = this._phaseIndex;
    const ratio = clamp(t / DURATION, 0, 1);
    this.el.trackFill.style.width = `${ratio * 100}%`;
    this.el.timer.textContent = `${t.toFixed(1)}s`;

    this.el.play.classList.toggle('is-playing', this.playing);
    const playLabel = this.el.play.querySelector('span');
    if (playLabel) playLabel.textContent = this.playing ? '暂停' : (this.done ? '重播' : '播放');

    this.el.phaseLabel.textContent = this.done ? '演示完成' : PHASE_STATES[phase];
    this._phaseButtons.forEach((btn, index) => {
      btn.classList.toggle('is-active', index === phase && !this.done);
      btn.classList.toggle('is-done', index < phase || this.done);
    });
    this._stepItems.forEach((li, index) => {
      li.classList.toggle('is-active', index === phase && !this.done);
      li.classList.toggle('is-done', index < phase || this.done);
    });

    const plantInfo = PLANT_INFO[this.demo.archetype];
    if (this.done) {
      this.el.telemetry.textContent = this.mode === 'plant' && plantInfo
        ? `${plantInfo.code} · 产物已采出 · 演示完成`
        : '产物已收集 · 演示完成';
    } else {
      this.el.telemetry.textContent = `${this.mode === 'plant' && plantInfo ? `${plantInfo.code} · ` : ''}${PHASE_NAMES[phase]} · ${this.demo.condLabel}`;
    }
  }

  /* ---------------- scene animation ---------------- */

  _pptState(t) {
    const demo = this.demo;
    const start = PHASE_STARTS[2];
    if (!demo.hasPpt) {
      if (!demo.smoke) return { opacity: 0, color: demo.colors.smoke, scale: 1 };
      const k = t >= start ? smooth((t - start) / 2.4) : 0;
      return { opacity: k * 0.85, color: demo.colors.smoke, scale: 0.4 + 0.6 * k };
    }
    switch (demo.pptTimeline) {
      case 'dissolve': {
        const k = smooth((t - start) / 2.8);
        return { opacity: 0.88 * (1 - k), color: this.palette.pptFrom, scale: 1 - 0.3 * k };
      }
      case 'form-dissolve': {
        const form = smooth((t - start) / 1.7);
        const dissolve = smooth((t - start - 2.2) / 2.2);
        return {
          opacity: 0.86 * form * (1 - dissolve),
          color: this.palette.pptTo,
          scale: (0.4 + 0.6 * form) * (1 - 0.3 * dissolve),
        };
      }
      case 'convert': {
        const k = smooth((t - start) / 3.2);
        const color = new THREE.Color(this.palette.pptFrom).lerp(new THREE.Color(this.palette.pptTo), k).getHex();
        return { opacity: 0.88, color, scale: 1 };
      }
      case 'aging': {
        const stops = demo.pptAging || [this.palette.pptTo];
        const k = clamp((t - start) / 3.6, 0, 1);
        const color = k < 0.5
          ? new THREE.Color(stops[0]).lerp(new THREE.Color(stops[1] ?? stops[0]), k * 2).getHex()
          : new THREE.Color(stops[1] ?? stops[0]).lerp(new THREE.Color(stops[2] ?? stops[1]), (k - 0.5) * 2).getHex();
        return { opacity: 0.88, color, scale: 1 };
      }
      default: {
        const k = smooth((t - start) / 2.4);
        return { opacity: 0.85 * k, color: this.palette.pptTo, scale: 0.4 + 0.6 * k };
      }
    }
  }

  _pptEmitWindow(t) {
    const demo = this.demo;
    if (!demo.hasPpt) return false;
    const start = PHASE_STARTS[2];
    switch (demo.pptTimeline) {
      case 'dissolve': return false;
      case 'form-dissolve': return t >= start && t < start + 2.2;
      case 'convert': return t >= start && t < start + 2.6;
      case 'aging': return t >= start && t < start + 2.8;
      default: return t >= start && t < PHASE_STARTS[3];
    }
  }

  _updateScene(dt) {
    const demo = this.demo;
    const rig = this.rig;
    if (!demo || !rig) return;

    const t = this.t;
    const phase = this._phaseIndex;
    const cond = t >= PHASE_STARTS[1];
    const reacting = t >= PHASE_STARTS[2] && t < PHASE_STARTS[3];
    const product = t >= PHASE_STARTS[3];

    if (phase !== this._lastPhase) {
      this._onPhase(phase);
      this._lastPhase = phase;
    }

    if (rig.liquidMat) {
      const k = smooth((t - PHASE_STARTS[2]) / 2.6);
      if (rig.molten) {
        // 熔融电解质保持高温熔体本色，不随溶液配色变化
        rig.liquidMat.color.setHex(0xc25a18);
        rig.liquidMat.emissiveIntensity = 0.26 + Math.sin(t * 4) * 0.05;
      } else {
        const base = new THREE.Color(demo.liquid.from.color);
        const target = new THREE.Color(demo.liquid.to.color);
        const col = base.lerp(target, k);
        if (demo.indicator && rig.arch !== 'cell') {
          const tint = demo.indicator.fade
            ? clamp(1 - smooth((t - PHASE_STARTS[3] - 0.2) / 2.0), 0, 1)
            : smooth((t - PHASE_STARTS[2]) / 1.4);
          col.lerp(new THREE.Color(demo.indicator.color), tint * (rig.arch === 'trough' ? 0.85 : 0.7));
        }
        // 近白色溶液在 HSL 中饱和度仍很高，需用 sRGB 感知色度判断是否补底色
        const srgb = col.getHex();
        const rawChroma = (Math.max((srgb >> 16) & 255, (srgb >> 8) & 255, srgb & 255)
          - Math.min((srgb >> 16) & 255, (srgb >> 8) & 255, srgb & 255)) / 255;
        const paleThreshold = rig.arch === 'cell' ? 0.3 : rig.arch === 'trough' ? 0.22 : 0.12;
        if (rawChroma < paleThreshold) {
          if (rig.arch === 'cell') col.lerp(new THREE.Color(0x3f9fbe), 0.58);
          else if (rig.arch === 'trough') col.lerp(new THREE.Color(0x8fd2e6), 0.38);
          else col.lerp(new THREE.Color(0x8fd2e6), 0.2);
        }
        rig.liquidMat.color.lerp(col, 1 - Math.exp(-dt * 1.8));
        const opacity = lerp(demo.liquid.from.opacity, demo.liquid.to.opacity, k);
        const floor = rig.arch === 'cell' ? 0.86 : rig.arch === 'trough' ? 0.68 : 0.3;
        // 浅色溶液降低不透明度，避免淹没烧杯内的固体与析出物
        const cap = rig.arch === 'beaker'
          ? (rawChroma < 0.3 ? 0.46 : rawChroma < 0.48 ? 0.62 : 0.84)
          : 0.92;
        const targetOpacity = clamp(opacity * (0.78 + 0.3 * this.intensity), floor, cap);
        rig.liquidMat.opacity += (targetOpacity - rig.liquidMat.opacity) * Math.min(1, dt * 2);
      }
      if (rig.surfaceMat) {
        rig.surfaceMat.color.copy(rig.liquidMat.color).lerp(new THREE.Color(0xffffff), 0.18);
        rig.surfaceMat.opacity = clamp(0.2 + 0.1 * this.intensity, 0.18, 0.38);
      }
      if (rig.moltenGlow) {
        rig.moltenGlow.material.opacity = cond ? 0.13 + Math.sin(t * 5) * 0.035 : 0.09;
      }
    }

    if (rig.cathodeTintMat) {
      const tint = smooth((t - PHASE_STARTS[2]) / 1.6);
      rig.cathodeTintMat.opacity = 0.62 * tint;
      if (rig.cathodeTintGlow) rig.cathodeTintGlow.material.opacity = 0.55 * tint;
    }

    if (rig.gasMat) {
      const target = new THREE.Color(product ? demo.colors.gasTo : demo.colors.gasFrom);
      rig.gasMat.color.lerp(target, 1 - Math.exp(-dt * 1.2));
      const active = demo.hasGas || demo.gasInlet || demo.smoke;
      rig.gasMat.opacity = active ? 0.2 + 0.1 * this.intensity : 0.05;
    }

    if (rig.powderMat) {
      const base = demo.colors.solidMix ?? demo.colors.solid ?? demo.colors.reactant;
      const solidTarget = demo.colors.solidTo;
      const tube = rig.arch === 'tube';
      // 试管中的高温还原产物需明显发黑，加深目标色并加快过渡
      const target = product
        ? (solidTarget != null
          ? new THREE.Color(solidTarget).multiplyScalar(tube ? 0.45 : 0.7)
          : new THREE.Color(tube ? 0x1b1f22 : 0x3a3f44))
        : new THREE.Color(base);
      rig.powderMat.color.lerp(target, 1 - Math.exp(-dt * (tube ? 2.6 : 1.6)));
      const hot = reacting && (demo.flags.heat || demo.flags.flame)
        ? (demo.thermite ? 0.72 + Math.sin(t * 12) * 0.18 : 0.16 + Math.sin(t * 7) * 0.05)
        : 0;
      rig.powderMat.emissive.setHex(demo.thermite ? 0xffe2b0 : 0xff5a14);
      rig.powderMat.emissiveIntensity = hot;
    }
    if (rig.powderGroup) {
      const collapse = smooth((t - PHASE_STARTS[2] - (demo.thermite ? 0.5 : 1.4)) / (demo.thermite ? 2.0 : 2.8));
      const floor = demo.colors.solidTo == null ? 0.2 : 0.6;
      const xz = lerp(1, floor, collapse);
      const y = lerp(1, demo.thermite ? 0.28 : floor, collapse);
      rig.powderGroup.scale.set(xz, y, xz);
    }
    if (rig.arch === 'tube' && rig.powder) {
      const k = smooth((t - PHASE_STARTS[2] - 0.6) / 3.0);
      const to = demo.colors.solidTo == null ? 0.3 : 0.92;
      rig.powder.scale.set(
        rig.powderBase.x * lerp(1, to, k),
        rig.powderBase.y * lerp(1, to, k),
        rig.powderBase.z * lerp(1, to, k),
      );
    }

    if (rig.crucibleGlow) {
      const glowTarget = reacting && (demo.flags.heat || demo.flags.flame)
        ? (demo.thermite ? 0.42 + Math.sin(t * 11) * 0.08 : 0.24 + Math.sin(t * 9) * 0.08)
        : 0;
      rig.crucibleGlow.material.opacity += (glowTarget - rig.crucibleGlow.material.opacity) * Math.min(1, dt * 5);
      const tube = rig.arch === 'tube';
      const gx = (demo.thermite ? 0.95 : tube ? 0.5 : 0.38) + Math.sin(t * 6.4) * (demo.thermite ? 0.08 : 0.03);
      rig.crucibleGlow.scale.set(gx, gx * (demo.thermite ? 0.8 : tube ? 0.62 : 1), 1);
    }

    if (rig.moltenPoolMat) {
      const grow = smooth((t - PHASE_STARTS[2] - 0.4) / 1.8);
      const cool = smooth((t - PHASE_STARTS[3] - 0.8) / 2.6);
      rig.moltenPool.scale.setScalar(0.02 + 0.98 * grow);
      rig.moltenPoolMat.opacity = 0.96 * Math.min(1, grow * 2.4);
      rig.moltenPoolMat.color.lerpColors(IRON_HOT, IRON_COOL, cool);
      rig.moltenPoolMat.emissiveIntensity = (reacting ? 0.95 : 0.5) * (1 - cool * 0.92);
      if (rig.slagMat) {
        const slag = smooth((t - PHASE_STARTS[2] - 1.2) / 2.4);
        rig.slagRing.scale.setScalar(0.02 + 0.98 * slag);
        rig.slagMat.opacity = 0.9 * slag;
      }
    }

    if (rig.crucibleMat) {
      const heatGlow = cond ? (reacting ? 0.18 + Math.sin(t * 5.5) * 0.07 : 0.1) : 0;
      rig.crucibleMat.emissive?.setHex(0xff4a0a);
      rig.crucibleMat.emissiveIntensity = demo.flags.heat || demo.flags.flame ? heatGlow : 0;
    }

    if (rig.solid) {
      const k = smooth((t - PHASE_STARTS[2]) / 3.4);
      if (rig.solidStrip) {
        const w = 1 - 0.32 * k;
        rig.solid.scale.set(w, 1 - 0.06 * k, w);
      } else {
        rig.solid.scale.setScalar(Math.max(0.26, 1 - 0.7 * k));
      }
    }

    if (rig.sedimentMat) {
      const ppt = this._pptState(t);
      const speed = ppt.opacity > rig.sedimentMat.opacity ? 2.6 : 2.0;
      rig.sedimentMat.opacity += (ppt.opacity - rig.sedimentMat.opacity) * Math.min(1, dt * speed);
      rig.sedimentMat.color.setHex(ppt.color);
      rig.sediment.visible = rig.sedimentMat.opacity > 0.01;
      const s = ppt.scale * (rig.pptStyle === 'gel' ? 1.04 : rig.pptStyle === 'curdy' ? 0.98 : 0.9);
      rig.sediment.scale.set(s, 1, s);
    }

    if (rig.depositLayer && demo.deposit) {
      const k = smooth((t - PHASE_STARTS[2] - 0.3) / 2.8);
      if (rig.solidStrip) {
        const s = 0.04 + 0.96 * k;
        rig.depositLayer.scale.set(1.02, s, 1.25);
        rig.depositLayer.position.y = 0.11 + 0.21 * s;
      } else {
        const s = 0.02 + 0.98 * k;
        rig.depositLayer.scale.set(s, s * 0.75, s * 0.9);
      }
      rig.depositMat.opacity = 0.97 * k;
    }

    if (rig.plating) {
      const k = smooth((t - PHASE_STARTS[2] - 0.2) / 2.8);
      rig.plating.scale.set(1, 0.02 + 0.98 * k, 0.55 + 0.45 * k);
    }

    if (rig.batteryCrust) {
      const k = smooth((t - PHASE_STARTS[2]) / 2.8);
      rig.batteryCrust.forEach((crust) => crust.scale.set(1, 0.02 + 0.98 * k, 0.55 + 0.45 * k));
    }

    if (rig.cover) {
      const k = smooth((t - PHASE_STARTS[1]) / 1.0);
      rig.cover.position.y = lerp(rig.coverY.from, rig.coverY.to, k);
    }

    if (rig.switchLever) {
      const target = cond ? 0 : -0.62;
      rig.switchLever.rotation.z += (target - rig.switchLever.rotation.z) * Math.min(1, dt * 4);
    }

    if (rig.meterNeedle) {
      const target = reacting ? 0.26 + Math.sin(t * 3.4) * 0.06 : (product ? 0.16 : 0);
      rig.meterNeedle.rotation.z += (target - rig.meterNeedle.rotation.z) * Math.min(1, dt * 3);
    }

    if (rig.lampBulb) {
      const target = cond && demo.flags.light ? 1.7 : 0;
      rig.lampBulb.emissiveIntensity += (target - rig.lampBulb.emissiveIntensity) * Math.min(1, dt * 5);
    }

    if (rig.thermoColumn) {
      let level = 0.24;
      if (demo.exotherm) level = lerp(0.3, 0.96, smooth((t - PHASE_STARTS[2]) / 2.4));
      else if (demo.endotherm) level = lerp(0.3, 0.06, smooth((t - PHASE_STARTS[2]) / 2.4));
      else if (demo.flags.heat || demo.flags.flame) level = cond ? 0.62 : 0.26;
      const length = 0.1 + level * 0.85;
      rig.thermoColumn.scale.y += (length - rig.thermoColumn.scale.y) * Math.min(1, dt * 3);
      rig.thermoColumn.position.y = rig.thermoBottom + 0.06 + rig.thermoColumn.scale.y / 2;
    }

    if (rig.vials) {
      rig.vials.forEach((vial, index) => {
        const delay = index * 0.18;
        const target = product ? 0.82 : 0;
        vial.mat.opacity += (target - vial.mat.opacity) * Math.min(1, dt * (product ? 2.2 : 4));
      });
    }

    // flames
    const flameOn = rig.flameMode === 'metal'
      ? reacting
      : rig.flameMode === 'combustion'
        ? (reacting || (product && t < 7.4))
        : cond;
    rig.flames.forEach((flame) => {
      const active = demo.flags.heat || demo.flags.flame || rig.flameMode === 'metal';
      let target = active && flameOn ? (flame.role === 'core' ? 0.5 : 0.75) : 0;
      if (flame.role === 'tail') target = reacting || (product && this.t < PHASE_STARTS[3] + 0.9) ? 0.6 : 0;
      flame.mat.opacity += (target - flame.mat.opacity) * Math.min(1, dt * 5);
      if (flame.mat.opacity > 0.01) {
        const wobble = 1 + Math.sin(t * 17 + flame.seed) * 0.07 + Math.sin(t * 31 + flame.seed * 2) * 0.04;
        flame.sprite.scale.set(flame.sx * wobble, flame.sy * wobble, 1);
      }
    });
    if (rig.flameLight) {
      rig.flameLight.intensity = Math.max(0, rig.flames[0]?.mat.opacity || 0) * 6;
    }
    if (rig.heatRing) {
      rig.heatRing.material.opacity = cond && demo.flags.heat ? 0.45 + Math.sin(t * 6) * 0.15 : 0;
    }
    if (rig.lightGlow) {
      rig.lightGlow.material.opacity = cond ? 0.45 + Math.sin(t * 9) * 0.15 : 0;
    }

    // bubbles
    if (demo.bubbleGas && reacting && !demo.isBattery) {
      const rate = (rig.bubbleRate || 22) * this.intensity;
      this._bubbleAcc += dt * rate;
      while (this._bubbleAcc >= 1) {
        this._bubbleAcc -= 1;
        this._emitBubble(rig);
      }
    }

    // precipitate particles
    if (this._pptEmitWindow(t) && rig.arch === 'beaker') {
      const style = demo.pptStyle;
      const rate = (style === 'gel' ? 11 : style === 'curdy' ? 17 : 26) * this.intensity;
      const size = style === 'gel' ? [0.09, 0.15] : style === 'curdy' ? [0.07, 0.12] : [0.03, 0.06];
      const fall = style === 'gel' ? [0.05, 0.11] : style === 'curdy' ? [0.08, 0.16] : [0.14, 0.26];
      const color = this._pptState(t).color;
      this._pptAcc += dt * rate;
      while (this._pptAcc >= 1) {
        this._pptAcc -= 1;
        const a = Math.random() * TAU;
        const rr = Math.random() * (rig.radius * 0.85);
        this.pools.ppt.emit({
          x: Math.cos(a) * rr, y: rand(rig.bottomY + 0.14, rig.surfaceY - 0.06), z: Math.sin(a) * rr,
          vx: rand(-0.02, 0.02), vy: -rand(fall[0], fall[1]), vz: rand(-0.02, 0.02),
          life: rand(1.7, 2.8), size: rand(size[0], size[1]), grow: style === 'fine' ? 0.01 : 0.035,
          color, opacity: style === 'fine' ? 0.95 : 0.8,
        });
      }
    }

    if (demo.deposit && rig.arch === 'beaker' && reacting) {
      this._pptAcc += dt * 9 * this.intensity;
      while (this._pptAcc >= 1) {
        this._pptAcc -= 1;
        this.pools.ppt.emit({
          x: -0.16 + rand(-0.1, 0.1), y: rand(rig.bottomY + 0.16, 0.42), z: 0.08 + rand(-0.1, 0.1),
          vx: rand(-0.02, 0.02), vy: -rand(0.08, 0.16), vz: rand(-0.02, 0.02),
          life: rand(1.1, 1.8), size: rand(0.02, 0.042), color: this.palette.deposit, opacity: 0.95,
        });
      }
    }

    // smoke / steam
    if (reacting && rig.smokeAnchor) {
      if (demo.smoke) {
        const dense = rig.arch === 'gasjar';
        this._smokeAcc += dt * ((dense ? 15 : 7) + 5 * this.intensity);
        while (this._smokeAcc >= 1) {
          this._smokeAcc -= 1;
          const anchor = rig.smokeAnchor;
          this.pools.smoke.emit({
            x: anchor.x + rand(-0.12, 0.12), y: anchor.y + rand(-0.05, 0.08), z: anchor.z + rand(-0.12, 0.12),
            vx: rand(-0.05, 0.05), vy: dense ? rand(0.04, 0.1) : rand(0.12, 0.24), vz: rand(-0.05, 0.05),
            life: dense ? rand(2.2, 3.2) : rand(1.6, 2.6), size: dense ? rand(0.28, 0.46) : rand(0.18, 0.3), grow: dense ? 0.5 : 0.36,
            color: this.palette.smoke, opacity: dense ? 0.6 : 0.3,
          });
        }
      } else if (rig.arch === 'crucible' && (demo.flags.heat || demo.flags.flame)) {
        this._steamAcc += dt * 4;
        while (this._steamAcc >= 1) {
          this._steamAcc -= 1;
          const anchor = rig.smokeAnchor;
          this.pools.steam.emit({
            x: anchor.x + rand(-0.1, 0.1), y: anchor.y, z: anchor.z + rand(-0.1, 0.1),
            vx: rand(-0.03, 0.03), vy: rand(0.12, 0.22), vz: rand(-0.03, 0.03),
            life: rand(1.2, 2.0), size: rand(0.12, 0.2), grow: 0.24, color: 0xffffff, opacity: 0.18,
          });
        }
      }
    }

    // acid mist (HCl / HNO3 vapours)
    if (demo.mist && !demo.smoke && rig.arch !== 'cell'
      && (reacting || (product && t < PHASE_STARTS[3] + 2.2))) {
      const anchor = rig.steamAnchor || rig.smokeAnchor;
      if (anchor) {
        this._mistAcc += dt * (7 + 4 * this.intensity);
        while (this._mistAcc >= 1) {
          this._mistAcc -= 1;
          this.pools.steam.emit({
            x: anchor.x + rand(-0.14, 0.14), y: anchor.y + rand(-0.02, 0.08), z: anchor.z + rand(-0.14, 0.14),
            vx: rand(-0.06, 0.06), vy: rand(0.16, 0.3), vz: rand(-0.06, 0.06),
            life: rand(1.3, 2.2), size: rand(0.16, 0.28), grow: 0.4, color: 0xffffff, opacity: 0.3,
          });
        }
      }
    }

    // heat haze for strongly exothermic reactions
    if (demo.exotherm && reacting && rig.arch === 'beaker' && rig.steamAnchor) {
      this._steamAcc += dt * 5;
      while (this._steamAcc >= 1) {
        this._steamAcc -= 1;
        const anchor = rig.steamAnchor;
        this.pools.steam.emit({
          x: anchor.x + rand(-0.2, 0.2), y: anchor.y, z: anchor.z + rand(-0.2, 0.2),
          vx: rand(-0.05, 0.05), vy: rand(0.16, 0.28), vz: rand(-0.05, 0.05),
          life: rand(1.1, 1.9), size: rand(0.12, 0.22), grow: 0.3, color: 0xffffff, opacity: 0.16,
        });
      }
    }

    // sparks
    if (reacting && (demo.hazard.explosive || demo.thermite || demo.flags.flame)) {
      const rate = demo.hazard.explosive ? 9 : demo.thermite ? 16 : 2.4;
      this._sparkAcc += dt * rate * this.intensity;
      while (this._sparkAcc >= 1) {
        this._sparkAcc -= 1;
        const p = rig.boomPos || new THREE.Vector3(0, 0.7, 0);
        this.pools.spark.emit({
          x: p.x + rand(-0.14, 0.14), y: p.y + rand(-0.05, 0.1), z: p.z + rand(-0.14, 0.14),
          vx: rand(-1.1, 1.1), vy: demo.thermite ? rand(1.0, 2.6) : rand(0.8, 1.8), vz: rand(-1.1, 1.1),
          life: rand(0.4, 0.9), size: demo.thermite ? rand(0.03, 0.06) : rand(0.025, 0.05),
          gravity: -3.4, drag: 1.4,
          color: this.palette.spark, opacity: 0.9,
        });
      }
    }

    if (rig.metal) this._animateMetal(rig, t);

    if (demo.flags.light) {
      this._lightAcc += dt;
      if (cond && this._lightAcc > 2.1) {
        this._lightAcc = 0;
        this._flashScreen(0.22);
      }
    }

    if (rig.arcMat) {
      rig.arcMat.opacity = cond && !demo.isBattery ? (Math.random() < 0.3 ? 0.54 : 0.16) : 0;
      if (rig.arc) rig.arc.material.rotation = Math.random() * 0.2 - 0.1;
    }

    if (rig.cathodeGlow) {
      const target = product ? 0.48 : reacting ? 0.36 + Math.sin(t * 3.2) * 0.1 : 0;
      rig.cathodeGlow.material.opacity += (target - rig.cathodeGlow.material.opacity) * Math.min(1, dt * 3);
    }

    // explosion shake + flash decay
    this.shake = Math.max(0, this.shake - dt * 0.6);
    rig.group.position.x = (Math.random() - 0.5) * this.shake;
    rig.group.position.y = (Math.random() - 0.5) * this.shake * 0.7;
    rig.group.position.z = (Math.random() - 0.5) * this.shake;

    if (this._flash > 0) {
      this._flash = Math.max(0, this._flash - dt * 1.5);
      this.el.flash.style.opacity = this._flash;
    }

    for (let i = this._waves.length - 1; i >= 0; i--) {
      const wave = this._waves[i];
      wave.life += dt;
      const k = wave.life / wave.total;
      if (k >= 1) {
        this.scene.remove(wave.mesh);
        wave.mesh.geometry.dispose();
        wave.mesh.material.dispose();
        this._waves.splice(i, 1);
        continue;
      }
      const s = 1 + k * 7;
      wave.mesh.scale.set(s, s, s);
      wave.mesh.material.opacity = 0.6 * (wave.strength ?? 1) * (1 - k);
    }

    if (this.dust) this.dust.rotation.y += dt * 0.012;

    this._updateLabelState(cond, reacting, product, flameOn);
    Object.values(this.pools).forEach((pool) => pool.update(dt));
  }

  _updateLabelState(cond, reacting, product, flameOn) {
    const demo = this.demo;
    if (!demo) return;
    const gasOn = ((demo.hasGas && (reacting || product)) || (demo.gasInlet && cond))
      && demo.archetype !== 'cell';
    this.labels.gas.el.classList.toggle('is-on', !!gasOn);
    this.labels.gas.el.classList.toggle('is-inlet', !demo.hasGas && !!demo.gasInlet);
    let pptOn = (demo.hasPpt || demo.pptInitial) && (cond || reacting || product);
    if (demo.pptTimeline === 'dissolve' && this.t > PHASE_STARTS[2] + 3.2) pptOn = false;
    this.labels.ppt.el.classList.toggle('is-on', pptOn);
    this.labels.product.el.classList.toggle('is-on', product);
    const flameLabelOn = !!demo.flame && !!flameOn && !(product && this.t > PHASE_STARTS[3] + 1.2);
    this.labels.flame.el.classList.toggle('is-on', flameLabelOn);
    this.labels.mist.el.classList.toggle('is-on',
      !!demo.mist && (reacting || (product && this.t < PHASE_STARTS[3] + 2.2)));
    this.labels.smoke.el.classList.toggle('is-on',
      !!demo.smoke && (reacting || (product && this.t < PHASE_STARTS[3] + 1.4)));
    this.labels.indicator.el.classList.toggle('is-on',
      !!demo.indicator && (cond || reacting || product));
    const electrodeOn = demo.archetype === 'cell' && (cond || reacting || product);
    this.labels.anode.el.classList.toggle('is-on', electrodeOn);
    this.labels.cathode.el.classList.toggle('is-on', electrodeOn);
    if (demo.archetype === 'cell') this.labels.battery.el.classList.toggle('is-on', true);
    this.labels.name.el.classList.toggle('is-hot', cond && !!(demo.flags.heat || demo.flags.flame || demo.flags.electric));
  }

  _emitBubble(rig) {
    const demo = this.demo;
    const c = this.palette.bubble;
    let color = c;
    let x = 0;
    let z = 0;
    let y = rig.bubbleBottom;
    if (rig.arch === 'trough' && rig.metal) {
      x = rig.metal.position.x + rand(-0.1, 0.1);
      z = rig.metal.position.z + rand(-0.1, 0.1);
      y = rig.waterY - 0.16;
    } else if (rig.electrodes) {
      const active = (rig.electrodeBubbles || []).filter((item) => item.active);
      const pick = active.length
        ? active[Math.floor(Math.random() * active.length)]
        : { x: rig.electrodes[Math.random() < 0.5 ? 0 : 1], color: c };
      x = pick.x + rand(-0.045, 0.045);
      z = rand(-0.14, 0.14);
      y = rig.bubbleBottom;
      color = pick.color ?? c;
    } else if (rig.bubbleOrigin) {
      x = rig.bubbleOrigin.x + rand(-0.1, 0.1);
      z = rig.bubbleOrigin.z + rand(-0.1, 0.1);
      y = rig.bubbleOrigin.y;
    } else {
      const a = Math.random() * TAU;
      const rr = Math.random() * (rig.radius || 0.4);
      x = Math.cos(a) * rr;
      z = Math.sin(a) * rr;
    }
    const speed = rand(0.2, 0.42);
    const top = rig.bubbleTop || 0.5;
    const life = Math.max(0.5, (top - y) / speed);
    this.pools.bubble.emit({
      x, y, z,
      vx: rand(-0.03, 0.03), vy: speed, vz: rand(-0.03, 0.03),
      life, size: rand(0.035, 0.07), grow: 0.02, color, opacity: rand(0.55, 0.9),
    });
  }

  _animateMetal(rig, t) {
    const metal = rig.metal;
    if (!metal) return;
    const surface = rig.waterY;
    const startY = rig.metalDropY ?? 1.16;
    if (t < 0.25) {
      metal.position.set(0, startY, 0);
      metal.scale.set(1, 1, 1);
      metal.visible = true;
    } else if (t < 0.85) {
      const k = smooth((t - 0.25) / 0.6);
      metal.position.set(0, lerp(startY, surface + 0.035, k), 0);
      metal.scale.set(1, lerp(1, 0.62, k), 1);
      metal.visible = true;
    } else {
      metal.position.y = surface + 0.045 + Math.sin(t * 9) * 0.006;
      const wander = t > 1.2 ? 0.34 : 0.04;
      metal.position.x = Math.sin(t * 2.6) * wander;
      metal.position.z = Math.cos(t * 1.9) * wander * 0.55;
      metal.rotation.y = t * 1.6;
      const shrink = t > PHASE_STARTS[2] ? clamp(1 - (t - PHASE_STARTS[2]) / 4.2, 0.22, 1) : 1;
      metal.scale.set(shrink, shrink * 0.62, shrink);
      metal.visible = t < PHASE_STARTS[3] + 0.7;
      if (!rig._rippled) {
        rig._rippled = true;
        this._addWave(metal.position.x, surface + 0.014, metal.position.z, 0xcfefff, 1.2, 0.8);
        this._addWave(metal.position.x, surface + 0.014, metal.position.z, 0xffffff, 1.6, 0.5);
      }
    }
    if (rig.tweezers) {
      const withdraw = smooth((t - 0.9) / 0.9);
      rig.tweezers.visible = t < 2.0;
      rig.tweezers.position.set(metal.position.x, metal.position.y + 0.02 + withdraw * 0.8, metal.position.z);
      rig.tweezers.rotation.z = withdraw * 0.35;
      rig.tweezers.rotation.x = withdraw * 0.18;
    }
    if (rig.metalFlame) {
      rig.flames.forEach((flame, index) => {
        flame.sprite.position.set(
          metal.position.x,
          metal.position.y + (index === 0 ? 0.12 : 0.07),
          metal.position.z,
        );
      });
    }
  }

  _addWave(x, y, z, color, total = 0.9, strength = 1) {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.55 * strength, side: THREE.DoubleSide, depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 48), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this._waves.push({ mesh, life: 0, total, strength });
    return mesh;
  }

  _onPhase(phase) {
    const demo = this.demo;
    if (!demo) return;
    if (phase === 1 && demo.flags.light) this._flashScreen(0.2);
    if (phase === 2 && demo.hazard.explosive) this._explode();
    else if (phase === 2 && demo.flags.flame) this._sparkBurst(10, 0.5);
    if (phase === 2 && demo.thermite) {
      this._flashScreen(0.3);
      this._sparkBurst(38, 1.1);
      this.shake = 0.45;
    }
  }

  _explode() {
    const p = this.rig?.boomPos || new THREE.Vector3(0, 0.7, 0);
    this._sparkBurst(46, 1);
    for (let i = 0; i < 14; i++) {
      this.pools.smoke.emit({
        x: p.x + rand(-0.2, 0.2), y: p.y + rand(-0.1, 0.2), z: p.z + rand(-0.2, 0.2),
        vx: rand(-0.5, 0.5), vy: rand(0.3, 0.9), vz: rand(-0.5, 0.5),
        life: rand(1.4, 2.4), size: rand(0.3, 0.5), grow: 0.7, drag: 0.8,
        color: 0x8b9096, opacity: 0.5,
      });
    }
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfff0d0, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.4, 48), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(p);
    mesh.position.y = 0.06;
    this.scene.add(mesh);
    this._waves.push({ mesh, life: 0, total: 0.95 });
    this.shake = 0.16;
    this._flashScreen(0.8);
  }

  _sparkBurst(count, power = 1) {
    const p = this.rig?.boomPos || new THREE.Vector3(0, 0.7, 0);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const up = rand(0.4, 1.8) * power;
      this.pools.spark.emit({
        x: p.x + rand(-0.08, 0.08), y: p.y + rand(-0.05, 0.08), z: p.z + rand(-0.08, 0.08),
        vx: Math.cos(a) * rand(0.8, 2.8) * power, vy: up * 2, vz: Math.sin(a) * rand(0.8, 2.8) * power,
        life: rand(0.45, 1.1), size: rand(0.02, 0.055),
        gravity: -4.2, drag: 1.2, color: 0xffc46a, opacity: 0.95,
      });
    }
  }

  _flashScreen(strength) {
    this._flash = Math.max(this._flash, strength);
    this.el.flash.style.opacity = this._flash;
  }
}

/* ------------------------------------------------------------
   Convenience
   ------------------------------------------------------------ */

export function createEquationLab(options) {
  return new EquationLab(options);
}
