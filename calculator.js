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
    const transitionDay = document.getElementById('transitionDay');
    const transitionDayLabel = document.getElementById('transitionDayLabel');

    const outputs = {
        dailyTotal: document.getElementById('dailyTotal'),
        perMeal: document.getElementById('perMeal'),
        mainLabel: document.getElementById('mainResultLabel')
    };

    // Initialize default dates if blank
    if (!inputs.startDate.value) inputs.startDate.value = getTodayString();
    if (!inputs.targetDate.value) inputs.targetDate.value = getTodayString();

    const stateMgr = new StateManager('dog_food_calc', inputs, calculateDogFood);

    function syncDateToSlider() {
        if (!inputs.startDate.value || !inputs.targetDate.value) return;
        const start = new Date(inputs.startDate.value);
        const target = new Date(inputs.targetDate.value);
        const diffDays = Math.round((target - start) / (1000 * 60 * 60 * 24));

        const max = parseInt(transitionDay.max) || 17;
        const clampedDay = Math.max(0, Math.min(diffDays, max));
        transitionDay.value = clampedDay;
    }

    function syncSliderToDate() {
        if (!inputs.startDate.value) return;
        const start = new Date(inputs.startDate.value);
        const dayOffset = parseInt(transitionDay.value) || 0;
        const target = new Date(start.getTime() + dayOffset * 86400000);

        const y = target.getFullYear();
        const m = String(target.getMonth() + 1).padStart(2, '0');
        const d = String(target.getDate()).padStart(2, '0');
        inputs.targetDate.value = `${y}-${m}-${d}`;
    }

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

            const baseLunch = Math.round(totalDaily / 3);
            const maxDays = Math.ceil(baseLunch / 10);
            transitionDay.max = maxDays;

            const day = parseInt(transitionDay.value) || 0;
            transitionDayLabel.textContent = day === 0 ? `Jour 0 (Départ)` : `Jour ${day} / ${maxDays}`;

            // Deduct 10g per day from lunch, add 5g per day to morning & evening
            const lunch = Math.max(0, baseLunch - (day * 10));
            const morning = Math.round(baseLunch + (day * 5));
            const evening = totalDaily - morning - lunch;

            outputs.mainLabel.textContent = `Portions (${inputs.targetDate.value || 'Date'})`;
            outputs.perMeal.innerHTML = `Matin: <strong>${morning}g</strong> | Midi: <strong>${lunch}g</strong> | Soir: <strong>${evening}g</strong>`;
        } else {
            transitionGroup.style.display = 'none';
            const meals = parseInt(mode) || 1;
            const perMeal = Math.round(totalDaily / meals);
            outputs.mainLabel.textContent = "Dose par repas";
            outputs.perMeal.textContent = `${perMeal} g / repas`;
        }
    }

    // Input listeners
    ['input', 'change', 'keyup'].forEach(evt => {
        inputs.adultWeight.addEventListener(evt, calculateDogFood);
        inputs.age.addEventListener(evt, calculateDogFood);
    });

    inputs.meals.addEventListener('change', calculateDogFood);

    // Date changes update slider position then recalculate
    inputs.startDate.addEventListener('change', () => {
        syncDateToSlider();
        calculateDogFood();
    });

    inputs.targetDate.addEventListener('change', () => {
        syncDateToSlider();
        calculateDogFood();
    });

    // Slider movements update target date then recalculate
    transitionDay.addEventListener('input', () => {
        syncSliderToDate();
        calculateDogFood();
    });

    transitionDay.addEventListener('change', () => {
        syncSliderToDate();
        calculateDogFood();
    });

    stateMgr.init();
    syncDateToSlider();
    calculateDogFood();
}
