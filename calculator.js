// ==========================================
// 3. DOG FOOD CALCULATOR MODULE
// ==========================================
if (document.getElementById('adultWeight')) {
    const tableWeights = [1, 5, 10, 20, 30, 40, 50, 70];
    const tableAges = [1.5, 3, 6, 9, 12, 18, 24];

    const dataMatrix = {
        1:  [30, 35, 30, 30, 30, 30, 30],
        5:  [95, 115, 105, 100, 100, 100, 100],
        10: [150, 195, 180, 195, 170, 170, 170],
        20: [285, 290, 365, 315, 285, 285, 285],
        30: [315, 365, 470, 410, 445, 385, 385],
        40: [340, 480, 555, 645, 540, 480, 480],
        50: [365, 570, 655, 765, 635, 665, 565],
        70: [435, 730, 845, 985, 805, 840, 730]
    };

    function interpolate1D(val, xArr, yArr) {
        if (val <= xArr[0]) return yArr[0];
        if (val >= xArr[xArr.length - 1]) return yArr[yArr.length - 1];

        for (let i = 0; i < xArr.length - 1; i++) {
            if (val >= xArr[i] && val <= xArr[i + 1]) {
                const ratio = (val - xArr[i]) / (xArr[i + 1] - xArr[i]);
                return yArr[i] + ratio * (yArr[i + 1] - yArr[i]);
            }
        }
        return yArr[yArr.length - 1];
    }

    function calculateRation(weight, age) {
        const rationsAtAge = tableWeights.map(w => interpolate1D(age, tableAges, dataMatrix[w]));
        return interpolate1D(weight, tableWeights, rationsAtAge);
    }

    const inputs = {
        adultWeight: document.getElementById('adultWeight'),
        age: document.getElementById('age'),
        meals: document.getElementById('meals')
    };

    const transitionGroup = document.getElementById('transitionGroup');
    const transitionDay = document.getElementById('transitionDay');
    const transitionDayLabel = document.getElementById('transitionDayLabel');

    const outputs = {
        dailyTotal: document.getElementById('dailyTotal'),
        perMeal: document.getElementById('perMeal'),
        mainLabel: document.getElementById('mainResultLabel')
    };

    const stateMgr = new StateManager('dog_food_calc', inputs, calculateDogFood);

    function calculateDogFood() {
        stateMgr.saveCurrentState();

        const weight = parseFloat(inputs.adultWeight.value) || 0;
        const age = parseFloat(inputs.age.value) || 0;
        const mode = inputs.meals.value;

        if (weight <= 0 || age <= 0) {
            outputs.dailyTotal.textContent = '0 g/jour';
            outputs.perMeal.textContent = '0 g';
            return;
        }

        const totalDaily = Math.round(calculateRation(weight, age));
        outputs.dailyTotal.textContent = `${totalDaily} g/jour`;

        if (mode === 'transition') {
            transitionGroup.style.display = 'block';
            
            // Lunch baseline is 1/3 of total daily ration
            const baseLunch = Math.round(totalDaily / 3);
            
            // At 10g per day, calculate how many days are needed to empty lunch
            const maxDays = Math.ceil(baseLunch / 10);
            transitionDay.max = maxDays;

            const day = parseInt(transitionDay.value) || 0;
            transitionDayLabel.textContent = day === 0 ? "Départ (3 repas égaux)" : `Jour ${day} / ${maxDays}`;

            // Reduce lunch by 10g/day, add 5g/day to morning and evening
            const lunch = Math.max(0, baseLunch - (day * 10));
            const morning = Math.round(baseLunch + (day * 5));
            const evening = totalDaily - morning - lunch;

            outputs.mainLabel.textContent = "Portions du jour";
            outputs.perMeal.innerHTML = `Matin: <strong>${morning}g</strong> | Midi: <strong>${lunch}g</strong> | Soir: <strong>${evening}g</strong>`;
        } else {
            transitionGroup.style.display = 'none';
            const meals = parseInt(mode) || 1;
            const perMeal = Math.round(totalDaily / meals);
            outputs.mainLabel.textContent = "Dose par repas";
            outputs.perMeal.textContent = `${perMeal} g / repas`;
        }
    }

    inputs.adultWeight.addEventListener('input', calculateDogFood);
    inputs.age.addEventListener('input', calculateDogFood);
    inputs.meals.addEventListener('change', calculateDogFood);
    transitionDay.addEventListener('input', calculateDogFood);

    stateMgr.init();
    calculateDogFood();
}
