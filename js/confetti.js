/* Лёгкое конфетти на canvas — празднуем выполнение всех задач дня */
(function (App) {
  'use strict';

  const COLORS = ['#7c5cff', '#4f8cff', '#22c38e', '#ffb84d', '#ff6b9a', '#5ad1ff'];

  function burst(originEl) {
    if (App.utils.reducedMotion()) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    document.body.append(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);

    // Точка вылета — центр элемента (кольцо прогресса) или центр экрана
    const rect = originEl ? originEl.getBoundingClientRect() : null;
    const ox = rect ? rect.left + rect.width / 2 : innerWidth / 2;
    const oy = rect ? rect.top + rect.height / 2 : innerHeight / 3;

    const pieces = Array.from({ length: 140 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 9;
      return {
        x: ox, y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 6,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        round: Math.random() < 0.3,
      };
    });

    const DURATION = 1800;
    const start = performance.now();

    function frame(now) {
      const t = now - start;
      const fade = Math.max(0, 1 - Math.max(0, t - DURATION * 0.6) / (DURATION * 0.4));
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalAlpha = fade;
      for (const p of pieces) {
        p.vy += 0.32;      // гравитация
        p.vx *= 0.985;     // сопротивление воздуха
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.h / 2 + 1, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)) + 1);
        }
        ctx.restore();
      }
      if (t < DURATION) requestAnimationFrame(frame);
      else canvas.remove();
    }
    requestAnimationFrame(frame);
  }

  App.confetti = { burst };
})(window.App = window.App || {});
