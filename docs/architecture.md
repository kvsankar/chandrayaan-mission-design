# Architecture Documentation

## Overview

The Chandrayaan-3 Orbit Visualization project consists of a **unified landing page** that routes to **three specialized applications**:

1. **Chandrayaan Mission Designer** (wizard.html) - Guided mission planning
2. **Explorer** (explorer.html) - Free-form orbital exploration
3. **Legacy Designer** (designer.html) - Timeline-based mission design

All three visualization apps share a common **event bus architecture** for state management, providing explicit, predictable state updates without the complexity of reactive proxies.

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
│  (explorer/designer)│
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

## Application Structure

### HTML Entry Points

```
index.html               # Unified landing page (main entry point)
├── wizard.html         # Chandrayaan Mission Designer
├── explorer.html       # Explorer app
└── designer.html       # Legacy Designer app
```

### File Structure

```
src/
├── landing.ts              # Landing page entry point
├── landing.css             # Landing page styling
├── explorer.ts             # Explorer app entry (Explore mode only)
├── designer.ts             # Designer app entry (Plan + Game modes)
├── main.ts                 # Original three-mode app (reference/backup)
├── events.ts               # Event bus implementation
├── launchEventSetters.ts   # State update functions with event emission
├── launchEventComputed.ts  # Computed value functions
├── optimization.ts         # Orbital optimization algorithms
├── constants.ts            # Physical and rendering constants
├── types.ts                # TypeScript type definitions
├── style.css               # Visualization app styles
├── types/                  # Type declarations
│   ├── astronomy-engine.d.ts
│   └── lil-gui.d.ts
├── ui/
│   └── dialog.ts           # Modal dialog components
└── wizard/                 # Mission Design Wizard
    ├── wizard-entry.ts     # Wizard app entry point
    ├── wizard.css          # Wizard-specific styling
    ├── WizardController.ts # State machine
    ├── steps/              # Wizard step implementations
    ├── components/         # Wizard UI components
    ├── calculations/       # Wizard-specific calculations
    └── data/               # Static data (landing sites)
```

### Application Sharing

**Shared Code** (used by all visualization apps):
- `events.ts`, `constants.ts`, `types.ts`
- `launchEventSetters.ts`, `launchEventComputed.ts`
- `optimization.ts`, `ui/dialog.ts`

**App-Specific Code**:
- `landing.ts` - Minimal routing logic
- `explorer.ts` - Explore mode only (~4,849 lines)
- `designer.ts` - Plan/Game modes (~4,867 lines)
- `wizard/` - Complete wizard implementation (separate architecture)

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

### explorer.ts / designer.ts

Event handlers are registered at initialization in both visualization apps:

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

## Mission Design Wizard Architecture

### Overview

The Mission Design Wizard is a **separate standalone application** with its own architecture, distinct from the main orbit visualization app.

**Key Differences:**
- **Approach**: Backwards mission design (goal → constraints) vs. forward simulation
- **State Management**: Wizard state object with localStorage vs. event bus with ephemeral state
- **Workflow**: Linear multi-step process vs. free-form exploration
- **Persistence**: Saves progress across sessions vs. no persistence

### Architecture Diagram

```
┌─────────────────────────────────────────────┐
│         WizardController (State Machine)     │
│  ┌───────────────────────────────────────┐  │
│  │  currentStepIndex                      │  │
│  │  landingSite                           │  │
│  │  landingWindow                         │  │
│  │  missionWindow                         │  │
│  │  loiDate                               │  │
│  │  requiredRAAN                          │  │
│  └───────────────┬───────────────────────┘  │
│                  │                           │
│         Step Rendering & Validation          │
└──────────┬──────────────────────┬────────────┘
           │                      │
    Update State            Navigate Steps
           │                      │
           ↓                      ↓
┌──────────────────┐    ┌──────────────────┐
│   localStorage   │    │  Step Components │
│  (Persistence)   │    │  ┌─────────────┐ │
│  ┌────────────┐  │    │  │ Step 1:     │ │
│  │ Save state │  │    │  │ Landing     │ │
│  │ Load state │  │    │  │ Site        │ │
│  │ Auto-clear │  │    │  └─────────────┘ │
│  │ (30 days)  │  │    │  ┌─────────────┐ │
│  └────────────┘  │    │  │ Step 2:     │ │
└──────────────────┘    │  │ Landing     │ │
                        │  │ Window      │ │
                        │  └─────────────┘ │
                        │  ┌─────────────┐ │
                        │  │ Step 3:     │ │
                        │  │ Mission     │ │
                        │  │ Window      │ │
                        │  └─────────────┘ │
                        │  ┌─────────────┐ │
                        │  │ Step 4:     │ │
                        │  │ LOI Date    │ │
                        │  └─────────────┘ │
                        └──────────────────┘
```

### Wizard State Management

#### WizardState Interface

```typescript
interface WizardState {
    stateVersion: number;          // For schema migrations
    currentStepIndex: number;      // Active step (0-3)
    lastSavedAt: Date;             // Timestamp for auto-clear

    // Step 1 data
    landingSite?: {
        name: string;
        latitude: number;
        longitude: number;
    };

    // Step 2 data
    landingWindow?: {
        startDate: Date;
        endDate: Date;
        sunElevation: {
            min: number;
            max: number;
        };
    };

    // Step 3 data
    missionWindow?: {
        startDate: Date;
        endDate: Date;
    };

    // Step 4 data
    loiDate?: Date;
    requiredRAAN?: number;
    orbitalParameters?: {
        inclination: number;
        raan: number;
        omega: number;
        perigeeAlt: number;
        apogeeAlt: number;
    };
}
```

### State Persistence

#### localStorage Implementation

**Storage Key**: `cy3-orbit:wizard-state`

**Save Strategy**:
- Automatically saves after completing each step
- Saves on wizard controller updates
- Includes timestamp for expiration tracking

**Load Strategy**:
- Attempts load on wizard initialization
- Validates state version for migration
- Shows resume dialog if valid state exists
- Auto-clears if state > 30 days old

**Example**:

```typescript
class WizardController {
    private saveState(): void {
        const state: WizardState = {
            stateVersion: 1,
            currentStepIndex: this.currentStepIndex,
            lastSavedAt: new Date(),
            landingSite: this.landingSite,
            landingWindow: this.landingWindow,
            missionWindow: this.missionWindow,
            loiDate: this.loiDate,
            requiredRAAN: this.requiredRAAN
        };

        localStorage.setItem(
            'cy3-orbit:wizard-state',
            JSON.stringify(state)
        );
    }

    private loadState(): WizardState | null {
        const json = localStorage.getItem('cy3-orbit:wizard-state');
        if (!json) return null;

        const state = JSON.parse(json);

        // Check expiration
        const savedDate = new Date(state.lastSavedAt);
        const daysSince = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 30) {
            this.clearState();
            return null;
        }

        // Validate version
        if (state.stateVersion !== 1) {
            return this.migrateState(state);
        }

        return state;
    }
}
```

### State Versioning

**Purpose**: Enable schema changes without breaking existing saved states.

**Strategy**:
1. Each state has a `stateVersion` field
2. On load, compare version with current schema version
3. If outdated, run migration function
4. If migration fails, clear state and start fresh

**Example Migration**:

```typescript
private migrateState(oldState: any): WizardState | null {
    if (oldState.stateVersion === 0) {
        // Migrate v0 → v1
        return {
            stateVersion: 1,
            currentStepIndex: oldState.step || 0,
            lastSavedAt: new Date(),
            landingSite: oldState.site,
            // ... map old fields to new schema
        };
    }

    // Unknown version - can't migrate
    return null;
}
```

### Component Hierarchy

```
WizardController
├── State Management
│   ├── loadState()
│   ├── saveState()
│   ├── clearState()
│   └── migrateState()
├── Navigation
│   ├── nextStep()
│   ├── previousStep()
│   └── goToStep()
├── Step Rendering
│   ├── LandingSiteStep
│   │   └── MoonGlobeView
│   │       └── SiteMarkers
│   ├── LandingWindowStep
│   │   └── SunIlluminationPanel
│   ├── MissionWindowStep
│   └── LOIDateStep
│       └── OrbitVisualizationPanel
│           ├── OrbitScene
│           ├── orbitCore
│           └── TimelineControls
└── Validation
    ├── validateStep()
    └── canProceed()
```

### Step Lifecycle

Each step follows a consistent lifecycle:

1. **Initialize**: Load saved data or use defaults
2. **Render**: Display UI components
3. **Validate**: Check if user input is complete/valid
4. **Save**: Update wizard state
5. **Transition**: Move to next step

```typescript
class WizardStep {
    abstract initialize(): void;
    abstract render(container: HTMLElement): void;
    abstract validate(): boolean;
    abstract getData(): StepData;

    onEnter(): void {
        this.initialize();
        this.render();
    }

    onExit(): void {
        if (!this.validate()) {
            throw new Error('Step validation failed');
        }
        controller.updateState(this.getData());
        controller.saveState();
    }
}
```

### Integration with Main Application

**Current Status**: Wizard is **standalone proof-of-concept**

**Why Separate?**
- Different educational philosophy (backwards design vs. forward simulation)
- Different state management needs (persistent with localStorage vs. ephemeral)
- Different workflows (linear step-by-step vs. free-form exploration)
- Different UI paradigms (guided wizard vs. parameter sliders)
- Allows independent development, testing, and optimization

**Future Integration Plans**:
1. Export wizard results to main app's Plan mode
2. Populate launch event from wizard state
3. Add "Import from Wizard" button in Plan mode
4. Unified state format for interoperability

**Integration Points** (not yet implemented):

```typescript
// Future: Export wizard state to main app
function exportToMainApp(wizardState: WizardState): LaunchEvent {
    return {
        date: computeTLIFromLOI(wizardState.loiDate, ...),
        moonInterceptDate: wizardState.loiDate,
        inclination: wizardState.orbitalParameters.inclination,
        raan: wizardState.requiredRAAN,
        omega: wizardState.orbitalParameters.omega,
        perigeeAlt: wizardState.orbitalParameters.perigeeAlt,
        apogeeAlt: wizardState.orbitalParameters.apogeeAlt,
        // ...
    };
}

// Future: Import wizard results in Plan mode
function importFromWizard(): void {
    const wizardState = loadWizardState();
    if (!wizardState) return;

    const launchEvent = exportToMainApp(wizardState);
    createLaunchEvent(launchEvent);
    switchToMode('plan');
}
```

### Comparison: Visualization Apps vs. Wizard

| Aspect | Explorer/Designer Apps | Mission Design Wizard |
|--------|------------------------|----------------------|
| **Architecture** | Event bus | State machine |
| **State Management** | Explicit setters + events | Direct state updates |
| **Persistence** | None (ephemeral) | localStorage (persistent) |
| **Workflow** | Non-linear, exploratory | Linear, step-by-step |
| **Goal** | Understanding geometry | Planning missions |
| **Entry Point** | `explorer.html`, `designer.html` | `wizard.html` |
| **Entry Script** | `explorer.ts`, `designer.ts` | `wizard/wizard-entry.ts` |
| **State Type** | `LaunchEvent` + GUI params | `WizardState` |
| **Update Pattern** | Setter → Event → Handler | Direct state mutation → Save |

### Testing Strategy

#### Unit Tests

Wizard-specific unit tests:
- Sun elevation calculation accuracy
- RAAN calculation from landing windows
- Landing window detection logic
- State serialization/deserialization

#### E2E Tests

Wizard workflow tests:
- Step navigation and validation
- State persistence across page reloads
- Complete wizard flow (4 steps)
- Resume functionality

**Example**: `tests/e2e/e2e-wizard-demo.test.ts`

```typescript
test('wizard completes full workflow', async ({ page }) => {
    await page.goto('/wizard.html');

    // Step 1: Select landing site
    await page.click('[data-site="shackleton"]');
    await page.click('[data-action="next"]');

    // Step 2: Choose landing window
    await page.selectOption('[data-window]', { index: 0 });
    await page.click('[data-action="next"]');

    // Step 3: Select mission window
    await page.fill('[data-mission-start]', '2023-07-14');
    await page.click('[data-action="next"]');

    // Step 4: View LOI optimization
    await expect(page.locator('[data-loi-date]')).toBeVisible();
    await expect(page.locator('[data-raan]')).toContainText(/\d+/);
});
```

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
