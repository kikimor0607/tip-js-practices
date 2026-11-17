const PRIORITY_LABELS = Object.freeze({
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
});

function createActionButton(action, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;
  const span = document.createElement("span");
  span.className = "action-label";
  span.textContent = label;
  button.append(span);
  return button;
}

function createMetaItem(className, text) {
  const node = document.createElement("span");
  node.className = className;
  node.textContent = text;
  return node;
}

// Серверные строки считаются недоверенными и выводятся только через textContent.
export function createTaskElement(task, category) {
  const card = document.createElement("li");
  card.className = "task-card";
  card.classList.toggle("is-completed", task.completed);
  card.dataset.taskId = String(task.id);

  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;

  const meta = document.createElement("p");
  meta.className = "task-meta";
  meta.append(
    createMetaItem("task-status", task.completed ? "Выполнена" : "В работе"),
    createMetaItem("task-priority", `Приоритет: ${PRIORITY_LABELS[task.priority] ?? task.priority}`),
    createMetaItem("task-category", category?.name ?? "Без категории"),
  );

  const toggle = createActionButton("toggle", task.completed ? "Вернуть в работу" : "Выполнена");
  toggle.setAttribute("aria-pressed", String(task.completed));

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(
    toggle,
    createActionButton("edit", "Изменить"),
    createActionButton("delete", "Удалить"),
  );

  card.append(title, meta, actions);
  return card;
}

export function renderTaskList(list, tasks, categories) {
  const byId = new Map((categories ?? []).map((category) => [category.id, category]));
  // replaceChildren удаляет старые карточки, повторная отрисовка не накапливает их.
  list.replaceChildren(...tasks.map((task) => createTaskElement(task, byId.get(task.categoryId))));
}
