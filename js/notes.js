/* Заметки: цветные карточки, закрепление, поиск, редактор в модальном окне */
(function (App) {
  'use strict';

  const U = App.utils;
  const { el, icon } = U;

  const COLORS = [
    { id: 'default', label: 'Без цвета' },
    { id: 'yellow', label: 'Жёлтый' },
    { id: 'green', label: 'Зелёный' },
    { id: 'blue', label: 'Голубой' },
    { id: 'purple', label: 'Фиолетовый' },
    { id: 'pink', label: 'Розовый' },
    { id: 'orange', label: 'Оранжевый' },
  ];

  const dom = {};
  let query = '';
  let editingId = null; // null — создаём новую заметку
  let pickedColor = 'default';

  /* ---------- Данные ---------- */
  const notes = () => App.store.state.notes;

  function setNotes(list) {
    App.store.state.notes = list;
    App.store.save();
  }

  // Закреплённые сверху, внутри групп — недавно изменённые первыми
  function visibleNotes() {
    const q = query.trim().toLowerCase();
    return notes()
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q))
      .sort((a, b) => (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt));
  }

  /* ---------- Отрисовка ---------- */
  // Подсвечивает совпадения с поисковым запросом через <mark> (без innerHTML)
  function highlight(node, text) {
    const q = query.trim();
    node.replaceChildren();
    if (!q) { node.textContent = text; return; }
    const lower = text.toLowerCase();
    const needle = q.toLowerCase();
    let pos = 0;
    let idx;
    while ((idx = lower.indexOf(needle, pos)) !== -1) {
      node.append(text.slice(pos, idx), el('mark', { text: text.slice(idx, idx + q.length) }));
      pos = idx + q.length;
    }
    node.append(text.slice(pos));
  }

  function createNoteEl(note) {
    const node = el('article.note', { tabindex: '0', dataset: { id: note.id } },
      el('div.note__head', {},
        el('h3.note__title'),
        el('button.mini-btn.pin-btn', { type: 'button', dataset: { action: 'pin' } }, icon('pin'))
      ),
      el('p.note__text'),
      el('div.note__foot', {},
        el('time.note__date'),
        el('div.note__actions', {},
          el('button.mini-btn', { type: 'button', 'aria-label': 'Редактировать', title: 'Редактировать', dataset: { action: 'edit' } }, icon('edit')),
          el('button.mini-btn.mini-btn--danger', { type: 'button', 'aria-label': 'Удалить', title: 'Удалить', dataset: { action: 'delete' } }, icon('trash'))
        )
      )
    );
    fillNoteEl(node, note);
    return node;
  }

  // Обновляет содержимое существующей карточки (узел сохраняется для FLIP-анимации)
  function fillNoteEl(node, note) {
    node.dataset.color = note.color || 'default';
    node.classList.toggle('is-pinned', note.pinned);
    highlight(node.querySelector('.note__title'), note.title);
    const textEl = node.querySelector('.note__text');
    highlight(textEl, note.text);
    textEl.hidden = !note.text;
    const pin = node.querySelector('.pin-btn');
    const pinLabel = note.pinned ? 'Открепить' : 'Закрепить';
    pin.setAttribute('aria-label', pinLabel);
    pin.title = pinLabel;
    pin.setAttribute('aria-pressed', String(note.pinned));
    const time = node.querySelector('.note__date');
    time.textContent = U.formatStamp(note.updatedAt);
    time.dateTime = new Date(note.updatedAt).toISOString();
  }

  // Ключевая отрисовка: переиспользует узлы по id и плавно двигает их на новые места
  function render({ enterId = null } = {}) {
    const items = visibleNotes();
    const existing = new Map([...dom.grid.children].map((n) => [n.dataset.id, n]));
    const focused = document.activeElement;

    U.flip(dom.grid, () => {
      const nodes = items.map((note) => {
        let node = existing.get(note.id);
        if (node) {
          fillNoteEl(node, note);
          existing.delete(note.id);
        } else {
          node = createNoteEl(note);
          if (note.id === enterId) {
            node.classList.add('is-entering');
            node.addEventListener('animationend', () => node.classList.remove('is-entering'), { once: true });
          }
        }
        return node;
      });
      dom.grid.replaceChildren(...nodes);
    });

    if (focused && dom.grid.contains(focused)) focused.focus({ preventScroll: true });

    const empty = items.length === 0;
    dom.empty.hidden = !empty;
    dom.emptyText.textContent = query.trim() ? 'Ничего не найдено' : 'Здесь появятся ваши заметки';
  }

  /* ---------- Действия ---------- */
  function togglePin(id) {
    setNotes(notes().map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
    render();
  }

  async function remove(id) {
    const list = notes();
    const index = list.findIndex((n) => n.id === id);
    if (index < 0) return;
    const note = list[index];
    setNotes(list.filter((n) => n.id !== id));

    const node = dom.grid.querySelector(`[data-id="${id}"]`);
    if (node) {
      await U.animateOut(node);
      node.remove();
    }
    render();

    U.toast('Заметка удалена', {
      action: 'Отменить',
      onAction: () => {
        setNotes([...notes(), note]);
        render({ enterId: note.id });
      },
    });
  }

  /* ---------- Редактор ---------- */
  function renderSwatches() {
    dom.colors.replaceChildren(...COLORS.map((c) => {
      const btn = el('button.swatch', {
        type: 'button', role: 'radio', title: c.label, 'aria-label': c.label,
        'aria-checked': String(c.id === pickedColor), dataset: { color: c.id },
      });
      btn.style.background = `var(--note-${c.id})`;
      return btn;
    }));
  }

  function openEditor(id = null) {
    editingId = id;
    const note = id ? notes().find((n) => n.id === id) : null;
    dom.dialogTitle.textContent = note ? 'Редактировать заметку' : 'Новая заметка';
    dom.title.value = note ? note.title : '';
    dom.text.value = note ? note.text : '';
    pickedColor = note ? note.color || 'default' : 'default';
    renderSwatches();
    dom.dialog.classList.remove('is-closing');
    dom.dialog.showModal();
    (note ? dom.text : dom.title).focus();
  }

  async function closeEditor() {
    if (!dom.dialog.open || dom.dialog.classList.contains('is-closing')) return;
    await U.animateOut(dom.dialog, 'is-closing');
    dom.dialog.close();
    dom.dialog.classList.remove('is-closing');
  }

  function saveEditor() {
    const title = dom.title.value.trim();
    const text = dom.text.value.trim();
    if (!title && !text) {
      dom.title.focus();
      U.replayClass(dom.title, 'shake', 400);
      return;
    }
    const now = Date.now();
    let enterId = null;

    if (editingId) {
      setNotes(notes().map((n) => (n.id === editingId ? { ...n, title, text, color: pickedColor, updatedAt: now } : n)));
    } else {
      const note = { id: U.uid(), title, text, color: pickedColor, pinned: false, createdAt: now, updatedAt: now };
      setNotes([...notes(), note]);
      enterId = note.id;
      // Сбрасываем поиск, чтобы новая заметка точно была видна
      if (query) { query = ''; dom.search.value = ''; }
    }
    closeEditor();
    render({ enterId });
  }

  /* ---------- Инициализация ---------- */
  function init() {
    Object.assign(dom, {
      grid: document.getElementById('notesGrid'),
      empty: document.getElementById('notesEmpty'),
      emptyText: document.getElementById('notesEmptyText'),
      search: document.getElementById('noteSearch'),
      dialog: document.getElementById('noteDialog'),
      dialogTitle: document.getElementById('noteDialogTitle'),
      form: document.getElementById('noteForm'),
      title: document.getElementById('noteTitle'),
      text: document.getElementById('noteText'),
      colors: document.getElementById('noteColors'),
    });

    document.getElementById('newNoteBtn').addEventListener('click', () => openEditor());

    dom.search.addEventListener('input', () => {
      query = dom.search.value;
      render();
    });

    // Клик по карточке — редактирование, по кнопкам — соответствующее действие
    dom.grid.addEventListener('click', (e) => {
      const card = e.target.closest('.note');
      if (!card) return;
      const action = e.target.closest('[data-action]')?.dataset.action || 'edit';
      if (action === 'pin') togglePin(card.dataset.id);
      else if (action === 'delete') remove(card.dataset.id);
      else openEditor(card.dataset.id);
    });
    dom.grid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.classList.contains('note')) openEditor(e.target.dataset.id);
    });

    dom.colors.addEventListener('click', (e) => {
      const btn = e.target.closest('.swatch');
      if (!btn) return;
      pickedColor = btn.dataset.color;
      dom.colors.querySelectorAll('.swatch').forEach((s) => s.setAttribute('aria-checked', String(s === btn)));
    });

    dom.form.addEventListener('submit', (e) => { e.preventDefault(); saveEditor(); });
    // Ctrl/Cmd + Enter — сохранить из текстового поля
    dom.text.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveEditor(); }
    });
    dom.dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeEditor));
    dom.dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeEditor(); }); // Esc
    dom.dialog.addEventListener('click', (e) => { if (e.target === dom.dialog) closeEditor(); }); // клик по фону

    render();
  }

  App.notes = { init, openEditor, focusSearch: () => dom.search.focus() };
})(window.App = window.App || {});
