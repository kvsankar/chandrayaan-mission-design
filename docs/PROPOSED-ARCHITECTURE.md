# Proposed Architecture: Event-Based Updates

## The Dependency Problem

You're absolutely right to be concerned. Without the reactive system, we need a clear pattern for:
1. **Who needs to know when data changes?**
2. **How do we avoid spaghetti dependencies?**
3. **How do we keep it testable?**

## Three Architectural Options

### Option 1: Direct Function Calls (Spaghetti Risk ⚠️)

```typescript
function setLaunchEventRaan(value: number) {
    launchEvent.raan = value;

    // Direct calls - spaghetti!
    updateVisualization();
    updateGUIDisplay();
    updateTimeline();
    updateMarkers();
    // ... more and more as app grows
}
```

**Problems:**
- ❌ Hard to maintain (every setter knows about everything)
- ❌ Tight coupling
- ❌ Hard to add new subscribers

---

### Option 2: Observer Pattern (What I Recommend ✅)

```typescript
// Simple event emitter
class EventBus {
    private listeners: Map<string, Set<(data: any) => void>> = new Map();

    on(event: string, callback: (data: any) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    emit(event: string, data?: any): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(cb => cb(data));
        }
    }
}

const events = new EventBus();

// Setters emit events (don't know about subscribers)
function setLaunchEventRaan(value: number) {
    launchEvent.raan = value;
    events.emit('launchEvent:raan', { raan: value });
}

// Subscribers register once at init (decoupled)
function initVisualization() {
    events.on('launchEvent:raan', () => {
        updateChandrayaanOrbit();
    });

    events.on('launchEvent:apogee', () => {
        updateChandrayaanOrbit();
    });

    events.on('launchEvent:inclination', () => {
        updateChandrayaanOrbit();
    });
}

function initGUI() {
    events.on('launchEvent:raan', ({ raan }) => {
        if (raanController) raanController.updateDisplay();
    });
}

function initTimeline() {
    events.on('launchEvent:date', ({ date }) => {
        updateLaunchMarker(date);
    });
}
```

**Advantages:**
- ✅ Loose coupling (setters don't know about subscribers)
- ✅ Easy to add new subscribers
- ✅ Easy to test (can spy on events)
- ✅ Clear flow: setter → event → handlers
- ✅ Only ~50 lines of event bus code

**Disadvantages:**
- ⚠️ Events are strings (no type safety)
- ⚠️ Need to be careful about event naming

---

### Option 3: Pull-Based with Change Tracking

```typescript
// Track what changed
const changeTracker = {
    changed: new Set<string>(),

    mark(property: string): void {
        this.changed.add(property);
    },

    hasChanged(property: string): boolean {
        return this.changed.has(property);
    },

    clear(): void {
        this.changed.clear();
    }
};

// Setters just mark changes
function setLaunchEventRaan(value: number) {
    launchEvent.raan = value;
    changeTracker.mark('raan');
}

// In animation loop (pull-based)
function render() {
    if (changeTracker.hasChanged('raan') ||
        changeTracker.hasChanged('apogee') ||
        changeTracker.hasChanged('inclination')) {
        updateChandrayaanOrbit();
    }

    if (changeTracker.hasChanged('raan')) {
        updateGUIDisplay('raan');
    }

    changeTracker.clear();

    requestAnimationFrame(render);
}
```

**Advantages:**
- ✅ Updates happen in one place (render loop)
- ✅ Can batch updates efficiently
- ✅ Good for animation-heavy apps

**Disadvantages:**
- ❌ Not suitable for immediate updates (like GUI inputs)
- ❌ Have to check for changes every frame

---

## My Recommendation: Hybrid Approach

Combine Observer pattern for immediate updates + pull-based for rendering:

```typescript
// ============================================================================
// EVENT BUS (Simple Observer Pattern)
// ============================================================================

type EventCallback = (data?: any) => void;

class EventBus {
    private listeners: Map<string, Set<EventCallback>> = new Map();

    on(event: string, callback: EventCallback): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        // Return unsubscribe function
        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }

    emit(event: string, data?: any): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(cb => {
                try {
                    cb(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }
}

const events = new EventBus();

// ============================================================================
// LAUNCH EVENT SETTERS (Emit events, don't know about subscribers)
// ============================================================================

function setLaunchEventValue(key: keyof LaunchEvent, value: any): void {
    (launchEvent as any)[key] = value;
    events.emit(`launchEvent:${key}`, { [key]: value });
}

// Convenient typed setters
const launchEventUpdates = {
    setRaan(value: number): void {
        setLaunchEventValue('raan', value);
    },

    setApogee(value: number): void {
        setLaunchEventValue('apogeeAlt', value);
    },

    setInclination(value: number): void {
        setLaunchEventValue('inclination', value);
    },

    setOmega(value: number): void {
        setLaunchEventValue('omega', value);
    },

    setTLIDate(value: Date): void {
        setLaunchEventValue('date', value);
        // Auto-compute if needed
        if (launchEvent.syncTLIWithLOI) {
            // Don't set - TLI should be computed from LOI
            console.warn('TLI is synced with LOI, cannot set manually');
        }
    },

    setLOIDate(value: Date): void {
        setLaunchEventValue('moonInterceptDate', value);
        // Auto-update TLI if sync enabled
        if (launchEvent.syncTLIWithLOI) {
            const computedTLI = computeTLIFromLOI(value);
            if (computedTLI) {
                launchEvent.date = computedTLI;
                events.emit('launchEvent:date', { date: computedTLI });
            }
        }
    },

    setOptimizedValues(values: { raan: number, apogeeAlt: number }): void {
        // Atomic update - both values set before events fire
        launchEvent.raan = values.raan;
        launchEvent.apogeeAlt = values.apogeeAlt;

        // Emit single event for batch update
        events.emit('launchEvent:optimized', values);
    }
};

// ============================================================================
// SUBSCRIBERS (Register at init, decoupled from setters)
// ============================================================================

function initVisualizationSubscribers(): void {
    // Orbital parameter changes → update Chandrayaan orbit
    events.on('launchEvent:raan', () => updateChandrayaanOrbit());
    events.on('launchEvent:apogeeAlt', () => updateChandrayaanOrbit());
    events.on('launchEvent:inclination', () => updateChandrayaanOrbit());
    events.on('launchEvent:omega', () => updateChandrayaanOrbit());
    events.on('launchEvent:perigeeAlt', () => updateChandrayaanOrbit());

    // Optimized values → update orbit (single handler for batch)
    events.on('launchEvent:optimized', () => updateChandrayaanOrbit());

    // Date changes → update markers
    events.on('launchEvent:date', ({ date }) => updateLaunchMarker(date));
    events.on('launchEvent:moonInterceptDate', ({ moonInterceptDate }) => {
        updateInterceptMarker(moonInterceptDate);
    });
}

function initGUISubscribers(): void {
    // Each GUI control subscribes to its own value
    events.on('launchEvent:raan', ({ raan }) => {
        if (raanController) {
            raanController.setValue(raan);
            raanController.updateDisplay();
        }
    });

    events.on('launchEvent:apogeeAlt', ({ apogeeAlt }) => {
        if (apogeeController) {
            apogeeController.setValue(apogeeAlt);
            apogeeController.updateDisplay();
        }
    });

    events.on('launchEvent:inclination', ({ inclination }) => {
        if (inclinationController) {
            inclinationController.setValue(inclination);
            inclinationController.updateDisplay();
        }
    });

    // Optimized values update → update multiple controls
    events.on('launchEvent:optimized', ({ raan, apogeeAlt }) => {
        if (raanController) {
            raanController.setValue(raan);
            raanController.updateDisplay();
        }
        if (apogeeController) {
            apogeeController.setValue(apogeeAlt);
            apogeeController.updateDisplay();
        }
    });
}

function initTimelineSubscribers(): void {
    events.on('launchEvent:date', () => updateTimelineSliders());
    events.on('launchEvent:moonInterceptDate', () => updateTimelineSliders());
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initEventHandlers(): void {
    initVisualizationSubscribers();
    initGUISubscribers();
    initTimelineSubscribers();
}

// Call once at app start
initEventHandlers();

// ============================================================================
// USAGE IN GUI CONTROLS
// ============================================================================

// RAAN slider
raanController = launchEventGUI.add(guiParams, 'raan', 0, 360, 0.1)
    .name('RAAN (Ω) (°)')
    .onChange(value => {
        // Clean! Just call the setter
        launchEventUpdates.setRaan(value);
        // That's it! Event bus handles the rest
    });

// Optimize button
optimizeButton.addEventListener('click', async () => {
    const result = await runOptimization();

    // Clean! Atomic update
    launchEventUpdates.setOptimizedValues({
        raan: result.raan,
        apogeeAlt: result.apogeeAlt
    });
    // Event bus notifies all subscribers
});
```

## Comparison: Event Bus vs Reactive System

| Aspect | Reactive System | Event Bus |
|--------|----------------|-----------|
| **Coupling** | Tight (proxy magic) | Loose (events) |
| **Visibility** | Hidden (watchers) | Visible (on/emit) |
| **Order** | Non-deterministic | Deterministic |
| **Debugging** | Hard (proxy traces) | Easy (event logs) |
| **Testing** | Hard (can't set values) | Easy (spy on events) |
| **Code size** | 300+ lines | ~50 lines |
| **Type safety** | Good (TypeScript) | Medium (string events) |
| **Circular deps** | Risk (bidirectional sync) | No risk (one-way flow) |

## Benefits of Event Bus

1. **Decoupling**: Setters don't know about subscribers
2. **Flexibility**: Easy to add/remove subscribers
3. **Testability**: Can spy on events to verify behavior
4. **Clarity**: Clear flow: user action → setter → event → handlers
5. **No spaghetti**: All subscriptions in one place (`initEventHandlers()`)
6. **Atomic updates**: Can emit single event for batch changes

## What About Spaghetti?

**With reactive system:**
```
Hidden watchers scattered throughout code
↓
Hard to find all side effects
↓
Spaghetti inside the reactive system!
```

**With event bus:**
```
All subscribers in initEventHandlers()
↓
Easy to see all side effects
↓
Clean architecture!
```

## TypeScript Improvements

We can add type safety to events:

```typescript
// Define event types
type LaunchEventEvents = {
    'launchEvent:raan': { raan: number };
    'launchEvent:apogeeAlt': { apogeeAlt: number };
    'launchEvent:inclination': { inclination: number };
    'launchEvent:optimized': { raan: number; apogeeAlt: number };
    // ... etc
};

// Typed event bus
class TypedEventBus<Events> {
    on<K extends keyof Events>(event: K, callback: (data: Events[K]) => void): void;
    emit<K extends keyof Events>(event: K, data: Events[K]): void;
}

const events = new TypedEventBus<LaunchEventEvents>();

// Now TypeScript checks event names and data types!
events.emit('launchEvent:raan', { raan: 45 }); // ✅ Type-safe
events.emit('launchEvent:raan', { wrong: 45 }); // ❌ Type error!
```

## Recommendation

Use **Observer pattern (Event Bus)** because:
1. ✅ No spaghetti - all subscriptions centralized in `initEventHandlers()`
2. ✅ Decoupled - setters don't know about subscribers
3. ✅ Testable - can spy on events
4. ✅ Simple - only ~50 lines of code
5. ✅ Flexible - easy to add new features
6. ✅ Type-safe - can add TypeScript types for events

This is **pull-based subscription** (subscribers pull data when event fires), not push-based reactivity (reactive system pushes changes automatically).
