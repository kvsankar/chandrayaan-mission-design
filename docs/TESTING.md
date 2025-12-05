# Testing Strategy

This document explains the testing strategy for the Chandrayaan-3 Orbit Visualization project.

## Overview

The project uses a **two-tier testing approach**:
- **Unit tests** (Vitest): Fast, pure function tests
- **E2E tests** (Playwright): Browser-based integration tests with fast/slow profiles

## Test Structure

```
tests/
├── unit/                    # Unit tests (Vitest)
│   ├── orbital-mechanics.test.ts
│   ├── ra-calculation.test.ts
│   ├── optimization.test.ts
│   └── utils.test.ts
└── e2e/                     # E2E tests (Playwright)
    ├── e2e-simple.test.ts
    ├── e2e-exact.test.ts
    ├── e2e-behaviors.test.ts
    ├── e2e-workflow.test.ts
    ├── e2e-modes.test.ts
    ├── e2e-features.test.ts
    ├── e2e-error-handling.test.ts
    ├── e2e-visual-verification.test.ts
    └── test-helpers.ts
```

## Running Tests

### Unit Tests

```bash
npm test              # Run once and exit
npm run test:watch    # Run in watch mode
npm run test:coverage # Generate coverage report
```

### E2E Tests

```bash
npm run test:e2e          # All tests (--project=default)
npm run test:e2e:fast     # Fast tests only (--project=fast, 33 tests)
npm run test:e2e:slow     # All tests (--project=slow, 49 tests)
npm run test:e2e:headed   # Run with visible browser
npm run test:e2e:ui       # Playwright UI for debugging
```

### Combined Test Suites

```bash
npm run test:ci       # Unit + Fast E2E (for CI/pre-commit)
npm run test:release  # Unit + Slow E2E (for releases)
npm run test:all      # Unit + All E2E
```

## Test Categories

### Unit Tests (Vitest)

**Location**: `tests/unit/*.test.ts`

| File | Purpose |
|------|---------|
| `orbital-mechanics.test.ts` | Orbital calculations and physics |
| `ra-calculation.test.ts` | Right Ascension ↔ True Anomaly conversions |
| `optimization.test.ts` | Optimization algorithm tests |
| `utils.test.ts` | Utility functions |

**Characteristics**:
- Fast execution (seconds)
- No browser required
- Test pure functions and logic

### E2E Fast Tests (Playwright)

**Project**: `--project=fast`
**Pattern**: `e2e-(simple|exact|behaviors|workflow|modes).test.ts`

Essential tests for CI and pre-commit:
- Basic mode transitions
- Core behavior verification
- Standard user workflows
- No long-running optimizations

**Execution time**: ~2 minutes

### E2E Slow Tests (Playwright)

**Project**: `--project=slow`
**Pattern**: `e2e-.+.test.ts` (all E2E tests)

Comprehensive tests for releases:
- All fast tests plus:
- `e2e-features.test.ts` - Feature-specific tests with optimization
- `e2e-error-handling.test.ts` - Edge cases and error scenarios
- `e2e-visual-verification.test.ts` - Visual distance verification

**Execution time**: ~5 minutes

## E2E Test Files

### e2e-workflow.test.ts
Complete user journeys:
- Full workflow: Explore → Plan → Optimize → Game → Validate
- Launch event lifecycle: create, edit, delete

### e2e-modes.test.ts
Mode transitions and parameter isolation:
- Separate parameter sets for Explore vs Plan/Game
- Rapid mode switching stability
- Complex mode transition chains
- Optimized values persistence

### e2e-behaviors.test.ts
Core behavior verification:
- Parameter controls in Explore mode
- Launch event parameters in Plan mode
- Timeline controls in Game mode
- Mode transition parameter preservation

### e2e-features.test.ts
Feature-specific tests:
- Auto LOI toggle
- Timeline controls
- Capture detection
- Multiple optimization scenarios
- Time progression

### e2e-error-handling.test.ts
Edge cases and robustness:
- Missing launch event/LOI date
- Invalid parameter values
- Rapid optimization requests
- Mode switching during optimization
- Browser reload behavior

### e2e-visual-verification.test.ts
**Critical test** that validates optimization results match visualization:
- Uses known equator crossing date
- Compares optimization-reported distance with actual visual distance
- Prevents regression of coordinate system bugs

### e2e-simple.test.ts / e2e-exact.test.ts
Parameter validation tests:
- Default parameter optimization
- Exact unit test parameter matching

## Playwright Configuration

Single config file with projects: `playwright.config.ts`

```typescript
projects: [
  { name: 'default', testMatch: /e2e-.+\.test\.ts/ },
  { name: 'fast', testMatch: /e2e-(simple|exact|behaviors|workflow|modes)\.test\.ts/ },
  { name: 'slow', testMatch: /e2e-.+\.test\.ts/ },
]
```

## CI/CD Integration

### Pre-commit Hooks

Pre-commit runs ESLint, TypeScript checks, and complexity analysis on staged files.

### GitHub Actions

The `deploy.yml` workflow runs:
1. Unit tests (`npm test`)
2. E2E fast tests (`npm run test:e2e:fast`)
3. Build and deploy to GitHub Pages

## Test Architecture

### Window Exposure

The application exposes objects to `window` for E2E testing:

```typescript
window.launchEvent      // Launch event state
window.params           // Current parameters
window.realPositionsCache  // Position cache for distance calculations
window.timelineState    // Timeline state
window.setSimulationTime(date)  // Control simulation time
```

### Common Testing Patterns

**Direct parameter access:**
```typescript
await page.evaluate(() => {
    const launchEvent = (window as any).launchEvent;
    launchEvent.inclination = 21.5;
});
```

**Dialog handling:**
```typescript
page.on('dialog', async dialog => {
    dialogText = dialog.message();
    await dialog.accept();
});
```

**Distance calculation:**
```typescript
const distance = await page.evaluate(() => {
    const cache = (window as any).realPositionsCache;
    const dx = cache.craftPositionKm.x - cache.moonPositionKm.x;
    // ... calculate distance
});
```

## Execution Times

| Test Suite | Time | When to Run |
|------------|------|-------------|
| Unit tests | ~2s | Every commit |
| E2E Fast | ~2m | CI, pre-commit |
| E2E Slow | ~5m | Releases only |

## Best Practices

1. **Keep fast tests fast** - No optimization, minimal waits
2. **Use appropriate project** - `fast` for CI, `slow` for releases
3. **Wait for state changes** after actions
4. **Use descriptive console logs** for debugging
5. **Clean up state** between tests
6. **Use test helpers** from `test-helpers.ts`

## Troubleshooting

### Tests failing on CI but passing locally
- Check `reuseExistingServer: !process.env.CI` in playwright config
- Verify tests don't depend on local state

### Slow tests timing out
- Increase timeout in individual tests
- Check if optimization is taking longer than expected

### Debugging failed tests
```bash
npm run test:e2e:headed  # See browser
npm run test:e2e:ui      # Step-by-step debugging
```
