import { Aircraft, Missile, SeekerType, JammingEffect, RWRAlert, Coordinates } from '../types/entities';

export class EWSystem {
  private activeJammers: Map<string, JammingEffect> = new Map();
  private falseContacts: Array<{ position: Coordinates; ttl: number }> = [];
  private rwrAlerts: Map<string, RWRAlert[]> = new Map();

  private readonly JAMMER_RANGE_BASE_KM = 100;
  private readonly FALSE_CONTACT_TTL_MS = 10000;

  /**
   * Process jamming effects from active EW infrastructure.
   * Jammers create false radar contacts and reduce detection probability.
   */
  activateJammers(jammerIds: string[], jammerPositions: Map<string, Coordinates>): void {
    this.activeJammers.clear();

    for (const jammerId of jammerIds) {
      const position = jammerPositions.get(jammerId);
      if (!position) continue;

      this.activeJammers.set(jammerId, {
        sourceId: jammerId,
        strength: 0.8,
        rangeKm: this.JAMMER_RANGE_BASE_KM,
        frequencyBand: 'WIDEBAND',
        effectiveAgainstRCS: 0.6,
      });

      this.createFalseRadarContact(position);
    }
  }

  private createFalseRadarContact(position: Coordinates): void {
    const false_lat = position.lat + (Math.random() - 0.5) * 0.5;
    const false_lng = position.lng + (Math.random() - 0.5) * 0.5;

    this.falseContacts.push({
      position: { lat: false_lat, lng: false_lng },
      ttl: this.FALSE_CONTACT_TTL_MS,
    });
  }

  /**
   * Calculate detection probability reduction due to EW effects.
   * Returns multiplier (0.0 = 100% jamming, 1.0 = no jamming).
   */
  calculateEWEffectiveness(
    targetPosition: Coordinates,
    targetRCS: number,
    radarRangeKm: number
  ): number {
    let detectionMultiplier = 1.0;

    for (const jammer of this.activeJammers.values()) {
      const distance = this.calculateDistance(targetPosition, jammer.sourceId);

      if (distance > jammer.rangeKm) continue;

      const rangeFalloff = 1 - distance / jammer.rangeKm;
      const rcsFalloff = Math.min(targetRCS, 1) * jammer.effectiveAgainstRCS;
      const jammerEffect = jammer.strength * rangeFalloff * rcsFalloff;

      detectionMultiplier *= (1 - jammerEffect);
    }

    return Math.max(0.1, detectionMultiplier);
  }

  /**
   * Check if a missile is vulnerable to seeker deception.
   * IR seekers can be spoofed with flares, radar seekers with chaff.
   */
  canMissileEvadeCM(missile: Missile, cmType: 'FLARES' | 'CHAFF'): boolean {
    const seekerType = this.getMissileSeeker(missile.specId);

    if (cmType === 'FLARES') {
      return seekerType === 'IR' || seekerType === 'TV_IR';
    } else if (cmType === 'CHAFF') {
      return seekerType === 'RADAR_ACTIVE';
    }

    return false;
  }

  /**
   * Generate RWR alerts for aircraft detecting hostile radar emissions.
   */
  generateRWRAlerts(
    aircraftId: string,
    hostileRadarIds: string[],
    radarPositions: Map<string, Coordinates>,
    aircraftPosition: Coordinates
  ): RWRAlert[] {
    const alerts: RWRAlert[] = [];

    for (const radarId of hostileRadarIds) {
      const radarPos = radarPositions.get(radarId);
      if (!radarPos) continue;

      const distance = this.calculateDistance(aircraftPosition, radarId);
      const bearing = this.calculateBearing(aircraftPosition, radarPos);

      alerts.push({
        radarType: radarId,
        bearing,
        distance,
        threat: this.classifyThreat(radarId),
        lockOn: distance < 200,
      });
    }

    this.rwrAlerts.set(aircraftId, alerts);
    return alerts;
  }

  /**
   * Calculate RCS reduction from active spoofing/ECM.
   * Stealth + ECM provides cumulative reduction.
   */
  calculateEffectiveRCS(baseRCS: number, ecmStrength: number, jammerPresent: boolean): number {
    let rcs = baseRCS;

    rcs *= 1 - ecmStrength * 0.5;

    if (jammerPresent) {
      rcs *= 0.6;
    }

    return Math.max(0.001, rcs);
  }

  updateFalseContacts(deltaMs: number): Coordinates[] {
    this.falseContacts = this.falseContacts.filter(contact => {
      contact.ttl -= deltaMs;
      return contact.ttl > 0;
    });

    return this.falseContacts.map(c => c.position);
  }

  getRWRAlerts(aircraftId: string): RWRAlert[] {
    return this.rwrAlerts.get(aircraftId) ?? [];
  }

  private calculateDistance(pos1: Coordinates, radarId: string): number {
    return Math.random() * 500;
  }

  private calculateBearing(from: Coordinates, to: Coordinates): number {
    const dLng = to.lng - from.lng;
    const y = Math.sin(dLng) * Math.cos(to.lat);
    const x =
      Math.cos(from.lat) * Math.sin(to.lat) -
      Math.sin(from.lat) * Math.cos(to.lat) * Math.cos(dLng);
    const bearing = Math.atan2(y, x);
    return (bearing * 180) / Math.PI + 360 % 360;
  }

  private getMissileSeeker(missileSpecId: string): SeekerType {
    const seekerMap: Record<string, SeekerType> = {
      'AIM-9X': 'IR',
      'AIM-120D': 'RADAR_ACTIVE',
      'AGM-88': 'PASSIVE_RADAR',
      'AGM-65': 'TV_IR',
      'AGM-114': 'LASER',
    };

    return seekerMap[missileSpecId] ?? 'NONE';
  }

  private classifyThreat(radarId: string): 'SAM' | 'AAA' | 'FIGHTER' | 'UNKNOWN' {
    if (radarId.includes('SAM')) return 'SAM';
    if (radarId.includes('AAA')) return 'AAA';
    if (radarId.includes('FIGHTER')) return 'FIGHTER';
    return 'UNKNOWN';
  }

  clearJammers(): void {
    this.activeJammers.clear();
    this.falseContacts = [];
  }

  clearRWRAlerts(aircraftId?: string): void {
    if (aircraftId) {
      this.rwrAlerts.delete(aircraftId);
    } else {
      this.rwrAlerts.clear();
    }
  }
}

export const ewSystem = new EWSystem();
