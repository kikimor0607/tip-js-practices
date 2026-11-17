const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

// Возвращает { valid, value, errors }.
// value содержит нормализованные title, priority и числовой categoryId.
// Функция не читает DOM и не изменяет входные объекты.
export function validateTaskDraft(draft, categories) {
  const errors = {};
  const source = draft && typeof draft === "object" ? draft : {};
  const knownCategories = Array.isArray(categories) ? categories : [];

  let title = "";
  if (typeof source.title !== "string") {
    errors.title = "Название должно быть строкой.";
  } else {
    title = source.title.trim();
    if (title.length === 0) errors.title = "Введите название задачи.";
    else if (title.length > 100) errors.title = "Название должно быть не длиннее 100 символов.";
  }

  const { priority } = source;
  if (!ALLOWED_PRIORITIES.has(priority)) {
    errors.priority = "Выберите приоритет: низкий, средний или высокий.";
  }

  // Значение select приходит строкой; пустая строка не превращается в 0.
  const rawCategory = source.categoryId;
  const categoryId = typeof rawCategory === "string"
    ? (rawCategory.trim() === "" ? Number.NaN : Number(rawCategory))
    : rawCategory;
  if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
    errors.categoryId = "Выберите категорию.";
  } else if (!knownCategories.some((category) => category.id === categoryId)) {
    errors.categoryId = "Такой категории нет в загруженном справочнике.";
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    value: valid ? { title, priority, categoryId } : null,
    errors,
  };
}
