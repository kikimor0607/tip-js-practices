// Прикладная логика работы со списком задач.
// Функции не выводят ничего в консоль и не меняют переданные массивы и объекты.
// Ожидаемые ошибки возвращаются как данные: { ok: false, error: "..." }.

const allowedPriorities = ["low", "medium", "high"];

// --- Внутренние проверки (не экспортируются) ---

// Возвращает текст ошибки или null, если id корректен.
function validateId(id) {
  if (typeof id !== "number") {
    return "Идентификатор должен быть числом";
  }
  if (!Number.isSafeInteger(id) || id <= 0) {
    return "Идентификатор должен быть положительным безопасным целым числом";
  }
  return null;
}

// Возвращает { ok: true, title } с очищенным названием или { ok: false, error }.
function normalizeTitle(title) {
  if (typeof title !== "string") {
    return { ok: false, error: "Название должно быть строкой" };
  }
  const cleanTitle = title.trim();
  if (cleanTitle.length === 0) {
    return { ok: false, error: "Название не должно быть пустым" };
  }
  if (cleanTitle.length > 100) {
    return { ok: false, error: "Название должно быть не длиннее 100 символов" };
  }
  return { ok: true, title: cleanTitle };
}

// --- Задание 2. Создание задачи ---

export function createTask(id, title, priority = "medium") {
  const idError = validateId(id);
  if (idError !== null) {
    return { ok: false, error: idError };
  }

  const titleResult = normalizeTitle(title);
  if (!titleResult.ok) {
    return { ok: false, error: titleResult.error };
  }

  if (!allowedPriorities.includes(priority)) {
    return { ok: false, error: 'Приоритет должен быть "low", "medium" или "high"' };
  }

  return {
    ok: true,
    task: { id, title: titleResult.title, completed: false, priority },
  };
}

// --- Задание 3. Чтение списка ---

export function findTaskById(tasks, id) {
  return tasks.find((task) => task.id === id);
}

export function getPendingTasks(tasks) {
  return tasks.filter((task) => task.completed === false);
}

export function getTaskTitles(tasks) {
  return tasks.map((task) => task.title);
}

export function getTaskStats(tasks) {
  const total = tasks.length;
  let completed = 0;

  for (const task of tasks) {
    if (task.completed === true) {
      completed += 1;
    }
  }

  const pending = total - completed;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return { total, completed, pending, progress };
}

// --- Задание 4. Изменение данных ---

export function addTask(tasks, id, title, priority = "medium") {
  const created = createTask(id, title, priority);
  if (!created.ok) {
    return { ok: false, error: created.error };
  }

  if (findTaskById(tasks, id) !== undefined) {
    return { ok: false, error: `Задача с id = ${id} уже существует` };
  }

  return { ok: true, tasks: [...tasks, created.task] };
}

export function setTaskCompleted(tasks, id, completed) {
  const idError = validateId(id);
  if (idError !== null) {
    return { ok: false, error: idError };
  }

  if (typeof completed !== "boolean") {
    return { ok: false, error: "Статус выполнения должен быть true или false" };
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с id = ${id} не найдена` };
  }

  const newTasks = tasks.map((task) =>
    task.id === id ? { ...task, completed } : task
  );
  return { ok: true, tasks: newTasks };
}

export function renameTask(tasks, id, title) {
  const idError = validateId(id);
  if (idError !== null) {
    return { ok: false, error: idError };
  }

  const titleResult = normalizeTitle(title);
  if (!titleResult.ok) {
    return { ok: false, error: titleResult.error };
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с id = ${id} не найдена` };
  }

  const newTasks = tasks.map((task) =>
    task.id === id ? { ...task, title: titleResult.title } : task
  );
  return { ok: true, tasks: newTasks };
}

export function removeTask(tasks, id) {
  const idError = validateId(id);
  if (idError !== null) {
    return { ok: false, error: idError };
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с id = ${id} не найдена` };
  }

  return { ok: true, tasks: tasks.filter((task) => task.id !== id) };
}
