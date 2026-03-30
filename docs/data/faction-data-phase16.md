# Phase 16: Faction Data Registry & AI Personalities

## Raw Faction Data

This file will become `src/plugins/FactionRegistry.ts` (Phase 15) → extended in Phase 16

```typescript
// src/data/factionData.ts

export const FACTION_SPECS_PHASE16 = {
  'EC': {
    id: 'EC',
    name: 'Euro-Consolidada',
    shortName: 'EC',
    color: '#3b82f6', // Blue
    marketProfile: 'Conservative, High-Margin',
    preferredAircraft: ['Gripen', 'Eurofighter'],
    loreFlavorText: '"Order through Superior Engineering"',
    stockVolatility: {
      lossImpact: -0.02, // -2% per loss
      victoryImpact: +0.03, // +3% per victory
    },
  },
  'BNS': {
    id: 'BNS',
    name: 'Bloco Neo-Soviético',
    shortName: 'BNS',
    color: '#ef4444', // Red
    marketProfile: 'Volume Player, Accepts Losses',
    preferredAircraft: ['MiG-29', 'Su-27'],
    loreFlavorText: '"Physics Solves All Problems"',
    stockVolatility: {
      lossImpact: -0.08, // -8% per loss (VOLATILE)
      victoryImpact: +0.02,
    },
  },
  'PAN': {
    id: 'PAN',
    name: 'Pacífico-Aegis',
    shortName: 'PAN',
    color: '#06b6d4', // Cyan
    marketProfile: 'Ultra-Long-Range Specialist',
    preferredAircraft: ['F-15EX', 'F-35'],
    loreFlavorText: '"See First, Kill First"',
    stockVolatility: {
      lossImpact: -0.05,
      victoryImpact: +0.04,
    },
  },
  'LA': {
    id: 'LA',
    name: 'Liga dos Andes',
    shortName: 'LA',
    color: '#8b5cf6', // Purple
    marketProfile: 'Terrain Master',
    preferredAircraft: ['A-10', 'Super Tucano'],
    loreFlavorText: '"The Mountains Are Ours"',
    stockVolatility: {
      lossImpact: -0.06,
      victoryImpact: +0.02,
    },
  },
  'SP': {
    id: 'SP',
    name: 'Sindicato Petrolífero',
    shortName: 'SP',
    color: '#f59e0b', // Amber
    marketProfile: 'Endurance Specialist',
    preferredAircraft: ['Su-30', 'F-15E'],
    loreFlavorText: '"Fuel Is Our Superweapon"',
    stockVolatility: {
      lossImpact: -0.03,
      victoryImpact: +0.02,
    },
  },
  'CE': {
    id: 'CE',
    name: 'Coletivo Escandinavo',
    shortName: 'CE',
    color: '#14b8a6', // Teal
    marketProfile: 'EW Specialist',
    preferredAircraft: ['Gripen-E', 'GlobalEye'],
    loreFlavorText: '"The Invisible War"',
    stockVolatility: {
      lossImpact: -0.04,
      victoryImpact: +0.03,
    },
  },
  'AD': {
    id: 'AD',
    name: 'Aliança do Dragão',
    shortName: 'AD',
    color: '#ec4899', // Pink
    marketProfile: 'Zerg Rush',
    preferredAircraft: ['JF-17', 'PL-15'],
    loreFlavorText: '"Quantity Has Quality of Its Own"',
    stockVolatility: {
      lossImpact: -0.15, // SUPER VOLATILE
      victoryImpact: +0.05,
    },
  },
  'UAT': {
    id: 'UAT',
    name: 'União Africana Tech',
    shortName: 'UAT',
    color: '#f97316', // Orange
    marketProfile: 'Drone Swarms',
    preferredAircraft: ['MQ-9 Reaper', 'Loitering Munitions'],
    loreFlavorText: '"The Future Is Autonomous"',
    stockVolatility: {
      lossImpact: -0.10,
      victoryImpact: +0.03,
    },
  },
  'MV': {
    id: 'MV',
    name: 'Mercenários Void',
    shortName: 'MV',
    color: '#64748b', // Slate
    marketProfile: 'No Fixed Base',
    preferredAircraft: ['Rafale', 'F-18'],
    loreFlavorText: '"Always Hire Mercenaries, Never Trust Them"',
    stockVolatility: {
      lossImpact: -0.07,
      victoryImpact: +0.04,
    },
  },
  'CG': {
    id: 'CG',
    name: 'Conselho de Genebra',
    shortName: 'CG',
    color: '#10b981', // Green
    marketProfile: 'Neutral Enforcer',
    preferredAircraft: ['Mirage 2000'],
    loreFlavorText: '"The Rules Must Be Followed"',
    stockVolatility: {
      lossImpact: -0.02,
      victoryImpact: +0.01,
    },
  },
  'ZS': {
    id: 'ZS',
    name: 'Zelotes do Solo',
    shortName: 'ZS',
    color: '#991b1b', // Dark Red
    marketProfile: 'Anti-Low-Alt Extremists',
    preferredAircraft: ['SAM Batteries', 'MANPADS'],
    loreFlavorText: '"The Sky Below 500m Is Sacred"',
    stockVolatility: {
      lossImpact: 0, // Static price
      victoryImpact: 0,
    },
  },
  'HM': {
    id: 'HM',
    name: 'Hanseática Moderna',
    shortName: 'HM',
    color: '#0ea5e9', // Sky
    marketProfile: 'Commercial Escort',
    preferredAircraft: ['C-130', 'C-17'],
    loreFlavorText: '"Whoever Pays Gets Safe Passage"',
    stockVolatility: {
      lossImpact: -0.01,
      victoryImpact: +0.02,
    },
  },
  'IF': {
    id: 'IF',
    name: 'Indo-Fênix',
    shortName: 'IF',
    color: '#dc2626', // Red
    marketProfile: 'Dogfight Specialists',
    preferredAircraft: ['Su-30MKI', 'Tejas'],
    loreFlavorText: '"Victory Through Maneuver"',
    stockVolatility: {
      lossImpact: -0.08,
      victoryImpact: +0.04,
    },
  },
  'CS': {
    id: 'CS',
    name: 'Cartel de Satélites',
    shortName: 'CS',
    color: '#7c3aed', // Violet
    marketProfile: 'ISR Monopoly',
    preferredAircraft: ['E-3 AWACS', 'JSTAR'],
    loreFlavorText: '"Information Is Cheaper Than Missiles"',
    stockVolatility: {
      lossImpact: -0.02,
      victoryImpact: +0.02,
    },
  },
  'AV': {
    id: 'AV',
    name: 'Aether-Vanguard',
    shortName: 'AV',
    color: '#22c55e', // Green (player)
    marketProfile: 'Balanced, Bureaucratic',
    preferredAircraft: ['F-16C', 'F-15C'],
    loreFlavorText: '"We Fire When We\'re Ready"',
    stockVolatility: {
      lossImpact: -0.04,
      victoryImpact: +0.03,
    },
  },
};

export const FACTION_AI_PERSONALITIES = {
  'EC': {
    factionId: 'EC',
    attackAggressiveness: 40,
    evasionCaution: 80,
    terrainPreference: ['OCEAN_INTERNATIONAL', 'DESERT_BADLANDS'],
    communicationStyle: 'FORMAL' as const,
    riskTolerance: 20,
    preferredEjectionZones: ['OCEAN', 'DESERT'],
  },
  'BNS': {
    factionId: 'BNS',
    attackAggressiveness: 85,
    evasionCaution: 30,
    terrainPreference: ['MOUNTAIN_RANGE', 'FOREST_RESERVE'],
    communicationStyle: 'CHATTER' as const,
    riskTolerance: 70,
    preferredEjectionZones: ['FOREST', 'MOUNTAIN'],
  },
  'PAN': {
    factionId: 'PAN',
    attackAggressiveness: 65,
    evasionCaution: 70,
    terrainPreference: ['OCEAN_INTERNATIONAL'],
    communicationStyle: 'FORMAL' as const,
    riskTolerance: 50,
    preferredEjectionZones: ['OCEAN', 'DESERT'],
  },
  'LA': {
    factionId: 'LA',
    attackAggressiveness: 55,
    evasionCaution: 60,
    terrainPreference: ['MOUNTAIN_RANGE'],
    communicationStyle: 'FORMAL' as const,
    riskTolerance: 40,
    preferredEjectionZones: ['MOUNTAIN', 'FOREST'],
  },
  'SP': {
    factionId: 'SP',
    attackAggressiveness: 50,
    evasionCaution: 50,
    terrainPreference: ['OCEAN_INTERNATIONAL', 'DESERT_BADLANDS'],
    communicationStyle: 'SILENT' as const,
    riskTolerance: 45,
    preferredEjectionZones: ['OCEAN', 'DESERT'],
  },
  'CE': {
    factionId: 'CE',
    attackAggressiveness: 35,
    evasionCaution: 85,
    terrainPreference: ['FOREST_RESERVE'],
    communicationStyle: 'SILENT' as const,
    riskTolerance: 30,
    preferredEjectionZones: ['FOREST', 'OCEAN'],
  },
  'AD': {
    factionId: 'AD',
    attackAggressiveness: 95,
    evasionCaution: 20,
    terrainPreference: ['URBAN_METROPOLIS', 'URBAN_SUBURBAN'],
    communicationStyle: 'CHATTER' as const,
    riskTolerance: 90,
    preferredEjectionZones: ['ANY'],
  },
  'UAT': {
    factionId: 'UAT',
    attackAggressiveness: 80,
    evasionCaution: 25,
    terrainPreference: ['DESERT_BADLANDS'],
    communicationStyle: 'ANONYMOUS' as const,
    riskTolerance: 75,
    preferredEjectionZones: ['DESERT', 'OCEAN'],
  },
  'MV': {
    factionId: 'MV',
    attackAggressiveness: 70,
    evasionCaution: 45,
    terrainPreference: ['OCEAN_INTERNATIONAL'],
    communicationStyle: 'ANONYMOUS' as const,
    riskTolerance: 60,
    preferredEjectionZones: ['OCEAN', 'DESERT'],
  },
  'CG': {
    factionId: 'CG',
    attackAggressiveness: 20,
    evasionCaution: 90,
    terrainPreference: ['OCEAN_INTERNATIONAL'],
    communicationStyle: 'FORMAL' as const,
    riskTolerance: 10,
    preferredEjectionZones: ['OCEAN'],
  },
  'ZS': {
    factionId: 'ZS',
    attackAggressiveness: 50,
    evasionCaution: 0,
    terrainPreference: ['ANY'],
    communicationStyle: 'ANONYMOUS' as const,
    riskTolerance: 100,
    preferredEjectionZones: ['NONE'],
  },
  'HM': {
    factionId: 'HM',
    attackAggressiveness: 25,
    evasionCaution: 75,
    terrainPreference: ['OCEAN_INTERNATIONAL'],
    communicationStyle: 'FORMAL' as const,
    riskTolerance: 15,
    preferredEjectionZones: ['OCEAN', 'DESERT'],
  },
  'IF': {
    factionId: 'IF',
    attackAggressiveness: 90,
    evasionCaution: 35,
    terrainPreference: ['OCEAN_INTERNATIONAL', 'DESERT_BADLANDS'],
    communicationStyle: 'CHATTER' as const,
    riskTolerance: 65,
    preferredEjectionZones: ['OCEAN', 'DESERT'],
  },
  'CS': {
    factionId: 'CS',
    attackAggressiveness: 30,
    evasionCaution: 85,
    terrainPreference: ['OCEAN_INTERNATIONAL'],
    communicationStyle: 'SILENT' as const,
    riskTolerance: 20,
    preferredEjectionZones: ['OCEAN'],
  },
  'AV': {
    factionId: 'AV',
    attackAggressiveness: 50,
    evasionCaution: 50,
    terrainPreference: ['DESERT_BADLANDS', 'OCEAN_INTERNATIONAL'],
    communicationStyle: 'FORMAL' as const,
    riskTolerance: 40,
    preferredEjectionZones: ['OCEAN', 'DESERT'],
  },
};

export const TERRAIN_DAMAGE_MULTIPLIERS = {
  'URBAN_METROPOLIS': { multiplier: 15.0, pilotSurvival: 0.10, costDescription: 'Max' },
  'URBAN_SUBURBAN': { multiplier: 8.0, pilotSurvival: 0.20, costDescription: 'High' },
  'RURAL_AGRICULTURAL': { multiplier: 3.5, pilotSurvival: 0.40, costDescription: 'Medium' },
  'FOREST_RESERVE': { multiplier: 5.0, pilotSurvival: 0.30, costDescription: 'High' },
  'DESERT_BADLANDS': { multiplier: 0.5, pilotSurvival: 0.65, costDescription: 'Low' },
  'OCEAN_INTERNATIONAL': { multiplier: 0.0, pilotSurvival: 0.50, costDescription: 'Zero' },
  'MOUNTAIN_RANGE': { multiplier: 2.0, pilotSurvival: 0.35, costDescription: 'Medium' },
  'MILITARY_BASE_ENEMY': { multiplier: 0.2, pilotSurvival: 0.05, costDescription: 'Combat' },
  'MILITARY_BASE_FRIENDLY': { multiplier: 1.0, pilotSurvival: 0.80, costDescription: 'Protocol' },
};
```

---

## Notes for Implementation

1. **Faction Colors**: Tailwind colors for UI rendering
2. **Stock Volatility**: How much a single loss/win affects stock price
3. **AI Personalities**: Used to weight decision-making in AIDecisionSystem
4. **Terrain Multipliers**: Applied to crash damage calculation
5. **Preferred Ejection Zones**: AI pathfinds toward these terrains when damaged

This data file is **configuration-driven** - changing a faction's personality doesn't require code changes, just data updates.
