# Testing Strategy

This document explains the testing strategy for the Chandrayaan-3 Orbit Visualization project, including test categorization for CI/CD pipelines.

## Test Categories

### Unit Tests (Fast)
**Location**: `*.test.ts` (excluding `e2e-*.test.ts`)

**Files**:
- `reactive.test.ts` - Event bus and reactive system tests
- `orbital-mechanics.test.ts` - Orbital calculations and physics
- `utils.test.ts` - Utility functions
- `ra-calculation.test.ts` - Right Ascension calculations
- `optimization.test.ts` - Optimization algorithm tests

**Run with**: `npm test`

**Characteristics**:
- Fast execution (seconds)
- No browser required
- Test pure functions and logic
- Run on every commit

### E2E Fast Tests (Quick Functional)
**Location**: Selected `e2e-*.test.ts` files

**Files**:
- `e2e-simple.test.ts` - Basic mode transitions and UI interactions
- `e2e-exact.test.ts` - Precise parameter validation
- `e2e-behaviors.test.ts` - Core behavior verification
- `e2e-workflow.test.ts` - Standard user workflows
- `e2e-modes.test.ts` - Mode transition tests (no optimization)

**Run with**: `npm run test:e2e:fast`

**Characteristics**:
- Quick browser tests (<2 minutes total)
- Essential functionality only
- No long-running optimizations
- Run on CI, pre-commit, GitHub push

### E2E Slow Tests (Comprehensive)
**Location**: All `e2e-*.test.ts` files

**Files**: All E2E tests including:
- `e2e-features.test.ts` - Feature-specific tests (includes optimization tests)
- `e2e-error-handling.test.ts` - Edge cases and error scenarios
- `e2e-visual-verification.test.ts` - Visual regression tests
- Plus all fast E2E tests

**Run with**: `npm run test:e2e:slow`

**Characteristics**:
- Comprehensive test coverage (4-5 minutes)
- Includes optimization tests (can take 3+ minutes per test)
- Includes all edge cases and error handling
- Run only on GitHub releases

## Test Execution

### Local Development
```bash
# Run unit tests (fast feedback)
npm test

# Run unit tests with coverage
npm run test:coverage

# Run fast E2E tests (pre-commit)
npm run test:e2e:fast

# Run all tests (before PR)
npm run test:all
```

### CI/CD Pipelines

#### Pre-commit Hook
```bash
npm run test:ci
# Runs: npm test && npm run test:e2e:fast
```

#### GitHub Push (PR checks)
```bash
npm run test:ci
# Runs: npm test && npm run test:e2e:fast
```

#### GitHub Release
```bash
npm run test:release
# Runs: npm test && npm run test:e2e:slow
```

## Configuration Files

### `playwright.config.ts` (default)
- Used by `npm run test:e2e`
- Runs all E2E tests
- For manual comprehensive testing

### `playwright.config.fast.ts`
- Used by `npm run test:e2e:fast`
- Runs only essential E2E tests
- Pattern: `/e2e-(simple|exact|behaviors|workflow|modes)\.test\.ts/`
- For CI and pre-commit

### `playwright.config.slow.ts`
- Used by `npm run test:e2e:slow`
- Runs all E2E tests
- Pattern: `/e2e-.+\.test\.ts/`
- For release testing

## Test Execution Times

**Estimated execution times** (may vary based on hardware):

| Test Suite | Time | When to Run |
|------------|------|-------------|
| Unit tests | ~1-2s | Every commit |
| E2E Fast | ~1-2m | Pre-commit, CI |
| E2E Slow | ~4-5m | Releases only |

## Why This Strategy?

### Fast Feedback Loop
- Unit tests run in seconds
- Fast E2E tests complete in 1-2 minutes
- Developers get quick feedback on code changes

### CI Resource Optimization
- CI pipelines run faster (2-3 minutes vs 5-6 minutes)
- Reduces GitHub Actions minutes consumption
- Faster PR feedback for contributors

### Comprehensive Release Testing
- All tests (including slow optimization tests) run before releases
- Ensures production-ready code
- Catches edge cases and timing issues

## Skipped Tests

Some tests are marked as `test.skip()` because they expose app limitations:

1. **Rapid mode switching** - Reveals UI responsiveness issues during fast mode transitions
2. **Multiple optimization scenarios** - Shows timing issues with draft state and mode switching

These tests document real app issues that would require refactoring to fix. They remain in the codebase as:
- Documentation of known limitations
- Future refactoring targets
- Regression tests when limitations are addressed

## Adding New Tests

### Unit Test
Add to appropriate `*.test.ts` file or create new one. Automatically included in `npm test`.

### Fast E2E Test
1. Create `e2e-{name}.test.ts`
2. Update `playwright.config.fast.ts` pattern to include it
3. Keep tests quick (<30 seconds per test)
4. Avoid long-running operations like optimization

### Slow E2E Test
1. Create `e2e-{name}.test.ts`
2. Automatically included in slow tests (no config change needed)
3. Can include long-running operations
4. Document expected execution time in test description

## Example: Setting Up CI

### GitHub Actions Workflow

**.github/workflows/ci.yml** (for PR checks):
```yaml
name: CI Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
```

**.github/workflows/release.yml** (for releases):
```yaml
name: Release Tests
on:
  release:
    types: [created]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:release
```

### Pre-commit Hook

**.husky/pre-commit** (if using Husky):
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run test:ci
```

Or with **lint-staged**:
```json
{
  "*.ts": [
    "npm run type-check",
    "npm run test:ci"
  ]
}
```

## Troubleshooting

### Fast tests are too slow
- Review included test files in `playwright.config.fast.ts`
- Consider moving slow tests to slow suite
- Check for unnecessary `waitForTimeout()` calls

### Tests failing on CI but passing locally
- Ensure `reuseExistingServer: !process.env.CI` in playwright config
- Check if tests depend on local state or timing
- Verify CI has enough resources (memory, CPU)

### Slow tests timing out
- Increase timeout in individual tests
- Consider breaking complex tests into smaller ones
- Check if optimization is taking longer than expected

## Best Practices

1. **Keep fast tests fast** - No optimization, minimal waits
2. **Use appropriate config** - Fast for CI, slow for releases
3. **Document test purpose** - Clear descriptions and console logs
4. **Handle flakiness** - Use retries on CI, stable selectors
5. **Clean up state** - Each test should be independent
6. **Use test helpers** - Leverage `window` helpers like `setAutoLOI()`
