import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function makeCanvasTexture(width, height, draw, { srgb = true, repeat = null } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return { canvas, ctx, tex };
}

function softTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 128) {
  const { tex } = makeCanvasTexture(size, size, (ctx) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.45, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
  return tex;
}

function hazardTexture() {
  const { tex } = makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#121a20';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = '#f2b230';
    ctx.lineWidth = 42;
    for (let i = 0; i < 24; i++) {
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, 205, (i / 24) * TAU, ((i + 1) / 24) * TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(230,190,80,.85)';
    ctx.font = '600 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('R-101 · REACTION AREA', w / 2, 108);
    ctx.fillText('高温 · 高压 · 化学品', w / 2, h - 92);
    ctx.strokeStyle = 'rgba(235,195,85,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 250, 0, TAU);
    ctx.stroke();
  });
  return tex;
}

function floorTexture() {
  const { tex } = makeCanvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#333b42';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const a = Math.random() * 0.09;
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      ctx.fillRect(x, y, Math.random() * 2 + 0.4, Math.random() * 2 + 0.4);
    }
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 25 + Math.random() * 100;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(10,16,18,.14)');
      g.addColorStop(1, 'rgba(10,16,18,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.strokeStyle = 'rgba(8,12,15,.55)';
    ctx.lineWidth = 3;
    for (let x = 0; x <= w; x += 256) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 256) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(180,205,215,.035)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }, { repeat: [5, 4] });
  return tex;
}

function asphaltTexture() {
  const { tex } = makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#5c6870';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = Math.random() > 0.55 ? 'rgba(236,244,248,.09)' : 'rgba(0,0,0,.12)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    for (let i = 0; i < 16; i++) {
      ctx.strokeStyle = 'rgba(0,0,0,.12)';
      ctx.lineWidth = 1 + Math.random();
      ctx.beginPath();
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 80, y + 30, x + 30, y + 130, x + 160, y + 160);
      ctx.stroke();
    }
  }, { repeat: [10, 10] });
  return tex;
}

function plateTexture(title, sub, accent = '#f2a13a') {
  return makeCanvasTexture(512, 160, (ctx, w, h) => {
    ctx.fillStyle = '#1b252d';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#5d6c76';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = accent;
    ctx.fillRect(6, 6, 14, h - 12);
    ctx.fillStyle = '#e3edf1';
    ctx.font = '700 58px "Cascadia Code", "Consolas", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(title, 44, 78);
    ctx.fillStyle = '#8b9da7';
    ctx.font = '500 22px "Microsoft YaHei", sans-serif';
    ctx.fillText(sub, 46, 118);
    ctx.fillStyle = accent;
    ctx.fillRect(44, 132, 92, 3);
  }).tex;
}

function warningSignTexture(text = 'WARNING', sub = 'CHEMICAL HAZARD') {
  return makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e9b02e';
    ctx.beginPath();
    ctx.moveTo(w / 2, 16);
    ctx.lineTo(w - 14, h - 22);
    ctx.lineTo(14, h - 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#11181d';
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.fillStyle = '#11181d';
    ctx.font = '800 96px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', w / 2, h - 54);
    ctx.font = '700 18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#c39015';
    ctx.fillText(sub, w / 2, h + 14);
  }).tex;
}

function screenTexture() {
  const item = makeCanvasTexture(768, 480, () => {});
  return { ...item, item: null };
}

const MAT = {
  steel: new THREE.MeshStandardMaterial({ color: 0x7f8b95, metalness: 0.92, roughness: 0.36, envMapIntensity: 1.05 }),
  steelMid: new THREE.MeshStandardMaterial({ color: 0x596671, metalness: 0.88, roughness: 0.44, envMapIntensity: 0.9 }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x343e47, metalness: 0.82, roughness: 0.52, envMapIntensity: 0.8 }),
  steelPainted: new THREE.MeshStandardMaterial({ color: 0x46545f, metalness: 0.55, roughness: 0.55 }),
  steelLight: new THREE.MeshStandardMaterial({ color: 0xa2aeb7, metalness: 0.85, roughness: 0.32 }),
  graphite: new THREE.MeshStandardMaterial({ color: 0x22262a, metalness: 0.4, roughness: 0.75 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x191f24, roughness: 0.9 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xb2884a, metalness: 1, roughness: 0.32 }),
  copper: new THREE.MeshStandardMaterial({ color: 0x9b5f3f, metalness: 1, roughness: 0.35 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xe0a62c, metalness: 0.4, roughness: 0.55 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xcf642d, metalness: 0.45, roughness: 0.5 }),
  red: new THREE.MeshStandardMaterial({ color: 0xb6392d, metalness: 0.4, roughness: 0.55 }),
  green: new THREE.MeshStandardMaterial({ color: 0x2c8b6a, metalness: 0.45, roughness: 0.5 }),
  bluePipe: new THREE.MeshStandardMaterial({ color: 0x2b6f93, metalness: 0.55, roughness: 0.45 }),
  sand: new THREE.MeshStandardMaterial({ color: 0x8c7150, roughness: 0.96 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x454d52, roughness: 0.9 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xbfe6ef, metalness: 0.0, roughness: 0.06, transparent: true, opacity: 0.11,
    side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.25, clearcoat: 1, clearcoatRoughness: 0.05,
  }),
  glassThick: new THREE.MeshPhysicalMaterial({
    color: 0xa9d7e3, metalness: 0.0, roughness: 0.1, transparent: true, opacity: 0.19,
    side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.15, clearcoat: 1,
  }),
};

class ParticlePool {
  constructor(scene, { max = 120, texture, color = 0xffffff, blending = THREE.NormalBlending, opacity = 1 }) {
    this.max = max;
    this.particles = Array.from({ length: max }, () => ({
      life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, size: 1, alpha: 0, gravity: 0, drag: 0.96,
    }));
    this.positions = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);
    this.alphas = new Float32Array(max);
    this.cursor = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: texture },
        uColor: { value: new THREE.Color(color) },
        uScale: { value: 320.0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        varying float vAlpha;
        uniform float uScale;
        void main() {
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (uScale / max(0.5, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          float a = tex.a * vAlpha;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending,
      opacity,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 8;
    scene.add(this.points);
  }

  setColor(color) {
    this.material.uniforms.uColor.value.set(color);
  }

  spawn(pos, {
    vx = 0, vy = 1, vz = 0, life = 2, size = 1, alpha = 0.4, gravity = 0, drag = 0.985,
  } = {}) {
    let idx = -1;
    for (let i = 0; i < this.max; i++) {
      const p = this.particles[(this.cursor + i) % this.max];
      if (p.life <= 0) {
        idx = (this.cursor + i) % this.max;
        break;
      }
    }
    if (idx < 0) {
      idx = this.cursor % this.max;
      this.cursor++;
    }
    const p = this.particles[idx];
    p.life = life;
    p.maxLife = life;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.size = size;
    p.alpha = alpha;
    p.gravity = gravity;
    p.drag = drag;
    this.positions[idx * 3] = pos.x;
    this.positions[idx * 3 + 1] = pos.y;
    this.positions[idx * 3 + 2] = pos.z;
    this.sizes[idx] = size;
    this.alphas[idx] = 0;
  }

  update(dt, time) {
    const pos = this.positions;
    for (let i = 0; i < this.max; i++) {
      const p = this.particles[i];
      if (p.life <= 0) {
        this.alphas[i] = 0;
        continue;
      }
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vz *= Math.pow(p.drag, dt * 60);
      pos[i * 3] += p.vx * dt;
      pos[i * 3 + 1] += p.vy * dt;
      pos[i * 3 + 2] += p.vz * dt;
      const age = 1 - p.life / p.maxLife;
      const fadeIn = clamp(age * 6, 0, 1);
      const fadeOut = clamp(p.life / p.maxLife * 1.6, 0, 1);
      this.alphas[i] = p.alpha * fadeIn * fadeOut;
      this.sizes[i] = p.size * (0.65 + age * 0.9);
      if (p.life <= 0) this.alphas[i] = 0;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aAlpha.needsUpdate = true;
    this.points.geometry.attributes.aSize.needsUpdate = true;
  }
}

export class Plant {
  constructor(sceneRoot, labelLayer, options = {}) {
    this.root = sceneRoot;
    this.labelLayer = labelLayer;
    this.onPick = options.onPick || (() => {});
    this.snap = null;
    this.reaction = null;
    this.mode = 'reactor';
    this.time = 0;
    this._feedAcc = 0;
    this._gasAcc = 0;
    this._steamAcc = 0;
    this._sparkAcc = 0;
    this._smokeAcc = 0;
    this._dropAcc = 0;
    this._screenTimer = 0;
    this._tempHistory = [];
    this._camTween = null;
    this._shake = 0;
    this._shakeTime = 0;
    this._explosionTime = 10;
    this._explosionActive = false;
    this._pointerDown = null;
    this._pickables = [];
    this._tempColor = new THREE.Color();
    this._pptData = [];
    this._bubbleData = [];
    this._clock = new THREE.Clock();

    this._initRenderer();
    this._initScene();
    this._buildEnvironment();
    this._buildPlatform();
    this._buildReactor();
    this._buildGasAssembly();
    this._buildTanks();
    this._buildFeedSystem();
    this._buildUtilities();
    this._buildConsole();
    this._buildThermite();
    this._buildBench();
    this._buildSafety();
    this._buildBackground();
    this._buildParticles();
    this._buildLabels();
    this._bindPointer();

    this.resize();
    this.setReaction(null);
    this.controls.update();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.root.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.labelLayer.appendChild(this.labelRenderer.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xcee7f6, 0.0088);

    const skyTex = makeCanvasTexture(32, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#67b0dc');
      g.addColorStop(0.32, '#8ec8e9');
      g.addColorStop(0.56, '#b7ddf3');
      g.addColorStop(0.78, '#d9effa');
      g.addColorStop(1, '#eef9fe');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }).tex;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(180, 40, 24),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }),
    );
    sky.renderOrder = -2;
    this.scene.add(sky);
    this.skyDome = sky;

    this.camera = new THREE.PerspectiveCamera(41, 1, 0.1, 260);
    this.camera.position.set(16.8, 11.4, 20.2);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 3.8, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 6.5;
    this.controls.maxDistance = 48;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.035;
    this.controls.autoRotateSpeed = 0.42;
    this.controls.update();

    this._views = {
      overview: { pos: V3(17.4, 12.2, 23.6), target: V3(0.4, 3.3, 0.6) },
      reactor: { pos: V3(10.6, 8.4, 16.2), target: V3(0.2, 4.05, 0) },
      tanks: { pos: V3(-17.6, 9.8, 15.4), target: V3(-6.7, 2.9, 2.0) },
      console: { pos: V3(12.4, 5.2, 13.6), target: V3(7.1, 1.7, 7.2) },
      bench: { pos: V3(-6.6, 3.3, 13.4), target: V3(-8.6, 1.35, 8.5) },
      thermite: { pos: V3(14.4, 7.4, 5.6), target: V3(6.3, 3.2, -4.4) },
    };

    this._env = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(this._env, 0.04).texture;
    if ('environmentIntensity' in this.scene) this.scene.environmentIntensity = 0.24;
    pmrem.dispose();
    this._env.dispose?.();
  }

  _buildEnvironment() {
    const hemi = new THREE.HemisphereLight(0xd6ecfa, 0x6d7c86, 0.85);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff3de, 1.95);
    key.position.set(-10, 17, 11);
    key.target.position.set(0, 3, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -20;
    key.shadow.camera.right = 20;
    key.shadow.camera.top = 20;
    key.shadow.camera.bottom = -20;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 60;
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.03;
    this.scene.add(key);
    this.scene.add(key.target);
    this.keyLight = key;

    const cool = new THREE.DirectionalLight(0xa9d9f4, 0.7);
    cool.position.set(12, 10, -12);
    this.scene.add(cool);

    const reactorSpot = new THREE.SpotLight(0xc9e9ff, 900, 40, Math.PI / 5, 0.6, 1.2);
    reactorSpot.position.set(4, 16, 8);
    reactorSpot.target.position.set(0, 4, 0);
    this.scene.add(reactorSpot, reactorSpot.target);

    const warm = new THREE.PointLight(0xffa35b, 28, 16, 2);
    warm.position.set(7.5, 3.4, 8.5);
    this.scene.add(warm);

    const rim = new THREE.PointLight(0x3fbfe0, 45, 22, 2);
    rim.position.set(-9, 8, -7);
    this.scene.add(rim);

    const consoleGlow = new THREE.PointLight(0x5fd8ff, 18, 9, 2);
    consoleGlow.position.set(6.9, 2.2, 7.6);
    this.scene.add(consoleGlow);

    this.alarmLight = new THREE.PointLight(0xff2f24, 0, 22, 2);
    this.alarmLight.position.set(4.2, 3.8, 7.2);
    this.scene.add(this.alarmLight);

    this.reactorLight = new THREE.PointLight(0x7be5ff, 25, 12, 2);
    this.reactorLight.position.set(0, 4.2, 2.3);
    this.scene.add(this.reactorLight);

    this.thermiteLight = new THREE.PointLight(0xff5a18, 0, 22, 2);
    this.thermiteLight.position.set(0, 3.6, 0.8);
    this.scene.add(this.thermiteLight);

    // daylight haze: sun bloom + soft clouds
    const sunTex = softTexture('rgba(255,250,235,.95)', 'rgba(255,236,190,0)', 256);
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sunTex, color: 0xfff4d8, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    sun.position.set(-58, 62, -80);
    sun.scale.set(54, 54, 1);
    this.scene.add(sun);

    const cloudTex = makeCanvasTexture(256, 128, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      [[0.3, 0.62, 0.3], [0.48, 0.5, 0.36], [0.66, 0.6, 0.3], [0.8, 0.68, 0.22], [0.18, 0.72, 0.2]].forEach(([x, y, r]) => {
        const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w);
        g.addColorStop(0, 'rgba(255,255,255,.92)');
        g.addColorStop(0.55, 'rgba(250,253,255,.5)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
    }).tex;
    [
      [-64, 42, -96, 46, 18], [16, 34, -108, 58, 22], [76, 47, -88, 38, 15], [-114, 54, -62, 34, 14],
    ].forEach(([x, y, z, w, h], i) => {
      const cloud = new THREE.Sprite(new THREE.SpriteMaterial({
        map: cloudTex, transparent: true, opacity: 0.26 + i * 0.04, depthWrite: false, fog: false,
      }));
      cloud.position.set(x, y, z);
      cloud.scale.set(w, h, 1);
      this.scene.add(cloud);
    });

    // floating dust
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(220 * 3);
    for (let i = 0; i < 220; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 34;
      dustPos[i * 3 + 1] = Math.random() * 14 + 0.5;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.05, transparent: true, opacity: 0.32, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.scene.add(this.dust);
  }

  _buildPlatform() {
    const groundMat = new THREE.MeshStandardMaterial({
      map: asphaltTexture(), color: 0xd9e3e9, roughness: 0.98, metalness: 0.02,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(170, 170), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const padMat = new THREE.MeshStandardMaterial({
      map: floorTexture(), color: 0xd6dfe4, roughness: 0.85, metalness: 0.1,
    });
    const pad = new THREE.Mesh(new THREE.BoxGeometry(31, 0.34, 25), padMat);
    pad.position.set(0, 0.17, 0.5);
    pad.receiveShadow = true;
    pad.castShadow = false;
    this.scene.add(pad);

    const trimMat = new THREE.MeshStandardMaterial({ color: 0x232a30, metalness: 0.5, roughness: 0.7 });
    const edge = new THREE.Mesh(new THREE.BoxGeometry(31.1, 0.1, 25.1), trimMat);
    edge.position.set(0, 0.02, 0.5);
    this.scene.add(edge);

    // hazard stripe curb at the front edge
    const stripeTex = makeCanvasTexture(512, 64, (ctx, w, h) => {
      ctx.fillStyle = '#dba62d';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#171b1e';
      for (let x = -h; x < w + h; x += 56) {
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x + 28, h);
        ctx.lineTo(x + 28 + h, 0);
        ctx.lineTo(x + h, 0);
        ctx.closePath();
        ctx.fill();
      }
    }, { repeat: [10, 1] }).tex;
    stripeTex.wrapS = THREE.RepeatWrapping;
    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(31, 0.16, 0.36),
      new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.75, metalness: 0.1 })
    );
    curb.position.set(0, 0.39, 13.05);
    this.scene.add(curb);

    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(7.6, 7.6),
      new THREE.MeshBasicMaterial({ map: hazardTexture(), transparent: true, opacity: 0.9, depthWrite: false })
    );
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(0, 0.351, 0);
    decal.renderOrder = 1;
    this.scene.add(decal);

    // floor drains and puddles
    const grateMat = new THREE.MeshStandardMaterial({ color: 0x202529, metalness: 0.8, roughness: 0.55 });
    [[-4.8, 10.2], [4.9, 10.1], [12, 5]].forEach(([x, z]) => {
      const grate = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), grateMat);
      grate.rotation.x = -Math.PI / 2;
      grate.position.set(x, 0.352, z);
      this.scene.add(grate);
      for (let i = -3; i <= 3; i++) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.035), MAT.steelDark);
        slot.position.set(x, 0.36, z + i * 0.1);
        this.scene.add(slot);
      }
    });

    const puddleMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a2a31, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.5, clearcoat: 1,
    });
    [[-3.6, 9.0, 1.6], [3.2, 6.4, 1.1], [-11.2, 4.5, 0.9]].forEach(([x, z, s]) => {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(s, 28), puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(x, 0.353, z);
      puddle.scale.set(1.4, 0.7, 1);
      this.scene.add(puddle);
    });

    // safety bollards
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0xd8a537, roughness: 0.6, metalness: 0.3 });
    [[-13.2, 12.2], [13.2, 12.2], [-13.2, -11.4], [13.2, -11.4]].forEach(([x, z]) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.85, 12), bollardMat);
      b.position.set(x, 0.78, z);
      b.castShadow = true;
      this.scene.add(b);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.158, 0.158, 0.13, 12), MAT.steelDark);
      band.position.set(x, 0.98, z);
      this.scene.add(band);
    });

    // cable trays
    const trayMat = new THREE.MeshStandardMaterial({ color: 0x303a42, metalness: 0.7, roughness: 0.5 });
    const tray = new THREE.Mesh(new THREE.BoxGeometry(24, 0.08, 0.5), trayMat);
    tray.position.set(0.5, 0.43, 10.8);
    this.scene.add(tray);
    for (let i = 0; i < 3; i++) {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 24, 6), i === 1 ? MAT.yellow : MAT.rubber);
      cable.rotation.z = Math.PI / 2;
      cable.position.set(0.5, 0.48 + i * 0.04, 10.65 + i * 0.14);
      this.scene.add(cable);
    }

    // low perimeter fence (back and sides)
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x5d6a72, metalness: 0.7, roughness: 0.55 });
    const fenceGroup = new THREE.Group();
    const mkFence = (x, z, len, rot) => {
      const g = new THREE.Group();
      for (let i = 0; i <= len; i += 2.2) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 8), fenceMat);
        post.position.set(i, 0.9, 0);
        g.add(post);
      }
      for (const y of [1.0, 1.35]) {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 6), fenceMat);
        rail.rotation.z = Math.PI / 2;
        rail.position.set(len / 2, y, 0);
        g.add(rail);
      }
      g.position.set(x, 0, z);
      g.rotation.y = rot;
      fenceGroup.add(g);
    };
    mkFence(-15.5, -12.0, 31, 0);
    mkFence(-15.5, -12.0, 25, Math.PI / 2);
    mkFence(15.5, -12.0, 25, Math.PI / 2);
    this.scene.add(fenceGroup);
  }

  _addMesh(geo, mat, parent, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = true, receive = false, name = '' } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = cast;
    m.receiveShadow = receive;
    if (name) m.name = name;
    parent.add(m);
    return m;
  }

  _boltRing(parent, radius, y, count, mat = MAT.steelDark, size = 1) {
    const boltGeo = new THREE.CylinderGeometry(0.045 * size, 0.045 * size, 0.09 * size, 6);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;
      const bolt = new THREE.Mesh(boltGeo, mat);
      bolt.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
      bolt.rotation.x = Math.PI / 2;
      bolt.rotation.z = -a;
      parent.add(bolt);
    }
  }

  _ladder(parent, x, z, y0, y1, rotY = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    const h = y1 - y0;
    [-0.22, 0.22].forEach((off) => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, h, 8), MAT.steelDark);
      rail.position.set(off, y0 + h / 2, 0);
      g.add(rail);
    });
    for (let y = y0 + 0.2; y < y1; y += 0.34) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.44, 6), MAT.steelMid);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, y, 0);
      g.add(rung);
    }
    parent.add(g);
    return g;
  }

  _makePipe(points, radius, mat, parent, { flanges = true, segments = 72 } = {}) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => (Array.isArray(p) ? V3(...p) : p)));
    const geo = new THREE.TubeGeometry(curve, segments, radius, 10, false);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    parent.add(mesh);
    if (flanges) {
      [0.06, 0.34, 0.66, 0.94].forEach((t) => {
        const pos = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        const flange = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.45, radius * 1.45, radius * 0.42, 12), MAT.steelDark);
        flange.position.copy(pos);
        flange.quaternion.setFromUnitVectors(V3(0, 1, 0), tangent);
        parent.add(flange);
      });
    }
    return { mesh, curve };
  }

  _makeValve(parent, pos, rotY = 0, size = 1) {
    const g = new THREE.Group();
    g.position.copy(pos);
    g.rotation.y = rotY;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.24 * size, 16, 12), MAT.steelMid);
    body.scale.set(1.2, 1, 1.2);
    g.add(body);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * size, 0.035 * size, 0.34 * size, 8), MAT.steelDark);
    stem.position.y = 0.24 * size;
    g.add(stem);
    const wheel = new THREE.Group();
    wheel.position.y = 0.43 * size;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19 * size, 0.028 * size, 8, 20), MAT.orange);
    rim.rotation.x = Math.PI / 2;
    wheel.add(rim);
    for (let i = 0; i < 3; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.34 * size, 0.02 * size, 0.03 * size), MAT.orange);
      spoke.rotation.y = (i / 3) * Math.PI;
      wheel.add(spoke);
    }
    g.add(wheel);
    parent.add(g);
    return { group: g, wheel };
  }

  _makeGauge(parent, pos, label, color = '#68e3d2') {
    const group = new THREE.Group();
    group.position.copy(pos);
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.29, 0.11, 28), MAT.steelDark);
    housing.rotation.x = Math.PI / 2;
    group.add(housing);
    const faceTex = makeCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#e8ede9';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 122, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#1b2429';
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.strokeStyle = '#2b3439';
      for (let i = 0; i <= 30; i++) {
        const a = (-120 + (240 * i) / 30) * Math.PI / 180;
        const r1 = i % 5 === 0 ? 92 : 104;
        ctx.lineWidth = i % 5 === 0 ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(w / 2 + Math.cos(a) * r1, h / 2 + Math.sin(a) * r1);
        ctx.lineTo(w / 2 + Math.cos(a) * 112, h / 2 + Math.sin(a) * 112);
        ctx.stroke();
      }
      ctx.fillStyle = '#1b2429';
      ctx.font = '700 26px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, w / 2, h / 2 + 52);
      ctx.fillStyle = '#6c7b7e';
      ctx.font = '500 16px "Consolas", monospace';
      ctx.fillText('R-101', w / 2, h / 2 + 76);
    }).tex;
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.235, 32), new THREE.MeshBasicMaterial({ map: faceTex }));
    face.position.z = 0.058;
    group.add(face);
    const needleGroup = new THREE.Group();
    needleGroup.position.z = 0.068;
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.17, 0.008), new THREE.MeshBasicMaterial({ color: new THREE.Color(color) }));
    needle.position.y = 0.075;
    needleGroup.add(needle);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 12), MAT.brass);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = 0.075;
    needleGroup.add(hub);
    group.add(needleGroup);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.235, 32), new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transparent: true, opacity: 0.13, roughness: 0.05, metalness: 0,
    }));
    glass.position.z = 0.083;
    group.add(glass);
    parent.add(group);
    return { group, needleGroup };
  }

  _buildReactor() {
    const g = new THREE.Group();
    g.name = 'reactor';
    this.scene.add(g);
    this.reactorGroup = g;
    g.userData.info = {
      title: 'R-101 · 沉淀反应釜',
      sub: 'MAIN REACTOR',
      desc: '带机械搅拌与夹套的玻璃视窗反应釜。实时显示液位、浊度、温度与压力，反应现象可直接从视窗观察。',
    };
    this._pickables.push(g);

    const skirt = this._addMesh(new THREE.CylinderGeometry(2.62, 2.85, 1.0, 48), MAT.steelPainted, g, { y: 0.85, receive: true });
    skirt.castShadow = true;
    this._addMesh(new THREE.CylinderGeometry(2.68, 2.68, 0.16, 48), MAT.steelDark, g, { y: 1.34 });
    this._addMesh(new THREE.CylinderGeometry(2.42, 2.36, 1.42, 48), MAT.steel, g, { y: 2.08 });

    const bottomHead = new THREE.Mesh(new THREE.SphereGeometry(2.36, 48, 24, 0, TAU, Math.PI / 2, Math.PI / 2), MAT.steel);
    bottomHead.position.y = 2.1;
    bottomHead.scale.y = 0.55;
    bottomHead.castShadow = true;
    g.add(bottomHead);

    const lowerFlange = new THREE.Mesh(new THREE.TorusGeometry(2.38, 0.09, 10, 64), MAT.steelDark);
    lowerFlange.rotation.x = Math.PI / 2;
    lowerFlange.position.y = 2.82;
    g.add(lowerFlange);
    this._boltRing(g, 2.38, 2.9, 24, MAT.steelDark, 1.2);

    // glass band
    this.glassMat = MAT.glass.clone();
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(2.22, 2.22, 3.2, 72, 1, true), this.glassMat);
    glass.position.y = 4.42;
    glass.renderOrder = 6;
    g.add(glass);
    this.reactorGlass = glass;

    // steel ribs on the sight glass
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 6;
      const rib = this._addMesh(new THREE.BoxGeometry(0.075, 3.18, 0.16), MAT.steelDark, g, {
        x: Math.cos(a) * 2.25, y: 4.42, z: Math.sin(a) * 2.25,
      });
      rib.rotation.y = -a;
    }

    const upperFlange = new THREE.Mesh(new THREE.TorusGeometry(2.38, 0.1, 10, 64), MAT.steelDark);
    upperFlange.rotation.x = Math.PI / 2;
    upperFlange.position.y = 6.02;
    g.add(upperFlange);
    this._boltRing(g, 2.38, 6.1, 24, MAT.steelDark, 1.2);

    const topHead = new THREE.Mesh(new THREE.SphereGeometry(2.32, 48, 24, 0, TAU, 0, Math.PI / 2), MAT.steel);
    topHead.position.y = 6.02;
    topHead.scale.y = 0.52;
    topHead.castShadow = true;
    g.add(topHead);
    this._addMesh(new THREE.CylinderGeometry(2.32, 2.32, 0.16, 48), MAT.steelDark, g, { y: 6.04 });

    // manway
    const manway = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.055, 8, 28), MAT.steelDark);
    manway.rotation.x = Math.PI / 2;
    manway.position.set(0.9, 7.18, 0.25);
    g.add(manway);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 6), MAT.steelLight);
      bolt.position.set(0.9 + Math.cos(a) * 0.44, 7.22, 0.25 + Math.sin(a) * 0.44);
      g.add(bolt);
    }

    // drive motor
    const motorPed = this._addMesh(new THREE.CylinderGeometry(0.55, 0.7, 0.35, 24), MAT.steelDark, g, { y: 7.3 });
    const motor = this._addMesh(new THREE.CylinderGeometry(0.48, 0.48, 1.0, 28), MAT.steelPainted, g, { y: 7.9 });
    this._addMesh(new THREE.CylinderGeometry(0.54, 0.54, 0.1, 28), MAT.steelDark, g, { y: 8.35 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const fin = this._addMesh(new THREE.BoxGeometry(0.05, 0.72, 0.16), MAT.steelDark, g, {
        x: Math.cos(a) * 0.48, y: 7.9, z: Math.sin(a) * 0.48,
      });
      fin.rotation.y = -a;
    }
    const motorCap = this._addMesh(new THREE.CylinderGeometry(0.18, 0.24, 0.25, 20), MAT.brass, g, { y: 8.5 });
    this._addMesh(new THREE.BoxGeometry(0.8, 0.16, 0.3), MAT.steelDark, g, { x: 0.55, y: 8.35 });

    // nozzles
    const nozzlePositions = [
      { x: -1.45, z: 0.75, a: -0.5, label: 'A' },
      { x: 1.45, z: 0.75, a: 0.5, label: 'B' },
    ];
    nozzlePositions.forEach(({ x, z, a }) => {
      const n = this._addMesh(new THREE.CylinderGeometry(0.15, 0.19, 0.55, 16), MAT.steel, g, { x, y: 6.55, z });
      n.rotation.set(0.18, a, 0.1);
      const flange = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 6, 16), MAT.steelDark);
      flange.rotation.x = Math.PI / 2;
      flange.position.set(x, 6.82, z);
      g.add(flange);
    });

    // vent nozzle + line
    this._addMesh(new THREE.CylinderGeometry(0.11, 0.13, 0.7, 14), MAT.steel, g, { x: -0.9, y: 7.05, z: -0.7 });
    this._addMesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 14), MAT.steelDark, g, { x: -0.9, y: 7.42, z: -0.7 });

    // interior
    this.liquidMat = new THREE.MeshPhysicalMaterial({
      color: 0xc9edf2, transparent: true, opacity: 0.6, roughness: 0.26, metalness: 0,
      envMapIntensity: 0.6, clearcoat: 0.35, clearcoatRoughness: 0.3, depthWrite: false, side: THREE.DoubleSide,
    });
    this.liquid = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 64, 1), this.liquidMat);
    this.liquid.scale.set(2.04, 1, 2.04);
    this.liquid.renderOrder = 2;
    g.add(this.liquid);

    this.surfaceMat = new THREE.MeshPhysicalMaterial({
      color: 0xd8f7ff, transparent: true, opacity: 0.6, roughness: 0.14, metalness: 0,
      envMapIntensity: 0.7, clearcoat: 0.6, clearcoatRoughness: 0.15, side: THREE.DoubleSide, depthWrite: false,
    });
    this.surface = new THREE.Mesh(new THREE.CircleGeometry(1, 64), this.surfaceMat);
    this.surface.rotation.x = -Math.PI / 2;
    this.surface.scale.setScalar(2.05);
    this.surface.renderOrder = 4;
    g.add(this.surface);

    this.surfaceRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.03, 0.014, 6, 80),
      new THREE.MeshBasicMaterial({ color: 0xbdeff8, transparent: true, opacity: 0.45, depthWrite: false })
    );
    this.surfaceRing.rotation.x = Math.PI / 2;
    this.surfaceRing.renderOrder = 5;
    g.add(this.surfaceRing);

    // baffles
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      const baffle = this._addMesh(new THREE.BoxGeometry(0.055, 2.7, 0.32), MAT.steelMid, g, {
        x: Math.cos(a) * 1.98, y: 4.35, z: Math.sin(a) * 1.98,
      });
      baffle.rotation.y = -a;
    }

    // agitator
    const agitator = new THREE.Group();
    agitator.position.y = 0;
    this.agitator = agitator;
    const shaft = this._addMesh(new THREE.CylinderGeometry(0.07, 0.07, 5.2, 12), MAT.steelLight, agitator, { y: 4.65 });
    const hub = this._addMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 16), MAT.steelDark, agitator, { y: 3.45 });
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Group();
      blade.rotation.y = (i / 3) * TAU;
      const b = this._addMesh(new THREE.BoxGeometry(0.72, 0.06, 0.2), MAT.steelLight, blade, { x: 0.5, y: 3.45 });
      b.rotation.z = 0.08;
      const tip = this._addMesh(new THREE.BoxGeometry(0.06, 0.2, 0.22), MAT.steelDark, blade, { x: 0.85, y: 3.47 });
      tip.rotation.z = 0.2;
      agitator.add(blade);
    }
    const lowerHub = this._addMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.2, 12), MAT.steelDark, agitator, { y: 2.0 });
    g.add(agitator);

    // precipitate instanced spheres
    const pptGeo = new THREE.SphereGeometry(0.04, 6, 5);
    const pptMat = new THREE.MeshStandardMaterial({ color: 0xf2fbfd, roughness: 0.85, metalness: 0, transparent: true, opacity: 0.94 });
    this.ppt = new THREE.InstancedMesh(pptGeo, pptMat, 300);
    this.ppt.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.ppt.frustumCulled = false;
    this.ppt.renderOrder = 3;
    g.add(this.ppt);
    for (let i = 0; i < 300; i++) {
      this._pptData.push({
        a: Math.random() * TAU,
        r: 0.2 + Math.pow(Math.random(), 0.55) * 1.7,
        fy: Math.random(),
        spin: 0.25 + Math.random() * 0.9,
        scale: 0.55 + Math.random() * 1.1,
      });
    }

    // sediment
    const sedimentMat = new THREE.MeshStandardMaterial({ color: 0xf1fbfd, roughness: 0.9, metalness: 0.0 });
    this.sediment = new THREE.Group();
    this.sediment.position.y = 0;
    const sedBase = new THREE.Mesh(new THREE.CylinderGeometry(1.98, 1.98, 1, 48), sedimentMat);
    sedBase.scale.set(1, 1, 1);
    sedBase.position.y = 0.5;
    this.sedimentBase = sedBase;
    this.sediment.add(sedBase);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      const mound = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 8), sedimentMat);
      mound.position.set(Math.cos(a) * 0.9, 0.95, Math.sin(a) * 0.9);
      mound.scale.set(1, 0.32, 1);
      this.sediment.add(mound);
    }
    this.sediment.visible = false;
    g.add(this.sediment);

    // bubbles
    const bubbleMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0, depthWrite: false,
    });
    this.bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 5), bubbleMat, 140);
    this.bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bubbles.frustumCulled = false;
    this.bubbles.renderOrder = 3;
    this.bubbles.visible = false;
    g.add(this.bubbles);
    for (let i = 0; i < 140; i++) {
      this._bubbleData.push({
        a: Math.random() * TAU,
        r: Math.random() * 1.75,
        fy: Math.random(),
        speed: 0.35 + Math.random() * 0.8,
        scale: 0.6 + Math.random() * 0.9,
      });
    }

    // gas body for gas mode
    this.gasMat = new THREE.MeshPhysicalMaterial({
      color: 0xd6e66b, transparent: true, opacity: 0, roughness: 0.35, metalness: 0,
      depthWrite: false, side: THREE.DoubleSide,
    });
    this.gasBody = new THREE.Mesh(new THREE.CylinderGeometry(2.04, 2.04, 3.0, 48, 1), this.gasMat);
    this.gasBody.position.y = 4.42;
    this.gasBody.renderOrder = 2;
    this.gasBody.visible = false;
    g.add(this.gasBody);

    this.mistMat = new THREE.MeshBasicMaterial({ color: 0xf4fffb, transparent: true, opacity: 0, depthWrite: false });
    this.mistSphere = new THREE.Mesh(new THREE.SphereGeometry(1.9, 24, 16), this.mistMat);
    this.mistSphere.position.y = 4.6;
    this.mistSphere.scale.set(1, 0.8, 1);
    this.mistSphere.renderOrder = 3;
    g.add(this.mistSphere);

    // status light rings
    this.ringMats = [];
    [2.9, 5.98].forEach((y) => {
      const mat = new THREE.MeshBasicMaterial({ color: 0x46e4cb, transparent: true, opacity: 0.9 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.33, 0.028, 6, 80), mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      g.add(ring);
      this.ringMats.push(mat);
    });

    // gauges + LCD
    const gaugeMount = this._addMesh(new THREE.BoxGeometry(1.5, 0.14, 0.3), MAT.steelDark, g, { x: 0, y: 6.25, z: 2.03 });
    gaugeMount.rotation.x = 0.15;
    const tempGauge = this._makeGauge(g, V3(-0.38, 6.42, 2.1), 'TEMP');
    const pressGauge = this._makeGauge(g, V3(0.38, 6.42, 2.1), 'PRESS');
    tempGauge.group.rotation.x = -0.12;
    pressGauge.group.rotation.x = -0.12;
    this.gaugeTemp = tempGauge;
    this.gaugePress = pressGauge;

    this.lcd = makeCanvasTexture(512, 256, (ctx, w, h) => {
      ctx.fillStyle = '#061217';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(90,225,215,.14)';
      ctx.strokeRect(8, 8, w - 16, h - 16);
    });
    const lcdTex = this.lcd.tex;
    this.lcdScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.58),
      new THREE.MeshBasicMaterial({ map: lcdTex, toneMapped: false })
    );
    this.lcdScreen.position.set(0, 2.27, 2.4);
    g.add(this.lcdScreen);
    const lcdBezel = this._addMesh(new THREE.BoxGeometry(1.3, 0.72, 0.08), MAT.steelDark, g, { x: 0, y: 2.27, z: 2.36 });
    this._addMesh(new THREE.BoxGeometry(1.34, 0.03, 0.1), MAT.steelMid, g, { x: 0, y: 2.64, z: 2.36 });

    // ladder at back
    this._ladder(g, 0, -2.42, 0.5, 7.15, Math.PI);
    // small platform at top
    const topRail = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.025, 6, 48, Math.PI), MAT.steelMid);
    topRail.rotation.x = Math.PI / 2;
    topRail.rotation.z = Math.PI;
    topRail.position.y = 7.22;
    g.add(topRail);

    this.reactor = {
      liquid: this.liquid,
      surface: this.surface,
      surfaceRing: this.surfaceRing,
      agitator,
      ppt: this.ppt,
      bubbles: this.bubbles,
      sediment: this.sediment,
      gasBody: this.gasBody,
      mistSphere: this.mistSphere,
      ringMats: this.ringMats,
      tempGauge: this.gaugeTemp,
      pressGauge: this.gaugePress,
      lcd: this.lcd,
    };
  }

  _buildGasAssembly() {
    this.groups = { reactor: this.reactorGroup };

    const gas = new THREE.Group();
    gas.name = 'gas-assembly';
    gas.userData.info = {
      title: 'G-301 / G-302 · 气体配气站',
      sub: 'GAS MANIFOLD',
      desc: '氢气与氯气钢瓶经减压阀和汇流排按比例配气，再送入石英光反应腔。氯气剧毒，全程负压密闭输送。',
    };
    this.scene.add(gas);
    this.groups.gas = gas;
    this._pickables.push(gas);

    const rackX = -3.95;
    const rackZ = -5.9;
    this._addMesh(new THREE.BoxGeometry(2.7, 0.12, 0.8), MAT.steelDark, gas, { x: rackX, y: 0.34, z: rackZ, receive: true });
    [-1.3, 1.3].forEach((dx) => this._addMesh(new THREE.BoxGeometry(0.1, 0.66, 0.76), MAT.steelDark, gas, { x: rackX + dx, y: 0.02, z: rackZ }));
    for (let i = 0; i < 5; i++) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 5, 10), MAT.steelMid);
      link.rotation.y = Math.PI / 2;
      link.position.set(rackX - 1.15 + i * 0.16, 1.6, rackZ - 0.44);
      gas.add(link);
    }

    const cylinderLabel = (ctx, code, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = 'rgba(10,16,20,.82)';
      ctx.fillRect(0, 40, 256, 54);
      ctx.fillStyle = '#f1f7f8';
      ctx.font = '700 30px "Cascadia Code", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(code, 128, 78);
      ctx.font = '500 13px "Microsoft YaHei", sans-serif';
      ctx.fillStyle = 'rgba(240,248,250,.72)';
      ctx.fillText('CHEM·PLANT GAS', 128, 112);
    };

    const mkCylinder = (dx, color, code) => {
      const g = new THREE.Group();
      g.position.set(rackX + dx, 0.4, rackZ);
      const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.36 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 1.5, 24), bodyMat);
      body.position.y = 0.82;
      body.castShadow = true;
      g.add(body);
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 12, 0, TAU, 0, Math.PI / 2), bodyMat);
      shoulder.position.y = 1.57;
      shoulder.scale.y = 0.7;
      g.add(shoulder);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.24, 14), MAT.brass);
      neck.position.y = 1.78;
      g.add(neck);
      const valveWheel = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 14), MAT.steelDark);
      valveWheel.rotation.x = Math.PI / 2;
      valveWheel.position.y = 1.9;
      g.add(valveWheel);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.1, 20), MAT.rubber);
      foot.position.y = 0.05;
      g.add(foot);
      const labelTex = makeCanvasTexture(256, 128, (ctx) => cylinderLabel(ctx, code, code === 'Cl₂' ? '#c9d961' : code === 'H₂' ? '#c2d4da' : '#87939b')).tex;
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshBasicMaterial({ map: labelTex, toneMapped: false }));
      label.position.set(0, 0.98, 0.271);
      g.add(label);
      const guard = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 6, 18), MAT.steelMid);
      guard.rotation.x = Math.PI / 2;
      guard.position.y = 1.9;
      g.add(guard);
      gas.add(g);
      return g;
    };
    mkCylinder(-0.62, 0xc2d4da, 'H₂');
    mkCylinder(0, 0xc9d961, 'Cl₂');
    mkCylinder(0.62, 0x87939b, 'N₂');

    const header = this._makePipe([
      [rackX - 0.62, 2.02, rackZ], [rackX - 0.62, 2.3, rackZ], [rackX + 0.62, 2.3, rackZ],
    ], 0.055, MAT.steelLight, gas, { flanges: false, segments: 30 });
    [-0.62, 0, 0.62].forEach((dx) => {
      this._makePipe([[rackX + dx, 1.92, rackZ], [rackX + dx, 2.3, rackZ]], 0.045, MAT.steelLight, gas, { flanges: false, segments: 8 });
      const valve = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.016, 6, 12), MAT.orange);
      valve.rotation.x = Math.PI / 2;
      valve.position.set(rackX + dx, 2.18, rackZ);
      gas.add(valve);
    });
    this._makeValve(gas, V3(rackX + 0.4, 2.3, rackZ), 0, 0.9);
    this._makePipe([
      [rackX + 0.62, 2.3, rackZ], [rackX + 0.62, 5.9, rackZ], [rackX + 1.2, 7.9, rackZ + 0.8],
      [1.45, 8.2, 0.65], [1.45, 6.98, 0.82],
    ], 0.075, MAT.steelLight, gas, { segments: 110 });

    // mercury-vapour lamp rig
    this.lampGroup = new THREE.Group();
    gas.add(this.lampGroup);
    const lampBase = this._addMesh(new THREE.CylinderGeometry(0.42, 0.5, 0.12, 24), MAT.steelDark, this.lampGroup, { x: 3.15, y: 0.4, z: 1.95, receive: true });
    const pole = this._addMesh(new THREE.CylinderGeometry(0.055, 0.075, 2.9, 12), MAT.steelMid, this.lampGroup, { x: 3.15, y: 1.85, z: 1.95 });
    const arm = this._addMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.6, 10), MAT.steelMid, this.lampGroup, { x: 2.95, y: 3.28, z: 1.83 });
    arm.rotation.z = Math.PI / 2 - 0.35;
    const lampPos = V3(3.02, 3.42, 1.88);
    const aim = V3(0, 4.5, 0);
    const dir = aim.clone().sub(lampPos).normalize();
    const lampHead = new THREE.Group();
    lampHead.position.copy(lampPos);
    lampHead.quaternion.setFromUnitVectors(V3(0, 1, 0), dir);
    this.lampGroup.add(lampHead);
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.5, 20, 1, true), MAT.steelDark);
    housing.position.y = -0.15;
    lampHead.add(housing);
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.2, 24, 1, true), MAT.steelPainted);
    hood.position.y = 0.12;
    lampHead.add(hood);
    this.lampLensMat = new THREE.MeshBasicMaterial({ color: 0xf2ffd8, toneMapped: false, transparent: true, opacity: 0.25 });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.24, 24), this.lampLensMat);
    lens.rotation.x = -Math.PI / 2;
    lens.position.y = 0.115;
    lampHead.add(lens);

    this.lampBeamMat = new THREE.MeshBasicMaterial({
      color: 0xefffd8, transparent: true, opacity: 0.02, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const beamLen = lampPos.distanceTo(aim) + 2.3;
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.35, beamLen, 32, 1, true), this.lampBeamMat);
    const beamDir = dir.clone();
    beam.quaternion.setFromUnitVectors(V3(0, 1, 0), beamDir.clone().negate());
    beam.position.copy(lampPos).add(beamDir.clone().multiplyScalar(beamLen / 2));
    this.lampGroup.add(beam);
    this.lampLight = new THREE.PointLight(0xf4ffd4, 0, 10, 2);
    this.lampLight.position.copy(lampPos);
    this.lampGroup.add(this.lampLight);
    const cable = this._makePipe([[3.15, 0.44, 2.35], [3.15, 0.2, 2.9], [1.8, 0.18, 3.4]], 0.035, MAT.rubber, this.lampGroup, { flanges: false, segments: 20 });

    // sodium charging lock
    const sodium = new THREE.Group();
    this.scene.add(sodium);
    this.groups.sodium = sodium;
    this._addMesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), MAT.steelDark, sodium, { x: 1.95, y: 7.62, z: 0.35 });
    const hopperGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.44, 20, 1, true), MAT.glassThick);
    hopperGlass.position.set(1.95, 8.09, 0.35);
    hopperGlass.renderOrder = 5;
    sodium.add(hopperGlass);
    this._addMesh(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 20), MAT.steelMid, sodium, { x: 1.95, y: 8.33, z: 0.35 });
    this._addMesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 20), MAT.steelDark, sodium, { x: 1.95, y: 7.85, z: 0.35 });
    const chunk = this._addMesh(new THREE.SphereGeometry(0.11, 12, 10), MAT.steelLight, sodium, { x: 1.95, y: 8.06, z: 0.35 });
    chunk.scale.set(1, 1.3, 1);
    this._makeValve(sodium, V3(1.95, 7.62, 0.64), 0, 0.8);
    this._makePipe([[1.95, 7.72, 0.35], [1.7, 7.6, 0.35], [1.2, 7.28, 0.3], [0.92, 7.16, 0.26]], 0.05, MAT.steelLight, sodium, { flanges: false, segments: 26 });
    this.sodiumBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xc8d2d8, metalness: 0.95, roughness: 0.22, emissive: 0x1a262c })
    );
    this.sodiumBall.position.set(0.92, 7.05, 0.26);
    this.sodiumBall.visible = false;
    sodium.add(this.sodiumBall);

    // vent flare for the reactor
    this.ventFlameMat = new THREE.MeshBasicMaterial({
      color: 0xff8a33, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    });
    this.ventFlame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.5, 18, 1, true), this.ventFlameMat);
    this.ventFlame.position.set(-0.9, 8.18, -0.7);
    this.ventFlame.visible = false;
    this.reactorGroup.add(this.ventFlame);
    this.ventLight = new THREE.PointLight(0xff7a2a, 0, 9, 2);
    this.ventLight.position.set(-0.9, 8.2, -0.7);
    this.reactorGroup.add(this.ventLight);
    this.ventPoint = V3(-0.9, 7.7, -0.7);
  }

  _buildTanks() {
    const ticksTex = makeCanvasTexture(72, 512, (ctx, w, h) => {
      ctx.fillStyle = '#0b141a';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#5c7480';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 20; i++) {
        const y = 20 + (h - 40) * (i / 20);
        ctx.beginPath();
        ctx.moveTo(w - (i % 5 === 0 ? 26 : 15), y);
        ctx.lineTo(w - 4, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#8ba3ad';
      ctx.font = '500 11px "Consolas", monospace';
      ctx.textAlign = 'left';
      for (let i = 0; i <= 4; i++) {
        ctx.fillText(`${100 - i * 25}`, 4, 26 + (h - 52) * (i / 4));
      }
    }).tex;

    const buildTank = (x, z, code, title, accent) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.userData.info = {
        title: `${code} · ${title}`,
        sub: 'FEED STORAGE',
        desc: '带液位视镜与进料泵的立式储罐。视镜中的液位和颜色随配比、进料实时变化。',
      };
      this.scene.add(group);
      this._pickables.push(group);

      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + Math.PI / 4;
        this._addMesh(new THREE.BoxGeometry(0.16, 0.9, 0.16), MAT.steelDark, group, {
          x: Math.cos(a) * 1.15, y: 0.45, z: Math.sin(a) * 1.15,
        });
      }
      this._addMesh(new THREE.CylinderGeometry(1.57, 1.57, 0.12, 40), MAT.steelDark, group, { y: 0.92, receive: true });
      const shellMat = new THREE.MeshStandardMaterial({ color: 0x8a9aa4, metalness: 0.72, roughness: 0.42 });
      this._addMesh(new THREE.CylinderGeometry(1.52, 1.52, 4.7, 40), shellMat, group, { y: 3.33 });
      const bottomHead = new THREE.Mesh(new THREE.SphereGeometry(1.52, 40, 20, 0, TAU, Math.PI / 2, Math.PI / 2), shellMat);
      bottomHead.position.y = 0.98;
      bottomHead.scale.y = 0.45;
      group.add(bottomHead);
      const topHead = new THREE.Mesh(new THREE.SphereGeometry(1.52, 40, 20, 0, TAU, 0, Math.PI / 2), shellMat);
      topHead.position.y = 5.68;
      topHead.scale.y = 0.42;
      topHead.castShadow = true;
      group.add(topHead);
      [1.2, 4.4, 5.58].forEach((y) => {
        const band = new THREE.Mesh(new THREE.TorusGeometry(1.535, 0.045, 8, 48), MAT.steelDark);
        band.rotation.x = Math.PI / 2;
        band.position.y = y;
        group.add(band);
      });
      this._addMesh(new THREE.CylinderGeometry(0.22, 0.24, 0.5, 16), MAT.steel, group, { y: 6.2 });
      this._addMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), MAT.steelDark, group, { y: 6.48 });
      this._ladder(group, 0, -1.55, 0.9, 5.6, Math.PI);
      const rail = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.025, 6, 40, Math.PI * 0.7), MAT.steelMid);
      rail.rotation.x = Math.PI / 2;
      rail.rotation.z = Math.PI * 0.65;
      rail.position.y = 6.05;
      group.add(rail);
      this._makeValve(group, V3(-0.9, 1.05, 1.25), -0.5, 1.05);

      // vertical sight gauge
      const gauge = new THREE.Group();
      gauge.position.set(1.28, 0, 0.82);
      gauge.rotation.y = Math.atan2(1.28, 0.82);
      group.add(gauge);
      this._addMesh(new THREE.BoxGeometry(0.3, 3.5, 0.08), MAT.steelDark, gauge, { y: 2.9 });
      const fillMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.92, toneMapped: false });
      const fill = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1, 0.05), fillMat);
      fill.position.set(0, 2.9, 0.05);
      gauge.add(fill);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 3.3), new THREE.MeshPhysicalMaterial({
        color: 0xe8fbff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0,
      }));
      glass.position.set(0, 2.9, 0.09);
      gauge.add(glass);
      const ticks = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 3.3), new THREE.MeshBasicMaterial({
        map: ticksTex, transparent: true, opacity: 0.55, depthWrite: false,
      }));
      ticks.position.set(-0.14, 2.9, 0.07);
      gauge.add(ticks);

      // name plate
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.47),
        new THREE.MeshBasicMaterial({ map: plateTexture(code, title, '#7fd4ee'), toneMapped: false })
      );
      plate.position.set(1.18, 4.35, 0.95);
      plate.rotation.y = Math.atan2(1.28, 0.82);
      group.add(plate);

      return { group, fill, fillMat, plate, gaugeBase: 1.28, gaugeH: 3.24, code, title };
    };

    this.tankA = buildTank(-7.4, -0.9, 'T-101', 'NaHCO₃ 溶液', 0x9fe8ff);
    this.tankB = buildTank(-7.0, 4.7, 'T-102', '澄清石灰水', 0xdff7f4);
    this.tanks = [this.tankA, this.tankB];

    // spill containment curb
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x5e6a70, roughness: 0.85, metalness: 0.08 });
    [[-6.9, -2.9, 5.6, 0.28, 0.35], [-6.9, 7.1, 5.6, 0.28, 0.35]].forEach(([x, z, w, d, h]) => {
      this._addMesh(new THREE.BoxGeometry(w, h, d), curbMat, this.scene, { x, y: 0.35 + h / 2, z, receive: true });
    });
    [[-9.75, 2.1, 0.28, 10, 0.35], [-4.05, 2.1, 0.28, 10, 0.35]].forEach(([x, z, w, d, h]) => {
      this._addMesh(new THREE.BoxGeometry(w, h, d), curbMat, this.scene, { x, y: 0.35 + h / 2, z, receive: true });
    });
    this.tanksGroup = new THREE.Group();
    this.groups.tanks = this.tanksGroup;

    this._setTankMeta(0, { code: 'T-101', title: 'NaHCO₃ 溶液', color: 0x9fe8ff });
    this._setTankMeta(1, { code: 'T-102', title: '澄清石灰水', color: 0xdff7f4 });
  }

  _setTankMeta(index, { code, title, color }) {
    const tank = this.tanks[index];
    if (!tank) return;
    tank.code = code;
    tank.title = title;
    tank.fillMat.color.setHex(color);
    const oldMap = tank.plate.material.map;
    tank.plate.material.map = plateTexture(code, title, `#${new THREE.Color(color).getHexString()}`);
    tank.plate.material.needsUpdate = true;
    if (oldMap) oldMap.dispose();
    tank.group.userData.info.title = `${code} · ${title}`;
  }

  _buildFeedSystem() {
    const feed = new THREE.Group();
    feed.name = 'feed-system';
    this.scene.add(feed);
    this.groups.feed = feed;
    this._pickables.push(feed);
    feed.userData.info = {
      title: 'P-101 / P-102 · 进料泵与管路',
      sub: 'FEED SYSTEM',
      desc: '两台离心泵把储罐中的溶液送入反应釜顶部喷嘴，流量可在底部控制台实时调节。',
    };

    const pipeAMat = new THREE.MeshStandardMaterial({ color: 0x3d7f9f, metalness: 0.65, roughness: 0.4 });
    const pipeBMat = new THREE.MeshStandardMaterial({ color: 0xa9b8bf, metalness: 0.7, roughness: 0.38 });
    this.feedPipeMats = [pipeAMat, pipeBMat];

    this._makePipe([
      [-7.4, 1.02, -0.9], [-5.55, 1.0, -0.9], [-5.05, 1.35, -0.9], [-5.05, 7.55, -0.9],
      [-3.9, 8.34, -0.55], [-1.45, 8.28, 0.42], [-1.45, 6.98, 0.7],
    ], 0.09, pipeAMat, feed, { segments: 130 });
    this._makePipe([
      [-7.0, 1.02, 4.7], [-5.55, 1.0, 4.7], [-5.05, 1.35, 4.7], [-5.05, 7.45, 4.7],
      [-3.3, 8.42, 3.9], [1.45, 8.5, 1.1], [1.45, 6.98, 0.85],
    ], 0.09, pipeBMat, feed, { segments: 140 });

    for (let i = 0; i < 4; i++) {
      this._addMesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), MAT.steelDark, feed, { x: -5.05, y: 1.6 + i * 1.5, z: -0.9 });
      this._addMesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), MAT.steelDark, feed, { x: -5.05, y: 1.6 + i * 1.5, z: 4.7 });
    }
    [1.4, 3.1, 5.0, 6.5].forEach((y) => {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.025, 6, 14), MAT.steelDark);
      band.rotation.x = Math.PI / 2;
      band.position.set(-5.05, y, -0.9);
      feed.add(band);
      const band2 = band.clone();
      band2.position.z = 4.7;
      feed.add(band2);
    });

    this._makeValve(feed, V3(-5.55, 1.42, -0.9), Math.PI / 2, 1.15);
    this._makeValve(feed, V3(-5.55, 1.42, 4.7), Math.PI / 2, 1.15);
    this._makeValve(feed, V3(-1.7, 7.9, -0.2), 0.7, 1.0);
    this._makeValve(feed, V3(1.4, 7.95, 1.45), -0.5, 1.0);

    this.pumps = [];
    const mkPump = (x, z, color) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      feed.add(g);
      this._addMesh(new THREE.BoxGeometry(1.0, 0.14, 0.72), MAT.steelDark, g, { y: 0.42, receive: true });
      this._addMesh(new THREE.BoxGeometry(0.92, 0.3, 0.6), MAT.steelPainted, g, { y: 0.64 });
      const volute = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 24), new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.4 }));
      volute.rotation.z = Math.PI / 2;
      volute.position.set(-0.15, 0.92, 0);
      g.add(volute);
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.55, 20), MAT.steelMid);
      motor.rotation.z = Math.PI / 2;
      motor.position.set(0.35, 0.92, 0);
      g.add(motor);
      const fan = new THREE.Group();
      fan.position.set(0.66, 0.92, 0);
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.05), MAT.steelDark);
        blade.position.y = 0.08;
        const holder = new THREE.Group();
        holder.rotation.x = (i / 4) * TAU;
        holder.add(blade);
        fan.add(holder);
      }
      const cap = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), MAT.graphite);
      cap.rotation.y = Math.PI / 2;
      fan.add(cap);
      g.add(fan);
      this._makeGauge(g, V3(0.34, 1.28, 0.36), 'FLOW', '#68e3d2');
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x3fae92, toneMapped: false });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), ledMat);
      led.position.set(0.18, 1.24, 0.32);
      g.add(led);
      this._addMesh(new THREE.BoxGeometry(0.06, 0.5, 0.3), MAT.steelMid, g, { x: -0.15, y: 1.25 });
      this.pumps.push({ fan, ledMat, g });
      return g;
    };
    mkPump(-4.95, -0.9, 0x3d7f9f);
    mkPump(-4.95, 4.7, 0xa9b8bf);

    // feed nozzles indicator lights at the reactor
    this.feedLights = [];
    [-1.45, 1.45].forEach((x, i) => {
      const mat = new THREE.MeshBasicMaterial({ color: 0x27444c, toneMapped: false });
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mat);
      light.position.set(x, 7.1, 0.85);
      this.reactorGroup.add(light);
      this.feedLights.push(mat);
    });
  }

  _buildUtilities() {
    const utilities = new THREE.Group();
    utilities.name = 'utilities';
    this.scene.add(utilities);
    this.groups.utilities = utilities;

    // ---- caustic scrubber ----
    const scrubber = new THREE.Group();
    scrubber.position.set(11.2, 0, -2.6);
    scrubber.userData.info = {
      title: 'T-301 · 尾气吸收塔',
      sub: 'CAUSTIC SCRUBBER',
      desc: '以 NaOH 溶液循环喷淋吸收 Cl₂ 与 HCl 酸雾，防止有毒尾气直排。塔顶风机维持微负压。',
    };
    utilities.add(scrubber);
    this._pickables.push(scrubber);
    this._addMesh(new THREE.CylinderGeometry(1.75, 1.9, 0.35, 32), MAT.concrete, scrubber, { y: 0.35, receive: true });
    this._addMesh(new THREE.CylinderGeometry(1.28, 1.32, 0.5, 32), MAT.steelDark, scrubber, { y: 0.78 });
    this._addMesh(new THREE.CylinderGeometry(1.18, 1.18, 7.2, 36), MAT.steelPainted, scrubber, { y: 4.55 });
    [1.3, 3.1, 5.1, 6.9, 8.05].forEach((y) => {
      const band = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 8, 40), MAT.steelDark);
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      scrubber.add(band);
    });
    const scrubGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x9fd9d2, transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.1, side: THREE.DoubleSide,
    });
    const scrubGlass = new THREE.Mesh(new THREE.CylinderGeometry(1.185, 1.185, 1.1, 36, 1, true), scrubGlassMat);
    scrubGlass.position.y = 4.05;
    scrubber.add(scrubGlass);
    this.scrubberGlowMat = new THREE.MeshBasicMaterial({ color: 0x49d8bd, transparent: true, opacity: 0.06, depthWrite: false });
    const scrubGlow = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 1.05, 32, 1, true), this.scrubberGlowMat);
    scrubGlow.position.y = 4.05;
    scrubber.add(scrubGlow);
    const scrubTop = new THREE.Mesh(new THREE.SphereGeometry(1.18, 32, 16, 0, TAU, 0, Math.PI / 2), MAT.steelPainted);
    scrubTop.position.y = 8.15;
    scrubTop.scale.y = 0.45;
    scrubber.add(scrubTop);
    this._addMesh(new THREE.CylinderGeometry(0.3, 0.36, 1.5, 20), MAT.steelMid, scrubber, { y: 9.0 });
    this._addMesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 20), MAT.steelDark, scrubber, { y: 9.78 });
    this._ladder(scrubber, -1.28, -0.15, 0.6, 8.5, 0);
    this._makeValve(scrubber, V3(1.1, 1.2, 0.5), 0, 1.0);
    this._makeValve(scrubber, V3(-0.7, 7.9, 0.95), 0, 0.9);

    // circulation pump + tank
    this._addMesh(new THREE.CylinderGeometry(0.95, 0.95, 0.9, 28), MAT.steelMid, scrubber, { x: -1.7, y: 0.8, z: 1.15 });
    this._addMesh(new THREE.TorusGeometry(0.95, 0.04, 6, 28), MAT.steelDark, scrubber, { x: -1.7, y: 1.26, z: 1.15, rx: Math.PI / 2 });
    this._makePipe([[-1.7, 1.0, 1.15], [-1.7, 0.6, 1.15], [-0.7, 0.45, 1.3], [0.4, 0.45, 1.2]], 0.06, MAT.steelLight, scrubber, { flanges: false, segments: 30 });

    // top fan
    this.scrubberFan = new THREE.Group();
    this.scrubberFan.position.set(1.55, 7.4, 0.15);
    scrubber.add(this.scrubberFan);
    this._addMesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 20), MAT.steelDark, this.scrubberFan, { rx: Math.PI / 2 });
    for (let i = 0; i < 5; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.03), MAT.steelMid);
      blade.position.set(0, 0, 0.17);
      blade.rotation.z = (i / 5) * TAU;
      const holder = new THREE.Group();
      holder.rotation.z = (i / 5) * TAU;
      blade.position.set(0.28, 0, 0.17);
      holder.add(blade);
      this.scrubberFan.add(holder);
    }
    this._addMesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), MAT.steelDark, scrubber, { x: 1.55, y: 7.05, z: -0.1 });
    this._makePipe([[1.3, 7.4, 0.3], [1.3, 5.8, 0.3], [1.2, 5.8, 1.25]], 0.09, MAT.steelMid, scrubber, { flanges: false, segments: 20 });

    // reactor vent line to scrubber
    this._makePipe([
      [-0.9, 7.48, -0.7], [-0.9, 8.7, -1.1], [3.2, 9.75, -3.7], [8.3, 8.65, -3.35], [10.65, 7.1, -2.85], [10.95, 6.45, -2.75],
    ], 0.115, MAT.steelMid, utilities, { segments: 150 });

    // ---- flare stack ----
    const flare = new THREE.Group();
    flare.position.set(13.7, 0, -8.5);
    flare.userData.info = {
      title: 'FL-601 · 火炬',
      sub: 'FLARE STACK',
      desc: '可燃气体的最后一道安全屏障。氢气等可燃尾气在此燃烧放空，避免可爆混合气积聚。',
    };
    utilities.add(flare);
    this._pickables.push(flare);
    this._addMesh(new THREE.CylinderGeometry(1.05, 1.2, 0.4, 24), MAT.concrete, flare, { y: 0.2, receive: true });
    this._addMesh(new THREE.CylinderGeometry(0.34, 0.48, 11.8, 18), MAT.steelPainted, flare, { y: 6.3 });
    [2.4, 5.6, 8.9, 12.0].forEach((y) => {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 6, 18), MAT.steelDark);
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      flare.add(band);
    });
    this._ladder(flare, 0.42, 0.15, 0.6, 12.0, 0);
    this._addMesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 12), MAT.steelDark, flare, { y: 12.35 });
    this.flareFlameMat = new THREE.MeshBasicMaterial({
      color: 0xff9a45, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.flareFlame = new THREE.Group();
    const flareConeA = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.4, 20, 1, true), this.flareFlameMat);
    flareConeA.position.y = 1.2;
    this.flareFlame.add(flareConeA);
    const flareConeB = flareConeA.clone();
    flareConeB.scale.set(0.55, 0.7, 0.55);
    flareConeB.position.y = 0.85;
    this.flareFlame.add(flareConeB);
    this.flareFlame.position.set(0, 13.3, 0);
    this.flareFlame.visible = false;
    flare.add(this.flareFlame);
    this.flareLight = new THREE.PointLight(0xff8a3a, 0, 24, 2);
    this.flareLight.position.set(13.7, 14.6, -8.5);
    this.scene.add(this.flareLight);

    // ---- cooling unit ----
    const cooling = new THREE.Group();
    cooling.position.set(-11.6, 0, -6.2);
    cooling.userData.info = {
      title: 'E-501 · 冷却器',
      sub: 'JACKET COOLER',
      desc: '为反应釜夹套提供循环冷却水，稀释热与反应热由此带走。温度联锁动作时自动提高流量。',
    };
    utilities.add(cooling);
    this._pickables.push(cooling);
    this._addMesh(new THREE.BoxGeometry(4.2, 0.24, 2.6), MAT.concrete, cooling, { y: 0.35, receive: true });
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x8d9ba4, metalness: 0.75, roughness: 0.38 });
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 3.0, 32), shellMat);
    shell.rotation.x = Math.PI / 2;
    shell.position.y = 1.55;
    cooling.add(shell);
    [-1.5, 1.5].forEach((dz) => {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 16, 0, TAU, 0, Math.PI / 2), shellMat);
      cap.rotation.x = dz > 0 ? Math.PI / 2 : -Math.PI / 2;
      cap.position.set(0, 1.55, dz);
      cap.scale.set(1, 1, 0.5);
      cooling.add(cap);
    });
    [-0.9, 0.9].forEach((dx) => {
      this._addMesh(new THREE.BoxGeometry(0.2, 1.1, 2.2), MAT.steelDark, cooling, { x: dx, y: 0.9, z: 0 });
    });
    this.coolingFans = [];
    [-0.65, 0.65].forEach((dz) => {
      const fanGroup = new THREE.Group();
      fanGroup.position.set(0, 2.6, dz);
      cooling.add(fanGroup);
      this._addMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.24, 24), MAT.steelDark, fanGroup, { rx: Math.PI / 2 });
      this._addMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 24), MAT.steelMid, fanGroup, { y: 0.13 });
      const blades = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.035, 0.1), MAT.steelMid);
        blade.position.x = 0.2;
        const holder = new THREE.Group();
        holder.rotation.y = (i / 4) * TAU;
        holder.add(blade);
        blades.add(holder);
      }
      fanGroup.add(blades);
      this.coolingFans.push(blades);
    });
    this._makePipe([[0, 0.5, -1.3], [-1.5, 0.45, -2.0], [-3.0, 0.4, -2.0]], 0.09, MAT.bluePipe, cooling, { flanges: false, segments: 24 });
    this._makePipe([[0, 0.6, 1.35], [1.1, 0.5, 2.1], [1.6, 0.4, 2.8]], 0.09, MAT.red, cooling, { flanges: false, segments: 24 });
    this._makeValve(cooling, V3(-1.2, 1.3, 1.1), -0.6, 1.0);

    // ---- overhead pipe rack ----
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x4a565e, metalness: 0.7, roughness: 0.5 });
    for (let x = -8; x <= 12; x += 4) {
      [-7.6, -6.8].forEach((z) => {
        this._addMesh(new THREE.BoxGeometry(0.16, 7.2, 0.16), rackMat, utilities, { x, y: 3.6, z });
      });
      this._addMesh(new THREE.BoxGeometry(0.16, 0.16, 1.4), rackMat, utilities, { x, y: 7.2, z: -7.2 });
    }
    [-7.75, -6.85].forEach((z) => {
      this._addMesh(new THREE.CylinderGeometry(0.09, 0.09, 24, 10), pipeMaterialFor(0x60727d), utilities, { x: 0, y: 7.05, z, rz: Math.PI / 2 });
    });
    this._addMesh(new THREE.CylinderGeometry(0.13, 0.13, 24, 12), pipeMaterialFor(0xbfcfd6), utilities, { x: 0, y: 6.78, z: -7.3, rz: Math.PI / 2 });

    function pipeMaterialFor(color) {
      return new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.42 });
    }
  }

  _buildConsole() {
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(7.25, 0, 7.85);
    consoleGroup.rotation.y = 0.42;
    consoleGroup.userData.info = {
      title: 'DCS · 中央控制台',
      sub: 'OPERATOR CONSOLE',
      desc: '操作员在此监控反应温度、压力、液位与尾气处理。屏幕上的数据与三维装置、右侧面板完全同步。',
    };
    this.scene.add(consoleGroup);
    this.groups.console = consoleGroup;
    this._pickables.push(consoleGroup);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4d5b64, metalness: 0.5, roughness: 0.5 });
    this._addMesh(new THREE.BoxGeometry(3.5, 0.12, 1.25), MAT.rubber, consoleGroup, { y: 0.06, receive: true });
    this._addMesh(new THREE.BoxGeometry(3.34, 0.9, 1.1), bodyMat, consoleGroup, { y: 0.55, receive: true });
    this._addMesh(new THREE.BoxGeometry(3.48, 0.09, 1.28), MAT.steelDark, consoleGroup, { y: 1.02 });
    const kick = this._addMesh(new THREE.BoxGeometry(3.3, 0.14, 0.06), MAT.steelDark, consoleGroup, { y: 0.14, z: 0.57 });
    for (let i = 0; i < 12; i++) {
      this._addMesh(new THREE.BoxGeometry(0.12, 0.02, 0.05), MAT.steelMid, consoleGroup, { x: -1.4 + i * 0.25, y: 0.16, z: 0.61 });
    }

    // raised instrument panel
    const panel = new THREE.Group();
    panel.position.set(0, 1.36, -0.34);
    panel.rotation.x = -0.24;
    consoleGroup.add(panel);
    this._addMesh(new THREE.BoxGeometry(3.4, 0.62, 0.1), MAT.steelDark, panel, { y: 0 });
    for (let i = 0; i < 14; i++) {
      const ledMat = new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? 0x35e0c2 : i % 4 === 1 ? 0xffb84d : 0x2b6f93, toneMapped: false });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), ledMat);
      led.position.set(-1.48 + i * 0.11, -0.18, 0.06);
      panel.add(led);
    }
    for (let i = 0; i < 6; i++) {
      const knob = new THREE.Group();
      knob.position.set(-1.3 + i * 0.3, 0.06, 0.07);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16), MAT.steelMid);
      base.rotation.x = Math.PI / 2;
      knob.add(base);
      const pointer = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.055, 0.012), MAT.orange);
      pointer.position.set(0, 0.015, 0.055);
      knob.add(pointer);
      panel.add(knob);
    }
    const estopMat = new THREE.MeshStandardMaterial({ color: 0xc23127, emissive: 0x3d0b06, metalness: 0.3, roughness: 0.45 });
    const estopBase = this._addMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 20), MAT.yellow, panel, { x: 1.35, y: 0.06, z: 0.05, rx: Math.PI / 2 });
    const estop = this._addMesh(new THREE.CylinderGeometry(0.095, 0.11, 0.12, 20), estopMat, panel, { x: 1.35, y: 0.06, z: 0.12, rx: Math.PI / 2 });
    this.consoleEStop = estop;

    // main screen
    const mainFrame = new THREE.Group();
    mainFrame.position.set(0, 1.96, -0.25);
    mainFrame.rotation.x = -0.1;
    consoleGroup.add(mainFrame);
    this._addMesh(new THREE.BoxGeometry(1.9, 1.12, 0.1), MAT.graphite, mainFrame, { y: 0 });
    const consoleCanvas = makeCanvasTexture(1024, 576, (ctx, w, h) => {
      ctx.fillStyle = '#041015';
      ctx.fillRect(0, 0, w, h);
    });
    this.consoleCtx = consoleCanvas.ctx;
    this.consoleTex = consoleCanvas.tex;
    this.consoleScreenMat = new THREE.MeshBasicMaterial({ map: this.consoleTex, toneMapped: false });
    const mainScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 0.98), this.consoleScreenMat);
    mainScreen.position.z = 0.056;
    mainFrame.add(mainScreen);
    this.consoleScreen = mainScreen;

    // side screens
    const sideTexA = makeCanvasTexture(512, 320, (ctx, w, h) => {
      ctx.fillStyle = '#041015';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(95,216,255,.18)';
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = '#5fd8ff';
      ctx.font = '600 24px "Consolas", monospace';
      ctx.fillText('SAFETY INTERLOCK', 28, 52);
      ctx.fillStyle = '#8fa6b0';
      ctx.font = '500 17px "Consolas", monospace';
      ['L1  PURGE AIR      OK', 'L2  VENT HEADER    OK', 'L3  SCRUBBER       OK', 'L4  COOLING WATER  OK', 'L5  EMERGENCY STOP  --'].forEach((s, i) => {
        ctx.fillStyle = i === 4 ? '#ffb84d' : '#4bd6b4';
        ctx.fillText(s, 28, 100 + i * 36);
      });
      ctx.strokeStyle = 'rgba(95,216,255,.1)';
      ctx.beginPath();
      ctx.moveTo(20, 286);
      ctx.lineTo(492, 286);
      ctx.stroke();
      ctx.fillStyle = '#60747e';
      ctx.font = '500 15px "Consolas", monospace';
      ctx.fillText('DCS · CHEM PLANT / UNIT 1', 28, 305);
    }).tex;
    const sideTexB = makeCanvasTexture(512, 320, (ctx, w, h) => {
      ctx.fillStyle = '#041015';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(95,216,255,.18)';
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = '#5fd8ff';
      ctx.font = '600 22px "Consolas", monospace';
      ctx.fillText('REACTOR R-101', 28, 50);
      ctx.strokeStyle = 'rgba(95,216,255,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const x = 30 + (452 * i) / 60;
        const y = 230 - Math.sin(i * 0.22) * 38 - Math.sin(i * 0.07) * 22;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#60747e';
      ctx.font = '500 15px "Consolas", monospace';
      ctx.fillText('TEMP TREND / 10 MIN', 28, 280);
      ctx.fillStyle = '#ffb84d';
      ctx.fillText('25.0 °C', 28, 305);
    }).tex;
    [-1.16, 1.16].forEach((x, i) => {
      const frame = new THREE.Group();
      frame.position.set(x, 1.82, -0.1);
      frame.rotation.y = i ? -0.34 : 0.34;
      consoleGroup.add(frame);
      this._addMesh(new THREE.BoxGeometry(0.72, 0.5, 0.07), MAT.graphite, frame, {});
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.42), new THREE.MeshBasicMaterial({ map: i ? sideTexB : sideTexA, toneMapped: false }));
      screen.position.z = 0.04;
      frame.add(screen);
    });

    // desk items
    const keyboard = this._addMesh(new THREE.BoxGeometry(0.95, 0.035, 0.3), MAT.graphite, consoleGroup, { x: -0.35, y: 1.08, z: 0.22 });
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 12; c++) {
        this._addMesh(new THREE.BoxGeometry(0.055, 0.008, 0.045), MAT.steelDark, consoleGroup, {
          x: -0.75 + c * 0.068, y: 1.1, z: 0.14 + r * 0.052,
        });
      }
    }
    this._addMesh(new THREE.BoxGeometry(0.11, 0.035, 0.16), MAT.graphite, consoleGroup, { x: 0.35, y: 1.08, z: 0.24 });
    const mug = this._addMesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 16), MAT.steelLight, consoleGroup, { x: 0.95, y: 1.12, z: 0.2 });
    this._addMesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12, Math.PI), MAT.steelMid, consoleGroup, { x: 1.02, y: 1.12, z: 0.2, rz: -Math.PI / 2 });
    this._addMesh(new THREE.BoxGeometry(0.28, 0.02, 0.2), MAT.steelLight, consoleGroup, { x: -1.45, y: 1.08, z: 0.25 });

    // console status lamps
    this.consoleStatusMats = [];
    [-0.3, 0, 0.3].forEach((x, i) => {
      const mat = new THREE.MeshBasicMaterial({ color: i === 0 ? 0x35e0c2 : 0x2b3a42, toneMapped: false });
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), mat);
      lamp.position.set(x, 2.53, -0.25);
      consoleGroup.add(lamp);
      this.consoleStatusMats.push(mat);
    });
    this._addMesh(new THREE.BoxGeometry(0.78, 0.05, 0.2), MAT.steelDark, consoleGroup, { y: 2.55, z: -0.25 });

    // operator chair
    const chair = new THREE.Group();
    chair.position.set(0.25, 0, 1.75);
    chair.rotation.y = Math.PI;
    consoleGroup.add(chair);
    this._addMesh(new THREE.BoxGeometry(0.62, 0.1, 0.6), MAT.rubber, chair, { y: 0.56 });
    this._addMesh(new THREE.BoxGeometry(0.6, 0.55, 0.08), MAT.graphite, chair, { y: 0.86, z: 0.28 });
    this._addMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 10), MAT.steelMid, chair, { y: 0.05 });
    for (let i = 0; i < 5; i++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.08), MAT.steelDark);
      leg.position.set(Math.cos((i / 5) * TAU) * 0.27, 0.04, Math.sin((i / 5) * TAU) * 0.27);
      leg.rotation.y = -(i / 5) * TAU;
      chair.add(leg);
    }

    this._paintConsole(null);
  }

  _buildThermite() {
    const station = new THREE.Group();
    station.position.set(6.3, 0, -4.6);
    station.userData.info = {
      title: 'H-401 · 铝热反应工位',
      sub: 'THERMITE STATION',
      desc: '石墨坩埚内装铝粉与氧化铁粉，引燃后温度可达 2500 °C 以上，熔融铁水流入砂床中的锭模。',
    };
    this.scene.add(station);
    this.groups.thermite = station;
    this._pickables.push(station);

    this._addMesh(new THREE.BoxGeometry(4.4, 0.3, 3.6), MAT.concrete, station, { y: 0.3, receive: true });
    const sandBox = this._addMesh(new THREE.BoxGeometry(3.3, 0.22, 2.7), MAT.sand, station, { y: 0.52, receive: true });
    this._addMesh(new THREE.BoxGeometry(3.5, 0.3, 0.12), MAT.steelDark, station, { y: 0.56, z: -1.4 });
    this._addMesh(new THREE.BoxGeometry(3.5, 0.3, 0.12), MAT.steelDark, station, { y: 0.56, z: 1.4 });
    this._addMesh(new THREE.BoxGeometry(0.12, 0.3, 2.8), MAT.steelDark, station, { x: -1.7, y: 0.56 });
    this._addMesh(new THREE.BoxGeometry(0.12, 0.3, 2.8), MAT.steelDark, station, { x: 1.7, y: 0.56 });

    // stand
    [[-1.05, -0.85], [1.05, -0.85], [-1.05, 0.85], [1.05, 0.85]].forEach(([x, z]) => {
      this._addMesh(new THREE.BoxGeometry(0.12, 1.75, 0.12), MAT.steelDark, station, { x, y: 1.45, z });
    });
    this._addMesh(new THREE.BoxGeometry(2.35, 0.12, 0.12), MAT.steelDark, station, { y: 2.32, z: -0.85 });
    this._addMesh(new THREE.BoxGeometry(2.35, 0.12, 0.12), MAT.steelDark, station, { y: 2.32, z: 0.85 });
    const clampRing = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.05, 8, 32), MAT.steelMid);
    clampRing.rotation.x = Math.PI / 2;
    clampRing.position.set(0, 2.56, 0);
    station.add(clampRing);

    const crucible = new THREE.Group();
    crucible.position.set(0, 2.62, 0);
    station.add(crucible);
    const graphiteMat = new THREE.MeshStandardMaterial({ color: 0x282d31, metalness: 0.35, roughness: 0.72 });
    const crucibleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.63, 1.35, 32, 1, true), graphiteMat);
    crucibleBody.castShadow = true;
    crucible.add(crucibleBody);
    const crucibleBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.63, 0.63, 0.08, 32), graphiteMat);
    crucibleBottom.position.y = -0.67;
    crucible.add(crucibleBottom);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 8, 36), graphiteMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.69;
    crucible.add(rim);
    this._addMesh(new THREE.BoxGeometry(0.14, 0.1, 0.5), graphiteMat, crucible, { x: 0.65, y: 0.53, z: 0.55, ry: -0.6 });
    this._addMesh(new THREE.BoxGeometry(0.14, 0.1, 0.5), graphiteMat, crucible, { x: -0.65, y: 0.53, z: 0.55, ry: 0.6 });

    const chargeMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3f, roughness: 0.95, metalness: 0.15 });
    this.thermiteCharge = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.95, 28), chargeMat);
    this.thermiteCharge.position.y = 0.08;
    crucible.add(this.thermiteCharge);

    this.thermiteGlowMat = new THREE.MeshBasicMaterial({ color: 0xff5b18, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.68, 28), this.thermiteGlowMat);
    glowDisc.rotation.x = -Math.PI / 2;
    glowDisc.position.y = 0.68;
    crucible.add(glowDisc);
    this.thermiteGlowDisc = glowDisc;

    // spout + stream
    this._addMesh(new THREE.BoxGeometry(0.34, 0.16, 0.46), graphiteMat, station, { y: 1.98, z: 0.92 });
    this.moltenMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, toneMapped: false });
    this.moltenStream = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.0, 12), this.moltenMat);
    this.moltenStream.position.set(0, 1.45, 1.02);
    this.moltenStream.visible = false;
    station.add(this.moltenStream);

    // ingot mould
    const mould = new THREE.Group();
    mould.position.set(0, 0.66, 1.15);
    station.add(mould);
    this._addMesh(new THREE.BoxGeometry(1.34, 0.38, 0.96), MAT.steelDark, mould, { y: 0.19 });
    this._addMesh(new THREE.BoxGeometry(1.2, 0.34, 0.82), MAT.graphite, mould, { y: 0.23 });
    this._addMesh(new THREE.BoxGeometry(1.1, 0.12, 0.72), new THREE.MeshStandardMaterial({ color: 0x120d0b, roughness: 0.9 }), mould, { y: 0.3 });
    this.mouldFillMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, toneMapped: false });
    this.mouldFill = new THREE.Mesh(new THREE.BoxGeometry(1.06, 1, 0.68), this.mouldFillMat);
    this.mouldFill.position.set(0, 0.3, 0);
    this.mouldFill.scale.y = 0.01;
    mould.add(this.mouldFill);

    // igniter
    const igniter = new THREE.Group();
    igniter.position.set(0.72, 3.42, -0.18);
    station.add(igniter);
    this._addMesh(new THREE.CylinderGeometry(0.13, 0.1, 0.16, 12), MAT.steelDark, igniter, {});
    this._addMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), MAT.steelMid, igniter, { x: -0.25, y: 0.38, rz: 0.5 });
    const igniterTipMat = new THREE.MeshBasicMaterial({ color: 0xffe4a8, toneMapped: false });
    this._addMesh(new THREE.SphereGeometry(0.045, 8, 6), igniterTipMat, igniter, { x: -0.49, y: 0.74 });

    // extraction hood
    const hood = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.2, 32, 1, true), MAT.steelPainted);
    hood.position.set(0, 5.1, 0);
    station.add(hood);
    this._addMesh(new THREE.CylinderGeometry(0.36, 0.36, 1.6, 18), MAT.steelPainted, station, { y: 6.3 });
    this._makePipe([[0, 6.9, 0], [0, 7.3, -0.5], [2.2, 7.3, -2.2]], 0.28, MAT.steelPainted, station, { flanges: false, segments: 20 });

    // thermal shield
    const shield = this._addMesh(new THREE.BoxGeometry(3.2, 1.9, 0.08), new THREE.MeshStandardMaterial({ color: 0x59646b, metalness: 0.8, roughness: 0.35 }), station, { y: 2.5, z: -1.5, rx: -0.08 });
    for (let i = 0; i < 3; i++) {
      this._addMesh(new THREE.BoxGeometry(0.06, 1.8, 0.06), MAT.steelDark, station, { x: -1.3 + i * 1.3, y: 1.45, z: -1.56 });
    }

    // flame
    this.thermiteFlameMat = new THREE.MeshBasicMaterial({
      color: 0xff9a3a, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.thermiteFlame = new THREE.Group();
    const flameA = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.2, 22, 1, true), this.thermiteFlameMat);
    flameA.position.y = 1.0;
    this.thermiteFlame.add(flameA);
    const flameB = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.5, 18, 1, true), new THREE.MeshBasicMaterial({
      color: 0xffe2a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }));
    flameB.position.y = 1.45;
    this.thermiteFlame.add(flameB);
    this.thermiteFlame.position.set(0, 3.5, 0);
    this.thermiteFlame.visible = false;
    station.add(this.thermiteFlame);

    const glowTex = softTexture('rgba(255,150,60,.9)', 'rgba(255,80,10,0)', 128);
    this.thermiteSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffa050, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.thermiteSprite.position.set(0, 3.3, 0);
    this.thermiteSprite.scale.set(3.2, 3.2, 1);
    station.add(this.thermiteSprite);

    this.thermiteLight.position.set(6.3, 3.4, -3.5);
    this.thermitePoint = V3(6.3, 3.4, -4.6);

    // powder hoppers representing raw materials
    const hopperA = this._addMesh(new THREE.CylinderGeometry(0.55, 0.3, 1.2, 20), MAT.steelLight, station, { x: -1.85, y: 1.5, z: -1.05 });
    const hopperB = this._addMesh(new THREE.CylinderGeometry(0.55, 0.3, 1.2, 20), MAT.orange, station, { x: 1.85, y: 1.5, z: -1.05 });
    [-1.85, 1.85].forEach((x) => {
      this._addMesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 10), MAT.steelDark, station, { x, y: 0.6, z: -1.05 });
      this._addMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 10), MAT.steelDark, station, { x, y: 0.95, z: -1.05 });
    });
    this._addMesh(new THREE.BoxGeometry(2.8, 0.06, 0.5), MAT.steelDark, station, { y: 2.34, z: -1.05 });

    // drum of dry sand
    const sandDrum = this._addMesh(new THREE.CylinderGeometry(0.42, 0.42, 0.85, 20), MAT.yellow, station, { x: 1.9, y: 1.02, z: 1.25 });
    this._addMesh(new THREE.CylinderGeometry(0.44, 0.44, 0.07, 20), MAT.orange, station, { x: 1.9, y: 1.48, z: 1.25 });
    this._addMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.15, 10), MAT.steelDark, station, { x: 1.9, y: 1.58, z: 1.25 });
  }

  _buildBench() {
    const bench = new THREE.Group();
    bench.position.set(-8.9, 0, 8.6);
    bench.rotation.y = 0.15;
    bench.userData.info = {
      title: 'B-01 · 对比实验台',
      sub: 'BENCH COMPARISON',
      desc: '并排摆放的两只烧杯：左侧模拟少量石灰水，右侧模拟过量石灰水，沉淀量与清液成分可直接对比。',
    };
    this.scene.add(bench);
    this.groups.bench = bench;
    this._pickables.push(bench);

    const topMat = new THREE.MeshStandardMaterial({ color: 0xd7e5e7, roughness: 0.35, metalness: 0.05 });
    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x6c7f8a, metalness: 0.3, roughness: 0.55 });
    this._addMesh(new THREE.BoxGeometry(3.5, 0.1, 1.5), topMat, bench, { y: 0.95, receive: true });
    this._addMesh(new THREE.BoxGeometry(3.5, 0.06, 1.5), MAT.steelDark, bench, { y: 0.88 });
    this._addMesh(new THREE.BoxGeometry(3.2, 0.72, 1.2), cabinetMat, bench, { y: 0.5, z: 0.02 });
    this._addMesh(new THREE.BoxGeometry(1.5, 0.62, 0.04), MAT.steelPainted, bench, { x: -0.8, y: 0.52, z: 0.63 });
    this._addMesh(new THREE.BoxGeometry(1.5, 0.62, 0.04), MAT.steelPainted, bench, { x: 0.8, y: 0.52, z: 0.63 });
    this._addMesh(new THREE.BoxGeometry(0.03, 0.08, 0.05), MAT.steelLight, bench, { x: -0.15, y: 0.6, z: 0.66 });
    this._addMesh(new THREE.BoxGeometry(0.03, 0.08, 0.05), MAT.steelLight, bench, { x: 1.45, y: 0.6, z: 0.66 });
    this._addMesh(new THREE.BoxGeometry(3.5, 0.05, 1.5), MAT.steelDark, bench, { y: 0.14, receive: true });
    [-1.55, 1.55].forEach((x) => {
      [-0.55, 0.55].forEach((z) => {
        this._addMesh(new THREE.BoxGeometry(0.08, 0.86, 0.08), MAT.steelMid, bench, { x, y: 0.45, z });
      });
    });
    this._addMesh(new THREE.BoxGeometry(0.7, 0.05, 0.5), MAT.steelDark, bench, { y: 0.16 });

    // sink + faucet
    this._addMesh(new THREE.BoxGeometry(0.62, 0.03, 0.44), MAT.steelDark, bench, { x: 1.32, y: 1.01, z: 0.42 });
    this._addMesh(new THREE.BoxGeometry(0.56, 0.12, 0.38), MAT.steelMid, bench, { x: 1.32, y: 0.97, z: 0.42 });
    this._addMesh(new THREE.CylinderGeometry(0.035, 0.04, 0.42, 10), MAT.steelLight, bench, { x: 1.32, y: 1.2, z: 0.66 });
    const spout = this._makePipe([[1.32, 1.4, 0.66], [1.32, 1.45, 0.56], [1.32, 1.38, 0.42]], 0.02, MAT.steelLight, bench, { flanges: false, segments: 12 });

    const makeBeaker = (x, name) => {
      const g = new THREE.Group();
      g.position.set(x, 0, 0.06);
      bench.add(g);
      const plate = this._addMesh(new THREE.CylinderGeometry(0.37, 0.38, 0.1, 28), MAT.steelDark, g, { y: 1.02, receive: true });
      this._addMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 28), MAT.steelLight, g, { y: 1.08 });
      const stirBar = this._addMesh(new THREE.BoxGeometry(0.18, 0.022, 0.045), MAT.steelLight, g, { y: 1.09, z: 0.04 });
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xe6fbff, transparent: true, opacity: 0.2, roughness: 0.04, metalness: 0,
        side: THREE.DoubleSide, depthWrite: false, clearcoat: 1,
      });
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.32, 0.8, 32, 1, true), glassMat);
      glass.position.y = 1.49;
      glass.renderOrder = 6;
      g.add(glass);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.012, 6, 32), glassMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 1.89;
      g.add(rim);
      this._addMesh(new THREE.CylinderGeometry(0.32, 0.32, 0.012, 32), glassMat, g, { y: 1.09 });
      const liquidMat = new THREE.MeshPhysicalMaterial({
        color: 0xcdeef4, transparent: true, opacity: 0.52, roughness: 0.12, metalness: 0,
        depthWrite: false, side: THREE.DoubleSide,
      });
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.305, 0.295, 1, 28), liquidMat);
      liquid.scale.y = 0.36;
      liquid.position.y = 1.09 + 0.18;
      liquid.renderOrder = 3;
      g.add(liquid);
      const surface = new THREE.Mesh(new THREE.CircleGeometry(0.305, 28), new THREE.MeshPhysicalMaterial({
        color: 0xe4f8fc, transparent: true, opacity: 0.5, roughness: 0.06, depthWrite: false, side: THREE.DoubleSide,
      }));
      surface.rotation.x = -Math.PI / 2;
      surface.position.y = 1.45;
      g.add(surface);
      const pptMat = new THREE.MeshStandardMaterial({ color: 0xf0fafb, roughness: 0.9, metalness: 0 });
      const ppt = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.27, 1, 26), pptMat);
      ppt.scale.y = 0.06;
      ppt.position.y = 1.09 + 0.03;
      g.add(ppt);
      const tagMat = new THREE.MeshBasicMaterial({ map: plateTexture(name === 'L' ? 'L' : 'R', name === 'L' ? '石灰水少量' : '石灰水过量', name === 'L' ? '#63dcff' : '#ffb84d'), toneMapped: false });
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.19), tagMat);
      tag.position.set(0, 1.06, 0.38);
      tag.rotation.x = -0.4;
      g.add(tag);
      return { group: g, liquidMat, liquid, ppt, pptMat, stirBar, surface };
    };

    this.beakerL = makeBeaker(-0.82, 'L');
    this.beakerR = makeBeaker(0.82, 'R');
    this.bench = { group: bench, beakerL: this.beakerL, beakerR: this.beakerR };

    // burette stand
    const stand = new THREE.Group();
    stand.position.set(0, 0, -0.42);
    bench.add(stand);
    this._addMesh(new THREE.BoxGeometry(0.42, 0.05, 0.3), MAT.steelDark, stand, { y: 1.03 });
    this._addMesh(new THREE.CylinderGeometry(0.024, 0.024, 1.35, 10), MAT.steelMid, stand, { y: 1.7 });
    this._addMesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), MAT.steelMid, stand, { x: 0.09, y: 2.15 });
    const buretteGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 12, 1, true), new THREE.MeshPhysicalMaterial({
      color: 0xe6fbff, transparent: true, opacity: 0.22, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false,
    }));
    buretteGlass.position.set(0.17, 2.05, 0);
    stand.add(buretteGlass);
    const buretteLiquid = this._addMesh(new THREE.CylinderGeometry(0.027, 0.027, 0.7, 10), new THREE.MeshBasicMaterial({ color: 0xb7c9d4 }), stand, { x: 0.17, y: 2.12 });
    this._boltRing(stand, 0.05, 1.5, 6, MAT.steelDark, 0.6);
    this._addMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 6), MAT.steelLight, stand, { x: 0.17, y: 1.5 });

    // reagent bottles, tubes
    const bottle = (x, z, color) => {
      const g = new THREE.Group();
      g.position.set(x, 1.0, z);
      bench.add(g);
      this._addMesh(new THREE.CylinderGeometry(0.075, 0.08, 0.2, 14), new THREE.MeshPhysicalMaterial({
        color: 0xcfdde2, transparent: true, opacity: 0.4, roughness: 0.08,
      }), g, { y: 0.1 });
      this._addMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }), g, { y: 0.08 });
      this._addMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 10), MAT.graphite, g, { y: 0.24 });
      this._addMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 10), MAT.graphite, g, { y: 0.29 });
      return g;
    };
    bottle(-1.62, 0.5, 0xffb3c2);
    bottle(-1.45, 0.62, 0xcfe8ef);
    this._addMesh(new THREE.CylinderGeometry(0.17, 0.18, 0.06, 20), MAT.steelDark, bench, { x: 1.6, y: 1.03, z: 0.62 });
    for (let i = 0; i < 4; i++) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 10, 1, true), new THREE.MeshPhysicalMaterial({
        color: 0xd8f2f7, transparent: true, opacity: 0.32, roughness: 0.06, side: THREE.DoubleSide, depthWrite: false,
      }));
      tube.position.set(1.45 + i * 0.09, 1.18, 0.62);
      bench.add(tube);
      this._addMesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 8), new THREE.MeshStandardMaterial({ color: [0x63dcff, 0xffb3c2, 0xbfe9ff, 0xffcf88][i], roughness: 0.4 }), bench, { x: 1.45 + i * 0.09, y: 1.13, z: 0.62 });
    }
    // wash bottle
    this._addMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.26, 14), MAT.steelLight, bench, { x: -1.7, y: 1.14, z: 0.12 });
    this._addMesh(new THREE.CylinderGeometry(0.02, 0.03, 0.24, 8), MAT.steelLight, bench, { x: -1.7, y: 1.38, z: 0.12, rz: 0.15 });
    this._addMesh(new THREE.TorusGeometry(0.09, 0.014, 6, 14), MAT.steelMid, bench, { x: -1.7, y: 1.3, z: 0.12, rx: Math.PI / 2 });

    // chair + stool for the bench
    const stool = new THREE.Group();
    stool.position.set(0.4, 0, 1.65);
    bench.add(stool);
    this._addMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 18), MAT.graphite, stool, { y: 0.62 });
    this._addMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.58, 10), MAT.steelMid, stool, { y: 0.3 });
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.05), MAT.steelDark);
      leg.position.set(Math.cos((i / 4) * TAU) * 0.18, 0.04, Math.sin((i / 4) * TAU) * 0.18);
      leg.rotation.y = -(i / 4) * TAU;
      stool.add(leg);
    }
  }

  _buildSafety() {
    const safety = new THREE.Group();
    safety.name = 'safety';
    this.scene.add(safety);
    this.groups.safety = safety;

    // emergency shower + eyewash
    const shower = new THREE.Group();
    shower.position.set(-12.55, 0, 10.4);
    shower.userData.info = {
      title: 'SE-01 · 紧急喷淋与洗眼器',
      sub: 'EMERGENCY SHOWER',
      desc: '化学品溅到皮肤或眼睛时的第一处置点。浓硫酸灼伤须立即用大量清水冲洗并就医。',
    };
    safety.add(shower);
    this._pickables.push(shower);
    this._addMesh(new THREE.CylinderGeometry(0.46, 0.5, 0.12, 20), MAT.concrete, shower, { y: 0.06 });
    this._addMesh(new THREE.CylinderGeometry(0.07, 0.09, 2.65, 12), MAT.green, shower, { y: 1.5 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 12, 0, TAU, 0, Math.PI / 2), MAT.steelLight);
    head.position.set(0.15, 2.82, 0);
    head.rotation.z = Math.PI / 2;
    shower.add(head);
    this._addMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 10), MAT.steelLight, shower, { x: 0.15, y: 2.8, z: 0, rz: Math.PI / 2 });
    this._addMesh(new THREE.CylinderGeometry(0.3, 0.34, 0.14, 20), MAT.steelLight, shower, { x: 0.35, y: 0.9, z: 0.2 });
    this._addMesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 20), MAT.steelDark, shower, { x: 0.35, y: 1.0, z: 0.2 });
    this._addMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), MAT.steelLight, shower, { x: 0.35, y: 1.15, z: 0.38 });
    this._addMesh(new THREE.CylinderGeometry(0.35, 0.35, 0.03, 20), MAT.steelLight, shower, { x: 0.35, y: 0.55, z: 0.2 });
    const pull = this._addMesh(new THREE.BoxGeometry(0.06, 0.32, 0.05), MAT.orange, shower, { x: -0.12, y: 1.55, z: 0.05 });
    this._addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), MAT.steelDark, shower, { x: -0.12, y: 1.72, z: 0.05 });

    const signTex = makeCanvasTexture(512, 300, (ctx, w, h) => {
      ctx.fillStyle = '#0e5b46';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#eafff8';
      ctx.lineWidth = 8;
      ctx.strokeRect(14, 14, w - 28, h - 28);
      ctx.fillStyle = '#eafff8';
      ctx.font = '700 58px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('紧急洗眼', w / 2, 106);
      ctx.fillText('与喷淋', w / 2, 172);
      ctx.fillStyle = 'rgba(234,255,248,.7)';
      ctx.font = '600 24px "Segoe UI", sans-serif';
      ctx.fillText('EMERGENCY SHOWER', w / 2, 226);
      ctx.fillText('EYEWASH STATION', w / 2, 260);
    }).tex;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.53), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }));
    sign.position.set(-0.12, 2.1, 0.04);
    sign.rotation.y = 0.15;
    shower.add(sign);
    this._boltRing(shower, 0.1, 2.18, 4, MAT.steelDark, 0.6);

    // fire extinguishers
    const mkExtinguisher = (x, z, rotY = 0) => {
      const g = new THREE.Group();
      g.position.set(x, 0.36, z);
      g.rotation.y = rotY;
      safety.add(g);
      const redMat = new THREE.MeshStandardMaterial({ color: 0xb53226, metalness: 0.5, roughness: 0.4 });
      this._addMesh(new THREE.CylinderGeometry(0.23, 0.23, 0.92, 20), redMat, g, { y: 0.46 });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.23, 20, 12, 0, TAU, 0, Math.PI / 2), redMat);
      dome.position.y = 0.92;
      dome.scale.y = 0.55;
      g.add(dome);
      this._addMesh(new THREE.CylinderGeometry(0.075, 0.08, 0.16, 12), MAT.steelDark, g, { y: 1.04 });
      this._addMesh(new THREE.BoxGeometry(0.2, 0.05, 0.06), MAT.steelDark, g, { y: 1.1 });
      this._addMesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 20), MAT.steelDark, g, { y: 0.03 });
      const hose = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 6, 18, Math.PI * 1.2), MAT.rubber);
      hose.position.set(0.18, 0.75, 0.12);
      hose.rotation.set(0.3, 0.4, 0.2);
      g.add(hose);
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.34), new THREE.MeshBasicMaterial({
        map: makeCanvasTexture(128, 170, (ctx, w, h) => {
          ctx.fillStyle = '#f3f6f2';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#b53226';
          ctx.lineWidth = 4;
          ctx.strokeRect(3, 3, w - 6, h - 6);
          ctx.fillStyle = '#b53226';
          ctx.font = '700 26px "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('灭火器', w / 2, 62);
          ctx.font = '500 16px "Segoe UI", sans-serif';
          ctx.fillText('CO₂ / DRY', w / 2, 92);
          ctx.fillRect(28, 110, w - 56, 4);
          ctx.font = '600 14px "Segoe UI", sans-serif';
          ctx.fillStyle = '#34424a';
          ctx.fillText('应急使用', w / 2, 140);
        }).tex, toneMapped: false,
      }));
      tag.position.set(0, 0.62, 0.235);
      g.add(tag);
      return g;
    };
    mkExtinguisher(4.35, 11.0, 0.4);
    mkExtinguisher(-3.55, 6.6, -0.3);

    // dry sand buckets
    const mkSandBucket = (x, z, scale = 1) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      scaleObj(g, scale);
      safety.add(g);
      this._addMesh(new THREE.CylinderGeometry(0.28, 0.24, 0.52, 18), MAT.yellow, g, { y: 0.26 });
      this._addMesh(new THREE.CylinderGeometry(0.29, 0.29, 0.05, 18), MAT.orange, g, { y: 0.53 });
      this._addMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 8), MAT.steelDark, g, { y: 0.57 });
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshBasicMaterial({
        map: makeCanvasTexture(128, 96, (ctx, w, h) => {
          ctx.fillStyle = '#e2b02b';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#1a2126';
          ctx.font = '700 34px "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('干沙', w / 2, 42);
          ctx.font = '500 14px "Segoe UI", sans-serif';
          ctx.fillText('DRY SAND', w / 2, 70);
        }).tex, toneMapped: false,
      }));
      label.position.set(0, 0.32, 0.26);
      g.add(label);
      return g;
    };
    mkSandBucket(8.45, -3.0, 1.1);
    mkSandBucket(-2.4, 7.3, 1);

    // gas detector
    const detector = new THREE.Group();
    detector.position.set(3.35, 0, 2.1);
    detector.userData.info = {
      title: 'GD-07 · 可燃/有毒气体检测',
      sub: 'GAS DETECTOR',
      desc: '同时监测氢气与氯气浓度，超标时联锁启动声光报警与通风。',
    };
    safety.add(detector);
    this._pickables.push(detector);
    this._addMesh(new THREE.CylinderGeometry(0.16, 0.2, 0.1, 12), MAT.steelDark, detector, { y: 0.05 });
    this._addMesh(new THREE.CylinderGeometry(0.045, 0.045, 1.7, 10), MAT.steelMid, detector, { y: 0.9 });
    this._addMesh(new THREE.BoxGeometry(0.26, 0.32, 0.18), MAT.steelPainted, detector, { y: 1.8 });
    this.detectorLedMat = new THREE.MeshBasicMaterial({ color: 0x35e0c2, toneMapped: false });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), this.detectorLedMat);
    led.position.set(0.09, 1.88, 0.1);
    detector.add(led);
    this._addMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 12), MAT.steelLight, detector, { y: 1.58 });

    // rotating alarm beacon
    const beacon = new THREE.Group();
    beacon.position.set(4.55, 0, 3.5);
    safety.add(beacon);
    this._addMesh(new THREE.CylinderGeometry(0.24, 0.3, 0.12, 16), MAT.steelDark, beacon, { y: 0.06 });
    this._addMesh(new THREE.CylinderGeometry(0.055, 0.075, 4.4, 12), MAT.steelMid, beacon, { y: 2.2 });
    this._addMesh(new THREE.CylinderGeometry(0.24, 0.2, 0.12, 16), MAT.steelDark, beacon, { y: 4.4 });
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: 0xff4b3e, transparent: true, opacity: 0.32, roughness: 0.12, metalness: 0.1, side: THREE.DoubleSide, emissive: 0x240402,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12, 0, TAU, 0, Math.PI / 2), domeMat);
    dome.position.y = 4.46;
    beacon.add(dome);
    const reflector = new THREE.Group();
    reflector.position.y = 4.53;
    for (let i = 0; i < 3; i++) {
      const vane = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.18), new THREE.MeshBasicMaterial({ color: 0xffb0a8, toneMapped: false }));
      vane.position.x = 0.09;
      const holder = new THREE.Group();
      holder.rotation.y = (i / 3) * TAU;
      holder.add(vane);
      reflector.add(holder);
    }
    beacon.add(reflector);
    this.beacons = [{ group: beacon, domeMat, reflector }];
    this.alarmLight.position.set(4.55, 4.55, 3.5);

    // warning signs
    const signMat = new THREE.MeshBasicMaterial({ map: warningSignTexture('WARNING', 'CHEMICAL HAZARD'), transparent: true, toneMapped: false });
    const signBack = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), signMat);
    signBack.position.set(9.3, 2.2, -11.75);
    signBack.rotation.y = 0.04;
    safety.add(signBack);
    this._addMesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8), MAT.steelMid, safety, { x: 9.3, y: 0.9, z: -11.8 });
    const sign2 = signBack.clone();
    sign2.position.set(-13.4, 2.0, 5.9);
    sign2.rotation.y = Math.PI / 2;
    safety.add(sign2);
    this._addMesh(new THREE.CylinderGeometry(0.04, 0.04, 1.65, 8), MAT.steelMid, safety, { x: -13.45, y: 0.82, z: 5.9 });

    // traffic cones
    const mkCone = (x, z, rot = 0) => {
      const g = new THREE.Group();
      g.position.set(x, 0.36, z);
      g.rotation.y = rot;
      safety.add(g);
      this._addMesh(new THREE.BoxGeometry(0.36, 0.035, 0.36), MAT.rubber, g, {});
      this._addMesh(new THREE.ConeGeometry(0.16, 0.52, 18), MAT.orange, g, { y: 0.28 });
      this._addMesh(new THREE.CylinderGeometry(0.1, 0.12, 0.09, 18), new THREE.MeshStandardMaterial({ color: 0xe9edf0, roughness: 0.8 }), g, { y: 0.26 });
    };
    mkCone(-11.6, 6.9);
    mkCone(-10.7, 7.4, 0.5);
    mkCone(3.35, 9.7, 0.2);

    // spill kit
    this._addMesh(new THREE.BoxGeometry(0.85, 0.55, 0.5), MAT.yellow, safety, { x: 2.2, y: 0.62, z: 11.2 });
    this._addMesh(new THREE.BoxGeometry(0.88, 0.06, 0.53), MAT.orange, safety, { x: 2.2, y: 0.9, z: 11.2 });
    this._addMesh(new THREE.BoxGeometry(0.2, 0.03, 0.1), MAT.steelDark, safety, { x: 2.2, y: 0.94, z: 11.2 });
    // hose reel
    const reel = new THREE.Group();
    reel.position.set(-11.9, 0, 8.2);
    safety.add(reel);
    this._addMesh(new THREE.CylinderGeometry(0.05, 0.06, 1.0, 10), MAT.steelMid, reel, { y: 0.85 });
    const reelWheel = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.09, 10, 24), MAT.red);
    reelWheel.position.set(0, 1.3, 0);
    reel.add(reelWheel);
    this._addMesh(new THREE.TorusGeometry(0.4, 0.05, 8, 24), MAT.red, reel, { y: 1.3, rx: Math.PI / 2 });

    function scaleObj(obj, s) {
      obj.scale.setScalar(s);
    }
  }

  _buildBackground() {
    const bg = new THREE.Group();
    bg.name = 'background';
    this.scene.add(bg);
    this.groups.background = bg;
    this.farLights = [];

    const silhouette = new THREE.MeshBasicMaterial({ color: 0x93b4c6 });
    const silhouette2 = new THREE.MeshBasicMaterial({ color: 0xa3c1d1 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x6f95a9, toneMapped: false });
    const warmWindowMat = new THREE.MeshBasicMaterial({ color: 0xb3a184, toneMapped: false });

    const addWindowStrip = (parent, x, y, z, w = 1.6, h = 0.06) => {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(w, h), warmWindowMat);
      strip.position.set(x, y, z);
      parent.add(strip);
    };

    const cluster = (cx, cz, scale = 1) => {
      const g = new THREE.Group();
      g.position.set(cx, 0, cz);
      g.scale.setScalar(scale);
      bg.add(g);
      const seed = Math.abs(cx * 0.37 + cz * 0.11);
      const count = 3 + Math.floor(seed % 3);
      for (let i = 0; i < count; i++) {
        const w = 6 + ((i * 5.3 + seed) % 7);
        const h = 12 + ((i * 7.1 + seed * 2) % 16);
        const d = 5 + ((i * 3.7 + seed) % 5);
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), i % 2 ? silhouette : silhouette2);
        box.position.set((i - count / 2) * 7, h / 2, 0);
        g.add(box);
        for (let j = 0; j < 3; j++) {
          addWindowStrip(g, box.position.x, 2.4 + j * 2.2, d / 2 + 0.03, w * 0.55, 0.05);
        }
      }
      return g;
    };
    cluster(-32, -58, 1.1);
    cluster(-12, -66, 1.35);
    cluster(8, -60, 1.0);
    cluster(28, -54, 1.15);
    cluster(45, -70, 1.6);

    const chimney = (x, z, h, r = 0.8, color = 0x91b0c1) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      bg.add(g);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, h, 12), new THREE.MeshBasicMaterial({ color }));
      tube.position.y = h / 2;
      g.add(tube);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.74, 0.06, 6, 18), silhouette2);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = h * 0.86;
      g.add(ring);
      const lampTex = softTexture('rgba(255,90,70,1)', 'rgba(255,40,20,0)', 64);
      const lamp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: lampTex, color: 0xff5c4a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      lamp.position.set(0, h + 0.3, 0);
      lamp.scale.set(1.4, 1.4, 1);
      g.add(lamp);
      this.farLights.push(lamp.material);
      return g;
    };
    chimney(17, -48, 33, 1.0);
    chimney(-40, -52, 26, 0.75);
    chimney(36, -63, 40, 1.2);

    // distant storage spheres
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0x8fb3c5 });
    [[-24, -36, 4.2], [-16, -40, 3.1], [33, -38, 3.6]].forEach(([x, z, r]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12), sphereMat);
      s.position.set(x, r + 0.5, z);
      bg.add(s);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.12, 0.07, 6, 24), silhouette2);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, r * 0.7, z);
      bg.add(ring);
    });

    // distant flare glow
    const glowTex = softTexture('rgba(255,190,120,.55)', 'rgba(255,120,40,0)', 128);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffa460, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.position.set(33, 42, -63);
    glow.scale.set(14, 14, 1);
    bg.add(glow);

    // far skyline mist
    const mistTex = makeCanvasTexture(512, 128, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, 'rgba(226,242,251,.55)');
      grad.addColorStop(1, 'rgba(226,242,251,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }).tex;
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(150, 16), new THREE.MeshBasicMaterial({
      map: mistTex, transparent: true, opacity: 0.55, depthWrite: false, fog: false,
    }));
    mist.position.set(0, 7, -78);
    bg.add(mist);
  }

  _buildParticles() {
    const puff = softTexture('rgba(255,255,255,.95)', 'rgba(255,255,255,0)', 128);
    const sparkTex = softTexture('rgba(255,248,220,1)', 'rgba(255,140,50,0)', 64);
    const smokeTex = softTexture('rgba(180,195,205,.8)', 'rgba(90,105,115,0)', 128);
    this.pools = {
      steam: new ParticlePool(this.scene, { max: 90, texture: puff, color: 0xeafbff }),
      gas: new ParticlePool(this.scene, { max: 100, texture: puff, color: 0xd6e66b }),
      spark: new ParticlePool(this.scene, { max: 130, texture: sparkTex, color: 0xffb04a, blending: THREE.AdditiveBlending }),
      drop: new ParticlePool(this.scene, { max: 90, texture: puff, color: 0xdff5ff }),
      smoke: new ParticlePool(this.scene, { max: 70, texture: smokeTex, color: 0x9aa8b2 }),
    };

    this.explosionGroup = new THREE.Group();
    this.explosionGroup.visible = false;
    this.scene.add(this.explosionGroup);
    const coreTex = softTexture('rgba(255,255,245,1)', 'rgba(255,170,70,0)', 256);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: coreTex, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    core.scale.set(4, 4, 1);
    const halo = new THREE.Sprite(core.material.clone());
    halo.material.color.set(0xff8a3a);
    halo.scale.set(12, 12, 1);
    this.explosionGroup.add(core, halo);
    this.explosionSprites = [core, halo];
    this.shockRingMat = new THREE.MeshBasicMaterial({
      color: 0xffd9a0, transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.shockRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 72), this.shockRingMat);
    this.shockRing.rotation.x = -Math.PI / 2;
    this.shockRing.position.y = -0.5;
    this.explosionGroup.add(this.shockRing);
    this.explosionLight = new THREE.PointLight(0xffb070, 0, 34, 2);
    this.explosionLight.position.set(0, 4.6, 0);
    this.scene.add(this.explosionLight);
    this._explosionT = 99;
    this._explosionIntensity = 1;

    this._steamAcc = 0;
    this._gasAcc = 0;
    this._sparkAcc = 0;
    this._dropAcc = 0;
    this._smokeAcc = 0;
    this._explosionAcc = 0;
  }

  _addWorldLabel(key, html, pos, { lg = false } = {}) {
    const el = document.createElement('div');
    el.className = 'world-label' + (lg ? ' label-lg' : '');
    el.innerHTML = html;
    const obj = new CSS2DObject(el);
    obj.position.copy(pos);
    this.scene.add(obj);
    const value = el.querySelector('.wl-value');
    const title = el.querySelector('b');
    const sub = el.querySelector('span');
    this.labels[key] = { el, obj, value, title, sub };
    return obj;
  }

  _buildLabels() {
    this.labels = {};
    this._addWorldLabel('reactor', '<b>R-101</b><span>沉淀反应釜</span><i class="wl-value">25 °C</i>', V3(0, 9.35, 0), { lg: true });
    this._addWorldLabel('tankA', '<b>T-101</b><span>NaHCO₃ 溶液</span><i class="wl-value">46%</i>', V3(-7.4, 7.25, -0.9));
    this._addWorldLabel('tankB', '<b>T-102</b><span>澄清石灰水</span><i class="wl-value">92%</i>', V3(-7.0, 7.25, 4.7));
    this._addWorldLabel('scrubber', '<b>T-301</b><span>尾气吸收塔</span><i class="wl-value">待机</i>', V3(11.2, 10.55, -2.6));
    this._addWorldLabel('console', '<b>DCS</b><span>中央控制台</span>', V3(7.25, 3.15, 7.85));
    this._addWorldLabel('thermite', '<b>H-401</b><span>铝热坩埚</span><i class="wl-value">待机</i>', V3(6.3, 6.1, -4.6));
    this._addWorldLabel('bench', '<b>B-01</b><span>少量 / 过量 对比台</span>', V3(-8.9, 3.15, 8.6));
    this._addWorldLabel('beakerL', '<b>少量石灰水</b><span>HCO₃⁻ 过量</span><i class="wl-value">CaCO₃ 0.0 g</i>', V3(-9.72, 2.24, 8.55));
    this._addWorldLabel('beakerR', '<b>过量石灰水</b><span>OH⁻ 过量</span><i class="wl-value">CaCO₃ 0.0 g</i>', V3(-8.1, 2.24, 8.79));
    this._addWorldLabel('gas', '<b>G-301 / G-302</b><span>H₂ · Cl₂ 配气站</span>', V3(-3.95, 4.3, -5.9));
  }

  _bindPointer() {
    const el = this.renderer.domElement;
    this._raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    el.addEventListener('pointerdown', (e) => {
      this._pointerDown = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    el.addEventListener('pointerup', (e) => {
      const d = this._pointerDown;
      this._pointerDown = null;
      if (!d) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
      if (performance.now() - d.t > 900) return;
      this._pickAt(e.clientX, e.clientY);
    });
    el.addEventListener('pointerleave', () => { this._pointerDown = null; });
  }

  _pickAt(cx, cy) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this._raycaster.setFromCamera(this._ndc, this.camera);
    const hits = this._raycaster.intersectObjects(this._pickables, true);
    for (const hit of hits) {
      let obj = hit.object;
      while (obj && !(obj.userData && obj.userData.info)) obj = obj.parent;
      if (obj && obj.userData.info && obj.visible) {
        this.onPick(obj.userData.info, { x: cx, y: cy });
        return;
      }
    }
  }

  setReaction(reaction) {
    this.reaction = reaction;
    const id = reaction ? reaction.id : 'limewater';
    this.reactionId = id;
    this.mode = reaction ? reaction.sceneMode : 'reactor';
    this.defaultView = id === 'thermite' ? 'thermite' : (reaction && reaction.defaultView) || 'reactor';

    this.groups.reactor.visible = this.mode !== 'thermite';
    this.groups.feed.visible = ['limewater', 'sodium', 'dilution'].includes(id);
    this.groups.gas.visible = id === 'chlorine';
    this.groups.sodium.visible = id === 'sodium';
    this.groups.bench.visible = id === 'limewater';
    this.groups.thermite.visible = id === 'thermite';

    this.setLabelFocus('overview');

    const metaA = reaction && reaction.tankA ? reaction.tankA : { code: 'T-101', title: 'NaHCO₃ 溶液', short: 'NaHCO₃', color: 0x9fe8ff };
    const metaB = reaction && reaction.tankB ? reaction.tankB : { code: 'T-102', title: '澄清石灰水', short: 'Ca(OH)₂', color: 0xdff7f4 };
    this._setTankMeta(0, { code: metaA.code, title: metaA.title, color: metaA.color });
    this._setTankMeta(1, { code: metaB.code, title: metaB.title, color: metaB.color });
    this.labels.tankA.title.textContent = metaA.code;
    this.labels.tankA.sub.textContent = metaA.title;
    this.labels.tankB.title.textContent = metaB.code;
    this.labels.tankB.sub.textContent = metaB.title;
    this.labels.reactor.sub.textContent = reaction ? reaction.reactorLabel : '沉淀反应釜';

    this._resetVisuals();
    this._paintConsole(null);
  }

  setLabelFocus(view) {
    const id = this.reactionId;
    const visible = { scrubber: true, console: true };
    if (id === 'thermite') {
      visible.thermite = view === 'overview' || view === 'thermite';
    } else {
      visible.reactor = true;
      visible.tankA = true;
      visible.tankB = true;
      if (id === 'chlorine') visible.gas = true;
      if (id === 'limewater') {
        const onBench = view === 'bench';
        visible.bench = onBench;
        visible.beakerL = onBench;
        visible.beakerR = onBench;
      }
    }
    Object.entries(this.labels).forEach(([key, item]) => {
      item.el.classList.toggle('hidden', !visible[key]);
    });
  }

  _resetVisuals() {
    this.liquid.visible = true;
    this.surface.visible = true;
    this.surfaceRing.visible = true;
    this.gasBody.visible = false;
    this.gasMat.opacity = 0;
    this.mistSphere.visible = false;
    this.mistMat.opacity = 0;
    this.ppt.visible = false;
    this.sediment.visible = false;
    this.bubbles.visible = false;
    this.agitator.visible = true;
    this._pptCount = 0;
    this._bubbleCount = 0;
    this.sodiumBall.visible = false;
    this.ventFlame.visible = false;
    this.ventLight.intensity = 0;
    this.thermiteFlame.visible = false;
    this.thermiteGlowMat.opacity = 0;
    this.thermiteSprite.material.opacity = 0;
    this.moltenStream.visible = false;
    this.mouldFill.scale.y = 0.01;
    this.thermiteLight.intensity = 0;
    this.flareFlame.visible = false;
    this.flareLight.intensity = 0;
    this.explosionGroup.visible = false;
    this._shake = 0;
    if (this.pools) {
      Object.values(this.pools).forEach((pool) => {
        pool.particles.forEach((p) => { p.life = 0; });
        pool.alphas.fill(0);
        pool.points.geometry.attributes.aAlpha.needsUpdate = true;
      });
    }
  }

  _setTankLevel(index, fill, color) {
    const tank = index === 0 ? this.tankA : this.tankB;
    if (!tank) return;
    const f = clamp(fill, 0.03, 0.97);
    tank.fill.scale.y = tank.gaugeH * f;
    tank.fill.position.y = tank.gaugeBase + (tank.gaugeH * f) / 2;
    tank.fillMat.color.setHex(color);
    tank.level = f;
  }

  _setBeaker(beaker, pptFrac, grams) {
    if (!beaker) return;
    const frac = clamp(pptFrac, 0, 1);
    beaker.pptMat.color.setHex(0xf1fafb);
    beaker.ppt.scale.y = 0.03 + frac * 0.12;
    beaker.ppt.position.y = 1.09 + beaker.ppt.scale.y / 2;
    beaker.ppt.visible = frac > 0.02;
    if (!this._whiteColor) this._whiteColor = new THREE.Color(0xffffff);
    beaker.liquidMat.color.setHex(0xcdeef4).lerp(this._whiteColor, 0.35 + frac * 0.45);
    beaker.liquidMat.opacity = 0.42 + frac * 0.24;
    beaker.surface.position.y = 1.45;
    beaker.surface.material.color.copy(beaker.liquidMat.color);
    beaker.surface.material.opacity = 0.4 + frac * 0.2;
    beaker.grams = grams;
  }

  apply(snap, dt = 0.016) {
    if (!snap) return;
    this.snap = snap;
    const v = snap.visual || {};
    const d = clamp(dt, 0, 0.1);
    const isGas = v.mode === 'gas';
    const isThermite = v.mode === 'thermite';
    const params = snap.params || {};
    const hazardLevel = snap.hazard ? snap.hazard.level : 0;
    this._hazardLevel = hazardLevel;
    this._phase = snap.phase;
    if (!this._whiteColor) this._whiteColor = new THREE.Color(0xffffff);

    const fill = clamp(v.fill ?? 0.45, 0.04, 0.94);
    const liquidH = fill * 3.5;
    const bottom = 2.16;
    this._surfaceY = bottom + liquidH;
    const showLiquid = !isGas && !isThermite;
    this.liquid.visible = showLiquid;
    this.surface.visible = showLiquid;
    this.surfaceRing.visible = showLiquid;
    this.agitator.visible = showLiquid;
    if (showLiquid) {
      this.liquid.scale.set(2.04, liquidH, 2.04);
      this.liquid.position.y = bottom + liquidH / 2;
      this.surface.position.y = bottom + liquidH + 0.012;
      this.surfaceRing.position.y = bottom + liquidH + 0.016;
      const turb = clamp(v.turbidity || 0, 0, 1);
      this._tempColor.setHex(v.liquidColor ?? 0xc9edf2);
      this._tempColor.lerp(this._whiteColor, turb * 0.82);
      this.liquidMat.color.copy(this._tempColor);
      this.liquidMat.opacity = clamp((v.liquidOpacity ?? 0.6) + turb * 0.16, 0.08, 0.95);
      this.surfaceMat.color.copy(this._tempColor).lerp(this._whiteColor, 0.22);
      this.surfaceMat.opacity = clamp((v.liquidOpacity ?? 0.6) * 0.9 + turb * 0.1, 0.1, 0.95);
      this.surfaceRing.material.color.setHex(hazardLevel >= 2 ? 0xffb07a : 0xbdeff8);
    }

    this._agitatorTarget = v.stir || 0;

    const ppt = clamp(v.ppt || 0, 0, 1);
    this._pptCount = Math.round(ppt * 300);
    this.ppt.visible = this._pptCount > 0;
    const sed = clamp(v.sediment || 0, 0, 1);
    this.sediment.visible = sed > 0.01;
    if (this.sediment.visible) {
      this.sediment.position.y = bottom - 0.02;
      this.sediment.scale.set(1, 0.12 + sed * 0.88, 1);
    }

    const bub = clamp(v.bubble || 0, 0, 1);
    this._bubbleCount = Math.round(bub * 140);
    this.bubbles.visible = this._bubbleCount > 0 && showLiquid;

    this.gasBody.visible = isGas;
    if (isGas) {
      this.gasMat.opacity = clamp(v.gasOpacity ?? 0, 0, 0.6);
      this.gasMat.color.setHex(v.gasColor ?? 0xd6e66b);
    }
    const mist = clamp(v.mist || 0, 0, 1);
    this.mistSphere.visible = mist > 0.01;
    this.mistMat.opacity = mist * 0.4;

    this._setTankLevel(0, v.tankA ?? 0.5, v.tankAColor ?? 0x9fe8ff);
    this._setTankLevel(1, v.tankB ?? 0.5, v.tankBColor ?? 0xdff7f4);

    this._feedA = (v.feedA || 0) > 0.1;
    this._feedB = (v.feedB || 0) > 0.1;
    this.feedLights.forEach((mat, i) => {
      mat.color.setHex(i === 0 ? (this._feedA ? 0x63dcff : 0x27444c) : (this._feedB ? 0xffd28a : 0x27444c));
    });

    const lampOn = snap.phase === 'running' || snap.phase === 'danger' || snap.phase === 'done';
    const light = clamp((params.light ?? 0) / 100, 0, 1);
    if (this.groups.gas.visible) {
      this.lampBeamMat.opacity = 0.015 + (lampOn ? 0.09 * light : 0.02);
      this.lampLensMat.opacity = lampOn ? 0.4 + 0.6 * light : 0.15;
      this.lampLight.intensity = lampOn ? 12 + light * 38 : 0;
    } else {
      this.lampLight.intensity = 0;
    }

    if (this.reactionId === 'sodium' && this.groups.sodium.visible) {
      const s = clamp(v.sodium || 0, 0, 1);
      this.sodiumBall.visible = s > 0.01 && snap.phase !== 'danger';
      if (this.sodiumBall.visible) {
        const drop = clamp((snap.progress || 0) / 0.07, 0, 1);
        const surf = this._surfaceY + 0.11;
        this.sodiumBall.position.set(
          0.92 + Math.sin(this.time * 1.6) * 0.16,
          lerp(7.02, surf, drop) + Math.sin(this.time * 5.2) * 0.03 * drop,
          0.26 + Math.cos(this.time * 1.3) * 0.12
        );
        this.sodiumBall.scale.setScalar(0.7 + s * 0.55);
        this.sodiumBall.material.emissive.setHex(0x2c1e12);
      }
    }

    const ventType = v.ventType || 'none';
    const fire = ventType === 'fire';
    this.ventFlame.visible = fire;
    if (fire) {
      this.ventFlameMat.opacity = 0.62 + Math.random() * 0.2;
      this.ventLight.intensity = 34 + Math.random() * 26;
    } else {
      this.ventLight.intensity = 0;
    }
    this.flareFlame.visible = fire;
    this.flareLight.intensity = fire ? 70 + Math.random() * 40 : 0;

    this._scrubberActive = ['chlorine', 'hcl', 'acid-mist'].includes(ventType);
    this.scrubberGlowMat.opacity = this._scrubberActive ? 0.16 + 0.08 * Math.sin(this.time * 3) : 0.035;
    this.scrubberGlowMat.color.setHex(ventType === 'chlorine' ? 0xb9c94a : 0x49d8bd);

    this._coolingOn = this.reactionId === 'dilution' || (snap.tempC || 25) > 65 || hazardLevel >= 2;

    this.ringMats.forEach((mat) => {
      mat.color.setHex(hazardLevel >= 3 ? 0xff4b3e : hazardLevel === 2 ? 0xff8a3a : hazardLevel === 1 ? 0xffb84d : 0x46e4cb);
      mat.opacity = 0.55 + Math.sin(this.time * 3.2) * 0.2;
    });
    this._alarmBase = hazardLevel >= 2 ? 28 + hazardLevel * 8 : 0;
    this.reactorLight.color.setHex(hazardLevel >= 2 ? 0xff8a4a : 0x7be5ff);
    this.reactorLight.intensity = 16 + (v.glow || 0) * 55 + (v.ppt || 0) * 8;

    if (this.groups.thermite.visible) {
      const conversion = clamp(snap.extra ? snap.extra.conversion || 0 : 0, 0, 1);
      const cs = Math.max(0.06, 1 - conversion * 0.9);
      this.thermiteCharge.scale.set(0.82 + 0.18 * cs, cs, 0.82 + 0.18 * cs);
      this.thermiteFlame.visible = (v.flame || 0) > 0.02;
      this.thermiteFlameMat.opacity = 0.5 + 0.45 * clamp(v.flame || 0, 0, 1);
      this.thermiteGlowMat.opacity = clamp((v.glow || 0) * 0.95, 0, 0.95);
      this.thermiteSprite.material.opacity = clamp((v.glow || 0) * 0.85 + (v.flame || 0) * 0.3, 0, 1);
      this.thermiteLight.intensity = 8 + (v.glow || 0) * 260 + (v.flame || 0) * 130;
      this.moltenStream.visible = (v.molten || 0) > 0.04;
      this.moltenStream.scale.set(0.8 + (v.molten || 0) * 0.4, Math.max(0.05, v.molten || 0), 0.8 + (v.molten || 0) * 0.4);
      const hot = clamp(((snap.tempC || 25) - 25) / 2500, 0, 1);
      this.moltenMat.color.setRGB(1, 0.32 + 0.5 * hot, 0.06 + 0.12 * hot);
      this.mouldFill.visible = (v.moldFill || 0) > 0.005;
      this.mouldFill.scale.y = Math.max(0.012, (v.moldFill || 0) * 0.28);
      this.mouldFill.position.y = 0.31 + this.mouldFill.scale.y / 2;
      this.mouldFillMat.color.setRGB(1, 0.25 + 0.45 * hot, 0.04 + 0.1 * hot);
    }

    if (this.reactionId === 'limewater') {
      const cA = clamp(params.cA ?? 0.25, 0.05, 0.8);
      const a = cA * 4;
      const p = clamp(snap.progress ?? 0, 0, 1);
      const s = p * p * (3 - 2 * p);
      const nL = Math.min(a, 0.35 * a * s);
      const nR = Math.min(a, 1.25 * a * s);
      this._setBeaker(this.beakerL, nL / Math.max(a, 0.001), nL * 100.09);
      this._setBeaker(this.beakerR, nR / Math.max(a, 0.001), nR * 100.09);
    }

    this._visualShake = clamp(v.shake || 0, 0, 1);

    this._instrAcc = (this._instrAcc || 0) + d;
    if (this._instrAcc > 0.1) {
      this._instrAcc = 0;
      this._updateInstruments(snap);
    }
    this._consoleAcc = (this._consoleAcc || 0) + d;
    if (this._consoleAcc > 0.2) {
      this._consoleAcc = 0;
      this._paintConsole(snap);
    }
    this._labelAcc = (this._labelAcc || 0) + d;
    if (this._labelAcc > 0.24) {
      this._labelAcc = 0;
      this._updateLabels(snap);
    }

    this._emitEffects(snap, d);
  }

  _updateInstruments(snap) {
    const tMax = snap.reactionId === 'chlorine' ? 1200 : snap.reactionId === 'dilution' ? 150 : 120;
    const tn = clamp(((snap.tempC || 25) / tMax), 0, 1);
    const pn = clamp((((snap.pressureKpa || 101.3) - 95) / 605), 0, 1);
    if (this.gaugeTemp) {
      this.gaugeTemp.needleGroup.rotation.z = THREE.MathUtils.degToRad(-120 + tn * 240);
      this.gaugeTemp.needleGroup.children[0].material.color.setHex(tn > 0.72 ? 0xff6b4a : 0x68e3d2);
    }
    if (this.gaugePress) {
      this.gaugePress.needleGroup.rotation.z = THREE.MathUtils.degToRad(-120 + pn * 240);
      this.gaugePress.needleGroup.children[0].material.color.setHex(pn > 0.55 ? 0xffb24a : 0x68e3d2);
    }
    this._drawLCD(snap);
  }

  _drawLCD(snap) {
    if (!this.lcd) return;
    const ctx = this.lcd.ctx;
    const w = 512;
    const h = 256;
    ctx.fillStyle = '#051115';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(95,216,255,.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const haz = snap.hazard ? snap.hazard.level : 0;
    const accent = haz >= 3 ? '#ff5a4c' : haz === 2 ? '#ff9a4a' : '#5fd8ff';
    ctx.strokeStyle = 'rgba(120,200,215,.28)';
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = accent;
    ctx.font = '600 18px "Consolas", "Microsoft YaHei", monospace';
    ctx.fillText('R-101 · REACTOR', 22, 34);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7e99a2';
    ctx.font = '500 13px "Consolas", monospace';
    ctx.fillText(snap.phase === 'running' ? 'RUN' : snap.phase === 'danger' ? 'ALARM' : snap.phase === 'done' ? 'DONE' : 'STBY', w - 22, 34);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e8f7fa';
    ctx.font = '600 52px "Consolas", monospace';
    ctx.fillText(`${(snap.tempC || 25).toFixed(1)}`, 22, 100);
    ctx.fillStyle = '#7e99a2';
    ctx.font = '500 16px "Consolas", monospace';
    ctx.fillText('°C', 160, 98);
    ctx.fillStyle = '#e8f7fa';
    ctx.font = '600 34px "Consolas", monospace';
    ctx.fillText(`${(snap.pressureKpa || 101.3).toFixed(0)}`, 250, 98);
    ctx.fillStyle = '#7e99a2';
    ctx.font = '500 14px "Consolas", monospace';
    ctx.fillText('kPa', 340, 96);
    ctx.strokeStyle = 'rgba(120,200,215,.18)';
    ctx.beginPath();
    ctx.moveTo(22, 116);
    ctx.lineTo(w - 22, 116);
    ctx.stroke();
    const stage = snap.stage || '待机';
    ctx.fillStyle = accent;
    ctx.font = '500 16px "Microsoft YaHei", "Consolas", sans-serif';
    ctx.fillText(stage, 22, 142);
    const equation = snap.equations && snap.equations[snap.activeEquation || 0] ? snap.equations[snap.activeEquation || 0].label : '';
    ctx.fillStyle = '#7e99a2';
    ctx.font = '500 12px "Microsoft YaHei", sans-serif';
    ctx.fillText(equation.slice(0, 36), 22, 166);
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    ctx.fillRect(22, 184, w - 44, 5);
    ctx.fillStyle = accent;
    ctx.fillRect(22, 184, (w - 44) * clamp(snap.progress || 0, 0, 1), 5);
    if (snap.hazard && snap.hazard.level >= 2) {
      ctx.fillStyle = haz >= 3 ? 'rgba(255,75,62,.18)' : 'rgba(255,184,77,.16)';
      ctx.fillRect(22, 202, w - 44, 32);
      ctx.fillStyle = accent;
      ctx.font = '600 14px "Microsoft YaHei", sans-serif';
      ctx.fillText(`⚠ ${snap.hazard.title}`, 32, 224);
    } else {
      ctx.fillStyle = '#4f6a74';
      ctx.font = '500 11px "Consolas", monospace';
      ctx.fillText('SIGNAL OK · DCS LINK · NO INTERLOCK', 22, 224);
    }
    this.lcd.tex.needsUpdate = true;
  }

  _paintConsole(snap) {
    if (!this.consoleCtx) return;
    const ctx = this.consoleCtx;
    const W = 1024;
    const H = 576;
    const css = (hex) => `#${(hex >>> 0).toString(16).padStart(6, '0')}`;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#081a22');
    grad.addColorStop(1, '#030b0e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(95,216,255,.045)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(10,32,41,.96)';
    ctx.fillRect(0, 0, W, 58);
    ctx.fillStyle = '#5fd8ff';
    ctx.font = '600 20px "Consolas", monospace';
    ctx.fillText('CHEM·PLANT / DCS', 26, 37);
    ctx.fillStyle = '#78949e';
    ctx.font = '500 13px "Consolas", monospace';
    ctx.fillText('UNIT 01 · REACTION ENGINEERING', 254, 36);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#c7e2e9';
    ctx.fillText(new Date().toLocaleTimeString('zh-CN', { hour12: false }), W - 26, 36);
    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(95,216,255,.16)';
    ctx.beginPath();
    ctx.moveTo(0, 58);
    ctx.lineTo(W, 58);
    ctx.stroke();

    if (!snap) {
      ctx.fillStyle = '#3d5a64';
      ctx.font = '600 32px "Consolas", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM STANDBY', W / 2, 286);
      ctx.font = '500 16px "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#2c454e';
      ctx.fillText('正在载入工艺数据…', W / 2, 322);
      ctx.textAlign = 'left';
      this.consoleTex.needsUpdate = true;
      return;
    }

    const v = snap.visual || {};
    const haz = snap.hazard ? snap.hazard.level : 0;
    const accent = haz >= 3 ? '#ff5a4c' : haz === 2 ? '#ff9a4a' : '#5fd8ff';
    const reaction = this.reaction;
    const metaA = reaction ? reaction.tankA : { code: 'T-101', title: 'NaHCO₃' };
    const metaB = reaction ? reaction.tankB : { code: 'T-102', title: 'Ca(OH)₂' };

    // mimic: tanks
    const drawTank = (x, level, color, code, title) => {
      ctx.strokeStyle = 'rgba(130,180,195,.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 148, 94, 214);
      ctx.fillStyle = 'rgba(255,255,255,.025)';
      ctx.fillRect(x + 3, 151, 88, 208);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 5, 154, 84, 202);
      ctx.clip();
      const fh = 202 * clamp(level, 0, 1);
      ctx.fillStyle = css(color);
      ctx.globalAlpha = 0.36;
      ctx.fillRect(x + 5, 356 - fh, 84, fh);
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.fillStyle = '#a9cdd6';
      ctx.font = '600 15px "Consolas", monospace';
      ctx.fillText(code, x + 6, 142);
      ctx.fillStyle = '#5f7c86';
      ctx.font = '500 12px "Microsoft YaHei", sans-serif';
      ctx.fillText(title.slice(0, 8), x + 6, 378);
      ctx.fillStyle = accent;
      ctx.font = '600 16px "Consolas", monospace';
      ctx.fillText(`${Math.round(clamp(level, 0, 1) * 100)}%`, x + 6, 400);
    };
    drawTank(58, v.tankA ?? 0.5, v.tankAColor || 0x9fe8ff, metaA.code, metaA.title);
    drawTank(178, v.tankB ?? 0.5, v.tankBColor || 0xdff7f4, metaB.code, metaB.title);

    const cx = 484;
    const cy = 300;
    const r = 92;
    const isGas = v.mode === 'gas';
    const fill = clamp(v.fill ?? 0.45, 0, 0.92);

    // feed pipelines
    const flowLine = (x1, y1, x2, y2, on) => {
      ctx.strokeStyle = 'rgba(120,180,200,.34)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (!on) return;
      ctx.fillStyle = accent;
      for (let i = 0; i < 4; i++) {
        const t = ((this.time * 0.35 + i * 0.25) % 1);
        ctx.beginPath();
        ctx.arc(lerp(x1, x2, t), lerp(y1, y2, t), 3, 0, TAU);
        ctx.fill();
      }
    };
    flowLine(152, 362, 250, 362, v.feedA > 0.1);
    flowLine(272, 362, 340, 362, false);
    flowLine(152, 380, 330, 440, false);
    flowLine(272, 380, 360, 430, false);
    ctx.strokeStyle = 'rgba(120,180,200,.34)';
    ctx.beginPath();
    ctx.moveTo(250, 362);
    ctx.lineTo(250, 330);
    ctx.lineTo(cx - r, 330);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(352, 362);
    ctx.lineTo(352, 280);
    ctx.lineTo(cx - r + 20, 280);
    ctx.stroke();

    // reactor
    ctx.strokeStyle = 'rgba(150,210,225,.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, TAU);
    ctx.clip();
    if (isGas) {
      ctx.fillStyle = css(v.gasColor || 0xd6e66b);
      ctx.globalAlpha = 0.24;
      ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = css(v.liquidColor || 0xc9edf2);
      ctx.globalAlpha = 0.36;
      ctx.fillRect(cx - r, cy + r - 2 * r * fill, 2 * r, 2 * r * fill);
      ctx.globalAlpha = 1;
      if ((v.turbidity || 0) > 0.05) {
        ctx.fillStyle = 'rgba(240,252,252,.3)';
        ctx.fillRect(cx - r, cy + r - 2 * r * fill, 2 * r, 2 * r * fill);
      }
      ctx.strokeStyle = 'rgba(220,250,255,.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 32; i++) {
        const x = cx - r + (2 * r * i) / 32;
        const y = cy + r - 2 * r * fill + Math.sin(i * 0.7 + this.time * 2) * 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(170,220,235,.7)';
    ctx.lineWidth = 2;
    const agA = this.time * 1.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(agA) * (r - 10), cy + Math.sin(agA) * (r - 10));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - Math.cos(agA) * (r - 10), cy - Math.sin(agA) * (r - 10));
    ctx.stroke();
    ctx.fillStyle = '#8bb3bd';
    ctx.font = '600 15px "Consolas", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('R-101', cx, cy - r - 12);
    ctx.fillStyle = '#e8f7fa';
    ctx.font = '600 30px "Consolas", monospace';
    ctx.fillText(`${(snap.tempC || 25).toFixed(0)}°C`, cx, cy + r + 34);
    ctx.textAlign = 'left';

    // scrubber
    const sx = 800;
    const sy = 160;
    ctx.strokeStyle = 'rgba(130,180,195,.45)';
    ctx.strokeRect(sx, sy, 92, 234);
    ctx.fillStyle = 'rgba(255,255,255,.03)';
    ctx.fillRect(sx + 3, sy + 3, 86, 228);
    ctx.fillStyle = 'rgba(73,216,189,.22)';
    const scrubFill = 120 + 80 * clamp(v.ventRate || 0, 0, 1);
    ctx.fillRect(sx + 5, sy + 228 - scrubFill, 82, scrubFill);
    ctx.strokeStyle = 'rgba(170,220,235,.4)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(sx + 8, sy + 28 + i * 36);
      ctx.lineTo(sx + 84, sy + 28 + i * 36);
      ctx.stroke();
    }
    ctx.fillStyle = '#a9cdd6';
    ctx.font = '600 14px "Consolas", monospace';
    ctx.fillText('T-301', sx, sy - 10);
    ctx.fillStyle = '#5f7c86';
    ctx.font = '500 11px "Microsoft YaHei", sans-serif';
    ctx.fillText('尾气吸收塔', sx, sy + 250);
    ctx.fillStyle = this._scrubberActive ? '#35e0c2' : '#5f7c86';
    ctx.font = '600 13px "Consolas", monospace';
    ctx.fillText(this._scrubberActive ? 'ABSORBING' : 'STANDBY', sx, sy + 268);

    // vent line
    ctx.strokeStyle = 'rgba(120,180,200,.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + r, cy - 20);
    ctx.lineTo(704, cy - 80);
    ctx.lineTo(sx, sy + 60);
    ctx.stroke();
    if ((v.ventRate || 0) > 0.02) {
      ctx.fillStyle = accent;
      for (let i = 0; i < 3; i++) {
        const t = ((this.time * 0.4 + i * 0.33) % 1);
        const x = lerp(cx + r, 704, t);
        const y = lerp(cy - 20, cy - 80, t);
        if (t > 0.5) {
          const t2 = (t - 0.5) * 2;
          ctx.beginPath();
          ctx.arc(lerp(704, sx, t2), lerp(cy - 80, sy + 60, t2), 2.5, 0, TAU);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, TAU);
          ctx.fill();
        }
      }
    }

    if (haz >= 2) {
      ctx.fillStyle = haz >= 3 ? 'rgba(255,75,62,.16)' : 'rgba(255,184,77,.15)';
      ctx.fillRect(300, 66, 620, 36);
      ctx.strokeStyle = accent;
      ctx.strokeRect(300, 66, 620, 36);
      ctx.fillStyle = accent;
      ctx.font = '600 15px "Microsoft YaHei", "Consolas", sans-serif';
      ctx.fillText(`⚠ ${snap.hazard.title} · ${haz >= 3 ? 'CRITICAL' : 'WARNING'}`, 316, 90);
    } else {
      ctx.fillStyle = '#35e0c2';
      ctx.font = '500 13px "Consolas", monospace';
      ctx.fillText('● PROCESS NORMAL · INTERLOCKS ENABLED', 300, 88);
    }

    // metric strip
    const metricY = 444;
    const metrics = snap.metrics || [];
    metrics.slice(0, 4).forEach((m, i) => {
      const x = 58 + i * 176;
      ctx.fillStyle = 'rgba(255,255,255,.025)';
      ctx.fillRect(x, metricY, 160, 54);
      ctx.strokeStyle = 'rgba(120,180,195,.16)';
      ctx.strokeRect(x, metricY, 160, 54);
      ctx.fillStyle = '#5f7c86';
      ctx.font = '500 11px "Microsoft YaHei", sans-serif';
      ctx.fillText(m.label, x + 10, metricY + 18);
      ctx.fillStyle = m.level === 'danger' ? '#ff7a6c' : m.level === 'warn' ? '#ffc46b' : '#d3e8ec';
      ctx.font = '600 18px "Consolas", monospace';
      ctx.fillText(`${m.value}${m.unit ? ' ' + m.unit : ''}`, x + 10, metricY + 42);
    });

    // progress + equation
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(58, 514, 630, 5);
    ctx.fillStyle = accent;
    ctx.fillRect(58, 514, 630 * clamp(snap.progress || 0, 0, 1), 5);
    ctx.fillStyle = '#6d8892';
    ctx.font = '500 12px "Microsoft YaHei", sans-serif';
    ctx.fillText(`${snap.stage || ''} · ${snap.equationMode || ''}`, 58, 538);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9fc3cc';
    ctx.font = '500 12px "Microsoft YaHei", sans-serif';
    ctx.fillText(reaction ? reaction.formula : '', 990, 538);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#3d5a64';
    ctx.font = '500 11px "Consolas", monospace';
    ctx.fillText('DCS LINK OK · HISTORIAN · ALARM LOG', 58, 558);
    this.consoleTex.needsUpdate = true;
  }

  _updateLabels(snap) {
    if (!this.labels) return;
    const v = snap.visual || {};
    const haz = snap.hazard ? snap.hazard.level : 0;
    const danger = haz >= 3 || snap.phase === 'danger';
    const warn = haz === 1 || haz === 2;
    const setState = (item) => {
      if (!item) return;
      item.el.classList.toggle('warn', warn);
      item.el.classList.toggle('danger', danger);
    };
    setState(this.labels.reactor);
    setState(this.labels.tankA);
    setState(this.labels.tankB);
    setState(this.labels.scrubber);

    if (this.labels.reactor.value) this.labels.reactor.value.textContent = `${(snap.tempC || 25).toFixed(0)} °C`;
    if (this.labels.tankA.value) this.labels.tankA.value.textContent = `${Math.round(clamp(v.tankA ?? 0, 0, 1) * 100)}%`;
    if (this.labels.tankB.value) this.labels.tankB.value.textContent = `${Math.round(clamp(v.tankB ?? 0, 0, 1) * 100)}%`;
    if (this.labels.scrubber.value) {
      const vent = v.ventType || 'none';
      this.labels.scrubber.value.textContent = vent === 'chlorine' ? '吸收 Cl₂' : vent === 'hcl' || vent === 'acid-mist' ? '洗涤酸雾' : vent === 'fire' ? '旁路燃烧' : '待机';
    }
    if (this.labels.thermite.value) this.labels.thermite.value.textContent = `${(snap.tempC || 25).toFixed(0)} °C`;
    if (this.reactionId === 'limewater') {
      if (this.labels.beakerL.value) this.labels.beakerL.value.textContent = `CaCO₃ ${(this.beakerL.grams || 0).toFixed(1)} g`;
      if (this.labels.beakerR.value) this.labels.beakerR.value.textContent = `CaCO₃ ${(this.beakerR.grams || 0).toFixed(1)} g`;
    }
  }

  _emitEffects(snap, dt) {
    if (!this.pools) return;
    const v = snap.visual || {};
    const pools = this.pools;
    const surfaceY = this._surfaceY || 3.7;
    const ventType = v.ventType || 'none';

    const steam = clamp(v.steam || 0, 0, 1);
    if (steam > 0.02 && this.liquid.visible) {
      this._steamAcc += dt * steam * 26;
      while (this._steamAcc >= 1) {
        this._steamAcc -= 1;
        const a = Math.random() * TAU;
        const r = Math.random() * 1.7;
        pools.steam.spawn(V3(Math.cos(a) * r, surfaceY + 0.06, Math.sin(a) * r), {
          vx: (Math.random() - 0.5) * 0.25, vy: 0.5 + Math.random() * 0.8, vz: (Math.random() - 0.5) * 0.25,
          life: 1.6 + Math.random() * 1.4, size: 0.45 + Math.random() * 0.7, alpha: 0.08 + steam * 0.14, gravity: 0.1, drag: 0.99,
        });
      }
    }

    if (v.feedA > 0.1 || v.feedB > 0.1) {
      this._dropAcc += dt * 16;
      while (this._dropAcc >= 1) {
        this._dropAcc -= 1;
        const isA = v.feedA > 0.1;
        const from = isA ? V3(-1.45, 6.82, 0.7) : V3(1.45, 6.82, 0.85);
        pools.drop.setColor(isA ? (v.tankAColor || 0x9fe8ff) : (v.tankBColor || 0xdff7f4));
        pools.drop.spawn(from, {
          vx: (Math.random() - 0.5) * 0.12, vy: -0.4 - Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.12,
          life: 0.85, size: 0.055 + Math.random() * 0.035, alpha: 0.6, gravity: -9.2, drag: 1,
        });
      }
    }

    if (ventType === 'fire') {
      this._sparkAcc += dt * 50;
      while (this._sparkAcc >= 1) {
        this._sparkAcc -= 1;
        pools.spark.spawn(V3(-0.9 + (Math.random() - 0.5) * 0.3, 7.8, -0.7 + (Math.random() - 0.5) * 0.3), {
          vx: (Math.random() - 0.5) * 1.2, vy: 1.8 + Math.random() * 3, vz: (Math.random() - 0.5) * 1.2,
          life: 0.5 + Math.random() * 0.7, size: 0.05 + Math.random() * 0.12, alpha: 0.85, gravity: -7, drag: 0.98,
        });
      }
      if (this.groups.thermite.visible === false) {
        this._smokeAcc += dt * 10;
        while (this._smokeAcc >= 1) {
          this._smokeAcc -= 1;
          pools.smoke.spawn(V3(-0.9, 8.6, -0.7), {
            vx: (Math.random() - 0.5) * 0.3, vy: 0.9 + Math.random() * 0.7, vz: (Math.random() - 0.5) * 0.3,
            life: 2.4, size: 0.7 + Math.random() * 0.8, alpha: 0.16, gravity: 0.06, drag: 0.995,
          });
        }
      }
    } else if (ventType === 'chlorine' || ventType === 'hcl') {
      this._gasAcc += dt * 32;
      pools.gas.setColor(ventType === 'chlorine' ? 0xd6e66b : 0xe9f3f0);
      while (this._gasAcc >= 1) {
        this._gasAcc -= 1;
        pools.gas.spawn(V3(11.2 + (Math.random() - 0.5) * 0.6, 9.8, -2.6 + (Math.random() - 0.5) * 0.6), {
          vx: (Math.random() - 0.5) * 0.4, vy: 0.55 + Math.random() * 0.7, vz: (Math.random() - 0.5) * 0.4,
          life: 2.1 + Math.random() * 1.2, size: 0.5 + Math.random() * 0.8, alpha: ventType === 'chlorine' ? 0.13 : 0.15, gravity: 0.14, drag: 0.995,
        });
      }
      if (ventType === 'hcl' && (v.mist || 0) > 0.3 && Math.random() < 0.4) {
        pools.steam.spawn(V3(0 + (Math.random() - 0.5) * 2.4, surfaceY + 0.3, (Math.random() - 0.5) * 2.4), {
          vx: 0, vy: 0.4, vz: 0, life: 1.8, size: 0.5, alpha: 0.1, gravity: 0.1, drag: 0.99,
        });
      }
    } else if (ventType === 'acid-mist' || ventType === 'steam') {
      this._steamAcc += dt * 16;
      pools.drop.setColor(ventType === 'acid-mist' ? 0xffe0a0 : 0xe0f5ff);
      while (this._steamAcc >= 1) {
        this._steamAcc -= 1;
        pools.steam.spawn(V3(-0.9, 7.6, -0.7), {
          vx: (Math.random() - 0.5) * 0.5, vy: 0.7 + Math.random() * 0.9, vz: (Math.random() - 0.5) * 0.5,
          life: 1.8, size: 0.45 + Math.random() * 0.6, alpha: ventType === 'acid-mist' ? 0.16 : 0.12, gravity: 0.08, drag: 0.99,
        });
      }
    } else if (ventType === 'smoke') {
      this._smokeAcc += dt * 18;
      while (this._smokeAcc >= 1) {
        this._smokeAcc -= 1;
        pools.smoke.spawn(V3(6.3 + (Math.random() - 0.5) * 0.8, 4.4, -4.6 + (Math.random() - 0.5) * 0.8), {
          vx: (Math.random() - 0.5) * 0.4, vy: 0.7 + Math.random() * 0.8, vz: (Math.random() - 0.5) * 0.4,
          life: 2.6, size: 0.7 + Math.random() * 0.9, alpha: 0.14, gravity: 0.05, drag: 0.995,
        });
      }
    }

    const spray = clamp(v.acidSpray || 0, 0, 1);
    if (spray > 0.05) {
      this._dropAcc += dt * 130 * spray;
      pools.drop.setColor(0xffcf80);
      while (this._dropAcc >= 1) {
        this._dropAcc -= 1;
        const a = Math.random() * TAU;
        const r = Math.random() * 1.45;
        pools.drop.spawn(V3(Math.cos(a) * r, surfaceY + 0.15, Math.sin(a) * r), {
          vx: Math.cos(a) * (1.6 + Math.random() * 2.8), vy: 2.2 + Math.random() * 3.4, vz: Math.sin(a) * (1.6 + Math.random() * 2.8),
          life: 1.25, size: 0.08 + Math.random() * 0.14, alpha: 0.9, gravity: -4.8, drag: 0.99,
        });
      }
      this._steamAcc += dt * 26 * spray;
      while (this._steamAcc >= 1) {
        this._steamAcc -= 1;
        const a = Math.random() * TAU;
        const r = Math.random() * 1.5;
        pools.steam.spawn(V3(Math.cos(a) * r, surfaceY + 0.25, Math.sin(a) * r), {
          vx: (Math.random() - 0.5) * 0.4, vy: 0.8 + Math.random() * 1.1, vz: (Math.random() - 0.5) * 0.4,
          life: 2, size: 0.6 + Math.random() * 0.8, alpha: 0.22, gravity: 0.08, drag: 0.99,
        });
      }
    }

    if ((v.sparks || 0) > 0.03) {
      this._sparkAcc += dt * 70 * clamp(v.sparks || 0, 0, 1.4);
      while (this._sparkAcc >= 1) {
        this._sparkAcc -= 1;
        const a = Math.random() * TAU;
        const r = Math.random() * 0.8;
        pools.spark.spawn(V3(6.3 + Math.cos(a) * r, 3.35, -4.6 + Math.sin(a) * r), {
          vx: Math.cos(a) * (0.6 + Math.random() * 2.4), vy: 1.6 + Math.random() * 4.2, vz: Math.sin(a) * (0.6 + Math.random() * 2.4),
          life: 0.5 + Math.random() * 0.8, size: 0.05 + Math.random() * 0.11, alpha: 0.9, gravity: -8.5, drag: 0.985,
        });
      }
    }

    if (this.flareFlame.visible) {
      this._sparkAcc += dt * 18;
      while (this._sparkAcc >= 1) {
        this._sparkAcc -= 1;
        pools.spark.spawn(V3(13.7 + (Math.random() - 0.5) * 0.4, 14.2, -8.5 + (Math.random() - 0.5) * 0.4), {
          vx: (Math.random() - 0.5) * 0.8, vy: 1.5 + Math.random() * 2, vz: (Math.random() - 0.5) * 0.8,
          life: 0.7, size: 0.05 + Math.random() * 0.08, alpha: 0.7, gravity: -3, drag: 0.99,
        });
      }
    }

    if (snap.phase === 'danger' && this.groups.reactor.visible) {
      this._smokeAcc += dt * 26;
      while (this._smokeAcc >= 1) {
        this._smokeAcc -= 1;
        pools.smoke.spawn(V3((Math.random() - 0.5) * 3, 6.4 + Math.random() * 1.2, (Math.random() - 0.5) * 3), {
          vx: (Math.random() - 0.5) * 0.6, vy: 0.9 + Math.random(), vz: (Math.random() - 0.5) * 0.6,
          life: 2.4, size: 0.8 + Math.random(), alpha: 0.14, gravity: 0.05, drag: 0.99,
        });
      }
    }
  }

  triggerExplosion(kind = 'sodium', intensity = 1) {
    if (!this.explosionGroup) return;
    const isChlorine = kind === 'chlorine';
    const pos = isChlorine ? V3(0, 5.15, 0.9) : V3(0, 5.9, 0.9);
    const coreColor = isChlorine ? 0xf6ffd8 : 0xffcf7a;
    const haloColor = isChlorine ? 0xb8e85a : 0xff6420;
    this.explosionGroup.position.copy(pos);
    this.explosionGroup.visible = true;
    this._explosionT = 0;
    this._explosionIntensity = intensity;
    this.explosionSprites[0].material.color.setHex(coreColor);
    this.explosionSprites[1].material.color.setHex(haloColor);
    this.explosionSprites[0].material.opacity = 1;
    this.explosionSprites[1].material.opacity = 0.7;
    this.shockRingMat.color.setHex(haloColor);
    this.explosionLight.color.setHex(haloColor);
    this.explosionLight.position.copy(pos);
    this._shake = Math.max(this._shake, 1.5 * intensity);
    this.pools.spark.setColor(isChlorine ? 0xd9f08a : 0xffa050);

    for (let i = 0; i < 90; i++) {
      const a = Math.random() * TAU;
      const sp = 3 + Math.random() * 11;
      this.pools.spark.spawn(V3(pos.x + (Math.random() - 0.5) * 1.4, pos.y + (Math.random() - 0.5) * 1.4, pos.z + (Math.random() - 0.5) * 1.4), {
        vx: Math.cos(a) * sp * 0.7, vy: 2 + Math.random() * 8, vz: Math.sin(a) * sp * 0.7,
        life: 0.9 + Math.random() * 1.2, size: 0.09 + Math.random() * 0.22, alpha: 0.95, gravity: -6, drag: 0.97,
      });
    }
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * TAU;
      this.pools.smoke.spawn(V3(pos.x + (Math.random() - 0.5) * 2, pos.y - 0.3 + Math.random() * 1.6, pos.z + (Math.random() - 0.5) * 2), {
        vx: Math.cos(a) * (0.5 + Math.random() * 2), vy: 0.8 + Math.random() * 2, vz: Math.sin(a) * (0.5 + Math.random() * 2),
        life: 2.5 + Math.random() * 1.5, size: 0.9 + Math.random() * 1.5, alpha: 0.22, gravity: 0.06, drag: 0.99,
      });
    }
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * TAU;
      this.pools.drop.spawn(V3(pos.x + (Math.random() - 0.5) * 2, pos.y - 0.3 + Math.random() * 1.5, pos.z + (Math.random() - 0.5) * 2), {
        vx: Math.cos(a) * (1.5 + Math.random() * 5), vy: 1 + Math.random() * 4, vz: Math.sin(a) * (1.5 + Math.random() * 5),
        life: 1.4, size: 0.06 + Math.random() * 0.1, alpha: 0.8, gravity: -8, drag: 0.99,
      });
    }
  }

  _updatePpt(t) {
    if (!this._pptCount) {
      this.ppt.visible = false;
      return;
    }
    this.ppt.visible = true;
    const dummy = this._pptDummy || (this._pptDummy = new THREE.Object3D());
    const bottom = 2.16;
    const surf = this._surfaceY;
    for (let i = 0; i < 300; i++) {
      if (i < this._pptCount) {
        const p = this._pptData[i];
        const fy = (p.fy + t * 0.014 * p.spin) % 1;
        const a = p.a + t * 0.2 * p.spin;
        const r = p.r * (0.9 + 0.1 * Math.sin(t * 0.8 + i));
        dummy.position.set(
          Math.cos(a) * r,
          bottom + 0.14 + fy * Math.max(0.15, surf - bottom - 0.28),
          Math.sin(a) * r
        );
        dummy.rotation.set(a, a * 0.7, 0);
        dummy.scale.setScalar(p.scale * (0.85 + 0.15 * Math.sin(t * 2 + i)));
      } else {
        dummy.position.set(0, -60, 0);
        dummy.scale.setScalar(0.0001);
        dummy.rotation.set(0, 0, 0);
      }
      dummy.updateMatrix();
      this.ppt.setMatrixAt(i, dummy.matrix);
    }
    this.ppt.instanceMatrix.needsUpdate = true;
  }

  _updateBubbles(t) {
    if (!this._bubbleCount || !this.liquid.visible) {
      this.bubbles.visible = false;
      return;
    }
    this.bubbles.visible = true;
    const dummy = this._bubbleDummy || (this._bubbleDummy = new THREE.Object3D());
    const bottom = 2.16;
    const surf = this._surfaceY;
    for (let i = 0; i < 140; i++) {
      if (i < this._bubbleCount) {
        const p = this._bubbleData[i];
        const fy = (p.fy + t * p.speed * 0.16) % 1;
        const a = p.a + t * 0.35;
        dummy.position.set(Math.cos(a) * p.r, bottom + 0.08 + fy * Math.max(0.1, surf - bottom - 0.16), Math.sin(a) * p.r);
        dummy.rotation.set(0, a, 0);
        dummy.scale.setScalar(p.scale * (0.7 + 0.4 * Math.sin(t * 4 + i)));
      } else {
        dummy.position.set(0, -60, 0);
        dummy.scale.setScalar(0.0001);
      }
      dummy.updateMatrix();
      this.bubbles.setMatrixAt(i, dummy.matrix);
    }
    this.bubbles.instanceMatrix.needsUpdate = true;
  }

  _updateExplosion(dt) {
    if (!this.explosionGroup || this._explosionT > 3) {
      if (this.explosionLight) this.explosionLight.intensity = 0;
      return;
    }
    this._explosionT += dt;
    const e = clamp(this._explosionT / 1.9, 0, 1);
    if (e >= 1) {
      this.explosionGroup.visible = false;
      this.explosionLight.intensity = 0;
      this._explosionT = 5;
      return;
    }
    const inten = this._explosionIntensity || 1;
    this.explosionGroup.visible = true;
    const core = this.explosionSprites[0];
    const halo = this.explosionSprites[1];
    const k = 1 - Math.pow(1 - e, 2.4);
    core.scale.setScalar(2 + 9 * k);
    halo.scale.setScalar(3.5 + 15 * k);
    core.material.opacity = Math.pow(1 - e, 1.6);
    halo.material.opacity = Math.pow(1 - e, 1.15) * 0.55;
    this.shockRing.scale.setScalar(1 + 15 * k);
    this.shockRingMat.opacity = Math.pow(1 - e, 0.7) * 0.75;
    const flicker = 0.9 + Math.random() * 0.2;
    this.explosionLight.intensity = Math.pow(1 - e, 2.4) * 520 * inten * flicker;
  }

  focusView(name) {
    const view = this._views[name] || this._views.overview;
    this._camTween = {
      t: 0,
      dur: 1.15,
      fromPos: this.camera.position.clone(),
      toPos: view.pos.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: view.target.clone(),
    };
  }

  render(dt = 0.016) {
    const d = clamp(dt, 0, 0.1);
    this.time += d;
    const t = this.time;
    this.controls.update();

    if (this._camTween) {
      const tw = this._camTween;
      tw.t += d / tw.dur;
      const k = easeInOut(clamp(tw.t, 0, 1));
      this.camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
      this.controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
      this.camera.lookAt(this.controls.target);
      if (tw.t >= 1) this._camTween = null;
    }

    let shake = Math.max(this._shake, (this._visualShake || 0) * 0.8);
    if (shake > 0.002) {
      this.scene.position.set(
        (Math.random() - 0.5) * shake * 0.22,
        (Math.random() - 0.5) * shake * 0.16,
        0
      );
      this._shake *= Math.exp(-d * 2.6);
    } else {
      this.scene.position.set(0, 0, 0);
      this._shake = 0;
    }

    this._agAngle = (this._agAngle || 0) + ((this._agitatorTarget || 0) * 0.055) * d * TAU;
    if (this.agitator) this.agitator.rotation.y = this._agAngle;

    if (this.beakerL && this._phase === 'running') {
      this.beakerL.stirBar.rotation.y = t * 6;
      this.beakerR.stirBar.rotation.y = t * 6;
    }

    this.scrubberFan.rotation.z += d * (this._scrubberActive ? 14 : 1.5);
    this.pumps.forEach((pump, i) => {
      pump.fan.rotation.x += d * ((i === 0 ? this._feedA : this._feedB) ? 24 : 1.4);
      pump.ledMat.color.setHex((i === 0 ? this._feedA : this._feedB) ? 0x35e0c2 : 0x1d3a32);
    });
    this.coolingFans.forEach((fan, i) => {
      fan.rotation.y += d * (this._coolingOn ? 9 + i * 2 : 1);
    });

    const alarm = this._hazardLevel >= 2 || this._phase === 'danger';
    this.beacons.forEach((b) => {
      b.reflector.rotation.y = t * (alarm ? 10 : 0.7);
      b.domeMat.opacity = alarm ? 0.5 + 0.22 * Math.abs(Math.sin(t * 8)) : 0.28;
      b.domeMat.emissive.setHex(alarm ? 0x8a1206 : 0x240402);
    });
    if (this.detectorLedMat) {
      this.detectorLedMat.color.setHex(alarm ? 0xff4b3e : Math.sin(t * 2.4) > 0.4 ? 0x35e0c2 : 0x1c4c42);
    }
    if (this.consoleStatusMats) {
      this.consoleStatusMats[0].color.setHex(alarm ? 0xff4b3e : 0x35e0c2);
      this.consoleStatusMats[1].color.setHex(this._phase === 'running' ? 0xffb84d : 0x2b3a42);
      this.consoleStatusMats[2].color.setHex(this._scrubberActive ? 0x35e0c2 : 0x2b3a42);
    }
    if (this.consoleEStop) this.consoleEStop.material.emissive.setHex(alarm ? 0x6d0f05 : 0x2b0804);

    this.alarmLight.intensity = (this._alarmBase || 0) * (0.55 + 0.45 * Math.abs(Math.sin(t * 7.5)));

    if (this.ventFlame.visible) {
      this.ventFlame.scale.set(0.9 + Math.sin(t * 19) * 0.12, 0.8 + Math.sin(t * 26) * 0.22, 0.9 + Math.cos(t * 21) * 0.12);
    }
    if (this.flareFlame.visible) {
      this.flareFlame.scale.set(1 + Math.sin(t * 12) * 0.06, 0.85 + Math.sin(t * 18) * 0.18, 1 + Math.cos(t * 13) * 0.06);
    }
    if (this.thermiteFlame.visible) {
      this.thermiteFlame.scale.y = 0.8 + Math.sin(t * 17) * 0.16;
      this.thermiteSprite.material.opacity *= 0.96 + 0.04 * Math.sin(t * 21);
    }
    if (this.thermiteSprite.material.opacity > 0.02) {
      const s = 3.1 + Math.sin(t * 9) * 0.25;
      this.thermiteSprite.scale.set(s, s, 1);
    }

    this._updateExplosion(d);
    this._updatePpt(t);
    this._updateBubbles(t);
    Object.values(this.pools).forEach((pool) => pool.update(d, t));
    if (this.dust) this.dust.rotation.y = t * 0.008;
    if (this.farLights) {
      this.farLights.forEach((mat, i) => {
        mat.opacity = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1));
      });
    }

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  resize() {
    const w = this.root.clientWidth || window.innerWidth;
    const h = this.root.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
    const px = this.renderer.getPixelRatio();
    const uScale = (h * px) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    if (this.pools) {
      Object.values(this.pools).forEach((pool) => {
        pool.material.uniforms.uScale.value = uScale;
      });
    }
  }
}
