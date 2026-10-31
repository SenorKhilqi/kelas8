/**
 * AnimStudio - Simulasi Animasi Interaktif Cara Menggambar Bangun Ruang 3D
 * Kelas VIII SMP — Prisma Segitiga & Limas Segiempat
 *
 * Menggabungkan:
 * 1. 2D Interactive Drafting Canvas: Mensimulasikan gambar pensil & mistar
 *    pada buku berpetak (garis nyata, garis putus-putus, diagonal, tinggi).
 * 2. 3D WebGL Three.js: Model 3D interaktif yang dapat diputar 360° bebas
 *    untuk memverifikasi sudut proyeksi & alasan rusuk belakang digambar putus-putus.
 */

'use strict';

const AnimStudio = {
  shape: 'prisma', // 'prisma' | 'limas'
  progress: 0,     // 0.0 to 1.0
  isPlaying: false,
  playbackSpeed: 1, // 0.5, 1, 2
  animFrameId: null,
  lastTimestamp: 0,
  duration: 16000, // 16 seconds for full cycle at 1x

  // Canvases & Contexts
  canvas2D: null,
  ctx2D: null,
  container3D: null,
  renderer3D: null,
  scene3D: null,
  camera3D: null,
  modelGroup3D: null,
  isPointerDown: false,
  pointerPrev: { x: 0, y: 0 },
  rot3D: { x: 0.25, y: -0.45 },
  autoRotateSpeed: 0.007,

  // 5 Stages Menggambar Bangun Ruang Geometri 3D
  stages: [
    { id: 1, min: 0.00, max: 0.25, name: '1. Menggambar Bidang Alas', icon: '📐' },
    { id: 2, min: 0.25, max: 0.50, name: '2. Menarik Rusuk Tegak / Tinggi', icon: '📏' },
    { id: 3, min: 0.50, max: 0.72, name: '3. Menghubungkan Tutup / Puncak', icon: '✏️' },
    { id: 4, min: 0.72, max: 0.88, name: '4. Garis Nyata vs Putus-Putus', icon: '🔍' },
    { id: 5, min: 0.88, max: 1.00, name: '5. Notasi Titik Sudut & Ukuran', icon: '✨' }
  ],

  init() {
    this.canvas2D = document.getElementById('anim-canvas-2d');
    if (!this.canvas2D) return;
    this.ctx2D = this.canvas2D.getContext('2d');
    this.container3D = document.getElementById('anim-canvas-3d-wrap');

    this.init3D();
    this.initControls();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    // Set initial shape from URL or active tab
    const urlParams = new URLSearchParams(window.location.search);
    const qShape = urlParams.get('shape');
    this.setShape(qShape === 'limas' ? 'limas' : 'prisma');

    // Mulai dari progress 0.04 agar pensil, penggaris, dan titik awal langsung terlihat
    this.setProgress(0.04);

    setTimeout(() => this.handleResize(), 60);
    setTimeout(() => this.handleResize(), 300);
  },

  handleResize() {
    if (!this.canvas2D) return;
    const rect = this.canvas2D.parentElement.getBoundingClientRect();
    const w = rect.width || 640;
    const h = rect.height || 440;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas2D.width = Math.floor(w * dpr);
    this.canvas2D.height = Math.floor(h * dpr);
    this.canvas2D.style.width = w + 'px';
    this.canvas2D.style.height = h + 'px';
    this.ctx2D.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.renderer3D && this.camera3D) {
      this.renderer3D.setSize(w, h);
      this.camera3D.aspect = w / h;
      this.camera3D.updateProjectionMatrix();
    }
    this.render();
  },

  setShape(shape) {
    this.shape = shape;
    this.build3DVerificationModel();
    this.updateUI();
    this.render();
  },

  setProgress(p) {
    this.progress = Math.max(0, Math.min(1, p));
    this.updateUI();
    this.render();
  },

  setStage(stageNum) {
    const s = this.stages.find(st => st.id === stageNum);
    if (s) {
      this.setProgress(s.min + 0.005);
    }
  },

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const playBtn = document.getElementById('anim-btn-play');
    if (playBtn) {
      playBtn.innerHTML = this.isPlaying ? '<span>⏸️ Jeda</span>' : '<span>▶️ Putar Animasi</span>';
      playBtn.classList.toggle('active', this.isPlaying);
    }
    if (this.isPlaying) {
      this.lastTimestamp = performance.now();
      this.loop(performance.now());
    } else {
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    }
  },

  loop(now) {
    if (!this.isPlaying) return;
    const dt = now - this.lastTimestamp;
    this.lastTimestamp = now;

    const deltaProgress = (dt / this.duration) * this.playbackSpeed;
    let nextP = this.progress + deltaProgress;
    if (nextP > 1) {
      nextP = 0; // loop back to beginning
    }
    this.progress = nextP;
    this.updateUI();
    this.render();

    this.animFrameId = requestAnimationFrame(t => this.loop(t));
  },

  // ── Three.js 3D Setup (Untuk Verifikasi Perspektif 360°) ──
  init3D() {
    if (!window.THREE || !this.container3D) return;
    const T = window.THREE;

    this.scene3D = new T.Scene();
    const rect = this.container3D.getBoundingClientRect();
    this.camera3D = new T.PerspectiveCamera(45, (rect.width || 600) / (rect.height || 420), 0.1, 100);
    this.camera3D.position.set(0, 1.8, 4.2);
    this.camera3D.lookAt(0, 0, 0);

    this.renderer3D = new T.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer3D.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer3D.setSize(rect.width || 600, rect.height || 420);
    this.container3D.appendChild(this.renderer3D.domElement);

    // Lights
    const ambLight = new T.AmbientLight(0xffffff, 0.85);
    this.scene3D.add(ambLight);

    const dirLight1 = new T.DirectionalLight(0x4ECDC4, 0.9);
    dirLight1.position.set(4, 7, 4);
    this.scene3D.add(dirLight1);

    const dirLight2 = new T.DirectionalLight(0xFF6B6B, 0.7);
    dirLight2.position.set(-4, -5, -3);
    this.scene3D.add(dirLight2);

    this.modelGroup3D = new T.Group();
    this.scene3D.add(this.modelGroup3D);

    // Interactive Orbit Touch/Drag
    const dom = this.container3D;
    dom.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true;
      this.pointerPrev = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown) return;
      const dx = e.clientX - this.pointerPrev.x;
      const dy = e.clientY - this.pointerPrev.y;
      this.rot3D.y += dx * 0.008;
      this.rot3D.x = Math.max(-1.1, Math.min(1.1, this.rot3D.x + dy * 0.008));
      this.pointerPrev = { x: e.clientX, y: e.clientY };
      if (!this.isPlaying) this.render();
    });
    window.addEventListener('pointerup', () => { this.isPointerDown = false; });
  },

  build3DVerificationModel() {
    if (!this.modelGroup3D || !window.THREE) return;
    const T = window.THREE;

    while (this.modelGroup3D.children.length > 0) {
      this.modelGroup3D.remove(this.modelGroup3D.children[0]);
    }

    const matFace = new T.MeshPhongMaterial({
      color: 0x4ECDC4,
      side: T.DoubleSide,
      transparent: true,
      opacity: 0.35,
      shininess: 90
    });
    const matTop = new T.MeshPhongMaterial({
      color: 0xFFD93D,
      side: T.DoubleSide,
      transparent: true,
      opacity: 0.45,
      shininess: 90
    });
    const matEdge = new T.LineBasicMaterial({ color: 0x00FFEE, linewidth: 2.5 });

    if (this.shape === 'prisma') {
      // PRISMA SEGITIGA ABC.DEF SESUAI GAMBAR ACUAN
      // BC = 8 cm, AB = AC = 5 cm, Tinggi t = 30 cm (skala model: w=1.6, d=0.6, h=2.2)
      const w = 1.6;
      const h = 2.0;
      const d = 0.7;

      // Geometri prisma segitiga
      const geom = new T.BufferGeometry();
      // Titik Bawah: C(-w/2, -h/2, d/2), B(w/2, -h/2, d/2), A(0, -h/2, -d/2)
      // Titik Atas:  F(-w/2, h/2, d/2),  E(w/2, h/2, d/2),  D(0, h/2, -d/2)
      const pC = [-w / 2, -h / 2, d / 2];
      const pB = [w / 2, -h / 2, d / 2];
      const pA = [0, -h / 2, -d / 2];
      const pF = [-w / 2, h / 2, d / 2];
      const pE = [w / 2, h / 2, d / 2];
      const pD = [0, h / 2, -d / 2];

      const vertices = new Float32Array([
        // Alas (C, B, A)
        ...pC, ...pB, ...pA,
        // Tutup (F, D, E)
        ...pF, ...pD, ...pE,
        // Sisi Depan BCEF
        ...pC, ...pF, ...pB,
        ...pB, ...pF, ...pE,
        // Sisi Kiri ACFD
        ...pA, ...pD, ...pC,
        ...pC, ...pD, ...pF,
        // Sisi Kanan ABED
        ...pB, ...pE, ...pA,
        ...pA, ...pE, ...pD
      ]);

      geom.setAttribute('position', new T.BufferAttribute(vertices, 3));
      geom.computeVertexNormals();

      const mesh = new T.Mesh(geom, matFace);
      this.modelGroup3D.add(mesh);

      // Edges wireframe
      const edges = new T.EdgesGeometry(geom);
      const line = new T.LineSegments(edges, matEdge);
      this.modelGroup3D.add(line);

    } else {
      // LIMAS SEGIEMPAT T.ABCD
      const a = 1.5;
      const H = 1.8;

      // Alas persegi di y = -H/2
      // Titik puncak T di y = H/2
      const geom = new T.ConeGeometry(a * 0.707, H, 4, 1);
      geom.rotateY(Math.PI / 4);

      const mesh = new T.Mesh(geom, matFace);
      this.modelGroup3D.add(mesh);

      const edges = new T.EdgesGeometry(geom);
      const line = new T.LineSegments(edges, matEdge);
      this.modelGroup3D.add(line);

      // Garis tinggi di tengah (OT)
      const lineGeom = new T.BufferGeometry().setFromPoints([
        new T.Vector3(0, -H / 2, 0),
        new T.Vector3(0, H / 2, 0)
      ]);
      const lineMat = new T.LineDashedMaterial({ color: 0xFFD93D, dashSize: 0.1, gapSize: 0.05 });
      const heightLine = new T.Line(lineGeom, lineMat);
      heightLine.computeLineDistances();
      this.modelGroup3D.add(heightLine);
    }
  },

  // ── Render Director ──
  render() {
    const p = this.progress;

    // Mode tampilan:
    // 0.00 - 0.72: Gambar langkah demi langkah di buku berpetak (2D Drafting)
    // 0.72 - 0.88: Penegasan garis nyata vs putus-putus
    // 0.88 - 1.00: Model 3D interaktif yang dapat diputar 360° untuk verifikasi
    const is3DActive = (p >= 0.88);

    if (this.canvas2D && this.container3D) {
      this.canvas2D.style.display = is3DActive ? 'none' : 'block';
      this.container3D.style.display = is3DActive ? 'block' : 'none';
    }

    const hintBadge = document.getElementById('anim-hint-badge');
    if (hintBadge) {
      hintBadge.style.opacity = is3DActive ? '1' : '0.4';
    }

    if (!is3DActive) {
      this.render2DDrafting(p);
    } else {
      this.render3DModel(p);
    }
  },

  // ── Render 2D Canvas (Drafting di Buku Tulis Berpetak) ──
  render2DDrafting(p) {
    if (!this.ctx2D || !this.canvas2D) return;
    const ctx = this.ctx2D;
    const rect = this.canvas2D.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Gambar Lembar Buku Berpetak (Grid Notebook Paper)
    this.drawGridNotebook(ctx, w, h);

    // 2. Pusat koordinat
    const cx = w / 2;
    const cy = h / 2;

    if (this.shape === 'prisma') {
      this.drawPrismaDrafting(ctx, cx, cy, p, w, h);
    } else {
      this.drawLimasDrafting(ctx, cx, cy, p, w, h);
    }
  },

  drawGridNotebook(ctx, w, h) {
    ctx.save();
    // Background kertas buku tulis gelap bernuansa matematika
    ctx.fillStyle = '#0f1026';
    ctx.fillRect(0, 0, w, h);

    // Garis petak milimeter (grid kotak)
    ctx.strokeStyle = 'rgba(108, 99, 255, 0.1)';
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Grid utama setiap 5 kotak (100 px)
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.16)';
    ctx.lineWidth = 1.2;
    for (let x = 0; x < w; x += step * 5) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step * 5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Header Kertas Buku Berpetak
    const margin = 20;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);

    ctx.fillStyle = 'rgba(165, 165, 200, 0.6)';
    ctx.font = '10px Outfit, sans-serif';
    ctx.fillText('BUKU TULIS BERPETAK — LEMBAR PROYEKSI RUANG 3D', margin + 12, margin + 16);
    ctx.restore();
  },

  // ── DRAWING PRISMA SEGITIGA ABC.DEF PADA BUKU BERPETAK ──
  drawPrismaDrafting(ctx, cx, cy, p, w, h) {
    const availH = h - 80;
    const availW = w - 60;

    // Prisma tinggi dan gagah sesuai proporsi gambar acuan (8 cm x 30 cm)
    const H = Math.max(250, Math.min(availH * 0.72, 320));
    const wFront = Math.max(160, Math.min(availW * 0.65, 220));
    const dY = Math.max(35, Math.min(wFront * 0.28, 48));

    const topY = cy - H / 2 + dY / 2;
    const botY = topY + H;

    // Titik-titik sudut Prisma Segitiga ABC.DEF:
    // Garis BC di depan bawah, Titik A berada NAIK DI ATAS rusuk BC
    const pts = {
      C: { x: cx - wFront / 2,      y: botY,       name: 'C' },
      B: { x: cx + wFront / 2,      y: botY,       name: 'B' },
      A: { x: cx,                   y: botY - dY,  name: 'A' },

      F: { x: cx - wFront / 2,      y: topY,       name: 'F' },
      E: { x: cx + wFront / 2,      y: topY,       name: 'E' },
      D: { x: cx,                   y: topY - dY,  name: 'D' }
    };

    const segments = [
      { p1: pts.C, p2: pts.B, color: '#00FFEE', width: 3.5, desc: 'Langkah 1: Tarik rusuk alas depan mendatar Titik C → Titik B (8 cm, Garis Nyata)' },
      { p1: pts.C, p2: pts.A, color: '#FFD93D', width: 2.5, dash: [7, 5], desc: 'Langkah 2: Tarik rusuk alas belakang miring naik Titik C → Titik A (5 cm, Garis Putus-Putus)' },
      { p1: pts.B, p2: pts.A, color: '#FFD93D', width: 2.5, dash: [7, 5], desc: 'Langkah 3: Tarik rusuk alas belakang miring naik Titik B → Titik A (5 cm, Garis Putus-Putus)' },

      { p1: pts.C, p2: pts.F, color: '#00FFEE', width: 3.5, desc: 'Langkah 4: Tarik rusuk tegak depan kiri Titik C → Titik F (30 cm, Garis Nyata)' },
      { p1: pts.B, p2: pts.E, color: '#00FFEE', width: 3.5, desc: 'Langkah 5: Tarik rusuk tegak depan kanan Titik B → Titik E (30 cm, Garis Nyata)' },
      { p1: pts.A, p2: pts.D, color: '#FF6B6B', width: 2.5, dash: [7, 5], desc: 'Langkah 6: Tarik rusuk tegak belakang vertikal lurus Titik A → Titik D (30 cm, Garis Putus-Putus)' },

      { p1: pts.F, p2: pts.E, color: '#00FFEE', width: 3.5, desc: 'Langkah 7: Hubungkan rusuk tutup depan Titik F → Titik E (8 cm, Garis Nyata)' },
      { p1: pts.F, p2: pts.D, color: '#00FFEE', width: 3.5, desc: 'Langkah 8: Hubungkan rusuk tutup Titik F → Titik D (5 cm, Garis Nyata)' },
      { p1: pts.E, p2: pts.D, color: '#00FFEE', width: 3.5, desc: 'Langkah 9: Hubungkan rusuk tutup Titik E → Titik D (5 cm, Garis Nyata)' }
    ];

    ctx.save();

    // Shading lembut bidang setelah tahap 3 selesai (p >= 0.70)
    if (p >= 0.70) {
      const alpha = Math.min(1, (p - 0.70) / 0.15);

      // Bidang Depan BCEF
      ctx.fillStyle = `rgba(78, 205, 196, ${0.14 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(pts.C.x, pts.C.y);
      ctx.lineTo(pts.B.x, pts.B.y);
      ctx.lineTo(pts.E.x, pts.E.y);
      ctx.lineTo(pts.F.x, pts.F.y);
      ctx.closePath();
      ctx.fill();

      // Bidang Tutup DEF
      ctx.fillStyle = `rgba(255, 217, 61, ${0.18 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(pts.F.x, pts.F.y);
      ctx.lineTo(pts.E.x, pts.E.y);
      ctx.lineTo(pts.D.x, pts.D.y);
      ctx.closePath();
      ctx.fill();
    }

    // Gambar segmen garis dari titik ke titik
    const drawP = Math.min(1, p / 0.72);
    this.drawPointToPoint(ctx, segments, drawP, 'pencil');

    // Label dimensi bersih
    const drawCleanBadge = (text, bx, by, align, color) => {
      ctx.save();
      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      const m = ctx.measureText(text);
      const padX = 8, padY = 4;
      const bw = m.width + padX * 2;
      const bh = 22;
      let rx = bx;
      if (align === 'center') rx = bx - bw / 2;
      else if (align === 'right') rx = bx - bw;
      const ry = by - bh / 2;

      ctx.fillStyle = 'rgba(10, 12, 28, 0.88)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rx, ry, bw, bh, 6);
      else ctx.rect(rx, ry, bw, bh);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color || '#FFFFFF';
      ctx.fillText(text, bx, by);
      ctx.restore();
    };

    if (drawP >= 0.10) {
      drawCleanBadge('8 cm', cx, botY + 16, 'center', '#00FFEE');
    }
    if (drawP >= 0.30) {
      drawCleanBadge('5 cm', cx + wFront * 0.25, botY - dY * 0.45, 'left', '#FFD93D');
    }
    if (drawP >= 0.50) {
      drawCleanBadge('30 cm', cx + wFront / 2 + 16, (topY + botY) / 2, 'left', '#FFFFFF');
    }

    ctx.restore();
  },

  // ── DRAWING LIMAS SEGIEMPAT T.ABCD PADA BUKU BERPETAK ──
  drawLimasDrafting(ctx, cx, cy, p, w, h) {
    const availH = h - 90;
    const availW = w - 70;

    // Dimensi responsif besar di mobile maupun desktop
    const H      = Math.max(200, Math.min(availH * 0.65, 250));
    const aFront = Math.max(160, Math.min(availW * 0.65, 230));
    const dX     = Math.round(aFront * 0.38);
    const dY     = Math.round(aFront * 0.30);

    const botY = cy + H / 2 - 10;

    // Titik-titik sudut Limas Segiempat T.ABCD:
    const pts = {
      A: { x: cx - aFront / 2 - 10,     y: botY,              name: 'A' },
      B: { x: cx + aFront / 2 - dX / 2, y: botY,              name: 'B' },
      C: { x: cx + aFront / 2 + dX / 2, y: botY - dY,         name: 'C' },
      D: { x: cx - aFront / 2 + dX / 2, y: botY - dY,         name: 'D' },
      O: { x: cx,                       y: botY - dY / 2,     name: 'O' },
      T: { x: cx,                       y: botY - dY / 2 - H, name: 'T' }
    };

    const segments = [
      { p1: pts.A, p2: pts.B, color: '#00FFEE', width: 3.5, desc: 'Langkah 1: Gambar rusuk alas depan Titik A → Titik B (8 cm, Garis Nyata)' },
      { p1: pts.B, p2: pts.C, color: '#00FFEE', width: 3.5, desc: 'Langkah 2: Gambar rusuk samping kanan Titik B → Titik C (8 cm, Garis Nyata)' },
      { p1: pts.C, p2: pts.D, color: '#4ECDC4', width: 2.5, dash: [7, 5], desc: 'Langkah 3: Gambar rusuk alas belakang Titik C → Titik D (8 cm, Garis Putus-Putus)' },
      { p1: pts.D, p2: pts.A, color: '#4ECDC4', width: 2.5, dash: [7, 5], desc: 'Langkah 4: Gambar rusuk alas samping kiri Titik D → Titik A (8 cm, Garis Putus-Putus)' },

      { p1: pts.A, p2: pts.C, color: 'rgba(255,255,255,0.4)', width: 1.5, dash: [4, 4], desc: 'Langkah 5: Tarik diagonal bantu Titik A → Titik C' },
      { p1: pts.B, p2: pts.D, color: 'rgba(255,255,255,0.4)', width: 1.5, dash: [4, 4], desc: 'Langkah 6: Tarik diagonal bantu Titik B → Titik D (bertemu di Titik Pusat O)' },

      { p1: pts.O, p2: pts.T, color: '#FFD93D', width: 2.5, dash: [6, 4], desc: 'Langkah 7: Dari pusat O, tarik garis tinggi vertikal tegak lurus ke Titik Puncak T (10 cm)' },

      { p1: pts.T, p2: pts.A, color: '#00FFEE', width: 3.5, desc: 'Langkah 8: Hubungkan Puncak T → Sudut A (Garis Nyata Tampak Depan Kiri)' },
      { p1: pts.T, p2: pts.B, color: '#00FFEE', width: 3.5, desc: 'Langkah 9: Hubungkan Puncak T → Sudut B (Garis Nyata Tampak Depan Tengah)' },
      { p1: pts.T, p2: pts.C, color: '#00FFEE', width: 3.5, desc: 'Langkah 10: Hubungkan Puncak T → Sudut C (Garis Nyata Tampak Samping Kanan)' },
      { p1: pts.T, p2: pts.D, color: '#FF6B6B', width: 2.5, dash: [7, 5], desc: 'Langkah 11: Hubungkan Puncak T → Sudut D (Garis Putus-Putus Terhalang Belakang)' }
    ];

    ctx.save();

    // Shading lembut sisi depan TAB dan TBC setelah selesai ditarik (p >= 0.70)
    if (p >= 0.70) {
      const alpha = Math.min(1, (p - 0.70) / 0.15);

      ctx.fillStyle = `rgba(255, 107, 107, ${0.2 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(pts.T.x, pts.T.y);
      ctx.lineTo(pts.A.x, pts.A.y);
      ctx.lineTo(pts.B.x, pts.B.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = `rgba(255, 107, 107, ${0.12 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(pts.T.x, pts.T.y);
      ctx.lineTo(pts.B.x, pts.B.y);
      ctx.lineTo(pts.C.x, pts.C.y);
      ctx.closePath();
      ctx.fill();
    }

    const drawP = Math.min(1, p / 0.72);
    this.drawPointToPoint(ctx, segments, drawP, 'pencil');

    // Label dimensi bersih
    if (drawP >= 0.15) {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('a = 8 cm', (pts.A.x + pts.B.x) / 2, botY + 14);
      ctx.restore();
    }

    if (drawP >= 0.55) {
      ctx.save();
      ctx.fillStyle = '#FFD93D';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('t = 10 cm', pts.O.x + 10, (pts.O.y + pts.T.y) / 2);
      ctx.restore();
    }

    ctx.restore();
  },

  // ── CORE ENGINE: PENARIKAN GARIS TITIK KE TITIK (POINT-TO-POINT) ──
  drawPointToPoint(ctx, segments, t, tool = 'pencil') {
    if (!segments || segments.length === 0) return null;

    const totalSegs = segments.length;
    const currentProgress = Math.max(0, Math.min(1, t));
    const globalPos = currentProgress * totalSegs;
    const activeIndex = Math.min(Math.floor(globalPos), totalSegs - 1);
    const segFraction = globalPos - activeIndex;

    const visitedVertices = new Map();
    let currentTip = null;
    let activeDesc = '';

    // 1. Gambar seluruh segmen garis
    for (let i = 0; i <= activeIndex; i++) {
      const seg = segments[i];
      const p1 = seg.p1;
      const p2 = seg.p2;

      visitedVertices.set(p1.name, p1);

      ctx.save();
      ctx.strokeStyle = seg.color || '#00FFEE';
      ctx.lineWidth = seg.width || 3;
      if (seg.dash) ctx.setLineDash(seg.dash);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);

      if (i < activeIndex || currentProgress >= 1) {
        // Segmen sudah selesai penuh
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        visitedVertices.set(p2.name, p2);

        // Tampilkan label panjang ukuran di tengah garis
        if (seg.label && currentProgress > 0.3) {
          this.drawSegmentLabel(ctx, p1, p2, seg.label);
        }
      } else {
        // Segmen aktif yang sedang ditarik pensil
        const curX = p1.x + (p2.x - p1.x) * segFraction;
        const curY = p1.y + (p2.y - p1.y) * segFraction;
        ctx.lineTo(curX, curY);
        ctx.stroke();

        currentTip = { x: curX, y: curY, from: p1, to: p2, seg };
        activeDesc = seg.desc || `Menarik garis: ${p1.name} → ${p2.name}`;

        // Gambar mistar penggaris di bawah garis yang sedang ditarik
        this.drawActiveRuler(ctx, p1, p2, curX, curY);
      }
      ctx.restore();
    }

    // 2. Gambar titik-titik sudut (vertices) yang sudah terhubung
    visitedVertices.forEach((pt) => {
      this.drawVertexDot(ctx, pt.x, pt.y, pt.name, '#00FFEE');
    });

    // 3. Gambar pensil di ujung garis yang sedang ditarik
    if (currentTip && currentProgress < 1) {
      this.drawPencilCursor(ctx, currentTip.x, currentTip.y, activeDesc, currentTip.from, currentTip.to);
    }

    return currentTip;
  },

  drawVertexDot(ctx, x, y, name, color = '#00FFEE') {
    ctx.save();
    // Halo glow di titik
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    // Lingkaran luar titik
    ctx.fillStyle = '#0d0d1a';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Titik pusat putih
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Nama Titik Huruf Kapital (A, B, C, ...)
    ctx.shadowBlur = 0;
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillStyle = '#FFD93D';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(name, x, y - 9);
    ctx.restore();
  },

  drawActiveRuler(ctx, p1, p2, curX, curY) {
    ctx.save();
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 10) { ctx.restore(); return; }

    const angle = Math.atan2(dy, dx);
    ctx.translate(p1.x, p1.y);
    ctx.rotate(angle);

    // Badan penggaris mistar bening transparan
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.45)';
    ctx.lineWidth = 1;
    ctx.fillRect(0, 5, len, 22);
    ctx.strokeRect(0, 5, len, 22);

    // Garis milimeter skala penggaris
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    for (let d = 0; d <= len; d += 8) {
      const h = (d % 24 === 0) ? 10 : 5;
      ctx.beginPath();
      ctx.moveTo(d, 5);
      ctx.lineTo(d, 5 + h);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawPencilCursor(ctx, x, y, desc, p1, p2) {
    ctx.save();
    // Titik kontak pensil (glowing spark)
    ctx.shadowColor = '#00FFEE';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#00FFEE';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Ikon pensil di ujung garis
    ctx.shadowBlur = 0;
    ctx.font = '24px Outfit, sans-serif';
    ctx.fillText('✏️', x + 2, y - 4);

    // Tooltip informasi penarikan garis dari titik ke titik
    if (desc) {
      const boxW = Math.max(170, desc.length * 7.5);
      const boxH = 26;
      const dpr = window.devicePixelRatio || 1;
      const canvasW = ctx.canvas.width / dpr;
      const boxX = Math.min(x + 28, canvasW - boxW - 12);
      const boxY = Math.max(12, y - 28);

      ctx.fillStyle = 'rgba(13, 13, 26, 0.94)';
      ctx.strokeStyle = 'rgba(255, 217, 61, 0.75)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 6);
      else ctx.rect(boxX, boxY, boxW, boxH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFD93D';
      ctx.font = 'bold 10px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(desc, boxX + 8, boxY + boxH / 2);
    }
    ctx.restore();
  },

  drawSegmentLabel(ctx, p1, p2, text) {
    ctx.save();
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    ctx.translate(mx, my);
    const normAngle = (angle > Math.PI / 2 || angle < -Math.PI / 2) ? angle + Math.PI : angle;
    ctx.rotate(normAngle);

    ctx.fillStyle = 'rgba(13, 13, 26, 0.75)';
    ctx.fillRect(-24, -18, 48, 14);

    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 9px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, -11);
    ctx.restore();
  },

  // ── Render 3D Model Verification ──
  render3DModel(p) {
    if (!this.renderer3D || !this.scene3D || !this.camera3D) return;

    if (p >= 0.88) {
      this.rot3D.y += this.autoRotateSpeed;
    }

    this.modelGroup3D.rotation.x = this.rot3D.x;
    this.modelGroup3D.rotation.y = this.rot3D.y;

    this.renderer3D.render(this.scene3D, this.camera3D);
  },

  // ── Update UI Status & Indicators ──
  updateUI() {
    const p = this.progress;
    const curStage = this.stages.find(s => p >= s.min && p < s.max) || this.stages[this.stages.length - 1];

    // Update Slider Scrubber
    const slider = document.getElementById('anim-scrubber');
    if (slider) {
      slider.value = Math.round(p * 100);
      slider.style.setProperty('--fill', Math.round(p * 100) + '%');
    }

    const pctLabel = document.getElementById('anim-pct-label');
    if (pctLabel) {
      pctLabel.textContent = Math.round(p * 100) + '%';
    }

    // Update Stage Pills
    this.stages.forEach(s => {
      const btn = document.getElementById(`anim-stage-btn-${s.id}`);
      if (btn) {
        btn.classList.toggle('active', s.id === curStage.id);
      }
    });

    // Update Story & Narrative Description
    const titleEl = document.getElementById('anim-story-title');
    const descEl = document.getElementById('anim-story-desc');
    const badgeEl = document.getElementById('anim-story-badge');

    if (badgeEl) {
      badgeEl.textContent = `Tahap ${curStage.id} dari 5`;
    }

    if (titleEl && descEl) {
      titleEl.innerHTML = `${curStage.icon} ${curStage.name}`;

      if (curStage.id === 1) {
        descEl.textContent = this.shape === 'prisma'
          ? 'Menggambar bidang alas: menarik rusuk depan BC (8 cm) secara mendatar dengan garis tebal nyata, lalu menarik garis miring ortogonal AC & AB (5 cm) ke arah belakang menggunakan GARIS PUTUS-PUTUS karena posisinya tersembunyi.'
          : 'Menggambar bidang alas sebagai jajar genjang ABCD: menarik rusuk depan AB dan samping kanan BC dengan garis tebal nyata, lalu menarik rusuk belakang AD dan CD menggunakan GARIS PUTUS-PUTUS.';
      } else if (curStage.id === 2) {
        descEl.textContent = this.shape === 'prisma'
          ? 'Menarik 3 rusuk tegak vertikal sejajar (30 cm): rusuk depan CF dan BE digambar dengan garis tebal nyata, sedangkan rusuk tegak belakang AD digambar dengan garis putus-putus karena terhalang dinding prisma.'
          : 'Menentukan titik puncak T: menarik garis diagonal alas AC dan BD yang berpotongan di titik pusat O, lalu dari titik O menarik garis tinggi vertikal tegak lurus (t = 10 cm) menuju titik puncak T.';
      } else if (curStage.id === 3) {
        descEl.textContent = this.shape === 'prisma'
          ? 'Membentuk bidang tutup atas (segitiga DEF): menghubungkan ketiga ujung rusuk tegak F → E, F → D, dan E → D dengan garis tebal nyata karena bidang tutup tampak jelas dari sudut pandang atas.'
          : 'Menghubungkan puncak T ke seluruh sudut alas: rusuk miring tampak depan TA, TB, dan TC digambar dengan garis tebal nyata, sedangkan rusuk miring belakang TD digambar dengan GARIS PUTUS-PUTUS.';
      } else if (curStage.id === 4) {
        descEl.textContent = 'Penegasan kaidah stereometri 3D: mempertegas perbedaan rusuk tampak (garis tebal utuh / solid) dan rusuk terhalang (garis putus-putus / dashed) serta memberikan arsiran lembut pada bidang depan untuk kedalaman 3D nyata.';
      } else if (curStage.id === 5) {
        descEl.textContent = this.shape === 'prisma'
          ? 'Memberikan label nama titik sudut kapital A, B, C (alas) dan D, E, F (tutup) serta dimensi ukuran rusuk (BC=8 cm, t=30 cm). Model 3D kini aktif di layar — seret/drag untuk memutar 360° dan memverifikasi sudut pandang!'
          : 'Memberikan notasi nama titik puncak T, titik alas A, B, C, D (Limas T.ABCD), serta label tinggi t dan rusuk a. Model 3D kini aktif di layar — seret/drag untuk memutar 360° dan memverifikasi ketepatan gambarmu!';
      }
    }
  },

  initControls() {
    // Play/Pause button
    const playBtn = document.getElementById('anim-btn-play');
    if (playBtn) {
      playBtn.addEventListener('click', () => this.togglePlay());
    }

    // Scrubber range
    const scrubber = document.getElementById('anim-scrubber');
    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        if (this.isPlaying) this.togglePlay();
        this.setProgress(parseFloat(e.target.value) / 100);
      });
    }

    // Stage buttons
    this.stages.forEach(s => {
      const btn = document.getElementById(`anim-stage-btn-${s.id}`);
      if (btn) {
        btn.addEventListener('click', () => {
          if (this.isPlaying) this.togglePlay();
          this.setStage(s.id);
        });
      }
    });

    // Speed options
    document.querySelectorAll('.anim-speed-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.anim-speed-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.playbackSpeed = parseFloat(e.currentTarget.getAttribute('data-speed')) || 1;
      });
    });

    // Reset button
    const resetBtn = document.getElementById('anim-btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (this.isPlaying) this.togglePlay();
        this.setProgress(0);
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Wait for Three.js
  const checkThree = setInterval(() => {
    if (window.THREE) {
      clearInterval(checkThree);
      AnimStudio.init();
    }
  }, 50);
});
