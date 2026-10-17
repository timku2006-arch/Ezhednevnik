/* Точка входа: инициализация модулей, вкладки, горячие клавиши */
(function (App) {
  'use strict';

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Доброй ночи';
    if (h < 12) return 'Доброе утро';
    if (h < 18) return 'Добрый день';
    return 'Добрый вечер';
  }

  // Переключение разделов в нижней навигации (на телефоне)
  function initTabs() {
    const app = document.getElementById('app');
    const buttons = document.querySelectorAll('.tabbar__btn');
    buttons.forEach((btn) =>
      btn.addEventListener('click', () => {
        if (app.dataset.tab === btn.dataset.tab) return;
        app.dataset.tab = btn.dataset.tab;
        buttons.forEach((b) => {
          b.classList.toggle('is-active', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
        App.calendar.close();
        window.scrollTo({ top: 0, behavior: App.utils.reducedMotion() ? 'auto' : 'smooth' });
      })
    );
  }

  // Горячие клавиши (когда фокус не в поле ввода):
  // ← / → — соседний день, «/» — поиск по заметкам, «n» — новая заметка, «t» — новая задача
  function initShortcuts() {
    document.addEventListener('keydown', (e) => {
      const typing = e.target.closest('input, textarea, [contenteditable]');
      if (typing || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
      if (e.key === 'ArrowLeft') App.tasks.shift(-1);
      else if (e.key === 'ArrowRight') App.tasks.shift(1);
      else if (e.key === '/') { e.preventDefault(); App.notes.focusSearch(); }
      else if (e.key === 'n' || e.key === 'т') { e.preventDefault(); App.notes.openEditor(); }
      else if (e.key === 't' || e.key === 'е') { e.preventDefault(); App.tasks.focusInput(); }
    });
  }

  function init() {
    App.store.load();
    App.theme.init();
    App.calendar.init();
    App.tasks.init();
    App.notes.init();
    initTabs();
    initShortcuts();
    document.getElementById('greeting').textContent = greeting();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.App = window.App || {});
