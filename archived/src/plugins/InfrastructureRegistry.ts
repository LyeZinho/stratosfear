import { RegistryBase } from "./RegistryBase";
import { InfrastructureSpecification } from "../types/entities";

/**
 * Registry for strategic base infrastructure modules.
 * Provides centralized definitions for base upgrades and tactical infrastructure.
 * 
 * To add a new infrastructure module:
 * 1. Create a new InfrastructureSpecification object
 * 2. Call infrastructureRegistry.register(id, spec)
 * 3. The module is immediately available for base construction without code changes elsewhere
 */
export class InfrastructureRegistry extends RegistryBase<InfrastructureSpecification> {
  constructor() {
    super("InfrastructureRegistry");
    this.registerDefaultInfrastructure();
  }

  private registerDefaultInfrastructure(): void {
    // Radar and Detection Systems
    this.register("RADAR_OTH", {
      id: "RADAR_OTH",
      name: "Radar OTH (Over The Horizon)",
      category: "Radar",
      costCredits: 15000,
      buildTimeSeconds: 3600,
      maintenanceCostPerHour: 500,
      healthPoints: 300,
      bonusEffect: {
        radarRangeMultiplier: 1.5,
        detectionRateBonus: 0.3,
      },
      description: "Long-range surveillance radar. Extends detection range to 600+ km. Critical for early warning.",
    });

    // Defence Systems
    this.register("BATERIA_CIWS", {
      id: "BATERIA_CIWS",
      name: "Bateria CIWS (Close-In Weapon System)",
      category: "Defence",
      costCredits: 8000,
      buildTimeSeconds: 1800,
      maintenanceCostPerHour: 300,
      healthPoints: 200,
      bonusEffect: {
        detectionRateBonus: 0.15,
      },
      requiredTechs: ["air_defense"],
      description: "Point-defence system. Automated engagement against incoming missiles and aircraft. Fast-tracking capability.",
    });

    // Electronic Warfare and Communications
    this.register("ANTENA_JAMMING", {
      id: "ANTENA_JAMMING",
      name: "Antena de Jamming (EW Jammer)",
      category: "Communications",
      costCredits: 12000,
      buildTimeSeconds: 2400,
      maintenanceCostPerHour: 400,
      healthPoints: 150,
      bonusEffect: {
        jammerStrength: 0.8,
      },
      requiredTechs: ["electronic_warfare"],
      description: "Electronic warfare jammer. Reduces enemy detection accuracy by 40-80% depending on jammer strength vs radar power.",
    });

    this.register("TERMINAL_LINK16", {
      id: "TERMINAL_LINK16",
      name: "Terminal Link-16 (Tactical Datalink)",
      category: "Communications",
      costCredits: 10000,
      buildTimeSeconds: 1600,
      maintenanceCostPerHour: 250,
      healthPoints: 100,
      bonusEffect: {
        detectionRateBonus: 0.25,
      },
      requiredTechs: ["datalink"],
      description: "Tactical data sharing terminal. Enables real-time radar picture sharing between allied units and AWACS platforms.",
    });

    // Command and Control
    this.register("CENTRO_COMANDO_SIGINT", {
      id: "CENTRO_COMANDO_SIGINT",
      name: "Centro de Comando SIGINT",
      category: "Command",
      costCredits: 11000,
      buildTimeSeconds: 2000,
      maintenanceCostPerHour: 350,
      healthPoints: 180,
      bonusEffect: {
        detectionRateBonus: 0.2,
        commandCenterRange: 800,
      },
      requiredTechs: ["signals_intelligence"],
      description: "SIGINT (Signals Intelligence) command center. Intercepts and analyzes enemy radio emissions for targeting intelligence.",
    });

    this.register("TORRE_CONTROLE_AVANCADA", {
      id: "TORRE_CONTROLE_AVANCADA",
      name: "Torre de Controle Avançada (Advanced ATC)",
      category: "Command",
      costCredits: 7000,
      buildTimeSeconds: 1200,
      maintenanceCostPerHour: 200,
      healthPoints: 120,
      bonusEffect: {
        commandCenterRange: 150,
      },
      description: "Advanced Air Traffic Control tower. Improves flight coordination and reduces aircraft response time by 15%.",
    });

    // Logistics and Support
    this.register("HANGAR_SUBTERRANEO", {
      id: "HANGAR_SUBTERRANEO",
      name: "Hangar Subterrâneo (Underground Hangar)",
      category: "Logistics",
      costCredits: 9000,
      buildTimeSeconds: 2800,
      maintenanceCostPerHour: 150,
      healthPoints: 400,
      bonusEffect: {},
      description: "Hardened underground shelter. Protects 4 aircraft from air strikes. High health, reduces damage taken by 50%.",
    });

    this.register("POSTO_REABASTECIMENTO_RAPIDO", {
      id: "POSTO_REABASTECIMENTO_RAPIDO",
      name: "Posto de Reabastecimento Rápido (Quick Refuel)",
      category: "Logistics",
      costCredits: 5000,
      buildTimeSeconds: 800,
      maintenanceCostPerHour: 100,
      healthPoints: 80,
      bonusEffect: {
        refuelSpeed: 2.5,
      },
      description: "Rapid refueling point. Speeds up fuel transfer to aircraft by 150%. Essential for extended air operations.",
    });

    this.register("TANQUE_RESERVA_ESTRATEGICA", {
      id: "TANQUE_RESERVA_ESTRATEGICA",
      name: "Tanque de Reserva Estratégica (Strategic Fuel Reserve)",
      category: "Logistics",
      costCredits: 6000,
      buildTimeSeconds: 1400,
      maintenanceCostPerHour: 120,
      healthPoints: 200,
      bonusEffect: {},
      description: "Strategic fuel storage tank. Doubles base fuel capacity. Enables longer sustained air operations without resupply.",
    });
  }

  /**
   * Add a custom infrastructure module at runtime.
   * Useful for testing or dynamic content loading.
   * 
   * @param spec The infrastructure specification to add
   */
  addCustomInfrastructure(spec: InfrastructureSpecification): void {
    this.register(spec.id, spec);
  }
}

export const infrastructureRegistry = new InfrastructureRegistry();
