# Architecture Documentation

## Overview

The Chandrayaan-3 Orbit Visualization uses a **reactive architecture** for state management and updates. This architecture evolved from a manual dependency tracking system to an automatic reactive system inspired by Vue.js.

---

## Reactive State Management

### Core Concept

The application uses JavaScript Proxies to automatically track dependencies and trigger updates when state changes. This eliminates manual update calls and prevents an entire class of bugs where developers forget to update dependent components.

### Key Components

**1. Reactive State (`reactive.js`)**

Makes objects reactive using JavaScript Proxy:
- Property reads are tracked
- Property writes trigger updates
- Automatic dependency tracking
- No manual subscription management

**2. Computed Values**

Auto-updating derived state:
- TLI date computed from LOI date minus half orbital period
- Orbital period calculated from perigee/apogee
- Updates automatically when dependencies change

**3. Reactive Effects**

Side effects that run when dependencies change:
- GUI updates
- Timeline synchronization
- Visualization rendering
- All organized into 4 clear sections

### Architecture Diagram

```
┌─────────────────────┐
│  User Interaction   │
│  (GUI, Timeline)    │
└──────────┬──────────┘
           │ Set property
           ↓
┌─────────────────────┐
│  Reactive State     │
│  (launchEvent)      │
│  ┌────────────────┐ │
│  │ JavaScript     │ │
│  │ Proxy          │ │
│  │ - Track reads  │ │
│  │ - Trigger on   │ │
│  │   writes       │ │
│  └────────────────┘ │
└──────────┬──────────┘
           │ Automatically triggers
           ↓
┌─────────────────────┐
│  Computed Values    │
│  - TLI Date         │
│  - Orbital Period   │
└──────────┬──────────┘
           │ Automatically updates
           ↓
┌─────────────────────┐
│  Reactive Effects   │
│  (9 effects in      │
│   4 sections)       │
│  ┌────────────────┐ │
│  │ Date Sync      │ │
│  │ GUI Updates    │ │
│  │ Timeline Sync  │ │
│  │ Visualization  │ │
│  └────────────────┘ │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Three.js Scene     │
│  (Visual Rendering) │
└─────────────────────┘
```

---

## Implementation

### Files

**reactive.js** (~220 lines)
- `reactive(obj)` - Make objects reactive
- `computed(getter)` - Create computed values
- `watchEffect(fn, options)` - Run effects with error handling
- `watch(getter, callback)` - Watch specific values
- Debug mode with circular dependency detection

**main.js**
- Line 100: `launchEvent` made reactive
- Lines 297-317: Computed values (TLI date, period)
- Lines 334-463: Reactive effects (9 effects in 4 sections)
- Lines 465-469: Cleanup function

### Reactive State

```javascript
// Launch event is reactive
let launchEvent = reactive({
    exists: false,
    date: null,                    // TLI date
    moonInterceptDate: null,       // LOI date
    inclination: 21.5,
    raan: 5,
    omega: 178,
    perigeeAlt: 180,
    apogeeAlt: 370000,
    trueAnomaly: 0,
    captureDistance: 5000,
    syncTLIWithLOI: true          // Auto-sync TLI from LOI
});

// Simple property assignment triggers all updates
launchEvent.moonInterceptDate = newDate;  // That's it!
```

### Computed Values

```javascript
// TLI date auto-computed from LOI - half orbital period
const computedTLIDate = computed(() => {
    if (!launchEvent.syncTLIWithLOI || !launchEvent.moonInterceptDate) {
        return launchEvent.date;  // Manual mode
    }

    const periodSeconds = calculateOrbitalPeriod(
        launchEvent.perigeeAlt,
        launchEvent.apogeeAlt
    );
    const halfPeriodMs = (periodSeconds / 2) * 1000;
    return new Date(launchEvent.moonInterceptDate.getTime() - halfPeriodMs);
});

// Orbital period for display
const computedPeriod = computed(() => {
    if (!launchEvent.exists) return '--';
    return formatPeriod(
        calculateOrbitalPeriod(launchEvent.perigeeAlt, launchEvent.apogeeAlt)
    );
});
```

### Reactive Effects

All effects are organized into 4 sections with descriptive names:

```javascript
function setupReactiveEffects() {
    // ========================================================================
    // DATE SYNCHRONIZATION - TLI/LOI coordination
    // ========================================================================

    reactiveEffectStops.push(watchEffect(() => {
        // Auto-sync TLI date when computed value changes
        if (!launchEvent.exists || !launchEvent.syncTLIWithLOI) return;
        const tliDate = computedTLIDate.value;
        if (tliDate && tliDate !== launchEvent.date) {
            if (!isUpdatingFromCode) {
                isUpdatingFromCode = true;
                launchEvent.date = tliDate;
                isUpdatingFromCode = false;
            }
        }
    }, { name: 'TLI Date Sync' }));

    // ========================================================================
    // GUI UPDATES - Sync model state to GUI displays
    // ========================================================================

    reactiveEffectStops.push(watchEffect(() => {
        // Auto-update TLI GUI display
        if (!launchEvent.exists || !launchDateController) return;
        const tliDate = launchEvent.date;
        if (tliDate && launchEventGUIParams) {
            launchEventGUIParams.launchDate = formatDateForDisplay(tliDate);
            launchDateController.updateDisplay();
        }
    }, { name: 'TLI GUI Update' }));

    // ... LOI GUI Update, Period Display Update, Sync Toggle Handler

    // ========================================================================
    // TIMELINE SYNCHRONIZATION - Sync dates to timeline sliders
    // ========================================================================

    reactiveEffectStops.push(watchEffect(() => {
        // Auto-update timeline sliders when dates change
        if (!launchEvent.exists) return;
        const tliDate = launchEvent.date;
        const loiDate = launchEvent.moonInterceptDate;
        syncRenderControlSlidersWithLaunchEvent();
    }, { name: 'Timeline Slider Sync' }));

    // ... Launch Marker Update

    // ========================================================================
    // VISUALIZATION UPDATES - 3D scene rendering
    // ========================================================================

    reactiveEffectStops.push(watchEffect(() => {
        // Auto-update visualization when orbital parameters change
        if (!launchEvent.exists) return;
        const inc = launchEvent.inclination;
        const raan = launchEvent.raan;
        const omega = launchEvent.omega;
        const perigee = launchEvent.perigeeAlt;
        const apogee = launchEvent.apogeeAlt;
        const ta = launchEvent.trueAnomaly;

        if (params.appMode === 'Plan') {
            draftState.isDirty = true;
        }
        syncParamsToLaunchEvent();
        invalidateOrbitalParamsCache();
        updateRenderDate();
    }, { name: 'Orbital Parameters Visualization' }));

    // ... Date Change Visualization
}
```

### Memory Management

```javascript
// Store effect cleanup functions
const reactiveEffectStops = [];

// Cleanup function for stopping all reactive effects
function cleanupReactiveEffects() {
    reactiveEffectStops.forEach(stop => stop());
    reactiveEffectStops.length = 0;
}
```

---

## API Reference

### `reactive(target)`

Makes an object reactive using JavaScript Proxy.

```javascript
const state = reactive({ count: 0 });

// Reading tracks dependencies
const value = state.count; // Tracked!

// Writing triggers effects
state.count = 1; // Triggers all dependent effects
```

### `computed(getter)`

Creates a computed value that auto-updates when dependencies change.

```javascript
const doubled = computed(() => state.count * 2);

console.log(doubled.value); // 2
state.count = 5;
console.log(doubled.value); // 10 (auto-updated)
```

### `watchEffect(fn, options)`

Runs a function and re-runs it when dependencies change.

**Parameters**:
- `fn` - Function to run reactively
- `options.name` - Name for debugging
- `options.onError` - Custom error handler

**Returns**: Stop function to cleanup

```javascript
const stop = watchEffect(() => {
    console.log('Count is:', state.count);
}, {
    name: 'Count Logger',
    onError: (error) => {
        console.error('Logger failed:', error);
    }
});

// Later: stop watching
stop();
```

### `watch(getter, callback)`

Watches specific properties and runs callback when they change.

```javascript
watch(
    () => state.count,
    (newValue, oldValue) => {
        console.log(`Changed from ${oldValue} to ${newValue}`);
    }
);
```

---

## Advanced Features

### Error Handling

All effects have automatic error logging with effect names:

```javascript
watchEffect(() => {
    // Effect code that might throw
}, {
    name: 'Critical Effect',
    onError: (error) => {
        console.error('Effect failed:', error);
        showUserNotification('Sync failed');
    }
});
```

**Output when error occurs**:
```
[Reactive] Error in Critical Effect: Error: Something went wrong
```

### Debug Mode

Enable detailed logging and circular dependency detection:

```javascript
// In reactive.js, set:
const DEBUG_MODE = true;
```

**Debug output**:
```
[Reactive] Tracking: moonInterceptDate by effect TLI Date Sync
[Reactive] Triggering: moonInterceptDate affects 3 effect(s)
[Reactive] ⚠️ Circular dependency detected! Effect "TLI Date Sync"
is already in call stack: ['TLI Date Sync', 'LOI GUI Update']
```

**Features**:
- Tracks all property access and triggers
- Detects circular dependencies before infinite loops
- Shows full call stack with effect names
- Zero performance overhead when disabled

### Effect Organization

9 effects organized into 4 clear sections:

**DATE SYNCHRONIZATION** (1 effect)
- TLI Date Sync

**GUI UPDATES** (4 effects)
- TLI GUI Update
- LOI GUI Update
- Period Display Update
- Sync Toggle Handler

**TIMELINE SYNCHRONIZATION** (2 effects)
- Timeline Slider Sync
- Launch Marker Update

**VISUALIZATION UPDATES** (2 effects)
- Orbital Parameters Visualization
- Date Change Visualization

---

## Benefits

### Before Reactive System

```javascript
// FRAGILE: Easy to forget update calls
interceptSlider.addEventListener('input', () => {
    launchEvent.moonInterceptDate = newDate;

    // Must manually remember to call ALL of these:
    updateTLIFromLOI();
    syncRenderControlSliders();
    updateInterceptGUI();
    updateRenderDate();
    updateLaunchMarker();
    // ... did I forget anything? 🤔
});
```

### After Reactive System

```javascript
// CLEAN: Just set the value, reactivity handles everything!
interceptSlider.addEventListener('input', () => {
    launchEvent.moonInterceptDate = newDate;  // That's it!
    // TLI auto-computes, GUI auto-updates, slider auto-moves,
    // visualization auto-refreshes
});
```

### Transformation

The reactive system transforms the codebase from:
- **Fragile** (easy to forget updates) → **Robust** (impossible to forget)
- **Complex** (manual dependency tracking) → **Simple** (just set values)
- **Error-prone** (scoping issues) → **Reliable** (automatic propagation)
- **Hard to extend** (update multiple places) → **Easy to extend** (define once)
- **Hard to debug** (silent failures) → **Easy to debug** (named effects, error handling)
- **Memory leaks** (no cleanup) → **Managed lifecycle** (cleanup functions)

---

## Production Readiness

The reactive system is production-ready with:

**Robustness**
- Error handling prevents silent failures
- Custom error callbacks for critical effects
- Circular dependency detection and prevention
- Proper memory management with cleanup functions

**Maintainability**
- 4 clear sections make codebase easy to navigate
- All 9 effects have descriptive names
- Self-documenting code structure
- Clean, intuitive API

**Debuggability**
- Debug mode with detailed logging
- Call stack tracking shows execution order
- Effect names in error messages
- Circular dependency warnings

**Performance**
- Zero debug overhead in production (DEBUG_MODE = false)
- Effects only run when values actually change
- WeakMap prevents memory leaks
- Lazy evaluation for computed values

---

## Design Principles

1. **Automatic Dependency Tracking**: No manual subscription management
2. **Pull > Push**: Views pull data when needed (reactive) vs. pushing updates (imperative)
3. **Declarative over Imperative**: Define dependencies once, updates happen automatically
4. **Single Responsibility**: Each effect has one clear purpose
5. **Fail-Safe**: Errors logged with context, custom handlers available

---

## How It Prevents Bugs

### Original TLI Sync Bug

**Problem**: Timeline slider changed LOI date, but TLI didn't update because `updateTLIFromLOI()` was scoped inside GUI creation function.

**Reactive Solution**:
```javascript
// Timeline slider - just set the value
interceptSlider.addEventListener('input', () => {
    launchEvent.moonInterceptDate = newDate;  // Done!
});

// GUI field - same code
loiField.onChange(() => {
    launchEvent.moonInterceptDate = newDate;  // Done!
});

// Future keyboard shortcut - same code
document.onkeypress = (e) => {
    if (e.key === '+') {
        launchEvent.moonInterceptDate = addDays(loiDate, 1);  // Done!
    }
};

// ALL trigger TLI update automatically!
```

**Why it works**:
- No scoping issues - effects are global
- No manual calls - automatic propagation
- No forgotten updates - impossible to forget
- Easy to extend - just set the property

---

## Comparison with Other Approaches

### vs. Manual Dependency Map

```javascript
// Manual map (what we almost did)
const LaunchEventDependencies = {
    moonInterceptDate: ['updateTLI', 'updateGUI', 'updateSlider'],
    // Still need to maintain this manually!
};

// Reactive (what we did)
// No map needed - automatically tracked!
```

### vs. Event Bus

```javascript
// Event bus
launchEvent.emit('moonInterceptDateChanged', newDate);
// Still need to remember to emit events

// Reactive
launchEvent.moonInterceptDate = newDate;
// Emission is automatic!
```

### vs. Redux/Flux

```javascript
// Redux
dispatch({ type: 'SET_LOI_DATE', payload: newDate });
// Requires actions, reducers, middleware

// Reactive
launchEvent.moonInterceptDate = newDate;
// Much simpler!
```

---

## Lessons Learned

### From Reactive Architecture

1. **Scoping issues are architectural red flags** - If a function can't be called from where it's needed, that's a design problem
2. **Manual dependencies don't scale** - As features grow, dependency maps become unmaintainable
3. **Pull > Push** - Views pulling data when needed is better than pushing updates
4. **Modern frameworks got it right** - Vue, React, Solid.js all use reactivity for good reason
5. **Debugging matters** - Named effects and error handling are essential for production code

### From RA Calculation Bug Regression

The RA sync positioning bug reappeared after being fixed, teaching valuable lessons about code quality:

#### 1. DRY Principle (Don't Repeat Yourself)

**Problem**: Same logic in multiple places means fixes don't propagate

**Solution**: Centralize shared logic in reusable functions

**Before**:
- RA↔Anomaly calculations duplicated in 6 places (5 inverse, 1 forward)
- Fixes only applied to 1 place initially
- Bug regressed during TypeScript refactoring

**After**:
- Created `calculateTrueAnomalyFromRA()` function (inverse)
- Created `calculateRAFromTrueAnomaly()` function (forward)
- All 7 locations now call centralized functions
- Single source of truth for each direction

#### 2. Automated Refactoring Risks

**Problem**: Using AI/automated tools to convert code can copy bugs

**What Happened**:
- Task agent converted JavaScript → TypeScript
- Agent likely copied original code without understanding the previous fix
- No tests caught the regression (UI-only code at the time)

**Solution**:
- Review automated changes carefully
- Have comprehensive tests (now implemented)
- Use linters and type checkers

#### 3. Test Coverage Gaps

**Problem**: UI interaction code wasn't tested initially

**Solution**: Need integration/E2E tests for UI

**Current State**:
- ✅ 97 unit tests for orbital mechanics and calculations
- ✅ Tests cover both RA→Anomaly and Anomaly→RA conversions
- ✅ Bidirectional consistency verification
- ⚠️ Future: Need E2E tests for GUI button callbacks

#### 4. Code Comments Aren't Enough

**Problem**: Comments explaining fixes don't prevent regression

**Solution**: Structural solutions over documentation

Comments had detailed explanations of spherical trigonometry, but:
- Comments don't prevent copy-paste errors
- Comments don't enforce correctness
- Comments can become outdated

Better solutions:
- **Functions** with clear names (`calculateTrueAnomalyFromRA`)
- **Types** that prevent wrong parameter order
- **Tests** that verify behavior
- **Linters** that detect duplicated code

#### 5. Regression Testing

**Problem**: Previous bugs can resurface during refactoring

**Solution**: Add test when fixing any bug

When a bug is fixed:
1. ✅ Add a test that would have caught it
2. ✅ Document the bug and fix
3. ✅ Centralize the logic
4. ✅ Add to regression test suite

### Software Engineering Principles

This project demonstrates fundamental software development challenges:

**Consistency is hard to maintain as codebases grow**

Solutions require multiple layers:
- **Architecture** (DRY, single responsibility)
- **Testing** (unit, integration, E2E)
- **Tooling** (linters, type checkers, analyzers)
- **Process** (code review, documentation)
- **Culture** (refactoring, technical debt management)

No single solution is sufficient. We need **defense in depth**.

### Key Takeaways

1. **Centralize shared logic** - Don't duplicate calculations
2. **Test everything** - Especially after fixing bugs
3. **Review automated changes** - AI tools can propagate bugs
4. **Use proper algorithms** - Simple formulas (`RA = RAAN + ω + ν`) only work for special cases (i=0°)
5. **Spherical trigonometry matters** - For inclined orbits, must use proper formulas

---

## Status

✅ **Production-ready** with excellent developer experience

The reactive architecture prevents not just the TLI sync bug, but an entire class of similar bugs in the future.

---

## Testing

### Test Suite Overview

Comprehensive unit test suite using Vitest:
- **97 tests** across 4 test files
- **100% pass rate**
- Covers reactive system, orbital mechanics, utilities, and RA calculations

### Running Tests

```bash
npm test              # Run all tests once
npm run test:ui       # Run tests in watch mode with UI
npm run test:coverage # Generate coverage report
```

### Test Files

**1. reactive.test.ts (28 tests)**
- Reactive proxy creation and tracking
- Computed values with lazy evaluation
- watchEffect and watch APIs
- Error handling and debug naming
- Complex scenarios (nested computed, conditional deps)

**2. orbital-mechanics.test.ts (24 tests)**
- Eccentricity and orbital period calculations
- True anomaly from time (Kepler equation)
- Right Ascension calculations with spherical trigonometry
- Distance and coordinate transformations
- Inclination/omega constraints

**3. ra-calculation.test.ts (5 tests)**
- Forward: True Anomaly → RA conversion
- Inverse: RA → True Anomaly conversion
- Bidirectional consistency verification
- Round-trip accuracy for various inclinations

**4. utils.test.ts (40 tests)**
- Angle normalization and conversions
- Date/time utilities
- Number formatting and validation
- Array operations and edge cases

### Test Configuration

- **Framework**: Vitest v1.6.1
- **Environment**: happy-dom (browser DOM simulation)
- **Coverage**: v8 provider
- **TypeScript**: Full type safety enabled

### Coverage

Current coverage (reactive system):
- **Statements**: 94.66%
- **Branches**: 85.71%
- **Functions**: 100%
- **Lines**: 94.66%

---

## Deployment

### GitHub Pages Deployment

The project uses **Vite + TypeScript** with automatic GitHub Actions deployment.

### How It Works

1. **Push to `master` branch** triggers the deployment workflow
2. **GitHub Actions** runs automatically:
   - Installs dependencies (`npm ci`)
   - Runs tests (`npm test`)
   - Compiles TypeScript (`npm run compile`)
   - Builds with Vite (`npm run build`)
   - Copies assets to `dist-pages/`
   - Deploys to GitHub Pages

### GitHub Pages Configuration

In repository settings:
1. Go to **Settings** → **Pages**
2. Source: **GitHub Actions** (not "Deploy from branch")
3. Workflow automatically deploys on push

### Local Development

```bash
npm run dev          # Start Vite dev server with HMR
                     # Runs at http://localhost:3000 (or 3001)
                     # Changes auto-reload in browser
```

### Manual Deployment

```bash
npm install          # Install dependencies
npm test             # Run tests
npm run compile      # Build TypeScript
npm run build        # Build with Vite
                     # Output in dist-pages/
```

### Build Output Structure

```
dist-pages/
├── index.html          # Entry point
├── main.js            # Bundled JavaScript (Three.js, lil-gui, etc.)
├── style.css          # Styles
├── *.glb              # 3D models
└── chandrayaan-mission-design.png
```

### Important Notes

1. **Dependencies are Bundled**: Three.js, lil-gui, and astronomy-engine bundled into main.js
2. **No CDN Dependencies**: Everything is self-contained
3. **TypeScript Support**: Source is .ts, compiled to .js for browser
4. **Tests Run on Deploy**: Build fails if tests fail
5. **Relative Paths**: Uses `base: './'` for GitHub Pages compatibility

### Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Server | Vite dev (port 3000) | Static files in dist-pages/ |
| TypeScript | On-the-fly | Pre-compiled then bundled |
| Modules | Loaded separately | Bundled into main.js |
| Hot Reload | ✅ Yes | ❌ No |
| Source Maps | ✅ Yes | ✅ Yes |
| File Size | Larger (unbundled) | Optimized & minified |

### CI/CD Workflow

The deployment workflow (`.github/workflows/deploy.yml`) runs on:
- Push to `master` branch
- Manual trigger (workflow_dispatch)

Steps:
1. Checkout code
2. Setup Node.js 18
3. Install dependencies
4. Run tests
5. Build TypeScript
6. Build with Vite
7. Copy assets
8. Deploy to GitHub Pages

### Troubleshooting

**Build fails on GitHub Actions:**
- Check Actions tab for error logs
- Ensure all dependencies in package.json
- Run `npm test` locally first

**Page shows blank:**
- Check browser console for errors
- Verify GitHub Pages source is "GitHub Actions"
- Check workflow completed successfully

**Assets not loading:**
- Ensure files copied in deploy.yml
- Check file paths are relative (no leading `/`)
