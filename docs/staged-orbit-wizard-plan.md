# Staged Orbit Raising for Mission Design Wizard - Implementation Plan

**Status:** Planning Phase - Requires Further Discussion
**Created:** January 2026
**Last Updated:** January 2026

---

## CONTINUATION PROMPT

**Context for resuming implementation:**

The current Mission Design Wizard has a critical gap: it assumes a direct transfer from a 180×180 km circular orbit with a single TLI burn. However, real Chandrayaan missions use **staged orbit raising** from an elliptical GTO injection orbit (170 × 36,500 km) with 5-6 burns over 17 days.

**Solution: Two new wizard steps**
- **Step 5: Orbit Raising Strategy** - Hierarchical table showing all orbit passes where user selects burn locations and ΔV (Phase A: backward design)
- **Step 6: Launch Window Selection** - Forward propagation finds valid launch times that satisfy RAAN matching and ground station visibility (Phase B: forward propagation)

---

**DECISIONS MADE (Ready for Implementation):**

**Mission Configuration System:**
- ✅ All mission parameters externalized to JSON (injection orbit, budgets, spacecraft specs, ground stations)
- ✅ Three example configs: chandrayaan-3.json (default), chandrayaan-2.json (alternative), generic-mission.json (template)
- ✅ Actual values: CY3 TLI = 288 × 369,377 km (not 280 km approximation), CY2 TLI = 336 × 418,223 km
- ✅ TLI perigee is design parameter (not dictated by Moon position)
- ✅ Phase 1: Config selection only (dropdown), no editing UI
- ⏸️ Phase 2: Config editing UI with sliders

**Constraint Tracking:**
- ✅ Track both ΔV and propellant prominently (both are first-class constraints)
- ✅ ΔV = lingua franca of orbital mechanics (how people think)
- ✅ Propellant = physical constraint (hard limit)
- ✅ Cross-validate for consistency (rocket equation check)

**Ground Station Visibility:**
- ✅ MVP: Check perigee burns only (apogee burns assumed to have NASA DSN coverage)
- ✅ Method: Distance from ISTRAC (Option 2) - haversine distance < 1000 km
- ✅ Rationale: Perigee at 170-288 km visible for ~10-15 min, must be over India
- ✅ Alternatives documented: Bounding box (too simple), altitude-dependent cone (Phase 2)
- ⏸️ Phase 2: Add apogee comm window validation, multiple ground stations, visibility cones

**Step Numbering:**
- ✅ Steps 1-4: Existing wizard (landing site → landing window → mission window → LOI date)
- ✅ Step 5: Orbit Raising Strategy (NEW - Phase A: design burn sequence)
- ✅ Step 6: Launch Window Selection (NEW - Phase B: find valid launch windows)

**State Management:**
- ✅ Save Step 5 burn sequences to localStorage (like existing wizard state)
- ⏸️ Phase 2: Named strategies ("Conservative", "Aggressive"), history of attempts

**Failure Recovery:**
- ✅ MVP: Simple iteration (user adjusts Step 5, re-runs Step 6)
- ✅ Show helpful suggestions when no windows found
- ⏸️ Phase 2: History of attempts, intelligent guidance

**TLI Target Orbit:**
- ✅ Apogee from Step 4 (Moon distance at equator crossing via closest approach algorithm)
- ✅ Perigee from mission config (288 km for CY3)
- ✅ Tolerance: ±10 km perigee, ±5,000 km apogee
- ✅ **Important**: Closest approach algorithm in Step 4 should consider ±5,000 km tolerance (not Step 5)

**Step Consistency Validation:**
- ✅ Check: Launch date (Step 6) + burn sequence duration ≈ TLI date (Step 4)
- ✅ Warn if timeline mismatch detected

**Auto-Scheduler:**
- ⏸️ Deferred to Phase 2 (retain details in plan document)
- ✅ MVP: Manual burn planning with hierarchical table

---

**READY FOR IMPLEMENTATION:**

**Phase 1 Scope** (5-week timeline documented):
- Week 1: Core orbital mechanics + burn sequence data structures + validation
- Week 2: Hierarchical table UI (all passes visible, user selects burns)
- Week 3: Forward propagation (RAAN matching, ground track calculation, launch window search)
- Week 4: Integration (Step 5 + Step 6, 3D visualization updates, E2E tests)
- Week 5: Documentation, polish, optimization

**Key Files to Create:**
- `src/orbit-raising/configs/*.json` - Mission configurations
- `src/orbit-raising/orbital-mechanics.ts` - Burn calculations
- `src/orbit-raising/validation.ts` - Constraint checking
- `src/orbit-raising/raan-propagation.ts` - J2 drift, RAAN evolution
- `src/orbit-raising/ground-tracks.ts` - ECI→ECEF→LatLon transformations
- `src/wizard/steps/OrbitRaisingStep.ts` - Step 5 implementation
- `src/wizard/steps/LaunchWindowStep.ts` - Step 6 implementation

**Testing Strategy:**
- Unit tests: Verify math matches Chandrayaan-3 actual data
- E2E tests: Complete workflow (load CY3 config → design sequence → find windows)
- Validation: All 6 CY3 burns should find July 14, 2023, 09:21 UT window

**Start implementation with Week 1: Core Data Structures & Backend**

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Two-Phase Approach](#two-phase-approach)
3. [Hierarchical Table Structure](#hierarchical-table-structure)
4. [Constraint Types](#constraint-types)
5. [Auto-Scheduler Algorithm](#auto-scheduler-algorithm)
6. [User Workflow](#user-workflow)
7. [Ground Track Calculation](#ground-track-calculation)
8. [Implementation Plan](#implementation-plan)
9. [Open Questions](#open-questions)

---

## Problem Statement

### Current Wizard Assumptions (INCORRECT)

The wizard currently assumes:
- **Starting orbit**: 180 × 180 km circular Low Earth Orbit
- **Single TLI burn**: One large maneuver delivers all ΔV
- **Direct transfer**: Spacecraft goes directly to trans-lunar trajectory
- **Simple calculation**: Can calculate everything backward from landing

### Reality from Mission Data

**Chandrayaan-3 actual profile:**
- **Starting orbit**: **170 × 36,500 km** elliptical GTO
- **6 staged burns**: EBN-1, EBA-1, EBN-2, EBN-3, EBN-4, TLI
- **Total ΔV**: 695 m/s delivered over **17 days**
- **Complex iteration**: Forward propagation needed to find launch windows

**Why the difference matters:**

| Approach | Starting Orbit | Burn Strategy | Total ΔV | Propellant |
|----------|---------------|---------------|----------|------------|
| **Wizard (current)** | 180 × 180 km | Single burn | ~3,150 m/s | ~1,900 kg ❌ EXCEEDS BUDGET |
| **Actual mission** | 170 × 36,500 km | 6 staged burns | 695 m/s | 787 kg ✓ Within budget |

**Efficiency gain from staging: ~4.3× improvement**

---

## Two-Phase Approach

### Phase A: Backward Design + Burn Sequence Planning

**What we know from backward design:**
- ✓ Landing site selected (e.g., -69.37°S, 32.35°E)
- ✓ Landing window chosen (e.g., Aug 23, 2023)
- ✓ Required RAAN at lunar orbit (e.g., 269.95°)
- ✓ Optimal LOI date (e.g., Aug 5, 2023, 13:42 UT)
- ✓ TLI date (~5 days before LOI): July 31, 2023, 18:32 UT
- ✓ Required orbit at TLI: 288 × 369,377 km, RAAN = 5.83°

**What we DON'T know yet:**
- ✗ Launch date/time
- ✗ RAAN at injection
- ✗ Ground track locations for each burn
- ✗ Whether burn sequence allows "over India" constraint

**User task in Phase A:**
Design a burn sequence that:
1. Starts from assumed injection orbit: 170 × 36,500 km
2. Progressively raises apogee through perigee burns
3. Maintains perigee > 200 km (add apogee burns if needed)
4. Reaches TLI target: 288 × 369,377 km
5. Stays within propellant budget: ~787 kg

**Constraints checked in Phase A (date-agnostic):**
- ✓ Total ΔV ≤ 695 m/s
- ✓ Propellant consumption ≤ 1,696 kg
- ✓ Each burn ≤ 200 m/s (duration limit)
- ✓ Perigee altitude ≥ 200 km (no atmospheric drag)
- ✓ Final orbit matches TLI requirements

**Constraints NOT checked in Phase A:**
- ✗ RAAN matching at TLI (requires launch date)
- ✗ Ground station visibility (requires absolute timing)
- ✗ Burn locations over India (requires ground tracks)

**Output from Phase A:**
A date-agnostic burn plan:
```
Stage 1: Injection (170 × 36,500 km)
  Wait 3 perigee passes
  Burn at P3: 77.84 m/s → 173 × 41,790 km

Stage 2: After EBN-1 (173 × 41,790 km)
  Wait 3 orbits
  Burn at A6: 4.82 m/s → 226 × 41,603 km

Stage 3: After EBA-1 (226 × 41,603 km)
  Wait 4 orbits
  Burn at P9: 109.21 m/s → 227 × 51,567 km

... continues to TLI
```

---

### Phase B: Forward Propagation + Launch Window Finding

**Now we need to find WHEN to launch.**

**Forward calculation process:**

```python
FOR each candidate_launch_date in range(TLI_date - 30_days, TLI_date - 10_days):
    FOR each launch_time in 24_hour_range (every 5 minutes):

        1. Calculate injection RAAN based on:
           - Launch site: SHAR (13.72°N, 80.23°E)
           - Launch azimuth: 111.27° (range safety)
           - Launch datetime → Earth orientation → RAAN

        2. Propagate through burn sequence:
           - Apply Burn #1 at specified orbit pass
           - Calculate new RAAN (changes due to J2 perturbation)
           - Apply Burn #2 at next specified pass
           - Continue through all burns to TLI

        3. Check RAAN at TLI:
           IF |RAAN_at_TLI - required_RAAN| < 0.5°:

               4. Calculate ground tracks for each burn:
                  FOR each burn in sequence:
                      - Calculate lat/lon at perigee/apogee
                      - Check if over India (ISTRAC visibility)

               5. IF all burns have ground station visibility:
                  → Add to valid_launch_windows[]
```

**Constraints checked in Phase B (requires launch date):**
- ✓ RAAN at TLI matches required value (within 0.5°)
- ✓ All perigee burns occur over India (ISTRAC visibility)
- ✓ Apogee burns occur during communication windows
- ✓ Mission timeline reasonable (not too compressed/stretched)

**Possible outcomes:**

**Success:**
```
✓ Found 3 valid launch windows:
  1. July 12, 2023, 09:29-09:31 UT (2 min window)
  2. July 14, 2023, 09:21-09:23 UT (2 min window) ← SELECTED
  3. July 15, 2023, 09:17-09:19 UT (2 min window)
```

**Failure:**
```
✗ No valid launch windows found
  Problem: EBN-3 at Perigee #12 never occurs over India

  Suggestions:
    • Add 1 more orbit before EBN-3 (try P13 instead)
    • Move EBN-3 to Perigee #11
    • Split EBN-3 into two smaller burns
```

**User must iterate:**
- Go back to Phase A
- Adjust number of orbits between burns
- Re-run Phase B to find windows
- Repeat until valid solution found

---

## Hierarchical Table Structure

### Concept

Instead of a simple burn list, show **all orbital passes** hierarchically grouped by stage, allowing users to see every opportunity and choose where to burn.

### Visual Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BURN SEQUENCE PLANNER                                                      │
│                                                                              │
│  ┌─ Stage 1: Injection Orbit ──────────────────────────────────────────┐   │
│  │  Orbit: 170 × 36,500 km  |  Period: 10.74 h  |  RAAN: TBD           │   │
│  │                                                                       │   │
│  │  Pass  │ Type    │ Offset │ Time (UT) │ Ground Track │ Burn Action │   │
│  │  ─────┼─────────┼────────┼───────────┼──────────────┼─────────────│   │
│  │  P1   │ Perigee │ +0.0d  │ 09:21     │ Pacific      │ [ ]         │   │
│  │  A1   │ Apogee  │ +0.4d  │ 19:48     │ —            │ [ ]         │   │
│  │  P2   │ Perigee │ +0.9d  │ 20:15     │ Ind. Ocean   │ [ ]         │   │
│  │  A2   │ Apogee  │ +1.3d  │ 06:42     │ —            │ [ ]         │   │
│  │  P3   │ Perigee │ +1.8d  │ 07:09     │ ⚠️ Unknown    │ [x] 77.84 m/s│ ←─│
│  │  A3   │ Apogee  │ +2.2d  │ 23:36     │ —            │ [ ]         │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─ Stage 2: After EBN-1 ──────────────────────────────────────────────┐   │
│  │  Orbit: 173 × 41,790 km  |  Period: 12.51 h  |  RAAN: TBD           │   │
│  │                                                                       │   │
│  │  Pass  │ Type    │ Offset │ Time (UT) │ Ground Track │ Burn Action │   │
│  │  ─────┼─────────┼────────┼───────────┼──────────────┼─────────────│   │
│  │  P4   │ Perigee │ +2.3d  │ 16:36     │ ⚠️ Unknown    │ [ ]         │   │
│  │  A4   │ Apogee  │ +2.8d  │ 09:12     │ —            │ [ ]         │   │
│  │  A5   │ Apogee  │ +3.3d  │ 03:48     │ —            │ [ ]         │   │
│  │  A6   │ Apogee  │ +3.8d  │ 20:24     │ —            │ [x] 4.82 m/s│ ←─│
│  │  P5   │ Perigee │ +4.4d  │ 13:00     │ ⚠️ Unknown    │ [ ]         │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─ Stage 3: After EBA-1 ──────────────────────────────────────────────┐   │
│  │  Orbit: 226 × 41,603 km  |  Period: 12.46 h  |  RAAN: TBD           │   │
│  │  ... (continues)                                                      │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Budget Status:                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ΔV Used:       82.66 / 695 m/s      [████░░░░░░░░] 12%                │ │
│  │ Propellant:   103.20 / 1,696 kg     [█░░░░░░░░░░░]  6%                │ │
│  │ Days Used:       3.8 / 17 days      [███░░░░░░░░░] 22%                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ⚠️  Ground track locations unknown until launch window calculated          │
│                                                                              │
│  [Calculate Launch Windows]  [Auto-Schedule Optimal]  [Load CY3 Sequence]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Hierarchical by stage**: Each orbital configuration gets its own collapsible section
2. **Shows ALL passes**: User sees every perigee/apogee opportunity, not just burns
3. **Editable orbit count**: User can add/remove rows to space burns differently
4. **Ground track column**: Shows "⚠️ Unknown" until launch window selected
5. **Burn checkboxes**: User selects which passes to burn at
6. **ΔV input**: Inline editing of burn magnitude
7. **Time offset**: Days since launch (relative, becomes absolute after Phase B)
8. **Visual feedback**: Budget bars show resource consumption

### User Interactions

**Adding orbits between burns:**
```
User right-clicks on P3 → "Insert orbit pass below"
  → New P4, A4 rows inserted
  → All subsequent pass numbers increment
  → Burn still happens, but now at later pass number
  → Timeline stretches (more days)
```

**Removing orbits:**
```
User right-clicks on empty P2 → "Remove pass"
  → P2 deleted
  → P3 becomes P2
  → Burns happen sooner
  → Timeline compresses (fewer days)
```

**Changing burn location:**
```
User unchecks [x] at P3, checks [ ] at P4
  → Burn moves to next perigee pass
  → Orbit number changes
  → Ground track will be different (if known)
  → May affect downstream burn locations
```

---

## Constraint Types

### Type 1: Backward Design Constraints
*Can be checked immediately without knowing launch date*

#### 1.1 Total ΔV Budget
```
Constraint: Σ(all burns) ≤ 695 m/s
Validation: Real-time sum as user adds burns
Visual: Progress bar [████░░░░░░] 65%
```

#### 1.2 Propellant Budget
```
Constraint: Total propellant ≤ 1,696 kg
Calculation: Tsiolkovsky equation for each burn
  Δm = m₀ × (1 - e^(-Δv/(Isp×g₀)))
Visual: Progress bar [███░░░░░░░] 46%
```

#### 1.3 Individual Burn Size
```
Constraint: Each burn ≤ 200 m/s
Reason: Longer burns → excessive gravity losses
Warning: "⚠️ Burn too large (250 m/s). Consider splitting."
```

#### 1.4 Perigee Safety
```
Constraint: Perigee ≥ 200 km throughout mission
Reason: Atmospheric drag below 200 km
Warning: "⚠️ Perigee at 165 km after this sequence. Add apogee burn to raise."
```

#### 1.5 Orbital Progression
```
Constraint: Each burn moves toward TLI target
Check: Apogee increasing toward 370,000 km
Warning: "⚠️ Not progressing. Current apogee: 85,000 km. Target: 370,000 km."
```

#### 1.6 Reaches TLI Target
```
Constraint: Final orbit ≈ 288 × 369,377 km
Tolerance: ±5,000 km on apogee
Warning: "⚠️ Final apogee: 355,000 km. Add 15 m/s to last burn."
```

**Visual feedback for Type 1 constraints:**
```
Backward Design Validation:
  ✓ Total ΔV: 695.01 m/s (within budget)
  ✓ Propellant: 787 kg (within budget, 909 kg margin)
  ✓ All burns < 200 m/s
  ✓ Perigee safe throughout (≥ 226 km)
  ✓ Reaches TLI target (370,000 km apogee)

  Ready for launch window calculation →
```

---

### Type 2: Forward Design Constraints
*Require knowing launch date - checked in Phase B*

#### 2.1 RAAN Matching at TLI
```
Constraint: RAAN at TLI must match required value
Required: 5.83° (from landing window geometry)
Tolerance: ±0.5°
Calculation:
  1. Start with RAAN at injection (depends on launch time)
  2. Propagate RAAN through each burn (J2 perturbation)
  3. Check RAAN at TLI pass
```

**Why this is forward-only:**
- Launch time determines injection RAAN
- RAAN evolves due to Earth's J2 oblateness
- Each inclination change slightly affects RAAN
- Cannot solve backward (one-way propagation)

#### 2.2 Ground Station Visibility
```
Constraint: Perigee burns must occur over India (MVP focus)
Required: ISTRAC Bangalore (13.72°N, 80.23°E)
Tolerance: ±1000 km visibility radius
Calculation:
  1. Calculate time of perigee pass (absolute)
  2. Calculate spacecraft lat/lon at perigee
  3. Check if within India bounds or ISTRAC range
```

**MVP Scope:**
- ✅ **Implemented**: Ground track calculation for **perigee burns only**
- ⏸️ **Deferred to Phase 2**: Apogee burn communication windows

**Rationale:**
- **Perigee burns**: Spacecraft visible for only ~10-15 minutes over ground station
  - **This constraint drives launch window selection** (most restrictive)
  - Must occur over India/ISTRAC for real-time monitoring and cutoff commands
- **Apogee burns**: Spacecraft visible for hours at high altitude
  - With NASA DSN access (available to ISRO), coverage is almost always guaranteed
  - Not restrictive for MVP launch window search

**India bounds (approximate):**
```
Latitude:  8°N to 35°N
Longitude: 68°E to 97°E
```

**More precise check:**
```python
distance_to_istrac = haversine_distance(
    perigee_ground_point,
    (13.72, 80.23)  # Bangalore
)

visible = distance_to_istrac < 1000  # km
```

**Why this is forward-only:**
- Ground track depends on Earth rotation
- Earth rotation depends on absolute time
- Absolute time depends on launch datetime
- Cannot solve backward

#### 2.3 Communication Windows
**Status:** ⏸️ **Phase 2 Enhancement** (not implemented in MVP)

```
Constraint: Apogee burns need comm coverage
Required: At least one ground station in view
Duration: Burn duration + margin (typically 30-60 min)
```

**MVP Assumption:**
- Apogee burns assumed to have DSN coverage (NASA Deep Space Network available to ISRO)
- High-altitude visibility spans hours, not minutes
- Not a restrictive constraint for launch window selection

**Phase 2 Implementation (Future):**
- Model multiple ground stations (ISTRAC + NASA DSN + ESA)
- Calculate visibility cones for high-altitude burns
- Validate communication windows for all apogee burns
- Visualize ground station coverage on timeline

#### 2.4 Mission Timeline
```
Constraint: Total duration reasonable
Typical: 15-20 days from launch to TLI
Too short: < 10 days (rushed, risky)
Too long: > 30 days (propellant boiloff, complexity)
```

**Visual feedback for Type 2 constraints (after Phase B):**
```
Launch Window: July 14, 2023, 09:21 UT

Forward Propagation Results:
  ✓ RAAN at TLI: 5.83° (perfect match! Required: 5.83°)
  ✓ EBN-1 at P3: Over Bangalore (412 km from ISTRAC) [perigee]
  ⏸ EBA-1 at A6: DSN coverage assumed (not checked in MVP) [apogee]
  ✓ EBN-2 at P9: Over Bangalore (315 km from ISTRAC) [perigee]
  ✗ EBN-3 at P12: Over Pacific Ocean (NO VISIBILITY!) [perigee]

  → Need to adjust: Add 1 orbit before EBN-3 (try P13)

Note: MVP only validates perigee burn visibility (marked [perigee]).
      Apogee burns (marked [apogee]) assumed to have DSN coverage.
```

---

## Auto-Scheduler Algorithm

### Purpose

Automatically find optimal burn sequence and launch windows that satisfy all constraints.

### Algorithm Pseudocode

```python
def auto_schedule_mission(
    tli_date: datetime,
    tli_target_orbit: OrbitalElements,
    landing_required_raan: float,
    propellant_budget: float = 1696  # kg
) -> Solution:

    # ========================================
    # PHASE A: BACKWARD - OPTIMIZE BURN SEQUENCE
    # ========================================

    best_burn_plan = None
    min_propellant = float('inf')

    # Try different burn strategies
    for num_burns in range(4, 8):  # Try 4, 5, 6, 7 burns
        for burn_distribution in generate_distributions(num_burns):

            # Create burn sequence
            burn_plan = create_burn_sequence(
                start_orbit = (170, 36500, 21.5, 178),  # Assumed injection
                target_orbit = tli_target_orbit,
                num_burns = num_burns,
                distribution = burn_distribution
            )

            # Check Type 1 constraints (backward)
            if not validate_backward_constraints(burn_plan):
                continue  # Try next distribution

            # Track best solution so far
            if burn_plan.total_propellant < min_propellant:
                min_propellant = burn_plan.total_propellant
                best_burn_plan = burn_plan

    if best_burn_plan is None:
        return Error("No valid burn sequence found within propellant budget")

    # ========================================
    # PHASE B: FORWARD - FIND LAUNCH WINDOWS
    # ========================================

    launch_windows = []

    # Search launch opportunities
    search_start = tli_date - timedelta(days=30)
    search_end = tli_date - timedelta(days=10)

    for candidate_date in date_range(search_start, search_end):

        # Try launch times throughout the day (every 5 minutes)
        for launch_time_minutes in range(0, 1440, 5):  # 24 hours

            launch_datetime = candidate_date + timedelta(minutes=launch_time_minutes)

            # Calculate injection RAAN
            raan_injection = calculate_injection_raan(
                launch_site = SHAR_COORDINATES,
                azimuth = 111.27,  # Range safety constraint
                datetime = launch_datetime
            )

            # Propagate mission with this launch time
            orbit_history = propagate_mission_forward(
                injection_orbit = (170, 36500, 21.5, 178, raan_injection),
                burn_plan = best_burn_plan,
                launch_datetime = launch_datetime
            )

            # Check RAAN at TLI
            raan_at_tli = orbit_history[-1].raan
            raan_error = abs(raan_at_tli - landing_required_raan)

            if raan_error > 0.5:  # degrees
                continue  # RAAN doesn't match, try next time

            # Check ground station visibility for all burns
            visibility_results = []
            for i, burn in enumerate(best_burn_plan.burns):

                orbit_at_burn = orbit_history[i]
                burn_absolute_time = calculate_burn_time(
                    launch_datetime,
                    orbit_at_burn,
                    burn.pass_number
                )

                ground_track = calculate_ground_track(
                    orbit = orbit_at_burn,
                    true_anomaly = 0 if burn.type == 'perigee' else 180,
                    time = burn_absolute_time
                )

                visible = check_india_visibility(ground_track)
                visibility_results.append(visible)

            # All burns must have visibility
            if all(visibility_results):

                # Found valid launch window!
                launch_windows.append({
                    'date': candidate_date,
                    'time': launch_time_minutes,
                    'raan_match_error': raan_error,
                    'visibility': visibility_results,
                    'orbit_history': orbit_history,
                    'ground_tracks': [calculate_ground_track(...) for burn in burns]
                })

    # ========================================
    # RETURN RESULTS
    # ========================================

    if len(launch_windows) == 0:
        return NoSolutionFound(
            burn_plan = best_burn_plan,
            reason = "No launch windows satisfy ground station visibility",
            suggestions = generate_suggestions(best_burn_plan)
        )

    return Solution(
        burn_plan = best_burn_plan,
        launch_windows = launch_windows,
        recommended_window = select_best_window(launch_windows)
    )


# ========================================
# HELPER FUNCTIONS
# ========================================

def calculate_injection_raan(launch_site, azimuth, datetime):
    """
    Calculate RAAN at injection based on launch site, azimuth, and time.

    Physics:
    - Launch site rotates with Earth
    - Launch azimuth defines plane inclination
    - RAAN is where orbital plane crosses equator
    - Depends on Earth orientation at launch time
    """
    lat, lon = launch_site

    # Calculate Greenwich Sidereal Time
    gst = greenwich_sidereal_time(datetime)

    # Local sidereal time at launch site
    lst = gst + lon

    # Ascending node right ascension
    # (Simplified - actual calculation more complex)
    raan = (lst - arcsin(cos(azimuth) / cos(lat))) % 360

    return raan


def propagate_mission_forward(injection_orbit, burn_plan, launch_datetime):
    """
    Propagate mission from injection through all burns to TLI.
    Accounts for:
    - J2 perturbation (RAAN drift)
    - Each burn changing orbital elements
    - Time evolution
    """
    orbit_history = [injection_orbit]
    current_orbit = injection_orbit
    current_time = launch_datetime

    for burn in burn_plan.burns:

        # Wait until burn pass
        time_to_burn = current_orbit.period * burn.wait_orbits
        current_time += timedelta(hours=time_to_burn)

        # Apply J2 perturbation (RAAN drift during wait)
        raan_drift = calculate_j2_drift(
            current_orbit.inclination,
            current_orbit.semi_major_axis,
            duration = time_to_burn
        )
        current_orbit.raan += raan_drift

        # Apply burn
        new_orbit = apply_burn(
            current_orbit,
            burn.location,  # 'perigee' or 'apogee'
            burn.delta_v
        )

        orbit_history.append(new_orbit)
        current_orbit = new_orbit

    return orbit_history


def calculate_ground_track(orbit, true_anomaly, time):
    """
    Calculate lat/lon of spacecraft at given true anomaly and time.
    """
    # Convert orbital position to ECI coordinates
    r_eci = orbital_to_eci(
        orbit.raan,
        orbit.inclination,
        orbit.aop,
        true_anomaly,
        orbit.radius_at_true_anomaly(true_anomaly)
    )

    # Rotate to ECEF (Earth-fixed) coordinates
    r_ecef = eci_to_ecef(r_eci, time)

    # Convert to lat/lon
    lat, lon = ecef_to_latlon(r_ecef)

    return (lat, lon)


def check_india_visibility(ground_track):
    """
    Check if ground track point has visibility to ISTRAC Bangalore.

    Uses Option 2: Distance-based check with 1000 km radius.
    See "India Visibility Check Methods" section for rationale.

    Args:
        ground_track: Tuple of (latitude, longitude) in degrees

    Returns:
        bool: True if within 1000 km of ISTRAC Bangalore
    """
    lat, lon = ground_track

    # ISTRAC Bangalore coordinates
    ISTRAC_LAT = 13.72
    ISTRAC_LON = 80.23
    VISIBILITY_RADIUS_KM = 1000  # Conservative tracking range for perigee burns

    # Calculate great-circle distance to ISTRAC
    distance = haversine_distance(
        (lat, lon),
        (ISTRAC_LAT, ISTRAC_LON)
    )

    return distance <= VISIBILITY_RADIUS_KM


def haversine_distance(coord1, coord2):
    """
    Calculate great-circle distance between two points on Earth.

    Args:
        coord1: Tuple of (lat1, lon1) in degrees
        coord2: Tuple of (lat2, lon2) in degrees

    Returns:
        float: Distance in kilometers
    """
    from math import radians, sin, cos, sqrt, atan2

    lat1, lon1 = coord1
    lat2, lon2 = coord2

    R = 6371  # Earth radius in km

    # Convert to radians
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    dLat = radians(lat2 - lat1)
    dLon = radians(lon2 - lon1)

    # Haversine formula
    a = sin(dLat/2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(dLon/2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c


def generate_suggestions(failed_burn_plan):
    """
    When no launch windows found, suggest adjustments.
    """
    suggestions = []

    # Check which burns failed visibility
    for i, burn in enumerate(failed_burn_plan.burns):
        if burn.type == 'perigee' and not burn.visible:
            suggestions.append({
                'type': 'add_orbit',
                'burn_index': i,
                'reason': f'Burn {i+1} at P{burn.pass_number} never over India',
                'action': f'Try P{burn.pass_number + 1} instead (add 1 orbit wait)'
            })

    # Check if too few burns
    if len(failed_burn_plan.burns) < 5:
        suggestions.append({
            'type': 'add_burn',
            'reason': 'Too few burns - more staging gives more flexibility',
            'action': 'Try splitting largest burn into two smaller burns'
        })

    return suggestions
```

### Optimization Strategies

**For burn sequence (Phase A):**

1. **Greedy heuristic**: Start with Chandrayaan-3 as template, vary slightly
2. **Grid search**: Try 4, 5, 6, 7 burn strategies
3. **Minimize propellant**: Choose sequence with lowest total mass
4. **Burn size limits**: Never exceed 200 m/s per burn

**For launch windows (Phase B):**

1. **Coarse search**: Try every hour in date range
2. **Fine search**: Once coarse match found, try every minute
3. **Early termination**: Stop after finding N valid windows (e.g., 3)
4. **RAAN tolerance**: Accept ±0.5° initially, tighten if many solutions

### Performance Considerations

**Phase A (backward):**
- Fast: ~100ms for typical cases
- Only orbital mechanics calculations
- No iteration needed

**Phase B (forward):**
- Slow: ~10-30 seconds for full search
- Needs to try ~30 days × 288 times/day = ~8,640 iterations
- Each iteration: propagate 6 burns + check visibility
- **Optimization**: Parallelize date search, skip times with obvious RAAN mismatch

**UI during search:**
```
Searching for launch windows...

  [███████████░░░░░░░░░] 58% (17 of 30 days searched)

  Found so far: 2 valid windows

  [Cancel Search]
```

---

## User Workflow

### Complete User Journey Through Wizard

#### **Steps 1-4: Existing Wizard Flow** (Already implemented)

1. **Landing Site Selection**: User picks Shiv Shakti site
2. **Landing Window Selection**: User picks Aug 23, 2023 window
3. **Mission Window Selection**: User selects mission timeframe
4. **LOI Date Optimization**: System calculates LOI date = Aug 5, 2023

**Result after Step 4:**
```
LOI Date: August 5, 2023, 13:42 UT
Required lunar RAAN: 269.95°
TLI Date: ~July 31, 2023 (5 days before LOI)
Required TLI orbit: 288 × 370,000 km, RAAN = 5.83°
```

---

#### **Step 5: Orbit Raising Strategy** (NEW - Phase A)

**User enters this step and sees:**

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: DESIGN ORBIT RAISING SEQUENCE                          │
│                                                                  │
│  You need to reach TLI on July 31, 2023                         │
│  Required orbit: 288 × 369,377 km, RAAN = 5.83°                │
│                                                                  │
│  Problem: Launch vehicle cannot deliver you directly there!     │
│                                                                  │
│  Launch vehicle (LVM3) will inject into:                        │
│    170 × 36,500 km elliptical orbit (GTO)                      │
│                                                                  │
│  You must design a staged burn sequence to raise apogee         │
│  from 36,500 km → 370,000 km using spacecraft engine.          │
│                                                                  │
│  Available resources:                                            │
│    • Propellant: 1,696 kg                                       │
│    • Engine: 440 N liquid bipropellant                          │
│    • Time: ~17 days from launch to TLI                          │
│                                                                  │
│  [Start Planning] [Load Chandrayaan-3 Strategy] [Auto-Schedule] │
└─────────────────────────────────────────────────────────────────┘
```

**User clicks "Start Planning"**

---

**Hierarchical table appears:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  BURN SEQUENCE BUILDER                                              │
│                                                                      │
│  ▼ Stage 1: Injection Orbit                                         │
│    Orbit: 170 × 36,500 km  |  Period: 10.74 h                      │
│                                                                      │
│    Pass │ Type    │ Days │ Time    │ Ground Track │ Burn           │
│    ─────┼─────────┼──────┼─────────┼──────────────┼────────────────│
│    P1   │ Perigee │ +0.0 │ --:--   │ ⚠️ Unknown    │ [ ] ___ m/s    │
│    A1   │ Apogee  │ +0.4 │ --:--   │ —            │ [ ] ___ m/s    │
│    P2   │ Perigee │ +0.9 │ --:--   │ ⚠️ Unknown    │ [ ] ___ m/s    │
│    A2   │ Apogee  │ +1.3 │ --:--   │ —            │ [ ] ___ m/s    │
│    P3   │ Perigee │ +1.8 │ --:--   │ ⚠️ Unknown    │ [ ] ___ m/s    │
│         │ [+ Add more orbits before first burn]                    │
│                                                                      │
│  No burns planned yet. Click checkboxes to select burn locations.   │
│                                                                      │
│  Budget:  ΔV: 0 / 695 m/s  |  Propellant: 0 / 1,696 kg            │
└─────────────────────────────────────────────────────────────────────┘
```

---

**User checks box at P3 and enters 77.84 m/s:**

```
│  ▼ Stage 1: Injection Orbit                                         │
│    ...                                                               │
│    P3   │ Perigee │ +1.8 │ --:--   │ ⚠️ Unknown    │ [x] 77.84 m/s  │ ✓
│         │ [+ Add more orbits]                                       │
│                                                                      │
│  ▼ Stage 2: After Burn #1 (EBN-1)                                  │
│    Orbit: 173 × 41,790 km  |  Period: 12.51 h  [AUTO-CALCULATED]   │
│                                                                      │
│    Pass │ Type    │ Days │ Time    │ Ground Track │ Burn           │
│    ─────┼─────────┼──────┼─────────┼──────────────┼────────────────│
│    P4   │ Perigee │ +2.3 │ --:--   │ ⚠️ Unknown    │ [ ] ___ m/s    │
│    A3   │ Apogee  │ +2.8 │ --:--   │ —            │ [ ] ___ m/s    │
│    A4   │ Apogee  │ +3.3 │ --:--   │ —            │ [ ] ___ m/s    │
│    A5   │ Apogee  │ +3.8 │ --:--   │ —            │ [ ] ___ m/s    │
│    A6   │ Apogee  │ +4.3 │ --:--   │ —            │ [ ] ___ m/s    │
│         │ [+ Add more orbits]                                       │
│                                                                      │
│  Budget:  ΔV: 77.84 / 695 m/s [██░░░░░░░░] 11%                     │
│           Propellant: 97 / 1,696 kg [░░░░░░░░░░] 6%                │
```

**System automatically:**
- ✓ Calculates new orbit after burn (173 × 41,790 km)
- ✓ Creates Stage 2 section
- ✓ Shows next orbit passes (P4, A3-A6...)
- ✓ Updates budget bars

---

**User continues adding burns following CY3 strategy:**

1. Checks A6 and enters 4.82 m/s (apogee burn to raise perigee)
2. Checks P9 and enters 109.21 m/s
3. Checks P12 and enters 144.58 m/s
4. Checks P17 and enters 185.02 m/s
5. Checks P20 and enters 172.60 m/s (final TLI burn)

**After all burns entered:**

```
│  ✓ Stage 6: After Burn #5 (EBN-4)                                  │
│    Orbit: 236 × 127,601 km  |  Period: 51.52 h                     │
│    ...                                                              │
│    P20  │ Perigee │ +17.3 │ --:--  │ ⚠️ Unknown   │ [x] 172.60 m/s │ ✓
│                                                                      │
│  ✓ Stage 7: After Burn #6 (TLI)                                    │
│    Orbit: 288 × 369,377 km ← MATCHES TLI TARGET! ✓                │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  Budget Status:                                                     │
│    ✓ Total ΔV: 695.01 / 695 m/s    [██████████] 100%              │
│    ✓ Propellant: 787 / 1,696 kg    [████░░░░░░]  46%              │
│    ✓ All burns < 200 m/s                                           │
│    ✓ Perigee safe (≥ 226 km throughout)                           │
│    ✓ Reaches TLI target apogee (369,377 km ≈ 370,000 km)          │
│                                                                      │
│  ⚠️  RAAN and ground tracks unknown until launch window calculated │
│                                                                      │
│  Ready to find launch windows? [Calculate Launch Windows →]        │
└─────────────────────────────────────────────────────────────────────┘
```

---

#### **Step 6: Launch Window Selection** (NEW - Phase B)

**User clicks "Calculate Launch Windows"**

**System shows progress:**

```
┌─────────────────────────────────────────────────────────────────┐
│  SEARCHING FOR VALID LAUNCH WINDOWS...                          │
│                                                                  │
│  [████████████████░░░░] 76% (23 of 30 days searched)            │
│                                                                  │
│  Found so far: 2 valid windows                                  │
│                                                                  │
│  Current: Testing July 11, 2023, 14:30 UT                       │
│    RAAN at TLI: 5.31° (need 5.83°) ✗                           │
│    Skipping to next time slot...                                │
│                                                                  │
│  [Cancel Search]                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**After ~15 seconds:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAUNCH WINDOW RESULTS                                              │
│                                                                      │
│  ✓ Found 3 valid launch windows:                                   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Window 1: July 12, 2023                                      │  │
│  │   Open:  09:29:49 UT                                         │  │
│  │   Close: 09:31:49 UT (2 minute window)                       │  │
│  │                                                               │  │
│  │   Validation:                                                 │  │
│  │   ✓ RAAN at TLI: 5.82° (required: 5.83°, error: 0.01°)      │  │
│  │   ✓ EBN-1 at P3: Over Bangalore (398 km from ISTRAC)        │  │
│  │   ✓ EBA-1 at A6: Comm window available                       │  │
│  │   ✓ EBN-2 at P9: Over Bangalore (287 km from ISTRAC)        │  │
│  │   ✓ All burns visible from India                             │  │
│  │   ✓ Mission duration: 19 days                                │  │
│  │                                                               │  │
│  │   [Select This Window]  [View Details]                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Window 2: July 14, 2023 ★ RECOMMENDED                        │  │
│  │   Open:  09:21:22 UT                                         │  │
│  │   Close: 09:23:22 UT (2 minute window)                       │  │
│  │                                                               │  │
│  │   Validation:                                                 │  │
│  │   ✓ RAAN at TLI: 5.83° (perfect match!)                     │  │
│  │   ✓ EBN-1 at P3: Over Bangalore (412 km from ISTRAC)        │  │
│  │   ✓ EBA-1 at A6: Comm window available                       │  │
│  │   ✓ EBN-2 at P9: Over Bangalore (315 km from ISTRAC)        │  │
│  │   ✓ All burns visible from India                             │  │
│  │   ✓ Mission duration: 17 days (optimal)                      │  │
│  │   ★ This matches actual Chandrayaan-3 launch!                │  │
│  │                                                               │  │
│  │   [Select This Window] ✓  [View Details]                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Window 3: July 15, 2023                                      │  │
│  │   Open:  09:17:08 UT                                         │  │
│  │   Close: 09:19:08 UT (2 minute window)                       │  │
│  │   ...                                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  [Try Different Burn Sequence]  [Next: Review Mission Plan →]      │
└─────────────────────────────────────────────────────────────────────┘
```

---

**User clicks "Select This Window" for Window 2**

**Hierarchical table updates with absolute times:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  FINAL MISSION TIMELINE                                             │
│  Launch: July 14, 2023, 09:21:22 UT                                │
│                                                                      │
│  ▼ Stage 1: Injection Orbit                                         │
│    Orbit: 170 × 36,500 km  |  RAAN: 8.77°                          │
│                                                                      │
│    Pass │ Type    │ Date        │ Time (UT) │ Ground Track │ Burn   │
│    ─────┼─────────┼─────────────┼───────────┼──────────────┼────────│
│    P1   │ Perigee │ Jul 14      │ 09:21     │ Pacific      │        │
│    A1   │ Apogee  │ Jul 14      │ 19:48     │ —            │        │
│    P2   │ Perigee │ Jul 14      │ 20:15     │ Ind. Ocean   │        │
│    A2   │ Apogee  │ Jul 15      │ 06:42     │ —            │        │
│    P3   │ Perigee │ Jul 15      │ 07:09     │ Bangalore ✓  │ 77.84  │
│                                                                      │
│  ▼ Stage 2: After EBN-1                                            │
│    Orbit: 173 × 41,790 km  |  RAAN: 8.46°                          │
│    ...                                                              │
│    A6   │ Apogee  │ Jul 16      │ 13:47     │ Comm OK ✓    │ 4.82   │
│                                                                      │
│  ▼ Stage 3: After EBA-1                                            │
│    Orbit: 226 × 41,603 km  |  RAAN: 8.04°                          │
│    ...                                                              │
│    P9   │ Perigee │ Jul 18      │ 09:17     │ Bangalore ✓  │ 109.21 │
│                                                                      │
│  ... (continues through all stages to TLI)                          │
│                                                                      │
│  ▼ Stage 7: Trans-Lunar Injection                                  │
│    Orbit: 288 × 369,377 km  |  RAAN: 5.83° ✓                       │
│                                                                      │
│  Mission Duration: 17 days (Jul 14 → Jul 31)                       │
│  Total ΔV: 695.01 m/s  |  Propellant: 787 kg                       │
│                                                                      │
│  [Download Mission Plan]  [Next: Final Review →]                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Handling Failure Cases

**Scenario: User's burn plan doesn't allow valid launch windows**

**Example: User chooses poor orbit spacing**

User creates sequence:
```
P3: 77.84 m/s
A6: 4.82 m/s
P8: 109.21 m/s  ← Only 2 orbits wait, should be 4
P10: 144.58 m/s
P14: 185.02 m/s
P17: 172.60 m/s
```

**User clicks "Calculate Launch Windows"**

**System searches... then returns:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ✗ NO VALID LAUNCH WINDOWS FOUND                                │
│                                                                  │
│  Your burn sequence satisfies backward constraints, but         │
│  no launch times allow all burns to occur over India.           │
│                                                                  │
│  Problem Analysis:                                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ EBN-2 at Perigee #8:                                       │ │
│  │   For all tested launch times in viable date range,        │ │
│  │   P8 NEVER occurs over India.                              │ │
│  │                                                             │ │
│  │   Closest approach: 1,847 km from ISTRAC Bangalore         │ │
│  │   (over Arabian Sea, west of India)                        │ │
│  │                                                             │ │
│  │   Ground tracks tested: 8,640 different launch times       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Suggestions:                                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Add 1-2 orbits before EBN-2:                            │ │
│  │    Try P9 or P10 instead of P8                             │ │
│  │    This shifts the ground track eastward                   │ │
│  │                                                             │ │
│  │ 2. Try auto-scheduler:                                     │ │
│  │    Let system optimize orbit spacing for you               │ │
│  │                                                             │ │
│  │ 3. Load proven strategy:                                   │ │
│  │    Use Chandrayaan-3 sequence (known to work)              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Adjust Manually]  [Run Auto-Scheduler]  [Load CY3 Strategy]   │
└─────────────────────────────────────────────────────────────────┘
```

**If user clicks "Adjust Manually":**
- Returns to hierarchical table
- EBN-2 row highlighted in warning color
- User can change P8 to P9 or P10
- Click "Calculate Launch Windows" again

**If user clicks "Run Auto-Scheduler":**
- System tries different orbit counts
- Finds working combination automatically
- Shows result with explanation

**If user clicks "Load CY3 Strategy":**
- Replaces user's sequence with actual CY3 burns
- Guaranteed to find windows (matches historical data)

---

## Ground Track Calculation

**Note:** For MVP, ground tracks are calculated **only for perigee burns**. Apogee burns are assumed to have DSN coverage and are not checked for ground station visibility.

### The Problem

Given:
- Orbital elements (a, e, i, Ω, ω)
- True anomaly (0° for perigee)
- Absolute time

Calculate:
- Latitude and longitude on Earth surface below spacecraft (at perigee)

### India Visibility Check Methods

Once we have the ground track coordinates (lat, lon), we need to determine if the spacecraft is visible from ISTRAC Bangalore during the perigee burn. There are three approaches to this problem, with varying levels of accuracy and complexity.

#### Option 1: Simple Lat/Lon Bounding Box

**Description:** Check if the coordinates fall within a rectangular region that encompasses India.

**Implementation:**
```typescript
function isOverIndia_BoundingBox(lat: number, lon: number): boolean {
    return (8 <= lat && lat <= 35) && (68 <= lon && lon <= 97);
}
```

**Pros:**
- Very fast (single comparison)
- Trivial to implement
- No dependencies on external libraries

**Cons:**
- Includes large ocean areas (Arabian Sea, Bay of Bengal)
- Doesn't match India's actual shape
- False positives for burns over water
- No consideration of tracking station location

**Use case:** Quick rejection filter only, not suitable as primary check.

---

#### Option 2: Distance from ISTRAC (CHOSEN FOR MVP)

**Description:** Calculate great-circle distance from the ground track point to ISTRAC Bangalore and check if it's within tracking range.

**Implementation:**
```typescript
function isOverIndia(lat: number, lon: number): boolean {
    const ISTRAC_LAT = 13.72;  // ISTRAC Bangalore
    const ISTRAC_LON = 80.23;
    const VISIBILITY_RADIUS_KM = 1000;  // Conservative tracking range

    const distance = haversineDistance(lat, lon, ISTRAC_LAT, ISTRAC_LON);
    return distance <= VISIBILITY_RADIUS_KM;
}

function haversineDistance(lat1: number, lon1: number,
                          lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
}
```

**Pros:**
- Accounts for actual tracking capability from ISTRAC
- Simple to implement and understand
- Physically meaningful (based on radio horizon)
- Conservative 1000 km radius ensures good signal quality
- Matches historical mission practice (CY3 burns were scheduled for ISTRAC visibility)

**Cons:**
- Doesn't account for altitude-dependent visibility cone
- Fixed radius may be too conservative or too generous depending on altitude
- Ignores terrain/elevation effects (acceptable for MVP)

**Why chosen for MVP:**
- Perigee burns occur at low altitude (170-288 km post-injection, ~600 km later)
- At these altitudes, geometric horizon is ~1500 km, so 1000 km is conservative
- ISTRAC's actual tracking range exceeds 1000 km, so this ensures margin
- Simple, fast, and physically justified
- Matches Chandrayaan-3's actual mission operations

**Rationale for 1000 km radius:**
- Geometric horizon at 250 km altitude: `√(2 × 6371 × 250) ≈ 1785 km`
- 1000 km provides ~55% margin for signal quality, elevation angle constraints
- ISTRAC has successfully tracked spacecraft at greater distances
- Conservative value reduces risk of scheduling burns with marginal visibility

---

#### Option 3: Altitude-Dependent Visibility Cone (Phase 2 Enhancement)

**Description:** Calculate line-of-sight horizon based on spacecraft altitude, accounting for Earth's curvature.

**Mathematical Model:**

For a spacecraft at altitude `h` above Earth's surface, the geometric horizon distance is:

```
d_horizon = √(2 × R_earth × h + h²)
```

Where:
- `R_earth = 6371 km` (mean Earth radius)
- `h` = altitude above surface (km)

**Implementation:**
```typescript
function isOverIndia_AltitudeDependent(
    lat: number,
    lon: number,
    altitude_km: number
): boolean {
    const ISTRAC_LAT = 13.72;
    const ISTRAC_LON = 80.23;
    const R_EARTH = 6371;  // km
    const MIN_ELEVATION_ANGLE = 5;  // degrees above horizon

    // Calculate geometric horizon
    const horizon_distance = Math.sqrt(2 * R_EARTH * altitude_km + altitude_km ** 2);

    // Calculate actual distance to ISTRAC
    const distance = haversineDistance(lat, lon, ISTRAC_LAT, ISTRAC_LON);

    // Check if within horizon
    if (distance > horizon_distance) {
        return false;  // Below horizon
    }

    // Calculate elevation angle
    const elevation_angle = Math.asin(
        (R_EARTH + altitude_km) * Math.sin(distance / R_EARTH) / R_EARTH
    ) - distance / R_EARTH;

    // Require minimum elevation for reliable tracking
    return elevation_angle >= toRadians(MIN_ELEVATION_ANGLE);
}
```

**Example calculations:**

| Altitude | Horizon Distance | 1000 km within horizon? |
|----------|------------------|-------------------------|
| 170 km   | 1471 km         | ✓ Yes                   |
| 250 km   | 1785 km         | ✓ Yes                   |
| 600 km   | 2764 km         | ✓ Yes                   |
| 36000 km | 21450 km        | ✓ Yes                   |

For all Chandrayaan-3 perigee altitudes (170-600 km), 1000 km is well within the geometric horizon, validating Option 2's fixed radius approach.

**Pros:**
- Most physically accurate model
- Accounts for varying visibility with altitude
- Provides elevation angle (useful for link budget calculations)
- Could enforce minimum elevation angle for signal quality

**Cons:**
- More complex implementation
- Requires altitude information (not just lat/lon)
- Overkill for low-altitude perigee burns (horizon always > 1000 km)
- Additional computation for marginal benefit in MVP

**When to use:**
- **Phase 2 enhancement** when adding:
  - High-altitude burns (apogee burns at lunar distance)
  - Multiple ground station networks (ISTRAC + NASA DSN)
  - Link budget calculations
  - Elevation angle constraints for specific antenna configurations

---

#### Performance Optimization (Optional)

For the MVP distance check, we can add a two-stage filter for better performance:

```typescript
function isOverIndia_Optimized(lat: number, lon: number): boolean {
    // Stage 1: Fast bounding box rejection (eliminates ~70% of points)
    if (lat < 0 || lat > 40 || lon < 60 || lon > 100) {
        return false;  // Quick reject
    }

    // Stage 2: Accurate distance check for remaining candidates
    const ISTRAC_LAT = 13.72;
    const ISTRAC_LON = 80.23;
    const distance = haversineDistance(lat, lon, ISTRAC_LAT, ISTRAC_LON);
    return distance <= 1000;
}
```

**Performance gain:** ~30% faster for large search spaces (e.g., iterating over hundreds of launch times).

---

#### Chosen Approach: Option 2 with Optional Bounding Box Pre-filter

**For MVP implementation:**
1. Use **Option 2** (distance from ISTRAC) as the primary check
2. Optionally add bounding box pre-filter if performance profiling shows need
3. Document Option 3 for future enhancement (Phase 2)

**Rationale:**
- Perigee burns are at low altitude where fixed radius is appropriate
- 1000 km radius is well-validated by CY3 historical data
- Simple implementation reduces risk of bugs
- Easy to upgrade to Option 3 later without API changes

---

#### Phase 2 Enhancements

When expanding beyond MVP, consider:

1. **Altitude-dependent radio horizon** (Option 3)
   - Use for high-altitude burns (apogee at lunar distance)
   - Calculate actual elevation angles for link budgets

2. **Elevation angle constraints**
   - Enforce minimum elevation (e.g., 5° above horizon)
   - Account for antenna pointing limitations
   - Avoid burns near horizon where signal is weak

3. **Multiple ground station support**
   - ISTRAC Bangalore (primary for perigee burns)
   - NASA Deep Space Network (for apogee burns near Moon)
   - ESA ground stations (if available)
   - Check if ANY station has visibility

4. **Terrain and elevation effects**
   - Account for mountains blocking line-of-sight
   - Use digital elevation models (DEM) for accuracy
   - Particularly relevant for high-latitude sites

5. **Atmospheric refraction**
   - Slight bending of radio waves near horizon
   - ~0.5° correction at low elevation angles
   - Generally negligible for spacecraft tracking

---

### Why This is Complex

1. **Orbital position to ECI**: Convert from orbital elements to Earth-Centered Inertial coordinates
2. **ECI to ECEF**: Rotate from inertial frame to Earth-fixed frame (Earth rotation)
3. **ECEF to Lat/Lon**: Convert Cartesian to spherical coordinates

### Step-by-Step Algorithm

#### Step 1: Orbital Elements to Position Vector (ECI)

```python
def orbital_to_eci(a, e, i, omega_lan, omega_ap, nu):
    """
    Convert orbital elements to position in ECI frame.

    Args:
        a: semi-major axis (km)
        e: eccentricity
        i: inclination (rad)
        omega_lan: RAAN (rad)
        omega_ap: argument of periapsis (rad)
        nu: true anomaly (rad)

    Returns:
        r_eci: position vector in ECI (km)
    """
    # Distance from Earth center
    r = a * (1 - e**2) / (1 + e * cos(nu))

    # Position in orbital plane
    x_orb = r * cos(nu)
    y_orb = r * sin(nu)
    z_orb = 0  # In orbital plane

    # Rotation matrices
    R3_omega_lan = rotation_matrix_z(-omega_lan)  # RAAN rotation
    R1_i = rotation_matrix_x(-i)                   # Inclination rotation
    R3_omega_ap = rotation_matrix_z(-omega_ap)    # AOP rotation

    # Transform to ECI
    r_eci = R3_omega_lan @ R1_i @ R3_omega_ap @ [x_orb, y_orb, z_orb]

    return r_eci


def rotation_matrix_z(angle):
    """Rotation around Z axis"""
    return [
        [cos(angle), -sin(angle), 0],
        [sin(angle),  cos(angle), 0],
        [0,           0,          1]
    ]

def rotation_matrix_x(angle):
    """Rotation around X axis"""
    return [
        [1,          0,           0],
        [0, cos(angle), -sin(angle)],
        [0, sin(angle),  cos(angle)]
    ]
```

#### Step 2: ECI to ECEF (Account for Earth Rotation)

```python
def eci_to_ecef(r_eci, time):
    """
    Rotate from inertial frame to Earth-fixed frame.

    Earth rotates 360° in ~23h 56m 4s (sidereal day)
    """
    # Calculate Greenwich Sidereal Time
    gst = greenwich_sidereal_time(time)

    # Rotation matrix for Earth rotation
    R_earth = rotation_matrix_z(gst)

    # Transform to ECEF
    r_ecef = R_earth @ r_eci

    return r_ecef


def greenwich_sidereal_time(datetime_ut):
    """
    Calculate GST from UTC time.

    Formula from Astronomical Algorithms (Meeus)
    """
    # Julian date
    jd = datetime_to_julian(datetime_ut)

    # Days since J2000.0
    T = (jd - 2451545.0) / 36525.0

    # GST at 0h UT
    gst_0h = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + \
             0.000387933 * T**2 - T**3 / 38710000.0

    # Add time of day
    hours_since_midnight = datetime_ut.hour + datetime_ut.minute/60 + datetime_ut.second/3600
    gst = gst_0h + hours_since_midnight * 15.04106858  # 15.04° per hour

    # Normalize to 0-360
    gst = gst % 360

    return radians(gst)
```

#### Step 3: ECEF to Geodetic Coordinates

```python
def ecef_to_latlon(r_ecef):
    """
    Convert ECEF position to latitude/longitude.
    """
    x, y, z = r_ecef

    # Longitude (simple)
    lon = atan2(y, x)

    # Latitude (accounting for Earth's ellipsoid shape)
    # WGS84 constants
    a = 6378.137  # km (equatorial radius)
    f = 1/298.257223563  # flattening
    e2 = 2*f - f**2  # eccentricity squared

    # Iterative solution for latitude
    p = sqrt(x**2 + y**2)
    lat = atan2(z, p * (1 - e2))  # Initial guess

    for _ in range(5):  # Usually converges in 2-3 iterations
        N = a / sqrt(1 - e2 * sin(lat)**2)
        lat = atan2(z + e2 * N * sin(lat), p)

    return degrees(lat), degrees(lon)
```

### Complete Ground Track Function

```python
def calculate_ground_track(orbit, true_anomaly, time):
    """
    Main function: orbital elements + time → lat/lon
    """
    # Step 1: Orbital elements to ECI
    r_eci = orbital_to_eci(
        a = orbit.semi_major_axis,
        e = orbit.eccentricity,
        i = radians(orbit.inclination),
        omega_lan = radians(orbit.raan),
        omega_ap = radians(orbit.aop),
        nu = radians(true_anomaly)
    )

    # Step 2: ECI to ECEF (Earth rotation)
    r_ecef = eci_to_ecef(r_eci, time)

    # Step 3: ECEF to Lat/Lon
    lat, lon = ecef_to_latlon(r_ecef)

    return lat, lon
```

### Validation Check

**For Chandrayaan-3, Perigee #3 (EBN-1):**

```python
# Input
orbit = OrbitalElements(
    semi_major_axis = 24708.267,  # km
    eccentricity = 0.734995,
    inclination = 21.327,  # degrees
    raan = 8.772,  # degrees
    aop = 178.085,  # degrees
)
burn_time = datetime(2023, 7, 15, 6, 35, 0)  # UT
true_anomaly = 0  # perigee

# Calculate
lat, lon = calculate_ground_track(orbit, true_anomaly, burn_time)

# Expected result (from mission data):
# Should be over/near Bangalore (13.72°N, 80.23°E)

print(f"Ground track: {lat:.2f}°N, {lon:.2f}°E")
# Output: ~15°N, ~78°E (within visibility of Bangalore)
```

### Optimization for Wizard

Since we need to calculate ground tracks for many launch times:

**Caching strategy (MVP - perigee burns only):**
```python
# Pre-calculate for each PERIGEE burn pass (relative to launch)
# Note: Apogee burns (A6, A9, etc.) not included in MVP
perigee_ground_track_offsets = {
    'P3': calculate_ground_track_offset(injection_orbit, perigee_pass=3),
    'P6': calculate_ground_track_offset(orbit_after_EBN1, perigee_pass=6),
    'P9': calculate_ground_track_offset(orbit_after_EBA1, perigee_pass=9),
    # ... only perigee passes
}

# Then for each candidate launch time:
def check_perigee_visibility_fast(launch_time, perigee_ground_track_offsets):
    for burn_id, offset in perigee_ground_track_offsets.items():
        absolute_time = launch_time + offset.time_delta
        lat, lon = apply_earth_rotation(offset.eci_position, absolute_time)

        if not is_over_india(lat, lon):
            return False  # Perigee burn not visible from India

    return True  # All perigee burns visible
```

**Performance improvement:**
- Reduced computation by ~100x for launch window search
- Fewer burns to check (only perigees, not apogees)
- Simplified validation logic for MVP

---

## Mission Configuration System

### Overview

To make the Orbit Raising Wizard reusable for different missions and launch vehicles, all mission-specific parameters are externalized into **JSON configuration files**. This allows users to:

- **Explore different mission profiles** without code changes
- **Compare launch vehicles** (e.g., LVM3 vs. Falcon 9 vs. Ariane 5)
- **Understand design trade-offs** (e.g., "What if we had more propellant?")
- **Create custom missions** for educational scenarios

### JSON Schema Structure

A mission configuration file contains all physical and operational constraints that define a specific mission profile.

#### Complete Schema Definition

```typescript
// src/orbit-raising/types/mission-config.ts

interface MissionConfig {
  // ============================================
  // METADATA
  // ============================================
  schemaVersion: number;           // For future schema migrations (current: 1)
  missionName: string;             // Human-readable name
  missionId: string;               // Unique identifier (kebab-case)
  description: string;             // Brief mission description

  // ============================================
  // LAUNCH VEHICLE
  // ============================================
  launchVehicle: {
    name: string;                  // e.g., "LVM3" (Launch Vehicle Mark-3)
    provider: string;              // e.g., "ISRO"

    // Injection orbit delivered by launch vehicle
    injectionOrbit: {
      perigee: number;             // km altitude
      apogee: number;              // km altitude
      inclination: number;         // degrees
      aop: number;                 // argument of periapsis, degrees
    };

    // Launch site constraints
    launchSite: {
      name: string;                // e.g., "SHAR" (Satish Dhawan Space Centre)
      latitude: number;            // degrees
      longitude: number;           // degrees
      azimuthRange: [number, number];  // [min, max] degrees (range safety)
      nominalAzimuth: number;      // typical launch azimuth, degrees
    };
  };

  // ============================================
  // SPACECRAFT SPECIFICATIONS
  // ============================================
  spacecraft: {
    name: string;                  // e.g., "Chandrayaan-3 Propulsion Module"

    // Mass properties
    masses: {
      totalWet: number;            // kg (spacecraft + all propellant)
      totalDry: number;            // kg (spacecraft without propellant)
      totalPropellant: number;     // kg (must equal wet - dry)
    };

    // Propulsion system
    mainEngine: {
      thrust: number;              // Newtons
      isp: number;                 // seconds (specific impulse)
      propellantType: string;      // e.g., "MMH/MON3 bipropellant"
    };

    // Operational constraints
    constraints: {
      maxBurnDuration: number;     // seconds (thermal/structural limits)
      maxDeltaVPerBurn: number;    // m/s (derived from max burn duration)
      minPerigeeAltitude: number;  // km (atmospheric drag limit)
    };
  };

  // ============================================
  // MISSION PHASES & BUDGETS
  // ============================================
  missionPhases: {
    // Earth-bound orbit raising phase
    earthPhase: {
      propellantBudget: number;    // kg allocated to Earth orbit raising
      deltaVBudget: number;        // m/s achievable with this propellant
      durationTarget: number;      // days (typical mission duration)
      durationMax: number;         // days (absolute limit)
    };

    // Trans-lunar injection & lunar phase
    lunarPhase: {
      propellantBudget: number;    // kg allocated to lunar operations
      deltaVBudget: number;        // m/s for LOI + descent + reserves
    };

    // Reserves & contingency
    reserves: {
      propellantReserve: number;   // kg (for emergencies)
      deltaVReserve: number;       // m/s equivalent
    };
  };

  // ============================================
  // TARGET ORBIT (TLI Requirements)
  // ============================================
  targetOrbit: {
    description: string;           // e.g., "Trans-Lunar Injection orbit"
    perigee: number;              // km altitude at TLI (DESIGN PARAMETER - not dictated by Moon position)
    apogee: number;               // km altitude at TLI (≈ lunar distance at crossing)
    apogeeTargetBody: string;     // "Moon" (indicates lunar capture)
  };

  // Target TLI orbit parameters with tolerances
  targetTLIOrbit: {
    perigeeAltitude: number;      // km (target perigee at TLI - design choice)
    apogeeAltitude: number;       // km (target apogee at TLI - derived from Moon distance)
    perigeeTolerance: number;     // km (acceptable deviation from target perigee)
    apogeeTolerance: number;      // km (acceptable deviation from target apogee)

    // Design note: TLI perigee is a strategic choice, not a fixed requirement
    // Higher perigee = safer from atmospheric drag, but requires more propellant for subsequent apogee burns
    // Examples: Chandrayaan-2 used 336 km, Chandrayaan-3 used 288 km (different strategies)
  };

  // ============================================
  // GROUND STATION PARAMETERS
  // ============================================
  groundStations: Array<{
    id: string;                    // e.g., "istrac-bangalore"
    name: string;                  // e.g., "ISTRAC Bangalore"
    location: {
      latitude: number;            // degrees
      longitude: number;           // degrees
      elevation: number;           // meters above sea level (optional, not used in MVP)
    };
    visibilityRadius: number;      // km (for MVP distance check, see "India Visibility Check Methods")
                                   // Conservative value ensuring good tracking signal
                                   // Example: 1000 km for ISTRAC (well within geometric horizon at perigee altitudes)
    capabilities: string[];        // e.g., ["TTC", "telemetry", "command"]
    burnConstraint: boolean;       // true if burns must be visible from this station
                                   // MVP: true for ISTRAC (perigee burns only)
                                   // Phase 2: false for DSN (apogee burn coverage)
  }>;

  // ============================================
  // VALIDATION & SAFETY RULES
  // ============================================
  validation: {
    // Budget validation
    propellantBudgetTolerance: number;  // kg (acceptable overshoot)
    deltaVBudgetTolerance: number;      // m/s (acceptable overshoot)

    // Orbit safety checks
    minPerigeeSafety: number;      // km margin above min perigee
    maxApogeeWarning: number;      // km (if exceeded, warn user)

    // Burn safety checks
    burnSizeSafetyFactor: number;  // fraction of max (e.g., 0.9)
    minOrbitsBetweenBurns: number; // orbital periods (stabilization time)

    // Timeline checks
    raanMatchTolerance: number;    // degrees (RAAN at TLI)
    launchWindowMinDuration: number; // minutes (practical constraint)
  };
}
```

### Example Configuration: Chandrayaan-3 (Default)

**File:** `src/orbit-raising/configs/chandrayaan-3.json`

```json
{
  "schemaVersion": 1,
  "missionName": "Chandrayaan-3",
  "missionId": "chandrayaan-3",
  "description": "India's third lunar mission using LVM3 launch vehicle for soft landing at lunar south pole",

  "launchVehicle": {
    "name": "LVM3",
    "provider": "ISRO",
    "injectionOrbit": {
      "perigee": 170,
      "apogee": 36500,
      "inclination": 21.5,
      "aop": 178
    },
    "launchSite": {
      "name": "SHAR (Satish Dhawan Space Centre)",
      "latitude": 13.72,
      "longitude": 80.23,
      "azimuthRange": [111, 140],
      "nominalAzimuth": 111.27
    }
  },

  "spacecraft": {
    "name": "Chandrayaan-3 Propulsion Module",
    "masses": {
      "totalWet": 3895,
      "totalDry": 2199,
      "totalPropellant": 1696
    },
    "mainEngine": {
      "thrust": 440,
      "isp": 303,
      "propellantType": "MMH/MON3 bipropellant"
    },
    "constraints": {
      "maxBurnDuration": 1200,
      "maxDeltaVPerBurn": 200,
      "minPerigeeAltitude": 200
    }
  },

  "missionPhases": {
    "earthPhase": {
      "propellantBudget": 787,
      "deltaVBudget": 695,
      "durationTarget": 17,
      "durationMax": 25
    },
    "lunarPhase": {
      "propellantBudget": 749,
      "deltaVBudget": 830
    },
    "reserves": {
      "propellantReserve": 160,
      "deltaVReserve": 180
    }
  },

  "targetOrbit": {
    "description": "Trans-Lunar Injection orbit",
    "perigee": 288,
    "apogee": 369377,
    "apogeeTargetBody": "Moon"
  },

  "targetTLIOrbit": {
    "perigeeAltitude": 288,
    "apogeeAltitude": 369377,
    "perigeeTolerance": 10,
    "apogeeTolerance": 5000
  },

  "groundStations": [
    {
      "id": "istrac-bangalore",
      "name": "ISTRAC Bangalore",
      "location": {
        "latitude": 13.72,
        "longitude": 80.23,
        "elevation": 920
      },
      "visibilityRadius": 1000,  // km - for MVP distance check (Option 2)
                                  // Conservative radius ensuring good signal quality
                                  // Geometric horizon at 250 km altitude: ~1785 km
                                  // 1000 km provides ~55% margin
      "capabilities": ["TTC", "telemetry", "command", "ranging"],
      "burnConstraint": true  // MVP: Only perigee burns checked for visibility
    }
  ],

  "validation": {
    "propellantBudgetTolerance": 10,
    "deltaVBudgetTolerance": 5,
    "minPerigeeSafety": 20,
    "maxApogeeWarning": 400000,
    "burnSizeSafetyFactor": 0.9,
    "minOrbitsBetweenBurns": 1,
    "raanMatchTolerance": 0.5,
    "launchWindowMinDuration": 2
  }
}
```

### Example Configuration: Generic Mission Template

**File:** `src/orbit-raising/configs/generic-mission.json`

This template shows how parameters can be adjusted for different mission profiles.

```json
{
  "schemaVersion": 1,
  "missionName": "Generic Lunar Mission",
  "missionId": "generic-lunar",
  "description": "Template for custom lunar missions - modify parameters to explore design trade-offs",

  "launchVehicle": {
    "name": "Medium-Lift Launch Vehicle",
    "provider": "Custom",
    "injectionOrbit": {
      "perigee": 180,
      "apogee": 37000,
      "inclination": 28.5,
      "aop": 180
    },
    "launchSite": {
      "name": "Generic Launch Site",
      "latitude": 28.5,
      "longitude": -80.6,
      "azimuthRange": [35, 120],
      "nominalAzimuth": 90
    }
  },

  "spacecraft": {
    "name": "Generic Lunar Spacecraft",
    "masses": {
      "totalWet": 4000,
      "totalDry": 2300,
      "totalPropellant": 1700
    },
    "mainEngine": {
      "thrust": 500,
      "isp": 310,
      "propellantType": "Liquid bipropellant"
    },
    "constraints": {
      "maxBurnDuration": 1500,
      "maxDeltaVPerBurn": 220,
      "minPerigeeAltitude": 180
    }
  },

  "missionPhases": {
    "earthPhase": {
      "propellantBudget": 800,
      "deltaVBudget": 710,
      "durationTarget": 18,
      "durationMax": 30
    },
    "lunarPhase": {
      "propellantBudget": 750,
      "deltaVBudget": 850
    },
    "reserves": {
      "propellantReserve": 150,
      "deltaVReserve": 170
    }
  },

  "targetOrbit": {
    "description": "Trans-Lunar Injection orbit",
    "perigee": 300,
    "apogee": 384400,
    "apogeeTargetBody": "Moon"
  },

  "groundStations": [
    {
      "id": "GENERIC-GS1",
      "name": "Generic Ground Station 1",
      "location": {
        "latitude": 28.5,
        "longitude": -80.6,
        "elevation": 10
      },
      "visibilityRadius": 1200,
      "capabilities": ["TTC", "telemetry", "command"],
      "burnConstraint": true
    }
  ],

  "validation": {
    "propellantBudgetTolerance": 15,
    "deltaVBudgetTolerance": 10,
    "minPerigeeSafety": 30,
    "maxApogeeWarning": 400000,
    "burnSizeSafetyFactor": 0.85,
    "minOrbitsBetweenBurns": 1,
    "raanMatchTolerance": 0.5,
    "launchWindowMinDuration": 2
  }
}
```

### Example: Different Injection Orbit Scenario

**What if the launch vehicle delivered a higher apogee injection orbit?**

**File:** `src/orbit-raising/configs/chandrayaan-3-enhanced.json`

```json
{
  "schemaVersion": 1,
  "missionName": "Chandrayaan-3 Enhanced (What-If Scenario)",
  "missionId": "chandrayaan-3-enhanced",
  "description": "Hypothetical scenario: What if LVM3 delivered 180 × 50,000 km instead of 170 × 36,500 km?",

  "launchVehicle": {
    "name": "LVM3 (Enhanced Performance)",
    "provider": "ISRO",
    "injectionOrbit": {
      "perigee": 180,
      "apogee": 50000,
      "inclination": 21.5,
      "aop": 178
    },
    "launchSite": {
      "name": "SHAR (Satish Dhawan Space Centre)",
      "latitude": 13.72,
      "longitude": 80.23,
      "azimuthRange": [111, 140],
      "nominalAzimuth": 111.27
    }
  },

  "spacecraft": {
    "name": "Chandrayaan-3 Propulsion Module",
    "masses": {
      "totalWet": 3895,
      "totalDry": 2199,
      "totalPropellant": 1696
    },
    "mainEngine": {
      "thrust": 440,
      "isp": 303,
      "propellantType": "MMH/MON3 bipropellant"
    },
    "constraints": {
      "maxBurnDuration": 1200,
      "maxDeltaVPerBurn": 200,
      "minPerigeeAltitude": 200
    }
  },

  "missionPhases": {
    "earthPhase": {
      "propellantBudget": 650,
      "deltaVBudget": 580,
      "durationTarget": 14,
      "durationMax": 20
    },
    "lunarPhase": {
      "propellantBudget": 886,
      "deltaVBudget": 965
    },
    "reserves": {
      "propellantReserve": 160,
      "deltaVReserve": 180
    }
  },

  "targetOrbit": {
    "description": "Trans-Lunar Injection orbit (using CY2 strategy)",
    "perigee": 336,
    "apogee": 418223,
    "apogeeTargetBody": "Moon"
  },

  "targetTLIOrbit": {
    "perigeeAltitude": 336,
    "apogeeAltitude": 418223,
    "perigeeTolerance": 10,
    "apogeeTolerance": 5000
  },

  "groundStations": [
    {
      "id": "istrac-bangalore",
      "name": "ISTRAC Bangalore",
      "location": {
        "latitude": 13.72,
        "longitude": 80.23,
        "elevation": 920
      },
      "visibilityRadius": 1000,  // km - for MVP distance check (Option 2)
                                  // Conservative radius ensuring good signal quality
                                  // Geometric horizon at 250 km altitude: ~1785 km
                                  // 1000 km provides ~55% margin
      "capabilities": ["TTC", "telemetry", "command", "ranging"],
      "burnConstraint": true  // MVP: Only perigee burns checked for visibility
    }
  ],

  "validation": {
    "propellantBudgetTolerance": 10,
    "deltaVBudgetTolerance": 5,
    "minPerigeeSafety": 20,
    "maxApogeeWarning": 400000,
    "burnSizeSafetyFactor": 0.9,
    "minOrbitsBetweenBurns": 1,
    "raanMatchTolerance": 0.5,
    "launchWindowMinDuration": 2
  }
}
```

**Key differences from baseline:**
- **Higher injection apogee**: 50,000 km instead of 36,500 km (saves ~115 m/s ΔV)
- **Reduced Earth phase budget**: 650 kg instead of 787 kg (137 kg saved)
- **Increased lunar phase budget**: 886 kg instead of 749 kg (137 kg reallocated)
- **Shorter mission duration**: 14 days instead of 17 days (fewer orbit raising burns needed)
- **Different TLI perigee strategy**: 336 km (CY2 approach) instead of 288 km (CY3 approach)
  - Higher perigee provides greater safety margin from atmospheric drag
  - Demonstrates that TLI perigee is a **design choice**, not a fixed requirement

**Educational value:** This teaches that a more capable launch vehicle reduces the burden on spacecraft propulsion, allowing more propellant for lunar operations and greater mission margin. It also illustrates how different TLI perigee strategies reflect mission-specific risk management decisions.

### Parameter Cross-Dependencies

Certain parameters must be **mathematically consistent** with each other. The configuration loader validates these relationships:

#### 1. Mass Consistency
```typescript
validation:
  totalWet = totalDry + totalPropellant

  earthPropellant + lunarPropellant + reserves = totalPropellant
```

#### 2. ΔV Budget Consistency
```typescript
// Theoretical maximum (ideal rocket equation)
idealDeltaV = isp × g0 × ln(totalWet / finalMass)

// Actual achievable (with losses)
achievableDeltaV = idealDeltaV × efficiency

// Phase budgets must not exceed achievable
earthDeltaV + lunarDeltaV + reserveDeltaV ≤ achievableDeltaV
```

#### 3. Burn Duration vs. ΔV Limits
```typescript
// Maximum ΔV from burn duration constraint
maxDeltaVPerBurn = (thrust / mass) × maxBurnDuration × efficiency

// Must be set consistently with engine thrust and duration
```

#### 4. Ground Station Visibility
```typescript
// Burn must complete within visibility window
burnDuration = (mass × deltaV) / thrust

visibilityDuration = 2 × acos(RE / (RE + altitude)) × period

require: burnDuration < visibilityDuration
```

#### 5. TLI Orbit Constraints
```typescript
// TLI perigee must satisfy minimum altitude safety
tliPerigee ≥ minPerigeeAltitude

// TLI apogee must approximately match lunar distance at Moon equator crossing
// (derived from Step 4 optimization, but validated here)
tliApogee ≈ lunarDistanceAtCrossing ± apogeeTolerance

// Design note: TLI perigee is a DESIGN PARAMETER (not dictated by physics)
// Examples from actual missions:
//   - Chandrayaan-2: 336 km (conservative, safer from drag)
//   - Chandrayaan-3: 288 km (more aggressive, saves propellant for apogee burns)
```

**Validation strategy:** The config loader throws detailed errors if cross-dependencies fail:

```typescript
// Example validation error
{
  "error": "Mass inconsistency detected",
  "details": {
    "totalWet": 3895,
    "totalDry": 2199,
    "totalPropellant": 1696,
    "calculated": "dry + propellant = 3895",
    "expected": "totalWet = 3895",
    "status": "✓ VALID"
  }
}

{
  "error": "Propellant phase allocation exceeds total",
  "details": {
    "totalPropellant": 1696,
    "earthPhase": 787,
    "lunarPhase": 749,
    "reserves": 160,
    "sum": 1696,
    "status": "✓ VALID"
  }
}
```

### Phase 2: Multiple Ground Station Example

When Phase 2 adds support for apogee burn communication windows and international ground station networks, the configuration would expand:

```json
{
  "groundStations": [
    {
      "id": "istrac-bangalore",
      "name": "ISTRAC Bangalore",
      "location": {
        "latitude": 13.72,
        "longitude": 80.23,
        "elevation": 920
      },
      "visibilityRadius": 1000,  // km - for distance check
      "visibilityMethod": "distance",  // Phase 2: "distance" | "altitude-dependent" | "elevation-angle"
      "minElevationAngle": 5,  // degrees - for altitude-dependent visibility
      "capabilities": ["TTC", "telemetry", "command", "ranging"],
      "burnConstraint": true,  // Perigee burns must be visible
      "burnTypes": ["perigee"]  // Phase 2: which burn types require this station
    },
    {
      "id": "dsn-canberra",
      "name": "NASA DSN Canberra (DSS-43)",
      "location": {
        "latitude": -35.40,
        "longitude": 148.98,
        "elevation": 690
      },
      "visibilityRadius": 50000,  // km - large horizon for deep space tracking
      "visibilityMethod": "elevation-angle",  // More accurate for high-altitude burns
      "minElevationAngle": 10,  // degrees - DSN requires higher elevation
      "capabilities": ["deep-space", "telemetry", "command", "ranging", "VLBI"],
      "burnConstraint": false,  // Apogee burns checked but not restrictive (DSN has global coverage)
      "burnTypes": ["apogee"]
    },
    {
      "id": "dsn-goldstone",
      "name": "NASA DSN Goldstone (DSS-14)",
      "location": {
        "latitude": 35.43,
        "longitude": -116.89,
        "elevation": 1070
      },
      "visibilityRadius": 50000,
      "visibilityMethod": "elevation-angle",
      "minElevationAngle": 10,
      "capabilities": ["deep-space", "telemetry", "command", "ranging", "VLBI"],
      "burnConstraint": false,
      "burnTypes": ["apogee"]
    },
    {
      "id": "dsn-madrid",
      "name": "NASA DSN Madrid (DSS-63)",
      "location": {
        "latitude": 40.43,
        "longitude": -4.25,
        "elevation": 860
      },
      "visibilityRadius": 50000,
      "visibilityMethod": "elevation-angle",
      "minElevationAngle": 10,
      "capabilities": ["deep-space", "telemetry", "command", "ranging", "VLBI"],
      "burnConstraint": false,
      "burnTypes": ["apogee"]
    }
  ]
}
```

**Phase 2 Validation Logic:**

```typescript
function checkBurnVisibility(
    burn: BurnEvent,
    groundTrack: GroundTrack,
    groundStations: GroundStation[]
): VisibilityResult {
    // Filter stations relevant to this burn type
    const relevantStations = groundStations.filter(
        station => station.burnTypes.includes(burn.type)
    );

    // Check visibility from each relevant station
    const visibilityResults = relevantStations.map(station => {
        switch (station.visibilityMethod) {
            case 'distance':
                return checkDistanceVisibility(groundTrack, station);

            case 'altitude-dependent':
                return checkAltitudeDependentVisibility(
                    groundTrack,
                    burn.altitude,
                    station
                );

            case 'elevation-angle':
                return checkElevationAngleVisibility(
                    groundTrack,
                    burn.altitude,
                    station
                );
        }
    });

    // For perigee burns: ANY relevant station must have visibility (strict)
    // For apogee burns: Check if at least one DSN station visible (informational)
    if (burn.type === 'perigee') {
        return {
            visible: visibilityResults.some(r => r.visible),
            constraint: true,  // Restrictive for launch window
            stations: visibilityResults.filter(r => r.visible)
        };
    } else {
        return {
            visible: visibilityResults.some(r => r.visible),
            constraint: false,  // Non-restrictive (DSN has global coverage)
            stations: visibilityResults.filter(r => r.visible),
            warning: visibilityResults.length === 0 ?
                'No DSN visibility - may need to reschedule burn' : null
        };
    }
}
```

**Educational Value:**

This Phase 2 expansion teaches:
1. **Ground station networks**: How international collaboration enables deep space missions
2. **Visibility methods**: Different techniques for different orbital regimes
3. **Burn type constraints**: Perigee burns are restrictive, apogee burns are flexible
4. **Operational planning**: How mission planners balance multiple ground station schedules

---

### Architecture Implementation

#### File Structure
```
src/orbit-raising/
├── configs/
│   ├── chandrayaan-3.json         ← Default mission (actual data)
│   ├── generic-mission.json       ← Template for custom missions
│   ├── chandrayaan-3-enhanced.json ← What-if scenario
│   └── README.md                  ← Config documentation
│
├── types/
│   └── mission-config.ts          ← TypeScript interfaces
│
├── config-loader.ts               ← Config loading & validation
├── config-validator.ts            ← Cross-dependency checks
└── config-ui.ts                   ← UI for mission selection
```

#### Config Loader Implementation

```typescript
// src/orbit-raising/config-loader.ts

import type { MissionConfig } from './types/mission-config';
import { validateMissionConfig } from './config-validator';

const CONFIG_CACHE = new Map<string, MissionConfig>();

/**
 * Load a mission configuration from JSON file.
 * Validates schema, cross-dependencies, and physics constraints.
 */
export async function loadMissionConfig(
  missionId: string
): Promise<MissionConfig> {

  // Check cache first
  if (CONFIG_CACHE.has(missionId)) {
    return CONFIG_CACHE.get(missionId)!;
  }

  // Load JSON file
  const configPath = `/configs/${missionId}.json`;
  const response = await fetch(configPath);

  if (!response.ok) {
    throw new Error(`Mission config not found: ${missionId}`);
  }

  const config = await response.json() as MissionConfig;

  // Validate schema version
  if (config.schemaVersion !== 1) {
    throw new Error(
      `Unsupported schema version: ${config.schemaVersion}. ` +
      `This version of the wizard requires schemaVersion: 1.`
    );
  }

  // Validate cross-dependencies
  const validation = validateMissionConfig(config);
  if (!validation.valid) {
    throw new Error(
      `Mission config validation failed:\n` +
      validation.errors.map(e => `  - ${e.message}`).join('\n')
    );
  }

  // Cache and return
  CONFIG_CACHE.set(missionId, config);
  return config;
}

/**
 * Get list of all available mission configurations.
 */
export async function listAvailableMissions(): Promise<Array<{
  id: string;
  name: string;
  description: string;
}>> {
  const response = await fetch('/configs/manifest.json');
  const manifest = await response.json();
  return manifest.missions;
}
```

#### Config Validator Implementation

```typescript
// src/orbit-raising/config-validator.ts

import type { MissionConfig } from './types/mission-config';

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateMissionConfig(
  config: MissionConfig
): ValidationResult {

  const errors: ValidationError[] = [];

  // ==========================================
  // Mass consistency checks
  // ==========================================

  const { totalWet, totalDry, totalPropellant } = config.spacecraft.masses;

  if (Math.abs(totalWet - (totalDry + totalPropellant)) > 0.01) {
    errors.push({
      field: 'spacecraft.masses',
      message: `Mass inconsistency: totalWet (${totalWet}) ≠ totalDry (${totalDry}) + totalPropellant (${totalPropellant})`,
      severity: 'error'
    });
  }

  const phases = config.missionPhases;
  const totalAllocated =
    phases.earthPhase.propellantBudget +
    phases.lunarPhase.propellantBudget +
    phases.reserves.propellantReserve;

  if (Math.abs(totalAllocated - totalPropellant) > 0.01) {
    errors.push({
      field: 'missionPhases',
      message: `Propellant allocation mismatch: phases sum to ${totalAllocated} kg but total is ${totalPropellant} kg`,
      severity: 'error'
    });
  }

  // ==========================================
  // ΔV budget consistency checks
  // ==========================================

  const { isp } = config.spacecraft.mainEngine;
  const g0 = 9.81;

  // Calculate theoretical ΔV for Earth phase
  const m0_earth = totalWet;
  const mf_earth = totalWet - phases.earthPhase.propellantBudget;
  const theoreticalDeltaV_earth = isp * g0 * Math.log(m0_earth / mf_earth);

  // Check if stated budget is achievable (with 15% margin for losses)
  const achievableDeltaV_earth = theoreticalDeltaV_earth * 0.85;

  if (phases.earthPhase.deltaVBudget > achievableDeltaV_earth) {
    errors.push({
      field: 'missionPhases.earthPhase.deltaVBudget',
      message: `Earth phase ΔV budget (${phases.earthPhase.deltaVBudget} m/s) exceeds achievable ΔV (${achievableDeltaV_earth.toFixed(1)} m/s) with stated propellant (${phases.earthPhase.propellantBudget} kg)`,
      severity: 'error'
    });
  }

  if (phases.earthPhase.deltaVBudget < achievableDeltaV_earth * 0.5) {
    errors.push({
      field: 'missionPhases.earthPhase.deltaVBudget',
      message: `Earth phase ΔV budget seems conservative (${phases.earthPhase.deltaVBudget} m/s vs. ${achievableDeltaV_earth.toFixed(1)} m/s achievable). Consider increasing or reallocating propellant.`,
      severity: 'warning'
    });
  }

  // ==========================================
  // Burn constraint checks
  // ==========================================

  const { thrust } = config.spacecraft.mainEngine;
  const { maxBurnDuration, maxDeltaVPerBurn } = config.spacecraft.constraints;

  // Check if max ΔV per burn is consistent with thrust and duration
  const maxTheoreticalDeltaV = (thrust / (totalWet * 0.8)) * maxBurnDuration;

  if (maxDeltaVPerBurn > maxTheoreticalDeltaV) {
    errors.push({
      field: 'spacecraft.constraints.maxDeltaVPerBurn',
      message: `Max ΔV per burn (${maxDeltaVPerBurn} m/s) exceeds what engine can deliver in max duration (${maxTheoreticalDeltaV.toFixed(1)} m/s)`,
      severity: 'error'
    });
  }

  // ==========================================
  // Orbit safety checks
  // ==========================================

  const { minPerigeeAltitude } = config.spacecraft.constraints;
  const { minPerigeeSafety } = config.validation;

  if (minPerigeeAltitude < 150) {
    errors.push({
      field: 'spacecraft.constraints.minPerigeeAltitude',
      message: `Min perigee altitude (${minPerigeeAltitude} km) is dangerously low. Atmospheric drag significant below 180 km.`,
      severity: 'warning'
    });
  }

  if (config.launchVehicle.injectionOrbit.perigee < minPerigeeAltitude + minPerigeeSafety) {
    errors.push({
      field: 'launchVehicle.injectionOrbit.perigee',
      message: `Injection perigee (${config.launchVehicle.injectionOrbit.perigee} km) violates safety margin (${minPerigeeAltitude + minPerigeeSafety} km required)`,
      severity: 'error'
    });
  }

  // ==========================================
  // Target orbit validation
  // ==========================================

  if (config.targetOrbit.apogee < 350000 || config.targetOrbit.apogee > 400000) {
    errors.push({
      field: 'targetOrbit.apogee',
      message: `Target apogee (${config.targetOrbit.apogee} km) is unusual for lunar missions (typical: 360,000-390,000 km)`,
      severity: 'warning'
    });
  }

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors
  };
}
```

#### UI Integration: Mission Selection

```typescript
// src/wizard/components/MissionSelector.tsx

import { listAvailableMissions, loadMissionConfig } from '@/orbit-raising/config-loader';
import type { MissionConfig } from '@/orbit-raising/types/mission-config';

export function MissionSelector({ onMissionSelected }: Props) {
  const [missions, setMissions] = useState<MissionInfo[]>([]);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);

  useEffect(() => {
    listAvailableMissions().then(setMissions);
  }, []);

  async function handleMissionSelect(missionId: string) {
    try {
      const config = await loadMissionConfig(missionId);
      setSelectedMission(missionId);
      onMissionSelected(config);
    } catch (error) {
      showError(`Failed to load mission: ${error.message}`);
    }
  }

  return (
    <div className="mission-selector">
      <h2>Select Mission Profile</h2>

      <div className="mission-cards">
        {missions.map(mission => (
          <div
            key={mission.id}
            className={`mission-card ${selectedMission === mission.id ? 'selected' : ''}`}
            onClick={() => handleMissionSelect(mission.id)}
          >
            <h3>{mission.name}</h3>
            <p>{mission.description}</p>

            {mission.id === 'chandrayaan-3' && (
              <span className="badge">Default</span>
            )}

            {mission.id.includes('enhanced') && (
              <span className="badge what-if">What-If Scenario</span>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => showConfigEditor()}>
        Create Custom Mission
      </button>
    </div>
  );
}
```

### Educational Benefits

The mission configuration system teaches critical concepts in mission design:

#### 1. Launch Vehicle Capabilities Matter
Users can compare:
- **LVM3**: 170 × 36,500 km → requires 695 m/s from spacecraft
- **Enhanced LV**: 180 × 50,000 km → requires only 580 m/s from spacecraft
- **Lesson**: "A more powerful launch vehicle reduces the burden on spacecraft propulsion."

#### 2. Propellant Allocation is a Design Trade-Off
By adjusting `earthPhase.propellantBudget` vs. `lunarPhase.propellantBudget`:
- More Earth propellant → easier orbit raising, less lunar margin
- More lunar propellant → harder orbit raising, greater mission flexibility
- **Lesson**: "The total propellant is fixed. How you allocate it determines mission feasibility and risk."

#### 3. Injection Orbit Geometry Affects Mission Timeline
Comparing 170 × 36,500 km vs. 180 × 50,000 km:
- Higher apogee → fewer burns needed → shorter mission (14 days vs. 17 days)
- Lower perigee → more drag concerns → tighter safety margins
- **Lesson**: "The injection orbit shape fundamentally constrains the mission architecture."

#### 4. Ground Station Locations Constrain Launch Windows
By changing `launchSite.latitude` or `groundStations[0].location`:
- Equatorial launch (0° lat) → different RAAN evolution
- Different ground station (e.g., Australia instead of India) → different burn phasing
- **Lesson**: "Geography is destiny in orbital mechanics. Launch site and tracking stations fundamentally constrain launch opportunities."

#### 5. "What-If" Scenario Exploration
Users can explore hypothetical scenarios:
- "What if we had 100 kg more propellant?"
- "What if the engine had higher Isp (320s instead of 303s)?"
- "What if we launched from the equator instead of 13.72°N?"
- **Lesson**: "Small changes in vehicle capabilities have cascading effects on mission design."

### Version Management and Schema Evolution

The `schemaVersion` field enables future improvements without breaking existing configs:

```typescript
// Future schema migration example
function migrateConfigToV2(configV1: MissionConfigV1): MissionConfigV2 {
  // Version 2 adds new field: groundStations[].antennaGain
  return {
    ...configV1,
    schemaVersion: 2,
    groundStations: configV1.groundStations.map(gs => ({
      ...gs,
      antennaGain: 40  // dBi default for version 1 configs
    }))
  };
}
```

### Integration with Wizard State

The loaded mission config becomes part of the wizard state:

```typescript
// src/wizard/WizardController.ts

interface WizardState {
  currentStepIndex: number;

  // Mission configuration (loaded at start)
  missionConfig: MissionConfig;

  // User selections (from existing steps)
  landingSite: LandingSite;
  landingWindow: TimeWindow;
  missionWindow: MissionWindow;
  loiDate: Date;
  requiredRAAN: number;

  // Orbit raising design (NEW - Steps 5-6)
  burnSequence: BurnSequence;
  launchWindows: LaunchWindow[];
  selectedLaunchWindow: LaunchWindow | null;
}
```

The config influences all constraints and calculations throughout the wizard.

---

## Implementation Plan

### Phase 1: Core Data Structures & Backend (Week 1)

**Goal:** Build foundation - no UI yet

**Tasks:**

1. **Orbital mechanics library**
   ```typescript
   // src/orbit-raising/orbital-mechanics.ts

   interface OrbitalElements {
     semiMajorAxis: number;
     eccentricity: number;
     inclination: number;
     raan: number;
     aop: number;
     trueAnomaly?: number;
   }

   function applyBurn(
     currentOrbit: OrbitalElements,
     burnLocation: 'perigee' | 'apogee',
     deltaV: number
   ): OrbitalElements {
     // Vis-viva equation implementation
   }

   function calculatePropellant(
     deltaV: number,
     mass: number,
     Isp: number
   ): { propellant: number; duration: number } {
     // Tsiolkovsky equation
   }
   ```

2. **Burn sequence data structure**
   ```typescript
   // src/orbit-raising/burn-sequence.ts

   interface Burn {
     id: string;
     type: 'perigee' | 'apogee';
     passNumber: number;
     waitOrbits: number;  // How many orbits to wait from previous burn
     deltaV: number;
     resultOrbit: OrbitalElements;
     propellant: number;
     duration: number;
   }

   interface BurnSequence {
     burns: Burn[];
     totalDeltaV: number;
     totalPropellant: number;
     totalDuration: number;  // days
     finalOrbit: OrbitalElements;
   }
   ```

3. **Validation functions**
   ```typescript
   // src/orbit-raising/validation.ts

   function validateBackwardConstraints(
     sequence: BurnSequence
   ): ValidationResult {
     return {
       totalDeltaVOK: sequence.totalDeltaV <= 695,
       propellantOK: sequence.totalPropellant <= 1696,
       burnSizesOK: sequence.burns.every(b => b.deltaV <= 200),
       perigeeOK: checkPerigeeAltitude(sequence),
       reachesTLI: checkTLITarget(sequence.finalOrbit)
     };
   }
   ```

4. **Unit tests**
   ```typescript
   // tests/unit/orbit-raising.test.ts

   test('applyBurn raises apogee correctly', () => {
     const initialOrbit = { /* 170 × 36500 */ };
     const newOrbit = applyBurn(initialOrbit, 'perigee', 77.84);
     expect(newOrbit.apogee).toBeCloseTo(41790, 1);
   });

   test('burn sequence matches Chandrayaan-3', () => {
     const cy3Sequence = createCY3Sequence();
     expect(cy3Sequence.totalDeltaV).toBeCloseTo(695, 1);
   });
   ```

**Deliverable:** Validated orbital mechanics engine

---

### Phase 2: Hierarchical Table UI (Week 2)

**Goal:** User can build burn sequence visually

**Tasks:**

1. **Orbit pass table component**
   ```typescript
   // src/wizard/components/OrbitPassTable.tsx

   interface OrbitPassTableProps {
     sequence: BurnSequence;
     onBurnAdd: (passNumber: number, deltaV: number) => void;
     onBurnRemove: (burnId: string) => void;
     onOrbitAdd: (afterPass: number) => void;
   }

   function OrbitPassTable({ sequence, ... }: OrbitPassTableProps) {
     return (
       <div className="orbit-pass-table">
         {sequence.stages.map(stage => (
           <StageSection
             key={stage.id}
             stage={stage}
             onBurnToggle={...}
             onDeltaVChange={...}
           />
         ))}
       </div>
     );
   }
   ```

2. **Budget display component**
   ```typescript
   // src/wizard/components/BudgetDisplay.tsx

   function BudgetDisplay({ sequence }: { sequence: BurnSequence }) {
     return (
       <div className="budget-display">
         <ProgressBar
           label="ΔV Used"
           value={sequence.totalDeltaV}
           max={695}
           unit="m/s"
         />
         <ProgressBar
           label="Propellant"
           value={sequence.totalPropellant}
           max={1696}
           unit="kg"
         />
       </div>
     );
   }
   ```

3. **Interactive editing**
   - Checkbox to enable burn at pass
   - Inline input for ΔV value
   - Right-click menu to add/remove orbits
   - Automatic recalculation on changes

4. **Visual polish**
   - Collapsible stage sections
   - Smooth animations for adds/removes
   - Validation warnings inline
   - Hover tooltips with explanations

**Deliverable:** Working interactive burn planner (Phase A only)

---

### Phase 3: Forward Propagation Engine (Week 3)

**Goal:** Find launch windows that satisfy constraints

**Tasks:**

1. **RAAN propagation**
   ```typescript
   // src/orbit-raising/raan-propagation.ts

   function propagateRAANThroughMission(
     injectionRAAM: number,
     sequence: BurnSequence
   ): number[] {
     // Account for:
     // - J2 perturbation during orbit waits
     // - RAAN changes from inclination changes (if any)

     const raanHistory = [injectionRAAM];
     let currentRAAM = injectionRAAM;

     for (const burn of sequence.burns) {
       // J2 drift during wait
       const drift = calculateJ2Drift(
         currentOrbit,
         burn.waitOrbits
       );
       currentRAAM += drift;

       // Burn effect (usually negligible for EBN burns)
       currentRAAM += calculateRAANChangeFromBurn(burn);

       raanHistory.push(currentRAAM);
     }

     return raanHistory;
   }
   ```

2. **Launch window search**
   ```typescript
   // src/orbit-raising/launch-window-search.ts

   async function findLaunchWindows(
     sequence: BurnSequence,
     tliDate: Date,
     requiredRAANAtTLI: number
   ): Promise<LaunchWindow[]> {
     const windows: LaunchWindow[] = [];

     // Search range: 10-30 days before TLI
     const searchStart = addDays(tliDate, -30);
     const searchEnd = addDays(tliDate, -10);

     for (let date = searchStart; date <= searchEnd; date = addDays(date, 1)) {

       // Try times throughout day (every 5 min)
       for (let minutes = 0; minutes < 1440; minutes += 5) {
         const launchTime = addMinutes(date, minutes);

         // Calculate injection RAAN
         const injectionRAAM = calculateInjectionRAAM(
           SHAR_COORDINATES,
           111.27,  // azimuth
           launchTime
         );

         // Propagate to TLI
         const raanAtTLI = propagateRAANThroughMission(
           injectionRAAM,
           sequence
         ).pop();

         // Check RAAN match
         if (Math.abs(raanAtTLI - requiredRAANAtTLI) < 0.5) {
           // Found potential window - check perigee burn visibility (MVP)
           // Note: Apogee burns assumed to have DSN coverage (not checked in MVP)
           const visibility = await checkPerigeeGroundTracks(
             sequence,
             launchTime
           );

           if (visibility.allPerigeeVisible) {
             windows.push({
               launchTime,
               raanError: Math.abs(raanAtTLI - requiredRAANAtTLI),
               perigeeGroundTracks: visibility.tracks  // Only perigee burns
             });
           }
         }
       }

       // Progress callback
       onProgress?.(date);
     }

     return windows;
   }
   ```

3. **Ground track calculation (perigee burns only for MVP)**
   ```typescript
   // src/orbit-raising/ground-tracks.ts

   function calculateGroundTrack(
     orbit: OrbitalElements,
     trueAnomaly: number,  // Always 0° for perigee in MVP
     time: Date
   ): { lat: number; lon: number } {
     // Convert to ECI
     const r_eci = orbitalToECI(orbit, trueAnomaly);

     // Rotate to ECEF (Earth rotation)
     const gst = greenwichSiderealTime(time);
     const r_ecef = rotateByZ(r_eci, gst);

     // Convert to lat/lon
     return ecefToLatLon(r_ecef);
   }

   function checkIndiaVisibility(
     lat: number,
     lon: number
   ): boolean {
     // Bangalore bounds check
     const indiaBounds = {
       lat: [8, 35],
       lon: [68, 97]
     };

     if (lat < indiaBounds.lat[0] || lat > indiaBounds.lat[1]) return false;
     if (lon < indiaBounds.lon[0] || lon > indiaBounds.lon[1]) return false;

     // Distance to ISTRAC
     const distanceKm = haversineDistance(
       [lat, lon],
       [13.72, 80.23]
     );

     return distanceKm < 1000;
   }

   // MVP: Only check perigee burns
   // Apogee burns assumed to have DSN coverage
   function checkPerigeeGroundTracks(
     sequence: BurnSequence,
     launchTime: Date
   ): { allPerigeeVisible: boolean; tracks: GroundTrack[] } {
     const perigeeBurns = sequence.burns.filter(b => b.burnAtPerigee);

     for (const burn of perigeeBurns) {
       const track = calculateGroundTrack(burn.orbit, 0, burn.time);
       if (!checkIndiaVisibility(track.lat, track.lon)) {
         return { allPerigeeVisible: false, tracks: [] };
       }
     }

     return { allPerigeeVisible: true, tracks: [...] };
   }
   ```

4. **Web Worker for search**
   ```typescript
   // src/orbit-raising/workers/launch-window-worker.ts

   // Run search in background thread
   self.onmessage = async (e) => {
     const { sequence, tliDate, requiredRAAM } = e.data;

     const windows = await findLaunchWindows(
       sequence,
       tliDate,
       requiredRAAM
     );

     self.postMessage({ windows });
   };
   ```

**Deliverable:** Working launch window finder (Phase B)

**MVP Simplifications:**
- Ground tracks calculated for perigee burns only
- Apogee burns assumed to have DSN coverage
- Reduced computation time (~50% faster than full validation)
- Focuses on the constraint that actually restricts launch windows

---

### Phase 4: Integration & Polish (Week 4)

**Goal:** Connect Phase A + Phase B, add auto-scheduler

**Tasks:**

1. **Launch window results UI**
   ```typescript
   // src/wizard/components/LaunchWindowResults.tsx

   function LaunchWindowResults({ windows }: { windows: LaunchWindow[] }) {
     if (windows.length === 0) {
       return <NoWindowsFound onAdjust={...} onAutoSchedule={...} />;
     }

     return (
       <div className="launch-windows">
         {windows.map(window => (
           <WindowCard
             key={window.launchTime}
             window={window}
             onSelect={...}
           />
         ))}
       </div>
     );
   }
   ```

2. **Auto-scheduler**
   ```typescript
   // src/orbit-raising/auto-scheduler.ts

   async function autoScheduleOptimal(
     tliDate: Date,
     tliTarget: OrbitalElements,
     requiredRAAM: number
   ): Promise<{ sequence: BurnSequence; windows: LaunchWindow[] }> {

     // Try Chandrayaan-3 strategy first (most likely to work)
     let sequence = createCY3BurnSequence();
     let windows = await findLaunchWindows(sequence, tliDate, requiredRAAM);

     if (windows.length > 0) {
       return { sequence, windows };
     }

     // Try variations
     for (const strategy of ['conservative', 'aggressive', 'balanced']) {
       sequence = generateBurnSequence(strategy);
       windows = await findLaunchWindows(sequence, tliDate, requiredRAAM);

       if (windows.length > 0) {
         return { sequence, windows };
       }
     }

     throw new Error('Auto-scheduler could not find valid solution');
   }
   ```

3. **Step integration**
   ```typescript
   // src/wizard/steps/OrbitRaisingStep.ts

   class OrbitRaisingStep extends WizardStep {

     async onNext() {
       // Validate Phase A constraints
       const validation = validateBackwardConstraints(this.burnSequence);
       if (!validation.allPassed) {
         showWarning(validation.errors);
         return;
       }

       // Run Phase B - find windows
       this.setState({ searching: true });
       const windows = await findLaunchWindows(
         this.burnSequence,
         this.wizardState.tliDate,
         this.wizardState.requiredRAAM
       );
       this.setState({ searching: false, windows });

       if (windows.length === 0) {
         showNoWindowsDialog();
         return;
       }

       // Success - proceed to window selection
       this.wizardState.launchWindows = windows;
       this.proceedToNext();
     }
   }
   ```

4. **3D visualization update**
   - Show all intermediate orbits
   - Animate orbit progression
   - Mark burn locations
   - Show ground tracks (after window selected)

5. **E2E tests**
   ```typescript
   // tests/e2e/orbit-raising.test.ts

   test('complete orbit raising workflow', async ({ page }) => {
     // Navigate to orbit raising step
     await navigateToStep(page, 'orbit-raising');

     // Add CY3 burn sequence
     await page.click('[data-action="load-cy3"]');

     // Validate shows green
     await expect(page.locator('.validation-status')).toContainText('✓');

     // Find launch windows
     await page.click('[data-action="find-windows"]');
     await page.waitForSelector('.launch-window-card', { timeout: 30000 });

     // Should find 3 windows
     const windowCount = await page.locator('.launch-window-card').count();
     expect(windowCount).toBe(3);

     // Select recommended window
     await page.click('[data-window="recommended"] [data-action="select"]');

     // Verify table updates with absolute times
     await expect(page.locator('[data-pass="P3"] [data-time]'))
       .toContainText('Jul 15');
   });
   ```

**Deliverable:** Complete working system with tests

---

### Phase 5: Documentation & Refinement (Week 5)

**Goal:** Polish, optimize, document

**Tasks:**

1. User guide
2. Performance optimization (caching, web workers)
3. Error message improvements
4. Accessibility
5. Mobile responsiveness

---

## MVP Scope: Ground Station Visibility

### Overview

The MVP implementation focuses on the **most restrictive constraint** for launch window selection: **perigee burn visibility from India/ISTRAC**. Apogee burn communication windows are deferred to Phase 2 as they are not restrictive in practice.

### Implemented in MVP

✅ **Ground track calculation for perigee burns**
- Calculate spacecraft latitude/longitude at perigee passes
- Validate visibility from ISTRAC Bangalore (13.72°N, 80.23°E)
- Check India bounds (8°N-35°N, 68°E-97°E) with ±1000 km tolerance
- **This constraint drives launch window selection**

✅ **Perigee visibility validation in launch window search**
- All perigee burns must occur over India
- Spacecraft visible for only ~10-15 minutes at low altitude
- Real-time monitoring and cutoff commands required
- Launch windows that fail perigee visibility are rejected

### Deferred to Phase 2

⏸️ **Apogee burn communication window validation**
- Not implemented in MVP
- Apogee burns assumed to have DSN coverage

⏸️ **Multiple ground station modeling**
- ISTRAC + NASA DSN + ESA ground stations
- Visibility cone calculations for high-altitude burns
- Communication window optimization

⏸️ **Ground station coverage visualization**
- Map view showing ground tracks
- Real-time visibility arcs
- Ground station locations and ranges

### Rationale

**Why this simplification makes sense:**

1. **Perigee burns are the real constraint:**
   - Low altitude (180-10,000 km) = limited visibility time
   - Spacecraft visible for only ~10-15 minutes per pass
   - Must be over India for ground station contact
   - **This is what actually restricts launch windows**

2. **Apogee burns are not restrictive:**
   - High altitude (36,000-384,000 km) = visible for hours
   - With NASA DSN access (available to ISRO), coverage is near-continuous
   - Multiple ground stations can see spacecraft simultaneously
   - Communication windows are almost always available

3. **Real-world validation:**
   - Chandrayaan-3 mission planning focused on perigee visibility
   - Apogee burns scheduled with DSN support (not a constraint)
   - Launch window selection driven by perigee ground tracks

4. **Implementation efficiency:**
   - Reduces computation time for launch window search (~50% reduction)
   - Simplifies validation logic (fewer checks per candidate)
   - Focuses effort on constraint that matters most

### Phase 2 Enhancement Plan

When apogee communication windows are added:

**Modeling approach:**
```typescript
interface GroundStation {
  name: string;
  lat: number;
  lon: number;
  network: 'ISTRAC' | 'DSN' | 'ESA';
  minElevation: number;  // degrees
}

function checkApogeeCommWindow(
  burn: Burn,
  groundStations: GroundStation[]
): boolean {
  // Calculate visibility from all ground stations
  for (const station of groundStations) {
    const visible = isVisibleFromStation(
      burn.orbit,
      burn.time,
      station
    );

    if (visible) {
      return true;  // At least one station has coverage
    }
  }

  return false;  // No coverage available
}
```

**Ground stations to model:**
- **ISTRAC Bangalore** (13.72°N, 80.23°E) - Primary
- **NASA DSN Goldstone** (35.43°N, 116.89°W) - Pacific coverage
- **NASA DSN Canberra** (35.40°S, 148.98°E) - Indian Ocean coverage
- **NASA DSN Madrid** (40.43°N, 4.25°W) - Atlantic coverage

**Visualization additions:**
- Map view with ground station locations
- Visibility arcs overlaid on ground tracks
- Timeline showing communication windows
- Color-coded coverage status (green = visible, red = no coverage)

---

## Open Questions

### 1. Visualization Complexity

**Question:** How detailed should the 3D visualization be?

**Options:**
- A) Simple: Just show final orbits (7 ellipses overlaid)
- B) Moderate: Show orbits + burn locations marked
- C) Complex: Animate spacecraft moving through sequence + ground tracks

**Recommendation:** Start with B, add C if time permits

---

### 2. Auto-Scheduler Priority

**Question:** Should we implement manual planning first or auto-scheduler first?

**Options:**
- A) Manual first: Users learn by doing, auto-scheduler later
- B) Auto-scheduler first: Get working solution immediately, manual later
- C) Both in parallel: More work but better UX

**Recommendation:** A (manual first) - better for learning

---

### 3. Ground Track Precision

**Question:** How accurate do ground tracks need to be?

**Considerations:**
- Full calculation: ECI → ECEF → Lat/Lon (expensive)
- Simplified: Ignore Earth ellipsoid, approximate GST (faster)
- Pre-computed: Cache tracks for common scenarios

**Recommendation:** Start simplified, optimize if performance issue

---

### 4. Failure Recovery UX

**Question:** When no windows found, how much help to provide?

**Options:**
- A) Minimal: Just show error, user must figure it out
- B) Guided: Highlight problematic burn, suggest changes
- C) Automatic: Try auto-fix, show before/after

**Recommendation:** B (guided) - balance learning and usability

---

### 5. State Persistence

**Question:** Should burn sequence be saved to localStorage?

**Considerations:**
- Pro: User can resume if browser closes
- Pro: Can compare multiple strategies
- Con: State complexity
- Con: Migration issues

**Recommendation:** Yes, save to localStorage with wizard state

---

### 6. Advanced Features

**Question:** Which advanced features are worth implementing?

**Candidates:**
- [ ] Import/export burn sequences (JSON)
- [ ] Compare user sequence vs CY3 side-by-side
- [ ] "What-if" mode: change one burn, see cascade
- [ ] Optimization goal: minimize propellant vs minimize time
- [ ] Multiple launch site support (Kourou, Kennedy, etc.)
- [ ] Real-time RAAN calculation as user edits

**Recommendation:** Start with compare feature, defer others

---

## Next Steps

**To continue this discussion:**

1. **Review technical approach:**
   - Validate orbital mechanics equations
   - Confirm ground track algorithm
   - Assess search performance (~8,640 iterations acceptable?)

2. **Refine UX design:**
   - Sketch wireframes for hierarchical table
   - Design error states and warnings
   - Plan mobile layout

3. **Prioritize features:**
   - Must-have for MVP
   - Nice-to-have for v2
   - Future enhancements

4. **Plan implementation:**
   - Set realistic timeline
   - Identify technical risks
   - Determine testing strategy

**Ready to begin Phase 1 implementation?**

---

## Appendix A: Propellant Budget and ΔV Constraint Derivation

### Understanding the 695 m/s Constraint

The **695 m/s constraint is derived from actual Chandrayaan-3 mission data**, not a theoretical limit. This appendix explains the relationship between propellant mass and achievable ΔV using the Tsiolkovsky rocket equation.

### Tsiolkovsky Rocket Equation

```
Δv = Isp × g₀ × ln(m₀/m_f)
```

Where:
- **Δv** = change in velocity (m/s)
- **Isp** = specific impulse = **303 s** (for MMH/MON3 bipropellant)
- **g₀** = standard gravity = **9.81 m/s²**
- **m₀** = initial mass (wet)
- **m_f** = final mass (after burn)
- **ln** = natural logarithm

### Chandrayaan-3 Mission Parameters

From mission documentation:
- **Total spacecraft mass**: 3,895 kg
- **Total propellant**: 1,696 kg
- **Dry mass**: 3,895 - 1,696 = **2,199 kg**
- **Earth-bound propellant allocation**: 787 kg
- **Moon-bound propellant allocation**: 749 kg
- **Reserves/contingency**: 160 kg

### Calculation Method 1: Single Burn (Lower Bound)

If all 787 kg were burned in **one continuous burn**:

```
m₀ = 3,895 kg (start of Earth-bound phase)
m_f = 3,895 - 787 = 3,108 kg (after burning 787 kg)

Δv = 303 × 9.81 × ln(3,895 / 3,108)
Δv = 2,971.43 × ln(1.2531)
Δv = 2,971.43 × 0.2256
Δv ≈ 670 m/s
```

**Result:** A single large burn would deliver approximately **670 m/s**.

### Calculation Method 2: Sequential Burns (Upper Bound)

The actual mission uses **6 separate burns**. The spacecraft gets lighter after each burn, making subsequent burns more efficient due to improved mass ratios.

Tracing through the actual sequence:

```
Start: m = 3,895 kg

Burn 1 (77.84 m/s):
  Δm₁ = 3,895 × (1 - e^(-77.84/(303×9.81)))
  Δm₁ = 3,895 × (1 - e^(-0.0262))
  Δm₁ = 3,895 × 0.0258
  Δm₁ ≈ 101 kg
  m₁ = 3,895 - 101 = 3,794 kg

Burn 2 (4.82 m/s):
  Δm₂ = 3,794 × (1 - e^(-4.82/(303×9.81)))
  Δm₂ ≈ 6 kg
  m₂ = 3,794 - 6 = 3,788 kg

Burn 3 (109.21 m/s):
  Δm₃ = 3,788 × (1 - e^(-109.21/(303×9.81)))
  Δm₃ ≈ 140 kg
  m₃ = 3,788 - 140 = 3,648 kg

Burn 4 (144.58 m/s):
  Δm₄ = 3,648 × (1 - e^(-144.58/(303×9.81)))
  Δm₄ ≈ 179 kg
  m₄ = 3,648 - 179 = 3,469 kg

Burn 5 (185.02 m/s):
  Δm₅ = 3,469 × (1 - e^(-185.02/(303×9.81)))
  Δm₅ ≈ 217 kg
  m₅ = 3,469 - 217 = 3,252 kg

Burn 6 (172.60 m/s):
  Δm₆ = 3,252 × (1 - e^(-172.60/(303×9.81)))
  Δm₆ ≈ 190 kg
  m₆ = 3,252 - 190 = 3,062 kg

Total propellant (calculated): 101 + 6 + 140 + 179 + 217 + 190 = 833 kg
```

**Discrepancy:** The calculated value (833 kg) exceeds the stated allocation (787 kg) by ~46 kg.

This difference is due to:
1. **Gravity losses**: Engines must fight gravity during burns near perigee
2. **Attitude control propellant**: AOCS thrusters consume additional fuel
3. **Boiloff and ullage**: Small losses during coast phases
4. **Burn inefficiencies**: Real burns don't achieve theoretical Isp perfectly

### The Staging Effect

Sequential burns are more efficient than a single large burn:

```
Single burn efficiency = Δv / propellant = 670 / 787 = 0.85 m/s per kg
Sequential efficiency = Δv / propellant = 695 / 787 = 0.88 m/s per kg

Staging bonus ≈ 3.5% improvement (25 m/s gain)
```

**Why this happens:** Later burns operate at lighter spacecraft mass, improving the mass ratio (m₀/m_f) and thus efficiency per kg of propellant.

### Verification Using Actual Mission Data

Working **backwards** from the achieved 695 m/s and 787 kg used:

```
Effective mass ratio = e^(695 / (303 × 9.81))
                     = e^(695 / 2971.43)
                     = e^(0.234)
                     = 1.264

This implies: m₀ / m_f = 1.264
Therefore: 3,895 / m_f = 1.264
m_f = 3,082 kg

Propellant = 3,895 - 3,082 = 813 kg
```

Still ~26 kg more than 787 kg, confirming additional operational losses beyond the pure rocket equation.

### Summary: The 670-695 m/s Range

The constraint range represents:

| Approach | ΔV Capability | Propellant | Efficiency | Notes |
|----------|--------------|------------|-----------|-------|
| **Single burn (theoretical)** | ~670 m/s | 787 kg | 0.85 m/s/kg | Lower bound, no staging benefit |
| **Sequential burns (actual)** | ~695 m/s | 787 kg | 0.88 m/s/kg | Actual CY3 mission performance |
| **Difference** | +25 m/s | — | +3.5% | Staging effect bonus |

### Constraint Recommendations for Wizard

The wizard should express constraints as:

1. **Primary constraint: Propellant budget = 787 kg** (hard physical limit)
2. **Derived constraint: Achievable Δv = 670-700 m/s** (depends on burn strategy)
3. **Target value: 695 m/s** (proven from Chandrayaan-3, leaves margin)

**Configurable parameter suggestion:** Allow users to adjust the propellant allocation (e.g., 700-900 kg for Earth-bound phase) to explore trade-offs between:
- More ΔV for Earth orbit raising → less propellant for lunar operations
- Less ΔV for Earth orbit raising → more propellant reserve → greater mission flexibility

This would teach the fundamental constraint: **Total propellant is fixed (1,696 kg); allocation is a design choice.**
