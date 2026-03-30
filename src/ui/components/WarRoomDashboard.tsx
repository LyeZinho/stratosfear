import React, { useMemo } from 'react';
import { useWarRoomStore } from '../../store/useWarRoomStore';
import { GlobalMonitor } from './GlobalMonitor';
import { DiplomacyMatrix } from './DiplomacyMatrix';
import { ObjectivesTracker } from './ObjectivesTracker';
import { ResourcesDisplay } from './ResourcesDisplay';
import { Radar } from 'lucide-react';

export const WarRoomDashboard: React.FC = () => {
  const {
    factions,
    relationships,
    objectives,
    newsArticles,
    selectedFactionId,
    setSelectedFaction,
    gameTime,
    paused,
  } = useWarRoomStore();

  const selectedFaction = useMemo(() => {
    if (!selectedFactionId) return undefined;
    return factions.get(selectedFactionId);
  }, [selectedFactionId, factions]);

  const factionNamesMap = useMemo(() => {
    const map = new Map<string, { name: string }>();
    factions.forEach((faction) => {
      map.set(faction.id, { name: faction.id });
    });
    return map;
  }, [factions]);

  const activeFactionObjectives = useMemo(() => {
    if (!selectedFactionId) return [];
    return objectives.filter((obj) => obj.factionId === selectedFactionId);
  }, [selectedFactionId, objectives]);

  return (
    <div className="w-full h-full bg-gray-950 text-gray-100 overflow-hidden">
      <div className="bg-gray-900 border-b border-gray-800 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radar className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl font-bold text-cyan-400">WAR ROOM COMMAND CENTER</h1>
        </div>
        <div className="text-xs text-gray-500">
          <div>Game Time: {(gameTime / 1000).toFixed(1)}s</div>
          <div className={paused ? 'text-red-400' : 'text-green-400'}>
            {paused ? 'PAUSED' : 'RUNNING'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 p-4 h-[calc(100%-60px)] overflow-hidden">
        <div className="col-span-1 space-y-4 overflow-y-auto">
          <div className="bg-gray-900 border border-cyan-700 rounded p-4">
            <h3 className="text-cyan-400 font-bold mb-3">SELECT FACTION</h3>
            <div className="space-y-2">
              {Array.from(factions.keys()).map((factionId) => (
                <button
                  key={factionId}
                  onClick={() => setSelectedFaction(factionId)}
                  className={`w-full text-left px-3 py-2 rounded transition ${
                    selectedFactionId === factionId
                      ? 'bg-cyan-700 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {factionId}
                </button>
              ))}
            </div>
          </div>

          <ResourcesDisplay
            faction={selectedFaction}
            factionName={selectedFactionId || undefined}
          />
        </div>

        <div className="col-span-1 overflow-hidden">
          <GlobalMonitor
            articles={newsArticles}
            onArticleClick={(article) => console.log('Article clicked:', article)}
          />
        </div>

        <div className="col-span-1 space-y-4 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            <ObjectivesTracker
              objectives={activeFactionObjectives}
              onObjectiveClick={(obj) => console.log('Objective clicked:', obj)}
            />
          </div>
        </div>

        <div className="col-span-1 overflow-hidden">
          <DiplomacyMatrix relationships={relationships} factions={factionNamesMap} />
        </div>
      </div>
    </div>
  );
};
