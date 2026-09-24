"use strict";

const totalTasks = 20;
const completedTasks = 11;
const dailyLimit = 6;

if (typeof totalTasks != "number" || typeof completedTasks != "number" || !Number.isInteger(totalTasks) || !Number.isInteger(completedTasks) || !Number.isInteger(dailyLimit) || typeof dailyLimit != "number") {
    console.log("Ошибка: totalTasks и completedTasks должны быть целыми числами");
} else if (1000 < totalTasks || totalTasks < 0 || 1000 < completedTasks || completedTasks < 0) {
    console.log("Ошибка: totalTasks, completedTasks должны быть в диапазоне от 0 до 1000");
} else if (totalTasks === 0 && completedTasks === 0) {
    console.log("Потребуется дней: 0");
} else if (totalTasks < completedTasks) {
    console.log("Ошибка: выполнено больше, чем существует");
} else if(1000 < dailyLimit || dailyLimit < 1) {
    console.log("Ошибка: dailyLimit должен быть в диапазоне от 1 до 1000");
} else {
    let ostTasks = totalTasks - completedTasks;
    let days = 0;
    if (ostTasks !== 0) {
        while (ostTasks > 0) {
            days += 1;
            let tasksToday= Math.min(dailyLimit, ostTasks);
            ostTasks -= tasksToday;
            console.log("День " + days + ": выполнено " + tasksToday + ", осталось " + ostTasks);
        }
    }
    console.log("Потребуется дней: " + days);
}