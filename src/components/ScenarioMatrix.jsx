"use client";

import { buildScenarioMatrix, calcStrategyEV, fmt$ } from "@/utils/strategyMath";
import { useStrategy } from "@/context/StrategyContext";
import { CheckIcon, CloseIcon } from "@/components/icons";

export default function StrategyPage() {
    const { manualBets, allocatedBets, clearAll, removeManual, updateManualStake } = useStrategy();

    const allBets = [
        ...allocatedBets,
        ...manualBets.map((b) => ({
            ...b,
            outcomeName: b.outcomeName,
            name: b.outcomeName,
            odds: parseFloat(b.odds) || 1,
            stake: parseFloat(b.stake) || 0,
            expectedReturn: (parseFloat(b.stake) || 0) * (parseFloat(b.odds) || 1),
            isManual: true,
        })),
    ];

    const scenarios = buildScenarioMatrix(allBets);
    const strategyEV = calcStrategyEV(scenarios);
    const totalStake = allBets.reduce((s, b) => s + (b.stake || 0), 0);
    const bestCase = scenarios[0]?.pnl ?? 0;
    const worstCase = scenarios[scenarios.length - 1]?.pnl ?? 0;

    return (
        <div className="h-full flex flex-col overflow-hidden bg-slate-900">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-700 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Active Strategy</h1>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {allBets.length} bet{allBets.length !== 1 ? "s" : ""} · Total stake ${totalStake.toFixed(2)}
                        </p>
                    </div>
                    {allBets.length > 0 && (
                        <button
                            onClick={clearAll}
                            className="text-xs font-mono text-slate-600 hover:text-red-400 transition-colors border border-slate-700 hover:border-red-500/40 px-3 py-1.5 rounded"
                        >
                            Clear all
                        </button>
                    )}
                </div>

                {/* Summary stats */}
                {allBets.length > 0 && (
                    <div className="flex gap-4 mt-3">
                        <Stat label="Best case" value={fmt$(bestCase)} positive={bestCase >= 0} />
                        <Stat label="Worst case" value={fmt$(worstCase)} positive={worstCase >= 0} />
                        <Stat label="Break-even" value={`${allBets.length > 0 ? ((totalStake / (allBets.reduce((s,b) => s + b.expectedReturn, 0) / allBets.length)) * 100).toFixed(0) : 0}%`} />
                        {strategyEV != null && (
                            <Stat
                                label="Exp. Value"
                                value={fmt$(strategyEV)}
                                positive={strategyEV >= 0}
                            />
                        )}
                    </div>
                )}
            </div>

            {allBets.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-2">
                        <p className="text-slate-500 font-mono text-sm">No active bets</p>
                        <p className="text-slate-600 text-xs">Add manual bets via [+] on outcomes, or generate a strategy from the engine</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
                    {/* Bet cards */}
                    <div>
                        <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">Allocated Bets</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                            {allBets.map((bet, i) => (
                                <BetCard
                                    key={bet.outcomeId ?? i}
                                    bet={bet}
                                    onRemove={bet.isManual ? () => removeManual(bet.outcomeId) : null}
                                    onStakeChange={bet.isManual ? (v) => updateManualStake(bet.outcomeId, v) : null}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Scenario matrix */}
                    {scenarios.length > 0 && (
                        <div>
                            <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">
                                Scenario Matrix — {scenarios.length} outcomes, sorted best → worst
                            </p>
                            <div className="overflow-x-auto rounded-lg border border-slate-700">
                                <table className="w-full text-xs font-mono border-collapse" style={{ minWidth: "max-content" }}>
                                    <thead>
                                        <tr className="bg-slate-800 border-b border-slate-700">
                                            {allBets.slice(0, 6).map((b, i) => (
                                                <th key={i} className="text-left px-3 py-2 text-slate-400 font-semibold whitespace-nowrap max-w-[100px]">
                                                    <span className="truncate block" title={b.outcomeName ?? b.name}>
                                                        {truncate(b.outcomeName ?? b.name, 10)}
                                                    </span>
                                                    <span className="text-slate-600 font-normal">@{(b.odds ?? 0).toFixed(2)}</span>
                                                </th>
                                            ))}
                                            <th className="text-right px-3 py-2 text-slate-400 font-semibold">Prob</th>
                                            <th className="text-right px-3 py-2 text-slate-400 font-semibold">P&amp;L</th>
                                            <th className="text-right px-3 py-2 text-slate-400 font-semibold">Return</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scenarios.map((s, i) => {
                                            const totalReturn = s.outcomes.filter(o => o.won).reduce((sum, o) => sum + o.expectedReturn, 0);
                                            return (
                                                <tr key={i} className={`border-b border-slate-800 ${s.pnl > 0 ? "bg-green-500/5" : s.pnl < 0 ? "bg-red-500/5" : "bg-slate-800/20"}`}>
                                                    {s.outcomes.map((o, j) => (
                                                        <td key={j} className="px-3 py-1.5">
                                                            {o.won
                                                                ? <CheckIcon className="w-3 h-3 text-green-400" />
                                                                : <span className="text-slate-600">✗</span>
                                                            }
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-1.5 text-right text-slate-500 font-mono text-xs">
                                                        {(s.probability * 100).toFixed(1)}%
                                                    </td>
                                                    <td className={`px-3 py-1.5 text-right font-bold ${s.pnl > 0 ? "text-green-400" : s.pnl < 0 ? "text-red-400" : "text-slate-400"}`}>
                                                        {fmt$(s.pnl)}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right text-slate-500">
                                                        ${totalReturn.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function BetCard({ bet, onRemove, onStakeChange }) {
    return (
        <div className={`rounded-lg border px-3 py-2.5 text-xs ${bet.isManual ? "border-orange-500/30 bg-orange-500/5" : "border-cyan-500/20 bg-cyan-500/5"}`}>
            <div className="flex justify-between items-start gap-1 mb-1">
                <p className="text-slate-200 font-mono font-semibold truncate" title={bet.outcomeName ?? bet.name}>
                    {truncate(bet.outcomeName ?? bet.name, 22)}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                    {bet.isManual && <span className="text-orange-400">manual</span>}
                    {onRemove && (
                        <button onClick={onRemove} className="text-slate-600 hover:text-red-400 transition-colors ml-1">
                            <CloseIcon className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
            <p className="text-slate-500 truncate mb-2">{bet.marketName ?? bet.market}</p>
            <div className="flex justify-between items-center">
                <span className="text-slate-400">@{(bet.odds ?? 0).toFixed(2)}</span>
                {onStakeChange ? (
                    <input
                        type="number"
                        value={bet.stake}
                        onChange={(e) => onStakeChange(parseFloat(e.target.value) || 0)}
                        className="w-20 bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-xs font-mono text-orange-400 text-right focus:outline-none focus:border-orange-400"
                    />
                ) : (
                    <span className="text-cyan-400 font-bold">${(bet.stake ?? 0).toFixed(2)}</span>
                )}
            </div>
            <div className="flex justify-between mt-0.5">
                <span className="text-slate-600 text-xs font-mono">implied prob</span>
                <span className="text-slate-500 text-xs font-mono">{(100 / (bet.odds ?? 1)).toFixed(1)}%</span>
            </div>
            <div className="text-slate-600 text-right mt-1">
                ret: ${((bet.stake ?? 0) * (bet.odds ?? 1)).toFixed(2)}
            </div>
        </div>
    );
}

function Stat({ label, value, positive }) {
    return (
        <div className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5">
            <p className="text-xs text-slate-500 font-mono">{label}</p>
            <p className={`text-sm font-bold font-mono ${positive === undefined ? "text-slate-300" : positive ? "text-green-400" : "text-red-400"}`}>
                {value}
            </p>
        </div>
    );
}

function truncate(str, n) {
    if (!str) return "—";
    return str.length > n ? str.slice(0, n) + "…" : str;
}