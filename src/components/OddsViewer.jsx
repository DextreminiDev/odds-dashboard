"use client";

// OddsViewer.jsx — v2
// Adds: tab navigation, [+] manual override button per outcome, inline popover.

import { useState } from "react";

export default function OddsViewer({ data, loading, error, onAddManual }) {
    const [activeTab, setActiveTab] = useState(null);
    const [popover, setPopover] = useState(null); // { outcomeId, outcomeName, odds, marketName, matchId, matchName }
    const [stakeInput, setStakeInput] = useState("");

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-slate-400 text-sm font-mono">Fetching odds…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-red-400 font-mono text-sm">{error}</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-slate-500 text-sm font-mono">← Select a match to load odds</p>
            </div>
        );
    }

    const fixture = data?.data?.slugFixture;
    if (!fixture) return null;

    const { name, status, eventStatus, data: matchData, group: groups = [] } = fixture;
    const homeTeam = matchData?.competitors?.[0]?.name ?? "Home";
    const awayTeam = matchData?.competitors?.[1]?.name ?? "Away";
    const startTime = matchData?.startTime
        ? new Date(matchData.startTime).toLocaleString("en-US", {
              weekday: "short", month: "short", day: "numeric",
              hour: "2-digit", minute: "2-digit", timeZoneName: "short",
          })
        : null;
    const matchStatus = eventStatus?.matchStatus ?? status;
    const sortedGroups = [...groups].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));

    // Default active tab to first group
    const effectiveTab = activeTab ?? sortedGroups[0]?.name ?? null;
    const activeGroup = sortedGroups.find((g) => g.name === effectiveTab);

    function openPopover(outcomeId, outcomeName, odds, marketName) {
        setPopover({ outcomeId, outcomeName, odds, marketName, matchId: fixture.id, matchName: name });
        setStakeInput("");
    }

    function closePopover() {
        setPopover(null);
        setStakeInput("");
    }

    function confirmOverride() {
        if (!popover || !stakeInput) return;
        onAddManual?.({
            outcomeId: popover.outcomeId,
            outcomeName: popover.outcomeName,
            odds: popover.odds,
            marketName: popover.marketName,
            matchId: popover.matchId,
            matchLabel: popover.matchName,
            stake: parseFloat(stakeInput) || 0,
        });
        closePopover();
    }

    return (
        <div className="h-full flex flex-col relative">
            {/* Match header */}
            <div className="shrink-0 bg-slate-900 border-b border-slate-700 px-4 py-4 md:px-8 md:py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">{name}</h2>
                        {startTime && <p className="text-xs text-slate-400 font-mono">{startTime}</p>}
                    </div>
                    <StatusBadge status={matchStatus} homeScore={eventStatus?.homeScore} awayScore={eventStatus?.awayScore} />
                </div>
            </div>

            {/* Tab bar */}
            <div className="shrink-0 flex overflow-x-auto border-b border-slate-700 bg-slate-900 scrollbar-none [&::-webkit-scrollbar]:hidden">
                {sortedGroups.map((g) => (
                    <button
                        key={g.name}
                        onClick={() => setActiveTab(g.name)}
                        className={`shrink-0 px-5 py-3 text-xs font-mono font-semibold uppercase tracking-wide transition-colors border-b-2 ${
                            g.name === effectiveTab
                                ? "border-cyan-400 text-cyan-400"
                                : "border-transparent text-slate-500 hover:text-slate-300"
                        }`}
                    >
                        {g.translation ?? g.name}
                    </button>
                ))}
            </div>

            {/* Markets for active tab */}
            <div className="flex-1 overflow-y-auto px-3 py-4 md:px-8 md:py-6 space-y-4">
                {!activeGroup ? (
                    <p className="text-slate-500 text-sm font-mono">No markets in this tab.</p>
                ) : (
                    (activeGroup.templates ?? []).flatMap((t) => t.markets ?? []).map((market) => (
                        <MarketCard
                            key={market.id}
                            market={market}
                            homeTeam={homeTeam}
                            awayTeam={awayTeam}
                            onAddManual={openPopover}
                        />
                    ))
                )}
            </div>

            {/* Popover overlay */}
            {popover && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={closePopover}
                >
                    <div
                        className="bg-slate-800 border border-slate-600 rounded-xl p-5 w-[calc(100vw-2rem)] sm:w-72 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest mb-1">
                            Manual Override
                        </p>
                        <p className="text-sm font-bold text-white mb-0.5">{popover.outcomeName}</p>
                        <p className="text-xs text-slate-400 mb-1">{popover.marketName}</p>
                        <p className="text-xs text-slate-500 font-mono mb-3">
                            Odds: <span className="text-cyan-400">{popover.odds?.toFixed(2)}</span>
                        </p>
                        <label className="text-xs text-slate-500 font-mono block mb-1">
                            Fixed Stake ($)
                        </label>
                        <input
                            autoFocus
                            type="number"
                            min="0"
                            step="1"
                            placeholder="e.g. 50"
                            value={stakeInput}
                            onChange={(e) => setStakeInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && confirmOverride()}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 mb-3"
                        />
                        {stakeInput && parseFloat(stakeInput) > 0 && (
                            <p className="text-xs text-slate-500 font-mono mb-3">
                                Potential return:{" "}
                                <span className="text-green-400">
                                    ${(parseFloat(stakeInput) * popover.odds).toFixed(2)}
                                </span>
                            </p>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={closePopover}
                                className="flex-1 py-1.5 rounded bg-slate-700 text-slate-300 text-xs font-mono hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmOverride}
                                disabled={!stakeInput || parseFloat(stakeInput) <= 0}
                                className="flex-1 py-1.5 rounded bg-cyan-500 text-slate-900 text-xs font-bold font-mono hover:bg-cyan-400 transition-colors disabled:opacity-30"
                            >
                                Add Bet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status, homeScore, awayScore }) {
    const isLive = status?.toLowerCase().includes("live") || status?.toLowerCase() === "in progress";
    return (
        <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold uppercase tracking-wide ${isLive ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-slate-700 text-slate-400 border border-slate-600"}`}>
                {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5 animate-pulse" />}
                {status ?? "Unknown"}
            </span>
            {homeScore != null && awayScore != null && (
                <div className="font-mono text-base font-bold text-cyan-400">{homeScore} – {awayScore}</div>
            )}
        </div>
    );
}

function MarketCard({ market, homeTeam, awayTeam, onAddManual }) {
    const outcomes = market.outcomes ?? [];
    const isActive = market.status === "active";
    const activeOutcomes = outcomes.filter((o) => o.active && o.odds > 0);
    const overround = activeOutcomes.reduce((s, o) => s + 1 / o.odds, 0);
    const margin = ((overround - 1) * 100).toFixed(1);

    return (
        <div className={`rounded-lg border ${isActive ? "border-slate-700 bg-slate-800/50" : "border-slate-800 bg-slate-900/50 opacity-50"}`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-slate-200 truncate">{market.name}</span>
                    {market.specifiers && (
                        <span className="text-xs text-slate-500 font-mono shrink-0">{market.specifiers}</span>
                    )}
                </div>
                {activeOutcomes.length > 0 && (
                    <span className={`text-xs font-mono shrink-0 ml-2 ${overround < 1.05 ? "text-green-400" : overround < 1.1 ? "text-yellow-400" : "text-red-400"}`}>
                        +{margin}%
                    </span>
                )}
            </div>
            <div className={`grid gap-2 p-3 ${outcomes.length <= 2 ? "grid-cols-2" : outcomes.length === 3 ? "grid-cols-2 sm:grid-cols-3" :"grid-cols-2 sm:grid-cols-4"}`}>
                {outcomes.map((outcome) => (
                    <OutcomeButton
                        key={outcome.id}
                        outcome={outcome}
                        homeTeam={homeTeam}
                        awayTeam={awayTeam}
                        overround={overround}
                        onAddManual={() => onAddManual(outcome.id, resolveOutcomeName(outcome.name, homeTeam, awayTeam), outcome.odds, market.name)}
                    />
                ))}
            </div>
        </div>
    );
}

function OutcomeButton({ outcome, homeTeam, awayTeam, overround, onAddManual }) {
    const displayName = resolveOutcomeName(outcome.name, homeTeam, awayTeam);
    const impliedProb = outcome.odds > 0 && overround > 0 ? (1 / outcome.odds) / overround : null;

    return (
        <div className={`group relative rounded px-3 py-4 flex flex-col gap-0.5 text-center transition-colors ${outcome.active ? "bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50" : "bg-slate-800/30 border border-slate-700/30 opacity-40"}`}>
            <span className="text-xs text-slate-300 truncate leading-tight mb-2" title={displayName}>
                {displayName}
            </span>
            <span className="text-lg sm:text-[22px] font-bold font-mono text-white leading-none">
                {outcome.odds != null ? outcome.odds.toFixed(2) : "—"}
            </span>
            {impliedProb != null && (
                <span className="text-[10px] text-slate-600 font-mono mt-1.5">{(impliedProb * 100).toFixed(0)}%</span>
            )}
            {outcome.active && (
                <button
                    onClick={(e) => { e.stopPropagation(); onAddManual(); }}
                    className="absolute top-1 right-1 w-4 h-4 rounded-sm bg-slate-600 text-slate-400 text-xs opacity-0 group-hover:opacity-100 hover:bg-cyan-500 hover:text-slate-900 transition-all flex items-center justify-center leading-none font-bold"
                    title="Add manual bet"
                >
                    +
                </button>
            )}
        </div>
    );
}

function resolveOutcomeName(name, homeTeam, awayTeam) {
    if (!name) return "—";
    if (name === "1") return homeTeam;
    if (name === "2") return awayTeam;
    if (name === "X") return "Draw";
    if (name === "1X") return `${homeTeam} or Draw`;
    if (name === "X2") return `Draw or ${awayTeam}`;
    if (name === "12") return `${homeTeam} or ${awayTeam}`;
    return name;
}