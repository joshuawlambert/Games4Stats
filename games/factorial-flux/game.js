// ===== Game State =====
const state = {
    currentLevel: 0,
    effA: 0,
    effB: 20,
    effInt: 0,
    canvasSize: { width: 800, height: 400 }
};

// ===== Level Configuration =====
const levels = [
    {
        name: "Parallel Worlds",
        task: "Create TWO Main Effects with NO Interaction. The lines should be sloped (Effect A) and separated (Effect B), but PARALLEL.",
        insight: "Parallel lines indicate 'Additivity'. The effect of Factor A is consistent regardless of Factor B. No interaction exists.",
        check: (s) => Math.abs(s.effA) > 20 && Math.abs(s.effB) > 20 && Math.abs(s.effInt) < 10
    },
    {
        name: "The Crossover",
        task: "Create a PURE Interaction. No Main Effects. The lines should form an 'X'.",
        insight: "This is a 'Disordinal Interaction'. The effect of Factor A completely flips depending on Factor B. Main effects are misleading here!",
        check: (s) => Math.abs(s.effA) < 10 && Math.abs(s.effB) < 10 && Math.abs(s.effInt) > 30
    },
    {
        name: "Synergy",
        task: "Create a 'Fanned' Interaction. Both start at the same point (left) but spread out massively (right).",
        insight: "This is often called a 'Fan Effect' or 'Synergistic Interaction'. The factors amplify each other!",
        // Math for Fan: Start points (A1) are equal, End points (A2) are different.
        // P1(A1,B1) approx P3(A1,B2). 
        // P1 = -A -B +I. P3 = -A +B -I.
        // Equal if -B + I = +B - I => 2I = 2B => I = B.
        check: (s) => Math.abs(s.effB - s.effInt) < 10 && s.effB > 20
    }
];

// ===== Rendering =====
let ctx;

function draw() {
    const cvs = document.getElementById('game-canvas');
    if (!cvs) return;

    cvs.width = cvs.parentElement.clientWidth;
    cvs.height = cvs.parentElement.clientHeight;

    const width = cvs.width;
    const height = cvs.height;

    ctx.clearRect(0, 0, width, height);

    // Axes
    const m = 50; // margin
    const cy = height / 2;

    // Vert Axis
    ctx.beginPath(); ctx.moveTo(m, m); ctx.lineTo(m, height - m); ctx.strokeStyle = 'white'; ctx.stroke();
    // Horiz Axis
    ctx.beginPath(); ctx.moveTo(m, height - m); ctx.lineTo(width - m, height - m); ctx.stroke();

    // Ticks X
    ctx.fillStyle = 'white'; ctx.font = '14px Outfit'; ctx.textAlign = 'center';
    ctx.fillText("Factor A: Level 1", width * 0.3, height - m + 30);
    ctx.fillText("Factor A: Level 2", width * 0.7, height - m + 30);

    // Calculate Points
    // Base Y is cy. Up is negative in Canvas.
    // Scale factor
    const s = 1.5;

    // EffA, EffB, EffInt are -50 to 50 ui units.
    const A = state.effA * s;
    const B = state.effB * s;
    const I = state.effInt * s;

    // Line 1 (Factor B = Level 1 = Purple)
    // Points: A1 (-), A2 (+)
    // Formula derivation for intuitive controls:
    // A: Slopes the line (L1 goes up, L2 goes up). So P2 higher than P1. y -= A.
    // B: Separates lines. L1 goes Up, L2 goes Down? Or L1 Fixed, L2 moves?
    // Let's make B separate them symmetrically. B1 up, B2 down.
    // I: Flips slope of B1 vs B2.

    // Center Baseline = cy

    // Line 1 (Purple - B1)
    // A1: cy + A + B - I  (Note: Canvas Y+ is down. So +A means lower on screen/dip. Let's invert Signs for 'Up' logic)
    // Let "Up" visually mean Value Increase. So Y decreases.
    const y1_A1 = cy + A + B - I;
    const y1_A2 = cy - A + B + I;
    // Wait, check slope A: A=50. P1=cy+50 (Low), P2=cy-50 (High). Line goes UP. Correct.

    // Line 2 (Pink - B2)
    // Invert B. Invert I.
    const y2_A1 = cy + A - B + I;
    const y2_A2 = cy - A - B - I;

    // Draw Line 1 (Purple)
    const x1 = width * 0.3;
    const x2 = width * 0.7;

    ctx.beginPath();
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 4;
    ctx.moveTo(x1, y1_A1); ctx.lineTo(x2, y1_A2);
    ctx.stroke();

    drawPoint(x1, y1_A1, '#a855f7');
    drawPoint(x2, y1_A2, '#a855f7');

    // Draw Line 2 (Pink)
    ctx.beginPath();
    ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 4;
    ctx.moveTo(x1, y2_A1); ctx.lineTo(x2, y2_A2);
    ctx.stroke();

    drawPoint(x1, y2_A1, '#ec4899');
    drawPoint(x2, y2_A2, '#ec4899');

    // Legend
    ctx.fillStyle = '#a855f7'; ctx.fillText("Line B1", width - 60, 50);
    ctx.fillStyle = '#ec4899'; ctx.fillText("Line B2", width - 60, 70);
}

function drawPoint(x, y, color) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// ===== Game Logic =====
function updatePhysics() {
    draw();

    // Show stats values
    document.getElementById('stat-a').textContent = state.effA;
    document.getElementById('stat-b').textContent = state.effB;
    document.getElementById('stat-int').textContent = state.effInt;

    // Check win condition
    const level = levels[state.currentLevel];
    const btn = document.getElementById('confirm-btn');

    if (level.check(state)) {
        btn.disabled = false;
        btn.style.opacity = 1;
        btn.innerHTML = `<span>Matches Pattern!</span>`;
    } else {
        btn.disabled = true;
        btn.style.opacity = 0.5;
        btn.innerHTML = `<span>Match the Description</span>`;
    }
}

function loadLevel(idx) {
    state.currentLevel = idx;
    const level = levels[idx];

    // Reset defaults for sandbox feeling? Or keep previous? Reset is better.
    state.effA = 0;
    state.effB = 20;
    state.effInt = 0;

    document.getElementById('input-a').value = 0;
    document.getElementById('input-b').value = 20;
    document.getElementById('input-int').value = 0;

    document.getElementById('level-number').textContent = idx + 1;
    document.getElementById('level-name').textContent = level.name;
    document.getElementById('level-task').textContent = level.task;

    document.getElementById('complete-screen').classList.remove('active');
    updatePhysics();
}

window.addEventListener('load', () => {
    ctx = document.getElementById('game-canvas').getContext('2d');

    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        loadLevel(0);
    });

    document.getElementById('input-a').addEventListener('input', (e) => {
        state.effA = parseInt(e.target.value);
        updatePhysics();
    });

    document.getElementById('input-b').addEventListener('input', (e) => {
        state.effB = parseInt(e.target.value);
        updatePhysics();
    });

    document.getElementById('input-int').addEventListener('input', (e) => {
        state.effInt = parseInt(e.target.value);
        updatePhysics();
    });

    document.getElementById('confirm-btn').addEventListener('click', () => {
        document.getElementById('insight-text').textContent = levels[state.currentLevel].insight;
        document.getElementById('complete-screen').classList.add('active');
    });

    document.getElementById('next-level-btn').addEventListener('click', () => {
        if (state.currentLevel < levels.length - 1) {
            loadLevel(state.currentLevel + 1);
        } else {
            alert("Interaction Lab Complete! Returning to Hub.");
            window.location.href = "../../index.html";
        }
    });

    window.addEventListener('resize', draw);
});
