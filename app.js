/**
 * LKPD Interaktif AR — Bangun Ruang Sisi Datar
 * Kelas VIII SMP — Prisma Segitiga & Limas Segiempat
 *
 * Teknologi: THREE.js (via A-Frame bundle) + AR.js + Vanilla JS
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   CONFIG & CONSTANTS
═══════════════════════════════════════════════════════════ */
const CFG = {
  prisma: {
    s:  0.32,               // sisi segitiga sama sisi
    H:  0.42,               // tinggi prisma
    get R()  { return this.s / Math.sqrt(3); },       // circumradius
    get ri() { return this.s / (2 * Math.sqrt(3)); }, // inradius
    get th() { return this.s * Math.sqrt(3) / 2; },   // tinggi segitiga
  },
  limas: {
    a:  0.38,               // sisi alas persegi
    H:  0.40,               // tinggi limas
    get sl() {              // slant height (tepi ke puncak)
      return Math.sqrt(this.H * this.H + (this.a / 2) * (this.a / 2));
    },
  },
};

// ── Material KACA BENING ──────────────────────────────────
// Semua face menggunakan warna putih-biru pucat (seperti kaca kristal).
// Warna sisi sedikit berbeda agar terlihat depth tanpa mengganggu highlight.
const GLASS_COLOR = 0xDDEEFF;   // putih kebiruan, warna kaca bening

const CLR = {
  prisma: {
    // Semua face sama: kaca bening (putih kebiruan)
    alas:   GLASS_COLOR,
    tutup:  GLASS_COLOR,
    sisi:   [GLASS_COLOR, GLASS_COLOR, GLASS_COLOR],
    // Edge: putih bercahaya seperti tepi kaca terkena cahaya
    edge:   0xAADDFF,
    vertex: 0x00FFEE,
    height: 0xFF6B6B,
  },
  limas: {
    alas:   GLASS_COLOR,
    sisi:   [GLASS_COLOR, GLASS_COLOR, GLASS_COLOR, GLASS_COLOR],
    edge:   0xAADDFF,
    vertex: 0x00FFEE,
    height: 0xFF6B6B,
  },
};

// ── Opacity levels ────────────────────────────────────────
const OPC_DEFAULT = 0.08;  // kaca bening — hampir tidak terlihat bidangnya
const OPC_DIM     = 0.03;  // pudar ekstrem saat ada highlight aktif
const OPC_BRIGHT  = 0.88;  // element yang di-highlight: penuh & jelas

const HL_CLR = { alas: 0xFF6B6B, tutup: 0xFFD700, rusuk: 0x00FF99, titik: 0xFF1493 };

/* ═══════════════════════════════════════════════════════════
   GEOMETRY HELPERS
═══════════════════════════════════════════════════════════ */

/** Buat face mesh dengan efek kaca bening */
function makeFace(netV, foldV, color, isQuad) {
  const T = window.THREE;
  const mat = new T.MeshPhongMaterial({
    color,
    side: T.DoubleSide,
    transparent: true,
    opacity: OPC_DEFAULT,
    depthWrite: false,      // wajib agar layering transparan tidak z-fight
    shininess: 220,         // sangat tinggi → kilap kaca
    specular: new T.Color(0xFFFFFF),  // putih cerah → highlight putih seperti kaca
    emissive: new T.Color(0x112233),  // sedikit biru di gelap → kesan kaca dingin
    emissiveIntensity: 0.15,
  });
  const n = isQuad ? 6 : 3;
  const arr = new Float32Array(n * 3);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(arr, 3));

  const mesh = new T.Mesh(geo, mat);
  mesh.userData = { netV, foldV, isQuad, arr };
  lerpFace(mesh, 1);
  return mesh;
}

function lerpFace(mesh, t) {
  const { netV, foldV, isQuad, arr } = mesh.userData;
  const T = window.THREE;
  const lerped = netV.map((nv, i) => new T.Vector3().lerpVectors(nv, foldV[i], t));

  if (isQuad) {
    // 2 segitiga: v0,v1,v2 dan v0,v2,v3
    const idx = [0,1,2, 0,2,3];
    idx.forEach((vi, i) => {
      arr[i*3]   = lerped[vi].x;
      arr[i*3+1] = lerped[vi].y;
      arr[i*3+2] = lerped[vi].z;
    });
  } else {
    lerped.forEach((v, i) => {
      arr[i*3]=v.x; arr[i*3+1]=v.y; arr[i*3+2]=v.z;
    });
  }
  mesh.geometry.attributes.position.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

/** Buat garis rusuk antara dua titik — edge kaca bercahaya */
function makeEdge(v1, v2, color) {
  const T = window.THREE;
  const geo = new T.BufferGeometry().setFromPoints([v1.clone(), v2.clone()]);
  // Edge utama: warna terang
  const mat = new T.LineBasicMaterial({ color: color || 0xAADDFF });
  return new T.Line(geo, mat);
}

/** Buat edge "glow" tipis menggunakan cylinder kecil sebagai alternatif
 *  agar ada kesan tebal dan bercahaya (THREE.js tidak support linewidth > 1 di WebGL) */
function makeGlowEdge(v1, v2, color) {
  const T = window.THREE;
  const dir  = new T.Vector3().subVectors(v2, v1);
  const len  = dir.length();
  const mid  = new T.Vector3().addVectors(v1, v2).multiplyScalar(0.5);

  const geo = new T.CylinderGeometry(0.004, 0.004, len, 6, 1);
  const mat = new T.MeshBasicMaterial({
    color: color || 0xAADDFF,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const mesh = new T.Mesh(geo, mat);
  mesh.position.copy(mid);

  // Orientasi cylinder mengikuti arah edge
  const axis = new T.Vector3(0, 1, 0);
  mesh.quaternion.setFromUnitVectors(axis, dir.clone().normalize());
  return mesh;
}

/** Buat bola kecil di titik sudut */
function makeVertex(pos, color) {
  const T = window.THREE;
  const geo = new T.SphereGeometry(0.016, 10, 10);
  const mat = new T.MeshPhongMaterial({ color: color || 0xff1493, shininess: 80 });
  const m = new T.Mesh(geo, mat);
  m.position.copy(pos);
  return m;
}

/** Buat label sprite menggunakan canvas texture */
function makeLabel(text, pos, color) {
  const T = window.THREE;
  const c = document.createElement('canvas');
  c.width = 96; c.height = 48;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,.75)';
  ctx.beginPath();
  ctx.roundRect(2, 2, 92, 44, 7);
  ctx.fill();
  ctx.fillStyle = color || '#fff';
  ctx.font = 'bold 26px Outfit,Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 48, 24);

  const tex = new T.CanvasTexture(c);
  const mat = new T.SpriteMaterial({ map: tex, transparent: true });
  const sp  = new T.Sprite(mat);
  sp.position.copy(pos);
  sp.scale.set(0.13, 0.065, 1);
  return sp;
}

/** Buat silinder representasi tinggi */
function makeTinggi(y0, y1, color) {
  const T = window.THREE;
  const h   = Math.abs(y1 - y0);
  const mid = (y0 + y1) / 2;
  const geo = new T.CylinderGeometry(0.009, 0.009, h, 8);
  const mat = new T.MeshPhongMaterial({ color: color || 0xFF6B6B, transparent: true, opacity: .85 });
  const m   = new T.Mesh(geo, mat);
  m.position.y = mid;
  return m;
}

/* ═══════════════════════════════════════════════════════════
   PRISMA SEGITIGA MODEL
═══════════════════════════════════════════════════════════ */
function buildPrisma() {
  const T = window.THREE;
  const { s, H, R, ri, th } = CFG.prisma;

  // ── Vertex 3D ──
  // Bawah: A (depan), B (kiri-belakang), C (kanan-belakang)
  // Atas:  D (depan), E (kiri-belakang), F (kanan-belakang)
  const vA = new T.Vector3(0,    -H/2,  R);
  const vB = new T.Vector3(-s/2, -H/2, -ri);
  const vC = new T.Vector3( s/2, -H/2, -ri);
  const vD = new T.Vector3(0,     H/2,  R);
  const vE = new T.Vector3(-s/2,  H/2, -ri);
  const vF = new T.Vector3( s/2,  H/2, -ri);

  // ── Vertex Net (bidang y=0) ──
  // Strip: [SisiL | SisiBack | SisiR]
  //        Alas (bawah SisiBack), Tutup (atas SisiBack)
  const nB  = new T.Vector3(-s/2, 0, -H/2);
  const nC  = new T.Vector3( s/2, 0, -H/2);
  const nF  = new T.Vector3( s/2, 0,  H/2);
  const nE  = new T.Vector3(-s/2, 0,  H/2);

  const nAL = new T.Vector3(-3*s/2, 0, -H/2);  // A (SisiL outer bawah)
  const nDL = new T.Vector3(-3*s/2, 0,  H/2);  // D (SisiL outer atas)
  const nAR = new T.Vector3( 3*s/2, 0, -H/2);  // A (SisiR outer bawah)
  const nDR = new T.Vector3( 3*s/2, 0,  H/2);  // D (SisiR outer atas)

  const nAa = new T.Vector3(0, 0, -H/2 - th); // apex A (Alas bawah)
  const nDt = new T.Vector3(0, 0,  H/2 + th); // apex D (Tutup atas)

  const clr = CLR.prisma;

  // ── Face Meshes ──
  const fBack  = makeFace([nB.clone(),nC.clone(),nF.clone(),nE.clone()], [vB,vC,vF,vE], clr.alas,    true);
  const fLeft  = makeFace([nAL,nB.clone(),nE.clone(),nDL],               [vA,vB,vE,vD], clr.sisi[0], true);
  const fRight = makeFace([nC.clone(),nAR,nDR,nF.clone()],               [vC,vA,vD,vF], clr.sisi[1], true);
  const fAlas  = makeFace([nC.clone(),nB.clone(),nAa],                   [vC,vB,vA],    clr.alas,    false);
  const fTutup = makeFace([nE.clone(),nF.clone(),nDt],                   [vE,vF,vD],    clr.tutup,   false);

  // ── Edges: Line + Glow Cylinder ──
  const ec = clr.edge;
  const edgePairs = [
    [vA,vB], [vB,vC], [vC,vA],       // bawah
    [vD,vE], [vE,vF], [vF,vD],       // atas
    [vA,vD], [vB,vE], [vC,vF],       // vertikal
  ];
  const edgeLines = edgePairs.map(([a,b]) => makeEdge(a, b, ec));

  // ── Edge Highlights ──
  const edgeHL = edgePairs.map(([a,b]) => {
    const g = new T.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
    const m = new T.LineBasicMaterial({ color: HL_CLR.rusuk });
    const l = new T.Line(g, m); l.visible = false; return l;
  });

  // Glow edge (cylinder kecil bercahaya) — efek tepi kaca
  const glowEdges = edgePairs.map(([a,b]) => makeGlowEdge(a, b, ec));

  // ── Vertex Spheres & Labels ──
  const vs3d   = [vA,vB,vC,vD,vE,vF];
  const vNames = ['A','B','C','D','E','F'];
  const vtxGrp = new T.Group(); vtxGrp.visible = false;
  vs3d.forEach((v, i) => {
    const sp = makeVertex(v, HL_CLR.titik);
    const off = v.clone().normalize().multiplyScalar(0.09);
    const lb  = makeLabel(vNames[i], v.clone().add(off), '#FF1493');
    vtxGrp.add(sp, lb);
  });

  // ── Tinggi ──
  const tGrp = new T.Group(); tGrp.visible = false;
  tGrp.add(makeTinggi(-H/2, H/2, clr.height));
  tGrp.add(makeLabel('t', new T.Vector3(0.07, 0, 0.05), '#FF6B6B'));

  // ── Assemble ──
  const facesGrp = new T.Group();
  facesGrp.add(fBack, fLeft, fRight, fAlas, fTutup);

  const edgesGrp = new T.Group();
  edgeLines.forEach(e => edgesGrp.add(e));
  glowEdges.forEach(e => edgesGrp.add(e));  // tambah glow cylinder

  const edgeHLGrp = new T.Group(); edgeHLGrp.visible = false;
  edgeHL.forEach(e => edgeHLGrp.add(e));

  const grp = new T.Group();
  grp.add(facesGrp, edgesGrp, edgeHLGrp, vtxGrp, tGrp);

  // Semua face menggunakan GLASS_COLOR secara default
  const allFaces  = [fBack, fLeft, fRight, fAlas, fTutup];
  const defColors = allFaces.map(() => GLASS_COLOR);
  const netColors = [clr.alas, clr.sisi[0], clr.sisi[1], clr.alas, clr.tutup];

  return {
    group: grp, type: 'prisma',
    allFaces, defColors, edgesGrp, edgeHLGrp, vtxGrp, tGrp,

    setColorfulMode(isColorful) {
      allFaces.forEach((f, i) => {
        f.material.color.set(isColorful ? netColors[i] : defColors[i]);
        f.material.opacity = isColorful ? 0.92 : OPC_DEFAULT;
        f.material.emissive.set(isColorful ? 0x000000 : 0x112233);
        f.material.emissiveIntensity = isColorful ? 0 : 0.15;
      });
    },

    updateNet(t) {
      allFaces.forEach(f => lerpFace(f, t));
      edgesGrp.visible = (t > 0.85);
    },

    highlight(el) {
      this.resetHL();

      if (el === 'alas') {
        // Redupkan semua sisi tegak
        [fLeft, fRight, fBack].forEach(f => {
          f.material.opacity = OPC_DIM;
        });
        // Highlight alas (bawah) & tutup (atas) dengan warna + penuh
        [fAlas, fTutup].forEach(f => {
          f.material.color.set(HL_CLR.alas);
          f.material.emissive.set(0xFF4444);
          f.material.emissiveIntensity = 0.5;
          f.material.opacity = OPC_BRIGHT;
        });
      }

      if (el === 'tinggi') {
        // Redupkan semua face, tampilkan garis tinggi
        allFaces.forEach(f => { f.material.opacity = OPC_DIM; });
        tGrp.visible = true;
      }

      if (el === 'rusuk') {
        // Redupkan semua face, tampilkan highlight rusuk
        allFaces.forEach(f => { f.material.opacity = OPC_DIM; });
        edgeHLGrp.visible = true;
      }

      if (el === 'titik') {
        // Redupkan semua face, tampilkan titik sudut
        allFaces.forEach(f => { f.material.opacity = OPC_DIM; });
        vtxGrp.visible = true;
      }
    },

    resetHL() {
      allFaces.forEach((f, i) => {
        f.material.color.set(defColors[i]);
        f.material.emissive.set(0);
        f.material.emissiveIntensity = 0;
        f.material.opacity = OPC_DEFAULT;
      });
      edgeHLGrp.visible = false;
      vtxGrp.visible = false;
      tGrp.visible = false;
    },
  };
}

/* ═══════════════════════════════════════════════════════════
   LIMAS SEGIEMPAT MODEL
═══════════════════════════════════════════════════════════ */
function buildLimas() {
  const T = window.THREE;
  const { a, H, sl } = CFG.limas;

  // ── Vertex 3D ──
  const vA = new T.Vector3(-a/2, -H/2, -a/2); // belakang-kiri
  const vB = new T.Vector3( a/2, -H/2, -a/2); // belakang-kanan
  const vC = new T.Vector3( a/2, -H/2,  a/2); // depan-kanan
  const vD = new T.Vector3(-a/2, -H/2,  a/2); // depan-kiri
  const vT = new T.Vector3(0,     H/2,  0);   // puncak

  // ── Vertex Net (bidang y=0) ──
  const nA = new T.Vector3(-a/2, 0, -a/2);
  const nB = new T.Vector3( a/2, 0, -a/2);
  const nC = new T.Vector3( a/2, 0,  a/2);
  const nD = new T.Vector3(-a/2, 0,  a/2);
  const nTAB = new T.Vector3(0,        0, -a/2-sl); // apex SisiAB
  const nTBC = new T.Vector3(a/2+sl,   0,       0); // apex SisiBC
  const nTCD = new T.Vector3(0,        0,  a/2+sl); // apex SisiCD
  const nTDA = new T.Vector3(-a/2-sl,  0,       0); // apex SisiDA

  const clr = CLR.limas;

  const fAlas = makeFace([nA.clone(),nB.clone(),nC.clone(),nD.clone()], [vA,vB,vC,vD], clr.alas, true);
  const fAB   = makeFace([nA.clone(),nB.clone(),nTAB], [vA,vB,vT], clr.sisi[0], false);
  const fBC   = makeFace([nB.clone(),nC.clone(),nTBC], [vB,vC,vT], clr.sisi[1], false);
  const fCD   = makeFace([nC.clone(),nD.clone(),nTCD], [vC,vD,vT], clr.sisi[2], false);
  const fDA   = makeFace([nD.clone(),nA.clone(),nTDA], [vD,vA,vT], clr.sisi[3], false);

  // ── Edges: Line + Glow Cylinder ──
  const ec = clr.edge;
  const edgePairsL = [
    [vA,vB], [vB,vC], [vC,vD], [vD,vA], // alas
    [vA,vT], [vB,vT], [vC,vT], [vD,vT], // lateral
  ];
  const edgeLines = edgePairsL.map(([a,b]) => makeEdge(a, b, ec));

  const edgeHL = edgePairsL.map(([a,b]) => {
    const g = new T.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
    const m = new T.LineBasicMaterial({ color: HL_CLR.rusuk });
    const l = new T.Line(g, m); l.visible = false; return l;
  });

  const glowEdges = edgePairsL.map(([a,b]) => makeGlowEdge(a, b, ec));

  const vtxGrp = new T.Group(); vtxGrp.visible = false;
  [[vA,'A'],[vB,'B'],[vC,'C'],[vD,'D'],[vT,'T']].forEach(([v,n]) => {
    const off = v.clone().normalize().multiplyScalar(0.09);
    if (n === 'T') off.y += 0.06;
    vtxGrp.add(makeVertex(v, HL_CLR.titik), makeLabel(n, v.clone().add(off), '#FF1493'));
  });

  const tGrp = new T.Group(); tGrp.visible = false;
  tGrp.add(makeTinggi(-H/2, H/2, clr.height));
  tGrp.add(makeLabel('t', new T.Vector3(0.06, 0, 0), '#FF6B6B'));

  const facesGrp = new T.Group(); facesGrp.add(fAlas, fAB, fBC, fCD, fDA);
  const edgesGrp = new T.Group();
  edgeLines.forEach(e => edgesGrp.add(e));
  glowEdges.forEach(e => edgesGrp.add(e));  // glow cylinder
  const edgeHLGrp = new T.Group(); edgeHL.forEach(e => edgeHLGrp.add(e));
  edgeHLGrp.visible = false;

  const grp = new T.Group();
  grp.add(facesGrp, edgesGrp, edgeHLGrp, vtxGrp, tGrp);

  const allFaces  = [fAlas, fAB, fBC, fCD, fDA];
  const defColors = allFaces.map(() => GLASS_COLOR);
  const netColors = [clr.alas, ...clr.sisi];

  return {
    group: grp, type: 'limas',
    allFaces, defColors, edgesGrp, edgeHLGrp, vtxGrp, tGrp,

    setColorfulMode(isColorful) {
      allFaces.forEach((f, i) => {
        f.material.color.set(isColorful ? netColors[i] : defColors[i]);
        f.material.opacity = isColorful ? 0.92 : OPC_DEFAULT;
        f.material.emissive.set(isColorful ? 0x000000 : 0x112233);
        f.material.emissiveIntensity = isColorful ? 0 : 0.15;
      });
    },

    updateNet(t) {
      allFaces.forEach(f => lerpFace(f, t));
      edgesGrp.visible = (t > 0.85);
    },

    highlight(el) {
      this.resetHL();

      if (el === 'alas') {
        // Redupkan sisi miring
        [fAB, fBC, fCD, fDA].forEach(f => { f.material.opacity = OPC_DIM; });
        // Highlight alas
        fAlas.material.color.set(HL_CLR.alas);
        fAlas.material.emissive.set(0xFF4444);
        fAlas.material.emissiveIntensity = 0.5;
        fAlas.material.opacity = OPC_BRIGHT;
      }

      if (el === 'tinggi') {
        allFaces.forEach(f => { f.material.opacity = OPC_DIM; });
        tGrp.visible = true;
      }

      if (el === 'rusuk') {
        allFaces.forEach(f => { f.material.opacity = OPC_DIM; });
        edgeHLGrp.visible = true;
      }

      if (el === 'titik') {
        allFaces.forEach(f => { f.material.opacity = OPC_DIM; });
        vtxGrp.visible = true;
      }
    },

    resetHL() {
      allFaces.forEach((f, i) => {
        f.material.color.set(defColors[i]);
        f.material.emissive.set(0);
        f.material.emissiveIntensity = 0;
        f.material.opacity = OPC_DEFAULT;
      });
      edgeHLGrp.visible = false;
      vtxGrp.visible = false;
      tGrp.visible = false;
    },
  };
}

/* ═══════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════ */
const ST = {
  mode:     null,      // 'ar' | 'demo'
  shape:    'prisma',
  scene:    1,
  hl:       'none',
  netT:     1,         // 0=net, 1=3D
  isLaid:   false,
  orientT:  0,         // animasi rebah (0=tegak, 1=rebah)
  orientTarget: 0,
  orientAnim: false,
};

/* ═══════════════════════════════════════════════════════════
   DEMO MODE
═══════════════════════════════════════════════════════════ */
let DR = null; // renderer
let DS = null; // scene
let DC = null; // camera
let DM = {};   // models { prisma, limas }
let DM_cur = null;
let D_raf = null;
let D_drag = { on: false, lx: 0, ly: 0 };
let D_sph  = { th: 0.6, ph: 1.1, r: 1.7 };

function initDemo() {
  const T = window.THREE;
  const cont  = document.getElementById('demo-container');
  const canv  = document.getElementById('demo-canvas');
  cont.style.display = 'block';

  DR = new T.WebGLRenderer({ canvas: canv, antialias: true });
  DR.setPixelRatio(Math.min(devicePixelRatio, 2));
  DR.setSize(innerWidth, innerHeight);
  DR.shadowMap.enabled = true;

  DS = new T.Scene();

  // Lighting
  DS.add(new T.AmbientLight(0xffffff, 0.65));
  const dl = new T.DirectionalLight(0xffffff, 1.3);
  dl.position.set(1.5, 3, 2); DS.add(dl);
  const dl2 = new T.DirectionalLight(0x6666ff, 0.4);
  dl2.position.set(-2, -1, -1); DS.add(dl2);

  // Background & Fog
  DS.background = new T.Color(0x0d0d1a);
  DS.fog = new T.FogExp2(0x0d0d1a, 0.35);

  // Grid dekoratif
  const grid = new T.GridHelper(3, 12, 0x2a2a4a, 0x1a1a3a);
  grid.position.y = -CFG.prisma.H / 2 - 0.02;
  DS.add(grid);

  // Camera
  DC = new T.PerspectiveCamera(52, innerWidth / innerHeight, 0.01, 50);
  moveDemoCamera();

  // Build models
  DM.prisma = buildPrisma();
  DM.limas  = buildLimas();
  DM.limas.group.visible = false;
  DS.add(DM.prisma.group, DM.limas.group);
  DM_cur = DM.prisma;

  // Drag / touch
  setupDrag(canv);

  // Resize
  window.addEventListener('resize', () => {
    DR.setSize(innerWidth, innerHeight);
    DC.aspect = innerWidth / innerHeight;
    DC.updateProjectionMatrix();
  });

  demoLoop();
}

function moveDemoCamera() {
  const { th, ph, r } = D_sph;
  DC.position.set(
    r * Math.sin(ph) * Math.sin(th),
    r * Math.cos(ph),
    r * Math.sin(ph) * Math.cos(th)
  );
  // Geser titik fokus kamera sedikit ke bawah, agar posisi model 3D
  // tampak lebih "naik" di layar dan tidak tertutup UI panel bawah
  DC.lookAt(0, -0.4, 0);
}

let touchStartDist = 0;
let D_sph_r_start = 0;

function setupDrag(el) {
  // Mouse
  el.addEventListener('mousedown',  e => { D_drag = { on:true, lx: e.clientX, ly: e.clientY }; });
  window.addEventListener('mouseup',() => { D_drag.on = false; });
  window.addEventListener('mousemove', e => handleDragMove(e.clientX, e.clientY));

  // Touch
  el.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      D_drag = { on:true, lx: e.touches[0].clientX, ly: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      D_drag.on = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist = Math.hypot(dx, dy);
      D_sph_r_start = D_sph.r;
    }
    e.preventDefault();
  }, { passive: false });
  el.addEventListener('touchend',   () => { D_drag.on = false; });
  el.addEventListener('touchmove',  e => {
    if (e.touches.length === 1 && D_drag.on) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (touchStartDist > 0) {
        // As distance increases, r decreases (zoom in)
        const scale = touchStartDist / dist;
        D_sph.r = Math.max(0.7, Math.min(4, D_sph_r_start * scale));
        moveDemoCamera();
      }
    }
    e.preventDefault();
  }, { passive: false });

  // Scroll (zoom)
  el.addEventListener('wheel', e => {
    D_sph.r = Math.max(0.7, Math.min(4, D_sph.r + e.deltaY * 0.002));
    moveDemoCamera(); e.preventDefault();
  }, { passive: false });
}

function handleDragMove(cx, cy) {
  if (!D_drag.on) return;
  const dx = cx - D_drag.lx, dy = cy - D_drag.ly;
  D_drag.lx = cx; D_drag.ly = cy;

  if (ST.scene === 2 && DM_cur) {
    // Scene 2: rotate model langsung
    DM_cur.group.rotation.y += dx * 0.012;
    DM_cur.group.rotation.x += dy * 0.012;
  } else {
    // Scene lain: orbit camera
    D_sph.th -= dx * 0.008;
    D_sph.ph  = Math.max(0.2, Math.min(Math.PI - 0.2, D_sph.ph - dy * 0.008));
    moveDemoCamera();
  }
}

function demoLoop() {
  D_raf = requestAnimationFrame(demoLoop);
  tickOrient();
  DR.render(DS, DC);
}

/* ═══════════════════════════════════════════════════════════
   AR MODE (A-Frame + AR.js)
═══════════════════════════════════════════════════════════ */
let AM = {};       // AR models
let AM_cur = null;
let arSceneEl = null;

function initAR() {
  document.body.classList.add('ar-active');
  const cont = document.getElementById('ar-container');
  cont.innerHTML = `
    <a-scene embedded arjs="sourceType:webcam; debugUIEnabled:false; detectionMode:mono_and_matrix; matrixCodeType:3x3;" renderer="antialias:true; alpha:true;" vr-mode-ui="enabled:false" loading-screen="enabled:false" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;">
      <a-marker preset="hiro" smooth="true" smoothCount="10" id="ar-hiro">
        <a-entity id="ar-model-cnt" rotation="-90 0 0" scale="0.45 0.45 0.45"></a-entity>
      </a-marker>
      <a-entity camera></a-entity>
    </a-scene>
  `;
  cont.style.display = 'block';

  const scEl = cont.querySelector('a-scene');
  arSceneEl = scEl;

  // Daftarkan ticker agar orientasi ter-animasi
  if (!AFRAME.components['lkpd-ticker']) {
    AFRAME.registerComponent('lkpd-ticker', {
      tick() { tickOrient(); }
    });
  }
  scEl.setAttribute('lkpd-ticker', '');

  scEl.addEventListener('loaded', () => {
    const cnt = document.getElementById('ar-model-cnt');
    AM.prisma = buildPrisma();
    AM.limas  = buildLimas();
    AM.limas.group.visible = false;
    cnt.object3D.add(AM.prisma.group, AM.limas.group);
    AM_cur = AM.prisma;
  });
}

/* ═══════════════════════════════════════════════════════════
   ORIENTASI ANIMATION (REBAH / TEGAK)
═══════════════════════════════════════════════════════════ */
function tickOrient() {
  if (!ST.orientAnim) return;
  const model = _cur();
  if (!model) return;

  const diff = ST.orientTarget - ST.orientT;
  if (Math.abs(diff) < 0.003) {
    ST.orientT = ST.orientTarget; ST.orientAnim = false;
  } else {
    ST.orientT += diff * 0.1;
  }
  model.group.rotation.z = ST.orientT * (Math.PI / 2);
}

/* ═══════════════════════════════════════════════════════════
   APP CONTROLLER
═══════════════════════════════════════════════════════════ */
const App = {

  startAR() {
    if (!window.isSecureContext) {
      alert("⚠️ PERHATIAN:\nBrowser biasanya memblokir akses kamera jika situs tidak diakses menggunakan HTTPS atau localhost (127.0.0.1).\nJika kamera tidak muncul, silakan gunakan koneksi yang aman.");
    }
    document.getElementById('overlay-intro').classList.remove('active');
    document.getElementById('ui-panel').style.display = 'flex';
    document.getElementById('mode-badge').textContent = 'AR';
    ST.mode = 'ar';
    waitThree(() => initAR());
  },

  startDemo() {
    document.getElementById('overlay-intro').classList.remove('active');
    document.getElementById('ui-panel').style.display = 'flex';
    document.getElementById('mode-badge').textContent = 'Demo';
    ST.mode = 'demo';
    waitThree(() => initDemo());
  },

  switchShape(shape) {
    if (ST.shape === shape) return;
    ST.shape = shape;

    document.getElementById('sbtn-prisma').classList.toggle('active', shape === 'prisma');
    document.getElementById('sbtn-limas').classList.toggle('active', shape === 'limas');
    document.getElementById('lbl-alas').innerHTML = shape === 'prisma' ? 'Alas &amp; Tutup' : 'Alas';

    if (ST.mode === 'demo') {
      DM.prisma.group.visible = (shape === 'prisma');
      DM.limas.group.visible  = (shape === 'limas');
      DM_cur = DM[shape];
    } else {
      AM.prisma.group.visible = (shape === 'prisma');
      AM.limas.group.visible  = (shape === 'limas');
      AM_cur = AM[shape];
    }

    App.resetHighlight();
    App.updateNet(100);
    document.getElementById('net-slider').value = 100;

    const m = _cur();
    if (m && m.setColorfulMode) {
      m.setColorfulMode(ST.scene === 3);
    }
  },

  switchScene(n) {
    ST.scene = n;
    [1,2,3].forEach(i => {
      document.getElementById(`tab-${i}`).classList.toggle('active', i === n);
      document.getElementById(`panel-${i}`).style.display = i === n ? '' : 'none';
    });

    // Scene 3 → animasi net
    if (n !== 3) {
      App.updateNet(100);
      document.getElementById('net-slider').value = 100;
    }

    // Reset highlight jika pindah dari scene 1
    if (n !== 1) App.resetHighlight();

    // Reset rotasi manual saat keluar dari scene 2
    if (n !== 2) {
      const m = _cur();
      if (m) { m.group.rotation.x = 0; m.group.rotation.y = 0; }
    }

    const m = _cur();
    if (m && m.setColorfulMode) {
      m.setColorfulMode(n === 3);
    }
  },

  highlightEl(el) {
    const was = ST.hl;
    ['alas','tinggi','rusuk','titik'].forEach(e =>
      document.getElementById(`ebtn-${e}`).classList.remove('active'));

    if (was === el) {
      ST.hl = 'none';
      _cur()?.resetHL();
      return;
    }
    ST.hl = el;
    document.getElementById(`ebtn-${el}`).classList.add('active');
    _cur()?.highlight(el);
  },

  resetHighlight() {
    ST.hl = 'none';
    ['alas','tinggi','rusuk','titik'].forEach(e =>
      document.getElementById(`ebtn-${e}`)?.classList.remove('active'));
    _cur()?.resetHL();
  },

  toggleOrient() {
    ST.isLaid = !ST.isLaid;
    ST.orientTarget = ST.isLaid ? 1 : 0;
    ST.orientAnim   = true;

    const lbl  = document.getElementById('orient-lbl');
    const icon = document.getElementById('orient-icon');
    if (ST.isLaid) { lbl.textContent = 'Tegakkan'; icon.textContent = '↕️'; }
    else           { lbl.textContent = 'Rebahkan'; icon.textContent = '↩️'; }
  },

  updateNet(val) {
    const pct = parseInt(val);
    ST.netT = pct / 100;
    document.getElementById('slider-pct').textContent = pct + '%';
    document.getElementById('net-slider').style.setProperty('--fill', pct + '%');

    const lbl = document.getElementById('slider-state');
    if      (pct === 100) lbl.textContent = 'Bangun 3D penuh';
    else if (pct === 0)   lbl.textContent = 'Jaring-jaring 2D penuh';
    else                  lbl.textContent = `Membuka ${100 - pct}% → ${pct}% terlipat`;

    _cur()?.updateNet(ST.netT);
  },

  showMarker() {
    document.getElementById('modal-marker').classList.add('active');
  },

  hideMarker() {
    document.getElementById('modal-marker').classList.remove('active');
  },

  goBack() {
    if (ST.mode === 'demo') {
      if (D_raf) cancelAnimationFrame(D_raf);
      document.getElementById('demo-container').style.display = 'none';
      // Bersihkan renderer
      if (DR) { DR.dispose(); DR = null; }
      DS = null; DC = null; DM = {}; DM_cur = null;
    }
    if (ST.mode === 'ar') {
      if (arSceneEl) { arSceneEl.remove(); arSceneEl = null; }
      document.getElementById('ar-container').style.display = 'none';
      document.body.classList.remove('ar-active');
      AM = {}; AM_cur = null;
    }

    ST.mode = null; ST.shape = 'prisma'; ST.scene = 1;
    ST.hl = 'none'; ST.netT = 1; ST.isLaid = false;
    ST.orientT = 0; ST.orientTarget = 0; ST.orientAnim = false;

    document.getElementById('ui-panel').style.display = 'none';
    document.getElementById('overlay-intro').classList.add('active');

    // Reset tab & panel
    [1,2,3].forEach(i => {
      document.getElementById(`tab-${i}`)?.classList.toggle('active', i === 1);
      document.getElementById(`panel-${i}`).style.display = i === 1 ? '' : 'none';
    });
    document.getElementById('sbtn-prisma').classList.add('active');
    document.getElementById('sbtn-limas').classList.remove('active');
    document.getElementById('net-slider').value = 100;
    document.getElementById('slider-pct').textContent = '100%';
    document.getElementById('orient-lbl').textContent = 'Rebahkan';
    document.getElementById('orient-icon').textContent = '↩️';
  },
};

/* ═══════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════ */
function _cur() {
  if (ST.mode === 'demo') return DM_cur;
  if (ST.mode === 'ar')   return AM_cur;
  return null;
}

function waitThree(fn) {
  if (window.THREE) { fn(); return; }
  const id = setInterval(() => { if (window.THREE) { clearInterval(id); fn(); } }, 80);
}

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[LKPD AR] App ready. A-Frame:', !!window.AFRAME, '| THREE:', !!window.THREE);
});
