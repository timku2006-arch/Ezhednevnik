/* Общие помощники: даты, DOM, анимации, тосты */
(function (App) {
  'use strict';

  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = () => motionQuery.matches;

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* ---------- Даты ---------- */
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const isSameDay = (a, b) => toKey(a) === toKey(b);
  const pad = (n) => String(n).padStart(2, '0');

  // Ключ дня в локальном времени (без сдвига часового пояса)
  function toKey(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function fromKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  const fmtLong = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
  const fmtWeekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' });
  const fmtMonth = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' });
  const fmtShort = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
  const fmtTime = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

  // «Сегодня», «Завтра», «Через 3 дня», «5 дней назад»
  function relativeDay(date) {
    const diff = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
    if (diff === 0) return 'Сегодня';
    if (diff === 1) return 'Завтра';
    if (diff === -1) return 'Вчера';
    const n = Math.abs(diff);
    const word = plural(n, ['день', 'дня', 'дней']);
    return diff > 0 ? `Через ${n} ${word}` : `${n} ${word} назад`;
  }

  function plural(n, [one, few, many]) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  // Дата изменения заметки: время для сегодняшних, иначе «12 окт.»
  function formatStamp(ts) {
    const d = new Date(ts);
    return isSameDay(d, new Date()) ? `Сегодня, ${fmtTime.format(d)}` : fmtShort.format(d);
  }

  /* ---------- DOM ---------- */
  // Небольшой конструктор элементов: el('button.mini-btn', { type: 'button' }, child...)
  function el(selector, attrs = {}, ...children) {
    const [tag, ...classes] = selector.split('.');
    const node = document.createElement(tag || 'div');
    if (classes.length) node.className = classes.join(' ');
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === 'text') node.textContent = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    node.append(...children.filter(Boolean));
    return node;
  }

  // SVG-иконка из спрайта
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#i-${name}`);
    svg.append(use);
    return svg;
  }

  /* ---------- Анимации ---------- */
  // Проигрывает CSS-анимацию по классу и ждёт её окончания (с запасным таймером)
  function animateOut(node, className = 'is-leaving') {
    return new Promise((resolve) => {
      if (reducedMotion()) return resolve();
      let timer;
      const done = (e) => {
        if (e && e.target !== node) return; // игнорируем анимации потомков
        node.removeEventListener('animationend', done);
        clearTimeout(timer);
        resolve();
      };
      node.addEventListener('animationend', done);
      timer = setTimeout(done, 600);
      node.classList.add(className);
    });
  }

  // Перезапуск класса-анимации (например, «всплеск» при повторном действии)
  function replayClass(node, className, duration = 500) {
    node.classList.remove(className);
    void node.offsetWidth; // принудительный reflow
    node.classList.add(className);
    clearTimeout(node[`_${className}`]);
    node[`_${className}`] = setTimeout(() => node.classList.remove(className), duration);
  }

  // FLIP: плавно перемещает элементы контейнера после изменения порядка
  function flip(container, mutate) {
    const before = new Map([...container.children].map((c) => [c, c.getBoundingClientRect()]));
    mutate();
    if (reducedMotion()) return;
    for (const child of container.children) {
      const first = before.get(child);
      if (!first) continue;
      const last = child.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      child.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: 320, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
      );
    }
  }

  /* ---------- Тосты ---------- */
  // toast('Задача удалена', { action: 'Отменить', onAction })
  function toast(message, { action, onAction, duration = 4000 } = {}) {
    const box = document.getElementById('toasts');
    const node = el('div.toast', { role: 'status' }, el('span', { text: message }));
    if (!action) node.classList.add('toast--plain');

    const close = async () => {
      if (node._closed) return;
      node._closed = true;
      clearTimeout(timer);
      await animateOut(node);
      node.remove();
    };

    if (action) {
      const btn = el('button.toast__action', { type: 'button', text: action });
      btn.addEventListener('click', () => { onAction && onAction(); close(); });
      node.append(btn);
    }

    // Оставляем максимум три тоста одновременно
    while (box.children.length >= 3) box.firstElementChild.remove();
    box.append(node);
    const timer = setTimeout(close, duration);
    return close;
  }

  App.utils = {
    reducedMotion, uid,
    startOfDay, addDays, isSameDay, toKey, fromKey, relativeDay, plural, formatStamp,
    fmtLong, fmtWeekday, fmtMonth,
    el, icon, animateOut, replayClass, flip, toast,
  };
})(window.App = window.App || {});
