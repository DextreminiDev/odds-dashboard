"use client";

import { useState, useMemo } from "react";

export default function StrategyEngine({
    matches,
    getCache,
    onGenerate,
    manualBets,
    onRemoveManual,
    targetMatchIds,
    onTargetMatchIdsChange,
}) {
    const [bankroll, setBankroll] = useState("");
    const [risk, setRisk] = useState(5);
    const [targetTabs, setTargetTabs] = useState([]);

    // Derive all available tabs across all targeted (and cached) matches
    const availableTabs = useMemo(() => {
        const cache = getCache();
        const sourceIds = targetMatchIds.length > 0 ? targetMatchIds : [...cache.keys()];
        const tabMap = new Map();
        for (const id of sourceIds) {
            const raw = cache.get(id);
            const groups = raw?.data?.slugFixture?.groups ?? [];
            for (const g of groups) {
                if (!tabMap.has(g.name)) tabMap.set(g.name, g.translation ?? g.name);
            }
        }
        return [...tabMap.entries()].map(([name, label]) => ({ name, label }));
    }, [targetMatchIds, getCache]);

    function toggleMatch(id) {
        onTargetMatchIdsChange(
            targetMatchIds.includes(id)
                ? targetMatchIds.filter((m) => m !== id)
                : [...targetMatchIds, id]
        );
        setTargetTabs([]);
    }

    function toggleTab(name) {
        setTargetTabs((prev) =>
            prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
        );
    }

    const parsedBankroll = parseFloat(bankroll) || 0;
    const manualTotal = manualBets.reduce((s, b) => s + (parseFloat(b.stake) || 0), 0);
    const availableBankroll = Math.max(0, parsedBankroll - manualTotal);

    // Over-budget only matters when a bankroll has been entered
    const overBudget = parsedBankroll > 0 && manualTotal > parsedBankroll;

    // Has any loaded match data?
    const hasLoadedData = getCache().size > 0;

    // ── Generate button state ─────────────────────────────────────────────
    // Allow generation if:
    //   (a) bankroll entered and not over-budget, OR
    //   (b) manual bets exist (they carry their own stakes — no bankroll needed for algo)
    // Block only when:
    //   - overBudget (explicit conflict)
    //   - no bankroll AND no manual bets (nothing to work with)
    //   - no match data loaded at all
    const nothingToGenerate = parsedBankroll === 0 && manualBets.length === 0;
    const canGenerate = !overBudget && !nothingToGenerate && hasLoadedData;

    let buttonLabel = "Generate Optimal Strategy";
    if (overBudget) buttonLabel = "Reduce manual bets first";
    else if (!hasLoadedData) buttonLabel = "Load a match first";
    else if (nothingToGenerate) buttonLabel = "Enter bankroll to generate";

    const riskLabel = risk <= 3 ? "Hedge" : risk <= 7 ? "+EV Spread" : "Speculative";
    const riskColor = risk <= 3 ? "text-green-400" : risk <= 7 ? "text-yellow-400" : "text-red-400";

    function handleGenerate() {
        if (!canGenerate) return;
        onGenerate({
            bankroll: parsedBankroll,
            availableBankroll,
            risk,
            targetMatchIds,
            targetTabs,
        });
    }

    return (
        <div className="flex flex-col gap-3 p-3">
            <div className="flex items-center gap-1.5">
                <span className="text-cyan-400 text-xs">⚡</span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    Strategy Engine
                </span>
            </div>

            {/* Bankroll — optional */}
            <div>
                <label className="block text-xs text-slate-500 mb-1 font-mono">
                    Bankroll ($) <span className="text-slate-600">optional</span>
                </label>
                <input
                    type="number"
                    min="0"
                    step="10"
                    placeholder="e.g. 500"
                    value={bankroll}
                    onChange={(e) => setBankroll(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 placeholder-slate-600"
                />
            </div>

            {/* Risk */}
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-slate-500 font-mono">Risk</label>
                    <span className={`text-xs font-bold font-mono ${riskColor}`}>
                        {risk}/10 — {riskLabel}
                    </span>
                </div>
                <input
                    type="range" min="1" max="10" value={risk}
                    onChange={(e) => setRisk(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-600 font-mono mt-0.5">
                    <span>Safe</span><span>YOLO</span>
                </div>
            </div>

            {/* Target Matches — chip multi-select */}
            <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-mono">
                    Target Matches{" "}
                    <span className="text-slate-600">(none = all loaded)</span>
                </label>
                {matches.length === 0 ? (
                    <p className="text-xs text-slate-600 font-mono">Loading fixtures…</p>
                ) : (
                    <div className="flex flex-wrap gap-1">
                        {matches.map((m) => (
                            <ChipToggle
                                key={m.id}
                                active={targetMatchIds.includes(m.id)}
                                onClick={() => toggleMatch(m.id)}
                            >
                                {m.home.split(" ")[0]} v {m.away.split(" ")[0]}
                            </ChipToggle>
                        ))}
                    </div>
                )}
            </div>

            {/* Target Tabs — chip multi-select */}
            <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-mono">
                    Market Tabs{" "}
                    <span className="text-slate-600">(none = all)</span>
                </label>
                {availableTabs.length === 0 ? (
                    <p className="text-xs text-slate-600 font-mono">
                        {targetMatchIds.length > 0 ? "Load targeted matches first" : "Load a match first"}
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-1">
                        {availableTabs.map((t) => (
                            <ChipToggle
                                key={t.name}
                                active={targetTabs.includes(t.name)}
                                onClick={() => toggleTab(t.name)}
                            >
                                {t.label}
                            </ChipToggle>
                        ))}
                    </div>
                )}
            </div>

            {/* Budget breakdown — only show when bankroll entered */}
            {parsedBankroll > 0 && (
                <div className={`rounded border px-2 py-1.5 text-xs font-mono space-y-0.5 ${overBudget ? "border-red-500/40 bg-red-500/5" : "border-slate-700 bg-slate-800"}`}>
                    <div className="flex justify-between text-slate-400">
                        <span>Bankroll</span><span>${parsedBankroll.toFixed(2)}</span>
                    </div>
                    {manualTotal > 0 && (
                        <div className="flex justify-between text-orange-400">
                            <span>Manual bets</span><span>−${manualTotal.toFixed(2)}</span>
                        </div>
                    )}
                    <div className={`flex justify-between font-bold border-t border-slate-700 pt-0.5 mt-0.5 ${overBudget ? "text-red-400" : "text-cyan-400"}`}>
                        <span>Available</span>
                        <span>${availableBankroll.toFixed(2)}</span>
                    </div>
                    {overBudget && (
                        <p className="text-red-400 pt-0.5">
                            Over by ${(manualTotal - parsedBankroll).toFixed(2)} — reduce manual bets below
                        </p>
                    )}
                </div>
            )}

            {/* Manual bets — shown even without a bankroll */}
            {manualBets.length > 0 && (
                <div>
                    <p className="text-xs text-slate-500 font-mono mb-1">
                        Manual bets ({manualBets.length})
                    </p>
                    <div className="space-y-1">
                        {manualBets.map((b) => {
                            const stake = parseFloat(b.stake) || 0;
                            return (
                                <div
                                    key={b.outcomeId}
                                    className={`flex items-center justify-between gap-1 rounded px-2 py-1 text-xs border ${
                                        overBudget
                                            ? "border-red-500/30 bg-red-500/5"
                                            : "border-slate-700 bg-slate-800"
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <p className="text-slate-200 truncate font-mono text-xs">{b.outcomeName}</p>
                                        <p className="text-slate-500 truncate">{b.marketName}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-cyan-400 font-mono">${stake.toFixed(2)}</span>
                                        <button
                                            onClick={() => onRemoveManual(b.outcomeId)}
                                            className="text-slate-600 hover:text-red-400 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Generate */}
            <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-900 font-bold text-xs py-2 rounded transition-colors font-mono uppercase tracking-wider"
            >
                {buttonLabel}
            </button>
        </div>
    );
}

function ChipToggle({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`px-2 py-0.5 rounded-full text-xs font-mono transition-colors border ${
                active
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                    : "bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-300"
            }`}
        >
            {children}
        </button>
    );
}