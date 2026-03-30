# Phase 16: STRATOSFEAR - Full Implementation Specification

**Status**: Design Phase (Implementation starting after research agents complete)  
**Date**: 2026-03-30  
**Scope**: Full STRATOSFEAR system with 15 factions, damage mechanics, terrain system, incident reports, lore  
**Effort Estimate**: 15-18 hours  

---

## 1. STRATOSFEAR Lore & Context

### The Eden-Down Protocol (2031)

After the "Fertilizer Wars" nearly rendered Earth's soil permanently sterile, global nations signed the **Tratado de Exclusão de Solo** (Treaty of Soil Exclusion):

- **The Rule**: No projectile may strike earth. No ground-based armor. Violators face immediate global economic annihilation.
- **The Consequence**: Ground became sanctuary. Sky became the last bloodbath.
- **The Market**: War became entirely aerial. Factions are now corporations, not nations.

### The Player's Position: General of Terminal Echo Station

You're not a war hero. You're a **manager of sunk costs**.

**Assigned to**: Terminal Echo Station (a crumbling base in a "low-density economic zone")  
**Your Mission**: Keep the sector "stable enough" so executives don't notice it exists  
**The Twist**: Your base accidentally sits atop a critical fiber-optic cable (or fuel corridor). Suddenly, you're valuable. And everyone wants you dead.

---

## 2. The 15 Factions: Market Profiles & AI Behaviors

Each faction has:
- **Market Profile**: How expensive is a loss for them?
- **Preferred Doctrine**: Attack pattern, aircraft type, evasion style
- **Stock Volatility**: How fast does price react to combat?
- **AI Personality**: Behavior tree weights for decision-making
- **Lore Flavor**: 1-sentence market positioning

| ID | Faction Name | Market Profile | Preferred Aircraft | AI Personality | Stock Volatility | Lore |
|---|---|---|---|---|---|---|
| 1 | **Euro-Consolidada** (EC) | Conservative, High-Margin | Gripen, Eurofighter | Precision (90% Pk before fire) | Low (-2% loss, +3% win) | "Order through Superior Engineering" |
| 2 | **Bloco Neo-Soviético** (BNS) | Volume Player, Accepts Losses | MiG-29, Su-27 | Saturation (quantity over quality) | High (-8% loss, +2% win) | "Physics Solves All Problems" |
| 3 | **Pacífico-Aegis** (PAN) | Ultra-Long-Range Specialist | F-15EX, F-35 | BVR-First (attacks beyond visual) | Medium (-5% loss, +4% win) | "See First, Kill First" |
| 4 | **Liga dos Andes** (LA) | Terrain Master | A-10, Super Tucano | Low-Altitude Terrain Following | Medium (-6% loss, +2% win) | "The Mountains Are Ours" |
| 5 | **Sindicato Petrolífero** (SP) | Endurance Specialist | Su-30, F-15E | 24-Hour CAP Patrols | Low (-3% loss, +2% win) | "Fuel Is Our Superweapon" |
| 6 | **Coletivo Escandinavo** (CE) | EW Specialist | Gripen-E, GlobalEye | Jamming-First (avoid detection) | Medium (-4% loss, +3% win) | "The Invisible War" |
| 7 | **Aliança do Dragão** (AD) | Zerg Rush | JF-17, PL-15 | Overwhelming Numbers | Very High (-15% loss, +5% win) | "Quantity Has Quality of Its Own" |
| 8 | **União Africana Tech** (UAT) | Drone Swarms | MQ-9 Reaper, Loitering Munitions | Cheap Autonomous Attacks | Very High (-10% loss, +3% win) | "The Future Is Autonomous" |
| 9 | **Mercenários Void** (MV) | No Fixed Base | Rafale, F-18 | Random Attack Vectors | Medium (-7% loss, +4% win) | "Always Hire Mercenaries, Never Trust Them" |
| 10 | **Conselho de Genebra** (CG) | Neutral Enforcer | Mirage 2000 | Defensive (attacks violators only) | Low (-2% loss, +1% win) | "The Rules Must Be Followed" |
| 11 | **Zelotes do Solo** (ZS) | Anti-Low-Alt Extremists | SAM Batteries, MANPADS | Ground-Based Defense | Static | "The Sky Below 500m Is Sacred" |
| 12 | **Hanseática Moderna** (HM) | Commercial Escort | C-130, C-17 | Defensive Convoy Protection | Low (-1% loss, +2% win) | "Whoever Pays Gets Safe Passage" |
| 13 | **Indo-Fênix** (IF) | Dogfight Specialists | Su-30MKI, Tejas | WVR Aggressive (close combat) | High (-8% loss, +4% win) | "Victory Through Maneuver" |
| 14 | **Cartel de Satélites** (CS) | ISR Monopoly | E-3 AWACS, JSTAR | OTH Detection (see beyond horizon) | Low (-2% loss, +2% win) | "Information Is Cheaper Than Missiles" |
| 15 | **Aether-Vanguard** (AV) | Player's Faction | F-16C, F-15C | Balanced (player-controlled) | Medium (-4% loss, +3% win) | "We Fire When We're Ready" |

---

## 3. Terrain System: The Geography of Bankruptcy

### Terrain Types & Damage Multipliers

When an aircraft crashes, damage is calculated based on impact location:

| Terrain Type | Multiplier | Pilot Survival | Environmental Cost | Stock Impact | Context |
|---|---|---|---|---|---|
| **Urban Metropolis** | 15.0x | 10% | Max (Toxins, Rubble) | -20% crash | Paris, NY, São Paulo: Any crash is disaster |
| **Urban Suburban** | 8.0x | 20% | High (Residential) | -12% crash | Middle-density areas, neighborhoods |
| **Rural/Agricultural** | 3.5x | 40% | Medium (Farm Damage) | -5% crash | Farmland, sparse settlements |
| **Forest/Reserve** | 5.0x | 30% | High (Crime Ambiental) | -8% crash | Protected forests (environmental lawsuit) |
| **Desert/Badlands** | 0.5x | 65% | Low (Natural Evaporation) | -1% crash | Empty wasteland, self-cleaning |
| **Ocean/International Waters** | 0.0x | 50% | Zero (Dilution) | 0% crash | No jurisdiction, no liability |
| **Mountain Range** | 2.0x | 35% | Medium (Rescue Cost) | -3% crash | Expensive rescue operations |
| **Military Base (Enemy)** | 0.2x | 5% | Combat Norm | +2% crash | Direct military engagement (bonus for winner) |
| **Military Base (Friendly)** | 1.0x | 80% | Protocol | -10% crash | Known landing zone, recovery point |

### How Terrain Affects AI Behavior

When damaged, the AI calculates:

```
SafetyScore = -( MileToTerrainType * Multiplier ) / FuelRemaining

// AI pathfinds toward highest SafetyScore
// Ocean = Score of 100 (free escape)
// Urban = Score of -500 (expensive death)
```

The AI will **burn fuel flying toward the ocean** rather than crash over a city.

---

## 4. Damage Calculation: The "Custo do Destroço" (Wreckage Cost)

### Formula

```
TOTAL_COST = (Aircraft_Model_Cost * Terrain_Multiplier) 
           + (Pilot_Casualty_Cost * Pilot_Status) 
           + (Environmental_Damage_Cost * Fuel_Remaining)
           + (Process_Cost * Violation_Type)
```

### Component Breakdown

#### 1. Aircraft Model Cost

Based on replacement value:
- F-16C: $80M base cost
- Su-27: $90M base cost
- MiG-29: $40M base cost
- F-35: $150M base cost
- C-130: $200M base cost
- MQ-9: $15M base cost

#### 2. Pilot Status (Multiplier)

- **KIA (Killed in Action)**: 1.0x = Full casualty cost ($3M + compensation)
- **Wounded (Ejected but injured)**: 0.3x = Hospitalization + recovery
- **Safe Eject**: 0.0x = No pilot casualty cost

**Survival Chance (Random 0-100)**:
- Ocean: 50%
- Desert: 65%
- Mountain: 35%
- Forest: 30%
- Rural: 40%
- Suburban: 20%
- Urban: 10%

#### 3. Environmental Damage (Fuel-based)

Fuel remaining when crashed:
- Full tank: $50,000 per 1,000L (JP-8 at $50/L)
- Half tank: $25,000
- Empty: $0

#### 4. Process Cost (Violation Type)

- **Soil Violation** (ground impact): +$100,000 (UN inquiry)
- **Urban Area Violation**: +$500,000 (if metro crash)
- **Protected Forest**: +$250,000 (environmental lawsuit)
- **Allied Territory**: +$200,000 (diplomatic incident)
- **War Crime Flag** (civilians harmed): +$1,000,000 (market trust lost)

---

## 5. The IncidentReport Component

### Trigger

Fires whenever `Aircraft.altitude === 0 OR Aircraft.health === 0`:

```typescript
// In SimulationEngine.ts
if (aircraft.altitude <= 0) {
  const report = calculateCrashReport(aircraft, coordinates);
  showIncidentReport(report);
}
```

### Data Structure

```typescript
interface IncidentReport {
  id: string;
  timestamp: number;
  aircraft: {
    id: string;
    model: string;
    faction: string;
    pilot: string;
  };
  location: {
    lat: number;
    lng: number;
    terrainType: TerrainType;
    nearestCity?: string;
  };
  damages: {
    aircraftLoss: number;
    pilotStatus: 'KIA' | 'WOUNDED' | 'SAFE';
    pilotCost: number;
    environmentalCost: number;
    processCost: number;
  };
  totalCost: number;
  factionStock: {
    before: number;
    change: number;
    after: number;
  };
  responsibility: 'VICTIM' | 'PERPETRATOR' | 'NEUTRAL';
}
```

### UI Component: IncidentReport.tsx

```typescript
// src/ui/components/IncidentReport.tsx
import React from 'react';
import { AlertTriangle, DollarSign, Users, Zap, TrendingDown } from 'lucide-react';

interface IncidentReportProps {
  report: IncidentReport;
  onDismiss: () => void;
}

export const IncidentReport: React.FC<IncidentReportProps> = ({ report, onDismiss }) => {
  const isPlayerResponsible = report.responsibility === 'PERPETRATOR';

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
      {/* Modal Panel */}
      <div className="w-full max-w-2xl bg-slate-950 border-2 border-red-900 shadow-2xl font-mono">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950 to-slate-900 p-4 flex items-center gap-3 border-b border-red-900">
          <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
          <div>
            <h2 className="text-xl font-bold text-red-500 tracking-tighter">RELATÓRIO DE IMPACTO CINÉTICO</h2>
            <p className="text-xs text-slate-400">ID: STR-{report.id.slice(0, 6).toUpperCase()}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Primary Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">ATIVO PERDIDO</p>
              <p className="text-lg font-bold text-slate-100">{report.aircraft.model}</p>
              <p className="text-xs text-slate-400">{report.aircraft.faction}</p>
            </div>
            <div>
              <p className="text-slate-500">ZONA DE IMPACTO</p>
              <p className={`text-lg font-bold ${
                report.location.terrainType === 'URBAN_METROPOLIS' ? 'text-red-500' :
                report.location.terrainType === 'OCEAN' ? 'text-blue-500' :
                'text-amber-500'
              }`}>
                {report.location.terrainType.replace(/_/g, ' ')}
              </p>
              {report.location.nearestCity && (
                <p className="text-xs text-slate-400">{report.location.nearestCity}</p>
              )}
            </div>
          </div>

          {/* Damage Breakdown */}
          <div className="border-t border-slate-800 pt-4 space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Perda de Aeronave
              </span>
              <span className="text-slate-200">${(report.damages.aircraftLoss).toLocaleString()}</span>
            </div>

            {report.damages.pilotCost > 0 && (
              <div className="flex justify-between items-center">
                <span className={`text-slate-500 flex items-center gap-2 ${
                  report.damages.pilotStatus === 'KIA' ? 'text-red-500' : 'text-amber-500'
                }`}>
                  <Users className="w-4 h-4" /> Status do Piloto
                </span>
                <span className={`${
                  report.damages.pilotStatus === 'KIA' ? 'text-red-600' : 'text-amber-500'
                }`}>
                  {report.damages.pilotStatus === 'KIA' ? 'ÓBITO CONFIRMADO' : 'FERIDO - RESGATE EM ANDAMENTO'}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Dano Ambiental (JP-8)</span>
              <span className="text-slate-200">${(report.damages.environmentalCost).toLocaleString()}</span>
            </div>

            {report.damages.processCost > 0 && (
              <div className="flex justify-between items-center border-t border-slate-700 pt-2 text-red-500">
                <span>Processos Legais</span>
                <span>-${(report.damages.processCost).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Total & Stock Impact */}
          <div className="bg-slate-900/50 p-4 rounded border border-slate-800 space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-2xl font-bold text-amber-500 tracking-tighter">TOTAL A PAGAR</span>
              <span className="text-3xl font-black text-red-500">${(report.totalCost).toLocaleString()}</span>
            </div>

            <div className="pt-2 border-t border-slate-700 text-xs">
              <p className="text-slate-500">Impacto nas Ações</p>
              <div className="flex items-center gap-2 mt-1">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-slate-200">
                  ${report.factionStock.before} → ${report.factionStock.after}
                  <span className={`ml-2 font-bold ${report.factionStock.change < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    ({report.factionStock.change > 0 ? '+' : ''}{report.factionStock.change}%)
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Narrative Message */}
          {isPlayerResponsible && (
            <div className="bg-red-950/20 border border-red-900 p-3 rounded text-xs text-red-300 italic">
              "O Conselho Executivo já recebeu notificação. Seus bônus foram ajustados para refletir a realidade de mercado."
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900 p-4 border-t border-slate-800 flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-600 text-red-500 rounded text-sm font-bold transition-colors"
          >
            RECONHECER RESPONSABILIDADE
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded text-sm font-bold transition-colors"
          >
            FECHAR RELATÓRIO
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 6. Welcome Message: "Purgatório de Radar"

Appears on first login as terminal output:

```
╔════════════════════════════════════════════════════════════════╗
║         AETHER-VANGUARD OPERATIONS COMMAND CENTER             ║
║           TERMINAL ECHO STATION - SECURE CHANNEL              ║
╚════════════════════════════════════════════════════════════════╝

[2026-03-30 06:00 UTC] INCOMING TRANSMISSION FROM: DIR. STERLING

General [YOUR_ID],

Parabéns pela sua 'promoção'. Se você está lendo isto, o Departamento de Recursos 
Humanos finalmente encontrou um uso para seu histórico de insubordinação.

Você foi designado para a Estação Terminal Echo.

─────────────────────────────────────────────────────────────────

ANÁLISE ESTRATÉGICA:

No mapa estratégico da Aether-Vanguard, sua base é um erro de arredondamento. 
É um pedaço de asfalto rachado cercado por facções que adorariam converter seus 
hangares em sucata de luxo.

Aqui estão suas diretrizes de sobrevivência corporativa:

1. O CÉU É O BALANCETE
   Cada F-16 sob seu comando é um investimento de capital. Se você perder um avião 
   em uma patrulha inútil, o prejuízo sai do seu bônus trimestral — e da sua 
   expectativa de vida.

2. O SOLO É SAGRADO (E INÚTIL)
   Lembre-se do Tratado. Se um único cartucho de 20mm atingir a grama, os advogados 
   das outras facções vão nos devorar vivos. Mantenha a briga onde ela pertence: 
   na estratosfera.

3. RADAR É CONFIANÇA
   O mercado odeia incerteza. Se um ponto desconhecido aparecer no seu radar e você 
   não o identificar, as nossas ações caem. Se você o abater e ele for um cargueiro 
   neutro, as ações caem MAIS ainda.

4. NOTCHING É FRAUDE
   Esconder esquadrões através de manobras ou relevo não é apenas tática militar — é 
   fraude financeira contra o mercado.

─────────────────────────────────────────────────────────────────

Não esperamos grandes conquistas. Apenas mantenha o setor 'estável' o suficiente 
para que os nossos investidores não percebam que o lugar existe.

Ah, e tente não ser abatido na primeira semana. O custo burocrático de assinar 
seu atestado de óbito é irritante.

Bem-vindo ao STRATOSFEAR.

Faça o gráfico subir.

─────────────────────────────────────────────────────────────────

[SYSTEM] Primeira missão gerada: Identificar 3 contatos civis (Squawk codes)
[SYSTEM] Bônus se completo: +5% nas ações de Aether-Vanguard
[SYSTEM] Penalidade se falhar: -15% + demissão

> _
```

---

## 7. Implementation Roadmap: Phase 16 Components

### 7.1 Type System Extensions

**File**: `src/types/geopolitics.ts` (EXTEND existing)

```typescript
// Add to existing geopolitics.ts:

export type TerrainType = 
  | 'URBAN_METROPOLIS' 
  | 'URBAN_SUBURBAN' 
  | 'RURAL_AGRICULTURAL' 
  | 'FOREST_RESERVE' 
  | 'DESERT_BADLANDS' 
  | 'OCEAN_INTERNATIONAL' 
  | 'MOUNTAIN_RANGE' 
  | 'MILITARY_BASE_ENEMY' 
  | 'MILITARY_BASE_FRIENDLY';

export interface IncidentReport {
  id: string;
  timestamp: Tick;
  aircraft: Aircraft;
  location: {
    lat: number;
    lng: number;
    terrainType: TerrainType;
    nearestCity?: string;
  };
  damages: {
    aircraftLoss: number;
    pilotStatus: 'KIA' | 'WOUNDED' | 'SAFE';
    pilotCost: number;
    environmentalCost: number;
    processCost: number;
  };
  totalCost: number;
  responsibility: 'VICTIM' | 'PERPETRATOR' | 'NEUTRAL';
}

export interface FactionAIPersonality {
  factionId: string;
  behaviors: {
    attackAggressiveness: 0-100; // How likely to engage
    evasionCaution: 0-100; // How likely to retreat
    terrainPreference: TerrainType[]; // Preferred operating zones
    communicationStyle: 'SILENT' | 'CHATTER' | 'FORMAL' | 'ANONYMOUS';
    riskTolerance: 0-100; // Willing to lose expensive planes?
  };
  stockVolatility: {
    lossImpact: number; // -% per loss
    victoryImpact: number; // +% per win
  };
}

export interface CrashEvent {
  timestamp: Tick;
  aircraftId: string;
  factionId: string;
  position: Coordinates;
  terrainType: TerrainType;
  report: IncidentReport;
}
```

### 7.2 Systems

**File**: `src/systems/TerrainDetectionSystem.ts` (NEW)

- Detects terrain type from coordinates
- Integrates with OpenStreetMap or Mapbox API
- Caches results for performance
- Returns: TerrainType + confidence score

**File**: `src/systems/DamageCalculationSystem.ts` (NEW)

- Takes IncidentReport input
- Calculates all cost components
- Updates faction stock
- Generates Chronicle headline

**File**: `src/systems/AIEvasionSystem.ts` (EXTEND from AIDecisionSystem)

- Pathfinds to cheap-damage zones
- Weights terrain cost into route calculation
- Decides when to eject vs. fly home
- Updates behavior based on damaged state

**File**: `src/systems/FactionAIPersonalitySystem.ts` (NEW)

- 15 faction profiles with behaviors
- Applies personality multipliers to AI decisions
- Loads at game start
- Returns behavior weights for each faction

### 7.3 UI Components

- `IncidentReport.tsx` - Modal popup for crash reports
- `WarLedger.tsx` - Stock ticker (EXTEND from Phase 15)
- `WelcomeTerminal.tsx` - First-login message
- `CrashZoneIndicator.tsx` - Visual marker on map for dangerous areas

### 7.4 Integration Points

- **SimulationEngine**: Hook crash detection → trigger IncidentReport
- **WarRoomStore**: Store crash history, update faction stocks
- **Leaflet Map**: Visual overlays for terrain zones + crash sites
- **NewsGeneratorSystem**: Convert crashes into financial headlines

---

## 8. Faction AI Personality Weights (Reference Data)

```typescript
export const FACTION_PERSONALITIES: Record<string, FactionAIPersonality> = {
  'EC': {
    factionId: 'Euro-Consolidada',
    behaviors: {
      attackAggressiveness: 40, // Conservative
      evasionCaution: 80, // High caution
      terrainPreference: ['OCEAN', 'DESERT'], // Safe zones
      communicationStyle: 'FORMAL',
      riskTolerance: 20, // Hates losses
    },
    stockVolatility: { lossImpact: -2, victoryImpact: +3 },
  },
  'BNS': {
    factionId: 'Bloco Neo-Soviético',
    behaviors: {
      attackAggressiveness: 85, // Very aggressive
      evasionCaution: 30, // Low caution
      terrainPreference: ['MOUNTAIN', 'FOREST'], // Accepts losses
      communicationStyle: 'CHATTER',
      riskTolerance: 70, // Disposable pilots
    },
    stockVolatility: { lossImpact: -8, victoryImpact: +2 },
  },
  // ... 13 more factions
};
```

---

## 9. Testing Strategy

### Unit Tests
- `TerrainDetectionSystem`: Verify terrain classification for known coordinates
- `DamageCalculationSystem`: Test damage formula edge cases
- `AIEvasionSystem`: Pathfinding to cheap zones

### Integration Tests
- Crash event → IncidentReport modal → Stock update → Chronicle headline
- AI damaged state → terrain evaluation → pathfinding change
- Faction personality → AI behavior variance

### Manual Testing
- 15 different crashes in different terrains
- Verify stock impacts match expectations
- Check AI behavior changes per faction

---

## 10. Success Criteria

- [ ] 15 factions with unique behaviors
- [ ] Terrain detection works across game map
- [ ] IncidentReport modal displays correctly
- [ ] Stock prices update after crashes
- [ ] AI pathfinds to cheap-damage zones
- [ ] Welcome message appears on first login
- [ ] Chronicle generates financial headlines from crashes
- [ ] No performance regression in main game loop

---

**END PHASE 16 STRATOSFEAR DESIGN DOCUMENT**

Next: Wait for librarian agents to complete, then begin implementation.
