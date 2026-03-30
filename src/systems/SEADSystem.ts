import { Aircraft, Missile, Coordinates, MissionType } from '../types/entities';

export interface RadarEmission {
  radarId: string;
  position: Coordinates;
  emissionStrength: number;
  frequency: number;
  frequency_band: 'X_BAND' | 'S_BAND' | 'KU_BAND';
  active: boolean;
  lastDetectedTime: number;
}

export class SEADSystem {
  private detectedRadars: Map<string, RadarEmission> = new Map();
  private readonly RADAR_DETECTION_RANGE_KM = 300;
  private readonly SEAD_MISSILE_RANGE_KM = 150;

  /**
   * Detect active radar emissions for anti-radiation missiles.
   * Passive radar seekers (AGM-88 HARM, Kh-31P) lock onto emissions.
   */
  detectRadarEmissions(
    radarPositions: Map<string, Coordinates>,
    radarStates: Map<string, boolean>,
    currentTime: number
  ): RadarEmission[] {
    const detectedEmissions: RadarEmission[] = [];

    for (const [radarId, position] of radarPositions) {
      const isActive = radarStates.get(radarId) ?? false;

      if (!isActive) {
        this.detectedRadars.delete(radarId);
        continue;
      }

      const emission: RadarEmission = {
        radarId,
        position,
        emissionStrength: this.calculateEmissionStrength(radarId),
        frequency: this.getRadarFrequency(radarId),
        frequency_band: 'X_BAND',
        active: true,
        lastDetectedTime: currentTime,
      };

      this.detectedRadars.set(radarId, emission);
      detectedEmissions.push(emission);
    }

    return detectedEmissions;
  }

  /**
   * Check if SEAD missile can acquire radar target.
   * Returns true if radar is in range and actively emitting.
   */
  canAcquireTarget(
    missilePosition: Coordinates,
    targetRadarId: string,
    targetRadarPosition: Coordinates
  ): boolean {
    const distance = this.calculateDistance(missilePosition, targetRadarPosition);

    if (distance > this.SEAD_MISSILE_RANGE_KM) {
      return false;
    }

    const radar = this.detectedRadars.get(targetRadarId);
    return radar?.active ?? false;
  }

  /**
   * Calculate probability of SEAD missile hitting radar.
   * Higher when radar is stationary and actively radiating.
   */
  calculateHitProbability(
    missileType: string,
    radarState: 'ACTIVE' | 'SILENT' | 'DESTROYED'
  ): number {
    if (radarState === 'DESTROYED') return 0;
    if (radarState === 'SILENT') return 0.2;

    const missileModifier = missileType === 'AGM-88' ? 0.85 : 0.75;
    return missileModifier;
  }

  /**
   * Recommend radar shutdown to avoid SEAD missile detection.
   * Silencing radar reduces detection but breaks air defence.
   */
  shouldShutdownRadar(
    radarPosition: Coordinates,
    hostileAircraft: Aircraft[],
    activeSEADMissiles: Missile[]
  ): boolean {
    const nearbyHostiles = hostileAircraft.filter(aircraft => {
      const distance = this.calculateDistance(aircraft.position, radarPosition);
      return distance < 200;
    });

    const threatyMissiles = activeSEADMissiles.filter(missile => {
      const distance = this.calculateDistance(missile.position, radarPosition);
      return distance < this.SEAD_MISSILE_RANGE_KM;
    });

    return nearbyHostiles.length > 0 || threatyMissiles.length > 0;
  }

  /**
   * Get all currently detectable radar emissions.
   * For planning SEAD missions and strike targeting.
   */
  getAllDetectedRadars(): RadarEmission[] {
    return Array.from(this.detectedRadars.values());
  }

  getRadarEmission(radarId: string): RadarEmission | undefined {
    return this.detectedRadars.get(radarId);
  }

  /**
   * Suppress a radar by destroying or forcing shutdown.
   * Returns true if suppression was effective.
   */
  suppressRadar(radarId: string, method: 'DESTROYED' | 'JAMMED' | 'FORCED_SILENT'): boolean {
    const radar = this.detectedRadars.get(radarId);

    if (!radar) return false;

    if (method === 'DESTROYED') {
      this.detectedRadars.delete(radarId);
      return true;
    } else if (method === 'FORCED_SILENT') {
      radar.active = false;
      return true;
    } else if (method === 'JAMMED') {
      radar.emissionStrength *= 0.3;
      return true;
    }

    return false;
  }

  clearRadarDatabase(): void {
    this.detectedRadars.clear();
  }

  private calculateDistance(pos1: Coordinates, pos2: Coordinates): number {
    const R = 6371;
    const dLat = ((pos2.lat - pos1.lat) * Math.PI) / 180;
    const dLng = ((pos2.lng - pos1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pos1.lat * Math.PI) / 180) *
        Math.cos((pos2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateEmissionStrength(radarId: string): number {
    if (radarId.includes('OTH')) return 0.9;
    if (radarId.includes('LONG_RANGE')) return 0.85;
    if (radarId.includes('MEDIUM_RANGE')) return 0.7;
    return 0.6;
  }

  private getRadarFrequency(radarId: string): number {
    if (radarId.includes('X_BAND')) return 10000;
    if (radarId.includes('S_BAND')) return 3000;
    if (radarId.includes('KU_BAND')) return 15000;
    return 8000;
  }
}

export const seadSystem = new SEADSystem();
