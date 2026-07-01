"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "./icons";
import { hasStaticFixture } from "@/utils/staticFixtures";

export default function ResultsPanel({ concludedMatches, onSelect }) {
    const [collapsed, setCollapsed] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    if (concludedMatches.length === 0) return null;

    return (
        <div className="border-t border-slate-700">
            <button
                onClick={() => setCollapsed((c) => !c)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800 transition-colors"
            >
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Results
                    </span>
                    <span className="text-xs font-mono text-slate-600">({concludedMatches.length})</span>
                </div>
                {collapsed ? (
                    <ChevronRightIcon className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                    <ChevronDownIcon className="w-3.5 h-3.5 text-slate-500" />
                )}
            </button>

            {!collapsed && (
                <div className="px-2 pb-3 space-y-1 max-h-64 overflow-y-auto">
                    {concludedMatches.map((match) => (
                        <ResultItem
                            key={match.id}
                            match={match}
                            expanded={expandedId === match.id}
                            onToggle={() => setExpandedId((prev) => (prev === match.id ? null : match.id))}
                            onSelect={() => onSelect?.(match.id)}
                            hasStatic={hasStaticFixture(match.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ResultItem({ match, expanded, onToggle, onSelect, hasStatic }) {
    const kickoffLabel = match.kickoff
        ? new Date(match.kickoff).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : null;

    return (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40">
            <div className="px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                    <button onClick={onToggle} className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-slate-400 leading-snug truncate">
                                {match.home}
                                <span className="text-slate-600 mx-1">v</span>
                                {match.away}
                            </div>
                            {match.homeScore != null && match.awayScore != null && (
                                <span className="font-mono text-xs font-bold text-slate-300 shrink-0">
                                    {match.homeScore}–{match.awayScore}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-mono text-slate-600">{match.tournament}</span>
                            {kickoffLabel && (
                                <>
                                    <span className="text-slate-700">·</span>
                                    <span className="text-xs font-mono text-slate-600">{kickoffLabel}</span>
                                </>
                            )}
                        </div>
                    </button>
                    {hasStatic && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSelect(); }}
                            className="shrink-0 text-xs font-mono text-slate-600 hover:text-cyan-400 transition-colors border border-slate-700 hover:border-cyan-500/40 rounded px-1.5 py-0.5"
                            title="View historical odds"
                        >
                            odds
                        </button>
                    )}
                </div>
            </div>

            {expanded && match.stats && (
                <div className="px-3 pb-2.5 pt-1 border-t border-slate-800 grid grid-cols-3 gap-2 text-xs font-mono">
                    <StatPair label="Corners" home={match.stats.corners?.home} away={match.stats.corners?.away} />
                    <StatPair label="Yellow" home={match.stats.yellowCards?.home} away={match.stats.yellowCards?.away} />
                    <StatPair label="Red" home={match.stats.redCards?.home} away={match.stats.redCards?.away} />
                </div>
            )}
        </div>
    );
}

function StatPair({ label, home, away }) {
    return (
        <div className="flex flex-col items-center gap-0.5">
            <span className="text-slate-600 text-[10px] uppercase tracking-wide">{label}</span>
            <span className="text-slate-300">{home ?? "–"} : {away ?? "–"}</span>
        </div>
    );
}
