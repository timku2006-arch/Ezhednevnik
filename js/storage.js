/* Хранилище: всё состояние приложения в одном ключе localStorage */
(function (App) {
  'use strict';

  const KEY = 'ezhednevnik:v1';

  // tasks: { 'YYYY-MM-DD': [{ id, text, done, createdAt }] }
  // notes: [{ id, title, text, color, pinned, createdAt, updatedAt }]
  const defaults = () => ({ tasks: {}, notes: [], theme: null });

  let state = defaults();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      state = {
        ...defaults(),
        ...parsed,
        tasks: parsed.tasks && typeof parsed.tasks === 'object' ? parsed.tasks : {},
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      };
    } catch (err) {
      console.warn('Не удалось прочитать данные, начинаем с чистого листа', err);
      state = defaults();
    }
    return state;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Не удалось сохранить данные', err);
    }
  }

  App.store = {
    load,
    save,
    get state() { return state; },
  };
})(window.App = window.App || {});
