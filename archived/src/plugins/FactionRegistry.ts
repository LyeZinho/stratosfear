import { RegistryBase } from './RegistryBase';
import { FactionSpecification } from '../types/geopolitics';

export class FactionRegistry extends RegistryBase<FactionSpecification> {
  constructor() {
    super();
    this.registerDefaultFactions();
  }

  private registerDefaultFactions(): void {
    // PLAYER faction
    this.register('PLAYER', {
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
    this.register('BLUE_ALLIANCE', {
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
    this.register('RED_STAR_EMPIRE', {
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
    this.register('IRON_GUARD_COALITION', {
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
    this.register('GRAY_WOLVES', {
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

  getFaction(id: string): FactionSpecification | undefined {
    return this.items.has(id) ? this.get(id) : undefined;
  }

  getFactionsByAllegiance(allegiance: FactionSpecification['allegiance']): FactionSpecification[] {
    return this.getAll().filter((f) => f.allegiance === allegiance);
  }

  getAIFactions(): FactionSpecification[] {
    return this.getAll().filter((f) => f.id !== 'PLAYER');
  }
}

export const factionRegistry = new FactionRegistry();
