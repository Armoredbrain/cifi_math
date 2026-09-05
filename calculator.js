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

    function getTodayString() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const inputs = {
        adultWeight: document.getElementById('adultWeight'),
        age: document.getElementById('age'),
        meals: document.getElementById('meals'),
        startDate: document.getElementById('startDate'),
        targetDate: document.getElementById('targetDate')
    };

    const transitionGroup = document.getElementById('transitionGroup');
    const transitionStatus = document.getElementById('transitionStatus');
    const standardResultBox = document.getElementById('standardResultBox');
    const transitionResultGrid = document.getElementById('transitionResultGrid');

    const outputs = {
        dailyTotal: document.getElementById('dailyTotal'),
        perMeal: document.getElementById('perMeal'),
        morningVal: document.getElementById('morningVal'),
        lunchVal: document.getElementById('lunchVal'),
        eveningVal: document.getElementById('eveningVal')
    };

    // Pre-fill default dates
    if (!inputs.startDate.value) inputs.startDate.value = getTodayString();
    if (!inputs.targetDate.value) inputs.targetDate.value = getTodayString();

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
            standardResultBox.style.display = 'none';
            transitionResultGrid.style.display = 'grid';

            const baseLunch = Math.round(totalDaily / 3);
            const maxDays = Math.ceil(baseLunch / 10);

            // Compute day index from dates (UTC midnight to eliminate DST shift)
            let dayIndex = 0;
            if (inputs.startDate.value && inputs.targetDate.value) {
                const s = new Date(inputs.startDate.value + 'T00:00:00');
                const t = new Date(inputs.targetDate.value + 'T00:00:00');
                dayIndex = Math.round((t - s) / 86400000);
            }

            if (dayIndex <= 0) {
                dayIndex = 0;
                transitionStatus.textContent = `Jour 0 (Début - 3 repas égaux)`;
            } else if (dayIndex >= maxDays) {
                dayIndex = maxDays;
                transitionStatus.textContent = `Jour ${maxDays} (Transition terminée - 2 repas)`;
            } else {
                transitionStatus.textContent = `Jour ${dayIndex} sur ${maxDays}`;
            }

            const lunch = Math.max(0, baseLunch - (dayIndex * 10));
            const morning = Math.round(baseLunch + (dayIndex * 5));
            const evening = totalDaily - morning - lunch;

            outputs.morningVal.textContent = `${morning} g`;
            outputs.lunchVal.textContent = `${lunch} g`;
            outputs.eveningVal.textContent = `${evening} g`;
        } else {
            transitionGroup.style.display = 'none';
            standardResultBox.style.display = 'block';
            transitionResultGrid.style.display = 'none';

            const meals = parseInt(mode) || 1;
            const perMeal = Math.round(totalDaily / meals);
            outputs.perMeal.textContent = `${perMeal} g`;
        }
    }

    [inputs.adultWeight, inputs.age].forEach(el => {
        el.addEventListener('input', calculateDogFood);
        el.addEventListener('change', calculateDogFood);
        el.addEventListener('keyup', calculateDogFood);
    });

    [inputs.meals, inputs.startDate, inputs.targetDate].forEach(el => {
        el.addEventListener('change', calculateDogFood);
        el.addEventListener('input', calculateDogFood);
    });

    stateMgr.init();
    calculateDogFood();
}
