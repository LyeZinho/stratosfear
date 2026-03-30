import { create } from "zustand";
import { Aircraft, Missile, GameState } from "../types/entities";

/**
 * Read-only simulation state hook.
 * Provides access to current game state without mutations.
 * Updated by SimulationEngine every tick.
 */
interface SimulationStateStore {
  gameState: GameState;
  updateGameState: (state: GameState) => void;
}

export const useSimulationState = create<SimulationStateStore>((set) => ({
  gameState: {
    aircraft: new Map(),
    missiles: new Map(),
    bases: new Map(),
    tick: 0,
    isPaused: false,
    elapsedSeconds: 0,
  },

  updateGameState: (state: GameState) => set({ gameState: state }),
}));

/**
 * Get current snapshot of game state.
 * Useful for reading state without subscribing to updates.
 */
export const getGameState = (): GameState => {
  return useSimulationState.getState().gameState;
};
