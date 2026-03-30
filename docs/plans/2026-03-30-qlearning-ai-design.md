# Q-Learning AI System Design

## Overview
Enemy pilots use Q-Learning to improve tactics over generations of battles.

## State Space
- **Distance**: NEAR (<20km), MEDIUM (20-50km), FAR (>50km)
- **Target Aspect**: HEAD_ON, BEAM, TAIL
- **Energy**: HIGH (speed > 0.8 Mach), LOW
- **RWR Status**: SILENT, SEARCH, TRACK, MISSILE

## Action Space
- ENGAGE: Close distance and fire
- NOTCH: 90° turn to break Doppler lock
- CRANK: 45° turn post-launch
- EVADE: Evasive + flares
- RETREAT: RTB when low fuel/health

## Q-Learning Formula
```
Q(s,a) = Q(s,a) + α * (reward + γ * max(Q(s',a')) - Q(s,a))
```

## Rewards
- +100: Kill enemy
- -200: Get killed
- -50: Fuel exhaustion
- +10: Dodge missile

## Implementation
1. Create QTable class in `src/utils/qLearning.ts`
2. Attach QTable to each hostile aircraft
3. Update Q-values after combat outcomes
4. Use ε-greedy (90% best action, 10% random) for exploration
