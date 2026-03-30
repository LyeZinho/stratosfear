import { spatialIndex } from "./SpatialIndex";
import { Aircraft, Missile } from "../types/entities";
import { eventBus } from "../core/EventBus";

/**
 * Handles radar detection, target tracking, and sensor fusion.
 * Uses SpatialIndex for O(1) proximity queries.
 * 
 * Detection rules:
 * - RCS affects detection range: smaller RCS = harder to detect
 * - Altitude matters: low-level flight reduces detection range
 * - ECM strength affects radar reliability
 */
export class DetectionSystem {
  /**
   * Calculate detection range for a radar given target RCS.
   * Formula: radarRange * (1 - ecmReduction) * sqrt(targetRCS)
   */
  calculateDetectionRange(
    radarRangeKm: number,
    targetRCS: number,
    targetECM: number
  ): number {
    const ecmReduction = targetECM * 0.5;
    return radarRangeKm * (1 - ecmReduction) * Math.sqrt(Math.max(0.001, targetRCS));
  }

  /**
   * Detect targets for a given aircraft.
   * Returns IDs of detected aircraft within detection range.
   */
  detectAircraft(radar: Aircraft, allAircraft: Map<string, Aircraft>): string[] {
    const detectionRange = this.calculateDetectionRange(
      radar.spec.radarRangeKm,
      1.0,
      0
    );

    const nearby = spatialIndex.getNearbyAircraft(
      radar.position.x,
      radar.position.y,
      detectionRange
    );

    return nearby.filter((id) => {
      if (id === radar.id) return false;
      const target = allAircraft.get(id);
      if (!target) return false;

      const distance = this.calculateDistance(
        radar.position,
        target.position
      );

      const targetDetectionRange = this.calculateDetectionRange(
        radar.spec.radarRangeKm,
        target.spec.rcsFrontal,
        target.spec.ecmStrength
      );

      return distance <= targetDetectionRange;
    });
  }

  /**
   * Detect missiles targeting a given aircraft.
   * Returns IDs of missiles in close proximity.
   */
  detectMissiles(aircraft: Aircraft, allMissiles: Map<string, Missile>): string[] {
    const warningRange = 50;
    const nearby = spatialIndex.getNearbyMissiles(
      aircraft.position.x,
      aircraft.position.y,
      warningRange
    );

    return nearby.filter((id) => {
      const missile = allMissiles.get(id);
      if (!missile) return false;

      const distance = this.calculateDistance(
        aircraft.position,
        missile.position
      );

      return distance <= warningRange;
    });
  }

  /**
   * 3D distance calculation (includes altitude).
   */
  private calculateDistance(
    pos1: { x: number; y: number; altitude: number },
    pos2: { x: number; y: number; altitude: number }
  ): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = (pos1.altitude - pos2.altitude) / 1000;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

export const detectionSystem = new DetectionSystem();
