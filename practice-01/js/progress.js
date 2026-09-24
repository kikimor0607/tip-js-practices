"use strict";

const totalTasks = 20;
const completedTasks = 11;

if (typeof totalTasks != "number" || typeof completedTasks != "number" || !Number.isInteger(totalTasks) || !Number.isInteger(completedTasks)) {
    console.log("Ошибка: totalTasks и completedTasks должны быть целыми числами");
} else if (1000 < totalTasks || totalTasks < 0 || 1000 < completedTasks || completedTasks < 0) {
    console.log("Ошибка: totalTasks и completedTasks должны быть в диапазоне от 0 до 1000");
} else if (totalTasks === 0 && completedTasks === 0) {
    console.log("Задач пока нет");
} else if (totalTasks < completedTasks) {
    console.log("Ошибка: выполнено больше, чем существует");
} else {
    const progress = (completedTasks / totalTasks) * 100;
    console.log("Всего задач: " + totalTasks);
    console.log("Выполнено задач: " + completedTasks);
    console.log("Осталось: " + (totalTasks - completedTasks));
    console.log("Прогресс: " + progress.toFixed(1) + "%");
    if (progress === 0) {
        console.log("Статус: Не начато");
    } else if (progress === 100) {
        console.log("Статус: Завершено");
    } else {
        console.log("Статус: В работе");
    }
}
