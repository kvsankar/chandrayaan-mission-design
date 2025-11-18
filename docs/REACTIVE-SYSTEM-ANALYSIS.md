# Reactive System Analysis

## Executive Summary

**Recommendation: REMOVE the reactive system.** It's adding complexity without providing clear value, and is causing test failures and potential bugs.

## What the Reactive System Does

The reactive system (`reactive.ts`) implements Vue 3-style reactivity:
- Wraps `launchEvent` object to auto-track property access
- Automatically triggers updates when properties change
- Provides computed values and watch effects

##  Problems Found

### 1. **Bidirectional Sync Creates Circular Dependencies**

**The Problem:**
```typescript
// Lines 295-302: launchEvent → params
loadFromLaunchEvent(launchEvent: LaunchEvent): void {
    this.chandrayaanInclination = launchEvent.inclination;
    this.chandrayaanNodes = launchEvent.raan;
    this.chandrayaanOmega = launchEvent.omega;
    // ...
}

// Lines 393-398: params → launchEvent
saveParamsToLaunchEvent(): void {
    launchEvent.inclination = params.chandrayaanInclination;
    launchEvent.raan = params.chandrayaanNodes;
    launchEvent.omega = params.chandrayaanOmega;
    // ...
}
```

This creates a **bidirectional sync loop**:
1. User changes `params.chandrayaanInclination`
2. Reactive system triggers `saveParamsToLaunchEvent()`
3. This updates `launchEvent.inclination`
4. Reactive system triggers `loadFromLaunchEvent()`
5. This updates `params.chandrayaanInclination`
6. Loop repeats...

**Evidence:** The reactive system has code to detect circular dependencies:
```typescript
const effectStack: ReactiveEffect[] = []; // Track effect call stack for circular dependency detection
```

This is a code smell - if you need circular dependency detection, your architecture has fundamental issues.

### 2. **Breaks Programmatic Testing**

**Test Failures:**
- Cannot set `launchEvent.inclination` directly - reactive system reverts it
- Cannot set `launchEvent.raan` directly - reactive system reverts it
- Cannot set `launchEvent.omega` directly - reactive system reverts it
- TLI slider doesn't work (reactive sync issue)

**Why:** The reactive system enforces that changes must go through GUI controls, making programmatic testing nearly impossible.

### 3. **Hidden State Management**

The reactive system creates **invisible side effects**:

```typescript
watchEffect(() => {
    if (!launchEvent.exists) return;
    // Read reactive properties to track dependencies
    const inc = launchEvent.inclination;  // Just reading triggers tracking!
    // ...
```

Just **reading** a property registers dependencies and can trigger updates later. This makes debugging very difficult because:
- You can't see what will trigger updates
- Side effects are hidden in watchEffect() calls
- No clear call stack to trace bugs

### 4. **The Race Condition We Found**

Remember the rapid mode switching test that exposed apogeeAlt reverting to 370000?

**Root cause:** The reactive system has timing issues where:
1. User sets `apogeeAlt = 375000`
2. Reactive system triggers multiple watch effects
3. One effect reads a stale value and writes it back
4. Result: `apogeeAlt` reverts to default

This is a **classic reactive system bug** - you can't control the order of side effects.

### 5. **Complexity Without Clear Benefit**

**Current code:**
- 200+ lines in `reactive.ts`
- 10+ watchEffect() calls managing side effects
- Bidirectional sync between `params` and `launchEvent`
- Computed values for dates and periods
- Circular dependency detection

**What it actually buys us:**
- Auto-update GUI displays when data changes
- Auto-compute TLI from LOI date

**Could be done without reactivity:**
- Call `updateGUIDisplays()` after each change
- Call `computeTLIFromLOI()` when LOI changes

The complexity cost >> the benefit.

### 6. **Testing Issues**

**Current situation:**
- 4 out of 27 tests fail due to reactive system interference
- Tests cannot modify launch event parameters programmatically
- Must simulate actual GUI interactions (slow, brittle)
- No way to verify internal state without triggering side effects

**Without reactive system:**
- Can set values directly for testing
- Can verify state without side effects
- Tests run faster and are more reliable

## What We Actually Need

Looking at the use cases:

### ✅ **Use Case 1: GUI Updates**
**Need:** When `launchEvent.raan` changes, update the GUI slider

**Current (reactive):**
```typescript
watchEffect(() => {
    if (!launchEvent.exists) return;
    const raan = launchEvent.raan;
    updateGUIDisplays();
});
```

**Alternative (explicit):**
```typescript
function setLaunchEventRaan(value: number) {
    launchEvent.raan = value;
    updateGUIDisplay('raan');
}
```

**Winner:** Explicit is clearer and more testable.

### ✅ **Use Case 2: Computed TLI from LOI**
**Need:** When Auto LOI enabled, compute TLI date from LOI date

**Current (reactive):**
```typescript
const computedTLIDate = computed(() => {
    if (!launchEvent.syncTLIWithLOI) return null;
    // complex computation...
});
```

**Alternative (explicit):**
```typescript
function updateTLIFromLOI() {
    if (!launchEvent.syncTLIWithLOI) return;
    launchEvent.date = computeTLIDate(launchEvent.moonInterceptDate);
}
// Call this when LOI changes or sync toggle changes
```

**Winner:** Explicit is clearer about when computation happens.

### ✅ **Use Case 3: Parameter Isolation Between Modes**
**Need:** Explore mode params ≠ Plan/Game mode params

**Current:** ParameterSet system (good! Keep this)

**Reactive system doesn't help here at all.**

## Cost-Benefit Analysis

| Aspect | With Reactive | Without Reactive |
|--------|--------------|------------------|
| **Lines of code** | 200+ (reactive.ts) + 100+ (watchers) | ~50 (explicit updates) |
| **Debugging** | Hard (hidden side effects) | Easy (explicit calls) |
| **Testing** | Hard (can't set values directly) | Easy (direct assignment) |
| **Race conditions** | Possible (order of effects) | Unlikely (explicit order) |
| **Learning curve** | High (Vue reactivity concepts) | Low (simple functions) |
| **Performance** | Overhead from tracking | No overhead |

## Recommendation: Remove Reactive System

### Migration Plan

1. **Remove reactive wrapper from launchEvent**
   ```typescript
   // Before:
   let launchEvent = reactive<LaunchEvent>({ ... });

   // After:
   let launchEvent: LaunchEvent = { ... };
   ```

2. **Replace watchEffect() with explicit calls**
   ```typescript
   // Before:
   watchEffect(() => {
       updateGUIDisplay();
   });

   // After:
   function setLaunchEventValue(key: string, value: any) {
       launchEvent[key] = value;
       updateGUIDisplay(key);
   }
   ```

3. **Replace computed() with functions**
   ```typescript
   // Before:
   const computedTLIDate = computed(() => { ... });

   // After:
   function computeTLIDate(): Date | null { ... }
   ```

4. **Keep ParameterSet system** (it's good!)
   - Handles mode isolation well
   - No reactivity needed

### Benefits of Removal

1. ✅ **4 failing tests will pass** (can set values directly)
2. ✅ **No more race conditions** (explicit update order)
3. ✅ **Easier to debug** (clear call stack)
4. ✅ **Easier to understand** (no hidden side effects)
5. ✅ **Better performance** (no tracking overhead)
6. ✅ **Simpler codebase** (200+ fewer lines)

### Risks

❓ **Risk:** Might forget to call update functions after changing values

**Mitigation:**
- Use setter functions instead of direct assignment
- Add TypeScript getters/setters with auto-update
- Document which values need update calls

## Conclusion

The reactive system was a good experiment, but it's not solving the right problems:

- **Problem it solves:** Auto-update GUI when data changes
- **Problem we actually have:** Managing state across 3 modes with different behaviors

The ParameterSet system solves the real problem. The reactive system just adds complexity and bugs.

**Recommendation:** Remove reactive system, replace with explicit update functions.
