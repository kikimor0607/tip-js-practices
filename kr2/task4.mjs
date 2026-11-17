// КР2, задание 4: ошибка 404 для getTaskById(999) из ПР5.
// Сначала в другом терминале: cd practice-05 && npm start
// Запуск из корня репозитория: node kr2/task4.mjs
import { createApiClient } from "../practice-05/src/api-client.js";
import { createTaskApi } from "../practice-05/src/task-api.js";

const baseUrl = process.env.API_URL ?? "http://127.0.0.1:5505/api";
const api = createTaskApi(createApiClient({ baseUrl }));

try {
  await api.getTaskById(999);
  console.log("Ошибка не возникла — так быть не должно");
} catch (error) {
  console.log("kind:", error.kind);
  console.log("status:", error.status);
  console.log("code:", error.code);
  console.log("message:", error.message);
  if (error.kind === "network") console.log("API не запущен: cd practice-05 && npm start");
}
