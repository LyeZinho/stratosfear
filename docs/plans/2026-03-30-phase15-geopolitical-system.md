# Phase 15: Geopolitical Faction System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a complete geopolitical faction system with passive objectives, AI autonomy, diplomacy mechanics, news generation, and integrated War Room dashboard.

**Architecture:** Modular registry pattern (extending Phases 9-14) with 6 systems (FactionRegistry, PassiveObjectiveSystem, DiplomacySystem, AIDecisionSystem, NewsGeneratorSystem, WarRoomStore) integrated into SimulationEngine via a 6-phase tick loop. AI has identical action capabilities as player. All components follow existing codebase patterns.

**Tech Stack:** TypeScript, Zustand (store), EventBus (integration), React + Tailwind (UI), Lucide icons

**Constraints:**
- AI must have identical action capabilities as player (symmetric design)
- Maintain modular registry pattern from Phases 9-14
- No worktrees or subagents (direct execution only)
- All components follow existing SimulationEngine patterns

---

## Task 1: Create Geopolitics Type System

**Files:**
- Create: `src/types/geopolitics.ts`

**Step 1: Write the type definitions file**

```typescript
// src/types/geopolitics.ts

/**
 * Faction specification - registry entry for faction definitions
 */
export interface FactionSpecification {
  id: string;
  name: string;
  allegiance: 'PLAYER' | 'BLUE' | 'RED' | 'NEUTRAL' | 'UNALIGNED';
  startingCredits: number;
  startingAircraft: string[]; // aircraft registry IDs
  homeBase: { x: number; y: number; radius: number };
  personality: {
    aggressiveness: number; // 0-100
    diplomaticPreference: number; // 0-100
    techLevel: 'LEGACY' | 'MODERN' | 'ADVANCED';
  };
  ideology: string; // for news bias
}

/**
 * Runtime faction state - live state during simulation
 */
export interface FactionState {
  id: string;
  specId: string; // reference to FactionSpecification
  credits: number;
  fuel: number;
  morale: number; // 0-100
  posture: 'DEFENSIVE' | 'AGGRESSIVE' | 'WARTIME' | 'DIPLOMATIC' | 'COLLAPSED';
  activeAircraft: string[]; // aircraft instance IDs
  activeObjectives: string[]; // passive objective IDs
  aiDecisionQueue: FactionAction[]; // pending AI actions
  lastTickTime: number;
}

/**
 * Bilateral relationship between two factions
 */
export interface FactionRelationship {
  factionAId: string;
  factionBId: string;
  trust: number; // 0-100 (trust level)
  fear: number; // 0-100 (perceived threat)
  alignment: number; // -100 to +100 (ideological alignment)
  incidentCount: number; // historical incidents
  lastIncident?: number; // timestamp
  treaty?: 'PEACE' | 'MILITARY_ALLIANCE' | 'TRADE' | 'MUTUAL_DEFENSE';
}

/**
 * AI faction action - decision to execute
 */
export interface FactionAction {
  id: string;
  factionId: string;
  type: 'LAUNCH_CAP' | 'LAUNCH_STRIKE' | 'LAUNCH_ELINT' | 'ESCORT_CIVILIAN' | 'ACTIVATE_DEFENSE' | 'DIPLOMATIC_OVERTURE';
  targetId?: string;
  priority: number; // 1-10
  timestamp: number;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
}

/**
 * Passive objective - revenue generation mission
 */
export interface PassiveObjective {
  id: string;
  factionId: string;
  type: 'CAP_PATROL' | 'ELINT_MISSION' | 'CIVILIAN_ESCORT' | 'SOVEREIGNTY_ZONE' | 'INTELLIGENCE_SALE' | 'RESOURCE_HARVEST';
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  location: { x: number; y: number; radius: number };
  assignedAircraft: string[]; // aircraft instance IDs
  revenuePerTick: number; // credits per simulation tick
  infrastructureMultiplier: number; // from friendly infrastructure
  startTime: number;
  estimatedCompletion: number;
  progress: number; // 0-100
}

/**
 * News article - faction-biased headline
 */
export interface NewsArticle {
  id: string;
  timestamp: number;
  factionId: string; // faction whose perspective this is
  category: 'MILITARY' | 'DIPLOMATIC' | 'ECONOMIC' | 'INCIDENT' | 'VICTORY' | 'SETBACK';
  headline: string;
  body: string;
  bias: 'PATRIOTIC' | 'NEUTRAL' | 'HOSTILE'; // how faction reports this event
  sourceEvent: string; // reference to simulation event that triggered this
  importance: number; // 1-10
}

/**
 * Technology level for faction capabilities
 */
export type TechLevel = 'LEGACY' | 'MODERN' | 'ADVANCED';

/**
 * Posture state machine
 */
export type FactionPosture = 'DEFENSIVE' | 'AGGRESSIVE' | 'WARTIME' | 'DIPLOMATIC' | 'COLLAPSED';

/**
 * Objective type with revenue baseline
 */
export interface ObjectiveTypeDefinition {
  type: PassiveObjective['type'];
  baseRevenue: number;
  infrastructureMultiplier: number;
  estimatedDuration: number; // ticks
  riskLevel: number; // 0-100
}
```

**Step 2: Run LSP diagnostics to verify types**

Run: `lsp_diagnostics "C:\Users\Pedro Jesus\Downloads\airstrike\src\types\geopolitics.ts"`

Expected: No errors (new file, proper TypeScript syntax)

**Step 3: Commit**

```bash
git add src/types/geopolitics.ts
git commit -m "feat(types): add geopolitics type system for Phase 15"
```

---

## Task 2: Create FactionRegistry

**Files:**
- Create: `src/plugins/FactionRegistry.ts`

**Step 1: Write the FactionRegistry class**

```typescript
// src/plugins/FactionRegistry.ts

import { RegistryBase } from './RegistryBase';
import { FactionSpecification, TechLevel } from '../types/geopolitics';

export class FactionRegistry extends RegistryBase<FactionSpecification> {
  constructor() {
    super('FactionRegistry');
    this.registerDefaultFactions();
  }

  private registerDefaultFactions(): void {
    // PLAYER faction
    this.register({
      id: 'PLAYER',
      name: 'Player Command',
      allegiance: 'PLAYER',
      startingCredits: 50000,
      startingAircraft: ['F-16C', 'F-15C', 'F-18E'],
      homeBase: { x: 512, y: 512, radius: 150 },
      personality: {
        aggressiveness: 50,
        diplomaticPreference: 50,
        techLevel: 'MODERN',
      },
      ideology: 'Democratic Alliance',
    });

    // BLUE_ALLIANCE
    this.register({
      id: 'BLUE_ALLIANCE',
      name: 'Blue Alliance Command',
      allegiance: 'BLUE',
      startingCredits: 35000,
      startingAircraft: ['F-16C', 'F-15C', 'JF-17'],
      homeBase: { x: 300, y: 300, radius: 120 },
      personality: {
        aggressiveness: 40,
        diplomaticPreference: 60,
        techLevel: 'MODERN',
      },
      ideology: 'Democratic Alliance',
    });

    // RED_STAR_EMPIRE
    this.register({
      id: 'RED_STAR_EMPIRE',
      name: 'Red Star Empire',
      allegiance: 'RED',
      startingCredits: 40000,
      startingAircraft: ['Su-27', 'MiG-29', 'Su-25'],
      homeBase: { x: 700, y: 700, radius: 150 },
      personality: {
        aggressiveness: 70,
        diplomaticPreference: 30,
        techLevel: 'MODERN',
      },
      ideology: 'Socialist Federation',
    });

    // IRON_GUARD_COALITION
    this.register({
      id: 'IRON_GUARD_COALITION',
      name: 'Iron Guard Coalition',
      allegiance: 'RED',
      startingCredits: 30000,
      startingAircraft: ['MiG-29', 'Su-25', 'JF-17'],
      homeBase: { x: 750, y: 250, radius: 100 },
      personality: {
        aggressiveness: 75,
        diplomaticPreference: 20,
        techLevel: 'LEGACY',
      },
      ideology: 'Nationalist State',
    });

    // GRAY_WOLVES
    this.register({
      id: 'GRAY_WOLVES',
      name: 'Gray Wolves Collective',
      allegiance: 'NEUTRAL',
      startingCredits: 20000,
      startingAircraft: ['JF-17', 'F-7'],
      homeBase: { x: 400, y: 700, radius: 80 },
      personality: {
        aggressiveness: 55,
        diplomaticPreference: 45,
        techLevel: 'LEGACY',
      },
      ideology: 'Pragmatic Survival',
    });
  }

  /**
   * Get faction by ID
   */
  getFaction(id: string): FactionSpecification | undefined {
    return this.get(id);
  }

  /**
   * Get all factions by allegiance
   */
  getFactionsByAllegiance(
    allegiance: FactionSpecification['allegiance']
  ): FactionSpecification[] {
    return this.getAll().filter((f) => f.allegiance === allegiance);
  }

  /**
   * Get all AI factions (non-player)
   */
  getAIFactions(): FactionSpecification[] {
    return this.getAll().filter((f) => f.id !== 'PLAYER');
  }
}

export const factionRegistry = new FactionRegistry();
```

**Step 2: Verify FactionRegistry compiles**

Run: `lsp_diagnostics "C:\Users\Pedro Jesus\Downloads\airstrike\src\plugins\FactionRegistry.ts"`

Expected: No errors (extends RegistryBase, proper TypeScript)

**Step 3: Commit**

```bash
git add src/plugins/FactionRegistry.ts
git commit -m "feat(registry): add FactionRegistry with 5 default factions"
```

---

## Task 3: Create PassiveObjectiveSystem

**Files:**
- Create: `src/systems/PassiveObjectiveSystem.ts`

**Step 1: Write PassiveObjectiveSystem**

```typescript
// src/systems/PassiveObjectiveSystem.ts

import { PassiveObjective, ObjectiveTypeDefinition, FactionState } from '../types/geopolitics';
import { nanoid } from 'nanoid';

export class PassiveObjectiveSystem {
  private objectiveDefinitions: Map<PassiveObjective['type'], ObjectiveTypeDefinition>;

  constructor() {
    this.objectiveDefinitions = new Map([
      [
        'CAP_PATROL',
        {
          type: 'CAP_PATROL',
          baseRevenue: 50,
          infrastructureMultiplier: 1.2,
          estimatedDuration: 300, // ticks
          riskLevel: 30,
        },
      ],
      [
        'ELINT_MISSION',
        {
          type: 'ELINT_MISSION',
          baseRevenue: 75,
          infrastructureMultiplier: 1.5,
          estimatedDuration: 250,
          riskLevel: 45,
        },
      ],
      [
        'CIVILIAN_ESCORT',
        {
          type: 'CIVILIAN_ESCORT',
          baseRevenue: 100,
          infrastructureMultiplier: 1.3,
          estimatedDuration: 200,
          riskLevel: 55,
        },
      ],
      [
        'SOVEREIGNTY_ZONE',
        {
          type: 'SOVEREIGNTY_ZONE',
          baseRevenue: 25,
          infrastructureMultiplier: 1.1,
          estimatedDuration: 500,
          riskLevel: 20,
        },
      ],
      [
        'INTELLIGENCE_SALE',
        {
          type: 'INTELLIGENCE_SALE',
          baseRevenue: 200,
          infrastructureMultiplier: 2.0,
          estimatedDuration: 400,
          riskLevel: 70,
        },
      ],
      [
        'RESOURCE_HARVEST',
        {
          type: 'RESOURCE_HARVEST',
          baseRevenue: 60,
          infrastructureMultiplier: 1.4,
          estimatedDuration: 350,
          riskLevel: 40,
        },
      ],
    ]);
  }

  /**
   * Create a new passive objective
   */
  createObjective(
    factionId: string,
    type: PassiveObjective['type'],
    location: { x: number; y: number; radius: number },
    assignedAircraft: string[] = []
  ): PassiveObjective {
    const def = this.objectiveDefinitions.get(type);
    if (!def) throw new Error(`Unknown objective type: ${type}`);

    return {
      id: nanoid(),
      factionId,
      type,
      status: 'ACTIVE',
      location,
      assignedAircraft,
      revenuePerTick: def.baseRevenue,
      infrastructureMultiplier: def.infrastructureMultiplier,
      startTime: Date.now(),
      estimatedCompletion: Date.now() + def.estimatedDuration * 100, // assume 100ms ticks
      progress: 0,
    };
  }

  /**
   * Calculate revenue for a faction's active objectives
   */
  calculateFactionRevenue(
    objectives: PassiveObjective[],
    infrastructureMultiplier: number = 1.0
  ): number {
    return objectives
      .filter((obj) => obj.status === 'ACTIVE')
      .reduce((total, obj) => {
        const baseRevenue = obj.revenuePerTick;
        const infraBonus = infrastructureMultiplier * obj.infrastructureMultiplier;
        return total + Math.floor(baseRevenue * infraBonus);
      }, 0);
  }

  /**
   * Update objective progress (called each tick)
   */
  updateObjectiveProgress(objective: PassiveObjective, deltaTime: number): void {
    if (objective.status !== 'ACTIVE') return;

    const elapsed = Date.now() - objective.startTime;
    const totalDuration = objective.estimatedCompletion - objective.startTime;
    objective.progress = Math.min(100, (elapsed / totalDuration) * 100);

    if (objective.progress >= 100) {
      objective.status = 'COMPLETED';
    }
  }

  /**
   * Check if objective is within faction's effective range
   */
  isObjectiveInRange(
    objective: PassiveObjective,
    factionHomeBase: { x: number; y: number; radius: number }
  ): boolean {
    const distance = Math.hypot(
      objective.location.x - factionHomeBase.x,
      objective.location.y - factionHomeBase.y
    );
    return distance <= factionHomeBase.radius + objective.location.radius + 200; // 200 unit buffer
  }

  /**
   * Get objective definition by type
   */
  getObjectiveDefinition(type: PassiveObjective['type']): ObjectiveTypeDefinition | undefined {
    return this.objectiveDefinitions.get(type);
  }

  /**
   * Get all objective types
   */
  getAllObjectiveTypes(): PassiveObjective['type'][] {
    return Array.from(this.objectiveDefinitions.keys());
  }
}

export const passiveObjectiveSystem = new PassiveObjectiveSystem();
```

**Step 2: Verify PassiveObjectiveSystem compiles**

Run: `lsp_diagnostics "C:\Users\Pedro Jesus\Downloads\airstrike\src\systems\PassiveObjectiveSystem.ts"`

Expected: No errors

**Step 3: Commit**

```bash
git add src/systems/PassiveObjectiveSystem.ts
git commit -m "feat(systems): add PassiveObjectiveSystem with revenue calculation"
```

---

## Task 4: Create DiplomacySystem

**Files:**
- Create: `src/systems/DiplomacySystem.ts`

**Step 1: Write DiplomacySystem**

```typescript
// src/systems/DiplomacySystem.ts

import { FactionRelationship, FactionState } from '../types/geopolitics';

export class DiplomacySystem {
  private relationships: Map<string, FactionRelationship> = new Map();

  /**
   * Initialize relationships between factions
   */
  initializeRelationships(factionIds: string[]): void {
    for (let i = 0; i < factionIds.length; i++) {
      for (let j = i + 1; j < factionIds.length; j++) {
        const key1 = `${factionIds[i]}-${factionIds[j]}`;
        const key2 = `${factionIds[j]}-${factionIds[i]}`;

        const rel: FactionRelationship = {
          factionAId: factionIds[i],
          factionBId: factionIds[j],
          trust: 50,
          fear: 50,
          alignment: 0,
          incidentCount: 0,
        };

        this.relationships.set(key1, rel);
        this.relationships.set(key2, rel);
      }
    }
  }

  /**
   * Get relationship between two factions
   */
  getRelationship(factionAId: string, factionBId: string): FactionRelationship | undefined {
    const key = `${factionAId}-${factionBId}`;
    return this.relationships.get(key);
  }

  /**
   * Record an incident between two factions
   */
  recordIncident(
    factionAId: string,
    factionBId: string,
    severity: number // 1-100
  ): void {
    const rel = this.getRelationship(factionAId, factionBId);
    if (!rel) return;

    rel.incidentCount++;
    rel.lastIncident = Date.now();

    // Incidents increase fear, decrease trust
    rel.fear = Math.min(100, rel.fear + severity * 0.5);
    rel.trust = Math.max(0, rel.trust - severity * 0.3);

    // Alignment degradation with hostile incidents
    if (severity > 50) {
      rel.alignment = Math.max(-100, rel.alignment - severity * 0.2);
    }
  }

  /**
   * Update trust through positive interaction
   */
  updateTrust(factionAId: string, factionBId: string, delta: number): void {
    const rel = this.getRelationship(factionAId, factionBId);
    if (!rel) return;

    rel.trust = Math.max(0, Math.min(100, rel.trust + delta));
  }

  /**
   * Update fear level
   */
  updateFear(factionAId: string, factionBId: string, delta: number): void {
    const rel = this.getRelationship(factionAId, factionBId);
    if (!rel) return;

    rel.fear = Math.max(0, Math.min(100, rel.fear + delta));
  }

  /**
   * Update ideological alignment
   */
  updateAlignment(factionAId: string, factionBId: string, delta: number): void {
    const rel = this.getRelationship(factionAId, factionBId);
    if (!rel) return;

    rel.alignment = Math.max(-100, Math.min(100, rel.alignment + delta));
  }

  /**
   * Establish treaty between factions
   */
  establishTreaty(
    factionAId: string,
    factionBId: string,
    type: 'PEACE' | 'MILITARY_ALLIANCE' | 'TRADE' | 'MUTUAL_DEFENSE'
  ): void {
    const rel = this.getRelationship(factionAId, factionBId);
    if (!rel) return;

    rel.treaty = type;

    // Treaties improve diplomatic metrics
    if (type === 'PEACE') {
      rel.fear = Math.max(0, rel.fear - 15);
    } else if (type === 'MILITARY_ALLIANCE') {
      rel.trust = Math.min(100, rel.trust + 20);
      rel.alignment = Math.min(100, rel.alignment + 10);
    } else if (type === 'TRADE') {
      rel.trust = Math.min(100, rel.trust + 10);
    }
  }

  /**
   * Get all relationships
   */
  getAllRelationships(): FactionRelationship[] {
    return Array.from(this.relationships.values()).filter(
      (rel, idx, arr) =>
        arr.findIndex((r) => r.factionAId === rel.factionBId && r.factionBId === rel.factionAId) === idx
    );
  }

  /**
   * Get relationship quality score (-100 to 100)
   */
  getRelationshipQuality(factionAId: string, factionBId: string): number {
    const rel = this.getRelationship(factionAId, factionBId);
    if (!rel) return 0;

    // Quality = trust - fear + alignment/2
    return rel.trust - rel.fear + rel.alignment * 0.5;
  }

  /**
   * Determine if factions are allies
   */
  areAllies(factionAId: string, factionBId: string): boolean {
    const quality = this.getRelationshipQuality(factionAId, factionBId);
    return quality > 30;
  }

  /**
   * Determine if factions are hostile
   */
  areHostile(factionAId: string, factionBId: string): boolean {
    const quality = this.getRelationshipQuality(factionAId, factionBId);
    return quality < -30;
  }
}

export const diplomacySystem = new DiplomacySystem();
```

**Step 2: Verify DiplomacySystem compiles**

Run: `lsp_diagnostics "C:\Users\Pedro Jesus\Downloads\airstrike\src\systems\DiplomacySystem.ts"`

Expected: No errors

**Step 3: Commit**

```bash
git add src/systems/DiplomacySystem.ts
git commit -m "feat(systems): add DiplomacySystem for faction relationship tracking"
```

---

## Task 5: Create AIDecisionSystem

**Files:**
- Create: `src/systems/AIDecisionSystem.ts`

**Step 1: Write AIDecisionSystem**

```typescript
// src/systems/AIDecisionSystem.ts

import { FactionAction, FactionSpecification, FactionState } from '../types/geopolitics';
import { nanoid } from 'nanoid';

export type BehaviorTreePosture = 'DEFENSIVE' | 'AGGRESSIVE' | 'WARTIME' | 'DIPLOMATIC' | 'COLLAPSED';

interface ActionScore {
  actionType: FactionAction['type'];
  score: number;
  confidence: number; // 0-1
}

export class AIDecisionSystem {
  /**
   * Determine AI posture based on faction state and threats
   */
  determineBehaviorPosture(
    factionState: FactionState,
    threatLevel: number, // 0-100
    allyCount: number,
    hostileCount: number
  ): BehaviorTreePosture {
    // Collapsed state
    if (factionState.morale < 20) return 'COLLAPSED';

    // Wartime: high threat, outnumbered, or low morale
    if (threatLevel > 70 && hostileCount > allyCount) return 'WARTIME';

    // Diplomatic: good morale, surrounded by allies
    if (factionState.morale > 75 && allyCount > hostileCount) return 'DIPLOMATIC';

    // Aggressive: moderate threat, resources available
    if (factionState.credits > 30000 && threatLevel < 50) return 'AGGRESSIVE';

    // Default: Defensive
    return 'DEFENSIVE';
  }

  /**
   * Score action based on faction state, posture, and resources
   */
  scoreAction(
    actionType: FactionAction['type'],
    posture: BehaviorTreePosture,
    factionState: FactionState,
    threatLevel: number
  ): ActionScore {
    let score = 50; // baseline 50
    let confidence = 0.5;

    // Posture-based scoring
    switch (posture) {
      case 'DEFENSIVE':
        if (actionType === 'ACTIVATE_DEFENSE') {
          score += 40;
          confidence = 0.9;
        } else if (actionType === 'LAUNCH_CAP') {
          score += 20;
          confidence = 0.7;
        } else if (actionType === 'DIPLOMATIC_OVERTURE') {
          score += 10;
          confidence = 0.4;
        }
        break;

      case 'AGGRESSIVE':
        if (actionType === 'LAUNCH_STRIKE') {
          score += 50;
          confidence = 0.85;
        } else if (actionType === 'LAUNCH_ELINT') {
          score += 30;
          confidence = 0.8;
        } else if (actionType === 'LAUNCH_CAP') {
          score += 15;
          confidence = 0.6;
        }
        break;

      case 'WARTIME':
        if (actionType === 'LAUNCH_STRIKE') {
          score += 60;
          confidence = 0.95;
        } else if (actionType === 'ACTIVATE_DEFENSE') {
          score += 35;
          confidence = 0.85;
        } else if (actionType === 'LAUNCH_CAP') {
          score += 25;
          confidence = 0.8;
        }
        break;

      case 'DIPLOMATIC':
        if (actionType === 'DIPLOMATIC_OVERTURE') {
          score += 50;
          confidence = 0.9;
        } else if (actionType === 'ESCORT_CIVILIAN') {
          score += 30;
          confidence = 0.75;
        } else if (actionType === 'LAUNCH_ELINT') {
          score += 10;
          confidence = 0.3;
        }
        break;

      case 'COLLAPSED':
        score = 0;
        confidence = 0;
        break;
    }

    // Resource constraints
    if (factionState.credits < 10000) {
      if (actionType === 'LAUNCH_STRIKE') score -= 20;
      if (actionType === 'LAUNCH_ELINT') score -= 15;
    }

    // Fuel constraints
    if (factionState.fuel < 1000) {
      if (actionType === 'LAUNCH_CAP') score -= 30;
      if (actionType === 'LAUNCH_STRIKE') score -= 40;
    }

    // Threat-based urgency
    if (threatLevel > 80) {
      if (actionType === 'ACTIVATE_DEFENSE') score += 30;
      if (actionType === 'LAUNCH_STRIKE') score += 20;
    }

    // Morale impact
    if (factionState.morale < 30) {
      score *= 0.7; // reduce scores when morale is low
    }

    return {
      actionType,
      score: Math.max(0, Math.min(100, score)),
      confidence: Math.max(0, Math.min(1, confidence)),
    };
  }

  /**
   * Generate next AI decision
   */
  generateDecision(
    factionState: FactionState,
    factionSpec: FactionSpecification,
    threatLevel: number,
    allyCount: number,
    hostileCount: number
  ): FactionAction | null {
    // Determine posture
    const posture = this.determineBehaviorPosture(factionState, threatLevel, allyCount, hostileCount);

    // Score all possible actions
    const actions: FactionAction['type'][] = [
      'LAUNCH_CAP',
      'LAUNCH_STRIKE',
      'LAUNCH_ELINT',
      'ESCORT_CIVILIAN',
      'ACTIVATE_DEFENSE',
      'DIPLOMATIC_OVERTURE',
    ];

    const scores = actions.map((actionType) =>
      this.scoreAction(actionType, posture, factionState, threatLevel)
    );

    // Find highest-scoring action
    const bestAction = scores.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    // Only execute if score and confidence are sufficient
    if (bestAction.score < 40 || bestAction.confidence < 0.3) {
      return null; // No valid action
    }

    return {
      id: nanoid(),
      factionId: factionState.id,
      type: bestAction.actionType,
      priority: Math.round(bestAction.score / 10),
      timestamp: Date.now(),
      status: 'PENDING',
    };
  }

  /**
   * Score all possible actions and return ranked list
   */
  rankActions(
    factionState: FactionState,
    factionSpec: FactionSpecification,
    threatLevel: number,
    allyCount: number,
    hostileCount: number
  ): ActionScore[] {
    const posture = this.determineBehaviorPosture(factionState, threatLevel, allyCount, hostileCount);
    const actions: FactionAction['type'][] = [
      'LAUNCH_CAP',
      'LAUNCH_STRIKE',
      'LAUNCH_ELINT',
      'ESCORT_CIVILIAN',
      'ACTIVATE_DEFENSE',
      'DIPLOMATIC_OVERTURE',
    ];

    return actions
      .map((actionType) => this.scoreAction(actionType, posture, factionState, threatLevel))
      .sort((a, b) => b.score - a.score);
  }
}

export const aiDecisionSystem = new AIDecisionSystem();
```

**Step 2: Verify AIDecisionSystem compiles**

Run: `lsp_diagnostics "C:\Users\Pedro Jesus\Downloads\airstrike\src\systems\AIDecisionSystem.ts"`

Expected: No errors

**Step 3: Commit**

```bash
git add src/systems/AIDecisionSystem.ts
git commit -m "feat(systems): add AIDecisionSystem with behavior tree postures and weighted scoring"
```

---

## Task 6: Create NewsGeneratorSystem

**Files:**
- Create: `src/systems/NewsGeneratorSystem.ts`

**Step 1: Write NewsGeneratorSystem**

```typescript
// src/systems/NewsGeneratorSystem.ts

import { NewsArticle, FactionState } from '../types/geopolitics';
import { nanoid } from 'nanoid';

interface NewsTemplate {
  category: NewsArticle['category'];
  templates: {
    PATRIOTIC: string[];
    NEUTRAL: string[];
    HOSTILE: string[];
  };
}

export class NewsGeneratorSystem {
  private templates: NewsTemplate[] = [
    {
      category: 'MILITARY',
      templates: {
        PATRIOTIC: [
          'Our forces successfully intercepted $TARGET',
          'Strategic bombing campaign against $TARGET yields results',
          'Air superiority maintained over $TARGET region',
        ],
        NEUTRAL: [
          'Military engagement reported in $TARGET region',
          'Aircraft encounter over $TARGET',
          'Air operations ongoing in $TARGET area',
        ],
        HOSTILE: [
          'Aggressive military expansion by $TARGET forces',
          '$TARGET escalates military posture',
          'Unauthorized incursion by $TARGET aircraft',
        ],
      },
    },
    {
      category: 'DIPLOMATIC',
      templates: {
        PATRIOTIC: [
          'Alliance strengthened through talks with $TARGET',
          'International support affirms our position over $TARGET',
          'Diplomatic victory: $TARGET recognizes our sovereignty',
        ],
        NEUTRAL: [
          'Diplomatic discussions between our forces and $TARGET',
          'International conference addresses $TARGET situation',
          'Negotiations ongoing with $TARGET',
        ],
        HOSTILE: [
          '$TARGET rejects peace talks',
          'Hostile rhetoric from $TARGET increases tensions',
          '$TARGET isolates itself from international community',
        ],
      },
    },
    {
      category: 'ECONOMIC',
      templates: {
        PATRIOTIC: [
          'Economic growth fueled by defense contracts',
          'Trade advantages secured from $TARGET',
          'Infrastructure spending boosts regional economy',
        ],
        NEUTRAL: [
          'Economic impact assessment for $TARGET region',
          'Trade discussions between regions',
          'Defense spending increases',
        ],
        HOSTILE: [
          'Economic sanctions imposed on $TARGET',
          '$TARGET economic decline threatens stability',
          'Resource competition with $TARGET intensifies',
        ],
      },
    },
    {
      category: 'INCIDENT',
      templates: {
        PATRIOTIC: [
          'Our defensive systems thwart $TARGET attack',
          'Enemy sabotage attempt prevented',
          'Heroic action averts $TARGET provocation',
        ],
        NEUTRAL: [
          'Incident reported in $TARGET zone',
          'Cross-border incident under investigation',
          '$TARGET incident under review',
        ],
        HOSTILE: [
          'We respond to unprovoked attack by $TARGET',
          'Our response to $TARGET aggression',
          'Retaliation against $TARGET violations',
        ],
      },
    },
    {
      category: 'VICTORY',
      templates: {
        PATRIOTIC: [
          'Triumph: Complete victory over $TARGET',
          'Enemy $TARGET forces routed',
          'Strategic victory advances our position',
        ],
        NEUTRAL: [
          'Battle outcome: decisive result',
          'Engagement with $TARGET resolved',
          'Military operation concludes',
        ],
        HOSTILE: [
          'Devastating loss: $TARGET forces overwhelmed',
          '$TARGET military collapse imminent',
          'Victory turns tide of conflict',
        ],
      },
    },
    {
      category: 'SETBACK',
      templates: {
        PATRIOTIC: [
          'Tactical withdrawal preserves forces',
          'Strategic repositioning in response to $TARGET',
          'Our forces regroup to counterattack',
        ],
        NEUTRAL: [
          'Military setback reported',
          '$TARGET engagement results in retreat',
          'Forces regrouping',
        ],
        HOSTILE: [
          'Crushing defeat inflicted on $TARGET',
          '$TARGET forces flee battlefield',
          '$TARGET military in disarray',
        ],
      },
    },
  ];

  /**
   * Generate news article for an event
   */
  generateArticle(
    factionId: string,
    factionName: string,
    category: NewsArticle['category'],
    targetName: string,
    bias: NewsArticle['bias'],
    sourceEvent: string
  ): NewsArticle {
    const template = this.templates.find((t) => t.category === category);
    if (!template) {
      throw new Error(`Unknown news category: ${category}`);
    }

    const templateList = template.templates[bias];
    const headline = templateList[Math.floor(Math.random() * templateList.length)].replace(
      '$TARGET',
      targetName
    );

    const importance = this.calculateImportance(category, bias);

    return {
      id: nanoid(),
      timestamp: Date.now(),
      factionId,
      category,
      headline,
      body: `Recent developments in the conflict involving ${factionName} and ${targetName}.`,
      bias,
      sourceEvent,
      importance,
    };
  }

  /**
   * Calculate news importance (1-10)
   */
  private calculateImportance(
    category: NewsArticle['category'],
    bias: NewsArticle['bias']
  ): number {
    const baseImportance: Record<NewsArticle['category'], number> = {
      MILITARY: 8,
      DIPLOMATIC: 6,
      ECONOMIC: 5,
      INCIDENT: 7,
      VICTORY: 10,
      SETBACK: 9,
    };

    let importance = baseImportance[category];

    // Victory and Setback are always high importance
    if (category === 'VICTORY' || category === 'SETBACK') {
      importance = 10;
    }

    // Apply bias modifier
    if (bias === 'PATRIOTIC') importance += 1;
    if (bias === 'HOSTILE') importance -= 1;

    return Math.max(1, Math.min(10, importance));
  }

  /**
   * Get bias based on faction relationship
   */
  determineBias(
    reportingFactionId: string,
    eventFactionId: string,
    relationshipQuality: number
  ): NewsArticle['bias'] {
    if (reportingFactionId === eventFactionId) return 'PATRIOTIC';
    if (relationshipQuality > 20) return 'NEUTRAL';
    if (relationshipQuality > -20) return 'NEUTRAL';
    return 'HOSTILE';
  }

  /**
   * Generate multiple article variants
   */
  generateArticleVariants(
    factionId: string,
    factionName: string,
    category: NewsArticle['category'],
    targetName: string,
    sourceEvent: string
  ): NewsArticle[] {
    return [
      this.generateArticle(factionId, factionName, category, targetName, 'PATRIOTIC', sourceEvent),
      this.generateArticle(factionId, factionName, category, targetName, 'NEUTRAL', sourceEvent),
      this.generateArticle(factionId, factionName, category, targetName, 'HOSTILE', sourceEvent),
    ];
  }
}

export const newsGeneratorSystem = new NewsGeneratorSystem();
```

**Step 2: Verify NewsGeneratorSystem compiles**

Run: `lsp_diagnostics "C:\Users\Pedro Jesus\Downloads\airstrike\src\systems\NewsGeneratorSystem.ts"`

Expected: No errors

**Step 3: Commit**

```bash
git add src/systems/NewsGeneratorSystem.ts
git commit -m "feat(systems): add NewsGeneratorSystem with faction-biased article generation"
```

---

## Task 7: Create WarRoomStore (Zustand)

**Files:**
- Create: `src/store/useWarRoomStore.ts`

**Step 1: Write WarRoomStore**

```typescript
// src/store/useWarRoomStore.ts

import { create } from 'zustand';
import { FactionState, FactionRelationship, PassiveObjective, NewsArticle, FactionAction } from '../types/geopolitics';

interface WarRoomStore {
  // State
  factions: Map<string, FactionState>;
  relationships: FactionRelationship[];
  objectives: PassiveObjective[];
  newsArticles: NewsArticle[];
  aiQueue: FactionAction[];
  selectedFactionId: string | null;
  gameTime: number;
  paused: boolean;

  // Actions
  initializeFactions: (factions: FactionState[]) => void;
  updateFactionState: (factionId: string, updates: Partial<FactionState>) => void;
  addObjective: (objective: PassiveObjective) => void;
  updateObjective: (objectiveId: string, updates: Partial<PassiveObjective>) => void;
  removeObjective: (objectiveId: string) => void;
  addNewsArticle: (article: NewsArticle) => void;
  getNewsByFaction: (factionId: string) => NewsArticle[];
  addAIAction: (action: FactionAction) => void;
  getNextAIAction: () => FactionAction | null;
  completeAIAction: (actionId: string) => void;
  setRelationships: (relationships: FactionRelationship[]) => void;
  setSelectedFaction: (factionId: string | null) => void;
  setGameTime: (time: number) => void;
  setPaused: (paused: boolean) => void;
  getActiveFactionObjectives: (factionId: string) => PassiveObjective[];
  getFactionState: (factionId: string) => FactionState | undefined;
}

export const useWarRoomStore = create<WarRoomStore>((set, get) => ({
  // State
  factions: new Map(),
  relationships: [],
  objectives: [],
  newsArticles: [],
  aiQueue: [],
  selectedFactionId: null,
  gameTime: 0,
  paused: false,

  // Actions
  initializeFactions: (factions: FactionState[]) => {
    const factionMap = new Map(factions.map((f) => [f.id, f]));
    set({ factions: factionMap });
  },

  updateFactionState: (factionId: string, updates: Partial<FactionState>) => {
    set((state) => {
      const factions = new Map(state.factions);
      const faction = factions.get(factionId);
      if (faction) {
        factions.set(factionId, { ...faction, ...updates });
      }
      return { factions };
    });
  },

  addObjective: (objective: PassiveObjective) => {
    set((state) => ({
      objectives: [...state.objectives, objective],
    }));
  },

  updateObjective: (objectiveId: string, updates: Partial<PassiveObjective>) => {
    set((state) => ({
      objectives: state.objectives.map((obj) =>
        obj.id === objectiveId ? { ...obj, ...updates } : obj
      ),
    }));
  },

  removeObjective: (objectiveId: string) => {
    set((state) => ({
      objectives: state.objectives.filter((obj) => obj.id !== objectiveId),
    }));
  },

  addNewsArticle: (article: NewsArticle) => {
    set((state) => ({
      newsArticles: [article, ...state.newsArticles].slice(0, 100), // keep last 100
    }));
  },

  getNewsByFaction: (factionId: string) => {
    return get().newsArticles.filter((article) => article.factionId === factionId);
  },

  addAIAction: (action: FactionAction) => {
    set((state) => ({
      aiQueue: [...state.aiQueue, action],
    }));
  },

  getNextAIAction: () => {
    const queue = get().aiQueue;
    if (queue.length === 0) return null;
    return queue.sort((a, b) => b.priority - a.priority)[0];
  },

  completeAIAction: (actionId: string) => {
    set((state) => ({
      aiQueue: state.aiQueue.filter((action) => action.id !== actionId),
    }));
  },

  setRelationships: (relationships: FactionRelationship[]) => {
    set({ relationships });
  },

  setSelectedFaction: (factionId: string | null) => {
    set({ selectedFactionId: factionId });
  },

  setGameTime: (time: number) => {
    set({ gameTime: time });
  },

  setPaused: (paused: boolean) => {
    set({ paused });
  },

  getActiveFactionObjectives: (factionId: string) => {
    return get().objectives.filter(
      (obj) => obj.factionId === factionId && obj.status === 'ACTIVE'
    );
  },

  getFactionState: (factionId: string) => {
    return get().factions.get(factionId);
  },
}));
```

**Step 2: Verify WarRoomStore compiles**

Run: `lsp_diagnostics "C:\Users\Pedro Jesus\Downloads\airstrike\src\store\useWarRoomStore.ts"`

Expected: No errors

**Step 3: Commit**

```bash
git add src/store/useWarRoomStore.ts
git commit -m "feat(store): add WarRoomStore Zustand for live faction state management"
```

---

## Task 8: Create UI Components (GlobalMonitor)

**Files:**
- Create: `src/ui/components/GlobalMonitor.tsx`

**Step 1: Write GlobalMonitor component**

```typescript
// src/ui/components/GlobalMonitor.tsx

import React from 'react';
import { NewsArticle } from '../../types/geopolitics';
import { AlertCircle, TrendingUp, TrendingDown, Radio } from 'lucide-react';

interface GlobalMonitorProps {
  articles: NewsArticle[];
  onArticleClick?: (article: NewsArticle) => void;
}

export const GlobalMonitor: React.FC<GlobalMonitorProps> = ({ articles, onArticleClick }) => {
  const getBiasColor = (bias: NewsArticle['bias']): string => {
    switch (bias) {
      case 'PATRIOTIC':
        return 'text-green-400';
      case 'HOSTILE':
        return 'text-red-400';
      case 'NEUTRAL':
        return 'text-gray-400';
    }
  };

  const getCategoryIcon = (category: NewsArticle['category']) => {
    switch (category) {
      case 'MILITARY':
        return <AlertCircle className="w-4 h-4" />;
      case 'VICTORY':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'SETBACK':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Radio className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-gray-900 border border-cyan-700 rounded p-4">
      <h3 className="text-cyan-400 font-bold mb-4 flex items-center gap-2">
        <Radio className="w-5 h-5" />
        GLOBAL NEWS MONITOR
      </h3>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {articles.slice(0, 10).map((article) => (
          <div
            key={article.id}
            className="border border-gray-700 rounded p-3 hover:border-cyan-600 cursor-pointer transition"
            onClick={() => onArticleClick?.(article)}
          >
            <div className="flex items-start gap-2 mb-1">
              {getCategoryIcon(article.category)}
              <span className="text-xs text-gray-500">
                {new Date(article.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className={`text-sm font-semibold ${getBiasColor(article.bias)}`}>
              {article.headline}
            </p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-600">{article.category}</span>
              <span className="text-xs px-2 py-1 bg-gray-800 rounded">
                Importance: {article.importance}/10
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Step 2: Verify GlobalMonitor compiles**

Run: `lsp_diagnostics "C:\Users\Pedro Jesus\Downloads\airstrike\src\ui\components\GlobalMonitor.tsx"`

Expected: No errors

**Step 3: Commit**

```bash
git add src/ui/components/GlobalMonitor.tsx
git commit -m "feat(ui): add GlobalMonitor news feed component"
```

---

## Task 9: Create UI Components (DiplomacyMatrix)

**Files:**
- Create: `src/ui/components/DiplomacyMatrix.tsx`

**Step 1: Write DiplomacyMatrix component**

```typescript
// src/ui/components/DiplomacyMatrix.tsx

import React from 'react';
import { FactionRelationship } from '../../types/geopolitics';
import { Shield, AlertTriangle, Handshake } from 'lucide-react';

interface DiplomacyMatrixProps {
  relationships: FactionRelationship[];
  factions: Map<string, { name: string }>;
}

export const DiplomacyMatrix: React.FC<DiplomacyMatrixProps> = ({ relationships, factions }) => {
  const getTrustColor = (trust: number): string => {
    if (trust > 75) return 'bg-green-900';
    if (trust > 50) return 'bg-green-800';
    if (trust > 25) return 'bg-yellow-800';
    return 'bg-red-800';
  };

  const getRelationshipStatus = (relationship: FactionRelationship): string => {
    const quality = relationship.trust - relationship.fear + relationship.alignment * 0.5;
    if (quality > 50) return 'ALLIED';
    if (quality > 0) return 'NEUTRAL';
    if (quality > -50) return 'TENSE';
    return 'HOSTILE';
  };

  // Remove duplicates (keep only A->B direction)
  const uniqueRelationships = relationships.filter((rel, idx, arr) =>
    arr.findIndex(
      (r) =>
        r.factionAId === rel.factionBId &&
        r.factionBId === rel.factionAId &&
        r.factionAId > r.factionBId
    ) === idx
  );

  return (
    <div className="bg-gray-900 border border-cyan-700 rounded p-4">
      <h3 className="text-cyan-400 font-bold mb-4 flex items-center gap-2">
        <Handshake className="w-5 h-5" />
        DIPLOMACY MATRIX
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-2 text-gray-400">From</th>
              <th className="text-left p-2 text-gray-400">To</th>
              <th className="text-center p-2 text-gray-400">Trust</th>
              <th className="text-center p-2 text-gray-400">Fear</th>
              <th className="text-center p-2 text-gray-400">Align</th>
              <th className="text-left p-2 text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {uniqueRelationships.map((rel) => {
              const factionAName = factions.get(rel.factionAId)?.name || rel.factionAId;
              const factionBName = factions.get(rel.factionBId)?.name || rel.factionBId;
              const status = getRelationshipStatus(rel);

              return (
                <tr key={`${rel.factionAId}-${rel.factionBId}`} className="border-b border-gray-800">
                  <td className="p-2">{factionAName}</td>
                  <td className="p-2">{factionBName}</td>
                  <td className={`text-center p-2 ${getTrustColor(rel.trust)}`}>{rel.trust}</td>
                  <td className="text-center p-2 bg-red-900">{rel.fear}</td>
                  <td className="text-center p-2 bg-blue-900">{rel.alignment}</td>
                  <td className="p-2">
                    <span className="px-2 py-1 bg-gray-800 rounded text-gray-300">{status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

**Step 2: Verify DiplomacyMatrix compiles**

Run: `lsp_diagnostics "C:\Users\Pedro Jesus\Downloads\airstrike\src\ui\components\DiplomacyMatrix.tsx"`

Expected: No errors

**Step 3: Commit**

```bash
git add src/ui/components/DiplomacyMatrix.tsx
git commit -m "feat(ui): add DiplomacyMatrix relationship visualization component"
```

---

## Task 10: Create UI Components (ObjectivesTracker)

**Files:**
- Create: `src/ui/components/ObjectivesTracker.tsx`

**Step 1: Write ObjectivesTracker component**

```typescript
// src/ui/components/ObjectivesTracker.tsx

import React from 'react';
import { PassiveObjective } from '../../types/geopolitics';
import { Target, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface ObjectivesTrackerProps {
  objectives: PassiveObjective[];
  onObjectiveClick?: (objective: PassiveObjective) => void;
}

export const ObjectivesTracker: React.FC<ObjectivesTrackerProps> = ({
  objectives,
  onObjectiveClick,
}) => {
  const getStatusIcon = (status: PassiveObjective['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'FAILED':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Target className="w-4 h-4 text-gray-400" />;
    }
  };

  const activeObjectives = objectives.filter((obj) => obj.status === 'ACTIVE');

  return (
    <div className="bg-gray-900 border border-cyan-700 rounded p-4">
      <h3 className="text-cyan-400 font-bold mb-4 flex items-center gap-2">
        <Target className="w-5 h-5" />
        PASSIVE OBJECTIVES ({activeObjectives.length})
      </h3>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {objectives.map((obj) => (
          <div
            key={obj.id}
            className="border border-gray-700 rounded p-2 hover:border-cyan-600 cursor-pointer transition"
            onClick={() => onObjectiveClick?.(obj)}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {getStatusIcon(obj.status)}
                <span className="text-sm font-semibold text-gray-300">{obj.type}</span>
              </div>
              <span className="text-xs text-gray-600">{obj.status}</span>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 bg-gray-800 rounded h-2 overflow-hidden">
                <div
                  className="bg-cyan-600 h-full transition-all"
                  style={{ width: `${obj.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{Math.round(obj.progress)}%</span>
            </div>

            <div className="flex justify-between text-xs text-gray-600">
              <span>Revenue: +{obj.revenuePerTick} cr/tick</span>
              <span>Aircraft: {obj.assignedAircraft.length}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Step 2: Verify ObjectivesTracker compiles**

Run: `lsp_diagnostics "C:\Users\Pedro Jesus\Downloads\airstrike\src\ui\components\ObjectivesTracker.tsx"`

Expected: No errors

**Step 3: Commit**

```bash
git add src/ui/components/ObjectivesTracker.tsx
git commit -m "feat(ui): add ObjectivesTracker passive objectives component"
```

---

## Task 11: Create UI Components (ResourcesDisplay)

**Files:**
- Create: `src/ui/components/ResourcesDisplay.tsx`

**Step 1: Write ResourcesDisplay component**

```typescript
// src/ui/components/ResourcesDisplay.tsx

import React from 'react';
import { FactionState } from '../../types/geopolitics';
import { Zap, Flame, Heart, Gauge } from 'lucide-react';

interface ResourcesDisplayProps {
  faction: FactionState | undefined;
  factionName?: string;
}

export const ResourcesDisplay: React.FC<ResourcesDisplayProps> = ({ faction, factionName }) => {
  if (!faction) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded p-4 text-gray-500">
        No faction selected
      </div>
    );
  }

  const getMoraleColor = (morale: number): string => {
    if (morale > 75) return 'text-green-400';
    if (morale > 50) return 'text-yellow-400';
    if (morale > 25) return 'text-orange-400';
    return 'text-red-400';
  };

  const getPostureColor = (posture: string): string => {
    switch (posture) {
      case 'DIPLOMATIC':
        return 'bg-blue-900 text-blue-300';
      case 'DEFENSIVE':
        return 'bg-yellow-900 text-yellow-300';
      case 'AGGRESSIVE':
        return 'bg-red-900 text-red-300';
      case 'WARTIME':
        return 'bg-red-950 text-red-400';
      default:
        return 'bg-gray-900 text-gray-300';
    }
  };

  return (
    <div className="bg-gray-900 border border-cyan-700 rounded p-4">
      <h3 className="text-cyan-400 font-bold mb-3">{factionName || faction.id}</h3>

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-400">Credits</span>
          </div>
          <span className="font-mono text-yellow-400">{faction.credits.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-gray-400">Fuel</span>
          </div>
          <span className="font-mono text-orange-400">{faction.fuel.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            <span className="text-gray-400">Morale</span>
          </div>
          <span className={`font-mono ${getMoraleColor(faction.morale)}`}>{faction.morale}%</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-gray-400">Aircraft</span>
          </div>
          <span className="font-mono text-cyan-400">{faction.activeAircraft.length}</span>
        </div>

        <div className="pt-2 border-t border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-400">Posture</span>
          </div>
          <span className={`px-3 py-1 rounded text-xs font-bold ${getPostureColor(faction.posture)}`}>
            {faction.posture}
          </span>
        </div>
      </div>
    </div>
  );
};
```

**Step 2: Verify ResourcesDisplay compiles**

Run: `lsp_diagnostics "C:\Users\Pedro Jesus\Downloads\airstrike\src\ui\components\ResourcesDisplay.tsx"`

Expected: No errors

**Step 3: Commit**

```bash
git add src/ui/components/ResourcesDisplay.tsx
git commit -m "feat(ui): add ResourcesDisplay faction resources component"
```

---

## Task 12: Create WarRoomDashboard (Main Container)

**Files:**
- Create: `src/ui/components/WarRoomDashboard.tsx`

**Step 1: Write WarRoomDashboard component**

```typescript
// src/ui/components/WarRoomDashboard.tsx

import React, { useMemo } from 'react';
import { useWarRoomStore } from '../../store/useWarRoomStore';
import { GlobalMonitor } from './GlobalMonitor';
import { DiplomacyMatrix } from './DiplomacyMatrix';
import { ObjectivesTracker } from './ObjectivesTracker';
import { ResourcesDisplay } from './ResourcesDisplay';
import { Radar } from 'lucide-react';

export const WarRoomDashboard: React.FC = () => {
  const {
    factions,
    relationships,
    objectives,
    newsArticles,
    selectedFactionId,
    setSelectedFaction,
    gameTime,
    paused,
  } = useWarRoomStore();

  const selectedFaction = useMemo(() => {
    if (!selectedFactionId) return undefined;
    return factions.get(selectedFactionId);
  }, [selectedFactionId, factions]);

  const factionNamesMap = useMemo(() => {
    const map = new Map<string, { name: string }>();
    factions.forEach((faction) => {
      map.set(faction.id, { name: faction.id }); // Would use specId to look up name in full implementation
    });
    return map;
  }, [factions]);

  const activeFactionObjectives = useMemo(() => {
    if (!selectedFactionId) return [];
    return objectives.filter((obj) => obj.factionId === selectedFactionId);
  }, [selectedFactionId, objectives]);

  return (
    <div className="w-full h-full bg-gray-950 text-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radar className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl font-bold text-cyan-400">WAR ROOM COMMAND CENTER</h1>
        </div>
        <div className="text-xs text-gray-500">
          <div>Game Time: {(gameTime / 1000).toFixed(1)}s</div>
          <div className={paused ? 'text-red-400' : 'text-green-400'}>
            {paused ? 'PAUSED' : 'RUNNING'}
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-4 gap-4 p-4 h-[calc(100%-60px)] overflow-hidden">
        {/* Left Column: Faction Selection & Resources */}
        <div className="col-span-1 space-y-4 overflow-y-auto">
          <div className="bg-gray-900 border border-cyan-700 rounded p-4">
            <h3 className="text-cyan-400 font-bold mb-3">SELECT FACTION</h3>
            <div className="space-y-2">
              {Array.from(factions.keys()).map((factionId) => (
                <button
                  key={factionId}
                  onClick={() => setSelectedFaction(factionId)}
                  className={`w-full text-left px-3 py-2 rounded transition ${
                    selectedFactionId === factionId
                      ? 'bg-cyan-700 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {factionId}
                </button>
              ))}
            </div>
          </div>

          <ResourcesDisplay
            faction={selectedFaction}
            factionName={selectedFactionId || undefined}
          />
        </div>

        {/* Center Left: News Monitor */}
        <div className="col-span-1 overflow-hidden">
          <GlobalMonitor
            articles={newsArticles}
            onArticleClick={(article) => console.log('Article clicked:', article)}
          />
        </div>

        {/* Center Right: Objectives & Diplomacy */}
        <div className="col-span-1 space-y-4 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            <ObjectivesTracker
              objectives={activeFactionObjectives}
              onObjectiveClick={(obj) => console.log('Objective clicked:', obj)}
            />
          </div>
        </div>

        {/* Right Column: Diplomacy Matrix */}
        <div className="col-span-1 overflow-hidden">
          <DiplomacyMatrix relationships={relationships} factions={factionNamesMap} />
        </div>
      </div>
    </div>
  );
};
```

**Step 2: Verify WarRoomDashboard compiles**

Run: `lsp_diagnostics "C:\Users\Pedro Jesus\Downloads\airstrike\src\ui\components\WarRoomDashboard.tsx"`

Expected: No errors

**Step 3: Commit**

```bash
git add src/ui/components/WarRoomDashboard.tsx
git commit -m "feat(ui): add WarRoomDashboard main integrated container"
```

---

## Task 13: Integrate WarRoomStore into SimulationEngine (6-Phase Tick)

**Files:**
- Modify: `src/core/SimulationEngine.ts`

**Step 1: Read current SimulationEngine to understand structure**

Run: `read "C:\Users\Pedro Jesus\Downloads\airstrike\src\core\SimulationEngine.ts" | head 100`

Expected: Current engine structure (tick loop, EventBus integration)

**Step 2: Add WarRoom integration to SimulationEngine tick**

(This step depends on seeing the current engine structure. Assuming it exists with a tick() method:)

After reading the current engine:
- Add WarRoomStore integration at the top of `tick()` method
- Implement 6-phase tick loop:
  1. **Phase 1: Revenue** - Calculate passive objective revenue for all factions
  2. **Phase 2: AI Decisions** - Generate new AI decisions
  3. **Phase 3: Execution** - Execute next pending AI action
  4. **Phase 4: Tactics** - Adjust faction postures based on threats
  5. **Phase 5: Events** - Process simulation events that generate news
  6. **Phase 6: Sync** - Sync all changes to WarRoomStore

(Full integration step will be provided after examining current engine structure)

---

## Task 14: Update GameState Type to Include Faction Layer

**Files:**
- Modify: `src/types/entities.ts`

**Step 1: Read current GameState**

Run: `read "C:\Users\Pedro Jesus\Downloads\airstrike\src\types\entities.ts" | grep -A 30 "interface GameState"`

Expected: Current GameState shape

**Step 2: Add faction layer**

(After reading current structure, will add:)
```typescript
interface GameState {
  // existing fields...
  factions: FactionState[];
  relationships: FactionRelationship[];
  activeObjectives: PassiveObjective[];
}
```

---

## Task 15: Run End-to-End Integration Test

**Files:**
- Run: `pnpm dev`

**Step 1: Start dev server**

Run: `pnpm dev`

Expected: Server starts on port 6969, no compilation errors

**Step 2: Verify no TypeScript errors**

Check console output for any type errors or warnings.

Expected: Clean build with no errors

**Step 3: Commit final Phase 15**

```bash
git add .
git commit -m "feat(phase15): complete geopolitical faction system with UI, stores, and systems"
```

---

## Success Criteria

- ✅ All 6 systems compile without errors
- ✅ All 5 UI components compile without errors
- ✅ WarRoomStore correctly initialized with faction state
- ✅ SimulationEngine integrates 6-phase tick with WarRoom
- ✅ GameState type includes faction layer
- ✅ Dev server starts on port 6969 with no errors
- ✅ All commits follow pattern: "feat(component): description"
- ✅ Code follows existing patterns (registry, Zustand, EventBus)

---

## Notes

- All systems follow the modular registry pattern from Phases 9-14
- AI has identical action capabilities as player (symmetric design)
- No worktrees or subagents (direct execution only)
- Each task is atomic and can be verified independently
- Expected total execution time: 45-60 minutes for full implementation
