import { useEffect, useRef, useState } from "react";
import { Game } from "@/game/game";
import type { GamePhase, UpgradeDef } from "@/game/types";

interface GameOverStats {
  level: number;
  credits: number;
  kills: number;
  time: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [choices, setChoices] = useState<UpgradeDef[]>([]);
  const [finalStats, setFinalStats] = useState<GameOverStats | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Game(canvas, {
      onPhaseChange: setPhase,
      onLevelUp: setChoices,
      onGameOver: setFinalStats,
    });
    gameRef.current = game;
    // Exposed for e2e tests
    (window as unknown as { __novaGame?: Game }).__novaGame = game;
    return () => {
      game.destroy();
      gameRef.current = null;
      (window as unknown as { __novaGame?: Game }).__novaGame = undefined;
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[#05070f] select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair"
        data-testid="game-canvas"
      />

      {phase === "menu" && (
        <Overlay>
          <div className="text-center max-w-lg px-6">
            <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(56,189,248,0.45)]">
              NOVA STRIKE
            </h1>
            <p className="mt-3 text-slate-400 text-sm tracking-widest uppercase">
              Endless survival in deep space
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 text-left text-sm text-slate-300">
              <ControlHint keys="W A S D" label="Fly your ship" />
              <ControlHint keys="Mouse" label="Aim turret" />
              <ControlHint keys="Left click" label="Fire lasers" />
              <ControlHint keys="Esc / P" label="Pause" />
            </div>

            <button
              type="button"
              data-testid="start-button"
              onClick={() => gameRef.current?.startGame()}
              className="mt-10 px-10 py-3.5 rounded-xl text-lg font-bold text-slate-950 bg-gradient-to-r from-cyan-300 to-sky-400 hover:from-cyan-200 hover:to-sky-300 shadow-[0_0_30px_rgba(56,189,248,0.5)] transition-all hover:scale-105 active:scale-95"
            >
              LAUNCH
            </button>
            <p className="mt-6 text-xs text-slate-500">
              Destroy enemies → earn XP & credits → level up → choose upgrades.
              Survive as long as you can.
            </p>
          </div>
        </Overlay>
      )}

      {phase === "levelup" && (
        <Overlay>
          <div className="text-center px-6">
            <h2 className="text-3xl font-extrabold text-amber-300 drop-shadow-[0_0_18px_rgba(251,191,36,0.5)]">
              LEVEL UP!
            </h2>
            <p className="mt-1 text-slate-400 text-sm">Choose an upgrade</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
              {choices.map(u => (
                <button
                  key={u.id}
                  type="button"
                  data-testid={`upgrade-${u.id}`}
                  onClick={() => gameRef.current?.chooseUpgrade(u.id)}
                  className="w-64 p-5 rounded-2xl text-left bg-slate-900/90 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800/90 hover:shadow-[0_0_25px_rgba(34,211,238,0.25)] transition-all hover:-translate-y-1 active:scale-95"
                >
                  <div className="text-3xl">{u.icon}</div>
                  <div className="mt-2 font-bold text-slate-100">{u.name}</div>
                  <div className="mt-1 text-sm text-cyan-300">
                    {u.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Overlay>
      )}

      {phase === "paused" && (
        <Overlay>
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-slate-200">PAUSED</h2>
            <p className="mt-2 text-slate-400 text-sm">
              Press <span className="text-cyan-300 font-semibold">Esc</span> or{" "}
              <span className="text-cyan-300 font-semibold">P</span> to resume
            </p>
            <button
              type="button"
              onClick={() => gameRef.current?.togglePause()}
              className="mt-6 px-8 py-2.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-cyan-300 to-sky-400 hover:scale-105 active:scale-95 transition-all"
            >
              RESUME
            </button>
          </div>
        </Overlay>
      )}

      {phase === "gameover" && finalStats && (
        <Overlay>
          <div className="text-center px-6">
            <h2 className="text-5xl font-black text-rose-400 drop-shadow-[0_0_25px_rgba(251,113,133,0.5)]">
              SHIP DESTROYED
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-x-12 gap-y-4 text-left mx-auto w-fit">
              <Stat label="Survived" value={formatTime(finalStats.time)} />
              <Stat label="Level reached" value={String(finalStats.level)} />
              <Stat
                label="Enemies destroyed"
                value={String(finalStats.kills)}
              />
              <Stat
                label="Credits earned"
                value={`◈ ${finalStats.credits.toLocaleString()}`}
              />
            </div>
            <button
              type="button"
              data-testid="restart-button"
              onClick={() => gameRef.current?.startGame()}
              className="mt-10 px-10 py-3.5 rounded-xl text-lg font-bold text-slate-950 bg-gradient-to-r from-cyan-300 to-sky-400 hover:from-cyan-200 hover:to-sky-300 shadow-[0_0_30px_rgba(56,189,248,0.5)] transition-all hover:scale-105 active:scale-95"
            >
              FLY AGAIN
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
      {children}
    </div>
  );
}

function ControlHint({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-900/70 border border-slate-800 px-4 py-2.5">
      <span className="font-mono text-xs px-2 py-1 rounded bg-slate-800 text-cyan-300 whitespace-nowrap">
        {keys}
      </span>
      <span className="text-slate-400">{label}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="text-2xl font-bold text-slate-100">{value}</div>
    </div>
  );
}

export default GamePage;
