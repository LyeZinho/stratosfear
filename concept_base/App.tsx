import { useEffect, useRef, useState } from "react";
import { TacticalMap } from "./components/TacticalMap";
import { HUD } from "./components/HUD";
import { useGameStore } from "./store/useGameStore";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NewsModal } from "./components/NewsModal";
import { NewsEvent } from "./utils/newsSystem";

const GAME_TICK_RATE = 30; // Target 30 FPS for game logic
const GAME_TICK_INTERVAL = 1000 / GAME_TICK_RATE;

export default function App() {
  const { tick, isPaused, aircrafts } = useGameStore();
  const lastTimeRef = useRef<number>(performance.now());
  const accumulatorRef = useRef<number>(0);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const news: NewsEvent[] = [
    { id: "1", timestamp: Date.now(), type: "threat", title: "Tension rising", description: "Hostile forces massing at border", severity: "high" },
    { id: "2", timestamp: Date.now(), type: "military", title: "SAM Deployment", description: "New SAM battery detected in sector", severity: "medium" },
    { id: "3", timestamp: Date.now(), type: "political", title: "Diplomatic Talks", description: "Political meeting scheduled", severity: "low" },
  ];

  useEffect(() => {
    let frameId: number;
    
    const loop = (time: number) => {
      if (isPaused) {
        lastTimeRef.current = time;
        frameId = requestAnimationFrame(loop);
        return;
      }
      
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;
      
      accumulatorRef.current += deltaTime;
      
      // Fixed timestep: process game at consistent 30 FPS
      while (accumulatorRef.current >= GAME_TICK_INTERVAL) {
        tick(GAME_TICK_INTERVAL / 1000);
        accumulatorRef.current -= GAME_TICK_INTERVAL;
      }
      
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [tick, isPaused]);

  // Removido geolocalização por solicitação do usuário
  // As bases agora iniciam em locais aleatórios definidos no store

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] bg-black overflow-hidden select-none">
      <ErrorBoundary>
        <TacticalMap />
      </ErrorBoundary>
      <HUD />
      <button onClick={() => setIsNewsOpen(true)} className="absolute top-4 right-20 z-40 px-4 py-2 bg-neutral-800 text-white rounded">News</button>
      <NewsModal isOpen={isNewsOpen} onClose={() => setIsNewsOpen(false)} news={news} aircrafts={aircrafts} allyAircrafts={aircrafts} />
      
      {/* Overlay de Pausa */}
      {isPaused && (
        <div className="absolute inset-0 z-[2000] bg-black/60 flex items-center justify-center backdrop-blur-sm">
          <div className="text-emerald-500 font-mono text-4xl font-black tracking-widest animate-pulse">
            PAUSE
          </div>
        </div>
      )}

      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none z-[3000] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
    </div>
  );
}
