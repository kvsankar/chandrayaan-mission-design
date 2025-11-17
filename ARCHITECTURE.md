# Architecture Refactoring - Centralized Parameter Management

## Problem

The original code had a **scattered imperative approach** where every UI control manually called multiple update functions:

```javascript
// OLD WAY - Error prone!
chandrayaanControllers.omega = chandrayaanFolder.add(params, 'chandrayaanOmega', 0, 360, 1)
    .onChange(() => {
        syncParamsToLaunchEvent();
        invalidateOrbitalParamsCache();
        updateChandrayaanOrbitCircle();  // ← Easy to forget!
        updateChandrayaanOrbit();
        updateAOPLines();
        updateOrbitalElements();
    });
```

**Issues:**
- **Violation of Single Responsibility Principle**: Each UI handler knows too much about what needs to update
- **Duplication**: Same update sequences repeated across multiple handlers
- **Fragile**: Easy to forget an update function (caused the filled plane bug!)
- **Hard to maintain**: Adding a new visualization requires updating every relevant handler

## Solution: Centralized Parameter Change System

### 1. Dependency Declaration (main.js:416-487)

All parameter dependencies are declared in one place:

```javascript
const ParameterDependencies = {
    chandrayaanOmega: [
        'updateChandrayaanOrbitCircle',
        'updateChandrayaanOrbit',
        'updateAOPLines',
        'updateCraftMoonDistance',
        'updateOrbitalElements'
    ],
    // ... other parameters
};
```

**Benefits:**
- Single source of truth
- Easy to see what updates when a parameter changes
- Adding a new visualization just requires updating this map

### 2. Centralized Handler (main.js:492-526)

```javascript
function onParameterChange(paramName, newValue, skipSync = false) {
    if (isUpdatingFromCode) return; // Prevent circular updates

    isUpdatingFromCode = true;
    try {
        params[paramName] = newValue;

        if (!skipSync) syncParamsToLaunchEvent();
        if (paramName.startsWith('chandrayaan') || paramName.startsWith('moon')) {
            invalidateOrbitalParamsCache();
        }

        // Call all dependent update functions
        const dependencies = ParameterDependencies[paramName] || [];
        for (const funcName of dependencies) {
            UpdateFunctions[funcName]();
        }
    } finally {
        isUpdatingFromCode = false;
    }
}
```

**Benefits:**
- Consistent update logic
- Automatic cache invalidation
- Circular update prevention
- Error handling in one place

### 3. Function Registry (main.js:880-890)

Update functions are registered during initialization:

```javascript
UpdateFunctions.updateChandrayaanOrbitCircle = updateChandrayaanOrbitCircle;
UpdateFunctions.updateChandrayaanOrbit = updateChandrayaanOrbit;
// ... etc
```

### 4. Simplified GUI Handlers

```javascript
// NEW WAY - Clean and maintainable!
chandrayaanControllers.omega = chandrayaanFolder.add(params, 'chandrayaanOmega', 0, 360, 1)
    .onChange((value) => {
        // Special logic for this parameter (if any)
        if (params.restrictOrbitalParams) {
            value = getClosestAllowedOmega(value, params.chandrayaanInclination);
        }

        // Let the centralized system handle all updates
        onParameterChange('chandrayaanOmega', value);
    });
```

## Architecture Diagram

```
┌─────────────────┐
│   GUI Control   │
│  (lil-gui)      │
└────────┬────────┘
         │ onChange(value)
         ↓
┌─────────────────────────────┐
│ onParameterChange()         │
│ ┌─────────────────────────┐ │
│ │ 1. Update params        │ │
│ │ 2. Sync to launch event │ │
│ │ 3. Invalidate cache     │ │
│ │ 4. Call dependencies    │ │
│ └─────────────────────────┘ │
└──────────┬──────────────────┘
           │
           ↓
┌──────────────────────────────┐
│  ParameterDependencies Map   │
│  (Declarative)               │
└──────────┬───────────────────┘
           │
           ↓
┌──────────────────────────────┐
│  Update Functions            │
│  - updateOrbitCircle()       │
│  - updateOrbit()             │
│  - updateNodePositions()     │
│  - etc.                      │
└──────────┬───────────────────┘
           │
           ↓
┌──────────────────────────────┐
│  Three.js Scene              │
│  (Visual Rendering)          │
└──────────────────────────────┘
```

## Benefits of New Architecture

### 1. Separation of Concerns
- **GUI Layer**: Only handles user interaction and parameter-specific logic
- **Controller Layer**: `onParameterChange()` orchestrates updates
- **View Layer**: Update functions only know how to update their specific visuals
- **Model Layer**: Parameter dependencies declared separately

### 2. Maintainability
- **Add new visualization**: Just update `ParameterDependencies` map
- **Debug**: All parameter changes go through one function
- **Refactor**: Change update logic in one place

### 3. Correctness
- **No missing updates**: Dependencies are exhaustive
- **No circular updates**: Guard prevents infinite loops
- **Consistent behavior**: All parameters follow same pattern

### 4. Testability
- Can test parameter changes independently
- Easy to mock update functions
- Clear data flow

## Migration Pattern

### Before (Old Way)
```javascript
controller.onChange(() => {
    syncParamsToLaunchEvent();
    invalidateOrbitalParamsCache();
    updateFunction1();
    updateFunction2();
    updateFunction3();
});
```

### After (New Way)
```javascript
controller.onChange((value) => {
    // Only parameter-specific logic here
    onParameterChange('paramName', value);
});
```

## Refactored Parameters

✅ **Lunar Orbit:**
- `lunarInclination`
- `lunarNodes` (RAAN)
- `moonRA`
- `moonTrueAnomaly`

✅ **Chandrayaan Orbit:**
- `chandrayaanInclination` (with sync button)
- `chandrayaanNodes` (with sync button)
- `chandrayaanOmega` (with sync button)
- `chandrayaanPerigeeAlt`
- `chandrayaanApogeeAlt`

## Next Steps for Full Migration

The following parameters should be migrated to use `onParameterChange()`:

- `chandrayaanRA`
- `chandrayaanTrueAnomaly`
- All visibility toggles (if they need to trigger updates)
- Timeline-related parameters

## How the Bug Was Fixed

**Original Bug**: Chandrayaan filled plane not updating when AOP changed

**Root Cause**: The AOP `onChange` handler forgot to call `updateChandrayaanOrbitCircle()`

**Old Fix**: Manually add the missing function call (fragile!)

**New Fix**: Add `'updateChandrayaanOrbitCircle'` to `ParameterDependencies.chandrayaanOmega` - now it's impossible to forget!

## Design Principles Applied

1. **Single Responsibility**: Each function has one job
2. **Don't Repeat Yourself (DRY)**: Update logic centralized
3. **Open/Closed**: Open for extension (add new dependencies), closed for modification
4. **Dependency Inversion**: GUI depends on abstraction (`onParameterChange`), not concrete update functions
5. **Declarative over Imperative**: Dependencies declared as data, not scattered in code

## Performance Considerations

The centralized system is actually **more efficient** because:
- No duplicate update calls (each function called exactly once)
- Cache invalidation only when needed
- Circular update prevention avoids wasted work

## Conclusion

This refactoring transforms the codebase from a **fragile imperative mess** to a **robust declarative system** that's easier to understand, maintain, and extend. The filled plane bugs are symptoms we fixed, but the real value is preventing all future bugs of this class.
