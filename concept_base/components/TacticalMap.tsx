import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGameStore } from "../store/useGameStore";
import { Side, MissileType, MissionType, AircraftStatus } from "../types/game";
import { Target, Shield, Crosshair, Navigation, XCircle, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Fix para ícones do Leaflet no React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const MapController = () => {
  const map = useMap();
  const { friendlyBase } = useGameStore();

  useEffect(() => {
    map.setView([friendlyBase.position.lat, friendlyBase.position.lng], 8);
  }, [friendlyBase.position, map]);

  return null;
};

const MapClickHandler = ({ onMouseMove }: { onMouseMove?: (lat: number, lng: number) => void }) => {
  const map = useMap();
  const { groundUnits, selectedAircraftId, setGroundUnitTarget, buildMode, outerBaseExpansionMode, selectedBuildingType, placeBuilding, expandBaseOuter, setOuterBaseExpansionMode } = useGameStore();

  useEffect(() => {
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (buildMode && selectedBuildingType) {
        placeBuilding({ lat: e.latlng.lat, lng: e.latlng.lng });
        return;
      }
      
      if (outerBaseExpansionMode) {
        expandBaseOuter({ lat: e.latlng.lat, lng: e.latlng.lng });
        setOuterBaseExpansionMode(false);
        return;
      }
      
      const selectedGroundUnit = groundUnits.find(u => u.id === selectedAircraftId);
      if (selectedGroundUnit && selectedGroundUnit.side === Side.FRIENDLY) {
        setGroundUnitTarget(selectedGroundUnit.id, { lat: e.latlng.lat, lng: e.latlng.lng });
      }
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (onMouseMove) {
        onMouseMove(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleMapClick);
    map.on('mousemove', handleMouseMove);
    return () => {
      map.off('click', handleMapClick);
      map.off('mousemove', handleMouseMove);
    };
  }, [map, groundUnits, selectedAircraftId, setGroundUnitTarget, buildMode, outerBaseExpansionMode, selectedBuildingType, placeBuilding, expandBaseOuter, setOuterBaseExpansionMode, onMouseMove]);

  return null;
};

export const TacticalMap = () => {
  const { 
    aircrafts, 
    friendlyBase, 
    hostileBases, 
    allyBases,
    neutralBases,
    groundUnits,
    missiles,
    selectedAircraftId, 
    selectAircraft,
    setTarget,
    pendingTargetId,
    setPendingTarget,
    buildMode,
    outerBaseExpansionMode,
    selectedBuildingType,
    pendingBuildings
  } = useGameStore();

  const [mousePosition, setMousePosition] = useState<{ lat: number, lng: number } | null>(null);

  const selectedAircraft = aircrafts.find(a => a.id === selectedAircraftId);
  const pendingTarget = aircrafts.find(a => a.id === pendingTargetId) || hostileBases.find(b => b.id === pendingTargetId);

  const getBaseIcon = (side: Side, isSelected: boolean, isPending: boolean = false) => {
    const color = side === Side.FRIENDLY ? "#10b981" : side === Side.ALLY ? "#3b82f6" : side === Side.NEUTRAL ? "#9ca3af" : "#ef4444";
    const highlightColor = isPending ? "#fbbf24" : color;
    const svg = `
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="20" height="20" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2" />
        <path d="M20 5L35 20L20 35L5 20L20 5Z" stroke="${color}" stroke-width="1" stroke-dasharray="2,2" />
        ${isSelected ? `<circle cx="20" cy="20" r="18" stroke="${color}" stroke-width="2" stroke-dasharray="4,4" />` : ""}
        ${isPending ? `<circle cx="20" cy="20" r="18" stroke="${highlightColor}" stroke-width="2" stroke-dasharray="2,2">
          <animate attributeName="stroke-dashoffset" from="0" to="20" dur="1s" repeatCount="indefinite" />
        </circle>` : ""}
      </svg>
    `;
    return L.divIcon({
      html: svg,
      className: "base-icon",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  const getAircraftIcon = (side: Side, heading: number, isSelected: boolean, isDamaged: boolean, isPending: boolean = false) => {
    const color = side === Side.FRIENDLY ? "#3b82f6" : side === Side.HOSTILE ? "#ef4444" : "#9ca3af";
    const highlightColor = isPending ? "#fbbf24" : color;
    const svg = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${heading}deg)">
        <path d="M16 4L22 24L16 20L10 24L16 4Z" fill="${color}" stroke="white" stroke-width="1"/>
        ${isSelected ? `<circle cx="16" cy="16" r="14" stroke="${color}" stroke-width="2" stroke-dasharray="4,4" />` : ""}
        ${isPending ? `<circle cx="16" cy="16" r="14" stroke="${highlightColor}" stroke-width="2" stroke-dasharray="2,2">
          <animate attributeName="stroke-dashoffset" from="0" to="20" dur="1s" repeatCount="indefinite" />
        </circle>` : ""}
        ${isDamaged ? `
          <circle cx="16" cy="16" r="8" fill="#4b5563" opacity="0.6">
            <animate attributeName="r" values="6;10;6" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1s" repeatCount="indefinite" />
          </circle>
        ` : ""}
        <rect x="2" y="2" width="28" height="28" stroke="${color}" stroke-width="1" stroke-dasharray="2,2" />
      </svg>
    `;
    return L.divIcon({
      html: svg,
      className: "aircraft-icon",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const getGroundUnitIcon = (side: Side, isSelected: boolean, status: string) => {
    const color = side === Side.FRIENDLY ? "#10b981" : "#ef4444";
    const svg = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="10" width="20" height="12" rx="2" fill="${color}" stroke="white" stroke-width="1"/>
        <rect x="10" y="6" width="12" height="6" rx="1" fill="${color}" stroke="white" stroke-width="1"/>
        <circle cx="16" cy="12" r="2" fill="white"/>
        ${isSelected ? `<circle cx="16" cy="16" r="14" stroke="${color}" stroke-width="2" stroke-dasharray="4,4" />` : ""}
        ${status === "MOVING" ? `
          <path d="M2 26H30" stroke="${color}" stroke-width="2" stroke-dasharray="4,4">
            <animate attributeName="stroke-dashoffset" from="0" to="8" dur="0.5s" repeatCount="indefinite" />
          </path>
        ` : ""}
      </svg>
    `;
    return L.divIcon({
      html: svg,
      className: "ground-unit-icon",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const getMissileIcon = (side: Side, heading: number, type?: MissileType) => {
    const color = (side === Side.FRIENDLY || side === Side.ALLY) ? "#fbbf24" : "#f87171";
    // Different colors and shapes for different missile types
    let strokeColor = (side === Side.FRIENDLY || side === Side.ALLY) ? "#10b981" : "#ef4444";
    let size = 16;
    let shape = `<path d="M12 2L15 8H9L12 2Z" fill="${color}" stroke="${strokeColor}" stroke-width="1"/>
                 <rect x="11" y="8" width="2" height="12" fill="${color}" stroke="${strokeColor}" stroke-width="0.5"/>`;

    if (type === MissileType.LONG_RANGE) {
      size = 22;
      shape = `<path d="M12 2L16 6V18L12 22L8 18V6L12 2Z" fill="${color}" stroke="${strokeColor}" stroke-width="1.5"/>
               <path d="M6 14L12 12L18 14V18L12 16L6 18V14Z" fill="${color}" stroke="${strokeColor}" stroke-width="1"/>`;
    } else if (type === MissileType.MEDIUM_RANGE) {
      size = 18;
      shape = `<path d="M12 2L15 6V18L12 20L9 18V6L12 2Z" fill="${color}" stroke="${strokeColor}" stroke-width="1"/>
               <path d="M8 12L12 10L16 12V16L12 14L8 16V12Z" fill="${color}" stroke="${strokeColor}" stroke-width="0.8"/>`;
    }

    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${heading}deg)">
        ${shape}
      </svg>
    `;
    return L.divIcon({
      html: svg,
      className: "missile-icon",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const getBuildingIcon = (type: string, status: string) => {
    const color = status === 'COMPLETED' ? '#10b981' : status === 'CONSTRUCTING' ? '#fbbf24' : '#f97316';
    const svg = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="8" width="24" height="18" rx="2" fill="${color}" stroke="white" stroke-width="1.5"/>
        <rect x="8" y="12" width="16" height="2" fill="white" opacity="0.5"/>
        <rect x="8" y="16" width="16" height="2" fill="white" opacity="0.5"/>
        <rect x="8" y="20" width="16" height="2" fill="white" opacity="0.5"/>
        <path d="M16 2L28 8V14L16 20L4 14V8L16 2Z" fill="${color}" stroke="white" stroke-width="1" fill-opacity="0.3"/>
        ${status === 'CONSTRUCTING' ? `
          <circle cx="16" cy="17" r="6" fill="#4b5563" opacity="0.8">
            <animate attributeName="r" values="4;8;4" dur="1.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite"/>
          </circle>
        ` : ''}
      </svg>
    `;
    return L.divIcon({
      html: svg,
      className: "building-icon",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const handleEntityClick = (id: string, side: Side) => {
    if (selectedAircraft && selectedAircraft.side === Side.FRIENDLY && side === Side.HOSTILE) {
      setPendingTarget(id);
    } else {
      selectAircraft(id);
    }
  };

  return (
    <div className="w-full h-full bg-slate-900 relative overflow-hidden">
      <MapContainer
        center={[friendlyBase.position.lat, friendlyBase.position.lng]}
        zoom={8}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        <MapController />
        <MapClickHandler onMouseMove={(lat, lng) => setMousePosition({ lat, lng })} />

        {/* Radar Range da Base Amigável com Sweep Animation */}
        <Circle
          center={[friendlyBase.position.lat, friendlyBase.position.lng]}
          radius={friendlyBase.radarRange * 1000}
          pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.02, weight: 1, dashArray: "5, 10" }}
        />

        {/* Ally Bases */}
        {allyBases.map(base => {
          const baseColor = base.factionColor || "#3b82f6";
          return (
            <div key={base.id}>
              <Circle
                center={[base.position.lat, base.position.lng]}
                radius={base.radarRange * 1000}
                pathOptions={{ color: baseColor, fillColor: baseColor, fillOpacity: 0.01, weight: 1, dashArray: "5, 10" }}
              />
              <Marker 
                position={[base.position.lat, base.position.lng]} 
                icon={getBaseIcon(Side.ALLY, selectedAircraftId === base.id)}
                eventHandlers={{ click: () => selectAircraft(base.id) }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold" style={{ color: baseColor }}>{base.name}</h3>
                    <p className="text-xs">Fação: {base.factionId || 'Aliada'}</p>
                    <p className="text-xs">Status: Operacional</p>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}

        {/* Neutral Bases */}
        {neutralBases.map(base => {
          const baseColor = base.factionColor || "#6b7280";
          return (
            <div key={base.id}>
              <Marker 
                position={[base.position.lat, base.position.lng]} 
                icon={getBaseIcon(Side.NEUTRAL, selectedAircraftId === base.id)}
                eventHandlers={{ click: () => selectAircraft(base.id) }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold" style={{ color: baseColor }}>{base.name}</h3>
                    <p className="text-xs">Fação: {base.factionId || 'Neutra'}</p>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}

        {/* Base Principal Amigável */}
        <Marker 
          position={[friendlyBase.position.lat, friendlyBase.position.lng]} 
          icon={getBaseIcon(Side.FRIENDLY, true)}
          eventHandlers={{ click: () => selectAircraft(friendlyBase.id) }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-bold text-emerald-500">{friendlyBase.name}</h3>
              <p className="text-xs">Status: Operacional</p>
            </div>
          </Popup>
        </Marker>

        {/* Bases Inimigas */}
        {hostileBases.map(base => {
          const baseColor = base.factionColor || "#ef4444";
          return (
            <div key={base.id}>
              <Circle
                center={[base.position.lat, base.position.lng]}
                radius={base.radarRange * 1000}
                pathOptions={{ color: baseColor, fillColor: baseColor, fillOpacity: 0.01, weight: 1, dashArray: "5, 10" }}
              />
              <Marker 
                position={[base.position.lat, base.position.lng]} 
                icon={getBaseIcon(Side.HOSTILE, false, pendingTargetId === base.id)}
                eventHandlers={{ click: () => handleEntityClick(base.id, Side.HOSTILE) }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold" style={{ color: baseColor }}>{base.name}</h3>
                    <p className="text-xs">Fação: {base.factionId || 'Hostil'}</p>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}

        {/* Pending Buildings */}
        {pendingBuildings.map(b => (
          <Marker
            key={b.id}
            position={[b.position.lat, b.position.lng]}
            icon={getBuildingIcon(b.type, b.status)}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold">{b.type}</h3>
                <p className="text-xs">Status: {b.status}</p>
                {b.assignedAircraftId && <p className="text-xs">Aircraft: {b.assignedAircraftId}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Build Mode Cursor */}
        {buildMode && selectedBuildingType && mousePosition && (
          <CircleMarker
            center={[mousePosition.lat, mousePosition.lng]}
            radius={12}
            pathOptions={{ color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 0.3, weight: 2, dashArray: "5,5" }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-amber-500">Modo Construção</h3>
                <p className="text-xs">Clique no mapa para posicionar {selectedBuildingType}</p>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {outerBaseExpansionMode && mousePosition && (
          <CircleMarker
            center={[mousePosition.lat, mousePosition.lng]}
            radius={20}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2, weight: 3, dashArray: "10,5" }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-blue-500">Forward Base Expansion</h3>
                <p className="text-xs">Clique para selecionar local da nova base</p>
                <p className="text-xs text-red-400">Custo: 75,000Cr + 30,000L combustível</p>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* Ground Units */}
        {groundUnits.map(u => (
          <div key={u.id}>
            {u.side === Side.FRIENDLY && u.targetPosition && u.status === "MOVING" && (
              <Polyline
                positions={[
                  [u.position.lat, u.position.lng],
                  [u.targetPosition.lat, u.targetPosition.lng]
                ]}
                pathOptions={{ color: "#10b981", weight: 1, opacity: 0.4, dashArray: "5, 5" }}
              />
            )}
            <Circle
              center={[u.position.lat, u.position.lng]}
              radius={u.radarRangeKm * 1000}
              pathOptions={{ color: u.side === Side.FRIENDLY ? "#10b981" : "#ef4444", fillColor: u.side === Side.FRIENDLY ? "#10b981" : "#ef4444", fillOpacity: 0.01, weight: 1, dashArray: "2, 8" }}
            />
            <Marker
              position={[u.position.lat, u.position.lng]}
              icon={getGroundUnitIcon(u.side, selectedAircraftId === u.id, u.status)}
              eventHandlers={{ click: () => selectAircraft(u.id) }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-bold">{u.type}</p>
                  <p>ID: {u.id.split("-")[0]}</p>
                  <p>STATUS: {u.status}</p>
                  <p>HEALTH: {Math.round(u.health)}%</p>
                </div>
              </Popup>
            </Marker>
          </div>
        ))}

        {/* Aeronaves */}
        {aircrafts.map((ac) => {
          const isDetected = (ac.side === Side.FRIENDLY || (ac.lastDetected && Date.now() - ac.lastDetected < 10000)) && ac.status !== AircraftStatus.HANGAR;
          if (!isDetected) return null;

          const target = ac.targetId ? (aircrafts.find(a => a.id === ac.targetId) || hostileBases.find(b => b.id === ac.targetId) || (friendlyBase.id === ac.targetId ? friendlyBase : null)) : null;

          return (
            <div key={ac.id}>
              {/* Flight Path / Patrol Route */}
              {ac.side === Side.FRIENDLY && selectedAircraftId === ac.id && (
                <>
                  {target && (
                    <Polyline
                      positions={[
                        [ac.position.lat, ac.position.lng],
                        [target.position.lat, target.position.lng]
                      ]}
                      pathOptions={{ color: "#3b82f6", weight: 2, opacity: 0.6, dashArray: "10, 10" }}
                    />
                  )}
                  {!target && ac.patrolTarget && (
                    <Polyline
                      positions={[
                        [ac.position.lat, ac.position.lng],
                        [ac.patrolTarget.lat, ac.patrolTarget.lng]
                      ]}
                      pathOptions={{ color: "#10b981", weight: 2, opacity: 0.4, dashArray: "5, 5" }}
                    />
                  )}
                </>
              )}

              {/* Pending Target Line */}
              {ac.side === Side.FRIENDLY && selectedAircraftId === ac.id && pendingTarget && (
                <Polyline
                  positions={[
                    [ac.position.lat, ac.position.lng],
                    [pendingTarget.position.lat, pendingTarget.position.lng]
                  ]}
                  pathOptions={{ color: "#fbbf24", weight: 2, opacity: 0.8, dashArray: "2, 4" }}
                />
              )}

              {ac.targetId && target && ac.side === Side.HOSTILE && (
                <Polyline
                  positions={[
                    [ac.position.lat, ac.position.lng],
                    [target.position.lat, target.position.lng]
                  ]}
                  pathOptions={{ color: "#ef4444", weight: 1, opacity: 0.3, dashArray: "5, 5" }}
                />
              )}
              <Polyline
                positions={ac.trail.map(t => [t.lat, t.lng])}
                pathOptions={{ color: ac.side === Side.FRIENDLY ? "#3b82f6" : "#ef4444", weight: 1, opacity: 0.5, dashArray: "2, 4" }}
              />
              <Marker
                position={[ac.position.lat, ac.position.lng]}
                icon={getAircraftIcon(ac.side, ac.heading, selectedAircraftId === ac.id, ac.isDamaged, pendingTargetId === ac.id)}
                eventHandlers={{
                  click: () => handleEntityClick(ac.id, ac.side),
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">{ac.spec.model}</p>
                    <p>ID: {ac.id.split("-")[0]}</p>
                    <p>ALT: {Math.round(ac.altitude)} ft</p>
                    <p>SPD: Mach {ac.speed.toFixed(2)}</p>
                    <p>HEALTH: {Math.round(ac.health)}%</p>
                    <p>STATUS: {ac.status}</p>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}

        {/* Mísseis */}
        {missiles.map(m => {
          const target = aircrafts.find(a => a.id === m.targetId) || groundUnits.find(u => u.id === m.targetId) || hostileBases.find(b => b.id === m.targetId) || (friendlyBase.id === m.targetId ? friendlyBase : null);
          return (
            <div key={m.id}>
              {target && (
                <>
                  <Polyline
                    positions={[
                      [m.position.lat, m.position.lng],
                      [target.position.lat, target.position.lng]
                    ]}
                    pathOptions={{ color: (m.side === Side.FRIENDLY || m.side === Side.ALLY) ? "#10b981" : "#ef4444", weight: 1, opacity: 0.2, dashArray: "2, 2" }}
                  />
                  <Circle 
                    center={[target.position.lat, target.position.lng]}
                    radius={500}
                    pathOptions={{ color: (m.side === Side.FRIENDLY || m.side === Side.ALLY) ? "#10b981" : "#ef4444", weight: 1, fillOpacity: 0.1 }}
                  />
                </>
              )}
              <Polyline
                positions={m.trail.map(t => [t.lat, t.lng])}
                pathOptions={{ color: (m.side === Side.FRIENDLY || m.side === Side.ALLY) ? "#10b981" : "#ef4444", weight: 1, opacity: 0.4, dashArray: "1, 3" }}
              />
              <Marker
                position={[m.position.lat, m.position.lng]}
                icon={getMissileIcon(m.side, m.heading, m.type)}
              />
            </div>
          );
        })}
      </MapContainer>
      
      {/* Scanline Effect moved to App.tsx */}
    </div>
  );
};
