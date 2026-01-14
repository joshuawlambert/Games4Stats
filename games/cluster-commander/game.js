// ===== Game State =====
const state = {
    currentLevel: 0,
    spread: 0,
    noise: 50,
    fRatio: 0,
    canvasSize: { width: 800, height: 400 }
};

// ===== Level Configuration =====
const levels = [
    {
        name: "The Spread",
        instruction: "Increase the 'Between-Group' variability. Pull the groups apart until they are distinct!",
        insight: "ANOVA compares the variance BETWEEN groups to the variance WITHIN groups. By moving the means apart, you increased the 'Signal'.",
        controls: ['between'],
        init: { spread: 0, noise: 40 }
    },
    {
        name: "Precision Approach",
        instruction: "The groups are close together. You must reduce the 'Within-Group' noise (Standard Deviation) to distinguish them.",
        insight: "Decreasing the noise (Error Variance) makes the denominator of the F-Ratio smaller. This shoots the F-value up! Precision matters.",
        controls: ['within'],
        init: { spread: 20, noise: 80 }
    },
    {
        name: "Total Command",
        instruction: "Master the F-Ratio. Balance both Spread and Precision to achieve huge significance.",
        insight: "F = MeanSquare(Between) / MeanSquare(Within). You've mastered the balance of ANOVA!",
        controls: ['between', 'within'],
        init: { spread: 10, noise: 60 }
    }
];

// ===== Rendering =====
let ctx;

function draw() {
    const cvs = document.getElementById('game-canvas');
    if (!cvs) return;

    // Resize handling
    cvs.width = cvs.parentElement.clientWidth;
    cvs.height = cvs.parentElement.clientHeight;

    const width = cvs.width;
    const height = cvs.height;
    const centerY = height * 0.8;
    const scaleX = width / 200;

    ctx.clearRect(0, 0, width, height);

    // Parameters
    // Spread 0-100 maps to offset 0-60
    const offset = state.spread * 0.8;

    // Noise 10-100 (Where 100 is LOW noise in UI, keeping logic consistent)
    // Actually UI said "Precision". So 100 = Low SD. 10 = High SD.
    // In state.noise, let's store standard deviation.
    // Input 'within': 10 to 100. Val=100 -> SD=5. Val=10 -> SD=40.
    // Let's invert in the handler.
    const sd = state.noise;
    const sdPixels = sd * scaleX * 0.5;

    const center = width / 2;

    // Group B (Green, Center)
    drawBellCurve(center, centerY, sdPixels, '#22c55e');

    // Group A (Red, Left)
    drawBellCurve(center - (offset * scaleX), centerY, sdPixels, '#ef4444');

    // Group C (Blue, Right)
    drawBellCurve(center + (offset * scaleX), centerY, sdPixels, '#3b82f6');

    // Axis
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
    ctx.stroke();
}

function drawBellCurve(mean, baseline, sd, color) {
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.fillStyle = color.replace(')', ', 0.3)').replace('rgb', 'rgba');

    let first = true;
    // Draw 3 sigma range is enough usually, but lets do full width
    for (let x = 0; x < ctx.canvas.width; x += 4) {
        const z = (x - mean) / sd;
        const y = Math.exp(-0.5 * z * z) * (1500 / sd); // Height scaler

        const screenY = baseline - y * 4;

        if (first) {
            ctx.moveTo(x, screenY);
            first = false;
        } else {
            ctx.lineTo(x, screenY);
        }
    }

    ctx.stroke();
    // Fill
    ctx.lineTo(ctx.canvas.width, baseline);
    ctx.lineTo(0, baseline);
    ctx.closePath();
    ctx.fill();
}

// ===== Physics/Stats =====
function updateStats() {
    // F = MS_between / MS_within
    // Let's simulate N=20 per group.

    // Means: -offset, 0, +offset.
    // Var_Means = ( (-offset-0)^2 + (0-0)^2 + (offset-0)^2 ) / (3-1)
    //           = (2 * offset^2) / 2 = offset^2.
    // But we need SS_between. 
    // SS_between = n * sum((mean_i - grand_mean)^2). 
    // Grand mean is 0.
    // Sum sq diffs = (-off)^2 + 0 + off^2 = 2*off^2.
    // SS_between = 20 * 2 * off^2 = 40 * off^2.
    // df_between = 2.
    // MS_between = 20 * off^2.

    // Within:
    // Variance of each group is sd^2.
    // Pooled Variance = sd^2.
    // MS_within = sd^2. (Since variance is average SS_w).

    // F = (20 * offset^2) / sd^2

    const offset = state.spread * 0.8;
    const sd = state.noise;

    const n = 20;

    // Prevent div by zero
    const safeSD = Math.max(sd, 1);

    const fRatio = (n * (offset ** 2)) / (safeSD ** 2);
    state.fRatio = fRatio;

    // Visual Updates
    document.getElementById('f-stat-display').textContent = fRatio.toFixed(2);

    const fMeter = document.getElementById('f-fill');
    const pVal = document.getElementById('p-value');
    const btn = document.getElementById('confirm-btn');

    // Critical F (df 2, 57) approx 3.15 for alpha 0.05
    const criticalF = 3.2;

    if (fRatio > criticalF) {
        // Significant
        fMeter.style.background = '#22c55e';
        pVal.textContent = "< 0.05";
        pVal.style.color = '#22c55e';
        btn.disabled = false;
    } else {
        fMeter.style.background = '#f59e0b';
        // Fake P decay for visual
        const fakeP = Math.min(1, 4 / (fRatio + 1));
        pVal.textContent = fakeP.toFixed(2);
        pVal.style.color = '#f59e0b';
        btn.disabled = true;
    }

    // Meter Fill (Log scale ish for visual range)
    // 3.2 should be 60%ish mark
    // let's say max F of 15 fills it
    const pct = Math.min((fRatio / 10) * 100, 100);
    fMeter.style.width = pct + '%';

    draw();
}

function loadLevel(idx) {
    state.currentLevel = idx;
    const level = levels[idx];

    // Controls logic
    document.getElementById('slider-between').style.display = level.controls.includes('between') ? 'block' : 'none';
    document.getElementById('slider-within').style.display = level.controls.includes('within') ? 'block' : 'none';

    // Init values
    state.spread = level.init.spread;
    // UI input is Precision (100 - High, 10 - Low).
    // State noise is SD (Low, High).
    // Mapping: UI 100 -> SD 5. UI 10 -> SD 40.
    // Linear map: val -> sd. 
    // Let's say map: sd = 45 - 0.4*val. (100 -> 5, 10 -> 41).
    // Reverse map for init: val = (45 - sd) / 0.4
    const initUI = (45 - level.init.noise) / 0.4;

    document.getElementById('input-between').value = state.spread;
    document.getElementById('input-within').value = initUI;

    // Set actual noise state from logic directly to be safe first frame
    state.noise = level.init.noise;

    document.getElementById('level-number').textContent = idx + 1;
    document.getElementById('level-name').textContent = level.name;
    document.getElementById('level-instruction').textContent = level.instruction;

    document.getElementById('complete-screen').classList.remove('active');
    updateStats();
}

// Init
window.addEventListener('load', () => {
    ctx = document.getElementById('game-canvas').getContext('2d');

    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        loadLevel(0);
    });

    document.getElementById('input-between').addEventListener('input', (e) => {
        state.spread = parseFloat(e.target.value);
        updateStats();
    });

    document.getElementById('input-within').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        // "Precision" -> Higher Val = Lower SD (Noise)
        // Map: 100 -> 5. 10 -> 40.
        state.noise = 45 - (0.4 * val);
        updateStats();
    });

    document.getElementById('confirm-btn').addEventListener('click', () => {
        document.getElementById('insight-text').textContent = levels[state.currentLevel].insight;
        document.getElementById('complete-screen').classList.add('active');
    });

    document.getElementById('next-level-btn').addEventListener('click', () => {
        if (state.currentLevel < levels.length - 1) {
            loadLevel(state.currentLevel + 1);
        } else {
            alert("Mission Complete! Returning to Hub.");
            window.location.href = "../../index.html";
        }
    });

    window.addEventListener('resize', draw);
});
