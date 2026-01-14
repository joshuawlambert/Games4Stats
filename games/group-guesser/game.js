// ===== Game State =====
const state = {
    currentLevel: 0,
    meanDiff: 0,
    sd: 20,
    n: 20,
    tStat: 0,
    pValue: 1.0,
    canvasSize: { width: 800, height: 400 }
};

// ===== Level Configuration =====
const levels = [
    {
        name: "The Separation",
        instruction: "Drag the slider to INCREASE the difference between group means until the groups are clearly distinct.",
        insight: "Directly increasing the 'Effect Size' (the difference between groups) is the most obvious way to find a significant result. If two treatments are vastly different, you don't need fancy stats to see it!",
        controls: ['mean'],
        init: { meanDiff: 0, sd: 20, n: 30 },
        targetP: 0.05
    },
    {
        name: "Noise Reduction",
        instruction: "The means are close and FIXED. You must REDUCE the noise (Standard Deviation) to see the signal.",
        insight: "By reducing variability (noise) within your groups—like using more precise instruments or more homogenous subjects—you can detect even small differences.",
        controls: ['sd'],
        init: { meanDiff: 15, sd: 40, n: 30 },
        targetP: 0.05
    },
    {
        name: "Power in Numbers",
        instruction: "Small difference, high noise. The only option left: Collect MORE DATA (Sample Size).",
        insight: "This is 'Statistical Power'. Even a tiny difference with high noise can be proven significant if you have a massive sample size (N).",
        controls: ['n'],
        init: { meanDiff: 5, sd: 15, n: 10 },
        targetP: 0.05
    }
];

// ===== Elements =====
/* (Will be cached in init) */
let ctx;

// ===== Math Utils =====
function erf(x) {
    // Save the sign of x
    var sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);

    // Constants
    var a1 = 0.254829592;
    var a2 = -0.284496736;
    var a3 = 1.421413741;
    var a4 = -1.453152027;
    var a5 = 1.061405429;
    var p = 0.3275911;

    // A&S formula 7.1.26
    var t = 1.0 / (1.0 + p * x);
    var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
}

function calculateT(meanDiff, sd, n) {
    // t = (x1 - x2) / (sp * sqrt(2/n))
    // Pooling SD assuming equal variance for this game
    const se = sd * Math.sqrt(2 / n); // Standard Error
    if (se === 0) return 0;
    return meanDiff / se;
}

function tToPValue(t, df) {
    // Approximation using Normal distribution Z-score for simplicity visual
    // For n > 30 t approaches z. We'll use error function dist.
    const z = Math.abs(t);
    // Two-tailed p-value
    return 2 * (1 - 0.5 * (1 + erf(z / Math.sqrt(2))));
}

// ===== Rendering =====
function draw() {
    const cvs = document.getElementById('game-canvas');
    if (!cvs) return;

    // Resize handling
    const container = cvs.parentElement;
    cvs.width = container.clientWidth;
    cvs.height = container.clientHeight;

    const width = cvs.width;
    const height = cvs.height;
    const centerY = height * 0.8;
    const scaleX = width / 180; // horizontal scale
    const scaleY = height * 0.05; // vertical amplitude

    ctx.clearRect(0, 0, width, height);

    // Group 1 (Fixed at center - offset)
    const g1Mean = width / 2 - (state.meanDiff * scaleX) / 2;
    // Group 2 (Fixed at center + offset)
    const g2Mean = width / 2 + (state.meanDiff * scaleX) / 2;

    const stdDevPixels = state.sd * scaleX;

    // Draw distributions
    drawBellCurve(g1Mean, centerY, stdDevPixels, '#6366f1'); // Blue
    drawBellCurve(g2Mean, centerY, stdDevPixels, '#ec4899'); // Pink

    // Draw axis
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Draw Mean Lines
    drawDashedLine(g1Mean, centerY, centerY - 150, '#6366f1');
    drawDashedLine(g2Mean, centerY, centerY - 150, '#ec4899');
}

function drawBellCurve(mean, baseline, sd, color) {
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.fillStyle = color.replace(')', ', 0.2)').replace('rgb', 'rgba'); // Make transparent fill

    // Plot points
    let first = true;
    for (let x = 0; x < ctx.canvas.width; x += 2) {
        const z = (x - mean) / sd;
        const y = Math.exp(-0.5 * z * z) * (2000 / sd); // Height scale factor

        const screenY = baseline - y * 3; // Visual scaling

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

function drawDashedLine(x, y1, y2, color) {
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.setLineDash([]);
}

// ===== Game Logic =====
function updateStats() {
    state.tStat = calculateT(state.meanDiff, state.sd, state.n);
    state.pValue = tToPValue(state.tStat, 2 * state.n - 2);

    // Update UI
    const pDisplay = document.getElementById('p-value-display');
    const sigDisplay = document.getElementById('sig-status');
    const tMeter = document.getElementById('t-stat-fill');
    const btn = document.getElementById('confirm-btn');

    // Format P-value
    let pText = state.pValue < 0.001 ? "< 0.001" : state.pValue.toFixed(3);
    pDisplay.textContent = `p = ${pText}`;

    // Color coding
    if (state.pValue < 0.05) {
        pDisplay.style.color = '#22c55e'; // Green
        sigDisplay.textContent = "SIGNIFICANT RESULT";
        sigDisplay.style.color = '#22c55e';
        sigDisplay.style.opacity = 1;

        tMeter.style.background = '#22c55e';
        btn.disabled = false;
    } else {
        pDisplay.style.color = 'white';
        sigDisplay.textContent = "Not Significant";
        sigDisplay.style.color = 'white';
        sigDisplay.style.opacity = 0.5;

        tMeter.style.background = '#6366f1';
        btn.disabled = true;
    }

    // Meter Calculation (Arbitrary log scale for visual feel)
    // T=2 is roughly p=0.05. Let's make 70% of the bar be T=2.
    // Meter % = (T / 3) * 100?
    const meterPct = Math.min((Math.abs(state.tStat) / 3) * 100, 100);
    tMeter.style.width = meterPct + '%';

    draw();
}

function loadLevel(index) {
    state.currentLevel = index;
    const level = levels[index];

    // Reset values state
    state.meanDiff = level.init.meanDiff;
    state.sd = level.init.sd;
    state.n = level.init.n;

    // Reset Sliders UI
    document.getElementById('input-mean-diff').value = state.meanDiff;
    document.getElementById('input-mean-diff').parentElement.style.display = 'none';

    document.getElementById('input-sd').value = state.sd;
    document.getElementById('input-sd').parentElement.style.display = 'none';

    document.getElementById('input-n').value = state.n;
    document.getElementById('input-n').parentElement.style.display = 'none';

    // Show Only Active Controls
    level.controls.forEach(c => {
        document.getElementById(`slider-${c}`).style.display = 'block';
    });

    // Update Text
    document.getElementById('level-number').textContent = index + 1;
    document.getElementById('level-name').textContent = level.name;
    document.getElementById('level-instruction').textContent = level.instruction;

    // Hide complete screen if open
    document.getElementById('complete-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');

    updateStats();
}

function init() {
    ctx = document.getElementById('game-canvas').getContext('2d');

    // Event Listeners
    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        loadLevel(0);
    });

    document.getElementById('input-mean-diff').addEventListener('input', (e) => {
        state.meanDiff = parseFloat(e.target.value);
        updateStats();
    });

    document.getElementById('input-sd').addEventListener('input', (e) => {
        state.sd = parseFloat(e.target.value); // Inverted visually? No, standard logic.
        updateStats();
    });

    document.getElementById('input-n').addEventListener('input', (e) => {
        state.n = parseFloat(e.target.value);
        updateStats();
    });

    document.getElementById('confirm-btn').addEventListener('click', () => {
        // Show complete
        const level = levels[state.currentLevel];
        document.getElementById('insight-text').textContent = level.insight;
        document.getElementById('complete-screen').classList.add('active');
    });

    document.getElementById('next-level-btn').addEventListener('click', () => {
        if (state.currentLevel < levels.length - 1) {
            loadLevel(state.currentLevel + 1);
        } else {
            // End of game loop - restart or Back to Hub?
            alert("Experiments Complete! Returning to Lobby.");
            window.location.href = "../../index.html";
        }
    });

    // Font load check (quick hack to ensure text renders if we drew it on canvas, but we mostly use HTML text)
    updateStats();
}

window.addEventListener('load', init);
window.addEventListener('resize', draw);
