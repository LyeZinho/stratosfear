import { create } from 'zustand';
import { BuildingType, PendingBuilding, GroundUnit, PlaneGroup } from '../types/entities';
import { Lawsuit, CasusBelli, FullIncidentReport } from '../types/geopolitics';

interface PlayerBase {
  id: string;
  name: string;
  lat: number;
  lng: number;
  credits: number;
  fuel: number;        // litres
  missileStock: number;
  maxAircraft: number;
  innerLevel: number;  // 0-5 upgrade tier
  outerRadius: number; // km — base territory
  buildings: PendingBuilding[];
}

interface PlayerState {
  base: PlayerBase;
  groundUnits: GroundUnit[];
  groups: PlaneGroup[];
  lawsuits: Lawsuit[];
  casusBelli: CasusBelli[];
  legalInfluence: number; // 0-100
  crashHistory: FullIncidentReport[];
  missionLog: string[];

  // Actions
  spendCredits: (amount: number) => void;
  earnCredits: (amount: number) => void;
  spendFuel: (amount: number) => void;
  addFuel: (amount: number) => void;
  spendMissile: () => void;
  restockMissile: (count: number) => void;
  addLawsuit: (lawsuit: Lawsuit) => void;
  updateLawsuit: (id: string, patch: Partial<Lawsuit>) => void;
  addCasusBelli: (cb: CasusBelli) => void;
  removeCasusBelli: (id: string) => void;
  increaseLegalInfluence: (cost: number) => void;
  recordCrash: (report: FullIncidentReport) => void;
  addMissionLog: (entry: string) => void;
  upgradeInner: () => void;
  expandOuter: () => void;
  startBuilding: (building: PendingBuilding) => void;
  completeBuilding: (id: string) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  base: {
    id: 'player-base-1',
    name: 'Home Base',
    lat: 38.7,
    lng: -9.1,
    credits: 50000,
    fuel: 100000,
    missileStock: 24,
    maxAircraft: 8,
    innerLevel: 1,
    outerRadius: 50,
    buildings: [],
  },
  groundUnits: [],
  groups: [],
  lawsuits: [],
  casusBelli: [],
  legalInfluence: 10,
  crashHistory: [],
  missionLog: [],

  spendCredits: (amount: number) => {
    set((state) => ({
      base: {
        ...state.base,
        credits: Math.max(0, state.base.credits - amount),
      },
    }));
  },

  earnCredits: (amount: number) => {
    set((state) => ({
      base: {
        ...state.base,
        credits: state.base.credits + amount,
      },
    }));
  },

  spendFuel: (amount: number) => {
    set((state) => ({
      base: {
        ...state.base,
        fuel: Math.max(0, state.base.fuel - amount),
      },
    }));
  },

  addFuel: (amount: number) => {
    set((state) => ({
      base: {
        ...state.base,
        fuel: state.base.fuel + amount,
      },
    }));
  },

  spendMissile: () => {
    set((state) => ({
      base: {
        ...state.base,
        missileStock: Math.max(0, state.base.missileStock - 1),
      },
    }));
  },

  restockMissile: (count: number) => {
    set((state) => ({
      base: {
        ...state.base,
        missileStock: state.base.missileStock + count,
      },
    }));
  },

  addLawsuit: (lawsuit: Lawsuit) => {
    set((state) => ({
      lawsuits: [...state.lawsuits, lawsuit],
    }));
  },

  updateLawsuit: (id: string, patch: Partial<Lawsuit>) => {
    set((state) => ({
      lawsuits: state.lawsuits.map((lawsuit) =>
        lawsuit.id === id ? { ...lawsuit, ...patch } : lawsuit
      ),
    }));
  },

  addCasusBelli: (cb: CasusBelli) => {
    set((state) => ({
      casusBelli: [...state.casusBelli, cb],
    }));
  },

  removeCasusBelli: (id: string) => {
    set((state) => ({
      casusBelli: state.casusBelli.filter((cb) => cb.factionId !== id),
    }));
  },

  increaseLegalInfluence: (cost: number) => {
    set((state) => {
      const newInfluence = Math.min(20, state.legalInfluence + 1);
      const newCredits = Math.max(0, state.base.credits - cost);
      return {
        legalInfluence: newInfluence,
        base: {
          ...state.base,
          credits: newCredits,
        },
      };
    });
  },

  recordCrash: (report: FullIncidentReport) => {
    set((state) => ({
      crashHistory: [...state.crashHistory, report],
    }));
  },

  addMissionLog: (entry: string) => {
    set((state) => ({
      missionLog: [...state.missionLog, entry],
    }));
  },

  upgradeInner: () => {
    set((state) => ({
      base: {
        ...state.base,
        innerLevel: Math.min(5, state.base.innerLevel + 1),
      },
    }));
  },

  expandOuter: () => {
    set((state) => ({
      base: {
        ...state.base,
        outerRadius: state.base.outerRadius + 10,
      },
    }));
  },

  startBuilding: (building: PendingBuilding) => {
    set((state) => ({
      base: {
        ...state.base,
        buildings: [...state.base.buildings, building],
      },
    }));
  },

  completeBuilding: (id: string) => {
    set((state) => ({
      base: {
        ...state.base,
        buildings: state.base.buildings.filter((b) => b.id !== id),
      },
    }));
  },
}));
