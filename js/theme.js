/* Светлая / тёмная тема с плавным переключением */
(function (App) {
  'use strict';

  const root = document.documentElement;
  const metaColor = document.querySelector('meta[name="theme-color"]');

  const current = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');

  function apply(theme) {
    root.dataset.theme = theme;
    metaColor.setAttribute('content', theme === 'dark' ? '#0e1016' : '#f4f5fb');
  }

  // Круговое «раскрытие» новой темы от кнопки (View Transitions API),
  // либо обычный плавный переход цветов в браузерах без поддержки
  function toggle(originEl) {
    const next = current() === 'dark' ? 'light' : 'dark';
    App.store.state.theme = next;
    App.store.save();

    if (App.utils.reducedMotion()) return apply(next);

    if (document.startViewTransition && originEl) {
      const rect = originEl.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const transition = document.startViewTransition(() => apply(next));
      transition.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 450, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(() => {});
      return;
    }

    root.classList.add('theme-anim');
    apply(next);
    clearTimeout(toggle._t);
    toggle._t = setTimeout(() => root.classList.remove('theme-anim'), 450);
  }

  function init() {
    apply(current()); // тема уже выставлена inline-скриптом в <head>
    const btn = document.getElementById('themeToggle');
    btn.addEventListener('click', () => toggle(btn));

    // Следуем за системной темой, пока пользователь не выбрал свою
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!App.store.state.theme) apply(e.matches ? 'dark' : 'light');
    });
  }

  App.theme = { init, toggle };
})(window.App = window.App || {});
