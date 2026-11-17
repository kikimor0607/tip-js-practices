// КР2, задание 1: чистая валидация формы из ПР4.
// Запуск из корня репозитория: node kr2/task1.mjs
import { validateTaskDraft } from "../practice-04/src/form-validation.js";

const tasks = [];

const correct = validateTaskDraft({ id: "20", title: " Изучить localStorage ", priority: "high" }, tasks);
console.log('1) title: " Изучить localStorage "');
console.log(correct);
console.log(`   title без краевых пробелов: "${correct.value?.title}"`);

const spaces = validateTaskDraft({ id: "20", title: " ", priority: "high" }, tasks);
console.log('\n2) title: " "');
console.log(spaces);
