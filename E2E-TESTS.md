# E2E Test Suite Documentation

## Overview

This comprehensive End-to-End (E2E) test suite validates the Chandrayaan-3 Orbit Visualization application using Playwright. The tests ensure that all critical user workflows, mode transitions, features, and error handling work correctly in a real browser environment.

## Test Files

### 1. `e2e-workflow.test.ts` - Complete User Workflows

Tests full end-to-end user journeys:

- **Full Workflow Test**: Explore → Plan → Optimize → Game → Validate
  - Sets Explore mode parameters
  - Creates launch event in Plan mode
  - Enables Auto LOI
  - Runs optimization
  - Switches to Game mode
  - Validates visual distance matches optimization results
  - Verifies parameter persistence across mode switches
  - Confirms Explore mode parameter isolation

- **Launch Event Lifecycle Test**: Creation, editing, and deletion
  - Creates launch event
  - Sets custom parameters
  - Validates persistence in Game mode
  - Deletes event

**Run with**: `npm run test:e2e:workflow`

### 2. `e2e-modes.test.ts` - Mode Transition Testing

Tests parameter isolation and persistence during mode transitions:

- **Parameter Isolation Test**
  - Verifies Explore mode has separate parameter set
  - Confirms Plan/Game modes share same parameter set
  - Validates no cross-contamination between modes

- **Rapid Mode Switching Test**
  - Rapidly switches between Plan and Game modes 10 times
  - Verifies parameters survive rapid switching without corruption

- **Complex Mode Transition Test**
  - Tests Plan → Game → Plan → Explore → Plan transitions
  - Validates each mode retains correct parameter values

- **Optimized Values Persistence Test**
  - Runs optimization to get specific RAAN/Apogee values
  - Performs multiple mode switches
  - Confirms optimized values persist throughout

**Run with**: `npm run test:e2e:modes`

### 3. `e2e-features.test.ts` - Feature-Specific Tests

Tests individual application features:

- **Auto LOI Toggle Test**
  - Verifies Auto LOI checkbox works correctly
  - Confirms Auto Optimize button appears/disappears appropriately

- **Timeline Controls Test**
  - Tests `setSimulationTime()` function
  - Verifies timeline state updates
  - Confirms position cache updates

- **Capture Detection Test**
  - Runs optimization for close approach
  - Sets time to LOI
  - Calculates Moon-Craft distance
  - Verifies distance is within capture threshold

- **Visibility Toggles Test**
  - Verifies visibility parameters exist
  - Tests toggling visibility settings

- **Multiple Optimization Scenarios Test**
  - Tests optimization with different LOI dates:
    - August 2023 (equator crossing)
    - September 2023
    - October 2023
  - Validates optimization works for any date

- **Time Progression Test**
  - Tests advancing time by 1 day
  - Tests jumping to specific time (5 days)
  - Verifies timeline updates correctly

**Run with**: `npm run test:e2e:features`

### 4. `e2e-error-handling.test.ts` - Edge Cases and Error Handling

Tests application robustness:

- **Optimization Without Launch Event**
  - Verifies Auto Optimize button is hidden without launch event

- **Optimization Without Auto LOI**
  - Confirms button hidden when Auto LOI disabled

- **Missing LOI Date**
  - Tests optimization with null LOI date
  - Verifies app doesn't crash

- **Invalid Parameter Values**
  - Tests extreme parameter values (negative, out of range)
  - Confirms app handles gracefully

- **Rapid Optimization Requests**
  - Clicks optimize button 3 times rapidly
  - Verifies app doesn't crash

- **Mode Switching During Optimization**
  - Starts optimization then switches modes
  - Confirms app remains stable

- **Extreme Time Values**
  - Tests far future date (2100)
  - Tests far past date (1950)
  - Verifies app handles without crashing

- **Multiple Launch Events Sequentially**
  - Creates and deletes launch events 3 times
  - Validates each creation/deletion cycle

- **Browser Page Reload**
  - Tests reloading in different modes
  - Verifies app resets to Explore mode

**Run with**: `npm run test:e2e:errors`

### 5. `e2e-visual-verification.test.ts` - Visual Distance Verification

**CRITICAL TEST** that exposed the coordinate system bug:

- Uses known equator crossing: 2023-08-05T11:25:58.258Z
- Runs optimization in Plan mode
- Switches to Game mode
- Sets time to LOI
- Compares optimization-reported distance with actual visual distance
- Validates they match within tolerance

This test ensures optimization results match what users actually see in the visualization.

**Run with**: `npm run test:e2e:visual`

### 6. `e2e-optimize.test.ts` - Optimization Functionality

Tests the Auto Optimize button:

- Creates launch event
- Enables Auto LOI
- Sets LOI date and parameters
- Clicks Auto Optimize button
- Validates dialog appears with results
- Verifies RAAN and Apogee are updated

**Run with**: `npm run test:e2e:optimize`

### 7. `e2e-exact.test.ts` - Exact Parameter Testing

Tests optimization with exact unit test parameters:

- LOI: 2023-08-05T11:25:58.258Z
- Omega: 178°
- Inclination: 21.5°
- Initial Apogee: 378,029 km

Expected result: ~1.2 km closest approach (matches unit tests)

**Run with**: `npm run test:e2e:exact` (if created separately)

### 8. `e2e-simple.test.ts` - Default Parameter Testing

Tests optimization with default parameters:

- Default apogee: 370,000 km
- Standard inclination and omega

Expected result: ~633 km closest approach

**Run with**: `npm run test:e2e:simple` (if created separately)

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   Server must be running on `http://localhost:3002`

### Running All E2E Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run all tests (unit + E2E)
npm run test:all
```

### Running Specific Test Suites

```bash
# Workflow tests
npm run test:e2e:workflow

# Mode transition tests
npm run test:e2e:modes

# Feature-specific tests
npm run test:e2e:features

# Error handling tests
npm run test:e2e:errors

# Visual verification test
npm run test:e2e:visual

# Optimization test
npm run test:e2e:optimize
```

### Interactive Debugging

```bash
# Run with browser visible
npm run test:e2e:headed

# Run with Playwright UI for debugging
npm run test:e2e:ui
```

## Test Architecture

### Window Exposure for Testing

The application exposes necessary objects to `window` for E2E testing (main.ts:428-442):

```typescript
(window as any).launchEvent = launchEvent;
(window as any).params = params;
(window as any).realPositionsCache = realPositionsCache;
(window as any).updateRenderDate = updateRenderDate;
(window as any).timelineState = timelineState;
(window as any).setSimulationTime = (date: Date) => { ... };
```

This allows tests to:
- Directly inspect and modify parameters
- Access position cache for distance calculations
- Control simulation time
- Verify internal state

### Key Testing Patterns

1. **Direct Parameter Setting**
   ```typescript
   await page.evaluate(() => {
       const launchEvent = (window as any).launchEvent;
       launchEvent.inclination = 21.5;
       launchEvent.omega = 178;
   });
   ```

2. **Dialog Handling**
   ```typescript
   let dialogText = '';
   page.on('dialog', async dialog => {
       dialogText = dialog.message();
       await dialog.accept();
   });
   ```

3. **Distance Calculation**
   ```typescript
   const distance = await page.evaluate(() => {
       const cache = (window as any).realPositionsCache;
       const cx = cache.craftPositionKm.x;
       const mx = cache.moonPositionKm.x;
       // ... calculate distance
       return Math.sqrt(dx*dx + dy*dy + dz*dz);
   });
   ```

4. **Time Control**
   ```typescript
   await page.evaluate((dateStr) => {
       const date = new Date(dateStr);
       (window as any).setSimulationTime(date);
   }, '2023-08-05T11:25:58.258Z');
   ```

## Test Coverage

The comprehensive E2E test suite covers:

✅ Complete user workflows from Explore to Game mode
✅ Mode transitions and parameter isolation
✅ Launch event lifecycle (create, edit, delete)
✅ Auto LOI toggle functionality
✅ Optimization with different LOI dates
✅ Timeline controls and time progression
✅ Capture detection in Game mode
✅ Visual distance verification against optimization
✅ Parameter persistence across mode switches
✅ Rapid mode switching robustness
✅ Error handling for invalid inputs
✅ Edge cases (extreme dates, missing data)
✅ Multiple optimization scenarios
✅ Browser reload behavior

## Critical Test - Visual Verification

The `e2e-visual-verification.test.ts` test is **CRITICAL** because it:

1. Exposed the coordinate system bug (Moon position had wrong sign)
2. Validates optimization results match actual visualization
3. Ensures users see accurate distances in Game mode
4. Prevents regression of the coordinate transformation fix

**Before fix**: Optimization reported 0.8 km, visual showed 63,605 km
**After fix**: Optimization 1.2 km, visual 1.3 km (within tolerance)

## Debugging Failed Tests

1. **Run in headed mode** to see browser:
   ```bash
   npm run test:e2e:headed
   ```

2. **Use Playwright UI** for step-by-step debugging:
   ```bash
   npm run test:e2e:ui
   ```

3. **Check screenshots**: Tests save screenshots to `/tmp/` directory

4. **Check console output**: Tests log detailed step-by-step progress

5. **Verify dev server is running** on port 3002

## Future Enhancements

Potential additions to test suite:

- Performance benchmarks for optimization speed
- Visual regression testing (screenshot comparison)
- Network request interception
- Accessibility testing
- Mobile/responsive layout testing
- Multi-browser testing (Firefox, WebKit)
- Parallel test execution
- Test report generation with screenshots

## Maintenance

When modifying the application:

1. Run full E2E suite before committing:
   ```bash
   npm run test:all
   ```

2. Update tests if UI structure changes

3. Update window exposure if new objects need testing

4. Add new tests for new features

5. Update this documentation with new test cases

## Test Timeouts

- Default test timeout: 30 seconds
- Optimization tests: Up to 3 minutes (360 attempts × 500ms)
- Adjust in individual tests if needed

## Best Practices

1. **Always wait for state changes** after actions
   ```typescript
   await page.click('button');
   await page.waitForTimeout(1000); // Allow state to update
   ```

2. **Use descriptive console logs** for debugging
   ```typescript
   console.log('\\n--- Step 1: Create launch event ---');
   ```

3. **Verify state before assertions**
   ```typescript
   const eventExists = await page.evaluate(() =>
       (window as any).launchEvent.exists
   );
   expect(eventExists).toBe(true);
   ```

4. **Clean up between tests** (delete launch events, reset state)

5. **Use meaningful test names** that describe what's being tested

## Contributing

When adding new E2E tests:

1. Choose the appropriate test file based on category
2. Follow existing patterns for consistency
3. Add detailed console logging for debugging
4. Include assertions to verify expected behavior
5. Update this README with new test descriptions
6. Add corresponding npm script to package.json

---

**Last Updated**: After implementing comprehensive E2E test suite
**Total Test Files**: 8
**Total Test Cases**: 20+
**Coverage**: All critical user workflows and edge cases
