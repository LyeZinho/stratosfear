import { Aircraft, Missile } from "../types/entities";
import { spatialIndex } from "./SpatialIndex";

/**
 * Handles all physics updates: movement, fuel consumption, collision detection.
 * Called once per simulation tick (60 Hz).
 */
export class PhysicsSystem {
  /**
   * Update aircraft position based on heading and speed.
   * Also handles altitude changes and fuel consumption.
   */
  updateAircraftPosition(aircraft: Aircraft, deltaTimeMs: number): void {
    const deltaTimeSec = deltaTimeMs / 1000;

    const speedKmPerSec = (aircraft.spec.maxSpeedMach * 1.235) * (aircraft.currentSpeed / 100);
    const headingRad = (aircraft.heading * Math.PI) / 180;

    const dx = speedKmPerSec * Math.cos(headingRad) * deltaTimeSec;
    const dy = speedKmPerSec * Math.sin(headingRad) * deltaTimeSec;

    aircraft.position.x += dx;
    aircraft.position.y += dy;

    if (aircraft.targetAltitude !== aircraft.position.altitude) {
      const altitudeChangePerSec = 100;
      const altitudeDelta = Math.sign(aircraft.targetAltitude - aircraft.position.altitude) *
        altitudeChangePerSec *
        deltaTimeSec;

      if (Math.abs(aircraft.targetAltitude - aircraft.position.altitude) < Math.abs(altitudeDelta)) {
        aircraft.position.altitude = aircraft.targetAltitude;
      } else {
        aircraft.position.altitude += altitudeDelta;
      }
    }

    this.consumeFuel(aircraft, deltaTimeMs);

    spatialIndex.updateAircraft(
      aircraft.id,
      aircraft.position.x,
      aircraft.position.y,
      aircraft.spec.rcsFrontal
    );
  }

  /**
   * Update missile position based on velocity and guidance.
   * Missiles travel in a straight line until they hit or exceed max range.
   */
  updateMissilePosition(missile: Missile, deltaTimeMs: number): void {
    const deltaTimeSec = deltaTimeMs / 1000;

    const speedKmPerSec = missile.spec.speed;
    const headingRad = (missile.heading * Math.PI) / 180;

    const dx = speedKmPerSec * Math.cos(headingRad) * deltaTimeSec;
    const dy = speedKmPerSec * Math.sin(headingRad) * deltaTimeSec;

    missile.position.x += dx;
    missile.position.y += dy;

    if (missile.targetAltitude !== undefined) {
      const altitudeChangePerSec = 200;
      const altitudeDelta = Math.sign(missile.targetAltitude - missile.position.altitude) *
        altitudeChangePerSec *
        deltaTimeSec;

      if (Math.abs(missile.targetAltitude - missile.position.altitude) < Math.abs(altitudeDelta)) {
        missile.position.altitude = missile.targetAltitude;
      } else {
        missile.position.altitude += altitudeDelta;
      }
    }

    const distanceTraveled = this.calculateDistance(
      { x: missile.launchX, y: missile.launchY, altitude: 0 },
      { x: missile.position.x, y: missile.position.y, altitude: 0 }
    );

    missile.fuelRemaining = Math.max(0, missile.spec.rangeMax - distanceTraveled);

    spatialIndex.updateMissile(
      missile.id,
      missile.position.x,
      missile.position.y
    );
  }

  /**
   * Calculate fuel consumption based on throttle setting.
   */
  private consumeFuel(aircraft: Aircraft, deltaTimeMs: number): void {
    const consumptionPerMs =
      aircraft.spec.fuelConsumptionBase * (aircraft.throttle / 100) / 1000;

    aircraft.fuelRemaining = Math.max(0, aircraft.fuelRemaining - consumptionPerMs * deltaTimeMs);
  }

  /**
   * 3D distance calculation.
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

  /**
   * Test collision between missile and aircraft.
   * Missile hits if within 2km proximity.
   */
  testCollision(missile: Missile, aircraft: Aircraft): boolean {
    const distance = this.calculateDistance(missile.position, aircraft.position);
    return distance <= 2;
  }
}

export const physicsSystem = new PhysicsSystem();
