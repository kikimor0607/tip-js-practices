const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const MAX_TITLE_LENGTH = 100;

// Возвращает текст ошибки для числового id или null.
function checkIdNumber(id) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return "Идентификатор должен быть положительным целым числом";
  }
  return null;
}

// Преобразует сырое значение поля id в число.
// Пустая строка и строка из пробелов не превращаются в 0, а отклоняются.
function parseDraftId(rawId) {
  if (typeof rawId === "number") return rawId;
  if (typeof rawId !== "string" || rawId.trim() === "") return Number.NaN;
  return Number(rawId);
}

// Чистая проверка данных формы. DOM и показ сообщений выполняются в main.js.
// draft: { id, title, priority }; editingId: null либо id редактируемой задачи.
export function validateTaskDraft(draft, tasks, editingId = null) {
  const errors = {};
  let id;

  if (editingId === null) {
    // Режим создания: id берётся из формы и должен быть уникальным.
    id = parseDraftId(draft.id);
    const idError = checkIdNumber(id);
    if (idError !== null) {
      errors.id = idError;
    } else if (tasks.some((task) => task.id === id)) {
      errors.id = `Задача с id = ${id} уже существует`;
    }
  } else {
    // Режим редактирования: draft.id не используется (поле disabled).
    id = editingId;
    const idError = checkIdNumber(id);
    if (idError !== null) {
      errors.id = idError;
    } else if (!tasks.some((task) => task.id === id)) {
      errors.id = `Редактируемая задача с id = ${id} не найдена`;
    }
  }

  let title = "";
  if (typeof draft.title !== "string") {
    errors.title = "Название должно быть строкой";
  } else {
    title = draft.title.trim();
    if (title.length === 0) {
      errors.title = "Название не должно быть пустым или состоять из пробелов";
    } else if (title.length > MAX_TITLE_LENGTH) {
      errors.title = `Название должно быть не длиннее ${MAX_TITLE_LENGTH} символов`;
    }
  }

  const { priority } = draft;
  if (!ALLOWED_PRIORITIES.has(priority)) {
    errors.priority = "Выберите приоритет: low, medium или high";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { id, title, priority } };
}
