# Mission Design Wizard - Technical Specification

**Version:** 0.2
**Created:** January 2025
**Updated:** January 2025
**Status:** Approved

---

## 1. Overview

### 1.1 Purpose

Enhance the application to support **backwards mission design** - the methodology actually used by ISRO for Chandrayaan-3. Instead of users manually setting orbital parameters, the wizard guides them through a realistic mission design flow starting from landing site selection.

### 1.2 Design Philosophy

The actual Chandrayaan-3 mission design worked backwards:

```
Landing Site Selection
         ↓
Sun Illumination Constraints (6°-9° elevation)
         ↓
Candidate Landing Windows (monthly opportunities)
         ↓
Required Lunar Orbit RAAN for each window
         ↓
LOI Date (Moon's nodal crossings)
         ↓
TLI Date (half orbital period before LOI)
         ↓
Launch Window
```

This wizard implements this flow, making mission planning educational and realistic.

### 1.3 Iteration Plan

| Iteration | Deliverable | User Value |
|-----------|-------------|------------|
| **0** | **Sun elevation PoC** | **Algorithm validated against CY2/CY3 papers** |
| 1 | Moon globe + site selector | Visual site selection |
| 2 | Sun illumination UI | See valid landing windows |
| 3 | Landing window selection | Pick landing date |
| 4 | LOI date computation | Automatic LOI selection |
| 5 | Full wizard integration | Complete backwards design flow |

### 1.4 Scope Constraints

**In Scope:**
- Chandrayaan series missions (CY2, CY3)
- South polar landing sites
- Polar orbits (90° inclination)
- Near-side sites only (longitude -90° to +90°)

**Out of Scope:**
- Far side landing sites (no direct Earth comms)
- Non-polar inclinations
- AOP launch vehicle constraints
- Multiple saved missions
- Export/import functionality

---

## 2. User Flow

### 2.1 Navigation: Hybrid View

The wizard uses a hybrid navigation with breadcrumb (top) and collapsible tree (sidebar):

```
┌──────────────────────────────────────────────────────────────────┐
│ CY3 (2023) → Shiv Shakti → Aug 23 → [LOI] → Review              │
│     ✓            ✓           ✓        ●                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌───────────────────┐                                           │
│ │ ▼ Mission Path    │  ┌────────────────────────────────────┐   │
│ │                   │  │                                    │   │
│ │ ● Time Window     │  │         [Step Content Area]        │   │
│ │ │ CY3 (2023)     │  │                                    │   │
│ │ │                 │  │                                    │   │
│ │ └● Site           │  │                                    │   │
│ │  │ Shiv Shakti   │  │                                    │   │
│ │  │               │  │                                    │   │
│ │  └● Window       │  │                                    │   │
│ │   │ Aug 23       │  │                                    │   │
│ │   │              │  │                                    │   │
│ │   └● LOI ← here  │  │                                    │   │
│ │    │             │  │                                    │   │
│ │    └○ Review     │  │                                    │   │
│ │                   │  │                                    │   │
│ │ [▲ Collapse]      │  └────────────────────────────────────┘   │
│ └───────────────────┘                                           │
│                                                                  │
│                                [← Back]  [Cancel]  [Next →]      │
└──────────────────────────────────────────────────────────────────┘
```

**Features:**
- **Breadcrumb (top)**: Always visible, compact, clickable
- **Tree (sidebar)**: Collapsible, shows full details, clickable nodes
- Clicking either navigates to that step
- Downstream selections cleared when earlier step changes

**State Flow:**
```
Step 1 change → clears Steps 2-5
Step 2 change → recomputes availableWindows, clears Steps 3-5
Step 3 change → recomputes availableLOIDates, clears Steps 4-5
Step 4 change → recomputes TLI date
```

---

## 3. Wizard Steps

### 3.1 Step 1: Mission Time Window

**Purpose:** Set the overall time range for mission planning.

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 1: Mission Time Window                          [1/5 ●○○○○]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Select a time range for mission planning:                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ● Chandrayaan-3 (2023)                                    │  │
│  │    March 2023 - October 2023                               │  │
│  │                                                            │  │
│  │  ○ Chandrayaan-2 (2019)                                    │  │
│  │    January 2019 - September 2019                           │  │
│  │                                                            │  │
│  │  ○ Custom Range                                            │  │
│  │    Start: [________] End: [________]                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ℹ️  The time window determines available landing opportunities. │
│      Lunar landing windows occur roughly once per month when     │
│      sun elevation at the landing site is 6°-9°.                │
│                                                                  │
│                                         [Cancel]  [Next →]       │
└──────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Presets only set time range (no impact on site selection)
- Custom range allows any dates (for hypothetical/future missions)
- Minimum range: 1 month
- Maximum range: 12 months

---

### 3.2 Step 2: Landing Site Selection

**Purpose:** Select where on the Moon to land.

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 2: Landing Site                                 [2/5 ○●○○○]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────┐  ┌────────────────────────────┐ │
│  │                             │  │ Crosshair: -69.37°S 32.32°E│ │
│  │    ○ CY2-B                  │  │ ⚡ Near: Shiv Shakti Point  │ │
│  │         ○ CY2-P             │  │                            │ │
│  │              ● Shiv Shakti  │  │ [Set as Primary]           │ │
│  │              ○ CY3-P        │  │ [Set as Backup]            │ │
│  │                ○ CY3-B      │  │                            │ │
│  │          +                  │  │ ────────────────────────── │ │
│  │      [South Pole View]      │  │ Primary: (none)            │ │
│  │                             │  │                            │ │
│  │                             │  │ ☐ Add backup site          │ │
│  └─────────────────────────────┘  │                            │ │
│                                   │ ────────────────────────── │ │
│  Rotate: drag | Zoom: scroll      │ Settings:                  │ │
│                                   │  ☑ Snap to nearby sites    │ │
│                                   │  Snap radius: [2°  ▾]      │ │
│                                   │                            │ │
│                                   │ Presets: [CY3 ▾]           │ │
│                                   └────────────────────────────┘ │
│                                                                  │
│                                [← Back]  [Cancel]  [Next →]      │
└──────────────────────────────────────────────────────────────────┘
```

**Moon Globe View:**
- Default camera: Above South Pole (looking down at -90° latitude)
- NASA/USGS public domain texture
- Adaptive lat/lon grid (30° → 10° → 5° → 1° based on zoom)

**Site Selection UX - Crosshair Mode:**
- Fixed crosshair at viewport center
- Rotate/zoom globe to position target under crosshair
- Live coordinates update as globe rotates
- Click "Set as Primary" or "Set as Backup" to confirm

**Site Markers on Globe:**
- Small labeled markers at each preset site position
- Hover: Shows tooltip with full name, coordinates, description
- Abbreviated labels on globe (CY3-P, CY3-B, CY2-P, CY2-B, Shiv Shakti)

**Snap Behavior:**
```
Crosshair distance to site:
  > snap radius → No snap, use exact crosshair coordinates
  ≤ snap radius → Show "⚡ Near: [name]", clicking "Set" snaps to exact site coords
```

**Snap Configuration:**
- Default: Snap enabled, 2° radius
- Options: 1° | 2° | 5° | Off
- Setting persists via localStorage

**Far Side Constraint:**
```typescript
if (Math.abs(longitude) > 90) {
  showError('Far side sites not supported (no direct Earth comms)');
  return false;
}
```

**Validation:**
- Must have at least primary site selected
- Latitude: -90° to +90°
- Longitude: -90° to +90° (near side only)

---

### 3.3 Step 3: Landing Window Selection

**Purpose:** Show dates when sun elevation at the site is 6°-9°.

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 3: Landing Window                               [3/5 ○○●○○]│
│  Site: Shiv Shakti Point (-69.37°S, 32.32°E)                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Valid landing windows (Sun elevation 6°-9°):                    │
│                                                                  │
│  2023                                                            │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐              │
│  │ Mar │ Apr │ May │ Jun │ Jul │ Aug │ Sep │ Oct │              │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤              │
│  │  28 │  24 │  26 │  24 │  24 │[●23]│  21 │  20 │              │
│  │     │     │     │     │     │     │     │     │              │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘              │
│                          ▲                                       │
│                     Selected                                     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Selected: August 23, 2023 (Primary: Shiv Shakti)           │  │
│  │                                                            │  │
│  │ Window details:                                            │  │
│  │   Start:      Aug 22, 18:04 UT                            │  │
│  │   End:        Aug 24, 06:12 UT                            │  │
│  │   Duration:   36 hours                                     │  │
│  │   Peak sun:   7.5° (Aug 23, 12:00 UT)                     │  │
│  │   Req. RAAN:  262°                                        │  │
│  │                                                            │  │
│  │ ℹ️ Backup site (CY3 Backup) window opens ~Aug 25-26        │  │
│  │   Available if primary landing is not achieved             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ℹ️  Sun at 6°-9° provides optimal lighting for descent imaging │
│      while avoiding harsh shadows or thermal extremes.           │
│                                                                  │
│                                [← Back]  [Cancel]  [Next →]      │
└──────────────────────────────────────────────────────────────────┘
```

**Window Details:**
| Field | Description |
|-------|-------------|
| Start/End | When sun elevation enters/exits 6°-9° range |
| Duration | How long the window stays open |
| Peak sun | Maximum elevation and when it occurs |
| Req. RAAN | Required lunar orbit RAAN |

**Backup Site Warning:**
- If backup site selected, shows when backup window opens (~2-3 days after primary)
- Informational only, does not affect primary window selection

**Validation:**
- Must select one landing window to proceed

---

### 3.4 Step 4: LOI Date Selection

**Purpose:** Select when to perform Lunar Orbit Insertion.

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 4: LOI Date                                     [4/5 ○○○●○]│
│  Landing: Aug 23, 2023 | Required RAAN: 262°                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Compatible LOI opportunities:                                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ● Aug 5, 2023 13:42 UT                    [Recommended]   │  │
│  │   Moon distance:    372,206 km (closer = less ΔV)         │  │
│  │   Node type:        Descending                            │  │
│  │   Days to landing:  17.5 days                             │  │
│  │   Computed TLI:     Jul 31, 2023 ~18:30 UT               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ○ Jul 22, 2023 08:15 UT                                   │  │
│  │   Moon distance:    398,450 km                            │  │
│  │   Node type:        Ascending                             │  │
│  │   Days to landing:  32 days                               │  │
│  │   Computed TLI:     Jul 17, 2023 ~04:00 UT               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ○ Aug 18, 2023 19:30 UT                                   │  │
│  │   Moon distance:    365,800 km                            │  │
│  │   Node type:        Ascending                             │  │
│  │   Days to landing:  4.5 days (tight margin)              │  │
│  │   Computed TLI:     Aug 14, 2023 ~06:00 UT               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ℹ️  Moon crosses equator every ~13.7 days. Closer Moon         │
│      distance means lower fuel cost for orbit insertion.         │
│                                                                  │
│                                [← Back]  [Cancel]  [Next →]      │
└──────────────────────────────────────────────────────────────────┘
```

**LOI Candidate Details:**
| Field | Description |
|-------|-------------|
| Date/Time | When Moon crosses equatorial plane |
| Moon distance | Center-to-center Earth-Moon distance |
| Node type | Ascending (S→N) or Descending (N→S) |
| Days to landing | Time for lunar orbit operations |
| Computed TLI | Auto-calculated: LOI - (transfer orbit period / 2) |

**Ranking Logic:**
- Primary: Moon distance (closer = recommended)
- Secondary: Days to landing (≥10-15 days preferred)
- Warning if margin < 10 days ("tight margin")

**Validation:**
- Must select one LOI date to proceed

---

### 3.5 Step 5: Review & Confirm

**Purpose:** Summary of all computed mission parameters.

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 5: Mission Summary                              [5/5 ○○○○●]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ LANDING                                                     │ │
│  │ ─────────────────────────────────────────────────────────── │ │
│  │ Site:        Shiv Shakti Point                              │ │
│  │ Coordinates: 69.37°S, 32.32°E                               │ │
│  │ Date:        Aug 23, 2023 ~12:00 UT                         │ │
│  │ Sun elev:    7.2°                                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ LUNAR ORBIT                                                 │ │
│  │ ─────────────────────────────────────────────────────────── │ │
│  │ RAAN (Ω):     262°                                          │ │
│  │ Inclination:  90° (polar)                                   │ │
│  │ Target alt:   100 km circular (post-LOI)                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ LOI (Lunar Orbit Insertion)                                 │ │
│  │ ─────────────────────────────────────────────────────────── │ │
│  │ Date:        Aug 5, 2023 13:42 UT                           │ │
│  │ Moon dist:   372,206 km                                     │ │
│  │ Node type:   Descending                                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ TLI (Trans-Lunar Injection)                                 │ │
│  │ ─────────────────────────────────────────────────────────── │ │
│  │ Date:        Jul 31, 2023 18:32 UT                          │ │
│  │ Perigee:     180 km                                         │ │
│  │ Apogee:      ~372,000 km                                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ LAUNCH WINDOW                                               │ │
│  │ ─────────────────────────────────────────────────────────── │ │
│  │ Range:       Jul 12-19, 2023                                │ │
│  │ Nominal:     Jul 14, 2023 09:21 UT                          │ │
│  │ Injection:   i=21.3°, Ω=8.8°, ω=178.1°                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ☑ Compare with actual CY3 mission data                         │
│                                                                  │
│                     [← Back]  [Cancel]  [Create Mission]         │
└──────────────────────────────────────────────────────────────────┘
```

**On "Create Mission":**
1. Creates launch event with computed TLI parameters
2. Clears wizard state from localStorage
3. Switches to Plan mode with event loaded
4. User can fine-tune parameters if needed

**Comparison View (when checked):**
```
┌─────────────────────────────────────────────────┐
│ Parameter      │ Computed    │ Actual CY3      │
│────────────────┼─────────────┼─────────────────│
│ TLI Date       │ Jul 31      │ Jul 31 ✓        │
│ LOI Date       │ Aug 5       │ Aug 5  ✓        │
│ Landing        │ Aug 23      │ Aug 23 ✓        │
│ Lunar RAAN     │ 262°        │ 262°   ✓        │
└─────────────────────────────────────────────────┘
```

---

## 4. Algorithms

### 4.1 Sun Illumination Calculator

**Purpose:** Calculate when sun elevation at landing site is 6°-9°.

**Algorithm:**
```
1. Compute Sun altitude at landing site (lat, lon) for datetime
   - astronomy-engine gives Sun position relative to Moon
   - Transform to selenographic coordinates
   - Compute altitude angle at site

2. Find crossings via iterative method (bisection)
   - Find times when: sun_altitude(t) = 6°
   - Find times when: sun_altitude(t) = 9°
   - Pair crossings to form windows
```

**Finding Windows:**
```
For mission time range:
  1. Coarse scan: sample every 12 hours to find approximate regions
  2. Fine search: use bisection to find exact crossing times
     - f(t) = sun_altitude(t) - threshold
     - Find roots for threshold = 6° and threshold = 9°
  3. Pair crossings: 6° rise → 9° rise → 9° fall → 6° fall
```

**Performance:**
- Coarse scan: ~480 samples (8 months × 2/day)
- Bisection: ~10-15 iterations per crossing
- Total: <100ms

### 4.2 Proof of Concept - Algorithm Validation

**Purpose:** Validate sun elevation algorithm before UI work.

**File:** `src/wizard/poc/sun-elevation-poc.ts`

**Inputs:**
- CY3 sites: Shiv Shakti (-69.37°S, 32.32°E), Backup (-69.50°S, -17.33°W)
- CY2 sites: Primary (-70.90°S, 22.78°E), Backup (-67.75°S, -18.47°W)
- Time ranges: CY3 (Mar-Oct 2023), CY2 (Jan-Sep 2019)

**Validation Criteria:**
- Computed windows match paper dates within ±1 day
- Sun elevation at landing time falls within 6°-9°
- Monthly pattern matches (one window per ~29.5 day lunar cycle)

**Expected Results:**
| Mission | Site | Expected Landing | Sun Elev |
|---------|------|------------------|----------|
| CY3 | Primary | Aug 22-23, 2023 | 6°-9° |
| CY3 | Backup | Aug 20-21, 2023 | 6°-9° |
| CY2 | Primary | Sep 6-7, 2019 | 6°-9° |
| CY2 | Backup | Sep 5-6, 2019 | 6°-9° |

### 4.3 LOI Date Computation

**Status:** Already implemented in `src/optimization.ts`

**Existing Functions:**
| Function | Purpose |
|----------|---------|
| `findMoonEquatorCrossings(start, end)` | Finds Moon's equator crossings via declination root-finding |
| `findOptimalLOIDates(start, end)` | Returns array of LOI candidate dates |
| `calculateMoonPositionAtDate(date)` | Gets Moon distance at any date |
| `optimizeApogeeToMoonMultiStart(...)` | Full RAAN/apogee optimization |

**New wrapper needed:**
```typescript
export function getLOICandidates(startDate: Date, endDate: Date): LOICandidate[] {
  const dates = findOptimalLOIDates(startDate, endDate);
  return dates.map(date => ({
    date,
    moonDistance: getMoonDistance(date),
    nodeType: getNodeType(date),
  }));
}
```

### 4.4 Required RAAN Calculation

From the CY3 paper (Equation 1):
```
θS = θR + θ
```
Where:
- θS = Required RAAN of lunar orbit
- θR = Moon's sidereal angle (from ephemeris)
- θ = Landing site longitude (Moon-fixed)

---

## 5. Technical Architecture

### 5.1 File Structure

```
src/wizard/
├── MissionDesignWizard.ts      # Main wizard controller
├── WizardState.ts              # State management
├── steps/
│   ├── MissionWindowStep.ts    # Step 1: Time range
│   ├── LandingSiteStep.ts      # Step 2: Site selection
│   ├── LandingWindowStep.ts    # Step 3: Window selection
│   ├── LOISelectionStep.ts     # Step 4: LOI date
│   └── ReviewStep.ts           # Step 5: Summary
├── components/
│   ├── MoonGlobeView.ts        # Interactive Moon (Three.js)
│   ├── AdaptiveGrid.ts         # Lat/lon grid overlay
│   ├── SiteMarkers.ts          # Preset site markers + snap
│   ├── Breadcrumb.ts           # Top navigation
│   ├── DecisionTree.ts         # Sidebar tree view
│   └── WindowCalendar.ts       # Landing window calendar
├── calculations/
│   ├── sunElevation.ts         # Sun position at site
│   └── landingWindows.ts       # Find valid windows
├── data/
│   └── landing-sites.json      # Preset sites config
└── poc/
    └── sun-elevation-poc.ts    # Iteration 0 validation
```

**Reused from existing code:**
- `optimization.ts` → LOI dates, Moon position, orbital period
- `events.ts` → Event bus for state updates
- `launchEventSetters.ts` → Creating launch event on wizard completion

### 5.2 State Management

```typescript
interface WizardState {
  // Navigation
  currentStep: 1 | 2 | 3 | 4 | 5;

  // Step 1: Mission Window
  missionPreset: 'cy3' | 'cy2' | 'custom';
  missionStartDate: Date;
  missionEndDate: Date;

  // Step 2: Landing Site
  primarySite: LandingSite | null;
  secondarySite: LandingSite | null;
  snapEnabled: boolean;
  snapRadius: number;

  // Step 3: Landing Window
  availableWindows: LandingWindow[];
  selectedWindow: LandingWindow | null;

  // Step 4: LOI
  availableLOIDates: LOICandidate[];
  selectedLOI: LOICandidate | null;

  // Computed
  computedTLIDate: Date | null;
  computedLaunchWindow: DateRange | null;
}

interface LandingSite {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isPreset: boolean;
}

interface LandingWindow {
  startDate: Date;
  endDate: Date;
  peakElevation: number;
  peakTime: Date;
  duration: number;
  requiredRaan: number;
}

interface LOICandidate {
  date: Date;
  moonDistance: number;
  nodeType: 'ascending' | 'descending';
  daysToLanding: number;
}
```

### 5.3 State Persistence

**Storage:**
- Mechanism: `localStorage`
- Key: `cy3-orbit:wizard-state`
- Format: JSON with timestamp

```typescript
interface PersistedWizardState {
  savedAt: number;  // Date.now()
  version: 1;       // for future migrations
  state: WizardState;
}
```

**Lifecycle:**
| Event | Action |
|-------|--------|
| Step change | Save to localStorage |
| "Continue" (resume) | Load from localStorage |
| "Start Fresh" | Clear localStorage, init new |
| "Cancel" | Keep saved (can resume later) |
| "Create Mission" | Clear localStorage |
| State >30 days old | Auto-clear on open |

**Resume Dialog:**
```
┌────────────────────────────────────────────────────────────┐
│ ⚠️ Resuming saved progress from Jan 15, 2025              │
│ [Continue] [Start Fresh]                                   │
└────────────────────────────────────────────────────────────┘
```

### 5.4 Event Integration

**New Wizard Events:**
```typescript
type WizardEventKey =
  | 'wizard:open'
  | 'wizard:close'
  | 'wizard:stepChange'
  | 'wizard:siteSelected'
  | 'wizard:windowSelected'
  | 'wizard:loiSelected'
  | 'wizard:complete';
```

**Integration with Existing Events:**
```typescript
events.on('wizard:complete', ({ launchEvent }) => {
  setLaunchEventDate(launchEvent.tliDate);
  setLaunchEventMoonInterceptDate(launchEvent.loiDate);
  setLaunchEventRaan(launchEvent.raan);
  setLaunchEventInclination(launchEvent.inclination);
  setLaunchEventApogeeAlt(launchEvent.apogeeAlt);
});
```

### 5.5 Preset Sites Configuration

**File:** `src/wizard/data/landing-sites.json`

```json
{
  "sites": [
    {
      "id": "cy3-actual",
      "name": "Shiv Shakti Point",
      "mission": "cy3",
      "missionYear": 2023,
      "latitude": -69.3733,
      "longitude": 32.3191,
      "description": "Actual CY3 landing site (Aug 23, 2023)"
    },
    {
      "id": "cy3-primary",
      "name": "CY3 Primary (Planned)",
      "mission": "cy3",
      "missionYear": 2023,
      "latitude": -69.3676,
      "longitude": 32.3481,
      "description": "Originally planned primary site"
    },
    {
      "id": "cy3-backup",
      "name": "CY3 Backup",
      "mission": "cy3",
      "missionYear": 2023,
      "latitude": -69.4977,
      "longitude": -17.3304,
      "description": "CY3 backup landing site"
    },
    {
      "id": "cy2-primary",
      "name": "CY2 Primary (Planned)",
      "mission": "cy2",
      "missionYear": 2019,
      "latitude": -70.90,
      "longitude": 22.78,
      "description": "Chandrayaan-2 planned landing site"
    },
    {
      "id": "cy2-backup",
      "name": "CY2 Backup",
      "mission": "cy2",
      "missionYear": 2019,
      "latitude": -67.75,
      "longitude": -18.47,
      "description": "CY2 backup landing site"
    }
  ]
}
```

---

## 6. Testing Strategy

### 6.1 Test Layers

| Layer | Tool | What to Test |
|-------|------|--------------|
| PoC | Vitest | Sun elevation algorithm vs CY2/CY3 papers |
| Unit | Vitest | Calculations, state transitions, data transforms |
| E2E | Playwright | Full wizard flow, UI interactions |

### 6.2 PoC Tests (Iteration 0)

```typescript
// tests/unit/sun-elevation.test.ts

describe('Sun Elevation PoC', () => {
  test('CY3 primary site has Aug 22-23 window', () => {
    const windows = findLandingWindows(
      { lat: -69.37, lon: 32.32 },
      new Date('2023-03-01'),
      new Date('2023-10-31')
    );
    const augWindow = windows.find(w => w.peakTime.getMonth() === 7);
    expect(augWindow.peakTime.getDate()).toBeCloseTo(23, 1);
  });

  test('CY2 primary site has Sep 6-7 window', () => {
    const windows = findLandingWindows(
      { lat: -70.90, lon: 22.78 },
      new Date('2019-01-01'),
      new Date('2019-09-30')
    );
    const sepWindow = windows.find(w => w.peakTime.getMonth() === 8);
    expect(sepWindow.peakTime.getDate()).toBeCloseTo(6, 1);
  });

  test('Sun elevation within 6-9 degrees at landing time', () => {
    const elevation = calculateSunElevation(
      { lat: -69.37, lon: 32.32 },
      new Date('2023-08-23T12:00:00Z')
    );
    expect(elevation).toBeGreaterThanOrEqual(6);
    expect(elevation).toBeLessThanOrEqual(9);
  });
});
```

### 6.3 Unit Tests

```
tests/unit/wizard/
├── sun-elevation.test.ts      # PoC validation
├── landing-windows.test.ts    # Window detection
├── wizard-state.test.ts       # State transitions
├── site-snap.test.ts          # Snap logic
└── storage.test.ts            # localStorage handling
```

### 6.4 E2E Tests

```
tests/e2e/wizard/
├── happy-path.spec.ts         # Complete CY3 flow
├── navigation.spec.ts         # Back, breadcrumb, tree clicks
├── site-selection.spec.ts     # Globe, crosshair, presets, snap
├── resume.spec.ts             # Close and resume from storage
└── validation.spec.ts         # Error states, required fields
```

### 6.5 Validation Matrix

| Test Case | Expected | Source |
|-----------|----------|--------|
| CY3 landing window | Aug 22-24, 2023 | Paper Table 2 |
| CY3 required RAAN | 262° | Paper Table 2 |
| CY3 LOI date | Aug 5, 2023 | Paper Table 3 |
| CY2 landing window | Sep 6-7, 2019 | Paper |
| CY2 LOI date | Sep 2, 2019 | Paper |

---

## 7. Implementation Summary

### 7.1 Final Iteration Plan

| Iteration | Deliverable | Dependencies | Est. Scope |
|-----------|-------------|--------------|------------|
| **0** | Sun elevation PoC | astronomy-engine | Small |
| **1** | Moon globe + site selector | NASA texture, Three.js | Medium |
| **2** | Sun illumination UI | Iteration 0 algorithm | Medium |
| **3** | Landing window selection | Iteration 2 | Small |
| **4** | LOI computation | Existing optimization.ts | Small |
| **5** | Full wizard integration | All above | Medium |

### 7.2 Prerequisites

- [ ] Download NASA Moon texture (public domain)
- [ ] Validate astronomy-engine can compute sub-solar point
- [ ] Confirm existing LOI code handles all edge cases

### 7.3 Definition of Done

| Iteration | Done When |
|-----------|-----------|
| 0 | PoC passes for CY2 + CY3 sites, matches paper dates ±1 day |
| 1 | Can select site via globe, presets load, snap works |
| 2 | Landing windows computed and displayed for selected site |
| 3 | Can select window, shows backup site warning |
| 4 | LOI candidates shown, TLI auto-computed |
| 5 | "Create Mission" generates launch event, E2E tests pass |

### 7.4 Success Criteria

- [ ] CY3 defaults produce Aug 23 landing, Aug 5 LOI, Jul 31 TLI
- [ ] CY2 defaults produce Sep 6-7 landing window
- [ ] All E2E tests pass
- [ ] State persists across browser sessions
- [ ] Wizard integrates with existing Plan/Game modes

---

## Appendix A: Reference Data

### A.1 Chandrayaan-3 Mission Values

| Parameter | Value |
|-----------|-------|
| Landing site (actual) | -69.3733°S, 32.3191°E (Shiv Shakti Point) |
| Landing site (planned) | -69.3676°S, 32.3481°E |
| Landing site (backup) | -69.4977°S, -17.3304°W |
| Landing date | Aug 23, 2023 |
| Sun elevation requirement | 6°-9° |
| Required lunar RAAN (Aug) | 262° |
| LOI date | Aug 5, 2023 13:42 UT |
| TLI date | Jul 31, 2023 18:32 UT |
| Launch date | Jul 14, 2023 09:21 UT |

### A.2 Chandrayaan-2 Mission Values

| Parameter | Value |
|-----------|-------|
| Landing site (planned) | -70.90°S, 22.78°E |
| Landing site (backup) | -67.75°S, -18.47°W |
| Landing date (planned) | Sep 6-7, 2019 |
| Launch date | Jul 22, 2019 09:13 UT |

### A.3 Reference Documents

- `/docs/reference/chandrayaan3-mission-data.md` - CY3 paper data
- `/docs/reference/chandrayaan2-mission-data.md` - CY2 paper data
