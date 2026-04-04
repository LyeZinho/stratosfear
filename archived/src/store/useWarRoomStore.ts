import { create } from 'zustand';
import { FactionState, FactionRelationship, PassiveObjective, NewsArticle, FactionAction } from '../types/geopolitics';

interface WarRoomStore {
  factions: Map<string, FactionState>;
  relationships: FactionRelationship[];
  objectives: PassiveObjective[];
  newsArticles: NewsArticle[];
  aiQueue: FactionAction[];
  selectedFactionId: string | null;
  gameTime: number;
  paused: boolean;

  initializeFactions: (factions: FactionState[]) => void;
  updateFactionState: (factionId: string, updates: Partial<FactionState>) => void;
  addObjective: (objective: PassiveObjective) => void;
  updateObjective: (objectiveId: string, updates: Partial<PassiveObjective>) => void;
  removeObjective: (objectiveId: string) => void;
  addNewsArticle: (article: NewsArticle) => void;
  getNewsByFaction: (factionId: string) => NewsArticle[];
  addAIAction: (action: FactionAction) => void;
  getNextAIAction: () => FactionAction | null;
  completeAIAction: (actionId: string) => void;
  setRelationships: (relationships: FactionRelationship[]) => void;
  setSelectedFaction: (factionId: string | null) => void;
  setGameTime: (time: number) => void;
  setPaused: (paused: boolean) => void;
  getActiveFactionObjectives: (factionId: string) => PassiveObjective[];
  getFactionState: (factionId: string) => FactionState | undefined;
}

export const useWarRoomStore = create<WarRoomStore>((set, get) => ({
  factions: new Map(),
  relationships: [],
  objectives: [],
  newsArticles: [],
  aiQueue: [],
  selectedFactionId: null,
  gameTime: 0,
  paused: false,

  initializeFactions: (factions: FactionState[]) => {
    const factionMap = new Map(factions.map((f) => [f.id, f]));
    set({ factions: factionMap });
  },

  updateFactionState: (factionId: string, updates: Partial<FactionState>) => {
    set((state) => {
      const factions = new Map(state.factions);
      const faction = factions.get(factionId);
      if (faction) {
        factions.set(factionId, { ...faction, ...updates });
      }
      return { factions };
    });
  },

  addObjective: (objective: PassiveObjective) => {
    set((state) => ({
      objectives: [...state.objectives, objective],
    }));
  },

  updateObjective: (objectiveId: string, updates: Partial<PassiveObjective>) => {
    set((state) => ({
      objectives: state.objectives.map((obj) =>
        obj.id === objectiveId ? { ...obj, ...updates } : obj
      ),
    }));
  },

  removeObjective: (objectiveId: string) => {
    set((state) => ({
      objectives: state.objectives.filter((obj) => obj.id !== objectiveId),
    }));
  },

  addNewsArticle: (article: NewsArticle) => {
    set((state) => ({
      newsArticles: [article, ...state.newsArticles].slice(0, 100),
    }));
  },

  getNewsByFaction: (factionId: string) => {
    return get().newsArticles.filter((article) => article.factionId === factionId);
  },

  addAIAction: (action: FactionAction) => {
    set((state) => ({
      aiQueue: [...state.aiQueue, action],
    }));
  },

  getNextAIAction: () => {
    const queue = get().aiQueue;
    if (queue.length === 0) return null;
    return queue.sort((a, b) => b.priority - a.priority)[0];
  },

  completeAIAction: (actionId: string) => {
    set((state) => ({
      aiQueue: state.aiQueue.filter((action) => action.id !== actionId),
    }));
  },

  setRelationships: (relationships: FactionRelationship[]) => {
    set({ relationships });
  },

  setSelectedFaction: (factionId: string | null) => {
    set({ selectedFactionId: factionId });
  },

  setGameTime: (time: number) => {
    set({ gameTime: time });
  },

  setPaused: (paused: boolean) => {
    set({ paused });
  },

  getActiveFactionObjectives: (factionId: string) => {
    return get().objectives.filter(
      (obj) => obj.factionId === factionId && obj.status === 'ACTIVE'
    );
  },

  getFactionState: (factionId: string) => {
    return get().factions.get(factionId);
  },
}));
