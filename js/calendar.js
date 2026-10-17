/* Всплывающий календарь для выбора дня */
(function (App) {
  'use strict';

  const { el, toKey, isSameDay, startOfDay, fmtMonth, animateOut } = App.utils;

  const box = document.getElementById('calendar');
  const grid = document.getElementById('calGrid');
  const monthLabel = document.getElementById('calMonth');

  let viewMonth = startOfDay(new Date()); // любой день отображаемого месяца
  let selected = viewMonth;
  let onPick = null;
  let getDayStats = () => null;
  let anchor = null;

  function render(direction) {
    monthLabel.textContent = fmtMonth.format(viewMonth).replace(' г.', '');
    grid.replaceChildren();

    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // неделя начинается с понедельника
    const today = new Date();

    for (let i = 0; i < 42; i++) {
      const date = new Date(year, month, 1 - offset + i);
      const stats = getDayStats(toKey(date));
      const btn = el('button.cal-day', {
        type: 'button',
        text: date.getDate(),
        'aria-label': App.utils.fmtLong.format(date),
        dataset: stats ? { tasks: stats.done === stats.total ? 'done' : 'open' } : undefined,
      });
      if (date.getMonth() !== month) btn.classList.add('is-other');
      if (isSameDay(date, today)) btn.classList.add('is-today');
      if (isSameDay(date, selected)) {
        btn.classList.add('is-selected');
        btn.setAttribute('aria-current', 'date');
      }
      btn.addEventListener('click', () => {
        onPick && onPick(date);
        close();
      });
      grid.append(btn);
    }

    if (direction) App.utils.replayClass(grid, direction > 0 ? 'slide-next' : 'slide-prev', 320);
  }

  function shiftMonth(n) {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + n, 1);
    render(n);
  }

  function position() {
    const rect = anchor.getBoundingClientRect();
    const width = box.offsetWidth;
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - width / 2), innerWidth - width - 16);
    box.style.left = `${left}px`;
    box.style.top = `${rect.bottom + 10}px`;
  }

  function open(anchorEl, date, { pick, stats }) {
    anchor = anchorEl;
    selected = date;
    viewMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    onPick = pick;
    getDayStats = stats;
    render();
    box.classList.remove('is-closing');
    box.hidden = false;
    position();
    anchor.setAttribute('aria-expanded', 'true');
    grid.querySelector('.is-selected')?.focus({ preventScroll: true });
  }

  async function close() {
    if (box.hidden || box.classList.contains('is-closing')) return;
    anchor && anchor.setAttribute('aria-expanded', 'false');
    await animateOut(box, 'is-closing');
    box.hidden = true;
    box.classList.remove('is-closing');
  }

  const isOpen = () => !box.hidden;

  function init() {
    document.getElementById('calPrev').addEventListener('click', () => shiftMonth(-1));
    document.getElementById('calNext').addEventListener('click', () => shiftMonth(1));
    document.getElementById('calToday').addEventListener('click', () => {
      onPick && onPick(startOfDay(new Date()));
      close();
    });

    // Закрытие по клику снаружи, Esc, прокрутке и изменению размера окна
    document.addEventListener('pointerdown', (e) => {
      if (isOpen() && !box.contains(e.target) && !anchor.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) { close(); anchor.focus(); }
    });
    addEventListener('resize', () => isOpen() && position());
    addEventListener('scroll', () => isOpen() && position(), { passive: true });
  }

  App.calendar = { init, open, close, isOpen };
})(window.App = window.App || {});
