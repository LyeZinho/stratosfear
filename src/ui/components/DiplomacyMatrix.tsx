import React from 'react';
import { FactionRelationship } from '../../types/geopolitics';
import { Shield, AlertTriangle, Handshake } from 'lucide-react';

interface DiplomacyMatrixProps {
  relationships: FactionRelationship[];
  factions: Map<string, { name: string }>;
}

export const DiplomacyMatrix: React.FC<DiplomacyMatrixProps> = ({ relationships, factions }) => {
  const getTrustColor = (trust: number): string => {
    if (trust > 75) return 'bg-green-900';
    if (trust > 50) return 'bg-green-800';
    if (trust > 25) return 'bg-yellow-800';
    return 'bg-red-800';
  };

  const getRelationshipStatus = (relationship: FactionRelationship): string => {
    const quality = relationship.trust - relationship.fear + relationship.alignment * 0.5;
    if (quality > 50) return 'ALLIED';
    if (quality > 0) return 'NEUTRAL';
    if (quality > -50) return 'TENSE';
    return 'HOSTILE';
  };

  const uniqueRelationships = relationships.filter((rel, idx, arr) =>
    arr.findIndex(
      (r) =>
        r.factionAId === rel.factionBId &&
        r.factionBId === rel.factionAId &&
        r.factionAId > r.factionBId
    ) === idx
  );

  return (
    <div className="bg-gray-900 border border-cyan-700 rounded p-4">
      <h3 className="text-cyan-400 font-bold mb-4 flex items-center gap-2">
        <Handshake className="w-5 h-5" />
        DIPLOMACY MATRIX
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-2 text-gray-400">From</th>
              <th className="text-left p-2 text-gray-400">To</th>
              <th className="text-center p-2 text-gray-400">Trust</th>
              <th className="text-center p-2 text-gray-400">Fear</th>
              <th className="text-center p-2 text-gray-400">Align</th>
              <th className="text-left p-2 text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {uniqueRelationships.map((rel) => {
              const factionAName = factions.get(rel.factionAId)?.name || rel.factionAId;
              const factionBName = factions.get(rel.factionBId)?.name || rel.factionBId;
              const status = getRelationshipStatus(rel);

              return (
                <tr key={`${rel.factionAId}-${rel.factionBId}`} className="border-b border-gray-800">
                  <td className="p-2">{factionAName}</td>
                  <td className="p-2">{factionBName}</td>
                  <td className={`text-center p-2 ${getTrustColor(rel.trust)}`}>{rel.trust}</td>
                  <td className="text-center p-2 bg-red-900">{rel.fear}</td>
                  <td className="text-center p-2 bg-blue-900">{rel.alignment}</td>
                  <td className="p-2">
                    <span className="px-2 py-1 bg-gray-800 rounded text-gray-300">{status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
