/* Задачи на день: добавление, выполнение, редактирование, удаление, смена дней */
(function (App) {
  'use strict';

  const U = App.utils;
  const { el, icon, toKey, addDays, startOfDay } = U;

  const RING_LENGTH = 2 * Math.PI * 50; // длина окружности кольца (r = 50)

  const dom = {};
  let selectedDate = startOfDay(new Date());

  /* ---------- Данные ---------- */
  const dayKey = () => toKey(selectedDate);
  const tasksOf = (key = dayKey()) => App.store.state.tasks[key] || [];

  function setTasks(list, key = dayKey()) {
    if (list.length) App.store.state.tasks[key] = list;
    else delete App.store.state.tasks[key]; // не храним пустые дни
    App.store.save();
  }

  // Статистика дня для календаря: { total, done } или null
  function statsFor(key) {
    const list = tasksOf(key);
    return list.length ? { total: list.length, done: list.filter((t) => t.done).length } : null;
  }

  /* ---------- Отрисовка ---------- */
  function createTaskEl(task) {
    const check = el('button.task__check', {
      type: 'button',
      role: 'checkbox',
      'aria-checked': String(task.done),
      'aria-label': 'Отметить выполненной',
      dataset: { action: 'toggle' },
    });
    // Галочка рисуется через stroke-dashoffset
    check.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9"/></svg>';

    const editBtn = el('button.mini-btn', { type: 'button', 'aria-label': 'Редактировать', title: 'Редактировать', dataset: { action: 'edit' } }, icon('edit'));
    const delBtn = el('button.mini-btn.mini-btn--danger', { type: 'button', 'aria-label': 'Удалить', title: 'Удалить', dataset: { action: 'delete' } }, icon('trash'));

    const li = el('li.task', { dataset: { id: task.id } },
      check,
      el('span.task__text', { title: 'Двойной клик — редактировать' }, el('span.task__label', { text: task.text })),
      el('div.task__actions', {}, editBtn, delBtn)
    );
    if (task.done) li.classList.add('is-done');
    return li;
  }

  // Полная перерисовка списка (при смене дня); direction: -1 / 1 — направление анимации
  function render(direction = 0) {
    const list = tasksOf();
    dom.list.replaceChildren(...list.map(createTaskEl));
    renderHeader();
    updateProgress(false);
    toggleEmpty();

    if (direction) {
      const cls = direction > 0 ? 'slide-next' : 'slide-prev';
      U.replayClass(dom.list, cls, 320);
      U.replayClass(dom.titleWrap, cls, 320);
    }
  }

  function renderHeader() {
    const weekday = U.fmtWeekday.format(selectedDate);
    dom.date.textContent = U.fmtLong.format(selectedDate);
    dom.sub.textContent = `${U.relativeDay(selectedDate)} · ${weekday}`;

    // Подсвечиваем чип «Вчера / Сегодня / Завтра», если он совпадает с выбранным днём
    const today = startOfDay(new Date());
    dom.chips.forEach((chip) => {
      const active = U.isSameDay(addDays(today, Number(chip.dataset.shift)), selectedDate);
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', String(active));
    });
  }

  function toggleEmpty() {
    dom.empty.hidden = tasksOf().length > 0;
  }

  // Обновляет кольцо, полосу и подписи; celebrate — запустить праздник, если всё выполнено
  function updateProgress(celebrate) {
    const list = tasksOf();
    const total = list.length;
    const done = list.filter((t) => t.done).length;
    const ratio = total ? done / total : 0;
    const percent = Math.round(ratio * 100);

    dom.ringValue.style.strokeDashoffset = String(RING_LENGTH * (1 - ratio));
    dom.bar.style.width = `${percent}%`;
    dom.percent.textContent = percent;

    if (!total) {
      dom.count.textContent = 'Нет задач';
      dom.hint.textContent = 'Добавьте первую задачу на этот день';
    } else {
      dom.count.textContent = `Выполнено ${done} из ${total}`;
      const left = total - done;
      dom.hint.textContent = left
        ? `Осталось ${left} ${U.plural(left, ['задача', 'задачи', 'задач'])}`
        : 'Все задачи выполнены — отличная работа!';
    }

    const complete = total > 0 && done === total;
    dom.ring.classList.toggle('is-complete', complete);

    if (celebrate && complete) {
      U.replayClass(dom.ring, 'celebrate', 450); // «pop»-анимация кольца
      App.confetti.burst(dom.ring);
      U.toast('🎉 Все задачи на день выполнены!');
    }
  }

  /* ---------- Действия ---------- */
  function add(text) {
    text = text.trim();
    if (!text) return;
    const task = { id: U.uid(), text, done: false, createdAt: Date.now() };
    setTasks([...tasksOf(), task]);

    const li = createTaskEl(task);
    li.classList.add('is-entering');
    li.addEventListener('animationend', () => li.classList.remove('is-entering'), { once: true });
    dom.list.append(li);
    toggleEmpty();
    updateProgress(false);
  }

  function toggle(id) {
    const list = tasksOf().map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setTasks(list);
    const task = list.find((t) => t.id === id);
    const li = dom.list.querySelector(`[data-id="${id}"]`);
    if (!task || !li) return;

    li.classList.toggle('is-done', task.done);
    li.querySelector('.task__check').setAttribute('aria-checked', String(task.done));
    if (task.done) U.replayClass(li, 'just-done', 520);
    updateProgress(task.done);
  }

  async function remove(id) {
    const list = tasksOf();
    const index = list.findIndex((t) => t.id === id);
    if (index < 0) return;
    const task = list[index];
    const key = dayKey();
    setTasks(list.filter((t) => t.id !== id), key);

    const li = dom.list.querySelector(`[data-id="${id}"]`);
    if (li) {
      li.style.height = `${li.offsetHeight}px`; // фиксируем высоту, чтобы схлопнуть её анимацией
      li.style.overflow = 'hidden';
      await U.animateOut(li);
      li.remove();
    }
    if (key === dayKey()) {
      toggleEmpty();
      updateProgress(false);
    }

    U.toast('Задача удалена', {
      action: 'Отменить',
      onAction: () => {
        const current = tasksOf(key).slice();
        current.splice(Math.min(index, current.length), 0, task);
        setTasks(current, key);
        if (key === dayKey()) render();
      },
    });
  }

  // Встроенное редактирование: Enter — сохранить, Esc — отменить, потеря фокуса — сохранить
  function startEdit(id) {
    const li = dom.list.querySelector(`[data-id="${id}"]`);
    const textEl = li && li.querySelector('.task__text');
    if (!textEl) return;
    const task = tasksOf().find((t) => t.id === id);

    const input = el('input.input.task__edit', { type: 'text', maxlength: 200, value: task.text, 'aria-label': 'Текст задачи' });
    textEl.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    let finished = false;
    const finish = (save) => {
      if (finished) return;
      finished = true;
      const text = input.value.trim();
      if (save && text && text !== task.text) {
        setTasks(tasksOf().map((t) => (t.id === id ? { ...t, text } : t)));
        textEl.firstChild.textContent = text;
      }
      input.replaceWith(textEl);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.stopPropagation(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  /* ---------- Навигация по дням ---------- */
  function setDate(date) {
    date = startOfDay(date);
    const direction = Math.sign(date - selectedDate);
    if (!direction) return;
    selectedDate = date;
    render(direction);
  }

  function shift(n) { setDate(addDays(selectedDate, n)); }

  /* ---------- Инициализация ---------- */
  function init() {
    Object.assign(dom, {
      list: document.getElementById('taskList'),
      empty: document.getElementById('tasksEmpty'),
      form: document.getElementById('taskForm'),
      input: document.getElementById('taskInput'),
      date: document.getElementById('tasksHeading'),
      sub: document.getElementById('daySub'),
      titleWrap: document.getElementById('dayTitleWrap'),
      chips: [...document.querySelectorAll('.chip[data-shift]')],
      ring: document.getElementById('ring'),
      ringValue: document.getElementById('ringValue'),
      percent: document.getElementById('ringPercent'),
      count: document.getElementById('progressCount'),
      hint: document.getElementById('progressHint'),
      bar: document.getElementById('barFill'),
      calendarBtn: document.getElementById('calendarBtn'),
    });
    dom.ringValue.style.strokeDasharray = String(RING_LENGTH);

    dom.form.addEventListener('submit', (e) => {
      e.preventDefault();
      add(dom.input.value);
      dom.input.value = '';
      dom.input.focus();
    });

    // Делегирование событий списка
    dom.list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      const li = e.target.closest('.task');
      if (!btn || !li) return;
      const { id } = li.dataset;
      if (btn.dataset.action === 'toggle') toggle(id);
      if (btn.dataset.action === 'edit') startEdit(id);
      if (btn.dataset.action === 'delete') remove(id);
    });
    dom.list.addEventListener('dblclick', (e) => {
      if (e.target.closest('.task__text')) startEdit(e.target.closest('.task').dataset.id);
    });

    document.getElementById('prevDay').addEventListener('click', () => shift(-1));
    document.getElementById('nextDay').addEventListener('click', () => shift(1));
    dom.chips.forEach((chip) =>
      chip.addEventListener('click', () => setDate(addDays(new Date(), Number(chip.dataset.shift))))
    );
    dom.calendarBtn.addEventListener('click', () => {
      if (App.calendar.isOpen()) return App.calendar.close();
      App.calendar.open(dom.calendarBtn, selectedDate, { pick: setDate, stats: statsFor });
    });

    // Свайп влево/вправо по карточке дня — переключение дней на телефоне
    const dayCard = document.querySelector('.day-card');
    let touchX = null, touchY = null;
    dayCard.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
    dayCard.addEventListener('touchend', (e) => {
      if (touchX == null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      const dy = e.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) shift(dx < 0 ? 1 : -1);
      touchX = null;
    });

    render();
  }

  App.tasks = { init, shift, setDate, focusInput: () => dom.input.focus() };
})(window.App = window.App || {});
