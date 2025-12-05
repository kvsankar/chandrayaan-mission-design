# Architecture Documentation

## Overview

The Chandrayaan-3 Orbit Visualization uses an **event bus architecture** for state management. This architecture provides explicit, predictable state updates without the complexity of reactive proxies.

---

## Event Bus Architecture

### Core Concept

State changes flow through a simple, explicit pattern:

```
User Action → Setter Function → Event Emission → Event Handlers → UI/Visualization Update
```

This approach provides:
- **Predictable execution order** - No hidden side effects
- **Easy debugging** - Clear call stack and event flow
- **Simple testing** - Can spy on events and mock handlers
- **No circular dependencies** - One-way data flow

### Architecture Diagram

```
┌─────────────────────┐
│  User Interaction   │
│  (GUI, Timeline)    │
└──────────┬──────────┘
           │ Call setter function
           ↓
┌─────────────────────┐
│  Setter Functions   │
│  (launchEventSetters.ts)
│  ┌────────────────┐ │
│  │ Validate input │ │
│  │ Update state   │ │
│  │ Emit event     │ │
│  └────────────────┘ │
└──────────┬──────────┘
           │ events.emit('launchEvent:*')
           ↓
┌─────────────────────┐
│  Event Bus          │
│  (events.ts)        │
│  ┌────────────────┐ │
│  │ Route to       │ │
│  │ subscribers    │ │
│  └────────────────┘ │
└──────────┬──────────┘
           │ Notify handlers
           ↓
┌─────────────────────┐
│  Event Handlers     │
│  (main.ts)          │
│  ┌────────────────┐ │
│  │ Update GUI     │ │
│  │ Update orbit   │ │
│  │ Update cache   │ │
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

## File Structure

```
src/
├── main.ts                 # Application entry, event handlers, Three.js scene
├── events.ts               # Event bus implementation
├── launchEventSetters.ts   # State update functions with event emission
├── launchEventComputed.ts  # Computed value functions
├── optimization.ts         # Orbital optimization algorithms
├── constants.ts            # Physical and rendering constants
├── types.ts                # TypeScript type definitions
├── style.css               # Application styles
├── types/                  # Type declarations
│   ├── astronomy-engine.d.ts
│   └── lil-gui.d.ts
└── ui/
    └── dialog.ts           # Modal dialog components
```

---

## Event Bus Implementation

### events.ts

The event bus provides type-safe event emission and subscription:

```typescript
type LaunchEventKey =
    | 'launchEvent:date'
    | 'launchEvent:moonInterceptDate'
    | 'launchEvent:inclination'
    | 'launchEvent:raan'
    | 'launchEvent:omega'
    | 'launchEvent:perigeeAlt'
    | 'launchEvent:apogeeAlt'
    | 'launchEvent:trueAnomaly';

class EventBus {
    private listeners: Map<string, Set<EventCallback>>;

    on(event: string, callback: EventCallback): () => void;
    emit(event: string, data?: any): void;
}

export const events = new EventBus();
```

### Usage

```typescript
// Subscribe to events
events.on('launchEvent:raan', () => {
    updateChandrayaanOrbit();
    invalidateOrbitalParamsCache();
});

// Emit events (done by setter functions)
events.emit('launchEvent:raan', { raan: 45 });
```

---

## Setter Functions

### launchEventSetters.ts

All state modifications go through setter functions that:
1. Validate the input
2. Update the state
3. Emit the appropriate event

```typescript
export function setLaunchEventRaan(
    launchEvent: LaunchEvent,
    value: number
): void {
    launchEvent.raan = value;
    events.emit('launchEvent:raan');
}

export function setLaunchEventInclination(
    launchEvent: LaunchEvent,
    value: number
): void {
    launchEvent.inclination = value;
    events.emit('launchEvent:inclination');
}

// ... similar functions for all launch event properties
```

### Benefits

- **Single point of change** - All updates to a property go through one function
- **Automatic event emission** - No forgotten notifications
- **Validation** - Can add input validation in one place
- **Debugging** - Easy to add logging/breakpoints

---

## Computed Values

### launchEventComputed.ts

Computed values are plain functions called when needed:

```typescript
export function computeTLIFromLOI(
    loiDate: Date,
    perigeeAlt: number,
    apogeeAlt: number
): Date {
    const periodSeconds = calculateOrbitalPeriod(perigeeAlt, apogeeAlt);
    const halfPeriodMs = (periodSeconds / 2) * 1000;
    return new Date(loiDate.getTime() - halfPeriodMs);
}

export function computeOrbitalPeriod(
    perigeeAlt: number,
    apogeeAlt: number
): number {
    const a = (perigeeAlt + apogeeAlt + 2 * EARTH_RADIUS) / 2;
    return 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / EARTH_MU);
}
```

### Usage in Setters

```typescript
export function setLaunchEventLOIDate(
    launchEvent: LaunchEvent,
    date: Date
): void {
    launchEvent.moonInterceptDate = date;
    events.emit('launchEvent:moonInterceptDate');

    // Auto-compute TLI if sync enabled
    if (launchEvent.syncTLIWithLOI) {
        const tliDate = computeTLIFromLOI(
            date,
            launchEvent.perigeeAlt,
            launchEvent.apogeeAlt
        );
        launchEvent.date = tliDate;
        events.emit('launchEvent:date');
    }
}
```

---

## Event Handler Organization

### main.ts

Event handlers are registered at initialization:

```typescript
function setupEventHandlers(): void {
    // Orbital parameter changes → update visualization
    events.on('launchEvent:raan', updateVisualization);
    events.on('launchEvent:inclination', updateVisualization);
    events.on('launchEvent:omega', updateVisualization);
    events.on('launchEvent:perigeeAlt', updateVisualization);
    events.on('launchEvent:apogeeAlt', updateVisualization);

    // Date changes → update timeline
    events.on('launchEvent:date', updateTimelineDisplay);
    events.on('launchEvent:moonInterceptDate', updateTimelineDisplay);
}

function updateVisualization(): void {
    if (!launchEvent.exists) return;
    invalidateOrbitalParamsCache();
    updateChandrayaanOrbit();
    updateRenderDate();
}
```

---

## State Management

### Parameter Sets

The application maintains separate parameter sets for different modes:

```typescript
interface ParameterSet {
    chandrayaanInclination: number;
    chandrayaanNodes: number;      // RAAN
    chandrayaanOmega: number;
    chandrayaanPerigeeAlt: number;
    chandrayaanApogeeAlt: number;
    chandrayaanTrueAnomaly: number;
}

class StateManager {
    private exploreParamSet: ParameterSet;    // Set A - Explore mode
    private planGameParamSet: ParameterSet;   // Set B - Plan/Game modes

    activateExploreParams(): void;
    activatePlanGameParams(): void;
}
```

### Mode Isolation

- **Explore Mode**: Uses independent parameter set for experimentation
- **Plan/Game Modes**: Share parameters linked to launch event
- Mode switching preserves each mode's state

---

## GUI Integration

### lil-gui Controllers

GUI controllers call setter functions on change:

```typescript
raanController = launchEventGUI.add(guiParams, 'raan', 0, 360, 0.1)
    .name('RAAN (Ω) (°)')
    .onChange(value => {
        setLaunchEventRaan(launchEvent, value);
        markDirtyAndUpdate();
    });
```

### GUI Updates from Events

Event handlers update GUI displays:

```typescript
events.on('launchEvent:raan', () => {
    if (raanController) {
        raanController.updateDisplay();
    }
});
```

**Important**: Use `updateDisplay()` not `setValue()` to avoid triggering onChange callbacks.

---

## Performance Optimizations

### Orbital Parameter Caching

```typescript
let orbitalParamsCache: OrbitalParams | null = null;

function invalidateOrbitalParamsCache(): void {
    orbitalParamsCache = null;
}

function getOrbitalParams(): OrbitalParams {
    if (orbitalParamsCache) return orbitalParamsCache;
    orbitalParamsCache = computeOrbitalParams();
    return orbitalParamsCache;
}
```

Cache is invalidated when:
- Orbital parameters change (via setter events)
- Mode switches
- Launch event created/deleted

### Animation Loop

The render loop avoids expensive operations:

```typescript
function animate(): void {
    requestAnimationFrame(animate);

    // Only update positions, don't recreate geometry
    updateMoonPosition();
    updateCraftPosition();

    // Geometry recreation only on parameter changes (via events)
    renderer.render(scene, camera);
}
```

---

## Comparison: Event Bus vs Reactive System

| Aspect | Reactive (Previous) | Event Bus (Current) |
|--------|---------------------|---------------------|
| **Execution order** | Non-deterministic | Deterministic |
| **Side effects** | Hidden (watchers) | Explicit (handlers) |
| **Circular deps** | Possible | Prevented by design |
| **Debugging** | Hard (proxy magic) | Easy (clear call stack) |
| **Testing** | Hard (can't set directly) | Easy (mock events) |
| **Code size** | 300+ lines | ~50 lines |
| **Learning curve** | Vue reactivity concepts | Simple pub/sub |

---

## Key Design Decisions

### Why Event Bus over Reactive?

1. **Simpler mental model** - No magic, explicit updates
2. **Predictable** - Same inputs always produce same order of effects
3. **Debuggable** - Can log all events, set breakpoints
4. **Testable** - Can subscribe to events in tests
5. **No race conditions** - Synchronous event handling

### Why Setter Functions?

1. **Encapsulation** - State changes go through controlled interface
2. **Event guarantee** - Every state change emits an event
3. **Validation hook** - Can add input validation
4. **Single responsibility** - One function per property

### Why Computed Functions (not Values)?

1. **Explicit invocation** - Called when needed, not auto-computed
2. **No caching complexity** - Simple function calls
3. **Predictable performance** - Know when computation happens
4. **Easy to test** - Pure functions with inputs/outputs

---

## Testing

### Unit Tests

Located in `tests/unit/`:
- `orbital-mechanics.test.ts` - Orbital calculations
- `ra-calculation.test.ts` - RA/anomaly conversions
- `optimization.test.ts` - Optimization algorithms
- `utils.test.ts` - Utility functions

### E2E Tests

Located in `tests/e2e/`:
- Mode transitions and parameter isolation
- Launch event lifecycle
- Timeline interactions
- Optimization workflows

### Running Tests

```bash
npm test              # Unit tests (once)
npm run test:e2e      # E2E tests (all)
npm run test:e2e:fast # E2E tests (fast subset)
```

---

## Code Quality

### ESLint

Configured in `eslint.config.js`:
- TypeScript recommended rules
- Complexity limit: 10 (Grade B max)
- Unused vars allowed with `_` prefix

### Pre-commit Hooks

Configured in `.pre-commit-config.yaml`:
- Trailing whitespace removal
- ESLint checks
- TypeScript compilation
- Complexity analysis

---

## Deployment

### GitHub Actions

The `deploy.yml` workflow:
1. Runs unit tests
2. Runs E2E tests (fast)
3. Builds TypeScript
4. Builds with Vite
5. Deploys to GitHub Pages

### Build Output

```
dist-pages/
├── index.html
├── assets/
│   ├── main-[hash].js
│   └── style-[hash].css
└── chandrayaan-mission-design.png
```

---

## Summary

The event bus architecture provides:

- **Simplicity** - Plain JavaScript/TypeScript, no framework magic
- **Predictability** - Explicit event flow, deterministic order
- **Debuggability** - Clear call stacks, easy to trace
- **Testability** - Mock events, verify handlers
- **Maintainability** - Small, focused functions

This architecture scales well for the application's complexity while remaining approachable for new developers.
