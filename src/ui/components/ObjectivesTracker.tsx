import React from 'react';
import { PassiveObjective } from '../../types/geopolitics';
import { Target, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface ObjectivesTrackerProps {
  objectives: PassiveObjective[];
  onObjectiveClick?: (objective: PassiveObjective) => void;
}

export const ObjectivesTracker: React.FC<ObjectivesTrackerProps> = ({
  objectives,
  onObjectiveClick,
}) => {
  const getStatusIcon = (status: PassiveObjective['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'FAILED':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Target className="w-4 h-4 text-gray-400" />;
    }
  };

  const activeObjectives = objectives.filter((obj) => obj.status === 'ACTIVE');

  return (
    <div className="bg-gray-900 border border-cyan-700 rounded p-4">
      <h3 className="text-cyan-400 font-bold mb-4 flex items-center gap-2">
        <Target className="w-5 h-5" />
        PASSIVE OBJECTIVES ({activeObjectives.length})
      </h3>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {objectives.map((obj) => (
          <div
            key={obj.id}
            className="border border-gray-700 rounded p-2 hover:border-cyan-600 cursor-pointer transition"
            onClick={() => onObjectiveClick?.(obj)}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {getStatusIcon(obj.status)}
                <span className="text-sm font-semibold text-gray-300">{obj.type}</span>
              </div>
              <span className="text-xs text-gray-600">{obj.status}</span>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 bg-gray-800 rounded h-2 overflow-hidden">
                <div
                  className="bg-cyan-600 h-full transition-all"
                  style={{ width: `${obj.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{Math.round(obj.progress)}%</span>
            </div>

            <div className="flex justify-between text-xs text-gray-600">
              <span>Revenue: +{obj.revenuePerTick} cr/tick</span>
              <span>Aircraft: {obj.assignedAircraft.length}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
