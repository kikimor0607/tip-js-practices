import { ApiError } from "./api-client.js";
import { validateTaskDraft } from "./form-validation.js";

export function messageForError(error) {
  if (!(error instanceof ApiError)) return "Не удалось выполнить операцию.";
  if (error.kind === "timeout") return "Сервер не ответил вовремя. Попробуйте ещё раз.";
  if (error.kind === "network") return "Нет соединения с учебным API. Проверьте, запущен ли npm start.";
  if (error.kind === "invalid-response") return "Сервер вернул ответ неожиданного формата.";
  if (error.kind === "http" && error.status === 404) return "Запись уже отсутствует на сервере. Обновите список.";
  if (error.kind === "http") return error.message || `Сервер вернул ошибку ${error.status}.`;
  return "Не удалось выполнить операцию.";
}

const REQUIRED_API = ["loadInitialData", "getTasks", "createTask", "updateTask", "setTaskCompleted", "deleteTask", "resetDemoData"];
const REQUIRED_VIEW = ["setListState", "setTasks", "setCategories", "setTotal", "setFormTask", "showFormErrors", "setMutationPending", "notify"];

function isAborted(error) {
  return (error instanceof ApiError && error.kind === "aborted") || error?.name === "AbortError";
}

// view — адаптер из dom-app.js. Контроллер не должен обращаться к document.
// Обязательные методы результата:
// start, applyFilters, refresh, submit, beginEdit, cancelEdit,
// toggleTask, deleteTask, resetData и destroy.
export function createAppController({ api, view, validateDraft = validateTaskDraft } = {}) {
  if (!api || REQUIRED_API.some((name) => typeof api[name] !== "function")) {
    throw new TypeError(`api должен содержать методы: ${REQUIRED_API.join(", ")}`);
  }
  if (!view || REQUIRED_VIEW.some((name) => typeof view[name] !== "function")) {
    throw new TypeError(`view должен содержать методы: ${REQUIRED_VIEW.join(", ")}`);
  }
  if (typeof validateDraft !== "function") {
    throw new TypeError("validateDraft должен быть функцией");
  }

  // Снимок последнего ответа сервера и состояние интерфейса.
  let tasks = [];
  let categories = null; // null — справочник ещё не получен
  let filters = {};
  let editingId = null;
  let loadController = null; // AbortController активной загрузки
  let loadSequence = 0; // номер последней запущенной загрузки

  function applyTasks(list, total) {
    tasks = list;
    view.setTasks(list, categories);
    view.setTotal(total);
    view.setListState(list.length > 0 ? "ready" : "empty");
  }

  // Загружает список с текущими фильтрами. Если категорий ещё нет,
  // выполняется начальная параллельная загрузка задач и категорий.
  async function loadCurrentTasks() {
    loadController?.abort();
    const controller = new AbortController();
    loadController = controller;
    const sequence = ++loadSequence;
    const options = { signal: controller.signal };
    const needInitial = categories === null;

    view.setListState("loading");
    try {
      if (needInitial) {
        const result = await api.loadInitialData({ ...filters }, options);
        if (sequence !== loadSequence) return; // устаревший ответ
        categories = result.categories;
        view.setCategories(categories);
        applyTasks(result.tasks, result.meta?.total ?? result.tasks.length);
      } else {
        const result = await api.getTasks({ ...filters }, options);
        if (sequence !== loadSequence) return;
        applyTasks(result.tasks, result.meta?.total ?? result.tasks.length);
      }
    } catch (error) {
      // Отмена — управление потоком, а не ошибка пользователя.
      if (sequence !== loadSequence || isAborted(error)) return;
      view.setListState("error", messageForError(error));
    } finally {
      if (loadController === controller) loadController = null;
    }
  }

  // Общая схема изменяющей операции: блокировка → запрос → повторный GET → разблокировка.
  async function runMutation(action, successMessage, afterSuccess) {
    view.setMutationPending(true);
    try {
      await action();
      afterSuccess?.();
      view.notify(successMessage, "success");
      await loadCurrentTasks();
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.kind === "http"
        && error.code === "VALIDATION_ERROR" && error.details && typeof error.details === "object") {
        view.showFormErrors(error.details);
      }
      view.notify(messageForError(error), "error");
      return false;
    } finally {
      view.setMutationPending(false);
    }
  }

  function findTask(id) {
    return tasks.find((task) => task.id === id);
  }

  async function start(initialFilters = {}) {
    filters = { ...initialFilters };
    editingId = null;
    view.setFormTask(null);
    view.showFormErrors({});
    await loadCurrentTasks();
  }

  async function applyFilters(nextFilters = {}) {
    filters = { ...nextFilters };
    view.notify("");
    await loadCurrentTasks();
  }

  async function refresh() {
    await loadCurrentTasks();
  }

  async function submit(draft) {
    const result = validateDraft(draft, categories ?? []);
    view.showFormErrors(result.errors ?? {});
    if (!result.valid) {
      view.notify("Исправьте ошибки в форме.", "error");
      return false;
    }

    const id = editingId;
    const finishEdit = () => {
      editingId = null;
      view.setFormTask(null);
      view.showFormErrors({});
    };
    if (id === null) {
      return runMutation(() => api.createTask(result.value), "Задача создана.", finishEdit);
    }
    return runMutation(() => api.updateTask(id, result.value), `Задача № ${id} изменена.`, finishEdit);
  }

  function beginEdit(id) {
    const task = findTask(id);
    if (!task) {
      view.notify("Задача не найдена в текущем списке. Обновите список.", "error");
      return false;
    }
    editingId = id;
    view.showFormErrors({});
    view.setFormTask(task);
    view.notify("");
    return true;
  }

  function cancelEdit() {
    editingId = null;
    view.showFormErrors({});
    view.setFormTask(null);
  }

  async function toggleTask(id) {
    const task = findTask(id);
    if (!task) {
      view.notify("Задача не найдена в текущем списке. Обновите список.", "error");
      return false;
    }
    const next = !task.completed;
    return runMutation(
      () => api.setTaskCompleted(id, next),
      next ? `Задача № ${id} выполнена.` : `Задача № ${id} возвращена в работу.`,
    );
  }

  async function deleteTask(id) {
    return runMutation(() => api.deleteTask(id), `Задача № ${id} удалена.`, () => {
      if (editingId === id) cancelEdit();
    });
  }

  async function resetData() {
    return runMutation(() => api.resetDemoData(), "Исходный набор восстановлен.", cancelEdit);
  }

  function destroy() {
    loadController?.abort();
    loadController = null;
    loadSequence += 1; // любой ответ после destroy считается устаревшим
  }

  return {
    start,
    applyFilters,
    refresh,
    submit,
    beginEdit,
    cancelEdit,
    toggleTask,
    deleteTask,
    resetData,
    destroy,
  };
}
