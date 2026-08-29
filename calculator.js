// ==========================================
// SHARED UTILITIES
// ==========================================
const SUFFIXES = {
    'k': 1e3, 'm': 1e6, 'b': 1e9, 't': 1e12,
    'qa': 1e15, 'qu': 1e18, 'sx': 1e21, 'sp': 1e24,
    'o': 1e27, 'n': 1e30, 'd': 1e33
};

function parseBigInput(str) {
    if (!str) return 0;
    str = str.toString().trim().toLowerCase();
    
    if (/^[\d.]+(e[+-]?\d+)$/.test(str)) {
        const val = parseFloat(str);
        return isNaN(val) ? 0 : val;
    }

    const match = str.match(/^([\d.]+)\s*([a-z]+)?$/);
    if (match) {
        const num = parseFloat(match[1]);
        const suf = match[2];
        if (isNaN(num)) return 0;

        if (suf && SUFFIXES[suf] !== undefined) {
            return num * SUFFIXES[suf];
        }
        return num;
    }

    const val = parseFloat(str);
    return isNaN(val) ? 0 : val;
}

function formatBigNumber(num) {
    if (num === 0) return '0';
    if (!isFinite(num)) return 'Infinity';

    const abs = Math.abs(num);

    if (abs >= 1e36 || (abs < 0.001 && abs > 0)) {
        return num.toExponential(3);
    }

    const keys = Object.keys(SUFFIXES).reverse();
    for (let suf of keys) {
        const val = SUFFIXES[suf];
        if (abs >= val) {
            return (num / val).toFixed(2).replace(/\.00$/, '') + ' ' + suf.toUpperCase();
        }
    }

    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatTime(totalSeconds) {
    if (!isFinite(totalSeconds)) return 'Too large to calculate';
    if (totalSeconds <= 0) return '0d 0h 0m 0s';

    const years = Math.floor(totalSeconds / (86400 * 365));
    let remSec = totalSeconds % (86400 * 365);

    const days = Math.floor(remSec / 86400);
    remSec %= 86400;

    const hours = Math.floor(remSec / 3600);
    remSec %= 3600;

    const minutes = Math.floor(remSec / 60);
    const seconds = Math.round(remSec % 60);

    let formattedStr = '';
    if (years > 0) formattedStr += `${formatBigNumber(years)}y `;
    if (days > 0 || years > 0) formattedStr += `${days}d `;
    formattedStr += `${hours}h ${minutes}m ${seconds}s`;

    return formattedStr;
}

function getGlobalSecPerTick() {
    try {
        const globalSettings = JSON.parse(localStorage.getItem('global_tick_settings') || '{}');
        const rawTime = parseBigInput(globalSettings.tickTime || '1');
        const mult = parseFloat(globalSettings.tickUnit || '1');
        return rawTime * mult;
    } catch (e) {
        return 1;
    }
}

// State & Preset Manager
class StateManager {
    constructor(storageKey, inputs, onCalculate) {
        this.storageKey = storageKey;
        this.inputs = inputs;
        this.onCalculate = onCalculate;
        
        this.presetNameInput = document.getElementById('presetName');
        this.saveBtn = document.getElementById('saveBtn');
        this.savedList = document.getElementById('savedList');

        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.savePreset());
        }
    }

    saveCurrentState() {
        try {
            const state = {};
            for (let key in this.inputs) {
                state[key] = this.inputs[key].value;
            }
            localStorage.setItem(`${this.storageKey}_last_state`, JSON.stringify(state));
        } catch (e) {}
    }

    loadCurrentState() {
        try {
            const last = localStorage.getItem(`${this.storageKey}_last_state`);
            if (last) {
                const state = JSON.parse(last);
                for (let key in this.inputs) {
                    if (state[key] !== undefined) {
                        this.inputs[key].value = state[key];
                    }
                }
            }
        } catch (e) {}
    }

    getPresets() {
        try {
            return JSON.parse(localStorage.getItem(`${this.storageKey}_presets`) || '{}');
        } catch (e) {
            return {};
        }
    }

    savePreset() {
        const name = this.presetNameInput.value.trim() || 'Preset ' + (Object.keys(this.getPresets()).length + 1);
        const presets = this.getPresets();

        const state = {};
        for (let key in this.inputs) {
            state[key] = this.inputs[key].value;
        }

        presets[name] = state;

        try {
            localStorage.setItem(`${this.storageKey}_presets`, JSON.stringify(presets));
        } catch (e) {}

        this.presetNameInput.value = '';
        this.renderPresets();
    }

    loadPreset(name) {
        const presets = this.getPresets();
        if (presets[name]) {
            const p = presets[name];
            for (let key in this.inputs) {
                if (p[key] !== undefined) {
                    this.inputs[key].value = p[key];
                }
            }
            this.saveCurrentState();
            this.onCalculate();
        }
    }

    deletePreset(name) {
        const presets = this.getPresets();
        delete presets[name];
        try {
            localStorage.setItem(`${this.storageKey}_presets`, JSON.stringify(presets));
        } catch (e) {}
        this.renderPresets();
    }

    renderPresets() {
        if (!this.savedList) return;
        const presets = this.getPresets();
        this.savedList.innerHTML = '';

        Object.keys(presets).forEach(name => {
            const item = document.createElement('div');
            item.className = 'saved-item';

            const loadBtn = document.createElement('button');
            loadBtn.className = 'btn btn-load';
            loadBtn.textContent = name;
            loadBtn.onclick = () => this.loadPreset(name);

            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-danger';
            delBtn.textContent = '✕';
            delBtn.onclick = () => deletePreset(name);

            item.appendChild(loadBtn);
            item.appendChild(delBtn);
            this.savedList.appendChild(item);
        });
    }

    init() {
        this.loadCurrentState();
        this.renderPresets();
    }
}


// ==========================================
// 1. RP CALCULATOR MODULE
// ==========================================
if (document.getElementById('ticksPerStudy')) {
    const inputs = {
        ticksPerStudy: document.getElementById('ticksPerStudy'),
        rpGain: document.getElementById('rpPerStudy'),
        rpRateUnit: document.getElementById('rpRateUnit'),
        rpObjective: document.getElementById('rpObjective')
    };

    const outputs = {
        studiesNeeded: document.getElementById('studiesNeeded'),
        timeFormatted: document.getElementById('timeFormatted'),
        totalHours: document.getElementById('totalHours'),
        bestRpValue: document.getElementById('bestRpValue')
    };

    const savePeakBtn = document.getElementById('savePeakRpBtn');
    const loadPeakBtn = document.getElementById('loadPeakRpBtn');
    const stateMgr = new StateManager('rp_calc', inputs, calculateRP);

    function getUnitLabel(val) {
        if (val === 'min') return 'per min';
        if (val === 'hr') return 'per hr';
        if (val === 'day') return 'per day';
        return 'per study';
    }

    function renderSavedPeakRP() {
        try {
            const stored = JSON.parse(localStorage.getItem('highest_rp_record') || '{}');
            if (stored && stored.formatted) {
                outputs.bestRpValue.textContent = stored.formatted;
            } else {
                outputs.bestRpValue.textContent = 'None Recorded';
            }
        } catch (e) {
            outputs.bestRpValue.textContent = 'None Recorded';
        }
    }

    if (savePeakBtn) {
        savePeakBtn.addEventListener('click', () => {
            const rawVal = inputs.rpGain.value.trim();
            if (!rawVal || parseBigInput(rawVal) <= 0) return;

            const unit = getUnitLabel(inputs.rpRateUnit.value);
            const record = {
                formatted: `${rawVal} ${unit}`,
                inputs: {
                    ticksPerStudy: inputs.ticksPerStudy.value,
                    rpGain: inputs.rpGain.value,
                    rpRateUnit: inputs.rpRateUnit.value
                }
            };
            try {
                localStorage.setItem('highest_rp_record', JSON.stringify(record));
            } catch (e) {}
            renderSavedPeakRP();
            savePeakBtn.textContent = '✓ Saved!';
            setTimeout(() => { savePeakBtn.textContent = '💾 Save Current Rate'; }, 1500);
        });
    }

    if (loadPeakBtn) {
        loadPeakBtn.addEventListener('click', () => {
            try {
                const stored = JSON.parse(localStorage.getItem('highest_rp_record') || '{}');
                if (stored && stored.inputs) {
                    inputs.ticksPerStudy.value = stored.inputs.ticksPerStudy;
                    inputs.rpGain.value = stored.inputs.rpGain;
                    inputs.rpRateUnit.value = stored.inputs.rpRateUnit;
                    stateMgr.saveCurrentState();
                    calculateRP();
                }
            } catch (e) {}
        });
    }

    function calculateRP() {
        stateMgr.saveCurrentState();

        const secPerTick = getGlobalSecPerTick();
        const ticksPerStudy = parseBigInput(inputs.ticksPerStudy.value);
        const secPerStudy = secPerTick * ticksPerStudy;

        const rawRpGain = parseBigInput(inputs.rpGain.value);
        const rateType = inputs.rpRateUnit.value;
        const totalTargetRP = parseBigInput(inputs.rpObjective.value);

        if (secPerStudy <= 0 || rawRpGain <= 0 || totalTargetRP <= 0) {
            outputs.studiesNeeded.textContent = '0';
            outputs.timeFormatted.textContent = '0d 0h 0m 0s';
            outputs.totalHours.textContent = '0 hrs';
            return;
        }

        let rpPerStudyCalculated = rawRpGain;
        if (rateType === 'min') rpPerStudyCalculated = (rawRpGain / 60) * secPerStudy;
        else if (rateType === 'hr') rpPerStudyCalculated = (rawRpGain / 3600) * secPerStudy;
        else if (rateType === 'day') rpPerStudyCalculated = (rawRpGain / 86400) * secPerStudy;

        const studiesNeeded = totalTargetRP / rpPerStudyCalculated;
        const totalSeconds = studiesNeeded * secPerStudy;

        outputs.studiesNeeded.textContent = formatBigNumber(Math.ceil(studiesNeeded));
        outputs.timeFormatted.textContent = formatTime(totalSeconds);
        outputs.totalHours.textContent = `${formatBigNumber(totalSeconds / 3600)} hrs`;
    }

    Object.values(inputs).forEach(el => {
        el.addEventListener('keyup', calculateRP);
        el.addEventListener('input', calculateRP);
        el.addEventListener('change', calculateRP);
    });

    stateMgr.init();
    renderSavedPeakRP();
    calculateRP();
}


// ==========================================
// 2. SHARD CALCULATOR MODULE
// ==========================================
if (document.getElementById('opTicks')) {
    const inputs = {
        opTicks: document.getElementById('opTicks'),
        waitTicks: document.getElementById('waitTicks'),
        shardGain: document.getElementById('shardGain'),
        shardObjective: document.getElementById('shardObjective')
    };

    const outputs = {
        opsNeeded: document.getElementById('opsNeeded'),
        timeFormatted: document.getElementById('timeFormatted'),
        totalHours: document.getElementById('totalHours'),
        bestShardValue: document.getElementById('bestShardValue')
    };

    const savePeakBtn = document.getElementById('savePeakShardBtn');
    const loadPeakBtn = document.getElementById('loadPeakShardBtn');
    const stateMgr = new StateManager('shard_calc', inputs, calculateShards);

    function renderSavedPeakShard() {
        try {
            const stored = JSON.parse(localStorage.getItem('highest_shard_record') || '{}');
            if (stored && stored.formatted) {
                outputs.bestShardValue.textContent = stored.formatted;
            } else {
                outputs.bestShardValue.textContent = 'None Recorded';
            }
        } catch (e) {
            outputs.bestShardValue.textContent = 'None Recorded';
        }
    }

    if (savePeakBtn) {
        savePeakBtn.addEventListener('click', () => {
            const rawVal = inputs.shardGain.value.trim();
            if (!rawVal || parseBigInput(rawVal) <= 0) return;

            const record = {
                formatted: `${rawVal} per operation`,
                inputs: {
                    opTicks: inputs.opTicks.value,
                    waitTicks: inputs.waitTicks.value,
                    shardGain: inputs.shardGain.value
                }
            };
            try {
                localStorage.setItem('highest_shard_record', JSON.stringify(record));
            } catch (e) {}
            renderSavedPeakShard();
            savePeakBtn.textContent = '✓ Saved!';
            setTimeout(() => { savePeakBtn.textContent = '💾 Save Current Rate'; }, 1500);
        });
    }

    if (loadPeakBtn) {
        loadPeakBtn.addEventListener('click', () => {
            try {
                const stored = JSON.parse(localStorage.getItem('highest_shard_record') || '{}');
                if (stored && stored.inputs) {
                    inputs.opTicks.value = stored.inputs.opTicks;
                    inputs.waitTicks.value = stored.inputs.waitTicks;
                    inputs.shardGain.value = stored.inputs.shardGain;
                    stateMgr.saveCurrentState();
                    calculateShards();
                }
            } catch (e) {}
        });
    }

    function calculateShards() {
        stateMgr.saveCurrentState();

        const secPerTick = getGlobalSecPerTick();
        const opTicks = parseBigInput(inputs.opTicks.value);
        const waitTicks = parseBigInput(inputs.waitTicks.value);
        const shardGain = parseBigInput(inputs.shardGain.value);
        const shardObjective = parseBigInput(inputs.shardObjective.value);

        const totalTicksPerOpCycle = opTicks + waitTicks;

        if (secPerTick <= 0 || totalTicksPerOpCycle <= 0 || shardGain <= 0 || shardObjective <= 0) {
            outputs.opsNeeded.textContent = '0';
            outputs.timeFormatted.textContent = '0d 0h 0m 0s';
            outputs.totalHours.textContent = '0 hrs';
            return;
        }

        const opsNeeded = shardObjective / shardGain;
        const totalTicks = opsNeeded * totalTicksPerOpCycle;
        const totalSeconds = totalTicks * secPerTick;

        outputs.opsNeeded.textContent = formatBigNumber(Math.ceil(opsNeeded));
        outputs.timeFormatted.textContent = formatTime(totalSeconds);
        outputs.totalHours.textContent = `${formatBigNumber(totalSeconds / 3600)} hrs`;
    }

    Object.values(inputs).forEach(el => {
        el.addEventListener('keyup', calculateShards);
        el.addEventListener('input', calculateShards);
        el.addEventListener('change', calculateShards);
    });

    stateMgr.init();
    renderSavedPeakShard();
    calculateShards();
}


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

    const outputs = {
        dailyTotal: document.getElementById('dailyTotal'),
        perMeal: document.getElementById('perMeal')
    };

    let userChangedMeals = false;
    const stateMgr = new StateManager('dog_food_calc', inputs, calculateDogFood);

    function calculateDogFood() {
        stateMgr.saveCurrentState();

        const weight = parseFloat(inputs.adultWeight.value) || 0;
        const age = parseFloat(inputs.age.value) || 0;
        let meals = parseInt(inputs.meals.value) || 1;

        if (weight <= 0 || age <= 0) {
            outputs.dailyTotal.textContent = '0 g/jour';
            outputs.perMeal.textContent = '0 g';
            return;
        }

        if (!userChangedMeals && !localStorage.getItem('dog_food_calc_last_state')) {
            meals = age <= 6 ? 3 : 2;
            inputs.meals.value = meals;
        }

        const totalDaily = Math.round(calculateRation(weight, age));
        const perMeal = Math.round(totalDaily / meals);

        outputs.dailyTotal.textContent = `${totalDaily} g/jour`;
        outputs.perMeal.textContent = `${perMeal} g`;
    }

    inputs.adultWeight.addEventListener('input', calculateDogFood);
    inputs.age.addEventListener('input', calculateDogFood);
    inputs.meals.addEventListener('change', () => {
        userChangedMeals = true;
        calculateDogFood();
    });

    stateMgr.init();
    calculateDogFood();
}
