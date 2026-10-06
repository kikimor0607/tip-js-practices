import { demoTasks, variantNumber, variantTasks } from "./data.js";
import {
  findTaskById,
  getPendingTasks,
  getTaskTitles,
  getTaskStats,
  addTask,
  setTaskCompleted,
  renameTask,
  removeTask,
} from "./task-service.js";

// --- Вспомогательные функции вывода (только отображение, без прикладной логики) ---

function printStats(label, tasks) {
  const { total, completed, pending, progress } = getTaskStats(tasks);
  const progressText = total === 0 ? "Задач пока нет" : `${progress.toFixed(1)}%`;
  console.log(
    `[${label}] Всего: ${total}; выполнено: ${completed}; осталось: ${pending}; прогресс: ${progressText}`
  );
}

function printIds(label, tasks) {
  console.log(`${label}:`, tasks.map((task) => task.id));
}

// Применяет результат операции: при успехе возвращает новый список, при отказе — прежний.
function applyResult(currentTasks, result, label) {
  if (result.ok) {
    printStats(label, result.tasks);
    return result.tasks;
  }
  console.error(`Ошибка (${label}): ${result.error}`);
  printStats(`${label} — состояние не изменилось`, currentTasks);
  return currentTasks;
}

// Снимок полей для проверки сохранности исходных данных.
function snapshot(tasks) {
  return JSON.stringify(tasks);
}

// ================= Общий сценарий =================

console.log("===== Общий сценарий =====");
const demoSnapshot = snapshot(demoTasks);

let currentTasks = demoTasks;

console.table(currentTasks);
console.log("Названия:", getTaskTitles(currentTasks));
printIds("Невыполненные задачи (id)", getPendingTasks(currentTasks));
printStats("Исходный набор", currentTasks);

currentTasks = applyResult(
  currentTasks,
  addTask(currentTasks, 20, "Добавить проверку", "high"),
  "После добавления id 20"
);

currentTasks = applyResult(
  currentTasks,
  setTaskCompleted(currentTasks, 4, true),
  "После выполнения id 4"
);

currentTasks = applyResult(
  currentTasks,
  renameTask(currentTasks, 10, "Подготовить инструкцию запуска"),
  "После переименования id 10"
);

currentTasks = applyResult(
  currentTasks,
  removeTask(currentTasks, 7),
  "После удаления id 7"
);

// Демонстрация отказов: состояние не должно меняться.
currentTasks = applyResult(
  currentTasks,
  addTask(currentTasks, 4, "Повтор id"),
  "Повторный id 4"
);
currentTasks = applyResult(
  currentTasks,
  setTaskCompleted(currentTasks, 1, "false"),
  "Статус строкой"
);
currentTasks = applyResult(
  currentTasks,
  removeTask(currentTasks, 777),
  "Удаление отсутствующей id 777"
);

console.table(currentTasks);
printIds("Итоговые идентификаторы", currentTasks);
printIds("Невыполненные задачи (id)", getPendingTasks(currentTasks));
console.log("Задача id 10 сейчас:", findTaskById(currentTasks, 10));
console.log("demoTasks не изменился:", snapshot(demoTasks) === demoSnapshot);
console.table(demoTasks);

// ================= Индивидуальный вариант =================

console.log(`\n===== Вариант ${variantNumber}: подготовка семинара =====`);
const variantSnapshot = snapshot(variantTasks);

let variantCurrent = variantTasks;

console.table(variantCurrent);
printStats("Исходный набор варианта", variantCurrent);

variantCurrent = applyResult(
  variantCurrent,
  addTask(variantCurrent, 80, "Подвести итоги семинара", "high"),
  "После добавления id 80"
);

variantCurrent = applyResult(
  variantCurrent,
  setTaskCompleted(variantCurrent, 11, true),
  "После выполнения id 11"
);

variantCurrent = applyResult(
  variantCurrent,
  renameTask(variantCurrent, 23, "Забронировать аудиторию с проектором"),
  "После переименования id 23"
);

variantCurrent = applyResult(
  variantCurrent,
  removeTask(variantCurrent, 37),
  "После удаления id 37"
);

variantCurrent = applyResult(
  variantCurrent,
  addTask(variantCurrent, 80, "Повторная задача", "high"),
  "Повторное добавление id 80"
);

console.table(variantCurrent);
printIds("Итоговые идентификаторы варианта", variantCurrent);
console.log("variantTasks не изменился:", snapshot(variantTasks) === variantSnapshot);
