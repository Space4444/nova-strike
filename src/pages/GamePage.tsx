import { useCallback, useEffect, useRef, useState } from "react";
import { Game } from "@/game/game";
import type { SaveData } from "@/game/save";
import { SHIP_CLASSES } from "@/game/ships";
import { getShipIconDataUrl } from "@/game/sprites";
import { canAfford, nodeRank, TECH_NODES } from "@/game/techtree";
import type {
  GamePhase,
  Rarity,
  RunStats,
  ShipClassId,
  UpgradeDef,
} from "@/game/types";
import { WEAPONS } from "@/game/weapons";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const RARITY_STYLE: Record<
  Rarity,
  { border: string; label: string; text: string; glow: string }
> = {
  common: {
    border: "border-slate-700 hover:border-cyan-400",
    label: "",
    text: "text-cyan-300",
    glow: "hover:shadow-[0_0_25px_rgba(34,211,238,0.25)]",
  },
  rare: {
    border: "border-blue-500/60 hover:border-blue-300",
    label: "RARE",
    text: "text-blue-300",
    glow: "shadow-[0_0_18px_rgba(59,130,246,0.18)] hover:shadow-[0_0_30px_rgba(59,130,246,0.35)]",
  },
  legendary: {
    border: "border-amber-500/70 hover:border-amber-300",
    label: "LEGENDARY",
    text: "text-amber-300",
    glow: "shadow-[0_0_22px_rgba(245,158,11,0.25)] hover:shadow-[0_0_36px_rgba(245,158,11,0.45)]",
  },
};

export function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [choices, setChoices] = useState<UpgradeDef[]>([]);
  const [queuedLevels, setQueuedLevels] = useState(0);
  const [finalStats, setFinalStats] = useState<RunStats | null>(null);
  const [save, setSave] = useState<SaveData | null>(null);
  const [selectedShip, setSelectedShip] = useState<ShipClassId>("fighter");
  const [showHangar, setShowHangar] = useState(false);

  const refreshSave = useCallback(() => {
    const g = gameRef.current;
    if (g) setSave({ ...g.save, research: { ...g.save.research } });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Game(canvas, {
      onPhaseChange: setPhase,
      onLevelUp: (c, queued) => {
        setChoices(c);
        setQueuedLevels(queued);
      },
      onGameOver: setFinalStats,
    });
    gameRef.current = game;
    setSave(game.save);
    setSelectedShip(game.save.selectedShip);
    // Exposed for e2e tests
    (window as unknown as { __novaGame?: Game }).__novaGame = game;
    return () => {
      game.destroy();
      gameRef.current = null;
      (window as unknown as { __novaGame?: Game }).__novaGame = undefined;
    };
  }, []);

  // Refresh banked totals whenever we return to menu / game over
  useEffect(() => {
    if (phase === "menu" || phase === "gameover") refreshSave();
  }, [phase, refreshSave]);

  const launch = () => {
    setShowHangar(false);
    gameRef.current?.startGame(selectedShip);
  };

  return (
    <div className="fixed inset-0 bg-[#05070f] select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair"
        data-testid="game-canvas"
      />

      {(phase === "menu" || phase === "gameover") && save && (
        <Overlay>
          <div className="text-center max-w-3xl w-full px-6 max-h-full overflow-y-auto py-8">
            {phase === "gameover" && finalStats ? (
              <>
                <h1 className="text-5xl font-black tracking-tight text-red-400 drop-shadow-[0_0_25px_rgba(248,113,113,0.45)]">
                  SHIP DESTROYED
                </h1>
                <div
                  className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm"
                  data-testid="final-stats"
                >
                  <Stat label="Survived" value={formatTime(finalStats.time)} />
                  <Stat label="Level" value={`${finalStats.level}`} />
                  <Stat label="Kills" value={`${finalStats.kills}`} />
                  <Stat
                    label="Credits banked"
                    value={`◈ ${finalStats.credits}`}
                    accent="text-amber-300"
                  />
                  <Stat
                    label="Materials banked"
                    value={`⬡ ${finalStats.materials}`}
                    accent="text-cyan-300"
                  />
                </div>
                {finalStats.bossKills > 0 && (
                  <p className="mt-3 text-sm text-red-300 font-semibold">
                    ☠ {finalStats.bossKills} capital ship
                    {finalStats.bossKills > 1 ? "s" : ""} destroyed
                  </p>
                )}
              </>
            ) : (
              <>
                <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(56,189,248,0.45)]">
                  NOVA STRIKE
                </h1>
                <p className="mt-2 text-slate-400 text-sm tracking-widest uppercase">
                  Endless survival in deep space
                </p>
              </>
            )}

            {/* Banked resources */}
            <div className="mt-5 flex items-center justify-center gap-6 text-sm">
              <span
                className="text-amber-300 font-bold"
                data-testid="bank-credits"
              >
                ◈ {save.credits.toLocaleString()}
              </span>
              <span
                className="text-cyan-300 font-bold"
                data-testid="bank-materials"
              >
                ⬡ {save.materials.toLocaleString()}
              </span>
              {save.best.time > 0 && (
                <span className="text-slate-400">
                  Best: {formatTime(save.best.time)} · Lv {save.best.level}
                </span>
              )}
            </div>

            {/* Ship selection */}
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(SHIP_CLASSES) as ShipClassId[]).map(id => {
                const ship = SHIP_CLASSES[id];
                const unlocked = save.ships.includes(id);
                const active = selectedShip === id;
                return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`ship-${id}`}
                    disabled={!unlocked}
                    onClick={() => {
                      setSelectedShip(id);
                      gameRef.current?.selectShip(id);
                    }}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      active
                        ? "border-cyan-400 bg-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                        : unlocked
                          ? "border-slate-700 bg-slate-900/80 hover:border-slate-500"
                          : "border-slate-800 bg-slate-950/80 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={getShipIconDataUrl(id, 64)}
                        alt={ship.name}
                        className={`w-10 h-10 shrink-0 ${unlocked ? "" : "grayscale"}`}
                        draggable={false}
                      />
                      <div className="min-w-0">
                        <div
                          className="font-bold text-sm"
                          style={{ color: ship.color }}
                        >
                          {ship.name} {!unlocked && "🔒"}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {ship.role}
                        </div>
                      </div>
                    </div>
                    <ul className="mt-1.5 space-y-0.5">
                      {ship.statHints.map(hint => (
                        <li
                          key={hint}
                          className="text-[10px] text-slate-500 leading-tight"
                        >
                          {hint}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                data-testid="start-button"
                onClick={launch}
                className="px-10 py-3.5 rounded-xl text-lg font-bold text-slate-950 bg-gradient-to-r from-cyan-300 to-sky-400 hover:from-cyan-200 hover:to-sky-300 shadow-[0_0_30px_rgba(56,189,248,0.5)] transition-all hover:scale-105 active:scale-95"
              >
                {phase === "gameover" ? "FLY AGAIN" : "LAUNCH"}
              </button>
              <button
                type="button"
                data-testid="hangar-button"
                onClick={() => setShowHangar(true)}
                className="px-6 py-3.5 rounded-xl text-lg font-bold text-amber-300 border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 transition-all hover:scale-105 active:scale-95"
              >
                🔧 RESEARCH
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2 text-left text-xs text-slate-400 max-w-xl mx-auto">
              <ControlHint keys="W A S D" label="Fly" />
              <ControlHint keys="Mouse + Click" label="Aim & fire" />
              <ControlHint keys="1 / 2 / 3" label="Weapons · pick upgrade" />
              <ControlHint keys="Space" label="Ship ability" />
              <ControlHint keys="Esc / P" label="Pause" />
              <ControlHint keys="Radar" label="Bottom-right" />
            </div>
          </div>
        </Overlay>
      )}

      {/* Hangar / research tree */}
      {showHangar && save && (phase === "menu" || phase === "gameover") && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-sm overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between sticky top-0 bg-slate-950/95 py-3 z-10">
              <h2 className="text-2xl font-extrabold text-amber-300">
                🔧 RESEARCH LAB
              </h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-amber-300 font-bold">
                  ◈ {save.credits.toLocaleString()}
                </span>
                <span className="text-cyan-300 font-bold">
                  ⬡ {save.materials.toLocaleString()}
                </span>
                <button
                  type="button"
                  data-testid="close-hangar"
                  onClick={() => setShowHangar(false)}
                  className="px-4 py-2 rounded-lg font-bold text-slate-950 bg-cyan-300 hover:bg-cyan-200 transition-colors"
                >
                  DONE
                </button>
              </div>
            </div>
            {(["unlock", "offense", "defense", "utility"] as const).map(cat => (
              <div key={cat} className="mt-5">
                <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                  {cat === "unlock" ? "⭐ Unlocks" : cat}
                </h3>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TECH_NODES.filter(n => n.category === cat).map(node => {
                    const rank = nodeRank(save, node.id);
                    const maxed = rank >= node.maxRank;
                    const cost = maxed ? null : node.cost(rank + 1);
                    const affordable = cost ? canAfford(save, cost) : false;
                    return (
                      <div
                        key={node.id}
                        className={`p-3 rounded-xl border flex items-center gap-3 ${
                          maxed
                            ? "border-emerald-700/60 bg-emerald-950/30"
                            : "border-slate-800 bg-slate-900/70"
                        }`}
                      >
                        {node.iconShip ? (
                          <img
                            src={getShipIconDataUrl(node.iconShip, 72)}
                            alt={node.name}
                            className="w-10 h-10 shrink-0"
                            draggable={false}
                          />
                        ) : (
                          <div className="text-2xl w-9 text-center shrink-0">
                            {node.icon}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-slate-100">
                            {node.name}
                            {node.maxRank > 1 && (
                              <span className="ml-2 text-[10px] text-slate-500">
                                {rank}/{node.maxRank}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 leading-tight">
                            {node.description}
                          </div>
                        </div>
                        {maxed ? (
                          <span className="text-emerald-400 text-xs font-bold shrink-0">
                            ✓ OWNED
                          </span>
                        ) : (
                          <button
                            type="button"
                            data-testid={`tech-${node.id}`}
                            disabled={!affordable}
                            onClick={() => {
                              if (gameRef.current?.buyTech(node.id))
                                refreshSave();
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                              affordable
                                ? "text-slate-950 bg-amber-300 hover:bg-amber-200 hover:scale-105 active:scale-95"
                                : "text-slate-600 bg-slate-800 cursor-not-allowed"
                            }`}
                          >
                            {cost?.credits ? `◈${cost.credits}` : ""}
                            {cost?.credits && cost?.materials ? " + " : ""}
                            {cost?.materials ? `⬡${cost.materials}` : ""}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="mt-6 text-xs text-slate-600 text-center">
              Weapons unlocked here are equipped in-flight with keys 1 (
              {WEAPONS.laser.icon}), 2 ({WEAPONS.plasma.icon}), 3 (
              {WEAPONS.missile.icon}). Progress is saved in your browser.
            </p>
          </div>
        </div>
      )}

      {/* Non-blocking level-up picker — bottom-left, above health bar.
          The game keeps running; pick with a click or keys 1/2/3. */}
      {choices.length > 0 && (phase === "playing" || phase === "paused") && (
        <div
          className="absolute left-3 bottom-[76px] z-10 w-[270px] pointer-events-none"
          data-testid="levelup-panel"
        >
          <div className="flex items-baseline gap-2 mb-1.5 px-1">
            <span className="text-[13px] font-extrabold tracking-wide text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">
              LEVEL UP!
            </span>
            <span className="text-[10px] text-slate-400">
              click or press 1 / 2 / 3
            </span>
            {queuedLevels > 0 && (
              <span
                className="ml-auto text-[10px] font-bold text-cyan-300"
                data-testid="levelup-queued"
              >
                +{queuedLevels} queued
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {choices.map((u, i) => {
              const style = RARITY_STYLE[u.rarity];
              return (
                <button
                  key={u.id}
                  type="button"
                  data-testid={`upgrade-${u.id}`}
                  onClick={() => gameRef.current?.chooseUpgrade(u.id)}
                  className={`pointer-events-auto w-full px-2.5 py-2 rounded-xl text-left bg-slate-950/85 backdrop-blur-[2px] border ${style.border} ${style.glow} hover:bg-slate-800/90 transition-all active:scale-[0.97] flex items-center gap-2.5`}
                >
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xl shrink-0">{u.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-[12px] text-slate-100 truncate">
                        {u.name}
                      </span>
                      {style.label && (
                        <span
                          className={`text-[8px] font-black tracking-widest ${style.text} shrink-0`}
                        >
                          {style.label}
                        </span>
                      )}
                    </span>
                    <span
                      className={`block text-[10px] leading-tight ${style.text} truncate`}
                    >
                      {u.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
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
              data-testid="resume-button"
              onClick={() => gameRef.current?.togglePause()}
              className="mt-6 px-8 py-3 rounded-xl font-bold text-slate-950 bg-slate-200 hover:bg-white transition-colors"
            >
              RESUME
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/75 backdrop-blur-[3px]">
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
      <div className={`text-lg font-extrabold ${accent ?? "text-slate-100"}`}>
        {value}
      </div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}

function ControlHint({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/70 border border-slate-800">
      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px] whitespace-nowrap">
        {keys}
      </span>
      <span className="text-slate-400">{label}</span>
    </div>
  );
}
