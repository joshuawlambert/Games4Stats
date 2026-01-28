# AGENTS.md - Coding Guidelines for Games4Stats

## Project Overview

Games4Stats is an educational gaming platform teaching statistical concepts through interactive HTML5 Canvas games. It's a static site deployed on GitHub Pages with no build system.

**Tech Stack:**
- HTML5 (semantic markup)
- Vanilla JavaScript (ES6+)
- CSS3 with CSS custom properties
- No frameworks, no build tools, no package manager

## Project Structure

```
/
├── index.html              # Landing page
├── landing.css             # Landing page styles
├── .nojekyll               # GitHub Pages marker
├── games/
│   ├── group-guesser/      # Independent t-test game
│   ├── mirror-match/       # Paired t-test game
│   ├── chi-square-challenge/
│   ├── cluster-commander/  # ANOVA game
│   ├── factorial-flux/     # 2-way ANOVA game
│   └── variance-voyager/   # PCA game
│       ├── index.html
│       ├── game.js
│       └── styles.css
```

Each game is self-contained with its own HTML, CSS, and JS files.

## Code Style Guidelines

### JavaScript

- Use `const` by default, `let` only when reassignment needed
- Use camelCase for variables and functions
- Use PascalCase for classes
- Prefer arrow functions for callbacks
- Use template literals for string interpolation
- Use destructuring where appropriate
- No semicolons required (follow existing patterns)

```javascript
// Good
const calculateVariance = (data) => {
  const { mean, values } = data
  return values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length
}

// Section headers use =====
// ===== Game State =====
const state = { /* ... */ }
```

### CSS

- Use CSS custom properties (variables) defined in `:root`
- Naming convention: `--category-name` (kebab-case)
- Use rem units for spacing, px for borders/breakpoints
- Flexbox/Grid for layouts
- Glassmorphism design: `backdrop-filter: blur()`, semi-transparent backgrounds

```css
:root {
  --bg-dark: #0a0a0f;
  --glass-bg: rgba(255, 255, 255, 0.05);
  --primary: #6366f1;
  --text-main: #f8fafc;
}
```

### HTML

- Semantic HTML5 elements (`<header>`, `<main>`, `<article>`, `<footer>`)
- BEM-like class naming (lowercase, hyphen-separated)
- Google Fonts: Outfit (body), Space Mono (monospace)
- Include viewport meta tag for mobile

## Game Development Patterns

Each game follows this structure:

```javascript
// ===== State Management =====
const state = { /* game state */ }

// ===== Configuration =====
const config = { /* level config */ }

// ===== Data Generators =====
function generateData() { /* ... */ }

// ===== Rendering =====
function render() { /* canvas rendering */ }

// ===== Event Handlers =====
function handleInput() { /* ... */ }

// ===== Game Loop =====
function gameLoop() { /* ... */ }
```

## Testing

No automated test suite exists. Testing is manual:

1. Open game in browser
2. Test all interactive elements
3. Verify canvas rendering at different screen sizes
4. Check mobile responsiveness

## Deployment

This is a GitHub Pages site. To deploy:

1. Commit changes to `main` branch
2. Push to GitHub
3. GitHub Pages auto-deploys from root
4. No build step required

## Design System

**Colors:**
- Background: `#0a0a0f` (dark)
- Primary (indigo): `#6366f1`
- Secondary (pink): `#ec4899`
- Accent (teal): `#14b8a6`
- Amber: `#f59e0b`
- Purple: `#a855f7`

**Typography:**
- Headings: 'Space Mono', monospace
- Body: 'Outfit', sans-serif

**UI Patterns:**
- Glass cards: semi-transparent white backgrounds with blur
- Hover effects: `translateY(-5px)` with border highlight
- Status badges: colored indicators for game status
- Research tags: colored labels explaining statistical concepts

## Error Handling

- Use defensive programming for canvas context
- Validate user inputs before calculations
- Provide fallbacks for browser compatibility
- Log errors to console during development

## Performance

- Minimize DOM manipulation
- Use `requestAnimationFrame` for game loops
- Debounce resize handlers
- Optimize canvas redraws (only redraw changed regions)
