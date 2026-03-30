import { create } from "zustand";

/**
 * UI state hook (mutable).
 * Only contains UI/UX concerns: selections, UI modes, logs, settings.
 * Does NOT contain game simulation state.
 */
interface GameUIStore {
  selectedAircraftId: string | null;
  logs: string[];
  isPaused: boolean;
  buildMode: boolean;
  selectedBuildingType: string | null;

  selectAircraft: (id: string | null) => void;
  addLog: (message: string) => void;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;
  setBuildMode: (enabled: boolean) => void;
  setSelectedBuildingType: (type: string | null) => void;
  clearLogs: () => void;
}

export const useGameUI = create<GameUIStore>((set) => ({
  selectedAircraftId: null,
  logs: [],
  isPaused: false,
  buildMode: false,
  selectedBuildingType: null,

  selectAircraft: (id) => set({ selectedAircraftId: id }),

  addLog: (message) =>
    set((state) => {
      const newLogs = [message, ...state.logs].slice(0, 100);
      return { logs: newLogs };
    }),

  setPaused: (paused) => set({ isPaused: paused }),

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  setBuildMode: (enabled) => set({ buildMode: enabled }),

  setSelectedBuildingType: (type) => set({ selectedBuildingType: type }),

  clearLogs: () => set({ logs: [] }),
}));
