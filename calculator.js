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

// Preset and State Storage Helper
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
            delBtn.onclick = () => this.deletePreset(name);

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

    let currentRpPerSecond = 0;

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
            if (currentRpPerSecond <= 0) return;
            const record = {
                rate: currentRpPerSecond,
                formatted: `${formatBigNumber(currentRpPerSecond)} RP/s`,
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
            currentRpPerSecond = 0;
            return;
        }

        let rpPerStudyCalculated = rawRpGain;
        if (rateType === 'min') rpPerStudyCalculated = (rawRpGain / 60) * secPerStudy;
        else if (rateType === 'hr') rpPerStudyCalculated = (rawRpGain / 3600) * secPerStudy;
        else if (rateType === 'day') rpPerStudyCalculated = (rawRpGain / 86400) * secPerStudy;

        currentRpPerSecond = rpPerStudyCalculated / secPerStudy;

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

    let currentShardPerSecond = 0;

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
            if (currentShardPerSecond <= 0) return;
            const record = {
                rate: currentShardPerSecond,
                formatted: `${formatBigNumber(currentShardPerSecond)} Shards/s`,
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
            currentShardPerSecond = 0;
            return;
        }

        const cycleSeconds = totalTicksPerOpCycle * secPerTick;
        currentShardPerSecond = shardGain / cycleSeconds;

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
