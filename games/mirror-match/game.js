// ===== Game State =====
const state = {
    currentLevel: 0,
    correlation: 0,
    n: 15,
    points: [], // Array of {id, x1, x2_base, x2_random} calculated at level load
    canvasSize: { width: 800, height: 400 }
};

// ===== Level Configuration =====
const levels = [
    {
        name: "The Messy Data",
        task: "The effect is hidden by noise! Increase the Correlation slider to see how consistent the change really is.",
        insight: "When you use a Paired T-Test, you're not comparing the group averages directly. You're analyzing the 'Difference Scores' for each subject. Even if the groups look messy, if every single subject increased slightly, the Paired T-Test will find it!",
        diff: 5,
        baseSD: 20,
        n: 15
    },
    {
        name: "High Variance",
        task: "Subjects are extremely different from each other. Can we still find the small treatment effect?",
        insight: "This is the superpower of Paired designs: They control for individual differences. It doesn't matter if one subject is at 100 and another at 50; if they both go up by 5, the effect is clear.",
        diff: 4,
        baseSD: 40,
        n: 20
    }
];

// ===== Data Generation =====
function generateData(level) {
    const points = [];
    for (let i = 0; i < level.n; i++) {
        // Before value (Random normal)
        const before = 50 + randn_bm() * level.baseSD;

        // After value components
        // true_after = before + diff
        // But we add noise based on correlation later in render/update
        // Actually, let's pre-calculate the 'random component' for the After value
        // So we can blend between 'Perfectly Correlated' and 'Uncorrelated'

        const independentRandom = 50 + level.diff + randn_bm() * level.baseSD;
        const perfectCorrelated = before + level.diff;

        points.push({
            before: before,
            independentTarget: independentRandom,
            perfectTarget: perfectCorrelated
        });
    }
    return points;
}

// Standard Normal variate using Box-Muller transform.
function randn_bm() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ===== Math Utils =====
// Simple T calculation
function calculateStats(currentPoints) {
    const n = currentPoints.length;

    // 1. Independent T-Test
    // Mean/Var of Group 1 (Before)
    const m1 = currentPoints.reduce((a, b) => a + b.before, 0) / n;
    const v1 = currentPoints.reduce((a, b) => a + (b.before - m1) ** 2, 0) / (n - 1);

    // Mean/Var of Group 2 (Current After)
    const m2 = currentPoints.reduce((a, b) => a + b.currentAfter, 0) / n;
    const v2 = currentPoints.reduce((a, b) => a + (b.currentAfter - m2) ** 2, 0) / (n - 1);

    // Pooled SE (simplified)
    const seIndep = Math.sqrt(v1 / n + v2 / n);
    const tIndep = Math.abs(m1 - m2) / seIndep;
    const pIndep = tToPValue(tIndep, 2 * n - 2);

    // 2. Paired T-Test
    // Analyze Differences (D = After - Before)
    const diffs = currentPoints.map(p => p.currentAfter - p.before);
    const mDiff = diffs.reduce((a, b) => a + b, 0) / n;
    const vDiff = diffs.reduce((a, b) => a + (b - mDiff) ** 2, 0) / (n - 1);
    const sdDiff = Math.sqrt(vDiff);

    const sePaired = sdDiff / Math.sqrt(n);
    const tPaired = Math.abs(mDiff) / sePaired;
    const pPaired = tToPValue(tPaired, n - 1);

    return { pIndep, pPaired, tPaired };
}

function tToPValue(t, df) {
    // Reusing the approximation from previous game
    const z = Math.abs(t);
    // This roughly approximates distributions with df > 10
    // Good enough for game mechanics
    return 2 * (1 - 0.5 * (1 + erf(z / Math.sqrt(2))));
}
function erf(x) {
    var sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    var t = 1.0 / (1.0 + p * x);
    var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
}


// ===== Rendering =====
function draw() {
    const cvs = document.getElementById('game-canvas');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');

    // Resize
    cvs.width = cvs.parentElement.clientWidth;
    cvs.height = cvs.parentElement.clientHeight;

    const width = cvs.width;
    const height = cvs.height;

    ctx.clearRect(0, 0, width, height);

    // Axes
    const x1 = width * 0.3; // Before Axis
    const x2 = width * 0.7; // After Axis

    // Draw vertical axes
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, 50); ctx.lineTo(x1, height - 50);
    ctx.moveTo(x2, 50); ctx.lineTo(x2, height - 50);
    ctx.stroke();

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '16px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText("BEFORE", x1, 40);
    ctx.fillText("AFTER", x2, 40);

    // Plot Points and Lines
    // Scaling: map data 0-100 (ish) to height
    const mapY = (val) => height - 50 - ((val + 20) / 140) * (height - 100);

    let activePoints = [];

    state.points.forEach((p, i) => {
        // Calculate current 'After' based on correlation slider
        // r=0 -> use independentTarget
        // r=1 -> use perfectTarget
        const r = state.correlation;
        // Linear interpolation for game feel (not statistically exact correlation generation, but good enough for visual intuition)
        // Actually, statistically: Y = r*X + sqrt(1-r^2)*Z. 
        // But for "Morphing", simple lerp is more predictable for user control.
        const currentAfter = p.independentTarget * (1 - r) + p.perfectTarget * r;

        // Save for stats calc
        activePoints.push({ before: p.before, currentAfter: currentAfter });

        const y1 = mapY(p.before);
        const y2 = mapY(currentAfter);

        // Draw Line
        ctx.beginPath();
        // Color based on slope: Up = Green/Teal, Down = Red?
        // Or opacity based on correlation
        const opacity = 0.2 + (r * 0.6);
        ctx.strokeStyle = `rgba(20, 184, 166, ${opacity})`;
        ctx.lineWidth = 1 + r * 2; // Thicker lines when correlated
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw Points
        ctx.beginPath();
        ctx.arc(x1, y1, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#cbd5e1';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x2, y2, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#cbd5e1';
        ctx.fill();
    });

    return activePoints;
}

// ===== Game Flow =====
function updatePhysics() {
    const activePoints = draw();
    const stats = calculateStats(activePoints);

    // Update UI Stats
    document.getElementById('indep-p').textContent = `p = ${stats.pIndep.toFixed(3)}`;
    document.getElementById('paired-p').textContent = `p = ${stats.pPaired < 0.001 ? '<0.001' : stats.pPaired.toFixed(3)}`;

    // Update Meter
    const meter = document.getElementById('sig-fill');
    const btn = document.getElementById('confirm-btn');
    const msg = document.getElementById('success-msg');

    // Threshold check (p < 0.05)
    if (stats.pPaired < 0.05) {
        meter.style.width = '100%';
        meter.style.background = '#22c55e'; // Green
        btn.disabled = false;
        msg.style.opacity = 1;
        document.getElementById('paired-p').style.color = '#22c55e';
    } else {
        // Calculate 'closeness' for meter
        // If p=0.05, meter=70%. If p=1, meter=0%.
        // Log scale
        const score = Math.max(0, 1 - stats.pPaired); // Linear fallback
        meter.style.width = (score * 80) + '%';
        meter.style.background = '#14b8a6';
        btn.disabled = true;
        msg.style.opacity = 0;
        document.getElementById('paired-p').style.color = 'white';
    }
}

function loadLevel(idx) {
    state.currentLevel = idx;
    const level = levels[idx];

    state.correlation = 0;
    document.getElementById('input-corr').value = 0;

    state.points = generateData(level);

    document.getElementById('level-number').textContent = idx + 1;
    document.getElementById('level-name').textContent = level.name;
    document.getElementById('level-task').textContent = level.task;

    document.querySelector('.score-container').style.display = 'flex';

    updatePhysics();
}

// Init
window.addEventListener('load', () => {
    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        loadLevel(0);
    });

    document.getElementById('input-corr').addEventListener('input', (e) => {
        state.correlation = parseInt(e.target.value) / 100;
        updatePhysics();
    });

    document.getElementById('confirm-btn').addEventListener('click', () => {
        document.getElementById('insight-text').textContent = levels[state.currentLevel].insight;
        document.getElementById('complete-screen').classList.add('active');
    });

    document.getElementById('next-level-btn').addEventListener('click', () => {
        // Loop or finish
        if (state.currentLevel < levels.length - 1) {
            document.getElementById('complete-screen').classList.remove('active');
            loadLevel(state.currentLevel + 1);
        } else {
            alert("Experiments Complete! Returns to Hub.");
            window.location.href = "../../index.html";
        }
    });

    window.addEventListener('resize', draw);
});
