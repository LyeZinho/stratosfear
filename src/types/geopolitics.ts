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
