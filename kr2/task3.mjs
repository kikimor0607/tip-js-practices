// КР2, задание 3: getTasks с фильтрами из ПР5.
// Сначала в другом терминале: cd practice-05 && npm start
// Запуск из корня репозитория: node kr2/task3.mjs
import { createApiClient } from "../practice-05/src/api-client.js";
import { createTaskApi } from "../practice-05/src/task-api.js";

const baseUrl = process.env.API_URL ?? "http://127.0.0.1:5505/api";

// Обёртка над fetch только печатает URL, чтобы было видно query-параметры.
const loggingFetch = (url, options) => {
  console.log(`${options.method} ${url}`);
  return fetch(url, options);
};

const api = createTaskApi(createApiClient({ baseUrl, fetchFn: loggingFetch }));

try {
  const { tasks, meta } = await api.getTasks({ completed: false, priority: "high" });
  console.log("id:", tasks.map((task) => task.id));
  console.log("meta.total:", meta.total);
} catch (error) {
  console.error(`Ошибка (${error.kind}): ${error.message}`);
  if (error.kind === "network") console.error("API не запущен: cd practice-05 && npm start");
  process.exitCode = 1;
}
