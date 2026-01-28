// ===== Game State =====
const state = {
    currentLevel: 0,
    observed: [],
    expected: [],
    chiSquare: 0,
    pValue: 1,
    df: 0,
    selectedDecision: null,
    isAssociated: false
};

// ===== Level Configuration =====
const levels = [
    {
        name: "Independence Test",
        description: "A study examines whether a new teaching method improves student pass rates.",
        rowLabels: ["Traditional", "New Method"],
        colLabels: ["Pass", "Fail"],
        // Clear association: New method has much higher pass rate
        observed: [[45, 15], [65, 5]],
        isAssociated: true,
        insight: "When the chi-square value is large and p < 0.05, we reject independence. Here, the new teaching method shows a clear association with higher pass rates."
    },
    {
        name: "Treatment vs. Placebo",
        description: "A clinical trial tests if a new drug reduces side effects compared to a placebo.",
        rowLabels: ["Placebo", "Drug"],
        colLabels: ["Side Effects", "No Side Effects"],
        // No clear association - similar rates
        observed: [[30, 70], [35, 65]],
        isAssociated: false,
        insight: "A non-significant result (p > 0.05) means we cannot conclude the drug affects side effect rates. The observed differences could be due to chance."
    },
    {
        name: "Complex Pattern",
        description: "Researchers survey 200 people about exercise frequency and sleep quality.",
        rowLabels: ["Low Exercise", "High Exercise"],
        colLabels: ["Poor Sleep", "Good Sleep"],
        // Moderate association
        observed: [[55, 45], [30, 70]],
        isAssociated: true,
        insight: "The chi-square test reveals a significant association between exercise and sleep quality. Notice how the expected values (shown in gray) differ from observed values."
    },
    {
        name: "Gender and Preference",
        description: "A marketing study examines if product preference differs by gender.",
        rowLabels: ["Male", "Female"],
        colLabels: ["Product A", "Product B"],
        // Very weak association - close to independence
        observed: [[48, 52], [52, 48]],
        isAssociated: false,
        insight: "With nearly equal preferences across genders, these variables appear independent. The chi-square statistic is small because observed ≈ expected."
    },
    {
        name: "Strong Association",
        description: "A study examines vaccination status and disease contraction.",
        rowLabels: ["Vaccinated", "Unvaccinated"],
        colLabels: ["Contracted Disease", "Healthy"],
        // Very strong association
        observed: [[5, 95], [45, 55]],
        isAssociated: true,
        insight: "Extremely large chi-square values indicate very strong associations. Here, vaccination status is highly associated with disease outcomes."
    }
];

// ===== DOM Elements =====
const elements = {
    startScreen: document.getElementById('start-screen'),
    gameScreen: document.getElementById('game-screen'),
    completeScreen: document.getElementById('complete-screen'),
    levelNumber: document.getElementById('level-number'),
    levelName: document.getElementById('level-name'),
    scenarioText: document.getElementById('scenario-text'),
    tableContainer: document.getElementById('contingency-table'),
    chiSquareDisplay: document.getElementById('chi-square-display'),
    pValueDisplay: document.getElementById('p-value-display'),
    btnIndependent: document.getElementById('btn-independent'),
    btnAssociated: document.getElementById('btn-associated'),
    confirmBtn: document.getElementById('confirm-btn'),
    completeTitle: document.getElementById('complete-title'),
    insightText: document.getElementById('insight-text')
};

// ===== Chi-Square Calculations =====
function calculateExpected(observed) {
    const rows = observed.length;
    const cols = observed[0].length;
    const expected = [];
    
    // Calculate row and column totals
    const rowTotals = observed.map(row => row.reduce((a, b) => a + b, 0));
    const colTotals = [];
    for (let j = 0; j < cols; j++) {
        colTotals.push(observed.reduce((sum, row) => sum + row[j], 0));
    }
    const grandTotal = rowTotals.reduce((a, b) => a + b, 0);
    
    // Calculate expected values
    for (let i = 0; i < rows; i++) {
        expected[i] = [];
        for (let j = 0; j < cols; j++) {
            expected[i][j] = (rowTotals[i] * colTotals[j]) / grandTotal;
        }
    }
    
    return { expected, rowTotals, colTotals, grandTotal };
}

function calculateChiSquare(observed, expected) {
    let chiSquare = 0;
    const contributions = [];
    
    for (let i = 0; i < observed.length; i++) {
        contributions[i] = [];
        for (let j = 0; j < observed[i].length; j++) {
            const diff = observed[i][j] - expected[i][j];
            const contribution = (diff * diff) / expected[i][j];
            chiSquare += contribution;
            contributions[i][j] = contribution;
        }
    }
    
    return { chiSquare, contributions };
}

// Approximate p-value from chi-square (simplified)
function chiSquareToP(chiSquare, df) {
    // Very rough approximation for visual feedback
    // chi-square critical values (approximate):
    // df=1: 3.84 (p=0.05), 6.63 (p=0.01)
    // df=2: 5.99 (p=0.05), 9.21 (p=0.01)
    // df=3: 7.81 (p=0.05), 11.34 (p=0.01)
    
    const criticalValues = {
        1: { p05: 3.84, p01: 6.63 },
        2: { p05: 5.99, p01: 9.21 },
        3: { p05: 7.81, p01: 11.34 },
        4: { p05: 9.49, p01: 13.28 }
    };
    
    const cv = criticalValues[df] || criticalValues[1];
    
    if (chiSquare < cv.p05) {
        return 0.10; // Rough approximation for display
    } else if (chiSquare < cv.p01) {
        return 0.03;
    } else {
        return 0.005;
    }
}

// ===== Table Rendering =====
function renderTable() {
    const level = levels[state.currentLevel];
    const { expected, rowTotals, colTotals, grandTotal } = calculateExpected(state.observed);
    state.expected = expected;
    
    const { chiSquare, contributions } = calculateChiSquare(state.observed, expected);
    state.chiSquare = chiSquare;
    state.df = (state.observed.length - 1) * (state.observed[0].length - 1);
    state.pValue = chiSquareToP(chiSquare, state.df);
    
    const rows = state.observed.length;
    const cols = state.observed[0].length;
    
    // Set grid template
    elements.tableContainer.style.gridTemplateColumns = `repeat(${cols + 2}, 1fr)`;
    
    let html = '';
    
    // Header row
    html += '<div class="table-cell header"></div>';
    level.colLabels.forEach(label => {
        html += `<div class="table-cell header">${label}</div>`;
    });
    html += '<div class="table-cell header">Total</div>';
    
    // Data rows
    for (let i = 0; i < rows; i++) {
        // Row label
        html += `<div class="table-cell header">${level.rowLabels[i]}</div>`;
        
        // Data cells
        for (let j = 0; j < cols; j++) {
            const contribution = contributions[i][j];
            const maxContribution = Math.max(...contributions.flat());
            const intensity = contribution / maxContribution;
            
            // Color based on contribution to chi-square
            const alpha = 0.1 + (intensity * 0.5);
            const bgColor = intensity > 0.5 
                ? `rgba(239, 68, 68, ${alpha})` 
                : `rgba(34, 197, 94, ${alpha})`;
            
            html += `
                <div class="table-cell data" style="background: ${bgColor};">
                    <div class="observed-value">${state.observed[i][j]}</div>
                    <div class="expected-value">(E: ${expected[i][j].toFixed(1)})</div>
                </div>
            `;
        }
        
        // Row total
        html += `<div class="table-cell total">${rowTotals[i]}</div>`;
    }
    
    // Column totals row
    html += '<div class="table-cell header">Total</div>';
    colTotals.forEach(total => {
        html += `<div class="table-cell total">${total}</div>`;
    });
    html += `<div class="table-cell total" style="background: rgba(99, 102, 241, 0.3);">${grandTotal}</div>`;
    
    elements.tableContainer.innerHTML = html;
    
    // Update displays
    elements.chiSquareDisplay.textContent = `χ² = ${chiSquare.toFixed(2)}`;
    
    if (state.pValue < 0.05) {
        elements.chiSquareDisplay.className = 'chi-square-display significant';
        elements.pValueDisplay.innerHTML = `p-value ≈ ${state.pValue < 0.01 ? '< 0.01' : state.pValue.toFixed(2)} <span style="color: #22c55e;">(Significant)</span>`;
    } else {
        elements.chiSquareDisplay.className = 'chi-square-display not-significant';
        elements.pValueDisplay.innerHTML = `p-value > 0.05 <span style="color: #ef4444;">(Not Significant)</span>`;
    }
}

// ===== Game Flow =====
function loadLevel(index) {
    state.currentLevel = index;
    state.selectedDecision = null;
    state.isAssociated = levels[index].isAssociated;
    state.observed = levels[index].observed.map(row => [...row]); // Deep copy
    
    elements.levelNumber.textContent = index + 1;
    elements.levelName.textContent = levels[index].name;
    elements.scenarioText.textContent = levels[index].description;
    
    // Reset decision buttons
    elements.btnIndependent.style.opacity = '1';
    elements.btnAssociated.style.opacity = '1';
    elements.btnIndependent.style.transform = 'scale(1)';
    elements.btnAssociated.style.transform = 'scale(1)';
    
    elements.confirmBtn.disabled = true;
    
    renderTable();
}

function handleDecision(decision) {
    state.selectedDecision = decision;
    
    // Visual feedback
    if (decision === 'independent') {
        elements.btnIndependent.style.transform = 'scale(1.05)';
        elements.btnAssociated.style.transform = 'scale(1)';
        elements.btnIndependent.style.opacity = '1';
        elements.btnAssociated.style.opacity = '0.5';
    } else {
        elements.btnAssociated.style.transform = 'scale(1.05)';
        elements.btnIndependent.style.transform = 'scale(1)';
        elements.btnAssociated.style.opacity = '1';
        elements.btnIndependent.style.opacity = '0.5';
    }
    
    elements.confirmBtn.disabled = false;
}

function confirmAnswer() {
    const isCorrect = (state.selectedDecision === 'associated' && state.isAssociated) ||
                     (state.selectedDecision === 'independent' && !state.isAssociated);
    
    if (isCorrect) {
        elements.completeTitle.textContent = 'Correct! 🎉';
        elements.completeTitle.style.color = '#22c55e';
    } else {
        elements.completeTitle.textContent = 'Not Quite 🤔';
        elements.completeTitle.style.color = '#f59e0b';
    }
    
    elements.insightText.textContent = levels[state.currentLevel].insight;
    elements.completeScreen.classList.add('active');
}

// ===== Event Listeners =====
document.getElementById('start-btn').addEventListener('click', () => {
    elements.startScreen.classList.remove('active');
    elements.gameScreen.classList.add('active');
    loadLevel(0);
});

elements.btnIndependent.addEventListener('click', () => handleDecision('independent'));
elements.btnAssociated.addEventListener('click', () => handleDecision('associated'));

elements.confirmBtn.addEventListener('click', confirmAnswer);

document.getElementById('next-level-btn').addEventListener('click', () => {
    elements.completeScreen.classList.remove('active');
    
    if (state.currentLevel < levels.length - 1) {
        loadLevel(state.currentLevel + 1);
    } else {
        alert('All challenges complete! Returning to hub.');
        window.location.href = '../../index.html';
    }
});

// Initialize
window.addEventListener('load', () => {
    // Game starts on button click
});
