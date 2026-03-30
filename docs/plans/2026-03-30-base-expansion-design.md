# Base Expansion System Design

## Overview
Player clicks map to place buildings that provide strategic bonuses.

## Building Types

| Building | Cost | Maintenance/hr | Effect |
|----------|------|----------------|--------|
| Hangar | 15,000Cr | 200Cr | +2 max aircraft |
| Long-Range Radar | 25,000Cr | 800Cr | +200km detection |
| SAM Battery | 40,000Cr | 1,500Cr | Auto-engage threats |
| Fuel Depot | 10,000Cr | 100Cr | +50,000L storage |
| Secondary Runway | 50,000Cr | 500Cr | Parallel takeoffs |

## Implementation

### Data Model
```typescript
interface Building {
  id: string;
  type: BuildingType;
  position: Coordinates;
  builtAt: number;
}

enum BuildingType {
  HANGAR = "HANGAR",
  RADAR = "RADAR",
  SAM_BATTERY = "SAM_BATTERY",
  FUEL_DEPOT = "FUEL_DEPOT",
  RUNWAY = "RUNWAY"
}
```

### UI/UX
1. Add "Build Mode" button in HUD
2. Show building menu with costs
3. Player selects building type
4. Click on map to place (show ghost preview)
5. Confirm placement, deduct credits

### Effects
- Each tick: deduct maintenance costs from base.credits
- Hangar: increase aircraft capacity limit
- Radar: add to friendlyBase.radarRange
- SAM: auto-deploy when enemies detected
- Fuel: add to friendlyBase.fuelStock capacity
- Runway: enable multiple takeoffs
