# Design Comparison: Reactive vs. Explicit

## Scenario 1: User Changes RAAN via GUI Slider

### CURRENT (Reactive System)

```
┌──────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐
│ User │    │GUI Slider│   │  params  │    │launchEvent│   │Watchers │
└──┬───┘    └────┬────┘    └────┬─────┘    └────┬─────┘    └────┬────┘
   │             │              │               │               │
   │ Drag slider │              │               │               │
   │────────────>│              │               │               │
   │             │              │               │               │
   │             │ onChange()   │               │               │
   │             │─────────────>│               │               │
   │             │              │               │               │
   │             │         params.chandrayaanNodes = value      │
   │             │              │               │               │
   │             │              │ Proxy intercepts SET          │
   │             │              │──────────────>│               │
   │             │              │               │               │
   │             │              │          Track dependency     │
   │             │              │               │──────────────>│
   │             │              │               │               │
   │             │              │         Trigger watchers      │
   │             │              │               │<──────────────│
   │             │              │               │               │
   │             │         watchEffect #1: saveParamsToLaunchEvent()
   │             │              │<──────────────│               │
   │             │              │               │               │
   │             │    launchEvent.raan = params.chandrayaanNodes
   │             │              │──────────────>│               │
   │             │              │               │               │
   │             │              │          Proxy intercepts SET │
   │             │              │               │──────────────>│
   │             │              │               │               │
   │             │              │         Trigger watchers      │
   │             │              │               │<──────────────│
   │             │              │               │               │
   │             │         watchEffect #2: loadFromLaunchEvent()
   │             │              │<──────────────│               │
   │             │              │               │               │
   │             │    params.chandrayaanNodes = launchEvent.raan
   │             │              │<──────────────│               │
   │             │              │               │               │
   │             │              │          Proxy intercepts SET │
   │             │              │──────────────>│               │
   │             │              │               │               │
   │             │              │         Circular dependency!  │
   │             │              │               │──────────────>│
   │             │              │               │               │
   │             │         watchEffect #3: updateVisualization()
   │             │              │<──────────────│               │
   │             │              │               │               │
   │             │         watchEffect #4: updateGUIDisplay()
   │             │              │<──────────────│               │
   │             │              │               │               │
   │             │         watchEffect #5: updateTimeline()
   │             │              │<──────────────│               │
   │             │              │               │               │
   │          Update display    │               │               │
   │             │<─────────────│               │               │
```

**Issues:**
- 🔴 Circular dependency between params ↔ launchEvent
- 🔴 5+ watchers triggered for single change
- 🔴 Order of execution is non-deterministic
- 🔴 Hidden side effects (can't see what will trigger)
- 🔴 Proxy overhead on every property access


### PROPOSED (Explicit Design)

```
┌──────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐
│ User │    │GUI Slider│   │launchEvent│   │  Update  │
└──┬───┘    └────┬────┘    └────┬─────┘    └────┬─────┘
   │             │              │               │
   │ Drag slider │              │               │
   │────────────>│              │               │
   │             │              │               │
   │             │ onChange()   │               │
   │             │─────────────>│               │
   │             │              │               │
   │             │   setLaunchEventRaan(value)  │
   │             │              │               │
   │             │    launchEvent.raan = value  │
   │             │              │               │
   │             │    updateVisualization('raan')
   │             │              │──────────────>│
   │             │              │               │
   │             │    updateGUIDisplay('raan')  │
   │             │              │──────────────>│
   │             │              │               │
   │          Update display    │               │
   │             │<─────────────│               │
```

**Advantages:**
- ✅ No circular dependencies (one-way flow)
- ✅ Only necessary updates called
- ✅ Execution order is explicit and predictable
- ✅ Easy to debug (clear call stack)
- ✅ No proxy overhead


---

## Scenario 2: Auto LOI - Computing TLI from LOI Date

### CURRENT (Reactive System)

```
┌──────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐
│ User │    │LOI Input│    │launchEvent│   │computed()│    │Watchers │
└──┬───┘    └────┬────┘    └────┬─────┘    └────┬─────┘    └────┬────┘
   │             │              │               │               │
   │ Change LOI  │              │               │               │
   │────────────>│              │               │               │
   │             │              │               │               │
   │             │  launchEvent.moonInterceptDate = newDate    │
   │             │─────────────>│               │               │
   │             │              │               │               │
   │             │              │ Proxy intercepts SET          │
   │             │              │──────────────>│               │
   │             │              │               │               │
   │             │              │         Trigger computed()    │
   │             │              │               │<──────────────│
   │             │              │               │               │
   │             │         computed TLI reads moonInterceptDate │
   │             │              │<──────────────│               │
   │             │              │               │               │
   │             │              │ Track dependency on moonInterceptDate
   │             │              │──────────────>│               │
   │             │              │               │               │
   │             │         computed TLI reads syncTLIWithLOI   │
   │             │              │<──────────────│               │
   │             │              │               │               │
   │             │              │ Track dependency on syncTLIWithLOI
   │             │              │──────────────>│               │
   │             │              │               │               │
   │             │         Compute TLI = LOI - 5.8 days        │
   │             │              │               │               │
   │             │         watchEffect: observe computed value │
   │             │              │               │──────────────>│
   │             │              │               │               │
   │             │    Set launchEvent.date = computed TLI      │
   │             │              │<──────────────│               │
   │             │              │               │               │
   │             │              │ Proxy intercepts SET          │
   │             │              │──────────────>│               │
   │             │              │               │               │
   │             │              │         Trigger watchers      │
   │             │              │               │<──────────────│
   │             │              │               │               │
   │             │         Multiple watchers fire for TLI change
```

**Issues:**
- 🔴 Complex dependency tracking (tracks reads)
- 🔴 Computed value triggers more watchers
- 🔴 Hard to know what triggers what


### PROPOSED (Explicit Design)

```
┌──────┐    ┌─────────┐    ┌──────────┐
│ User │    │LOI Input│    │launchEvent│
└──┬───┘    └────┬────┘    └────┬─────┘
   │             │              │
   │ Change LOI  │              │
   │────────────>│              │
   │             │              │
   │             │ setLOIDate(newDate)
   │             │─────────────>│
   │             │              │
   │             │    launchEvent.moonInterceptDate = newDate
   │             │              │
   │             │    if (launchEvent.syncTLIWithLOI) {
   │             │        launchEvent.date = computeTLIFromLOI()
   │             │    }
   │             │              │
   │             │    updateVisualization(['loi', 'tli'])
   │             │              │
   │             │    updateGUIDisplay(['loi', 'tli'])
   │             │              │
   │          Update display    │
   │             │<─────────────│
```

**Advantages:**
- ✅ Simple: if sync enabled, compute TLI
- ✅ Clear when computation happens
- ✅ No hidden dependency tracking


---

## Scenario 3: Mode Switch (Plan → Game)

### CURRENT (Reactive System)

```
┌──────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐
│ User │    │Mode Tab │    │StateManager│  │launchEvent│   │Watchers │
└──┬───┘    └────┬────┘    └────┬─────┘    └────┬─────┘    └────┬────┘
   │             │              │               │               │
   │ Click "Game"│              │               │               │
   │────────────>│              │               │               │
   │             │              │               │               │
   │             │ activatePlanGameParams()     │               │
   │             │─────────────>│               │               │
   │             │              │               │               │
   │             │         loadFromLaunchEvent()│               │
   │             │              │──────────────>│               │
   │             │              │               │               │
   │             │         params.chandrayaanInclination = launchEvent.inclination
   │             │              │<──────────────│               │
   │             │              │               │               │
   │             │              │          Proxy intercepts SET │
   │             │              │               │──────────────>│
   │             │              │               │               │
   │             │              │         Trigger watchers      │
   │             │              │               │<──────────────│
   │             │              │               │               │
   │             │         watchEffect: saveParamsToLaunchEvent()
   │             │              │<──────────────│               │
   │             │              │               │               │
   │             │    launchEvent.inclination = params.chandrayaanInclination
   │             │              │──────────────>│               │
   │             │              │               │               │
   │             │              │          Already same value   │
   │             │              │               │──────────────>│
   │             │              │               │               │
   │             │         [Repeat for raan, omega, perigee, apogee, trueAnomaly]
   │             │              │<──────────────│               │
   │             │              │               │               │
   │             │         updateAllGUIDisplays()
   │             │              │               │               │
   │          Switch to Game mode (timeline enabled)            │
   │             │<─────────────│               │               │
```

**Issues:**
- 🔴 Unnecessary watcher triggers (same values written back)
- 🔴 Race condition: rapid switching can cause params to revert


### PROPOSED (Explicit Design)

```
┌──────┐    ┌─────────┐    ┌──────────┐
│ User │    │Mode Tab │    │StateManager│
└──┬───┘    └────┬────┘    └────┬─────┘
   │             │              │
   │ Click "Game"│              │
   │────────────>│              │
   │             │              │
   │             │ switchToGameMode()
   │             │─────────────>│
   │             │              │
   │             │         // launchEvent already has correct values
   │             │         // No sync needed!
   │             │              │
   │             │         updateTimelineUI()
   │             │              │
   │             │         enablePlayback()
   │             │              │
   │          Switch to Game mode
   │             │<─────────────│
```

**Advantages:**
- ✅ No unnecessary updates
- ✅ No race conditions
- ✅ launchEvent is source of truth in Plan/Game modes


---

## Scenario 4: Optimization Updates RAAN and Apogee

### CURRENT (Reactive System)

```
┌──────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐
│ User │    │Optimize  │    │launchEvent│   │Watchers │
└──┬───┘    └────┬─────┘    └────┬─────┘    └────┬────┘
   │             │              │               │
   │Click Optimize│             │               │
   │────────────>│              │               │
   │             │              │               │
   │             │ Run optimization algorithm   │
   │             │              │               │
   │             │ launchEvent.raan = optimal   │
   │             │─────────────>│               │
   │             │              │               │
   │             │              │ Proxy SET → Trigger watchers
   │             │              │──────────────>│
   │             │              │               │
   │             │         watchEffect #1 fires │
   │             │              │<──────────────│
   │             │              │               │
   │             │ launchEvent.apogeeAlt = optimal
   │             │─────────────>│               │
   │             │              │               │
   │             │              │ Proxy SET → Trigger watchers
   │             │              │──────────────>│
   │             │              │               │
   │             │         watchEffect #2 fires (can read old apogeeAlt!)
   │             │              │<──────────────│
   │             │              │               │
   │             │         Race condition: watcher may revert apogeeAlt
   │             │              │               │
   │          Show result (wrong values!)      │
   │             │<─────────────│               │
```

**Issues:**
- 🔴 RACE CONDITION (this is the rapid mode switching bug!)
- 🔴 Watchers can read stale values and write them back


### PROPOSED (Explicit Design)

```
┌──────┐    ┌──────────┐    ┌──────────┐
│ User │    │Optimize  │    │launchEvent│
└──┬───┘    └────┬─────┘    └────┬─────┘
   │             │              │
   │Click Optimize│             │
   │────────────>│              │
   │             │              │
   │             │ Run optimization algorithm
   │             │              │
   │             │ setOptimizedValues({
   │             │     raan: optimal,
   │             │     apogeeAlt: optimal
   │             │ })
   │             │─────────────>│
   │             │              │
   │             │    launchEvent.raan = values.raan
   │             │    launchEvent.apogeeAlt = values.apogeeAlt
   │             │              │
   │             │    updateVisualization(['raan', 'apogee'])
   │             │              │
   │             │    updateGUIDisplay(['raan', 'apogee'])
   │             │              │
   │          Show result (correct values!)
   │             │<─────────────│
```

**Advantages:**
- ✅ NO RACE CONDITIONS (atomic update)
- ✅ All values updated together
- ✅ Deterministic update order


---

## Summary

| Aspect | Current (Reactive) | Proposed (Explicit) |
|--------|-------------------|---------------------|
| **Call depth** | 5-10 levels deep | 2-3 levels deep |
| **Side effects** | Hidden (watchers) | Visible (function calls) |
| **Circular deps** | Yes (params ↔ launchEvent) | No (one-way flow) |
| **Race conditions** | Yes (watcher order) | No (explicit order) |
| **Debugging** | Hard (proxy magic) | Easy (call stack) |
| **Testing** | Hard (can't set values) | Easy (direct assignment) |
| **Performance** | Overhead (tracking) | Fast (direct) |
| **Lines of code** | 300+ | ~50 |

## Key Insight

The reactive system was designed to solve "keeping GUI in sync with data", but:

1. **GUI updates are explicit anyway** - We call `updateDisplay()` manually in many places
2. **The real problem is mode isolation** - Already solved by ParameterSet system
3. **Reactivity adds problems** - Circular deps, race conditions, hard to test

**Conclusion:** Explicit updates are simpler, faster, more testable, and easier to debug.
