/**
 * Panduan Interaktif Pembuatan Bangun Ruang
 * Kelas VIII SMP — Prisma Segitiga & Limas Segiempat
 */

'use strict';

const GuideApp = {
  activeShape: 'prisma', // 'prisma' | 'limas'

  init() {
    // Check URL search params
    const params = new URLSearchParams(window.location.search);
    const shapeParam = params.get('shape');
    if (shapeParam === 'limas' || shapeParam === 'prisma') {
      this.switchShape(shapeParam);
    } else {
      this.switchShape('prisma');
    }

    this.initChecklist();
    this.initCalculators();
    this.updateProgress();
  },

  switchShape(shape) {
    this.activeShape = shape;

    // Update buttons
    const btnPrisma = document.getElementById('tab-guide-prisma');
    const btnLimas = document.getElementById('tab-guide-limas');
    if (btnPrisma && btnLimas) {
      btnPrisma.classList.toggle('active', shape === 'prisma');
      btnLimas.classList.toggle('active', shape === 'limas');
    }

    // Toggle content panels
    document.querySelectorAll('.shape-content-prisma').forEach(el => {
      el.style.display = (shape === 'prisma') ? '' : 'none';
    });
    document.querySelectorAll('.shape-content-limas').forEach(el => {
      el.style.display = (shape === 'limas') ? '' : 'none';
    });

    if (window.AnimStudio && window.AnimStudio.setShape) {
      window.AnimStudio.setShape(shape);
    }

    this.updateProgress();
  },

  // ── Interactive Checklist ──
  initChecklist() {
    // Load from localStorage if available
    const saved = JSON.parse(localStorage.getItem('lkpd_step_checklist') || '{}');

    document.querySelectorAll('.step-card').forEach(card => {
      const stepId = card.getAttribute('data-step-id');
      const checkBtn = card.querySelector('.step-check-btn');

      if (saved[stepId]) {
        card.classList.add('completed');
        if (checkBtn) {
          checkBtn.innerHTML = '<span>✓ Selesai</span>';
        }
      }

      if (checkBtn) {
        checkBtn.addEventListener('click', () => {
          const isDone = card.classList.toggle('completed');
          saved[stepId] = isDone;
          localStorage.setItem('lkpd_step_checklist', JSON.stringify(saved));
          checkBtn.innerHTML = isDone ? '<span>✓ Selesai</span>' : '<span>Tandai Selesai</span>';
          this.updateProgress();
        });
      }
    });
  },

  updateProgress() {
    const selector = (this.activeShape === 'prisma') ? '.shape-content-prisma .step-card' : '.shape-content-limas .step-card';
    const cards = document.querySelectorAll(selector);
    const total = cards.length;
    let completed = 0;

    cards.forEach(card => {
      if (card.classList.contains('completed')) completed++;
    });

    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

    const progressText = document.getElementById(`progress-text-${this.activeShape}`);
    const progressBar = document.getElementById(`progress-bar-${this.activeShape}`);

    if (progressText) {
      progressText.textContent = `${completed} dari ${total} Langkah Selesai (${pct}%)`;
    }
    if (progressBar) {
      progressBar.style.width = `${pct}%`;
    }
  },

  resetChecklist() {
    if (!confirm('Apakah kamu ingin mengulang centang semua langkah pembuatan?')) return;
    localStorage.removeItem('lkpd_step_checklist');
    document.querySelectorAll('.step-card').forEach(card => {
      card.classList.remove('completed');
      const checkBtn = card.querySelector('.step-check-btn');
      if (checkBtn) checkBtn.innerHTML = '<span>Tandai Selesai</span>';
    });
    this.updateProgress();
  },

  // ── Interactive Calculators ──
  initCalculators() {
    // Prisma inputs (sesuai gambar acuan: BC=8, AB=AC=5, t=30)
    const pSisiFront = document.getElementById('calc-p-sisi-front') || document.getElementById('calc-p-sisi');
    const pSisiSide  = document.getElementById('calc-p-sisi-side');
    const pTinggi    = document.getElementById('calc-p-tinggi');

    if (pSisiFront && pTinggi) {
      const calcPrisma = () => {
        const bc = parseFloat(pSisiFront.value) || 8;
        const ab = pSisiSide ? (parseFloat(pSisiSide.value) || 5) : 5;
        const H  = parseFloat(pTinggi.value) || 30;

        // Tinggi segitiga sama kaki alas: h = sqrt(ab^2 - (bc/2)^2)
        const halfBc = bc / 2;
        const hSq = (ab * ab) - (halfBc * halfBc);
        const h = hSq > 0 ? Math.sqrt(hSq) : (bc * Math.sqrt(3)) / 2;

        // Luas satu alas: L_alas = 0.5 * bc * h
        const L_alas = 0.5 * bc * h;
        // Luas selimut sisi tegak: (bc + 2 * ab) * H
        const kelilingAlas = bc + (2 * ab);
        const L_tegak = kelilingAlas * H;
        // Luas Permukaan: 2 * L_alas + L_tegak
        const Lp = (2 * L_alas) + L_tegak;
        // Volume: L_alas * H
        const V = L_alas * H;
        // Panjang Rusuk Rangka: 2 * kelilingAlas + 3 * H
        const rusuk = (2 * kelilingAlas) + (3 * H);
        // Area estimasi gambar di buku berpetak (skala 1:2 untuk tinggi)
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

    // Limas inputs
    const lAlas = document.getElementById('calc-l-alas');
    const lTinggi = document.getElementById('calc-l-tinggi');

    if (lAlas && lTinggi) {
      const calcLimas = () => {
        const a = parseFloat(lAlas.value) || 0;
        const H = parseFloat(lTinggi.value) || 0;

        // Slant height (tinggi sisi tegak): ts = sqrt(H^2 + (a/2)^2)
        const ts = Math.sqrt(H * H + Math.pow(a / 2, 2));
        // Luas alas: a^2
        const L_alas = a * a;
        // Luas 4 segitiga sisi tegak: 4 * (0.5 * a * ts) = 2 * a * ts
        const L_tegak = 2 * a * ts;
        // Luas Permukaan: L_alas + L_tegak
        const Lp = L_alas + L_tegak;
        // Volume: (1/3) * a^2 * H
        const V = (1 / 3) * L_alas * H;
        // Rusuk tegak miring: r_tegak = sqrt(ts^2 + (a/2)^2)
        const r_tegak = Math.sqrt(ts * ts + Math.pow(a / 2, 2));
        const totalRusuk = (4 * a) + (4 * r_tegak);
        // Estimasi area gambar di buku (a x H)
        const bookW = Math.ceil(a + 2);
        const bookH = Math.ceil(H + 4);

        document.getElementById('res-l-lp').textContent = Lp.toFixed(1);
        document.getElementById('res-l-vol').textContent = V.toFixed(1);
        document.getElementById('res-l-rusuk').textContent = totalRusuk.toFixed(1);
        document.getElementById('res-l-karton').textContent = `${bookW} × ${bookH}`;
      };

      lAlas.addEventListener('input', calcLimas);
      lTinggi.addEventListener('input', calcLimas);
      calcLimas();
    }
  },

  printGuide() {
    window.print();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  GuideApp.init();
});
