import { RegistryBase } from "./RegistryBase";
import { MissileSpecification } from "../types/entities";

/**
 * Registry for all missile specifications in the game.
 * Provides centralized, extensible missile definitions.
 * 
 * To add a new missile:
 * 1. Create a new MissileSpecification object
 * 2. Call missileRegistry.register(id, spec)
 * 3. The missile is immediately available without code changes elsewhere
 */
export class MissileRegistry extends RegistryBase<MissileSpecification> {
  constructor() {
    super("MissileRegistry");
    this.registerDefaultMissiles();
  }

  private registerDefaultMissiles(): void {
    // Short-range WVR (Within Visual Range) IR-seeking air-to-air missiles
    this.register("AIM-9X", {
      id: "AIM-9X",
      model: "AIM-9X Sidewinder",
      type: "SHORT_RANGE",
      seekerType: "IR",
      rangeMax: 20,
      nez: 5,
      speed: 3.0,
      cost: 1000,
      reloadTime: 5,
    });

    this.register("R-73", {
      id: "R-73",
      model: "R-73 Archer",
      type: "SHORT_RANGE",
      seekerType: "IR",
      rangeMax: 30,
      nez: 8,
      speed: 2.5,
      cost: 1200,
      reloadTime: 5,
    });

    this.register("IRIS-T", {
      id: "IRIS-T",
      model: "IRIS-T",
      type: "SHORT_RANGE",
      seekerType: "IR",
      rangeMax: 25,
      nez: 6,
      speed: 2.8,
      cost: 1100,
      reloadTime: 5,
    });

    // New WVR IR missiles
    this.register("Python-5", {
      id: "Python-5",
      model: "Python-5",
      type: "SHORT_RANGE",
      seekerType: "IR",
      rangeMax: 28,
      nez: 7,
      speed: 3.2,
      cost: 1150,
      reloadTime: 5,
    });

    this.register("PL-5", {
      id: "PL-5",
      model: "PL-5",
      type: "SHORT_RANGE",
      seekerType: "IR",
      rangeMax: 22,
      nez: 5,
      speed: 2.9,
      cost: 950,
      reloadTime: 5,
    });

    // Medium-range BVR (Beyond Visual Range) radar-active air-to-air missiles
    this.register("AIM-120C", {
      id: "AIM-120C",
      model: "AIM-120C-5",
      type: "MEDIUM_RANGE",
      seekerType: "RADAR_ACTIVE",
      rangeMax: 105,
      nez: 25,
      speed: 4.0,
      cost: 2500,
      reloadTime: 10,
    });

    this.register("AIM-120D", {
      id: "AIM-120D",
      model: "AIM-120D",
      type: "MEDIUM_RANGE",
      seekerType: "RADAR_ACTIVE",
      rangeMax: 120,
      nez: 30,
      speed: 4.2,
      cost: 3000,
      reloadTime: 10,
    });

    this.register("R-77", {
      id: "R-77",
      model: "R-77 Adder",
      type: "MEDIUM_RANGE",
      seekerType: "RADAR_ACTIVE",
      rangeMax: 80,
      nez: 20,
      speed: 4.0,
      cost: 2000,
      reloadTime: 10,
    });

    // New medium-range radar missiles
    this.register("PL-12", {
      id: "PL-12",
      model: "PL-12",
      type: "MEDIUM_RANGE",
      seekerType: "RADAR_ACTIVE",
      rangeMax: 100,
      nez: 24,
      speed: 3.9,
      cost: 2200,
      reloadTime: 10,
    });

    this.register("PL-15", {
      id: "PL-15",
      model: "PL-15",
      type: "LONG_RANGE",
      seekerType: "RADAR_ACTIVE",
      rangeMax: 130,
      nez: 35,
      speed: 4.3,
      cost: 3200,
      reloadTime: 12,
    });

    // Long-range air-to-air missiles
    this.register("Meteor", {
      id: "Meteor",
      model: "MBDA Meteor",
      type: "LONG_RANGE",
      seekerType: "RADAR_ACTIVE",
      rangeMax: 200,
      nez: 60,
      speed: 4.0,
      cost: 5000,
      reloadTime: 15,
    });

    // Air defense system missiles (SAM)
    this.register("48N6E3", {
      id: "48N6E3",
      model: "48N6E3",
      type: "LONG_RANGE",
      seekerType: "RADAR_ACTIVE",
      rangeMax: 250,
      nez: 80,
      speed: 6.0,
      cost: 8000,
      reloadTime: 15,
    });

    this.register("PAC-3", {
      id: "PAC-3",
      model: "PAC-3 MSE",
      type: "LONG_RANGE",
      seekerType: "RADAR_ACTIVE",
      rangeMax: 120,
      nez: 40,
      speed: 5.0,
      cost: 6000,
      reloadTime: 15,
    });

    // SEAD (Suppression of Enemy Air Defenses) anti-radiation missiles
    this.register("AGM-88", {
      id: "AGM-88",
      model: "AGM-88 HARM",
      type: "SEAD",
      seekerType: "PASSIVE_RADAR",
      rangeMax: 150,
      nez: 0,
      speed: 3.8,
      cost: 3500,
      reloadTime: 12,
    });

    this.register("Kh-31P", {
      id: "Kh-31P",
      model: "Kh-31P",
      type: "SEAD",
      seekerType: "PASSIVE_RADAR",
      rangeMax: 160,
      nez: 0,
      speed: 4.5,
      cost: 4000,
      reloadTime: 14,
    });

    // Ground attack missiles
    this.register("AGM-65", {
      id: "AGM-65",
      model: "AGM-65 Maverick",
      type: "GROUND_ATTACK",
      seekerType: "TV_IR",
      rangeMax: 25,
      nez: 0,
      speed: 2.2,
      cost: 2800,
      reloadTime: 8,
    });

    this.register("AGM-114", {
      id: "AGM-114",
      model: "AGM-114 Hellfire",
      type: "GROUND_ATTACK",
      seekerType: "LASER",
      rangeMax: 8,
      nez: 0,
      speed: 3.5,
      cost: 1600,
      reloadTime: 4,
    });

    // Legacy/generic missiles for backward compatibility
    this.register("BVR", {
      id: "BVR",
      model: "Beyond Visual Range",
      type: "LONG_RANGE",
      seekerType: "RADAR_ACTIVE",
      rangeMax: 150,
      nez: 50,
      speed: 4.5,
      cost: 4000,
      reloadTime: 12,
    });

    this.register("Dogfight", {
      id: "Dogfight",
      model: "Dogfight Missile",
      type: "SHORT_RANGE",
      seekerType: "IR",
      rangeMax: 15,
      nez: 3,
      speed: 3.5,
      cost: 800,
      reloadTime: 3,
    });
  }

  /**
   * Add a custom missile at runtime.
   * Useful for testing or dynamic content loading.
   * 
   * @param spec The missile specification to add
   */
  addCustomMissile(spec: MissileSpecification): void {
    this.register(spec.id, spec);
  }
}

// Singleton instance
export const missileRegistry = new MissileRegistry();
