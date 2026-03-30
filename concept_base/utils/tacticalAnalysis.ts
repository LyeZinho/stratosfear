import { Aircraft, Base, Side, Missile } from "../types/game";
import { getDistanceKm } from "./physics";

export interface TacticalAssessment {
  threatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary: string;
  recommendations: string[];
  priorityTargets: string[];
}

export const analyzeThreatsAlgorithmic = (
  friendlyBase: Base,
  hostileBases: Base[],
  allyBases: Base[],
  aircrafts: Aircraft[],
  missiles: Missile[]
): TacticalAssessment => {
  const hostileAircrafts = aircrafts.filter(a => a.side === Side.HOSTILE);
  const friendlyAircrafts = aircrafts.filter(a => a.side === Side.FRIENDLY);
  const incomingMissiles = missiles.filter(m => m.side === Side.HOSTILE);

  let threatScore = 0;
  threatScore += hostileAircrafts.length * 10;
  threatScore += incomingMissiles.length * 25;

  // Check proximity of hostiles to friendly base
  hostileAircrafts.forEach(ac => {
    const dist = getDistanceKm(friendlyBase.position, ac.position);
    if (dist < 50) threatScore += 20;
    else if (dist < 150) threatScore += 10;
  });

  let threatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
  if (threatScore > 100) threatLevel = "CRITICAL";
  else if (threatScore > 60) threatLevel = "HIGH";
  else if (threatScore > 30) threatLevel = "MEDIUM";

  const summary = `Detected ${hostileAircrafts.length} hostile aircraft and ${incomingMissiles.length} incoming missiles. ` +
    (threatLevel === "CRITICAL" ? "Immediate defensive action required!" : 
     threatLevel === "HIGH" ? "High alert status. Intercept incoming threats." : 
     "Situation under control, monitoring airspace.");

  const recommendations: string[] = [];
  if (incomingMissiles.length > 0) recommendations.push("Deploy countermeasures and perform evasive maneuvers.");
  if (hostileAircrafts.length > friendlyAircrafts.length) recommendations.push("Scramble additional interceptors from base.");
  if (threatLevel === "CRITICAL") recommendations.push("Activate all SAM batteries and prioritize base defense.");
  if (recommendations.length === 0) recommendations.push("Continue routine patrols and radar monitoring.");

  const priorityTargets = hostileAircrafts
    .map(ac => ({ id: ac.id, dist: getDistanceKm(friendlyBase.position, ac.position) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3)
    .map(t => t.id);

  return {
    threatLevel,
    summary,
    recommendations,
    priorityTargets
  };
};
