/**
 * Panduan & Simulasi Menggambar Prisma Segitiga ABC.DEF
 * Matematika Kelas VIII SMP
 */

'use strict';

const PrismaGuide = {
  progress: 0,
  isPlaying: false,
  playbackSpeed: 1,
  animFrameId: null,
  lastTimestamp: 0,
  duration: 16000,

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

  stages: [
    { id: 1, min: 0.00, max: 0.25, name: '1. Menggambar Bidang Alas', icon: '📐' },
    { id: 2, min: 0.25, max: 0.50, name: '2. Menarik 3 Rusuk Tegak', icon: '📏' },
    { id: 3, min: 0.50, max: 0.72, name: '3. Menghubungkan Tutup DEF', icon: '✏️' },
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
    this.initChecklist();
    this.initCalculator();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

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

  setProgress(p) {
    this.progress = Math.max(0, Math.min(1, p));
    this.updateUI();
    this.render();
  },

  setStage(stageNum) {
    const s = this.stages.find(st => st.id === stageNum);
    if (s) this.setProgress(s.min + 0.005);
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
    } else if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  },

  loop(now) {
    if (!this.isPlaying) return;
    const dt = now - this.lastTimestamp;
    this.lastTimestamp = now;

    let nextP = this.progress + (dt / this.duration) * this.playbackSpeed;
    if (nextP > 1) nextP = 0;
    this.progress = nextP;
    this.updateUI();
    this.render();

    this.animFrameId = requestAnimationFrame(t => this.loop(t));
  },

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

    const ambLight = new T.AmbientLight(0xffffff, 0.85);
    this.scene3D.add(ambLight);

    const dir1 = new T.DirectionalLight(0x4ECDC4, 0.9);
    dir1.position.set(4, 7, 4);
    this.scene3D.add(dir1);

    const dir2 = new T.DirectionalLight(0xFF6B6B, 0.7);
    dir2.position.set(-4, -5, -3);
    this.scene3D.add(dir2);

    this.modelGroup3D = new T.Group();
    this.scene3D.add(this.modelGroup3D);

    // Build 3D Prisma Segitiga Model
    const w = 1.6;
    const h = 2.0;
    const d = 0.7;

    const geom = new T.BufferGeometry();
    const pC = [-w / 2, -h / 2, d / 2];
    const pB = [w / 2, -h / 2, d / 2];
    const pA = [0, -h / 2, -d / 2];
    const pF = [-w / 2, h / 2, d / 2];
    const pE = [w / 2, h / 2, d / 2];
    const pD = [0, h / 2, -d / 2];

    const vertices = new Float32Array([
      ...pC, ...pB, ...pA,
      ...pF, ...pD, ...pE,
      ...pC, ...pF, ...pB,
      ...pB, ...pF, ...pE,
      ...pA, ...pD, ...pC,
      ...pC, ...pD, ...pF,
      ...pB, ...pE, ...pA,
      ...pA, ...pE, ...pD
    ]);

    geom.setAttribute('position', new T.BufferAttribute(vertices, 3));
    geom.computeVertexNormals();

    const matFace = new T.MeshPhongMaterial({
      color: 0x4ECDC4,
      side: T.DoubleSide,
      transparent: true,
      opacity: 0.35,
      shininess: 90
    });
    this.modelGroup3D.add(new T.Mesh(geom, matFace));

    const matEdge = new T.LineBasicMaterial({ color: 0x00FFEE, linewidth: 2.5 });
    this.modelGroup3D.add(new T.LineSegments(new T.EdgesGeometry(geom), matEdge));

    // Orbital drag
    this.container3D.addEventListener('pointerdown', (e) => {
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

  render() {
    const p = this.progress;
    const is3DActive = (p >= 0.88);

    if (this.canvas2D && this.container3D) {
      this.canvas2D.style.display = is3DActive ? 'none' : 'block';
      this.container3D.style.display = is3DActive ? 'block' : 'none';
    }

    const hintBadge = document.getElementById('anim-hint-badge');
    if (hintBadge) hintBadge.style.opacity = is3DActive ? '1' : '0.4';

    if (!is3DActive) {
      this.render2DDrafting(p);
    } else {
      if (p >= 0.88) this.rot3D.y += this.autoRotateSpeed;
      this.modelGroup3D.rotation.x = this.rot3D.x;
      this.modelGroup3D.rotation.y = this.rot3D.y;
      this.renderer3D.render(this.scene3D, this.camera3D);
    }
  },

  render2DDrafting(p) {
    if (!this.ctx2D || !this.canvas2D) return;
    const ctx = this.ctx2D;
    const rect = this.canvas2D.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // Kertas berpetak (Grid Notebook)
    ctx.save();
    ctx.fillStyle = '#0f1026';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(108, 99, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.16)';
    ctx.lineWidth = 1.2;
    for (let x = 0; x < w; x += 100) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 100) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();

    // Pusat & skala gambar responsif (besar, tinggi, dan jelas di HP maupun desktop)
    const cx = w / 2;
    const cy = h / 2;

    const availH = h - 80;
    const availW = w - 60;

    // Prisma tinggi dan gagah sesuai proporsi gambar acuan (8 cm x 30 cm)
    const H = Math.max(250, Math.min(availH * 0.72, 320));
    const wFront = Math.max(160, Math.min(availW * 0.65, 220));
    const dY = Math.max(35, Math.min(wFront * 0.28, 48));

    const topY = cy - H / 2 + dY / 2;
    const botY = topY + H;

    // Titik-titik sudut Prisma Segitiga ABC.DEF
    // Garis BC di depan bawah, Titik A berada NAIK DI ATAS rusuk BC (menghadap ke atas sesuai gambar acuan)
    const pts = {
      C: { x: cx - wFront / 2, y: botY,      name: 'C' },
      B: { x: cx + wFront / 2, y: botY,      name: 'B' },
      A: { x: cx,              y: botY - dY, name: 'A' },

      F: { x: cx - wFront / 2, y: topY,      name: 'F' },
      E: { x: cx + wFront / 2, y: topY,      name: 'E' },
      D: { x: cx,              y: topY - dY, name: 'D' }
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

    // Shading transparan lembut saat p >= 0.70 (tanpa teks bertubrukan di dalam bangun)
    if (p >= 0.70) {
      const alpha = Math.min(1, (p - 0.70) / 0.15);

      ctx.fillStyle = `rgba(78, 205, 196, ${0.14 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(pts.C.x, pts.C.y);
      ctx.lineTo(pts.B.x, pts.B.y);
      ctx.lineTo(pts.E.x, pts.E.y);
      ctx.lineTo(pts.F.x, pts.F.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = `rgba(255, 217, 61, ${0.18 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(pts.F.x, pts.F.y);
      ctx.lineTo(pts.E.x, pts.E.y);
      ctx.lineTo(pts.D.x, pts.D.y);
      ctx.closePath();
      ctx.fill();
    }

    const drawP = Math.min(1, p / 0.72);
    this.drawPointToPoint(ctx, segments, drawP);

    // ── 3 UKURAN ACUAN BERSIH PERSIS SEPERTI GAMBAR CONTOH ──
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

  drawPointToPoint(ctx, segments, t) {
    if (!segments || segments.length === 0) return;

    const totalSegs = segments.length;
    const curP = Math.max(0, Math.min(1, t));
    const globalPos = curP * totalSegs;
    const activeIdx = Math.min(Math.floor(globalPos), totalSegs - 1);
    const segFrac = globalPos - activeIdx;

    const visited = new Map();
    let tip = null;
    let desc = '';

    for (let i = 0; i <= activeIdx; i++) {
      const seg = segments[i];
      const p1 = seg.p1;
      const p2 = seg.p2;
      visited.set(p1.name, p1);

      ctx.save();
      ctx.strokeStyle = seg.color || '#00FFEE';
      ctx.lineWidth = seg.width || 3;
      if (seg.dash) ctx.setLineDash(seg.dash);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);

      if (i < activeIdx || curP >= 1) {
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        visited.set(p2.name, p2);
      } else {
        const curX = p1.x + (p2.x - p1.x) * segFrac;
        const curY = p1.y + (p2.y - p1.y) * segFrac;
        ctx.lineTo(curX, curY);
        ctx.stroke();

        tip = { x: curX, y: curY };
        desc = seg.desc;
        this.drawRuler(ctx, p1, p2);
      }
      ctx.restore();
    }

    visited.forEach(pt => this.drawVertex(ctx, pt.x, pt.y, pt.name));

    if (tip && curP < 1) {
      this.drawPencil(ctx, tip.x, tip.y, desc);
    }
  },

  drawVertex(ctx, x, y, name) {
    ctx.save();
    ctx.shadowColor = '#00FFEE';
    ctx.shadowBlur = 10;

    ctx.fillStyle = '#0d0d1a';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00FFEE';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillStyle = '#FFD93D';

    // Penempatan huruf kapital presisi sesuai gambar acuan prisma-ref.png:
    // A di sebelah kiri titik A, B di kanan bawah, C di kiri bawah, F di kiri, E di kanan, D di atas
    if (name === 'A') {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, x - 10, y);
    } else if (name === 'C') {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(name, x - 8, y + 6);
    } else if (name === 'B') {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(name, x + 8, y + 6);
    } else if (name === 'F') {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, x - 10, y);
    } else if (name === 'E') {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, x + 10, y);
    } else if (name === 'D') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(name, x, y - 9);
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(name, x, y - 9);
    }
    ctx.restore();
  },

  drawRuler(ctx, p1, p2) {
    ctx.save();
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 10) { ctx.restore(); return; }

    ctx.translate(p1.x, p1.y);
    ctx.rotate(Math.atan2(dy, dx));

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.45)';
    ctx.lineWidth = 1;
    ctx.fillRect(0, 5, len, 22);
    ctx.strokeRect(0, 5, len, 22);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    for (let d = 0; d <= len; d += 8) {
      ctx.beginPath();
      ctx.moveTo(d, 5);
      ctx.lineTo(d, 5 + (d % 24 === 0 ? 10 : 5));
      ctx.stroke();
    }
    ctx.restore();
  },

  drawPencil(ctx, x, y, desc) {
    ctx.save();
    ctx.shadowColor = '#00FFEE';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#00FFEE';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.font = '24px Outfit, sans-serif';
    ctx.fillText('✏️', x + 2, y - 4);

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

  drawLabel(ctx, p1, p2, text) {
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

  updateUI() {
    const p = this.progress;
    const curStage = this.stages.find(s => p >= s.min && p < s.max) || this.stages[this.stages.length - 1];

    const slider = document.getElementById('anim-scrubber');
    if (slider) {
      slider.value = Math.round(p * 100);
      slider.style.setProperty('--fill', Math.round(p * 100) + '%');
    }

    const pctLabel = document.getElementById('anim-pct-label');
    if (pctLabel) pctLabel.textContent = Math.round(p * 100) + '%';

    this.stages.forEach(s => {
      const btn = document.getElementById(`anim-stage-btn-${s.id}`);
      if (btn) btn.classList.toggle('active', s.id === curStage.id);
    });

    const titleEl = document.getElementById('anim-story-title');
    const descEl = document.getElementById('anim-story-desc');
    const badgeEl = document.getElementById('anim-story-badge');

    if (badgeEl) badgeEl.textContent = `Tahap ${curStage.id} dari 5`;

    if (titleEl && descEl) {
      titleEl.innerHTML = `${curStage.icon} ${curStage.name}`;

      if (curStage.id === 1) {
        descEl.textContent = 'Menggambar bidang alas: menarik rusuk alas depan mendatar BC (8 cm) dengan garis tebal nyata, lalu menarik rusuk belakang AC dan AB (5 cm) miring naik ke atas menuju Titik A menggunakan GARIS PUTUS-PUTUS sesuai gambar acuan.';
      } else if (curStage.id === 2) {
        descEl.textContent = 'Menarik 3 rusuk tegak vertikal sejajar (30 cm): rusuk depan CF dan BE digambar dengan garis tebal nyata, sedangkan rusuk tegak belakang AD digambar vertikal lurus ke atas dari Titik A dengan garis putus-putus.';
      } else if (curStage.id === 3) {
        descEl.textContent = 'Membentuk bidang tutup atas (segitiga DEF): menghubungkan ketiga ujung rusuk tegak F → E, F → D, dan E → D dengan garis tebal nyata karena bidang tutup tampak jelas dari sudut pandang atas.';
      } else if (curStage.id === 4) {
        descEl.textContent = 'Penegasan kaidah stereometri 3D: mempertegas perbedaan rusuk tampak (garis tebal utuh / solid) dan rusuk terhalang (garis putus-putus / dashed) serta memberikan arsiran lembut pada bidang depan untuk kedalaman 3D nyata.';
      } else if (curStage.id === 5) {
        descEl.textContent = 'Memberikan label nama titik sudut kapital A, B, C (alas) dan D, E, F (tutup) serta dimensi ukuran rusuk (BC=8 cm, t=30 cm). Model 3D kini aktif di layar — seret/drag untuk memutar 360° dan memverifikasi sudut pandang!';
      }
    }
  },

  initControls() {
    const playBtn = document.getElementById('anim-btn-play');
    if (playBtn) playBtn.addEventListener('click', () => this.togglePlay());

    const scrubber = document.getElementById('anim-scrubber');
    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        if (this.isPlaying) this.togglePlay();
        this.setProgress(parseFloat(e.target.value) / 100);
      });
    }

    this.stages.forEach(s => {
      const btn = document.getElementById(`anim-stage-btn-${s.id}`);
      if (btn) {
        btn.addEventListener('click', () => {
          if (this.isPlaying) this.togglePlay();
          this.setStage(s.id);
        });
      }
    });

    document.querySelectorAll('.anim-speed-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.anim-speed-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.playbackSpeed = parseFloat(e.currentTarget.getAttribute('data-speed')) || 1;
      });
    });

    const resetBtn = document.getElementById('anim-btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (this.isPlaying) this.togglePlay();
        this.setProgress(0);
      });
    }
  },

  // ── Checklist Tracker ──
  initChecklist() {
    const saved = JSON.parse(localStorage.getItem('lkpd_step_prisma') || '{}');
    document.querySelectorAll('.step-card').forEach(card => {
      const stepId = card.getAttribute('data-step-id');
      const checkBtn = card.querySelector('.step-check-btn');

      if (saved[stepId]) {
        card.classList.add('completed');
        if (checkBtn) checkBtn.innerHTML = '<span>✓ Selesai</span>';
      }

      if (checkBtn) {
        checkBtn.addEventListener('click', () => {
          const isDone = card.classList.toggle('completed');
          saved[stepId] = isDone;
          localStorage.setItem('lkpd_step_prisma', JSON.stringify(saved));
          checkBtn.innerHTML = isDone ? '<span>✓ Selesai</span>' : '<span>Tandai Selesai</span>';
          this.updateProgress();
        });
      }
    });
    this.updateProgress();
  },

  updateProgress() {
    const cards = document.querySelectorAll('.step-card');
    const total = cards.length;
    let completed = 0;
    cards.forEach(card => { if (card.classList.contains('completed')) completed++; });

    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    const progressText = document.getElementById('progress-text-prisma');
    const progressBar = document.getElementById('progress-bar-prisma');

    if (progressText) progressText.textContent = `${completed} dari ${total} Langkah Selesai (${pct}%)`;
    if (progressBar) progressBar.style.width = `${pct}%`;
  },

  resetChecklist() {
    if (!confirm('Apakah kamu ingin mengulang centang semua langkah menggambar?')) return;
    localStorage.removeItem('lkpd_step_prisma');
    document.querySelectorAll('.step-card').forEach(card => {
      card.classList.remove('completed');
      const checkBtn = card.querySelector('.step-check-btn');
      if (checkBtn) checkBtn.innerHTML = '<span>Tandai Selesai</span>';
    });
    this.updateProgress();
  },

  // ── Kalkulator Mandiri Prisma ──
  initCalculator() {
    const pSisiFront = document.getElementById('calc-p-sisi-front');
    const pSisiSide  = document.getElementById('calc-p-sisi-side');
    const pTinggi    = document.getElementById('calc-p-tinggi');

    if (pSisiFront && pTinggi) {
      const calcPrisma = () => {
        const bc = parseFloat(pSisiFront.value) || 8;
        const ab = pSisiSide ? (parseFloat(pSisiSide.value) || 5) : 5;
        const H  = parseFloat(pTinggi.value) || 30;

        const halfBc = bc / 2;
        const hSq = (ab * ab) - (halfBc * halfBc);
        const h = hSq > 0 ? Math.sqrt(hSq) : (bc * Math.sqrt(3)) / 2;

        const L_alas = 0.5 * bc * h;
        const kelilingAlas = bc + (2 * ab);
        const L_tegak = kelilingAlas * H;
        const Lp = (2 * L_alas) + L_tegak;
        const V = L_alas * H;
        const rusuk = (2 * kelilingAlas) + (3 * H);

        const bookW = Math.ceil(bc + 2);
        const bookH = Math.ceil((H / 2) + 3);

        const elLp = document.getElementById('res-p-lp');
        const elVol = document.getElementById('res-p-vol');
        const elRusuk = document.getElementById('res-p-rusuk');
        const elKarton = document.getElementById('res-p-karton');

        if (elLp) elLp.textContent = Lp.toFixed(1);
        if (elVol) elVol.textContent = V.toFixed(1);
        if (elRusuk) elRusuk.textContent = rusuk.toFixed(1);
        if (elKarton) elKarton.textContent = `${bookW} × ${bookH}`;
      };

      pSisiFront.addEventListener('input', calcPrisma);
      if (pSisiSide) pSisiSide.addEventListener('input', calcPrisma);
      pTinggi.addEventListener('input', calcPrisma);
      calcPrisma();
    }
  },

  printGuide() {
    window.print();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const checkThree = setInterval(() => {
    if (window.THREE) {
      clearInterval(checkThree);
      PrismaGuide.init();
    }
  }, 50);
});
