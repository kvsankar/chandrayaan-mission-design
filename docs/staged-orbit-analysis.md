# Staged Orbit Raising Analysis: Why Chandrayaan Missions Don't Use Direct Transfer

**Date:** January 2026
**Based on:** Chandrayaan-2 (2020) and Chandrayaan-3 (2024) mission papers

---

## Executive Summary

The current Mission Design Wizard assumes a **direct transfer from a 180×180 km circular orbit**, but **real Chandrayaan missions use staged orbit raising from a GTO-like injection orbit**. This document explains why staged orbits are necessary and how the wizard should be enhanced.

## The Problem: Current Wizard Assumptions

### What the Wizard Currently Assumes

1. **Starting orbit**: 180 × 180 km circular Low Earth Orbit (LEO)
2. **Single TLI burn**: One large burn to achieve trans-lunar trajectory
3. **Spacecraft capability**: Craft can deliver all required ΔV in one maneuver
4. **Launch vehicle**: Delivers to circular parking orbit

### Reality: What Actually Happens

1. **Starting orbit**: **170 × 36,500 km** highly elliptical GTO (Geostationary Transfer Orbit)
2. **Multiple burns**: **5-6 staged burns** progressively raising apogee
3. **Staged ΔV delivery**: Total ΔV split across multiple maneuvers
4. **Launch vehicle**: LVM3 delivers to elliptical parking orbit only

---

## Why Staged Orbit Raising is Necessary

### 1. Launch Vehicle Limitations

**From Chandrayaan-3 paper (Section 15.1):**

> "Direct lunar injection would drastically reduce payload mass. LVM3 + 170×36,500 km EPO allows 3,895 kg spacecraft mass."

**Key Constraints:**
- **LVM3 third stage cannot deliver enough energy** for direct lunar transfer
- **Payload mass trade-off**: Higher injection orbit = lower payload capacity
- **Optimal balance**: GTO injection (170 × 36,500 km) maximizes payload while minimizing spacecraft ΔV requirement
- **Fixed AOP constraint**: LVM3 can only produce AOP ≈ **178°** at injection (cannot be changed)

**Implication:** The launch vehicle puts you in an elliptical orbit, not a circular one. You must work with what you get.

---

### 2. Spacecraft Engine Limitations

**Engine Specifications (Chandrayaan-3):**
- Main engine: **440 N** bipropellant (MMH/MON3)
- AOCS thrusters: 8 × 22 N (for attitude control only)
- Heritage design: Proven reliability over high-thrust alternatives

**Why 440N Engine Can't Do Single Burn:**

#### A. Burn Arc Losses
A single large ΔV burn would take **excessive time**, causing:
- **Gravity losses**: Engine thrust fights gravity for longer duration
- **Cosine losses**: Thrust vector not perfectly aligned with desired velocity change throughout burn
- **Altitude losses**: Spacecraft descends significantly during long burns at perigee

**Example calculation:**
- Required TLI ΔV from 180 km circular: ~3,150 m/s
- Single burn at 440N with 2,145 kg spacecraft: **~2,500 seconds = 42 minutes**
- During 42 minutes near perigee, gravity and trajectory curvature would cause **massive losses**
- Actual ΔV requirement would exceed propellant budget

#### B. Propellant Budget
**Chandrayaan-3 total propellant mass: 1,696 kg**

**Phase breakdown:**
- Earth-bound maneuvers: **787 kg** (6 burns)
- Moon-bound maneuvers: **749 kg** (6 burns)
- Reserves and contingency: **160 kg**

**Why staged approach:**
- **Smaller burns = higher efficiency**: Shorter burn times reduce gravity losses
- **Optimized burn locations**: Burns at perigee (for raising apogee) and apogee (for raising perigee)
- **Ground station visibility**: Each burn can be monitored and verified

---

### 3. Operational Constraints

#### A. Ground Station Visibility
**Requirement:** Ground stations must observe critical burns for:
- Real-time telemetry monitoring
- Burn cutoff commands if anomalies detected
- Post-burn state vector verification

**Staged approach allows:**
- Scheduling burns when IDSN (Indian Deep Space Network) has visibility
- Multiple opportunities to verify trajectory
- Time to analyze data between burns

#### B. Contingency Planning
**From Chandrayaan-3 paper (Section 15.1):**

> "Five Earth-bound + five lunar-bound burns planned for burn arc loss management, ground station visibility, and contingency scenarios."

**Benefits:**
- If one burn underperforms, can compensate in next burn
- Can skip or delay burns if spacecraft anomaly detected
- Provides decision points throughout mission

---

## Actual Mission Profiles

### Chandrayaan-3 Earth-Bound Sequence

| Maneuver | Burn Date (2023) | Location | ΔV (m/s) | Cumulative ΔV | Post-Burn Orbit (km) |
|----------|-----------------|----------|----------|---------------|----------------------|
| **Injection** | Jul 14, 09:21 | — | — | — | 173 × 36,438 |
| **EBN-1** | Jul 15, 06:35 | Perigee 3 | **77.84** | 77.84 | 173 × 41,790 |
| **EBA-1** | Jul 16, 13:47 | Apogee 6 | **4.82** | 82.66 | 226 × 41,603 |
| **EBN-2** | Jul 18, 09:17 | Perigee 9 | **109.21** | 191.87 | 227 × 51,567 |
| **EBN-3** | Jul 20, 09:07 | Perigee 12 | **144.58** | 336.45 | 226 × 71,538 |
| **EBN-4** | Jul 25, 08:47 | Perigee 17 | **185.02** | 521.47 | 236 × 127,601 |
| **TLI** | Jul 31, 18:32 | Perigee 20 | **172.60** | **694.07** | 288 × 369,377 |

**Total Earth-bound ΔV: 695 m/s across 6 burns over 17 days**

**Key observations:**
- **Gradual progression**: Each burn raises apogee progressively
- **Burn spacing**: 2-5 days between burns (allows trajectory verification)
- **Increasing ΔV**: Later burns require more ΔV as orbital energy increases
- **EBA burn**: Small apogee burn (4.82 m/s) raised perigee to avoid atmospheric drag

---

### Chandrayaan-2 Earth-Bound Sequence

| Maneuver | Burn Date (2019) | Location | ΔV (m/s) | Cumulative ΔV | Post-Burn Orbit (km) |
|----------|-----------------|----------|----------|---------------|----------------------|
| **Injection** | Jul 22, 09:29 | — | — | — | 170 × 45,438 |
| **EBA-1** | Jul 24, 09:22 | Apogee 4 | **5.1** | 5.1 | 232 × 45,161 |
| **EBN-1** | Jul 25, 19:38 | Perigee 7 | **99.4** | 104.5 | 257 × 54,733 |
| **EBN-2** | Jul 29, 09:42 | Perigee 12 | **115.1** | 219.6 | 268 × 71,554 |
| **EBN-3** | Aug 2, 09:58 | Perigee 16 | **77.5** | 297.1 | 278 × 89,037 |
| **EBN-4** | Aug 6, 09:35 | Perigee 19 | **130.3** | 427.4 | 284 × 142,276 |
| **TLI** | Aug 13, 20:51 | Perigee 22 | **158.3** | **585.7** | 336 × 418,223 |

**Total Earth-bound ΔV: 586 m/s across 6 burns over 22 days**

**Differences from CY3:**
- CY2 had **higher injection apogee** (45,438 km vs 36,438 km) due to launch vehicle over-performance
- Required **less total ΔV** due to better injection
- Extended orbiter mission life from 1 year to ~2 years (propellant savings)

---

## Comparison: Direct vs. Staged Transfer

### Direct Transfer (Not Used)

**Hypothetical single-burn approach:**
```
Starting orbit: 180 × 180 km circular
Single TLI burn: ~3,150 m/s (estimated)
Burn duration: ~42 minutes at 440N
Gravity losses: >500 m/s (excessive)
Total ΔV required: >3,650 m/s
Propellant needed: ~1,900 kg
Result: EXCEEDS PROPELLANT BUDGET
```

### Staged Transfer (Actual Approach)

**Multi-burn approach:**
```
Starting orbit: 170 × 36,500 km elliptical
6 burns over 17 days: 695 m/s total
Individual burn durations: 42s to 1,440s (0.7-24 min)
Gravity losses: Minimized (<100 m/s)
Propellant used: 787 kg
Result: WITHIN BUDGET with 160 kg margin
```

**Efficiency gain: ~2,955 m/s saved (~4.3× improvement)**

---

## Burn Strategy: Perigee vs. Apogee

### Perigee Burns (EBN - Earth-Bound at Node/Perigee)

**Purpose:** Raise apogee
**Rationale:** Oberth effect - changes to velocity at perigee have maximum effect on apogee
**Typical ΔV:** 77-185 m/s
**Used for:** Progressive apogee raising toward lunar distance

### Apogee Burns (EBA - Earth-Bound at Apogee)

**Purpose:** Raise perigee
**Rationale:** Prevent atmospheric drag, circularize orbit slightly
**Typical ΔV:** 4-5 m/s (small burns)
**Used for:** Maintaining perigee above safe altitude (>200 km)

### Why This Pattern?

**Hohmann-like transfer optimization:**
1. **Perigee burn** increases orbital energy most efficiently (Oberth effect)
2. **Apogee burn** lifts perigee to prevent decay
3. **Repeat** until apogee reaches lunar distance
4. **Final TLI** at perigee sends spacecraft on trans-lunar trajectory

---

## What the Wizard Needs

### Current Gap

The wizard currently:
- ✗ Assumes 180×180 km circular starting orbit
- ✗ Assumes single TLI burn
- ✗ Doesn't account for launch vehicle constraints
- ✗ Doesn't allow staged ΔV planning
- ✗ Doesn't show intermediate orbits

### Required Enhancements

The wizard should:
1. ✓ **Start from realistic GTO injection**: 170 × 36,500 km (not 180×180)
2. ✓ **Allow multi-burn planning**: Let user define 4-6 orbit raising burns
3. ✓ **Show burn strategy**: Indicate perigee vs apogee burns
4. ✓ **Display cumulative ΔV**: Track total ΔV across all burns
5. ✓ **Visualize intermediate orbits**: Show orbit progression after each burn
6. ✓ **Calculate burn timing**: Show when each burn occurs (perigee/apogee number)
7. ✓ **Propellant budget tracking**: Show remaining propellant after each burn
8. ✓ **Compare to actual missions**: Overlay CY2/CY3 actual burn sequences

---

## Proposed Wizard UX Flow

### Step 4A: Orbit Raising Strategy (NEW STEP)

**After LOI date selection, before final review:**

#### Interface Elements

**1. Starting Orbit Display**
```
Launch Vehicle Injection:
  Perigee: 170 km
  Apogee: 36,500 km
  Inclination: 21.5°
  AOP: 178° (fixed by LVM3)
```

**2. Target Orbit Display**
```
Required for TLI:
  Perigee: ~280 km
  Apogee: ~370,000 km
  Total ΔV needed: ~695 m/s
```

**3. Burn Planning Interface**

**Option A: Preset Strategies (Recommended for beginners)**
- "Chandrayaan-3 Strategy" (6 burns, 695 m/s)
- "Chandrayaan-2 Strategy" (6 burns, 586 m/s)
- "Conservative (8 burns)" - more burns, same total ΔV
- "Aggressive (4 burns)" - fewer burns, higher individual ΔV

**Option B: Custom Strategy (Advanced)**
```
Burn #1: [Perigee ▼] ΔV: [77.84] m/s → Orbit: 173 × 41,790 km
Burn #2: [Apogee ▼]  ΔV: [4.82]  m/s → Orbit: 226 × 41,603 km
Burn #3: [Perigee ▼] ΔV: [___]   m/s → Orbit: ___ × ___ km
...
[+ Add Burn] [- Remove Burn]

Remaining ΔV: ___ m/s
Propellant used: ___ / 1,696 kg
```

**4. Timeline Visualization**

```
Day 0  ──●── Day 1 ──●── Day 3 ──●── Day 6 ──●── Day 12 ──●── Day 17 ──●── TLI
       Launch   EBN-1   EBA-1   EBN-2    EBN-3     EBN-4     +14d → LOI
```

**5. 3D Orbit Visualization**
- Show all intermediate orbits overlaid
- Animate orbit progression
- Highlight current burn location (perigee/apogee markers)

---

## Implementation Recommendations

### Phase 1: Preset Strategies (Easier)

1. Add new wizard step: "Orbit Raising Strategy"
2. Provide 2-3 preset burn sequences based on actual missions
3. Show timeline and cumulative ΔV
4. Visualize orbit progression
5. Link to final LOI calculation

### Phase 2: Custom Burn Planning (Advanced)

1. Allow users to add/remove burns
2. Automatically calculate resulting orbits using vis-viva equation
3. Validate total ΔV against propellant budget
4. Warn if burns too large (>200 m/s → excessive losses)
5. Suggest optimal burn locations (perigee for apogee-raising)

### Phase 3: Optimization

1. Optimize burn sequence for minimum ΔV
2. Consider ground station visibility windows
3. Account for gravity losses in burn duration
4. Calculate actual propellant consumption (Tsiolkovsky equation)

---

## Key Equations

### Vis-Viva Equation (Orbital Velocity)
```
v = √(μ × (2/r - 1/a))
```
Where:
- v = orbital velocity at distance r
- μ = Earth's gravitational parameter (398,600 km³/s²)
- r = distance from Earth center
- a = semi-major axis

### ΔV for Apogee Change (at Perigee)
```
Δv = √(μ × (2/rₚ - 1/a_new)) - √(μ × (2/rₚ - 1/a_old))
```

### Tsiolkovsky Rocket Equation (Propellant Mass)
```
Δm = m₀ × (1 - e^(-Δv / (Isp × g₀)))
```
Where:
- Isp = 303s (specific impulse for MMH/MON3)
- g₀ = 9.81 m/s²

---

## Educational Value

### What Users Learn from Staged Orbits

1. **Real mission constraints**: Launch vehicles have limits
2. **Oberth effect**: Where you burn matters as much as how much
3. **Propellant budgeting**: Every m/s counts
4. **Mission timeline**: Space missions take time and planning
5. **Contingency thinking**: Multiple burns provide flexibility
6. **Trade-offs**: More burns = more complexity but less risk

---

## Conclusion

The Mission Design Wizard currently presents an **oversimplified** view of lunar transfers. Real missions use **staged orbit raising** due to:

1. ✓ **Launch vehicle limitations** - Can't reach circular orbit at high altitude
2. ✓ **Spacecraft engine limitations** - Can't deliver all ΔV in single burn
3. ✓ **Propellant budget constraints** - Must minimize gravity losses
4. ✓ **Operational requirements** - Ground station visibility, contingency planning

**Recommendation:** Add a new wizard step allowing users to:
- Understand why staged orbits are necessary
- Plan burn sequences (preset or custom)
- See realistic mission timelines
- Learn orbital mechanics through goal-oriented design

This enhancement would make the wizard **educationally accurate** and **representative of actual ISRO mission design**.

---

## References

1. Mathavaraj & Negi (2024). "Chandrayaan-3 Trajectory Design: Injection to Successful Landing". *Journal of Spacecraft and Rockets*, DOI: 10.2514/1.A35980

2. Mathavaraj, Negi & Vaibhav (2020). "ISRO's Unprecedented Journey to the Moon". *Acta Astronautica* 177, 286-298, DOI: 10.1016/j.actaastro.2020.07.046
