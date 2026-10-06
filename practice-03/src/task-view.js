import { getTaskStats } from "./task-service.js";

// Здесь создаётся DOM, но не изменяется состояние приложения и не назначаются обработчики.

const priorityLabels = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

// Создаёт кнопку действия с вложенной подписью span.action-label.
function createActionButton(action, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;

  const span = document.createElement("span");
  span.classList.add("action-label");
  span.textContent = label;

  button.append(span);
  return button;
}

export function createTaskElement(task) {
  const card = document.createElement("li");
  card.classList.add("task-card");
  card.classList.toggle("is-completed", task.completed);
  card.dataset.taskId = String(task.id);

  const title = document.createElement("h3");
  title.classList.add("task-title");
  title.textContent = task.title; // текст, а не HTML

  const status = document.createElement("p");
  status.classList.add("task-status");
  status.textContent = task.completed ? "Выполнена" : "В работе";

  const priority = document.createElement("p");
  priority.classList.add("task-priority");
  priority.textContent = priorityLabels[task.priority];

  const toggleButton = createActionButton("toggle", "Выполнена");
  toggleButton.setAttribute("aria-pressed", String(task.completed));

  const deleteButton = createActionButton("delete", "Удалить");

  const actions = document.createElement("div");
  actions.classList.add("task-actions");
  actions.append(toggleButton, deleteButton);

  card.append(title, status, priority, actions);
  return card;
}

export function renderTaskList(listElement, tasks) {
  const cards = tasks.map((task) => createTaskElement(task));
  // Заменяются только дочерние элементы; сам ul и его обработчик сохраняются.
  listElement.replaceChildren(...cards);
}

export function renderSummary(summaryElement, tasks, visibleCount) {
  // tasks — ВЕСЬ текущий массив, visibleCount — длина отфильтрованной выборки.
  const { total, completed, pending, progress } = getTaskStats(tasks);

  summaryElement.querySelector('[data-stat="total"]').textContent = String(total);
  summaryElement.querySelector('[data-stat="completed"]').textContent = String(completed);
  summaryElement.querySelector('[data-stat="pending"]').textContent = String(pending);
  summaryElement.querySelector('[data-stat="progress"]').textContent = `${progress.toFixed(1)}%`;
  summaryElement.querySelector('[data-stat="visible"]').textContent = String(visibleCount);
}

export function renderEmptyState(messageElement, total, visibleCount) {
  if (visibleCount > 0) {
    messageElement.textContent = "";
    messageElement.hidden = true;
  } else if (total === 0) {
    messageElement.textContent = "Список задач пуст.";
    messageElement.hidden = false;
  } else {
    messageElement.textContent = "Нет задач по выбранному фильтру.";
    messageElement.hidden = false;
  }
}
