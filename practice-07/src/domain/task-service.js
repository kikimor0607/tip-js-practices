// Чистые функции: без React, DOM, сети, случайных значений и изменения аргументов.
// Точные контракты и допустимые входы приведены в методичке.
const PRIORITIES = ['low', 'medium', 'high'];

// Строка поля select → число. '2x', '' и дроби не принимаются (parseInt здесь не подходит).
function toCategoryId(raw) {
  if (typeof raw === 'number') return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw.trim())) return null;
  const value = Number(raw.trim());
  return Number.isSafeInteger(value) ? value : null;
}

export function validateTaskDraft(draft, categories) {
  const errors = {};

  const title = typeof draft?.title === 'string' ? draft.title.trim() : '';
  if (typeof draft?.title !== 'string') errors.title = 'Название должно быть строкой.';
  else if (title.length === 0) errors.title = 'Введите название задачи.';
  else if (title.length > 100) errors.title = 'Название должно быть не длиннее 100 символов.';

  const priority = draft?.priority;
  if (!PRIORITIES.includes(priority)) errors.priority = 'Выберите приоритет: низкий, средний или высокий.';

  const categoryId = toCategoryId(draft?.categoryId);
  if (categoryId === null) errors.categoryId = 'Выберите категорию.';
  else if (!categories.some(category => category.id === categoryId)) errors.categoryId = 'Такой категории нет в справочнике.';

  const valid = Object.keys(errors).length === 0;
  return { valid, value: valid ? { title, priority, categoryId } : null, errors };
}

export function selectTasks(tasks, filters) {
  const q = filters.q.trim().toLocaleLowerCase('ru-RU');
  return tasks.filter(task => {
    if (q && !task.title.toLocaleLowerCase('ru-RU').includes(q)) return false;
    // Явное сравнение со строкой: Boolean('false') === true.
    if (filters.completed === 'true' && task.completed !== true) return false;
    if (filters.completed === 'false' && task.completed !== false) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.categoryId && task.categoryId !== Number(filters.categoryId)) return false;
    return true;
  });
}

export function getTaskStats(tasks) {
  const completed = tasks.filter(task => task.completed).length;
  return { total: tasks.length, completed, active: tasks.length - completed };
}

export function addTask(tasks, value, id) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new RangeError(`Некорректный id: ${id}`);
  if (tasks.some(task => task.id === id)) throw new RangeError(`id ${id} уже занят`);
  return [...tasks, { id, title: value.title, priority: value.priority, categoryId: value.categoryId, completed: false }];
}

export function updateTask(tasks, id, value) {
  if (!tasks.some(task => task.id === id)) return tasks;
  // Новый объект: id и completed сохраняются, меняются только три поля формы.
  return tasks.map(task => task.id === id
    ? { ...task, title: value.title, priority: value.priority, categoryId: value.categoryId }
    : task);
}

export function toggleTask(tasks, id) {
  if (!tasks.some(task => task.id === id)) return tasks;
  return tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task);
}

export function removeTask(tasks, id) {
  if (!tasks.some(task => task.id === id)) return tasks;
  return tasks.filter(task => task.id !== id);
}
