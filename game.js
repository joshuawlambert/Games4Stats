// ===== Game State =====
const state = {
    currentLevel: 0,
    totalScore: 0,
    angle: 45,
    phase: 'pc1',
    pc1Angle: null,
    pc1Variance: 0,
    pc2Variance: 0,
    dataPoints: [],
    isDragging: false,
    canvasSize: 600,
    dataCenter: { x: 0, y: 0 },
    // Dynamic target calculation
    optimalAngle: 0,
    optimalPC1Variance: 0,
    dynamicTarget: 0
};

// ===== Level Configuration =====
// Targets are calculated dynamically as (optimal PC1 variance - 2%)
const levels = [
    {
        name: "The Basics",
        description: "A simple elongated cluster - find the direction of maximum spread!",
        objective: "Find the axis that captures the maximum variance in the data.",
        insight: "The first principal component (PC1) always points in the direction where your data varies the most. By finding this axis, you've captured the main 'story' of your data!",
        elongation: 0.8,
        numPoints: 120
    },
    {
        name: "Tilted Data",
        description: "This data cloud is tilted - can you find its natural axis?",
        objective: "The data is rotated. Find the new axis of maximum variance.",
        insight: "PCA works regardless of how your data is oriented! The principal components adapt to find the natural axes of variation in your specific dataset.",
        elongation: 0.75,
        numPoints: 100
    },
    {
        name: "Hidden Structure",
        description: "This data looks almost circular - how much variance can PC1 really capture?",
        objective: "Find the best axis, but notice: circular data has less exploitable structure!",
        insight: "When data is nearly circular, PC1 captures less variance because there's no strong dominant direction. This is why PCA works best on elongated/correlated data!",
        elongation: 0.35,
        numPoints: 150
    },
    {
        name: "Two Components",
        description: "Both PC1 (red) and PC2 (purple) are shown. They must stay perpendicular!",
        objective: "Rotate to maximize PC1 variance. Notice PC2 automatically adjusts to stay orthogonal.",
        insight: "In 2D, PC1 + PC2 always captures 100% of variance! The key insight is that PCs are orthogonal - as you rotate PC1, PC2 must rotate with it to stay perpendicular.",
        elongation: 0.6,
        numPoints: 130,
        requiresPC2: true
    },
    {
        name: "Mastery",
        description: "A complex multi-cluster dataset. Both PCs work together!",
        objective: "Find the rotation that best separates the clusters using both components.",
        insight: "Congratulations! You've mastered PCA fundamentals: finding maximum variance directions, understanding orthogonality, and seeing how 2 components can capture 100% of 2D variance!",
        isComplex: true,
        requiresPC2: true
    }
];

// ===== Data Generators =====

// Generate data for a level with random rotation for replayability
function generateDataForLevel(level) {
    if (level.isComplex) {
        return generateComplexData();
    }
    // Random rotation between 0-180 degrees for replayability
    const randomRotation = Math.random() * 180;
    return generateElongatedCluster(level.elongation, randomRotation, level.numPoints);
}

function generateElongatedCluster(elongation, rotationDeg, numPoints) {
    const points = [];
    const rotation = rotationDeg * Math.PI / 180;
    const spreadX = 120;
    const spreadY = spreadX * (1 - elongation);

    for (let i = 0; i < numPoints; i++) {
        let x = (Math.random() - 0.5) * 2 * spreadX;
        let y = (Math.random() - 0.5) * 2 * spreadY;
        x += (Math.random() - 0.5) * 20;
        y += (Math.random() - 0.5) * 20;

        const rotatedX = x * Math.cos(rotation) - y * Math.sin(rotation);
        const rotatedY = x * Math.sin(rotation) + y * Math.cos(rotation);

        points.push({ x: rotatedX, y: rotatedY, color: getPointColor(i, numPoints) });
    }
    return points;
}

function generateComplexData() {
    // Random overall rotation for the cluster positions
    const randomRotation = Math.random() * Math.PI * 2;
    const cos = Math.cos(randomRotation);
    const sin = Math.sin(randomRotation);

    const baseClusters = [
        { cx: -60, cy: -40, spread: 35, count: 40 },
        { cx: 50, cy: 50, spread: 30, count: 35 },
        { cx: 80, cy: -30, spread: 25, count: 30 }
    ];

    // Rotate cluster centers
    const clusters = baseClusters.map(c => ({
        cx: c.cx * cos - c.cy * sin,
        cy: c.cx * sin + c.cy * cos,
        spread: c.spread,
        count: c.count
    }));

    const points = [];
    let totalIndex = 0;
    const totalPoints = clusters.reduce((sum, c) => sum + c.count, 0);

    clusters.forEach(cluster => {
        for (let i = 0; i < cluster.count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * cluster.spread;
            points.push({
                x: cluster.cx + Math.cos(angle) * r,
                y: cluster.cy + Math.sin(angle) * r,
                color: getPointColor(totalIndex++, totalPoints)
            });
        }
    });
    return points;
}

function getPointColor(index, total) {
    const hue = 180 + (index / total) * 60;
    return `hsl(${hue}, 85%, 65%)`;
}

// ===== Variance Calculations =====
function calculateVarianceAlongAxis(points, angleDeg) {
    const angle = angleDeg * Math.PI / 180;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    const projections = points.map(p => p.x * dx + p.y * dy);
    const mean = projections.reduce((a, b) => a + b, 0) / projections.length;
    const variance = projections.reduce((sum, p) => sum + (p - mean) ** 2, 0) / projections.length;

    return variance;
}

function calculateTotalVariance(points) {
    const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    return points.reduce((sum, p) => sum + (p.x - meanX) ** 2 + (p.y - meanY) ** 2, 0) / points.length;
}

function findOptimalAngle(points) {
    let maxVariance = 0;
    let optimalAngle = 0;

    for (let angle = 0; angle < 180; angle += 0.5) {
        const variance = calculateVarianceAlongAxis(points, angle);
        if (variance > maxVariance) {
            maxVariance = variance;
            optimalAngle = angle;
        }
    }
    return optimalAngle;
}

// ===== DOM Elements =====
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const axisHandle = document.getElementById('axis-handle');
const axisControl = document.getElementById('axis-control');

const screens = {
    start: document.getElementById('start-screen'),
    game: document.getElementById('game-screen'),
    complete: document.getElementById('complete-screen'),
    final: document.getElementById('final-screen')
};

const elements = {
    levelNumber: document.getElementById('level-number'),
    levelName: document.getElementById('level-name'),
    totalScore: document.getElementById('total-score'),
    varianceFill: document.getElementById('variance-fill'),
    variancePercent: document.getElementById('variance-percent'),
    pc1Variance: document.getElementById('pc1-variance'),
    pc2Variance: document.getElementById('pc2-variance'),
    pc2Container: document.getElementById('pc2-container'),
    angleValue: document.getElementById('angle-value'),
    objectiveText: document.getElementById('objective-text'),
    targetPercent: document.getElementById('target-percent'),
    confirmBtn: document.getElementById('confirm-btn'),
    rotationHint: document.getElementById('rotation-hint'),
    tooltip: document.getElementById('tooltip'),
    tooltipTitle: document.getElementById('tooltip-title'),
    tooltipText: document.getElementById('tooltip-text'),
    completeVariance: document.getElementById('complete-variance'),
    completeBonus: document.getElementById('complete-bonus'),
    completeScore: document.getElementById('complete-score'),
    insightText: document.getElementById('insight-text'),
    finalScore: document.getElementById('final-score')
};

// ===== Screen Management =====
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// ===== Canvas Drawing =====
function resizeCanvas() {
    const container = canvas.parentElement;
    const size = Math.min(container.clientWidth - 32, container.clientHeight - 32, 700);
    canvas.width = size * window.devicePixelRatio;
    canvas.height = size * window.devicePixelRatio;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    state.canvasSize = size;
    draw();
}

function draw() {
    const size = state.canvasSize;
    const center = size / 2;

    ctx.clearRect(0, 0, size, size);

    // Background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSpacing = 40;
    for (let i = 0; i <= size; i += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
    }

    // For multi-PC levels, always show PC2 (perpendicular to current angle)
    const level = levels[state.currentLevel];
    if (level && level.requiresPC2) {
        const pc2Angle = (state.angle + 90) % 180;
        drawAxis(center, pc2Angle, 'rgba(168, 85, 247, 0.5)', 3, true);  // Purple PC2
    }

    // Draw current axis
    const axisColor = state.phase === 'pc2' ? '#a855f7' : '#f43f5e';
    drawAxis(center, state.angle, axisColor, 4, false);

    // Draw projections onto axis
    drawProjections(center);

    // Draw data points
    state.dataPoints.forEach((point, i) => {
        const screenX = center + point.x * 2;
        const screenY = center - point.y * 2;

        ctx.beginPath();
        ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
        ctx.fillStyle = point.color;
        ctx.fill();

        // Glow effect
        ctx.shadowColor = point.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    updateAxisHandle(center);
}

function drawAxis(center, angleDeg, color, width, isDashed) {
    const angle = angleDeg * Math.PI / 180;
    const length = state.canvasSize * 0.45;

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';

    if (isDashed) {
        ctx.setLineDash([10, 10]);
    } else {
        ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(center - Math.cos(angle) * length, center + Math.sin(angle) * length);
    ctx.lineTo(center + Math.cos(angle) * length, center - Math.sin(angle) * length);
    ctx.stroke();
    ctx.setLineDash([]);

    // Axis glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawProjections(center) {
    const angle = state.angle * Math.PI / 180;
    const dx = Math.cos(angle);
    const dy = -Math.sin(angle);

    ctx.strokeStyle = 'rgba(244, 63, 94, 0.2)';
    ctx.lineWidth = 1;

    state.dataPoints.forEach(point => {
        const screenX = center + point.x * 2;
        const screenY = center - point.y * 2;

        const proj = (point.x * 2) * dx + (-point.y * 2) * dy;
        const projX = center + dx * proj;
        const projY = center + dy * proj;

        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(projX, projY);
        ctx.stroke();
    });
}

function updateAxisHandle(center) {
    const angle = state.angle * Math.PI / 180;
    const handleDistance = state.canvasSize * 0.4;

    const handleX = center + Math.cos(angle) * handleDistance;
    const handleY = center - Math.sin(angle) * handleDistance;

    const containerRect = axisControl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const offsetX = (canvasRect.left - containerRect.left) + (canvasRect.width / 2);
    const offsetY = (canvasRect.top - containerRect.top) + (canvasRect.height / 2);

    const relX = offsetX + Math.cos(angle) * (canvasRect.width * 0.4);
    const relY = offsetY - Math.sin(angle) * (canvasRect.height * 0.4);

    axisHandle.style.left = relX + 'px';
    axisHandle.style.top = relY + 'px';
}

// ===== UI Updates =====
function updateUI() {
    const totalVar = calculateTotalVariance(state.dataPoints);
    const pc1Var = calculateVarianceAlongAxis(state.dataPoints, state.angle);
    const pc1Percent = (pc1Var / totalVar) * 100;

    const level = levels[state.currentLevel];

    // For multi-PC levels, calculate PC2 variance (perpendicular axis)
    let pc2Percent = 0;
    let displayPercent = pc1Percent;

    if (level && level.requiresPC2) {
        const pc2Angle = (state.angle + 90) % 180;
        const pc2Var = calculateVarianceAlongAxis(state.dataPoints, pc2Angle);
        pc2Percent = (pc2Var / totalVar) * 100;
        displayPercent = pc1Percent + pc2Percent;  // In 2D, PC1 + PC2 = 100%

        elements.pc2Container.style.opacity = '1';
        elements.pc2Variance.textContent = pc2Percent.toFixed(1) + '%';
    }

    elements.varianceFill.style.width = Math.min(pc1Percent / state.optimalPC1Variance * 100, 100) + '%';
    elements.variancePercent.textContent = pc1Percent.toFixed(1) + '%';
    elements.angleValue.textContent = Math.round(state.angle);
    elements.pc1Variance.textContent = pc1Percent.toFixed(1) + '%';

    state.pc1Variance = pc1Percent;
    state.pc2Variance = pc2Percent;

    // For ALL levels, check if PC1 variance meets the dynamic target
    // This ensures players found the right direction (not just relying on PC1+PC2=100%)
    const meetsTarget = pc1Percent >= state.dynamicTarget;
    elements.confirmBtn.disabled = !meetsTarget;

    if (meetsTarget && elements.rotationHint.style.display !== 'none') {
        elements.rotationHint.innerHTML = '<span>✓ Target reached! Complete the level.</span>';
    }
}

// ===== Event Handlers =====
function handleDragStart(e) {
    state.isDragging = true;
    axisHandle.style.cursor = 'grabbing';
    document.body.style.cursor = 'grabbing';
}

function handleDragMove(e) {
    if (!state.isDragging) return;

    const canvasRect = canvas.getBoundingClientRect();
    const centerX = canvasRect.left + canvasRect.width / 2;
    const centerY = canvasRect.top + canvasRect.height / 2;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    let angle = Math.atan2(centerY - clientY, clientX - centerX) * 180 / Math.PI;

    // Constrain PC2 to be perpendicular to PC1
    if (state.phase === 'pc2' && state.pc1Angle !== null) {
        const perpAngle = (state.pc1Angle + 90) % 180;
        angle = perpAngle;
    }

    // Normalize to 0-180
    while (angle < 0) angle += 180;
    while (angle >= 180) angle -= 180;

    state.angle = angle;
    draw();
    updateUI();
}

function handleDragEnd() {
    state.isDragging = false;
    axisHandle.style.cursor = 'grab';
    document.body.style.cursor = 'default';
}

// ===== Game Flow =====
function startGame() {
    state.totalScore = 0;
    state.currentLevel = 0;
    elements.totalScore.textContent = '0';
    loadLevel(0);
    showScreen('game');
}

function loadLevel(levelIndex) {
    const level = levels[levelIndex];
    state.currentLevel = levelIndex;
    state.phase = 'pc1';
    state.pc1Angle = null;
    state.angle = 0;  // Start horizontal - player must find the optimal angle

    // Generate random data for this level (replayability!)
    state.dataPoints = generateDataForLevel(level);

    // Calculate optimal PC1 angle and variance for this specific data
    state.optimalAngle = findOptimalAngle(state.dataPoints);
    const totalVar = calculateTotalVariance(state.dataPoints);
    const optimalVar = calculateVarianceAlongAxis(state.dataPoints, state.optimalAngle);
    state.optimalPC1Variance = (optimalVar / totalVar) * 100;

    // Dynamic target: optimal PC1 variance - 2% (always achievable but challenging)
    state.dynamicTarget = Math.max(state.optimalPC1Variance - 2, 50);

    elements.levelNumber.textContent = levelIndex + 1;
    elements.levelName.textContent = level.name;
    elements.objectiveText.textContent = level.objective;
    elements.targetPercent.textContent = state.dynamicTarget.toFixed(0) + '%';
    elements.confirmBtn.querySelector('span').textContent = 'Complete Level';
    elements.pc2Container.style.opacity = level.requiresPC2 ? '1' : '0.3';
    elements.pc1Variance.textContent = '--';
    elements.pc2Variance.textContent = '--';
    elements.rotationHint.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        <span>Drag to rotate axis</span>
    `;
    elements.rotationHint.style.display = 'flex';

    // Make sure axis handle is visible for the new level
    axisHandle.style.display = 'block';

    setTimeout(() => {
        resizeCanvas();
        updateUI();
    }, 100);
}

function confirmPC() {
    completeLevel();
}


function completeLevel() {
    const level = levels[state.currentLevel];

    // Score based on how close PC1 is to optimal
    const pc1Accuracy = (state.pc1Variance / state.optimalPC1Variance) * 100;
    const baseScore = Math.round(pc1Accuracy * 10);
    const bonus = state.pc1Variance >= state.dynamicTarget ? Math.round((state.pc1Variance - state.dynamicTarget) * 25) : 0;
    const levelScore = baseScore + bonus;

    state.totalScore += levelScore;
    elements.totalScore.textContent = state.totalScore;

    // Show PC1 variance (the metric that matters)
    elements.completeVariance.textContent = state.pc1Variance.toFixed(1) + '%';
    elements.completeBonus.textContent = '+' + bonus;
    elements.completeScore.textContent = levelScore;
    elements.insightText.textContent = level.insight;

    if (state.currentLevel >= levels.length - 1) {
        document.getElementById('next-level-btn').querySelector('span').textContent = 'See Results';
    } else {
        document.getElementById('next-level-btn').querySelector('span').textContent = 'Next Level';
    }

    showScreen('complete');
}

function nextLevel() {
    if (state.currentLevel >= levels.length - 1) {
        elements.finalScore.textContent = state.totalScore;
        showScreen('final');
    } else {
        loadLevel(state.currentLevel + 1);
        showScreen('game');
    }
}

function showTooltip(title, text) {
    elements.tooltipTitle.textContent = title;
    elements.tooltipText.textContent = text;
    elements.tooltip.classList.add('visible');

    setTimeout(() => {
        elements.tooltip.classList.remove('visible');
    }, 4000);
}

// ===== Event Listeners =====
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('next-level-btn').addEventListener('click', nextLevel);
document.getElementById('restart-btn').addEventListener('click', () => {
    showScreen('start');
});
elements.confirmBtn.addEventListener('click', confirmPC);

// Drag events
axisHandle.addEventListener('mousedown', handleDragStart);
axisHandle.addEventListener('touchstart', handleDragStart);
document.addEventListener('mousemove', handleDragMove);
document.addEventListener('touchmove', handleDragMove);
document.addEventListener('mouseup', handleDragEnd);
document.addEventListener('touchend', handleDragEnd);

// Resize
window.addEventListener('resize', () => {
    if (screens.game.classList.contains('active')) {
        resizeCanvas();
    }
});

// Initialize
showScreen('start');
